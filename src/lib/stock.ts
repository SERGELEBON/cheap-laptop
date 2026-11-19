/* Stock ledger: every stock change goes through applyStockChange inside a DB
   transaction. Stock is kept per location (ProductStock); Product.stock is the
   total across locations and is updated in the same transaction. The location
   row is locked (SELECT … FOR UPDATE) so concurrent orders/adjustments can't
   oversell or lose updates. Server-side only. */
import type { Prisma, StockMovementType } from "@prisma/client";

export class StockError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "INSUFFICIENT" | "INVALID") {
    super(message);
  }
}

/**
 * @param amount for COUNT / INITIAL: the new absolute stock at the location;
 *               otherwise a positive quantity whose sign comes from the type.
 */
export async function applyStockChange(
  tx: Prisma.TransactionClient,
  opts: {
    productId: number;
    locationId: number;
    type: StockMovementType;
    amount: number;
    actorId?: number | null;
    note?: string | null;
    orderId?: number | null;
  }
) {
  if (!Number.isInteger(opts.amount) || opts.amount < 0) throw new StockError("Quantity must be a positive whole number", "INVALID");

  const product = await tx.product.findUnique({ where: { id: opts.productId }, select: { name: true } });
  if (!product) throw new StockError("Product not found", "NOT_FOUND");
  const loc = await tx.location.findUnique({ where: { id: opts.locationId }, select: { name: true } });
  if (!loc) throw new StockError("Location not found", "NOT_FOUND");

  /* make sure the row exists, then lock it */
  await tx.$executeRaw`INSERT INTO "ProductStock" ("productId", "locationId", "quantity", "updatedAt")
    VALUES (${opts.productId}, ${opts.locationId}, 0, now()) ON CONFLICT ("productId", "locationId") DO NOTHING`;
  const rows = await tx.$queryRaw<{ quantity: number }[]>`SELECT "quantity" FROM "ProductStock"
    WHERE "productId" = ${opts.productId} AND "locationId" = ${opts.locationId} FOR UPDATE`;
  const before = rows[0]?.quantity ?? 0;

  let after: number;
  switch (opts.type) {
    case "COUNT":
    case "INITIAL":
      after = opts.amount;
      break;
    case "RESTOCK":
    case "RETURN":
    case "CANCEL":
    case "TRANSFER_IN":
      after = before + opts.amount;
      break;
    case "SALE":
    case "DAMAGE":
    case "LOSS":
    case "TRANSFER_OUT":
      after = before - opts.amount;
      break;
    default:
      throw new StockError("Unknown movement type", "INVALID");
  }
  if (after < 0) {
    throw new StockError(`Not enough stock of "${product.name}" at ${loc.name} (available: ${before})`, "INSUFFICIENT");
  }

  const delta = after - before;
  await tx.productStock.update({
    where: { productId_locationId: { productId: opts.productId, locationId: opts.locationId } },
    data: { quantity: after },
  });
  if (delta !== 0) {
    await tx.$executeRaw`UPDATE "Product" SET "stock" = "stock" + ${delta}, "updatedAt" = now() WHERE "id" = ${opts.productId}`;
  }
  const movement = await tx.stockMovement.create({
    data: {
      productId: opts.productId,
      locationId: opts.locationId,
      type: opts.type,
      quantity: delta,
      stockBefore: before,
      stockAfter: after,
      note: opts.note ?? null,
      orderId: opts.orderId ?? null,
      actorId: opts.actorId ?? null,
    },
  });
  return { before, after, movement, name: product.name, locationName: loc.name };
}

/** Moves stock between two locations (two ledger entries, total unchanged). */
export async function transferStock(
  tx: Prisma.TransactionClient,
  opts: { productId: number; fromId: number; toId: number; quantity: number; actorId: number; note?: string | null }
) {
  if (opts.fromId === opts.toId) throw new StockError("Choose two different locations", "INVALID");
  if (opts.quantity <= 0) throw new StockError("Quantity must be at least 1", "INVALID");
  /* lock in a stable order to avoid deadlocks between opposite transfers */
  const first = Math.min(opts.fromId, opts.toId);
  await tx.$executeRaw`INSERT INTO "ProductStock" ("productId", "locationId", "quantity", "updatedAt")
    VALUES (${opts.productId}, ${first}, 0, now()) ON CONFLICT ("productId", "locationId") DO NOTHING`;
  await tx.$queryRaw`SELECT 1 FROM "ProductStock" WHERE "productId" = ${opts.productId} AND "locationId" = ${first} FOR UPDATE`;

  const out = await applyStockChange(tx, { productId: opts.productId, locationId: opts.fromId, type: "TRANSFER_OUT", amount: opts.quantity, actorId: opts.actorId, note: opts.note });
  const inn = await applyStockChange(tx, { productId: opts.productId, locationId: opts.toId, type: "TRANSFER_IN", amount: opts.quantity, actorId: opts.actorId, note: opts.note });
  return { out, inn };
}
