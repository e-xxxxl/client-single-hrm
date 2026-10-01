import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Drawer from "../../components/ui/Drawer.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Select from "../../components/ui/Select.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import FilterBar, { SearchInput } from "../../components/ui/FilterBar.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { fieldErrors } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { users as usersApi } from "../../services/hrm.js";
import { ORG_ADMIN_ROLE, ROLES } from "../../utils/constants.js";
import { dateTime, fullName } from "../../utils/format.js";

const INITIAL_FILTERS = { search: "", role: "", status: "" };

/**
 * Logins for this organization — create users, change roles, suspend,
 * reset passwords, and (Org Admin only) per-user permission overrides.
 * Everything is scoped server-side to the signed-in user's organization.
 */
export default function UsersRoles() {
  const [tab, setTab] = useState("users");
  const canWrite = useAuth((s) => s.can("user:write"));
  const [creating, setCreating] = useState(false);
  const [reload, setReload] = useState(0);

  return (
    <>
      <PageHeader
        title="Users & Roles"
        description="Who can sign in to this organization, and what each role is allowed to do."
        actions={canWrite && tab === "users" && <Button onClick={() => setCreating(true)}>Add user</Button>}
      />
      <Tabs
        tabs={[
          { key: "users", label: "Users" },
          { key: "roles", label: "Roles & permissions" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "users" && <UsersTab reload={reload} canWrite={canWrite} />}
      {tab === "roles" && <RolesMatrix />}
      {creating && (
        <CreateUserModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setReload((n) => n + 1);
          }}
        />
      )}
    </>
  );
}

function UsersTab({ reload, canWrite }) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const search = useDebouncedValue(filters.search);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      role: filters.role || undefined,
      status: filters.status || undefined,
    }),
    [page, search, filters],
  );
  const list = useApiQuery("/users", { params, deps: [reload] });
  const update = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  return (
    <>
      <FilterBar active={JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS)} onClear={() => update(INITIAL_FILTERS)}>
        <SearchInput value={filters.search} onChange={(v) => update({ search: v })} placeholder="Name or email" />
        <Select className="lg:w-44" placeholder="All roles" options={ROLES} value={filters.role} onChange={(e) => update({ role: e.target.value })} />
        <Select
          className="lg:w-40"
          placeholder="Any status"
          options={[
            { value: "active", label: "Active" },
            { value: "suspended", label: "Suspended" },
          ]}
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
        />
      </FilterBar>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        onRowClick={(row) => setSelected(row.id)}
        empty={{ title: "No users found", description: "Try a different search or filter." }}
        columns={[
          {
            key: "name",
            header: "User",
            primary: true,
            render: (u) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">{u.name}</p>
                <p className="truncate text-xs text-ink-500">{u.email}</p>
              </div>
            ),
          },
          { key: "role", header: "Role", secondary: true },
          {
            key: "employee",
            header: "Employee record",
            render: (u) => (u.employee ? `${fullName(u.employee)} · ${u.employee.employeeId}` : <span className="text-ink-400">Not linked</span>),
          },
          { key: "status", header: "Status", render: (u) => <Badge status={u.status} /> },
          { key: "lastLoginAt", header: "Last sign-in", render: (u) => (u.lastLoginAt ? dateTime(u.lastLoginAt) : "Never") },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {selected && (
        <UserDrawer
          id={selected}
          canWrite={canWrite}
          onClose={() => setSelected(null)}
          onChanged={() => list.refetch()}
        />
      )}
    </>
  );
}

function UserDrawer({ id, canWrite, onClose, onChanged }) {
  const session = useAuth((s) => s.session);
  const me = useAuth((s) => s.user);
  const detail = useApiQuery(`/users/${id}`);
  const catalogue = useApiQuery("/users/roles");
  const [busy, setBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);
  const [overrides, setOverrides] = useState(null);

  const user = detail.data?.user;
  const isSelf = Boolean(user && me && String(user.id) === String(me.id));
  const isOrgAdmin = session?.role === ORG_ADMIN_ROLE;
  const assignable = catalogue.data?.assignable || [];
  // Mirrors the server rule: never yourself; Org Admin manages anyone, others only lower roles.
  const manageable = canWrite && user && !isSelf && (isOrgAdmin || assignable.includes(user.role));

  useEffect(() => {
    if (user) setOverrides({ grant: user.permissionsGrant || [], revoke: user.permissionsRevoke || [] });
  }, [user]);

  async function apply(body, message) {
    setBusy(true);
    try {
      await usersApi.update(id, body);
      toast.success(message);
      await detail.refetch();
      onChanged();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    setBusy(true);
    try {
      const pw = await usersApi.resetPassword(id);
      setTempPassword(pw);
      toast.success("Password reset — the user must choose a new one at next sign-in");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const roleOptions = user ? [...new Set([user.role, ...assignable])] : [];

  return (
    <Drawer open onClose={onClose} title={user?.name || "User"} description={user?.email} size="lg">
      {detail.loading || !user ? (
        <div className="flex justify-center py-16 text-ink-400">
          <Spinner size={22} />
        </div>
      ) : (
        <div className="space-y-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-2xs uppercase tracking-wide text-ink-400">Status</dt>
              <dd className="mt-0.5">
                <Badge status={user.status} />
              </dd>
            </div>
            <div>
              <dt className="text-2xs uppercase tracking-wide text-ink-400">Last sign-in</dt>
              <dd className="mt-0.5 text-ink-800">{user.lastLoginAt ? dateTime(user.lastLoginAt) : "Never"}</dd>
            </div>
            <div>
              <dt className="text-2xs uppercase tracking-wide text-ink-400">Employee record</dt>
              <dd className="mt-0.5 text-ink-800">{user.employee ? `${fullName(user.employee)} (${user.employee.employeeId})` : "Not linked"}</dd>
            </div>
            <div>
              <dt className="text-2xs uppercase tracking-wide text-ink-400">Two-factor</dt>
              <dd className="mt-0.5 text-ink-800">{user.twoFactor?.enabled ? "Enabled" : "Off"}</dd>
            </div>
          </dl>

          {tempPassword && (
            <Alert tone="success" title="Temporary password">
              <span className="font-mono">{tempPassword}</span> — share it securely; it is shown only once.
            </Alert>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold text-ink-900">Role</h3>
            {manageable ? (
              <Select
                value={user.role}
                disabled={busy}
                options={roleOptions}
                onChange={(e) => apply({ role: e.target.value }, `Role changed to ${e.target.value}`)}
              />
            ) : (
              <p className="text-sm text-ink-700">
                {user.role}
                {!canWrite ? "" : isSelf ? " — you cannot change your own role" : " — outside what your role can manage"}
              </p>
            )}
          </section>

          {manageable && (
            <section className="flex flex-wrap gap-2">
              {user.status === "active" ? (
                <Button variant="danger" size="sm" loading={busy} onClick={() => apply({ status: "suspended" }, "User suspended and signed out")}>
                  Suspend access
                </Button>
              ) : (
                <Button variant="secondary" size="sm" loading={busy} onClick={() => apply({ status: "active" }, "User reactivated")}>
                  Reactivate
                </Button>
              )}
              <Button variant="secondary" size="sm" loading={busy} onClick={resetPassword}>
                Reset password
              </Button>
            </section>
          )}

          <section>
            <h3 className="mb-1 text-sm font-semibold text-ink-900">Effective permissions</h3>
            <p className="mb-3 text-xs text-ink-500">
              From the {user.role} role{isOrgAdmin && manageable ? " — tick or untick to add per-user overrides." : "."}
            </p>
            <PermissionOverrides
              base={catalogue.data?.roles?.find((r) => r.role === user.role)?.permissions || []}
              all={catalogue.data?.permissions || []}
              overrides={overrides}
              editable={isOrgAdmin && manageable}
              onChange={setOverrides}
            />
            {isOrgAdmin && manageable && overrides && (
              <Button
                className="mt-3"
                size="sm"
                loading={busy}
                onClick={() => apply({ permissionsGrant: overrides.grant, permissionsRevoke: overrides.revoke }, "Permission overrides saved")}
              >
                Save overrides
              </Button>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}

function groupPermissions(list) {
  const groups = {};
  for (const p of list) {
    const [resource] = p.split(":");
    (groups[resource] ||= []).push(p);
  }
  return groups;
}

function PermissionOverrides({ base, all, overrides, editable, onChange }) {
  if (!overrides) return null;
  const effective = new Set([...base, ...overrides.grant].filter((p) => !overrides.revoke.includes(p)));

  function toggle(p) {
    const inBase = base.includes(p);
    const on = effective.has(p);
    const grant = new Set(overrides.grant);
    const revoke = new Set(overrides.revoke);
    if (on) {
      grant.delete(p);
      if (inBase) revoke.add(p);
    } else {
      revoke.delete(p);
      if (!inBase) grant.add(p);
    }
    onChange({ grant: [...grant], revoke: [...revoke] });
  }

  return (
    <div className="divide-y divide-ink-100 rounded-md border border-ink-200">
      {Object.entries(groupPermissions(all)).map(([resource, perms]) => (
        <div key={resource} className="flex flex-col gap-1.5 px-3 py-2 sm:flex-row sm:items-start sm:gap-4">
          <p className="w-28 shrink-0 text-xs font-medium capitalize text-ink-700">{resource}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {perms.map((p) => {
              const on = effective.has(p);
              const overridden = overrides.grant.includes(p) || overrides.revoke.includes(p);
              return (
                <label key={p} className={`flex items-center gap-1.5 text-xs ${on ? "text-ink-800" : "text-ink-400"}`}>
                  <input type="checkbox" checked={on} disabled={!editable} onChange={() => toggle(p)} />
                  {p.split(":")[1].replaceAll("_", " ")}
                  {overridden && <span className="text-2xs text-amber-600">(override)</span>}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function RolesMatrix() {
  const catalogue = useApiQuery("/users/roles");
  if (catalogue.loading) {
    return (
      <div className="flex justify-center py-16 text-ink-400">
        <Spinner size={22} />
      </div>
    );
  }
  if (catalogue.error) return <Alert tone="error">{catalogue.error.message}</Alert>;
  const { roles, permissions } = catalogue.data;
  const groups = groupPermissions(permissions);

  return (
    <div className="card overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-ink-200 bg-ink-50 text-left text-2xs uppercase tracking-wide text-ink-500">
            <th className="px-3 py-2.5 font-medium">Permission</th>
            {roles.map((r) => (
              <th key={r.role} className="whitespace-nowrap px-3 py-2.5 text-center font-medium">
                {r.role}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {Object.entries(groups).map(([resource, perms]) =>
            perms.map((p, i) => (
              <tr key={p}>
                <td className="whitespace-nowrap px-3 py-1.5 text-ink-700">
                  {i === 0 && <span className="mr-2 font-semibold capitalize text-ink-900">{resource}</span>}
                  <span className="text-ink-500">{p.split(":")[1].replaceAll("_", " ")}</span>
                </td>
                {roles.map((r) => (
                  <td key={r.role} className="px-3 py-1.5 text-center">
                    {r.permissions.includes(p) ? <span className="text-emerald-600">●</span> : <span className="text-ink-200">–</span>}
                  </td>
                ))}
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }) {
  const catalogue = useApiQuery("/users/roles");
  const employees = useApiQuery("/hrm/employees", { params: { limit: 100, status: "active", sort: "lastName" } });
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "Employee", password: "", employee: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const errs = fieldErrors(error);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const unlinked = (employees.data || []).filter((e) => !e.user);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await usersApi.create({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
        password: form.password || undefined,
        employee: form.employee || undefined,
      });
      toast.success(`Created a ${result.user.role} login for ${result.user.email}`);
      if (result.tempPassword) setCreated(result);
      else onCreated();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <Modal
        open
        onClose={onCreated}
        title="User created"
        footer={<Button onClick={onCreated}>Done</Button>}
      >
        <Alert tone="success" title="Temporary password">
          <span className="font-mono">{created.tempPassword}</span> — share it with {created.user.email} securely. It is
          shown only once; they will be asked to change it at first sign-in.
        </Alert>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add user"
      description="Creates a login in this organization."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-user" loading={busy}>
            Create user
          </Button>
        </>
      }
    >
      <form id="create-user" onSubmit={submit} className="space-y-4">
        {error && !Object.keys(errs).length && <Alert tone="error">{error.message}</Alert>}
        <Select
          label="Link to employee (optional)"
          placeholder="No employee record"
          value={form.employee}
          onChange={(e) => {
            const emp = unlinked.find((x) => x.id === e.target.value);
            setForm((f) => ({ ...f, employee: e.target.value, name: emp ? fullName(emp) : f.name, email: emp ? emp.email : f.email }));
          }}
          options={unlinked.map((e) => ({ value: e.id, label: `${fullName(e)} · ${e.employeeId}` }))}
        />
        <TextField label="Full name" required value={form.name} onChange={set("name")} error={errs.name} />
        <TextField label="Email" type="email" required value={form.email} onChange={set("email")} error={errs.email} />
        <TextField label="Phone" value={form.phone} onChange={set("phone")} error={errs.phone} />
        <Select
          label="Role"
          required
          value={form.role}
          onChange={set("role")}
          options={catalogue.data?.assignable || []}
          error={errs.role}
        />
        <TextField
          label="Password (optional)"
          type="password"
          value={form.password}
          onChange={set("password")}
          error={errs.password}
          hint="Leave blank to generate a temporary password."
        />
      </form>
    </Modal>
  );
}
