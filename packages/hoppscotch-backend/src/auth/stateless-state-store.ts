import * as crypto from 'crypto';

/**
 * Module-level fallback secret for single-instance deployments
 * where INFRA.SESSION_SECRET is not configured.
 */
const FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

/**
 * Maximum serialized payload size in bytes.
 * Prevents oversized state parameters that could break provider redirects
 * or exceed URL length limits.
 */
const MAX_PAYLOAD_BYTES = 2048;

/**
 * Default cookie name used to bind the OAuth state to a specific browser session.
 * Prevents login CSRF by ensuring the callback can only be completed
 * by the same browser that initiated the OAuth flow.
 */
const DEFAULT_COOKIE_NAME = '__oauth_nonce';

/**
 * A stateless OAuth state store for passport strategies.
 *
 * Instead of storing state in express-session (MemoryStore), this encodes
 * the state as a signed, time-limited token passed through the OAuth `state`
 * query parameter. The token format is: `base64url(payload).base64url(hmac)`.
 *
 * CSRF protection: A random nonce is generated per OAuth flow, stored in a
 * SameSite=Lax HttpOnly cookie, and mixed into the HMAC signature. On
 * callback, the nonce from the cookie is used to verify the signature,
 * ensuring the same browser that started the flow completes it.
 *
 * This eliminates all server-side session state from the OAuth flow, making
 * it fully compatible with horizontal scaling (multiple backend instances
 * behind a load balancer).
 *
 * Supports both passport-oauth2 (Google, GitHub, Microsoft) which dispatches
 * by `.length`, and passport-openidconnect (OIDC) which always calls with 5 args.
 *
 * IMPORTANT: For multi-instance deployments, `INFRA.SESSION_SECRET` must be
 * set to the same value across all instances.
 */
export class StatelessStateStore {
  private readonly secret: string;
  private readonly maxAgeMs: number;
  private readonly cookieName: string;
  private readonly secureCookies: boolean;

  constructor(
    secret?: string,
    maxAgeMs: number = 600_000,
    cookieName?: string,
    secureCookies?: boolean,
  ) {
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'StatelessStateStore: INFRA.SESSION_SECRET must be set in production. Without a shared secret, OAuth callbacks will fail across load-balanced instances.',
        );
      }
      console.warn(
        '[StatelessStateStore] INFRA.SESSION_SECRET not set; using ephemeral fallback. OAuth will fail in any multi-instance deployment.',
      );
    }
    this.secret = secret || FALLBACK_SECRET;
    this.maxAgeMs = maxAgeMs;
    this.cookieName = cookieName || DEFAULT_COOKIE_NAME;
    this.secureCookies = secureCookies ?? false;
  }

  /**
   * Called by passport before redirecting to the OAuth provider.
   *
   * passport-oauth2 dispatches by `.length`:
   *   arity 5: store(req, verifier, state, meta, cb)  — PKCE flow
   *   arity 4: store(req, state, meta, cb)             — standard flow
   *   arity 3: store(req, meta, cb)                    — no state
   *
   * passport-openidconnect always calls with 5 args:
   *   store(req, ctx, appState, meta, cb)
   *
   * We declare 5 params so `.length === 5` satisfies both libraries.
   *
   * The token payload stores both `ctx` (OIDC context / PKCE verifier) and
   * `state` (the app state, e.g. { redirect_uri }) so that verify() can
   * return them both correctly to each library's restore/loaded callback.
   */
  store(
    req: any,
    ctxOrState: any,
    stateOrMeta: any,
    metaOrCb: any,
    cb?: Function,
  ): void {
    let ctx: any;
    let state: any;
    let callback: Function;

    if (typeof cb === 'function') {
      // 5-arg: (req, verifier/ctx, state, meta, cb)
      // For passport-oauth2 PKCE: verifier is a string, state is the app state
      // For passport-openidconnect: ctx has { maxAge, nonce, issued }, state is app state
      ctx = ctxOrState;
      state = stateOrMeta;
      callback = cb;
    } else if (typeof metaOrCb === 'function') {
      // 4-arg: (req, state, meta, cb)
      ctx = undefined;
      state = ctxOrState;
      callback = metaOrCb;
    } else if (typeof stateOrMeta === 'function') {
      // 3-arg: (req, meta, cb)
      ctx = undefined;
      state = {};
      callback = stateOrMeta;
    } else {
      throw new Error('StatelessStateStore.store: invalid arguments');
    }

    try {
      // Generate a browser-bound nonce for CSRF protection
      const nonce = crypto.randomBytes(16).toString('hex');

      const payload: any = {
        state: state,
        exp: Date.now() + this.maxAgeMs,
        nonce: nonce,
      };
      // Store ctx only if defined (OIDC context or PKCE verifier)
      if (ctx !== undefined && ctx !== null) {
        payload.ctx = ctx;
      }

      const serialized = JSON.stringify(payload);
      if (Buffer.byteLength(serialized) > MAX_PAYLOAD_BYTES) {
        return callback(
          new Error('OAuth state payload exceeds maximum allowed size'),
        );
      }

      const encoded = this.encode(payload);

      // Set the nonce as a SameSite cookie to bind the OAuth flow to this browser
      if (req.res) {
        req.res.cookie(this.cookieName, nonce, {
          httpOnly: true,
          sameSite: 'lax',
          secure: this.secureCookies,
          maxAge: this.maxAgeMs,
          path: '/',
        });
      }

      callback(null, encoded);
    } catch (err) {
      callback(err);
    }
  }

  /**
   * Called by passport on the callback to verify the state parameter.
   *
   * passport-oauth2 dispatches by `.length`:
   *   arity 4: verify(req, state, meta, cb)
   *   arity 3: verify(req, state, cb)
   *
   * passport-openidconnect always calls with 3 args:
   *   verify(req, handle, cb) → restored(err, ctx, state)
   *
   * We declare 3 params (matching both) since passport-oauth2 will dispatch
   * to arity 3 when `.length === 3`.
   *
   * Return semantics (second arg → third arg of cb):
   *   passport-oauth2:          cb(null, ok:truthy|string, appState)
   *   passport-openidconnect:   cb(null, ctx:{maxAge,nonce,issued}, appState)
   *
   * We return the stored ctx (or `true` when ctx was not stored) as the
   * second arg, and the app state as the third arg. This satisfies both:
   *   - passport-oauth2 just needs truthy (or a PKCE verifier string)
   *   - passport-openidconnect needs the OIDC context object
   */
  verify(req: any, providedState: string, cb: Function): void {
    try {
      // Read the browser-bound nonce from the cookie
      const cookieNonce = req.cookies?.[this.cookieName];

      // Clear the nonce cookie regardless of outcome
      if (req.res) {
        req.res.clearCookie(this.cookieName, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: this.secureCookies,
        });
      }

      if (!cookieNonce) {
        return cb(null, false, { message: 'Missing OAuth nonce cookie' });
      }

      const payload = this.decode(providedState, cookieNonce);
      if (!payload) {
        return cb(null, false, { message: 'Invalid state signature' });
      }

      if (payload.exp && Date.now() > payload.exp) {
        return cb(null, false, { message: 'State has expired' });
      }

      // Return ctx (OIDC context or PKCE verifier) as second arg,
      // falling back to `true` for plain OAuth2 flows without ctx.
      // Return the app state (e.g. { redirect_uri }) as third arg.
      const ctx = payload.ctx !== undefined ? payload.ctx : true;
      cb(null, ctx, payload.state);
    } catch (err) {
      cb(err);
    }
  }

  /**
   * Decode and verify a signed state token.
   * Returns null if the token is missing, malformed, or the signature is invalid.
   */
  private decode(token: string, nonce?: string): any | null {
    try {
      if (!token) return null;

      const dotIndex = token.indexOf('.');
      if (dotIndex === -1) return null;

      const payloadStr = token.substring(0, dotIndex);
      const signature = token.substring(dotIndex + 1);

      const expectedSignature = this.sign(payloadStr, nonce);

      if (
        signature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expectedSignature),
        )
      ) {
        return null;
      }

      return JSON.parse(Buffer.from(payloadStr, 'base64url').toString());
    } catch {
      return null;
    }
  }

  private encode(payload: any): string {
    const payloadStr = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const signature = this.sign(payloadStr, payload.nonce);
    return `${payloadStr}.${signature}`;
  }

  private sign(data: string, nonce?: string): string {
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(data);
    if (nonce) {
      hmac.update(nonce);
    }
    return hmac.digest('base64url');
  }
}
