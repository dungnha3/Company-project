import { create } from 'zustand';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from './authStore';

// WebSocket URL
// Vite proxy handles /ws -> http://localhost:8080/ws
// But SockJS might need absolute URL if proxy isn't enough for WS upgrade, 
// usually /ws works if proxy is set up correctly. 
// If using separate backend port, might need 'http://localhost:8080/ws'
// Use environment variable or fallback to localhost
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const WS_URL = `${BASE_URL}/ws/chat`;

export const useWebSocketStore = create((set, get) => ({
    client: null,
    connected: false,
    connecting: false, // Prevent concurrent connect attempts
    subscriptions: {}, // Map topic -> STOMP subscription object
    pendingSubscriptions: {}, // Map topic -> callback (queued before connection)

    connect: () => {
        const token = localStorage.getItem('accessToken');
        const { connected, client: existingClient, connecting } = get();

        // Skip if already connected, connecting, or client is still active
        if (connected || connecting) {
            return;
        }

        // Deactivate any existing client first
        if (existingClient) {
            try { existingClient.deactivate(); } catch { }
        }

        if (!token) {
            console.warn('[WS] Cannot connect to WebSocket: No token');
            return;
        }

        set({ connecting: true });
        console.log('[WS] Creating STOMP client, URL:', WS_URL);
        const client = new Client({
            // Use SockJS fallback
            webSocketFactory: () => {
                return new SockJS(WS_URL);
            },
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            debug: () => { }, // Suppress STOMP debug logs
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,

            onConnect: () => {
                console.log('[WS] ✅ WebSocket Connected');
                set({ connected: true, connecting: false });

                // Replay any pending subscriptions that were queued before connection
                const { pendingSubscriptions } = get();
                const pendingTopics = Object.keys(pendingSubscriptions);
                if (pendingTopics.length > 0) {
                    const newSubscriptions = { ...get().subscriptions };
                    for (const topic of pendingTopics) {
                        const callback = pendingSubscriptions[topic];
                        if (!newSubscriptions[topic]) {
                            const sub = client.subscribe(topic, (message) => {
                                const body = JSON.parse(message.body);
                                callback(body);
                            });
                            newSubscriptions[topic] = sub;
                        }
                    }
                    set({ subscriptions: newSubscriptions, pendingSubscriptions: {} });
                }
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                set({ connecting: false });
            },
            onWebSocketClose: () => {
                set({ connected: false, connecting: false });
            }
        });

        client.activate();
        set({ client });
    },

    disconnect: () => {
        const { client } = get();
        if (client) {
            try { client.deactivate(); } catch { }
            set({ client: null, connected: false, connecting: false, subscriptions: {}, pendingSubscriptions: {} });
        }
    },

    subscribe: (topic, callback) => {
        const { client, connected, subscriptions } = get();

        if (subscriptions[topic]) return; // Already subscribed

        // If not connected yet, queue the subscription for replay on connect
        if (!client || !connected) {
            const { pendingSubscriptions } = get();
            if (!pendingSubscriptions[topic]) {
                set({ pendingSubscriptions: { ...pendingSubscriptions, [topic]: callback } });
            }
            return;
        }

        const sub = client.subscribe(topic, (message) => {
            const body = JSON.parse(message.body);
            callback(body);
        });

        set({ subscriptions: { ...subscriptions, [topic]: sub } });
    },

    unsubscribe: (topic) => {
        const { subscriptions, pendingSubscriptions } = get();
        if (subscriptions[topic]) {
            subscriptions[topic].unsubscribe();
            const newSubs = { ...subscriptions };
            delete newSubs[topic];
            set({ subscriptions: newSubs });
        }
        // Also remove from pending if exists
        if (pendingSubscriptions[topic]) {
            const newPending = { ...pendingSubscriptions };
            delete newPending[topic];
            set({ pendingSubscriptions: newPending });
        }
    },

    sendMessage: (destination, body) => {
        const { client, connected } = get();
        if (client && connected) {
            client.publish({
                destination,
                body: JSON.stringify(body),
            });
        }
    }
}));
