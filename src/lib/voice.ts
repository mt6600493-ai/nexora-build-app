import { useCallback, useEffect, useRef, useState } from "react";

type SR = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export const VOICE_LANGS = [
  { code: "auto", label: "Auto (device language)" },
  { code: "en-US", label: "English" },
  { code: "ur-PK", label: "اردو Urdu" },
  { code: "hi-IN", label: "हिन्दी Hindi" },
  { code: "ar-SA", label: "العربية Arabic" },
] as const;

function getCtor(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Continuous speech-to-text. Text keeps flowing until stop() is called. */
export function useVoiceInput(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [lang, setLangState] = useState<string>("auto");
  const recRef = useRef<SR | null>(null);
  const wantOn = useRef(false);
  const cb = useRef(onText);
  cb.current = onText;

  useEffect(() => {
    setSupported(!!getCtor());
    const saved = localStorage.getItem("nexora:voice-lang");
    if (saved) setLangState(saved);
  }, []);

  const setLang = useCallback((l: string) => {
    setLangState(l);
    localStorage.setItem("nexora:voice-lang", l);
  }, []);

  const stop = useCallback(() => {
    wantOn.current = false;
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return false;
    const rec = new Ctor();
    rec.lang = lang === "auto" ? navigator.language || "en-US" : lang;
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i]!.isFinal) t += e.results[i]![0].transcript;
      if (t.trim()) cb.current(t.trim());
    };
    rec.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { wantOn.current = false; setListening(false); } };
    // No auto-restart: restarting makes Chrome/Android play the mic chime repeatedly.
    rec.onend = () => { wantOn.current = false; setListening(false); };
    recRef.current = rec;
    wantOn.current = true;
    try { rec.start(); setListening(true); return true; } catch { setListening(false); return false; }
  }, [lang]);

  useEffect(() => () => { wantOn.current = false; recRef.current?.abort(); }, []);

  return { supported, listening, start, stop, lang, setLang };
}
