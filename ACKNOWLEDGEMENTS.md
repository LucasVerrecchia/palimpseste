# Acknowledgements — sources, licences, outils IA

## Modèles LLM utilisés
| Modèle | Fournisseur | Usage | Sessions |
|---|---|---|---|
| Claude Fable 5 (`claude-fable-5`) | Anthropic | Assistance au développement via Claude Code (VS Code) | Voir `/prompts_logs/03_code_prompts.md` |

## Outils
| Outil | Licence | Usage |
|---|---|---|
| Vite | MIT | Dev server + build (devDependency uniquement) |
| Vitest | MIT | Tests unitaires |
| TypeScript | Apache-2.0 | Langage / type-checking |
| ESLint + typescript-eslint | MIT / BSD-2-Clause | Lint |
| Prettier | MIT | Formatage |
| Tiled (prévu Phase 1+) | GPL (éditeur) — exports JSON libres | Édition des cartes |

## Assets
| Asset | Source | Licence | Modifications |
|---|---|---|---|
| `src/fx/music/HackathonGameSong.mp3` (musique de fond bouclée) | Composition originale de Lucas (créée quelques mois avant le projet), ajoutée directement par lui (2026-07-29) | Original — aucun souci de licence | Aucune |

Les bruitages (saut, dash, double saut, tir) sont synthétisés en Web Audio
API (oscillateurs, `engine/audio.ts`) — aucun fichier, donc rien à
référencer ici.

> Règle : original > CC0 (Kenney, OpenGameArt, freesound, freemusicarchive).
> Chaque ajout d'asset doit être enregistré ici **et** son prompt de génération
> éventuel loggué dans `/prompts_logs/02_assets_prompts.md`.
