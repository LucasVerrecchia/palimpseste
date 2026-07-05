# Logs de prompts — Code

> Format par entrée : Contexte / Prompt / Modèle & outil / Output / Modifications manuelles / Décision d'intégration.

## Session 1 — 2026-07-05 — Phase 0 : fondations
- **Contexte** : démarrage du projet. Spec complète (`Palimpseste_SPEC.md`) fournie comme contexte. Objectif : Phase 0 (§7) — squelette du repo, outillage, canvas 480×270, docs.
- **Prompt (résumé)** : « On va faire un projet, tu as toutes les infos pour commencer » + question sur l'auto-régulation du choix de modèle pour maîtriser les coûts.
- **Modèle & outil** : Claude Fable 5 (claude-fable-5) via Claude Code (extension VS Code).
- **Output** :
  - `CLAUDE.md` (mémoire de projet, d'après §9 de la spec)
  - Outillage : `package.json`, `tsconfig.json` (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes), `vite.config.ts`, `vitest.config.ts`, `eslint.config.js` (flat config, strictTypeChecked), `.prettierrc`, `.gitignore`
  - `index.html` + `src/main.ts` (canvas 480×270, scaling entier, pixel-perfect, écran placeholder dans la palette)
  - `src/game/config.ts` (constantes + palette), `src/engine/scaling.ts` (fonction pure)
  - `tests/scaling.test.ts` (3 tests Vitest)
  - `docs/architecture.md`, `docs/risk_analysis.md`, `docs/feasibility_report.md` (squelette)
  - `README.md`, `ACKNOWLEDGEMENTS.md`, `LICENSE`, ce fichier de logs
- **Modifications manuelles** : aucune pour l'instant (à compléter si l'humain édite après la session).
- **Décision d'intégration** : intégré tel quel après vérification lint + tests + build verts ; commit initial Phase 0.
