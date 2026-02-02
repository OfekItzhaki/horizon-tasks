import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Step } from '../../types';
import { showConfirmDialog } from '../common/ConfirmDialog';
import { createTaskDetailsStyles } from '../../screens/styles/TaskDetailsScreen.styles';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../utils/useThemedStyles';

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
  const styles = useThemedStyles(createTaskDetailsStyles);
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
          <Ionicons name="list-outline" size={64} color="#64748b" style={{ opacity: 0.3 }} />
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
                {stepCompleted && <Ionicons name="checkmark" size={16} color="#6366f1" />}
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
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.stepEditCancelButton}
                    onPress={onCancelStepEdit}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
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
                      <Ionicons name="create-outline" size={22} color="#6366f1" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepDeleteButton}
                      onPress={() => handleDeleteStep(step)}
                    >
                      <Ionicons name="trash-outline" size={22} color="#ef4444" />
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
