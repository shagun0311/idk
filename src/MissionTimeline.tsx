
import { useState, type FormEvent } from 'react';
import './MissionTimeline.css';

type SearchResult = {
  pageid: number;
  title: string;
  snippet: string;
};

type TimelineEvent = {
  date: string;
  title: string;
  description: string;
};

type WikipediaPage = {
  title: string;
  extract?: string;
};

type WikipediaSearchResponse = {
  query?: {
    search?: {
      pageid: number;
      title: string;
      snippet: string;
    }[];
  };
};

type WikipediaExtractResponse = {
  query?: {
    pages?: Record<string, WikipediaPage>;
  };
};

const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';

const DATE_PATTERN =
  /\b(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|(?:19|20)\d{2}-\d{2}-\d{2}|(?:19|20)\d{2})\b/i;

const MISSION_ACTIONS =
  /\b(launch|launched|liftoff|lifted off|flyby|flew past|gravity assist|orbit insertion|entered orbit|orbited|landed|landing|touchdown|deployed|deployment|separated|separation|arrived|reached|returned|splashdown|docking|docked|undocking|translunar|maneuver|manoeuvre|mission began|mission ended|commissioned|first light|communication|contact was lost|contact was restored|closest approach|encounter|sample return|sample collection|captured|injected into orbit|entered interstellar space|crossed the heliopause)\b/i;

function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\[\d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getEventTitle(sentence: string): string {
  const rules: [RegExp, string][] = [
    [/\bgravity assist\b/i, 'Gravity assist'],
    [/\blaunch|launched|liftoff|lifted off\b/i, 'Launch'],
    [/\bfirst light\b/i, 'First light'],
    [/\bclosest approach\b/i, 'Closest approach'],
    [/\bflyby|flew past|encounter\b/i, 'Planetary flyby'],
    [/\borbit insertion|injected into orbit|entered orbit\b/i, 'Orbit insertion'],
    [/\borbited\b/i, 'Orbital operations'],
    [/\blanded|landing|touchdown\b/i, 'Landing'],
    [/\bdeployed|deployment\b/i, 'Deployment'],
    [/\bseparated|separation\b/i, 'Stage separation'],
    [/\btranslunar\b/i, 'Translunar injection'],
    [/\bdocking|docked\b/i, 'Docking'],
    [/\bundocking\b/i, 'Undocking'],
    [/\bsplashdown\b/i, 'Splashdown'],
    [/\breturned\b/i, 'Return'],
    [/\bsample collection\b/i, 'Sample collection'],
    [/\bsample return\b/i, 'Sample return'],
    [/\bentered interstellar space|crossed the heliopause\b/i, 'Interstellar space entry'],
    [/\bcontact was lost\b/i, 'Communication lost'],
    [/\bcontact was restored\b/i, 'Communication restored'],
    [/\bcommissioned\b/i, 'Commissioning'],
    [/\bmission ended\b/i, 'Mission completion'],
    [/\bmission began\b/i, 'Mission start'],
    [/\barrived\b/i, 'Arrival'],
    [/\breached|reached\b/i, 'Milestone reached'],
    [/\bmanoeuvre|maneuver\b/i, 'Trajectory manoeuvre'],
  ];

  for (const [pattern, title] of rules) {
    if (pattern.test(sentence)) return title;
  }

  const withoutDate = sentence
    .replace(DATE_PATTERN, '')
    .replace(/\b(in|on|at|by|during)\s+(?=[,.;])/gi, '')
    .replace(/^[\s,.:;–—-]+/, '')
    .trim();

  const words = withoutDate.split(/\s+/).filter(Boolean);

  if (words.length === 0) return 'Mission milestone';

  return words.slice(0, 5).join(' ').replace(/[,.]$/, '');
}

function extractTimeline(article: string): TimelineEvent[] {
  const paragraphs = article
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 40);

  const events: TimelineEvent[] = [];
  const seen = new Set<string>();

  for (const paragraph of paragraphs) {
    const sentences =
      paragraph.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [paragraph];

    for (const rawSentence of sentences) {
      const sentence = cleanText(rawSentence);

      if (sentence.length < 35) continue;

      const dateMatch = sentence.match(DATE_PATTERN);

      if (!dateMatch) continue;

      // Avoid treating every mention of a year as a mission event.
      if (!MISSION_ACTIONS.test(sentence)) continue;

      const date = dateMatch[0];
      const title = getEventTitle(sentence);

      const key = `${date.toLowerCase()}-${sentence
        .toLowerCase()
        .slice(0, 100)}`;

      if (seen.has(key)) continue;
      seen.add(key);

      events.push({
        date,
        title,
        description: sentence,
      });

      if (events.length >= 20) return events;
    }
  }

  return events;
}

export default function MissionTimeline() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [error, setError] = useState('');

  async function searchSpacecraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!search.trim()) return;

    setLoadingSearch(true);
    setError('');
    setResults([]);
    setEvents([]);
    setSelectedTitle('');
    setSourceUrl('');

    try {
      const url = new URL(WIKIPEDIA_API);

      url.search = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: search.trim(),
        srlimit: '8',
        format: 'json',
        origin: '*',
      }).toString();

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(
          'Could not connect to the mission information service.'
        );
      }

      const data =
        (await response.json()) as WikipediaSearchResponse;

      const searchResults: SearchResult[] = (
        data.query?.search ?? []
      ).map((item) => ({
        pageid: item.pageid,
        title: item.title,
        snippet: cleanText(item.snippet),
      }));

      setResults(searchResults);

      if (searchResults.length === 0) {
        setError(
          'No matching articles found. Try another spacecraft name.'
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while searching.'
      );
    } finally {
      setLoadingSearch(false);
    }
  }

  async function loadTimeline(result: SearchResult) {
    setSelectedTitle(result.title);
    setEvents([]);
    setError('');
    setLoadingTimeline(true);

    const articleUrl = `https://en.wikipedia.org/?curid=${result.pageid}`;
    setSourceUrl(articleUrl);

    try {
      const url = new URL(WIKIPEDIA_API);

      url.search = new URLSearchParams({
        action: 'query',
        prop: 'extracts',
        explaintext: '1',
        exsectionformat: 'plain',
        exchars: '40000',
        pageids: String(result.pageid),
        format: 'json',
        origin: '*',
      }).toString();

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error('Could not retrieve this mission article.');
      }

      const data =
        (await response.json()) as WikipediaExtractResponse;

      const pages = data.query?.pages ?? {};
      const page = Object.values(pages)[0];

      if (!page?.extract) {
        throw new Error(
          'No article text was available for this spacecraft.'
        );
      }

      const extractedEvents = extractTimeline(page.extract);

      setEvents(extractedEvents);

      if (extractedEvents.length === 0) {
        setError(
          'The article did not contain enough clearly dated mission events. Try another search result.'
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not generate the mission timeline.'
      );
    } finally {
      setLoadingTimeline(false);
    }
  }

  return (
    <main className="mt-page">
      <header className="mt-header">
        <div>
          <p className="mt-eyebrow">
            MISSION CONTROL / SPACECRAFT DATABASE
          </p>
          <h1>Mission Timeline</h1>
          <p className="mt-intro">
            Search for a spacecraft and explore dated events
            throughout its mission.
          </p>
        </div>
      </header>

      <section className="mt-search-section">
        <p className="mt-eyebrow">SPACECRAFT SEARCH</p>
        <h2>Which spacecraft are you exploring?</h2>

        <form className="mt-search-form" onSubmit={searchSpacecraft}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Try Voyager 1, Artemis II, Europa Clipper..."
            aria-label="Search for a spacecraft"
          />

          <button
            type="submit"
            disabled={loadingSearch || !search.trim()}
          >
            {loadingSearch ? 'Searching...' : 'Search'}
          </button>
        </form>

        <p className="mt-search-note">
          Search results and extracted milestones are from
          Wikipedia articles. Verify important dates with official
          mission sources.
        </p>
      </section>

      {error && <div className="mt-error">{error}</div>}

      {results.length > 0 && (
        <section className="mt-results-section">
          <div className="mt-section-heading">
            <h2>Search results</h2>
            <span>{results.length} results</span>
          </div>

          <div className="mt-results-list">
            {results.map((result) => (
              <button
                key={result.pageid}
                className={`mt-result ${
                  selectedTitle === result.title ? 'active' : ''
                }`}
                onClick={() => loadTimeline(result)}
              >
                <span className="mt-result-icon">◉</span>

                <span className="mt-result-text">
                  <strong>{result.title}</strong>
                  <span>
                    {result.snippet || 'Open this article'}
                  </span>
                </span>

                <span className="mt-result-arrow">↗</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {loadingTimeline && (
        <div className="mt-loading">
          <div className="mt-loader" />
          <p>Building your mission timeline...</p>
        </div>
      )}

      {selectedTitle && !loadingTimeline && (
        <section className="mt-detail-section">
          <div className="mt-detail-header">
            <div>
              <p className="mt-eyebrow">SELECTED SPACECRAFT</p>
              <h2>{selectedTitle}</h2>
              <p>
                Dated mission events extracted from the selected
                article. These are automatically detected, not
                independently verified.
              </p>
            </div>

            <span className="mt-event-count">
              {events.length} events found
            </span>
          </div>

          {events.length > 0 ? (
            <>
              <div className="mt-timeline-heading">
                <h3>Mission sequence</h3>
                <span>Extracted milestones</span>
              </div>

              <div className="mt-events">
                {events.map((item, index) => (
                  <article
                    className="mt-event"
                    key={`${item.date}-${index}`}
                  >
                    <div className="mt-event-marker">
                      <span>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="mt-event-content">
                      <time>{item.date}</time>
                      <h4>{item.title}</h4>
                      <p>{item.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-empty">
              <h3>No dated milestones found</h3>
              <p>
                This article may not contain enough clearly dated
                mission events. Try another search result or check
                the original article.
              </p>
            </div>
          )}

          <a
            className="mt-source-link"
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            View original article ↗
          </a>
        </section>
      )}

      {!selectedTitle &&
        !loadingTimeline &&
        results.length === 0 && (
          <section className="mt-empty-state">
            <div className="mt-empty-symbol">⌕</div>
            <h2>Explore a mission</h2>
            <p>
              Search for a spacecraft to find published mission
              information and dated milestones.
            </p>
          </section>
        )}

      <footer className="mt-footer">
        <span>DATA SOURCE</span>
        <span>Wikimedia Foundation · Wikipedia API</span>
      </footer>
    </main>
  );
}
