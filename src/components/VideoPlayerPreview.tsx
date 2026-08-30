import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  HardDrive,
  Camera,
  RotateCcw,
  Scissors,
  CheckCircle2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  BookmarkPlus,
  FolderCheck,
  FileAudio,
  Loader2,
} from 'lucide-react';
import {
  formatBytes,
  formatDuration,
  saveVideoToFile,
  captureFrameFromVideo,
  downloadImage,
  downloadBlob,
  extractAudioAsWav,
  saveFileToDirectoryHandle,
} from '../lib/fileSaver';
import { getDefaultDirectoryHandle } from '../lib/indexedDb';

interface VideoPlayerPreviewProps {
  blob: Blob;
  duration: number; // in seconds
  sourceLabel?: string;
  onRecordAgain: () => void;
  onSaveToLibrary: (name: string) => Promise<void>;
}

export const VideoPlayerPreview: React.FC<VideoPlayerPreviewProps> = ({
  blob,
  duration,
  sourceLabel,
  onRecordAgain,
  onSaveToLibrary,
}) => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `Record_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  });

  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [isSavedInLibrary, setIsSavedInLibrary] = useState<boolean>(false);
  const [snapshotFeedback, setSnapshotFeedback] = useState<boolean>(false);
  const [isExtractingAudio, setIsExtractingAudio] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(duration || 0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Trimming State
  const [isTrimMode, setIsTrimMode] = useState<boolean>(false);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(duration || 10);
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);
  const trimTrackRef = useRef<HTMLDivElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setVideoUrl(url);

    // Auto-save check: if user configured a default directory, attempt saving automatically!
    const tryAutoSave = async () => {
      try {
        const dirInfo = await getDefaultDirectoryHandle();
        if (dirInfo && dirInfo.handle) {
          const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
          const targetName = `${fileName}.${extension}`;
          const success = await saveFileToDirectoryHandle(dirInfo.handle, blob, targetName);
          if (success) {
            setSavingStatus(`📁 Đã tự động lưu vào thư mục: ${dirInfo.name || 'mặc định'}/${targetName}`);
            setTimeout(() => setSavingStatus(null), 6000);
          }
        }
      } catch (err) {
        console.log('Auto save note:', err);
      }
    };

    tryAutoSave();

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (dur && isFinite(dur)) {
        setVideoDuration(dur);
        setTrimEnd(dur);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (isTrimMode && videoRef.current.currentTime >= trimEnd) {
        videoRef.current.pause();
        videoRef.current.currentTime = trimStart;
        setIsPlaying(false);
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (isTrimMode && (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd)) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // --- Dual-handle trim slider (fully custom, pointer-based) ---
  // We deliberately don't rely on native <input type="range"> here: browsers
  // (and some in-app webviews) paint their own "filled" track behind the
  // thumb that can't be reliably hidden with CSS, which made two overlapping
  // sliders look like separate, confusing bars. Drawing the track and the
  // two round handles ourselves gives full control over the look everywhere.
  const timeFromClientX = (clientX: number) => {
    const track = trimTrackRef.current;
    if (!track || !videoDuration) return 0;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * videoDuration;
  };

  useEffect(() => {
    if (!draggingHandle) return;

    const handlePointerMove = (e: PointerEvent) => {
      const time = timeFromClientX(e.clientX);
      if (draggingHandle === 'start') {
        const val = Math.max(0, Math.min(time, trimEnd - 0.2));
        setTrimStart(val);
        if (videoRef.current) videoRef.current.currentTime = val;
      } else {
        const val = Math.min(videoDuration, Math.max(time, trimStart + 0.2));
        setTrimEnd(val);
        if (videoRef.current) videoRef.current.currentTime = val;
      }
    };
    const stopDragging = () => setDraggingHandle(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingHandle, trimStart, trimEnd, videoDuration]);

  // Save to computer with folder selection dialog or default dir
  const handleSaveToComputer = async () => {
    try {
      setSavingStatus('Đang mở hộp thoại lưu tệp...');
      const dirInfo = await getDefaultDirectoryHandle();
      const res = await saveVideoToFile(
        blob,
        fileName,
        blob.type.includes('mp4') ? 'mp4' : 'webm',
        dirInfo?.handle
      );
      if (res.method === 'directory') {
        setSavingStatus(`✅ Đã lưu trực tiếp vào thư mục: ${res.folderName || 'mặc định'}/${res.fileName}`);
      } else {
        setSavingStatus(`✅ Đã lưu thành công: ${res.fileName}`);
      }
      setTimeout(() => setSavingStatus(null), 5000);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setSavingStatus('⚠️ Bạn đã hủy lưu tệp.');
      } else {
        setSavingStatus(`❌ Lỗi khi lưu: ${err?.message || 'Lỗi không xác định'}`);
      }
      setTimeout(() => setSavingStatus(null), 4000);
    }
  };

  // Take Snapshot frame
  const handleTakeSnapshot = async () => {
    if (!videoRef.current) return;
    try {
      const { dataUrl } = captureFrameFromVideo(videoRef.current);
      downloadImage(dataUrl, `${fileName}_screenshot_${Math.floor(currentTime)}s.png`);
      setSnapshotFeedback(true);
      setTimeout(() => setSnapshotFeedback(false), 2500);
    } catch (err) {
      console.error('Snapshot failed:', err);
    }
  };

  // Extract just the audio track and download as a standard .wav file
  const handleExtractAudioWav = async () => {
    setIsExtractingAudio(true);
    try {
      const wavBlob = await extractAudioAsWav(blob);
      downloadBlob(wavBlob, `${fileName}.wav`);
    } catch (err) {
      console.error('Extract audio to WAV failed:', err);
      setSavingStatus('❌ Không thể tách âm thanh (video có thể không có track âm thanh).');
      setTimeout(() => setSavingStatus(null), 4000);
    } finally {
      setIsExtractingAudio(false);
    }
  };

  // Save to browser IndexedDB Library
  const handleSaveToLibraryClick = async () => {
    try {
      await onSaveToLibrary(fileName);
      setIsSavedInLibrary(true);
    } catch (err) {
      console.error('Save to library error:', err);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Top Banner Notice */}
      <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Quay màn hình hoàn tất!
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Video đã sẵn sàng. Bạn có thể tải ngay hoặc lưu vào thư mục mong muốn.
            </p>
          </div>
        </div>

        <button
          id="btn-preview-save-primary"
          onClick={handleSaveToComputer}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-sky-600/30 transition-all cursor-pointer"
        >
          <HardDrive className="w-4 h-4" />
          <span>Lưu vào máy tính (Save As...)</span>
        </button>
      </div>

      {/* Saving Feedback Alert */}
      {savingStatus && (
        <div className="p-3 rounded-xl bg-sky-100 dark:bg-sky-950 border border-sky-300 dark:border-sky-700 text-xs font-semibold text-sky-900 dark:text-sky-200 text-center animate-in fade-in">
          {savingStatus}
        </div>
      )}

      {/* Video Player Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Video Canvas */}
        <div className="relative bg-slate-950 aspect-video flex items-center justify-center group">
          <video
            ref={videoRef}
            src={videoUrl}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            playsInline
            className="w-full h-full object-contain"
            onClick={togglePlay}
          />

          {/* Big Play Overlay Button if paused */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-sky-600/90 hover:bg-sky-500 text-white flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play className="w-6 h-6 fill-white translate-x-0.5" />
            </button>
          )}

          {/* Top Video Overlay Info */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white font-mono">
              {sourceLabel || 'Bản ghi màn hình'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-sky-300 font-mono">
              {formatBytes(blob.size)}
            </span>
          </div>

          {/* Flash Snapshot Notification */}
          {snapshotFeedback && (
            <div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 animate-in fade-in">
              <Camera className="w-3.5 h-3.5" />
              <span>Đã lưu ảnh chụp màn hình!</span>
            </div>
          )}
        </div>

        {/* Custom Video Controls Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          {/* Progress / Scrubber */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 min-w-[40px]">
              {formatDuration(currentTime)}
            </span>
            <input
              id="slider-video-scrubber"
              type="range"
              min="0"
              max={videoDuration || 1}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-600"
            />
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 min-w-[40px] text-right">
              {formatDuration(videoDuration)}
            </span>
          </div>

          {/* Playback action controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <button
                id="btn-player-play-toggle"
                onClick={togglePlay}
                className="p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                title={isPlaying ? 'Tạm dừng' : 'Phát'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <button
                id="btn-player-mute-toggle"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                className="p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                id="btn-player-screenshot"
                onClick={handleTakeSnapshot}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                title="Chụp 1 khung hình từ video thành ảnh PNG"
              >
                <Camera className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Chụp ảnh khung hình</span>
              </button>

              <button
                id="btn-player-trim-toggle"
                onClick={() => setIsTrimMode(!isTrimMode)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isTrimMode
                    ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-400'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                }`}
                title="Cắt đoạn đầu/cuối video"
              >
                <Scissors className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Cắt video</span>
              </button>

              <button
                id="btn-extract-audio-wav"
                onClick={handleExtractAudioWav}
                disabled={isExtractingAudio}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-60"
                title="Tách riêng âm thanh và tải về dạng file .wav"
              >
                {isExtractingAudio ? (
                  <Loader2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 animate-spin" />
                ) : (
                  <FileAudio className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                )}
                <span>{isExtractingAudio ? 'Đang tách...' : 'Tách âm thanh (.wav)'}</span>
              </button>
            </div>

            {/* Rename Input */}
            <div className="flex items-center gap-1.5 flex-1 max-w-xs min-w-[180px]">
              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 font-medium">Tên tệp:</span>
              <input
                id="input-filename"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-sky-500"
                placeholder="Nhập tên tệp video..."
              />
            </div>
          </div>

          {/* Trimmer Slider Bar if enabled */}
          {isTrimMode && (
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-sky-600" />
                  Kéo 2 chấm tròn để chọn đoạn cần giữ lại:
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-mono">
                  {formatDuration(trimStart)} - {formatDuration(trimEnd)} (Thời lượng: {formatDuration(trimEnd - trimStart)})
                </span>
              </div>

              {/* Single track, two round handles: the selected segment is
                  highlighted in blue, everything outside it stays gray/white.
                  Built with plain divs + pointer events (not native <input
                  type="range">) so the look is 100% consistent everywhere. */}
              <div className="px-1 pt-1 pb-2">
                <div
                  ref={trimTrackRef}
                  className="relative h-6 flex items-center touch-none select-none cursor-pointer"
                >
                  {/* Base track (unselected area) */}
                  <div className="absolute left-0 right-0 h-2 rounded-full bg-slate-200 dark:bg-slate-700 pointer-events-none" />
                  {/* Selected segment highlight */}
                  <div
                    className="absolute h-2 rounded-full bg-sky-600 pointer-events-none"
                    style={{
                      left: `${(trimStart / (videoDuration || 1)) * 100}%`,
                      width: `${((trimEnd - trimStart) / (videoDuration || 1)) * 100}%`,
                    }}
                  />
                  {/* Start handle */}
                  <div
                    role="slider"
                    aria-label="Điểm bắt đầu đoạn cắt"
                    aria-valuenow={trimStart}
                    aria-valuemin={0}
                    aria-valuemax={videoDuration}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setDraggingHandle('start');
                    }}
                    className="absolute w-5 h-5 -translate-x-1/2 rounded-full bg-white dark:bg-slate-900 border-[3px] border-sky-600 shadow-md cursor-grab active:cursor-grabbing touch-none"
                    style={{
                      left: `${(trimStart / (videoDuration || 1)) * 100}%`,
                      zIndex: draggingHandle === 'start' ? 20 : 10,
                    }}
                  />
                  {/* End handle */}
                  <div
                    role="slider"
                    aria-label="Điểm kết thúc đoạn cắt"
                    aria-valuenow={trimEnd}
                    aria-valuemin={0}
                    aria-valuemax={videoDuration}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setDraggingHandle('end');
                    }}
                    className="absolute w-5 h-5 -translate-x-1/2 rounded-full bg-white dark:bg-slate-900 border-[3px] border-sky-600 shadow-md cursor-grab active:cursor-grabbing touch-none"
                    style={{
                      left: `${(trimEnd / (videoDuration || 1)) * 100}%`,
                      zIndex: draggingHandle === 'end' ? 20 : 11,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1.5">
                  <span>0:00</span>
                  <span>{formatDuration(videoDuration)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Save to Computer Primary */}
        <button
          id="btn-save-to-pc"
          onClick={handleSaveToComputer}
          className="p-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-sky-600/30 transition-all cursor-pointer"
        >
          <HardDrive className="w-4 h-4 shrink-0" />
          <div className="text-left">
            <div>Lưu vào máy tính</div>
            <div className="text-[10px] font-normal text-sky-100">Chọn ổ đĩa / thư mục lưu</div>
          </div>
        </button>

        {/* Save to browser local storage library */}
        <button
          id="btn-save-to-library"
          onClick={handleSaveToLibraryClick}
          disabled={isSavedInLibrary}
          className={`p-3.5 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            isSavedInLibrary
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer'
          }`}
        >
          <BookmarkPlus className="w-4 h-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <div className="text-left">
            <div>{isSavedInLibrary ? 'Đã lưu thư viện' : 'Lưu thư viện web'}</div>
            <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">Xem lại trên trình duyệt</div>
          </div>
        </button>

        {/* Record Another Video */}
        <button
          id="btn-record-again"
          onClick={onRecordAgain}
          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 shrink-0 text-slate-500" />
          <div className="text-left">
            <div>Quay video mới</div>
            <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">Bắt đầu bản ghi mới</div>
          </div>
        </button>
      </div>
    </div>
  );
};
