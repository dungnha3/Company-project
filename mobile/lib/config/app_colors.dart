/// App Colors for DACN Mobile
/// 
/// Color palette based on FE Web design (purple/pink gradient theme)

import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Primary Colors (Purple from FE Web)
  static const Color primary = Color(0xFF8E44AD);        // Main purple
  static const Color primaryLight = Color(0xFFA569BD);   // Light purple
  static const Color primaryDark = Color(0xFF7D3C98);    // Dark purple
  
  // Secondary Colors (Pink gradient end)
  static const Color secondary = Color(0xFFD7BDE2);      // Light pink/lavender
  static const Color secondaryLight = Color(0xFFE8DAEF); // Very light pink

  // Accent Colors
  static const Color accent = Color(0xFFFF9500);         // Orange for check-in button
  static const Color accentLight = Color(0xFFFFB347);    // Light orange
  static const Color accentGradientEnd = Color(0xFFFFD700); // Yellow/Gold

  // Status Colors
  static const Color success = Color(0xFF27AE60);        // Green
  static const Color warning = Color(0xFFF39C12);        // Orange/Amber
  static const Color error = Color(0xFFE74C3C);          // Red
  static const Color info = Color(0xFF3498DB);           // Blue

  // Chart/Stats Colors
  static const Color chartBlue = Color(0xFF5DADE2);      // Light blue for charts
  static const Color chartBlueDark = Color(0xFF2980B9);  // Dark blue for charts
  static const Color statGreen = Color(0xFF2ECC71);      // Stat badge green
  static const Color statOrange = Color(0xFFF39C12);     // Stat badge orange  
  static const Color statRed = Color(0xFFE74C3C);        // Stat badge red

  // Background Colors
  static const Color background = Color(0xFFF8F9FA);     // Light gray background
  static const Color backgroundDark = Color(0xFF1A1A2E); // Dark mode background
  static const Color surface = Color(0xFFFFFFFF);        // White surface
  static const Color cardBackground = Color(0xFFFFFFFF); // White cards

  // Text Colors
  static const Color textPrimary = Color(0xFF2C3E50);    // Dark blue-gray
  static const Color textSecondary = Color(0xFF7F8C8D);  // Medium gray
  static const Color textHint = Color(0xFFBDC3C7);       // Light gray
  static const Color textOnPrimary = Color(0xFFFFFFFF);  // White text

  // Border Colors
  static const Color border = Color(0xFFE5E8EB);         // Light border
  static const Color borderLight = Color(0xFFF0F3F5);    // Very light border

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, primaryLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient sidebarGradient = LinearGradient(
    colors: [Color(0xFF8E44AD), Color(0xFFD7BDE2)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient headerGradient = LinearGradient(
    colors: [Color(0xFF9B59B6), Color(0xFFBB8FCE)],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  static const LinearGradient accentGradient = LinearGradient(
    colors: [Color(0xFFFF9500), Color(0xFFFFD700)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient chartGradient = LinearGradient(
    colors: [chartBlue, chartBlueDark],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}
