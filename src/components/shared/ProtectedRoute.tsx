import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { empresaService } from '../../services/empresaService'

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  const onboardingCompleto = useAuthStore(s => s.onboardingCompleto)
  const setOnboardingCompleto = useAuthStore(s => s.setOnboardingCompleto)
  const location = useLocation()
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || onboardingCompleto !== null) return
    setChecking(true)
    empresaService.getConfiguracao()
      .then(cfg => setOnboardingCompleto(cfg.id !== null))
      .catch(() => setOnboardingCompleto(false))
      .finally(() => setChecking(false))
  }, [isAuthenticated, onboardingCompleto, setOnboardingCompleto])

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (onboardingCompleto === null || checking) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: '#FAFAF8' }}>
        <span style={{ width: 28, height: 28, border: '3px solid #EFEDE8', borderTopColor: '#2A9D8F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />
      </div>
    )
  }

  if (!onboardingCompleto && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  if (onboardingCompleto && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
