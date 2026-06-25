"use client";

import type { QueryResult, Value } from "@/engine";

function fmt(v: Value): string {
  if (v === null) return "NULL";
  return String(v);
}

export function ResultsTable({
  result,
  revealed,
}: {
  result: QueryResult | null;
  revealed: number | null;
}) {
  if (!result) {
    return <div className="p-4 text-xs text-slatey-500">No results yet. Run a query.</div>;
  }

  if (result.kind !== "select") {
    return (
      <div className="p-4">
        <div className="rounded-md border border-run-dim bg-run/10 p-3 text-xs text-run">
          {result.message}
        </div>
      </div>
    );
  }

  const rows = revealed === null ? result.rows : result.rows.slice(0, revealed);

  return (
    <div className="flex h-full flex-col">
      <div className="overflow-auto">
        <table className="w-full border-collapse text-left font-mono text-xs">
          <thead className="sticky top-0 bg-ink-700">
            <tr>
              {result.columns.map((c) => (
                <th
                  key={c}
                  className="border-b border-ink-400 px-3 py-1.5 text-2xs font-semibold uppercase tracking-wide text-slatey-400"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="animate-fade-up border-b border-ink-500/60 last:border-0 hover:bg-ink-600/40">
                {result.columns.map((c) => (
                  <td key={c} className={`px-3 py-1.5 ${r[c] === null ? "text-slatey-600 italic" : "text-slatey-200"}`}>
                    {fmt(r[c])}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={result.columns.length || 1} className="px-3 py-6 text-center text-slatey-500">
                  0 rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-auto border-t border-ink-400 px-3 py-1.5 text-2xs text-slatey-400">
        {result.message}
      </div>
    </div>
  );
}
