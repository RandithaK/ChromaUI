let socket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;
const BROWSER_SESSION_STORAGE_KEY = 'chromaui-browser-session-id';

let messageHandler: ((data: any) => void) | null = null;
let openHandler: (() => void) | null = null;
let closeHandler: (() => void) | null = null;

const getBrowserSessionId = () => {
    if (typeof window === 'undefined') {
        return 'server';
    }

    const existing = window.sessionStorage.getItem(BROWSER_SESSION_STORAGE_KEY);
    if (existing) {
        return existing;
    }

    const created = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.sessionStorage.setItem(BROWSER_SESSION_STORAGE_KEY, created);
    return created;
};

const connect = () => {
    if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
        return socket;
    }

    const browserSessionId = encodeURIComponent(getBrowserSessionId());
    try {
        socket = new WebSocket(`ws://localhost:8000/ws/editor?browserSessionId=${browserSessionId}`);
    } catch (err) {
        console.error('WebSocket instantiation failed:', err);
        socket = null;
        // Schedule a reconnect attempt
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            setTimeout(connect, RECONNECT_DELAY);
        }
        return null;
    }

    socket.onopen = () => {
        console.log('Connected to WebSocket');
        reconnectAttempts = 0;
        openHandler?.();
    };

    socket.onclose = () => {
        console.log('Disconnected from WebSocket');
        closeHandler?.();
        socket = null;

        // Attempt reconnection
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            console.log(`Reconnecting... attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
            setTimeout(connect, RECONNECT_DELAY);
        }
    };

    socket.onerror = (error) => {
        // `onerror` can fire when the server is unreachable (readyState 3).
        // This is expected during startup or backend outage. Keep it informative,
        // but avoid reentrant closes in `CLOSED` state.
        const state = socket?.readyState;
        if (state === WebSocket.CLOSED || state === WebSocket.CLOSING) {
            console.warn('WebSocket error while closed/closing, likely backend unavailable', {
                error,
                readyState: state,
                url: (socket as any)?.url,
            });
            return;
        }

        console.error('WebSocket encountered an error', {
            error,
            readyState: state,
            url: (socket as any)?.url,
        });

        if (state === WebSocket.OPEN) {
            try {
                socket?.close();
            } catch (closeErr) {
                console.error('Error closing WebSocket after onerror:', closeErr);
                closeHandler?.();
            }
        }
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        messageHandler?.(data);
    };

    return socket;
};

export const initSocket = (
    onMessage: (data: any) => void,
    onOpen: () => void,
    onClose: () => void
) => {
    messageHandler = onMessage;
    openHandler = onOpen;
    closeHandler = onClose;

    return connect();
};

export const sendMessage = (message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    } else {
        console.error('WebSocket is not open. Message not sent:', message);
    }
};
