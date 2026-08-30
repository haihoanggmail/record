export type RecordingStatus = 'idle' | 'countdown' | 'recording' | 'paused' | 'finished';

export type AppTheme = 'light' | 'dark';

export type VideoResolution = 'original' | '1080p' | '720p' | '4k';
export type VideoFrameRate = 30 | 60;
export type VideoBitrate = 'standard' | 'high' | 'ultra';
export type VideoOutputFormat = 'webm' | 'mp4';

export type WebcamPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export type WebcamShape = 'rounded' | 'circle' | 'square';
export type WebcamSize = 'small' | 'medium' | 'large';

export interface WebcamConfig {
  enabled: boolean;
  deviceId: string;
  position: WebcamPosition;
  shape: WebcamShape;
  size: WebcamSize;
  mirrored: boolean;
  opacity: number;
}

export interface AudioConfig {
  micEnabled: boolean;
  micDeviceId: string;
  micVolume: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  systemAudioEnabled: boolean;
}

export interface VideoConfig {
  resolution: VideoResolution;
  frameRate: VideoFrameRate;
  bitrate: VideoBitrate;
  countdownSeconds: number; // 0, 3, 5, 10
  outputFormat: VideoOutputFormat;
}

export interface StoredRecording {
  id: string;
  name: string;
  blob: Blob;
  mimeType: string;
  duration: number; // seconds
  size: number; // bytes
  createdAt: number; // timestamp
  thumbnail?: string; // base64 / blob url
  width: number;
  height: number;
  fps: number;
  sourceType?: string;
  savedToDiskPath?: string;
}

export interface MediaDeviceInfoOption {
  deviceId: string;
  label: string;
}

export interface DefaultDirectoryInfo {
  handle: any | null;
  name: string | null;
}
