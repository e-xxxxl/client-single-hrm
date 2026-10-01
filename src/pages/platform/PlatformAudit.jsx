import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { dateTime } from "../../utils/format.js";

/** Actions taken by platform administrators (organization lifecycle, admins, settings). */
export default function PlatformAudit() {
  const [page, setPage] = useState(1);
  const list = useApiQuery("/platform/audit", { params: { page, limit: 25 } });

  return (
    <>
      <PageHeader title="Activity log" description="Everything platform administrators have done." />
      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        empty={{ title: "No activity yet", description: "Platform actions will appear here." }}
        columns={[
          { key: "createdAt", header: "When", render: (r) => dateTime(r.createdAt) },
          { key: "summary", header: "Action", primary: true, nowrap: false },
          { key: "actorName", header: "By", secondary: true },
          { key: "action", header: "Type", hideOnMobile: true, render: (r) => <span className="font-mono text-xs">{r.action}</span> },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />
    </>
  );
}
