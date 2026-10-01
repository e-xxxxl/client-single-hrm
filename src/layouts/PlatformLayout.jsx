import AppShell from "../components/layouts/AppShell.jsx";

const PLATFORM_NAV = [
  { to: "/platform", label: "Overview", exact: true },
  { to: "/platform/organizations", label: "Organizations" },
  { to: "/platform/audit", label: "Activity log" },
  { to: "/platform/settings", label: "Platform settings" },
];

/**
 * Platform console for the Platform Admin — organizations and platform
 * settings only. It has no access to any organization's HR data.
 */
export default function PlatformLayout() {
  return (
    <AppShell
      nav={PLATFORM_NAV}
      sectionLabel="Platform administration"
      contextLabel="Platform"
      brandName="HRM Platform"
      showNotifications={false}
    />
  );
}
