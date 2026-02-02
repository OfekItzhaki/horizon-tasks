import { useState } from 'react';
import { stepsService } from '../services/steps.service';
import { Step } from '../types';
import { handleApiError } from '../utils/errorHandler';

export function useStepManagement(taskId: number, onStepChange: () => void) {
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [newStepDescription, setNewStepDescription] = useState('');
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [editingStepDescription, setEditingStepDescription] = useState('');

  const handleAddStep = async () => {
    if (!newStepDescription.trim()) {
      return { success: false, error: 'Please enter a step description before adding.' };
    }

    try {
      await stepsService.create(taskId, { description: newStepDescription.trim() });
      setNewStepDescription('');
      setShowAddStepModal(false);
      onStepChange();
      return { success: true };
    } catch (error: any) {
      handleApiError(error, 'Unable to add step. Please try again.');
      return { success: false };
    }
  };

  const handleToggleStep = async (
    step: Step,
    steps: Step[],
    setSteps: React.Dispatch<React.SetStateAction<Step[]>>,
  ) => {
    const currentCompleted = Boolean(step.completed);
    const newCompleted = !currentCompleted;
    
    // Optimistic update - update UI immediately
    setSteps(prevSteps => 
      prevSteps.map(s => 
        s.id === step.id ? { ...s, completed: newCompleted } : s
      )
    );

    try {
      await stepsService.update(step.id, { completed: newCompleted });
      // No need to reload - optimistic update already applied
      return { success: true };
    } catch (error: any) {
      // Revert on error
      setSteps(prevSteps => 
        prevSteps.map(s => 
          s.id === step.id ? { ...s, completed: currentCompleted } : s
        )
      );
      handleApiError(error, 'Unable to update step. Please try again.');
      return { success: false };
    }
  };

  const handleEditStep = (step: Step) => {
    setEditingStepId(step.id);
    setEditingStepDescription(step.description);
  };

  const handleSaveStepEdit = async () => {
    if (!editingStepId || !editingStepDescription.trim()) {
      setEditingStepId(null);
      return { success: false };
    }

    try {
      await stepsService.update(editingStepId, { description: editingStepDescription.trim() });
      setEditingStepId(null);
      setEditingStepDescription('');
      onStepChange();
      return { success: true };
    } catch (error: any) {
      handleApiError(error, 'Unable to update step. Please try again.');
      return { success: false };
    }
  };

  const handleCancelStepEdit = () => {
    setEditingStepId(null);
    setEditingStepDescription('');
  };

  const handleDeleteStep = async (step: Step) => {
    try {
      await stepsService.delete(step.id);
      onStepChange();
      return { success: true };
    } catch (error: any) {
      handleApiError(error, 'Unable to delete step. Please try again.');
      return { success: false };
    }
  };

  return {
    showAddStepModal,
    newStepDescription,
    editingStepId,
    editingStepDescription,
    setShowAddStepModal,
    setNewStepDescription,
    setEditingStepDescription,
    handleAddStep,
    handleToggleStep,
    handleEditStep,
    handleSaveStepEdit,
    handleCancelStepEdit,
    handleDeleteStep,
  };
}
