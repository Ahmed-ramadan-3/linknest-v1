import { Component, useCallback, useState, type ErrorInfo, type ReactNode } from 'react';
import { APP_NAME } from './config/app';
import { Background } from './components/layout/Background';
import { AppShell } from './components/layout/AppShell';
import { Splash } from './components/layout/Splash';
import { AppUiProvider } from './hooks/useAppUi';
import { LibraryProvider } from './hooks/useLibrary';
import { SettingsProvider } from './hooks/useSettings';
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
        <h1>Something went wrong</h1>
        <p>
          {APP_NAME} hit an unexpected problem. Your saved data is not affected. Reload to continue.
        </p>
        <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}

export function App() {
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);

  return (
    <ErrorBoundary>
      <SettingsProvider>
        <ToastProvider>
          <LibraryProvider>
            <AppUiProvider>
              <Background />
              <AppShell inert={!splashDone} />
              {splashDone ? null : <Splash onDone={finishSplash} />}
            </AppUiProvider>
          </LibraryProvider>
        </ToastProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
