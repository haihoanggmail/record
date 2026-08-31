import React, { useState, useRef } from 'react';
import {
  X,
  Film,
  Download,
  Trash2,
  Play,
  Edit2,
  Check,
  HardDrive,
  Calendar,
  Clock,
  FileVideo,
  Scissors,
  Loader2,
} from 'lucide-react';
import { StoredRecording } from '../types';
import { formatBytes, formatDuration, formatDateTime, saveVideoToFile } from '../lib/fileSaver';
import { trimVideoBlob } from '../lib/videoTrimmer';
import { TrimRangeSlider } from './TrimRangeSlider';

interface RecordingsLibraryModalProps {
  recordings: StoredRecording[];
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, newName: string) => Promise<void>;
  onClearAll: () => Promise<void>;
}

export const RecordingsLibraryModal: React.FC<RecordingsLibraryModalProps> = ({
  recordings,
  onClose,
  onDelete,
  onRename,
  onClearAll,
}) => {
  const [activePlayback, setActivePlayback] = useState<{ url: string; name: string; blob: Blob } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  // --- Trim video khi xem lại trong thư viện ---
  const playbackVideoRef = useRef<HTMLVideoElement>(null);
  const [isTrimMode, setIsTrimMode] = useState<boolean>(false);
  const [playbackDuration, setPlaybackDuration] = useState<number>(0);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [isTrimming, setIsTrimming] = useState<boolean>(false);
  const [trimProgress, setTrimProgress] = useState<number>(0);
  const [trimStatus, setTrimStatus] = useState<string | null>(null);

  const handleStartRename = (rec: StoredRecording) => {
    setEditingId(rec.id);
    setEditingName(rec.name);
  };

  const handleSaveRename = async (id: string) => {
    if (editingName.trim()) {
      await onRename(id, editingName.trim());
    }
    setEditingId(null);
  };

  const handlePlayVideo = (rec: StoredRecording) => {
    const url = URL.createObjectURL(rec.blob);
    setActivePlayback({ url, name: rec.name, blob: rec.blob });
    // Reset trạng thái cắt mỗi khi mở 1 video khác để tránh giữ vùng cắt của video trước
    setIsTrimMode(false);
    setPlaybackDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setTrimStatus(null);
  };

  const handleClosePlayback = () => {
    if (activePlayback) URL.revokeObjectURL(activePlayback.url);
    setActivePlayback(null);
    setIsTrimMode(false);
  };

  const handlePlaybackLoadedMetadata = () => {
    if (playbackVideoRef.current) {
      const dur = playbackVideoRef.current.duration;
      if (dur && isFinite(dur)) {
        setPlaybackDuration(dur);
        setTrimEnd(dur);
      }
    }
  };

  const handleDownloadToPc = async (rec: StoredRecording) => {
    try {
      await saveVideoToFile(rec.blob, rec.name, rec.blob.type.includes('mp4') ? 'mp4' : 'webm');
    } catch (err) {
      console.warn('Save failed:', err);
    }
  };

  // Cắt đoạn [trimStart, trimEnd] của video đang xem lại rồi tải về máy tính.
  const handleTrimAndDownload = async () => {
    if (!activePlayback) return;
    setIsTrimming(true);
    setTrimProgress(0);
    setTrimStatus('✂️ Đang cắt video, vui lòng đợi...');
    try {
      const trimmedBlob = await trimVideoBlob(
        activePlayback.blob,
        trimStart,
        trimEnd,
        activePlayback.blob.type,
        (p) => {
          setTrimProgress(p);
          setTrimStatus(`✂️ Đang cắt video... ${p}%`);
        }
      );
      await saveVideoToFile(
        trimmedBlob,
        `${activePlayback.name}_cat`,
        trimmedBlob.type.includes('mp4') ? 'mp4' : 'webm'
      );
      setTrimStatus('✅ Đã cắt và lưu đoạn video về máy tính!');
      setTimeout(() => setTrimStatus(null), 4000);
    } catch (err: any) {
      console.error('Trim from library failed:', err);
      setTrimStatus(`❌ Lỗi khi cắt video: ${err?.message || 'Không xác định'}`);
      setTimeout(() => setTrimStatus(null), 4000);
    } finally {
      setIsTrimming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Thư viện bản ghi</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {recordings.length} video đã lưu trữ trên trình duyệt của bạn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {recordings.length > 0 && (
              <button
                onClick={async () => {
                  if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách bản ghi đã lưu?')) {
                    await onClearAll();
                  }
                }}
                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 transition-colors cursor-pointer"
              >
                Xóa tất cả
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player Modal Overlay if active */}
        {activePlayback && (
          <div className="p-4 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 relative space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                Đang xem: {activePlayback.name}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsTrimMode((v) => !v)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    isTrimMode
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Cắt video</span>
                </button>
                <button
                  onClick={handleClosePlayback}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 cursor-pointer"
                >
                  Đóng phát
                </button>
              </div>
            </div>

            <video
              ref={playbackVideoRef}
              src={activePlayback.url}
              controls
              autoPlay
              onLoadedMetadata={handlePlaybackLoadedMetadata}
              className="w-full max-h-[360px] bg-black rounded-lg object-contain"
            />

            {/* Trimmer UI */}
            {isTrimMode && playbackDuration > 0 && (
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 animate-in fade-in">
                <span className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Scissors className="w-3.5 h-3.5 text-sky-600" />
                  Kéo 2 đầu để chọn đoạn cần cắt:
                </span>
                <TrimRangeSlider
                  duration={playbackDuration}
                  trimStart={trimStart}
                  trimEnd={trimEnd}
                  onStartChange={(val) => {
                    setTrimStart(val);
                    if (playbackVideoRef.current) playbackVideoRef.current.currentTime = val;
                  }}
                  onEndChange={(val) => {
                    setTrimEnd(val);
                    if (playbackVideoRef.current) playbackVideoRef.current.currentTime = val;
                  }}
                />

                <button
                  onClick={handleTrimAndDownload}
                  disabled={isTrimming}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {isTrimming ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Scissors className="w-3.5 h-3.5" />
                  )}
                  <span>{isTrimming ? `Đang cắt... ${trimProgress}%` : 'Cắt & Tải đoạn này về máy'}</span>
                </button>

                {trimStatus && (
                  <div className="text-[11px] text-center font-semibold text-sky-700 dark:text-sky-300">
                    {trimStatus}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {recordings.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 flex items-center justify-center mx-auto">
                <FileVideo className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Chưa có bản ghi nào được lưu</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Sau khi quay video, bạn có thể bấm "Lưu vào thư viện web" để lưu trữ lại và tải về máy tính bất cứ lúc nào.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recordings.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all group"
                >
                  <div className="space-y-2">
                    {/* Title and edit */}
                    <div className="flex items-start justify-between gap-2">
                      {editingId === rec.id ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="w-full text-xs bg-white dark:bg-slate-950 border border-sky-500 text-slate-900 dark:text-white rounded px-2 py-1 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRename(rec.id)}
                            className="p-1 rounded bg-sky-600 text-white cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-sky-600 transition-colors">
                            {rec.name}
                          </h4>
                          <button
                            onClick={() => handleStartRename(rec)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                            title="Đổi tên"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                        {formatBytes(rec.size)}
                      </span>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(rec.duration)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDateTime(rec.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handlePlayVideo(rec)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Xem lại</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDownloadToPc(rec)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                        title="Tải về máy tính"
                      >
                        <HardDrive className="w-3.5 h-3.5" />
                        <span>Lưu vào máy</span>
                      </button>

                      <button
                        onClick={() => onDelete(rec.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                        title="Xóa bản ghi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
