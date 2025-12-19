import './App.css'
import { AuthProvider } from './features/auth/context/AuthContext'
import { ToastProvider } from './shared/components/ui'
import AppRouter from './routes'

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AuthProvider>
  )
}

export default App

