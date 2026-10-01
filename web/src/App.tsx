import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Biodata from './pages/Biodata';
import CaseRelease from './pages/CaseRelease';
import CaseSubmission from './pages/CaseSubmission';
import { useSession } from './hooks/useSession';
import { useIsAdmin } from './hooks/useIsAdmin';
import PitchDeck from './pages/PitchDeck';
import Pengumuman from './pages/Pengumuman';

// Lazy-load admin pages
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminTeams = lazy(() => import('./pages/admin/AdminTeams'));
const AdminTeamDetail = lazy(() => import('./pages/admin/AdminTeamDetail'));
const AdminSchedule = lazy(() => import('./pages/admin/AdminSchedule'));
const AdminCaseMaterials = lazy(() => import('./pages/admin/AdminCaseMaterials'));
const AdminSubmissions = lazy(() => import('./pages/admin/AdminSubmissions'));
const AdminPitchDecks = lazy(() => import('./pages/admin/AdminPitchDecks'));
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements'));
const AdminFinalists = lazy(() => import('./pages/admin/AdminFinalists'));
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit'));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  if (loading) return <div>Memuat...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { session, loading: sessionLoading } = useSession();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin(!!session);

  if (sessionLoading || adminLoading) return <div>Memverifikasi akses admin...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin) return <div style={{ padding: '2rem', textAlign: 'center' }}>⛔ Anda tidak memiliki akses admin.</div>;
  return <>{children}</>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Participant routes */}
        <Route path="/" element={<Layout />}>
          <Route path="login" element={<Login />} />
          <Route path="pengumuman" element={<Pengumuman />} />

          <Route index element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="biodata" element={<RequireAuth><Biodata /></RequireAuth>} />
          <Route path="case" element={<RequireAuth><CaseRelease /></RequireAuth>} />
          <Route path="submission" element={<RequireAuth><CaseSubmission /></RequireAuth>} />
          <Route path="pitch-deck" element={<RequireAuth><PitchDeck /></RequireAuth>} />
          <Route path="*" element={<div>404 - Halaman tidak ditemukan</div>} />
        </Route>

        {/* Admin routes — lazy loaded, separate layout */}
        <Route path="/admin" element={
          <RequireAdmin>
            <Suspense fallback={<div style={{ padding: '2rem' }}>Memuat panel admin...</div>}>
              <AdminLayout />
            </Suspense>
          </RequireAdmin>
        }>
          <Route index element={<Suspense fallback={<div>Memuat...</div>}><AdminDashboard /></Suspense>} />
          <Route path="teams" element={<Suspense fallback={<div>Memuat...</div>}><AdminTeams /></Suspense>} />
          <Route path="teams/:id" element={<Suspense fallback={<div>Memuat...</div>}><AdminTeamDetail /></Suspense>} />
          <Route path="schedule" element={<Suspense fallback={<div>Memuat...</div>}><AdminSchedule /></Suspense>} />
          <Route path="case-materials" element={<Suspense fallback={<div>Memuat...</div>}><AdminCaseMaterials /></Suspense>} />
          <Route path="submissions" element={<Suspense fallback={<div>Memuat...</div>}><AdminSubmissions /></Suspense>} />
          <Route path="pitch-decks" element={<Suspense fallback={<div>Memuat...</div>}><AdminPitchDecks /></Suspense>} />
          <Route path="announcements" element={<Suspense fallback={<div>Memuat...</div>}><AdminAnnouncements /></Suspense>} />
          <Route path="finalists" element={<Suspense fallback={<div>Memuat...</div>}><AdminFinalists /></Suspense>} />
          <Route path="audit" element={<Suspense fallback={<div>Memuat...</div>}><AdminAudit /></Suspense>} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
