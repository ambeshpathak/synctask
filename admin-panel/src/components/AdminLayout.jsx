import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LayoutDashboard, FolderOpen, Users, ListTodo, AlertCircle, LogOut, Bell, BarChart3 } from 'lucide-react';

export default function AdminLayout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: FolderOpen, label: 'Projects', path: '/projects' },
    { icon: Users, label: 'Groups', path: '/groups' },
    { icon: ListTodo, label: 'Tasks', path: '/tasks' },
    { icon: AlertCircle, label: 'Issues', path: '/issues' },
    { icon: BarChart3, label: 'Visualization', path: '/visualization' },
  ];

  return (
    <div className="min-h-screen flex bg-slate-950">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-20">
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white">SyncTask <span className="text-xs text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded">Admin</span></h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white flex-shrink-0">{user?.name?.[0] || 'A'}</div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate text-white">{user?.name}</div>
              <div className="text-xs text-indigo-400 truncate">{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors">
            <LogOut size={20} /><span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-64">
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-white">{navItems.find((n) => n.path === location.pathname)?.label || 'Admin'}</h2>
          <Bell size={22} className="text-slate-400" />
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}