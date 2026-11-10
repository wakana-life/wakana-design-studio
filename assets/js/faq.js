/* よくあるご質問の開閉（Service）
   ・質問は <button aria-expanded aria-controls>。クリック／タップ／Enter／Spaceで開閉し、開閉状態を読み上げに伝える
   ・回答は hidden 属性で出し入れ（高さは内容に追従し、後続のセクションが自然に下がる）
   ・PC（768px以上）はFigmaの開閉バリアント（167:449）どおり1問ずつ、スマホは各質問を個別に開閉 */
(() => {
  'use strict';
  const pc = window.matchMedia('(min-width: 768px)');

  document.querySelectorAll('[data-faq]').forEach((root) => {
    const buttons = Array.from(root.querySelectorAll('.faq__btn'));

    const setOpen = (btn, open) => {
      const answer = document.getElementById(btn.getAttribute('aria-controls'));
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (answer) answer.hidden = !open;
      const item = btn.closest('.faq__item');
      if (item) item.classList.toggle('is-open', open);
    };

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        if (open && pc.matches) buttons.forEach((b) => { if (b !== btn) setOpen(b, false); });
        setOpen(btn, open);
      });
    });

    // PC幅に切り替わった時に複数開いていれば、最後に開いたもの以外を閉じる
    const onChange = () => {
      if (!pc.matches) return;
      const opened = buttons.filter((b) => b.getAttribute('aria-expanded') === 'true');
      opened.slice(0, -1).forEach((b) => setOpen(b, false));
    };
    if (pc.addEventListener) pc.addEventListener('change', onChange);
  });
})();
