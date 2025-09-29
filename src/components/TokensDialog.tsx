import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Eye, EyeOff } from 'lucide-react';
import { useStore } from '@/lib/state';

export const TokensDialog: React.FC<{ open: boolean; onOpenChange: (x: boolean) => void; }> = ({ open, onOpenChange }) => {
  const tokens = useStore(s => s.tokens);
  const setTokens = useStore(s => s.setTokens);
  const [show, setShow] = React.useState(false);
  const [local, setLocal] = React.useState(tokens);

  React.useEffect(() => setLocal(tokens), [tokens]);

  const Input: React.FC<{ label: string; name: 'openai' | 'gemini' | 'anthropic' }> = ({ label, name }) => (
    <div className="flex items-center gap-2">
      <label className="w-28 text-brand-muted">{label}</label>
      <input
        className="flex-1 rounded-xl2 border px-3 py-2"
        style={{ background: 'var(--brand-bg)', borderColor: 'var(--brand-border)', color: 'var(--brand-text)' }}
        placeholder={`Paste ${label} API key`}
        type={show ? 'text' : 'password'}
        value={(local as any)[name] ?? ''}
        onChange={e => setLocal(prev => ({ ...prev, [name]: e.target.value }))}
      />
    </div>
  );

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(x) => {
        // if closing without hitting Save, reset local edits
        if (!x) setLocal(tokens);
        onOpenChange(x);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] max-w-[96vw] rounded-xl2 border p-6 shadow-soft"
          style={{ background: 'var(--brand-panel)', borderColor: 'var(--brand-border)', color: 'var(--brand-text)' }}
        >
          <Dialog.Title className="text-lg font-semibold">Tokens</Dialog.Title>
          <Dialog.Description className="mt-1 text-brand-muted">
            Your keys are stored <b>locally only</b>, and sent directly to providers from your browser.
          </Dialog.Description>

          <div className="mt-5 space-y-3">
            <Input label="OpenAI" name="openai" />
            <Input label="Gemini" name="gemini" />
            <Input label="Claude" name="anthropic" />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button className="btn btn-ghost" onClick={() => setShow(s => !s)}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
              {show ? 'Hide' : 'Show'} keys
            </button>
            <div className="flex gap-2">
              <Dialog.Close asChild><button className="btn">Cancel</button></Dialog.Close>
              <Dialog.Close asChild>
                <button className="btn btn-primary" onClick={() => setTokens(local)}>Save</button>
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
