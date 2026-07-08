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

## Session 2 — 2026-07-05 — Phase 1 : prototype vertical
- **Contexte** : Phase 0 validée par l'humain (« Ok go next »). Objectif : Phase 1 (§7) — prototype jouable complet dans une salle.
- **Prompt (résumé)** : « Ok go next », puis consigne en cours de session : « pour tout ce qui est narratif on va en discuter, concentre-toi sur le technique ».
- **Modèle & outil** : Claude Fable 5 (claude-fable-5) via Claude Code (extension VS Code).
- **Output** :
  - `engine/` : `loop.ts` (pas fixe 60 Hz), `events.ts` (bus typé), `input.ts` (actions abstraites remappables, KeyboardEvent.code), `camera.ts`, `renderer.ts`, `physics.ts` (AABB swept anti-tunneling), `tilemap.ts` (parseur Tiled maison), `save.ts` (localStorage versionné générique)
  - `game/` : `config.ts` (constantes physique/encre), `events.ts`, `save.ts` (schéma v1 + validation), `player/{ink,abilities,controller}.ts`, `narrative/dialogue.ts` (machine à états pure + validation des données), `world/room.ts`, `ui/{hud,dialogue_box}.ts`, `game.ts`, `main.ts`
  - Data : `abilities.json`, `dialogues/pnj_marge.json` (**texte placeholder [TODO narration]** — sera co-écrit avec l'humain), `rooms/marge_01.json` (généré par `tools/gen_room_marge01.mjs`, format Tiled)
  - Tests : 47 tests Vitest (physique swept dont anti-tunneling, encre/délavage, dialogue, save/migration, tilemap + intégrité de la salle réelle)
- **Modifications manuelles** : aucune pendant la session ; consigne humaine intégrée (narration = placeholders à co-écrire).
- **Décision d'intégration** : intégré après lint + 47 tests + build verts + smoke test HTTP du build servi (`vite preview` → 200). Validation jouable par l'humain attendue avant Phase 2.

## Session 3 — 2026-07-06 — Setup GitHub + pivot direction artistique (D9)
- **Contexte** : retour de playtest humain sur la Phase 1 : mouvements OK, mais rendu jugé « très 8-bit débutant » ; demande d'un style plus moderne, ouverture à l'usage de librairies.
- **Prompt (résumé)** : « les mouvements sont pas trop mal MAIS ça fait très 8-bit débutant […] un truc plus moderne et moins pixel art, n'hésite pas à prendre des librairies ». Question posée en retour (choix structuré) : Canvas vectoriel maison / Pixi.js / Phaser + conservation de la palette. **Décision humaine** : Canvas vectoriel maison + palette manuscrit conservée.
- **Modèle & outil** : Claude Fable 5 (claude-fable-5) via Claude Code.
- **Output** :
  - Setup : installation GitHub CLI (winget), auth device-flow par l'humain, création du dépôt privé `LucasVerrecchia/palimpseste` + push.
  - Pivot DA (D9, docs/architecture.md) : `engine/renderer.ts` réécrit (canvas pleine fenêtre à résolution native + letterbox, vue 480×270 en unités monde), caméra à lissage exponentiel, suppression du module de scaling entier, `mergeSolidTiles` (fusion des tuiles en dalles, pure + testée), rendu modernisé de game.ts (texture papier procédurale, dalles arrondies ombrées, squash & stretch, particules d'encre, lueurs), HUD/toasts/boîte de dialogue en pilules arrondies. Spec §5 annotée, CLAUDE.md/README mis à jour.
- **Modifications manuelles** : aucune ; décisions prises par l'humain via questions structurées.
- **Décision d'intégration** : intégré après 49 tests + lint + build verts. Validation visuelle par l'humain attendue.

## Session 4 — 2026-07-07 — Encre à la souris + refonte de la difficulté (D10)
- **Contexte** : après validation visuelle (« ça va un peu mieux »), retours de playtest : (1) demande d'analyse de la difficulté du niveau et de le rendre plus dur ; (2) idée d'améliorer l'encre → tracer les blocs à la souris ; (3) le fragment à ramasser est invisible.
- **Prompt (résumé)** : « es-tu capable de te rendre compte du rendu du niveau (difficulté, jouabilité) ? […] analyse-le et rends-le plus difficile. Le concept de l'encre peut être amélioré : tracer les blocs à la main (souris). Et le truc à ramasser sur la plateforme on ne le voit pas. » + consigne : « pour tout ce qui est narratif on en discutera, concentre-toi sur le technique ».
- **Analyse fournie** (à partir des données, pas d'un rendu visuel — limite assumée) : hauteur de saut max ≈ 57 px, portée ≈ 76 px ; toutes les fosses = 32 px (marge 2-3×), encre jamais contraignante → niveau trivial. Fragment 9×9 px bleu pâle sur crème → invisible (diagnostic confirmé).
- **Décisions humaines** (via questions structurées) : tracé = trait libre rastérisé sur la grille ; difficulté = budget + encre récupérable à l'effacement.
- **Modèle & outil** : Claude Fable 5 (claude-fable-5) puis passage à Claude Opus 4.8 (claude-opus-4-8) en cours de session, via Claude Code.
- **Output** :
  - Mécanique : `engine/pointer.ts` (souris), `Renderer.screenToView` + interface `Viewport`, `tilesBetween` (rastérisation de trait, pure, sans trou), `reclaimInk` (remboursement), couche d'encre mutable dans `world/room.ts` (paint/erase/isPaintable/inkSlabs) remplaçant les plateformes pré-placées.
  - `game/game.ts` : tracé/effacement à la souris avec portée limitée, délavage (à sec → PV, plancher 1 PV), respawn touche R au dernier encrier, rendu des dalles d'encre + curseur de tracé (case + anneau de portée).
  - Niveau `gen_room_marge01.mjs` refait (74×17) : 2 fosses infranchissables au saut (tracé obligatoire), aucun encrier avant l'île 2 (force la récupération d'encre), montée finale à tracer, fragment secret tentant au-dessus de l'île 1.
  - Fragment : rendu haute visibilité (halo radial, anneau pulsant, cœur d'encre contrasté, étincelle).
  - `SAVE_VERSION` v2 (rejet des saves v1), `abilities.json` + dialogue mis à jour (contrôles souris), `index.html` (curseur croix).
  - Tests : `draw.test.ts` (rastérisation, 4-adjacence), `room.test.ts` (couche d'encre), `reclaimInk` (ink.test), maj du test du niveau réel. Total 63 tests.
- **Modifications manuelles** : aucune ; décisions par questions structurées.
- **Décision d'intégration** : intégré après 63 tests + lint + build verts. `game.ts` (orchestration souris/canvas) non testable unitairement → validation par playtest humain attendue.

## Session 5 — 2026-07-08 — Narration & objectif du chapitre 1 : la « déviation » (D11)
- **Contexte** : après validation de la mécanique d'encre, passage au game design narratif. Concept posé avec l'humain : un personnage coincé dans un livre qui doit « écrire son chemin » ; chaque chapitre = une trame prévue que le joueur peut **dévier**.
- **Prompt (résumé)** : « on va peaufiner le jeu, surtout le niveau, les objectifs et la narration […] chaque niveau est un chapitre censé se dérouler d'une certaine manière, mais notre personnage peut dévier cette histoire ». Puis : « essayons de faire le niveau 1 complet et fini ».
- **Modèle & outil** : Claude Opus 4.8 (claude-opus-4-8) via Claude Code (extension VS Code).
- **Décisions humaines** (via question structurée) : incarnation de la déviation = **« phrase-loi gravée dans le décor »** (vs narrateur qui commente vs les deux). Le contenu narratif (phrase, PNJ) reste [proposition] à valider.
- **Output** :
  - Décision **D11** documentée (docs/architecture.md) : phrase-loi gravée, déviée en raturant un mot-loi (RATURE) ou en comblant un blanc ▢ (POINT FINAL), nourrit `endingLeaning`.
  - `game/narrative/deviation.ts` : logique pure testée (`objectTiles`, `isBlankFilled`, `applyLeaning`).
  - `world/room.ts` : barrières « canon » solides et effaçables (`registerCanonBarrier`/`eraseCanon`/`canonAt`), intégrées à `isSolid`/`isPaintable`.
  - `game/game.ts` : rature d'un mot-loi au clic droit, détection du blanc comblé, application flag+penchant, 2 sorties (fins en miniature), rendu des mots-loi + **bandeau de phrase-loi réactif** (mot rayé / blanc rempli), curseur signalant le raturable.
  - Data : `data/chapters/marge_01.json` (phrase réactive, data-driven), `dialogues/pnj_marge.json` réécrit ([proposition] « Le Signet » pose la règle et le choix), objets Tiled `canon` (barrier/latent) + 2 `exit` (ending rature/point).
  - Niveau `gen_room_marge01.mjs` refait (64×17) : tuto ÉCRIRE (2 ressauts) → PNJ avant le pouvoir → encrier → zone du choix (barrière « jamais » en bas / blanc ▢ sur passerelle haute) → 2 sorties. Fragment secret conservé.
  - `events.ts` : `canon_erased`, `canon_completed`, `chapter_ended`.
  - Tests : `deviation.test.ts` (nouveau) + maj du test du niveau réel (géométrie v3). Total 71 tests.
- **Modifications manuelles** : aucune ; décision de déviation prise par question structurée. Textes narratifs marqués [proposition] pour validation.
- **Décision d'intégration** : intégré après typecheck + 71 tests + lint + build verts, et vérif géométrie (rendu ASCII) + intégrité du dialogue. Playtest humain du chapitre 1 attendu avant Phase 2.

## Session 6 — 2026-07-08 — Playtest chapitre 1 : concrétisation & polish
- **Contexte** : playtests successifs du chapitre 1 par l'humain, trois retours.
- **Prompts (résumés)** :
  1. « le personnage arrive au mauvais endroit (tout à droite)… les checkpoints persistent après avoir quitté ».
  2. « je comprends pas trop la matérialisation de notre idée : on marche sur des plateformes, c'est pas assez concret le "si tu écris là tu changes le cours des choses" ».
  3. « le sens est bancal : compléter donne "Le mot toi resta… et n'en sortit" qui ne veut rien dire. Il faut que la phrase ait toujours du sens et montre le choix. Et la bulle de dialogue chevauche le texte du PNJ au moment de choisir. »
- **Modèle & outil** : Claude Opus 4.8 (claude-opus-4-8) via Claude Code.
- **Décisions humaines** : reprise auto au démarrage = OFF pendant le dev ; matérialisation = « les obstacles sont les mots de la phrase » ; sens = recomposer une phrase entière selon les choix (option b, proposée puis validée).
- **Output** :
  - **Bug spawn** : `SAVE_VERSION` v2→v3 (rejet des saves obsolètes) + `AUTO_RESUME=false` (config) : le jeu ne reprend plus la save au démarrage, il repart au spawn (l'encrier reste un checkpoint en cours de partie via R ; save toujours écrite pour un futur menu « Continuer »).
  - **Concrétisation** : suppression des murs abstraits ; ajout du mot-cage **« enfermé »** (barrière-canon neutre) qui barre le couloir dès le départ → 1er geste = te libérer en le raturant. Le level design (`gen_room_marge01.mjs`) fait des mots-loi les seuls obstacles. Étiquettes d'action au-dessus des mots-loi à portée.
  - **Sens de la phrase** : `resolveSentence(variants, flags)` (pur, testé) recompose une **phrase entière et cohérente** selon les choix, au lieu de rayer des mots ; variantes data-driven dans `data/chapters/marge_01.json` ([proposition]). Écrire « toi » change « Le mot » → « Tu » ; raturer « jamais » inverse la fatalité.
  - **Bulle de dialogue** : `ui/dialogue_box.ts` réécrit à **hauteur calculée** (en-tête + lignes + choix) → les réponses ne chevauchent plus la réplique.
  - Tests : `resolveSentence` (4 cas) ajoutés → 75 tests. D11 (docs/architecture.md), CLAUDE.md et README d'état mis à jour.
- **Modifications manuelles** : aucune ; décisions par échanges structurés. Textes narratifs marqués [proposition].
- **Décision d'intégration** : intégré après typecheck + 75 tests + lint + build verts, et vérif de la recomposition de phrase pour les 5 états. Playtest de confirmation attendu.
