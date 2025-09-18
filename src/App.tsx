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

// --- Sample Project Data ---
const sampleMarkdown = `
# 软件开发服务协议

---

**甲方（委托方）：** Acme 公司
**乙方（服务方）：** 您的开发团队

## 1. 服务范围

乙方同意根据本协议的条款和条件，为甲方提供以下软件开发服务：

*   开发一款名为“Markdown H5 Editor”的在线编辑器。
*   实现包括但不限于以下功能点：
    1.  Markdown 实时预览
    2.  样式自定义
    3.  项目持久化存储
*   提供相关的技术支持和维护。

> **请注意：** 任何超出上述范围的需求，均需双方另行协商并签订补充协议。

## 2. 项目交付物与时间表

| 交付阶段 | 主要交付物 | 预计完成日期 |
| :--- | :--- | :--- |
| **第一阶段** | 产品原型 (UI/UX) | 2025-10-01 |
| **第二阶段** | Alpha 测试版 | 2025-11-15 |
| **第三阶段** | 正式发布版 | 2025-12-31 |

## 3. 费用与支付

项目总费用为 **$50,000**，支付方式如下：

- **预付款：** 协议签订后3个工作日内，支付总费用的 30%。
- **里程碑付款：** 每个交付阶段完成并经甲方验收合格后，支付相应比例的费用。
- **尾款：** 项目正式发布后，支付剩余的 10%。

## 4. 机密信息

双方同意，对于在合作过程中获知的对方的任何商业、技术及运营信息（定义为“机密信息”）予以严格保密。代码 
const secret = '保密信息';
 也属于机密信息的一部分。

## 5. 其他

本协议的更多详情，请参考 [官方文档](https://example.com)。

![Placeholder Image](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgNDAwIDEwMCI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiIC8+PHRleHQgeD0iMjAwIiB5PSI1NSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM4ODgiPlNJR05BVFVSRSBBUkVNPC90ZXh0PjxsaW5lIHgxPSI1MCIgeTE9IjgwIiB4Mj0iMzUwIiB5Mj0iODAiIHN0cm9rZT0iI2FhYSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+)
*图1：双方签字区域示意*

## 附录A：功能开发排期表示例

| ID | 模块 | 功能描述 | 状态 |负责人| 预计完成日期 | 备注 |
| :--- | :--- | :--- | :--- |:--- |:--- |:--- |
| FEAT-001 | 编辑器核心 | 支持基础 Markdown 语法 | 已完成 | 张三 | 2025-09-15 | 无 |
| FEAT-002 | 样式系统 | 支持自定义 CSS 样式 | 已完成 | 李四 | 2025-09-20 | 需要考虑 vw 适配 |
| FEAT-003 | 持久化 | 实现 IndexedDB 存储 | 进行中 | 王五 | 2025-09-30 | 需设计好数据表结构 |
| BUG-001 | 预览模块 | 修复滚动同步不精确问题 | 待处理 | 李四 | 2025-10-05 | 考虑引入 Source Maps |
`;

const sampleStyles: AppStyles = {
  previewPane: { backgroundColor: '#f7f8fa', border: 'none' },
  global: { backgroundColor: '#ffffff', padding: '24px', fontFamily: 'serif', fontSize: '15px' },
  h1: { fontSize: '34px', color: '#1a2b48', marginTop: '16px', borderBottom: '2px solid #1a2b48', paddingBottom: '8px' },
  h2: { fontSize: '26px', color: '#1a2b48', marginTop: '20px' },
  h3: { fontSize: '20px', color: '#334d7c', marginTop: '16px' },
  p: { fontSize: '15px', color: '#333333', lineHeight: 1.6 },
  a: { color: '#0056b3', textDecoration: 'none' },
  blockquote: { borderLeft: '5px solid #0056b3', paddingLeft: '20px', color: '#555', backgroundColor: '#f0f7ff', margin: '16px 0' },
  code: { backgroundColor: '#e8e8e8', color: '#333', padding: '2px 5px', borderRadius: '3px' },
  pre: { backgroundColor: '#2d2d2d', color: '#f8f8f2', padding: '16px', borderRadius: '5px' },
  strong: { color: '#000' },
  ol: { paddingLeft: '32px' },
  ul: { paddingLeft: '32px' },
  li: { marginBottom: '6px', fontSize: '15px' },
  table: {
    borderCollapse: 'separate',
    borderSpacing: 0,
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #dee2e6',
    width: '100%',
    margin: '16px 0',
  },
  th: {
    backgroundColor: 'rgba(233, 236, 239, 0.5)',
    padding: '10px 14px',
    textAlign: 'left',
    fontWeight: '600',
    borderBottom: '2px solid #dee2e6',
    whiteSpace: 'nowrap',
    fontSize: '15px',
  },
  td: {
    padding: '10px 14px',
    borderTop: '1px solid #dee2e6',
    fontSize: '15px',
  },
  img: {
    maxWidth: '100%',
    height: 'auto',
    display: 'block',
    margin: '16px auto', // Center the image
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  }
};

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
    message.success('New blank project started.');
  };

  const handleLoadSample = () => {
    store.resetState();
    store.setMarkdown(sampleMarkdown);
    store.setStyles(sampleStyles);
    message.success('Sample agreement loaded.');
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
            const syncFactor = 1.1; // Tweak this factor to adjust scroll feel
            const curvedRatio = Math.pow(payload, 1 / syncFactor);
            const { scrollHeight, clientHeight } = editorTextArea;
            editorTextArea.scrollTop = curvedRatio * (scrollHeight - clientHeight);
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
      const fullContent = `---
${yamlString}---

${store.markdown}`;
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

  const newMenu = (
    <Menu items={[
      { key: 'blank', label: 'Blank Project', onClick: handleNewProject },
      { key: 'sample', label: 'Agreement Template', onClick: handleLoadSample },
    ]} />
  );

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
              <Dropdown overlay={newMenu}>
                <Button icon={<FileAddOutlined />}>New</Button>
              </Dropdown>
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
        {projects && projects.length > 0 ? (
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
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <h3>No Projects Found</h3>
            <p>Get started by creating a new project or loading the sample.</p>
            <Button type="primary" onClick={() => { handleLoadSample(); setHistoryModalOpen(false); }}>Load Sample Agreement</Button>
          </div>
        )}
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
  const componentsForExport = {
    table: ({ node, ...props }) => (
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table {...props} />
      </div>
    ),
  };

  const contentHtml = ReactDOMServer.renderToStaticMarkup(
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]} 
      rehypePlugins={[rehypeRaw]}
      components={componentsForExport}
    >
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
