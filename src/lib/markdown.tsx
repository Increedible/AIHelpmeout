import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
// Pattern documented by react-markdown/rehype-highlight discussions. 

export const Markdown: React.FC<{children: string}> = ({ children }) => (
  <div className="markdown">
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
      {children}
    </ReactMarkdown>
  </div>
);
