/**
 * Shared Dashboard Base Styles
 * Common styles for all dashboard components
 */

import { colors, typography, spacing, borderRadius, shadows } from './theme';

export const dashboardBaseStyles = {
  // Main App Shell
  appShell: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    minHeight: '100vh',
    backgroundColor: colors.background,
    fontFamily: typography.fontFamily
  },
  
  // Sidebar Styles
  sidebar: {
    background: 'linear-gradient(195deg, #1e3a8a 0%, #0f172a 100%)',
    padding: spacing['2xl'],
    overflowY: 'auto',
    boxShadow: shadows.lg
  },
  
  // Brand Section
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
    paddingBottom: spacing.lg,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  
  brandIcon: {
    width: '40px',
    height: '40px',
    borderRadius: borderRadius.lg,
    background: 'linear-gradient(195deg, #42424a, #191919)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: typography.xl,
    fontWeight: typography.bold,
    boxShadow: shadows.md
  },
  
  brandName: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: '#fff',
    margin: 0
  },
  
  brandSubtitle: {
    fontSize: typography.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    margin: 0
  },
  
  // User Card
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.xl,
    marginBottom: spacing['2xl']
  },
  
  userAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: borderRadius.xl,
    background: 'linear-gradient(195deg, #66bb6a, #43a047)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: typography.lg,
    fontWeight: typography.bold
  },
  
  userName: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: '#fff',
    margin: 0
  },
  
  userRole: {
    fontSize: typography.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    margin: 0
  },
  
  // Navigation
  navGroup: {
    marginBottom: spacing['2xl']
  },
  
  navGroupLabel: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: spacing.md,
    paddingLeft: spacing.md
  },
  
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    padding: `${spacing.md} ${spacing.lg}`,
    background: 'transparent',
    border: 'none',
    borderRadius: borderRadius.lg,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: typography.base,
    fontWeight: typography.medium,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    marginBottom: spacing.xs
  },
  
  navItemActive: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    boxShadow: shadows.sm
  },
  
  navIcon: {
    fontSize: typography.lg,
    width: '20px',
    textAlign: 'center'
  },
  
  // Divider
  divider: {
    height: '1px',
    background: 'rgba(255, 255, 255, 0.1)',
    margin: `${spacing['2xl']} 0`
  },
  
  // Logout Button
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    padding: `${spacing.md} ${spacing.lg}`,
    background: 'linear-gradient(195deg, #ef5350, #e53935)',
    border: 'none',
    borderRadius: borderRadius.lg,
    color: '#fff',
    fontSize: typography.base,
    fontWeight: typography.semibold,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: 'auto',
    boxShadow: shadows.md
  },
  
  // Main Content Area
  content: {
    height: '100%',
    overflowY: 'auto',
    background: colors.background
  },
  
  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: spacing['3xl'],
    paddingBottom: spacing['2xl'],
    background: colors.white,
    borderBottom: `1px solid ${colors.borderLight}`,
    boxShadow: shadows.sm
  },
  
  pageHeading: {
    fontSize: typography['4xl'],
    fontWeight: typography.bold,
    color: colors.textPrimary,
    margin: 0,
    marginBottom: spacing.xs
  },
  
  subHeading: {
    fontSize: typography.base,
    color: colors.textSecondary,
    margin: 0
  },
  
  rightCluster: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.lg
  },
  
  // Dashboard Content
  dashboardContent: {
    padding: spacing['3xl']
  },
  
  // KPI Grid
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: spacing['2xl'],
    marginBottom: spacing['3xl']
  },
  
  // Cards Row
  cardsRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: spacing['2xl'],
    marginBottom: spacing['3xl']
  },
  
  // Welcome Card
  welcomeCard: {
    background: colors.white,
    borderRadius: borderRadius['2xl'],
    padding: spacing['3xl'],
    boxShadow: shadows.lg,
    border: `1px solid ${colors.borderLight}`
  },
  
  welcomeTitle: {
    fontSize: typography['2xl'],
    fontWeight: typography.bold,
    color: colors.textPrimary,
    margin: 0,
    marginBottom: spacing.md
  },
  
  welcomeText: {
    fontSize: typography.base,
    color: colors.textSecondary,
    lineHeight: 1.6,
    margin: 0,
    marginBottom: spacing['2xl']
  },
  
  // Action Button
  checkInBtn: {
    background: colors.gradientSuccess,
    color: '#fff',
    border: 'none',
    borderRadius: borderRadius.lg,
    padding: `${spacing.md} ${spacing['2xl']}`,
    fontSize: typography.base,
    fontWeight: typography.semibold,
    cursor: 'pointer',
    boxShadow: shadows.md,
    transition: 'all 0.2s ease'
  },
  
  // Charts Row
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing['2xl']
  },
  
  chartCard: {
    background: colors.white,
    borderRadius: borderRadius['2xl'],
    padding: spacing['2xl'],
    boxShadow: shadows.lg,
    border: `1px solid ${colors.borderLight}`
  },
  
  cardTitle: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    margin: 0,
    marginBottom: spacing.lg
  },
  
  chartPlaceholder: {
    height: '200px',
    background: colors.background,
    borderRadius: borderRadius.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  chartInfo: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center'
  }
};
