import React, { useEffect, useState } from 'react';
import { updatesApi } from '../../api/updates';
import { useAuthStore } from '../../store/authStore';

const STATUS_COLORS = {
  on_track: 'bg-green-100 text-green-800 border-green-200',
  at_risk: 'bg-orange-100 text-orange-800 border-orange-200',
  off_track: 'bg-red-100 text-red-800 border-red-200',
  on_hold: 'bg-gray-100 text-gray-800 border-gray-200'
};

const UpdatesTab = ({ projectId }) => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const canEdit = user?.role === 'manager' || user?.role === 'superuser';

  const [formData, setFormData] = useState({
     name: '',
     status: 'on_track',
     progress: 0,
     description: ''
  });

  const loadUpdates = async () => {
    setLoading(true);
    try {
      const data = await updatesApi.getUpdates(projectId);
      setUpdates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUpdates();
  }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    try {
      await updatesApi.createUpdate({
         ...formData,
         project_id: parseInt(projectId)
      });
      setShowForm(false);
      setFormData({ name: '', status: 'on_track', progress: 0, description: '' });
      await loadUpdates();
    } catch (err) {
      alert("Failed creating status update snapshot.");
    }
  };

  if (loading && updates.length === 0) return <div className="p-8 text-center text-gray-500">Extracting Snapshots...</div>;

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
         <h2 className="text-xl font-bold text-gray-900">Project Snapshots</h2>
         {canEdit && !showForm && (
            <button onClick={() => setShowForm(true)} className="px-4 py-1.5 bg-blue-600 text-white rounded-md font-medium text-sm shadow hover:bg-blue-700 transition">
              + Post Update
            </button>
         )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
           <h3 className="text-lg font-bold text-gray-800 mb-4 tracking-tight">New Status Report</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
              <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1">Title Snapshot</label>
                 <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full text-sm border border-gray-300 rounded-md focus:ring-blue-500" placeholder="e.g., Sprint 4 Completed" />
              </div>
              <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1">Overall Status</label>
                 <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full text-sm border border-gray-300 rounded-md focus:ring-blue-500">
                    <option value="on_track">On Track</option>
                    <option value="at_risk">At Risk</option>
                    <option value="off_track">Off Track</option>
                    <option value="on_hold">On Hold</option>
                 </select>
              </div>
           </div>
           
           <div className="mb-4">
             <label className="block text-sm font-semibold text-gray-700 mb-1 flex justify-between">
                <span>Progress Snapshot</span>
                <span className="text-blue-600">{formData.progress}%</span>
             </label>
             <input type="range" min="0" max="100" value={formData.progress} onChange={e => setFormData({...formData, progress: parseFloat(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2" />
           </div>

           <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Detailed Description</label>
              <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full text-sm border border-gray-300 rounded-md focus:ring-blue-500" placeholder="Break down what occurred during this update span..."></textarea>
           </div>
           
           <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white shadow-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow hover:bg-blue-700">Submit Post</button>
           </div>
        </form>
      )}

      <div className="space-y-6">
        {updates.length === 0 && (
           <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-500">No project updates have been mapped natively.</div>
        )}
        {updates.map(upd => (
           <div key={upd.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow transition-shadow">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
                 <div>
                    <h3 className="text-lg font-black text-gray-900 leading-tight">{upd.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-sm font-medium text-gray-500">{upd.date}</span>
                       <span className="text-gray-300">|</span>
                       <span className="text-sm font-medium text-gray-700">{upd.user_id ? upd.user_id[1] : 'Unknown'}</span>
                    </div>
                 </div>
                 <span className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider shrink-0 ${STATUS_COLORS[upd.status] || STATUS_COLORS.on_track}`}>
                    {upd.status.replace('_', ' ')}
                 </span>
              </div>
              
              <div className="mb-4">
                 <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-600 h-1.5" style={{ width: `${upd.progress || 0}%` }}></div>
                 </div>
                 <div className="text-right text-xs font-bold text-gray-500 mt-1">{upd.progress || 0}% complete</div>
              </div>
              
              <div className="text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1" dangerouslySetInnerHTML={{__html: upd.description}}></div>
           </div>
        ))}
      </div>
    </div>
  );
};

export default UpdatesTab;
