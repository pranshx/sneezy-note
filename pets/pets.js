/*!
 * Pets — a tiny 2D desk-pet engine.
 * Four animals (dog, cat, bunny, fox) on one procedural side-view skeleton.
 * They walk, trot, hop, sit, groom, stretch, nap, get picked up and dropped,
 * greet each other, park somewhere, and deliver reminders in their own way:
 *   dog sneezes · cat swats · bunny thumps · fox pounces
 *
 * No dependencies. Plain script: <script src="pets/pets.js"></script>  ->  window.Pets
 * See INTEGRATION.md for the API.
 */
(function (root) {
  'use strict';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const sgn = v => (v < 0 ? -1 : 1);
  function weighted(w) {
    const keys = Object.keys(w); let sum = 0; keys.forEach(k => sum += w[k]);
    let r = Math.random() * sum;
    for (const k of keys) { if ((r -= w[k]) <= 0) return k; }
    return keys[0];
  }

  /* =====================================================================
   *  ART — every animal is a handful of SVG groups around pivots.
   *  Coordinates: viewBox 220x170, facing right, paws touch y=152.
   * ===================================================================== */
  const INK = '#2B2140';
  const stroke = (c, w) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  const ell = (cx, cy, rx, ry, fill, x = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${x}/>`;
  const leg = (L, w, fur, paw) =>
    `<rect x="${-w / 2}" y="-3" width="${w}" height="${L + 1}" rx="${w / 2}" fill="${fur}"/>` +
    ell(w * 0.22, L - 3, w * 0.8, 5.2, paw);

  // eyes + mouths shared by the dog/bunny/fox (round-eyed) species
  const faceBits = (ex, ey, mx, my, c) => ({
    eOpen: `<circle cx="${ex}" cy="${ey}" r="5" fill="${INK}"/><circle cx="${ex + 1.8}" cy="${ey - 2}" r="1.9" fill="#fff"/><circle cx="${ex - 1.7}" cy="${ey + 1.8}" r=".9" fill="#fff" opacity=".8"/>`,
    eShut: `<path d="M${ex - 5} ${ey + 1} q5 4 10 0" ${stroke(INK, 2.4)}/>`,
    eSqz: `<path d="M${ex - 5} ${ey - 5} l9 5 l-9 5" ${stroke(INK, 2.6)}/>`,
    eHappy: `<path d="M${ex - 5} ${ey + 3} q5 -7 10 0" ${stroke(INK, 2.8)}/>`,
    mClosed: `<path d="M${mx - 7} ${my - 1} Q${mx} ${my + 7} ${mx + 7} ${my - 1}" ${stroke(INK, 2.2)}/>`,
    mOpen: `<path d="M${mx - 9} ${my - 1} Q${mx - 1} ${my + 15} ${mx + 8} ${my - 1}Z" fill="#7A2E3A"/>` + ell(mx - 1, my + 7, 4, 3, '#FF7E95'),
    mPant: `<path d="M${mx - 9} ${my - 1} Q${mx - 1} ${my + 11} ${mx + 8} ${my - 1}Z" fill="#7A2E3A"/>` + ell(mx - 1, my + 8, 4.2, 5.4, '#FF7E95'),
    mSmile: `<path d="M${mx - 9} ${my - 2} Q${mx} ${my + 14} ${mx + 9} ${my - 2}Z" fill="#7A2E3A"/>` + ell(mx, my + 6.5, 4.6, 3, '#FF7E95')
  });
  const grp = (name, svg) => `<g data-p="${name}" style="display:none">${svg}</g>`;
  const faceGroups = f => grp('eOpen', f.eOpen) + grp('eShut', f.eShut) + grp('eSqz', f.eSqz) + grp('eHappy', f.eHappy) +
    grp('mClosed', f.mClosed) + grp('mOpen', f.mOpen) + grp('mPant', f.mPant) + grp('mSmile', f.mSmile);

  const SPECIES = {};

  /* ---- dog (honey, floppy ears) ---- */
  (function () {
    const c = { fur: '#E9A560', dark: '#C9823F', belly: '#FFF0D6', ear: '#9C5D30', nose: INK, blush: '#FF9BA6', paw: '#FFF0D6' };
    const f = faceBits(30, -18, 46, 2, c);
    SPECIES.dog = {
      name: 'dog', style: 'sneeze', W: 220, H: 170, G: 152, L: 40, legW: 12, legWF: 11,
      hipB: [70, 110], hipF: [132, 110], neck: [148, 92], tailP: [56, 96], earP: [8, -32],
      speed: 66, gait: 'walk', hopH: 0, headScale: 1.3, c,
      weights: { wander: 5, sniff: 3, sit: 3, sleep: 2, stretch: 1.5, yawn: 1, hop: 1, perch: 1, groom: 1 },
      body: `${ell(101, 100, 48, 28, c.fur)}${ell(104, 116, 36, 10, c.belly, 'opacity=".9"')}
        <path d="M60 84 Q100 62 140 84 Q120 74 100 74 Q80 74 60 84Z" fill="${c.dark}" opacity=".35"/>`,
      tail: `<path d="M0 0 C-14 -2 -22 -16 -17 -32" ${stroke(c.fur, 11)}/>`,
      head: `<path transform="translate(27,-32) rotate(16)" d="M0 0 C-14 2 -18 24 -5 32 C6 30 9 12 8 0Z" fill="${c.dark}"/>
        <circle cx="20" cy="-12" r="24" fill="${c.fur}"/>
        ${ell(40, -4, 16, 11.5, c.belly)}
        ${ell(53, -9, 5.4, 4.2, c.nose)}${ell(51.5, -10.4, 1.6, 1, '#fff', 'opacity=".6"')}
        <circle cx="23" cy="-2" r="5.5" fill="${c.blush}" opacity=".62"/>
        ${faceGroups(f)}
        <g data-p="ear"><path d="M0 0 C-16 2 -20 26 -6 34 C6 32 10 14 8 0Z" fill="${c.ear}"/></g>`
    };
  })();

  /* ---- cat (charcoal tuxedo, pointed ears, slit eyes) ---- */
  (function () {
    const c = { fur: '#4D4963', dark: '#383450', belly: '#F4F0FF', paw: '#F4F0FF', ear: '#FF9DB5', nose: '#FF8FAF', eye: '#B9F27C' };
    const f = faceBits(31, -17, 40, -3, c);
    f.eOpen = `<circle cx="31" cy="-17" r="5.6" fill="${c.eye}"/>${ell(31.6, -17, 2.8, 4.4, INK)}<circle cx="33.2" cy="-19.4" r="1.7" fill="#fff"/><circle cx="29.6" cy="-14.8" r=".8" fill="#fff" opacity=".8"/>`;
    f.mClosed = `<path d="M40 -3 q-3 4 -7 1 M40 -3 q3 4 7 1" ${stroke(INK, 1.8)}/>`;
    f.mOpen = `<path d="M33 -2 Q40 12 47 -2Z" fill="#7A2E3A"/>` + ell(40, 5, 3.6, 2.6, '#FF7E95');
    f.mPant = f.mOpen; f.mSmile = `<path d="M32 -4 Q40 12 48 -4Z" fill="#7A2E3A"/>` + ell(40, 4, 3.8, 2.6, '#FF7E95');
    SPECIES.cat = {
      name: 'cat', style: 'swat', W: 220, H: 170, G: 152, L: 38, legW: 9, legWF: 9,
      hipB: [72, 112], hipF: [130, 112], neck: [146, 96], tailP: [58, 100], earP: [18, -26],
      speed: 52, gait: 'walk', hopH: 0, headScale: 1.26, c,
      weights: { wander: 3, sit: 4, groom: 3, loaf: 3, sleep: 3, stretch: 2, perch: 2.5, sniff: 1, yawn: 1 },
      body: `${ell(100, 104, 44, 22, c.fur)}${ell(132, 108, 13, 17, c.belly)}${ell(102, 118, 30, 7, c.belly, 'opacity=".9"')}
        <path d="M70 88 l3 9 M82 85 l3 10 M94 84 l3 10" ${stroke(c.dark, 3)}/>`,
      tail: `<path d="M0 0 C-28 4 -38 -20 -26 -42 C-22 -48 -14 -48 -12 -42" ${stroke(c.fur, 8)}/>
             <path d="M-26 -42 C-22 -48 -14 -48 -12 -42" ${stroke(c.belly, 8)}/>`,
      head: `<ellipse cx="20" cy="-14" rx="22" ry="18.5" fill="${c.fur}"/>
        <path d="M14 -30 v6 M20 -31 v7 M26 -30 v6" ${stroke(c.dark, 2.4)}/>
        ${ell(37, -5, 9.5, 7, c.belly)}
        <path d="M36 -10 h7 l-3.5 4.4z" fill="${c.nose}"/>
        <path d="M42 -6 L60 -11 M42 -4 L62 -3 M42 -2 L59 4" ${stroke('#fff', 1.2)} opacity=".85"/>
        <circle cx="24" cy="-4" r="5" fill="#FF9DB5" opacity=".35"/>
        ${faceGroups(f)}
        <g data-p="ear">
          <path d="M-14 4 L-12 -20 L4 -4Z" fill="${c.fur}"/><path d="M-10 0 L-10 -13 L0 -3Z" fill="${c.ear}"/>
          <path d="M2 -4 L16 -20 L22 4Z" fill="${c.fur}"/><path d="M6 -3 L15 -13 L18 0Z" fill="${c.ear}"/>
        </g>`
    };
  })();

  /* ---- bunny (lilac-white, tall ears, hops) ---- */
  (function () {
    const c = { fur: '#F7F2FF', dark: '#DDD1F2', belly: '#FFFFFF', ear: '#FFB3C7', nose: '#FF8FAF', paw: '#F7F2FF' };
    const f = faceBits(29, -15, 40, -2, c);
    f.mClosed = `<path d="M40 -6 v3 M40 -3 q-4 4 -7 0 M40 -3 q4 4 7 0" ${stroke(INK, 1.8)}/>`;
    f.mOpen = `<path d="M33 -3 Q40 11 47 -3Z" fill="#7A2E3A"/>` + ell(40, 4, 3.4, 2.4, '#FF7E95');
    f.mPant = f.mOpen; f.mSmile = `<path d="M32 -5 Q40 11 48 -5Z" fill="#7A2E3A"/>` + ell(40, 3, 3.8, 2.6, '#FF7E95');
    SPECIES.bunny = {
      name: 'bunny', style: 'thump', W: 220, H: 170, G: 152, L: 32, legW: 15, legWF: 9,
      hipB: [66, 118], hipF: [126, 118], neck: [136, 96], tailP: [54, 100], earP: [10, -24],
      speed: 80, gait: 'hop', hopH: 17, headScale: 1.22, c,
      weights: { wander: 5, sniff: 2, sit: 3, hop: 3, groom: 2, loaf: 1, sleep: 1.5, stretch: 1 },
      body: `${ell(96, 104, 40, 30, c.fur)}${ell(100, 124, 28, 9, c.belly)}${ell(70, 112, 20, 18, c.dark, 'opacity=".28"')}`,
      tail: `<circle cx="-4" cy="-2" r="9.5" fill="#fff"/>`,
      head: `<ellipse cx="20" cy="-12" rx="20" ry="17.5" fill="${c.fur}"/>
        <circle cx="26" cy="-2" r="5" fill="#FFB3C7" opacity=".5"/>
        ${ell(39, -7, 3.2, 2.4, c.nose)}
        ${faceGroups(f)}
        <g data-p="ear">
          <ellipse cx="9" cy="-22" rx="7" ry="24" fill="${c.dark}" transform="rotate(12)"/>
          <ellipse cx="-4" cy="-24" rx="7.4" ry="25" fill="${c.fur}" transform="rotate(-8)"/>
          <ellipse cx="-4" cy="-23" rx="3.6" ry="19" fill="${c.ear}" transform="rotate(-8)"/>
        </g>`
    };
  })();

  /* ---- fox (ember orange, bushy tail, white tip) ---- */
  (function () {
    const c = { fur: '#F26B3A', dark: '#C94D22', belly: '#FFF4E6', ear: '#3B2430', nose: '#2B2140', paw: '#3B2430' };
    const f = faceBits(30, -18, 52, 0, c);
    f.mClosed = `<path d="M44 -1 Q51 7 59 -2" ${stroke(INK, 2.2)}/>`;
    f.mOpen = `<path d="M44 -1 Q52 13 60 -2Z" fill="#7A2E3A"/>` + ell(52, 6, 3.6, 2.8, '#FF7E95');
    f.mPant = f.mOpen; f.mSmile = `<path d="M43 -3 Q51 13 60 -3Z" fill="#7A2E3A"/>` + ell(51.5, 5, 4, 2.8, '#FF7E95');
    SPECIES.fox = {
      name: 'fox', style: 'pounce', W: 220, H: 170, G: 152, L: 38, legW: 8, legWF: 8,
      hipB: [70, 112], hipF: [130, 112], neck: [146, 94], tailP: [56, 98], earP: [14, -28],
      speed: 74, gait: 'walk', hopH: 0, headScale: 1.22, c, legColor: c.paw,
      weights: { wander: 5, sniff: 3, sit: 2, sleep: 1.5, hop: 2, stretch: 1.5, perch: 1, yawn: 1, groom: 1 },
      body: `${ell(100, 102, 46, 24, c.fur)}${ell(133, 108, 12, 16, c.belly)}${ell(102, 116, 30, 8, c.belly, 'opacity=".9"')}`,
      tail: `<path d="M0 0 C-22 -2 -42 -10 -46 -30 C-48 -46 -34 -52 -24 -44 C-14 -36 -6 -20 4 -12Z" fill="${c.fur}"/>
             <path d="M-46 -30 C-48 -46 -34 -52 -24 -44 C-31 -41 -37 -35 -39 -25 C-43 -25 -45 -27 -46 -30Z" fill="#fff"/>`,
      head: `<path transform="translate(36,-34) rotate(10)" d="M0 0 L16 -22 L18 8Z" fill="${c.dark}"/>
        <ellipse cx="20" cy="-14" rx="22" ry="19" fill="${c.fur}"/>
        <path d="M30 -24 Q54 -16 68 -4 Q62 6 42 6 Q30 4 26 -8Z" fill="${c.fur}"/>
        <path d="M6 -2 Q24 10 52 5 Q42 -3 38 -9 Q26 -1 6 -2Z" fill="${c.belly}"/>
        <circle cx="25" cy="-1" r="4.8" fill="#FF9BA6" opacity=".5"/>
        ${ell(67, -4, 4.4, 3.6, INK)}
        ${faceGroups(f)}
        <g data-p="ear">
          <path d="M-12 2 L-10 -30 L10 -6Z" fill="${c.fur}"/><path d="M-8 -12 L-10 -30 L2 -14Z" fill="${c.ear}"/>
        </g>`
    };
  })();

  /* =====================================================================
   *  POSES — numeric targets get eased every frame, so everything blends.
   * ===================================================================== */
  const BASE = {
    drop: 0, tilt: 0, headA: 0, headDy: 0, earA: 0, tailBase: -6, tailAmp: 8, tailSpeed: 5,
    bA: 0, fA: 0, bS: 1, fS: 1, bnA: 0, fnA: 0, fnS: 1, bG: 1, fG: 1, breath: 1, puff: 0, lift: 0, wob: 0, storm: 0, rate: 9,
    eye: 'open', mouth: 'closed'
  };
  const POSES = {
    stand: {},
    walk: {},
    sniff: { headA: 26, headDy: 8, tailAmp: 12 },
    sit: { drop: 0, tilt: -23, bA: 82, bS: .55, bG: 0, headA: 8, tailBase: -20, tailAmp: 4, tailSpeed: 3 },
    lie: { drop: 27, fA: -88, fS: .8, bA: 90, bS: .62, bG: 0, fG: 0, headA: 4, tailAmp: 3, tailSpeed: 2 },
    sleep: { lift: -45, drop: 27, fA: -88, fS: .8, bA: 90, bS: .62, bG: 0, fG: 0, headA: 26, headDy: 2, eye: 'shut', tailAmp: 0, breath: 2.4, earA: 8 },
    stretch: { drop: 9, tilt: 12, headA: 20, fA: -34, tailBase: -34, tailAmp: 3, eye: 'shut', mouth: 'open' },
    groom: { drop: 0, tilt: -23, bA: 82, bS: .55, bG: 0, headA: 34, fnA: -66, fnS: .74, eye: 'shut', tailAmp: 3, tailBase: -20 },
    yawn: { headA: -24, mouth: 'open', eye: 'shut', rate: 7 },
    happy: { eye: 'happy', mouth: 'smile', tailAmp: 26, tailSpeed: 15, headA: -4, earA: -6 },
    held: { bA: 14, fA: -16, tilt: -8, bS: 1.12, fS: 1.12, bG: 0, fG: 0, eye: 'open', mouth: 'open', tailAmp: 20, tailSpeed: 9, rate: 14 },
    air: { bA: 44, fA: -40, bS: .82, fS: .82, bG: 0, fG: 0, mouth: 'open', rate: 14 },
    land: { drop: 9, rate: 22 },
    alert: { headA: -8, earA: -10, drop: -2, eye: 'open', tailAmp: 3, rate: 16 },
    // dog sneeze
    windup1: { headA: -9, headDy: -2, mouth: 'open', tailAmp: 14, tailSpeed: 9, earA: 6 },
    windup2: { headA: -22, headDy: -6, mouth: 'open', eye: 'shut', earA: 14, drop: -2 },
    achoo: { headA: 22, headDy: 8, drop: 6, mouth: 'open', eye: 'squeeze', earA: -20, rate: 36 },
    // cat swat
    stare: { drop: 0, tilt: -23, bA: 82, bS: .55, bG: 0, headA: 10, tailAmp: 14, tailSpeed: 4, tailBase: -26, eye: 'open' },
    swatWind: { drop: 0, tilt: -23, bA: 82, bS: .55, bG: 0, headA: 0, fnA: -78, fnS: .92, tailAmp: 20, tailSpeed: 14, tailBase: -26, rate: 14 },
    swat: { drop: 0, tilt: -20, bA: 82, bS: .55, bG: 0, headA: 8, fnA: 24, fnS: 1, tailAmp: 4, tailBase: -10, rate: 40 },
    smug: { drop: 0, tilt: -23, bA: 82, bS: .55, bG: 0, headA: -6, eye: 'happy', mouth: 'smile', tailAmp: 6, tailSpeed: 2.4, tailBase: -26 },
    // bunny thump
    thumpUp: { bnA: 46, bS: 1, drop: 4, tilt: 6, earA: -10, headA: -8, rate: 30 },
    thumpDown: { bnA: -4, drop: 0, earA: -10, headA: -4, rate: 44 },
    // fox pounce
    crouch: { drop: 22, tilt: 10, headA: 12, fA: -10, tailBase: -14, tailAmp: 16, tailSpeed: 16, eye: 'open', rate: 12 },
    crouchWiggle: { drop: 22, tilt: 12, headA: 14, fA: -10, tailBase: -14, tailAmp: 26, tailSpeed: 28, rate: 12 },
    // cloud
    puff: { puff: .16, eye: 'squeeze', mouth: 'open', rate: 10 },
    drizzle: { puff: -.03, eye: 'happy', mouth: 'smile', wob: 3, rate: 14 },
    giggle: { eye: 'happy', mouth: 'smile', wob: 7, puff: .05, rate: 12 },
    sadRain: { storm: .55, eye: 'sad', mouth: 'frown', puff: -.02, lift: -10, rate: 5 },
    grumpy: { storm: .9, eye: 'angry', mouth: 'grump', puff: .05, wob: 2, rate: 8 },
    rage: { storm: 1, eye: 'angry', mouth: 'grump', puff: .15, wob: 10, rate: 18 }
  };
  const NUM_KEYS = Object.keys(BASE).filter(k => typeof BASE[k] === 'number');

  /* =====================================================================
   *  STYLES — how each animal hands over a reminder.
   * ===================================================================== */
  const STYLES = {
    sneeze: { caption: 'Achoo! Don’t forget:', species: 'dog' },
    swat:   { caption: 'Mrrow. Don’t forget:', species: 'cat' },
    thump:  { caption: 'Thump thump. Don’t forget:', species: 'bunny' },
    pounce: { caption: 'Yip! Don’t forget:', species: 'fox' },
    drizzle: { caption: 'Pitter-patter. Don’t forget:', species: 'cloud' }
  };

  /* =====================================================================
   *  CSS (injected once)
   * ===================================================================== */
  const CSS = `
  .pets-layer{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:50;
    font-family:var(--pet-font,'Caveat','Segoe Script','Bradley Hand',cursive)}
  .pets-layer.fixed{position:fixed}
  .pet{position:absolute;left:0;top:0;pointer-events:auto;cursor:grab;touch-action:none;will-change:transform;
    -webkit-user-select:none;user-select:none}
  .pet.held{cursor:grabbing}
  .pet svg{display:block;overflow:visible;pointer-events:none}
  .pets-layer.outline .pet svg{filter:drop-shadow(1.7px 0 0 #fff) drop-shadow(-1.7px 0 0 #fff) drop-shadow(0 1.7px 0 #fff) drop-shadow(0 -1.7px 0 #fff) drop-shadow(0 2px 2px rgba(20,18,50,.2))}
  .pets-layer.outline .pet[data-species=cloud] svg{filter:drop-shadow(0 0 7px rgba(80,225,255,.65))}
  .pet .hit{position:absolute;left:34%;top:22%;width:44%;height:72%;border-radius:40%}
  .pet-shadow{position:absolute;left:0;top:0;width:96px;height:14px;margin:-7px 0 0 -48px;border-radius:50%;
    background:radial-gradient(closest-side,rgba(20,18,50,.32),rgba(20,18,50,0));pointer-events:none;will-change:transform,opacity}
  .pf{position:absolute;left:0;top:0;pointer-events:none;will-change:transform,opacity}
  .pf-text{white-space:nowrap;font-weight:700;color:var(--pet-ink,#262A57);
    text-shadow:0 0 5px var(--pet-halo,#fff),0 0 2px var(--pet-halo,#fff),0 0 8px var(--pet-halo,#fff)}
  `;

  /* =====================================================================
   *  Pet
   * ===================================================================== */
  let uid = 0;
  class Pet {
    constructor(mgr, species, o = {}) {
      this.mgr = mgr; this.id = ++uid; this.species = species; this.sp = SPECIES[species]; this.k = mgr.k;
      this.name = o.name || species;
      this.x = o.x != null ? o.x : mgr.W * rand(.2, .8);
      this.sid = o.surface || 'floor'; this.gy = mgr.surfaceById(this.sid).y; this.alt = 0; this.vy = 0;
      this.dir = o.dir || (Math.random() < .5 ? -1 : 1);
      this.plan = []; this.roam = o.roam !== false; this.parked = false;
      this.cur = Object.assign({}, BASE); this.tgt = Object.assign({}, BASE);
      this.phase = rand(0, 6); this.speed = 0; this.gait = 0; this.time = rand(0, 10);
      this.blinkT = rand(2, 5); this.blink = 0; this.earT = rand(3, 7); this.earKick = 0;
      this.wantSpeed = 0; this.poseName = 'stand'; this.held = false; this.holdY = 0;
      this.greetCool = rand(4, 10); this.zT = 0; this.landed = 0; this.shown = {};
      if (this.initExtra) this.initExtra(o);
      this.build();
      this.setPose('stand');
      this.popIn();
    }

    build() {
      const sp = this.sp, el = this.el = document.createElement('div');
      el.className = 'pet'; el.dataset.species = this.species;
      el.style.width = sp.W + 'px'; el.style.height = sp.H + 'px';
      el.style.transformOrigin = `${sp.W / 2}px ${sp.G}px`;
      const lc = sp.legColor;
      const far = sp.c.dark || sp.c.fur;
      el.innerHTML = `<svg viewBox="0 0 ${sp.W} ${sp.H}" width="${sp.W}" height="${sp.H}" role="img" aria-label="${this.species}">
        <g data-p="torso">
          <g data-p="tail">${sp.tail}</g>
          <g data-p="legBF">${leg(sp.L, sp.legW, lc || far, sp.c.paw || far)}</g>
          <g data-p="legFF">${leg(sp.L, sp.legWF, lc || far, sp.c.paw || far)}</g>
          <g data-p="body">${sp.body}</g>
          <g data-p="legBN">${leg(sp.L, sp.legW, lc || sp.c.fur, sp.c.paw || sp.c.fur)}</g>
          <g data-p="legFN">${leg(sp.L, sp.legWF, lc || sp.c.fur, sp.c.paw || sp.c.fur)}</g>
          <g data-p="head">${sp.head}</g>
        </g></svg><div class="hit"></div>`;
      this.parts = {};
      el.querySelectorAll('[data-p]').forEach(n => this.parts[n.dataset.p] = n);
      this.shadow = document.createElement('div'); this.shadow.className = 'pet-shadow';
      this.mgr.layer.append(this.shadow, el);
      this.bind();
    }

    bind() {
      const el = this.el; let down = null;
      el.addEventListener('pointerenter', () => this.mgr.hover(+1));
      el.addEventListener('pointerleave', () => this.mgr.hover(-1));
      el.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        el.setPointerCapture(e.pointerId);
        down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
        this.mgr.audioUnlock();
      });
      el.addEventListener('pointermove', e => {
        if (!down) return;
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (!down.moved && Math.hypot(dx, dy) > 6) { down.moved = true; this.grab(); }
        if (down.moved) {
          const r = this.mgr.layer.getBoundingClientRect();
          this.x = clamp(e.clientX - r.left, 10, this.mgr.W - 10);
          this.holdY = clamp(e.clientY - r.top + 50 * this.k, 20, this.mgr.H);
          this.dir = sgn(dx || this.dir);
        }
      });
      const up = e => {
        if (!down) return; const d = down; down = null;
        try { el.releasePointerCapture(e.pointerId); } catch (_) {}
        if (d.moved) this.drop(); else this.onTap();
      };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('dblclick', () => { this.parked ? this.unpark() : this.park(); });
    }

    popIn() {
      this.el.animate([{ opacity: 0, transform: this.tf(0, -30, .3) }, { opacity: 1, transform: this.tf(0, 0, 1) }],
        { duration: 420, easing: 'cubic-bezier(.2,1.6,.4,1)' });
      this.mgr.fx.puff(this.x, this.gy - this.alt - 6, '#fff');
    }

    tf(dx = 0, dy = 0, sc = 1) {
      const sp = this.sp, s = (sp.scale || 1) * this.k;
      return `translate(${this.x - sp.W / 2 + dx}px,${this.gy - this.alt - sp.G + dy}px) scale(${this.dir * s * sc},${s * sc})`;
    }

    get spd() { return SPECIES[this.species].speed * this.k; }

    /* ---------- surfaces ---------- */
    surf() { return this.mgr.surfaceById(this.sid); }
    bounds() { const s = this.surf(), m = 36 * this.k; return [s.x1 + m, Math.max(s.x1 + m, s.x2 - m)]; }
    randX() { const [a, b] = this.bounds(); return rand(a, b); }

    /* ---------- pose ---------- */
    setPose(name, extra) {
      const p = Object.assign({}, BASE, POSES[name] || {}, extra || {});
      this.poseName = name;
      NUM_KEYS.forEach(k => this.tgt[k] = p[k]);
      this.tgt.eye = p.eye; this.tgt.mouth = p.mouth;
    }

    /* ---------- plans ---------- */
    do(steps) { this.plan = steps.slice(); this.parked = false; return new Promise(res => this.plan.push({ t: 'call', fn: res })); }
    push(steps) { this.plan.push(...steps); }
    walkTo(x, speed) { return this.do([{ t: 'walk', x, speed }]); }
    sit(dur = 6) { return this.do([{ t: 'pose', name: 'sit', dur }]); }
    sleep(dur = 15) { return this.do([{ t: 'pose', name: 'lie', dur: 1 }, { t: 'pose', name: 'sleep', dur }]); }
    say(text, o) { this.mgr.fx.text(this.x, this.gy - this.alt - this.sp.G * this.k + 38 * this.k, text, Object.assign({}, this.sp.textStyle, o)); }

    park(x) {
      const [a, b] = this.bounds(); const tx = clamp(x != null ? x : this.x, a, b);
      this.roam = false; this.parked = true;
      this.plan = [{ t: 'walk', x: tx }, { t: 'pose', name: 'sit', dur: 1.4 }, { t: 'pose', name: 'lie', dur: 1.2 }, { t: 'pose', name: 'sleep', dur: Infinity }];
    }
    unpark() {
      this.parked = false; this.roam = true;
      this.plan = [{ t: 'pose', name: 'yawn', dur: 1.2 }, { t: 'pose', name: 'stretch', dur: 1.6 }];
    }

    /* ---------- being handled ---------- */
    onTap() {
      this.mgr.sound('pet', this.species);
      this.mgr.fx.hearts(this.x, this.gy - this.alt - this.sp.G * this.k + 34 * this.k);
      this.mgr.opts.onPet && this.mgr.opts.onPet(this);
      const keepParked = this.parked;
      this.plan = [{ t: 'pose', name: this.sp.tapPose || 'happy', dur: 1.5 }];
      if (keepParked) this.plan.push({ t: 'pose', name: 'sleep', dur: Infinity });
    }
    grab() {
      this.held = true; this.el.classList.add('held'); this.plan = []; this.parked = false;
      this.holdY = this.gy - this.alt; this.setPose('held'); this.mgr.sound(this.species === 'cloud' ? 'pet' : 'yip', this.species);
    }
    drop() {
      this.held = false; this.el.classList.remove('held');
      const s = this.mgr.surfaceBelow(this.x, this.holdY);
      this.sid = s.id; this.gy = s.y; this.alt = Math.max(0, s.y - this.holdY); this.vy = 0; this.falling = true;
      if (!this.roam && !this.parked) this.roam = true;
    }

    /* ---------- AI ---------- */
    think() {
      if (this.mgr.paused) return;
      const sp = this.sp, onFloor = this.sid === 'floor', free = Object.assign({}, sp.weights);
      if (this.mgr.surfaces().length < 2) delete free.perch;
      if (!onFloor) { free.descend = 4; delete free.sleep; }
      const friend = this.mgr.nearFriend(this);
      if (friend && this.greetCool <= 0) { this.greet(friend); return; }
      const [a, b] = this.bounds();
      switch (weighted(free)) {
        case 'wander': {
          const run = Math.random() < .18;
          this.plan = [{ t: 'walk', x: rand(a, b), speed: this.spd * (run ? 2.1 : rand(.8, 1.2)) }, { t: 'pose', name: 'stand', dur: rand(.3, 1.4) }]; break;
        }
        case 'sniff': {
          const to = clamp(this.x + this.dir * rand(60, 150) * this.k, a, b);
          this.plan = [{ t: 'walk', x: to, speed: this.spd * .42, pose: 'sniff' }, { t: 'pose', name: 'stand', dur: .5 }]; break;
        }
        case 'sit': this.plan = [{ t: 'pose', name: 'sit', dur: rand(3, 8) }]; break;
        case 'loaf': this.plan = [{ t: 'pose', name: 'lie', dur: rand(4, 9) }]; break;
        case 'sleep': this.plan = [{ t: 'pose', name: 'lie', dur: 1.2 }, { t: 'pose', name: 'sleep', dur: rand(10, 22) }, { t: 'pose', name: 'yawn', dur: 1.2 }]; break;
        case 'stretch': this.plan = [{ t: 'pose', name: 'stretch', dur: 2 }]; break;
        case 'groom': this.plan = [{ t: 'pose', name: 'sit', dur: .7 }, { t: 'pose', name: 'groom', dur: rand(2.5, 4.5) }]; break;
        case 'yawn': this.plan = [{ t: 'pose', name: 'yawn', dur: 1.6 }]; break;
        case 'hop': {
          if (this.species === 'fox') {
            this.plan = [{ t: 'pose', name: 'crouch', dur: .7 }, { t: 'pose', name: 'crouchWiggle', dur: .5 },
              { t: 'jump', x: clamp(this.x + this.dir * 60 * this.k, a, b), alt: 54 * this.k, dur: .55 }, { t: 'pose', name: 'happy', dur: .6 }];
          } else {
            const d = this.dir * this.k, h = this.k;
            this.plan = [{ t: 'jump', x: clamp(this.x + d * 34, a, b), alt: 34 * h, dur: .45 }, { t: 'jump', x: clamp(this.x + d * 68, a, b), alt: 34 * h, dur: .45 },
              { t: 'jump', x: clamp(this.x + d * 34, a, b), alt: 40 * h, dur: .5, spin: true }, { t: 'pose', name: 'happy', dur: .7 }];
          }
          break;
        }
        case 'perch': {
          const others = this.mgr.surfaces().filter(s => s.id !== this.sid && s.x2 - s.x1 > 90);
          if (!others.length) { this.plan = [{ t: 'pose', name: 'sit', dur: 3 }]; break; }
          const s = pick(others), x = rand(s.x1 + 36, s.x2 - 36), dy = this.gy - s.y;
          this.plan = [{ t: 'walk', x: clamp(x, a, b) }, { t: 'pose', name: 'crouch', dur: .45 },
            { t: 'jump', x, surface: s.id, alt: Math.max(60 * this.k, dy + 46 * this.k), dur: .8 }, { t: 'pose', name: 'sit', dur: rand(3, 6) }]; break;
        }
        case 'descend': {
          const f = this.mgr.floor(), x = rand(f.x1 + 36, f.x2 - 36);
          this.plan = [{ t: 'pose', name: 'crouch', dur: .4 }, { t: 'jump', x, surface: 'floor', alt: 40 * this.k, dur: .75 }, { t: 'pose', name: 'stand', dur: .4 }]; break;
        }
        default: this.plan = [{ t: 'pose', name: 'stand', dur: 1 }];
      }
    }

    greet(f) {
      this.greetCool = rand(14, 26); f.greetCool = rand(14, 26);
      const d = sgn(f.x - this.x), stop = f.x - d * 46 * this.k;
      this.plan = [{ t: 'walk', x: stop, speed: this.spd }, { t: 'face', dir: d },
        { t: 'pose', name: 'happy', dur: 1.6, on: () => { this.mgr.fx.hearts((this.x + f.x) / 2, this.gy - 90, 4); this.mgr.sound('pet', this.species); } }];
      f.plan = [{ t: 'wait', dur: .6 }, { t: 'face', dir: -d }, { t: 'pose', name: 'happy', dur: 1.4 }];
    }

    /* ---------- reminder delivery ---------- */
    deliver(text, anchor) {
      const style = this.sp.style, sp = this.sp, [a, b] = this.bounds();
      const tx = clamp(anchor.x, a, b), face = sgn(anchor.x - tx || this.dir);
      const info = () => ({ text, pet: this, species: this.species, style, caption: STYLES[style].caption, anchor });
      const fire = () => this.mgr.opts.onDeliver && this.mgr.opts.onDeliver(info());
      const kk = this.k, origin = () => ({ x: this.x + this.dir * 44 * kk, y: this.gy - this.alt - 62 * kk });
      const toward = () => { const o = origin(), dx = anchor.x - o.x, dy = anchor.y - o.y, l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l }; };
      const walk = { t: 'walk', x: tx, speed: this.spd * 1.6 };
      const faceTo = { t: 'face', dir: face };
      let steps;
      if (style === 'sneeze') {
        steps = [walk, faceTo,
          { t: 'pose', name: 'alert', dur: .5, on: () => this.say('hm?') },
          { t: 'pose', name: 'windup1', dur: .85, on: () => this.say('ah…') },
          { t: 'pose', name: 'windup2', dur: .95, on: () => this.say('ahh…') },
          { t: 'pose', name: 'achoo', dur: .55, on: () => { const o = origin(); this.mgr.fx.spray(o.x, o.y, toward()); this.mgr.fx.text(o.x - this.dir * 30, o.y - 40, 'CHOO!', { big: true }); this.mgr.sound('sneeze'); this.mgr.shake(); setTimeout(fire, 380); } },
          { t: 'pose', name: 'stand', dur: .7 }];
      } else if (style === 'swat') {
        steps = [walk, faceTo, { t: 'pose', name: 'sit', dur: .7 },
          { t: 'pose', name: 'stare', dur: 1.0, on: () => this.say('mrr?') },
          { t: 'pose', name: 'swatWind', dur: .6 },
          { t: 'pose', name: 'swat', dur: .3, on: () => { const o = origin(); this.mgr.fx.burst(o.x + this.dir * 14, o.y + 34, ['#FFE45E', '#fff', '#FF9DB5'], 12, 70, 'star'); this.mgr.fx.text(o.x + this.dir * 10, o.y - 30, 'pat!', { big: true }); this.mgr.sound('tap'); this.mgr.shake(); setTimeout(fire, 200); } },
          { t: 'pose', name: 'smug', dur: 1.1 }, { t: 'pose', name: 'stand', dur: .3 }];
      } else if (style === 'thump') {
        const thump = last => ([
          { t: 'pose', name: 'thumpUp', dur: .2 },
          { t: 'pose', name: 'thumpDown', dur: .17, on: () => { this.mgr.fx.ring(this.x - this.dir * 26 * kk, this.gy - 2); this.mgr.sound('thump'); this.mgr.shake(.5); if (last) { this.mgr.fx.puff(this.x - this.dir * 26 * kk, this.gy - 4, '#fff'); setTimeout(fire, 120); } } }]);
        steps = [walk, faceTo, { t: 'pose', name: 'alert', dur: .6, on: () => this.say('!', { big: true }) },
          ...thump(false), ...thump(false), ...thump(true), { t: 'pose', name: 'happy', dur: .9 }];
      } else if (style === 'drizzle') {
        const topY = anchor.top != null ? anchor.top : anchor.y - 130 * kk;
        const wantAlt = clamp(this.gy - (topY - 56 * kk), 60 * kk, this.mgr.H - 40);
        steps = [
          { t: 'call', fn: () => { this.hover = wantAlt; } },
          { t: 'walk', x: tx, speed: this.spd * 4.2 },
          { t: 'pose', name: 'alert', dur: .7, on: () => this.say('ping?') },
          { t: 'pose', name: 'puff', dur: .9, on: () => this.say('charging…') },
          { t: 'pose', name: 'drizzle', dur: 2.0, on: () => { this.mgr.fx.rain(this.x, this.gy - this.alt - 8 * kk, anchor.y + 20, 50, true, 18, 'data'); this.say('incoming!', { big: true }); this.mgr.sound('rain'); this.mgr.shake(.3); setTimeout(fire, 950); } },
          { t: 'pose', name: 'happy', dur: .9 }, { t: 'pose', name: 'stand', dur: .3 }];
      } else {
        steps = [walk, faceTo,
          { t: 'pose', name: 'crouch', dur: .9, on: () => this.say('yip?') },
          { t: 'pose', name: 'crouchWiggle', dur: .6 },
          { t: 'jump', x: () => clamp(this.x + face * 56 * kk, a, b), alt: 70 * kk, dur: .6, on: () => this.mgr.sound('yip', 'fox'),
            land: () => { const o = { x: this.x, y: this.gy - 40 }; this.mgr.fx.burst(o.x, o.y, ['#7BD88F', '#FFE45E', '#F26B3A', '#fff'], 16, 90, 'leaf'); this.mgr.fx.text(o.x, o.y - 40, 'YIP!', { big: true }); this.mgr.shake(.7); setTimeout(fire, 160); } },
          { t: 'pose', name: 'happy', dur: 1.0 }, { t: 'pose', name: 'stand', dur: .3 }];
      }
      return this.do(steps).then(() => ({ pet: this, style, text }));
    }

    /* ---------- per-frame ---------- */
    runStep(s, dt) {
      if (!s._init) {
        s._init = true;
        if (s.t === 'pose') { this.setPose(s.name, s.extra); s.left = s.dur; this.wantSpeed = 0; }
        if (s.t === 'wait') { s.left = s.dur; this.wantSpeed = 0; }
        if (s.t === 'face') { this.dir = s.dir; }
        if (s.t === 'jump') { if (typeof s.x === 'function') s.x = s.x(); s.x0 = this.x; s.g0 = this.gy; const ts = s.surface ? this.mgr.surfaceById(s.surface) : this.surf();
          s.g1 = ts.y; s.sid = ts.id; s.tt = 0; this.wantSpeed = 0; s.dirSet = sgn(s.x - this.x) || this.dir; this.dir = s.dirSet; this.setPose('air'); }
        if (s.t === 'walk') { this.setPose(s.pose || 'walk'); }
        s.on && s.on();
      }
      switch (s.t) {
        case 'pose': case 'wait': s.left -= dt; if (s.left <= 0) this.plan.shift(); break;
        case 'face': case 'call': if (s.t === 'call') s.fn(); this.plan.shift(); break;
        case 'walk': {
          const dx = s.x - this.x;
          if (Math.abs(dx) < 3) { this.wantSpeed = 0; this.plan.shift(); break; }
          this.dir = sgn(dx); this.wantSpeed = s.speed || this.spd;
          const step = Math.min(Math.abs(dx), this.speed * dt); this.x += this.dir * step; break;
        }
        case 'jump': {
          s.tt += dt / s.dur; const t = clamp(s.tt, 0, 1), e = t * t * (3 - 2 * t);
          this.x = lerp(s.x0, s.x, e); this.gy = lerp(s.g0, s.g1, e);
          this.alt = 4 * s.alt * t * (1 - t) * (s.g1 < s.g0 ? 1 : 1);
          this.tgt.tilt = lerp(-12, 12, t); this.spinA = s.spin ? t * 360 : 0;
          if (t >= 1) { this.sid = s.sid; this.gy = s.g1; this.alt = 0; this.spinA = 0; this.landed = .14; this.setPose('land'); this.mgr.fx.puff(this.x, this.gy - 4, '#fff', 4); s.land && s.land(); this.plan.shift(); }
          break;
        }
        default: this.plan.shift();
      }
    }

    update(dt) {
      this.time += dt; this.greetCool -= dt;
      const sp = this.sp;
      // surface may have moved (note window dragged / screen resized)
      if (!this.held && !this.falling && !(this.plan[0] && this.plan[0].t === 'jump')) {
        const s = this.surf(); this.gy = s.y; const [a, b] = this.bounds();
        if (this.x < a - 60 || this.x > b + 60) this.x = clamp(this.x, a - 10, b + 10);
      }
      if (this.held) {
        this.wantSpeed = 0; this.gy = this.holdY; this.alt = 0;
        this.phase += dt * 9; this.tgt.tailBase = -6 + Math.sin(this.time * 9) * 12;
      } else if (this.falling) {
        this.vy += 2000 * dt; this.alt -= this.vy * dt; this.setPoseOnce('air');
        if (this.alt <= 0) {
          this.alt = 0; this.falling = false; this.landed = .18; this.setPose('land'); this.mgr.fx.puff(this.x, this.gy - 4, '#fff', 5);
          this.plan = [{ t: 'pose', name: 'stand', dur: .5 }];
        }
      } else {
        const s = this.plan[0];
        if (!s) {
          this.wantSpeed = 0;
          if (this.landed > 0) { this.landed -= dt; }
          if (this.roam && !this.parked) this.think(); else if (!this.parked) this.setPoseOnce('stand');
        } else this.runStep(s, dt);
        if (this.landed > 0 && this.plan[0] && this.plan[0].t !== 'jump') this.landed = 0;
      }
      // gait
      this.speed = lerp(this.speed, this.wantSpeed, 1 - Math.exp(-dt * 10));
      const vs = this.speed / this.k;                 // gait follows speed in 'full-size' units
      this.gait = clamp(vs / 38, 0, 1);
      this.phase += vs * dt * (sp.gait === 'hop' ? 0.058 : 0.125);
      this.sleepFx(dt);
    }

    setPoseOnce(n) { if (this.poseName !== n) this.setPose(n); }
    sleepFx(dt) {
      if (this.poseName === 'sleep') { this.zT -= dt; if (this.zT <= 0) { this.zT = 1.5; this.mgr.fx.zzz(this.x + this.dir * 40 * this.k, this.gy - this.alt - 74 * this.k); } }
    }

    show(name, on) { if (this.shown[name] === on || !this.parts[name]) return; this.shown[name] = on; this.parts[name].style.display = on ? '' : 'none'; }

    ease(dt) {
      const c = this.cur, t = this.tgt;
      const k = 1 - Math.exp(-dt * (t.rate || 9));
      NUM_KEYS.forEach(n => { if (n !== 'rate') c[n] = lerp(c[n], t[n], k); });
      // blink + ear flick
      this.blinkT -= dt; if (this.blinkT <= 0) { this.blink = .12; this.blinkT = rand(2.4, 5.5); } this.blink -= dt;
      this.earT -= dt; if (this.earT <= 0) { this.earKick = .16; this.earT = rand(3, 8); } this.earKick -= dt;
      let eye = { squeeze: 'eSqz', happy: 'eHappy', shut: 'eShut', angry: 'eAngry', sad: 'eSad' }[t.eye] || (this.blink > 0 ? 'eShut' : 'eOpen');
      ['eOpen', 'eShut', 'eSqz', 'eHappy', 'eAngry', 'eSad'].forEach(n => this.show(n, n === eye));
      const mouth = { closed: 'mClosed', open: 'mOpen', pant: 'mPant', smile: 'mSmile', grump: 'mGrump', frown: 'mFrown' }[t.mouth] || 'mClosed';
      ['mClosed', 'mOpen', 'mPant', 'mSmile', 'mGrump', 'mFrown'].forEach(n => this.show(n, n === mouth));
    }

    render(dt) {
      const sp = this.sp, c = this.cur, t = this.tgt, P = this.parts;
      this.ease(dt);

      const g = this.gait, hop = sp.gait === 'hop';
      const amp = (hop ? 34 : 24 + 14 * clamp((this.speed / this.k - 60) / 90, 0, 1)) * g;
      const ph = this.phase;
      const swB = hop ? -Math.abs(Math.sin(ph)) * amp * 1.0 : Math.sin(ph) * amp;
      const swF = hop ? Math.abs(Math.sin(ph)) * amp * 1.1 : -Math.sin(ph) * amp;
      const bob = hop ? -Math.abs(Math.sin(ph)) * sp.hopH * g : -Math.abs(Math.cos(ph)) * 2 * g;
      const breath = 1 + Math.sin(this.time * 2.4) * 0.011 * c.breath;
      const drop = c.drop + (this.landed > 0 ? 4 : 0);
      const [fx, fy] = sp.hipF, [bx, by] = sp.hipB;

      P.torso.setAttribute('transform', `translate(0 ${(drop + bob).toFixed(2)}) rotate(${c.tilt.toFixed(2)} ${fx} ${fy})`);
      P.body.setAttribute('transform', `translate(100 118) scale(1 ${breath.toFixed(4)}) translate(-100 -118)`);
      const legT = (hx, hy, a, s) => `translate(${hx} ${hy}) rotate(${a.toFixed(2)}) scale(1 ${s.toFixed(3)})`;
      // keep planted paws on the ground when the torso drops / tilts
      const tr = c.tilt * Math.PI / 180, sn = Math.sin(tr), cs = Math.cos(tr), airborne = hop ? (1 - g) : 1;
      const reach = (hx, hy) => clamp((sp.G - 2 - (fy + (hx - fx) * sn + (hy - fy) * cs + drop + bob)) / sp.L, .28, 1.5);
      const lock = (manual, hx, hy, k) => lerp(manual, reach(hx, hy), clamp(k, 0, 1));
      const raised = a => 1 - clamp(Math.abs(a) / 20, 0, 1);
      P.legBN.setAttribute('transform', legT(bx, by, c.bA + c.bnA + swB, Math.max(.25, lock(c.bS, bx, by, c.bG * airborne * raised(c.bnA)))));
      P.legBF.setAttribute('transform', legT(bx + 4, by, c.bA + (hop ? swB : -swB), Math.max(.25, lock(c.bS, bx + 4, by, c.bG * airborne))));
      P.legFN.setAttribute('transform', legT(fx, fy, c.fA + c.fnA + swF, Math.max(.25, lock(c.fS * c.fnS, fx, fy, c.fG * airborne * raised(c.fnA)))));
      P.legFF.setAttribute('transform', legT(fx - 4, fy, c.fA + (hop ? swF : -swF), Math.max(.25, lock(c.fS, fx - 4, fy, c.fG * airborne))));
      const [nx, ny] = sp.neck;
      P.head.setAttribute('transform', `translate(${nx} ${(ny + c.headDy + Math.sin(ph) * 1.2 * g).toFixed(2)}) rotate(${(c.headA + (this.held ? Math.sin(this.time * 8) * 5 : 0)).toFixed(2)}) scale(${sp.headScale || 1})`);
      const [ex, ey] = sp.earP, earA = c.earA + (this.earKick > 0 ? -12 : 0);
      P.ear.setAttribute('transform', `translate(${ex} ${ey}) rotate(${earA.toFixed(2)})`);
      const [tx, ty] = sp.tailP;
      P.tail.setAttribute('transform', `translate(${tx} ${ty}) rotate(${(c.tailBase + Math.sin(this.time * c.tailSpeed) * c.tailAmp).toFixed(2)})`);

      // squash/stretch on the way down + spin on binky
      const sq = this.landed > 0 ? 1 : 0;
      const spin = this.spinA ? `translate(0px,-55px) rotate(${this.spinA}deg) translate(0px,55px)` : '';
      this.el.style.transform = this.tf(0, 0, 1) + (sq ? ' scale(1.04,.94)' : '') + ' ' + spin;
      this.el.style.zIndex = Math.round(this.gy - this.alt + 100);
      // ground shadow
      const h = clamp(this.alt / 120, 0, 1);
      const w = (this.poseName === 'sleep' || this.poseName === 'lie' ? 1.25 : 1) * (1 - h * .4);
      this.shadow.style.transform = `translate(${this.x - 4 * this.dir * this.k}px,${this.gy + 1}px) scale(${w * (sp.name === 'bunny' ? .9 : 1.1) * this.k},${this.k})`;
      this.shadow.style.opacity = (1 - h * .6).toFixed(2);
      this.shadow.style.zIndex = Math.round(this.gy + 99);
    }

    destroy() { this.el.remove(); this.shadow.remove(); }
  }


  /* =====================================================================
   *  Cloud — a small, friendly, bluish and see-through cloud. It floats.
   * ===================================================================== */
  SPECIES.cloud = {
    name: 'cloud', kind: 'cloud', style: 'drizzle', W: 160, H: 120, G: 104, speed: 70, scale: 1.15, tapPose: 'giggle', headScale: 1, textStyle: { tech: true },
    c: { dark: '#8DBEFF', fur: '#B7DBFF' },
    weights: { drift: 6, hover: 3, sleep: 1.5, giggle: 1.8, sprinkle: 1, cry: 1.3, angry: 1.1 }
  };

  class Cloud extends Pet {
    initExtra(o) { this.hover = o.hover || rand(90, 190); this.alt = this.hover; this.col = [95, 231, 255]; this.glitchT = rand(3, 7); this.glitch = 0; }

    build() {
      const sp = this.sp, el = this.el = document.createElement('div');
      el.className = 'pet'; el.dataset.species = 'cloud';
      el.style.width = sp.W + 'px'; el.style.height = sp.H + 'px'; el.style.transformOrigin = `${sp.W / 2}px ${sp.G}px`;
      const id = this.id, puffs = [[50, 66, 24], [82, 50, 30], [113, 66, 24], [30, 82, 16], [131, 84, 16]];
      const shapes = fill => `<ellipse cx="80" cy="80" rx="56" ry="25" ${fill}/>` + puffs.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" ${fill}/>`).join('');
      const C = 'currentColor';
      const eyeO = (x, ry = 6.6) => `<ellipse cx="${x}" cy="61" rx="5.2" ry="${ry}" fill="${C}"/><ellipse cx="${x + 1.5}" cy="${61 - ry * .38}" rx="1.6" ry="2" fill="#fff" opacity=".85"/>`;
      const plus = (x, y, r) => `<path d="M${x - r} ${y} H${x + r} M${x} ${y - r} V${y + r}" ${stroke(C, 1.4)}/>`;
      const bits = [0, 1, 2, 3, 4, 5].map(i => `<rect data-p="b${i}" width="2.6" height="2.6" fill="${C}" opacity="0"/>`).join('');
      el.innerHTML = `<svg viewBox="0 0 ${sp.W} ${sp.H}" width="${sp.W}" height="${sp.H}" role="img" aria-label="cloud">
        <defs>
          <linearGradient id="cg${id}" gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2="108">
            <stop offset="0" stop-color="#C6F5FF"/><stop offset=".5" stop-color="#7AD3FF"/><stop offset="1" stop-color="#4C9BFF"/></linearGradient>
          <linearGradient id="sg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
          <pattern id="ln${id}" width="160" height="4" patternUnits="userSpaceOnUse"><rect width="160" height="1" fill="#fff" opacity=".26"/></pattern>
          <pattern id="dt${id}" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".9" fill="#fff" opacity=".32"/></pattern>
          <clipPath id="cp${id}">${shapes('')}</clipPath>
          <filter id="gf${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <g data-p="torso" style="color:#5FE7FF">
          <g data-p="body">
            <g opacity=".8">
              ${shapes(`fill="${C}" stroke="${C}" stroke-width="4"`)}
              ${shapes(`fill="url(#cg${id})"`)}
            </g>
            <g clip-path="url(#cp${id})">
              <rect x="0" y="14" width="160" height="96" fill="url(#dt${id})"/>
              <rect x="0" y="14" width="160" height="96" fill="url(#ln${id})"/>
              <rect data-p="scan" x="0" y="0" width="160" height="16" fill="url(#sg${id})"/>
              <ellipse cx="68" cy="37" rx="17" ry="7" fill="#fff" opacity=".4" transform="rotate(-18 68 37)"/>
              <g data-p="gl1"><rect x="26" y="50" width="108" height="3" fill="#fff" opacity="0"/></g>
              <g data-p="gl2"><rect x="26" y="70" width="108" height="2" fill="${C}" opacity="0"/></g>
            </g>
            <g data-p="storm" opacity="0" style="color:#FF3D7F">${shapes(`fill="${C}"`)}</g>
            <g data-p="face" filter="url(#gf${id})" style="color:#E9FEFF">
              ${ell(52, 74, 7, 4.2, '#FF7BD5', 'opacity=".5"')}${ell(108, 74, 7, 4.2, '#FF7BD5', 'opacity=".5"')}
              ${grp('eOpen', eyeO(64) + eyeO(96))}
              ${grp('eShut', `<path d="M58 62 q6 5 12 0 M90 62 q6 5 12 0" ${stroke(C, 2.8)}/>`)}
              ${grp('eSqz', `<path d="M58 56 l10 5.5 l-10 5.5 M102 56 l-10 5.5 l10 5.5" ${stroke(C, 2.8)}/>`)}
              ${grp('eHappy', `<path d="M58 66 q6 -9 12 0 M90 66 q6 -9 12 0" ${stroke(C, 3)}/>`)}
              ${grp('eAngry', eyeO(64, 4.8) + eyeO(96, 4.8) + `<path d="M54 52 L73 59 M106 52 L87 59" ${stroke(C, 3.4)}/>`)}
              ${grp('eSad', eyeO(64) + eyeO(96) + `<path d="M55 58 L73 51 M105 58 L87 51" ${stroke(C, 3)}/><path d="M57 70 q-3.5 6 0 8.5 q3.5 -2.5 0 -8.5z" fill="#7FE9FF"/>`)}
              ${grp('mClosed', `<path d="M72 71 Q80 80 88 71" ${stroke(C, 2.8)}/>`)}
              ${grp('mOpen', ell(80, 76, 4.6, 5.6, C, 'opacity=".9"'))}
              ${grp('mPant', ell(80, 76, 4.6, 5.6, C, 'opacity=".9"'))}
              ${grp('mSmile', `<path d="M70 70 Q80 88 90 70Z" fill="${C}" opacity=".92"/>`)}
              ${grp('mGrump', `<path d="M67 80 L72.5 74.5 L78 80 L83 74.5 L88 80 L93 76" ${stroke(C, 2.6)}/>`)}
              ${grp('mFrown', `<path d="M71 80 Q80 71 89 80" ${stroke(C, 2.8)}/>`)}
            </g>
          </g>
          <g data-p="ring" fill="none">
            <ellipse cx="80" cy="66" rx="76" ry="20" stroke="${C}" stroke-width="1.1" stroke-dasharray="2 6" opacity=".75"/>
            <circle data-p="n1" r="2.6" fill="#fff" filter="url(#gf${id})"/><circle data-p="n2" r="2.6" fill="#fff" filter="url(#gf${id})"/>
          </g>
          <g>${bits}</g>
          <g data-p="sp1">${plus(136, 30, 4)}</g><g data-p="sp2">${plus(20, 58, 3)}</g>
        </g></svg><div class="hit" style="left:6%;top:12%;width:88%;height:78%;border-radius:45%"></div>`;
      this.parts = {};
      el.querySelectorAll('[data-p]').forEach(n => this.parts[n.dataset.p] = n);
      this.shadow = document.createElement('div'); this.shadow.className = 'pet-shadow';
      this.shadow.style.background = 'radial-gradient(closest-side,rgba(60,200,255,.55),rgba(60,200,255,0))';
      this.mgr.layer.append(this.shadow, el);
      this.bind();
    }

    tf(dx = 0, dy = 0, sc = 1) { const sp = this.sp, s = sp.scale * this.k * sc; return `translate(${this.x - sp.W / 2 + dx}px,${this.gy - this.alt - sp.G + dy}px) scale(${s})`; }

    park(x) {
      const [a, b] = this.bounds(); this.roam = false; this.parked = true;
      this.plan = [{ t: 'walk', x: clamp(x != null ? x : this.x, a, b) }, { t: 'call', fn: () => { this.hover = 56; } }, { t: 'pose', name: 'sleep', dur: Infinity }];
    }
    unpark() { this.parked = false; this.roam = true; this.plan = [{ t: 'call', fn: () => { this.hover = rand(90, 170); } }, { t: 'pose', name: 'giggle', dur: 1.3 }]; }
    drop() {
      this.held = false; this.el.classList.remove('held');
      const f = this.mgr.floor(); this.gy = f.y; this.alt = Math.max(0, f.y - this.holdY);
      this.hover = clamp(this.alt, 50, Math.max(60, this.mgr.H - 70));
      if (!this.roam && !this.parked) this.roam = true;
    }

    think() {
      if (this.mgr.paused) return;
      const friend = this.mgr.nearFriend(this);
      if (friend && this.greetCool <= 0) { this.greet(friend); return; }
      const [a, b] = this.bounds(), H = this.mgr.H;
      switch (weighted(this.sp.weights)) {
        case 'drift': { const x = rand(a, b), h = rand(70, Math.min(230, H - 90));
          this.plan = [{ t: 'call', fn: () => { this.hover = h; } }, { t: 'walk', x, speed: this.spd * rand(.8, 1.5) }, { t: 'pose', name: 'stand', dur: rand(.5, 2) }]; break; }
        case 'hover': this.plan = [{ t: 'pose', name: 'stand', dur: rand(2, 5) }]; break;
        case 'sleep': this.plan = [{ t: 'pose', name: 'sleep', dur: rand(8, 16), on: () => this.say('standby…') }, { t: 'pose', name: 'giggle', dur: .8, on: () => this.say('online') }]; break;
        case 'giggle': this.plan = [{ t: 'pose', name: 'giggle', dur: 1.6, on: () => this.mgr.sound('pet', 'cloud') }]; break;
        case 'sprinkle': this.plan = [{ t: 'pose', name: 'puff', dur: .8 }, { t: 'pose', name: 'drizzle', dur: 1.8, on: () => this.mgr.fx.rain(this.x, this.gy - this.alt - 8 * this.k, this.gy - 4, 36, false, 18, 'data') }]; break;
        case 'cry': this.plan = this.cryPlan(); break;
        case 'angry': this.plan = this.angryPlan().concat(Math.random() < .45 ? this.cryPlan(true) : []); break;
        default: this.plan = [{ t: 'pose', name: 'stand', dur: 1 }];
      }
    }

    // a sad little shower: low battery, digital rain for a few seconds
    cryPlan(afterAnger) {
      const dur = rand(5, 8);
      return [{ t: 'pose', name: 'sadRain', dur, on: () => { this.rainUntil = this.time + dur; this.rainT = 0; this.say(afterAnger ? 'rebooting… :(' : 'low battery…'); } },
        { t: 'call', fn: () => { this.rainUntil = 0; } }, { t: 'pose', name: 'giggle', dur: .9, on: () => this.say('online') }];
    }
    // warning -> overload -> electric zap -> reboot
    angryPlan() {
      const zap = () => { this.mgr.fx.bolt(this.x, this.gy - this.alt - 6 * this.k, Math.min(this.alt - 4, 150 * this.k / .45), true); this.mgr.sound('thunder'); };
      return [
        { t: 'pose', name: 'grumpy', dur: 1.3, on: () => this.say('warning…') },
        { t: 'pose', name: 'rage', dur: 1.1, on: () => { this.say('OVERLOAD!', { big: true }); this.mgr.sound('thunder'); } },
        { t: 'pose', name: 'rage', dur: .8, on: zap },
        { t: 'pose', name: 'grumpy', dur: .6 },
        { t: 'pose', name: 'puff', dur: .9, on: () => this.say('*reboot*') },
        { t: 'pose', name: 'stand', dur: .5 }];
    }

    do(steps) { this.rainUntil = 0; return super.do(steps); }

    update(dt) {
      this.time += dt; this.greetCool -= dt;
      const s = this.plan[0], c = this.cur;
      if (this.rainUntil > this.time) {
        this.rainT -= dt;
        if (this.rainT <= 0) { this.rainT = .24; this.mgr.fx.rain(this.x, this.gy - this.alt - 6 * this.k, this.gy - 3, 30, false, 3, 'data'); }
      }
      if (this.held) { this.wantSpeed = 0; this.gy = this.holdY; this.alt = 0; }
      else {
        this.gy = this.surf().y;
        const target = Math.max(34 * this.k, this.hover + c.lift * this.k) + Math.sin(this.time * 1.6 + this.id) * 4 * this.k;
        this.alt = lerp(this.alt, target, 1 - Math.exp(-dt * 2.6));
        if (!s) { this.wantSpeed = 0; if (this.roam && !this.parked) this.think(); else if (!this.parked) this.setPoseOnce('stand'); }
        else this.runStep(s, dt);
      }
      this.speed = lerp(this.speed, this.wantSpeed, 1 - Math.exp(-dt * 6));
      this.sleepFx(dt);
    }

    render(dt) {
      this.ease(dt);
      const c = this.cur, P = this.parts, t = this.time, k = this.k, tg = this.tgt;
      // colour: cyan when calm, hot pink when angry, deep blue when sad
      const goal = tg.eye === 'angry' ? [255, 79, 139] : tg.eye === 'sad' ? [108, 139, 255] : [95, 231, 255], f = 1 - Math.exp(-dt * 6);
      for (let i = 0; i < 3; i++) this.col[i] = lerp(this.col[i], goal[i], f);
      const rgb = this.col.map(Math.round).join(','), hi = this.col.map(v => Math.round(lerp(v, 255, .84))).join(',');
      P.torso.style.color = `rgb(${rgb})`; P.face.style.color = `rgb(${hi})`;
      P.storm.style.color = tg.eye === 'angry' ? 'rgb(255,61,127)' : 'rgb(40,56,170)';
      this.el.firstChild.style.filter = `drop-shadow(0 0 7px rgba(${rgb},.65))`;

      const sq = Math.sin(t * 2.2 + this.id), pf = 1 + c.puff + (this.held ? .06 : 0);
      P.body.setAttribute('transform', `translate(80 100) scale(${(pf * (1 + sq * .022)).toFixed(4)} ${(pf * (1 - sq * .03)).toFixed(4)}) translate(-80 -100)`);
      const look = this.dir * clamp(this.speed / ((this.spd * 1.2) || 1), 0, 1);
      P.face.setAttribute('transform', `translate(${(look * 4).toFixed(2)} ${(sq * .8).toFixed(2)})`);
      // now and then the hologram glitches
      this.glitchT -= dt; if (this.glitchT <= 0) { this.glitch = .16; this.glitchT = rand(4, 9); }
      let jx = 0, gl = this.glitch > 0; if (gl) { this.glitch -= dt; jx = (Math.random() - .5) * 6; }
      P.torso.setAttribute('transform', `translate(${jx.toFixed(2)} 0) rotate(${(look * 4 + Math.sin(t * 7) * c.wob + c.tilt * .3).toFixed(2)} 80 80)`);
      [P.gl1, P.gl2].forEach(g => { const r = g.firstChild; r.setAttribute('opacity', gl ? .6 : 0); if (gl) r.setAttribute('y', (36 + Math.random() * 62).toFixed(1)); });
      P.scan.setAttribute('y', (((t * 34) % 150) - 30).toFixed(1));
      P.storm.setAttribute('opacity', (clamp(c.storm, 0, 1) * .45).toFixed(2));
      // HUD ring with two orbiting nodes
      P.ring.setAttribute('transform', `rotate(${(-14 + Math.sin(t * .8) * 4).toFixed(2)} 80 66)`);
      [[P.n1, t * 1.7], [P.n2, t * 1.7 + Math.PI]].forEach(([n, a]) => {
        n.setAttribute('cx', (80 + 76 * Math.cos(a)).toFixed(1)); n.setAttribute('cy', (66 + 20 * Math.sin(a)).toFixed(1));
        n.setAttribute('r', (2.1 + .9 * Math.sin(a)).toFixed(2)); n.setAttribute('opacity', Math.sin(a) > 0 ? 1 : .4);
      });
      // data bits drifting up through the cloud
      for (let i = 0; i < 6; i++) {
        const ph = (t * .45 + i / 6) % 1, b = P['b' + i];
        b.setAttribute('x', (34 + i * 17 + Math.sin(t + i * 2) * 4).toFixed(1)); b.setAttribute('y', (100 - ph * 70).toFixed(1));
        b.setAttribute('opacity', (Math.sin(ph * Math.PI) * .75).toFixed(2));
      }
      P.sp1.setAttribute('opacity', (.5 + .5 * Math.sin(t * 3) - c.storm * .3).toFixed(2));
      P.sp2.setAttribute('opacity', (.5 + .5 * Math.sin(t * 3 + 2) - c.storm * .3).toFixed(2));

      this.el.style.transform = this.tf();
      this.el.style.zIndex = Math.round(this.gy - this.alt + 100);
      const h = clamp(this.alt / 200, 0, 1);
      this.shadow.style.transform = `translate(${this.x}px,${this.gy + 1}px) scale(${(1 - h * .55) * .9 * k},${k})`;
      this.shadow.style.opacity = (.7 * (1 - h)).toFixed(2);
      this.shadow.style.zIndex = Math.round(this.gy + 99);
    }
  }

  /* =====================================================================
   *  Effects
   * ===================================================================== */
  class FX {
    constructor(mgr) { this.m = mgr; }
    add(el, x, y) { el.className += ' pf'; el.style.transform = `translate(${x}px,${y}px)`; this.m.layer.append(el); el.style.zIndex = 9999; return el; }
    anim(el, frames, ms, easing = 'ease-out') { el.animate(frames, { duration: ms, easing, fill: 'forwards' }).onfinish = () => el.remove(); }
    text(x, y, str, o = {}) {
      const el = document.createElement('div'); el.textContent = str;
      el.style.fontSize = (o.big ? 34 : 22) + 'px'; el.style.lineHeight = 1; el.style.left = '0'; el.style.top = '0';
      if (o.big) el.style.color = o.color || 'var(--pet-pop,#E24B6B)';
      this.add(el, x, y); el.className += ' pf-text';
      if (o.tech) {   // little HUD label: readable on any wallpaper
        el.style.fontFamily = "var(--pet-tech,ui-monospace,'Cascadia Code',Consolas,'SF Mono',monospace)";
        el.style.fontSize = (o.big ? 17 : 13) + 'px'; el.style.fontWeight = '600'; el.style.letterSpacing = '.05em';
        el.style.color = o.big ? '#FFB3D1' : '#A5F6FF'; el.style.background = 'rgba(8,28,64,.76)';
        el.style.border = '1px solid ' + (o.big ? 'rgba(255,111,170,.9)' : 'rgba(95,231,255,.85)'); el.style.borderRadius = '7px';
        el.style.padding = '2px 8px'; el.style.boxShadow = '0 0 12px ' + (o.big ? 'rgba(255,79,139,.5)' : 'rgba(80,225,255,.5)'); el.style.textShadow = 'none';
      }
      const r = o.big ? -8 : -3;
      this.anim(el, [{ opacity: 0, transform: `translate(${x}px,${y + 10}px) scale(.4) rotate(${r - 6}deg)` },
        { opacity: 1, transform: `translate(${x}px,${y - 6}px) scale(1.08) rotate(${r}deg)`, offset: .25 },
        { opacity: 1, transform: `translate(${x}px,${y - 14}px) scale(1) rotate(${r}deg)`, offset: .75 },
        { opacity: 0, transform: `translate(${x}px,${y - 30}px) scale(.96) rotate(${r}deg)` }], o.big ? 1500 : 1100, 'ease-out');
    }
    spray(x, y, dir) {
      const cols = ['#59BDF5', '#9ADBFB', '#fff', '#59BDF5'];
      for (let i = 0; i < 24; i++) {
        const s = 3 + Math.random() * 6, el = document.createElement('div');
        el.style.cssText = `width:${s}px;height:${s * (1 + Math.random() * .5)}px;border-radius:50%;background:${cols[i % 4]}`;
        this.add(el, x, y);
        const sp = 110 + Math.random() * 230, ang = Math.atan2(dir.y, dir.x) + (Math.random() - .5) * .95;
        const dx = Math.cos(ang) * sp, dy = Math.sin(ang) * sp;
        this.anim(el, [{ opacity: 1, transform: `translate(${x}px,${y}px) scale(.6)` },
          { opacity: 1, transform: `translate(${x + dx * .8}px,${y + dy * .8}px) scale(1)`, offset: .6 },
          { opacity: 0, transform: `translate(${x + dx}px,${y + dy + 60 + Math.random() * 40}px) scale(.8)` }], 700 + Math.random() * 500, 'cubic-bezier(.2,.7,.4,1)');
      }
    }
    burst(x, y, cols, n, spread, shape) {
      for (let i = 0; i < n; i++) {
        const el = document.createElement('div'), s = 6 + Math.random() * 7, a = Math.random() * Math.PI * 2, d = spread * (.4 + Math.random() * .8);
        const col = cols[i % cols.length];
        if (shape === 'star') el.innerHTML = `<svg width="${s * 2}" height="${s * 2}" viewBox="-10 -10 20 20"><path d="M0 -9 L2.6 -2.6 L9 0 L2.6 2.6 L0 9 L-2.6 2.6 L-9 0 L-2.6 -2.6Z" fill="${col}"/></svg>`;
        else if (shape === 'leaf') el.innerHTML = `<svg width="${s * 2}" height="${s * 2}" viewBox="-10 -10 20 20"><path d="M-8 4 C-8 -6 2 -9 9 -8 C9 0 4 8 -8 4Z" fill="${col}"/></svg>`;
        else { el.style.cssText = `width:${s}px;height:${s}px;border-radius:50%;background:${col}`; }
        this.add(el, x, y);
        this.anim(el, [{ opacity: 1, transform: `translate(${x}px,${y}px) scale(.4) rotate(0deg)` },
          { opacity: 1, transform: `translate(${x + Math.cos(a) * d}px,${y + Math.sin(a) * d - 24}px) scale(1.1) rotate(${(Math.random() - .5) * 300}deg)`, offset: .55 },
          { opacity: 0, transform: `translate(${x + Math.cos(a) * d * 1.1}px,${y + Math.sin(a) * d + 30}px) scale(.8) rotate(${(Math.random() - .5) * 500}deg)` }], 800 + Math.random() * 500, 'cubic-bezier(.2,.8,.4,1)');
      }
    }
    rain(x, y0, y1, spread = 50, splash = false, n = 18, kind = 'drop') {
      for (let i = 0; i < n; i++) setTimeout(() => {
        const el = document.createElement('div'), dx = (Math.random() - .5) * 2 * spread, s = 5 + Math.random() * 3, dur = 620 + Math.random() * 320;
        if (kind === 'data') {   // digital rain: little glowing glyphs
          el.textContent = pick(['0', '1', '0', '1', '▮', '·', '0', '1']);
          el.style.cssText = `margin-left:-4px;font:600 ${11 + Math.random() * 4}px ui-monospace,Consolas,monospace;color:#B8FAFF;text-shadow:0 0 3px #0A2A5A,0 0 7px #5FE7FF,0 0 12px #5FE7FF`;
        } else el.style.cssText = `width:${s}px;height:${s * 1.7}px;margin-left:${-s / 2}px;border-radius:50% 50% 50% 50%/62% 62% 38% 38%;background:linear-gradient(#D6EBFF,#6FB1FF)`;
        this.add(el, x + dx, y0);
        this.anim(el, [{ opacity: 0, transform: `translate(${x + dx}px,${y0}px) scale(.6)` }, { opacity: 1, transform: `translate(${x + dx}px,${y0 + 12}px) scale(1)`, offset: .12 },
          { opacity: .9, transform: `translate(${x + dx}px,${y1}px) scale(1)` }], dur, 'cubic-bezier(.4,0,.9,.6)');
        if (splash && i % 2 === 0) setTimeout(() => this.burst(x + dx, y1, kind === 'data' ? ['#fff', '#8EF3FF', '#FF7BD5'] : ['#fff', '#BFE0FF', '#FFE45E'], 3, 26, 'star'), dur - 30);
      }, i * 80);
    }
    bolt(x, y, len, tech) {
      const el = document.createElement('div'), h = Math.max(30, len), w = h * .42;
      const fill = tech ? '#F2FDFF' : '#FFE45E', edge = tech ? '#5FE7FF' : '#FFB400', glow = tech ? 'drop-shadow(0 0 4px #5FE7FF) drop-shadow(0 0 10px #FF4F8B)' : 'drop-shadow(0 0 6px #FFE45E)';
      el.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 40 100" preserveAspectRatio="none" style="overflow:visible;filter:${glow}"><path d="M26 0 L8 46 L22 46 L12 100 L36 38 L21 38 L32 0Z" fill="${fill}" stroke="${edge}" stroke-width="2" stroke-linejoin="round"/></svg>`;
      el.style.marginLeft = (-w / 2) + 'px';
      this.add(el, x, y);
      this.anim(el, [{ opacity: 0, transform: `translate(${x}px,${y}px) scaleY(.3)` }, { opacity: 1, transform: `translate(${x}px,${y}px) scaleY(1)`, offset: .12 },
        { opacity: .25, offset: .3 }, { opacity: 1, offset: .42 }, { opacity: 0, transform: `translate(${x}px,${y}px) scaleY(1)` }], 520, 'linear');
      setTimeout(() => this.burst(x, y + h, tech ? ['#8EF3FF', '#fff', '#FF7BD5'] : ['#FFE45E', '#fff', '#FFB400'], 8, 40, 'star'), 90);
    }
    ring(x, y) {
      const el = document.createElement('div');
      el.style.cssText = 'width:20px;height:8px;margin:-4px 0 0 -10px;border-radius:50%;border:2.5px solid rgba(255,255,255,.95);box-shadow:0 0 0 1.5px rgba(38,42,87,.25)';
      this.add(el, x, y);
      this.anim(el, [{ opacity: 1, transform: `translate(${x}px,${y}px) scale(.4)` }, { opacity: 0, transform: `translate(${x}px,${y}px) scale(5.5,3.4)` }], 520);
    }
    puff(x, y, col, n = 6) {
      for (let i = 0; i < n; i++) {
        const el = document.createElement('div'), s = 7 + Math.random() * 7, d = (Math.random() - .5) * 60;
        el.style.cssText = `width:${s}px;height:${s}px;border-radius:50%;background:${col};opacity:.9;margin:${-s / 2}px 0 0 ${-s / 2}px`;
        this.add(el, x, y);
        this.anim(el, [{ opacity: .9, transform: `translate(${x}px,${y}px) scale(.5)` }, { opacity: 0, transform: `translate(${x + d}px,${y - 12 - Math.random() * 18}px) scale(1.7)` }], 520 + Math.random() * 200);
      }
    }
    hearts(x, y, n = 5) {
      for (let i = 0; i < n; i++) {
        const el = document.createElement('div'), s = 12 + Math.random() * 9, dx = (Math.random() - .5) * 70;
        el.innerHTML = `<svg width="${s}" height="${s}" viewBox="0 0 24 22"><path d="M12 21 C4 14 1 10 1 6.5 C1 3.2 3.6 1 6.5 1 C8.8 1 11 2.4 12 4.4 C13 2.4 15.2 1 17.5 1 C20.4 1 23 3.2 23 6.5 C23 10 20 14 12 21Z" fill="#FF6F91"/></svg>`;
        this.add(el, x + dx * .3, y);
        setTimeout(() => this.anim(el, [{ opacity: 0, transform: `translate(${x + dx * .3}px,${y}px) scale(.3)` },
          { opacity: 1, transform: `translate(${x + dx * .6}px,${y - 20}px) scale(1)`, offset: .25 },
          { opacity: 0, transform: `translate(${x + dx}px,${y - 62 - Math.random() * 20}px) scale(.9) rotate(${dx * .3}deg)` }], 1100, 'ease-out'), i * 90);
      }
    }
    zzz(x, y) {
      const el = document.createElement('div'); el.textContent = 'z';
      el.style.cssText = 'font-size:26px;font-weight:700;color:var(--pet-ink,#262A57);opacity:.7';
      this.add(el, x, y); el.className += ' pf-text';
      this.anim(el, [{ opacity: 0, transform: `translate(${x}px,${y}px) scale(.5)` }, { opacity: .85, transform: `translate(${x + 8}px,${y - 16}px) scale(.9)`, offset: .3 },
        { opacity: 0, transform: `translate(${x + 22}px,${y - 52}px) scale(1.3)` }], 2400, 'ease-in');
    }
  }

  /* =====================================================================
   *  Manager
   * ===================================================================== */
  class Manager {
    constructor(container, opts = {}) {
      this.opts = Object.assign({ sound: true, outline: true, floorMargin: 6, paused: false, petScale: .45 }, opts);
      this.k = this.opts.petScale;
      if (!document.getElementById('pets-css')) { const st = document.createElement('style'); st.id = 'pets-css'; st.textContent = CSS; document.head.append(st); }
      this.root = container;
      if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
      this.layer = document.createElement('div');
      this.layer.className = 'pets-layer' + (this.opts.outline ? ' outline' : '') + (container === document.body ? ' fixed' : '');
      container.append(this.layer);
      this.fx = new FX(this);
      this.pets = []; this.paused = !!this.opts.paused; this.hovering = 0; this._surf = null;
      this.measure(); new ResizeObserver(() => this.measure()).observe(container);
      this.last = performance.now(); this.running = true;
      const loop = now => { if (!this.running) return; const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.tick(dt); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      this.nextRemind = 0;
    }
    measure() { this.W = this.layer.clientWidth || this.root.clientWidth; this.H = this.layer.clientHeight || this.root.clientHeight; }
    floor() { return { id: 'floor', x1: 0, x2: this.W, y: this.H - this.opts.floorMargin }; }
    surfaces() {
      const extra = typeof this.opts.surfaces === 'function' ? this.opts.surfaces() : (this.opts.surfaces || []);
      return [this.floor(), ...extra.map((s, i) => Object.assign({ id: s.id || 'ledge' + i }, s))];
    }
    surfaceById(id) { return this.surfaces().find(s => s.id === id) || this.floor(); }
    surfaceBelow(x, y) {
      const c = this.surfaces().filter(s => x >= s.x1 - 10 && x <= s.x2 + 10 && s.y >= y - 6).sort((a, b) => a.y - b.y);
      return c[0] || this.floor();
    }
    nearFriend(p) {
      if (this.pets.length < 2) return null;
      let best = null, bd = 220;
      this.pets.forEach(o => { if (o !== p && o.sid === p.sid && !o.held && o.roam && !o.parked) { const d = Math.abs(o.x - p.x); if (d < bd) { bd = d; best = o; } } });
      return best;
    }
    setScale(k) { this.k = clamp(k, .25, 1.2); this.pets.forEach(p => p.k = this.k); }
    hover(d) { const was = this.hovering > 0; this.hovering = Math.max(0, this.hovering + d); const now = this.hovering > 0; if (was !== now) this.opts.onHover && this.opts.onHover(now); }
    tick(dt) {
      if (this.paused) { this.pets.forEach(p => p.render(0)); return; }
      this.pets.forEach(p => { p.update(dt); p.render(dt); });
      // gentle personal space: idle pets drift apart instead of stacking
      for (let i = 0; i < this.pets.length; i++) for (let j = i + 1; j < this.pets.length; j++) {
        const a = this.pets[i], b = this.pets[j];
        if (a.sid !== b.sid || a.held || b.held || a.falling || b.falling || a.sp.kind === 'cloud' || b.sp.kind === 'cloud') continue;
        const idle = p => !p.plan[0] || p.plan[0].t === 'pose' || p.plan[0].t === 'wait';
        const d = b.x - a.x;
        const gap = 56 * this.k / .45; if (Math.abs(d) < gap && idle(a) && idle(b)) { const k = (gap - Math.abs(d)) * 4 * dt * (d >= 0 ? 1 : -1); a.x -= k; b.x += k; }
      }
    }

    /* ---- public api ---- */
    add(species, o = {}) {
      if (!SPECIES[species]) throw new Error('Unknown species: ' + species + ' (use ' + Object.keys(SPECIES).join(', ') + ')');
      const p = new (SPECIES[species].kind === 'cloud' ? Cloud : Pet)(this, species, o); this.pets.push(p); return p;
    }
    remove(p) { p = typeof p === 'number' ? this.pets[p] : p; if (!p) return; p.destroy(); this.pets = this.pets.filter(x => x !== p); }
    clear() { this.pets.slice().forEach(p => this.remove(p)); }
    get(species) { return this.pets.find(p => p.species === species); }
    setRoaming(on) { this.pets.forEach(p => { if (on) { p.roam = true; if (p.parked) p.unpark(); } else p.roam = false; }); }
    parkAll() { this.pets.forEach((p, i) => p.park(this.W * (i + 1) / (this.pets.length + 1))); }
    pause(on) { this.paused = on !== false; }
    setSound(on) { this.opts.sound = !!on; }
    remind(text, o = {}) {
      const free = this.pets.filter(p => !p.held);
      const p = o.pet || free[this.nextRemind++ % Math.max(1, free.length)] || this.pets[0];
      if (!p) return Promise.resolve(null);
      const anchor = typeof o.anchor === 'function' ? o.anchor() : (o.anchor || { x: this.W / 2, y: 0 });
      return p.deliver(text, anchor);
    }
    serialize() { return this.pets.map(p => ({ species: p.species, name: p.name, parked: p.parked })); }
    restore(list) { this.clear(); (list || []).forEach(o => { const p = this.add(o.species, { name: o.name }); if (o.parked) p.park(); }); }
    destroy() { this.running = false; this.layer.remove(); }
    shake(k = 1) { if (this.opts.onShake) this.opts.onShake(k); }

    /* ---- sound (tiny synth, no assets) ---- */
    audioUnlock() { if (!this.ac && this.opts.sound) try { this.ac = new (root.AudioContext || root.webkitAudioContext)(); } catch (_) {} if (this.ac && this.ac.state === 'suspended') this.ac.resume(); }
    sound(kind, species) {
      if (!this.opts.sound) return; this.audioUnlock(); const ac = this.ac; if (!ac) return; const t = ac.currentTime;
      const env = (g, a, d, v) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); };
      const osc = (type, f0, f1, dur, vol) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); env(g, .01, dur, vol); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + .05); };
      if (kind === 'sneeze') {
        osc('sine', 520, 900, .3, .07);
        const len = ac.sampleRate * .3, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
        const src = ac.createBufferSource(); src.buffer = buf; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = .8;
        f.frequency.setValueAtTime(3200, t + .42); f.frequency.exponentialRampToValueAtTime(900, t + .72);
        const g = ac.createGain(); g.gain.value = .32; src.connect(f).connect(g).connect(ac.destination); src.start(t + .42);
      } else if (kind === 'thump') osc('sine', 150, 48, .16, .35);
      else if (kind === 'tap') { osc('triangle', 900, 420, .09, .16); }
      else if (kind === 'yip') { const hi = species === 'fox' ? 1.35 : 1; osc('square', 620 * hi, 980 * hi, .09, .045); setTimeout(() => this.opts.sound && osc('square', 780 * hi, 1180 * hi, .08, .04), 110); }
      else if (kind === 'thunder') {
        const len = ac.sampleRate * .9, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.6);
        const src = ac.createBufferSource(); src.buffer = buf; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
        const g = ac.createGain(); g.gain.value = .5; src.connect(f).connect(g).connect(ac.destination); src.start(t); osc('sine', 90, 40, .5, .22);
      }
      else if (kind === 'rain') {
        const len = ac.sampleRate * .9, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (.5 + .5 * Math.sin(i / 380)) * Math.min(1, (len - i) / (len * .4));
        const src = ac.createBufferSource(); src.buffer = buf; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3800;
        const g = ac.createGain(); g.gain.value = .07; src.connect(f).connect(g).connect(ac.destination); src.start(t);
      }
      else if (kind === 'pet') {
        if (species === 'cloud') { osc('sine', 880, 1320, .09, .05); setTimeout(() => this.opts.sound && osc('sine', 1320, 1760, .09, .045), 90); }
        else osc('sine', 600, 860, .12, .06);
      }
    }
  }

  root.Pets = {
    mount: (container, opts) => new Manager(container, opts),
    SPECIES: Object.keys(SPECIES), STYLES, POSES,
    version: '1.0'
  };
})(typeof window !== 'undefined' ? window : this);
