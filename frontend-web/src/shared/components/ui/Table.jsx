/**
 * Shared Table Components
 * Consistent table styling across all modules
 */

export function Table({ children, ...props }) {
  return (
    <div 
      style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.02)',
        ...props.style
      }}
      {...props}
    >
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed'
      }}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, ...props }) {
  return (
    <thead {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, ...props }) {
  return (
    <tbody {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, ...props }) {
  return (
    <tr 
      style={{
        borderBottom: '1px solid #f0f2f5',
        transition: 'background 0.2s',
        ...props.style
      }}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, width, align = 'left', ...props }) {
  return (
    <th 
      style={{
        padding: '16px 24px',
        textAlign: align,
        fontSize: 12,
        fontWeight: 700,
        color: '#7b809a',
        textTransform: 'uppercase',
        borderBottom: '1px solid #f0f2f5',
        background: '#fff',
        width: width,
        ...props.style
      }}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, align = 'left', ...props }) {
  return (
    <td 
      style={{
        padding: '16px 24px',
        fontSize: 14,
        verticalAlign: 'middle',
        color: '#344767',
        textAlign: align,
        ...props.style
      }}
      {...props}
    >
      {children}
    </td>
  );
}
