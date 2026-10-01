import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth.js";
import { normaliseError } from "../services/api.js";
import AuthLayout from "../layouts/AuthLayout.jsx";
import TextField from "../components/ui/TextField.jsx";
import PasswordField from "../components/ui/PasswordField.jsx";
import Button from "../components/ui/Button.jsx";
import Alert from "../components/ui/Alert.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { status, login, submitTotp, cancelLogin, signedOutReason } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [totp, setTotp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const needsCode = status === "pending-2fa";

  async function submitCredentials(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(form.email.trim(), form.password);
      navigate("/", { replace: true });
    } catch (err) {
      // TOTP_REQUIRED just moves to the code step — not an error to show.
      if (err.code !== "TOTP_REQUIRED") setError(err.code ? err.message : normaliseError(err).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await submitTotp(totp.trim());
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.code ? err.message : normaliseError(err).message);
    } finally {
      setBusy(false);
    }
  }

  if (needsCode) {
    return (
      <AuthLayout>
        <form onSubmit={submitCode} className="card p-6">
          <h1 className="text-lg font-semibold text-ink-900">Two-factor authentication</h1>
          <p className="mt-1 text-sm text-ink-500">
            Enter the 6-digit code from your authenticator app, or a recovery code.
          </p>
          {error && (
            <Alert tone="error" className="mt-4">
              {error}
            </Alert>
          )}
          <div className="mt-5">
            <TextField
              label="Authentication code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
            />
          </div>
          <Button type="submit" loading={busy} className="mt-6 !w-full">
            Verify
          </Button>
          <button
            type="button"
            onClick={() => {
              setTotp("");
              setError(null);
              cancelLogin();
            }}
            className="mt-5 text-xs font-medium text-ink-500 hover:text-ink-700"
          >
            Cancel
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form onSubmit={submitCredentials} className="card p-6">
        <h1 className="text-lg font-semibold text-ink-900">Sign in</h1>
        <p className="mt-1 text-sm text-ink-500">Use your work email address.</p>

        {!error && signedOutReason && (
          <Alert tone="warning" className="mt-4">
            {signedOutReason}
          </Alert>
        )}
        {error && (
          <Alert tone="error" className="mt-4">
            {error}
          </Alert>
        )}

        <div className="mt-5 space-y-4">
          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <PasswordField
            label="Password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </div>

        <Button type="submit" loading={busy} className="mt-6 !w-full">
          Continue
        </Button>
      </form>
    </AuthLayout>
  );
}
