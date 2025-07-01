import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Login from './components/Login';
import UserDashboard from './components/user/UserDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import OfflineIndicator from './components/OfflineIndicator';

const AppContent: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return user.isAdmin ? <AdminDashboard /> : <UserDashboard />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <OfflineIndicator />
          <AppContent />
          <PWAInstallPrompt />
        </AppProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;