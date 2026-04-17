// src/components/CommunityModal.jsx
import { useState, useEffect, useRef } from 'react';
import { X, Send, ShieldAlert, Trash2, MessageSquareOff, Lock, Unlock, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

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

export default function CommunityModal({ event, currentUser, isAdmin, profile, role, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewingDisplayName, setViewingDisplayName] = useState(null);
  const [chatLocked, setChatLocked] = useState(false);
  const [blockedStudentIds, setBlockedStudentIds] = useState(new Set());
  const [confirmAction, setConfirmAction] = useState(null);
  const [toast, setToast] = useState(null);
  const messagesEndRef = useRef(null);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  // ========== SINGLE useEffect: fetch once + poll every 1.5s ==========
  useEffect(() => {
    if (!currentUser?.id) return;

    let alive = true; // prevent state updates after unmount

    const poll = async () => {
      if (!alive) return;

      // 1. Fetch messages
      const { data: msgs } = await supabase
        .from('event_chats')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: true });

      if (msgs && alive) {
        setMessages(prev => {
          // Keep temp messages that are still in flight
          const realIds = new Set(msgs.map(m => m.id));
          const survivingTemps = prev.filter(m => m.temp && !realIds.has(m.id));
          return [...msgs, ...survivingTemps];
        });
      }

      // 2. Check mute status (student only)
      if (!isAdmin && alive) {
        const { data: muteCheck } = await supabase
          .from('muted_users')
          .select('id')
          .eq('event_id', event.id)
          .eq('student_id', currentUser.id)
          .maybeSingle();
        if (alive) setIsMuted(!!muteCheck);
      }

      // 3. Check lock status
      if (alive) {
        const { data: lockCheck } = await supabase
          .from('events')
          .select('chat_locked')
          .eq('id', event.id)
          .single();
        if (lockCheck && alive) setChatLocked(!!lockCheck.chat_locked);
      }

      // 4. Fetch blocked user IDs (admin only)
      if (isAdmin && alive) {
        const { data: blocked } = await supabase
          .from('muted_users')
          .select('student_id')
          .eq('event_id', event.id);
        if (blocked && alive) {
          setBlockedStudentIds(new Set(blocked.map(d => d.student_id)));
        }
      }

      if (alive) setLoading(false);
    };

    // Initial fetch
    poll();

    // Poll every 1.5 seconds
    const interval = setInterval(poll, 1500);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [event.id, currentUser?.id, isAdmin]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ========== SEND MESSAGE ==========
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isMuted) return;
    if (!isAdmin && !profile?.display_name) {
      showToast('Please set a Display Name in Settings to chat.', 'error');
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage('');

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, temp: true, event_id: event.id, student_id: currentUser?.id,
      sender_name: isAdmin ? (profile?.full_name || 'Admin Announcement') : profile.display_name,
      message: messageText, is_admin: isAdmin, created_at: new Date().toISOString()
    }]);

    const { data: insertedMsg, error } = await supabase.from('event_chats').insert([{
      event_id: event.id, student_id: currentUser?.id,
      sender_name: isAdmin ? (profile?.full_name || 'Admin Announcement') : profile.display_name,
      message: messageText, is_admin: isAdmin
    }]).select().single();

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      showToast('Failed to send message.', 'error');
    } else {
      setMessages(prev => prev.map(m => m.id === tempId ? insertedMsg : m));
    }
  };

  // ========== DELETE MESSAGE ==========
  const requestDeleteMessage = (messageId) => {
    setConfirmAction({
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? This action cannot be undone.',
      confirmLabel: 'Delete', confirmStyle: 'bg-red-600 hover:bg-red-500',
      onConfirm: async () => {
        setConfirmAction(null);
        setMessages(prev => prev.filter(m => m.id !== messageId));
        const { error } = await supabase.from('event_chats').delete().eq('id', messageId);
        if (error) showToast('Failed to delete.', 'error');
        else showToast('Message deleted.');
      }
    });
  };

  // ========== BLOCK USER ==========
  const requestBlockUser = (studentId, studentName) => {
    setConfirmAction({
      title: 'Block User',
      message: `Block "${studentName}" from typing in this community? You can unblock them anytime.`,
      confirmLabel: 'Block User', confirmStyle: 'bg-red-600 hover:bg-red-500',
      onConfirm: async () => {
        setConfirmAction(null);
        const { error } = await supabase.from('muted_users').insert([{
          event_id: event.id, student_id: studentId, muted_by: currentUser.id
        }]);
        if (error && error.code !== '23505') {
          showToast('Failed to block user.', 'error');
        } else {
          setBlockedStudentIds(prev => new Set([...prev, studentId]));
          showToast(`${studentName} blocked.`);
        }
      }
    });
  };

  // ========== UNBLOCK USER ==========
  const requestUnblockUser = (studentId, studentName) => {
    setConfirmAction({
      title: 'Unblock User',
      message: `Unblock "${studentName}"? They will be able to send messages again.`,
      confirmLabel: 'Unblock', confirmStyle: 'bg-green-600 hover:bg-green-500',
      onConfirm: async () => {
        setConfirmAction(null);
        const { error } = await supabase.from('muted_users').delete().eq('event_id', event.id).eq('student_id', studentId);
        if (error) {
          showToast('Failed to unblock.', 'error');
        } else {
          setBlockedStudentIds(prev => { const n = new Set(prev); n.delete(studentId); return n; });
          showToast(`${studentName} unblocked.`);
        }
      }
    });
  };

  // ========== TOGGLE LOCK ==========
  const handleToggleChatLock = async () => {
    if (!isAdmin) return;
    const newState = !chatLocked;
    setChatLocked(newState);
    await supabase.from('events').update({ chat_locked: newState }).eq('id', event.id);
  };

  // ========== RENDER ==========
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full h-[80vh] flex flex-col relative overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={`p-4 border-b border-zinc-800 flex items-center justify-between ${isAdmin ? 'bg-red-900/20' : 'bg-amber-900/20'}`}>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="truncate max-w-[250px] sm:max-w-sm">{event.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isAdmin ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>Community</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              {isAdmin
                ? <span className="text-red-400 font-medium">Admin Moderation View</span>
                : <span>Chatting as: {profile?.display_name ? <span className="font-bold text-white">{profile.display_name}</span> : <span className="text-red-400 font-bold">Anonymous (Action Required)</span>}</span>
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={handleToggleChatLock}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${chatLocked ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700'}`}
                title={chatLocked ? 'Unlock student chat' : 'Lock student chat'}>
                {chatLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {chatLocked ? 'Locked' : 'Open'}
              </button>
            )}
            <button onClick={onClose} className="text-zinc-400 hover:text-white transition p-1 bg-zinc-900 hover:bg-zinc-800 rounded-full"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-zinc-900/50">
          {loading ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm font-medium">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-3">
              <MessageSquareOff className="w-12 h-12 opacity-50" />
              <p className="text-sm font-medium">No messages yet. Be the first to start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.student_id === currentUser.id;
              const isBlocked = blockedStudentIds.has(msg.student_id);
              const ageMins = (Date.now() - new Date(msg.created_at).getTime()) / 60000;
              
              const isSelfDelete = isMe && (role === 'student' ? ageMins <= 1 : true);
              const isAdminDelete = role === 'admin';
              const isOrganizerDelete = role === 'organizer' && !msg.is_admin;
              
              const canDelete = !msg.temp && (isSelfDelete || isAdminDelete || isOrganizerDelete);
              const showFooter = canDelete || (!msg.temp && isAdmin && !msg.is_admin);
              return (
                <div key={msg.id} className={`flex flex-col ${isMe && !isAdmin ? 'items-end' : 'items-start'} ${msg.temp ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-bold ${msg.is_admin ? 'text-red-400' : isMe ? 'text-amber-400' : 'text-zinc-400'} ${!msg.is_admin && !isAdmin ? 'cursor-pointer hover:underline' : ''}`}
                      onClick={() => { if (!msg.is_admin && !isAdmin) setViewingDisplayName(msg.sender_name); }}>
                      {msg.sender_name}
                    </span>
                    {isAdmin && !msg.is_admin && isBlocked && (
                      <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">BLOCKED</span>
                    )}
                    <span className="text-[10px] text-zinc-600">
                      {msg.temp ? 'Delivering...' : new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className={`relative max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.is_admin ? 'bg-red-600 border border-red-500 text-white rounded-tl-sm shadow-lg shadow-red-600/30'
                    : isMe && !isAdmin ? 'bg-amber-600 text-white rounded-tr-sm shadow-md'
                    : 'bg-zinc-800 text-zinc-200 rounded-tl-sm border border-zinc-700'
                  }`}>
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>

                    {showFooter && (
                      <div className={`flex items-center gap-1 mt-2 pt-2 border-t ${msg.is_admin ? 'border-white/20' : (isMe && !isAdmin ? 'border-white/20' : 'border-zinc-700')}`}>
                        {isAdmin && !msg.is_admin && (
                          isBlocked ? (
                            <button onClick={() => requestUnblockUser(msg.student_id, msg.sender_name)}
                              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md text-green-400 hover:bg-zinc-700 transition">
                              <Unlock className="w-3 h-3" /> Unblock
                            </button>
                          ) : (
                            <button onClick={() => requestBlockUser(msg.student_id, msg.sender_name)}
                              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md text-amber-400 hover:bg-zinc-700 transition">
                              <ShieldAlert className="w-3 h-3" /> Block
                            </button>
                          )
                        )}
                        {canDelete && (
                          <button onClick={() => requestDeleteMessage(msg.id)}
                            className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md transition ${msg.is_admin || (isMe && !isAdmin) ? 'text-white/80 hover:bg-black/20 hover:text-white' : 'text-red-400 hover:bg-zinc-700'}`}>
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800">
          {isMuted ? (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-center text-red-400 text-sm font-medium flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4" /> You have been blocked from typing in this community.
            </div>
          ) : (!isAdmin && chatLocked) ? (
            <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-center text-zinc-400 text-sm font-medium flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" /> Chat has been locked by the admin.
            </div>
          ) : (!isAdmin && !profile?.display_name) ? (
            <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-xl text-center text-amber-400 text-sm font-medium">
              You must set a Display Name in Settings to participate in the chat.
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex gap-2 relative">
              <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                placeholder={isAdmin ? "Send an admin announcement..." : "Type your message..."} maxLength="500"
                className={`flex-1 p-3.5 rounded-xl bg-zinc-900 border text-white text-sm focus:outline-none focus:ring-2 transition pr-12 ${
                  isAdmin ? 'border-zinc-800 focus:border-red-500 focus:ring-red-500/20' : 'border-zinc-800 focus:border-amber-500 focus:ring-amber-500/20'
                }`} />
              <button type="submit" disabled={!newMessage.trim()}
                className={`absolute right-1.5 top-1.5 bottom-1.5 aspect-square rounded-lg flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  isAdmin ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                }`}>
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          )}
        </div>

        {confirmAction && (
          <ConfirmDialog title={confirmAction.title} message={confirmAction.message}
            confirmLabel={confirmAction.confirmLabel} confirmStyle={confirmAction.confirmStyle}
            onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} />
        )}
        {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

        {viewingDisplayName && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-[70] p-4 rounded-2xl" onClick={() => setViewingDisplayName(null)}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-5 max-w-xs w-full text-center" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center mx-auto mb-4 text-zinc-950 text-2xl font-black">{viewingDisplayName.charAt(0).toUpperCase()}</div>
              <h3 className="text-lg font-bold text-white mb-1">{viewingDisplayName}</h3>
              <p className="text-xs text-zinc-500 mb-4">Community Member</p>
              <p className="text-[11px] text-zinc-600 bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-800">🔒 Only display names are visible to other students for privacy.</p>
              <button onClick={() => setViewingDisplayName(null)} className="mt-4 px-6 py-2 text-sm font-bold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition">Got it</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
