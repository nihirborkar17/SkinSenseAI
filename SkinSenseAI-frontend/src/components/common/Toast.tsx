import { Toaster } from 'react-hot-toast';

const Toast = () => {
    return (
        <Toaster 
      position="top-center"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: '#fff',
          color: '#1f2937',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          maxWidth: '500px',
          fontSize: '14px',
          fontWeight: '500',
        },
        
        // Success toast style
        success: {
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1f2937',
            border: '1px solid #2563eb',
          },
          iconTheme: {
            primary: '#2563eb',
            secondary: '#fff',
          },
        },
        
        // Error toast style
        error: {
          duration: 5000,
          style: {
            background: '#fff',
            color: '#1f2937',
            border: '1px solid #ef4444',
          },
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
        
        // Loading toast style
        loading: {
          style: {
            background: '#fff',
            color: '#1f2937',
            border: '1px solid #3b82f6',
          },
          iconTheme: {
            primary: '#3b82f6',
            secondary: '#fff',
          },
        },
      }}
    />
    );
};

export default Toast;