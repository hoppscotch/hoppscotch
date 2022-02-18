import { AxiosPromise, AxiosRequestConfig } from "axios";
import { HoppRESTRequest } from "@hoppscotch/data";

/**
 * Request stack interface.
 * @property {function} request - AxiosPromise<T = any>.
 * @property {string} path - Request path.
 */
export interface RequestStack {
  request: () => AxiosPromise<any>;
  path: string;
  name: string;
  testScript: string;
}

/**
 * Request config interface extending interface:AxiosRequestConfig.
 * @property {boolean} supported - Boolean check for supported or unsupported requests.
 */
export interface RequestConfig extends AxiosRequestConfig {
  supported: boolean;
}

export interface EffectiveHoppRESTRequest extends HoppRESTRequest {
  /**
   * The effective final URL.
   *
   * This contains path, params and environment variables all applied to it
   */
  effectiveFinalURL: string;
  effectiveFinalHeaders: { key: string; value: string; active: boolean }[];
  effectiveFinalParams: { key: string; value: string; active: boolean }[];
  effectiveFinalBody: FormData | string | null;
}
