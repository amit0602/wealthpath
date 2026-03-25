/**
 * CDSL / NSDL Demat CAS CSV parser.
 *
 * Handles CSV exports from:
 *   - CDSL (cdslindia.com → Detailed Account Statement → CSV)
 *   - NSDL (nsdlindia.org → Account Statement → CSV)
 *
 * Expected columns (case-insensitive, order flexible):
 *   ISIN
 *   Company / Issuer Name / Security Name / Security Description
 *   Quantity / No. of Shares / Balance Quantity / Qty
 *   Market Value / Current Value / Value
 *   Cost / Purchase Value / Avg Cost / Acquisition Value
 */

export interface ParsedEquityHolding {
  companyName: string;
  isin: string;
  quantity: number;
  currentValue: number;
  costValue: number;
  instrumentType: string;   // direct_equity | sgb | gold | mutual_fund_equity | other
  expectedReturnRate: number;
  depository: string;       // cdsl | nsdl | unknown
}

// ---------------------------------------------------------------------------
// Instrument classification
// ---------------------------------------------------------------------------

function classifyEquity(name: string): { instrumentType: string; expectedReturnRate: number } {
  const n = name.toLowerCase();

  // Sovereign Gold Bond
  if (n.includes('sovereign gold bond') || n.includes(' sgb ') || n.startsWith('sgb ')) {
    return { instrumentType: 'sgb', expectedReturnRate: 0.08 };
  }

  // Gold ETF
  if (
    (n.includes('gold') && n.includes('etf')) ||
    n.includes('goldbees') ||
    n.includes('gold fund')
  ) {
    return { instrumentType: 'gold', expectedReturnRate: 0.08 };
  }

  // Equity ETF (Nifty BeES, SensexETF, etc.)
  if (n.includes('etf') || n.includes('bees') || n.includes('index fund')) {
    return { instrumentType: 'mutual_fund_equity', expectedReturnRate: 0.12 };
  }

  // Bonds / NCDs / Debentures — treat as debt
  if (
    n.includes(' bond') ||
    n.includes('debenture') ||
    n.includes(' ncd') ||
    n.includes('perpetual') ||
    n.includes('subordinated') ||
    n.includes('commercial paper') ||
    n.includes('treasury bill') ||
    n.includes('t-bill')
  ) {
    return { instrumentType: 'other', expectedReturnRate: 0.07 };
  }

  // Default: direct equity (stocks)
  return { instrumentType: 'direct_equity', expectedReturnRate: 0.12 };
}

function detectDepository(content: string): string {
  const upper = content.substring(0, 500).toUpperCase();
  if (upper.includes('CDSL')) return 'cdsl';
  if (upper.includes('NSDL')) return 'nsdl';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// CSV helpers (shared with MF CAS)
// ---------------------------------------------------------------------------

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let current = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function cleanNumber(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[₹,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function findCol(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const idx = headers.findIndex((h) =>
      h.toLowerCase().includes(alias.toLowerCase()),
    );
    if (idx >= 0) return idx;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseDematCasCsv(content: string): {
  holdings: ParsedEquityHolding[];
  depository: string;
} {
  const depository = detectDepository(content);

  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Find header row — must contain "isin" + one of quantity/qty/shares
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (
      lower.includes('isin') &&
      (lower.includes('quantity') ||
        lower.includes('qty') ||
        lower.includes('shares') ||
        lower.includes('no. of'))
    ) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    throw new Error(
      'Could not find a header row. Make sure you upload a valid CDSL / NSDL demat CAS CSV file.',
    );
  }

  const headers = parseCSVLine(lines[headerIdx]);

  const colIsin    = findCol(headers, ['isin']);
  const colName    = findCol(headers, [
    'company name', 'issuer name', 'security name', 'security description',
    'issuer', 'security', 'company', 'scrip name', 'description',
  ]);
  const colQty     = findCol(headers, [
    'quantity', 'balance quantity', 'no. of shares', 'qty', 'shares',
  ]);
  const colCurVal  = findCol(headers, [
    'market value', 'current value', 'value(rs)', 'value (rs)',
    'mkt value', 'present value',
  ]);
  const colCost    = findCol(headers, [
    'cost value', 'purchase value', 'avg cost', 'acquisition value',
    'purchase price', 'avg. cost', 'cost',
  ]);

  if (colIsin === -1)   throw new Error('Cannot find ISIN column in CSV.');
  if (colName === -1)   throw new Error('Cannot find Company/Security Name column in CSV.');
  if (colQty === -1)    throw new Error('Cannot find Quantity column in CSV.');
  if (colCurVal === -1) throw new Error('Cannot find Market Value column in CSV.');

  const holdings: ParsedEquityHolding[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    if (cells.length < headers.length - 2) continue;

    const isin = cells[colIsin]?.trim() ?? '';
    // ISIN must start with 2 alpha chars + 10 alphanumeric (basic sanity)
    if (!isin || !/^[A-Z]{2}[A-Z0-9]{10}$/i.test(isin)) continue;

    const companyName = cells[colName]?.replace(/^["']|["']$/g, '').trim();
    if (!companyName) continue;

    // Skip totals / subtotals rows
    const nameLower = companyName.toLowerCase();
    if (
      nameLower.startsWith('total') ||
      nameLower.startsWith('grand total') ||
      nameLower.startsWith('sub total')
    ) {
      continue;
    }

    const quantity   = cleanNumber(cells[colQty]);
    const curVal     = cleanNumber(cells[colCurVal]);
    const costVal    = colCost >= 0 ? cleanNumber(cells[colCost]) : curVal;

    if (quantity === 0 && curVal === 0) continue;

    const { instrumentType, expectedReturnRate } = classifyEquity(companyName);

    holdings.push({
      companyName,
      isin,
      quantity,
      currentValue: curVal,
      costValue: costVal,
      instrumentType,
      expectedReturnRate,
      depository,
    });
  }

  if (holdings.length === 0) {
    throw new Error(
      'No holdings found. Ensure the file has data rows with valid ISINs below the header.',
    );
  }

  return { holdings, depository };
}
