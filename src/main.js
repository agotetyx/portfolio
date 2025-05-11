import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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

scene.add(new THREE.PointLight(0xffffff, 50, 500, 0.0005));



function createBasicMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.1,
    metalness: 1,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0
  });
}



function createProject(name, geometry, color, position, ring) {
  const mat = color instanceof THREE.Material ? color : createBasicMaterial(color);
  const mesh = new THREE.Mesh(geometry, mat);
  const altMesh = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), mat.clone());
  altMesh.visible = false;

  const obj = new THREE.Object3D();
  mesh.name = name;
  obj.add(mesh);
  obj.add(altMesh);

  if (ring) {
    const ringGeo = new THREE.RingGeometry(ring.innerRadius, ring.outerRadius, 64);
    const ringMat = mat.clone(); // clone the main mesh material
ringMat.side = THREE.DoubleSide;
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.x = position;
    ringMesh.rotation.x = -0.5 * Math.PI;
    obj.add(ringMesh);
  }

  const orbitPath = new THREE.RingGeometry(position - 0.1, position + 0.1, 128);
  const orbitMat = new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.DoubleSide, metalness: 0.1, roughness: 1 });
  const orbitMesh = new THREE.Mesh(orbitPath, orbitMat);
  orbitMesh.rotation.x = -Math.PI / 2;
  scene.add(orbitMesh);

  scene.add(obj);
  mesh.position.x = position;
  altMesh.position.x = position;
  return { mesh, altMesh, obj, positionX: position };
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
  new THREE.TetrahedronGeometry(8, 2),
  new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 1 })
);
sun.position.set(0, 0, 0);
scene.add(sun);



const projects = [
  createProject('project1', new THREE.TorusGeometry(3, 1, 16, 100), 0xff5555, 28),
  createProject('project2', new THREE.TorusKnotGeometry(3, 0.6, 100, 16), 0x3399ff, 44),
  createProject('project3', new THREE.DodecahedronGeometry(3, 1), 0xffcc99, 62),
  createProject('project4', new THREE.OctahedronGeometry(3, 2), 0xff9966, 78),
  createProject('project5', new THREE.TetrahedronGeometry(3, 3), 0xffff66, 100),
  createProject('project6', new THREE.IcosahedronGeometry(3.5, 2), 0xffcc99, 138, {
    innerRadius: 10, outerRadius: 20, color: 0xffddbb
  }),
  createProject('project7', new THREE.LatheGeometry(
    Array.from({ length: 10 }, (_, i) => new THREE.Vector2(Math.sin(i * 0.2) * 3 + 5, (i - 5) * 2))
  ), 0x66ffff, 176, {
    innerRadius: 7, outerRadius: 12, color: 0xbbffff
  }),
  createProject('project8', new THREE.ExtrudeGeometry(
    (() => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(2, 0);
      shape.lineTo(2, 2);
      shape.lineTo(0, 2);
      shape.lineTo(0, 0);
      return shape;
    })(),
    { depth: 2, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 }
  ), 0x9999ff, 200),
  createProject('project9', new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(10, 10, 0),
      new THREE.Vector3(20, 0, 0)
    ]), 20, 1, 8, false
  ), 0xffffff, 216)
];

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




window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(projects.map(p => p.mesh));

  if (intersects.length > 0) {
    focusedProject = intersects[0].object;
    paused = true;
    const target = focusedProject.getWorldPosition(new THREE.Vector3());
    orbitTargetPosition = target.clone();
    cameraTargetPosition = target.clone().add(new THREE.Vector3(-20, 5, 20));
  }
});

['mousedown', 'wheel'].forEach(event =>
  window.addEventListener(event, () => { if (paused) paused = false; })
);

window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(projects.map(p => p.mesh));

  if (intersects.length > 0) {
    const current = intersects[0].object;
    hoverTarget = current;
    timeScale = 0.2;

    // Remove glow from previous
    if (lastHoveredProject && lastHoveredProject !== current) {
      if (lastHoveredProject.material.emissive) {
        lastHoveredProject.material.emissiveIntensity = 0;
      }
    }

    // Add glow to current
    if (current.material.emissive) {
      current.material.emissive.copy(current.material.color);
      current.material.emissiveIntensity = 1.75;
      
    }

    lastHoveredProject = current;
  } else {
    timeScale = 1.0;
    hoverTarget = null;

    // Remove glow if nothing is hovered
    if (lastHoveredProject && lastHoveredProject.material.emissive) {
      lastHoveredProject.material.emissiveIntensity = 0;
      lastHoveredProject = null;
    }
  }
});



function animate() {
  requestAnimationFrame(animate);
  time += 0.01 * timeScale;
 

  if (!paused) {
    sun.rotation.y += 0.004 * timeScale;
projects.forEach((p, i) => {
  p.mesh.rotation.y += (0.005 + 0.002 * i) * timeScale;
  p.obj.rotation.y += (0.007 / (i + 1)) * timeScale;
  
  
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

  if (focusedProject && paused) {
    const pos = focusedProject.getWorldPosition(new THREE.Vector3()).clone().project(camera);
    labelDiv.style.left = `${(2 / 3) * window.innerWidth}px`;
    labelDiv.style.top = `${(-pos.y * 0.5 + 0.5) * window.innerHeight - 40}px`;
    labelDiv.innerText = `${focusedProject.name.toUpperCase()}
Tech Stack: TBD
Description: Lorem ipsum dolor sit amet.`;
  } else {
    labelDiv.innerText = '';
  }

  orbit.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
