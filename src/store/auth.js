import { create } from "zustand";
import { api, setAccessToken, onAuthExpired, refreshAccessToken } from "../services/api.js";

/**
 * Global auth/session state.
 *
 * `session` mirrors the server-side authorization context (role, scope,
 * organization, permissions) and drives what the UI shows. It is display
 * state only — every API call is authorized again on the server, which takes
 * the organization from the signed-in account, never from anything the
 * client sends. `organization` is the signed-in user's organization profile
 * (name, logo, brand colour) for branding the shell.
 *
 * `bootstrap` runs once on app start: it tries a silent refresh (cookie) and,
 * on success, loads the fresh profile.
 */
export const useAuth = create((set, get) => ({
  status: "loading", // loading | anonymous | pending-2fa | authenticated
  user: null,
  session: null, // { role, scope, organizationId, organizationName, permissions[], … }
  organization: null,
  pendingLogin: null, // { email, password } while a 2FA code is being requested
  signedOutReason: null, // shown on the login screen after a forced sign-out

  async bootstrap() {
    // A page reload always starts here, relying on the httpOnly refresh
    // cookie. A genuine 401/403 means the cookie is missing/expired — that's a
    // real logout. Anything else (a network blip, a cold-starting API) gets a
    // couple of quick retries first (inside refreshAccessToken).
    //
    // This goes through the same single-flight refreshAccessToken() the 401
    // interceptor uses — the refresh token rotates on every use, so an
    // independent call could race a concurrent refresh (e.g. React StrictMode
    // double-invoking this effect) and present an already-rotated cookie.
    try {
      await refreshAccessToken();
      await get().refreshProfile();
      set({ status: "authenticated" });
    } catch (err) {
      set({ status: "anonymous", user: null, session: null, organization: null });
      const status = err?.response?.status;
      if (status !== 401 && status !== 403) {
        // eslint-disable-next-line no-console
        console.warn("Session restore failed after retries:", err);
      }
    }
  },

  /**
   * Sign in with email + password (+ 2FA code when the account has one).
   * Throws an error with `code` TOTP_REQUIRED / TOTP_INVALID and moves to the
   * `pending-2fa` step when a code is needed.
   */
  async login(email, password, totp) {
    try {
      const { data } = await api.post("/auth/login", { email, password, totp: totp || undefined });
      setAccessToken(data.data.accessToken);
      set({ user: data.data.user, session: data.data.session, pendingLogin: null, signedOutReason: null });
      await get().refreshProfile();
      set({ status: "authenticated" });
    } catch (err) {
      if (err.code === "TOTP_REQUIRED" || err.code === "TOTP_INVALID") {
        set({ status: "pending-2fa", pendingLogin: { email, password } });
        const e = new Error(err.code === "TOTP_INVALID" ? "That two-factor code is not valid." : "Enter your two-factor code.");
        e.code = err.code;
        throw e;
      }
      throw err;
    }
  },

  /** Second step when 2FA is enrolled — resubmits the held credentials with the code. */
  async submitTotp(totp) {
    const pending = get().pendingLogin;
    if (!pending) throw new Error("No sign-in in progress");
    return get().login(pending.email, pending.password, totp);
  },

  cancelLogin() {
    set({ status: "anonymous", pendingLogin: null });
  },

  async logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore network errors on logout */
    }
    setAccessToken(null);
    set({ status: "anonymous", user: null, session: null, organization: null, pendingLogin: null });
  },

  /** Refresh the cached profile (after editing own details, branding change, etc). */
  async refreshProfile() {
    const me = await api.get("/auth/me");
    set({ user: me.data.data.user, session: me.data.data.session, organization: me.data.data.organization });
  },

  can(permission) {
    const perms = get().session?.permissions || [];
    return perms.includes(permission);
  },

  canAny(...permissions) {
    return permissions.some((p) => get().can(p));
  },

  isPlatformAdmin() {
    return get().session?.scope === "platform";
  },
}));

// Wire the api layer's forced-logout signal into the store.
onAuthExpired((reason) => {
  useAuth.setState({
    status: "anonymous",
    user: null,
    session: null,
    organization: null,
    signedOutReason: reason || null,
  });
});
