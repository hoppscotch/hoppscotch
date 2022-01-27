import { AxiosPromise, AxiosRequestConfig } from "axios";

export interface requestStack {
  request: () => AxiosPromise<any>;
  path: string;
}

export interface RequestConfig extends AxiosRequestConfig {
  supported: boolean;
}
