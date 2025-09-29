import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useStore } from '@/lib/state';
import { LANGUAGE_OPTIONS, languageLabelFromId } from '@/lib/languages';
import { CONFIG } from '@/lib/config';
import { IconButton } from './IconButton';
import { ConfirmDialog } from './ConfirmDialog';
import { Undo2, Redo2, RotateCcw, Save, MessageSquare, Moon, Sun } from 'lucide-react';
import { isSameText } from '@/lib/utils';

export const EditorPane: React.FC<{ onPrompt: () => void; canPrompt: boolean; prompting: boolean; cancelPrompt: () => void; }> = ({ onPrompt, canPrompt, prompting, cancelPrompt }) => {
  const theme = useStore(s => s.theme);
  const setTheme = useStore(s => s.setTheme);
  const language = useStore(s => s.language);
  const setLanguage = useStore(s => s.setLanguage);
  const st = useStore();

  const codeState = st.code[language]!;
  const hasUnsaved = !isSameText(codeState.currentCode, codeState.savedCode);
  const canSave = hasUnsaved; // greyed if no change vs lastSaved
  const matchesDefault = isSameText(codeState.currentCode, codeState.defaultCode);

  const [showRevert, setShowRevert] = React.useState(false);
  const [pendingLanguage, setPendingLanguage] = React.useState<string|undefined>(undefined);
  const [editor, setEditor] = React.useState<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null);

  const onMount: OnMount = (ed, monaco) => {
    setEditor(ed);
  };

  // Language change with unsaved guard
  const requestLanguageChange = (id: string) => {
    if (hasUnsaved) {
      setPendingLanguage(id);
    } else {
      setLanguage(id);
    }
  };

  const confirmSwitch = (save: boolean) => {
    if (!pendingLanguage) return;
    if (save) st.save();
    setLanguage(pendingLanguage);
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

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <div className="h-full flex flex-col">
      {/* top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--brand-border)' }}>
        <div className="flex items-center gap-2">
          <IconButton title={`Switch to ${theme==='dark'?'light':'dark'} mode`} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
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

          {/* Undo / Redo */}
          <IconButton title="Undo" onClick={() => editor?.trigger('source', 'undo', null)}><Undo2 size={18}/></IconButton>
          <IconButton title="Redo" onClick={() => editor?.trigger('source', 'redo', null)}><Redo2 size={18}/></IconButton>

          {/* Revert to default */}
          <IconButton title="Revert to default (does not save)" onClick={() => setShowRevert(true)}><RotateCcw size={18}/></IconButton>

          {/* Save */}
          <IconButton title={canSave ? 'Save' : 'No changes to save'} onClick={handleSave} >
            <Save size={18} className={canSave ? '' : 'opacity-50'}/>
          </IconButton>

          {/* Prompt */}
          {!prompting ? (
            <button
              className="btn"
              disabled={!canPrompt}
              title={canPrompt ? 'Save & prompt' : 'Code equals default; nothing to prompt'}
              onClick={() => { if (canPrompt) onPrompt(); }}
            >
              <MessageSquare size={18}/> Prompt
            </button>
          ) : (
            <button className="btn btn-danger" onClick={cancelPrompt} title="Cancel prompt">
              <MessageSquare size={18}/> Cancel prompt
            </button>
          )}
        </div>
      </div>

      {/* editor */}
      <div className="monaco-wrapper">
        <Editor
          height="100%"
          language={language}
          value={codeState.currentCode}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}  /* Monaco themes */
          onMount={onMount}
          onChange={(v) => st.updateCurrent(v ?? '')}
          options={{
            automaticLayout: true,
            fontSize: 14,
            wordWrap: 'on',
            minimap: { enabled: false },
          }}
        />
      </div>

      {/* Revert dialog */}
      <ConfirmDialog
        open={showRevert}
        onOpenChange={setShowRevert}
        title="Revert to default?"
        description="This will replace your current editor contents with the language’s default code. It will not change your last saved version."
        confirmLabel="Revert"
        onConfirm={handleRevert}
      />

      {/* Unsaved switch dialog */}
      <ConfirmDialog
        open={!!pendingLanguage}
        onOpenChange={(x) => !x && setPendingLanguage(undefined)}
        title="Unsaved changes"
        description="Save your edits before switching languages?"
        confirmLabel="Save & switch"
        onConfirm={() => confirmSwitch(true)}
      />
      <ConfirmDialog
        open={!!pendingLanguage}
        onOpenChange={(x) => !x && setPendingLanguage(undefined)}
        title=""
        description=""
        confirmLabel="Discard"
        onConfirm={() => confirmSwitch(false)}
      />
    </div>
  );
};
