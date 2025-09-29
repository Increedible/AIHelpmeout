import React from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { TokensDialog } from './TokensDialog';
import { PromptConfigDialog } from './PromptConfigDialog';
import { Markdown } from '@/lib/markdown';
import { useStore } from '@/lib/state';
import { CONFIG } from '@/lib/config';
import { languageLabelFromId } from '@/lib/languages';
import { uid, buildPromptMarkdown, isSameText, promptSignature } from '@/lib/utils';
import { callProvider } from '@/lib/providers';
import type { Provider } from '@/types';

const MODELS = {
    openai: { heavy: 'gpt-4o', light: 'gpt-4o-mini' },
    gemini: { heavy: 'gemini-1.5-pro', light: 'gemini-1.5-flash' },
    anthropic: { heavy: 'claude-3.5-sonnet', light: 'claude-3.5-haiku' }
} as const;

function providerOf(modelId: string): Provider {
    if (modelId.startsWith('openai.')) return 'openai';
    if (modelId.startsWith('gemini')) return 'gemini';
    if (modelId.startsWith('anthropic')) return 'anthropic';
    return modelId.split('.')[0] as Provider;
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
    const effectiveLang = s.langPrompts[lang] ?? (CONFIG.LANG_PROMPT_DEFAULT_PREFIX + languageLabel + '.');

    // Enable/disable logic: Save & Prompt greyed out only if code & prompts unchanged since last prompt
    const currentSig = promptSignature({
        code: code.currentCode,
        globalPrompt: effectiveGlobal,
        langPrompt: effectiveLang
    });
    const lastSig = s.lastPromptSignature[lang];
    const disabledReason = lastSig && lastSig === currentSig
        ? CONFIG.STRINGS.noChangesSinceLastPrompt
        : undefined;
    const canClickPrompt = !disabledReason;

    // UI helpers
    const currentProvider = providerOf(s.model);
    const currentModel = s.model.split('.').pop()!;
    const tokenForProvider = (p: Provider) => (s.tokens as any)[p] as string | undefined;

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
    React.useEffect(() => { scrollToBottom(); }, [s.chat[lang]?.length, scrollToBottom, lang]);

    // When switching model and token missing -> append an error bubble and scroll
    React.useEffect(() => {
        const token = tokenForProvider(currentProvider);
        if (!token) {
            s.appendChat({ id: uid(), role: 'error', content: CONFIG.STRINGS.noToken, ts: Date.now() });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [s.model, s.tokens]); // intentionally not depending on chat/lang to avoid loops

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
            s.appendChat({ id: uid(), role: 'error', content: CONFIG.STRINGS.noToken, ts: Date.now() });
            s.setPrompting(false);
            return;
        }

        const ac = new AbortController();
        setAborter(ac);

        let fullText = '';
        try {
            fullText = await callProvider({
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

        // Gradual reveal into a single AI bubble
        const aiId = uid();
        s.appendChat({ id: aiId, role: 'ai', content: '', ts: Date.now() });

        const total = fullText.length;
        let i = 0;
        const stepChars = Math.max(1, Math.round(CONFIG.STREAM_CHAR_RATE / 10));
        const start = Date.now();

        clearTicker();
        tickerRef.current = window.setInterval(() => {
            if (cancelledRef.current || (aborter && aborter.signal.aborted)) {
                clearTicker();
                s.setPrompting(false);
                return;
            }
            if (Date.now() - start > CONFIG.MAX_STREAM_MS) {
                s.updateChatMessage(lang, aiId, prev => ({ ...prev, content: (prev.content || '') + '\n\n*(truncated due to time limit)*' }));
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
        s.appendChat({ id: uid(), role: 'error', content: CONFIG.STRINGS.promptCancelled, ts: Date.now() });
        s.setPrompting(false);
        setAborter(null);
    };

    // top-right: Prompt config + model dropdown + Tokens button
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-end gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--brand-border)' }}>
                <button className="btn" onClick={() => setOpenPromptConfig(true)}>Prompt</button>

                <Dropdown.Root>
                    <Dropdown.Trigger asChild>
                        <button className="btn">{providerOf(s.model).toUpperCase()} · {currentModel}</button>
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
            <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-3">
                {(s.chat[lang] ?? []).map(m => (
                    <div key={m.id} className={`bubble ${m.role==='user'?'bubble-user':m.role==='error'?'bubble-error':'bubble-ai'}`}>
                        <div className="markdown"><Markdown>{m.content}</Markdown></div>
                    </div>
                ))}
            </div>

            {/* footer actions */}
            <div className="p-3 border-t" style={{ borderColor: 'var(--brand-border)' }}>
                {!s.isPrompting ? (
                    <button
                        className="btn btn-primary"
                        disabled={!canClickPrompt}
                        title={canClickPrompt ? 'Save & prompt' : (disabledReason ?? '')}
                        onClick={startPrompt}
                    >
                        Save & Prompt
                    </button>
                ) : (
                    <button className="btn btn-danger" onClick={cancelPrompt}>Cancel prompt</button>
                )}
            </div>

            <TokensDialog open={openTokens} onOpenChange={setOpenTokens}/>
            <PromptConfigDialog open={openPromptConfig} onOpenChange={setOpenPromptConfig}/>
        </div>
    );
};
