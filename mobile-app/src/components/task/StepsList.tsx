import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Step } from '../../types';
import { showConfirmDialog } from '../common/ConfirmDialog';
import { styles } from '../../screens/styles/TaskDetailsScreen.styles';

interface StepsListProps {
  steps: Step[];
  editingStepId: number | null;
  editingStepDescription: string;
  onEditingStepDescriptionChange: (text: string) => void;
  onToggleStep: (step: Step) => void;
  onEditStep: (step: Step) => void;
  onSaveStepEdit: () => void;
  onCancelStepEdit: () => void;
  onDeleteStep: (step: Step) => void;
  onAddStepPress: () => void;
}

export function StepsList({
  steps,
  editingStepId,
  editingStepDescription,
  onEditingStepDescriptionChange,
  onToggleStep,
  onEditStep,
  onSaveStepEdit,
  onCancelStepEdit,
  onDeleteStep,
  onAddStepPress,
}: StepsListProps) {
  const completedSteps = steps.filter((s) => Boolean(s.completed)).length;
  const totalSteps = steps.length;
  const stepsProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const handleDeleteStep = (step: Step) => {
    showConfirmDialog({
      title: 'Delete Step',
      message: `Are you sure you want to delete "${step.description}"?`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: () => onDeleteStep(step),
    });
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Steps</Text>
        {totalSteps > 0 && (
          <Text style={styles.progressText}>
            {completedSteps}/{totalSteps} completed
          </Text>
        )}
      </View>

      {totalSteps > 0 && (
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${stepsProgress}%` }]}
          />
        </View>
      )}

      {steps.length === 0 ? (
        <View style={styles.emptyStepsContainer}>
          <Text style={styles.emptyStepsIcon}>✓</Text>
          <Text style={styles.emptyStepsText}>No steps yet</Text>
          <Text style={styles.emptyStepsSubtext}>
            Break down your task into smaller steps
          </Text>
        </View>
      ) : (
        steps.map((step) => {
          const stepCompleted = Boolean(step.completed);
          const isEditingStep = editingStepId === step.id;
          
          return (
            <View
              key={step.id}
              style={[
                styles.stepItem,
                stepCompleted && styles.stepItemCompleted,
              ]}
            >
              <TouchableOpacity
                style={styles.stepCheckbox}
                onPress={() => onToggleStep(step)}
              >
                {stepCompleted && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
              
              {isEditingStep ? (
                <View style={styles.stepEditContainer}>
                  <TextInput
                    style={styles.stepEditInput}
                    value={editingStepDescription}
                    onChangeText={onEditingStepDescriptionChange}
                    autoFocus
                    onSubmitEditing={onSaveStepEdit}
                    blurOnSubmit={false}
                  />
                  <TouchableOpacity
                    style={styles.stepEditSaveButton}
                    onPress={onSaveStepEdit}
                  >
                    <Text style={styles.stepEditSaveText}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.stepEditCancelButton}
                    onPress={onCancelStepEdit}
                  >
                    <Text style={styles.stepEditCancelText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.stepContent}
                    onPress={() => onToggleStep(step)}
                  >
                    <Text
                      style={[
                        styles.stepText,
                        stepCompleted && styles.stepTextCompleted,
                      ]}
                    >
                      {step.description}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.stepActions}>
                    <TouchableOpacity
                      style={styles.stepEditButton}
                      onPress={() => onEditStep(step)}
                    >
                      <Text style={styles.stepEditButtonText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepDeleteButton}
                      onPress={() => handleDeleteStep(step)}
                    >
                      <Text style={styles.stepDeleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          );
        })
      )}

      <TouchableOpacity
        style={styles.addStepButton}
        onPress={onAddStepPress}
      >
        <Text style={styles.addStepButtonText}>+ Add Step</Text>
      </TouchableOpacity>
    </View>
  );
}
