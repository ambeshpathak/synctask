import { useEffect, useState } from 'react';
import { groupsApi } from '../api/groups';
import { projectsApi } from '../api/projects';
import { useAuthStore } from '../store/authStore';
import { Users, FolderOpen, ListTodo, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [groups, setGroups] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    groupsApi.list().then((res) => setGroups(res.data.groups));
    projectsApi.list().then((res) => setProjects(res.data.projects));
  }, []);

  const stats = [
    { label: 'Total Projects', value: projects.length, icon: FolderOpen, color: 'text-blue-400' },
    { label: 'Total Groups', value: groups.length, icon: Users, color: 'text-indigo-400' },
    { label: 'Active Groups', value: groups.filter(g => g.status === 'active').length, icon: ListTodo, color: 'text-green-400' },
    { label: 'System Health', value: 'Good', icon: AlertTriangle, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 border border-indigo-800/50 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
        <p className="text-slate-400 mt-1">Welcome back, {user?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">{s.label}</span>
                <Icon size={18} className={s.color} />
              </div>
              <div className="text-3xl font-bold text-white">{s.value}</div>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Recent Projects</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map(p => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <h3 className="font-semibold text-white">{p.name}</h3>
              <p className="text-sm text-slate-400 mb-2">{p.description || 'No description'}</p>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Groups: {p.groups?.length || 0}</span>
                <span>Progress: {p.stats?.progress || 0}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}