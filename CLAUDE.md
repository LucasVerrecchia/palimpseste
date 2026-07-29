# Palimpseste — contexte projet (lis-moi à chaque session)

## Ce qu'on construit
Metroidvania web ~1h-1h30, thème "manuscrit vivant / palimpseste".
Voir Palimpseste_SPEC.md pour la spec complète.

## Règles techniques non négociables
- TypeScript strict, Vite, Canvas 2D. ZÉRO dépendance runtime sans justif écrite.
- Séparation engine/ (générique) vs game/ (Palimpseste). engine n'importe jamais game.
- Data-driven : niveaux (Tiled JSON), dialogues, pouvoirs, flags = fichiers /src/data.
- ÉCRIRE = tracé d'encre à la souris (clic gauche dessine, clic droit efface et
  rembourse ; décision D10). Difficulté = budget d'encre + puzzle de récupération.
  Contrôles : flèches/QD, Espace saut, E interagir, R retour encrier, souris tracer.
- Boucle à pas de temps fixe. Logique métier en fonctions pures + tests Vitest.
- Rendu VECTORIEL haute résolution « manuscrit moderne » (décision D9 du
  2026-07-06 — plus de pixel art). Vue en unités monde 480x270, tuiles 16x16
  pour la physique/level design. Formes lisses, ombres douces, particules.

## Palette
Parchemin #EDE4D3 / #D8CBB0, encre #1F1B16, sépia #5B4A38,
danger #C1362B, non-écrit #CFE3E8.

## Process
- Travailler PHASE PAR PHASE (voir §7 de la spec). Ne pas tout coder d'un coup.
- Fin de phase : faire tourner, tester, résumer, demander validation.
- Assets manquants -> placeholders codés + TODO listés, ne pas inventer d'URLs.
- Nommage : identifiants en anglais, contenu narratif en français.
- Commits Git atomiques avec messages clairs (l'historique est noté).

## Traçabilité (noté 20%)
- Logguer les sessions dans /prompts_logs/. Licences dans ACKNOWLEDGEMENTS.md.
- Jamais de données perso sensibles.

## Narration
- Le contenu narratif (dialogues, noms de PNJ, textes) se décide AVEC Lucas.
  Livrer la machinerie technique + placeholders marqués [TODO narration],
  jamais de texte final sans discussion.

## État d'avancement
- Phase 0 (fondations) : terminée le 2026-07-05.
- Phase 1 (prototype vertical) : code terminé le 2026-07-05.
- Direction artistique (D9) + encre à la souris (D10) : intégrées (07-06/07-07).
- Chapitre 1 « La Marge » — mécanique de **déviation** (D11, 2026-07-08) :
  les obstacles SONT les mots de la phrase. Mot-cage « enfermé » à raturer dès
  le départ (1er geste concret) ; au choix final, raturer « jamais » (→ RATURE)
  OU combler le blanc ▢ (→ POINT FINAL). La phrase-loi (bandeau) se recompose
  en phrase cohérente selon les choix (`resolveSentence`, variantes data). 2
  sorties, `endingLeaning` nourri. Save v3, `AUTO_RESUME` off en dev, bulle de
  dialogue à hauteur dynamique. Textes = [proposition] à valider.
  **Playtesté le 2026-07-22** : bug de superposition bandeau/jauge d'encre
  corrigé (commit `af5379e`).
- **Phase 2 (2026-07-22)** — machinerie complète + 2 salles (calibrage D13,
  validé avec Lucas — les 3 zones restantes attendent une passe de level
  design dédiée) :
  - Pouvoirs BRÈCHE (efface les murs marqués → filigrane), HÂTE (dash, Maj —
    traverse et détruit les ennemis communs), ANCRE (grimpe/glisse aux murs,
    touches haut/bas), ALES (double saut + vol plané en maintenant Espace).
  - Filigrane : `engine/tilemap.ts` (calque optionnel) + `world/room.ts`
    (solidité qui bascule une fois une tuile BRÈCHE révélée).
  - Ennemis communs (Coquilles = patrouille, Ratures = poursuite, effacent
    l'encre du joueur) + mi-boss la Coquille majuscule (phases télégraphiées
    patrol→telegraph→vulnerable→recover). Pas d'ECS générique (D12) : types +
    fonctions pures (`game/enemies/`), même pattern que `narrative/deviation.ts`.
  - Transition de salles générique (`Game.loadRoom`, objet Tiled `door`) ;
    `chapitre_01` (blockout, **sans PNJ ni texte narratif** — décision
    délibérée, la narration se décide avec Lucas) enchaîne ANCRE → ALES →
    BRÈCHE → Coquille + Rature → mi-boss.
  - 124 tests Vitest, `tsc`/`eslint`/`vite build` verts.
- **Playtest de Lucas sur chapitre_01 (2026-07-22, vidéo fournie)** — 3 retours,
  tous corrigés :
  - Porte vers chapitre_01 déplacée en fin de parcours (avant le barrage
    « jamais ») + verrouillée par un nouveau champ d'objet Tiled
    `requiresFlag` (`chapitre1_fini`) tant que le chapitre n'est pas terminé.
  - Mur ANCRE **infranchissable** : oubli des mots-pouvoir BRÈCHE/HÂTE/ANCRE/
    ALES dans `chapitre_01` (aucune façon de les débloquer). Ajoutés, chacun
    avant son obstacle.
  - **Délavage retiré** (amende la « règle sombre » de D10) : à sec, on ne
    peut plus tracer du tout (bloqué + toast), on ne pioche plus dans les PV.
    `ink.ts` simplifié (`canAfford`/`spendInk`).
  - Bonus trouvé en creusant le retour : le bandeau de la phrase-loi (D11)
    restait affiché dans `chapitre_01` — corrigé (spécifique à La Marge).
  - 125 tests Vitest, `tsc`/`eslint`/`vite build` verts.
- **Deuxième playtest (2026-07-22)** — retours supplémentaires, tous corrigés
  sauf le dernier (narratif, en attente de décision) :
  - Condition d'échec ajoutée : 0 PV → retour au dernier encrier (PV/encre
    refaits à neuf), `Game.handleDefeat()`. Les planchers à 1 PV (reliquat du
    délavage) ont été retirés des dégâts ennemis/boss.
  - Sorties de fin de chapitre : devenues de vrais murs scellés
    (`Room.registerWall`), plus des portes ouvrables qui ne menaient nulle
    part.
  - Mots-pouvoir : pictogrammes (plume, fissure, traînée, ancre, chevrons) au
    lieu d'épeler le mot — plus lisible et plus cohérent avec l'histoire.
  - Mur BRÈCHE : lézarde toujours visible (pas seulement à portée) pour se
    distinguer d'un mur normal.
  - Indice de combat pour le mi-boss + toast de fin de contenu après sa
    défaite (répond à « comment on tue le boss / on finit le niveau 2 »).
  - 127 tests, `tsc`/`eslint`/`vite build` verts.
  - **Narratif (pas encore codé)** : Lucas veut que le chapitre 2 rende
    visible le choix du chapitre 1 (RATURE/POINT FINAL) et propose un nouveau
    choix sur une nouvelle phrase-loi, en gardant les deux issues viables.
    Pistes proposées, décision à valider avec lui avant d'implémenter.
- **Troisième playtest (2026-07-22)** :
  - Bug corrigé : dasher sur le mi-boss vulnérable infligeait aussi des
    dégâts au joueur (incohérent).
  - Commandes des pouvoirs affichées partout (toast de ramassage — qui était
    câblé en dur sur ÉCRIRE, bug corrigé —, HUD, menu pause).
  - Menu pause ajouté (Échap) : recommencer le niveau / voir les pouvoirs /
    quitter.
  - Retour narratif : la mécanique « mur à casser » proposée pour le
    chapitre 2 fait doublon avec le chapitre 1. Lucas veut un **événement**
    dans le niveau 2 dont l'issue change selon la déviation choisie, menant
    au fragment de livre suivant puis au niveau suivant. Veut aussi un PNJ
    qui explique HÂTE/ALES, une phrase du livre pour indiquer comment battre
    le boss (narratif plutôt qu'un toast UI), et plus de décor/texte pour
    renforcer l'impression d'être dans un livre. **Toujours pas codé** —
    proposition en cours de discussion (voir prompts_logs, session 9/10).
- **Quatrième round — polish visuel/UX (2026-07-22)**, retours de Lucas :
  - ANCRE retiré (redondant : on pouvait déjà franchir son mur en s'y traçant
    des plateformes d'encre) ; ALES renommé AILES.
  - PV lisibles : pictogramme cœur + « PV » à côté de la jauge rouge.
  - Arène du mi-boss agrandie ; fiole d'encre rouge ajoutée en hauteur
    au-dessus (usage unique, restaure 50 % des PV max, `PLAYER.healPotionFraction`).
  - Tirets « — » retirés de tous les textes visibles (tell d'IA générative,
    retour explicite de Lucas) ; anti-spam des toasts (file d'attente avec
    écart mini, `TOAST_STAGGER_SECONDS`, au lieu d'un empilement instantané).
  - Décor narratif en arrière-plan (idées proposées et validées par Lucas
    avant codage) : silhouette derrière des barreaux sous le mot-cage
    « enfermé » (révélée une fois raturé), silhouette bras ouverts une fois
    le blanc ▢ comblé, main tenant une plume raturée dans l'arène du mi-boss.
    Un-line, palette existante, aucune n'ajoute de texte (chapitre_01 reste
    sans narration, D13).
  - 122 tests.
- **Cinquième round (2026-07-22)** :
  - Portes du chapitre 1 simplifiées : les deux "sorties" (`exit`), qui
    ressemblaient à des portes sans effet, sont supprimées. Une seule porte,
    tout au bout du parcours (après le barrage « jamais »), termine le
    chapitre et transite vers chapitre_01 en un seul geste (propriété Tiled
    `endsChapter`) ; l'issue (rature/point final) se déduit des flags déjà
    posés par le joueur, plus besoin de `requiresFlag`.
  - Encrier ajouté dans chapitre_01, avant l'arène du mi-boss.
  - Bug du dash "vulnérable" enfin isolé à la racine : l'ancien garde-fou ne
    couvrait que la frame du coup, alors que le dash reste actif plusieurs
    frames au contact du boss pendant qu'il passe en "recover" — dasher ne
    blesse désormais plus jamais le joueur (même règle que les ennemis
    communs).
  - IA du mi-boss (à la demande de Lucas) : patrouille réactive (vise le
    joueur, tout en restant dans ses bornes) + tir de bulles d'encre lentes
    et esquivables (`resolveProjectileHits`), même pattern fonctions pures
    que le reste des ennemis (D12).
  - 127 tests, `tsc`/`eslint`/`vite build` verts.
- **Sixième round (2026-07-22)** :
  - Projectiles du mi-boss omnidirectionnels (visent le joueur en x ET y, avec
    une légère anticipation sur sa vitesse) et traversent tout le décor
    intérieur (plateformes, sol) — ne disparaissent qu'en sortant des murs
    extérieurs de la salle ou en expirant (`RoomBounds`).
  - Vrais trous dans chapitre_01 : tomber dans le gouffre AILES renvoie
    désormais au dernier encrier (`Game.handleFall`, même sanction qu'à 0 PV)
    au lieu de tomber jusqu'au bord invisible de la carte sans conséquence.
  - Encrier de chapitre_01 déplacé juste après le premier mur (au lieu d'être
    collé à l'arène du mi-boss).
  - Décor narratif passé en parallaxe (`RENDERING.parallaxFactor`, 0.85) :
    les 3 illustrations défilent plus lentement que le premier plan, pour
    lire comme de l'arrière-plan plutôt que calées pile sur les objets de jeu.
  - IA du mi-boss affinée : vitesse de poursuite ondulante (jamais plus vite
    qu'avant, juste moins mécanique qu'un suivi 1:1 comme la Rature).
  - 130 tests, `tsc`/`eslint`/`vite build` verts.
- **Septième round (2026-07-22) — vrai fond en parallaxe (D14)** : jusqu'ici
  l'arrière-plan n'était que la texture papier (statique) + les 3 petites
  illustrations narratives ponctuelles (facteur 0.85, liées à un évènement).
  Retour de Lucas : il manquait un vrai décor de fond, continu, loin derrière,
  pour renforcer la profondeur — pas un élément "dans" le niveau.
  - `engine/parallax.ts` (générique, engine n'importe jamais game) :
    `tileIndicesCovering` calcule quels indices de motif tuiler pour couvrir
    tout l'écran quelle que soit la caméra ; `seededRandom` pour varier un
    motif répété sans état à stocker (même principe que `renderCrack`).
  - `game/world/backdrop.ts` : posé d'abord comme 2 motifs séparés à
    comparer (un par salle, « palimpseste fantôme » lignes d'écriture pour
    marge_01 vs « paysage d'encre » collines pour chapitre_01) — retour de
    Lucas après essai en jeu : les deux plaisent, à **combiner** plutôt qu'à
    choisir (les lignes lisent bien comme du vent au-dessus des collines).
    Fond définitif, dans toutes les salles (`resolveBackdropKind`) : 7 plans
    (facteurs 0.08 → 0.72 dans `BACKDROP`, `config.ts`), rendus juste après
    la texture papier — soleil, nuages, collines lointaines, traînées de
    vent, collines intermédiaires, arbres, oiseaux (ailes animées via
    `time`). Seed décalée par un hash de l'id de salle pour varier
    l'agencement sans dupliquer la recette.
  - Retiré à la même occasion (retour de Lucas) : les 2 illustrations
    narratives ponctuelles de marge_01 (silhouette derrière les barreaux,
    silhouette "écrite" bras ouverts) — jugées redondantes avec le nouveau
    fond. La main du mi-boss (chapitre_01) reste, non concernée.
  - 138 tests, `tsc`/`eslint`/`vite build` verts. Vérifié visuellement
    (screenshots Playwright headless) dans les deux salles.
- **Huitième round (2026-07-24)** — retouches du fond en parallaxe après
  playtest de Lucas ("globalement ça va") :
  - Arbres : houppier en amas de 3 touffes (au lieu d'un seul rond) + 2
    petites branches + touches de feuillage plus sombres, silhouette moins
    géométrique.
  - Oiseaux : légèrement plus fréquents (seuil d'apparition par tuile
    abaissé).
  - Soleil : rayons esquissés (traits radiaux irréguliers) pour coller à la
    DA "dessin".
  - 138 tests (inchangé), `tsc`/`eslint` verts.
  - Correction d'une erreur de ce journal : un PNJ existait déjà
    (`Le Signet`, `marge_01`, machine à états `narrative/dialogue.ts`
    testée) — la note précédente ("aucun PNJ n'existe encore") était fausse.
- **Neuvième round (2026-07-24) — zone 3 « Les Ratures » + PNJ adaptatif** :
  relu `Palimpseste_SPEC.md` (§6-7) avec Lucas pour cadrer la suite. Décidé
  ensemble : pas de PNJ-miroir contradictoire (« si deux PNJ racontent une
  histoire différente, ça embrouille l'esprit » — on peut parler aux deux) ;
  à la place, un PNJ **unique** dont les dialogues s'adaptent aux choix déjà
  faits par le joueur.
  - `narrative/dialogue.ts` : `DialogueEffect` devient une union
    (`set_flag` existant + nouveau `set_leaning`, réutilise `applyLeaning`
    comme les mots-loi) ; `DialogueStartVariant`/`resolveDialogueStart`
    (même principe que `resolveSentence` — la variante la plus spécifique
    dont les `when` correspondent aux storyFlags l'emporte) permet à un
    dialogue de démarrer sur un nœud différent sans dupliquer le
    personnage. `startDialogue` accepte le nœud de départ résolu. Testé.
  - `data/dialogues/pnj_ratures.json` (nouveau, [proposition] à valider) :
    **La Rature qui regrette**, personnage rayé d'un vieux brouillon. Un
    seul historique (nœud `*_histoire`, texte identique dans les 3
    branches) ; seules l'intro et la réaction changent selon
    `rature_jamais`/`nom_ecrit` (les flags réels posés dans La Marge, pas
    de nouveaux flags parallèles). Branche neutre (ni l'un ni l'autre) :
    propose encore le choix, comme Le Signet.
  - `tools/gen_room_ratures01.mjs` (nouveau) → `data/rooms/ratures_01.json` :
    zone 3 de la spec (« cimetière de persos coupés »), aucun nouveau
    pouvoir (les 4 déjà acquis), un petit gouffre AILES + un fragment de
    lore en hauteur pour rester un niveau. `gen_room_chapitre01.mjs` élargi
    (W 68→74) pour une porte après l'arène du mi-boss, jusqu'ici fin
    physique du contenu construit.
  - Toast "fin du contenu actuel" déplacé du mi-boss (désormais faux, la
    suite existe) vers la première entrée dans `ratures_01` (une seule
    fois, via `visitedRooms`) ; texte mis à jour (zones 4 à 6 restantes).
  - `backdrop.ts` : `ratures_01` ajoutée aux salles couvertes par le fond
    en parallaxe.
  - 148 tests, `tsc`/`eslint`/`vite build` verts. Vérifié visuellement
    (screenshot Chromium headless).
- **Dixième round (2026-07-26) — clarté des deux voies, reskin du mi-boss,
  arène verticale (D16)** : Lucas rejoue et remonte que les deux chemins de
  la déviation (RATURE/POINT FINAL) ne sont pas clairs. En creusant la
  géométrie de `marge_01`, le vrai problème apparaît : le blanc ▢ (POINT
  FINAL) est sur une passerelle optionnelle qu'on peut ignorer, et « jamais »
  (RATURE) — seul vrai passage obligé — peut être contourné en s'y traçant
  des plateformes d'encre par-dessus sans jamais l'effacer. Un joueur pouvait
  finir avec RATURE seul, POINT FINAL seul, aucun des deux, ou (en théorie)
  les deux. Décidé avec Lucas : s'engager dans une voie ferme désormais
  l'autre (le 3ᵉ cas "aucun des deux" reste volontairement possible — fin
  bonus PALIMPSESTE).
  - `data/abilities.json` : mot ÉCRIRE → **PLUME** (un seul champ, propage
    partout : HUD, menu pause, toast de ramassage). `pnj_marge.json` :
    reformulation de la réplique qui épelait encore "le mot ÉCRIRE".
  - Toasts de `tryRatureCanon`/`checkBlanks` (game.ts) : rendent explicite
    "tu choisis de continuer l'histoire" (POINT FINAL) / "tu choisis de
    rester en dehors de l'histoire" (RATURE) — seulement pour les déviations
    qui pèsent réellement (leaning défini), pas pour « enfermé » (neutre).
    Texte `[proposition]`.
  - `narrative/deviation.ts` : nouvelle `isDeviationLocked(exclusiveWith,
    flags)`, testée. `gen_room_marge01.mjs` : `mot_jamais`/`blanc_nom`
    gagnent une propriété `exclusiveWith` réciproque. Câblé dans
    `tryRatureCanon`/`checkBlanks` : une fois l'autre voie engagée, tenter
    l'autre déviation échoue avec un toast dédié plutôt que de s'appliquer
    silencieusement.
  - **Reskin du mi-boss** (même mécanique, mêmes stats — seule la peau
    change) : rature_jamais → on reste dans le méta, on combat **La Marge**
    ; sinon (POINT FINAL ou indécis, "jeu du récit") → un monstre de conte
    inventé, **le Troll d'Encre** (`[proposition]`, à valider/renommer).
    Nouveau `narrative/boss_flavor.ts` (`resolveBossFlavor`, même principe
    que `resolveSentence`) + `data/chapters/chapitre_01.json`
    (`bossFlavorVariants`). Branché aux 4 points qui étaient en dur : toast
    de défaite, lettre au canvas, décor d'arrière-plan de l'arène
    (`renderHandQuillDecor`/nouveau `renderCreatureDecor`), testé.
  - **Restructuration de chapitre_01** : AILES retiré (le gouffre et
    `mot_ales` disparaissent — le double-saut migre au niveau 3, hors
    scope). Salle doublée en hauteur (H 17→34, D16) pour une arène de
    mi-boss verticale — la caméra (`engine/camera.ts`) suivait déjà l'axe Y
    génériquement, jamais exercé faute de salle assez haute : aucun
    changement moteur. Nouveau mur BRÈCHE cassable **uniquement en
    hauteur** (seule la bande du haut, 17 rangées, est enregistrée comme
    `breche_wall` ; le bas reste un mur `ground` permanent) — il faut se
    tracer un escalier d'encre dans un puits pour l'atteindre. Second
    encrier ajouté avant ce puits.
  - 157 tests, `tsc`/`eslint`/`vite build` verts. Vérifié visuellement
    (screenshots Chromium headless) ; playtest interactif complet (grimper
    l'escalier d'encre, casser le mur en hauteur, voir le défilement
    vertical, affronter le boss reskinné) laissé à Lucas — pas
    scriptable sans pilote dédié pour le tracé à la souris.
- **Onzième round (2026-07-26) — playtest du dixième round, bugs corrigés** :
  - **Bug de spawn corrigé** : la porte marge_01 → chapitre_01 ciblait encore
    l'ancienne coordonnée (`targetY: 202`) d'avant le doublement de hauteur
    (D16, OFFSET=17) — le joueur atterrissait au-dessus du plafond du
    corridor, dans le vide nouvellement ajouté, au lieu du corridor
    lui-même. C'est ce que Lucas décrivait comme « on apparaît en haut du
    niveau ». `targetY` corrigé (474 = 202 + OFFSET×16).
  - **2 murs BRÈCHE « points faibles » ajoutés dans l'arène**, avec un
    premier essai de mécanique corrigé après un aller-retour sur la
    formulation exacte de Lucas (« t'as toujours pas compris ») clarifié par
    deux questions à choix : (1) le premier mur BRÈCHE (celui du puits)
    redevient un mur **simple** — entièrement cassable depuis le sol, `y`/
    `height` couvrent toute la salle, aucune grimpe obligatoire pour lui,
    fissure sur toute sa longueur comme avant le rehaussement de la salle ;
    (2) les murs de l'arène restent chacun **un seul objet BRÈCHE plein**
    (même mécanique tout-ou-rien que partout ailleurs, `room.ts` inchangé)
    mais leur fissure DESSINÉE est restreinte à une bande étroite en hauteur
    (`crackY`/`crackHeight`, propriétés Tiled lues par le nouveau
    `crackRectOf` dans `game.ts` — ne changent QUE le rendu, pas la
    mécanique) : il faut grimper jusqu'à cette bande pour voir/atteindre la
    fissure, mais casser n'importe quelle tuile de cet objet ouvre TOUT le
    mur d'un coup. Salle élargie 74→84 tuiles pour caser les deux murs avec
    une marge de sécurité après les zones de patrouille des ennemis communs
    (un mur en plein milieu d'une zone de patrouille aurait pu bloquer un
    ennemi contre lui indéfiniment) ; boss/fiole/porte décalés d'autant.
    Répond aussi au "quelque chose d'intéressant en haut, sinon on
    l'enlève" : le second mur a sa fissure près du plafond réel de la
    salle, ce qui donne un objectif au sommet de l'arène plutôt qu'un vide.
  - **Porte vers ratures_01 verrouillée tant que le mi-boss n'est pas
    vaincu** (nouveau champ Tiled `requiresFlag`, vérifié dans
    `checkDoors()` contre `storyFlags` — le flag `boss_coquille_majuscule_vaincu`
    existait déjà). Porte rendue visuellement différente (sépia pleine, pas
    la baie accueillante) tant qu'elle est verrouillée.
  - **Repère de voie persistant** (retour : « j'ai pas trop compris dans
    quel axe j'étais ») : nouvelle fonction pure `resolveLeaning` (lit
    `rature_jamais`/`nom_ecrit`), affichée dans le menu pause (Échap) —
    contrairement au toast, consultable à tout moment. Texte
    `[proposition]`.
  - **Bug latent trouvé pendant la vérification visuelle** (pas dans les
    retours de Lucas, découvert en testant) : le bandeau de la phrase-loi
    réapparaissait dans chapitre_01. La garde comparait `this.room.id` à
    `DEFAULT_ROOM_ID` (une commodité de chargement) au lieu de `'marge_01'`
    en dur — un changement de salle par défaut suffisait à casser la règle
    narrative. Corrigé.
  - 163 tests, `tsc`/`eslint`/`vite build` verts. Vérifié visuellement
    (Chromium headless, y compris avec un point de spawn temporaire pour
    voir le mur simple et la fissure étroite des murs de l'arène) ; grimper
    réellement l'escalier d'encre jusqu'aux points faibles et affronter le
    boss restent à playtester par Lucas (tracé à la souris non scriptable).
- **Douzième round (2026-07-26) — finalisation du niveau 3 « Les Ratures »**
  (session de planification dédiée, cf. session 17 où l'idée avait été mise
  de côté ; mode plan avec 3 agents Explore en parallèle sur la spec, les
  prompts_logs et l'état du code, puis question structurée à Lucas pour
  fixer le sens exact de « deux variantes » / « composition de phrase »).
  - **Bug confirmé et corrigé** : AILES (double saut) avait été retiré de
    `chapitre_01` en D16 avec la note « migre au niveau 3 », mais cette
    migration n'avait jamais été faite — aucun objet de ramassage AILES
    n'existait plus nulle part. `ratures_01` était donc infranchissable
    au-delà de son gouffre (portée du dash HÂTE ≈42px, gouffre 64px).
    Mot-pouvoir AILES ajouté dans `ratures_01`, juste avant le gouffre.
  - Salle élargie 42→64 tuiles : après le gouffre, 2 ennemis communs
    (Coquille, Rature — thème spec « cimetière de persos coupés »), puis le
    PNJ (repositionné), puis **3 fragments** à hauteur croissante (sol, saut
    simple, double saut AILES — `fragment_ratures_1/2/3`).
  - Décisions validées avec Lucas : les « deux variantes » suivent le
    penchant RATURE/POINT FINAL déjà choisi en `marge_01` (pas un nouveau
    choix indépendant) ; composer la phrase (3 fragments ramassés) **débloque
    la suite** — devient une vraie condition de progression, pas un
    événement passif.
  - Nouveau `narrative/fragments.ts` (`allFragmentsCollected`, fonction pure
    testée) : calcule le flag dérivé `ratures_phrase_composee` dans
    `checkPickups` (game.ts) une fois les 3 fragments ramassés, affiche la
    phrase (`resolveSentence`, variantes selon le penchant dans le nouveau
    `data/chapters/ratures_01.json`, textes `[TODO narration]`) en toast.
  - Porte-palier (`porte_zone4`, `requiresFlag:'ratures_phrase_composee'`)
    bouclant sur une alcôve de la même salle (pas de zone 4 à construire
    dans cette session — juste un point d'accroche propre). Nouvelle
    propriété Tiled `lockedMessage` sur les portes verrouillées : le message
    de porte close était codé en dur sur « il faut vaincre le mi-boss »,
    faux pour cette 2ᵉ porte `requiresFlag` — généralisé avec repli sur
    l'ancien texte.
  - Bug latent corrigé au passage : `replayRoomState`/`wireToasts` (game.ts)
    étaient codés en dur sur `fragment_marge` (un seul fragment supposé par
    salle) — généralisés en boucle sur `objectsOfType('fragment')`,
    nécessaire pour les 3 fragments de `ratures_01` mais corrige aussi un
    bug inoffensif jusqu'ici sur `marge_01`.
  - Le toast de fin de contenu actuel (zones 4-6 à venir) ne se déclenche
    plus automatiquement à la première entrée dans la salle : il récompense
    désormais le franchissement du palier (`finalizeRatures01Content`).
  - 172 tests (+9), `tsc`/`eslint`/`vite build` verts. Vérifié visuellement
    et interactivement (Chromium headless piloté au clavier, Playwright
    installé temporairement en local `--no-save` puis désinstallé,
    `package.json`/`package-lock.json` vérifiés inchangés) : mot AILES
    récupéré, gouffre franchi en sautant tôt + double saut + plané, 2
    ennemis rencontrés (dégâts au contact confirmés), fragments ramassés
    (toast générique), porte-palier verrouillée avec le bon message tant
    que les 3 fragments ne sont pas réunis. Collecter les 3 fragments
    jusqu'au bout et voir la porte s'ouvrir reste à confirmer par Lucas
    (le tracé/déplacement précis en jeu réel, pas scripté à la perfection).
- **Treizième round (2026-07-26) — bug des murs BRÈCHE qui perçaient le sol** :
  retour de Lucas sur `chapitre_01` : casser un mur BRÈCHE crée un trou dans
  le sol à cet endroit, où les Ratures qui poursuivent le joueur (elles
  ignorent leurs bornes de patrouille en chasse, `enemy.ts`) tombent et
  restent bloquées.
  - **Cause** : les 3 objets `breche_wall` de `chapitre_01` (`mur_breche` +
    les 2 « points faibles » de l'arène) couvraient toute la hauteur de la
    salle (`y:0, height:H*TILE`), floor inclus. `revealFiligrane` bascule
    TOUTES les tuiles enregistrées d'un mur sur le calque filigrane (vide
    dans cette salle) une fois cassé — les 3 rangées de sol sous le mur
    perdaient donc aussi leur solidité.
  - **Correctif** (`tools/gen_room_chapitre01.mjs`) : nouvelle constante
    `WALL_HEIGHT = ROW(14) * TILE`, les 3 murs BRÈCHE s'arrêtent désormais
    pile au-dessus du sol au lieu de l'englober. Le sol (bande séparée,
    toujours solide) n'est plus jamais enregistré comme BRÈCHE, donc jamais
    affecté par `revealFiligrane`, quel que soit l'état des murs.
  - Nouveau test de régression (`tilemap.test.ts`) : construit une vraie
    `Room` depuis les données réelles de `chapitre_01`, enregistre et révèle
    chaque mur BRÈCHE comme le fait `game.ts`, et vérifie que les 3 rangées
    de sol restent solides (`room.isSolid`) à la colonne de chaque mur.
    Exercise le même chemin de code que le jeu réel — vérification plus
    directe qu'une capture d'écran pour ce bug précis.
  - 173 tests (+1), `tsc`/`eslint`/`vite build` verts.
- **Quatorzième round (2026-07-26) — audit narratif complet** : Lucas demande
  de se concentrer sur la narration, l'auditer, corriger ce qui ne fait pas
  sens. Relecture de la spec §6, des deux dialogues, des phrases-loi, du
  reskin du mi-boss et de tous les toasts narratifs, croisés avec les flags
  réellement lus/écrits.
  - **Bug de fond trouvé et corrigé** : aucun dialogue n'avait de garde
    anti-répétition (contrairement aux objets ramassables) — reparler en
    boucle à un PNJ réappliquait son `set_leaning` à l'infini, permettant de
    forcer artificiellement n'importe quelle fin. `applyEffects` (game.ts)
    ignore désormais les `set_leaning` d'un nœud déjà atteint (détecté via
    son propre flag "rencontre", déjà posé dans le même lot d'effets).
  - Le choix de Le Signet (pnj_marge, "Que préfères-tu ?") posait des flags
    (`intention_rature`/`intention_point`) jamais lus par rien — corrigé en
    ajoutant `set_leaning` (±0.5), symétrique au choix équivalent de La
    Rature qui regrette.
  - `flags.json` créé (`src/data/flags.json`) : manquait depuis la Phase 2
    alors que la spec §4 l'exige explicitement (liste documentée des 15
    flags d'histoire et leur effet sur `endingLeaning`).
  - Mi-boss : nouveau `introToast` par variante (`boss_flavor.ts`,
    `data/chapters/chapitre_01.json`), affiché à l'approche de l'arène — sans
    lui, rien n'expliquait pourquoi CETTE créature précise (notamment « La
    Marge », qui réapparaît dans une salle différente de la zone qu'elle
    nomme) barre la route ici.
  - **Deuxième retour de Lucas (playtest)**, trois points :
    1. Confusion sur l'exclusivité RATURE/POINT FINAL — « au premier essai
       je pense qu'on raturerait ET on remplirait le trou ». Le dialogue de
       Le Signet disait « ou » sans dire que le premier choix ferme
       définitivement l'autre — texte renforcé pour l'expliciter avant que
       le joueur agisse.
    2. « Le truc à ramasser, on sait même pas ce que c'est » (marge_01 ET
       ratures_01) : les fragments ne montraient qu'un toast générique
       ("Fragment de page recueilli."), aucun contenu. Chaque fragment porte
       désormais son propre texte (`text`, nouvelle propriété Tiled), affiché
       au ramassage (`checkPickups`). Le fragment de marge_01 plante la
       prémisse du joueur ("le Dernier Mot", jamais nommée ailleurs en jeu,
       spec §6) ; les 3 fragments de ratures_01 sont chacun la trace d'un
       personnage coupé différent (thème "cimetière de persos coupés"). La
       phrase composée de `ratures_01.json` (restée `[TODO narration]` vide
       depuis le round précédent) est aussi rédigée : `[proposition]`.
    3. « Le niveau après reste le même peu importe mon choix » : question
       posée à Lucas (le seul reflet visible du choix dans chapitre_01 est
       le skin du mi-boss, tout à la fin — ajouter un toast d'entrée, ou
       rien pour l'instant vu que D13 est une décision déjà prise). Réponse
       de Lucas : **rien pour l'instant**, chapitre_01 reste sans texte
       narratif (D13 confirmée).
  - **Bug de rendu trouvé en vérifiant visuellement** (pas dans les retours
    de Lucas) : les toasts ne passaient jamais à la ligne (largeur non
    bornée, texte centré) — un texte un peu long débordait des deux côtés de
    l'écran, déjà visible sur des captures de la session précédente (toast
    AILES coupé). `drawToasts` (hud.ts) découpe désormais le texte en lignes
    (`wrapToastLines`, glouton mot par mot) et empile les toasts en tenant
    compte de leur hauteur réelle (plus plusieurs lignes = plus haut),
    au lieu d'un espacement fixe supposant une seule ligne.
  - Deux points identifiés mais volontairement PAS tranchés seul (règle du
    projet : narration décidée avec Lucas) : `chapitre_01` s'appelle « Le
    Chapitre Premier » comme la spec (hub des PNJ, ville) mais c'est un pur
    gauntlet mécanique sans PNJ — nom qui promet autre chose que ce qui
    existe ; et « le Dernier Mot »/« la Première Plume » (prémisse spec §6)
    restent quasi absents du texte en jeu au-delà du nouveau fragment de
    marge_01.
  - 173 tests, `tsc`/`eslint`/`vite build` verts. Vérifié visuellement
    (Chromium headless, wrap des toasts confirmé sur un texte long réel).
- **Quinzième round (2026-07-27) — mode narration (pause + machine à écrire)** :
  nouveau retour de playtest : les moments qui comptent (fragment ramassé,
  approche du mi-boss) restaient des toasts fugaces, pas assez marquants.
  - Nouveau mode `'narration'` (`Mode` type, `game.ts`), calqué sur
    `'dialogue'` : met la simulation en pause (comme un dialogue), affiche le
    texte dans un panneau identique au style dialogue mais sans locuteur ni
    choix (`drawNarrationBox`, `ui/dialogue_box.ts`), révélé progressivement
    façon machine à écrire (`NARRATION_CHARS_PER_SECOND`, `config.ts`).
    Premier appui pendant l'écriture affiche tout d'un coup (convention
    standard) ; second appui ferme et rend la main. `wrapText` réutilisé tel
    quel : redécouper seulement la portion déjà révélée retombe toujours sur
    les mêmes retours à la ligne que le texte complet (glouton, ne regarde
    jamais en avant), donc le texte ne saute pas pendant qu'il s'écrit.
  - Convertis de `toast()` à `showNarration()` : ramassage de fragment (les 4),
    phrase composée de `ratures_01`, intro et défaite du mi-boss, les deux
    déviations (raturer/combler), fin de chapitre 1. Restent des toasts
    légers (non bloquants, répétables) : pouvoirs ramassés, encrier, fiole,
    respawn, portes verrouillées, indice de combat du mi-boss, fin de
    contenu de `ratures_01` (message méta assumé, pas de la fiction).
  - Nettoyé au passage : le toast de fin de chapitre 1 gardait une trace de
    développement (« la suite arrive en Phase 2 ») qui n'a rien à faire dans
    la fiction — retiré, texte réécrit en clôture pure.
  - 173 tests (inchangé, `game.ts` non testé unitairement par convention du
    projet), `tsc`/`eslint`/`vite build` verts. Vérifié interactivement en
    Chromium headless : écriture progressive confirmée (capture mi-écriture
    vs texte complet), pause réelle confirmée (tenir une touche de
    déplacement pendant la narration ne bouge pas le joueur), fermeture et
    reprise du jeu confirmées.
  - **Retour non encore traité** : Lucas signale que le jeu "n'a pas vraiment
    d'histoire" au-delà de la méta-abstraction (mots, marge, ratures) — porte
    à concevoir une "histoire simple classique fantaisie" dont les phrases du
    joueur changent le cours. Proposition en cours de discussion avec lui
    avant toute réécriture de texte (règle du projet : narration décidée
    avec Lucas).
- Phase 2 : machinerie de pouvoirs/filigrane/ennemis/mi-boss + DA de fond +
  zone 3 (PNJ adaptatif, désormais finalisée) + zone 4 (liquide montant,
  round 28) + clarté des 2 voies + reskin du mi-boss + bugs de playtest
  terminées et corrigées. **Manquant pour la conformité au brief** : zones
  5-6 (spec en prévoit 5 + climax, 4 salles construites),
  `endings.ts`/`resolveEnding` + salle climax "La Page Blanche" + pouvoir
  POINT (2 fins obligatoires — `endingLeaning` déjà nourri par les mots-loi
  et le dialogue). Note : la spec dérive déjà de l'implémentation réelle sur
  plusieurs points (ANCRE supprimé, BRÈCHE/HÂTE enseignés en zone 2 au lieu
  des zones 3/5 prévues, zone 4 devenue un liquide montant plutôt que
  L'Annotation) — à clarifier avec Lucas avant de construire ces zones
  plutôt que suivre la spec au pied de la lettre.
- **Seizième round (2026-07-27) — la chambre des mots (« Le/La ___ devint
  ___. »)** : réponse à la demande de Lucas de rendre concret le pouvoir de
  RATURE sur le monde. Idée initiale : une salle réservée au chemin RATURE
  où composer une phrase change réellement le jeu (ex. « Le Soleil devint
  jaune » → le soleil du fond change de couleur). Redirigée en cours de
  planification (mode plan, question à Lucas) : au lieu de réserver la
  salle à un seul chemin, **la même mécanique existe sur les deux chemins**
  avec un sens différent — RATURE fait devenir la phrase réelle (le monde
  change) ; POINT FINAL/indécis fait de la même phrase le **code qui ouvre
  la porte de sortie**, sans rien changer visuellement (une phrase
  retrouvée, pas inventée). Cohérent avec le sens déjà établi la session
  précédente (RATURE = pouvoir de réécrire, POINT FINAL = achever le texte
  tel qu'écrit).
  - Nouveau module pur `game/narrative/world_transform.ts`
    (`composeTransformSentence` — accord Le/La selon le genre du sujet,
    `resolveTransformation`, `resolveWorldColor` — n'applique la couleur
    que si `rature_jamais` est vrai, sinon replie sur la couleur par
    défaut) : c'est ce dernier point, et lui seul, qui porte toute la
    différence de sens entre les deux chemins. Testé (13 cas).
  - `data/chapters/ratures_01.json` : `transformWords` (4 sujets dont
    `page`, féminin, choisie pour que l'accord Le/La se voie en jouant ; 3
    attributs) + `worldTransformations` (une seule combinaison câblée cette
    passe, `soleil`+`jaune`, portée choisie par Lucas — les autres mots
    restent des leurres cohérents avec le thème du brouillon inachevé).
  - `tools/gen_room_ratures01.mjs` : la porte-palier (`porte_zone4`, déjà
    verrouillée par `ratures_phrase_composee`) mène désormais à une vraie
    chambre (salle élargie 64→102 tuiles) au lieu d'une alcôve morte :
    pédestats `transform_word` (texte en toutes lettres, pas un
    pictogramme — la phrase doit se lire littéralement, contrairement aux
    mots-pouvoir), 2 `console` (« valider »/« annuler », clairement
    étiquetées comme demandé), et une nouvelle porte de sortie
    (`porte_fin_ratures01`) verrouillée par le flag de la transformation
    prévue — qui hérite aussi de `showsCompletionToast` (déplacé de
    `porte_zone4`, il y a désormais plus de contenu après ce palier).
  - `game.ts` : porter un mot (E, mains vides, rien n'est jamais consommé)
    → le déposer à la console de validation (rempli le slot correspondant
    à son rôle ; 2 slots pleins → résolution immédiate) → trouvée : flag
    posé sur les deux chemins + `showNarration` (texte différent selon
    `rature_jamais`) ; pas trouvée : toast léger, slots inchangés pour que
    le joueur voie ce qu'il a tenté. Console d'annulation : vide les 2
    slots. Nouveau bandeau (`drawTransformBanner`, même style que
    `drawSentenceBanner` mais composé en direct et borné à la zone de la
    chambre, pas toute la salle) affiche la phrase en cours de composition.
  - **Bug trouvé en vérifiant visuellement** (indépendant de cette
    fonctionnalité, mais qui en aurait ruiné la démonstration) : le soleil
    du fond (`world/backdrop.ts`) est positionné une fois par salle à une
    fraction de la largeur du MONDE, sans tenir compte du facteur de
    parallaxe — au-delà d'une certaine largeur de salle, cette position
    finit hors-champ pour **toute** position caméra atteignable. La salle
    élargie à 102 tuiles pour la chambre des mots a rendu le soleil
    invisible en permanence, ce qui aurait caché l'effet « le soleil
    devient jaune » que Lucas voulait précisément voir. Corrigé : la
    position tirée reste désormais dans la fenêtre garantie visible pour
    toute la plage de caméra de la salle, quelle que soit sa largeur.
  - 189 tests (+16), `tsc`/`eslint`/`vite build` verts. Vérifié de bout en
    bout en Chromium headless — mécanique entièrement au clavier (contrairement
    au tracé d'encre), donc scriptable : ramassage/portage/dépôt aux
    consoles, bandeau qui se compose en direct, couple valide → narration +
    échantillonnage de pixels confirmant le soleil doré sur RATURE contre
    sépia inchangé sur POINT FINAL (même flag posé dans les deux cas),
    couple non prévu → toast sans effet, console d'annulation → bandeau
    remis à blanc, porte de sortie déverrouillée et franchissable sur les
    deux chemins.
- **Dix-septième round (2026-07-27) — retour de Lucas sur la chambre des
  mots avant même le premier playtest réel** : les 3 fragments + PNJ qui
  précédaient la chambre faisaient doublon avec elle (« la version des
  trucs à choisir c'est mieux ») ; surtout, la porte devait devenir
  **asymétrique** : déjà ouverte sur RATURE (pas besoin de preuve, le
  pouvoir de réécrire suffit), mais nécessitant la bonne phrase sur POINT
  FINAL/indécis (comme avant). Il fallait aussi que le mécanisme soit
  **explicitement expliqué** (pas comme BRÈCHE/HÂTE, appris par pictogramme)
  — cadré par Lucas comme une arrivée devant un temple juste après le
  mi-boss, avec un PNJ qui explique.
  - Retirés : les 3 fragments (`fragment_ratures_1/2/3`), le flag dérivé
    `ratures_phrase_composee`, et le module `narrative/fragments.ts` (plus
    aucun appelant) + son test, supprimés plutôt que laissés morts.
  - La Rature qui regrette est repositionnée à l'entrée de la chambre des
    mots (au lieu d'avant les fragments) et **change de rôle** plutôt que
    d'être remplacée (choix de Lucas, AskUserQuestion) : son dialogue
    explique maintenant explicitement le mécanisme (porter un mot jusqu'à
    la console qui valide) au lieu de parler des personnages coupés — reste
    adaptatif selon `rature_jamais`/`nom_ecrit` (sur RATURE la porte est
    déjà ouverte, expliqué comme un bonus optionnel ; sur POINT
    FINAL/indécis, trouver la phrase est présenté comme nécessaire, avec un
    indice partiel — le sujet mais pas la couleur).
  - Les deux portes de la salle (`porte_zone4`, `porte_fin_ratures01`)
    fusionnent en une seule, `porte_temple` : nouvelle propriété Tiled
    générique `requiresFlagUnless`, lue par un nouveau `Game.isDoorLocked`
    (partagé entre `checkDoors` et le rendu, plutôt que dupliqué) — une
    porte `requiresFlag` reste verrouillée sauf si ce second flag est posé,
    auquel cas elle est déjà ouverte sans condition. `porte_temple` :
    `requiresFlag:'monde_soleil_jaune'`, `requiresFlagUnless:'rature_jamais'`.
  - Nouvelle narration (`showNarration`, pause + machine à écrire) à la
    toute première entrée dans `ratures_01` (`loadRoom`, gardée par
    `visitedRooms` comme le reste) : cadrage "après le combat, arrivée
    devant un temple" demandé par Lucas. [proposition]
  - Salle rétrécie 102→82 tuiles (plus besoin de l'aile "chambre séparée
    après une deuxième porte" — tout tient dans une seule zone continue
    entre les ennemis et la porte du temple).
  - 182 tests (-7, module fragments retiré avec son test), `tsc`/`eslint`/
    `vite build` verts. Revérifié entièrement en Chromium headless (serveur
    de test séparé sur un port dédié, sans toucher au serveur de dev que
    Lucas avait ouvert) : narration d'arrivée au premier chargement, porte
    déjà ouverte sur RATURE sans jamais toucher aux mots, porte verrouillée
    puis déverrouillée après résolution sur POINT FINAL, dialogue du PNJ
    correct sur les deux chemins.
- **Dix-huitième round (2026-07-27) — toutes les combinaisons de la chambre
  des mots sont câblées** : retour de Lucas, avant même le premier playtest
  réel — au lieu d'une seule combinaison valable (soleil+jaune) et 11
  leurres, les 4 sujets × 3 attributs (12 combinaisons) ont désormais
  chacun un effet réel sur RATURE.
  - `data/chapters/ratures_01.json` : `worldTransformations` passe de 1 à
    12 entrées. Convention : `target` d'une transformation == l'id de son
    sujet (soleil/personnage/ciel/page), mapping 1:1 avec l'élément visuel
    qu'il contrôle — plus simple à suivre que des noms de cible arbitraires
    (renommé `sun`→`soleil` au passage). 3 couleurs canoniques
    (jaune `#D9A441`, rouge `#C1362B`, bleu `#4A7A9E`) réutilisées à
    l'identique pour les 4 sujets plutôt que 12 teintes ad hoc.
  - **personnage** : `renderPlayer` (game.ts) recolore le corps du joueur
    ET l'ombre au sol via `resolveWorldColor('personnage', ...)` — effet
    global (toutes les salles, comme le soleil), cohérent avec le fait que
    c'est littéralement le personnage.
  - **page** : `createPaperTexture` (game.ts) accepte désormais une couleur
    de base (au lieu de `PALETTE.parchment` en dur) — recolore le
    parchemin lui-même. Piège trouvé en implémentant : la texture papier
    est peinte UNE FOIS par salle (canvas mis en cache), pas par frame ;
    sans regénération explicite après une validation réussie, le
    changement de couleur n'apparaissait qu'au prochain changement de
    salle. `resolveTransformAttempt` régénère `this.paper` immédiatement
    quand la cible validée est `page`.
  - **ciel** : nouveau — contrairement au soleil (une forme, une position),
    « le ciel » n'avait aucune existence dans le rendu. Ajout d'un voile
    atmosphérique en écran fixe (`drawSkyWash`, `world/backdrop.ts`,
    aucun défilement — un ciel n'a pas de position), à faible opacité
    (0.14) pour continuer à lire "à travers" le parchemin comme le reste
    du décor de fond.
  - Nouveau test (`world_transform.test.ts`) qui lit les vraies données de
    `ratures_01.json` : vérifie que les 12 combinaisons existent toutes
    (aucun trou), flags/couleurs distincts, et que `target === subjectId`
    partout — filet contre un futur mot ajouté sans sa transformation.
  - 185 tests (+3), `tsc`/`eslint`/`vite build` verts. Revérifié en
    Chromium headless (serveur de test séparé, sans toucher au serveur de
    Lucas) : joueur recoloré (bleu vif, visible à l'œil), voile de ciel
    visible mais discret, page fortement teintée, et confirmation qu'aucun
    des 3 nouveaux effets ne s'applique sur POINT FINAL même avec les
    flags posés (capture identique au défaut malgré 3 flags à true).
- **Dix-neuvième round (2026-07-27) — menu Admin** : avant son premier
  playtest réel de la chambre des mots, Lucas demande un moyen de choisir
  directement une salle depuis le menu pause plutôt que de rejouer tout le
  jeu à chaque test.
  - `ui/pause_menu.ts` : nouvelle vue `'admin'`, 4ᵉ option du menu
    (« Admin : aller à un niveau »), liste des 3 salles avec libellé lisible
    (`AdminRoom`), salle courante marquée « (ici) ».
  - `game.ts` : nouvelle méthode `adminGoToRoom(roomId)` — débloque tous les
    pouvoirs et refait PV/encre au max à l'arrivée (même logique que
    `restartLevel`), pour ne jamais se retrouver bloqué dans une salle qui
    suppose déjà des pouvoirs acquis (ex. le gouffre AILES de `ratures_01`).
  - 185 tests (inchangé, `game.ts`/`ui/` non testés unitairement par
    convention du projet), `tsc`/`eslint`/`vite build` verts. Vérifié en
    Chromium headless : navigation menu → Admin → liste des 3 salles →
    téléportation vers `ratures_01` confirmée (géométrie reconnaissable,
    HUD à jour), pouvoirs bien tous débloqués après coup.
- **Vingtième round (2026-07-28) — écran-titre + sauvegardes multiples** :
  Lucas demande un menu principal avant de commencer (nouvelle partie /
  charger une partie) avec plusieurs emplacements de sauvegarde. Jusqu'ici
  le jeu démarrait directement en jeu ; `AUTO_RESUME` (config, toujours
  `false` en dev) existait comme pis-aller explicitement documenté « on
  rebranchera la reprise via un menu « Continuer » plus tard » — ce round
  construit ce menu et **retire `AUTO_RESUME`**, devenu inutile (plus de
  code mort, la reprise passe désormais par un vrai choix du joueur).
  - `game/save.ts` : `SAVE_KEY` (un seul emplacement) remplacé par
    `saveKey(slot)` + `SAVE_SLOT_COUNT = 3` — chaque emplacement est une
    clé localStorage indépendante (`palimpseste_save_1/2/3`), aucun
    changement à `engine/save.ts` (déjà générique sur la clé) ni à
    `SaveData`/`parseSave` (schéma inchangé).
  - Nouveau module pur d'affichage `game/ui/title_menu.ts` (même principe
    que `pause_menu.ts`, aucune logique dedans) : écran « Palimpseste »
    avec 2 options (Nouvelle partie / Charger une partie), puis une liste
    des 3 emplacements — vides (« vide », grisé) ou occupés (résumé
    compact : salle · voie narrative · pouvoirs trouvés, ex. « La Marge ·
    indécis · 0/4 »). En mode « Charger », les emplacements vides sont
    grisés et ignorés à la sélection. En mode « Nouvelle partie », choisir
    un emplacement déjà occupé affiche un avertissement (« Rappuie sur E
    pour écraser cette sauvegarde ») au lieu d'écraser directement — il
    faut confirmer d'un second appui (même vocabulaire d'interaction que
    `showNarration`, où un premier appui accélère et un second ferme).
  - `game.ts` : nouveau mode `'title'` (state machine `Mode`), premier mode
    au démarrage. `update()` court-circuite entièrement la simulation dans
    ce mode (comme `'paused'`). Nouvelle méthode `beginGame(slot, save)` —
    remet à zéro tout l'état de session qui ne fait pas partie du schéma
    de sauvegarde (pouvoirs, flags, salles visitées, mot porté à la
    chambre des mots, indices « déjà vu » du mi-boss, messages en
    attente) avant d'appliquer soit rien (nouvelle partie), soit les
    données du save choisi — pour qu'une partie chargée dans le même
    onglet ne garde jamais une miette de la précédente. Sauvegarde
    immédiate après démarrage (`persist()`), pour qu'un emplacement tout
    juste choisi apparaisse « occupé » dès le retour au menu, même avant
    le premier encrier.
  - `quitGame()` (option « Quitter » du menu pause) : ne recharge plus la
    page (c'était un pis-aller documenté « pas d'écran-titre pour
    l'instant ») — retourne maintenant proprement à l'écran-titre, partie
    déjà sauvegardée sur son emplacement.
  - Petit accroc de lint en cours de route : `delete this.storyFlags[key]`
    (vidage de l'objet de flags à la remise à zéro) déclenche
    `no-dynamic-delete`. Plutôt que désactiver la règle, `storyFlags` est
    passé de `readonly` à réassignable (`this.storyFlags = {}`) — rien
    n'exploitait la stabilité de la référence, seul le contenu était lu.
  - 188 tests (+3, `saveKey`/`SAVE_SLOT_COUNT` dans `tests/save.test.ts`),
    `tsc`/`eslint`/`vite build` verts. Vérifié en Chromium headless
    (serveur de test isolé sur le port 5184, serveur de Lucas sur 5173
    non affecté) : écran-titre au chargement, liste des emplacements vide
    au départ, nouvelle partie sur un emplacement vide démarre
    immédiatement et sauvegarde aussitôt, Quitter (menu pause) revient à
    l'écran-titre sans reload, l'emplacement réapparaît occupé avec le bon
    résumé dans « Charger une partie », le chargement reprend bien la
    partie, et retenter « Nouvelle partie » sur cet emplacement affiche
    l'avertissement d'écrasement puis s'exécute au second appui.
- **Vingt-et-unième round (2026-07-28) — clic souris dans les menus** :
  Lucas demande qu'en plus de E/Espace, on puisse cliquer directement sur
  une option au lieu de naviguer au clavier — « comme dans les vrais
  jeux ». Couvre l'écran-titre, le menu pause (principal + admin + retour
  depuis « Pouvoirs »), les choix de dialogue, et l'avance des boîtes de
  narration/dialogue sans choix. Le tracé d'encre (souris, D10) n'est pas
  concerné — reste un système séparé.
  - `engine/pointer.ts` : `Pointer` gagne un front montant `leftClicked`
    (mousedown qui n'était pas déjà tenu) + `endFrame()` (même principe que
    `Input.wasPressed`/`endFrame`) — jusqu'ici seul l'état "maintenu"
    (`drawing`/`erasing`, pour le tracé) existait, pas de détection de
    "clic" ponctuel. `mousedown` marque aussi `inside = true` (avant, seul
    `mousemove` le faisait — un clic sans mouvement de souris préalable
    aurait été ignoré par le survol des menus).
  - `game.ts` : nouveau `mouseView()` — position souris en coordonnées vue
    (480×270) via `viewport.screenToView`, `null` tant que la souris n'est
    pas entrée sur le canvas. Appelé dans `updateTitleMenu`,
    `updatePauseMenu`, `updateDialogue`, `updateNarration` : survoler une
    option la sélectionne (même variable `selected` que la navigation
    clavier, donc même surbrillance) ; cliquer dessus déclenche
    immédiatement la même action qu'un appui sur E/Espace (un seul clic
    sélectionne ET valide, pas de double étape). `activateTitleMainOption`/
    `activateTitleSlot`/`activatePauseMenuOption`/`confirmDialogue`
    extraits pour être appelés à l'identique par le clavier et la souris
    (une seule logique d'activation, deux déclencheurs).
  - `ui/title_menu.ts`/`ui/pause_menu.ts` : nouvelles fonctions pures
    `hitTestTitleMain`/`hitTestTitleSlots`/`hitTestPauseMenu`/
    `hitTestPauseAdmin`, géométrie des lignes dupliquée de leurs fonctions
    `draw*` respectives (bande cliquable généreuse — toute la largeur du
    panneau — plutôt que calée sur la largeur du texte, cible plus
    confortable). Vue « Pouvoirs » du menu pause (liste passive, pas
    d'options) et boîte de narration : pas de géométrie dédiée, un clic
    n'importe où sur la zone fait juste ce que fait E ("retour" / avancer),
    donc pas besoin de hit-test.
  - `ui/dialogue_box.ts` : cas à part — la position des lignes de choix
    dépend du nombre de lignes du texte du PNJ AU-DESSUS, lui-même
    dépendant de `ctx.measureText` (retour à la ligne glouton), donc pas
    calculable sans contexte canvas. `drawDialogueBox` retourne désormais
    un `DialogueLayout` (zones cliquables des choix) en plus de dessiner ;
    `game.ts` le met en cache (`this.dialogueLayout`, recalculé à chaque
    `render()`) et le consulte au tour suivant dans `updateDialogue` — léger
    décalage d'une frame entre affichage et interactivité, imperceptible
    (aucun humain ne clique dans les ~16 ms où un dialogue vient de
    s'ouvrir).
  - 188 tests (inchangé, `game.ts`/`ui/`/`engine/pointer.ts` non testés
    unitairement par convention du projet — DOM/canvas, pas de logique
    pure), `tsc`/`eslint`/`vite build` verts. Vérifié en Chromium headless
    (serveur de test isolé sur le port 5185, serveur de Lucas sur 5173 non
    affecté), entièrement à la souris (aucune touche clavier sauf pour
    marcher jusqu'au PNJ) : clic sur « Nouvelle partie » → clic sur un
    emplacement → en jeu ; survol d'un choix de dialogue (Le Signet) qui
    suit la souris puis clic qui le valide et fait avancer le dialogue ;
    clic sur « Voir les pouvoirs » puis clic n'importe où pour revenir au
    menu pause ; clic sur « Admin » puis clic sur une salle → téléportation
    confirmée (HUD à jour).
- **Vingt-deuxième round (2026-07-28) — la sauvegarde se choisit à la
  sauvegarde, pas à la création ; refonte du niveau 1** : deux retours de
  Lucas, avant tout playtest du round précédent.
  - **Logique de sauvegarde inversée** : « on ne peut pas sauvegarder en
    jeu » + « si je fais Nouvelle partie je ne choisis pas d'emplacement,
    c'est seulement au moment de sauvegarder/charger ». `game/ui/slot_list.ts`
    (nouveau) extrait la liste des 3 emplacements (déjà écrite pour
    l'écran-titre) en module partagé, réutilisé par le menu pause.
    `title_menu.ts` simplifié : « Nouvelle partie » démarre directement
    (`beginGame(null, null)`, aucun emplacement lié) ; seule « Charger une
    partie » montre encore une liste (lecture seule, pas de risque
    d'écrasement). Le menu pause gagne une 5ᵉ option « Sauvegarder » (vue
    `'save'`) : choisir un emplacement (avec le même avertissement
    d'écrasement qu'avant) écrit la partie dessus et la lie
    (`this.currentSlot`) pour la suite de la session.
  - `persist(reason)` : `game_saved` porte maintenant une raison
    (`'inkwell' | 'door' | 'manual' | 'auto'`, `events.ts`) — sauvegarder
    depuis le menu pause affichait à tort le toast de l'encrier. Toucher un
    encrier sans emplacement lié (partie neuve jamais sauvegardée) affiche
    désormais un indice dédié (« Repère posé. Échap puis Sauvegarder pour
    garder ta progression. ») au lieu de rester silencieux ; une fois un
    emplacement lié (sauvegarde manuelle ou partie chargée), les encriers
    reprennent l'autosave normal vers ce même emplacement.
  - 190 tests (inchangé sur ce point, save.test.ts déjà couvrait `saveKey`),
    `tsc`/`eslint`/`vite build` verts.
  - **Refonte du niveau 1 « La Marge »** (demande de Lucas, « on repart
    presque de 0 en termes d'agencement ») :
    - Nouvelle phrase-loi : « Un enfant qui avait soif d'aventure. »
      remplace « Le mot resta enfermé... ». Raturer « enfant » → RATURE
      (remplace l'ancien mot « jamais ») ; dessiner un point «. » à la fin
      de la phrase avec la plume → POINT FINAL (remplace l'ancien blanc
      ▢ « toi ») — jeu de mots assumé avec « point final ». L'ancien
      mot-cage neutre « enfermé » (geste d'essai sans enjeu) disparaît : le
      PNJ explique tout AVANT que le joueur agisse, donc plus besoin d'un
      geste d'essai séparé. Les flags restent nommés `rature_jamais`/
      `nom_ecrit` (inchangés) : trop d'autres systèmes les lisent par leur
      nom exact (resolveLeaning, boss_flavor, world_transform, pnj_ratures)
      pour justifier un renommage — seul le mot/geste qui les pose a changé.
    - `tools/gen_room_marge01.mjs` réécrit : le niveau s'ouvre sur un petit
      parcours SANS pouvoir (un trou à sauter, un muret de 2 tuiles à
      franchir) qui mène derrière un mur, où attendent ensemble la PLUME
      et le PNJ — avant, le PNJ était rencontré en premier et la plume
      trouvée plus loin séparément. « Il était une fois... » : nouveau
      décor purement visuel (`renderMargeIntroDecor`, game.ts, texte
      sépia à faible opacité dans le même passage en parallaxe que la main
      du mi-boss) visible pendant ce parcours — PAS la phrase-loi
      interactive, un simple horizon de fond qui plante le ton.
    - `data/dialogues/pnj_marge.json` réécrit : plus de nœud à choix (les
      anciens `intention_rature`/`intention_point`/`pnj_marge_rencontre`
      disparaissent avec lui, plus besoin de garde anti-répétition ici —
      le penchant vient uniquement des gestes physiques dans le monde,
      comme le reste du chapitre). Le PNJ explique maintenant, dans l'ordre,
      le pouvoir de la plume PUIS la règle des deux voies, avant que le
      joueur touche à quoi que ce soit ; `startVariants` conservées pour
      une réaction courte si on reparle à Le Signet après avoir choisi.
    - `data/flags.json` : entrées `efface_enferme`/`intention_rature`/
      `intention_point`/`pnj_marge_rencontre` retirées (obsolètes) ;
      `rature_jamais`/`nom_ecrit` documentent leur nouveau déclencheur.
    - `tests/tilemap.test.ts` : bloc `marge_01` entièrement réécrit contre
      les données réelles régénérées (60×17, trou d'intro, muret, plume+PNJ
      groupés, un seul mot-loi + son blanc).
    - 190 tests (+2), `tsc`/`eslint`/`vite build` verts. Vérifié en
      Chromium headless (serveur isolé port 5186, serveur de Lucas sur
      5173 non affecté) : « Nouvelle partie » démarre directement (pas de
      sélection d'emplacement), trou et muret franchissables au clavier
      (saut tenu, pas un simple appui — un appui bref écourte le saut via
      `releasedRiseGravityFactor` et ne suffit pas à passer le muret),
      « Il était une fois... » et la phrase-loi visibles simultanément,
      PLUME + PNJ groupés, les 4 répliques du PNJ conformes au texte
      prévu, indice d'encrier sans emplacement lié confirmé, rature de
      « enfant » à la souris (clic droit) confirmée de bout en bout : le
      mur disparaît, le bandeau passe à « Pas d'enfant, pas d'histoire —
      la marge reste à toi. », la narration affiche le bon texte. Flux
      Sauvegarder (emplacement vide → sauvegarde immédiate, toast dédié,
      emplacement occupé → avertissement puis écrasement au second appui)
      revérifié dans ce même état de code. Non testé par script (tracé
      d'encre en remplissage, pas juste un clic — laissé au playtest de
      Lucas comme toujours) : combler le point avec de l'encre pour
      POINT FINAL — mécanisme inchangé depuis l'ancien design (même
      `checkBlanks`/`isBlankFilled`), déjà exercé par les tests unitaires.
- **Vingt-troisième round (2026-07-28) — retours avant le premier vrai
  playtest, plus la nuit et l'enfant sur la colline** : plusieurs corrections
  ciblées, une règle d'écriture à ne plus jamais enfreindre, et une nouvelle
  scène narrative substantielle.
  - **Plus aucun tiret (—/--) nulle part** : retour de Lucas, déjà demandé
    une fois au round 4 (2026-07-22) mais réapparu dans tout le texte écrit
    depuis (dialogues, toasts, narration, en-têtes de menu). Sweep complet
    du texte joueur (`pnj_marge.json`, `pnj_ratures.json`,
    `chapters/marge_01.json`, `chapters/chapitre_01.json`, toasts/narrations
    de `game.ts`, en-têtes `pause_menu.ts`/`slot_list.ts`) : tous reformulés
    sans tiret. Règle sauvegardée en mémoire persistante (feedback,
    `feedback_no_dashes.md`) pour ne plus la perdre entre les sessions.
  - **`restartLevel()` corrigé** : « Recommencer le niveau » repositionnait
    le joueur au spawn mais laissait `rature_jamais`/`nom_ecrit` figés pour
    de bon (le mot-loi restait raturé/le blanc rempli), donc « ne
    réinitialisait pas vraiment » un niveau qui EST ce choix. Remet
    désormais à `false` les flags des objets canon de la salle courante
    avant de recharger (`storyFlags[flag] = false`, pas `delete`, pour
    éviter `no-dynamic-delete` : `=== true` partout où ces flags sont lus
    traite les deux de façon identique).
  - **Parcours d'intro rallongé** (approche du trou puis du muret, chacune
    un peu plus longue) et **PNJ rencontré avant la plume** (inversé, la
    plume est trouvée juste après lui désormais) : salle regénérée 60×66
    tuiles, tous les objets en aval décalés d'autant.
    `tools/gen_room_marge01.mjs`, `tests/tilemap.test.ts` mis à jour.
  - **Nouvelle phrase RATURE** : « Un mot qui avait soif de liberté. »
    remplace « Pas d'enfant, pas d'histoire, la marge reste à toi. »
    (`data/chapters/marge_01.json`).
  - **Décor de nuit** (marge_01 uniquement, `world/backdrop.ts`) : voile
    sombre (`PALETTE.ink` à forte opacité, nouveau `BACKDROP.nightWashAlpha`)
    à la place du voile "ciel" normal, `drawSun` gagne un mode `moon` (disque
    plein sans rayons, une lune n'en a pas, plus un arc plus sombre pour un
    peu de relief) recoloré en `PALETTE.unwritten`, nouveau plan tuilé
    d'étoiles éparses. Aucune couleur inventée : tout vient de la palette
    existante (règle du projet, config.ts). `isNightRoom(roomId)`, même
    principe que `resolveBackdropKind`, pour rester extensible à d'autres
    salles plus tard.
  - **L'enfant sur la colline** (demande de Lucas) : silhouette assise qui
    regarde la lune tant que la phrase n'a pas changé ; s'évapore
    (lentement, avec quelques points qui dérivent vers le haut façon buée)
    sur la voie RATURE ; descend la colline et se superpose à une deuxième
    colline plus proche jusqu'à disparaître dessus sur la voie POINT FINAL.
    Nouveau `renderMargeChildDecor`/`drawSceneHill`/`drawMargeChildFigure`
    (game.ts, même passe en parallaxe que "Il était une fois"), état
    `marge01ChildState` (`watching`/`evaporating`/`walking`/`gone`)
    déclenché une seule fois par `triggerMargeChildScene` (appelée depuis
    `applyDeviation`, le point de passage unique où `rature_jamais`/
    `nom_ecrit` deviennent vrais), animée sans mutation supplémentaire en
    calculant la progression depuis `this.time - marge01ChildTriggerTime`
    à chaque frame. `loadRoom` réinitialise cet état depuis les flags à
    chaque chargement de la salle : `gone` direct (pas de ré-animation) si
    déjà résolu avant ce chargement (sauvegarde chargée, Admin), `watching`
    sinon, ce qui fait aussi que « Recommencer le niveau » (qui vient de
    remettre ces flags à `false`) fait réapparaître l'enfant. Durées dans
    `MARGE_CHILD_SCENE` (config.ts), pas de nombre magique.
  - **Bug trouvé en vérifiant visuellement** (pas dans les retours de
    Lucas) : la colline de l'enfant était positionnée trop près du mot-loi
    « enfant » en coordonnées monde. Cette colline défile en parallaxe
    (facteur 0.85) alors que la barrière est au premier plan (facteur 1) ;
    en s'approchant de la barrière, les deux positions à l'écran finissaient
    par converger et la dalle opaque de la barrière (dessinée après, donc
    par-dessus) masquait complètement la silhouette, systématiquement au
    moment précis où le joueur s'apprêtait à raturer. Repositionné avec une
    marge de sécurité calculée pour rester séparé même une fois le joueur
    arrivé au mot-loi.
  - **Texte du mi-boss de chapitre_01 retouché** (`bossFlavorVariants`,
    `data/chapters/chapitre_01.json`) : sur la voie POINT FINAL/indécise, le
    joueur est devenu l'enfant de la phrase de marge_01 (plus le mot qu'il
    était), et c'est cet enfant qui choisit de se battre contre le troll
    (introToast/defeatToast reformulés en ce sens). Sur RATURE, narration
    inchangée sur le fond (un mot qui affronte La Marge elle-même) ; texte
    reformulé sans tiret par la même occasion.
  - 190 tests (inchangé sur ce round, changements de contenu/rendu non
    testés unitairement par convention), `tsc`/`eslint`/`vite build` verts.
    Vérifié en Chromium headless (serveur isolé port 5187, serveur de Lucas
    sur 5173 non affecté) : parcours d'intro rallongé franchi (saut du trou
    puis du muret, nécessite un saut TENU pour la pleine hauteur, un appui
    bref écourte le saut via `releasedRiseGravityFactor` et ne suffit pas à
    passer le muret désormais plus large), PNJ avant la plume confirmé
    visuellement, décor de nuit confirmé (lune, étoiles, voile sombre),
    enfant visible sur sa colline puis évaporation confirmée en 3 captures
    successives (visible → visiblement estompé → totalement disparu, ~3,5 s
    après la rature) avec le bandeau passant bien à « Un mot qui avait soif
    de liberté. » et la narration au texte sans tiret. `restartLevel()`
    revu par lecture de code plutôt que reproduit en headless (interaction
    délicate à scripter proprement à cause de la narration qui bloque
    Échap le temps de s'afficher) ; la mécanique sous-jacente
    (`replayRoomState` piloté par les flags) est déjà éprouvée par ailleurs
    dans le projet. La voie POINT FINAL (remplir le blanc à l'encre, marche
    de l'enfant) reste, comme toujours, un tracé à la souris non scriptable
    et donc laissée au playtest de Lucas.
- **Vingt-quatrième round (2026-07-28) — l'enfant en stickman animé, départ
  derrière une colline sur les deux voies** : retour de Lucas sur la
  silhouette de la session précédente, avant même son premier playtest :
  la silhouette pleine (ellipse + cercle) ne « bougeait » pas assez, et son
  évaporation sur place (RATURE) ne se lisait pas comme un vrai départ ;
  il voulait un « stickman » animé qui disparaît derrière une colline
  plutôt que de s'évaporer sur place.
  - `drawMargeChildFigure` réécrite en silhouette articulée tracée au
    trait (tête, colonne, jambes, bras — `ctx.stroke`, plus `ctx.fill`
    d'une ellipse) : pose `sit` (genoux relevés, léger balancement idle
    piloté par `MARGE_CHILD_SCENE.idleSwayAmplitude/idleSwayHz` et
    `this.time`, pour rester visiblement vivant même immobile) et pose
    `walk` (jambes/bras en balancier opposé, cycle piloté par
    `walkCycleHz`).
  - **RATURE ne fait plus « évaporer » l'enfant sur place** : les 4 états
    (`watching`/`leavingRature`/`leavingPoint`/`gone`, renommés depuis
    `evaporating`/`walking` pour ne plus mentir sur ce qu'ils font)
    déclenchent désormais tous les deux une marche. Nouvelle colline
    `hill0` (symétrique de `hill2`, à gauche de la colline de départ) :
    RATURE marche vers la GAUCHE (retour en arrière, cohérent avec
    « on efface ») et disparaît derrière `hill0` ; POINT FINAL marche vers
    la DROITE comme avant (l'histoire continue) et disparaît derrière
    `hill2`. Les deux collines de destination restent dessinées APRÈS la
    silhouette (occlusion progressive par superposition), plus un fondu
    sur le dernier `fadeOutStart` (80 %) de la marche pour que la
    disparition finale ne soit jamais un pop instantané même si le
    chevauchement seul ne suffit pas. L'ancien effet de buée (particules
    de points dérivants) est retiré : il n'a plus de sens une fois que
    l'enfant marche au lieu de s'évaporer.
  - `config.ts` : `MARGE_CHILD_SCENE` perd `evaporateSeconds` (plus
    utilisé), gagne `idleSwayAmplitude`/`idleSwayHz`/`walkCycleHz`/
    `fadeOutStart` — toutes les constantes d'animation restent hors code,
    comme l'exige la règle du projet.
  - `seededRandom` (`engine/parallax.ts`) n'était plus importé que pour
    l'ancien effet de buée : import retiré de `game.ts` (aurait été un
    import mort, détecté par relecture avant même que `eslint` ne le
    signale).
  - 190 tests (inchangé, changements de rendu non testés unitairement par
    convention), `tsc`/`eslint`/`vite build` verts. Vérifié en Chromium
    headless (serveur isolé port 5188, serveur de Lucas sur 5173 non
    affecté, Playwright réinstallé temporairement `--no-save` puis
    désinstallé) : stickman confirmé visible et articulé (tête, tronc,
    jambes pliées) assis sur la colline, léger balancement idle confirmé
    entre deux captures espacées de 1,5 s, parcours d'intro et rature du
    mot-loi « enfant » rejoués intégralement au clavier, puis la marche
    vers la gauche capturée sur 4 images successives (position de départ
    → mi-parcours plus à gauche → disparu vers/derrière `hill0` → état
    stable sans réapparition ni artefact à t largement après
    `walkSeconds`). La voie POINT FINAL (marche vers `hill2`) partage
    exactement le même code (`drawMargeChildFigure`/logique de marche),
    seule la destination et le sens changent : non rejouée en direct
    (aurait exigé de grimper à la passerelle à l'encre pour combler le
    blanc, tracé à la souris non scriptable comme toujours) mais déjà
    confiante par symétrie de code et parce que la direction « vers
    `hill2` » est la même que l'ancien comportement déjà vérifié
    visuellement par le passé.
- **Vingt-cinquième round (2026-07-28) — combat contre le Troll d'Encre en
  arrière-plan, bug de la chambre des mots corrigé, petites retouches de
  lisibilité** : cinq retours de Lucas.
  - **Décor de l'arène du mi-boss (voie POINT FINAL/indécis)** : l'ancien
    museau statique (cornes + mâchoire, fixe, sans lien avec le combat)
    devient une vraie scène animée. `renderCreatureDecor` gagne un état
    (`fighting`/`defeated`/`gone`, même principe que `marge01ChildState`) :
    pendant le combat, l'enfant armé (épée, bouclier — nouveau
    `drawArenaChild`, même vocabulaire de silhouette articulée que
    `drawMargeChildFigure`) et le Troll d'Encre (nouveau `drawTroll` : corps
    ovale à touffes de poil, deux bras épais qui se balancent, tête reprise
    de l'ancien décor statique) échangent des coups mimés en boucle
    (balancement continu, symbolique — ne suit pas les phases réelles du
    mi-boss, comme l'ancien décor). Dès que le VRAI mi-boss meurt
    (`updateBoss`, transition vers `boss.phase === 'defeated'`), nouveau
    `triggerTrollDefeatScene()` (uniquement si le décor résolu n'est PAS
    "La Marge" — RATURE garde son décor inchangé, demande explicite de
    Lucas) : le troll s'efface (fondu sur le premier tiers), l'enfant lève
    l'épée en célébration (petit rebond), puis marche vers la droite et
    sort du cadre (même schéma fondu + disparition que `MARGE_CHILD_SCENE`,
    nouveau groupe de constantes `CHAPITRE1_ARENA_SCENE`, config.ts).
    `loadRoom` réinitialise l'état à `gone` si le flag de victoire est déjà
    posé (sauvegarde chargée, Admin), comme pour l'enfant de marge_01.
  - **Bug corrigé : recolorier un sujet à la chambre des mots
    (`ratures_01`) ne marchait qu'une fois** — retour de Lucas : « soleil
    jaune » fonctionnait, mais recolorier ensuite en bleu (ou en rouge) ne
    changeait plus rien. Cause : `resolveWorldColor` prend le PREMIER flag
    vrai qu'il trouve pour une cible (`.find()`), et aucun code n'effaçait
    jamais un flag `monde_<sujet>_<attribut>` une fois posé — le premier
    attribut validé gagnait donc pour toujours. `resolveTransformAttempt`
    (game.ts) efface désormais les flags des AUTRES attributs du même sujet
    à chaque nouvelle validation (un seul actif à la fois par sujet).
  - **Effet de bord corrigé au passage** : ce nettoyage aurait pu
    reverrouiller `porte_temple` si le joueur recoloriait le soleil
    autrement après avoir trouvé « soleil jaune » (la porte dépendait
    directement de `monde_soleil_jaune`). Nouveau flag séparé et permanent
    `temple_code_trouve`, posé EN PLUS de `monde_soleil_jaune` la première
    fois que cette combinaison précise est validée, jamais effacé ensuite ;
    `porte_temple.requiresFlag` pointe désormais vers lui plutôt que vers
    `monde_soleil_jaune` (`tools/gen_room_ratures01.mjs`, régénéré ;
    `tests/tilemap.test.ts` mis à jour ; `flags.json` documente les deux
    flags, remplace l'ancienne entrée qui ne couvrait que `monde_soleil_jaune`
    sur les 12 combinaisons existantes).
  - **Page moins saturée quand recoloriée** : `createPaperTexture` peignait
    la couleur choisie en plein (`fillRect` opaque), ce qui rendait la page
    trop contrastée/pas "jolie" (retour de Lucas) pour une couleur vive
    comme le rouge ou le bleu. Peint désormais le parchemin normal PUIS une
    teinte semi-transparente par-dessus (`PAGE_TRANSFORM_TINT_ALPHA = 0.35`,
    config.ts) — la couleur choisie se lit comme une teinte du papier, pas
    un aplat.
  - **« Il était une fois » plus clair** : sépia à 22 % d'opacité, illisible
    depuis que marge_01 est une salle de nuit (session précédente). Passé à
    `PALETTE.unwritten` (même famille que la lune/les étoiles) à 40 %.
  - **L'enfant regarde la lune, pas le fragment** : posture assise
    (`drawMargeChildFigure`, pose `sit`) tournée vers la DROITE par défaut
    (genoux/bras pliés vers `hipX + 6`) — sans lien avec la position réelle
    de la lune (toujours à gauche de l'écran dans cette scène, facteur de
    parallaxe très lent) ni celle du fragment de lore ramassable (à droite,
    sur la passerelle), la posture se lisait comme tournée vers le
    fragment. Genoux/bras inversés vers la GAUCHE (`hipX - 6`) pour
    correspondre à la direction réelle de la lune.
  - **Écran-titre : fond dédié au lieu du niveau 1 en arrière-plan** :
    `render()` affichait déjà toute la géométrie de `marge_01` (murs, PNJ,
    mot-loi, joueur...) derrière le voile translucide du menu, faute de
    garde — juste "un niveau en arrière-plan", pas très joli (retour de
    Lucas). Les calques de gameplay (motes, dalles, encre, canon, brèche,
    objets, ennemis, boss, joueur, particules, curseur, bandeaux, HUD,
    toasts) et le décor narratif ponctuel (`renderParallaxDecor` — l'enfant
    sur la colline, "Il était une fois"...) sont désormais gardés par
    `this.mode !== 'title'` ; seuls le parchemin et le fond atmosphérique
    générique (`renderBackdrop` : soleil/lune, collines, oiseaux...)
    restent visibles derrière le menu, quelle que soit la salle chargée.
  - 190 tests (inchangé, changements de rendu/données non testés
    unitairement par convention, sauf la donnée de porte régénérée),
    `tsc`/`eslint`/`vite build` verts. Vérifié en Chromium headless
    (serveur isolé port 5189, serveur de Lucas sur 5173 non affecté,
    Playwright réinstallé temporairement puis désinstallé) : écran-titre
    confirmé sans aucune géométrie de niveau (juste parchemin + lune +
    collines + oiseaux) ; "Il était une fois" lisible ; posture de l'enfant
    confirmée tournée vers la gauche (genou/pied du bon côté sur une
    capture recadrée) ; chambre des mots rejouée intégralement au clavier
    (mécanique sans encre, donc scriptable) : soleil validé en jaune puis
    RECOLORIÉ en bleu puis en rouge dans la MÊME session, changement de
    couleur du soleil confirmé à chaque fois par capture d'écran (bug
    éteint) ; porte du temple confirmée toujours ouverte après ces
    recoloriages successifs (franchie avec succès, toast de fin de contenu
    déclenché) ; page recoloriée en rouge confirmée visuellement comme une
    teinte du parchemin (grain/texture toujours visible à travers) plutôt
    qu'un aplat saturé. Non vérifié en direct (nécessiterait de se tracer
    des plateformes d'encre pour franchir le premier mur de chapitre_01,
    tracé à la souris non scriptable comme toujours) : la scène de combat
    contre le Troll d'Encre elle-même — confiance basée sur la relecture du
    code (même state machine que l'enfant de marge_01, déjà éprouvée) plutôt
    que sur une capture en jeu ; à confirmer par Lucas en jouant jusqu'au
    bout du mi-boss sur la voie POINT FINAL/indécise.
- **Vingt-sixième round (2026-07-29)** : retour de Lucas après avoir
  effectivement rejoué (contrairement au round précédent, jamais playtesté
  avant d'être commenté).
  - **Bug corrigé : le combat enfant/Troll d'Encre flottait tout en haut de
    l'arène** — `renderCreatureDecor` utilisait encore `groundY = 92 + 30`,
    une valeur héritée de l'ancien décor statique datant d'avant le
    doublement de hauteur de la salle (D16, 2026-07-26) : jamais mise à
    jour depuis, donc totalement décorrélée du vrai sol de l'arène
    désormais bien plus haute. Corrigé : `groundY = 496`, le sol réel de
    chapitre_01 (`Y(14*TILE)` côté générateur — confirmé par recoupement
    avec le spawn et les pieds du mi-boss, qui atterrissent tous les deux
    exactement à cette hauteur).
  - **Géométrie des 2 murs BRÈCHE "points faibles" de l'arène retravaillée**
    (retour de Lucas) : le premier mur (vertical, x=56) n'est plus cassable
    sur toute sa hauteur — seule sa partie AU-DESSUS d'une hauteur commune
    (`GAUNTLET_SPLIT_ROW = 18`) l'est désormais ; sa base (du sol jusqu'à
    cette hauteur) redevient un mur ordinaire, permanent. Le second mur
    change de forme : il n'est plus une colonne verticale plus loin, mais
    un plafond HORIZONTAL posé pile à `GAUNTLET_SPLIT_ROW`, juste après le
    premier — les deux points faibles se rejoignent à la même hauteur, plus
    de passage possible à hauteur du sol. Techniquement : l'objet BRÈCHE du
    premier mur ne couvre plus que sa partie haute (plus besoin de
    `crackY`/`crackHeight`, il est déjà restreint à la bonne zone) ; le
    second mur est un nouvel objet BRÈCHE large et fin. `renderCrack`
    (game.ts) gagne une branche horizontale (zigzag le long de la largeur
    plutôt que de la hauteur quand `width > height`) — sans ça, la fissure
    du mur horizontal se serait lue comme un minuscule trait vertical perdu
    dans une bande large et fine. `tools/gen_room_chapitre01.mjs` régénéré,
    `tests/tilemap.test.ts` mis à jour pour la nouvelle géométrie.
  - **Plus aucun ennemi dans `ratures_01`** (retour de Lucas) : les 2
    ennemis communs (Coquille, Rature) qui patrouillaient après le gouffre
    sont retirés. `tools/gen_room_ratures01.mjs` régénéré, tests mis à jour.
  - 189 tests (-1, un test de patrouille d'ennemis retiré avec les ennemis,
    fusionné dans le test de comptage d'objets), `tsc`/`eslint`/
    `vite build` verts. **Non vérifié visuellement cette fois** : les deux
    correctifs de chapitre_01 (position du décor, nouvelle géométrie des
    murs) se trouvent tous les deux au-delà du tout premier obstacle du
    niveau (le mur à franchir en s'y traçant des plateformes d'encre,
    x=14) — même limite que d'habitude (tracé à la souris non scriptable).
    Confiance basée sur : (a) le calcul de `groundY=496` recoupé avec deux
    autres points de repère fiables de la même salle (spawn, pieds du
    mi-boss) plutôt qu'une valeur inventée ; (b) `tests/tilemap.test.ts`
    qui vérifie directement la géométrie réelle des murs (hauteur du
    premier mur, forme du second) contre les données régénérées. À
    confirmer par Lucas en jeu.
  - **Diagnostic du "soleil bleu ne marche toujours pas"** (pas encore
    corrigé, en attente de clarification) : le correctif du round précédent
    a été vérifié à nouveau par relecture — `resolveWorldColor` n'applique
    une couleur QUE si `rature_jamais` est vrai (seul RATURE change le
    monde pour de vrai, règle posée dès le round 16). Si Lucas testait sur
    la voie POINT FINAL/indécise (probable, vu sa demande ci-dessous de
    retirer ce mécanisme sur cette voie précisément), c'est le comportement
    voulu : aucune couleur ne s'applique jamais sur cette voie, quelle
    qu'elle soit — pas un bug, mais qui se voit forcément comme "ça ne
    marche pas" en jouant. Question posée à Lucas pour confirmer avant de
    creuser plus loin côté RATURE (où le fix a été vérifié visuellement en
    Chromium headless au round précédent, changement de couleur confirmé
    par capture d'écran).
  - **Chambre des mots de `ratures_01` : le code du temple s'obtient
    désormais auprès de PNJ, pas par essai-erreur** — question posée à
    Lucas pour cadrer la demande (« un code à faire, obtenu en interrogeant
    plusieurs PNJ ») avant d'implémenter (règle du projet : mécaniques
    décidées avec lui). Réponses : les pédestaux/consoles RESTENT (pas
    retirés sur POINT FINAL) et servent toujours à composer/saisir le code ;
    le code doit être réellement saisi quelque part (pas juste "avoir parlé
    à tout le monde"). Lucas note au passage un bug : le PNJ de la chambre
    parle du "temple" sur les DEUX voies, alors que cette imagerie ne
    devrait exister que sur POINT FINAL/indécis (sur RATURE la porte est
    déjà ouverte, pas de temple/code à trouver).
    - **Bug corrigé** : `data/dialogues/pnj_ratures.json`, nœud
      `rature_intro` — « La porte du temple, devant toi... » devient
      « La porte, devant toi... » (mot "temple" retiré). Les nœuds
      `point_*`/`doute_*` (POINT FINAL et indécis, qui ont réellement besoin
      du code) gardent "temple" sans changement.
    - **2 nouveaux PNJ-indice** (`pnj_ratures_indice_soleil.json`,
      `pnj_ratures_indice_jaune.json`, [proposition narration]), positionnés
      à des endroits différents AVANT La Rature qui regrette (x=26*16 et
      x=36*16, contre x=44*16 pour elle) : chacun donne un indice sur une
      moitié du code existant (soleil+jaune, inchangé — même flag
      `temple_code_trouve`) sans le nommer explicitement ("Le Griffonnage"
      pour le sujet, "L'Encre Pâlie" pour l'attribut). Sur RATURE, ils le
      disent sans détour (`startVariants`, même mécanisme que les 2 autres
      PNJ adaptatifs du jeu) : l'indice ne sert à rien puisque la porte est
      déjà ouverte. Aucun changement à `resolveTransformAttempt`/aux
      consoles : le "code à saisir" EST le mécanisme existant (porter
      2 mots à la console de validation) — ce qui change, c'est qu'on est
      désormais guidé vers la bonne combinaison au lieu de devoir
      essayer les 12 au hasard. `game.ts` : les 2 nouveaux fichiers de
      dialogue importés et ajoutés à `this.dialogues` (map générique,
      aucun autre changement de code nécessaire).
    - 190 tests (+1, position des 2 nouveaux PNJ avant La Rature qui
      regrette ; le test de comptage de PNJ passe de 1 à 3), `tsc`/`eslint`/
      `vite build` verts. Vérifié en Chromium headless (serveur isolé port
      5190, serveur de Lucas sur 5173 non affecté) — contrairement aux
      correctifs de chapitre_01 ci-dessus, cette partie de `ratures_01` ne
      demande aucun tracé d'encre pour être atteinte (juste marcher/sauter),
      donc entièrement scriptable : le premier PNJ-indice ("Le Griffonnage")
      confirmé donnant le bon indice sur la voie indécise ; La Rature qui
      regrette confirmée disant "La porte" sans "temple" sur la voie
      RATURE (capture d'écran, bug éteint). Le second PNJ-indice partage
      exactement le même patron de code que le premier (déjà vérifié) : non
      capturé isolément par manque de précision du pilotage clavier pour
      s'arrêter pile dessus, mais confiance élevée par symétrie.
- **Vingt-septième round (2026-07-29)** : nouveau retour de Lucas, le même
  jour, après avoir rejoué le round précédent.
  - **Bug corrigé : le combat enfant/Troll d'Encre passait sous la carte**
    (pire que le round précédent : "flottait en haut" → "sous la carte").
    Cause racine trouvée : ce décor restait dans la passe en PARALLAXE
    (`renderParallaxDecor`, facteur 0.85) alors que chapitre_01 est une
    salle très haute (arène verticale, D16) où la caméra défile beaucoup en
    Y. À facteur < 1, l'écart entre la position à l'écran du décor et celle
    du sol réel grandit avec le défilement vertical — près du bas de la
    salle (où se déroule le combat), la caméra est proche de son maximum,
    ce qui poussait le décor visiblement plus bas que le vrai sol (même
    famille de bug que le masquage horizontal de l'enfant/colline dans
    marge_01, round 23, mais sur l'axe vertical). **Corrigé en déplaçant
    l'appel** (`renderBossArenaDecor`) hors de la passe parallaxe, dans la
    passe à défilement complet (facteur 1, comme le joueur/le boss/les
    ennemis) : alignement garanti quelle que soit la position de la caméra,
    plus de calcul de compensation à maintenir. `groundY=496` (calculé le
    round précédent) reste correct, c'était bien la COUCHE de rendu qui
    posait problème, pas la valeur elle-même.
  - **Mur BRÈCHE horizontal retravaillé une 2e fois le même jour** (retour
    de Lucas) : devait bloquer TOUTE la longueur du corridor à cette
    hauteur, avec sa partie fragile plus loin (pas juste après le mur
    vertical). Le plafond solide (calque "ground") s'étend maintenant de
    x=57 à x=67 (`GAUNTLET_WALL2_X0`/`X1`, tools/gen_room_chapitre01.mjs),
    mais seule une bande étroite vers l'extrémité éloignée (x=65-67,
    `GAUNTLET_WALL2_WEAK_X0`) est enregistrée comme `breche_wall` — le
    reste du plafond bloque le passage sans jamais pouvoir être cassé. Il
    faut donc voyager (encre) le long du plafond pour trouver le point
    faible, au lieu de le trouver juste après avoir grimpé. Nouveau test
    (`tilemap.test.ts`) qui vérifie directement cette asymétrie sur les
    données réelles (plafond solide sur toute la portée avant la partie
    fragile, partie fragile nettement plus étroite).
  - **Chambre des mots de `ratures_01` : le code devient "Le Personnage
    devint bleu"** (retour de Lucas : "soleil devient jaune" est un fait
    ordinaire, trop devinable). Nouveau champ data-driven `isTempleCode`
    sur `WorldTransformation` (`narrative/world_transform.ts` +
    `parseWorldTransformations`, game.ts) : la combinaison qui ouvre le
    temple est maintenant une propriété de la DONNÉE
    (`data/chapters/ratures_01.json`), plus un couple sujet/attribut en dur
    dans `resolveTransformAttempt` — changer le code une 3e fois (si
    besoin) ne touchera plus qu'un fichier JSON. `personnage`+`bleu` choisi
    en partie parce que RATURE en tire un effet plus spectaculaire
    (recolore le joueur lui-même, déjà câblé depuis le round 18) qu'un
    soleil qui change de couleur au loin.
    - Les 2 PNJ-indice renommés/déplacés en conséquence
      (`pnj_ratures_indice_personnage.json`,
      `pnj_ratures_indice_bleu.json`, fichiers renommés depuis
      `_indice_soleil`/`_indice_jaune`) avec des indices plus obliques
      (élimination par choix/agentivité pour "personnage" plutôt qu'un trait
      distinctif trop direct ; imagerie eau profonde/crépuscule pour "bleu"
      plutôt qu'une élimination par la chaleur, plus devinable).
    - **Bug de cohérence trouvé en relisant `pnj_ratures.json`** (pas
      signalé par Lucas cette fois, mais rendu caduc par le changement de
      code) : `point_reaction` donnait encore l'ancien indice en dur
      (« Cherche bien : "Le Soleil devint..." »). Retiré, remplacé par un
      renvoi vers les 2 PNJ-indice (« D'autres, dispersés dans ces pages,
      se souviennent de bouts de la mienne. Écoute-les. ») — cohérent avec
      le nouveau système à plusieurs PNJ plutôt que de dupliquer/périmer un
      indice ailleurs. `rature_mecanisme` (l'exemple donné sur la voie
      RATURE) généralisé de même (« Choisis n'importe quel couple » plutôt
      que l'exemple figé "Le Soleil devint jaune").
  - **PNJ-indice déplacés en hauteur, sur un petit parcours de plateformes**
    (retour de Lucas : "à différents endroits, même en hauteur, on peut
    mettre du parcours") : après le gouffre, un escalier à 2 marches (row12
    puis row9, chaque marche à portée d'un seul saut tenu depuis la
    précédente, pas besoin d'AILES) mène au premier PNJ-indice ; une
    plateforme isolée plus loin (row11, un saut direct depuis le sol) porte
    le second, à une hauteur différente du premier pour varier. Un vrai
    labyrinthe (suggéré par Lucas comme option, "pourquoi pas") n'a pas été
    tenté cette passe — jugé disproportionné par rapport au risque de
    construire une géométrie non rejouable sans itération en jeu réel ; ce
    parcours modeste répond à la demande explicite (endroits différents, y
    compris en hauteur) en restant sûr.
  - 191 tests (+1, `isTempleCode` unique et pointant vers personnage+bleu
    dans les données réelles), `tsc`/`eslint`/`vite build` verts. Vérifié
    en Chromium headless (serveur isolé port 5191, serveur de Lucas sur
    5173 non affecté et activement utilisé pendant la vérification) :
    chambre des mots rejouée jusqu'au bout avec le nouveau code
    (personnage+bleu), résolution confirmée (bandeau vidé) et porte du
    temple confirmée ouverte (capture d'écran, style baie accueillante).
    **Non confirmé par capture** : le texte exact des 2 PNJ-indice une fois
    effectivement debout sur leurs plateformes — plusieurs tentatives
    (marche simple, saut vertical puis dérive, "bunny hop") n'ont pas
    réussi à positionner le pilotage clavier assez précisément sur des
    plateformes de 32-48 px de haut pour déclencher le dialogue et le
    capturer ; le pilotage a fini par simplement traverser toute la zone
    jusqu'à la chambre sans jamais atterrir dessus. Contrairement au tracé
    d'encre (limite déjà connue et documentée), c'est une limite de
    précision du pilotage au clavier scripté sur une plateforme étroite,
    pas une limite de principe — confiance basée sur le calcul (32 px et
    48 px, largement sous le maximum d'un saut simple ~57 px, cohérent avec
    d'autres obstacles déjà éprouvés dans le projet comme le muret de
    marge_01) et sur les données vérifiées par test (positions, hauteurs,
    références de dialogue). Le contenu des indices eux-mêmes (personnage
    via l'agentivité, bleu via l'eau/le crépuscule) reste `[proposition]`,
    à valider par Lucas en jouant.
- **Vingt-huitième round (2026-07-29) — zone 4 « La Crue » (liquide montant)** :
  reprise du projet après une pause. Idée de Lucas pour le niveau suivant : une
  salle où un liquide monte en continu et où le joueur doit grimper plus vite
  qu'il ne monte, en se traçant ses propres plateformes d'encre ; sur POINT
  FINAL/indécis, le TEMPLE inonde son puits pour piéger le visiteur ; sur
  RATURE, le LIVRE déverse son encre pour ravaler le mot qui s'échappe ; des
  plateformes non tracées par le joueur, à mi-parcours, pour reprendre son
  souffle et de l'encre ; verticalité à exploiter. Aucun nouveau pouvoir requis
  (ANCRE a été retiré, PLUME/BRÈCHE/HÂTE/AILES suffisent, tous déjà acquis à ce
  stade). Pas d'ennemi (même choix que ratures_01) : la tension vient
  uniquement de la course, pas du combat.
  - Nouveau module pur `game/world/rising_hazard.ts` (`advanceHazard` — la
    surface décroît en Y, càd monte, plafonnée à `minY` ; `isCaughtByHazard` —
    contact dès que les pieds atteignent la surface), testé. Même mécanique et
    même vitesse sur les deux chemins narratifs ; seule sa peau change via un
    nouveau `game/narrative/hazard_flavor.ts` (`resolveHazardFlavor`, testé,
    même principe que `resolveBossFlavor` : la variante la plus spécifique
    dont les `when` correspondent aux flags l'emporte) — couleur (`ink` pour
    RATURE, `unwritten` pour POINT FINAL/indécis, aucune couleur inventée),
    texte d'arrivée et message de capture. Données dans
    `data/chapters/crue_01.json` (`hazardFlavorVariants`, textes
    `[proposition]`).
  - `config.ts` : nouveau groupe `RISING_HAZARD` (vitesse de montée, marge de
    sécurité au retour à l'encrier, amplitude/fréquence de l'ondulation de
    surface) — vitesse volontairement modeste pour un premier passage, comme
    toujours pour ce qui touche au tracé d'encre (non scriptable, donc pas
    testable automatiquement ; à resserrer après le playtest de Lucas).
  - `tools/gen_room_crue01.mjs` (nouveau) → `data/rooms/crue_01.json` : puits
    vertical de 14×50 tuiles, volontairement VIDE entre un sol d'entrée (avec
    encrier) et une plateforme de repos à mi-hauteur (avec un second encrier,
    demande explicite de Lucas), puis vide à nouveau jusqu'à une plateforme
    du haut portant la porte de sortie. Aucune géométrie de secours
    pré-posée : tout le reste du parcours est laissé au tracé du joueur,
    conforme à la mécanique décrite. `tools/gen_room_ratures01.mjs` : la
    porte du temple (déjà asymétrique RATURE/POINT FINAL depuis le round 17)
    mène désormais à `crue_01` au lieu de boucler sur elle-même — la zone 4
    existe maintenant. Le toast de fin de contenu actuel (`showsCompletionToast`)
    est déplacé de cette porte vers la sortie de `crue_01` ; renommé au passage
    en `finalizeAvailableContent()`/flag `content_fin_actuelle` (depuis
    `finalizeRatures01Content()`/`ratures01_fini`, spécifiques à ratures_01 et
    donc trompeurs maintenant que le contenu continue une zone de plus) —
    `flags.json` mis à jour en conséquence.
  - `game.ts` : `hazardY` (Y monde de la surface, `null` hors de crue_01) mis
    à niveau sous le point de départ à `loadRoom` et remis à niveau sous le
    joueur à chaque retour à l'encrier (`respawn`), avec la même formule
    (checkpoint + hauteur du joueur + marge) — un encrier mi-parcours redonne
    donc un vrai répit, pas seulement de l'encre. Capture gérée comme les
    autres échecs (`handleHazardCaught` → `failAndRespawn`, même sévérité
    qu'une chute dans un gouffre ou une défaite), vérifiée AVANT la chute
    dans `updatePlaying`. Rendu (`renderHazard`) : dalle translucide + ligne
    de surface ondulée en continu (`this.time`, pas un zigzag figé comme
    `renderCrack` — un liquide bouge sans cesse).
  - **Bug latent trouvé en vérifiant** (indépendant de cette fonctionnalité,
    mais qui en aurait faussé la démonstration) : le menu Admin
    (`adminGoToRoom`) écrasait `this.mode` en `'playing'` sans condition
    juste après `loadRoom`, ce qui sautait silencieusement toute narration de
    première visite déclenchée par ce chargement (existait déjà pour
    ratures_01, pas seulement pour la nouvelle salle) — corrigé : ne repasse
    en `'playing'` que si `loadRoom` n'a pas mis le jeu en mode `'narration'`.
  - 210 tests (+22 : `rising_hazard.test.ts`, `hazard_flavor.test.ts`,
    nouveau bloc `crue_01` dans `tilemap.test.ts`, ajustement du test de la
    porte du temple), `tsc`/`eslint`/`vite build` verts. Vérifié en Chromium
    headless (serveur isolé port 5192, Playwright réinstallé temporairement
    `--no-save` puis désinstallé, `package.json`/`package-lock.json`
    vérifiés inchangés), entièrement au clavier (menu Admin, pas de tracé à
    la souris nécessaire pour atteindre l'entrée de la salle) : narration
    d'arrivée confirmée (texte du temple, révélation progressive), liquide
    visible et montant confirmé sur deux captures espacées, joueur immobile
    rattrapé par la surface confirmé (toast thématique « Les eaux du temple
    se referment sur toi... » puis retour à l'encrier, surface remise à un
    niveau sûr en dessous). **Non vérifié en direct** (nécessiterait de se
    tracer des plateformes d'encre pour grimper, tracé à la souris non
    scriptable comme toujours) : grimper réellement jusqu'à la plateforme de
    repos et jusqu'à la porte de sortie, et la peau RATURE (encre noire) du
    liquide — cette dernière est cependant couverte exhaustivement par les
    tests unitaires de `resolveHazardFlavor` et repose sur le même ternaire
    déjà vérifié visuellement pour la couleur par défaut. À confirmer par
    Lucas en jouant, notamment l'équilibrage vitesse de montée/coût d'encre
    (numéros posés comme un premier passage raisonnable, pas calibrés en jeu
    réel).
- **Vingt-neuvième round (2026-07-29) — retours de playtest sur les niveaux
  2, 3 et 4** : Lucas rejoue et remonte plusieurs points, dont une capture
  d'écran du niveau 4 qui a permis de retrouver un vrai bug indépendant.
  - **Bug trouvé en creusant la capture d'écran de Lucas (niveau 4, joueur
    bloqué avec l'étiquette « CIEL » flottant au-dessus de lui)** : `CIEL`
    est un mot de la chambre des mots de `ratures_01` (`transform_word`,
    porté à la main) — `carriedWord`/`transformSlots` n'étaient réinitialisés
    qu'à `beginGame` (nouvelle partie/chargement), jamais à `loadRoom`
    (chaque changement de salle). Un mot ramassé puis jamais déposé restait
    donc "en main" indéfiniment, y compris en changeant de salle (porte ou
    Admin), affiché au-dessus de la tête du joueur n'importe où dans le jeu
    (`renderCarriedWord`) — sans aucun sens hors de la chambre des mots.
    Corrigé : `loadRoom` remet les deux à `null`/vide à chaque chargement.
  - **Niveau 2 (chapitre_01), exploit trouvé en creusant le retour de
    Lucas** (« la barre brèche horizontale devrait continuer jusqu'à la
    fin ») : le second point faible de l'arène (plafond horizontal,
    `GAUNTLET_SPLIT_ROW`, x=57-67) ne faisait qu'UNE rangée d'épaisseur, sans
    rien au-dessus jusqu'au vrai plafond de la salle. Un joueur grimpant déjà
    plus haut que cette rangée AVANT d'atteindre le mur 1 (possible dans le
    puits d'escalade, x≥34, aucun plafond avant x=56) pouvait ensuite voler
    par-dessus tout le mur 2 sans jamais chercher son point faible — la
    "chasse au plafond" pensée en round précédent ne servait plus à rien.
    Corrigé (`tools/gen_room_chapitre01.mjs`) : un vrai plafond (rangées 0 à
    `GAUNTLET_SPLIT_ROW - 1`) bloque désormais tout l'espace au-dessus, du
    mur 1 jusqu'à la fin du plafond horizontal — impossible de contourner
    par le haut, sans toucher à la verticalité de l'arène du mi-boss plus
    loin (le plafond ajouté s'arrête à `GAUNTLET_WALL2_X1`). Nouveau test de
    régression (`tilemap.test.ts`) qui vérifie directement cette zone sur
    les données réelles.
  - **Niveau 3 (ratures_01), PNJ-indice repositionnés** (retour de Lucas :
    « il faudrait que le personnage soit obligé de construire des
    plateformes pour atteindre certains pnj ») : l'escalier de 2 marches à
    portée d'un simple saut tenu (round précédent) est retiré ;
    les 2 PNJ-indice sont maintenant sur des plateformes dont la hauteur
    au-dessus du sol (144px et 176px) dépasse nettement le maximum
    atteignable sans encre (saut ~57px + AILES ~47px ≈ 105px) — impossible
    de les atteindre sans peindre au moins un palier intermédiaire. Nouveaux
    tests de régression (hauteur, absence de tuile solide entre le sol et
    chaque plateforme).
  - **Niveau 3, code du temple clarifié et changé** (retour de Lucas,
    résumé explicite après un aller-retour manqué la session précédente) :
    « Le Ciel devint rouge » remplace « Le Personnage devint bleu » (encore
    jugé trop devinable). `isTempleCode` déplacé dans
    `data/chapters/ratures_01.json` (donnée, pas de code touché dans
    `game.ts` — la porte reste gérée par `temple_code_trouve`, déjà
    generic). Les 2 PNJ-indice renommés/réécrits en conséquence
    (`pnj_ratures_indice_ciel.json`/`pnj_ratures_indice_rouge.json`,
    remplacent `_personnage`/`_bleu`, indices obliques par élimination pour
    le sujet, par imagerie de chaleur/aube pour l'attribut).
  - **Niveau 3, un seul PNJ sur la voie RATURE** (retour de Lucas : « un
    seul pnj dans cette version ») : nouvelle propriété Tiled générique
    `hiddenIfFlag`, lue par un nouveau `Game.isNpcHidden` (appliqué à la
    fois au rendu et à l'interaction, contrairement aux portes
    `requiresFlag` qui restent visibles mais verrouillées — un PNJ caché
    n'a pas de version "verrouillée visible" qui aurait un sens). Les 2
    PNJ-indice portent `hiddenIfFlag: 'rature_jamais'` : sur RATURE, seule
    La Rature qui regrette reste rencontrable, ses indices n'ayant plus
    d'utilité une fois la porte déjà ouverte.
  - **Niveau 4 (crue_01), softlock corrigé** : la capture d'écran de Lucas
    montrait le joueur bloqué sous la plateforme de l'encrier de
    mi-parcours. Cause : les 2 plateformes de repos étaient pleines sur
    TOUTE la largeur navigable du puits (colonnes 1 à W-2, les murs
    latéraux occupant déjà les 2 colonnes restantes) — aucune ouverture
    nulle part, impossible d'atteindre leur surface par en dessous quel que
    soit le niveau de maîtrise du tracé d'encre. Corrigé en suivant la
    suggestion de Lucas (« rajouter des murs breche à casser ») : une bande
    de 3 colonnes de chaque plateforme (côté opposé pour varier) est
    désormais enregistrée `breche_wall`, cassable au pouvoir BRÈCHE (déjà
    acquis) — le reste de chaque plateforme reste un sol ordinaire, jamais
    cassable, pour garder l'encrier/la porte/le robinet sur une assise
    stable. Nouveaux tests de régression (présence des 2 murs, largeur
    partielle, casser l'un n'affecte pas l'autre — `Room.revealFiligrane`).
  - **Niveau 4, ajustements de la mécanique d'eau** (3 retours de Lucas) :
    (1) eau plus foncée : opacité de la dalle/ligne de surface remontée de
    0.4/0.8 (en dur) à 0.58/0.9 (`RISING_HAZARD.fillAlpha`/`strokeAlpha`,
    config.ts) ; (2) condition de capture assouplie : rattrapé à MOITIÉ
    submergé (centre du corps) plutôt qu'au premier pixel touché (pieds),
    jugé "très expéditif" — `isCaughtByHazard` (rising_hazard.ts) généralisé
    pour accepter n'importe quel point de référence, `game.ts` lui passe
    désormais le centre du joueur ; (3) robinet/bouton en haut du puits pour
    arrêter la montée pour de bon (nouveau type d'objet `valve`, flag fixe
    `CRUE01_VALVE_FLAG`, lu par `updateHazard` pour geler `hazardY`) —
    reskinné selon le chemin (`valveLabel`/`stopMessage`,
    `narrative/hazard_flavor.ts` : "le robinet"/temple vs "le fermoir"/livre)
    mais n'importe pas sur la porte de sortie (flourish de clôture, pas une
    condition — hypothèse posée faute de précision de Lucas sur ce point,
    à corriger si ce n'est pas ce qu'il voulait).
  - 219 tests (+6 : régression plafond chapitre_01, plateformes/hauteur
    ratures_01, murs BRÈCHE crue_01 ×2, isTempleCode mis à jour), `tsc`/
    `eslint`/`vite build` verts. Vérifié en Chromium headless (serveur
    isolé port 5193, Playwright réinstallé temporairement `--no-save` puis
    désinstallé, `package.json`/`package-lock.json` vérifiés inchangés) :
    chapitre_01 charge sans régression visible au spawn ; crue_01 confirmé
    avec une eau visiblement plus sombre et la capture qui se déclenche
    toujours correctement (bon message reskinné, retour à l'encrier, remise
    à niveau de la surface). **Non vérifié en direct** (nécessiterait de
    grimper avec des plateformes d'encre pour atteindre les zones
    concernées, tracé à la souris non scriptable comme toujours) : les
    PNJ-indice repositionnés de `ratures_01` (déjà couverts par des tests
    unitaires sur la géométrie réelle), les nouveaux murs BRÈCHE des
    plateformes de `crue_01` en situation réelle, et le robinet/fermoir en
    haut du puits. À confirmer par Lucas en jouant, en particulier si le
    robinet devrait ou non conditionner la porte de sortie (hypothèse prise
    sans confirmation explicite).
- **Trentième round (2026-07-29) — Lucas corrige le round précédent et
  demande une évolution du niveau 4** :
  - **Niveau 2, correctif du round précédent annulé et refait correctement**
    (Lucas : « tu t'es trompé, tu as mis un mur en hauteur plein on ne peut
    plus passer, je parlais juste du second mur horizontal, c'est lui qui
    devrait être sur toute la longueur, pas la hauteur ») : le plafond en
    HAUTEUR ajouté au round précédent (rangées 0 à `GAUNTLET_SPLIT_ROW-1`,
    x=57-67) bloquait bel et bien tout passage, y compris par en dessous —
    casser le point faible n'ouvrait plus qu'une poche d'un tuile de haut,
    coincée sous ce nouveau plafond, sans nulle part où aller. Entièrement
    retiré. Correctif refait tel que demandé : seule la LONGUEUR du plafond
    horizontal change (x=57 à W-2 au lieu de x=57 à 67, point faible
    repoussé tout au bout) — aucune contrainte de hauteur ajoutée, le
    passage normal par en dessous reste possible comme avant. Test de
    régression de l'ancien correctif retiré, remplacé par un test qui
    vérifie la nouvelle longueur.
  - **Niveau 4, plus de porte de sortie** (Lucas : « il faudrait pas mettre
    une porte en haut mais pouvoir continuer le niveau, comme si qu'on
    arrivait au cœur du temple ») : `porte_suite` supprimée. Le robinet/
    fermoir en haut du puits devient LE point d'arrivée de la salle — en
    plus d'arrêter la montée, il déclenche désormais aussi
    `finalizeAvailableContent()` (déplacé depuis l'ancienne porte). Les
    textes de clôture (`stopMessage`, `hazard_flavor.ts`) explicitent
    l'arrivée : « Te voilà au cœur du temple »/« Te voilà au cœur du
    livre ». **Hypothèse posée sans confirmation explicite** : le robinet
    reste un geste de clôture, pas une condition (de toute façon plus de
    porte à débloquer) — à confirmer que c'est bien ce que Lucas voulait
    dire par "continuer le niveau".
  - **Niveau 4, décor mural** (demande de Lucas : hiéroglyphes, silhouettes
    égyptiennes, torches, symboles) : nouveau `renderCrueWallDecor`
    (game.ts), motifs répétés verticalement sur les deux parois du puits,
    tuilage vertical réutilisant `engine/parallax.ts`
    (`tileIndicesCovering`/`seededRandom`, déjà utilisés horizontalement
    pour le fond des autres salles — génériques par construction, aucun
    changement moteur). Reskinné selon le chemin narratif (même `color` que
    le liquide, `hazard_flavor.ts`) : POINT FINAL/indécis → ankh, silhouette
    de profil, hiéroglyphe de l'eau, torches ; RATURE → tache d'encre,
    plume, ligne d'écriture. Défilement complet (facteur 1, pas de
    parallaxe, même raison que `renderBossArenaDecor` round 27 : la
    parallaxe dérive dans les salles hautes). Deux torches fixes encadrent
    le robinet (marque l'arrivée, indépendant du tuilage aléatoire).
    **Bug trouvé en vérifiant visuellement** (pas dans les retours de
    Lucas) : le décor était dessiné AVANT `renderSlabs` (les dalles de mur)
    dans le pipeline de rendu — les dalles, peintes juste après,
    recouvraient entièrement les motifs, invisibles à l'écran. Corrigé en
    déplaçant l'appel après `renderSlabs`.
  - **Niveau 4, tourelles fixes** (Lucas : « comme le boss au niveau 2 ») :
    nouveau module pur `game/enemies/turret.ts` (même pattern que
    `enemy.ts`/`boss_coquille_majuscule.ts`, D12 — types + fonctions pures,
    pas d'ECS générique), testé (15 tests). Encastrées dans les murs
    latéraux, ne se déplacent jamais, tirent une bulle visée sur le joueur
    à intervalle régulier (même anticipation `projectileLeadSeconds` que le
    mi-boss) ; détruites en un seul coup de HÂTE (rôle "combat" du dash,
    spec §6, cohérent avec les ennemis communs) ; **aucun dégât de contact**
    (choix de scope délibéré : fixes dans le mur, seul le tir menace,
    contrairement à Coquille/Rature qui blessent au toucher). 4 tourelles
    placées dans `crue_01` (`tools/gen_room_crue01.mjs`), 2 par moitié du
    puits, alternant de côté (gauche/droite) pour varier. `config.ts` :
    nouveau groupe `TURRET` (vitesse/rayon/dégâts de projectile proches de
    `BOSS` par cohérence, cooldown un peu plus court — pas de phases
    télégraphiées ici, juste un délai). Rendu : socle + lentille qui
    s'éclaire juste avant le tir (télégraphe minimal réutilisant le
    `cooldown` déjà connu, pas de nouvel état) ; bulles dans le même style
    que celles du mi-boss (halo + cœur + reflet, code dupliqué à
    l'identique faute d'un module de projectile partagé — voir limite
    ci-dessous).
  - **Dette technique notée, pas corrigée cette passe** : le rendu des
    bulles (mi-boss ET tourelles) et une partie de la logique de
    projectile (avance, expiration, visée avec anticipation) sont
    dupliqués entre `boss_coquille_majuscule.ts`/`turret.ts` et leurs blocs
    de rendu dans `game.ts`. Un module `enemies/projectile.ts` partagé
    factoriserait ça proprement ; pas fait ici pour limiter le risque de
    régression sur le mi-boss (déjà éprouvé) dans une passe déjà chargée —
    à envisager si un 3e émetteur de projectiles apparaît.
  - 228 tests (+15 turret.test.ts, quelques tests de crue_01 fusionnés/
    renommés en retirant les références à la porte disparue), `tsc`/
    `eslint`/`vite build` verts.
    Vérifié en Chromium headless (serveur isolé port 5194, Playwright
    réinstallé temporairement `--no-save` puis désinstallé,
    `package.json`/`package-lock.json` vérifiés inchangés) : chapitre_01
    charge sans régression visible au spawn ; crue_01 confirmé avec le
    décor mural bien visible après correction du bug d'ordre de rendu
    (hiéroglyphes ondulés, silhouette de profil, torche) et une tourelle
    clairement visible encastrée dans le mur gauche près du spawn. **Non
    vérifié en direct** (nécessiterait de grimper avec des plateformes
    d'encre, tracé à la souris non scriptable comme toujours) : combattre
    réellement une tourelle (destruction au dash, dégâts de ses bulles),
    atteindre le robinet en haut et confirmer le texte de clôture, et le
    décor mural version RATURE (encre/plume) — cette dernière repose sur le
    même ternaire que la couleur du liquide, déjà vérifié visuellement pour
    la variante par défaut. À confirmer par Lucas en jouant, notamment
    l'équilibrage des tourelles (dégâts/cadence) et si le geste du robinet
    correspond à ce qu'il avait en tête pour "continuer le niveau".
- **Trente-et-unième round (2026-07-29)** — retours de playtest sur les
  niveaux 3 et 4, plus une image du haut du puits de crue_01 :
  - **Bug corrigé (niveau 3, chambre des mots)** : composer n'importe quelle
    phrase valide (une des 12 combinaisons) affichait à tort « la porte
    s'ouvre » sur POINT FINAL/indécis, même quand ce n'était pas le code du
    temple (`ciel`+`rouge`) — la porte restait en réalité verrouillée
    (`temple_code_trouve` non posé), mais le texte affirmait le contraire.
    `resolveTransformAttempt` (game.ts) distingue désormais 3 cas : RATURE
    (« devenu vrai », inchangé), POINT FINAL/indécis + bon code (« la porte
    s'ouvre », inchangé), POINT FINAL/indécis + combinaison valide mais pas
    le code (nouveau : « Une phrase vraie, mais pas celle que la porte
    attend. » [proposition]). Vérifié en direct : soleil+rouge puis ciel+jaune
    (deux combinaisons valides mais pas le code) affichent bien le nouveau
    message plutôt que l'ancien texte trompeur.
  - **Tourelles (crue_01) retravaillées** (retour de Lucas : « un peu moins
    souvent » + « uniquement quand le personnage arrive à une certaine
    portée ») : `TURRET.cooldownSeconds` remonté 2.2→3.4 ; nouveau
    `TURRET.rangeDistance` (130px) et `stepTurret` (`enemies/turret.ts`) gèle
    désormais le décompte du cooldown tant que le joueur est hors de cette
    portée (ni tir, ni décompte — entrer dans la portée reprend le compte à
    rebours normalement, pas de tir instantané garanti à l'entrée). 2
    nouveaux tests de régression (gelée hors de portée, tire dès l'entrée en
    portée) ; les tests existants (turret proche de x=50, joueur à x=300)
    ont dû être rapprochés (x=100) pour continuer à tester le tir/la visée
    indépendamment du nouveau filtre — sinon ils échouaient tous, masqués
    l'un par l'autre.
  - **Salle-trésor en haut de crue_01** (retour de Lucas, avec une image du
    haut du puits : « il faudrait un mur breche à casser pour passer à la
    suite, un trésor au centre d'une jolie salle ») : extension du MÊME
    fichier de salle (pas de nouvelle salle/porte, cohérent avec la
    décision "pas de porte, on continue jusqu'au cœur du temple/livre" du
    round précédent) — `tools/gen_room_crue01.mjs` : le puits garde sa
    largeur `SHAFT_W=14` inchangée pour toute sa géométrie existante,
    `CHAMBER_W=6` ajoute une chambre à droite (bedrock plein sauf
    l'intérieur vidé, rows1-8) accessible en cassant un nouveau mur BRÈCHE
    (`mur_breche_crue_tresor`, 3 rangées, sur le mur du puits juste
    au-dessus de la plateforme du robinet) ; un objet `treasure` au centre
    de la chambre. Nouveau type d'objet générique `treasure` (game.ts) :
    même mécanique de ramassage qu'un `fragment` (flag + narration au
    ramassage, persistant via `replayRoomState`) mais texte dédié
    (`hazard_flavor.ts` gagne `treasureText`, reskinné temple/livre comme le
    reste) plutôt que le préfixe « Fragment retrouvé » qui n'aurait pas de
    sens pour un trésor ; rendu réutilisé tel quel (`renderFragment`, déjà
    générique). **Piège trouvé en implémentant** : `renderCrueWallDecor`
    utilisait `this.room.pixelWidth - 8` comme mur droit du PUITS — une fois
    la salle élargie par cette extension, `pixelWidth` désigne désormais le
    bord du FICHIER (bien plus loin), ce qui aurait décalé tout le décor du
    mur droit du puits vers le vide. Nouvelle constante dédiée
    `CRUE01_SHAFT_WIDTH` (même principe que `groundY=496` pour l'arène de
    chapitre_01 : valeur figée pour cette salle précise, à garder
    synchronisée avec `SHAFT_W` du générateur) reprend ce rôle ;
    `this.room.pixelWidth` réutilisé tel quel pour le nouveau 3e plan de
    décor (voir plus bas), où il désigne maintenant correctement le bord
    lointain. 6 nouveaux tests de régression sur les données réelles
    (chambre vide, sol/paroi lointaine solides, mur BRÈCHE localisé,
    trésor centré, ouverture précise sans effet de bord) ; plusieurs tests
    existants qui bornaient leurs boucles sur `map.widthTiles` (désormais la
    largeur du FICHIER, pas du puits) auraient silencieusement testé la
    mauvaise chose ou échoué à tort — reboisés sur une constante locale
    `SHAFT_W` dédiée aux tests.
  - **Vrai arrière-plan pour crue_01** (retour de Lucas : « les décos sur
    les murs très bien mais je voyais aussi le fond, l'arrière-plan ») :
    `crue_01` n'est dans aucun des deux systèmes de fond existants
    (`BACKDROP_ROOMS` de `world/backdrop.ts` — pensé pour des salles à large
    défilement horizontal, inadapté à ce puits étroit à défilement quasi
    uniquement vertical). Plutôt que d'y greffer un fond horizontal
    inadapté, `renderCrueWallDecor` gagne une 3e colonne de motifs à la
    paroi LOINTAINE de la salle-trésor (`this.room.pixelWidth - 8`,
    justement libéré par le renommage ci-dessus) — visible en permanence à
    droite du puits pendant toute la montée (la salle entière, 320px, tient
    dans les 480px de la vue ; la caméra ne défile jamais horizontalement),
    donnant enfin une impression de profondeur plutôt que deux simples murs
    proches. Seed différente (`+101`) pour ne pas dupliquer visuellement les
    deux autres colonnes.
  - **Pictogramme cœur aux encriers** (retour de Lucas : « mettre un cœur
    au niveau du checkpoint de l'encrier ») : `drawHeartIcon` (`ui/hud.ts`,
    déjà utilisé pour la jauge de PV) exporté et réutilisé au-dessus de
    CHAQUE encrier du jeu (pas seulement `crue_01` — un encrier restaure
    toujours les PV au respawn, `failAndRespawn`, c'est une vérité générale
    du jeu, pas une règle propre à ce niveau) : simple ajout de rendu,
    aucune nouvelle donnée de salle. Confirmé visible en direct.
  - **Les plateformes d'encre du joueur sont effacées à chaque
    réapparition** (retour de Lucas : « si le personnage meurt, il faudrait
    effacer toutes les plateformes tracées par le joueur... et lui rendre
    son encre » — cette 2e partie était déjà acquise, `refillInk` existait
    déjà dans `respawn()`). Nouvelle méthode `Room.clearInk()` (vide le
    `Set` d'encre tracée d'un coup, ne touche ni au décor naturel ni aux
    murs BRÈCHE/canon déjà résolus), appelée dans `respawn()` juste après
    `refillInk`. Portée volontairement générale (toutes les salles, pas
    seulement `crue_01`) : symétrique au remboursement d'encre déjà
    universel, et évite qu'un escalier d'encre déjà tracé avant une chute
    reste utilisable indéfiniment, ce qui viderait de son sens la course
    contre la montée de `crue_01` en particulier. Testé (`room.test.ts`).
  - 233 tests (+5), `tsc`/`eslint`/`vite build` verts. Vérifié en Chromium
    headless (serveur isolé port 5195, Playwright réinstallé temporairement
    `--no-save` puis désinstallé, `package.json`/`package-lock.json`
    vérifiés inchangés) : **chambre des mots de ratures_01 rejouée en
    direct** (double-saut AILES + vol plané pour franchir le petit gouffre,
    technique tendue à scripter — plusieurs essais nécessaires, la marge
    entre un saut simple et le gouffre ne laissant qu'une fenêtre étroite
    sans le vol plané) : deux combinaisons valides mais pas le code
    (soleil+rouge, ciel+jaune) confirmées affichant le nouveau message ; le
    code exact (ciel+rouge) n'a PAS pu être isolé et rejoué précisément
    dans cette session malgré plusieurs tentatives (le pilotage au clavier
    par durées calculées dérive de façon non déterministe d'un lancement à
    l'autre, probablement des variations d'ordonnancement du navigateur
    hors de mon contrôle — même famille de limite que le tracé d'encre,
    mais ici sur du positionnement au pixel près plutôt que sur le dessin
    lui-même) ; confiance élevée malgré tout car la branche « bon code »
    (`isTempleCode === true`) est un code PRÉEXISTANT, non modifié par ce
    correctif (seul un nouveau `else if` a été ajouté après elle), déjà
    vérifiée en direct lors du round 27. **crue_01** confirmé en direct :
    cœur au-dessus de l'encrier visible, décor mural sur 3 colonnes visible
    (près/mur du puits/paroi lointaine de la salle-trésor), tourelle proche
    du spawn confirmée tirant sur le joueur (dégâts visibles à la jauge de
    PV) pendant qu'aucun projectile parasite des tourelles lointaines n'est
    apparu à l'écran. **Non vérifié en direct** (nécessiterait de se tracer
    des plateformes d'encre, tracé à la souris non scriptable comme
    toujours) : casser le nouveau mur BRÈCHE de la salle-trésor et ramasser
    le trésor en situation réelle (couvert par 6 tests unitaires sur les
    données réelles), et l'effacement des plateformes d'encre à la mort
    (couvert par un test unitaire direct sur `Room.clearInk()`, mécanisme
    trivial et isolé). À confirmer par Lucas en jouant.
- **Trente-deuxième round (2026-07-29)** — Lucas corrige le round précédent,
  le jour même, avant tout playtest :
  - **Malentendu sur le cœur corrigé** : le round précédent avait ajouté un
    simple PICTOGRAMME décoratif au-dessus de CHAQUE encrier du jeu — Lucas
    voulait un vrai OBJET à ramasser qui restaure des PV, positionné au
    niveau d'UN encrier précis de `crue_01`. Pictogramme retiré partout
    (revert de `drawHeartIcon` sur les encriers, ré-exportée en fonction
    privée de `ui/hud.ts` comme avant). Question posée à Lucas pour savoir
    lequel des 2 encriers de `crue_01` ("bas" ou "mi-parcours") — réponse :
    mi-parcours. Un objet `type: 'potion'` (même mécanique que la fiole de
    chapitre_01, déjà entièrement câblée : flag, restaure `healPotionFraction`
    des PV max, rendu = un vrai cœur pulsant avec halo — `renderPotion`,
    déjà exactement ce que Lucas décrivait, pas besoin de nouveau code)
    ajouté juste à côté de `encrier_crue_mi_parcours`.
  - **Salle-trésor repensée en corridor jusqu'en bas** (retour de Lucas :
    « le trésor devrait être tout en bas, pas une petite alcôve en haut...
    une fois qu'on a cassé le mur, on redescend tout en bas ») : le mur
    BRÈCHE reste au même endroit (juste au-dessus de la plateforme du
    robinet, en haut), mais ce qu'il ouvre n'est plus une petite chambre
    fermée (rows 1-8) — c'est désormais un long corridor vide qui descend
    quasiment jusqu'au bas de la salle (rows 1 à H-4), avec son propre sol
    tout en bas (dernières 3 rangées, comme le sol d'entrée du puits
    principal) où attend le trésor. Aucune encre nécessaire pour descendre
    (la chute suffit) — seule la montée du puits principal exige de tracer
    des plateformes. `tools/gen_room_crue01.mjs` : `TREASURE_ROOM_Y1` passe
    de 8 à `H-4` ; position du trésor recalculée au niveau du sol
    (`FLOOR_SURFACE_Y`, même hauteur que le sol d'entrée du puits) plutôt
    qu'au centre d'une petite chambre.
  - **Bug trouvé en retravaillant cette géométrie** (pas signalé par Lucas,
    mais qui aurait gâché l'effet une fois le corridor étendu jusqu'en bas) :
    `renderHazard` remplissait le liquide montant sur `this.room.pixelWidth`
    entier — depuis l'ajout de la salle-trésor (round précédent), cette
    largeur couvre aussi le corridor, qui est pourtant un compartiment
    séparé du puits (mur plein entre les deux hors du point faible BRÈCHE).
    Avec le corridor désormais aussi haut que le puits, l'eau se serait
    affichée par-dessus sur toute sa hauteur, comme si elle inondait aussi
    la salle-trésor. Corrigé : bornée à `CRUE01_SHAFT_WIDTH * TILE_SIZE`
    (la constante déjà introduite au round précédent pour le même genre de
    problème sur le décor mural) plutôt qu'à la largeur du fichier entier.
  - **Niveau 2 (chapitre_01)** : retour de Lucas — « avant le pouvoir brèche
    il y a deux encriers, on va garder que celui à côté du pouvoir brèche ».
    `encrier_chapitre1` (juste après le tout premier mur, avant même HÂTE)
    retiré ; `encrier_chapitre1_puits` (juste avant le puits d'escalade,
    collé au mot-pouvoir BRÈCHE) reste seul. Pas de risque de softlock
    vérifié par relecture : le seul obstacle coûteux en encre entre le
    spawn et cet encrier restant est le tout premier mur, franchi avec
    l'encre reportée de `marge_01` (comme c'était déjà implicitement le cas
    avant que cet encrier n'existe) ; l'encrier retiré ne faisait que
    rafraîchir la réserve APRÈS ce mur, avant une zone sans autre coût
    d'encre jusqu'au puits.
  - 234 tests (+1, nouveau test sur le cœur de `crue_01`, ceux de la
    salle-trésor et de l'encrier de chapitre_01 réécrits pour la nouvelle
    géométrie plutôt qu'ajoutés en plus), `tsc`/`eslint`/`vite build` verts.
    **Pas de vérification Playwright cette passe** (retour de Lucas,
    2026-07-29 : « pas besoin de systématiquement faire playwright... on
    perd du temps et des tokens ») — confiance basée sur les tests
    unitaires (déjà réécrits contre les données réelles régénérées) et la
    relecture de code ; à confirmer par Lucas en jouant.
- **Trente-troisième round (2026-07-29) — la salle-trésor devient une vraie
  salle séparée + effondrement du plafond ; `restartLevel()` généralisé** :
  deux retours de Lucas, le même jour, avant tout playtest du round
  précédent.
  - **Bug trouvé et sa cause** : tomber dans le corridor du round précédent
    (pour aller chercher le trésor tout en bas de crue_01) déclenchait à
    tort la défaite « les eaux se referment sur toi », alors que ce
    corridor n'a jamais contenu d'eau. Cause : `isCaughtByHazard`
    (world/rising_hazard.ts) ne compare que la coordonnée Y du joueur à
    `hazardY` — aucune notion de "compartiment" — et `hazardY` est une
    valeur unique pour toute la salle `crue_01`, dont ce corridor faisait
    partie (même fichier). Plutôt que d'apprendre à l'aléa à distinguer des
    zones (complexifier une mécanique qui marche bien partout ailleurs),
    Lucas préfère une salle séparée : « on va plutôt faire une porte qui
    mène à une salle aux trésors ».
  - **`salle_tresor` (nouvelle salle, `tools/gen_room_salle_tresor.mjs`)** :
    petite pièce plate (26×10, aucun tracé d'encre requis). Le mur BRÈCHE de
    crue_01 (inchangé, même position) n'ouvre plus que sur une petite alcôve
    contenant une porte (`porte_salle_tresor` → `salle_tresor`) ; l'ancien
    corridor-jusqu'en-bas est retiré. Dans `salle_tresor` : le trésor près
    de l'entrée, puis, une fois ramassé, « le temple tremble et des bouts du
    plafond tombent » (demande de Lucas) — il faut courir jusqu'à une
    seconde porte (sortie) sans se faire toucher. Les deux portes ramènent
    à `crue_01` sur la plateforme du haut, à des positions différentes
    (convention habituelle anti-re-déclenchement).
  - **Effondrement** : nouveau module pur `game/world/falling_debris.ts`
    (même pattern D12 que `enemies/turret.ts` : types + fonctions pures,
    testé) — les blocs tombent en boucle depuis des points fixes du
    plafond (objets `debris_spawn`, données de salle) choisis en
    ROUND-ROBIN plutôt qu'au hasard (déterministe, testable, même esprit
    que `seededRandom` ailleurs dans le projet). `collapseActive` est un
    état de SESSION (jamais persisté) posé au ramassage du trésor
    (`checkPickups`, gated sur `room.id === 'salle_tresor'`) : revisiter la
    salle après coup (trésor déjà pris) ne redéclenche pas la chute — le
    danger est lié au geste de ramasser, pas à un flag permanent. Un échec
    pendant la course (`handleCrushed`, même sévérité que les autres échecs
    du jeu) redonne un essai frais : `respawn()` vide `debrisField` quand
    `collapseActive` est vrai dans cette salle. Textes reskinnés
    temple/livre comme le reste (`hazard_flavor.ts` gagne `collapseMessage`/
    `crushedMessage`).
  - **`restartLevel()` généralisé** (retour de Lucas, signalé sur le
    robinet de `crue_01` qui restait fermé après « Recommencer le niveau » :
    « il faut vraiment reset comme si qu'on venait de rentrer dans le
    niveau »). Jusqu'ici cette fonction ne remettait à zéro QUE les
    mots-loi de `marge_01` (barrières/blancs canon) — tout le reste de
    l'état mécanique des autres salles (murs BRÈCHE cassés, fioles/cœurs
    bus, robinet actionné, code du temple trouvé...) restait figé pour de
    bon. Deux catégories, traitées différemment :
    1. Flags portés par la propriété `flag` d'un objet de la salle (canon,
       BRÈCHE, potion/cœur, fragment, trésor) : une seule boucle générique
       sur `this.room.map.objects` les remet tous à `false`, plutôt que
       d'énumérer chaque type comme avant (l'ancienne boucle ne couvrait
       QUE `canonBarriers`/`canonBlanks`).
    2. Flags lus/écrits directement dans le code, sans objet porteur (le
       robinet de `crue_01`, la défaite du mi-boss de `chapitre_01`, le
       code du temple et les couleurs du monde de `ratures_01`, la fin de
       `marge_01`) : remis à `false` explicitement, salle par salle.
    Volontairement épargné : les flags posés par les DIALOGUES (catégorie
    distincte, état de conversation) et `content_fin_actuelle` (simple
    marqueur méta "contenu vu", pas un obstacle de la salle — le réafficher
    à chaque restart de test serait juste bruyant). `flags.json` mis à jour
    en conséquence pour chaque flag concerné.
  - 247 tests (+13 : falling_debris.test.ts, nouveau describe salle_tresor
    dans tilemap.test.ts, tests crue_01 réécrits pour l'alcôve+porte plutôt
    que le corridor+trésor), `tsc`/`eslint`/`vite build` verts. **Pas de
    vérification Playwright cette passe non plus** (même consigne que le
    round précédent) — confiance basée sur les tests unitaires (géométrie
    des 2 salles vérifiée contre les données réelles régénérées, logique de
    chute/collision/round-robin couverte unitairement) et la relecture de
    code ; à confirmer par Lucas en jouant, notamment le rythme de la
    course contre les blocs (valeurs de `FALLING_DEBRIS` posées comme un
    premier passage raisonnable, pas calibrées en jeu réel) et si
    `restartLevel()` couvre bien tout ce qu'il attendait.
- **Trente-quatrième round (2026-07-29) — musique de fond + menu Options +
  bruitages synthétisés** : Lucas ajoute un fichier `src/fx/music/
  HackathonGameSong.mp3` et demande qu'il boucle tant que le jeu est actif,
  s'atténue quand le menu pause est ouvert, avec un menu Options pour le
  couper ; et suggère (« si jamais tu peux trouver ») des bruitages pour
  saut/dash/double saut/tir.
  - **Pas de recherche de fichiers audio externes** : je ne peux pas
    parcourir le web pour "trouver" des bruitages libres de droits à
    télécharger (pas d'outil de navigation/téléchargement binaire fiable
    ici, et la règle du projet interdit d'inventer des URLs). Choix
    cohérent avec D9 ("aucun asset", tout le rendu visuel est déjà dessiné
    au code) : les 4 bruitages sont synthétisés en Web Audio API
    (oscillateurs + glissando de fréquence), zéro fichier, zéro dépendance,
    zéro question de licence.
  - **`engine/audio.ts`** (nouveau, générique, comme Input/Pointer/
    Renderer) : `MusicPlayer` (HTMLAudioElement en boucle, volume = base ×
    atténuation temporaire, coupure indépendante) et `SfxPlayer`
    (AudioContext créé paresseusement au premier son, un oscillateur par
    bruitage). Seule `resolveChannelVolume` (calcul pur du volume à partir
    de muted/base/atténuation) est testée unitairement — le reste dépend
    d'API navigateur absentes de jsdom, même convention que game.ts/ui/*.
  - **Autoplay** : `MusicPlayer.tryPlay()` tente la lecture immédiatement
    à la construction ; si le navigateur bloque (aucun geste utilisateur
    encore reçu), un écouteur `pointerdown`/`keydown` posé une seule fois
    réessaie automatiquement — encapsulé dans `MusicPlayer` lui-même (une
    contrainte du navigateur, pas une préoccupation du jeu), `game.ts`
    n'appelle `tryPlay()` qu'une fois, au constructeur.
  - **Ducking pendant la pause** : `MusicPlayer.setDuckFactor` recalculé à
    CHAQUE frame dans `update()` (`this.mode === 'paused' ? ... : 1`)
    plutôt que sur les seules transitions de mode — évite un volume qui
    resterait bloqué atténué après un "Quitter" direct depuis le menu
    pause vers l'écran-titre.
  - **Réglage persistant** : nouveau `game/settings.ts` (même mécanisme que
    `save.ts` : `engine/save.ts` générique + schéma/validation ici), clé
    localStorage séparée des emplacements de sauvegarde (`musicMuted` est
    une préférence d'appareil, pas une progression de partie — reste donc
    coupée même après "Nouvelle partie" ou en changeant d'emplacement).
  - **Menu Options** : nouvelle vue partagée `ui/options_menu.ts` (même
    principe que `ui/slot_list.ts`, déjà réutilisé entre écran-titre et
    menu pause) — une bascule musique + "Retour". Accessible des DEUX
    côtés : `TitleView`/`PauseView` gagnent tous les deux `'options'`
    (`TITLE_MENU_OPTIONS`/`PAUSE_MENU_OPTIONS` gagnent une entrée
    "Options"). Reindexation du menu pause (Options inséré en position 3,
    Admin et Quitter décalés d'un cran) : vérifiée par relecture attentive
    du mapping index→action plutôt que par un passage Playwright (retour de
    Lucas du round précédent sur le coût de ces vérifications — une
    réindexation de menu est un risque mécanique traçable par lecture de
    code, contrairement à un bug de rendu qui ne se voit qu'à l'écran).
  - **Bruitages branchés** : saut au sol (même endroit que le burst de
    particules existant), double saut AILES (nouveau `prevAirJumpsUsed`,
    détecte le front 0→1 de `airJumpsUsed`, même principe que
    `prevDashTimer` déjà utilisé pour le burst de dash), dash HÂTE (même
    bloc que son burst existant), tir de projectile (mi-boss ET tourelles :
    comptage du nombre de projectiles avant/après `stepBoss`/`stepTurret`,
    un nouveau projectile suffit à savoir qu'un tir vient d'avoir lieu —
    pas besoin d'un évènement dédié dans ces modules purs). Pas de bascule
    dédiée pour les bruitages (la demande ne portait que sur la musique) ;
    `SfxPlayer.setMuted` existe mais n'est appelée nulle part pour
    l'instant.
  - **ACKNOWLEDGEMENTS.md** : ligne ajoutée pour le fichier musique,
    marquée `[TODO Lucas]` — je ne connais pas sa source/licence (ajouté
    directement par Lucas, pas via une session de code), à compléter par
    lui. Les bruitages synthétisés n'ont rien à référencer (aucun fichier).
  - 256 tests (+9 : audio.test.ts, settings.test.ts), `tsc`/`eslint`/
    `vite build` verts (le build confirme aussi que l'import Vite du fichier
    `.mp3` fonctionne : `dist/assets/HackathonGameSong-*.mp3` généré,
    fingerprint inclus). **Pas de vérification Playwright cette passe**
    (conforme au retour de Lucas) — et de toute façon peu utile ici : le
    son ne se voit pas sur une capture d'écran, seule une écoute réelle
    peut confirmer que la musique boucle, s'atténue en pause, et que les
    bruitages sonnent bien. La navigation des menus (Options depuis le
    titre et la pause, réindexation) a été vérifiée par relecture complète
    du mapping plutôt qu'en direct. À confirmer par Lucas en jouant, au
    casque/haut-parleurs : la musique boucle sans coupure audible au point
    de bouclage, le ducking en pause est perceptible, la coupure/reprise
    via le menu Options fonctionne dans les deux sens (titre et pause), et
    si les 4 bruitages synthétisés (de simples glissandos, pas des sons
    "réalistes") sont satisfaisants ou méritent d'être remplacés par de
    vrais fichiers audio plus tard.
- **Trente-cinquième round (2026-07-29) — la 2e porte de la salle aux
  trésors devient la fin du jeu** : deux réponses de Lucas.
  - `HackathonGameSong.mp3` est une composition originale de Lucas (créée
    quelques mois avant le projet) : `[TODO Lucas]` retiré
    d'`ACKNOWLEDGEMENTS.md`, aucun souci de licence.
  - **Fin du jeu** : la porte de sortie de `salle_tresor` (round 33) menait
    en boucle vers `crue_01` faute d'avoir un endroit où aller ; Lucas
    précise qu'elle devrait mener « à l'extérieur du temple », la vraie fin
    du jeu construit jusqu'ici, avec deux textes de clôture : POINT
    FINAL/indécis, l'enfant rapporte le trésor à son village et tout le
    monde est content ; RATURE, le pouvoir du trésor libère le mot du livre,
    qui devient libre de créer sa propre histoire.
  - Nouvelle propriété Tiled générique `endsGame` (`tools/gen_room_
    salle_tresor.mjs`, `porte_sortie_tresor`) : plus de `targetRoom`, cette
    porte ne transite nulle part. `checkDoors` (game.ts) l'intercepte avant
    la logique de transition et appelle `finalizeEnding()` (même principe
    que `finalizeChapter1` : l'issue RATURE/POINT FINAL se déduit du flag
    `rature_jamais` déjà posé en `marge_01`, pas un nouveau choix ; flag
    idempotent `jeu_termine`, remis à `false` par `restartLevel()` sur
    `salle_tresor` comme le reste de l'état mécanique des autres salles).
  - Nouveau mode `'ending'` (`Mode`, game.ts) : `showNarration` gagne un 2e
    paramètre optionnel `onClose?: 'ending'` — la narration de clôture
    (texte différent par chemin) se referme sur ce mode au lieu de
    `'playing'`. Gelé comme `'title'`/`'paused'` (aucune simulation, Échap
    sans effet) ; `updateEnding()` n'accepte qu'un seul geste (E, Espace ou
    clic) qui appelle directement `quitGame()` (réutilisé tel quel, retour
    à l'écran-titre). Rendu : nouveau `ui/ending_screen.ts` (même style que
    `title_menu.ts`/`options_menu.ts`, panneau + `panel()` dupliqué par
    convention du projet plutôt que partagé) affiché à la place du niveau
    (gameplay/HUD masqués comme en mode `'title'`, salle vide + parchemin
    nu derrière). Nouvel événement `game_ended` (`events.ts`), même
    principe que `chapter_ended`.
  - Textes marqués `[proposition]` (reformulation des idées de Lucas en
    phrases jouables, cohérentes avec le ton déjà établi par
    `finalizeChapter1` et sans aucun tiret, règle du projet) : à valider.
  - 256 tests (inchangé, un test de porte réécrit pour la nouvelle
    géométrie plutôt qu'ajouté), `tsc`/`eslint`/`vite build` verts (build
    revérifié pour confirmer que retirer `targetRoom`/`targetX`/`targetY`
    d'une porte ne casse rien). Pas de vérification Playwright (conforme au
    retour de Lucas du round 33) : la géométrie de la salle est couverte
    par un test unitaire réécrit contre les données réelles, et l'écran de
    fin lui-même suit exactement le même patron (état + rendu) que
    l'écran-titre déjà éprouvé visuellement par le passé. À confirmer par
    Lucas en jouant jusqu'au bout : le texte de fin sur les deux chemins,
    et l'écran de fin qui ramène bien à l'écran-titre au clic/à la touche.
- **Trente-sixième round (2026-07-29) — bug de chute en boucle après un
  écrasement, eau plus rapide, cinématique de fin RATURE** : trois retours
  de Lucas.
  - **Bug corrigé : se faire écraser par un rocher dans `salle_tresor`
    téléportait dans l'eau de `crue_01`, en boucle** (« pas agréable »).
    Cause : `handleCrushed()` passait par `failAndRespawn()`/`respawn()`,
    qui replacent le joueur à `this.checkpoint` — forcément dans `crue_01`
    (aucun encrier dans `salle_tresor`) — SANS jamais changer `this.room`.
    Le joueur se retrouvait donc aux coordonnées (souvent profondes) du
    puits tout en restant dans la petite salle-trésor (26×10 tuiles), hors
    de tout sol solide : `handleFall()` se redéclenchait aussitôt, qui
    rappelle `respawn()`, qui replace au même endroit... boucle infinie de
    chute. `handleCrushed()` ne passe plus par `respawn()` : réapparition
    locale au point de départ DE `salle_tresor` (son propre objet `spawn`),
    effondrement arrêté (`collapseActive=false`, `debrisField` neuf) et
    **trésor remis en place** (`collectedObjects`/flag réinitialisés, retour
    de Lucas : « avec le trésor remis en place ») — il faut recommencer la
    course depuis le début plutôt que de continuer une chute déjà entamée.
  - **Eau de `crue_01` accélérée** : `RISING_HAZARD.riseSpeed` 12→16 px/s
    (retour de Lucas : « un petit peu plus vite »), premier ajustement de
    calibrage depuis l'introduction de la mécanique (round 28, posée
    volontairement modeste faute de pouvoir tester le tracé à la souris).
  - **Cinématique de fin RATURE** (demande de Lucas : « une petite
    cinématique de notre personnage qui s'en va, qui sort du livre
    doucement, et qui disparaît dans un fondu au noir avec "Fin... pour
    l'instant !" ») : POINT FINAL/indécis garde l'écran de fin classique du
    round 35 (`drawEndingScreen`, panneau parchemin) ; RATURE gagne une
    séquence dédiée. Nouvel état `endingSceneState`
    (`'walking'`/`'fadingOut'`/`'done'`, posé par `updateNarration` au moment
    précis où la narration de clôture se referme, pas par `finalizeEnding`
    qui peut tourner bien avant que le joueur ait fini de lire) : le
    personnage marche (`renderEndingWalkAway`, réutilise telle quelle la
    silhouette articulée `drawMargeChildFigure` déjà écrite pour l'enfant de
    `marge_01` — cohérent avec « notre personnage », en espace vue puisque
    aucune caméra n'est active à cet endroit du pipeline de rendu), puis un
    fondu au noir (`PALETTE.ink`, aucune couleur inventée) recouvre l'écran,
    puis `drawRatureEndingText` (nouveau, `ui/ending_screen.ts`) affiche
    « Fin... pour l'instant ! » sur fond noir plutôt que le panneau
    parchemin — fin ouverte plutôt que définitive, cohérent avec le sens
    déjà établi de RATURE (le mot part écrire sa propre histoire, rien n'est
    clos). Nouveau groupe de constantes `ENDING_SCENE` (`config.ts`,
    walkSeconds/fadeSeconds/walkCycleHz). Un appui (E/Espace/clic) pendant
    la cinématique la saute directement au texte final (même convention que
    la narration qui s'affiche d'un coup au premier appui) ; `this.time`
    doit continuer d'avancer en mode `'ending'` (ajouté explicitement dans
    `update()`, contrairement à `'title'`/`'paused'` qui gèlent tout) pour
    que la progression de la cinématique se calcule.
  - 256 tests (inchangé, les 3 correctifs touchent au rendu/à l'équilibrage,
    pas à la logique pure testée), `tsc`/`eslint`/`vite build` verts. Pas de
    vérification Playwright : le tracé d'encre reste nécessaire pour
    atteindre ces salles (limite connue, non scriptable) ; la cinématique
    réutilise un mécanisme déjà éprouvé visuellement par le passé
    (`drawMargeChildFigure`). À confirmer par Lucas en jouant : que
    l'écrasement redonne bien un essai propre dans `salle_tresor` (plus de
    boucle), la nouvelle vitesse de l'eau, et le rythme/lisibilité de la
    cinématique RATURE (durées `[proposition]`, premier passage non
    calibré en jeu réel).
- **Trente-septième round (2026-07-29) — correction de la cinématique de fin
  avant même un premier essai** : deux retours de Lucas sur le round
  précédent.
  - **La cinématique RATURE utilisait la mauvaise silhouette** : round 36
    avait réutilisé `drawMargeChildFigure` (la silhouette articulée de
    l'enfant de `marge_01`) par réflexe, alors que Lucas voulait « notre
    personnage principal » — celui qu'on incarne (`renderPlayer`, la même
    forme d'encre qu'en jeu). Corrigé : `updateEnding()` repositionne
    directement `this.player.body` pendant l'état `'walking'` (simulation
    gelée en mode `'ending'`, rien d'autre n'y touche), `renderEndingWalkAway`
    se contente d'appeler `this.renderPlayer(ctx)`. `drawMargeChildFigure`
    reste utilisée telle quelle pour la scène de `marge_01` (non concernée).
    Bug latent corrigé au passage (trouvé en review, pas signalé par
    Lucas) : `landTimer` (squash à l'atterrissage) ne se décrémente que
    dans `updatePlaying`, jamais appelée en mode `'ending'` — sans reset
    explicite, un atterrissage juste avant la porte serait resté figé
    (squash visible) pendant toute la marche. `ENDING_SCENE` perd
    `walkCycleHz` (plus de cycle de marche à piloter, `renderPlayer` n'en a
    pas) et gagne `walkStartX`/`walkEndX`/`groundY` (positions en espace vue).
  - **Texte POINT FINAL enrichi** (Lucas : « juste un texte qui dit que
    l'enfant rentre à son village et offre le trésor à son peuple, devient
    un bon roi etc » ) : remplace l'ancien texte plus générique
    (`finalizeEnding`, game.ts). RATURE inchangé (déjà une cinématique
    dédiée, pas juste un texte).
  - Nettoyage : `drawEndingScreen` (`ui/ending_screen.ts`) ne sert plus
    QUE pour POINT FINAL/indécis depuis que RATURE a sa propre cinématique
    (round 36) — paramètre `kind`/type `EndingKind` devenus morts, retirés
    plutôt que laissés comme branche inatteignable.
  - 256 tests (inchangé), `tsc`/`eslint`/`vite build` verts (un
    `no-unnecessary-condition` d'ESLint attrapé au passage dans
    `updateEnding` : le narrowing de type sur `endingSceneState` rendait un
    second test d'égalité toujours vrai après le premier `if`/`else if`,
    simplifié). Pas de vérification Playwright (même limite qu'au round
    36 : ces salles nécessitent le tracé d'encre pour y accéder).
- **Trente-huitième round (2026-07-29)** — deux nouveaux retours de Lucas,
  toujours avant un premier playtest de la cinématique :
  - **Eau de `crue_01` encore accélérée** : `RISING_HAZARD.riseSpeed` 16→20
    px/s (« il faudrait qu'elle monte un peu plus vite encore » — 3ᵉ
    ajustement de cette valeur le même jour, 12→16→20).
  - **Bug corrigé : fond de page incomplet pendant la cinématique de fin
    RATURE** (« il faut élargir sur toute la surface le fond de page qu'il y
    a déjà »). Cause : `this.paper` (texture parchemin peinte une fois par
    salle, `createPaperTexture`) est dimensionnée à la salle COURANTE —
    `salle_tresor` fait 416×160 px, plus petit que la vue 480×270 — et le
    dessin habituel (`ctx.drawImage(this.paper, 0, 0)`, taille naturelle) ne
    couvrait donc pas tout l'écran, laissant un bord non peint visible
    pendant la marche du personnage. Corrigé dans `renderEndingWalkAway` en
    réutilisant EXPLICITEMENT la même texture mais étirée sur toute la vue
    (`ctx.drawImage(this.paper, 0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT)`,
    surcharge « taille de destination » de `drawImage`) plutôt qu'en créant
    une texture dédiée à la cinématique — exactement ce que Lucas demandait
    (« le fond de page qu'il y a déjà », pas un nouveau fond).
  - 256 tests (inchangé, deux ajustements de rendu/équilibrage), `tsc`/
    `eslint`/`vite build` verts. Pas de vérification Playwright (même
    limite qu'aux rondes 36-37).
