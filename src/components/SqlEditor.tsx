"use client";

import { useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { githubDark } from "@uiw/codemirror-theme-github";
import { keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";

export function SqlEditor({
  value,
  onChange,
  onRun,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
}) {
  // Keep the latest onRun without re-creating the editor extensions on each keystroke.
  const runRef = useRef(onRun);
  runRef.current = onRun;

  const extensions = useMemo(
    () => [
      sql(),
      Prec.highest(
        keymap.of([
          {
            key: "Mod-Enter",
            preventDefault: true,
            run: () => {
              runRef.current();
              return true;
            },
          },
        ]),
      ),
    ],
    [],
  );

  return (
    <div className="h-full min-h-[120px] overflow-auto">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme={githubDark}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          autocompletion: false,
          highlightActiveLineGutter: true,
          bracketMatching: true,
        }}
        aria-label="SQL editor"
      />
    </div>
  );
}
