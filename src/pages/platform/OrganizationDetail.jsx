import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Select from "../../components/ui/Select.jsx";
import Alert from "../../components/ui/Alert.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { fieldErrors } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { platform } from "../../services/platform.js";
import { PAYROLL_STRATEGIES } from "../../utils/constants.js";
import { dateShort, dateTime } from "../../utils/format.js";

export default function OrganizationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const enterOrganization = useAuth((s) => s.enterOrganization);
  const canWrite = useAuth((s) => s.can("platform:write"));
  const { data, loading, error, refetch } = useApiQuery(`/platform/organizations/${id}`);
  const [statusModal, setStatusModal] = useState(false);
  const [adminModal, setAdminModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [secret, setSecret] = useState(null);

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-ink-400">
        <Spinner size={24} />
      </div>
    );
  }
  if (error) {
    return <EmptyState title="Could not load this organization" description={error.message} action={<Link to="/platform/organizations" className="btn-secondary">Back to organizations</Link>} />;
  }

  const { organization: org, stats, admins } = data;

  async function adminAction(fn, message) {
    try {
      const result = await fn();
      if (typeof result === "string") setSecret(result);
      toast.success(message);
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title={org.name}
        description={`${org.code}${org.industry ? ` · ${org.industry}` : ""} · created ${dateShort(org.createdAt)}`}
        actions={
          canWrite && (
            <>
              {org.status === "active" && (
                <Button
                  onClick={async () => {
                    try {
                      await enterOrganization(org.id);
                      navigate("/hrm", { replace: true });
                    } catch (err) {
                      toast.error(err.message);
                    }
                  }}
                >
                  Open HR workspace
                </Button>
              )}
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit details
              </Button>
              <Button variant={org.status === "active" ? "danger" : "primary"} onClick={() => setStatusModal(true)}>
                {org.status === "active" ? "Deactivate" : "Activate"}
              </Button>
            </>
          )
        }
      />

      {org.status !== "active" && (
        <Alert tone="warning" className="mb-4" title="This organization is inactive">
          Nobody in it can sign in or use the API{org.statusReason ? ` — ${org.statusReason}` : ""}. Its data is kept intact.
        </Alert>
      )}

      {secret && (
        <Alert tone="success" className="mb-4" title="Temporary password">
          <span className="font-mono">{secret}</span> — share it securely; it is shown only once.
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-5">
        <Stat label="Status" value={<Badge status={org.status} />} />
        <Stat label="Active employees" value={stats.activeEmployees} />
        <Stat label="All employees" value={stats.totalEmployees} />
        <Stat label="User accounts" value={stats.users} />
        <Stat label="Departments / branches" value={`${stats.departments} / ${stats.branches}`} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="card">
          <h2 className="border-b border-ink-200 px-4 py-3 text-sm font-semibold text-ink-900">Profile</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 px-4 py-4 text-sm sm:grid-cols-2">
            <Field label="Legal name" value={org.legalName} />
            <Field label="Payroll strategy" value={PAYROLL_STRATEGIES.find((p) => p.value === org.payrollStrategy)?.label} />
            <Field label="Email" value={org.email} />
            <Field label="Phone" value={org.phone} />
            <Field label="Address" value={org.address} />
            <Field label="State / country" value={[org.state, org.country].filter(Boolean).join(", ")} />
            <Field label="Timezone" value={org.settings?.timezone} />
            <Field label="Currency" value={org.settings?.currency} />
          </dl>
        </section>

        <section className="card">
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink-900">Organization administrators</h2>
            {canWrite && (
              <Button size="sm" className="!w-auto" onClick={() => setAdminModal(true)}>
                Add admin
              </Button>
            )}
          </div>
          {admins.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-400">No Org Admins.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {admins.map((a) => (
                <li key={a.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {a.name} <Badge status={a.status} className="ml-1" />
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {a.email} · {a.lastLoginAt ? `last sign-in ${dateTime(a.lastLoginAt)}` : "never signed in"}
                    </p>
                  </div>
                  {canWrite && (
                    <div className="flex shrink-0 gap-3 text-xs">
                      <button
                        type="button"
                        className="link"
                        onClick={() => adminAction(() => platform.resetAdminPassword(org.id, a.id), `Password reset for ${a.email}`)}
                      >
                        Reset password
                      </button>
                      <button
                        type="button"
                        className={a.status === "active" ? "text-red-600 hover:underline" : "link"}
                        onClick={() =>
                          adminAction(
                            () => platform.setAdminStatus(org.id, a.id, a.status === "active" ? "suspended" : "active"),
                            a.status === "active" ? `${a.email} suspended` : `${a.email} reactivated`,
                          )
                        }
                      >
                        {a.status === "active" ? "Suspend" : "Reactivate"}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-ink-100 px-4 py-2.5 text-2xs text-ink-500">
            Platform administrators manage an organization's admins only — its HR records stay private to the organization.
          </p>
        </section>
      </div>

      {statusModal && (
        <StatusModal
          org={org}
          onClose={() => setStatusModal(false)}
          onDone={() => {
            setStatusModal(false);
            refetch();
          }}
        />
      )}
      {adminModal && (
        <AddAdminModal
          org={org}
          onClose={() => setAdminModal(false)}
          onDone={(tempPassword) => {
            setAdminModal(false);
            if (tempPassword) setSecret(tempPassword);
            refetch();
          }}
        />
      )}
      {editing && (
        <EditOrganizationModal
          org={org}
          onClose={() => setEditing(false)}
          onDone={() => {
            setEditing(false);
            refetch();
          }}
        />
      )}
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
      <div className="mt-1 text-lg font-semibold text-ink-900">{value}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-0.5 break-words text-ink-800">{value || "—"}</dd>
    </div>
  );
}

function StatusModal({ org, onClose, onDone }) {
  const activating = org.status !== "active";
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await platform.setOrganizationStatus(org.id, activating ? "active" : "inactive", reason);
      toast.success(activating ? `${org.name} activated` : `${org.name} deactivated`);
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={activating ? `Activate ${org.name}?` : `Deactivate ${org.name}?`}
      description={
        activating
          ? "Its users will be able to sign in again."
          : "Every user in this organization is signed out and can't sign in until it is reactivated. No data is deleted."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={activating ? "primary" : "danger"} loading={busy} onClick={confirm}>
            {activating ? "Activate" : "Deactivate"}
          </Button>
        </>
      }
    >
      <TextField label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
    </Modal>
  );
}

function AddAdminModal({ org, onClose, onDone }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const errs = fieldErrors(error);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { admin, tempPassword } = await platform.addAdmin(org.id, {
        name: form.name,
        email: form.email,
        password: form.password || undefined,
      });
      toast.success(`${admin.email} is now an Org Admin of ${org.name}`);
      onDone(tempPassword);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Add an Org Admin to ${org.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-admin" loading={busy}>
            Add admin
          </Button>
        </>
      }
    >
      <form id="add-admin" onSubmit={submit} className="space-y-4">
        {error && !Object.keys(errs).length && <Alert tone="error">{error.message}</Alert>}
        <TextField label="Full name" required value={form.name} onChange={set("name")} error={errs.name} />
        <TextField label="Email" type="email" required value={form.email} onChange={set("email")} error={errs.email} />
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

function EditOrganizationModal({ org, onClose, onDone }) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const errs = fieldErrors(error);

  useEffect(() => {
    setForm({
      name: org.name || "",
      code: org.code || "",
      industry: org.industry || "",
      legalName: org.legalName || "",
      email: org.email || "",
      phone: org.phone || "",
      address: org.address || "",
      state: org.state || "",
      country: org.country || "",
      payrollStrategy: org.payrollStrategy,
    });
  }, [org]);

  if (!form) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await platform.updateOrganization(org.id, form);
      toast.success("Organization updated");
      onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Edit organization"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-org" loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <form id="edit-org" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {error && !Object.keys(errs).length && (
          <Alert tone="error" className="sm:col-span-2">
            {error.message}
          </Alert>
        )}
        <TextField label="Name" required value={form.name} onChange={set("name")} error={errs.name} />
        <TextField label="Code" required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} error={errs.code} />
        <TextField label="Industry" value={form.industry} onChange={set("industry")} />
        <TextField label="Legal name" value={form.legalName} onChange={set("legalName")} />
        <TextField label="Email" type="email" value={form.email} onChange={set("email")} error={errs.email} />
        <TextField label="Phone" value={form.phone} onChange={set("phone")} />
        <TextField className="sm:col-span-2" label="Address" value={form.address} onChange={set("address")} />
        <TextField label="State" value={form.state} onChange={set("state")} />
        <TextField label="Country" value={form.country} onChange={set("country")} />
        <Select className="sm:col-span-2" label="Payroll strategy" value={form.payrollStrategy} onChange={set("payrollStrategy")} options={PAYROLL_STRATEGIES} />
      </form>
    </Modal>
  );
}
