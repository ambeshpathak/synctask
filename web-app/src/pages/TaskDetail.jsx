import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tasksApi } from '../api/tasks';
import { commentsApi } from '../api/comments';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Play, Pause, CheckCircle, Clock, MessageSquare, Send, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  const loadTask = async () => {
    try {
      const res = await tasksApi.detail(id);
      setTask(res.data.task);
      // Load comments
      try {
        const cRes = await commentsApi.taskComments(id);
        setComments(cRes.data.comments);
      } catch (cErr) {
        // If no access to comments, ignore
        console.log('No comment access');
      }
    } catch (err) {
      toast.error('Failed to load task');
      navigate('/tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [id]);

  const handleAction = async (action) => {
    try {
      await action(id);
      toast.success('Task updated!');
      loadTask();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await commentsApi.create({
        content: newComment,
        type: 'task',
        groupId: task.groupId,
        taskId: task.id,
      });
      setNewComment('');
      toast.success('Comment added');
      loadTask(); // Reload to get comments
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to comment');
    }
  };

  if (loading) return <div className="text-slate-400">Loading task...</div>;
  if (!task) return <div className="text-white">Task not found</div>;

  const isAssignee = task.assignedTo === user?.id || user?.role === 'admin';
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={20} /> Back to Tasks
      </button>

      {/* Task Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{task.title}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-400 flex-wrap">
              <span className="bg-slate-800 px-3 py-1 rounded-lg">{task.group?.name}</span>
              <span className={`px-3 py-1 rounded-lg ${
                task.priority === 'high' ? 'bg-red-900/30 text-red-400' : 'bg-slate-800'
              }`}>
                {task.priority} priority
              </span>
              {task.deadline && (
                <span className={`flex items-center gap-1 px-3 py-1 rounded-lg ${isOverdue ? 'bg-red-900/30 text-red-400' : 'bg-slate-800'}`}>
                  <Clock size={14} /> {new Date(task.deadline).toLocaleString()}
                  {isOverdue && ' (Overdue)'}
                </span>
              )}
            </div>
          </div>
          <div>
            <span className={`text-sm px-4 py-2 rounded-lg font-medium ${
              task.status === 'done' ? 'bg-green-600 text-white' :
              task.status === 'in_progress' ? 'bg-blue-600 text-white' :
              'bg-yellow-600 text-white'
            }`}>
              {task.status === 'in_progress' ? 'In Progress' : task.status.toUpperCase()}
            </span>
          </div>
        </div>

        <p className="text-slate-300 mb-6 whitespace-pre-wrap">{task.description || 'No description provided.'}</p>

        {/* Timer / Actions */}
        {isAssignee && task.status !== 'done' && (
          <div className="flex gap-3 pt-4 border-t border-slate-800">
            {task.status === 'todo' && (
              <button onClick={() => handleAction(tasksApi.start)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                <Play size={18} /> Start Timer
              </button>
            )}
            {task.status === 'in_progress' && (
              <>
                <button onClick={() => handleAction(tasksApi.pause)} className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                  <Pause size={18} /> Pause
                </button>
                <button onClick={() => handleAction(tasksApi.complete)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                  <CheckCircle size={18} /> Mark Complete
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3">Assignee</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                {task.assignee?.name?.[0] || 'U'}
              </div>
              <div>
                <div className="text-white text-sm font-medium">{task.assignee?.name || 'Unassigned'}</div>
                <div className="text-xs text-slate-500">{task.assignee?.designation || '-'}</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3">Task Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Created</span>
                <span className="text-white">{new Date(task.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Est. Hours</span>
                <span className="text-white">{task.estimatedHours || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Comments */}
        <div className="md:col-span-2">
          <div className="bg-slate-900 border border-slate-800 rounded-xl h-full flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2">
              <MessageSquare size={18} className="text-indigo-400" />
              <h3 className="text-white font-semibold">Discussion ({comments.length})</h3>
            </div>
            
            <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[400px]">
              {comments.length === 0 ? (
                <p className="text-slate-500 text-center text-sm py-4">No comments yet. Start the discussion!</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {c.author?.name?.[0]}
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-white">{c.author?.name}</span>
                        <span className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-300 mt-1">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleComment} className="p-4 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Type a comment..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg">
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}