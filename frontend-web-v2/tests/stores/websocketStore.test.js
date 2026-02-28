import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWebSocketStore } from '@shared/stores/websocketStore';

// --- Mock @stomp/stompjs ---
const mockSubscribe = vi.fn();
const mockPublish = vi.fn();
const mockActivate = vi.fn();
const mockDeactivate = vi.fn();

// Store the latest config for testing onStompError/onWebSocketClose callbacks
let latestClientConfig = null;

vi.mock('@stomp/stompjs', () => {
    return {
        Client: class MockClient {
            constructor(config) {
                latestClientConfig = config;
                this.active = false;
                this.activate = mockActivate.mockImplementation(() => {
                    this.active = true;
                    if (config.onConnect) config.onConnect();
                });
                this.deactivate = mockDeactivate;
                this.subscribe = mockSubscribe.mockImplementation((topic, cb) => ({
                    unsubscribe: vi.fn(),
                }));
                this.publish = mockPublish;
            }
        },
    };
});

// --- Mock SockJS ---
vi.mock('sockjs-client', () => ({
    default: vi.fn(),
}));

// --- Mock authStore ---
vi.mock('@shared/stores/authStore', () => ({
    useAuthStore: {
        getState: vi.fn(() => ({ accessToken: null })),
    },
}));

import { useAuthStore } from '@shared/stores/authStore';

// --- Console spies ---
let consoleErrorSpy;
let consoleWarnSpy;

const resetStore = () => {
    useWebSocketStore.setState({
        client: null,
        connected: false,
        subscriptions: {},
    });
};

describe('websocketStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStore();
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    // ---------------------------------------------------------------
    // Scenario 1: Default state
    // ---------------------------------------------------------------
    it('1. Khởi tạo: client=null, connected=false, subscriptions={}', () => {
        const state = useWebSocketStore.getState();
        expect(state.client).toBeNull();
        expect(state.connected).toBe(false);
        expect(state.subscriptions).toEqual({});
    });

    // ---------------------------------------------------------------
    // Scenario 2: connect() without token
    // ---------------------------------------------------------------
    it('2. connect() khi không có token → warn, không connect', () => {
        useAuthStore.getState.mockReturnValue({ accessToken: null });

        useWebSocketStore.getState().connect();

        const state = useWebSocketStore.getState();
        expect(state.client).toBeNull();
        expect(state.connected).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith('Cannot connect to WebSocket: No token');
    });

    // ---------------------------------------------------------------
    // Scenario 3: connect() when already connected
    // ---------------------------------------------------------------
    it('3. connect() khi đã connected → skip, không tạo client mới', () => {
        // Simulate already connected
        useWebSocketStore.setState({ connected: true, client: { active: true } });

        useWebSocketStore.getState().connect();

        // Should NOT create a new Client
        expect(mockActivate).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------------
    // Scenario 4: connect() success
    // ---------------------------------------------------------------
    it('4. connect() thành công → client.activate(), onConnect → connected=true', () => {
        useAuthStore.getState.mockReturnValue({ accessToken: 'valid-token' });

        useWebSocketStore.getState().connect();

        expect(mockActivate).toHaveBeenCalledTimes(1);

        const state = useWebSocketStore.getState();
        expect(state.connected).toBe(true);
        expect(state.client).toBeDefined();
        expect(state.client).not.toBeNull();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------------
    // Scenario 5: connect() onStompError
    // ---------------------------------------------------------------
    it('5. connect() onStompError → logs errors', () => {
        useAuthStore.getState.mockReturnValue({ accessToken: 'valid-token' });

        useWebSocketStore.getState().connect();

        // Use latestClientConfig captured by the mock constructor
        expect(latestClientConfig).not.toBeNull();
        expect(latestClientConfig.onStompError).toBeDefined();

        // Simulate STOMP error
        latestClientConfig.onStompError({
            headers: { message: 'Connection refused' },
            body: 'Details about the error',
        });

        expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // Two console.error calls in onStompError
    });

    // ---------------------------------------------------------------
    // Scenario 6: connect() onWebSocketClose
    // ---------------------------------------------------------------
    it('6. connect() onWebSocketClose → connected=false', () => {
        useAuthStore.getState.mockReturnValue({ accessToken: 'valid-token' });

        useWebSocketStore.getState().connect();
        expect(useWebSocketStore.getState().connected).toBe(true);

        // Simulate WebSocket close using latestClientConfig
        expect(latestClientConfig.onWebSocketClose).toBeDefined();
        latestClientConfig.onWebSocketClose();

        expect(useWebSocketStore.getState().connected).toBe(false);
    });

    // ---------------------------------------------------------------
    // Scenario 7: disconnect()
    // ---------------------------------------------------------------
    it('7. disconnect() → client.deactivate(), reset state', () => {
        // Setup connected state with a mock client
        const mockClient = { deactivate: vi.fn() };
        useWebSocketStore.setState({
            client: mockClient,
            connected: true,
            subscriptions: { '/topic/test': {} },
        });

        useWebSocketStore.getState().disconnect();

        expect(mockClient.deactivate).toHaveBeenCalledTimes(1);

        const state = useWebSocketStore.getState();
        expect(state.client).toBeNull();
        expect(state.connected).toBe(false);
        expect(state.subscriptions).toEqual({});
    });

    // ---------------------------------------------------------------
    // Scenario 8: subscribe()
    // ---------------------------------------------------------------
    it('8. subscribe(topic, cb) → gọi client.subscribe, lưu vào subscriptions map', () => {
        const mockSubObj = { unsubscribe: vi.fn() };
        const mockClient = {
            subscribe: vi.fn().mockReturnValue(mockSubObj),
        };
        useWebSocketStore.setState({
            client: mockClient,
            connected: true,
            subscriptions: {},
        });

        const callback = vi.fn();
        useWebSocketStore.getState().subscribe('/topic/room/1/messages', callback);

        expect(mockClient.subscribe).toHaveBeenCalledWith(
            '/topic/room/1/messages',
            expect.any(Function)
        );

        const state = useWebSocketStore.getState();
        expect(state.subscriptions['/topic/room/1/messages']).toBe(mockSubObj);
    });

    // ---------------------------------------------------------------
    // Scenario 9: subscribe() topic already subscribed → skip
    // ---------------------------------------------------------------
    it('9. subscribe() topic đã subscribe → skip', () => {
        const existingSub = { unsubscribe: vi.fn() };
        const mockClient = { subscribe: vi.fn() };
        useWebSocketStore.setState({
            client: mockClient,
            connected: true,
            subscriptions: { '/topic/existing': existingSub },
        });

        useWebSocketStore.getState().subscribe('/topic/existing', vi.fn());

        // Should NOT call client.subscribe again
        expect(mockClient.subscribe).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------------
    // Scenario 10: unsubscribe()
    // ---------------------------------------------------------------
    it('10. unsubscribe(topic) → gọi sub.unsubscribe, xóa khỏi map', () => {
        const mockUnsub = vi.fn();
        const existingSub = { unsubscribe: mockUnsub };
        useWebSocketStore.setState({
            subscriptions: { '/topic/room/1': existingSub, '/topic/room/2': {} },
        });

        useWebSocketStore.getState().unsubscribe('/topic/room/1');

        expect(mockUnsub).toHaveBeenCalledTimes(1);

        const state = useWebSocketStore.getState();
        expect(state.subscriptions['/topic/room/1']).toBeUndefined();
        // Other subscription untouched
        expect(state.subscriptions['/topic/room/2']).toBeDefined();
    });

    // ---------------------------------------------------------------
    // Scenario 11: sendMessage() when connected
    // ---------------------------------------------------------------
    it('11. sendMessage() khi connected → client.publish với JSON body', () => {
        const mockClient = { publish: vi.fn() };
        useWebSocketStore.setState({
            client: mockClient,
            connected: true,
        });

        useWebSocketStore.getState().sendMessage('/app/chat.send', {
            roomId: 1,
            content: 'Hello!',
        });

        expect(mockClient.publish).toHaveBeenCalledWith({
            destination: '/app/chat.send',
            body: JSON.stringify({ roomId: 1, content: 'Hello!' }),
        });
    });

    // ---------------------------------------------------------------
    // Scenario 12: sendMessage() when disconnected
    // ---------------------------------------------------------------
    it('12. sendMessage() khi disconnected → không gọi publish', () => {
        const mockClient = { publish: vi.fn() };
        useWebSocketStore.setState({
            client: mockClient,
            connected: false,
        });

        useWebSocketStore.getState().sendMessage('/app/chat.send', { content: 'test' });

        expect(mockClient.publish).not.toHaveBeenCalled();
    });
});
