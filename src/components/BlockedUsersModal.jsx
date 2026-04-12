import { useState, useEffect } from 'react';
import { X, ShieldAlert, Unlock, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

// --- In-App Confirmation Dialog ---
function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[80] p-4 rounded-2xl" onClick={onCancel}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center shrink-0">
            <Unlock className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="text-base font-bold text-white">{title}</h3>
        </div>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-bold text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-500 rounded-lg transition"
          >
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BlockedUsersModal({ onClose, currentUser }) {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchBlockedUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('muted_users')
        .select(`
          id,
          event_id,
          student_id,
          created_at,
          profiles:student_id(email, display_name),
          events:event_id(title)
        `)
        .eq('muted_by', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlockedUsers(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load blocked users.');
    } finally {
      setLoading(false);
    }
  };

  const requestUnblock = (record) => {
    const name = record.profiles?.display_name || record.profiles?.email || 'this user';
    const eventName = record.events?.title || 'the event';
    setConfirmAction({
      id: record.id,
      title: 'Unblock User',
      message: `Are you sure you want to unblock "${name}" from "${eventName}"? They will be able to send messages again.`,
      confirmLabel: 'Unblock',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          const { error } = await supabase.from('muted_users').delete().eq('id', record.id);
          if (error) throw error;
          setBlockedUsers(prev => prev.filter(u => u.id !== record.id));
          setToast({ message: `${name} has been unblocked.`, type: 'success' });
        } catch (err) {
          console.error(err);
          setToast({ message: 'Failed to unblock user.', type: 'error' });
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-w-3xl w-full h-[70vh] flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900 mx-auto w-full">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Blocked Users Manager
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Manage students restricted from your event communities.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
          {loading ? (
            <div className="h-full flex items-center justify-center text-zinc-500">Loading...</div>
          ) : error ? (
            <div className="p-4 bg-red-950/30 border border-red-900 rounded-xl text-red-400 text-center">{error}</div>
          ) : blockedUsers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-3">
              <ShieldAlert className="w-12 h-12 opacity-30" />
              <p className="font-medium">No blocked users found.</p>
            </div>
          ) : (
            <div className="gap-4 flex flex-col">
              {blockedUsers.map(record => (
                <div key={record.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex sm:flex-row flex-col justify-between items-start sm:items-center gap-4 hover:border-zinc-700 transition">
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {record.profiles?.display_name || 'Unknown Student'}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-0.5">{record.profiles?.email}</p>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400 bg-red-950/20 w-fit px-2 py-1 rounded-md border border-red-900/30">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Blocked from: <strong>{record.events?.title || 'Unknown Event'}</strong>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => requestUnblock(record)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg text-sm transition sm:w-auto w-full justify-center border border-zinc-700 hover:border-zinc-500"
                  >
                    <Unlock className="w-4 h-4" /> Unblock User
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* In-App Confirmation Dialog */}
        {confirmAction && (
          <ConfirmDialog
            title={confirmAction.title}
            message={confirmAction.message}
            confirmLabel={confirmAction.confirmLabel}
            onConfirm={confirmAction.onConfirm}
            onCancel={() => setConfirmAction(null)}
          />
        )}

        {/* Toast */}
        {toast && (
          <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[80] px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2 border ${
            toast.type === 'success' 
              ? 'bg-green-950/90 border-green-800 text-green-400' 
              : 'bg-red-950/90 border-red-800 text-red-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
