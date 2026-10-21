import { useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, ImagePlus, FilePlus2, AppWindow, Globe, Gamepad2, FileArchive } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

/** The "+" button next to the chat box: attach images/files, or start a new app, website or game. */
export function PlusMenu({ onFiles, disabled, showNew = true }: { onFiles: (files: File[]) => void; disabled?: boolean; showNew?: boolean }) {
  const imgRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (list.length) onFiles(list);
  };
  return (
    <>
      <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" onChange={pick} />
      <input ref={fileRef} type="file" multiple className="hidden" onChange={pick}
        accept=".html,.htm,.css,.js,.jsx,.ts,.tsx,.json,.md,.txt,.csv,.svg,.xml,.yml,.yaml,image/*" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-full" disabled={disabled} aria-label="Add image, file or new project">
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onSelect={() => imgRef.current?.click()}><ImagePlus className="h-4 w-4" /> Upload image</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileRef.current?.click()}><FilePlus2 className="h-4 w-4" /> Upload file</DropdownMenuItem>
          {showNew && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Start something new</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => navigate({ to: "/new", search: { tab: "ai", kind: "app" } })}><AppWindow className="h-4 w-4" /> New app</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: "/new", search: { tab: "ai", kind: "website" } })}><Globe className="h-4 w-4" /> New website</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: "/new", search: { tab: "games" } })}><Gamepad2 className="h-4 w-4" /> New game</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: "/new", search: { tab: "import" } })}><FileArchive className="h-4 w-4" /> Import project / ZIP</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
