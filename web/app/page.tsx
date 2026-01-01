'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Persona = {
  id: string;
  name: string;
  tone: string | null;
  values: string | null;
  instructions: string;
  createdAt: string;
};

type PersonasResponse = { ok: boolean; personas: Persona[] };

type ChatResponse = { conversationId: string; reply: string };

type EvalResponse = {
  id: string;
  conversationId: string;
  storytelling: number;
  emotional: number;
  persuasion: number;
  productKnow: number;
  total: number;
  strengths: string;
  tips: string;
  createdAt: string;
};

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</div>
    </div>
  );
}

export default function HomePage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personaId, setPersonaId] = useState<string>('');

  const [conversationId, setConversationId] = useState<string>('');
  const [chatMode, setChatMode] = useState<'roleplay' | 'assistant'>('roleplay');

  const [draft, setDraft] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const [grading, setGrading] = useState(false);
  const [evaluation, setEvaluation] = useState<EvalResponse | null>(null);

  const canSend = personaId && draft.trim().length > 0;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/personas');
        const data = (await res.json()) as PersonasResponse;
        if (data?.ok && Array.isArray(data.personas)) {
          setPersonas(data.personas);
          if (!personaId && data.personas.length > 0) setPersonaId(data.personas[0].id);
        }
      } catch (e) {
        console.error('Failed to load personas', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPersona = useMemo(
    () => personas.find((p) => p.id === personaId) ?? null,
    [personas, personaId]
  );

  function startNewConversation() {
    setConversationId('');
    setMessages([]);
    setEvaluation(null);
  }

  async function sendMessage() {
    if (!canSend) return;

    const userMsg = draft.trim();
    setDraft('');
    setEvaluation(null);
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);

    const payload: any = {
      personaId,
      message: userMsg,
      mode: chatMode,
    };
    if (conversationId) payload.conversationId = conversationId;

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as ChatResponse;

    if (data?.conversationId) setConversationId(data.conversationId);
    setMessages((prev) => [...prev, { role: 'assistant', content: data.reply ?? '(no reply)' }]);
  }

  async function gradeConversation() {
    if (!conversationId) return;
    setGrading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
      const data = (await res.json()) as EvalResponse;
      setEvaluation(data);
    } finally {
      setGrading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 text-zinc-900 dark:text-zinc-50">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">ThreadNotion MVP</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Roleplay chat (you = associate, AI = customer persona) + grading.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Setup */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-semibold">Setup</h2>

          <label className="block">
            <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">Customer persona</div>
            <select
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              value={personaId}
              onChange={(e) => {
                setPersonaId(e.target.value);
                startNewConversation();
              }}
            >
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block">
            <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">Mode</div>
            <select
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              value={chatMode}
              onChange={(e) => setChatMode(e.target.value as any)}
            >
              <option value="roleplay">roleplay (AI = customer)</option>
              <option value="assistant">assistant (AI = helper)</option>
            </select>
          </label>

          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-black dark:text-zinc-300">
            <div>
              <span className="font-semibold">conversationId:</span> {conversationId || '(new)'}
            </div>
            <div className="mt-3 font-semibold">persona instructions preview</div>
            <div className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
              {selectedPersona?.instructions || '—'}
            </div>
          </div>

          <button
            className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            onClick={startNewConversation}
          >
            Start new conversation
          </button>

          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            If the dropdown is empty, make sure your Express API is running on <code>localhost:3001</code>.
          </p>
        </section>

        {/* Right: Chat */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-semibold">Roleplay chat</h2>

          <div className="h-[420px] overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-black">
            {messages.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Type as the sales associate. In <span className="font-semibold">roleplay</span> mode, the AI replies as the selected customer.
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m, idx) => (
                  <div key={idx}>
                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{m.role.toUpperCase()}</div>
                    <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type as the sales associate…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
            />
            <button
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              disabled={!canSend}
              onClick={() => void sendMessage()}
            >
              Send
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
              disabled={!conversationId || grading}
              onClick={() => void gradeConversation()}
            >
              {grading ? 'Grading…' : 'Grade conversation'}
            </button>
            {!conversationId && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Send at least one message first.</span>
            )}
          </div>

          {evaluation && (
            <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <h3 className="text-base font-semibold">Feedback</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Score label="Story" value={evaluation.storytelling} />
                <Score label="Emotional" value={evaluation.emotional} />
                <Score label="Persuasion" value={evaluation.persuasion} />
                <Score label="Product" value={evaluation.productKnow} />
                <Score label="Total" value={evaluation.total} />
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Strengths</div>
                <div className="mt-1 whitespace-pre-wrap text-sm">{evaluation.strengths}</div>
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Tips</div>
                <div className="mt-1 whitespace-pre-wrap text-sm">{evaluation.tips}</div>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
            Next: add <span className="font-semibold">/api/chat</span> and <span className="font-semibold">/api/feedback</span> proxy routes (if you haven’t yet), then we’ll add the Script Generator panel.
          </div>
        </section>
      </div>
    </main>
  );
}
