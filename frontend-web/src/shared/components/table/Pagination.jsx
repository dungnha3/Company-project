export default function Pagination({ currentPage, totalPages, onPageChange }) {
  return (
    <div style={styles.container}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={styles.btn}
      >
        ← Trước
      </button>
      
      <span style={styles.info}>
        Trang {currentPage} / {totalPages}
      </span>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={styles.btn}
      >
        Sau →
      </button>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '16px',
  },
  btn: {
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  info: {
    fontSize: '14px',
    color: '#6b7280',
  }
}
