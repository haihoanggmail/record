import React, { useState } from 'react';
import { formatDuration } from '../lib/fileSaver';

interface TrimRangeSliderProps {
  /** Tổng thời lượng video (giây) */
  duration: number;
  /** Điểm bắt đầu vùng cắt (giây) */
  trimStart: number;
  /** Điểm kết thúc vùng cắt (giây) */
  trimEnd: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
  /** Khoảng cách tối thiểu giữa 2 đầu mút (giây), mặc định 0.5s */
  minGap?: number;
  step?: number;
}

/**
 * Thanh trượt cắt video kiểu "1 track - 2 đầu mút" (giống timeline editor):
 * kéo trực tiếp 2 nút tròn trên cùng 1 thanh, vùng đã chọn được tô màu xanh ở giữa.
 * Kỹ thuật: chồng 2 <input type="range"> trong suốt lên nhau, chỉ phần "thumb"
 * (nút tròn) mới nhận sự kiện chuột (pointer-events), phần track ẩn đi và thay
 * bằng 1 thanh track custom vẽ riêng bên dưới.
 */
export const TrimRangeSlider: React.FC<TrimRangeSliderProps> = ({
  duration,
  trimStart,
  trimEnd,
  onStartChange,
  onEndChange,
  minGap = 0.5,
  step = 0.1,
}) => {
  const [activeThumb, setActiveThumb] = useState<'start' | 'end' | null>(null);

  const safeDuration = duration > 0 ? duration : 1;
  const startPercent = Math.min(100, Math.max(0, (trimStart / safeDuration) * 100));
  const endPercent = Math.min(100, Math.max(0, (trimEnd / safeDuration) * 100));

  const handleStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseFloat(e.target.value);
    if (val > trimEnd - minGap) val = Math.max(0, trimEnd - minGap);
    onStartChange(val);
  };

  const handleEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseFloat(e.target.value);
    if (val < trimStart + minGap) val = Math.min(duration, trimStart + minGap);
    onEndChange(val);
  };

  return (
    <div className="space-y-1.5">
      <style>{`
        .trim-range-input {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          pointer-events: none;
          position: absolute;
          inset: 0;
          width: 100%;
          margin: 0;
        }
        .trim-range-input::-webkit-slider-runnable-track {
          background: transparent;
        }
        .trim-range-input::-moz-range-track {
          background: transparent;
          border: none;
        }
        .trim-range-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          pointer-events: auto;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: #0284c7;
          border: 3px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.35);
          cursor: grab;
        }
        .trim-range-input::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.1);
        }
        .trim-range-input::-moz-range-thumb {
          pointer-events: auto;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: #0284c7;
          border: 3px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.35);
          cursor: grab;
        }
      `}</style>

      <div className="relative h-6 flex items-center select-none touch-none">
        {/* Track nền (toàn bộ độ dài video) */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />

        {/* Vùng đã chọn để cắt, tô màu xanh */}
        <div
          className="absolute h-1.5 rounded-full bg-sky-500"
          style={{ left: `${startPercent}%`, width: `${Math.max(0, endPercent - startPercent)}%` }}
        />

        {/* Thumb điểm bắt đầu */}
        <input
          type="range"
          min={0}
          max={duration}
          step={step}
          value={trimStart}
          onChange={handleStart}
          onMouseDown={() => setActiveThumb('start')}
          onTouchStart={() => setActiveThumb('start')}
          className="trim-range-input"
          style={{ zIndex: activeThumb === 'start' ? 5 : 3 }}
          aria-label="Điểm bắt đầu cắt"
        />

        {/* Thumb điểm kết thúc */}
        <input
          type="range"
          min={0}
          max={duration}
          step={step}
          value={trimEnd}
          onChange={handleEnd}
          onMouseDown={() => setActiveThumb('end')}
          onTouchStart={() => setActiveThumb('end')}
          className="trim-range-input"
          style={{ zIndex: activeThumb === 'end' ? 5 : 4 }}
          aria-label="Điểm kết thúc cắt"
        />
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
        <span>{formatDuration(trimStart)}</span>
        <span className="text-sky-600 dark:text-sky-400 font-semibold">
          Thời lượng đã chọn: {formatDuration(trimEnd - trimStart)}
        </span>
        <span>{formatDuration(trimEnd)}</span>
      </div>
    </div>
  );
};
