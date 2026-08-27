# Money Manager — Frontend

A lightweight React + Vite frontend for the Money Manager application. This repository contains the TypeScript-based UI used to view, create, and manage budgets, transactions, and accounts.

Key goals:
- Fast local development with Vite
- Type-safe code using TypeScript
- Simple, component-driven UI built with React

Tech stack
- React
- TypeScript
- Vite
- CSS

Features
- View account balances and transaction history
- Create, edit, and remove transactions
- Categorize transactions and track spending by category
- Responsive design for desktop and mobile

Getting started

Clone the repo and install dependencies:

```bash
git clone https://github.com/chrisferbia/money-manager-fe.git
cd money-manager-fe
npm install
```

Run the development server:

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

Available scripts
- npm run dev — start Vite dev server
- npm run build — build production assets
- npm run preview — preview the production build locally
- npm run lint — run ESLint (if configured)

Environment
If the app needs an API backend, configure the API base URL via an environment variable. Create a .env file in the project root (this repo uses Vite semantics):

```env
VITE_API_BASE_URL=https://api.example.com
```

Replace the value with your backend URL. Restart the dev server after changing environment variables.

Deployment
The frontend can be deployed to any static-hosting service that supports single-page apps (Netlify, Vercel, GitHub Pages, Cloudflare Pages, etc.). Build and deploy:

```bash
npm run build
# then follow your host's deployment instructions (upload the dist/build folder or connect the repo)
```

Contributing
Contributions are welcome. Please open issues or PRs for fixes and improvements.

License
Specify your project license here (for example, MIT).
