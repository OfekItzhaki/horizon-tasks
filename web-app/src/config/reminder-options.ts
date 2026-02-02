import { ReminderTimeframe, ReminderSpecificDate } from '@tasks-management/frontend-services';

export const TIMEFRAMES = [
    { value: ReminderTimeframe.SPECIFIC_DATE, label: 'Specific Date' },
    { value: ReminderTimeframe.EVERY_DAY, label: 'Every Day' },
    { value: ReminderTimeframe.EVERY_WEEK, label: 'Every Week' },
    { value: ReminderTimeframe.EVERY_MONTH, label: 'Every Month' },
    { value: ReminderTimeframe.EVERY_YEAR, label: 'Every Year' },
];

export const SPECIFIC_DATES = [
    { value: ReminderSpecificDate.START_OF_WEEK, label: 'Start of Week (Monday)' },
    { value: ReminderSpecificDate.START_OF_MONTH, label: 'Start of Month (1st)' },
    { value: ReminderSpecificDate.START_OF_YEAR, label: 'Start of Year (Jan 1st)' },
    { value: ReminderSpecificDate.CUSTOM_DATE, label: 'Custom Date' },
];
