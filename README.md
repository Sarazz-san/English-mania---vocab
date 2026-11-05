# English Mania — Vocabulaire anglais-français

Une application web pour enrichir son vocabulaire anglais, mémoriser les mots appris et suivre ses révisions.

## Fonctionnalités

- **Dictionnaire bilingue** : recherche et traduction anglais-français ou français-anglais, avec exemples, catégorie grammaticale et registre.
- **Révisions espacées** : révisez vos mots au bon moment grâce à un système de répétition espacée et suivez votre progression.
- **Gestion du vocabulaire** : ajoutez, consultez et organisez vos mots et expressions.
- **Jeu de mémorisation** : entraînez-vous avec le mode Match.
- **Tableau de bord** : retrouvez vos révisions et votre progression.
- **Mode clair et sombre**.

Les mots et la progression sont enregistrés localement dans le navigateur avec IndexedDB.

## Technologies

React, TypeScript, Vite, Tailwind CSS, Dexie et Express. Le dictionnaire utilise l’API Google Gemini.

## Prérequis

- Node.js et npm
- Une clé API Google Gemini pour utiliser la recherche du dictionnaire

## Installation et démarrage

```bash
git clone https://github.com/Sarazz-san/English-mania---vocab.git
cd English-mania---vocab
npm install
```

Créez un fichier `.env` à la racine et ajoutez votre clé Gemini :

```dotenv
GEMINI_API_KEY=votre_cle_api_gemini
```

Lancez l’application en mode développement :

```bash
npm run dev
```

L’application est ensuite disponible à l’adresse indiquée dans le terminal (le serveur écoute par défaut sur le port `3000`).

## Scripts disponibles

| Commande | Description |
| --- | --- |
| `npm run dev` | Démarre le serveur de développement. |
| `npm run lint` | Vérifie les types TypeScript. |
| `npm run build` | Construit l’application pour la production. |
| `npm run start` | Démarre le serveur de production après le build. |

## Configuration

Le dictionnaire nécessite `GEMINI_API_KEY` côté serveur. Un modèle de configuration est disponible dans [`.env.example`](.env.example). Ne publiez pas votre clé API et ne la placez pas dans le code client.
