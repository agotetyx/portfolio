import './style.css';
import projectData from './data/projects/index.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { initNavTutorial } from './navTutorial.js';
import { initTopNav, downloadResume } from './topNav.js';

let hoverLight = null;
let hoverHelper = null;
let sunHoverLight = null;

const scene = new THREE.Scene();
scene.background = new THREE.TextureLoader().load(`/images/spacetexture.jpg`);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.setZ(30);

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5, // strength
  0.2, // radius
  0.85 // threshold
);
composer.addPass(bloomPass);


const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.1;

scene.add(new THREE.AmbientLight(0xffffff, 5));
const pointLight = new THREE.PointLight(0xffffff, 10, 250, 0.0005);
pointLight.position.y = 0;
scene.add(pointLight);

const projects = [];

function addStar() {
  const geometry = new THREE.SphereGeometry(0.25, 12, 12);
  const material = new THREE.MeshStandardMaterial({ emissive: 0xffffff });
  const star = new THREE.Mesh(geometry, material);
  const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(600));
  star.position.set(x, y, z);
  scene.add(star);
}
Array(400).fill().forEach(addStar);

// SUN
const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let sun; // Replace global `sun` reference
let sunLoaded;
const sunPromise = new Promise((resolve) => { sunLoaded = resolve; });

gltfLoader.load(`/3dobjects/blackhole/blackhole.opt.glb`, (gltf) => {
  sun = gltf.scene;
  sun.name = "Anurag Gotety"; // Set name to match JSON title
  sun.scale.set(7, 7, 7);

  const box = new THREE.Box3().setFromObject(sun);
  const center = box.getCenter(new THREE.Vector3());
  sun.position.sub(center);
  sun.position.y = -1.5;

  sun.traverse((child) => {
    if (child.isMesh) {
      child.material.emissive = new THREE.Color(0x000000);
      child.material.emissiveIntensity = 0;
    }
  });

  // ✅ Wrap in a parent object for click detection
  const sunWrapper = new THREE.Object3D();
  sunWrapper.name = "Anurag Gotety"; // Must match title in anurag.json
  sunWrapper.add(sun);
  scene.add(sunWrapper);

  // ✅ Store reference to wrapper for click logic
  window.sunWrapper = sunWrapper;
   document.getElementById('loadingSpinner').style.display = 'none';
  sunLoaded();
});



// Load and wrap a GLTF model with orbital logic
function loadGLTFProject(name, path, orbitRadius, scale = 1, speed = 0.005) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(path, (gltf) => {
      const model = gltf.scene;
      model.name = name;
      model.scale.set(scale, scale, scale);

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);

      model.rotation.y = Math.PI;
      model.position.x = orbitRadius;

      const orbitWrapper = new THREE.Object3D();
      orbitWrapper.add(model);
      orbitWrapper.userData = { speed };
      scene.add(orbitWrapper);

      model.traverse((child) => {
        if (child.isMesh) {
          child.material.emissive = new THREE.Color(0x000000);
          child.material.emissiveIntensity = 0;
        }
      });

      resolve({ mesh: model, obj: orbitWrapper });
    }, undefined, reject);
  });
}

// Load projects
const assetPromises = [
  loadGLTFProject("ARDI", `/3dobjects/iphone_16_pro_max/iphone_16_pro_max.opt.glb`, 30, 6, 0.004),
  loadGLTFProject("My Films", `/3dobjects/old_vintage_film_camera/old_vintage_film_camera.opt.glb`, 60, 0.25, 0.003),
  loadGLTFProject("Portal Defender", `/3dobjects/controller/controller.opt.glb`, 80, 8, 0.002),
  loadGLTFProject("Yaoshi", `/3dobjects/controller/controller.opt.glb`, 100, 8, 0.001),
  loadGLTFProject("Erin and the Otherworld", `/3dobjects/controller/controller.opt.glb`, 120, 8, 0.0009),
  loadGLTFProject("Taffy", `/3dobjects/golden_retriever_sitting/golden_retriever_sitting.opt.glb`, 140, 20, 0.0008)
];

Promise.all(assetPromises).then(loadedProjects => {
  projects.push(...loadedProjects);
  document.getElementById('loadingSpinner').style.display = 'none';
});

const sceneReady = Promise.all([sunPromise, ...assetPromises]);
let navTutorial = null;
sceneReady.then(() => { navTutorial = initNavTutorial(renderer.domElement); });


Promise.all(assetPromises).then(loadedProjects => {
  projects.push(...loadedProjects);
  document.getElementById('loadingSpinner').style.display = 'none';
});

// Hover + Click interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const labelDiv = document.createElement('div');
Object.assign(labelDiv.style, {
  position: 'absolute', color: 'white', fontSize: '16px',
  padding: '6px 10px', backgroundColor: 'rgba(0, 0, 0, 0.6)',
  borderRadius: '6px', pointerEvents: 'none',
  maxWidth: '300px', textAlign: 'left', lineHeight: '1.4'
});
document.body.appendChild(labelDiv);

let focusedProject = null;
let paused = false;
let cameraTargetPosition = null;
let orbitTargetPosition = null;
let time = 0;
let timeScale = 1;
let hoverTarget = null;
let lastHoveredProject = null;

// Click
window.addEventListener('click', (event) => {
  // Only raycast clicks that land on the scene itself, not on the UI above it
  if (event.target !== renderer.domElement) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects([
    ...projects.map(p => p.mesh),
    window.sunWrapper
  ], true);

  if (intersects.length === 0) return;

  let obj = intersects[0].object;

  // Climb up to find a named wrapper object or known mesh
  while (
    obj &&
    !projects.find(p => p.mesh === obj) &&
    obj !== window.sunWrapper
  ) {
    obj = obj.parent;
  }

  if (!obj) return;

  focusObject(obj);
});

// Eyebrow label shown above the panel title
const PANEL_CATEGORY = {
  'Anurag Gotety': 'About',
  'ARDI': 'Software Development',
  'Portal Defender': 'Games',
  'Yaoshi': 'Games',
  'Erin and the Otherworld': 'Games',
  'My Films': 'Films',
  'Taffy': 'Good dog'
};

// Fly the camera to a scene object and open its info panel (same as clicking it)
function focusObject(obj) {
  dismissClickHint();
  focusedProject = obj;
  paused = true;


  // Handle blackhole (Anurag card)
  const match = (obj === window.sunWrapper)
    ? projectData.find(p => p.title === "Anurag Gotety")
    : projectData.find(p => p.title === obj.name);

  if (match) {
    document.getElementById('panelEyebrow').textContent = PANEL_CATEGORY[match.title] || 'Project';
    document.getElementById('panelTitle').textContent = match.title;
    infoPanel.setAttribute('aria-label', match.title === 'Anurag Gotety' ? 'About' : match.title);
    document.getElementById('panelSubtitle').textContent = match.short;
    const panelImage = document.getElementById('panelImage');

const panelVideo = document.getElementById('panelVideo');
const media = match.images?.[0];
const isVideo = /\.(mp4|webm)$/i.test(media || '');

panelImage.style.display = media && !isVideo ? 'block' : 'none';
panelVideo.style.display = isVideo ? 'block' : 'none';
if (isVideo) {
  panelVideo.src = media;
  panelVideo.play().catch(() => {});
} else {
  panelVideo.removeAttribute('src');
  if (media) panelImage.src = media;
}



const descElem = document.getElementById('panelDescription');
descElem.innerHTML = ''; // Clear previous

if (Array.isArray(match.long)) {
  const ul = document.createElement('ul');
  match.long.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  });
  descElem.appendChild(ul);
} else {
  const p = document.createElement('p');
  p.textContent = match.long;
  descElem.appendChild(p);
}

const isAbout = match.title === 'Anurag Gotety';
const primaryBtn = document.getElementById('panelPrimaryBtn');
const secondaryBtn = document.getElementById('panelSecondaryBtn');
document.getElementById('panelResumeLink').style.display = isAbout ? '' : 'none';

if (isAbout) {
  primaryBtn.innerHTML = 'Download Resume <span class="ip-arrow">↓</span>';
  primaryBtn.style.display = '';
  primaryBtn.onclick = downloadResume;
  secondaryBtn.style.display = 'none';
} else {
  // First linked button gets the glow treatment, the second is a quiet ghost button
  const actions = [
    [match.button1, match.button1Link],
    [match.button2, match.button2Link]
  ].filter(([label, link]) => label && link);

  [primaryBtn, secondaryBtn].forEach((btn, i) => {
    const action = actions[i];
    btn.style.display = action ? '' : 'none';
    if (!action) return;
    btn.innerHTML = i === 0 ? `${action[0]} <span class="ip-arrow">↗</span>` : action[0];
    btn.onclick = () => window.open(action[1], '_blank', 'noopener');
  });
}
document.querySelector('#infoPanel .ip-actions').style.display =
  primaryBtn.style.display === 'none' ? 'none' : '';

  }

  const target = obj.getWorldPosition(new THREE.Vector3());
  orbitTargetPosition = target.clone();
  cameraTargetPosition = target.clone().add(new THREE.Vector3(-20, 5, 20));
  openPanel();
}

// Focus a scene object by its project title (used by the top menu bar)
async function focusByTitle(title) {
  await sceneReady;
  const obj = title === 'Anurag Gotety'
    ? window.sunWrapper
    : projects.find(p => p.mesh.name === title)?.mesh;
  if (obj) focusObject(obj);
}

const infoPanel = document.getElementById('infoPanel');

// "Click any object to begin" hint above the dock: hidden for good after the first focus
const CLICK_HINT_KEY = 'clickHintSeen';
const clickHint = document.getElementById('clickHint');
try { if (localStorage.getItem(CLICK_HINT_KEY) === '1') clickHint.classList.add('hidden'); } catch {}

function dismissClickHint() {
  clickHint.classList.add('hidden');
  try { localStorage.setItem(CLICK_HINT_KEY, '1'); } catch {}
}

function openPanel() {
  topNav.closeMenus();
  document.body.classList.add('panel-open');
  infoPanel.setAttribute('aria-hidden', 'false');
}

function closePanel() {
  document.body.classList.remove('panel-open');
  infoPanel.setAttribute('aria-hidden', 'true');
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePanel();
});
document.getElementById('closePanelBtn').addEventListener('click', closePanel);

['mousedown', 'wheel'].forEach(event =>
  window.addEventListener(event, () => { if (paused) paused = false; })
);
const hoverSpotlight = new THREE.SpotLight(0xffdd66, 300, 50, Math.PI / 3, 0.5, 1);
hoverSpotlight.castShadow = false;
hoverSpotlight.visible = false; // initially hidden
scene.add(hoverSpotlight);
scene.add(hoverSpotlight.target);

const sunSpotlight = new THREE.SpotLight(0x3399ff, 200, 800, Math.PI / 4, 0, 1);
sunSpotlight.visible = false;
scene.add(sunSpotlight);
scene.add(sunSpotlight.target);


// Hover
window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const hoverTargets = [
    ...projects.map(p => p.mesh),
    window.sunWrapper
  ];

  const intersects = raycaster.intersectObjects(hoverTargets, true);

  if (intersects.length > 0) {
    let current = intersects[0].object;

    while (
      current &&
      !projects.find(p => p.mesh === current) &&
      current !== window.sunWrapper
    ) {
      current = current.parent;
    }

    if (!current) return;

    hoverTarget = current;

    // Reset previous emissive
    if (
      lastHoveredProject &&
      lastHoveredProject !== current &&
      lastHoveredProject.material?.emissive
    ) {
      lastHoveredProject.material.emissiveIntensity = 0;
    }

    // Determine if sun or a projecthe
    if (current === window.sunWrapper) {
      timeScale = 0.2;

      // 🔵 Blue spotlight for sun
      const sunPos = current.getWorldPosition(new THREE.Vector3());
      sunSpotlight.visible = true;
      sunSpotlight.position.set(sunPos.x, sunPos.y+20, sunPos.z);
      sunSpotlight.target.position.copy(sunPos);

      hoverSpotlight.visible = false; // Disable yellow spotlight

    } else {
      timeScale = 0.2;

      // ✨ Glow effect
      /*if (current.material?.emissive) {
        current.material.emissive.setRGB(1, 1, 1);
        current.material.emissiveIntensity = 1.75;
      }*/

      // 🟡 Yellow spotlight
      const pos = current.getWorldPosition(new THREE.Vector3());
      hoverSpotlight.visible = true;
      hoverSpotlight.position.set(pos.x, pos.y + 10, pos.z + 10);
      hoverSpotlight.target.position.copy(pos);

      sunSpotlight.visible = false; // Disable blue spotlight
    }

    lastHoveredProject = current;

    // 🏷️ Label
    const screenPos = current.getWorldPosition(new THREE.Vector3()).project(camera);
    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

    if (current.name && current.name.trim() !== '') {
  labelDiv.style.left = `${x}px`;
  labelDiv.style.top = `${y - 40}px`;
  labelDiv.innerText = current.name.toUpperCase();
  labelDiv.style.display = 'block';
} else {
  labelDiv.style.display = 'none';
}

  } else {
    // Reset when not hovering
    labelDiv.style.display = 'none';

    timeScale = 1.0;
    hoverTarget = null;
    labelDiv.innerText = '';
    hoverSpotlight.visible = false;
    sunSpotlight.visible = false;

    if (lastHoveredProject?.material?.emissive) {
      lastHoveredProject.material.emissiveIntensity = 0;
      lastHoveredProject = null;
    }
  }
});


// Animation loop
function animate() {
  

  requestAnimationFrame(animate);

  time += 0.01 * timeScale;

  if (!paused) {
    if (sun) {
  sun.rotation.y += 0.004 * timeScale;
}

    projects.forEach((p) => {
      p.mesh.rotation.y += 0.003 * timeScale;
      p.obj.rotation.y += (p.obj.userData.speed || 0.005) * timeScale;
    });
  }

  if (orbitTargetPosition && cameraTargetPosition) {
    orbit.target.lerp(orbitTargetPosition, 0.05);
    camera.position.lerp(cameraTargetPosition, 0.05);
    if (camera.position.distanceTo(cameraTargetPosition) < 0.1) {
      orbitTargetPosition = null;
      cameraTargetPosition = null;
    }
  }

  orbit.update();
  //renderer.render(scene, camera);
  composer.render();

}
// Fade the hero and the "Click any object" hint out after 90 seconds
setTimeout(() => {
  document.querySelectorAll('#namePrefix, #nameTitle, #introText p, #clickHint').forEach((el) => {
    el.style.transition = 'opacity 2s ease';
    el.style.opacity = 0;
  });
}, 90000);

const chatToggle = document.getElementById('chatToggleBtn');
const chatOverlay = document.getElementById('chatOverlay');
const chatClose = document.getElementById('chatCloseBtn');

chatToggle.addEventListener('click', () => {
  chatOverlay.style.display = 'flex';
});

chatClose.addEventListener('click', () => {
  chatOverlay.style.display = 'none';
});



animate();

function resetCamera() {
  cameraTargetPosition = new THREE.Vector3(120, 10, 0);
  orbitTargetPosition = new THREE.Vector3(0, 0, 0);
}

const topNav = initTopNav({
  onFocus: focusByTitle,
  onResetCamera: resetCamera,
  onHelp: () => navTutorial?.toggle()
});

document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chatInput');
  const chatLog = document.getElementById('chatLog');

  if (!chatInput || !chatLog) {
    console.error("❌ Chat input or log not found in DOM");
    return;
  }

  document.getElementById('chatSendBtn').addEventListener('click', sendChat);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendChat();
});

async function sendChat() {
  const question = chatInput.value.trim();
  if (!question) return;

  const userMsg = document.createElement('div');
  userMsg.className = 'chat-message user';
  userMsg.textContent = question;
  chatLog.appendChild(userMsg);
  chatInput.value = '';

  try {
    const res = await fetch(`/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: question
      })
    });

    const data = await res.json();
    const reply = data.reply || 'No response.';
    const botMsg = document.createElement('div');
    botMsg.className = 'chat-message bot';
    botMsg.innerHTML = reply;
    chatLog.appendChild(botMsg);
  } catch (err) {
    const errMsg = document.createElement('div');
    errMsg.className = 'chat-message bot';
    errMsg.textContent = "⚠️ Error connecting to AI.";
    chatLog.appendChild(errMsg);
  }

  chatLog.scrollTop = chatLog.scrollHeight;
}

});
