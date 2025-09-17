import { create } from 'zustand';
import React from 'react';

export type StyleableElement = keyof AppStyles;

// Define a more comprehensive style structure
export interface AppStyles {
  previewPane: React.CSSProperties; // Styles for the entire preview area
  global: React.CSSProperties;      // Styles for the direct content wrapper
  h1: React.CSSProperties;
  h2: React.CSSProperties;
  h3: React.CSSProperties;
  p: React.CSSProperties;
  a: React.CSSProperties;
  blockquote: React.CSSProperties;
  code: React.CSSProperties;
  pre: React.CSSProperties;
  strong: React.CSSProperties;
  ol: React.CSSProperties;
  li: React.CSSProperties;
}

interface StyleState {
  styles: AppStyles;
  markdown: string;
  isInspecting: boolean;
  selectedElement: StyleableElement;
  isVwMode: boolean;
  designWidth: number;
  setStyle: (element: StyleableElement, newStyle: React.CSSProperties) => void;
  setStyles: (newStyles: AppStyles) => void;
  setMarkdown: (markdown: string) => void;
  setInspecting: (isInspecting: boolean) => void;
  setSelectedElement: (element: StyleableElement) => void;
  setVwMode: (isOn: boolean) => void;
  setDesignWidth: (width: number) => void;
}

export const useStyleStore = create<StyleState>((set) => ({
  styles: {
    previewPane: {
      backgroundColor: '#f0f2f5',
      border: 'none',
    },
    global: {
      backgroundColor: '#ffffff',
      padding: '32px'
    },
    h1: { fontSize: '35px', color: '#111111', marginTop: '8px' },
    h2: { fontSize: '29px', color: '#222222', marginTop: '8px' },
    h3: { fontSize: '24px', color: '#333333', marginTop: '8px' },
    p: { fontSize: '16px', color: '#333333' },
    a: { color: '#007bff', textDecoration: 'underline' },
    blockquote: {
      borderLeft: '4px solid #dddddd',
      paddingLeft: '16px',
      color: '#777777',
      margin: '16px 0'
    },
    code: {
      backgroundColor: '#f0f0f0',
      color: '#c7254e',
      padding: '3px 6px',
      borderRadius: '3px'
    },
    pre: {
      backgroundColor: '#f5f5f5',
      padding: '16px',
      borderRadius: '5px'
    },
    strong: {
      color: '#000000'
    },
    ol: {
      paddingLeft: '32px',
    },
    li: {
      marginBottom: '6px',
    }
  },
  markdown: '# Welcome!\n\nThis is the final, stable version of the editor. Editing should now work as expected.',
  isInspecting: false,
  selectedElement: 'global',
  isVwMode: false,
  designWidth: 375,

  setStyle: (element, newStyle) =>
    set((state) => ({
      styles: {
        ...state.styles,
        [element]: newStyle, // Replace the style for the element
      },
    })),

  setStyles: (newStyles) => set({ styles: newStyles }),
  setMarkdown: (markdown) => set({ markdown }),
  setInspecting: (isInspecting) => set({ isInspecting }),
  setSelectedElement: (element) => set({ selectedElement: element }),
  setVwMode: (isOn) => set({ isVwMode: isOn }),
  setDesignWidth: (width) => set({ designWidth: width }),
}));
