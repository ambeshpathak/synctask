import { useEffect, useState } from 'react';
import { tasksApi } from '../api/tasks';
import { groupsApi } from '../api/groups';
import { ArrowRightLeft, Clock, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Transfer Modal State
  const [transferModal, setTransferModal] = useState(null);
  const [members, setMembers] = useState([]);
  const [transferData, setTransferData] = useState({ toUserId: '', reason: '' });

  const loadTasks = async () => {
    try {
      const res = await tasksApi.list(); // Admin ko saare tasks milenge
      setTasks(res.data.tasks);
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const openTransfer = async (task) => {
    setTransferModal(task);
    setTransferData({ toUserId: '', reason: '' });
    try {
      // Us task ke group ke members fetch karo
      const res = await groupsApi.members(task.groupId);
      // Current assignee ko list se hata do
      setMembers(res.data.active.filter(m => m.userId !== task.assignedTo));
    } catch (err) {
      toast.error('Failed to load members');
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      await tasksApi.transfer(transferModal.id, transferData);
      toast.success('Task transferred successfully!');
      setTransferModal(null);
      loadTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">All Tasks</h1>
        <span className="text-sm text-slate-400">Total: {tasks.length}</span>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-white">{task.title}</h3>
                  {task.isOverdue && <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={12}/> Overdue</span>}
                </div>
                <div className="text-sm text-slate-400 flex items-center gap-3">
                  <span>Group: {task.group?.name}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    Assignee: <span className="text-indigo-400">{task.assignee?.name || 'Unassigned'}</span>
                  </span>
                  {task.deadline && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Clock size={14}/> {new Date(task.deadline).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs px-3 py-1 rounded-full ${
                  task.status === 'done' ? 'bg-green-900/30 text-green-400' :
                  task.status === 'in_progress' ? 'bg-blue-900/30 text-blue-400' :
                  'bg-yellow-900/30 text-yellow-400'
                }`}>
                  {task.status.replace('_', ' ').toUpperCase()}
                </span>
                <button onClick={() => openTransfer(task)} className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors">
                  <ArrowRightLeft size={16} /> Transfer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TRANSFER MODAL */}
      {transferModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Transfer Task</h2>
              <button onClick={() => setTransferModal(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="bg-slate-800 p-3 rounded-lg mb-4 text-sm text-slate-300">
              <strong>Task:</strong> {transferModal.title}<br/>
              <strong>Current Assignee:</strong> {transferModal.assignee?.name || 'Unassigned'}
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Transfer To</label>
                <select required value={transferData.toUserId} onChange={(e) => setTransferData({...transferData, toUserId: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white">
                  <option value="">Select Member...</option>
                  {members.map(m => <option key={m.userId} value={m.userId}>{m.user?.name} ({m.user?.designation})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Reason (Optional)</label>
                <input type="text" value={transferData.reason} onChange={(e) => setTransferData({...transferData, reason: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white" placeholder="e.g. Priya is on leave" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium">Transfer Task</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}