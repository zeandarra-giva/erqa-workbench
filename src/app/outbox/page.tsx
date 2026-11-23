"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Send, Trash2, Mail, Info } from "lucide-react";
import { useStore } from "@/lib/store";
import type { EmailDraft } from "@/lib/types";
import { Button, Card, Empty, PageTitle, Pill, cn } from "@/components/ui";

const KIND: Record<EmailDraft["kind"], { label: string; tone: "info" | "warn" | "bad" }> = {
  challenge: { label: "Challenge", tone: "info" },
  escalation: { label: "Escalation", tone: "warn" },
  outcome: { label: "Fail notice", tone: "bad" },
};

export default function OutboxPage() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState<"draft" | "sent">("draft");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const list = useMemo(
    () => state.emails.filter((e) => e.status === tab).sort((a, b) => (b.sentAt ?? b.createdAt).localeCompare(a.sentAt ?? a.createdAt)),
    [state.emails, tab],
  );
  const active = list.find((e) => e.id === activeId) ?? list[0];
  const drafts = state.emails.filter((e) => e.status === "draft");

  const send = (ids: string[]) => {
    dispatch({ type: "sendEmails", ids });
    setFlash(`${ids.length} email${ids.length === 1 ? "" : "s"} sent (simulated). The case${ids.length === 1 ? " has" : "s have"} moved to “Challenged” (or “Escalated”) and the 7-day clock has started.`);
    setSel(new Set());
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageTitle
        title="Outbox"
        sub="Challenge, escalation and fail emails are drafted from templates with the case details and the exact rules cited. Approve them as one batch."
        action={<Button data-tour="outbox-send" variant="primary" icon={Send} disabled={!drafts.length} onClick={() => send(drafts.map((d) => d.id))}>Approve & send all ({drafts.length})</Button>}
      />
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-[13px] text-muted">
        <Info className="size-4 shrink-0" /> Prototype: nothing is actually sent. In production this would send from the ERQA shared mailbox, with the case ID in the subject so replies can be matched to the case automatically.
      </div>
      {flash && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#bfe8cf] bg-ok-soft px-4 py-2.5 text-[13.5px] text-ok">
          <span>{flash}</span>
          <Link href="/board" className="font-medium underline">See them on the Challenge Board →</Link>
        </div>
      )}

      <div data-tour="outbox" className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
        <Card className="flex max-h-[calc(100vh-280px)] flex-col overflow-hidden">
          <div className="flex items-center gap-1 border-b border-line p-2">
            {(["draft", "sent"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setActiveId(null); setSel(new Set()); }} className={cn("rounded-lg px-3 py-1.5 text-[13px]", tab === t ? "bg-subtle font-medium" : "text-muted")}>
                {t === "draft" ? `Drafts (${drafts.length})` : `Sent (${state.emails.length - drafts.length})`}
              </button>
            ))}
            {tab === "draft" && sel.size > 0 && <Button className="ml-auto h-8" variant="primary" icon={Send} onClick={() => send(Array.from(sel))}>Send {sel.size}</Button>}
          </div>
          <div className="scroll-thin flex-1 overflow-y-auto">
            {list.map((e) => (
              <div key={e.id} onClick={() => setActiveId(e.id)} className={cn("flex cursor-pointer gap-3 border-b border-line px-4 py-3 last:border-0", active?.id === e.id ? "bg-accent-soft/60" : "hover:bg-subtle/60")}>
                {tab === "draft" && (
                  <input type="checkbox" className="mt-1" aria-label={`Select ${e.subject}`} checked={sel.has(e.id)} onClick={(ev) => ev.stopPropagation()} onChange={(ev) => { const n = new Set(sel); if (ev.target.checked) n.add(e.id); else n.delete(e.id); setSel(n); }} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13.5px] font-medium">{e.to}</span>
                    {KIND[e.kind].tone === "warn" ? <span className="text-[12px] text-muted">{KIND[e.kind].label}</span> : <Pill tone={KIND[e.kind].tone}>{KIND[e.kind].label}</Pill>}
                  </div>
                  <div className="mt-0.5 truncate text-[13px] text-ink-2">{e.subject}</div>
                  <div className="mt-0.5 text-[12px] text-muted">{(e.sentAt ?? e.createdAt).replace("T", " ").slice(0, 16)}</div>
                </div>
              </div>
            ))}
            {!list.length && <div className="p-5"><Empty title={tab === "draft" ? "No drafts" : "Nothing sent yet"} sub={tab === "draft" ? "Challenge a case to draft an email." : undefined} /></div>}
          </div>
        </Card>

        {active ? <Preview key={active.id} e={active} onSend={() => send([active.id])} onDiscard={() => dispatch({ type: "discardEmail", id: active.id })} onSave={(s, b) => dispatch({ type: "editEmail", id: active.id, subject: s, body: b })} /> : <Card className="p-8"><Empty title="Select an email" /></Card>}
      </div>
    </div>
  );
}

function Preview({ e, onSend, onDiscard, onSave }: { e: EmailDraft; onSend: () => void; onDiscard: () => void; onSave: (s: string, b: string) => void }) {
  const [subject, setSubject] = useState(e.subject);
  const [body, setBody] = useState(e.body);
  const editable = e.status === "draft";
  const dirty = subject !== e.subject || body !== e.body;
  return (
    <Card className="flex flex-col">
      <div className="space-y-2 border-b border-line px-6 py-4 text-[13.5px]">
        <div className="flex gap-2"><span className="w-14 text-muted">To</span><span className="font-medium">{e.to}</span></div>
        {e.cc && <div className="flex gap-2"><span className="w-14 text-muted">Cc</span><span>{e.cc}</span></div>}
        <div className="flex items-center gap-2">
          <span className="w-14 text-muted">Subject</span>
          {editable ? <input value={subject} onChange={(x) => setSubject(x.target.value)} className="flex-1 rounded-lg border border-line px-2 py-1 outline-none focus:border-accent" /> : <span className="font-medium">{e.subject}</span>}
        </div>
        <div className="flex gap-2"><span className="w-14 text-muted">Case</span><Link href={`/cases/${e.caseId}`} className="text-accent">{e.caseId} →</Link></div>
      </div>
      {editable ? (
        <textarea value={body} onChange={(x) => setBody(x.target.value)} className="min-h-[360px] flex-1 resize-none px-6 py-5 font-sans text-[14px] leading-relaxed outline-none" />
      ) : (
        <pre className="flex-1 whitespace-pre-wrap px-6 py-5 font-sans text-[14px] leading-relaxed">{e.body}</pre>
      )}
      <div className="flex items-center gap-2 border-t border-line px-6 py-3">
        <Mail className="size-4 text-muted" />
        <span className="text-[12.5px] text-muted">{editable ? "Draft. Review before sending." : `Sent ${e.sentAt?.replace("T", " ").slice(0, 16)}`}</span>
        {editable && (
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" icon={Trash2} onClick={onDiscard}>Discard</Button>
            {dirty && <Button onClick={() => onSave(subject, body)}>Save edits</Button>}
            <Button variant="primary" icon={Send} onClick={() => { if (dirty) onSave(subject, body); onSend(); }}>Approve & send</Button>
          </div>
        )}
      </div>
    </Card>
  );
}
