import { create } from 'zustand';

export const useActivityStore = create((set) => ({
  activities: [],
  messages: [],
  activityTypes: [],
  loading: false,
  error: null,
  
  setActivities: (activities) => set({ activities }),
  setMessages: (messages) => set({ messages }),
  setActivityTypes: (activityTypes) => set({ activityTypes }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));
