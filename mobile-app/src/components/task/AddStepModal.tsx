import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface AddStepModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (description: string) => Promise<boolean>;
    styles: any;
}

export default function AddStepModal({
    visible,
    onClose,
    onAdd,
    styles,
}: AddStepModalProps) {
    const [description, setDescription] = useState('');
    const { colors } = useTheme();

    const handleAdd = async () => {
        const success = await onAdd(description);
        if (success) {
            setDescription('');
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Add Step</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Step description"
                        placeholderTextColor={colors.text + '80'}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        autoFocus
                    />
                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => {
                                setDescription('');
                                onClose();
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.submitButton]}
                            onPress={handleAdd}
                        >
                            <Text style={styles.submitButtonText}>Add</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
