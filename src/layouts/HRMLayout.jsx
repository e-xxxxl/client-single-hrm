import { useAuth } from "../store/auth.js";
import { HRM_NAV, visibleNav } from "../config/hrmNav.js";
import AppShell from "../components/layouts/AppShell.jsx";
import { apiAssetUrl } from "../services/api.js";
import { defaultLogoFor } from "../utils/orgLogo.js";

export default function HRMLayout() {
  const can = useAuth((s) => s.can);
  const session = useAuth((s) => s.session);
  const organization = useAuth((s) => s.organization);
  return (
    <AppShell
      nav={visibleNav(HRM_NAV, can)}
      sectionLabel="Human Resources"
      contextLabel="Organization"
      brandName={organization?.name || session?.organizationName}
      brandLogoUrl={
        apiAssetUrl(organization?.logoUrl || session?.organizationLogoUrl) ||
        defaultLogoFor(organization?.code || session?.organizationCode)
      }
    />
  );
}
