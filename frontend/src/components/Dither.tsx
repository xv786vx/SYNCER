import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

const combinedVertexShader = `
precision highp float;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;
}
`;

const combinedFragmentShader = `
precision highp float;
varying vec2 vUv;
uniform vec2 resolution;
uniform float time;
uniform float waveSpeed;
uniform float waveFrequency;
uniform float waveAmplitude;
uniform vec3 waveColor;
uniform vec2 mousePos;
uniform int enableMouseInteraction;
uniform float mouseRadius;
uniform float colorNum;
uniform float pixelSize;

// 4x4 Bayer matrix for ordered dithering (no arrays, for WebGL1 compatibility)
float bayerThreshold(vec2 uv) {
    int x = int(mod(floor(uv.x), 4.0));
    int y = int(mod(floor(uv.y), 4.0));
    int index = x + y * 4;
    float threshold = 0.0;
    if(index == 0) threshold = 0.0;
    else if(index == 1) threshold = 8.0;
    else if(index == 2) threshold = 2.0;
    else if(index == 3) threshold = 10.0;
    else if(index == 4) threshold = 12.0;
    else if(index == 5) threshold = 4.0;
    else if(index == 6) threshold = 14.0;
    else if(index == 7) threshold = 6.0;
    else if(index == 8) threshold = 3.0;
    else if(index == 9) threshold = 11.0;
    else if(index == 10) threshold = 1.0;
    else if(index == 11) threshold = 9.0;
    else if(index == 12) threshold = 15.0;
    else if(index == 13) threshold = 7.0;
    else if(index == 14) threshold = 13.0;
    else if(index == 15) threshold = 5.0;
    return (threshold + 0.5) / 16.0;
}

vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0,0.0,1.0,1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0,0.0,1.0,1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0/41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00,g00), dot(g01,g01), dot(g10,g10), dot(g11,g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

const int OCTAVES = 8;
float fbm(vec2 p) {
  float value = 0.0;
  float amp = 1.0;
  float freq = waveFrequency;
  for (int i = 0; i < OCTAVES; i++) {
    value += amp * abs(cnoise(p));
    p *= freq;
    amp *= waveAmplitude;
  }
  return value;
}

float pattern(vec2 p) {
  vec2 p2 = p - time * waveSpeed;
  return fbm(p - fbm(p + fbm(p2)));
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  uv -= 0.5;
  uv.x *= resolution.x / resolution.y;
  float f = pattern(uv);
  // Quantize to colorNum levels
  float quant = floor(f * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
  // Dither
  // Use ditherUV for blocky dither, but sample f at the center of each block for correct animation
  vec2 ditherUV = floor(gl_FragCoord.xy / pixelSize);
  vec2 blockCenter = (ditherUV + 0.5) * pixelSize;
  vec2 blockUv = blockCenter / resolution.xy;
  blockUv -= 0.5;
  blockUv.x *= resolution.x / resolution.y;
  float blockF = pattern(blockUv);
  // Invert the pattern so the background is black and the waves are lighter
  blockF = 1.0 - blockF;
  float blockQuant = floor(blockF * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
  float threshold = bayerThreshold(ditherUV);
  float outColor = 0.0;
  if (colorNum <= 2.0) {
    outColor = blockQuant < threshold ? 0.0 : 1.0;
  } else {
    outColor = floor(blockF * (colorNum - 1.0) + threshold) / (colorNum - 1.0);
  }
  outColor = clamp(outColor * 0.15, 0.0, 1.0); // Keep darkening
  gl_FragColor = vec4(vec3(outColor), 1.0);
}
`;

interface DitherProps {
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  waveColor?: [number, number, number];
  colorNum?: number;
  pixelSize?: number;
  disableAnimation?: boolean;
  enableMouseInteraction?: boolean;
  mouseRadius?: number;
  style?: React.CSSProperties;
}

function DitheredWaves({
  waveSpeed,
  waveFrequency,
  waveAmplitude,
  waveColor,
  colorNum,
  pixelSize,
  disableAnimation,
  enableMouseInteraction,
  mouseRadius,
}: Required<DitherProps>) {
  const mesh = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>>(null);
  const { viewport, size, gl } = useThree();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const uniforms = useRef<Record<string, THREE.IUniform>>({
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(size.width, size.height) },
    waveSpeed: { value: waveSpeed },
    waveFrequency: { value: waveFrequency },
    waveAmplitude: { value: waveAmplitude },
    waveColor: { value: new THREE.Color(...waveColor) },
    mousePos: { value: new THREE.Vector2(0, 0) },
    enableMouseInteraction: { value: enableMouseInteraction ? 1 : 0 },
    mouseRadius: { value: mouseRadius },
    colorNum: { value: colorNum },
    pixelSize: { value: pixelSize },
  });

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    const newWidth = Math.floor(size.width * dpr);
    const newHeight = Math.floor(size.height * dpr);
    uniforms.current.resolution.value.set(newWidth, newHeight);
  }, [size, gl]);

  useFrame(({ clock }) => {
    if (!disableAnimation) {
      uniforms.current.time.value = clock.getElapsedTime();
    }
    uniforms.current.waveSpeed.value = waveSpeed;
    uniforms.current.waveFrequency.value = waveFrequency;
    uniforms.current.waveAmplitude.value = waveAmplitude;
    uniforms.current.waveColor.value.set(...waveColor);
    uniforms.current.enableMouseInteraction.value = enableMouseInteraction ? 1 : 0;
    uniforms.current.mouseRadius.value = mouseRadius;
    uniforms.current.colorNum.value = colorNum;
    uniforms.current.pixelSize.value = pixelSize;
    if (enableMouseInteraction) {
      uniforms.current.mousePos.value.set(mousePos.x, mousePos.y);
    }
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!enableMouseInteraction) return;
    const rect = gl.domElement.getBoundingClientRect();
    const dpr = gl.getPixelRatio();
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top) * dpr;
    setMousePos({ x, y });
  };

  return (
    // @ts-expect-error react-three-fiber JSX type bug: mesh
    <mesh
      ref={mesh}
      scale={[viewport.width, viewport.height, 1]}
      onPointerMove={handlePointerMove}
      position={[0, 0, 0]}
    >
      {/* @ts-expect-error react-three-fiber JSX type bug: planeGeometry */}
      <planeGeometry args={[1, 1]} />
      {/* @ts-expect-error react-three-fiber JSX type bug: shaderMaterial */}
      <shaderMaterial
        vertexShader={combinedVertexShader}
        fragmentShader={combinedFragmentShader}
        uniforms={uniforms.current}
      />
    {/* @ts-expect-error react-three-fiber JSX type bug: mesh */}
    </mesh>
  );
}

export default function Dither({
  waveSpeed = 0.02,
  waveFrequency = 3,
  waveAmplitude = 0.3,
  waveColor = [0.3, 0.5, 0.5],
  colorNum = 2, // More pronounced: 2 = b/w, 3 = b/w/gray
  pixelSize = 10, // More pixelated
  disableAnimation = false,
  enableMouseInteraction = true,
  mouseRadius = 1,
  style,
}: DitherProps) {
  return (
    <Canvas
      style={style}
      className="w-full h-full relative"
      camera={{ position: [0, 0, 6] }}
      dpr={window.devicePixelRatio}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      {/* @ts-expect-error react-three-fiber JSX type bug: idek */}
      <DitheredWaves
        waveSpeed={waveSpeed}
        waveFrequency={waveFrequency}
        waveAmplitude={waveAmplitude}
        waveColor={waveColor}
        colorNum={colorNum}
        pixelSize={pixelSize}
        disableAnimation={disableAnimation}
        enableMouseInteraction={enableMouseInteraction}
        mouseRadius={mouseRadius}
      />
    </Canvas>
  );
}
