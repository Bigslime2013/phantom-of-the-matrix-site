/* ===========================
   BOOT-UP INTRO
=========================== */
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('boot-screen').style.display = 'none';
  }, 3500);
});

/* ===========================
   UTILITIES
=========================== */
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/* ===========================
   AUDIO + ANALYSER
=========================== */
const audio = document.getElementById('matrix-audio');
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const source = audioCtx.createMediaElementSource(audio);
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 1024;
source.connect(analyser);
analyser.connect(audioCtx.destination);
const dataArray = new Uint8Array(analyser.frequencyBinCount);

/* ===========================
   MULTI-LAYER MATRIX RAIN + PARALLAX TILT
=========================== */
const back = document.getElementById('matrix-back');
const mid  = document.getElementById('matrix-mid');
const front= document.getElementById('matrix-front');
[back, mid, front].forEach(c => { c.width = innerWidth; c.height = innerHeight; });

const ctxBack = back.getContext('2d');
const ctxMid  = mid.getContext('2d');
const ctxFront= front.getContext('2d');

const letters = 'アァイィウヴエェオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモヤユヨラリルレロワヲン0123456789+-*/<>=';
const fontSize = 14;

function makeDrops(speed, opacity) {
  const cols = Math.floor(innerWidth / fontSize);
  return {
    y: new Array(cols).fill(0).map(() => Math.random() * innerHeight / fontSize),
    speed, opacity
  };
}
let rainColor = '#00ff00';
let burstBonus = 0;

let layerBack  = makeDrops(0.5, 0.35);
let layerMid   = makeDrops(1.0, 0.55);
let layerFront = makeDrops(1.6, 0.85);

function updateRainColor() {
  if (document.body.classList.contains('theme-glitch')) rainColor = '#ff0033';
  else if (document.body.classList.contains('theme-ghost')) rainColor = '#ffffff';
  else if (document.body.classList.contains('theme-neon')) rainColor = '#7df9ff'; // secret
  else rainColor = '#00ff00';
}

function drawLayer(ctx, layer, parallaxX, parallaxY) {
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = rainColor;
  ctx.globalAlpha = layer.opacity;

  ctx.font = `${fontSize}px monospace`;

  for (let i = 0; i < layer.y.length; i++) {
    const x = i * fontSize + parallaxX;
    const y = layer.y[i] * fontSize + parallaxY;
    const ch = letters.charAt(Math.floor(Math.random() * letters.length));
    ctx.fillText(ch, x, y);
    if (y > ctx.canvas.height && Math.random() > 0.975) layer.y[i] = 0;
    layer.y[i] += layer.speed + burstBonus;
  }
  ctx.globalAlpha = 1;
}

let tiltX = 0, tiltY = 0;
window.addEventListener('mousemove', (e) => {
  const nx = (e.clientX / innerWidth) * 2 - 1;
  const ny = (e.clientY / innerHeight) * 2 - 1;
  tiltX = nx * 10;  /* subtle parallax pixels */
  tiltY = ny * 8;
});

function drawMatrix() {
  if (document.body.classList.contains('performance')) return;
  drawLayer(ctxBack,  layerBack,  tiltX * 0.3, tiltY * 0.3);
  drawLayer(ctxMid,   layerMid,   tiltX * 0.6, tiltY * 0.6);
  drawLayer(ctxFront, layerFront, tiltX * 1.0, tiltY * 1.0);
  burstBonus = 0;
}
setInterval(drawMatrix, 33);

window.addEventListener('resize', () => {
  [back, mid, front, particleCanvas].forEach(c => { c.width = innerWidth; c.height = innerHeight; });
  layerBack  = makeDrops(0.5, 0.35);
  layerMid   = makeDrops(1.0, 0.55);
  layerFront = makeDrops(1.6, 0.85);
});

/* ===========================
   AUDIO-REACTIVE BACKGROUND + HUD PULSE + BASS BURSTS
=========================== */
function loopReactive() {
  if (document.body.classList.contains('performance')) {
    document.body.style.boxShadow = 'none';
    requestAnimationFrame(loopReactive);
    return;
  }
  analyser.getByteFrequencyData(dataArray);
  const bass = dataArray[2]; // slightly higher bin for stability

  // Trigger denser rain
  if (bass > 200) burstBonus = 0.6;

  // HUD pulse
  const hud = document.getElementById('system-hud');
  hud.style.boxShadow = `0 0 ${5 + bass / 10}px ${rainColor}`;

  // Body glow (kept from your build)
  document.body.style.boxShadow = `inset 0 0 ${bass / 2}px rgba(0,255,204,0.5)`;

  requestAnimationFrame(loopReactive);
}
loopReactive();

/* ===========================
   WAVEFORM-DRIVEN PARTICLES
=========================== */
const particleCanvas = document.getElementById('particle-canvas');
const pctx = particleCanvas.getContext('2d');
particleCanvas.width = innerWidth;
particleCanvas.height = innerHeight;

const PARTICLES = 180;
const particles = Array.from({length: PARTICLES}, () => ({
  x: Math.random() * innerWidth,
  y: Math.random() * innerHeight,
  vx: 0, vy: 0, size: Math.random() * 1.8 + 0.7
}));

function renderParticles() {
  if (document.body.classList.contains('performance')) {
    requestAnimationFrame(renderParticles);
    return;
  }
  pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  analyser.getByteTimeDomainData(dataArray);
  const cx = innerWidth / 2, cy = innerHeight / 2;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const wave = (dataArray[i % dataArray.length] - 128) / 128;
    const angle = (i / particles.length) * Math.PI * 2 + wave * 0.6;
    const force = wave * 0.9;

    p.vx += Math.cos(angle) * force;
    p.vy += Math.sin(angle) * force;

    // spring back to screen center
    p.vx += (cx - p.x) * 0.0008;
    p.vy += (cy - p.y) * 0.0008;

    // damping
    p.vx *= 0.96; p.vy *= 0.96;

    p.x += p.vx;
    p.y += p.vy;

    // wrap
    if (p.x < 0) p.x += innerWidth; if (p.x > innerWidth) p.x -= innerWidth;
    if (p.y < 0) p.y += innerHeight; if (p.y > innerHeight) p.y -= innerHeight;

    pctx.fillStyle = getComputedStyle(document.body).color;
    pctx.globalAlpha = 0.55;
    pctx.beginPath();
    pctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    pctx.fill();
    pctx.globalAlpha = 1;
  }
  requestAnimationFrame(renderParticles);
}
renderParticles();

/* ===========================
   3D GLYPH CLOUD (THREE.JS)
=========================== */
(function initGlyphCloud(){
  const container = document.getElementById('glyph3d-container');
  const canvas = document.getElementById('glyph3d');
  if (!window.THREE || !container) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.z = 8;

  const group = new THREE.Group(); scene.add(group);
  const geo = new THREE.SphereGeometry(1, 16, 16);
  const color = new THREE.Color(getComputedStyle(document.body).color);
  const mat = new THREE.PointsMaterial({ size: 0.06, color, transparent: true, opacity: 0.9 });

  // Place points randomly on sphere
  const count = 1200;
  const positions = new Float32Array(count * 3);
  for (let i=0;i<count;i++){
    const phi = Math.acos(2*Math.random()-1);
    const theta = 2*Math.PI*Math.random();
    const r = 2.3 + Math.random()*0.7;
    positions[i*3+0] = r*Math.sin(phi)*Math.cos(theta);
    positions[i*3+1] = r*Math.cos(phi);
    positions[i*3+2] = r*Math.sin(phi)*Math.sin(theta);
  }
  const bufferGeo = new THREE.BufferGeometry();
  bufferGeo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  const points = new THREE.Points(bufferGeo, mat);
  group.add(points);

  // React to audio
  function render() {
    analyser.getByteFrequencyData(dataArray);
    const bass = dataArray[2] / 255;
    group.rotation.y += 0.002 + bass * 0.01;
    group.rotation.x = 0.2 + bass * 0.2;
    mat.size = 0.05 + bass * 0.1;
    mat.color.set(getComputedStyle(document.body).color);
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }
  render();

  window.addEventListener('resize', () => {
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
  });
})();

/* ===========================
   MOUSE TRAIL (Audio-reactive brightness)
=========================== */
const trailContainer = document.getElementById('trail-container');
document.addEventListener('mousemove', (e) => {
  if (document.body.classList.contains('performance')) return;
  analyser.getByteFrequencyData(dataArray);
  const bass = dataArray[2] / 255;

  const span = document.createElement('span');
  span.className = 'matrix-trail';
  span.textContent = String.fromCharCode(0x30A0 + Math.random() * 96);
  span.style.left = `${e.clientX}px`;
  span.style.top = `${e.clientY}px`;
  span.style.filter = `brightness(${1 + bass})`;
  span.style.transform = `scale(${1 + bass})`;
  trailContainer.appendChild(span);
  setTimeout(() => span.remove(), 500);
});

/* ===========================
   GLITCH ON SCROLL
=========================== */
const glitchTargets = document.querySelectorAll(".glitch-target");
window.addEventListener("scroll", () => {
  glitchTargets.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < innerHeight && rect.bottom > 0) {
      el.classList.add("glitch");
      setTimeout(() => el.classList.remove("glitch"), 300);
    }
  });
});

/* ===========================
   DECRYPTION REVEAL (Section reveals)
=========================== */
const decodeChars = '█▓▒░01<>/*#&$@%∆§±ΞΦΩ≈';
function decryptElement(el, finalText, speed=12) {
  let frame = 0;
  const len = finalText.length;
  const scram = () => {
    frame++;
    let out = '';
    for (let i=0;i<len;i++){
      if (frame > speed + i*1.5) out += finalText[i];
      else out += decodeChars[Math.floor(Math.random()*decodeChars.length)];
    }
    el.textContent = out;
    if (frame < speed + len*1.5) requestAnimationFrame(scram);
  };
  scram();
}
const revealObserver = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if (entry.isIntersecting){
      entry.target.classList.add('revealed');
      entry.target.querySelectorAll('.decrypt').forEach(n=>{
        const txt = n.getAttribute('data-text');
        if (txt && !n.dataset.done){ decryptElement(n, txt); n.dataset.done = '1'; }
      });
      revealObserver.unobserve(entry.target);
    }
  });
},{threshold: 0.2});
document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));

/* ===========================
   HOVER SOUND FX
=========================== */
const hoverSound = new Audio('assets/hover.mp3');
hoverSound.volume = 0.3;
document.addEventListener('mouseover', (e) => {
  if (e.target.classList.contains('glow-btn') || e.target.classList.contains('merch-item')) {
    try { hoverSound.currentTime = 0; hoverSound.play(); } catch(e){}
  }
});

/* ===========================
   CREATOR TOOLS + THEME MORPH
=========================== */
const themeToggle = document.getElementById('theme-toggle');
const debugToggle = document.getElementById('debug-toggle');
const perfToggle = document.getElementById('perf-toggle');

themeToggle.addEventListener('change', () => {
  document.body.classList.add('theme-transition');
  setTimeout(() => {
    document.body.classList.remove('theme-matrix','theme-glitch','theme-ghost','theme-neon');
    document.body.classList.add(`theme-${themeToggle.value}`);
    hudTheme.textContent = themeToggle.value.charAt(0).toUpperCase() + themeToggle.value.slice(1);
    updateRainColor();
    document.body.classList.remove('theme-transition');
  }, 300);
});

debugToggle.addEventListener('change', () => {
  document.body.classList.toggle('debug-outline', debugToggle.checked);
});

perfToggle.addEventListener('change', () => {
  document.body.classList.toggle('performance', perfToggle.checked);
  hudMode.textContent = perfToggle.checked ? 'Performance' : 'Normal';
});

/* ===========================
   HUD
=========================== */
const hudTheme = document.getElementById('hud-theme');
const hudAudio = document.getElementById('hud-audio');
const hudMode = document.getElementById('hud-mode');
const hudGlyphs = document.getElementById('hud-glyphs');
const hudAlert = document.getElementById('hud-alert');
const hudSpectrum = document.getElementById('hud-spectrum');
const hctx = hudSpectrum.getContext('2d');

const alerts = ["INTRUSION DETECTED", "SIGNAL LOST", "DATA STREAM ERROR", "OVERRIDE ACTIVE"];
setInterval(() => {
  if (Math.random() > 0.8) {
    hudAlert.textContent = alerts[Math.floor(Math.random() * alerts.length)];
    hudAlert.classList.add("glitch");
    setTimeout(() => { hudAlert.textContent = ""; hudAlert.classList.remove("glitch"); }, 1500);
  }
}, 5000);

setInterval(() => {
  analyser.getByteFrequencyData(dataArray);
  const bass = Math.floor(dataArray[2]);
  hudAudio.textContent = bass;
  const glyph = String.fromCharCode(0x30A0 + Math.random() * 96);
  hudGlyphs.style.opacity = 0.5 + (bass / 255) * 0.5;
  hudGlyphs.textContent = (hudGlyphs.textContent + glyph).slice(-50);

  // Spectrum bars
  hctx.clearRect(0, 0, hudSpectrum.width, hudSpectrum.height);
  const barCount = 16;
  const barWidth = hudSpectrum.width / barCount;
  const hudColor = getComputedStyle(document.body).color;
  for (let i=0;i<barCount;i++){
    const v = dataArray[i] / 255;
    const h = v * hudSpectrum.height;
    hctx.fillStyle = hudColor;
    hctx.fillRect(i*barWidth, hudSpectrum.height - h, barWidth - 2, h);
  }
}, 150);

/* ===========================
   KONAMI CODE UNLOCKS
=========================== */
const KONAMI = ['n','e'];
let konamiIndex = 0;
let stormMode = false;

function enableSecretTheme() {
  document.body.classList.remove('theme-matrix','theme-glitch','theme-ghost');
  document.body.classList.add('theme-neon');
  hudTheme.textContent = 'Neon';
  updateRainColor();
  hudAlert.textContent = 'SECRET THEME UNLOCKED';
  setTimeout(()=>hudAlert.textContent='',2000);
}

function toggleStormMode() {
  stormMode = !stormMode;
  hudAlert.textContent = stormMode ? 'STORM MODE: ON' : 'STORM MODE: OFF';
  setTimeout(()=>hudAlert.textContent='',2000);
}

window.addEventListener('keydown', (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (key === KONAMI[konamiIndex]) {
    konamiIndex++;
    if (konamiIndex === KONAMI.length) {
      konamiIndex = 0;
      // First time: secret theme; second time: toggle storm mode
      if (!document.body.classList.contains('theme-neon')) enableSecretTheme();
      else toggleStormMode();
    }
  } else {
    konamiIndex = 0;
  }
});
/* ===========================
   SECRET CODE SYSTEM — Full Merge
=========================== */

// Create or grab audio elements
let mainAudio = document.getElementById('main-audio');
if (!mainAudio) {
  mainAudio = document.createElement('audio');
  mainAudio.id = 'main-audio';
  mainAudio.src = './assets/main-track.mp3'; // <-- your main track
  mainAudio.loop = true;
  mainAudio.preload = 'auto';
  document.body.appendChild(mainAudio);
}

let secretAudio = document.getElementById('secret-audio');
if (!secretAudio) {
  secretAudio = document.createElement('audio');
  secretAudio.id = 'secret-audio';
  secretAudio.loop = false;
  secretAudio.preload = 'auto';
  document.body.appendChild(secretAudio);
}

// Prime audio on first click/tap to bypass autoplay restrictions
document.addEventListener('click', () => {
  [mainAudio, secretAudio].forEach(aud => {
    aud.volume = 0;
    aud.play().then(() => {
      aud.pause();
      aud.currentTime = 0;
    }).catch(() => {});
  });
}, { once: true });

// Fade helpers
function fadeOutAndStop(audio, duration, callback) {
  const step = audio.volume / (duration / 50);
  const fade = setInterval(() => {
    audio.volume = Math.max(0, audio.volume - step);
    if (audio.volume <= 0.01) {
      clearInterval(fade);
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0;
      if (callback) callback();
    }
  }, 50);
}

function fadeIn(audio, targetVolume, duration) {
  audio.volume = 0;
  const step = targetVolume / (duration / 50);
  const fade = setInterval(() => {
    audio.volume = Math.min(targetVolume, audio.volume + step);
    if (audio.volume >= targetVolume) {
      clearInterval(fade);
    }
  }, 50);
}

// Track control functions
function playMainTrack() {
  fadeOutAndStop(secretAudio, 1000, () => {
    mainAudio.currentTime = 0;
    mainAudio.loop = true;
    mainAudio.play().catch(err => console.warn('Main track failed:', err));
    fadeIn(mainAudio, 1, 1000);
  });
}

function playSecretTrack(filePath) {
  fadeOutAndStop(mainAudio, 1000, () => {
    secretAudio.src = filePath;
    secretAudio.loop = false;
    secretAudio.currentTime = 0;
    secretAudio.play().catch(err => console.warn('Secret track failed:', err));
    fadeIn(secretAudio, 1, 1000);
  });
}

// Secret codes (Shift + key sequence)
const secretCodes = {
  ba: ['b', 'a'],
  z: ['z'],
  fx: ['f', 'x'], // Hidden track
  neon: ['n'],
  ghost: ['g'],
  storm: ['s'],
  matrix: ['m'],
  year1994: ['1','9','9','4'],
  overload: ['o'],
  echo: ['e'],
  lucid: ['l'],
  burst: ['b','u','r','s','t'],
  oracle: ['r'],
  phantom: ['p'] // Main track + Phantom theme
};

let inputBuffer = [];

window.addEventListener('keydown', (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (!e.shiftKey) return;

  inputBuffer.push(key);
  if (inputBuffer.length > 10) inputBuffer.shift();

  for (const [codeName, sequence] of Object.entries(secretCodes)) {
    const recent = inputBuffer.slice(-sequence.length).join('');
    if (recent === sequence.join('')) {
      triggerSecret(codeName);
      inputBuffer = [];
      break;
    }
  }
});

function triggerSecret(codeName) {
  switch (codeName) {
    case 'ba':
      document.body.classList.add('glitch');
      hudAlert.textContent = 'GLITCH BURST';
      setTimeout(() => document.body.classList.remove('glitch'), 1000);
      break;

    case 'z':
      hudAlert.textContent = 'MERCH MODULE ACTIVATED';
      break;

    case 'fx': // Hidden track
      playSecretTrack('./assets/hidden-track.mp3');
      burstBonus = 1.5;
      hudAlert.textContent = 'HIDDEN FREQUENCY UNLOCKED';
      break;

    case 'neon':
      switchTheme('theme-neon', 'Neon');
      break;

    case 'ghost':
      switchTheme('theme-ghost', 'Ghost');
      break;

    case 'storm':
      stormMode = !stormMode;
      hudAlert.textContent = stormMode ? 'STORM MODE: ON' : 'STORM MODE: OFF';
      break;

    case 'matrix':
      switchTheme('theme-matrix', 'Matrix');
      break;

    case 'year1994':
      hudAlert.textContent = 'SYSTEM TIMEWARP: 1994';
      document.body.classList.add('glitch');
      setTimeout(() => document.body.classList.remove('glitch'), 1500);
      break;

    case 'overload':
      for (let i = 0; i < 100; i++) {
        const glyph = String.fromCharCode(0x30A0 + Math.random() * 96);
        hudGlyphs.textContent += glyph;
      }
      hudAlert.textContent = 'SYSTEM OVERLOAD';
      break;

    case 'echo':
      for (let i = 0; i < 50; i++) {
        const span = document.createElement('span');
        span.className = 'matrix-trail';
        span.textContent = String.fromCharCode(0x30A0 + Math.random() * 96);
        span.style.left = `${Math.random() * innerWidth}px`;
        span.style.top = `${Math.random() * innerHeight}px`;
        trailContainer.appendChild(span);
        setTimeout(() => span.remove(), 600);
      }
      hudAlert.textContent = 'ECHO STORM INITIATED';
      break;

    case 'lucid':
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('revealed'));
      hudAlert.textContent = 'SIMULATION REVEALED';
      break;

    case 'burst':
      burstBonus = 2.0;
      hudAlert.textContent = 'RAIN BURST ENGAGED';
      break;

    case 'oracle':
      const prophecies = [
        'THE ONE IS COMING',
        'GLITCHES ARE NOT BUGS',
        'THE SYSTEM IS WATCHING',
        'WAKE UP, KYLE',
        'YOU ARE THE CODE'
      ];
      hudAlert.textContent = prophecies[Math.floor(Math.random() * prophecies.length)];
      break;

    case 'phantom': // Main track + Phantom theme
      switchTheme('theme-phantom', 'Phantom');
      playMainTrack();
      hudAlert.textContent = 'PHANTOM MODE ENGAGED';
      break;

    default:
      hudAlert.textContent = `CODE "${codeName}" TRIGGERED`;
  }

  setTimeout(() => hudAlert.textContent = '', 2000);
}

function switchTheme(themeClass, themeName) {
  document.body.classList.remove('theme-matrix','theme-glitch','theme-ghost','theme-neon','theme-phantom');
  document.body.classList.add(themeClass);
  hudTheme.textContent = themeName;
  updateRainColor();
  hudAlert.textContent = `${themeName.toUpperCase()} MODE ACTIVATED`;
}
/* Storm mode: random rain surges + glitch flashes */
setInterval(() => {
  if (!stormMode) return;
  burstBonus = Math.random() > 0.5 ? 1.2 : 0.0;
  document.body.classList.add('glitch');
  setTimeout(()=>document.body.classList.remove('glitch'), 120);
}, 900);

/* ===========================
   INIT
=========================== */
/* ===========================
   ADAPTIVE PERFORMANCE GOVERNOR
=========================== */
let fps = 60;
let lastFrameTime = performance.now();
let perfLevel = 1; // 1 = full, 0.5 = reduced

function fpsLoop(now) {
  const delta = now - lastFrameTime;
  lastFrameTime = now;
  const currentFps = 1000 / delta;
  fps = fps * 0.9 + currentFps * 0.1; // smooth average

  // Scale down if FPS too low
  if (fps < 50 && perfLevel > 0.5) {
    perfLevel = 0.5;
    adjustPerformance(perfLevel);
  }
  // Scale up if FPS high
  else if (fps > 58 && perfLevel < 1) {
    perfLevel = 1;
    adjustPerformance(perfLevel);
  }

  requestAnimationFrame(fpsLoop);
}
requestAnimationFrame(fpsLoop);

function adjustPerformance(level) {
  console.log(`Adjusting performance to ${level * 100}% visuals`);

  // Adjust rain density
  const cols = Math.floor((innerWidth / fontSize) * level);
  layerBack  = makeDrops(0.5, 0.35);
  layerMid   = makeDrops(1.0, 0.55);
  layerFront = makeDrops(1.6, 0.85);
  layerBack.y.length = cols;
  layerMid.y.length = cols;
  layerFront.y.length = cols;

  // Adjust particle count
  const newCount = Math.floor(PARTICLES * level);
  particles.length = newCount;

  // Adjust storm mode intensity
  if (stormMode) {
    burstBonus = level < 1 ? 0.4 : 0.8;
  }
}
updateRainColor();