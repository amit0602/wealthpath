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
- **Commit messages** — use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- **PR per task** — open a dedicated PR immediately after pushing the branch

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
- `mobile/` — Expo app (port 8081)
- `backend/` — NestJS API (port 3000)

**Key packages (mobile):**
- `axios` — API client with JWT interceptor
- `expo-secure-store` — token storage (with localStorage fallback on web)
- `expo-print` — HTML → PDF conversion
- `expo-sharing` — native share sheet for PDF

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
    └── Edit / detail screens (push on top of tabs)
        ├── EditPersonal    (name, DOB, city, employment)
        ├── EditFinancials  (income, expenses, EMI, dependents)
        ├── EditGoals       (retirement age, desired income, city, risk)
        └── EditInvestment  (add or edit a single investment)
```

### Key Files
- `mobile/src/navigation/AppNavigator.tsx` — full nav tree + type params (`OnboardingStackParams`, `MainStackParams`, `MainTabParams`)
- `mobile/src/store/authStore.ts` — Zustand auth state, JWT + localStorage fallback
- `mobile/src/services/api.ts` — Axios instance, JWT interceptor, auto-refresh on 401
- `mobile/src/utils/generateReport.ts` — PDF report generator (HTML → expo-print → expo-sharing)
- `backend/src/modules/auth/auth.service.ts` — OTP generation, JWT issue, refresh
- `backend/src/modules/fire-calculator/calculations/corpus.calculator.ts` — FIRE math
- `backend/src/modules/fire-calculator/calculations/tax.calculator.ts` — FY 2025-26 tax slabs
- `backend/prisma/schema.prisma` — master DB schema

### API Surface (`mobile/src/services/api.ts`)
```typescript
authApi        → /auth/send-otp, /auth/verify-otp, /auth/logout
usersApi       → /users/me (GET, PUT), /users/me/financial-profile (PUT)
fireApi        → /fire/calculate (POST), /fire/latest (GET)
investmentsApi → /investments (GET, POST), /investments/:id (PUT, DELETE)
taxApi         → /tax/comparison (GET), /tax/profile (PUT)
healthScoreApi → /health-score/calculate (POST), /health-score/latest (GET)
```

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
- FIRE corpus gap accounts for FV of both existing lump-sum corpus AND existing monthly contributions.
- Tax slabs are FY 2025-26 (Budget 2025). New regime 87A rebate threshold = ₹12,00,000. New regime surcharge capped at 25%.

---

## Coding Conventions

### React Native / Mobile

- **Placeholders** — always set `placeholderTextColor="#9CA3AF"` on every `TextInput` with a `placeholder` prop.
- **Tab screen data fetching** — use `useFocusEffect(useCallback(() => { load(); }, []))`, never bare `useEffect(fn, [])`. Bottom tabs keep screens mounted, so `useEffect` only runs once and won't refresh when the user returns to the tab.
- **After any mutation** — after saving or deleting an investment (or any data that affects FIRE/health), fire background recalculations so dependent screens show fresh data on next focus:
  ```typescript
  fireApi.calculate().catch(() => {});
  healthScoreApi.calculate().catch(() => {});
  ```
- **OTP inputs** — do not set `maxLength` on individual digit boxes. The browser enforces `maxLength` before `onChangeText` fires, silently breaking paste. The controlled `value={digit}` already limits display.
- **Edit screens pattern** — load existing data in `useEffect`, pre-fill state, call the update API on save, then `navigation.goBack()`. Show `ActivityIndicator` while initial data loads.
- **Navigation typing** — always type navigation props with the correct stack params, e.g. `NativeStackScreenProps<MainStackParams, 'EditGoals'>`. Never use untyped `any` for navigation.
- **New screens in MainStack** — any screen that pushes on top of the tab bar must be added to `MainStack` in `AppNavigator.tsx`, not inside `MainTabNavigator`.
- **Error handling** — all API errors must show a user-visible `Alert`. Never silently swallow errors with only `console.error`.
- **Parallel data fetching** — when a screen needs multiple independent API calls, use `Promise.allSettled` so a single failure doesn't block the rest:
  ```typescript
  const [fireRes, healthRes, allocRes] = await Promise.allSettled([...]);
  ```

### Styling

- Brand green: `#1B4332` (primary buttons, active states, filled inputs)
- Light green bg: `#F0FDF4` (recommendation cards, comparison boxes)
- Border default: `#D1D5DB`, border active/filled: `#1B4332`
- Text primary: `#111827`, text secondary: `#6B7280`, text disabled/hint: `#9CA3AF`
- Card background: `#fff`, page background: `#F9FAFB`
- Destructive / error: `#EF4444`, warning / amber: `#F59E0B`, success: `#10B981`
- Border radius: 12–16 for cards, 8–10 for chips/badges
- All styles via `StyleSheet.create` — no inline style objects except for dynamic values (e.g. `{ flex: percentage }`)
- Elevation `1` on white cards for subtle shadow on Android/web

### Backend / NestJS

- **DTOs** — every controller endpoint must have a typed DTO with `class-validator` decorators. Never accept raw `body: any`.
- **Guards** — protected endpoints use `@UseGuards(JwtAuthGuard)`. Public endpoints (send-otp, verify-otp, refresh-token) need no guard.
- **Error responses** — throw NestJS built-in exceptions (`UnauthorizedException`, `BadRequestException`, `NotFoundException`) — never `throw new Error(...)`.
- **Service layer** — all business logic in `*.service.ts`. Controllers are thin — only call service methods and return results.
- **Prisma** — always use `prisma.$transaction` for multi-step writes. Never do multi-step writes without a transaction.
- **Dev-only endpoints** — guard with `if (process.env.NODE_ENV === 'production') throw new ForbiddenException()`. Never expose dev shortcuts in production.
- **Override params pattern** — when adding what-if or scenario overrides to an existing endpoint, add optional fields to the DTO with sensible `@Min`/`@Max` bounds. Apply them in the service on top of the user's saved profile defaults.

### Financial Data

- **Never store raw PAN or Aadhaar** — store reference tokens only.
- **Phone numbers** — store in E.164 format (`+91XXXXXXXXXX`).
- **All monetary values** — use `decimal.js` for arithmetic; store as `Float` in SQLite, `Decimal` in PostgreSQL.
- **Tax year** — always label calculations with the financial year (e.g. FY 2025-26). Tax slabs change annually — keep them in a named config constant, never inline magic numbers.
- **Disclaimer** — every screen or report section showing projections or tax estimates must include: *"For educational purposes only. Not investment advice."*
- **Number formatting** — always use `toLocaleString('en-IN')` with ₹ prefix. For large values use Cr/L abbreviations (≥1 Cr → `₹X.XX Cr`, ≥1 L → `₹X.X L`).

### PDF Reports

- All report generation lives in `mobile/src/utils/generateReport.ts`.
- Fetch all data with `Promise.allSettled` — partial data renders with graceful fallback messages, never throws.
- Build HTML string → `Print.printToFileAsync({ html })` → `Sharing.shareAsync(uri)`.
- Check `Sharing.isAvailableAsync()` first; fall back to `Print.printAsync({ uri })` on simulator/web.
- Every report must include the standard disclaimer in the footer.

### Security

- Never log access tokens, refresh tokens, or OTPs to application logs in production.
- The `devOtp` field in `sendOtp` response must be gated on `NODE_ENV !== 'production'`.
- Refresh tokens are bcrypt-hashed before storage. Never store plaintext refresh tokens.
- JWT expiry: access token 15 min, refresh token 30 days.

---

## Testing Checklist (before any feature is "done")

- [ ] Screen loads correctly on fresh mount (no cached state)
- [ ] Data refreshes when navigating back to the screen (`useFocusEffect`)
- [ ] Form validation prevents submission of invalid data
- [ ] API errors show a user-visible `Alert` (not silent `console.error`)
- [ ] Loading state (`ActivityIndicator`) shown during async operations
- [ ] Numbers formatted in Indian locale (`toLocaleString('en-IN')`) with ₹ prefix
- [ ] Disclaimer shown on any screen with projections or tax estimates
- [ ] After a mutation (add/edit/delete investment), FIRE + health recalculations triggered
- [ ] FIRE/tax calculations cross-checked against ET Money / IT dept calculator for at least two test cases

---

## Current Status (2026-03-23)

### Completed ✅
- **Onboarding flow** — all 8 screens working end-to-end in web preview
- **Auth** — phone + OTP (dev auto-fill), JWT, refresh tokens, logout
- **Dashboard** — Health Score, FIRE progress ring, portfolio summary; refreshes on every tab focus
- **FIRE Calculator** — corpus, SIP target, adjustable assumptions; `useFocusEffect` for live refresh
- **FIRE What-If Scenarios** — three interactive levers (extra SIP, retire age, return rate); debounced API call; comparison box showing gap/SIP/age deltas vs baseline
- **Investments tab** — portfolio overview, asset allocation bar, per-investment cards
- **Add/Edit Investments** — `EditInvestmentScreen` with 14 instrument type chips, all fields, pre-fill on edit, delete with confirmation; triggers FIRE + health recalculation on save/delete
- **Tax Planner** — old vs new regime comparison, 80C tracker, deduction reference table
- **Tax calculation accuracy** — FY 2025-26 Budget 2025 slabs, 87A rebate at ₹12L for new regime, marginal relief, 25% surcharge cap for new regime
- **FIRE calculation accuracy** — corpus gap deducts FV of existing monthly SIPs; matches ET Money output
- **Profile tab** — financial summary, Edit Details section
  - EditPersonal, EditFinancials, EditGoals — all pre-filled from API
- **PDF Report Export** — one-tap export from Profile; covers health score, FIRE projections, portfolio, tax comparison; shares via native share sheet
- **UI polish** — grey placeholders, `useFocusEffect` on all tab screens

### Phase 2 (Future)
- Account Aggregator auto-sync (Finvu / OneMoney)
- CAMS/KFintech MF import, CDSL/NSDL demat sync
- Razorpay subscriptions (₹499/mo or ₹3,999/yr)
- Push notifications: portfolio drift alerts, tax harvesting opportunities

---

## Running Locally

```bash
# Backend
cd backend
npm run start:dev        # NestJS on port 3000

# Mobile (web)
cd mobile
npx expo start --web     # Expo on port 8081
```

Database is SQLite at `backend/prisma/dev.db` — no Docker needed.

To reset data: `npx prisma db push --force-reset` from `backend/`.
