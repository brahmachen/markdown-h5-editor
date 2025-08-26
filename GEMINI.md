# Gemini Project Analysis: markdown-h5-editor

This document provides a summary of the `markdown-h5-editor` project for quick context retrieval.

## 1. Project Overview

This is a web-based, feature-rich Markdown editor designed for H5 environments. It allows users to write Markdown, see a live preview, and visually style the HTML output. The editor supports importing from Word (`.docx`) files and saving/loading the entire project state (Markdown content + styles) as a JSON file.

A key feature is the "Inspect Mode," which allows users to click on rendered HTML elements in the preview pane to directly edit their CSS styles.

## 2. Tech Stack

-   **Framework**: [React](https://react.dev/) (v19)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **UI Library**: [Ant Design (antd)](https://ant.design/) for components like buttons, uploads, and switches.
-   **State Management**: [Zustand](https://github.com/pmndrs/zustand) for managing global state, particularly for styles and editor mode (`isInspecting`).
-   **Markdown Processing**:
    -   `react-mde`: The core Markdown editor component.
    -   `react-markdown`: Renders Markdown to React components for the live preview.
    -   `remark-gfm`: Adds support for GitHub Flavored Markdown (tables, strikethrough, etc.).
-   **File Conversion**:
    -   `mammoth`: Converts `.docx` files to Markdown.
    -   `css-tree`: Parses and manipulates CSS for the style editor.
-   **Linting**: [ESLint](https://eslint.org/) with TypeScript-specific rules.

## 3. Project Structure Highlights

-   `vite.config.ts`: Standard Vite configuration with the React plugin.
-   `src/main.tsx`: The application entry point. Renders the `App` component.
-   `src/App.tsx`: The main application component. It contains all the core logic:
    -   Layout (editor pane, preview pane, style editor).
    -   State management integration (`useStyleStore`).
    -   File import/export handlers (`.docx`, `.json`).
    -   Scroll-syncing logic between the editor and preview.
    -   The "Inspect Mode" click handlers.
    -   Custom rendering logic for Markdown elements to apply dynamic styles.
-   `src/styleStore.ts`: The Zustand store. It defines the global state for:
    -   `styles`: An object holding CSS-in-JS style objects for all styleable HTML elements.
    -   `isInspecting`: A boolean to toggle the style inspector.
    -   `selectedElement`: The currently selected element for styling.
    -   Actions to modify the state.
-   `public/`: Contains static assets.
-   `package.json`: Defines scripts and lists all project dependencies.

## 4. Key Operations

-   **Run Development Server**: `npm run dev`
-   **Build for Production**: `npm run build`
-   **Run Linter**: `npm run lint`
-   **Preview Production Build**: `npm run preview`
