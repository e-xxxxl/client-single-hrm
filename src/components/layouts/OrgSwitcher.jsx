import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";

/**
 * Platform Admin only: jump between the platform console and any
 * organization's HR workspace without signing out. The server enforces who may
 * do this (POST /auth/enter-org is Platform-Admin-only); this is just the UI.
 */
export default function OrgSwitcher() {
  const navigate = useNavigate();
  const session = useAuth((s) => s.session);
  const enterOrganization = useAuth((s) => s.enterOrganization);
  const exitOrganization = useAuth((s) => s.exitOrganization);
  const [orgs, setOrgs] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session?.isPlatformUser) return;
    api
      .get("/auth/organizations")
      .then((r) => setOrgs(r.data.data))
      .catch(() => {});
  }, [session?.isPlatformUser]);

  if (!session?.isPlatformUser) return null;

  const current = session.actingAs ? session.organizationId : "";

  async function onChange(e) {
    const next = e.target.value;
    if (next === current) return;
    setBusy(true);
    try {
      if (next) {
        await enterOrganization(next);
        navigate("/hrm", { replace: true });
      } else {
        await exitOrganization();
        navigate("/platform", { replace: true });
      }
    } catch (err) {
      toast.error(err.message || "Could not switch organization");
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={current}
      onChange={onChange}
      disabled={busy}
      aria-label="Switch organization"
      className="max-w-[11rem] rounded-md border border-ink-200 bg-white px-2 py-1.5 text-xs font-medium text-ink-700 disabled:opacity-60 sm:max-w-[14rem]"
    >
      <option value="">Platform console</option>
      <optgroup label="Organizations">
        {orgs.map((o) => (
          <option key={o.id} value={o.id} disabled={o.status !== "active"}>
            {o.name} ({o.code}){o.status !== "active" ? " — inactive" : ""}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
