import { useEffect, useState } from 'react';
import { groupsApi } from '../api/groups';
import { tasksApi } from '../api/tasks';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Activity, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444'];

export default function Visualization() {
  const [groups, setGroups] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [grpsRes, tasksRes] = await Promise.all([
        groupsApi.list(),
        tasksApi.list(), // Admin ko saare tasks milenge
      ]);
      setGroups(grpsRes.data.groups);
      setTasks(tasksRes.data.tasks);
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <div className="text-slate-400">Loading analytics...</div>;

  // Graph Data taiyaar karo
  const taskStatusData = [
    { name: 'Done', value: tasks.filter(t => t.status === 'done').length },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length },
    { name: 'Todo', value: tasks.filter(t => t.status === 'todo').length },
    { name: 'Overdue', value: tasks.filter(t => t.isOverdue).length },
  ];

  const groupProgressData = groups.map(g => {
    const groupTasks = tasks.filter(t => t.groupId === g.id);
    const done = groupTasks.filter(t => t.status === 'done').length;
    const progress = groupTasks.length === 0 ? 0 : Math.round((done / groupTasks.length) * 100);
    return {
      name: g.name,
      progress: progress,
      total: groupTasks.length
    };
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const overdueTasks = tasks.filter(t => t.isOverdue).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">System Visualization</h1>
        <span className="text-xs bg-indigo-900/30 text-indigo-400 px-3 py-1 rounded-full border border-indigo-800 animate-pulse">Live Updates</span>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-900/30 rounded-lg"><Activity className="text-blue-400" size={24} /></div>
          <div><div className="text-2xl font-bold text-white">{totalTasks}</div><div className="text-sm text-slate-400">Total Tasks</div></div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-green-900/30 rounded-lg"><CheckCircle className="text-green-400" size={24} /></div>
          <div><div className="text-2xl font-bold text-white">{completedTasks}</div><div className="text-sm text-slate-400">Completed Tasks</div></div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-red-900/30 rounded-lg"><AlertTriangle className="text-red-400" size={24} /></div>
          <div><div className="text-2xl font-bold text-white">{overdueTasks}</div><div className="text-sm text-slate-400">Overdue Tasks</div></div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Task Distribution (Pie Chart) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Task Distribution</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Group Progress (Bar Chart) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Group Progress (%)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupProgressData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" />
                <YAxis dataKey="name" type="category" stroke="#64748b" width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} cursor={{fill: '#334155'}} />
                <Bar dataKey="progress" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}