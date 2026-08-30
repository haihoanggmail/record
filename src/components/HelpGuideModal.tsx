import React from 'react';
import {
  X,
  FolderCheck,
  ShieldCheck,
  Volume2,
  HardDrive,
  CheckCircle2,
  ExternalLink,
  Laptop,
} from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150 relative overflow-hidden backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.08] border border-white/15 backdrop-blur-md flex items-center justify-center text-indigo-300 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Hướng Dẫn & Tính Năng</h3>
              <p className="text-xs text-slate-300/80">Bảo mật tuyệt đối và lưu trữ video trực tiếp</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl glass-pill text-slate-300 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content sections */}
        <div className="space-y-4 text-xs sm:text-sm text-slate-200">
          {/* Section 1: Directory Picker Feature */}
          <div className="p-4 rounded-2xl glass-card-sub space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2 text-sm">
              <FolderCheck className="w-4 h-4 text-emerald-400" />
              Cách tùy chọn thư mục lưu video
            </h4>
            <p className="text-slate-300/80 leading-relaxed">
              Ứng dụng tích hợp công nghệ <strong>File System Access API</strong> tiên tiến. Khi bạn bấm nút{' '}
              <span className="text-indigo-300 font-semibold">&quot;Chọn thư mục lưu&quot;</span>, trình duyệt sẽ mở hộp thoại hệ thống để bạn chọn bất kỳ thư mục nào trên ổ đĩa (D:\, C:\, Videos, v.v.). Sau đó, video có thể được ghi trực tiếp vào thư mục đó mà không cần tải qua từng tệp rời rạc.
            </p>
          </div>

          {/* Section 2: Audio Guide */}
          <div className="p-4 rounded-2xl glass-card-sub space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2 text-sm">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              Thu âm thanh máy tính & Micro
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300/80">
              <li>
                <strong>Âm thanh hệ thống:</strong> Khi hộp thoại chia sẻ màn hình hiện lên, hãy nhớ tích vào ô{' '}
                <em className="text-slate-200">&quot;Chia sẻ âm thanh hệ thống&quot;</em> hoặc <em className="text-slate-200">&quot;Share tab audio&quot;</em>.
              </li>
              <li>
                <strong>Microphone:</strong> Có thể bật đồng thời để vừa ghi âm tiếng trong máy vừa thuyết minh giọng nói của bạn một cách mượt mà.
              </li>
            </ul>
          </div>

          {/* Section 3: Privacy and Performance */}
          <div className="p-4 rounded-2xl glass-card-sub space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2 text-sm">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Bảo mật 100% Cục Bộ (Local Privacy)
            </h4>
            <p className="text-slate-300/80 leading-relaxed">
              Toàn bộ quá trình quay, lồng ghép webcam, mã hóa video và lưu tệp đều diễn ra trực tiếp trong phần cứng và trình duyệt của bạn. Không có bất kỳ dữ liệu hình ảnh hoặc âm thanh nào bị gửi lên internet hoặc máy chủ.
            </p>
          </div>
        </div>

        {/* Footer Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/25 active:scale-95"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
