import React from 'react';
import { X, Monitor, AppWindow, Chrome, HardDrive, FolderOpen, ShieldCheck, HelpCircle } from 'lucide-react';

interface GuideModalProps {
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Hướng dẫn chọn chế độ & Lưu video</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Cách chọn quay toàn màn hình hoặc chỉ 1 phần mềm và tự động lưu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-sm text-slate-700 dark:text-slate-300">
          {/* Step 1 */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
              <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-xs flex items-center justify-center font-mono font-bold">
                1
              </span>
              <span>Chọn nguồn ghi hình trên giao diện:</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="flex items-center gap-1.5 font-bold text-xs text-sky-600 dark:text-sky-400 mb-1">
                  <Monitor className="w-3.5 h-3.5" />
                  Toàn màn hình
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Quay tất cả thao tác trên màn hình máy tính, phù hợp làm bài giảng hướng dẫn.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="flex items-center gap-1.5 font-bold text-xs text-sky-600 dark:text-sky-400 mb-1">
                  <AppWindow className="w-3.5 h-3.5" />
                  Cửa sổ ứng dụng
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Chỉ quay riêng phần mềm bạn chọn (Excel, Word, Game, Zoom...). Không lộ app khác.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="flex items-center gap-1.5 font-bold text-xs text-sky-600 dark:text-sky-400 mb-1">
                  <Chrome className="w-3.5 h-3.5" />
                  Tab trình duyệt
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Chỉ quay 1 tab trang web đang mở và thu âm thanh trực tiếp từ tab đó.
                </p>
              </div>
            </div>
          </div>

          {/* Infinity Mirror explanation */}
          <div className="p-3.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-sky-800 dark:text-sky-300">
              <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>Tại sao có hiện tượng lặp vô tận (Gương soi vô tận) khi quay Toàn màn hình?</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Khi bạn chọn quay <strong>Toàn màn hình</strong> hoặc <strong>Cửa sổ trình duyệt</strong> mà vẫn giữ màn hình ở trang web này, màn hình sẽ quay lại chính nó tạo thành hình ảnh lặp lồng nhau vô tận (như 2 tấm gương đặt đối diện nhau).
            </p>
            <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-sky-200/60 dark:border-sky-800/40 text-[11px] space-y-1">
              <p className="font-semibold text-slate-900 dark:text-slate-100">💡 Cách ứng dụng xử lý và thao tác chuẩn:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                <li>Ứng dụng đã <strong>tự động ẩn khung xem trước khi đang quay</strong> để triệt tiêu hiệu ứng lặp gương.</li>
                <li>Sau khi bấm <strong>"Bắt đầu quay ngay"</strong>, bạn chỉ cần mở phần mềm cần quay (Excel, PowerPoint, Game, Bài giảng...) hoặc thu nhỏ trình duyệt này. Video ghi lại các phần mềm đó sẽ <strong>hoàn toàn chuẩn nét, mượt mà và không hề bị lặp</strong>!</li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
              <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-xs flex items-center justify-center font-mono font-bold">
                2
              </span>
              <span>Xác nhận chia sẻ trên trình duyệt:</span>
            </h3>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <p>
                Khi bấm <strong>"Bắt đầu quay ngay"</strong>, cửa sổ hệ thống sẽ hiện ra:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-1">
                <li>
                  Chọn tab <strong>"Entire Screen" (Toàn màn hình)</strong> hoặc <strong>"Window" (Cửa sổ)</strong>.
                </li>
                <li>
                  Đánh dấu vào ô <strong className="text-sky-600 dark:text-sky-400">"Share system audio"</strong> nếu cần thu cả âm thanh máy tính/nhạc nền.
                </li>
              </ul>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
              <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-xs flex items-center justify-center font-mono font-bold">
                3
              </span>
              <span>Lưu tệp & Tự động lưu thư mục mặc định:</span>
            </h3>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold">
                <FolderOpen className="w-4 h-4" />
                <span>Tự động lưu vào thư mục máy tính</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Bạn có thể bấm vào nút <strong>"Thư mục lưu mặc định"</strong> trên thanh công cụ để chọn trước 1 thư mục trên ổ cứng. Mỗi khi hoàn tất bản ghi hoặc tắt app, video sẽ tự động được lưu thẳng vào thư mục đó mà không cần xác nhận nhiều lần.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Đã hiểu, sẵn sàng quay
          </button>
        </div>
      </div>
    </div>
  );
};
