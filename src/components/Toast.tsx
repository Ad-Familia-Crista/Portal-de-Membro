import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../utils';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  onClose, 
  duration = 5000 
}) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500" />,
    info: <Info className="w-5 h-5 text-sky-500" />,
  };

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-100',
    error: 'bg-rose-50 border-rose-100',
    info: 'bg-sky-50 border-sky-100',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={cn(
        "fixed bottom-6 right-6 z-[100] flex items-center gap-3 p-4 rounded-xl border-2 shadow-lg max-w-md",
        bgColors[type]
      )}
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <p className="text-sm font-semibold text-primary/90 flex-1">{message}</p>
      <button 
        onClick={onClose}
        className="text-muted/40 hover:text-muted/100 transition-colors p-1"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

// Hook for Toast management
export const useToast = () => {
  const [toasts, setToasts] = React.useState<{ id: number; message: string; type: ToastType }[]>([]);

  const showToast = React.useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const hideToast = React.useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const ToastContainer = () => (
    <div className="fixed bottom-0 right-0 z-[100] pointer-events-none p-6 space-y-4">
      <AnimatePresence>
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast 
              message={t.message} 
              type={t.type} 
              onClose={() => hideToast(t.id)} 
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );

  return { showToast, ToastContainer };
};
