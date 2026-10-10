// Apply the saved theme before the first paint, including while React loads.
(function () {
  var saved;
  try { saved = localStorage.getItem('son-durak:theme'); } catch (_) {}
  var theme = saved === 'dark' || saved === 'light'
    ? saved
    : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#111318' : '#f5f6f8');
})();
