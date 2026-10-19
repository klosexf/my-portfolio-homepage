'use strict';

// Approved homepage presentation. The existing fan owns geometry and interaction.
(() => {
  document.querySelectorAll('.open-label').forEach(label => { label.textContent = '查看演示'; });
  const stage = document.querySelector('#fan-stage');
  const counter = document.querySelector('.browse-guide-count');
  const updateCount = () => {
    const current = Number(stage.dataset.selected || 0) + 1;
    counter.textContent = `${String(current).padStart(2, '0')} / ${String(stage.dataset.count).padStart(2, '0')}`;
  };
  new MutationObserver(updateCount).observe(stage, { attributes: true, attributeFilter: ['data-selected'] });
  updateCount();
})();
