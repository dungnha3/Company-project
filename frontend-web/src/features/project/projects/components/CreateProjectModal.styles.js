export const styles = {
  // Modal overlay
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  
  // Modal content
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  
  // Modal header
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e2e8f0',
  },
  
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'all 0.2s',
  },
  
  // Form
  form: {
    padding: '24px',
  },
  
  section: {
    marginBottom: '32px',
  },
  
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '16px',
  },
  
  formGroup: {
    marginBottom: '16px',
  },
  
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569',
    marginBottom: '6px',
  },
  
  required: {
    color: '#ef4444',
  },
  
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#1e293b',
    transition: 'border-color 0.2s',
    outline: 'none',
  },
  
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#1e293b',
    resize: 'vertical',
    fontFamily: 'inherit',
    outline: 'none',
  },
  
  // Email input section
  emailRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    alignItems: 'center',
  },
  
  emailInput: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  },
  
  addBtn: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  
  removeBtn: {
    padding: '8px 12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '18px',
    cursor: 'pointer',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  addMoreBtn: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#3b82f6',
    border: '1px dashed #3b82f6',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    width: '100%',
  },
  
  // Members list
  membersList: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  
  membersTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '12px',
  },
  
  memberCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    marginBottom: '8px',
    border: '1px solid #e2e8f0',
  },
  
  memberInfo: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  
  memberAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
  },
  
  memberName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  
  memberEmail: {
    fontSize: '13px',
    color: '#64748b',
  },
  
  memberActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  
  roleSelect: {
    padding: '6px 10px',
    border: '1px solid #cbd5e0',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  
  removeMemberBtn: {
    padding: '6px 12px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  
  // Info box
  infoBox: {
    padding: '12px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
    border: '1px solid #bfdbfe',
  },
  
  // Error box
  errorBox: {
    padding: '12px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
    border: '1px solid #fecaca',
  },
  
  // Modal footer
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },
  
  cancelBtn: {
    padding: '10px 24px',
    backgroundColor: 'white',
    color: '#475569',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  
  submitBtn: {
    padding: '10px 24px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
}
