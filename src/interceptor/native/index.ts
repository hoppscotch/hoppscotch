import { AxiosRequestConfig, AxiosResponse } from "axios"
import * as E from "fp-ts/Either";

// This part is just from Hoppscotch common
type NetworkResponse = AxiosResponse<unknown> & {
    config?: {
        timeData?: {
            startTime: number
            endTime: number
        }
    }
    additional?: {
        multiHeaders?: Array<{
            key: string
            value: string
        }>
    }
}

type InterceptorError =
    | "cancellation"
    |
    { error?: unknown }

type RequestRunResult<Err extends InterceptorError = InterceptorError> =
    {
        cancel: () => void
        response: Promise<E.Either<Err, NetworkResponse>>
    }


interface KeyValuePair {
    key: string;
    value: string;
}

interface FormDataValue {
    Text?: string;
    File?: {
        filename: string;
        data: number[];
        mime: string;
    };
}

interface FormDataEntry {
    key: string;
    value: FormDataValue;
}

type BodyDef =
    | { Text: string }
    | { URLEncoded: KeyValuePair[] }
    | { FormData: FormDataEntry[] };

type ClientCertDef =
    | {
        PEMCert: {
            certificate_pem: number[];
            key_pem: number[];
        }
    }
    | {
        PFXCert: {
            certificate_pfx: number[];
            password: string;
        }
    };

interface RequestDef {
    req_id: number;
    method: string;
    endpoint: string;
    parameters: KeyValuePair[];
    headers: KeyValuePair[];
    body: BodyDef | null;
    validate_certs: boolean;
    root_cert_bundle_files: number[][];
    client_cert: ClientCertDef | null;
}

interface RunRequestResponse {
    status: number;
    status_text: string;
    headers: KeyValuePair[];
    data: number[];
    time_start_ms: number;
    time_end_ms: number;
}

export class HoppInterceptorService {
    public static readonly ID = "HOPP_INTERCEPTOR_SERVICE";

    public interceptorID = "io.hoppscotch.interceptor";
    public name = () => "Hopp interceptor Server";
    public selectable = { type: "selectable" as const };
    public supportsCookies = true;

    private baseUrl: string;
    private authKey: string | null = null;
    private reqIDTicker = 0;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
        if (!this.authKey) {
            await this.getAuthKey();
        }
        const headers = new Headers(options.headers);
        headers.set("Authorization", this.authKey!);
        return fetch(`${this.baseUrl}${path}`, { ...options, headers });
    }

    private async getAuthKey(): Promise<void> {
        const regKeyResponse = await fetch(`${this.baseUrl}/request-registration-key`);
        const { registration_key } = await regKeyResponse.json();

        const authKeyResponse = await fetch(`${this.baseUrl}/request-auth-key`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ registration_key }),
        });
        const { auth_key } = await authKeyResponse.json();
        this.authKey = auth_key;
    }

    private convertAxiosToRequestDef(config: AxiosRequestConfig): RequestDef {
        return {
            req_id: this.reqIDTicker++,
            method: config.method?.toUpperCase() ?? "GET",
            endpoint: config.url ?? "",
            parameters: Object.entries(config.params ?? {}).map(([key, value]) => ({ key, value: String(value) })),
            headers: Object.entries(config.headers ?? {}).map(([key, value]) => ({ key, value: String(value) })),
            body: config.data ? { Text: JSON.stringify(config.data) } : null,
            validate_certs: true,
            root_cert_bundle_files: [],
            client_cert: null,
        };
    }

    public runRequest(req: AxiosRequestConfig): RequestRunResult<InterceptorError> {
        const requestDef = this.convertAxiosToRequestDef(req);

        const runPromise = this.fetchWithAuth("/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestDef),
        }).then(async (response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: RunRequestResponse = await response.json();
            return E.right({
                status: data.status,
                statusText: data.status_text,
                headers: Object.fromEntries(data.headers.map(h => [h.key, h.value])),
                data: new Uint8Array(data.data).buffer,
                config: {
                    timeData: {
                        startTime: data.time_start_ms,
                        endTime: data.time_end_ms,
                    },
                },
            });
        }).catch((error) => {
            return E.left({
                humanMessage: {
                    heading: () => "Request Failed",
                    description: () => error.message,
                },
            });
        });

        return {
            cancel: () => {
                this.fetchWithAuth(`/cancel-request/${requestDef.req_id}`, { method: "POST" })
                    .catch(console.error);
            },
            response: runPromise,
        };
    }
}
