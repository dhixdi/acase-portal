import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Biodata from './pages/Biodata';
import CaseRelease from './pages/CaseRelease';
import { useSession } from './hooks/useSession';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  
  if (loading) return <div>Memuat...</div>;
  if (!session) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Public routes */}
          <Route path="login" element={<Login />} />
          <Route path="pengumuman" element={<div>Halaman Pengumuman (Segera Hadir)</div>} />

          {/* Protected routes */}
          <Route index element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          } />
          <Route path="biodata" element={
            <RequireAuth>
              <Biodata />
            </RequireAuth>
          } />
          <Route path="case" element={
            <RequireAuth>
              <CaseRelease />
            </RequireAuth>
          } />
          <Route path="profil" element={
            <RequireAuth>
              <div>Halaman Profil (Segera Hadir)</div>
            </RequireAuth>
          } />
          
          <Route path="*" element={<div>404 - Halaman tidak ditemukan</div>} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
