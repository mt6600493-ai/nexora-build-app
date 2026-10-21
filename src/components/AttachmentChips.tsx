import { FileText, X } from "lucide-react";
import type { Attachment } from "@/lib/attachments";

export function AttachmentChips({ items, onRemove }: { items: Attachment[]; onRemove: (i: number) => void }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2 px-1 pb-2">
      {items.map((a, i) => (
        <div key={`${a.path}-${i}`} className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2 py-1 text-xs">
          {a.kind === "image"
            ? <img src={a.content} alt={a.name} className="h-6 w-6 rounded object-cover" />
            : <FileText className="h-4 w-4 text-muted-foreground" />}
          <span className="max-w-[9rem] truncate">{a.name}</span>
          <button type="button" onClick={() => onRemove(i)} aria-label={`Remove ${a.name}`} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
        </div>
      ))}
    </div>
  );
}
