# WealthPath 🌿

**India-first FIRE & retirement planning app** — helps you calculate your Financial Independence number, optimise taxes, track investments, and visualise your path to early retirement.

> ⚠️ For educational purposes only. Not investment advice.

---

## Features

- **FIRE Calculator** — corpus target, monthly SIP needed, retirement timeline with India-specific defaults (6% inflation, 3.33% withdrawal rate, life expectancy 85)
- **Tax Planner** — old vs new regime comparison, 80C deduction tracker, HRA calculation (FY 2025-26)
- **Investment Tracker** — portfolio overview, asset allocation, per-investment cards with lock-in badges
- **Health Score** — 0–100 score based on savings rate, emergency fund, diversification, and FIRE progress
- **Profile & Edit** — update personal details, income/expenses, and retirement goals at any time
- **OTP Auth** — phone number login with JWT (15 min access + 30 day refresh tokens)

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Mobile | React Native + Expo SDK 51 (TypeScript) |
| Backend | NestJS (TypeScript) |
| Database | SQLite via Prisma (POC) → PostgreSQL (prod) |
| State | Zustand |
| Navigation | React Navigation v6 |

---

## Project Structure

```
wealthPath/
├── backend/                  # NestJS API (port 3000)
│   ├── prisma/               # Schema + migrations
│   └── src/
│       └── modules/
│           ├── auth/         # OTP, JWT, refresh tokens
│           ├── users/        # Profile + financial profile
│           ├── investments/  # CRUD for investment records
│           ├── fire-calculator/  # Corpus + SIP calculations
│           ├── tax/          # Old vs new regime comparison
│           └── health-score/ # Portfolio health scoring
└── mobile/                   # Expo app (port 8081)
    └── src/
        ├── navigation/       # AppNavigator (stack + tabs)
        ├── screens/
        │   ├── onboarding/   # Welcome → OTP → 5 setup steps
        │   ├── dashboard/
        │   ├── fire/
        │   ├── investments/
        │   ├── tax/
        │   └── profile/      # Profile + Edit screens
        ├── services/         # Axios API client
        └── store/            # Zustand auth store
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Backend

```bash
cd backend
cp .env.example .env        # fill in JWT_SECRET
npm install
npx prisma db push          # creates SQLite dev.db
npm run start:dev           # API on http://localhost:3000
```

### Mobile

```bash
cd mobile
npm install
npx expo start --web        # opens in browser on http://localhost:8081
```

### OTP in Dev Mode

No SMS gateway needed. The `/auth/send-otp` response includes `devOtp` when `NODE_ENV !== 'production'`. The app auto-fills and submits it — zero friction during development.

---

## API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/send-otp` | — | Send OTP to phone |
| POST | `/api/v1/auth/verify-otp` | — | Verify OTP, get JWT |
| POST | `/api/v1/auth/refresh` | — | Refresh access token |
| GET/PATCH | `/api/v1/users/me` | ✅ | Profile |
| GET/PATCH | `/api/v1/users/me/financial-profile` | ✅ | Financial data |
| GET/POST/PATCH/DELETE | `/api/v1/investments` | ✅ | Investments CRUD |
| GET | `/api/v1/fire-calculator` | ✅ | FIRE projection |
| GET | `/api/v1/tax/comparison` | ✅ | Tax regime comparison |
| GET | `/api/v1/health-score` | ✅ | Portfolio health score |

---

## Roadmap

### Phase 1 — POC ✅
- [x] Auth (phone + OTP + JWT)
- [x] 8-step onboarding flow
- [x] Dashboard with health score
- [x] FIRE calculator
- [x] Tax planner (old vs new regime)
- [x] Investments tracker
- [x] Profile edit screens

### Phase 1 — Next
- [ ] Add/edit investments inline from Investments tab
- [ ] FIRE what-if sliders (+SIP, retire later, lower returns)
- [ ] PDF report export

### Phase 2 — Premium (₹499/mo)
- [ ] Account Aggregator auto-sync (Finvu / OneMoney)
- [ ] CAMS/KFintech MF import, CDSL/NSDL demat sync
- [ ] Razorpay subscriptions
- [ ] Push notifications (portfolio drift, tax harvesting)

---

## Environment Variables

See `backend/.env.example` for all required variables.

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"
NODE_ENV="development"
```

---

## Licence

MIT
