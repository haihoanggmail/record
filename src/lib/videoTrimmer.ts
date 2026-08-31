/**
 * Cắt một đoạn [startSec, endSec] ra khỏi video blob, xử lý hoàn toàn phía client
 * bằng cách phát lại đoạn cần cắt qua <video>.captureStream() rồi ghi lại bằng
 * MediaRecorder. Không cần upload server, không cần ffmpeg.wasm.
 *
 * Lưu ý: quá trình này chạy real-time (mất khoảng đúng bằng thời lượng đoạn cắt),
 * vì bản chất là "phát lại & ghi lại" chứ không phải cắt container tức thời.
 *
 * @param sourceBlob Blob video gốc (webm/mp4)
 * @param startSec   Thời điểm bắt đầu (giây)
 * @param endSec     Thời điểm kết thúc (giây)
 * @param mimeType   MIME type mong muốn cho output (mặc định giữ nguyên type của sourceBlob)
 * @param onProgress Callback báo tiến độ 0-100 (tùy chọn, để hiển thị loading UI)
 */
export function trimVideoBlob(
  sourceBlob: Blob,
  startSec: number,
  endSec: number,
  mimeType?: string,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (endSec <= startSec) {
      reject(new Error('Thời điểm kết thúc phải lớn hơn thời điểm bắt đầu.'));
      return;
    }

    const url = URL.createObjectURL(sourceBlob);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true; // tránh phát ra loa trong lúc xử lý ngầm, không ảnh hưởng track audio được ghi
    video.playsInline = true;

    const outputType = mimeType || (sourceBlob.type && sourceBlob.type !== '' ? sourceBlob.type : 'video/webm');
    const totalDuration = endSec - startSec;
    let recorder: MediaRecorder | null = null;
    let rafId: number | null = null;
    let cleaned = false;

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      URL.revokeObjectURL(url);
      video.pause();
      video.src = '';
    };

    const fail = (err: unknown) => {
      cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    video.onerror = () => fail(new Error('Không thể tải video để cắt.'));

    video.onloadedmetadata = () => {
      if (startSec >= video.duration) {
        fail(new Error('Thời điểm bắt đầu vượt quá thời lượng video.'));
        return;
      }
      video.currentTime = startSec;
    };

    video.onseeked = () => {
      try {
        const stream = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream
          ? (video as HTMLVideoElement & { captureStream: () => MediaStream }).captureStream()
          : (video as any).mozCaptureStream?.();

        if (!stream) {
          fail(new Error('Trình duyệt không hỗ trợ captureStream() để cắt video.'));
          return;
        }

        const chunks: Blob[] = [];
        let recorderOptions: MediaRecorderOptions = {};
        try {
          recorder = new MediaRecorder(stream, { mimeType: outputType });
          recorderOptions = { mimeType: outputType };
        } catch {
          // Fallback nếu trình duyệt không hỗ trợ đúng mimeType gốc
          recorder = new MediaRecorder(stream);
        }

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onerror = (e) => fail(e);

        recorder.onstop = () => {
          cleanup();
          resolve(new Blob(chunks, { type: recorderOptions.mimeType || outputType }));
        };

        recorder.start(250);
        video.play().catch((err) => fail(err));

        const tick = () => {
          if (!recorder || recorder.state === 'inactive') return;
          const played = video.currentTime - startSec;
          if (onProgress) {
            onProgress(Math.min(100, Math.round((played / totalDuration) * 100)));
          }
          if (video.currentTime >= endSec || video.ended) {
            recorder.stop();
            return;
          }
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
      } catch (err) {
        fail(err);
      }
    };
  });
}
