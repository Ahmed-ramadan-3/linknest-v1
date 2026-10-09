/* Applies the saved theme before first paint to avoid a flash. Kept external (not inline) so the
   Content Security Policy can forbid inline scripts. Must mirror src/lib/prefs/index.ts. */
(function () {
  var root = document.documentElement;
  var mode = 'system';
  var motion = 'system';
  try {
    var raw = window.localStorage.getItem('linknest.prefs.v1');
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && (parsed.theme === 'light' || parsed.theme === 'dark')) mode = parsed.theme;
      if (parsed && (parsed.motion === 'reduce' || parsed.motion === 'full')) motion = parsed.motion;
    }
  } catch (e) {
    /* storage unavailable: fall back to system settings */
  }
  var mq = function (q) {
    return typeof window.matchMedia === 'function' && window.matchMedia(q).matches;
  };
  var theme = mode === 'system' ? (mq('(prefers-color-scheme: dark)') ? 'dark' : 'light') : mode;
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-theme-mode', mode);
  root.setAttribute(
    'data-motion',
    motion === 'system' ? (mq('(prefers-reduced-motion: reduce)') ? 'reduce' : 'full') : motion
  );
})();
