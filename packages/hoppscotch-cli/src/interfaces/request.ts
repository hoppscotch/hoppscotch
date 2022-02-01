import { AxiosPromise, AxiosRequestConfig } from "axios";

/**
 * Request stack interface.
 * @property {function} request - AxiosPromise<T = any>.
 * @property {string} path - Request path.
 */
export interface RequestStack {
  request: () => AxiosPromise<any>;
  path: string;
}

/**
 * Request config interface extending interface:AxiosRequestConfig.
 * @property {boolean} supported - Boolean check for supported or unsupported requests.
 */
export interface RequestConfig extends AxiosRequestConfig {
  supported: boolean;
}
