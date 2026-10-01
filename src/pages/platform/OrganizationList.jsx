import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Select from "../../components/ui/Select.jsx";
import Alert from "../../components/ui/Alert.jsx";
import FilterBar, { SearchInput } from "../../components/ui/FilterBar.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { fieldErrors } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { platform } from "../../services/platform.js";
import { PAYROLL_STRATEGIES } from "../../utils/constants.js";
import { dateShort } from "../../utils/format.js";

const INITIAL_FILTERS = { search: "", status: "" };

export default function OrganizationList() {
  const navigate = useNavigate();
  const canWrite = useAuth((s) => s.can("platform:write"));
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const search = useDebouncedValue(filters.search);

  const params = useMemo(
    () => ({ page, limit: 20, search: search || undefined, status: filters.status || undefined }),
    [page, search, filters],
  );
  const list = useApiQuery("/platform/organizations", { params });
  const update = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Organizations"
        description="Each organization's HR data is isolated — you manage the tenant, not its records."
        actions={canWrite && <Button onClick={() => setCreating(true)}>New organization</Button>}
      />

      <FilterBar active={JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS)} onClear={() => update(INITIAL_FILTERS)}>
        <SearchInput value={filters.search} onChange={(v) => update({ search: v })} placeholder="Name, code or email" />
        <Select
          className="lg:w-40"
          placeholder="Any status"
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
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
        onRowClick={(o) => navigate(`/platform/organizations/${o.id}`)}
        empty={{ title: "No organizations", description: "Create the first organization to get started." }}
        columns={[
          {
            key: "name",
            header: "Organization",
            primary: true,
            render: (o) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">{o.name}</p>
                <p className="truncate text-xs text-ink-500">
                  {o.code}
                  {o.industry ? ` · ${o.industry}` : ""}
                </p>
              </div>
            ),
          },
          { key: "status", header: "Status", secondary: true, render: (o) => <Badge status={o.status} /> },
          { key: "employees", header: "Active employees", align: "right", render: (o) => o.stats?.activeEmployees ?? 0 },
          { key: "users", header: "Users", align: "right", render: (o) => o.stats?.users ?? 0 },
          { key: "payrollStrategy", header: "Payroll", hideOnMobile: true },
          { key: "createdAt", header: "Created", render: (o) => dateShort(o.createdAt) },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {creating && (
        <CreateOrganizationModal
          onClose={() => setCreating(false)}
          onCreated={(org) => {
            setCreating(false);
            navigate(`/platform/organizations/${org.id}`);
          }}
        />
      )}
    </>
  );
}

function CreateOrganizationModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    industry: "",
    email: "",
    phone: "",
    address: "",
    payrollStrategy: "fixed-monthly",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const errs = fieldErrors(error);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await platform.createOrganization({
        name: form.name,
        code: form.code,
        industry: form.industry || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        payrollStrategy: form.payrollStrategy,
        admin: { name: form.adminName, email: form.adminEmail, password: form.adminPassword || undefined },
      });
      toast.success(`${created.organization.name} created`);
      if (created.tempPassword) setResult(created);
      else onCreated(created.organization);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <Modal open onClose={() => onCreated(result.organization)} title="Organization created" footer={<Button onClick={() => onCreated(result.organization)}>Done</Button>}>
        <Alert tone="success" title="Org Admin temporary password">
          <span className="font-mono">{result.tempPassword}</span> — share it with {result.admin.email} securely. It is
          shown only once; they must change it at first sign-in.
        </Alert>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="New organization"
      description="Creates the tenant and its first Org Admin. Standard leave types are set up automatically."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-org" loading={busy}>
            Create organization
          </Button>
        </>
      }
    >
      <form id="create-org" onSubmit={submit} className="space-y-5">
        {error && !Object.keys(errs).length && <Alert tone="error">{error.message}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Organization name" required value={form.name} onChange={set("name")} error={errs.name} />
          <TextField
            label="Code"
            required
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            error={errs.code}
            hint="2–10 letters/numbers; prefixes employee IDs"
          />
          <TextField label="Industry" value={form.industry} onChange={set("industry")} error={errs.industry} />
          <Select label="Payroll strategy" value={form.payrollStrategy} onChange={set("payrollStrategy")} options={PAYROLL_STRATEGIES} />
          <TextField label="Contact email" type="email" value={form.email} onChange={set("email")} error={errs.email} />
          <TextField label="Phone" value={form.phone} onChange={set("phone")} error={errs.phone} />
          <TextField className="sm:col-span-2" label="Address" value={form.address} onChange={set("address")} error={errs.address} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-900">First Org Admin</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Full name" required value={form.adminName} onChange={set("adminName")} error={errs["admin.name"]} />
            <TextField label="Email" type="email" required value={form.adminEmail} onChange={set("adminEmail")} error={errs["admin.email"]} />
            <TextField
              className="sm:col-span-2"
              label="Password (optional)"
              type="password"
              value={form.adminPassword}
              onChange={set("adminPassword")}
              error={errs["admin.password"]}
              hint="Leave blank to generate a temporary password."
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
