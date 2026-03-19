import jwt from 'jsonwebtoken';

export function signJwt<T extends Record<string, unknown>>(
  payload: T,
  secret: string,
  expiresInSeconds: number,
): string {
  // jsonwebtoken handles iat/exp and validates exp on verify.
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: expiresInSeconds,
  });
}

export function verifyJwt<T extends Record<string, unknown>>(
  token: string,
  secret: string,
): T {
  // jwt.verify throws on invalid signature / exp / malformed tokens.
  return jwt.verify(token, secret, { algorithms: ['HS256'] }) as T;
}