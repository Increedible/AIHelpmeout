import type { ChatMessage } from '@/types';

// We call Gemini via the Google GenAI SDK *or* REST. The SDK is browser-ready,
// but Google recommends server-side for production; here the user explicitly wants client-only.
// Docs / quickstart: https://ai.google.dev/gemini-api/docs/quickstart
// Model list: https://ai.google.dev/gemini-api/docs/models  

export async function callGemini(opts: {
  apiKey: string;
  model: 'gemini-2.5-pro' | 'gemini-2.5-flash';
  userMarkdown: string;
  signal?: AbortSignal;
}): Promise<string> {
  const { apiKey, model, userMarkdown, signal } = opts as {
    apiKey: string;
    model: 'gemini-2.5-pro' | 'gemini-2.5-flash';
    userMarkdown: string;
    signal?: AbortSignal;
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: userMarkdown }] }],
      generationConfig: { temperature: 0.2 }
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini error (${res.status}): ${text}`);
  }
  const json = await res.json();
  const text =
    json.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ??
    '';
  return text;
}
