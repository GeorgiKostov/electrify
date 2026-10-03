import * as THREE from 'three';
import type { State, DayResult, Node, StepResult, Tier } from '../game/types';
import { buildTree, supportsTier, type Tree } from '../sim/network';
import { groundAt, panOffset, zoomAt, wheelFactor } from './navigation';
const colours = {
  meadow: 0xa9c79a,
  soil: 0x8a6a4f,
  roof: 0xd9785b,
  wall: 0xf3ede2,
  road: 0xc9ccc6,
  river: 0x6fb3d2,
  tree: 0x7fa88a,
  lv: 0x8b6a4a,
  mv: 0xbfc4c6,
  cable: 0x34424d,
  battery: 0xeef1ef,
  solar: 0x2f4a73,
  spark: 0xffd23f,
  over: 0xe5484d,
  busy: 0xf28c28,
  off: 0x778a88,
};
const mat = (c: number, emissive = 0) =>
  new THREE.MeshLambertMaterial({ color: c, emissive });
export class World {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-16, 16, 10, -10, 0.1, 200);
  group = new THREE.Group();
  pulses = new THREE.Group();
  ghost = new THREE.Group();
  grid = new THREE.Group();
  ports = new THREE.Group();
  nodes: Node[] = [];
  state?: State;
  tree?: Tree;
  result?: DayResult;
  step = 72;
  selected?: string;
  panX = 0;
  panZ = 0;
  zoom = 1;
  raycaster = new THREE.Raycaster();
  ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  mouse = new THREE.Vector2();
  baseSpan = 27;
  reduced = false;
  paused = false;
  frameRect = {
    left: 12,
    top: 140,
    width: innerWidth - 24,
    height: innerHeight - 330,
  };
  onViewChange?: () => void;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = null;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x879c99, 2));
    const sun = new THREE.DirectionalLight(0xfff1db, 2.3);
    sun.position.set(-8, 24, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;
    this.scene.add(sun);
    this.scene.add(this.group, this.pulses, this.grid, this.ports, this.ghost);
    this.resize();
    addEventListener('resize', () => this.resize());
    this.frame();
  }
  setFrame(frame: {
    left: number;
    top: number;
    width: number;
    height: number;
  }) {
    this.frameRect = frame;
  }
  bounds() {
    return this.state?.stage === 1
      ? { x0: 0, x1: 12, z0: 3, z1: 15 }
      : { x0: -0.5, x1: 24.5, z0: -0.5, z1: 18.5 };
  }
  corners() {
    const b = this.bounds();
    return [b.x0, b.x1].flatMap((x) =>
      [b.z0, b.z1].flatMap((z) =>
        [-0.65, 2.4].map((y) => new THREE.Vector3(x, y, z)),
      ),
    );
  }
  resize() {
    const w = innerWidth,
      h = innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.left = (-this.baseSpan * aspect) / 2;
    this.camera.right = (this.baseSpan * aspect) / 2;
    this.camera.top = this.baseSpan / 2;
    this.camera.bottom = -this.baseSpan / 2;
    this.camera.updateProjectionMatrix();
    this.updateCamera();
  }
  updateCamera(notify = true) {
    const b = this.bounds(),
      target = new THREE.Vector3(
        (b.x0 + b.x1) / 2 + this.panX,
        0,
        (b.z0 + b.z1) / 2 + this.panZ,
      );
    this.camera.position.copy(target).add(new THREE.Vector3(27, 30, 27));
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld(true);
    if (notify) this.onViewChange?.();
  }
  groundPoint(clientX: number, clientY: number) {
    return groundAt(this.camera, this.canvas.getBoundingClientRect(), {
      x: clientX,
      y: clientY,
    });
  }
  panBetween(from: { x: number; y: number }, to: { x: number; y: number }) {
    const delta = panOffset(
      this.camera,
      this.canvas.getBoundingClientRect(),
      from,
      to,
    );
    this.panX += delta.x;
    this.panZ += delta.z;
    this.updateCamera();
  }
  pan(dx: number, dy: number) {
    const f = this.frameRect,
      from = { x: f.left + f.width / 2, y: f.top + f.height / 2 };
    this.panBetween(from, { x: from.x + dx, y: from.y + dy });
  }
  scale(
    factor: number,
    x = this.frameRect.left + this.frameRect.width / 2,
    y = this.frameRect.top + this.frameRect.height / 2,
  ) {
    const delta = zoomAt(
      this.camera,
      this.canvas.getBoundingClientRect(),
      factor,
      { x, y },
    );
    this.zoom = this.camera.zoom;
    this.panX += delta.x;
    this.panZ += delta.z;
    this.onViewChange?.();
  }
  wheel(delta: number, mode: number, x: number, y: number) {
    this.scale(wheelFactor(delta, mode, this.canvas.clientHeight), x, y);
  }
  fit() {
    this.panX = 0;
    this.panZ = 0;
    this.zoom = 1;
    this.camera.zoom = 1;
    this.updateCamera(false);
    const points = this.corners().map((p) =>
        p.applyMatrix4(this.camera.matrixWorldInverse),
      ),
      width =
        Math.max(...points.map((p) => p.x)) -
        Math.min(...points.map((p) => p.x)),
      height =
        Math.max(...points.map((p) => p.y)) -
        Math.min(...points.map((p) => p.y)),
      f = this.frameRect;
    this.baseSpan =
      Math.max(
        (height * innerHeight) / f.height,
        (width * innerHeight) / f.width,
      ) * 1.04;
    this.resize();
    this.panBetween(
      { x: innerWidth / 2, y: innerHeight / 2 },
      { x: f.left + f.width / 2, y: f.top + f.height / 2 },
    );
  }
  cover(state: State, result: DayResult) {
    this.draw(state, result, 50);
    this.fit();
    this.renderer.render(this.scene, this.camera);
    const points = this.corners().map((p) => p.project(this.camera)),
      xs = points.map((p) => ((p.x + 1) * this.canvas.width) / 2),
      ys = points.map((p) => ((1 - p.y) * this.canvas.height) / 2),
      x = Math.max(0, Math.min(...xs) - 8),
      y = Math.max(0, Math.min(...ys) - 8),
      width = Math.min(this.canvas.width - x, Math.max(...xs) - x + 8),
      height = Math.min(this.canvas.height - y, Math.max(...ys) - y + 8),
      image = document.createElement('canvas');
    image.width = 600;
    image.height = Math.round((600 * height) / width);
    image
      .getContext('2d')!
      .drawImage(
        this.canvas,
        x,
        y,
        width,
        height,
        0,
        0,
        image.width,
        image.height,
      );
    return image.toDataURL('image/png');
  }
  tile(clientX: number, clientY: number) {
    const p = this.groundPoint(clientX, clientY);
    return p ? { x: Math.round(p.x), z: Math.round(p.z) } : undefined;
  }
  pick(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((clientY - rect.top) / rect.height) * 2,
    );
    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.group.updateMatrixWorld(true);
    for (const hit of this.raycaster.intersectObjects(
      this.group.children,
      true,
    )) {
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        if (object.userData.nodeId) return object.userData.nodeId as string;
        object = object.parent;
      }
    }
  }
  portPoint(node: Node, tier: Tier) {
    return new THREE.Vector3(
      node.x +
        (node.kind === 'transformer' ? (tier === 'MV' ? 0.35 : -0.35) : 0),
      node.kind === 'transformer' ? (tier === 'MV' ? 2.25 : 1.25) : 1.35,
      node.z,
    );
  }
  pickPort(clientX: number, clientY: number, tier: Tier, touch = false) {
    if (!this.state) return;
    const rect = this.canvas.getBoundingClientRect();
    let found: string | undefined,
      best = touch ? 24 : 17;
    for (const n of this.state.nodes) {
      if (n.kind === 'site') continue;
      const p = this.portPoint(n, tier).project(this.camera),
        distance = Math.hypot(
          clientX - (rect.left + ((p.x + 1) * rect.width) / 2),
          clientY - (rect.top + ((1 - p.y) * rect.height) / 2),
        );
      if (distance < best) {
        best = distance;
        found = n.id;
      }
    }
    return found ?? this.pick(clientX, clientY);
  }
  project(x: number, z: number, height = 1.4) {
    const p = new THREE.Vector3(x, height, z).project(this.camera),
      rect = this.canvas.getBoundingClientRect();
    return {
      x: rect.left + ((p.x + 1) * rect.width) / 2,
      y: rect.top + ((1 - p.y) * rect.height) / 2,
    };
  }
  box(
    parent: THREE.Group,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    c: number,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  clear(group: THREE.Group) {
    group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
        o.geometry.dispose();
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of materials) m.dispose();
      }
    });
    group.clear();
  }
  draw(state: State, result: DayResult, step: number, selected?: string) {
    if (this.state !== state) this.tree = buildTree(state);
    this.state = state;
    this.result = result;
    this.step = step;
    this.selected = selected;
    this.clear(this.group);
    this.clear(this.pulses);
    const current = result.steps[step];
    const night = step >= 72 || step < 24;
    this.scene.background = null;
    const early = state.stage === 1,
      cx = early ? 6 : 12,
      w = early ? 12 : 25,
      d = early ? 12 : 19;
    this.box(this.group, cx, -0.62, 9, w, 1.2, d, colours.soil);
    this.box(this.group, cx, 0.005, 9, w, 0.08, d, colours.meadow);
    this.box(this.group, cx, 0.055, 9, w - 1, 0.035, 1, colours.road);
    if (!early)
      this.box(this.group, 12, 0.06, 4.8, 1.15, 0.04, 9, colours.river);
    for (const [x, z] of [
      [2, 3],
      [4, 14],
      [11, 3],
      [12, 16],
      [21, 4],
      [23, 8],
      [3, 6],
      [13, 3],
      [2, 16],
      [10, 15],
    ] as [number, number][]) {
      if (early && (x > 11 || z < 3 || z > 15)) continue;
      this.box(this.group, x, 0.24, z, 0.18, 0.48, 0.18, colours.lv);
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 1.4, 6),
        mat(colours.tree),
      );
      leaf.position.set(x, 0.9, z);
      leaf.castShadow = true;
      this.group.add(leaf);
    }
    for (const line of state.lines) {
      const a = state.nodes.find((n) => n.id === line.a),
        b = state.nodes.find((n) => n.id === line.b);
      if (!a || !b) continue;
      const flow = current.flow[line.id] ?? 0,
        loading = current.loading[line.id] ?? 0,
        tripped = current.trips.includes(line.id);
      const height = line.tier === 'MV' ? 1.8 : 0.9;
      const p = new THREE.Vector3(a.x, height, a.z),
        q = new THREE.Vector3(b.x, height, b.z);
      const colour =
        tripped || loading > 1
          ? colours.over
          : loading >= 0.8
            ? colours.busy
            : colours.cable;
      this.cable(p, q, colour, line.tier === 'MV' ? 0.052 : 0.035);
      if (line.tier === 'MV') {
        this.cable(
          p.clone().add(new THREE.Vector3(0, 0.13, 0.12)),
          q.clone().add(new THREE.Vector3(0, 0.13, 0.12)),
          colour,
          0.025,
        );
        this.cable(
          p.clone().add(new THREE.Vector3(0, -0.13, -0.12)),
          q.clone().add(new THREE.Vector3(0, -0.13, -0.12)),
          colour,
          0.025,
        );
      }
      if (flow !== 0 && !tripped) {
        const pa = a.kind === 'transformer' ? `${a.id}:${line.tier}` : a.id,
          pb = b.kind === 'transformer' ? `${b.id}:${line.tier}` : b.id,
          forward = this.tree?.parent[pb] === pa;
        const count = Math.max(1, Math.min(6, Math.round(Math.abs(flow) / 8)));
        for (let i = 0; i < count; i++) {
          const dot = new THREE.Mesh(
            new THREE.SphereGeometry(0.075, 6, 4),
            new THREE.MeshBasicMaterial({ color: colours.spark }),
          );
          dot.userData = {
            a: p,
            b: q,
            index: i,
            count,
            flow: forward ? flow : -flow,
          };
          this.pulses.add(dot);
        }
      }
    }
    for (const node of state.nodes) {
      const g = this.model(node, current, night);
      g.position.set(node.x, 0, node.z);
      g.userData.nodeId = node.id;
      this.group.add(g);
      if (selected === node.id) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.68, 0.035, 5, 32),
          new THREE.MeshBasicMaterial({ color: 0x1d6a8c }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.1;
        g.add(ring);
      }
    }
  }
  model(node: Node, current?: StepResult, night = false) {
    const g = new THREE.Group();
    g.scale.set(0.84, 1, 0.84);
    const powered = current?.served[node.id] ?? true,
      active = powered || node.kind === 'grid' || node.kind === 'transformer';
    if (node.kind === 'site') {
      this.box(g, 0, 0.13, 0, 1.2, 0.12, 1.2, colours.road);
      return g;
    }
    if (
      node.kind === 'home' ||
      node.kind === 'cafe' ||
      node.kind === 'workshop'
    ) {
      const width = node.kind === 'home' ? 0.76 : 1.02;
      this.box(
        g,
        0,
        0.46,
        0,
        width,
        0.8,
        width,
        active ? colours.wall : colours.off,
      );
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(width * 0.68, 0.55, 4),
        mat(colours.roof),
      );
      roof.position.y = 1.14;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      g.add(roof);
      if (night && active)
        this.box(
          g,
          -width * 0.24,
          0.5,
          width / 2 + 0.013,
          0.22,
          0.23,
          0.025,
          colours.spark,
        );
    } else if (node.kind === 'grid') {
      this.box(g, 0, 0.45, 0, 1.2, 0.9, 1.2, colours.mv);
      this.box(g, 0, 1.1, 0, 1.5, 0.3, 1.5, colours.cable);
    } else if (node.kind === 'transformer') {
      this.box(
        g,
        0,
        node.size === 'L' ? 1.1 : 0.85,
        0,
        0.14,
        node.size === 'L' ? 2.2 : 1.7,
        0.14,
        colours.mv,
      );
      this.box(
        g,
        0,
        node.size === 'L' ? 1.9 : 1.5,
        0,
        0.95,
        0.5,
        0.7,
        colours.mv,
      );
      this.box(g, 0, 2.3, 0, 1.15, 0.08, 0.08, colours.cable);
      const loading = current?.loading[`tx:${node.id}`] ?? 0;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(
          0.59,
          0.065,
          5,
          32,
          Math.PI * 2 * Math.min(1, loading),
        ),
        new THREE.MeshBasicMaterial({
          color:
            loading > 1
              ? colours.over
              : loading > 0.8
                ? colours.busy
                : colours.cable,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.11;
      g.add(ring);
    } else if (node.kind === 'solar') {
      this.box(g, 0, 0.19, 0, 1.65, 0.13, 1.45, colours.solar);
      for (let j = -1; j <= 1; j++)
        this.box(g, j * 0.43, 0.28, 0, 0.025, 0.03, 1.25, colours.mv);
    } else if (node.kind === 'batteryQuick' || node.kind === 'batteryLong') {
      const w = node.kind === 'batteryQuick' ? 0.85 : 1.3;
      this.box(g, 0, 0.48, 0, w, 0.95, 0.8, colours.battery);
      const e = current?.socKWh[node.id] ?? 0,
        cap = node.kind === 'batteryQuick' ? 10 : 40;
      this.box(
        g,
        0,
        0.2,
        0.415,
        w * 0.72,
        0.13,
        0.015,
        e > 0 ? 0x34b27b : colours.off,
      );
      for (let i = 0; i < 5; i++)
        if (e / cap > (i + 0.1) / 5)
          this.box(
            g,
            -w * 0.28 + i * w * 0.14,
            0.64,
            0.42,
            w * 0.1,
            0.15,
            0.02,
            0x34b27b,
          );
    } else if (node.kind === 'ev') {
      this.box(g, 0, 0.28, 0, 0.85, 0.33, 0.42, colours.wall);
      this.box(g, 0, 0.53, 0, 0.45, 0.26, 0.38, colours.solar);
    }
    return g;
  }
  cable(a: THREE.Vector3, b: THREE.Vector3, c: number, r: number) {
    const direction = b.clone().sub(a),
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, direction.length(), 5),
        mat(c),
      );
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
    this.group.add(mesh);
  }
  showGrid(visible: boolean) {
    this.grid.visible = visible;
    if (!visible) return;
    this.clear(this.grid);
    const b = this.bounds(),
      points: THREE.Vector3[] = [];
    for (let x = Math.ceil(b.x0 + 0.5); x - 0.5 <= b.x1; x++)
      points.push(
        new THREE.Vector3(x - 0.5, 0.065, b.z0),
        new THREE.Vector3(x - 0.5, 0.065, b.z1),
      );
    for (let z = Math.ceil(b.z0 + 0.5); z - 0.5 <= b.z1; z++)
      points.push(
        new THREE.Vector3(b.x0, 0.065, z - 0.5),
        new THREE.Vector3(b.x1, 0.065, z - 0.5),
      );
    this.grid.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: 0x496958,
          transparent: true,
          opacity: 0.28,
        }),
      ),
    );
  }
  showPorts(
    nodes: Node[],
    tier?: Tier,
    source?: string,
    status?: Map<string, boolean>,
  ) {
    this.clear(this.ports);
    if (!tier) return;
    for (const node of nodes) {
      if (node.kind === 'site') continue;
      const valid = status?.get(node.id) ?? supportsTier(node, tier),
        colour = node.id === source ? 0x1d6a8c : valid ? 0x278d5a : 0x778a88;
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(node.id === source ? 0.17 : 0.12, 10, 6),
        new THREE.MeshBasicMaterial({ color: colour, depthTest: false }),
      );
      marker.position.copy(this.portPoint(node, tier));
      marker.renderOrder = 3;
      marker.userData = { nodeId: node.id, colour };
      this.ports.add(marker);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.21, 0.025, 5, 20),
        new THREE.MeshBasicMaterial({ color: colour, depthTest: false }),
      );
      ring.position.copy(marker.position);
      ring.quaternion.copy(this.camera.quaternion);
      ring.renderOrder = 3;
      ring.userData = { nodeId: node.id, colour };
      this.ports.add(ring);
    }
  }
  highlightPort(id?: string, valid = true) {
    for (const object of this.ports.children) {
      const mesh = object as THREE.Mesh<
        THREE.BufferGeometry,
        THREE.MeshBasicMaterial
      >;
      mesh.material.color.setHex(
        mesh.userData.nodeId === id
          ? valid
            ? 0x278d5a
            : colours.over
          : mesh.userData.colour,
      );
    }
  }
  showGhost(
    x: number,
    z: number,
    node: Pick<Node, 'kind' | 'size'>,
    valid: boolean,
  ) {
    this.clear(this.ghost);
    const g = this.model({ ...node, id: 'ghost', x, z });
    g.position.set(x, 0, z);
    g.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const old = object.material as THREE.Material;
        old.dispose();
        object.material = new THREE.MeshBasicMaterial({
          color: valid ? 0x278d5a : colours.over,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        });
      }
    });
    this.ghost.add(g);
    const square = new THREE.Mesh(
      new THREE.PlaneGeometry(0.94, 0.94),
      new THREE.MeshBasicMaterial({
        color: valid ? 0x278d5a : colours.over,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
      }),
    );
    square.rotation.x = -Math.PI / 2;
    square.position.set(x, 0.09, z);
    this.ghost.add(square);
  }
  showLineGhost(
    a?: Node,
    b?: Node | { x: number; z: number },
    valid = false,
    tier: Tier = 'LV',
  ) {
    this.clear(this.ghost);
    if (!a || !b) return;
    const p = this.portPoint(a, tier),
      q =
        'kind' in b
          ? this.portPoint(b, tier)
          : new THREE.Vector3(b.x, 1.15, b.z),
      direction = q.clone().sub(p);
    if (direction.length() < 0.01) return;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, direction.length(), 5),
      new THREE.MeshBasicMaterial({
        color: valid ? 0x278d5a : 'kind' in b ? colours.over : colours.off,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
      }),
    );
    mesh.position.copy(p).add(q).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
    mesh.renderOrder = 2;
    this.ghost.add(mesh);
  }
  clearGhost() {
    this.clear(this.ghost);
  }
  frame() {
    requestAnimationFrame(() => this.frame());
    const seconds = performance.now() * 0.001;
    for (const dot of this.pulses.children) {
      const d = dot.userData as {
        a: THREE.Vector3;
        b: THREE.Vector3;
        index: number;
        count: number;
        flow: number;
      };
      const phase =
        this.reduced || this.paused
          ? d.index / d.count
          : (seconds * 0.35 + d.index / d.count) % 1;
      dot.position.copy(d.a).lerp(d.b, d.flow >= 0 ? phase : 1 - phase);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
