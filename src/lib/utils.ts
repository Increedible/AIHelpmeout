export const uid = () => Math.random().toString(36).slice(2);

/** Shallow equality on strings for save/enable logic */
export const isSameText = (a: string, b: string) => a === b;

/** Builds the exact prompt payload shown to the AI (markdown) */
export function buildPromptMarkdown(opts: {
    languageLabel: string;
    lastSaved: string;
    newSaved: string;
    globalPrompt: string;
    langPrompt: string;
}) {
    const { languageLabel, lastSaved, newSaved, globalPrompt, langPrompt } = opts;
    const fence = '```';
    // Diff prompt followed by customizable prompts
    return [
        `Last saved code:`,
        `${fence}${languageLabel.toLowerCase()}\n${lastSaved}\n${fence}`,
        ``,
        `Newly saved code:`,
        `${fence}${languageLabel.toLowerCase()}\n${newSaved}\n${fence}`,
        ``,
        globalPrompt.trim(),
        langPrompt.trim().length ? `\n${langPrompt.trim()}` : ''
    ].join('\n');
}

/** Signature to decide if a re-prompt is identical to the last one */
export function promptSignature(payload: {
    code: string;
    globalPrompt: string;
    langPrompt: string;
}) {
    return JSON.stringify(payload);
}
