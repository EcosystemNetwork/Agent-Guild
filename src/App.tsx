import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DataProvider } from './contexts/DataContext'
import { RegistryProvider } from './contexts/RegistryContext'
import { MissionProvider } from './contexts/MissionContext'
import { AirbyteProvider } from './contexts/AirbyteContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './layouts/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AgentsPage from './pages/AgentsPage'
import MissionsPage from './pages/MissionsPage'
import TrustLedgerPage from './pages/TrustLedgerPage'
import OperatorPage from './pages/OperatorPage'
import CommsPage from './pages/CommsPage'
import RegistryPage from './pages/RegistryPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected app shell */}
        <Route
          element={
            <ProtectedRoute>
              <DataProvider>
                <RegistryProvider>
                  <MissionProvider>
                    <AirbyteProvider>
                      <AppLayout />
                    </AirbyteProvider>
                  </MissionProvider>
                </RegistryProvider>
              </DataProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="missions" element={<MissionsPage />} />
          <Route path="trust" element={<TrustLedgerPage />} />
          <Route path="operator" element={<OperatorPage />} />
          <Route path="comms" element={<CommsPage />} />
          <Route path="registry" element={<RegistryPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}