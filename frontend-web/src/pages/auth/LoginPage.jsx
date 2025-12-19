import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import bgImage from '@/Image/Login Background.jpg'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [staySignedIn, setStaySignedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const result = await login({ username, password })
      
      if (result.success) {
        // Navigate to dashboard based on role
        navigate(result.redirectTo)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <img
        alt="background"
        style={styles.bg}
        src={bgImage}
      />
      <div style={styles.overlay} />
      <div style={styles.brandLogo}>DTV TEAM</div>
      <div style={styles.card}>
        <div style={styles.header}>Sign in</div>

        <form onSubmit={onSubmit} style={styles.form}>
          <label style={styles.label}>Username</label>
          <input
            style={styles.input}
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />

          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <div style={styles.rowBetween}>
            <label style={styles.staySignedIn}>
              <input
                type="checkbox"
                checked={staySignedIn}
                onChange={(e) => setStaySignedIn(e.target.checked)}
              />
              <span style={{ marginLeft: 8 }}>Stay signed in</span>
            </label>
            <a href="#" style={styles.link}>Forgot password?</a>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.primaryBtn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  page: {
    position: 'relative',
    minHeight: '100vh',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0b1020',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px'
  },
  bg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    filter: 'brightness(0.9)'
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(120deg, rgba(11,16,32,0.45), rgba(11,16,32,0.2))'
  },
  brandLogo: {
    position: 'absolute',
    top: 24,
    left: 32,
    fontSize: 24,
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: 2,
    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
    zIndex: 10
  },
  card: {
    position: 'relative',
    width: 440,
    maxWidth: '92%',
    margin: '0 auto',
    background: '#ffffff',
    borderRadius: 16,
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
    padding: '36px 40px',
    border: '1px solid #eef2f7'
  },
  header: { fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 20, color: '#111827' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  label: { fontSize: 13, color: '#6b7280', marginTop: 6 },
  input: {
    height: 44,
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    padding: '10px 12px',
    fontSize: 14,
    outline: 'none',
    color: '#111827'
  },
  rowBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6
  },
  staySignedIn: { display: 'flex', alignItems: 'center', fontSize: 14, color: '#374151' },
  error: {
    color: '#b91c1c',
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: 6,
    padding: '8px 10px'
  },
  success: {
    color: '#166534',
    background: '#dcfce7',
    border: '1px solid #bbf7d0',
    borderRadius: 6,
    padding: '8px 10px'
  },
  primaryBtn: {
    marginTop: 6,
    height: 48,
    borderRadius: 9999,
    width: '100%',
    border: 'none',
    background: '#ff4655',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 700,
    boxShadow: '0 6px 14px rgba(255,70,85,0.35)'
  },
  footerLinks: {
    display: 'flex',
    justifyContent: 'center',
    gap: 16,
    marginTop: 18,
    fontSize: 14
  },
  link: { color: '#6b7280', textDecoration: 'none' }
}
