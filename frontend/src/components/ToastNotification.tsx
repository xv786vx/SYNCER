import React, { useState, useEffect, useRef } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  isFading: boolean;
}

export const ToastNotification: React.FC<ToastProps> = ({ message, onClose, isFading }) => {
  const [expanded, setExpanded] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [expandedMaxHeight, setExpandedMaxHeight] = useState(0);

  // Check if text is overflowing on mount and when message changes
  useEffect(() => {
    if (textRef.current) {
      setIsOverflowing(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
  }, [message]);

  // Calculate the expanded height once on mount
  useEffect(() => {
    if (textRef.current && containerRef.current) {
      // Clone the text element to measure its full height when expanded
      const clone = textRef.current.cloneNode(true) as HTMLDivElement;
      
      // Set up the clone with expanded styling
      clone.style.position = 'absolute';
      clone.style.visibility = 'hidden';
      clone.style.height = 'auto';
      clone.style.width = `${textRef.current.clientWidth}px`;
      clone.style.whiteSpace = 'normal';
      clone.style.padding = '8px';
      
      // Add to DOM, measure, then remove
      document.body.appendChild(clone);
      const calculatedHeight = clone.scrollHeight + 16; // Add padding
      setExpandedMaxHeight(calculatedHeight);
      document.body.removeChild(clone);
    }
  }, [message, isOverflowing]);

  return (
    <div
      ref={containerRef}
      className={`absolute bottom-3 right-3 rounded shadow-lg z-[100] ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        maxWidth: '60%',
        width: '200px',
        background: 'rgba(21, 128, 61, 0.8)',
        cursor: 'pointer',
        transition: 'all 0.3s ease-in-out',
        maxHeight: expanded ? `${expandedMaxHeight}px` : '28px',
        padding: expanded ? '8px' : '0 8px',
        overflow: 'hidden',
      }}
      onMouseEnter={() => isOverflowing && setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onClick={onClose}
    >
      <div
        ref={textRef}
        style={{
          width: '100%',
          color: 'white',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: expanded ? 'flex-start' : 'center',
          justifyContent: expanded ? 'flex-end' : 'center',
          whiteSpace: expanded ? 'normal' : 'nowrap',
          overflow: 'hidden',
          textOverflow: expanded ? 'clip' : 'ellipsis',
          textAlign: expanded ? 'right' : 'center',
          transition: 'all 0.3s ease-in-out',
        }}
      >
        {message}
      </div>
    </div>
  );
};
