import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOMServer from 'react-dom/server';
import ReactMde from 'react-mde';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Button, Upload, Space, Switch, Tooltip, message, Dropdown, InputNumber, Modal, List, Input, Menu } from 'antd';
import { UploadOutlined, AimOutlined, FileTextOutlined, SaveOutlined, DownloadOutlined, FolderOpenOutlined, FileAddOutlined, DeleteOutlined } from '@ant-design/icons';
import mammoth from 'mammoth';
import * as yaml from 'js-yaml';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Project } from './db';
import { useStyleStore } from './styleStore';
import type { AppStyles, StyleableElement } from './styleStore';
import { convertStyleObject } from './utils/styleConverter';

import 'react-mde/lib/styles/css/react-mde-all.css';
import './App.css';

// A simple debounce utility
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: number;
  return (...args: Parameters<F>): void => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

interface ProjectFile {
  version: string;
  markdownContent: string;
  theme: {
    styles: AppStyles;
  };
}

// --- Reusable Components ---
const StyleEditorPanel = () => {
  const { styles, selectedElement, setStyle } = useStyleStore();
  const [localCssText, setLocalCssText] = useState('');

  useEffect(() => {
    if (styles[selectedElement]) {
      setLocalCssText(Object.entries(styles[selectedElement]).map(([p, v]) => `${p.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}: ${v};`).join('\n'));
    }
  }, [selectedElement, styles]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalCssText(e.target.value);

  const handleBlur = () => {
    const newStyleObject: React.CSSProperties = {};
    localCssText.split('\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length === 2) {
        const prop = parts[0].trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
        newStyleObject[prop as keyof React.CSSProperties] = parts[1].trim().replace(';', '');
      }
    });
    setStyle(selectedElement, newStyleObject);
  };

  return (
    <div className="style-pane">
      <div className="style-pane-header"><h3>Editing: <span>{selectedElement}</span></h3></div>
      <textarea className="css-editor" value={localCssText} onChange={handleTextChange} onBlur={handleBlur} />
    </div>
  );
};

// --- Main App Component ---
function App() {
  const [selectedTab, setSelectedTab] = useState<'write' | 'preview'>('write');
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [isSaveModalOpen, setSaveModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const store = useStyleStore();

  const editorRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPreviewReady, setPreviewReady] = useState(false);
  const isSyncing = useRef(false);

  const projects = useLiveQuery(() => db.projects.orderBy('updatedAt').reverse().toArray(), []);

  // --- Project Logic ---
  const handleNewProject = () => {
    store.resetState();
    message.success('New project started.');
  };

  const handleSave = useCallback(async () => {
    if (store.currentProjectId) {
      try {
        await db.projects.update(store.currentProjectId, {
          markdown: store.markdown,
          styles: store.styles,
          updatedAt: new Date(),
        });
        message.success('Project saved!');
      } catch (error) { message.error('Failed to save project.'); }
    } else {
      setSaveModalOpen(true);
    }
  }, [store.currentProjectId, store.markdown, store.styles]);

  const handleSaveAsNew = async () => {
    if (!newProjectName.trim()) {
      message.error('Project name cannot be empty.');
      return;
    }
    try {
      const newId = await db.projects.add({
        name: newProjectName,
        markdown: store.markdown,
        styles: store.styles,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      store.setCurrentProjectId(newId);
      message.success(`Project '${newProjectName}' saved!`);
      setSaveModalOpen(false);
      setNewProjectName('');
    } catch (error) { message.error('Failed to save new project.'); }
  };

  const handleLoadProject = async (id: number) => {
    const project = await db.projects.get(id);
    if (project) {
      store.setMarkdown(project.markdown);
      store.setStyles(project.styles);
      store.setCurrentProjectId(project.id!);
      setHistoryModalOpen(false);
      message.success(`Project '${project.name}' loaded.`);
    }
  };

  const handleDeleteProject = async (id: number) => {
    await db.projects.delete(id);
    if (store.currentProjectId === id) {
      handleNewProject();
    }
    message.success('Project deleted.');
  };

  // --- Auto-save Logic ---
  const debouncedSave = useCallback(debounce(() => {
    if (store.currentProjectId) {
      handleSave();
    }
  }, 2000), [store.currentProjectId, handleSave]);

  useEffect(() => {
    debouncedSave();
  }, [store.markdown, store.styles, debouncedSave]);

  // --- iFrame Communication ---
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const { type, payload } = event.data;

      switch (type) {
        case 'preview-ready':
          setPreviewReady(true);
          break;
        case 'element-selected':
          store.setSelectedElement(payload);
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
    return () => window.removeEventListener('message', handleMessage);
  }, [store]);

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

  // --- Consolidated State Sync to iFrame ---
  useEffect(() => {
    if (isPreviewReady && iframeRef.current?.contentWindow) {
      const payload = {
        markdown: store.markdown,
        styles: store.styles,
        isInspecting: store.isInspecting,
        isVwMode: store.isVwMode,
        designWidth: store.designWidth,
      };
      iframeRef.current.contentWindow.postMessage(
        { type: 'update-state', payload: payload },
        '*'
      );
    }
  }, [store.markdown, store.styles, store.isInspecting, store.isVwMode, store.designWidth, isPreviewReady]);

  // --- File Handlers ---
  const handleWordImport = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToMarkdown({ arrayBuffer });
      store.setMarkdown(result.value);
      message.success('Word document imported successfully!');
    } catch (error) { message.error('Failed to import Word document.'); }
    return false;
  };

  const handleProjectExport = () => {
    const project: ProjectFile = {
      version: '1.3.0',
      markdownContent: store.markdown,
      theme: {
        styles: store.styles,
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
      const yamlString = yaml.dump(store.styles);
      const fullContent = `---\n${yamlString}---\n\n${store.markdown}`;
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
      const content = generateFullHtml(store.markdown, store.styles, store.isVwMode, store.designWidth);
      const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'export.html';
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) { message.error('Failed to export HTML file.'); }
  };

  const exportMenu = (
    <Menu items={[ 
      { key: 'html', label: 'Export as HTML', onClick: handleHtmlExport },
      { key: 'md', label: 'Export as Markdown (.md)', onClick: handleMarkdownExport },
      { key: 'json', label: 'Export Project (.json)', onClick: handleProjectExport },
    ]} />
  );

  return (
    <>
      <div className="app-container">
        <StyleEditorPanel />
        <div className="editor-pane" ref={editorRef}>
          <div className="toolbar">
            <Space>
              <Button icon={<FileAddOutlined />} onClick={handleNewProject}>New</Button>
              <Button icon={<FolderOpenOutlined />} onClick={() => setHistoryModalOpen(true)}>Open</Button>
              <Dropdown.Button icon={<SaveOutlined />} onClick={handleSave} menu={{ items: [{ key: 'save-as', label: 'Save As New...', onClick: () => setSaveModalOpen(true) }] }}>Save</Dropdown.Button>
              <Upload accept=".docx" showUploadList={false} beforeUpload={handleWordImport}><Button icon={<FileTextOutlined />}>Import Word</Button></Upload>
              <Dropdown overlay={exportMenu}>
                <Button icon={<DownloadOutlined />}>Export</Button>
              </Dropdown>
              <Tooltip title="Inspect Mode"><Switch checked={store.isInspecting} onChange={store.setInspecting} checkedChildren={<AimOutlined />} unCheckedChildren={<AimOutlined />} /></Tooltip>
            </Space>
          </div>
          <ReactMde value={store.markdown} onChange={store.setMarkdown} selectedTab={selectedTab} onTabChange={setSelectedTab} generateMarkdownPreview={md => Promise.resolve(<ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>)} heightUnits='vh' disablePreview minEditorHeight={80} />
        </div>
        <div className="preview-pane-wrapper">
          <div className="phone-mockup">
            <div className="preview-toolbar">
              <Space className="vw-controls">
                <Tooltip title="Enable VW Preview Mode"><Switch checked={store.isVwMode} onChange={store.setVwMode} checkedChildren="VW" unCheckedChildren="PX" /></Tooltip>
                {store.isVwMode && <InputNumber addonBefore="Width" addonAfter="px" value={store.designWidth} onChange={val => store.setDesignWidth(val || 375)} min={320} />}
              </Space>
            </div>
            <iframe ref={iframeRef} src="/preview" title="H5 Preview" className="preview-iframe" />
          </div>
        </div>
      </div>

      <Modal title="Open Project" open={isHistoryModalOpen} onCancel={() => setHistoryModalOpen(false)} footer={null} width={600}>
        <List
          itemLayout="horizontal"
          dataSource={projects}
          renderItem={(proj: Project) => (
            <List.Item
              actions={[
                <Button key="open" type="primary" onClick={() => handleLoadProject(proj.id!)}>Open</Button>,
                <Button key="delete" danger onClick={() => handleDeleteProject(proj.id!)}><DeleteOutlined /></Button>,
              ]}>
              <List.Item.Meta title={proj.name} description={`Last saved: ${proj.updatedAt.toLocaleString()}`} />
            </List.Item>
          )}
        />
      </Modal>

      <Modal title="Save New Project" open={isSaveModalOpen} onOk={handleSaveAsNew} onCancel={() => setSaveModalOpen(false)}>
        <Input placeholder="Enter project name" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} onPressEnter={handleSaveAsNew} />
      </Modal>
    </>
  );
}

// This function remains for the export feature
const generateFullHtml = (
  markdown: string, 
  styles: AppStyles, 
  isVwMode: boolean, 
  designWidth: number
): string => {
  const contentHtml = ReactDOMServer.renderToStaticMarkup(
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
      {markdown}
    </ReactMarkdown>
  );

  // Decide whether to convert styles to VW units
  const stylesToUse = isVwMode
    ? Object.entries(styles).reduce((acc, [key, styleObject]) => {
        acc[key as StyleableElement] = convertStyleObject(styleObject, designWidth);
        return acc;
      }, {} as AppStyles)
    : styles;

  // Helper to convert a style object to a CSS string
  const styleObjectToCss = (styleObject: React.CSSProperties): string => {
    return Object.entries(styleObject)
      .map(([prop, value]) => `  ${prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${value};`)
      .join('\n');
  };

  // Generate CSS rules for each element
  const elementStyles = Object.entries(stylesToUse)
    .map(([tag, styleObject]) => {
      let selector = '';
      if (tag === 'previewPane') {
        selector = 'body';
      } else if (tag === 'global') {
        selector = '#content';
      } else {
        selector = `#content ${tag}`;
      }
      
      return `${selector} {\n${styleObjectToCss(styleObject as React.CSSProperties)}\n}`;
    })
    .join('\n\n');

  const finalCss = `
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
    }
    ${elementStyles}
  `;

  // Assemble the final HTML document
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Exported Document</title>
        <style>
          ${finalCss}
        </style>
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