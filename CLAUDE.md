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
- Phase 2 : machinerie de pouvoirs/filigrane/ennemis/mi-boss + DA de fond
  terminées et playtestées. **Manquant pour la conformité au brief** : PNJ
  secondaire + dialogues (aucun n'existe encore), zones/niveaux
  supplémentaires (spec en prévoit 5 + climax, 2 salles construites),
  `endings.ts`/`resolveEnding` + salle climax "La Page Blanche" + pouvoir
  POINT (2 fins obligatoires). Prochaine étape à discuter avec Lucas (voir
  session en cours).
