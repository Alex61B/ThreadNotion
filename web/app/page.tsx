'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

// =============================================================================
// TYPES
// =============================================================================

type Persona = {
  id: string;
  name: string;
  tone: string | null;
  values: string | null;
  instructions: string;
  createdAt: string;
};

type Product = {
  id: string;
  name: string;
  title?: string;
  description: string | null;
  brand: string | null;
  price: number | null;
  currency: string | null;
  sku: string;
  attributes: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

type Evaluation = {
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

type Conversation = {
  id: string;
  personaId: string;
  createdAt: string;
  messages: Message[];
  persona: { id: string; name: string; tone: string | null } | null;
  evaluation: Evaluation | null;
};

// API Response types
type ApiResponse<T> = { ok: boolean } & T;
type PersonasResponse = ApiResponse<{ personas: Persona[] }>;
type ProductsResponse = ApiResponse<{ products: Product[] }>;
type ConversationsResponse = ApiResponse<{ conversations: Conversation[] }>;
type ChatResponse = { conversationId: string; reply: string };
type ScriptResponse = { id: string; steps: string; personaId: string | null; productId: string; tone: string | null };

// =============================================================================
// CONSTANTS
// =============================================================================

const TABS = ['Roleplay', 'Script Generator', 'Feedback'] as const;
type Tab = typeof TABS[number];

const TONES = ['neutral', 'friendly', 'professional', 'enthusiastic', 'empathetic'] as const;

// Colors
const NAVY_ACCENT = '#1e3a5f';
const NAVY_LIGHT = '#2d4a6f';
const NAVY_DARK = '#152a45';

// =============================================================================
// LOADING & ERROR COMPONENTS
// =============================================================================

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
  return (
    <svg className={`animate-spin ${sizeClasses[size]}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-zinc-900/80 flex items-center justify-center z-10 rounded-xl">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-2 text-sm text-zinc-400">{message}</p>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-4 mb-4">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm text-red-300">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BackendOffline({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Backend Unavailable</h1>
        <p className="text-zinc-400 mb-6">
          Unable to connect to the ThreadNotion API. Make sure the backend server is running on port 3001.
        </p>
        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full px-4 py-3 rounded-lg text-white font-medium transition-all"
            style={{ backgroundColor: NAVY_ACCENT }}
          >
            Retry Connection
          </button>
          <div className="text-xs text-zinc-500">
            <p>To start the backend:</p>
            <code className="block mt-1 p-2 bg-zinc-900 rounded">npm run start</code>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// UI COMPONENTS
// =============================================================================

function TabButton({ tab, activeTab, onClick }: { tab: Tab; activeTab: Tab; onClick: () => void }) {
  const isActive = tab === activeTab;
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg ${
        isActive
          ? 'text-white border-b-2'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
      }`}
      style={isActive ? { backgroundColor: NAVY_ACCENT, borderBottomColor: '#60a5fa' } : {}}
    >
      {tab}
    </button>
  );
}

function Score({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const percentage = (value / max) * 100;
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3">
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <div className="text-xl font-semibold text-white">{value}</div>
      <div className="mt-2 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percentage}%`, backgroundColor: NAVY_ACCENT }}
        />
      </div>
    </div>
  );
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' }) {
  const colors = {
    default: 'bg-zinc-700 text-zinc-300',
    success: 'bg-emerald-900/50 text-emerald-400 border border-emerald-700',
    warning: 'bg-amber-900/50 text-amber-400 border border-amber-700',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${colors[variant]}`}>
      {children}
    </span>
  );
}

function ConversationListItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const date = new Date(conversation.createdAt);
  const timeStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const isGraded = !!conversation.evaluation;
  const messageCount = conversation.messages?.length || 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isSelected
          ? 'border-blue-500 bg-zinc-800'
          : 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-600'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-400">{timeStr}</span>
        {isGraded ? (
          <Badge variant="success">✓ {conversation.evaluation?.total}</Badge>
        ) : (
          <Badge variant="warning">⏳</Badge>
        )}
      </div>
      <div className="text-sm text-white truncate">
        {conversation.persona?.name || 'Unknown Persona'}
      </div>
      <div className="text-xs text-zinc-500 mt-1">{messageCount} messages</div>
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1.5 text-xs rounded-lg border border-zinc-600 hover:bg-zinc-700 transition-all flex items-center gap-1"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  loading = false,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md mx-4">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-zinc-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border border-zinc-600 hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg text-white transition-all flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: NAVY_ACCENT }}
          >
            {loading && <Spinner size="sm" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function HomePage() {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [activeTab, setActiveTab] = useState<Tab>('Roleplay');

  // Connection state
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Data
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Loading states
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Error states
  const [error, setError] = useState<string | null>(null);

  // Roleplay tab
  const [personaId, setPersonaId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [conversationId, setConversationId] = useState<string>('');
  const [chatMode, setChatMode] = useState<'roleplay' | 'assistant'>('roleplay');
  const [draft, setDraft] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [sending, setSending] = useState(false);

  // Feedback (in Roleplay tab)
  const [grading, setGrading] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  // Script Generator tab
  const [scriptPersonaId, setScriptPersonaId] = useState<string>('');
  const [scriptProductId, setScriptProductId] = useState<string>('');
  const [scriptTone, setScriptTone] = useState<string>('neutral');
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [generatingScript, setGeneratingScript] = useState(false);

  // Feedback tab
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [feedbackGrading, setFeedbackGrading] = useState(false);
  const [showRegradeModal, setShowRegradeModal] = useState(false);

  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------

  const canSend = personaId && draft.trim().length > 0 && !sending;
  const canGenerateScript = scriptPersonaId && scriptProductId && scriptTone && !generatingScript;

  const selectedPersona = useMemo(
    () => personas.find((p) => p.id === personaId) ?? null,
    [personas, personaId]
  );

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  // ---------------------------------------------------------------------------
  // DATA FETCHING WITH ERROR HANDLING
  // ---------------------------------------------------------------------------

  const checkBackendHealth = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('http://localhost:3001/health', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      return data.ok === true;
    } catch {
      return false;
    }
  }, []);

  const fetchPersonas = useCallback(async () => {
    setLoadingPersonas(true);
    try {
      const res = await fetch('/api/personas');
      if (!res.ok) throw new Error('Failed to fetch personas');
      const data = (await res.json()) as PersonasResponse;
      if (data?.ok && Array.isArray(data.personas)) {
        setPersonas(data.personas);
        if (data.personas.length > 0) {
          if (!personaId) setPersonaId(data.personas[0].id);
          if (!scriptPersonaId) setScriptPersonaId(data.personas[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load personas', e);
      setError('Failed to load personas. Check backend connection.');
    } finally {
      setLoadingPersonas(false);
    }
  }, [personaId, scriptPersonaId]);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = (await res.json()) as ProductsResponse;
      if (data?.ok && Array.isArray(data.products)) {
        setProducts(data.products);
        if (data.products.length > 0) {
          if (!productId) setProductId(data.products[0].id);
          if (!scriptProductId) setScriptProductId(data.products[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load products', e);
      // Don't show error - products are optional
    } finally {
      setLoadingProducts(false);
    }
  }, [productId, scriptProductId]);

  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await fetch('/api/conversations');
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const data = (await res.json()) as ConversationsResponse;
      if (data?.ok && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      }
    } catch (e) {
      console.error('Failed to load conversations', e);
      // Don't show error - conversations list is non-critical
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const initializeApp = useCallback(async () => {
    setInitialLoading(true);
    setError(null);

    const isConnected = await checkBackendHealth();
    setBackendConnected(isConnected);

    if (isConnected) {
      await Promise.all([fetchPersonas(), fetchProducts(), fetchConversations()]);
    }

    setInitialLoading(false);
  }, [checkBackendHealth, fetchPersonas, fetchProducts, fetchConversations]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // ---------------------------------------------------------------------------
  // ROLEPLAY HANDLERS
  // ---------------------------------------------------------------------------

  function startNewConversation() {
    setConversationId('');
    setMessages([]);
    setEvaluation(null);
  }

  function loadConversation(conv: Conversation) {
    setConversationId(conv.id);
    setPersonaId(conv.personaId);
    setMessages(conv.messages.map((m) => ({ role: m.role, content: m.content })));
    setEvaluation(conv.evaluation || null);
  }

  async function sendMessage() {
    if (!canSend) return;

    const userMsg = draft.trim();
    setDraft('');
    setEvaluation(null);

    // Optimistic update
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setSending(true);

    try {
      const payload: Record<string, unknown> = {
        personaId,
        productId: productId || undefined,
        message: userMsg,
        mode: chatMode,
      };
      if (conversationId) payload.conversationId = conversationId;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Chat request failed');

      const data = (await res.json()) as ChatResponse;

      if (data?.conversationId) setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply ?? '(no reply)' }]);

      // Refresh conversations list in background
      fetchConversations();
    } catch (e) {
      console.error('Failed to send message', e);
      // Remove optimistic message and show error
      setMessages((prev) => prev.slice(0, -1));
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function gradeConversation(convId?: string) {
    const idToGrade = convId || conversationId;
    if (!idToGrade) return;

    setGrading(true);
    setError(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: idToGrade }),
      });

      if (!res.ok) throw new Error('Grading request failed');

      const data = (await res.json()) as Evaluation;
      setEvaluation(data);
      fetchConversations();
    } catch (e) {
      console.error('Failed to grade conversation', e);
      setError('Failed to grade conversation. Please try again.');
    } finally {
      setGrading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // SCRIPT GENERATOR HANDLERS
  // ---------------------------------------------------------------------------

  async function generateScript() {
    if (!canGenerateScript) return;

    setGeneratingScript(true);
    setGeneratedScript('');
    setError(null);

    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: scriptPersonaId,
          productId: scriptProductId,
          tone: scriptTone,
        }),
      });

      if (!res.ok) throw new Error('Script generation failed');

      const data = (await res.json()) as ScriptResponse;
      
      // FIXED: Handle different response shapes
      let scriptText = '';
      if (typeof data.steps === 'string') {
        scriptText = data.steps;
      } else if (data.steps && typeof data.steps === 'object') {
        // Handle if steps is an object/array
        if (Array.isArray(data.steps)) {
          scriptText = data.steps.join('\n\n');
        } else {
          scriptText = JSON.stringify(data.steps, null, 2);
        }
      } else if ((data as any).script) {
        // Fallback for old format
        const script = (data as any).script;
        scriptText = Array.isArray(script) ? script.join('\n\n') : String(script);
      }
      
      setGeneratedScript(scriptText || 'Script generated but no content returned.');
    } catch (e) {
      console.error('Failed to generate script', e);
      setError('Failed to generate script. Please try again.');
      setGeneratedScript('');
    } finally {
      setGeneratingScript(false);
    }
  }

  // ---------------------------------------------------------------------------
  // FEEDBACK TAB HANDLERS
  // ---------------------------------------------------------------------------

  async function gradeFeedbackConversation() {
    if (!selectedConversationId) return;

    setFeedbackGrading(true);
    setError(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConversationId }),
      });

      if (!res.ok) throw new Error('Grading request failed');

      await res.json();
      fetchConversations();
    } catch (e) {
      console.error('Failed to grade conversation', e);
      setError('Failed to grade conversation. Please try again.');
    } finally {
      setFeedbackGrading(false);
      setShowRegradeModal(false);
    }
  }

  function handleRegradeClick() {
    if (selectedConversation?.evaluation) {
      setShowRegradeModal(true);
    } else {
      gradeFeedbackConversation();
    }
  }

  // ---------------------------------------------------------------------------
  // RENDER: Connection Check
  // ---------------------------------------------------------------------------

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-zinc-400">Connecting to ThreadNotion...</p>
        </div>
      </div>
    );
  }

  if (backendConnected === false) {
    return <BackendOffline onRetry={initializeApp} />;
  }

  // ---------------------------------------------------------------------------
  // RENDER: Main App
  // ---------------------------------------------------------------------------

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-800" style={{ backgroundColor: NAVY_DARK }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold">ThreadNotion</h1>
          <p className="text-sm text-zinc-400 mt-1">Fashion & apparel sales training</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-zinc-800 bg-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <TabButton key={tab} tab={tab} activeTab={activeTab} onClick={() => setActiveTab(tab)} />
            ))}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        {error && <ErrorBanner message={error} onRetry={() => setError(null)} />}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* ================================================================= */}
        {/* ROLEPLAY TAB */}
        {/* ================================================================= */}
        {activeTab === 'Roleplay' && (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            {/* Sidebar - Conversation History */}
            <aside className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">History</h2>
                <button
                  onClick={startNewConversation}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all text-white"
                  style={{ backgroundColor: NAVY_ACCENT }}
                >
                  + New
                </button>
              </div>

              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 relative">
                {loadingConversations && conversations.length === 0 && (
                  <div className="text-center py-4">
                    <Spinner size="sm" />
                  </div>
                )}
                {!loadingConversations && conversations.length === 0 ? (
                  <p className="text-sm text-zinc-500 italic">No conversations yet</p>
                ) : (
                  conversations.map((conv) => (
                    <ConversationListItem
                      key={conv.id}
                      conversation={conv}
                      isSelected={conv.id === conversationId}
                      onClick={() => loadConversation(conv)}
                    />
                  ))
                )}
              </div>
            </aside>

            {/* Main Chat Area */}
            <div className="space-y-4">
              {/* Setup Row */}
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs text-zinc-400 mb-1 block">Customer Persona</span>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                    value={personaId}
                    onChange={(e) => {
                      setPersonaId(e.target.value);
                      startNewConversation();
                    }}
                    disabled={loadingPersonas}
                  >
                    {loadingPersonas && <option>Loading...</option>}
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs text-zinc-400 mb-1 block">Product (optional)</span>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    disabled={loadingProducts}
                  >
                    <option value="">None</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.price ? `($${p.price})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs text-zinc-400 mb-1 block">Mode</span>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={chatMode}
                    onChange={(e) => setChatMode(e.target.value as 'roleplay' | 'assistant')}
                  >
                    <option value="roleplay">Roleplay (AI = customer)</option>
                    <option value="assistant">Assistant (AI = helper)</option>
                  </select>
                </label>
              </div>

              {/* Chat Window */}
              <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden relative">
                {/* Messages */}
                <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-sm text-zinc-500">
                        {chatMode === 'roleplay'
                          ? `Start a conversation with ${selectedPersona?.name || 'the customer'}...`
                          : 'Ask the assistant for help with your sales conversation...'}
                      </p>
                    </div>
                  ) : (
                    messages.map((m, idx) => (
                      <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                            m.role === 'user' ? 'text-white' : 'bg-zinc-800 text-zinc-100'
                          }`}
                          style={m.role === 'user' ? { backgroundColor: NAVY_ACCENT } : {}}
                        >
                          <div className="text-xs text-zinc-400 mb-1">
                            {m.role === 'user' ? 'You (Sales Associate)' : selectedPersona?.name || 'Customer'}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                        </div>
                      </div>
                    ))
                  )}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-800 rounded-xl px-4 py-3">
                        <Spinner size="sm" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="border-t border-zinc-700 p-4">
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type as the sales associate..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={sending}
                    />
                    <button
                      className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-all flex items-center gap-2"
                      style={{ backgroundColor: NAVY_ACCENT }}
                      disabled={!canSend}
                      onClick={sendMessage}
                    >
                      {sending && <Spinner size="sm" />}
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Grade Button */}
              <div className="flex items-center gap-4">
                <button
                  className="px-4 py-2 rounded-lg border border-zinc-700 text-sm font-medium hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center gap-2"
                  disabled={!conversationId || grading}
                  onClick={() => gradeConversation()}
                >
                  {grading && <Spinner size="sm" />}
                  {grading ? 'Grading...' : 'Grade Conversation'}
                </button>
                {!conversationId && <span className="text-xs text-zinc-500">Send at least one message first</span>}
              </div>

              {/* Evaluation Results */}
              {evaluation && (
                <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
                  <h3 className="text-lg font-semibold mb-4">Feedback</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                    <Score label="Storytelling" value={evaluation.storytelling} />
                    <Score label="Emotional" value={evaluation.emotional} />
                    <Score label="Persuasion" value={evaluation.persuasion} />
                    <Score label="Product Knowledge" value={evaluation.productKnow} />
                    <Score label="Total" value={evaluation.total} max={40} />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-medium text-emerald-400 mb-2">✓ Strengths</h4>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{evaluation.strengths}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-amber-400 mb-2">→ Tips to Improve</h4>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{evaluation.tips}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SCRIPT GENERATOR TAB */}
        {/* ================================================================= */}
        {activeTab === 'Script Generator' && (
          <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
            {/* Settings Panel */}
            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
                <h2 className="text-lg font-semibold mb-4">Generate Script</h2>

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs text-zinc-400 mb-1 block">Product</span>
                    <select
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                      value={scriptProductId}
                      onChange={(e) => setScriptProductId(e.target.value)}
                      disabled={loadingProducts}
                    >
                      <option value="">Select a product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.price ? `($${p.price})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs text-zinc-400 mb-1 block">Customer Persona</span>
                    <select
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                      value={scriptPersonaId}
                      onChange={(e) => setScriptPersonaId(e.target.value)}
                      disabled={loadingPersonas}
                    >
                      <option value="">Select a persona...</option>
                      {personas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs text-zinc-400 mb-1 block">Tone</span>
                    <select
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      value={scriptTone}
                      onChange={(e) => setScriptTone(e.target.value)}
                    >
                      {TONES.map((tone) => (
                        <option key={tone} value={tone}>
                          {tone.charAt(0).toUpperCase() + tone.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    className="w-full py-3 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    style={{ backgroundColor: NAVY_ACCENT }}
                    disabled={!canGenerateScript}
                    onClick={generateScript}
                  >
                    {generatingScript && <Spinner size="sm" />}
                    {generatingScript ? 'Generating...' : 'Generate Script'}
                  </button>
                </div>
              </div>

              {/* Product Preview */}
              {scriptProductId && (
                <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
                  <h3 className="text-sm font-semibold text-zinc-400 mb-3">Product Preview</h3>
                  {(() => {
                    const product = products.find((p) => p.id === scriptProductId);
                    if (!product) return null;
                    return (
                      <div className="space-y-2">
                        <div className="text-white font-medium">{product.name}</div>
                        {product.brand && <div className="text-xs text-zinc-500">{product.brand}</div>}
                        {product.price && (
                          <div className="text-lg font-bold" style={{ color: '#60a5fa' }}>
                            ${product.price}
                          </div>
                        )}
                        {product.description && <p className="text-sm text-zinc-400">{product.description}</p>}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Script Output */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden relative">
              <div className="flex items-center justify-between border-b border-zinc-700 px-5 py-3">
                <h3 className="font-semibold">Generated Script</h3>
                {generatedScript && <CopyButton text={generatedScript} />}
              </div>
              <div className="p-5 min-h-[500px] relative">
                {generatingScript && <LoadingOverlay message="Generating your personalized script..." />}
                {!generatingScript && generatedScript ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-sans leading-relaxed">
                      {generatedScript}
                    </pre>
                  </div>
                ) : !generatingScript ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-zinc-500 text-center">
                      Select a product, persona, and tone,
                      <br />
                      then click "Generate Script"
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* FEEDBACK TAB */}
        {/* ================================================================= */}
        {activeTab === 'Feedback' && (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            {/* Conversation List */}
            <aside className="space-y-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                Conversations ({conversations.length})
              </h2>

              <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 relative">
                {loadingConversations && conversations.length === 0 && (
                  <div className="text-center py-4">
                    <Spinner size="sm" />
                  </div>
                )}
                {!loadingConversations && conversations.length === 0 ? (
                  <p className="text-sm text-zinc-500 italic">No conversations to review</p>
                ) : (
                  conversations.map((conv) => (
                    <ConversationListItem
                      key={conv.id}
                      conversation={conv}
                      isSelected={conv.id === selectedConversationId}
                      onClick={() => setSelectedConversationId(conv.id)}
                    />
                  ))
                )}
              </div>
            </aside>

            {/* Selected Conversation Details */}
            <div>
              {!selectedConversationId ? (
                <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-8 text-center">
                  <p className="text-zinc-500">Select a conversation to view details and feedback</p>
                </div>
              ) : selectedConversation ? (
                <div className="space-y-6">
                  {/* Conversation Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">{selectedConversation.persona?.name}</h2>
                      <p className="text-sm text-zinc-400">{new Date(selectedConversation.createdAt).toLocaleString()}</p>
                    </div>
                    <button
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-all flex items-center gap-2"
                      style={{ backgroundColor: NAVY_ACCENT }}
                      disabled={feedbackGrading}
                      onClick={handleRegradeClick}
                    >
                      {feedbackGrading && <Spinner size="sm" />}
                      {feedbackGrading ? 'Grading...' : selectedConversation.evaluation ? 'Re-grade' : 'Grade Conversation'}
                    </button>
                  </div>

                  {/* Transcript */}
                  <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
                    <div className="border-b border-zinc-700 px-5 py-3">
                      <h3 className="font-semibold">Transcript</h3>
                    </div>
                    <div className="p-5 max-h-[300px] overflow-y-auto space-y-3">
                      {selectedConversation.messages.map((m, idx) => (
                        <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                              m.role === 'user' ? 'text-white' : 'bg-zinc-800 text-zinc-100'
                            }`}
                            style={m.role === 'user' ? { backgroundColor: NAVY_ACCENT } : {}}
                          >
                            <div className="text-xs text-zinc-400 mb-1">{m.role === 'user' ? 'Sales Associate' : 'Customer'}</div>
                            <div className="text-sm">{m.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feedback Summary */}
                  {selectedConversation.evaluation ? (
                    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Feedback Summary</h3>
                        <span className="text-xs text-zinc-500">
                          Graded {new Date(selectedConversation.evaluation.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                        <Score label="Storytelling" value={selectedConversation.evaluation.storytelling} />
                        <Score label="Emotional" value={selectedConversation.evaluation.emotional} />
                        <Score label="Persuasion" value={selectedConversation.evaluation.persuasion} />
                        <Score label="Product Knowledge" value={selectedConversation.evaluation.productKnow} />
                        <Score label="Total" value={selectedConversation.evaluation.total} max={40} />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg bg-emerald-900/20 border border-emerald-800/50 p-4">
                          <h4 className="text-sm font-medium text-emerald-400 mb-2">✓ What Went Well</h4>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{selectedConversation.evaluation.strengths}</p>
                        </div>
                        <div className="rounded-lg bg-amber-900/20 border border-amber-800/50 p-4">
                          <h4 className="text-sm font-medium text-amber-400 mb-2">→ Improve Next Time</h4>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{selectedConversation.evaluation.tips}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-8 text-center">
                      <div className="text-zinc-500 mb-4">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        This conversation hasn't been graded yet
                      </div>
                      <button
                        className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all flex items-center gap-2 mx-auto"
                        style={{ backgroundColor: NAVY_ACCENT }}
                        onClick={() => gradeFeedbackConversation()}
                        disabled={feedbackGrading}
                      >
                        {feedbackGrading && <Spinner size="sm" />}
                        {feedbackGrading ? 'Grading...' : 'Grade Now'}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Re-grade Confirmation Modal */}
      <ConfirmModal
        isOpen={showRegradeModal}
        title="Re-grade Conversation?"
        message="This will overwrite the current evaluation scores. The previous grades will not be saved."
        onConfirm={gradeFeedbackConversation}
        onCancel={() => setShowRegradeModal(false)}
        loading={feedbackGrading}
      />
    </main>
  );
}
