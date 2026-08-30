import React from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { AudioConfig, MediaDeviceInfoOption } from '../types';

interface AudioSettingsBarProps {
  config: AudioConfig;
  onChange: (config: AudioConfig) => void;
  microphones: MediaDeviceInfoOption[];
  liveAudioLevel: number; // 0 - 100
  disabled?: boolean;
}

export const AudioSettingsBar: React.FC<AudioSettingsBarProps> = ({
  config,
  onChange,
  microphones,
  liveAudioLevel,
  disabled = false,
}) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <span>2. Âm thanh (Microphone & Hệ thống):</span>
        </label>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Tự động trộn đồng bộ
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* Microphone Toggle & Config */}
        <div
          className={`p-3 rounded-lg border transition-all ${
            config.micEnabled
              ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="checkbox-mic-enabled"
                type="checkbox"
                checked={config.micEnabled}
                disabled={disabled}
                onChange={(e) => onChange({ ...config, micEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <div className="flex items-center gap-1.5">
                {config.micEnabled ? (
                  <Mic className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                ) : (
                  <MicOff className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Microphone (Giọng nói)
                </span>
              </div>
            </label>

            {/* Audio VU Meter */}
            {config.micEnabled && (
              <div className="flex items-center gap-1.5" title={`Âm lượng mic: ${liveAudioLevel}%`}>
                <div className="w-14 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${
                      liveAudioLevel > 75
                        ? 'bg-rose-500'
                        : liveAudioLevel > 35
                        ? 'bg-sky-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, liveAudioLevel)}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-400 w-6 text-right">
                  {liveAudioLevel}%
                </span>
              </div>
            )}
          </div>

          {config.micEnabled && (
            <div className="space-y-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              {/* Mic device select */}
              {microphones.length > 0 && (
                <div className="flex flex-col gap-1">
                  <select
                    id="select-mic-device"
                    value={config.micDeviceId}
                    disabled={disabled}
                    onChange={(e) => onChange({ ...config, micDeviceId: e.target.value })}
                    className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="">Micro mặc định của máy tính</option>
                    {microphones.map((mic) => (
                      <option key={mic.deviceId} value={mic.deviceId}>
                        {mic.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Noise suppression & Echo cancellation */}
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.noiseSuppression}
                    disabled={disabled}
                    onChange={(e) => onChange({ ...config, noiseSuppression: e.target.checked })}
                    className="w-3.5 h-3.5 text-sky-600 rounded"
                  />
                  <span>Lọc tiếng ồn</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.echoCancellation}
                    disabled={disabled}
                    onChange={(e) => onChange({ ...config, echoCancellation: e.target.checked })}
                    className="w-3.5 h-3.5 text-sky-600 rounded"
                  />
                  <span>Khử tiếng vang</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* System Audio Toggle */}
        <div
          className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
            config.systemAudioEnabled
              ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="checkbox-system-audio-enabled"
                type="checkbox"
                checked={config.systemAudioEnabled}
                disabled={disabled}
                onChange={(e) => onChange({ ...config, systemAudioEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Âm thanh hệ thống (Máy tính)
                </span>
              </div>
            </label>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                config.systemAudioEnabled
                  ? 'bg-sky-200/70 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {config.systemAudioEnabled ? 'Đang bật' : 'Tắt'}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Thu trọn âm thanh phát ra từ máy tính (nhạc nền, video, âm thanh game, Zoom meeting).
          </p>
        </div>
      </div>
    </div>
  );
};
