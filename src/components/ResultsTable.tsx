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
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="font-mono text-[#33ff00] text-xs font-bold uppercase tracking-widest mb-2">
          [ 0 RESULTS LOADED ]
        </div>
        <div className="font-mono text-xs text-[#8dcf7a]">
          samdb@workspace:~$ <span className="text-[#33ff00]">run a query to inspect tuples</span>
        </div>
        <div className="mt-4 text-xs text-[#8dcf7a] font-mono border border-[#1f521f] bg-[#0a0a0a] px-3.5 py-1.5">
          Hint: SELECT * FROM users LIMIT 10
        </div>
      </div>
    );
  }

  if (result.kind !== "select") {
    return (
      <div className="p-4">
        <div className="border border-[#1f521f] bg-[#0a110a] p-3.5 font-mono text-xs text-[#33ff00]">
          <div className="text-[#33ff00] text-xs font-bold uppercase tracking-widest mb-1.5">[OK] STATEMENT APPLIED</div>
          <p className="text-[#c8ffb0] text-sm">{result.message}</p>
        </div>
      </div>
    );
  }

  const rows = revealed === null ? result.rows : result.rows.slice(0, revealed);

  return (
    <div className="flex h-full flex-col font-mono">
      <div className="overflow-auto flex-1">
        <table className="w-full border-collapse text-left font-mono">
          <thead className="sticky top-0 bg-[#0d100d] z-10 border-b border-[#1f521f]">
            <tr>
              <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#4a7a40] w-10">
                #
              </th>
              {result.columns.map((c) => (
                <th
                  key={c}
                  className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-[#33ff00]"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className="animate-fade-up border-b border-[#111411] last:border-0
                           hover:bg-[#0a110a] transition-colors duration-100"
              >
                <td className="px-3 py-2 text-xs text-[#4a7a40] font-mono">{i + 1}</td>
                {result.columns.map((c) => (
                  <td
                    key={c}
                    className={`px-3.5 py-2 text-sm font-mono ${
                      r[c] === null
                        ? "text-[#4a7a40] italic font-normal"
                        : typeof r[c] === "number"
                        ? "text-[#ffb000] font-medium"
                        : "text-[#c8ffb0]"
                    }`}
                  >
                    {fmt(r[c])}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={(result.columns.length || 1) + 1}
                  className="px-4 py-8 text-center text-xs text-[#4a7a40] uppercase tracking-widest font-semibold"
                >
                  [ 0 ROWS RETURNED ]
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-[#1f521f] bg-[#0d100d] px-3.5 py-2 font-mono text-xs text-[#8dcf7a] flex items-center justify-between">
        <span>
          <span className="text-[#33ff00] font-bold">{result.rows.length}</span> row
          {result.rows.length !== 1 ? "s" : ""} via{" "}
          <span
            className={`font-bold ${result.access === "index" ? "text-[#a78bfa]" : "text-[#ffb000]"}`}
          >
            {result.access === "index" ? "index scan" : "sequential scan"}
          </span>
        </span>
        <span className="text-[#33ff00] font-semibold">
          {result.stats.elapsedMs}ms
        </span>
      </div>
    </div>
  );
}
