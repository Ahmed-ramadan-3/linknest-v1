import { Component, useCallback, useState, type ErrorInfo, type ReactNode } from 'react';
import { I18nProvider, translate } from './i18n';
import { APP_NAME } from './config/app';
import { Background } from './components/layout/Background';
import { AppShell } from './components/layout/AppShell';
import { Splash } from './components/layout/Splash';
import { AppUiProvider } from './hooks/useAppUi';
import { LibraryProvider } from './hooks/useLibrary';
import { SettingsProvider, useSettings } from './hooks/useSettings';
import { ToastProvider } from './hooks/useToast';
import { logDev } from './lib/log';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    logDev('Unhandled UI error', { error, info });
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="fatal glass-strong" role="alert">
        <h1>{translate('app.fatalTitle')}</h1>
        <p>{translate('app.fatalBody', { name: APP_NAME })}</p>
        <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
          {translate('app.reload')}
        </button>
      </div>
    );
  }
}

/** Feeds the saved language to the translation provider. */
function Localized({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  return <I18nProvider language={settings.language}>{children}</I18nProvider>;
}

export function App() {
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);

  return (
    <ErrorBoundary>
      <SettingsProvider>
        <Localized>
          <ToastProvider>
            <LibraryProvider>
              <AppUiProvider>
                <Background />
                <AppShell inert={!splashDone} />
                {splashDone ? null : <Splash onDone={finishSplash} />}
              </AppUiProvider>
            </LibraryProvider>
          </ToastProvider>
        </Localized>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
