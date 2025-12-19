/**
 * Shared StatCard Component
 * Replaces duplicate StatCard implementations across modules
 */
export function StatCard({ title, value, icon, color, bg, ...props }) {
  return (
    <div 
      style={{
        padding: 20,
        borderRadius: 16,
        border: '1px solid',
        borderColor: color + '40',
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        ...props.style
      }}
      {...props}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 10
      }}>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#67748e',
          textTransform: 'uppercase'
        }}>
          {title}
        </span>
        <span style={{ fontSize: 18, color: color }}>
          {icon}
        </span>
      </div>
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        color: color
      }}>
        {value}
      </div>
    </div>
  );
}
