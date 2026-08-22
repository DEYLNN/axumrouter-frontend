import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Endpoint from './pages/Endpoint'
import Providers from './pages/Providers'
import ProviderDetail from './pages/ProviderDetail'
import Settings from './pages/Settings'
import Usage from './pages/Usage'
import Quota from './pages/Quota'
import AuthFiles from './pages/AuthFiles'
import Logs from './pages/Logs'
import ProxyPool from './pages/ProxyPool'
import Playground from './pages/Playground'
import Sources from './pages/Sources'
import Login from './pages/Login'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/endpoint" element={<Endpoint />} />
            <Route path="/admin/providers" element={<Providers />} />
            <Route path="/admin/providers/:id" element={<ProviderDetail />} />
            <Route path="/admin/settings" element={<Settings />} />
            <Route path="/admin/usage" element={<Usage />} />
            <Route path="/admin/quota" element={<Quota />} />
            <Route path="/admin/auth-files" element={<AuthFiles />} />
            <Route path="/admin/logs" element={<Logs />} />
            <Route path="/admin/proxy-pool" element={<ProxyPool />} />
            <Route path="/admin/playground" element={<Playground />} />
            <Route path="/admin/sources" element={<Sources />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
