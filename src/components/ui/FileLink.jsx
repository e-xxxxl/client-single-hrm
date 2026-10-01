import { useState } from "react";
import clsx from "clsx";
import { openFile } from "../../services/hrm.js";
import { toast } from "../../store/toast.js";

/**
 * Link to a stored file. Uploaded files are served only to an authenticated,
 * authorized caller, so a plain <a href> can't open them — this fetches with
 * the session token and opens the result.
 */
export default function FileLink({ href, children = "Open", className }) {
  const [busy, setBusy] = useState(false);
  if (!href) return null;

  async function open(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await openFile(href);
    } catch (err) {
      toast.error(err.message || "Could not open the file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={open} disabled={busy} className={clsx("link disabled:opacity-60", className)}>
      {busy ? "Opening…" : children}
    </button>
  );
}
