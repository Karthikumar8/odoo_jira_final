import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectApi } from '../../api/projects';
import { stageApi } from '../../api/stages';
import { useProjectStore } from '../../store/projectStore';
import { useStageStore } from '../../store/stageStore';
import { useAuthStore } from '../../store/authStore';
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TaskKanban from './TaskKanban';
import MilestonesTab from './MilestonesTab';
import UpdatesTab from './UpdatesTab';
import ActivitiesTab from './ActivitiesTab';
import { timesheetApi } from '../../api/timesheets';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentProject, setCurrentProject, loading: projectLoading, setError: setProjectError } = useProjectStore();
  const { stages, setStages, reorderLocalStages, loading: stagesLoading } = useStageStore();
  const [activeTab, setActiveTab] = useState('Overview');
  const { user } = useAuthStore();
  
  const canEdit = user?.role === 'manager' || user?.role === 'superuser';
  const [newStageName, setNewStageName] = useState('');
  const [projectTimesheets, setProjectTimesheets] = useState([]);
  const [tsLoading, setTsLoading] = useState(false);
  const [tsLoaded, setTsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      useProjectStore.getState().setLoading(true);
      try {
        const [projData, stageData] = await Promise.all([
          projectApi.getProject(id),
          stageApi.getStages(id),
        ]);
        if (mounted) {
          setCurrentProject(projData);
          setStages(stageData);
        }
      } catch (err) {
        if (mounted) setProjectError('Failed to fetch project details');
      } finally {
        if (mounted) useProjectStore.getState().setLoading(false);
      }
    };
    // Reset timesheet state when project changes
    setTsLoaded(false);
    setProjectTimesheets([]);
    loadData();
    return () => { mounted = false; };
  }, [id, setCurrentProject, setStages, setProjectError]);

  // Lazy-load timesheets only when that tab is active
  useEffect(() => {
    if (activeTab !== 'Timesheets' || tsLoaded) return;
    let mounted = true;
    const loadTs = async () => {
      setTsLoading(true);
      try {
        const tsData = await timesheetApi.getTimesheets({ project_id: id });
        if (mounted) {
          setProjectTimesheets(tsData || []);
          setTsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load project timesheets', err);
      } finally {
        if (mounted) setTsLoading(false);
      }
    };
    loadTs();
    return () => { mounted = false; };
  }, [activeTab, tsLoaded, id]);

  const onDragEnd = async (result) => {
    if (!result.destination || !canEdit) return;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    // Optimistic UI update
    reorderLocalStages(sourceIndex, destIndex);
    
    // Get new state to send to API
    const newStages = useStageStore.getState().stages;
    const payload = newStages.map((s) => ({ id: s.id, sequence: s.sequence }));
    
    try {
      await stageApi.reorderStages(payload);
    } catch (err) {
      console.error("Reorder failed", err);
    }
  };

  const handleCreateStage = async (e) => {
    e.preventDefault();
    if (!newStageName.trim() || !canEdit) return;
    try {
      await stageApi.createStage({
        name: newStageName,
        project_ids: [parseInt(id)],
        sequence: stages.length ? stages[stages.length - 1].sequence + 1 : 1
      });
      setNewStageName('');
      const updatedStages = await stageApi.getStages(id);
      setStages(updatedStages);
    } catch (err) {
      console.error("Stage created failed", err);
    }
  };

  const handleArchiveStage = async (stageId) => {
    if (!canEdit) return;
    if (!window.confirm("Archive this stage?")) return;
    try {
      await stageApi.deleteStage(stageId);
      setStages(stages.filter(s => s.id !== stageId));
    } catch (err) {
      console.error("Archive failed", err);
    }
  };

  const toggleFold = async (stage) => {
    if (!canEdit) return;
    try {
      const newFold = !stage.fold;
      await stageApi.updateStage(stage.id, { fold: newFold });
      setStages(stages.map(s => s.id === stage.id ? { ...s, fold: newFold } : s));
    } catch (err) {
      console.error("Update fold failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm flex items-center px-4 py-3 sm:px-6 lg:px-8">
        <button onClick={() => navigate('/projects')} className="mr-4 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 truncate">
          {currentProject?.name || 'Loading Project...'}
        </h1>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {projectLoading ? (
          <div className="text-gray-500 text-center py-10">Loading details...</div>
        ) : currentProject ? (
          <div className="bg-white shadow rounded-lg p-6 flex flex-col min-h-[500px]">
            <nav className="mb-6 flex space-x-6 border-b border-gray-200 pb-4 overflow-x-auto">
              {['Overview', 'Stages', 'Tasks', 'Timesheets', 'Milestones', 'Activities', 'Updates'].map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2 whitespace-nowrap font-medium text-sm transition-colors ${activeTab === tab ? 'text-[#ff771c] border-b-2 border-[#ff771c]' : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'}`}
                >
                  {tab}
                </button>
              ))}
            </nav>
            
            {activeTab === 'Overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Project Details</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-gray-500 font-medium">Customer</dt>
                      <dd className="col-span-2 text-gray-900">{currentProject.partner_id ? currentProject.partner_id[1] : 'Internal / None'}</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-gray-500 font-medium">Manager</dt>
                      <dd className="col-span-2 text-gray-900">{currentProject.user_id ? currentProject.user_id[1] : 'Unassigned'}</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-gray-500 font-medium">Visibility</dt>
                      <dd className="col-span-2 text-gray-900 capitalize">{currentProject.privacy_visibility?.replace('_', ' ')}</dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Time & Progress</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-gray-500 font-medium">Allocated</dt>
                      <dd className="col-span-2 text-gray-900">{currentProject.allocated_hours} h</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-gray-500 font-medium">Effective</dt>
                      <dd className="col-span-2 text-gray-900">{currentProject.effective_hours} h</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-gray-500 font-medium">Progress</dt>
                      <dd className="col-span-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min(currentProject.progress || 0, 100)}%` }}></div>
                        </div>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {activeTab === 'Stages' && (
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Project Stages</h3>
                </div>
                
                {canEdit && (
                  <form onSubmit={handleCreateStage} className="mb-6 flex gap-2">
                    <input 
                      type="text" 
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder="New stage name..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#ff771c] focus:border-[#ff771c] sm:text-sm"
                    />
                    <button type="submit" disabled={!newStageName.trim()} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white disabled:opacity-50" style={{ backgroundColor: '#ff771c' }}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </button>
                  </form>
                )}

                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="stages-list" isDropDisabled={!canEdit}>
                    {(provided) => (
                      <div 
                        {...provided.droppableProps} 
                        ref={provided.innerRef}
                        className="space-y-3"
                      >
                        {stages.map((stage, index) => (
                          <Draggable key={stage.id.toString()} draggableId={stage.id.toString()} index={index} isDragDisabled={!canEdit}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm ${snapshot.isDragging ? 'ring-2 ring-blue-500 shadow-md' : 'border-gray-200'} ${stage.fold ? 'opacity-60 bg-gray-50' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                  {canEdit && (
                                    <div {...provided.dragHandleProps} className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
                                      <GripVertical className="h-5 w-5" />
                                    </div>
                                  )}
                                  <span className="font-medium text-gray-700">
                                    {stage.name} {stage.fold && '(Folded)'}
                                  </span>
                                </div>
                                
                                {canEdit && (
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => toggleFold(stage)} className="text-sm text-gray-500 hover:text-gray-700" title="Toggle Fold">
                                      {stage.fold ? 'Unfold' : 'Fold'}
                                    </button>
                                    <button onClick={() => handleArchiveStage(stage.id)} className="p-1 text-gray-400 hover:text-red-600" title="Archive Stage">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {stages.length === 0 && !stagesLoading && (
                          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                            No stages created yet.
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            )}
            
            {activeTab === 'Tasks' && (
              <TaskKanban projectId={id} />
            )}

            {activeTab === 'Milestones' && (
              <MilestonesTab projectId={id} />
            )}

            {activeTab === 'Updates' && (
              <UpdatesTab projectId={id} />
            )}

            {activeTab === 'Activities' && (
              <ActivitiesTab resModel="project.project" taskId={id} users={[]} />
            )}

            {activeTab === 'Timesheets' && (
              <div className="space-y-4 py-4">
                 <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Project Logged Time</h3>
                 {tsLoading ? (
                   <div className="text-center py-10 text-gray-500">Loading timesheets...</div>
                 ) : (
                 <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
                   <table className="min-w-full divide-y divide-gray-200 text-sm">
                     <thead className="bg-gray-50">
                       <tr>
                         <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                         <th className="px-4 py-3 text-left font-medium text-gray-500">Employee</th>
                         <th className="px-4 py-3 text-left font-medium text-gray-500">Task</th>
                         <th className="px-4 py-3 text-left font-medium text-gray-500 w-full">Description</th>
                         <th className="px-4 py-3 text-right font-medium text-gray-500">Hours</th>
                       </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                       {projectTimesheets.map(ts => (
                         <tr key={ts.id} className="hover:bg-gray-50 transition-colors">
                           <td className="px-4 py-3 whitespace-nowrap text-gray-500">{ts.date}</td>
                           <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                             {Array.isArray(ts.employee_id) ? ts.employee_id[1] : (ts.employee_id || '-')}
                           </td>
                           <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                             {Array.isArray(ts.task_id) ? ts.task_id[1] : (ts.task_id || 'No Task')}
                           </td>
                           <td className="px-4 py-3 text-gray-700 truncate max-w-[200px]">{ts.name}</td>
                           <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-blue-600">
                             {typeof ts.unit_amount === 'number' ? ts.unit_amount.toFixed(2) : ts.unit_amount}h
                           </td>
                         </tr>
                       ))}
                       {projectTimesheets.length === 0 && (
                         <tr>
                           <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                             No timesheets logged for this project yet.
                           </td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                 </div>
                 )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-10">No project loaded.</div>
        )}
      </main>
    </div>
  );
};

export default ProjectDetailPage;
