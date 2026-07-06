# Palimpseste — Spécification & plan de build

> Document maître à donner à **Claude Code** (dans VS Code) comme contexte de projet.
> Objectif : un mini-jeu Metroidvania web, ~1h–1h30, propre et complet, construit **phase par phase**.
> **Ne pas tout coder d'un coup.** Chaque phase a des critères d'acceptation ; on ne passe à la suivante que quand ils sont remplis.

---

## 0. Comment utiliser ce document (à lire en premier, Claude Code)

1. **Première action** : créer un fichier `CLAUDE.md` à la racine du repo à partir de la section 9 de ce document. C'est ta mémoire de projet : tu la reliras à chaque session pour rester cohérent.
2. **Deuxième action** : initialiser le squelette (section 3) + la stack (section 2). Ne pas écrire de gameplay tant que le moteur de base ne tourne pas.
3. **Ensuite** : suivre le plan de build (section 7), une phase à la fois. À la fin de chaque phase, s'arrêter, résumer ce qui a été fait, lister ce qui reste, et attendre validation humaine avant de continuer.
4. **En continu** : respecter les standards (section 8) et la traçabilité (section 10).

Ce projet est **noté**. La grille récompense surtout : conformité au brief (30 %), **architecture & qualité de code (20 %)**, **traçabilité IA / logs de prompts (20 %)**, créativité (10 %), robustesse/UX (10 %), respect juridique/éthique (10 %). Traduction : viser un jeu *petit mais irréprochable* plutôt que gros et bancal.

---

## 1. Contexte & contraintes académiques

- **Type** : platformer Metroidvania léger, web.
- **Durée de jeu cible** : 1h–1h30.
- **Éléments obligatoires** : au moins 2 fins alternatives ; mécanique de pouvoirs à débloquer ; au moins un PNJ secondaire pour la narration ; storyline cohérente avec les fins.
- **Interdits** : cloner un jeu existant ; utiliser des assets protégés hors licence.
- **Obligations de traçabilité** : documenter tous les prompts LLM (dossier `/prompts_logs/`), lister toutes les sources/licences (`ACKNOWLEDGEMENTS.md`), ne pas envoyer de données personnelles sensibles aux LLM (RGPD).
- **Livrables** : (1) étude de faisabilité PDF + repo initial ; (2) prototype jouable + premiers codes + logs ; (3) code complet + dossier explicatif + tests ; (final) dossier technique complet + build + transcripts.

---

## 2. Stack technique & principes

**Stack imposée pour ce projet :**
- **Langage** : TypeScript (mode `strict`).
- **Build/dev** : Vite. C'est un outil de dev/build uniquement — **au runtime, zéro dépendance**.
- **Rendu** : HTML5 Canvas 2D (pas de moteur de jeu, pas de framework UI).
- **Audio** : Web Audio API native.
- **Persistance** : `localStorage`.
- **Cartes/niveaux** : éditées avec **Tiled** (gratuit), exportées en JSON. Le JSON est parsé par du code maison → aucune lib runtime.
- **Tests** : Vitest (s'intègre nativement à Vite).
- **Qualité** : ESLint + Prettier.
- **Node** : LTS (≥ 20).

**Politique de dépendances :** aucune dépendance runtime sans justification écrite. Vite, Vitest, ESLint, Prettier, les types `@types/*` sont des devDependencies acceptées. Tout ajout de lib runtime doit être noté dans `docs/architecture.md` avec sa raison.

**Principes d'architecture (non négociables) :**
- **Séparation moteur / jeu** : une couche `engine/` générique et réutilisable, une couche `game/` spécifique à Palimpseste. `engine/` ne connaît jamais Palimpseste.
- **Data-driven** : niveaux, dialogues, pouvoirs, ennemis, flags d'histoire vivent dans des fichiers de données (JSON), pas en dur dans le code.
- **Boucle à pas de temps fixe** : update à 60 Hz logique, rendu découplé (interpolation optionnelle). Jamais de logique dépendante du framerate.
- **Bus d'événements** : les systèmes communiquent par événements (`ability_unlocked`, `npc_talked`, `ink_spent`, `room_entered`, `flag_set`…) plutôt que par appels directs, pour rester découplés.
- **Logique pure testable** : toute logique métier (collisions, ressource d'encre, évaluation des fins, machine à états des dialogues) écrite en fonctions pures, testée unitairement.

---

## 3. Structure du dépôt

Fusion de la structure imposée par le sujet et de notre layout `src/` :

```
/palimpseste
  CLAUDE.md                      # mémoire de projet (voir §9)
  README.md                      # doc utilisateur + comment lancer
  LICENSE
  ACKNOWLEDGEMENTS.md            # assets, LLM, licences
  package.json
  tsconfig.json
  vite.config.ts
  vitest.config.ts
  .eslintrc / .prettierrc
  index.html

  /docs
    feasibility_report.md        # (exporté en PDF pour le Livrable 1)
    architecture.md              # décisions techniques + diagrammes
    risk_analysis.md             # tableau de risques (§11)

  /prompts_logs
    01_feasibility_prompts.md
    02_assets_prompts.md
    03_code_prompts.md

  /src
    main.ts                      # point d'entrée : bootstrap + boucle
    /engine                      # générique, réutilisable
      loop.ts                    # pas de temps fixe
      renderer.ts                # abstraction Canvas 2D
      camera.ts
      input.ts                   # clavier/manette/tactile -> actions
      physics.ts                 # AABB + collision tilemap (swept)
      assets.ts                  # chargeur + manifest + preloading
      audio.ts                   # Web Audio (musique + sfx)
      scenes.ts                  # gestionnaire de scènes/états
      events.ts                  # bus d'événements typé
      tilemap.ts                 # parse Tiled JSON
      save.ts                    # localStorage (versionné)
      /ecs                       # entités + composants légers
    /game                        # spécifique Palimpseste
      config.ts                  # constantes (résolution, palette, physique)
      /player
        controller.ts            # déplacement, saut, dash…
        ink.ts                   # ressource d'encre
        abilities.ts             # déblocage + effets (mots)
      /world
        rooms.ts                 # chargement/transition de salles
        palimpsest.ts            # logique des couches "en filigrane"
      /narrative
        dialogue.ts              # machine à états, data-driven
        npc.ts
        quests.ts
        endings.ts               # flags -> route de fin
      /enemies
        enemy.ts                 # IA machine à états
        boss_coquille.ts
        boss_errata.ts
      /ui
        hud.ts                   # jauge d'encre, lexique
        menus.ts                 # menu, pause, écrans de fin
        dialogue_box.ts
    /data
      abilities.json
      dialogues/*.json
      quests.json
      flags.json                 # définition des flags d'histoire
      rooms/*.json               # cartes Tiled exportées
    /assets
      /sprites  /tiles  /ui  /audio  /fonts

  /tests                         # ou co-localisés *.test.ts
  /build   (ou /dist)            # généré par Vite
```

---

## 4. Architecture logicielle (détail)

**Couche `engine/` — responsabilités :**
- `loop.ts` : accumulateur à pas fixe (ex. 1/60 s), sépare `update(dt)` et `render(alpha)`.
- `renderer.ts` : dessin en résolution interne basse (voir §5), scaling entier vers l'écran, gestion de calques (background / world / entities / fx / ui). Rendu pixel-perfect (`imageSmoothingEnabled = false`).
- `input.ts` : mappe touches/boutons/tactile vers des **actions** abstraites (`left`, `right`, `jump`, `dash`, `write`, `erase`, `interact`). Le jeu ne lit jamais `KeyboardEvent` directement.
- `physics.ts` : AABB, collision **swept** contre la tilemap (éviter le tunneling à grande vitesse), séparation par axe, détection sol/mur/plafond, plateformes traversables.
- `events.ts` : bus typé (`emit(type, payload)` / `on(type, handler)`), au cœur du découplage.
- `save.ts` : lecture/écriture `localStorage` avec **numéro de version de schéma** et migration/fallback si version inconnue.
- `/ecs` : entités = id + jeu de composants (Transform, Sprite, Body, Health, Controller…). ECS *léger* et pragmatique, pas de sur-ingénierie.

**Couche `game/` — points clés :**
- `player/ink.ts` : encre = ressource `current/max`, coûts par action, recharge aux encriers (points de sauvegarde). Règle sombre : à sec, écrire puise dans les PV du joueur (délavage). Fonctions pures.
- `player/abilities.ts` : chaque pouvoir = un **mot** débloquable (`BRÈCHE`, `HÂTE`, `ANCRE`, `ALES`, `POINT`…). État de déblocage persistant. L'effet est piloté par `data/abilities.json`.
- `world/palimpsest.ts` : gère les **couches en filigrane**. Chaque salle a une couche « actuelle » et une couche « dessous ». Effacer certaines tuiles marquées révèle/active la couche inférieure (nouveau passage). C'est le mécanisme de backtracking signature.
- `narrative/endings.ts` : lit les `storyFlags` + un scalaire `endingLeaning`, et route vers la fin. Fonction pure `resolveEnding(flags): 'point_final' | 'rature' | 'palimpseste'`. Testée.

**Modèle de données de sauvegarde (`save.ts`) :**
```
{
  version: number,
  unlockedAbilities: string[],   // ["write","breche","hate",...]
  visitedRooms: string[],
  storyFlags: Record<string, boolean|number>,
  endingLeaning: number,          // <0 vers RATURE, >0 vers POINT FINAL
  playerPos: { room: string, x: number, y: number },
  inkMax: number
}
```

**Schémas data-driven** (à figer tôt, ils conditionnent tout) :
- `abilities.json` : id, nom affiché, coût en encre, type d'effet, conditions de déblocage.
- `dialogues/*.json` : nœuds { id, locuteur, texte, choix[] → nœud suivant, effets (set flag / donner objet) }.
- `flags.json` : liste documentée de tous les flags d'histoire et leur effet sur `endingLeaning`.
- `rooms/*.json` : export Tiled ; calques `ground`, `filigrane` (couche du dessous), `objects` (spawns, portes, encriers, déclencheurs), propriétés custom.

---

## 5. Direction artistique & assets

> **MISE À JOUR 2026-07-06 (décision D9, voir docs/architecture.md)** : le
> style pixel art est abandonné au profit d'un rendu **vectoriel haute
> résolution dessiné au code** (« manuscrit moderne » : formes lisses, ombres
> douces, particules d'encre). La palette ci-dessous reste la référence.
> Les mentions « pixel art / 480×270 upscalé / 16×16 sprites » de cette
> section décrivent l'ancienne direction ; la grille 16 px reste valable
> comme unité de level design (physique/tilemap).

**Style : pixel art, palette « manuscrit ».** La contrainte de palette est un atout : elle est thématique, économe, et rend les assets générés par IA faciles à unifier (on recolore tout dans la palette).

- **Résolution interne** : 480×270, scaling entier vers l'écran (×2, ×3, ×4). 16:9.
- **Taille de tuile** : 16×16 px. **Sprite joueur** : ~16×24 px.
- **Palette de base** (à raffiner) :
  - Parchemin clair `#EDE4D3`, parchemin ombré `#D8CBB0`
  - Encre `#1F1B16`, sépia `#5B4A38`
  - Accent danger (encre vivante / Errata) `#C1362B`
  - Non-écrit (froid, spectral) `#CFE3E8`
- **Budget d'animation par sprite** (garder minimal) : idle, run, jump/fall, attaque, cast (écrire/effacer), hurt, fade (délavage). ~4–6 frames chacune max.
- **Police** : une police manuscrite libre (OFL) porte 30 % de l'ambiance gratuitement. À logguer dans ACKNOWLEDGEMENTS.
- **Particules** (éclaboussures d'encre, délavage) : **codées**, zéro asset.
- **HUD** : jauge d'encre en forme d'encrier, pouvoirs sous forme de « lexique » qui se remplit. Dessinés au Canvas.
- **Audio** : ambiances clairsemées, plume qui gratte, pages qui tournent. Web Audio, pas de lib.

**Sources d'assets** (par ordre de préférence) : original > CC0. Puiser dans **Kenney** et **OpenGameArt** (packs CC0) pour des bases à recolorer, **freesound / freemusicarchive** pour le son. **Chaque asset → licence notée dans `ACKNOWLEDGEMENTS.md`. Chaque prompt de génération d'asset → noté dans `prompts_logs/02_assets_prompts.md`.**

> Pour Claude Code : ne pas inventer d'URLs d'assets ni prétendre télécharger des fichiers. Générer des **placeholders programmatiques** (rectangles colorés / sprites dessinés au code dans la palette) pour que le jeu tourne, et laisser des `TODO:` clairs + une liste des assets à sourcer/créer par l'humain, avec les specs (taille, palette, frames).

---

## 6. Game design — le contenu

### Prémisse
Le monde est un **manuscrit** écrit, effacé, réécrit d'innombrables fois par un Auteur absent — *la Première Plume*. Le brouillon actuel a été abandonné en pleine phrase. Sans fin, le monde ne peut ni s'achever, ni mourir, ni devenir réel : il stagne en brouillon permanent et se délave là où l'encre manque. Ton — **mélancolique et étrange**, jamais gore : l'angoisse est existentielle et littéraire (être inachevé, savoir qu'on est fictif, les effacés qui transparaissent encore).

### Le joueur
Tu es *le Dernier Mot* écrit avant l'arrêt de la Plume : un mot orphelin cherchant la phrase qui le complèterait (et achèverait le monde).

### Verbe central
Réserve d'**encre** limitée. Deux gestes : **Écrire** (dépenser de l'encre pour rendre réel ce qui est non-écrit : plateformes, ponts, portes) et **Effacer/Raturer** (effacer le présent révèle le **brouillon d'en dessous**, qui transparaît — nouveaux passages, vérités cachées).

### Pouvoirs = mots retrouvés (progression / gating)
| Mot | Effet | Rôle Metroidvania |
|-----|-------|-------------------|
| ÉCRIRE (départ) | crée des plateformes d'encre sur emplacements « non-écrits » | traversée de base |
| BRÈCHE | efface des murs marqués → couche en filigrane | ouvre l'exploration |
| HÂTE | dash (traînée d'encre) | gaps, combat |
| ANCRE | agrippe/grimpe les murs (jeu de mots **encre/ancre**) | verticalité |
| ALES | double saut / vol plané | zones hautes |
| POINT | « point final » : achève une phrase | débloque le choix des fins |

### Zones (5 + climax), interconnectées, chacune avec sa couche en filigrane
1. **La Marge** — tuto, bord de page. Enseigne ÉCRIRE.
2. **Le Chapitre Premier** — la partie la plus « finie », petite ville, **hub** des PNJ.
3. **Les Ratures** — zone barbouillée du contenu supprimé (cimetière de persos coupés). Enseigne EFFACER/BRÈCHE.
4. **L'Annotation** — labyrinthe de notes de bas de page, dense en lore. Enseigne ANCRE.
5. **Le Brouillon** — géométrie chaotique et contradictoire. Enseigne HÂTE. Mid-boss.
6. **La Page Blanche** (climax) — frontière non-écrite ; pouvoir POINT ; les deux fins s'y jouent.

### Ennemis & boss (scope maîtrisé)
- Ennemis communs : **les Coquilles** (typos) et **les Ratures** (biffures qui cherchent à t'effacer). IA machine à états simple.
- Mid-boss : **la Coquille majuscule** (déforme la salle en la mésorthographiant ; veut juste être corrigée).
- Boss : **l'Errata** — encre rouge qui efface l'arène pour la « réparer » en la rendant blanche. Antagoniste principal.

### PNJ (obligatoires) — chacun incomplet de façon touchante
- **La Relieuse** : recoud les pages ; hub/marchande.
- **Le Personnage Secondaire** : écrit sans nom, une seule réplique en boucle ; quête = lui donner un nom et des lignes.
- **La Note de bas de page** : minuscule, connaît le lore.
- **Le Brouillon de toi-même** : version antérieure abandonnée du héros → pousse vers RATURE.
- **La Rature qui regrette** : effacé d'un vieux brouillon, à moitié délavé → pousse vers POINT FINAL / préserver.

### Les deux fins (+ 3ᵉ bonus) et logique de branche
- **LE POINT FINAL** : achever le manuscrit → le monde devient réel *et fini* ; tout se fige, complété ; l'histoire se referme (mort-accomplissement, paisible).
- **LA RATURE** : tout effacer jusqu'au parchemin vierge → libération/oubli, ou page neuve pour un autre auteur (radical, inquiétant).
- **LE PALIMPSESTE** (bonus, optionnel) : refuser les deux, garder toutes les couches vivantes dans l'inachèvement.

**Branche, peu coûteuse à produire** : les choix *écrire vs effacer* dans des moments optionnels + le PNJ-miroir soutenu font évoluer `endingLeaning`. Au dernier encrier avant le climax : choix binaire explicite. Le penchant décide si la 3ᵉ option s'ouvre. **On réutilise ~90 % de la scène finale** ; seuls le dernier plan + l'épilogue changent. `resolveEnding(flags)` est une fonction pure testée.

---

## 7. Plan de build par phases

> Règle d'or : à la fin de chaque phase, **s'arrêter, faire tourner, tester, résumer** et demander validation avant la suivante.

### Phase 0 — Fondations (→ Livrable 1)
- Init repo : structure §3, `package.json`, `tsconfig` strict, Vite, Vitest, ESLint/Prettier, `index.html`, `CLAUDE.md`.
- Rédiger `docs/architecture.md` (décisions), `docs/risk_analysis.md` (§11), squelette `feasibility_report.md`.
- Canvas qui s'affiche à la bonne résolution + scaling entier.
- **Critères d'acceptation** : `npm run dev` ouvre une page avec un canvas 480×270 mis à l'échelle ; lint + un test bidon passent ; docs présents.

### Phase 1 — Prototype vertical (→ Livrable 2)
- Boucle à pas fixe, renderer + caméra, input→actions.
- Physique : joueur qui court/saute, collisions tilemap (swept), une salle chargée depuis un JSON Tiled.
- Pouvoir **ÉCRIRE** (créer une plateforme d'encre) + jauge d'encre.
- **1 PNJ** avec dialogue data-driven.
- **1 chemin alternatif** dans la salle.
- Sauvegarde localStorage minimale.
- **Critères d'acceptation** (= minimum du brief) : perso contrôlable, collisions, 1 pouvoir débloqué, 1 dialogue PNJ, 1 chemin alternatif. Tests unitaires sur la physique et l'encre.

### Phase 2 — Verticale de jeu complète
- Tous les pouvoirs (BRÈCHE, HÂTE, ANCRE, ALES) + gating.
- Mécanique **couches en filigrane** (`palimpsest.ts`).
- Blockout des 5 zones + transitions de salles + encriers (save points).
- Ennemis communs + **1 boss** (Coquille majuscule).
- **Critères d'acceptation** : on traverse les 5 zones en enchaînant les pouvoirs ; le backtracking par effacement fonctionne ; le boss est battable ; tout est piloté par données.

### Phase 3 — Narration, fins, feel
- Tous les PNJ + quêtes ; contenu de dialogues.
- Boss **Errata**.
- **Les deux fins** + `endings.ts` + `endingLeaning` + choix final + écrans de fin.
- Audio, particules d'encre, juice (screenshake léger, feedback).
- **Critères d'acceptation** : les 2 fins sont atteignables et cohérentes avec les choix ; `resolveEnding` testée ; une run complète tient dans 1h–1h30.

### Phase 4 — Qualité, docs, build (→ Livrable final)
- Couverture de tests sur la logique pure ; playtests notés ; rapport de bugs.
- `README` (contrôles, lancement), `docs/architecture.md` finalisé, `risk_analysis.md`.
- `ACKNOWLEDGEMENTS.md` complet ; `/prompts_logs/` à jour.
- Build Vite reproductible + instructions de déploiement ; tag de version final.
- **Critères d'acceptation** : `npm run build` produit un build jouable hébergeable ; docs et logs complets ; tests verts.

---

## 8. Standards de code & qualité

- **TypeScript strict** : `strict`, `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. **Zéro `any`** non justifié.
- **Frontières de modules** : `engine/` n'importe jamais depuis `game/`. Dépendances vers l'intérieur uniquement.
- **Fonctions pures** pour toute la logique métier (collisions, encre, fins, dialogues) → faciles à tester.
- **Pas de nombres magiques** : tout dans `game/config.ts`.
- **Nommage** : clair et en cohérence (français ou anglais, mais **un seul choix**, tenu partout — recommandation : identifiants en anglais, contenu narratif en français).
- **Commentaires** utiles (le « pourquoi », pas le « quoi »). Le brief exige du code commenté.
- **Tests** (Vitest) au minimum sur : collision/physique, ressource d'encre, `resolveEnding`, machine à états des dialogues, chargement de save (migration de version).
- **Commits Git** atomiques et messages clairs (le brief note l'historique Git).
- **Accessibilité minimale** : contrôles remappables, pas de dépendance uniquement à la couleur pour une info critique.

---

## 9. `CLAUDE.md` recommandé (à créer en premier)

Contenu suggéré (Claude Code doit le lire à chaque session) :

```markdown
# Palimpseste — contexte projet (lis-moi à chaque session)

## Ce qu'on construit
Metroidvania web ~1h-1h30, thème "manuscrit vivant / palimpseste".
Voir Palimpseste_SPEC.md pour la spec complète.

## Règles techniques non négociables
- TypeScript strict, Vite, Canvas 2D. ZÉRO dépendance runtime sans justif écrite.
- Séparation engine/ (générique) vs game/ (Palimpseste). engine n'importe jamais game.
- Data-driven : niveaux (Tiled JSON), dialogues, pouvoirs, flags = fichiers /data.
- Boucle à pas de temps fixe. Logique métier en fonctions pures + tests Vitest.
- Résolution interne 480x270, tuiles 16x16, pixel-perfect (pas de lissage).

## Palette
Parchemin #EDE4D3 / #D8CBB0, encre #1F1B16, sépia #5B4A38,
danger #C1362B, non-écrit #CFE3E8.

## Process
- Travailler PHASE PAR PHASE (voir §7 de la spec). Ne pas tout coder d'un coup.
- Fin de phase : faire tourner, tester, résumer, demander validation.
- Assets manquants -> placeholders codés + TODO listés, ne pas inventer d'URLs.

## Traçabilité (noté 20%)
- Logguer les sessions dans /prompts_logs/. Licences dans ACKNOWLEDGEMENTS.md.
- Jamais de données perso sensibles.
```

---

## 10. Traçabilité IA & workflow avec Claude Code

La traçabilité pèse 20 % de la note, et ici **les prompts, ce sont tes sessions Claude Code**.

- **Sauvegarder les échanges** : à la fin de chaque session, copier le transcript (ou un résumé prompt→action→résultat) dans `/prompts_logs/03_code_prompts.md`, au format du template du sujet (Contexte / Prompt / Modèle & outil / Output / Modifications manuelles / Décision d'intégration).
- **Séparer** les logs code (`03_`), assets (`02_`), faisabilité (`01_`).
- **Traçer généré vs modifié à la main** : pour chaque intégration IA, noter ce qui a été édité manuellement.
- **Licences** : chaque asset (même CC0) et chaque modèle LLM utilisé → `ACKNOWLEDGEMENTS.md`.
- **RGPD** : aucun nom réel, email, ou donnée perso dans les prompts.
- **Conseil de workflow** : donner à Claude Code **une phase à la fois** (pas toute la spec « fais le jeu »). Le laisser proposer un plan de la phase, valider, puis l'implémenter, puis passer les tests, puis committer. Ça produit du code plus propre et des logs lisibles.

---

## 11. Risques & mitigations (pour `risk_analysis.md`)

| Risque | Prob. | Impact | Mitigation |
|--------|-------|--------|------------|
| Scope creep (jeu trop gros pour le délai) | Haute | Haut | Phases strictes ; couper le contenu, pas la propreté ; 5 zones = plafond |
| Tunneling de collision à grande vitesse | Moyenne | Moyen | Collision *swept* dès la Phase 1 + test unitaire |
| Incohérence visuelle des assets IA | Haute | Moyen | Palette imposée ; tout recoloré ; placeholders codés d'abord |
| Perte d'historique de save entre versions | Moyenne | Moyen | Schéma de save versionné + migration/fallback |
| Traçabilité IA négligée (20 % de la note) | Moyenne | Haut | Logs à chaque session ; workflow phase par phase |
| Licences d'assets non conformes | Faible | Haut | CC0/original uniquement ; `ACKNOWLEDGEMENTS.md` tenu à jour |
| Les 2 fins semblent plaquées | Moyenne | Moyen | `endingLeaning` nourri par des choix réels ; `resolveEnding` testée |
| Perf sur petites machines | Faible | Moyen | Résolution interne basse ; pas de framework ; profiler tôt |

---

*Fin de la spec. Prochaine étape : la donner à Claude Code, lui faire créer `CLAUDE.md`, puis attaquer la Phase 0.*
