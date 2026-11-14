/**
 * Festive Rookie Pass offer — DISPLAY ONLY.
 * ⚠️ The amount actually charged is set by the backend (`plans` table, plan `rookie_pass_yearly`,
 * currently ₹399). Update the backend price before launch so checkout matches what we show here.
 */
export const sale = {
  name: 'Festive offer',
  currency: '₹',
  original: 999,
  price: 399,
  per: 'year',
  /** Real end time. Don't silently move it; a resetting timer breaks trust. */
  endsAt: '2026-11-16T23:59:59+05:30',
  perks: ['Every JEE Main & Advanced PYQ', 'Unlimited AI solutions', 'Unlimited custom tests'],
};

export const saleMoney = (n: number) => `${sale.currency}${n.toLocaleString('en-IN')}`;
export const saleOff = Math.round((1 - sale.price / sale.original) * 100);
export const salePerMonth = Math.round(sale.price / 12);
