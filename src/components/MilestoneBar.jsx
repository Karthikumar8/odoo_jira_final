import React from 'react';
import { CheckCircle, Circle, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const MilestoneBar = ({ milestones, onToggleReach, onDelete }) => {
  const { user } = useAuthStore();
  const canEdit = user?.role === 'manager' || user?.role === 'superuser';
  
  const total = milestones.length;
  const reached = milestones.filter(m => m.is_reached).length;
  const progress = total === 0 ? 0 : Math.round((reached / total) * 100);

  if (total === 0) return null;

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Milestones Progress</h3>
        <span className="text-sm font-bold text-gray-900">{progress}%</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
        <div className="bg-green-600 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
      </div>
      
      <div className="space-y-3">
        {milestones.map((m) => (
          <div key={m.id} className={`flex items-center justify-between p-3 rounded-md border ${m.is_reached ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <button 
                disabled={!canEdit}
                onClick={() => onToggleReach(m)}
                className={`flex-shrink-0 transition-colors ${!canEdit ? 'cursor-not-allowed opacity-70' : ''}`}
                title={canEdit ? (m.is_reached ? 'Mark as Unreached' : 'Mark as Reached') : ''}
              >
                {m.is_reached ? (
                  <CheckCircle className="text-green-600 w-6 h-6" />
                ) : (
                  <Circle className="text-gray-400 hover:text-green-500 w-6 h-6" />
                )}
              </button>
              <div>
                <h4 className={`text-sm font-medium ${m.is_reached ? 'text-green-800 line-through opacity-75' : 'text-gray-900'}`}>{m.name}</h4>
                {m.deadline && (
                  <p className="text-xs text-gray-500 mt-0.5">Deadline: {m.deadline}</p>
                )}
              </div>
            </div>
            
            {canEdit && (
              <button 
                onClick={() => {
                  if (window.confirm('Archive this milestone?')) {
                     onDelete(m.id);
                  }
                }}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                title="Archive Milestone"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MilestoneBar;
