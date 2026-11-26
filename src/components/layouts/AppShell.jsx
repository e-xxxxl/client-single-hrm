import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../../store/auth.js";
import { initials } from "../../utils/format.js";
import NotificationBell from "../notifications/NotificationBell.jsx";
import UserMenu from "./UserMenu.jsx";
import OrgSwitcher from "./OrgSwitcher.jsx";

/**
 * Shared application chrome: dark sidebar, sticky header, responsive
 * slide-over navigation. Used by the organization HR workspace and the
 * platform console — the workspace-specific parts (nav items, section label,
 * branding) come in as props.
 */
export default function AppShell({ nav, sectionLabel, brandName, brandLogoUrl, contextLabel, showNotifications = true }) {
  const { session, user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const orgKey = session?.organizationId ?? "platform";

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const sidebar = (onNavigate) => (
    <SidebarContent
      nav={nav}
      sectionLabel={sectionLabel}
      brandName={brandName}
      brandLogoUrl={brandLogoUrl}
      contextLabel={contextLabel}
      onNavigate={onNavigate}
    />
  );

  return (
    <div className="min-h-screen bg-ink-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar lg:flex">{sidebar()}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-sidebar shadow-drawer">
            {sidebar(() => setMobileOpen(false))}
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            className="-ml-1 rounded-md p-2 text-ink-500 hover:bg-ink-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-900">{brandName}</p>
            <p className="truncate text-2xs text-ink-500">
              {session?.actingAs ? "Platform Admin" : session?.role} · {sectionLabel}
            </p>
          </div>

          <OrgSwitcher />
          {showNotifications && !session?.actingAs && <NotificationBell key={orgKey} />}
          <UserMenu name={user?.name} email={user?.email} role={session?.role} avatar={initials(user?.name)} />
        </header>

        {session?.actingAs && <EnteredBanner orgName={brandName} />}

        {/* Keyed by organization: switching organizations remounts the page, so it
            can never keep showing the previous organization's data. */}
        <main key={orgKey} className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Shown while a Platform Admin is working inside an organization. */
function EnteredBanner({ orgName }) {
  const navigate = useNavigate();
  const exitOrganization = useAuth((s) => s.exitOrganization);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:px-6">
      <p>
        You are working inside <strong>{orgName}</strong> as Platform Admin with Org Admin access. Your actions are recorded in its audit log.
      </p>
      <button
        type="button"
        className="font-medium underline hover:no-underline"
        onClick={async () => {
          await exitOrganization();
          navigate("/platform", { replace: true });
        }}
      >
        Back to platform console
      </button>
    </div>
  );
}

function SidebarContent({ nav, sectionLabel, brandName, brandLogoUrl, contextLabel, onNavigate }) {
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(() => setLogoFailed(false), [brandLogoUrl]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-[3.5rem] items-center gap-2 border-b border-sidebar-border px-4 py-2.5">
        {brandLogoUrl && !logoFailed ? (
          // Logos are dark-on-light, so they sit on a white chip to stay readable on the dark sidebar.
          <span className="inline-flex rounded-md bg-white px-2 py-1">
            <img
              src={brandLogoUrl}
              alt={brandName || "Organization logo"}
              className="h-9 max-w-[10.5rem] object-contain"
              onError={() => setLogoFailed(true)}
            />
          </span>
        ) : (
          <span className="truncate text-sm font-semibold text-white">{brandName || "HRM Platform"}</span>
        )}
      </div>

      <div className="border-b border-sidebar-border px-5 py-3">
        <p className="text-2xs uppercase tracking-wide text-ink-500">{contextLabel}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-ink-100">{brandName || "—"}</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        <p className="px-2 pb-1 pt-2 text-2xs font-medium uppercase tracking-wider text-ink-500">{sectionLabel}</p>
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                "block rounded-md px-2.5 py-2 text-sm transition-colors",
                isActive ? "bg-sidebar-active font-medium text-white" : "text-ink-200 hover:bg-sidebar-hover hover:text-white",
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-3">
        <p className="text-2xs text-ink-500">Signed in — {contextLabel?.toLowerCase()} workspace</p>
      </div>
    </div>
  );
}
