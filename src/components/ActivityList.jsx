import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const ActivityList = ({ activities, onMarkDone, onCancel }) => {
  if (!activities || activities.length === 0) {
    return <div className="text-gray-500 text-sm py-8 text-center border-2 border-dashed border-gray-200 rounded-lg">No scheduled activities presently.</div>;
  }

  return (
    <div className="space-y-3 mt-4">
      {activities.map(act => (
        <div key={act.id} className="flex flex-col gap-2 p-3 bg-white border border-gray-200 rounded-md shadow-sm hover:shadow transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase tracking-wide">
                {act.activity_type_id ? act.activity_type_id[1] : 'Activity'}
              </span>
              <span className="text-sm font-semibold text-gray-900">{act.summary || 'No explicit summary'}</span>
            </div>
            <div className="flex gap-1 shrink-0 ml-2">
              <button 
                onClick={() => onMarkDone(act.id)} 
                className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                title="Mark Done"
              >
                <CheckCircle size={18} />
              </button>
              <button 
                onClick={() => {
                  if (window.confirm('Cancel this activity entirely?')) onCancel(act.id);
                }} 
                className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                title="Cancel"
              >
                <XCircle size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-500 mt-1">
            {act.date_deadline && (
               <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                 <Clock size={12} className="text-blue-500"/> Due: {act.date_deadline}
               </span>
            )}
            {act.user_id && (
               <span className="bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">Assigned: {act.user_id[1]}</span>
            )}
          </div>
          
          {act.note && (
            <div className="text-sm text-gray-700 bg-amber-50 border border-amber-100 p-2.5 rounded-md mt-2 prose prose-sm max-w-none prose-p:my-0" dangerouslySetInnerHTML={{__html: act.note}} />
          )}
        </div>
      ))}
    </div>
  );
};

export default ActivityList;
