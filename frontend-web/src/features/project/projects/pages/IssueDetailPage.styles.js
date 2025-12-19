export const styles = {
  container: {
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    padding: '0',
  },

  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  },

  loadingText: {
    fontSize: '16px',
    color: '#666',
  },

  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    gap: '16px',
  },

  errorText: {
    fontSize: '18px',
    color: '#666',
  },

  // Header
  header: {
    backgroundColor: '#ffffff',
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1,
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  backButton: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },

  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
  },

  starButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px',
  },

  dropdown: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },

  iconButton: {
    padding: '8px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
  },

  actionButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#ffffff',
  },

  // Main Content
  mainContent: {
    display: 'flex',
    gap: '24px',
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },

  // Left Panel
  leftPanel: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },

  prioritySection: {
    marginBottom: '16px',
  },

  priorityBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
  },

  addSection: {
    marginBottom: '16px',
  },

  addButton: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: '1px dashed #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#6b7280',
    width: '100%',
    textAlign: 'left',
  },

  projectInfo: {
    marginBottom: '24px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },

  projectText: {
    margin: 0,
    fontSize: '14px',
    color: '#4b5563',
  },

  descriptionSection: {
    marginBottom: '24px',
  },

  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '8px',
  },

  descriptionText: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.6',
  },

  actionButtons: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },

  startButton: {
    padding: '10px 20px',
    backgroundColor: '#84cc16',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    color: '#ffffff',
  },

  completeButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    color: '#ffffff',
  },

  moreButton: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
  },

  editButton: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
  },

  // Tabs
  tabs: {
    display: 'flex',
    gap: '8px',
    borderBottom: '2px solid #e5e7eb',
    marginBottom: '24px',
  },

  tab: {
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '-2px',
  },

  tabActive: {
    color: '#3b82f6',
    borderBottom: '2px solid #3b82f6',
  },

  tabCount: {
    fontSize: '12px',
    padding: '2px 6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '10px',
  },

  tabContent: {
    minHeight: '200px',
  },

  // Comments
  commentSection: {
    padding: '16px 0',
  },

  commentLabel: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '12px',
  },

  commentInput: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '24px',
  },

  submitCommentBtn: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },

  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
    padding: '32px',
  },

  commentItem: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #e5e7eb',
  },

  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },

  commentAuthor: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },

  authorName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },

  commentDate: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },

  commentActions: {
    display: 'flex',
    gap: '8px',
  },

  editCommentBtn: {
    padding: '4px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#3b82f6',
    cursor: 'pointer',
  },

  deleteCommentBtn: {
    padding: '4px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#ef4444',
    cursor: 'pointer',
  },

  commentContent: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.6',
  },

  editCommentForm: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },

  cancelEditBtn: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },

  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
  },

  input: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
  },

  historySection: {
    padding: '16px 0',
  },

  activitiesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  activityItem: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },

  activityIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  },

  activityContent: {
    flex: 1,
  },

  activityHeader: {
    display: 'flex',
    gap: '8px',
    alignItems: 'baseline',
    marginBottom: '8px',
  },

  activityUser: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },

  activityAction: {
    fontSize: '14px',
    color: '#4b5563',
  },

  activityChange: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    marginBottom: '8px',
    fontSize: '13px',
  },

  oldValue: {
    padding: '4px 8px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '4px',
    fontWeight: '500',
  },

  arrow: {
    color: '#6b7280',
    fontSize: '16px',
  },

  newValue: {
    padding: '4px 8px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '4px',
    fontWeight: '500',
  },

  activityTime: {
    fontSize: '12px',
    color: '#9ca3af',
  },

  // Right Panel
  rightPanel: {
    width: '320px',
    flexShrink: 0,
  },

  infoBox: {
    backgroundColor: '#e0f2fe',
    borderRadius: '8px',
    padding: '20px',
  },

  infoBoxTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 4px 0',
  },

  infoBoxSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '20px',
  },

  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },

  infoLabel: {
    fontSize: '13px',
    color: '#4b5563',
    fontWeight: '500',
  },

  infoValue: {
    fontSize: '13px',
    color: '#1f2937',
    fontWeight: '500',
  },

  progressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#ffffff',
    borderRadius: '4px',
    marginLeft: '12px',
    overflow: 'hidden',
  },

  progressFill: {
    width: '60%',
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '4px',
  },

  videoCallButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#ffffff',
    border: '2px solid #3b82f6',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#3b82f6',
    marginTop: '20px',
    marginBottom: '20px',
  },

  creatorSection: {
    marginBottom: '20px',
  },

  assigneeSection: {
    marginBottom: '0',
  },

  sectionLabel: {
    fontSize: '13px',
    color: '#4b5563',
    fontWeight: '500',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  changeButton: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontSize: '12px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },

  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
  },

  userName: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '500',
  },
}
