// src/components/ManageOrganizersModal.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Mail, Send, UserPlus, Trash2, CheckCircle, Clock, AlertTriangle, Users } from 'lucide-react';

export default function ManageOrganizersModal({ adminProfile, onClose }) {
  const [email, setEmail] = useState('');
  const [invitations, setInvitations] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Fetch invitations and active organizers
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch invitations for this university
      const { data: invites } = await supabase
        .from('organizer_invitations')
        .select('*')
        .eq('university_id', adminProfile.university_id)
        .order('created_at', { ascending: false });

      if (invites) setInvitations(invites);

      // Fetch active organizers (profiles with role='organizer' for this university)
      const { data: orgProfiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, status, created_at')
        .eq('university_id', adminProfile.university_id)
        .eq('role', 'organizer')
        .neq('status', 'rejected')
        .order('created_at', { ascending: false });

      if (orgProfiles) setOrganizers(orgProfiles);
    } catch (err) {
      console.error('Failed to fetch organizer data:', err);
    }
    setLoading(false);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setMessage('Please enter an email address.');
      setMessageType('error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage('Please enter a valid email address.');
      setMessageType('error');
      return;
    }

    // Check if email is already an active organizer
    const existingOrg = organizers.find(o => o.email?.toLowerCase() === email.toLowerCase());
    if (existingOrg) {
      setMessage('This email is already an active organizer.');
      setMessageType('error');
      return;
    }

    setSending(true);
    setMessage('Sending invitation...');
    setMessageType('info');

    try {
      // Get university name
      const { data: uni } = await supabase
        .from('universities')
        .select('name')
        .eq('id', adminProfile.university_id)
        .single();

      const { data, error } = await supabase.functions.invoke('invite-organizer', {
        body: {
          email: email.toLowerCase(),
          universityId: adminProfile.university_id,
          invitedBy: adminProfile.id,
          universityName: uni?.name || '',
          siteUrl: window.location.origin
        }
      });

      // Edge function errors return the detail in data.error even on non-2xx
      if (data?.error) throw new Error(data.error);
      if (error) throw new Error(error.message || 'Edge function error');

      setMessage('Invitation sent successfully!');
      setMessageType('success');
      setEmail('');
      fetchData(); // Refresh list
    } catch (err) {
      console.error('Invite error:', err);
      setMessage(err.message || 'Failed to send invitation.');
      setMessageType('error');
    }
    setSending(false);
  };

  const handleDeleteInvitation = async (inviteId) => {
    try {
      const { error } = await supabase
        .from('organizer_invitations')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;
      setInvitations(invitations.filter(i => i.id !== inviteId));
      setMessage('Invitation revoked.');
      setMessageType('success');
    } catch (err) {
      setMessage('Failed to revoke invitation.');
      setMessageType('error');
    }
    setConfirmDeleteId(null);
  };

  const handleRemoveOrganizer = async (organizerId) => {
    try {
      // Call secure RPC to bypass RLS and mark as rejected
      const { error } = await supabase.rpc('revoke_organizer', {
        org_id: organizerId
      });

      if (error) throw error;
      setOrganizers(organizers.filter(o => o.id !== organizerId));
      setMessage('Organizer removed.');
      setMessageType('success');
    } catch (err) {
      setMessage('Failed to remove organizer.');
      setMessageType('error');
    }
    setConfirmDeleteId(null);
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full relative max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-5 shrink-0 relative"
          style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)' }}
        >
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Manage Organizers</h2>
              <p className="text-red-200 text-xs mt-0.5">Invite and manage event organizers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white opacity-70 hover:opacity-100 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Invite Form */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">
              <UserPlus className="w-4 h-4 inline mr-1.5 text-red-500" />
              Invite New Organizer
            </label>
            <form onSubmit={handleInvite} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  placeholder="organizer@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 p-3 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-zinc-950 text-white text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-1.5 px-5 py-3 text-sm font-bold text-white rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #b91c1c, #dc2626)' }}
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Invite'}
              </button>
            </form>
          </div>

          {/* Message */}
          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium border ${
              messageType === 'success' ? 'text-green-400 bg-green-500/10 border-green-500/30' :
              messageType === 'info' ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' :
              'text-red-400 bg-red-500/10 border-red-500/30'
            }`}>
              {messageType === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> :
               messageType === 'info' ? <Clock className="w-4 h-4 shrink-0 animate-spin" /> :
               <AlertTriangle className="w-4 h-4 shrink-0" />}
              {message}
            </div>
          )}

          {/* Active Organizers */}
          {organizers.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Active Organizers ({organizers.length})
              </h3>
              <div className="space-y-2">
                {organizers.map(org => (
                  <div key={org.id} className="flex items-center justify-between p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-green-600/20 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{org.full_name || org.email}</p>
                        <p className="text-xs text-zinc-500 truncate">{org.email}</p>
                      </div>
                    </div>
                    {confirmDeleteId === org.id ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-1.5 text-xs font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleRemoveOrganizer(org.id)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-500 transition"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(org.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-500 transition rounded-lg hover:bg-zinc-800"
                        title="Remove organizer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Invitations */}
          {invitations.filter(i => i.status === 'pending').length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Pending Invitations ({invitations.filter(i => i.status === 'pending').length})
              </h3>
              <div className="space-y-2">
                {invitations.filter(i => i.status === 'pending').map(invite => (
                  <div key={invite.id} className="flex items-center justify-between p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{invite.email}</p>
                        <p className="text-xs text-zinc-500">
                          Invited {new Date(invite.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEmail(invite.email);
                          handleInvite({ preventDefault: () => {} });
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition"
                        title="Resend invitation"
                      >
                        Resend
                      </button>
                      {confirmDeleteId === invite.id ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1.5 text-xs font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition"
                          >
                            No
                          </button>
                          <button
                            onClick={() => handleDeleteInvitation(invite.id)}
                            className="px-2 py-1.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-500 transition"
                          >
                            Yes
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(invite.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-500 transition rounded-lg hover:bg-zinc-800"
                          title="Revoke invitation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {loading ? (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">Loading organizers...</p>
            </div>
          ) : organizers.length === 0 && invitations.length === 0 && (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">No Organizers Yet</h3>
              <p className="text-sm text-zinc-500">Invite your first organizer using the form above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
