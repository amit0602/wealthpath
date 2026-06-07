# WealthPath — Manual QA Test Suite

> **Environment:** `http://localhost:8081` (Expo web) + `http://localhost:3000` (NestJS)
> **Last updated:** 2026-04-22

---

## How to Use This Document

- Work through each section top-to-bottom for a full regression run.
- Mark each row ✅ Pass / ❌ Fail / ⚠️ Partial.
- Note the actual behaviour in the "Notes" column when failing.
- Reset state between runs: `DATABASE_URL="file:./prisma/dev.db" npx prisma@5.9.1 db push --force-reset` from `backend/`.

---

## 1. Onboarding Flow

| # | Step | Expected Result | Pass/Fail | Notes |
|---|------|----------------|-----------|-------|
| 1.1 | Open app — not logged in | Welcome screen shown | | |
| 1.2 | Tap "Get Started" | Navigate to PhoneEntry screen | | |
| 1.3 | Enter phone number without country code | Validation error shown (red border + message) | | |
| 1.4 | Enter valid +91 number, tap "Send OTP" | Navigate to OTPVerification; OTP auto-filled (dev mode) | | |
| 1.5 | OTP auto-verifies on mount | Navigate to BasicProfile screen | | |
| 1.6 | Leave name blank, tap "Continue" | Validation error on name field | | |
| 1.7 | Fill BasicProfile (name, DOB, city, employment), tap "Continue" | Navigate to IncomeExpenses | | |
| 1.8 | Fill IncomeExpenses, tap "Continue" | Navigate to SavingsSnapshot | | |
| 1.9 | Fill SavingsSnapshot, tap "Continue" | Navigate to RetirementGoals | | |
| 1.10 | Fill RetirementGoals, tap "Continue" | Navigate to RiskAppetite | | |
| 1.11 | Select risk appetite, tap "Complete" | Navigate to Main tabs (Dashboard) | | |
| 1.12 | Reload the page (web) | User stays logged in; `isOnboardingComplete` persists | | |

---

## 2. Authentication

| # | Step | Expected Result | Pass/Fail | Notes |
|---|------|----------------|-----------|-------|
| 2.1 | Logout from Profile tab | Token cleared; redirect to Welcome screen | | |
| 2.2 | Re-login with same phone number | OTP auto-fills; lands on Dashboard (not onboarding) | | |
| 2.3 | Let access token expire (15 min) then make an API call | Silent refresh occurs; no logout, request succeeds | | |
| 2.4 | Open app on new browser tab while logged in | Session restored from localStorage; no re-login needed | | |

---

## 3. Dashboard

| # | Step | Expected Result | Pass/Fail | Notes |
|---|------|----------------|-----------|-------|
| 3.1 | Navigate to Dashboard tab | Health Score ring, FIRE progress ring, net worth chart, portfolio summary all load | | |
| 3.2 | Check FIRE CTA card | Shows "Invest ₹X/mo to reach FIRE goal by age Y" as primary CTA | | |
| 3.3 | Check FIRE CTA when on-track | Green confirmation message shown instead of gap CTA | | |
| 3.4 | Trial ≤ 2 days remaining | Amber trial warning banner visible on Dashboard | | |
| 3.5 | Net worth chart | Line chart renders with up to 12 monthly data points and trend badge | | |
| 3.6 | Switch to another tab and back | Dashboard data refreshes (does not show stale data) | | |
| 3.7 | All monetary values | Formatted as ₹X,XX,XXX (Indian locale) with Cr/L abbreviations where applicable | | |

---

## 4. FIRE Calculator

| # | Step | Expected Result | Pass/Fail | Notes |
|---|------|----------------|-----------|-------|
| 4.1 | Navigate to FIRE Calculator tab | Corpus target, SIP target, years to FIRE load correctly | | |
| 4.2 | Disclaimer visible | "For educational purposes only. Not investment advice." shown | | |
| 4.3 | Adjust "Extra SIP" lever | Comparison box updates (gap/SIP/age delta vs baseline) | | |
| 4.4 | Adjust "Retire Age" lever | Corpus target and delta recalculate | | |
| 4.5 | Adjust "Return Rate" lever | SIP target updates accordingly | | |
| 4.6 | Rapid lever changes (debounce test) | Only one API call fires after slider stops; no UI thrashing | | |
| 4.7 | Cross-check with ET Money | For same inputs (income, expenses, corpus), FIRE numbers match within 2% | | |
| 4.8 | Goals section visible | Financial goals with SIP calculations listed | | |
| 4.9 | Return to tab after adding investment | FIRE numbers refresh | | |

---

## 5. Investments

| # | Step | Expected Result | Pass/Fail | Notes |
|---|------|----------------|-----------|-------|
| 5.1 | Navigate to Investments tab | Portfolio overview, asset allocation bar, investment cards load | | |
| 5.2 | Tap "+" / Add investment | EditInvestmentScreen opens | | |
| 5.3 | Select instrument type chip (e.g., Mutual Fund) | Relevant fields shown | | |
| 5.4 | Submit without required fields | Validation errors shown; form not submitted | | |
| 5.5 | Add a SIP investment (monthly amount set) | Card shows green "SIP Active" badge | | |
| 5.6 | Add an annual investment | Card shows blue "Annual" badge | | |
| 5.7 | Add a lump sum (growth asset, no SIP) | Card shows amber "Lump Sum · No active SIP" badge with CTA | | |
| 5.8 | Tap an investment card to edit | EditInvestmentScreen opens pre-filled with existing data | | |
| 5.9 | Edit and save an investment | Investment card updates; FIRE + health score recalculate | | |
| 5.10 | Delete an investment (confirm) | Card removed; FIRE + health score recalculate | | |
| 5.11 | Delete an investment (cancel) | Investment remains; no change | | |
| 5.12 | Portfolio summary | Shows active SIP count + monthly SIP total + lump sum count | | |
| 5.13 | Tap "↑ Import" (MF import) | 3-step MF import wizard opens | | |
| 5.14 | Upload a CAMS/KFintech CAS CSV | Parsed funds shown for review | | |
| 5.15 | Confirm MF import | Funds upserted into investments list | | |

---

## 6. Tax Planner

| # | Step | Expected Result | Pass/Fail | Notes |
|---|------|----------------|-----------|-------|
| 6.1 | Navigate to Tax Planner tab | Old vs New regime comparison, 80C tracker, deduction table load | | |
| 6.2 | Disclaimer visible | "For educational purposes only. Not investment advice." shown | | |
| 6.3 | Tap "Edit Profile" | EditTaxProfileScreen opens | | |
| 6.4 | Fill salary, HRA, 80C, 80D, 80CCD(1B), home loan interest | Fields accept input; save succeeds | | |
| 6.5 | 80C progress bar | Shows current 80C vs ₹1.5L limit; "invest ₹X more to max out" tip visible | | |
| 6.6 | 87A rebate (new regime, income ≤ ₹12L) | Tax shown as ₹0 under new regime | | |
| 6.7 | High income (>₹5Cr) — surcharge | New regime surcharge capped at 25% | | |
| 6.8 | Cross-check with IT dept calculator | For at least 2 test cases, old + new regime tax matches official calculator | | |
| 6.9 | Return to tab after editing tax profile | Comparison figures refresh | | |

---

## 7. Profile Tab

| # | Step | Expected Result | Pass/Fail | Notes |
|---|------|----------------|-----------|-------|
| 7.1 | Navigate to Profile tab | Financial summary, Edit Details section load | | |
| 7.2 | Tap "Edit Personal" | EditPersonalScreen opens pre-filled | | |
| 7.3 | Edit name/DOB/city, save | Profile updates; navigate back to Profile | | |
| 7.4 | Tap "Edit Financials" | EditFinancialsScreen opens pre-filled | | |
| 7.5 | Edit income/expenses/EMI, save | Data saves; navigate back | | |
| 7.6 | Tap "Edit Goals" | EditGoalsScreen opens pre-filled | | |
| 7.7 | Edit retirement age/target income, save | FIRE recalculates on next Calculator tab focus | | |
| 7.8 | Tap "Insurance Coverage" | InsuranceScreen opens | | |
| 7.9 | Toggle term/health cover, fill sum assured + premium, save | Health score updates (insurance dimension) | | |
| 7.10 | Tap "Emergency Fund" | EmergencyFundScreen opens | | |
| 7.11 | Set liquid savings + target months, save | Months covered, shortfall, progress % computed correctly | | |
| 7.12 | Tap "Debt Payoff" | DebtPayoffScreen opens with avalanche-sorted loans | | |
| 7.13 | Tap "Export PDF Report" | Native share sheet appears with generated PDF | | |

---

## 8. Subscription & Trial Gate

| # | Step | Expected Result | Pass/Fail | Notes |
|---|------|----------------|-----------|-------|
| 8.1 | New user — check trial status | 14-day trial active; all features accessible | | |
| 8.2 | Dev-activate subscription | `POST /subscriptions/dev-activate` returns success; status shows active | | |
| 8.3 | Expire trial (manually via DB) then open any tab | Redirected to SubscriptionScreen | | |
| 8.4 | SubscriptionScreen | Monthly (₹199/mo) plan card shown; dev-activate button (dev mode only) | | |
| 8.5 | Activate subscription | Full access restored; tabs accessible | | |
| 8.6 | Trial ≤ 2 days | Amber warning banner visible on Dashboard | | |

---

## 9. Goals

| # | Step | Expected Result | Pass/Fail | Notes |
|---|------|----------------|-----------|-------|
| 9.1 | Navigate to Goals (Profile → Edit Details) | All goals listed with icon, progress bar, SIP target | | |
| 9.2 | Tap "Add Goal" | EditGoalScreen opens with 7 quick-start presets | | |
| 9.3 | Select a preset (e.g., "Buy a Home") | Fields pre-populated | | |
| 9.4 | Set target amount + target date, save | Goal appears in list with correct SIP calculation | | |
| 9.5 | Edit an existing goal | Pre-filled; updates correctly on save | | |
| 9.6 | Delete a goal (confirm) | Goal removed from list | | |
| 9.7 | Goals in FIRE Calculator | Goal SIP requirements visible on FIRE tab | | |

---

## 10. Emergency Fund

| # | Step | Expected Result | Pass/Fail | Notes |
|---|------|----------------|-----------|-------|
| 10.1 | Open EmergencyFundScreen | Current liquid savings, target, shortfall, progress % shown | | |
| 10.2 | Change target months (e.g., 3 → 6) | Target amount and shortfall update live | | |
| 10.3 | Set liquid savings = target | Progress bar at 100%; shortfall = ₹0 | | |
| 10.4 | Set liquid savings < 1 month | Health score insurance/emergency dimension reflects low score | | |
| 10.5 | Tip card visible | Shows guidance based on current shortfall | | |

---

## 11. Debt Payoff

| # | Step | Expected Result | Pass/Fail | Notes |
|---|------|----------------|-----------|-------|
| 11.1 | Open DebtPayoffScreen with no loans | Empty state shown with "Add your first loan" prompt | | |
| 11.2 | Add a loan (EditLoanScreen) | Principal, rate, tenure fields; EMI auto-calculated | | |
| 11.3 | Add multiple loans with different rates | Avalanche order (highest rate first) maintained in list | | |
| 11.4 | Each loan card | Shows `totalInterestPayable` and `payoffDate` | | |
| 11.5 | Delete a loan | Freed-EMI nudge shown → navigates to EditFinancials | | |
| 11.6 | Summary card | Total outstanding, total monthly EMI, next payoff date correct | | |

---

## 12. PDF Report Export

| # | Step | Expected Result | Pass/Fail | Notes |
|---|------|----------------|-----------|-------|
| 12.1 | Tap "Export Report" on Profile tab | Loading indicator shown, then share sheet | | |
| 12.2 | PDF contents | Includes Health Score, FIRE projections, portfolio, tax comparison | | |
| 12.3 | Disclaimer in PDF footer | "For educational purposes only. Not investment advice." present | | |
| 12.4 | One API call fails (simulate with network throttle) | PDF still generates with graceful fallback for missing section | | |

---

## 13. Health Score

| # | Step | Expected Result | Pass/Fail | Notes |
|---|------|----------------|-----------|-------|
| 13.1 | View Health Score on Dashboard | 0–100 score with 5 dimension breakdown shown | | |
| 13.2 | Add insurance coverage | Insurance dimension score increases | | |
| 13.3 | Set emergency fund to full target | Emergency fund dimension reaches high score | | |
| 13.4 | Add more investments | Savings rate dimension updates | | |
| 13.5 | After any mutation | Score refreshes automatically on next Dashboard focus | | |

---

## 14. Push Notifications (Backend / Cron)

| # | Step | Expected Result | Pass/Fail | Notes |
|---|------|----------------|-----------|-------|
| 14.1 | Register push token | `POST /notifications/token` returns 201 | | |
| 14.2 | Get notification preferences | `GET /notifications/preferences` returns defaults | | |
| 14.3 | Update preferences (disable drift alerts) | `PUT /notifications/preferences` persists change | | |
| 14.4 | Drift alert cron logic (unit test) | Only sends if equity % deviates from risk appetite target | | |
| 14.5 | 80C reminder cron | Fires on Monday; skips if 80C already maxed | | |

---

## 15. Data Integrity & Edge Cases

| # | Step | Expected Result | Pass/Fail | Notes |
|---|------|----------------|-----------|-------|
| 15.1 | All monetary displays | Use `toLocaleString('en-IN')` — lakhs/crores formatting (e.g., ₹1,50,000) | | |
| 15.2 | Values ≥ ₹1 Cr | Displayed as "₹X.XX Cr" | | |
| 15.3 | Values ≥ ₹1 L (< 1 Cr) | Displayed as "₹X.X L" | | |
| 15.4 | Zero investment state | Portfolio, goals, loans all show empty states, not errors | | |
| 15.5 | Very large corpus (₹10Cr+) | No overflow or NaN in FIRE calculations | | |
| 15.6 | Income = 0 entered | Graceful validation error, not crash | | |
| 15.7 | Simultaneous tab switches during data load | No race conditions; final data is consistent | | |
| 15.8 | API error (500) on any screen | Alert shown with user-friendly message; no silent failure | | |

---

*Generated by Claude · WealthPath QA Suite v1.0*
