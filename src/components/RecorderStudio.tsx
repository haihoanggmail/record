import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Play,
  Pause,
  Square,
  Camera,
  RotateCcw,
  Sparkles,
  AlertCircle,
  HardDrive,
  Sliders,
  Maximize,
  HelpCircle,
  Eye,
  EyeOff,
  Volume2,
  ShieldCheck,
  Layers,
  Tv,
  Info,
} from 'lucide-react';
import {
  RecordingStatus,
  VideoConfig,
  AudioConfig,
  WebcamConfig,
  MediaDeviceInfoOption,
  StoredRecording,
} from '../types';
import { AudioSettingsBar } from './AudioSettingsBar';
import { WebcamSettingsDrawer } from './WebcamSettingsDrawer';
import { VideoSettingsBar } from './VideoSettingsBar';
import { ActiveRecordingBar } from './ActiveRecordingBar';
import { VideoPlayerPreview } from './VideoPlayerPreview';
import { CountdownOverlay } from './CountdownOverlay';
import {
  createRecordingStreams,
  getMicrophoneDevices,
  getCameraDevices,
  getBestMimeType,
  CompositeStreamResult,
} from '../lib/streamComposer';
import { saveRecordingToDb } from '../lib/indexedDb';
import { captureFrameFromVideo, downloadImage } from '../lib/fileSaver';

interface RecorderStudioProps {
  onRefreshSavedCount: () => void;
  onOpenGuide: () => void;
  onStatusChange?: (status: RecordingStatus) => void;
}

export const RecorderStudio: React.FC<RecorderStudioProps> = ({
  onRefreshSavedCount,
  onOpenGuide,
  onStatusChange,
}) => {
  // State
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [countdown, setCountdown] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync status to parent header
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // Device lists
  const [microphones, setMicrophones] = useState<MediaDeviceInfoOption[]>([]);
  const [cameras, setCameras] = useState<MediaDeviceInfoOption[]>([]);
  const [liveAudioLevel, setLiveAudioLevel] = useState<number>(0);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);

  // Settings
  const [videoConfig, setVideoConfig] = useState<VideoConfig>({
    resolution: '1080p',
    frameRate: 60,
    bitrate: 'high',
    countdownSeconds: 3,
    outputFormat: 'webm',
  });

  // Advanced settings (mic, webcam, quality, format) are collapsed by default
  // so the default flow is just: pick source -> click Start.
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const [audioConfig, setAudioConfig] = useState<AudioConfig>({
    micEnabled: true,
    micDeviceId: '',
    micVolume: 1.0,
    echoCancellation: true,
    noiseSuppression: true,
    systemAudioEnabled: true,
  });

  const [webcamConfig, setWebcamConfig] = useState<WebcamConfig>({
    enabled: false,
    deviceId: '',
    position: 'bottom-right',
    shape: 'circle',
    size: 'medium',
    mirrored: true,
    opacity: 1.0,
  });

  // Active recording references
  const streamResultRef = useRef<CompositeStreamResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const elapsedBeforePauseRef = useRef<number>(0);
  const timerIntervalRef = useRef<any>(null);
  const audioIntervalRef = useRef<any>(null);

  // Finished video state
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);
  const [activeSourceLabel, setActiveSourceLabel] = useState<string>('Toàn màn hình');
  const [showLivePreview, setShowLivePreview] = useState<boolean>(false);
  // 'monitor' | 'window' | 'browser' (tab) - lấy từ MediaStreamTrack.getSettings().displaySurface
  // Khi = 'browser', rất dễ người dùng lỡ chọn đúng tab đang chạy app này => xem trực tiếp
  // sẽ tạo lặp gương vô tận, nên phải tắt hẳn tính năng xem trực tiếp trong trường hợp này.
  const [captureSurfaceType, setCaptureSurfaceType] = useState<string | null>(null);

  const livePreviewVideoRef = useRef<HTMLVideoElement>(null);

  // Load available microphones and webcams on mount
  useEffect(() => {
    async function loadDevices() {
      const mics = await getMicrophoneDevices();
      setMicrophones(mics);
      const cams = await getCameraDevices();
      setCameras(cams);
    }
    loadDevices();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      stopAudioMonitor();
      if (streamResultRef.current) {
        streamResultRef.current.cleanup();
      }
    };
  }, []);

  // Timer helpers
  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const currentElapsed = elapsedBeforePauseRef.current + (now - startTimeRef.current) / 1000;
      setElapsedSeconds(currentElapsed);
    }, 250);
  };

  const pauseTimer = () => {
    elapsedBeforePauseRef.current += (Date.now() - startTimeRef.current) / 1000;
    clearInterval(timerIntervalRef.current);
  };

  const resumeTimer = () => {
    startTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const currentElapsed = elapsedBeforePauseRef.current + (now - startTimeRef.current) / 1000;
      setElapsedSeconds(currentElapsed);
    }, 250);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const startAudioMonitor = (composer: CompositeStreamResult) => {
    audioIntervalRef.current = setInterval(() => {
      const lvl = composer.getAudioLevel();
      setLiveAudioLevel(lvl);
    }, 80);
  };

  const stopAudioMonitor = () => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    setLiveAudioLevel(0);
  };

  // Start Recording workflow
  const initiateRecording = async () => {
    setErrorMessage(null);
    try {
      // Step 1: Prompt Screen Share + Mic + Webcam
      const composer = await createRecordingStreams(videoConfig, audioConfig, webcamConfig);
      streamResultRef.current = composer;
      setActiveSourceLabel(composer.sourceLabel || 'Màn hình');

      // Set live preview
      if (livePreviewVideoRef.current) {
        livePreviewVideoRef.current.srcObject = composer.recordingStream;
        livePreviewVideoRef.current.play().catch(() => {});
      }

      // Handle user stopping screen share from browser banner
      const videoTrack = composer.displayStream.getVideoTracks()[0];
      if (videoTrack) {
        // Phát hiện loại nguồn thực tế người dùng vừa chọn trong hộp thoại của Chrome.
        // 'browser' nghĩa là họ chọn chia sẻ 1 Tab - nếu đó là tab đang chạy app này,
        // bật xem trực tiếp chắc chắn sẽ gây lặp gương vô tận.
        const settings = videoTrack.getSettings() as MediaTrackSettings & { displaySurface?: string };
        setCaptureSurfaceType(settings.displaySurface ?? null);
        if (settings.displaySurface === 'browser') {
          setShowLivePreview(false);
        }

        videoTrack.onended = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            stopRecording();
          }
        };
      }

      // Step 2: Handle Countdown if configured
      if (videoConfig.countdownSeconds > 0) {
        setStatus('countdown');
        for (let i = videoConfig.countdownSeconds; i > 0; i--) {
          setCountdown(i);
          await new Promise((r) => setTimeout(r, 1000));
        }
        setCountdown(0);
        await new Promise((r) => setTimeout(r, 300));
      }

      // Step 3: Initialize MediaRecorder
      recordedChunksRef.current = [];
      elapsedBeforePauseRef.current = 0;
      setElapsedSeconds(0);

      const { mimeType, videoBitsPerSecond, usedFallback } = getBestMimeType(
        videoConfig.bitrate,
        videoConfig.outputFormat
      );

      if (usedFallback) {
        setErrorMessage(
          'Trình duyệt của bạn không hỗ trợ ghi trực tiếp định dạng MP4, hệ thống đã tự chuyển sang WebM để đảm bảo video quay được.'
        );
      }

      const recorderOptions: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        ...(videoBitsPerSecond ? { videoBitsPerSecond } : {}),
      };

      const recorder = new MediaRecorder(composer.recordingStream, recorderOptions);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunksRef.current, {
          type: mimeType || 'video/webm',
        });
        setRecordedBlob(finalBlob);
        setRecordedDuration(elapsedBeforePauseRef.current || 1);
        setStatus('finished');

        // Cleanup active stream
        stopAudioMonitor();
        if (streamResultRef.current) {
          streamResultRef.current.cleanup();
          streamResultRef.current = null;
        }
      };

      recorder.start(1000); // 1-second timeslice for robust recording
      startTimer();
      startAudioMonitor(composer);
      setStatus('recording');
    } catch (err: any) {
      console.error('Recording initialization error:', err);
      setErrorMessage(err.message || 'Không thể bắt đầu quay màn hình');
      setStatus('idle');
      if (streamResultRef.current) {
        streamResultRef.current.cleanup();
        streamResultRef.current = null;
      }
    }
  };

  // Pause Recording
  // Note: MediaRecorder.pause() alone can be unreliable in Chrome when the
  // stream feeds from a Web Audio mixed destination (mic + system audio).
  // As a safety net we also disable every track feeding the recorder, so
  // even if pause() fails to stop encoding, no real content leaks through.
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      if (streamResultRef.current) {
        streamResultRef.current.recordingStream.getTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      pauseTimer();
      setStatus('paused');
    }
  };

  // Resume Recording
  // Mic mute (if any) is handled separately on the raw mic stream via
  // toggleMicMute, so simply re-enabling every track here is safe and
  // won't accidentally un-mute a mic the user muted on purpose.
  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      if (streamResultRef.current) {
        streamResultRef.current.recordingStream.getTracks().forEach((track) => {
          track.enabled = true;
        });
      }
      mediaRecorderRef.current.resume();
      resumeTimer();
      setStatus('recording');
    }
  };

  // Stop Recording
  const stopRecording = () => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Instant Snapshot during recording
  const takeInstantScreenshot = () => {
    if (livePreviewVideoRef.current) {
      try {
        const { dataUrl } = captureFrameFromVideo(livePreviewVideoRef.current);
        const timeStr = Math.floor(elapsedSeconds);
        downloadImage(dataUrl, `Screenshot_Live_${timeStr}s.png`);
      } catch (err) {
        console.error('Screenshot error:', err);
      }
    }
  };

  // Toggle Mute Mic on the fly
  const toggleMicMute = () => {
    if (streamResultRef.current && streamResultRef.current.micStream) {
      const tracks = streamResultRef.current.micStream.getAudioTracks();
      tracks.forEach((t) => {
        t.enabled = isMicMuted; // toggle
      });
      setIsMicMuted(!isMicMuted);
    }
  };

  // Save to IndexedDB Library
  // blobOverride: khi người dùng đã cắt video trong VideoPlayerPreview, blob đã cắt
  // được truyền vào đây để lưu đúng đoạn đã chọn thay vì luôn lưu bản ghi gốc.
  const handleSaveToLibrary = async (name: string, blobOverride?: Blob, durationOverride?: number) => {
    const finalBlob = blobOverride || recordedBlob;
    if (!finalBlob) return;
    const item: StoredRecording = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name,
      blob: finalBlob,
      mimeType: finalBlob.type || 'video/webm',
      duration: durationOverride ?? recordedDuration,
      size: finalBlob.size,
      createdAt: Date.now(),
      width: 1920,
      height: 1080,
      fps: videoConfig.frameRate,
      sourceType: activeSourceLabel,
    };
    await saveRecordingToDb(item);
    onRefreshSavedCount();
  };

  // Reset to record new video
  const handleRecordAgain = () => {
    setRecordedBlob(null);
    setRecordedDuration(0);
    setElapsedSeconds(0);
    setStatus('idle');
    setErrorMessage(null);
    setShowLivePreview(false);
    setCaptureSurfaceType(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Countdown Overlay */}
      {status === 'countdown' && <CountdownOverlay count={countdown} />}

      {/* Finished State: Post-recording Studio */}
      {status === 'finished' && recordedBlob && (
        <VideoPlayerPreview
          blob={recordedBlob}
          duration={recordedDuration}
          sourceLabel={activeSourceLabel}
          onRecordAgain={handleRecordAgain}
          onSaveToLibrary={handleSaveToLibrary}
        />
      )}

      {/* Active Recording Floating Bar */}
      {(status === 'recording' || status === 'paused') && (
        <ActiveRecordingBar
          isPaused={status === 'paused'}
          elapsedSeconds={elapsedSeconds}
          sourceLabel={activeSourceLabel}
          isMicMuted={isMicMuted}
          onToggleMicMute={toggleMicMute}
          onPause={pauseRecording}
          onResume={resumeRecording}
          onStop={stopRecording}
          onTakeScreenshot={takeInstantScreenshot}
        />
      )}

      {/* Idle / Active Recording Studio Setup */}
      {status !== 'finished' && (
        <div className="space-y-6">
          {/* Main Hero & Live Preview Stage */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl dark:shadow-2xl">
            {/* Live Video Canvas Area */}
            <div className="relative bg-slate-950 aspect-video flex items-center justify-center border-b border-slate-200 dark:border-slate-800 overflow-hidden">
              {/* Always mounted video element for stream & screenshots */}
              <video
                ref={livePreviewVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-contain ${
                  status !== 'idle' && showLivePreview ? 'block' : 'hidden'
                }`}
              />

              {/* Idle Placeholder */}
              {status === 'idle' && (
                <div className="text-center p-6 sm:p-10 space-y-4 max-w-lg">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center mx-auto text-sky-400 shadow-xl shadow-sky-950/30">
                    <Video className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      Sẵn sàng quay màn hình máy tính
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                      Tùy chọn quay <strong>toàn màn hình</strong>, <strong>cửa sổ 1 phần mềm</strong> hoặc <strong>tab trình duyệt</strong>. Thu tiếng Micro & Âm thanh hệ thống mượt mà.
                    </p>
                  </div>

                  {/* Primary Big Start Button */}
                  <div className="pt-2">
                    <button
                      id="btn-start-recording-hero"
                      onClick={initiateRecording}
                      className="w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-base shadow-xl shadow-sky-950/50 flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 cursor-pointer mx-auto group"
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-white group-hover:animate-ping" />
                      <span>Bắt đầu quay màn hình</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Active Recording State: Anti-Mirror Dashboard */}
              {(status === 'recording' || status === 'paused') && !showLivePreview && (
                <div className="p-6 sm:p-8 text-center max-w-xl mx-auto space-y-4 text-white animate-in fade-in">
                  <div className="flex items-center justify-center gap-3">
                    <div className="relative">
                      <span
                        className={`inline-block w-4 h-4 rounded-full ${
                          status === 'paused' ? 'bg-amber-400' : 'bg-red-500 rec-pulse'
                        }`}
                      />
                      {status === 'recording' && (
                        <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />
                      )}
                    </div>
                    <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-wider text-white">
                      {Math.floor(elapsedSeconds / 60)
                        .toString()
                        .padStart(2, '0')}
                      :
                      {Math.floor(elapsedSeconds % 60)
                        .toString()
                        .padStart(2, '0')}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
                      {status === 'paused' ? 'TẠM DỪNG' : 'ĐANG THU'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                    <span className="px-3 py-1 rounded-lg bg-sky-950/60 border border-sky-800 text-sky-300 font-semibold">
                      {activeSourceLabel}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                      {videoConfig.resolution} • {videoConfig.frameRate} FPS
                    </span>
                    {audioConfig.micEnabled && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5" />
                        Micro {isMicMuted ? '(Tắt tiếng)' : '(Hoạt động)'}
                      </span>
                    )}
                  </div>

                  {/* Anti-Infinity Mirror Explanatory Card */}
                  <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/90 border border-sky-900/60 text-left space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-sky-400 font-bold">
                      <ShieldCheck className="w-4 h-4 shrink-0 text-sky-400" />
                      <span>Đang bảo vệ chống hiện tượng lặp gương vô tận</span>
                    </div>
                    <p className="text-slate-300 text-[11px] sm:text-xs leading-relaxed">
                      Khung xem trực tiếp được ẩn tạm thời để tránh màn hình quay lại chính nó. Hãy <strong>thu nhỏ trình duyệt</strong> hoặc <strong>chuyển sang phần mềm cần làm việc (Word, Excel, Game, Bài giảng...)</strong>. Mọi thao tác trên máy tính của bạn vẫn đang được ghi lại trọn vẹn 100% với chất lượng cao nhất!
                    </p>
                  </div>

                  {/* Toggle Preview Button - disabled entirely for Tab-capture to prevent infinity mirror */}
                  <div className="pt-1 flex items-center justify-center">
                    {captureSurfaceType === 'browser' ? (
                      <p className="text-[11px] sm:text-xs text-amber-300 bg-amber-950/40 border border-amber-700/60 rounded-xl px-3.5 py-2 max-w-md">
                        ⚠️ Bạn đang quay theo chế độ <strong>Tab trình duyệt</strong>. Nếu đó là tab ứng dụng này, xem trực tiếp sẽ luôn bị lặp gương vô tận nên tính năng này đã được <strong>tự động tắt</strong> để bảo vệ bạn. Video quay ra vẫn hoàn toàn bình thường.
                      </p>
                    ) : (
                      <button
                        onClick={() => setShowLivePreview(true)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Bật xem trực tiếp màn hình</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Active Recording State: User chose to show live preview */}
              {(status === 'recording' || status === 'paused') && showLivePreview && (
                <>
                  {/* Top Bar with Status and Close Preview Button */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-slate-700 text-white text-xs font-mono">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            status === 'paused' ? 'bg-amber-400' : 'bg-red-500 rec-pulse'
                          }`}
                        />
                        <span>{status === 'paused' ? 'TẠM DỪNG' : 'LIVE RECORDING'}</span>
                      </div>
                      <span className="text-xs px-2.5 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-slate-700 text-slate-300">
                        {activeSourceLabel}
                      </span>
                    </div>

                    <button
                      onClick={() => setShowLivePreview(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/80 hover:bg-black backdrop-blur-md border border-sky-500/60 text-sky-300 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Ẩn để chống lặp gương</span>
                    </button>
                  </div>

                  {/* Bottom Warning Notice */}
                  <div className="absolute bottom-3 left-3 right-3 p-2 rounded-lg bg-amber-950/90 border border-amber-600/70 text-amber-200 text-[11px] text-center backdrop-blur-md z-10">
                    ⚠️ Lưu ý: Nhìn trực tiếp vào màn hình đang quay sẽ thấy hiệu ứng gương lặp lại. Bạn hãy chuyển sang phần mềm khác để làm việc bình thường, video xuất ra sẽ không bị lặp!
                  </div>
                </>
              )}
            </div>

            {/* Error Message Toast */}
            {errorMessage && (
              <div className="p-4 bg-red-500/10 border-b border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMessage}</span>
                <button
                  onClick={onOpenGuide}
                  className="ml-auto underline hover:text-slate-900 dark:hover:text-white shrink-0 cursor-pointer font-medium"
                >
                  Xem hướng dẫn khắc phục
                </button>
              </div>
            )}

            {/* Configuration Tabs & Sections */}
            {status === 'idle' && (
              <div className="p-5 sm:p-7 space-y-6">
                {/* Advanced settings toggle - keeps the default flow to just "bấm quay -> chọn màn hình trong hộp thoại của Chrome" */}
                <button
                  type="button"
                  id="btn-toggle-advanced-settings"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    Cài đặt nâng cao (Micro, Webcam, Chất lượng, Định dạng file)
                  </span>
                  <span>{showAdvanced ? 'Thu gọn ▲' : 'Mở rộng ▼'}</span>
                </button>

                {showAdvanced && (
                  <div className="space-y-4 animate-in fade-in">
                    {/* 2. Audio Settings */}
                    <AudioSettingsBar
                      config={audioConfig}
                      onChange={setAudioConfig}
                      microphones={microphones}
                      liveAudioLevel={liveAudioLevel}
                      disabled={status !== 'idle'}
                    />

                    {/* 3. Webcam / Facecam Settings */}
                    <WebcamSettingsDrawer
                      config={webcamConfig}
                      onChange={setWebcamConfig}
                      cameras={cameras}
                      disabled={status !== 'idle'}
                    />

                    {/* 4. Video Quality, Format & Countdown */}
                    <VideoSettingsBar
                      config={videoConfig}
                      onChange={setVideoConfig}
                      disabled={status !== 'idle'}
                    />
                  </div>
                )}

                {/* Bottom Trigger Action Bar */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Lưu video an toàn trực tiếp vào máy tính của bạn (Không tải lên server)</span>
                  </div>

                  <button
                    id="btn-start-recording-bottom"
                    onClick={initiateRecording}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <span className="w-3 h-3 rounded-full bg-white" />
                    <span>Bắt đầu quay ngay</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
