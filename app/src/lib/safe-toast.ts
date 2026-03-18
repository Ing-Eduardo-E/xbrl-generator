/**
 * Wrapper seguro para sonner toast.
 * Difiere las llamadas con setTimeout para evitar que el flushSync
 * interno de Sonner 2.x crashee durante la reconciliación de React 19.
 * Ver: https://github.com/emilkowalski/sonner/issues/596
 */
import { toast as sonnerToast, type ExternalToast } from 'sonner';

type ToastMessage = Parameters<typeof sonnerToast>[0];

function deferToast(
  method: (message: ToastMessage, data?: ExternalToast) => string | number,
  message: ToastMessage,
  data?: ExternalToast,
) {
  setTimeout(() => method(message, data), 0);
}

export const toast = Object.assign(
  (message: ToastMessage, data?: ExternalToast) => {
    deferToast(sonnerToast as typeof sonnerToast.success, message, data);
  },
  {
    success: (message: ToastMessage, data?: ExternalToast) =>
      deferToast(sonnerToast.success, message, data),
    error: (message: ToastMessage, data?: ExternalToast) =>
      deferToast(sonnerToast.error, message, data),
    warning: (message: ToastMessage, data?: ExternalToast) =>
      deferToast(sonnerToast.warning, message, data),
    info: (message: ToastMessage, data?: ExternalToast) =>
      deferToast(sonnerToast.info, message, data),
    loading: (message: ToastMessage, data?: ExternalToast) =>
      deferToast(sonnerToast.loading, message, data),
    dismiss: (id?: string | number) => {
      setTimeout(() => sonnerToast.dismiss(id), 0);
    },
  },
);