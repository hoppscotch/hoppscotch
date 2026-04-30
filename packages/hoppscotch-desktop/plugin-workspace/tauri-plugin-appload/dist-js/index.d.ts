export interface DownloadOptions {
    serverUrl: string;
}
export interface DownloadResponse {
    success: boolean;
    bundleName: string;
    serverUrl: string;
    version: string;
}
export interface WindowOptions {
    title?: string;
    width?: number;
    height?: number;
    resizable?: boolean;
}
export interface LoadOptions {
    bundleName: string;
    /**
     * Optional host override for the webview URL. On web, org context comes from
     * window.location.hostname (acme.hoppscotch.io). On desktop, the webview URL is
     * normally app://{bundleName}/ which always returns the same hostname. Passing a host
     * creates the webview at app://{host}/ instead, so the JS can read
     * window.location.hostname and get org context the same way.
     *
     * When provided, the webview will be loaded with `app://{host}/` instead of
     * `app://{bundleName}/`. This enables cloud-for-orgs support where the same
     * bundle serves multiple organization subdomains.
     *
     * The host will be sanitized (dots become underscores) for URL compatibility.
     * The JavaScript bundle can read `window.location.hostname` to determine
     * the organization context.
     *
     * @example
     * // Load Hoppscotch bundle as acme.hoppscotch.io
     * load({ bundleName: "Hoppscotch", host: "acme.hoppscotch.io" })
     * // Results in: window.location.hostname === "acme_hoppscotch_io"
     */
    host?: string;
    inline?: boolean;
    window?: WindowOptions;
}
export interface LoadResponse {
    success: boolean;
    windowLabel: string;
}
export interface CloseOptions {
    windowLabel: string;
}
export interface CloseResponse {
    success: boolean;
}
export interface RemoveOptions {
    bundleName: string;
    serverUrl: string;
}
export interface RemoveResponse {
    success: boolean;
    bundleName: string;
}
export declare function download(options: DownloadOptions): Promise<DownloadResponse>;
export declare function load(options: LoadOptions): Promise<LoadResponse>;
export declare function close(options: CloseOptions): Promise<CloseResponse>;
export declare function remove(options: RemoveOptions): Promise<RemoveResponse>;
export declare function clear(): Promise<void>;
//# sourceMappingURL=index.d.ts.map