/* Applies the saved theme before first paint to avoid a flash. Kept external (not inline) so the
   Content Security Policy can forbid inline scripts. Must mirror src/lib/prefs/index.ts. */
(function () {
  var root = document.documentElement;
  var mode = 'system';
  var motion = 'system';
  var perfMode = 'auto';
  var sidebar = 'shown';
  var lang = null;
  try {
    var raw = window.localStorage.getItem('linknest.prefs.v1');
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && (parsed.theme === 'light' || parsed.theme === 'dark')) mode = parsed.theme;
      if (parsed && (parsed.motion === 'reduce' || parsed.motion === 'full')) motion = parsed.motion;
      if (parsed && (parsed.performance === 'lite' || parsed.performance === 'full')) perfMode = parsed.performance;
      if (parsed && parsed.sidebarHidden === true) sidebar = 'hidden';
      if (parsed && (parsed.language === 'ar' || parsed.language === 'en')) lang = parsed.language;
    }
  } catch (e) {
    /* storage unavailable: fall back to system settings */
  }
  var mq = function (q) {
    return typeof window.matchMedia === 'function' && window.matchMedia(q).matches;
  };
  var theme = mode === 'system' ? (mq('(prefers-color-scheme: dark)') ? 'dark' : 'light') : mode;
  if (!lang) {
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    lang = String(nav).toLowerCase().indexOf('ar') === 0 ? 'ar' : 'en';
  }
  root.setAttribute('lang', lang);
  root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  // Keep in step with looksLowEnd() in src/lib/prefs/index.ts.
  var low = false;
  try {
    var memory = navigator.deviceMemory;
    var cores = navigator.hardwareConcurrency;
    low =
      (navigator.connection && navigator.connection.saveData === true) ||
      (typeof memory === 'number' && memory <= 4) ||
      (typeof cores === 'number' && cores <= 4);
  } catch (e) {
    low = false;
  }
  root.setAttribute('data-perf', perfMode === 'auto' ? (low ? 'lite' : 'full') : perfMode);
  root.setAttribute('data-sidebar', sidebar);
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-theme-mode', mode);
  root.setAttribute(
    'data-motion',
    motion === 'system' ? (mq('(prefers-reduced-motion: reduce)') ? 'reduce' : 'full') : motion
  );
})();
