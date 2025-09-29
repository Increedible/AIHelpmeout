// Claude now supports direct browser calls when you add this header:
//   anthropic-dangerous-direct-browser-access: true
// See discussion: https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/  and SDK notes. 

export async function callAnthropic(opts: {
  apiKey: string;
  model: 'claude-3.5-sonnet' | 'claude-3.5-haiku';
  userMarkdown: string;
  signal?: AbortSignal;
}): Promise<string> {
  const { apiKey, model, userMarkdown, signal } = opts;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true' // required for CORS in browser
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        { role: 'user', content: userMarkdown }
      ]
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic error (${res.status}): ${text}`);
  }
  const json = await res.json();
  // Concatenate text blocks
  const text = (json.content || [])
    .map((p: any) => p?.text || '')
    .join('');
  return text;
}
