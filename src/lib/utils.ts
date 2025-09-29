export const uid = () => Math.random().toString(36).slice(2);

/** Shallow equality on strings for save/enable logic */
export const isSameText = (a: string, b: string) => a === b;

/** Builds the exact prompt payload shown to the AI (markdown) */
export function buildPromptMarkdown(opts: {
  languageLabel: string;
  lastSaved: string;
  newSaved: string;
}) {
  const { languageLabel, lastSaved, newSaved } = opts;
  const fence = '```';
  // The “diff prompt” format the task asked for.
  return [
    `Please analyze the following ${languageLabel} changes and provide concrete, concise suggestions. `,
    ``,
    `Last saved code:`,
    `${fence}${languageLabel.toLowerCase()}\n${lastSaved}\n${fence}`,
    ``,
    `Newly saved code:`,
    `${fence}${languageLabel.toLowerCase()}\n${newSaved}\n${fence}`
  ].join('\n');
}
