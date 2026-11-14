
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type CSSProperties,
} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type SavedLocation = {
  id: number;
  name: string;
  lat: number;
  lng: number;
};

const STORAGE_KEY = 'idk-saved-landing-locations';

function broadcastCoordinates(lat: number, lng: number) {
  window.dispatchEvent(
    new CustomEvent('idk:site-coordinate', {
      detail: { lat, lng },
    })
  );
}

function loadSavedLocations(): SavedLocation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is SavedLocation =>
        typeof item.id === 'number' &&
        typeof item.name === 'string' &&
        typeof item.lat === 'number' &&
        typeof item.lng === 'number' &&
        Number.isFinite(item.lat) &&
        Number.isFinite(item.lng) &&
        item.lat >= -90 &&
        item.lat <= 90 &&
        item.lng >= -180 &&
        item.lng <= 180
    );
  } catch {
    return [];
  }
}

function SiteExplorer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const savedMarkersRef = useRef<L.LayerGroup | null>(null);

  const [latitude, setLatitude] = useState('-75');
  const [longitude, setLongitude] = useState('0');
  const [coordinates, setCoordinates] = useState({
    lat: -75,
    lng: 0,
  });

  const [locationName, setLocationName] = useState('');
  const [savedLocations, setSavedLocations] =
    useState<SavedLocation[]>(loadSavedLocations);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(savedLocations)
      );
    } catch {
      setError('Could not save locations in this browser.');
    }
  }, [savedLocations]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = L.map(mapContainer.current, {
      crs: L.CRS.EPSG4326,
      center: [-75, 0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 5,
      worldCopyJump: false,
    });

    mapRef.current = map;

    L.tileLayer(
      'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
      {
        attribution: 'NASA / JPL / LROC',
        minZoom: 0,
        maxZoom: 5,
        noWrap: true,
      }
    ).addTo(map);

    const marker = L.circleMarker([-75, 0], {
      radius: 7,
      color: '#72d5ff',
      fillColor: '#72d5ff',
      fillOpacity: 0.9,
      weight: 2,
    }).addTo(map);

    markerRef.current = marker;

    const savedMarkers = L.layerGroup().addTo(map);
    savedMarkersRef.current = savedMarkers;

    map.on('click', (event) => {
      const lat = Number(event.latlng.lat.toFixed(3));
      const lng = Number(event.latlng.lng.toFixed(3));

      setCoordinates({ lat, lng });
      setLatitude(String(lat));
      setLongitude(String(lng));
      setError('');

      marker.setLatLng([lat, lng]);
      broadcastCoordinates(lat, lng);
    });

    L.control.scale({ imperial: false }).addTo(map);

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      savedMarkersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = savedMarkersRef.current;
    if (!layer) return;

    layer.clearLayers();

    savedLocations.forEach((location) => {
      L.circleMarker([location.lat, location.lng], {
        radius: 8,
        color: '#f3c96b',
        fillColor: '#f3c96b',
        fillOpacity: 0.9,
        weight: 2,
      })
        .bindPopup(location.name)
        .addTo(layer);
    });
  }, [savedLocations]);

  const goToLocation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      latitude.trim() === '' ||
      longitude.trim() === '' ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      setError(
        'Enter a valid latitude (-90 to 90) and longitude (-180 to 180).'
      );
      return;
    }

    setError('');
    setCoordinates({ lat, lng });
    broadcastCoordinates(lat, lng);

    mapRef.current?.setView([lat, lng], 3);
    markerRef.current?.setLatLng([lat, lng]);
  };

  const saveLocation = () => {
    const name = locationName.trim();

    if (!name) {
      setError('Please enter a name for this location.');
      return;
    }

    const newLocation: SavedLocation = {
      id: Date.now(),
      name,
      lat: coordinates.lat,
      lng: coordinates.lng,
    };

    setSavedLocations((previous) => [...previous, newLocation]);
    setLocationName('');
    setError('');
  };

  const visitLocation = (location: SavedLocation) => {
    setCoordinates({ lat: location.lat, lng: location.lng });
    setLatitude(String(location.lat));
    setLongitude(String(location.lng));

    broadcastCoordinates(location.lat, location.lng);

    mapRef.current?.setView([location.lat, location.lng], 3);
    markerRef.current?.setLatLng([location.lat, location.lng]);
  };

  const deleteLocation = (id: number) => {
    setSavedLocations((previous) =>
      previous.filter((location) => location.id !== id)
    );
  };

  return (
    <div style={{ width: '100%', color: '#e5edf5' }}>
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ margin: 0 }}>Lunar surface map</h2>
        <p style={{ color: '#91a0b2', fontSize: '13px' }}>
          Explore the Moon and search for potential landing locations.
        </p>
      </div>

      <form
        onSubmit={goToLocation}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'end',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <label style={{ flex: '1 1 140px', fontSize: '12px' }}>
          LATITUDE (°)
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ flex: '1 1 140px', fontSize: '12px' }}>
          LONGITUDE (°)
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            style={inputStyle}
          />
        </label>

        <button type="submit" style={buttonStyle}>
          GO TO LOCATION ↗
        </button>
      </form>

      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '520px',
          borderRadius: '12px',
          border: '1px solid #26394c',
          background: '#101b28',
          overflow: 'hidden',
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '16px',
          fontSize: '13px',
        }}
      >
        <span>LATITUDE: {coordinates.lat}°</span>
        <span>LONGITUDE: {coordinates.lng}°</span>
      </div>

      <div
        style={{
          marginTop: '28px',
          padding: '22px',
          border: '1px solid #26394c',
          borderRadius: '12px',
          background: '#101b28',
        }}
      >
        <div className="eyebrow">MISSION PLANNING</div>
        <h2 style={{ marginTop: '8px' }}>Saved landing locations</h2>

        <p style={{ color: '#91a0b2', fontSize: '13px' }}>
          Save coordinates to build your collection of candidate sites.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginTop: '18px',
          }}
        >
          <input
            value={locationName}
            onChange={(event) => setLocationName(event.target.value)}
            placeholder="Name this location..."
            style={{ ...inputStyle, flex: '1 1 180px', marginTop: 0 }}
          />

          <button
            type="button"
            onClick={saveLocation}
            style={buttonStyle}
          >
            + SAVE LOCATION
          </button>
        </div>

        {error && (
          <p style={{ color: '#ff9292', fontSize: '13px' }}>
            {error}
          </p>
        )}

        <div style={{ marginTop: '22px' }}>
          {savedLocations.length === 0 ? (
            <p style={{ color: '#91a0b2', fontSize: '13px' }}>
              No locations saved yet. Select a point on the map and give it a name.
            </p>
          ) : (
            savedLocations.map((location) => (
              <div
                key={location.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                  padding: '14px 0',
                  borderTop: '1px solid #26394c',
                }}
              >
                <div>
                  <strong>{location.name}</strong>
                  <p
                    style={{
                      color: '#91a0b2',
                      fontSize: '12px',
                      margin: '5px 0 0',
                    }}
                  >
                    {location.lat}° latitude, {location.lng}° longitude
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => visitLocation(location)}
                    style={smallButtonStyle}
                  >
                    VIEW
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteLocation(location.id)}
                    style={smallButtonStyle}
                  >
                    REMOVE
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <p style={{ color: '#91a0b2', fontSize: '11px' }}>
          Locations are saved in this browser and should remain available after refreshing.
        </p>
      </div>

      <p style={{ color: '#91a0b2', fontSize: '12px', marginTop: '18px' }}>
        DATA: NASA / JPL Moon Trek — LRO WAC global mosaic.
        Map imagery is for exploration, not landing-site certification.
      </p>
    </div>
  );
}

const inputStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px',
  background: '#142333',
  border: '1px solid #34485c',
  borderRadius: '7px',
  color: '#e5edf5',
  outline: 'none',
};

const buttonStyle: CSSProperties = {
  padding: '12px 20px',
  background: '#72d5ff',
  color: '#101b28',
  border: 'none',
  borderRadius: '7px',
  fontWeight: 700,
  cursor: 'pointer',
};

const smallButtonStyle: CSSProperties = {
  padding: '8px 12px',
  background: '#1b3042',
  color: '#e5edf5',
  border: '1px solid #34485c',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '11px',
};

export default SiteExplorer;
