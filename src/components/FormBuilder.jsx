// src/components/FormBuilder.jsx
import { Plus, Trash2, GripVertical } from 'lucide-react';

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'number', label: 'Number' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'date', label: 'Date' },
];

export default function FormBuilder({ fields, onChange }) {
  const addField = () => {
    onChange([
      ...fields,
      { id: crypto.randomUUID(), label: '', type: 'text', options: [] },
    ]);
  };

  const updateField = (id, key, value) => {
    onChange(fields.map(f => (f.id === id ? { ...f, [key]: value } : f)));
  };

  const removeField = (id) => {
    onChange(fields.filter(f => f.id !== id));
  };

  const addOption = (fieldId) => {
    onChange(fields.map(f => {
      if (f.id === fieldId) {
        return { ...f, options: [...(f.options || []), ''] };
      }
      return f;
    }));
  };

  const updateOption = (fieldId, optionIndex, value) => {
    onChange(fields.map(f => {
      if (f.id === fieldId) {
        const newOptions = [...(f.options || [])];
        newOptions[optionIndex] = value;
        return { ...f, options: newOptions };
      }
      return f;
    }));
  };

  const removeOption = (fieldId, optionIndex) => {
    onChange(fields.map(f => {
      if (f.id === fieldId) {
        const newOptions = (f.options || []).filter((_, i) => i !== optionIndex);
        return { ...f, options: newOptions };
      }
      return f;
    }));
  };

  return (
    <div className="mt-6 border-t border-zinc-800 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Custom Registration Fields</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Build the registration form students will fill out.
          </p>
        </div>
        <button
          type="button"
          onClick={addField}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:text-red-500 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add Field
        </button>
      </div>

      {fields.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-zinc-700 rounded-lg">
          <p className="text-sm text-zinc-500">No custom fields yet.</p>
          <p className="text-xs text-zinc-500 mt-1">Click "Add Field" to start building your form.</p>
        </div>
      )}

      <div className="space-y-3">
        {fields.map((field, idx) => (
          <div
            key={field.id}
            className="flex items-start gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg group"
          >
            {/* Grip icon */}
            <div className="pt-2.5 text-zinc-600">
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Field number */}
            <span className="pt-2.5 text-xs font-bold text-zinc-500 w-5 shrink-0">
              {idx + 1}
            </span>

            {/* Field config */}
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Field label (e.g., Full Name)"
                  value={field.label}
                  onChange={(e) => updateField(field.id, 'label', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:ring-red-500 focus:border-red-500"
                />
                <select
                  value={field.type}
                  onChange={(e) => updateField(field.id, 'type', e.target.value)}
                  className="px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:ring-red-500 focus:border-red-500"
                >
                  {FIELD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Dropdown options — individual inputs */}
              {field.type === 'dropdown' && (
                <div className="space-y-1.5 pl-1">
                  {(field.options || []).map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 w-4 shrink-0">{optIdx + 1}.</span>
                      <input
                        type="text"
                        placeholder={`Option ${optIdx + 1}`}
                        value={opt}
                        onChange={(e) => updateOption(field.id, optIdx, e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:ring-red-500 focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(field.id, optIdx)}
                        className="text-zinc-500 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(field.id)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 font-medium mt-1 transition"
                  >
                    <Plus className="w-3 h-3" /> Add Option
                  </button>
                </div>
              )}
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={() => removeField(field.id)}
              className="pt-2 text-zinc-600 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
