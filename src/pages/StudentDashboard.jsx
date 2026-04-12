// src/pages/StudentDashboard.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Calendar, MapPin, ExternalLink, Filter, CheckCircle, X, AlertTriangle, Menu, Home, ClipboardList, LogOut, Settings, Crown, MessageSquare, User } from 'lucide-react';
import DynamicForm from '../components/DynamicForm';
import SettingsModal from '../components/SettingsModal';
import CommunityModal from '../components/CommunityModal';

// ─── Description Modal (shared) ───────────────────────────────
const DescriptionModal = ({ event, onClose }) => {
  if (!event) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header image */}
        <div className="relative shrink-0">
          <img src={event.poster_url || event.posterUrl} alt={event.title} className="w-full h-56 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
          
          {event.category && (
            <span className="absolute top-4 left-4 px-3 py-1 text-xs font-bold uppercase tracking-wider text-zinc-900 bg-amber-400 rounded-full shadow-lg">
              {event.category}
            </span>
          )}
          <button onClick={onClose} className="absolute top-4 right-4 bg-zinc-900/60 backdrop-blur-md rounded-full p-2 hover:bg-amber-400 hover:text-zinc-900 transition-all text-zinc-200 shadow-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto grow relative z-10 -mt-6">
          <h2 className="text-3xl font-extrabold text-white mb-6 drop-shadow-md">{event.title}</h2>

          <div className="space-y-3 mb-6 bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50 text-sm text-zinc-300">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-zinc-100 w-24">Event Date:</span>
              <span>
                {event.date ? (
                  event.end_date && event.end_date !== event.date
                    ? `${new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} - ${new Date(event.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`
                    : new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                ) : 'TBD'}
                {(event.start_time || event.end_time) && (
                  <span className="ml-2 text-amber-500/80 font-medium">
                    ({event.start_time && `${new Date(`1970-01-01T${event.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}{event.start_time && event.end_time ? ' - ' : ''}{event.end_time && `${new Date(`1970-01-01T${event.end_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`})
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-amber-400/60" />
              <span className="font-semibold text-zinc-100 w-24">Deadline:</span>
              <span>{event.deadline ? new Date(event.deadline).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-zinc-100 w-24">Venue:</span>
              <span>{event.venue}</span>
            </div>
          </div>

          <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line bg-zinc-900 p-5 rounded-xl border border-zinc-800">
            {event.description}
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Registration Modal ───────────────────────────────────────
const RegistrationModal = ({ event, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(true);

  // Check if student is already registered
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('registrations')
        .select('id')
        .eq('event_id', event.id)
        .eq('student_id', session.user.id)
        .maybeSingle();
      if (data) setAlreadyRegistered(true);
      setCheckingDuplicate(false);
    };
    check();
  }, [event.id]);

  const handleSubmit = async (formResponse) => {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      // Get student profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, university_name')
        .eq('id', session.user.id)
        .single();

      const { error } = await supabase
        .from('registrations')
        .insert({
          event_id: event.id,
          student_id: session.user.id,
          student_email: profile?.email || session.user.email,
          student_name: profile?.university_name ? `${session.user.email.split('@')[0]}` : session.user.email,
          form_response: formResponse,
        });

      if (error) throw error;
      
      // Attempt to send email via Supabase Edge Function
      const studentEmail = profile?.email || session.user.email;
      const studentName = profile?.university_name ? `${session.user.email.split('@')[0]}` : session.user.email;
      
      supabase.functions.invoke('send-registration-email', {
        body: {
          eventTitle: event.title,
          studentName,
          studentEmail
        }
      }).catch(err => console.error("Failed to send edge function email:", err));

      onSuccess(event.title);
    } catch (err) {
      console.error('Registration error:', err);
      alert(err.message || 'Failed to register. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 shrink-0 relative">
          <h2 className="text-xl font-bold text-zinc-950">Register for {event.title}</h2>
          <p className="text-zinc-900/70 text-sm font-medium mt-1">Fill out the form below to secure your spot.</p>
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-zinc-900/70 hover:text-zinc-950 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto grow">
          {checkingDuplicate ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-zinc-400 text-sm font-medium">Checking registration status...</p>
            </div>
          ) : alreadyRegistered ? (
            <div className="text-center py-10 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
              <CheckCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Already Registered!</h3>
              <p className="text-zinc-400 text-sm mb-6">You've successfully secured your spot for this event.</p>
              <button
                onClick={onClose}
                className="px-8 py-2.5 text-sm font-bold text-zinc-900 bg-amber-400 rounded-xl hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20"
              >
                Awesome
              </button>
            </div>
          ) : (
            <div className="text-zinc-200">
               {/* Note: DynamicForm may need internal styling tweaks for dark mode, 
                   assuming it inherits text colors reasonably well */}
              <DynamicForm
                formBlueprint={event.form_blueprint}
                onSubmit={handleSubmit}
                onCancel={onClose}
                submitting={submitting}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Event Card ────────────────────────────────────────────────
const EventCard = ({ event, handleRegister, onSeeMore }) => {
  const eventDateDisplay = event.date ? (
    event.end_date && event.end_date !== event.date
      ? `${new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(event.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  ) : 'TBD';

  const timeDisplay = (event.start_time || event.end_time) ? 
    ` • ${event.start_time ? new Date(`1970-01-01T${event.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}` + 
    `${event.start_time && event.end_time ? ' - ' : ''}` + 
    `${event.end_time ? new Date(`1970-01-01T${event.end_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}`
  : '';

  const registrationDeadline = new Date(event.deadline);
  const isRegistrationOpen = new Date() < registrationDeadline;
  
  return (
    <div className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl hover:shadow-2xl hover:border-amber-500/50 transition-all duration-300 overflow-hidden flex flex-col h-full transform hover:-translate-y-1">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Poster */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={event.poster_url || event.posterUrl}
          alt={event.title}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          onError={(e) => (e.target.src = 'https://via.placeholder.com/400x200/18181b/fbbf24?text=Event')}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
        
        {event.category && (
          <span className="absolute top-4 left-4 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-950 bg-amber-400 rounded-full shadow-lg">
            {event.category}
          </span>
        )}
      </div>

      <div className="p-6 flex flex-col flex-grow relative z-10 -mt-6">
        <h3 className="text-2xl font-extrabold text-white mb-2 line-clamp-2 drop-shadow-md">{event.title}</h3>
        <p className="text-zinc-400 mb-2 text-sm line-clamp-2">{event.description}</p>
        
        <button onClick={() => onSeeMore(event)} className="text-amber-400 hover:text-amber-300 text-xs font-bold mb-4 w-fit flex items-center gap-1 transition-colors group">
          See More <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
        </button>
        
        {/* Event Details */}
        <div className="space-y-2 mb-6 mt-auto bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-700/50">
          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
            <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-medium truncate">{event.venue}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-zinc-300">
            <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-medium line-clamp-1">{eventDateDisplay} <span className="text-zinc-500">{timeDisplay}</span></span>
          </div>
          {/* <div className="flex items-center gap-2.5 text-xs text-zinc-500 mt-2">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Closes: {new Date(event.deadline).toLocaleDateString()}</span>
          </div> */}
        </div>

        {/* Actions */}
        <div className="mt-auto">
          {isRegistrationOpen ? (
            <button
              onClick={() => handleRegister(event)}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-extrabold rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              Secure Your Spot <ExternalLink className="w-4 h-4" />
            </button>
          ) : (
             <button
              disabled
              className="w-full py-3.5 bg-zinc-800 text-zinc-500 font-bold rounded-xl cursor-not-allowed border border-zinc-700"
            >
              Registration Closed
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


export default function StudentDashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMyRegistrations, setShowMyRegistrations] = useState(false);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [universityId, setUniversityId] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [communityEvent, setCommunityEvent] = useState(null);

  // Real-time listener: auto-logout if student gets rejected OR university gets unverified
  useEffect(() => {
    let profileChannel;
    let uniChannel;
    const setupListener = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      const userId = session.user.id;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profile) {
          if (profile.university_id) {
              setUniversityId(profile.university_id);
          }
          setStudentProfile(profile);
      }

      profileChannel = supabase
        .channel('student-profile-watch')
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
          } else {
            // Hot-reload the student profile state so Registration limits unlock
            setStudentProfile(payload.new);
          }
        })
        .subscribe();

      if (profile?.university_id) {
        uniChannel = supabase
          .channel('student-uni-watch')
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

  const [filterDate, setFilterDate] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [universityName, setUniversityName] = useState('University');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registeringEvent, setRegisteringEvent] = useState(null);
  const [settingsWarning, setSettingsWarning] = useState(null);

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Fetch student's registrations with event details (only for active/future events)
  const fetchMyRegistrations = async () => {
    setSidebarOpen(false);
    setShowMyRegistrations(true);
    setLoadingRegistrations(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('registrations')
        .select('id, created_at, event_id, events(id, title, date, end_date, start_time, end_time, venue, poster_url, category)')
        .eq('student_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out registrations for events that have already ended
      const today = new Date().toISOString().split('T')[0];
      const activeRegistrations = (data || []).filter(reg => {
        if (!reg.events) return false; // event was deleted
        const eventEnd = reg.events.end_date || reg.events.date;
        return eventEnd >= today;
      });

      setMyRegistrations(activeRegistrations);
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setMyRegistrations([]);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  // Auto-delete events that are more than 24 hours past their end date
  const cleanupExpiredEvents = async (allEvents) => {
    const now = new Date();
    const expiredIds = allEvents
      .filter(e => {
        const eventEnd = e.end_date || e.date;
        if (!eventEnd) return false;
        // Parse end date and add 24 hours
        const endDateTime = new Date(eventEnd + 'T23:59:59');
        const expiryTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);
        return now > expiryTime;
      })
      .map(e => e.id);

    if (expiredIds.length > 0) {
      // Delete registrations for expired events first
      await supabase
        .from('registrations')
        .delete()
        .in('event_id', expiredIds);

      // Delete the expired events
      await supabase
        .from('events')
        .delete()
        .in('id', expiredIds);

      console.log(`Auto-cleaned ${expiredIds.length} expired event(s)`);
    }

    return expiredIds;
  };

  // Fetch events based on the user's university_id AND setup real-time sync
  useEffect(() => {
    if (!universityId) return;

    let eventChannel;

    const fetchEvents = async () => {
      const { data: uni } = await supabase
        .from('universities')
        .select('name')
        .eq('id', universityId)
        .single();
      if (uni?.name) {
        setUniversityName(uni.name);
      }

      const { data: uniEvents, error } = await supabase
        .from('events')
        .select('*')
        .eq('university_id', universityId)
        .order('date', { ascending: true });

      if (uniEvents) {
        // Auto-delete events that are 24+ hours past their end date
        const deletedIds = await cleanupExpiredEvents(uniEvents);

        // Filter out expired events (end_date or date has passed)
        const today = new Date().toISOString().split('T')[0];
        const activeEvents = uniEvents.filter(e => {
          if (deletedIds.includes(e.id)) return false; // already deleted
          const eventEnd = e.end_date || e.date;
          return eventEnd >= today;
        });
        setEvents(activeEvents);
        setFilteredEvents(activeEvents);
      } else if (error) {
        console.error("Error fetching events:", error);
      }
    };

    const setupEventRealtime = () => {
      eventChannel = supabase
        .channel('student-events-realtime')
        .on('postgres_changes', {
          event: '*', // Listen to All changes
          schema: 'public',
          table: 'events',
          filter: `university_id=eq.${universityId}`
        }, (payload) => {
          const today = new Date().toISOString().split('T')[0];
          
          if (payload.eventType === 'INSERT') {
            const newEvent = payload.new;
            setEvents(prev => {
                const exists = prev.some(e => e.id === newEvent.id);
                if (exists) return prev;
                return [newEvent, ...prev].sort((a, b) => a.date.localeCompare(b.date));
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedEvent = payload.new;
            setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
          } else if (payload.eventType === 'DELETE') {
            setEvents(prev => prev.filter(e => e.id !== payload.old.id));
          }
        })
        .subscribe();
    };

    fetchEvents();
    setupEventRealtime();

    return () => {
        if (eventChannel) supabase.removeChannel(eventChannel);
    };
  }, [universityId]);

  // Filter events by date
  useEffect(() => {
    if (filterDate) {
      setFilteredEvents(events.filter(event => event.date === filterDate));
    } else {
      setFilteredEvents(events);
    }
  }, [filterDate, events]);

  const handleRegister = (event) => {
    // Force mandatory profile completion
    if (!studentProfile ||
        !studentProfile.display_name?.trim() ||
        !studentProfile.full_name?.trim() ||
        !studentProfile.phone?.trim() ||
        !studentProfile.degree?.trim()) {
      setSettingsWarning('Please complete your profile to continue to chat');
      setShowSettings(true);
      return;
    }

    setRegisteringEvent(event);
  };

  const handleRegistrationSuccess = (eventTitle) => {
    setRegisteringEvent(null);
    setMessage(`Successfully registered for "${eventTitle}"!`);
    setMessageType('success');
  };
  
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);


  const uniqueDates = [...new Set(events.map(event => event.date))].sort();

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: '#09090b' }}> {/* zinc-950 equivalent */}
      
      {/* Description Modal */}
      <DescriptionModal 
        event={selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
      />

      {/* Registration Modal */}
      {registeringEvent && (
        <RegistrationModal
          event={registeringEvent}
          onClose={() => setRegisteringEvent(null)}
          onSuccess={handleRegistrationSuccess}
        />
      )}

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Slide-out Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-zinc-900 border-r border-zinc-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-6 py-6 bg-zinc-950 border-b border-zinc-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <Crown className="w-6 h-6 text-amber-500" />
            <span className="text-lg font-bold text-white truncate">{universityName || 'Student Portal'}</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-zinc-500 hover:text-amber-400 transition relative z-10">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Sidebar Menu Items */}
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => { setSidebarOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-3 w-full px-5 py-3.5 text-sm font-semibold text-zinc-300 rounded-xl hover:bg-amber-400/10 hover:text-amber-400 transition group"
          >
            <Home className="w-5 h-5 text-zinc-500 group-hover:text-amber-400 transition-colors" /> Upcoming Events
          </button>
          <button
            onClick={fetchMyRegistrations}
            className="flex items-center gap-3 w-full px-5 py-3.5 text-sm font-semibold text-zinc-300 rounded-xl hover:bg-amber-400/10 hover:text-amber-400 transition group"
          >
            <ClipboardList className="w-5 h-5 text-zinc-500 group-hover:text-amber-400 transition-colors" /> My Registrations
          </button>
          <button
            onClick={() => { setSidebarOpen(false); setShowSettings(true); }}
            className="flex items-center gap-3 w-full px-5 py-3.5 text-sm font-semibold text-zinc-300 rounded-xl hover:bg-amber-400/10 hover:text-amber-400 transition group"
          >
            <Settings className="w-5 h-5 text-zinc-500 group-hover:text-amber-400 transition-colors" /> Settings
          </button>
        </nav>

        {/* Logout */}
        <div className="border-t border-zinc-800 p-4 bg-zinc-950/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-5 py-3.5 text-sm font-semibold text-red-500 rounded-xl hover:bg-red-500/10 transition"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800 shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2.5 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 transition group" aria-label="Open menu">
            <Menu className="w-6 h-6 text-zinc-300 group-hover:text-amber-400 transition-colors" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-white tracking-wide uppercase truncate max-w-[200px] sm:max-w-none">
              {universityName || 'Student'} <span className="text-amber-500">Events</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-full shadow-inner">
             <Filter className="w-4 h-4 text-amber-500" />
             <span className="text-sm font-medium text-zinc-300">Explore</span>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center justify-center w-10 h-10 bg-zinc-800 border border-zinc-700 rounded-full hover:bg-zinc-700 hover:border-amber-500/50 shadow-inner overflow-hidden transition-all group"
            title="My Profile"
          >
            {studentProfile?.display_name ? (
              <div className="w-full h-full bg-amber-500 flex items-center justify-center text-zinc-950 font-bold text-sm">
                {studentProfile.display_name.charAt(0).toUpperCase()}
              </div>
            ) : (
              <User className="w-5 h-5 text-zinc-400 group-hover:text-amber-500 transition-colors" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20 relative">
        {/* Background glow elements */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-40 right-20 w-80 h-80 bg-zinc-700/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="text-center mb-16 relative z-10">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight drop-shadow-sm">
            Discover Campus <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Happenings</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-medium">
            Find, track, and register for the most exclusive events hosted across your university.
          </p>
        </div>

        {/* Filter Section */}
        <div className="mb-12 relative z-10 flex flex-col md:flex-row justify-between items-center bg-zinc-900/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-800 shadow-2xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-6 md:mb-0">
             <Filter className="text-amber-500 w-6 h-6" /> Filter by Date
          </h2>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-3 border border-zinc-700 rounded-xl w-full md:w-72 bg-zinc-800 text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow appearance-none cursor-pointer"
            >
              <option value="">All Upcoming Dates</option>
              {uniqueDates.map(dateStr => (
                  <option key={dateStr} value={dateStr}>
                      {new Date(dateStr).toLocaleDateString()}
                  </option>
              ))}
            </select>
            <button
              onClick={() => setFilterDate('')}
              className="px-6 py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl border border-zinc-700 hover:bg-zinc-700 hover:text-white transition shadow-md"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Events Grid */}
        <div className="relative z-10">
          {filteredEvents.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredEvents.map((event, idx) => (
                <EventCard 
                  key={event.id || idx} 
                  event={event} 
                  handleRegister={handleRegister} 
                  onSeeMore={setSelectedEvent}
                />
              ))}
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 py-24 px-6 rounded-3xl shadow-xl text-center">
              <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <AlertTriangle className="w-12 h-12 text-amber-500 opacity-80" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">No Events Found</h3>
              <p className="text-zinc-400 max-w-md mx-auto">
                {filterDate 
                  ? `We couldn't find any events scheduled for ${new Date(filterDate).toLocaleDateString()}. Try another date.`
                  : 'Looks like the campus is quiet right now. Check back soon for exciting new events!'}
              </p>
              {filterDate && (
                 <button
                 onClick={() => setFilterDate('')}
                 className="mt-8 px-8 py-3 bg-amber-500 text-zinc-950 font-bold rounded-xl hover:bg-amber-400 transition shadow-lg shadow-amber-500/20"
               >
                 View All Events
               </button>
              )}
            </div>
          )}
        </div>

        {/* Notification Toast */}
        {message && (
          <div className="fixed bottom-8 right-8 z-50 animate-fade-in-up">
             <div className="flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl text-zinc-900 font-bold text-sm bg-amber-400 border border-amber-300">
              <CheckCircle className="w-5 h-5" /> {message}
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={async () => {
            setShowSettings(false);
            setSettingsWarning(null);
            // Refresh profile immediately to unlock chat
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
              if (data) setStudentProfile(data);
            }
          }}
          accentColor="amber"
          role="student"
          initialWarning={settingsWarning}
        />
      )}

      {/* My Registrations Modal */}
      {showMyRegistrations && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowMyRegistrations(false)}>
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-zinc-800 to-zinc-900 p-6 flex items-center justify-between shrink-0 border-b border-zinc-700">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <ClipboardList className="w-6 h-6 text-amber-500" /> My Tickets
              </h2>
              <button onClick={() => setShowMyRegistrations(false)} className="bg-zinc-800 p-2 rounded-full text-zinc-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto grow">
              {loadingRegistrations ? (
                <div className="text-center py-16">
                  <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-zinc-500 font-medium tracking-wide">Fetching your registrations...</p>
                </div>
              ) : myRegistrations.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                     <ClipboardList className="w-10 h-10 text-zinc-600" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No Tickets Yet</h3>
                  <p className="text-zinc-500">Go explore the upcoming events and secure your spot!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myRegistrations.map((reg) => (
                    <div key={reg.id} className="relative overflow-hidden flex items-center gap-5 p-4 bg-zinc-800 border border-zinc-700 rounded-2xl hover:border-amber-500/50 transition-colors group">
                      
                      {/* Ticket Notch effect left & right visually, optional. We'll stick to simple styling */}
                      {reg.events?.poster_url ? (
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-zinc-700">
                          <img
                            src={reg.events.poster_url}
                            alt={reg.events.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-zinc-700 shrink-0 border border-zinc-600 flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-zinc-500" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0 py-1">
                        <h4 className="text-base font-bold text-white truncate mb-1">{reg.events?.title || 'Unknown Event'}</h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-zinc-400">
                          <span className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 rounded-md line-clamp-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            {reg.events?.date ? (
                              reg.events.end_date && reg.events.end_date !== reg.events.date
                                ? `${new Date(reg.events.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(reg.events.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                : new Date(reg.events.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            ) : 'N/A'}
                            {(reg.events?.start_time || reg.events?.end_time) && (
                              <span className="ml-0.5 text-zinc-500">
                                • {reg.events.start_time && new Date(`1970-01-01T${reg.events.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                {reg.events.start_time && reg.events.end_time ? ' - ' : ''}
                                {reg.events.end_time && `${!reg.events.start_time ? ' ' : ''}${new Date(`1970-01-01T${reg.events.end_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="pr-4 flex flex-col gap-2 items-center justify-center">
                        <div className="w-8 h-8 bg-amber-500/10 rounded-full flex items-center justify-center" title="Registered">
                          <CheckCircle className="w-4 h-4 text-amber-500" />
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCommunityEvent({ ...reg.events, id: reg.event_id }); }}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-lg transition shadow group-hover:shadow-amber-500/20"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Chat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 text-center">
              <p className="text-xs font-semibold text-zinc-500 tracking-wider">SHOW THESE AT THE VENUE</p>
            </div>
          </div>
        </div>
      )}

      {/* Community Modal */}
      {communityEvent && studentProfile && (
        <CommunityModal
          event={communityEvent}
          currentUser={{ id: studentProfile.id }}
          isAdmin={false}
          profile={studentProfile}
          onClose={() => { setCommunityEvent(null); fetchMyRegistrations(); }} // refresh profile implicitly if they updated it
        />
      )}

      {/* Footer */}
      <footer className="py-10 text-center border-t border-zinc-800 bg-zinc-950 relative z-10">
        <div className="flex justify-center items-center gap-2 text-zinc-500 text-sm font-medium">
          <Crown className="w-4 h-4 text-amber-500/50" /> 
          <span>© 2026 {universityName} Event Hub.</span>
        </div>
      </footer>
    </div>
  );
}