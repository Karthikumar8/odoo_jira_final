import { create } from 'zustand';

export const useStageStore = create((set) => ({
  stages: [],
  loading: false,
  error: null,
  
  setStages: (stages) => set({ stages }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  reorderLocalStages: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.stages);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    
    const updatedStages = result.map((stage, index) => ({
      ...stage,
      sequence: index + 1
    }));
    
    return { stages: updatedStages };
  })
}));
