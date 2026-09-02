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
- Cloudflare Workers / Pages (optional deployment target)

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
The deployed frontend reads its backend URL from `/runtime-config.json`. The Worker creates that response from its `BACKEND_URL` runtime variable, so the same build can be deployed to multiple Workers.

For each Worker, go to **Settings > Variables and Secrets > Runtime variables and secrets** and add:

```text
Name:  BACKEND_URL
Type: Text / Variable
Value: https://your-backend.example.com
```

Use the backend origin or path prefix that should be followed by `/accounts`, `/categories`, and the other API paths. Do not include credentials, query parameters, or a fragment. `BACKEND_URL` is not a secret: it is intentionally returned to the browser. Do not put API keys or passwords in it.

For local Worker development, create `.dev.vars` using `.dev.vars.example` as a reference. Alternatively, set `VITE_API_URL` locally; it is used only by `npm run dev` and is not used by production builds.

Deployment
Build and deploy the Worker with:

```bash
npm run build
npm run deploy
```

For Cloudflare Workers Builds, use `npm run build` as the build command and `npm run deploy` as the deploy command. Configure `BACKEND_URL` under the Worker's runtime variables, not under **Build variables and secrets**. Build variables are only available while compiling the application and cannot provide a runtime Worker binding.

Each Worker can use a different `BACKEND_URL` without rebuilding the frontend. The Worker name in each deployment must also match the Wrangler configuration used for that deployment.

Direct backend requests
The Worker does not proxy API requests. After loading the runtime configuration, the browser sends requests directly to `BACKEND_URL`. Therefore, configure the backend CORS policy to allow every frontend Worker origin, for example each `https://<frontend-worker>.workers.dev` URL. A backend URL or API credential cannot be used as a browser secret.

Contributing
Contributions are welcome. Please open issues or PRs for fixes and improvements.

License
Specify your project license here (for example, MIT).
