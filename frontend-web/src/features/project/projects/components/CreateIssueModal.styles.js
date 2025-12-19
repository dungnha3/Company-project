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
    boxSizing: 'border-box',
  },
  
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#1e293b',
    transition: 'border-color 0.2s',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
    boxSizing: 'border-box',
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
    transition: 'border-color 0.2s',
    outline: 'none',
    boxSizing: 'border-box',
  },
  
  helperText: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px',
  },
  
  errorBox: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
    border: '1px solid #fecaca',
  },
  
  infoBox: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '13px',
    border: '1px solid #bfdbfe',
  },
  
  // Modal footer
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0',
  },
  
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: 'white',
    color: '#64748b',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  submitBtn: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
}
