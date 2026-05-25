(function () {
    'use strict';

    var max = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

    var nil = '00000000-0000-0000-0000-000000000000';

    var REGEX = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

    function validate(uuid) {
        return typeof uuid === 'string' && REGEX.test(uuid);
    }

    function parse(uuid) {
        if (!validate(uuid)) {
            throw TypeError('Invalid UUID');
        }
        let v;
        return Uint8Array.of((v = parseInt(uuid.slice(0, 8), 16)) >>> 24, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff, (v = parseInt(uuid.slice(9, 13), 16)) >>> 8, v & 0xff, (v = parseInt(uuid.slice(14, 18), 16)) >>> 8, v & 0xff, (v = parseInt(uuid.slice(19, 23), 16)) >>> 8, v & 0xff, ((v = parseInt(uuid.slice(24, 36), 16)) / 0x10000000000) & 0xff, (v / 0x100000000) & 0xff, (v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
    }

    const byteToHex = [];
    for (let i = 0; i < 256; ++i) {
        byteToHex.push((i + 0x100).toString(16).slice(1));
    }
    function unsafeStringify(arr, offset = 0) {
        return (byteToHex[arr[offset + 0]] +
            byteToHex[arr[offset + 1]] +
            byteToHex[arr[offset + 2]] +
            byteToHex[arr[offset + 3]] +
            '-' +
            byteToHex[arr[offset + 4]] +
            byteToHex[arr[offset + 5]] +
            '-' +
            byteToHex[arr[offset + 6]] +
            byteToHex[arr[offset + 7]] +
            '-' +
            byteToHex[arr[offset + 8]] +
            byteToHex[arr[offset + 9]] +
            '-' +
            byteToHex[arr[offset + 10]] +
            byteToHex[arr[offset + 11]] +
            byteToHex[arr[offset + 12]] +
            byteToHex[arr[offset + 13]] +
            byteToHex[arr[offset + 14]] +
            byteToHex[arr[offset + 15]]).toLowerCase();
    }
    function stringify(arr, offset = 0) {
        const uuid = unsafeStringify(arr, offset);
        if (!validate(uuid)) {
            throw TypeError('Stringified UUID is invalid');
        }
        return uuid;
    }

    let getRandomValues;
    const rnds8 = new Uint8Array(16);
    function rng() {
        if (!getRandomValues) {
            if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
                throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
            }
            getRandomValues = crypto.getRandomValues.bind(crypto);
        }
        return getRandomValues(rnds8);
    }

    const _state$1 = {};
    function v1(options, buf, offset) {
        let bytes;
        const isV6 = options?._v6 ?? false;
        if (options) {
            const optionsKeys = Object.keys(options);
            if (optionsKeys.length === 1 && optionsKeys[0] === '_v6') {
                options = undefined;
            }
        }
        if (options) {
            bytes = v1Bytes(options.random ?? options.rng?.() ?? rng(), options.msecs, options.nsecs, options.clockseq, options.node, buf, offset);
        }
        else {
            const now = Date.now();
            const rnds = rng();
            updateV1State(_state$1, now, rnds);
            bytes = v1Bytes(rnds, _state$1.msecs, _state$1.nsecs, isV6 ? undefined : _state$1.clockseq, isV6 ? undefined : _state$1.node, buf, offset);
        }
        return buf ?? unsafeStringify(bytes);
    }
    function updateV1State(state, now, rnds) {
        state.msecs ??= -Infinity;
        state.nsecs ??= 0;
        if (now === state.msecs) {
            state.nsecs++;
            if (state.nsecs >= 10000) {
                state.node = undefined;
                state.nsecs = 0;
            }
        }
        else if (now > state.msecs) {
            state.nsecs = 0;
        }
        else if (now < state.msecs) {
            state.node = undefined;
        }
        if (!state.node) {
            state.node = rnds.slice(10, 16);
            state.node[0] |= 0x01;
            state.clockseq = ((rnds[8] << 8) | rnds[9]) & 0x3fff;
        }
        state.msecs = now;
        return state;
    }
    function v1Bytes(rnds, msecs, nsecs, clockseq, node, buf, offset = 0) {
        if (rnds.length < 16) {
            throw new Error('Random bytes length must be >= 16');
        }
        if (!buf) {
            buf = new Uint8Array(16);
            offset = 0;
        }
        else {
            if (offset < 0 || offset + 16 > buf.length) {
                throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
            }
        }
        msecs ??= Date.now();
        nsecs ??= 0;
        clockseq ??= ((rnds[8] << 8) | rnds[9]) & 0x3fff;
        node ??= rnds.slice(10, 16);
        msecs += 12219292800000;
        const tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
        buf[offset++] = (tl >>> 24) & 0xff;
        buf[offset++] = (tl >>> 16) & 0xff;
        buf[offset++] = (tl >>> 8) & 0xff;
        buf[offset++] = tl & 0xff;
        const tmh = ((msecs / 0x100000000) * 10000) & 0xfffffff;
        buf[offset++] = (tmh >>> 8) & 0xff;
        buf[offset++] = tmh & 0xff;
        buf[offset++] = ((tmh >>> 24) & 0xf) | 0x10;
        buf[offset++] = (tmh >>> 16) & 0xff;
        buf[offset++] = (clockseq >>> 8) | 0x80;
        buf[offset++] = clockseq & 0xff;
        for (let n = 0; n < 6; ++n) {
            buf[offset++] = node[n];
        }
        return buf;
    }

    function v1ToV6(uuid) {
        const v1Bytes = typeof uuid === 'string' ? parse(uuid) : uuid;
        const v6Bytes = _v1ToV6(v1Bytes);
        return typeof uuid === 'string' ? unsafeStringify(v6Bytes) : v6Bytes;
    }
    function _v1ToV6(v1Bytes) {
        return Uint8Array.of(((v1Bytes[6] & 0x0f) << 4) | ((v1Bytes[7] >> 4) & 0x0f), ((v1Bytes[7] & 0x0f) << 4) | ((v1Bytes[4] & 0xf0) >> 4), ((v1Bytes[4] & 0x0f) << 4) | ((v1Bytes[5] & 0xf0) >> 4), ((v1Bytes[5] & 0x0f) << 4) | ((v1Bytes[0] & 0xf0) >> 4), ((v1Bytes[0] & 0x0f) << 4) | ((v1Bytes[1] & 0xf0) >> 4), ((v1Bytes[1] & 0x0f) << 4) | ((v1Bytes[2] & 0xf0) >> 4), 0x60 | (v1Bytes[2] & 0x0f), v1Bytes[3], v1Bytes[8], v1Bytes[9], v1Bytes[10], v1Bytes[11], v1Bytes[12], v1Bytes[13], v1Bytes[14], v1Bytes[15]);
    }

    function md5(bytes) {
        const words = uint8ToUint32(bytes);
        const md5Bytes = wordsToMd5(words, bytes.length * 8);
        return uint32ToUint8(md5Bytes);
    }
    function uint32ToUint8(input) {
        const bytes = new Uint8Array(input.length * 4);
        for (let i = 0; i < input.length * 4; i++) {
            bytes[i] = (input[i >> 2] >>> ((i % 4) * 8)) & 0xff;
        }
        return bytes;
    }
    function getOutputLength(inputLength8) {
        return (((inputLength8 + 64) >>> 9) << 4) + 14 + 1;
    }
    function wordsToMd5(x, len) {
        const xpad = new Uint32Array(getOutputLength(len)).fill(0);
        xpad.set(x);
        xpad[len >> 5] |= 0x80 << len % 32;
        xpad[xpad.length - 1] = len;
        x = xpad;
        let a = 1732584193;
        let b = -271733879;
        let c = -1732584194;
        let d = 271733878;
        for (let i = 0; i < x.length; i += 16) {
            const olda = a;
            const oldb = b;
            const oldc = c;
            const oldd = d;
            a = md5ff(a, b, c, d, x[i], 7, -680876936);
            d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
            c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
            b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
            a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
            d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
            c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
            b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
            a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
            d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
            c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
            b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
            a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
            d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
            c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
            b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
            a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
            d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
            c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
            b = md5gg(b, c, d, a, x[i], 20, -373897302);
            a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
            d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
            c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
            b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
            a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
            d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
            c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
            b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
            a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
            d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
            c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
            b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
            a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
            d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
            c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
            b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
            a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
            d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
            c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
            b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
            a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
            d = md5hh(d, a, b, c, x[i], 11, -358537222);
            c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
            b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
            a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
            d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
            c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
            b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
            a = md5ii(a, b, c, d, x[i], 6, -198630844);
            d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
            c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
            b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
            a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
            d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
            c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
            b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
            a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
            d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
            c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
            b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
            a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
            d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
            c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
            b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
            a = safeAdd(a, olda);
            b = safeAdd(b, oldb);
            c = safeAdd(c, oldc);
            d = safeAdd(d, oldd);
        }
        return Uint32Array.of(a, b, c, d);
    }
    function uint8ToUint32(input) {
        if (input.length === 0) {
            return new Uint32Array();
        }
        const output = new Uint32Array(getOutputLength(input.length * 8)).fill(0);
        for (let i = 0; i < input.length; i++) {
            output[i >> 2] |= (input[i] & 0xff) << ((i % 4) * 8);
        }
        return output;
    }
    function safeAdd(x, y) {
        const lsw = (x & 0xffff) + (y & 0xffff);
        const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xffff);
    }
    function bitRotateLeft(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    }
    function md5cmn(q, a, b, x, s, t) {
        return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
    }
    function md5ff(a, b, c, d, x, s, t) {
        return md5cmn((b & c) | (~b & d), a, b, x, s, t);
    }
    function md5gg(a, b, c, d, x, s, t) {
        return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
    }
    function md5hh(a, b, c, d, x, s, t) {
        return md5cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function md5ii(a, b, c, d, x, s, t) {
        return md5cmn(c ^ (b | ~d), a, b, x, s, t);
    }

    function stringToBytes(str) {
        str = unescape(encodeURIComponent(str));
        const bytes = new Uint8Array(str.length);
        for (let i = 0; i < str.length; ++i) {
            bytes[i] = str.charCodeAt(i);
        }
        return bytes;
    }
    const DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
    function v35(version, hash, value, namespace, buf, offset) {
        const valueBytes = typeof value === 'string' ? stringToBytes(value) : value;
        const namespaceBytes = typeof namespace === 'string' ? parse(namespace) : namespace;
        if (typeof namespace === 'string') {
            namespace = parse(namespace);
        }
        if (namespace?.length !== 16) {
            throw TypeError('Namespace must be array-like (16 iterable integer values, 0-255)');
        }
        let bytes = new Uint8Array(16 + valueBytes.length);
        bytes.set(namespaceBytes);
        bytes.set(valueBytes, namespaceBytes.length);
        bytes = hash(bytes);
        bytes[6] = (bytes[6] & 0x0f) | version;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        if (buf) {
            offset = offset || 0;
            for (let i = 0; i < 16; ++i) {
                buf[offset + i] = bytes[i];
            }
            return buf;
        }
        return unsafeStringify(bytes);
    }

    function v3(value, namespace, buf, offset) {
        return v35(0x30, md5, value, namespace, buf, offset);
    }
    v3.DNS = DNS;
    v3.URL = URL;

    const randomUUID = typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID.bind(crypto);
    var native = { randomUUID };

    function _v4(options, buf, offset) {
        options = options || {};
        const rnds = options.random ?? options.rng?.() ?? rng();
        if (rnds.length < 16) {
            throw new Error('Random bytes length must be >= 16');
        }
        rnds[6] = (rnds[6] & 0x0f) | 0x40;
        rnds[8] = (rnds[8] & 0x3f) | 0x80;
        if (buf) {
            offset = offset || 0;
            if (offset < 0 || offset + 16 > buf.length) {
                throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
            }
            for (let i = 0; i < 16; ++i) {
                buf[offset + i] = rnds[i];
            }
            return buf;
        }
        return unsafeStringify(rnds);
    }
    function v4(options, buf, offset) {
        if (native.randomUUID && !buf && !options) {
            return native.randomUUID();
        }
        return _v4(options, buf, offset);
    }

    function f(s, x, y, z) {
        switch (s) {
            case 0:
                return (x & y) ^ (~x & z);
            case 1:
                return x ^ y ^ z;
            case 2:
                return (x & y) ^ (x & z) ^ (y & z);
            case 3:
                return x ^ y ^ z;
        }
    }
    function ROTL(x, n) {
        return (x << n) | (x >>> (32 - n));
    }
    function sha1(bytes) {
        const K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
        const H = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
        const newBytes = new Uint8Array(bytes.length + 1);
        newBytes.set(bytes);
        newBytes[bytes.length] = 0x80;
        bytes = newBytes;
        const l = bytes.length / 4 + 2;
        const N = Math.ceil(l / 16);
        const M = new Array(N);
        for (let i = 0; i < N; ++i) {
            const arr = new Uint32Array(16);
            for (let j = 0; j < 16; ++j) {
                arr[j] =
                    (bytes[i * 64 + j * 4] << 24) |
                        (bytes[i * 64 + j * 4 + 1] << 16) |
                        (bytes[i * 64 + j * 4 + 2] << 8) |
                        bytes[i * 64 + j * 4 + 3];
            }
            M[i] = arr;
        }
        M[N - 1][14] = ((bytes.length - 1) * 8) / Math.pow(2, 32);
        M[N - 1][14] = Math.floor(M[N - 1][14]);
        M[N - 1][15] = ((bytes.length - 1) * 8) & 0xffffffff;
        for (let i = 0; i < N; ++i) {
            const W = new Uint32Array(80);
            for (let t = 0; t < 16; ++t) {
                W[t] = M[i][t];
            }
            for (let t = 16; t < 80; ++t) {
                W[t] = ROTL(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
            }
            let a = H[0];
            let b = H[1];
            let c = H[2];
            let d = H[3];
            let e = H[4];
            for (let t = 0; t < 80; ++t) {
                const s = Math.floor(t / 20);
                const T = (ROTL(a, 5) + f(s, b, c, d) + e + K[s] + W[t]) >>> 0;
                e = d;
                d = c;
                c = ROTL(b, 30) >>> 0;
                b = a;
                a = T;
            }
            H[0] = (H[0] + a) >>> 0;
            H[1] = (H[1] + b) >>> 0;
            H[2] = (H[2] + c) >>> 0;
            H[3] = (H[3] + d) >>> 0;
            H[4] = (H[4] + e) >>> 0;
        }
        return Uint8Array.of(H[0] >> 24, H[0] >> 16, H[0] >> 8, H[0], H[1] >> 24, H[1] >> 16, H[1] >> 8, H[1], H[2] >> 24, H[2] >> 16, H[2] >> 8, H[2], H[3] >> 24, H[3] >> 16, H[3] >> 8, H[3], H[4] >> 24, H[4] >> 16, H[4] >> 8, H[4]);
    }

    function v5(value, namespace, buf, offset) {
        return v35(0x50, sha1, value, namespace, buf, offset);
    }
    v5.DNS = DNS;
    v5.URL = URL;

    function v6(options, buf, offset) {
        options ??= {};
        offset ??= 0;
        let bytes = v1({ ...options, _v6: true }, new Uint8Array(16));
        bytes = v1ToV6(bytes);
        if (buf) {
            for (let i = 0; i < 16; i++) {
                buf[offset + i] = bytes[i];
            }
            return buf;
        }
        return unsafeStringify(bytes);
    }

    function v6ToV1(uuid) {
        const v6Bytes = typeof uuid === 'string' ? parse(uuid) : uuid;
        const v1Bytes = _v6ToV1(v6Bytes);
        return typeof uuid === 'string' ? unsafeStringify(v1Bytes) : v1Bytes;
    }
    function _v6ToV1(v6Bytes) {
        return Uint8Array.of(((v6Bytes[3] & 0x0f) << 4) | ((v6Bytes[4] >> 4) & 0x0f), ((v6Bytes[4] & 0x0f) << 4) | ((v6Bytes[5] & 0xf0) >> 4), ((v6Bytes[5] & 0x0f) << 4) | (v6Bytes[6] & 0x0f), v6Bytes[7], ((v6Bytes[1] & 0x0f) << 4) | ((v6Bytes[2] & 0xf0) >> 4), ((v6Bytes[2] & 0x0f) << 4) | ((v6Bytes[3] & 0xf0) >> 4), 0x10 | ((v6Bytes[0] & 0xf0) >> 4), ((v6Bytes[0] & 0x0f) << 4) | ((v6Bytes[1] & 0xf0) >> 4), v6Bytes[8], v6Bytes[9], v6Bytes[10], v6Bytes[11], v6Bytes[12], v6Bytes[13], v6Bytes[14], v6Bytes[15]);
    }

    const _state = {};
    function v7(options, buf, offset) {
        let bytes;
        if (options) {
            bytes = v7Bytes(options.random ?? options.rng?.() ?? rng(), options.msecs, options.seq, buf, offset);
        }
        else {
            const now = Date.now();
            const rnds = rng();
            updateV7State(_state, now, rnds);
            bytes = v7Bytes(rnds, _state.msecs, _state.seq, buf, offset);
        }
        return buf ?? unsafeStringify(bytes);
    }
    function updateV7State(state, now, rnds) {
        state.msecs ??= -Infinity;
        state.seq ??= 0;
        if (now > state.msecs) {
            state.seq = (rnds[6] << 23) | (rnds[7] << 16) | (rnds[8] << 8) | rnds[9];
            state.msecs = now;
        }
        else {
            state.seq = (state.seq + 1) | 0;
            if (state.seq === 0) {
                state.msecs++;
            }
        }
        return state;
    }
    function v7Bytes(rnds, msecs, seq, buf, offset = 0) {
        if (rnds.length < 16) {
            throw new Error('Random bytes length must be >= 16');
        }
        if (!buf) {
            buf = new Uint8Array(16);
            offset = 0;
        }
        else {
            if (offset < 0 || offset + 16 > buf.length) {
                throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
            }
        }
        msecs ??= Date.now();
        seq ??= ((rnds[6] * 0x7f) << 24) | (rnds[7] << 16) | (rnds[8] << 8) | rnds[9];
        buf[offset++] = (msecs / 0x10000000000) & 0xff;
        buf[offset++] = (msecs / 0x100000000) & 0xff;
        buf[offset++] = (msecs / 0x1000000) & 0xff;
        buf[offset++] = (msecs / 0x10000) & 0xff;
        buf[offset++] = (msecs / 0x100) & 0xff;
        buf[offset++] = msecs & 0xff;
        buf[offset++] = 0x70 | ((seq >>> 28) & 0x0f);
        buf[offset++] = (seq >>> 20) & 0xff;
        buf[offset++] = 0x80 | ((seq >>> 14) & 0x3f);
        buf[offset++] = (seq >>> 6) & 0xff;
        buf[offset++] = ((seq << 2) & 0xff) | (rnds[10] & 0x03);
        buf[offset++] = rnds[11];
        buf[offset++] = rnds[12];
        buf[offset++] = rnds[13];
        buf[offset++] = rnds[14];
        buf[offset++] = rnds[15];
        return buf;
    }

    function version(uuid) {
        if (!validate(uuid)) {
            throw TypeError('Invalid UUID');
        }
        return parseInt(uuid.slice(14, 15), 16);
    }

    var uuid = /*#__PURE__*/Object.freeze({
        __proto__: null,
        MAX: max,
        NIL: nil,
        parse: parse,
        stringify: stringify,
        v1: v1,
        v1ToV6: v1ToV6,
        v3: v3,
        v4: v4,
        v5: v5,
        v6: v6,
        v6ToV1: v6ToV1,
        v7: v7,
        validate: validate,
        version: version
    });

    // IIFE entry: exposes uuid as globalThis.uuid
    globalThis.uuid = uuid;

})();
