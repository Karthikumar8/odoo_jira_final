import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTimesheetStore = create(
  persist(
    (set, get) => ({
      activeTimer: null,
      
      startTimer: (taskId, taskName) => {
        const { activeTimer } = get();
        if (activeTimer && activeTimer.taskId !== taskId) {
           return false;
        }
        set({
          activeTimer: {
            taskId,
            taskName,
            startTime: Date.now(),
            isPaused: false,
            accumulatedTime: activeTimer ? activeTimer.accumulatedTime : 0
          }
        });
        return true;
      },
      
      pauseTimer: () => {
        const { activeTimer } = get();
        if (!activeTimer || activeTimer.isPaused) return;
        const now = Date.now();
        const elapsed = now - activeTimer.startTime;
        set({
          activeTimer: {
            ...activeTimer,
            isPaused: true,
            accumulatedTime: activeTimer.accumulatedTime + elapsed
          }
        });
      },
      
      resumeTimer: () => {
        const { activeTimer } = get();
        if (!activeTimer || !activeTimer.isPaused) return;
        set({
           activeTimer: {
             ...activeTimer,
             isPaused: false,
             startTime: Date.now()
           }
        });
      },
      
      stopTimer: () => {
        const { activeTimer } = get();
        if (!activeTimer) return null;
        
        let totalElapsed = activeTimer.accumulatedTime;
        if (!activeTimer.isPaused) {
           totalElapsed += (Date.now() - activeTimer.startTime);
        }
        
        const hours = totalElapsed / (1000 * 60 * 60);
        
        set({ activeTimer: null });
        return { taskId: activeTimer.taskId, hours, totalMs: totalElapsed };
      },
      
      clearTimer: () => set({ activeTimer: null })
    }),
    {
      name: 'timesheet-storage',
    }
  )
);
