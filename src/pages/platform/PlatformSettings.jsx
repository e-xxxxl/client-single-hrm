import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Select from "../../components/ui/Select.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { platform } from "../../services/platform.js";
import { PAYROLL_STRATEGIES } from "../../utils/constants.js";

export default function PlatformSettings() {
  const canWrite = useAuth((s) => s.can("platform:write"));
  const { data, loading, error, refetch } = useApiQuery("/platform/settings");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        platformName: data.platformName || "",
        supportEmail: data.supportEmail || "",
        allowOrganizationLogins: data.allowOrganizationLogins !== false,
        timezone: data.defaults?.timezone || "Africa/Lagos",
        currency: data.defaults?.currency || "NGN",
        payrollStrategy: data.defaults?.payrollStrategy || "fixed-monthly",
        country: data.defaults?.country || "",
      });
    }
  }, [data]);

  if (loading || !form) {
    return (
      <div className="flex justify-center py-16 text-ink-400">
        <Spinner size={22} />
      </div>
    );
  }
  if (error) return <Alert tone="error">{error.message}</Alert>;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await platform.updateSettings({
        platformName: form.platformName,
        supportEmail: form.supportEmail,
        allowOrganizationLogins: form.allowOrganizationLogins,
        defaults: {
          timezone: form.timezone,
          currency: form.currency,
          payrollStrategy: form.payrollStrategy,
          country: form.country,
        },
      });
      toast.success("Platform settings saved");
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Platform settings" description="Platform-wide options. Nothing here reads or changes any organization's HR data." />
      <form onSubmit={submit} className="max-w-2xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Platform name" value={form.platformName} disabled={!canWrite} onChange={set("platformName")} />
          <TextField label="Support email" type="email" value={form.supportEmail} disabled={!canWrite} onChange={set("supportEmail")} />
        </div>

        <div className="flex items-center justify-between rounded-md border border-ink-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-medium text-ink-900">Allow organization sign-ins</p>
            <p className="text-xs text-ink-500">Turn off for maintenance — organization users can't sign in or refresh sessions.</p>
          </div>
          <button
            type="button"
            disabled={!canWrite}
            onClick={() => setForm((f) => ({ ...f, allowOrganizationLogins: !f.allowOrganizationLogins }))}
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${form.allowOrganizationLogins ? "bg-brand-600" : "bg-ink-300"}`}
            aria-pressed={form.allowOrganizationLogins}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${form.allowOrganizationLogins ? "left-4" : "left-0.5"}`} />
          </button>
        </div>

        <div>
          <p className="label">Defaults for new organizations</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Timezone" value={form.timezone} disabled={!canWrite} onChange={set("timezone")} hint="IANA name, e.g. Africa/Lagos" />
            <TextField label="Currency" value={form.currency} disabled={!canWrite} onChange={set("currency")} />
            <Select label="Payroll strategy" value={form.payrollStrategy} disabled={!canWrite} onChange={set("payrollStrategy")} options={PAYROLL_STRATEGIES} />
            <TextField label="Country" value={form.country} disabled={!canWrite} onChange={set("country")} />
          </div>
        </div>

        {canWrite && (
          <Button type="submit" loading={busy}>
            Save settings
          </Button>
        )}
      </form>
    </>
  );
}
