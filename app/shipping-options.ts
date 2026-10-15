// Client-safe helpers to present freight options (no server imports).

type Option = { id: string; priceCents: number; deliveryDays: number };

export const FEATURED_LIMIT = 4;

export function cheapestAndFastest(options: Option[]) {
  const cheapest = options.length ? [...options].sort((a, b) => a.priceCents - b.priceCents || a.deliveryDays - b.deliveryDays)[0].id : "";
  const fastest = options.length > 1 ? [...options].sort((a, b) => a.deliveryDays - b.deliveryDays || a.priceCents - b.priceCents)[0].id : "";
  return { cheapest, fastest: fastest === cheapest ? "" : fastest };
}

// Up to `limit` options: the cheapest, the fastest, then the next cheapest,
// always keeping `keepId` (e.g. the option already chosen) visible. The
// original price order is preserved.
export function featuredOptions<T extends Option>(options: T[], keepId = "", limit = FEATURED_LIMIT): T[] {
  if (options.length <= limit) return options;
  const { cheapest, fastest } = cheapestAndFastest(options);
  const ids = new Set([cheapest, fastest, keepId].filter(Boolean));
  for (const option of options) {
    if (ids.size >= limit) break;
    ids.add(option.id);
  }
  return options.filter((option) => ids.has(option.id));
}
