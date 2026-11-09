/*
 * ページを開いたとき・再訪時（戻る／進むを含む）はFVから表示する。
 * 例外：#works などの明示的なセクションリンクは、別ページから来た場合も目的位置へ移動する。
 * 同じページ内のセクションリンクでは、移動先の見出しへフォーカスを移す。
 */
(() => {
  'use strict';

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  let userMoved = false;
  const markMoved = () => { userMoved = true; };

  function hashTarget() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id || id === 'top') return null;
    return document.getElementById(id);
  }

  function focusTarget(el) {
    if (!el) return;
    const heading = el.matches('h1, h2, h3, [tabindex]') ? el : el.querySelector('h2[tabindex], h2, [tabindex="-1"]');
    const node = heading || el;
    if (!node.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(node.tagName)) {
      node.setAttribute('tabindex', '-1');
    }
    node.focus({ preventScroll: true });
  }

  function settle() {
    const target = hashTarget();
    if (target) {
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    settle();
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((type) => {
      window.addEventListener(type, markMoved, { once: true, passive: true });
    });
    // Webフォントの読み込みで位置がずれた場合に、操作前なら目的位置へ合わせ直す
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (!userMoved) settle(); });
    }
  });

  window.addEventListener('load', () => { if (!userMoved) settle(); });

  // 戻る／進む（bfcacheからの復元）でもFVから（#付きなら目的位置）
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      userMoved = false;
      settle();
    }
  });

  // 同じページ内のセクションリンク：スクロールはブラウザに任せ、見出しへフォーカスを移す
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href*="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, location.href);
    if (url.pathname !== location.pathname || url.search !== location.search) return;
    const id = decodeURIComponent(url.hash.slice(1));
    const target = id === 'top' ? document.getElementById('top') : document.getElementById(id);
    if (!target) return;
    requestAnimationFrame(() => focusTarget(target));
  });
})();
