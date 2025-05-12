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
  //scene.add(orbitMesh);

  scene.add(obj);
  mesh.position.x = position;
  altMesh.position.x = position;
  return { mesh, altMesh, obj, positionX: position };
}

function loadGLTFProject(name, path, positionX, scale = 1) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(path, (gltf) => {
      const model = gltf.scene;
      model.name = name;
      model.scale.set(scale, scale, scale);

      // Center pivot
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);

      // Position for orbit
      model.position.x = positionX;

      const orbitWrapper = new THREE.Object3D();
      orbitWrapper.add(model);
      scene.add(orbitWrapper);

      // Enable emissive glow
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


function addStar() {
  const geometry = new THREE.SphereGeometry(0.25, 12, 12);
  const material = new THREE.MeshStandardMaterial({ emissive: 0xffffff });
  const star = new THREE.Mesh(geometry, material);
  const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(600));
  star.position.set(x, y, z);
  scene.add(star);
}
Array(400).fill().forEach(addStar);

const outerGeometry = new THREE.BoxGeometry(10, 10, 10);
const innerGeometry = new THREE.BoxGeometry(4, 4, 4);

const wireMaterial = new THREE.MeshBasicMaterial({
  color: 0xffcc00,
  wireframe: true,
  transparent: true,
  opacity: 0.8
});

const outerCube = new THREE.Mesh(outerGeometry, wireMaterial);
const innerCube = new THREE.Mesh(innerGeometry, wireMaterial.clone());

const sun = new THREE.Object3D();
sun.add(outerCube);
sun.add(innerCube);

sun.position.set(0, 0, 0);
scene.add(sun);




const projects = [
  //createProject('project1', new THREE.TorusGeometry(3, 1, 16, 100), 0xff5555, 28),
  createProject('project2', new THREE.TorusKnotGeometry(3, 0.6, 100, 16), 0x3399ff, 44),
  //createProject('project3', new THREE.DodecahedronGeometry(3, 1), 0xffcc99, 62),
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
const iphoneLoader = new GLTFLoader();
iphoneLoader.load('/3d objects/iphone_16_pro_max/scene.gltf', (gltf) => {
  const model = gltf.scene;
  model.name = "ARDI";
  model.scale.set(4, 4, 4);

  // Center the pivot at the model's geometric center
const box = new THREE.Box3().setFromObject(model);
const center = box.getCenter(new THREE.Vector3());
model.position.sub(center); // shifts geometry so pivot is centered


  const orbitWrapper = new THREE.Object3D();
  model.position.x = 28;
  orbitWrapper.add(model);
  scene.add(orbitWrapper);

  model.traverse((child) => {
    if (child.isMesh) {
      child.material.emissive = new THREE.Color(0x000000);
      child.material.emissiveIntensity = 0;
    }
  });


  projects.push({ mesh: model, obj: orbitWrapper });
}, undefined, (error) => {
  console.error('Error loading iPhone model:', error);
});

const filmLoader = new GLTFLoader();
filmLoader.load('/3d objects/old_vintage_film_camera/scene.gltf', (gltf) => {
  const model = gltf.scene;
  model.name = "My Films";
  model.scale.set(0.2, 0.2, 0.2);

  // Center the pivot at the model's geometric center
const box = new THREE.Box3().setFromObject(model);
const center = box.getCenter(new THREE.Vector3());
model.position.sub(center); // shifts geometry so pivot is centered


  const orbitWrapper = new THREE.Object3D();
  model.position.x = 62; // same position as project3
  orbitWrapper.add(model);
  //orbitWrapper.rotation.z = Math.PI / 6; // 30° tilt
orbitWrapper.rotation.x = Math.PI / 12; // optional Y-axis tilt too

  scene.add(orbitWrapper);

  model.traverse((child) => {
    if (child.isMesh) {
      child.material.emissive = new THREE.Color(0x000000);
      child.material.emissiveIntensity = 0;
    }
  });

  projects.push({ mesh: model, obj: orbitWrapper });
}, undefined, (error) => {
  console.error('Error loading film camera model:', error);
});



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




window.addEventListener('click', async (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(projects.map(p => p.mesh));

  if (intersects.length > 0) {
    let obj = intersects[0].object;
while (obj && !projects.find(p => p.mesh === obj)) {
  obj = obj.parent;
}
    focusedProject = obj;
    paused = true;

    // Fetch all projects and find the matching one by title
    const res = await fetch('http://localhost:3001/api/projects');
    const projectData = await res.json();
   const match = projectData.find(p => p.title === obj.name);
   console.log("Clicked object:", obj.name);
console.log("Matched project:", match?.title || "No match found");

    if (match) {
      document.getElementById('panelTitle').textContent = match.title;
      document.getElementById('panelSubtitle').textContent = match.short;
document.getElementById('panelImage').src = `http://localhost:3001${match.images[0] || ''}`;
document.getElementById('panelDescription').textContent = match.long;
document.getElementById('seeMoreBtn').textContent = match.button1 || 'See More';
document.getElementById('playGameBtn').textContent = match.button2 || 'Play Game';

console.log('Clicked object name:', obj.name);
console.log('Project titles:', projectData.map(p => p.title));


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
    const pos = current.getWorldPosition(new THREE.Vector3()).clone().project(camera);

const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;

labelDiv.style.left = `${x}px`;
labelDiv.style.top = `${y - 40}px`; // slightly above the object

labelDiv.innerText = `${current.name.toUpperCase()}
Tech Stack: TBD
Description: Lorem ipsum dolor sit amet.`;



  } else {
    timeScale = 1.0;
    hoverTarget = null;
    labelDiv.innerText = '';


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


  orbit.update();
  renderer.render(scene, camera);
}

animate();

setTimeout(() => {
  const intro = document.getElementById('introText');
  intro.style.opacity = 0;
  setTimeout(() => intro.remove(), 2000); // remove from DOM after fade-out
}, 30000); // 60,000 ms = 1 min

document.getElementById('infoToggle').addEventListener('click', async () => {
  const panel = document.getElementById('infoPanelMini');
  panel.classList.toggle('show');

  // Only fetch once
  if (!panel.dataset.loaded) {
    const res = await fetch('http://localhost:3001/api/meta');
    const data = await res.json();
    console.log("Fetched project data:", projectData);

    panel.innerHTML = `
  <p><strong>Connect with me</strong></p>
  <div class="social-links">
    <a href="${data.socials.github}" target="_blank"><i class="fab fa-github"></i></a>
    <a href="${data.socials.linkedin}" target="_blank"><i class="fab fa-linkedin"></i></a>
    <a href="${data.socials.email}"><i class="fas fa-envelope"></i></a>
    <a href="${data.socials.youtube}" target="_blank"><i class="fab fa-youtube"></i></a>
    <a href="${data.socials.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>
  </div>
  <a href="${data.resume}" download class="resume-link">Download Resume</a>
`;

    panel.dataset.loaded = 'true';
  }
});



window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
