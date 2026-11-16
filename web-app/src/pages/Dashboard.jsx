import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tasksApi } from '../api/tasks';
import { groupsApi } from '../api/groups';
import { useAuthStore } from '../store/authStore';
import useRealtimeTasks from '../hooks/useRealtimeTasks'; // 👈 Naya import add kiya
import { Play, Pause, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [upcoming, setUpcoming] = useState([]);
  const [current, setCurrent] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [up, cur, comp, grps] = await Promise.all([
        tasksApi.list({ lifecycle: 'upcoming' }),
        tasksApi.list({ lifecycle: 'current' }),
        tasksApi.list({ lifecycle: 'completed' }),
        groupsApi.list(),
      ]);
      setUpcoming(up.data.tasks);
      setCurrent(cur.data.tasks);
      setCompleted(comp.data.tasks);
      setGroups(grps.data.groups);
    } catch (err) {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // 👇 Yeh line real-time updates ko activate karti hai
  useRealtimeTasks(load);

  const handleAction = async (action, taskId) => {
    try {
      await action(taskId);
      toast.success('Done!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  if (loading) {
    return <div className="text-slate-400">Loading...</div>;
  }

  const stats = [
    { label: 'Upcoming', value: upcoming.length, icon: Clock, color: 'text-yellow-400' },
    { label: 'In Progress', value: current.length, icon: Play, color: 'text-blue-400' },
    { label: 'Completed', value: completed.length, icon: CheckCircle, color: 'text-green-400' },
    { label: 'Groups', value: groups.length, icon: AlertTriangle, color: 'text-indigo-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome, {user?.name} 👋</h1>
        <p className="text-indigo-100 mt-1">
          {user?.designation} · {user?.role}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Current Tasks */}
      {current.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Currently Working</h2>
          <div className="space-y-3">
            {current.map((t) => (
              <TaskCard key={t.id} task={t} onAction={handleAction} full />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">
          Upcoming Tasks ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
            No upcoming tasks
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {upcoming.map((t) => (
              <TaskCard key={t.id} task={t} onAction={handleAction} />
            ))}
          </div>
        )}
      </div>

      {/* Completed */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">
          Completed ({completed.length})
        </h2>
        {completed.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
            No completed tasks
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {completed.slice(0, 6).map((t) => (
              <TaskCard key={t.id} task={t} onAction={handleAction} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, onAction, full }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <Link
            to={`/tasks/${task.id}`}
            className="font-medium text-white hover:text-indigo-400 line-clamp-1"
          >
            {task.title}
          </Link>
          <div className="text-xs text-slate-500 mt-1">
            {task.group?.name}
            {task.deadline && ` · Due ${new Date(task.deadline).toLocaleDateString()}`}
          </div>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
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

      {task.isOverdue && <div className="text-xs text-red-400 mb-2">⚠️ Overdue</div>}

      {full && (
        <div className="flex gap-2 mt-3">
          {task.status === 'todo' && (
            <button
              onClick={() => onAction(tasksApi.start, task.id)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-1.5 rounded-lg"
            >
              Start
            </button>
          )}
          {task.status === 'in_progress' && (
            <>
              <button
                onClick={() => onAction(tasksApi.pause, task.id)}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm py-1.5 rounded-lg"
              >
                Pause
              </button>
              <button
                onClick={() => onAction(tasksApi.complete, task.id)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-1.5 rounded-lg"
              >
                Complete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}