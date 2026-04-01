// src/components/DynamicForm.jsx
import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

export default function DynamicForm({ formBlueprint, onSubmit, onCancel, submitting }) {
  const [responses, setResponses] = useState({});

  const updateResponse = (fieldId, value) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(responses);
  };

  if (!formBlueprint || formBlueprint.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-zinc-400 mb-4">No registration form has been set up for this event.</p>
        <p className="text-sm text-zinc-500">Click below to register with just your name and email.</p>
        <div className="flex gap-3 justify-center mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-medium text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit({})}
            disabled={submitting}
            className="px-5 py-2.5 text-sm font-semibold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-amber-500/20"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Submitting...' : 'Quick Register'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {formBlueprint.map((field) => (
        <div key={field.id}>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            {field.label}
          </label>

          {/* Render input based on field type */}
          {field.type === 'text' && (
            <input
              type="text"
              placeholder={`Enter ${field.label.toLowerCase()}`}
              value={responses[field.id] || ''}
              onChange={(e) => updateResponse(field.id, e.target.value)}
              className="w-full px-3 py-2.5 border border-zinc-700 bg-zinc-800 text-white rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500"
              required
            />
          )}

          {field.type === 'number' && (
            <input
              type="number"
              placeholder={`Enter ${field.label.toLowerCase()}`}
              value={responses[field.id] || ''}
              onChange={(e) => updateResponse(field.id, e.target.value)}
              className="w-full px-3 py-2.5 border border-zinc-700 bg-zinc-800 text-white rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500"
              required
            />
          )}

          {field.type === 'date' && (
            <input
              type="date"
              value={responses[field.id] || ''}
              onChange={(e) => updateResponse(field.id, e.target.value)}
              className="w-full px-3 py-2.5 border border-zinc-700 bg-zinc-800 text-white rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500"
              required
            />
          )}

          {field.type === 'dropdown' && (
            <select
              value={responses[field.id] || ''}
              onChange={(e) => updateResponse(field.id, e.target.value)}
              className="w-full px-3 py-2.5 border border-zinc-700 bg-zinc-800 text-white rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500"
              required
            >
              <option value="">Select {field.label.toLowerCase()}</option>
              {(field.options || []).map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          )}
        </div>
      ))}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 text-sm font-medium text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 text-sm font-semibold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {submitting ? 'Submitting...' : 'Submit Registration'}
        </button>
      </div>
    </form>
  );
}
