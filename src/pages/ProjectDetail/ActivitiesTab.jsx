import React, { useEffect, useState } from 'react';
import { activityApi } from '../../api/activities';
import { useActivityStore } from '../../store/activityStore';
import ActivityList from '../../components/ActivityList';
import ActivityForm from '../../components/ActivityForm';
import ChatterBox from '../../components/ChatterBox';

const ActivitiesTab = ({ resModel = "project.task", taskId, users }) => {
  const { activities, messages, activityTypes, setActivities, setMessages, setActivityTypes, loading, setLoading } = useActivityStore();
  const [showForm, setShowForm] = useState(false);
  const [newComment, setNewComment] = useState('');

  const loadData = async () => {
    setLoading(true);
    // Clear stale data immediately so prior task's data doesn't flash
    setActivities([]);
    setMessages([]);
    try {
      if (activityTypes.length === 0) {
        const meta = await activityApi.getMetadata();
        setActivityTypes(meta.activity_types);
      }
      
      const [acts, msgs] = await Promise.all([
         activityApi.getActivities(resModel, taskId),
         activityApi.getMessages(resModel, taskId)
      ]);
      setActivities(acts);
      setMessages(msgs);
    } catch (err) {
      console.error('ActivitiesTab load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!taskId) return;
    loadData();
  }, [taskId, resModel]);

  const handleCreateActivity = async (payload) => {
    try {
      await activityApi.createActivity({ ...payload, res_model: resModel, res_id: parseInt(taskId) });
      setShowForm(false);
      await loadData();
    } catch (err) {
      console.error('Create activity failed:', err);
    }
  };

  const handleMarkDone = async (id) => {
    try {
      await activityApi.markDone(id);
      await loadData();
    } catch (err) {
      console.error('Mark done failed:', err);
    }
  };

  const handleCancel = async (id) => {
    try {
      await activityApi.cancelActivity(id);
      await loadData();
    } catch (err) {
      console.error('Cancel activity failed:', err);
    }
  };

  const handlePostComment = async (commentText) => {
    try {
      await activityApi.createMessage(resModel, taskId, commentText);
      await loadData();
    } catch (err) {
      console.error('Post comment failed:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4 px-2">
      {/* Target Base - LHS */}
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
          <h3 className="text-lg font-bold text-gray-800 tracking-tight">Active Mail Mapping</h3>
          {!showForm && (
            <button 
              onClick={() => setShowForm(true)}
              className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-sm font-semibold rounded-full transition-colors"
            >
              + Schedule
            </button>
          )}
        </div>
        
        {loading && activities.length === 0 ? (
           <p className="text-sm text-gray-500 animate-pulse text-center mt-10">Fetching scheduled logic...</p>
        ) : (
           <div className="overflow-visible pb-4">
              {showForm && (
                <ActivityForm 
                   activityTypes={activityTypes}
                   onSubmit={handleCreateActivity}
                   onCancel={() => setShowForm(false)}
                   users={users}
                />
              )}
              <ActivityList 
                activities={activities}
                onMarkDone={handleMarkDone}
                onCancel={handleCancel}
              />
           </div>
        )}
      </div>
      
      {/* Chatter Tracker - RHS */}
      <div className="w-full">
         <ChatterBox 
           messages={messages} 
           loading={loading} 
           onPostComment={handlePostComment} 
         />
      </div>
    </div>
  );
};

export default ActivitiesTab;
