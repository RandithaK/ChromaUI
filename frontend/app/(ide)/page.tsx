'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { sendMessage } from '@/lib/socket';
import { Paintbrush, MessageSquare, Settings, Lock, Bot } from 'lucide-react';

export default function IDEPage() {
    const { config, activeTemplate, isLocked, isConnected, messages, addMessage, aiProvider } = useEditorStore();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [prompt, setPrompt] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Step 4: Cross-window communication
    useEffect(() => {
        if (iframeRef.current && config) {
            iframeRef.current.contentWindow?.postMessage(config, "*");
        }
    }, [config]);

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleMutation = (path: string, value: string | boolean) => {
        sendMessage({
            type: "HUMAN_MUTATION",
            path,
            value
        });
    };

    const handlePromptSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isLocked) return;

        // Add user message to chat
        addMessage({
            id: `user-${Date.now()}`,
            role: 'user',
            content: prompt,
            timestamp: Date.now()
        });

        sendMessage({
            type: "AI_PROMPT",
            prompt
        });
        setPrompt('');
    };

    if (!isConnected) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100">
                <div className="text-center">
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto"></div>
                    <p className="text-lg font-medium">Connecting to Backend...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
            {/* Header */}
            <header className="flex h-14 items-center justify-between border-b border-zinc-800 px-6 bg-zinc-900/50">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold">C</div>
                    <h1 className="text-lg font-semibold tracking-tight">ChromaUI <span className="text-zinc-500 font-normal">/ {activeTemplate}</span></h1>
                </div>
                <div className="flex items-center gap-4">
                    {aiProvider && (
                        <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium border ${
                            aiProvider === 'ollama' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : aiProvider === 'gemini' 
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        }`}>
                            <Bot className="h-4 w-4" />
                            {aiProvider === 'ollama' ? 'Ollama (Local)' : aiProvider === 'gemini' ? 'Gemini API' : 'Unknown AI'}
                        </div>
                    )}
                    {isLocked && (
                        <div className="flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-400 border border-indigo-500/20">
                            <Lock className="h-4 w-4 animate-pulse" />
                            AI is thinking...
                        </div>
                    )}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Settings */}
                <aside className="w-64 border-r border-zinc-800 bg-zinc-900/30 p-4 overflow-y-auto">
                    <div className="mb-6">
                        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                            <Settings className="h-4 w-4" /> Global Settings
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase">Theme Mode</label>
                                <select 
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm"
                                    value={config?.theme?.mode || 'dark'}
                                    onChange={(e) => handleMutation('theme.mode', e.target.value)}
                                >
                                    <option value="dark">Dark</option>
                                    <option value="light">Light</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase">Template Type</label>
                                <div className="text-sm font-mono bg-zinc-800/50 p-2 rounded border border-zinc-700/50">
                                    {config?.template_type}
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Center Content - Preview */}
                <main className="flex-1 flex flex-col bg-zinc-950 p-6">
                    <div className="relative flex-1 rounded-xl border border-zinc-800 bg-zinc-900/20 overflow-hidden shadow-2xl shadow-black/50">
                        <iframe 
                            ref={iframeRef}
                            src="/preview" 
                            className="h-full w-full border-none"
                            title="Preview"
                        />
                    </div>

                    {/* Bottom Panel - Chat */}
                    <div className="mt-6 h-64 flex flex-col">
                        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                            <MessageSquare className="h-4 w-4" /> AI Assistant
                        </div>

                        {/* Message History */}
                        <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-3 space-y-3">
                            {messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                                    Start a conversation with the AI assistant...
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                                                msg.role === 'user'
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                                            }`}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handlePromptSubmit} className="relative h-24">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={isLocked}
                                placeholder="Describe your changes... (e.g., 'Make the button blue' or 'Switch to register template')"
                                className="h-full w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 pr-12 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all disabled:opacity-50"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handlePromptSubmit(e);
                                    }
                                }}
                            />
                            <button
                                type="submit"
                                disabled={isLocked || !prompt.trim()}
                                className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 transition-colors shadow-lg shadow-indigo-600/20"
                            >
                                <MessageSquare className="h-4 w-4" />
                            </button>
                        </form>
                    </div>
                </main>

                {/* Right Sidebar - Design */}
                <aside className="w-80 border-l border-zinc-800 bg-zinc-900/30 p-4 overflow-y-auto">
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                        <Paintbrush className="h-4 w-4" /> Design System
                    </h2>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wider">Primary Color</label>
                            <div className="flex items-center gap-4 bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50">
                                <input 
                                    type="color" 
                                    className="h-10 w-10 cursor-pointer overflow-hidden rounded bg-transparent border-none"
                                    value={config?.colors?.primary?.main || '#6366f1'}
                                    onChange={(e) => handleMutation('colors.primary.main', e.target.value)}
                                />
                                <div className="flex-1">
                                    <div className="text-sm font-mono">{config?.colors?.primary?.main || '#6366f1'}</div>
                                    <div className="text-[10px] text-zinc-500 uppercase font-bold">Main Brand Color</div>
                                </div>
                            </div>
                        </div>

                        {config?.components?.authForm && (
                            <div className="border-t border-zinc-800 pt-6">
                                <label className="block text-xs font-medium text-zinc-500 mb-4 uppercase tracking-wider">Component Props</label>
                                <div className="space-y-4">
                                    {config.template_type === 'login' && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-zinc-300">Allow Passkey</span>
                                            <input 
                                                type="checkbox" 
                                                checked={config.components.authForm.allowPasskey}
                                                onChange={(e) => handleMutation('components.authForm.allowPasskey', e.target.checked)}
                                                className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </div>
                                    )}
                                    {config.template_type === 'register' && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-zinc-300">Require Terms</span>
                                            <input 
                                                type="checkbox" 
                                                checked={config.components.authForm.requireTermsAcceptance}
                                                onChange={(e) => handleMutation('components.authForm.requireTermsAcceptance', e.target.checked)}
                                                className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}
