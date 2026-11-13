/*
 * Portfolio & Works：カテゴリーの絞り込みと、作品の全体表示（モーダル）
 * 承認デモ（approved-demo/assets/works.js）の作品データ・画像対応・切り出しを本実装へ移植。
 * 一覧のカードはHTMLに記述し、ここでは拡大表示の内容だけを持つ。
 *
 * モーダル：dialog.showModal() で背景を操作不可（inert相当）にし、Tab/Shift+Tabはダイアログ内で循環。
 * 閉じる：×ボタン・Escape・背景クリック。開いている間は背面をスクロールさせない。
 * 閉じたら開いた要素へフォーカスを戻す（作品画像をクリックした場合は同じ作品の「全体イメージを見る」へ）。
 */
(() => {
  'use strict';

  const IMG = 'assets/img/portfolio/';

  // 作品ごとの拡大表示（画像・注記はデモの内容のまま。作品・担当範囲・説明は追加しない）
  // 拡大表示の画像は原寸（高解像度）のまま。PNG原本は全画素が一致する可逆WebPに置き換えている（full-*.webp）。一覧には軽量な list-*.webp を使い、ここの画像はモーダルを開いたとき
  // （またはカードにポインター／フォーカスが乗ったときの先読み）に初めて読み込む。w/h は表示前に枠を確保するための実寸。
  const WORKS = {
    '01': {
      cat: 'hp', type: 'HPデザイン',
      image: { src: 'full-restaurant.webp', w: 1129, h: 2458 }, // 原本PNGと全画素一致（可逆WebP）
      note: '一覧にはHPのファーストビューを掲載しています。拡大画面では提供された縦長のページ全体を確認できます。'
    },
    '03': {
      cat: 'lp', type: 'LP・バナーデザイン',
      image: { src: 'nursery.webp', w: 2021, h: 1431 }, // 制作紹介PDF（LP＋SNSバナー）の資料全体
      note: '一覧は制作紹介PDF内のLPファーストビューを切り出して掲載しています。拡大時はLPとSNSバナーを含む横長の制作紹介資料全体を表示します。資料に記載の担当は「ディレクション：WAKANA design studio／デザイン：結-yuinowa」です。'
    },
    '04': {
      // LINE講座：一覧は提供のFV画像（list-marketing.webp、2026-11-13差し替え）。拡大は従来の全体画像のまま
      cat: 'lp', type: 'LPデザイン',
      image: { src: 'full-marketing.webp', w: 1546, h: 1080 }, // 複数画面を並べた元の全体画像（原本PNGと全画素一致の可逆WebP）
      note: '一覧にはLPのファーストビュー画像を掲載しています。拡大時は複数画面を並べた制作画像全体を表示します。'
    },
    '06': {
      cat: 'dtp', type: 'DTPデザイン',
      cards: [
        // 箔押し名刺：原画像の白い余白を除いた範囲を原寸・可逆で切り出した画像（画素は原画像と同一）
        { src: 'full-foil.webp', w: 560, h: 1032, crop: 'foil', caption: '箔押し名刺' },
        { src: 'cardfront-original.png', w: 650, h: 1075, caption: '和叶 名刺表面' },
        { src: 'cardback-original.jpg', w: 650, h: 1075, caption: '和叶 名刺裏面' }
      ],
      note: '2種類の名刺デザインを同一カテゴリー内で展示しています。和叶名刺のQRコード・電話番号などは提供画像中のダミー表記です。'
    },
    '07': {
      cat: 'dtp', type: 'DTPデザイン',
      image: { src: 'full-poster.webp', w: 859, h: 1209 }, // 原本PNGと全画素一致（可逆WebP）
      note: '元デザインを変更せず展示用背景に配置しています。'
    },
    '08': {
      cat: 'dtp', type: 'DTPデザイン',
      image: { src: 'ticket.webp', w: 1072, h: 1516 },
      note: '提供PDFは複数枚の金券を並べた印刷用の面付データです。個別金券のデザインはこの中に含まれています。'
    }
  };

  // スマホ表示か（共通の切り替え幅 767.98px）。4列の資料はスマホで列ごとの画像、PCで全体画像の一方だけを読み込む
  const phone = window.matchMedia('(max-width: 767.98px)');
  const useColumns = (work) => Boolean(work.columns) && phone.matches;
  const fullImages = (work) => (work.cards ? work.cards : useColumns(work) ? work.columns : [work.image]);

  /* ---------- カテゴリーの絞り込み ----------
   * 初期表示はアクセス元のリンクに合わせる（URLの ?category=）：
   *   なし（通常の Portfolio & Works リンク）→ すべて
   *   web（Service「Web制作実績を見る」）→ HP・LP（既存の「HPデザイン」「LPデザイン」の2つを選択状態にする。新しいボタンは追加しない）
   *   dtp（Service DTPの「制作実績を見る」）→ DTP
   * 遷移後もボタンで自由に切り替えられる。切り替えたらURLの ?category= だけを置き換え（履歴は増やさない）、
   * 再読み込み・戻る／進むでも直前の選択を表示する。不明な値は「すべて」。 */
  const filters = Array.from(document.querySelectorAll('.pw-filter'));
  const cats = Array.from(document.querySelectorAll('.pw-cat'));
  const GROUPS = { all: ['hp', 'lp', 'dtp'], web: ['hp', 'lp'], hp: ['hp'], lp: ['lp'], dtp: ['dtp'] };
  const PARAM = 'category';
  const isKey = (key) => Object.prototype.hasOwnProperty.call(GROUPS, key);

  function applyFilter(key) {
    const shown = GROUPS[key];
    filters.forEach((f) => {
      const on = key === 'all' ? f.dataset.filter === 'all' : f.dataset.filter !== 'all' && shown.includes(f.dataset.filter);
      f.classList.toggle('is-active', on);
      f.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    cats.forEach((cat) => {
      cat.hidden = !shown.includes(cat.dataset.category);
    });
  }

  function rememberFilter(key) {
    try {
      const url = new URL(location.href);
      if (key === 'all') url.searchParams.delete(PARAM);
      else url.searchParams.set(PARAM, key);
      if (url.href !== location.href) history.replaceState(history.state, '', url.href);
    } catch (e) { /* URLを書き換えられない環境でも絞り込み自体は動かす */ }
  }

  const initialKey = new URLSearchParams(location.search).get(PARAM);
  if (initialKey && isKey(initialKey) && initialKey !== 'all') applyFilter(initialKey);

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.filter;
      if (!isKey(key)) return;
      applyFilter(key);
      rememberFilter(key);
    });
  });

  /* ---------- 作品の全体表示 ---------- */
  const modal = document.getElementById('pw-modal');
  if (!modal || typeof modal.showModal !== 'function') return;

  const titleEl = document.getElementById('pw-modal-title');
  const subtitleEl = document.getElementById('pw-modal-subtitle');
  const contentEl = document.getElementById('pw-modal-content');
  const closeButton = modal.querySelector('.pw-dialog__close');
  const root = document.documentElement;
  let returnFocus = null;
  let currentId = null;

  const el = (tag, className, attrs) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    return node;
  };

  function buildContent(work, name) {
    const frag = document.createDocumentFragment();
    if (work.cards) {
      const sets = el('div', 'pw-cards');
      work.cards.forEach((card, i) => {
        const figure = el('figure');
        const display = el('div', 'pw-card-display');
        const img = el('img', '', { src: IMG + card.src, width: card.w, height: card.h, decoding: 'async', alt: `${name} 画像${i + 1}` });
        if (card.crop) {
          const crop = el('span', `pw-crop pw-crop--${card.crop}`);
          crop.appendChild(img);
          display.appendChild(crop);
        } else {
          display.appendChild(img);
        }
        const caption = el('figcaption');
        caption.textContent = card.caption;
        figure.append(display, caption);
        sets.appendChild(figure);
      });
      frag.appendChild(sets);
    } else if (useColumns(work)) {
      // スマホ：4列を縦に並べる（既存LPと同じ縦スクロール）
      const cols = el('div', 'pw-columns');
      work.columns.forEach((col, i) => {
        cols.appendChild(el('img', '', { src: IMG + col.src, width: col.w, height: col.h, decoding: 'async', alt: `${name}のデザイン（${work.columns.length}列中${i + 1}列目）` }));
      });
      frag.appendChild(cols);
    } else {
      const wrap = el('div', 'pw-full');
      const { src, w, h } = work.image;
      wrap.appendChild(el('img', '', { src: IMG + src, width: w, height: h, decoding: 'async', alt: `${name}のデザイン全体` }));
      frag.appendChild(wrap);
    }
    // 注記：文字列は1段落、配列は段落ごとに表示
    (Array.isArray(work.note) ? work.note : [work.note]).forEach((text) => {
      const note = el('p', 'pw-dialog__note');
      note.textContent = text;
      frag.appendChild(note);
    });
    // 全体画像が読み込めなかったとき（通信の途切れ等）：壊れた画像の代わりに案内を表示（1回だけ）
    frag.querySelectorAll('img').forEach((img) => {
      img.addEventListener('error', () => {
        img.hidden = true;
        if (contentEl.querySelector('.pw-dialog__error')) return;
        const msg = el('p', 'pw-dialog__error', { role: 'status' });
        msg.textContent = '画像を表示できませんでした。お手数ですが、時間をおいて再度お試しください。';
        contentEl.prepend(msg);
      }, { once: true });
    });
    return frag;
  }

  function open(id, trigger) {
    const work = WORKS[id];
    const card = document.querySelector(`.pw-work[data-work="${id}"]`);
    if (!work || !card || modal.open) return;
    const name = card.querySelector('.pw-work__name').textContent.trim();
    // キーボード操作のボタンはそのボタンへ、画像クリックは同じ作品の「全体イメージを見る」へ戻す
    returnFocus = trigger && trigger.matches('button') ? trigger : card.querySelector('button.pw-open');

    currentId = id;
    modal.dataset.category = work.cat;
    titleEl.textContent = name;
    subtitleEl.textContent = `${work.type} ／ 全体イメージ`;
    contentEl.replaceChildren(buildContent(work, name));
    contentEl.scrollTop = 0;

    root.classList.add('pw-lock');
    modal.showModal();
    closeButton.focus();
  }

  function close() {
    if (!modal.open) return;
    modal.close();
  }

  // close() でも Escape（cancel→close）でも、ここで後始末とフォーカス復帰を行う
  // 開いている間にスマホ⇔PCの幅をまたいだ場合（端末の回転など）、4列の資料だけ表示を作り直す（フォーカスは閉じるボタンのまま）
  phone.addEventListener('change', () => {
    const work = WORKS[currentId];
    if (!modal.open || !work || !work.columns) return;
    contentEl.replaceChildren(buildContent(work, titleEl.textContent));
    contentEl.scrollTop = 0;
  });

  modal.addEventListener('close', () => {
    currentId = null;
    root.classList.remove('pw-lock');
    contentEl.replaceChildren();
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
    returnFocus = null;
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open]');
    if (trigger && !modal.open) open(trigger.dataset.open, trigger);
  });

  // 先読み：マウスがカードの上に0.2秒以上とどまったとき、または「全体イメージを見る」にフォーカスしたときだけ、
  // その作品の全体画像を1回だけ読み込み始める（一覧の表示・スクロールやマウスの通過では読み込まない）。
  // 通信量節約の設定（Save-Data）では行わない。
  const preloaded = new Set();
  const saveData = navigator.connection && navigator.connection.saveData;
  function preload(id) {
    const work = WORKS[id];
    if (saveData || !work || preloaded.has(id)) return;
    preloaded.add(id);
    fullImages(work).forEach((item) => { const img = new Image(); img.decoding = 'async'; img.src = IMG + item.src; });
  }
  document.querySelectorAll('.pw-work[data-work]').forEach((card) => {
    const id = card.dataset.work;
    if (!WORKS[id]) return; // 掲載予定の枠
    let timer = 0;
    card.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse') return;
      timer = setTimeout(() => preload(id), 200);
    });
    card.addEventListener('pointerleave', () => clearTimeout(timer));
    card.addEventListener('focusin', () => preload(id));
  });

  closeButton.addEventListener('click', close);

  // 背景（ダイアログの外側の暗い部分）をクリックしたら閉じる
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });

  // Tab/Shift+Tab をダイアログ内で循環させる（ブラウザのUIへも抜けない）
  modal.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const items = Array.from(modal.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])'))
      .filter((node) => !node.disabled && node.getClientRects().length);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  });
})();
