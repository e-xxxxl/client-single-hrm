import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./store/auth.js";
import { applyBrandTheme } from "./utils/brandTheme.js";
import Toaster from "./components/ui/Toaster.jsx";
import Spinner from "./components/ui/Spinner.jsx";
import RequireAuth from "./components/guards/RequireAuth.jsx";
import RequirePermission from "./components/guards/RequirePermission.jsx";

import Login from "./pages/Login.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import Security from "./pages/Security.jsx";
import HRMLayout from "./layouts/HRMLayout.jsx";
import PlatformLayout from "./layouts/PlatformLayout.jsx";

import HrOverview from "./pages/hrm/HrOverview.jsx";
import AuditLog from "./pages/shared/AuditLog.jsx";
import EmployeeList from "./pages/hrm/EmployeeList.jsx";
import EmployeeProfile from "./pages/hrm/EmployeeProfile.jsx";
import DepartmentList from "./pages/hrm/DepartmentList.jsx";
import BranchList from "./pages/hrm/BranchList.jsx";
import Attendance from "./pages/hrm/Attendance.jsx";
import Leave from "./pages/hrm/Leave.jsx";
import Payroll from "./pages/hrm/Payroll.jsx";
import Performance, { PerformanceReviewPage } from "./pages/hrm/Performance.jsx";
import Targets from "./pages/hrm/Targets.jsx";
import Recruitment, { JobPipelinePage } from "./pages/hrm/Recruitment.jsx";
import Documents from "./pages/hrm/Documents.jsx";
import Disciplinary from "./pages/hrm/Disciplinary.jsx";
import HrReports from "./pages/hrm/HrReports.jsx";
import HrSettings from "./pages/hrm/HrSettings.jsx";
import Notifications from "./pages/hrm/Notifications.jsx";
import UsersRoles from "./pages/hrm/UsersRoles.jsx";

import PlatformOverview from "./pages/platform/PlatformOverview.jsx";
import OrganizationList from "./pages/platform/OrganizationList.jsx";
import OrganizationDetail from "./pages/platform/OrganizationDetail.jsx";
import PlatformSettings from "./pages/platform/PlatformSettings.jsx";
import PlatformAudit from "./pages/platform/PlatformAudit.jsx";

export default function App() {
  const { status, bootstrap } = useAuth();
  const brandColor = useAuth((s) => s.organization?.brandColor || s.session?.organizationBrandColor);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    applyBrandTheme(brandColor);
  }, [brandColor]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-400">
        <Spinner size={24} />
      </div>
    );
  }

  const guard = (perm, element, mode) => (
    <RequirePermission perm={perm} mode={mode}>
      {element}
    </RequirePermission>
  );

  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/account/password"
          element={
            <RequireAuth>
              <ChangePassword />
            </RequireAuth>
          }
        />
        <Route
          path="/account/security"
          element={
            <RequireAuth>
              <Security />
            </RequireAuth>
          }
        />

        {/* ---- Organization HR workspace ---- */}
        <Route
          path="/hrm"
          element={
            <RequireAuth scope="organization">
              <HRMLayout />
            </RequireAuth>
          }
        >
          <Route index element={<HrIndex />} />
          <Route path="employees" element={guard("employee:read", <EmployeeList />)} />
          <Route path="employees/:id" element={guard("employee:read", <EmployeeProfile />)} />
          <Route path="departments" element={guard("department:read", <DepartmentList />)} />
          <Route path="branches" element={guard("branch:read", <BranchList />)} />
          <Route path="attendance" element={guard("attendance:read", <Attendance />)} />
          <Route path="leave" element={guard("leave:read", <Leave />)} />
          <Route path="payroll" element={guard(["payroll:read", "payroll:read_own"], <Payroll />, "any")} />
          <Route path="performance" element={guard("performance:read", <Performance />)} />
          <Route path="performance/:id" element={guard("performance:read", <PerformanceReviewPage />)} />
          <Route path="targets" element={guard("target:read", <Targets />)} />
          <Route path="recruitment" element={guard("recruitment:read", <Recruitment />)} />
          <Route path="recruitment/jobs/:id" element={guard("recruitment:read", <JobPipelinePage />)} />
          <Route path="documents" element={guard("document:read", <Documents />)} />
          <Route path="disciplinary" element={guard("disciplinary:read", <Disciplinary />)} />
          <Route path="notifications" element={guard("notification:read", <Notifications />)} />
          <Route path="reports" element={guard("report:hr", <HrReports />)} />
          <Route path="users" element={guard("user:read", <UsersRoles />)} />
          <Route path="settings" element={guard(["settings:read", "org:write"], <HrSettings />, "any")} />
          <Route path="audit" element={guard("audit:read", <AuditLog />)} />
        </Route>

        {/* ---- Platform console (Platform Admin only) ---- */}
        <Route
          path="/platform"
          element={
            <RequireAuth scope="platform">
              <PlatformLayout />
            </RequireAuth>
          }
        >
          <Route index element={guard("platform:read", <PlatformOverview />)} />
          <Route path="organizations" element={guard("platform:read", <OrganizationList />)} />
          <Route path="organizations/:id" element={guard("platform:read", <OrganizationDetail />)} />
          <Route path="settings" element={guard("platform:read", <PlatformSettings />)} />
          <Route path="audit" element={guard("platform:read", <PlatformAudit />)} />
        </Route>

        <Route path="/" element={<LandingRedirect />} />
        <Route path="*" element={<LandingRedirect />} />
      </Routes>
    </>
  );
}

/** Send the user to the workspace their account belongs to. */
function LandingRedirect() {
  const status = useAuth((s) => s.status);
  const session = useAuth((s) => s.session);
  if (status !== "authenticated") return <Navigate to="/login" replace />;
  if (session?.mustChangePassword) return <Navigate to="/account/password" replace />;
  if (session?.scope === "platform") return <Navigate to="/platform" replace />;
  // Rank-and-file employees land on their own attendance (clock in/out)
  // rather than the management overview, which they can't act on anyway.
  if (session?.role === "Employee") return <Navigate to="/hrm/attendance" replace />;
  return <Navigate to="/hrm" replace />;
}

/**
 * The `/hrm` index route itself needs the same check: HrOverview's data comes
 * from an endpoint gated to employee:read/report:hr, which self-service roles
 * don't hold — they'd otherwise hit a permanent error instead of their own
 * attendance page.
 */
function HrIndex() {
  const canOverview = useAuth((s) => s.canAny("employee:read", "report:hr"));
  const canAttendance = useAuth((s) => s.can("attendance:read"));
  if (!canOverview && canAttendance) return <Navigate to="/hrm/attendance" replace />;
  return <HrOverview />;
}
