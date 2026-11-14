
import { useMemo, useState } from 'react';
import './CommunicationAnalysis.css';

const MOON_RADIUS = 1737.4;
const EARTH_MOON_DISTANCE = 384400;
const SPEED_OF_LIGHT = 299792.458;
const EARTH_ANGULAR_RADIUS = 0.95;

type Band = 'S-band' | 'X-band' | 'Ka-band';

export default function CommunicationAnalysis() {
  const [latitude, setLatitude] = useState(-85);
  const [longitude, setLongitude] = useState(0);
  const [altitude, setAltitude] = useState(0);
  const [band, setBand] = useState<Band>('X-band');

  const result = useMemo(() => {
    // Approximate sub-Earth point on the Moon.
    // This simplified model assumes latitude 0, longitude 0.
    const lat1 = latitude * Math.PI / 180;
    const lon1 = longitude * Math.PI / 180;

    const cosAngle =
      Math.cos(lat1) * Math.cos(lon1);

    const angularDistance =
      Math.acos(Math.max(-1, Math.min(1, cosAngle)));

    const earthElevation =
      90 - angularDistance * 180 / Math.PI;

    const earthVisible =
      earthElevation >= -EARTH_ANGULAR_RADIUS;

    const distance =
      EARTH_MOON_DISTANCE + altitude;

    const oneWayDelay =
      distance / SPEED_OF_LIGHT;

    const roundTripDelay =
      oneWayDelay * 2;

    return {
      earthVisible,
      earthElevation,
      distance,
      oneWayDelay,
      roundTripDelay,
    };
  }, [latitude, longitude, altitude]);

  const formatDelay = (seconds: number) =>
    `${seconds.toFixed(2)} seconds`;

  return (
    <div className="communication-page">
      <div className="communication-header">
        <div>
          <span className="communication-eyebrow">
            IDK / MISSION SYSTEMS
          </span>
          <h1>Communication & Radio Analysis</h1>
          <p>
            Evaluate the estimated radio communication geometry
            between a lunar spacecraft and Earth.
          </p>
        </div>
        <div className="communication-icon">⌁</div>
      </div>

      <div className="communication-grid">
        <section className="comm-card comm-inputs">
          <div className="comm-card-heading">
            <span>01 / MISSION PARAMETERS</span>
            <span className="comm-dot" />
          </div>

          <label>
            Landing site latitude
            <div className="comm-input-row">
              <input
                type="number"
                min="-90"
                max="90"
                step="0.1"
                value={latitude}
                onChange={(e) =>
                  setLatitude(Math.max(-90, Math.min(90, Number(e.target.value))))
                }
              />
              <span>°</span>
            </div>
          </label>

          <label>
            Landing site longitude
            <div className="comm-input-row">
              <input
                type="number"
                min="-180"
                max="180"
                step="0.1"
                value={longitude}
                onChange={(e) =>
                  setLongitude(Math.max(-180, Math.min(180, Number(e.target.value))))
                }
              />
              <span>°</span>
            </div>
          </label>

          <label>
            Spacecraft altitude
            <div className="comm-input-row">
              <input
                type="number"
                min="0"
                max="1000"
                step="0.1"
                value={altitude}
                onChange={(e) =>
                  setAltitude(Math.max(0, Math.min(1000, Number(e.target.value))))
                }
              />
              <span>km</span>
            </div>
          </label>

          <label>
            Radio frequency band
            <select
              value={band}
              onChange={(e) => setBand(e.target.value as Band)}
            >
              <option value="S-band">S-band</option>
              <option value="X-band">X-band</option>
              <option value="Ka-band">Ka-band</option>
            </select>
          </label>

          <p className="comm-hint">
            Coordinates are entered in lunar latitude and longitude.
            The Earth-visibility model is an approximation.
          </p>
        </section>

        <section className="comm-card comm-status">
          <div className="comm-card-heading">
            <span>02 / DIRECT EARTH LINK</span>
            <span className="comm-live-dot" />
          </div>

          <div className="comm-status-visual">
            <div className="comm-orbit">
              <div className="comm-earth">🌍</div>
              <div className="comm-signal-line">
                <span />
              </div>
              <div className="comm-moon">🌕</div>
            </div>
          </div>

          <div className="comm-status-result">
            <span>GEOMETRIC VISIBILITY</span>
            <strong className={result.earthVisible ? 'comm-good' : 'comm-bad'}>
              {result.earthVisible
                ? 'EARTH VISIBLE'
                : 'EARTH BELOW HORIZON'}
            </strong>
            <p>
              {result.earthVisible
                ? 'A direct geometric line of sight to Earth is estimated.'
                : 'The lunar surface obstructs the direct path to Earth in this simplified model.'}
            </p>
          </div>

          <div className="comm-stat-row">
            <div>
              <span>Earth elevation</span>
              <strong>{result.earthElevation.toFixed(2)}°</strong>
            </div>
            <div>
              <span>Selected band</span>
              <strong>{band}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="comm-card comm-delay">
        <div className="comm-card-heading">
          <span>03 / SIGNAL PROPAGATION</span>
          <span>RADIO WAVES</span>
        </div>

        <div className="comm-delay-grid">
          <div>
            <span>Estimated distance</span>
            <strong>
              {result.distance.toLocaleString('en-US', {
                maximumFractionDigits: 1,
              })} km
            </strong>
          </div>
          <div>
            <span>One-way signal delay</span>
            <strong>{formatDelay(result.oneWayDelay)}</strong>
          </div>
          <div>
            <span>Round-trip delay</span>
            <strong>{formatDelay(result.roundTripDelay)}</strong>
          </div>
        </div>

        <p className="comm-hint">
          Delay is calculated using the speed of light and an approximate
          Earth–Moon distance. Actual delay changes with orbital geometry.
        </p>
      </section>

      <section className="comm-card comm-relay">
        <div className="comm-card-heading">
          <span>04 / RELAY NETWORK</span>
          <span>MISSION DEPENDENT</span>
        </div>

        <div className="comm-relay-flow">
          <div className="comm-node">
            <span>🚀</span>
            <strong>LANDER</strong>
            <small>Surface spacecraft</small>
          </div>

          <div className="comm-connector">
            <span>Radio link</span>
            <div />
          </div>

          <div className="comm-node comm-node-relay">
            <span>🛰️</span>
            <strong>RELAY</strong>
            <small>Orbital satellite</small>
          </div>

          <div className="comm-connector">
            <span>Radio link</span>
            <div />
          </div>

          <div className="comm-node">
            <span>🌍</span>
            <strong>EARTH</strong>
            <small>Mission control</small>
          </div>
        </div>

        <div className="comm-relay-status">
          <span>RELAY AVAILABILITY</span>
          <strong>REQUIRES ORBIT DATA</strong>
          <p>
            Relay coverage cannot be confirmed without a specific
            relay spacecraft, orbit and mission time.
          </p>
        </div>
      </section>

      <section className="comm-card comm-notes">
        <div className="comm-card-heading">
          <span>05 / ENGINEERING NOTES</span>
        </div>

        <ul>
          <li>
            <strong>S-band:</strong> Commonly used for spacecraft
            telemetry, tracking and command.
          </li>
          <li>
            <strong>X-band:</strong> Used for deep-space communications
            and science data.
          </li>
          <li>
            <strong>Ka-band:</strong> Supports high-data-rate
            communication, with greater sensitivity to pointing
            and atmospheric effects.
          </li>
        </ul>

        <p className="comm-disclaimer">
          This module estimates visibility and propagation delay.
          It does not calculate actual signal strength, link margin,
          data rate or radio hardware compatibility. Those require
          transmitter power, antenna gains, receiver sensitivity,
          pointing data and mission-specific information.
        </p>
      </section>
    </div>
  );
}
