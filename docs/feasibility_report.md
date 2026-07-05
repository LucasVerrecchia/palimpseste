# Palimpseste — Étude de faisabilité (Livrable 1)

> Squelette à compléter avant export PDF.

## 1. Présentation du projet
- **Titre** : Palimpseste
- **Genre** : platformer Metroidvania léger, web, ~1h–1h30 de jeu.
- **Prémisse** : le monde est un manuscrit inachevé ; le joueur est le Dernier Mot
  écrit avant l'abandon du brouillon, en quête de la phrase qui achèverait le monde.
- **Verbe central** : gérer une réserve d'encre pour **Écrire** (matérialiser) et
  **Effacer** (révéler le brouillon d'en dessous).

## 2. Conformité au brief
| Exigence | Réponse |
|---|---|
| ≥ 2 fins alternatives | LE POINT FINAL / LA RATURE (+ LE PALIMPSESTE en bonus) |
| Pouvoirs à débloquer | 6 mots-pouvoirs (ÉCRIRE, BRÈCHE, HÂTE, ANCRE, ALES, POINT) |
| PNJ secondaire narratif | 5 PNJ prévus (Relieuse, Personnage Secondaire, etc.) |
| Storyline cohérente avec les fins | `endingLeaning` nourri par les choix écrire/effacer |
| Pas de clone / pas d'assets protégés | Concept original ; assets originaux ou CC0 recolorés |

## 3. Faisabilité technique
- **Stack** : TypeScript strict + Vite + Canvas 2D, zéro dépendance runtime. Validée
  en Phase 0 : canvas 480×270 pixel-perfect + scaling entier + tests + lint opérationnels.
- **Points durs identifiés** : collision swept (anti-tunneling), couches en filigrane
  (mécanique signature), routage des fins. Tous isolables en fonctions pures testables.

## 4. Faisabilité planning
| Phase | Contenu | Livrable |
|---|---|---|
| 0 | Fondations, outillage, docs | Livrable 1 ✅ |
| 1 | Prototype vertical (1 salle, 1 pouvoir, 1 PNJ) | Livrable 2 |
| 2 | 5 zones blockout, tous pouvoirs, 1 boss | — |
| 3 | Narration complète, 2 fins, audio/juice | — |
| 4 | Qualité, docs finales, build | Livrable final |

## 5. Risques
Voir `risk_analysis.md` (résumé : scope creep = risque principal, mitigé par le
découpage en phases à critères d'acceptation).

## 6. Usage de l'IA et traçabilité
- Claude Code (Anthropic) comme assistant de développement, phase par phase.
- Tous les échanges loggués dans `/prompts_logs/` ; licences dans `ACKNOWLEDGEMENTS.md`.
- Aucune donnée personnelle envoyée aux LLM (conformité RGPD).

## TODO avant export PDF
- [ ] Ajouter maquette/croquis d'une salle (même placeholder).
- [ ] Valider le planning avec les dates réelles de rendu du cours.
- [ ] Relecture humaine complète.
