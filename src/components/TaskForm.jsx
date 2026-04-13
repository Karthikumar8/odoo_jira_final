import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

const RichTextEditor = ({ content, onChange, editable }) => {
  const editor = useEditor({
    extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true })],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className={`prose max-w-none border border-gray-300 rounded-md p-3 min-h-[150px] ${!editable ? 'bg-gray-50 opacity-80 cursor-not-allowed' : 'bg-white focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500'}`}>
      <EditorContent editor={editor} />
    </div>
  );
};

const TaskForm = ({ initialData = {}, onSubmit, onCancel, canEdit, projectStages, users, tags }) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    description: initialData.description || '',
    user_ids: initialData.user_ids ? (Array.isArray(initialData.user_ids) && Array.isArray(initialData.user_ids[0]) ? initialData.user_ids : initialData.user_ids) : [],
    tag_ids: initialData.tag_ids || [],
    stage_id: initialData.stage_id ? initialData.stage_id[0] : (projectStages.length > 0 ? projectStages[0].id : ''),
    priority: initialData.priority || "0",
    date_deadline: initialData.date_deadline ? initialData.date_deadline.substring(0, 10) : '',
    planned_date_begin: initialData.planned_date_begin ? initialData.planned_date_begin.substring(0, 16) : '',
    date_end: initialData.date_end ? initialData.date_end.substring(0, 16) : '',
    allocated_hours: initialData.allocated_hours || 0,
    progress: initialData.progress || 0
  });

  // Safe checks for existing arrays vs M2M formats if needed (some m2m might come as [1,2,3])
  const [selectedUsers, setSelectedUsers] = useState(initialData.user_ids || []);
  const [selectedTags, setSelectedTags] = useState(initialData.tag_ids || []);

  const handleChange = (field, value) => {
    if (!canEdit) return;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleArray = (id, currentArray, setArrayFn) => {
    if (!canEdit) return;
    if (currentArray.includes(id)) {
      setArrayFn(currentArray.filter(i => i !== id));
    } else {
      setArrayFn([...currentArray, id]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canEdit) return;
    // Assemble final payload securely avoiding unchanged spam
    const payload = {};
    for (const key in formData) {
      if (formData[key] !== initialData[key]) {
        payload[key] = formData[key];
      }
    }
    // Handle specific array fields independently in case they differ by mapping
    payload.user_ids = selectedUsers;
    payload.tag_ids = selectedTags;
    // ensure M20 formats correctly sending ID
    if (payload.stage_id) payload.stage_id = parseInt(payload.stage_id);
    if (!payload.name && !initialData.name) {
       alert("Task name is required");
       return;
    }
    onSubmit({...initialData, ...payload, name: formData.name});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Task Name *</label>
        <input
          type="text"
          required
          readOnly={!canEdit}
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm ${!canEdit ? 'bg-gray-100' : 'focus:ring-[#ff771c] focus:border-[#ff771c]'}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
          <select
            disabled={!canEdit}
            value={formData.stage_id}
            onChange={(e) => handleChange('stage_id', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm disabled:bg-gray-100"
          >
            {projectStages.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            disabled={!canEdit}
            value={formData.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm disabled:bg-gray-100"
          >
            <option value="0">Normal</option>
            <option value="1">High</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <RichTextEditor
          content={formData.description}
          onChange={(html) => handleChange('description', html)}
          editable={canEdit}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assignees</label>
          <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 bg-white flex flex-wrap gap-2">
            {users?.map(u => (
              <button
                key={u.id}
                type="button"
                disabled={!canEdit}
                onClick={() => handleToggleArray(u.id, selectedUsers, setSelectedUsers)}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${selectedUsers.includes(u.id) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
              >
                {u.name}
              </button>
            ))}
            {!users?.length && <span className="text-xs text-gray-400">Loading users...</span>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
          <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 bg-white flex flex-wrap gap-2">
            {tags?.map(t => (
              <button
                key={t.id}
                type="button"
                disabled={!canEdit}
                onClick={() => handleToggleArray(t.id, selectedTags, setSelectedTags)}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${selectedTags.includes(t.id) ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
              >
                {t.name}
              </button>
            ))}
            {!tags?.length && <span className="text-xs text-gray-400">Loading tags...</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-200 pt-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Deadline</label>
          <input
            type="date"
            readOnly={!canEdit}
            value={formData.date_deadline}
            onChange={(e) => handleChange('date_deadline', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm disabled:bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="datetime-local"
            readOnly={!canEdit}
            value={formData.planned_date_begin}
            onChange={(e) => handleChange('planned_date_begin', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm disabled:bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="datetime-local"
            readOnly={!canEdit}
            value={formData.date_end}
            onChange={(e) => handleChange('date_end', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm disabled:bg-gray-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-200 pt-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Allocated Hours</label>
          <input
            type="number"
            step="0.5"
            readOnly={!canEdit}
            value={formData.allocated_hours}
            onChange={(e) => handleChange('allocated_hours', parseFloat(e.target.value))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm disabled:bg-gray-100"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 flex justify-between">
            <span>Progress</span>
            <span>{formData.progress || 0}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            disabled={!canEdit}
            value={formData.progress || 0}
            onChange={(e) => handleChange('progress', parseFloat(e.target.value))}
            className="mt-2 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 pb-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {canEdit ? 'Cancel' : 'Close'}
        </button>
        {canEdit && (
          <button
            type="submit"
            className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400"
            style={{ backgroundColor: '#ff771c' }}
          >
            Save Task
          </button>
        )}
      </div>
    </form>
  );
};

export default TaskForm;
