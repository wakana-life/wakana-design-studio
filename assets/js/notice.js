/*
 * 制作実績の案内ダイアログ（公開ページ制作中）。
 * [data-notice="ダイアログのid"] のボタンで dialog.notice を開く。
 * 閉じる：×ボタン・Escape・背景のクリック。閉じたら開いたボタンへフォーカスを戻す。
 */
(() => {
  'use strict';

  let opener = null;

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-notice]');
    if (!button) return;
    const dialog = document.getElementById(button.dataset.notice);
    if (!dialog || typeof dialog.showModal !== 'function' || dialog.open) return;
    opener = button;
    dialog.showModal();
    const close = dialog.querySelector('[data-notice-close]');
    if (close) close.focus();
  });

  document.querySelectorAll('dialog.notice').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      // 背景（dialog要素そのもの）または×ボタン
      if (event.target === dialog || event.target.closest('[data-notice-close]')) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
      opener = null;
    });
  });
})();
