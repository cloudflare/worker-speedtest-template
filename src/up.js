async function handleRequest(request) {
  const reqTime = new Date();

  // Drain the upload so the response is only sent once all content is received
  const reader = request.body && request.body.getReader && request.body.getReader();
  if (reader) {
    while (!(await reader.read()).done);
  }

  const res = new Response('ok');

  res.headers.set('access-control-allow-origin', '*');
  res.headers.set('timing-allow-origin', '*');

  request.cf &&
    request.cf.colo &&
    res.headers.set('cf-meta-colo', request.cf.colo);

  res.headers.set('cf-meta-request-time', +reqTime);

  res.headers.set(
    'access-control-expose-headers',
    'cf-meta-colo, cf-meta-request-time'
  );

  return res;
}

module.exports = handleRequest;
