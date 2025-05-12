import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.TextureLoader().load('images/spacetexture.jpg');

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.setZ(30);

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.1;

scene.add(new THREE.AmbientLight(0xffffff, 5));
scene.add(new THREE.PointLight(0xffffff, 25, 250, 0.0005));

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
const outerCube = new THREE.Mesh(
  new THREE.BoxGeometry(10, 10, 10),
  new THREE.MeshBasicMaterial({ color: 0xffcc00, wireframe: true, transparent: true, opacity: 0.8 })
);
const innerCube = new THREE.Mesh(
  new THREE.BoxGeometry(4, 4, 4),
  new THREE.MeshBasicMaterial({ color: 0xffcc00, wireframe: true, transparent: true, opacity: 0.8 })
);
const sun = new THREE.Object3D();
sun.add(outerCube);
sun.add(innerCube);
sun.position.set(0, 0, 0);
scene.add(sun);

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
loadGLTFProject("ARDI", "/3d objects/iphone_16_pro_max/scene.gltf", 28, 4, 0.006).then(p => projects.push(p));
loadGLTFProject("My Films", "/3d objects/old_vintage_film_camera/scene.gltf", 62, 0.2, 0.003).then(p => projects.push(p));

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

  const intersects = raycaster.intersectObjects(projects.map(p => p.mesh), true);
  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj && !projects.find(p => p.mesh === obj)) {
      obj = obj.parent;
    }
    if (!obj) return;

    focusedProject = obj;
    paused = true;

    const res = await fetch('http://localhost:3001/api/projects');
    const projectData = await res.json();
    const match = projectData.find(p => p.title === obj.name);

    if (match) {
      document.getElementById('panelTitle').textContent = match.title;
      document.getElementById('panelSubtitle').textContent = match.short;
      document.getElementById('panelImage').src = `http://localhost:3001${match.images[0] || ''}`;
      document.getElementById('panelDescription').textContent = match.long;
      document.getElementById('seeMoreBtn').textContent = match.button1 || 'See More';
      document.getElementById('playGameBtn').textContent = match.button2 || 'Play Game';
    }

    const target = obj.getWorldPosition(new THREE.Vector3());
    orbitTargetPosition = target.clone();
    cameraTargetPosition = target.clone().add(new THREE.Vector3(-20, 5, 20));
    document.getElementById('infoPanel').style.right = '0';
  }
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

// Hover
window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(projects.map(p => p.mesh), true);
  if (intersects.length > 0) {
    const current = intersects[0].object;
    hoverTarget = current;
    timeScale = 0.2;

    if (lastHoveredProject && lastHoveredProject !== current && lastHoveredProject.material?.emissive) {
      lastHoveredProject.material.emissiveIntensity = 0;
    }

    if (current.material?.emissive) {
      current.material.emissive.copy(current.material.color);
      current.material.emissiveIntensity = 1.75;
    }

    lastHoveredProject = current;
    const pos = current.getWorldPosition(new THREE.Vector3()).clone().project(camera);
    const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;

    labelDiv.style.left = `${x}px`;
    labelDiv.style.top = `${y - 40}px`;
    labelDiv.innerText = `${current.name?.toUpperCase() || 'PROJECT'}\nTech Stack: TBD\nDescription: Hovered project`;
  } else {
    timeScale = 1.0;
    hoverTarget = null;
    labelDiv.innerText = '';
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
  renderer.render(scene, camera);
}
animate();
