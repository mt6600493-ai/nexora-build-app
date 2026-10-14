import { useMemo, useRef } from "react";

export function CodeEditor({ value, onChange, readOnly }: { value: string; onChange: (v: string) => void; readOnly?: boolean }) {
  const gutter = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => value.split("\n").length, [value]);
  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background font-mono text-[13px] leading-6">
      <div ref={gutter} className="select-none overflow-hidden border-r border-border px-3 py-3 text-right text-muted-foreground/60">
        {Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      <textarea
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        onScroll={(e) => { if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop; }}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            const t = e.currentTarget;
            const s = t.selectionStart, en = t.selectionEnd;
            const next = value.slice(0, s) + "  " + value.slice(en);
            onChange(next);
            requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 2; });
          }
        }}
        className="h-full flex-1 resize-none whitespace-pre bg-transparent p-3 text-foreground outline-none"
        style={{ tabSize: 2 }}
      />
    </div>
  );
}
