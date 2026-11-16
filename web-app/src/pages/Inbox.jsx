import { useEffect, useState } from 'react';
import { commentsApi } from '../api/comments';
import { groupsApi } from '../api/groups';
import { useAuthStore } from '../store/authStore';
import { Send, Inbox as InboxIcon, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Inbox() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('inbox'); // 'inbox' | 'sent' | 'compose'
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Compose state
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ groupId: '', recipientId: '', content: '' });

  const loadMessages = async () => {
    setLoading(true);
    try {
      if (tab === 'inbox') {
        const res = await commentsApi.inbox();
        setMessages(res.data.comments);
      } else if (tab === 'sent') {
        const res = await commentsApi.sent();
        setMessages(res.data.comments);
      }
    } catch (err) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== 'compose') loadMessages();
  }, [tab]);

  // Load groups for compose
  useEffect(() => {
    if (tab === 'compose' && groups.length === 0) {
      groupsApi.list().then((res) => setGroups(res.data.groups)).catch(() => {});
    }
  }, [tab]);

  // Load members when group is selected
  const handleGroupChange = async (e) => {
    const groupId = e.target.value;
    setForm({ ...form, groupId, recipientId: '' });
    if (!groupId) return setMembers([]);
    try {
      const res = await groupsApi.members(groupId);
      // Khud ko list se hata do
      setMembers(res.data.active.filter((m) => m.userId !== user.id));
    } catch (err) {
      toast.error('Failed to load members');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      await commentsApi.create({
        type: 'private',
        groupId: form.groupId,
        recipientId: form.recipientId,
        content: form.content,
      });
      toast.success('Message sent!');
      setTab('sent');
      setForm({ groupId: '', recipientId: '', content: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2">
          <button onClick={() => setTab('inbox')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${tab === 'inbox' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
            <InboxIcon size={16} /> Inbox
          </button>
          <button onClick={() => setTab('sent')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${tab === 'sent' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
            <ArrowUpRight size={16} /> Sent
          </button>
        </div>
        <button onClick={() => setTab('compose')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Send size={16} /> New Message
        </button>
      </div>

      {/* Content */}
      {tab === 'compose' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl">
          <h2 className="text-lg font-bold text-white mb-4">Send Private Message</h2>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Select Group</label>
              <select required value={form.groupId} onChange={handleGroupChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500">
                <option value="">Choose a group...</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Recipient</label>
              <select required value={form.recipientId} onChange={(e) => setForm({ ...form, recipientId: e.target.value })} disabled={!form.groupId} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50">
                <option value="">Choose a member...</option>
                {members.map((m) => <option key={m.userId} value={m.userId}>{m.user?.name} ({m.role})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Message</label>
              <textarea required rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" placeholder="Type your message..." />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setTab('inbox')} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg">Cancel</button>
              <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">Send Message</button>
            </div>
          </form>
        </div>
      ) : loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : messages.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400">
          No messages in {tab}.
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                    {(tab === 'inbox' ? msg.author?.name : msg.recipient?.name)?.[0] || 'U'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {tab === 'inbox' ? `From: ${msg.author?.name}` : `To: ${msg.recipient?.name}`}
                    </div>
                    <div className="text-xs text-slate-500">{new Date(msg.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>
              <p className="text-slate-300 text-sm mt-2">{msg.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}