'use strict';

var core = require('@tauri-apps/api/core');

async function download(options) {
    return await core.invoke('plugin:appload|download', { options });
}
async function load(options) {
    return await core.invoke('plugin:appload|load', { options });
}
async function close(options) {
    return await core.invoke('plugin:appload|close', { options });
}
async function remove(options) {
    return await core.invoke('plugin:appload|remove', { options });
}
async function clear() {
    return await core.invoke('plugin:appload|clear');
}

exports.clear = clear;
exports.close = close;
exports.download = download;
exports.load = load;
exports.remove = remove;
