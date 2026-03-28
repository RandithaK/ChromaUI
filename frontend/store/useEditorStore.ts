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
    aiProvider: 'ollama' | 'gemini' | 'unknown' | null;
    messages: ChatMessage[];
    setConfig: (config: any) => void;
    setActiveTemplate: (template: string) => void;
    setLocked: (locked: boolean) => void;
    setConnected: (connected: boolean) => void;
    setAiProvider: (provider: 'ollama' | 'gemini' | 'unknown' | null) => void;
    addMessage: (message: ChatMessage) => void;
    clearMessages: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
    activeTemplate: "login.yml",
    config: null,
    isConnected: false,
    isLocked: false,
    aiProvider: null,
    messages: [],
    setConfig: (config) => set({ config }),
    setActiveTemplate: (template) => set({ activeTemplate: template }),
    setLocked: (locked) => set({ isLocked: locked }),
    setConnected: (connected) => set({ isConnected: connected }),
    setAiProvider: (provider) => set({ aiProvider: provider }),
    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
    clearMessages: () => set({ messages: [] }),
}));
