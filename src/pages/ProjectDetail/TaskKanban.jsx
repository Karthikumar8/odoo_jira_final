import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import TaskCard from '../../components/TaskCard';
import { taskApi } from '../../api/tasks';
import { useTaskStore } from '../../store/taskStore';
import { useStageStore } from '../../store/stageStore';
import { useAuthStore } from '../../store/authStore';
import TaskDetail from './TaskDetail';

const TaskKanban = ({ projectId }) => {
  const { stages } = useStageStore();
  const { tasksByStage, setTasks, loading, setLoading, error, setError, moveTaskLocal, rollbackTasks } = useTaskStore();
  const { user } = useAuthStore();
  const [newTaskNames, setNewTaskNames] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [tagMap, setTagMap] = useState({});
  
  const canEdit = user?.role === 'manager' || user?.role === 'superuser';

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await taskApi.getTasks(projectId);
      setTasks(data);
    } catch (err) {
      setError('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // Load tag metadata for display
    taskApi.getMetadata().then(meta => {
      const map = {};
      (meta.tags || []).forEach(t => { map[t.id] = t; });
      setTagMap(map);
    }).catch(() => {});
  }, [projectId]);

  const handleDragEnd = async (result) => {
    if (!result.destination || !canEdit) return;
    
    const sourceStageId = result.source.droppableId;
    const destStageId = result.destination.droppableId;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    const taskId = parseInt(result.draggableId);

    if (sourceStageId === destStageId && sourceIndex === destIndex) return;

    const backupState = moveTaskLocal(taskId, sourceStageId, destStageId, sourceIndex, destIndex);

    try {
      await taskApi.moveTask(taskId, destStageId, destIndex + 1);
    } catch (err) {
      console.error("Move failed, rolling back", err);
      rollbackTasks(backupState);
    }
  };

  const handleCreateTask = async (e, stageId) => {
    e.preventDefault();
    const name = newTaskNames[stageId];
    if (!name?.trim() || !canEdit) return;
    
    try {
      await taskApi.createTask({
        name,
        project_id: parseInt(projectId),
        stage_id: parseInt(stageId)
      });
      setNewTaskNames({ ...newTaskNames, [stageId]: '' });
      await loadTasks();
    } catch (err) {
      console.error("Create task failed", err);
    }
  };

  const handleArchive = async (taskId) => {
    if (!canEdit) return;
    try {
      await taskApi.archiveTask(taskId);
      await loadTasks();
    } catch (err) {
      console.error("Archive failed", err);
    }
  };

  return (
    <div className="flex-1 w-full bg-white rounded-lg shadow mt-4 p-4 overflow-x-auto min-h-[500px]">
      {error && <div className="text-red-500 mb-4">{error}</div>}
      
      {loading && Object.keys(tasksByStage).length === 0 ? (
        <div className="text-center py-10 text-gray-500">Loading tasks...</div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full snap-x snap-mandatory pb-4">
            {stages.map((stage) => {
              const stageId = stage.id.toString();
              const tasks = tasksByStage[stageId] || [];
              
              return (
                <div key={stageId} className="flex-shrink-0 w-80 bg-gray-50 rounded-md shadow-sm border border-gray-200 flex flex-col snap-center">
                  <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-100 rounded-t-md">
                    <h3 className="font-semibold text-gray-800 truncate" title={stage.name}>
                      {stage.name}
                    </h3>
                    <span className="bg-gray-200 text-gray-600 text-xs py-0.5 px-2 rounded-full font-medium">
                      {tasks.length}
                    </span>
                  </div>
                  
                  <Droppable droppableId={stageId} isDropDisabled={!canEdit}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-2 space-y-2 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
                      >
                        {tasks.map((task, index) => (
                          <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index} isDragDisabled={!canEdit}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={snapshot.isDragging ? 'opacity-90 shadow-lg' : ''}
                                onClick={() => setSelectedTaskId(task.id)}
                              >
                                <TaskCard task={task} onArchive={handleArchive} canEdit={canEdit} tagMap={tagMap} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  {canEdit && (
                    <div className="p-2 border-t border-gray-200 bg-white rounded-b-md flex gap-2">
                      <form onSubmit={(e) => handleCreateTask(e, stageId)} className="flex-1 flex items-center gap-2">
                        <Plus className="text-gray-400 w-4 h-4 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="Quick add..."
                          value={newTaskNames[stageId] || ''}
                          onChange={(e) => setNewTaskNames({...newTaskNames, [stageId]: e.target.value})}
                          className="w-full text-sm bg-transparent border-none focus:ring-0 placeholder-gray-400 p-1"
                        />
                      </form>
                      <button 
                        type="button"
                        onClick={() => setSelectedTaskId('new')}
                        className="text-xs text-blue-600 hover:text-blue-800 px-2 font-medium"
                      >
                         Full
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            
            {stages.length === 0 && (
              <div className="text-gray-500 w-full text-center py-10">No stages defined yet. Add stages to see Kanban.</div>
            )}
          </div>
        </DragDropContext>
      )}
      
      {selectedTaskId && (
         <TaskDetail 
           taskId={selectedTaskId}
           projectId={projectId}
           onClose={() => setSelectedTaskId(null)}
           onSaveSuccess={loadTasks}
         />
      )}
    </div>
  );
};

export default TaskKanban;
