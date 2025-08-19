import { useState } from 'react';
import ReactMde from 'react-mde';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button, Upload, Input, ColorPicker } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import mammoth from 'mammoth';
import { useStyleStore } from './styleStore';

import 'react-mde/lib/styles/css/react-mde-all.css';
import './App.css';

// Style Panel Component
const StylePanel = () => {
  const { styles, setStyle } = useStyleStore();

  return (
    <div className="style-pane">
      <h2>Style Editor</h2>
      <div className="style-group">
        <h3>H1 - Heading 1</h3>
        <div className="style-item">
          <label>Color</label>
          <ColorPicker 
            value={styles.h1.color}
            onChange={(color) => setStyle('h1', { color: color.toHexString() })}
          />
        </div>
        <div className="style-item">
          <label>Font Size</label>
          <Input 
            value={styles.h1.fontSize as string}
            onChange={(e) => setStyle('h1', { fontSize: e.target.value })}
            placeholder="e.g., 2em"
          />
        </div>
      </div>

      <div className="style-group">
        <h3>P - Paragraph</h3>
        <div className="style-item">
          <label>Color</label>
          <ColorPicker 
            value={styles.p.color}
            onChange={(color) => setStyle('p', { color: color.toHexString() })}
          />
        </div>
        <div className="style-item">
          <label>Line Height</label>
          <Input 
            value={styles.p.lineHeight as string}
            onChange={(e) => setStyle('p', { lineHeight: e.target.value })}
            placeholder="e.g., 1.6"
          />
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [markdown, setMarkdown] = useState('# This is a Heading 1\n\nThis is a paragraph. You can change its style on the left panel.');
  const [selectedTab, setSelectedTab] = useState<'write' | 'preview'>('write');
  const styles = useStyleStore((state) => state.styles);

  const handleFileChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result;
      if (arrayBuffer) {
        try {
          const result = await mammoth.convertToMarkdown({ arrayBuffer: arrayBuffer as ArrayBuffer });
          setMarkdown(result.value);
        } catch (error) {
          console.error('Error converting Word document:', error);
        }
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const markdownComponents = {
    h1: ({...props}) => <h1 style={styles.h1} {...props} />,
    p: ({...props}) => <p style={styles.p} {...props} />,
  };

  return (
    <div className="app-container">
      <StylePanel />
      <div className="editor-pane">
        <div className="toolbar">
          <Upload
            accept=".docx"
            showUploadList={false}
            beforeUpload={handleFileChange}
          >
            <Button icon={<UploadOutlined />}>Import from Word</Button>
          </Upload>
        </div>
        <ReactMde
          value={markdown}
          onChange={setMarkdown}
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
          generateMarkdownPreview={(md) =>
            Promise.resolve(
              <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
            )
          }
        />
      </div>
      <div className="preview-pane">
        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}

export default App;
