/**
 * Orchestrateur du jeu : relie input, physique, salle, encre, dialogues, save
 * et rendu. Les règles métier restent dans les modules purs ; ici on ne fait
 * que les brancher (et dessiner les placeholders de la Phase 1).
 */
import { Camera } from '../engine/camera';
import type { Input } from '../engine/input';
import { aabbOverlap } from '../engine/physics';
import { loadJson, saveJson, type StorageLike } from '../engine/save';
import { parseTiledMap, type RoomObject } from '../engine/tilemap';
import {
  INK,
  INTERACT_MARGIN,
  INTERNAL_HEIGHT,
  INTERNAL_WIDTH,
  PALETTE,
  PLAYER,
  TILE_SIZE,
  TOAST_SECONDS,
  WRITE_RANGE,
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
import { createInk, refillInk, spendInk, type InkState } from './player/ink';
import { parseSave, SAVE_KEY, SAVE_VERSION, type SaveData } from './save';
import { drawDialogueBox } from './ui/dialogue_box';
import { drawHud, drawToasts, type Toast } from './ui/hud';
import { Room, type UnwrittenPlatform } from './world/room';
import dialoguePnjMarge from '../data/dialogues/pnj_marge.json';
import roomMarge01 from '../data/rooms/marge_01.json';

const ROOM_ID = 'marge_01';

type Mode = 'playing' | 'dialogue';

interface ActiveDialogue {
  data: DialogueData;
  state: DialogueState;
  selected: number;
}

export class Game {
  private readonly input: Input;
  private readonly storage: StorageLike;
  private readonly bus: GameEventBus;
  private readonly camera = new Camera();
  private readonly room: Room;
  private readonly dialogues: Record<string, DialogueData>;

  private player: PlayerState;
  private ink: InkState;
  private readonly unlocked = new Set<string>();
  private readonly storyFlags: Record<string, boolean | number> = {};
  private endingLeaning = 0;
  private readonly visitedRooms = new Set<string>();
  private readonly collectedObjects = new Set<number>();

  private mode: Mode = 'playing';
  private dialogue: ActiveDialogue | null = null;
  private readonly toasts: Toast[] = [];
  private exitReached = false;
  private time = 0;

  constructor(input: Input, storage: StorageLike) {
    this.input = input;
    this.storage = storage;
    this.bus = createGameBus();
    this.room = new Room(ROOM_ID, parseTiledMap(roomMarge01));
    this.dialogues = { pnj_marge: parseDialogueData(dialoguePnjMarge) };

    this.ink = createInk(INK.max);
    this.player = this.spawnPlayer();

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

  private wireToasts(): void {
    this.bus.on('ability_unlocked', ({ id }) => {
      const def = getAbility(id);
      if (def !== null) this.toast(`Mot retrouvé : ${def.word} — [X] pour écrire`);
    });
    this.bus.on('game_saved', () => {
      this.toast('Encrier — le manuscrit retient ta place.');
    });
    this.bus.on('flag_set', ({ flag }) => {
      if (flag === 'fragment_marge') this.toast('Fragment de page recueilli.');
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
    }
    // Les objets uniques déjà pris ne doivent pas réapparaître.
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
    if (this.mode === 'dialogue') {
      this.updateDialogue();
    } else {
      this.updatePlaying(dtSeconds);
    }
    for (const toast of this.toasts) toast.ttl -= dtSeconds;
    while (this.toasts.length > 0 && (this.toasts[0]?.ttl ?? 0) <= 0) this.toasts.shift();
    this.input.endFrame();
  }

  private updatePlaying(dtSeconds: number): void {
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

    this.checkPickups();
    if (this.input.wasPressed('interact')) this.handleInteract();
    if (this.input.wasPressed('write')) this.handleWrite();
    this.checkExit();

    const center = this.playerCenter();
    this.camera.follow(
      center.x,
      center.y,
      INTERNAL_WIDTH,
      INTERNAL_HEIGHT,
      this.room.pixelWidth,
      this.room.pixelHeight,
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
      this.bus.emit('ability_unlocked', { id: ability });
    }
    for (const fragment of this.room.objectsOfType('fragment')) {
      if (this.collectedObjects.has(fragment.id) || !this.playerOverlaps(fragment)) continue;
      const flag = fragment.properties['flag'];
      if (typeof flag !== 'string') continue;
      this.collectedObjects.add(fragment.id);
      this.storyFlags[flag] = true;
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
      this.bus.emit('ink_refilled', { max: this.ink.max });
      this.persist();
    }
  }

  private handleWrite(): void {
    const ability = getAbility('ecrire');
    if (ability === null || !hasAbility(this.unlocked, 'ecrire')) {
      this.toast('Tu ne sais pas encore écrire…');
      return;
    }
    const center = this.playerCenter();
    let nearest: UnwrittenPlatform | null = null;
    let nearestDist = Infinity;
    for (const platform of this.room.platforms) {
      if (platform.written) continue;
      const dx = platform.x + platform.width / 2 - center.x;
      const dy = platform.y + platform.height / 2 - center.y;
      const dist = Math.hypot(dx, dy);
      if (dist < nearestDist) {
        nearest = platform;
        nearestDist = dist;
      }
    }
    if (nearest === null || nearestDist > WRITE_RANGE) {
      this.toast('Rien à écrire à portée.');
      return;
    }
    const spent = spendInk(this.ink, ability.inkCost);
    this.ink = spent.ink;
    if (spent.healthCost > 0) {
      this.player = { ...this.player, health: Math.max(0, this.player.health - spent.healthCost) };
      this.toast('À sec — l\'encre te délave…');
    }
    this.room.writePlatform(nearest);
    this.bus.emit('ink_spent', { amount: ability.inkCost, remaining: this.ink.current });
    this.bus.emit('platform_written', { objectId: nearest.objectId });
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
    ctx.fillStyle = PALETTE.parchment;
    ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    this.renderTiles(ctx);
    this.renderPlatforms(ctx);
    this.renderObjects(ctx);
    this.renderPlayer(ctx);

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

  private renderTiles(ctx: CanvasRenderingContext2D): void {
    const txMin = Math.floor(this.camera.x / TILE_SIZE);
    const txMax = Math.floor((this.camera.x + INTERNAL_WIDTH - 1) / TILE_SIZE);
    const tyMin = Math.floor(this.camera.y / TILE_SIZE);
    const tyMax = Math.floor((this.camera.y + INTERNAL_HEIGHT - 1) / TILE_SIZE);
    for (let ty = tyMin; ty <= tyMax; ty++) {
      for (let tx = txMin; tx <= txMax; tx++) {
        if (!this.room.isSolid(tx, ty) || tx < 0 || ty < 0) continue;
        ctx.fillStyle = PALETTE.parchmentShade;
        ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        // Liseré d'encre sur les surfaces exposées (lisibilité des plateformes).
        if (!this.room.isSolid(tx, ty - 1)) {
          ctx.fillStyle = PALETTE.sepia;
          ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, 2);
        }
      }
    }
  }

  private renderPlatforms(ctx: CanvasRenderingContext2D): void {
    for (const platform of this.room.platforms) {
      if (platform.written) {
        // Plateforme d'encre matérialisée
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      } else {
        // Emplacement « non-écrit » : contour pointillé spectral
        ctx.strokeStyle = PALETTE.unwritten;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(platform.x + 0.5, platform.y + 0.5, platform.width - 1, platform.height - 1);
        ctx.setLineDash([]);
      }
    }
  }

  private renderObjects(ctx: CanvasRenderingContext2D): void {
    for (const word of this.room.objectsOfType('word')) {
      if (this.collectedObjects.has(word.id)) continue;
      const ability = word.properties['ability'];
      const def = typeof ability === 'string' ? getAbility(ability) : null;
      const bob = Math.sin(this.time * 3) * 3;
      ctx.fillStyle = PALETTE.danger;
      ctx.font = 'bold 10px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(def?.word ?? '???', word.x + word.width / 2, word.y + word.height / 2 + bob);
    }

    for (const fragment of this.room.objectsOfType('fragment')) {
      if (this.collectedObjects.has(fragment.id)) continue;
      const cx = fragment.x + fragment.width / 2;
      const cy = fragment.y + fragment.height / 2 + Math.sin(this.time * 2) * 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.unwritten;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }

    for (const inkwell of this.room.objectsOfType('inkwell')) {
      ctx.fillStyle = PALETTE.sepia;
      ctx.fillRect(inkwell.x, inkwell.y + 8, inkwell.width, inkwell.height - 8);
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(inkwell.x + 2, inkwell.y, inkwell.width - 4, 8);
      this.renderInteractHint(ctx, inkwell);
    }

    for (const exit of this.room.objectsOfType('exit')) {
      ctx.fillStyle = PALETTE.sepia;
      ctx.fillRect(exit.x, exit.y, exit.width, exit.height);
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(exit.x + exit.width - 5, exit.y + exit.height / 2 - 1, 2, 2);
    }

    for (const npc of this.room.objectsOfType('npc')) {
      ctx.fillStyle = PALETTE.sepia;
      ctx.fillRect(npc.x, npc.y, npc.width, npc.height);
      ctx.fillStyle = PALETTE.parchment;
      ctx.fillRect(npc.x + 2, npc.y + 4, 2, 2);
      ctx.fillRect(npc.x + npc.width - 4, npc.y + 4, 2, 2);
      this.renderInteractHint(ctx, npc);
    }
  }

  private renderInteractHint(ctx: CanvasRenderingContext2D, obj: RoomObject): void {
    if (this.mode !== 'playing' || !this.playerOverlaps(obj, INTERACT_MARGIN)) return;
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 9px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('E', obj.x + obj.width / 2, obj.y - 5);
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    const { body, facing } = this.player;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(Math.round(body.x), Math.round(body.y), body.w, body.h);
    // L'œil, côté regard
    ctx.fillStyle = PALETTE.parchment;
    const eyeX = facing === 1 ? body.x + body.w - 4 : body.x + 2;
    ctx.fillRect(Math.round(eyeX), Math.round(body.y + 4), 2, 2);
  }
}
