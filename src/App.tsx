import React from 'react';
import { ResizableLayout } from './components/ResizableLayout';
import { EditorPane } from './components/EditorPane';
import { ChatPane } from './components/ChatPane';
import { useStore } from './lib/state';
import { CONFIG } from './lib/config';

export default function App() {
  const s = useStore();

  React.useEffect(() => {
    // apply theme on first mount
    s.setTheme(s.theme);
  }, []);

  return (
    <div className="h-full p-3">
      <ResizableLayout
        left={
          <EditorPane
            onPrompt={() => {/* handled by ChatPane footer */}}
            canPrompt={true} prompting={s.isPrompting} cancelPrompt={() => s.setPrompting(false)}
          />
        }
        right={<ChatPane/>}
      />
    </div>
  );
}
