# Gemini 项目分析: markdown-h5-editor

本文档为 `markdown-h5-editor` 项目提供摘要，以便快速了解项目背景。

## 1. 项目概述与架构

这是一个基于 Web 的、功能丰富的 Markdown 编辑器。其核心架构特性是一个**沙盒化的预览环境**。实时预览在一个加载了独立的 `/preview` 路由的 `iframe` 中进行渲染。这种方法提供了**彻底的样式隔离**，确保编辑器 UI 的样式不会与用户内容的样式发生冲突。

主应用 (`App.tsx`) 和 `iframe` (`Preview.tsx`) 之间的通信是通过 `window.postMessage` 进行异步处理的。主应用向 `iframe` 发送 Markdown 内容和样式数据，而 `iframe` 则在“审查模式”下将用户交互（如元素选择）的信息发送回来。

编辑器支持从 Word (`.docx`) 文件导入，以及将整个项目状态（Markdown 内容 + 样式）保存/加载为 **JSON 或 YAML 文件**。预览功能也得到了增强，支持在 Markdown 内容中**渲染原生 HTML**。

## 2. 技术栈

-   **框架**: [React](https://react.dev/) (v19)
-   **构建工具**: [Vite](https://vitejs.dev/)
-   **语言**: [TypeScript](https://www.typescriptlang.org/)
-   **UI 库**: [Ant Design (antd)](https://ant.design/)
-   **状态管理**: [Zustand](https://github.com/pmndrs/zustand)
-   **Markdown 处理**:
    -   `react-mde`: 核心 Markdown 编辑器组件。
    -   `react-markdown`: 将 Markdown 渲染为 React 组件。
    -   `remark-gfm`: 增加对 GitHub 风格 Markdown 的支持。
    -   `rehype-raw`: 允许渲染原生 HTML。
-   **文件转换**:
    -   `mammoth`: 将 `.docx` 文件转换为 Markdown。
    -   `css-tree`: 解析和操作 CSS。
    -   `js-yaml`: 处理 YAML 格式的导入和导出。
-   **代码检查**: [ESLint](https.eslint.org/)

## 3. 项目结构亮点

-   `src/main.tsx`: 应用入口文件。**为主要应用 (`/`) 和预览页面 (`/preview`) 设置路由**。
-   `src/App.tsx`: 主应用组件，包含编辑器和主界面。**它负责渲染 `iframe` 并管理基于 `postMessage` 的通信**，用于发送内容/样式和接收审查事件。
-   `src/Preview.tsx`: **此组件在 `iframe` 内部运行**。它监听 `postMessage` 事件以接收来自父窗口的 Markdown 内容和样式。它使用 `react-markdown` 渲染内容，并在“审查模式”下点击时将消息发送回父窗口。
-   `src/styleStore.ts`: Zustand 状态管理文件，定义了样式和审查模式的全局状态。
-   `package.json`: 定义项目脚本和依赖项。

## 4. 关键操作

-   **运行开发服务器**: `npm run dev`
-   **构建生产版本**: `npm run build`
-   **运行代码检查**: `npm run lint`
-   **预览生产版本**: `npm run preview`