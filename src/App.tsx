import React, { useState, useRef, useEffect } from 'react';
import ReactDOMServer from 'react-dom/server';
import ReactMde from 'react-mde';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Button, Upload, Space, Switch, Tooltip, message, Dropdown } from 'antd';
import { UploadOutlined, AimOutlined, FileTextOutlined, SaveOutlined, DownloadOutlined } from '@ant-design/icons';
import mammoth from 'mammoth';
import * as csstree from 'css-tree';
import * as yaml from 'js-yaml';
import { useStyleStore } from './styleStore';
import type { AppStyles } from './styleStore';

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
        // @ts-expect-error - csstree types are not perfectly aligned with React.CSSProperties
        style[prop] = value.trim();
      }
    });
  } catch {
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

  // Sync styles to iframe
  useEffect(() => {
    if (isPreviewReady && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'update-styles', payload: styles },
        '*'
      );
    }
  }, [styles, isPreviewReady]);

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

  const handleMarkdownExport = () => {
    try {
      const yamlString = yaml.dump(styles);
      const fullContent = `---
${yamlString}---

${markdown}`;
      const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'project.md';
      link.click();
      URL.revokeObjectURL(link.href);
      message.success('Markdown file exported!');
    } catch (error) {
      console.error('Error exporting Markdown file:', error);
      message.error('Failed to export Markdown file.');
    }
  };
  
  const handleHtmlExport = () => {
    try {
      const content = generateFullHtml(markdown, styles);
      const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'export.html';
      link.click();
      URL.revokeObjectURL(link.href);
      message.success('HTML file exported!');
    } catch (error) {
      console.error('Error exporting HTML file:', error);
      message.error('Failed to export HTML file.');
    }
  };

  const handleMarkdownImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)/);

        if (match) {
          const yamlString = match[1];
          const mdContent = match[2] || '';
          const loadedStyles = yaml.load(yamlString) as AppStyles;
          
          // Basic validation
          if (typeof loadedStyles === 'object' && loadedStyles !== null) {
            setStyles(loadedStyles);
            setMarkdown(mdContent);
            message.success('Markdown file imported successfully!');
          } else {
            throw new Error('Invalid YAML content in file.');
          }
        } else {
          // If no front matter, treat the whole file as markdown
          setMarkdown(content);
          message.info('File imported as plain markdown (no styles found).');
        }
      } catch (error) {
        console.error('Error importing Markdown file:', error);
        message.error(`Failed to import Markdown file: ${error.message}`);
      }
    };
    reader.readAsText(file);
    return false;
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
            <Upload accept=".json,.md" showUploadList={false} beforeUpload={(file) => {
              if (file.name.endsWith('.md')) {
                return handleMarkdownImport(file);
              }
              return handleProjectImport(file);
            }}>
              <Button icon={<UploadOutlined />}>Import Project/MD</Button>
            </Upload>
                        <Dropdown.Button
              icon={<SaveOutlined />}
              onClick={handleProjectExport}
              menu={{
                items: [
                  {
                    key: 'export-md',
                    label: 'Export as Markdown (.md)',
                    onClick: handleMarkdownExport,
                  },
                  {
                    key: 'export-html',
                    label: 'Export as HTML (.html)',
                    onClick: handleHtmlExport,
                  },
                ],
              }}
            >
              Export Project
            </Dropdown.Button>
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
          heightUnits='vh'
          disablePreview
          minEditorHeight={80}
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

const generateFullHtml = (markdown: string, styles: AppStyles): string => {
  const contentHtml = ReactDOMServer.renderToStaticMarkup(
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
      {markdown}
    </ReactMarkdown>
  );

  const styleEntries = Object.entries(styles);
  
  const bodyStyles = toCssString(styles.previewPane);

  const contentWrapperStyles = toCssString(styles.global);

  const elementStyles = styleEntries
    .filter(([key]) => key !== 'previewPane' && key !== 'global')
    .map(([tag, styleObject]) => {
      const cssProps = toCssString(styleObject as React.CSSProperties);
      return `#content ${tag} {
${cssProps}
}`;
    })
    .join('\n\n');

  const finalCss = `
    body {
      ${bodyStyles}
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
    }
    #content {
      ${contentWrapperStyles}
    }
    ${elementStyles}
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Exported Document</title>
      <style>${finalCss}</style>
    </head>
    <body>
      <div id="content">
        ${contentHtml}
      </div>
    </body>
    </html>
  `;
};

export default App;