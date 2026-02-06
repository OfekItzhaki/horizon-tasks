/**
 * Socket.IO Client Singleton for Web App
 * Manages persistent WebSocket connection for real-time features
 */

import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

/**
 * Get or create Socket.IO instance
 */
export async function getSocket(): Promise<Socket> {
    if (socketInstance && socketInstance.connected) {
        return socketInstance;
    }

    // Get API URL from environment or default
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    // Get auth token from localStorage
    const token = localStorage.getItem('accessToken');

    if (!token) {
        throw new Error('No authentication token found. Please log in.');
    }

    // Create socket instance
    socketInstance = io(apiUrl, {
        auth: {
            token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
    });

    // Connection event handlers
    socketInstance.on('connect', () => {
        console.log('[Socket] Connected to server');
    });

    socketInstance.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
    });

    socketInstance.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
        console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
    });

    return socketInstance;
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
    }
}

/**
 * Join a list room for real-time updates
 */
export async function joinListRoom(listId: number): Promise<void> {
    const socket = await getSocket();
    socket.emit('enter-list', { listId });
    console.log('[Socket] Joined list room:', listId);
}

/**
 * Leave a list room
 */
export async function leaveListRoom(listId: number): Promise<void> {
    const socket = await getSocket();
    socket.emit('leave-list', { listId });
    console.log('[Socket] Left list room:', listId);
}

/**
 * Listen for presence updates
 */
export async function onPresenceUpdate(
    callback: (data: { listId: number; users: string[] }) => void
): Promise<void> {
    const socket = await getSocket();
    socket.on('presence-update', callback);
}

/**
 * Remove presence update listener
 */
export async function offPresenceUpdate(): Promise<void> {
    const socket = await getSocket();
    socket.off('presence-update');
}
