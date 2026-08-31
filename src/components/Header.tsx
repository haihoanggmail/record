import React, { useState, useEffect } from 'react';
import {
  Video,
  Film,
  HelpCircle,
  Sun,
  Moon,
  FolderDown,
  Phone,
  CheckCircle2,
  AlertCircle,
  MessageSquareWarning,
} from 'lucide-react';
import { RecordingStatus, AppTheme, DefaultDirectoryInfo } from '../types';
import { getAskBeforeSave, setAskBeforeSave } from '../lib/appSettings';

interface HeaderProps {
  status: RecordingStatus;
  savedCount: number;
  theme: AppTheme;
  defaultDirectory: DefaultDirectoryInfo;
  onToggleTheme: () => void;
  onOpenLibrary: () => void;
  onOpenGuide: () => void;
  onSelectDefaultDirectory: () => void;
  onClearDefaultDirectory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status = 'idle',
  savedCount = 0,
  theme = 'light',
  defaultDirectory = { handle: null, name: null },
  onToggleTheme,
  onOpenLibrary,
  onOpenGuide,
  onSelectDefaultDirectory,
  onClearDefaultDirectory,
}) => {
  const isLight = theme === 'light';

  const [askBeforeSave, setAskBeforeSaveState] = useState<boolean>(false);

  useEffect(() => {
    setAskBeforeSaveState(getAskBeforeSave());
  }, []);

  const handleToggleAskBeforeSave = () => {
    const next = !askBeforeSave;
    setAskBeforeSaveState(next);
    setAskBeforeSave(next);
  };

  return (
    <header
      className={`border-b sticky top-0 z-40 transition-colors duration-200 ${
        isLight
          ? 'bg-white/95 border-slate-200 text-slate-800 backdrop-blur-md shadow-xs'
          : 'bg-slate-950/90 border-slate-800/80 text-slate-100 backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-600/30 text-white font-bold shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                <span>Record</span>
              </h1>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isLight
                    ? 'bg-sky-100 text-sky-700 border border-sky-200'
                    : 'bg-sky-950/80 text-sky-300 border border-sky-800'
                }`}
              >
                hachihi.vn
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-2">
              <span>Quay & Tự động lưu máy tính</span>
              <span>•</span>
              <a
                href="tel:0918001944"
                className="text-sky-600 dark:text-sky-400 hover:underline font-medium inline-flex items-center gap-1"
                title="Gọi hỗ trợ kỹ thuật Hải Hoàng"
              >
                <Phone className="w-3 h-3" />
                <span>Hỗ trợ: Hải Hoàng 09-1800-1944</span>
              </a>
            </div>
          </div>
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Status Indicator */}
          {status === 'recording' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-500 text-xs font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="hidden sm:inline">ĐANG QUAY</span>
            </div>
          )}
          {status === 'paused' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="hidden sm:inline">TẠM DỪNG</span>
            </div>
          )}

          {/* Default Auto-save Directory Selector */}
          <div className="relative">
            {defaultDirectory?.name ? (
              <div className="flex items-center">
                <button
                  id="btn-active-directory"
                  onClick={onSelectDefaultDirectory}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-l-lg text-xs font-medium border transition-all cursor-pointer ${
                    isLight
                      ? 'bg-sky-50 hover:bg-sky-100/80 text-sky-800 border-sky-200'
                      : 'bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 border-sky-800/80'
                  }`}
                  title={`Thư mục tự lưu: ${defaultDirectory.name}. Bấm để đổi thư mục khác.`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span className="max-w-[90px] sm:max-w-[140px] truncate font-semibold">
                    📁 {defaultDirectory.name}
                  </span>
                </button>
                <button
                  id="btn-clear-directory"
                  onClick={onClearDefaultDirectory}
                  className={`px-1.5 py-1.5 rounded-r-lg text-xs border-y border-r transition-all cursor-pointer ${
                    isLight
                      ? 'bg-sky-50 hover:bg-red-50 text-slate-400 hover:text-red-500 border-sky-200'
                      : 'bg-sky-950/40 hover:bg-red-950/50 text-slate-400 hover:text-red-400 border-sky-800/80'
                  }`}
                  title="Hủy thư mục tự lưu mặc định"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                id="btn-choose-directory"
                onClick={onSelectDefaultDirectory}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border-slate-200 hover:border-sky-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                }`}
                title="Chọn một thư mục trên máy tính để tự động lưu video khi dừng quay"
              >
                <FolderDown className="w-3.5 h-3.5 text-sky-500" />
                <span className="hidden md:inline">Thư mục tự lưu:</span>
                <span className="font-semibold text-sky-600 dark:text-sky-400">Chọn thư mục</span>
              </button>
            )}
          </div>

          {/* Ask-before-save toggle - đặt cạnh thư mục tự lưu cho liền mạch về mặt chức năng */}
          <label
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all select-none ${
              isLight
                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="Khi bật: mỗi lần bấm Lưu sẽ luôn mở hộp thoại để bạn chọn lại nơi lưu, tên tệp (bỏ qua thư mục mặc định)"
          >
            <input
              id="checkbox-ask-before-save"
              type="checkbox"
              checked={askBeforeSave}
              onChange={handleToggleAskBeforeSave}
              className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
            <MessageSquareWarning className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span className="whitespace-nowrap">Hỏi lại nơi lưu</span>
          </label>

          {/* Guide Modal Trigger */}
          <button
            id="btn-open-guide"
            onClick={onOpenGuide}
            className={`p-2 rounded-lg text-xs font-medium border transition-colors ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="Hướng dẫn & Hotline hỗ trợ 09-1800-1944"
          >
            <HelpCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>

          {/* Library Button */}
          <button
            id="btn-open-library"
            onClick={onOpenLibrary}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isLight
                ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
            }`}
            title="Xem danh sách các bản ghi đã lưu"
          >
            <Film className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden sm:inline">Bản ghi</span>
            {savedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-600 text-white font-bold">
                {savedCount}
              </span>
            )}
          </button>

          {/* Dark / Light Mode Switch (Top Right) */}
          <button
            id="btn-toggle-darkmode"
            onClick={onToggleTheme}
            className={`p-2 rounded-lg border transition-all cursor-pointer ${
              isLight
                ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200 shadow-xs'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-slate-800'
            }`}
            title={isLight ? 'Chuyển sang Chế độ Tối (Dark Mode)' : 'Chuyển sang Chế độ Sáng (Hachihi Xanh Dương - Trắng)'}
            aria-label="Toggle Dark / Light Theme"
          >
            {isLight ? (
              <Moon className="w-4 h-4 text-sky-700 hover:rotate-12 transition-transform" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
