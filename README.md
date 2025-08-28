# Markdown H5 编辑器

这是一个功能丰富的、基于 Web 的 Markdown 编辑器，专为 H5 环境设计。它的核心特性是实时预览功能，该预览在一个沙盒化的 `iframe` 中进行渲染，以确保与编辑器界面的样式完全隔离。

编辑器与预览窗口之间的通信是通过 `postMessage` API 异步处理的。

## 功能特性

-   **沙盒化实时预览**: 在 `iframe` 中实时查看渲染后的 HTML 更新，确保样式展示的准确性，避免与编辑器UI冲突。
-   **可视化样式编辑器**: 通过图形化界面更改颜色、字体大小、边距和内边距等 CSS 属性。
-   **审查模式**: 在预览窗口中直接点击元素，即可选中并开始编辑其样式。
-   **文件导入**:
    -   从 Microsoft Word (`.docx`) 文件导入内容。
    -   从 JSON 或 YAML 文件加载项目状态。
-   **文件导出**:
    -   将完整的项目状态（Markdown 内容 + 样式）保存为 JSON 或 YAML 文件。
-   **原生 HTML 渲染**: 预览窗口支持渲染嵌入在 Markdown 中的原生 HTML 标签，提供了更大的灵活性。
-   **同步滚动**: 编辑器和预览窗口可以同步滚动。

## 技术栈

-   **框架**: React (v19)
-   **构建工具**: Vite
-   **语言**: TypeScript
-   **UI 库**: Ant Design (antd)
-   **状态管理**: Zustand
-   **Markdown 处理**: `react-mde`, `react-markdown`, `remark-gfm`, `rehype-raw`
-   **文件处理**: `mammoth` (docx), `js-yaml` (yaml)

## 快速开始

1.  **安装依赖:**
    ```bash
    npm install
    ```
2.  **运行开发服务器:**
    ```bash
    npm run dev
    ```

## 可用脚本

-   `npm run dev`: 启动开发服务器。
-   `npm run build`: 构建用于生产环境的应用。
-   `npm run lint`: 运行 ESLint 进行代码检查。
-   `npm run preview`: 在本地预览生产环境的构建成果。