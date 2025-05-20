import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

let hoverLight = null;
let hoverHelper = null;
let sunHoverLight = null;
const api = 'https://portfolio-backend-huz3.onrender.com';


const scene = new THREE.Scene();
scene.background = new THREE.TextureLoader().load(`${api}/images/spacetexture.jpg`);

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
const gltfLoader = new GLTFLoader();
let sun; // Replace global `sun` reference

gltfLoader.load(`${api}/3dobjects/blackhole/scene.gltf`, (gltf) => {
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
});



// Load and wrap a GLTF model with orbital logic
function loadGLTFProject(name, path, orbitRadius, scale = 1, speed = 0.005) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(path, (gltf) => {
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
loadGLTFProject("ARDI", `${api}/3dobjects/iphone_16_pro_max/scene.gltf`, 30, 6, 0.006).then(p => projects.push(p));
loadGLTFProject("My Films", `${api}/3dobjects/old_vintage_film_camera/scene.gltf`, 60, 0.25, 0.005).then(p => projects.push(p));
loadGLTFProject("Portal Defender", `${api}/3dobjects/controller/controller.glb`, 80, 8, 0.004).then(p => projects.push(p));
loadGLTFProject("Yaoshi", `${api}/3dobjects/controller/controller.glb`, 100, 8, 0.003).then(p => projects.push(p));
loadGLTFProject("Erin and the Otherworld", `${api}/3dobjects/controller/controller.glb`, 120, 8, 0.002).then(p => projects.push(p));
loadGLTFProject("Taffy", `${api}/3dobjects/golden_retriever_sitting/scene.gltf`, 140, 20, 0.001).then(p => projects.push(p));


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
window.addEventListener('click', async (event) => {
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

  focusedProject = obj;
  paused = true;

  const res = await fetch(`${api}/api/projects`);
  const projectData = await res.json();

  // Handle blackhole (Anurag card)
  const match = (obj === window.sunWrapper)
    ? projectData.find(p => p.title === "Anurag Gotety")
    : projectData.find(p => p.title === obj.name);

  if (match) {
    document.getElementById('panelTitle').textContent = match.title;
    document.getElementById('panelSubtitle').textContent = match.short;
    const panelImage = document.getElementById('panelImage');

if (match.images?.[0]) {
  panelImage.src = `${match.images[0]}`;
  panelImage.style.display = 'block';
} else {
  panelImage.style.display = 'none';
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
  descElem.textContent = match.long;
}

    const btn1 = document.getElementById('seeMoreBtn');
const btn2 = document.getElementById('playGameBtn');

btn1.textContent = match.button1 || 'See More';
btn2.textContent = match.button2 || 'Play Game';

btn1.style.display = match.button1Link ? 'inline-block' : 'none';
btn2.style.display = match.button2Link ? 'inline-block' : 'none';

btn1.onclick = () => {
  if (match.button1Link) window.open(match.button1Link, '_blank');
};

btn2.onclick = () => {
  if (match.button2Link) window.open(match.button2Link, '_blank');
};

  }

  const target = obj.getWorldPosition(new THREE.Vector3());
  orbitTargetPosition = target.clone();
  cameraTargetPosition = target.clone().add(new THREE.Vector3(-20, 5, 20));
  document.getElementById('infoPanel').style.right = '0';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('infoPanel').style.right = '-100%';
  }
});
document.getElementById('closePanelBtn').addEventListener('click', () => {
  document.getElementById('infoPanel').style.right = '-100%';
});

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
    sun.rotation.y += 0.004 * timeScale;
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
const infoToggle = document.getElementById('infoToggle');
const infoPanelMini = document.getElementById('infoPanelMini');

infoToggle.addEventListener('click', () => {
  infoPanelMini.classList.toggle('show');
});

setTimeout(() => {
  const intro = document.getElementById('introText');
  const logo = document.getElementById('logoFade');
  const prefix = document.getElementById('namePrefix');
  const name = document.getElementById('nameTitle');
  const pTags = document.querySelectorAll('#introText p, #introText p2');
  const p = document.getElementById('#introText p');
  const p2 = document.getElementById('#introText p2');


  // Animate name + reveal logo
  setTimeout(() => {
    logo.style.visibility = 'visible';
    requestAnimationFrame(() => {

        prefix.style.opacity = 0;
     
      name.style.opacity = 0;
     pTags.forEach(p => {
  p.style.opacity = 0;
  
});
     logo.style.opacity = 1;
});
  }, 1500);
}, 150000);




animate();


