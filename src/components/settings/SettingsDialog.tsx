import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  LuDownload,
  LuHardDrive,
  LuInfo,
  LuMonitor,
  LuMoon,
  LuPalette,
  LuRotateCcw,
  LuShieldCheck,
  LuSun,
  LuTriangleAlert,
  LuUpload,
} from 'react-icons/lu';
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE, APP_VERSION, LIMITS } from '../../config/app';
import { buildBackup, parseBackup, serializeBackup, type ParsedBackup } from '../../data/backup';
import { describeStorageError } from '../../data/db';
import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { backupFilename, downloadTextFile } from '../../lib/download';
import { formatBytes, formatDateTime, pluralize } from '../../lib/format';
import {
  approximateDataBytes,
  getBrowserStorageInfo,
  requestPersistentStorage,
  type BrowserStorageInfo,
} from '../../lib/storage';
import { MOTION_MODES, type MotionMode, type ThemeMode } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Dialog } from '../ui/Dialog';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof LuSun }[] = [
  { value: 'system', label: 'System', icon: LuMonitor },
  { value: 'light', label: 'Light', icon: LuSun },
  { value: 'dark', label: 'Dark', icon: LuMoon },
];
const MOTION_LABEL: Record<MotionMode, string> = {
  system: 'Follow system',
  reduce: 'Reduce motion',
  full: 'Allow motion',
};

export function SettingsDialog() {
  const { closeModal } = useAppUi();
  const { settings, update, reset: resetSettings, persisted } = useSettings();
  const library = useLibrary();
  const toast = useToast();

  const [storageInfo, setStorageInfo] = useState<BrowserStorageInfo | null>(null);
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [importError, setImportError] = useState('');
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    getBrowserStorageInfo().then((info) => {
      if (active) setStorageInfo(info);
    });
    return () => {
      active = false;
    };
  }, []);

  const dataBytes = approximateDataBytes({ categories: library.categories, resources: library.resources });

  const exportData = () => {
    const backup = buildBackup(library.snapshot(), settings);
    downloadTextFile(backupFilename(), serializeBackup(backup));
    update({ lastExportAt: backup.exportedAt });
    toast.success('Backup downloaded');
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setParsed(null);
    setImportError('');
    if (!file) return;
    setFileName(file.name);
    if (file.size > LIMITS.importFileBytes) {
      setImportError('This file is too large to be a LinkNest backup.');
      return;
    }
    try {
      const result = parseBackup(await file.text());
      if (result.ok) setParsed(result.backup);
      else setImportError(result.error);
    } catch {
      setImportError('This file could not be read.');
    }
  };

  const runImport = async () => {
    if (!parsed) return;
    setImporting(true);
    try {
      const summary = await library.importBackup(parsed, mode);
      if (parsed.settings.theme || parsed.settings.motion || parsed.settings.remoteThumbnails !== undefined) {
        update(parsed.settings);
      }
      toast.success(
        mode === 'replace'
          ? `Restored ${pluralize(parsed.data.resources.length, 'resource')}`
          : `Imported ${pluralize(summary?.resourcesAdded ?? 0, 'new resource')}${summary && summary.resourcesUpdated ? `, updated ${summary.resourcesUpdated}` : ''}`,
      );
      setParsed(null);
      setFileName('');
    } catch (error) {
      toast.error(describeStorageError(error));
    } finally {
      setImporting(false);
      setConfirmReplace(false);
    }
  };

  const doReset = async () => {
    try {
      await library.resetAll();
      resetSettings();
      toast.success('All local data was removed');
      setConfirmReset(false);
      closeModal();
    } catch (error) {
      toast.error(describeStorageError(error));
    }
  };

  const persist = async () => {
    const granted = await requestPersistentStorage();
    setStorageInfo(await getBrowserStorageInfo());
    if (granted) toast.success('Your browser will try to keep this data');
    else toast.show('Your browser did not grant persistent storage. Keep a backup.', 'info');
  };

  return (
    <>
      <Dialog title="Settings" size="lg" onClose={closeModal}>
        <div className="settings">
          <section className="settings__section" aria-labelledby="set-appearance">
            <h3 id="set-appearance" className="settings__heading">
              <LuPalette className="icon" size={17} aria-hidden="true" /> Appearance
            </h3>
            <div className="setting-row">
              <div>
                <p className="setting-row__title" id="set-theme-label">Theme</p>
                <p className="setting-row__hint">System follows your device.</p>
              </div>
              <div className="segmented" role="radiogroup" aria-labelledby="set-theme-label">
                {THEME_OPTIONS.map(({ value, label, icon: Glyph }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={settings.theme === value}
                    className={`segmented__item${settings.theme === value ? ' is-selected' : ''}`}
                    onClick={() => update({ theme: value })}
                  >
                    <Glyph className="icon" size={15} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="setting-row">
              <div>
                <p className="setting-row__title" id="set-motion-label">Motion</p>
                <p className="setting-row__hint">Reduces animations for comfort.</p>
              </div>
              <div className="segmented" role="radiogroup" aria-labelledby="set-motion-label">
                {MOTION_MODES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={settings.motion === value}
                    className={`segmented__item${settings.motion === value ? ' is-selected' : ''}`}
                    onClick={() => update({ motion: value })}
                  >
                    {MOTION_LABEL[value]}
                  </button>
                ))}
              </div>
            </div>
            {!persisted ? (
              <p className="notice notice--warn">
                Your browser blocked saving preferences, so these settings last only until you close this tab.
              </p>
            ) : null}
          </section>

          <section className="settings__section" aria-labelledby="set-privacy">
            <h3 id="set-privacy" className="settings__heading">
              <LuShieldCheck className="icon" size={17} aria-hidden="true" /> Privacy
            </h3>
            <p className="setting-row__hint">
              Everything you save stays in this browser. {APP_NAME} has no account, no server and no analytics.
            </p>
            <label className="check">
              <input
                type="checkbox"
                checked={settings.remoteThumbnails}
                onChange={(event) => update({ remoteThumbnails: event.target.checked })}
              />
              <span>
                Load preview images from their source
                <small className="check__hint">
                  When on, your browser requests thumbnails (such as YouTube) directly from those sites. Turn off to
                  make no outside requests at all.
                </small>
              </span>
            </label>
          </section>

          <section className="settings__section" aria-labelledby="set-data">
            <h3 id="set-data" className="settings__heading">
              <LuDownload className="icon" size={17} aria-hidden="true" /> Backup &amp; restore
            </h3>
            <p className="setting-row__hint">
              Because data lives only in this browser, export a backup before clearing browser data or switching
              devices.
              {settings.lastExportAt ? ` Last backup: ${formatDateTime(settings.lastExportAt)}.` : ' You have not exported a backup yet.'}
            </p>
            <div className="button-row">
              <button type="button" className="button button--soft" onClick={exportData}>
                <LuDownload className="icon" size={16} aria-hidden="true" /> Export JSON
              </button>
              <button type="button" className="button button--soft" onClick={() => fileInput.current?.click()}>
                <LuUpload className="icon" size={16} aria-hidden="true" /> Import JSON…
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="visually-hidden"
                tabIndex={-1}
                aria-label="Choose a LinkNest backup file"
                onChange={onFile}
              />
            </div>

            {importError ? (
              <p className="notice notice--error" role="alert">
                <LuTriangleAlert className="icon" size={16} aria-hidden="true" /> {importError}
              </p>
            ) : null}

            {parsed ? (
              <div className="import-preview glass">
                <p className="import-preview__title">
                  <strong>{fileName}</strong> contains {pluralize(parsed.data.resources.length, 'resource')} and{' '}
                  {pluralize(parsed.data.categories.length, 'category', 'categories')}
                  {parsed.exportedAt ? ` (exported ${formatDateTime(parsed.exportedAt)})` : ''}.
                </p>
                {parsed.warnings.length > 0 ? (
                  <ul className="import-preview__warnings">
                    {parsed.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
                <fieldset className="radio-group">
                  <legend className="visually-hidden">Import mode</legend>
                  <label className="radio">
                    <input type="radio" name="import-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
                    <span>
                      Merge with my current data
                      <small className="check__hint">Adds new items. If the same item exists, the most recently edited copy wins. Nothing is deleted.</small>
                    </span>
                  </label>
                  <label className="radio">
                    <input type="radio" name="import-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                    <span>
                      Replace everything
                      <small className="check__hint">Deletes the {pluralize(library.resources.length, 'resource')} currently saved here and uses only this file.</small>
                    </span>
                  </label>
                </fieldset>
                <div className="button-row">
                  <button
                    type="button"
                    className={`button ${mode === 'replace' ? 'button--danger' : 'button--primary'}`}
                    disabled={importing}
                    onClick={() => (mode === 'replace' ? setConfirmReplace(true) : void runImport())}
                  >
                    {mode === 'replace' ? 'Replace and import' : 'Merge and import'}
                  </button>
                  <button type="button" className="button button--ghost" onClick={() => setParsed(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="settings__section" aria-labelledby="set-storage">
            <h3 id="set-storage" className="settings__heading">
              <LuHardDrive className="icon" size={17} aria-hidden="true" /> Storage
            </h3>
            <p className="setting-row__hint">
              {library.persistent
                ? 'Your resources are stored locally in this browser (IndexedDB) on this device.'
                : 'Storage is unavailable, so data is only kept until this tab closes. Export a backup.'}
            </p>
            <dl className="stat-list">
              <div><dt>Resources</dt><dd>{library.resources.length}</dd></div>
              <div><dt>Categories</dt><dd>{library.categories.length}</dd></div>
              <div><dt>Your data (approx.)</dt><dd>{formatBytes(dataBytes)}</dd></div>
              <div>
                <dt>Browser storage in use (approx.)</dt>
                <dd>{storageInfo?.usage != null ? formatBytes(storageInfo.usage) : 'Not reported'}</dd>
              </div>
              <div>
                <dt>Protected from automatic cleanup</dt>
                <dd>{storageInfo?.persisted == null ? 'Unknown' : storageInfo.persisted ? 'Yes' : 'Not guaranteed'}</dd>
              </div>
            </dl>
            <p className="setting-row__hint">
              Browser-reported numbers are rough estimates and include other data from this site.
            </p>
            {storageInfo?.persisted === false ? (
              <button type="button" className="button button--soft" onClick={persist}>
                Ask the browser to keep my data
              </button>
            ) : null}
          </section>

          <section className="settings__section settings__section--danger" aria-labelledby="set-reset">
            <h3 id="set-reset" className="settings__heading">
              <LuRotateCcw className="icon" size={17} aria-hidden="true" /> Reset
            </h3>
            <p className="setting-row__hint">
              This will remove all {APP_NAME} data stored in this browser: resources, categories and preferences.
            </p>
            <button type="button" className="button button--danger" onClick={() => setConfirmReset(true)}>
              Reset all local data…
            </button>
          </section>

          <section className="settings__section" aria-labelledby="set-about">
            <h3 id="set-about" className="settings__heading">
              <LuInfo className="icon" size={17} aria-hidden="true" /> About {APP_NAME}
            </h3>
            <p className="setting-row__hint">
              <strong>{APP_NAME}</strong> {APP_VERSION}. {APP_TAGLINE} {APP_DESCRIPTION} Platform names such as YouTube
              are only labels on links you save; {APP_NAME} is not affiliated with them.
            </p>
          </section>
        </div>
      </Dialog>

      {confirmReplace ? (
        <ConfirmDialog
          title="Replace all current data?"
          confirmLabel="Replace everything"
          danger
          onCancel={() => setConfirmReplace(false)}
          onConfirm={runImport}
        >
          <p>
            Your {pluralize(library.resources.length, 'current resource')} and {pluralize(library.categories.length, 'category', 'categories')} will be
            deleted and replaced by the contents of <strong>{fileName}</strong>. Export a backup first if you might need
            them.
          </p>
        </ConfirmDialog>
      ) : null}

      {confirmReset ? (
        <ConfirmDialog
          title="Reset all local data?"
          confirmLabel="Delete everything"
          danger
          requireText="RESET"
          onCancel={() => setConfirmReset(false)}
          onConfirm={doReset}
        >
          <p>
            This will remove all {APP_NAME} data stored in this browser. Your resources and categories will be deleted
            permanently and the starter categories will be restored. This cannot be undone.
          </p>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
