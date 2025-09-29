import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

// Generic icon button with tooltip (same look everywhere)
export const IconButton: React.FC<{
  title: string;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ title, disabled, onClick, className, children }) => (
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          className={`btn btn-ghost ${className ?? ''}`}
          disabled={disabled}
          onClick={onClick}
          aria-label={title}
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="radix-tooltip" sideOffset={6}>
          {title}
          <Tooltip.Arrow className="fill-[var(--brand-panel)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
);
