/* Render LaTeX in the article with KaTeX: $$…$$ for display math, \( … \) for inline math. */
(function () {
  if (!window.renderMathInElement) return; // CDN unavailable: the TeX source stays readable
  var root = document.querySelector('article') || document.body;
  var delimiters = [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }];
  window.renderMathInElement(root, { delimiters: delimiters, ignoredClasses: ['viz'], throwOnError: false });
  // Static captions inside figures opt in with class="tex" (the rest of a figure is drawn by its script).
  document.querySelectorAll('.viz .tex').forEach(function (el) {
    window.renderMathInElement(el, { delimiters: delimiters, throwOnError: false });
  });
})();
