import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertTriangle, AlertCircle, Info, Trash2, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmationOptions {
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  actionType?: 'delete' | 'reset' | 'generic';
}

interface ConfirmationContextType {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | null>(null);

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
};

interface ConfirmationProviderProps {
  children: ReactNode;
}

export const ConfirmationProvider: React.FC<ConfirmationProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [resolveFn, setResolveFn] = useState<((val: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmationOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolveFn(() => resolve);
    });
  };

  const handleConfirm = () => {
    if (resolveFn) resolveFn(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolveFn) resolveFn(false);
    setIsOpen(false);
  };

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {isOpen && options && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with a smooth blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              id="confirm-dialog-backdrop"
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs"
            />
            
            {/* Confirmation Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              id="confirm-dialog-card"
              className="relative w-full max-w-md bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-2xl space-y-6 text-center z-10"
            >
              <div className="mx-auto flex flex-col items-center">
                {/* Visual Icon Header depending on style */}
                {options.actionType === 'delete' || options.type === 'danger' ? (
                  <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-sm animate-bounce-subtle">
                    <Trash2 className="w-7 h-7" />
                  </div>
                ) : options.actionType === 'reset' || options.type === 'warning' ? (
                  <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm animate-bounce-subtle">
                    <RotateCcw className="w-7 h-7 animate-spin-once" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                    <Info className="w-7 h-7" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-gray-950 text-base md:text-lg tracking-tight">
                  {options.title}
                </h3>
                <div className="text-xs md:text-sm text-gray-500 leading-relaxed font-normal px-2">
                  {options.message}
                </div>
              </div>

              {/* Action Buttons wrapping styled elements with IDs */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  id="confirm-dialog-cancel-btn"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs md:text-sm font-semibold py-3 rounded-2xl transition-all duration-200 border border-gray-200/50"
                >
                  {options.cancelText || 'Cancel'}
                </button>
                <button
                  type="button"
                  id="confirm-dialog-confirm-btn"
                  onClick={handleConfirm}
                  className={`flex-1 text-white text-xs md:text-sm font-semibold py-3 rounded-2xl shadow-lg shadow-gray-200 transition-all duration-200 font-sans ${
                    options.actionType === 'delete' || options.type === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700 hover:shadow-rose-100 active:bg-rose-800'
                      : options.actionType === 'reset' || options.type === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700 hover:shadow-amber-100 active:bg-amber-800'
                      : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-100 active:bg-indigo-800'
                  }`}
                >
                  {options.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmationContext.Provider>
  );
};
