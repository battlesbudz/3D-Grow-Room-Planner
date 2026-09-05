import {
  ArcRotateCamera,
  Color3,
  Color4,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  SceneLoader,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import './styles.css';

type PlannerObject = {
  id: string;
  kind: 'rack' | 'light' | 'model';
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
};

const room = { width: 25, depth: 14, height: 12 };
const objects: PlannerObject[] = [];
const state = { mode: '3d' as '2d' | '3d', scene: null as Scene | null, modelCount: 0 };

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <div><span class="eyebrow">BATTLES BUDZ</span><h1>3D Grow Room Planner</h1></div>
      <div class="actions"><label class="button secondary">Import GLB<input id="model-input" type="file" accept=".glb,.gltf" hidden /></label><button id="scan-button" class="button">Scanner foundation</button></div>
    </header>
    <section class="workspace">
      <aside class="sidebar">
        <div class="panel"><div class="panel-title">Room</div><div class="metric"><span>Footprint</span><strong>${room.width} × ${room.depth} ft</strong></div><div class="metric"><span>Ceiling</span><strong>${room.height} ft</strong></div><button id="add-rack" class="wide-button">＋ Add double rack</button><button id="add-light" class="wide-button">＋ Add grow light</button></div>
        <div class="panel"><div class="panel-title">Planning checks</div><div class="check"><i class="ok"></i> Walkway clearance</div><div class="check"><i class="warn"></i> Light coverage pending</div><div class="check"><i class="ok"></i> Room scale calibrated</div></div>
        <div class="panel scanner-card"><div class="panel-title">Scanner</div><p>ARCore capture → RTAB-Map reconstruction → Open3D cleanup.</p><span class="status">Not connected</span></div>
      </aside>
      <section class="canvas-wrap"><div class="view-tabs"><button data-mode="3d" class="active">3D view</button><button data-mode="2d">2D plan</button><span id="model-status">No imported models</span></div><div class="viewport"><canvas id="render-canvas"></canvas><canvas id="plan-canvas"></canvas><div id="empty-state"><strong>Start your room plan</strong><span>Import a GLB model or add racks and lights.</span></div></div></section>
    </section>
    <footer class="statusbar"><span id="footer-status">Ready for room planning</span><span>Prototype foundation · v0.1.0</span></footer>
  </main>`;

const renderCanvas = document.querySelector<HTMLCanvasElement>('#render-canvas')!;
const planCanvas = document.querySelector<HTMLCanvasElement>('#plan-canvas')!;
const emptyState = document.querySelector<HTMLDivElement>('#empty-state')!;
const footerStatus = document.querySelector<HTMLSpanElement>('#footer-status')!;
const modelStatus = document.querySelector<HTMLSpanElement>('#model-status')!;

function createScene() {
  const engine = new Engine(renderCanvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.035, 0.055, 0.05, 1);
  const camera = new ArcRotateCamera('camera', -Math.PI / 3, Math.PI / 3.1, 33, new Vector3(0, 4, 0), scene);
  camera.attachControl(renderCanvas, true);
  camera.lowerRadiusLimit = 8; camera.upperRadiusLimit = 70;
  new HemisphericLight('room-light', new Vector3(0, 1, 0), scene).intensity = 0.9;
  const floor = MeshBuilder.CreateGround('floor', { width: room.width, height: room.depth }, scene);
  const mat = new StandardMaterial('floor-material', scene); mat.diffuseColor = Color3.FromHexString('#26352d'); floor.material = mat;
  const wallMat = new StandardMaterial('wall-material', scene); wallMat.diffuseColor = Color3.FromHexString('#46564b'); wallMat.alpha = 0.28;
  for (const [name, pos, size] of [['back', [0, room.height / 2, -room.depth / 2], [room.width, room.height, 0.1]], ['left', [-room.width / 2, room.height / 2, 0], [0.1, room.height, room.depth]]] as const) {
    const wall = MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene); wall.position = new Vector3(pos[0], pos[1], pos[2]); wall.material = wallMat;
  }
  state.scene = scene;
  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
}

function drawPlan() {
  const ctx = planCanvas.getContext('2d')!;
  const scale = Math.min(planCanvas.width / (room.width + 4), planCanvas.height / (room.depth + 4));
  const ox = (planCanvas.width - room.width * scale) / 2;
  const oy = (planCanvas.height - room.depth * scale) / 2;
  ctx.clearRect(0, 0, planCanvas.width, planCanvas.height); ctx.fillStyle = '#0d1712'; ctx.fillRect(0, 0, planCanvas.width, planCanvas.height);
  ctx.strokeStyle = '#63846b'; ctx.lineWidth = 2; ctx.strokeRect(ox, oy, room.width * scale, room.depth * scale);
  ctx.strokeStyle = '#294b35'; ctx.lineWidth = 1;
  for (let x = 0; x <= room.width; x++) { ctx.beginPath(); ctx.moveTo(ox + x * scale, oy); ctx.lineTo(ox + x * scale, oy + room.depth * scale); ctx.stroke(); }
  for (let z = 0; z <= room.depth; z++) { ctx.beginPath(); ctx.moveTo(ox, oy + z * scale); ctx.lineTo(ox + room.width * scale, oy + z * scale); ctx.stroke(); }
  for (const item of objects) { ctx.fillStyle = item.kind === 'light' ? '#d8e86b' : '#68c589'; ctx.fillRect(ox + (item.x + room.width / 2 - item.width / 2) * scale, oy + (item.z + room.depth / 2 - item.depth / 2) * scale, item.width * scale, item.depth * scale); }
  ctx.fillStyle = '#cde9d1'; ctx.font = '16px sans-serif'; ctx.fillText(`${room.width} ft`, ox + room.width * scale / 2 - 25, oy - 12); ctx.fillText(`${room.depth} ft`, ox + room.width * scale + 12, oy + room.depth * scale / 2);
}

function addObject(kind: PlannerObject['kind']) {
  const index = objects.filter((item) => item.kind === kind).length;
  const item: PlannerObject = kind === 'rack'
    ? { id: crypto.randomUUID(), kind, name: `Double rack ${index + 1}`, x: -6 + (index % 2) * 12, z: -2, width: 8, depth: 3, height: 7 }
    : { id: crypto.randomUUID(), kind, name: `Grow light ${index + 1}`, x: -6 + (index % 2) * 12, z: -2, width: 4, depth: 2, height: 0.3 };
  objects.push(item); drawPlan(); emptyState.hidden = true; footerStatus.textContent = `${item.name} added to the plan`;
}

async function importModel(file: File) {
  if (!state.scene) return;
  const url = URL.createObjectURL(file);
  try {
    const result = await SceneLoader.ImportMeshAsync('', url, '', state.scene, undefined, '.glb');
    const root = result.meshes[0]; root.position = new Vector3(0, 0, 0); root.scaling = new Vector3(1, 1, 1);
    state.modelCount += 1; modelStatus.textContent = `${state.modelCount} imported model${state.modelCount === 1 ? '' : 's'}`; emptyState.hidden = true; footerStatus.textContent = `Imported ${file.name}`;
  } catch (error) { footerStatus.textContent = `Could not import ${file.name}`; console.error(error); }
  URL.revokeObjectURL(url);
}

function setMode(mode: '2d' | '3d') {
  state.mode = mode; document.querySelectorAll<HTMLButtonElement>('.view-tabs button').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
  renderCanvas.style.display = mode === '3d' ? 'block' : 'none'; planCanvas.style.display = mode === '2d' ? 'block' : 'none'; emptyState.style.display = mode === '3d' && state.modelCount === 0 && objects.length === 0 ? 'grid' : 'none';
  if (mode === '2d') { planCanvas.width = planCanvas.clientWidth * devicePixelRatio; planCanvas.height = planCanvas.clientHeight * devicePixelRatio; drawPlan(); }
}

createScene();
document.querySelector<HTMLInputElement>('#model-input')!.addEventListener('change', (event) => { const file = (event.target as HTMLInputElement).files?.[0]; if (file) void importModel(file); });
document.querySelector('#add-rack')!.addEventListener('click', () => addObject('rack'));
document.querySelector('#add-light')!.addEventListener('click', () => addObject('light'));
document.querySelector('#scan-button')!.addEventListener('click', () => { footerStatus.textContent = 'Scanner bridge planned: ARCore capture will connect here'; });
document.querySelectorAll<HTMLButtonElement>('.view-tabs button').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode as '2d' | '3d')));
setMode('3d');
