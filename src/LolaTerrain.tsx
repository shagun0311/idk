
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Coordinates = {
  latitude: number;
  longitude: number;
};

const IMAGE_SIZE = 1900;
const PIXEL_SIZE = 320;
const MAP_EXTENT = 304000;
const MOON_RADIUS = 1737400;

const calculateSlope = (
  samples: Float32Array,
  row: number,
  column: number
): number | null => {
  if (
    row <= 0 ||
    row >= IMAGE_SIZE - 1 ||
    column <= 0 ||
    column >= IMAGE_SIZE - 1
  ) {
    return null;
  }

  const index = row * IMAGE_SIZE + column;

  const left = samples[index - 1];
  const right = samples[index + 1];
  const above = samples[index - IMAGE_SIZE];
  const below = samples[index + IMAGE_SIZE];

  if (
    !Number.isFinite(left) ||
    !Number.isFinite(right) ||
    !Number.isFinite(above) ||
    !Number.isFinite(below)
  ) {
    return null;
  }

  const gradientX = (right - left) / (2 * PIXEL_SIZE);
  const gradientY = (below - above) / (2 * PIXEL_SIZE);

  return (
    Math.atan(Math.sqrt(
      gradientX * gradientX + gradientY * gradientY
    )) * 180
  ) / Math.PI;
};

export default function LolaTerrain() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const elevationDataRef = useRef<Float32Array | null>(null);
  const overlayRef = useRef<L.ImageOverlay | null>(null);

  const [selected, setSelected] = useState<Coordinates | null>(null);
  const [elevation, setElevation] = useState<number | null>(null);
  const [slope, setSlope] = useState<number | null>(null);
  const [dataStatus, setDataStatus] = useState('Loading elevation data...');
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [overlayReady, setOverlayReady] = useState(false);

  // Load LOLA elevation samples.
  useEffect(() => {
    let cancelled = false;

    fetch('/data/lola_elevation_web.bin')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Could not load elevation data.');
        }
        return response.arrayBuffer();
      })
      .then((buffer) => {
        if (buffer.byteLength !== IMAGE_SIZE * IMAGE_SIZE * 4) {
          throw new Error('Unexpected elevation file size.');
        }

        if (cancelled) return;

        const view = new DataView(buffer);
        const samples = new Float32Array(IMAGE_SIZE * IMAGE_SIZE);

        for (let i = 0; i < samples.length; i++) {
          samples[i] = view.getFloat32(i * 4, true);
        }

        elevationDataRef.current = samples;
        setDataStatus('LOLA elevation data loaded');
        setOverlayReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setDataStatus('Elevation data could not be loaded.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Create the terrain map.
  useEffect(() => {
    if (!mapRef.current) return;

    const map = L.map(mapRef.current, {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 2,
      zoomControl: true,
      attributionControl: false,
    });

    leafletMapRef.current = map;

    const bounds: L.LatLngBoundsExpression = [
      [0, 0],
      [IMAGE_SIZE, IMAGE_SIZE],
    ];

    L.imageOverlay('/data/lola_terrain_web.png', bounds).addTo(map);
    map.fitBounds(bounds);

    let marker: L.CircleMarker | null = null;

    map.on('click', (event: L.LeafletMouseEvent) => {
      const column = Math.floor(event.latlng.lng);
      const row = Math.floor(IMAGE_SIZE - event.latlng.lat);

      if (
        row < 0 ||
        row >= IMAGE_SIZE ||
        column < 0 ||
        column >= IMAGE_SIZE
      ) {
        return;
      }

      const x = -MAP_EXTENT + (column + 0.5) * PIXEL_SIZE;
      const y = MAP_EXTENT - (row + 0.5) * PIXEL_SIZE;

      const distance = Math.sqrt(x * x + y * y);

      const latitude =
        -90 +
        (2 * Math.atan(distance / (2 * MOON_RADIUS)) * 180) /
          Math.PI;

      let longitude = (Math.atan2(x, y) * 180) / Math.PI;

      if (longitude > 180) longitude -= 360;
      if (longitude < -180) longitude += 360;

      setSelected({ latitude, longitude });

      if (marker) {
        marker.setLatLng(event.latlng);
      } else {
        marker = L.circleMarker(event.latlng, {
          radius: 7,
          color: '#ffffff',
          weight: 2,
          fillColor: '#55a9ff',
          fillOpacity: 1,
        }).addTo(map);
      }

      const samples = elevationDataRef.current;

      if (!samples) {
        setElevation(null);
        setSlope(null);
        return;
      }

      const height = samples[row * IMAGE_SIZE + column];

      setElevation(Number.isFinite(height) ? height : null);
      setSlope(calculateSlope(samples, row, column));
    });

    return () => {
      map.remove();
      leafletMapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  // Generate a colour-coded slope overlay.
  useEffect(() => {
    const map = leafletMapRef.current;
    const samples = elevationDataRef.current;

    if (!map || !samples || !overlayEnabled) {
      overlayRef.current?.remove();
      overlayRef.current = null;
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = IMAGE_SIZE;
    canvas.height = IMAGE_SIZE;

    const context = canvas.getContext('2d');

    if (!context) return;

    const image = context.createImageData(IMAGE_SIZE, IMAGE_SIZE);
    const pixels = image.data;

    for (let row = 1; row < IMAGE_SIZE - 1; row++) {
      for (let column = 1; column < IMAGE_SIZE - 1; column++) {
        const slopeValue = calculateSlope(samples, row, column);

        if (slopeValue === null) continue;

        const index = (row * IMAGE_SIZE + column) * 4;

        let red = 0;
        let green = 0;
        let blue = 0;

        if (slopeValue <= 5) {
          red = 65;
          green = 210;
          blue = 135;
        } else if (slopeValue <= 10) {
          red = 245;
          green = 205;
          blue = 75;
        } else if (slopeValue <= 15) {
          red = 245;
          green = 145;
          blue = 65;
        } else {
          red = 235;
          green = 75;
          blue = 85;
        }

        pixels[index] = red;
        pixels[index + 1] = green;
        pixels[index + 2] = blue;
        pixels[index + 3] = 125;
      }
    }

    context.putImageData(image, 0, 0);

    const overlay = L.imageOverlay(
      canvas.toDataURL('image/png'),
      [
        [0, 0],
        [IMAGE_SIZE, IMAGE_SIZE],
      ],
      { opacity: 0.85, interactive: false }
    ).addTo(map);

    overlayRef.current = overlay;

    return () => {
      overlay.remove();
      if (overlayRef.current === overlay) {
        overlayRef.current = null;
      }
    };
  }, [overlayEnabled, overlayReady]);

  return (
    <div className="lola-terrain-panel">
      <div className="lola-terrain-heading">
        <div>
          <span className="section-eyebrow">NASA / LRO / LOLA</span>
          <h2>South Pole Terrain</h2>
          <p>80 m/pixel source · Polar elevation model</p>
        </div>

        <span className="terrain-status">REAL DATA</span>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <button
          type="button"
          onClick={() => setOverlayEnabled((previous) => !previous)}
          disabled={!overlayReady}
          style={{
            padding: '10px 16px',
            borderRadius: '7px',
            border: '1px solid #34485c',
            background: overlayEnabled ? '#25445a' : '#142333',
            color: '#e5edf5',
            cursor: overlayReady ? 'pointer' : 'not-allowed',
            opacity: overlayReady ? 1 : 0.5,
          }}
        >
          {overlayEnabled ? 'HIDE SLOPE OVERLAY' : 'SHOW SLOPE OVERLAY'}
        </button>
      </div>

      <div
        ref={mapRef}
        className="lola-terrain-map"
        aria-label="Interactive lunar south pole terrain map"
      />

      {overlayEnabled && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginTop: '14px',
            fontSize: '12px',
            color: '#c4d0dc',
          }}
        >
          <span>🟢 0–5°</span>
          <span>🟡 5–10°</span>
          <span>🟠 10–15°</span>
          <span>🔴 Above 15°</span>
        </div>
      )}

      <div className="lola-coordinate-readout">
        <span>SELECTED TERRAIN LOCATION</span>

        {selected ? (
          <div>
            <p>Latitude: {selected.latitude.toFixed(4)}°</p>
            <p>Longitude: {selected.longitude.toFixed(4)}°</p>
            <p>
              Elevation: {elevation !== null
                ? `${elevation.toFixed(1)} m`
                : 'Unavailable'}
            </p>
            <p>
              Local slope: {slope !== null
                ? `${slope.toFixed(2)}°`
                : 'Unavailable'}
            </p>
          </div>
        ) : (
          <p>Click the terrain to inspect elevation and local slope.</p>
        )}
      </div>

      <div className="lola-terrain-footer">
        <span>Source: Lunar Orbiter Laser Altimeter (LOLA)</span>
        <span>{dataStatus}</span>
      </div>
    </div>
  );
}
