import { create } from 'zustand';
import React from 'react';

export type StyleableElement = keyof AppStyles;

// Define a more comprehensive style structure
export interface AppStyles {
  global: React.CSSProperties;
  h1: React.CSSProperties;
  h2: React.CSSProperties;
  h3: React.CSSProperties;
  p: React.CSSProperties;
  a: React.CSSProperties;
  blockquote: React.CSSProperties;
  code: React.CSSProperties; // For inline code: `code`
  pre: React.CSSProperties;  // For code blocks: ```code```
  strong: React.CSSProperties; // For bold text: **strong**
}

interface StyleState {
  styles: AppStyles;
  isInspecting: boolean;
  selectedElement: StyleableElement;
  setStyle: (element: StyleableElement, newStyle: React.CSSProperties) => void;
  setStyles: (newStyles: AppStyles) => void;
  setInspecting: (isInspecting: boolean) => void;
  setSelectedElement: (element: StyleableElement) => void;
}

export const useStyleStore = create<StyleState>((set) => ({
  styles: {
    global: {
      backgroundColor: '#ffffff',
    },
    h1: { fontSize: '2.2em', color: '#111111', marginTop: '0.5em' },
    h2: { fontSize: '1.8em', color: '#222222', marginTop: '0.5em' },
    h3: { fontSize: '1.5em', color: '#333333', marginTop: '0.5em' },
    p: { fontSize: '1em', lineHeight: 1.7, color: '#333333' },
    a: { color: '#007bff', textDecoration: 'underline' },
    blockquote: { 
      borderLeft: '4px solid #dddddd', 
      paddingLeft: '1em', 
      color: '#777777',
      margin: '1em 0'
    },
    code: { 
      backgroundColor: '#f0f0f0',
      color: '#c7254e',
      padding: '0.2em 0.4em',
      borderRadius: '3px'
    },
    pre: { 
      backgroundColor: '#f5f5f5', 
      padding: '1em',
      borderRadius: '5px'
    },
    strong: {
      color: '#000000' // Default bold color
    }
  },
  isInspecting: false,
  selectedElement: 'global',

  setStyle: (element, newStyle) =>
    set((state) => ({
      styles: {
        ...state.styles,
        [element]: newStyle, // Replace the whole style for the element
      },
    })),

  setStyles: (newStyles) => set({ styles: newStyles }),
  setInspecting: (isInspecting) => set({ isInspecting }),
  setSelectedElement: (element) => set({ selectedElement: element }),
}));