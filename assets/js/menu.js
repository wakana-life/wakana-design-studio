/*
 * スマホメニュー（Figma 221:517）
 * 開閉ボタン・×・外側タップ・Escapeで閉じる。開いている間はフォーカスをメニュー内に閉じ込め、
 * 閉じたら開いたボタンへフォーカスを戻す。PC幅（768px以上）になったら自動で閉じる。
 */
(() => {
  'use strict';

  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('site-menu');
  if (!toggle || !menu) return;

  const panel = menu.querySelector('.site-menu__panel');
  const pcQuery = window.matchMedia('(min-width: 768px)');
  const root = document.documentElement;

  const focusables = () => Array.from(panel.querySelectorAll('a[href], button:not([disabled])'))
    .filter((el) => el.offsetParent !== null);

  function open() {
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    root.classList.add('is-menu-open');
    requestAnimationFrame(() => menu.classList.add('is-open'));
    const first = panel.querySelector('.menu-close');
    if (first) first.focus();
  }

  function close(restoreFocus = true) {
    if (menu.hidden) return;
    menu.classList.remove('is-open');
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    root.classList.remove('is-menu-open');
    if (restoreFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => {
    if (menu.hidden) open();
    else close();
  });

  menu.addEventListener('click', (event) => {
    if (event.target.closest('[data-menu-close]')) {
      close();
      return;
    }
    // メニュー内のリンク：閉じてから移動（フォーカスは移動先へ）
    if (event.target.closest('a[href]')) close(false);
  });

  document.addEventListener('keydown', (event) => {
    if (menu.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  });

  pcQuery.addEventListener('change', (event) => {
    if (event.matches) close(false);
  });
})();
