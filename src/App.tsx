import { useState, useRef, useEffect } from "react";
import ReactMde from "react-mde";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import mammoth from "mammoth";
import { useStyleStore } from "./styleStore";
import { useControls, Leva, LevaInputs } from "leva";

import "react-mde/lib/styles/css/react-mde-all.css";
import "./App.css";

// --- Leva Style Editor Component ---
const LevaStyleEditor = () => {
  const { styles, setStyle } = useStyleStore();

  // For each style property, we create a control.
  // The `onChange` callback directly updates our Zustand store.
  // This is the most direct and robust way to link Leva to an external store.
  useControls('Styling', {
    'Global Background': {
      value: styles.global.backgroundColor ?? "#ffffff",
      type: LevaInputs.COLOR,
      label: "Global Background",
      onChange: (c: string) => setStyle('global', { backgroundColor: c }),
    },
    h1: {
      value: styles.h1.color ?? "#000000",
      type: LevaInputs.COLOR,
      label: 'H1 Color',
      onChange: (c: string) => setStyle('h1', { color: c }),
    },
    h2: {
      value: styles.h2.color ?? "#000000",
      type: LevaInputs.COLOR,
      label: 'H2 Color',
      onChange: (c: string) => setStyle('h2', { color: c }),
    },
    p: {
      value: styles.p.color ?? "#000000",
      type: LevaInputs.COLOR,
      label: 'Paragraph Color',
      onChange: (c: string) => setStyle('p', { color: c }),
    },
    a: {
      value: styles.a.color ?? "#0000ee",
      type: LevaInputs.COLOR,
      label: 'Link Color',
      onChange: (c: string) => setStyle('a', { color: c }),
    },
    blockquote: {
      value: styles.blockquote.color ?? "#666666",
      type: LevaInputs.COLOR,
      label: 'Blockquote Color',
      onChange: (c: string) => setStyle('blockquote', { color: c }),
    },
    code: {
      value: styles.code.backgroundColor ?? "#f5f5f5",
      type: LevaInputs.COLOR,
      label: 'Inline Code BG',
      onChange: (c: string) => setStyle('code', { backgroundColor: c }),
    },
  });

  return null; // Leva panel is global, we don't need to render anything here.
};


// --- Main App Component ---
function App() {
  const [markdown, setMarkdown] = useState(
`# Heading 1
## Heading 2
### Heading 3

This is a paragraph with a [link](https://example.com). It also has some 
inline code
.

> This is a blockquote. It can be styled as well.

javascript
// This is a code block.
function hello() {
  console.log("Hello, Leva!");
}
`
  );
  const [selectedTab, setSelectedTab] = useState<'write' | 'preview'>('write');
  const styles = useStyleStore((state) => state.styles);

  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

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
  }, []);

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
    h1: ({ ...props }) => <h1 style={styles.h1} {...props} />,
    h2: ({ ...props }) => <h2 style={styles.h2} {...props} />,
    h3: ({ ...props }) => <h3 style={styles.h3} {...props} />,
    p: ({ ...props }) => <p style={styles.p} {...props} />,
    a: ({ ...props }) => <a style={styles.a} {...props} />,
    blockquote: ({ ...props }) => <blockquote style={styles.blockquote} {...props} />,
    code: ({ ...props }) => <code style={styles.code} {...props} />,
    pre: ({ ...props }) => <pre style={styles.pre} {...props} />,
  };

  return (
    <div className="app-container">
      <Leva /> {/* This renders the floating panel toggle */}
      <LevaStyleEditor />
      <div className="editor-pane" ref={editorRef}>
        <div className="toolbar">
          <Upload accept=".docx" showUploadList={false} beforeUpload={handleFileChange}>
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
      <div className="preview-pane" ref={previewRef} style={styles.global}>
        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}

export default App;