import toast from 'react-hot-toast';

// Toast Utility Function 
// Centralized toast notification with consistent styling

export const showToast = {
    // Success toast
    success: (message : string, duration?: number) =>{
        toast.success(message, {
            duration: duration || 4000,
        });
    },
    // Error toast
    error : (message: string, duration?: number) => {
        toast.error(message,{
            duration: duration || 5000,
        });
    },
    // Loading toast - Returns toast ID for dismissal
    loading: (message: string) => {
        return toast.loading(message);
    },
    // Dismiss specific toast
    dismiss: (toastId: string) => {
        toast.dismiss(toastId);
    },
    // Dismiss all toasts
    dismissAll: ()=> {
        toast.dismiss();
    },
    // Info toast (custom)
    info: (message: string, duration?: number) => {
        toast(message, {
            icon: 'ℹ️',
            duration: duration || 4000,
        });
    },
    // Warning toast (custom)
    warning: (message: string, duration?: number) => {
        toast(message, {
            icon: '⚠️',
            duration: duration || 4000,
            style: {
                border: '1px solid #f59e0b',
            },
        });
    },  
};
