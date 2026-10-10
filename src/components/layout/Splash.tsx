import { useEffect, useState } from 'react';
import {
  APP_NAME,
  SPLASH_DURATION_MS,
  SPLASH_RETURNING_MS,
  SPLASH_SKIP_AFTER_MS,
} from '../../config/app';
import { useI18n } from '../../i18n';
import { hasVisitedBefore, markVisited } from '../../lib/prefs';
import { LogoMark } from '../ui/LogoMark';

const EXIT_MS = 520;

/**
 * Branded intro: the full five seconds on a first visit, a shorter one afterwards. The timer does
 * not depend on data loading, so a storage problem can never trap the user behind the loader.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [duration] = useState(() => (hasVisitedBefore() ? SPLASH_RETURNING_MS : SPLASH_DURATION_MS));
  const [leaving, setLeaving] = useState(false);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    markVisited();
    const skipTimer = window.setTimeout(() => setCanSkip(true), SPLASH_SKIP_AFTER_MS);
    const leaveTimer = window.setTimeout(() => setLeaving(true), duration);
    return () => {
      window.clearTimeout(skipTimer);
      window.clearTimeout(leaveTimer);
    };
  }, [duration]);

  useEffect(() => {
    if (!leaving) return undefined;
    const timer = window.setTimeout(onDone, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leaving, onDone]);

  return (
    <div className={`splash${leaving ? ' is-leaving' : ''}`} role="status" aria-label={t('app.loading', { name: APP_NAME })}>
      <div className="splash__content">
        <div className="splash__mark">
          <LogoMark size={96} animated />
        </div>
        <h1 className="splash__name">{APP_NAME}</h1>
        <p className="splash__tagline">{t('app.tagline')}</p>
        <div className="splash__bar" aria-hidden="true">
          <span style={{ animationDuration: `${duration}ms` }} />
        </div>
      </div>
      {canSkip && !leaving ? (
        <button type="button" className="splash__skip" onClick={() => setLeaving(true)}>
          {t('splash.skip')}
        </button>
      ) : null}
    </div>
  );
}
