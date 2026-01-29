import { invoke } from '@tauri-apps/api/core';

async function download(options) {
    return await invoke('plugin:appload|download', { options });
}
async function load(options) {
    return await invoke('plugin:appload|load', { options });
}
async function close(options) {
    return await invoke('plugin:appload|close', { options });
}
async function remove(options) {
    return await invoke('plugin:appload|remove', { options });
}
async function clear() {
    return await invoke('plugin:appload|clear');
}

export { clear, close, download, load, remove };
