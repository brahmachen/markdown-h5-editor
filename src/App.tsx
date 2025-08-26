import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMde from 'react-mde';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button, Upload, Space, Switch, Tooltip, message } from 'antd';
import { UploadOutlined, AimOutlined, FileTextOutlined, SaveOutlined } from '@ant-design/icons';
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
  }, [selectedElement, styles]);

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
  const [selectedTab, setSelectedTab] = useState<'write' | 'preview'>('write');
  const {
    markdown,
    setMarkdown,
    styles,
    setStyles,
    isInspecting,
    setInspecting,
    setSelectedElement,
  } = useStyleStore();

  const editorRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPreviewReady, setPreviewReady] = useState(false);
  const isSyncing = useRef(false);

  // --- PostMessage Communication with iFrame ---
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;

      const { type, payload } = event.data;

      switch (type) {
        case 'preview-ready':
          setPreviewReady(true);
          break;
        case 'element-selected':
          setSelectedElement(payload);
          break;
        case 'preview-scroll': {
          if (isSyncing.current) return;
          isSyncing.current = true;
          const editorTextArea = editorRef.current?.querySelector('.mde-textarea-wrapper textarea');
          if (editorTextArea) {
            const { scrollHeight, clientHeight } = editorTextArea;
            editorTextArea.scrollTop = payload * (scrollHeight - clientHeight);
          }
          setTimeout(() => { isSyncing.current = false; }, 100);
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [setSelectedElement]);

  // --- Scroll Sync from Editor to Preview ---
  useEffect(() => {
    const editorTextArea = editorRef.current?.querySelector('.mde-textarea-wrapper textarea');
    if (!editorTextArea || !isPreviewReady) return;

    const handleEditorScroll = () => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      const { scrollTop, scrollHeight, clientHeight } = editorTextArea;
      const scrollRatio = scrollTop / (scrollHeight - clientHeight);

      iframeRef.current?.contentWindow?.postMessage(
        { type: 'editor-scroll', payload: scrollRatio },
        '*'
      );
      setTimeout(() => { isSyncing.current = false; }, 100);
    };

    editorTextArea.addEventListener('scroll', handleEditorScroll);
    return () => {
      editorTextArea.removeEventListener('scroll', handleEditorScroll);
    };
  }, [isPreviewReady]);

  // Sync inspecting state to iframe
  useEffect(() => {
    if (isPreviewReady && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'toggle-inspect', payload: isInspecting },
        '*'
      );
    }
  }, [isInspecting, isPreviewReady]);

  // Sync markdown content to iframe
  useEffect(() => {
    if (isPreviewReady && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'update-markdown', payload: markdown },
        '*'
      );
    }
  }, [markdown, isPreviewReady]);

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
      },
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'markdown-project.json';
    link.click();
    URL.revokeObjectURL(link.href);
    message.success('Project exported!');
  };

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
              <Switch 
                checked={isInspecting} 
                onChange={setInspecting} 
                checkedChildren={<AimOutlined />}
                unCheckedChildren={<AimOutlined />}
              />
            </Tooltip>
          </Space>
        </div>
        <ReactMde 
          value={markdown} 
          onChange={setMarkdown} 
          selectedTab={selectedTab} 
          onTabChange={setSelectedTab} 
          generateMarkdownPreview={(md) => 
            Promise.resolve(<ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>)
          }
        />
      </div>
      <div className="preview-pane-wrapper">
        <iframe 
          ref={iframeRef} 
          src="/preview" 
          title="H5 Preview" 
          className="preview-iframe"
        />
      </div>
    </div>
  );
}

export default App;
