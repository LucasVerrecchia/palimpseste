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
  dialogue à hauteur dynamique. Textes = [proposition] à valider. 75 tests.
  **En attente de playtest.**
- Phases 2-4 : à venir (attendre validation humaine entre chaque phase).
