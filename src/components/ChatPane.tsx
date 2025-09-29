import React from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { User2, Cpu, TriangleAlert } from 'lucide-react';
import { TokensDialog } from './TokensDialog';
import { PromptConfigDialog } from './PromptConfigDialog';
import { Markdown } from '@/lib/markdown';
import { useStore } from '@/lib/state';
import { CONFIG } from '@/lib/config';
import { languageLabelFromId } from '@/lib/languages';
import { uid, buildPromptMarkdown, isSameText, promptSignature } from '@/lib/utils';
import { callProvider } from '@/lib/providers';
import type { Provider } from '@/types';

function providerOf(modelId: string): Provider {
  if (modelId.startsWith('openai.')) return 'openai';
  if (modelId.startsWith('gemini')) return 'gemini';
  if (modelId.startsWith('anthropic')) return 'anthropic';
  return modelId.split('.')[0] as Provider;
}

// Helper: extract substring after first dot, so "gemini.gemini-2.5-flash" -> "gemini-2.5-flash"
function modelNameAfterProvider(id: string): string {
  const idx = id.indexOf('.');
  return idx >= 0 ? id.slice(idx + 1) : id;
}

export const ChatPane: React.FC = () => {
  const s = useStore();
  const lang = s.language;
  const code = s.code[lang]!;
  const [openTokens, setOpenTokens] = React.useState(false);
  const [openPromptConfig, setOpenPromptConfig] = React.useState(false);

  const [aborter, setAborter] = React.useState<AbortController | null>(null);
  const tickerRef = React.useRef<number | null>(null);
  const cancelledRef = React.useRef(false);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  // Derived prompts
  const languageLabel = languageLabelFromId(lang);
  const effectiveGlobal = s.globalPrompt || CONFIG.GLOBAL_PROMPT_DEFAULT;
  const effectiveLang =
    s.langPrompts[lang] ??
    CONFIG.LANG_PROMPT_DEFAULT_PREFIX + languageLabel + '.';

  // Enable/disable logic: Save & Prompt greyed out only if code & prompts unchanged since last prompt
  const currentSig = promptSignature({
    code: code.currentCode,
    globalPrompt: effectiveGlobal,
    langPrompt: effectiveLang
  });
  const lastSig = s.lastPromptSignature[lang];
  const disabledReason =
    lastSig && lastSig === currentSig
      ? CONFIG.STRINGS.noChangesSinceLastPrompt
      : undefined;
  const canClickPrompt = !disabledReason;

  // UI helpers
  const currentProvider = providerOf(s.model);
  const currentModel = modelNameAfterProvider(s.model);
  const tokenForProvider = (p: Provider) =>
    (s.tokens as any)[p] as string | undefined;

  const clearTicker = () => {
    if (tickerRef.current !== null) {
      window.clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  };

  // Scroll to bottom when chat updates
  const scrollToBottom = React.useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);
  React.useEffect(() => {
    scrollToBottom();
  }, [s.chat[lang]?.length, scrollToBottom, lang]);

  // When switching model and token missing -> append an error bubble and scroll
  React.useEffect(() => {
    const token = tokenForProvider(currentProvider);
    if (!token) {
      s.appendChat({
        id: uid(),
        role: 'error',
        content: `No API key set for ${currentProvider.toUpperCase()}. Open “Tokens” to add one.`,
        ts: Date.now()
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.model, s.tokens]); // avoid loops

  const startPrompt = async () => {
    // Prepare pre/post saved snapshots correctly
    const preSaved = s.code[lang]?.savedCode ?? code.savedCode;
    s.save(); // save is implied
    const postSaved = s.code[lang]?.savedCode ?? code.currentCode;

    // Fresh chat for this language
    s.clearChatFor(lang);

    const markdown = buildPromptMarkdown({
      languageLabel,
      lastSaved: preSaved,
      newSaved: postSaved,
      globalPrompt: effectiveGlobal,
      langPrompt: effectiveLang
    });

    s.appendChat({ id: uid(), role: 'user', content: markdown, ts: Date.now() });
    s.setPrompting(true);
    cancelledRef.current = false;

    // If no token for selected provider -> render clean error bubble and bail
    const token = tokenForProvider(currentProvider);
    if (!token) {
      s.appendChat({
        id: uid(),
        role: 'error',
        content: `No API key set for ${currentProvider.toUpperCase()}. Open “Tokens” to add one.`,
        ts: Date.now()
      });
      s.setPrompting(false);
      return;
    }

    const ac = new AbortController();
    setAborter(ac);

    // create a loading bubble immediately (three dots animation)
    const aiId = uid();
    let loadingDots = 0;
    const loadingTimer = window.setInterval(() => {
      loadingDots = (loadingDots + 1) % 4;
      const dots = '.'.repeat(loadingDots || 3); // cycle 1..3
      s.updateChatMessage(lang, aiId, prev => ({ ...prev, content: dots || '...' }));
    }, 420);
    s.appendChat({ id: aiId, role: 'ai', content: '...', ts: Date.now() });

    let fullText = '';
    try {
      fullText = await callProvider({
        provider: currentProvider,
        model: currentModel, // now safe even with "2.5"
        apiKey: token,
        userMarkdown: markdown,
        signal: ac.signal
      });
    } catch (e: any) {
      const msg = String(e?.message || e);
      s.appendChat({
        id: uid(),
        role: 'error',
        content: `Provider error: ${msg}`,
        ts: Date.now()
      });
      s.setPrompting(false);
      setAborter(null);
      window.clearInterval(loadingTimer);
      return;
    }

    const total = fullText.length;
    let i = 0;
    const stepChars = Math.max(1, Math.round(CONFIG.STREAM_CHAR_RATE / 3));
    const start = Date.now();

    window.clearInterval(loadingTimer);
    clearTicker();
    tickerRef.current = window.setInterval(() => {
      if (cancelledRef.current || (aborter && aborter.signal.aborted)) {
        clearTicker();
        s.setPrompting(false);
        return;
      }
      if (Date.now() - start > CONFIG.MAX_STREAM_MS) {
        s.updateChatMessage(lang, aiId, prev => ({
          ...prev,
          content: (prev.content || '') + '\n\n*(truncated due to time limit)*'
        }));
        clearTicker();
        s.setPrompting(false);
        return;
      }

      const next = Math.min(total, i + stepChars);
      const slice = fullText.slice(0, next);
      s.updateChatMessage(lang, aiId, prev => ({ ...prev, content: slice }));
      i = next;

      if (i >= total) {
        clearTicker();
        s.setPrompting(false);
        // record last prompt signature for "no-changes" logic
        s.setLastPromptSignature(lang, currentSig);
      }
    }, 100);
  };

  const cancelPrompt = () => {
    cancelledRef.current = true;
    if (aborter) aborter.abort();
    clearTicker();
    s.appendChat({
      id: uid(),
      role: 'error',
      content: CONFIG.STRINGS.promptCancelled,
      ts: Date.now()
    });
    s.setPrompting(false);
    setAborter(null);
  };

  // top-right: Prompt config + model dropdown + Tokens button
  return (
    <div className="h-full flex flex-col">
      <div
        className="flex items-center justify-end gap-2 px-3 py-2 border-b"
        style={{ borderColor: 'var(--brand-border)' }}
      >
        <button className="btn" onClick={() => setOpenPromptConfig(true)}>
          Edit Prompt
        </button>

        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <button className="btn">
              {providerOf(s.model).toUpperCase()} · {modelNameAfterProvider(s.model)}
            </button>
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content
              className="rounded-xl2 border p-1 shadow-soft"
              style={{
                background: 'var(--brand-panel)',
                borderColor: 'var(--brand-border)'
              }}
            >
              {(['openai', 'gemini', 'anthropic'] as Provider[]).map(p => (
                <React.Fragment key={p}>
                  <Dropdown.Label className="px-2 py-1 text-xs text-brand-muted">
                    {p.toUpperCase()}
                  </Dropdown.Label>
                  <Dropdown.Item
                    className="px-3 py-2 rounded hover:bg-white/10 cursor-pointer"
                    onClick={() => s.setModel(`${p}.${(CONFIG.MODELS as any)[p].light}`)}
                  >
                    {(CONFIG.MODELS as any)[p].light} (light)
                  </Dropdown.Item>
                  <Dropdown.Item
                    className="px-3 py-2 rounded hover:bg-white/10 cursor-pointer"
                    onClick={() => s.setModel(`${p}.${(CONFIG.MODELS as any)[p].heavy}`)}
                  >
                    {(CONFIG.MODELS as any)[p].heavy} (heavy)
                  </Dropdown.Item>
                  <Dropdown.Separator className="my-1 h-px bg-brand-border" />
                </React.Fragment>
              ))}
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>

        <button className="ml-2 btn" onClick={() => setOpenTokens(true)}>
          Tokens
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-3">
      {/* Empty state: show a “how to” message when there are no messages and a token exists */}
      {((s.chat[lang] ?? []).length === 0) && !!(s.tokens as any)[currentProvider] && (
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 mt-1 opacity-80"><TriangleAlert size={20} /></div>
          <div className="bubble bubble-ai">
            <div className="markdown">
              <Markdown>
                {`No analysis yet.\n\nPlease edit your code in the left editor and click **Save & Prompt** below to generate a formal review of the changes.`}
              </Markdown>
            </div>
          </div>
        </div>
      )}

      {(s.chat[lang] ?? []).map(m => {
        const isUser = m.role === 'user';
        const isError = m.role === 'error';
        const Icon = isError ? TriangleAlert : (isUser ? User2 : Cpu);

        return (
          <div key={m.id} className="flex items-start gap-3">
            <div className="w-6 h-6 mt-1 opacity-80">
              <Icon size={20} />
            </div>
            <div
              className={`bubble ${
                isUser ? 'bubble-user' : isError ? 'bubble-error' : 'bubble-ai'
              }`}
            >
              <div className="markdown">
                <Markdown>{m.content}</Markdown>
              </div>
            </div>
          </div>
        );
      })}
    </div>


      {/* footer actions */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--brand-border)' }}>
        {!s.isPrompting ? (
          <button
            className="btn btn-primary"
            disabled={!canClickPrompt}
            title={canClickPrompt ? 'Save & prompt' : disabledReason ?? ''}
            onClick={startPrompt}
          >
            Save & Prompt
          </button>
        ) : (
          <button className="btn btn-danger" onClick={cancelPrompt}>
            Cancel prompt
          </button>
        )}
      </div>

      <TokensDialog open={openTokens} onOpenChange={setOpenTokens} />
      <PromptConfigDialog open={openPromptConfig} onOpenChange={setOpenPromptConfig} />
    </div>
  );
};
