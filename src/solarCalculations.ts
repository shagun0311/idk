
export type SolarPosition = {
  azimuth: number;
  elevation: number;
  observationTime: string;
};

export type SolarSample = {
  time: string;
  elevation: number;
  illuminated: boolean;
};

export type SolarTimeline = {
  samples: SolarSample[];
  sunlightHours: number;
  darknessHours: number;
  durationHours: number;
};

function validateCoordinates(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90° and 90°.');
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180° and 180°.');
  }
}

function formatTime(value: Date) {
  return value.toISOString().slice(0, 16).replace('T', ' ');
}

async function requestHorizons(
  latitude: number,
  longitude: number,
  start: Date,
  stop: Date,
  step: string
): Promise<string> {
  const params = new URLSearchParams({
    format: 'json',
    COMMAND: "'10'",
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'coord@301'",
    COORD_TYPE: "'GEODETIC'",
    SITE_COORD: `'${longitude},${latitude},0'`,
    START_TIME: `'${formatTime(start)}'`,
    STOP_TIME: `'${formatTime(stop)}'`,
    STEP_SIZE: `'${step}'`,
    QUANTITIES: "'4'",
    CSV_FORMAT: "'YES'",
  });

  const response = await fetch(`/api/horizons?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`JPL Horizons request failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  const result: string = data.result || '';

  const startMarker = result.indexOf('$$SOE');
  const endMarker = result.indexOf('$$EOE');

  if (startMarker === -1 || endMarker === -1) {
    throw new Error('No ephemeris data was returned.');
  }

  return result.slice(startMarker + 5, endMarker).trim();
}

function parseRows(result: string) {
  return result
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const columns = line.split(',').map((value) => value.trim());

      return {
        time: columns[0],
        azimuth: Number.parseFloat(columns[3]),
        elevation: Number.parseFloat(columns[4]),
      };
    })
    .filter(
      (row) =>
        row.time &&
        Number.isFinite(row.azimuth) &&
        Number.isFinite(row.elevation)
    );
}

export async function getSolarPosition(
  latitude: number,
  longitude: number,
  date: string,
  time: string
): Promise<SolarPosition> {
  validateCoordinates(latitude, longitude);

  const start = new Date(`${date}T${time}:00Z`);

  if (Number.isNaN(start.getTime())) {
    throw new Error('Please enter a valid date and time.');
  }

  const stop = new Date(start.getTime() + 60 * 1000);

  const result = await requestHorizons(
    latitude,
    longitude,
    start,
    stop,
    '1 m'
  );

  const rows = parseRows(result);

  if (!rows.length) {
    throw new Error('Horizons returned an empty data table.');
  }

  return {
    azimuth: rows[0].azimuth,
    elevation: rows[0].elevation,
    observationTime: formatTime(start),
  };
}

export async function getSolarTimeline(
  latitude: number,
  longitude: number,
  date: string,
  time: string
): Promise<SolarTimeline> {
  validateCoordinates(latitude, longitude);

  const start = new Date(`${date}T${time}:00Z`);

  if (Number.isNaN(start.getTime())) {
    throw new Error('Please enter a valid date and time.');
  }

  // One lunar solar day is approximately 29.53 Earth days.
  const durationHours = 29.53059 * 24;
  const stop = new Date(
    start.getTime() + durationHours * 60 * 60 * 1000
  );

  const result = await requestHorizons(
    latitude,
    longitude,
    start,
    stop,
    '6 h'
  );

  const rows = parseRows(result);

  if (rows.length < 2) {
    throw new Error('Not enough samples were returned for the timeline.');
  }

  const samples: SolarSample[] = rows.map((row) => ({
    time: row.time,
    elevation: row.elevation,
    illuminated: row.elevation > 0,
  }));

  let sunlightHours = 0;

  // Estimate each 6-hour interval using its midpoint elevation.
  for (let i = 0; i < rows.length - 1; i++) {
    const midpointElevation =
      (rows[i].elevation + rows[i + 1].elevation) / 2;

    if (midpointElevation > 0) {
      const intervalStart = new Date(rows[i].time.replace(' ', 'T') + 'Z');
      const intervalEnd = new Date(rows[i + 1].time.replace(' ', 'T') + 'Z');

      const intervalHours =
        (intervalEnd.getTime() - intervalStart.getTime()) / 3600000;

      if (Number.isFinite(intervalHours) && intervalHours > 0) {
        sunlightHours += intervalHours;
      }
    }
  }

  const darknessHours = Math.max(0, durationHours - sunlightHours);

  return {
    samples,
    sunlightHours,
    darknessHours,
    durationHours,
  };
}
