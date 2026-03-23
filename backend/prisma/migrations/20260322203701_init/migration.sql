-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone_number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "date_of_birth" DATETIME NOT NULL,
    "employment_type" TEXT NOT NULL DEFAULT 'salaried',
    "city" TEXT NOT NULL DEFAULT '',
    "city_tier" TEXT NOT NULL DEFAULT 'metro',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME
);

-- CreateTable
CREATE TABLE "otp_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "phone_number" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "used_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "otp_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "revoked_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "financial_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "monthly_gross_income" REAL NOT NULL,
    "monthly_take_home" REAL NOT NULL,
    "monthly_expenses" REAL NOT NULL,
    "monthly_emi" REAL NOT NULL DEFAULT 0,
    "dependents_count" INTEGER NOT NULL DEFAULT 0,
    "risk_appetite" TEXT NOT NULL DEFAULT 'moderate',
    "target_retirement_age" INTEGER NOT NULL,
    "desired_monthly_income" REAL NOT NULL,
    "retirement_city" TEXT NOT NULL,
    "retirement_city_tier" TEXT NOT NULL DEFAULT 'metro',
    "inflation_assumption" REAL NOT NULL DEFAULT 0.06,
    "expected_return_pre" REAL NOT NULL DEFAULT 0.12,
    "expected_return_post" REAL NOT NULL DEFAULT 0.07,
    "withdrawal_rate" REAL NOT NULL DEFAULT 0.0333,
    "life_expectancy" INTEGER NOT NULL DEFAULT 85,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "financial_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "investments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "instrument_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "current_value" REAL NOT NULL,
    "monthly_contribution" REAL NOT NULL DEFAULT 0,
    "annual_contribution" REAL NOT NULL DEFAULT 0,
    "expected_return_rate" REAL NOT NULL,
    "start_date" DATETIME,
    "maturity_date" DATETIME,
    "lock_in_until" DATETIME,
    "interest_rate" REAL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "investments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "investment_value_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "investment_id" TEXT NOT NULL,
    "recorded_value" REAL NOT NULL,
    "recorded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "investment_value_history_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fire_calculations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "corpus_required" REAL NOT NULL,
    "current_corpus_fv" REAL NOT NULL,
    "corpus_gap" REAL NOT NULL,
    "monthly_sip_required" REAL NOT NULL,
    "years_to_fire" REAL NOT NULL,
    "fire_age" INTEGER NOT NULL,
    "calculation_inputs" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fire_calculations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tax_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "financial_year" TEXT NOT NULL,
    "gross_salary" REAL NOT NULL,
    "hra_received" REAL NOT NULL DEFAULT 0,
    "rent_paid" REAL NOT NULL DEFAULT 0,
    "is_metro" BOOLEAN NOT NULL DEFAULT true,
    "section_80c_used" REAL NOT NULL DEFAULT 0,
    "section_80d_used" REAL NOT NULL DEFAULT 0,
    "section_80ccd1b_used" REAL NOT NULL DEFAULT 0,
    "home_loan_interest" REAL NOT NULL DEFAULT 0,
    "recommended_regime" TEXT,
    "old_regime_tax" REAL,
    "new_regime_tax" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tax_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "health_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "emergency_fund_score" INTEGER NOT NULL,
    "insurance_score" INTEGER NOT NULL,
    "debt_ratio_score" INTEGER NOT NULL,
    "savings_rate_score" INTEGER NOT NULL,
    "retirement_track_score" INTEGER NOT NULL,
    "score_breakdown" TEXT NOT NULL,
    "calculated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "health_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME,
    "cancelled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "consent_type" TEXT NOT NULL,
    "consent_given" BOOLEAN NOT NULL,
    "consent_version" TEXT NOT NULL,
    "ip_address" TEXT,
    "given_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" DATETIME,
    CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "ip_address" TEXT,
    "status_code" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "financial_profiles_user_id_key" ON "financial_profiles"("user_id");

-- CreateIndex
CREATE INDEX "investment_value_history_investment_id_recorded_at_idx" ON "investment_value_history"("investment_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "tax_profiles_user_id_financial_year_key" ON "tax_profiles"("user_id", "financial_year");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");
