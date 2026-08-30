import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CountdownOverlayProps {
  count: number;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ count }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center select-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white text-7xl font-extrabold shadow-2xl shadow-rose-950/80 mb-6 border-4 border-white/20">
            {count > 0 ? count : 'GO!'}
          </div>
          <p className="text-lg font-medium text-zinc-300">
            {count > 0 ? 'Chuẩn bị bắt đầu quay màn hình...' : 'Bắt đầu ghi hình!'}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
