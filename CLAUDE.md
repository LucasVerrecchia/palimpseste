# Palimpseste — contexte projet (lis-moi à chaque session)

## Ce qu'on construit
Metroidvania web ~1h-1h30, thème "manuscrit vivant / palimpseste".
Voir Palimpseste_SPEC.md pour la spec complète.

## Règles techniques non négociables
- TypeScript strict, Vite, Canvas 2D. ZÉRO dépendance runtime sans justif écrite.
- Séparation engine/ (générique) vs game/ (Palimpseste). engine n'importe jamais game.
- Data-driven : niveaux (Tiled JSON), dialogues, pouvoirs, flags = fichiers /src/data.
- Boucle à pas de temps fixe. Logique métier en fonctions pures + tests Vitest.
- Résolution interne 480x270, tuiles 16x16, pixel-perfect (pas de lissage).

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

## État d'avancement
- Phase 0 (fondations) : démarrée le 2026-07-05.
- Phases 1-4 : à venir (attendre validation humaine entre chaque phase).
