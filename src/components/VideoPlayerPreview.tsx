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
import { resolveSaveDirectoryHandle, getAskBeforeSave } from '../lib/appSettings';
import { trimVideoBlob } from '../lib/videoTrimmer';
import { TrimRangeSlider } from './TrimRangeSlider';

interface VideoPlayerPreviewProps {
  blob: Blob;
  duration: number; // in seconds
  sourceLabel?: string;
  onRecordAgain: () => void;
  onSaveToLibrary: (name: string, blobOverride?: Blob, durationOverride?: number) => Promise<void>;
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
  const [isTrimming, setIsTrimming] = useState<boolean>(false);
  const [trimProgress, setTrimProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(duration || 0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Trimming State
  const [isTrimMode, setIsTrimMode] = useState<boolean>(false);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(duration || 10);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setVideoUrl(url);

    // Auto-save check: if user configured a default directory, attempt saving automatically!
    // Bỏ qua hoàn toàn nếu người dùng đã bật "Hỏi lại nơi lưu" - lúc đó họ muốn tự chọn
    // nơi lưu/tên file mỗi lần, không muốn app tự lưu ngầm.
    const tryAutoSave = async () => {
      if (getAskBeforeSave()) return;
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
    const v = videoRef.current;
    if (!v) return;

    if (v.duration && isFinite(v.duration)) {
      setVideoDuration(v.duration);
      setTrimEnd(v.duration);
      return;
    }

    // Webm do MediaRecorder tạo có thể báo duration = Infinity; ép seek để tính lại.
    const onTimeUpdate = () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      const fixedDuration = isFinite(v.duration) ? v.duration : (duration || videoDuration);
      if (fixedDuration > 0) {
        setVideoDuration(fixedDuration);
        setTrimEnd(fixedDuration);
      }
      v.currentTime = 0;
    };
    v.addEventListener('timeupdate', onTimeUpdate);
    v.currentTime = Number.MAX_SAFE_INTEGER;
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

  // Trả về blob đã cắt nếu người dùng đang bật "Cắt video" và có chọn vùng khác toàn bộ,
  // ngược lại trả về blob gốc. Đây là bước bị THIẾU trước đây khiến file lưu ra luôn là bản gốc.
  const getBlobToSave = async (): Promise<Blob> => {
    const isRealTrim = isTrimMode && (trimStart > 0.05 || trimEnd < videoDuration - 0.05);
    if (!isRealTrim) return blob;

    setIsTrimming(true);
    setTrimProgress(0);
    setSavingStatus('✂️ Đang cắt video, vui lòng đợi...');
    try {
      const trimmed = await trimVideoBlob(blob, trimStart, trimEnd, blob.type, (p) => {
        setTrimProgress(p);
        setSavingStatus(`✂️ Đang cắt video... ${p}%`);
      });
      return trimmed;
    } finally {
      setIsTrimming(false);
    }
  };

  // Save to computer with folder selection dialog or default dir
  const handleSaveToComputer = async () => {
    try {
      const blobToSave = await getBlobToSave();
      setSavingStatus('Đang mở hộp thoại lưu tệp...');
      // Nếu người dùng bật "Hỏi lại nơi lưu" -> dirHandle sẽ luôn là undefined,
      // ép saveVideoToFile phải mở hộp thoại Save As để chọn lại nơi lưu / tên tệp.
      const dirHandle = await resolveSaveDirectoryHandle();
      const res = await saveVideoToFile(
        blobToSave,
        fileName,
        blobToSave.type.includes('mp4') ? 'mp4' : 'webm',
        dirHandle
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
      const isRealTrim = isTrimMode && (trimStart > 0.05 || trimEnd < videoDuration - 0.05);
      const blobToSave = await getBlobToSave();
      const durationToSave = isRealTrim ? trimEnd - trimStart : videoDuration;
      await onSaveToLibrary(fileName, blobToSave, durationToSave);
      setIsSavedInLibrary(true);
      setSavingStatus(null);
    } catch (err) {
      console.error('Save to library error:', err);
      setSavingStatus('❌ Không thể cắt/lưu video. Vui lòng thử lại.');
      setTimeout(() => setSavingStatus(null), 4000);
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
          disabled={isTrimming}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-sky-600/30 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isTrimming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <HardDrive className="w-4 h-4" />
          )}
          <span>{isTrimming ? `Đang cắt video... ${trimProgress}%` : 'Lưu vào máy tính (Save As...)'}</span>
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
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 animate-in fade-in">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Scissors className="w-3.5 h-3.5 text-sky-600" />
                Kéo 2 đầu để chọn đoạn cần cắt:
              </span>
              <TrimRangeSlider
                duration={videoDuration}
                trimStart={trimStart}
                trimEnd={trimEnd}
                onStartChange={(val) => {
                  setTrimStart(val);
                  if (videoRef.current) videoRef.current.currentTime = val;
                }}
                onEndChange={(val) => {
                  setTrimEnd(val);
                  if (videoRef.current) videoRef.current.currentTime = val;
                }}
              />
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
          disabled={isSavedInLibrary || isTrimming}
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
