import MarkdownViewer from '../components/MarkdownViewer';
import { useEffect } from 'react';

function PrivacyPolicy() {
  // Prevent body from scrolling when this page is mounted
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, []);

  return (
    <div className="flex-1 w-full h-full text-white flex flex-col items-center relative">
      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center w-full p-6">
        <h1 className="text-4xl font-bold mb-4 font-cascadia">Privacy Policy</h1>
        <div className="flex-1 w-full max-w-4xl bg-black bg-opacity-80 rounded-lg p-8 overflow-auto mb-6 flex flex-col" style={{minHeight: 0, maxHeight: 'calc(100vh - 200px)'}}>
          <div className="flex-1 min-h-0 flex flex-col">
            <MarkdownViewer filePath="/PRIVACY_POLICY.md" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
