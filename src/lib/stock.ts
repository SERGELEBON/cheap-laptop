/* Stock ledger: every stock change goes through applyStockChange inside a DB
   transaction. The product row is locked (SELECT … FOR UPDATE) so concurrent
   orders/adjustments can't oversell or lose updates. Server-side only. */
import type { Prisma, StockMovementType } from "@prisma/client";

export class StockError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "INSUFFICIENT" | "INVALID") {
    super(message);
  }
}

/**
 * @param amount for COUNT: the new absolute stock; otherwise a positive quantity
 *               whose sign is derived from the movement type.
 */
export async function applyStockChange(
  tx: Prisma.TransactionClient,
  opts: { productId: number; type: StockMovementType; amount: number; actorId?: number | null; note?: string | null; orderId?: number | null }
) {
  const rows = await tx.$queryRaw<{ stock: number; name: string }[]>`SELECT "stock", "name" FROM "Product" WHERE "id" = ${opts.productId} FOR UPDATE`;
  if (rows.length === 0) throw new StockError("Product not found", "NOT_FOUND");
  const before = rows[0].stock;

  if (!Number.isInteger(opts.amount) || opts.amount < 0) throw new StockError("Quantity must be a positive whole number", "INVALID");

  let after: number;
  switch (opts.type) {
    case "COUNT":
    case "INITIAL":
      after = opts.amount;
      break;
    case "RESTOCK":
    case "RETURN":
    case "CANCEL":
      after = before + opts.amount;
      break;
    case "SALE":
    case "DAMAGE":
    case "LOSS":
      after = before - opts.amount;
      break;
    default:
      throw new StockError("Unknown movement type", "INVALID");
  }
  if (after < 0) {
    throw new StockError(`Not enough stock for "${rows[0].name}" (available: ${before})`, "INSUFFICIENT");
  }

  await tx.product.update({ where: { id: opts.productId }, data: { stock: after } });
  const movement = await tx.stockMovement.create({
    data: {
      productId: opts.productId,
      type: opts.type,
      quantity: after - before,
      stockBefore: before,
      stockAfter: after,
      note: opts.note ?? null,
      orderId: opts.orderId ?? null,
      actorId: opts.actorId ?? null,
    },
  });
  return { before, after, movement, name: rows[0].name };
}
