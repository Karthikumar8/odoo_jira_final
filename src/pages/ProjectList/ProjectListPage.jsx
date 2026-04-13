import React, { useEffect, useState } from 'react';
import { projectApi } from '../../api/projects';
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Search, Calendar, Users, Clock, FolderOpen, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ProjectListPage = () => {
  const { projects, setProjects, loading, setLoading, error, setError } = useProjectStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  
  const canCreate = user?.role === 'manager' || user?.role === 'superuser';

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      try {
        const data = await projectApi.getProjects();
        setProjects(data);
      } catch (err) {
        setError('Failed to fetch projects');
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, [setLoading, setProjects, setError]);

  const filteredProjects = projects.filter(p => p.name?.toLowerCase().includes(filter.toLowerCase()));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      await projectApi.createProject({ name: newProjectName.trim() });
      const data = await projectApi.getProjects();
      setProjects(data);
      toast.success(`Project "${newProjectName.trim()}" created!`);
      setNewProjectName('');
      setShowCreateForm(false);
    } catch (err) {
      toast.error("Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 relative z-10">
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search projects..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        
        {canCreate && (
          <button 
            id="new-project-btn"
            onClick={() => setShowCreateForm(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400"
            style={{ backgroundColor: '#ff771c' }}
          >
            <PlusCircle className="-ml-1 mr-2 h-5 w-5" />
            New Project
          </button>
        )}
      </div>

      {/* Inline create form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input
              type="text"
              autoFocus
              required
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g. Website Redesign Q3"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2 mt-4 sm:mt-5">
            <button
              type="submit"
              disabled={creating || !newProjectName.trim()}
              className="px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 shadow-sm"
              style={{ backgroundColor: '#ff771c' }}
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreateForm(false); setNewProjectName(''); }}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 shadow-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <div className="text-red-500">{error}</div>}

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading projects...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div 
              key={project.id} 
              onClick={() => navigate(`/projects/${project.id}`)}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer overflow-hidden border border-gray-200 flex flex-col"
            >
              <div className="p-5 flex-1">
                <h3 className="text-lg font-medium text-gray-900 truncate" title={project.name}>
                  {project.name}
                </h3>
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="flex-shrink-0 mr-1.5 h-4 w-4" />
                    <span className="truncate">{project.partner_id ? project.partner_id[1] : 'Internal'}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                    <span>{project.date_start ? project.date_start : 'No Start Date'}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="flex-shrink-0 mr-1.5 h-4 w-4" />
                    <span>{project.allocated_hours || 0} Allocated Hrs</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="capitalize">{project.privacy_visibility ? project.privacy_visibility.replace('_', ' ') : 'Private'}</span>
                  <span className="font-medium text-blue-600 hover:text-blue-500">View Details →</span>
                </div>
              </div>
            </div>
          ))}
          
          {filteredProjects.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center">
              <FolderOpen className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No projects found.</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by clicking "New Project" above.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectListPage;
