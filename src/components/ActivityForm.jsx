import React, { useState } from 'react';

const ActivityForm = ({ activityTypes, onSubmit, onCancel, users }) => {
  const [formData, setFormData] = useState({
    activity_type_id: activityTypes.length > 0 ? activityTypes[0].id : '',
    summary: '',
    date_deadline: new Date().toISOString().split('T')[0],
    user_id: '',
    note: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.activity_type_id) {
       alert('Select an activity type before submitting');
       return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-50 border border-blue-200 rounded-lg mb-6 shadow-inner space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Activity Type *</label>
          <select 
            required
            className="w-full text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
            value={formData.activity_type_id}
            onChange={e => setFormData({...formData, activity_type_id: e.target.value})}
          >
            {activityTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Due Date</label>
          <input 
            type="date"
            className="w-full text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
            value={formData.date_deadline}
            onChange={e => setFormData({...formData, date_deadline: e.target.value})}
          />
        </div>
      </div>
      
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Summary</label>
        <input 
          type="text" 
          placeholder="e.g., Discuss feature requirements..."
          className="w-full text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
          value={formData.summary}
          onChange={e => setFormData({...formData, summary: e.target.value})}
        />
      </div>

      <div>
         <label className="block text-xs font-semibold text-gray-700 mb-1">Assign To</label>
         <select
            className="w-full text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
            value={formData.user_id}
            onChange={e => setFormData({...formData, user_id: e.target.value})}
         >
            <option value="">(Self) / Leave Empty</option>
            {users?.map(u => (
               <option key={u.id} value={u.id}>{u.name}</option>
            ))}
         </select>
      </div>
      
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Note (Optional HTML)</label>
        <textarea 
          rows="3"
          className="w-full text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
          placeholder="Add further context relating to this activity..."
          value={formData.note}
          onChange={e => setFormData({...formData, note: e.target.value})}
        ></textarea>
      </div>
      
      <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 mt-2">
        <button type="button" onClick={onCancel} className="px-4 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 shadow-sm transition-colors">
          Discard
        </button>
        <button type="submit" className="px-4 py-1.5 text-sm font-medium bg-blue-600 border border-transparent rounded-md text-white hover:bg-blue-700 shadow-sm transition-colors">
          Schedule Activity
        </button>
      </div>
    </form>
  );
};

export default ActivityForm;
