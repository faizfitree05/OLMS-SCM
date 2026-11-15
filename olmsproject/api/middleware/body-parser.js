import { PayloadTooLargeError, UnsupportedMediaTypeError, ValidationError } from '../../errors.js';

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

/** Reads the body; keeps draining past the limit so the client always gets a clean 413. */
function readBody(stream, limitBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    stream.on('data', (chunk) => {
      size += chunk.length;
      if (size <= limitBytes) chunks.push(chunk);
    });
    stream.on('end', () => {
      if (size > limitBytes) reject(new PayloadTooLargeError(`Request body exceeds ${limitBytes} bytes.`));
      else resolve(Buffer.concat(chunks).toString('utf8'));
    });
    stream.on('error', reject);
  });
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new ValidationError('Malformed JSON body.');
  }
}

/** Parses JSON request bodies for POST/PUT/PATCH, with a size limit and content-type check. */
export function bodyParser({ limitBytes = 10240 } = {}) {
  return async function bodyParserMiddleware(ctx, next) {
    if (METHODS_WITH_BODY.has(ctx.request.method)) {
      const raw = await readBody(ctx.req, limitBytes);
      if (raw.length > 0) {
        const type = String(ctx.request.headers['content-type'] ?? '');
        if (!type.includes('application/json')) {
          throw new UnsupportedMediaTypeError('Content-Type must be application/json.');
        }
        ctx.request.body = parseJson(raw);
      }
    }
    await next();
  };
}
