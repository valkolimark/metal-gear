import Link from "next/link"
import type { TopUserRow } from "@/app/(admin)/admin/ai-costs/queries"

export function TopUsersTable({ rows }: { rows: TopUserRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        No user-attributable events yet.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-3 text-sm font-medium">
        Top users — last 30 days
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">User</th>
            <th className="px-4 py-2 font-medium tabular-nums">Calls</th>
            <th className="px-4 py-2 font-medium tabular-nums">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId ?? "anon"} className="border-t">
              <td className="px-4 py-2">
                {r.userId ? (
                  <Link
                    href={`/admin/users/${r.userId}`}
                    className="font-medium hover:underline"
                  >
                    {r.displayName ?? "(no name)"}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">(anonymous)</span>
                )}
              </td>
              <td className="px-4 py-2 tabular-nums">
                {r.callCount30d.toLocaleString()}
              </td>
              <td className="px-4 py-2 tabular-nums">
                {formatCents(r.totalCents30d)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatCents(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1) return `$${dollars.toFixed(4)}`
  return `${cents.toFixed(4)}¢`
}
