import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Groups from './pages/Groups';
import Tasks from './pages/Tasks';
import Issues from './pages/Issues';
import Visualization from './pages/Visualization';
import AdminLayout from './components/AdminLayout';

function ProtectedAdmin({ children }) {
  const { user, loading, fetchMe } = useAuthStore();
  useEffect(() => { if (!user && loading) fetchMe(); }, [user, loading, fetchMe]);
  
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin' && user.role !== 'leader') return <Navigate to="/login" replace />;
  
  return <AdminLayout>{children}</AdminLayout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedAdmin><Dashboard /></ProtectedAdmin>} />
        <Route path="/projects" element={<ProtectedAdmin><Projects /></ProtectedAdmin>} />
        <Route path="/groups" element={<ProtectedAdmin><Groups /></ProtectedAdmin>} />
        <Route path="/tasks" element={<ProtectedAdmin><Tasks /></ProtectedAdmin>} />
        <Route path="/issues" element={<ProtectedAdmin><Issues /></ProtectedAdmin>} />
        <Route path="/visualization" element={<ProtectedAdmin><Visualization /></ProtectedAdmin>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}