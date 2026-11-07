import handler from '../../api/generate-questions.js';

export async function handlerWrapper(event, context) {
  // Convert Netlify event to Node req/res mock
  const req = {
    method: event.httpMethod,
    headers: event.headers,
    body: event.body ? JSON.parse(event.body) : {}
  };

  let statusCode = 200;
  let headers = {};
  let body = '';

  const res = {
    setHeader(key, value) {
      headers[key] = value;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      body = JSON.stringify(data);
      headers['Content-Type'] = 'application/json';
      return this;
    },
    end() {
      return this;
    }
  };

  await handler(req, res);

  return {
    statusCode,
    headers,
    body
  };
}

export { handlerWrapper as handler };
