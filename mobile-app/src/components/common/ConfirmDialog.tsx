import { Alert } from 'react-native';

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  destructive?: boolean;
}

export function showConfirmDialog({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmDialogOptions): void {
  Alert.alert(
    title,
    message,
    [
      { 
        text: cancelText, 
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: onConfirm,
      },
    ],
  );
}
