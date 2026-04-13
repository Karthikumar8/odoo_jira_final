import React, { useEffect } from 'react';
import { dashboardApi } from '../../api/dashboard';
import { useAuthStore } from '../../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { FolderKanban, CheckSquare, AlertTriangle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between transition-transform hover:-translate-y-1">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-semibold text-gray-500 tracking-wide uppercase">{title}</p>
        <h3 className="text-4xl font-black mt-3 text-gray-900">{value}</h3>
      </div>
      <div className={`p-4 rounded-xl shadow-inner ${colorClass}`}>
        <Icon size={28} />
      </div>
    </div>
  </div>
);

const DashboardPage = () => {
  const { user } = useAuthStore();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardOverview'],
    queryFn: () => dashboardApi.getOverview(),
  });

  if (isLoading || !stats) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-500 animate-pulse text-lg font-semibold tracking-wider">Compiling Dashboard Aggregates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-10 gap-4 border-b border-gray-200 pb-4">
        <div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Overview</h1>
           <p className="text-sm text-gray-500 mt-1">
             Welcome back, <span className="font-bold text-gray-800">{user?.name}</span>. Here's your personalized snapshot.
           </p>
        </div>
        <div className="flex gap-3">
           <Link to="/projects" className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg shadow hover:bg-blue-700 transition">View Projects</Link>
           {(user?.role === 'manager' || user?.role === 'superuser') ? (
              <Link to="/reporting" className="px-4 py-2 bg-white text-gray-700 border border-gray-300 text-sm font-bold rounded-lg shadow-sm hover:bg-gray-50 transition">Reporting</Link>
           ) : (
              <Link to="/my-tasks" className="px-4 py-2 bg-white text-gray-700 border border-gray-300 text-sm font-bold rounded-lg shadow-sm hover:bg-gray-50 transition">My Tasks</Link>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          title={user?.role === 'manager' || user?.role === 'superuser' ? "Active Projects" : "My Projects"}
          value={stats.total_projects} 
          icon={FolderKanban} 
          colorClass="bg-blue-100 text-blue-700" 
        />
        <StatCard 
          title="Active Tasks" 
          value={stats.active_tasks} 
          icon={CheckSquare} 
          colorClass="bg-emerald-100 text-emerald-700" 
        />
        <StatCard 
          title="Overdue Tasks" 
          value={stats.overdue_tasks} 
          icon={AlertTriangle} 
          colorClass="bg-rose-100 text-rose-700" 
        />
        <StatCard 
          title="Weekly Hours" 
          value={stats.weekly_hours?.toFixed(1) || '0.0'} 
          icon={Clock} 
          colorClass="bg-indigo-100 text-indigo-700" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Recent Projects</h2>
            <Link to="/projects" className="text-sm text-blue-600 hover:text-blue-800 font-bold transition">View all →</Link>
          </div>
          <div className="space-y-2">
            {stats.recent_projects?.length === 0 && <p className="text-gray-500 text-sm p-4 border border-dashed rounded text-center">No recent projects found.</p>}
            {stats.recent_projects?.map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 border border-transparent hover:border-gray-100 hover:bg-gray-50 rounded-lg transition">
                <Link to={`/projects/${p.id}`} className="font-bold text-gray-800 hover:text-blue-600 truncate">{p.name}</Link>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">My Priority Tasks</h2>
          </div>
          <div className="space-y-3">
            {stats.my_tasks?.length === 0 && <p className="text-gray-500 text-sm p-4 border border-dashed rounded text-center">You have no active tasks currently.</p>}
            {stats.my_tasks?.map(t => (
              <div key={t.id} className="flex flex-col p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-sm transition">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900 text-sm leading-tight">{t.name}</span>
                  {t.priority === '1' && <span className="text-orange-600 bg-orange-100 px-2 py-0.5 rounded text-[10px] font-black tracking-widest shrink-0 ml-2 shadow-sm">HIGH</span>}
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs text-gray-500 mt-1 gap-2">
                   <span className="bg-white px-2 py-1 rounded shadow-sm border border-gray-200 truncate">Project: {t.project_id ? t.project_id[1] : 'Unassigned'}</span>
                   {t.date_deadline && <span className={`flex gap-1.5 items-center px-2 py-1 rounded shadow-sm bg-white border border-gray-200 shrink-0 ${new Date(t.date_deadline) < new Date() ? 'text-red-600 font-bold border-red-200' : ''}`}><Clock size={12} /> {t.date_deadline}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
