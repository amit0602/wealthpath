# WealthPath

**Your personal financial independence dashboard — India-first.**

WealthPath is a **read-only monitoring and planning tool**. It helps you understand where you stand financially, track all your investments in one place, and plan your path to financial independence (FIRE). It does **not** give investment advice, recommend products, or manage money on your behalf.

> **Disclaimer:** WealthPath provides financial education and planning tools only. It does not constitute investment advice, financial advice, or any regulated financial service. Always consult a SEBI-registered advisor before making investment decisions.

---

## What WealthPath does

| What it does | What it does NOT do |
|---|---|
| Shows your current financial picture in one place | Give investment advice or recommendations |
| Calculates your FIRE number and timeline | Buy, sell, or manage investments |
| Compares old vs new tax regime for your income | File taxes on your behalf |
| Scores your financial health (0–100) | Guarantee any financial outcome |
| Lets you manually log or import your investments | Act as a broker, advisor, or distributor |
| Sends alerts when your portfolio drifts significantly | Execute any transactions |

---

## Features

### Free
- **FIRE Calculator** — corpus target, monthly SIP needed, years to retirement; India defaults (6% inflation, 3.33% SWR, 85 life expectancy)
- **Tax Planner** — old vs new regime comparison, 80C tracker, HRA calculator (FY 2025-26, Budget 2025 slabs)
- **Investment Tracker** — manually log EPF, PPF, NPS, ELSS, FDs, MFs, direct equity, real estate, gold, SGBs and more
- **Health Score** — 0–100 score across savings rate, emergency fund, debt ratio, insurance, and retirement track
- **FIRE What-If Scenarios** — adjust extra SIP, retire age, and return rate to see the impact in real time
- **PDF Report Export** — one-tap export of your full financial picture to share or save
- **Profile & Edit** — update income, expenses, goals, and risk appetite at any time
- **OTP Auth** — phone number login with JWT (15-min access token + 30-day refresh)

### Premium (₹499/mo or ₹3,999/yr)
- **Push Notifications** — portfolio drift alerts and tax harvesting reminders
- **CAMS / KFintech MF Import** — upload your Consolidated Account Statement to auto-populate your mutual fund holdings
- **Demat Holdings Sync** — sync equity holdings from CDSL / NSDL via Account Aggregator
- **Account Aggregator Auto-Sync** — link bank and investment accounts via RBI-licensed AA (Finvu / OneMoney) for automatic updates

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Mobile | React Native + Expo SDK 51 (TypeScript) |
| Backend | NestJS (TypeScript) |
| Database | SQLite via Prisma (POC) → PostgreSQL (production) |
| State | Zustand |
| Navigation | React Navigation v6 |
| Auth | Phone OTP + JWT (access + refresh tokens) |

---

## Project Structure

```
wealthpath/
├── backend/                    # NestJS API (port 3000)
│   ├── prisma/                 # Schema + migrations
│   └── src/
│       ├── common/
│       │   └── guards/         # JwtAuthGuard, PremiumGuard
│       └── modules/
│           ├── auth/           # OTP, JWT, refresh tokens
│           ├── users/          # Profile + financial profile
│           ├── investments/    # Investment CRUD
│           ├── fire-calculator/# Corpus + SIP calculations
│           ├── tax/            # Old vs new regime comparison
│           ├── health-score/   # Financial health scoring
│           └── subscriptions/  # Razorpay billing + premium gating
└── mobile/                     # Expo app (port 8081)
    └── src/
        ├── navigation/         # AppNavigator (stack + tabs)
        ├── screens/
        │   ├── onboarding/     # Welcome → OTP → 5 setup steps
        │   ├── dashboard/      # Health score + FIRE ring
        │   ├── fire/           # FIRE calculator + what-if
        │   ├── investments/    # Portfolio + add/edit investments
        │   ├── tax/            # Tax planner
        │   └── profile/        # Profile, edit screens, subscription
        ├── services/           # Axios API client + all API namespaces
        ├── store/              # Zustand auth store
        └── utils/              # PDF report generator
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Backend

```bash
cd backend
cp .env.example .env        # fill in JWT_SECRET + JWT_REFRESH_SECRET
npm install
DATABASE_URL="file:./prisma/dev.db" npx prisma@5.9.1 migrate dev
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

### Premium in Dev Mode

No Razorpay account needed. Call `POST /api/v1/subscriptions/dev-activate` (JWT required) to instantly upgrade a user to premium. This endpoint is blocked in production.

---

## API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/send-otp` | — | Send OTP to phone |
| POST | `/api/v1/auth/verify-otp` | — | Verify OTP, get JWT |
| POST | `/api/v1/auth/refresh-token` | — | Refresh access token |
| GET / PUT | `/api/v1/users/me` | JWT | Profile |
| PUT | `/api/v1/users/me/financial-profile` | JWT | Financial data |
| GET / POST | `/api/v1/investments` | JWT | List / create investments |
| PUT / DELETE | `/api/v1/investments/:id` | JWT | Update / delete investment |
| POST / GET | `/api/v1/fire/calculate` | JWT | Run / fetch FIRE projection |
| GET / PUT | `/api/v1/tax/comparison` | JWT | Tax regime comparison |
| POST / GET | `/api/v1/health-score/calculate` | JWT | Run / fetch health score |
| GET | `/api/v1/subscriptions/me` | JWT | Current plan + status |
| POST | `/api/v1/subscriptions/create-order` | JWT | Create Razorpay order |
| POST | `/api/v1/subscriptions/verify-payment` | JWT | Verify payment signature |
| POST | `/api/v1/subscriptions/cancel` | JWT | Cancel subscription |
| POST | `/api/v1/subscriptions/dev-activate` | JWT | Dev-only premium activation |

---

## Roadmap

### Phase 1 — Complete ✅
- [x] Phone OTP auth + JWT
- [x] 8-step onboarding flow
- [x] Dashboard — health score ring + FIRE progress
- [x] FIRE calculator with India-specific defaults
- [x] FIRE what-if scenario sliders
- [x] Tax planner — FY 2025-26 old vs new regime
- [x] Investment tracker — 14 instrument types, full CRUD
- [x] Financial health score (0–100)
- [x] Profile edit screens (personal, financials, goals)
- [x] PDF report export

### Phase 2 — Premium (In Progress)
- [x] Razorpay subscriptions (₹499/mo · ₹3,999/yr) + PremiumGuard
- [ ] Push notifications — drift alerts + tax harvesting reminders
- [ ] CAMS / KFintech MF import (CAS file upload, zero regulatory overhead)
- [ ] CDSL / NSDL demat holdings sync (via Account Aggregator)
- [ ] Account Aggregator auto-sync (Finvu / OneMoney)

---

## Environment Variables

See `backend/.env.example` for the full list.

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"
NODE_ENV="development"

# Required only for production payments
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
```

---

## Licence

MIT
