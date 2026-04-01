// src/pages/DemoSelect.jsx
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  GraduationCap, Users, Settings, ArrowLeft, Calendar, MapPin,
  ExternalLink, Filter, CheckCircle, Plus, Edit, Trash2, X, Eye, ShieldCheck, Crown
} from 'lucide-react';

// ─── Mock Data ────────────────────────────────────────────────
const MOCK_EVENTS = [
  {
    id: 1,
    title: 'National Hackathon 2026',
    category: 'Technology',
    date: '2026-04-15',
    deadline: '2026-04-10',
    venue: 'CS Block – Lab 301',
    description: 'A 36-hour hackathon open to all branches. Build innovative solutions and win exciting prizes. This year we are partnering with Google, Microsoft, and Amazon to bring you industry-level problem statements across domains like healthcare, fintech, sustainability, and education. Top 3 teams will receive cash prizes worth ₹1,00,000 along with internship offers from our sponsor companies. Meals, snacks, and energy drinks will be provided throughout the event. Mentors from leading startups will be available for guidance during the hacking phase. Whether you are a beginner or an experienced developer, this is your chance to showcase your skills on a national stage!',
    poster_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=400&fit=crop',
    reg_link: '#',
    form_blueprint: [
      { id: 'f1', label: 'Full Name', type: 'text', options: [] },
      { id: 'f2', label: 'Year of Study', type: 'dropdown', options: ['1st Year', '2nd Year', '3rd Year', '4th Year'] },
      { id: 'f3', label: 'Phone Number', type: 'number', options: [] },
    ],
  },
  {
    id: 2,
    title: 'Inter-University Cricket Tournament',
    category: 'Sports',
    date: '2026-04-20',
    deadline: '2026-04-18',
    venue: 'University Stadium',
    description: 'Annual cricket tournament featuring teams from 8 universities. Register your team now!',
    poster_url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&h=400&fit=crop',
    reg_link: '#',
  },
  {
    id: 3,
    title: 'Art & Culture Festival',
    category: 'Arts & Culture',
    date: '2026-05-01',
    deadline: '2026-04-28',
    venue: 'Open Air Theatre',
    description: 'Celebrate creativity with dance, music, and art exhibitions from student clubs across campus.',
    poster_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop',
    reg_link: '#',
  },
  {
    id: 4,
    title: 'Campus Career Fair',
    category: 'Career',
    date: '2026-05-10',
    deadline: '2026-05-08',
    venue: 'Main Auditorium',
    description: 'Meet recruiters from top companies. Bring your resume and land your dream internship.',
    poster_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop',
    reg_link: '#',
  },
];

const DEMO_UNIVERSITY = 'Demo University';

// ─── Description Modal (shared between themes) ────────────────
const DescriptionModal = ({ event, onClose, theme = 'dark' }) => {
  if (!event) return null;

  const isDark = theme === 'dark';
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={isDark ? "bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden" 
                         : "bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden"}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative shrink-0">
          <img src={event.poster_url} alt={event.title} className="w-full h-56 object-cover" />
          <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-zinc-900' : 'from-white/30'} to-transparent`} />
          
          {event.category && (
            <span className={`absolute top-4 left-4 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full shadow-lg 
              ${isDark ? 'text-zinc-950 bg-amber-400' : 'text-white bg-red-600'}`}>
              {event.category}
            </span>
          )}
          <button onClick={onClose} className={`absolute top-4 right-4 backdrop-blur-md rounded-full p-2 transition-all shadow-md 
            ${isDark ? 'bg-zinc-900/60 text-zinc-200 hover:bg-amber-400 hover:text-zinc-950' : 'bg-zinc-900/60 text-zinc-200 hover:bg-red-500 hover:text-white'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto grow relative z-10 -mt-6">
          <h2 className={`text-3xl font-extrabold mb-6 text-white drop-shadow-md`}>{event.title}</h2>

          <div className={`space-y-3 mb-6 p-4 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700/50 text-zinc-300' : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-300'}`}>
            <div className="flex items-center gap-3">
              <Calendar className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-red-500'}`} />
              <span className={`font-semibold w-24 text-zinc-100`}>Event Date:</span>
              <span>{event.date ? new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD'}</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className={`w-4 h-4 ${isDark ? 'text-amber-400/60' : 'text-red-400/60'}`} />
              <span className={`font-semibold w-24 text-zinc-100`}>Deadline:</span>
              <span>{event.deadline ? new Date(event.deadline).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-red-500'}`} />
              <span className={`font-semibold w-24 text-zinc-100`}>Venue:</span>
              <span>{event.venue}</span>
            </div>
          </div>

          <p className={`text-sm leading-relaxed whitespace-pre-line p-5 rounded-xl border 
            text-zinc-400 bg-zinc-900 border-zinc-800`}>
            {event.description}
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Student Demo Event Card (Black & Gold Theme) ─────────────
const StudentEventCard = ({ event, onSeeMore, onDemoAction }) => {
  return (
    <div className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl hover:shadow-2xl hover:border-amber-500/50 transition-all duration-300 overflow-hidden flex flex-col h-full transform hover:-translate-y-1">
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="relative h-52 overflow-hidden">
        <img src={event.poster_url} alt={event.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
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

        <div className="space-y-2 mb-6 mt-auto bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-700/50 text-sm text-zinc-300">
          <div className="flex items-center gap-2.5"><MapPin className="w-4 h-4 text-amber-500" /><span className="truncate">{event.venue}</span></div>
          <div className="flex items-center gap-2.5"><Calendar className="w-4 h-4 text-amber-500" /><span>{new Date(event.date).toLocaleDateString()}</span></div>
        </div>

        <button onClick={onDemoAction} className="btn-secondary w-full">
          Secure Your Spot <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ─── Admin Demo Event Card (Red & White Theme) ────────────────
const AdminEventCard = ({ event, onSeeMore, onDemoAction }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col">
      <div className="relative">
        <img src={event.poster_url} alt={event.title} className="w-full h-44 object-cover" />
        {event.category && (
          <span className="absolute top-3 left-3 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white bg-red-600 rounded-full shadow">
            {event.category}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h4 className="text-lg font-bold text-white truncate mb-2">{event.title}</h4>
        <div className="space-y-1.5 mb-3">
          <p className="text-sm text-zinc-400 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-red-500" />{new Date(event.date).toLocaleDateString()}</p>
          <p className="text-sm text-zinc-400 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-red-500" />{event.venue}</p>
        </div>

        {event.form_blueprint && event.form_blueprint.length > 0 && (
          <span className="text-xs text-red-500 bg-zinc-800 border border-zinc-700 inline-block px-2.5 py-1 rounded-full mb-3 font-medium">
            {event.form_blueprint.length} custom fields
          </span>
        )}

        <div className="mt-auto space-y-2">
          <button onClick={onDemoAction} className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-white border border-zinc-700 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition font-semibold">
            <Eye className="w-4 h-4" /> View Submissions
          </button>
          <button onClick={onDemoAction} className="flex items-center justify-center w-full py-2 text-xs font-semibold text-red-500 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 transition">
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Event
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Student Demo View ────────────────────────────────────────
const StudentDemoView = ({ onBack }) => {
  const [filterDate, setFilterDate] = useState('');
  const [toast, setToast] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const uniqueDates = [...new Set(MOCK_EVENTS.map(e => e.date))].sort();
  const filtered = filterDate ? MOCK_EVENTS.filter(e => e.date === filterDate) : MOCK_EVENTS;

  const showDemoToast = () => {
    setToast('This is a demo — sign up to access full features!');
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <div className="min-h-screen font-sans bg-[#09090b]"> {/* pure dark background */}
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800 shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 transition group" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-zinc-300 group-hover:text-amber-400 transition-colors" />
          </button>
          <div className="flex items-center gap-2 text-white font-black tracking-wide uppercase">
            {DEMO_UNIVERSITY} <span className="text-amber-500">Student Portal</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20 relative">
        <div className="absolute top-20 left-10 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="text-center mb-16 relative z-10">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight drop-shadow-sm">
             Upcoming <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Events</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-medium">Find and register for the latest happenings across the simulated university.</p>
        </div>

        {/* Filter */}
        <div className="mb-12 relative z-10 flex flex-col md:flex-row justify-between items-center bg-zinc-900/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-800 shadow-2xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-6 md:mb-0">
             <Filter className="text-amber-500 w-6 h-6" /> Filter by Date
          </h2>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-3 border border-zinc-700 rounded-xl w-full md:w-72 bg-zinc-800 text-white font-medium focus:ring-2 focus:ring-amber-500 transition-shadow appearance-none"
            >
              <option value="">All Upcoming Dates</option>
              {uniqueDates.map(d => <option key={d} value={d}>{new Date(d).toLocaleDateString()}</option>)}
            </select>
            <button onClick={() => setFilterDate('')} className="px-6 py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl border border-zinc-700 hover:bg-zinc-700 hover:text-white transition shadow-md">
              Reset
            </button>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-10">
          {filtered.map(event => (
            <StudentEventCard key={event.id} event={event} onSeeMore={setSelectedEvent} onDemoAction={showDemoToast} />
          ))}
        </div>
      </div>

      {selectedEvent && <DescriptionModal event={selectedEvent} onClose={() => setSelectedEvent(null)} theme="dark" />}

      {toast && (
        <div className="fixed bottom-8 right-8 z-50 animate-fade-in-up">
          <div className="flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl text-zinc-900 font-bold text-sm bg-amber-400 border border-amber-300">
            <CheckCircle className="w-5 h-5" /> {toast}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Admin Demo View ──────────────────────────────────────────
const AdminDemoView = ({ onBack }) => {
  const [toast, setToast] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const showDemoToast = () => {
    setToast('This is a demo — sign up to access full features!');
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <div className="min-h-screen font-sans bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-0 bg-zinc-900 border-b border-zinc-800 shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 transition group" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-zinc-300 group-hover:text-red-500 transition-colors" />
          </button>
          <div className="flex items-center gap-2 py-4">
            <div className="w-2 h-8 rounded-full bg-red-600" />
            <span className="text-lg font-bold text-white">{DEMO_UNIVERSITY} <span className="font-medium text-zinc-500">Admin</span></span>
          </div>
        </div>
        <button onClick={showDemoToast} className="btn-admin text-sm px-5 py-2.5 rounded-xl">
          <Plus className="w-4 h-4" /> Create Event
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10 text-center md:text-left relative z-10">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">Event Management</h1>
          <p className="text-zinc-400 text-lg">Create, manage and publish events for your university.</p>
          <div className="h-1 w-20 rounded-full mt-4 bg-red-600 md:mx-0 mx-auto" />
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-10">
          {MOCK_EVENTS.map(event => (
            <AdminEventCard key={event.id} event={event} onSeeMore={setSelectedEvent} onDemoAction={showDemoToast} />
          ))}
        </div>
      </div>

      {selectedEvent && <DescriptionModal event={selectedEvent} onClose={() => setSelectedEvent(null)} theme="light" />}

      {toast && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white z-50 transition-all duration-300 text-sm font-semibold bg-red-600">
          {toast}
        </div>
      )}
    </div>
  );
};

// ─── Main DemoSelect Component ────────────────────────────────
export default function DemoSelect() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('role') || 'select';

  const setView = (newView) => {
    if (newView === 'select') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('role');
      setSearchParams(newParams);
    } else {
      setSearchParams({ role: newView });
    }
  };

  if (view === 'student') return <StudentDemoView onBack={() => setView('select')} />;
  if (view === 'admin') return <AdminDemoView onBack={() => setView('select')} />;

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-white">
      {/* Simple Header */}
      <header className="flex items-center justify-between px-6 md:px-12 py-6 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
        <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white font-medium transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back to Home
        </Link>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-2 rounded-xl">
            <GraduationCap className="text-zinc-950 w-5 h-5" />
          </div>
          <span className="text-lg font-black tracking-tight">UniEvent Connect</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-24 text-center relative">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-zinc-800/30 rounded-full blur-[100px] pointer-events-none" />
        
        <h1 className="text-5xl font-black text-white mb-6 relative z-10">
          Explore Demo Roles
        </h1>
        <p className="text-xl text-zinc-400 mb-16 max-w-2xl mx-auto relative z-10">
          See how UniEvent Connect works for different users. Select a role to view a personalized, simulated dashboard.
        </p>

        <div className="grid md:grid-cols-2 gap-10 relative z-10">
          {/* Student Demo Card */}
          <div className="card-student flex flex-col items-center text-center p-12 group" onClick={() => setView('student')}>
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
              <Crown className="text-zinc-950 w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black mb-4">Student Access</h3>
            <p className="text-zinc-400 text-lg mb-8">
              Experience the slick, dark-mode portal where you can browse and securely register for campus events.
            </p>
            <button className="btn-secondary w-full">
               Launch Student Demo
            </button>
          </div>

          {/* Admin Demo Card */}
          <div className="card-admin flex flex-col items-center text-center p-12 group" onClick={() => setView('admin')}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/20 rounded-full blur-[60px] pointer-events-none" />
            <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-700 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-red-600/20 group-hover:scale-110 transition-transform relative z-10">
              <ShieldCheck className="text-white w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black mb-4 text-white relative z-10">Admin Console</h3>
            <p className="text-zinc-400 text-lg mb-8 relative z-10">
              Check out the bright, clean command center for faculty. Create events, review analytics, and manage data.
            </p>
            <button className="btn-admin w-full relative z-10">
               Launch Admin Demo
            </button>
          </div>
        </div>

        <div className="mt-20 relative z-10">
          <p className="text-zinc-500 font-medium">
            Ready to get started? <Link to="/signup" className="text-white font-bold hover:underline">Sign up for an account</Link>.
          </p>
        </div>
      </div>

    </div>
  );
}
