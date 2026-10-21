# FXLOW

Portfolio de **Florian Cazé — Design System Expert**.

**Je relie le design et le code.** Design systems, tokens & outils maison.

Site en ligne : [fxlow.systems](https://fxlow.systems/).

## Lancer le site en local

Le portfolio est un site statique en HTML, CSS et JavaScript. Aucun build ni service backend n’est nécessaire.

Depuis la racine du dépôt, avec Python 3 installé :

```sh
python3 -m http.server 4317 --bind 127.0.0.1 --directory dist
```

Ouvrir `http://127.0.0.1:4317/`. Utiliser un serveur HTTP, plutôt que d’ouvrir directement le fichier HTML, pour charger les modules audio.

## Organisation

| Dossier ou fichier | Contenu |
| --- | --- |
| `dist/index.html` | Contenu du portfolio |
| `dist/*.css` | Identité visuelle, responsive et typographie |
| `dist/app.js` | Interactions générales et vinyle |
| `dist/focus.js`, `dist/focus.css` | Lecture par étapes et mémorisation locale |
| `dist/lab.js`, `dist/lab.css` | Laboratoire de design tokens |
| `dist/sound.js`, `dist/sound-engine.js` | Séquenceur et synthèse Web Audio |
| `dist/assets/` | Polices, CV PDF, favicon et aperçus de partage |
| `assets-source/` | Source HTML de l’aperçu de partage |
| `tests/` | Vérifications du mode Focus, des contrôles audio et du rendu audio hors ligne |
| `.openai/hosting.json` | Identifiant du site existant et dossier statique à publier |

`dist/` contient les sources servies directement : il est versionné et se modifie sans compilation. Le son démarre uniquement après une action du visiteur. Le mode Focus garde la lecture silencieuse et mémorise l’étape sur l’appareil.

## Vérifications

Les scripts existants utilisent Node.js, le paquet `playwright` et Chromium. Les tests navigateur attendent le serveur local sur le port 4317 ; `TEST_URL` permet de choisir une autre adresse.

```sh
node tests/focus-browser.cjs
node tests/sound-browser.cjs
node tests/sound-offline.cjs
```

Si Chromium se trouve dans un emplacement particulier, renseigner `PLAYWRIGHT_CHROMIUM_EXECUTABLE` avec son chemin. Les captures et rendus produits par les tests sont écrits dans les dossiers indiqués par les scripts, en dehors de `dist/`.

## Publication

Le site est actuellement hébergé par **Sites**, avec le domaine `fxlow.systems`. Le dépôt conserve la configuration de ce site existant.

Un push GitHub sauvegarde les sources et leur historique. Il ne déclenche pas de publication : aucun déploiement automatique GitHub n’est configuré. La publication reste une étape distincte via Sites.

Pour un autre hébergement statique, servir le contenu de `dist/`. La migration du domaine et de l’hébergement doit être configurée séparément.

## Version de départ

Cette copie reprend la version publiée **12**, issue du commit `6a2923f58c315d39a06ec0f5c643199e0f01488c`, avec l’historique de développement et le CV servi par le site.
