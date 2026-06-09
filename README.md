# GammesCSV

Transformez vos fiches multimodales de terrain en gammes d'opérations industrielles structurées via IA.

Application web (React + Vite + TypeScript) qui récupère des fiches de terrain depuis l'API Gateway, génère des gammes d'opérations structurées à l'aide d'un assistant IA, et permet de les exporter en CSV ou en aperçu HTML.

## Prérequis

- Node.js (18+)
- Accès à l'API Gateway (authentification OAuth PKCE)

## Configuration

L'application est configurée via des variables d'environnement (préfixées `NEXT_PUBLIC_`). Copiez `.env.example` vers `.env` et renseignez les valeurs :

```bash
cp .env.example .env
```

| Variable                   | Description                                              | Exemple                          |
| -------------------------- | -------------------------------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | URL de base de l'API Gateway (sans `/api`)               | `https://gateway.example.com`    |
| `NEXT_PUBLIC_APP_ENV`      | Environnement applicatif : `qa` ou `production`          | `production`                     |

> Sans `NEXT_PUBLIC_API_BASE_URL`, toutes les requêtes API échouent silencieusement (l'URL de base devient vide).

Pour les déploiements, des fichiers `.env.production` et `.env.qa` peuvent être utilisés ; ils ne sont pas versionnés. Assurez-vous que votre cible de déploiement définit bien ces variables.

## Lancer en local

1. Installer les dépendances :
   ```bash
   npm install
   ```
2. Configurer le fichier `.env` (voir ci-dessus).
3. Démarrer le serveur de développement :
   ```bash
   npm run dev
   ```
   L'application est servie sur http://localhost:3000.

## Scripts

| Commande          | Description                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Serveur de développement (port 3000)     |
| `npm run build`   | Build de production dans `dist/`         |
| `npm run preview` | Prévisualiser le build de production     |
| `npm run lint`    | Vérification des types (`tsc --noEmit`)  |

## Déploiement

```bash
npm run build
```

Le build statique est généré dans `dist/` et peut être servi par n'importe quel hébergeur de fichiers statiques. Veillez à définir `NEXT_PUBLIC_API_BASE_URL` et `NEXT_PUBLIC_APP_ENV` dans l'environnement de build.

## Authentification

L'application utilise un flux OAuth 2.0 avec PKCE contre le portail d'authentification de la Gateway. Les jetons d'accès et de rafraîchissement sont stockés côté navigateur et rafraîchis automatiquement.
