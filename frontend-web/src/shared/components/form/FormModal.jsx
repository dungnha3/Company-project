import Modal from '../feedback/Modal'

export default function FormModal({ isOpen, onClose, title, onSubmit, submitText = 'Lưu', children }) {
  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button onClick={onClose} style={styles.cancelBtn}>
            Hủy
          </button>
          <button onClick={handleSubmit} style={styles.submitBtn}>
            {submitText}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {children}
      </form>
    </Modal>
  )
}

const styles = {
  cancelBtn: {
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    cursor: 'pointer',
  }
}
