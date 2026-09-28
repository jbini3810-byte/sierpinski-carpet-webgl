"use strict";

const canvas = document.querySelector("#carpet");
const depthInput = document.querySelector("#depth");
const depthValue = document.querySelector("#depth-value");
const carpetColorInput = document.querySelector("#carpet-color");
const holeColorInput = document.querySelector("#hole-color");
const status = document.querySelector("#status");
const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

function hexToRgb(hex) {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
}

// A leaf square is represented by two triangles, each with three (x, y) vertices.
function appendSquare(points, x, y, size) {
  const right = x + size;
  const top = y + size;
  points.push(x, y, right, y, x, top, x, top, right, y, right, top);
}

function divideSquare(points, x, y, size, remaining) {
  if (remaining === 0) {
    appendSquare(points, x, y, size);
    return;
  }
  const child = size / 3;
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      if (row === 1 && column === 1) continue;
      divideSquare(points, x + column * child, y + row * child, child, remaining - 1);
    }
  }
}

function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "Shader compilation failed");
  }
  return shader;
}

function setupProgram() {
  const vertex = compileShader(gl.VERTEX_SHADER, `
    attribute vec2 aPosition;
    void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
  `);
  const fragment = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform vec3 uColor;
    void main() { gl_FragColor = vec4(uColor, 1.0); }
  `);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "Program linking failed");
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  return program;
}

if (!gl) {
  status.textContent = "WebGL을 사용할 수 없습니다. WebGL이 활성화된 브라우저에서 열어 주세요.";
} else {
  try {
    const program = setupProgram();
    const buffer = gl.createBuffer();
    const position = gl.getAttribLocation(program, "aPosition");
    const color = gl.getUniformLocation(program, "uColor");
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(position);

    let vertexCount = 0;
    function rebuildGeometry() {
      const depth = Number(depthInput.value);
      const points = [];
      divideSquare(points, -1, -1, 2, depth);
      vertexCount = points.length / 2;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
      depthValue.value = String(depth);
      status.textContent = `분할 ${depth}회 · 남은 작은 정사각형 ${8 ** depth}개 · 삼각형 ${2 * 8 ** depth}개`;
      render();
    }

    function render() {
      const background = hexToRgb(holeColorInput.value);
      gl.clearColor(...background, 1);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform3fv(color, hexToRgb(carpetColorInput.value));
      gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    }

    depthInput.addEventListener("input", rebuildGeometry);
    carpetColorInput.addEventListener("input", render);
    holeColorInput.addEventListener("input", render);
    rebuildGeometry();
  } catch (error) {
    status.textContent = `렌더링 오류: ${error.message}`;
    console.error(error);
  }
}
