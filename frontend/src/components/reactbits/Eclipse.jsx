'use client';

import { Mesh, Program, Renderer, Triangle, Vec3 } from 'ogl';
import React, { useEffect, useRef } from 'react';
import './Eclipse.css';

export default function Eclipse({
  radius = 0.42,
  speed = 0.8,
  turbulence = 1.2,
  coronaSpread = 0.38,
  colorShift = 0.0,
  backgroundColor = '#06070d',
  className = '',
  style = {},
  children
}) {
  const containerRef = useRef(null);

  const vert = /* glsl */ `
    precision highp float;
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const frag = /* glsl */ `
    precision highp float;

    uniform float iTime;
    uniform vec2 iResolution;
    uniform vec2 iMouse;
    uniform float uRadius;
    uniform float uSpeed;
    uniform float uTurbulence;
    uniform float uCoronaSpread;
    uniform float uColorShift;
    uniform vec3 uBackgroundColor;

    varying vec2 vUv;

    // Fast 3D Hash
    vec3 hash3(vec3 p) {
      p = fract(p * vec3(443.897, 441.423, 437.195));
      p += dot(p, p.yxz + 19.19);
      return -1.0 + 2.0 * fract((p.xxy + p.yxx) * p.zyx);
    }

    // 3D Simplex noise
    float snoise(vec3 p) {
      const float K1 = 0.333333333;
      const float K2 = 0.166666667;
      vec3 i = floor(p + (p.x + p.y + p.z) * K1);
      vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
      vec3 e = step(vec3(0.0), d0 - d0.yzx);
      vec3 i1 = e * (1.0 - e.zxy);
      vec3 i2 = 1.0 - e.zxy * (1.0 - e);
      vec3 d1 = d0 - (i1 - K2);
      vec3 d2 = d0 - (i2 - K1);
      vec3 d3 = d0 - 0.5;
      vec4 h = max(0.6 - vec4(dot(d0,d0), dot(d1,d1), dot(d2,d2), dot(d3,d3)), 0.0);
      vec4 n = h * h * h * h * vec4(dot(d0, hash3(i)), dot(d1, hash3(i + i1)), dot(d2, hash3(i + i2)), dot(d3, hash3(i + 1.0)));
      return dot(vec4(48.0), n);
    }

    // Layered fractional Brownian motion for coronal turbulence
    float fbm(vec3 p) {
      float f = 0.0;
      float amp = 0.5;
      float freq = 1.0;
      for (int i = 0; i < 4; i++) {
        f += amp * snoise(p * freq);
        freq *= 2.08;
        amp *= 0.52;
      }
      return f;
    }

    // Spectral dispersion color shifting
    vec3 spectralCorona(float t, float shift) {
      float p = clamp(t, 0.0, 1.4);
      float phase = shift * 3.14159265;
      
      vec3 c0 = vec3(0.03, 0.04, 0.10);  // Dark outer space
      vec3 c1 = vec3(0.38 + 0.1 * sin(phase), 0.12, 0.85); // Incandescent violet
      vec3 c2 = vec3(0.08, 0.72 + 0.1 * cos(phase), 0.98); // Electric cyan
      vec3 c3 = vec3(0.98, 0.56 + 0.1 * sin(phase * 1.5), 0.18); // Amber plasma flare
      vec3 c4 = vec3(1.0, 0.98, 0.94);   // Searing diamond core
      
      vec3 col = mix(c0, c1, smoothstep(0.0, 0.22, p));
      col = mix(col, c2, smoothstep(0.18, 0.50, p));
      col = mix(col, c3, smoothstep(0.48, 0.82, p));
      col = mix(col, c4, smoothstep(0.80, 1.15, p));
      return col;
    }

    void main() {
      vec2 fragCoord = vUv * iResolution;
      vec2 center = iResolution * 0.5;
      float minRes = min(iResolution.x, iResolution.y);
      vec2 uv = (fragCoord - center) / minRes * 2.0;

      // Mouse deflection
      vec2 m = (iMouse - center) / minRes * 2.0;
      float mDist = length(uv - m);
      vec2 mouseNudge = (uv - m) / (mDist + 0.6) * 0.08;

      vec2 warpedUv = uv + mouseNudge;
      float r = length(warpedUv);
      float angle = atan(warpedUv.y, warpedUv.x);

      // Rotating plasma noise
      float t = iTime * uSpeed * 0.45;
      vec3 sampleCoord1 = vec3(warpedUv * (uTurbulence * 1.6), t);
      vec3 sampleCoord2 = vec3(cos(angle) * 2.0, sin(angle) * 2.0, t * 1.3);
      
      float n1 = fbm(sampleCoord1);
      float n2 = fbm(sampleCoord2 + vec3(n1 * 0.7));

      // Coronal flare intensity radiating from the rim of the dark eclipse
      float edgeDist = r - uRadius;
      float coronaFalloff = exp(-max(0.0, edgeDist) * (1.0 / max(0.01, uCoronaSpread)) * 4.8);
      
      float flareRays = 0.5 + 0.5 * sin(angle * 8.0 + t + n1 * 3.5);
      float coronaIntensity = coronaFalloff * (0.85 + 0.7 * n2 + 0.35 * flareRays);

      // Deep dark body eclipsing the center
      float darkDisc = smoothstep(uRadius, uRadius - 0.018, r);
      
      // Searing rim refraction / Fresnel diffraction glow
      float rimGlow = smoothstep(uRadius + 0.02, uRadius, r) * smoothstep(uRadius - 0.035, uRadius, r);
      rimGlow = pow(rimGlow, 1.2) * 2.8;

      // Evaluate spectral coloration
      vec3 coronaColor = spectralCorona(coronaIntensity, uColorShift);
      vec3 rimColor = mix(vec3(0.3, 0.7, 1.0), vec3(1.0, 0.95, 0.9), smoothstep(0.4, 1.0, n1));

      // Assemble final composite
      vec3 sceneColor = mix(uBackgroundColor, coronaColor, clamp(coronaIntensity * 1.2, 0.0, 1.0));
      
      // Occlude with the black eclipsing body
      sceneColor = mix(sceneColor, uBackgroundColor, darkDisc);
      
      // Add radiant rim diffraction
      sceneColor += rimColor * rimGlow;

      float alpha = clamp(coronaIntensity * 1.5 + rimGlow, 0.0, 1.0);
      gl_FragColor = vec4(sceneColor, max(alpha, darkDisc));
    }
  `;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ alpha: true, premultipliedAlpha: false });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.canvas.className = 'eclipse-canvas';
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vert,
      fragment: frag,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: [gl.canvas.width || 300, gl.canvas.height || 300] },
        iMouse: { value: [(gl.canvas.width || 300) * 0.5, (gl.canvas.height || 300) * 0.5] },
        uRadius: { value: radius },
        uSpeed: { value: speed },
        uTurbulence: { value: turbulence },
        uCoronaSpread: { value: coronaSpread },
        uColorShift: { value: colorShift },
        uBackgroundColor: { value: hexToVec3(backgroundColor) }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      if (!container) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = container.clientWidth || 300;
      const height = container.clientHeight || 300;
      renderer.setSize(width * dpr, height * dpr);
      gl.canvas.style.width = width + 'px';
      gl.canvas.style.height = height + 'px';
      program.uniforms.iResolution.value = [gl.canvas.width, gl.canvas.height];
    }

    window.addEventListener('resize', resize);
    resize();

    let targetMouse = [(gl.canvas.width || 300) * 0.5, (gl.canvas.height || 300) * 0.5];
    let currentMouse = [...targetMouse];

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const x = (e.clientX - rect.left) * dpr;
      const y = (rect.height - (e.clientY - rect.top)) * dpr;
      targetMouse = [x, y];
    };

    container.addEventListener('mousemove', handleMouseMove);

    let rafId;
    const update = (t) => {
      rafId = requestAnimationFrame(update);
      const timeSec = t * 0.001;

      // Smooth mouse damping
      currentMouse[0] += (targetMouse[0] - currentMouse[0]) * 0.08;
      currentMouse[1] += (targetMouse[1] - currentMouse[1]) * 0.08;

      program.uniforms.iTime.value = timeSec;
      program.uniforms.iMouse.value = currentMouse;
      program.uniforms.uRadius.value = radius;
      program.uniforms.uSpeed.value = speed;
      program.uniforms.uTurbulence.value = turbulence;
      program.uniforms.uCoronaSpread.value = coronaSpread;
      program.uniforms.uColorShift.value = colorShift;
      program.uniforms.uBackgroundColor.value = hexToVec3(backgroundColor);

      renderer.render({ scene: mesh });
    };

    rafId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      container.removeEventListener('mousemove', handleMouseMove);
      if (gl.canvas && gl.canvas.parentNode === container) {
        container.removeChild(gl.canvas);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [radius, speed, turbulence, coronaSpread, colorShift, backgroundColor]);

  return (
    <div ref={containerRef} className={`eclipse-container ${className}`} style={style}>
      {children && <div className="eclipse-content">{children}</div>}
    </div>
  );
}

function hexToVec3(color) {
  if (!color) return new Vec3(0, 0, 0);
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return new Vec3(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
  }
  return new Vec3(0.024, 0.027, 0.051); // Default #06070d
}
