import React, { useEffect, useMemo, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { convertStyleObject } from './utils/styleConverter';
import type { StyleableElement, AppStyles } from './styleStore';

// --- State and Communication Hook ---
const usePreviewState = () => {
  const [markdown, setMarkdown] = useState('');
  const [styles, setStyles] = useState<AppStyles | null>(null);
  const [isInspecting, setInspecting] = useState(false);
  const [isVwMode, setVwMode] = useState(false);
  const [designWidth, setDesignWidth] = useState(375);

  const isSyncing = useRef(false);

  useEffect(() => {
    const handleParentMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;

      if (type === 'update-state') {
        setMarkdown(payload.markdown);
        setStyles(payload.styles);
        setInspecting(payload.isInspecting);
        setVwMode(payload.isVwMode);
        setDesignWidth(payload.designWidth);
      } else if (type === 'editor-scroll') {
        if (isSyncing.current) return;
        isSyncing.current = true;
        const scrollable = document.documentElement;
        const syncFactor = 1.1; // Tweak this factor to adjust scroll feel
        const curvedRatio = Math.pow(payload, syncFactor);
        const { scrollHeight, clientHeight } = scrollable;
        scrollable.scrollTop = curvedRatio * (scrollHeight - clientHeight);
        setTimeout(() => { isSyncing.current = false; }, 100);
      }
    };

    window.addEventListener('message', handleParentMessage);
    window.parent.postMessage({ type: 'preview-ready' }, '*');

    return () => window.removeEventListener('message', handleParentMessage);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('inspect-mode-active', isInspecting);
  }, [isInspecting]);

  useEffect(() => {
    const handleInspectClick = (e: MouseEvent) => {
      if (!isInspecting) return;
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

    document.addEventListener('click', handleInspectClick, true);
    return () => document.removeEventListener('click', handleInspectClick, true);
  }, [isInspecting]);

  useEffect(() => {
    const handlePreviewScroll = () => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const scrollRatio = scrollTop / (scrollHeight - clientHeight);
      window.parent.postMessage({ type: 'preview-scroll', payload: scrollRatio }, '*');
      setTimeout(() => { isSyncing.current = false; }, 100);
    };

    document.addEventListener('scroll', handlePreviewScroll);
    return () => document.removeEventListener('scroll', handlePreviewScroll);
  }, []);

  return { markdown, styles, isVwMode, designWidth };
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

// --- The Preview Component ---
const Preview = () => {
  const { markdown, styles, isVwMode, designWidth } = usePreviewState();

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
      ul: createStyledComponent('ul', 'ul'),
      li: createStyledComponent('li', 'li'),
      th: createStyledComponent('th', 'th'),
      td: createStyledComponent('td', 'td'),
      table: ({ node, ...props }) => (
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table data-style-key="table" {...props} />
        </div>
      ),
      img: ({ node, src, alt, ...props }) => (
        <img data-style-key="img" src={src} alt={alt} {...props} />
      ),
    };
  }, []);

  const generatedCss = useMemo(() => {
    if (!styles) return '';

    const processedStyles = isVwMode
      ? Object.entries(styles).reduce((acc, [key, styleObject]) => {
          acc[key as StyleableElement] = convertStyleObject(styleObject, designWidth);
          return acc;
        }, {} as AppStyles)
      : styles;

    return Object.entries(processedStyles)
      .map(([key, styleObject]) => {
        const selector = 
          key === 'global' ? '.markdown-wrapper' : 
          key === 'previewPane' ? 'body' : 
          `[data-style-key="${key}"]`;
        
        const rules = Object.entries(styleObject)
          .map(([prop, value]) => `${prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${value};`)
          .join(' ');

        return `${selector} { ${rules} }`;
      })
      .join('\n');
  }, [styles, isVwMode, designWidth]);

  return (
    <>
      <style>{inspectorStyles}</style>
      <style>{generatedCss}</style>
      <div className="markdown-wrapper" data-style-key="global">
        <ReactMarkdown 
          components={markdownComponents} 
          remarkPlugins={[remarkGfm]} 
          rehypePlugins={[rehypeRaw]}
          urlTransform={(src) => src}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </>
  );
};

export default Preview;
