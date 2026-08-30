/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { RecorderStudio } from './components/RecorderStudio';
import { RecordingsLibraryModal } from './components/RecordingsLibraryModal';
import { GuideModal } from './components/GuideModal';
import { StoredRecording, AppTheme, RecordingStatus, DefaultDirectoryInfo } from './types';
import {
  getAllRecordingsFromDb,
  deleteRecordingFromDb,
  updateRecordingNameInDb,
  clearAllRecordingsFromDb,
  getDefaultDirectoryHandle,
  saveDefaultDirectoryHandle,
  clearDefaultDirectoryHandle,
} from './lib/indexedDb';
import { promptChooseDirectory } from './lib/fileSaver';
import { Phone, ExternalLink } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('hachihi_record_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light'; // Default to clean modern Hachihi Blue & White
  });

  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [defaultDirectory, setDefaultDirectory] = useState<DefaultDirectoryInfo>({
    handle: null,
    name: null,
  });

  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [recordings, setRecordings] = useState<StoredRecording[]>([]);

  // Apply theme class to <html> element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('hachihi_record_theme', theme);
  }, [theme]);

  // Load default directory handle on startup
  useEffect(() => {
    async function loadDirectory() {
      try {
        const dir = await getDefaultDirectoryHandle();
        if (dir && dir.name) {
          setDefaultDirectory(dir);
        }
      } catch (err) {
        console.warn('Could not retrieve default directory handle:', err);
      }
    }
    loadDirectory();
  }, []);

  // Refresh saved recordings from local IndexedDB
  const refreshRecordings = async () => {
    try {
      const items = await getAllRecordingsFromDb();
      setRecordings(items);
    } catch (err) {
      console.warn('Could not load recordings from IndexedDB:', err);
    }
  };

  useEffect(() => {
    refreshRecordings();
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSelectDefaultDirectory = async () => {
    try {
      const res = await promptChooseDirectory();
      if (res && res.handle) {
        await saveDefaultDirectoryHandle(res.handle, res.name);
        setDefaultDirectory({ handle: res.handle, name: res.name });
      }
    } catch (err) {
      console.warn('Error choosing directory:', err);
    }
  };

  const handleClearDefaultDirectory = async () => {
    try {
      await clearDefaultDirectoryHandle();
      setDefaultDirectory({ handle: null, name: null });
    } catch (err) {
      console.warn('Error clearing directory handle:', err);
    }
  };

  const handleDeleteRecording = async (id: string) => {
    await deleteRecordingFromDb(id);
    await refreshRecordings();
  };

  const handleRenameRecording = async (id: string, newName: string) => {
    await updateRecordingNameInDb(id, newName);
    await refreshRecordings();
  };

  const handleClearAllRecordings = async () => {
    await clearAllRecordingsFromDb();
    await refreshRecordings();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 selection:bg-sky-500/20 selection:text-sky-700 dark:selection:text-sky-300">
      {/* App Header */}
      <Header
        status={status}
        savedCount={recordings.length}
        theme={theme}
        defaultDirectory={defaultDirectory}
        onToggleTheme={handleToggleTheme}
        onSelectDefaultDirectory={handleSelectDefaultDirectory}
        onClearDefaultDirectory={handleClearDefaultDirectory}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Main Studio View */}
      <main className="flex-1">
        <RecorderStudio
          onRefreshSavedCount={refreshRecordings}
          onOpenGuide={() => setIsGuideOpen(true)}
          onStatusChange={setStatus}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-6 bg-white dark:bg-slate-950/60 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="font-bold text-sky-600 dark:text-sky-400">Record</span>
            <span>•</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Phát triển bởi hachihi.vn</span>
            <span>•</span>
            <a
              href="tel:0918001944"
              className="text-sky-600 dark:text-sky-400 hover:underline font-bold inline-flex items-center gap-1"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Hải Hoàng 09-1800-1944</span>
            </a>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Dữ liệu ghi hình xử lý 100% cục bộ trên trình duyệt • Bảo mật & Miễn phí
          </div>
        </div>
      </footer>

      {/* Recordings Library Modal */}
      {isLibraryOpen && (
        <RecordingsLibraryModal
          recordings={recordings}
          onClose={() => setIsLibraryOpen(false)}
          onDelete={handleDeleteRecording}
          onRename={handleRenameRecording}
          onClearAll={handleClearAllRecordings}
        />
      )}

      {/* Guide Modal */}
      {isGuideOpen && <GuideModal onClose={() => setIsGuideOpen(false)} />}
    </div>
  );
}
