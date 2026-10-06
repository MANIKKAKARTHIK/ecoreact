import { AuthProvider, useAuth } from './context/AuthContext';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import './styles.css';

function Inner() {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="setup"><h2>Loading EcoPlastic…</h2></div>;
  if (!user) return <Auth />;
  if (!profile) {
    return (
      <div className="setup">
        <h2>Profile not found</h2>
        <p>Your account exists but no user profile was found.</p>
      </div>
    );
  }
  return <Dashboard role={profile.role} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  );
}
