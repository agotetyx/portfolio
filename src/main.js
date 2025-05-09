import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000010); // space-like background

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.setZ(30);

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.update();

const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 2, 300);
scene.add(pointLight);

function createGlowingMaterial(color) {
  return new THREE.MeshStandardMaterial({
    emissive: color,
    emissiveIntensity: 1.5,
    color: color,
    roughness: 0.2,
    metalness: 0.8
  });
}

function createProject(name, size, color, position, ring) {
  const geo = new THREE.SphereGeometry(size, 32, 32);
  const mat = createGlowingMaterial(color);
  const mesh = new THREE.Mesh(geo, mat);
  const obj = new THREE.Object3D();
  mesh.name = name;
  obj.add(mesh);

  if (ring) {
    const ringGeo = new THREE.RingGeometry(
      ring.innerRadius,
      ring.outerRadius,
      64
    );
    const ringMat = new THREE.MeshBasicMaterial({
      color: ring.color,
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.x = position;
    ringMesh.rotation.x = -0.5 * Math.PI;
    obj.add(ringMesh);
  }

  scene.add(obj);
  mesh.position.x = position;
  return { mesh, obj };
}

function addStar() {
  const geometry = new THREE.SphereGeometry(0.25, 12, 12);
  const material = new THREE.MeshStandardMaterial({ emissive: 0xffffff });
  const star = new THREE.Mesh(geometry, material);

  const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(600));
  star.position.set(x, y, z);
  scene.add(star);
}
Array(400).fill().forEach(addStar);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(16, 32, 32),
  createGlowingMaterial(0xffcc00)
);
scene.add(sun);

const project1 = createProject('project1', 3.2, 0xff5555, 28);
const project2 = createProject('project2', 5.8, 0x3399ff, 44);
const project3 = createProject('project3', 6.4, 0x33ff66, 62);
const project4 = createProject('project4', 4, 0xff9966, 78);
const project5 = createProject('project5', 12, 0xffff66, 100);
const project6 = createProject('project6', 10, 0xffcc99, 138, {
  innerRadius: 10,
  outerRadius: 20,
  color: 0xffddbb
});
const project7 = createProject('project7', 7, 0x66ffff, 176, {
  innerRadius: 7,
  outerRadius: 12,
  color: 0xbbffff
});
const project8 = createProject('project8', 7, 0x9999ff, 200);
const project9 = createProject('project9', 2.8, 0xffffff, 216);

function animate() {
  requestAnimationFrame(animate);

  // Self-rotation
  sun.rotateY(0.004);
  project1.mesh.rotateY(0.004);
  project2.mesh.rotateY(0.002);
  project3.mesh.rotateY(0.02);
  project4.mesh.rotateY(0.018);
  project5.mesh.rotateY(0.04);
  project6.mesh.rotateY(0.038);
  project7.mesh.rotateY(0.03);
  project8.mesh.rotateY(0.032);
  project9.mesh.rotateY(0.008);

  // Orbital rotation
  project1.obj.rotateY(0.04);
  project2.obj.rotateY(0.015);
  project3.obj.rotateY(0.01);
  project4.obj.rotateY(0.008);
  project5.obj.rotateY(0.002);
  project6.obj.rotateY(0.0009);
  project7.obj.rotateY(0.0004);
  project8.obj.rotateY(0.0001);
  project9.obj.rotateY(0.00007);

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
