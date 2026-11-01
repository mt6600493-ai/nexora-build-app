import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({ meta: [{ title: "Help & Support — Nexora AI" }, { name: "description", content: "Guides and answers for building with Nexora AI." }, { property: "og:title", content: "Help — Nexora AI" }, { property: "og:description", content: "Guides and answers." }] }),
  component: Help,
});

const FAQ = [
  ["How do I build an app?", "Click New Project, describe your idea in plain language and press Generate. Nexora AI writes the files and shows a live preview. Keep chatting to add features or change the design."],
  ["Can I edit the code myself?", "Yes. Switch to Code in the workspace, pick a file from the explorer and edit. Changes save automatically and the preview refreshes."],
  ["How does responsive preview work?", "Use the desktop, tablet and mobile buttons above the preview to check every screen size."],
  ["How do I import from other builders, Vercel or Netlify?", "These projects live in a GitHub repository. Paste the public repo link in Import Project, or download your code as a ZIP and upload it."],
  ["Why can't some imported projects preview?", "Projects using frameworks like React with a build step (Vite, Next.js) need compiling, which the instant preview doesn't do. You can still edit and export them, or ask the AI to convert them."],
  ["How do I deploy?", "Click Deploy → Download ZIP, then drop the folder into Netlify Drop or Vercel to go live."],
  ["Are there credits?", "No. There is no credit balance. Fair-use limits only prevent abuse."],
];

function Help() {
  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Help & Support</h1>
      <p className="mt-1 text-sm text-muted-foreground">Find answers, tutorials and guides.</p>
      <Accordion type="single" collapsible className="mt-6 max-w-3xl rounded-2xl border border-border bg-card px-5">
        {FAQ.map(([q = "", a = ""]) => (
          <AccordionItem key={q} value={q}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{a}</AccordionContent></AccordionItem>
        ))}
      </Accordion>
    </AppShell>
  );
}
