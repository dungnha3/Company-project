/**
 * Theme utility functions
 */

import { colors, typography, spacing, borderRadius, shadows } from '@/shared/styles/theme';

// Get color by name with fallback
export const getColor = (colorName, fallback = colors.primary) => {
  return colors[colorName] || fallback;
};

// Get typography by name with fallback
export const getTypography = (typeName, fallback = typography.base) => {
  return typography[typeName] || fallback;
};

// Get spacing by name with fallback
export const getSpacing = (spaceName, fallback = spacing.md) => {
  return spacing[spaceName] || fallback;
};

// Common style combinations
export const commonStyles = {
  // Page container
  pageContainer: {
    padding: spacing['3xl'],
    fontFamily: typography.fontFamily,
    color: colors.textPrimary,
    minHeight: '100vh',
    backgroundColor: colors.background
  },
  
  // Card base
  cardBase: {
    background: colors.white,
    borderRadius: borderRadius['2xl'],
    padding: spacing['2xl'],
    boxShadow: shadows.lg,
    border: `1px solid ${colors.borderLight}`
  },
  
  // Button base
  buttonBase: {
    border: 'none',
    borderRadius: borderRadius.lg,
    padding: `${spacing.md} ${spacing.xl}`,
    fontSize: typography.base,
    fontWeight: typography.semibold,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.sm
  },
  
  // Input base
  inputBase: {
    width: '100%',
    padding: spacing.md,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    fontSize: typography.base,
    color: colors.textPrimary,
    backgroundColor: colors.white,
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },
  
  // Text styles
  heading1: {
    fontSize: typography['4xl'],
    fontWeight: typography.bold,
    color: colors.textPrimary,
    margin: 0
  },
  
  heading2: {
    fontSize: typography['2xl'],
    fontWeight: typography.bold,
    color: colors.textPrimary,
    margin: 0
  },
  
  heading3: {
    fontSize: typography.xl,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    margin: 0
  },
  
  bodyText: {
    fontSize: typography.base,
    color: colors.textSecondary,
    lineHeight: 1.6,
    margin: 0
  },
  
  smallText: {
    fontSize: typography.sm,
    color: colors.textMuted,
    margin: 0
  }
};

// Status colors
export const statusColors = {
  success: {
    bg: '#f0fdf4',
    color: '#15803d',
    border: '#bbf7d0'
  },
  warning: {
    bg: '#fff7ed',
    color: '#c2410c',
    border: '#fed7aa'
  },
  error: {
    bg: '#fef2f2',
    color: '#b91c1c',
    border: '#fecaca'
  },
  info: {
    bg: '#eff6ff',
    color: '#2563eb',
    border: '#bfdbfe'
  }
};

// Create status badge style
export const createStatusBadge = (status) => {
  const statusStyle = statusColors[status] || statusColors.info;
  return {
    background: statusStyle.bg,
    color: statusStyle.color,
    border: `1px solid ${statusStyle.border}`,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.md,
    fontSize: typography.xs,
    fontWeight: typography.bold,
    textTransform: 'uppercase',
    display: 'inline-block'
  };
};
