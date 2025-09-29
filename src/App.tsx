import React from 'react';
import { ResizableLayout } from './components/ResizableLayout';
import { EditorPane } from './components/EditorPane';
import { ChatPane } from './components/ChatPane';
import { useStore } from './lib/state';

export default function App() {
  const s = useStore();

  // ensure the correct theme class is on <html> at mount
  React.useEffect(() => {
    s.setTheme(s.theme);
  }, []);

  return (
    <div className="h-full p-3">
      <ResizableLayout left={<EditorPane />} right={<ChatPane />} />
    </div>
  );
}
