import type { ChatMessage } from '@/types';

// We use the REST Chat Completions endpoint in the browser with Authorization header.
// Official API reference: https://platform.openai.com/docs/api-reference/chat 

export async function callOpenAI(opts: {
  apiKey: string;
  model: 'gpt-4o' | 'gpt-4o-mini';
  userMarkdown: string;
  signal?: AbortSignal;
}): Promise<string> {
  const { apiKey, model, userMarkdown, signal } = opts;

  // Use a short, stable system prompt to keep answers tidy.
  const messages = [
    { role: 'system', content: 'You are a senior code reviewer. Prefer bullet points, small code snippets, and actionable steps.' },
    { role: 'user', content: userMarkdown }
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages, temperature: 0.2 })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error (${res.status}): ${text}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? '';
}
