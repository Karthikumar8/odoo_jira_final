import React, { useState } from 'react';

/**
 * Format a date string like Odoo does:
 *  - Today: "Today at 5:37 PM"
 *  - Yesterday: "Yesterday at 5:37 PM"
 *  - Other: "2 Apr, 5:52 PM"
 */
function formatOdooDate(dateStr) {
  if (!dateStr) return '';
  let d;
  // Odoo returns "2026-04-07 10:34:45" (UTC), convert to local
  if (dateStr.includes('T')) {
    d = new Date(dateStr);
  } else {
    // "YYYY-MM-DD HH:MM:SS" → treat as UTC
    d = new Date(dateStr.replace(' ', 'T') + 'Z');
  }
  if (isNaN(d.getTime())) return dateStr;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (msgDay.getTime() === today.getTime()) {
    return `Today at ${timeStr}`;
  } else if (msgDay.getTime() === yesterday.getTime()) {
    return `Yesterday at ${timeStr}`;
  } else {
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    return `${day} ${month}, ${timeStr}`;
  }
}

const ChatterBox = ({ messages, loading, onPostComment }) => {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onPostComment(newComment);
    setNewComment('');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm">
      <div className="px-5 pt-4 pb-3 border-b border-gray-100">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Chatter & Audit Log</h3>
      </div>

      {/* Post comment */}
      <form onSubmit={handleSubmit} className="p-4 border-b border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#ff771c]/30 focus:border-[#ff771c] transition-colors"
            placeholder="Log an internal note..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: '#ff771c' }}
            onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#e85f00'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ff771c'; }}
          >
            Log
          </button>
        </div>
      </form>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-h-[480px] divide-y divide-gray-50">
        {loading && (
          <div className="py-8 text-center text-sm text-gray-400">Loading chatter...</div>
        )}
        {!loading && messages.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">
            No messages yet. Post the first note above.
          </div>
        )}
        {messages.map(msg => {
          const authorName = msg.author_id
            ? (Array.isArray(msg.author_id) ? msg.author_id[1] : msg.author_id)
            : 'System';
          const timeLabel = formatOdooDate(msg.date);
          const hasTracking = msg.tracking_values && msg.tracking_values.length > 0;
          const hasBody = msg.body && msg.body.trim() && msg.body.trim() !== '<p></p>';

          return (
            <div key={msg.id} className="px-5 py-4 hover:bg-gray-50/60 transition-colors">
              {/* Author + Time header */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-[#161311]">{authorName}</span>
                <span className="text-xs text-gray-400">{timeLabel}</span>
              </div>

              {/* Tracking changes — "Field: Old → New" format */}
              {hasTracking && (
                <div className="space-y-1 mb-2">
                  {msg.tracking_values.map(tv => (
                    <div key={tv.id} className="text-xs text-gray-600 flex flex-wrap items-center gap-1">
                      {tv.field_desc && (
                        <span className="font-semibold text-gray-700">{tv.field_desc}</span>
                      )}
                      {(tv.old_value || tv.new_value) && (
                        <>
                          <span className="text-gray-300">·</span>
                          {tv.old_value ? (
                            <span className="text-gray-400 line-through">{tv.old_value}</span>
                          ) : (
                            <span className="text-gray-300 italic">None</span>
                          )}
                          <span className="text-gray-400 font-bold">→</span>
                          {tv.new_value ? (
                            <span className="font-semibold text-gray-800">{tv.new_value}</span>
                          ) : (
                            <span className="text-gray-300 italic">None</span>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Message body */}
              {hasBody && (
                <div
                  className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: msg.body }}
                />
              )}

              {/* If only tracking with no field desc, show generic label */}
              {hasTracking && !hasBody && msg.tracking_values.every(tv => !tv.field_desc) && (
                <p className="text-xs text-gray-500 italic">Field updated</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatterBox;
