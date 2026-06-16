import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
  };
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useMemo(() => ({
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
    warning: (msg: string) => addToast(msg, 'warning'),
  }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast }}>
      {children}
      
      {/* Toast Portal/Container */}
      <div 
        id="toast-container"
        className="fixed top-5 right-5 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95, x: 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 50, transition: { duration: 0.15 } }}
              className="pointer-events-auto w-full"
            >
              <ToastCard item={item} onClose={() => removeToast(item.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

const ToastCard: React.FC<{ item: ToastItem; onClose: () => void }> = ({ item, onClose }) => {
  const styles = {
    success: {
      bg: 'bg-white dark:bg-slate-900',
      border: 'border-l-4 border-l-emerald-500 border-slate-150 dark:border-slate-800',
      icon: <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />,
      text: 'text-slate-800 dark:text-slate-200',
    },
    error: {
      bg: 'bg-white dark:bg-slate-900',
      border: 'border-l-4 border-l-rose-500 border-slate-150 dark:border-slate-800',
      icon: <XCircle size={18} className="text-rose-500 shrink-0" />,
      text: 'text-slate-800 dark:text-slate-200',
    },
    info: {
      bg: 'bg-white dark:bg-slate-900',
      border: 'border-l-4 border-l-sky-500 border-slate-150 dark:border-slate-800',
      icon: <Info size={18} className="text-sky-500 shrink-0" />,
      text: 'text-slate-800 dark:text-slate-200',
    },
    warning: {
      bg: 'bg-white dark:bg-slate-900',
      border: 'border-l-4 border-l-amber-500 border-slate-150 dark:border-slate-800',
      icon: <AlertTriangle size={18} className="text-amber-500 shrink-0" />,
      text: 'text-slate-800 dark:text-slate-200',
    },
  }[item.type];

  return (
    <div
      id={`toast-${item.id}`}
      className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border ${styles.border} ${styles.bg} backdrop-blur-sm`}
    >
      {styles.icon}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${styles.text} break-words leading-relaxed`}>
          {item.message}
        </p>
      </div>
      <button
        id={`toast-close-${item.id}`}
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
};
