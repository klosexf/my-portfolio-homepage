'use strict';

// Keep exhibit labels to the name, category and a short product explanation.
// No observer, animation loop, or geometry read is needed for exhibit labels.
(() => {
  function labelExhibits() {
    if (typeof productCatalog === 'undefined') return;
    document.querySelectorAll('.artwork[data-product]').forEach(card => {
      if (card.dataset.exhibitLabelled === 'true') return;
      const product = productCatalog[card.dataset.product];
      const identity = card.querySelector('.artwork-caption > span');
      const task = card.querySelector('.artwork-demo-status');
      if (!product || !identity) return;
      const category = String(product.category || '').split('·')[0].trim();
      if (!category) return;
      const label = document.createElement('span');
      label.className = 'exhibit-category';
      label.textContent = category;
      label.title = product.category;
      identity.classList.add('exhibit-identity');
      identity.insertBefore(label, task);
      task?.remove();
      const summary = document.createElement('span');
      summary.className = 'exhibit-summary';
      summary.textContent = product.summary;
      identity.append(summary);
      card.setAttribute('aria-label', `查看 ${product.name}：${product.summary} ${product.category}`);
      card.dataset.exhibitLabelled = 'true';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', labelExhibits, { once: true });
  } else labelExhibits();
})();
