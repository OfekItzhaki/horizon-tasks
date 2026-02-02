import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQueuedMutation } from './useQueuedMutation';
import { stepsService } from '../services/steps.service';
import { Task, Step, CreateStepDto, UpdateStepDto, ApiError } from '@tasks-management/frontend-services';
import { handleApiError } from '../utils/errorHandler';
import { invalidateTaskQueries } from '../utils/taskCache';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export function useStepManagement(task: Task | undefined | null) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepDescription, setNewStepDescription] = useState('');
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [stepDescriptionDraft, setStepDescriptionDraft] = useState('');

  const invalidateTask = (taskItem: Task) => {
    invalidateTaskQueries(queryClient, taskItem);
  };

  const updateStepMutation = useQueuedMutation<
    Step,
    ApiError,
    { task: Task; stepId: number; data: UpdateStepDto },
    { previousTask?: Task; previousTasks?: Task[] }
  >({
    mutationFn: ({ stepId, data }) => stepsService.updateStep(stepId, data),
    onMutate: async (vars) => {
      const previousTask = queryClient.getQueryData<Task>(['task', vars.task.id]);
      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        vars.task.todoListId,
      ]);

      const patchTaskSteps = (t: Task): Task => ({
        ...t,
        steps: (t.steps ?? []).map((s) =>
          s.id === vars.stepId ? { ...s, ...vars.data } : s,
        ),
        updatedAt: new Date().toISOString(),
      });

      if (previousTask) {
        queryClient.setQueryData<Task>(['task', vars.task.id], patchTaskSteps(previousTask));
      }

      queryClient.setQueryData<Task[]>(['tasks', vars.task.todoListId], (old = []) =>
        old.map((t) => (t.id === vars.task.id ? patchTaskSteps(t) : t)),
      );

      return { previousTask, previousTasks };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.previousTask) {
        queryClient.setQueryData(['task', vars.task.id], ctx.previousTask);
      }
      if (ctx?.previousTasks) {
        queryClient.setQueryData(['tasks', vars.task.todoListId], ctx.previousTasks);
      }
      handleApiError(err, t('taskDetails.updateStepFailed', { defaultValue: 'Failed to update step. Please try again.' }));
    },
    onSettled: (_data, _err, vars) => {
      invalidateTask(vars.task);
    },
  });

  const createStepMutation = useMutation<
    Step,
    ApiError,
    { task: Task; data: CreateStepDto },
    { previousTask?: Task }
  >({
    mutationFn: ({ task, data }) => stepsService.createStep(task.id, data),
    onMutate: async (vars) => {
      const previousTask = queryClient.getQueryData<Task>(['task', vars.task.id]);

      const now = new Date().toISOString();
      const tempId = -Date.now();
      const optimistic: Step = {
        id: tempId,
        description: vars.data.description,
        completed: Boolean(vars.data.completed ?? false),
        taskId: vars.task.id,
        order: Date.now(),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      if (previousTask) {
        queryClient.setQueryData<Task>(['task', vars.task.id], {
          ...previousTask,
          steps: [...(previousTask.steps ?? []), optimistic],
          updatedAt: now,
        });
      }

      return { previousTask };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.previousTask) {
        queryClient.setQueryData(['task', vars.task.id], ctx.previousTask);
      }
      handleApiError(err, t('taskDetails.addStepFailed', { defaultValue: 'Failed to add step. Please try again.' }));
    },
    onSuccess: (_created, vars) => {
      setNewStepDescription('');
      setShowAddStep(false);
      toast.success(t('taskDetails.stepAdded'));
      queryClient.invalidateQueries({ queryKey: ['tasks', vars.task.todoListId] });
    },
    onSettled: (_data, _err, vars) => {
      invalidateTask(vars.task);
    },
  });

  const deleteStepMutation = useQueuedMutation<
    Step,
    ApiError,
    { task: Task; id: number },
    { previousTask?: Task }
  >({
    mutationFn: ({ id }) => stepsService.deleteStep(id),
    onMutate: async (vars) => {
      const previousTask = queryClient.getQueryData<Task>(['task', vars.task.id]);

      if (previousTask) {
        queryClient.setQueryData<Task>(['task', vars.task.id], {
          ...previousTask,
          steps: (previousTask.steps ?? []).filter((s) => s.id !== vars.id),
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousTask };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.previousTask) {
        queryClient.setQueryData(['task', vars.task.id], ctx.previousTask);
      }
      handleApiError(err, t('taskDetails.deleteStepFailed', { defaultValue: 'Failed to delete step. Please try again.' }));
    },
    onSuccess: () => {
      toast.success(t('taskDetails.stepDeleted'));
    },
    onSettled: (_data, _err, vars) => {
      invalidateTask(vars.task);
    },
  });

  const handleToggleStep = (step: Step) => {
    if (!task) return;
    updateStepMutation.mutate({
      task,
      stepId: step.id,
      data: { completed: !step.completed },
    });
  };

  const handleEditStep = (step: Step) => {
    setEditingStepId(step.id);
    setStepDescriptionDraft(step.description);
  };

  const handleSaveStep = () => {
    if (!task || editingStepId === null || !stepDescriptionDraft.trim()) return;
    updateStepMutation.mutate(
      {
        task,
        stepId: editingStepId,
        data: { description: stepDescriptionDraft.trim() },
      },
      {
        onSuccess: () => {
          toast.success(t('taskDetails.stepUpdated'));
          setEditingStepId(null);
          setStepDescriptionDraft('');
        },
      },
    );
  };

  const handleDeleteStep = (step: Step) => {
    if (!task) return;
    const ok = window.confirm(
      t('taskDetails.deleteStepConfirm', { description: step.description }),
    );
    if (!ok) return;
    deleteStepMutation.mutate({ task, id: step.id });
  };

  const handleCreateStep = () => {
    if (!task || !newStepDescription.trim()) return;
    createStepMutation.mutate({
      task,
      data: { description: newStepDescription.trim() },
    });
  };

  return {
    showAddStep,
    setShowAddStep,
    newStepDescription,
    setNewStepDescription,
    editingStepId,
    setEditingStepId,
    stepDescriptionDraft,
    setStepDescriptionDraft,
    handleToggleStep,
    handleEditStep,
    handleSaveStep,
    handleDeleteStep,
    handleCreateStep,
    createStepMutation,
    updateStepMutation,
    deleteStepMutation,
  };
}
