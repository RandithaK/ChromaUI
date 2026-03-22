'use client';

import { useEffect, useState } from 'react';
import { Mail, Lock, User, Github, Chrome, KeyRound, AtSign } from 'lucide-react';

// Provider configuration mapping
const providerConfig: Record<string, { icon: React.ElementType; label: string }> = {
    google: { icon: Chrome, label: 'Google' },
    github: { icon: Github, label: 'GitHub' },
    email: { icon: AtSign, label: 'Email' },
};

export default function PreviewPage() {
    const [config, setConfig] = useState<any>(null);

    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data && typeof e.data === 'object' && 'template_type' in e.data) {
                setConfig(e.data);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    if (!config) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-500">
                <p>Waiting for configuration...</p>
            </div>
        );
    }

    const isDark = config.theme?.mode === 'dark';
    const primaryColor = config.colors?.primary?.main || '#6366f1';
    const contrastText = config.colors?.primary?.contrastText || '#ffffff';
    const providers = config.components?.authForm?.providers || [];
    const allowPasskey = config.components?.authForm?.allowPasskey;
    const requireTerms = config.components?.authForm?.requireTermsAcceptance;

    return (
        <div className={`h-full w-full flex items-center justify-center p-8 transition-colors duration-300 ${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'}`}>
            <div className={`w-full max-w-md p-8 rounded-2xl shadow-xl border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">
                        {config.template_type === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {config.template_type === 'login' ? 'Please enter your details to sign in.' : 'Join us and start building today.'}
                    </p>
                </div>

                <div className="space-y-4">
                    {config.template_type === 'register' && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider opacity-60">Full Name</label>
                            <div className={`flex items-center gap-3 p-3 rounded-lg border ${isDark ? 'bg-zinc-900/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                                <User className="h-4 w-4 opacity-40" />
                                <input disabled placeholder="John Doe" className="bg-transparent outline-none w-full text-sm" />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider opacity-60">Email Address</label>
                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${isDark ? 'bg-zinc-900/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                            <Mail className="h-4 w-4 opacity-40" />
                            <input disabled placeholder="name@company.com" className="bg-transparent outline-none w-full text-sm" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold uppercase tracking-wider opacity-60">Password</label>
                            {config.template_type === 'login' && (
                                <span style={{ color: primaryColor }} className="text-[10px] font-bold cursor-pointer hover:underline">Forgot?</span>
                            )}
                        </div>
                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${isDark ? 'bg-zinc-900/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                            <Lock className="h-4 w-4 opacity-40" />
                            <input disabled type="password" placeholder="••••••••" className="bg-transparent outline-none w-full text-sm" />
                        </div>
                    </div>

                    {config.template_type === 'register' && requireTerms && (
                        <div className="flex items-center gap-2 py-2">
                            <input type="checkbox" className="rounded" style={{ accentColor: primaryColor }} />
                            <span className="text-xs opacity-60">I agree to the Terms of Service and Privacy Policy.</span>
                        </div>
                    )}

                    <button
                        style={{ backgroundColor: primaryColor, color: contrastText }}
                        className="w-full py-3 rounded-lg font-bold text-sm shadow-lg transition-transform active:scale-[0.98] mt-4"
                    >
                        {config.template_type === 'login' ? 'Sign In' : 'Sign Up'}
                    </button>

                    {config.template_type === 'login' && allowPasskey && (
                        <button
                            style={{ borderColor: primaryColor, color: primaryColor }}
                            className="w-full py-3 rounded-lg font-bold text-sm border-2 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <KeyRound className="h-4 w-4" />
                            Sign in with Passkey
                        </button>
                    )}

                    {providers.length > 0 && (
                        <>
                            <div className="relative my-8">
                                <div className={`absolute inset-0 flex items-center ${isDark ? 'opacity-10' : 'opacity-5'}`}>
                                    <div className="w-full border-t border-current"></div>
                                </div>
                                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className={`${isDark ? 'bg-zinc-800 px-4 text-zinc-500' : 'bg-white px-4 text-zinc-400'}`}>Or continue with</span>
                                </div>
                            </div>

                            <div className={`grid gap-4 ${providers.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                {providers.map((provider: string) => {
                                    const cfg = providerConfig[provider];
                                    if (!cfg) return null;
                                    const Icon = cfg.icon;
                                    return (
                                        <button
                                            key={provider}
                                            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-semibold transition-colors ${isDark ? 'bg-zinc-900/50 border-zinc-700 hover:bg-zinc-900' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}
                                        >
                                            <Icon className="h-4 w-4" /> {cfg.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className="mt-8 text-center">
                    <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {config.template_type === 'login' ? "Don't have an account?" : "Already have an account?"}
                        <span style={{ color: primaryColor }} className="ml-1 font-bold cursor-pointer hover:underline">
                            {config.template_type === 'login' ? "Sign up" : "Sign in"}
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
}
