import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportingApi } from '../../api/reporting';
import { BarChart2, Clock, Activity, CheckSquare, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

const TABS = ['Overview', 'Leaderboard', 'Project Health', 'My Tasks'];

const StatusBadge = ({ status }) => {
  if (status === 'over_budget') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
      <AlertTriangle size={10} /> Over Budget
    </span>
  );
  if (status === 'at_risk') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <TrendingUp size={10} /> At Risk
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
      <CheckCircle size={10} /> On Track
    </span>
  );
};

const ReportingPage = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [period, setPeriod] = useState(7);

  const { data: taskAnalysis, isLoading: analysisLoading } = useQuery({
    queryKey: ['taskAnalysis'],
    queryFn: reportingApi.getTaskAnalysis
  });
  const { data: leaderboard, isLoading: leaderLoading } = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => reportingApi.getLeaderboard(period)
  });
  const { data: projectHealthData, isLoading: healthLoading } = useQuery({
    queryKey: ['projectHealth'],
    queryFn: reportingApi.getProjectHealth
  });
  const { data: myTasksObj, isLoading: tasksLoading } = useQuery({
    queryKey: ['myTasks'],
    queryFn: reportingApi.getMyTasks
  });

  const myTasks = myTasksObj?.my_tasks;
  const projectHealth = projectHealthData?.projects;
  const maxStageCount = Math.max(...(taskAnalysis?.stages?.map(s => s.count) || [1]), 1);

  if (analysisLoading || leaderLoading || healthLoading || tasksLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full border-4 border-[#f5ede0] border-t-[#ff771c] animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#161311]">Reporting</h1>
        <p className="text-sm text-gray-500 mt-0.5">Analytics and project health across your workspace.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-md border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-[#ff771c] text-[#ff771c]'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

        {/* ── OVERVIEW ── */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Tasks by Stage */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#fff0e6' }}>
                  <BarChart2 size={18} style={{ color: '#ff771c' }} />
                </div>
                <h2 className="text-base font-bold text-[#161311]">Tasks by Stage</h2>
              </div>
              <div className="space-y-3">
                {taskAnalysis?.stages?.map(st => (
                  <div key={st.id}>
                    <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                      <span>{st.name}</span>
                      <span className="font-bold text-[#161311]">{st.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-2.5 rounded-full"
                        style={{ width: `${Math.min((st.count / maxStageCount) * 100, 100)}%`, backgroundColor: '#ff771c' }}
                      />
                    </div>
                  </div>
                ))}
                {!taskAnalysis?.stages?.length && (
                  <p className="text-sm text-gray-400 text-center py-4">No stage data available.</p>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm text-gray-500">Overdue Tasks</span>
                <span className="text-sm font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                  {taskAnalysis?.overdue_count || 0}
                </span>
              </div>
            </div>

            {/* My Allocations */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 rounded-lg bg-green-50">
                  <CheckSquare size={18} className="text-green-600" />
                </div>
                <h2 className="text-base font-bold text-[#161311]">My Task Allocations</h2>
              </div>
              <div className="space-y-2">
                {!myTasks?.length && (
                  <p className="text-sm text-gray-400 text-center py-4">No active tasks assigned.</p>
                )}
                {myTasks?.map(mt => (
                  <div key={mt.project_id} className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-lg border border-gray-100">
                    <span className="text-sm font-medium text-gray-800">{mt.project_name}</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#fff0e6', color: '#ff771c' }}>
                      {mt.count} tasks
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LEADERBOARD ── */}
        {activeTab === 'Leaderboard' && (
          <div>
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#fff0e6' }}>
                  <Clock size={18} style={{ color: '#ff771c' }} />
                </div>
                <h2 className="text-base font-bold text-[#161311]">Time Logging Leaderboard</h2>
              </div>
              <select
                value={period}
                onChange={e => setPeriod(parseInt(e.target.value))}
                className="text-sm border border-gray-200 rounded-lg py-1.5 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff771c]/30"
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
              </select>
            </div>
            <div className="overflow-hidden border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-white" style={{ backgroundColor: '#161311' }}>
                  <tr>
                    <th className="px-5 py-3.5 text-left font-semibold w-12">#</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Employee</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Hours Logged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!leaderboard?.leaderboard?.length && (
                    <tr><td colSpan="3" className="text-center py-8 text-gray-400">No time logs in this period.</td></tr>
                  )}
                  {leaderboard?.leaderboard?.map((lb, idx) => (
                    <tr key={lb.employee_id} className="hover:bg-[#f5ede0]/40 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-gray-400">#{idx + 1}</td>
                      <td className="px-5 py-3.5 font-semibold text-gray-800">{lb.name}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#fff0e6', color: '#ff771c' }}>
                          {Number(lb.hours).toFixed(2)}h
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PROJECT HEALTH ── */}
        {activeTab === 'Project Health' && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#e8edf0' }}>
                <Activity size={18} style={{ color: '#546877' }} />
              </div>
              <h2 className="text-base font-bold text-[#161311]">Project Health & Budget</h2>
            </div>
            {!projectHealth?.length && (
              <p className="text-center text-gray-400 py-10">No active projects found.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectHealth?.map(ph => {
                const barColor = ph.health_status === 'over_budget'
                  ? '#ef4444'
                  : ph.health_status === 'at_risk'
                    ? '#f59e0b'
                    : '#22c55e';
                return (
                  <div key={ph.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h3 className="font-bold text-sm text-[#161311] leading-tight flex-1 truncate" title={ph.name}>{ph.name}</h3>
                      <StatusBadge status={ph.health_status} />
                    </div>

                    {ph.manager && (
                      <p className="text-xs text-gray-400 mb-3">
                        PM: <span className="text-gray-600 font-medium">{ph.manager}</span>
                      </p>
                    )}

                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{Number(ph.effective).toFixed(1)}h used</span>
                        <span>{Number(ph.allocated).toFixed(1)}h budget</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(ph.usage_pct || 0, 100)}%`, backgroundColor: barColor }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{ph.usage_pct || 0}% of budget consumed</p>
                    </div>

                    <div className="flex justify-between text-xs border-t border-gray-100 pt-3 text-gray-500">
                      <span>Tasks: <span className="font-bold text-gray-800">{ph.task_count}</span></span>
                      <span>Progress: <span className="font-bold text-gray-800">{Math.round(ph.progress || 0)}%</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MY TASKS ── */}
        {activeTab === 'My Tasks' && (
          <div className="text-center py-12">
            <CheckSquare size={48} className="mx-auto mb-4 text-gray-200" />
            <h2 className="text-xl font-bold text-[#161311] mb-2">
              You have{' '}
              <span style={{ color: '#ff771c' }}>
                {myTasks?.reduce((a, m) => a + (m.count || 0), 0) || 0}
              </span>{' '}
              open tasks
            </h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              Across <span className="font-semibold text-gray-700">{myTasks?.length || 0}</span> projects.
            </p>
            <div className="space-y-2 max-w-sm mx-auto text-left">
              {myTasks?.map(mt => (
                <div key={mt.project_id} className="flex justify-between items-center px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-sm font-medium text-gray-700">{mt.project_name}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fff0e6', color: '#ff771c' }}>
                    {mt.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportingPage;
