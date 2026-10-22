// Mirror of backend/src/utils/attendantBreakdown.js: split a sheet's sales and
// short/over between the attendants who handled its nozzles. Expenses marked
// "paid by" go to that person; other expenses and credit sales are shared in
// proportion to sales, so the parts add back up to the sheet's variance.
export function attendantBreakdown({ pumps = [], expenses = [], credit = 0, creditSales = [], fallback = '', totalVariance = 0 }) {
  const lines = pumps
    .map((p) => ({ ...p, attendant: String(p.attendant || '').trim() || String(fallback || '').trim() }))
    .filter((p) => p.attendant);
  if (!lines.length) return [];
  const lineTotal = lines.reduce((s, p) => s + (p.amount || 0), 0) || 1;
  const perNozzle = lines.some((p) => p.cash || p.pos || p.transfer);
  const names = new Set(lines.map((p) => p.attendant));
  const direct = {};
  // Credit given from a specific nozzle is that attendant's (they collected no
  // cash for it); credit not tied to a nozzle is shared like other items.
  const nozzleOwner = new Map(lines.map((p) => [p.nozzle, p.attendant]));
  const itemised = creditSales || [];
  let shared = itemised.length ? 0 : (credit || 0);
  itemised.forEach((x) => {
    const who = x.nozzle && nozzleOwner.get(x.nozzle);
    if (who) direct[who] = (direct[who] || 0) + (x.amount || 0);
    else shared += x.amount || 0;
  });
  expenses.forEach((e) => {
    if (e.paidBy && names.has(e.paidBy)) direct[e.paidBy] = (direct[e.paidBy] || 0) + (e.amount || 0);
    else shared += e.amount || 0;
  });
  const by = {};
  lines.forEach((p) => {
    const share = (p.amount || 0) / lineTotal;
    const v = perNozzle ? (p.variance || 0) + shared * share : totalVariance * share;
    by[p.attendant] = by[p.attendant] || { name: p.attendant, sales: 0, variance: 0, litres: 0, nozzles: [] };
    const a = by[p.attendant];
    a.sales += p.amount || 0;
    a.litres += p.litres || 0;
    a.variance += v;
    if (p.nozzle && !a.nozzles.includes(p.nozzle)) a.nozzles.push(p.nozzle);
  });
  if (perNozzle) Object.entries(direct).forEach(([name, amt]) => { by[name].variance += amt; });
  return Object.values(by);
}
