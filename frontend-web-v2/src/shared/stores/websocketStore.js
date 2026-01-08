import { create } from 'zustand';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from './authStore';

// WebSocket URL
// Vite proxy handles /ws -> http://localhost:8080/ws
// But SockJS might need absolute URL if proxy isn't enough for WS upgrade, 
// usually /ws works if proxy is set up correctly. 
// If using separate backend port, might need 'http://localhost:8080/ws'
const WS_URL = 'http://localhost:8080/ws';

export const useWebSocketStore = create((set, get) => ({
    client: null,
    connected: false,
    subscriptions: {}, // Map topic -> subscription object

    connect: () => {
        const { token } = useAuthStore.getState();
        const { connected, client: existingClient } = get();

        if (connected || (existingClient && existingClient.active)) return;

        if (!token) {
            console.warn('Cannot connect to WebSocket: No token');
            return;
        }

        const client = new Client({
            // Use SockJS fallback
            webSocketFactory: () => new SockJS(WS_URL),
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            debug: (str) => {
                // console.log('STOMP: ' + str); 
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,

            onConnect: () => {
                // console.log('WebSocket Connected');
                set({ connected: true });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },
            onWebSocketClose: () => {
                // console.log('WebSocket Closed');
                set({ connected: false });
            }
        });

        client.activate();
        set({ client });
    },

    disconnect: () => {
        const { client } = get();
        if (client) {
            client.deactivate();
            set({ client: null, connected: false, subscriptions: {} });
        }
    },

    subscribe: (topic, callback) => {
        const { client, connected, subscriptions } = get();
        if (!client || !connected) return;

        if (subscriptions[topic]) return; // Already subscribed

        const sub = client.subscribe(topic, (message) => {
            const body = JSON.parse(message.body);
            callback(body);
        });

        set({ subscriptions: { ...subscriptions, [topic]: sub } });
    },

    unsubscribe: (topic) => {
        const { subscriptions } = get();
        if (subscriptions[topic]) {
            subscriptions[topic].unsubscribe();
            const newSubs = { ...subscriptions };
            delete newSubs[topic];
            set({ subscriptions: newSubs });
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
