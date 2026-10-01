import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { dateShort } from "../../utils/format.js";

export default function PlatformOverview() {
  const { data, loading, error, refetch } = useApiQuery("/platform/overview");

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-ink-400">
        <Spinner size={24} />
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        title="Could not load the overview"
        description={error.message}
        action={
          <button className="btn-secondary" onClick={refetch}>
            Retry
          </button>
        }
      />
    );
  }

  return (
    <>
      <PageHeader title="Platform overview" description="Every organization using the HRM, at a glance." />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Organizations" value={data.organizations.total} to="/platform/organizations" />
        <Stat label="Active" value={data.organizations.active} />
        <Stat label="Inactive" value={data.organizations.inactive} />
        <Stat label="User accounts" value={data.users} />
        <Stat label="Active employees" value={data.activeEmployees} />
      </div>

      <section className="card mt-6">
        <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink-900">Recently added organizations</h2>
          <Link to="/platform/organizations" className="link text-xs">
            View all
          </Link>
        </div>
        {data.recentOrganizations.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-400">No organizations yet.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {data.recentOrganizations.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <Link to={`/platform/organizations/${o.id}`} className="min-w-0">
                  <span className="block truncate font-medium text-ink-900 hover:underline">{o.name}</span>
                  <span className="block truncate text-xs text-ink-500">
                    {o.code}
                    {o.industry ? ` · ${o.industry}` : ""} · added {dateShort(o.createdAt)}
                  </span>
                </Link>
                <Badge status={o.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ label, value, to }) {
  const body = (
    <>
      <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink-900">{Number(value || 0).toLocaleString("en-NG")}</p>
    </>
  );
  return to ? (
    <Link to={to} className="bg-white px-4 py-3 hover:bg-ink-50">
      {body}
    </Link>
  ) : (
    <div className="bg-white px-4 py-3">{body}</div>
  );
}
