import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useStore } from '@/lib/state';
import { CONFIG } from '@/lib/config';

// Docs: react-resizable-panels supports mouse/touch/keyboard resizing. 
export const ResizableLayout: React.FC<{
  left: React.ReactNode;
  right: React.ReactNode;
}> = ({ left, right }) => {
  const leftPercent = useStore(s => s.leftPercent);
  const setLeftPercent = useStore(s => s.setLeftPercent);

  return (
    <PanelGroup
      direction="horizontal"
      onLayout={arr => setLeftPercent(arr[0] ?? leftPercent)}
    >
      <Panel minSize={CONFIG.MIN_PANEL_PERCENT} defaultSize={leftPercent}>
        <div className="panel h-full">{left}</div>
      </Panel>
      <PanelResizeHandle className="w-1 bg-brand-border mx-1 rounded" />
      <Panel minSize={CONFIG.MIN_PANEL_PERCENT}>
        <div className="panel h-full">{right}</div>
      </Panel>
    </PanelGroup>
  );
};
