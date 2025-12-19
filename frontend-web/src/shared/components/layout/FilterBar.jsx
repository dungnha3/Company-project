export default function FilterBar({ filters = [] }) {
  return (
    <div style={styles.container}>
      {filters.map((filter, idx) => (
        <div key={idx} style={styles.filterItem}>
          {filter.label && <label style={styles.label}>{filter.label}</label>}
          {filter.type === 'search' ? (
            <input
              type="text"
              placeholder={filter.placeholder || 'Tìm kiếm...'}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              style={styles.input}
            />
          ) : (
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              style={styles.select}
            >
              {filter.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  filterItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '200px',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '150px',
    cursor: 'pointer',
  }
}
