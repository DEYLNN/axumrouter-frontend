# AGENTS.md — AxumRouter Frontend

## Golden Rule
**Analisa dulu, edit setelah paham.** Sebelum ubah apapun, baca & pahami kode yang ada — struktur, aliran data, konteks.

## Philosophy
- **Clear** — readable > clever. Nama variable/fungsi jelas.
- **Clean** — DRY. Satu tanggung jawab per fungsi. No dead code.
- **Modern** — React 19, TS 6, fitur stabil terbaru.
- **Modular** — file < 500 baris. Gede? Pecah.
- **Maintainable** — kalo orang lain baca langsung ngerti.

## Before Any Edit
1. Baca struktur folder repo
2. Pahamin alur data: input → process → output
3. Identifikasi dependensi & side effects
4. Baru edit

## Conventions
- `npx tsc --noEmit` tiap abis edit
- Jangan leave commented code
- Props interface > inline types
- Barrel export (`index.ts`) per folder
- Commit terpisah per logical change

## Project
AxumRouter Frontend — admin dashboard untuk AI Gateway.
Git repo: `DEYLNN/axumrouter-frontend`

## Workspace
```
frontend/
├── src/
│   ├── api/           # Modular API layer (client.ts, types.ts, providers.ts, etc.)
│   ├── components/    # Reusable (Modal, Layout, ModelPicker, OAuthConnect, etc.)
│   ├── hooks/         # useProviderDetail, useAsync
│   ├── pages/         # Route pages (Endpoint, Settings, Providers, Playground, etc.)
│   ├── utils/         # Helpers
│   ├── assets/        # Static
│   ├── App.tsx
│   └── main.tsx
├── public/
├── .env.example
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Env
```
VITE_API_BASE=http://<host>:3000/admin/api
VITE_GATEWAY_BACKEND_URL=http://<host>:3000
```

## Commands
```bash
npm install        # Install deps
npm run dev        # Dev server (port 5173)
npx vite build     # Production build
npx tsc --noEmit   # Type-check
```

## API Layer
- `api/client.ts` → `apiFetch()` wrapper — all calls via `VITE_API_BASE`
- `api/types.ts` → shared TS types
- `api/index.ts` → barrel export
- All `fetch('/admin/...')` in code → use `apiFetch('/...')`

## Conventions
- `npx tsc --noEmit` after every edit (gak usah nunggu build error)
- Jangan hardcode API URL — selalu pake `VITE_API_BASE`
- Props interface > inline types buat component props
- Barrel export (`index.ts`) per folder
- `git commit` terpisah dari backend
