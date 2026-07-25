export function computeRowTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

export function computeSubtotal(
  items: Array<{ quantity: number; unitPrice: number }>,
): number {
  return (
    Math.round(
      items.reduce(
        (acc, item) => acc + computeRowTotal(item.quantity, item.unitPrice),
        0,
      ) * 100,
    ) / 100
  );
}
