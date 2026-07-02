
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  url: string;
  onClose: () => void;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ url, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>(url);
  const [inputIp, setInputIp] = useState<string>('');
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');

  useEffect(() => {
    setCustomUrl(url);
    const port = window.location.port || '3000';
    if (isLocalhost && inputIp) {
      setCustomUrl(`http://${inputIp}:${port}`);
    }
  }, [url, inputIp, isLocalhost]);

  useEffect(() => {
    QRCode.toDataURL(customUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [customUrl]);

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
            <h3 className="text-lg font-black text-slate-700">扫描二维码预览</h3>
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
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-full max-w-[300px] rounded-xl mb-4" />
            ) : (
              <div className="w-[300px] h-[300px] bg-slate-100 rounded-xl flex items-center justify-center mb-4">
                <div className="text-slate-400 text-sm">生成中...</div>
              </div>
            )}
            
            {isLocalhost && (
              <div className="w-full mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-[10px] text-amber-700 font-bold mb-2">提示：检测到 localhost</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputIp}
                    onChange={(e) => setInputIp(e.target.value)}
                    placeholder="输入局域网IP (如: 192.168.1.100)"
                    className="flex-1 px-3 py-2 text-xs border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <p className="text-[9px] text-amber-600 mt-2">
                  在命令行运行: ipconfig 查看 IPv4 地址
                </p>
              </div>
            )}
            
            <p className="text-xs text-slate-500 text-center break-all font-mono mb-2">
              {customUrl}
            </p>
            <p className="text-[10px] text-slate-400 text-center">
              使用手机扫描二维码即可在移动端预览
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QRCodeDisplay;
