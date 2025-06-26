import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownViewerProps {
  filePath: string;
}

const MarkdownViewer = ({ filePath }: MarkdownViewerProps) => {
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    fetch(filePath)
      .then((response) => response.text())
      .then((text) => setMarkdown(text));
  }, [filePath]);

  return (
    <div className="w-full max-w-[80vw] max-h-[80vh] overflow-y-auto bg-black p-6 rounded-lg border border-gray-600 font-cascadia text-sm">
      <style dangerouslySetInnerHTML={{
        __html: `
          .markdown-content h1 {
            font-size: 2.25rem !important;
            font-weight: bold !important;
            margin-bottom: 1.5rem !important;
            margin-top: 1.5rem !important;
            color: white !important;
          }
          .markdown-content h2 {
            font-size: 1.875rem !important;
            font-weight: 600 !important;
            margin-bottom: 1rem !important;
            margin-top: 1.5rem !important;
            color: white !important;
          }
          .markdown-content h3 {
            font-size: 1.5rem !important;
            font-weight: 500 !important;
            margin-bottom: 0.75rem !important;
            margin-top: 1rem !important;
            color: white !important;
          }
          .markdown-content ul {
            list-style-type: disc !important;
            padding-left: 1.5rem !important;
            margin: 1rem 0 !important;
          }
          .markdown-content li {
            display: list-item !important;
            margin-bottom: 0.5rem !important;
          }
          .markdown-content ol {
            list-style-type: decimal !important;
            padding-left: 1.5rem !important;
            margin: 1rem 0 !important;
          }
          .markdown-content p {
            margin-bottom: 1rem !important;
            color: #d1d5db !important;
          }
          .markdown-content hr {
            margin: 1.5rem 0 !important;
            border-color: #4b5563 !important;
          }
        `
      }} />
      <div className="markdown-content prose prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
};

export default MarkdownViewer;
