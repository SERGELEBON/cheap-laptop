"use client";
import { useState } from "react";
import { Check, LogOut, Minus, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { useAdmin } from "./AdminApp";
import {
  Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, RoleBadge, Select, Spinner,
  api, cx, td, th, timeAgo, useApi,
} from "./ui";
import { canManageStaff, PERMISSIONS, ROLES, ROLE_INFO, ROLE_PERMISSIONS, type Permission, type Role } from "@/lib/rbac";

interface StaffRow {
  id: number; email: string; name: string | null; image: string | null; role: Role; active: boolean;
  lastLoginAt: string | null; createdAt: string; hasSignedIn: boolean; invitedBy: { email: string } | null;
}

const PERM_LABELS: Record<Permission, string> = {
  "dashboard:view": "View dashboard",
  "finance:view": "See revenue, costs & stock value",
  "products:read": "View products",
  "products:create": "Add products",
  "products:update": "Edit products & prices",
  "products:delete": "Delete products",
  "stock:read": "View stock & history",
  "stock:adjust": "Adjust stock (restock, damage, count…)",
  "orders:read": "View orders & customers",
  "orders:update": "Process & cancel orders",
  "staff:read": "View staff list",
  "staff:manage": "Invite & manage staff",
  "audit:read": "View activity log",
};

export function StaffPage() {
  const { can, me, toast } = useAdmin();
  const { data, error, reload } = useApi<{ rows: StaffRow[]; assignableRoles: Role[]; me: number }>("/api/admin/staff");
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<StaffRow | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const manage = can("staff:manage");

  const patch = async (s: StaffRow, body: Record<string, unknown>, msg: string) => {
    try {
      await api(`/api/admin/staff/${s.id}`, { method: "PATCH", json: body });
      toast(msg);
      reload();
    } catch (e) { toast((e as Error).message, "err"); }
  };

  return (
    <div>
      <PageHeader
        title="Staff & roles"
        subtitle="Invite your team with their Google account and give each person only the access they need."
        actions={<>
          <Button icon={ShieldCheck} onClick={() => setShowMatrix(true)}>Role permissions</Button>
          {manage && <Button variant="primary" icon={UserPlus} onClick={() => setInviting(true)}>Invite staff</Button>}
        </>}
      />
      <Card padded={false}>
        {error ? <ErrorState message={error} onRetry={reload} /> : !data ? <Spinner /> : data.rows.length === 0 ? (
          <EmptyState icon={Users} title="No staff yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[780px]">
              <thead><tr>
                <th className={th}>Member</th><th className={th}>Role</th><th className={th}>Status</th><th className={th}>Last sign-in</th>
                {manage && <th className={cx(th, "text-right")}>Actions</th>}
              </tr></thead>
              <tbody>
                {data.rows.map((s) => {
                  const self = s.id === me.user.id;
                  const editable = manage && !self && canManageStaff(me.user.role, s.role);
                  return (
                    <tr key={s.id} className={cx(!s.active && "opacity-60")}>
                      <td className={td}>
                        <div className="flex items-center gap-3">
                          <Avatar name={s.name} email={s.email} image={s.image} size={34} />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate">{s.name || s.email.split("@")[0]}{self && <span className="text-slate-400 font-normal"> (you)</span>}</div>
                            <div className="text-[11.5px] text-slate-400 truncate">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className={td}>
                        {editable ? (
                          <Select value={s.role} onChange={(e) => patch(s, { role: e.target.value }, `${s.email} is now ${ROLE_INFO[e.target.value as Role].label}`)} className="!w-auto !py-1.5 text-[12.5px]" aria-label={`Role for ${s.email}`}>
                            {[...new Set([s.role, ...data.assignableRoles])].map((r) => <option key={r} value={r} disabled={!data.assignableRoles.includes(r)}>{ROLE_INFO[r].label}</option>)}
                          </Select>
                        ) : <RoleBadge role={s.role} />}
                      </td>
                      <td className={td}>
                        {!s.active ? <Badge color="#64748b" dot>Disabled</Badge> : s.hasSignedIn ? <Badge color="#16a34a" dot>Active</Badge> : <Badge color="#d97706" dot>Invited</Badge>}
                      </td>
                      <td className={cx(td, "text-slate-500 text-[12px]")}>{s.hasSignedIn ? timeAgo(s.lastLoginAt) : `Invited ${timeAgo(s.createdAt)}${s.invitedBy ? ` by ${s.invitedBy.email}` : ""}`}</td>
                      {manage && (
                        <td className={cx(td, "text-right whitespace-nowrap")}>
                          {editable && <>
                            <Button size="sm" variant="ghost" onClick={() => patch(s, { active: !s.active }, s.active ? `Access disabled for ${s.email}` : `Access restored for ${s.email}`)}>{s.active ? "Disable" : "Enable"}</Button>
                            {s.active && s.hasSignedIn && <Button size="sm" variant="ghost" icon={LogOut} title="Sign out of all devices" onClick={() => patch(s, { revokeSessions: true }, `${s.email} signed out everywhere`)} />}
                            <Button size="sm" variant="ghost" icon={Trash2} className="hover:!text-red-600" aria-label={`Remove ${s.email}`} onClick={() => setRemoving(s)} />
                          </>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-5">
        {ROLES.map((r) => (
          <div key={r} className="bg-white border border-slate-200 rounded-xl p-4">
            <RoleBadge role={r} />
            <p className="text-[12.5px] text-slate-600 mt-2">{ROLE_INFO[r].description}</p>
          </div>
        ))}
      </div>

      {inviting && data && <InviteModal roles={data.assignableRoles} onClose={() => setInviting(false)} onDone={() => { setInviting(false); reload(); }} />}
      {removing && (
        <ConfirmDialog title="Remove staff member?" danger confirmLabel="Remove" onClose={() => setRemoving(null)}
          message={<><b>{removing.email}</b> will lose access immediately. Their past actions stay in the activity log. Prefer “Disable” if they may come back.</>}
          onConfirm={async () => {
            try { await api(`/api/admin/staff/${removing.id}`, { method: "DELETE" }); toast("Staff member removed"); reload(); }
            catch (e) { toast((e as Error).message, "err"); }
            setRemoving(null);
          }} />
      )}
      {showMatrix && (
        <Modal wide title="What each role can do" onClose={() => setShowMatrix(false)}>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-[12.5px] min-w-[640px]">
              <thead><tr><th className={th}>Permission</th>{ROLES.map((r) => <th key={r} className={cx(th, "text-center")}>{ROLE_INFO[r].label}</th>)}</tr></thead>
              <tbody>
                {PERMISSIONS.map((p) => (
                  <tr key={p}>
                    <td className={cx(td, "py-2")}>{PERM_LABELS[p]}</td>
                    {ROLES.map((r) => (
                      <td key={r} className={cx(td, "py-2 text-center")}>
                        {ROLE_PERMISSIONS[r].includes(p) ? <Check size={15} className="inline text-green-600" /> : <Minus size={15} className="inline text-slate-300" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-slate-500 mt-3">Owners can manage everyone. Administrators can manage every role below them. A store always keeps at least one active owner.</p>
        </Modal>
      )}
    </div>
  );
}

function InviteModal({ roles, onClose, onDone }: { roles: Role[]; onClose: () => void; onDone: () => void }) {
  const { toast } = useAdmin();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>(roles.includes("SALES") ? "SALES" : roles[roles.length - 1]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api("/api/admin/staff", { method: "POST", json: { email, role, name: name || undefined } });
      toast(`${email} invited — they can now sign in with Google`);
      onDone();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Modal title="Invite a staff member" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={submit} disabled={!email}>Send invite</Button></>}>
      {err && <div className="text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3" role="alert">{err}</div>}
      <div className="space-y-3.5">
        <Field label="Google account email" hint="They sign in with “Continue with Google” using exactly this address."><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" autoFocus /></Field>
        <Field label="Name (optional)"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Role">
          <div className="space-y-2">
            {roles.map((r) => (
              <label key={r} className={cx("flex items-start gap-3 border rounded-lg p-3 cursor-pointer", role === r ? "border-[var(--em-red)] bg-[var(--em-red)]/5" : "border-slate-200 hover:border-slate-300")}>
                <input type="radio" name="role" checked={role === r} onChange={() => setRole(r)} className="mt-1 accent-[var(--em-red)]" />
                <span><span className="font-semibold text-[13px] text-slate-800">{ROLE_INFO[r].label}</span><span className="block text-[12px] text-slate-500">{ROLE_INFO[r].description}</span></span>
              </label>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
