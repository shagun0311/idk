
import { useState } from 'react';

type EarthPosition = {
  azimuth: number;
  elevation: number;
  observationTime: string;
};

async function getEarthPosition(
  latitude: number,
  longitude: number,
  date: string,
  time: string
): Promise<EarthPosition> {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90° and 90°.');
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180° and 180°.');
  }

  if (!date || !time) {
    throw new Error('Please enter both date and time.');
  }

  const start = new Date(`${date}T${time}:00Z`);

  if (Number.isNaN(start.getTime())) {
    throw new Error('Invalid date or time.');
  }

  const stop = new Date(start.getTime() + 60 * 1000);

  const formatTime = (value: Date) =>
    value.toISOString().slice(0, 16).replace('T', ' ');

  const params = new URLSearchParams({
    format: 'json',
    COMMAND: "'399'",
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'coord@301'",
    COORD_TYPE: "'GEODETIC'",
    SITE_COORD: `'${longitude},${latitude},0'`,
    START_TIME: `'${formatTime(start)}'`,
    STOP_TIME: `'${formatTime(stop)}'`,
    STEP_SIZE: "'1 m'",
    QUANTITIES: "'4'",
    CSV_FORMAT: "'YES'",
  });

  const response = await fetch(`/api/horizons?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`JPL Horizons request failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(String(data.error));
  }

  const result: string = data.result || '';

  if (!result) {
    throw new Error('JPL Horizons returned an empty response.');
  }

  const startMarker = result.indexOf('$$SOE');
  const endMarker = result.indexOf('$$EOE');

  if (startMarker === -1 || endMarker === -1) {
    throw new Error(
      'JPL Horizons did not return position data. Check the selected date and coordinates.'
    );
  }

  const rows = result
    .slice(startMarker + 5, endMarker)
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(',').map((value) => value.trim()))
    .filter((columns) => columns.length >= 5);

  if (rows.length === 0) {
    throw new Error('No usable Earth position data was returned.');
  }

  const azimuth = Number.parseFloat(rows[0][3]);
  const elevation = Number.parseFloat(rows[0][4]);

  if (!Number.isFinite(azimuth) || !Number.isFinite(elevation)) {
    throw new Error(
      'Could not interpret the Earth position data returned by JPL Horizons.'
    );
  }

  return {
    azimuth,
    elevation,
    observationTime: formatTime(start),
  };
}

function EarthVisibility() {
  const [latitude, setLatitude] = useState('-85');
  const [longitude, setLongitude] = useState('0');
  const [date, setDate] = useState('2026-11-14');
  const [time, setTime] = useState('12:00');

  const [position, setPosition] = useState<EarthPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function calculateVisibility() {
    setLoading(true);
    setError('');
    setPosition(null);

    try {
      const result = await getEarthPosition(
        Number(latitude),
        Number(longitude),
        date,
        time
      );

      setPosition(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to calculate Earth visibility.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="earth-visibility-panel">
      <div className="eyebrow">EARTH / COMMUNICATION GEOMETRY</div>

      <h2>Earth Position Analysis</h2>

      <p>
        Calculate Earth's apparent position above or below the local
        lunar horizon using JPL Horizons data.
      </p>

      <div className="earth-input-grid">
        <label>
          LATITUDE (°)
          <input
            type="number"
            value={latitude}
            min="-90"
            max="90"
            step="any"
            onChange={(e) => setLatitude(e.target.value)}
          />
        </label>

        <label>
          LONGITUDE (°)
          <input
            type="number"
            value={longitude}
            min="-180"
            max="180"
            step="any"
            onChange={(e) => setLongitude(e.target.value)}
          />
        </label>

        <label>
          DATE (UTC)
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label>
          TIME (UTC)
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
      </div>

      <button
        className="calculate-button"
        onClick={calculateVisibility}
        disabled={loading}
      >
        {loading ? 'CALCULATING...' : 'CALCULATE EARTH POSITION'}
      </button>

      {error && (
        <div className="earth-error">
          {error}
        </div>
      )}

      {position && (
        <div className="earth-results">
          <div className="eyebrow">JPL HORIZONS RESULTS</div>

          <div className="earth-result-grid">
            <div className="earth-result-card">
              <span>EARTH ELEVATION</span>
              <strong>{position.elevation.toFixed(2)}°</strong>
            </div>

            <div className="earth-result-card">
              <span>EARTH AZIMUTH</span>
              <strong>{position.azimuth.toFixed(2)}°</strong>
            </div>

            <div className="earth-result-card">
              <span>GEOMETRIC VISIBILITY</span>
              <strong>
                {position.elevation > 0
                  ? 'ABOVE HORIZON'
                  : 'BELOW HORIZON'}
              </strong>
            </div>
          </div>

          <p className="earth-observation-time">
            Observation time: {position.observationTime} UTC
          </p>

          <p className="earth-science-note">
            Geometric visibility only. Local terrain obstruction,
            antenna orientation and communication link performance
            are not included.
          </p>
        </div>
      )}
    </section>
  );
}

export default EarthVisibility;
