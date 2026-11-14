
import { useState } from 'react';
import {
  getSolarPosition,
  getSolarTimeline,
  type SolarTimeline,
} from './solarCalculations';

function SolarAnalysis() {
  const [latitude, setLatitude] = useState('-85.00');
  const [longitude, setLongitude] = useState('0.00');
  const [date, setDate] = useState('2026-11-13');
  const [time, setTime] = useState('12:00');

  const [loading, setLoading] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [error, setError] = useState('');
  const [timelineError, setTimelineError] = useState('');

  const [result, setResult] = useState<{
    elevation: number;
    azimuth: number;
    illumination: string;
    power: number;
  } | null>(null);

  const [timeline, setTimeline] = useState<SolarTimeline | null>(null);

  async function calculateConditions() {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const position = await getSolarPosition(
        Number(latitude),
        Number(longitude),
        date,
        time
      );

      const elevation = position.elevation;

      const power =
        elevation > 0
          ? 1361 * Math.sin((elevation * Math.PI) / 180)
          : 0;

      setResult({
        elevation,
        azimuth: position.azimuth,
        illumination:
          elevation > 0 ? 'SUN ABOVE HORIZON' : 'SUN BELOW HORIZON',
        power: Math.max(0, power),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to retrieve solar data.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function calculateTimeline() {
    setTimelineLoading(true);
    setTimelineError('');
    setTimeline(null);

    try {
      const data = await getSolarTimeline(
        Number(latitude),
        Number(longitude),
        date,
        time
      );

      setTimeline(data);
    } catch (err) {
      setTimelineError(
        err instanceof Error
          ? err.message
          : 'Unable to calculate sunlight timeline.'
      );
    } finally {
      setTimelineLoading(false);
    }
  }

  return (
    <div className="solar-workspace">

      <section className="solar-panel">
        <div className="eyebrow">OBSERVATION PARAMETERS</div>
        <h2>Define your observation</h2>
        <p>
          Select a lunar location and observation time to investigate
          solar conditions.
        </p>

        <div className="solar-input-grid">
          <label>
            LATITUDE (°)
            <input
              type="number"
              value={latitude}
              onChange={(e) => {
                setLatitude(e.target.value);
                setTimeline(null);
              }}
              min="-90"
              max="90"
              step="0.01"
            />
          </label>

          <label>
            LONGITUDE (°)
            <input
              type="number"
              value={longitude}
              onChange={(e) => {
                setLongitude(e.target.value);
                setTimeline(null);
              }}
              min="-180"
              max="180"
              step="0.01"
            />
          </label>

          <label>
            OBSERVATION DATE
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setTimeline(null);
              }}
            />
          </label>

          <label>
            OBSERVATION TIME (UTC)
            <input
              type="time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                setTimeline(null);
              }}
            />
          </label>
        </div>

        <button
          className="solar-calculate-button"
          onClick={calculateConditions}
          disabled={loading}
        >
          {loading ? 'CALCULATING...' : 'CALCULATE SOLAR CONDITIONS'}
        </button>
      </section>

      <section className="solar-panel">
        <div className="eyebrow">SOLAR CONDITIONS</div>
        <h2>Illumination overview</h2>
        <p>
          Solar position calculated using NASA JPL Horizons.
        </p>

        <div className="solar-metrics">
          {[
            ['SUN ELEVATION', result ? `${result.elevation.toFixed(2)}°` : 'Awaiting data'],
            ['SUN AZIMUTH', result ? `${result.azimuth.toFixed(2)}°` : 'Awaiting data'],
            ['ILLUMINATION', result ? result.illumination : 'Awaiting data'],
            ['SOLAR POWER', result ? `${result.power.toFixed(1)} W/m²` : 'Awaiting data'],
          ].map(([label, value]) => (
            <div className="solar-metric" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="solar-status">
          <span className="status-dot" />
          {loading
            ? 'CONNECTING TO JPL HORIZONS...'
            : error
              ? 'EPHEMERIS REQUEST FAILED'
              : result
                ? 'EPHEMERIS DATA RECEIVED'
                : 'READY FOR CALCULATION'}
        </div>

        {error && <p className="solar-error">{error}</p>}

        {result && (
          <p className="solar-note">
            Solar power is an idealized estimate of sunlight incident
            on a horizontal surface, before equipment losses.
          </p>
        )}
      </section>

      <section className="solar-panel">
        <div className="eyebrow">LUNAR DAY ANALYSIS</div>
        <h2>Sunlight timeline</h2>
        <p>
          Explore estimated sunlight and darkness across approximately
          29.5 Earth days at this location.
        </p>

        <button
          className="solar-calculate-button"
          onClick={calculateTimeline}
          disabled={timelineLoading}
        >
          {timelineLoading
            ? 'ANALYSING LUNAR DAY...'
            : 'GENERATE SUNLIGHT TIMELINE'}
        </button>

        {timelineError && (
          <p className="solar-error">{timelineError}</p>
        )}

        {timeline && (
          <div className="timeline-results">
            <div className="solar-metrics">
              <div className="solar-metric">
                <span>ESTIMATED SUNLIGHT</span>
                <strong>{timeline.sunlightHours.toFixed(1)} h</strong>
              </div>

              <div className="solar-metric">
                <span>ESTIMATED DARKNESS</span>
                <strong>{timeline.darknessHours.toFixed(1)} h</strong>
              </div>

              <div className="solar-metric">
                <span>DATA SAMPLES</span>
                <strong>{timeline.samples.length}</strong>
              </div>
            </div>

            <div className="timeline-legend">
              <span><i className="timeline-sun" /> Sun above horizon</span>
              <span><i className="timeline-dark" /> Sun below horizon</span>
            </div>

            <div className="timeline-grid">
              {timeline.samples.map((sample, index) => (
                <div
                  key={`${sample.time}-${index}`}
                  className={`timeline-cell ${
                    sample.illuminated ? 'sunlit' : 'dark'
                  }`}
                  title={`${sample.time} UTC · ${sample.elevation.toFixed(2)}° elevation`}
                />
              ))}
            </div>

            <div className="timeline-axis">
              <span>{timeline.samples[0]?.time} UTC</span>
              <span>Approximately 29.5 Earth days</span>
              <span>{timeline.samples[timeline.samples.length - 1]?.time} UTC</span>
            </div>

            <p className="solar-note">
              Each sample represents a 6-hour interval. Sunlight duration
              is estimated from the midpoint elevation of adjacent samples.
              Terrain shadows and local horizon obstructions are not included.
            </p>
          </div>
        )}
      </section>

      <section className="solar-panel">
        <div className="eyebrow">OBSERVATION SUMMARY</div>
        <h2>Selected conditions</h2>

        <div className="solar-summary">
          <p>Latitude: {latitude || 'Not set'}°</p>
          <p>Longitude: {longitude || 'Not set'}°</p>
          <p>Date: {date || 'Not set'}</p>
          <p>Time: {time || 'Not set'} UTC</p>
        </div>
      </section>

    </div>
  );
}

export default SolarAnalysis;

