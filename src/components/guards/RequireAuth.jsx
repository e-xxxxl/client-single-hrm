import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../store/auth.js";
import Spinner from "../ui/Spinner.jsx";

/**
 * Gate a subtree behind an authenticated session. `scope` ("organization" or
 * "platform") additionally keeps each kind of account in its own workspace.
 * An account still on a temporary password is sent to change it first (the
 * API refuses everything else until then anyway).
 */
export default function RequireAuth({ children, scope }) {
  const status = useAuth((s) => s.status);
  const session = useAuth((s) => s.session);
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-400">
        <Spinner size={24} />
      </div>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (session?.mustChangePassword && location.pathname !== "/account/password") {
    return <Navigate to="/account/password" replace />;
  }

  if (scope && session?.scope !== scope) {
    return <Navigate to="/" replace />;
  }

  return children;
}
