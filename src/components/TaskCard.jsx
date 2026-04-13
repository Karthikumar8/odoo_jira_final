import React from 'react';
import { Clock, Trash2, Star } from 'lucide-react';

// Tag colors mapped by tagId index for variety
const TAG_COLORS = [
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
];

// TaskCard accepts tagMap: { [id]: { name, color } } from parent for fast lookup
const TaskCard = ({ task, onArchive, canEdit, tagMap = {} }) => {
  const isHighPriority = task.priority === '1';
  const isOverdue = task.date_deadline && new Date(task.date_deadline) < new Date() && !task.date_done;

  return (
    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-[#ff771c]/30 transition-all group">
      <div className="flex justify-between items-start mb-2 gap-2">
        <h4 className="text-sm font-semibold text-[#161311] leading-tight">
          {isHighPriority && (
            <Star size={12} className="inline mr-1 text-[#ff771c] fill-[#ff771c]" />
          )}
          {task.name}
        </h4>
        {canEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onArchive && onArchive(task.id);
            }}
            className="text-gray-300 hover:text-red-500 opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0"
            title="Archive Task"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Tags - show real names */}
      {task.tag_ids && task.tag_ids.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tag_ids.map((tagId, idx) => {
            const tag = tagMap[tagId];
            const colorClass = TAG_COLORS[idx % TAG_COLORS.length];
            return (
              <span
                key={tagId}
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${colorClass}`}
              >
                {tag ? tag.name : `Tag ${tagId}`}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {task.effective_hours > 0 && (
            <span className="flex items-center gap-0.5 text-[#546877] text-[10px] font-medium">
              <Clock size={10} />
              {task.effective_hours.toFixed(1)}h
            </span>
          )}
          {task.user_ids && task.user_ids.length > 0 && (
            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-medium">
              {task.user_ids.length === 1 ? '1 user' : `${task.user_ids.length} users`}
            </span>
          )}
        </div>

        {task.date_deadline && (
          <div className={`flex items-center gap-0.5 text-[10px] font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
            <Clock size={10} />
            {new Date(task.date_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </div>
        )}
      </div>

      {task.progress > 0 && (
        <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
          <div
            className="h-1 rounded-full"
            style={{ width: `${Math.min(task.progress, 100)}%`, backgroundColor: '#ff771c' }}
          />
        </div>
      )}
    </div>
  );
};

export default TaskCard;
