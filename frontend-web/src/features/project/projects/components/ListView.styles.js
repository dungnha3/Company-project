export const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    // Quan trọng: Để menu dropdown không bị cắt khuất khi hiển thị ra ngoài bảng
    overflow: 'visible',
    minHeight: '400px',
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
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40px',
    marginBottom: '24px',
  },

  emptyTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: '12px',
  },

  emptyText: {
    fontSize: '14px',
    color: '#64748b',
    maxWidth: '500px',
    lineHeight: '1.6',
    marginBottom: '24px',
  },

  createButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },

  toolbarLeft: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },

  filterButton: {
    padding: '6px 12px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },

  toolbarRight: {
    display: 'flex',
    gap: '8px',
  },

  iconButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  tableContainer: {
    // Để dropdown hiển thị đè lên trên, ta dùng visible. 
    // Nếu bảng quá rộng, bạn có thể cần điều chỉnh layout tổng thể.
    overflowX: 'visible',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },

  tableHead: {
    backgroundColor: '#f8fafc',
  },

  tableHeader: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },

  tableRow: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#f8fafc',
    },
  },

  tableCell: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#334155',
    whiteSpace: 'nowrap',
    verticalAlign: 'top', // Căn trên để layout dọc đẹp hơn
  },

  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },

  issueName: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '500',
  },

  issueKey: {
    fontSize: '12px',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace',
  },

  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },

  priorityBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },

  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  userAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
  },

  userName: {
    fontSize: '13px',
    color: '#475569',
  },

  // --- STYLE MỚI CHO CỘT NGƯỜI ĐƯỢC PHÂN CÔNG ---
  assigneeContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer', // Thêm con trỏ tay để biết là click được
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#f1f5f9', // Hiệu ứng hover nhẹ
    }
  },

  assigneeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  assigneeNameText: {
    fontSize: '14px',
    color: '#334155',
  },

  unassignedText: {
    fontSize: '13px',
    color: '#94a3b8',
    fontStyle: 'italic',
  },

  emptyAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#ffffff', // Nền trắng
    border: '1px dashed #cbd5e1', // Viền nét đứt hoặc liền tùy ý (ảnh là liền mờ)
    color: '#cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  circleAddButton: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '1px dashed #cbd5e1', // Đổi viền nét đứt cho nhẹ nhàng hơn (tùy chọn)
    backgroundColor: 'transparent',
    color: '#64748b',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none',
    flexShrink: 0, // Đảm bảo nút không bị méo khi tên dài
    ':hover': {
      borderColor: '#3b82f6',
      color: '#3b82f6',
      backgroundColor: '#f1f5f9',
      borderStyle: 'solid',
    }
  },

  // Menu thả xuống
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: '0',
    marginTop: '4px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    zIndex: 20,
    minWidth: '220px',
    maxHeight: '240px',
    overflowY: 'auto',
    padding: '4px',
  },

  dropdownHeader: {
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    borderBottom: '1px solid #f1f5f9',
    marginBottom: '4px',
  },

  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'background-color 0.1s',
    ':hover': {
      backgroundColor: '#f1f5f9',
    }
  },

  dropdownItemName: {
    fontSize: '13px',
    color: '#334155',
    flex: 1,
  },

  roleBadge: {
    fontSize: '10px',
    padding: '2px 6px',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderRadius: '4px',
    fontWeight: '500',
  },

  // Editable cell styles
  editableCell: {
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    display: 'inline-block',
  },
  editableCellHover: {
    backgroundColor: '#f1f5f9',
  },
  editInput: {
    flex: 1,
    padding: '6px 10px',
    border: '2px solid #3b82f6',
    borderRadius: '4px',
    fontSize: '14px',
    outline: 'none',
    minWidth: '200px',
    zIndex: 20,
    position: 'relative',
    backgroundColor: '#fff',
    fontFamily: 'inherit',
  },
  dateInput: {
    padding: '6px 10px',
    border: '2px solid #3b82f6',
    borderRadius: '4px',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    zIndex: 20,
    position: 'relative',
    backgroundColor: '#fff',
    fontFamily: 'inherit',
  },
}