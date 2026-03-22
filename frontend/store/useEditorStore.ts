import { create } from 'zustand';

export interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: number;
}

interface EditorState {
    activeTemplate: string;
    config: any;
    isConnected: boolean;
    isLocked: boolean;
    messages: ChatMessage[];
    setConfig: (config: any) => void;
    setActiveTemplate: (template: string) => void;
    setLocked: (locked: boolean) => void;
    setConnected: (connected: boolean) => void;
    addMessage: (message: ChatMessage) => void;
    clearMessages: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
    activeTemplate: "login.yml",
    config: null,
    isConnected: false,
    isLocked: false,
    messages: [],
    setConfig: (config) => set({ config }),
    setActiveTemplate: (template) => set({ activeTemplate: template }),
    setLocked: (locked) => set({ isLocked: locked }),
    setConnected: (connected) => set({ isConnected: connected }),
    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
    clearMessages: () => set({ messages: [] }),
}));
