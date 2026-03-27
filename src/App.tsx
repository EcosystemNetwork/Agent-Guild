import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RegistryProvider } from './contexts/RegistryContext'
import { MissionProvider } from './contexts/MissionContext'
import AppLayout from './layouts/AppLayout'
import DashboardPage from './pages/DashboardPage'
import AgentsPage from './pages/AgentsPage'
import MissionsPage from './pages/MissionsPage'
import TrustLedgerPage from './pages/TrustLedgerPage'
import OperatorPage from './pages/OperatorPage'
import CommsPage from './pages/CommsPage'
import RegistryPage from './pages/RegistryPage'

export default function App() {
  return (
    <RegistryProvider>
      <MissionProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="missions" element={<MissionsPage />} />
            <Route path="trust" element={<TrustLedgerPage />} />
            <Route path="operator" element={<OperatorPage />} />
            <Route path="comms" element={<CommsPage />} />
            <Route path="registry" element={<RegistryPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </MissionProvider>
    </RegistryProvider>
  )
}
