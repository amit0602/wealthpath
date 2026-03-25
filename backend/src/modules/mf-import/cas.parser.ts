/**
 * CAS (Consolidated Account Statement) parser.
 * Handles CSV exports from CAMS, KFintech, and MFCentral.
 *
 * Expected CSV columns (case-insensitive, order flexible):
 *   Scheme / Fund / Scheme Name
 *   ISIN
 *   Units
 *   Market Value / Current Value / Value
 *   Avg. Cost / Purchase Value / Cost Value / Invested
 */

export interface ParsedHolding {
  schemeName: string;
  isin: string;
  units: number;
  currentValue: number;
  costValue: number;
  instrumentType: string;
  expectedReturnRate: number;
  amc: string;
}

// ---------------------------------------------------------------------------
// Fund classification
// ---------------------------------------------------------------------------

function classifyFund(name: string): { instrumentType: string; expectedReturnRate: number } {
  const n = name.toLowerCase();

  if (
    n.includes('elss') ||
    n.includes('tax saver') ||
    n.includes('tax saving') ||
    n.includes('long term equity')
  ) {
    return { instrumentType: 'elss', expectedReturnRate: 0.12 };
  }

  if (
    n.includes('liquid') ||
    n.includes('overnight') ||
    n.includes('money market') ||
    n.includes('ultra short') ||
    n.includes('low duration') ||
    n.includes('short term') ||
    n.includes('short duration') ||
    n.includes('medium duration') ||
    n.includes('long duration') ||
    n.includes('gilt') ||
    n.includes('g-sec') ||
    n.includes('gsec') ||
    n.includes('bond fund') ||
    n.includes('debt fund') ||
    n.includes('credit risk') ||
    n.includes('banking and psu') ||
    n.includes('banking & psu') ||
    n.includes('corporate bond') ||
    n.includes('floating rate') ||
    n.includes('fixed maturity') ||
    n.includes('fmp')
  ) {
    return { instrumentType: 'mutual_fund_debt', expectedReturnRate: 0.07 };
  }

  // Hybrid — treat as equity for FIRE purposes (majority equity allocation)
  if (
    n.includes('aggressive hybrid') ||
    n.includes('equity hybrid') ||
    n.includes('balanced advantage') ||
    n.includes('dynamic asset') ||
    n.includes('equity savings')
  ) {
    return { instrumentType: 'mutual_fund_equity', expectedReturnRate: 0.11 };
  }

  if (
    n.includes('conservative hybrid') ||
    n.includes('arbitrage') ||
    n.includes('multi asset')
  ) {
    return { instrumentType: 'mutual_fund_debt', expectedReturnRate: 0.08 };
  }

  // Default: equity MF
  return { instrumentType: 'mutual_fund_equity', expectedReturnRate: 0.12 };
}

// ---------------------------------------------------------------------------
// CSV parsing helpers
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

// Find column index case-insensitively, trying multiple aliases
function findCol(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => h.toLowerCase().includes(alias.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseCasCsv(content: string): ParsedHolding[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Find header row — must contain at least "scheme" or "fund" AND "units"
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (
      (lower.includes('scheme') || lower.includes('fund')) &&
      lower.includes('unit')
    ) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    throw new Error(
      'Could not find a header row. Make sure you upload a valid CAMS / KFintech CAS CSV file.',
    );
  }

  const headers = parseCSVLine(lines[headerIdx]);

  // Map column aliases to indices
  const colScheme = findCol(headers, ['scheme name', 'scheme', 'fund name', 'fund']);
  const colAmc    = findCol(headers, ['amc', 'amcname', 'registrar']);
  const colIsin   = findCol(headers, ['isin']);
  const colUnits  = findCol(headers, ['units', 'balance units', 'closing units']);
  const colCurVal = findCol(headers, ['market value', 'current value', 'value(rs)', 'value (rs)', 'mkt value']);
  const colCost   = findCol(headers, ['avg. cost', 'avg cost', 'purchase value', 'cost value', 'invested', 'purchase cost']);

  if (colScheme === -1) throw new Error('Cannot find Scheme Name column in CSV.');
  if (colUnits === -1)  throw new Error('Cannot find Units column in CSV.');
  if (colCurVal === -1) throw new Error('Cannot find Current Value column in CSV.');

  const holdings: ParsedHolding[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    if (cells.length < headers.length - 2) continue; // skip short/empty rows

    const schemeName = cells[colScheme]?.replace(/^["']|["']$/g, '').trim();
    if (!schemeName || schemeName.toLowerCase().startsWith('total') || schemeName.toLowerCase().startsWith('grand')) {
      continue; // skip totals rows
    }

    const units      = cleanNumber(cells[colUnits]);
    const curVal     = cleanNumber(cells[colCurVal]);
    const costVal    = colCost >= 0 ? cleanNumber(cells[colCost]) : curVal;
    const isin       = colIsin >= 0 ? (cells[colIsin]?.trim() ?? '') : '';
    const amc        = colAmc >= 0  ? (cells[colAmc]?.trim()  ?? '') : '';

    if (units === 0 && curVal === 0) continue; // skip zero-balance rows

    const { instrumentType, expectedReturnRate } = classifyFund(schemeName);

    holdings.push({
      schemeName,
      isin,
      units,
      currentValue: curVal,
      costValue: costVal,
      instrumentType,
      expectedReturnRate,
      amc,
    });
  }

  if (holdings.length === 0) {
    throw new Error('No holdings found. Ensure the file has data rows below the header.');
  }

  return holdings;
}
