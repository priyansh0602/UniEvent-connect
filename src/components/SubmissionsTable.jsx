// src/components/SubmissionsTable.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Users, RefreshCw, Download } from 'lucide-react';

export default function SubmissionsTable({ event, onClose }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const blueprint = event.form_blueprint || [];

  // Fetch existing submissions
  useEffect(() => {
    let channel;
    const fetchSubmissions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });

      if (!error && data) setSubmissions(data);
      setLoading(false);
    };
    
    fetchSubmissions();

    // Real-time subscription for new registrations
    channel = supabase
      .channel(`registrations-${event.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'registrations',
        filter: `event_id=eq.${event.id}`,
      }, () => {
        // Re-fetch everything cleanly to ensure RLS doesn't block payload visibility
        fetchSubmissions();
      })
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [event.id]);

  // Export submissions as CSV
  const exportCSV = () => {
    const headers = ['#', 'Student Name', 'Email', 'Submitted At', ...blueprint.map(f => f.label)];
    const rows = submissions.map((sub, idx) => {
      const response = sub.form_response || {};
      return [
        idx + 1,
        sub.student_name,
        sub.student_email,
        new Date(sub.created_at).toLocaleString(),
        ...blueprint.map(f => response[f.id] || '—'),
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/\s+/g, '_')}_registrations.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-zinc-900 border-b border-zinc-800 p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-lg font-semibold text-white">{event.title}</h2>
              <p className="text-zinc-400 text-xs mt-0.5">
                {submissions.length} registration{submissions.length !== 1 ? 's' : ''} • Live updates enabled
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              disabled={submissions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition disabled:opacity-50 border border-zinc-700"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button onClick={onClose} className="text-white opacity-80 hover:opacity-100 transition">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto grow">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 text-red-500 animate-spin" />
              <span className="ml-3 text-zinc-400">Loading submissions...</span>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 font-medium">No registrations yet</p>
              <p className="text-zinc-500 text-sm mt-1">Registrations will appear here in real-time.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-800 sticky top-0 border-b border-zinc-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider border-r border-zinc-700">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider border-r border-zinc-700">Student Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider border-r border-zinc-700">Email</th>
                  {blueprint.map(f => (
                    <th key={f.id} className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider border-r border-zinc-700">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-900 border-t border-zinc-700">
                {submissions.map((sub, idx) => {
                  const response = sub.form_response || {};
                  return (
                    <tr key={sub.id} className="hover:bg-zinc-800/50 transition">
                      <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-white">{sub.student_name}</td>
                      <td className="px-4 py-3 text-zinc-400">{sub.student_email}</td>
                      {blueprint.map(f => (
                        <td key={f.id} className="px-4 py-3 text-zinc-400">
                          {response[f.id] || <span className="text-zinc-600">—</span>}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-zinc-500 text-xs">
                        {new Date(sub.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
