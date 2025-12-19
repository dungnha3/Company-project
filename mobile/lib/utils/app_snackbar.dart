import 'package:flutter/material.dart';
import 'package:mobile/config/app_colors.dart';

/// Helper class để hiển thị SnackBar đẹp và nhất quán trong toàn app
class AppSnackbar {
  /// Hiển thị thông báo thành công (xanh lá)
  static void success(BuildContext context, String message) {
    _show(context, message, AppColors.success, Icons.check_circle);
  }

  /// Hiển thị thông báo lỗi (đỏ)  
  static void error(BuildContext context, String message) {
    // Parse error message để hiển thị đẹp hơn
    final cleanMessage = _parseErrorMessage(message);
    _show(context, cleanMessage, AppColors.error, Icons.error);
  }

  /// Hiển thị cảnh báo (cam)
  static void warning(BuildContext context, String message) {
    _show(context, message, const Color(0xFFF59E0B), Icons.warning_amber_rounded);
  }

  /// Hiển thị thông tin (xanh dương)
  static void info(BuildContext context, String message) {
    _show(context, message, AppColors.info, Icons.info);
  }

  /// Core method để hiển thị snackbar
  static void _show(BuildContext context, String message, Color backgroundColor, IconData icon) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(icon, color: Colors.white, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: backgroundColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        duration: const Duration(seconds: 3),
        dismissDirection: DismissDirection.horizontal,
        elevation: 6,
      ),
    );
  }

  /// Parse error message từ API response để hiển thị thân thiện hơn
  static String _parseErrorMessage(String rawMessage) {
    String message = rawMessage;
    
    // Remove "Exception: " prefix
    if (message.startsWith('Exception: ')) {
      message = message.replaceFirst('Exception: ', '');
    }
    
    // Try to parse JSON error
    if (message.contains('"message"')) {
      try {
        // Extract message from JSON-like string
        final regex = RegExp(r'"message"\s*:\s*"([^"]+)"');
        final match = regex.firstMatch(message);
        if (match != null && match.groupCount >= 1) {
          message = match.group(1) ?? message;
        }
      } catch (_) {}
    }
    
    // Handle common API error patterns
    if (message.contains('API Error:')) {
      // Extract just the error message part
      if (message.contains(' - ')) {
        final parts = message.split(' - ');
        if (parts.length > 1) {
          message = parts.sublist(1).join(' - ');
        }
      }
    }
    
    // Friendly messages for common errors
    if (message.contains('cách công ty') || message.contains('Vị trí')) {
      return 'Vị trí quá xa. Vui lòng đến gần công ty hơn để chấm công.';
    }
    if (message.contains('đã chấm công')) {
      return 'Bạn đã chấm công hôm nay rồi.';
    }
    if (message.contains('chưa check-in') || message.contains('chưa chấm công vào')) {
      return 'Bạn chưa check-in. Vui lòng check-in trước.';
    }
    if (message.contains('Unauthorized') || message.contains('401')) {
      return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
    }
    if (message.contains('Network') || message.contains('SocketException')) {
      return 'Lỗi kết nối. Vui lòng kiểm tra mạng internet.';
    }
    if (message.contains('timeout')) {
      return 'Kết nối bị timeout. Vui lòng thử lại.';
    }
    
    // Limit message length
    if (message.length > 100) {
      message = '${message.substring(0, 100)}...';
    }
    
    return message;
  }
}
