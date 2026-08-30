import React from 'react';
import { Camera, CameraOff, Circle, Square, FlipHorizontal } from 'lucide-react';
import { WebcamConfig, MediaDeviceInfoOption, WebcamPosition, WebcamShape, WebcamSize } from '../types';

interface WebcamSettingsDrawerProps {
  config: WebcamConfig;
  onChange: (config: WebcamConfig) => void;
  cameras: MediaDeviceInfoOption[];
  disabled?: boolean;
}

export const WebcamSettingsDrawer: React.FC<WebcamSettingsDrawerProps> = ({
  config,
  onChange,
  cameras,
  disabled = false,
}) => {
  const positions: { id: WebcamPosition; label: string }[] = [
    { id: 'bottom-right', label: 'Dưới - Phải' },
    { id: 'bottom-left', label: 'Dưới - Trái' },
    { id: 'top-right', label: 'Trên - Phải' },
    { id: 'top-left', label: 'Trên - Trái' },
  ];

  const shapes: { id: WebcamShape; label: string }[] = [
    { id: 'circle', label: 'Tròn' },
    { id: 'rounded', label: 'Bo góc' },
    { id: 'square', label: 'Vuông' },
  ];

  const sizes: { id: WebcamSize; label: string }[] = [
    { id: 'small', label: 'Nhỏ' },
    { id: 'medium', label: 'Vừa' },
    { id: 'large', label: 'Lớn' },
  ];

  return (
    <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            id="checkbox-webcam-enabled"
            type="checkbox"
            checked={config.enabled}
            disabled={disabled}
            onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
            className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
          />
          <div className="flex items-center gap-1.5">
            {config.enabled ? (
              <Camera className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            ) : (
              <CameraOff className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              3. Webcam / Facecam (Hình trong hình PiP)
            </span>
          </div>
        </label>

        {config.enabled && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-200/70 text-sky-800 dark:bg-sky-900 dark:text-sky-200 font-semibold">
            Đang bật
          </span>
        )}
      </div>

      {config.enabled && (
        <div className="space-y-3 pt-2.5 border-t border-slate-200 dark:border-slate-800">
          {/* Camera device select */}
          {cameras.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Chọn thiết bị Camera:</span>
              <select
                id="select-camera-device"
                value={config.deviceId}
                disabled={disabled}
                onChange={(e) => onChange({ ...config, deviceId: e.target.value })}
                className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="">Camera mặc định</option>
                {cameras.map((cam) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Position, Shape, Size Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Position */}
            <div>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium block mb-1">Vị trí góc:</span>
              <div className="grid grid-cols-2 gap-1">
                {positions.map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ ...config, position: pos.id })}
                    className={`px-2 py-1 text-[11px] rounded border text-center transition-all cursor-pointer ${
                      config.position === pos.id
                        ? 'bg-sky-600 text-white border-sky-600 font-semibold shadow-xs'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-sky-300'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shape */}
            <div>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium block mb-1">Khung hình:</span>
              <div className="grid grid-cols-3 gap-1">
                {shapes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ ...config, shape: s.id })}
                    className={`px-1.5 py-1 text-[11px] rounded border text-center transition-all cursor-pointer ${
                      config.shape === s.id
                        ? 'bg-sky-600 text-white border-sky-600 font-semibold shadow-xs'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-sky-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size & Mirror */}
            <div>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium block mb-1">Kích cỡ & Hiệu ứng:</span>
              <div className="flex gap-1 mb-1.5">
                {sizes.map((sz) => (
                  <button
                    key={sz.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ ...config, size: sz.id })}
                    className={`flex-1 py-1 text-[11px] rounded border text-center transition-all cursor-pointer ${
                      config.size === sz.id
                        ? 'bg-sky-600 text-white border-sky-600 font-semibold shadow-xs'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-sky-300'
                    }`}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer pt-0.5">
                <input
                  type="checkbox"
                  checked={config.mirrored}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...config, mirrored: e.target.checked })}
                  className="w-3.5 h-3.5 rounded text-sky-600"
                />
                <FlipHorizontal className="w-3 h-3 text-sky-600" />
                <span>Lật gương camera (Mirror)</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
