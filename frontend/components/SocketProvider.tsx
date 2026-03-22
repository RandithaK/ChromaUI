'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { initSocket } from '@/lib/socket';

export default function SocketProvider({ children }: { children: React.ReactNode }) {
    const { setConfig, setActiveTemplate, setLocked, setConnected } = useEditorStore();

    useEffect(() => {
        const socket = initSocket(
            (data) => {
                if (data.type === 'STATE_SYNC') {
                    setConfig(data.config);
                    setActiveTemplate(data.activeTemplate);
                } else if (data.type === 'UI_LOCK') {
                    setLocked(true);
                } else if (data.type === 'UI_UNLOCK') {
                    setLocked(false);
                }
            },
            () => setConnected(true),
            () => setConnected(false)
        );

        return () => {
            if (socket) {
                // Not closing the socket on unmount because it's at the root
                // and we want it to persist across navigation if any.
            }
        };
    }, [setConfig, setActiveTemplate, setLocked, setConnected]);

    return <>{children}</>;
}
