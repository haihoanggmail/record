import React from 'react';
import { Monitor, AppWindow, Chrome, CheckCircle2 } from 'lucide-react';
import { ScreenSourceType } from '../types';

interface SourcePickerCardsProps {
  selectedType: ScreenSourceType;
  onChange: (type: ScreenSourceType) => void;
  disabled?: boolean;
}

export const SourcePickerCards: React.FC<SourcePickerCardsProps> = ({
  selectedType,
  onChange,
  disabled = false,
}) => {
  const options = [
    {
      id: 'screen' as ScreenSourceType,
      title: 'Toàn bộ màn hình',
      subtitle: 'Entire Screen',
      desc: 'Quay tất cả những gì hiển thị trên màn hình Desktop, đa cửa sổ',
      icon: Monitor,
      badge: 'Phổ biến',
    },
    {
      id: 'window' as ScreenSourceType,
      title: 'Cửa sổ 1 ứng dụng',
      subtitle: 'Application Window',
      desc: 'Chỉ quay đúng 1 phần mềm cụ thể (Word, Excel, Game, Zoom, VS Code...)',
      icon: AppWindow,
      badge: 'Riêng tư',
    },
    {
      id: 'tab' as ScreenSourceType,
      title: 'Một Tab trình duyệt',
      subtitle: 'Browser Tab',
      desc: 'Chỉ quay 1 tab web cố định (YouTube, Google Docs, web app...) & thu tiếng tab',
      icon: Chrome,
      badge: 'Thu âm mượt',
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <span>1. Chọn phạm vi quay màn hình:</span>
        </label>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
          (Trình duyệt sẽ mở hộp thoại chọn chuẩn xác)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {options.map((opt) => {
          const isSelected = selectedType === opt.id || selectedType === 'any';
          const Icon = opt.icon;

          return (
            <button
              key={opt.id}
              id={`source-option-${opt.id}`}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={`relative text-left p-3.5 rounded-xl border transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-500 ring-2 ring-sky-500/30 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        isSelected
                          ? 'bg-sky-200/70 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {opt.badge}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    )}
                  </div>
                </div>

                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-0.5">
                  {opt.title}
                </div>
                <div className="text-[11px] text-sky-600 dark:text-sky-400 font-mono mb-1">
                  {opt.subtitle}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {opt.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
