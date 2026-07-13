import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { authAPI } from './services/api';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import { ProtectedRoute, AdminRoute, PublicRoute } from './components/ProtectedRoute';
import { LoadingOverlay } from './components/common';
import './App.css';

// Temporary placeholder pages - will be created next
function PlaceholderPage({ title }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-600">This page is under construction. Please check back later.</p>
    </div>
  );
}

function AppContent() {
  const { user, logout, loading } = useAuth();

  const handleLogin = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      if (response.data.success) {
        return response.data;
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  if (loading) {
    return <LoadingOverlay message="Loading..." />;
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginPage onLogin={handleLogin} />
            </PublicRoute>
          } 
        />

        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard user={user} onLogout={logout} />
            </ProtectedRoute>
          } 
        />

        {/* Admin Only Routes */}
        <Route 
          path="/users" 
          element={
            <AdminRoute>
              <PlaceholderPage title="User Management" />
            </AdminRoute>
          } 
        />

        <Route 
          path="/audit-logs" 
          element={
            <AdminRoute>
              <PlaceholderPage title="Audit Logs" />
            </AdminRoute>
          } 
        />

        {/* Other Protected Routes */}
        <Route 
          path="/patients" 
          element={
            <ProtectedRoute>
              <PlaceholderPage title="Patient Management" />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/medicines" 
          element={
            <ProtectedRoute>
              <PlaceholderPage title="Medicine Management" />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/finance" 
          element={
            <ProtectedRoute>
              <PlaceholderPage title="Finance Management" />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/examination" 
          element={
            <ProtectedRoute>
              <PlaceholderPage title="Examination" />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/medical-records" 
          element={
            <ProtectedRoute>
              <PlaceholderPage title="Medical Records" />
            </ProtectedRoute>
          } 
        />

        {/* Default redirect */}
        <Route 
          path="/" 
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />} 
        />
        
        {/* 404 - Catch all */}
        <Route 
          path="*" 
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />} 
        />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
