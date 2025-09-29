import React from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { TokensDialog } from './TokensDialog';
import { Markdown } from '@/lib/markdown';
import { useStore } from '@/lib/state';
import { CONFIG } from '@/lib/config';
import { languageLabelFromId } from '@/lib/languages';
import { uid, buildPromptMarkdown, isSameText } from '@/lib/utils';
import { callProvider } from '@/lib/providers';
import type { Provider } from '@/types';

const MODELS = {
  openai: {
    heavy: 'gpt-4o',
    light: 'gpt-4o-mini'
  },
  gemini: {
    heavy: 'gemini-1.5-pro',
    light: 'gemini-1.5-flash'
  },
  anthropic: {
    heavy: 'claude-3.5-sonnet',
    light: 'claude-3.5-haiku'
  }
} as const;

function providerOf(modelId: string): Provider {
  if (modelId.startsWith('openai.')) return 'openai';
  if (modelId.startsWith('gemini')) return 'gemini';
  if (modelId.startsWith('anthropic')) return 'anthropic';
  // fallback: parse before dot
  const p = modelId.split('.')[0] as Provider;
  return p;
}

export const ChatPane: React.FC = () => {
  const s = useStore();
  const lang = s.language;
  const code = s.code[lang]!;
  const canPrompt = !isSameText(code.currentCode, code.defaultCode);
  const [openTokens, setOpenTokens] = React.useState(false);

  const [aborter, setAborter] = React.useState<AbortController | null>(null);

  // UI helpers
  const currentProvider = providerOf(s.model);
  const currentModel = s.model.split('.').pop()!;
  const tokenForProvider = (p: Provider) => (s.tokens as any)[p] as string | undefined;

  const startPrompt = async () => {
    // Save is implied before prompting
    s.save();
    s.clearChatFor(lang);

    // Compose user bubble (markdown includes fenced code)
    const markdown = buildPromptMarkdown({
      languageLabel: languageLabelFromId(lang),
      lastSaved: code.savedCode,          // after save(), savedCode == currentCode; but we want old vs new
      newSaved: s.code[lang]!.savedCode   // re-read
    });

    s.appendChat({ id: uid(), role: 'user', content: markdown, ts: Date.now() });
    s.setPrompting(true);

    // If no token for selected provider -> render clean error bubble and bail
    const token = tokenForProvider(currentProvider);
    if (!token) {
      s.appendChat({ id: uid(), role: 'error', content: CONFIG.STRINGS.noToken, ts: Date.now() });
      s.setPrompting(false);
      return;
    }

    // Call API (no SSE to keep it portable; we "type" the final text gradually)
    const ac = new AbortController();
    setAborter(ac);

    let text = '';
    try {
      text = await callProvider({
        provider: currentProvider,
        model: currentModel,
        apiKey: token,
        userMarkdown: markdown,
        signal: ac.signal
      });
    } catch (e: any) {
      const msg = String(e?.message || e);
      s.appendChat({ id: uid(), role: 'error', content: `Provider error: ${msg}`, ts: Date.now() });
      s.setPrompting(false);
      setAborter(null);
      return;
    }

    // Gradual reveal
    const id = uid();
    let i = 0;
    const start = Date.now();
    const tick = () => {
      if (Date.now() - start > CONFIG.MAX_STREAM_MS) {
        s.appendChat({ id: uid(), role: 'error', content: 'Output truncated due to time limit.', ts: Date.now() });
        done();
        return;
      }
      const rate = Math.max(1, Math.floor(CONFIG.STREAM_CHAR_RATE / 10)); // update in chunks
      const next = Math.min(text.length, i + rate);
      const chunk = text.slice(i, next);

      if (i === 0) {
        s.appendChat({ id, role: 'ai', content: chunk, ts: Date.now() });
      } else {
        // mutate last message content for smoother typing
        const list = s.chat[lang] ?? [];
        const last = list.find(m => m.id === id);
        if (last) last.content += chunk;
        s.appendChat({ id: uid(), role: 'system', content: '', ts: Date.now() }); // tiny hack to trigger store save
        // remove the extra system message
        const l = s.chat[lang];
        l.pop();
      }

      i = next;
      if (i < text.length) {
        setTimeout(tick, 1000 / 10);
      } else {
        done();
      }
    };
    const done = () => { s.setPrompting(false); setAborter(null); };

    tick();
  };

  const cancelPrompt = () => {
    if (aborter) aborter.abort();
    s.appendChat({ id: uid(), role: 'error', content: CONFIG.STRINGS.promptCancelled, ts: Date.now() });
    s.setPrompting(false); setAborter(null);
  };

  // top-right: model dropdown + tokens button
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end px-3 py-2 border-b" style={{ borderColor: 'var(--brand-border)' }}>
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <button className="btn">{currentProvider.toUpperCase()} · {currentModel}</button>
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content className="rounded-xl2 border p-1 shadow-soft" style={{ background: 'var(--brand-panel)', borderColor: 'var(--brand-border)' }}>
              {(['openai','gemini','anthropic'] as Provider[]).map(p => (
                <React.Fragment key={p}>
                  <Dropdown.Label className="px-2 py-1 text-xs text-brand-muted">{p.toUpperCase()}</Dropdown.Label>
                  <Dropdown.Item className="px-3 py-2 rounded hover:bg-white/10 cursor-pointer" onClick={() => s.setModel(`${p}.${(MODELS as any)[p].light}`)}>
                    {(MODELS as any)[p].light} (light)
                  </Dropdown.Item>
                  <Dropdown.Item className="px-3 py-2 rounded hover:bg-white/10 cursor-pointer" onClick={() => s.setModel(`${p}.${(MODELS as any)[p].heavy}`)}>
                    {(MODELS as any)[p].heavy} (heavy)
                  </Dropdown.Item>
                  <Dropdown.Separator className="my-1 h-px bg-brand-border"/>
                </React.Fragment>
              ))}
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>

        <button className="ml-2 btn" onClick={() => setOpenTokens(true)}>Tokens</button>
      </div>

      {/* chat list */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {(s.chat[lang] ?? []).map(m => (
          <div key={m.id} className={`bubble ${m.role==='user'?'bubble-user':m.role==='error'?'bubble-error':'bubble-ai'}`}>
            <div className="markdown"><Markdown>{m.content}</Markdown></div>
          </div>
        ))}

        {/* If selected model but no token, provide friendly hint */}
        {tokenForProvider(currentProvider) ? null : (
          <div className="bubble bubble-error">
            <Markdown>{CONFIG.STRINGS.noToken}</Markdown>
          </div>
        )}
      </div>

      {/* footer actions */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--brand-border)' }}>
        {!s.isPrompting ? (
          <button className="btn btn-primary" disabled={!canPrompt} title={canPrompt ? 'Save & prompt' : 'Code equals default; nothing to prompt'} onClick={startPrompt}>
            Save & Prompt
          </button>
        ) : (
          <button className="btn btn-danger" onClick={cancelPrompt}>Cancel prompt</button>
        )}
      </div>

      <TokensDialog open={openTokens} onOpenChange={setOpenTokens}/>
    </div>
  );
};
