import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock } from 'lucide-react';
import { useTimesheetStore } from '../store/timesheetStore';
import { timesheetApi } from '../api/timesheets';
import toast from 'react-hot-toast';

const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const TimerWidget = ({ taskId, taskName, projectId, onTimesheetLogged }) => {
  const { activeTimer, startTimer, pauseTimer, resumeTimer, stopTimer } = useTimesheetStore();
  const [liveMs, setLiveMs] = useState(0);
  
  const isActiveForThisTask = activeTimer?.taskId === taskId;
  const isAnotherTimerActive = activeTimer && !isActiveForThisTask;
  
  useEffect(() => {
    let interval;
    if (isActiveForThisTask && !activeTimer.isPaused) {
      interval = setInterval(() => {
        setLiveMs(activeTimer.accumulatedTime + (Date.now() - activeTimer.startTime));
      }, 1000);
    } else if (isActiveForThisTask && activeTimer.isPaused) {
      setLiveMs(activeTimer.accumulatedTime);
    } else {
      setLiveMs(0);
    }
    return () => clearInterval(interval);
  }, [isActiveForThisTask, activeTimer]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'Space') {
         if (!isActiveForThisTask) return;
         if (activeTimer.isPaused) resumeTimer();
         else pauseTimer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActiveForThisTask, activeTimer, resumeTimer, pauseTimer]);

  const handleStart = () => {
    if (isAnotherTimerActive) {
       toast.error("Another timer is already running. Please stop it first.");
       return;
    }
    startTimer(taskId, taskName);
  };
  
  const handleStop = async () => {
    pauseTimer();
    const result = stopTimer();
    if (!result) return;
    
    if (result.totalMs < 60000) {
       toast.error("Duration is less than 1 minute. Timesheet not saved.");
       return;
    }
    
    const desc = window.prompt("Enter timesheet description:", "Worked on " + taskName);
    if (desc === null) return; 
    
    try {
      await timesheetApi.createTimesheet({
         task_id: taskId,
         project_id: projectId,
         name: desc,
         unit_amount: parseFloat(result.hours.toFixed(2))
      });
      toast.success("Timesheet logged successfully!");
      if (onTimesheetLogged) onTimesheetLogged();
    } catch (err) {
      toast.error("Failed to save timesheet.");
    }
  };

  if (isAnotherTimerActive) return (
     <div className="text-xs text-orange-500 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded border border-orange-200">
       <Clock size={12} /> Running elsewhere
     </div>
  );

  return (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md p-1.5 px-3">
      <span className="font-mono text-sm font-semibold w-[70px] text-slate-700">
        {formatTime(liveMs)}
      </span>
      
      {!isActiveForThisTask && (
        <button onClick={handleStart} className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200" title="Start Timer">
          <Play size={16} />
        </button>
      )}
      
      {isActiveForThisTask && (
        <>
          {activeTimer.isPaused ? (
            <button onClick={resumeTimer} className="p-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200" title="Resume (Ctrl+Shift+Space)">
              <Play size={16} />
            </button>
          ) : (
            <button onClick={pauseTimer} className="p-1 rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200" title="Pause (Ctrl+Shift+Space)">
              <Pause size={16} />
            </button>
          )}
          <button onClick={handleStop} className="p-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200" title="Stop & Log">
            <Square size={16} />
          </button>
        </>
      )}
    </div>
  );
};

export default TimerWidget;
