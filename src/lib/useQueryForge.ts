"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Database, QueryResult, SqlError } from "@/engine";
import type { PageSnapshot, TableSchema } from "@/engine";
import { seedScript } from "./sample";

const WAL_KEY = "queryforge.wal.v3";
const ORDER = 4; // small node order → visible splits in the demo

export interface ForgeError {
  message: string;
  position?: number;
}

export interface ForgeApi {
  ready: boolean;
  result: QueryResult | null;
  error: ForgeError | null;
  crashed: boolean;
  tables: TableSchema[];
  pages: PageSnapshot[];
  walCount: number;
  run: (sql: string, opts?: { forceSeqScan?: boolean }) => void;
  crash: () => void;
  recover: () => void;
  reset: () => void;
}

export function useQueryForge(starter: string): ForgeApi {
  const dbRef = useRef<Database | null>(null);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<ForgeError | null>(null);
  const [crashed, setCrashed] = useState(false);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const persist = useCallback(() => {
    if (dbRef.current && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(WAL_KEY, dbRef.current.serialize());
      } catch {
        /* storage full / disabled — durability demo simply won't survive reload */
      }
    }
  }, []);

  // Boot: restore from the WAL if one survived a previous session, else seed.
  useEffect(() => {
    let db: Database;
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(WAL_KEY) : null;
    if (saved) {
      try {
        db = Database.fromWal(saved, { order: ORDER });
      } catch {
        db = freshSeed();
      }
    } else {
      db = freshSeed();
    }
    dbRef.current = db;
    persist();
    setReady(true);
    try {
      setResult(db.execute(starter));
    } catch {
      /* starter may not match a reset schema; leave the canvas empty */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback(
    (sql: string, opts?: { forceSeqScan?: boolean }) => {
      const db = dbRef.current;
      if (!db) return;
      const trimmed = sql.trim().replace(/;+\s*$/, "");
      if (!trimmed) return;
      try {
        const res = db.execute(trimmed, opts);
        setResult(res);
        setError(null);
        setCrashed(false);
        persist();
        rerender();
      } catch (e) {
        if (e instanceof SqlError) setError({ message: e.message, position: e.position });
        else setError({ message: (e as Error).message });
      }
    },
    [persist],
  );

  const crash = useCallback(() => {
    const db = dbRef.current;
    if (!db) return;
    db.crash(); // derived pages vanish; the WAL in localStorage survives
    setResult(null);
    setError(null);
    setCrashed(true);
    rerender();
  }, []);

  const recover = useCallback(() => {
    const db = dbRef.current;
    if (!db) return;
    const res = db.recover();
    setResult(res);
    setCrashed(false);
    rerender();
  }, []);

  const reset = useCallback(() => {
    if (typeof window !== "undefined") window.localStorage.removeItem(WAL_KEY);
    const db = freshSeed();
    dbRef.current = db;
    persist();
    setError(null);
    setCrashed(false);
    setResult(db.execute(starter));
    rerender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persist, starter]);

  const db = dbRef.current;
  return {
    ready,
    result,
    error,
    crashed,
    tables: db?.tables() ?? [],
    pages: crashed ? [] : result?.pages ?? db?.pageSnapshot() ?? [],
    walCount: db?.walRecords().length ?? 0,
    run,
    crash,
    recover,
    reset,
  };
}

function freshSeed(): Database {
  const db = new Database({ order: ORDER });
  for (const stmt of seedScript()) db.execute(stmt);
  return db;
}
