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

## Diagramme de dépendances (cible)

```
main.ts ──▶ game/ ──▶ engine/
              │
              └──▶ data/*.json (chargés, jamais codés en dur)
```

## À venir (Phase 1)
- `engine/loop.ts` : accumulateur à pas fixe 60 Hz, update/render découplés.
- `engine/physics.ts` : AABB + collision swept (anti-tunneling dès le départ).
- `engine/events.ts` : bus d'événements typé.
- `engine/input.ts` : mapping touches → actions abstraites.
