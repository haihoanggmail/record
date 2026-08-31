import { AudioConfig, VideoConfig, WebcamConfig, MediaDeviceInfoOption } from '../types';

export interface CompositeStreamResult {
  recordingStream: MediaStream;
  displayStream: MediaStream;
  micStream: MediaStream | null;
  webcamStream: MediaStream | null;
  cleanup: () => void;
  getAudioLevel: () => number;
  canvasElement?: HTMLCanvasElement;
  sourceLabel?: string;
}

/**
 * Get available audio input devices (microphones)
 */
export async function getMicrophoneDevices(): Promise<MediaDeviceInfoOption[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices
      .filter((d) => d.kind === 'audioinput')
      .map((d, index) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${index + 1}`,
      }));
    return audioInputs;
  } catch (err) {
    console.warn('Failed to enumerate audio devices:', err);
    return [];
  }
}

/**
 * Get available video input devices (webcams)
 */
export async function getCameraDevices(): Promise<MediaDeviceInfoOption[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, index) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${index + 1}`,
      }));
    return videoInputs;
  } catch (err) {
    console.warn('Failed to enumerate video devices:', err);
    return [];
  }
}

/**
 * Check which output containers Chrome actually supports on this device.
 * Used to build the format picker dynamically (never offer a format that will silently fall back).
 */
export function getSupportedOutputFormats(): { id: 'webm' | 'mp4'; label: string }[] {
  const formats: { id: 'webm' | 'mp4'; label: string }[] = [];
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm')) {
    formats.push({ id: 'webm', label: 'WebM (khuyên dùng, ổn định nhất trên Chrome)' });
  }
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4')) {
    formats.push({ id: 'mp4', label: 'MP4 (tương thích rộng, một số máy có thể không hỗ trợ ghi trực tiếp)' });
  }
  // Always guarantee at least webm as an option even if the isTypeSupported check above is stricter than reality
  if (formats.length === 0) {
    formats.push({ id: 'webm', label: 'WebM (mặc định)' });
  }
  return formats;
}

/**
 * Find best supported mime type for MediaRecorder, honoring the user's preferred output format.
 * Falls back gracefully (with a flag) if the requested format isn't actually supported on this browser.
 */
export function getBestMimeType(
  preferredBitrate: string = 'high',
  preferredFormat: 'webm' | 'mp4' = 'webm'
): { mimeType: string; videoBitsPerSecond?: number; usedFallback: boolean } {
  const webmCandidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
  ];
  const mp4Candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=h264,aac',
    'video/mp4',
  ];

  const orderedCandidates =
    preferredFormat === 'mp4' ? [...mp4Candidates, ...webmCandidates] : [...webmCandidates, ...mp4Candidates];

  let chosenMime = '';
  for (const mime of orderedCandidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      chosenMime = mime;
      break;
    }
  }

  const usedFallback = preferredFormat === 'mp4' && !chosenMime.startsWith('video/mp4');

  let bitrate = 4500000; // 4.5 Mbps for standard
  if (preferredBitrate === 'high') bitrate = 8000000; // 8 Mbps
  if (preferredBitrate === 'ultra') bitrate = 15000000; // 15 Mbps

  return { mimeType: chosenMime, videoBitsPerSecond: bitrate, usedFallback };
}

/**
 * Builds the composite recording stream based on user configs
 */
export async function createRecordingStreams(
  videoConfig: VideoConfig,
  audioConfig: AudioConfig,
  webcamConfig: WebcamConfig
): Promise<CompositeStreamResult> {
  let displayStream: MediaStream;
  let micStream: MediaStream | null = null;
  let webcamStream: MediaStream | null = null;

  // Video capture constraints
  let idealWidth = 1920;
  let idealHeight = 1080;
  if (videoConfig.resolution === '720p') {
    idealWidth = 1280;
    idealHeight = 720;
  } else if (videoConfig.resolution === '4k') {
    idealWidth = 3840;
    idealHeight = 2160;
  }

  const displayMediaOptions: DisplayMediaStreamOptions = {
    video: {
      frameRate: videoConfig.frameRate || 30,
      ...(videoConfig.resolution !== 'original' ? { width: { ideal: idealWidth }, height: { ideal: idealHeight } } : {}),
      // @ts-ignore
      cursor: 'always',
	   selfBrowserSurface: 'exclude',
	  
    },
    audio: audioConfig.systemAudioEnabled,
  };

  // 1. Capture Screen
  try {
    displayStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
  } catch (err: any) {
    if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
      throw new Error('Bạn đã hủy hoặc từ chối chia sẻ màn hình.');
    }
    throw new Error(`Không thể chia sẻ màn hình: ${err?.message || err}`);
  }

  const screenVideoTrack = displayStream.getVideoTracks()[0];
  const settings = screenVideoTrack.getSettings();
  const sourceLabel = (settings as any).displaySurface
    ? (settings as any).displaySurface === 'monitor'
      ? 'Toàn màn hình'
      : (settings as any).displaySurface === 'window'
      ? 'Cửa sổ ứng dụng'
      : 'Tab trình duyệt'
    : screenVideoTrack.label || 'Màn hình';

  // 2. Capture Microphone if enabled
  if (audioConfig.micEnabled) {
    try {
      const micConstraints: MediaStreamConstraints = {
        audio: {
          ...(audioConfig.micDeviceId ? { deviceId: { exact: audioConfig.micDeviceId } } : {}),
          echoCancellation: audioConfig.echoCancellation,
          noiseSuppression: audioConfig.noiseSuppression,
          autoGainControl: true,
        },
        video: false,
      };
      micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
    } catch (err: any) {
      console.warn('Không thể truy cập microphone:', err);
    }
  }

  // 3. Capture Webcam if enabled
  if (webcamConfig.enabled) {
    try {
      const camConstraints: MediaStreamConstraints = {
        video: {
          ...(webcamConfig.deviceId ? { deviceId: { exact: webcamConfig.deviceId } } : {}),
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      };
      webcamStream = await navigator.mediaDevices.getUserMedia(camConstraints);
    } catch (err: any) {
      console.warn('Không thể truy cập webcam:', err);
    }
  }

  // 4. Setup Audio Context & Mixing
  let audioContext: AudioContext | null = null;
  let audioDestination: MediaStreamAudioDestinationNode | null = null;
  let micAnalyser: AnalyserNode | null = null;
  let dataArray: Uint8Array | null = null;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass && (audioConfig.micEnabled || audioConfig.systemAudioEnabled)) {
      audioContext = new AudioContextClass();
      audioDestination = audioContext.createMediaStreamDestination();

      // System audio track
      const sysAudioTracks = displayStream.getAudioTracks();
      if (audioConfig.systemAudioEnabled && sysAudioTracks.length > 0) {
        const sysSource = audioContext.createMediaStreamSource(new MediaStream([sysAudioTracks[0]]));
        const sysGain = audioContext.createGain();
        sysGain.gain.value = 1.0;
        sysSource.connect(sysGain);
        sysGain.connect(audioDestination);
      }

      // Mic audio track
      if (micStream && micStream.getAudioTracks().length > 0) {
        const micSource = audioContext.createMediaStreamSource(micStream);
        const micGain = audioContext.createGain();
        micGain.gain.value = audioConfig.micVolume ?? 1.0;

        micAnalyser = audioContext.createAnalyser();
        micAnalyser.fftSize = 64;
        dataArray = new Uint8Array(micAnalyser.frequencyBinCount);

        micSource.connect(micGain);
        micGain.connect(micAnalyser);
        micGain.connect(audioDestination);
      }
    }
  } catch (err) {
    console.warn('Web Audio API mixing error:', err);
  }

  const getAudioLevel = (): number => {
    if (!micAnalyser || !dataArray) return 0;
    micAnalyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    return Math.min(100, Math.round((avg / 255) * 100 * 1.5));
  };

  // 5. Compose Video (Direct Screen Track or Canvas Compositor if Webcam PiP is active)
  let recordingStream: MediaStream;
  let animFrameId: number | null = null;
  let canvas: HTMLCanvasElement | undefined;

  if (webcamConfig.enabled && webcamStream && webcamStream.getVideoTracks().length > 0) {
    // Create canvas compositor for Webcam PiP overlay
    canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });

    const screenVideo = document.createElement('video');
    screenVideo.srcObject = displayStream;
    screenVideo.muted = true;
    screenVideo.play().catch(() => {});

    const camVideo = document.createElement('video');
    camVideo.srcObject = webcamStream;
    camVideo.muted = true;
    camVideo.play().catch(() => {});

    // Wait for screen video dimensions
    await new Promise<void>((resolve) => {
      if (screenVideo.readyState >= 2) {
        resolve();
      } else {
        screenVideo.onloadedmetadata = () => resolve();
        setTimeout(resolve, 800); // fallback timeout
      }
    });

    const vWidth = screenVideo.videoWidth || idealWidth;
    const vHeight = screenVideo.videoHeight || idealHeight;
    canvas.width = vWidth;
    canvas.height = vHeight;

    const drawFrame = () => {
      if (!ctx) return;

      // Draw screen
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

      // Draw Webcam PiP
      if (camVideo.readyState >= 2) {
        let pipWidth = canvas.width * 0.22; // 22% of screen width
        if (webcamConfig.size === 'small') pipWidth = canvas.width * 0.16;
        if (webcamConfig.size === 'large') pipWidth = canvas.width * 0.28;

        const pipHeight = (pipWidth * 3) / 4; // 4:3 aspect ratio
        const margin = 28;

        let posX = canvas.width - pipWidth - margin;
        let posY = canvas.height - pipHeight - margin;

        if (webcamConfig.position === 'bottom-left') {
          posX = margin;
          posY = canvas.height - pipHeight - margin;
        } else if (webcamConfig.position === 'top-right') {
          posX = canvas.width - pipWidth - margin;
          posY = margin;
        } else if (webcamConfig.position === 'top-left') {
          posX = margin;
          posY = margin;
        }

        ctx.save();
        ctx.globalAlpha = webcamConfig.opacity || 1.0;

        // Shadow & Border
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        if (webcamConfig.shape === 'circle') {
          const radius = Math.min(pipWidth, pipHeight) / 2;
          const centerX = posX + radius;
          const centerY = posY + radius;

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();

          if (webcamConfig.mirrored) {
            ctx.translate(centerX * 2, 0);
            ctx.scale(-1, 1);
          }

          ctx.drawImage(camVideo, posX, posY, radius * 2, radius * 2);

          // Border stroke
          ctx.restore();
          ctx.save();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Rounded Rectangle
          const radius = webcamConfig.shape === 'square' ? 0 : 16;
          ctx.beginPath();
          ctx.roundRect(posX, posY, pipWidth, pipHeight, radius);
          ctx.closePath();
          ctx.clip();

          if (webcamConfig.mirrored) {
            ctx.translate(posX * 2 + pipWidth, 0);
            ctx.scale(-1, 1);
          }

          ctx.drawImage(camVideo, posX, posY, pipWidth, pipHeight);

          // Border stroke
          ctx.restore();
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(posX, posY, pipWidth, pipHeight, radius);
          ctx.stroke();
        }

        ctx.restore();
      }

      animFrameId = requestAnimationFrame(drawFrame);
    };

    animFrameId = requestAnimationFrame(drawFrame);
    const canvasStream = canvas.captureStream(videoConfig.frameRate || 30);
    recordingStream = new MediaStream();

    // Add composed video track
    canvasStream.getVideoTracks().forEach((track) => recordingStream.addTrack(track));
  } else {
    // Pure Direct screen recording (no compositing overhead)
    recordingStream = new MediaStream();
    displayStream.getVideoTracks().forEach((track) => recordingStream.addTrack(track));
  }

  // 6. Attach Audio Tracks to recording stream
  if (audioDestination && audioDestination.stream.getAudioTracks().length > 0) {
    audioDestination.stream.getAudioTracks().forEach((t) => recordingStream.addTrack(t));
  } else {
    // Fallback direct audio track attachment if AudioContext was unavailable
    if (audioConfig.systemAudioEnabled) {
      displayStream.getAudioTracks().forEach((t) => recordingStream.addTrack(t));
    }
    if (micStream) {
      micStream.getAudioTracks().forEach((t) => recordingStream.addTrack(t));
    }
  }

  // Cleanup handler
  const cleanup = () => {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (displayStream) {
      displayStream.getTracks().forEach((t) => t.stop());
    }
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
    }
    if (webcamStream) {
      webcamStream.getTracks().forEach((t) => t.stop());
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
    }
  };

  return {
    recordingStream,
    displayStream,
    micStream,
    webcamStream,
    cleanup,
    getAudioLevel,
    canvasElement: canvas,
    sourceLabel,
  };
}
