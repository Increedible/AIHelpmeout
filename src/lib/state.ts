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

  appendChat(msg: ChatMessage): void;
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

const initialLanguage = (safeLS.get<string>('language', CONFIG.DEFAULT_LANGUAGE));
const initialTheme = (safeLS.get<'dark' | 'light'>('theme', CONFIG.DEFAULT_THEME));
const initialTokens = safeLS.get<TokenState>('tokens', {});
const initialModel = (() => {
  // auto-select a light model when a provider token first appears, preferring openai
  const order = CONFIG.PROVIDER_PREFERENCE;
  for (const p of order) {
    if (initialTokens[p as Provider]) {
      if (p === 'openai') return 'openai.gpt-4o-mini' as ModelId;
      if (p === 'gemini') return 'gemini-1.5-flash' as ModelId;
      if (p === 'anthropic') return 'anthropic.claude-3.5-haiku' as ModelId;
    }
  }
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

export const useStore = create<Store>((set, get) => ({
  theme: initialTheme,
  leftPercent: safeLS.get('leftPercent', 50),
  language: initialLanguage,
  code: initialCode,
  chat: initialChat,
  model: initialModel,
  tokens: initialTokens,
  isPrompting: false,

  setTheme(t) {
    set({ theme: t });
    safeLS.set('theme', t);
    const html = document.documentElement;
    if (t === 'dark') { html.classList.add('dark'); html.classList.remove('light'); html.classList.remove('light'); html.classList.remove('light'); (html as any).classList.remove('light'); }
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
    // Auto-pick the light model of the latest provided provider if none selected
    const s = get();
    if (t.openai && !s.model.startsWith('openai')) set({ model: 'openai.gpt-4o-mini' as ModelId });
    else if (t.gemini && !s.model.startsWith('gemini')) set({ model: 'gemini-1.5-flash' as ModelId });
    else if (t.anthropic && !s.model.startsWith('anthropic')) set({ model: 'anthropic.claude-3.5-haiku' as ModelId });
  },

  appendChat(msg) {
    const s = get(); const lang = s.language;
    const list = s.chat[lang] ?? [];
    s.chat[lang] = [...list, msg];
    set({ chat: { ...s.chat } });
    safeLS.set('chat', get().chat);
  },

  clearChatFor(lang) {
    const s = get();
    s.chat[lang] = [];
    set({ chat: { ...s.chat } });
    safeLS.set('chat', get().chat);
  },

  setPrompting(x) { set({ isPrompting: x }); }
}));
