import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    ScrollView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createTaskDetailsStyles } from '../screens/styles/TaskDetailsScreen.styles';
import { useThemedStyles } from '../utils/useThemedStyles';

interface TimePickerProps {
    value: string; // HH:MM format
    onChange: (time: string) => void;
}

export default function TimePicker({ value, onChange }: TimePickerProps) {
    const styles = useThemedStyles(createTaskDetailsStyles);
    const [showPicker, setShowPicker] = useState(false);
    const [hours, minutes] = value.split(':');
    const hourScrollRef = useRef<ScrollView>(null);
    const minuteScrollRef = useRef<ScrollView>(null);

    // Scroll to selected values when picker opens
    useEffect(() => {
        if (showPicker) {
            setTimeout(() => {
                const hourIndex = parseInt(hours, 10);
                const minuteIndex = parseInt(minutes, 10);
                hourScrollRef.current?.scrollTo({ y: hourIndex * 48, animated: true });
                minuteScrollRef.current?.scrollTo({ y: minuteIndex * 48, animated: true });
            }, 100);
        }
    }, [showPicker, hours, minutes]);

    const handleHourChange = (hour: string) => {
        onChange(`${hour}:${minutes || '00'}`);
    };

    const handleMinuteChange = (minute: string) => {
        onChange(`${hours || '09'}:${minute}`);
    };

    return (
        <View>
            <TouchableOpacity
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 16,
                    borderWidth: 2,
                    borderColor: '#e2e8f0',
                    borderRadius: 14,
                    backgroundColor: '#fff',
                    shadowColor: '#6366f1',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                }}
                onPress={() => setShowPicker(true)}
                activeOpacity={0.7}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: '#6366f1' + '15',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <Ionicons name="time-outline" size={20} color="#6366f1" />
                    </View>
                    <Text style={{ color: '#1e293b', fontSize: 18, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                        {value || '09:00'}
                    </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <Modal
                visible={showPicker}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: 'auto', paddingBottom: Platform.OS === 'ios' ? 44 : 28 }]}>
                        <View style={styles.dragHandle} />

                        {/* Simplified Header with just close button */}
                        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
                                <TouchableOpacity
                                    onPress={() => setShowPicker(false)}
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 16,
                                        backgroundColor: '#f1f5f9',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="close" size={20} color="#64748b" />
                                </TouchableOpacity>
                            </View>

                            {/* Hero Time Display */}
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: '600',
                                        color: '#94a3b8',
                                        marginBottom: 8,
                                        textTransform: 'uppercase',
                                        letterSpacing: 1.5,
                                    }}
                                >
                                    Selected Time
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 56,
                                        fontWeight: '800',
                                        color: '#6366f1',
                                        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                                        letterSpacing: 4,
                                    }}
                                >
                                    {hours}:{minutes}
                                </Text>
                            </View>
                        </View>

                        <View style={{ padding: 24, paddingTop: 8 }}>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            {/* Hours Picker */}
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: '800',
                                        color: '#64748b',
                                        marginBottom: 12,
                                        textAlign: 'center',
                                        textTransform: 'uppercase',
                                        letterSpacing: 1,
                                    }}
                                >
                                    Hour
                                </Text>
                                <View
                                    style={{
                                        height: 240,
                                        borderWidth: 2,
                                        borderColor: '#e2e8f0',
                                        borderRadius: 16,
                                        backgroundColor: '#fafafa',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <ScrollView
                                        ref={hourScrollRef}
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={{ paddingVertical: 96 }}
                                    >
                                        {Array.from({ length: 24 }).map((_, i) => {
                                            const hour = String(i).padStart(2, '0');
                                            const isSelected = hours === hour;
                                            return (
                                                <TouchableOpacity
                                                    key={i}
                                                    style={{
                                                        height: 48,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backgroundColor: isSelected ? '#6366f1' : 'transparent',
                                                        marginHorizontal: 8,
                                                        marginVertical: 2,
                                                        borderRadius: 12,
                                                    }}
                                                    onPress={() => handleHourChange(hour)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 24,
                                                            fontWeight: isSelected ? '800' : '600',
                                                            color: isSelected ? '#fff' : '#64748b',
                                                            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                                                        }}
                                                    >
                                                        {hour}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            </View>

                            <Text
                                style={{
                                    fontSize: 32,
                                    fontWeight: '700',
                                    color: '#cbd5e1',
                                    paddingTop: 36,
                                }}
                            >
                                :
                            </Text>

                            {/* Minutes Picker */}
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: '800',
                                        color: '#64748b',
                                        marginBottom: 12,
                                        textAlign: 'center',
                                        textTransform: 'uppercase',
                                        letterSpacing: 1,
                                    }}
                                >
                                    Minute
                                </Text>
                                <View
                                    style={{
                                        height: 240,
                                        borderWidth: 2,
                                        borderColor: '#e2e8f0',
                                        borderRadius: 16,
                                        backgroundColor: '#fafafa',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <ScrollView
                                        ref={minuteScrollRef}
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={{ paddingVertical: 96 }}
                                    >
                                        {Array.from({ length: 60 }).map((_, i) => {
                                            const minute = String(i).padStart(2, '0');
                                            const isSelected = minutes === minute;
                                            return (
                                                <TouchableOpacity
                                                    key={i}
                                                    style={{
                                                        height: 48,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backgroundColor: isSelected ? '#6366f1' : 'transparent',
                                                        marginHorizontal: 8,
                                                        marginVertical: 2,
                                                        borderRadius: 12,
                                                    }}
                                                    onPress={() => handleMinuteChange(minute)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 24,
                                                            fontWeight: isSelected ? '800' : '600',
                                                            color: isSelected ? '#fff' : '#64748b',
                                                            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                                                        }}
                                                    >
                                                        {minute}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.modalButton,
                                styles.saveButton,
                                { marginTop: 24 },
                            ]}
                            onPress={() => setShowPicker(false)}
                        >
                            <Text style={styles.saveButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
        </View>
            </Modal >
        </View >
    );
}
