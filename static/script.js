
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ==========================================
// 01. НАСТРОЙКИ И ЭЛЕМЕНТЫ
// ==========================================

const mount = document.querySelector('#scene');
const stories = [...document.querySelectorAll('.story')];
const dots = [...document.querySelectorAll('.side-index button')];
const steps = [...document.querySelectorAll('.scroll-step')];

const progressBar = document.querySelector('#progressBar');
const chapterNumber = document.querySelector('#currentChapter');

const reduceMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

const clamp = (v, min, max) =>
  Math.min(max, Math.max(min, v));

const mix = (a, b, t) =>
  a + (b - a) * t;

const smooth = t => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};

// ==========================================
// 02. ПЯТЬ ГЛАВ
// ==========================================

const shots = [
  // 01 — Пробуждение
  {
    cam: [0, 0.45, 6.8],
    target: [0, 0.2, 0],
    rot: 0,
    open: 0,
    light: 0.3,
    core: 0.18,
    embers: 0,
    frameX: 0,
    zoom: 1
  },

  // 02 — Шёпот
  {
    cam: [4.7, 1.15, 5.35],
    target: [0, 0.2, 0],
    rot: 0.42,
    open: 0,
    light: 0.45,
    core: 0.36,
    embers: 0.4,
    frameX: 2.3,
    zoom: 1.08
  },

  // 03 — Трещина
  {
    cam: [1.2, 5.4, 4.9],
    target: [0, 0.25, 0],
    rot: 0.86,
    open: 0.055,
    light: 0.75,
    core: 0.68,
    embers: 0.65,
    frameX: 0,
    zoom: 1
  },

  // 04 — Освобождение
  {
    cam: [-4.7, 1.6, 5.45],
    target: [0, 0.3, 0],
    rot: 1.15,
    open: 0.66,
    light: 1.35,
    core: 1.15,
    embers: 0.95,
    frameX: 2.65,
    zoom: 1.24
  },

  // 05 — Сердце октября
  {
    cam: [0.18, 1.05, 6.2],
    target: [0, 0.55, 0],
    rot: 0.22,
    open: 1,
    light: 1.95,
    core: 1.75,
    embers: 1,
    frameX: 0,
    zoom: 1
  }
];

// ==========================================
// 03. ПРОКРУТКА И НАВИГАЦИЯ
// ==========================================

let scrollStage = 0;

function goToChapter(index) {
  const target = clamp(index, 0, shots.length - 1);

  window.scrollTo({
    top: steps[target]?.offsetTop ??
      target * window.innerHeight,

    behavior: reduceMotion ? 'auto' : 'smooth'
  });
}

document.querySelectorAll('[data-next]').forEach(button => {
  button.addEventListener('click', () => {
    goToChapter(Number(button.dataset.next));
  });
});

function updateScroll() {
  const max = Math.max(
    1,
    document.documentElement.scrollHeight -
      window.innerHeight
  );

  scrollStage = clamp(
    window.scrollY / max * (shots.length - 1),
    0,
    shots.length - 1
  );

  const active = Math.round(scrollStage);

  if (chapterNumber) {
    chapterNumber.textContent =
      String(active + 1).padStart(2, '0');
  }

  if (progressBar) {
    progressBar.style.width =
      `${100 * scrollStage / (shots.length - 1)}%`;
  }

  stories.forEach((story, i) => {
    const opacity =
      1 - smooth(Math.abs(scrollStage - i) / 0.78);

    story.classList.toggle('is-active', i === active);

    story.style.opacity = opacity;

    story.style.visibility =
      opacity > 0.01 ? 'visible' : 'hidden';

    story.style.transform = `translate3d(
      0,
      ${(i - scrollStage) * 30}px,
      0
    )`;

    story.setAttribute(
      'aria-hidden',
      String(i !== active)
    );

    story.querySelectorAll('button').forEach(button => {
      button.disabled = i !== active;
    });
  });

  dots.forEach((dot, i) => {
    dot.classList.toggle('selected', i === active);
  });
}

window.addEventListener('scroll', updateScroll, {
  passive: true
});

window.addEventListener('resize', updateScroll);

updateScroll();

// Одно движение колеса — одна глава

let wheelLocked = false;
let wheelSum = 0;

window.addEventListener('wheel', event => {
  if (
    event.ctrlKey ||
    !window.matchMedia('(pointer: fine)').matches
  ) return;

  if (event.target.closest(
    'input, textarea, select, [contenteditable="true"]'
  )) return;

  const textBox = event.target.closest('.story .copy');

  if (
    textBox &&
    textBox.scrollHeight > textBox.clientHeight + 2
  ) {
    const atTop = textBox.scrollTop <= 0;
    const atBottom =
      textBox.scrollTop + textBox.clientHeight >=
      textBox.scrollHeight - 2;

    if (
      (event.deltaY < 0 && !atTop) ||
      (event.deltaY > 0 && !atBottom)
    ) return;
  }

  event.preventDefault();

  if (wheelLocked) return;

  wheelSum += event.deltaY;

  if (Math.abs(wheelSum) < 28) return;

  const direction = Math.sign(wheelSum);

  wheelSum = 0;
  wheelLocked = true;

  goToChapter(
    Math.round(scrollStage) + direction
  );

  window.setTimeout(() => {
    wheelLocked = false;
  }, 850);

}, { passive: false });

// ==========================================
// 04. THREE.JS — СЦЕНА
// ==========================================

let renderer;

try {
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
} catch (error) {
  if (mount) {
    mount.textContent =
      'Не удалось запустить WebGL. Включи аппаратное ускорение в браузере.';
  }

  throw error;
}

renderer.setPixelRatio(
  Math.min(
    window.devicePixelRatio,
    window.innerWidth <= 800 ? 1.4 : 1.8
  )
);

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping =
  THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.22;

mount.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const world = new THREE.Group();
scene.add(world);

const camera = new THREE.PerspectiveCamera(
  39,
  window.innerWidth / window.innerHeight,
  0.1,
  80
);

const lookAt = new THREE.Vector3();

// Отражения

const pmrem = new THREE.PMREMGenerator(renderer);

const env = pmrem.fromScene(
  new RoomEnvironment(),
  0.045
);

scene.environment = env.texture;

pmrem.dispose();

// ==========================================
// 05. ОСВЕЩЕНИЕ
// ==========================================

scene.add(
  new THREE.AmbientLight(0xffdfc5, 0.68)
);

const keyLight = new THREE.PointLight(
  0xffc58b,
  115,
  20
);

keyLight.position.set(-3, 5, 5);
scene.add(keyLight);

const rimLight = new THREE.PointLight(
  0xff632c,
  95,
  20
);

rimLight.position.set(4, 1, -4);
scene.add(rimLight);

const violetLight = new THREE.PointLight(
  0x7563ef,
  32,
  18
);

violetLight.position.set(-5, 0, -3);
scene.add(violetLight);

const insideLight = new THREE.PointLight(
  0xff750f,
  1,
  8
);

world.add(insideLight);

// ==========================================
// 06. РЕАЛИСТИЧНАЯ ТЕКСТУРА КОЖУРЫ
// ==========================================

function skinTextures() {
  const w = 384;
  const h = 512;

  const colorCanvas =
    document.createElement('canvas');

  const reliefCanvas =
    document.createElement('canvas');

  colorCanvas.width = reliefCanvas.width = w;
  colorCanvas.height = reliefCanvas.height = h;

  const colorCtx = colorCanvas.getContext('2d');
  const reliefCtx = reliefCanvas.getContext('2d');

  const colors = colorCtx.createImageData(w, h);
  const relief = reliefCtx.createImageData(w, h);

  const byte = value =>
    Math.max(0, Math.min(255, Math.round(value)));

  function hash(x, y) {
    let n =
      Math.imul(x, 374761393) +
      Math.imul(y, 668265263);

    n = Math.imul(
      n ^ (n >>> 13),
      1274126177
    );

    return (
      (n ^ (n >>> 16)) >>> 0
    ) / 4294967295;
  }

  function noise(x, y) {
    const a = Math.floor(x);
    const b = Math.floor(y);

    const u = x - a;
    const v = y - b;

    const sx = u * u * (3 - 2 * u);
    const sy = v * v * (3 - 2 * v);

    return mix(
      mix(hash(a, b), hash(a + 1, b), sx),
      mix(hash(a, b + 1), hash(a + 1, b + 1), sx),
      sy
    );
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);
      const v = y / (h - 1);

      const large = noise(u * 9, v * 7) - 0.5;
      const medium = noise(u * 43, v * 19) - 0.5;
      const pores = noise(u * 135, v * 180) - 0.5;

      const streak =
        Math.sin(u * 42 + large * 3 + v * 5) * 4;

      const tint =
        large * 39 +
        medium * 17 +
        pores * 11 +
        streak;

      const k = (y * w + x) * 4;

      colors.data[k] = byte(217 + tint);

      colors.data[k + 1] =
        byte(96 + tint * 0.62);

      colors.data[k + 2] =
        byte(34 + tint * 0.31);

      colors.data[k + 3] = 255;

      const bump = byte(
        135 +
        large * 40 +
        medium * 52 +
        pores * 54 +
        streak * 2
      );

      relief.data[k] = bump;
      relief.data[k + 1] = bump;
      relief.data[k + 2] = bump;
      relief.data[k + 3] = 255;
    }
  }

  colorCtx.putImageData(colors, 0, 0);
  reliefCtx.putImageData(relief, 0, 0);

  const map = new THREE.CanvasTexture(colorCanvas);

  map.colorSpace = THREE.SRGBColorSpace;

  map.anisotropy = Math.min(
    renderer.capabilities.getMaxAnisotropy(),
    4
  );

  const bumpMap = new THREE.CanvasTexture(
    reliefCanvas
  );

  return { map, bumpMap };
}

const {
  map: skinMap,
  bumpMap: skinBump
} = skinTextures();

// ==========================================
// 07. МАТЕРИАЛЫ
// ==========================================

// Натуральная кожура

const skin = new THREE.MeshPhysicalMaterial({
  map: skinMap,
  bumpMap: skinBump,
  bumpScale: 0.032,

  color: 0xffffff,

  metalness: 0.02,
  roughness: 0.53,

  clearcoat: 0.24,
  clearcoatRoughness: 0.42,

  emissive: 0x692707,
  emissiveIntensity: 0.045,

  side: THREE.DoubleSide
});

// Влажная мякоть

const flesh = new THREE.MeshPhysicalMaterial({
  color: 0xffb36a,

  metalness: 0,
  roughness: 0.46,

  clearcoat: 0.8,
  clearcoatRoughness: 0.1,

  side: THREE.DoubleSide
});

// Толстые края разлома

const cut = new THREE.MeshStandardMaterial({
  color: 0xd78239,
  roughness: 0.7,
  side: THREE.DoubleSide
});

// Золотые элементы подставки

const gold = new THREE.MeshStandardMaterial({
  color: 0x925020,
  roughness: 0.65,

  emissive: 0x5b1907,
  emissiveIntensity: 0.015
});

const chrome = new THREE.MeshPhysicalMaterial({
  color: 0xb6a4a0,
  metalness: 1,
  roughness: 0.16,
  clearcoat: 1
});

const darkMetal = new THREE.MeshPhysicalMaterial({
  color: 0x44302a,
  metalness: 0.95,
  roughness: 0.28
});

const stemMaterial = new THREE.MeshStandardMaterial({
  color: 0x525e37,
  roughness: 0.95
});

const leafMaterial = new THREE.MeshStandardMaterial({
  color: 0x404f31,
  roughness: 0.91,
  side: THREE.DoubleSide
});

const sparkMaterial = new THREE.MeshBasicMaterial({
  color: 0xff8a37,
  transparent: true,
  opacity: 0.8
});

// ==========================================
// 08. ГЕОМЕТРИЯ БОЛЬШОЙ ТЫКВЫ
// ==========================================

const LOBES = 12;

const pumpkin = new THREE.Group();
world.add(pumpkin);

const petals = [];

function surfacePoint(phi, theta) {
  const s = Math.sin(phi);
  const c = Math.cos(phi);

  const rib =
    0.94 +
    0.13 * Math.pow(
      (1 + Math.cos(LOBES * theta)) / 2,
      0.68
    );

  const irregular =
    1 +
    0.013 * Math.sin(
      8 * phi + 2.1 * Math.sin(theta * 3)
    ) +
    0.008 * Math.sin(
      21 * phi + 5 * theta
    );

  const radius =
    1.43 *
    Math.pow(Math.max(0, s), 0.76) *
    rib *
    irregular;

  const y =
    1.17 * c -
    0.22 * Math.sign(c) *
    Math.pow(1 - s, 4) +
    0.015 * Math.sin(6 * theta) * s;

  return new THREE.Vector3(
    radius * Math.cos(theta),
    y,
    radius * Math.sin(theta)
  );
}

// ==========================================
// 09. ТОЛСТЫЕ ДОЛЬКИ
// ==========================================

function lobeGeometry(index) {
  const rows = 64;
  const cols = 18;

  const stride = cols + 1;
  const count = (rows + 1) * stride;

  const center = index * Math.PI * 2 / LOBES;

  const base = [];
  const pos = [];
  const uv = [];
  const faces = [];

  for (let i = 0; i <= rows; i++) {
    const phi =
      0.018 +
      (Math.PI - 0.036) * i / rows;

    for (let j = 0; j <= cols; j++) {
      const theta =
        center +
        (j / cols - 0.5) *
        Math.PI * 2 / LOBES;

      base.push(surfacePoint(phi, theta));
    }
  }

  // Внешняя кожура и внутренняя мякоть

  for (const inner of [false, true]) {
    for (let i = 0; i <= rows; i++) {
      for (let j = 0; j <= cols; j++) {
        const p = base[i * stride + j].clone();

        if (inner) {
          const normal = new THREE.Vector3(
            p.x,
            p.y * 0.65,
            p.z
          ).normalize();

          p.addScaledVector(normal, -0.10);
        }

        pos.push(
          p.x,
          p.y + 1.05,
          p.z
        );

        uv.push(j / cols, i / rows);
      }
    }
  }

  // Внешняя поверхность

  const outerStart = faces.length;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * stride + j;
      const b = a + stride;

      faces.push(
        a, a + 1, b,
        a + 1, b + 1, b
      );
    }
  }

  const outerCount = faces.length - outerStart;

  // Внутренняя поверхность

  const innerStart = faces.length;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = count + i * stride + j;
      const b = a + stride;

      faces.push(
        a, b, a + 1,
        a + 1, b, b + 1
      );
    }
  }

  const innerCount = faces.length - innerStart;

  // Торцевые срезы

  const rimStart = faces.length;

  function side(a, b) {
    faces.push(
      a, b, a + count,
      b, b + count, a + count
    );
  }

  for (let i = 0; i < rows; i++) {
    side(
      i * stride,
      (i + 1) * stride
    );

    side(
      i * stride + cols,
      (i + 1) * stride + cols
    );
  }

  for (let j = 0; j < cols; j++) {
    side(j, j + 1);

    side(
      rows * stride + j,
      rows * stride + j + 1
    );
  }

  const geo = new THREE.BufferGeometry();

  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(pos, 3)
  );

  geo.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(uv, 2)
  );

  geo.setIndex(faces);

  geo.addGroup(outerStart, outerCount, 0);
  geo.addGroup(innerStart, innerCount, 1);

  geo.addGroup(
    rimStart,
    faces.length - rimStart,
    2
  );

  geo.computeVertexNormals();

  return geo;
}

// Создаём 12 независимых долек

for (let i = 0; i < LOBES; i++) {
  const angle = i * Math.PI * 2 / LOBES;

  const petal = new THREE.Group();
  petal.position.y = -1.05;

  petal.add(
    new THREE.Mesh(
      lobeGeometry(i),
      [skin, flesh, cut]
    )
  );

  pumpkin.add(petal);

  petals.push({
    group: petal,
    angle,

    axis: new THREE.Vector3(
      Math.sin(angle),
      0,
      -Math.cos(angle)
    )
  });
}

// ==========================================
// 10. НАТУРАЛЬНЫЙ ЧЕРЕНОК
// ==========================================

const stem = new THREE.Group();
pumpkin.add(stem);

function stemGeometry() {
  const rows = 30;
  const sides = 20;

  const points = [];
  const indices = [];

  for (let i = 0; i <= rows; i++) {
    const t = i / rows;

    
    const x = 0.025 * t + 0.16 * t * t;
    const y = 0.90 + 0.46 * t;

    const z = 0.035 * Math.sin(t * Math.PI);

    const r =
    (0.14 * (1 - t) + 0.048 * t) *
    (1 + 0.08 * Math.sin(14 * t));


    for (let j = 0; j <= sides; j++) {
      const a = j / sides * Math.PI * 2;

      const groove =
        1 + 0.09 * Math.cos(7 * a + t * 3);

      points.push(
        x + Math.cos(a) * r * groove,
        y,
        z + Math.sin(a) * r * groove
      );
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j;
      const b = a + sides + 1;

      indices.push(
        a, b, a + 1,
        a + 1, b, b + 1
      );
    }
  }

  const geo = new THREE.BufferGeometry();

  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(points, 3)
  );

  geo.setIndex(indices);
  geo.computeVertexNormals();

  return geo;
}

stem.add(
  new THREE.Mesh(
    stemGeometry(),
    stemMaterial
  )
);

// ==========================================
// 11. ЧАШЕЛИСТИКИ
// ==========================================

for (let k = 0; k < 5; k++) {
  const a = k * Math.PI * 2 / 5;

  const points = [];
  const faces = [];

  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    
    const r = 0.11 + t * 0.38;

    const width =
    0.105 * Math.pow(
        Math.sin(Math.PI * t),
        0.7
    );

    const y =
    0.91 +
    0.07 * Math.sin(Math.PI * t) -
    0.05 * t;


    for (const side of [-1, 1]) {
      points.push(
        Math.cos(a) * r +
          Math.cos(a + Math.PI / 2) *
          width * side,

        y + (side === 1 ? 0.012 : 0),

        Math.sin(a) * r +
          Math.sin(a + Math.PI / 2) *
          width * side
      );
    }
  }

  for (let i = 0; i < 16; i++) {
    const j = i * 2;

    faces.push(
      j, j + 2, j + 1,
      j + 1, j + 2, j + 3
    );
  }

  const geo = new THREE.BufferGeometry();

  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(points, 3)
  );

  geo.setIndex(faces);
  geo.computeVertexNormals();

  stem.add(
    new THREE.Mesh(geo, leafMaterial)
  );
}

// ==========================================
// 12. СВЕТЯЩЕЕСЯ СЕРДЦЕ
// ==========================================

const coreGroup = new THREE.Group();
pumpkin.add(coreGroup);

const coreMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffca79,

  emissive: 0xff6200,
  emissiveIntensity: 2.25,

  metalness: 0.2,
  roughness: 0.18,
  clearcoat: 1,

  transparent: true,
  opacity: 0,

  depthWrite: false
});

const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.65, 4),
  coreMaterial
);

core.scale.y = 1.24;
coreGroup.add(core);

const coreWire = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.75, 1),

  new THREE.MeshBasicMaterial({
    color: 0xffb067,
    wireframe: true,

    transparent: true,
    opacity: 0,

    depthWrite: false
  })
);

coreGroup.add(coreWire);

// Искры внутри

const sparks = [];

for (let i = 0; i < 20; i++) {
  const a = i * 2.39996;

  const y =
    -0.65 + i / 20 * 1.3;

  const rad =
    0.8 + 0.2 * Math.sin(i * 3.2);

  const spark = new THREE.Mesh(
    new THREE.IcosahedronGeometry(
      0.035 + i % 3 * 0.013,
      0
    ),
    sparkMaterial
  );

  spark.position.set(
    Math.cos(a) * rad,
    y,
    Math.sin(a) * rad
  );

  coreGroup.add(spark);
  sparks.push(spark);
}

// ==========================================
// 13. ПОДСТАВКА
// ==========================================

const platform = new THREE.Group();

platform.position.y = -1.57;
world.add(platform);

platform.add(
  new THREE.Mesh(
    new THREE.CylinderGeometry(
      1.83, 1.89, 0.16, 96
    ),
    darkMetal
  )
);

for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(
      1.72 + i * 0.14,
      0.013,
      8,
      150
    ),

    i === 1 ? gold : chrome
  );

  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.10 + i * 0.016;

  platform.add(ring);
}

const halo = new THREE.Mesh(
  new THREE.TorusGeometry(
    2.37, 0.012, 8, 144
  ),

  new THREE.MeshBasicMaterial({
    color: 0xf17e42,
    transparent: true,
    opacity: 0.45
  })
);

halo.rotation.x = Math.PI / 2;
halo.position.y = -0.17;

platform.add(halo);

// ==========================================
// 14. МИНИ-ТЫКВЫ ВМЕСТО СФЕР
// ==========================================

const miniPumpkins = [];

function createMiniPumpkin(size) {
  const group = new THREE.Group();

  const geo = new THREE.SphereGeometry(
    1, 48, 32
  );

  const p = geo.attributes.position;

  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);

    const a = Math.atan2(z, x);

    const rib =
      0.94 + 0.09 * Math.cos(a * 10);

    const organic =
      1 + 0.018 * Math.sin(6 * y + 3 * a);

    p.setXYZ(
      i,
      x * rib * organic,

      y * 0.78 -
        Math.sign(y) *
        0.08 * Math.pow(Math.abs(y), 6),

      z * rib * organic
    );
  }

  geo.computeVertexNormals();

  const body = new THREE.Mesh(
    geo,
    skin
  );

  group.add(body);

  // Маленький изогнутый черенок

  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.63, 0),
    new THREE.Vector3(0.02, 0.80, 0),
    new THREE.Vector3(0.09, 0.99, 0.01),
    new THREE.Vector3(0.21, 1.03, 0.02)
  ]);

  group.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(
        stemCurve,
        16,
        0.095,
        8,
        false
      ),
      stemMaterial
    )
  );

  // Листочки

  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;

    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 12, 8),
      leafMaterial
    );

    leaf.scale.set(1.7, 0.16, 0.75);

    leaf.position.set(
      Math.cos(a) * 0.19,
      0.67,
      Math.sin(a) * 0.19
    );

    leaf.rotation.y = a;
    group.add(leaf);
  }

  group.scale.setScalar(size);

  return group;
}

const miniPositions = [
  {
    x: -2.9,
    y: 1.3,
    z: -0.8,
    size: 0.37,
    phase: 0
  },
  {
    x: 3,
    y: 0.75,
    z: -0.7,
    size: 0.34,
    phase: 2.2
  },
  {
    x: -2.4,
    y: -0.9,
    z: 0.7,
    size: 0.27,
    phase: 4.5
  }
];

miniPositions.forEach(config => {
  const group = createMiniPumpkin(config.size);

  group.position.set(
    config.x,
    config.y,
    config.z
  );

  world.add(group);

  miniPumpkins.push({
    group,
    ...config
  });
});

// ==========================================
// 15. ИСКРЫ ВОКРУГ ТЫКВЫ
// ==========================================

const dustPositions = [];

for (let i = 0; i < 160; i++) {
  dustPositions.push(
    (Math.random() - 0.5) * 13,
    (Math.random() - 0.5) * 9,
    (Math.random() - 0.5) * 9
  );
}

const dustGeometry = new THREE.BufferGeometry();

dustGeometry.setAttribute(
  'position',
  new THREE.Float32BufferAttribute(
    dustPositions,
    3
  )
);

const dustMaterial = new THREE.PointsMaterial({
  color: 0xf4a66d,

  size: 0.033,

  transparent: true,
  opacity: 0,

  depthWrite: false
});

const dust = new THREE.Points(
  dustGeometry,
  dustMaterial
);

scene.add(dust);


/* ==========================================
   16–19. ВЯЗКИЙ СОК И ВЛАЖНАЯ МЯКОТЬ
========================================== */

// Влажные участки внутри тыквы
const wetMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xc96a21,
  roughness: 0.17,
  metalness: 0,

  clearcoat: 1,
  clearcoatRoughness: 0.04,

  transparent: true,
  opacity: 0,
  depthWrite: false,
  side: THREE.DoubleSide
});

// Тонкие нити сока
const filamentMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xe89a42,
  roughness: 0.12,
  metalness: 0,

  clearcoat: 1,

  transparent: true,
  opacity: 0,
  depthWrite: false
});

// Точка на влажной внутренней поверхности
function wetPoint(phi, theta) {
  const p = surfacePoint(phi, theta);

  const normal = new THREE.Vector3(
    p.x,
    p.y * 0.65,
    p.z
  ).normalize();

  // Кожура имеет внутренний слой толщиной 0.10.
  // Смещаем сок ещё немного к центру.
  p.addScaledVector(normal, -0.113);

  // Локальная система координат дольки
  p.y += 1.05;

  return p;
}

// ==========================================
// ВЛАЖНЫЕ ПОЛОСКИ НА МЯКОТИ
// ==========================================

const wetStrips = [];

[0, 2, 4, 6, 8, 10].forEach(index => {
  const petal = petals[index];
  const angle = petal.angle;

  for (let strip = 0; strip < 2; strip++) {
    const vertices = [];
    const indices = [];

    const segments = 32;

    for (let j = 0; j <= segments; j++) {
      const t = j / segments;

      const phi = 0.45 + t * 2.1;

      const offset =
        (strip === 0 ? -0.085 : 0.085) +
        0.012 * Math.sin(t * 11 + index);

      // Неровная ширина потёка
      const width =
        (0.008 + 0.018 * Math.sin(Math.PI * t) ** 2) *
        Math.sin(Math.PI * t);

      const left = wetPoint(
        phi,
        angle + offset - width
      );

      const right = wetPoint(
        phi,
        angle + offset + width
      );

      vertices.push(
        left.x, left.y, left.z,
        right.x, right.y, right.z
      );

      if (j < segments) {
        const a = j * 2;

        indices.push(
          a, a + 2, a + 1,
          a + 1, a + 2, a + 3
        );
      }
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(
      geometry,
      wetMaterial
    );

    mesh.renderOrder = 3;
    petal.group.add(mesh);

    wetStrips.push(mesh);
  }
});

// ==========================================
// ТЯНУЩИЕСЯ НИТИ МЕЖДУ ДОЛЬКАМИ
// ==========================================

const juiceFilaments = [];
const vertical = new THREE.Vector3(0, 1, 0);

// Не перегружаем сцену: пять нитей
[0, 2, 4, 7, 9].forEach((index, n) => {
  const nextIndex = (index + 1) % LOBES;

  const boundary =
    (index + 0.5) * Math.PI * 2 / LOBES;

  const phi = 1.12 + (n % 3) * 0.25;

  const anchorA = wetPoint(
    phi,
    boundary - 0.025
  );

  const anchorB = wetPoint(
    phi,
    boundary + 0.025
  );

  // Четыре коротких сегмента создают
  // одну слегка изогнутую нить.
  const segments = [];

  for (let j = 0; j < 4; j++) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 1, 6),
      filamentMaterial
    );

    mesh.visible = false;
    world.add(mesh);

    segments.push(mesh);
  }

  juiceFilaments.push({
    groupA: petals[index].group,
    groupB: petals[nextIndex].group,
    anchorA,
    anchorB,
    segments
  });
});


// ==========================================
// 20. АДАПТИВНАЯ КАМЕРА
// ==========================================

function cameraLayout(shot) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  const phone = w <= 800;
  const tablet = w > 800 && w <= 1100;

  const shortLandscape =
    h < 540 && w > h;

  const baseZoom = phone
    ? 1.84
    : tablet
      ? 1.2
      : 1;

  const cameraPoint = new THREE.Vector3(
    ...shot.cam
  ).multiplyScalar(
    baseZoom * (phone ? 1 : shot.zoom)
  );

  const focus = new THREE.Vector3(
    ...shot.target
  );

  // На телефоне тыква располагается
  // над текстом

  if (phone && !shortLandscape) {
    focus.y -= h < 720 ? 1.24 : 1.35;
  }

  if (shortLandscape) {
    cameraPoint.multiplyScalar(1.16);

    focus.x +=
      shot.cam[0] >= 0 ? -0.75 : 0.75;
  }

  // На больших экранах сдвигаем 3D-композицию,
  // освобождая пространство для текста

  const strength = phone
    ? 0
    : Math.min(1, w / 1600);

  const forward = new THREE.Vector3()
    .subVectors(focus, cameraPoint)
    .normalize();

  const right = new THREE.Vector3()
    .crossVectors(
      forward,
      new THREE.Vector3(0, 1, 0)
    )
    .normalize();

  const offset =
    shot.frameX * strength;

  cameraPoint.addScaledVector(
    right,
    offset
  );

  focus.addScaledVector(
    right,
    offset
  );

  return { cameraPoint, focus };
}

// ==========================================
// 21. ПЛАВНАЯ СМЕНА СЦЕН
// ==========================================

function valuesAt(position) {
  const index = Math.min(
    shots.length - 2,
    Math.floor(position)
  );

  const amount = smooth(
    (position - index - 0.05) / 0.86
  );

  const a = shots[index];
  const b = shots[index + 1];

  return {
    cam: a.cam.map(
      (v, j) => mix(v, b.cam[j], amount)
    ),

    target: a.target.map(
      (v, j) => mix(v, b.target[j], amount)
    ),

    rot: mix(a.rot, b.rot, amount),
    open: mix(a.open, b.open, amount),
    light: mix(a.light, b.light, amount),
    core: mix(a.core, b.core, amount),
    embers: mix(a.embers, b.embers, amount),

    frameX: mix(
      a.frameX,
      b.frameX,
      amount
    ),

    zoom: mix(
      a.zoom,
      b.zoom,
      amount
    )
  };
}

// ==========================================
// 22. МЫШЬ И ИЗМЕНЕНИЕ ЭКРАНА
// ==========================================

let mouseX = 0;
let mouseY = 0;

window.addEventListener('pointermove', event => {
  mouseX =
    (event.clientX / window.innerWidth - 0.5) * 2;

  mouseY =
    (event.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });

window.addEventListener('resize', () => {
  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      window.innerWidth <= 800 ? 1.4 : 1.8
    )
  );

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  camera.aspect =
    window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();
});

// ==========================================
// 23. ГЛАВНЫЙ ЦИКЛ АНИМАЦИИ
// ==========================================

const clock = new THREE.Clock();

const desiredCamera = new THREE.Vector3();
const desiredFocus = new THREE.Vector3();

const tempQuat = new THREE.Quaternion();

let currentOpen = 0;
let currentLight = 0.3;
let currentCore = 0.18;
let currentEmbers = 0;

// Первое положение камеры

const start = cameraLayout(
  valuesAt(scrollStage)
);

camera.position.copy(start.cameraPoint);
lookAt.copy(start.focus);

camera.lookAt(lookAt);

function render() {
  requestAnimationFrame(render);

  const dt = Math.min(
    clock.getDelta(),
    0.05
  );

  const t = clock.elapsedTime;

  const follow = reduceMotion
    ? 1
    : 1 - Math.exp(-5.5 * dt);

  const shot = valuesAt(scrollStage);
  const frame = cameraLayout(shot);

  // ========================================
  // КАМЕРА
  // ========================================

  desiredCamera.copy(frame.cameraPoint);
  desiredFocus.copy(frame.focus);

  desiredFocus.x += mouseX * 0.045;
  desiredFocus.y -= mouseY * 0.025;

  camera.position.lerp(
    desiredCamera,
    follow
  );

  lookAt.lerp(
    desiredFocus,
    follow
  );

  camera.lookAt(lookAt);

  // ========================================
  // СОСТОЯНИЕ СЦЕНЫ
  // ========================================

  currentOpen = mix(
    currentOpen,
    shot.open,
    follow
  );

  currentLight = mix(
    currentLight,
    shot.light,
    follow
  );

  currentCore = mix(
    currentCore,
    shot.core,
    follow
  );

  currentEmbers = mix(
    currentEmbers,
    shot.embers,
    follow
  );

  // ========================================
  // ПЛАВНОЕ ВРАЩЕНИЕ ТЫКВЫ
  // ========================================

  pumpkin.rotation.y = mix(
    pumpkin.rotation.y,

    shot.rot +
      (reduceMotion
        ? 0
        : Math.sin(t * 0.28) * 0.05) +
      mouseX * 0.09,

    follow
  );

  pumpkin.rotation.x = mix(
    pumpkin.rotation.x,
    -mouseY * 0.035,
    follow
  );

  pumpkin.position.y = reduceMotion
    ? 0
    : Math.sin(t * 1.15) * 0.045;

  // ========================================
  // МЯГКОЕ РАСКРЫТИЕ ДОЛЕК
  // ========================================

  petals.forEach(({ group, angle, axis }) => {
    const angleOpen =
      currentOpen *
      (
        0.76 +
        0.025 * Math.sin(angle * 3)
      );

    tempQuat.setFromAxisAngle(
      axis,
      angleOpen
    );

    group.quaternion.slerp(
      tempQuat,
      follow
    );

    const spread =
      currentOpen * 0.32;

    group.position.set(
      Math.cos(angle) * spread,
      -1.05 + currentOpen * 0.055,
      Math.sin(angle) * spread
    );
  });

  // ========================================
  // ЧЕРЕНОК УМЕНЬШАЕТСЯ ПРИ РАСКРЫТИИ
  // ========================================

  stem.position.y =
    currentOpen * 0.18;

  stem.scale.setScalar(
    1 - currentOpen * 0.85
  );

  stem.rotation.z =
    -currentOpen * 0.15;

  // ========================================
  // СВЕТЯЩЕЕСЯ СЕРДЦЕ
  // ========================================

  coreMaterial.opacity = smooth(
    (currentOpen - 0.17) / 0.62
  );

  coreMaterial.emissiveIntensity =
    0.8 + currentCore * 1.95;

  coreWire.material.opacity =
    coreMaterial.opacity * 0.65;

  coreGroup.scale.setScalar(
    0.75 + currentOpen * 0.25
  );

  if (!reduceMotion) {
    coreGroup.rotation.y += dt * 0.22;
  }

  insideLight.intensity =
    currentLight * 34;

  gold.emissiveIntensity =
    0.015 + currentCore * 0.07;

  skin.emissiveIntensity =
    0.045 + currentLight * 0.03;

  // ========================================
  // ИСКРЫ
  // ========================================

  dustMaterial.opacity =
    currentEmbers * 0.65;

  dust.rotation.y = reduceMotion
    ? 0
    : t * 0.018;

  sparks.forEach((spark, i) => {
    spark.visible =
      currentOpen > 0.27 &&
      (
        i % 2 === 0 ||
        currentOpen > 0.55
      );
  });

  // ========================================
  // АНИМАЦИЯ МИНИ-ТЫКВ
  // ========================================

  miniPumpkins.forEach(({
    group,
    x,
    y,
    phase,
    size
  }) => {
    group.position.x =
      x +
      Math.cos(phase) *
      currentOpen * 0.15;

    group.position.y =
      y +
      (reduceMotion
        ? 0
        : Math.sin(t * 0.8 + phase) * 0.14);

    group.rotation.y =
      phase +
      (reduceMotion ? 0 : t * 0.16);

    group.rotation.z = reduceMotion
      ? 0
      : Math.sin(t * 0.5 + phase) * 0.11;

    group.scale.setScalar(
      size * (1 - currentOpen * 0.22)
    );
  });

  
/* ==========================================
   ВЛАЖНОЕ РАСКРЫТИЕ ТЫКВЫ
========================================== */

// Мякоть становится влажной при раскрытии
const wetReveal = smooth(
  (currentOpen - 0.10) / 0.43
);

wetMaterial.opacity = 0.72 * wetReveal;

// Нити возникают во время раскрытия,
// а при полном раскрытии разрываются.
const threadsReveal =
  smooth((currentOpen - 0.20) / 0.20) *
  (1 - smooth((currentOpen - 0.72) / 0.18));

filamentMaterial.opacity =
  0.78 * threadsReveal;

// Обновляем матрицы раскрытых долек
world.updateMatrixWorld(true);

juiceFilaments.forEach(item => {
  // Начало нити — на первой дольке
  const start = item.anchorA.clone();

  item.groupA.localToWorld(start);
  world.worldToLocal(start);

  // Конец нити — на соседней дольке
  const end = item.anchorB.clone();

  item.groupB.localToWorld(end);
  world.worldToLocal(end);

  const distance = start.distanceTo(end);

  // При сильном растяжении нить истончается
  const thinning = 1 - smooth(
    (distance - 0.30) / 0.55
  );

  const thickness =
    0.011 * Math.max(0.15, thinning);

  const visible = threadsReveal > 0.01 &&
    distance > 0.025 &&
    thinning > 0.02;

  // Вычисляем слегка провисшую кривую
  function pointAt(u) {
    const p = start.clone().lerp(end, u);

    const sag =
      Math.sin(Math.PI * u) *
      Math.min(0.075, distance * 0.13);

    p.y -= sag;

    return p;
  }

  item.segments.forEach((mesh, i) => {
    const a = pointAt(i / 4);
    const b = pointAt((i + 1) / 4);

    const direction = b.clone().sub(a);
    const length = direction.length();

    mesh.visible = visible;

    if (!visible || length < 0.0001) return;

    // Середина сегмента
    mesh.position.copy(a)
      .add(b)
      .multiplyScalar(0.5);

    // Поворачиваем по направлению нити
    mesh.quaternion.setFromUnitVectors(
      vertical,
      direction.normalize()
    );

    // Нить становится тоньше при растяжении
    mesh.scale.set(
      thickness,
      length,
      thickness
    );
  });
});


  // ========================================
  // ОТРИСОВКА
  // ========================================

  renderer.render(scene, camera);
}

// ==========================================
// 24. ЗАПУСК
// ==========================================

render();
