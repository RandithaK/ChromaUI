import { create } from 'zustand';

interface EditorState {
    activeTemplate: string;
    config: any;
    isConnected: boolean;
    isLocked: boolean;
    setConfig: (config: any) => void;
    setActiveTemplate: (template: string) => void;
    setLocked: (locked: boolean) => void;
    setConnected: (connected: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
    activeTemplate: "login.yml",
    config: null,
    isConnected: false,
    isLocked: false,
    setConfig: (config) => set({ config }),
    setActiveTemplate: (template) => set({ activeTemplate: template }),
    setLocked: (locked) => set({ isLocked: locked }),
    setConnected: (connected) => set({ isConnected: connected }),
}));
