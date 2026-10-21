/** Trái tim bay từ nút ♡ trên thẻ lên nút Đã lưu ở header (#savedBtn). */
export function flyHeart(from: HTMLElement): void {
  const target = document.getElementById('savedBtn');
  if (!target || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const h = document.createElement('div');
  h.className = 'flyheart';
  h.innerHTML = '<svg class="i" style="width:22px;height:22px"><use href="#heartFill"/></svg>';
  h.style.left = a.left + a.width / 2 - 11 + 'px';
  h.style.top = a.top + a.height / 2 - 11 + 'px';
  document.body.appendChild(h);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  h.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(1.4)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.6)`, opacity: 0.9 },
    ],
    { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)' },
  ).onfinish = () => {
    h.remove();
    target.classList.remove('bump');
    void target.offsetWidth;
    target.classList.add('bump');
  };
}
