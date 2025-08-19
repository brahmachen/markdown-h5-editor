import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMde from 'react-mde';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button, Upload, Space, Switch, Tooltip } from 'antd';
import { UploadOutlined, DownloadOutlined, AimOutlined } from '@ant-design/icons';
import mammoth from 'mammoth';
import * as csstree from 'css-tree';
import { useStyleStore } from './styleStore';
import type { StyleableElement } from './styleStore';

import 'react-mde/lib/styles/css/react-mde-all.css';
import './App.css';

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
        // Use generate to correctly get the full value as a string.
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
  const [cssText, setCssText] = useState('');

  useEffect(() => {
    setCssText(toCssString(styles[selectedElement]));
  }, [selectedElement]);

  const handleCssChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCssText = e.target.value;
    setCssText(newCssText);
    const newStyleObject = toReactStyleObject(newCssText);
    setStyle(selectedElement, newStyleObject);
  };

  return (
    <div className="style-pane">
      <div className="style-pane-header">
        <h3>Editing: <span>{selectedElement}</span></h3>
      </div>
      <textarea className="css-editor" value={cssText} onChange={handleCssChange} />
    </div>
  );
};

// --- Main App Component ---
function App() {
  const [markdown, setMarkdown] = useState('# Welcome to the Inspector!\n\nTurn on **Inspect Mode** and click any element to style it.\n\n> This is a blockquote.\n\n**This is some bold text.**');
  const [selectedTab, setSelectedTab] = useState<'write' | 'preview'>('write');
  const { styles, setStyles, isInspecting, setInspecting, setSelectedElement } = useStyleStore();

  const handleFileChange = (file: File, type: 'word' | 'theme') => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        if (type === 'word') {
          const arrayBuffer = e.target?.result;
          if (!arrayBuffer) return;
          const result = await mammoth.convertToMarkdown({ arrayBuffer: arrayBuffer as ArrayBuffer });
          setMarkdown(result.value);
        } else {
          const theme = JSON.parse(e.target?.result as string);
          setStyles(theme);
        }
      } catch (error) { console.error('Error processing file:', error); }
    };
    if (type === 'word') reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
    return false;
  };

  const handleThemeExport = () => {
    const blob = new Blob([JSON.stringify(styles, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'my-theme.json';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const markdownComponents = useMemo(() => {
    const createStyledComponent = (tag: keyof JSX.IntrinsicElements, styleKey: StyleableElement) => {
      return ({ ...props }) => {
        const style = styles[styleKey];
        const handleClick = (e: React.MouseEvent) => {
          if (isInspecting) {
            e.preventDefault();
            e.stopPropagation();
            setSelectedElement(styleKey);
          }
        };
        const className = isInspecting ? 'inspectable' : '';
        const FinalComponent = tag as any;
        return <FinalComponent style={style} onClick={handleClick} className={className} {...props} />;
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
  }, [styles, isInspecting, setSelectedElement]);

  return (
    <div className="app-container">
      <StyleEditorPanel />
      <div className="editor-pane">
        <div className="toolbar">
          <Space>
            <Upload accept=".docx" showUploadList={false} beforeUpload={(file) => handleFileChange(file, 'word')}>
              <Button icon={<UploadOutlined />}>Import Word</Button>
            </Upload>
            <Upload accept=".json" showUploadList={false} beforeUpload={(file) => handleFileChange(file, 'theme')}>
              <Button icon={<UploadOutlined />}>Import Theme</Button>
            </Upload>
            <Button icon={<DownloadOutlined />} onClick={handleThemeExport}>Export Theme</Button>
            <Tooltip title={isInspecting ? 'Turn Off Inspect Mode' : 'Turn On Inspect Mode'}>
              <Switch checked={isInspecting} onChange={setInspecting} checkedChildren={<AimOutlined />} unCheckedChildren={<AimOutlined />} />
            </Tooltip>
          </Space>
        </div>
        <ReactMde
          value={markdown}
          onChange={setMarkdown}
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
          generateMarkdownPreview={(md) => Promise.resolve(<ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>)}
        />
      </div>
      <div className="preview-pane" style={styles.global}>
        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}

export default App;