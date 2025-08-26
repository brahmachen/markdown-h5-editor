import React, { useEffect, useMemo, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStyleStore } from './styleStore';
import type { StyleableElement } from './styleStore';

// This hook encapsulates the communication logic for the preview iframe
const usePreviewComms = (setMarkdown: (md: string) => void) => {
  const isSyncing = useRef(false);

  useEffect(() => {
    // --- Handles messages from the parent window ---
    const handleParentMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'toggle-inspect':
          document.body.style.cursor = payload ? 'crosshair' : 'default';
          break;
        case 'update-markdown':
          setMarkdown(payload);
          break;
        case 'editor-scroll': {
          if (isSyncing.current) return;
          isSyncing.current = true;
          const scrollable = document.documentElement;
          const { scrollHeight, clientHeight } = scrollable;
          scrollable.scrollTop = payload * (scrollHeight - clientHeight);
          setTimeout(() => { isSyncing.current = false; }, 100);
          break;
        }
      }
    };

    // --- Handles clicks within the iframe for inspection ---
    const handleInspectClick = (e: MouseEvent) => {
      if (document.body.style.cursor !== 'crosshair') return;
      e.preventDefault();
      e.stopPropagation();
      let target = e.target as HTMLElement;
      while (target && !target.dataset.styleKey) {
        target = target.parentElement as HTMLElement;
      }
      if (target) {
        const key = target.dataset.styleKey;
        window.parent.postMessage({ type: 'element-selected', payload: key }, '*');
      }
    };

    // --- Handles scrolling within the iframe ---
    const handlePreviewScroll = () => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const scrollRatio = scrollTop / (scrollHeight - clientHeight);
      window.parent.postMessage({ type: 'preview-scroll', payload: scrollRatio }, '*');
      setTimeout(() => { isSyncing.current = false; }, 100);
    };

    window.addEventListener('message', handleParentMessage);
    document.addEventListener('click', handleInspectClick, true);
    document.addEventListener('scroll', handlePreviewScroll);

    // Let the parent know the preview page is ready
    window.parent.postMessage({ type: 'preview-ready' }, '*');

    return () => {
      window.removeEventListener('message', handleParentMessage);
      document.removeEventListener('click', handleInspectClick, true);
      document.removeEventListener('scroll', handlePreviewScroll);
    };
  }, [setMarkdown]);
};

// The Preview Component to be rendered in the iframe
const Preview = () => {
  const { styles, isInspecting } = useStyleStore();
  const [markdown, setMarkdown] = useState('');
  usePreviewComms(setMarkdown);

  const markdownComponents = useMemo(() => {
    const createStyledComponent = (tag: keyof JSX.IntrinsicElements, styleKey: StyleableElement) => {
      return ({ node, ...props }: any) => {
        const Component = tag as any;
        return <Component data-style-key={styleKey} {...props} />;
      };
    };

    return {
      h1: createStyledComponent('h1', 'h1'),
      h2: createStyledComponent('h2', 'h2'),
      h3: createStyledComponent('h3', 'h3'),
      p: createStyledComponent('p', 'p'),
      a: createStyledComponent('a', 'a'),
      blockquote: createStyledComponent('blockquote', 'blockquote'),
      code: createStyledComponent('code', 'code'),
      pre: createStyledComponent('pre', 'pre'),
      strong: createStyledComponent('strong', 'strong'),
    };
  }, []);

  // Create a <style> tag content from the styles state
  const generatedCss = useMemo(() => {
    return Object.entries(styles)
      .map(([key, styleObject]) => {
        const selector = 
          key === 'global' ? '.markdown-wrapper' : 
          key === 'previewPane' ? 'body' : 
          key;
        
        const rules = Object.entries(styleObject)
          .map(([prop, value]) => `${prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${value};`)
          .join(' ');

        return `${selector} { ${rules} }`;
      })
      .join('\n');
  }, [styles]);

  return (
    <>
      <style>{generatedCss}</style>
      <div 
        className={`markdown-wrapper ${isInspecting ? 'inspectable' : ''}`}
        data-style-key="global"
      >
        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
          {markdown}
        </ReactMarkdown>
      </div>
    </>
  );
};

export default Preview;
