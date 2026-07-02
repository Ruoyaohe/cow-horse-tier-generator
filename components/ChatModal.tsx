
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessage {
  timestamp: string;
  tier: string;
  score: number;
  profile: {
    dailyHours: number;
    salaryRange: string;
    leaveDays: number;
    continuousDays: number;
    mealAllowance: number;
  };
  feedback: string;
  filename: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen]);

  const loadMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      // 获取吐槽列表
      const listResponse = await fetch('/api/feedback/list');
      if (!listResponse.ok) {
        throw new Error('获取列表失败');
      }
      const listData = await listResponse.json();
      
      if (!listData.success || !listData.files) {
        setMessages([]);
        return;
      }

      // 按时间倒序获取所有吐槽内容
      const filePromises = listData.files.map(async (file: any) => {
        try {
          const contentResponse = await fetch(`/api/feedback/${file.filename}`);
          if (!contentResponse.ok) {
            return null;
          }
          const contentData = await contentResponse.json();
          if (!contentData.success) {
            return null;
          }

          // 解析文件内容
          const content = contentData.content;
          
          // 提取时间戳
          const timestampMatch = content.match(/【牛马吐槽 - (.*?)】/);
          const timestamp = timestampMatch ? timestampMatch[1] : '';

          // 提取等级和得分
          const tierMatch = content.match(/等级：(.*?) \(得分: (\d+)\)/);
          const tier = tierMatch ? tierMatch[1] : '';
          const score = tierMatch ? parseInt(tierMatch[2]) : 0;

          // 提取工作数据
          const dailyHoursMatch = content.match(/日均工时：(\d+)H/);
          const leaveDaysMatch = content.match(/月休天数：(\d+)D/);
          const continuousDaysMatch = content.match(/连续工作：(\d+)D/);
          const mealAllowanceMatch = content.match(/伙食标准：(\d+)￥/);
          const salaryRangeMatch = content.match(/月薪区间：(.*?)(?:\n|$)/m);

          // 提取吐槽内容（在"吐槽内容："之后，分隔线之前）
          const feedbackStart = content.indexOf('吐槽内容：');
          const feedbackEnd = content.indexOf('='.repeat(50));
          let feedback = '';
          if (feedbackStart !== -1) {
            const startPos = feedbackStart + 5; // "吐槽内容："的长度
            if (feedbackEnd !== -1) {
              feedback = content.substring(startPos, feedbackEnd).trim();
            } else {
              // 如果没有分隔线，取到文件末尾
              feedback = content.substring(startPos).trim();
            }
          }

          return {
            timestamp,
            tier,
            score,
            profile: {
              dailyHours: dailyHoursMatch ? parseInt(dailyHoursMatch[1]) : 0,
              leaveDays: leaveDaysMatch ? parseInt(leaveDaysMatch[1]) : 0,
              continuousDays: continuousDaysMatch ? parseInt(continuousDaysMatch[1]) : 0,
              mealAllowance: mealAllowanceMatch ? parseInt(mealAllowanceMatch[1]) : 0,
              salaryRange: salaryRangeMatch ? salaryRangeMatch[1].trim() : ''
            },
            feedback,
            filename: file.filename
          };
        } catch (err) {
          console.error(`读取文件 ${file.filename} 失败:`, err);
          return null;
        }
      });

      const loadedMessages = (await Promise.all(filePromises)).filter((msg): msg is ChatMessage => msg !== null);
      
      // 按时间倒序排列（最新的在前）
      loadedMessages.sort((a, b) => {
        const timeA = new Date(a.timestamp.replace(/\//g, '-')).getTime();
        const timeB = new Date(b.timestamp.replace(/\//g, '-')).getTime();
        return timeB - timeA;
      });

      setMessages(loadedMessages);
    } catch (err) {
      console.error('加载消息失败:', err);
      setError('加载失败，请确保服务器已启动');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    if (tier.includes('金牌')) return 'text-amber-600';
    if (tier.includes('银牌')) return 'text-blue-600';
    return 'text-orange-800';
  };

  const getTierBadge = (tier: string) => {
    if (tier.includes('金牌')) return 'gradient-gold';
    if (tier.includes('银牌')) return 'gradient-silver';
    return 'gradient-bronze';
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
            className="bg-white rounded-2xl w-full max-w-md h-[80vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-700">牛马小群</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {messages.length} 条吐槽
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="relative w-12 h-12 mb-4 mx-auto">
                      <div className="absolute inset-0 border-4 border-[#87BDFF]/20 rounded-full" />
                      <div className="absolute inset-0 border-4 border-[#87BDFF] rounded-full border-t-transparent animate-spin" />
                    </div>
                    <p className="text-xs text-slate-400">加载中...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-slate-400">暂无吐槽，快来分享你的牛马故事吧~</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <motion.div
                    key={msg.filename}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex flex-col"
                  >
                    {/* 消息气泡 */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      {/* 用户信息和等级 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-600">牛马#{index + 1}</span>
                          <span className={`text-[10px] font-black ${getTierColor(msg.tier)}`}>
                            {msg.tier}
                          </span>
                          <div className={`px-1.5 py-0.5 rounded text-[8px] font-black ${getTierBadge(msg.tier)} text-white`}>
                            {msg.score}分
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-400">
                          {msg.timestamp}
                        </span>
                      </div>

                      {/* 吐槽内容 */}
                      <p className="text-sm text-slate-700 leading-relaxed mb-2">
                        {msg.feedback}
                      </p>

                      {/* 工作数据标签 */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[9px] bg-white px-2 py-0.5 rounded-full text-slate-500 border border-slate-200">
                          {msg.profile.dailyHours}H/天
                        </span>
                        <span className="text-[9px] bg-white px-2 py-0.5 rounded-full text-slate-500 border border-slate-200">
                          {msg.profile.leaveDays}天/月
                        </span>
                        <span className="text-[9px] bg-white px-2 py-0.5 rounded-full text-slate-500 border border-slate-200">
                          {msg.profile.salaryRange}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* 底部提示 */}
            <div className="p-3 border-t border-slate-100 bg-slate-50">
              <p className="text-[9px] text-slate-400 text-center">
                只读模式 · 点击"我要吐槽"按钮分享你的故事
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatModal;
