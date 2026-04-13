import { create } from 'zustand';

export const useMilestoneStore = create((set) => ({
  milestones: [],
  loading: false,
  error: null,
  
  setMilestones: (milestones) => set({ milestones }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
