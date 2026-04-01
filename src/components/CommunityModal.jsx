// src/components/CommunityModal.jsx
import { useState, useEffect, useRef } from 'react';
import { X, Send, ShieldAlert, Trash2, MessageSquareOff, Info, Lock, Unlock } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function CommunityModal({ event, currentUser, isAdmin, profile, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewingStudentProfile, setViewingStudentProfile] = useState(null);
  const [viewingDisplayName, setViewingDisplayName] = useState(null);
  const [chatLocked, setChatLocked] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch initial messages & mute status
  useEffect(() => {
    let channel;

    const initChat = async () => {
      // Only proceed if we have a valid currentUser ID
      if (!currentUser?.id) return;

      // 1. Check mute status (if student)
      if (!isAdmin) {
        const { data: muteData } = await supabase
          .from('muted_users')
          .select('id')
          .eq('event_id', event.id)
          .eq('student_id', currentUser.id)
          .maybeSingle();

        if (muteData) setIsMuted(true);
      }

      // 2. Fetch history
      const { data: history } = await supabase
        .from('event_chats')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: true });

      if (history) setMessages(history);
      setLoading(false);

      // 3. Check if chat is locked
      const { data: eventData } = await supabase
        .from('events')
        .select('chat_locked')
        .eq('id', event.id)
        .single();
      if (eventData?.chat_locked) setChatLocked(true);

      // 4. Subscribe to real-time additions/deletions
      channel = supabase
        .channel(`chat_${event.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'event_chats', filter: `event_id=eq.${event.id}` },
          (payload) => setMessages((prev) => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          })
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'event_chats', filter: `event_id=eq.${event.id}` },
          (payload) => setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
        )
        .subscribe();
    };

    initChat();

    // Cleanup
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [event.id, currentUser.id, isAdmin]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isMuted) return;

    // Check display name
    if (!isAdmin && !profile?.display_name) {
      alert("Please set a Display Name in your Profile Settings to join the chat.");
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage(''); // optimistic clear
    
    // Simulate instant sent message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      temp: true,
      event_id: event.id,
      student_id: currentUser?.id,
      sender_name: isAdmin ? 'Admin Announcement' : profile.display_name,
      message: messageText,
      is_admin: isAdmin,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMsg]);

    const payload = {
      event_id: event.id,
      student_id: currentUser?.id,
      sender_name: isAdmin ? 'Admin Announcement' : profile.display_name,
      message: messageText,
      is_admin: isAdmin
    };

    const { data: insertedMsg, error } = await supabase.from('event_chats').insert([payload]).select().single();

    if (error) {
      console.error("Supabase insert error:", error);
      alert(`Failed to send message: ${error.message || 'Unknown error code: ' + error.code}`);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } else {
      setMessages(prev => prev.map(m => m.id === tempId ? insertedMsg : m));
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!isAdmin) return;
    await supabase.from('event_chats').delete().eq('id', messageId);
  };

  const handleMuteUser = async (studentId, studentName) => {
    if (!isAdmin) return;
    const confirmMute = window.confirm(`Are you sure you want to mute ${studentName} from this event? They will no longer be able to send messages.`);
    if (!confirmMute) return;

    const { error } = await supabase.from('muted_users').insert([{
      event_id: event.id,
      student_id: studentId,
      muted_by: currentUser.id
    }]);

    if (error && error.code !== '23505') {
      alert('Failed to mute user.');
    } else {
      alert(`${studentName} has been permanently muted for this event.`);
    }
  };

  const fetchAndShowProfile = async (studentId) => {
    if (!isAdmin) return;
    const { data: profileData } = await supabase
      .from('profiles')
      .select('email, full_name, phone, degree, display_name')
      .eq('id', studentId)
      .single();
    if (profileData) {
      setViewingStudentProfile(profileData);
    } else {
      alert("Could not load student profile.");
    }
  };

  const handleToggleChatLock = async () => {
    if (!isAdmin) return;
    const newState = !chatLocked;
    setChatLocked(newState);
    await supabase
      .from('events')
      .update({ chat_locked: newState })
      .eq('id', event.id);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full h-[80vh] flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 border-b border-zinc-800 flex items-center justify-between ${isAdmin ? 'bg-red-900/20' : 'bg-amber-900/20'}`}>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="truncate max-w-[250px] sm:max-w-sm">{event.title}</span> 
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isAdmin ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                Community
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
              {isAdmin 
                ? <span className="text-red-400 font-medium">Admin Moderation View</span> 
                : <span>Chatting as: {profile?.display_name ? <span className="font-bold text-white">{profile.display_name}</span> : <span className="text-red-400 font-bold">Anonymous (Action Required)</span>}</span>
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Admin Chat Lock Toggle */}
            {isAdmin && (
              <button
                onClick={handleToggleChatLock}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  chatLocked 
                    ? 'bg-red-600 text-white hover:bg-red-500' 
                    : 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                }`}
                title={chatLocked ? 'Unlock student chat' : 'Lock student chat'}
              >
                {chatLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {chatLocked ? 'Locked' : 'Open'}
              </button>
            )}
            <button onClick={onClose} className="text-zinc-400 hover:text-white transition p-1 bg-zinc-900 hover:bg-zinc-800 rounded-full">
              <X className="w-5 h-5" />
            </button>
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
              
              return (
                <div key={msg.id} className={`flex flex-col ${isMe && !isAdmin ? 'items-end' : 'items-start'} ${msg.temp ? 'opacity-60 saturate-50' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className={`text-xs font-bold ${msg.is_admin ? 'text-red-400' : isMe ? 'text-amber-400' : 'text-zinc-400'} ${!msg.is_admin ? 'cursor-pointer hover:underline' : ''}`}
                      onClick={() => {
                        if (msg.is_admin) return;
                        if (isAdmin) {
                          fetchAndShowProfile(msg.student_id);
                        } else {
                          // Student can only see display name
                          setViewingDisplayName(msg.sender_name);
                        }
                      }}
                    >
                       {msg.sender_name}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {msg.temp ? 'Delivering...' : new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className={`relative group max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.is_admin 
                      ? 'bg-red-600 border border-red-500 text-white rounded-tl-sm shadow-lg shadow-red-600/30' 
                      : isMe && !isAdmin
                        ? 'bg-amber-600 text-white rounded-tr-sm shadow-md' 
                        : 'bg-zinc-800 text-zinc-200 rounded-tl-sm border border-zinc-700'
                  }`}>
                    <p className="whitespace-pre-wrap word-break break-words leading-relaxed">{msg.message}</p>
                    
                    {/* Admin Moderation Controls */}
                    {isAdmin && !msg.is_admin && (
                      <div className="absolute top-1/2 -translate-y-1/2 -right-24 hidden group-hover:flex items-center gap-1 bg-zinc-900 border border-zinc-700 p-0.5 rounded-lg shadow-xl shrink-0 z-10">
                        <button 
                          onClick={() => fetchAndShowProfile(msg.student_id)}
                          className="p-1.5 text-zinc-400 hover:text-blue-500 transition"
                          title="View Real Identity"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleMuteUser(msg.student_id, msg.sender_name)}
                          className="p-1.5 text-zinc-400 hover:text-amber-500 transition"
                          title="Mute User"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 transition"
                          title="Delete Message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
              <ShieldAlert className="w-4 h-4" />
              You have been muted by an admin in this community.
            </div>
          ) : (!isAdmin && chatLocked) ? (
            <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-center text-zinc-400 text-sm font-medium flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />
              Chat has been locked by the admin.
            </div>
          ) : (!isAdmin && !profile?.display_name) ? (
            <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-xl text-center text-amber-400 text-sm font-medium">
              You must set a Display Name in Settings to participate in the chat.
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex gap-2 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={isAdmin ? "Send an admin announcement..." : "Type your message..."}
                maxLength="500"
                className={`flex-1 p-3.5 rounded-xl bg-zinc-900 border text-white text-sm focus:outline-none focus:ring-2 transition pr-12 ${
                  isAdmin ? 'border-zinc-800 focus:border-red-500 focus:ring-red-500/20' : 'border-zinc-800 focus:border-amber-500 focus:ring-amber-500/20'
                }`}
              />
              <button 
                type="submit" 
                disabled={!newMessage.trim()}
                className={`absolute right-1.5 top-1.5 bottom-1.5 aspect-square rounded-lg flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  isAdmin ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                }`}
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          )}
        </div>
        
        {/* Admin View Student Profile Modal */}
        {viewingStudentProfile && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 rounded-2xl" onClick={() => setViewingStudentProfile(null)}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-5 border-b border-zinc-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-500" /> Admin Lookup
                </h3>
                <button onClick={() => setViewingStudentProfile(null)} className="text-zinc-500 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Community Identity (Public)</p>
                  <p className="text-sm font-medium text-white">{viewingStudentProfile.display_name || 'Not Set'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Real Name (Hidden)</p>
                  <p className="text-sm font-medium text-white">{viewingStudentProfile.full_name || 'Not Provided'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Email (Hidden)</p>
                  <p className="text-sm font-medium text-white truncate">{viewingStudentProfile.email || 'Not Provided'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Phone (Hidden)</p>
                  <p className="text-sm font-medium text-white">{viewingStudentProfile.phone || 'Not Provided'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Degree / Major (Hidden)</p>
                  <p className="text-sm font-medium text-white">{viewingStudentProfile.degree || 'Not Provided'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Student View - Display Name Only Popup */}
        {viewingDisplayName && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-[70] p-4 rounded-2xl" onClick={() => setViewingDisplayName(null)}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-5 max-w-xs w-full text-center" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center mx-auto mb-4 text-zinc-950 text-2xl font-black">
                {viewingDisplayName.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{viewingDisplayName}</h3>
              <p className="text-xs text-zinc-500 mb-4">Community Member</p>
              <p className="text-[11px] text-zinc-600 bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-800">
                🔒 Only display names are visible to other students for privacy.
              </p>
              <button
                onClick={() => setViewingDisplayName(null)}
                className="mt-4 px-6 py-2 text-sm font-bold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition"
              >
                Got it
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
