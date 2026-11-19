/* Role-based access control — single source of truth for who can do what.
   Shared by API routes (enforcement) and the dashboard UI (hiding controls).
   Never trust the UI: every API route calls requireStaff(permission). */

export const ROLES = ["OWNER", "ADMIN", "MANAGER", "INVENTORY", "SALES", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "dashboard:view",
  "finance:view", // revenue, cost price, inventory value
  "products:read",
  "products:create",
  "products:update",
  "products:delete",
  "stock:read",
  "stock:adjust",
  "orders:read",
  "orders:update",
  "staff:read",
  "staff:manage",
  "locations:manage",
  "audit:read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: ALL,
  ADMIN: ALL,
  MANAGER: [
    "dashboard:view", "finance:view",
    "products:read", "products:create", "products:update",
    "stock:read", "stock:adjust",
    "orders:read", "orders:update",
    "staff:read", "audit:read",
  ],
  INVENTORY: ["dashboard:view", "products:read", "stock:read", "stock:adjust"],
  SALES: ["dashboard:view", "products:read", "stock:read", "orders:read", "orders:update"],
  VIEWER: ["dashboard:view", "finance:view", "products:read", "stock:read", "orders:read"],
};

export const ROLE_INFO: Record<Role, { label: string; description: string; color: string }> = {
  OWNER: { label: "Owner", description: "Full control of the store, including other owners.", color: "#7c3aed" },
  ADMIN: { label: "Administrator", description: "Full control except managing owners.", color: "#1656ce" },
  MANAGER: { label: "Store manager", description: "Catalogue, prices, stock, orders and sales reports.", color: "#0891b2" },
  INVENTORY: { label: "Stock keeper", description: "Receives goods and adjusts stock levels.", color: "#16a34a" },
  SALES: { label: "Sales agent", description: "Processes orders and checks stock availability.", color: "#ea580c" },
  VIEWER: { label: "Viewer", description: "Read-only access (accountant, analyst).", color: "#64748b" },
};

/** Higher number = more privilege. */
export const ROLE_RANK: Record<Role, number> = { OWNER: 60, ADMIN: 50, MANAGER: 40, INVENTORY: 30, SALES: 30, VIEWER: 10 };

export function can(role: Role | null | undefined, permission: Permission): boolean {
  return !!role && ROLE_PERMISSIONS[role]?.includes(permission);
}

/** Roles an actor may grant: owners grant any role; others only roles strictly below their own. */
export function assignableRoles(actor: Role): Role[] {
  if (actor === "OWNER") return [...ROLES];
  if (!can(actor, "staff:manage")) return [];
  return ROLES.filter((r) => ROLE_RANK[r] < ROLE_RANK[actor]);
}

/** Whether an actor may change/disable a target staff member. */
export function canManageStaff(actor: Role, target: Role): boolean {
  if (!can(actor, "staff:manage")) return false;
  if (actor === "OWNER") return true;
  return ROLE_RANK[target] < ROLE_RANK[actor];
}

export const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Allowed order status transitions (forward-only workflow). */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const STOCK_ADJUST_TYPES = ["RESTOCK", "RETURN", "DAMAGE", "LOSS", "COUNT"] as const;
/** Roles that always see every location (others can be limited to some shops). */
export const ALL_LOCATION_ROLES: Role[] = ["OWNER", "ADMIN"];
export type StockAdjustType = (typeof STOCK_ADJUST_TYPES)[number];

export const STOCK_TYPE_INFO: Record<string, { label: string; sign: "+" | "-" | "=" }> = {
  INITIAL: { label: "Opening stock", sign: "=" },
  RESTOCK: { label: "Restock (goods received)", sign: "+" },
  RETURN: { label: "Customer return", sign: "+" },
  SALE: { label: "Sale", sign: "-" },
  CANCEL: { label: "Order cancelled", sign: "+" },
  DAMAGE: { label: "Damaged / defective", sign: "-" },
  LOSS: { label: "Lost / stolen", sign: "-" },
  COUNT: { label: "Stock count correction", sign: "=" },
  TRANSFER_OUT: { label: "Transfer out", sign: "-" },
  TRANSFER_IN: { label: "Transfer in", sign: "+" },
};
