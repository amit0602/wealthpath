export function formatINR(n: number, { decimals = 2 }: { decimals?: number } = {}): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(decimals)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(decimals)} L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(decimals)} K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

export function formatINRDelta(n: number): string {
  const abs = Math.abs(n);
  const sign = n >= 0 ? '+' : '−';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)} K`;
  return `${sign}₹${abs.toFixed(0)}`;
}
