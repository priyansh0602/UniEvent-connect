// src/components/EventManagementModal.jsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { X, Shield, MessageSquare, Send, UserPlus, UserMinus, RefreshCw, Users, Crown, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

// --- In-App Confirmation Dialog ---
function ConfirmDialog({ title, message, confirmLabel, confirmStyle, onConfirm, onCancel }) {
  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[80] p-4 rounded-2xl" onClick={onCancel}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-white">{title}</h3>
        </div>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-bold text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition">Cancel</button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 text-sm font-bold text-white rounded-lg transition ${confirmStyle || 'bg-red-600 hover:bg-red-500'}`}>{confirmLabel || 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}

// --- In-App Toast ---
function Toast({ message, type, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 3000); return () => clearTimeout(t); }, [onDismiss]);
  return (
    <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 z-[80] px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2 border ${
      type === 'success' ? 'bg-green-950/90 border-green-800 text-green-400' : 'bg-red-950/90 border-red-800 text-red-400'
    }`}>
      {type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      {message}
    </div>
  );
}

export default function EventManagementModal({ event, currentUser, role, onClose }) {
  const [activeTab, setActiveTab] = useState('managers');
  const [organizers, setOrganizers] = useState([]);
  const [managerIds, setManagerIds] = useState(new Set());
  const [loadingOrganizers, setLoadingOrganizers] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChat, setLoadingChat] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null);
  const [toast, setToast] = useState(null);
  const messagesEndRef = useRef(null);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  const isOwner = event.admin_id === currentUser?.id;
  const isAdmin = role === 'admin';
  const canManage = isOwner || isAdmin;

  // ─── Fetch organizers and managers ───
  useEffect(() => {
    const fetchData = async () => {
      setLoadingOrganizers(true);

      // Get all organizers from the same university (exclude admin role)
      const { data: allOrganizers } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('university_id', event.university_id)
        .eq('role', 'organizer')
        .neq('status', 'rejected');

      // Filter out admin from the list (admin is invisible)
      const filtered = (allOrganizers || []).filter(o => o.role !== 'admin');
      setOrganizers(filtered);

      // Get current managers for this event
      const { data: managers } = await supabase
        .from('event_managers')
        .select('user_id')
        .eq('event_id', event.id);

      if (managers) {
        setManagerIds(new Set(managers.map(m => m.user_id)));
      }

      setLoadingOrganizers(false);
    };

    fetchData();
  }, [event.id, event.university_id]);

  // ─── Toggle manager status ───
  const handleToggleManager = async (userId) => {
    if (!canManage) return;
    setTogglingId(userId);

    if (managerIds.has(userId)) {
      // Remove
      const { error } = await supabase
        .from('event_managers')
        .delete()
        .eq('event_id', event.id)
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to remove manager:', error);
      } else {
        setManagerIds(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    } else {
      // Add
      const { error } = await supabase
        .from('event_managers')
        .insert({ event_id: event.id, user_id: userId });

      if (error) {
        console.error('Failed to add manager:', error);
      } else {
        setManagerIds(prev => new Set([...prev, userId]));
      }
    }

    // Broadcast to all dashboards so the other organizer sees it instantly
    supabase.channel(`uni-managers-${event.university_id}`).send({
      type: 'broadcast',
      event: 'sync-managers',
      payload: { eventId: event.id }
    });

    setTogglingId(null);
  };

  // ─── Chat: Polling ───
  useEffect(() => {
    if (activeTab !== 'chat') return;
    let alive = true;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('event_management_chats')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: true });

      if (data && alive) {
        setMessages(data);
        setLoadingChat(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 1500);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [event.id, activeTab]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Send message ───
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage('');

    const senderName = role === 'admin' ? 'Admin' : (currentUser?.full_name || currentUser?.email || 'User');

    // Optimistic
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId,
      event_id: event.id,
      sender_id: currentUser.id,
      sender_name: senderName,
      message: text,
      created_at: new Date().toISOString(),
      temp: true,
    }]);

    const { data, error } = await supabase
      .from('event_management_chats')
      .insert({
        event_id: event.id,
        sender_id: currentUser.id,
        sender_name: senderName,
        message: text,
      })
      .select()
      .single();

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } else {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    }
  };

  // ─── Delete Message ───
  const requestDeleteMessage = (messageId) => {
    setConfirmAction({
      title: 'Delete Team Message',
      message: 'Are you sure you want to delete this internal message? This action is permanent.',
      confirmLabel: 'Delete',
      confirmStyle: 'bg-red-600 hover:bg-red-500',
      onConfirm: async () => {
        setConfirmAction(null);
        // Optimistic UI update
        const originalMessages = [...messages];
        setMessages(prev => prev.filter(m => m.id !== messageId));

        const { error } = await supabase
          .from('event_management_chats')
          .delete()
          .eq('id', messageId);

        if (error) {
          setMessages(originalMessages);
          showToast('Failed to delete message.', 'error');
        } else {
          showToast('Message deleted.');
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full h-[80vh] flex flex-col relative overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-4 border-b border-zinc-800 bg-gradient-to-r from-violet-900/30 to-purple-900/20 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-violet-400" />
                <span className="truncate max-w-[250px] sm:max-w-sm">{event.title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-violet-500/20 text-violet-400">Management</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {isOwner && <span className="text-violet-400 font-medium">Event Owner</span>}
                {isAdmin && !isOwner && <span className="text-red-400 font-medium">Admin Access</span>}
                {!isOwner && !isAdmin && <span className="text-amber-400 font-medium">Event Manager</span>}
              </p>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-white transition p-1 bg-zinc-900 hover:bg-zinc-800 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('managers')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'managers'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Managers
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'chat'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Management Chat
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'managers' ? (
            <div className="p-4 space-y-2">
              {loadingOrganizers ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
                  <span className="ml-3 text-zinc-400">Loading organizers...</span>
                </div>
              ) : organizers.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-400 font-medium">No other organizers found</p>
                  <p className="text-zinc-500 text-sm mt-1">Invite organizers to your university first.</p>
                </div>
              ) : (
                <>
                  {/* Event Owner Badge */}
                  <div className="bg-violet-950/30 border border-violet-800/40 rounded-xl p-3 flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">Event Owner</p>
                      <p className="text-xs text-zinc-400 truncate">Full access by default</p>
                    </div>
                    <span className="text-xs font-bold text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-full border border-violet-500/20 shrink-0">Owner</span>
                  </div>

                  {organizers.map(org => {
                    const isEventOwner = org.id === event.admin_id;
                    const isManager = managerIds.has(org.id);
                    const isToggling = togglingId === org.id;

                    return (
                      <div
                        key={org.id}
                        className={`rounded-xl p-3 flex items-center gap-3 border transition ${
                          isEventOwner
                            ? 'bg-violet-950/20 border-violet-800/30'
                            : isManager
                            ? 'bg-green-950/20 border-green-800/30'
                            : 'bg-zinc-900 border-zinc-800'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                          isEventOwner ? 'bg-violet-600' : isManager ? 'bg-green-600' : 'bg-zinc-700'
                        }`}>
                          {(org.full_name || org.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{org.full_name || 'Unnamed'}</p>
                          <p className="text-xs text-zinc-400 truncate">{org.email}</p>
                        </div>

                        {isEventOwner ? (
                          <span className="text-xs font-bold text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-full border border-violet-500/20 shrink-0">
                            Owner
                          </span>
                        ) : canManage ? (
                          <button
                            onClick={() => handleToggleManager(org.id)}
                            disabled={isToggling}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                              isManager
                                ? 'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30'
                                : 'bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30'
                            } ${isToggling ? 'opacity-50' : ''}`}
                          >
                            {isToggling ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : isManager ? (
                              <><UserMinus className="w-3 h-3" /> Remove</>
                            ) : (
                              <><UserPlus className="w-3 h-3" /> Add Manager</>
                            )}
                          </button>
                        ) : isManager ? (
                          <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20 shrink-0">
                            Manager
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          ) : (
            /* ─── Chat Tab ─── */
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingChat ? (
                  <div className="h-full flex items-center justify-center text-zinc-500 text-sm font-medium">Loading chat...</div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-3 py-16">
                    <MessageSquare className="w-12 h-12 opacity-50" />
                    <p className="text-sm font-medium">No messages yet. Start the discussion!</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === currentUser?.id;
                    const ageMins = (Date.now() - new Date(msg.created_at).getTime()) / 60000;
                    
                    // Permission Logic:
                    // 1. Admins have "God Mode" and can delete ANY message at ANY time
                    // 2. Everyone else (Owners & Staff) can only delete their OWN message within 1 minute
                    const canDelete = !msg.temp && (
                      isAdmin || 
                      (isMe && ageMins <= 1)
                    );

                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${msg.temp ? 'opacity-60' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold ${isMe ? 'text-violet-400' : 'text-zinc-400'}`}>
                            {msg.sender_name}
                          </span>
                          <span className="text-[10px] text-zinc-600">
                            {msg.temp ? 'Delivering...' : new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`relative max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                          isMe
                            ? 'bg-violet-600 text-white rounded-tr-sm shadow-md shadow-violet-600/20'
                            : 'bg-zinc-800 text-zinc-200 rounded-tl-sm border border-zinc-700'
                        }`}>
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                          
                          {canDelete && (
                            <button 
                              onClick={() => requestDeleteMessage(msg.id)}
                              className={`flex items-center gap-1 mt-2 pt-2 border-t text-[10px] font-bold uppercase tracking-widest transition-colors ${
                                isMe ? 'border-white/20 text-white/60 hover:text-white' : 'border-zinc-700 text-red-500 hover:text-red-400'
                              }`}
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Chat Input (only on chat tab) */}
        {activeTab === 'chat' && (
          <div className="p-4 bg-zinc-950 border-t border-zinc-800 shrink-0">
            <form onSubmit={handleSend} className="flex gap-2 relative">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Type a message to the team..."
                maxLength="500"
                className="flex-1 p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:ring-2 focus:border-violet-500 focus:ring-violet-500/20 transition pr-12"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square rounded-lg flex items-center justify-center bg-violet-600 hover:bg-violet-500 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </div>
        )}

        {confirmAction && (
          <ConfirmDialog 
            title={confirmAction.title} 
            message={confirmAction.message}
            confirmLabel={confirmAction.confirmLabel}
            confirmStyle={confirmAction.confirmStyle}
            onConfirm={confirmAction.onConfirm}
            onCancel={() => setConfirmAction(null)}
          />
        )}
        {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
      </div>
    </div>
  );
}
