# Palimpseste — Analyse de risques

| # | Risque | Probabilité | Impact | Mitigation |
|---|--------|-------------|--------|------------|
| R1 | Scope creep (jeu trop gros pour le délai) | Haute | Haut | Phases strictes avec critères d'acceptation ; couper le contenu, pas la propreté ; 5 zones = plafond dur |
| R2 | Tunneling de collision à grande vitesse | Moyenne | Moyen | Collision *swept* implémentée dès la Phase 1 + test unitaire dédié |
| R3 | Incohérence visuelle des assets IA | Haute | Moyen | Palette imposée (6 couleurs) ; tout asset recoloré ; placeholders codés d'abord |
| R4 | Perte d'historique de save entre versions | Moyenne | Moyen | Schéma de save versionné (`version: number`) + migration/fallback si version inconnue |
| R5 | Traçabilité IA négligée (20 % de la note) | Moyenne | Haut | Log systématique en fin de session dans `/prompts_logs/` ; workflow phase par phase |
| R6 | Licences d'assets non conformes | Faible | Haut | CC0/original uniquement ; `ACKNOWLEDGEMENTS.md` tenu à jour à chaque ajout |
| R7 | Les 2 fins semblent plaquées | Moyenne | Moyen | `endingLeaning` nourri par des choix réels tout au long du jeu ; `resolveEnding` = fonction pure testée |
| R8 | Perf sur petites machines | Faible | Moyen | Résolution interne basse (480×270) ; zéro framework ; profilage dès la Phase 2 |

## Suivi
- **2026-07-05 (Phase 0)** : R2 anticipé (la signature de `physics.ts` sera swept dès le départ) ; R5 adressé (logs en place) ; R6 adressé (ACKNOWLEDGEMENTS créé).
- **2026-07-05 (Phase 1)** : R2 clos — collision swept implémentée et testée (tests anti-tunneling horizontaux/verticaux à vitesse 100 000 px/s). R4 adressé — save versionnée avec fallback testé (version inconnue → nouvelle partie).
