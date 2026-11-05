// Edge print down both sides of the page, at the film's own rhythm: the number and name on one
// side, wedge and frame number on the other, with a lone wedge halfway. It runs on for as long as
// the page does, so it moves with the page like a roll past a light box.
(() => {
  'use strict';
  const roll = document.getElementById('roll');
  const left = document.getElementById('railL');
  const right = document.getElementById('railR');
  const NAME_PITCH = 280, FRAME_PITCH = 330;
  let drawn = 0;

  const put = (rail, top, html) => {
    const s = document.createElement('span');
    s.style.top = `${top}px`;
    s.innerHTML = html;
    rail.append(s);
  };

  const draw = () => {
    const height = roll.offsetHeight;
    if (height === drawn) return;
    drawn = height;
    left.textContent = '';
    right.textContent = '';
    for (let i = 0, y = 72; y < height - 80; i++, y += NAME_PITCH) put(right, y, `${46 + i}  SPROCKET`);
    for (let i = 1, y = 110; y < height - 80; i++, y += FRAME_PITCH) {
      put(left, y, `<i class="wedge"></i>${i}`);
      put(left, y + FRAME_PITCH / 2, '<i class="wedge"></i>');
    }
  };

  draw();
  new ResizeObserver(draw).observe(roll);
})();
