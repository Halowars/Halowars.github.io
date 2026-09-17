(() => {
  const originalFetch = window.fetch.bind(window);
  const ROAD_DJ_HEADERS = new Set([
    'x-road-dj-name',
    'x-road-dj-track-name',
    'x-road-dj-track-artist'
  ]);

  function requestUrl(input) {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    return input?.url || '';
  }

  function requestMethod(input, init) {
    return String(init?.method || input?.method || 'GET').toUpperCase();
  }

  function isQueueRequest(input, init) {
    return requestMethod(input, init) === 'POST' &&
      requestUrl(input).includes('/api/spotify/v1/me/player/queue');
  }

  function hasRoadDjHeaders(headers) {
    if (!headers) return false;
    if (headers instanceof Headers) {
      return [...ROAD_DJ_HEADERS].some((name) => headers.has(name));
    }
    if (Array.isArray(headers)) {
      return headers.some(([name]) => ROAD_DJ_HEADERS.has(String(name).toLowerCase()));
    }
    if (typeof headers === 'object') {
      return Object.keys(headers).some((name) => ROAD_DJ_HEADERS.has(name.toLowerCase()));
    }
    return false;
  }

  function withoutRoadDjHeaders(headers) {
    if (!headers) return headers;

    if (headers instanceof Headers) {
      const clean = new Headers(headers);
      ROAD_DJ_HEADERS.forEach((name) => clean.delete(name));
      return clean;
    }

    if (Array.isArray(headers)) {
      return headers.filter(([name]) => !ROAD_DJ_HEADERS.has(String(name).toLowerCase()));
    }

    if (typeof headers === 'object') {
      return Object.fromEntries(
        Object.entries(headers).filter(([name]) => !ROAD_DJ_HEADERS.has(name.toLowerCase()))
      );
    }

    return headers;
  }

  window.fetch = async function roadDjFetch(input, init) {
    if (!isQueueRequest(input, init) || !hasRoadDjHeaders(init?.headers)) {
      return originalFetch(input, init);
    }

    try {
      return await originalFetch(input, init);
    } catch (error) {
      console.warn('Road DJ queue metadata request failed; retrying without optional metadata headers.', error);
      return originalFetch(input, {
        ...(init || {}),
        headers: withoutRoadDjHeaders(init?.headers)
      });
    }
  };
})();
