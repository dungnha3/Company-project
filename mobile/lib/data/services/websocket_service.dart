
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:stomp_dart_client/stomp_dart_client.dart';
import 'package:mobile/config/app_constants.dart';

class WebSocketService {
  StompClient? _client;
  final Map<String, Function> _subscriptions = {};

  bool get isConnected => _client?.connected ?? false;

  void connect(String token, {StompFrameCallback? onConnect}) {
    if (_client != null && _client!.connected) return;

    // Remove 'http' or 'https' and replace with 'ws' or 'wss'
    // But since we are using SockJS, we might need the http URL.
    // However, stomp_dart_client usually works with ws://
    // AppConstants.apiBaseUrl is 'http://10.0.2.2:8080/api'
    // We need 'ws://10.0.2.2:8080/ws/chat'
    
    // Parse the base URL to get host and port
    final uri = Uri.parse(AppConstants.apiBaseUrl);
    // Use raw WebSocket endpoint (without SockJS)
    final wsUrl = 'ws://${uri.host}:${uri.port}/ws/chat/websocket';

    _client = StompClient(
      config: StompConfig(
        url: wsUrl,
        onConnect: onConnect ?? (frame) {},
        beforeConnect: () async {
          debugPrint('waiting to connect...');
        },
        onWebSocketError: (dynamic error) => debugPrint(error.toString()),
        stompConnectHeaders: {'Authorization': 'Bearer $token'},
        webSocketConnectHeaders: {'Authorization': 'Bearer $token'},
      ),
    );

    _client!.activate();
  }

  void subscribe(String destination, Function(Map<String, dynamic>) callback) {
    if (_client == null || !_client!.connected) {

      return;
    }

    if (_subscriptions.containsKey(destination)) {
      return; // Already subscribed
    }


    final unsubscribe = _client!.subscribe(
      destination: destination,
      callback: (frame) {
        if (frame.body != null) {
          final data = json.decode(frame.body!);
          callback(data);
        }
      },
    );

    _subscriptions[destination] = unsubscribe;
  }

  void send(String destination, Map<String, dynamic> body) {
    if (_client != null && _client!.connected) {
      _client!.send(
        destination: destination,
        body: json.encode(body),
      );
    }
  }

  void sendSignal(String roomId, String type, Map<String, dynamic> data) {
    if (_client != null && _client!.connected) {
      _client!.send(
        destination: '/app/chat.signal',
        body: json.encode({
          'roomId': roomId,
          'type': type,
          'data': data
        }),
      );
    }
  }

  void unsubscribe(String destination) {
    if (_subscriptions.containsKey(destination)) {
      _subscriptions[destination]!();
      _subscriptions.remove(destination);

    }
  }

  void disconnect() {
    _client?.deactivate();
    _subscriptions.clear();
    _client = null;
  }
}
