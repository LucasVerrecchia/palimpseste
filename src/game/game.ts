/**
 * Orchestrateur du jeu : relie input souris/clavier, physique, salle, encre,
 * dialogues, save et rendu. Les règles métier restent dans les modules purs.
 *
 * Mécanique centrale (décision D10) : le joueur TRACE ses blocs d'encre à la
 * souris (clic gauche) dans une portée limitée autour de lui, et les EFFACE
 * (clic droit) pour récupérer l'encre. La difficulté vient du budget d'encre
 * entre deux encriers et du puzzle « effacer derrière soi pour réutiliser ».
 *
 * Rendu « manuscrit moderne » (D9) : vectoriel haute résolution, dalles
 * arrondies ombrées, particules d'encre, squash & stretch. Aucun asset.
 */
import { Camera } from '../engine/camera';
import type { Input } from '../engine/input';
import { aabbOverlap } from '../engine/physics';
import type { Pointer } from '../engine/pointer';
import type { Viewport } from '../engine/renderer';
import { loadJson, saveJson, type StorageLike } from '../engine/save';
import {
  gidAt,
  mergeSolidTiles,
  parseTiledMap,
  tilesBetween,
  type RoomObject,
  type TileCoord,
  type TileRect,
} from '../engine/tilemap';
import {
  DRAW,
  hexAlpha,
  INK,
  INTERACT_MARGIN,
  INTERNAL_HEIGHT,
  INTERNAL_WIDTH,
  PALETTE,
  PARTICLES,
  PHYSICS,
  PLAYER,
  RENDERING,
  TILE_SIZE,
  TOAST_SECONDS,
} from './config';
import { createGameBus, type GameEventBus } from './events';
import {
  advanceDialogue,
  currentNode,
  parseDialogueData,
  startDialogue,
  type DialogueData,
  type DialogueEffect,
  type DialogueState,
} from './narrative/dialogue';
import { getAbility, hasAbility } from './player/abilities';
import { stepPlayer, type PlayerState } from './player/controller';
import { createInk, reclaimInk, refillInk, spendInk, type InkState } from './player/ink';
import { parseSave, SAVE_KEY, SAVE_VERSION, type SaveData } from './save';
import { drawDialogueBox } from './ui/dialogue_box';
import { drawHud, drawToasts, type Toast } from './ui/hud';
import { Room } from './world/room';
import dialoguePnjMarge from '../data/dialogues/pnj_marge.json';
import roomMarge01 from '../data/rooms/marge_01.json';

const ROOM_ID = 'marge_01';

type Mode = 'playing' | 'dialogue';

interface ActiveDialogue {
  data: DialogueData;
  state: DialogueState;
  selected: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Mote {
  x: number;
  y: number;
  speed: number;
  phase: number;
  size: number;
}

interface Cursor {
  tx: number;
  ty: number;
  worldX: number;
  worldY: number;
  inReach: boolean;
}

export class Game {
  private readonly input: Input;
  private readonly pointer: Pointer;
  private readonly viewport: Viewport;
  private readonly storage: StorageLike;
  private readonly bus: GameEventBus;
  private readonly camera = new Camera();
  private readonly room: Room;
  private readonly dialogues: Record<string, DialogueData>;
  /** Dalles de décor précalculées (tuiles statiques fusionnées). */
  private readonly slabs: TileRect[];
  private readonly paper: HTMLCanvasElement;

  private player: PlayerState;
  private ink: InkState;
  private readonly unlocked = new Set<string>();
  private readonly storyFlags: Record<string, boolean | number> = {};
  private endingLeaning = 0;
  private readonly visitedRooms = new Set<string>();
  private readonly collectedObjects = new Set<number>();
  /** Où renvoie la touche R (dernier encrier touché, sinon spawn). */
  private checkpoint: { x: number; y: number };

  private mode: Mode = 'playing';
  private dialogue: ActiveDialogue | null = null;
  private readonly toasts: Toast[] = [];
  private exitReached = false;
  private time = 0;

  private readonly particles: Particle[] = [];
  private readonly motes: Mote[] = [];
  private prevGrounded = false;
  private landTimer = 0;

  // Tracé à la souris : dernière tuile peinte/effacée pour raccorder le trait.
  private lastPaint: TileCoord | null = null;
  private lastErase: TileCoord | null = null;
  private cursor: Cursor | null = null;
  private toastCooldown = 0;

  constructor(input: Input, pointer: Pointer, viewport: Viewport, storage: StorageLike) {
    this.input = input;
    this.pointer = pointer;
    this.viewport = viewport;
    this.storage = storage;
    this.bus = createGameBus();
    this.room = new Room(ROOM_ID, parseTiledMap(roomMarge01));
    this.dialogues = { pnj_marge: parseDialogueData(dialoguePnjMarge) };
    this.slabs = mergeSolidTiles(
      this.room.map.widthTiles,
      this.room.map.heightTiles,
      (tx, ty) => gidAt(this.room.map, tx, ty) > 0,
    );
    this.paper = this.createPaperTexture();
    this.spawnMotes();

    this.ink = createInk(INK.max);
    this.player = this.spawnPlayer();
    this.checkpoint = { x: this.player.body.x, y: this.player.body.y };

    this.wireToasts();
    this.restoreFromSave();

    this.visitedRooms.add(ROOM_ID);
    this.bus.emit('room_entered', { roomId: ROOM_ID });
  }

  // ---------- Initialisation ----------

  private spawnPlayer(): PlayerState {
    const spawn = this.room.firstObjectOfType('spawn');
    const x = spawn?.x ?? TILE_SIZE * 2;
    const y = spawn?.y ?? TILE_SIZE * 2;
    return {
      body: { x, y, w: PLAYER.width, h: PLAYER.height, vx: 0, vy: 0 },
      grounded: false,
      facing: 1,
      health: PLAYER.maxHealth,
    };
  }

  private createPaperTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.room.pixelWidth;
    canvas.height = this.room.pixelHeight;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return canvas;

    ctx.fillStyle = PALETTE.parchment;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 300; i++) {
      const radius = 3 + Math.random() * 34;
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      const shade = Math.random() < 0.6 ? PALETTE.parchmentShade : PALETTE.sepia;
      gradient.addColorStop(0, hexAlpha(shade, 0.05 + Math.random() * 0.05));
      gradient.addColorStop(1, hexAlpha(shade, 0));
      ctx.save();
      ctx.translate(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.strokeStyle = hexAlpha(PALETTE.sepia, 0.07);
    ctx.lineWidth = 1;
    for (let y = 24; y < canvas.height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.strokeStyle = hexAlpha(PALETTE.danger, 0.1);
    ctx.beginPath();
    ctx.moveTo(52, 0);
    ctx.lineTo(52, canvas.height);
    ctx.stroke();

    return canvas;
  }

  private spawnMotes(): void {
    for (let i = 0; i < PARTICLES.ambientMotes; i++) {
      this.motes.push({
        x: Math.random() * this.room.pixelWidth,
        y: Math.random() * this.room.pixelHeight * 0.8,
        speed: 3 + Math.random() * 6,
        phase: Math.random() * Math.PI * 2,
        size: 0.6 + Math.random() * 1.2,
      });
    }
  }

  private wireToasts(): void {
    this.bus.on('ability_unlocked', ({ id }) => {
      const def = getAbility(id);
      if (def !== null) {
        this.toast(`Mot retrouvé : ${def.word} — clic gauche pour tracer, clic droit pour effacer`);
      }
    });
    this.bus.on('game_saved', () => {
      this.toast('Encrier — encre pleine, place retenue (R pour y revenir).');
    });
    this.bus.on('flag_set', ({ flag }) => {
      if (flag === 'fragment_marge') this.toast('Fragment de page recueilli.');
    });
    this.bus.on('player_respawned', () => {
      this.toast('Le manuscrit te ramène à l\'encrier.');
    });
  }

  private restoreFromSave(): void {
    const save = loadJson(this.storage, SAVE_KEY, parseSave);
    if (save === null) return;
    for (const id of save.unlockedAbilities) this.unlocked.add(id);
    for (const room of save.visitedRooms) this.visitedRooms.add(room);
    Object.assign(this.storyFlags, save.storyFlags);
    this.endingLeaning = save.endingLeaning;
    this.ink = createInk(save.inkMax);
    if (save.playerPos.room === ROOM_ID) {
      this.player.body.x = save.playerPos.x;
      this.player.body.y = save.playerPos.y;
      this.checkpoint = { x: save.playerPos.x, y: save.playerPos.y };
    }
    if (this.storyFlags['fragment_marge'] === true) {
      const fragment = this.room.firstObjectOfType('fragment');
      if (fragment !== null) this.collectedObjects.add(fragment.id);
    }
    for (const word of this.room.objectsOfType('word')) {
      const ability = word.properties['ability'];
      if (typeof ability === 'string' && this.unlocked.has(ability)) {
        this.collectedObjects.add(word.id);
      }
    }
    this.toast('Le manuscrit se souvient de toi.');
  }

  private persist(): void {
    const data: SaveData = {
      version: SAVE_VERSION,
      unlockedAbilities: [...this.unlocked],
      visitedRooms: [...this.visitedRooms],
      storyFlags: { ...this.storyFlags },
      endingLeaning: this.endingLeaning,
      playerPos: { room: ROOM_ID, x: this.player.body.x, y: this.player.body.y },
      inkMax: this.ink.max,
    };
    saveJson(this.storage, SAVE_KEY, data);
    this.bus.emit('game_saved', { roomId: ROOM_ID });
  }

  // ---------- Update ----------

  update(dtSeconds: number): void {
    this.time += dtSeconds;
    this.toastCooldown = Math.max(0, this.toastCooldown - dtSeconds);
    if (this.mode === 'dialogue') {
      this.updateDialogue();
    } else {
      this.updatePlaying(dtSeconds);
    }
    this.updateParticles(dtSeconds);
    for (const toast of this.toasts) toast.ttl -= dtSeconds;
    while (this.toasts.length > 0 && (this.toasts[0]?.ttl ?? 0) <= 0) this.toasts.shift();
    this.input.endFrame();
  }

  private updatePlaying(dtSeconds: number): void {
    const wasGrounded = this.player.grounded;
    const prevVy = this.player.body.vy;

    this.player = stepPlayer(
      this.player,
      {
        left: this.input.isDown('left'),
        right: this.input.isDown('right'),
        jumpPressed: this.input.wasPressed('jump'),
        jumpHeld: this.input.isDown('jump'),
      },
      this.room.isSolid,
      dtSeconds,
    );

    const feet = { x: this.player.body.x + this.player.body.w / 2, y: this.player.body.y + this.player.body.h };
    if (this.input.wasPressed('jump') && wasGrounded) {
      this.burst(feet.x, feet.y, PARTICLES.jumpBurst, PALETTE.sepia, 50);
    }
    if (!this.prevGrounded && this.player.grounded && prevVy > 140) {
      this.landTimer = RENDERING.landSquashSeconds;
      this.burst(feet.x, feet.y, PARTICLES.landBurst, PALETTE.ink, 60);
    }
    this.prevGrounded = this.player.grounded;
    this.landTimer = Math.max(0, this.landTimer - dtSeconds);

    this.checkPickups();
    if (this.input.wasPressed('interact')) this.handleInteract();
    if (this.input.wasPressed('respawn')) this.respawn();
    this.updateCursorAndDrawing();
    this.checkExit();

    const center = this.playerCenter();
    this.camera.follow(
      center.x,
      center.y,
      INTERNAL_WIDTH,
      INTERNAL_HEIGHT,
      this.room.pixelWidth,
      this.room.pixelHeight,
      1 - Math.exp(-RENDERING.cameraLerpRate * dtSeconds),
    );
  }

  private updateDialogue(): void {
    const active = this.dialogue;
    if (active === null) {
      this.mode = 'playing';
      return;
    }
    const node = currentNode(active.data, active.state);
    if (node === null) {
      this.closeDialogue();
      return;
    }
    const choices = node.choices ?? [];
    if (choices.length > 0) {
      if (this.input.wasPressed('up')) active.selected = Math.max(0, active.selected - 1);
      if (this.input.wasPressed('down')) {
        active.selected = Math.min(choices.length - 1, active.selected + 1);
      }
    }
    if (this.input.wasPressed('interact') || this.input.wasPressed('jump')) {
      const step = advanceDialogue(
        active.data,
        active.state,
        choices.length > 0 ? active.selected : undefined,
      );
      this.applyEffects(step.effects);
      active.state = step.state;
      active.selected = 0;
      if (step.state.nodeId === null) this.closeDialogue();
    }
  }

  private closeDialogue(): void {
    this.dialogue = null;
    this.mode = 'playing';
  }

  private applyEffects(effects: readonly DialogueEffect[]): void {
    for (const effect of effects) {
      this.storyFlags[effect.flag] = effect.value;
      this.bus.emit('flag_set', { flag: effect.flag, value: effect.value });
    }
  }

  private updateParticles(dtSeconds: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (p === undefined) continue;
      p.life -= dtSeconds;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += PARTICLES.gravity * dtSeconds;
      p.x += p.vx * dtSeconds;
      p.y += p.vy * dtSeconds;
    }
    for (const mote of this.motes) {
      mote.x += mote.speed * dtSeconds;
      if (mote.x > this.room.pixelWidth) mote.x = 0;
    }
  }

  private burst(x: number, y: number, count: number, color: string, speed: number): void {
    for (let i = 0; i < count && this.particles.length < PARTICLES.maxCount; i++) {
      const angle = Math.PI + Math.random() * Math.PI;
      const velocity = speed * (0.4 + Math.random() * 0.9);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle + Math.PI / 2) * velocity * (Math.random() < 0.5 ? 1 : -1),
        vy: Math.sin(angle) * velocity,
        life: 0.35 + Math.random() * 0.4,
        maxLife: 0.75,
        size: 1 + Math.random() * 2,
        color,
      });
    }
  }

  // ---------- Tracé d'encre à la souris ----------

  private updateCursorAndDrawing(): void {
    // Position monde du curseur (écran → vue → monde).
    const view = this.viewport.screenToView(this.pointer.clientX, this.pointer.clientY);
    const worldX = view.x + this.camera.x;
    const worldY = view.y + this.camera.y;
    const tx = Math.floor(worldX / TILE_SIZE);
    const ty = Math.floor(worldY / TILE_SIZE);
    this.cursor = { tx, ty, worldX, worldY, inReach: this.tileInReach(tx, ty) };

    if (!hasAbility(this.unlocked, 'ecrire')) {
      this.lastPaint = null;
      this.lastErase = null;
      return;
    }

    if (this.pointer.drawing) {
      this.strokePaint(tx, ty);
    } else {
      this.lastPaint = null;
    }

    if (this.pointer.erasing) {
      this.strokeErase(tx, ty);
    } else {
      this.lastErase = null;
    }
  }

  private tileInReach(tx: number, ty: number): boolean {
    const center = this.playerCenter();
    const cx = tx * TILE_SIZE + TILE_SIZE / 2;
    const cy = ty * TILE_SIZE + TILE_SIZE / 2;
    return Math.hypot(cx - center.x, cy - center.y) <= INK.reach;
  }

  private tileOverlapsPlayer(tx: number, ty: number): boolean {
    const { body } = this.player;
    return aabbOverlap(body.x, body.y, body.w, body.h, tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }

  private strokePaint(tx: number, ty: number): void {
    const from = this.lastPaint ?? { x: tx, y: ty };
    for (const tile of tilesBetween(from.x, from.y, tx, ty)) this.tryPaint(tile.x, tile.y);
    this.lastPaint = { x: tx, y: ty };
  }

  private strokeErase(tx: number, ty: number): void {
    const from = this.lastErase ?? { x: tx, y: ty };
    for (const tile of tilesBetween(from.x, from.y, tx, ty)) this.tryErase(tile.x, tile.y);
    this.lastErase = { x: tx, y: ty };
  }

  private tryPaint(tx: number, ty: number): void {
    if (!this.room.isPaintable(tx, ty)) return;
    if (!this.tileInReach(tx, ty)) return;
    if (this.tileOverlapsPlayer(tx, ty)) return;

    const spent = spendInk(this.ink, INK.costPerTile);
    if (spent.healthCost > 0 && this.player.health - spent.healthCost < 1) {
      if (this.toastCooldown <= 0) {
        this.toast('Trop délavé — efface de l\'encre (clic droit) pour continuer.');
        this.toastCooldown = 1.4;
      }
      return;
    }
    this.ink = spent.ink;
    if (spent.healthCost > 0) {
      this.player = { ...this.player, health: Math.max(1, this.player.health - spent.healthCost) };
      this.burst(tx * TILE_SIZE + 8, ty * TILE_SIZE + 8, 2, PALETTE.danger, 30);
    }
    this.room.paintInk(tx, ty);
    this.burst(tx * TILE_SIZE + 8, ty * TILE_SIZE + 8, PARTICLES.drawBurst, PALETTE.ink, 35);
  }

  private tryErase(tx: number, ty: number): void {
    if (!this.room.hasInk(tx, ty)) return;
    if (!this.tileInReach(tx, ty)) return;
    this.room.eraseInk(tx, ty);
    this.ink = reclaimInk(this.ink, INK.costPerTile);
    this.bus.emit('ink_reclaimed', { amount: INK.costPerTile });
    this.burst(tx * TILE_SIZE + 8, ty * TILE_SIZE + 8, PARTICLES.eraseBurst, PALETTE.unwritten, 40);
  }

  private respawn(): void {
    this.player = {
      body: { ...this.player.body, x: this.checkpoint.x, y: this.checkpoint.y, vx: 0, vy: 0 },
      grounded: false,
      facing: this.player.facing,
      health: this.player.health,
    };
    this.ink = refillInk(this.ink);
    this.bus.emit('player_respawned', { x: this.checkpoint.x, y: this.checkpoint.y });
  }

  // ---------- Interactions ----------

  private playerCenter(): { x: number; y: number } {
    const { body } = this.player;
    return { x: body.x + body.w / 2, y: body.y + body.h / 2 };
  }

  private playerOverlaps(obj: RoomObject, margin = 0): boolean {
    const { body } = this.player;
    return aabbOverlap(
      body.x - margin,
      body.y - margin,
      body.w + margin * 2,
      body.h + margin * 2,
      obj.x,
      obj.y,
      obj.width,
      obj.height,
    );
  }

  private checkPickups(): void {
    for (const word of this.room.objectsOfType('word')) {
      if (this.collectedObjects.has(word.id) || !this.playerOverlaps(word)) continue;
      const ability = word.properties['ability'];
      if (typeof ability !== 'string') continue;
      this.collectedObjects.add(word.id);
      this.unlocked.add(ability);
      this.burst(word.x + word.width / 2, word.y + word.height / 2, 12, PALETTE.danger, 55);
      this.bus.emit('ability_unlocked', { id: ability });
    }
    for (const fragment of this.room.objectsOfType('fragment')) {
      if (this.collectedObjects.has(fragment.id) || !this.playerOverlaps(fragment)) continue;
      const flag = fragment.properties['flag'];
      if (typeof flag !== 'string') continue;
      this.collectedObjects.add(fragment.id);
      this.storyFlags[flag] = true;
      this.burst(fragment.x + fragment.width / 2, fragment.y + fragment.height / 2, 16, PALETTE.unwritten, 50);
      this.bus.emit('flag_set', { flag, value: true });
    }
  }

  private handleInteract(): void {
    const npc = this.room
      .objectsOfType('npc')
      .find((o) => this.playerOverlaps(o, INTERACT_MARGIN));
    if (npc !== undefined) {
      const dialogueId = npc.properties['dialogue'];
      const data = typeof dialogueId === 'string' ? this.dialogues[dialogueId] : undefined;
      if (data !== undefined) {
        const step = startDialogue(data);
        this.applyEffects(step.effects);
        this.dialogue = { data, state: step.state, selected: 0 };
        this.mode = 'dialogue';
        this.bus.emit('npc_talked', { npcId: npc.name });
        return;
      }
    }
    const inkwell = this.room
      .objectsOfType('inkwell')
      .find((o) => this.playerOverlaps(o, INTERACT_MARGIN));
    if (inkwell !== undefined) {
      this.ink = refillInk(this.ink);
      this.checkpoint = { x: this.player.body.x, y: this.player.body.y };
      this.burst(inkwell.x + inkwell.width / 2, inkwell.y, 10, PALETTE.ink, 40);
      this.persist();
    }
  }

  private checkExit(): void {
    if (this.exitReached) return;
    const exit = this.room.objectsOfType('exit').find((o) => this.playerOverlaps(o));
    if (exit !== undefined) {
      this.exitReached = true;
      this.toast('Fin du prototype — la Marge continue en Phase 2.');
    }
  }

  private toast(text: string): void {
    this.toasts.push({ text, ttl: TOAST_SECONDS });
  }

  // ---------- Rendu ----------

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    ctx.drawImage(this.paper, 0, 0);
    this.renderMotes(ctx);
    this.renderSlabs(ctx);
    this.renderInk(ctx);
    this.renderObjects(ctx);
    this.renderPlayer(ctx);
    this.renderParticles(ctx);
    this.renderCursor(ctx);

    ctx.restore();

    drawHud(
      ctx,
      this.ink,
      this.player.health,
      [...this.unlocked].map((id) => getAbility(id)?.word ?? id),
    );
    drawToasts(ctx, this.toasts);

    if (this.mode === 'dialogue' && this.dialogue !== null) {
      const node = currentNode(this.dialogue.data, this.dialogue.state);
      if (node !== null) drawDialogueBox(ctx, node, this.dialogue.selected);
    }
  }

  private renderMotes(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = hexAlpha(PALETTE.sepia, 0.18);
    for (const mote of this.motes) {
      const y = mote.y + Math.sin(this.time * 0.7 + mote.phase) * 6;
      ctx.beginPath();
      ctx.arc(mote.x, y, mote.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private roundedSlab(ctx: CanvasRenderingContext2D, rect: TileRect, radius: number): void {
    ctx.beginPath();
    ctx.roundRect(rect.x * TILE_SIZE, rect.y * TILE_SIZE, rect.w * TILE_SIZE, rect.h * TILE_SIZE, radius);
    ctx.fill();
  }

  private renderSlabs(ctx: CanvasRenderingContext2D): void {
    const viewLeft = this.camera.x - TILE_SIZE;
    const viewRight = this.camera.x + INTERNAL_WIDTH + TILE_SIZE;
    const visible = this.slabs.filter((s) => s.x * TILE_SIZE <= viewRight && (s.x + s.w) * TILE_SIZE >= viewLeft);

    ctx.shadowColor = RENDERING.shadowColor;
    ctx.shadowBlur = RENDERING.shadowBlur;
    ctx.shadowOffsetY = RENDERING.shadowOffsetY;
    ctx.fillStyle = PALETTE.parchmentShade;
    for (const slab of visible) this.roundedSlab(ctx, slab, RENDERING.slabCornerRadius);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    for (const slab of visible) {
      const x = slab.x * TILE_SIZE;
      const y = slab.y * TILE_SIZE;
      const w = slab.w * TILE_SIZE;
      const h = slab.h * TILE_SIZE;
      ctx.strokeStyle = hexAlpha(PALETTE.sepia, 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, RENDERING.slabCornerRadius);
      ctx.stroke();
      ctx.fillStyle = hexAlpha(PALETTE.parchment, 0.55);
      ctx.fillRect(x + RENDERING.slabCornerRadius, y + 1, w - RENDERING.slabCornerRadius * 2, 1.5);
    }
  }

  private renderInk(ctx: CanvasRenderingContext2D): void {
    const inkSlabs = this.room.inkSlabs();
    ctx.shadowColor = RENDERING.shadowColor;
    ctx.shadowBlur = RENDERING.shadowBlur;
    ctx.shadowOffsetY = RENDERING.shadowOffsetY;
    ctx.fillStyle = PALETTE.ink;
    for (const slab of inkSlabs) this.roundedSlab(ctx, slab, 5);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    // Reflet clair sur la face supérieure de chaque dalle d'encre.
    ctx.fillStyle = hexAlpha(PALETTE.parchment, 0.22);
    for (const slab of inkSlabs) {
      ctx.fillRect(slab.x * TILE_SIZE + 4, slab.y * TILE_SIZE + 1.5, slab.w * TILE_SIZE - 8, 1.5);
    }
  }

  private renderObjects(ctx: CanvasRenderingContext2D): void {
    for (const word of this.room.objectsOfType('word')) {
      if (this.collectedObjects.has(word.id)) continue;
      const ability = word.properties['ability'];
      const def = typeof ability === 'string' ? getAbility(ability) : null;
      const cx = word.x + word.width / 2;
      const cy = word.y + word.height / 2 + Math.sin(this.time * 2.2) * 3;
      ctx.fillStyle = hexAlpha(PALETTE.danger, 0.08 + 0.04 * Math.sin(this.time * 3));
      ctx.beginPath();
      ctx.arc(cx, cy - 3, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = PALETTE.danger;
      ctx.shadowBlur = 10;
      ctx.fillStyle = PALETTE.danger;
      ctx.font = 'italic bold 12px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(def?.word ?? '???', cx, cy);
      ctx.shadowBlur = 0;
    }

    for (const fragment of this.room.objectsOfType('fragment')) {
      if (this.collectedObjects.has(fragment.id)) continue;
      this.renderFragment(ctx, fragment);
    }

    for (const inkwell of this.room.objectsOfType('inkwell')) {
      ctx.shadowColor = RENDERING.shadowColor;
      ctx.shadowBlur = RENDERING.shadowBlur;
      ctx.fillStyle = PALETTE.sepia;
      ctx.beginPath();
      ctx.roundRect(inkwell.x - 1, inkwell.y + 7, inkwell.width + 2, inkwell.height - 7, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = PALETTE.sepia;
      ctx.fillRect(inkwell.x + 2, inkwell.y + 2, inkwell.width - 4, 6);
      ctx.fillStyle = PALETTE.ink;
      ctx.beginPath();
      ctx.ellipse(
        inkwell.x + inkwell.width / 2,
        inkwell.y + 3,
        inkwell.width / 2 - 2.5,
        2 + Math.sin(this.time * 2) * 0.4,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      this.renderInteractHint(ctx, inkwell);
    }

    for (const exit of this.room.objectsOfType('exit')) {
      ctx.shadowColor = RENDERING.shadowColor;
      ctx.shadowBlur = RENDERING.shadowBlur;
      ctx.fillStyle = PALETTE.sepia;
      ctx.beginPath();
      ctx.roundRect(exit.x - 2, exit.y, exit.width + 4, exit.height, [8, 8, 0, 0]);
      ctx.fill();
      ctx.shadowBlur = 0;
      const doorway = ctx.createLinearGradient(exit.x, exit.y, exit.x, exit.y + exit.height);
      doorway.addColorStop(0, hexAlpha(PALETTE.ink, 0.85));
      doorway.addColorStop(1, hexAlpha(PALETTE.ink, 0.5));
      ctx.fillStyle = doorway;
      ctx.beginPath();
      ctx.roundRect(exit.x + 1, exit.y + 3, exit.width - 2, exit.height - 3, [6, 6, 0, 0]);
      ctx.fill();
    }

    for (const npc of this.room.objectsOfType('npc')) {
      const bob = Math.sin(this.time * 1.6) * 1.2;
      ctx.shadowColor = RENDERING.shadowColor;
      ctx.shadowBlur = RENDERING.shadowBlur;
      ctx.fillStyle = PALETTE.sepia;
      ctx.beginPath();
      ctx.roundRect(npc.x, npc.y + bob, npc.width, npc.height - bob, [6, 6, 3, 3]);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = PALETTE.parchment;
      ctx.beginPath();
      ctx.arc(npc.x + 3.5, npc.y + 6 + bob, 1.2, 0, Math.PI * 2);
      ctx.arc(npc.x + npc.width - 3.5, npc.y + 6 + bob, 1.2, 0, Math.PI * 2);
      ctx.fill();
      this.renderInteractHint(ctx, npc);
    }
  }

  /** Fragment secret : contraste fort + halo pulsant + éclat, pour être bien visible. */
  private renderFragment(ctx: CanvasRenderingContext2D, fragment: RoomObject): void {
    const cx = fragment.x + fragment.width / 2;
    const cy = fragment.y + fragment.height / 2 + Math.sin(this.time * 1.8) * 3;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 3);

    // Halo lumineux
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
    halo.addColorStop(0, hexAlpha(PALETTE.unwritten, 0.5));
    halo.addColorStop(1, hexAlpha(PALETTE.unwritten, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();

    // Anneau pulsant
    ctx.strokeStyle = hexAlpha(PALETTE.unwritten, 0.4 + pulse * 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 9 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();

    // Cœur : losange d'encre (fort contraste sur le parchemin) liseré clair
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.time * 0.9);
    ctx.shadowColor = PALETTE.unwritten;
    ctx.shadowBlur = 12;
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.roundRect(-5, -5, 10, 10, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = hexAlpha(PALETTE.unwritten, 0.9);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-5, -5, 10, 10, 2);
    ctx.stroke();
    ctx.restore();

    // Étincelle occasionnelle
    if (Math.sin(this.time * 3) > 0.9) {
      ctx.fillStyle = hexAlpha(PALETTE.parchment, 0.9);
      ctx.beginPath();
      ctx.arc(cx + 5, cy - 6, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderInteractHint(ctx: CanvasRenderingContext2D, obj: RoomObject): void {
    if (this.mode !== 'playing' || !this.playerOverlaps(obj, INTERACT_MARGIN)) return;
    const cx = obj.x + obj.width / 2;
    const y = obj.y - 12 + Math.sin(this.time * 4) * 1.5;
    ctx.fillStyle = hexAlpha(PALETTE.ink, 0.85);
    ctx.beginPath();
    ctx.roundRect(cx - 6, y - 8, 12, 11, 3);
    ctx.fill();
    ctx.fillStyle = PALETTE.parchment;
    ctx.font = 'bold 8px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('E', cx, y);
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    const { body, facing, grounded } = this.player;

    let stretch = 1;
    if (!grounded) {
      stretch = 1 + Math.min(Math.abs(body.vy) / PHYSICS.maxFallSpeed, 1) * 0.16;
    }
    if (this.landTimer > 0) {
      stretch = 1 - 0.22 * (this.landTimer / RENDERING.landSquashSeconds);
    }
    const h = body.h * stretch;
    const w = body.w / stretch;
    const footX = body.x + body.w / 2;
    const footY = body.y + body.h;

    if (grounded) {
      ctx.fillStyle = hexAlpha(PALETTE.ink, 0.15);
      ctx.beginPath();
      ctx.ellipse(footX, footY + 1.5, w * 0.55, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowColor = RENDERING.shadowColor;
    ctx.shadowBlur = 4;
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.roundRect(footX - w / 2, footY - h, w, h, [w * 0.5, w * 0.5, w * 0.28, w * 0.28]);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = PALETTE.parchment;
    ctx.beginPath();
    ctx.arc(footX + facing * w * 0.18, footY - h + 5.5, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.fillStyle = hexAlpha(p.color, Math.max(0, p.life / p.maxLife));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Curseur de tracé : anneau de portée autour du joueur + case sous la souris. */
  private renderCursor(ctx: CanvasRenderingContext2D): void {
    const cursor = this.cursor;
    if (cursor === null || this.mode !== 'playing') return;
    if (!hasAbility(this.unlocked, 'ecrire') || !this.pointer.inside) return;

    // Anneau de portée (discret), visible surtout quand on trace/efface.
    const active = this.pointer.drawing || this.pointer.erasing;
    const center = this.playerCenter();
    ctx.strokeStyle = active ? hexAlpha(PALETTE.ink, 0.14) : DRAW.reachRingColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.arc(center.x, center.y, INK.reach, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Case sous le curseur : couleur selon l'action possible.
    let color: string;
    if (this.pointer.erasing) {
      color = this.room.hasInk(cursor.tx, cursor.ty) && cursor.inReach ? DRAW.cursorEraseColor : DRAW.cursorBlockedColor;
    } else {
      const paintable = this.room.isPaintable(cursor.tx, cursor.ty) && cursor.inReach && !this.tileOverlapsPlayer(cursor.tx, cursor.ty);
      color = paintable ? DRAW.cursorPaintColor : DRAW.cursorBlockedColor;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cursor.tx * TILE_SIZE + 1, cursor.ty * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2, 3);
    ctx.stroke();
  }
}
