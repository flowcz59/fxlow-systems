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
| `.github/workflows/deploy.yml` | Tests et déploiement automatique GitHub Pages |
| `.openai/hosting.json` | Configuration conservée de l’hébergement Sites précédent |

`dist/` contient les sources servies directement : il est versionné et se modifie sans compilation. Le son démarre uniquement après une action du visiteur. Le mode Focus garde la lecture silencieuse et mémorise l’étape sur l’appareil.

## Vérifications

Les scripts utilisent Node.js, Playwright et Chromium. Installer les dépendances de test :

```sh
npm ci
npx playwright install chromium
```

Avec le serveur local démarré dans un autre terminal, lancer les trois suites :

```sh
npm test
```

Les tests attendent le serveur sur le port 4317 ; `TEST_URL` permet de choisir une autre adresse. Si Chromium se trouve dans un emplacement particulier, renseigner `PLAYWRIGHT_CHROMIUM_EXECUTABLE` avec son chemin. Les captures, rapports et rendus audio sont écrits dans `.qa/`, ignoré par Git.

## Polices

Les polices DM Sans et Space Grotesk sont distribuées sous SIL Open Font License 1.1. Leurs notices sont conservées dans `dist/assets/licenses/`, à côté des fichiers distribués.

- [DM Sans — licence et auteurs](https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt)
- [Space Grotesk — licence et auteurs](https://github.com/google/fonts/blob/main/ofl/spacegrotesk/OFL.txt)

## Publication

Chaque push sur **`main`** déclenche le workflow [Test and deploy portfolio](https://github.com/flowcz59/fxlow-systems/actions/workflows/deploy.yml) :

1. Installation des dépendances de test et de Chromium.
2. Vérification du mode Focus et du moteur audio.
3. Publication de `dist/` sur **GitHub Pages**, uniquement si les tests réussissent.

Les pull requests lancent les tests sans publier. Il est aussi possible de relancer le workflow depuis l’onglet **Actions**. Un échec de test laisse en ligne le dernier déploiement réussi.

Les actions sont épinglées sur des commits précis. Le job de test peut seulement lire le dépôt ; le job de publication reçoit les permissions Pages/OIDC nécessaires. Aucun jeton personnel ni secret d’hébergement n’est requis dans le dépôt.

Le domaine canonique est `fxlow.systems`. Son raccordement demande les enregistrements OVH suivants :

Tant que ces DNS pointent vers l’ancien hébergement Sites, les push publient sur GitHub Pages mais ne changent pas le contenu servi par `fxlow.systems`. La bascule DNS est une opération unique, indépendante des push suivants.

| Nom | Type | Cible |
| --- | --- | --- |
| `@` | `A` | `185.199.108.153` |
| `@` | `A` | `185.199.109.153` |
| `@` | `A` | `185.199.110.153` |
| `@` | `A` | `185.199.111.153` |
| `www` | `CNAME` | `flowcz59.github.io.` |

Les entrées de messagerie restent indépendantes. Voir la [documentation GitHub sur les domaines personnalisés](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

La configuration Sites précédente est conservée pour référence. Les publications courantes passent par GitHub Actions.

## Version de départ

Cette copie reprend la version publiée **12**, issue du commit `6a2923f58c315d39a06ec0f5c643199e0f01488c`, avec l’historique de développement et le CV servi par le site.

Dans cette copie publique, les adresses d’auteur et de committer utilisent l’adresse masquée GitHub du propriétaire. Des renseignements personnels retirés du site actuel ont également été supprimés des anciennes versions. Les identifiants des commits diffèrent donc de ceux du dépôt d’hébergement ; le code de la version publiée de départ reste identique.
