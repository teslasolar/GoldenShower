# Golden Shower Engine Core

WebGL-based 3D engine for GoldenEye multiplayer reconstruction.

## Math Library

```javascript
/**
 * Vector3 class
 */
GoldenShower.Vec3 = class Vec3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  clone() {
    return new Vec3(this.x, this.y, this.z);
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  scale(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v) {
    const x = this.y * v.z - this.z * v.y;
    const y = this.z * v.x - this.x * v.z;
    const z = this.x * v.y - this.y * v.x;
    return new Vec3(x, y, z);
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  normalize() {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
      this.z /= len;
    }
    return this;
  }

  distanceTo(v) {
    const dx = v.x - this.x;
    const dy = v.y - this.y;
    const dz = v.z - this.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  lerp(v, t) {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    this.z += (v.z - this.z) * t;
    return this;
  }

  toArray() {
    return [this.x, this.y, this.z];
  }

  static fromArray(arr) {
    return new Vec3(arr[0], arr[1], arr[2]);
  }
};
```

## Matrix4 Library

```javascript
/**
 * 4x4 Matrix class
 */
GoldenShower.Mat4 = class Mat4 {
  constructor() {
    this.elements = new Float32Array(16);
    this.identity();
  }

  identity() {
    const e = this.elements;
    e[0] = 1; e[4] = 0; e[8]  = 0; e[12] = 0;
    e[1] = 0; e[5] = 1; e[9]  = 0; e[13] = 0;
    e[2] = 0; e[6] = 0; e[10] = 1; e[14] = 0;
    e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
    return this;
  }

  perspective(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    const e = this.elements;

    e[0] = f / aspect;
    e[1] = 0;
    e[2] = 0;
    e[3] = 0;
    e[4] = 0;
    e[5] = f;
    e[6] = 0;
    e[7] = 0;
    e[8] = 0;
    e[9] = 0;
    e[10] = (far + near) * nf;
    e[11] = -1;
    e[12] = 0;
    e[13] = 0;
    e[14] = (2 * far * near) * nf;
    e[15] = 0;

    return this;
  }

  lookAt(eye, target, up) {
    const z = new GoldenShower.Vec3(
      eye.x - target.x,
      eye.y - target.y,
      eye.z - target.z
    ).normalize();

    const x = up.clone().cross(z).normalize();
    const y = z.clone().cross(x);

    const e = this.elements;
    e[0] = x.x; e[4] = x.y; e[8]  = x.z; e[12] = -x.dot(eye);
    e[1] = y.x; e[5] = y.y; e[9]  = y.z; e[13] = -y.dot(eye);
    e[2] = z.x; e[6] = z.y; e[10] = z.z; e[14] = -z.dot(eye);
    e[3] = 0;   e[7] = 0;   e[11] = 0;   e[15] = 1;

    return this;
  }

  translate(x, y, z) {
    const e = this.elements;
    e[12] += e[0] * x + e[4] * y + e[8]  * z;
    e[13] += e[1] * x + e[5] * y + e[9]  * z;
    e[14] += e[2] * x + e[6] * y + e[10] * z;
    e[15] += e[3] * x + e[7] * y + e[11] * z;
    return this;
  }

  rotateY(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const e = this.elements;

    const e0 = e[0], e4 = e[4], e8 = e[8], e12 = e[12];
    const e2 = e[2], e6 = e[6], e10 = e[10], e14 = e[14];

    e[0] = e0 * c + e2 * s;
    e[4] = e4 * c + e6 * s;
    e[8] = e8 * c + e10 * s;
    e[12] = e12 * c + e14 * s;
    e[2] = e2 * c - e0 * s;
    e[6] = e6 * c - e4 * s;
    e[10] = e10 * c - e8 * s;
    e[14] = e14 * c - e12 * s;

    return this;
  }

  multiply(m) {
    const a = this.elements;
    const b = m.elements;
    const result = new Float32Array(16);

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] =
          a[j] * b[i * 4] +
          a[j + 4] * b[i * 4 + 1] +
          a[j + 8] * b[i * 4 + 2] +
          a[j + 12] * b[i * 4 + 3];
      }
    }

    this.elements = result;
    return this;
  }
};
```

## WebGL Renderer

```javascript
/**
 * WebGL Renderer
 */
GoldenShower.Renderer = class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    if (!this.gl) {
      throw new Error('WebGL not supported');
    }

    this.programs = {};
    this.buffers = {};
    this.textures = {};

    this.init();
  }

  init() {
    const gl = this.gl;

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // Create default shader
    this.programs.default = this.createProgram(
      GoldenShower.Shaders.defaultVertex,
      GoldenShower.Shaders.defaultFragment
    );

    // Create player shader (simple colored)
    this.programs.player = this.createProgram(
      GoldenShower.Shaders.playerVertex,
      GoldenShower.Shaders.playerFragment
    );
  }

  createProgram(vertexSrc, fragmentSrc) {
    const gl = this.gl;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vertexSrc);
    gl.compileShader(vs);

    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('Vertex shader error:', gl.getShaderInfoLog(vs));
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fragmentSrc);
    gl.compileShader(fs);

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('Fragment shader error:', gl.getShaderInfoLog(fs));
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
    }

    return program;
  }

  resize() {
    const canvas = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
  }

  clear(r = 0.1, g = 0.1, b = 0.15, a = 1) {
    const gl = this.gl;
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  setMatrices(program, projection, view, model) {
    const gl = this.gl;
    gl.useProgram(program);

    const pLoc = gl.getUniformLocation(program, 'uProjection');
    const vLoc = gl.getUniformLocation(program, 'uView');
    const mLoc = gl.getUniformLocation(program, 'uModel');

    gl.uniformMatrix4fv(pLoc, false, projection.elements);
    gl.uniformMatrix4fv(vLoc, false, view.elements);
    gl.uniformMatrix4fv(mLoc, false, model.elements);
  }

  createMesh(vertices, indices) {
    const gl = this.gl;

    const vao = gl.createVertexArray
      ? gl.createVertexArray()
      : null;

    if (vao) gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    // Position attribute (3 floats)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);

    // Normal attribute (3 floats)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);

    if (vao) gl.bindVertexArray(null);

    return { vao, vbo, ebo, indexCount: indices.length };
  }

  drawMesh(mesh) {
    const gl = this.gl;

    if (mesh.vao) {
      gl.bindVertexArray(mesh.vao);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ebo);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    }

    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
  }
};
```

## Shaders

```javascript
/**
 * Shader sources
 */
GoldenShower.Shaders = {
  defaultVertex: `
    attribute vec3 aPosition;
    attribute vec3 aNormal;

    uniform mat4 uProjection;
    uniform mat4 uView;
    uniform mat4 uModel;

    varying vec3 vNormal;
    varying vec3 vWorldPos;

    void main() {
      vec4 worldPos = uModel * vec4(aPosition, 1.0);
      vWorldPos = worldPos.xyz;
      vNormal = mat3(uModel) * aNormal;
      gl_Position = uProjection * uView * worldPos;
    }
  `,

  defaultFragment: `
    precision mediump float;

    varying vec3 vNormal;
    varying vec3 vWorldPos;

    uniform vec3 uColor;
    uniform vec3 uLightDir;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(uLightDir);
      float diff = max(dot(normal, lightDir), 0.0);
      float ambient = 0.3;
      vec3 color = uColor * (ambient + diff * 0.7);
      gl_FragColor = vec4(color, 1.0);
    }
  `,

  playerVertex: `
    attribute vec3 aPosition;
    attribute vec3 aNormal;

    uniform mat4 uProjection;
    uniform mat4 uView;
    uniform mat4 uModel;

    varying vec3 vNormal;

    void main() {
      vNormal = mat3(uModel) * aNormal;
      gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
    }
  `,

  playerFragment: `
    precision mediump float;

    varying vec3 vNormal;
    uniform vec3 uPlayerColor;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
      float diff = max(dot(normal, lightDir), 0.0);
      vec3 color = uPlayerColor * (0.3 + diff * 0.7);
      gl_FragColor = vec4(color, 1.0);
    }
  `
};
```

## Primitive Meshes

```javascript
/**
 * Primitive mesh generators
 */
GoldenShower.Primitives = {
  /**
   * Create a box mesh
   */
  box(width = 1, height = 1, depth = 1) {
    const w = width / 2, h = height / 2, d = depth / 2;

    const vertices = [
      // Front
      -w, -h,  d,  0,  0,  1,
       w, -h,  d,  0,  0,  1,
       w,  h,  d,  0,  0,  1,
      -w,  h,  d,  0,  0,  1,
      // Back
       w, -h, -d,  0,  0, -1,
      -w, -h, -d,  0,  0, -1,
      -w,  h, -d,  0,  0, -1,
       w,  h, -d,  0,  0, -1,
      // Top
      -w,  h,  d,  0,  1,  0,
       w,  h,  d,  0,  1,  0,
       w,  h, -d,  0,  1,  0,
      -w,  h, -d,  0,  1,  0,
      // Bottom
      -w, -h, -d,  0, -1,  0,
       w, -h, -d,  0, -1,  0,
       w, -h,  d,  0, -1,  0,
      -w, -h,  d,  0, -1,  0,
      // Right
       w, -h,  d,  1,  0,  0,
       w, -h, -d,  1,  0,  0,
       w,  h, -d,  1,  0,  0,
       w,  h,  d,  1,  0,  0,
      // Left
      -w, -h, -d, -1,  0,  0,
      -w, -h,  d, -1,  0,  0,
      -w,  h,  d, -1,  0,  0,
      -w,  h, -d, -1,  0,  0,
    ];

    const indices = [
      0,  1,  2,  0,  2,  3,   // front
      4,  5,  6,  4,  6,  7,   // back
      8,  9, 10,  8, 10, 11,   // top
     12, 13, 14, 12, 14, 15,   // bottom
     16, 17, 18, 16, 18, 19,   // right
     20, 21, 22, 20, 22, 23    // left
    ];

    return { vertices, indices };
  },

  /**
   * Create player capsule (simplified as box)
   */
  player() {
    return this.box(0.6, 1.8, 0.6);
  },

  /**
   * Create floor plane
   */
  plane(width = 10, depth = 10) {
    const w = width / 2, d = depth / 2;

    const vertices = [
      -w, 0, -d,  0, 1, 0,
       w, 0, -d,  0, 1, 0,
       w, 0,  d,  0, 1, 0,
      -w, 0,  d,  0, 1, 0,
    ];

    const indices = [0, 2, 1, 0, 3, 2];

    return { vertices, indices };
  },

  /**
   * Create arena walls
   */
  arena(size = 20, wallHeight = 3) {
    const s = size / 2;
    const h = wallHeight;
    const t = 0.5; // wall thickness

    const meshes = [];

    // Floor
    meshes.push(this.plane(size, size));

    // Walls
    const wallData = [
      { pos: [0, h/2, -s], size: [size, h, t] },
      { pos: [0, h/2,  s], size: [size, h, t] },
      { pos: [-s, h/2, 0], size: [t, h, size] },
      { pos: [ s, h/2, 0], size: [t, h, size] },
    ];

    return { floor: this.plane(size, size), wallHeight: h, size };
  }
};
```

## Camera

```javascript
/**
 * First-person camera
 */
GoldenShower.Camera = class Camera {
  constructor() {
    this.pos = new GoldenShower.Vec3(0, 1.6, 0);
    this.yaw = 0;
    this.pitch = 0;

    this.projection = new GoldenShower.Mat4();
    this.view = new GoldenShower.Mat4();

    this.fov = Math.PI / 3;
    this.near = 0.1;
    this.far = 100;
  }

  setAspect(aspect) {
    this.projection.perspective(this.fov, aspect, this.near, this.far);
  }

  update() {
    const target = new GoldenShower.Vec3(
      this.pos.x + Math.sin(this.yaw) * Math.cos(this.pitch),
      this.pos.y + Math.sin(this.pitch),
      this.pos.z + Math.cos(this.yaw) * Math.cos(this.pitch)
    );

    this.view.lookAt(
      this.pos,
      target,
      new GoldenShower.Vec3(0, 1, 0)
    );
  }

  getForward() {
    return new GoldenShower.Vec3(
      Math.sin(this.yaw),
      0,
      Math.cos(this.yaw)
    );
  }

  getRight() {
    return new GoldenShower.Vec3(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    );
  }
};
```

## Input Handler

```javascript
/**
 * Input handling for keyboard and mouse
 */
GoldenShower.Input = class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, locked: false };
    this.buttons = 0;

    this.setupKeyboard();
    this.setupMouse();
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  setupMouse() {
    this.canvas.addEventListener('click', () => {
      if (!this.mouse.locked) {
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.mouse.locked = document.pointerLockElement === this.canvas;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.mouse.locked) {
        this.mouse.dx += e.movementX;
        this.mouse.dy += e.movementY;
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.buttons |= (1 << e.button);
    });

    this.canvas.addEventListener('mouseup', (e) => {
      this.buttons &= ~(1 << e.button);
    });
  }

  consumeMouseDelta() {
    const dx = this.mouse.dx;
    const dy = this.mouse.dy;
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    return { dx, dy };
  }

  isKeyDown(code) {
    return !!this.keys[code];
  }

  isButtonDown(button) {
    return !!(this.buttons & (1 << button));
  }

  getMovement() {
    let x = 0, z = 0;

    if (this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp')) z += 1;
    if (this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown')) z -= 1;
    if (this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft')) x -= 1;
    if (this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight')) x += 1;

    return { x, z };
  }
};
```

## Game Loop

```javascript
/**
 * Main game loop
 */
GoldenShower.GameLoop = class GameLoop {
  constructor(updateFn, renderFn) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;

    this.running = false;
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedDt = 1 / 60;

    this.fps = 0;
    this.frameCount = 0;
    this.fpsTime = 0;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now() / 1000;
    requestAnimationFrame((t) => this.tick(t));
  }

  stop() {
    this.running = false;
  }

  tick(timestamp) {
    if (!this.running) return;

    const time = timestamp / 1000;
    const dt = Math.min(time - this.lastTime, 0.1);
    this.lastTime = time;

    // FPS counter
    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    // Fixed timestep for physics
    this.accumulator += dt;
    while (this.accumulator >= this.fixedDt) {
      this.updateFn(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }

    // Render with interpolation
    const alpha = this.accumulator / this.fixedDt;
    this.renderFn(alpha);

    requestAnimationFrame((t) => this.tick(t));
  }
};
```
