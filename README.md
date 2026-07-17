# AxumRouter Frontend

Admin dashboard for AxumRouter AI Gateway. React 19 + TypeScript 6 + Vite 8 + TailwindCSS 4.

## Quick Start

```bash
npm install        # Install deps
npm run dev        # Dev → http://localhost:5173
npx vite build     # Production → dist/
```

## Prerequisites

- Node.js >= 18
- Backend AxumRouter running di `localhost:3000`

## Env

Copy `.env.example` ke `.env` — atau biarkan kosong (pake Vite proxy ke backend).

## Documentation

| Doc | Location |
|-----|----------|
| **Full Guide** | `docs/GUIDE.md` — setup, config, struktur, deploy |
| **Project Rules** | `AGENTS.md` — konvensi, api layer |

## Project

```
frontend/
├── src/
│   ├── main.tsx         ← Entry point
│   ├── App.tsx          ← Router (14 routes)
│   ├── api/             ← Backend API layer (client.ts, types.ts, + 9 domain files)
│   ���── components/      ← Reusable: Layout, Modal, OAuthConnect, GatewayKeys, dll
│   ├── hooks/           ← useAsync, useProviderDetail
│   ├── pages/           ← 14 route pages
│   └── utils/           ← clipboard helper
├── public/
│   └── providers/       ← 63 provider icons
└── vite.config.ts       ← Proxy + Tailwind + plugins
```

## Tech Stack

| Tech | Version |
|------|---------|
| React | 19 |
| TypeScript | 6 |
| Vite | 8 |
| TailwindCSS | 4 |
| react-router-dom | 7 |
| oxlint | 1 |

## Related

- Backend: `../backend/`
- Backend AGENTS.md: `../backend/AGENTS.md`
