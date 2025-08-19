import { create } from 'zustand';

// Define the structure of our styles
interface StyleState {
  styles: {
    h1: React.CSSProperties;
    p: React.CSSProperties;
  };
  setStyle: (element: keyof StyleState['styles'], newStyle: React.CSSProperties) => void;
}

export const useStyleStore = create<StyleState>((set) => ({
  // Initial default styles
  styles: {
    h1: { fontSize: '2em', color: '#000000' },
    p: { fontSize: '1em', lineHeight: 1.6, color: '#333333' },
  },

  // Action to update a specific element's style
  setStyle: (element, newStyle) =>
    set((state) => ({
      styles: {
        ...state.styles,
        [element]: { ...state.styles[element], ...newStyle },
      },
    })),
}));
