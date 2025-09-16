import React, { useEffect, useMemo, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useStyleStore } from './styleStore';
import { convertStyleObject } from './utils/styleConverter';
import type { StyleableElement, AppStyles } from './styleStore';

// This hook encapsulates the communication logic for the preview iframe
const usePreviewComms = (
  setMarkdown: (md: string) => void,
  setStyles: (styles: AppStyles) => void
) => {
  const isSyncing = useRef(false);

  useEffect(() => {
    // --- Handles messages from the parent window ---
    const handleParentMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'toggle-inspect':
          document.body.classList.toggle('inspect-mode-active', payload);
          break;
        case 'update-markdown':
          setMarkdown(payload);
          break;
        case 'update-styles':
          setStyles(payload);
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
      if (!document.body.classList.contains('inspect-mode-active')) return;
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
  }, [setMarkdown, setStyles]);
};

const inspectorStyles = `
  .inspect-mode-active [data-style-key] {
    cursor: crosshair;
    outline: 1px dashed rgba(0, 123, 255, 0.5);
    transition: outline-color 0.2s, background-color 0.2s;
  }
  .inspect-mode-active [data-style-key]:hover {
    background-color: rgba(0, 123, 255, 0.1);
    outline: 2px solid rgba(0, 123, 255, 1);
  }
`;

// The Preview Component to be rendered in the iframe
const Preview = () => {
  // Initialize state from the store once, then update via messages.
  const [markdown, setMarkdown] = useState(useStyleStore.getState().markdown);
  const [styles, setStyles] = useState(useStyleStore.getState().styles);
  usePreviewComms(setMarkdown, setStyles);

  const markdownComponents = useMemo(() => {
    const createStyledComponent = (tag: keyof JSX.IntrinsicElements, styleKey: StyleableElement) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return ({ node, ...props }: React.ComponentProps<typeof tag>) => {
        const Component = tag;
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
      ol: createStyledComponent('ol', 'ol'),
      li: createStyledComponent('li', 'li'),
    };
  }, []);

  // Create a <style> tag content from the styles state
  const generatedCss = useMemo(() => {
    if (!styles) return '';

    // Convert all px values in the styles object to vw units before generating the CSS string.
    const convertedStyles = Object.entries(styles).reduce((acc, [key, styleObject]) => {
      acc[key as StyleableElement] = convertStyleObject(styleObject);
      return acc;
    }, {} as AppStyles);

    return Object.entries(convertedStyles)
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
      <style>{inspectorStyles}</style>
      <style>{generatedCss}</style>
      <div 
        className="markdown-wrapper" // No longer need to toggle class here
        data-style-key="global"
      >
        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {markdown}
        </ReactMarkdown>
      </div>
    </>
  );
};


export default Preview;
