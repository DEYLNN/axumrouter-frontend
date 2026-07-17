# AxumRouter Frontend — Guide

## Overview

Admin dashboard for AxumRouter AI Gateway. React 19 + TypeScript 6 + Vite 8 + TailwindCSS 4.

## System Requirements

| Requirement | Minimal | Recomended |
|------------|---------|-----------|
| Node.js | 18+ | 22+ |
| npm | 9+ | 10+ |
| Backend | running (`localhost:3000`) | — |

## Setup

```bash
# 1. Masuk folder
cd ~/.hermes/projects/axumrouter/frontend

# 2. Install dependencies
npm install

# 3. Copy env
cp .env.example .env

# 4. (Opsional) Edit .env kalo backend gak di localhost:3000
# nano .env
```

## Config

### `.env`

```
VITE_API_BASE=http://localhost:3000/admin/api
VITE_GATEWAY_BACKEND_URL=http://localhost:3000
```

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE` | `/admin/api` | Backend admin API URL. Kosongin aja kalo pake Vite proxy (dev) |
| `VITE_GATEWAY_BACKEND_URL` | — | Gateway endpoint buat display di Endpoint page |

### Dev mode (Vite Proxy)
Kalo `VITE_API_BASE` dikosongin, Vite proxy redirect `/admin/api` → `localhost:3000` (sesuai `vite.config.ts`). Gak perlu set env buat dev.

### Production mode
Set `VITE_API_BASE` ke backend URL:
```
VITE_API_BASE=http://152.42.198.51:3000/admin/api
VITE_GATEWAY_BACKEND_URL=http://152.42.198.51:3000
```

## Commands

```bash
npm install        # Install deps (pertama kali atau abis pull)
npm run dev        # Dev server → http://localhost:5173
npx vite build     # Production build → dist/
npx tsc --noEmit   # Type-check doang (gak perlu nunggu build)
npm run lint       # Lint pake oxlint
```

## Run Modes

### Development
```bash
npm run dev
```
- Port: 5173
- Hot-reload
- Backend proxy via Vite (backend harus running)

### Production Build
```bash
npx vite build
```
Hasil di `dist/`. Isinya tinggal di-copy ke backend:

```bash
# Biar backend serve FE langsung
cp -r dist/* ../backend/public/admin/
```

Terus akses `http://localhost:3000/admin/` — backend yang serve FE build.

## Project Structure

```
frontend/
├── index.html
├── package.json
├── vite.config.ts              ← Vite config + proxy + Tailwind
├── tsconfig.json
├── tsconfig.app.json
├── .env.example
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   └── providers/              ← 63 icon provider (PNG)
├── src/
│   ├── main.tsx                ← Entry: render App ke #root
│   ���── App.tsx                 �� Router: 14 routes
│   ├── App.css / index.css     ← Global styles (Tailwind)
│   │
│   ├── api/                    ← Backend API layer (11 files)
│   │   ├── client.ts           ← apiFetch(), fetcher(), iconUrl()
│   │   ├── types.ts            ← Shared TypeScript interfaces
│   │   ├── index.ts            ← Barrel re-export
│   │   ├── providers.ts        ← Provider CRUD
│   │   ├── keys.ts             ← API key management
│   │   ├── gateway.ts          ← Gateway key CRUD
│   │   ├── oauth.ts            ← OAuth flow
│   │   ├── usage.ts            ← Usage stats + quota
│   │   ├── settings.ts         ← Toggle settings
│   │   ├── database.ts         ← DB export/import
│   │   └── auth-files.ts       ← OAuth auth files
│   │
│   ├─��� components/             ← Reusable UI (10 files)
│   │   ├─��� Layout.tsx          ← Sidebar + main content shell
│   │   ├── Modal.tsx           ← Generic modal wrapper
│   │   ├── ModelPickerModal.tsx
│   │   ├── OAuthConnectModal.tsx
│   │   ├── GatewayKeysSection.tsx
│   │   ├── ModelsSection.tsx
│   │   ├── DatabaseSection.tsx
│   │   ���── FeatureRow.tsx
│   │   ├── Loading.tsx
│   │   └── ErrorBox.tsx
│   │
│   ├── hooks/                  ← Custom hooks (2 files)
│   │   ├── useAsync.ts
│   │   └── useProviderDetail.ts
│   │
│   ├── pages/                  ← Route pages (14 files)
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Endpoint.tsx
│   │   ��── Providers.tsx
│   │   ├── ProviderDetail.tsx
│   │   ├── Playground.tsx
│   │   ├── Settings.tsx
│   │   ├── Logs.tsx
│   │   ├── Usage.tsx
│   │   ├── Quota.tsx
│   ��   ├── AuthFiles.tsx
│   │   ├── Combos.tsx
│   │   ├── ProxyPool.tsx       ← Stub (belum diimplement)
│   │   └── src/utils/
│   │
│   └��─ utils/
│       └── clipboard.ts        ← Copy to clipboard helper
│
└── dist/                       ← Build output (gitignored)
```

## Architecture

### API Layer
Semua komunikasi backend lewat `api/client.ts`:
- `apiFetch(url)` — fetch dengan prefix `API_BASE` + auth header
- `fetcher<T>(url)` — wrapper json response
- `iconUrl(name)` — resolve path icon provider

Auth token disimpan di `localStorage('token')`. Auto-redirect ke `/login` kalo 401.

### Routing
```
/login              → Login page
/admin              → Dashboard
/admin/endpoint     → Gateway endpoint info
/admin/providers    → Daftar provider
/admin/providers/:id → Detail + test + block model
/admin/settings     → Toggle RTK, Caveman
/admin/logs         → Request log viewer
/admin/usage        → Usage statistics
/admin/quota        → OAuth quota + token refresh
/admin/auth-files   → OAuth credential files
/admin/proxy-pool   → Proxy pool (stub)
/admin/playground   → Chat playground
/admin/combos       → Combo routing
```

### Components
- **Layout.tsx** — sidebar navigation + main content wrapper
- **Modal.tsx** — reusable `fixed inset-0 z-50` modal for all CRUD
- **OAuthConnectModal.tsx** — OAuth authorization flow
- **GatewayKeysSection.tsx** — largest component (18KB)

## Pages Details

### Providers
- Card grid tiap provider
- Search + filter
- Test model button
- Block/unblock model

### ProviderDetail
- Provider info + status
- Model list + block toggle
- API key management
- Test playground inline

### Endpoint
- Display gateway URLs
- Copy endpoint curl command
- Gateway key management

### Playground
- Chat interface
- Stream response display
- Model picker + parameter tweaks

## Deploy ke Backend

```bash
# 1. Build
cd ~/.hermes/projects/axumrouter/frontend
npx vite build

# 2. Copy hasil build ke backend
cp -r dist/* ../backend/public/admin/

# 3. Restart backend
pkill axumrouter && cd ../backend && ./target/release/axumrouter
```

Akses FE lewat `http://localhost:3000/admin/`.

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `npm install` gagal | Node version terlalu tua | `node -v` harus >= 18 |
| Blank page di dev | Backend gak running | Jalankan backend dulu |
| `VITE_API_BASE` not working | Proxy conflict | Set explicit URL atau hapus .env biar fallback ke proxy |
| 401 terus | Token expired | Hapus localStorage token, login ulang |
| API call 404 | Backend path beda | Cek `vite.config.ts` proxy target |
| Icon provider broken | Icon file missing | Cek `public/providers/` ada PNG gak |
| Build error `tsc --noEmit` | Type error | Fix type atau `skipLibCheck: true` |
| `Module not found` | Belum `npm install` | Jalankan `npm install` dulu |

## Key Files

| File | Purpose |
|------|---------|
| `src/main.tsx` | Entry point |
| `src/App.tsx` | Router — all routes |
| `src/api/client.ts` | API core: apiFetch, auth, icon resolver |
| `src/api/types.ts` | All shared TypeScript types |
| `src/components/Layout.tsx` | Sidebar + layout shell |
| `vite.config.ts` | Dev server, proxy, plugins |
| `public/providers/` | 63 provider icons |

## Related

| Resource | Path |
|----------|------|
| Frontend AGENTS.md | `AGENTS.md` |
| Backend | `../backend/` |
| Backend AGENTS.md | `../backend/AGENTS.md` |
| Backend GUIDE.md | `../backend/docs/GUIDE.md` |
