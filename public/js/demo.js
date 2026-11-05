// Sprocket, working in the browser: a sample roll in the editor, and what one file holds before
// and after saving. The rules are the app's: an edit flows down the linked frames and stops at the
// first frame set by hand, unlinked frames are passed over and pass nothing on, dates run one
// second apart, flash is per frame, and the lists only offer what the kit can do. Nothing is stored.

(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const live = $('#live');
  const say = text => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = text; }); };

  // ── The kit: a few of the app's catalogue entries ──

  const MODERN = [30, 15, 8, 4, 2, 1, 1/2, 1/4, 1/8, 1/15, 1/30, 1/60, 1/125, 1/250, 1/500, 1/1000, 1/2000, 1/4000, 1/8000];
  const OLD = [1, 1/2, 1/5, 1/10, 1/25, 1/50, 1/100, 1/250, 1/500, 1/1000];
  const same = (a, b) => Math.abs(a - b) <= Math.max(a, b) * 0.002;
  const series = (table, slow, fast) => table.filter(s => s <= slow * 1.002 && s >= fast * 0.998);
  const APERTURES = [0.95, 1, 1.2, 1.4, 1.5, 1.7, 1.8, 2, 2.4, 2.5, 2.8, 3.2, 3.5, 3.8, 4, 4.5, 4.8, 5.6, 6.3, 6.8, 8, 9, 11, 16, 22];
  const FOCALS = [8, 10, 12, 14, 15, 16, 17, 18, 19, 20, 21, 24, 25, 28, 30, 35, 38, 40, 43, 45, 50, 55, 58, 60, 65, 70, 75, 80, 85, 90, 100, 105, 110, 120, 135, 150, 180, 200, 210, 250, 300];

  const lens = (make, name, short, long, ap) => ({ make, name, short, long, ap });
  const KITS = [
    { make: 'Leica', model: 'M3', serial: '918304', speeds: series(OLD, 1, 1/1000), bulb: true, lenses: [
      lens('Leica', 'Summicron-M 50mm f/2', 50, 50, 2), lens('Leica', 'Elmarit-M 90mm f/2.8', 90, 90, 2.8), lens('Leica', 'Summaron-M 35mm f/2.8', 35, 35, 2.8)] },
    { make: 'Nikon', model: 'F3', serial: '1623487', speeds: series(MODERN, 8, 1/2000), bulb: true, lenses: [
      lens('Nikon', 'Nikkor 50mm f/1.4', 50, 50, 1.4), lens('Nikon', 'Nikkor 35-70mm f/3.5', 35, 70, 3.5), lens('Nikon', 'Nikkor 105mm f/2.5', 105, 105, 2.5)] },
    { make: 'Hasselblad', model: '500C/M', serial: '16TE 14523', speeds: series(MODERN, 1, 1/500), bulb: true, lenses: [
      lens('Carl Zeiss', 'Planar 80mm f/2.8', 80, 80, 2.8), lens('Carl Zeiss', 'Distagon 50mm f/4', 50, 50, 4), lens('Carl Zeiss', 'Sonnar 150mm f/4', 150, 150, 4)] },
    { make: 'Franke & Heidecke', model: 'Rolleiflex 2.8F', serial: '2481937', speeds: series(MODERN, 1, 1/500), bulb: true, lenses: [lens('Carl Zeiss', 'Planar 80mm f/2.8', 80, 80, 2.8)] },
    { make: 'Eastman Kodak', model: 'No. 2 Brownie Model F', speeds: [1/50], bulb: true, lenses: [lens('Kodak', 'Meniscus 100mm f/11', 100, 100, 11)] },
  ];
  const FILMS = [['Kodak Portra 400', 400], ['Kodak Tri-X 400', 400], ['Ilford HP5 Plus', 400], ['Kodak Ektar 100', 100], ['Fujifilm Velvia 50', 50]];
  const AUTHOR = 'Kris Van de Sande', LAB = 'Local Film Lab';

  const FIRST = new Date(2026, 2, 14, 11, 2, 5).getTime();   // the date the sample files carry
  let kit = KITS[0], film = FILMS[0], selected = 0, saving = false, bulbRow = -1;
  const rows = [0, 1, 2, 3, 4, 5].map(i => ({
    file: `Roll12_${String(i + 1).padStart(2, '0')}.tif`, img: `/img/frames/frame-0${i + 1}.webp`,
    date: FIRST + i * 41000, fileDate: FIRST + i * 41000,
    lens: 0, focal: null, aperture: null, shutter: null,
    flash: false, linked: true, own: new Set(), saved: false,
  }));

  // ── Labels and lists ──

  const speedLabel = s => s >= 1 ? `${s} s` : (() => { const d = Math.round(1 / s); return Math.abs(1 / s - d) / (1 / s) < 0.01 ? `1/${d}` : `${s} s`; })();
  const focalLabel = v => `${v} mm`;
  const apLabel = v => `f/${v}`;
  const pad = n => String(n).padStart(2, '0');
  const dateValue = ms => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  const exifDate = ms => dateValue(ms).replace('T', ' ').replace(/-/g, ':');

  const apertures = r => { const w = kit.lenses[r.lens].ap; const l = APERTURES.filter(a => a >= w); return l.includes(w) ? l : [w, ...l]; };
  const focals = r => {
    const { short, long } = kit.lenses[r.lens];
    return long === short ? [short] : [...new Set([short, ...FOCALS.filter(f => f >= short && f <= long), long])];
  };
  const fixedFocal = l => l.long === l.short ? l.short : null;

  // ── The river ──

  const touched = () => { rows.forEach(r => { r.saved = false; }); };

  function flow(i, field, value, byHand = true) {
    const source = rows[i];
    source[field] = value;
    if (byHand) source.own.add(field); else source.own.delete(field);
    source.saved = false;
    if (!source.linked) return;
    let step = 0;
    for (let j = i + 1; j < rows.length; j++) {
      const r = rows[j];
      if (!r.linked) continue;
      if (r.own.has(field)) break;
      step++;
      r[field] = field === 'date' ? value + step * 1000 : value;
      r.saved = false;
    }
  }

  // A lens brings its focal length, but a frame's typed focal length stays and doesn't stop the lens.
  function setLens(i, index) {
    flow(i, 'lens', index);
    const l = kit.lenses[index], focal = fixedFocal(l);
    rows[i].focal = focal; rows[i].own.delete('focal');
    if (!rows[i].linked) return;
    for (let j = i + 1; j < rows.length; j++) {
      const r = rows[j];
      if (!r.linked) continue;
      if (r.own.has('lens')) break;
      if (!r.own.has('focal')) r.focal = focal;
    }
  }

  function clearOwn(i, field) {
    let above = null;
    for (let j = i - 1; j >= 0; j--) if (rows[j].linked) { above = j; break; }
    const start = { date: rows[i].fileDate, lens: 0, focal: fixedFocal(kit.lenses[0]), aperture: null, shutter: null };
    const value = !rows[i].linked || above === null ? start[field]
      : field === 'date' ? rows[above].date + 1000 : rows[above][field];
    flow(i, field, value, false);
    if (field === 'lens') { rows[i].focal = fixedFocal(kit.lenses[value]); }
  }

  function applyKit() {
    rows.forEach(r => {
      r.lens = 0; r.focal = fixedFocal(kit.lenses[0]); r.aperture = null;
      r.shutter = kit.speeds.length === 1 ? kit.speeds[0] : null;   // one speed: every frame was shot at it
      r.own.delete('lens'); r.own.delete('focal'); r.own.delete('aperture'); r.own.delete('shutter');
      r.saved = false;
    });
    bulbRow = -1;
  }

  // ── Drawing ──

  const options = (list, label, value, blank) => {
    const present = value == null || list.some(v => same(v, value));
    const all = present ? list : [value, ...list];
    return `<option value="">${esc(blank)}</option>` + all.map(v =>
      `<option value="${v}"${value != null && same(v, value) ? ' selected' : ''}>${esc(label(v))}</option>`).join('');
  };
  const clear = (i, f, r) => r.own.has(f)
    ? `<button type="button" class="clear" data-clear="${f}" data-i="${i}" aria-label="Take this value from the roll again" title="Take this value from the roll again">✕</button>` : '';
  const wellClass = (r, f, empty) => `well${r.own.has(f) ? ' own' : ''}${empty ? ' blank' : ''}`;

  function rowHTML(r, i) {
    const lensList = kit.lenses.map((l, n) => `<option value="${n}"${n === r.lens ? ' selected' : ''}>${esc(l.name)}</option>`).join('');
    const single = kit.lenses.length === 1;
    const shutterField = bulbRow === i
      ? `<span class="well own"><input data-f="bulb" data-i="${i}" inputmode="decimal" placeholder="seconds" aria-label="Frame ${i + 1}: seconds the shutter was held open"></span>`
      : `<span class="${wellClass(r, 'shutter', r.shutter == null)}"><select data-f="shutter" data-i="${i}" aria-label="Frame ${i + 1} shutter speed">${options(kit.speeds, speedLabel, r.shutter, '1/')}${kit.bulb ? '<option value="B">B</option>' : ''}</select></span>`;
    return `<article class="row${i === selected ? ' on' : ''}${r.linked ? '' : ' off'}" data-row="${i}">
      <div><img src="${r.img}" width="104" height="70" alt=""><span class="frame-no">${i + 1}  ${esc(r.file)}</span></div>
      <div class="fields">
        <div class="line">
          <span class="${wellClass(r, 'date')} grow"><input type="datetime-local" step="1" value="${dateValue(r.date)}" data-f="date" data-i="${i}" aria-label="Frame ${i + 1} date and time"></span>${clear(i, 'date', r)}
          <button type="button" class="icon flash" data-flash="${i}" aria-pressed="${r.flash}" aria-label="Frame ${i + 1}: flash fired" title="${r.flash ? 'Flash fired' : 'No flash'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="${r.flash ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" d="M13.6 2 4.6 13.4h6l-1.4 8.6 9.2-11.6h-6Z"/></svg></button>
          <button type="button" class="icon link" data-link="${i}" aria-pressed="${r.linked}" aria-label="Frame ${i + 1}: linked to the roll" title="${r.linked ? 'Linked to the roll' : 'Taken out of the river'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M10 14a4 4 0 0 0 5.7 0l3.2-3.2a4 4 0 0 0-5.7-5.7L12 6.300M14 10a4 4 0 0 0-5.7 0l-3.2 3.2a4 4 0 0 0 5.700 5.700L12 17.700"/></svg></button>
        </div>
        <div class="line">
          <span class="${wellClass(r, 'lens')} grow"><select data-f="lens" data-i="${i}" aria-label="Frame ${i + 1} lens"${single ? ' disabled' : ''}>${lensList}</select></span>${clear(i, 'lens', r)}
        </div>
        <div class="trio">
          <span class="slot"><span class="${wellClass(r, 'focal', r.focal == null)}"><select data-f="focal" data-i="${i}" aria-label="Frame ${i + 1} focal length">${options(focals(r), focalLabel, r.focal, 'mm')}</select></span>${clear(i, 'focal', r)}</span>
          <span class="slot"><span class="${wellClass(r, 'aperture', r.aperture == null)}"><select data-f="aperture" data-i="${i}" aria-label="Frame ${i + 1} aperture">${options(apertures(r), apLabel, r.aperture, 'f/')}</select></span>${clear(i, 'aperture', r)}</span>
          <span class="slot">${shutterField}${clear(i, 'shutter', r)}</span>
        </div>
      </div>
    </article>`;
  }

  const fileTags = r => {
    const l = kit.lenses[r.lens];
    return [
      ['Make', 'NIKON CORPORATION', kit.make],
      ['Model', 'NIKON Z 7', kit.model],
      ['LensModel', 'NIKKOR Z MC 105mm f/2.8', l.name],
      ['FocalLength', '105 mm', r.focal == null ? null : focalLabel(r.focal)],
      ['FNumber', 'f/8', r.aperture == null ? null : apLabel(r.aperture)],
      ['ExposureTime', '1/125', r.shutter == null ? null : speedLabel(r.shutter)],
      ['ISOSpeedRatings', '100', String(film[1])],
      ['DateTimeOriginal', exifDate(r.fileDate), exifDate(r.date)],
      ['ImageDescription', '', film[0]],
      ['Software', 'NX Studio 1.6', LAB],
      ['Artist', '', AUTHOR],
      ['Flash', '', r.flash ? 'Fired' : 'Did not fire'],
      ['BodySerialNumber', '6012481', kit.serial ?? null],
      ['MakerNote', '1,204 bytes', null],
    ];
  };

  function drawTags() {
    const r = rows[selected];
    $('#tagTitle').textContent = r.file;
    $('#tagState').textContent = r.saved ? 'Saved' : 'Not saved yet';
    $('#tagHead').textContent = r.saved ? 'In the file now' : 'After Save';
    $('#tags').innerHTML = fileTags(r).map(([tag, before, after]) => {
      const unchanged = before === after;
      return `<tr><td>${esc(tag)}</td><td class="${unchanged || !before ? 'same' : ''}">${esc(before || '–')}</td><td class="${after == null ? 'gone' : unchanged ? '' : 'new'}">${esc(after ?? 'removed')}</td></tr>`;
    }).join('');
  }

  function draw() {
    const box = $('#rows');
    const key = document.activeElement?.dataset?.f, at = document.activeElement?.dataset?.i;
    const top = box.scrollTop;
    box.innerHTML = rows.map(rowHTML).join('');
    box.scrollTop = top;
    if (key) box.querySelector(`[data-f="${key}"][data-i="${at}"]`)?.focus();
    const dirty = rows.some(r => !r.saved);
    const save = $('#save');
    if (!saving) { save.textContent = dirty ? 'Save data to photos' : 'Saved'; save.disabled = !dirty; }
    $('#count').textContent = `${rows.length} photos`;
    drawTags();
  }

  // ── Input ──

  const num = v => v === '' ? null : Number(v);

  function commitBulb(el) {
    const i = Number(el.dataset.i), seconds = parseFloat(el.value.replace(',', '.'));
    bulbRow = -1;
    if (seconds > 0 && Number.isFinite(seconds)) flow(i, 'shutter', seconds);
    draw();
  }

  const box = $('#rows');
  box.addEventListener('change', e => {
    const el = e.target, i = Number(el.dataset.i), f = el.dataset.f;
    if (!f || f === 'date' || f === 'bulb') return;
    selected = i;
    if (f === 'lens') setLens(i, Number(el.value));
    else if (f === 'shutter' && el.value === 'B') { bulbRow = i; draw(); box.querySelector('[data-f="bulb"]').focus(); return; }
    else flow(i, f, num(el.value));
    if (f === 'shutter') $('#tryText').textContent = 'See how it flowed down? Set another frame by hand and it stops there.';
    say(`Frame ${i + 1} changed. Linked frames below follow.`);
    draw();
  });
  box.addEventListener('focusout', e => {
    const el = e.target;
    if (el.dataset.f === 'bulb') { commitBulb(el); return; }
    if (el.dataset.f !== 'date' || !el.value) return;
    const i = Number(el.dataset.i), ms = new Date(el.value).getTime();
    if (Number.isFinite(ms) && ms !== rows[i].date) { flow(i, 'date', ms); draw(); }
  });
  box.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('input')) e.target.blur();
    if (e.key === 'Escape' && e.target.dataset.f === 'bulb') { e.target.value = ''; e.target.blur(); }
  });
  box.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (t?.dataset.clear) { clearOwn(Number(t.dataset.i), t.dataset.clear); draw(); return; }
    if (t?.dataset.flash) { const r = rows[Number(t.dataset.flash)]; r.flash = !r.flash; r.saved = false; draw(); return; }
    if (t?.dataset.link) {
      const r = rows[Number(t.dataset.link)];
      r.linked = !r.linked;
      say(r.linked ? 'Back in the river.' : 'Taken out of the river. Edits pass this frame by.');
      draw(); return;
    }
    const row = e.target.closest('[data-row]');
    if (row && !e.target.matches('select, input') && selected !== Number(row.dataset.row)) { selected = Number(row.dataset.row); draw(); }
  });

  const camera = $('#camera'), filmPick = $('#film');
  camera.innerHTML = KITS.map((k, i) => `<option value="${i}">${esc(`${k.make} ${k.model}${k.serial ? `  ·  No. ${k.serial}` : ''}`)}</option>`).join('');   // the serials are made up
  filmPick.innerHTML = FILMS.map((f, i) => `<option value="${i}">${esc(f[0])}</option>`).join('');
  camera.addEventListener('change', () => { kit = KITS[Number(camera.value)]; applyKit(); say(`${kit.make} ${kit.model} chosen. The lists now follow its lenses and shutter.`); draw(); });
  filmPick.addEventListener('change', () => { film = FILMS[Number(filmPick.value)]; touched(); draw(); });

  $('#save').addEventListener('click', async () => {
    if (saving) return;
    saving = true;
    const save = $('#save');
    save.disabled = true;
    for (let i = 0; i < rows.length; i++) {
      save.textContent = `Saving ${i + 1} of ${rows.length}…`;
      if (!reduceMotion) await new Promise(done => setTimeout(done, 160));
      rows[i].saved = true;
      drawTags();
    }
    saving = false;
    say('Saved. Every frame now reads as a digital original.');
    draw();
  });

  applyKit();
  draw();
})();
