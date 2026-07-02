import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AppSettingsProvider, useAppSettings } from './contexts/AppSettingsContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Weather } from './pages/Weather';
import { CropRecommend } from './pages/CropRecommend';
import { DiseaseDetect } from './pages/DiseaseDetect';
import { FarmingTips } from './pages/FarmingTips';
import { MarketPrices } from './pages/MarketPrices';
import { FertilizerCalc } from './pages/FertilizerCalc';
import { GovtSchemes } from './pages/GovtSchemes';
import { Profile } from './pages/Profile';
import { ProfitEstimator } from './pages/ProfitEstimator';
import { AdminPanel } from './pages/AdminPanel';
import { NotificationsDebug } from './pages/NotificationsDebug';
import { AIAssistant } from './pages/AIAssistant';
import { OwnerAccess } from './pages/OwnerAccess';

function AppShell() {
  const { simpleMode } = useAppSettings();

  return (
    <Router>
      <div className={`flex flex-col min-h-screen ${simpleMode ? 'simple-mode' : ''}`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login />} />
          <Route path="/owner" element={<OwnerAccess />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute featureKey="farmerProfile">
                <AppLayout>
                  <Profile />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/weather"
            element={
              <ProtectedRoute featureKey="weather">
                <AppLayout>
                  <Weather />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/crop-recommend"
            element={
              <ProtectedRoute featureKey="cropRecommendation">
                <AppLayout>
                  <CropRecommend />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/disease-detect"
            element={
              <ProtectedRoute featureKey="diseaseDetection">
                <AppLayout>
                  <DiseaseDetect />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/farming-tips"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <FarmingTips />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/market-prices"
            element={
              <ProtectedRoute featureKey="marketPrices">
                <AppLayout>
                  <MarketPrices />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profit-estimator"
            element={
              <ProtectedRoute featureKey="profitEstimator">
                <AppLayout>
                  <ProfitEstimator />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/fertilizer-calc"
            element={
              <ProtectedRoute featureKey="fertilizerCalculator">
                <AppLayout>
                  <FertilizerCalc />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ai-assistant"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <AIAssistant />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/govt-schemes"
            element={
              <ProtectedRoute featureKey="govtSchemes">
                <AppLayout>
                  <GovtSchemes />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AppLayout>
                  <AdminPanel />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/notifications-debug"
            element={
              <ProtectedRoute roles={['admin']} featureKey="notificationsDebug">
                <AppLayout>
                  <NotificationsDebug />
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppSettingsProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppShell />
            </NotificationProvider>
          </AuthProvider>
        </AppSettingsProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
