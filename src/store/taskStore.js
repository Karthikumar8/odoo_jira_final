import { create } from 'zustand';

export const useTaskStore = create((set, get) => ({
  tasksByStage: {},
  loading: false,
  error: null,
  
  setTasks: (tasks) => {
    const grouped = {};
    tasks.forEach(task => {
      const stageId = task.stage_id && task.stage_id.length ? task.stage_id[0] : 'unassigned';
      if (!grouped[stageId]) grouped[stageId] = [];
      grouped[stageId].push(task);
    });
    set({ tasksByStage: grouped });
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  moveTaskLocal: (taskId, sourceStageId, destStageId, sourceIndex, destIndex) => {
    const state = get();
    const backupTasksByStage = JSON.parse(JSON.stringify(state.tasksByStage));
    const newTasksByStage = { ...state.tasksByStage };
    
    if (!newTasksByStage[sourceStageId]) newTasksByStage[sourceStageId] = [];
    if (!newTasksByStage[destStageId]) newTasksByStage[destStageId] = [];
    
    const sourceList = Array.from(newTasksByStage[sourceStageId]);
    const destList = sourceStageId === destStageId ? sourceList : Array.from(newTasksByStage[destStageId]);
    
    const [movedTask] = sourceList.splice(sourceIndex, 1);
    const updatedTask = { ...movedTask };
    
    if (sourceStageId !== destStageId && destStageId !== 'unassigned') {
      updatedTask.stage_id = [parseInt(destStageId), "Loading..."];
    }
    
    destList.splice(destIndex, 0, updatedTask);
    
    newTasksByStage[sourceStageId] = sourceList;
    if (sourceStageId !== destStageId) {
      newTasksByStage[destStageId] = destList;
    }
    
    set({ tasksByStage: newTasksByStage });
    return backupTasksByStage;
  },
  
  rollbackTasks: (backupTasksByStage) => {
    set({ tasksByStage: backupTasksByStage });
  }
}));
