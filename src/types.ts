export type Provider = 'openai' | 'gemini' | 'anthropic';

export type OpenAIModel = 'gpt-4o' | 'gpt-4o-mini';
export type GeminiModel = 'gemini-2.5-pro' | 'gemini-2.5-flash';
export type AnthropicModel = 'claude-3.5-sonnet' | 'claude-3.5-haiku';

export type ModelId =
  | `${'openai'}.${OpenAIModel}`
  | `${'gemini'}.${GeminiModel}`
  | `${'anthropic'}.${AnthropicModel}`;

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'system' | 'error';
  content: string;        // markdown
  ts: number;
}
