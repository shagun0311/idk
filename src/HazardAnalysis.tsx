
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './HazardAnalysis.css';

const SIZE = 1900;
const PIXEL = 320;
const EXTENT = 304000;
const MOON_RADIUS = 1737400;

const GLOBAL_WIDTH = 5760;
const GLOBAL_HEIGHT = 2880;
const GLOBAL_PIXEL = 1895.21;

type Site = {
  latitude: number;
  longitude: number;
};

type TerrainResult = {
  elevation: number;
  slope: number | null;
  source: string;
  resolution: string;
};

function pixelFor(site: Site) {
  const angular = (site.latitude + 90) * Math.PI / 180;
  const distance = 2 * MOON_RADIUS * Math.tan(angular / 2);
  const lon = site.longitude * Math.PI / 180;

  const x = distance * Math.sin(lon);
  const y = distance * Math.cos(lon);

  return {
    col: Math.floor((x + EXTENT) / PIXEL),
    row: Math.floor((EXTENT - y) / PIXEL),
  };
}

function polarSlopeAt(
  data: Float32Array,
  row: number,
  col: number
): number | null {
  if (
    row <= 0 || row >= SIZE - 1 ||
    col <= 0 || col >= SIZE - 1
  ) return null;

  const i = row * SIZE + col;

  const values = [
    data[i - 1],
    data[i + 1],
    data[i - SIZE],
    data[i + SIZE],
  ];

  if (!values.every(Number.isFinite)) return null;

  const gx = (values[1] - values[0]) / (2 * PIXEL);
  const gy = (values[3] - values[2]) / (2 * PIXEL);

  return Math.atan(Math.hypot(gx, gy)) * 180 / Math.PI;
}

function globalPixelFor(site: Site) {
  const longitude = ((site.longitude % 360) + 360) % 360;

  return {
    col: Math.min(
      GLOBAL_WIDTH - 1,
      Math.floor(longitude / 360 * GLOBAL_WIDTH)
    ),
    row: Math.max(
      0,
      Math.min(
        GLOBAL_HEIGHT - 1,
        Math.floor((90 - site.latitude) / 180 * GLOBAL_HEIGHT)
      )
    ),
  };
}

function globalElevationAt(
  data: Int16Array,
  row: number,
  col: number
): number | null {
  if (row < 0 || row >= GLOBAL_HEIGHT) return null;

  const wrappedCol =
    ((col % GLOBAL_WIDTH) + GLOBAL_WIDTH) % GLOBAL_WIDTH;

  const raw = data[row * GLOBAL_WIDTH + wrappedCol];

  if (raw === -32768) return null;

  return raw * 0.5;
}

function globalSlopeAt(
  data: Int16Array,
  row: number,
  col: number,
  latitude: number
): number | null {
  if (row <= 0 || row >= GLOBAL_HEIGHT - 1) return null;

  const west = globalElevationAt(data, row, col - 1);
  const east = globalElevationAt(data, row, col + 1);
  const north = globalElevationAt(data, row - 1, col);
  const south = globalElevationAt(data, row + 1, col);

  if (
    west === null || east === null ||
    north === null || south === null
  ) return null;

  const xSpacing =
    GLOBAL_PIXEL * Math.cos(latitude * Math.PI / 180);

  if (xSpacing < 50) return null;

  const gx = (east - west) / (2 * xSpacing);
  const gy = (south - north) / (2 * GLOBAL_PIXEL);

  return Math.atan(Math.hypot(gx, gy)) * 180 / Math.PI;
}

function assessSlope(slope: number | null) {
  if (slope === null) {
    return {
      label: 'UNKNOWN',
      explanation: 'Slope data is unavailable at this location.',
      color: '#a1a1aa',
    };
  }

  if (slope <= 5) {
    return {
      label: 'FAVOURABLE',
      explanation: 'Relatively gentle terrain. Further landing checks are required.',
      color: '#22c55e',
    };
  }

  if (slope <= 10) {
    return {
      label: 'CAUTION',
      explanation: 'Moderate slope. Check the selected lander’s operational limits.',
      color: '#eab308',
    };
  }

  return {
    label: 'HIGH SLOPE',
    explanation: 'Steep terrain may create landing stability concerns.',
    color: '#ef4444',
  };
}

export default function HazardAnalysis() {
  const hostRef = useRef<HTMLDivElement>(null);

  const [site, setSite] = useState<Site | null>(null);

  const [status, setStatus] = useState(
    'Rotate the Moon and click a point to select a site.'
  );

  const [result, setResult] = useState<TerrainResult | null>(null);

  const [dataState, setDataState] = useState<
    'loading' | 'ready' | 'partial' | 'error'
  >('loading');

  const polarRef = useRef<Float32Array | null>(null);
  const globalRef = useRef<Int16Array | null>(null);

  // Load both LOLA datasets.
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const [globalResult, polarResult] = await Promise.allSettled([
        fetch('/data/lola_global.bin').then(async response => {
          if (!response.ok) throw new Error('Global LOLA unavailable');

          const buffer = await response.arrayBuffer();

          if (buffer.byteLength !== GLOBAL_WIDTH * GLOBAL_HEIGHT * 2) {
            throw new Error('Unexpected global LOLA file size');
          }

          return new Int16Array(buffer);
        }),

        fetch('/data/lola_elevation_web.bin').then(async response => {
          if (!response.ok) throw new Error('Polar LOLA unavailable');

          const buffer = await response.arrayBuffer();

          if (buffer.byteLength !== SIZE * SIZE * 4) {
            throw new Error('Unexpected polar LOLA file size');
          }

          const view = new DataView(buffer);
          const values = new Float32Array(SIZE * SIZE);

          for (let i = 0; i < values.length; i++) {
            values[i] = view.getFloat32(i * 4, true);
          }

          return values;
        }),
      ]);

      if (cancelled) return;

      if (globalResult.status === 'fulfilled') {
        globalRef.current = globalResult.value;
      }

      if (polarResult.status === 'fulfilled') {
        polarRef.current = polarResult.value;
      }

      if (globalResult.status === 'fulfilled') {
        setDataState(
          polarResult.status === 'fulfilled' ? 'ready' : 'partial'
        );
      } else {
        setDataState('error');
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Interactive 3D Moon.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      42,
      host.clientWidth / host.clientHeight,
      0.1,
      100
    );

    camera.position.set(0, 0, 3.1);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 1.65;
    controls.maxDistance = 5;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;

    // Procedural visual texture, not scientific imagery.
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;

    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#777b80';
    ctx.fillRect(0, 0, 1024, 512);

    for (let i = 0; i < 1700; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = 1.5 + Math.random() * 12;

      const gradient = ctx.createRadialGradient(
        x - r * 0.2,
        y - r * 0.2,
        r * 0.08,
        x,
        y,
        r
      );

      gradient.addColorStop(0, 'rgba(35,39,44,.55)');
      gradient.addColorStop(0.7, 'rgba(58,62,67,.25)');
      gradient.addColorStop(1, 'rgba(220,222,225,.2)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 96),
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 1,
      })
    );

    scene.add(globe);

    scene.add(new THREE.AmbientLight(0xffffff, 1.05));

    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(-3, 2, 4);
    scene.add(sun);

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 16, 16),
      new THREE.MeshBasicMaterial({ color: '#56c7ff' })
    );

    marker.visible = false;
    scene.add(marker);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    let pointerStart: { x: number; y: number } | null = null;

    const onPointerDown = (event: PointerEvent) => {
      pointerStart = {
        x: event.clientX,
        y: event.clientY,
      };
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!pointerStart) return;

      const moved = Math.hypot(
        event.clientX - pointerStart.x,
        event.clientY - pointerStart.y
      );

      pointerStart = null;

      if (moved > 5) return;

      const rect = renderer.domElement.getBoundingClientRect();

      pointer.x =
        ((event.clientX - rect.left) / rect.width) * 2 - 1;

      pointer.y =
        -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      const hit = raycaster.intersectObject(globe)[0];
      if (!hit) return;

      const p = hit.point.clone().normalize();

      const latitude =
        Math.asin(THREE.MathUtils.clamp(p.y, -1, 1)) *
        180 / Math.PI;

      const longitude =
        Math.atan2(p.z, p.x) * 180 / Math.PI;

      setSite({ latitude, longitude });
      setResult(null);

      marker.position.copy(p.multiplyScalar(1.018));
      marker.visible = true;

      controls.autoRotate = false;

      setStatus('Site selected. Run the terrain screening below.');
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const resize = new ResizeObserver(() => {
      const width = host.clientWidth;
      const height = host.clientHeight;

      if (!width || !height) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    });

    resize.observe(host);

    let frame = 0;

    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();

      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);

      controls.dispose();

      globe.geometry.dispose();
      (globe.material as THREE.MeshStandardMaterial).dispose();
      texture.dispose();

      marker.geometry.dispose();
      (marker.material as THREE.Material).dispose();

      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  // Terrain screening.
  const analyse = () => {
    if (!site) return;

    const globalData = globalRef.current;

    if (!globalData) {
      setResult(null);
      setStatus('Global LOLA data is unavailable. Check the data files.');
      return;
    }

    let elevation: number | null = null;
    let slope: number | null = null;
    let source = '';
    let resolution = '';

    // Prefer high-resolution south-pole data.
    if (site.latitude <= -79 && polarRef.current) {
      const polarData = polarRef.current;
      const { row, col } = pixelFor(site);

      if (
        row >= 1 && row < SIZE - 1 &&
        col >= 1 && col < SIZE - 1
      ) {
        const sample = polarData[row * SIZE + col];

        if (Number.isFinite(sample)) {
          elevation = sample;
          slope = polarSlopeAt(polarData, row, col);

          source = 'South-pole LOLA';
          resolution = '320 m/pixel';
        }
      }
    }

    // Fall back to global LOLA.
    if (elevation === null) {
      const { row, col } = globalPixelFor(site);

      elevation = globalElevationAt(globalData, row, col);

      if (elevation === null) {
        setResult(null);
        setStatus('No valid LOLA elevation sample is available here.');
        return;
      }

      slope = globalSlopeAt(
        globalData,
        row,
        col,
        site.latitude
      );

      source = 'Global LOLA';
      resolution = '1.895 km/pixel';
    }

    setResult({
      elevation,
      slope,
      source,
      resolution,
    });

    setStatus('Terrain screening complete.');
  };

  const canAnalyse =
    Boolean(site) &&
    (dataState === 'ready' || dataState === 'partial');

  const screening = result ? assessSlope(result.slope) : null;

  return (
    <section className="hazard-analysis">
      <div className="hazard-heading">
        <div>
          <span className="hazard-eyebrow">
            3D LUNAR SITE SELECTION
          </span>

          <h2>Choose a landing site</h2>

          <p>
            Drag to rotate · Scroll to zoom · Click the Moon to select a point
          </p>
        </div>

        <span className={`hazard-data-pill ${dataState}`}>
          {dataState === 'ready'
            ? 'BOTH LOLA DATASETS READY'
            : dataState === 'partial'
              ? 'GLOBAL LOLA READY'
              : dataState === 'loading'
                ? 'LOADING LOLA DATA'
                : 'LOLA DATA UNAVAILABLE'}
        </span>
      </div>

      <div className="hazard-globe-wrap">
        <div className="hazard-globe" ref={hostRef} />
        <div className="hazard-globe-hint">
          INTERACTIVE 3D MOON
        </div>
      </div>

      <div className="hazard-controls">
        <div className="hazard-site-readout">
          <span className="hazard-eyebrow">
            SELECTED COORDINATES
          </span>

          {site ? (
            <strong>
              {site.latitude.toFixed(3)}° LAT&nbsp; / &nbsp;
              {site.longitude.toFixed(3)}° LON
            </strong>
          ) : (
            <strong>No site selected</strong>
          )}

          <small>{status}</small>
        </div>

        <button
          className="hazard-analyse-button"
          onClick={analyse}
          disabled={!canAnalyse}
        >
          ANALYSE SITE ↗
        </button>
      </div>

      {result && screening && (
        <div className="hazard-results">
          <div>
            <span>ELEVATION</span>
            <strong>{result.elevation.toFixed(1)} m</strong>
          </div>

          <div>
            <span>LOCAL SLOPE</span>
            <strong>
              {result.slope === null
                ? 'Unavailable'
                : `${result.slope.toFixed(2)}°`}
            </strong>
          </div>

          <div>
            <span>TERRAIN SCREENING</span>
            <strong style={{ color: screening.color }}>
              {screening.label}
            </strong>
            <small>{screening.explanation}</small>
          </div>

          <div>
            <span>DATA SOURCE</span>
            <strong>{result.source}</strong>
          </div>

          <div>
            <span>RESOLUTION</span>
            <strong>{result.resolution}</strong>
          </div>

          <p>
            This is a preliminary terrain assessment based on LOLA
            elevation data. It does not verify boulders, crater
            hazards, sunlight, communication, or spacecraft-specific
            landing requirements. A favourable slope alone does not
            establish that a site is safe to land on.
          </p>
        </div>
      )}

      <div className="hazard-source">
        Terrain source: NASA Lunar Reconnaissance Orbiter LOLA
        datasets · Global coverage with higher-resolution
        south-pole data where available
      </div>
    </section>
  );
}
