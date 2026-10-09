import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sun,
  Moon,
  Laptop,
  ArrowDownToLine,
  FileText,
  PlayCircle,
  HardDrive,
  Folder,
  Check,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  Save,
  Trash2,
  ExternalLink,
  ChevronRight,
  X,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  LogIn,
} from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import {
  AppSettings,
  DuplicateHandling,
  PlaybackSpeed,
  ThemeMode,
} from '../../types';
import { DEFAULT_SETTINGS, MOCK_DESTINATION_FOLDERS } from '../../data/mockData';
import type { StorageSnapshot } from '../../../../shared/desktop';
import type { DirectoryGrant } from '../../../../shared/downloads';

interface SettingsViewProps {
  initialSettings: AppSettings;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onNavigateToTab: (tab: string) => void;
  onShowDiscreetToast: (msg: string) => void;
  onDestinationGrant?: (grant: DirectoryGrant) => void;
}

const SECTION_IDS = [
  { id: 'appearance', label: 'Appearance', icon: Sun },
  { id: 'downloads', label: 'Downloads', icon: ArrowDownToLine },
  { id: 'account', label: 'Account & Auth', icon: KeyRound },
  { id: 'playback', label: 'Playback', icon: PlayCircle },
  { id: 'storage', label: 'Storage', icon: HardDrive },
];

const VALID_FILENAME_TOKENS = ['channel', 'title', 'date', 'eid'] as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return `${value.toFixed(1)} ${units[unit]}`;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  initialSettings,
  onSaveSettings,
  onNavigateToTab,
  onShowDiscreetToast,
  onDestinationGrant,
}) => {
  const { themeMode, setThemeMode } = useTheme();
  const nativeMode = Boolean(window.castboxDesktop);
  const [storageSnapshot, setStorageSnapshot] = useState<StorageSnapshot | null>(null);
  const [storageBusy, setStorageBusy] = useState(false);

  // Settings form state
  const [formData, setFormData] = useState<AppSettings>(initialSettings);
  const [savedBaseline, setSavedBaseline] = useState<AppSettings>(initialSettings);

  // Active section in view for navigation highlighting
  const [activeSection, setActiveSection] = useState<string>('appearance');

  // Modals state
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [selectedMockFolder, setSelectedMockFolder] = useState(formData.downloadDestination);
  const [customFolderPath, setCustomFolderPath] = useState('');

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isClearCacheModalOpen, setIsClearCacheModalOpen] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  // Storage cache mock state
  const [cacheSizeMB, setCacheSizeMB] = useState<number>(() => {
    if (window.castboxDesktop) return 0;
    try {
      const stored = localStorage.getItem('castbox-mock-cache-mb');
      return stored !== null ? Number(stored) : 186;
    } catch {
      return 186;
    }
  });

  // Track if saved recently for feedback badge
  const [justSaved, setJustSaved] = useState(false);

  // Reference for scrolling
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Sync form data if initialSettings changes externally
  useEffect(() => {
    setFormData(initialSettings);
    setSavedBaseline(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    if (!nativeMode) return;
    let current = true;
    void window.castboxDesktop!.storage.read().then(result => {
      if (!current) return;
      if (result.ok) setStorageSnapshot(result.value);
      else onShowDiscreetToast(result.error);
    });
    return () => { current = false; };
  }, [nativeMode, formData.downloadDestination]);

  // Token Validation for filename format
  const { invalidTokens, detectedTokens, hasTokenErrors, previewFilename } = useMemo(() => {
    const pattern = formData.filenamePattern || '';
    // Find all {token} occurrences
    const matches = Array.from(pattern.matchAll(/\{([^}]+)\}/g));
    const tokens = matches.map((m) => m[1]);
    const invalid = tokens.filter(
      (tok) => !VALID_FILENAME_TOKENS.includes(tok as (typeof VALID_FILENAME_TOKENS)[number])
    );

    // Generate live preview using realistic sample episode metadata
    const sampleChannel = 'Just Coffee & Me';
    const sampleTitle = 'Almost';
    const sampleDate = '2026-10-06';
    const sampleEid = 'ep-278';

    let resolved = pattern
      .replace(/\{channel\}/g, sampleChannel)
      .replace(/\{title\}/g, sampleTitle)
      .replace(/\{date\}/g, sampleDate)
      .replace(/\{eid\}/g, sampleEid);

    // If no .mp3 at the end, append .mp3 for realistic display
    if (!resolved.endsWith('.mp3') && !resolved.endsWith('.m4a')) {
      resolved += '.mp3';
    }

    return {
      invalidTokens: Array.from(new Set(invalid)),
      detectedTokens: tokens,
      hasTokenErrors: invalid.length > 0,
      previewFilename: resolved,
    };
  }, [formData.filenamePattern]);

  // Check dirty state (excluding appearance which is immediately applied via ThemeContext)
  const isDirty = useMemo(() => {
    return (
      formData.downloadConcurrency !== savedBaseline.downloadConcurrency ||
      formData.downloadDestination !== savedBaseline.downloadDestination ||
      formData.groupEpisodesByChannel !== savedBaseline.groupEpisodesByChannel ||
      formData.duplicateHandling !== savedBaseline.duplicateHandling ||
      formData.filenamePattern !== savedBaseline.filenamePattern ||
      formData.defaultPlaybackSpeed !== savedBaseline.defaultPlaybackSpeed ||
      formData.skipForwardSeconds !== savedBaseline.skipForwardSeconds ||
      formData.skipBackwardSeconds !== savedBaseline.skipBackwardSeconds ||
      formData.autoPlayNextInQueue !== savedBaseline.autoPlayNextInQueue ||
      formData.continuousPlayback !== savedBaseline.continuousPlayback
    );
  }, [formData, savedBaseline]);

  // Setup scroll spy for section highlighting
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180; // Offset for header + comfort
      let currentSection = SECTION_IDS[0].id;

      for (const section of SECTION_IDS) {
        const el = sectionRefs.current[section.id];
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            currentSection = section.id;
          }
        }
      }

      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFolderPickerOpen) setIsFolderPickerOpen(false);
        if (isResetModalOpen) setIsResetModalOpen(false);
        if (isClearCacheModalOpen) setIsClearCacheModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFolderPickerOpen, isResetModalOpen, isClearCacheModalOpen]);

  // Smooth scroll to section
  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      const yOffset = -80; // Header height allowance
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  // A successful toast is shown only after the backend acknowledges the write.
  const [isSaving, setIsSaving] = useState(false);
  const handleSave = async () => {
    if (hasTokenErrors || isSaving) return;
    setIsSaving(true);
    try {
      await onSaveSettings(formData);
      setSavedBaseline(formData);
      setJustSaved(true);
      onShowDiscreetToast('Settings saved successfully');
      setTimeout(() => setJustSaved(false), 3000);
    } catch (error) {
      onShowDiscreetToast(error instanceof Error ? error.message : 'Settings could not be saved');
    } finally { setIsSaving(false); }
  };

  const handleConfirmReset = async () => {
    if (isSaving) return;
    const defaults = { ...DEFAULT_SETTINGS, downloadDestination: initialSettings.downloadDestination };
    setIsSaving(true);
    try {
      await onSaveSettings(defaults);
      setFormData(defaults);
      setSavedBaseline(defaults);
      setIsResetModalOpen(false);
      setJustSaved(true);
      onShowDiscreetToast('Settings restored to defaults');
      setTimeout(() => setJustSaved(false), 3000);
    } catch (error) {
      onShowDiscreetToast(error instanceof Error ? error.message : 'Settings could not be saved');
    } finally { setIsSaving(false); }
  };

  const handleChooseDirectory = async () => {
    if (!window.castboxDesktop) {
      setSelectedMockFolder(formData.downloadDestination);
      setIsFolderPickerOpen(true);
      return;
    }
    try {
      const result = await window.castboxDesktop.chooseDownloadDirectory();
      if (!result.ok) throw new Error(result.error);
      if (result.value) { setFormData(prev => ({ ...prev, downloadDestination: result.value!.path })); onDestinationGrant?.(result.value); }
    } catch (error) {
      onShowDiscreetToast(error instanceof Error ? error.message : 'Folder selection failed');
    }
  };

  const handleWebLogin = async () => {
    if (!window.castboxDesktop?.loginWeb) return;
    setLoggingIn(true);
    try {
      const result = await window.castboxDesktop.loginWeb();
      if (!result.ok) throw new Error(result.error);
      if (result.value) {
        setFormData(prev => ({
          ...prev,
          userToken: result.value!.userToken,
          userTokenSecret: result.value!.userTokenSecret ?? '',
        }));
        setSavedBaseline(prev => ({
          ...prev,
          userToken: result.value!.userToken,
          userTokenSecret: result.value!.userTokenSecret ?? '',
        }));
        onShowDiscreetToast('Castbox account connected successfully.');
      }
    } catch (error) {
      onShowDiscreetToast(error instanceof Error ? error.message : 'Web login was not completed.');
    } finally {
      setLoggingIn(false);
    }
  };

  // Clear cache handler
  const handleConfirmClearCache = () => {
    if (nativeMode) {
      setStorageBusy(true);
      void window.castboxDesktop!.storage.clearCache().then(result => {
        if (!result.ok) throw new Error(result.error);
        setStorageSnapshot(result.value);
        setIsClearCacheModalOpen(false);
        onShowDiscreetToast('Temporary network cache cleared. Downloaded episodes were kept.');
      }).catch(error => onShowDiscreetToast(error instanceof Error ? error.message : 'Unable to clear the cache.'))
        .finally(() => setStorageBusy(false));
      return;
    }
    setCacheSizeMB(0);
    try {
      localStorage.setItem('castbox-mock-cache-mb', '0');
    } catch {
      // Ignore
    }
    setIsClearCacheModalOpen(false);
    onShowDiscreetToast('Stream and artwork cache cleared (186 MB freed)');
  };

  // Helper to insert a token into filename pattern
  const handleInsertToken = (token: string) => {
    const tokenStr = `{${token}}`;
    setFormData((prev) => {
      // If ends with a separator or slash, simply append
      const current = prev.filenamePattern.trim();
      let updated = current;
      if (!current.includes(tokenStr)) {
        const extension = current.match(/\.(mp3|m4a|aac|ogg|opus|wav|flac)$/i)?.[0];
        if (extension) {
          const withoutExt = current.slice(0, -extension.length);
          updated = `${withoutExt} - ${tokenStr}${extension}`;
        } else {
          updated = `${current} - ${tokenStr}`;
        }
      }
      return { ...prev, filenamePattern: updated };
    });
  };

  // Apply folder selection from modal
  const handleApplyFolder = () => {
    const chosen = customFolderPath.trim() || selectedMockFolder;
    setFormData((prev) => ({ ...prev, downloadDestination: chosen }));
    setIsFolderPickerOpen(false);
    setCustomFolderPath('');
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-0 pt-8 pb-36">

      {/* Unified Layout: Sticky Left Navigation & Right Content */}
      <div className="flex flex-col md:flex-row gap-8 lg:gap-[54px] items-start">
        {/* Left Section Navigation (Sticky Sidebar) */}
        <nav
          aria-label="Settings Sections"
          className="w-full md:w-56 lg:w-[273px] shrink-0 md:sticky md:top-20 z-10 bg-[var(--app-bg)] pb-2 md:border-r md:border-[var(--app-border)] md:pr-6 md:min-h-[calc(100vh-156px)]"
        >
          {/* Desktop Vertical Nav */}
          <div className="hidden md:flex flex-col space-y-1">
            {SECTION_IDS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all text-left cursor-pointer ${
                    isActive
                    ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)] font-semibold'
                      : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg)]/50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-muted)]'
                    }`}
                  />
                  <span>{sec.label}</span>
                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-[var(--app-accent)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile Horizontal Section Tabs */}
          <div className="flex md:hidden overflow-x-auto gap-2 pb-2 scrollbar-none">
            {SECTION_IDS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[var(--app-accent)] text-white'
                      : 'bg-[var(--app-input-bg)] text-[var(--app-text-secondary)] border border-[var(--app-border)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right Form Content - Unified scrolling page */}
        <div className="flex-1 w-full space-y-0">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[var(--app-text-primary)] mb-2">
            Settings
          </h1>
          {/* ========================================================= */}
          {/* SECTION 1: APPEARANCE */}
          {/* ========================================================= */}
          <section
            id="appearance"
            ref={(el) => {
              sectionRefs.current['appearance'] = el;
            }}
            className="scroll-mt-24 py-5 border-b border-[var(--app-border)]"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--app-text-primary)]">Appearance</h2>
                <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] mt-0.5">Choose how the application looks.</p>
              </div>
              <div role="group" aria-label="Theme Mode" className="inline-flex w-full sm:w-auto lg:w-[360px] rounded-xl border border-[var(--app-border)] overflow-hidden bg-[var(--app-input-bg)]">
                {([
                  { mode: 'light' as const, label: 'Light', Icon: Sun },
                  { mode: 'dark' as const, label: 'Dark', Icon: Moon },
                  { mode: 'system' as const, label: 'System', Icon: Laptop },
                ]).map(({ mode, label, Icon }) => (
                  <button key={mode} type="button" aria-pressed={themeMode === mode} onClick={() => setThemeMode(mode)}
                    className={`flex-1 min-w-0 inline-flex items-center justify-center gap-2 h-11 px-3 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--app-accent)] ${themeMode === mode ? 'bg-[var(--app-accent)] text-white' : 'text-[var(--app-text-primary)] hover:bg-[var(--app-bg)]'}`}>
                    <Icon className="w-5 h-5" />{label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION 2: DOWNLOADS */}
          {/* ========================================================= */}
          <section
            id="downloads"
            ref={(el) => {
              sectionRefs.current['downloads'] = el;
            }}
            className="scroll-mt-24 py-5 border-b border-[var(--app-border)]"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="hidden">
                <ArrowDownToLine className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--app-text-primary)]">
                  Downloads
                </h2>
                <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] mt-0.5">
                  Configure concurrency, destination folder, and duplicate handling.
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-[var(--app-border)]">
              <div className="grid lg:grid-cols-[340px_1fr] items-center gap-4 py-3 border-b border-[var(--app-border)]">
                <label htmlFor="downloadConcurrency" className="text-sm font-medium text-[var(--app-text-primary)]">Workers</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <select id="downloadConcurrency" value={formData.downloadConcurrency} onChange={event => setFormData(prev => ({ ...prev, downloadConcurrency: Number(event.target.value) }))} className="w-full sm:max-w-[370px] h-11 px-3 rounded-lg bg-[var(--app-input-bg)] border border-[var(--app-border)] text-sm text-[var(--app-text-primary)]">
                    {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <span className="text-xs text-[var(--app-text-secondary)]">Choose 1 for sequential downloads.</span>
                </div>
              </div>

              <div className="grid lg:grid-cols-[340px_1fr] items-center gap-4 py-3 border-b border-[var(--app-border)]">
                <div>
                  <label className="text-sm font-medium text-[var(--app-text-primary)] block">Save location</label>
                  {nativeMode && <p className="text-xs text-[var(--app-text-secondary)] mt-1">Existing downloads stay in their current locations.</p>}
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-1 min-w-0 flex items-center gap-2.5 px-3 h-11 rounded-lg bg-[var(--app-input-bg)] border border-[var(--app-border)] text-sm text-[var(--app-text-primary)] font-mono">
                    <Folder className="w-4 h-4 text-[var(--app-accent)] shrink-0" /><span className="truncate">{formData.downloadDestination}</span>
                  </div>
                  <button type="button" onClick={handleChooseDirectory} className="h-11 px-4 text-sm font-medium rounded-lg bg-[var(--app-input-bg)] border border-[var(--app-border)] text-[var(--app-text-primary)] hover:border-[var(--app-accent)] transition-colors cursor-pointer shrink-0">Change...</button>
                </div>
              </div>

              <div className="grid lg:grid-cols-[340px_1fr] items-center gap-4 py-3 border-b border-[var(--app-border)]">
                <label className="text-sm font-medium text-[var(--app-text-primary)]">Group files by channel</label>
                <div className="flex items-center gap-4">
                  <button type="button" role="switch" aria-label="Group files by channel" aria-checked={formData.groupEpisodesByChannel} onClick={() => setFormData(prev => ({ ...prev, groupEpisodesByChannel: !prev.groupEpisodesByChannel }))} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${formData.groupEpisodesByChannel ? 'bg-[var(--app-accent)]' : 'bg-[var(--app-border)]'}`}>
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${formData.groupEpisodesByChannel ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-sm text-[var(--app-text-secondary)]">Save episodes in a separate folder for each channel.</span>
                </div>
              </div>

              <div className="grid lg:grid-cols-[340px_1fr] items-center gap-4 py-3 border-t border-[var(--app-border)]">
                <label className="text-sm font-medium text-[var(--app-text-primary)]">Skip existing downloads</label>
                <div className="flex items-center gap-4">
                  <button type="button" role="switch" aria-label="Skip existing downloads" aria-checked={formData.duplicateHandling === 'skip'} onClick={() => setFormData(prev => ({ ...prev, duplicateHandling: prev.duplicateHandling === 'skip' ? 'rename' : 'skip' }))} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${formData.duplicateHandling === 'skip' ? 'bg-[var(--app-accent)]' : 'bg-[var(--app-border)]'}`}>
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${formData.duplicateHandling === 'skip' ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-sm text-[var(--app-text-secondary)]">Don't download episodes that already exist.</span>
                </div>
              </div>
              {formData.duplicateHandling !== 'skip' && (
                <div className="grid lg:grid-cols-[340px_1fr] items-center gap-4 py-3 border-t border-[var(--app-border)]">
                  <label htmlFor="duplicateHandling" className="text-sm font-medium text-[var(--app-text-primary)]">When not skipping</label>
                  <select id="duplicateHandling" value={formData.duplicateHandling} onChange={event => setFormData(prev => ({ ...prev, duplicateHandling: event.target.value as DuplicateHandling }))} className="w-full sm:max-w-[370px] h-11 px-3 rounded-lg bg-[var(--app-input-bg)] border border-[var(--app-border)] text-sm text-[var(--app-text-primary)]">
                    <option value="overwrite">Replace existing file</option><option value="rename">Save with a new name</option>
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION 3: FILENAME FORMAT */}
          {/* ========================================================= */}
          <section
            id="filename"
            ref={(el) => {
              sectionRefs.current['filename'] = el;
            }}
            className="scroll-mt-24 py-5 border-b border-[var(--app-border)]"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="hidden">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--app-text-primary)]">
                  File naming
                </h2>
                <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] mt-0.5">
                  Define tokens for audio files. Validate tokens with live preview; unknown tokens disable saving.
                </p>
              </div>
            </div>

            <div className="mt-3 pt-4 border-t border-[var(--app-border)] space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_150px] items-center gap-3">
                <label htmlFor="filenamePatternInput" className="text-sm font-medium text-[var(--app-text-primary)]">Filename format</label>
                <input
                  id="filenamePatternInput"
                  type="text"
                  value={formData.filenamePattern.replace(/\.(mp3|m4a|aac|ogg|opus|wav|flac)$/i, '')}
                  onChange={(event) => setFormData((prev) => {
                    const extension = prev.filenamePattern.match(/\.(mp3|m4a|aac|ogg|opus|wav|flac)$/i)?.[0] || '.mp3';
                    return { ...prev, filenamePattern: `${event.target.value}${extension}` };
                  })}
                  aria-invalid={hasTokenErrors}
                  className={`min-w-0 h-11 px-3.5 rounded-lg font-mono text-sm bg-[var(--app-input-bg)] border outline-none ${hasTokenErrors ? 'border-red-500 text-red-700 dark:text-red-300' : 'border-[var(--app-border)] text-[var(--app-text-primary)] focus:border-[var(--app-accent)]'}`}
                />
                <div className="flex items-center justify-between gap-2 text-sm text-[var(--app-text-secondary)]">
                  <span>Extension</span>
                  <span className="px-3 h-11 inline-flex items-center rounded-lg bg-[var(--app-input-bg)] border border-[var(--app-border)] font-mono">{formData.filenamePattern.match(/\.(mp3|m4a|aac|ogg|opus|wav|flac)$/i)?.[0] || '.mp3'}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--app-text-muted)]">
                <span className="mr-1">Insert tokens:</span>
                {VALID_FILENAME_TOKENS.map((token) => (
                  <button key={token} type="button" onClick={() => handleInsertToken(token)} className="px-3 py-1.5 rounded-full bg-[var(--app-input-bg)] border border-[var(--app-border)] font-mono hover:border-[var(--app-accent)] hover:text-[var(--app-accent)] cursor-pointer" aria-label={`Insert ${token} token`}>
                    {`{${token}}`}
                  </button>
                ))}
              </div>

              {hasTokenErrors && (
                <div role="alert" className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Unknown token: {invalidTokens.map((token) => `{${token}}`).join(', ')}. Use channel, title, date, or eid.</span>
                </div>
              )}

              <div className="grid grid-cols-[240px_minmax(0,1fr)] items-center gap-3 text-sm">
                <span className="font-medium text-[var(--app-text-primary)]">Preview</span>
                <div className="min-w-0 px-3 h-11 flex items-center rounded-lg bg-[var(--app-input-bg)] border border-[var(--app-border)] font-mono text-sm text-[var(--app-text-secondary)] truncate" title={hasTokenErrors ? 'Invalid filename pattern' : previewFilename}>
                  {hasTokenErrors ? 'Invalid filename pattern' : previewFilename}
                </div>
              </div>
              <p className="text-xs text-[var(--app-text-muted)] lg:ml-[253px]">Applies to new downloads only.</p>
            </div>
          </section>

          {/* ========================================================= */}
          {/* BOTTOM STICKY ACTION BAR: SAVE CHANGES & RESET */}
          {/* ========================================================= */}
          <div className="mt-2 py-2 border-t border-[var(--app-border)] flex justify-end">
            {/* Status indicators */}
            <div className="sr-only flex items-center gap-2.5 text-xs">
              {hasTokenErrors ? (
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Unknown token in filename pattern</span>
                </div>
              ) : isDirty ? (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>You have unsaved changes</span>
                </div>
              ) : justSaved ? (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Settings saved successfully</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[var(--app-text-muted)]">
                  <Check className="w-3.5 h-3.5" />
                  <span>All preferences saved</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                disabled={hasTokenErrors || isSaving}
                onClick={handleSave}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs ${
                  !hasTokenErrors && !isSaving
                    ? 'bg-[var(--app-accent)] hover:bg-[var(--app-accent)]/90 text-white'
                    : 'bg-[var(--app-input-bg)] text-[var(--app-text-muted)] border border-[var(--app-border)] cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>Save changes</span>
              </button>

              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-input-bg)] border border-transparent transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to defaults</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION: CASTBOX ACCOUNT & AUTH */}
          {/* ========================================================= */}
          <section
            id="account"
            ref={(el) => {
              sectionRefs.current['account'] = el;
            }}
            className="scroll-mt-24 py-5 border-b border-[var(--app-border)]"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--app-text-primary)]">
                  Castbox Account & Authentication
                </h2>
                <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] mt-0.5">
                  Configure your personal Castbox token for authenticated access, private episodes, and higher rate limits.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {formData.userToken?.trim() ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Authenticated
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--app-input-bg)] text-[var(--app-text-muted)] border border-[var(--app-border)]">
                    Anonymous Mode
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[var(--app-border)] space-y-6">
              {nativeMode && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[var(--app-card-bg)] border border-[var(--app-border)]">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--app-text-primary)]">
                      1-Click Web Login
                    </h3>
                    <p className="text-xs text-[var(--app-text-secondary)] mt-0.5">
                      Log in to Castbox in a secure browser window. Your session token is captured automatically.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleWebLogin}
                    disabled={loggingIn}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--app-accent)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-sm shrink-0"
                  >
                    <LogIn className="w-4 h-4" />
                    {loggingIn ? 'Connecting...' : 'Log in via Castbox Web'}
                  </button>
                </div>
              )}

              {/* Access Token */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-[var(--app-text-primary)] block">
                    Castbox Access Token (<code className="text-xs font-mono">x-access-token</code>)
                  </label>
                  {formData.userToken?.trim() && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, userToken: '', userTokenSecret: '' }))}
                      className="text-xs text-[var(--app-accent)] hover:underline cursor-pointer"
                    >
                      Clear session
                    </button>
                  )}
                </div>
                <p className="text-xs text-[var(--app-text-secondary)] mb-2">
                  Paste your session token. Stored locally in settings with strict 0600 file permissions and never shared.
                </p>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={formData.userToken ?? ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, userToken: e.target.value }))}
                    placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVC..."
                    className="w-full px-3 py-2 pr-10 text-xs font-mono rounded-xl bg-[var(--app-input-bg)] border border-[var(--app-border)] text-[var(--app-text-primary)] placeholder:text-[var(--app-text-muted)] focus:outline-none focus:border-[var(--app-accent)] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] p-1 cursor-pointer"
                    title={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Token Secret */}
              <div>
                <label className="text-sm font-semibold text-[var(--app-text-primary)] block mb-1">
                  Token Secret (<code className="text-xs font-mono">x-access-token-secret</code>, optional)
                </label>
                <p className="text-xs text-[var(--app-text-secondary)] mb-2">
                  Secondary header used by select account sessions. Leave empty if your account only provides an access token.
                </p>
                <input
                  type="password"
                  value={formData.userTokenSecret ?? ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, userTokenSecret: e.target.value }))}
                  placeholder="Optional token secret..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-[var(--app-input-bg)] border border-[var(--app-border)] text-[var(--app-text-primary)] placeholder:text-[var(--app-text-muted)] focus:outline-none focus:border-[var(--app-accent)] transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--app-card-bg)] border border-[var(--app-border)] text-xs text-[var(--app-text-secondary)] space-y-1">
                <p className="font-medium text-[var(--app-text-primary)]">How to find your token in Castbox Web:</p>
                <ol className="list-decimal list-inside space-y-0.5 pl-1">
                  <li>Log in to <span className="font-mono text-[var(--app-accent)]">castbox.fm</span> in your browser.</li>
                  <li>Open Developer Tools (<kbd className="px-1 py-0.5 rounded bg-[var(--app-input-bg)] border border-[var(--app-border)] font-mono text-[10px]">F12</kbd>) and go to the <strong>Network</strong> tab.</li>
                  <li>Click on any request to <span className="font-mono">everest.castbox.fm</span>.</li>
                  <li>Under <strong>Request Headers</strong>, copy the value of <span className="font-mono text-[var(--app-accent)]">x-access-token</span> and paste it above.</li>
                </ol>
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION 4: PLAYBACK */}
          {/* ========================================================= */}
          <section
            id="playback"
            ref={(el) => {
              sectionRefs.current['playback'] = el;
            }}
            className="scroll-mt-24 py-5 border-b border-[var(--app-border)]"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="hidden">
                <PlayCircle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--app-text-primary)]">
                  Playback
                </h2>
                <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] mt-0.5">
                  Set default playback speed, skip jump intervals, and listening queue progression.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[var(--app-border)] space-y-6">
              {/* Default playback speed */}
              <div>
                <label className="text-sm font-semibold text-[var(--app-text-primary)] block mb-1">
                  Default Playback Speed
                </label>
                <p className="text-xs text-[var(--app-text-secondary)] mb-3">
                  Default speed applied when new episodes start playing.
                </p>
                <div className="flex flex-wrap gap-2">
                  {([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as PlaybackSpeed[]).map((spd) => {
                    const isSelected = formData.defaultPlaybackSpeed === spd;
                    return (
                      <button
                        key={spd}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, defaultPlaybackSpeed: spd }))
                        }
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--app-accent)] text-white border-[var(--app-accent)] shadow-xs'
                            : 'bg-[var(--app-input-bg)] text-[var(--app-text-secondary)] border-[var(--app-border)] hover:text-[var(--app-text-primary)]'
                        }`}
                      >
                        {spd}×
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Skip intervals */}
              <div className="pt-5 border-t border-[var(--app-border)] grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-[var(--app-text-primary)] block mb-1">
                    Skip Backward Interval
                  </label>
                  <p className="text-xs text-[var(--app-text-secondary)] mb-2.5">
                    Seconds to jump back on transport control.
                  </p>
                  <div className="flex gap-2">
                    {[10, 15, 30].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, skipBackwardSeconds: sec }))
                        }
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          formData.skipBackwardSeconds === sec
                            ? 'bg-[var(--app-accent)] text-white border-[var(--app-accent)]'
                            : 'bg-[var(--app-input-bg)] text-[var(--app-text-secondary)] border-[var(--app-border)]'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-[var(--app-text-primary)] block mb-1">
                    Skip Forward Interval
                  </label>
                  <p className="text-xs text-[var(--app-text-secondary)] mb-2.5">
                    Seconds to jump forward on transport control.
                  </p>
                  <div className="flex gap-2">
                    {[15, 30, 45, 60].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, skipForwardSeconds: sec }))
                        }
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          formData.skipForwardSeconds === sec
                            ? 'bg-[var(--app-accent)] text-white border-[var(--app-accent)]'
                            : 'bg-[var(--app-input-bg)] text-[var(--app-text-secondary)] border-[var(--app-border)]'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Auto-play queue & continuous playback switches */}
              <div className="pt-5 border-t border-[var(--app-border)] space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <label className="text-sm font-semibold text-[var(--app-text-primary)] block">
                      Auto-play next episode in queue
                    </label>
                    <p className="text-xs text-[var(--app-text-secondary)] mt-0.5 max-w-lg">
                      Immediately starts playing the next item in the listening queue when the current track concludes.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.autoPlayNextInQueue}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        autoPlayNextInQueue: !prev.autoPlayNextInQueue,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.autoPlayNextInQueue
                        ? 'bg-[var(--app-accent)]'
                        : 'bg-[var(--app-border)]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        formData.autoPlayNextInQueue ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-start justify-between gap-4 pt-3 border-t border-[var(--app-border)]">
                  <div>
                    <label className="text-sm font-semibold text-[var(--app-text-primary)] block">
                      Continuous channel playback
                    </label>
                    <p className="text-xs text-[var(--app-text-secondary)] mt-0.5 max-w-lg">
                      When queue is empty, automatically queue the previous episode from the active podcast channel.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.continuousPlayback}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        continuousPlayback: !prev.continuousPlayback,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.continuousPlayback
                        ? 'bg-[var(--app-accent)]'
                        : 'bg-[var(--app-border)]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        formData.continuousPlayback ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION 5: STORAGE */}
          {/* ========================================================= */}
          <section
            id="storage"
            ref={(el) => {
              sectionRefs.current['storage'] = el;
            }}
            className="scroll-mt-24 py-5 border-b border-[var(--app-border)]"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="hidden">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--app-text-primary)]">
                  Storage
                </h2>
                <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] mt-0.5">
                    {nativeMode
                      ? 'See completed downloads, free space on the destination volume, and clear temporary network data.'
                      : 'Inspect disk capacity allocation, manage downloaded media, and clear local audio cache.'}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[var(--app-border)] space-y-6">
              {/* Storage breakdown bar */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm font-semibold text-[var(--app-text-primary)]">
                    {nativeMode ? `Destination volume${storageSnapshot?.volumeTotalBytes ? ` · ${formatBytes(storageSnapshot.volumeTotalBytes)} total` : ''}` : 'Simulated Disk Usage (128 GB Total)'}
                  </span>
                  <span className="text-xs text-[var(--app-text-secondary)]">
                    {nativeMode ? storageSnapshot?.volumeAvailableBytes !== null && storageSnapshot?.volumeAvailableBytes !== undefined ? `${formatBytes(storageSnapshot.volumeAvailableBytes)} available` : 'Destination capacity unavailable' : '84.2 GB Available'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 rounded-full bg-[var(--app-border)] overflow-hidden flex" aria-label={nativeMode ? 'Available space on destination volume' : 'Storage usage'}>
                  {nativeMode ? <div className="bg-[var(--app-accent)] h-full transition-[width]" style={{ width: storageSnapshot?.volumeTotalBytes && storageSnapshot.volumeAvailableBytes !== null ? `${Math.max(0, Math.min(100, storageSnapshot.volumeAvailableBytes / storageSnapshot.volumeTotalBytes * 100))}%` : '0%' }} title="Available space" /> : <>
                    <div style={{ width: '4%' }} className="bg-[var(--app-accent)] h-full" title="Castbox Podcasts: 1.42 GB" />
                    <div style={{ width: `${cacheSizeMB > 0 ? 2 : 0}%` }} className="bg-amber-500 h-full" title={`Audio Cache: ${cacheSizeMB} MB`} />
                    <div style={{ width: '33%' }} className="bg-[var(--app-text-muted)]/50 h-full" title="Other Apps: 42.1 GB" />
                  </>}
                </div>

                {/* Legend */}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--app-text-secondary)]">
                  {nativeMode ? <>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--app-accent)] shrink-0" /><span>Available on destination volume</span></div>
                    <div><span className="font-medium text-[var(--app-text-primary)]">Completed downloads:</span> {storageSnapshot ? formatBytes(storageSnapshot.downloadedBytes) : 'Loading…'}</div>
                  </> : <>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--app-accent)] shrink-0" />
                    <span>Castbox Downloads: 1.42 GB</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span>{nativeMode ? 'Artwork cache is managed automatically' : `Audio & Artwork Cache: ${cacheSizeMB} MB`}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--app-text-muted)]/50 shrink-0" />
                    <span>Other Applications: 42.1 GB</span>
                  </div>
                  </>}
                </div>
              </div>

              {/* Cache management */}
              <div className="pt-5 border-t border-[var(--app-border)] flex items-center justify-between gap-4">
                <div>
                  <label className="text-sm font-semibold text-[var(--app-text-primary)] block">
                    {nativeMode ? 'Temporary Network Cache' : 'Temporary Audio & Artwork Cache'}
                  </label>
                  <p className="text-xs text-[var(--app-text-secondary)] mt-0.5">
                    {nativeMode ? (
                      <>Electron temporary cache: <span className="font-semibold text-[var(--app-text-primary)]">{storageSnapshot ? formatBytes(storageSnapshot.cacheBytes) : 'Loading…'}</span>. Clearing it keeps downloaded audio.</>
                    ) : (
                      <>Currently utilizing <span className="font-semibold text-[var(--app-text-primary)]">{cacheSizeMB} MB</span> for buffered stream fragments and high-resolution channel artwork.</>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={storageBusy || (nativeMode ? !storageSnapshot?.cacheBytes : cacheSizeMB === 0)}
                  onClick={() => setIsClearCacheModalOpen(true)}
                  title={nativeMode ? 'Cache clearing is not available in this build' : undefined}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer shrink-0 ${
                    (nativeMode ? Boolean(storageSnapshot?.cacheBytes) : cacheSizeMB > 0)
                      ? 'bg-[var(--app-input-bg)] border-[var(--app-border)] text-[var(--app-text-primary)] hover:border-red-500 hover:text-red-500'
                      : 'opacity-50 cursor-not-allowed bg-[var(--app-input-bg)] border-[var(--app-border)] text-[var(--app-text-muted)]'
                  }`}
                >
                  {storageBusy ? 'Clearing…' : 'Clear Cache'}
                </button>
              </div>

              {/* Quick links to Downloads & Library */}
              <div className="pt-5 border-t border-[var(--app-border)] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--app-input-bg)]/50 p-4 rounded-xl">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-[var(--app-text-primary)]">
                    Manage Downloaded Files in Library
                  </div>
                  <div className="text-xs text-[var(--app-text-secondary)] mt-0.5">
                    View individual episodes, play offline audio, or remove completed files.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('library')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--app-accent)] text-white text-xs font-semibold hover:bg-[var(--app-accent)]/90 transition-colors cursor-pointer shrink-0"
                >
                  <span>Open Library</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>


        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: MOCK FOLDER PICKER */}
      {/* ========================================================= */}
      {isFolderPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--app-bg)] border border-[var(--app-border)] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--app-border)]">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-[var(--app-accent)]" />
                <h3 className="font-serif text-lg font-bold text-[var(--app-text-primary)]">
                  Select Download Destination
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFolderPickerOpen(false)}
                className="p-1 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--app-text-secondary)]">
              Choose from simulated storage locations or input a custom path prefix.
            </p>

            {/* Presets */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {MOCK_DESTINATION_FOLDERS.map((folder) => {
                const isSelected = selectedMockFolder === folder && !customFolderPath;
                return (
                  <button
                    key={folder}
                    type="button"
                    onClick={() => {
                      setSelectedMockFolder(folder);
                      setCustomFolderPath('');
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left text-xs sm:text-sm font-mono transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[var(--app-accent)] bg-[var(--app-input-bg)] text-[var(--app-accent)] font-semibold'
                        : 'border-[var(--app-border)] text-[var(--app-text-primary)] hover:bg-[var(--app-input-bg)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Folder className="w-4 h-4 shrink-0 text-[var(--app-accent)]" />
                      <span className="truncate">{folder}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 shrink-0 text-[var(--app-accent)]" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Path Input */}
            <div className="pt-2">
              <label className="text-xs font-semibold text-[var(--app-text-primary)] block mb-1">
                Or enter custom folder path:
              </label>
              <input
                type="text"
                value={customFolderPath}
                onChange={(e) => setCustomFolderPath(e.target.value)}
                placeholder="/Users/username/Media/Podcasts"
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-mono bg-[var(--app-input-bg)] border border-[var(--app-border)] text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)]"
              />
            </div>

            {/* Modal actions */}
            <div className="pt-3 border-t border-[var(--app-border)] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsFolderPickerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--app-text-secondary)] hover:bg-[var(--app-input-bg)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyFolder}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent)]/90 cursor-pointer shadow-xs"
              >
                Select Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: RESET CONFIRMATION */}
      {/* ========================================================= */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--app-bg)] border border-[var(--app-border)] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[var(--app-text-primary)]">
                  Reset All Settings?
                </h3>
                <p className="text-xs text-[var(--app-text-secondary)] mt-0.5">
                  This action will revert all download concurrency, filename pattern, and playback settings to defaults.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--app-border)] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--app-text-secondary)] hover:bg-[var(--app-input-bg)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent)]/90 cursor-pointer shadow-xs"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: CLEAR CACHE CONFIRMATION */}
      {/* ========================================================= */}
      {isClearCacheModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--app-bg)] border border-[var(--app-border)] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[var(--app-text-primary)]">
                  {nativeMode ? 'Clear Temporary Network Cache?' : 'Clear Stream & Artwork Cache?'}
                </h3>
                <p className="text-xs text-[var(--app-text-secondary)] mt-0.5">
                  {nativeMode ? `This clears ${storageSnapshot ? formatBytes(storageSnapshot.cacheBytes) : 'the measured'} Electron cache. Downloaded episodes remain untouched.` : `This will delete ${cacheSizeMB} MB of temporary audio cache. Downloaded episodes in your library will remain safely intact.`}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--app-border)] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsClearCacheModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--app-text-secondary)] hover:bg-[var(--app-input-bg)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={storageBusy}
                onClick={handleConfirmClearCache}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-xs"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
