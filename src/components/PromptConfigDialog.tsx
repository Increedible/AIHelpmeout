import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useStore } from '@/lib/state';
import { CONFIG } from '@/lib/config';
import { languageLabelFromId } from '@/lib/languages';

export const PromptConfigDialog: React.FC<{ open: boolean; onOpenChange: (x: boolean) => void; }> = ({ open, onOpenChange }) => {
    const s = useStore();
    const lang = s.language;
    const label = languageLabelFromId(lang);

    const [globalText, setGlobalText] = React.useState(s.globalPrompt || CONFIG.GLOBAL_PROMPT_DEFAULT);
    const [langText, setLangText] = React.useState(
        s.langPrompts[lang] ?? (CONFIG.LANG_PROMPT_DEFAULT_PREFIX + label + '.')
    );

    React.useEffect(() => {
        if (open) {
            setGlobalText(s.globalPrompt || CONFIG.GLOBAL_PROMPT_DEFAULT);
            setLangText(s.langPrompts[lang] ?? (CONFIG.LANG_PROMPT_DEFAULT_PREFIX + label + '.'));
        }
    }, [open, s.globalPrompt, s.langPrompts, lang, label]);

    const overGlobal = globalText.length > CONFIG.GLOBAL_PROMPT_MAX;
    const overLang = langText.length > CONFIG.LANG_PROMPT_MAX;
    const disabled = overGlobal || overLang;

    const [shake, setShake] = React.useState(false);
    const buzz = () => { setShake(true); setTimeout(() => setShake(false), 350); };

    const save = () => {
        if (disabled) return buzz();
        s.setGlobalPrompt(globalText);
        s.setLangPrompt(lang, langText);
        onOpenChange(false);
    };

    const Counter: React.FC<{ count: number; max: number }> = ({ count, max }) => (
        <span className={`text-xs ${count > max ? 'text-[var(--brand-error)]' : 'text-brand-muted'}`}>
            {count}/{max}
        </span>
    );

    const inputStyle: React.CSSProperties = {
        background: 'var(--brand-bg)', borderColor: 'var(--brand-border)', color: 'var(--brand-text)'
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] max-w-[96vw] rounded-xl2 border p-6 shadow-soft"
                    style={{ background: 'var(--brand-panel)', borderColor: 'var(--brand-border)', color: 'var(--brand-text)' }}
                >
                    <Dialog.Title className="text-lg font-semibold">Prompt text</Dialog.Title>
                    <Dialog.Description className="mt-1 text-brand-muted">
                        Customize the guidance appended after the code blocks when prompting.
                    </Dialog.Description>

                    <div className="mt-4 space-y-4">
                        <div>
                            <div className="flex items-center justify-between">
                                <label className="font-medium">Global prompt</label>
                                <Counter count={globalText.length} max={CONFIG.GLOBAL_PROMPT_MAX} />
                            </div>
                            <textarea
                                className="mt-1 w-full rounded-xl2 border px-3 py-2"
                                rows={3}
                                style={inputStyle}
                                value={globalText}
                                onChange={e => setGlobalText(e.target.value)}
                                placeholder="Analyse the differences between the two code samples only."
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <label className="font-medium">Language-specific prompt ({label})</label>
                                <Counter count={langText.length} max={CONFIG.LANG_PROMPT_MAX} />
                            </div>
                            <textarea
                                className="mt-1 w-full rounded-xl2 border px-3 py-2"
                                rows={3}
                                style={inputStyle}
                                value={langText}
                                onChange={e => setLangText(e.target.value)}
                                placeholder={`Give one suggestion for improvement for ${label}.`}
                            />
                        </div>
                    </div>

                    <div className="mt-5 flex justify-end gap-2">
                        <Dialog.Close asChild><button className="btn">Cancel</button></Dialog.Close>
                        <button className={`btn btn-primary ${shake ? 'btn-shake' : ''}`} disabled={disabled} onClick={save}>
                            Save
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
