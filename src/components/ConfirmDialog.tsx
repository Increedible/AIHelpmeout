import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';

export const ConfirmDialog: React.FC<{
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    secondaryLabel?: string;
    onConfirm: () => void;
    onSecondary?: () => void;
    onOpenChange: (x: boolean) => void;
}> = ({
    open,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    secondaryLabel,
    onConfirm,
    onSecondary,
    onOpenChange
}) => (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
            <Dialog.Content
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] max-w-[92vw] rounded-xl2 border p-5 shadow-soft"
                style={{ background: 'var(--brand-panel)', borderColor: 'var(--brand-border)', color: 'var(--brand-text)' }}
            >
                <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
                {description && <Dialog.Description className="mt-2 text-brand-muted">{description}</Dialog.Description>}
                <div className="mt-5 flex justify-end gap-2">
                    <Dialog.Close asChild>
                        <button className="btn">{cancelLabel}</button>
                    </Dialog.Close>
                    {secondaryLabel && onSecondary && (
                        <button className="btn" onClick={onSecondary}>{secondaryLabel}</button>
                    )}
                    <button className="btn btn-primary" onClick={onConfirm}>{confirmLabel}</button>
                </div>
            </Dialog.Content>
        </Dialog.Portal>
    </Dialog.Root>
);
