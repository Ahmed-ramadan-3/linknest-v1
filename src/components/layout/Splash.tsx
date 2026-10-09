import { useEffect, useState } from 'react';
import { APP_NAME, APP_TAGLINE, SPLASH_DURATION_MS, SPLASH_SKIP_AFTER_MS } from '../../config/app';
import { LogoMark } from '../ui/LogoMark';

const EXIT_MS = 520;

/**
 * Branded intro shown for SPLASH_DURATION_MS. The timer does not depend on data
 * loading, so a storage problem can never trap the user behind the loader.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    const skipTimer = window.setTimeout(() => setCanSkip(true), SPLASH_SKIP_AFTER_MS);
    const leaveTimer = window.setTimeout(() => setLeaving(true), SPLASH_DURATION_MS);
    return () => {
      window.clearTimeout(skipTimer);
      window.clearTimeout(leaveTimer);
    };
  }, []);

  useEffect(() => {
    if (!leaving) return undefined;
    const timer = window.setTimeout(onDone, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leaving, onDone]);

  return (
    <div className={`splash${leaving ? ' is-leaving' : ''}`} role="status" aria-label={`Loading ${APP_NAME}`}>
      <div className="splash__content">
        <div className="splash__mark">
          <LogoMark size={96} animated />
        </div>
        <h1 className="splash__name">{APP_NAME}</h1>
        <p className="splash__tagline">{APP_TAGLINE}</p>
        <div className="splash__bar" aria-hidden="true">
          <span style={{ animationDuration: `${SPLASH_DURATION_MS}ms` }} />
        </div>
      </div>
      {canSkip && !leaving ? (
        <button type="button" className="splash__skip" onClick={() => setLeaving(true)}>
          Skip intro
        </button>
      ) : null}
    </div>
  );
}
