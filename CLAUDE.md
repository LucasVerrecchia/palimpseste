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
- Phase 2 : machinerie de pouvoirs/filigrane/ennemis/mi-boss + DA de fond +
  zone 3 (PNJ adaptatif) + clarté des 2 voies + reskin du mi-boss + bugs de
  playtest du dixième round terminées et corrigées. **Manquant pour la
  conformité au brief** : zones 4-6 (spec en prévoit 5 + climax, 3 salles
  construites — le niveau 3 "collecte" à deux variantes est à sa propre
  session de planification, cf. prompts_logs), `endings.ts`/`resolveEnding`
  + salle climax "La Page Blanche" + pouvoir POINT (2 fins obligatoires —
  `endingLeaning` déjà nourri par les mots-loi et le dialogue).
