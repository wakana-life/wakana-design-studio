/*
 * 右端の和柄の光（仕様書20261029 第4章・20261104 第8章）
 * 移植元：WAKANA/HP制作/完成物/和叶_和柄追従プレビュー_20261028/pattern-light.js
 * ページ全体を通した一本の和柄レール。画像読込・実績切替による高さ変更にも対応。
 *
 * - カーソルの高さ（clientY）へ上下のみ追従。補間係数 1 − exp(−dt/65)、dt上限64ms、誤差0.15px未満で一致
 * - 追従値は画面座標で保持し、描画時だけ各レールの上端との差に変換（スクロール量を累積しない）
 * - カーソルが画面外へ出たら非表示、戻ったら再表示。タッチ操作では追従しない
 * - prefers-reduced-motion では補間を省く。スマホ幅ではレール自体を表示しない（CSS）
 */
(() => {
  'use strict';

  const glows = Array.from(document.querySelectorAll('.rail__glow'));
  if (!glows.length) return;
  const lights = glows.map((glow) => glow.querySelector('.rail__light'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pc = window.matchMedia('(min-width: 768px)');

  let targetY = window.innerHeight / 2;
  let currentY = targetY;
  let frame = 0;
  let lastTime = 0;

  function paint() {
    if (!pc.matches) return;
    glows.forEach((glow, i) => {
      const localY = currentY - glow.getBoundingClientRect().top;
      lights[i].style.setProperty('--light-y', `${localY}px`);
    });
  }

  function tick(time) {
    const dt = lastTime ? Math.min(time - lastTime, 64) : 16.67;
    lastTime = time;
    currentY = reduced.matches ? targetY : currentY + (targetY - currentY) * (1 - Math.exp(-dt / 65));
    if (Math.abs(targetY - currentY) < 0.15) currentY = targetY;
    paint();
    if (currentY !== targetY) {
      frame = requestAnimationFrame(tick);
    } else {
      frame = 0;
      lastTime = 0;
    }
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function setOpacity(value) {
    lights.forEach((light) => light.style.setProperty('--light-opacity', value));
  }

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    targetY = event.clientY;
    setOpacity('1');
    schedule();
  }, { passive: true });

  window.addEventListener('scroll', paint, { passive: true });
  window.addEventListener('resize', () => {
    targetY = Math.min(targetY, window.innerHeight);
    currentY = Math.min(currentY, window.innerHeight);
    paint();
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', () => setOpacity('0'));
  document.documentElement.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch') return;
    targetY = event.clientY;
    setOpacity('1');
    schedule();
  });

  reduced.addEventListener('change', schedule);
  pc.addEventListener('change', paint);
  window.addEventListener('load', paint);
  paint();
})();
