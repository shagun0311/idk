
import { useState } from 'react';

type SavedLocation = {
  id: number;
  name: string;
  lat: number;
  lng: number;
};

const STORAGE_KEY = 'idk-saved-landing-locations';

function CompareSites() {
  const [sites, setSites] = useState<SavedLocation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const selectedSites = sites.filter((site) =>
    selectedIds.includes(site.id)
  );

  function toggleSite(id: number) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 3
          ? [...current, id]
          : current
    );
  }

  function refreshSites() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setSites(saved ? JSON.parse(saved) : []);
      setSelectedIds([]);
    } catch {
      setSites([]);
      setSelectedIds([]);
    }
  }

  return (
    <section className="compare-panel">
      <div className="eyebrow">LANDING SITE / COMPARATIVE ANALYSIS</div>

      <h2>Compare Landing Sites</h2>

      <p>
        Select up to three saved lunar locations to compare their
        geographical positions and review their available data.
      </p>

      <div className="compare-toolbar">
        <span>{sites.length} SAVED LOCATIONS</span>
        <button onClick={refreshSites}>↻ Refresh locations</button>
      </div>

      {sites.length === 0 ? (
        <div className="compare-empty">
          <span>◎</span>
          <h3>No saved locations yet</h3>
          <p>
            Visit Site Explorer, save some potential landing locations,
            and return here to compare them.
          </p>
        </div>
      ) : (
        <>
          <div className="compare-selection">
            {sites.map((site) => (
              <label className="compare-site-option" key={site.id}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(site.id)}
                  onChange={() => toggleSite(site.id)}
                  disabled={
                    !selectedIds.includes(site.id) &&
                    selectedIds.length >= 3
                  }
                />

                <span>
                  <strong>{site.name}</strong>
                  <small>
                    {site.lat.toFixed(4)}°, {site.lng.toFixed(4)}°
                  </small>
                </span>
              </label>
            ))}
          </div>

          <div className="compare-count">
            {selectedSites.length} / 3 LOCATIONS SELECTED
          </div>

          {selectedSites.length > 0 && (
            <div className="compare-results">
              <div className="compare-results-heading">
                <div className="eyebrow">SELECTED LOCATIONS</div>
                <h3>Location comparison</h3>
              </div>

              <div className="compare-table-wrapper">
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th>PARAMETER</th>
                      {selectedSites.map((site) => (
                        <th key={site.id}>{site.name}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td>Latitude</td>
                      {selectedSites.map((site) => (
                        <td key={site.id}>{site.lat.toFixed(4)}°</td>
                      ))}
                    </tr>

                    <tr>
                      <td>Longitude</td>
                      {selectedSites.map((site) => (
                        <td key={site.id}>{site.lng.toFixed(4)}°</td>
                      ))}
                    </tr>

                    <tr>
                      <td>Hemisphere</td>
                      {selectedSites.map((site) => (
                        <td key={site.id}>
                          {site.lat < 0 ? 'Southern' : 'Northern'}
                        </td>
                      ))}
                    </tr>

                    <tr>
                      <td>Distance from South Pole</td>
                      {selectedSites.map((site) => (
                        <td key={site.id}>
                          {(
                            Math.abs(site.lat + 90) *
                            111.2
                          ).toFixed(2)} km
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="compare-note">
                This initial comparison uses saved coordinates only.
                Elevation, slope, sunlight and Earth visibility have not
                yet been calculated for each selected location.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default CompareSites;
