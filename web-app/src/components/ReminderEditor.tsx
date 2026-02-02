import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
    ReminderConfig,
    ReminderTimeframe,
    ReminderSpecificDate,
    DAY_NAMES,
    validateTime,
    validateCustomReminderDate,
    validateDaysBefore,
    normalizeTime,
    isRtlLanguage,
} from '@tasks-management/frontend-services';
import { TIMEFRAMES, SPECIFIC_DATES } from '../config/reminder-options';

interface ReminderEditorProps {
    reminder: ReminderConfig;
    onSave: (reminder: ReminderConfig) => void;
    onCancel: () => void;
    taskDueDate: string | null;
}

export default function ReminderEditor({ reminder, onSave, onCancel, taskDueDate }: ReminderEditorProps) {
    const { t, i18n } = useTranslation();
    const isRtl = isRtlLanguage(i18n.language);
    const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

    const initialCustomDate = useMemo(() => {
        const raw = reminder.customDate ? reminder.customDate.split('T')[0] : '';
        if (!raw) return '';
        const d = new Date(raw);
        d.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d < today ? todayStr : raw;
    }, [reminder.customDate, todayStr]);

    const [config, setConfig] = useState<ReminderConfig>({
        ...reminder,
        time: reminder.time || '09:00',
    });
    const [location, setLocation] = useState<string>(reminder.location ?? '');
    const [daysBefore, setDaysBefore] = useState<string>(reminder.daysBefore?.toString() ?? '');
    const [customDate, setCustomDate] = useState<string>(initialCustomDate);
    const [timeError, setTimeError] = useState<string | null>(null);
    const [customDateError, setCustomDateError] = useState<string | null>(null);
    const [daysBeforeError, setDaysBeforeError] = useState<string | null>(null);
    const [daysBeforeDueDateError, setDaysBeforeDueDateError] = useState<string | null>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onCancel]);

    const handleSave = () => {
        setTimeError(null);
        setCustomDateError(null);
        setDaysBeforeError(null);
        setDaysBeforeDueDateError(null);

        const timeRes = validateTime(config.time ?? '');
        if (!timeRes.valid) {
            setTimeError(timeRes.error ?? t('validation.invalidTime'));
            return;
        }

        if (config.timeframe === ReminderTimeframe.SPECIFIC_DATE && config.specificDate === ReminderSpecificDate.CUSTOM_DATE) {
            const dateRes = validateCustomReminderDate(customDate);
            if (!dateRes.valid) {
                setCustomDateError(dateRes.error ?? t('validation.invalidDate'));
                return;
            }
        }

        if (config.timeframe === ReminderTimeframe.SPECIFIC_DATE && daysBefore.trim()) {
            const dbRes = validateDaysBefore(daysBefore);
            if (!dbRes.valid) {
                setDaysBeforeError(dbRes.error ?? t('validation.invalidDaysBefore'));
                return;
            }
            const num = parseInt(daysBefore, 10);
            if (!Number.isNaN(num) && num > 0 && !taskDueDate) {
                setDaysBeforeDueDateError(t('validation.daysBeforeRequiresDueDate'));
                return;
            }
        }

        const reminderToSave: ReminderConfig = {
            ...config,
            time: normalizeTime(config.time ?? '') ?? '09:00',
            location: location.trim() || undefined,
            daysBefore: daysBefore.trim() ? parseInt(daysBefore, 10) : undefined,
            customDate: customDate.trim() ? new Date(customDate).toISOString() : undefined,
            dayOfWeek: config.timeframe === ReminderTimeframe.EVERY_WEEK && config.dayOfWeek === undefined ? 1 : config.dayOfWeek,
        };

        onSave(reminderToSave);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onCancel}>
            <div className="premium-card max-w-lg w-full max-h-[90vh] shadow-2xl animate-scale-in flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className={`flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl z-10 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <h3 className="premium-header-section text-xl">{t('reminders.configure')}</h3>
                    <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-3xl leading-none font-light w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">×</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('reminders.timeframe')}:</label>
                        <div className="grid grid-cols-2 gap-3">
                            {TIMEFRAMES.map((tf) => (
                                <button
                                    key={tf.value}
                                    onClick={() => setConfig({ ...config, timeframe: tf.value, specificDate: tf.value === ReminderTimeframe.SPECIFIC_DATE ? ReminderSpecificDate.CUSTOM_DATE : undefined })}
                                    className={`px-4 py-3 rounded-xl text-sm font-semibold ${config.timeframe === tf.value ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg shadow-primary-500/30 scale-105' : 'glass-card text-gray-700 dark:text-gray-200'}`}
                                >
                                    {tf.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {config.timeframe === ReminderTimeframe.SPECIFIC_DATE && (
                        <>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('reminders.dateOption')}:</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {SPECIFIC_DATES.map((sd) => (
                                        <button
                                            key={sd.value}
                                            onClick={() => setConfig({ ...config, specificDate: sd.value })}
                                            className={`px-4 py-3 rounded-xl text-sm font-semibold ${config.specificDate === sd.value ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg shadow-primary-500/30 scale-105' : 'glass-card text-gray-700 dark:text-gray-200'}`}
                                        >
                                            {sd.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {config.specificDate === ReminderSpecificDate.CUSTOM_DATE && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('reminders.customDate')}:</label>
                                    <input type="date" value={customDate} min={todayStr} onChange={(e) => { setCustomDate(e.target.value); setCustomDateError(null); }} className={`premium-input w-full focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all ${customDateError ? 'border-red-500 dark:border-red-400' : ''}`} />
                                    {customDateError && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">{customDateError}</p>}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('reminders.daysBefore')}:</label>
                                <input type="number" min="0" value={daysBefore} onChange={(e) => { setDaysBefore(e.target.value); setDaysBeforeError(null); setDaysBeforeDueDateError(null); }} placeholder="e.g. 0, 1, 7" className={`premium-input w-full focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all ${(daysBeforeError || daysBeforeDueDateError) ? 'border-red-500 dark:border-red-400' : ''}`} />
                                {(daysBeforeError || daysBeforeDueDateError) && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">{daysBeforeError ?? daysBeforeDueDateError}</p>}
                            </div>
                        </>
                    )}

                    {config.timeframe === ReminderTimeframe.EVERY_WEEK && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('reminders.dayOfWeek')}:</label>
                            <select value={config.dayOfWeek ?? 1} onChange={(e) => setConfig({ ...config, dayOfWeek: parseInt(e.target.value, 10) })} className="premium-input w-full focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all">
                                {DAY_NAMES.map((day, index) => <option key={index} value={index}>{day}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
                            <span>🕐</span>
                            {t('reminders.time')}
                            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(24h)</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <select value={(config.time || '09:00').split(':')[0]} onChange={(e) => setConfig({ ...config, time: `${e.target.value}:${(config.time || '09:00').split(':')[1] || '00'}` })} className={`premium-input w-full text-center text-lg font-mono focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all ${timeError ? 'border-red-500 dark:border-red-400' : ''}`}>
                                {Array.from({ length: 24 }).map((_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>)}
                            </select>
                            <span className="text-xl font-bold text-gray-400">:</span>
                            <select value={(config.time || '09:00').split(':')[1]} onChange={(e) => setConfig({ ...config, time: `${(config.time || '09:00').split(':')[0] || '09'}:${e.target.value}` })} className={`premium-input w-full text-center text-lg font-mono focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all ${timeError ? 'border-red-500 dark:border-red-400' : ''}`}>
                                {Array.from({ length: 60 }).map((_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>)}
                            </select>
                        </div>
                        {timeError && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 font-medium" role="alert">{timeError}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('reminders.location')} ({t('common.optional')})</label>
                        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('reminders.locationPlaceholder')} className="premium-input w-full focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all" />
                    </div>

                    <div className="flex items-center gap-3">
                        <input type="checkbox" id="hasAlarm" checked={config.hasAlarm ?? false} onChange={(e) => setConfig({ ...config, hasAlarm: e.target.checked })} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
                        <label htmlFor="hasAlarm" className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('reminders.enableAlarm')}</label>
                    </div>
                </div>

                <div className={`flex gap-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <button onClick={onCancel} className="flex-1 glass-button">{t('common.cancel')}</button>
                    <button onClick={handleSave} className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-medium rounded-xl hover:shadow-glow transition-all">{t('common.save')}</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
