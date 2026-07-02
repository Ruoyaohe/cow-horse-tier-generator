
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import { WorkProfile, CowHorseTier, TierResult } from './types';
import { SALARY_RANGES, LOADING_MESSAGES, calculateTier } from './constants';
import { getTierImage } from './services/geminiService';
import QRCodeDisplay from './components/QRCodeDisplay';
import FeedbackModal from './components/FeedbackModal';
import ChatModal from './components/ChatModal';

const CustomSelect: React.FC<{
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}> = ({ label, options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-[10px] font-black text-slate-400 mb-1 ml-1 tracking-widest uppercase">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-blue-50/50 border-2 rounded-xl px-4 py-2.5 flex justify-between items-center transition-all outline-none ${
          isOpen ? 'border-[#87BDFF] bg-white ring-4 ring-blue-100' : 'border-transparent'
        }`}
      >
        <span className="text-slate-700 font-bold text-sm">{value}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute z-50 w-full bg-white rounded-xl shadow-2xl border border-blue-50 overflow-hidden py-1 backdrop-blur-xl"
          >
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left transition-colors font-bold text-xs ${
                  value === option ? 'bg-blue-50 text-[#87BDFF]' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {option}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const App: React.FC = () => {
  const [profile, setProfile] = useState<WorkProfile>({
    dailyHours: 9,
    salaryRange: '6k-10k',
    leaveDays: 2,
    continuousDays: 5,
    mealAllowance: 25,
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [result, setResult] = useState<{ image: string; data: TierResult } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const exportCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // 获取访问URL用于生成二维码
  useEffect(() => {
    const getAccessUrl = () => {
      const hostname = window.location.hostname;
      const port = window.location.port || '3000';
      
      // 如果是 localhost，尝试通过 WebRTC 获取局域网IP
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        let found = false;
        try {
          const pc = new RTCPeerConnection({ iceServers: [] });
          pc.createDataChannel('');
          pc.createOffer().then(offer => pc.setLocalDescription(offer));
          
          pc.onicecandidate = (event) => {
            if (event.candidate && !found) {
              const candidate = event.candidate.candidate;
              const match = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
              if (match && match[1]) {
                const ip = match[1];
                // 检查是否是局域网IP
                if (ip.startsWith('192.168.') || ip.startsWith('10.') || (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)) {
                  setQrUrl(`http://${ip}:${port}`);
                  found = true;
                  pc.close();
                }
              }
            }
          };
          
          // 如果3秒内没获取到，使用 localhost（需要用户手动输入IP）
          setTimeout(() => {
            if (!found) {
              setQrUrl(`http://${hostname}:${port}`);
            }
            pc.close();
          }, 3000);
        } catch (err) {
          // 如果获取失败，使用当前hostname
          setQrUrl(`http://${hostname}:${port}`);
        }
      } else {
        // 直接使用当前hostname（可能是局域网IP或域名）
        setQrUrl(`http://${hostname}:${port}`);
      }
    };
    
    getAccessUrl();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // 当输入为空时，设置为 0，但输入框显示为空字符串
    const numValue = value === '' ? 0 : Number(value);
    setProfile(prev => ({ ...prev, [name]: numValue }));
  };

  const handleSalaryChange = (val: string) => {
    setProfile(prev => ({ ...prev, salaryRange: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFlipped(true); 
    setLoading(true);
    setError(null);
    setResult(null);

    // 模拟加载过程，让用户看到加载动画（随机5-8秒）
    const waitTime = Math.floor(Math.random() * 3000) + 5000; // 5000-8000毫秒
    await new Promise(resolve => setTimeout(resolve, waitTime));

    try {
      const tierData = calculateTier(profile);
      const imageUrl = getTierImage(tierData.tier);
      setResult({ image: imageUrl, data: tierData });
    } catch (err) {
      setError('图片加载失败，请刷新重试。');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setResult(null);
      setError(null);
      setLoading(false);
      setIsExporting(false);
      setShowFeedback(false);
    }, 600);
  };

  // 处理吐槽提交
  const handleFeedbackSubmit = async (text: string) => {
    try {
      // 创建吐槽数据对象
      const feedbackData = {
        timestamp: new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        tier: result?.data.label || '未知',
        score: result?.data.score || 0,
        profile: {
          dailyHours: profile.dailyHours,
          salaryRange: profile.salaryRange,
          leaveDays: profile.leaveDays,
          continuousDays: profile.continuousDays,
          mealAllowance: profile.mealAllowance
        },
        feedback: text
      };

      // 调用API保存到服务器（通过Vite代理）
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`服务器错误 (${response.status}): ${errorText || '未知错误'}`);
      }

      // 检查响应内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`服务器返回了非JSON响应: ${text.substring(0, 100)}`);
      }

      // 解析JSON响应
      let apiResult;
      try {
        const text = await response.text();
        if (!text) {
          throw new Error('服务器返回了空响应');
        }
        apiResult = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON解析失败:', parseError);
        throw new Error('服务器返回了无效的JSON响应。请确保后端服务器已启动（运行 npm run dev:server）');
      }

      if (apiResult.success) {
        alert('吐槽已发送小群');
      } else {
        throw new Error(apiResult.message || '保存失败');
      }
    } catch (err) {
      console.error('保存失败:', err);
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      
      // 检查是否是网络错误（服务器未启动）
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Unexpected end of JSON')) {
        alert('保存失败：无法连接到服务器。\n\n请确保后端服务器已启动：\n运行 "npm run dev:server" 或 "npm run dev:all"');
      } else {
        alert('保存失败：' + errorMessage);
      }
      throw err;
    }
  };

  // 文本换行辅助函数
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split('');
    const lines: string[] = [];
    let currentLine = '';
    
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  // 将图片转换为base64，解决移动端跨域问题（保持高质量）
  const imageToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d', { 
            alpha: true,
            desynchronized: true
          });
          if (!ctx) {
            reject(new Error('无法创建canvas上下文'));
            return;
          }
          
          // 启用高质量图片平滑
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // 绘制原始尺寸图片，保持最高质量
          ctx.drawImage(img, 0, 0);
          
          // 使用PNG格式，质量参数1.0（最高质量）
          resolve(canvas.toDataURL('image/png', 1.0));
        } catch (err) {
          reject(err);
        }
      };
      
      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };
      
      // 如果是相对路径，转换为绝对路径
      if (url.startsWith('/')) {
        img.src = window.location.origin + url;
      } else {
        img.src = url;
      }
    });
  };

  const handleDownloadCard = async () => {
    if (!result) return;
    setIsExporting(true);
    
    try {
      // 先将图片转换为base64（解决移动端跨域问题）
      let imageBase64 = result.image;
      if (result.image.startsWith('/') || result.image.startsWith('http')) {
        try {
          imageBase64 = await imageToBase64(result.image);
        } catch (err) {
          console.warn('图片转换失败，使用原始URL:', err);
          if (result.image.startsWith('/')) {
            imageBase64 = window.location.origin + result.image;
          } else {
            imageBase64 = result.image;
          }
        }
      }
      
      // 等待图片完全加载
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('图片加载超时'));
        }, 15000);
        
        img.onload = () => {
          clearTimeout(timeout);
          resolve(null);
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('图片加载失败'));
        };
        
        img.src = imageBase64;
      });
      
      // 创建canvas并绘制
      const canvas = document.createElement('canvas');
      const scale = 3; // 提高清晰度到3倍
      
      // 先计算内容总高度，动态确定卡片高度
      const cardWidth = 380;
      const padding = 24;
      const headerHeight = 36;
      const imageWidth = cardWidth - padding * 2; // 332px
      const imageHeight = imageWidth; // 1:1正方形
      const imageMargin = 12;
      const descHeight = 60;
      const descMargin = 16;
      const statsHeight = 50;
      const statsMargin = 16;
      const watermarkHeight = 24;
      const totalContentHeight = headerHeight + imageHeight + imageMargin + descHeight + descMargin + statsHeight + statsMargin + watermarkHeight;
      
      // 卡片高度 = 内容高度 + 上下padding + 一些额外空间确保不被裁切
      const cardHeight = totalContentHeight + padding * 2 + 20; // 额外20px确保安全
      
      canvas.width = cardWidth * scale;
      canvas.height = cardHeight * scale;
      const ctx = canvas.getContext('2d', { 
        alpha: false, // 不透明背景，提高性能
        desynchronized: true // 异步渲染
      });
      if (!ctx) {
        throw new Error('无法创建canvas上下文');
      }
      
      // 启用高质量图片平滑
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // 设置背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 设置缩放
      ctx.scale(scale, scale);
      
      // 绘制圆角背景
      const radius = 32;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(cardWidth - radius, 0);
      ctx.quadraticCurveTo(cardWidth, 0, cardWidth, radius);
      ctx.lineTo(cardWidth, cardHeight - radius);
      ctx.quadraticCurveTo(cardWidth, cardHeight, cardWidth - radius, cardHeight);
      ctx.lineTo(radius, cardHeight);
      ctx.quadraticCurveTo(0, cardHeight, 0, cardHeight - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.fill();
      
      // 内容从顶部开始，确保所有内容都能显示
      let y = padding; // 起始Y位置（从顶部开始，不再垂直居中）
      
      // 绘制标题和等级
      ctx.fillStyle = result.data.tier === CowHorseTier.GOLD ? '#d97706' : 
                      result.data.tier === CowHorseTier.SILVER ? '#2563eb' : '#9a3412';
      ctx.font = '900 14px sans-serif'; // fontWeight: 900, letterSpacing: '-0.025em'
      ctx.letterSpacing = '-0.025em';
      ctx.fillText(`鉴定: ${result.data.label}`, padding, y + 14);
      
      // 绘制等级徽章（带圆角和渐变，与实际显示一致）
      const tierText = result.data.tier;
      ctx.font = '900 9px sans-serif'; // fontWeight: 900
      const tierMetrics = ctx.measureText(tierText);
      const tierPadding = 8; // padding: '2px 8px'，左右8px
      const tierWidth = tierMetrics.width + tierPadding * 2;
      const tierHeight = 20; // padding上下2px + 文字高度约16px
      const tierX = cardWidth - tierWidth - padding;
      const tierY = y;
      const tierRadius = 4; // borderRadius: '4px'
      
      // 绘制渐变背景（45度角，与实际显示一致）
      // linear-gradient(45deg, ...) 从左上到右下
      const gradientX1 = tierX;
      const gradientY1 = tierY;
      const gradientX2 = tierX + tierWidth;
      const gradientY2 = tierY + tierHeight;
      
      const gradient = ctx.createLinearGradient(gradientX1, gradientY1, gradientX2, gradientY2);
      if (result.data.tier === CowHorseTier.GOLD) {
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(0.5, '#FFC870');
        gradient.addColorStop(1, '#B8860B');
      } else if (result.data.tier === CowHorseTier.SILVER) {
        gradient.addColorStop(0, '#BDC3C7');
        gradient.addColorStop(0.5, '#87BDFF');
        gradient.addColorStop(1, '#7F8C8D');
      } else {
        gradient.addColorStop(0, '#CD7F32');
        gradient.addColorStop(0.5, '#D2691E');
        gradient.addColorStop(1, '#8B4513');
      }
      
      // 绘制圆角矩形
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(tierX + tierRadius, tierY);
      ctx.lineTo(tierX + tierWidth - tierRadius, tierY);
      ctx.quadraticCurveTo(tierX + tierWidth, tierY, tierX + tierWidth, tierY + tierRadius);
      ctx.lineTo(tierX + tierWidth, tierY + tierHeight - tierRadius);
      ctx.quadraticCurveTo(tierX + tierWidth, tierY + tierHeight, tierX + tierWidth - tierRadius, tierY + tierHeight);
      ctx.lineTo(tierX + tierRadius, tierY + tierHeight);
      ctx.quadraticCurveTo(tierX, tierY + tierHeight, tierX, tierY + tierHeight - tierRadius);
      ctx.lineTo(tierX, tierY + tierRadius);
      ctx.quadraticCurveTo(tierX, tierY, tierX + tierRadius, tierY);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.fillText(tierText, tierX + tierPadding, tierY + 14);
      
      y += headerHeight;
      
      // 绘制图片（高质量，带圆角，1:1正方形，无留白）
      const imageY = y;
      const imageRadius = 12; // 与实际显示一致：borderRadius: '12px'
      ctx.save();
      
      // 启用高质量图片渲染
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // 图片区域是1:1正方形
      const targetSize = imageWidth; // 332px x 332px
      
      // 先绘制圆角矩形路径并设置clip区域
      ctx.beginPath();
      ctx.moveTo(padding + imageRadius, imageY);
      ctx.lineTo(padding + targetSize - imageRadius, imageY);
      ctx.quadraticCurveTo(padding + targetSize, imageY, padding + targetSize, imageY + imageRadius);
      ctx.lineTo(padding + targetSize, imageY + targetSize - imageRadius);
      ctx.quadraticCurveTo(padding + targetSize, imageY + targetSize, padding + targetSize - imageRadius, imageY + targetSize);
      ctx.lineTo(padding + imageRadius, imageY + targetSize);
      ctx.quadraticCurveTo(padding, imageY + targetSize, padding, imageY + targetSize - imageRadius);
      ctx.lineTo(padding, imageY + imageRadius);
      ctx.quadraticCurveTo(padding, imageY, padding + imageRadius, imageY);
      ctx.closePath();
      ctx.clip();
      
      // 绘制背景色（与实际显示一致：backgroundColor: '#f1f5f9'）
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(padding, imageY, targetSize, targetSize);
      
      // 计算图片绘制尺寸，使用cover模式（填充整个正方形，无留白）
      const imageAspectRatio = img.naturalWidth / img.naturalHeight;
      let drawWidth = targetSize;
      let drawHeight = targetSize;
      let drawX = padding;
      let drawY = imageY;
      
      // cover模式：图片按比例缩放填充整个区域，超出部分被裁剪
      if (imageAspectRatio > 1) {
        // 横向图片：按高度填充，宽度会超出，从中心裁剪左右
        drawWidth = targetSize * imageAspectRatio;
        drawHeight = targetSize;
        drawX = padding - (drawWidth - targetSize) / 2; // 居中裁剪左右
        drawY = imageY; // 从顶部开始
      } else {
        // 纵向图片：按宽度填充，高度会超出，从顶部裁剪底部
        drawWidth = targetSize;
        drawHeight = targetSize / imageAspectRatio;
        drawX = padding; // 从左边开始
        drawY = imageY; // 从顶部开始，底部会被裁剪
      }
      
      // 绘制图片（cover模式，填充整个正方形，无留白）
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();
      
      y += imageHeight + imageMargin;
      
      // 绘制描述（带圆角和边框，与实际显示一致）
      const descPadding = 10; // padding: '10px'
      const descRadius = 12; // borderRadius: '12px'
      const descWidth = cardWidth - padding * 2;
      const descText = `"${result.data.description}"`;
      
      // 绘制圆角背景
      ctx.fillStyle = '#f8fafc'; // backgroundColor: '#f8fafc'
      ctx.beginPath();
      ctx.moveTo(padding + descRadius, y);
      ctx.lineTo(padding + descWidth - descRadius, y);
      ctx.quadraticCurveTo(padding + descWidth, y, padding + descWidth, y + descRadius);
      ctx.lineTo(padding + descWidth, y + descHeight - descRadius);
      ctx.quadraticCurveTo(padding + descWidth, y + descHeight, padding + descWidth - descRadius, y + descHeight);
      ctx.lineTo(padding + descRadius, y + descHeight);
      ctx.quadraticCurveTo(padding, y + descHeight, padding, y + descHeight - descRadius);
      ctx.lineTo(padding, y + descRadius);
      ctx.quadraticCurveTo(padding, y, padding + descRadius, y);
      ctx.closePath();
      ctx.fill();
      
      // 绘制边框
      ctx.strokeStyle = '#e2e8f0'; // border: '1px solid #e2e8f0'
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // 绘制文字
      ctx.fillStyle = '#64748b'; // color: '#64748b'
      ctx.font = '700 italic 10px sans-serif'; // fontWeight: 700, fontStyle: 'italic', fontSize: '10px'
      ctx.textAlign = 'center';
      const descLines = wrapText(ctx, descText, descWidth - descPadding * 2);
      let descY = y + descPadding + 10; // padding + 文字基线
      descLines.forEach((line: string) => {
        ctx.fillText(line, padding + descWidth / 2, descY);
        descY += 15; // lineHeight: '1.5' ≈ 10px * 1.5
      });
      ctx.textAlign = 'left'; // 恢复左对齐
      
      y += descHeight + descMargin;
      
      // 绘制数据统计（带圆角和阴影，与实际显示一致）
      const statGap = 8; // gap: '8px'
      const statWidth = (cardWidth - padding * 2 - statGap * 2) / 3;
      const statPadding = 8; // padding: '8px'
      const statRadius = 8; // borderRadius: '8px'
      const stats = [
        { val: `${profile.dailyHours}H`, label: '日均' },
        { val: `${profile.continuousDays}D`, label: '连续' },
        { val: profile.salaryRange, label: '口粮' }
      ];
      
      stats.forEach((stat, i) => {
        const statX = padding + i * (statWidth + statGap);
        
        // 绘制圆角背景
        ctx.fillStyle = '#ffffff'; // backgroundColor: '#ffffff'
        ctx.beginPath();
        ctx.moveTo(statX + statRadius, y);
        ctx.lineTo(statX + statWidth - statRadius, y);
        ctx.quadraticCurveTo(statX + statWidth, y, statX + statWidth, y + statRadius);
        ctx.lineTo(statX + statWidth, y + statsHeight - statRadius);
        ctx.quadraticCurveTo(statX + statWidth, y + statsHeight, statX + statWidth - statRadius, y + statsHeight);
        ctx.lineTo(statX + statRadius, y + statsHeight);
        ctx.quadraticCurveTo(statX, y + statsHeight, statX, y + statsHeight - statRadius);
        ctx.lineTo(statX, y + statRadius);
        ctx.quadraticCurveTo(statX, y, statX + statRadius, y);
        ctx.closePath();
        ctx.fill();
        
        // 绘制边框
        ctx.strokeStyle = '#f1f5f9'; // border: '1px solid #f1f5f9'
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 绘制阴影效果（简化版）
        ctx.shadowColor = 'rgba(0, 0, 0, 0.05)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        
        // 绘制数值
        ctx.fillStyle = '#87BDFF'; // color: '#87BDFF'
        ctx.font = '900 10px sans-serif'; // fontWeight: 900, fontSize: '10px'
        ctx.shadowColor = 'transparent'; // 清除阴影
        const valMetrics = ctx.measureText(stat.val);
        ctx.fillText(stat.val, statX + (statWidth - valMetrics.width) / 2, y + statPadding + 10);
        
        // 绘制标签
        ctx.fillStyle = '#cbd5e1'; // color: '#cbd5e1'
        ctx.font = '900 7px sans-serif'; // fontWeight: 900, fontSize: '7px'
        ctx.textTransform = 'uppercase';
        const labelMetrics = ctx.measureText(stat.label);
        ctx.fillText(stat.label, statX + (statWidth - labelMetrics.width) / 2, y + statPadding + 20);
      });
      
      y += statsHeight + statsMargin;
      
      // 绘制水印和时间
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Generated by AI Cow-Horse Lab', cardWidth / 2, y);
      
      const timeText = new Date().toLocaleString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      ctx.fillStyle = '#94a3b8';
      ctx.font = '7px sans-serif';
      ctx.fillText(timeText, cardWidth / 2, y + 12);
      
      // 下载图片（使用最高质量）
      // PNG格式是无损压缩，质量参数会被忽略，但为了清晰度我们使用PNG
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `牛马报告-${result.data.label}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full h-full flex items-start md:items-center justify-center p-4 pt-6 md:pt-4 pb-24 md:pb-4 relative overflow-y-auto">
      {/* 群聊按钮（左下角） */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowChat(true)}
        className="fixed bottom-4 left-4 md:bottom-6 md:left-6 w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full shadow-2xl flex items-center justify-center z-40 hover:shadow-3xl transition-shadow"
        title="查看群聊"
      >
        <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </motion.button>

      {/* 二维码浮动按钮（右下角） */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowQRCode(true)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#87BDFF] to-[#FFC870] rounded-full shadow-2xl flex items-center justify-center z-40 hover:shadow-3xl transition-shadow"
        title="分享体验二维码"
      >
        <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      </motion.button>

      {/* 二维码显示组件 */}
      {showQRCode && qrUrl && (
        <QRCodeDisplay url={qrUrl} onClose={() => setShowQRCode(false)} />
      )}

      {/* 吐槽弹窗 */}
      {result && (
        <FeedbackModal
          isOpen={showFeedback}
          onClose={() => setShowFeedback(false)}
          onSubmit={handleFeedbackSubmit}
          tierLabel={result.data.label}
        />
      )}

      {/* 群聊弹窗 */}
      <ChatModal
        isOpen={showChat}
        onClose={() => setShowChat(false)}
      />

      {/* 隐藏的保存卡片（不应用3D变换，用于保存完整卡片） */}
      {result && (
        <div 
          ref={exportCardRef}
          style={{ 
            position: 'fixed',
            top: '0',
            left: '0',
            width: '380px',
            height: '532px',
            backgroundColor: '#ffffff',
            padding: '24px',
            borderRadius: '2rem',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1,
            transform: 'none',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #ffffff'
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ 
                fontSize: '14px', 
                fontWeight: 900, 
                letterSpacing: '-0.025em',
                color: result.data.tier === CowHorseTier.GOLD ? '#d97706' : 
                       result.data.tier === CowHorseTier.SILVER ? '#2563eb' : '#9a3412'
              }}>
                鉴定: {result.data.label}
              </h3>
              <div style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '9px',
                fontWeight: 900,
                color: '#ffffff',
                background: result.data.tier === CowHorseTier.GOLD 
                  ? 'linear-gradient(45deg, #FFD700, #FFC870, #B8860B)'
                  : result.data.tier === CowHorseTier.SILVER
                  ? 'linear-gradient(45deg, #BDC3C7, #87BDFF, #7F8C8D)'
                  : 'linear-gradient(45deg, #CD7F32, #D2691E, #8B4513)'
              }}>
                {result.data.tier}
              </div>
            </div>

            <div style={{ 
              position: 'relative', 
              marginBottom: '12px', 
              width: '100%',
              aspectRatio: '1 / 1', // 1:1正方形
              overflow: 'hidden', 
              borderRadius: '12px', 
              backgroundColor: '#f1f5f9'
            }}>
              <img 
                src={result.image.startsWith('/') ? window.location.origin + result.image : result.image}
                alt="result" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover', // cover模式，填充整个正方形，无留白
                  display: 'block'
                }}
                crossOrigin="anonymous"
                loading="eager"
              />
            </div>

            <div style={{ 
              backgroundColor: '#f8fafc', 
              padding: '10px', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0', 
              marginBottom: '16px' 
            }}>
              <p style={{ 
                color: '#64748b', 
                fontWeight: 700, 
                fontStyle: 'italic', 
                fontSize: '10px', 
                textAlign: 'center', 
                lineHeight: '1.5',
                margin: 0
              }}>
                "{result.data.description}"
              </p>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '8px', 
              marginBottom: '16px' 
            }}>
              {[
                { val: `${profile.dailyHours}H`, label: '日均' },
                { val: `${profile.continuousDays}D`, label: '连续' },
                { val: profile.salaryRange, label: '口粮' }
              ].map((s, i) => (
                <div key={i} style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  padding: '8px',
                  border: '1px solid #f1f5f9',
                  textAlign: 'center',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{ 
                    color: '#87BDFF', 
                    fontWeight: 900, 
                    fontSize: '10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {s.val}
                  </div>
                  <div style={{ 
                    fontSize: '7px', 
                    fontWeight: 900, 
                    color: '#cbd5e1',
                    textTransform: 'uppercase'
                  }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <p style={{ 
                fontSize: '7px', 
                fontWeight: 900, 
                color: '#cbd5e1', 
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                margin: '0 0 4px 0'
              }}>
                Generated by AI Cow-Horse Lab
              </p>
              <p style={{ 
                fontSize: '7px', 
                color: '#94a3b8', 
                margin: 0
              }}>
                {new Date().toLocaleString('zh-CN', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-[380px] flex flex-col items-center mb-4 md:mb-0">
        <motion.header 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 md:mb-6"
        >
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#FFC870] to-[#87BDFF]">
            牛马等级生成器
          </h1>
          <p className="text-blue-400 font-bold text-[8px] tracking-[0.3em] uppercase opacity-60">
            AI Quantified Labor Assessment
          </p>
        </motion.header>

        <div className="relative w-full aspect-[3/4.2] perspective-2000">
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.7, type: 'spring', stiffness: 100, damping: 20 }}
            className="w-full h-full relative"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front: Form */}
            <div 
              className="absolute inset-0 w-full h-full bg-white p-5 md:p-7 rounded-[2rem] shadow-2xl border border-white flex flex-col justify-between"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div>
                <h2 className="text-lg font-black mb-4 md:mb-5 flex items-center gap-2 text-slate-700">
                  <span className="w-6 h-6 rounded-lg bg-[#87BDFF] text-white text-xs flex items-center justify-center shadow-lg">01</span>
                  现状数据录入
                </h2>
                <div className="space-y-3 md:space-y-4">
                  {[
                    { label: '日均工时', name: 'dailyHours', suffix: 'H', min: 1, max: 24 },
                    { label: '月休天数', name: 'leaveDays', suffix: 'D', min: 0, max: 31 },
                    { label: '连续工作天数', name: 'continuousDays', suffix: 'D', min: 0, max: 365 },
                    { label: '单餐伙食标准', name: 'mealAllowance', suffix: '￥', min: 0, max: 999 },
                  ].map((item) => (
                    <div key={item.name}>
                      <label className="block text-[10px] font-black text-slate-400 mb-1 ml-1 tracking-widest uppercase">{item.label}</label>
                      <div className="relative">
                        <input
                          type="number"
                          name={item.name}
                          value={(profile as any)[item.name] === 0 ? '' : (profile as any)[item.name]}
                          onChange={handleInputChange}
                          className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-2.5 md:py-2 focus:bg-white focus:border-[#87BDFF] outline-none transition-all text-slate-700 font-black text-sm"
                          required
                        />
                        <span className="absolute right-4 top-2 text-slate-300 font-black italic text-xs">{item.suffix}</span>
                      </div>
                    </div>
                  ))}
                  <CustomSelect
                    label="月薪区间"
                    options={SALARY_RANGES}
                    value={profile.salaryRange}
                    onChange={handleSalaryChange}
                  />
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                className="w-full py-3.5 bg-gradient-to-br from-[#FFC870] to-[#FF9D00] text-white font-black text-base rounded-xl shadow-xl shadow-orange-100 mt-5 md:mt-4 tracking-widest"
              >
                生成鉴定结果
              </motion.button>
            </div>

            {/* Back: Result/Loading */}
            <div 
              ref={cardRef}
              className="absolute inset-0 w-full h-full bg-white p-5 md:p-6 rounded-[2rem] shadow-2xl border border-white flex flex-col overflow-hidden"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center">
                    <div className="scan-line top-0"></div>
                    <div className="relative w-24 h-24 mb-6">
                      <div className="absolute inset-0 border-4 border-[#87BDFF]/20 rounded-full" />
                      <div className="absolute inset-0 border-4 border-[#87BDFF] rounded-full border-t-transparent animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center text-2xl">🧬</div>
                    </div>
                    <p className="text-xs font-black text-slate-400 text-center animate-pulse px-4">
                      {LOADING_MESSAGES[loadingMsgIdx]}
                    </p>
                  </motion.div>
                ) : result ? (
                  <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className={`text-sm font-black tracking-tight ${result.data.colorClass}`}>
                        鉴定: {result.data.label}
                      </h3>
                      <div className={`px-2 py-0.5 rounded font-black text-[9px] ${
                        result.data.tier === CowHorseTier.GOLD ? 'gradient-gold' : 
                        result.data.tier === CowHorseTier.SILVER ? 'gradient-silver' : 'gradient-bronze'
                      } text-white`}>
                        {result.data.tier}
                      </div>
                    </div>

                    <div className="relative mb-3 w-full aspect-square overflow-hidden rounded-xl bg-slate-100">
                      <img src={result.image} alt="result" className="w-full h-full object-cover" />
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-4">
                      <p className="text-slate-500 font-bold italic text-[10px] text-center leading-relaxed">
                        “{result.data.description}”
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { val: `${profile.dailyHours}H`, label: '日均' },
                        { val: `${profile.continuousDays}D`, label: '连续' },
                        { val: profile.salaryRange, label: '口粮' }
                      ].map((s, i) => (
                        <div key={i} className="bg-white rounded-lg p-2 border border-slate-50 text-center shadow-sm">
                          <div className="text-[#87BDFF] font-black text-[10px] truncate">{s.val}</div>
                          <div className="text-[7px] font-black text-slate-300 uppercase">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    <div className={`text-center mb-3 ${isExporting ? 'block' : 'hidden'}`}>
                      <p className="text-[7px] font-black text-slate-300 tracking-tighter uppercase">Generated by AI Cow-Horse Lab</p>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0" data-export-ignore="true">
                      <div className="flex gap-2">
                        <button onClick={handleDownloadCard} className="flex-1 py-3 bg-slate-50 text-slate-400 font-black rounded-lg text-[10px] border border-slate-200">保存</button>
                        <button onClick={handleReset} className="flex-1 py-3 bg-[#87BDFF] text-white font-black rounded-lg text-[10px]">重新鉴定</button>
                      </div>
                      <button 
                        onClick={() => setShowFeedback(true)}
                        className="w-full py-2.5 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-600 font-black rounded-lg text-[9px] border border-orange-200 hover:from-orange-200 hover:to-amber-200 transition-all"
                      >
                        💬 我要吐槽
                      </button>
                    </div>
                  </motion.div>
                ) : error ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-red-400 text-xs font-bold mb-4">{error}</p>
                    <button onClick={handleReset} className="px-6 py-2 bg-slate-800 text-white rounded-lg text-xs font-black">返回</button>
                  </div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default App;
