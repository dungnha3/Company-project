export const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#f8fafc',
  },

  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
  },

  loadingText: {
    fontSize: '16px',
    color: '#64748b',
  },

  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    gap: '16px',
  },

  errorText: {
    fontSize: '18px',
    color: '#dc2626',
    fontWeight: '500',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1,
  },

  backButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  projectIcon: {
    fontSize: '32px',
  },

  projectInfo: {
    flex: 1,
  },

  projectName: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#0f172a',
    margin: 0,
  },

  projectDescription: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },

  headerRight: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },

  actionButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '500',
  },

  moreButton: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '18px',
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  tabsContainer: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '0 32px',
  },

  tabsList: {
    display: 'flex',
    gap: '8px',
  },

  tab: {
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    fontSize: '14px',
    fontWeight: '500',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  tabActive: {
    color: '#3b82f6',
    borderBottom: '3px solid #3b82f6',
  },

  contentContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '24px 32px',
  },
}
