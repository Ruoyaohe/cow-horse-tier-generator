
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface QRCodeDisplayProps {
  url: string;
  onClose: () => void;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ url, onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black text-slate-700">分享体验二维码</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex flex-col items-center">
            <img src="/deploy-qr.png" alt="分享体验二维码" className="w-full max-w-[300px] rounded-xl mb-4" />
            
            <p className="text-xs text-slate-500 text-center break-all font-mono mb-2">
              {url}
            </p>
            <p className="text-[10px] text-slate-400 text-center">
              使用手机扫描二维码即可分享体验
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QRCodeDisplay;
