const handleRequest = require('./src');

// Speed test page, inlined at build time by build.mjs
const PAGE_HTML = typeof __PAGE_HTML__ !== 'undefined' ? __PAGE_HTML__ : null;

const isPageRequest = request => {
  const { pathname } = new URL(request.url);
  return (
    PAGE_HTML &&
    request.method === 'GET' &&
    (pathname === '/' || pathname === '/index.html')
  );
};

addEventListener('fetch', event => {
  if (isPageRequest(event.request)) {
    event.respondWith(
      new Response(PAGE_HTML, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store'
        }
      })
    );
    return;
  }

  event.respondWith(handleRequest(event.request));
});
