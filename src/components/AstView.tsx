"use client";

import type { Statement, Token } from "@/engine";

const TOKEN_COLOR: Record<string, string> = {
  keyword: "text-active",
  identifier: "text-slatey-200",
  number: "text-dirty",
  string: "text-run",
  operator: "text-index",
  punct: "text-slatey-500",
  eof: "text-slatey-600",
};

export function AstView({ tokens, ast }: { tokens: Token[]; ast: Statement | null }) {
  return (
    <div className="flex flex-col gap-4 p-3">
      <section>
        <h3 className="panel-title mb-2">Tokens</h3>
        <div className="flex flex-wrap gap-1.5">
          {tokens
            .filter((t) => t.type !== "eof")
            .map((t, i) => (
              <span
                key={i}
                className={`rounded border border-ink-400 bg-ink-800 px-1.5 py-0.5 font-mono text-2xs ${TOKEN_COLOR[t.type] ?? "text-slatey-300"}`}
                title={t.type}
              >
                {t.value}
              </span>
            ))}
          {tokens.length <= 1 && <span className="text-2xs text-slatey-500">—</span>}
        </div>
      </section>

      <section>
        <h3 className="panel-title mb-2">Abstract syntax tree</h3>
        {ast ? (
          <div className="font-mono text-xs">
            <AstNode label={null} value={ast} depth={0} />
          </div>
        ) : (
          <span className="text-2xs text-slatey-500">—</span>
        )}
      </section>
    </div>
  );
}

function AstNode({ label, value, depth }: { label: string | null; value: unknown; depth: number }) {
  const indent = { paddingLeft: depth ? 14 : 0 };

  if (value === null || value === undefined) {
    return <Leaf label={label} text="null" tone="text-slatey-500" indent={indent} />;
  }
  if (typeof value === "string") {
    return <Leaf label={label} text={`"${value}"`} tone="text-run" indent={indent} />;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return <Leaf label={label} text={String(value)} tone="text-dirty" indent={indent} />;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <Leaf label={label} text="[]" tone="text-slatey-500" indent={indent} />;
    return (
      <div style={indent} className="border-l border-ink-400/60">
        {label && <KeyLabel name={label} />}
        {value.map((v, i) => (
          <AstNode key={i} label={`${i}`} value={v} depth={depth + 1} />
        ))}
      </div>
    );
  }
  // object
  const obj = value as Record<string, unknown>;
  const type = typeof obj.type === "string" ? (obj.type as string) : null;
  const entries = Object.entries(obj).filter(([k]) => k !== "type");
  return (
    <div style={indent} className="border-l border-ink-400/60">
      <div className="flex items-center gap-1.5 py-0.5">
        {label !== null && <span className="text-slatey-500">{label}:</span>}
        {type && (
          <span className="rounded bg-active/15 px-1.5 py-px text-active">{type}</span>
        )}
      </div>
      {entries.map(([k, v]) => (
        <AstNode key={k} label={k} value={v} depth={depth + 1} />
      ))}
    </div>
  );
}

function KeyLabel({ name }: { name: string }) {
  return <div className="py-0.5 text-slatey-500">{name}:</div>;
}

function Leaf({
  label,
  text,
  tone,
  indent,
}: {
  label: string | null;
  text: string;
  tone: string;
  indent: React.CSSProperties;
}) {
  return (
    <div style={indent} className="flex items-center gap-1.5 py-0.5">
      {label !== null && <span className="text-slatey-500">{label}:</span>}
      <span className={tone}>{text}</span>
    </div>
  );
}
