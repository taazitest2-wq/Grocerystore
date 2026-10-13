/**
 * Decimal-safe financial arithmetic for BusinessDesk Grocery
 * Eliminates JavaScript IEEE-754 floating-point inaccuracies
 * using exact integer cent (1/100th) conversions.
 */

export const Money = {
  /**
   * Round to 2 decimal places using exact cents
   */
  round(val: number): number {
    if (!Number.isFinite(val)) return 0;
    return Math.round(val * 100) / 100;
  },

  /**
   * Safe addition in integer cents
   */
  add(a: number, b: number): number {
    const cA = Math.round((a || 0) * 100);
    const cB = Math.round((b || 0) * 100);
    return (cA + cB) / 100;
  },

  /**
   * Safe subtraction in integer cents
   */
  sub(a: number, b: number): number {
    const cA = Math.round((a || 0) * 100);
    const cB = Math.round((b || 0) * 100);
    return (cA - cB) / 100;
  },

  /**
   * Safe multiplication in integer cents
   */
  mul(a: number, b: number): number {
    const cA = Math.round((a || 0) * 100);
    return Math.round(cA * (b || 0)) / 100;
  },

  /**
   * Safe division in integer cents
   */
  div(a: number, b: number): number {
    if (!b || b === 0) return 0;
    const cA = Math.round((a || 0) * 100);
    return Math.round(cA / b) / 100;
  },

  /**
   * Calculate sales tax
   */
  tax(taxableAmount: number, ratePercent: number): number {
    if (!ratePercent || ratePercent <= 0 || !taxableAmount || taxableAmount <= 0) return 0;
    const cTaxable = Math.round(taxableAmount * 100);
    return Math.round(cTaxable * (ratePercent / 100)) / 100;
  },

  /**
   * Proportionately distributes a cart-level discount across items
   * Guarantees the sum of distributed discounts strictly equals the total discount down to the penny
   */
  distributeDiscount(
    items: { gross: number }[],
    totalDiscount: number
  ): number[] {
    const totalGross = items.reduce((sum, it) => sum + (it.gross || 0), 0);
    if (totalGross <= 0 || totalDiscount <= 0) {
      return items.map(() => 0);
    }

    const cappedDiscount = Math.min(totalDiscount, totalGross);
    let remainingCents = Math.round(cappedDiscount * 100);
    const totalGrossCents = Math.round(totalGross * 100);
    const distributed: number[] = [];

    for (let i = 0; i < items.length; i++) {
      if (i === items.length - 1) {
        // Last item gets the exact remaining penny to prevent rounding drift
        distributed.push(remainingCents / 100);
      } else {
        const itemGrossCents = Math.round(items[i].gross * 100);
        const shareCents = Math.min(
          Math.round((itemGrossCents / totalGrossCents) * Math.round(cappedDiscount * 100)),
          remainingCents
        );
        distributed.push(shareCents / 100);
        remainingCents -= shareCents;
      }
    }

    return distributed;
  },

  /**
   * Format currency for display
   */
  format(val: number, symbol: string = 'Rs.', precision: number = 2): string {
    const safeVal = Number.isFinite(val) ? val : 0;
    return `${symbol} ${safeVal.toLocaleString(undefined, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    })}`;
  },
};
