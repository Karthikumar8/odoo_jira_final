import React, { useEffect, useState } from 'react';
import { taskApi } from '../../api/tasks';
import { timesheetApi } from '../../api/timesheets';
import { useAuthStore } from '../../store/authStore';
import { useStageStore } from '../../store/stageStore';
import TaskForm from '../../components/TaskForm';
import TimerWidget from '../../components/TimerWidget';
import MilestonesTab from './MilestonesTab';
import ActivitiesTab from './ActivitiesTab';
import { X, Trash2 } from 'lucide-react';

const TaskDetail = ({ taskId, projectId, onClose, onSaveSuccess }) => {
  const [taskData, setTaskData] = useState(null);
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);
  
  const { user } = useAuthStore();
  const { stages } = useStageStore();
  
  const canEdit = user?.role === 'manager' || user?.role === 'superuser';
  const isNew = taskId === 'new';

  const loadTimesheets = async () => {
    if (isNew) return;
    try {
      const tsData = await timesheetApi.getTimesheets({ task_id: taskId });
      setTimesheets(tsData);
    } catch (err) {
      console.error("Failed loading timesheets", err);
    }
  };

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const metadata = await taskApi.getMetadata();
        if (!mounted) return;
        setUsers(metadata.users);
        setTags(metadata.tags);
        
        if (isNew) {
           setTaskData({ project_id: projectId });
        } else {
           const data = await taskApi.getTaskDetail(taskId);
           setTaskData(data);
           await loadTimesheets();
        }
      } catch (err) {
        console.error("Failed to load task metadata", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    fetchData();
    return () => { mounted = false; };
  }, [taskId, projectId, isNew]);

  const handleSubmit = async (payload) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      if (isNew) {
         payload.project_id = parseInt(projectId);
         await taskApi.createTask(payload);
      } else {
         await taskApi.updateTask(taskId, payload);
      }
      onSaveSuccess && onSaveSuccess();
      onClose();
    } catch (err) {
      alert("Error saving. Please check fields.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTimesheet = async (tsId) => {
    if (!canEdit) return;
    if (!window.confirm("Delete this timesheet entry?")) return;
    try {
       await timesheetApi.deleteTimesheet(tsId);
       setTimesheets(timesheets.filter(t => t.id !== tsId));
    } catch (e) {
       console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col mt-10 md:mt-0">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-lg z-10">
          <h2 className="text-xl font-bold text-gray-900 truncate flex-1">
             {isNew ? 'Create New Task' : (taskData?.name || 'Loading task...')}
          </h2>

          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {!isNew && !loading && (
          <div className="px-6 border-b border-gray-200 bg-gray-50 flex gap-6 text-sm font-medium">
             <button 
               onClick={() => setActiveTab('details')}
               className={`py-3 px-1 border-b-2 ${activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
             >
               Properties
             </button>
             <button 
               onClick={() => setActiveTab('timesheets')}
               className={`py-3 px-1 border-b-2 ${activeTab === 'timesheets' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
             >
               Timesheets ({timesheets.length})
             </button>
             <button 
               onClick={() => setActiveTab('milestones')}
               className={`py-3 px-1 border-b-2 ${activeTab === 'milestones' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
             >
               Project Milestones
             </button>
             <button 
               onClick={() => setActiveTab('activities')}
               className={`py-3 px-1 border-b-2 ${activeTab === 'activities' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
             >
               Activities & Chatter
             </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1 relative">
          {loading ? (
             <div className="py-20 text-center text-gray-500">Loading Configuration...</div>
          ) : taskData ? (
             <>
                {activeTab === 'details' && (
                  <TaskForm 
                    initialData={taskData} 
                    onSubmit={handleSubmit} 
                    onCancel={onClose} 
                    canEdit={canEdit}
                    projectStages={stages}
                    users={users}
                    tags={tags}
                  />
                )}
                
                {activeTab === 'timesheets' && !isNew && (
                  <div className="space-y-4">
                     <div className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm border border-gray-100 mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Logged Time</h3>
                        <TimerWidget 
                          taskId={taskId} 
                          taskName={taskData?.name} 
                          projectId={projectId} 
                          onTimesheetLogged={() => {
                              loadTimesheets(); 
                              onSaveSuccess && onSaveSuccess(); 
                          }}
                        />
                     </div>
                     <div className="border border-gray-200 rounded-md overflow-hidden">
                       <table className="min-w-full divide-y divide-gray-200 text-sm">
                         <thead className="bg-gray-50">
                           <tr>
                             <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                             <th className="px-4 py-3 text-left font-medium text-gray-500">Employee</th>
                             <th className="px-4 py-3 text-left font-medium text-gray-500 w-full">Description</th>
                             <th className="px-4 py-3 text-right font-medium text-gray-500">Hours</th>
                             {canEdit && <th className="px-4 py-3"></th>}
                           </tr>
                         </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                           {timesheets.map(ts => (
                             <tr key={ts.id} className="hover:bg-gray-50">
                               <td className="px-4 py-3 whitespace-nowrap text-gray-500">{ts.date}</td>
                               <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{ts.employee_id ? ts.employee_id[1] : '-'}</td>
                               <td className="px-4 py-3 text-gray-700 truncate max-w-[200px]">{ts.name}</td>
                               <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-blue-600">{ts.unit_amount.toFixed(2)}h</td>
                               {canEdit && (
                                 <td className="px-4 py-3 whitespace-nowrap text-right">
                                   <button onClick={() => handleDeleteTimesheet(ts.id)} className="text-gray-400 hover:text-red-500">
                                     <Trash2 size={16} />
                                   </button>
                                 </td>
                               )}
                             </tr>
                           ))}
                           {timesheets.length === 0 && (
                             <tr>
                               <td colSpan={canEdit ? 5 : 4} className="px-4 py-8 text-center text-gray-500">
                                 No timesheets recorded yet. Start the timer to log work!
                               </td>
                             </tr>
                           )}
                         </tbody>
                       </table>
                     </div>
                  </div>
                )}
                
                {activeTab === 'milestones' && !isNew && (
                  <MilestonesTab projectId={projectId} />
                )}
                
                {activeTab === 'activities' && !isNew && (
                  <ActivitiesTab taskId={taskId} users={users} />
                )}
             </>
          ) : (
             <div className="py-20 text-center text-red-500">Failed to load payload.</div>
          )}
          
          {saving && (
             <div className="absolute inset-0 bg-white bg-opacity-70 flex justify-center items-center z-20 rounded-lg">
                <span className="px-4 py-2 bg-gray-900 text-white rounded-md shadow">Syncing with Odoo...</span>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
