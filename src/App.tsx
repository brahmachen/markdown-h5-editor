import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMde from 'react-mde';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button, Upload, Space, Switch, Tooltip, message } from 'antd';
import { UploadOutlined, DownloadOutlined, AimOutlined, FileTextOutlined, SaveOutlined } from '@ant-design/icons';
import mammoth from 'mammoth';
import * as csstree from 'css-tree';
import { useStyleStore } from './styleStore';
import type { StyleableElement, AppStyles } from './styleStore';

import 'react-mde/lib/styles/css/react-mde-all.css';
import './App.css';

// --- Data Structure for Project File ---
interface ProjectFile {
  version: string;
  markdownContent: string;
  theme: {
    styles: AppStyles;
  };
}

// --- CSS to JS Object Utilities ---
const toCssString = (styleObject: React.CSSProperties): string => {
  return Object.entries(styleObject)
    .map(([prop, value]) => `${prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${value};`)
    .join('\n');
};

const toReactStyleObject = (cssString: string): React.CSSProperties => {
  const style: React.CSSProperties = {};
  try {
    const ast = csstree.parse(cssString, { context: 'declarationList' });
    csstree.walk(ast, (node) => {
      if (node.type === 'Declaration') {
        const prop = node.property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        const value = csstree.generate(node.value);
        // @ts-ignore
        style[prop] = value.trim();
      }
    });
  } catch (error) {
    // Don't log errors for incomplete CSS as user is typing
  }
  return style;
};

// --- Style Editor Panel ---
const StyleEditorPanel = () => {
  const { styles, selectedElement, setStyle } = useStyleStore();
  const [localCssText, setLocalCssText] = useState('');

  useEffect(() => {
    if (styles[selectedElement]) {
      setLocalCssText(toCssString(styles[selectedElement]));
    }
  }, [selectedElement]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalCssText(e.target.value);
  };

  const handleBlur = () => {
    const newStyleObject = toReactStyleObject(localCssText);
    setStyle(selectedElement, newStyleObject);
  };

  return (
    <div className="style-pane">
      <div className="style-pane-header">
        <h3>Editing: <span>{selectedElement}</span></h3>
      </div>
      <textarea 
        className="css-editor" 
        value={localCssText} 
        onChange={handleTextChange} 
        onBlur={handleBlur} 
      />
    </div>
  );
};

// --- Main App Component ---
function App() {
  const [markdown, setMarkdown] = useState('# Welcome!\n\nThis is the final, stable version of the editor. Editing should now work as expected.');
  const [selectedTab, setSelectedTab] = useState<'write' | 'preview'>('write');
  const { styles, setStyles, isInspecting, setInspecting, setSelectedElement } = useStyleStore();

  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  // This useEffect is for scroll syncing.
  useEffect(() => {
    const editorTextArea = editorRef.current?.querySelector('.mde-textarea-wrapper textarea');
    const previewDiv = previewRef.current;
    if (!editorTextArea || !previewDiv) return;

    const handleScroll = (source: Element, target: Element) => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      const { scrollTop, scrollHeight, clientHeight } = source;
      const scrollRatio = scrollTop / (scrollHeight - clientHeight);
      target.scrollTop = scrollRatio * (target.scrollHeight - target.clientHeight);
      setTimeout(() => { isSyncing.current = false; }, 50);
    };

    const handleEditorScroll = () => handleScroll(editorTextArea, previewDiv);
    const handlePreviewScroll = () => handleScroll(previewDiv, editorTextArea);

    editorTextArea.addEventListener('scroll', handleEditorScroll);
    previewDiv.addEventListener('scroll', handlePreviewScroll);

    return () => {
      editorTextArea.removeEventListener('scroll', handleEditorScroll);
      previewDiv.removeEventListener('scroll', handlePreviewScroll);
    };
  }, [markdown]); // Dependency on markdown ensures re-binding if editor re-renders.


  // --- File Handlers ---
  const handleWordImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result;
        if (!arrayBuffer) return;
        const result = await mammoth.convertToMarkdown({ arrayBuffer: arrayBuffer as ArrayBuffer });
        setMarkdown(result.value);
        message.success('Word document imported successfully!');
      } catch (error) { 
        console.error('Error converting Word document:', error);
        message.error('Failed to import Word document.');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleProjectImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const project: ProjectFile = JSON.parse(e.target?.result as string);
        if (project.version && project.markdownContent && project.theme.styles) {
          setMarkdown(project.markdownContent);
          setStyles(project.theme.styles);
          message.success(`Project file imported successfully!`);
        } else {
          message.error('Invalid project file format.');
        }
      } catch (error) { 
        console.error('Error parsing project file:', error);
        message.error('Failed to parse project file.');
      }
    };
    reader.readAsText(file);
    return false;
  };

  const handleProjectExport = () => {
    const project: ProjectFile = {
      version: '1.2.0',
      markdownContent: markdown,
      theme: {
        styles: styles,
      }
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'markdown-project.json';
    link.click();
    URL.revokeObjectURL(link.href);
    message.success('Project exported!');
  };

  const createClickHandler = (e: React.MouseEvent, styleKey: StyleableElement) => {
    if (isInspecting) {
      e.preventDefault();
      e.stopPropagation();
      setSelectedElement(styleKey);
    }
  };

  const markdownComponents = useMemo(() => {
    const createStyledComponent = (tag: keyof JSX.IntrinsicElements, styleKey: StyleableElement) => {
      return ({ ...props }) => {
        const FinalComponent = tag as any;
        return <FinalComponent style={styles[styleKey]} onClick={(e: React.MouseEvent) => createClickHandler(e, styleKey)} className={isInspecting ? 'inspectable' : ''} {...props} />;
      };
    };
    return { h1: createStyledComponent('h1', 'h1'), h2: createStyledComponent('h2', 'h2'), h3: createStyledComponent('h3', 'h3'), p: createStyledComponent('p', 'p'), a: createStyledComponent('a', 'a'), blockquote: createStyledComponent('blockquote', 'blockquote'), code: createStyledComponent('code', 'code'), pre: createStyledComponent('pre', 'pre'), strong: createStyledComponent('strong', 'strong'), };
  }, [styles, isInspecting, setSelectedElement]);

  return (
    <div className="app-container">
      <StyleEditorPanel />
      <div className="editor-pane" ref={editorRef}>
        <div className="toolbar">
          <Space>
            <Upload accept=".docx" showUploadList={false} beforeUpload={handleWordImport}>
              <Button icon={<FileTextOutlined />}>Import Word</Button>
            </Upload>
            <Upload accept=".json" showUploadList={false} beforeUpload={handleProjectImport}>
              <Button icon={<UploadOutlined />}>Import Project</Button>
            </Upload>
            <Button icon={<SaveOutlined />} onClick={handleProjectExport}>Export Project</Button>
            <Tooltip title={isInspecting ? 'Turn Off' : 'Turn On Inspect Mode'}>
              <Switch checked={isInspecting} onChange={setInspecting} checkedChildren={<AimOutlined />} unCheckedChildren={<AimOutlined />} />
            </Tooltip>
          </Space>
        </div>
        <ReactMde value={markdown} onChange={setMarkdown} selectedTab={selectedTab} onTabChange={setSelectedTab} generateMarkdownPreview={(md) => Promise.resolve(<ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>)} />
      </div>
      <div ref={previewRef} className={`preview-pane ${isInspecting ? 'inspectable' : ''}`} style={styles.previewPane} onClick={(e) => createClickHandler(e, 'previewPane')}>
        <div className={`markdown-wrapper ${isInspecting ? 'inspectable' : ''}`} style={styles.global} onClick={(e) => createClickHandler(e, 'global')}>
          <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export default App;
