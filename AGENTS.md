# Repository Guidelines

## Project Structure & Module Organization

- `src/react-app/` contains the React UI, organized into `components/`, `hooks/`, `api/`, `utils/`, and shared `types.ts`.
- `src/worker/index.ts` contains the Cloudflare Worker entry point and runtime configuration handling.
- `tests/` contains Vitest unit and integration tests; use `.test.ts` or `.test.tsx` filenames.
- `public/` holds static assets. Build and deployment configuration lives in `vite.config.ts`, `vitest.config.ts`, and `wrangler.json`.
- `specs/` contains project specifications for behavior covered by a spec.

## Build, Test, and Development Commands

Run commands from the repository root after `npm install` (or `npm ci` for a clean checkout):

- `npm run dev` starts the Vite development server.
- `npm test` runs the full Vitest suite once; `npx vitest` runs it in watch mode.
- `npm run lint` runs ESLint across the repository.
- `npm run format` formats TypeScript, TSX, and CSS files; `npm run format:check` verifies formatting.
- `npm run build` runs TypeScript project builds and creates production assets.
- `npm run check` runs type checking, the Vite build, and a Wrangler dry-run deployment.
- `npm run deploy` deploys the Worker through Wrangler.

## Coding Style & Naming Conventions

Use TypeScript with tabs, double quotes, semicolons, trailing commas, and a 100-character print width, as configured in `.prettierrc`. Components and views use PascalCase (`TransactionsView.tsx`); hooks use `use` plus PascalCase (`useTransactionActions.ts`); utilities and tests use descriptive camelCase names. Keep API access in `src/react-app/api/`, reusable logic in hooks or `utils/`, and avoid business logic directly in JSX.

Run `npm run format:check` and `npm run lint` before submitting changes.

## Testing Guidelines

Use Vitest, React Testing Library, and jsdom. Tests run with `Asia/Jakarta` for stable local-date behavior and mock API calls, so no backend is required. Add regression coverage for bug fixes and test user-visible behavior through React Testing Library. Run `npm test -- tests/<file>.test.tsx` to target a file.

## Commit & Pull Request Guidelines

Recent commits use short, imperative descriptions such as `Add income vs expense chart`; follow that style and keep commits focused. Pull requests should explain the behavior change, list validation commands, link a related issue when available, and include screenshots or recordings for UI changes. Call out `BACKEND_URL` or Wrangler changes.

## Security & Configuration Tips

Use `.dev.vars.example` to create local `.dev.vars`. Do not commit secrets. `BACKEND_URL` is intentionally exposed to the browser, so never place credentials, query parameters, or fragments in it; configure backend CORS for each deployed frontend origin.
