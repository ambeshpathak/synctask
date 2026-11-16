import { useEffect, useState } from 'react';
import { issuesApi } from '../api/issues';
import { groupsApi } from '../api/groups';
import { useAuthStore } from '../store/authStore';
import { AlertCircle, Plus, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Issues() {
  const { user } = useAuthStore();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', type: 'general', priority: 'medium', groupId: '' });

  const loadIssues = async () => {
    try {
      const res = await issuesApi.list();
      setIssues(res.data.issues);
    } catch (err) {
      toast.error('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, []);

  useEffect(() => {
    if (showModal && groups.length === 0) {
      groupsApi.list().then((res) => setGroups(res.data.groups)).catch(() => {});
    }
  }, [showModal]);

  const handleRaise = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.groupId) delete payload.groupId;
      await issuesApi.raise(payload);
      toast.success('Issue raised!');
      setShowModal(false);
      setForm({ title: '', description: '', type: 'general', priority: 'medium', groupId: '' });
      loadIssues();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to raise issue');
    }
  };

  const handleResolve = async (id) => {
    const note = prompt('Resolution note (optional):');
    try {
      await issuesApi.resolve(id, { resolutionNote: note });
      toast.success('Issue resolved!');
      loadIssues();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Issues</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={18} /> Raise Issue
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : issues.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <AlertCircle size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No issues found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <div key={issue.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-white">{issue.title}</h3>
                    {issue.priority === 'critical' && <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full">Critical</span>}
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{issue.description}</p>
                  <div className="text-xs text-slate-500">Raised by {issue.raiser?.name} · {new Date(issue.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    issue.status === 'open' ? 'bg-red-900/30 text-red-400' :
                    issue.status === 'resolved' ? 'bg-green-900/30 text-green-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {issue.status}
                  </span>
                  {issue.status === 'open' && (user?.role === 'admin' || issue.raisedBy === user?.id || issue.assignee?.id === user?.id) && (
                    <button onClick={() => handleResolve(issue.id)} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300">
                      <CheckCircle size={14} /> Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Raise Issue Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-white mb-4">Raise New Issue</h2>
            <form onSubmit={handleRaise} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Title</label>
                <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" placeholder="Brief summary..." />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Description</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" placeholder="Detailed description..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white">
                    <option value="general">General</option>
                    <option value="blocking">Blocking</option>
                    <option value="task">Task related</option>
                    <option value="project">Project related</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Related Group (optional)</label>
                <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white">
                  <option value="">None</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium">Raise Issue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}