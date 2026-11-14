
import { useMemo, useState } from 'react';
import './CommunicationAnalysis.css';

export default function CommunicationAnalysis() {
  const [latitude, setLatitude] = useState(-85);
  const [altitude, setAltitude] = useState(2);
  const [frequency, setFrequency] = useState(2.2);
  const [transmitterPower, setTransmitterPower] = useState(20);
  const [antennaGain, setAntennaGain] = useState(10);

  const analysis = useMemo(() => {
    const moonRadius = 1737.4;
    const height = Math.max(0, altitude);

    // Geometric horizon distance from the Moon's surface
    const horizonDistance = Math.sqrt(
      Math.pow(moonRadius + height, 2) -
      Math.pow(moonRadius, 2)
    );

    const distanceKm = horizonDistance;
    const distanceMeters = Math.max(1000, distanceKm * 1000);

    // Radio wavelength
    const frequencyHz = frequency * 1e9;
    const wavelength = 299792458 / frequencyHz;

    // Free-space path loss
    const fspl =
      20 * Math.log10(distanceMeters) +
      20 * Math.log10(frequencyHz) -
      147.55;

    // Simplified received-power estimate
    const receivedPower =
      10 * Math.log10(Math.max(0.001, transmitterPower * 1000)) +
      antennaGain -
      fspl;

    const region =
      Math.abs(latitude) >= 80
        ? 'Polar region'
        : 'Non-polar region';

    return {
      distanceKm,
      wavelength,
      fspl,
      receivedPower,
      region,
    };
  }, [latitude, altitude, frequency, transmitterPower, antennaGain]);

  const status =
    analysis.receivedPower > -100
      ? 'Potentially strong'
      : analysis.receivedPower > -120
      ? 'Moderate'
      : 'Weak';

  return (
    <div className="communication-page">
      <header className="communication-header">
        <div>
          <div className="communication-eyebrow">
            MISSION INFRASTRUCTURE
          </div>
          <h1>Communication Analysis</h1>
          <p>
            Explore estimated lunar surface-to-relay radio
            communication conditions for mission planning.
          </p>
        </div>

        <div className="communication-status">
          <span className="status-dot" />
          SIMULATION
        </div>
      </header>

      <div className="communication-grid">
        <section className="communication-panel">
          <h2>Mission Parameters</h2>
          <p className="panel-description">
            Adjust the mission parameters to explore different scenarios.
          </p>

          <label>
            Landing latitude
            <span>{latitude.toFixed(1)}°</span>
          </label>
          <input
            type="range"
            min="-90"
            max="90"
            step="1"
            value={latitude}
            onChange={(e) => setLatitude(Number(e.target.value))}
          />

          <label>
            Antenna height above surface
            <span>{altitude.toFixed(1)} km</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="20"
            step="0.1"
            value={altitude}
            onChange={(e) => setAltitude(Number(e.target.value))}
          />

          <label>
            Radio frequency
            <span>{frequency.toFixed(2)} GHz</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="20"
            step="0.1"
            value={frequency}
            onChange={(e) => setFrequency(Number(e.target.value))}
          />

          <label>
            Transmitter power
            <span>{transmitterPower} W</span>
          </label>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={transmitterPower}
            onChange={(e) => setTransmitterPower(Number(e.target.value))}
          />

          <label>
            Antenna gain
            <span>{antennaGain} dBi</span>
          </label>
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={antennaGain}
            onChange={(e) => setAntennaGain(Number(e.target.value))}
          />
        </section>

        <section className="communication-panel">
          <h2>Link Analysis</h2>
          <p className="panel-description">
            Live estimates based on the selected parameters.
          </p>

          <div className="communication-metric">
            <span>Geometric horizon distance</span>
            <strong>{analysis.distanceKm.toFixed(2)} km</strong>
          </div>

          <div className="communication-metric">
            <span>Signal wavelength</span>
            <strong>{(analysis.wavelength * 100).toFixed(2)} cm</strong>
          </div>

          <div className="communication-metric">
            <span>Free-space path loss</span>
            <strong>{analysis.fspl.toFixed(2)} dB</strong>
          </div>

          <div className="communication-metric">
            <span>Estimated received power</span>
            <strong>{analysis.receivedPower.toFixed(2)} dBm</strong>
          </div>

          <div className="communication-metric">
            <span>Landing region</span>
            <strong>{analysis.region}</strong>
          </div>

          <div className="communication-result">
            <span>SIMULATED LINK INDICATOR</span>
            <strong>{status}</strong>
            <p>
              This simplified estimate is not a verified operational
              communication link.
            </p>
          </div>
        </section>
      </div>

      <section className="communication-panel communication-notes">
        <h2>Mission Communication Notes</h2>
        <ul>
          <li>
            Lunar surface missions may need an orbiting relay spacecraft
            when Earth is below the local horizon.
          </li>
          <li>
            Terrain and surface elevation can obstruct radio line of sight.
          </li>
          <li>
            Relay orbit, antenna orientation, receiver sensitivity and
            hardware losses affect communication quality.
          </li>
          <li>
            Polar landing sites may experience different Earth visibility
            conditions depending on their location and local terrain.
          </li>
        </ul>
      </section>

      <div className="communication-disclaimer">
        SIMULATION ONLY · NOT FLIGHT-VALIDATED COMMUNICATION DATA
      </div>
    </div>
  );
}
