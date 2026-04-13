import React, { useEffect, useState } from 'react';
import { milestoneApi } from '../../api/milestones';
import MilestoneBar from '../../components/MilestoneBar';
import { useAuthStore } from '../../store/authStore';
import { useMilestoneStore } from '../../store/milestoneStore';
import { Plus } from 'lucide-react';

const MilestonesTab = ({ projectId }) => {
  const { milestones, setMilestones, loading, setLoading } = useMilestoneStore();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'manager' || user?.role === 'superuser';
  const [newMilestoneName, setNewMilestoneName] = useState('');

  const loadMilestones = async () => {
    setLoading(true);
    try {
      const data = await milestoneApi.getMilestones(projectId);
      setMilestones(data);
    } catch (err) {
      console.error("Failed to fetch milestones", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    setMilestones([]); // clear stale data when projectId changes
    loadMilestones();
  }, [projectId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newMilestoneName.trim() || !canEdit) return;
    try {
      await milestoneApi.createMilestone({
        name: newMilestoneName,
        project_id: parseInt(projectId)
      });
      setNewMilestoneName('');
      await loadMilestones();
    } catch (err) {
      console.error("Failed to create milestone", err);
    }
  };

  const handleToggleReach = async (milestone) => {
    if (!canEdit) return;
    try {
      if (milestone.is_reached) {
         await milestoneApi.unreachMilestone(milestone.id);
      } else {
         await milestoneApi.reachMilestone(milestone.id);
      }
      await loadMilestones();
    } catch (err) {
      console.error("Toggle milestone failed", err);
    }
  };

  const handleDelete = async (id) => {
    if (!canEdit) return;
    try {
      await milestoneApi.deleteMilestone(id);
      await loadMilestones();
    } catch (err) {
      console.error("Delete milestone failed", err);
    }
  };

  if (loading && milestones.length === 0) {
    return <div className="p-8 text-center text-gray-500">Loading milestones...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-6">
      {canEdit && (
        <form onSubmit={handleCreate} className="mb-8 flex gap-3">
          <input
            type="text"
            required
            value={newMilestoneName}
            onChange={(e) => setNewMilestoneName(e.target.value)}
            placeholder="New milestone name..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <button 
            type="submit" 
            disabled={!newMilestoneName.trim()} 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="mr-2 h-4 w-4" /> Add
          </button>
        </form>
      )}

      {milestones.length > 0 ? (
        <MilestoneBar 
          milestones={milestones} 
          onToggleReach={handleToggleReach} 
          onDelete={handleDelete}
        />
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg text-gray-500">
          No milestones defined for this project.
        </div>
      )}
    </div>
  );
};

export default MilestonesTab;
