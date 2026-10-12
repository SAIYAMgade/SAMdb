"use client";

import type { Statement, Token } from "@/engine";

const TOKEN_STYLE: Record<string, { border: string; bg: string; text: string }> = {
  keyword:    { border: "#1f521f", bg: "#0a110a", text: "#33ff00" },
  identifier: { border: "#1f521f", bg: "#0a0a0a", text: "#c8ffb0" },
  number:     { border: "#7a5500", bg: "#0a0800", text: "#ffb000" },
  string:     { border: "#1f521f", bg: "#0a0a0a", text: "#8dcf7a" },
  operator:   { border: "#3d2b7a", bg: "#0a0814", text: "#a78bfa" },
  punct:      { border: "#1f521f", bg: "#0a0a0a", text: "#4a7a40" },
  eof:        { border: "#1f521f", bg: "#0a0a0a", text: "#2a4a25" },
};

export function AstView({
  tokens,
  ast,
}: {
  tokens: Token[];
  ast: Statement | null;
}) {
  return (
    <div className="flex flex-col gap-4 p-3.5">
      {/* Token stream */}
      <section>
        <div className="font-mono text-xs uppercase tracking-[0.16em] text-[#33ff00] font-bold mb-2">
          ┌─ TOKEN STREAM ─
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tokens
            .filter((t) => t.type !== "eof")
            .map((t, i) => {
              const style = TOKEN_STYLE[t.type] ?? TOKEN_STYLE.identifier;
              return (
                <span
                  key={i}
                  className="border px-2 py-0.5 font-mono text-xs font-semibold cursor-default"
                  style={{
                    borderColor: style.border,
                    backgroundColor: style.bg,
                    color: style.text,
                  }}
                  title={`${t.type} @ offset ${t.start}`}
                >
                  {t.value}
                </span>
              );
            })}
          {tokens.length <= 1 && (
            <span className="font-mono text-xs text-[#8dcf7a]">
              -- execute a query to inspect tokenized lexemes
            </span>
          )}
        </div>

        {/* Token type legend */}
        <div className="mt-2.5 flex flex-wrap gap-2">
          {Object.entries(TOKEN_STYLE)
            .filter(([k]) => k !== "eof")
            .map(([type, style]) => (
              <span
                key={type}
                className="inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-xs uppercase font-medium"
                style={{
                  borderColor: style.border,
                  backgroundColor: style.bg,
                  color: style.text,
                }}
              >
                {type}
              </span>
            ))}
        </div>
      </section>

      {/* AST */}
      <section>
        <div className="font-mono text-xs uppercase tracking-[0.16em] text-[#33ff00] font-bold mb-2">
          ┌─ ABSTRACT SYNTAX TREE (AST) ─
        </div>
        {ast ? (
          <div className="font-mono text-xs">
            <AstNode label={null} value={ast} depth={0} />
          </div>
        ) : (
          <span className="font-mono text-xs text-[#8dcf7a]">
            -- no AST parsed yet
          </span>
        )}
      </section>
    </div>
  );
}

function AstNode({
  label,
  value,
  depth,
}: {
  label: string | null;
  value: unknown;
  depth: number;
}) {
  const indent = { paddingLeft: depth ? 16 : 0 };

  if (value === null || value === undefined) {
    return (
      <Leaf label={label} text="null" color="#4a7a40" indent={indent} />
    );
  }
  if (typeof value === "string") {
    return (
      <Leaf label={label} text={`"${value}"`} color="#8dcf7a" indent={indent} />
    );
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return (
      <Leaf label={label} text={String(value)} color="#ffb000" indent={indent} />
    );
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Leaf label={label} text="[]" color="#4a7a40" indent={indent} />;
    }
    return (
      <div style={indent} className="border-l border-[#1f521f]">
        {label && (
          <div className="py-0.5 font-mono text-xs font-semibold text-[#8dcf7a] pl-2.5">
            {label}:
          </div>
        )}
        {(value as unknown[]).map((v, i) => (
          <AstNode key={i} label={`${i}`} value={v} depth={depth + 1} />
        ))}
      </div>
    );
  }

  const obj = value as Record<string, unknown>;
  const type = typeof obj.type === "string" ? (obj.type as string) : null;
  const entries = Object.entries(obj).filter(([k]) => k !== "type");

  return (
    <div style={indent} className="border-l border-[#1f521f]">
      <div className="flex items-center gap-2 py-0.5 pl-2.5">
        {label !== null && (
          <span className="font-mono text-xs font-semibold text-[#8dcf7a]">{label}:</span>
        )}
        {type && (
          <span className="border border-[#1f521f] bg-[#0a110a] px-2 py-0.5 font-mono text-xs font-bold text-[#33ff00]">
            {type}
          </span>
        )}
      </div>
      {entries.map(([k, v]) => (
        <AstNode key={k} label={k} value={v} depth={depth + 1} />
      ))}
    </div>
  );
}

function Leaf({
  label,
  text,
  color,
  indent,
}: {
  label: string | null;
  text: string;
  color: string;
  indent: React.CSSProperties;
}) {
  return (
    <div
      style={indent}
      className="flex items-center gap-2 py-0.5 pl-2.5 font-mono text-xs"
    >
      {label !== null && (
        <span className="text-[#8dcf7a] font-medium">{label}:</span>
      )}
      <span style={{ color }} className="font-semibold">{text}</span>
    </div>
  );
}
