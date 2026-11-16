import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tasksApi } from '../api/tasks';
import { groupsApi } from '../api/groups';
import { useAuthStore } from '../store/authStore';
import { Plus, ListTodo, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Tasks() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    groupId: '',
    assignedTo: '',
    priority: 'medium',
    deadline: '',
  });

  const loadTasks = async () => {
    try {
      const params = filter !== 'all' ? { lifecycle: filter } : {};
      const res = await tasksApi.list(params);
      setTasks(res.data.tasks);
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await groupsApi.list();
      setGroups(res.data.groups);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [filter]);

  useEffect(() => {
    if (showModal && groups.length === 0) {
      loadGroups();
    }
  }, [showModal]);

  // Jab group change ho, uske members fetch karo
  const handleGroupChange = async (e) => {
    const groupId = e.target.value;
    setForm({ ...form, groupId, assignedTo: '' });
    if (!groupId) {
      setMembers([]);
      return;
    }
    try {
      const res = await groupsApi.members(groupId);
      setMembers(res.data.active);
    } catch (err) {
      toast.error('Failed to load members');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title,
        description: form.description,
        groupId: form.groupId,
        priority: form.priority,
      };
      if (form.assignedTo) payload.assignedTo = form.assignedTo;
      if (form.deadline) payload.deadline = new Date(form.deadline).toISOString();

      await tasksApi.create(payload);
      toast.success('Task created successfully!');
      setShowModal(false);
      setForm({ title: '', description: '', groupId: '', assignedTo: '', priority: 'medium', deadline: '' });
      loadTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    }
  };

  const filters = [
    { key: 'all', label: 'All Tasks' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'current', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {/* Sirf admin ya leader task bana sakte hain */}
        {(user?.role === 'admin') && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={18} /> New Task
          </button>
        )}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : tasks.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <ListTodo size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link to={`/tasks/${task.id}`} className="font-medium text-white hover:text-indigo-400">
                    {task.title}
                  </Link>
                  <div className="text-sm text-slate-500 mt-1">
                    {task.group?.name} · {task.priority} priority
                    {task.deadline && ` · Due ${new Date(task.deadline).toLocaleDateString()}`}
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ${
                    task.status === 'done' ? 'bg-green-900/30 text-green-400' :
                    task.status === 'in_progress' ? 'bg-blue-900/30 text-blue-400' :
                    'bg-yellow-900/30 text-yellow-400'
                  }`}>
                  {task.status === 'in_progress' ? 'In Progress' : task.status}
                </span>
              </div>
              {task.isOverdue && <div className="text-xs text-red-400 mt-2">⚠️ Overdue</div>}
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Create New Task</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">Task Title</label>
                <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. Design Homepage" />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" placeholder="Task details..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Group</label>
                  <select required value={form.groupId} onChange={handleGroupChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500">
                    <option value="">Select Group</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Assign To (Optional)</label>
                  <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} disabled={!form.groupId}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50">
                    <option value="">Unassigned</option>
                    {members.map((m) => <option key={m.userId} value={m.userId}>{m.user?.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Deadline (Optional)</label>
                  <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}