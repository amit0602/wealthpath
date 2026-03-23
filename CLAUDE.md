# WealthPath — CLAUDE.md

Codebase instructions, best practices, and current progress for AI-assisted development.

---

## Git Workflow

- **One PR per feature** — never bundle multiple features into a single PR
- **Always branch from main** — before starting any new task:
  ```bash
  git checkout main
  git pull origin main
  git checkout -b claude/<feature-name>
  ```
- **Never push to a previous feature branch** for a new task — always start fresh from main

---

## Project Overview

India-first financial independence (FIRE) planning app. Phase 1 is free — manual data entry, FIRE calculations, tax optimization, health score. Phase 2 adds Account Aggregator auto-sync and a ₹499/mo premium subscription.

---

## Stack

| Layer | Tech |
|-------|------|
| Mobile | React Native (Expo SDK 51), TypeScript |
| Backend | NestJS + TypeScript |
| Database | SQLite via Prisma (POC) → PostgreSQL (production) |
| State | Zustand (`authStore`) |
| Navigation | React Navigation v6 — native stack + bottom tabs |

**Paths:**
- `wealthPath/mobile/` — Expo app (port 8081)
- `wealthPath/backend/` — NestJS API (port 3000)

**Dev servers:** defined in `/Users/tanya/Amit/Project/.claude/launch.json`

---

## Architecture

### Navigation Structure
```
RootStack
├── Onboarding (unauthenticated)  →  OnboardingStack
│   Welcome → PhoneEntry → OTPVerification → BasicProfile →
│   IncomeExpenses → SavingsSnapshot → RetirementGoals → RiskAppetite
└── Main (authenticated + onboarding complete)  →  MainStack
    ├── MainTabs (bottom tabs)
    │   ├── Dashboard
    │   ├── FIRE Calculator
    │   ├── Investments
    │   ├── Tax Planner
    │   └── Profile
    └── Edit screens (push on top of tabs)
        ├── EditPersonal    (name, DOB, city, employment)
        ├── EditFinancials  (income, expenses, EMI, dependents)
        └── EditGoals       (retirement age, desired income, city, risk)
```

### Key Files
- `mobile/src/navigation/AppNavigator.tsx` — full nav tree + type params (`OnboardingStackParams`, `MainStackParams`, `MainTabParams`)
- `mobile/src/store/authStore.ts` — Zustand auth state, JWT + localStorage fallback
- `mobile/src/services/api.ts` — Axios instance, JWT interceptor, auto-refresh on 401
- `backend/src/modules/auth/auth.service.ts` — OTP generation, JWT issue, refresh
- `backend/prisma/schema.prisma` — master DB schema

---

## POC-Specific Behaviours

### OTP (Dev Mode)
- No SMS gateway. `sendOtp` returns `{ message, devOtp }` when `NODE_ENV !== 'production'`.
- `OTPVerificationScreen` auto-fills and verifies `devOtp` on mount — zero friction in dev.
- In production: `devOtp` is `undefined`; users enter OTP from SMS normally.

### Auth / Storage
- `expo-secure-store` throws on web. All token reads/writes wrapped in try-catch with `localStorage` fallback.
- `isOnboardingComplete` persisted to `localStorage` on web so it survives page reloads.
- Same fallback pattern in both `authStore.ts` and the Axios request interceptor in `api.ts`.

### Database
- SQLite (file `backend/prisma/dev.db`). No Docker required for POC.
- **No enums** in Prisma schema — SQLite doesn't support them. Use `String` fields.
- **No `@db.Decimal`** — use `Float` or `String` for money, convert with `decimal.js` in code.
- JSON fields stored as `String` with `JSON.stringify/parse`.

### Calculations
- Always use `decimal.js` for money arithmetic — never native JS floats.
- India defaults: 6% inflation, 3.33% withdrawal rate (vs US 4%), life expectancy 85.

---

## Coding Conventions

### React Native / Mobile

- **Placeholders** — always set `placeholderTextColor="#9CA3AF"` on every `TextInput` that has a `placeholder` prop.
- **Tab screen data fetching** — use `useFocusEffect(useCallback(() => { load(); }, []))`, never bare `useEffect(fn, [])`. Bottom tabs keep screens mounted, so `useEffect` only runs once on first mount and won't refresh when the user returns to the tab.
- **OTP inputs** — do not set `maxLength` on individual digit boxes. The browser enforces `maxLength` at the DOM level before `onChangeText` fires, which silently breaks paste. The controlled `value={digit}` prop already limits what's displayed.
- **Edit screens pattern** — load existing data via `usersApi.getMe()` in `useEffect`, pre-fill state, call the update API on save, then `navigation.goBack()`. Use `ActivityIndicator` while initial data loads.
- **Navigation typing** — always type navigation props with the correct stack params, e.g. `NativeStackScreenProps<MainStackParams, 'EditGoals'>`. Never use untyped `any` for navigation.
- **New screens in MainStack** — any screen that needs to push on top of the tab bar must be added to `MainStack` in `AppNavigator.tsx`, not inside `MainTabNavigator`.

### Styling

- Brand green: `#1B4332` (primary buttons, active states, filled inputs)
- Light green bg: `#F0FDF4` (filled OTP boxes, recommendation cards)
- Border default: `#D1D5DB`, border active/filled: `#1B4332`
- Text primary: `#111827`, text secondary: `#6B7280`, text disabled/hint: `#9CA3AF`
- Card background: `#fff`, page background: `#F9FAFB`
- Border radius: 12–16 for cards, 8–10 for chips/badges
- All styles via `StyleSheet.create` — no inline style objects except for dynamic values (e.g. `{ flex: percentage }`)
- Elevation `1` on white cards for subtle shadow on Android/web

### Backend / NestJS

- **DTOs** — every controller endpoint must have a typed DTO with `class-validator` decorators. Never accept raw `body: any`.
- **Guards** — protected endpoints use `@UseGuards(JwtAuthGuard)`. Public endpoints (send-otp, verify-otp, refresh-token) need no guard.
- **Error responses** — throw NestJS built-in exceptions (`UnauthorizedException`, `BadRequestException`, `NotFoundException`) — never `throw new Error(...)`.
- **Service layer** — all business logic in `*.service.ts`. Controllers are thin — only call service methods and return results.
- **Prisma** — always use `prisma.$transaction` for multi-step writes (e.g. create user + subscription together). Never do multi-step writes without a transaction.
- **Dev-only endpoints** — guard with `if (process.env.NODE_ENV === 'production') throw new ForbiddenException()` or via an environment check at the service level. Never expose dev shortcuts in production.

### Financial Data

- **Never store raw PAN or Aadhaar** — store reference tokens only.
- **Phone numbers** — store in E.164 format (`+91XXXXXXXXXX`).
- **All monetary values** — use `decimal.js` for arithmetic; store as `Float` in SQLite, `Decimal` in PostgreSQL.
- **Tax year** — always label calculations with the financial year (e.g. FY 2025-26). Tax slabs change annually — keep them in a config object, not hardcoded.
- **Disclaimer** — every screen showing projections or tax estimates must include: *"For educational purposes only. Not investment advice."*

### Security

- Never log access tokens, refresh tokens, or OTPs to application logs in production.
- The `devOtp` field in `sendOtp` response must be gated on `NODE_ENV !== 'production'`.
- Refresh tokens are bcrypt-hashed before storage. Never store plaintext refresh tokens.
- JWT expiry: access token 15 min, refresh token 30 days.

---

## Testing Checklist (before any feature is "done")

- [ ] Screen loads correctly on fresh mount (no cached state)
- [ ] Data refreshes when navigating back to the screen
- [ ] Form validation prevents submission of invalid data
- [ ] API errors show a user-visible `Alert` (not silent `console.error`)
- [ ] Loading state (`ActivityIndicator`) shown during async operations
- [ ] Numbers formatted in Indian locale (`toLocaleString('en-IN')`) and with ₹ prefix
- [ ] FIRE/tax calculations cross-checked against a known reference (ET Money, IT dept calculator)

---

## Current POC Status (2026-03-22)

### Completed ✅
- **Onboarding flow** — all 8 screens working end-to-end in web preview
- **Auth** — phone + OTP (dev auto-fill), JWT, refresh tokens, logout
- **Dashboard** — Health Score, FIRE progress ring, portfolio summary
- **FIRE Calculator** — corpus, SIP target, adjustable inflation/withdrawal/retirement age
- **Investments tab** — portfolio overview, asset allocation bar, per-investment cards with lock-in
- **Tax Planner** — old vs new regime comparison, 80C tracker, deduction reference table
- **Profile tab** — financial summary + **Edit Details** section
  - EditPersonal: name, DOB, city, employment (pre-filled from API)
  - EditFinancials: income, expenses, EMI, dependents (pre-filled)
  - EditGoals: retirement age chips + custom input, desired income, city, risk appetite (pre-filled)
- **OTP paste** — `maxLength` removed, multi-digit `handleChange` distributes digits across boxes
- **UI polish** — grey placeholders (`#9CA3AF`) across all inputs app-wide

### Next Up
- [ ] Add/edit individual investments from the Investments tab
- [ ] FIRE what-if scenarios (sliders: +SIP, retire later, lower returns)
- [ ] PDF report export
- [ ] Validate FIRE/tax calculation accuracy against ET Money / Income Tax calculator

### Phase 2 (Future)
- Account Aggregator auto-sync (Finvu / OneMoney)
- CAMS/KFintech MF import, CDSL/NSDL demat sync
- Razorpay subscriptions (₹499/mo or ₹3,999/yr)
- Push notifications: portfolio drift alerts, tax harvesting opportunities

---

## Running Locally

```bash
# Backend
cd wealthPath/backend
npm run start:dev        # NestJS on port 3000

# Mobile (web)
cd wealthPath/mobile
npx expo start --web     # Expo on port 8081
```

Database is SQLite at `backend/prisma/dev.db` — no Docker needed.

To reset data: `npx prisma db push --force-reset` from `backend/`.
