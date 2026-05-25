var __formDataBundle = (function () {
	'use strict';

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var formDataEntry$1 = {};

	var hasRequiredFormDataEntry;

	function requireFormDataEntry () {
		if (hasRequiredFormDataEntry) return formDataEntry$1;
		hasRequiredFormDataEntry = 1;
		// IIFE entry: exposes FormData as globalThis.FormDataNode
		// The npm `form-data` package relies on Node.js streams (not available in QuickJS).
		// Instead we expose the native browser FormData which IS available in the sandbox.
		// This gives users full multipart/form-data construction capabilities.
		// pm.require('form-data') → FormData constructor (same as global FormData)
		globalThis.FormDataNode = typeof FormData !== 'undefined' ? FormData : function FormDataPolyfill() {
		  const fields = [];
		  this.append = function(name, value) { fields.push({ name, value }); };
		  this.get = function(name) { const f = fields.find(x => x.name === name); return f ? f.value : null; };
		  this.getAll = function(name) { return fields.filter(x => x.name === name).map(x => x.value); };
		  this.has = function(name) { return fields.some(x => x.name === name); };
		  this.delete = function(name) { const i = fields.findIndex(x => x.name === name); if (i > -1) fields.splice(i, 1); };
		  this.getHeaders = function() { return { 'content-type': 'multipart/form-data; boundary=----FormBoundary' }; };
		  this[Symbol.iterator] = function*() { for (const f of fields) yield [f.name, f.value]; };
		};
		return formDataEntry$1;
	}

	var formDataEntryExports = requireFormDataEntry();
	var formDataEntry = /*@__PURE__*/getDefaultExportFromCjs(formDataEntryExports);

	return formDataEntry;

})();
