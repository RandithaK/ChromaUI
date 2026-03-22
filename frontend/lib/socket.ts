let socket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;

let messageHandler: ((data: any) => void) | null = null;
let openHandler: (() => void) | null = null;
let closeHandler: (() => void) | null = null;

const connect = () => {
    if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
        return socket;
    }

    socket = new WebSocket('ws://localhost:8000/ws/editor');

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
        console.error('WebSocket error:', error);
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
