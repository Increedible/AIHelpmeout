import { callOpenAI } from './openai';
import { callGemini } from './gemini';
import { callAnthropic } from './anthropic';
import type { Provider } from '@/types';

export async function callProvider(opts: {
  provider: Provider;
  model: string;
  apiKey: string;
  userMarkdown: string;
  signal?: AbortSignal;
}) {
  const { provider, model, apiKey, userMarkdown, signal } = opts;
  if (provider === 'openai') return callOpenAI({ apiKey, model: model as any, userMarkdown, signal });
  if (provider === 'gemini') return callGemini({ apiKey, model: model as any, userMarkdown, signal });
  if (provider === 'anthropic') return callAnthropic({ apiKey, model: model as any, userMarkdown, signal });
  throw new Error('Unknown provider');
}
