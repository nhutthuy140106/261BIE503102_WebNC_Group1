export interface PricedChoice {
  price: number;
}

/** Tính tiền hiển thị ở FE (server tính lại khi tạo đơn — không tin số này). */
export function calcOrderTotal(opts: {
  unitPrice: number;
  quantity: number;
  extras?: PricedChoice[];
  deliveryFee?: number;
  discount?: number;
}): number {
  const extra = (opts.extras ?? []).reduce((s, c) => s + c.price, 0);
  const total = (opts.unitPrice + extra) * opts.quantity + (opts.deliveryFee ?? 0) - (opts.discount ?? 0);
  return Math.max(0, total);
}
