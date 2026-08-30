/**
 * Helper to prompt user to choose a default storage folder on their computer
 */
export async function promptChooseDirectory(): Promise<{ handle: any; name: string } | null> {
  if ('showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });
      return { handle: dirHandle, name: dirHandle.name || 'Thư mục đã chọn' };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return null; // user canceled
      }
      console.warn('showDirectoryPicker failed:', err);
      throw err;
    }
  }
  return null;
}

/**
 * Verify / Request readwrite permission for a saved directory handle
 */
export async function verifyDirectoryPermission(dirHandle: any): Promise<boolean> {
  if (!dirHandle) return false;
  const options = { mode: 'readwrite' };
  try {
    if (typeof dirHandle.queryPermission === 'function') {
      const status = await dirHandle.queryPermission(options);
      if (status === 'granted') return true;
    }
    if (typeof dirHandle.requestPermission === 'function') {
      const status = await dirHandle.requestPermission(options);
      return status === 'granted';
    }
    return true;
  } catch (err) {
    console.warn('verifyDirectoryPermission error:', err);
    return false;
  }
}

/**
 * Write a file directly into a chosen Directory Handle without prompting dialog
 */
export async function saveFileToDirectoryHandle(
  dirHandle: any,
  blob: Blob,
  fileName: string
): Promise<boolean> {
  try {
    const hasPerm = await verifyDirectoryPermission(dirHandle);
    if (!hasPerm) return false;

    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (err) {
    console.warn('Failed to write directly to directory handle:', err);
    return false;
  }
}

/**
 * Helper to save video blob directly to user's computer
 * Uses File System Access API (showSaveFilePicker) with fallback to <a> download
 */
export async function saveVideoToFile(
  blob: Blob,
  suggestedFileName: string,
  preferredExtension: 'webm' | 'mp4' = 'webm',
  dirHandle?: any
): Promise<{ success: boolean; method: 'directory' | 'picker' | 'download'; fileName: string; folderName?: string }> {
  const ext = preferredExtension;
  const fileName = suggestedFileName.endsWith(`.${ext}`) ? suggestedFileName : `${suggestedFileName}.${ext}`;

  // If a default directory handle is provided, try saving directly into it first!
  if (dirHandle) {
    try {
      const directSaved = await saveFileToDirectoryHandle(dirHandle, blob, fileName);
      if (directSaved) {
        return {
          success: true,
          method: 'directory',
          fileName,
          folderName: dirHandle.name || 'Thư mục mặc định',
        };
      }
    } catch (err) {
      console.warn('Direct directory save failed, trying fallback picker/download:', err);
    }
  }

  // Check if File System Access API is supported and not restricted by iframe
  if ('showSaveFilePicker' in window) {
    try {
      const mimeType = ext === 'mp4' ? 'video/mp4' : 'video/webm';
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: ext === 'mp4' ? 'MP4 Video' : 'WebM Video',
            accept: {
              [mimeType]: [`.${ext}`],
            },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      return { success: true, method: 'picker', fileName: handle?.name || fileName };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User cancelled save dialog
        throw err;
      }
      console.warn('showSaveFilePicker failed or was blocked, falling back to download:', err);
      // Fallback to direct download
    }
  }

  // Fallback: standard automatic download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);

  return { success: true, method: 'download', fileName };
}

/**
 * Capture a high-resolution screenshot frame from a video element
 */
export function captureFrameFromVideo(videoElement: HTMLVideoElement): { dataUrl: string; blob: Promise<Blob> } {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth || 1920;
  canvas.height = videoElement.videoHeight || 1080;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  }

  const dataUrl = canvas.toDataURL('image/png');

  const blobPromise = new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to create snapshot blob'));
    }, 'image/png');
  });

  return { dataUrl, blob: blobPromise };
}

/**
 * Download an image blob or dataUrl as PNG file
 */
export function downloadImage(dataUrlOrBlob: string | Blob, fileName: string) {
  const url = typeof dataUrlOrBlob === 'string' ? dataUrlOrBlob : URL.createObjectURL(dataUrlOrBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    if (typeof dataUrlOrBlob !== 'string') {
      URL.revokeObjectURL(url);
    }
  }, 500);
}

/**
 * Download any blob as a file (generic version of downloadImage, for wav/webm/etc.)
 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Extract the audio track from a recorded video Blob and encode it as a
 * standard 16-bit PCM WAV file. Chrome's MediaRecorder cannot produce .wav
 * directly, so we decode the audio with the Web Audio API and hand-write
 * the WAV container ourselves.
 */
export async function extractAudioAsWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioContextClass();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    audioContext.close().catch(() => {});
  }

  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;

  // Interleave channels
  const interleaved = new Float32Array(numFrames * numChannels);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < numFrames; i++) {
      interleaved[i * numChannels + channel] = channelData[i];
    }
  }

  // Encode as 16-bit PCM WAV
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = interleaved.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Format seconds to HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number): string {
  const sec = Math.max(0, Math.floor(seconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format bytes to readable string (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format timestamp to readable date/time string in Vietnamese
 */
export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
