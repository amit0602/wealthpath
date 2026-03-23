import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { fireApi, investmentsApi, taxApi, healthScoreApi, usersApi } from '../services/api';

// ─── Formatters ────────────────────────────────────────────────────────────────

function fmtINR(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const today = () =>
  new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

// ─── HTML builder ──────────────────────────────────────────────────────────────

function buildHtml(data: {
  user: any;
  fire: any;
  investments: any;
  tax: any;
  health: any;
}): string {
  const { user, fire, investments, tax, health } = data;
  const fp = user?.financialProfile;
  const summary = investments?.summary;
  const invList: any[] = investments?.investments ?? [];

  const INSTRUMENT_LABELS: Record<string, string> = {
    epf: 'EPF', ppf: 'PPF', nps_tier1: 'NPS Tier 1', nps_tier2: 'NPS Tier 2',
    elss: 'ELSS', fd: 'FD', rd: 'RD', direct_equity: 'Stocks',
    real_estate: 'Real Estate', gold: 'Gold', sgb: 'SGB',
    mutual_fund_equity: 'Equity MF', mutual_fund_debt: 'Debt MF', other: 'Other',
  };

  const ALLOC_COLORS: Record<string, string> = {
    equity: '#10B981', debt: '#3B82F6', gold: '#F59E0B', realEstate: '#8B5CF6',
  };

  const scoreColor = (s: number) =>
    s >= 70 ? '#065F46' : s >= 40 ? '#92400E' : '#991B1B';
  const scoreBg = (s: number) =>
    s >= 70 ? '#D1FAE5' : s >= 40 ? '#FEF3C7' : '#FEE2E2';
  const scoreLabel = (s: number) =>
    s >= 70 ? 'Healthy' : s >= 40 ? 'Needs Work' : 'Critical';

  // Projection rows (first 20 years)
  const projRows = (fire?.projections ?? [])
    .slice(0, 20)
    .map((p: any) => `
      <tr style="${p.isFireYear ? 'background:#F0FDF4;font-weight:700;color:#1B4332;' : ''}">
        <td>${p.year}</td>
        <td>${p.age}</td>
        <td>${fmtINR(Number(p.portfolioValue))}</td>
        <td>${fmtINR(Number(p.annualContribution))}</td>
        <td>${fmtINR(Number(p.annualReturns))}</td>
      </tr>`)
    .join('');

  // Allocation rows
  const allocRows = summary
    ? Object.entries(summary.allocation)
        .filter(([, v]: any) => Number(v.percentage) > 0)
        .map(([key, val]: any) => `
          <tr>
            <td>
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;
                background:${ALLOC_COLORS[key] ?? '#6B7280'};margin-right:6px;"></span>
              ${key.charAt(0).toUpperCase() + key.slice(1)}
            </td>
            <td>${fmtINR(Number(val.value))}</td>
            <td>${val.percentage}%</td>
          </tr>`)
        .join('')
    : '';

  // Investment rows
  const invRows = invList
    .map(
      (inv) => `
      <tr>
        <td>${inv.name}</td>
        <td>${INSTRUMENT_LABELS[inv.instrumentType] ?? inv.instrumentType}</td>
        <td>${fmtINR(Number(inv.currentValue))}</td>
        <td>${Number(inv.monthlyContribution) > 0 ? fmtINR(Number(inv.monthlyContribution)) + '/mo' : '—'}</td>
        <td>${inv.lockInUntil ? fmtDate(inv.lockInUntil) : '—'}</td>
      </tr>`,
    )
    .join('');

  const overallScore = health?.overallScore ?? '—';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, Arial, sans-serif; font-size: 13px; color: #111827;
         background: #fff; padding: 32px; }
  h1 { font-size: 26px; font-weight: 800; color: #1B4332; }
  h2 { font-size: 16px; font-weight: 700; color: #1B4332; margin: 24px 0 10px; padding-bottom: 6px;
       border-bottom: 2px solid #D1FAE5; }
  h3 { font-size: 13px; font-weight: 700; color: #374151; margin: 12px 0 6px; }
  p  { color: #6B7280; font-size: 12px; margin-top: 2px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start;
             padding-bottom: 18px; border-bottom: 3px solid #1B4332; margin-bottom: 8px; }
  .header-meta { text-align: right; color: #6B7280; font-size: 11px; line-height: 1.7; }

  /* Metric grid */
  .grid { display: grid; gap: 10px; margin: 10px 0; }
  .grid-2 { grid-template-columns: 1fr 1fr; }
  .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
  .card { background: #F9FAFB; border-radius: 10px; padding: 12px 14px; }
  .card-dark { background: #1B4332; border-radius: 10px; padding: 14px 16px; }
  .card-label { font-size: 10px; font-weight: 600; color: #6B7280; text-transform: uppercase;
                letter-spacing: 0.5px; }
  .card-dark .card-label { color: #A7F3D0; }
  .card-value { font-size: 20px; font-weight: 800; color: #111827; margin-top: 4px; }
  .card-dark .card-value { color: #fff; font-size: 22px; }
  .card-sub { font-size: 11px; color: #6B7280; margin-top: 3px; }
  .card-dark .card-sub { color: #6EE7B7; }

  /* Score badge */
  .score-badge { display: inline-block; padding: 3px 10px; border-radius: 20px;
                 font-size: 12px; font-weight: 600; margin-left: 8px; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
  th { background: #F3F4F6; text-align: left; padding: 7px 10px;
       font-size: 11px; font-weight: 600; color: #6B7280; }
  td { padding: 7px 10px; border-bottom: 1px solid #F3F4F6; }
  tr:last-child td { border-bottom: none; }

  /* Tax */
  .regime-box { border-radius: 10px; padding: 12px 14px; }
  .regime-old  { background: #EFF6FF; }
  .regime-new  { background: #F0FDF4; }
  .regime-label { font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; }
  .regime-tax { font-size: 22px; font-weight: 800; color: #111827; margin: 4px 0; }
  .regime-rec { font-size: 11px; font-weight: 700; color: #1B4332; }

  /* Disclaimer */
  .disclaimer { margin-top: 32px; padding: 12px 14px; background: #FEF9C3; border-radius: 8px;
                font-size: 10px; color: #92400E; line-height: 1.6; }
  .footer { margin-top: 16px; font-size: 10px; color: #9CA3AF; text-align: center; }

  /* Page break hints */
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<!-- ═══ HEADER ═════════════════════════════════════════════════════════════ -->
<div class="header">
  <div>
    <h1>WealthPath</h1>
    <p style="color:#1B4332;font-weight:600;margin-top:4px;">Financial Independence Report</p>
    ${user ? `<p style="margin-top:6px;font-size:13px;color:#111827;font-weight:700;">${user.fullName}</p>` : ''}
  </div>
  <div class="header-meta">
    <div>Generated: ${today()}</div>
    <div>FY 2025-26</div>
    ${fp ? `<div>Retirement Target: Age ${fp.targetRetirementAge}</div>` : ''}
  </div>
</div>

<!-- ═══ HEALTH SCORE ════════════════════════════════════════════════════════ -->
<h2>Financial Health Score</h2>
${health ? `
<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
  <span style="font-size:40px;font-weight:800;color:#1B4332;">${overallScore}</span>
  <span style="font-size:18px;color:#9CA3AF;">/100</span>
  <span class="score-badge" style="background:${scoreBg(overallScore)};color:${scoreColor(overallScore)};">
    ${scoreLabel(overallScore)}
  </span>
</div>` : '<p>Health score not available.</p>'}

<!-- ═══ FIRE SUMMARY ════════════════════════════════════════════════════════ -->
<h2>FIRE Summary</h2>
${fire ? `
<div class="grid grid-2" style="margin-bottom:10px;">
  <div class="card-dark">
    <div class="card-label">Corpus Required</div>
    <div class="card-value">${fmtINR(Number(fire.corpusRequired))}</div>
    <div class="card-sub">To retire at age ${fire.fireAge}</div>
  </div>
  <div class="card" style="background:#FEE2E2;">
    <div class="card-label" style="color:#991B1B;">Corpus Gap</div>
    <div class="card-value" style="color:${Number(fire.corpusGap) > 0 ? '#EF4444' : '#10B981'};">
      ${Number(fire.corpusGap) > 0 ? fmtINR(Number(fire.corpusGap)) : 'On Track ✓'}
    </div>
    <div class="card-sub" style="color:#6B7280;">Gap after current SIPs compound</div>
  </div>
</div>
<div class="grid grid-3">
  <div class="card">
    <div class="card-label">Add. SIP Needed</div>
    <div class="card-value">${fmtINR(Number(fire.monthlySipRequired))}<span style="font-size:12px;font-weight:400;">/mo</span></div>
  </div>
  <div class="card">
    <div class="card-label">Existing SIPs FV</div>
    <div class="card-value">${fmtINR(Number(fire.existingSipFutureValue ?? 0))}</div>
  </div>
  <div class="card">
    <div class="card-label">Current Corpus FV</div>
    <div class="card-value">${fmtINR(Number(fire.currentCorpusFutureValue))}</div>
  </div>
</div>

<h3>Year-by-Year Projection (first 20 years)</h3>
<table>
  <thead><tr><th>Year</th><th>Age</th><th>Portfolio</th><th>Annual SIP</th><th>Returns</th></tr></thead>
  <tbody>${projRows}</tbody>
</table>
` : '<p>FIRE data not available. Complete onboarding to see projections.</p>'}

<!-- ═══ PORTFOLIO ═══════════════════════════════════════════════════════════ -->
<h2 class="page-break">Portfolio Overview</h2>
${summary ? `
<div class="grid grid-2" style="margin-bottom:12px;">
  <div class="card-dark">
    <div class="card-label">Total Corpus</div>
    <div class="card-value">${fmtINR(Number(summary.totalCorpus))}</div>
    <div class="card-sub">Monthly contribution: ${fmtINR(Number(summary.monthlyContribution))}</div>
  </div>
  <div class="card">
    <div class="card-label">No. of Investments</div>
    <div class="card-value">${invList.length}</div>
  </div>
</div>

<h3>Asset Allocation</h3>
<table>
  <thead><tr><th>Category</th><th>Value</th><th>Weight</th></tr></thead>
  <tbody>${allocRows}</tbody>
</table>

<h3>Investment Details</h3>
<table>
  <thead><tr><th>Name</th><th>Type</th><th>Current Value</th><th>Monthly</th><th>Lock-in</th></tr></thead>
  <tbody>${invRows || '<tr><td colspan="5" style="color:#9CA3AF;">No investments added yet.</td></tr>'}</tbody>
</table>
` : '<p>Portfolio data not available.</p>'}

<!-- ═══ TAX COMPARISON ══════════════════════════════════════════════════════ -->
<h2>Tax Comparison — FY 2025-26</h2>
${tax ? `
<div class="grid grid-2" style="margin-bottom:12px;">
  <div class="regime-box regime-old">
    <div class="regime-label">Old Regime</div>
    <div class="regime-tax">${tax.oldRegimeTax.toLocaleString('en-IN')}</div>
    <div style="font-size:11px;color:#6B7280;">Taxable income: ${fmtINR(tax.oldRegimeTaxableIncome)}</div>
    <div style="font-size:11px;color:#6B7280;">Effective rate: ${tax.effectiveOldRate.toFixed(1)}%</div>
    ${tax.recommendedRegime === 'old' ? '<div class="regime-rec">✓ Recommended</div>' : ''}
  </div>
  <div class="regime-box regime-new">
    <div class="regime-label">New Regime</div>
    <div class="regime-tax">${tax.newRegimeTax.toLocaleString('en-IN')}</div>
    <div style="font-size:11px;color:#6B7280;">Taxable income: ${fmtINR(tax.newRegimeTaxableIncome)}</div>
    <div style="font-size:11px;color:#6B7280;">Effective rate: ${tax.effectiveNewRate.toFixed(1)}%</div>
    ${tax.recommendedRegime === 'new' ? '<div class="regime-rec">✓ Recommended</div>' : ''}
  </div>
</div>
<div class="card" style="background:#F0FDF4;">
  <div class="card-label">Tax Savings by choosing ${tax.recommendedRegime === 'old' ? 'Old' : 'New'} Regime</div>
  <div class="card-value" style="color:#1B4332;">₹${tax.savings.toLocaleString('en-IN')}/yr</div>
</div>
${tax.section80cRemaining > 0 ? `
<p style="margin-top:8px;font-size:12px;color:#374151;">
  80C headroom remaining: <strong>₹${tax.section80cRemaining.toLocaleString('en-IN')}</strong>
  — invest in ELSS / PPF / NPS to reduce old regime tax further.
</p>` : ''}
` : '<p>Tax data not available. Add your income details to see comparison.</p>'}

<!-- ═══ DISCLAIMER ══════════════════════════════════════════════════════════ -->
<div class="disclaimer">
  <strong>Important Disclaimer:</strong> This report is generated by WealthPath for educational
  purposes only and does not constitute investment advice, financial planning, or tax advice.
  All projections are based on assumed rates of return and inflation that may differ from actual
  market performance. Tax calculations are based on FY 2025-26 slabs and may not reflect your
  complete tax situation. Consult a SEBI-registered investment advisor and a qualified CA before
  making financial decisions. Data protected under DPDP Act 2023.
</div>
<div class="footer">WealthPath · Generated ${today()} · For educational purposes only</div>

</body>
</html>`;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetches all required data in parallel, builds the HTML report,
 * converts it to a PDF via expo-print, and opens the share sheet.
 */
export async function exportPdfReport(): Promise<void> {
  const [userRes, fireRes, invRes, taxRes, healthRes] = await Promise.allSettled([
    usersApi.getMe(),
    fireApi.calculate(),
    investmentsApi.getAll(),
    taxApi.getComparison(),
    healthScoreApi.calculate(),
  ]);

  const data = {
    user:        userRes.status === 'fulfilled'    ? userRes.value.data    : null,
    fire:        fireRes.status === 'fulfilled'    ? fireRes.value.data    : null,
    investments: invRes.status === 'fulfilled'     ? invRes.value.data     : null,
    tax:         taxRes.status === 'fulfilled'     ? taxRes.value.data     : null,
    health:      healthRes.status === 'fulfilled'  ? healthRes.value.data  : null,
  };

  const html = buildHtml(data);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Save or share your WealthPath report',
      UTI: 'com.adobe.pdf',
    });
  } else {
    // Fallback: open the print dialog
    await Print.printAsync({ uri });
  }
}
