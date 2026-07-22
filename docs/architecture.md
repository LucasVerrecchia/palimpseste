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

### D9 — Pivot direction artistique : « manuscrit moderne » (2026-07-06)
Décision du propriétaire du projet après playtest de la Phase 1 : abandon du
pixel art 8-bit (contrainte auto-imposée dans notre spec, PAS une exigence du
brief du cours) au profit d'un rendu **vectoriel haute résolution** dessiné au
code — direction « indie minimal » (formes lisses arrondies, ombres douces,
particules d'encre, caméra à inertie, squash & stretch).

Alternatives évaluées et rejetées : Pixi.js (dépendance runtime + rework moyen
pour un gain marginal ici) et Phaser (réécriture quasi totale, perte de
l'argument « moteur maison »). Choix retenu : Canvas 2D natif, **toujours zéro
dépendance runtime**. La palette « manuscrit » est conservée (identité
thématique). Techniquement : le canvas occupe la fenêtre à la résolution
native (devicePixelRatio), la vue reste en unités monde 480×270 (physique et
level design inchangés), et les tuiles solides sont fusionnées en dalles
arrondies par `mergeSolidTiles` (pure, testée) pour casser le look « damier ».

### D10 — Encre tracée à la souris + difficulté par l'économie (2026-07-07)
Décision du propriétaire après playtest : le pouvoir ÉCRIRE n'est plus une
matérialisation de plateformes pré-placées (touche X), mais un **tracé libre à
la souris** — le joueur dessine ses blocs d'encre (clic gauche) et les efface
(clic droit) pour **récupérer** l'encre dépensée.

Choix de conception (parmi 3 options soumises à l'humain) :
- **Trait libre rastérisé sur la grille de tuiles** (pas de pentes) : conserve
  la physique swept testée intacte ; les traits sont fusionnés en dalles
  arrondies (rendu D9) donc lisses à l'écran. Alternatives écartées : rectangle
  à glisser (moins organique), poutres à angle libre (imposait une nouvelle
  collision segment/pente — nid à bugs, risque scope).
- **Difficulté par l'encre, pas par l'adresse** : budget limité entre deux
  encriers ; franchir les deux fosses dépasse le budget → il faut effacer le
  premier pont pour financer le second (puzzle de récupération). Le délavage
  (à sec, tracer coûte des PV) reste le filet punitif.
- **Anti-softlock** : touche R = retour au dernier encrier + recharge. Bump
  `SAVE_VERSION` v1→v2 (les vieilles saves pointaient vers l'ancienne géométrie).

Détails techniques : `engine/pointer.ts` (état souris), `Renderer.screenToView`
(écran→vue, la caméra fait vue→monde), `tilesBetween` (rastérisation d'un trait
entre deux frames, pure + testée, garantie sans trou), couche d'encre mutable
dans `world/room.ts`. Le mot ÉCRIRE et le level design (`gen_room_marge01.mjs`)
ont été refaits autour de la mécanique. **Toujours zéro dépendance runtime.**

### D11 — La « déviation » : phrase-loi gravée dans le niveau (2026-07-08)
Décision de game design avec le propriétaire pour donner un **objectif narratif**
au chapitre 1. Concept : chaque chapitre porte **une phrase-loi** (la prose du
livre) gravée dans le décor. Elle décrit ce qui est *censé* arriver ; le joueur
la **dévie** avec les deux gestes qu'il connaît déjà — aucun nouveau verbe :
- **Raturer** un mot-loi (clic droit sur une barrière-canon) → penchant RATURE ;
- **Combler** un blanc ▢ d'encre (clic gauche) → penchant POINT FINAL.

Chapitre 1 « La Marge » — phrase de base : *« Le mot resta enfermé dans la marge,
et n'en sortit jamais. »* **Les obstacles SONT les mots de la phrase** (retour de
playtest : le tracé de plateformes génériques ne rendait pas le lien « écrire =
changer l'histoire ») :
- dès le départ, le mot-cage **« enfermé »** barre le couloir → le raturer est le
  premier geste concret « j'édite le texte, donc le monde change » (neutre) ;
- au choix final : raturer **« jamais »** (barrage bas) → RATURE ; ou combler le
  blanc **▢** d'encre (passerelle haute) → POINT FINAL. Chaque geste final nourrit
  `endingLeaning` (le scalaire des vraies fins, Phase 3). Deux sorties.

La phrase-loi (bandeau haut) **se recompose en une phrase entière et cohérente**
selon les choix, au lieu de rayer des mots isolément (grammaire cassée). Écrire
« toi » change le sujet impersonnel « Le mot » en « Tu » ; raturer « jamais »
inverse la fatalité. Résolveur pur `resolveSentence(variants, flags)` : la
variante satisfaite la plus spécifique gagne.

Choix de conception (parmi 3 options soumises à l'humain, option « phrase gravée
dans le décor » retenue — vs « narrateur qui commente » vs les deux) : le plus
diégétique et le plus réutilisable. Implémentation **data-driven & pure** :
- objets Tiled de type `canon` (`mode: barrier|latent`, `flag`, `leaning?`,
  `text`) → aucune logique de chapitre en dur ; `leaning` omis = geste neutre ;
- `game/narrative/deviation.ts` : fonctions pures testées (`objectTiles`,
  `isBlankFilled`, `applyLeaning`, `resolveSentence`) ;
- barrières solides et effaçables gérées dans `world/room.ts` (`registerCanonBarrier`
  / `eraseCanon`), en plus des tuiles naturelles et de l'encre du joueur ;
- variantes de phrase décrites dans `data/chapters/marge_01.json` ([proposition]).

Level design refait autour du choix (`gen_room_marge01.mjs`, 64×17) : plus de
murs abstraits — PNJ → ÉCRIRE → mot-cage « enfermé » (à raturer) → encrier →
choix (« jamais » en bas / ▢ sur passerelle haute) → 2 sorties.

Notes associées : `SAVE_VERSION` v3 (rejet des saves v2 obsolètes) ; `AUTO_RESUME`
(config) désactive la reprise auto au démarrage pendant le dev (repart au spawn) ;
boîte de dialogue à **hauteur calculée** (les choix ne chevauchent plus la
réplique). **Toujours zéro dépendance runtime.**

### D12 — Ennemis en types + fonctions pures, pas d'ECS générique (Phase 2)
D6 posait la condition : introduire un ECS « quand la variété d'ennemis le
justifiera ». La Phase 2 n'ajoute que 2 archétypes communs (Coquille, Rature)
+ 1 mi-boss (la Coquille majuscule) — un registre de composants générique
serait de la sur-ingénierie pour 3 formes. On réplique donc le pattern déjà
éprouvé par `narrative/deviation.ts`/`dialogue.ts` : des types (`Enemy`,
`BossState`) + des fonctions pures testées (`stepEnemy`, `stepBoss`,
`resolveDashHit`, `resolveBossDashHit`), sans DOM ni Canvas, dans
`game/enemies/`. `Game` ne fait qu'orchestrer (appeler, stocker le tableau,
rendre).

Combat : la spec (§6) assigne explicitement à HÂTE le rôle « gaps, combat ».
Il n'y a donc pas de bouton d'attaque séparé — dasher à travers un ennemi
commun le détruit ; le mi-boss n'accepte les dégâts que dans sa fenêtre
« vulnerable », télégraphée (cycle patrol → telegraph → vulnerable → recover),
pour éviter un combat au hasard.

### D13 — Portée de la Phase 2 : machinerie complète + 2 salles (2026-07-22)
Décision de calibrage validée avec Lucas : construire le contenu complet des
5 zones dans une seule phase aurait été un morceau de level-design
disproportionné (le sujet privilégie « petit mais irréprochable », spec
ligne 16). Cette phase livre donc la **machinerie complète et testée** —
HÂTE (dash), ANCRE (grimper), ALES (double saut/vol plané), le filigrane +
BRÈCHE, les ennemis, le mi-boss, un système de transition de salles générique
(`Game.loadRoom`) — mais seulement **2 salles connectées** : `marge_01`
(Chapitre 1, D11, inchangée narrativement) et `chapitre_01`, un blockout
**volontairement sans contenu narratif** (aucun PNJ, aucune phrase-loi —
les choix narratifs se décident avec Lucas, pas dans cette passe) qui
enchaîne dans l'ordre les 3 pouvoirs restants + le filigrane + un ennemi de
chaque sorte + le mi-boss, pour prouver la chaîne complète. Les 3 zones
restantes (L'Annotation, Le Brouillon, La Page Blanche) restent du
level-design pour une passe ultérieure, une fois la machinerie validée.

Détails techniques :
- `engine/tilemap.ts` : `ParsedMap.filigrane` (calque optionnel, même
  convention que `ground`), `filigraneGidAt`.
- `world/room.ts` : registre `breche` (Map tile→id, même idiome que les
  barrières canon) + `revealed` (Set) ; `isSolid`/`isPaintable` basculent sur
  la solidité du filigrane une fois une tuile révélée. `groundSlabs()` et
  `filigraneSlabs()` sont recalculées à chaque rendu (comme `inkSlabs`/
  `canonSlabs` déjà) plutôt que mises en cache : nécessaire puisque la
  solidité du décor change désormais en cours de partie.
- `Game.loadRoom(roomId, freshPlayer, spawnOverride?)` reconstruit salle,
  mots-loi, murs BRÈCHE, ennemis, mi-boss et texture papier, puis repositionne
  le joueur (neuf au premier chargement, préservé — vie/pouvoirs/encre — à
  chaque porte). `Game.replayRoomState()` centralise le rejeu depuis les
  flags (canon/brèche/boss/mots déjà acquis), appelé après chaque
  `loadRoom` et après une restauration de sauvegarde.
- Nouvel objet Tiled `door` (`targetRoom`, `targetX`, `targetY`), distinct de
  `exit` (réservé aux fins de chapitre, D11). `doorCooldown` (0,3 s posé par
  `loadRoom`) empêche un aller-retour immédiat si le point d'arrivée
  chevauchait la porte de destination — en plus de ça, chaque paire de portes
  vise une position décalée de quelques tuiles de la porte réceptrice.
- Le schéma de save (v3, D11) avait déjà `playerPos.room`/`visitedRooms` :
  aucune migration nécessaire, seul le loader branche désormais sur la bonne
  salle.

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

## Réalisé en Phase 2 (D12/D13, 2026-07-22)
- Pouvoirs BRÈCHE, HÂTE, ANCRE, ALES + gating dans `player/controller.ts`
  (`stepPlayer` reçoit désormais le set des pouvoirs débloqués).
- Filigrane (`engine/tilemap.ts` + `world/room.ts`) + BRÈCHE (mur effaçable
  → révèle le brouillon dessous).
- `game/enemies/` : Coquilles (patrouille), Ratures (poursuite, effacent
  l'encre du joueur au contact), mi-boss la Coquille majuscule (phases
  télégraphiées). Détruits par le dash HÂTE (rôle « combat » de la spec §6).
- Transition de salles génériques (`Game.loadRoom`, objet Tiled `door`) ;
  2 salles connectées (`marge_01`, `chapitre_01`) — voir D13 pour la portée.
- 124 tests Vitest (dash/wall-grab/double-saut, filigrane/brèche, IA des
  ennemis, phases du boss, structure des données de salle).

## À venir (Phase 2b / Phase 3)
- Level design des 3 zones restantes (L'Annotation, Le Brouillon, La Page
  Blanche) une fois la machinerie validée par Lucas (D13).
- Boss Errata, les 2 fins + `endings.ts`, contenu narratif (PNJ, dialogues) —
  à décider avec Lucas, pas en solo.
- Audio, particules, juice supplémentaire.
