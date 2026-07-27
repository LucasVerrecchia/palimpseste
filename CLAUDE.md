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
  zone 3 (PNJ adaptatif, désormais finalisée) + clarté des 2 voies + reskin
  du mi-boss + bugs de playtest terminées et corrigées. **Manquant pour la
  conformité au brief** : zones 4-6 (spec en prévoit 5 + climax, 3 salles
  construites), `endings.ts`/`resolveEnding` + salle climax "La Page
  Blanche" + pouvoir POINT (2 fins obligatoires — `endingLeaning` déjà
  nourri par les mots-loi et le dialogue). Note : la spec dérive déjà de
  l'implémentation réelle sur plusieurs points (ANCRE supprimé, BRÈCHE/HÂTE
  enseignés en zone 2 au lieu des zones 3/5 prévues) — à clarifier avec
  Lucas avant de construire ces zones plutôt que suivre la spec au pied de
  la lettre.
