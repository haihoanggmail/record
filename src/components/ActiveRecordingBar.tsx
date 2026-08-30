import React from 'react';
import { Play, Pause, Square, Camera, Mic, MicOff } from 'lucide-react';
import { formatDuration } from '../lib/fileSaver';

interface ActiveRecordingBarProps {
  isPaused: boolean;
  elapsedSeconds: number;
  sourceLabel?: string;
  isMicMuted: boolean;
  onToggleMicMute: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onTakeScreenshot: () => void;
}

export const ActiveRecordingBar: React.FC<ActiveRecordingBarProps> = ({
  isPaused,
  elapsedSeconds,
  sourceLabel,
  isMicMuted,
  onToggleMicMute,
  onPause,
  onResume,
  onStop,
  onTakeScreenshot,
}) => {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white/95 dark:bg-slate-900/95 border-2 border-sky-500 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 shadow-2xl shadow-sky-950/20 dark:shadow-black/60 flex items-center justify-between gap-2.5 text-slate-800 dark:text-white">
        {/* REC Status & Timer */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`w-3.5 h-3.5 rounded-full ${
                isPaused ? 'bg-amber-400' : 'bg-red-500 rec-pulse'
              }`}
            />
            <span className="font-mono font-bold text-lg text-slate-900 dark:text-white tracking-wider">
              {formatDuration(elapsedSeconds)}
            </span>
          </div>

          {sourceLabel && (
            <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 max-w-[120px] truncate font-medium">
              {sourceLabel}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mute/Unmute Mic shortcut */}
          <button
            id="btn-active-mic-toggle"
            onClick={onToggleMicMute}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isMicMuted
                ? 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-sky-600'
            }`}
            title={isMicMuted ? 'Bật lại Micro' : 'Tắt tiếng Micro'}
          >
            {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Quick Screenshot */}
          <button
            id="btn-active-screenshot"
            onClick={onTakeScreenshot}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
            title="Chụp ảnh màn hình ngay"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Pause / Resume */}
          {isPaused ? (
            <button
              id="btn-active-resume"
              onClick={onResume}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Tiếp tục</span>
            </button>
          ) : (
            <button
              id="btn-active-pause"
              onClick={onPause}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-all cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Tạm dừng</span>
            </button>
          )}

          {/* Stop & Save */}
          <button
            id="btn-active-stop"
            onClick={onStop}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-all shadow-md shadow-sky-600/30 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>Dừng & Lưu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
