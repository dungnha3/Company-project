import 'package:flutter/foundation.dart';

class AppConstants {
  // Use 10.0.2.2 for Android Emulator to access localhost of the host machine
  // Use localhost for iOS Simulator or Web
  // Use local IP for physical device
  
  static String get rootUrl {
    if (kIsWeb) {
      return 'http://localhost:8080';
    }
    return 'http://10.0.2.2:8080';
  }

  static String get baseUrl => '$rootUrl/api';
  static String get apiBaseUrl => baseUrl;
  static String get wsUrl => '$rootUrl/ws/chat';
}
