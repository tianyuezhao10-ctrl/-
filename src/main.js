import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import './style.css';

// Entry flow is isolated from the archive so it can be removed without touching
// the existing scene, event data, or interaction handlers.
const entryFlow = document.querySelector('.entry-flow');
const continueButton = document.querySelector('.entry-continue');
const cover = document.querySelector('.entry-cover');
const entryNumber = document.querySelector('#entry-number');
const entryInfinity = document.querySelector('#entry-infinity');
const entrySequence = [0, 1, 2, 5, 10, 20, 30, 40, 50];
entrySequence.forEach((value, index) => window.setTimeout(() => { if (entryNumber) entryNumber.textContent = String(value); }, index * 300));
window.setTimeout(() => { entryNumber?.classList.add('is-complete'); entryInfinity?.classList.add('is-visible'); }, entrySequence.length * 300);
const enterArchive = () => {
  entryFlow.dataset.entryState = 'archive';
  cover.setAttribute('aria-hidden', 'true');
  cover.setAttribute('inert', '');
  document.documentElement.classList.remove('entry-locked');
  window.setTimeout(() => startArchiveIntro(), 420);
  window.setTimeout(() => entryFlow.remove(), 850);
};
continueButton?.addEventListener('click', enterArchive);
window.setTimeout(() => {
  if (entryFlow?.dataset.entryState === 'loading') {
    entryFlow.dataset.entryState = 'cover';
    cover.removeAttribute('aria-hidden');
    cover.removeAttribute('inert');
  }
}, entrySequence.length * 300 + 120);

const canvas = document.querySelector('#space');
const markerLayer = document.querySelector('#markers');
const panel = document.querySelector('.event-panel');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x080808, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x080808, 0.0085);
const camera = new THREE.PerspectiveCamera(39, window.innerWidth / window.innerHeight, 0.1, 1200);
const homeView = () => window.innerWidth <= 720
  ? { position: new THREE.Vector3(0, 10, 78), target: new THREE.Vector3(6, 1, -1) }
  : { position: new THREE.Vector3(9, 13, 70), target: new THREE.Vector3(18, 0, -5) };
const initialView = homeView();
const introView = { position: new THREE.Vector3(0, 1.4, 17), target: new THREE.Vector3(0, 0, 0) };
camera.position.copy(introView.position);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.045;
controls.enablePan = false;
controls.minDistance = 13;
controls.maxDistance = 165;
controls.rotateSpeed = 0.34;
controls.zoomSpeed = 0.6;
controls.target.copy(introView.target);

scene.add(new THREE.HemisphereLight(0xd8d8d2, 0x160d0c, 0.48));
const key = new THREE.DirectionalLight(0xffffff, 3.25);
key.position.set(-10, 8, 16);
scene.add(key);
const rim = new THREE.DirectionalLight(0x6d1f1a, 2.3);
rim.position.set(24, -4, -22);
scene.add(rim);

function seeded(seed) {
  let value = seed;
  return () => ((value = (value * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function planetTexture(kind, size = 1024) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size / 2;
  const x = c.getContext('2d');
  x.fillStyle = kind === 'earth' ? '#070808' : kind === 'mars' ? '#411b18' : '#8f908d';
  x.fillRect(0, 0, c.width, c.height);
  const random = seeded(kind === 'earth' ? 1492 : kind === 'moon' ? 1957 : 2030);
  if (kind === 'earth') {
    const land = feature(world, world.objects.countries).features.flatMap(country =>
      country.geometry.type === 'Polygon'
        ? country.geometry.coordinates
        : country.geometry.coordinates.flat()
    );
    const project = ([lon, lat]) => [((lon + 180) / 360) * c.width, ((90 - lat) / 180) * c.height];
    const traceLand = () => {
      x.beginPath();
      land.forEach(polygon => {
        polygon.forEach((point, index) => {
          const [px, py] = project(point);
          index ? x.lineTo(px, py) : x.moveTo(px, py);
        });
        x.closePath();
      });
    };
    const drawTriangulation = (step, opacity) => {
      x.strokeStyle = `rgba(214,215,211,${opacity})`;
      x.lineWidth = .55;
      x.beginPath();
      for (let row = 0; row <= c.height / step; row++) {
        const py = row * step;
        const offset = row % 2 ? step / 2 : 0;
        for (let px = -step; px < c.width + step; px += step) {
          const ax = px + offset;
          x.moveTo(ax, py); x.lineTo(ax + step, py);
          x.moveTo(ax, py); x.lineTo(ax - step / 2, py + step);
          x.moveTo(ax, py); x.lineTo(ax + step / 2, py + step);
        }
      }
      x.stroke();
    };
    drawTriangulation(22, .075);
    traceLand(); x.fillStyle = '#141514'; x.fill();
    x.save();
    traceLand(); x.clip();
    drawTriangulation(22, .29);
    x.fillStyle = 'rgba(240,241,236,.37)';
    for (let py = 7; py < c.height; py += 17) {
      for (let px = 7; px < c.width; px += 17) {
        if (random() > .47) {
          x.beginPath(); x.arc(px + (random() - .5) * 7, py + (random() - .5) * 7, .45, 0, Math.PI * 2); x.fill();
        }
      }
    }
    x.restore();
    traceLand();
    x.strokeStyle = 'rgba(245,245,240,.86)'; x.lineWidth = 1.35; x.stroke();
    x.strokeStyle = 'rgba(248,248,244,.15)'; x.lineWidth = 3.8; x.stroke();
  } else {
    const craterCount = kind === 'moon' ? 420 : 230;
    for (let i = 0; i < craterCount; i++) {
      const px = random() * c.width;
      const py = random() * c.height;
      const r = 1.2 + Math.pow(random(), 2.25) * (kind === 'moon' ? 24 : 38);
      const alpha = .035 + random() * .12;
      x.fillStyle = kind === 'mars' ? `rgba(22,6,5,${alpha * .72})` : `rgba(36,37,35,${alpha})`;
      x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
      x.strokeStyle = kind === 'mars' ? `rgba(170,83,69,${alpha})` : `rgba(236,236,229,${alpha * .7})`;
      x.lineWidth = Math.max(.7, r * .08);
      x.beginPath(); x.arc(px - r * .08, py - r * .1, r * .9, 0, Math.PI * 2); x.stroke();
    }
    if (kind === 'mars') {
      x.strokeStyle = 'rgba(126,48,40,.28)'; x.lineWidth = 18;
      x.beginPath(); x.moveTo(0, c.height * .55); x.bezierCurveTo(c.width*.25,c.height*.42,c.width*.65,c.height*.72,c.width,c.height*.48); x.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makePlanet(name, radius, position, kind, roughness = .92) {
  const material = new THREE.MeshStandardMaterial({ map: planetTexture(kind), roughness, metalness: kind === 'moon' ? .08 : .02 });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), material);
  mesh.name = name;
  mesh.position.copy(position);
  scene.add(mesh);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.012, 64, 48), new THREE.MeshBasicMaterial({ color: kind === 'mars' ? 0x7c2b24 : 0xd9d9d4, transparent: true, opacity: .08, side: THREE.BackSide }));
  mesh.add(halo);
  return mesh;
}

const earth = makePlanet('Earth', 7.1, new THREE.Vector3(0, 0, 0), 'earth');
earth.rotation.z = -0.18;

// Replace only Earth's generated surface with the supplied OBJ/PBR asset.
// The existing Earth object remains in place so all event anchors and controls
// continue to reference the same transform and do not move.
function loadSuppliedEarthModel() {
  const textureLoader = new THREE.TextureLoader();
  const colorMap = textureLoader.load('/earth-model/texture_pbr_20250901.png');
  const normalMap = textureLoader.load('/earth-model/texture_pbr_20250901_normal.png');
  const roughnessMap = textureLoader.load('/earth-model/texture_pbr_20250901_roughness.png');
  [colorMap, normalMap, roughnessMap].forEach(texture => {
    texture.colorSpace = texture === colorMap ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  });
  const applyModel = object => {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const sourceRadius = Math.max(size.x, size.y, size.z) * .5 || 1;
    object.traverse(child => {
      if (!child.isMesh) return;
      child.geometry.translate(-center.x, -center.y, -center.z);
      child.geometry.scale(7.1 / sourceRadius, 7.1 / sourceRadius, 7.1 / sourceRadius);
      child.geometry.computeVertexNormals();
      child.material = new THREE.MeshStandardMaterial({
        map: colorMap, normalMap, roughnessMap, roughness: .78, metalness: .04
      });
      earth.geometry.dispose();
      earth.geometry = child.geometry;
      earth.material.dispose();
      earth.material = child.material;
    });
  };
  fetch('/earth-model/61f48422ae66e703ebe4eb80faa661d6.obj.gz')
    .then(response => {
      if (!response.ok) throw new Error(`Earth model request failed: ${response.status}`);
      return response.arrayBuffer();
    })
    .then(buffer => new Response(buffer).body.pipeThrough(new DecompressionStream('gzip')).pipeThrough(new TextDecoderStream()).getReader())
    .then(async reader => {
      let text = '', result;
      while (!(result = await reader.read()).done) text += result.value;
      applyModel(new OBJLoader().parse(text));
    })
    .catch(error => {
      console.warn('Compressed Earth model unavailable; trying original OBJ.', error);
      new OBJLoader().load('/earth-model/61f48422ae66e703ebe4eb80faa661d6.obj', applyModel, undefined,
        fallbackError => console.warn('Supplied Earth model unavailable; keeping generated Earth.', fallbackError));
    });
}
loadSuppliedEarthModel();
const moon = makePlanet('Moon', 1.94, new THREE.Vector3(18, 4.5, -3), 'moon');
function loadSuppliedMoonModel() {
  const applyModel = object => {
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const sourceRadius = Math.max(size.x, size.y, size.z) * .5 || 1;
      object.traverse(child => {
        if (!child.isMesh) return;
        child.geometry.translate(-center.x, -center.y, -center.z);
        child.geometry.scale(1.94 / sourceRadius, 1.94 / sourceRadius, 1.94 / sourceRadius);
        child.geometry.computeVertexNormals();
        moon.geometry.dispose();
        moon.geometry = child.geometry;
        moon.material.dispose();
        moon.material = child.material;
      });
  };
  new GLTFLoader().load('/moon-model/moon.glb', gltf => applyModel(gltf.scene), undefined, error => {
    console.warn('GLB Moon model unavailable; keeping generated Moon.', error);
  });
}
loadSuppliedMoonModel();
// Keep Mars closer to the Moon so the three-body composition reads as one field.
const mars = makePlanet('Mars', 3.65, new THREE.Vector3(35, 2, -18), 'mars');
function loadSuppliedMarsModel() {
  new GLTFLoader().load('/mars-model/mars.glb', gltf => {
    const object = gltf.scene;
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const sourceRadius = Math.max(size.x, size.y, size.z) * .5 || 1;
    object.traverse(child => {
      if (!child.isMesh) return;
      child.geometry.translate(-center.x, -center.y, -center.z);
      child.geometry.scale(3.65 / sourceRadius, 3.65 / sourceRadius, 3.65 / sourceRadius);
      child.geometry.computeVertexNormals();
      mars.geometry.dispose();
      mars.geometry = child.geometry;
      mars.material.dispose();
      mars.material = child.material;
    });
  }, undefined, error => console.warn('GLB Mars model unavailable; keeping generated Mars.', error));
}
loadSuppliedMarsModel();
const interactivePlanets = [
  { mesh: earth, radius: 7.1 },
  { mesh: moon, radius: 1.94 },
  { mesh: mars, radius: 3.65 }
];

function line(points, color, opacity = .72, dashed = false, parent = scene) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: .55, gapSize: .42 })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const object = new THREE.Line(geometry, material);
  if (dashed) object.computeLineDistances();
  parent.add(object);
  return object;
}

function surfacePoint(latitude, longitude, radius = 7.18) {
  const lat = THREE.MathUtils.degToRad(latitude);
  const lon = THREE.MathUtils.degToRad(longitude);
  return new THREE.Vector3(
    radius * Math.cos(lat) * Math.sin(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.cos(lon)
  );
}

function surfaceArc(from, to, height = .42, segments = 72) {
  const a = from.clone().normalize();
  const b = to.clone().normalize();
  return Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    return a.clone().lerp(b, t).normalize().multiplyScalar(7.18 + Math.sin(Math.PI * t) * height);
  });
}

function arc(from, to, lift, segments = 90) {
  const mid = from.clone().lerp(to, .5).add(lift);
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  return curve.getPoints(segments);
}

const columbusSurface = surfacePoint(25, -45);
const westwardSurface = surfacePoint(39, -100);
line(arc(new THREE.Vector3(5.6,2.5,3.3), moon.position.clone().add(new THREE.Vector3(-1.5,-.3,1)), new THREE.Vector3(1,6,2)), 0xd7d6d0, .72, true);
line(arc(new THREE.Vector3(6.5,-1.2,-1), mars.position.clone().add(new THREE.Vector3(-3,1,1)), new THREE.Vector3(3,14,8)), 0x8e3028, .7, true);

const orbit = new THREE.LineLoop(
  new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0,0,12,12,0,Math.PI*2).getPoints(160).map(p => new THREE.Vector3(p.x,0,p.y))),
  new THREE.LineBasicMaterial({ color: 0x5e5e59, transparent: true, opacity: .26 })
);
orbit.rotation.x = .28; orbit.rotation.z = .2; scene.add(orbit);

const stars = new THREE.BufferGeometry();
const starPositions = [];
const random = seeded(42);
for (let i = 0; i < 1700; i++) {
  const r = 42 + random() * 170;
  const a = random() * Math.PI * 2;
  const y = (random() - .5) * 130;
  starPositions.push(Math.cos(a) * r, y, Math.sin(a) * r);
}
stars.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xc7c7c0, size: .16, transparent: true, opacity: .52, sizeAttenuation: true, depthWrite: false, depthTest: false, fog: false });
const starField = new THREE.Points(stars, starMaterial); starField.renderOrder = 8; scene.add(starField);

const brightStars = new THREE.BufferGeometry();
const brightPositions = [];
const brightRandom = seeded(2049);
for (let i = 0; i < 180; i++) {
  const r = 52 + brightRandom() * 145;
  const a = brightRandom() * Math.PI * 2;
  const y = (brightRandom() - .5) * 120;
  brightPositions.push(Math.cos(a) * r, y, Math.sin(a) * r);
}
brightStars.setAttribute('position', new THREE.Float32BufferAttribute(brightPositions, 3));
const brightMaterial = new THREE.PointsMaterial({ color: 0xf0f0e9, size: .28, transparent: true, opacity: .78, sizeAttenuation: true, depthWrite: false, depthTest: false, fog: false });
const brightField = new THREE.Points(brightStars, brightMaterial); brightField.renderOrder = 9; scene.add(brightField);

// A restrained near-field dust layer keeps the space around the planets legible.
const nearStars = new THREE.BufferGeometry();
const nearPositions = [];
const nearRandom = seeded(781);
for (let i = 0; i < 900; i++) {
  const x = -18 + nearRandom() * 86;
  const y = -22 + nearRandom() * 48;
  const z = -34 + nearRandom() * 42;
  nearPositions.push(x, y, z);
}
nearStars.setAttribute('position', new THREE.Float32BufferAttribute(nearPositions, 3));
const nearMaterial = new THREE.PointsMaterial({ color: 0xe5e5df, size: .24, transparent: true, opacity: .72, sizeAttenuation: true, depthWrite: false, depthTest: false, fog: false });
const nearField = new THREE.Points(nearStars, nearMaterial); nearField.renderOrder = 10; scene.add(nearField);

const events = [
  { id: 'columbus', title: 'COLUMBUS', date: '1492', location: 'ATLANTIC', index: '01', order: 1492, localPoint: columbusSurface, parent: earth, target: 'earth', material: { base: 0x4d2020, emissive: 0x260909, roughness: .8 }, symbol: 'square' },
  { id: 'westward', title: 'WESTWARD EXPANSION', date: '1803–1890', location: 'NORTH AMERICA', index: '02', order: 1803, localPoint: westwardSurface, parent: earth, target: 'earth', material: { base: 0x59605e, emissive: 0x161a19, roughness: .72 }, symbol: 'triangle' },
  { id: 'space-race', title: 'SPACE RACE', date: '1957–1975', location: 'MOON', index: '03', order: 1957, localPoint: surfacePoint(18, -35, 2.02), parent: moon, target: 'moon', material: { base: 0xc5c5bf, emissive: 0x353532, roughness: .62 }, symbol: 'cross' },
  { id: 'starship', title: 'STARSHIP', date: 'MARS', location: 'EARTH—MARS', index: '04', order: 2030, localPoint: surfacePoint(12, -25, 3.76), parent: mars, target: 'mars', material: { base: 0x7b2924, emissive: 0x2c0806, roughness: .7 }, symbol: 'triangle' }
];

const historicalNodes = [
  { date: '334–323 BCE', name: 'ALEXANDER’S EASTERN CAMPAIGN', order: -334, localPoint: surfacePoint(32, 45) },
  { date: '138 BCE', name: 'ZHANG QIAN’S WESTERN MISSION', order: -138, localPoint: surfacePoint(40, 75) },
  { date: '130 BCE—1453', name: 'SILK ROAD', order: -130, localPoint: surfacePoint(38, 65) },
  { date: '1250–1300', name: 'MĀORI ARRIVAL IN AOTEAROA', order: 1250, localPoint: surfacePoint(-40, 175) },
  { date: '1405–1433', name: 'ZHENG HE’S TREASURE VOYAGES', order: 1405, localPoint: surfacePoint(20, 115) },
  { date: '1497–1499', name: 'DA GAMA’S INDIA ROUTE', order: 1497, localPoint: surfacePoint(15, 73) },
  { date: '1519–1522', name: 'MAGELLAN’S CIRCUMNAVIGATION', order: 1519, localPoint: surfacePoint(-35, -70) },
  { date: '15TH—20TH C.', name: 'EUROPEAN COLONIAL EXPANSION', order: 1450, localPoint: surfacePoint(45, 10) }
];

const defaultMaterials = {
  // The canvas texture already contains the designed black, silver, and red palette.
  // White keeps the default material from multiplying that texture darker on restore.
  earth: { base: new THREE.Color(0xffffff), emissive: new THREE.Color(0x000000), roughness: .92 },
  moon: { base: new THREE.Color(0xffffff), emissive: new THREE.Color(0x000000), roughness: .92 },
  mars: { base: new THREE.Color(0xffffff), emissive: new THREE.Color(0x000000), roughness: .92 }
};
const planetMeshes = { earth, moon, mars };
const materialTransitions = new Map();
let selectedEvent = null;
const fieldNotes = { columbus: ['EARTH','EUROPE','AMERICA','CROSSING','OCEAN'], westward: ['EARTH','EAST','WEST','EXPANSION','LAND'], 'space-race': ['MOON','EARTH','ORBIT','ESCAPE','ORBIT'], starship: ['MARS','EARTH','MARS','MIGRATION','PLANET'] };
function updateFieldNotes(event) {
  const d = fieldNotes[event?.id || 'columbus'];
  ['field-position','field-origin','field-destination','field-movement','field-scale'].forEach((id, i) => {
    const el = document.querySelector(`#${id}`); if (el) el.textContent = d[i];
  });
  document.querySelector('#field-trace')?.setAttribute('data-kind', event?.id || 'idle');
}

function setEventMaterial(event) {
  Object.entries(planetMeshes).forEach(([name, mesh]) => {
    const target = event && event.target === name ? event.material : defaultMaterials[name];
    materialTransitions.set(name, {
      from: { base: mesh.material.color.clone(), emissive: mesh.material.emissive.clone(), roughness: mesh.material.roughness },
      to: { base: new THREE.Color(target.base), emissive: new THREE.Color(target.emissive), roughness: target.roughness },
      start: performance.now(), duration: 720
    });
  });
}

function updateEventSelection(event) {
  selectedEvent = event;
  events.forEach(item => {
    item.element?.classList.toggle('is-selected', item === event);
    item.listElement?.classList.toggle('is-active', item === event);
  });
  setEventMaterial(event);
  updateFieldNotes(event);
}

function clearEventSelection() {
  selectedEvent = null;
  events.forEach(item => {
    item.element?.classList.remove('is-selected');
    item.listElement?.classList.remove('is-active');
  });
  setEventMaterial(null);
  updateFieldNotes(null);
}

function createSymbol(event) {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color: event.id === 'starship' ? 0x963c32 : 0xd5d5ce, transparent: true, opacity: .72 });
  if (event.id === 'starship') {
    const core = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, .28, .13, .13, 0, Math.PI * 2).getPoints(28).map(p => new THREE.Vector3(p.x, p.y, 0))), material);
    const spear = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-.1, .18, 0), new THREE.Vector3(-.34, -.62, 0), new THREE.Vector3(0, -.2, 0),
      new THREE.Vector3(.34, -.62, 0), new THREE.Vector3(.1, .18, 0)
    ]), material);
    const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, -.02, .62, .22, -.35, Math.PI * 1.35).getPoints(36).map(p => new THREE.Vector3(p.x, p.y, 0))), material);
    group.add(core, spear, orbit);
    group.position.copy(event.localPoint).multiplyScalar(1.12);
    event.parent.add(group); event.symbolObject = group;
    return;
  }
  let geometry;
  if (event.symbol === 'square') geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.25,-.25,0),new THREE.Vector3(.25,-.25,0),new THREE.Vector3(.25,.25,0),new THREE.Vector3(-.25,.25,0),new THREE.Vector3(-.25,-.25,0)]);
  if (event.symbol === 'triangle') geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,.3,0),new THREE.Vector3(.3,-.22,0),new THREE.Vector3(-.3,-.22,0),new THREE.Vector3(0,.3,0)]);
  if (event.symbol === 'cross') geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.26,-.26,0),new THREE.Vector3(.26,.26,0),new THREE.Vector3(0,0,0),new THREE.Vector3(-.26,.26,0),new THREE.Vector3(.26,-.26,0)]);
  group.add(new THREE.Line(geometry, material));
  group.position.copy(event.localPoint).multiplyScalar(1.12);
  event.parent.add(group); event.symbolObject = group;
}

const eventList = document.querySelector('#event-list');

function eventWorldPoint(event) {
  return event.parent
    ? event.parent.localToWorld(event.localPoint.clone())
    : event.point.clone();
}

events.forEach(event => {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'event-marker'; button.dataset.event = event.id;
  button.innerHTML = `<strong>${event.title}</strong><em>${event.date}</em>`;
  button.addEventListener('click', () => openEvent(event));
  markerLayer.appendChild(button); event.element = button;
  const listButton = document.createElement('button');
  listButton.type = 'button'; listButton.className = 'timeline-item'; listButton.dataset.event = event.id;
  listButton.dataset.order = String(event.order);
  listButton.innerHTML = `<span class="timeline-number">${event.index}</span><span class="timeline-copy"><span class="timeline-time">${event.date}</span><span class="timeline-location">${event.location}</span><span class="timeline-name">${event.title}</span></span>`;
  listButton.addEventListener('click', () => openEvent(event));
  eventList.appendChild(listButton); event.listElement = listButton;
  createSymbol(event);
});

historicalNodes.forEach((node, index) => {
  const item = document.createElement('div');
  item.className = 'timeline-static';
  item.dataset.order = String(node.order);
  item.innerHTML = `<span class="timeline-node" aria-hidden="true"></span><span class="timeline-copy"><span class="timeline-time">${node.date}</span><span class="timeline-name">${node.name}</span></span>`;
  eventList.appendChild(item);
  const marker = document.createElement('div');
  marker.className = 'historical-marker';
  marker.innerHTML = `<span class="historical-dot" aria-hidden="true"></span><span>${node.name}</span>`;
  markerLayer.appendChild(marker);
  node.element = marker;
});

[...eventList.children]
  .sort((a, b) => Number(a.dataset.order ?? 9999) - Number(b.dataset.order ?? 9999))
  .forEach(item => eventList.appendChild(item));

let transition = null;
let savedView = null;
let activeEvent = null;
let planetView = null;
let focusedPlanet = null;

function startArchiveIntro() {
  transition = {
    start: performance.now(),
    duration: 4200,
    fromPosition: introView.position.clone(),
    fromTarget: introView.target.clone(),
    position: initialView.position.clone(),
    target: initialView.target.clone(),
    intro: true
  };
  controls.enabled = false;
}

function tweenView(position, target, duration = 2200, done) {
  transition = { start: performance.now(), duration, fromPosition: camera.position.clone(), fromTarget: controls.target.clone(), position, target, done };
  controls.enabled = false;
}

function openEvent(event) {
  if (!savedView) savedView = { position: camera.position.clone(), target: controls.target.clone() };
  activeEvent = event;
  updateEventSelection(event);
  document.querySelector('#panel-title').textContent = event.title;
  document.querySelector('#panel-date').textContent = event.date;
  document.querySelector('#panel-number').textContent = event.index;
  panel.classList.add('is-open'); panel.setAttribute('aria-hidden', 'false');
  const point = eventWorldPoint(event);
  const direction = camera.position.clone().sub(point).normalize();
  const distance = event.id === 'starship' ? 25 : event.id === 'space-race' ? 18 : 15;
  tweenView(point.clone().add(direction.multiplyScalar(distance)), point, 2600);
}

function closeEvent() {
  panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true');
  activeEvent = null;
  clearEventSelection();
  if (savedView) {
    const restore = savedView; savedView = null;
    tweenView(restore.position, restore.target, 2200);
  }
}

function focusPlanet(planet) {
  if (!planetView) {
    planetView = {
      position: camera.position.clone(),
      target: controls.target.clone(),
      minDistance: controls.minDistance
    };
  }
  focusedPlanet = planet;
  const center = planet.mesh.getWorldPosition(new THREE.Vector3());
  const direction = camera.position.clone().sub(center).normalize();
  const distance = planet.radius * 3.55;
  controls.minDistance = planet.radius * 1.35;
  tweenView(center.clone().add(direction.multiplyScalar(distance)), center, 1800);
}

function restorePlanetView() {
  if (!planetView) return;
  const restore = planetView;
  planetView = null;
  focusedPlanet = null;
  controls.minDistance = restore.minDistance;
  tweenView(restore.position, restore.target, 1800);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const pointerState = { planet: null, x: 0, y: 0, lastX: 0, lastY: 0, moved: false };

function hitPlanet(event) {
  const bounds = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(interactivePlanets.map(planet => planet.mesh), true)[0];
  if (!hit) return null;
  return interactivePlanets.find(planet => {
    let object = hit.object;
    while (object) {
      if (object === planet.mesh) return true;
      object = object.parent;
    }
    return false;
  }) || null;
}

canvas.addEventListener('pointerdown', event => {
  pointerState.planet = hitPlanet(event);
  pointerState.x = pointerState.lastX = event.clientX;
  pointerState.y = pointerState.lastY = event.clientY;
  pointerState.moved = false;
  if (pointerState.planet) {
    controls.enabled = false;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
  }
});

canvas.addEventListener('pointermove', event => {
  if (!pointerState.planet) {
    canvas.style.cursor = hitPlanet(event) ? 'grab' : 'default';
    return;
  }
  const dx = event.clientX - pointerState.lastX;
  const dy = event.clientY - pointerState.lastY;
  if (Math.hypot(event.clientX - pointerState.x, event.clientY - pointerState.y) > 5) pointerState.moved = true;
  pointerState.planet.mesh.rotation.y += dx * .009;
  pointerState.planet.mesh.rotation.x += dy * .007;
  pointerState.lastX = event.clientX;
  pointerState.lastY = event.clientY;
});

canvas.addEventListener('pointerup', event => {
  const planet = pointerState.planet;
  const moved = pointerState.moved;
  pointerState.planet = null;
  controls.enabled = true;
  canvas.style.cursor = 'default';
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  if (!moved) {
    if (planet) focusPlanet(planet);
    else if (focusedPlanet) restorePlanetView();
  }
});

canvas.addEventListener('pointercancel', event => {
  pointerState.planet = null;
  controls.enabled = true;
  canvas.style.cursor = 'default';
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
});

document.querySelector('.close-panel').addEventListener('click', closeEvent);
document.querySelector('.fullscreen-hint').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
});
document.querySelector('.wordmark').addEventListener('click', event => {
  event.preventDefault(); savedView = null; panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true'); activeEvent = null; clearEventSelection();
  const home = homeView();
  tweenView(home.position, home.target, 2200);
});
window.addEventListener('keydown', event => {
  if (event.key.toLowerCase() === 'f' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }
  if (event.key === 'Escape' && activeEvent) closeEvent();
});

document.addEventListener('fullscreenchange', () => {
  requestAnimationFrame(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateMarkers();
  });
});

function updateMarkers() {
  const width = window.innerWidth, height = window.innerHeight;
  const cameraDirection = new THREE.Vector3(); camera.getWorldDirection(cameraDirection);
  events.forEach(event => {
    const worldPoint = eventWorldPoint(event);
    const projected = worldPoint.clone().project(camera);
    event.element.style.left = `${(projected.x * .5 + .5) * width}px`;
    event.element.style.top = `${(-projected.y * .5 + .5) * height}px`;
    const direction = worldPoint.clone().sub(camera.position).normalize();
    const behind = direction.dot(cameraDirection) < .25 || projected.z > 1 || projected.x < -1.2 || projected.x > 1.2 || projected.y < -1.2 || projected.y > 1.2;
    event.element.classList.toggle('behind', behind);
  });
  historicalNodes.forEach(node => {
    const worldPoint = earth.localToWorld(node.localPoint.clone());
    const projected = worldPoint.clone().project(camera);
    node.element.style.left = `${(projected.x * .5 + .5) * width}px`;
    node.element.style.top = `${(-projected.y * .5 + .5) * height}px`;
    const direction = worldPoint.clone().sub(camera.position).normalize();
    const behind = direction.dot(cameraDirection) < .25 || projected.z > 1 || projected.x < -1.2 || projected.x > 1.2 || projected.y < -1.2 || projected.y > 1.2;
    node.element.classList.toggle('behind', behind);
  });
}

function animate(now) {
  requestAnimationFrame(animate);
  if (transition) {
    const t = Math.min(1, (now - transition.start) / transition.duration);
    const eased = t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
    if (transition.intro) {
      const orbitAngle = Math.sin(Math.PI * eased) * .82;
      const orbitPoint = transition.fromPosition.clone().sub(transition.fromTarget);
      orbitPoint.applyAxisAngle(new THREE.Vector3(0, 1, 0), orbitAngle);
      const endPoint = transition.position.clone().sub(transition.target);
      orbitPoint.lerp(endPoint, eased);
      camera.position.copy(transition.fromTarget).lerp(transition.target, eased).add(orbitPoint);
    } else camera.position.lerpVectors(transition.fromPosition, transition.position, eased);
    controls.target.lerpVectors(transition.fromTarget, transition.target, eased);
    if (t === 1) { const done = transition.done; transition = null; controls.enabled = true; done?.(); }
  }
  controls.update();
  materialTransitions.forEach((transitionState, name) => {
    const t = Math.min(1, (now - transitionState.start) / transitionState.duration);
    const eased = t * t * (3 - 2 * t);
    const material = planetMeshes[name].material;
    material.color.lerpColors(transitionState.from.base, transitionState.to.base, eased);
    material.emissive.lerpColors(transitionState.from.emissive, transitionState.to.emissive, eased);
    material.roughness = THREE.MathUtils.lerp(transitionState.from.roughness, transitionState.to.roughness, eased);
    if (t === 1) materialTransitions.delete(name);
  });
  earth.rotation.y += .00018;
  moon.rotation.y += .00012;
  mars.rotation.y += .0001;
  events.forEach((event, index) => {
    if (event.symbolObject) {
      event.symbolObject.rotation.z += .0012 * (index % 2 ? -1 : 1);
      event.symbolObject.position.y = event.localPoint.y * 1.12 + Math.sin(now * .001 + index) * .035;
      const symbolMaterial = event.symbolObject.children[0]?.material;
      if (symbolMaterial) symbolMaterial.opacity = selectedEvent === event ? .98 : .64;
    }
  });
  updateMarkers();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
