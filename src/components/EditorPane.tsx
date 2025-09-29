import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { useStore } from '@/lib/state';
import { LANGUAGE_OPTIONS, languageLabelFromId } from '@/lib/languages';
import { CONFIG } from '@/lib/config';
import { IconButton } from './IconButton';
import { ConfirmDialog } from './ConfirmDialog';
import { Undo2, Redo2, RotateCcw, Save, Eye } from 'lucide-react';
import { isSameText } from '@/lib/utils';
import { Sun, Moon } from 'lucide-react';

function extFor(lang: string) {
    switch (lang) {
        case 'javascript': return 'js';
        case 'python': return 'py';
        case 'cpp': return 'cpp';
        case 'java': return 'java';
        case 'csharp': return 'cs';
        case 'kotlin': return 'kt';
        case 'html': return 'html';
        case 'css': return 'css';
        default: return lang;
    }
}

export const EditorPane: React.FC = () => {
    const theme = useStore(s => s.theme);
    const setTheme = useStore(s => s.setTheme);
    const language = useStore(s => s.language);
    const setLanguage = useStore(s => s.setLanguage);
    const st = useStore();

    const codeState = st.code[language]!;
    const hasUnsaved = !isSameText(codeState.currentCode, codeState.savedCode);
    const canSave = hasUnsaved;
    const [showRevert, setShowRevert] = React.useState(false);
    const [pendingLanguage, setPendingLanguage] = React.useState<string | undefined>(undefined);

    const [editor, setEditor] = React.useState<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null);
    const [showSaved, setShowSaved] = React.useState(false);

    const onMount: OnMount = (ed, monaco) => {
        setEditor(ed);
        ed.updateOptions({
            tabSize: 4,
            insertSpaces: true
        });
    };

    // Language change with unsaved guard
    const requestLanguageChange = (id: string) => {
        if (!id || id === language) return;
        if (hasUnsaved) {
            setPendingLanguage(id);
        } else {
            setLanguage(id);
        }
    };

    const confirmSwitchSave = () => {
        st.save();
        if (pendingLanguage) setLanguage(pendingLanguage);
        setPendingLanguage(undefined);
    };
    const confirmSwitchDiscard = () => {
        if (pendingLanguage) setLanguage(pendingLanguage);
        setPendingLanguage(undefined);
    };

    const handleRevert = () => {
        st.revertToDefault();
        setShowRevert(false);
    };

    const handleSave = () => {
        if (!canSave) return;
        if (codeState.currentCode.length > CONFIG.MAX_CODE_SIZE) {
            alert('Code too large; increase MAX_CODE_SIZE in config.ts if needed.');
            return;
        }
        st.save();
    };

    const toggleSavedOverlay = () => {
        const next = !showSaved;
        setShowSaved(next);
        editor?.updateOptions({ readOnly: next });
    };

    return (
        <div className="h-full flex flex-col relative">
            {/* top bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--brand-border)' }}>
                <div className="flex items-center gap-2">
                    {/* Dark / Light */}
                    <IconButton title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                        {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
                    </IconButton>

                    {/* Language dropdown */}
                    <Dropdown.Root>
                        <Dropdown.Trigger asChild>
                            <button className="btn">{languageLabelFromId(language)}</button>
                        </Dropdown.Trigger>
                        <Dropdown.Portal>
                            <Dropdown.Content className="rounded-xl2 border p-1 shadow-soft" style={{ background: 'var(--brand-panel)', borderColor: 'var(--brand-border)' }}>
                                {LANGUAGE_OPTIONS.map(o => (
                                    <Dropdown.Item key={o.id} className="px-3 py-2 rounded hover:bg-white/10 cursor-pointer"
                                        onClick={() => requestLanguageChange(o.id)}>
                                        {o.label}
                                    </Dropdown.Item>
                                ))}
                            </Dropdown.Content>
                        </Dropdown.Portal>
                    </Dropdown.Root>

                    {/* Undo / Redo (per-language thanks to Editor "path") */}
                    <IconButton title="Undo" onClick={() => editor?.trigger('source', 'undo', null)}><Undo2 size={18} /></IconButton>
                    <IconButton title="Redo" onClick={() => editor?.trigger('source', 'redo', null)}><Redo2 size={18} /></IconButton>

                    {/* Revert to default */}
                    <IconButton title="Revert to default (does not save)" onClick={() => setShowRevert(true)}><RotateCcw size={18} /></IconButton>

                    {/* Save */}
                    <IconButton title={canSave ? 'Save' : 'No changes to save'} onClick={handleSave}>
                        <Save size={18} className={canSave ? '' : 'opacity-50'} />
                    </IconButton>

                    {/* View Saved (read-only overlay) */}
                    <button
                        className={`btn ${showSaved ? 'btn-primary' : ''}`}
                        onClick={toggleSavedOverlay}
                        title={showSaved ? 'Viewing the last saved code (read-only)' : 'Show the last saved code (read-only overlay)'}
                    >
                        <Eye size={18} />
                        {showSaved ? 'Viewing Saved' : 'View Saved'}
                    </button>
                </div>
            </div>

            {/* editor */}
            <div className="monaco-wrapper relative">
                <Editor
                    height="100%"
                    language={language}
                    path={`file_${language}.${extFor(language)}`}   /* distinct model per language => distinct undo/redo stacks */
                    value={codeState.currentCode}
                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                    onMount={onMount}
                    onChange={(v) => st.updateCurrent(v ?? '')}
                    options={{
                        automaticLayout: true,
                        fontSize: 14,
                        wordWrap: 'on',
                        minimap: { enabled: false },
                        tabSize: 4,
                        insertSpaces: true,
                    }}
                />

                {showSaved && (
                    <div className="overlay-saved">
                        <div className="overlay-saved-header">
                            Viewing last saved — read-only
                        </div>
                        <div className="overlay-saved-body">
                            <pre>{codeState.savedCode}</pre>
                        </div>
                    </div>
                )}
            </div>

            {/* Revert dialog */}
            <ConfirmDialog
                open={showRevert}
                onOpenChange={setShowRevert}
                title="Revert to default?"
                description="This replaces your current editor contents with the language's default code. It will not change your last saved version."
                confirmLabel="Revert"
                onConfirm={handleRevert}
            />

            {/* Unsaved switch dialog (single, not stacked) */}
            <ConfirmDialog
                open={!!pendingLanguage}
                onOpenChange={(x) => !x && setPendingLanguage(undefined)}
                title="Unsaved changes"
                description={CONFIG.STRINGS.unsavedSwitch}
                confirmLabel="Save & switch"
                secondaryLabel="Discard"
                onConfirm={confirmSwitchSave}
                onSecondary={confirmSwitchDiscard}
                cancelLabel="Cancel"
            />
        </div>
    );
};
