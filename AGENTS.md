# AGENTS.md — AxumRouter Frontend

## Project
AxumRouter Frontend — admin dashboard untuk AI Gateway (BE: Rust/Axum di port 7444).

## Workspace (real file tree, 2026-07-28)
```
frontend/
├── src/
│   ├── api/             # API layer (10 active files)
│   │   ├── client.ts        # apiFetch + fetcher + iconUrl
│   │   ├── types.ts         # shared TS types
│   │   ├── custom-providers.ts, database.ts, gateway.ts
│   │   ├── keys.ts, oauth.ts, providers.ts, settings.ts, models.ts
│   │   ├── usage.ts         # Usage page API (restored 2026-07-28)
│   │   └── index.ts         # barrel re-export
│   ├── components/      # Reusable (10 files)
│   │   ├── Layout.tsx
│   │   ├── Loading.tsx, ErrorBox.tsx, Modal.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── ModelsSection.tsx, ModelPickerModal.tsx
│   │   ├── DatabaseSection.tsx, GatewayKeysSection.tsx
│   │   ├── OAuthConnectModal.tsx, FeatureRow.tsx
│   ├── hooks/           # useAsync, useProviderDetail
│   ├── pages/           # 8 active pages
│   │   ├── Dashboard.tsx       # /admin
│   │   ├── Endpoint.tsx        # /admin/endpoint
│   │   ├── Providers.tsx       # /admin/providers
│   │   ├── ProviderDetail.tsx  # /admin/providers/:id
│   │   ├── Settings.tsx        # /admin/settings
│   │   ├── Usage.tsx           # /admin/usage (restored 2026-07-28)
│   │   ├── ProxyPool.tsx       # /admin/proxy-pool
│   │   └── Login.tsx
│   ├── utils/           # clipboard
│   ├── App.tsx
│   └── main.tsx
├── public/              # Vite static assets + provider icons
├── .env.example
├── package.json         # React 19.2.7, react-router-dom 7.18.1, Tailwind 4.3.2
├── tsconfig.json
├── vite.config.ts
└── oxlintrc.json
```

## Recent changes
- **2026-07-30**: Custom models now merged in Settings → Models page. Fallback
  `[]` for providers with zero models (no more "Loading models..." spinner).
  `/admin/api/providers/:id/custom-models` CRUD endpoints wired.
- **2026-07-28**: Restored `pages/Usage.tsx` + `api/usage.ts` from legacy.
  Wired route `/admin/usage` + sidebar nav link. Backend now exposes
  `/admin/api/usage/stats`, `/admin/api/usage/keys`, `/admin/api/logs`.
- **2026-07-28**: Removed providers/list-detail split — still 5 admin
  concerns under `admin/routes/providers/` (list/detail/validate/test/block).

## Env
```
VITE_API_BASE=           # empty = use relative /v1 + Bearer token
VITE_GATEWAY_BACKEND_URL=http://157.173.124.46:7444
```

## Commands
```bash
npm install               # Install deps
npm run dev               # Dev server (port 5173)
npm run build             # tsc -b && vite build
npm run lint              # oxlint
npx tsc --noEmit          # Type-check (run after every edit)
```

## API Layer
- `api/client.ts` → `apiFetch(url, init?)` wrapper — all calls go via
  `VITE_API_BASE`. Pass `Authorization: Bearer <token>` explicitly.
- `api/types.ts` → shared TS types
- `api/index.ts` → barrel re-export of all domain fns
- All `fetch('/admin/...')` in code → use `apiFetch('/admin/...')`

## Conventions
- `npx tsc --noEmit` after every edit (don't wait for build error)
- Jangan hardcode API URL — selalu pake `VITE_API_BASE`
- Props interface (not inline types) for component props
- Barrel export (`index.ts`) per folder
- Tailwind v4 — `@import "tailwindcss"` di CSS, no config file
- React 19 — `use()` hook for promises/context
- Path alias: `@/` → `src/` (configured in Vite)

## Provider-agnostic principle
Backend exposes generic primitives — `gateways`, `usage`, `models`, `keys`,
`services`. FE mirrors them in `api/*`. When BE adds a new provider type
or OAuth flow, FE shouldn't need to change. Custom provider CRUD lives
in admin only (no extra front-end routes needed).
