"use client";
import { useState } from "react";
import { Check, Copy, KeyRound, Link2, LogOut, Mail, MessageCircle, Minus, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { useAdmin } from "./AdminApp";
import {
  Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, RoleBadge, Select, Spinner,
  api, cx, td, th, timeAgo, useApi,
} from "./ui";
import { canManageStaff, PERMISSIONS, ROLES, ROLE_INFO, ROLE_PERMISSIONS, type Permission, type Role } from "@/lib/rbac";

interface StaffRow {
  id: number; email: string; name: string | null; image: string | null; role: Role; active: boolean;
  lastLoginAt: string | null; createdAt: string; hasSignedIn: boolean; invitedBy: { email: string } | null;
  hasGoogle: boolean; hasPassword: boolean; linkPending: boolean;
  allLocations: boolean; locations: { id: number; name: string; code: string }[];
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
  "locations:manage": "Create & edit locations (shops)",
  "audit:read": "View activity log",
};

export function StaffPage() {
  const { can, me, toast } = useAdmin();
  const { data, error, reload } = useApi<{ rows: StaffRow[]; assignableRoles: Role[]; me: number }>("/api/admin/staff");
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<StaffRow | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [link, setLink] = useState<{ url: string; email: string; reset: boolean } | null>(null);
  const [scoping, setScoping] = useState<StaffRow | null>(null);

  const newLink = async (s: StaffRow) => {
    try {
      const d = await api<{ url: string; email: string }>(`/api/admin/staff/${s.id}/link`, { method: "POST" });
      setLink({ url: d.url, email: d.email, reset: s.hasPassword });
      reload();
    } catch (e) { toast((e as Error).message, "err"); }
  };
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
                <th className={th}>Member</th><th className={th}>Role</th><th className={th}>Locations</th><th className={th}>Status</th><th className={th}>Last sign-in</th>
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
                        {s.allLocations ? (
                          <span className="text-[12px] text-slate-500">All locations</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {s.locations.length ? s.locations.map((l) => <span key={l.id} title={l.name} className="font-mono text-[11px] font-bold bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{l.code}</span>)
                              : <span className="text-[12px] text-amber-600">None assigned</span>}
                          </div>
                        )}
                        {editable && !["OWNER", "ADMIN"].includes(s.role) && (
                          <button onClick={() => setScoping(s)} className="block text-[11.5px] font-semibold text-[var(--em-red)] hover:underline mt-1">Change</button>
                        )}
                      </td>
                      <td className={td}>
                        {!s.active ? <Badge color="#64748b" dot>Disabled</Badge> : s.hasSignedIn ? <Badge color="#16a34a" dot>Active</Badge> : <Badge color="#d97706" dot>Invited</Badge>}
                        <div className="text-[11px] text-slate-400 mt-1">
                          {[s.hasGoogle && "Google", s.hasPassword && "Password"].filter(Boolean).join(" · ") || (s.linkPending ? "Link sent, not used yet" : "No access link")}
                        </div>
                      </td>
                      <td className={cx(td, "text-slate-500 text-[12px]")}>{s.hasSignedIn ? timeAgo(s.lastLoginAt) : `Invited ${timeAgo(s.createdAt)}${s.invitedBy ? ` by ${s.invitedBy.email}` : ""}`}</td>
                      {manage && (
                        <td className={cx(td, "text-right whitespace-nowrap")}>
                          {(editable || self) && s.active && (
                            <Button size="sm" variant="ghost" icon={s.hasPassword ? KeyRound : Link2} onClick={() => newLink(s)} title={s.hasPassword ? "Create a password reset link" : "Create an invitation link"}>
                              {s.hasPassword ? "Reset link" : "Access link"}
                            </Button>
                          )}
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

      {inviting && data && <InviteModal roles={data.assignableRoles} onClose={() => setInviting(false)} onDone={(l) => { setInviting(false); setLink(l); reload(); }} />}
      {link && <AccessLinkModal {...link} onClose={() => setLink(null)} />}
      {scoping && (
        <LocationScopeModal
          title={`Locations for ${scoping.name || scoping.email}`}
          initial={scoping.allLocations ? [] : scoping.locations.map((l) => l.id)}
          onClose={() => setScoping(null)}
          onSave={async (ids) => {
            await patch(scoping, { locationIds: ids }, ids.length ? `${scoping.email} now works at ${ids.length} location(s)` : `${scoping.email} now has access to all locations`);
            setScoping(null);
          }}
        />
      )}
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

function InviteModal({ roles, onClose, onDone }: { roles: Role[]; onClose: () => void; onDone: (link: { url: string; email: string; reset: boolean }) => void }) {
  const { toast } = useAdmin();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>(roles.includes("SALES") ? "SALES" : roles[roles.length - 1]);
  const [locationIds, setLocationIds] = useState<number[]>([]);
  const allRole = role === "OWNER" || role === "ADMIN";
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const d = await api<{ url: string }>("/api/admin/staff", { method: "POST", json: { email, role, name: name || undefined, locationIds: allRole ? [] : locationIds } });
      toast(`${email} invited`);
      onDone({ url: d.url, email, reset: false });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Modal title="Invite a staff member" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={submit} disabled={!email}>Send invite</Button></>}>
      {err && <div className="text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3" role="alert">{err}</div>}
      <div className="space-y-3.5">
        <Field label="Email address" hint="Any email works (Gmail, Yahoo, Outlook, company…). You'll get a link to send them."><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" autoFocus /></Field>
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
        {allRole ? (
          <p className="text-[12px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{ROLE_INFO[role].label}s always have access to every location.</p>
        ) : (
          <LocationPicker value={locationIds} onChange={setLocationIds} />
        )}
      </div>
    </Modal>
  );
}

/** Empty selection = all locations. */
function LocationPicker({ value, onChange }: { value: number[]; onChange: (ids: number[]) => void }) {
  const { me } = useAdmin();
  const all = value.length === 0;
  return (
    <Field label="Works at" hint={all ? "Can see and manage every shop." : "Only sees stock, orders and figures for these shops."}>
      <div className="space-y-1.5">
        <label className={cx("flex items-center gap-2.5 border rounded-lg px-3 py-2 cursor-pointer text-[13px]", all ? "border-[var(--em-red)] bg-[var(--em-red)]/5" : "border-slate-200")}>
          <input type="checkbox" checked={all} onChange={() => onChange(all ? (me.allLocations[0] ? [me.allLocations[0].id] : []) : [])} className="accent-[var(--em-red)]" />
          <b>All locations</b>
        </label>
        <div className="grid sm:grid-cols-2 gap-1.5">
          {me.allLocations.map((l) => {
            const on = value.includes(l.id);
            return (
              <label key={l.id} className={cx("flex items-center gap-2.5 border rounded-lg px-3 py-2 cursor-pointer text-[13px]", on ? "border-[var(--em-red)] bg-[var(--em-red)]/5" : "border-slate-200", all && "opacity-50")}>
                <input type="checkbox" checked={on} onChange={() => onChange(on ? value.filter((x) => x !== l.id) : [...value, l.id])} className="accent-[var(--em-red)]" />
                <span className="font-mono text-[11px] font-bold text-slate-500">{l.code}</span> {l.name}
              </label>
            );
          })}
        </div>
      </div>
    </Field>
  );
}

function LocationScopeModal({ title, initial, onSave, onClose }: { title: string; initial: number[]; onSave: (ids: number[]) => Promise<void>; onClose: () => void }) {
  const [ids, setIds] = useState<number[]>(initial);
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={async () => { setBusy(true); try { await onSave(ids); } finally { setBusy(false); } }}>Save</Button></>}>
      <LocationPicker value={ids} onChange={setIds} />
      <p className="text-[11.5px] text-slate-400 mt-3">Saving signs this person out so the new access applies immediately.</p>
    </Modal>
  );
}

function AccessLinkModal({ url, email, reset, onClose }: { url: string; email: string; reset: boolean; onClose: () => void }) {
  const { toast } = useAdmin();
  const text = reset
    ? `Hello, here is your link to set a new password for the Cheap Laptops Ghana dashboard (valid 72 h, single use): ${url}`
    : `Hello, you've been invited to the Cheap Laptops Ghana staff dashboard. Open this link to create your password (valid 72 h, single use): ${url}\nIf you have a Google account with ${email}, you can also use "Continue with Google".`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast("Link copied"); } catch { toast("Copy failed — select the link manually", "err"); }
  };
  return (
    <Modal title={reset ? "Password reset link" : "Invitation link"} onClose={onClose} footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      <p className="text-[13px] text-slate-600 mb-3">
        Send this private link to <b>{email}</b>. It works <b>once</b> and expires in <b>72 hours</b>. It won't be shown again — you can always create a new one.
      </p>
      <div className="flex gap-2">
        <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="font-mono !text-[12px]" aria-label="Access link" />
        <Button icon={Copy} onClick={copy}>Copy</Button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 rounded-lg bg-[#25D366] text-white hover:opacity-90">
          <MessageCircle size={15} /> Send on WhatsApp
        </a>
        <a href={`mailto:${email}?subject=${encodeURIComponent("Your Cheap Laptops Ghana dashboard access")}&body=${encodeURIComponent(text)}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
          <Mail size={15} /> Send by email
        </a>
      </div>
    </Modal>
  );
}
