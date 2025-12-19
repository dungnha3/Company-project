export const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 40px',
    textAlign: 'center',
  },

  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },

  emptyTitle: {
    fontSize: '16px',
    color: '#64748b',
  },

  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    marginBottom: '16px',
  },

  toolbarLeft: {
    display: 'flex',
    gap: '12px',
  },

  createButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  filterButton: {
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  boardContainer: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    flex: 1,
    paddingBottom: '16px',
  },

  column: {
    minWidth: '300px',
    maxWidth: '300px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    height: 'fit-content',
    maxHeight: 'calc(100vh - 300px)',
    transition: 'background-color 0.2s',
  },

  columnDragOver: {
    backgroundColor: '#e0f2fe',
    border: '2px dashed #3b82f6',
  },

  columnHeader: {
    padding: '12px 16px',
    borderRadius: '8px 8px 0 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  columnTitle: {
    fontSize: '14px',
    fontWeight: '600',
    flex: 1,
  },

  columnCount: {
    fontSize: '12px',
    color: '#64748b',
    backgroundColor: '#ffffff',
    padding: '2px 8px',
    borderRadius: '10px',
  },

  addButton: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    transition: 'all 0.2s',
  },

  cardList: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '12px',
    border: '1px solid #e2e8f0',
    cursor: 'move',
    transition: 'all 0.2s',
    userSelect: 'none',
  },

  cardDragging: {
    opacity: 0.5,
    cursor: 'grabbing',
  },

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },

  issueKey: {
    fontSize: '11px',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontWeight: '600',
  },

  dueDate: {
    fontSize: '11px',
    color: '#64748b',
  },

  cardTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#0f172a',
    marginBottom: '8px',
    lineHeight: '1.4',
  },

  cardDescription: {
    fontSize: '12px',
    color: '#64748b',
    lineHeight: '1.5',
    marginBottom: '12px',
  },

  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  priorityBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '500',
  },

  assignee: {
    display: 'flex',
    alignItems: 'center',
  },

  assigneeAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '600',
  },
}
