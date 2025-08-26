# Development Guidelines

This document outlines the coding conventions, design patterns, and best practices for developing this project. Adhering to these guidelines will improve code quality, maintainability, and the effectiveness of AI-assisted development.

## 1. Coding Style

-   **Formatting**: This project uses ESLint for code quality. All code should adhere to the rules defined in `eslint.config.js`. Consider adding a code formatter like [Prettier](https://prettier.io/) and integrating it with ESLint to ensure consistent formatting across the entire codebase.
-   **Naming Conventions**:
    -   **Components**: Use `PascalCase` (e.g., `StyleEditorPanel`, `MarkdownPreview`).
    -   **Variables & Functions**: Use `camelCase` (e.g., `handleWordImport`, `localCssText`).
    -   **Types/Interfaces**: Use `PascalCase` (e.g., `ProjectFile`, `AppStyles`).
    -   **State from Stores**: Destructure with `camelCase` (e.g., `const { styles, setStyles } = useStyleStore();`).
-   **Typing**: Use TypeScript for all new code. Avoid using `any` unless absolutely necessary. Define clear and specific types/interfaces for data structures (as done with `ProjectFile` and `AppStyles`).

## 2. Component Design: Atomic Design

To keep the UI organized and scalable, we will adopt the principles of Atomic Design. Components should be organized into the following structure inside `src/components/`:

-   `src/components/atoms`: The smallest, indivisible UI elements. They are application-agnostic.
    -   *Examples*: `Button`, `Input`, `Icon`, `StyledText`.
-   `src/components/molecules`: Compositions of atoms that form simple, functional units.
    -   *Examples*: A search bar (input + button), an upload component (`Button` + `Upload` logic).
-   `src/components/organisms`: More complex UI components composed of molecules and/or atoms. They represent distinct sections of an interface.
    -   *Example*: `StyleEditorPanel`, `EditorToolbar`.
-   `src/components/templates`: Page-level layouts that arrange organisms into a complete page structure, but without the final state or content.
    -   *Example*: `EditorLayout` (defining the three-pane view).
-   `src/components/pages`: The final, concrete pages that wire up state and logic to templates and organisms.
    -   *Example*: The main `App.tsx` could be considered a page, or could use a page component.

## 3. State Management

-   **Global State (Zustand)**: `src/styleStore.ts` is a good example. Use Zustand for state that is shared across many components or needs to persist globally (e.g., user authentication, application theme, editor settings).
-   **Local Component State (React Hooks)**: For state that is only relevant to a single component and its children, use `useState` or `useReducer`. The `localCssText` in `StyleEditorPanel` is a perfect example of correct local state usage.

## 4. API & Data Handling

-   **Data Structures**: All significant data structures (like the project file format) must have a TypeScript `interface` or `type` defined. This is crucial for type safety and AI understanding.
-   **Utility Functions**: Logic that is not directly tied to a component's rendering (e.g., CSS conversion, file processing) should be extracted into utility functions in a `src/utils/` directory. The `toCssString` and `toReactStyleObject` functions are good candidates for this.

## 5. AI-Assisted Development Best Practices

To maximize the capabilities of AI tools like Gemini, follow these principles:

1.  **Be Explicit with Types**: The stronger the types, the better the AI can understand data flow and prevent errors. Always prefer `interface` or `type` over `any`.
2.  **Write Small, Single-Responsibility Functions/Components**: AI tools can more easily understand, modify, and test small, focused pieces of code. The current `App.tsx` is large; consider refactoring it by extracting parts like the `StyleEditorPanel` (already done) and the toolbar into their own organism components.
3.  **Use Descriptive Names**: Name variables, functions, and components clearly and descriptively. `handleWordImport` is a great name. Avoid short, cryptic names like `hwi`.
4.  **Add High-Value Comments**: Don't explain *what* the code does (the code itself should do that). Explain *why* it does it, especially for complex logic, workarounds, or important decisions. The comment `// Don't log errors for incomplete CSS as user is typing` is a perfect example of a high-value comment.
5.  **Maintain a Test Suite**: While not currently present, adding unit tests (e.g., with [Vitest](https://vitest.dev/)) for utility functions and component tests for UI elements would allow an AI to verify its changes and refactor with confidence.
6.  **Keep Dependencies Updated**: An up-to-date `package.json` helps the AI use the latest features and avoid deprecated APIs.
