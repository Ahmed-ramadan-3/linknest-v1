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
import { APP_NAME, APP_VERSION, LIMITS } from '../../config/app';
import { NATIVE_NAME, useI18n } from '../../i18n';
import { buildBackup, parseBackup, serializeBackup, type ParsedBackup } from '../../data/backup';
import { describeStorageError } from '../../data/db';
import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { backupFilename, downloadTextFile } from '../../lib/download';
import { formatBytes, formatDateTime } from '../../lib/format';
import {
  approximateDataBytes,
  getBrowserStorageInfo,
  requestPersistentStorage,
  type BrowserStorageInfo,
} from '../../lib/storage';
import { LANGUAGES, MOTION_MODES, PERFORMANCE_MODES, type ThemeMode } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Dialog } from '../ui/Dialog';

const THEME_OPTIONS: { value: ThemeMode; icon: typeof LuSun }[] = [
  { value: 'system', icon: LuMonitor },
  { value: 'light', icon: LuSun },
  { value: 'dark', icon: LuMoon },
];

export function SettingsDialog() {
  const { closeModal } = useAppUi();
  const { settings, update, reset: resetSettings, persisted } = useSettings();
  const library = useLibrary();
  const toast = useToast();
  const { t, plural } = useI18n();

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
    toast.success(t('toast.backupDownloaded'));
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setParsed(null);
    setImportError('');
    if (!file) return;
    setFileName(file.name);
    if (file.size > LIMITS.importFileBytes) {
      setImportError(t('import.tooLarge'));
      return;
    }
    try {
      const result = parseBackup(await file.text());
      if (result.ok) setParsed(result.backup);
      else setImportError(result.error);
    } catch {
      setImportError(t('import.unreadable'));
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
      if (mode === 'replace') {
        toast.success(t('toast.restored', { resources: plural('count.resource', parsed.data.resources.length) }));
      } else {
        const added = plural('count.newResource', summary?.resourcesAdded ?? 0);
        toast.success(
          summary && summary.resourcesUpdated
            ? t('toast.importedUpdated', { resources: added, updated: summary.resourcesUpdated })
            : t('toast.imported', { resources: added }),
        );
      }
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
      toast.success(t('toast.resetDone'));
      setConfirmReset(false);
      closeModal();
    } catch (error) {
      toast.error(describeStorageError(error));
    }
  };

  const persist = async () => {
    const granted = await requestPersistentStorage();
    setStorageInfo(await getBrowserStorageInfo());
    if (granted) toast.success(t('toast.persistOk'));
    else toast.show(t('toast.persistNo'), 'info');
  };

  return (
    <>
      <Dialog title={t('settings.title')} size="lg" onClose={closeModal}>
        <div className="settings">
          <section className="settings__section" aria-labelledby="set-appearance">
            <h3 id="set-appearance" className="settings__heading">
              <LuPalette className="icon" size={17} aria-hidden="true" /> {t('settings.appearance')}
            </h3>
            <div className="setting-row">
              <div>
                <p className="setting-row__title" id="set-theme-label">{t('settings.theme')}</p>
                <p className="setting-row__hint">{t('settings.themeHint')}</p>
              </div>
              <div className="segmented" role="radiogroup" aria-labelledby="set-theme-label">
                {THEME_OPTIONS.map(({ value, icon: Glyph }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={settings.theme === value}
                    className={`segmented__item${settings.theme === value ? ' is-selected' : ''}`}
                    onClick={() => update({ theme: value })}
                  >
                    <Glyph className="icon" size={15} aria-hidden="true" />
                    {t(`theme.${value}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="setting-row">
              <div>
                <p className="setting-row__title" id="set-language-label">{t('settings.language')}</p>
                <p className="setting-row__hint">{t('settings.languageHint')}</p>
              </div>
              <div className="segmented" role="radiogroup" aria-labelledby="set-language-label">
                {LANGUAGES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    lang={value}
                    aria-checked={settings.language === value}
                    className={`segmented__item${settings.language === value ? ' is-selected' : ''}`}
                    onClick={() => update({ language: value })}
                  >
                    {NATIVE_NAME[value]}
                  </button>
                ))}
              </div>
            </div>
            <div className="setting-row">
              <div>
                <p className="setting-row__title" id="set-motion-label">{t('settings.motion')}</p>
                <p className="setting-row__hint">{t('settings.motionHint')}</p>
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
                    {t(`settings.motion.${value}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="setting-row">
              <div>
                <p className="setting-row__title" id="set-perf-label">{t('settings.performance')}</p>
                <p className="setting-row__hint">{t('settings.performanceHint')}</p>
              </div>
              <div className="segmented" role="radiogroup" aria-labelledby="set-perf-label">
                {PERFORMANCE_MODES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={settings.performance === value}
                    className={`segmented__item${settings.performance === value ? ' is-selected' : ''}`}
                    onClick={() => update({ performance: value })}
                  >
                    {t(`settings.performance.${value}`)}
                  </button>
                ))}
              </div>
            </div>
            {!persisted ? (
              <p className="notice notice--warn">
                {t('settings.notPersisted')}
              </p>
            ) : null}
          </section>

          <section className="settings__section" aria-labelledby="set-privacy">
            <h3 id="set-privacy" className="settings__heading">
              <LuShieldCheck className="icon" size={17} aria-hidden="true" /> {t('settings.privacy')}
            </h3>
            <p className="setting-row__hint">
              {t('settings.privacyBody', { name: APP_NAME })}
            </p>
            <label className="check">
              <input
                type="checkbox"
                checked={settings.remoteThumbnails}
                onChange={(event) => update({ remoteThumbnails: event.target.checked })}
              />
              <span>
                {t('settings.remoteThumbs')}
                <small className="check__hint">{t('settings.remoteThumbsHint')}</small>
              </span>
            </label>
          </section>

          <section className="settings__section" aria-labelledby="set-data">
            <h3 id="set-data" className="settings__heading">
              <LuDownload className="icon" size={17} aria-hidden="true" /> {t('settings.backup')}
            </h3>
            <p className="setting-row__hint">
              {t('settings.backupBody')}
              {settings.lastExportAt ? t('settings.lastBackup', { date: formatDateTime(settings.lastExportAt) }) : t('settings.noBackup')}
            </p>
            <div className="button-row">
              <button type="button" className="button button--soft" onClick={exportData}>
                <LuDownload className="icon" size={16} aria-hidden="true" /> {t('settings.export')}
              </button>
              <button type="button" className="button button--soft" onClick={() => fileInput.current?.click()}>
                <LuUpload className="icon" size={16} aria-hidden="true" /> {t('settings.import')}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="visually-hidden"
                tabIndex={-1}
                aria-label={t('settings.chooseFile')}
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
                  {t('settings.fileContains', {
                    file: `“${fileName}”`,
                    resources: plural('count.resource', parsed.data.resources.length),
                    categories: plural('count.category', parsed.data.categories.length),
                  })}
                  {parsed.exportedAt ? t('settings.exportedOn', { date: formatDateTime(parsed.exportedAt) }) : ''}.
                </p>
                {parsed.warnings.length > 0 ? (
                  <ul className="import-preview__warnings">
                    {parsed.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
                <fieldset className="radio-group">
                  <legend className="visually-hidden">{t('settings.importMode')}</legend>
                  <label className="radio">
                    <input type="radio" name="import-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
                    <span>
                      {t('settings.merge')}
                      <small className="check__hint">{t('settings.mergeHint')}</small>
                    </span>
                  </label>
                  <label className="radio">
                    <input type="radio" name="import-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                    <span>
                      {t('settings.replace')}
                      <small className="check__hint">{t('settings.replaceHint', { resources: plural('count.resource', library.resources.length) })}</small>
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
                    {mode === 'replace' ? t('settings.replaceAndImport') : t('settings.mergeAndImport')}
                  </button>
                  <button type="button" className="button button--ghost" onClick={() => setParsed(null)}>
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="settings__section" aria-labelledby="set-storage">
            <h3 id="set-storage" className="settings__heading">
              <LuHardDrive className="icon" size={17} aria-hidden="true" /> {t('settings.storage')}
            </h3>
            <p className="setting-row__hint">
              {library.persistent
                ? t('settings.storageLocal')
                : t('settings.storageMemory')}
            </p>
            <dl className="stat-list">
              <div><dt>{t('settings.statResources')}</dt><dd>{library.resources.length}</dd></div>
              <div><dt>{t('settings.statCategories')}</dt><dd>{library.categories.length}</dd></div>
              <div><dt>{t('settings.statData')}</dt><dd>{formatBytes(dataBytes)}</dd></div>
              <div>
                <dt>{t('settings.statBrowser')}</dt>
                <dd>{storageInfo?.usage != null ? formatBytes(storageInfo.usage) : t('common.notReported')}</dd>
              </div>
              <div>
                <dt>{t('settings.statPersisted')}</dt>
                <dd>{storageInfo?.persisted == null ? t('common.unknown') : storageInfo.persisted ? t('common.yes') : t('settings.notGuaranteed')}</dd>
              </div>
            </dl>
            <p className="setting-row__hint">
              {t('settings.estimates')}
            </p>
            {storageInfo?.persisted === false ? (
              <button type="button" className="button button--soft" onClick={persist}>
                {t('settings.persist')}
              </button>
            ) : null}
          </section>

          <section className="settings__section settings__section--danger" aria-labelledby="set-reset">
            <h3 id="set-reset" className="settings__heading">
              <LuRotateCcw className="icon" size={17} aria-hidden="true" /> {t('settings.reset')}
            </h3>
            <p className="setting-row__hint">
              {t('settings.resetBody', { name: APP_NAME })}
            </p>
            <button type="button" className="button button--danger" onClick={() => setConfirmReset(true)}>
              {t('settings.resetButton')}
            </button>
          </section>

          <section className="settings__section" aria-labelledby="set-about">
            <h3 id="set-about" className="settings__heading">
              <LuInfo className="icon" size={17} aria-hidden="true" /> {t('settings.about', { name: APP_NAME })}
            </h3>
            <p className="setting-row__hint">
              {t('settings.aboutBody', {
                name: APP_NAME,
                version: APP_VERSION,
                tagline: t('app.tagline'),
                description: t('app.description'),
              })}
            </p>
          </section>
        </div>
      </Dialog>

      {confirmReplace ? (
        <ConfirmDialog
          title={t('settings.replaceTitle')}
          confirmLabel={t('settings.replaceConfirm')}
          danger
          onCancel={() => setConfirmReplace(false)}
          onConfirm={runImport}
        >
          <p>
            {t('settings.replaceWarn', {
              resources: plural('count.currentResource', library.resources.length),
              categories: plural('count.category', library.categories.length),
              file: `“${fileName}”`,
            })}
          </p>
        </ConfirmDialog>
      ) : null}

      {confirmReset ? (
        <ConfirmDialog
          title={t('settings.resetTitle')}
          confirmLabel={t('settings.resetConfirm')}
          danger
          requireText={t('settings.resetWord')}
          onCancel={() => setConfirmReset(false)}
          onConfirm={doReset}
        >
          <p>{t('settings.resetWarn', { name: APP_NAME })}</p>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
