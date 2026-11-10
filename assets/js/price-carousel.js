/* 料金カードの横スクロール（Service）
   ・全カードが収まる幅：横スクロールにせず中央に並べる（.is-static）
   ・収まらない幅：中央吸着（CSS scroll-snap）＋左右どちらにも途切れない循環
     前後に複製カードを置き（aria-hidden・inert・IDなし＝読み上げ・フォーカスの重複なし）、
     スクロールが止まった時に複製の上にいれば、同じ見た目の実物カードへ瞬時に位置を戻す。
   ・操作：タッチのフリック、トラックパッド／横ホイール、マウスのドラッグ、左右矢印キー、前後ボタン
   ・data-start：初期表示で中央に置くカードの番号（0始まり。Web料金は Standard＝1） */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const SIDE_GAP = 24; // 収まるかの判定で左右に残す余白

  document.querySelectorAll('[data-carousel]').forEach(init);

  function init(root) {
    const vp = root.querySelector('.price-carousel__viewport');
    const track = root.querySelector('.price-carousel__track');
    const originals = Array.from(track.children);
    const n = originals.length;
    const controls = root.querySelector('.price-carousel__controls');
    const prevBtn = root.querySelector('.price-carousel__btn--prev');
    const nextBtn = root.querySelector('.price-carousel__btn--next');
    const status = root.querySelector('.price-carousel__status');
    const names = originals.map((li) => (li.querySelector('h3') || li).textContent.trim());
    const vpLabel = vp.getAttribute('aria-label');

    let mode = '';
    let sets = 0;            // 片側の複製セット数
    let current = Math.min(n - 1, Math.max(0, parseInt(root.dataset.start || '0', 10) || 0));
    let settleTimer = 0;

    const items = () => Array.from(track.children);
    const behavior = () => (reduce.matches ? 'auto' : 'smooth');

    function naturalWidth() {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return originals.reduce((s, li) => s + li.getBoundingClientRect().width, 0) + gap * (n - 1);
    }

    function centerOf(li) {
      return li.offsetLeft + li.offsetWidth / 2 - vp.clientWidth / 2;
    }

    function nearestIndex() {
      const mid = vp.scrollLeft + vp.clientWidth / 2;
      let best = 0;
      let bestD = Infinity;
      items().forEach((li, i) => {
        const d = Math.abs(li.offsetLeft + li.offsetWidth / 2 - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    }

    function jumpTo(index) {
      // 瞬時に移動（吸着・スムーズスクロールを一時的に止める）
      vp.style.scrollSnapType = 'none';
      vp.style.scrollBehavior = 'auto';
      vp.scrollLeft = centerOf(items()[index]);
      // 次の描画で吸着を戻す
      requestAnimationFrame(() => { vp.style.scrollSnapType = ''; vp.style.scrollBehavior = ''; });
    }

    function announce() {
      if (status) status.textContent = `${current + 1} / ${n}：${names[current]}`;
    }

    function removeClones() {
      track.querySelectorAll('[data-clone]').forEach((c) => c.remove());
      sets = 0;
    }

    function makeClone(li) {
      const c = li.cloneNode(true);
      c.setAttribute('data-clone', '');
      c.setAttribute('aria-hidden', 'true');
      // カード内にフォーカスできる要素はない。万一追加されても複製側はフォーカス対象外にする
      // （inert はホバー表示まで止めてしまうため使わない）
      c.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach((el) => el.setAttribute('tabindex', '-1'));
      c.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      c.querySelectorAll('[aria-labelledby]').forEach((el) => el.removeAttribute('aria-labelledby'));
      c.querySelectorAll('img').forEach((img) => { img.alt = ''; img.loading = 'eager'; });
      return c;
    }

    function buildClones() {
      const setW = naturalWidth() + (parseFloat(getComputedStyle(track).columnGap) || 0);
      const need = Math.max(1, Math.ceil(vp.clientWidth / Math.max(1, setW)) + 1);
      if (need === sets) return;
      removeClones();
      for (let s = 0; s < need; s++) {
        const before = document.createDocumentFragment();
        originals.forEach((li) => before.appendChild(makeClone(li)));
        track.insertBefore(before, track.firstChild);
        originals.forEach((li) => track.appendChild(makeClone(li)));
      }
      sets = need;
    }

    function setMode() {
      // 判定は複製なし・静的配置の幅で行う
      const available = root.clientWidth - SIDE_GAP * 2;
      const wasCarousel = mode === 'carousel';
      if (wasCarousel) current = realIndex(nearestIndex());
      const fits = naturalWidth() <= available;
      if (fits) {
        if (mode !== 'static') {
          removeClones();
          root.classList.add('is-static');
          vp.removeAttribute('tabindex');
          vp.removeAttribute('aria-label');
          if (controls) controls.hidden = true;
          mode = 'static';
        }
        return;
      }
      root.classList.remove('is-static');
      vp.setAttribute('tabindex', '0');
      vp.setAttribute('aria-label', vpLabel);
      if (controls) controls.hidden = false;
      mode = 'carousel';
      buildClones();
      jumpTo(sets * n + current);
      announce();
    }

    function realIndex(i) {
      return (((i - sets * n) % n) + n) % n;
    }

    // スクロールが止まったら：複製の上なら同じカードの実物へ戻す
    function settle() {
      if (mode !== 'carousel' || root.classList.contains('is-dragging')) return;
      const i = nearestIndex();
      const real = realIndex(i);
      const target = sets * n + real;
      if (i !== target) jumpTo(target);
      if (real !== current) { current = real; announce(); }
    }

    function onScroll() {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 140); // scrollend 非対応ブラウザ向けの保険
    }

    function go(delta) {
      if (mode !== 'carousel') return;
      const i = nearestIndex() + delta;
      const list = items();
      if (!list[i]) return;
      vp.scrollTo({ left: centerOf(list[i]), behavior: behavior() });
    }

    vp.addEventListener('scroll', onScroll, { passive: true });
    if ('onscrollend' in window) vp.addEventListener('scrollend', () => { clearTimeout(settleTimer); settle(); });

    vp.addEventListener('keydown', (e) => {
      if (mode !== 'carousel') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    if (prevBtn) prevBtn.addEventListener('click', () => go(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => go(1));

    // マウスのドラッグ（タッチ・ペンは標準のスクロールに任せる）
    let drag = null;
    vp.addEventListener('pointerdown', (e) => {
      if (mode !== 'carousel' || e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: vp.scrollLeft, moved: false, id: e.pointerId };
    });
    vp.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 4) return;
      if (!drag.moved) {
        drag.moved = true;
        vp.setPointerCapture(e.pointerId);
        vp.classList.add('is-dragging');
        root.classList.add('is-dragging');
      }
      vp.scrollLeft = drag.left - dx;
    });
    const endDrag = (e) => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const moved = drag.moved;
      drag = null;
      vp.classList.remove('is-dragging');
      root.classList.remove('is-dragging');
      if (moved) {
        // ドラッグ直後のクリックは無効にする（カード内のリンク等の誤作動防止）
        const block = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
        vp.addEventListener('click', block, { capture: true, once: true });
        setTimeout(() => vp.removeEventListener('click', block, { capture: true }), 0);
        go(0); // 一番近いカードへ吸着
      }
    };
    vp.addEventListener('pointerup', endDrag);
    vp.addEventListener('pointercancel', endDrag);
    vp.addEventListener('dragstart', (e) => e.preventDefault());

    // 幅の変化（画面幅・文字の拡大）：表示方法を見直し、中央のカードを保つ
    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setMode, 80);
    });
    ro.observe(root);

    setMode();
    // Webフォント読み込み後に幅を再確認
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(setMode);
  }
})();
