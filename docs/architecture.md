# Palimpseste — Architecture & décisions techniques

> Document vivant : chaque décision structurante y est notée avec sa justification.
> Voir `Palimpseste_SPEC.md` §2 et §4 pour la spec de référence.

## Stack

| Élément | Choix | Justification |
|---|---|---|
| Langage | TypeScript `strict` | Imposé par la spec ; sécurité de types pour la logique métier testée |
| Build/dev | Vite 7 | Imposé ; outil de dev uniquement, zéro trace au runtime |
| Rendu | Canvas 2D natif | Imposé ; pas de moteur de jeu, contrôle total du pixel-perfect |
| Audio | Web Audio API | Imposé ; natif |
| Persistance | `localStorage` versionné | Imposé ; migration/fallback prévue dans `engine/save.ts` (Phase 1+) |
| Cartes | Tiled → JSON parsé maison | Imposé ; le parseur vit dans `engine/tilemap.ts` (Phase 1) |
| Tests | Vitest | S'intègre nativement à Vite ; environnement `node` car la logique testée est pure |
| Qualité | ESLint 9 + Prettier | Voir décision D2 |

## Politique de dépendances

**Zéro dépendance runtime.** `dependencies` de `package.json` doit rester vide.
Tout ajout devra être justifié ici avant merge. DevDependencies acceptées :
`vite`, `vitest`, `typescript`, `eslint` (+ plugins), `prettier`.

## Décisions

### D1 — Le repo vit à la racine du dossier de projet
La spec propose un dossier `/palimpseste` ; on utilise directement la racine du
workspace (`CLAUDE.md` et `Palimpseste_SPEC.md` côte à côte), ce qui simplifie
les chemins et correspond à l'esprit du §9 (« CLAUDE.md à la racine du repo »).

### D2 — ESLint flat config (`eslint.config.js`) au lieu de `.eslintrc`
ESLint 9 a supprimé le support de `.eslintrc`. Le flat config est le format
officiel actuel ; même rôle, fichier différent. Config : `strictTypeChecked`
de typescript-eslint + `eslint-config-prettier` pour neutraliser les conflits
de formatage.

### D3 — `tsc --noEmit` dans le script `build`
Vite transpile sans type-checker. Le script `build` enchaîne `tsc` (types) puis
`vite build` (bundle) pour qu'un build vert garantisse un projet bien typé.

### D4 — Frontières de modules
- `src/engine/` : générique, réutilisable, **n'importe jamais** depuis `src/game/`.
- `src/game/` : spécifique à Palimpseste, importe librement `engine/`.
- `src/data/` : contenu data-driven (JSON), consommé par `game/`.
- Constantes centralisées dans `src/game/config.ts` (règle « zéro nombre magique »).

### D5 — Fonctions pures pour la logique métier
Collisions, encre, `resolveEnding`, machine à états des dialogues : fonctions
pures sans accès DOM/Canvas, testées dans `tests/` en environnement `node`.
Premier exemple en place : `engine/scaling.ts` (`computeIntegerScale`).

### D6 — Pas d'ECS en Phase 1
La spec prévoit un ECS « léger et pragmatique ». En Phase 1 il n'y a que le
joueur, un PNJ et des objets de salle : des types dédiés suffisent et restent
plus lisibles. L'ECS sera introduit en Phase 2 quand la variété d'ennemis le
justifiera — l'introduire avant serait de la sur-ingénierie.

### D7 — Salle marge_01 générée par script (stopgap Phase 1)
`tools/gen_room_marge01.mjs` génère `src/data/rooms/marge_01.json` au format
export Tiled (le fichier s'ouvre dans Tiled). À partir de la Phase 2, les
salles seront éditées directement dans Tiled ; le parseur maison
(`engine/tilemap.ts`) est déjà conforme au format d'export officiel
(y compris le champ `class` de Tiled ≥ 1.9).

### D8 — Contenu narratif = placeholder co-écrit plus tard
Décision de process : la machinerie de dialogue est finale et testée, mais les
textes dans `data/dialogues/*.json` sont des placeholders marqués
`[TODO narration]`. L'écriture narrative se fait en binôme humain/IA dans une
passe dédiée (Phase 3), pas au fil du code.

## Diagramme de dépendances (cible)

```
main.ts ──▶ game/ ──▶ engine/
              │
              └──▶ data/*.json (chargés, jamais codés en dur)
```

## Réalisé en Phase 1
- `engine/` : `loop.ts` (pas fixe 60 Hz), `physics.ts` (AABB swept, testée
  anti-tunneling), `events.ts` (bus typé), `input.ts` (actions abstraites,
  remappables, basées sur `KeyboardEvent.code` → AZERTY ok), `tilemap.ts`
  (parseur Tiled), `save.ts` (localStorage versionné), `camera.ts`, `renderer.ts`.
- `game/` : contrôleur joueur (saut variable), encre (pure, règle du délavage),
  pouvoir ÉCRIRE data-driven, machine à états de dialogue (pure, validée),
  salle avec plateformes non-écrites, HUD, boîte de dialogue, save/restore.
- 47 tests Vitest sur la logique pure.

## À venir (Phase 2)
- ECS léger (voir D6) + ennemis (Coquilles, Ratures) + boss Coquille majuscule.
- `world/palimpsest.ts` : couches en filigrane (effacement → révélation).
- Transitions de salles multiples ; salles éditées dans Tiled.
- Pouvoirs BRÈCHE, HÂTE, ANCRE, ALES + gating.
