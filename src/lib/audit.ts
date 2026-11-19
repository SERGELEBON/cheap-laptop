/* Append-only audit trail of staff actions. Never throws: an audit failure
   must not break the action being audited. Server-side only. */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { StaffSession } from "@/lib/admin-auth";

export async function audit(
  actor: Pick<StaffSession, "id" | "email"> | null,
  action: string,
  opts: { entity?: string; entityId?: string | number; summary?: string; details?: Prisma.InputJsonValue; ip?: string | null } = {}
) {
  try {
    await db.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        action,
        entity: opts.entity ?? null,
        entityId: opts.entityId !== undefined ? String(opts.entityId) : null,
        summary: (opts.summary ?? "").slice(0, 300),
        details: opts.details,
        ip: opts.ip ?? null,
      },
    });
  } catch (e) {
    console.error("audit log failed", action, e);
  }
}
