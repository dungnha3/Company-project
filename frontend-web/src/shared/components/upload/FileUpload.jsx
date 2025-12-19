export default function FileUpload({ onFileSelect, accept = '*', label = 'Chọn file' }) {
  const handleChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      onFileSelect(file)
    }
  }

  return (
    <div style={styles.container}>
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        style={styles.input}
        id="file-upload"
      />
      <label htmlFor="file-upload" style={styles.label}>
        📁 {label}
      </label>
    </div>
  )
}

const styles = {
  container: {
    display: 'inline-block',
  },
  input: {
    display: 'none',
  },
  label: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  }
}
