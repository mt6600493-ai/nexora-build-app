import { Check, Mic, Languages } from "lucide-react";
import { toast } from "sonner";
import { useVoiceInput, VOICE_LANGS } from "@/lib/voice";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** Mic button: tap to start continuous dictation, tap ✓ to finish. */
export function VoiceButton({ onText, onDone, disabled }: { onText: (t: string) => void; onDone?: () => void; disabled?: boolean }) {
  const v = useVoiceInput(onText);
  if (!v.supported) return null;
  return (
    <div className="flex items-center gap-0.5">
      {v.listening ? (
        <button type="button" onClick={() => { v.stop(); onDone?.(); }} aria-label="Finish voice input"
          className="flex h-8 items-center gap-1.5 rounded-full bg-success px-3 text-xs font-medium text-primary-foreground">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" /></span>
          Listening <Check className="h-4 w-4" />
        </button>
      ) : (
        <button type="button" disabled={disabled} aria-label="Speak your prompt"
          onClick={() => { if (!v.start()) toast.error("Microphone isn't available. Allow mic access in your browser."); }}
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">
          <Mic className="h-4 w-4" />
        </button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="Voice language" className="grid h-8 w-6 place-items-center rounded text-muted-foreground hover:text-foreground"><Languages className="h-3.5 w-3.5" /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Speaking language</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={v.lang} onValueChange={(l) => { if (v.listening) v.stop(); v.setLang(l); }}>
            {VOICE_LANGS.map((l) => <DropdownMenuRadioItem key={l.code} value={l.code}>{l.label}</DropdownMenuRadioItem>)}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
