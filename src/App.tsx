import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Endpoint from './pages/Endpoint'
import Providers from './pages/Providers'
import ProviderDetail from './pages/ProviderDetail'
import Settings from './pages/Settings'
import Logs from './pages/Logs'
import Usage from './pages/Usage'
import Quota from './pages/Quota'
import AuthFiles from './pages/AuthFiles'
import ProxyPool from './pages/ProxyPool'
import Playground from './pages/Playground'
import Combos from './pages/Combos'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/endpoint" element={<Endpoint />} />
          <Route path="/admin/providers" element={<Providers />} />
          <Route path="/admin/providers/:id" element={<ProviderDetail />} />
          <Route path="/admin/settings" element={<Settings />} />
          <Route path="/admin/logs" element={<Logs />} />
          <Route path="/admin/usage" element={<Usage />} />
          <Route path="/admin/quota" element={<Quota />} />
          <Route path="/admin/auth-files" element={<AuthFiles />} />
          <Route path="/admin/proxy-pool" element={<ProxyPool />} />
          <Route path="/admin/playground" element={<Playground />} />
          <Route path="/admin/combos" element={<Combos />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
