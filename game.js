import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

const statusEl = document.getElementById("status");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b17);
scene.fog = new THREE.Fog(0x070b17, 10, 35);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0x99bbff, 0x222233, 0.8);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.7);
dir.position.set(4, 8, 2);
scene.add(dir);

const roomSize = 16;
const wallHeight = 4;

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(roomSize, roomSize),
  new THREE.MeshStandardMaterial({ color: 0x10192d, metalness: 0.2, roughness: 0.9 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

function wall(w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: 0x2a3454, roughness: 0.85 })
  );
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}

wall(roomSize, wallHeight, 0.5, 0, wallHeight / 2, -roomSize / 2);
wall(roomSize, wallHeight, 0.5, 0, wallHeight / 2, roomSize / 2);
wall(0.5, wallHeight, roomSize, -roomSize / 2, wallHeight / 2, 0);
const rightWall = wall(0.5, wallHeight, roomSize, roomSize / 2, wallHeight / 2, 0);

const puzzleBlocks = [];
function addBlock(x, z, sx, sy, sz, color = 0x39466d) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95 })
  );
  mesh.position.set(x, sy / 2, z);
  scene.add(mesh);
  puzzleBlocks.push({ mesh, sx, sz });
}

addBlock(0, 0, 2, 2, 2);
addBlock(-4.2, 3.8, 1.5, 1.7, 1.5);
addBlock(-1.6, -3.8, 1.5, 1.7, 1.5);
addBlock(3.8, 3.8, 1.5, 1.7, 1.5);

const plateMaterialOff = new THREE.MeshStandardMaterial({ color: 0x394239, emissive: 0x111111 });
const plateMaterialOn = new THREE.MeshStandardMaterial({ color: 0x8aff9f, emissive: 0x2b8040 });

function addPlate(x, z) {
  const plate = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 1.7), plateMaterialOff.clone());
  plate.position.set(x, 0.1, z);
  scene.add(plate);
  return plate;
}

const plates = [addPlate(-5.4, -5.2), addPlate(5.3, 5.2)];

const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x7db8ff, emissive: 0x17304d });
function addCube(x, z) {
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), cubeMaterial.clone());
  cube.position.set(x, 0.5, z);
  scene.add(cube);
  return cube;
}
const cubes = [addCube(-2.5, -5.0), addCube(4.8, -4.2)];

const door = new THREE.Mesh(
  new THREE.BoxGeometry(0.45, 2.4, 2.8),
  new THREE.MeshStandardMaterial({ color: 0xa33e3e, emissive: 0x290808 })
);
door.position.set(roomSize / 2 - 0.24, 1.2, 0);
scene.add(door);

const player = {
  position: new THREE.Vector3(-6, 1.05, 0),
  yaw: 0,
  pitch: 0,
  speed: 4.3,
  radius: 0.35,
};

camera.position.copy(player.position);

const keys = new Set();
let hasPointerLock = false;
let carrying = null;
let doorUnlocked = false;

const raycaster = new THREE.Raycaster();

const initialState = {
  cubes: cubes.map((c) => c.position.clone()),
  player: player.position.clone(),
};

function setStatus(message) {
  statusEl.textContent = message;
}

function aabbCollision(nextPos) {
  const halfRoom = roomSize / 2 - player.radius;
  if (nextPos.x < -halfRoom || nextPos.x > halfRoom || nextPos.z < -halfRoom || nextPos.z > halfRoom) {
    return true;
  }

  for (const block of puzzleBlocks) {
    const dx = Math.abs(nextPos.x - block.mesh.position.x);
    const dz = Math.abs(nextPos.z - block.mesh.position.z);
    if (dx < block.sx / 2 + player.radius && dz < block.sz / 2 + player.radius) {
      return true;
    }
  }

  if (!doorUnlocked) {
    const dx = Math.abs(nextPos.x - door.position.x);
    const dz = Math.abs(nextPos.z - door.position.z);
    if (dx < 0.5 + player.radius && dz < 1.45 + player.radius) {
      return true;
    }
  }

  return false;
}

function updatePlates() {
  let active = 0;

  for (let i = 0; i < plates.length; i += 1) {
    const plate = plates[i];
    const onPlate = cubes.some((cube) => {
      const dx = cube.position.x - plate.position.x;
      const dz = cube.position.z - plate.position.z;
      return Math.hypot(dx, dz) < 0.9;
    });
    plate.material = onPlate ? plateMaterialOn.clone() : plateMaterialOff.clone();
    if (onPlate) active += 1;
  }

  if (active === plates.length && !doorUnlocked) {
    doorUnlocked = true;
    door.material.color.set(0x45d07a);
    door.material.emissive.set(0x205a39);
    setStatus("Door unlocked! Walk through the right-side exit.");
  } else if (active !== plates.length && doorUnlocked) {
    doorUnlocked = false;
    door.material.color.set(0xa33e3e);
    door.material.emissive.set(0x290808);
    setStatus("Door relocked. Keep both cubes on glowing pads.");
  } else if (!doorUnlocked) {
    setStatus(`Door locked. Pads active: ${active}/${plates.length}.`);
  }
}

function lookTargetCube() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(cubes, false);
  if (!hits.length) return null;
  return hits[0].distance < 3.1 ? hits[0].object : null;
}

function interact() {
  if (carrying) {
    carrying.position.y = 0.5;
    carrying = null;
    setStatus("Cube dropped.");
    updatePlates();
    return;
  }

  const target = lookTargetCube();
  if (!target) {
    setStatus("No cube in reach.");
    return;
  }
  carrying = target;
  setStatus("Cube picked up. Press E again to drop.");
}

function resetGame() {
  cubes.forEach((cube, i) => cube.position.copy(initialState.cubes[i]));
  player.position.copy(initialState.player);
  camera.position.copy(player.position);
  carrying = null;
  doorUnlocked = false;
  door.material.color.set(0xa33e3e);
  door.material.emissive.set(0x290808);
  updatePlates();
}

document.body.addEventListener("click", () => {
  if (!hasPointerLock) {
    renderer.domElement.requestPointerLock();
  }
});

document.addEventListener("pointerlockchange", () => {
  hasPointerLock = document.pointerLockElement === renderer.domElement;
  setStatus(hasPointerLock ? "Explore and solve the room." : "Click to resume control.");
});

document.addEventListener("mousemove", (event) => {
  if (!hasPointerLock) return;
  const sensitivity = 0.0024;
  player.yaw -= event.movementX * sensitivity;
  player.pitch -= event.movementY * sensitivity;
  player.pitch = Math.max(-Math.PI / 2 + 0.03, Math.min(Math.PI / 2 - 0.03, player.pitch));
});

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);
  if (key === "e") interact();
  if (key === "r") resetGame();
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

function updateCarriedCube() {
  if (!carrying) return;

  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw)).normalize();
  const target = player.position.clone().add(forward.multiplyScalar(1.3));
  carrying.position.set(target.x, 0.9, target.z);
}

let previousTime = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - previousTime) / 1000, 0.05);
  previousTime = now;

  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  const move = new THREE.Vector3();
  if (keys.has("w")) move.add(forward);
  if (keys.has("s")) move.sub(forward);
  if (keys.has("d")) move.add(right);
  if (keys.has("a")) move.sub(right);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(player.speed * dt);
    const candidate = player.position.clone().add(move);
    if (!aabbCollision(candidate)) {
      player.position.copy(candidate);
    }
  }

  camera.position.copy(player.position);
  camera.rotation.order = "YXZ";
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  updateCarriedCube();
  updatePlates();

  if (doorUnlocked && player.position.x > roomSize / 2 + 0.8 && Math.abs(player.position.z) < 1.8) {
    setStatus("You escaped. Puzzle solved! Press R to play again.");
  }

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

setStatus("Click to start. Door is locked.");
animate(performance.now());
