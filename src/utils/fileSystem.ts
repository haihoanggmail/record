/**
 * Utility for File System Access API & File Download helpers
 */

// Check if File System Access API is supported and usable
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export function isSaveFilePickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

/**
 * Open folder picker dialog for user to select a save destination
 */
export async function pickSaveDirectory(): Promise<{
  handle: FileSystemDirectoryHandle;
  name: string;
} | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('Trình duyệt không hỗ trợ File System Access API (hãy dùng Chrome, Edge hoặc Brave).');
  }

  try {
    // Show directory picker with readwrite mode
    const handle = await (window as any).showDirectoryPicker({
      id: 'screen_recorder_save_dir',
      mode: 'readwrite',
      startIn: 'videos',
    });
    return {
      handle,
      name: handle.name || 'Thư mục đã chọn',
    };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // User cancelled picker
      return null;
    }
    throw err;
  }
}

/**
 * Verify permission for directory handle
 */
export async function verifyDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  readWrite = true
): Promise<boolean> {
  const options = { mode: readWrite ? 'readwrite' : 'read' } as const;
  
  // Check if permission was already granted
  if ((await (handle as any).queryPermission(options)) === 'granted') {
    return true;
  }
  
  // Request permission if not yet granted
  if ((await (handle as any).requestPermission(options)) === 'granted') {
    return true;
  }
  
  return false;
}

/**
 * Save a Blob directly into the selected directory handle
 */
export async function writeBlobToDirectory(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
  blob: Blob
): Promise<{ filename: string; pathName: string }> {
  const hasPermission = await verifyDirectoryPermission(dirHandle, true);
  if (!hasPermission) {
    throw new Error(`Chưa có quyền ghi dữ liệu vào thư mục "${dirHandle.name}".`);
  }

  // Ensure unique filename if collision occurs
  let finalName = filename;
  let counter = 1;
  const nameParts = filename.split('.');
  const ext = nameParts.length > 1 ? `.${nameParts.pop()}` : '';
  const base = nameParts.join('.');

  while (true) {
    try {
      // Check if file exists without overwriting by default, or get create handle
      const fileHandle = await dirHandle.getFileHandle(finalName, { create: false });
      if (fileHandle) {
        finalName = `${base} (${counter})${ext}`;
        counter++;
      }
    } catch {
      // File doesn't exist yet, we can safely create it
      break;
    }
  }

  const fileHandle = await dirHandle.getFileHandle(finalName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();

  return {
    filename: finalName,
    pathName: `${dirHandle.name}/${finalName}`,
  };
}

/**
 * Fallback / Alternative: Prompt "Save As..." dialog directly for a single file
 */
export async function saveWithNativeSavePicker(
  blob: Blob,
  suggestedFilename: string
): Promise<string | null> {
  if (!isSaveFilePickerSupported()) {
    return null;
  }

  try {
    const isMp4 = suggestedFilename.endsWith('.mp4');
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: suggestedFilename,
      types: [
        {
          description: isMp4 ? 'Video MP4 (*.mp4)' : 'Video WebM (*.webm)',
          accept: isMp4
            ? { 'video/mp4': ['.mp4'] }
            : { 'video/webm': ['.webm'] },
        },
      ],
    });

    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();

    return handle.name;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return null;
    }
    throw err;
  }
}

/**
 * Standard browser download trigger
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Format bytes to readable size
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format duration in seconds to mm:ss or hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const paddedMins = mins.toString().padStart(2, '0');
  const paddedSecs = secs.toString().padStart(2, '0');

  if (hrs > 0) {
    const paddedHrs = hrs.toString().padStart(2, '0');
    return `${paddedHrs}:${paddedMins}:${paddedSecs}`;
  }
  return `${paddedMins}:${paddedSecs}`;
}

/**
 * Generate a clean default filename
 */
export function generateFilename(
  prefix = 'ScreenRecording',
  format: 'webm' | 'mp4' = 'webm'
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const mins = now.getMinutes().toString().padStart(2, '0');
  const secs = now.getSeconds().toString().padStart(2, '0');

  const sanitizedPrefix = prefix.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'ScreenRecording';
  return `${sanitizedPrefix}_${year}-${month}-${day}_${hours}-${mins}-${secs}.${format}`;
}

/**
 * Generate thumbnail image URL from a video blob
 */
export function generateThumbnailFromBlob(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(blob);
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      // Seek to 0.5s or 0 to grab an interesting frame
      video.currentTime = Math.min(0.5, video.duration > 0 ? video.duration / 2 : 0);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbUrl = canvas.toDataURL('image/jpeg', 0.85);
          URL.revokeObjectURL(video.src);
          resolve(thumbUrl);
          return;
        }
      } catch (err) {
        console.warn('Failed to capture canvas frame', err);
      }
      URL.revokeObjectURL(video.src);
      resolve('');
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve('');
    };
  });
}
