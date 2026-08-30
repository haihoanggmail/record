import React from 'react';
import { Settings, Timer, Film, Gauge, FileVideo } from 'lucide-react';
import { VideoConfig, VideoResolution, VideoFrameRate, VideoOutputFormat } from '../types';
import { getSupportedOutputFormats } from '../lib/streamComposer';

interface VideoSettingsBarProps {
  config: VideoConfig;
  onChange: (config: VideoConfig) => void;
  disabled?: boolean;
}

export const VideoSettingsBar: React.FC<VideoSettingsBarProps> = ({
  config,
  onChange,
  disabled = false,
}) => {
  const resolutions: { id: VideoResolution; label: string }[] = [
    { id: '1080p', label: '1080p Full HD (Chuẩn)' },
    { id: '720p', label: '720p HD (File nhẹ)' },
    { id: 'original', label: 'Màn hình gốc (Native)' },
  ];

  const frameRates: { id: VideoFrameRate; label: string }[] = [
    { id: 60, label: '60 FPS (Mượt mà cao)' },
    { id: 30, label: '30 FPS (Tiêu chuẩn)' },
  ];

  const countdowns = [
    { seconds: 0, label: 'Bắt đầu ngay (0s)' },
    { seconds: 3, label: 'Đếm ngược 3 giây' },
    { seconds: 5, label: 'Đếm ngược 5 giây' },
  ];

  const outputFormats = getSupportedOutputFormats();

  return (
    <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span>4. Chất lượng & Định dạng file:</span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
        {/* Output Format */}
        <div className="space-y-1">
          <label className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
            <FileVideo className="w-3 h-3 text-sky-600 dark:text-sky-400" />
            <span>Định dạng file:</span>
          </label>
          <select
            id="select-output-format"
            value={config.outputFormat}
            disabled={disabled}
            onChange={(e) => onChange({ ...config, outputFormat: e.target.value as VideoOutputFormat })}
            className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {outputFormats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Resolution */}
        <div className="space-y-1">
          <label className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
            <Film className="w-3 h-3 text-sky-600 dark:text-sky-400" />
            <span>Độ phân giải:</span>
          </label>
          <select
            id="select-resolution"
            value={config.resolution}
            disabled={disabled}
            onChange={(e) => onChange({ ...config, resolution: e.target.value as VideoResolution })}
            className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {resolutions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Frame Rate */}
        <div className="space-y-1">
          <label className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
            <Gauge className="w-3 h-3 text-sky-600 dark:text-sky-400" />
            <span>Tốc độ khung hình:</span>
          </label>
          <select
            id="select-framerate"
            value={config.frameRate}
            disabled={disabled}
            onChange={(e) => onChange({ ...config, frameRate: parseInt(e.target.value) as VideoFrameRate })}
            className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {frameRates.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Countdown */}
        <div className="space-y-1">
          <label className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
            <Timer className="w-3 h-3 text-sky-600 dark:text-sky-400" />
            <span>Thời gian đếm ngược:</span>
          </label>
          <select
            id="select-countdown"
            value={config.countdownSeconds}
            disabled={disabled}
            onChange={(e) => onChange({ ...config, countdownSeconds: parseInt(e.target.value) })}
            className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {countdowns.map((c) => (
              <option key={c.seconds} value={c.seconds}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
