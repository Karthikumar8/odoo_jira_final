import { create } from 'zustand';
import { reportingApi } from '../api/reporting';

export const useReportingStore = create((set) => ({
  taskAnalysis: null,
  leaderboard: null,
  projectHealth: null,
  myTasks: null,
  loading: false,
  error: null,
  
  fetchTaskAnalysis: async () => {
     try {
       const data = await reportingApi.getTaskAnalysis();
       set({ taskAnalysis: data });
     } catch (err) {}
  },
  fetchLeaderboard: async (period = 7) => {
     try {
       const data = await reportingApi.getLeaderboard(period);
       set({ leaderboard: data });
     } catch (err) {}
  },
  fetchProjectHealth: async () => {
     try {
       const data = await reportingApi.getProjectHealth();
       set({ projectHealth: data.projects });
     } catch (err) {}
  },
  fetchMyTasks: async () => {
     try {
       const data = await reportingApi.getMyTasks();
       set({ myTasks: data.my_tasks });
     } catch (err) {}
  },
  fetchAll: async () => {
     set({ loading: true });
     try {
       await Promise.all([
          useReportingStore.getState().fetchTaskAnalysis(),
          useReportingStore.getState().fetchLeaderboard(),
          useReportingStore.getState().fetchProjectHealth(),
          useReportingStore.getState().fetchMyTasks()
       ]);
     } catch (err) {
       set({ error: err.message });
     } finally {
       set({ loading: false });
     }
  }
}));
