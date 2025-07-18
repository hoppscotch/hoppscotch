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