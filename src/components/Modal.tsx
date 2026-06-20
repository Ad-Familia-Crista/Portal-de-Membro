import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './Button';
import { Card } from './Card';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-muted/10 flex-shrink-0 bg-white">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-primary leading-tight">
                {title}
              </h2>
            </div>

            {/* Content - Scrollable */}
            <div className="px-6 py-6 overflow-y-auto flex-grow bg-white">
              {children}
            </div>

            {/* Footer - Fixed at bottom */}
            {footer && (
              <div className="px-6 py-4 border-t border-muted/10 bg-background/40 flex-shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
