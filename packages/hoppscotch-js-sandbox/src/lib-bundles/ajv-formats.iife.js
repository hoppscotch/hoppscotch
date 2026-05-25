var __ajvFormatsBundle = (function () {
	'use strict';

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var ajvFormatsEntry$1 = {};

	var hasRequiredAjvFormatsEntry;

	function requireAjvFormatsEntry () {
		if (hasRequiredAjvFormatsEntry) return ajvFormatsEntry$1;
		hasRequiredAjvFormatsEntry = 1;
		// IIFE entry: exposes ajv-formats as globalThis.ajvFormats
		// This is a hand-written shim that adds common format validators to an Ajv@6 instance.
		// We avoid bundling the npm ajv-formats package because it drags in URI.js which has
		// a CJS factory pattern that rollup can't cleanly inline for QuickJS.
		//
		// Usage:
		//   const ajv = new Ajv()
		//   ajvFormats(ajv)  // or pm.require('ajv-formats')(ajv)
		//   ajv.validate({ type: 'string', format: 'date' }, '2024-01-15')  // → true

		const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
		const TIME_RE = /^\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
		const DT_RE   = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
		const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		const HOSTNAME_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
		const IPV4_RE = /^(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)){3}$/;
		const URI_RE  = /^[a-z][a-z0-9+.-]*:\/\//i;
		const BYTE_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;

		function addFormats(ajv) {
		  const formats = {
		    date:        function(v) { return DATE_RE.test(v) && !isNaN(Date.parse(v)) },
		    time:        function(v) { return TIME_RE.test(v) },
		    'date-time': function(v) { return DT_RE.test(v) && !isNaN(Date.parse(v)) },
		    uuid:        function(v) { return UUID_RE.test(v) },
		    email:       function(v) { return EMAIL_RE.test(v) },
		    hostname:    function(v) { return HOSTNAME_RE.test(v) },
		    ipv4:        function(v) { return IPV4_RE.test(v) },
		    uri:         function(v) { return URI_RE.test(v) },
		    byte:        function(v) { return BYTE_RE.test(v) },
		    'idn-email': function(v) { return EMAIL_RE.test(v) },
		  };
		  if (ajv && typeof ajv.addFormat === 'function') {
		    const keys = Object.keys(formats);
		    for (var i = 0; i < keys.length; i++) {
		      ajv.addFormat(keys[i], formats[keys[i]]);
		    }
		  }
		  return ajv
		}

		globalThis.ajvFormats = addFormats;
		return ajvFormatsEntry$1;
	}

	var ajvFormatsEntryExports = requireAjvFormatsEntry();
	var ajvFormatsEntry = /*@__PURE__*/getDefaultExportFromCjs(ajvFormatsEntryExports);

	return ajvFormatsEntry;

})();
