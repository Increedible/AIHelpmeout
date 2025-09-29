import { create } from 'zustand';
import { DEFAULT_SNIPPETS } from './defaults';
import { CONFIG } from './config';
import type { ChatMessage, ModelId, Provider } from '@/types';

type CodeState = {
  defaultCode: string;
  savedCode: string;
  currentCode: string;
};

type TokenState = { openai?: string; gemini?: string; anthropic?: string };

type Store = {
  // UI
  theme: 'dark' | 'light';
  leftPercent: number; // panel width %
  language: string;

  // per-language code states
  code: Record<string, CodeState>;

  // per-language chat
  chat: Record<string, ChatMessage[]>;

  // provider/model
  model: ModelId;

  // tokens (localStorage only; never sent anywhere except direct provider call)
  tokens: TokenState;

  // prompt config
  globalPrompt: string;
  langPrompts: Record<string, string>;
  lastPromptSignature: Record<string, string | undefined>; // by language

  // flags
  isPrompting: boolean;

  // actions
  setTheme(t: 'dark' | 'light'): void;
  setLeftPercent(p: number): void;
  setLanguage(id: string): void;

  updateCurrent(code: string): void;
  save(): void;
  revertToDefault(): void;

  setModel(m: ModelId): void;
  setTokens(t: TokenState): void;

  setGlobalPrompt(p: string): void;
  setLangPrompt(lang: string, p: string): void;
  setLastPromptSignature(lang: string, sig: string): void;

  appendChat(msg: ChatMessage): void;
  updateChatMessage(lang: string, id: string, updater: (prev: ChatMessage) => ChatMessage): void;
  clearChatFor(lang: string): void;

  setPrompting(x: boolean): void;
};

// Helpers to load from localStorage once (client only)
const safeLS = {
  get: <T,>(key: string, fallback: T): T => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; }
    catch { return fallback; }
  },
  set: (key: string, val: unknown) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
};

const initialLanguage = (safeLS.get<string>('language', 'javascript'));
const initialTheme = (safeLS.get<'dark' | 'light'>('theme', 'dark'));
const initialTokens = safeLS.get<TokenState>('tokens', {});
const initialModel = (() => {
  // Prefer provider where a key exists; pick its *light* model
  if (initialTokens.openai) return 'openai.gpt-4o-mini' as ModelId;
  if (initialTokens.gemini) return 'gemini.gemini-2.5-flash' as ModelId; // updated
  if (initialTokens.anthropic) return 'anthropic.claude-3.5-haiku' as ModelId;
  return 'openai.gpt-4o-mini' as ModelId;
})();

const emptyCodeState = (lang: string): CodeState => {
  const def = DEFAULT_SNIPPETS[lang] ?? '// Start coding...';
  return { defaultCode: def, savedCode: def, currentCode: def };
};

const initialCode: Record<string, CodeState> = safeLS.get('code', {
  javascript: emptyCodeState('javascript')
});
const initialChat: Record<string, ChatMessage[]> = safeLS.get('chat', {});
const initialGlobalPrompt = safeLS.get('globalPrompt', CONFIG.GLOBAL_PROMPT_DEFAULT);
const initialLangPrompts = safeLS.get<Record<string, string>>('langPrompts', {});
const initialLastSig = safeLS.get<Record<string, string | undefined>>('lastPromptSignature', {});

export const useStore = create<Store>((set, get) => ({
  theme: initialTheme,
  leftPercent: safeLS.get('leftPercent', 50),
  language: initialLanguage,
  code: initialCode,
  chat: initialChat,
  model: initialModel,
  tokens: initialTokens,
  isPrompting: false,

  globalPrompt: initialGlobalPrompt,
  langPrompts: initialLangPrompts,
  lastPromptSignature: initialLastSig,

  setTheme(t) {
    set({ theme: t });
    safeLS.set('theme', t);
    const html = document.documentElement;
    if (t === 'dark') { html.classList.add('dark'); html.classList.remove('light'); }
    else { html.classList.remove('dark'); html.classList.add('light'); }
  },

  setLeftPercent(p) { set({ leftPercent: p }); safeLS.set('leftPercent', p); },

  setLanguage(id) {
    const s = get();
    if (!s.code[id]) {
      s.code[id] = emptyCodeState(id);
    }
    set({ language: id, code: { ...s.code } });
    safeLS.set('language', id);
    safeLS.set('code', get().code);
  },

  updateCurrent(code) {
    const s = get();
    const lang = s.language;
    const entry = s.code[lang] ?? emptyCodeState(lang);
    entry.currentCode = code;
    set({ code: { ...s.code, [lang]: entry } });
  },

  save() {
    const s = get();
    const lang = s.language;
    const entry = s.code[lang] ?? emptyCodeState(lang);
    entry.savedCode = entry.currentCode;
    set({ code: { ...s.code, [lang]: entry } });
    safeLS.set('code', get().code);
  },

  revertToDefault() {
    const s = get();
    const lang = s.language;
    const entry = s.code[lang] ?? emptyCodeState(lang);
    entry.currentCode = entry.defaultCode;
    set({ code: { ...s.code, [lang]: entry } });
  },

  setModel(m) { set({ model: m }); },

  setTokens(t) {
    set({ tokens: t });
    safeLS.set('tokens', t);
    const s = get();
    if (t.openai && !s.model.startsWith('openai')) set({ model: 'openai.gpt-4o-mini' as ModelId });
    else if (t.gemini && !s.model.startsWith('gemini')) set({ model: 'gemini.gemini-2.5-flash' as ModelId }); // updated
    else if (t.anthropic && !s.model.startsWith('anthropic')) set({ model: 'anthropic.claude-3.5-haiku' as ModelId });
  },

  setGlobalPrompt(p) { set({ globalPrompt: p }); safeLS.set('globalPrompt', p); },
  setLangPrompt(lang, p) {
    const next = { ...get().langPrompts, [lang]: p };
    set({ langPrompts: next });
    safeLS.set('langPrompts', next);
  },
  setLastPromptSignature(lang, sig) {
    const next = { ...get().lastPromptSignature, [lang]: sig };
    set({ lastPromptSignature: next });
    safeLS.set('lastPromptSignature', next);
  },

  appendChat(msg) {
    const s = get(); const lang = s.language;
    const list = s.chat[lang] ?? [];
    s.chat[lang] = [...list, msg];
    set({ chat: { ...s.chat } });
    safeLS.set('chat', get().chat);
  },

  updateChatMessage(lang, id, updater) {
    const s = get();
    const list = s.chat[lang] ?? [];
    const idx = list.findIndex(m => m.id === id);
    if (idx >= 0) {
      const next = [...list];
      next[idx] = updater(next[idx]);
      s.chat[lang] = next;
      set({ chat: { ...s.chat } });
      safeLS.set('chat', get().chat);
    }
  },

  clearChatFor(lang) {
    const s = get();
    s.chat[lang] = [];
    set({ chat: { ...s.chat } });
    safeLS.set('chat', get().chat);
  },

  setPrompting(x) { set({ isPrompting: x }); }
}));
