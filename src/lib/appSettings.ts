import { getDefaultDirectoryHandle } from './indexedDb';

const ASK_BEFORE_SAVE_KEY = 'hachihi_recorder_ask_before_save';

/**
 * true  = luôn mở hộp thoại "Lưu tệp" để người dùng chọn lại nơi lưu / tên file mỗi lần lưu
 * false = (mặc định) tự động lưu thẳng vào thư mục mặc định đã chọn (nếu có), không hỏi lại
 */
export function getAskBeforeSave(): boolean {
  try {
    return localStorage.getItem(ASK_BEFORE_SAVE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAskBeforeSave(value: boolean): void {
  try {
    localStorage.setItem(ASK_BEFORE_SAVE_KEY, value ? '1' : '0');
  } catch {
    // localStorage không khả dụng (chế độ ẩn danh, v.v.) - bỏ qua an toàn
  }
}

/**
 * Trả về directory handle nên dùng khi lưu file:
 * - Nếu người dùng bật "Hỏi lại mỗi khi lưu" -> luôn trả về undefined để bắt buộc
 *   mở hộp thoại Save As, cho phép chọn lại nơi lưu / tên file.
 * - Ngược lại (mặc định) -> dùng thư mục mặc định đã lưu trước đó (nếu có).
 */
export async function resolveSaveDirectoryHandle(): Promise<FileSystemDirectoryHandle | undefined> {
  if (getAskBeforeSave()) return undefined;
  try {
    const dirInfo = await getDefaultDirectoryHandle();
    return dirInfo?.handle;
  } catch {
    return undefined;
  }
}
