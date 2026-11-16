import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tasksApi } from '../api/tasks';
import toast from 'react-hot-toast';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = async () => {
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

  useEffect(() => {
    load();
  }, [filter]);

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'current', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">My Tasks</h1>
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : tasks.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <p className="text-slate-400">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/tasks/${task.id}`}
                    className="font-medium text-white hover:text-indigo-400"
                  >
                    {task.title}
                  </Link>
                  <div className="text-sm text-slate-500 mt-1">
                    {task.group?.name} · {task.priority}
                    {task.deadline &&
                      ` · Due ${new Date(task.deadline).toLocaleDateString()}`}
                  </div>
                </div>
                <span
                  className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ${
                    task.status === 'done'
                      ? 'bg-green-900/30 text-green-400'
                      : task.status === 'in_progress'
                      ? 'bg-blue-900/30 text-blue-400'
                      : 'bg-yellow-900/30 text-yellow-400'
                  }`}
                >
                  {task.status === 'in_progress' ? 'In Progress' : task.status}
                </span>
              </div>
              {task.isOverdue && (
                <div className="text-xs text-red-400 mt-2">⚠️ Overdue</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}