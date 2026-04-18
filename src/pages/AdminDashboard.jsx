// src/pages/AdminDashboard.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Plus, Calendar, MapPin, Link as LinkIcon, Edit, Trash2, X, Upload, Eye, Menu, Home, PlusCircle, Settings, LogOut, ShieldCheck, MessageSquare, User, Users, ShieldAlert, Shield } from 'lucide-react';
import FormBuilder from '../components/FormBuilder';
import SubmissionsTable from '../components/SubmissionsTable';
import SettingsModal from '../components/SettingsModal';
import CommunityModal from '../components/CommunityModal';
import BlockedUsersModal from '../components/BlockedUsersModal';
import ManageOrganizersModal from '../components/ManageOrganizersModal';
import EventManagementModal from '../components/EventManagementModal';

// --- Reusable Component for Event Card ---
const EventCard = ({ event, onEdit, onDelete, isConfirming, onConfirm, onCancel, onViewSubmissions, onManageCommunity, onManagement }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col">
    <div className="relative">
      <img
        src={event.poster_url}
        alt={event.title}
        className="w-full h-44 object-cover"
      />
      {event.category && (
        <span className="absolute top-3 left-3 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white bg-red-600 rounded-full shadow">
          {event.category}
        </span>
      )}
    </div>

    <div className="p-4 flex flex-col flex-grow">
      <h4 className="text-lg font-bold text-white truncate mb-2">{event.title}</h4>

      <div className="space-y-1.5 mb-3">
        <p className="text-sm text-zinc-400 flex items-center gap-1.5 line-clamp-1">
          <Calendar className="w-4 h-4 text-red-500 shrink-0" />
          {event.date ? (
            event.end_date && event.end_date !== event.date
              ? `${new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(event.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          ) : 'N/A'}
          {(event.start_time || event.end_time) && (
            <span className="ml-0.5 text-zinc-500 flex items-center shrink-0">
              •
              {event.start_time && ` ${new Date(`1970-01-01T${event.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
              {event.start_time && event.end_time ? ' - ' : ''}
              {event.end_time && `${!event.start_time ? ' ' : ''}${new Date(`1970-01-01T${event.end_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
            </span>
          )}
        </p>
        <p className="text-sm text-zinc-400 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-red-500" />
          {event.venue}
        </p>
      </div>

      {event.form_blueprint && event.form_blueprint.length > 0 && (
        <span className="text-xs text-red-500 bg-zinc-800 border border-zinc-700 inline-block px-2.5 py-1 rounded-full mb-3 font-medium">
          {event.form_blueprint.length} custom field{event.form_blueprint.length !== 1 ? 's' : ''}
        </span>
      )}

      <div className="mt-auto space-y-2">
        {/* Management Button - Always visible for admin */}
        <button
          onClick={() => onManagement(event)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-violet-400 border border-violet-500/30 bg-violet-600/10 hover:bg-violet-600/20 rounded-xl transition font-semibold"
        >
          <Shield className="w-4 h-4" /> Admin Control Center
        </button>

        {/* Manage Community Button */}
        <button
          onClick={() => onManageCommunity(event)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-red-400 border border-red-500/30 bg-red-600/10 hover:bg-red-600/20 rounded-xl transition font-semibold"
        >
          <MessageSquare className="w-4 h-4" /> Manage Community
        </button>

        {/* View Submissions Button */}
        <button
          onClick={() => onViewSubmissions(event)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-white border border-zinc-700 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition font-semibold"
        >
          <Eye className="w-4 h-4" /> View Submissions
        </button>

        {/* Actions / Confirm */}
        <div className="flex gap-2">
          {isConfirming ? (
            <>
              <button
                onClick={onCancel}
                className="flex items-center justify-center w-full py-2 text-xs font-semibold text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 transition"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </button>
              <button
                onClick={() => onDelete(event)}
                className="flex items-center justify-center w-full py-2 text-xs font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Confirm
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onEdit(event)}
                className="flex items-center justify-center w-full py-2 text-xs font-semibold text-white bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 transition"
              >
                <Edit className="w-3.5 h-3.5 mr-1" /> Edit
              </button>
              <button
                onClick={onConfirm}
                className="flex items-center justify-center w-full py-2 text-xs font-semibold text-red-500 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 transition"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </button>
            </>
          )}
        </div>

        {isConfirming && (
          <p className="text-xs text-red-500 text-center font-medium">
            This action cannot be undone.
          </p>
        )}
      </div>
    </div>
  </div>
);


// --- Main Dashboard Component ---
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [universityName, setUniversityName] = useState('');
  const [adminProfile, setAdminProfile] = useState(null);
  const [posterFile, setPosterFile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [showManageOrganizers, setShowManageOrganizers] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const eventsChannelRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, university_name, university_id')
        .eq('id', session.user.id)
        .single();
      if (profile) {
        setUniversityName(profile.university_name || '');
        setAdminProfile(profile);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    let profileChannel;
    let uniChannel;
    const setupListener = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      const userId = session.user.id;

      const { data: profile } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('id', userId)
        .single();

      profileChannel = supabase
        .channel('admin-profile-watch')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        }, (payload) => {
          if (payload.new.status === 'rejected') {
            supabase.auth.signOut();
            alert('Your account has been suspended by the administrator.');
            navigate('/login');
          }
        })
        .subscribe();

      if (profile?.university_id) {
        uniChannel = supabase
          .channel('admin-uni-watch')
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'universities',
            filter: `id=eq.${profile.university_id}`
          }, (payload) => {
            if (payload.new.is_verified === false) {
              supabase.auth.signOut();
              alert('Your university has been suspended. Contact support for assistance.');
              navigate('/login');
            }
          })
          .subscribe();
      }
    };
    setupListener();
    return () => {
      if (profileChannel) supabase.removeChannel(profileChannel);
      if (uniChannel) supabase.removeChannel(uniChannel);
    };
  }, [navigate]);

  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    date: '',
    endDate: '',
    startTime: '',
    endTime: '',
    deadline: '',
    venue: '',
    description: '',
    poster_url: '',
    reg_link: '',
  });
  const [formBlueprint, setFormBlueprint] = useState([]);
  const [posterPreview, setPosterPreview] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [viewingSubmissionsEvent, setViewingSubmissionsEvent] = useState(null);
  const [manageCommunityEvent, setManageCommunityEvent] = useState(null);
  const [managementEvent, setManagementEvent] = useState(null);

  const [customCategories, setCustomCategories] = useState([]);
  const defaultCategories = ['Technology', 'Sports', 'Arts & Culture', 'Career', 'Academics', 'Social', 'Volunteering', 'Health & Wellness'];
  const categoryChips = [...defaultCategories, ...customCategories];

  useEffect(() => {
    if (!adminProfile?.university_id) return;
    let eventsChannel;

    const cleanupExpiredEvents = async (allEvents) => {
      const now = new Date();
      const expiredIds = allEvents
        .filter(e => {
          const eventEnd = e.end_date || e.date;
          if (!eventEnd) return false;
          const endDateTime = new Date(eventEnd + 'T23:59:59');
          const expiryTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);
          return now > expiryTime;
        })
        .map(e => e.id);

      if (expiredIds.length > 0) {
        await supabase.from('registrations').delete().in('event_id', expiredIds);
        await supabase.from('events').delete().in('id', expiredIds);
        console.log(`Auto-cleaned ${expiredIds.length} expired event(s)`);
      }
      return expiredIds;
    };

    const fetchAndSet = async () => {
      // Fetch ALL events for this university (admin sees all, including organizer-created)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('university_id', adminProfile.university_id)
        .order('date', { ascending: true });

      if (!error && data) {
        const deletedIds = await cleanupExpiredEvents(data);
        const today = new Date().toISOString().split('T')[0];
        const activeEvents = data.filter(e => {
          if (deletedIds.includes(e.id)) return false;
          const eventEnd = e.end_date || e.date;
          return eventEnd >= today;
        });
        setEvents(activeEvents);
      }
    };

    // Initial fetch
    fetchAndSet();

    // Broadcast: re-fetch on ANY event change emitted by peers
    const channel = supabase
      .channel(`uni-events-${adminProfile.university_id}`)
      .on('broadcast', { event: 'sync-events' }, () => {
        fetchAndSet();
      });
      
    channel.subscribe();
    eventsChannelRef.current = channel;

    return () => {
      if (eventsChannelRef.current) supabase.removeChannel(eventsChannelRef.current);
    };
  }, [adminProfile]);

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'posterFile') {
      const file = files[0];
      if (file) {
        setPosterFile(file);
        setPosterPreview(URL.createObjectURL(file));
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const resetForm = () => {
    setFormData({ title: '', category: '', date: '', endDate: '', startTime: '', endTime: '', deadline: '', venue: '', description: '', poster_url: '', reg_link: '' });
    setPosterFile(null);
    setPosterPreview('');
    setEditingEvent(null);
    setFormBlueprint([]);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (savingEvent) return; // Guard against double-click
    
    if (!formData.title || !formData.date || !formData.deadline) {
      setMessage('Please fill in all required fields.');
      setMessageType('error');
      return;
    }
    if (!editingEvent && !posterFile) {
      setMessage('Please upload an event poster.');
      setMessageType('error');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !adminProfile?.university_id) {
      setMessage('Session expired. Please log in again.');
      setMessageType('error');
      return;
    }

    // Immediately close modal, show creating toast, and disable further submissions
    const isEditing = !!editingEvent;
    setSavingEvent(true);
    setShowAddEventModal(false);
    setMessage(isEditing ? 'Saving changes...' : 'Creating event...');
    setMessageType('info');

    try {
      let posterUrl = formData.poster_url;

      if (posterFile) {
        const fileExt = posterFile.name.split('.').pop();
        const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('event-posters').upload(filePath, posterFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('event-posters').getPublicUrl(filePath);
        posterUrl = urlData.publicUrl;
      }

      const eventData = {
        title: formData.title,
        category: formData.category || null,
        date: formData.date,
        end_date: formData.endDate || null,
        start_time: formData.startTime || null,
        end_time: formData.endTime || null,
        deadline: formData.deadline,
        venue: formData.venue,
        description: formData.description || null,
        poster_url: posterUrl,
        reg_link: formData.reg_link || null,
        admin_id: session.user.id,
        university_id: adminProfile.university_id,
        form_blueprint: formBlueprint,
      };

      if (isEditing) {
        const { data, error } = await supabase.from('events').update(eventData).eq('id', editingEvent.id).select().single();
        if (error) throw error;
        setEvents(events.map(evt => evt.id === data.id ? data : evt));
        setMessage('Event updated successfully!');
      } else {
        const { data, error } = await supabase.from('events').insert(eventData).select().single();
        if (error) throw error;
        setEvents([...events, data]);
        setMessage('Event created successfully!');
      }

      // Broadcast to other dashboards to sync seamlessly
      eventsChannelRef.current?.send({
        type: 'broadcast',
        event: 'sync-events',
        payload: { action: 'refresh' }
      });

      setMessageType('success');
      resetForm();
    } catch (err) {
      setMessage(err.message || 'Failed to save event.');
      setMessageType('error');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleEditClick = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || '',
      category: event.category || '',
      date: event.date || '',
      endDate: event.end_date || '',
      startTime: event.start_time || '',
      endTime: event.end_time || '',
      deadline: event.deadline || '',
      venue: event.venue || '',
      description: event.description || '',
      poster_url: event.poster_url || '',
      reg_link: event.reg_link || '',
    });
    setFormBlueprint(event.form_blueprint || []);
    setPosterFile(null);
    setPosterPreview(event.poster_url || '');
    setShowAddEventModal(true);
  };

  const handleDeleteEvent = async (eventToDelete) => {
    const { error } = await supabase.from('events').delete().eq('id', eventToDelete.id);
    if (error) {
      setMessage(error.message || 'Failed to delete event.');
      setMessageType('error');
    } else {
      setEvents(events.filter(event => event.id !== eventToDelete.id));
      setMessage(`Event "${eventToDelete.title}" deleted successfully!`);
      setMessageType('success');
      
      // Broadcast to other dashboards to sync seamlessly
      eventsChannelRef.current?.send({
        type: 'broadcast',
        event: 'sync-events',
        payload: { action: 'refresh' }
      });
    }
    setConfirmingDeleteId(null);
    setTimeout(() => setMessage(''), 3000);
  };

  useEffect(() => {
    if (messageType === 'success' && message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message, messageType]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen font-sans bg-zinc-950">

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Slide-out Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col bg-zinc-900 border-r border-zinc-800 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Sidebar Header — deep red gradient */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)' }}
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-white opacity-90" />
            <span className="text-base font-bold text-white truncate">{universityName || 'Admin Console'}</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-white opacity-70 hover:opacity-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {[
            { icon: <Home className="w-5 h-5" />, label: 'Overview', action: () => { setSidebarOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
            { icon: <Calendar className="w-5 h-5" />, label: 'Manage Events', action: () => { setSidebarOpen(false); document.querySelector('.events-grid')?.scrollIntoView({ behavior: 'smooth' }); } },
            { icon: <PlusCircle className="w-5 h-5" />, label: 'Create New Event', action: () => { setSidebarOpen(false); resetForm(); setShowAddEventModal(true); } },
            { icon: <Users className="w-5 h-5" />, label: 'Manage Organizers', action: () => { setSidebarOpen(false); setShowManageOrganizers(true); } },
            { icon: <ShieldAlert className="w-5 h-5" />, label: 'Blocked Users', action: () => { setSidebarOpen(false); setShowBlockedUsers(true); } },
            { icon: <Settings className="w-5 h-5" />, label: 'Settings', action: () => { setSidebarOpen(false); setShowSettings(true); } },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-zinc-300 rounded-xl hover:bg-zinc-800 hover:text-red-500 transition group"
            >
              <span className="text-zinc-500 group-hover:text-red-500 transition">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-zinc-800 p-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-500 rounded-xl hover:bg-zinc-800 transition"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Top Navbar */}
      <header className="flex items-center justify-between px-6 py-0 bg-zinc-900 border-b border-zinc-800 shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-zinc-800 transition" aria-label="Open menu">
            <Menu className="w-6 h-6 text-zinc-400" />
          </button>
          <div className="flex items-center gap-2 py-4">
            <div className="w-2 h-8 rounded-full" style={{ backgroundColor: '#dc2626' }} />
            <span className="text-xl font-black text-white tracking-tight uppercase">
              Admin <span className="text-zinc-500">Panel</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center justify-center w-10 h-10 bg-zinc-800 border border-zinc-700 rounded-full hover:bg-zinc-700 hover:border-red-500/50 shadow-inner overflow-hidden transition-all group"
            title="Admin Settings"
          >
            <User className="w-5 h-5 text-zinc-400 group-hover:text-red-500 transition-colors" />
          </button>
          <button
            onClick={() => { resetForm(); setShowAddEventModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-md hover:shadow-lg transition-all"
            style={{ background: 'linear-gradient(135deg, #b91c1c, #dc2626)' }}
          >
            <Plus className="w-4 h-4" /> Create Event
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-white mb-1">Event Management</h1>
          <p className="text-zinc-400 text-base">Create, manage and publish events for your university.</p>
          <div className="h-1 w-20 rounded-full mt-3" style={{ backgroundColor: '#dc2626' }} />
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Total Events', value: events.length, icon: <Calendar className="w-5 h-5" /> },
            { label: 'Upcoming', value: events.filter(e => new Date(e.date) >= new Date()).length, icon: <PlusCircle className="w-5 h-5" /> },
            { label: 'Past Events', value: events.filter(e => new Date(e.date) < new Date()).length, icon: <Eye className="w-5 h-5" /> },
          ].map(stat => (
            <div key={stat.label} className="bg-zinc-900 rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-zinc-800">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: '#dc2626' }}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                <p className="text-xs text-zinc-400 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Event List Section */}
        {events.length === 0 ? (
          <div className="bg-zinc-900 p-20 border border-zinc-800 rounded-2xl shadow-inner text-center mt-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 bg-zinc-800">
              <Calendar className="w-10 h-10" style={{ color: '#dc2626' }} />
            </div>
            <h3 className="text-xl font-bold text-white">No Events Yet</h3>
            <p className="text-zinc-400 mt-2 mb-6">Start by creating your first university event.</p>
            <button
              onClick={() => { resetForm(); setShowAddEventModal(true); }}
              className="inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition"
              style={{ background: 'linear-gradient(135deg, #b91c1c, #dc2626)' }}
            >
              <Plus className="w-4 h-4" /> Create Your First Event
            </button>
          </div>
        ) : (
          <div className="events-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map((event, index) => (
              <EventCard
                key={event.id || index}
                event={event}
                onEdit={handleEditClick}
                onDelete={handleDeleteEvent}
                isConfirming={confirmingDeleteId === event.id}
                onConfirm={() => setConfirmingDeleteId(event.id)}
                onCancel={() => setConfirmingDeleteId(null)}
                onViewSubmissions={setViewingSubmissionsEvent}
                onManageCommunity={setManageCommunityEvent}
                onManagement={setManagementEvent}
              />
            ))}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {message && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl z-50 transition-all duration-300 text-sm font-semibold border ${messageType === 'success' ? 'bg-green-500 text-white border-green-400' : messageType === 'info' ? 'bg-blue-500 text-white border-blue-400' : 'bg-white text-red-600 border-red-300 shadow-red-200/50'
          }`}>
          {message}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)} 
          accentColor="red" 
          role="admin" 
          onProfileUpdated={(updates) => setAdminProfile(prev => ({ ...prev, ...updates }))}
        />
      )}

      {/* Submissions Table Modal */}
      {viewingSubmissionsEvent && (
        <SubmissionsTable
          event={viewingSubmissionsEvent}
          onClose={() => setViewingSubmissionsEvent(null)}
        />
      )}

      {/* Blocked Users Modal */}
      {showBlockedUsers && adminProfile && (
        <BlockedUsersModal 
          currentUser={adminProfile} 
          onClose={() => setShowBlockedUsers(false)} 
        />
      )}

      {/* Manage Organizers Modal */}
      {showManageOrganizers && adminProfile && (
        <ManageOrganizersModal
          adminProfile={adminProfile}
          onClose={() => setShowManageOrganizers(false)}
        />
      )}

      {/* Community Management Modal */}
      {manageCommunityEvent && adminProfile && (
        <CommunityModal
          event={manageCommunityEvent}
          currentUser={{ id: adminProfile.id }}
          isAdmin={true}
          profile={adminProfile}
          role="admin"
          onClose={() => setManageCommunityEvent(null)}
        />
      )}

      {/* Event Management Modal */}
      {managementEvent && adminProfile && (
        <EventManagementModal
          event={managementEvent}
          currentUser={adminProfile}
          role="admin"
          onClose={() => setManagementEvent(null)}
        />
      )}

      {/* Create/Edit Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-xl w-full relative max-h-[95vh] flex flex-col overflow-hidden">

            {/* Modal Header */}
            <div
              className="p-5 shrink-0 relative"
              style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)' }}
            >
              <h2 className="text-xl font-bold text-white">
                {editingEvent ? '✏️ Edit Event' : '🎉 Create New Event'}
              </h2>
              <p className="text-red-200 text-xs mt-0.5">Fill in the details below</p>
              <button
                onClick={() => { setShowAddEventModal(false); resetForm(); setMessage(''); }}
                className="absolute top-4 right-4 text-white opacity-70 hover:opacity-100 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Form */}
            <form
              id="event-form"
              onSubmit={handleSaveEvent}
              className="p-6 overflow-y-auto grow space-y-5"
            >
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Event Title *</label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g., Annual Tech Fest 2026"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-zinc-950 text-white text-sm"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Category</label>
                <div className="flex gap-2 mb-2.5">
                  <input
                    type="text"
                    name="category"
                    placeholder="Enter or pick a category below"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="flex-1 p-3 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-zinc-950 text-white text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.category && !categoryChips.includes(formData.category)) {
                        setCustomCategories([...customCategories, formData.category]);
                      }
                    }}
                    disabled={!formData.category || categoryChips.includes(formData.category)}
                    className="px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-300 font-semibold hover:bg-zinc-700 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm"
                  >
                    <Plus className="w-4 h-4 text-red-500" /> Create
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categoryChips.map(chip => {
                    const isCustom = customCategories.includes(chip);
                    return (
                      <span
                        key={chip}
                        onClick={() => setFormData({ ...formData, category: chip })}
                        className={`group flex items-center gap-1 px-3 py-1 text-xs rounded-full cursor-pointer transition font-medium ${formData.category === chip
                          ? 'text-white shadow-sm'
                          : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                          }`}
                        style={formData.category === chip ? { backgroundColor: '#dc2626' } : {}}
                      >
                        {chip}
                        {isCustom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomCategories(customCategories.filter(c => c !== chip));
                              if (formData.category === chip) {
                                setFormData({ ...formData, category: '' });
                              }
                            }}
                            className={`${formData.category === chip ? 'text-white/70 hover:text-white' : 'text-zinc-500 hover:text-red-400'} transition-colors ml-0.5`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Date, End Date & Deadline */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Start Date *</label>
                  <div className="relative">
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-zinc-950 text-white text-sm appearance-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-1.5">End Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-zinc-950 text-white text-sm appearance-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Reg. Deadline *</label>
                  <div className="relative">
                    <input
                      type="date"
                      name="deadline"
                      value={formData.deadline}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-zinc-950 text-white text-sm appearance-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Time Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Start Time (Optional)</label>
                  <div className="relative">
                    <input
                      type={formData.startTime ? "time" : "text"}
                      name="startTime"
                      value={formData.startTime}
                      placeholder="00:00 AM"
                      onFocus={(e) => (e.target.type = "time")}
                      onBlur={(e) => {
                        if (!formData.startTime) e.target.type = "text";
                      }}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-zinc-950 text-white text-sm appearance-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-1.5">End Time (Optional)</label>
                  <div className="relative">
                    <input
                      type={formData.endTime ? "time" : "text"}
                      name="endTime"
                      value={formData.endTime}
                      placeholder="00:00 AM"
                      onFocus={(e) => (e.target.type = "time")}
                      onBlur={(e) => {
                        if (!formData.endTime) e.target.type = "text";
                      }}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-zinc-950 text-white text-sm appearance-none"
                    />
                  </div>
                </div>
              </div>

              {/* Poster Upload */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Event Poster {!editingEvent && '*'}</label>
                <div className="border-2 border-dashed border-zinc-700 rounded-xl p-5 text-center relative cursor-pointer hover:border-red-500 transition bg-zinc-950">
                  <input
                    type="file"
                    name="posterFile"
                    accept="image/*"
                    onChange={handleInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required={!editingEvent}
                  />
                  {posterPreview ? (
                    <div>
                      <img src={posterPreview} alt="Preview" className="w-full h-36 object-contain rounded-lg" />
                      <p className="text-xs text-zinc-500 mt-1.5">Click to replace</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: '#dc2626' }} />
                      <p className="text-sm text-zinc-400 font-medium">Click to upload poster</p>
                      <p className="text-xs text-zinc-500 mt-1">PNG, JPG, WEBP recommended</p>
                    </>
                  )}
                </div>
              </div>

              {/* Venue */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Venue *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    name="venue"
                    placeholder="e.g., Main Auditorium"
                    value={formData.venue}
                    onChange={handleInputChange}
                    className="w-full pl-9 p-3 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-zinc-950 text-white text-sm"
                    required
                  />
                </div>
              </div>

              {/* Reg Link */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Registration Link (Optional)</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="url"
                    name="reg_link"
                    placeholder="https://..."
                    value={formData.reg_link}
                    onChange={handleInputChange}
                    className="w-full pl-9 p-3 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-zinc-950 text-white text-sm"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Description *</label>
                <textarea
                  name="description"
                  placeholder="Briefly describe what the event is about..."
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-zinc-950 text-white text-sm h-24 resize-none"
                  required
                />
              </div>

              {/* Custom Form Builder */}
              <FormBuilder fields={formBlueprint} onChange={setFormBlueprint} />
            </form>

            {/* Submit Footer */}
            <div className="bg-zinc-900 px-6 py-4 border-t border-zinc-800 shrink-0">
              <button
                type="submit"
                form="event-form"
                disabled={savingEvent}
                className={`w-full py-3 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm ${savingEvent ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ background: 'linear-gradient(135deg, #b91c1c, #dc2626)' }}
              >
                {savingEvent ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {editingEvent ? 'Saving...' : 'Publishing...'}
                  </span>
                ) : (
                  editingEvent ? '💾 Save Changes' : '🚀 Publish Event'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}