
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  tierLabel: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, tierLabel }) => {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(feedback);
      setFeedback('');
      onClose();
    } catch (err) {
      console.error('提交失败:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-700">我要吐槽</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-2">
                分享你的牛马趣事，让我们一起抱团取暖 💪
              </p>
              <p className="text-[10px] text-slate-400 mb-3">
                当前等级：<span className="font-black text-slate-600">{tierLabel}</span>
              </p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="在这里写下你的牛马故事..."
                className="w-full h-32 bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 focus:bg-white focus:border-[#87BDFF] outline-none transition-all text-slate-700 font-bold text-sm resize-none"
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-[10px] text-slate-400">
                  字数：{feedback.length}/500
                </p>
                <p className="text-[10px] text-slate-400">
                  内容将匿名发至小群
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-slate-50 text-slate-400 font-black rounded-lg text-[10px] border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!feedback.trim() || isSubmitting}
                className="flex-1 py-3 bg-gradient-to-br from-[#FFC870] to-[#FF9D00] text-white font-black rounded-lg text-[10px] shadow-xl shadow-orange-100 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-2xl transition-all"
              >
                {isSubmitting ? '提交中...' : '提交吐槽'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FeedbackModal;
