# Palimpseste

> Le monde est un manuscrit écrit, effacé, réécrit d'innombrables fois par un
> Auteur absent. Tu es *le Dernier Mot* — et le brouillon attend sa fin.

Mini-Metroidvania web (~1h–1h30) réalisé dans le cadre du cours **Usage IA Gen**.
TypeScript strict · Vite · Canvas 2D · **zéro dépendance runtime**.
Rendu vectoriel « manuscrit moderne » entièrement dessiné au code (aucun asset).

## Lancer le projet

```sh
npm install       # une seule fois
npm run dev       # serveur de dev (ouvre l'URL affichée)
```

## Autres commandes

```sh
npm test          # tests unitaires (Vitest)
npm run lint      # ESLint (strictTypeChecked)
npm run build     # type-check (tsc) + build production dans dist/
npm run preview   # sert le build de production
```

## Contrôles
| Action | Entrée |
|---|---|
| Se déplacer | ← / → (ou Q/D — position physique A/D) |
| Sauter | Espace (relâcher tôt = saut court) |
| Interagir / parler / encrier | E |
| **Tracer de l'encre** | **Clic gauche maintenu** (dans la portée autour de toi) |
| **Effacer l'encre (récupère l'encre)** | **Clic droit maintenu** |
| Revenir au dernier encrier | R |
| Naviguer dans les choix de dialogue | ↑ / ↓ puis E |

Dans la salle « La Marge » : parle au PNJ, ramasse le mot **ÉCRIRE**, puis
**dessine tes propres ponts d'encre à la souris** pour franchir les deux vides.
Le budget d'encre ne suffit pas pour les deux d'un coup : **efface ton premier
pont (clic droit) pour récupérer l'encre** et financer le second. L'encrier
recharge et fait office de point de retour (R). Un fragment secret, bien
visible, se gagne en traçant un escalier vers le haut. À sec, tracer puise dans
tes PV (le « délavage »).

## Documentation
- `Palimpseste_SPEC.md` — spec complète et plan de build par phases
- `CLAUDE.md` — mémoire de projet pour l'assistant IA
- `docs/architecture.md` — décisions techniques
- `docs/risk_analysis.md` — risques et mitigations
- `docs/feasibility_report.md` — étude de faisabilité (Livrable 1)
- `prompts_logs/` — traçabilité complète des sessions IA
- `ACKNOWLEDGEMENTS.md` — licences des assets et outils

## État d'avancement
- ✅ **Phase 0** — fondations (outillage, canvas 480×270 pixel-perfect, docs)
- ✅ **Phase 1** — prototype vertical (1 salle, physique swept, ÉCRIRE, 1 PNJ, save)
- ⬜ Phase 2 — verticale de jeu complète
- ⬜ Phase 3 — narration, fins, feel
- ⬜ Phase 4 — qualité, docs, build final
