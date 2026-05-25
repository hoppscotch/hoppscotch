(function () {
    'use strict';

    /** Types of elements found in htmlparser2's DOM */
    var ElementType;
    (function (ElementType) {
        /** Type for the root element of a document */
        ElementType["Root"] = "root";
        /** Type for Text */
        ElementType["Text"] = "text";
        /** Type for <? ... ?> */
        ElementType["Directive"] = "directive";
        /** Type for <!-- ... --> */
        ElementType["Comment"] = "comment";
        /** Type for <script> tags */
        ElementType["Script"] = "script";
        /** Type for <style> tags */
        ElementType["Style"] = "style";
        /** Type for Any tag */
        ElementType["Tag"] = "tag";
        /** Type for <![CDATA[ ... ]]> */
        ElementType["CDATA"] = "cdata";
        /** Type for <!doctype ...> */
        ElementType["Doctype"] = "doctype";
    })(ElementType || (ElementType = {}));
    /**
     * Tests whether an element is a tag or not.
     *
     * @param elem Element to test
     */
    function isTag$1(elem) {
        return (elem.type === ElementType.Tag ||
            elem.type === ElementType.Script ||
            elem.type === ElementType.Style);
    }
    // Exports for backwards compatibility
    /** Type for the root element of a document */
    const Root = ElementType.Root;
    /** Type for Text */
    const Text$1 = ElementType.Text;
    /** Type for <? ... ?> */
    const Directive = ElementType.Directive;
    /** Type for <!-- ... --> */
    const Comment$1 = ElementType.Comment;
    /** Type for <script> tags */
    const Script = ElementType.Script;
    /** Type for <style> tags */
    const Style = ElementType.Style;
    /** Type for Any tag */
    const Tag = ElementType.Tag;
    /** Type for <![CDATA[ ... ]]> */
    const CDATA$1 = ElementType.CDATA;
    /** Type for <!doctype ...> */
    const Doctype = ElementType.Doctype;

    /**
     * This object will be used as the prototype for Nodes when creating a
     * DOM-Level-1-compliant structure.
     */
    class Node {
        constructor() {
            /** Parent of the node */
            this.parent = null;
            /** Previous sibling */
            this.prev = null;
            /** Next sibling */
            this.next = null;
            /** The start index of the node. Requires `withStartIndices` on the handler to be `true. */
            this.startIndex = null;
            /** The end index of the node. Requires `withEndIndices` on the handler to be `true. */
            this.endIndex = null;
        }
        // Read-write aliases for properties
        /**
         * Same as {@link parent}.
         * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
         */
        get parentNode() {
            return this.parent;
        }
        set parentNode(parent) {
            this.parent = parent;
        }
        /**
         * Same as {@link prev}.
         * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
         */
        get previousSibling() {
            return this.prev;
        }
        set previousSibling(prev) {
            this.prev = prev;
        }
        /**
         * Same as {@link next}.
         * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
         */
        get nextSibling() {
            return this.next;
        }
        set nextSibling(next) {
            this.next = next;
        }
        /**
         * Clone this node, and optionally its children.
         *
         * @param recursive Clone child nodes as well.
         * @returns A clone of the node.
         */
        cloneNode(recursive = false) {
            return cloneNode(this, recursive);
        }
    }
    /**
     * A node that contains some data.
     */
    class DataNode extends Node {
        /**
         * @param data The content of the data node
         */
        constructor(data) {
            super();
            this.data = data;
        }
        /**
         * Same as {@link data}.
         * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
         */
        get nodeValue() {
            return this.data;
        }
        set nodeValue(data) {
            this.data = data;
        }
    }
    /**
     * Text within the document.
     */
    class Text extends DataNode {
        constructor() {
            super(...arguments);
            this.type = ElementType.Text;
        }
        get nodeType() {
            return 3;
        }
    }
    /**
     * Comments within the document.
     */
    class Comment extends DataNode {
        constructor() {
            super(...arguments);
            this.type = ElementType.Comment;
        }
        get nodeType() {
            return 8;
        }
    }
    /**
     * Processing instructions, including doc types.
     */
    class ProcessingInstruction extends DataNode {
        constructor(name, data) {
            super(data);
            this.name = name;
            this.type = ElementType.Directive;
        }
        get nodeType() {
            return 1;
        }
    }
    /**
     * A `Node` that can have children.
     */
    class NodeWithChildren extends Node {
        /**
         * @param children Children of the node. Only certain node types can have children.
         */
        constructor(children) {
            super();
            this.children = children;
        }
        // Aliases
        /** First child of the node. */
        get firstChild() {
            var _a;
            return (_a = this.children[0]) !== null && _a !== void 0 ? _a : null;
        }
        /** Last child of the node. */
        get lastChild() {
            return this.children.length > 0
                ? this.children[this.children.length - 1]
                : null;
        }
        /**
         * Same as {@link children}.
         * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
         */
        get childNodes() {
            return this.children;
        }
        set childNodes(children) {
            this.children = children;
        }
    }
    class CDATA extends NodeWithChildren {
        constructor() {
            super(...arguments);
            this.type = ElementType.CDATA;
        }
        get nodeType() {
            return 4;
        }
    }
    /**
     * The root node of the document.
     */
    class Document extends NodeWithChildren {
        constructor() {
            super(...arguments);
            this.type = ElementType.Root;
        }
        get nodeType() {
            return 9;
        }
    }
    /**
     * An element within the DOM.
     */
    class Element extends NodeWithChildren {
        /**
         * @param name Name of the tag, eg. `div`, `span`.
         * @param attribs Object mapping attribute names to attribute values.
         * @param children Children of the node.
         */
        constructor(name, attribs, children = [], type = name === "script"
            ? ElementType.Script
            : name === "style"
                ? ElementType.Style
                : ElementType.Tag) {
            super(children);
            this.name = name;
            this.attribs = attribs;
            this.type = type;
        }
        get nodeType() {
            return 1;
        }
        // DOM Level 1 aliases
        /**
         * Same as {@link name}.
         * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
         */
        get tagName() {
            return this.name;
        }
        set tagName(name) {
            this.name = name;
        }
        get attributes() {
            return Object.keys(this.attribs).map((name) => {
                var _a, _b;
                return ({
                    name,
                    value: this.attribs[name],
                    namespace: (_a = this["x-attribsNamespace"]) === null || _a === void 0 ? void 0 : _a[name],
                    prefix: (_b = this["x-attribsPrefix"]) === null || _b === void 0 ? void 0 : _b[name],
                });
            });
        }
    }
    /**
     * @param node Node to check.
     * @returns `true` if the node is a `Element`, `false` otherwise.
     */
    function isTag(node) {
        return isTag$1(node);
    }
    /**
     * @param node Node to check.
     * @returns `true` if the node has the type `CDATA`, `false` otherwise.
     */
    function isCDATA(node) {
        return node.type === ElementType.CDATA;
    }
    /**
     * @param node Node to check.
     * @returns `true` if the node has the type `Text`, `false` otherwise.
     */
    function isText(node) {
        return node.type === ElementType.Text;
    }
    /**
     * @param node Node to check.
     * @returns `true` if the node has the type `Comment`, `false` otherwise.
     */
    function isComment(node) {
        return node.type === ElementType.Comment;
    }
    /**
     * @param node Node to check.
     * @returns `true` if the node has the type `ProcessingInstruction`, `false` otherwise.
     */
    function isDirective(node) {
        return node.type === ElementType.Directive;
    }
    /**
     * @param node Node to check.
     * @returns `true` if the node has the type `ProcessingInstruction`, `false` otherwise.
     */
    function isDocument(node) {
        return node.type === ElementType.Root;
    }
    /**
     * @param node Node to check.
     * @returns `true` if the node has children, `false` otherwise.
     */
    function hasChildren(node) {
        return Object.prototype.hasOwnProperty.call(node, "children");
    }
    /**
     * Clone a node, and optionally its children.
     *
     * @param recursive Clone child nodes as well.
     * @returns A clone of the node.
     */
    function cloneNode(node, recursive = false) {
        let result;
        if (isText(node)) {
            result = new Text(node.data);
        }
        else if (isComment(node)) {
            result = new Comment(node.data);
        }
        else if (isTag(node)) {
            const children = recursive ? cloneChildren(node.children) : [];
            const clone = new Element(node.name, { ...node.attribs }, children);
            children.forEach((child) => (child.parent = clone));
            if (node.namespace != null) {
                clone.namespace = node.namespace;
            }
            if (node["x-attribsNamespace"]) {
                clone["x-attribsNamespace"] = { ...node["x-attribsNamespace"] };
            }
            if (node["x-attribsPrefix"]) {
                clone["x-attribsPrefix"] = { ...node["x-attribsPrefix"] };
            }
            result = clone;
        }
        else if (isCDATA(node)) {
            const children = recursive ? cloneChildren(node.children) : [];
            const clone = new CDATA(children);
            children.forEach((child) => (child.parent = clone));
            result = clone;
        }
        else if (isDocument(node)) {
            const children = recursive ? cloneChildren(node.children) : [];
            const clone = new Document(children);
            children.forEach((child) => (child.parent = clone));
            if (node["x-mode"]) {
                clone["x-mode"] = node["x-mode"];
            }
            result = clone;
        }
        else if (isDirective(node)) {
            const instruction = new ProcessingInstruction(node.name, node.data);
            if (node["x-name"] != null) {
                instruction["x-name"] = node["x-name"];
                instruction["x-publicId"] = node["x-publicId"];
                instruction["x-systemId"] = node["x-systemId"];
            }
            result = instruction;
        }
        else {
            throw new Error(`Not implemented yet: ${node.type}`);
        }
        result.startIndex = node.startIndex;
        result.endIndex = node.endIndex;
        if (node.sourceCodeLocation != null) {
            result.sourceCodeLocation = node.sourceCodeLocation;
        }
        return result;
    }
    function cloneChildren(childs) {
        const children = childs.map((child) => cloneNode(child, true));
        for (let i = 1; i < children.length; i++) {
            children[i].prev = children[i - 1];
            children[i - 1].next = children[i];
        }
        return children;
    }

    // Default options
    const defaultOpts$2 = {
        withStartIndices: false,
        withEndIndices: false,
        xmlMode: false,
    };
    class DomHandler {
        /**
         * @param callback Called once parsing has completed.
         * @param options Settings for the handler.
         * @param elementCB Callback whenever a tag is closed.
         */
        constructor(callback, options, elementCB) {
            /** The elements of the DOM */
            this.dom = [];
            /** The root element for the DOM */
            this.root = new Document(this.dom);
            /** Indicated whether parsing has been completed. */
            this.done = false;
            /** Stack of open tags. */
            this.tagStack = [this.root];
            /** A data node that is still being written to. */
            this.lastNode = null;
            /** Reference to the parser instance. Used for location information. */
            this.parser = null;
            // Make it possible to skip arguments, for backwards-compatibility
            if (typeof options === "function") {
                elementCB = options;
                options = defaultOpts$2;
            }
            if (typeof callback === "object") {
                options = callback;
                callback = undefined;
            }
            this.callback = callback !== null && callback !== void 0 ? callback : null;
            this.options = options !== null && options !== void 0 ? options : defaultOpts$2;
            this.elementCB = elementCB !== null && elementCB !== void 0 ? elementCB : null;
        }
        onparserinit(parser) {
            this.parser = parser;
        }
        // Resets the handler back to starting state
        onreset() {
            this.dom = [];
            this.root = new Document(this.dom);
            this.done = false;
            this.tagStack = [this.root];
            this.lastNode = null;
            this.parser = null;
        }
        // Signals the handler that parsing is done
        onend() {
            if (this.done)
                return;
            this.done = true;
            this.parser = null;
            this.handleCallback(null);
        }
        onerror(error) {
            this.handleCallback(error);
        }
        onclosetag() {
            this.lastNode = null;
            const elem = this.tagStack.pop();
            if (this.options.withEndIndices) {
                elem.endIndex = this.parser.endIndex;
            }
            if (this.elementCB)
                this.elementCB(elem);
        }
        onopentag(name, attribs) {
            const type = this.options.xmlMode ? ElementType.Tag : undefined;
            const element = new Element(name, attribs, undefined, type);
            this.addNode(element);
            this.tagStack.push(element);
        }
        ontext(data) {
            const { lastNode } = this;
            if (lastNode && lastNode.type === ElementType.Text) {
                lastNode.data += data;
                if (this.options.withEndIndices) {
                    lastNode.endIndex = this.parser.endIndex;
                }
            }
            else {
                const node = new Text(data);
                this.addNode(node);
                this.lastNode = node;
            }
        }
        oncomment(data) {
            if (this.lastNode && this.lastNode.type === ElementType.Comment) {
                this.lastNode.data += data;
                return;
            }
            const node = new Comment(data);
            this.addNode(node);
            this.lastNode = node;
        }
        oncommentend() {
            this.lastNode = null;
        }
        oncdatastart() {
            const text = new Text("");
            const node = new CDATA([text]);
            this.addNode(node);
            text.parent = node;
            this.lastNode = text;
        }
        oncdataend() {
            this.lastNode = null;
        }
        onprocessinginstruction(name, data) {
            const node = new ProcessingInstruction(name, data);
            this.addNode(node);
        }
        handleCallback(error) {
            if (typeof this.callback === "function") {
                this.callback(error, this.dom);
            }
            else if (error) {
                throw error;
            }
        }
        addNode(node) {
            const parent = this.tagStack[this.tagStack.length - 1];
            const previousSibling = parent.children[parent.children.length - 1];
            if (this.options.withStartIndices) {
                node.startIndex = this.parser.startIndex;
            }
            if (this.options.withEndIndices) {
                node.endIndex = this.parser.endIndex;
            }
            parent.children.push(node);
            if (previousSibling) {
                node.prev = previousSibling;
                previousSibling.next = node;
            }
            node.parent = parent;
            this.lastNode = null;
        }
    }

    const xmlReplacer = /["&'<>$\x80-\uFFFF]/g;
    const xmlCodeMap = new Map([
        [34, "&quot;"],
        [38, "&amp;"],
        [39, "&apos;"],
        [60, "&lt;"],
        [62, "&gt;"],
    ]);
    // For compatibility with node < 4, we wrap `codePointAt`
    const getCodePoint = 
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    String.prototype.codePointAt != null
        ? (str, index) => str.codePointAt(index)
        : // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
            (c, index) => (c.charCodeAt(index) & 0xfc00) === 0xd800
                ? (c.charCodeAt(index) - 0xd800) * 0x400 +
                    c.charCodeAt(index + 1) -
                    0xdc00 +
                    0x10000
                : c.charCodeAt(index);
    /**
     * Encodes all non-ASCII characters, as well as characters not valid in XML
     * documents using XML entities.
     *
     * If a character has no equivalent entity, a
     * numeric hexadecimal reference (eg. `&#xfc;`) will be used.
     */
    function encodeXML(str) {
        let ret = "";
        let lastIdx = 0;
        let match;
        while ((match = xmlReplacer.exec(str)) !== null) {
            const i = match.index;
            const char = str.charCodeAt(i);
            const next = xmlCodeMap.get(char);
            if (next !== undefined) {
                ret += str.substring(lastIdx, i) + next;
                lastIdx = i + 1;
            }
            else {
                ret += `${str.substring(lastIdx, i)}&#x${getCodePoint(str, i).toString(16)};`;
                // Increase by 1 if we have a surrogate pair
                lastIdx = xmlReplacer.lastIndex += Number((char & 0xfc00) === 0xd800);
            }
        }
        return ret + str.substr(lastIdx);
    }
    /**
     * Creates a function that escapes all characters matched by the given regular
     * expression using the given map of characters to escape to their entities.
     *
     * @param regex Regular expression to match characters to escape.
     * @param map Map of characters to escape to their entities.
     *
     * @returns Function that escapes all characters matched by the given regular
     * expression using the given map of characters to escape to their entities.
     */
    function getEscaper$1(regex, map) {
        return function escape(data) {
            let match;
            let lastIdx = 0;
            let result = "";
            while ((match = regex.exec(data))) {
                if (lastIdx !== match.index) {
                    result += data.substring(lastIdx, match.index);
                }
                // We know that this character will be in the map.
                result += map.get(match[0].charCodeAt(0));
                // Every match will be of length 1
                lastIdx = match.index + 1;
            }
            return result + data.substring(lastIdx);
        };
    }
    /**
     * Encodes all characters that have to be escaped in HTML attributes,
     * following {@link https://html.spec.whatwg.org/multipage/parsing.html#escapingString}.
     *
     * @param data String to escape.
     */
    const escapeAttribute$1 = getEscaper$1(/["&\u00A0]/g, new Map([
        [34, "&quot;"],
        [38, "&amp;"],
        [160, "&nbsp;"],
    ]));
    /**
     * Encodes all characters that have to be escaped in HTML text,
     * following {@link https://html.spec.whatwg.org/multipage/parsing.html#escapingString}.
     *
     * @param data String to escape.
     */
    const escapeText$1 = getEscaper$1(/[&<>\u00A0]/g, new Map([
        [38, "&amp;"],
        [60, "&lt;"],
        [62, "&gt;"],
        [160, "&nbsp;"],
    ]));

    const elementNames = new Map([
        "altGlyph",
        "altGlyphDef",
        "altGlyphItem",
        "animateColor",
        "animateMotion",
        "animateTransform",
        "clipPath",
        "feBlend",
        "feColorMatrix",
        "feComponentTransfer",
        "feComposite",
        "feConvolveMatrix",
        "feDiffuseLighting",
        "feDisplacementMap",
        "feDistantLight",
        "feDropShadow",
        "feFlood",
        "feFuncA",
        "feFuncB",
        "feFuncG",
        "feFuncR",
        "feGaussianBlur",
        "feImage",
        "feMerge",
        "feMergeNode",
        "feMorphology",
        "feOffset",
        "fePointLight",
        "feSpecularLighting",
        "feSpotLight",
        "feTile",
        "feTurbulence",
        "foreignObject",
        "glyphRef",
        "linearGradient",
        "radialGradient",
        "textPath",
    ].map((val) => [val.toLowerCase(), val]));
    const attributeNames = new Map([
        "definitionURL",
        "attributeName",
        "attributeType",
        "baseFrequency",
        "baseProfile",
        "calcMode",
        "clipPathUnits",
        "diffuseConstant",
        "edgeMode",
        "filterUnits",
        "glyphRef",
        "gradientTransform",
        "gradientUnits",
        "kernelMatrix",
        "kernelUnitLength",
        "keyPoints",
        "keySplines",
        "keyTimes",
        "lengthAdjust",
        "limitingConeAngle",
        "markerHeight",
        "markerUnits",
        "markerWidth",
        "maskContentUnits",
        "maskUnits",
        "numOctaves",
        "pathLength",
        "patternContentUnits",
        "patternTransform",
        "patternUnits",
        "pointsAtX",
        "pointsAtY",
        "pointsAtZ",
        "preserveAlpha",
        "preserveAspectRatio",
        "primitiveUnits",
        "refX",
        "refY",
        "repeatCount",
        "repeatDur",
        "requiredExtensions",
        "requiredFeatures",
        "specularConstant",
        "specularExponent",
        "spreadMethod",
        "startOffset",
        "stdDeviation",
        "stitchTiles",
        "surfaceScale",
        "systemLanguage",
        "tableValues",
        "targetX",
        "targetY",
        "textLength",
        "viewBox",
        "viewTarget",
        "xChannelSelector",
        "yChannelSelector",
        "zoomAndPan",
    ].map((val) => [val.toLowerCase(), val]));

    /*
     * Module dependencies
     */
    const unencodedElements = new Set([
        "style",
        "script",
        "xmp",
        "iframe",
        "noembed",
        "noframes",
        "plaintext",
        "noscript",
    ]);
    function replaceQuotes(value) {
        return value.replace(/"/g, "&quot;");
    }
    /**
     * Format attributes
     */
    function formatAttributes(attributes, opts) {
        var _a;
        if (!attributes)
            return;
        const encode = ((_a = opts.encodeEntities) !== null && _a !== void 0 ? _a : opts.decodeEntities) === false
            ? replaceQuotes
            : opts.xmlMode || opts.encodeEntities !== "utf8"
                ? encodeXML
                : escapeAttribute$1;
        return Object.keys(attributes)
            .map((key) => {
            var _a, _b;
            const value = (_a = attributes[key]) !== null && _a !== void 0 ? _a : "";
            if (opts.xmlMode === "foreign") {
                /* Fix up mixed-case attribute names */
                key = (_b = attributeNames.get(key)) !== null && _b !== void 0 ? _b : key;
            }
            if (!opts.emptyAttrs && !opts.xmlMode && value === "") {
                return key;
            }
            return `${key}="${encode(value)}"`;
        })
            .join(" ");
    }
    /**
     * Self-enclosing tags
     */
    const singleTag = new Set([
        "area",
        "base",
        "basefont",
        "br",
        "col",
        "command",
        "embed",
        "frame",
        "hr",
        "img",
        "input",
        "isindex",
        "keygen",
        "link",
        "meta",
        "param",
        "source",
        "track",
        "wbr",
    ]);
    /**
     * Renders a DOM node or an array of DOM nodes to a string.
     *
     * Can be thought of as the equivalent of the `outerHTML` of the passed node(s).
     *
     * @param node Node to be rendered.
     * @param options Changes serialization behavior
     */
    function render$1(node, options = {}) {
        const nodes = "length" in node ? node : [node];
        let output = "";
        for (let i = 0; i < nodes.length; i++) {
            output += renderNode(nodes[i], options);
        }
        return output;
    }
    function renderNode(node, options) {
        switch (node.type) {
            case Root:
                return render$1(node.children, options);
            // @ts-expect-error We don't use `Doctype` yet
            case Doctype:
            case Directive:
                return renderDirective(node);
            case Comment$1:
                return renderComment(node);
            case CDATA$1:
                return renderCdata(node);
            case Script:
            case Style:
            case Tag:
                return renderTag(node, options);
            case Text$1:
                return renderText(node, options);
        }
    }
    const foreignModeIntegrationPoints = new Set([
        "mi",
        "mo",
        "mn",
        "ms",
        "mtext",
        "annotation-xml",
        "foreignObject",
        "desc",
        "title",
    ]);
    const foreignElements = new Set(["svg", "math"]);
    function renderTag(elem, opts) {
        var _a;
        // Handle SVG / MathML in HTML
        if (opts.xmlMode === "foreign") {
            /* Fix up mixed-case element names */
            elem.name = (_a = elementNames.get(elem.name)) !== null && _a !== void 0 ? _a : elem.name;
            /* Exit foreign mode at integration points */
            if (elem.parent &&
                foreignModeIntegrationPoints.has(elem.parent.name)) {
                opts = { ...opts, xmlMode: false };
            }
        }
        if (!opts.xmlMode && foreignElements.has(elem.name)) {
            opts = { ...opts, xmlMode: "foreign" };
        }
        let tag = `<${elem.name}`;
        const attribs = formatAttributes(elem.attribs, opts);
        if (attribs) {
            tag += ` ${attribs}`;
        }
        if (elem.children.length === 0 &&
            (opts.xmlMode
                ? // In XML mode or foreign mode, and user hasn't explicitly turned off self-closing tags
                    opts.selfClosingTags !== false
                : // User explicitly asked for self-closing tags, even in HTML mode
                    opts.selfClosingTags && singleTag.has(elem.name))) {
            if (!opts.xmlMode)
                tag += " ";
            tag += "/>";
        }
        else {
            tag += ">";
            if (elem.children.length > 0) {
                tag += render$1(elem.children, opts);
            }
            if (opts.xmlMode || !singleTag.has(elem.name)) {
                tag += `</${elem.name}>`;
            }
        }
        return tag;
    }
    function renderDirective(elem) {
        return `<${elem.data}>`;
    }
    function renderText(elem, opts) {
        var _a;
        let data = elem.data || "";
        // If entities weren't decoded, no need to encode them back
        if (((_a = opts.encodeEntities) !== null && _a !== void 0 ? _a : opts.decodeEntities) !== false &&
            !(!opts.xmlMode &&
                elem.parent &&
                unencodedElements.has(elem.parent.name))) {
            data =
                opts.xmlMode || opts.encodeEntities !== "utf8"
                    ? encodeXML(data)
                    : escapeText$1(data);
        }
        return data;
    }
    function renderCdata(elem) {
        return `<![CDATA[${elem.children[0].data}]]>`;
    }
    function renderComment(elem) {
        return `<!--${elem.data}-->`;
    }

    /**
     * @category Stringify
     * @deprecated Use the `dom-serializer` module directly.
     * @param node Node to get the outer HTML of.
     * @param options Options for serialization.
     * @returns `node`'s outer HTML.
     */
    function getOuterHTML(node, options) {
        return render$1(node, options);
    }
    /**
     * @category Stringify
     * @deprecated Use the `dom-serializer` module directly.
     * @param node Node to get the inner HTML of.
     * @param options Options for serialization.
     * @returns `node`'s inner HTML.
     */
    function getInnerHTML(node, options) {
        return hasChildren(node)
            ? node.children.map((node) => getOuterHTML(node, options)).join("")
            : "";
    }
    /**
     * Get a node's inner text. Same as `textContent`, but inserts newlines for `<br>` tags. Ignores comments.
     *
     * @category Stringify
     * @deprecated Use `textContent` instead.
     * @param node Node to get the inner text of.
     * @returns `node`'s inner text.
     */
    function getText(node) {
        if (Array.isArray(node))
            return node.map(getText).join("");
        if (isTag(node))
            return node.name === "br" ? "\n" : getText(node.children);
        if (isCDATA(node))
            return getText(node.children);
        if (isText(node))
            return node.data;
        return "";
    }
    /**
     * Get a node's text content. Ignores comments.
     *
     * @category Stringify
     * @param node Node to get the text content of.
     * @returns `node`'s text content.
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent}
     */
    function textContent(node) {
        if (Array.isArray(node))
            return node.map(textContent).join("");
        if (hasChildren(node) && !isComment(node)) {
            return textContent(node.children);
        }
        if (isText(node))
            return node.data;
        return "";
    }
    /**
     * Get a node's inner text, ignoring `<script>` and `<style>` tags. Ignores comments.
     *
     * @category Stringify
     * @param node Node to get the inner text of.
     * @returns `node`'s inner text.
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Node/innerText}
     */
    function innerText(node) {
        if (Array.isArray(node))
            return node.map(innerText).join("");
        if (hasChildren(node) && (node.type === ElementType.Tag || isCDATA(node))) {
            return innerText(node.children);
        }
        if (isText(node))
            return node.data;
        return "";
    }

    /**
     * Get a node's children.
     *
     * @category Traversal
     * @param elem Node to get the children of.
     * @returns `elem`'s children, or an empty array.
     */
    function getChildren(elem) {
        return hasChildren(elem) ? elem.children : [];
    }
    /**
     * Get a node's parent.
     *
     * @category Traversal
     * @param elem Node to get the parent of.
     * @returns `elem`'s parent node, or `null` if `elem` is a root node.
     */
    function getParent(elem) {
        return elem.parent || null;
    }
    /**
     * Gets an elements siblings, including the element itself.
     *
     * Attempts to get the children through the element's parent first. If we don't
     * have a parent (the element is a root node), we walk the element's `prev` &
     * `next` to get all remaining nodes.
     *
     * @category Traversal
     * @param elem Element to get the siblings of.
     * @returns `elem`'s siblings, including `elem`.
     */
    function getSiblings(elem) {
        const parent = getParent(elem);
        if (parent != null)
            return getChildren(parent);
        const siblings = [elem];
        let { prev, next } = elem;
        while (prev != null) {
            siblings.unshift(prev);
            ({ prev } = prev);
        }
        while (next != null) {
            siblings.push(next);
            ({ next } = next);
        }
        return siblings;
    }
    /**
     * Gets an attribute from an element.
     *
     * @category Traversal
     * @param elem Element to check.
     * @param name Attribute name to retrieve.
     * @returns The element's attribute value, or `undefined`.
     */
    function getAttributeValue(elem, name) {
        var _a;
        return (_a = elem.attribs) === null || _a === void 0 ? void 0 : _a[name];
    }
    /**
     * Checks whether an element has an attribute.
     *
     * @category Traversal
     * @param elem Element to check.
     * @param name Attribute name to look for.
     * @returns Returns whether `elem` has the attribute `name`.
     */
    function hasAttrib(elem, name) {
        return (elem.attribs != null &&
            Object.prototype.hasOwnProperty.call(elem.attribs, name) &&
            elem.attribs[name] != null);
    }
    /**
     * Get the tag name of an element.
     *
     * @category Traversal
     * @param elem The element to get the name for.
     * @returns The tag name of `elem`.
     */
    function getName(elem) {
        return elem.name;
    }
    /**
     * Returns the next element sibling of a node.
     *
     * @category Traversal
     * @param elem The element to get the next sibling of.
     * @returns `elem`'s next sibling that is a tag, or `null` if there is no next
     * sibling.
     */
    function nextElementSibling(elem) {
        let { next } = elem;
        while (next !== null && !isTag(next))
            ({ next } = next);
        return next;
    }
    /**
     * Returns the previous element sibling of a node.
     *
     * @category Traversal
     * @param elem The element to get the previous sibling of.
     * @returns `elem`'s previous sibling that is a tag, or `null` if there is no
     * previous sibling.
     */
    function prevElementSibling(elem) {
        let { prev } = elem;
        while (prev !== null && !isTag(prev))
            ({ prev } = prev);
        return prev;
    }

    /**
     * Remove an element from the dom
     *
     * @category Manipulation
     * @param elem The element to be removed
     */
    function removeElement(elem) {
        if (elem.prev)
            elem.prev.next = elem.next;
        if (elem.next)
            elem.next.prev = elem.prev;
        if (elem.parent) {
            const childs = elem.parent.children;
            const childsIndex = childs.lastIndexOf(elem);
            if (childsIndex >= 0) {
                childs.splice(childsIndex, 1);
            }
        }
        elem.next = null;
        elem.prev = null;
        elem.parent = null;
    }
    /**
     * Replace an element in the dom
     *
     * @category Manipulation
     * @param elem The element to be replaced
     * @param replacement The element to be added
     */
    function replaceElement(elem, replacement) {
        const prev = (replacement.prev = elem.prev);
        if (prev) {
            prev.next = replacement;
        }
        const next = (replacement.next = elem.next);
        if (next) {
            next.prev = replacement;
        }
        const parent = (replacement.parent = elem.parent);
        if (parent) {
            const childs = parent.children;
            childs[childs.lastIndexOf(elem)] = replacement;
            elem.parent = null;
        }
    }
    /**
     * Append a child to an element.
     *
     * @category Manipulation
     * @param parent The element to append to.
     * @param child The element to be added as a child.
     */
    function appendChild(parent, child) {
        removeElement(child);
        child.next = null;
        child.parent = parent;
        if (parent.children.push(child) > 1) {
            const sibling = parent.children[parent.children.length - 2];
            sibling.next = child;
            child.prev = sibling;
        }
        else {
            child.prev = null;
        }
    }
    /**
     * Append an element after another.
     *
     * @category Manipulation
     * @param elem The element to append after.
     * @param next The element be added.
     */
    function append$1(elem, next) {
        removeElement(next);
        const { parent } = elem;
        const currNext = elem.next;
        next.next = currNext;
        next.prev = elem;
        elem.next = next;
        next.parent = parent;
        if (currNext) {
            currNext.prev = next;
            if (parent) {
                const childs = parent.children;
                childs.splice(childs.lastIndexOf(currNext), 0, next);
            }
        }
        else if (parent) {
            parent.children.push(next);
        }
    }
    /**
     * Prepend a child to an element.
     *
     * @category Manipulation
     * @param parent The element to prepend before.
     * @param child The element to be added as a child.
     */
    function prependChild(parent, child) {
        removeElement(child);
        child.parent = parent;
        child.prev = null;
        if (parent.children.unshift(child) !== 1) {
            const sibling = parent.children[1];
            sibling.prev = child;
            child.next = sibling;
        }
        else {
            child.next = null;
        }
    }
    /**
     * Prepend an element before another.
     *
     * @category Manipulation
     * @param elem The element to prepend before.
     * @param prev The element be added.
     */
    function prepend$1(elem, prev) {
        removeElement(prev);
        const { parent } = elem;
        if (parent) {
            const childs = parent.children;
            childs.splice(childs.indexOf(elem), 0, prev);
        }
        if (elem.prev) {
            elem.prev.next = prev;
        }
        prev.parent = parent;
        prev.prev = elem.prev;
        prev.next = elem;
        elem.prev = prev;
    }

    /**
     * Search a node and its children for nodes passing a test function. If `node` is not an array, it will be wrapped in one.
     *
     * @category Querying
     * @param test Function to test nodes on.
     * @param node Node to search. Will be included in the result set if it matches.
     * @param recurse Also consider child nodes.
     * @param limit Maximum number of nodes to return.
     * @returns All nodes passing `test`.
     */
    function filter$2(test, node, recurse = true, limit = Infinity) {
        return find$2(test, Array.isArray(node) ? node : [node], recurse, limit);
    }
    /**
     * Search an array of nodes and their children for nodes passing a test function.
     *
     * @category Querying
     * @param test Function to test nodes on.
     * @param nodes Array of nodes to search.
     * @param recurse Also consider child nodes.
     * @param limit Maximum number of nodes to return.
     * @returns All nodes passing `test`.
     */
    function find$2(test, nodes, recurse, limit) {
        const result = [];
        /** Stack of the arrays we are looking at. */
        const nodeStack = [Array.isArray(nodes) ? nodes : [nodes]];
        /** Stack of the indices within the arrays. */
        const indexStack = [0];
        for (;;) {
            // First, check if the current array has any more elements to look at.
            if (indexStack[0] >= nodeStack[0].length) {
                // If we have no more arrays to look at, we are done.
                if (indexStack.length === 1) {
                    return result;
                }
                // Otherwise, remove the current array from the stack.
                nodeStack.shift();
                indexStack.shift();
                // Loop back to the start to continue with the next array.
                continue;
            }
            const elem = nodeStack[0][indexStack[0]++];
            if (test(elem)) {
                result.push(elem);
                if (--limit <= 0)
                    return result;
            }
            if (recurse && hasChildren(elem) && elem.children.length > 0) {
                /*
                 * Add the children to the stack. We are depth-first, so this is
                 * the next array we look at.
                 */
                indexStack.unshift(0);
                nodeStack.unshift(elem.children);
            }
        }
    }
    /**
     * Finds the first element inside of an array that matches a test function. This is an alias for `Array.prototype.find`.
     *
     * @category Querying
     * @param test Function to test nodes on.
     * @param nodes Array of nodes to search.
     * @returns The first node in the array that passes `test`.
     * @deprecated Use `Array.prototype.find` directly.
     */
    function findOneChild(test, nodes) {
        return nodes.find(test);
    }
    /**
     * Finds one element in a tree that passes a test.
     *
     * @category Querying
     * @param test Function to test nodes on.
     * @param nodes Node or array of nodes to search.
     * @param recurse Also consider child nodes.
     * @returns The first node that passes `test`.
     */
    function findOne(test, nodes, recurse = true) {
        const searchedNodes = Array.isArray(nodes) ? nodes : [nodes];
        for (let i = 0; i < searchedNodes.length; i++) {
            const node = searchedNodes[i];
            if (isTag(node) && test(node)) {
                return node;
            }
            if (recurse && hasChildren(node) && node.children.length > 0) {
                const found = findOne(test, node.children, true);
                if (found)
                    return found;
            }
        }
        return null;
    }
    /**
     * Checks if a tree of nodes contains at least one node passing a test.
     *
     * @category Querying
     * @param test Function to test nodes on.
     * @param nodes Array of nodes to search.
     * @returns Whether a tree of nodes contains at least one node passing the test.
     */
    function existsOne(test, nodes) {
        return (Array.isArray(nodes) ? nodes : [nodes]).some((node) => (isTag(node) && test(node)) ||
            (hasChildren(node) && existsOne(test, node.children)));
    }
    /**
     * Search an array of nodes and their children for elements passing a test function.
     *
     * Same as `find`, but limited to elements and with less options, leading to reduced complexity.
     *
     * @category Querying
     * @param test Function to test nodes on.
     * @param nodes Array of nodes to search.
     * @returns All nodes passing `test`.
     */
    function findAll(test, nodes) {
        const result = [];
        const nodeStack = [Array.isArray(nodes) ? nodes : [nodes]];
        const indexStack = [0];
        for (;;) {
            if (indexStack[0] >= nodeStack[0].length) {
                if (nodeStack.length === 1) {
                    return result;
                }
                // Otherwise, remove the current array from the stack.
                nodeStack.shift();
                indexStack.shift();
                // Loop back to the start to continue with the next array.
                continue;
            }
            const elem = nodeStack[0][indexStack[0]++];
            if (isTag(elem) && test(elem))
                result.push(elem);
            if (hasChildren(elem) && elem.children.length > 0) {
                indexStack.unshift(0);
                nodeStack.unshift(elem.children);
            }
        }
    }

    /**
     * A map of functions to check nodes against.
     */
    const Checks = {
        tag_name(name) {
            if (typeof name === "function") {
                return (elem) => isTag(elem) && name(elem.name);
            }
            else if (name === "*") {
                return isTag;
            }
            return (elem) => isTag(elem) && elem.name === name;
        },
        tag_type(type) {
            if (typeof type === "function") {
                return (elem) => type(elem.type);
            }
            return (elem) => elem.type === type;
        },
        tag_contains(data) {
            if (typeof data === "function") {
                return (elem) => isText(elem) && data(elem.data);
            }
            return (elem) => isText(elem) && elem.data === data;
        },
    };
    /**
     * Returns a function to check whether a node has an attribute with a particular
     * value.
     *
     * @param attrib Attribute to check.
     * @param value Attribute value to look for.
     * @returns A function to check whether the a node has an attribute with a
     *   particular value.
     */
    function getAttribCheck(attrib, value) {
        if (typeof value === "function") {
            return (elem) => isTag(elem) && value(elem.attribs[attrib]);
        }
        return (elem) => isTag(elem) && elem.attribs[attrib] === value;
    }
    /**
     * Returns a function that returns `true` if either of the input functions
     * returns `true` for a node.
     *
     * @param a First function to combine.
     * @param b Second function to combine.
     * @returns A function taking a node and returning `true` if either of the input
     *   functions returns `true` for the node.
     */
    function combineFuncs(a, b) {
        return (elem) => a(elem) || b(elem);
    }
    /**
     * Returns a function that executes all checks in `options` and returns `true`
     * if any of them match a node.
     *
     * @param options An object describing nodes to look for.
     * @returns A function that executes all checks in `options` and returns `true`
     *   if any of them match a node.
     */
    function compileTest(options) {
        const funcs = Object.keys(options).map((key) => {
            const value = options[key];
            return Object.prototype.hasOwnProperty.call(Checks, key)
                ? Checks[key](value)
                : getAttribCheck(key, value);
        });
        return funcs.length === 0 ? null : funcs.reduce(combineFuncs);
    }
    /**
     * Checks whether a node matches the description in `options`.
     *
     * @category Legacy Query Functions
     * @param options An object describing nodes to look for.
     * @param node The element to test.
     * @returns Whether the element matches the description in `options`.
     */
    function testElement(options, node) {
        const test = compileTest(options);
        return test ? test(node) : true;
    }
    /**
     * Returns all nodes that match `options`.
     *
     * @category Legacy Query Functions
     * @param options An object describing nodes to look for.
     * @param nodes Nodes to search through.
     * @param recurse Also consider child nodes.
     * @param limit Maximum number of nodes to return.
     * @returns All nodes that match `options`.
     */
    function getElements(options, nodes, recurse, limit = Infinity) {
        const test = compileTest(options);
        return test ? filter$2(test, nodes, recurse, limit) : [];
    }
    /**
     * Returns the node with the supplied ID.
     *
     * @category Legacy Query Functions
     * @param id The unique ID attribute value to look for.
     * @param nodes Nodes to search through.
     * @param recurse Also consider child nodes.
     * @returns The node with the supplied ID.
     */
    function getElementById(id, nodes, recurse = true) {
        if (!Array.isArray(nodes))
            nodes = [nodes];
        return findOne(getAttribCheck("id", id), nodes, recurse);
    }
    /**
     * Returns all nodes with the supplied `tagName`.
     *
     * @category Legacy Query Functions
     * @param tagName Tag name to search for.
     * @param nodes Nodes to search through.
     * @param recurse Also consider child nodes.
     * @param limit Maximum number of nodes to return.
     * @returns All nodes with the supplied `tagName`.
     */
    function getElementsByTagName(tagName, nodes, recurse = true, limit = Infinity) {
        return filter$2(Checks["tag_name"](tagName), nodes, recurse, limit);
    }
    /**
     * Returns all nodes with the supplied `className`.
     *
     * @category Legacy Query Functions
     * @param className Class name to search for.
     * @param nodes Nodes to search through.
     * @param recurse Also consider child nodes.
     * @param limit Maximum number of nodes to return.
     * @returns All nodes with the supplied `className`.
     */
    function getElementsByClassName(className, nodes, recurse = true, limit = Infinity) {
        return filter$2(getAttribCheck("class", className), nodes, recurse, limit);
    }
    /**
     * Returns all nodes with the supplied `type`.
     *
     * @category Legacy Query Functions
     * @param type Element type to look for.
     * @param nodes Nodes to search through.
     * @param recurse Also consider child nodes.
     * @param limit Maximum number of nodes to return.
     * @returns All nodes with the supplied `type`.
     */
    function getElementsByTagType(type, nodes, recurse = true, limit = Infinity) {
        return filter$2(Checks["tag_type"](type), nodes, recurse, limit);
    }

    /**
     * Given an array of nodes, remove any member that is contained by another
     * member.
     *
     * @category Helpers
     * @param nodes Nodes to filter.
     * @returns Remaining nodes that aren't contained by other nodes.
     */
    function removeSubsets(nodes) {
        let idx = nodes.length;
        /*
         * Check if each node (or one of its ancestors) is already contained in the
         * array.
         */
        while (--idx >= 0) {
            const node = nodes[idx];
            /*
             * Remove the node if it is not unique.
             * We are going through the array from the end, so we only
             * have to check nodes that preceed the node under consideration in the array.
             */
            if (idx > 0 && nodes.lastIndexOf(node, idx - 1) >= 0) {
                nodes.splice(idx, 1);
                continue;
            }
            for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
                if (nodes.includes(ancestor)) {
                    nodes.splice(idx, 1);
                    break;
                }
            }
        }
        return nodes;
    }
    /**
     * @category Helpers
     * @see {@link http://dom.spec.whatwg.org/#dom-node-comparedocumentposition}
     */
    var DocumentPosition;
    (function (DocumentPosition) {
        DocumentPosition[DocumentPosition["DISCONNECTED"] = 1] = "DISCONNECTED";
        DocumentPosition[DocumentPosition["PRECEDING"] = 2] = "PRECEDING";
        DocumentPosition[DocumentPosition["FOLLOWING"] = 4] = "FOLLOWING";
        DocumentPosition[DocumentPosition["CONTAINS"] = 8] = "CONTAINS";
        DocumentPosition[DocumentPosition["CONTAINED_BY"] = 16] = "CONTAINED_BY";
    })(DocumentPosition || (DocumentPosition = {}));
    /**
     * Compare the position of one node against another node in any other document,
     * returning a bitmask with the values from {@link DocumentPosition}.
     *
     * Document order:
     * > There is an ordering, document order, defined on all the nodes in the
     * > document corresponding to the order in which the first character of the
     * > XML representation of each node occurs in the XML representation of the
     * > document after expansion of general entities. Thus, the document element
     * > node will be the first node. Element nodes occur before their children.
     * > Thus, document order orders element nodes in order of the occurrence of
     * > their start-tag in the XML (after expansion of entities). The attribute
     * > nodes of an element occur after the element and before its children. The
     * > relative order of attribute nodes is implementation-dependent.
     *
     * Source:
     * http://www.w3.org/TR/DOM-Level-3-Core/glossary.html#dt-document-order
     *
     * @category Helpers
     * @param nodeA The first node to use in the comparison
     * @param nodeB The second node to use in the comparison
     * @returns A bitmask describing the input nodes' relative position.
     *
     * See http://dom.spec.whatwg.org/#dom-node-comparedocumentposition for
     * a description of these values.
     */
    function compareDocumentPosition(nodeA, nodeB) {
        const aParents = [];
        const bParents = [];
        if (nodeA === nodeB) {
            return 0;
        }
        let current = hasChildren(nodeA) ? nodeA : nodeA.parent;
        while (current) {
            aParents.unshift(current);
            current = current.parent;
        }
        current = hasChildren(nodeB) ? nodeB : nodeB.parent;
        while (current) {
            bParents.unshift(current);
            current = current.parent;
        }
        const maxIdx = Math.min(aParents.length, bParents.length);
        let idx = 0;
        while (idx < maxIdx && aParents[idx] === bParents[idx]) {
            idx++;
        }
        if (idx === 0) {
            return DocumentPosition.DISCONNECTED;
        }
        const sharedParent = aParents[idx - 1];
        const siblings = sharedParent.children;
        const aSibling = aParents[idx];
        const bSibling = bParents[idx];
        if (siblings.indexOf(aSibling) > siblings.indexOf(bSibling)) {
            if (sharedParent === nodeB) {
                return DocumentPosition.FOLLOWING | DocumentPosition.CONTAINED_BY;
            }
            return DocumentPosition.FOLLOWING;
        }
        if (sharedParent === nodeA) {
            return DocumentPosition.PRECEDING | DocumentPosition.CONTAINS;
        }
        return DocumentPosition.PRECEDING;
    }
    /**
     * Sort an array of nodes based on their relative position in the document,
     * removing any duplicate nodes. If the array contains nodes that do not belong
     * to the same document, sort order is unspecified.
     *
     * @category Helpers
     * @param nodes Array of DOM nodes.
     * @returns Collection of unique nodes, sorted in document order.
     */
    function uniqueSort(nodes) {
        nodes = nodes.filter((node, i, arr) => !arr.includes(node, i + 1));
        nodes.sort((a, b) => {
            const relative = compareDocumentPosition(a, b);
            if (relative & DocumentPosition.PRECEDING) {
                return -1;
            }
            else if (relative & DocumentPosition.FOLLOWING) {
                return 1;
            }
            return 0;
        });
        return nodes;
    }

    /**
     * Get the feed object from the root of a DOM tree.
     *
     * @category Feeds
     * @param doc - The DOM to to extract the feed from.
     * @returns The feed.
     */
    function getFeed(doc) {
        const feedRoot = getOneElement(isValidFeed, doc);
        return !feedRoot
            ? null
            : feedRoot.name === "feed"
                ? getAtomFeed(feedRoot)
                : getRssFeed(feedRoot);
    }
    /**
     * Parse an Atom feed.
     *
     * @param feedRoot The root of the feed.
     * @returns The parsed feed.
     */
    function getAtomFeed(feedRoot) {
        var _a;
        const childs = feedRoot.children;
        const feed = {
            type: "atom",
            items: getElementsByTagName("entry", childs).map((item) => {
                var _a;
                const { children } = item;
                const entry = { media: getMediaElements(children) };
                addConditionally(entry, "id", "id", children);
                addConditionally(entry, "title", "title", children);
                const href = (_a = getOneElement("link", children)) === null || _a === void 0 ? void 0 : _a.attribs["href"];
                if (href) {
                    entry.link = href;
                }
                const description = fetch("summary", children) || fetch("content", children);
                if (description) {
                    entry.description = description;
                }
                const pubDate = fetch("updated", children);
                if (pubDate) {
                    entry.pubDate = new Date(pubDate);
                }
                return entry;
            }),
        };
        addConditionally(feed, "id", "id", childs);
        addConditionally(feed, "title", "title", childs);
        const href = (_a = getOneElement("link", childs)) === null || _a === void 0 ? void 0 : _a.attribs["href"];
        if (href) {
            feed.link = href;
        }
        addConditionally(feed, "description", "subtitle", childs);
        const updated = fetch("updated", childs);
        if (updated) {
            feed.updated = new Date(updated);
        }
        addConditionally(feed, "author", "email", childs, true);
        return feed;
    }
    /**
     * Parse a RSS feed.
     *
     * @param feedRoot The root of the feed.
     * @returns The parsed feed.
     */
    function getRssFeed(feedRoot) {
        var _a, _b;
        const childs = (_b = (_a = getOneElement("channel", feedRoot.children)) === null || _a === void 0 ? void 0 : _a.children) !== null && _b !== void 0 ? _b : [];
        const feed = {
            type: feedRoot.name.substr(0, 3),
            id: "",
            items: getElementsByTagName("item", feedRoot.children).map((item) => {
                const { children } = item;
                const entry = { media: getMediaElements(children) };
                addConditionally(entry, "id", "guid", children);
                addConditionally(entry, "title", "title", children);
                addConditionally(entry, "link", "link", children);
                addConditionally(entry, "description", "description", children);
                const pubDate = fetch("pubDate", children) || fetch("dc:date", children);
                if (pubDate)
                    entry.pubDate = new Date(pubDate);
                return entry;
            }),
        };
        addConditionally(feed, "title", "title", childs);
        addConditionally(feed, "link", "link", childs);
        addConditionally(feed, "description", "description", childs);
        const updated = fetch("lastBuildDate", childs);
        if (updated) {
            feed.updated = new Date(updated);
        }
        addConditionally(feed, "author", "managingEditor", childs, true);
        return feed;
    }
    const MEDIA_KEYS_STRING = ["url", "type", "lang"];
    const MEDIA_KEYS_INT = [
        "fileSize",
        "bitrate",
        "framerate",
        "samplingrate",
        "channels",
        "duration",
        "height",
        "width",
    ];
    /**
     * Get all media elements of a feed item.
     *
     * @param where Nodes to search in.
     * @returns Media elements.
     */
    function getMediaElements(where) {
        return getElementsByTagName("media:content", where).map((elem) => {
            const { attribs } = elem;
            const media = {
                medium: attribs["medium"],
                isDefault: !!attribs["isDefault"],
            };
            for (const attrib of MEDIA_KEYS_STRING) {
                if (attribs[attrib]) {
                    media[attrib] = attribs[attrib];
                }
            }
            for (const attrib of MEDIA_KEYS_INT) {
                if (attribs[attrib]) {
                    media[attrib] = parseInt(attribs[attrib], 10);
                }
            }
            if (attribs["expression"]) {
                media.expression = attribs["expression"];
            }
            return media;
        });
    }
    /**
     * Get one element by tag name.
     *
     * @param tagName Tag name to look for
     * @param node Node to search in
     * @returns The element or null
     */
    function getOneElement(tagName, node) {
        return getElementsByTagName(tagName, node, true, 1)[0];
    }
    /**
     * Get the text content of an element with a certain tag name.
     *
     * @param tagName Tag name to look for.
     * @param where Node to search in.
     * @param recurse Whether to recurse into child nodes.
     * @returns The text content of the element.
     */
    function fetch(tagName, where, recurse = false) {
        return textContent(getElementsByTagName(tagName, where, recurse, 1)).trim();
    }
    /**
     * Adds a property to an object if it has a value.
     *
     * @param obj Object to be extended
     * @param prop Property name
     * @param tagName Tag name that contains the conditionally added property
     * @param where Element to search for the property
     * @param recurse Whether to recurse into child nodes.
     */
    function addConditionally(obj, prop, tagName, where, recurse = false) {
        const val = fetch(tagName, where, recurse);
        if (val)
            obj[prop] = val;
    }
    /**
     * Checks if an element is a feed root node.
     *
     * @param value The name of the element to check.
     * @returns Whether an element is a feed root node.
     */
    function isValidFeed(value) {
        return value === "rss" || value === "feed" || value === "rdf:RDF";
    }

    var DomUtils = /*#__PURE__*/Object.freeze({
        __proto__: null,
        get DocumentPosition () { return DocumentPosition; },
        append: append$1,
        appendChild: appendChild,
        compareDocumentPosition: compareDocumentPosition,
        existsOne: existsOne,
        filter: filter$2,
        find: find$2,
        findAll: findAll,
        findOne: findOne,
        findOneChild: findOneChild,
        getAttributeValue: getAttributeValue,
        getChildren: getChildren,
        getElementById: getElementById,
        getElements: getElements,
        getElementsByClassName: getElementsByClassName,
        getElementsByTagName: getElementsByTagName,
        getElementsByTagType: getElementsByTagType,
        getFeed: getFeed,
        getInnerHTML: getInnerHTML,
        getName: getName,
        getOuterHTML: getOuterHTML,
        getParent: getParent,
        getSiblings: getSiblings,
        getText: getText,
        hasAttrib: hasAttrib,
        hasChildren: hasChildren,
        innerText: innerText,
        isCDATA: isCDATA,
        isComment: isComment,
        isDocument: isDocument,
        isTag: isTag,
        isText: isText,
        nextElementSibling: nextElementSibling,
        prepend: prepend$1,
        prependChild: prependChild,
        prevElementSibling: prevElementSibling,
        removeElement: removeElement,
        removeSubsets: removeSubsets,
        replaceElement: replaceElement,
        testElement: testElement,
        textContent: textContent,
        uniqueSort: uniqueSort
    });

    const defaultOpts$1 = {
        _useHtmlParser2: false,
    };
    /**
     * Flatten the options for Cheerio.
     *
     * This will set `_useHtmlParser2` to true if `xml` is set to true.
     *
     * @param options - The options to flatten.
     * @param baseOptions - The base options to use.
     * @returns The flattened options.
     */
    function flattenOptions(options, baseOptions) {
        if (!options) {
            return baseOptions !== null && baseOptions !== void 0 ? baseOptions : defaultOpts$1;
        }
        const opts = {
            _useHtmlParser2: !!options.xmlMode,
            ...baseOptions,
            ...options,
        };
        if (options.xml) {
            opts._useHtmlParser2 = true;
            opts.xmlMode = true;
            if (options.xml !== true) {
                Object.assign(opts, options.xml);
            }
        }
        else if (options.xmlMode) {
            opts._useHtmlParser2 = true;
        }
        return opts;
    }

    /**
     * Helper function to render a DOM.
     *
     * @param that - Cheerio instance to render.
     * @param dom - The DOM to render. Defaults to `that`'s root.
     * @param options - Options for rendering.
     * @returns The rendered document.
     */
    function render(that, dom, options) {
        if (!that)
            return '';
        return that(dom !== null && dom !== void 0 ? dom : that._root.children, null, undefined, options).toString();
    }
    /**
     * Checks if a passed object is an options object.
     *
     * @param dom - Object to check if it is an options object.
     * @param options - Options object.
     * @returns Whether the object is an options object.
     */
    function isOptions(dom, options) {
        return (typeof dom === 'object' &&
            dom != null &&
            !('length' in dom) &&
            !('type' in dom));
    }
    function html$1(dom, options) {
        /*
         * Be flexible about parameters, sometimes we call html(),
         * with options as only parameter
         * check dom argument for dom element specific properties
         * assume there is no 'length' or 'type' properties in the options object
         */
        const toRender = isOptions(dom) ? ((options = dom), undefined) : dom;
        /*
         * Sometimes `$.html()` is used without preloading html,
         * so fallback non-existing options to the default ones.
         */
        const opts = {
            ...this === null || this === void 0 ? void 0 : this._options,
            ...flattenOptions(options),
        };
        return render(this, toRender, opts);
    }
    /**
     * Render the document as XML.
     *
     * @category Static
     * @param dom - Element to render.
     * @returns THe rendered document.
     */
    function xml(dom) {
        const options = { ...this._options, xmlMode: true };
        return render(this, dom, options);
    }
    /**
     * Render the document as text.
     *
     * This returns the `textContent` of the passed elements. The result will
     * include the contents of `<script>` and `<style>` elements. To avoid this, use
     * `.prop('innerText')` instead.
     *
     * @category Static
     * @param elements - Elements to render.
     * @returns The rendered document.
     */
    function text$1(elements) {
        const elems = elements !== null && elements !== void 0 ? elements : (this ? this.root() : []);
        let ret = '';
        for (let i = 0; i < elems.length; i++) {
            ret += textContent(elems[i]);
        }
        return ret;
    }
    function parseHTML(data, context, keepScripts = typeof context === 'boolean' ? context : false) {
        if (!data || typeof data !== 'string') {
            return null;
        }
        if (typeof context === 'boolean') {
            keepScripts = context;
        }
        const parsed = this.load(data, this._options, false);
        if (!keepScripts) {
            parsed('script').remove();
        }
        /*
         * The `children` array is used by Cheerio internally to group elements that
         * share the same parents. When nodes created through `parseHTML` are
         * inserted into previously-existing DOM structures, they will be removed
         * from the `children` array. The results of `parseHTML` should remain
         * constant across these operations, so a shallow copy should be returned.
         */
        return [...parsed.root()[0].children];
    }
    /**
     * Sometimes you need to work with the top-level root element. To query it, you
     * can use `$.root()`.
     *
     * @category Static
     * @example
     *
     * ```js
     * $.root().append('<ul id="vegetables"></ul>').html();
     * //=> <ul id="fruits">...</ul><ul id="vegetables"></ul>
     * ```
     *
     * @returns Cheerio instance wrapping the root node.
     * @alias Cheerio.root
     */
    function root() {
        return this(this._root);
    }
    /**
     * Checks to see if the `contained` DOM element is a descendant of the
     * `container` DOM element.
     *
     * @category Static
     * @param container - Potential parent node.
     * @param contained - Potential child node.
     * @returns Indicates if the nodes contain one another.
     * @alias Cheerio.contains
     * @see {@link https://api.jquery.com/jQuery.contains/}
     */
    function contains(container, contained) {
        // According to the jQuery API, an element does not "contain" itself
        if (contained === container) {
            return false;
        }
        /*
         * Step up the descendants, stopping when the root element is reached
         * (signaled by `.parent` returning a reference to the same object)
         */
        let next = contained;
        while (next && next !== next.parent) {
            next = next.parent;
            if (next === container) {
                return true;
            }
        }
        return false;
    }
    /**
     * Extract multiple values from a document, and store them in an object.
     *
     * @category Static
     * @param map - An object containing key-value pairs. The keys are the names of
     *   the properties to be created on the object, and the values are the
     *   selectors to be used to extract the values.
     * @returns An object containing the extracted values.
     */
    function extract$1(map) {
        return this.root().extract(map);
    }
    /**
     * $.merge().
     *
     * @category Static
     * @param arr1 - First array.
     * @param arr2 - Second array.
     * @returns `arr1`, with elements of `arr2` inserted.
     * @alias Cheerio.merge
     * @see {@link https://api.jquery.com/jQuery.merge/}
     */
    function merge(arr1, arr2) {
        if (!isArrayLike(arr1) || !isArrayLike(arr2)) {
            return;
        }
        let newLength = arr1.length;
        const len = +arr2.length;
        for (let i = 0; i < len; i++) {
            arr1[newLength++] = arr2[i];
        }
        arr1.length = newLength;
        return arr1;
    }
    /**
     * Checks if an object is array-like.
     *
     * @category Static
     * @param item - Item to check.
     * @returns Indicates if the item is array-like.
     */
    function isArrayLike(item) {
        if (Array.isArray(item)) {
            return true;
        }
        if (typeof item !== 'object' ||
            item === null ||
            !('length' in item) ||
            typeof item.length !== 'number' ||
            item.length < 0) {
            return false;
        }
        for (let i = 0; i < item.length; i++) {
            if (!(i in item)) {
                return false;
            }
        }
        return true;
    }

    var staticMethods = /*#__PURE__*/Object.freeze({
        __proto__: null,
        contains: contains,
        extract: extract$1,
        html: html$1,
        merge: merge,
        parseHTML: parseHTML,
        root: root,
        text: text$1,
        xml: xml
    });

    /**
     * Checks if an object is a Cheerio instance.
     *
     * @category Utils
     * @param maybeCheerio - The object to check.
     * @returns Whether the object is a Cheerio instance.
     */
    function isCheerio(maybeCheerio) {
        return maybeCheerio.cheerio != null;
    }
    /**
     * Convert a string to camel case notation.
     *
     * @private
     * @category Utils
     * @param str - The string to be converted.
     * @returns String in camel case notation.
     */
    function camelCase(str) {
        return str.replace(/[._-](\w|$)/g, (_, x) => x.toUpperCase());
    }
    /**
     * Convert a string from camel case to "CSS case", where word boundaries are
     * described by hyphens ("-") and all characters are lower-case.
     *
     * @private
     * @category Utils
     * @param str - The string to be converted.
     * @returns String in "CSS case".
     */
    function cssCase(str) {
        return str.replace(/[A-Z]/g, '-$&').toLowerCase();
    }
    /**
     * Iterate over each DOM element without creating intermediary Cheerio
     * instances.
     *
     * This is indented for use internally to avoid otherwise unnecessary memory
     * pressure introduced by _make.
     *
     * @category Utils
     * @param array - The array to iterate over.
     * @param fn - Function to call.
     * @returns The original instance.
     */
    function domEach(array, fn) {
        const len = array.length;
        for (let i = 0; i < len; i++)
            fn(array[i], i);
        return array;
    }
    var CharacterCode;
    (function (CharacterCode) {
        CharacterCode[CharacterCode["LowerA"] = 97] = "LowerA";
        CharacterCode[CharacterCode["LowerZ"] = 122] = "LowerZ";
        CharacterCode[CharacterCode["UpperA"] = 65] = "UpperA";
        CharacterCode[CharacterCode["UpperZ"] = 90] = "UpperZ";
        CharacterCode[CharacterCode["Exclamation"] = 33] = "Exclamation";
    })(CharacterCode || (CharacterCode = {}));
    /**
     * Check if string is HTML.
     *
     * Tests for a `<` within a string, immediate followed by a letter and
     * eventually followed by a `>`.
     *
     * @private
     * @category Utils
     * @param str - The string to check.
     * @returns Indicates if `str` is HTML.
     */
    function isHtml(str) {
        if (typeof str !== 'string') {
            return false;
        }
        const tagStart = str.indexOf('<');
        if (tagStart === -1 || tagStart > str.length - 3)
            return false;
        const tagChar = str.charCodeAt(tagStart + 1);
        return (((tagChar >= CharacterCode.LowerA && tagChar <= CharacterCode.LowerZ) ||
            (tagChar >= CharacterCode.UpperA && tagChar <= CharacterCode.UpperZ) ||
            tagChar === CharacterCode.Exclamation) &&
            str.includes('>', tagStart + 2));
    }

    // Adapted from https://github.com/mathiasbynens/he/blob/36afe179392226cf1b6ccdb16ebbb7a5a844d93a/src/he.js#L106-L134
    var _a$1;
    const decodeMap$1 = new Map([
        [0, 65533],
        // C1 Unicode control character reference replacements
        [128, 8364],
        [130, 8218],
        [131, 402],
        [132, 8222],
        [133, 8230],
        [134, 8224],
        [135, 8225],
        [136, 710],
        [137, 8240],
        [138, 352],
        [139, 8249],
        [140, 338],
        [142, 381],
        [145, 8216],
        [146, 8217],
        [147, 8220],
        [148, 8221],
        [149, 8226],
        [150, 8211],
        [151, 8212],
        [152, 732],
        [153, 8482],
        [154, 353],
        [155, 8250],
        [156, 339],
        [158, 382],
        [159, 376],
    ]);
    /**
     * Polyfill for `String.fromCodePoint`. It is used to create a string from a Unicode code point.
     */
    const fromCodePoint = 
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, n/no-unsupported-features/es-builtins
    (_a$1 = String.fromCodePoint) !== null && _a$1 !== void 0 ? _a$1 : ((codePoint) => {
        let output = "";
        if (codePoint > 65535) {
            codePoint -= 65536;
            output += String.fromCharCode(((codePoint >>> 10) & 1023) | 55296);
            codePoint = 56320 | (codePoint & 1023);
        }
        output += String.fromCharCode(codePoint);
        return output;
    });
    /**
     * Replace the given code point with a replacement character if it is a
     * surrogate or is outside the valid range. Otherwise return the code
     * point unchanged.
     */
    function replaceCodePoint$1(codePoint) {
        var _a;
        if ((codePoint >= 55296 && codePoint <= 57343) ||
            codePoint > 1114111) {
            return 65533;
        }
        return (_a = decodeMap$1.get(codePoint)) !== null && _a !== void 0 ? _a : codePoint;
    }

    /*
     * Shared base64 decode helper for generated decode data.
     * Assumes global atob is available.
     */
    function decodeBase64(input) {
        const binary = 
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        typeof atob === "function"
            ? // Browser (and Node >=16)
                // eslint-disable-next-line n/no-unsupported-features/node-builtins
                atob(input)
            : // Older Node versions (<16)
                // eslint-disable-next-line n/no-unsupported-features/node-builtins
                typeof Buffer.from === "function"
                    ? // eslint-disable-next-line n/no-unsupported-features/node-builtins
                        Buffer.from(input, "base64").toString("binary")
                    : // eslint-disable-next-line unicorn/no-new-buffer, n/no-deprecated-api
                        new Buffer(input, "base64").toString("binary");
        const evenLength = binary.length & -2; // Round down to even length
        const out = new Uint16Array(evenLength / 2);
        for (let index = 0, outIndex = 0; index < evenLength; index += 2) {
            const lo = binary.charCodeAt(index);
            const hi = binary.charCodeAt(index + 1);
            out[outIndex++] = lo | (hi << 8);
        }
        return out;
    }

    // Generated using scripts/write-decode-map.ts
    const htmlDecodeTree$1 = /* #__PURE__ */ decodeBase64("QR08ALkAAgH6AYsDNQR2BO0EPgXZBQEGLAbdBxMISQrvCmQLfQurDKQNLw4fD4YPpA+6D/IPAAAAAAAAAAAAAAAAKhBMEY8TmxUWF2EYLBkxGuAa3RsJHDscWR8YIC8jSCSIJcMl6ie3Ku8rEC0CLjoupS7kLgAIRU1hYmNmZ2xtbm9wcnN0dVQAWgBeAGUAaQBzAHcAfgCBAIQAhwCSAJoAoACsALMAbABpAGcAO4DGAMZAUAA7gCYAJkBjAHUAdABlADuAwQDBQHIiZXZlAAJhAAFpeW0AcgByAGMAO4DCAMJAEGRyAADgNdgE3XIAYQB2AGUAO4DAAMBA8CFoYZFj4SFjcgBhZAAAoFMqAAFncIsAjgBvAG4ABGFmAADgNdg43fAlbHlGdW5jdGlvbgCgYSBpAG4AZwA7gMUAxUAAAWNzpACoAHIAAOA12Jzc6SFnbgCgVCJpAGwAZABlADuAwwDDQG0AbAA7gMQAxEAABGFjZWZvcnN1xQDYANoA7QDxAPYA+QD8AAABY3LJAM8AayNzbGFzaAAAoBYidgHTANUAAKDnKmUAZAAAoAYjeQARZIABY3J0AOAA5QDrAGEidXNlAACgNSLuI291bGxpcwCgLCFhAJJjcgAA4DXYBd1wAGYAAOA12Dnd5SF2ZdhiYwDyAOoAbSJwZXEAAKBOIgAHSE9hY2RlZmhpbG9yc3UXARoBHwE6AVIBVQFiAWQBZgGCAakB6QHtAfIBYwB5ACdkUABZADuAqQCpQIABY3B5ACUBKAE1AfUhdGUGYWmg0iJ0KGFsRGlmZmVyZW50aWFsRAAAoEUhbCJleXMAAKAtIQACYWVpb0EBRAFKAU0B8iFvbgxhZABpAGwAO4DHAMdAcgBjAAhhbiJpbnQAAKAwIm8AdAAKYQABZG5ZAV0BaSJsbGEAuGB0I2VyRG90ALdg8gA5AWkAp2NyImNsZQAAAkRNUFRwAXQBeQF9AW8AdAAAoJkiaSJudXMAAKCWIuwhdXMAoJUiaSJtZXMAAKCXIm8AAAFjc4cBlAFrKndpc2VDb250b3VySW50ZWdyYWwAAKAyImUjQ3VybHkAAAFEUZwBpAFvJXVibGVRdW90ZQAAoB0gdSJvdGUAAKAZIAACbG5wdbABtgHNAdgBbwBuAGWgNyIAoHQqgAFnaXQAvAHBAcUB8iJ1ZW50AKBhIm4AdAAAoC8i7yV1ckludGVncmFsAKAuIgABZnLRAdMBAKACIe8iZHVjdACgECJuLnRlckNsb2Nrd2lzZUNvbnRvdXJJbnRlZ3JhbAAAoDMi7yFzcwCgLypjAHIAAOA12J7ccABDoNMiYQBwAACgTSKABURKU1phY2VmaW9zAAsCEgIVAhgCGwIsAjQCOQI9AnMCfwNvoEUh9CJyYWhkAKARKWMAeQACZGMAeQAFZGMAeQAPZIABZ3JzACECJQIoAuchZXIAoCEgcgAAoKEhaAB2AACg5CoAAWF5MAIzAvIhb24OYRRkbAB0oAciYQCUY3IAAOA12AfdAAFhZkECawIAAWNtRQJnAvIjaXRpY2FsAAJBREdUUAJUAl8CYwJjInV0ZQC0YG8AdAFZAloC2WJiJGxlQWN1dGUA3WJyImF2ZQBgYGkibGRlANxi7yFuZACgxCJmJWVyZW50aWFsRAAAoEYhcAR9AgAAAAAAAIECjgIAABoDZgAA4DXYO91EoagAhQKJAm8AdAAAoNwgcSJ1YWwAAKBQIuIhbGUAA0NETFJVVpkCqAK1Au8C/wIRA28AbgB0AG8AdQByAEkAbgB0AGUAZwByAGEA7ADEAW8AdAKvAgAAAACwAqhgbiNBcnJvdwAAoNMhAAFlb7kC0AJmAHQAgAFBUlQAwQLGAs0CciJyb3cAAKDQIekkZ2h0QXJyb3cAoNQhZQDlACsCbgBnAAABTFLWAugC5SFmdAABQVLcAuECciJyb3cAAKD4J+kkZ2h0QXJyb3cAoPon6SRnaHRBcnJvdwCg+SdpImdodAAAAUFU9gL7AnIicm93AACg0iFlAGUAAKCoInAAQQIGAwAAAAALA3Iicm93AACg0SFvJHduQXJyb3cAAKDVIWUlcnRpY2FsQmFyAACgJSJuAAADQUJMUlRhJAM2AzoDWgNxA3oDciJyb3cAAKGTIUJVLAMwA2EAcgAAoBMpcCNBcnJvdwAAoPUhciJldmUAEWPlIWZ00gJDAwAASwMAAFIDaSVnaHRWZWN0b3IAAKBQKWUkZVZlY3RvcgAAoF4p5SJjdG9yQqC9IWEAcgAAoFYpaSJnaHQA1AFiAwAAaQNlJGVWZWN0b3IAAKBfKeUiY3RvckKgwSFhAHIAAKBXKWUAZQBBoKQiciJyb3cAAKCnIXIAcgBvAPcAtAIAAWN0gwOHA3IAAOA12J/c8iFvaxBhAAhOVGFjZGZnbG1vcHFzdHV4owOlA6kDsAO/A8IDxgPNA9ID8gP9AwEEFAQeBCAEJQRHAEphSAA7gNAA0EBjAHUAdABlADuAyQDJQIABYWl5ALYDuQO+A/Ihb24aYXIAYwA7gMoAykAtZG8AdAAWYXIAAOA12AjdcgBhAHYAZQA7gMgAyEDlIm1lbnQAoAgiAAFhcNYD2QNjAHIAEmF0AHkAUwLhAwAAAADpA20lYWxsU3F1YXJlAACg+yVlJ3J5U21hbGxTcXVhcmUAAKCrJQABZ3D2A/kDbwBuABhhZgAA4DXYPN3zImlsb26VY3UAAAFhaQYEDgRsAFSgdSppImxkZQAAoEIi7CNpYnJpdW0AoMwhAAFjaRgEGwRyAACgMCFtAACgcyphAJdjbQBsADuAywDLQAABaXApBC0E8yF0cwCgAyLvJG5lbnRpYWxFAKBHIYACY2Zpb3MAPQQ/BEMEXQRyBHkAJGRyAADgNdgJ3WwibGVkAFMCTAQAAAAAVARtJWFsbFNxdWFyZQAAoPwlZSdyeVNtYWxsU3F1YXJlAACgqiVwA2UEAABpBAAAAABtBGYAAOA12D3dwSFsbACgACLyI2llcnRyZgCgMSFjAPIAcQQABkpUYWJjZGZnb3JzdIgEiwSOBJMElwSkBKcEqwStBLIE5QTqBGMAeQADZDuAPgA+QO0hbWFkoJMD3GNyImV2ZQAeYYABZWl5AJ0EoASjBOQhaWwiYXIAYwAcYRNkbwB0ACBhcgAA4DXYCt0AoNkicABmAADgNdg+3eUiYXRlcgADRUZHTFNUvwTIBM8E1QTZBOAEcSJ1YWwATKBlIuUhc3MAoNsidSRsbEVxdWFsAACgZyJyI2VhdGVyAACgoirlIXNzAKB3IuwkYW50RXF1YWwAoH4qaSJsZGUAAKBzImMAcgAA4DXYotwAoGsiAARBYWNmaW9zdfkE/QQFBQgFCwUTBSIFKwVSIkRjeQAqZAABY3QBBQQFZQBrAMdiXmDpIXJjJGFyAACgDCFsJWJlcnRTcGFjZQAAoAsh8AEYBQAAGwVmAACgDSHpJXpvbnRhbExpbmUAoAAlAAFjdCYFKAXyABIF8iFvayZhbQBwAEQBMQU5BW8AdwBuAEgAdQBtAPAAAAFxInVhbAAAoE8iAAdFSk9hY2RmZ21ub3N0dVMFVgVZBVwFYwVtBXAFcwV6BZAFtgXFBckFzQVjAHkAFWTsIWlnMmFjAHkAAWRjAHUAdABlADuAzQDNQAABaXlnBWwFcgBjADuAzgDOQBhkbwB0ADBhcgAAoBEhcgBhAHYAZQA7gMwAzEAAoREhYXB/BYsFAAFjZ4MFhQVyACphaSNuYXJ5SQAAoEghbABpAGUA8wD6AvQBlQUAAKUFZaAsIgABZ3KaBZ4F8iFhbACgKyLzI2VjdGlvbgCgwiJpI3NpYmxlAAABQ1SsBbEFbyJtbWEAAKBjIGkibWVzAACgYiCAAWdwdAC8Bb8FwwVvAG4ALmFmAADgNdhA3WEAmWNjAHIAAKAQIWkibGRlAChh6wHSBQAA1QVjAHkABmRsADuAzwDPQIACY2Zvc3UA4QXpBe0F8gX9BQABaXnlBegFcgBjADRhGWRyAADgNdgN3XAAZgAA4DXYQd3jAfcFAAD7BXIAAOA12KXc8iFjeQhk6yFjeQRkgANISmFjZm9zAAwGDwYSBhUGHQYhBiYGYwB5ACVkYwB5AAxk8CFwYZpjAAFleRkGHAbkIWlsNmEaZHIAAOA12A7dcABmAADgNdhC3WMAcgAA4DXYptyABUpUYWNlZmxtb3N0AD0GQAZDBl4GawZkB2gHcAd0B80H2gdjAHkACWQ7gDwAPECAAmNtbnByAEwGTwZSBlUGWwb1IXRlOWHiIWRhm2NnAACg6ifsI2FjZXRyZgCgEiFyAACgniGAAWFleQBkBmcGagbyIW9uPWHkIWlsO2EbZAABZnNvBjQHdAAABUFDREZSVFVWYXKABp4GpAbGBssG3AYDByEHwQIqBwABbnKEBowGZyVsZUJyYWNrZXQAAKDoJ/Ihb3cAoZAhQlKTBpcGYQByAACg5CHpJGdodEFycm93AKDGIWUjaWxpbmcAAKAII28A9QGqBgAAsgZiJWxlQnJhY2tldAAAoOYnbgDUAbcGAAC+BmUkZVZlY3RvcgAAoGEp5SJjdG9yQqDDIWEAcgAAoFkpbCJvb3IAAKAKI2kiZ2h0AAABQVbSBtcGciJyb3cAAKCUIeUiY3RvcgCgTikAAWVy4AbwBmUAAKGjIkFW5gbrBnIicm93AACgpCHlImN0b3IAoFopaSNhbmdsZQBCorIi+wYAAAAA/wZhAHIAAKDPKXEidWFsAACgtCJwAIABRFRWAAoHEQcYB+8kd25WZWN0b3IAoFEpZSRlVmVjdG9yAACgYCnlImN0b3JCoL8hYQByAACgWCnlImN0b3JCoLwhYQByAACgUilpAGcAaAB0AGEAcgByAG8A9wDMAnMAAANFRkdMU1Q/B0cHTgdUB1gHXwfxJXVhbEdyZWF0ZXIAoNoidSRsbEVxdWFsAACgZiJyI2VhdGVyAACgdiLlIXNzAKChKuwkYW50RXF1YWwAoH0qaSJsZGUAAKByInIAAOA12A/dZaDYIuYjdGFycm93AKDaIWkiZG90AD9hgAFucHcAege1B7kHZwAAAkxSbHKCB5QHmwerB+UhZnQAAUFSiAeNB3Iicm93AACg9SfpJGdodEFycm93AKD3J+kkZ2h0QXJyb3cAoPYn5SFmdAABYXLcAqEHaQBnAGgAdABhAHIAcgBvAPcA5wJpAGcAaAB0AGEAcgByAG8A9wDuAmYAAOA12EPdZQByAAABTFK/B8YHZSRmdEFycm93AACgmSHpJGdodEFycm93AKCYIYABY2h0ANMH1QfXB/IAWgYAoLAh8iFva0FhAKBqIgAEYWNlZmlvc3XpB+wH7gf/BwMICQgOCBEIcAAAoAUpeQAcZAABZGzyB/kHaSR1bVNwYWNlAACgXyBsI2ludHJmAACgMyFyAADgNdgQ3e4jdXNQbHVzAKATInAAZgAA4DXYRN1jAPIA/gecY4AESmFjZWZvc3R1ACEIJAgoCDUIgQiFCDsKQApHCmMAeQAKZGMidXRlAENhgAFhZXkALggxCDQI8iFvbkdh5CFpbEVhHWSAAWdzdwA7CGEIfQjhInRpdmWAAU1UVgBECEwIWQhlJWRpdW1TcGFjZQAAoAsgaABpAAABY25SCFMIawBTAHAAYQBjAOUASwhlAHIAeQBUAGgAaQDuAFQI9CFlZAABR0xnCHUIcgBlAGEAdABlAHIARwByAGUAYQB0AGUA8gDrBGUAcwBzAEwAZQBzAPMA2wdMImluZQAKYHIAAOA12BHdAAJCbnB0jAiRCJkInAhyImVhawAAoGAgwiZyZWFraW5nU3BhY2WgYGYAAKAVIUOq7CqzCMIIzQgAAOcIGwkAAAAAAAAtCQAAbwkAAIcJAACdCcAJGQoAADQKAAFvdbYIvAjuI2dydWVudACgYiJwIkNhcAAAoG0ibyh1YmxlVmVydGljYWxCYXIAAKAmIoABbHF4ANII1wjhCOUibWVudACgCSL1IWFsVKBgImkibGRlAADgQiI4A2kic3RzAACgBCJyI2VhdGVyAACjbyJFRkdMU1T1CPoIAgkJCQ0JFQlxInVhbAAAoHEidSRsbEVxdWFsAADgZyI4A3IjZWF0ZXIAAOBrIjgD5SFzcwCgeSLsJGFudEVxdWFsAOB+KjgDaSJsZGUAAKB1IvUhbXBEASAJJwnvI3duSHVtcADgTiI4A3EidWFsAADgTyI4A2UAAAFmczEJRgn0JFRyaWFuZ2xlQqLqIj0JAAAAAEIJYQByAADgzyk4A3EidWFsAACg7CJzAICibiJFR0xTVABRCVYJXAlhCWkJcSJ1YWwAAKBwInIjZWF0ZXIAAKB4IuUhc3MA4GoiOAPsJGFudEVxdWFsAOB9KjgDaSJsZGUAAKB0IuUic3RlZAABR0x1CX8J8iZlYXRlckdyZWF0ZXIA4KIqOAPlI3NzTGVzcwDgoSo4A/IjZWNlZGVzAKGAIkVTjwmVCXEidWFsAADgryo4A+wkYW50RXF1YWwAoOAiAAFlaaAJqQl2JmVyc2VFbGVtZW50AACgDCLnJWh0VHJpYW5nbGVCousitgkAAAAAuwlhAHIAAODQKTgDcSJ1YWwAAKDtIgABcXXDCeAJdSNhcmVTdQAAAWJwywnVCfMhZXRF4I8iOANxInVhbAAAoOIi5SJyc2V0ReCQIjgDcSJ1YWwAAKDjIoABYmNwAOYJ8AkNCvMhZXRF4IIi0iBxInVhbAAAoIgi4yJlZWRzgKGBIkVTVAD6CQAKBwpxInVhbAAA4LAqOAPsJGFudEVxdWFsAKDhImkibGRlAADgfyI4A+UicnNldEXggyLSIHEidWFsAACgiSJpImxkZQCAoUEiRUZUACIKJwouCnEidWFsAACgRCJ1JGxsRXF1YWwAAKBHImkibGRlAACgSSJlJXJ0aWNhbEJhcgAAoCQiYwByAADgNdip3GkAbABkAGUAO4DRANFAnWMAB0VhY2RmZ21vcHJzdHV2XgphCmgKcgp2CnoKgQqRCpYKqwqtCrsKyArNCuwhaWdSYWMAdQB0AGUAO4DTANNAAAFpeWwKcQpyAGMAO4DUANRAHmRiImxhYwBQYXIAAOA12BLdcgBhAHYAZQA7gNIA0kCAAWFlaQCHCooKjQpjAHIATGFnAGEAqWNjInJvbgCfY3AAZgAA4DXYRt3lI25DdXJseQABRFGeCqYKbyV1YmxlUXVvdGUAAKAcIHUib3RlAACgGCAAoFQqAAFjbLEKtQpyAADgNdiq3GEAcwBoADuA2ADYQGkAbAHACsUKZABlADuA1QDVQGUAcwAAoDcqbQBsADuA1gDWQGUAcgAAAUJQ0wrmCgABYXLXCtoKcgAAoD4gYQBjAAABZWvgCuIKAKDeI2UAdAAAoLQjYSVyZW50aGVzaXMAAKDcI4AEYWNmaGlsb3JzAP0KAwsFCwkLCwsMCxELIwtaC3IjdGlhbEQAAKACInkAH2RyAADgNdgT3WkApmOgY/Ujc01pbnVzsWAAAWlwFQsgC24AYwBhAHIAZQBwAGwAYQBuAOUACgVmAACgGSGAobsqZWlvACoLRQtJC+MiZWRlc4CheiJFU1QANAs5C0ALcSJ1YWwAAKCvKuwkYW50RXF1YWwAoHwiaSJsZGUAAKB+Im0AZQAAoDMgAAFkcE0LUQv1IWN0AKAPIm8jcnRpb24AYaA3ImwAAKAdIgABY2leC2ILcgAA4DXYq9yoYwACVWZvc2oLbwtzC3cLTwBUADuAIgAiQHIAAOA12BTdcABmAACgGiFjAHIAAOA12KzcAAZCRWFjZWZoaW9yc3WPC5MLlwupC7YL2AvbC90LhQyTDJoMowzhIXJyAKAQKUcAO4CuAK5AgAFjbnIAnQugC6ML9SF0ZVRhZwAAoOsncgB0oKAhbAAAoBYpgAFhZXkArwuyC7UL8iFvblhh5CFpbFZhIGR2oBwhZSJyc2UAAAFFVb8LzwsAAWxxwwvIC+UibWVudACgCyL1JGlsaWJyaXVtAKDLIXAmRXF1aWxpYnJpdW0AAKBvKXIAAKAcIW8AoWPnIWh0AARBQ0RGVFVWYewLCgwQDDIMNwxeDHwM9gIAAW5y8Av4C2clbGVCcmFja2V0AACg6SfyIW93AKGSIUJM/wsDDGEAcgAAoOUhZSRmdEFycm93AACgxCFlI2lsaW5nAACgCSNvAPUBFgwAAB4MYiVsZUJyYWNrZXQAAKDnJ24A1AEjDAAAKgxlJGVWZWN0b3IAAKBdKeUiY3RvckKgwiFhAHIAAKBVKWwib29yAACgCyMAAWVyOwxLDGUAAKGiIkFWQQxGDHIicm93AACgpiHlImN0b3IAoFspaSNhbmdsZQBCorMiVgwAAAAAWgxhAHIAAKDQKXEidWFsAACgtSJwAIABRFRWAGUMbAxzDO8kd25WZWN0b3IAoE8pZSRlVmVjdG9yAACgXCnlImN0b3JCoL4hYQByAACgVCnlImN0b3JCoMAhYQByAACgUykAAXB1iQyMDGYAAKAdIe4kZEltcGxpZXMAoHAp6SRnaHRhcnJvdwCg2yEAAWNongyhDHIAAKAbIQCgsSHsJGVEZWxheWVkAKD0KYAGSE9hY2ZoaW1vcXN0dQC/DMgMzAzQDOIM5gwKDQ0NFA0ZDU8NVA1YDQABQ2PDDMYMyCFjeSlkeQAoZEYiVGN5ACxkYyJ1dGUAWmEAorwqYWVpedgM2wzeDOEM8iFvbmBh5CFpbF5hcgBjAFxhIWRyAADgNdgW3e8hcnQAAkRMUlXvDPYM/QwEDW8kd25BcnJvdwAAoJMhZSRmdEFycm93AACgkCHpJGdodEFycm93AKCSIXAjQXJyb3cAAKCRIechbWGjY+EkbGxDaXJjbGUAoBgicABmAADgNdhK3XICHw0AAAAAIg10AACgGiLhIXJlgKGhJUlTVQAqDTINSg3uJXRlcnNlY3Rpb24AoJMidQAAAWJwNw1ADfMhZXRFoI8icSJ1YWwAAKCRIuUicnNldEWgkCJxInVhbAAAoJIibiJpb24AAKCUImMAcgAA4DXYrtxhAHIAAKDGIgACYmNtcF8Nag2ODZANc6DQImUAdABFoNAicSJ1YWwAAKCGIgABY2huDYkNZSJlZHMAgKF7IkVTVAB4DX0NhA1xInVhbAAAoLAq7CRhbnRFcXVhbACgfSJpImxkZQAAoH8iVABoAGEA9ADHCwCgESIAodEiZXOVDZ8NciJzZXQARaCDInEidWFsAACghyJlAHQAAKDRIoAFSFJTYWNmaGlvcnMAtQ27Db8NyA3ODdsN3w3+DRgOHQ4jDk8AUgBOADuA3gDeQMEhREUAoCIhAAFIY8MNxg1jAHkAC2R5ACZkAAFidcwNzQ0JYKRjgAFhZXkA1A3XDdoN8iFvbmRh5CFpbGJhImRyAADgNdgX3QABZWnjDe4N8gHoDQAA7Q3lImZvcmUAoDQiYQCYYwABY27yDfkNayNTcGFjZQAA4F8gCiDTInBhY2UAoAkg7CFkZYChPCJFRlQABw4MDhMOcSJ1YWwAAKBDInUkbGxFcXVhbAAAoEUiaSJsZGUAAKBIInAAZgAA4DXYS93pI3BsZURvdACg2yAAAWN0Jw4rDnIAAOA12K/c8iFva2Zh4QpFDlYOYA5qDgAAbg5yDgAAAAAAAAAAAAB5DnwOqA6zDgAADg8RDxYPGg8AAWNySA5ODnUAdABlADuA2gDaQHIAb6CfIeMhaXIAoEkpcgDjAVsOAABdDnkADmR2AGUAbGEAAWl5Yw5oDnIAYwA7gNsA20AjZGIibGFjAHBhcgAA4DXYGN1yAGEAdgBlADuA2QDZQOEhY3JqYQABZGl/Dp8OZQByAAABQlCFDpcOAAFhcokOiw5yAF9gYQBjAAABZWuRDpMOAKDfI2UAdAAAoLUjYSVyZW50aGVzaXMAAKDdI28AbgBQoMMi7CF1cwCgjiIAAWdwqw6uDm8AbgByYWYAAOA12EzdAARBREVUYWRwc78O0g7ZDuEOBQPqDvMOBw9yInJvdwDCoZEhyA4AAMwOYQByAACgEilvJHduQXJyb3cAAKDFIW8kd25BcnJvdwAAoJUhcSV1aWxpYnJpdW0AAKBuKWUAZQBBoKUiciJyb3cAAKClIW8AdwBuAGEAcgByAG8A9wAQA2UAcgAAAUxS+Q4AD2UkZnRBcnJvdwAAoJYh6SRnaHRBcnJvdwCglyFpAGyg0gNvAG4ApWPpIW5nbmFjAHIAAOA12LDcaSJsZGUAaGFtAGwAO4DcANxAgAREYmNkZWZvc3YALQ8xDzUPNw89D3IPdg97D4AP4SFzaACgqyJhAHIAAKDrKnkAEmThIXNobKCpIgCg5ioAAWVyQQ9DDwCgwSKAAWJ0eQBJD00Paw9hAHIAAKAWIGmgFiDjIWFsAAJCTFNUWA9cD18PZg9hAHIAAKAjIukhbmV8YGUkcGFyYXRvcgAAoFgnaSJsZGUAAKBAItQkaGluU3BhY2UAoAogcgAA4DXYGd1wAGYAAOA12E3dYwByAADgNdix3GQiYXNoAACgqiKAAmNlZm9zAI4PkQ+VD5kPng/pIXJjdGHkIWdlAKDAInIAAOA12BrdcABmAADgNdhO3WMAcgAA4DXYstwAAmZpb3OqD64Prw+0D3IAAOA12BvdnmNwAGYAAOA12E/dYwByAADgNdiz3IAEQUlVYWNmb3N1AMgPyw/OD9EP2A/gD+QP6Q/uD2MAeQAvZGMAeQAHZGMAeQAuZGMAdQB0AGUAO4DdAN1AAAFpedwP3w9yAGMAdmErZHIAAOA12BzdcABmAADgNdhQ3WMAcgAA4DXYtNxtAGwAeGEABEhhY2RlZm9z/g8BEAUQDRAQEB0QIBAkEGMAeQAWZGMidXRlAHlhAAFheQkQDBDyIW9ufWEXZG8AdAB7YfIBFRAAABwQbwBXAGkAZAB0AOgAVAhhAJZjcgAAoCghcABmAACgJCFjAHIAAOA12LXc4QtCEEkQTRAAAGcQbRByEAAAAAAAAAAAeRCKEJcQ8hD9EAAAGxEhETIROREAAD4RYwB1AHQAZQA7gOEA4UByImV2ZQADYYCiPiJFZGl1eQBWEFkQWxBgEGUQAOA+IjMDAKA/InIAYwA7gOIA4kB0AGUAO4C0ALRAMGRsAGkAZwA7gOYA5kByoGEgAOA12B7dcgBhAHYAZQA7gOAA4EAAAWVwfBCGEAABZnCAEIQQ8yF5bQCgNSHoAIMQaABhALFjAAFhcI0QWwAAAWNskRCTEHIAAWFnAACgPypkApwQAAAAALEQAKInImFkc3ajEKcQqRCuEG4AZAAAoFUqAKBcKmwib3BlAACgWCoAoFoqAKMgImVsbXJzersQvRDAEN0Q5RDtEACgpCllAACgICJzAGQAYaAhImEEzhDQENIQ1BDWENgQ2hDcEACgqCkAoKkpAKCqKQCgqykAoKwpAKCtKQCgrikAoK8pdAB2oB8iYgBkoL4iAKCdKQABcHTpEOwQaAAAoCIixWDhIXJyAKB8IwABZ3D1EPgQbwBuAAVhZgAA4DXYUt0Ao0giRWFlaW9wBxEJEQ0RDxESERQRAKBwKuMhaXIAoG8qAKBKImQAAKBLInMAJ2DyIW94ZaBIIvEADhFpAG4AZwA7gOUA5UCAAWN0eQAmESoRKxFyAADgNdi23CpgbQBwAGWgSCLxAPgBaQBsAGQAZQA7gOMA40BtAGwAO4DkAORAAAFjaUERRxFvAG4AaQBuAPQA6AFuAHQAAKARKgAITmFiY2RlZmlrbG5vcHJzdWQRaBGXEZ8RpxGrEdIR1hErEjASexKKEn0RThNbE3oTbwB0AACg7SoAAWNybBGJEWsAAAJjZXBzdBF4EX0RghHvIW5nAKBMInAjc2lsb24A9mNyImltZQAAoDUgaQBtAGWgPSJxAACgzSJ2AY0RkRFlAGUAAKC9ImUAZABnoAUjZQAAoAUjcgBrAHSgtSPiIXJrAKC2IwABb3mjEaYRbgDnAHcRMWTxIXVvAKAeIIACY21wcnQAtBG5Eb4RwRHFEeEhdXPloDUi5ABwInR5dgAAoLApcwDpAH0RbgBvAPUA6gCAAWFodwDLEcwRzhGyYwCgNiHlIWVuAKBsInIAAOA12B/dZwCAA2Nvc3R1dncA4xHyEQUSEhIhEiYSKRKAAWFpdQDpEesR7xHwAKMFcgBjAACg7yVwAACgwyKAAWRwdAD4EfwRABJvAHQAAKAAKuwhdXMAoAEqaSJtZXMAAKACKnECCxIAAAAADxLjIXVwAKAGKmEAcgAAoAUm8iNpYW5nbGUAAWR1GhIeEu8hd24AoL0lcAAAoLMlcCJsdXMAAKAEKmUA5QBCD+UAkg9hInJvdwAAoA0pgAFha28ANhJoEncSAAFjbjoSZRJrAIABbHN0AEESRxJNEm8jemVuZ2UAAKDrKXEAdQBhAHIA5QBcBPIjaWFuZ2xlgKG0JWRscgBYElwSYBLvIXduAKC+JeUhZnQAoMIlaSJnaHQAAKC4JWsAAKAjJLEBbRIAAHUSsgFxEgAAcxIAoJIlAKCRJTQAAKCTJWMAawAAoIglAAFlb38ShxJx4D0A5SD1IWl2AOBhIuUgdAAAoBAjAAJwdHd4kRKVEpsSnxJmAADgNdhT3XSgpSJvAG0AAKClIvQhaWUAoMgiAAZESFVWYmRobXB0dXayEsES0RLgEvcS+xIKExoTHxMjEygTNxMAAkxSbHK5ErsSvRK/EgCgVyUAoFQlAKBWJQCgUyUAolAlRFVkdckSyxLNEs8SAKBmJQCgaSUAoGQlAKBnJQACTFJsctgS2hLcEt4SAKBdJQCgWiUAoFwlAKBZJQCjUSVITFJobHLrEu0S7xLxEvMS9RIAoGwlAKBjJQCgYCUAoGslAKBiJQCgXyVvAHgAAKDJKQACTFJscgITBBMGEwgTAKBVJQCgUiUAoBAlAKAMJQCiACVEVWR1EhMUExYTGBMAoGUlAKBoJQCgLCUAoDQlaSJudXMAAKCfIuwhdXMAoJ4iaSJtZXMAAKCgIgACTFJsci8TMRMzEzUTAKBbJQCgWCUAoBglAKAUJQCjAiVITFJobHJCE0QTRhNIE0oTTBMAoGolAKBhJQCgXiUAoDwlAKAkJQCgHCUAAWV2UhNVE3YA5QD5AGIAYQByADuApgCmQAACY2Vpb2ITZhNqE24TcgAA4DXYt9xtAGkAAKBPIG0A5aA9IogRbAAAoVwAYmh0E3YTAKDFKfMhdWIAoMgnbAF+E4QTbABloCIgdAAAoCIgcAAAoU4iRWWJE4sTAKCuKvGgTyI8BeEMqRMAAN8TABQDFB8UAAAjFDQUAAAAAIUUAAAAAI0UAAAAANcU4xT3FPsUAACIFQAAlhWAAWNwcgCuE7ET1RP1IXRlB2GAoikiYWJjZHMAuxO/E8QTzhPSE24AZAAAoEQqciJjdXAAAKBJKgABYXXIE8sTcAAAoEsqcAAAoEcqbwB0AACgQCoA4CkiAP4AAWVv2RPcE3QAAKBBIO4ABAUAAmFlaXXlE+8T9RP4E/AB6hMAAO0TcwAAoE0qbwBuAA1hZABpAGwAO4DnAOdAcgBjAAlhcABzAHOgTCptAACgUCpvAHQAC2GAAWRtbgAIFA0UEhRpAGwAO4C4ALhAcCJ0eXYAAKCyKXQAAIGiADtlGBQZFKJAcgBkAG8A9ABiAXIAAOA12CDdgAFjZWkAKBQqFDIUeQBHZGMAawBtoBMn4SFyawCgEyfHY3IAAKPLJUVjZWZtcz8UQRRHFHcUfBSAFACgwykAocYCZWxGFEkUcQAAoFciZQBhAlAUAAAAAGAUciJyb3cAAAFsclYUWhTlIWZ0AKC6IWkiZ2h0AACguyGAAlJTYWNkAGgUaRRrFG8UcxSuYACgyCRzAHQAAKCbIukhcmMAoJoi4SFzaACgnSJuImludAAAoBAqaQBkAACg7yrjIWlyAKDCKfUhYnN1oGMmaQB0AACgYybsApMUmhS2FAAAwxRvAG4AZaA6APGgVCKrAG0CnxQAAAAAoxRhAHSgLABAYAChASJmbKcUqRTuABMNZQAAAW14rhSyFOUhbnQAoAEiZQDzANIB5wG6FAAAwBRkoEUibwB0AACgbSpuAPQAzAGAAWZyeQDIFMsUzhQA4DXYVN1vAOQA1wEAgakAO3MeAdMUcgAAoBchAAFhb9oU3hRyAHIAAKC1IXMAcwAAoBcnAAFjdeYU6hRyAADgNdi43AABYnDuFPIUZaDPKgCg0SploNAqAKDSKuQhb3QAoO8igANkZWxwcnZ3AAYVEBUbFSEVRBVlFYQV4SFycgABbHIMFQ4VAKA4KQCgNSlwAhYVAAAAABkVcgAAoN4iYwAAoN8i4SFycnCgtiEAoD0pgKIqImJjZG9zACsVMBU6FT4VQRVyImNhcAAAoEgqAAFhdTQVNxVwAACgRipwAACgSipvAHQAAKCNInIAAKBFKgDgKiIA/gACYWxydksVURVuFXMVcgByAG2gtyEAoDwpeQCAAWV2dwBYFWUVaRVxAHACXxUAAAAAYxVyAGUA4wAXFXUA4wAZFWUAZQAAoM4iZSJkZ2UAAKDPImUAbgA7gKQApEBlI2Fycm93AAABbHJ7FX8V5SFmdACgtiFpImdodAAAoLchZQDkAG0VAAFjaYsVkRVvAG4AaQBuAPQAkwFuAHQAAKAxImwiY3R5AACgLSOACUFIYWJjZGVmaGlqbG9yc3R1d3oAuBW7Fb8V1RXgFegV+RUKFhUWHxZUFlcWZRbFFtsW7xb7FgUXChdyAPIAtAJhAHIAAKBlKQACZ2xyc8YVyhXOFdAV5yFlcgCgICDlIXRoAKA4IfIA9QxoAHagECAAoKMiawHZFd4VYSJyb3cAAKAPKWEA4wBfAgABYXnkFecV8iFvbg9hNGQAoUYhYW/tFfQVAAFnciEC8RVyAACgyiF0InNlcQAAoHcqgAFnbG0A/xUCFgUWO4CwALBAdABhALRjcCJ0eXYAAKCxKQABaXIOFhIW8yFodACgfykA4DXYId1hAHIAAAFschsWHRYAoMMhAKDCIYACYWVnc3YAKBauAjYWOhY+Fm0AAKHEIm9zLhY0Fm4AZABzoMQi9SFpdACgZiZhIm1tYQDdY2kAbgAAoPIiAKH3AGlvQxZRFmQAZQAAgfcAO29KFksW90BuI3RpbWVzAACgxyJuAPgAUBZjAHkAUmRjAG8CXhYAAAAAYhZyAG4AAKAeI28AcAAAoA0jgAJscHR1dwBuFnEWdRaSFp4W7CFhciRgZgAA4DXYVd0AotkCZW1wc30WhBaJFo0WcQBkoFAibwB0AACgUSJpIm51cwAAoDgi7CF1cwCgFCLxInVhcmUAoKEiYgBsAGUAYgBhAHIAdwBlAGQAZwDlANcAbgCAAWFkaAClFqoWtBZyAHIAbwD3APUMbwB3AG4AYQByAHIAbwB3APMA8xVhI3Jwb29uAAABbHK8FsAWZQBmAPQAHBZpAGcAaAD0AB4WYgHJFs8WawBhAHIAbwD3AJILbwLUFgAAAADYFnIAbgAAoB8jbwBwAACgDCOAAWNvdADhFukW7BYAAXJ55RboFgDgNdi53FVkbAAAoPYp8iFvaxFhAAFkcvMW9xZvAHQAAKDxImkA5qC/JVsSAAFhaP8WAhdyAPIANQNhAPIA1wvhIm5nbGUAoKYpAAFjaQ4XEBd5AF9k5yJyYXJyAKD/JwAJRGFjZGVmZ2xtbm9wcXJzdHV4MRc4F0YXWxcyBF4XaRd5F40XrBe0F78X2RcVGCEYLRg1GEAYAAFEbzUXgRZvAPQA+BUAAWNzPBdCF3UAdABlADuA6QDpQPQhZXIAoG4qAAJhaW95TRdQF1YXWhfyIW9uG2FyAGOgViI7gOoA6kDsIW9uAKBVIk1kbwB0ABdhAAFEcmIXZhdvAHQAAKBSIgDgNdgi3XKhmipuF3QXYQB2AGUAO4DoAOhAZKCWKm8AdAAAoJgqgKGZKmlscwCAF4UXhxfuInRlcnMAoOcjAKATIWSglSpvAHQAAKCXKoABYXBzAJMXlheiF2MAcgATYXQAeQBzogUinxcAAAAAoRdlAHQAAKAFInAAMaADIDMBqRerFwCgBCAAoAUgAAFnc7AXsRdLYXAAAKACIAABZ3C4F7sXbwBuABlhZgAA4DXYVt2AAWFscwDFF8sXzxdyAHOg1SJsAACg4yl1AHMAAKBxKmkAAKG1A2x21RfYF28AbgC1Y/VjAAJjc3V24BfoF/0XEBgAAWlv5BdWF3IAYwAAoFYiaQLuFwAAAADwF+0ADQThIW50AAFnbPUX+Rd0AHIAAKCWKuUhc3MAoJUqgAFhZWkAAxgGGAoYbABzAD1gcwB0AACgXyJ2AESgYSJEAACgeCrwImFyc2wAoOUpAAFEYRkYHRhvAHQAAKBTInIAcgAAoHEpgAFjZGkAJxgqGO0XcgAAoC8hbwD0AIwCAAFhaDEYMhi3YzuA8ADwQAABbXI5GD0YbAA7gOsA60BvAACgrCCAAWNpcABGGEgYSxhsACFgcwD0ACwEAAFlb08YVxhjAHQAYQB0AGkAbwDuABoEbgBlAG4AdABpAGEAbADlADME4Ql1GAAAgRgAAIMYiBgAAAAAoRilGAAAqhgAALsYvhjRGAAA1xgnGWwAbABpAG4AZwBkAG8AdABzAGUA8QBlF3kARGRtImFsZQAAoEAmgAFpbHIAjRiRGJ0Y7CFpZwCgA/tpApcYAAAAAJoYZwAAoAD7aQBnAACgBPsA4DXYI93sIWlnAKAB++whaWcA4GYAagCAAWFsdACvGLIYthh0AACgbSZpAGcAAKAC+24AcwAAoLElbwBmAJJh8AHCGAAAxhhmAADgNdhX3QABYWvJGMwYbADsAGsEdqDUIgCg2SphI3J0aW50AACgDSoAAWFv2hgiGQABY3PeGB8ZsQPnGP0YBRkSGRUZAAAdGbID7xjyGPQY9xj5GAAA+xg7gL0AvUAAoFMhO4C8ALxAAKBVIQCgWSEAoFshswEBGQAAAxkAoFQhAKBWIbQCCxkOGQAAAAAQGTuAvgC+QACgVyEAoFwhNQAAoFghtgEZGQAAGxkAoFohAKBdITgAAKBeIWwAAKBEIHcAbgAAoCIjYwByAADgNdi73IAIRWFiY2RlZmdpamxub3JzdHYARhlKGVoZXhlmGWkZkhmWGZkZnRmgGa0ZxhnLGc8Z4BkjGmygZyIAoIwqgAFjbXAAUBlTGVgZ9SF0ZfVhbQBhAOSgswM6FgCghipyImV2ZQAfYQABaXliGWUZcgBjAB1hM2RvAHQAIWGAoWUibHFzAMYEcBl6GfGhZSLOBAAAdhlsAGEAbgD0AN8EgKF+KmNkbACBGYQZjBljAACgqSpvAHQAb6CAKmyggioAoIQqZeDbIgD+cwAAoJQqcgAA4DXYJN3noGsirATtIWVsAKA3IWMAeQBTZIChdyJFYWoApxmpGasZAKCSKgCgpSoAoKQqAAJFYWVztBm2Gb0ZwhkAoGkicABwoIoq8iFveACgiipxoIgq8aCIKrUZaQBtAACg5yJwAGYAAOA12FjdYQB2AOUAYwIAAWNp0xnWGXIAAKAKIW0AAKFzImVs3BneGQCgjioAoJAqAIM+ADtjZGxxco0E6xn0GfgZ/BkBGgABY2nvGfEZAKCnKnIAAKB6Km8AdAAAoNci0CFhcgCglSl1ImVzdAAAoHwqgAJhZGVscwAKGvQZFhrVBCAa8AEPGgAAFBpwAHIAbwD4AFkZcgAAoHgpcQAAAWxxxAQbGmwAZQBzAPMASRlpAO0A5AQAAWVuJxouGnIjdG5lcXEAAOBpIgD+xQAsGgAFQWFiY2Vma29zeUAaQxpmGmoabRqDGocalhrCGtMacgDyAMwCAAJpbG1yShpOGlAaVBpyAHMA8ABxD2YAvWBpAGwA9AASBQABZHJYGlsaYwB5AEpkAKGUIWN3YBpkGmkAcgAAoEgpAKCtIWEAcgAAoA8h6SFyYyVhgAFhbHIAcxp7Gn8a8iF0c3WgZSZpAHQAAKBlJuwhaXAAoCYg4yFvbgCguSJyAADgNdgl3XMAAAFld4wakRphInJvdwAAoCUpYSJyb3cAAKAmKYACYW1vcHIAnxqjGqcauhq+GnIAcgAAoP8h9CFodACgOyJrAAABbHKsGrMaZSRmdGFycm93AACgqSHpJGdodGFycm93AKCqIWYAAOA12Fnd4iFhcgCgFSCAAWNsdADIGswa0BpyAADgNdi93GEAcwDoAGka8iFvaydhAAFicNca2xr1IWxsAKBDIOghZW4AoBAg4Qr2GgAA/RoAAAgbExsaGwAAIRs7GwAAAAA+G2IbmRuVG6sbAACyG80b0htjAHUAdABlADuA7QDtQAChYyBpeQEbBhtyAGMAO4DuAO5AOGQAAWN4CxsNG3kANWRjAGwAO4ChAKFAAAFmcssCFhsA4DXYJt1yAGEAdgBlADuA7ADsQIChSCFpbm8AJxsyGzYbAAFpbisbLxtuAHQAAKAMKnQAAKAtIuYhaW4AoNwpdABhAACgKSHsIWlnM2GAAWFvcABDG1sbXhuAAWNndABJG0sbWRtyACthgAFlbHAAcQVRG1UbaQBuAOUAyAVhAHIA9AByBWgAMWFmAACgtyJlAGQAtWEAoggiY2ZvdGkbbRt1G3kb4SFyZQCgBSFpAG4AdKAeImkAZQAAoN0pZABvAPQAWxsAoisiY2VscIEbhRuPG5QbYQBsAACguiIAAWdyiRuNG2UAcgDzACMQ4wCCG2EicmhrAACgFyryIW9kAKA8KgACY2dwdJ8boRukG6gbeQBRZG8AbgAvYWYAAOA12FrdYQC5Y3UAZQBzAHQAO4C/AL9AAAFjabUbuRtyAADgNdi+3G4AAKIIIkVkc3bCG8QbyBvQAwCg+SJvAHQAAKD1Inag9CIAoPMiaaBiIOwhZGUpYesB1hsAANkbYwB5AFZkbAA7gO8A70AAA2NmbW9zdeYb7hvyG/Ub+hsFHAABaXnqG+0bcgBjADVhOWRyAADgNdgn3eEhdGg3YnAAZgAA4DXYW93jAf8bAAADHHIAAOA12L/c8iFjeVhk6yFjeVRkAARhY2ZnaGpvcxUcGhwiHCYcKhwtHDAcNRzwIXBhdqC6A/BjAAFleR4cIRzkIWlsN2E6ZHIAAOA12CjdciJlZW4AOGFjAHkARWRjAHkAXGRwAGYAAOA12FzdYwByAADgNdjA3IALQUJFSGFiY2RlZmdoamxtbm9wcnN0dXYAXhxtHHEcdRx5HN8cBx0dHTwd3B3tHfEdAR4EHh0eLB5FHrwewx7hHgkfPR9LH4ABYXJ0AGQcZxxpHHIA8gBvB/IAxQLhIWlsAKAbKeEhcnIAoA4pZ6BmIgCgiyphAHIAAKBiKWMJjRwAAJAcAACVHAAAAAAAAAAAAACZHJwcAACmHKgcrRwAANIc9SF0ZTph7SJwdHl2AKC0KXIAYQDuAFoG4iFkYbtjZwAAoegnZGyhHKMcAKCRKeUAiwYAoIUqdQBvADuAqwCrQHIAgKOQIWJmaGxwc3QAuhy/HMIcxBzHHMoczhxmoOQhcwAAoB8pcwAAoB0p6wCyGnAAAKCrIWwAAKA5KWkAbQAAoHMpbAAAoKIhAKGrKmFl1hzaHGkAbAAAoBkpc6CtKgDgrSoA/oABYWJyAOUc6RztHHIAcgAAoAwpcgBrAACgcicAAWFr8Rz4HGMAAAFla/Yc9xx7YFtgAAFlc/wc/hwAoIspbAAAAWR1Ax0FHQCgjykAoI0pAAJhZXV5Dh0RHRodHB3yIW9uPmEAAWRpFR0YHWkAbAA8YewAowbiAPccO2QAAmNxcnMkHScdLB05HWEAAKA2KXUAbwDyoBwgqhEAAWR1MB00HeghYXIAoGcpcyJoYXIAAKBLKWgAAKCyIQCiZCJmZ3FzRB1FB5Qdnh10AIACYWhscnQATh1WHWUdbB2NHXIicm93AHSgkCFhAOkAzxxhI3Jwb29uAAABZHVeHWId7yF3bgCgvSFwAACgvCHlJGZ0YXJyb3dzAKDHIWkiZ2h0AIABYWhzAHUdex2DHXIicm93APOglCGdBmEAcgBwAG8AbwBuAPMAzgtxAHUAaQBnAGEAcgByAG8A9wBlGugkcmVldGltZXMAoMsi8aFkIk0HAACaHWwAYQBuAPQAXgcAon0qY2Rnc6YdqR2xHbcdYwAAoKgqbwB0AG+gfypyoIEqAKCDKmXg2iIA/nMAAKCTKoACYWRlZ3MAwB3GHcod1h3ZHXAAcAByAG8A+ACmHG8AdAAAoNYicQAAAWdxzx3SHXQA8gBGB2cAdADyAHQcdADyAFMHaQDtAGMHgAFpbHIA4h3mHeod8yFodACgfClvAG8A8gDKBgDgNdgp3UWgdiIAoJEqYQH1Hf4dcgAAAWR1YB35HWygvCEAoGopbABrAACghCVjAHkAWWQAomoiYWNodAweDx4VHhkecgDyAGsdbwByAG4AZQDyAGAW4SFyZACgaylyAGkAAKD6JQABaW8hHiQe5CFvdEBh9SFzdGGgsCPjIWhlAKCwIwACRWFlczMeNR48HkEeAKBoInAAcKCJKvIhb3gAoIkqcaCHKvGghyo0HmkAbQAAoOYiAARhYm5vcHR3elIeXB5fHoUelh6mHqsetB4AAW5yVh5ZHmcAAKDsJ3IAAKD9IXIA6wCwBmcAgAFsbXIAZh52Hnse5SFmdAABYXKIB2weaQBnAGgAdABhAHIAcgBvAPcAkwfhInBzdG8AoPwnaQBnAGgAdABhAHIAcgBvAPcAmgdwI2Fycm93AAABbHKNHpEeZQBmAPQAxhxpImdodAAAoKwhgAFhZmwAnB6fHqIecgAAoIUpAOA12F3ddQBzAACgLSppIm1lcwAAoDQqYQGvHrMecwB0AACgFyLhAIoOZaHKJbkeRhLuIWdlAKDKJWEAcgBsoCgAdAAAoJMpgAJhY2htdADMHs8e1R7bHt0ecgDyAJ0GbwByAG4AZQDyANYWYQByAGSgyyEAoG0pAKAOIHIAaQAAoL8iAANhY2hpcXTrHu8e1QfzHv0eBh/xIXVvAKA5IHIAAOA12MHcbQDloXIi+h4AAPweAKCNKgCgjyoAAWJ19xwBH28AcqAYIACgGiDyIW9rQmEAhDwAO2NkaGlscXJCBhcfxh0gHyQfKB8sHzEfAAFjaRsfHR8AoKYqcgAAoHkqcgBlAOUAkx3tIWVzAKDJIuEhcnIAoHYpdSJlc3QAAKB7KgABUGk1HzkfYQByAACglillocMlAgdfEnIAAAFkdUIfRx9zImhhcgAAoEop6CFhcgCgZikAAWVuTx9WH3IjdG5lcXEAAOBoIgD+xQBUHwAHRGFjZGVmaGlsbm9wc3VuH3Ifoh+rH68ftx+7H74f5h/uH/MfBwj/HwsgxCFvdACgOiIAAmNscHJ5H30fiR+eH3IAO4CvAK9AAAFldIEfgx8AoEImZaAgJ3MAZQAAoCAnc6CmIXQAbwCAoaYhZGx1AJQfmB+cH28AdwDuAHkDZQBmAPQA6gbwAOkO6yFlcgCgriUAAW95ph+qH+0hbWEAoCkqPGThIXNoAKAUIOElc3VyZWRhbmdsZQCgISJyAADgNdgq3W8AAKAnIYABY2RuAMQfyR/bH3IAbwA7gLUAtUBhoiMi0B8AANMf1x9zAPQAKxFpAHIAAKDwKm8AdAA7gLcAt0B1AHMA4qESIh4TAADjH3WgOCIAoCoqYwHqH+0fcAAAoNsq8gB+GnAAbAB1APMACAgAAWRw9x/7H+UhbHMAoKciZgAA4DXYXt0AAWN0AyAHIHIAAOA12MLc8CFvcwCgPiJsobwDECAVIPQiaW1hcACguCJhAPAAEyAADEdMUlZhYmNkZWZnaGlqbG1vcHJzdHV2dzwgRyBmIG0geSCqILgg2iDeIBEhFSEyIUMhTSFQIZwhnyHSIQAiIyKLIrEivyIUIwABZ3RAIEMgAODZIjgD9uBrItIgBwmAAWVsdABNIF8gYiBmAHQAAAFhclMgWCByInJvdwAAoM0h6SRnaHRhcnJvdwCgziEA4NgiOAP24Goi0iBfCekkZ2h0YXJyb3cAoM8hAAFEZHEgdSDhIXNoAKCvIuEhc2gAoK4igAJiY25wdACCIIYgiSCNIKIgbABhAACgByL1IXRlRGFnAADgICLSIACiSSJFaW9wlSCYIJwgniAA4HAqOANkAADgSyI4A3MASWFyAG8A+AAyCnUAcgBhoG4mbADzoG4mmwjzAa8gAACzIHAAO4CgAKBAbQBwAOXgTiI4AyoJgAJhZW91eQDBIMogzSDWINkg8AHGIAAAyCAAoEMqbwBuAEhh5CFpbEZhbgBnAGSgRyJvAHQAAOBtKjgDcAAAoEIqPWThIXNoAKATIACjYCJBYWRxc3jpIO0g+SD+IAIhDCFyAHIAAKDXIXIAAAFocvIg9SBrAACgJClvoJch9wAGD28AdAAA4FAiOAN1AGkA9gC7CAABZWkGIQohYQByAACgKCntAN8I6SFzdPOgBCLlCHIAAOA12CvdAAJFZXN0/wgcISshLiHxoXEiIiEAABMJ8aFxIgAJAAAnIWwAYQBuAPQAEwlpAO0AGQlyoG8iAKBvIoABQWFwADghOyE/IXIA8gBeIHIAcgAAoK4hYQByAACg8ipzogsiSiEAAAAAxwtkoPwiAKD6ImMAeQBaZIADQUVhZGVzdABcIV8hYiFmIWkhkyGWIXIA8gBXIADgZiI4A3IAcgAAoJohcgAAoCUggKFwImZxcwBwIYQhjiF0AAABYXJ1IXohcgByAG8A9wBlIWkAZwBoAHQAYQByAHIAbwD3AD4h8aFwImAhAACKIWwAYQBuAPQAZwlz4H0qOAMAoG4iaQDtAG0JcqBuImkA5aDqIkUJaQDkADoKAAFwdKMhpyFmAADgNdhf3YCBrAA7aW4AriGvIcchrEBuAIChCSJFZHYAtyG6Ib8hAOD5IjgDbwB0AADg9SI4A+EB1gjEIcYhAKD3IgCg9iJpAHagDCLhAagJzyHRIQCg/iIAoP0igAFhb3IA2CHsIfEhcgCAoSYiYXN0AOAh5SHpIWwAbABlAOwAywhsAADg/SrlIADgAiI4A2wiaW50AACgFCrjoYAi9yEAAPohdQDlAJsJY+CvKjgDZaCAIvEAkwkAAkFhaXQHIgoiFyIeInIA8gBsIHIAcgAAoZshY3cRIhQiAOAzKTgDAOCdITgDZyRodGFycm93AACgmyFyAGkA5aDrIr4JgANjaGltcHF1AC8iPCJHIpwhTSJQIloigKGBImNlcgA2Iv0JOSJ1AOUABgoA4DXYw9zvIXJ0bQKdIQAAAABEImEAcgDhAOEhbQBloEEi8aBEIiYKYQDyAMsIcwB1AAABYnBWIlgi5QDUCeUA3wmAAWJjcABgInMieCKAoYQiRWVzAGci7glqIgDgxSo4A2UAdABl4IIi0iBxAPGgiCJoImMAZaCBIvEA/gmAoYUiRWVzAH8iFgqCIgDgxio4A2UAdABl4IMi0iBxAPGgiSKAIgACZ2lscpIilCKaIpwi7AAMCWwAZABlADuA8QDxQOcAWwlpI2FuZ2xlAAABbHKkIqoi5SFmdGWg6iLxAEUJaSJnaHQAZaDrIvEAvgltoL0DAKEjAGVzuCK8InIAbwAAoBYhcAAAoAcggARESGFkZ2lscnMAziLSItYi2iLeIugi7SICIw8j4SFzaACgrSLhIXJyAKAEKXAAAOBNItIg4SFzaACgrCIAAWV04iLlIgDgZSLSIADgPgDSIG4iZmluAACg3imAAUFldADzIvci+iJyAHIAAKACKQDgZCLSIHLgPADSIGkAZQAA4LQi0iAAAUF0BiMKI3IAcgAAoAMp8iFpZQDgtSLSIGkAbQAA4Dwi0iCAAUFhbgAaIx4jKiNyAHIAAKDWIXIAAAFociMjJiNrAACgIylvoJYh9wD/DuUhYXIAoCcpUxJqFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVCMAAF4jaSN/I4IjjSOeI8AUAAAAAKYjwCMAANoj3yMAAO8jHiQvJD8kRCQAAWNzVyNsFHUAdABlADuA8wDzQAABaXlhI2cjcgBjoJoiO4D0APRAPmSAAmFiaW9zAHEjdCN3I3EBeiNzAOgAdhTsIWFjUWF2AACgOCrvIWxkAKC8KewhaWdTYQABY3KFI4kjaQByAACgvykA4DXYLN1vA5QjAAAAAJYjAACcI24A22JhAHYAZQA7gPIA8kAAoMEpAAFibaEjjAphAHIAAKC1KQACYWNpdKwjryO6I70jcgDyAFkUAAFpcrMjtiNyAACgvinvIXNzAKC7KW4A5QDZCgCgwCmAAWFlaQDFI8gjyyNjAHIATWFnAGEAyWOAAWNkbgDRI9Qj1iPyIW9uv2MAoLYpdQDzAHgBcABmAADgNdhg3YABYWVsAOQj5yPrI3IAAKC3KXIAcAAAoLkpdQDzAHwBAKMoImFkaW9zdvkj/CMPJBMkFiQbJHIA8gBeFIChXSplZm0AAyQJJAwkcgBvoDQhZgAAoDQhO4CqAKpAO4C6ALpA5yFvZgCgtiJyAACgVipsIm9wZQAAoFcqAKBbKoABY2xvACMkJSQrJPIACCRhAHMAaAA7gPgA+EBsAACgmCJpAGwBMyQ4JGQAZQA7gPUA9UBlAHMAYaCXInMAAKA2Km0AbAA7gPYA9kDiIWFyAKA9I+EKXiQAAHokAAB8JJQkAACYJKkkAAAAALUkEQsAAPAkAAAAAAQleiUAAIMlcgCAoSUiYXN0AGUkbyQBCwCBtgA7bGokayS2QGwAZQDsABgDaQJ1JAAAAAB4JG0AAKDzKgCg/Sp5AD9kcgCAAmNpbXB0AIUkiCSLJJkSjyRuAHQAJWBvAGQALmBpAGwAAKAwIOUhbmsAoDEgcgAA4DXYLd2AAWltbwCdJKAkpCR2oMYD1WNtAGEA9AD+B24AZQAAoA4m9KHAA64kAAC0JGMjaGZvcmsAAKDUItZjAAFhdbgkxCRuAAABY2u9JMIkawBooA8hAKAOIfYAaRpzAACkKwBhYmNkZW1zdNMkIRPXJNsk4STjJOck6yTjIWlyAKAjKmkAcgAAoCIqAAFvdYsW3yQAoCUqAKByKm4AO4CxALFAaQBtAACgJip3AG8AAKAnKoABaXB1APUk+iT+JO4idGludACgFSpmAADgNdhh3W4AZAA7gKMAo0CApHoiRWFjZWlub3N1ABMlFSUYJRslTCVRJVklSSV1JQCgsypwAACgtyp1AOUAPwtjoK8qgKJ6ImFjZW5zACclLSU0JTYlSSVwAHAAcgBvAPgAFyV1AHIAbAB5AGUA8QA/C/EAOAuAAWFlcwA8JUElRSXwInByb3gAoLkqcQBxAACgtSppAG0AAKDoImkA7QBEC20AZQDzoDIgIguAAUVhcwBDJVclRSXwAEAlgAFkZnAATwtfJXElgAFhbHMAZSVpJW0l7CFhcgCgLiPpIW5lAKASI/UhcmYAoBMjdKAdIu8AWQvyIWVsAKCwIgABY2l9JYElcgAA4DXYxdzIY24iY3NwAACgCCAAA2Zpb3BzdZElKxuVJZolnyWkJXIAAOA12C7dcABmAADgNdhi3XIiaW1lAACgVyBjAHIAAOA12MbcgAFhZW8AqiW6JcAldAAAAWVpryW2JXIAbgBpAG8AbgDzABkFbgB0AACgFipzAHQAZaA/APEACRj0AG0LgApBQkhhYmNkZWZoaWxtbm9wcnN0dXgA4yXyJfYl+iVpJpAmpia9JtUm5ib4JlonaCdxJ3UnnietJ7EnyCfiJ+cngAFhcnQA6SXsJe4lcgDyAJkM8gD6AuEhaWwAoBwpYQByAPIA3BVhAHIAAKBkKYADY2RlbnFydAAGJhAmEyYYJiYmKyZaJgABZXUKJg0mAOA9IjEDdABlAFVhaQDjACAN7SJwdHl2AKCzKWcAgKHpJ2RlbAAgJiImJCYAoJIpAKClKeUA9wt1AG8AO4C7ALtAcgAApZIhYWJjZmhscHN0dz0mQCZFJkcmSiZMJk4mUSZVJlgmcAAAoHUpZqDlIXMAAKAgKQCgMylzAACgHinrALka8ACVHmwAAKBFKWkAbQAAoHQpbAAAoKMhAKCdIQABYWleJmImaQBsAACgGilvAG6gNiJhAGwA8wB2C4ABYWJyAG8mciZ2JnIA8gAvEnIAawAAoHMnAAFha3omgSZjAAABZWt/JoAmfWBdYAABZXOFJocmAKCMKWwAAAFkdYwmjiYAoI4pAKCQKQACYWV1eZcmmiajJqUm8iFvbllhAAFkaZ4moSZpAGwAV2HsAA8M4gCAJkBkAAJjbHFzrSawJrUmuiZhAACgNylkImhhcgAAoGkpdQBvAPKgHSCjAWgAAKCzIYABYWNnAMMm0iaUC2wAgKEcIWlwcwDLJs4migxuAOUAoAxhAHIA9ADaC3QAAKCtJYABaWxyANsm3ybjJvMhaHQAoH0pbwBvAPIANgwA4DXYL90AAWFv6ib1JnIAAAFkde8m8SYAoMEhbKDAIQCgbCl2oMED8WOAAWducwD+Jk4nUCdoAHQAAANhaGxyc3QKJxInISc1Jz0nRydyInJvdwB0oJIhYQDpAFYmYSNycG9vbgAAAWR1GiceJ28AdwDuAPAmcAAAoMAh5SFmdAABYWgnJy0ncgByAG8AdwDzAAkMYQByAHAAbwBvAG4A8wATBGklZ2h0YXJyb3dzAACgySFxAHUAaQBnAGEAcgByAG8A9wBZJugkcmVldGltZXMAoMwiZwDaYmkAbgBnAGQAbwB0AHMAZQDxABwYgAFhaG0AYCdjJ2YncgDyAAkMYQDyABMEAKAPIG8idXN0AGGgsSPjIWhlAKCxI+0haWQAoO4qAAJhYnB0fCeGJ4knmScAAW5ygCeDJ2cAAKDtJ3IAAKD+IXIA6wAcDIABYWZsAI8nkieVJ3IAAKCGKQDgNdhj3XUAcwAAoC4qaSJtZXMAAKA1KgABYXCiJ6gncgBnoCkAdAAAoJQp7yJsaW50AKASKmEAcgDyADwnAAJhY2hxuCe8J6EMwCfxIXVvAKA6IHIAAOA12MfcAAFidYAmxCdvAPKgGSCoAYABaGlyAM4n0ifWJ3IAZQDlAE0n7SFlcwCgyiJpAIChuSVlZmwAXAxjEt4n9CFyaQCgzinsInVoYXIAoGgpAKAeIWENBSgJKA0oSyhVKIYoAACLKLAoAAAAAOMo5ygAABApJCkxKW0pcSmHKaYpAACYKgAAAACxKmMidXRlAFthcQB1AO8ABR+ApHsiRWFjZWlucHN5ABwoHignKCooLygyKEEoRihJKACgtCrwASMoAAAlKACguCpvAG4AYWF1AOUAgw1koLAqaQBsAF9hcgBjAF1hgAFFYXMAOCg6KD0oAKC2KnAAAKC6KmkAbQAAoOki7yJsaW50AKATKmkA7QCIDUFkbwB0AGKixSKRFgAAAABTKACgZiqAA0FhY21zdHgAYChkKG8ocyh1KHkogihyAHIAAKDYIXIAAAFocmkoayjrAJAab6CYIfcAzAd0ADuApwCnQGkAO2D3IWFyAKApKW0AAAFpbn4ozQBuAHUA8wDOAHQAAKA2J3IA7+A12DDdIxkAAmFjb3mRKJUonSisKHIAcAAAoG8mAAFoeZkonChjAHkASWRIZHIAdABtAqUoAAAAAKgoaQDkAFsPYQByAGEA7ABsJDuArQCtQAABZ22zKLsobQBhAAChwwNmdroouijCY4CjPCJkZWdsbnByAMgozCjPKNMo1yjaKN4obwB0AACgairxoEMiCw5FoJ4qAKCgKkWgnSoAoJ8qZQAAoEYi7CF1cwCgJCrhIXJyAKByKWEAcgDyAPwMAAJhZWl07Sj8KAEpCCkAAWxz8Sj4KGwAcwBlAHQAbQDpAH8oaABwAACgMyrwImFyc2wAoOQpAAFkbFoPBSllAACgIyNloKoqc6CsKgDgrCoA/oABZmxwABUpGCkfKfQhY3lMZGKgLwBhoMQpcgAAoD8jZgAA4DXYZN1hAAABZHIoKRcDZQBzAHWgYCZpAHQAAKBgJoABY3N1ADYpRilhKQABYXU6KUApcABzoJMiAOCTIgD+cABzoJQiAOCUIgD+dQAAAWJwSylWKQChjyJlcz4NUCllAHQAZaCPIvEAPw0AoZAiZXNIDVspZQB0AGWgkCLxAEkNAKGhJWFmZilbBHIAZQFrKVwEAKChJWEAcgDyAAMNAAJjZW10dyl7KX8pgilyAADgNdjI3HQAbQDuAM4AaQDsAAYpYQByAOYAVw0AAWFyiimOKXIA5qAGJhESAAFhbpIpoylpImdodAAAAWVwmSmgKXAAcwBpAGwAbwDuANkXaADpAKAkcwCvYIACYmNtbnAArin8KY4NJSooKgCkgiJFZGVtbnByc7wpvinCKcgpzCnUKdgp3CkAoMUqbwB0AACgvSpkoIYibwB0AACgwyr1IWx0AKDBKgABRWXQKdIpAKDLKgCgiiLsIXVzAKC/KuEhcnIAoHkpgAFlaXUA4inxKfQpdAAAoYIiZW7oKewpcQDxoIYivSllAHEA8aCKItEpbQAAoMcqAAFicPgp+ikAoNUqAKDTKmMAgKJ7ImFjZW5zAAcqDSoUKhYqRihwAHAAcgBvAPgAIyh1AHIAbAB5AGUA8QCDDfEAfA2AAWFlcwAcKiIqPShwAHAAcgBvAPgAPChxAPEAOShnAACgaiYApoMiMTIzRWRlaGxtbnBzPCo/KkIqRSpHKlIqWCpjKmcqaypzKncqO4C5ALlAO4CyALJAO4CzALNAAKDGKgABb3NLKk4qdAAAoL4qdQBiAACg2CpkoIcibwB0AACgxCpzAAABb3VdKmAqbAAAoMknYgAAoNcq4SFycgCgeyn1IWx0AKDCKgABRWVvKnEqAKDMKgCgiyLsIXVzAKDAKoABZWl1AH0qjCqPKnQAAKGDImVugyqHKnEA8aCHIkYqZQBxAPGgiyJwKm0AAKDIKgABYnCTKpUqAKDUKgCg1iqAAUFhbgCdKqEqrCpyAHIAAKDZIXIAAAFocqYqqCrrAJUab6CZIfcAxQf3IWFyAKAqKWwAaQBnADuA3wDfQOELzyrZKtwq6SrsKvEqAAD1KjQrAAAAAAAAAAAAAEwrbCsAAHErvSsAAAAAAADRK3IC1CoAAAAA2CrnIWV0AKAWI8RjcgDrAOUKgAFhZXkA4SrkKucq8iFvbmVh5CFpbGNhQmRvAPQAIg5sInJlYwAAoBUjcgAA4DXYMd0AAmVpa2/7KhIrKCsuK/IBACsAAAkrZQAAATRm6g0EK28AcgDlAOsNYQBzorgDECsAAAAAEit5AG0A0WMAAWNuFislK2sAAAFhcxsrIStwAHAAcgBvAPgAFw5pAG0AAKA8InMA8AD9DQABYXMsKyEr8AAXDnIAbgA7gP4A/kDsATgrOyswG2QA5QBnAmUAcwCAgdcAO2JkAEMrRCtJK9dAYaCgInIAAKAxKgCgMCqAAWVwcwBRK1MraSvhAAkh4qKkIlsrXysAAAAAYytvAHQAAKA2I2kAcgAAoPEqb+A12GXdcgBrAACg2irhAHgociJpbWUAAKA0IIABYWlwAHYreSu3K2QA5QC+DYADYWRlbXBzdACFK6MrmiunK6wrsCuzK24iZ2xlAACitSVkbHFykCuUK5ornCvvIXduAKC/JeUhZnRloMMl8QACBwCgXCJpImdodABloLkl8QBdDG8AdAAAoOwlaSJudXMAAKA6KuwhdXMAoDkqYgAAoM0p6SFtZQCgOyrlInppdW0AoOIjgAFjaHQAwivKK80rAAFyecYrySsA4DXYydxGZGMAeQBbZPIhb2tnYQABaW/UK9creAD0ANERaCJlYWQAAAFsct4r5ytlAGYAdABhAHIAcgBvAPcAXQbpJGdodGFycm93AKCgIQAJQUhhYmNkZmdobG1vcHJzdHV3CiwNLBEsHSwnLDEsQCxLLFIsYix6LIQsjyzLLOgs7Sz/LAotcgDyAAkDYQByAACgYykAAWNyFSwbLHUAdABlADuA+gD6QPIACQ1yAOMBIywAACUseQBeZHYAZQBtYQABaXkrLDAscgBjADuA+wD7QENkgAFhYmgANyw6LD0scgDyANEO7CFhY3FhYQDyAOAOAAFpckQsSCzzIWh0AKB+KQDgNdgy3XIAYQB2AGUAO4D5APlAYQFWLF8scgAAAWxyWixcLACgvyEAoL4hbABrAACggCUAAWN0Zix2LG8CbCwAAAAAcyxyAG4AZaAcI3IAAKAcI28AcAAAoA8jcgBpAACg+CUAAWFsfiyBLGMAcgBrYTuAqACoQAABZ3CILIssbwBuAHNhZgAA4DXYZt0AA2FkaGxzdZksniynLLgsuyzFLHIAcgBvAPcACQ1vAHcAbgBhAHIAcgBvAPcA2A5hI3Jwb29uAAABbHKvLLMsZQBmAPQAWyxpAGcAaAD0AF0sdQDzAKYOaQAAocUDaGzBLMIs0mNvAG4AxWPwI2Fycm93cwCgyCGAAWNpdADRLOEs5CxvAtcsAAAAAN4scgBuAGWgHSNyAACgHSNvAHAAAKAOI24AZwBvYXIAaQAAoPklYwByAADgNdjK3IABZGlyAPMs9yz6LG8AdAAAoPAi7CFkZWlhaQBmoLUlAKC0JQABYW0DLQYtcgDyAMosbAA7gPwA/EDhIm5nbGUAoKcpgAdBQkRhY2RlZmxub3Byc3oAJy0qLTAtNC2bLZ0toS2/LcMtxy3TLdgt3C3gLfwtcgDyABADYQByAHag6CoAoOkqYQBzAOgA/gIAAW5yOC08LechcnQAoJwpgANla25wcnN0AJkpSC1NLVQtXi1iLYItYQBwAHAA4QAaHG8AdABoAGkAbgDnAKEXgAFoaXIAoSmzJFotbwBwAPQAdCVooJUh7wD4JgABaXVmLWotZwBtAOEAuygAAWJwbi14LXMjZXRuZXEAceCKIgD+AODLKgD+cyNldG5lcQBx4IsiAP4A4MwqAP4AAWhyhi2KLWUAdADhABIraSNhbmdsZQAAAWxyki2WLeUhZnQAoLIiaSJnaHQAAKCzInkAMmThIXNoAKCiIoABZWxyAKcttC24LWKiKCKuLQAAAACyLWEAcgAAoLsicQAAoFoi7CFpcACg7iIAAWJ0vC1eD2EA8gBfD3IAAOA12DPddAByAOkAlS1zAHUAAAFicM0t0C0A4IIi0iAA4IMi0iBwAGYAAOA12GfdcgBvAPAAWQt0AHIA6QCaLQABY3XkLegtcgAA4DXYy9wAAWJw7C30LW4AAAFFZXUt8S0A4IoiAP5uAAABRWV/LfktAOCLIgD+6SJnemFnAKCaKYADY2Vmb3BycwANLhAuJS4pLiMuLi40LukhcmN1YQABZGkULiEuAAFiZxguHC5hAHIAAKBfKmUAcaAnIgCgWSLlIXJwAKAYIXIAAOA12DTdcABmAADgNdho3WWgQCJhAHQA6ABqD2MAcgAA4DXYzNzjCuQRUC4AAFQuAABYLmIuAAAAAGMubS5wLnQuAAAAAIguki4AAJouJxIqEnQAcgDpAB0ScgAA4DXYNd0AAUFhWy5eLnIA8gDnAnIA8gCTB75jAAFBYWYuaS5yAPIA4AJyAPIAjAdhAPAAeh5pAHMAAKD7IoABZHB0APgReS6DLgABZmx9LoAuAOA12GnddQDzAP8RaQBtAOUABBIAAUFhiy6OLnIA8gDuAnIA8gCaBwABY3GVLgoScgAA4DXYzdwAAXB0nS6hLmwAdQDzACUScgDpACASAARhY2VmaW9zdbEuvC7ELsguzC7PLtQu2S5jAAABdXm2LrsudABlADuA/QD9QE9kAAFpecAuwy5yAGMAd2FLZG4AO4ClAKVAcgAA4DXYNt1jAHkAV2RwAGYAAOA12GrdYwByAADgNdjO3AABY23dLt8ueQBOZGwAO4D/AP9AAAVhY2RlZmhpb3N38y73Lv8uAi8MLxAvEy8YLx0vIi9jInV0ZQB6YQABYXn7Lv4u8iFvbn5hN2RvAHQAfGEAAWV0Bi8KL3QAcgDmAB8QYQC2Y3IAAOA12DfdYwB5ADZk5yJyYXJyAKDdIXAAZgAA4DXYa91jAHIAAOA12M/cAAFqbiYvKC8AoA0gagAAoAwg");

    // Generated using scripts/write-decode-map.ts
    const xmlDecodeTree = /* #__PURE__ */ decodeBase64("AAJhZ2xxBwARABMAFQBtAg0AAAAAAA8AcAAmYG8AcwAnYHQAPmB0ADxg9SFvdCJg");

    /**
     * Bit flags & masks for the binary trie encoding used for entity decoding.
     *
     * Bit layout (16 bits total):
     * 15..14 VALUE_LENGTH   (+1 encoding; 0 => no value)
     * 13     FLAG13.        If valueLength>0: semicolon required flag (implicit ';').
     *                       If valueLength==0: compact run flag.
     * 12..7  BRANCH_LENGTH  Branch length (0 => single branch in 6..0 if jumpOffset==char) OR run length (when compact run)
     * 6..0   JUMP_TABLE     Jump offset (jump table) OR single-branch char code OR first run char
     */
    var BinTrieFlags$1;
    (function (BinTrieFlags) {
        BinTrieFlags[BinTrieFlags["VALUE_LENGTH"] = 49152] = "VALUE_LENGTH";
        BinTrieFlags[BinTrieFlags["FLAG13"] = 8192] = "FLAG13";
        BinTrieFlags[BinTrieFlags["BRANCH_LENGTH"] = 8064] = "BRANCH_LENGTH";
        BinTrieFlags[BinTrieFlags["JUMP_TABLE"] = 127] = "JUMP_TABLE";
    })(BinTrieFlags$1 || (BinTrieFlags$1 = {}));

    var CharCodes$2;
    (function (CharCodes) {
        CharCodes[CharCodes["NUM"] = 35] = "NUM";
        CharCodes[CharCodes["SEMI"] = 59] = "SEMI";
        CharCodes[CharCodes["EQUALS"] = 61] = "EQUALS";
        CharCodes[CharCodes["ZERO"] = 48] = "ZERO";
        CharCodes[CharCodes["NINE"] = 57] = "NINE";
        CharCodes[CharCodes["LOWER_A"] = 97] = "LOWER_A";
        CharCodes[CharCodes["LOWER_F"] = 102] = "LOWER_F";
        CharCodes[CharCodes["LOWER_X"] = 120] = "LOWER_X";
        CharCodes[CharCodes["LOWER_Z"] = 122] = "LOWER_Z";
        CharCodes[CharCodes["UPPER_A"] = 65] = "UPPER_A";
        CharCodes[CharCodes["UPPER_F"] = 70] = "UPPER_F";
        CharCodes[CharCodes["UPPER_Z"] = 90] = "UPPER_Z";
    })(CharCodes$2 || (CharCodes$2 = {}));
    /** Bit that needs to be set to convert an upper case ASCII character to lower case */
    const TO_LOWER_BIT$1 = 32;
    function isNumber$1(code) {
        return code >= CharCodes$2.ZERO && code <= CharCodes$2.NINE;
    }
    function isHexadecimalCharacter$1(code) {
        return ((code >= CharCodes$2.UPPER_A && code <= CharCodes$2.UPPER_F) ||
            (code >= CharCodes$2.LOWER_A && code <= CharCodes$2.LOWER_F));
    }
    function isAsciiAlphaNumeric$2(code) {
        return ((code >= CharCodes$2.UPPER_A && code <= CharCodes$2.UPPER_Z) ||
            (code >= CharCodes$2.LOWER_A && code <= CharCodes$2.LOWER_Z) ||
            isNumber$1(code));
    }
    /**
     * Checks if the given character is a valid end character for an entity in an attribute.
     *
     * Attribute values that aren't terminated properly aren't parsed, and shouldn't lead to a parser error.
     * See the example in https://html.spec.whatwg.org/multipage/parsing.html#named-character-reference-state
     */
    function isEntityInAttributeInvalidEnd$1(code) {
        return code === CharCodes$2.EQUALS || isAsciiAlphaNumeric$2(code);
    }
    var EntityDecoderState$1;
    (function (EntityDecoderState) {
        EntityDecoderState[EntityDecoderState["EntityStart"] = 0] = "EntityStart";
        EntityDecoderState[EntityDecoderState["NumericStart"] = 1] = "NumericStart";
        EntityDecoderState[EntityDecoderState["NumericDecimal"] = 2] = "NumericDecimal";
        EntityDecoderState[EntityDecoderState["NumericHex"] = 3] = "NumericHex";
        EntityDecoderState[EntityDecoderState["NamedEntity"] = 4] = "NamedEntity";
    })(EntityDecoderState$1 || (EntityDecoderState$1 = {}));
    var DecodingMode$1;
    (function (DecodingMode) {
        /** Entities in text nodes that can end with any character. */
        DecodingMode[DecodingMode["Legacy"] = 0] = "Legacy";
        /** Only allow entities terminated with a semicolon. */
        DecodingMode[DecodingMode["Strict"] = 1] = "Strict";
        /** Entities in attributes have limitations on ending characters. */
        DecodingMode[DecodingMode["Attribute"] = 2] = "Attribute";
    })(DecodingMode$1 || (DecodingMode$1 = {}));
    /**
     * Token decoder with support of writing partial entities.
     */
    let EntityDecoder$1 = class EntityDecoder {
        constructor(
        /** The tree used to decode entities. */
        // biome-ignore lint/correctness/noUnusedPrivateClassMembers: False positive
        decodeTree, 
        /**
         * The function that is called when a codepoint is decoded.
         *
         * For multi-byte named entities, this will be called multiple times,
         * with the second codepoint, and the same `consumed` value.
         *
         * @param codepoint The decoded codepoint.
         * @param consumed The number of bytes consumed by the decoder.
         */
        emitCodePoint, 
        /** An object that is used to produce errors. */
        errors) {
            this.decodeTree = decodeTree;
            this.emitCodePoint = emitCodePoint;
            this.errors = errors;
            /** The current state of the decoder. */
            this.state = EntityDecoderState$1.EntityStart;
            /** Characters that were consumed while parsing an entity. */
            this.consumed = 1;
            /**
             * The result of the entity.
             *
             * Either the result index of a numeric entity, or the codepoint of a
             * numeric entity.
             */
            this.result = 0;
            /** The current index in the decode tree. */
            this.treeIndex = 0;
            /** The number of characters that were consumed in excess. */
            this.excess = 1;
            /** The mode in which the decoder is operating. */
            this.decodeMode = DecodingMode$1.Strict;
            /** The number of characters that have been consumed in the current run. */
            this.runConsumed = 0;
        }
        /** Resets the instance to make it reusable. */
        startEntity(decodeMode) {
            this.decodeMode = decodeMode;
            this.state = EntityDecoderState$1.EntityStart;
            this.result = 0;
            this.treeIndex = 0;
            this.excess = 1;
            this.consumed = 1;
            this.runConsumed = 0;
        }
        /**
         * Write an entity to the decoder. This can be called multiple times with partial entities.
         * If the entity is incomplete, the decoder will return -1.
         *
         * Mirrors the implementation of `getDecoder`, but with the ability to stop decoding if the
         * entity is incomplete, and resume when the next string is written.
         *
         * @param input The string containing the entity (or a continuation of the entity).
         * @param offset The offset at which the entity begins. Should be 0 if this is not the first call.
         * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
         */
        write(input, offset) {
            switch (this.state) {
                case EntityDecoderState$1.EntityStart: {
                    if (input.charCodeAt(offset) === CharCodes$2.NUM) {
                        this.state = EntityDecoderState$1.NumericStart;
                        this.consumed += 1;
                        return this.stateNumericStart(input, offset + 1);
                    }
                    this.state = EntityDecoderState$1.NamedEntity;
                    return this.stateNamedEntity(input, offset);
                }
                case EntityDecoderState$1.NumericStart: {
                    return this.stateNumericStart(input, offset);
                }
                case EntityDecoderState$1.NumericDecimal: {
                    return this.stateNumericDecimal(input, offset);
                }
                case EntityDecoderState$1.NumericHex: {
                    return this.stateNumericHex(input, offset);
                }
                case EntityDecoderState$1.NamedEntity: {
                    return this.stateNamedEntity(input, offset);
                }
            }
        }
        /**
         * Switches between the numeric decimal and hexadecimal states.
         *
         * Equivalent to the `Numeric character reference state` in the HTML spec.
         *
         * @param input The string containing the entity (or a continuation of the entity).
         * @param offset The current offset.
         * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
         */
        stateNumericStart(input, offset) {
            if (offset >= input.length) {
                return -1;
            }
            if ((input.charCodeAt(offset) | TO_LOWER_BIT$1) === CharCodes$2.LOWER_X) {
                this.state = EntityDecoderState$1.NumericHex;
                this.consumed += 1;
                return this.stateNumericHex(input, offset + 1);
            }
            this.state = EntityDecoderState$1.NumericDecimal;
            return this.stateNumericDecimal(input, offset);
        }
        /**
         * Parses a hexadecimal numeric entity.
         *
         * Equivalent to the `Hexademical character reference state` in the HTML spec.
         *
         * @param input The string containing the entity (or a continuation of the entity).
         * @param offset The current offset.
         * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
         */
        stateNumericHex(input, offset) {
            while (offset < input.length) {
                const char = input.charCodeAt(offset);
                if (isNumber$1(char) || isHexadecimalCharacter$1(char)) {
                    // Convert hex digit to value (0-15); 'a'/'A' -> 10.
                    const digit = char <= CharCodes$2.NINE
                        ? char - CharCodes$2.ZERO
                        : (char | TO_LOWER_BIT$1) - CharCodes$2.LOWER_A + 10;
                    this.result = this.result * 16 + digit;
                    this.consumed++;
                    offset++;
                }
                else {
                    return this.emitNumericEntity(char, 3);
                }
            }
            return -1; // Incomplete entity
        }
        /**
         * Parses a decimal numeric entity.
         *
         * Equivalent to the `Decimal character reference state` in the HTML spec.
         *
         * @param input The string containing the entity (or a continuation of the entity).
         * @param offset The current offset.
         * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
         */
        stateNumericDecimal(input, offset) {
            while (offset < input.length) {
                const char = input.charCodeAt(offset);
                if (isNumber$1(char)) {
                    this.result = this.result * 10 + (char - CharCodes$2.ZERO);
                    this.consumed++;
                    offset++;
                }
                else {
                    return this.emitNumericEntity(char, 2);
                }
            }
            return -1; // Incomplete entity
        }
        /**
         * Validate and emit a numeric entity.
         *
         * Implements the logic from the `Hexademical character reference start
         * state` and `Numeric character reference end state` in the HTML spec.
         *
         * @param lastCp The last code point of the entity. Used to see if the
         *               entity was terminated with a semicolon.
         * @param expectedLength The minimum number of characters that should be
         *                       consumed. Used to validate that at least one digit
         *                       was consumed.
         * @returns The number of characters that were consumed.
         */
        emitNumericEntity(lastCp, expectedLength) {
            var _a;
            // Ensure we consumed at least one digit.
            if (this.consumed <= expectedLength) {
                (_a = this.errors) === null || _a === void 0 ? void 0 : _a.absenceOfDigitsInNumericCharacterReference(this.consumed);
                return 0;
            }
            // Figure out if this is a legit end of the entity
            if (lastCp === CharCodes$2.SEMI) {
                this.consumed += 1;
            }
            else if (this.decodeMode === DecodingMode$1.Strict) {
                return 0;
            }
            this.emitCodePoint(replaceCodePoint$1(this.result), this.consumed);
            if (this.errors) {
                if (lastCp !== CharCodes$2.SEMI) {
                    this.errors.missingSemicolonAfterCharacterReference();
                }
                this.errors.validateNumericCharacterReference(this.result);
            }
            return this.consumed;
        }
        /**
         * Parses a named entity.
         *
         * Equivalent to the `Named character reference state` in the HTML spec.
         *
         * @param input The string containing the entity (or a continuation of the entity).
         * @param offset The current offset.
         * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
         */
        stateNamedEntity(input, offset) {
            const { decodeTree } = this;
            let current = decodeTree[this.treeIndex];
            // The length is the number of bytes of the value, including the current byte.
            let valueLength = (current & BinTrieFlags$1.VALUE_LENGTH) >> 14;
            while (offset < input.length) {
                // Handle compact runs (possibly inline): valueLength == 0 and SEMI_REQUIRED bit set.
                if (valueLength === 0 && (current & BinTrieFlags$1.FLAG13) !== 0) {
                    const runLength = (current & BinTrieFlags$1.BRANCH_LENGTH) >> 7; /* 2..63 */
                    // If we are starting a run, check the first char.
                    if (this.runConsumed === 0) {
                        const firstChar = current & BinTrieFlags$1.JUMP_TABLE;
                        if (input.charCodeAt(offset) !== firstChar) {
                            return this.result === 0
                                ? 0
                                : this.emitNotTerminatedNamedEntity();
                        }
                        offset++;
                        this.excess++;
                        this.runConsumed++;
                    }
                    // Check remaining characters in the run.
                    while (this.runConsumed < runLength) {
                        if (offset >= input.length) {
                            return -1;
                        }
                        const charIndexInPacked = this.runConsumed - 1;
                        const packedWord = decodeTree[this.treeIndex + 1 + (charIndexInPacked >> 1)];
                        const expectedChar = charIndexInPacked % 2 === 0
                            ? packedWord & 0xff
                            : (packedWord >> 8) & 0xff;
                        if (input.charCodeAt(offset) !== expectedChar) {
                            this.runConsumed = 0;
                            return this.result === 0
                                ? 0
                                : this.emitNotTerminatedNamedEntity();
                        }
                        offset++;
                        this.excess++;
                        this.runConsumed++;
                    }
                    this.runConsumed = 0;
                    this.treeIndex += 1 + (runLength >> 1);
                    current = decodeTree[this.treeIndex];
                    valueLength = (current & BinTrieFlags$1.VALUE_LENGTH) >> 14;
                }
                if (offset >= input.length)
                    break;
                const char = input.charCodeAt(offset);
                /*
                 * Implicit semicolon handling for nodes that require a semicolon but
                 * don't have an explicit ';' branch stored in the trie. If we have
                 * a value on the current node, it requires a semicolon, and the
                 * current input character is a semicolon, emit the entity using the
                 * current node (without descending further).
                 */
                if (char === CharCodes$2.SEMI &&
                    valueLength !== 0 &&
                    (current & BinTrieFlags$1.FLAG13) !== 0) {
                    return this.emitNamedEntityData(this.treeIndex, valueLength, this.consumed + this.excess);
                }
                this.treeIndex = determineBranch$1(decodeTree, current, this.treeIndex + Math.max(1, valueLength), char);
                if (this.treeIndex < 0) {
                    return this.result === 0 ||
                        // If we are parsing an attribute
                        (this.decodeMode === DecodingMode$1.Attribute &&
                            // We shouldn't have consumed any characters after the entity,
                            (valueLength === 0 ||
                                // And there should be no invalid characters.
                                isEntityInAttributeInvalidEnd$1(char)))
                        ? 0
                        : this.emitNotTerminatedNamedEntity();
                }
                current = decodeTree[this.treeIndex];
                valueLength = (current & BinTrieFlags$1.VALUE_LENGTH) >> 14;
                // If the branch is a value, store it and continue
                if (valueLength !== 0) {
                    // If the entity is terminated by a semicolon, we are done.
                    if (char === CharCodes$2.SEMI) {
                        return this.emitNamedEntityData(this.treeIndex, valueLength, this.consumed + this.excess);
                    }
                    // If we encounter a non-terminated (legacy) entity while parsing strictly, then ignore it.
                    if (this.decodeMode !== DecodingMode$1.Strict &&
                        (current & BinTrieFlags$1.FLAG13) === 0) {
                        this.result = this.treeIndex;
                        this.consumed += this.excess;
                        this.excess = 0;
                    }
                }
                // Increment offset & excess for next iteration
                offset++;
                this.excess++;
            }
            return -1;
        }
        /**
         * Emit a named entity that was not terminated with a semicolon.
         *
         * @returns The number of characters consumed.
         */
        emitNotTerminatedNamedEntity() {
            var _a;
            const { result, decodeTree } = this;
            const valueLength = (decodeTree[result] & BinTrieFlags$1.VALUE_LENGTH) >> 14;
            this.emitNamedEntityData(result, valueLength, this.consumed);
            (_a = this.errors) === null || _a === void 0 ? void 0 : _a.missingSemicolonAfterCharacterReference();
            return this.consumed;
        }
        /**
         * Emit a named entity.
         *
         * @param result The index of the entity in the decode tree.
         * @param valueLength The number of bytes in the entity.
         * @param consumed The number of characters consumed.
         *
         * @returns The number of characters consumed.
         */
        emitNamedEntityData(result, valueLength, consumed) {
            const { decodeTree } = this;
            this.emitCodePoint(valueLength === 1
                ? decodeTree[result] &
                    ~(BinTrieFlags$1.VALUE_LENGTH | BinTrieFlags$1.FLAG13)
                : decodeTree[result + 1], consumed);
            if (valueLength === 3) {
                // For multi-byte values, we need to emit the second byte.
                this.emitCodePoint(decodeTree[result + 2], consumed);
            }
            return consumed;
        }
        /**
         * Signal to the parser that the end of the input was reached.
         *
         * Remaining data will be emitted and relevant errors will be produced.
         *
         * @returns The number of characters consumed.
         */
        end() {
            var _a;
            switch (this.state) {
                case EntityDecoderState$1.NamedEntity: {
                    // Emit a named entity if we have one.
                    return this.result !== 0 &&
                        (this.decodeMode !== DecodingMode$1.Attribute ||
                            this.result === this.treeIndex)
                        ? this.emitNotTerminatedNamedEntity()
                        : 0;
                }
                // Otherwise, emit a numeric entity if we have one.
                case EntityDecoderState$1.NumericDecimal: {
                    return this.emitNumericEntity(0, 2);
                }
                case EntityDecoderState$1.NumericHex: {
                    return this.emitNumericEntity(0, 3);
                }
                case EntityDecoderState$1.NumericStart: {
                    (_a = this.errors) === null || _a === void 0 ? void 0 : _a.absenceOfDigitsInNumericCharacterReference(this.consumed);
                    return 0;
                }
                case EntityDecoderState$1.EntityStart: {
                    // Return 0 if we have no entity.
                    return 0;
                }
            }
        }
    };
    /**
     * Determines the branch of the current node that is taken given the current
     * character. This function is used to traverse the trie.
     *
     * @param decodeTree The trie.
     * @param current The current node.
     * @param nodeIdx The index right after the current node and its value.
     * @param char The current character.
     * @returns The index of the next node, or -1 if no branch is taken.
     */
    function determineBranch$1(decodeTree, current, nodeIndex, char) {
        const branchCount = (current & BinTrieFlags$1.BRANCH_LENGTH) >> 7;
        const jumpOffset = current & BinTrieFlags$1.JUMP_TABLE;
        // Case 1: Single branch encoded in jump offset
        if (branchCount === 0) {
            return jumpOffset !== 0 && char === jumpOffset ? nodeIndex : -1;
        }
        // Case 2: Multiple branches encoded in jump table
        if (jumpOffset) {
            const value = char - jumpOffset;
            return value < 0 || value >= branchCount
                ? -1
                : decodeTree[nodeIndex + value] - 1;
        }
        // Case 3: Multiple branches encoded in packed dictionary (two keys per uint16)
        const packedKeySlots = (branchCount + 1) >> 1;
        /*
         * Treat packed keys as a virtual sorted array of length `branchCount`.
         * Key(i) = low byte for even i, high byte for odd i in slot i>>1.
         */
        let lo = 0;
        let hi = branchCount - 1;
        while (lo <= hi) {
            const mid = (lo + hi) >>> 1;
            const slot = mid >> 1;
            const packed = decodeTree[nodeIndex + slot];
            const midKey = (packed >> ((mid & 1) * 8)) & 0xff;
            if (midKey < char) {
                lo = mid + 1;
            }
            else if (midKey > char) {
                hi = mid - 1;
            }
            else {
                return decodeTree[nodeIndex + packedKeySlots + mid];
            }
        }
        return -1;
    }

    var CharCodes$1;
    (function (CharCodes) {
        CharCodes[CharCodes["Tab"] = 9] = "Tab";
        CharCodes[CharCodes["NewLine"] = 10] = "NewLine";
        CharCodes[CharCodes["FormFeed"] = 12] = "FormFeed";
        CharCodes[CharCodes["CarriageReturn"] = 13] = "CarriageReturn";
        CharCodes[CharCodes["Space"] = 32] = "Space";
        CharCodes[CharCodes["ExclamationMark"] = 33] = "ExclamationMark";
        CharCodes[CharCodes["Number"] = 35] = "Number";
        CharCodes[CharCodes["Amp"] = 38] = "Amp";
        CharCodes[CharCodes["SingleQuote"] = 39] = "SingleQuote";
        CharCodes[CharCodes["DoubleQuote"] = 34] = "DoubleQuote";
        CharCodes[CharCodes["Dash"] = 45] = "Dash";
        CharCodes[CharCodes["Slash"] = 47] = "Slash";
        CharCodes[CharCodes["Zero"] = 48] = "Zero";
        CharCodes[CharCodes["Nine"] = 57] = "Nine";
        CharCodes[CharCodes["Semi"] = 59] = "Semi";
        CharCodes[CharCodes["Lt"] = 60] = "Lt";
        CharCodes[CharCodes["Eq"] = 61] = "Eq";
        CharCodes[CharCodes["Gt"] = 62] = "Gt";
        CharCodes[CharCodes["Questionmark"] = 63] = "Questionmark";
        CharCodes[CharCodes["UpperA"] = 65] = "UpperA";
        CharCodes[CharCodes["LowerA"] = 97] = "LowerA";
        CharCodes[CharCodes["UpperF"] = 70] = "UpperF";
        CharCodes[CharCodes["LowerF"] = 102] = "LowerF";
        CharCodes[CharCodes["UpperZ"] = 90] = "UpperZ";
        CharCodes[CharCodes["LowerZ"] = 122] = "LowerZ";
        CharCodes[CharCodes["LowerX"] = 120] = "LowerX";
        CharCodes[CharCodes["OpeningSquareBracket"] = 91] = "OpeningSquareBracket";
    })(CharCodes$1 || (CharCodes$1 = {}));
    /** All the states the tokenizer can be in. */
    var State$1;
    (function (State) {
        State[State["Text"] = 1] = "Text";
        State[State["BeforeTagName"] = 2] = "BeforeTagName";
        State[State["InTagName"] = 3] = "InTagName";
        State[State["InSelfClosingTag"] = 4] = "InSelfClosingTag";
        State[State["BeforeClosingTagName"] = 5] = "BeforeClosingTagName";
        State[State["InClosingTagName"] = 6] = "InClosingTagName";
        State[State["AfterClosingTagName"] = 7] = "AfterClosingTagName";
        // Attributes
        State[State["BeforeAttributeName"] = 8] = "BeforeAttributeName";
        State[State["InAttributeName"] = 9] = "InAttributeName";
        State[State["AfterAttributeName"] = 10] = "AfterAttributeName";
        State[State["BeforeAttributeValue"] = 11] = "BeforeAttributeValue";
        State[State["InAttributeValueDq"] = 12] = "InAttributeValueDq";
        State[State["InAttributeValueSq"] = 13] = "InAttributeValueSq";
        State[State["InAttributeValueNq"] = 14] = "InAttributeValueNq";
        // Declarations
        State[State["BeforeDeclaration"] = 15] = "BeforeDeclaration";
        State[State["InDeclaration"] = 16] = "InDeclaration";
        // Processing instructions
        State[State["InProcessingInstruction"] = 17] = "InProcessingInstruction";
        // Comments & CDATA
        State[State["BeforeComment"] = 18] = "BeforeComment";
        State[State["CDATASequence"] = 19] = "CDATASequence";
        State[State["InSpecialComment"] = 20] = "InSpecialComment";
        State[State["InCommentLike"] = 21] = "InCommentLike";
        // Special tags
        State[State["BeforeSpecialS"] = 22] = "BeforeSpecialS";
        State[State["BeforeSpecialT"] = 23] = "BeforeSpecialT";
        State[State["SpecialStartSequence"] = 24] = "SpecialStartSequence";
        State[State["InSpecialTag"] = 25] = "InSpecialTag";
        State[State["InEntity"] = 26] = "InEntity";
    })(State$1 || (State$1 = {}));
    function isWhitespace$2(c) {
        return (c === CharCodes$1.Space ||
            c === CharCodes$1.NewLine ||
            c === CharCodes$1.Tab ||
            c === CharCodes$1.FormFeed ||
            c === CharCodes$1.CarriageReturn);
    }
    function isEndOfTagSection(c) {
        return c === CharCodes$1.Slash || c === CharCodes$1.Gt || isWhitespace$2(c);
    }
    function isASCIIAlpha(c) {
        return ((c >= CharCodes$1.LowerA && c <= CharCodes$1.LowerZ) ||
            (c >= CharCodes$1.UpperA && c <= CharCodes$1.UpperZ));
    }
    var QuoteType;
    (function (QuoteType) {
        QuoteType[QuoteType["NoValue"] = 0] = "NoValue";
        QuoteType[QuoteType["Unquoted"] = 1] = "Unquoted";
        QuoteType[QuoteType["Single"] = 2] = "Single";
        QuoteType[QuoteType["Double"] = 3] = "Double";
    })(QuoteType || (QuoteType = {}));
    /**
     * Sequences used to match longer strings.
     *
     * We don't have `Script`, `Style`, or `Title` here. Instead, we re-use the *End
     * sequences with an increased offset.
     */
    const Sequences = {
        Cdata: new Uint8Array([0x43, 0x44, 0x41, 0x54, 0x41, 0x5b]), // CDATA[
        CdataEnd: new Uint8Array([0x5d, 0x5d, 0x3e]), // ]]>
        CommentEnd: new Uint8Array([0x2d, 0x2d, 0x3e]), // `-->`
        ScriptEnd: new Uint8Array([0x3c, 0x2f, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74]), // `</script`
        StyleEnd: new Uint8Array([0x3c, 0x2f, 0x73, 0x74, 0x79, 0x6c, 0x65]), // `</style`
        TitleEnd: new Uint8Array([0x3c, 0x2f, 0x74, 0x69, 0x74, 0x6c, 0x65]), // `</title`
        TextareaEnd: new Uint8Array([
            0x3c, 0x2f, 0x74, 0x65, 0x78, 0x74, 0x61, 0x72, 0x65, 0x61,
        ]), // `</textarea`
        XmpEnd: new Uint8Array([0x3c, 0x2f, 0x78, 0x6d, 0x70]), // `</xmp`
    };
    let Tokenizer$1 = class Tokenizer {
        constructor({ xmlMode = false, decodeEntities = true, }, cbs) {
            this.cbs = cbs;
            /** The current state the tokenizer is in. */
            this.state = State$1.Text;
            /** The read buffer. */
            this.buffer = "";
            /** The beginning of the section that is currently being read. */
            this.sectionStart = 0;
            /** The index within the buffer that we are currently looking at. */
            this.index = 0;
            /** The start of the last entity. */
            this.entityStart = 0;
            /** Some behavior, eg. when decoding entities, is done while we are in another state. This keeps track of the other state type. */
            this.baseState = State$1.Text;
            /** For special parsing behavior inside of script and style tags. */
            this.isSpecial = false;
            /** Indicates whether the tokenizer has been paused. */
            this.running = true;
            /** The offset of the current buffer. */
            this.offset = 0;
            this.currentSequence = undefined;
            this.sequenceIndex = 0;
            this.xmlMode = xmlMode;
            this.decodeEntities = decodeEntities;
            this.entityDecoder = new EntityDecoder$1(xmlMode ? xmlDecodeTree : htmlDecodeTree$1, (cp, consumed) => this.emitCodePoint(cp, consumed));
        }
        reset() {
            this.state = State$1.Text;
            this.buffer = "";
            this.sectionStart = 0;
            this.index = 0;
            this.baseState = State$1.Text;
            this.currentSequence = undefined;
            this.running = true;
            this.offset = 0;
        }
        write(chunk) {
            this.offset += this.buffer.length;
            this.buffer = chunk;
            this.parse();
        }
        end() {
            if (this.running)
                this.finish();
        }
        pause() {
            this.running = false;
        }
        resume() {
            this.running = true;
            if (this.index < this.buffer.length + this.offset) {
                this.parse();
            }
        }
        stateText(c) {
            if (c === CharCodes$1.Lt ||
                (!this.decodeEntities && this.fastForwardTo(CharCodes$1.Lt))) {
                if (this.index > this.sectionStart) {
                    this.cbs.ontext(this.sectionStart, this.index);
                }
                this.state = State$1.BeforeTagName;
                this.sectionStart = this.index;
            }
            else if (this.decodeEntities && c === CharCodes$1.Amp) {
                this.startEntity();
            }
        }
        stateSpecialStartSequence(c) {
            const isEnd = this.sequenceIndex === this.currentSequence.length;
            const isMatch = isEnd
                ? // If we are at the end of the sequence, make sure the tag name has ended
                    isEndOfTagSection(c)
                : // Otherwise, do a case-insensitive comparison
                    (c | 0x20) === this.currentSequence[this.sequenceIndex];
            if (!isMatch) {
                this.isSpecial = false;
            }
            else if (!isEnd) {
                this.sequenceIndex++;
                return;
            }
            this.sequenceIndex = 0;
            this.state = State$1.InTagName;
            this.stateInTagName(c);
        }
        /** Look for an end tag. For <title> tags, also decode entities. */
        stateInSpecialTag(c) {
            if (this.sequenceIndex === this.currentSequence.length) {
                if (c === CharCodes$1.Gt || isWhitespace$2(c)) {
                    const endOfText = this.index - this.currentSequence.length;
                    if (this.sectionStart < endOfText) {
                        // Spoof the index so that reported locations match up.
                        const actualIndex = this.index;
                        this.index = endOfText;
                        this.cbs.ontext(this.sectionStart, endOfText);
                        this.index = actualIndex;
                    }
                    this.isSpecial = false;
                    this.sectionStart = endOfText + 2; // Skip over the `</`
                    this.stateInClosingTagName(c);
                    return; // We are done; skip the rest of the function.
                }
                this.sequenceIndex = 0;
            }
            if ((c | 0x20) === this.currentSequence[this.sequenceIndex]) {
                this.sequenceIndex += 1;
            }
            else if (this.sequenceIndex === 0) {
                if (this.currentSequence === Sequences.TitleEnd) {
                    // We have to parse entities in <title> tags.
                    if (this.decodeEntities && c === CharCodes$1.Amp) {
                        this.startEntity();
                    }
                }
                else if (this.fastForwardTo(CharCodes$1.Lt)) {
                    // Outside of <title> tags, we can fast-forward.
                    this.sequenceIndex = 1;
                }
            }
            else {
                // If we see a `<`, set the sequence index to 1; useful for eg. `<</script>`.
                this.sequenceIndex = Number(c === CharCodes$1.Lt);
            }
        }
        stateCDATASequence(c) {
            if (c === Sequences.Cdata[this.sequenceIndex]) {
                if (++this.sequenceIndex === Sequences.Cdata.length) {
                    this.state = State$1.InCommentLike;
                    this.currentSequence = Sequences.CdataEnd;
                    this.sequenceIndex = 0;
                    this.sectionStart = this.index + 1;
                }
            }
            else {
                this.sequenceIndex = 0;
                this.state = State$1.InDeclaration;
                this.stateInDeclaration(c); // Reconsume the character
            }
        }
        /**
         * When we wait for one specific character, we can speed things up
         * by skipping through the buffer until we find it.
         *
         * @returns Whether the character was found.
         */
        fastForwardTo(c) {
            while (++this.index < this.buffer.length + this.offset) {
                if (this.buffer.charCodeAt(this.index - this.offset) === c) {
                    return true;
                }
            }
            /*
             * We increment the index at the end of the `parse` loop,
             * so set it to `buffer.length - 1` here.
             *
             * TODO: Refactor `parse` to increment index before calling states.
             */
            this.index = this.buffer.length + this.offset - 1;
            return false;
        }
        /**
         * Comments and CDATA end with `-->` and `]]>`.
         *
         * Their common qualities are:
         * - Their end sequences have a distinct character they start with.
         * - That character is then repeated, so we have to check multiple repeats.
         * - All characters but the start character of the sequence can be skipped.
         */
        stateInCommentLike(c) {
            if (c === this.currentSequence[this.sequenceIndex]) {
                if (++this.sequenceIndex === this.currentSequence.length) {
                    if (this.currentSequence === Sequences.CdataEnd) {
                        this.cbs.oncdata(this.sectionStart, this.index, 2);
                    }
                    else {
                        this.cbs.oncomment(this.sectionStart, this.index, 2);
                    }
                    this.sequenceIndex = 0;
                    this.sectionStart = this.index + 1;
                    this.state = State$1.Text;
                }
            }
            else if (this.sequenceIndex === 0) {
                // Fast-forward to the first character of the sequence
                if (this.fastForwardTo(this.currentSequence[0])) {
                    this.sequenceIndex = 1;
                }
            }
            else if (c !== this.currentSequence[this.sequenceIndex - 1]) {
                // Allow long sequences, eg. --->, ]]]>
                this.sequenceIndex = 0;
            }
        }
        /**
         * HTML only allows ASCII alpha characters (a-z and A-Z) at the beginning of a tag name.
         *
         * XML allows a lot more characters here (@see https://www.w3.org/TR/REC-xml/#NT-NameStartChar).
         * We allow anything that wouldn't end the tag.
         */
        isTagStartChar(c) {
            return this.xmlMode ? !isEndOfTagSection(c) : isASCIIAlpha(c);
        }
        startSpecial(sequence, offset) {
            this.isSpecial = true;
            this.currentSequence = sequence;
            this.sequenceIndex = offset;
            this.state = State$1.SpecialStartSequence;
        }
        stateBeforeTagName(c) {
            if (c === CharCodes$1.ExclamationMark) {
                this.state = State$1.BeforeDeclaration;
                this.sectionStart = this.index + 1;
            }
            else if (c === CharCodes$1.Questionmark) {
                this.state = State$1.InProcessingInstruction;
                this.sectionStart = this.index + 1;
            }
            else if (this.isTagStartChar(c)) {
                const lower = c | 0x20;
                this.sectionStart = this.index;
                if (this.xmlMode) {
                    this.state = State$1.InTagName;
                }
                else if (lower === Sequences.ScriptEnd[2]) {
                    this.state = State$1.BeforeSpecialS;
                }
                else if (lower === Sequences.TitleEnd[2] ||
                    lower === Sequences.XmpEnd[2]) {
                    this.state = State$1.BeforeSpecialT;
                }
                else {
                    this.state = State$1.InTagName;
                }
            }
            else if (c === CharCodes$1.Slash) {
                this.state = State$1.BeforeClosingTagName;
            }
            else {
                this.state = State$1.Text;
                this.stateText(c);
            }
        }
        stateInTagName(c) {
            if (isEndOfTagSection(c)) {
                this.cbs.onopentagname(this.sectionStart, this.index);
                this.sectionStart = -1;
                this.state = State$1.BeforeAttributeName;
                this.stateBeforeAttributeName(c);
            }
        }
        stateBeforeClosingTagName(c) {
            if (isWhitespace$2(c)) ;
            else if (c === CharCodes$1.Gt) {
                this.state = State$1.Text;
            }
            else {
                this.state = this.isTagStartChar(c)
                    ? State$1.InClosingTagName
                    : State$1.InSpecialComment;
                this.sectionStart = this.index;
            }
        }
        stateInClosingTagName(c) {
            if (c === CharCodes$1.Gt || isWhitespace$2(c)) {
                this.cbs.onclosetag(this.sectionStart, this.index);
                this.sectionStart = -1;
                this.state = State$1.AfterClosingTagName;
                this.stateAfterClosingTagName(c);
            }
        }
        stateAfterClosingTagName(c) {
            // Skip everything until ">"
            if (c === CharCodes$1.Gt || this.fastForwardTo(CharCodes$1.Gt)) {
                this.state = State$1.Text;
                this.sectionStart = this.index + 1;
            }
        }
        stateBeforeAttributeName(c) {
            if (c === CharCodes$1.Gt) {
                this.cbs.onopentagend(this.index);
                if (this.isSpecial) {
                    this.state = State$1.InSpecialTag;
                    this.sequenceIndex = 0;
                }
                else {
                    this.state = State$1.Text;
                }
                this.sectionStart = this.index + 1;
            }
            else if (c === CharCodes$1.Slash) {
                this.state = State$1.InSelfClosingTag;
            }
            else if (!isWhitespace$2(c)) {
                this.state = State$1.InAttributeName;
                this.sectionStart = this.index;
            }
        }
        stateInSelfClosingTag(c) {
            if (c === CharCodes$1.Gt) {
                this.cbs.onselfclosingtag(this.index);
                this.state = State$1.Text;
                this.sectionStart = this.index + 1;
                this.isSpecial = false; // Reset special state, in case of self-closing special tags
            }
            else if (!isWhitespace$2(c)) {
                this.state = State$1.BeforeAttributeName;
                this.stateBeforeAttributeName(c);
            }
        }
        stateInAttributeName(c) {
            if (c === CharCodes$1.Eq || isEndOfTagSection(c)) {
                this.cbs.onattribname(this.sectionStart, this.index);
                this.sectionStart = this.index;
                this.state = State$1.AfterAttributeName;
                this.stateAfterAttributeName(c);
            }
        }
        stateAfterAttributeName(c) {
            if (c === CharCodes$1.Eq) {
                this.state = State$1.BeforeAttributeValue;
            }
            else if (c === CharCodes$1.Slash || c === CharCodes$1.Gt) {
                this.cbs.onattribend(QuoteType.NoValue, this.sectionStart);
                this.sectionStart = -1;
                this.state = State$1.BeforeAttributeName;
                this.stateBeforeAttributeName(c);
            }
            else if (!isWhitespace$2(c)) {
                this.cbs.onattribend(QuoteType.NoValue, this.sectionStart);
                this.state = State$1.InAttributeName;
                this.sectionStart = this.index;
            }
        }
        stateBeforeAttributeValue(c) {
            if (c === CharCodes$1.DoubleQuote) {
                this.state = State$1.InAttributeValueDq;
                this.sectionStart = this.index + 1;
            }
            else if (c === CharCodes$1.SingleQuote) {
                this.state = State$1.InAttributeValueSq;
                this.sectionStart = this.index + 1;
            }
            else if (!isWhitespace$2(c)) {
                this.sectionStart = this.index;
                this.state = State$1.InAttributeValueNq;
                this.stateInAttributeValueNoQuotes(c); // Reconsume token
            }
        }
        handleInAttributeValue(c, quote) {
            if (c === quote ||
                (!this.decodeEntities && this.fastForwardTo(quote))) {
                this.cbs.onattribdata(this.sectionStart, this.index);
                this.sectionStart = -1;
                this.cbs.onattribend(quote === CharCodes$1.DoubleQuote
                    ? QuoteType.Double
                    : QuoteType.Single, this.index + 1);
                this.state = State$1.BeforeAttributeName;
            }
            else if (this.decodeEntities && c === CharCodes$1.Amp) {
                this.startEntity();
            }
        }
        stateInAttributeValueDoubleQuotes(c) {
            this.handleInAttributeValue(c, CharCodes$1.DoubleQuote);
        }
        stateInAttributeValueSingleQuotes(c) {
            this.handleInAttributeValue(c, CharCodes$1.SingleQuote);
        }
        stateInAttributeValueNoQuotes(c) {
            if (isWhitespace$2(c) || c === CharCodes$1.Gt) {
                this.cbs.onattribdata(this.sectionStart, this.index);
                this.sectionStart = -1;
                this.cbs.onattribend(QuoteType.Unquoted, this.index);
                this.state = State$1.BeforeAttributeName;
                this.stateBeforeAttributeName(c);
            }
            else if (this.decodeEntities && c === CharCodes$1.Amp) {
                this.startEntity();
            }
        }
        stateBeforeDeclaration(c) {
            if (c === CharCodes$1.OpeningSquareBracket) {
                this.state = State$1.CDATASequence;
                this.sequenceIndex = 0;
            }
            else {
                this.state =
                    c === CharCodes$1.Dash
                        ? State$1.BeforeComment
                        : State$1.InDeclaration;
            }
        }
        stateInDeclaration(c) {
            if (c === CharCodes$1.Gt || this.fastForwardTo(CharCodes$1.Gt)) {
                this.cbs.ondeclaration(this.sectionStart, this.index);
                this.state = State$1.Text;
                this.sectionStart = this.index + 1;
            }
        }
        stateInProcessingInstruction(c) {
            if (c === CharCodes$1.Gt || this.fastForwardTo(CharCodes$1.Gt)) {
                this.cbs.onprocessinginstruction(this.sectionStart, this.index);
                this.state = State$1.Text;
                this.sectionStart = this.index + 1;
            }
        }
        stateBeforeComment(c) {
            if (c === CharCodes$1.Dash) {
                this.state = State$1.InCommentLike;
                this.currentSequence = Sequences.CommentEnd;
                // Allow short comments (eg. <!-->)
                this.sequenceIndex = 2;
                this.sectionStart = this.index + 1;
            }
            else {
                this.state = State$1.InDeclaration;
            }
        }
        stateInSpecialComment(c) {
            if (c === CharCodes$1.Gt || this.fastForwardTo(CharCodes$1.Gt)) {
                this.cbs.oncomment(this.sectionStart, this.index, 0);
                this.state = State$1.Text;
                this.sectionStart = this.index + 1;
            }
        }
        stateBeforeSpecialS(c) {
            const lower = c | 0x20;
            if (lower === Sequences.ScriptEnd[3]) {
                this.startSpecial(Sequences.ScriptEnd, 4);
            }
            else if (lower === Sequences.StyleEnd[3]) {
                this.startSpecial(Sequences.StyleEnd, 4);
            }
            else {
                this.state = State$1.InTagName;
                this.stateInTagName(c); // Consume the token again
            }
        }
        stateBeforeSpecialT(c) {
            const lower = c | 0x20;
            switch (lower) {
                case Sequences.TitleEnd[3]: {
                    this.startSpecial(Sequences.TitleEnd, 4);
                    break;
                }
                case Sequences.TextareaEnd[3]: {
                    this.startSpecial(Sequences.TextareaEnd, 4);
                    break;
                }
                case Sequences.XmpEnd[3]: {
                    this.startSpecial(Sequences.XmpEnd, 4);
                    break;
                }
                default: {
                    this.state = State$1.InTagName;
                    this.stateInTagName(c); // Consume the token again
                }
            }
        }
        startEntity() {
            this.baseState = this.state;
            this.state = State$1.InEntity;
            this.entityStart = this.index;
            this.entityDecoder.startEntity(this.xmlMode
                ? DecodingMode$1.Strict
                : this.baseState === State$1.Text ||
                    this.baseState === State$1.InSpecialTag
                    ? DecodingMode$1.Legacy
                    : DecodingMode$1.Attribute);
        }
        stateInEntity() {
            const indexInBuffer = this.index - this.offset;
            const length = this.entityDecoder.write(this.buffer, indexInBuffer);
            // If `length` is positive, we are done with the entity.
            if (length >= 0) {
                this.state = this.baseState;
                if (length === 0) {
                    this.index -= 1;
                }
            }
            else {
                if (indexInBuffer < this.buffer.length &&
                    this.buffer.charCodeAt(indexInBuffer) === CharCodes$1.Amp) {
                    this.state = this.baseState;
                    this.index -= 1;
                    return;
                }
                // Mark buffer as consumed.
                this.index = this.offset + this.buffer.length - 1;
            }
        }
        /**
         * Remove data that has already been consumed from the buffer.
         */
        cleanup() {
            // If we are inside of text or attributes, emit what we already have.
            if (this.running && this.sectionStart !== this.index) {
                if (this.state === State$1.Text ||
                    (this.state === State$1.InSpecialTag && this.sequenceIndex === 0)) {
                    this.cbs.ontext(this.sectionStart, this.index);
                    this.sectionStart = this.index;
                }
                else if (this.state === State$1.InAttributeValueDq ||
                    this.state === State$1.InAttributeValueSq ||
                    this.state === State$1.InAttributeValueNq) {
                    this.cbs.onattribdata(this.sectionStart, this.index);
                    this.sectionStart = this.index;
                }
            }
        }
        shouldContinue() {
            return this.index < this.buffer.length + this.offset && this.running;
        }
        /**
         * Iterates through the buffer, calling the function corresponding to the current state.
         *
         * States that are more likely to be hit are higher up, as a performance improvement.
         */
        parse() {
            while (this.shouldContinue()) {
                const c = this.buffer.charCodeAt(this.index - this.offset);
                switch (this.state) {
                    case State$1.Text: {
                        this.stateText(c);
                        break;
                    }
                    case State$1.SpecialStartSequence: {
                        this.stateSpecialStartSequence(c);
                        break;
                    }
                    case State$1.InSpecialTag: {
                        this.stateInSpecialTag(c);
                        break;
                    }
                    case State$1.CDATASequence: {
                        this.stateCDATASequence(c);
                        break;
                    }
                    case State$1.InAttributeValueDq: {
                        this.stateInAttributeValueDoubleQuotes(c);
                        break;
                    }
                    case State$1.InAttributeName: {
                        this.stateInAttributeName(c);
                        break;
                    }
                    case State$1.InCommentLike: {
                        this.stateInCommentLike(c);
                        break;
                    }
                    case State$1.InSpecialComment: {
                        this.stateInSpecialComment(c);
                        break;
                    }
                    case State$1.BeforeAttributeName: {
                        this.stateBeforeAttributeName(c);
                        break;
                    }
                    case State$1.InTagName: {
                        this.stateInTagName(c);
                        break;
                    }
                    case State$1.InClosingTagName: {
                        this.stateInClosingTagName(c);
                        break;
                    }
                    case State$1.BeforeTagName: {
                        this.stateBeforeTagName(c);
                        break;
                    }
                    case State$1.AfterAttributeName: {
                        this.stateAfterAttributeName(c);
                        break;
                    }
                    case State$1.InAttributeValueSq: {
                        this.stateInAttributeValueSingleQuotes(c);
                        break;
                    }
                    case State$1.BeforeAttributeValue: {
                        this.stateBeforeAttributeValue(c);
                        break;
                    }
                    case State$1.BeforeClosingTagName: {
                        this.stateBeforeClosingTagName(c);
                        break;
                    }
                    case State$1.AfterClosingTagName: {
                        this.stateAfterClosingTagName(c);
                        break;
                    }
                    case State$1.BeforeSpecialS: {
                        this.stateBeforeSpecialS(c);
                        break;
                    }
                    case State$1.BeforeSpecialT: {
                        this.stateBeforeSpecialT(c);
                        break;
                    }
                    case State$1.InAttributeValueNq: {
                        this.stateInAttributeValueNoQuotes(c);
                        break;
                    }
                    case State$1.InSelfClosingTag: {
                        this.stateInSelfClosingTag(c);
                        break;
                    }
                    case State$1.InDeclaration: {
                        this.stateInDeclaration(c);
                        break;
                    }
                    case State$1.BeforeDeclaration: {
                        this.stateBeforeDeclaration(c);
                        break;
                    }
                    case State$1.BeforeComment: {
                        this.stateBeforeComment(c);
                        break;
                    }
                    case State$1.InProcessingInstruction: {
                        this.stateInProcessingInstruction(c);
                        break;
                    }
                    case State$1.InEntity: {
                        this.stateInEntity();
                        break;
                    }
                }
                this.index++;
            }
            this.cleanup();
        }
        finish() {
            if (this.state === State$1.InEntity) {
                this.entityDecoder.end();
                this.state = this.baseState;
            }
            this.handleTrailingData();
            this.cbs.onend();
        }
        /** Handle any trailing data. */
        handleTrailingData() {
            const endIndex = this.buffer.length + this.offset;
            // If there is no remaining data, we are done.
            if (this.sectionStart >= endIndex) {
                return;
            }
            if (this.state === State$1.InCommentLike) {
                if (this.currentSequence === Sequences.CdataEnd) {
                    this.cbs.oncdata(this.sectionStart, endIndex, 0);
                }
                else {
                    this.cbs.oncomment(this.sectionStart, endIndex, 0);
                }
            }
            else if (this.state === State$1.InTagName ||
                this.state === State$1.BeforeAttributeName ||
                this.state === State$1.BeforeAttributeValue ||
                this.state === State$1.AfterAttributeName ||
                this.state === State$1.InAttributeName ||
                this.state === State$1.InAttributeValueSq ||
                this.state === State$1.InAttributeValueDq ||
                this.state === State$1.InAttributeValueNq ||
                this.state === State$1.InClosingTagName) ;
            else {
                this.cbs.ontext(this.sectionStart, endIndex);
            }
        }
        emitCodePoint(cp, consumed) {
            if (this.baseState !== State$1.Text &&
                this.baseState !== State$1.InSpecialTag) {
                if (this.sectionStart < this.entityStart) {
                    this.cbs.onattribdata(this.sectionStart, this.entityStart);
                }
                this.sectionStart = this.entityStart + consumed;
                this.index = this.sectionStart - 1;
                this.cbs.onattribentity(cp);
            }
            else {
                if (this.sectionStart < this.entityStart) {
                    this.cbs.ontext(this.sectionStart, this.entityStart);
                }
                this.sectionStart = this.entityStart + consumed;
                this.index = this.sectionStart - 1;
                this.cbs.ontextentity(cp, this.sectionStart);
            }
        }
    };

    const formTags = new Set([
        "input",
        "option",
        "optgroup",
        "select",
        "button",
        "datalist",
        "textarea",
    ]);
    const pTag = new Set(["p"]);
    const tableSectionTags = new Set(["thead", "tbody"]);
    const ddtTags = new Set(["dd", "dt"]);
    const rtpTags = new Set(["rt", "rp"]);
    const openImpliesClose = new Map([
        ["tr", new Set(["tr", "th", "td"])],
        ["th", new Set(["th"])],
        ["td", new Set(["thead", "th", "td"])],
        ["body", new Set(["head", "link", "script"])],
        ["li", new Set(["li"])],
        ["p", pTag],
        ["h1", pTag],
        ["h2", pTag],
        ["h3", pTag],
        ["h4", pTag],
        ["h5", pTag],
        ["h6", pTag],
        ["select", formTags],
        ["input", formTags],
        ["output", formTags],
        ["button", formTags],
        ["datalist", formTags],
        ["textarea", formTags],
        ["option", new Set(["option"])],
        ["optgroup", new Set(["optgroup", "option"])],
        ["dd", ddtTags],
        ["dt", ddtTags],
        ["address", pTag],
        ["article", pTag],
        ["aside", pTag],
        ["blockquote", pTag],
        ["details", pTag],
        ["div", pTag],
        ["dl", pTag],
        ["fieldset", pTag],
        ["figcaption", pTag],
        ["figure", pTag],
        ["footer", pTag],
        ["form", pTag],
        ["header", pTag],
        ["hr", pTag],
        ["main", pTag],
        ["nav", pTag],
        ["ol", pTag],
        ["pre", pTag],
        ["section", pTag],
        ["table", pTag],
        ["ul", pTag],
        ["rt", rtpTags],
        ["rp", rtpTags],
        ["tbody", tableSectionTags],
        ["tfoot", tableSectionTags],
    ]);
    const voidElements = new Set([
        "area",
        "base",
        "basefont",
        "br",
        "col",
        "command",
        "embed",
        "frame",
        "hr",
        "img",
        "input",
        "isindex",
        "keygen",
        "link",
        "meta",
        "param",
        "source",
        "track",
        "wbr",
    ]);
    const foreignContextElements = new Set(["math", "svg"]);
    const htmlIntegrationElements = new Set([
        "mi",
        "mo",
        "mn",
        "ms",
        "mtext",
        "annotation-xml",
        "foreignobject",
        "desc",
        "title",
    ]);
    const reNameEnd = /\s|\//;
    let Parser$1 = class Parser {
        constructor(cbs, options = {}) {
            var _a, _b, _c, _d, _e, _f;
            this.options = options;
            /** The start index of the last event. */
            this.startIndex = 0;
            /** The end index of the last event. */
            this.endIndex = 0;
            /**
             * Store the start index of the current open tag,
             * so we can update the start index for attributes.
             */
            this.openTagStart = 0;
            this.tagname = "";
            this.attribname = "";
            this.attribvalue = "";
            this.attribs = null;
            this.stack = [];
            this.buffers = [];
            this.bufferOffset = 0;
            /** The index of the last written buffer. Used when resuming after a `pause()`. */
            this.writeIndex = 0;
            /** Indicates whether the parser has finished running / `.end` has been called. */
            this.ended = false;
            this.cbs = cbs !== null && cbs !== void 0 ? cbs : {};
            this.htmlMode = !this.options.xmlMode;
            this.lowerCaseTagNames = (_a = options.lowerCaseTags) !== null && _a !== void 0 ? _a : this.htmlMode;
            this.lowerCaseAttributeNames =
                (_b = options.lowerCaseAttributeNames) !== null && _b !== void 0 ? _b : this.htmlMode;
            this.recognizeSelfClosing =
                (_c = options.recognizeSelfClosing) !== null && _c !== void 0 ? _c : !this.htmlMode;
            this.tokenizer = new ((_d = options.Tokenizer) !== null && _d !== void 0 ? _d : Tokenizer$1)(this.options, this);
            this.foreignContext = [!this.htmlMode];
            (_f = (_e = this.cbs).onparserinit) === null || _f === void 0 ? void 0 : _f.call(_e, this);
        }
        // Tokenizer event handlers
        /** @internal */
        ontext(start, endIndex) {
            var _a, _b;
            const data = this.getSlice(start, endIndex);
            this.endIndex = endIndex - 1;
            (_b = (_a = this.cbs).ontext) === null || _b === void 0 ? void 0 : _b.call(_a, data);
            this.startIndex = endIndex;
        }
        /** @internal */
        ontextentity(cp, endIndex) {
            var _a, _b;
            this.endIndex = endIndex - 1;
            (_b = (_a = this.cbs).ontext) === null || _b === void 0 ? void 0 : _b.call(_a, fromCodePoint(cp));
            this.startIndex = endIndex;
        }
        /**
         * Checks if the current tag is a void element. Override this if you want
         * to specify your own additional void elements.
         */
        isVoidElement(name) {
            return this.htmlMode && voidElements.has(name);
        }
        /** @internal */
        onopentagname(start, endIndex) {
            this.endIndex = endIndex;
            let name = this.getSlice(start, endIndex);
            if (this.lowerCaseTagNames) {
                name = name.toLowerCase();
            }
            this.emitOpenTag(name);
        }
        emitOpenTag(name) {
            var _a, _b, _c, _d;
            this.openTagStart = this.startIndex;
            this.tagname = name;
            const impliesClose = this.htmlMode && openImpliesClose.get(name);
            if (impliesClose) {
                while (this.stack.length > 0 && impliesClose.has(this.stack[0])) {
                    const element = this.stack.shift();
                    (_b = (_a = this.cbs).onclosetag) === null || _b === void 0 ? void 0 : _b.call(_a, element, true);
                }
            }
            if (!this.isVoidElement(name)) {
                this.stack.unshift(name);
                if (this.htmlMode) {
                    if (foreignContextElements.has(name)) {
                        this.foreignContext.unshift(true);
                    }
                    else if (htmlIntegrationElements.has(name)) {
                        this.foreignContext.unshift(false);
                    }
                }
            }
            (_d = (_c = this.cbs).onopentagname) === null || _d === void 0 ? void 0 : _d.call(_c, name);
            if (this.cbs.onopentag)
                this.attribs = {};
        }
        endOpenTag(isImplied) {
            var _a, _b;
            this.startIndex = this.openTagStart;
            if (this.attribs) {
                (_b = (_a = this.cbs).onopentag) === null || _b === void 0 ? void 0 : _b.call(_a, this.tagname, this.attribs, isImplied);
                this.attribs = null;
            }
            if (this.cbs.onclosetag && this.isVoidElement(this.tagname)) {
                this.cbs.onclosetag(this.tagname, true);
            }
            this.tagname = "";
        }
        /** @internal */
        onopentagend(endIndex) {
            this.endIndex = endIndex;
            this.endOpenTag(false);
            // Set `startIndex` for next node
            this.startIndex = endIndex + 1;
        }
        /** @internal */
        onclosetag(start, endIndex) {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            this.endIndex = endIndex;
            let name = this.getSlice(start, endIndex);
            if (this.lowerCaseTagNames) {
                name = name.toLowerCase();
            }
            if (this.htmlMode &&
                (foreignContextElements.has(name) ||
                    htmlIntegrationElements.has(name))) {
                this.foreignContext.shift();
            }
            if (!this.isVoidElement(name)) {
                const pos = this.stack.indexOf(name);
                if (pos !== -1) {
                    for (let index = 0; index <= pos; index++) {
                        const element = this.stack.shift();
                        // We know the stack has sufficient elements.
                        (_b = (_a = this.cbs).onclosetag) === null || _b === void 0 ? void 0 : _b.call(_a, element, index !== pos);
                    }
                }
                else if (this.htmlMode && name === "p") {
                    // Implicit open before close
                    this.emitOpenTag("p");
                    this.closeCurrentTag(true);
                }
            }
            else if (this.htmlMode && name === "br") {
                // We can't use `emitOpenTag` for implicit open, as `br` would be implicitly closed.
                (_d = (_c = this.cbs).onopentagname) === null || _d === void 0 ? void 0 : _d.call(_c, "br");
                (_f = (_e = this.cbs).onopentag) === null || _f === void 0 ? void 0 : _f.call(_e, "br", {}, true);
                (_h = (_g = this.cbs).onclosetag) === null || _h === void 0 ? void 0 : _h.call(_g, "br", false);
            }
            // Set `startIndex` for next node
            this.startIndex = endIndex + 1;
        }
        /** @internal */
        onselfclosingtag(endIndex) {
            this.endIndex = endIndex;
            if (this.recognizeSelfClosing || this.foreignContext[0]) {
                this.closeCurrentTag(false);
                // Set `startIndex` for next node
                this.startIndex = endIndex + 1;
            }
            else {
                // Ignore the fact that the tag is self-closing.
                this.onopentagend(endIndex);
            }
        }
        closeCurrentTag(isOpenImplied) {
            var _a, _b;
            const name = this.tagname;
            this.endOpenTag(isOpenImplied);
            // Self-closing tags will be on the top of the stack
            if (this.stack[0] === name) {
                // If the opening tag isn't implied, the closing tag has to be implied.
                (_b = (_a = this.cbs).onclosetag) === null || _b === void 0 ? void 0 : _b.call(_a, name, !isOpenImplied);
                this.stack.shift();
            }
        }
        /** @internal */
        onattribname(start, endIndex) {
            this.startIndex = start;
            const name = this.getSlice(start, endIndex);
            this.attribname = this.lowerCaseAttributeNames
                ? name.toLowerCase()
                : name;
        }
        /** @internal */
        onattribdata(start, endIndex) {
            this.attribvalue += this.getSlice(start, endIndex);
        }
        /** @internal */
        onattribentity(cp) {
            this.attribvalue += fromCodePoint(cp);
        }
        /** @internal */
        onattribend(quote, endIndex) {
            var _a, _b;
            this.endIndex = endIndex;
            (_b = (_a = this.cbs).onattribute) === null || _b === void 0 ? void 0 : _b.call(_a, this.attribname, this.attribvalue, quote === QuoteType.Double
                ? '"'
                : quote === QuoteType.Single
                    ? "'"
                    : quote === QuoteType.NoValue
                        ? undefined
                        : null);
            if (this.attribs &&
                !Object.prototype.hasOwnProperty.call(this.attribs, this.attribname)) {
                this.attribs[this.attribname] = this.attribvalue;
            }
            this.attribvalue = "";
        }
        getInstructionName(value) {
            const index = value.search(reNameEnd);
            let name = index < 0 ? value : value.substr(0, index);
            if (this.lowerCaseTagNames) {
                name = name.toLowerCase();
            }
            return name;
        }
        /** @internal */
        ondeclaration(start, endIndex) {
            this.endIndex = endIndex;
            const value = this.getSlice(start, endIndex);
            if (this.cbs.onprocessinginstruction) {
                const name = this.getInstructionName(value);
                this.cbs.onprocessinginstruction(`!${name}`, `!${value}`);
            }
            // Set `startIndex` for next node
            this.startIndex = endIndex + 1;
        }
        /** @internal */
        onprocessinginstruction(start, endIndex) {
            this.endIndex = endIndex;
            const value = this.getSlice(start, endIndex);
            if (this.cbs.onprocessinginstruction) {
                const name = this.getInstructionName(value);
                this.cbs.onprocessinginstruction(`?${name}`, `?${value}`);
            }
            // Set `startIndex` for next node
            this.startIndex = endIndex + 1;
        }
        /** @internal */
        oncomment(start, endIndex, offset) {
            var _a, _b, _c, _d;
            this.endIndex = endIndex;
            (_b = (_a = this.cbs).oncomment) === null || _b === void 0 ? void 0 : _b.call(_a, this.getSlice(start, endIndex - offset));
            (_d = (_c = this.cbs).oncommentend) === null || _d === void 0 ? void 0 : _d.call(_c);
            // Set `startIndex` for next node
            this.startIndex = endIndex + 1;
        }
        /** @internal */
        oncdata(start, endIndex, offset) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            this.endIndex = endIndex;
            const value = this.getSlice(start, endIndex - offset);
            if (!this.htmlMode || this.options.recognizeCDATA) {
                (_b = (_a = this.cbs).oncdatastart) === null || _b === void 0 ? void 0 : _b.call(_a);
                (_d = (_c = this.cbs).ontext) === null || _d === void 0 ? void 0 : _d.call(_c, value);
                (_f = (_e = this.cbs).oncdataend) === null || _f === void 0 ? void 0 : _f.call(_e);
            }
            else {
                (_h = (_g = this.cbs).oncomment) === null || _h === void 0 ? void 0 : _h.call(_g, `[CDATA[${value}]]`);
                (_k = (_j = this.cbs).oncommentend) === null || _k === void 0 ? void 0 : _k.call(_j);
            }
            // Set `startIndex` for next node
            this.startIndex = endIndex + 1;
        }
        /** @internal */
        onend() {
            var _a, _b;
            if (this.cbs.onclosetag) {
                // Set the end index for all remaining tags
                this.endIndex = this.startIndex;
                for (let index = 0; index < this.stack.length; index++) {
                    this.cbs.onclosetag(this.stack[index], true);
                }
            }
            (_b = (_a = this.cbs).onend) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
        /**
         * Resets the parser to a blank state, ready to parse a new HTML document
         */
        reset() {
            var _a, _b, _c, _d;
            (_b = (_a = this.cbs).onreset) === null || _b === void 0 ? void 0 : _b.call(_a);
            this.tokenizer.reset();
            this.tagname = "";
            this.attribname = "";
            this.attribs = null;
            this.stack.length = 0;
            this.startIndex = 0;
            this.endIndex = 0;
            (_d = (_c = this.cbs).onparserinit) === null || _d === void 0 ? void 0 : _d.call(_c, this);
            this.buffers.length = 0;
            this.foreignContext.length = 0;
            this.foreignContext.unshift(!this.htmlMode);
            this.bufferOffset = 0;
            this.writeIndex = 0;
            this.ended = false;
        }
        /**
         * Resets the parser, then parses a complete document and
         * pushes it to the handler.
         *
         * @param data Document to parse.
         */
        parseComplete(data) {
            this.reset();
            this.end(data);
        }
        getSlice(start, end) {
            while (start - this.bufferOffset >= this.buffers[0].length) {
                this.shiftBuffer();
            }
            let slice = this.buffers[0].slice(start - this.bufferOffset, end - this.bufferOffset);
            while (end - this.bufferOffset > this.buffers[0].length) {
                this.shiftBuffer();
                slice += this.buffers[0].slice(0, end - this.bufferOffset);
            }
            return slice;
        }
        shiftBuffer() {
            this.bufferOffset += this.buffers[0].length;
            this.writeIndex--;
            this.buffers.shift();
        }
        /**
         * Parses a chunk of data and calls the corresponding callbacks.
         *
         * @param chunk Chunk to parse.
         */
        write(chunk) {
            var _a, _b;
            if (this.ended) {
                (_b = (_a = this.cbs).onerror) === null || _b === void 0 ? void 0 : _b.call(_a, new Error(".write() after done!"));
                return;
            }
            this.buffers.push(chunk);
            if (this.tokenizer.running) {
                this.tokenizer.write(chunk);
                this.writeIndex++;
            }
        }
        /**
         * Parses the end of the buffer and clears the stack, calls onend.
         *
         * @param chunk Optional final chunk to parse.
         */
        end(chunk) {
            var _a, _b;
            if (this.ended) {
                (_b = (_a = this.cbs).onerror) === null || _b === void 0 ? void 0 : _b.call(_a, new Error(".end() after done!"));
                return;
            }
            if (chunk)
                this.write(chunk);
            this.ended = true;
            this.tokenizer.end();
        }
        /**
         * Pauses parsing. The parser won't emit events until `resume` is called.
         */
        pause() {
            this.tokenizer.pause();
        }
        /**
         * Resumes parsing after `pause` was called.
         */
        resume() {
            this.tokenizer.resume();
            while (this.tokenizer.running &&
                this.writeIndex < this.buffers.length) {
                this.tokenizer.write(this.buffers[this.writeIndex++]);
            }
            if (this.ended)
                this.tokenizer.end();
        }
        /**
         * Alias of `write`, for backwards compatibility.
         *
         * @param chunk Chunk to parse.
         * @deprecated
         */
        parseChunk(chunk) {
            this.write(chunk);
        }
        /**
         * Alias of `end`, for backwards compatibility.
         *
         * @param chunk Optional final chunk to parse.
         * @deprecated
         */
        done(chunk) {
            this.end(chunk);
        }
    };

    // Helper methods
    /**
     * Parses the data, returns the resulting document.
     *
     * @param data The data that should be parsed.
     * @param options Optional options for the parser and DOM handler.
     */
    function parseDocument(data, options) {
        const handler = new DomHandler(undefined, options);
        new Parser$1(handler, options).end(data);
        return handler.root;
    }

    /**
     * Methods for getting and modifying attributes.
     *
     * @module cheerio/attributes
     */
    var _a;
    const hasOwn = 
    // @ts-expect-error `hasOwn` is a standard object method
    (_a = Object.hasOwn) !== null && _a !== void 0 ? _a : ((object, prop) => Object.prototype.hasOwnProperty.call(object, prop));
    const rspace = /\s+/;
    const dataAttrPrefix = 'data-';
    // Attributes that are booleans
    const rboolean = /^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i;
    // Matches strings that look like JSON objects or arrays
    const rbrace = /^{[^]*}$|^\[[^]*]$/;
    function getAttr(elem, name, xmlMode) {
        var _a;
        if (!elem || !isTag(elem))
            return undefined;
        (_a = elem.attribs) !== null && _a !== void 0 ? _a : (elem.attribs = {});
        // Return the entire attribs object if no attribute specified
        if (!name) {
            return elem.attribs;
        }
        if (hasOwn(elem.attribs, name)) {
            // Get the (decoded) attribute
            return !xmlMode && rboolean.test(name) ? name : elem.attribs[name];
        }
        // Mimic the DOM and return text content as value for `option's`
        if (elem.name === 'option' && name === 'value') {
            return text$1(elem.children);
        }
        // Mimic DOM with default value for radios/checkboxes
        if (elem.name === 'input' &&
            (elem.attribs['type'] === 'radio' || elem.attribs['type'] === 'checkbox') &&
            name === 'value') {
            return 'on';
        }
        return undefined;
    }
    /**
     * Sets the value of an attribute. The attribute will be deleted if the value is
     * `null`.
     *
     * @private
     * @param el - The element to set the attribute on.
     * @param name - The attribute's name.
     * @param value - The attribute's value.
     */
    function setAttr(el, name, value) {
        if (value === null) {
            removeAttribute(el, name);
        }
        else {
            el.attribs[name] = `${value}`;
        }
    }
    function attr(name, value) {
        // Set the value (with attr map support)
        if (typeof name === 'object' || value !== undefined) {
            if (typeof value === 'function') {
                if (typeof name !== 'string') {
                    {
                        throw new Error('Bad combination of arguments.');
                    }
                }
                return domEach(this, (el, i) => {
                    if (isTag(el))
                        setAttr(el, name, value.call(el, i, el.attribs[name]));
                });
            }
            return domEach(this, (el) => {
                if (!isTag(el))
                    return;
                if (typeof name === 'object') {
                    for (const objName of Object.keys(name)) {
                        const objValue = name[objName];
                        setAttr(el, objName, objValue);
                    }
                }
                else {
                    setAttr(el, name, value);
                }
            });
        }
        return arguments.length > 1
            ? this
            : getAttr(this[0], name, this.options.xmlMode);
    }
    /**
     * Gets a node's prop.
     *
     * @private
     * @category Attributes
     * @param el - Element to get the prop of.
     * @param name - Name of the prop.
     * @param xmlMode - Disable handling of special HTML attributes.
     * @returns The prop's value.
     */
    function getProp(el, name, xmlMode) {
        return name in el
            ? // @ts-expect-error TS doesn't like us accessing the value directly here.
                el[name]
            : !xmlMode && rboolean.test(name)
                ? getAttr(el, name, false) !== undefined
                : getAttr(el, name, xmlMode);
    }
    /**
     * Sets the value of a prop.
     *
     * @private
     * @param el - The element to set the prop on.
     * @param name - The prop's name.
     * @param value - The prop's value.
     * @param xmlMode - Disable handling of special HTML attributes.
     */
    function setProp(el, name, value, xmlMode) {
        if (name in el) {
            // @ts-expect-error Overriding value
            el[name] = value;
        }
        else {
            setAttr(el, name, !xmlMode && rboolean.test(name)
                ? value
                    ? ''
                    : null
                : `${value}`);
        }
    }
    function prop(name, value) {
        var _a;
        if (typeof name === 'string' && value === undefined) {
            const el = this[0];
            if (!el)
                return undefined;
            switch (name) {
                case 'style': {
                    const property = this.css();
                    const keys = Object.keys(property);
                    for (let i = 0; i < keys.length; i++) {
                        property[i] = keys[i];
                    }
                    property.length = keys.length;
                    return property;
                }
                case 'tagName':
                case 'nodeName': {
                    if (!isTag(el))
                        return undefined;
                    return el.name.toUpperCase();
                }
                case 'href':
                case 'src': {
                    if (!isTag(el))
                        return undefined;
                    const prop = (_a = el.attribs) === null || _a === void 0 ? void 0 : _a[name];
                    if (typeof URL !== 'undefined' &&
                        ((name === 'href' && (el.tagName === 'a' || el.tagName === 'link')) ||
                            (name === 'src' &&
                                (el.tagName === 'img' ||
                                    el.tagName === 'iframe' ||
                                    el.tagName === 'audio' ||
                                    el.tagName === 'video' ||
                                    el.tagName === 'source'))) &&
                        prop !== undefined &&
                        this.options.baseURI) {
                        return new URL(prop, this.options.baseURI).href;
                    }
                    return prop;
                }
                case 'innerText': {
                    return innerText(el);
                }
                case 'textContent': {
                    return textContent(el);
                }
                case 'outerHTML': {
                    if (el.type === Root)
                        return this.html();
                    return this.clone().wrap('<container />').parent().html();
                }
                case 'innerHTML': {
                    return this.html();
                }
                default: {
                    if (!isTag(el))
                        return undefined;
                    return getProp(el, name, this.options.xmlMode);
                }
            }
        }
        if (typeof name === 'object' || value !== undefined) {
            if (typeof value === 'function') {
                if (typeof name === 'object') {
                    throw new TypeError('Bad combination of arguments.');
                }
                return domEach(this, (el, i) => {
                    if (isTag(el)) {
                        setProp(el, name, value.call(el, i, getProp(el, name, this.options.xmlMode)), this.options.xmlMode);
                    }
                });
            }
            return domEach(this, (el) => {
                if (!isTag(el))
                    return;
                if (typeof name === 'object') {
                    for (const key of Object.keys(name)) {
                        const val = name[key];
                        setProp(el, key, val, this.options.xmlMode);
                    }
                }
                else {
                    setProp(el, name, value, this.options.xmlMode);
                }
            });
        }
        return undefined;
    }
    /**
     * Sets the value of a data attribute.
     *
     * @private
     * @param elem - The element to set the data attribute on.
     * @param name - The data attribute's name.
     * @param value - The data attribute's value.
     */
    function setData(elem, name, value) {
        var _a;
        (_a = elem.data) !== null && _a !== void 0 ? _a : (elem.data = {});
        if (typeof name === 'object')
            Object.assign(elem.data, name);
        else if (typeof name === 'string' && value !== undefined) {
            elem.data[name] = value;
        }
    }
    /**
     * Read _all_ HTML5 `data-*` attributes from the equivalent HTML5 `data-*`
     * attribute, and cache the value in the node's internal data store.
     *
     * @private
     * @category Attributes
     * @param el - Element to get the data attribute of.
     * @returns A map with all of the data attributes.
     */
    function readAllData(el) {
        for (const domName of Object.keys(el.attribs)) {
            if (!domName.startsWith(dataAttrPrefix)) {
                continue;
            }
            const jsName = camelCase(domName.slice(dataAttrPrefix.length));
            if (!hasOwn(el.data, jsName)) {
                el.data[jsName] = parseDataValue(el.attribs[domName]);
            }
        }
        return el.data;
    }
    /**
     * Read the specified attribute from the equivalent HTML5 `data-*` attribute,
     * and (if present) cache the value in the node's internal data store.
     *
     * @private
     * @category Attributes
     * @param el - Element to get the data attribute of.
     * @param name - Name of the data attribute.
     * @returns The data attribute's value.
     */
    function readData(el, name) {
        const domName = dataAttrPrefix + cssCase(name);
        const data = el.data;
        if (hasOwn(data, name)) {
            return data[name];
        }
        if (hasOwn(el.attribs, domName)) {
            return (data[name] = parseDataValue(el.attribs[domName]));
        }
        return undefined;
    }
    /**
     * Coerce string data-* attributes to their corresponding JavaScript primitives.
     *
     * @private
     * @category Attributes
     * @param value - The value to parse.
     * @returns The parsed value.
     */
    function parseDataValue(value) {
        if (value === 'null')
            return null;
        if (value === 'true')
            return true;
        if (value === 'false')
            return false;
        const num = Number(value);
        if (value === String(num))
            return num;
        if (rbrace.test(value)) {
            try {
                return JSON.parse(value);
            }
            catch {
                /* Ignore */
            }
        }
        return value;
    }
    function data(name, value) {
        var _a;
        const elem = this[0];
        if (!elem || !isTag(elem))
            return;
        const dataEl = elem;
        (_a = dataEl.data) !== null && _a !== void 0 ? _a : (dataEl.data = {});
        // Return the entire data object if no data specified
        if (name == null) {
            return readAllData(dataEl);
        }
        // Set the value (with attr map support)
        if (typeof name === 'object' || value !== undefined) {
            domEach(this, (el) => {
                if (isTag(el)) {
                    if (typeof name === 'object')
                        setData(el, name);
                    else
                        setData(el, name, value);
                }
            });
            return this;
        }
        return readData(dataEl, name);
    }
    function val(value) {
        const querying = arguments.length === 0;
        const element = this[0];
        if (!element || !isTag(element))
            return querying ? undefined : this;
        switch (element.name) {
            case 'textarea': {
                return this.text(value);
            }
            case 'select': {
                const option = this.find('option:selected');
                if (!querying) {
                    if (this.attr('multiple') == null && typeof value === 'object') {
                        return this;
                    }
                    this.find('option').removeAttr('selected');
                    const values = typeof value === 'object' ? value : [value];
                    for (const val of values) {
                        this.find(`option[value="${val}"]`).attr('selected', '');
                    }
                    return this;
                }
                return this.attr('multiple')
                    ? option.toArray().map((el) => text$1(el.children))
                    : option.attr('value');
            }
            case 'button':
            case 'input':
            case 'option': {
                return querying
                    ? this.attr('value')
                    : this.attr('value', value);
            }
        }
        return undefined;
    }
    /**
     * Remove an attribute.
     *
     * @private
     * @param elem - Node to remove attribute from.
     * @param name - Name of the attribute to remove.
     */
    function removeAttribute(elem, name) {
        if (!elem.attribs || !hasOwn(elem.attribs, name))
            return;
        delete elem.attribs[name];
    }
    /**
     * Splits a space-separated list of names to individual names.
     *
     * @category Attributes
     * @param names - Names to split.
     * @returns - Split names.
     */
    function splitNames(names) {
        return names ? names.trim().split(rspace) : [];
    }
    /**
     * Method for removing attributes by `name`.
     *
     * @category Attributes
     * @example
     *
     * ```js
     * $('.pear').removeAttr('class').prop('outerHTML');
     * //=> <li>Pear</li>
     *
     * $('.apple').attr('id', 'favorite');
     * $('.apple').removeAttr('id class').prop('outerHTML');
     * //=> <li>Apple</li>
     * ```
     *
     * @param name - Name of the attribute.
     * @returns The instance itself.
     * @see {@link https://api.jquery.com/removeAttr/}
     */
    function removeAttr(name) {
        const attrNames = splitNames(name);
        for (const attrName of attrNames) {
            domEach(this, (elem) => {
                if (isTag(elem))
                    removeAttribute(elem, attrName);
            });
        }
        return this;
    }
    /**
     * Check to see if _any_ of the matched elements have the given `className`.
     *
     * @category Attributes
     * @example
     *
     * ```js
     * $('.pear').hasClass('pear');
     * //=> true
     *
     * $('apple').hasClass('fruit');
     * //=> false
     *
     * $('li').hasClass('pear');
     * //=> true
     * ```
     *
     * @param className - Name of the class.
     * @returns Indicates if an element has the given `className`.
     * @see {@link https://api.jquery.com/hasClass/}
     */
    function hasClass(className) {
        return this.toArray().some((elem) => {
            const clazz = isTag(elem) && elem.attribs['class'];
            let idx = -1;
            if (clazz && className.length > 0) {
                while ((idx = clazz.indexOf(className, idx + 1)) > -1) {
                    const end = idx + className.length;
                    if ((idx === 0 || rspace.test(clazz[idx - 1])) &&
                        (end === clazz.length || rspace.test(clazz[end]))) {
                        return true;
                    }
                }
            }
            return false;
        });
    }
    /**
     * Adds class(es) to all of the matched elements. Also accepts a `function`.
     *
     * @category Attributes
     * @example
     *
     * ```js
     * $('.pear').addClass('fruit').prop('outerHTML');
     * //=> <li class="pear fruit">Pear</li>
     *
     * $('.apple').addClass('fruit red').prop('outerHTML');
     * //=> <li class="apple fruit red">Apple</li>
     * ```
     *
     * @param value - Name of new class.
     * @returns The instance itself.
     * @see {@link https://api.jquery.com/addClass/}
     */
    function addClass(value) {
        // Support functions
        if (typeof value === 'function') {
            return domEach(this, (el, i) => {
                if (isTag(el)) {
                    const className = el.attribs['class'] || '';
                    addClass.call([el], value.call(el, i, className));
                }
            });
        }
        // Return if no value or not a string or function
        if (!value || typeof value !== 'string')
            return this;
        const classNames = value.split(rspace);
        const numElements = this.length;
        for (let i = 0; i < numElements; i++) {
            const el = this[i];
            // If selected element isn't a tag, move on
            if (!isTag(el))
                continue;
            // If we don't already have classes — always set xmlMode to false here, as it doesn't matter for classes
            const className = getAttr(el, 'class', false);
            if (className) {
                let setClass = ` ${className} `;
                // Check if class already exists
                for (const cn of classNames) {
                    const appendClass = `${cn} `;
                    if (!setClass.includes(` ${appendClass}`))
                        setClass += appendClass;
                }
                setAttr(el, 'class', setClass.trim());
            }
            else {
                setAttr(el, 'class', classNames.join(' ').trim());
            }
        }
        return this;
    }
    /**
     * Removes one or more space-separated classes from the selected elements. If no
     * `className` is defined, all classes will be removed. Also accepts a
     * `function`.
     *
     * @category Attributes
     * @example
     *
     * ```js
     * $('.pear').removeClass('pear').prop('outerHTML');
     * //=> <li class="">Pear</li>
     *
     * $('.apple').addClass('red').removeClass().prop('outerHTML');
     * //=> <li class="">Apple</li>
     * ```
     *
     * @param name - Name of the class. If not specified, removes all elements.
     * @returns The instance itself.
     * @see {@link https://api.jquery.com/removeClass/}
     */
    function removeClass(name) {
        // Handle if value is a function
        if (typeof name === 'function') {
            return domEach(this, (el, i) => {
                if (isTag(el)) {
                    removeClass.call([el], name.call(el, i, el.attribs['class'] || ''));
                }
            });
        }
        const classes = splitNames(name);
        const numClasses = classes.length;
        const removeAll = arguments.length === 0;
        return domEach(this, (el) => {
            if (!isTag(el))
                return;
            if (removeAll) {
                // Short circuit the remove all case as this is the nice one
                el.attribs['class'] = '';
            }
            else {
                const elClasses = splitNames(el.attribs['class']);
                let changed = false;
                for (let j = 0; j < numClasses; j++) {
                    const index = elClasses.indexOf(classes[j]);
                    if (index !== -1) {
                        elClasses.splice(index, 1);
                        changed = true;
                        /*
                         * We have to do another pass to ensure that there are not duplicate
                         * classes listed
                         */
                        j--;
                    }
                }
                if (changed) {
                    el.attribs['class'] = elClasses.join(' ');
                }
            }
        });
    }
    /**
     * Add or remove class(es) from the matched elements, depending on either the
     * class's presence or the value of the switch argument. Also accepts a
     * `function`.
     *
     * @category Attributes
     * @example
     *
     * ```js
     * $('.apple.green').toggleClass('fruit green red').prop('outerHTML');
     * //=> <li class="apple fruit red">Apple</li>
     *
     * $('.apple.green').toggleClass('fruit green red', true).prop('outerHTML');
     * //=> <li class="apple green fruit red">Apple</li>
     * ```
     *
     * @param value - Name of the class. Can also be a function.
     * @param stateVal - If specified the state of the class.
     * @returns The instance itself.
     * @see {@link https://api.jquery.com/toggleClass/}
     */
    function toggleClass(value, stateVal) {
        // Support functions
        if (typeof value === 'function') {
            return domEach(this, (el, i) => {
                if (isTag(el)) {
                    toggleClass.call([el], value.call(el, i, el.attribs['class'] || '', stateVal), stateVal);
                }
            });
        }
        // Return if no value or not a string or function
        if (!value || typeof value !== 'string')
            return this;
        const classNames = value.split(rspace);
        const numClasses = classNames.length;
        const state = typeof stateVal === 'boolean' ? (stateVal ? 1 : -1) : 0;
        const numElements = this.length;
        for (let i = 0; i < numElements; i++) {
            const el = this[i];
            // If selected element isn't a tag, move on
            if (!isTag(el))
                continue;
            const elementClasses = splitNames(el.attribs['class']);
            // Check if class already exists
            for (let j = 0; j < numClasses; j++) {
                // Check if the class name is currently defined
                const index = elementClasses.indexOf(classNames[j]);
                // Add if stateValue === true or we are toggling and there is no value
                if (state >= 0 && index === -1) {
                    elementClasses.push(classNames[j]);
                }
                else if (state <= 0 && index !== -1) {
                    // Otherwise remove but only if the item exists
                    elementClasses.splice(index, 1);
                }
            }
            el.attribs['class'] = elementClasses.join(' ');
        }
        return this;
    }

    var Attributes = /*#__PURE__*/Object.freeze({
        __proto__: null,
        addClass: addClass,
        attr: attr,
        data: data,
        hasClass: hasClass,
        prop: prop,
        removeAttr: removeAttr,
        removeClass: removeClass,
        toggleClass: toggleClass,
        val: val
    });

    var SelectorType;
    (function (SelectorType) {
        SelectorType["Attribute"] = "attribute";
        SelectorType["Pseudo"] = "pseudo";
        SelectorType["PseudoElement"] = "pseudo-element";
        SelectorType["Tag"] = "tag";
        SelectorType["Universal"] = "universal";
        // Traversals
        SelectorType["Adjacent"] = "adjacent";
        SelectorType["Child"] = "child";
        SelectorType["Descendant"] = "descendant";
        SelectorType["Parent"] = "parent";
        SelectorType["Sibling"] = "sibling";
        SelectorType["ColumnCombinator"] = "column-combinator";
    })(SelectorType || (SelectorType = {}));
    var AttributeAction;
    (function (AttributeAction) {
        AttributeAction["Any"] = "any";
        AttributeAction["Element"] = "element";
        AttributeAction["End"] = "end";
        AttributeAction["Equals"] = "equals";
        AttributeAction["Exists"] = "exists";
        AttributeAction["Hyphen"] = "hyphen";
        AttributeAction["Not"] = "not";
        AttributeAction["Start"] = "start";
    })(AttributeAction || (AttributeAction = {}));

    const reName = /^[^\\#]?(?:\\(?:[\da-f]{1,6}\s?|.)|[\w\-\u00b0-\uFFFF])+/;
    const reEscape = /\\([\da-f]{1,6}\s?|(\s)|.)/gi;
    const actionTypes = new Map([
        [126 /* Tilde */, AttributeAction.Element],
        [94 /* Circumflex */, AttributeAction.Start],
        [36 /* Dollar */, AttributeAction.End],
        [42 /* Asterisk */, AttributeAction.Any],
        [33 /* ExclamationMark */, AttributeAction.Not],
        [124 /* Pipe */, AttributeAction.Hyphen],
    ]);
    // Pseudos, whose data property is parsed as well.
    const unpackPseudos = new Set([
        "has",
        "not",
        "matches",
        "is",
        "where",
        "host",
        "host-context",
    ]);
    /**
     * Checks whether a specific selector is a traversal.
     * This is useful eg. in swapping the order of elements that
     * are not traversals.
     *
     * @param selector Selector to check.
     */
    function isTraversal$1(selector) {
        switch (selector.type) {
            case SelectorType.Adjacent:
            case SelectorType.Child:
            case SelectorType.Descendant:
            case SelectorType.Parent:
            case SelectorType.Sibling:
            case SelectorType.ColumnCombinator:
                return true;
            default:
                return false;
        }
    }
    const stripQuotesFromPseudos = new Set(["contains", "icontains"]);
    // Unescape function taken from https://github.com/jquery/sizzle/blob/master/src/sizzle.js#L152
    function funescape(_, escaped, escapedWhitespace) {
        const high = parseInt(escaped, 16) - 0x10000;
        // NaN means non-codepoint
        return high !== high || escapedWhitespace
            ? escaped
            : high < 0
                ? // BMP codepoint
                    String.fromCharCode(high + 0x10000)
                : // Supplemental Plane codepoint (surrogate pair)
                    String.fromCharCode((high >> 10) | 0xd800, (high & 0x3ff) | 0xdc00);
    }
    function unescapeCSS(str) {
        return str.replace(reEscape, funescape);
    }
    function isQuote(c) {
        return c === 39 /* SingleQuote */ || c === 34 /* DoubleQuote */;
    }
    function isWhitespace$1(c) {
        return (c === 32 /* Space */ ||
            c === 9 /* Tab */ ||
            c === 10 /* NewLine */ ||
            c === 12 /* FormFeed */ ||
            c === 13 /* CarriageReturn */);
    }
    /**
     * Parses `selector`, optionally with the passed `options`.
     *
     * @param selector Selector to parse.
     * @param options Options for parsing.
     * @returns Returns a two-dimensional array.
     * The first dimension represents selectors separated by commas (eg. `sub1, sub2`),
     * the second contains the relevant tokens for that selector.
     */
    function parse$4(selector) {
        const subselects = [];
        const endIndex = parseSelector(subselects, `${selector}`, 0);
        if (endIndex < selector.length) {
            throw new Error(`Unmatched selector: ${selector.slice(endIndex)}`);
        }
        return subselects;
    }
    function parseSelector(subselects, selector, selectorIndex) {
        let tokens = [];
        function getName(offset) {
            const match = selector.slice(selectorIndex + offset).match(reName);
            if (!match) {
                throw new Error(`Expected name, found ${selector.slice(selectorIndex)}`);
            }
            const [name] = match;
            selectorIndex += offset + name.length;
            return unescapeCSS(name);
        }
        function stripWhitespace(offset) {
            selectorIndex += offset;
            while (selectorIndex < selector.length &&
                isWhitespace$1(selector.charCodeAt(selectorIndex))) {
                selectorIndex++;
            }
        }
        function readValueWithParenthesis() {
            selectorIndex += 1;
            const start = selectorIndex;
            let counter = 1;
            for (; counter > 0 && selectorIndex < selector.length; selectorIndex++) {
                if (selector.charCodeAt(selectorIndex) ===
                    40 /* LeftParenthesis */ &&
                    !isEscaped(selectorIndex)) {
                    counter++;
                }
                else if (selector.charCodeAt(selectorIndex) ===
                    41 /* RightParenthesis */ &&
                    !isEscaped(selectorIndex)) {
                    counter--;
                }
            }
            if (counter) {
                throw new Error("Parenthesis not matched");
            }
            return unescapeCSS(selector.slice(start, selectorIndex - 1));
        }
        function isEscaped(pos) {
            let slashCount = 0;
            while (selector.charCodeAt(--pos) === 92 /* BackSlash */)
                slashCount++;
            return (slashCount & 1) === 1;
        }
        function ensureNotTraversal() {
            if (tokens.length > 0 && isTraversal$1(tokens[tokens.length - 1])) {
                throw new Error("Did not expect successive traversals.");
            }
        }
        function addTraversal(type) {
            if (tokens.length > 0 &&
                tokens[tokens.length - 1].type === SelectorType.Descendant) {
                tokens[tokens.length - 1].type = type;
                return;
            }
            ensureNotTraversal();
            tokens.push({ type });
        }
        function addSpecialAttribute(name, action) {
            tokens.push({
                type: SelectorType.Attribute,
                name,
                action,
                value: getName(1),
                namespace: null,
                ignoreCase: "quirks",
            });
        }
        /**
         * We have finished parsing the current part of the selector.
         *
         * Remove descendant tokens at the end if they exist,
         * and return the last index, so that parsing can be
         * picked up from here.
         */
        function finalizeSubselector() {
            if (tokens.length &&
                tokens[tokens.length - 1].type === SelectorType.Descendant) {
                tokens.pop();
            }
            if (tokens.length === 0) {
                throw new Error("Empty sub-selector");
            }
            subselects.push(tokens);
        }
        stripWhitespace(0);
        if (selector.length === selectorIndex) {
            return selectorIndex;
        }
        loop: while (selectorIndex < selector.length) {
            const firstChar = selector.charCodeAt(selectorIndex);
            switch (firstChar) {
                // Whitespace
                case 32 /* Space */:
                case 9 /* Tab */:
                case 10 /* NewLine */:
                case 12 /* FormFeed */:
                case 13 /* CarriageReturn */: {
                    if (tokens.length === 0 ||
                        tokens[0].type !== SelectorType.Descendant) {
                        ensureNotTraversal();
                        tokens.push({ type: SelectorType.Descendant });
                    }
                    stripWhitespace(1);
                    break;
                }
                // Traversals
                case 62 /* GreaterThan */: {
                    addTraversal(SelectorType.Child);
                    stripWhitespace(1);
                    break;
                }
                case 60 /* LessThan */: {
                    addTraversal(SelectorType.Parent);
                    stripWhitespace(1);
                    break;
                }
                case 126 /* Tilde */: {
                    addTraversal(SelectorType.Sibling);
                    stripWhitespace(1);
                    break;
                }
                case 43 /* Plus */: {
                    addTraversal(SelectorType.Adjacent);
                    stripWhitespace(1);
                    break;
                }
                // Special attribute selectors: .class, #id
                case 46 /* Period */: {
                    addSpecialAttribute("class", AttributeAction.Element);
                    break;
                }
                case 35 /* Hash */: {
                    addSpecialAttribute("id", AttributeAction.Equals);
                    break;
                }
                case 91 /* LeftSquareBracket */: {
                    stripWhitespace(1);
                    // Determine attribute name and namespace
                    let name;
                    let namespace = null;
                    if (selector.charCodeAt(selectorIndex) === 124 /* Pipe */) {
                        // Equivalent to no namespace
                        name = getName(1);
                    }
                    else if (selector.startsWith("*|", selectorIndex)) {
                        namespace = "*";
                        name = getName(2);
                    }
                    else {
                        name = getName(0);
                        if (selector.charCodeAt(selectorIndex) === 124 /* Pipe */ &&
                            selector.charCodeAt(selectorIndex + 1) !==
                                61 /* Equal */) {
                            namespace = name;
                            name = getName(1);
                        }
                    }
                    stripWhitespace(0);
                    // Determine comparison operation
                    let action = AttributeAction.Exists;
                    const possibleAction = actionTypes.get(selector.charCodeAt(selectorIndex));
                    if (possibleAction) {
                        action = possibleAction;
                        if (selector.charCodeAt(selectorIndex + 1) !==
                            61 /* Equal */) {
                            throw new Error("Expected `=`");
                        }
                        stripWhitespace(2);
                    }
                    else if (selector.charCodeAt(selectorIndex) === 61 /* Equal */) {
                        action = AttributeAction.Equals;
                        stripWhitespace(1);
                    }
                    // Determine value
                    let value = "";
                    let ignoreCase = null;
                    if (action !== "exists") {
                        if (isQuote(selector.charCodeAt(selectorIndex))) {
                            const quote = selector.charCodeAt(selectorIndex);
                            let sectionEnd = selectorIndex + 1;
                            while (sectionEnd < selector.length &&
                                (selector.charCodeAt(sectionEnd) !== quote ||
                                    isEscaped(sectionEnd))) {
                                sectionEnd += 1;
                            }
                            if (selector.charCodeAt(sectionEnd) !== quote) {
                                throw new Error("Attribute value didn't end");
                            }
                            value = unescapeCSS(selector.slice(selectorIndex + 1, sectionEnd));
                            selectorIndex = sectionEnd + 1;
                        }
                        else {
                            const valueStart = selectorIndex;
                            while (selectorIndex < selector.length &&
                                ((!isWhitespace$1(selector.charCodeAt(selectorIndex)) &&
                                    selector.charCodeAt(selectorIndex) !==
                                        93 /* RightSquareBracket */) ||
                                    isEscaped(selectorIndex))) {
                                selectorIndex += 1;
                            }
                            value = unescapeCSS(selector.slice(valueStart, selectorIndex));
                        }
                        stripWhitespace(0);
                        // See if we have a force ignore flag
                        const forceIgnore = selector.charCodeAt(selectorIndex) | 0x20;
                        // If the forceIgnore flag is set (either `i` or `s`), use that value
                        if (forceIgnore === 115 /* LowerS */) {
                            ignoreCase = false;
                            stripWhitespace(1);
                        }
                        else if (forceIgnore === 105 /* LowerI */) {
                            ignoreCase = true;
                            stripWhitespace(1);
                        }
                    }
                    if (selector.charCodeAt(selectorIndex) !==
                        93 /* RightSquareBracket */) {
                        throw new Error("Attribute selector didn't terminate");
                    }
                    selectorIndex += 1;
                    const attributeSelector = {
                        type: SelectorType.Attribute,
                        name,
                        action,
                        value,
                        namespace,
                        ignoreCase,
                    };
                    tokens.push(attributeSelector);
                    break;
                }
                case 58 /* Colon */: {
                    if (selector.charCodeAt(selectorIndex + 1) === 58 /* Colon */) {
                        tokens.push({
                            type: SelectorType.PseudoElement,
                            name: getName(2).toLowerCase(),
                            data: selector.charCodeAt(selectorIndex) ===
                                40 /* LeftParenthesis */
                                ? readValueWithParenthesis()
                                : null,
                        });
                        continue;
                    }
                    const name = getName(1).toLowerCase();
                    let data = null;
                    if (selector.charCodeAt(selectorIndex) ===
                        40 /* LeftParenthesis */) {
                        if (unpackPseudos.has(name)) {
                            if (isQuote(selector.charCodeAt(selectorIndex + 1))) {
                                throw new Error(`Pseudo-selector ${name} cannot be quoted`);
                            }
                            data = [];
                            selectorIndex = parseSelector(data, selector, selectorIndex + 1);
                            if (selector.charCodeAt(selectorIndex) !==
                                41 /* RightParenthesis */) {
                                throw new Error(`Missing closing parenthesis in :${name} (${selector})`);
                            }
                            selectorIndex += 1;
                        }
                        else {
                            data = readValueWithParenthesis();
                            if (stripQuotesFromPseudos.has(name)) {
                                const quot = data.charCodeAt(0);
                                if (quot === data.charCodeAt(data.length - 1) &&
                                    isQuote(quot)) {
                                    data = data.slice(1, -1);
                                }
                            }
                            data = unescapeCSS(data);
                        }
                    }
                    tokens.push({ type: SelectorType.Pseudo, name, data });
                    break;
                }
                case 44 /* Comma */: {
                    finalizeSubselector();
                    tokens = [];
                    stripWhitespace(1);
                    break;
                }
                default: {
                    if (selector.startsWith("/*", selectorIndex)) {
                        const endIndex = selector.indexOf("*/", selectorIndex + 2);
                        if (endIndex < 0) {
                            throw new Error("Comment was not terminated");
                        }
                        selectorIndex = endIndex + 2;
                        // Remove leading whitespace
                        if (tokens.length === 0) {
                            stripWhitespace(0);
                        }
                        break;
                    }
                    let namespace = null;
                    let name;
                    if (firstChar === 42 /* Asterisk */) {
                        selectorIndex += 1;
                        name = "*";
                    }
                    else if (firstChar === 124 /* Pipe */) {
                        name = "";
                        if (selector.charCodeAt(selectorIndex + 1) === 124 /* Pipe */) {
                            addTraversal(SelectorType.ColumnCombinator);
                            stripWhitespace(2);
                            break;
                        }
                    }
                    else if (reName.test(selector.slice(selectorIndex))) {
                        name = getName(0);
                    }
                    else {
                        break loop;
                    }
                    if (selector.charCodeAt(selectorIndex) === 124 /* Pipe */ &&
                        selector.charCodeAt(selectorIndex + 1) !== 124 /* Pipe */) {
                        namespace = name;
                        if (selector.charCodeAt(selectorIndex + 1) ===
                            42 /* Asterisk */) {
                            name = "*";
                            selectorIndex += 2;
                        }
                        else {
                            name = getName(1);
                        }
                    }
                    tokens.push(name === "*"
                        ? { type: SelectorType.Universal, namespace }
                        : { type: SelectorType.Tag, name, namespace });
                }
            }
        }
        finalizeSubselector();
        return selectorIndex;
    }

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    var boolbase$1;
    var hasRequiredBoolbase;

    function requireBoolbase () {
    	if (hasRequiredBoolbase) return boolbase$1;
    	hasRequiredBoolbase = 1;
    	boolbase$1 = {
    		trueFunc: function trueFunc(){
    			return true;
    		},
    		falseFunc: function falseFunc(){
    			return false;
    		}
    	};
    	return boolbase$1;
    }

    var boolbaseExports = requireBoolbase();
    var boolbase = /*@__PURE__*/getDefaultExportFromCjs(boolbaseExports);

    const procedure = new Map([
        [SelectorType.Universal, 50],
        [SelectorType.Tag, 30],
        [SelectorType.Attribute, 1],
        [SelectorType.Pseudo, 0],
    ]);
    function isTraversal(token) {
        return !procedure.has(token.type);
    }
    const attributes = new Map([
        [AttributeAction.Exists, 10],
        [AttributeAction.Equals, 8],
        [AttributeAction.Not, 7],
        [AttributeAction.Start, 6],
        [AttributeAction.End, 6],
        [AttributeAction.Any, 5],
    ]);
    /**
     * Sort the parts of the passed selector,
     * as there is potential for optimization
     * (some types of selectors are faster than others)
     *
     * @param arr Selector to sort
     */
    function sortByProcedure(arr) {
        const procs = arr.map(getProcedure);
        for (let i = 1; i < arr.length; i++) {
            const procNew = procs[i];
            if (procNew < 0)
                continue;
            for (let j = i - 1; j >= 0 && procNew < procs[j]; j--) {
                const token = arr[j + 1];
                arr[j + 1] = arr[j];
                arr[j] = token;
                procs[j + 1] = procs[j];
                procs[j] = procNew;
            }
        }
    }
    function getProcedure(token) {
        var _a, _b;
        let proc = (_a = procedure.get(token.type)) !== null && _a !== void 0 ? _a : -1;
        if (token.type === SelectorType.Attribute) {
            proc = (_b = attributes.get(token.action)) !== null && _b !== void 0 ? _b : 4;
            if (token.action === AttributeAction.Equals && token.name === "id") {
                // Prefer ID selectors (eg. #ID)
                proc = 9;
            }
            if (token.ignoreCase) {
                /*
                 * IgnoreCase adds some overhead, prefer "normal" token
                 * this is a binary operation, to ensure it's still an int
                 */
                proc >>= 1;
            }
        }
        else if (token.type === SelectorType.Pseudo) {
            if (!token.data) {
                proc = 3;
            }
            else if (token.name === "has" || token.name === "contains") {
                proc = 0; // Expensive in any case
            }
            else if (Array.isArray(token.data)) {
                // Eg. :matches, :not
                proc = Math.min(...token.data.map((d) => Math.min(...d.map(getProcedure))));
                // If we have traversals, try to avoid executing this selector
                if (proc < 0) {
                    proc = 0;
                }
            }
            else {
                proc = 2;
            }
        }
        return proc;
    }

    /**
     * All reserved characters in a regex, used for escaping.
     *
     * Taken from XRegExp, (c) 2007-2020 Steven Levithan under the MIT license
     * https://github.com/slevithan/xregexp/blob/95eeebeb8fac8754d54eafe2b4743661ac1cf028/src/xregexp.js#L794
     */
    const reChars = /[-[\]{}()*+?.,\\^$|#\s]/g;
    function escapeRegex(value) {
        return value.replace(reChars, "\\$&");
    }
    /**
     * Attributes that are case-insensitive in HTML.
     *
     * @private
     * @see https://html.spec.whatwg.org/multipage/semantics-other.html#case-sensitivity-of-selectors
     */
    const caseInsensitiveAttributes = new Set([
        "accept",
        "accept-charset",
        "align",
        "alink",
        "axis",
        "bgcolor",
        "charset",
        "checked",
        "clear",
        "codetype",
        "color",
        "compact",
        "declare",
        "defer",
        "dir",
        "direction",
        "disabled",
        "enctype",
        "face",
        "frame",
        "hreflang",
        "http-equiv",
        "lang",
        "language",
        "link",
        "media",
        "method",
        "multiple",
        "nohref",
        "noresize",
        "noshade",
        "nowrap",
        "readonly",
        "rel",
        "rev",
        "rules",
        "scope",
        "scrolling",
        "selected",
        "shape",
        "target",
        "text",
        "type",
        "valign",
        "valuetype",
        "vlink",
    ]);
    function shouldIgnoreCase(selector, options) {
        return typeof selector.ignoreCase === "boolean"
            ? selector.ignoreCase
            : selector.ignoreCase === "quirks"
                ? !!options.quirksMode
                : !options.xmlMode && caseInsensitiveAttributes.has(selector.name);
    }
    /**
     * Attribute selectors
     */
    const attributeRules = {
        equals(next, data, options) {
            const { adapter } = options;
            const { name } = data;
            let { value } = data;
            if (shouldIgnoreCase(data, options)) {
                value = value.toLowerCase();
                return (elem) => {
                    const attr = adapter.getAttributeValue(elem, name);
                    return (attr != null &&
                        attr.length === value.length &&
                        attr.toLowerCase() === value &&
                        next(elem));
                };
            }
            return (elem) => adapter.getAttributeValue(elem, name) === value && next(elem);
        },
        hyphen(next, data, options) {
            const { adapter } = options;
            const { name } = data;
            let { value } = data;
            const len = value.length;
            if (shouldIgnoreCase(data, options)) {
                value = value.toLowerCase();
                return function hyphenIC(elem) {
                    const attr = adapter.getAttributeValue(elem, name);
                    return (attr != null &&
                        (attr.length === len || attr.charAt(len) === "-") &&
                        attr.substr(0, len).toLowerCase() === value &&
                        next(elem));
                };
            }
            return function hyphen(elem) {
                const attr = adapter.getAttributeValue(elem, name);
                return (attr != null &&
                    (attr.length === len || attr.charAt(len) === "-") &&
                    attr.substr(0, len) === value &&
                    next(elem));
            };
        },
        element(next, data, options) {
            const { adapter } = options;
            const { name, value } = data;
            if (/\s/.test(value)) {
                return boolbase.falseFunc;
            }
            const regex = new RegExp(`(?:^|\\s)${escapeRegex(value)}(?:$|\\s)`, shouldIgnoreCase(data, options) ? "i" : "");
            return function element(elem) {
                const attr = adapter.getAttributeValue(elem, name);
                return (attr != null &&
                    attr.length >= value.length &&
                    regex.test(attr) &&
                    next(elem));
            };
        },
        exists(next, { name }, { adapter }) {
            return (elem) => adapter.hasAttrib(elem, name) && next(elem);
        },
        start(next, data, options) {
            const { adapter } = options;
            const { name } = data;
            let { value } = data;
            const len = value.length;
            if (len === 0) {
                return boolbase.falseFunc;
            }
            if (shouldIgnoreCase(data, options)) {
                value = value.toLowerCase();
                return (elem) => {
                    const attr = adapter.getAttributeValue(elem, name);
                    return (attr != null &&
                        attr.length >= len &&
                        attr.substr(0, len).toLowerCase() === value &&
                        next(elem));
                };
            }
            return (elem) => {
                var _a;
                return !!((_a = adapter.getAttributeValue(elem, name)) === null || _a === void 0 ? void 0 : _a.startsWith(value)) &&
                    next(elem);
            };
        },
        end(next, data, options) {
            const { adapter } = options;
            const { name } = data;
            let { value } = data;
            const len = -value.length;
            if (len === 0) {
                return boolbase.falseFunc;
            }
            if (shouldIgnoreCase(data, options)) {
                value = value.toLowerCase();
                return (elem) => {
                    var _a;
                    return ((_a = adapter
                        .getAttributeValue(elem, name)) === null || _a === void 0 ? void 0 : _a.substr(len).toLowerCase()) === value && next(elem);
                };
            }
            return (elem) => {
                var _a;
                return !!((_a = adapter.getAttributeValue(elem, name)) === null || _a === void 0 ? void 0 : _a.endsWith(value)) &&
                    next(elem);
            };
        },
        any(next, data, options) {
            const { adapter } = options;
            const { name, value } = data;
            if (value === "") {
                return boolbase.falseFunc;
            }
            if (shouldIgnoreCase(data, options)) {
                const regex = new RegExp(escapeRegex(value), "i");
                return function anyIC(elem) {
                    const attr = adapter.getAttributeValue(elem, name);
                    return (attr != null &&
                        attr.length >= value.length &&
                        regex.test(attr) &&
                        next(elem));
                };
            }
            return (elem) => {
                var _a;
                return !!((_a = adapter.getAttributeValue(elem, name)) === null || _a === void 0 ? void 0 : _a.includes(value)) &&
                    next(elem);
            };
        },
        not(next, data, options) {
            const { adapter } = options;
            const { name } = data;
            let { value } = data;
            if (value === "") {
                return (elem) => !!adapter.getAttributeValue(elem, name) && next(elem);
            }
            else if (shouldIgnoreCase(data, options)) {
                value = value.toLowerCase();
                return (elem) => {
                    const attr = adapter.getAttributeValue(elem, name);
                    return ((attr == null ||
                        attr.length !== value.length ||
                        attr.toLowerCase() !== value) &&
                        next(elem));
                };
            }
            return (elem) => adapter.getAttributeValue(elem, name) !== value && next(elem);
        },
    };

    // Following http://www.w3.org/TR/css3-selectors/#nth-child-pseudo
    // Whitespace as per https://www.w3.org/TR/selectors-3/#lex is " \t\r\n\f"
    const whitespace = new Set([9, 10, 12, 13, 32]);
    const ZERO = "0".charCodeAt(0);
    const NINE = "9".charCodeAt(0);
    /**
     * Parses an expression.
     *
     * @throws An `Error` if parsing fails.
     * @returns An array containing the integer step size and the integer offset of the nth rule.
     * @example nthCheck.parse("2n+3"); // returns [2, 3]
     */
    function parse$3(formula) {
        formula = formula.trim().toLowerCase();
        if (formula === "even") {
            return [2, 0];
        }
        else if (formula === "odd") {
            return [2, 1];
        }
        // Parse [ ['-'|'+']? INTEGER? {N} [ S* ['-'|'+'] S* INTEGER ]?
        let idx = 0;
        let a = 0;
        let sign = readSign();
        let number = readNumber();
        if (idx < formula.length && formula.charAt(idx) === "n") {
            idx++;
            a = sign * (number !== null && number !== void 0 ? number : 1);
            skipWhitespace();
            if (idx < formula.length) {
                sign = readSign();
                skipWhitespace();
                number = readNumber();
            }
            else {
                sign = number = 0;
            }
        }
        // Throw if there is anything else
        if (number === null || idx < formula.length) {
            throw new Error(`n-th rule couldn't be parsed ('${formula}')`);
        }
        return [a, sign * number];
        function readSign() {
            if (formula.charAt(idx) === "-") {
                idx++;
                return -1;
            }
            if (formula.charAt(idx) === "+") {
                idx++;
            }
            return 1;
        }
        function readNumber() {
            const start = idx;
            let value = 0;
            while (idx < formula.length &&
                formula.charCodeAt(idx) >= ZERO &&
                formula.charCodeAt(idx) <= NINE) {
                value = value * 10 + (formula.charCodeAt(idx) - ZERO);
                idx++;
            }
            // Return `null` if we didn't read anything.
            return idx === start ? null : value;
        }
        function skipWhitespace() {
            while (idx < formula.length &&
                whitespace.has(formula.charCodeAt(idx))) {
                idx++;
            }
        }
    }

    /**
     * Returns a function that checks if an elements index matches the given rule
     * highly optimized to return the fastest solution.
     *
     * @param parsed A tuple [a, b], as returned by `parse`.
     * @returns A highly optimized function that returns whether an index matches the nth-check.
     * @example
     *
     * ```js
     * const check = nthCheck.compile([2, 3]);
     *
     * check(0); // `false`
     * check(1); // `false`
     * check(2); // `true`
     * check(3); // `false`
     * check(4); // `true`
     * check(5); // `false`
     * check(6); // `true`
     * ```
     */
    function compile(parsed) {
        const a = parsed[0];
        // Subtract 1 from `b`, to convert from one- to zero-indexed.
        const b = parsed[1] - 1;
        /*
         * When `b <= 0`, `a * n` won't be lead to any matches for `a < 0`.
         * Besides, the specification states that no elements are
         * matched when `a` and `b` are 0.
         *
         * `b < 0` here as we subtracted 1 from `b` above.
         */
        if (b < 0 && a <= 0)
            return boolbase.falseFunc;
        // When `a` is in the range -1..1, it matches any element (so only `b` is checked).
        if (a === -1)
            return (index) => index <= b;
        if (a === 0)
            return (index) => index === b;
        // When `b <= 0` and `a === 1`, they match any element.
        if (a === 1)
            return b < 0 ? boolbase.trueFunc : (index) => index >= b;
        /*
         * Otherwise, modulo can be used to check if there is a match.
         *
         * Modulo doesn't care about the sign, so let's use `a`s absolute value.
         */
        const absA = Math.abs(a);
        // Get `b mod a`, + a if this is negative.
        const bMod = ((b % absA) + absA) % absA;
        return a > 1
            ? (index) => index >= b && index % absA === bMod
            : (index) => index <= b && index % absA === bMod;
    }

    /**
     * Parses and compiles a formula to a highly optimized function.
     * Combination of {@link parse} and {@link compile}.
     *
     * If the formula doesn't match any elements,
     * it returns [`boolbase`](https://github.com/fb55/boolbase)'s `falseFunc`.
     * Otherwise, a function accepting an _index_ is returned, which returns
     * whether or not the passed _index_ matches the formula.
     *
     * Note: The nth-rule starts counting at `1`, the returned function at `0`.
     *
     * @param formula The formula to compile.
     * @example
     * const check = nthCheck("2n+3");
     *
     * check(0); // `false`
     * check(1); // `false`
     * check(2); // `true`
     * check(3); // `false`
     * check(4); // `true`
     * check(5); // `false`
     * check(6); // `true`
     */
    function nthCheck(formula) {
        return compile(parse$3(formula));
    }

    function getChildFunc(next, adapter) {
        return (elem) => {
            const parent = adapter.getParent(elem);
            return parent != null && adapter.isTag(parent) && next(elem);
        };
    }
    const filters = {
        contains(next, text, { adapter }) {
            return function contains(elem) {
                return next(elem) && adapter.getText(elem).includes(text);
            };
        },
        icontains(next, text, { adapter }) {
            const itext = text.toLowerCase();
            return function icontains(elem) {
                return (next(elem) &&
                    adapter.getText(elem).toLowerCase().includes(itext));
            };
        },
        // Location specific methods
        "nth-child"(next, rule, { adapter, equals }) {
            const func = nthCheck(rule);
            if (func === boolbase.falseFunc)
                return boolbase.falseFunc;
            if (func === boolbase.trueFunc)
                return getChildFunc(next, adapter);
            return function nthChild(elem) {
                const siblings = adapter.getSiblings(elem);
                let pos = 0;
                for (let i = 0; i < siblings.length; i++) {
                    if (equals(elem, siblings[i]))
                        break;
                    if (adapter.isTag(siblings[i])) {
                        pos++;
                    }
                }
                return func(pos) && next(elem);
            };
        },
        "nth-last-child"(next, rule, { adapter, equals }) {
            const func = nthCheck(rule);
            if (func === boolbase.falseFunc)
                return boolbase.falseFunc;
            if (func === boolbase.trueFunc)
                return getChildFunc(next, adapter);
            return function nthLastChild(elem) {
                const siblings = adapter.getSiblings(elem);
                let pos = 0;
                for (let i = siblings.length - 1; i >= 0; i--) {
                    if (equals(elem, siblings[i]))
                        break;
                    if (adapter.isTag(siblings[i])) {
                        pos++;
                    }
                }
                return func(pos) && next(elem);
            };
        },
        "nth-of-type"(next, rule, { adapter, equals }) {
            const func = nthCheck(rule);
            if (func === boolbase.falseFunc)
                return boolbase.falseFunc;
            if (func === boolbase.trueFunc)
                return getChildFunc(next, adapter);
            return function nthOfType(elem) {
                const siblings = adapter.getSiblings(elem);
                let pos = 0;
                for (let i = 0; i < siblings.length; i++) {
                    const currentSibling = siblings[i];
                    if (equals(elem, currentSibling))
                        break;
                    if (adapter.isTag(currentSibling) &&
                        adapter.getName(currentSibling) === adapter.getName(elem)) {
                        pos++;
                    }
                }
                return func(pos) && next(elem);
            };
        },
        "nth-last-of-type"(next, rule, { adapter, equals }) {
            const func = nthCheck(rule);
            if (func === boolbase.falseFunc)
                return boolbase.falseFunc;
            if (func === boolbase.trueFunc)
                return getChildFunc(next, adapter);
            return function nthLastOfType(elem) {
                const siblings = adapter.getSiblings(elem);
                let pos = 0;
                for (let i = siblings.length - 1; i >= 0; i--) {
                    const currentSibling = siblings[i];
                    if (equals(elem, currentSibling))
                        break;
                    if (adapter.isTag(currentSibling) &&
                        adapter.getName(currentSibling) === adapter.getName(elem)) {
                        pos++;
                    }
                }
                return func(pos) && next(elem);
            };
        },
        // TODO determine the actual root element
        root(next, _rule, { adapter }) {
            return (elem) => {
                const parent = adapter.getParent(elem);
                return (parent == null || !adapter.isTag(parent)) && next(elem);
            };
        },
        scope(next, rule, options, context) {
            const { equals } = options;
            if (!context || context.length === 0) {
                // Equivalent to :root
                return filters["root"](next, rule, options);
            }
            if (context.length === 1) {
                // NOTE: can't be unpacked, as :has uses this for side-effects
                return (elem) => equals(context[0], elem) && next(elem);
            }
            return (elem) => context.includes(elem) && next(elem);
        },
        hover: dynamicStatePseudo("isHovered"),
        visited: dynamicStatePseudo("isVisited"),
        active: dynamicStatePseudo("isActive"),
    };
    /**
     * Dynamic state pseudos. These depend on optional Adapter methods.
     *
     * @param name The name of the adapter method to call.
     * @returns Pseudo for the `filters` object.
     */
    function dynamicStatePseudo(name) {
        return function dynamicPseudo(next, _rule, { adapter }) {
            const func = adapter[name];
            if (typeof func !== "function") {
                return boolbase.falseFunc;
            }
            return function active(elem) {
                return func(elem) && next(elem);
            };
        };
    }

    // While filters are precompiled, pseudos get called when they are needed
    const pseudos = {
        empty(elem, { adapter }) {
            return !adapter.getChildren(elem).some((elem) => 
            // FIXME: `getText` call is potentially expensive.
            adapter.isTag(elem) || adapter.getText(elem) !== "");
        },
        "first-child"(elem, { adapter, equals }) {
            if (adapter.prevElementSibling) {
                return adapter.prevElementSibling(elem) == null;
            }
            const firstChild = adapter
                .getSiblings(elem)
                .find((elem) => adapter.isTag(elem));
            return firstChild != null && equals(elem, firstChild);
        },
        "last-child"(elem, { adapter, equals }) {
            const siblings = adapter.getSiblings(elem);
            for (let i = siblings.length - 1; i >= 0; i--) {
                if (equals(elem, siblings[i]))
                    return true;
                if (adapter.isTag(siblings[i]))
                    break;
            }
            return false;
        },
        "first-of-type"(elem, { adapter, equals }) {
            const siblings = adapter.getSiblings(elem);
            const elemName = adapter.getName(elem);
            for (let i = 0; i < siblings.length; i++) {
                const currentSibling = siblings[i];
                if (equals(elem, currentSibling))
                    return true;
                if (adapter.isTag(currentSibling) &&
                    adapter.getName(currentSibling) === elemName) {
                    break;
                }
            }
            return false;
        },
        "last-of-type"(elem, { adapter, equals }) {
            const siblings = adapter.getSiblings(elem);
            const elemName = adapter.getName(elem);
            for (let i = siblings.length - 1; i >= 0; i--) {
                const currentSibling = siblings[i];
                if (equals(elem, currentSibling))
                    return true;
                if (adapter.isTag(currentSibling) &&
                    adapter.getName(currentSibling) === elemName) {
                    break;
                }
            }
            return false;
        },
        "only-of-type"(elem, { adapter, equals }) {
            const elemName = adapter.getName(elem);
            return adapter
                .getSiblings(elem)
                .every((sibling) => equals(elem, sibling) ||
                !adapter.isTag(sibling) ||
                adapter.getName(sibling) !== elemName);
        },
        "only-child"(elem, { adapter, equals }) {
            return adapter
                .getSiblings(elem)
                .every((sibling) => equals(elem, sibling) || !adapter.isTag(sibling));
        },
    };
    function verifyPseudoArgs(func, name, subselect, argIndex) {
        if (subselect === null) {
            if (func.length > argIndex) {
                throw new Error(`Pseudo-class :${name} requires an argument`);
            }
        }
        else if (func.length === argIndex) {
            throw new Error(`Pseudo-class :${name} doesn't have any arguments`);
        }
    }

    /**
     * Aliases are pseudos that are expressed as selectors.
     */
    const aliases = {
        // Links
        "any-link": ":is(a, area, link)[href]",
        link: ":any-link:not(:visited)",
        // Forms
        // https://html.spec.whatwg.org/multipage/scripting.html#disabled-elements
        disabled: `:is(
        :is(button, input, select, textarea, optgroup, option)[disabled],
        optgroup[disabled] > option,
        fieldset[disabled]:not(fieldset[disabled] legend:first-of-type *)
    )`,
        enabled: ":not(:disabled)",
        checked: ":is(:is(input[type=radio], input[type=checkbox])[checked], option:selected)",
        required: ":is(input, select, textarea)[required]",
        optional: ":is(input, select, textarea):not([required])",
        // JQuery extensions
        // https://html.spec.whatwg.org/multipage/form-elements.html#concept-option-selectedness
        selected: "option:is([selected], select:not([multiple]):not(:has(> option[selected])) > :first-of-type)",
        checkbox: "[type=checkbox]",
        file: "[type=file]",
        password: "[type=password]",
        radio: "[type=radio]",
        reset: "[type=reset]",
        image: "[type=image]",
        submit: "[type=submit]",
        parent: ":not(:empty)",
        header: ":is(h1, h2, h3, h4, h5, h6)",
        button: ":is(button, input[type=button])",
        input: ":is(input, textarea, select, button)",
        text: "input:is(:not([type!='']), [type=text])",
    };

    /** Used as a placeholder for :has. Will be replaced with the actual element. */
    const PLACEHOLDER_ELEMENT = {};
    function ensureIsTag(next, adapter) {
        if (next === boolbase.falseFunc)
            return boolbase.falseFunc;
        return (elem) => adapter.isTag(elem) && next(elem);
    }
    function getNextSiblings(elem, adapter) {
        const siblings = adapter.getSiblings(elem);
        if (siblings.length <= 1)
            return [];
        const elemIndex = siblings.indexOf(elem);
        if (elemIndex < 0 || elemIndex === siblings.length - 1)
            return [];
        return siblings.slice(elemIndex + 1).filter(adapter.isTag);
    }
    function copyOptions(options) {
        // Not copied: context, rootFunc
        return {
            xmlMode: !!options.xmlMode,
            lowerCaseAttributeNames: !!options.lowerCaseAttributeNames,
            lowerCaseTags: !!options.lowerCaseTags,
            quirksMode: !!options.quirksMode,
            cacheResults: !!options.cacheResults,
            pseudos: options.pseudos,
            adapter: options.adapter,
            equals: options.equals,
        };
    }
    const is$2 = (next, token, options, context, compileToken) => {
        const func = compileToken(token, copyOptions(options), context);
        return func === boolbase.trueFunc
            ? next
            : func === boolbase.falseFunc
                ? boolbase.falseFunc
                : (elem) => func(elem) && next(elem);
    };
    /*
     * :not, :has, :is, :matches and :where have to compile selectors
     * doing this in src/pseudos.ts would lead to circular dependencies,
     * so we add them here
     */
    const subselects = {
        is: is$2,
        /**
         * `:matches` and `:where` are aliases for `:is`.
         */
        matches: is$2,
        where: is$2,
        not(next, token, options, context, compileToken) {
            const func = compileToken(token, copyOptions(options), context);
            return func === boolbase.falseFunc
                ? next
                : func === boolbase.trueFunc
                    ? boolbase.falseFunc
                    : (elem) => !func(elem) && next(elem);
        },
        has(next, subselect, options, _context, compileToken) {
            const { adapter } = options;
            const opts = copyOptions(options);
            opts.relativeSelector = true;
            const context = subselect.some((s) => s.some(isTraversal))
                ? // Used as a placeholder. Will be replaced with the actual element.
                    [PLACEHOLDER_ELEMENT]
                : undefined;
            const compiled = compileToken(subselect, opts, context);
            if (compiled === boolbase.falseFunc)
                return boolbase.falseFunc;
            const hasElement = ensureIsTag(compiled, adapter);
            // If `compiled` is `trueFunc`, we can skip this.
            if (context && compiled !== boolbase.trueFunc) {
                /*
                 * `shouldTestNextSiblings` will only be true if the query starts with
                 * a traversal (sibling or adjacent). That means we will always have a context.
                 */
                const { shouldTestNextSiblings = false } = compiled;
                return (elem) => {
                    if (!next(elem))
                        return false;
                    context[0] = elem;
                    const childs = adapter.getChildren(elem);
                    const nextElements = shouldTestNextSiblings
                        ? [...childs, ...getNextSiblings(elem, adapter)]
                        : childs;
                    return adapter.existsOne(hasElement, nextElements);
                };
            }
            return (elem) => next(elem) &&
                adapter.existsOne(hasElement, adapter.getChildren(elem));
        },
    };

    function compilePseudoSelector(next, selector, options, context, compileToken) {
        var _a;
        const { name, data } = selector;
        if (Array.isArray(data)) {
            if (!(name in subselects)) {
                throw new Error(`Unknown pseudo-class :${name}(${data})`);
            }
            return subselects[name](next, data, options, context, compileToken);
        }
        const userPseudo = (_a = options.pseudos) === null || _a === void 0 ? void 0 : _a[name];
        const stringPseudo = typeof userPseudo === "string" ? userPseudo : aliases[name];
        if (typeof stringPseudo === "string") {
            if (data != null) {
                throw new Error(`Pseudo ${name} doesn't have any arguments`);
            }
            // The alias has to be parsed here, to make sure options are respected.
            const alias = parse$4(stringPseudo);
            return subselects["is"](next, alias, options, context, compileToken);
        }
        if (typeof userPseudo === "function") {
            verifyPseudoArgs(userPseudo, name, data, 1);
            return (elem) => userPseudo(elem, data) && next(elem);
        }
        if (name in filters) {
            return filters[name](next, data, options, context);
        }
        if (name in pseudos) {
            const pseudo = pseudos[name];
            verifyPseudoArgs(pseudo, name, data, 2);
            return (elem) => pseudo(elem, options, data) && next(elem);
        }
        throw new Error(`Unknown pseudo-class :${name}`);
    }

    function getElementParent(node, adapter) {
        const parent = adapter.getParent(node);
        if (parent && adapter.isTag(parent)) {
            return parent;
        }
        return null;
    }
    /*
     * All available rules
     */
    function compileGeneralSelector(next, selector, options, context, compileToken) {
        const { adapter, equals } = options;
        switch (selector.type) {
            case SelectorType.PseudoElement: {
                throw new Error("Pseudo-elements are not supported by css-select");
            }
            case SelectorType.ColumnCombinator: {
                throw new Error("Column combinators are not yet supported by css-select");
            }
            case SelectorType.Attribute: {
                if (selector.namespace != null) {
                    throw new Error("Namespaced attributes are not yet supported by css-select");
                }
                if (!options.xmlMode || options.lowerCaseAttributeNames) {
                    selector.name = selector.name.toLowerCase();
                }
                return attributeRules[selector.action](next, selector, options);
            }
            case SelectorType.Pseudo: {
                return compilePseudoSelector(next, selector, options, context, compileToken);
            }
            // Tags
            case SelectorType.Tag: {
                if (selector.namespace != null) {
                    throw new Error("Namespaced tag names are not yet supported by css-select");
                }
                let { name } = selector;
                if (!options.xmlMode || options.lowerCaseTags) {
                    name = name.toLowerCase();
                }
                return function tag(elem) {
                    return adapter.getName(elem) === name && next(elem);
                };
            }
            // Traversal
            case SelectorType.Descendant: {
                if (options.cacheResults === false ||
                    typeof WeakSet === "undefined") {
                    return function descendant(elem) {
                        let current = elem;
                        while ((current = getElementParent(current, adapter))) {
                            if (next(current)) {
                                return true;
                            }
                        }
                        return false;
                    };
                }
                // @ts-expect-error `ElementNode` is not extending object
                const isFalseCache = new WeakSet();
                return function cachedDescendant(elem) {
                    let current = elem;
                    while ((current = getElementParent(current, adapter))) {
                        if (!isFalseCache.has(current)) {
                            if (adapter.isTag(current) && next(current)) {
                                return true;
                            }
                            isFalseCache.add(current);
                        }
                    }
                    return false;
                };
            }
            case "_flexibleDescendant": {
                // Include element itself, only used while querying an array
                return function flexibleDescendant(elem) {
                    let current = elem;
                    do {
                        if (next(current))
                            return true;
                    } while ((current = getElementParent(current, adapter)));
                    return false;
                };
            }
            case SelectorType.Parent: {
                return function parent(elem) {
                    return adapter
                        .getChildren(elem)
                        .some((elem) => adapter.isTag(elem) && next(elem));
                };
            }
            case SelectorType.Child: {
                return function child(elem) {
                    const parent = adapter.getParent(elem);
                    return parent != null && adapter.isTag(parent) && next(parent);
                };
            }
            case SelectorType.Sibling: {
                return function sibling(elem) {
                    const siblings = adapter.getSiblings(elem);
                    for (let i = 0; i < siblings.length; i++) {
                        const currentSibling = siblings[i];
                        if (equals(elem, currentSibling))
                            break;
                        if (adapter.isTag(currentSibling) && next(currentSibling)) {
                            return true;
                        }
                    }
                    return false;
                };
            }
            case SelectorType.Adjacent: {
                if (adapter.prevElementSibling) {
                    return function adjacent(elem) {
                        const previous = adapter.prevElementSibling(elem);
                        return previous != null && next(previous);
                    };
                }
                return function adjacent(elem) {
                    const siblings = adapter.getSiblings(elem);
                    let lastElement;
                    for (let i = 0; i < siblings.length; i++) {
                        const currentSibling = siblings[i];
                        if (equals(elem, currentSibling))
                            break;
                        if (adapter.isTag(currentSibling)) {
                            lastElement = currentSibling;
                        }
                    }
                    return !!lastElement && next(lastElement);
                };
            }
            case SelectorType.Universal: {
                if (selector.namespace != null && selector.namespace !== "*") {
                    throw new Error("Namespaced universal selectors are not yet supported by css-select");
                }
                return next;
            }
        }
    }

    function includesScopePseudo(t) {
        return (t.type === SelectorType.Pseudo &&
            (t.name === "scope" ||
                (Array.isArray(t.data) &&
                    t.data.some((data) => data.some(includesScopePseudo)))));
    }
    const DESCENDANT_TOKEN = { type: SelectorType.Descendant };
    const FLEXIBLE_DESCENDANT_TOKEN = {
        type: "_flexibleDescendant",
    };
    const SCOPE_TOKEN = {
        type: SelectorType.Pseudo,
        name: "scope",
        data: null,
    };
    /*
     * CSS 4 Spec (Draft): 3.4.1. Absolutizing a Relative Selector
     * http://www.w3.org/TR/selectors4/#absolutizing
     */
    function absolutize(token, { adapter }, context) {
        // TODO Use better check if the context is a document
        const hasContext = !!(context === null || context === void 0 ? void 0 : context.every((e) => {
            const parent = adapter.isTag(e) && adapter.getParent(e);
            return e === PLACEHOLDER_ELEMENT || (parent && adapter.isTag(parent));
        }));
        for (const t of token) {
            if (t.length > 0 &&
                isTraversal(t[0]) &&
                t[0].type !== SelectorType.Descendant) ;
            else if (hasContext && !t.some(includesScopePseudo)) {
                t.unshift(DESCENDANT_TOKEN);
            }
            else {
                continue;
            }
            t.unshift(SCOPE_TOKEN);
        }
    }
    function compileToken(token, options, context) {
        var _a;
        token.forEach(sortByProcedure);
        context = (_a = options.context) !== null && _a !== void 0 ? _a : context;
        const isArrayContext = Array.isArray(context);
        const finalContext = context && (Array.isArray(context) ? context : [context]);
        // Check if the selector is relative
        if (options.relativeSelector !== false) {
            absolutize(token, options, finalContext);
        }
        else if (token.some((t) => t.length > 0 && isTraversal(t[0]))) {
            throw new Error("Relative selectors are not allowed when the `relativeSelector` option is disabled");
        }
        let shouldTestNextSiblings = false;
        const query = token
            .map((rules) => {
            if (rules.length >= 2) {
                const [first, second] = rules;
                if (first.type !== SelectorType.Pseudo ||
                    first.name !== "scope") ;
                else if (isArrayContext &&
                    second.type === SelectorType.Descendant) {
                    rules[1] = FLEXIBLE_DESCENDANT_TOKEN;
                }
                else if (second.type === SelectorType.Adjacent ||
                    second.type === SelectorType.Sibling) {
                    shouldTestNextSiblings = true;
                }
            }
            return compileRules(rules, options, finalContext);
        })
            .reduce(reduceRules, boolbase.falseFunc);
        query.shouldTestNextSiblings = shouldTestNextSiblings;
        return query;
    }
    function compileRules(rules, options, context) {
        var _a;
        return rules.reduce((previous, rule) => previous === boolbase.falseFunc
            ? boolbase.falseFunc
            : compileGeneralSelector(previous, rule, options, context, compileToken), (_a = options.rootFunc) !== null && _a !== void 0 ? _a : boolbase.trueFunc);
    }
    function reduceRules(a, b) {
        if (b === boolbase.falseFunc || a === boolbase.trueFunc) {
            return a;
        }
        if (a === boolbase.falseFunc || b === boolbase.trueFunc) {
            return b;
        }
        return function combine(elem) {
            return a(elem) || b(elem);
        };
    }

    const defaultEquals = (a, b) => a === b;
    const defaultOptions = {
        adapter: DomUtils,
        equals: defaultEquals,
    };
    function convertOptionFormats(options) {
        var _a, _b, _c, _d;
        /*
         * We force one format of options to the other one.
         */
        // @ts-expect-error Default options may have incompatible `Node` / `ElementNode`.
        const opts = options !== null && options !== void 0 ? options : defaultOptions;
        // @ts-expect-error Same as above.
        (_a = opts.adapter) !== null && _a !== void 0 ? _a : (opts.adapter = DomUtils);
        // @ts-expect-error `equals` does not exist on `Options`
        (_b = opts.equals) !== null && _b !== void 0 ? _b : (opts.equals = (_d = (_c = opts.adapter) === null || _c === void 0 ? void 0 : _c.equals) !== null && _d !== void 0 ? _d : defaultEquals);
        return opts;
    }
    function wrapCompile(func) {
        return function addAdapter(selector, options, context) {
            const opts = convertOptionFormats(options);
            return func(selector, opts, context);
        };
    }
    const _compileToken = wrapCompile(compileToken);
    function prepareContext(elems, adapter, shouldTestNextSiblings = false) {
        /*
         * Add siblings if the query requires them.
         * See https://github.com/fb55/css-select/pull/43#issuecomment-225414692
         */
        if (shouldTestNextSiblings) {
            elems = appendNextSiblings(elems, adapter);
        }
        return Array.isArray(elems)
            ? adapter.removeSubsets(elems)
            : adapter.getChildren(elems);
    }
    function appendNextSiblings(elem, adapter) {
        // Order matters because jQuery seems to check the children before the siblings
        const elems = Array.isArray(elem) ? elem.slice(0) : [elem];
        const elemsLength = elems.length;
        for (let i = 0; i < elemsLength; i++) {
            const nextSiblings = getNextSiblings(elems[i], adapter);
            elems.push(...nextSiblings);
        }
        return elems;
    }

    const filterNames = new Set([
        "first",
        "last",
        "eq",
        "gt",
        "nth",
        "lt",
        "even",
        "odd",
    ]);
    function isFilter(s) {
        if (s.type !== "pseudo")
            return false;
        if (filterNames.has(s.name))
            return true;
        if (s.name === "not" && Array.isArray(s.data)) {
            // Only consider `:not` with embedded filters
            return s.data.some((s) => s.some(isFilter));
        }
        return false;
    }
    function getLimit(filter, data, partLimit) {
        const num = data != null ? parseInt(data, 10) : NaN;
        switch (filter) {
            case "first":
                return 1;
            case "nth":
            case "eq":
                return isFinite(num) ? (num >= 0 ? num + 1 : Infinity) : 0;
            case "lt":
                return isFinite(num)
                    ? num >= 0
                        ? Math.min(num, partLimit)
                        : Infinity
                    : 0;
            case "gt":
                return isFinite(num) ? Infinity : 0;
            case "odd":
                return 2 * partLimit;
            case "even":
                return 2 * partLimit - 1;
            case "last":
            case "not":
                return Infinity;
        }
    }

    function getDocumentRoot(node) {
        while (node.parent)
            node = node.parent;
        return node;
    }
    function groupSelectors(selectors) {
        const filteredSelectors = [];
        const plainSelectors = [];
        for (const selector of selectors) {
            if (selector.some(isFilter)) {
                filteredSelectors.push(selector);
            }
            else {
                plainSelectors.push(selector);
            }
        }
        return [plainSelectors, filteredSelectors];
    }

    const UNIVERSAL_SELECTOR = {
        type: SelectorType.Universal,
        namespace: null,
    };
    const SCOPE_PSEUDO = {
        type: SelectorType.Pseudo,
        name: "scope",
        data: null,
    };
    function is$1(element, selector, options = {}) {
        return some([element], selector, options);
    }
    function some(elements, selector, options = {}) {
        if (typeof selector === "function")
            return elements.some(selector);
        const [plain, filtered] = groupSelectors(parse$4(selector));
        return ((plain.length > 0 && elements.some(_compileToken(plain, options))) ||
            filtered.some((sel) => filterBySelector(sel, elements, options).length > 0));
    }
    function filterByPosition(filter, elems, data, options) {
        const num = typeof data === "string" ? parseInt(data, 10) : NaN;
        switch (filter) {
            case "first":
            case "lt":
                // Already done in `getLimit`
                return elems;
            case "last":
                return elems.length > 0 ? [elems[elems.length - 1]] : elems;
            case "nth":
            case "eq":
                return isFinite(num) && Math.abs(num) < elems.length
                    ? [num < 0 ? elems[elems.length + num] : elems[num]]
                    : [];
            case "gt":
                return isFinite(num) ? elems.slice(num + 1) : [];
            case "even":
                return elems.filter((_, i) => i % 2 === 0);
            case "odd":
                return elems.filter((_, i) => i % 2 === 1);
            case "not": {
                const filtered = new Set(filterParsed(data, elems, options));
                return elems.filter((e) => !filtered.has(e));
            }
        }
    }
    function filter$1(selector, elements, options = {}) {
        return filterParsed(parse$4(selector), elements, options);
    }
    /**
     * Filter a set of elements by a selector.
     *
     * Will return elements in the original order.
     *
     * @param selector Selector to filter by.
     * @param elements Elements to filter.
     * @param options Options for selector.
     */
    function filterParsed(selector, elements, options) {
        if (elements.length === 0)
            return [];
        const [plainSelectors, filteredSelectors] = groupSelectors(selector);
        let found;
        if (plainSelectors.length) {
            const filtered = filterElements(elements, plainSelectors, options);
            // If there are no filters, just return
            if (filteredSelectors.length === 0) {
                return filtered;
            }
            // Otherwise, we have to do some filtering
            if (filtered.length) {
                found = new Set(filtered);
            }
        }
        for (let i = 0; i < filteredSelectors.length && (found === null || found === void 0 ? void 0 : found.size) !== elements.length; i++) {
            const filteredSelector = filteredSelectors[i];
            const missing = found
                ? elements.filter((e) => isTag(e) && !found.has(e))
                : elements;
            if (missing.length === 0)
                break;
            const filtered = filterBySelector(filteredSelector, elements, options);
            if (filtered.length) {
                if (!found) {
                    /*
                     * If we haven't found anything before the last selector,
                     * just return what we found now.
                     */
                    if (i === filteredSelectors.length - 1) {
                        return filtered;
                    }
                    found = new Set(filtered);
                }
                else {
                    filtered.forEach((el) => found.add(el));
                }
            }
        }
        return typeof found !== "undefined"
            ? (found.size === elements.length
                ? elements
                : // Filter elements to preserve order
                    elements.filter((el) => found.has(el)))
            : [];
    }
    function filterBySelector(selector, elements, options) {
        var _a;
        if (selector.some(isTraversal$1)) {
            /*
             * Get root node, run selector with the scope
             * set to all of our nodes.
             */
            const root = (_a = options.root) !== null && _a !== void 0 ? _a : getDocumentRoot(elements[0]);
            const opts = { ...options, context: elements, relativeSelector: false };
            selector.push(SCOPE_PSEUDO);
            return findFilterElements(root, selector, opts, true, elements.length);
        }
        // Performance optimization: If we don't have to traverse, just filter set.
        return findFilterElements(elements, selector, options, false, elements.length);
    }
    function select(selector, root, options = {}, limit = Infinity) {
        if (typeof selector === "function") {
            return find$1(root, selector);
        }
        const [plain, filtered] = groupSelectors(parse$4(selector));
        const results = filtered.map((sel) => findFilterElements(root, sel, options, true, limit));
        // Plain selectors can be queried in a single go
        if (plain.length) {
            results.push(findElements(root, plain, options, limit));
        }
        if (results.length === 0) {
            return [];
        }
        // If there was only a single selector, just return the result
        if (results.length === 1) {
            return results[0];
        }
        // Sort results, filtering for duplicates
        return uniqueSort(results.reduce((a, b) => [...a, ...b]));
    }
    /**
     *
     * @param root Element(s) to search from.
     * @param selector Selector to look for.
     * @param options Options for querying.
     * @param queryForSelector Query multiple levels deep for the initial selector, even if it doesn't contain a traversal.
     */
    function findFilterElements(root, selector, options, queryForSelector, totalLimit) {
        const filterIndex = selector.findIndex(isFilter);
        const sub = selector.slice(0, filterIndex);
        const filter = selector[filterIndex];
        // If we are at the end of the selector, we can limit the number of elements to retrieve.
        const partLimit = selector.length - 1 === filterIndex ? totalLimit : Infinity;
        /*
         * Set the number of elements to retrieve.
         * Eg. for :first, we only have to get a single element.
         */
        const limit = getLimit(filter.name, filter.data, partLimit);
        if (limit === 0)
            return [];
        /*
         * Skip `findElements` call if our selector starts with a positional
         * pseudo.
         */
        const elemsNoLimit = sub.length === 0 && !Array.isArray(root)
            ? getChildren(root).filter(isTag)
            : sub.length === 0
                ? (Array.isArray(root) ? root : [root]).filter(isTag)
                : queryForSelector || sub.some(isTraversal$1)
                    ? findElements(root, [sub], options, limit)
                    : filterElements(root, [sub], options);
        const elems = elemsNoLimit.slice(0, limit);
        let result = filterByPosition(filter.name, elems, filter.data, options);
        if (result.length === 0 || selector.length === filterIndex + 1) {
            return result;
        }
        const remainingSelector = selector.slice(filterIndex + 1);
        const remainingHasTraversal = remainingSelector.some(isTraversal$1);
        if (remainingHasTraversal) {
            if (isTraversal$1(remainingSelector[0])) {
                const { type } = remainingSelector[0];
                if (type === SelectorType.Sibling ||
                    type === SelectorType.Adjacent) {
                    // If we have a sibling traversal, we need to also look at the siblings.
                    result = prepareContext(result, DomUtils, true);
                }
                // Avoid a traversal-first selector error.
                remainingSelector.unshift(UNIVERSAL_SELECTOR);
            }
            options = {
                ...options,
                // Avoid absolutizing the selector
                relativeSelector: false,
                /*
                 * Add a custom root func, to make sure traversals don't match elements
                 * that aren't a part of the considered tree.
                 */
                rootFunc: (el) => result.includes(el),
            };
        }
        else if (options.rootFunc && options.rootFunc !== boolbaseExports.trueFunc) {
            options = { ...options, rootFunc: boolbaseExports.trueFunc };
        }
        /*
         * If we have another filter, recursively call `findFilterElements`,
         * with the `recursive` flag disabled. We only have to look for more
         * elements when we see a traversal.
         *
         * Otherwise,
         */
        return remainingSelector.some(isFilter)
            ? findFilterElements(result, remainingSelector, options, false, totalLimit)
            : remainingHasTraversal
                ? // Query existing elements to resolve traversal.
                    findElements(result, [remainingSelector], options, totalLimit)
                : // If we don't have any more traversals, simply filter elements.
                    filterElements(result, [remainingSelector], options);
    }
    function findElements(root, sel, options, limit) {
        const query = _compileToken(sel, options, root);
        return find$1(root, query, limit);
    }
    function find$1(root, query, limit = Infinity) {
        const elems = prepareContext(root, DomUtils, query.shouldTestNextSiblings);
        return find$2((node) => isTag(node) && query(node), elems, true, limit);
    }
    function filterElements(elements, sel, options) {
        const els = (Array.isArray(elements) ? elements : [elements]).filter(isTag);
        if (els.length === 0)
            return els;
        const query = _compileToken(sel, options);
        return query === boolbaseExports.trueFunc ? els : els.filter(query);
    }

    /**
     * Methods for traversing the DOM structure.
     *
     * @module cheerio/traversing
     */
    const reContextSelector = /^\s*(?:[+~]|:scope\b)/;
    /**
     * Get the descendants of each element in the current set of matched elements,
     * filtered by a selector, jQuery object, or element.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('#fruits').find('li').length;
     * //=> 3
     * $('#fruits').find($('.apple')).length;
     * //=> 1
     * ```
     *
     * @param selectorOrHaystack - Element to look for.
     * @returns The found elements.
     * @see {@link https://api.jquery.com/find/}
     */
    function find(selectorOrHaystack) {
        if (!selectorOrHaystack) {
            return this._make([]);
        }
        if (typeof selectorOrHaystack !== 'string') {
            const haystack = isCheerio(selectorOrHaystack)
                ? selectorOrHaystack.toArray()
                : [selectorOrHaystack];
            const context = this.toArray();
            return this._make(haystack.filter((elem) => context.some((node) => contains(node, elem))));
        }
        return this._findBySelector(selectorOrHaystack, Number.POSITIVE_INFINITY);
    }
    /**
     * Find elements by a specific selector.
     *
     * @private
     * @category Traversing
     * @param selector - Selector to filter by.
     * @param limit - Maximum number of elements to match.
     * @returns The found elements.
     */
    function _findBySelector(selector, limit) {
        var _a;
        const context = this.toArray();
        const elems = reContextSelector.test(selector)
            ? context
            : this.children().toArray();
        const options = {
            context,
            root: (_a = this._root) === null || _a === void 0 ? void 0 : _a[0],
            // Pass options that are recognized by `cheerio-select`
            xmlMode: this.options.xmlMode,
            lowerCaseTags: this.options.lowerCaseTags,
            lowerCaseAttributeNames: this.options.lowerCaseAttributeNames,
            pseudos: this.options.pseudos,
            quirksMode: this.options.quirksMode,
        };
        return this._make(select(selector, elems, options, limit));
    }
    /**
     * Creates a matcher, using a particular mapping function. Matchers provide a
     * function that finds elements using a generating function, supporting
     * filtering.
     *
     * @private
     * @param matchMap - Mapping function.
     * @returns - Function for wrapping generating functions.
     */
    function _getMatcher(matchMap) {
        return function (fn, ...postFns) {
            return function (selector) {
                var _a;
                let matched = matchMap(fn, this);
                if (selector) {
                    matched = filterArray(matched, selector, this.options.xmlMode, (_a = this._root) === null || _a === void 0 ? void 0 : _a[0]);
                }
                return this._make(
                // Post processing is only necessary if there is more than one element.
                this.length > 1 && matched.length > 1
                    ? postFns.reduce((elems, fn) => fn(elems), matched)
                    : matched);
            };
        };
    }
    /** Matcher that adds multiple elements for each entry in the input. */
    const _matcher = _getMatcher((fn, elems) => {
        let ret = [];
        for (let i = 0; i < elems.length; i++) {
            const value = fn(elems[i]);
            if (value.length > 0)
                ret = ret.concat(value);
        }
        return ret;
    });
    /** Matcher that adds at most one element for each entry in the input. */
    const _singleMatcher = _getMatcher((fn, elems) => {
        const ret = [];
        for (let i = 0; i < elems.length; i++) {
            const value = fn(elems[i]);
            if (value !== null) {
                ret.push(value);
            }
        }
        return ret;
    });
    /**
     * Matcher that supports traversing until a condition is met.
     *
     * @param nextElem - Function that returns the next element.
     * @param postFns - Post processing functions.
     * @returns A function usable for `*Until` methods.
     */
    function _matchUntil(nextElem, ...postFns) {
        // We use a variable here that is used from within the matcher.
        let matches = null;
        const innerMatcher = _getMatcher((nextElem, elems) => {
            const matched = [];
            domEach(elems, (elem) => {
                for (let next; (next = nextElem(elem)); elem = next) {
                    // FIXME: `matched` might contain duplicates here and the index is too large.
                    if (matches === null || matches === void 0 ? void 0 : matches(next, matched.length))
                        break;
                    matched.push(next);
                }
            });
            return matched;
        })(nextElem, ...postFns);
        return function (selector, filterSelector) {
            // Override `matches` variable with the new target.
            matches =
                typeof selector === 'string'
                    ? (elem) => is$1(elem, selector, this.options)
                    : selector
                        ? getFilterFn(selector)
                        : null;
            const ret = innerMatcher.call(this, filterSelector);
            // Set `matches` to `null`, so we don't waste memory.
            matches = null;
            return ret;
        };
    }
    function _removeDuplicates(elems) {
        return elems.length > 1 ? Array.from(new Set(elems)) : elems;
    }
    /**
     * Get the parent of each element in the current set of matched elements,
     * optionally filtered by a selector.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('.pear').parent().attr('id');
     * //=> fruits
     * ```
     *
     * @param selector - If specified filter for parent.
     * @returns The parents.
     * @see {@link https://api.jquery.com/parent/}
     */
    const parent = _singleMatcher(({ parent }) => (parent && !isDocument(parent) ? parent : null), _removeDuplicates);
    /**
     * Get a set of parents filtered by `selector` of each element in the current
     * set of match elements.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('.orange').parents().length;
     * //=> 2
     * $('.orange').parents('#fruits').length;
     * //=> 1
     * ```
     *
     * @param selector - If specified filter for parents.
     * @returns The parents.
     * @see {@link https://api.jquery.com/parents/}
     */
    const parents = _matcher((elem) => {
        const matched = [];
        while (elem.parent && !isDocument(elem.parent)) {
            matched.push(elem.parent);
            elem = elem.parent;
        }
        return matched;
    }, uniqueSort, 
    // eslint-disable-next-line unicorn/no-array-reverse
    (elems) => elems.reverse());
    /**
     * Get the ancestors of each element in the current set of matched elements, up
     * to but not including the element matched by the selector, DOM node, or
     * cheerio object.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('.orange').parentsUntil('#food').length;
     * //=> 1
     * ```
     *
     * @param selector - Selector for element to stop at.
     * @param filterSelector - Optional filter for parents.
     * @returns The parents.
     * @see {@link https://api.jquery.com/parentsUntil/}
     */
    const parentsUntil = _matchUntil(({ parent }) => (parent && !isDocument(parent) ? parent : null), uniqueSort, 
    // eslint-disable-next-line unicorn/no-array-reverse
    (elems) => elems.reverse());
    /**
     * For each element in the set, get the first element that matches the selector
     * by testing the element itself and traversing up through its ancestors in the
     * DOM tree.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('.orange').closest();
     * //=> []
     *
     * $('.orange').closest('.apple');
     * // => []
     *
     * $('.orange').closest('li');
     * //=> [<li class="orange">Orange</li>]
     *
     * $('.orange').closest('#fruits');
     * //=> [<ul id="fruits"> ... </ul>]
     * ```
     *
     * @param selector - Selector for the element to find.
     * @returns The closest nodes.
     * @see {@link https://api.jquery.com/closest/}
     */
    function closest(selector) {
        var _a;
        const set = [];
        if (!selector) {
            return this._make(set);
        }
        const selectOpts = {
            xmlMode: this.options.xmlMode,
            root: (_a = this._root) === null || _a === void 0 ? void 0 : _a[0],
        };
        const selectFn = typeof selector === 'string'
            ? (elem) => is$1(elem, selector, selectOpts)
            : getFilterFn(selector);
        domEach(this, (elem) => {
            if (elem && !isDocument(elem) && !isTag(elem)) {
                elem = elem.parent;
            }
            while (elem && isTag(elem)) {
                if (selectFn(elem, 0)) {
                    // Do not add duplicate elements to the set
                    if (!set.includes(elem)) {
                        set.push(elem);
                    }
                    break;
                }
                elem = elem.parent;
            }
        });
        return this._make(set);
    }
    /**
     * Gets the next sibling of each selected element, optionally filtered by a
     * selector.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('.apple').next().hasClass('orange');
     * //=> true
     * ```
     *
     * @param selector - If specified filter for sibling.
     * @returns The next nodes.
     * @see {@link https://api.jquery.com/next/}
     */
    const next = _singleMatcher((elem) => nextElementSibling(elem));
    /**
     * Gets all the following siblings of the each selected element, optionally
     * filtered by a selector.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('.apple').nextAll();
     * //=> [<li class="orange">Orange</li>, <li class="pear">Pear</li>]
     * $('.apple').nextAll('.orange');
     * //=> [<li class="orange">Orange</li>]
     * ```
     *
     * @param selector - If specified filter for siblings.
     * @returns The next nodes.
     * @see {@link https://api.jquery.com/nextAll/}
     */
    const nextAll = _matcher((elem) => {
        const matched = [];
        while (elem.next) {
            elem = elem.next;
            if (isTag(elem))
                matched.push(elem);
        }
        return matched;
    }, _removeDuplicates);
    /**
     * Gets all the following siblings up to but not including the element matched
     * by the selector, optionally filtered by another selector.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('.apple').nextUntil('.pear');
     * //=> [<li class="orange">Orange</li>]
     * ```
     *
     * @param selector - Selector for element to stop at.
     * @param filterSelector - If specified filter for siblings.
     * @returns The next nodes.
     * @see {@link https://api.jquery.com/nextUntil/}
     */
    const nextUntil = _matchUntil((el) => nextElementSibling(el), _removeDuplicates);
    /**
     * Gets the previous sibling of each selected element optionally filtered by a
     * selector.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('.orange').prev().hasClass('apple');
     * //=> true
     * ```
     *
     * @param selector - If specified filter for siblings.
     * @returns The previous nodes.
     * @see {@link https://api.jquery.com/prev/}
     */
    const prev = _singleMatcher((elem) => prevElementSibling(elem));
    /**
     * Gets all the preceding siblings of each selected element, optionally filtered
     * by a selector.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('.pear').prevAll();
     * //=> [<li class="orange">Orange</li>, <li class="apple">Apple</li>]
     *
     * $('.pear').prevAll('.orange');
     * //=> [<li class="orange">Orange</li>]
     * ```
     *
     * @param selector - If specified filter for siblings.
     * @returns The previous nodes.
     * @see {@link https://api.jquery.com/prevAll/}
     */
    const prevAll = _matcher((elem) => {
        const matched = [];
        while (elem.prev) {
            elem = elem.prev;
            if (isTag(elem))
                matched.push(elem);
        }
        return matched;
    }, _removeDuplicates);
    /**
     * Gets all the preceding siblings up to but not including the element matched
     * by the selector, optionally filtered by another selector.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('.pear').prevUntil('.apple');
     * //=> [<li class="orange">Orange</li>]
     * ```
     *
     * @param selector - Selector for element to stop at.
     * @param filterSelector - If specified filter for siblings.
     * @returns The previous nodes.
     * @see {@link https://api.jquery.com/prevUntil/}
     */
    const prevUntil = _matchUntil((el) => prevElementSibling(el), _removeDuplicates);
    /**
     * Get the siblings of each element (excluding the element) in the set of
     * matched elements, optionally filtered by a selector.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('.pear').siblings().length;
     * //=> 2
     *
     * $('.pear').siblings('.orange').length;
     * //=> 1
     * ```
     *
     * @param selector - If specified filter for siblings.
     * @returns The siblings.
     * @see {@link https://api.jquery.com/siblings/}
     */
    const siblings = _matcher((elem) => getSiblings(elem).filter((el) => isTag(el) && el !== elem), uniqueSort);
    /**
     * Gets the element children of each element in the set of matched elements.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('#fruits').children().length;
     * //=> 3
     *
     * $('#fruits').children('.pear').text();
     * //=> Pear
     * ```
     *
     * @param selector - If specified filter for children.
     * @returns The children.
     * @see {@link https://api.jquery.com/children/}
     */
    const children = _matcher((elem) => getChildren(elem).filter(isTag), _removeDuplicates);
    /**
     * Gets the children of each element in the set of matched elements, including
     * text and comment nodes.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('#fruits').contents().length;
     * //=> 3
     * ```
     *
     * @returns The children.
     * @see {@link https://api.jquery.com/contents/}
     */
    function contents() {
        const elems = this.toArray().reduce((newElems, elem) => hasChildren(elem) ? newElems.concat(elem.children) : newElems, []);
        return this._make(elems);
    }
    /**
     * Iterates over a cheerio object, executing a function for each matched
     * element. When the callback is fired, the function is fired in the context of
     * the DOM element, so `this` refers to the current element, which is equivalent
     * to the function parameter `element`. To break out of the `each` loop early,
     * return with `false`.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * const fruits = [];
     *
     * $('li').each(function (i, elem) {
     *   fruits[i] = $(this).text();
     * });
     *
     * fruits.join(', ');
     * //=> Apple, Orange, Pear
     * ```
     *
     * @param fn - Function to execute.
     * @returns The instance itself, useful for chaining.
     * @see {@link https://api.jquery.com/each/}
     */
    function each(fn) {
        let i = 0;
        const len = this.length;
        while (i < len && fn.call(this[i], i, this[i]) !== false)
            ++i;
        return this;
    }
    /**
     * Pass each element in the current matched set through a function, producing a
     * new Cheerio object containing the return values. The function can return an
     * individual data item or an array of data items to be inserted into the
     * resulting set. If an array is returned, the elements inside the array are
     * inserted into the set. If the function returns null or undefined, no element
     * will be inserted.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('li')
     *   .map(function (i, el) {
     *     // this === el
     *     return $(this).text();
     *   })
     *   .toArray()
     *   .join(' ');
     * //=> "apple orange pear"
     * ```
     *
     * @param fn - Function to execute.
     * @returns The mapped elements, wrapped in a Cheerio collection.
     * @see {@link https://api.jquery.com/map/}
     */
    function map(fn) {
        let elems = [];
        for (let i = 0; i < this.length; i++) {
            const el = this[i];
            const val = fn.call(el, i, el);
            if (val != null) {
                elems = elems.concat(val);
            }
        }
        return this._make(elems);
    }
    /**
     * Creates a function to test if a filter is matched.
     *
     * @param match - A filter.
     * @returns A function that determines if a filter has been matched.
     */
    function getFilterFn(match) {
        if (typeof match === 'function') {
            return (el, i) => match.call(el, i, el);
        }
        if (isCheerio(match)) {
            return (el) => Array.prototype.includes.call(match, el);
        }
        return function (el) {
            return match === el;
        };
    }
    function filter(match) {
        var _a;
        return this._make(filterArray(this.toArray(), match, this.options.xmlMode, (_a = this._root) === null || _a === void 0 ? void 0 : _a[0]));
    }
    function filterArray(nodes, match, xmlMode, root) {
        return typeof match === 'string'
            ? filter$1(match, nodes, { xmlMode, root })
            : nodes.filter(getFilterFn(match));
    }
    /**
     * Checks the current list of elements and returns `true` if _any_ of the
     * elements match the selector. If using an element or Cheerio selection,
     * returns `true` if _any_ of the elements match. If using a predicate function,
     * the function is executed in the context of the selected element, so `this`
     * refers to the current element.
     *
     * @category Traversing
     * @param selector - Selector for the selection.
     * @returns Whether or not the selector matches an element of the instance.
     * @see {@link https://api.jquery.com/is/}
     */
    function is(selector) {
        const nodes = this.toArray();
        return typeof selector === 'string'
            ? some(nodes.filter(isTag), selector, this.options)
            : selector
                ? nodes.some(getFilterFn(selector))
                : false;
    }
    /**
     * Remove elements from the set of matched elements. Given a Cheerio object that
     * represents a set of DOM elements, the `.not()` method constructs a new
     * Cheerio object from a subset of the matching elements. The supplied selector
     * is tested against each element; the elements that don't match the selector
     * will be included in the result.
     *
     * The `.not()` method can take a function as its argument in the same way that
     * `.filter()` does. Elements for which the function returns `true` are excluded
     * from the filtered set; all other elements are included.
     *
     * @category Traversing
     * @example <caption>Selector</caption>
     *
     * ```js
     * $('li').not('.apple').length;
     * //=> 2
     * ```
     *
     * @example <caption>Function</caption>
     *
     * ```js
     * $('li').not(function (i, el) {
     *   // this === el
     *   return $(this).attr('class') === 'orange';
     * }).length; //=> 2
     * ```
     *
     * @param match - Value to look for, following the rules above.
     * @returns The filtered collection.
     * @see {@link https://api.jquery.com/not/}
     */
    function not(match) {
        let nodes = this.toArray();
        if (typeof match === 'string') {
            const matches = new Set(filter$1(match, nodes, this.options));
            nodes = nodes.filter((el) => !matches.has(el));
        }
        else {
            const filterFn = getFilterFn(match);
            nodes = nodes.filter((el, i) => !filterFn(el, i));
        }
        return this._make(nodes);
    }
    /**
     * Filters the set of matched elements to only those which have the given DOM
     * element as a descendant or which have a descendant that matches the given
     * selector. Equivalent to `.filter(':has(selector)')`.
     *
     * @category Traversing
     * @example <caption>Selector</caption>
     *
     * ```js
     * $('ul').has('.pear').attr('id');
     * //=> fruits
     * ```
     *
     * @example <caption>Element</caption>
     *
     * ```js
     * $('ul').has($('.pear')[0]).attr('id');
     * //=> fruits
     * ```
     *
     * @param selectorOrHaystack - Element to look for.
     * @returns The filtered collection.
     * @see {@link https://api.jquery.com/has/}
     */
    function has(selectorOrHaystack) {
        return this.filter(typeof selectorOrHaystack === 'string'
            ? // Using the `:has` selector here short-circuits searches.
                `:has(${selectorOrHaystack})`
            : (_, el) => this._make(el).find(selectorOrHaystack).length > 0);
    }
    /**
     * Will select the first element of a cheerio object.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('#fruits').children().first().text();
     * //=> Apple
     * ```
     *
     * @returns The first element.
     * @see {@link https://api.jquery.com/first/}
     */
    function first() {
        return this.length > 1 ? this._make(this[0]) : this;
    }
    /**
     * Will select the last element of a cheerio object.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('#fruits').children().last().text();
     * //=> Pear
     * ```
     *
     * @returns The last element.
     * @see {@link https://api.jquery.com/last/}
     */
    function last() {
        return this.length > 0 ? this._make(this[this.length - 1]) : this;
    }
    /**
     * Reduce the set of matched elements to the one at the specified index. Use
     * `.eq(-i)` to count backwards from the last selected element.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('li').eq(0).text();
     * //=> Apple
     *
     * $('li').eq(-1).text();
     * //=> Pear
     * ```
     *
     * @param i - Index of the element to select.
     * @returns The element at the `i`th position.
     * @see {@link https://api.jquery.com/eq/}
     */
    function eq(i) {
        var _a;
        i = +i;
        // Use the first identity optimization if possible
        if (i === 0 && this.length <= 1)
            return this;
        if (i < 0)
            i = this.length + i;
        return this._make((_a = this[i]) !== null && _a !== void 0 ? _a : []);
    }
    function get(i) {
        if (i == null) {
            return this.toArray();
        }
        return this[i < 0 ? this.length + i : i];
    }
    /**
     * Retrieve all the DOM elements contained in the jQuery set as an array.
     *
     * @example
     *
     * ```js
     * $('li').toArray();
     * //=> [ {...}, {...}, {...} ]
     * ```
     *
     * @returns The contained items.
     */
    function toArray() {
        return Array.prototype.slice.call(this);
    }
    /**
     * Search for a given element from among the matched elements.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('.pear').index();
     * //=> 2 $('.orange').index('li');
     * //=> 1
     * $('.apple').index($('#fruit, li'));
     * //=> 1
     * ```
     *
     * @param selectorOrNeedle - Element to look for.
     * @returns The index of the element.
     * @see {@link https://api.jquery.com/index/}
     */
    function index(selectorOrNeedle) {
        let $haystack;
        let needle;
        if (selectorOrNeedle == null) {
            $haystack = this.parent().children();
            needle = this[0];
        }
        else if (typeof selectorOrNeedle === 'string') {
            $haystack = this._make(selectorOrNeedle);
            needle = this[0];
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-this-alias, unicorn/no-this-assignment
            $haystack = this;
            needle = isCheerio(selectorOrNeedle)
                ? selectorOrNeedle[0]
                : selectorOrNeedle;
        }
        return Array.prototype.indexOf.call($haystack, needle);
    }
    /**
     * Gets the elements matching the specified range (0-based position).
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('li').slice(1).eq(0).text();
     * //=> 'Orange'
     *
     * $('li').slice(1, 2).length;
     * //=> 1
     * ```
     *
     * @param start - A position at which the elements begin to be selected. If
     *   negative, it indicates an offset from the end of the set.
     * @param end - A position at which the elements stop being selected. If
     *   negative, it indicates an offset from the end of the set. If omitted, the
     *   range continues until the end of the set.
     * @returns The elements matching the specified range.
     * @see {@link https://api.jquery.com/slice/}
     */
    function slice(start, end) {
        return this._make(Array.prototype.slice.call(this, start, end));
    }
    /**
     * End the most recent filtering operation in the current chain and return the
     * set of matched elements to its previous state.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('li').eq(0).end().length;
     * //=> 3
     * ```
     *
     * @returns The previous state of the set of matched elements.
     * @see {@link https://api.jquery.com/end/}
     */
    function end() {
        var _a;
        return (_a = this.prevObject) !== null && _a !== void 0 ? _a : this._make([]);
    }
    /**
     * Add elements to the set of matched elements.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('.apple').add('.orange').length;
     * //=> 2
     * ```
     *
     * @param other - Elements to add.
     * @param context - Optionally the context of the new selection.
     * @returns The combined set.
     * @see {@link https://api.jquery.com/add/}
     */
    function add(other, context) {
        const selection = this._make(other, context);
        const contents = uniqueSort([...this.get(), ...selection.get()]);
        return this._make(contents);
    }
    /**
     * Add the previous set of elements on the stack to the current set, optionally
     * filtered by a selector.
     *
     * @category Traversing
     * @example
     *
     * ```js
     * $('li').eq(0).addBack('.orange').length;
     * //=> 2
     * ```
     *
     * @param selector - Selector for the elements to add.
     * @returns The combined set.
     * @see {@link https://api.jquery.com/addBack/}
     */
    function addBack(selector) {
        return this.prevObject
            ? this.add(selector ? this.prevObject.filter(selector) : this.prevObject)
            : this;
    }

    var Traversing = /*#__PURE__*/Object.freeze({
        __proto__: null,
        _findBySelector: _findBySelector,
        add: add,
        addBack: addBack,
        children: children,
        closest: closest,
        contents: contents,
        each: each,
        end: end,
        eq: eq,
        filter: filter,
        filterArray: filterArray,
        find: find,
        first: first,
        get: get,
        has: has,
        index: index,
        is: is,
        last: last,
        map: map,
        next: next,
        nextAll: nextAll,
        nextUntil: nextUntil,
        not: not,
        parent: parent,
        parents: parents,
        parentsUntil: parentsUntil,
        prev: prev,
        prevAll: prevAll,
        prevUntil: prevUntil,
        siblings: siblings,
        slice: slice,
        toArray: toArray
    });

    /**
     * Get the parse function with options.
     *
     * @param parser - The parser function.
     * @returns The parse function with options.
     */
    function getParse(parser) {
        /**
         * Parse a HTML string or a node.
         *
         * @param content - The HTML string or node.
         * @param options - The parser options.
         * @param isDocument - If `content` is a document.
         * @param context - The context node in the DOM tree.
         * @returns The parsed document node.
         */
        return function parse(content, options, isDocument$1, context) {
            if (typeof Buffer !== 'undefined' && Buffer.isBuffer(content)) {
                content = content.toString();
            }
            if (typeof content === 'string') {
                return parser(content, options, isDocument$1, context);
            }
            const doc = content;
            if (!Array.isArray(doc) && isDocument(doc)) {
                // If `doc` is already a root, just return it
                return doc;
            }
            // Add content to new root element
            const root = new Document([]);
            // Update the DOM using the root
            update(doc, root);
            return root;
        };
    }
    /**
     * Update the dom structure, for one changed layer.
     *
     * @param newChilds - The new children.
     * @param parent - The new parent.
     * @returns The parent node.
     */
    function update(newChilds, parent) {
        // Normalize
        const arr = Array.isArray(newChilds) ? newChilds : [newChilds];
        // Update parent
        if (parent) {
            parent.children = arr;
        }
        else {
            parent = null;
        }
        // Update neighbors
        for (let i = 0; i < arr.length; i++) {
            const node = arr[i];
            // Cleanly remove existing nodes from their previous structures.
            if (node.parent && node.parent.children !== arr) {
                removeElement(node);
            }
            if (parent) {
                node.prev = arr[i - 1] || null;
                node.next = arr[i + 1] || null;
            }
            else {
                node.prev = node.next = null;
            }
            node.parent = parent;
        }
        return parent;
    }

    /**
     * Methods for modifying the DOM structure.
     *
     * @module cheerio/manipulation
     */
    /**
     * Create an array of nodes, recursing into arrays and parsing strings if
     * necessary.
     *
     * @private
     * @category Manipulation
     * @param elem - Elements to make an array of.
     * @param clone - Optionally clone nodes.
     * @returns The array of nodes.
     */
    function _makeDomArray(elem, clone) {
        if (elem == null) {
            return [];
        }
        if (typeof elem === 'string') {
            return this._parse(elem, this.options, false, null).children.slice(0);
        }
        if ('length' in elem) {
            if (elem.length === 1) {
                return this._makeDomArray(elem[0], clone);
            }
            const result = [];
            for (let i = 0; i < elem.length; i++) {
                const el = elem[i];
                if (typeof el === 'object') {
                    if (el == null) {
                        continue;
                    }
                    if (!('length' in el)) {
                        result.push(clone ? cloneNode(el, true) : el);
                        continue;
                    }
                }
                result.push(...this._makeDomArray(el, clone));
            }
            return result;
        }
        return [clone ? cloneNode(elem, true) : elem];
    }
    function _insert(concatenator) {
        return function (...elems) {
            const lastIdx = this.length - 1;
            return domEach(this, (el, i) => {
                if (!hasChildren(el))
                    return;
                const domSrc = typeof elems[0] === 'function'
                    ? elems[0].call(el, i, this._render(el.children))
                    : elems;
                const dom = this._makeDomArray(domSrc, i < lastIdx);
                concatenator(dom, el.children, el);
            });
        };
    }
    /**
     * Modify an array in-place, removing some number of elements and adding new
     * elements directly following them.
     *
     * @private
     * @category Manipulation
     * @param array - Target array to splice.
     * @param spliceIdx - Index at which to begin changing the array.
     * @param spliceCount - Number of elements to remove from the array.
     * @param newElems - Elements to insert into the array.
     * @param parent - The parent of the node.
     * @returns The spliced array.
     */
    function uniqueSplice(array, spliceIdx, spliceCount, newElems, parent) {
        var _a, _b;
        const spliceArgs = [
            spliceIdx,
            spliceCount,
            ...newElems,
        ];
        const prev = spliceIdx === 0 ? null : array[spliceIdx - 1];
        const next = spliceIdx + spliceCount >= array.length
            ? null
            : array[spliceIdx + spliceCount];
        /*
         * Before splicing in new elements, ensure they do not already appear in the
         * current array.
         */
        for (let idx = 0; idx < newElems.length; ++idx) {
            const node = newElems[idx];
            const oldParent = node.parent;
            if (oldParent) {
                const oldSiblings = oldParent.children;
                const prevIdx = oldSiblings.indexOf(node);
                if (prevIdx !== -1) {
                    oldParent.children.splice(prevIdx, 1);
                    if (parent === oldParent && spliceIdx > prevIdx) {
                        spliceArgs[0]--;
                    }
                }
            }
            node.parent = parent;
            if (node.prev) {
                node.prev.next = (_a = node.next) !== null && _a !== void 0 ? _a : null;
            }
            if (node.next) {
                node.next.prev = (_b = node.prev) !== null && _b !== void 0 ? _b : null;
            }
            node.prev = idx === 0 ? prev : newElems[idx - 1];
            node.next = idx === newElems.length - 1 ? next : newElems[idx + 1];
        }
        if (prev) {
            prev.next = newElems[0];
        }
        if (next) {
            next.prev = newElems[newElems.length - 1];
        }
        return array.splice(...spliceArgs);
    }
    /**
     * Insert every element in the set of matched elements to the end of the target.
     *
     * @category Manipulation
     * @example
     *
     * ```js
     * $('<li class="plum">Plum</li>').appendTo('#fruits');
     * $.html();
     * //=>  <ul id="fruits">
     * //      <li class="apple">Apple</li>
     * //      <li class="orange">Orange</li>
     * //      <li class="pear">Pear</li>
     * //      <li class="plum">Plum</li>
     * //    </ul>
     * ```
     *
     * @param target - Element to append elements to.
     * @returns The instance itself.
     * @see {@link https://api.jquery.com/appendTo/}
     */
    function appendTo(target) {
        const appendTarget = isCheerio(target) ? target : this._make(target);
        appendTarget.append(this);
        return this;
    }
    /**
     * Insert every element in the set of matched elements to the beginning of the
     * target.
     *
     * @category Manipulation
     * @example
     *
     * ```js
     * $('<li class="plum">Plum</li>').prependTo('#fruits');
     * $.html();
     * //=>  <ul id="fruits">
     * //      <li class="plum">Plum</li>
     * //      <li class="apple">Apple</li>
     * //      <li class="orange">Orange</li>
     * //      <li class="pear">Pear</li>
     * //    </ul>
     * ```
     *
     * @param target - Element to prepend elements to.
     * @returns The instance itself.
     * @see {@link https://api.jquery.com/prependTo/}
     */
    function prependTo(target) {
        const prependTarget = isCheerio(target) ? target : this._make(target);
        prependTarget.prepend(this);
        return this;
    }
    /**
     * Inserts content as the _last_ child of each of the selected elements.
     *
     * @category Manipulation
     * @example
     *
     * ```js
     * $('ul').append('<li class="plum">Plum</li>');
     * $.html();
     * //=>  <ul id="fruits">
     * //      <li class="apple">Apple</li>
     * //      <li class="orange">Orange</li>
     * //      <li class="pear">Pear</li>
     * //      <li class="plum">Plum</li>
     * //    </ul>
     * ```
     *
     * @see {@link https://api.jquery.com/append/}
     */
    const append = _insert((dom, children, parent) => {
        uniqueSplice(children, children.length, 0, dom, parent);
    });
    /**
     * Inserts content as the _first_ child of each of the selected elements.
     *
     * @category Manipulation
     * @example
     *
     * ```js
     * $('ul').prepend('<li class="plum">Plum</li>');
     * $.html();
     * //=>  <ul id="fruits">
     * //      <li class="plum">Plum</li>
     * //      <li class="apple">Apple</li>
     * //      <li class="orange">Orange</li>
     * //      <li class="pear">Pear</li>
     * //    </ul>
     * ```
     *
     * @see {@link https://api.jquery.com/prepend/}
     */
    const prepend = _insert((dom, children, parent) => {
        uniqueSplice(children, 0, 0, dom, parent);
    });
    function _wrap(insert) {
        return function (wrapper) {
            const lastIdx = this.length - 1;
            const lastParent = this.parents().last();
            for (let i = 0; i < this.length; i++) {
                const el = this[i];
                const wrap = typeof wrapper === 'function'
                    ? wrapper.call(el, i, el)
                    : typeof wrapper === 'string' && !isHtml(wrapper)
                        ? lastParent.find(wrapper).clone()
                        : wrapper;
                const [wrapperDom] = this._makeDomArray(wrap, i < lastIdx);
                if (!wrapperDom || !hasChildren(wrapperDom))
                    continue;
                let elInsertLocation = wrapperDom;
                /*
                 * Find the deepest child. Only consider the first tag child of each node
                 * (ignore text); stop if no children are found.
                 */
                let j = 0;
                while (j < elInsertLocation.children.length) {
                    const child = elInsertLocation.children[j];
                    if (isTag(child)) {
                        elInsertLocation = child;
                        j = 0;
                    }
                    else {
                        j++;
                    }
                }
                insert(el, elInsertLocation, [wrapperDom]);
            }
            return this;
        };
    }
    /**
     * The .wrap() function can take any string or object that could be passed to
     * the $() factory function to specify a DOM structure. This structure may be
     * nested several levels deep, but should contain only one inmost element. A
     * copy of this structure will be wrapped around each of the elements in the set
     * of matched elements. This method returns the original set of elements for
     * chaining purposes.
     *
     * @category Manipulation
     * @example
     *
     * ```js
     * const redFruit = $('<div class="red-fruit"></div>');
     * $('.apple').wrap(redFruit);
     *
     * //=> <ul id="fruits">
     * //     <div class="red-fruit">
     * //      <li class="apple">Apple</li>
     * //     </div>
     * //     <li class="orange">Orange</li>
     * //     <li class="plum">Plum</li>
     * //   </ul>
     *
     * const healthy = $('<div class="healthy"></div>');
     * $('li').wrap(healthy);
     *
     * //=> <ul id="fruits">
     * //     <div class="healthy">
     * //       <li class="apple">Apple</li>
     * //     </div>
     * //     <div class="healthy">
     * //       <li class="orange">Orange</li>
     * //     </div>
     * //     <div class="healthy">
     * //        <li class="plum">Plum</li>
     * //     </div>
     * //   </ul>
     * ```
     *
     * @param wrapper - The DOM structure to wrap around each element in the
     *   selection.
     * @see {@link https://api.jquery.com/wrap/}
     */
    const wrap = _wrap((el, elInsertLocation, wrapperDom) => {
        const { parent } = el;
        if (!parent)
            return;
        const siblings = parent.children;
        const index = siblings.indexOf(el);
        update([el], elInsertLocation);
        /*
         * The previous operation removed the current element from the `siblings`
         * array, so the `dom` array can be inserted without removing any
         * additional elements.
         */
        uniqueSplice(siblings, index, 0, wrapperDom, parent);
    });
    /**
     * The .wrapInner() function can take any string or object that could be passed
     * to the $() factory function to specify a DOM structure. This structure may be
     * nested several levels deep, but should contain only one inmost element. The
     * structure will be wrapped around the content of each of the elements in the
     * set of matched elements.
     *
     * @category Manipulation
     * @example
     *
     * ```js
     * const redFruit = $('<div class="red-fruit"></div>');
     * $('.apple').wrapInner(redFruit);
     *
     * //=> <ul id="fruits">
     * //     <li class="apple">
     * //       <div class="red-fruit">Apple</div>
     * //     </li>
     * //     <li class="orange">Orange</li>
     * //     <li class="pear">Pear</li>
     * //   </ul>
     *
     * const healthy = $('<div class="healthy"></div>');
     * $('li').wrapInner(healthy);
     *
     * //=> <ul id="fruits">
     * //     <li class="apple">
     * //       <div class="healthy">Apple</div>
     * //     </li>
     * //     <li class="orange">
     * //       <div class="healthy">Orange</div>
     * //     </li>
     * //     <li class="pear">
     * //       <div class="healthy">Pear</div>
     * //     </li>
     * //   </ul>
     * ```
     *
     * @param wrapper - The DOM structure to wrap around the content of each element
     *   in the selection.
     * @returns The instance itself, for chaining.
     * @see {@link https://api.jquery.com/wrapInner/}
     */
    const wrapInner = _wrap((el, elInsertLocation, wrapperDom) => {
        if (!hasChildren(el))
            return;
        update(el.children, elInsertLocation);
        update(wrapperDom, el);
    });
    /**
     * The .unwrap() function, removes the parents of the set of matched elements
     * from the DOM, leaving the matched elements in their place.
     *
     * @category Manipulation
     * @example <caption>without selector</caption>
     *
     * ```js
     * const $ = cheerio.load(
     *   '<div id=test>\n  <div><p>Hello</p></div>\n  <div><p>World</p></div>\n</div>',
     * );
     * $('#test p').unwrap();
     *
     * //=> <div id=test>
     * //     <p>Hello</p>
     * //     <p>World</p>
     * //   </div>
     * ```
     *
     * @example <caption>with selector</caption>
     *
     * ```js
     * const $ = cheerio.load(
     *   '<div id=test>\n  <p>Hello</p>\n  <b><p>World</p></b>\n</div>',
     * );
     * $('#test p').unwrap('b');
     *
     * //=> <div id=test>
     * //     <p>Hello</p>
     * //     <p>World</p>
     * //   </div>
     * ```
     *
     * @param selector - A selector to check the parent element against. If an
     *   element's parent does not match the selector, the element won't be
     *   unwrapped.
     * @returns The instance itself, for chaining.
     * @see {@link https://api.jquery.com/unwrap/}
     */
    function unwrap(selector) {
        this.parent(selector)
            .not('body')
            .each((_, el) => {
            this._make(el).replaceWith(el.children);
        });
        return this;
    }
    /**
     * The .wrapAll() function can take any string or object that could be passed to
     * the $() function to specify a DOM structure. This structure may be nested
     * several levels deep, but should contain only one inmost element. The
     * structure will be wrapped around all of the elements in the set of matched
     * elements, as a single group.
     *
     * @category Manipulation
     * @example <caption>With markup passed to `wrapAll`</caption>
     *
     * ```js
     * const $ = cheerio.load(
     *   '<div class="container"><div class="inner">First</div><div class="inner">Second</div></div>',
     * );
     * $('.inner').wrapAll("<div class='new'></div>");
     *
     * //=> <div class="container">
     * //     <div class='new'>
     * //       <div class="inner">First</div>
     * //       <div class="inner">Second</div>
     * //     </div>
     * //   </div>
     * ```
     *
     * @example <caption>With an existing cheerio instance</caption>
     *
     * ```js
     * const $ = cheerio.load(
     *   '<span>Span 1</span><strong>Strong</strong><span>Span 2</span>',
     * );
     * const wrap = $('<div><p><em><b></b></em></p></div>');
     * $('span').wrapAll(wrap);
     *
     * //=> <div>
     * //     <p>
     * //       <em>
     * //         <b>
     * //           <span>Span 1</span>
     * //           <span>Span 2</span>
     * //         </b>
     * //       </em>
     * //     </p>
     * //   </div>
     * //   <strong>Strong</strong>
     * ```
     *
     * @param wrapper - The DOM structure to wrap around all matched elements in the
     *   selection.
     * @returns The instance itself.
     * @see {@link https://api.jquery.com/wrapAll/}
     */
    function wrapAll(wrapper) {
        const el = this[0];
        if (el) {
            const wrap = this._make(typeof wrapper === 'function' ? wrapper.call(el, 0, el) : wrapper).insertBefore(el);
            // If html is given as wrapper, wrap may contain text elements
            let elInsertLocation;
            for (let i = 0; i < wrap.length; i++) {
                if (wrap[i].type === Tag) {
                    elInsertLocation = wrap[i];
                }
            }
            let j = 0;
            /*
             * Find the deepest child. Only consider the first tag child of each node
             * (ignore text); stop if no children are found.
             */
            while (elInsertLocation && j < elInsertLocation.children.length) {
                const child = elInsertLocation.children[j];
                if (child.type === Tag) {
                    elInsertLocation = child;
                    j = 0;
                }
                else {
                    j++;
                }
            }
            if (elInsertLocation)
                this._make(elInsertLocation).append(this);
        }
        return this;
    }
    /**
     * Insert content next to each element in the set of matched elements.
     *
     * @category Manipulation
     * @example
     *
     * ```js
     * $('.apple').after('<li class="plum">Plum</li>');
     * $.html();
     * //=>  <ul id="fruits">
     * //      <li class="apple">Apple</li>
     * //      <li class="plum">Plum</li>
     * //      <li class="orange">Orange</li>
     * //      <li class="pear">Pear</li>
     * //    </ul>
     * ```
     *
     * @param elems - HTML string, DOM element, array of DOM elements or Cheerio to
     *   insert after each element in the set of matched elements.
     * @returns The instance itself.
     * @see {@link https://api.jquery.com/after/}
     */
    function after(...elems) {
        const lastIdx = this.length - 1;
        return domEach(this, (el, i) => {
            if (!hasChildren(el) || !el.parent) {
                return;
            }
            const siblings = el.parent.children;
            const index = siblings.indexOf(el);
            // If not found, move on
            /* istanbul ignore next */
            if (index === -1)
                return;
            const domSrc = typeof elems[0] === 'function'
                ? elems[0].call(el, i, this._render(el.children))
                : elems;
            const dom = this._makeDomArray(domSrc, i < lastIdx);
            // Add element after `this` element
            uniqueSplice(siblings, index + 1, 0, dom, el.parent);
        });
    }
    /**
     * Insert every element in the set of matched elements after the target.
     *
     * @category Manipulation
     * @example
     *
     * ```js
     * $('<li class="plum">Plum</li>').insertAfter('.apple');
     * $.html();
     * //=>  <ul id="fruits">
     * //      <li class="apple">Apple</li>
     * //      <li class="plum">Plum</li>
     * //      <li class="orange">Orange</li>
     * //      <li class="pear">Pear</li>
     * //    </ul>
     * ```
     *
     * @param target - Element to insert elements after.
     * @returns The set of newly inserted elements.
     * @see {@link https://api.jquery.com/insertAfter/}
     */
    function insertAfter(target) {
        if (typeof target === 'string') {
            target = this._make(target);
        }
        this.remove();
        const clones = [];
        for (const el of this._makeDomArray(target)) {
            const clonedSelf = this.clone().toArray();
            const { parent } = el;
            if (!parent) {
                continue;
            }
            const siblings = parent.children;
            const index = siblings.indexOf(el);
            // If not found, move on
            /* istanbul ignore next */
            if (index === -1)
                continue;
            // Add cloned `this` element(s) after target element
            uniqueSplice(siblings, index + 1, 0, clonedSelf, parent);
            clones.push(...clonedSelf);
        }
        return this._make(clones);
    }
    /**
     * Insert content previous to each element in the set of matched elements.
     *
     * @category Manipulation
     * @example
     *
     * ```js
     * $('.apple').before('<li class="plum">Plum</li>');
     * $.html();
     * //=>  <ul id="fruits">
     * //      <li class="plum">Plum</li>
     * //      <li class="apple">Apple</li>
     * //      <li class="orange">Orange</li>
     * //      <li class="pear">Pear</li>
     * //    </ul>
     * ```
     *
     * @param elems - HTML string, DOM element, array of DOM elements or Cheerio to
     *   insert before each element in the set of matched elements.
     * @returns The instance itself.
     * @see {@link https://api.jquery.com/before/}
     */
    function before(...elems) {
        const lastIdx = this.length - 1;
        return domEach(this, (el, i) => {
            if (!hasChildren(el) || !el.parent) {
                return;
            }
            const siblings = el.parent.children;
            const index = siblings.indexOf(el);
            // If not found, move on
            /* istanbul ignore next */
            if (index === -1)
                return;
            const domSrc = typeof elems[0] === 'function'
                ? elems[0].call(el, i, this._render(el.children))
                : elems;
            const dom = this._makeDomArray(domSrc, i < lastIdx);
            // Add element before `el` element
            uniqueSplice(siblings, index, 0, dom, el.parent);
        });
    }
    /**
     * Insert every element in the set of matched elements before the target.
     *
     * @category Manipulation
     * @example
     *
     * ```js
     * $('<li class="plum">Plum</li>').insertBefore('.apple');
     * $.html();
     * //=>  <ul id="fruits">
     * //      <li class="plum">Plum</li>
     * //      <li class="apple">Apple</li>
     * //      <li class="orange">Orange</li>
     * //      <li class="pear">Pear</li>
     * //    </ul>
     * ```
     *
     * @param target - Element to insert elements before.
     * @returns The set of newly inserted elements.
     * @see {@link https://api.jquery.com/insertBefore/}
     */
    function insertBefore(target) {
        const targetArr = this._make(target);
        this.remove();
        const clones = [];
        domEach(targetArr, (el) => {
            const clonedSelf = this.clone().toArray();
            const { parent } = el;
            if (!parent) {
                return;
            }
            const siblings = parent.children;
            const index = siblings.indexOf(el);
            // If not found, move on
            /* istanbul ignore next */
            if (index === -1)
                return;
            // Add cloned `this` element(s) after target element
            uniqueSplice(siblings, index, 0, clonedSelf, parent);
            clones.push(...clonedSelf);
        });
        return this._make(clones);
    }
    /**
     * Removes the set of matched elements from the DOM and all their children.
     * `selector` filters the set of matched elements to be removed.
     *
     * @category Manipulation
     * @example
     *
     * ```js
     * $('.pear').remove();
     * $.html();
     * //=>  <ul id="fruits">
     * //      <li class="apple">Apple</li>
     * //      <li class="orange">Orange</li>
     * //    </ul>
     * ```
     *
     * @param selector - Optional selector for elements to remove.
     * @returns The instance itself.
     * @see {@link https://api.jquery.com/remove/}
     */
    function remove(selector) {
        // Filter if we have selector
        const elems = selector ? this.filter(selector) : this;
        domEach(elems, (el) => {
            removeElement(el);
            el.prev = el.next = el.parent = null;
        });
        return this;
    }
    /**
     * Replaces matched elements with `content`.
     *
     * @category Manipulation
     * @example
     *
     * ```js
     * const plum = $('<li class="plum">Plum</li>');
     * $('.pear').replaceWith(plum);
     * $.html();
     * //=> <ul id="fruits">
     * //     <li class="apple">Apple</li>
     * //     <li class="orange">Orange</li>
     * //     <li class="plum">Plum</li>
     * //   </ul>
     * ```
     *
     * @param content - Replacement for matched elements.
     * @returns The instance itself.
     * @see {@link https://api.jquery.com/replaceWith/}
     */
    function replaceWith(content) {
        return domEach(this, (el, i) => {
            const { parent } = el;
            if (!parent) {
                return;
            }
            const siblings = parent.children;
            const cont = typeof content === 'function' ? content.call(el, i, el) : content;
            const dom = this._makeDomArray(cont);
            /*
             * In the case that `dom` contains nodes that already exist in other
             * structures, ensure those nodes are properly removed.
             */
            update(dom, null);
            const index = siblings.indexOf(el);
            // Completely remove old element
            uniqueSplice(siblings, index, 1, dom, parent);
            if (!dom.includes(el)) {
                el.parent = el.prev = el.next = null;
            }
        });
    }
    /**
     * Removes all children from each item in the selection. Text nodes and comment
     * nodes are left as is.
     *
     * @category Manipulation
     * @example
     *
     * ```js
     * $('ul').empty();
     * $.html();
     * //=>  <ul id="fruits"></ul>
     * ```
     *
     * @returns The instance itself.
     * @see {@link https://api.jquery.com/empty/}
     */
    function empty() {
        return domEach(this, (el) => {
            if (!hasChildren(el))
                return;
            for (const child of el.children) {
                child.next = child.prev = child.parent = null;
            }
            el.children.length = 0;
        });
    }
    function html(str) {
        if (str === undefined) {
            const el = this[0];
            if (!el || !hasChildren(el))
                return null;
            return this._render(el.children);
        }
        return domEach(this, (el) => {
            if (!hasChildren(el))
                return;
            for (const child of el.children) {
                child.next = child.prev = child.parent = null;
            }
            const content = isCheerio(str)
                ? str.toArray()
                : this._parse(`${str}`, this.options, false, el).children;
            update(content, el);
        });
    }
    /**
     * Turns the collection to a string. Alias for `.html()`.
     *
     * @category Manipulation
     * @returns The rendered document.
     */
    function toString() {
        return this._render(this);
    }
    function text(str) {
        // If `str` is undefined, act as a "getter"
        if (str === undefined) {
            return text$1(this);
        }
        if (typeof str === 'function') {
            // Function support
            return domEach(this, (el, i) => this._make(el).text(str.call(el, i, text$1([el]))));
        }
        // Append text node to each selected elements
        return domEach(this, (el) => {
            if (!hasChildren(el))
                return;
            for (const child of el.children) {
                child.next = child.prev = child.parent = null;
            }
            const textNode = new Text(`${str}`);
            update(textNode, el);
        });
    }
    /**
     * Clone the cheerio object.
     *
     * @category Manipulation
     * @example
     *
     * ```js
     * const moreFruit = $('#fruits').clone();
     * ```
     *
     * @returns The cloned object.
     * @see {@link https://api.jquery.com/clone/}
     */
    function clone() {
        const clone = Array.prototype.map.call(this.get(), (el) => cloneNode(el, true));
        // Add a root node around the cloned nodes
        const root = new Document(clone);
        for (const node of clone) {
            node.parent = root;
        }
        return this._make(clone);
    }

    var Manipulation = /*#__PURE__*/Object.freeze({
        __proto__: null,
        _makeDomArray: _makeDomArray,
        after: after,
        append: append,
        appendTo: appendTo,
        before: before,
        clone: clone,
        empty: empty,
        html: html,
        insertAfter: insertAfter,
        insertBefore: insertBefore,
        prepend: prepend,
        prependTo: prependTo,
        remove: remove,
        replaceWith: replaceWith,
        text: text,
        toString: toString,
        unwrap: unwrap,
        wrap: wrap,
        wrapAll: wrapAll,
        wrapInner: wrapInner
    });

    /**
     * Set multiple CSS properties for every matched element.
     *
     * @category CSS
     * @param prop - The names of the properties.
     * @param val - The new values.
     * @returns The instance itself.
     * @see {@link https://api.jquery.com/css/}
     */
    function css(prop, val) {
        if ((prop != null && val != null) ||
            // When `prop` is a "plain" object
            (typeof prop === 'object' && !Array.isArray(prop))) {
            return domEach(this, (el, i) => {
                if (isTag(el)) {
                    // `prop` can't be an array here anymore.
                    setCss(el, prop, val, i);
                }
            });
        }
        if (this.length === 0) {
            return undefined;
        }
        return getCss(this[0], prop);
    }
    /**
     * Set styles of all elements.
     *
     * @private
     * @param el - Element to set style of.
     * @param prop - Name of property.
     * @param value - Value to set property to.
     * @param idx - Optional index within the selection.
     */
    function setCss(el, prop, value, idx) {
        if (typeof prop === 'string') {
            const styles = getCss(el);
            const val = typeof value === 'function' ? value.call(el, idx, styles[prop]) : value;
            if (val === '') {
                delete styles[prop];
            }
            else if (val != null) {
                styles[prop] = val;
            }
            el.attribs['style'] = stringify(styles);
        }
        else if (typeof prop === 'object') {
            const keys = Object.keys(prop);
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                setCss(el, k, prop[k], i);
            }
        }
    }
    function getCss(el, prop) {
        if (!el || !isTag(el))
            return;
        const styles = parse$2(el.attribs['style']);
        if (typeof prop === 'string') {
            return styles[prop];
        }
        if (Array.isArray(prop)) {
            const newStyles = {};
            for (const item of prop) {
                if (styles[item] != null) {
                    newStyles[item] = styles[item];
                }
            }
            return newStyles;
        }
        return styles;
    }
    /**
     * Stringify `obj` to styles.
     *
     * @private
     * @category CSS
     * @param obj - Object to stringify.
     * @returns The serialized styles.
     */
    function stringify(obj) {
        return Object.keys(obj).reduce((str, prop) => `${str}${str ? ' ' : ''}${prop}: ${obj[prop]};`, '');
    }
    /**
     * Parse `styles`.
     *
     * @private
     * @category CSS
     * @param styles - Styles to be parsed.
     * @returns The parsed styles.
     */
    function parse$2(styles) {
        styles = (styles || '').trim();
        if (!styles)
            return {};
        const obj = {};
        let key;
        for (const str of styles.split(';')) {
            const n = str.indexOf(':');
            // If there is no :, or if it is the first/last character, add to the previous item's value
            if (n < 1 || n === str.length - 1) {
                const trimmed = str.trimEnd();
                if (trimmed.length > 0 && key !== undefined) {
                    obj[key] += `;${trimmed}`;
                }
            }
            else {
                key = str.slice(0, n).trim();
                obj[key] = str.slice(n + 1).trim();
            }
        }
        return obj;
    }

    var Css = /*#__PURE__*/Object.freeze({
        __proto__: null,
        css: css
    });

    /*
     * https://github.com/jquery/jquery/blob/2.1.3/src/manipulation/var/rcheckableType.js
     * https://github.com/jquery/jquery/blob/2.1.3/src/serialize.js
     */
    const submittableSelector = 'input,select,textarea,keygen';
    const r20 = /%20/g;
    const rCRLF = /\r?\n/g;
    /**
     * Encode a set of form elements as a string for submission.
     *
     * @category Forms
     * @example
     *
     * ```js
     * $('<form><input name="foo" value="bar" /></form>').serialize();
     * //=> 'foo=bar'
     * ```
     *
     * @returns The serialized form.
     * @see {@link https://api.jquery.com/serialize/}
     */
    function serialize() {
        // Convert form elements into name/value objects
        const arr = this.serializeArray();
        // Serialize each element into a key/value string
        const retArr = arr.map((data) => `${encodeURIComponent(data.name)}=${encodeURIComponent(data.value)}`);
        // Return the resulting serialization
        return retArr.join('&').replace(r20, '+');
    }
    /**
     * Encode a set of form elements as an array of names and values.
     *
     * @category Forms
     * @example
     *
     * ```js
     * $('<form><input name="foo" value="bar" /></form>').serializeArray();
     * //=> [ { name: 'foo', value: 'bar' } ]
     * ```
     *
     * @returns The serialized form.
     * @see {@link https://api.jquery.com/serializeArray/}
     */
    function serializeArray() {
        // Resolve all form elements from either forms or collections of form elements
        return this.map((_, elem) => {
            const $elem = this._make(elem);
            if (isTag(elem) && elem.name === 'form') {
                return $elem.find(submittableSelector).toArray();
            }
            return $elem.filter(submittableSelector).toArray();
        })
            .filter(
        // Verify elements have a name (`attr.name`) and are not disabled (`:enabled`)
        '[name!=""]:enabled' +
            // And cannot be clicked (`[type=submit]`) or are used in `x-www-form-urlencoded` (`[type=file]`)
            ':not(:submit, :button, :image, :reset, :file)' +
            // And are either checked/don't have a checkable state
            ':matches([checked], :not(:checkbox, :radio))')
            .map((_, elem) => {
            var _a;
            const $elem = this._make(elem);
            const name = $elem.attr('name'); // We have filtered for elements with a name before.
            // If there is no value set (e.g. `undefined`, `null`), then default value to empty
            const value = (_a = $elem.val()) !== null && _a !== void 0 ? _a : '';
            // If we have an array of values (e.g. `<select multiple>`), return an array of key/value pairs
            if (Array.isArray(value)) {
                return value.map((val) => 
                /*
                 * We trim replace any line endings (e.g. `\r` or `\r\n` with `\r\n`) to guarantee consistency across platforms
                 * These can occur inside of `<textarea>'s`
                 */
                ({ name, value: val.replace(rCRLF, '\r\n') }));
            }
            // Otherwise (e.g. `<input type="text">`, return only one key/value pair
            return { name, value: value.replace(rCRLF, '\r\n') };
        })
            .toArray();
    }

    var Forms = /*#__PURE__*/Object.freeze({
        __proto__: null,
        serialize: serialize,
        serializeArray: serializeArray
    });

    function getExtractDescr(descr) {
        var _a;
        if (typeof descr === 'string') {
            return { selector: descr, value: 'textContent' };
        }
        return {
            selector: descr.selector,
            value: (_a = descr.value) !== null && _a !== void 0 ? _a : 'textContent',
        };
    }
    /**
     * Extract multiple values from a document, and store them in an object.
     *
     * @param map - An object containing key-value pairs. The keys are the names of
     *   the properties to be created on the object, and the values are the
     *   selectors to be used to extract the values.
     * @returns An object containing the extracted values.
     */
    function extract(map) {
        const ret = {};
        for (const key in map) {
            const descr = map[key];
            const isArray = Array.isArray(descr);
            const { selector, value } = getExtractDescr(isArray ? descr[0] : descr);
            const fn = typeof value === 'function'
                ? value
                : typeof value === 'string'
                    ? (el) => this._make(el).prop(value)
                    : (el) => this._make(el).extract(value);
            if (isArray) {
                ret[key] = this._findBySelector(selector, Number.POSITIVE_INFINITY)
                    .map((_, el) => fn(el, key, ret))
                    .get();
            }
            else {
                const $ = this._findBySelector(selector, 1);
                ret[key] = $.length > 0 ? fn($[0], key, ret) : undefined;
            }
        }
        return ret;
    }

    var Extract = /*#__PURE__*/Object.freeze({
        __proto__: null,
        extract: extract
    });

    /**
     * The cheerio class is the central class of the library. It wraps a set of
     * elements and provides an API for traversing, modifying, and interacting with
     * the set.
     *
     * Loading a document will return the Cheerio class bound to the root element of
     * the document. The class will be instantiated when querying the document (when
     * calling `$('selector')`).
     *
     * @example This is the HTML markup we will be using in all of the API examples:
     *
     * ```html
     * <ul id="fruits">
     *   <li class="apple">Apple</li>
     *   <li class="orange">Orange</li>
     *   <li class="pear">Pear</li>
     * </ul>
     * ```
     */
    class Cheerio {
        /**
         * Instance of cheerio. Methods are specified in the modules. Usage of this
         * constructor is not recommended. Please use `$.load` instead.
         *
         * @private
         * @param elements - The new selection.
         * @param root - Sets the root node.
         * @param options - Options for the instance.
         */
        constructor(elements, root, options) {
            this.length = 0;
            this.options = options;
            this._root = root;
            if (elements) {
                for (let idx = 0; idx < elements.length; idx++) {
                    this[idx] = elements[idx];
                }
                this.length = elements.length;
            }
        }
    }
    /** Set a signature of the object. */
    Cheerio.prototype.cheerio = '[cheerio object]';
    /*
     * Make cheerio an array-like object
     */
    Cheerio.prototype.splice = Array.prototype.splice;
    // Support for (const element of $(...)) iteration:
    Cheerio.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
    // Plug in the API
    Object.assign(Cheerio.prototype, Attributes, Traversing, Manipulation, Css, Forms, Extract);

    function getLoad(parse, render) {
        /**
         * Create a querying function, bound to a document created from the provided
         * markup.
         *
         * Note that similar to web browser contexts, this operation may introduce
         * `<html>`, `<head>`, and `<body>` elements; set `isDocument` to `false` to
         * switch to fragment mode and disable this.
         *
         * @param content - Markup to be loaded.
         * @param options - Options for the created instance.
         * @param isDocument - Allows parser to be switched to fragment mode.
         * @returns The loaded document.
         * @see {@link https://cheerio.js.org/docs/basics/loading#load} for additional usage information.
         */
        return function load(content, options, isDocument = true) {
            if (content == null) {
                throw new Error('cheerio.load() expects a string');
            }
            const internalOpts = flattenOptions(options);
            const initialRoot = parse(content, internalOpts, isDocument, null);
            /**
             * Create an extended class here, so that extensions only live on one
             * instance.
             */
            class LoadedCheerio extends Cheerio {
                _make(selector, context) {
                    const cheerio = initialize(selector, context);
                    cheerio.prevObject = this;
                    return cheerio;
                }
                _parse(content, options, isDocument, context) {
                    return parse(content, options, isDocument, context);
                }
                _render(dom) {
                    return render(dom, this.options);
                }
            }
            function initialize(selector, context, root = initialRoot, opts) {
                // $($)
                if (selector && isCheerio(selector))
                    return selector;
                const options = flattenOptions(opts, internalOpts);
                const r = typeof root === 'string'
                    ? [parse(root, options, false, null)]
                    : 'length' in root
                        ? root
                        : [root];
                const rootInstance = isCheerio(r)
                    ? r
                    : new LoadedCheerio(r, null, options);
                // Add a cyclic reference, so that calling methods on `_root` never fails.
                rootInstance._root = rootInstance;
                // $(), $(null), $(undefined), $(false)
                if (!selector) {
                    return new LoadedCheerio(undefined, rootInstance, options);
                }
                const elements = typeof selector === 'string' && isHtml(selector)
                    ? // $(<html>)
                        parse(selector, options, false, null).children
                    : isNode(selector)
                        ? // $(dom)
                            [selector]
                        : Array.isArray(selector)
                            ? // $([dom])
                                selector
                            : undefined;
                const instance = new LoadedCheerio(elements, rootInstance, options);
                if (elements) {
                    return instance;
                }
                if (typeof selector !== 'string') {
                    throw new TypeError('Unexpected type of selector');
                }
                // We know that our selector is a string now.
                let search = selector;
                const searchContext = context
                    ? // If we don't have a context, maybe we have a root, from loading
                        typeof context === 'string'
                            ? isHtml(context)
                                ? // $('li', '<ul>...</ul>')
                                    new LoadedCheerio([parse(context, options, false, null)], rootInstance, options)
                                : // $('li', 'ul')
                                    ((search = `${context} ${search}`), rootInstance)
                            : isCheerio(context)
                                ? // $('li', $)
                                    context
                                : // $('li', node), $('li', [nodes])
                                    new LoadedCheerio(Array.isArray(context) ? context : [context], rootInstance, options)
                    : rootInstance;
                // If we still don't have a context, return
                if (!searchContext)
                    return instance;
                /*
                 * #id, .class, tag
                 */
                return searchContext.find(search);
            }
            // Add in static methods & properties
            Object.assign(initialize, staticMethods, {
                load,
                // `_root` and `_options` are used in static methods.
                _root: initialRoot,
                _options: internalOpts,
                // Add `fn` for plugins
                fn: LoadedCheerio.prototype,
                // Add the prototype here to maintain `instanceof` behavior.
                prototype: LoadedCheerio.prototype,
            });
            return initialize;
        };
    }
    function isNode(obj) {
        return (
        // @ts-expect-error: TS doesn't know about the `name` property.
        !!obj.name ||
            // @ts-expect-error: TS doesn't know about the `type` property.
            obj.type === Root ||
            // @ts-expect-error: TS doesn't know about the `type` property.
            obj.type === Text$1 ||
            // @ts-expect-error: TS doesn't know about the `type` property.
            obj.type === Comment$1);
    }

    const UNDEFINED_CODE_POINTS = new Set([
        65534, 65535, 131070, 131071, 196606, 196607, 262142, 262143, 327678, 327679, 393214,
        393215, 458750, 458751, 524286, 524287, 589822, 589823, 655358, 655359, 720894,
        720895, 786430, 786431, 851966, 851967, 917502, 917503, 983038, 983039, 1048574,
        1048575, 1114110, 1114111,
    ]);
    const REPLACEMENT_CHARACTER = '\uFFFD';
    var CODE_POINTS;
    (function (CODE_POINTS) {
        CODE_POINTS[CODE_POINTS["EOF"] = -1] = "EOF";
        CODE_POINTS[CODE_POINTS["NULL"] = 0] = "NULL";
        CODE_POINTS[CODE_POINTS["TABULATION"] = 9] = "TABULATION";
        CODE_POINTS[CODE_POINTS["CARRIAGE_RETURN"] = 13] = "CARRIAGE_RETURN";
        CODE_POINTS[CODE_POINTS["LINE_FEED"] = 10] = "LINE_FEED";
        CODE_POINTS[CODE_POINTS["FORM_FEED"] = 12] = "FORM_FEED";
        CODE_POINTS[CODE_POINTS["SPACE"] = 32] = "SPACE";
        CODE_POINTS[CODE_POINTS["EXCLAMATION_MARK"] = 33] = "EXCLAMATION_MARK";
        CODE_POINTS[CODE_POINTS["QUOTATION_MARK"] = 34] = "QUOTATION_MARK";
        CODE_POINTS[CODE_POINTS["AMPERSAND"] = 38] = "AMPERSAND";
        CODE_POINTS[CODE_POINTS["APOSTROPHE"] = 39] = "APOSTROPHE";
        CODE_POINTS[CODE_POINTS["HYPHEN_MINUS"] = 45] = "HYPHEN_MINUS";
        CODE_POINTS[CODE_POINTS["SOLIDUS"] = 47] = "SOLIDUS";
        CODE_POINTS[CODE_POINTS["DIGIT_0"] = 48] = "DIGIT_0";
        CODE_POINTS[CODE_POINTS["DIGIT_9"] = 57] = "DIGIT_9";
        CODE_POINTS[CODE_POINTS["SEMICOLON"] = 59] = "SEMICOLON";
        CODE_POINTS[CODE_POINTS["LESS_THAN_SIGN"] = 60] = "LESS_THAN_SIGN";
        CODE_POINTS[CODE_POINTS["EQUALS_SIGN"] = 61] = "EQUALS_SIGN";
        CODE_POINTS[CODE_POINTS["GREATER_THAN_SIGN"] = 62] = "GREATER_THAN_SIGN";
        CODE_POINTS[CODE_POINTS["QUESTION_MARK"] = 63] = "QUESTION_MARK";
        CODE_POINTS[CODE_POINTS["LATIN_CAPITAL_A"] = 65] = "LATIN_CAPITAL_A";
        CODE_POINTS[CODE_POINTS["LATIN_CAPITAL_Z"] = 90] = "LATIN_CAPITAL_Z";
        CODE_POINTS[CODE_POINTS["RIGHT_SQUARE_BRACKET"] = 93] = "RIGHT_SQUARE_BRACKET";
        CODE_POINTS[CODE_POINTS["GRAVE_ACCENT"] = 96] = "GRAVE_ACCENT";
        CODE_POINTS[CODE_POINTS["LATIN_SMALL_A"] = 97] = "LATIN_SMALL_A";
        CODE_POINTS[CODE_POINTS["LATIN_SMALL_Z"] = 122] = "LATIN_SMALL_Z";
    })(CODE_POINTS || (CODE_POINTS = {}));
    const SEQUENCES = {
        DASH_DASH: '--',
        CDATA_START: '[CDATA[',
        DOCTYPE: 'doctype',
        SCRIPT: 'script',
        PUBLIC: 'public',
        SYSTEM: 'system',
    };
    //Surrogates
    function isSurrogate(cp) {
        return cp >= 55296 && cp <= 57343;
    }
    function isSurrogatePair(cp) {
        return cp >= 56320 && cp <= 57343;
    }
    function getSurrogatePairCodePoint(cp1, cp2) {
        return (cp1 - 55296) * 1024 + 9216 + cp2;
    }
    //NOTE: excluding NULL and ASCII whitespace
    function isControlCodePoint(cp) {
        return ((cp !== 0x20 && cp !== 0x0a && cp !== 0x0d && cp !== 0x09 && cp !== 0x0c && cp >= 0x01 && cp <= 0x1f) ||
            (cp >= 0x7f && cp <= 0x9f));
    }
    function isUndefinedCodePoint(cp) {
        return (cp >= 64976 && cp <= 65007) || UNDEFINED_CODE_POINTS.has(cp);
    }

    var ERR;
    (function (ERR) {
        ERR["controlCharacterInInputStream"] = "control-character-in-input-stream";
        ERR["noncharacterInInputStream"] = "noncharacter-in-input-stream";
        ERR["surrogateInInputStream"] = "surrogate-in-input-stream";
        ERR["nonVoidHtmlElementStartTagWithTrailingSolidus"] = "non-void-html-element-start-tag-with-trailing-solidus";
        ERR["endTagWithAttributes"] = "end-tag-with-attributes";
        ERR["endTagWithTrailingSolidus"] = "end-tag-with-trailing-solidus";
        ERR["unexpectedSolidusInTag"] = "unexpected-solidus-in-tag";
        ERR["unexpectedNullCharacter"] = "unexpected-null-character";
        ERR["unexpectedQuestionMarkInsteadOfTagName"] = "unexpected-question-mark-instead-of-tag-name";
        ERR["invalidFirstCharacterOfTagName"] = "invalid-first-character-of-tag-name";
        ERR["unexpectedEqualsSignBeforeAttributeName"] = "unexpected-equals-sign-before-attribute-name";
        ERR["missingEndTagName"] = "missing-end-tag-name";
        ERR["unexpectedCharacterInAttributeName"] = "unexpected-character-in-attribute-name";
        ERR["unknownNamedCharacterReference"] = "unknown-named-character-reference";
        ERR["missingSemicolonAfterCharacterReference"] = "missing-semicolon-after-character-reference";
        ERR["unexpectedCharacterAfterDoctypeSystemIdentifier"] = "unexpected-character-after-doctype-system-identifier";
        ERR["unexpectedCharacterInUnquotedAttributeValue"] = "unexpected-character-in-unquoted-attribute-value";
        ERR["eofBeforeTagName"] = "eof-before-tag-name";
        ERR["eofInTag"] = "eof-in-tag";
        ERR["missingAttributeValue"] = "missing-attribute-value";
        ERR["missingWhitespaceBetweenAttributes"] = "missing-whitespace-between-attributes";
        ERR["missingWhitespaceAfterDoctypePublicKeyword"] = "missing-whitespace-after-doctype-public-keyword";
        ERR["missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers"] = "missing-whitespace-between-doctype-public-and-system-identifiers";
        ERR["missingWhitespaceAfterDoctypeSystemKeyword"] = "missing-whitespace-after-doctype-system-keyword";
        ERR["missingQuoteBeforeDoctypePublicIdentifier"] = "missing-quote-before-doctype-public-identifier";
        ERR["missingQuoteBeforeDoctypeSystemIdentifier"] = "missing-quote-before-doctype-system-identifier";
        ERR["missingDoctypePublicIdentifier"] = "missing-doctype-public-identifier";
        ERR["missingDoctypeSystemIdentifier"] = "missing-doctype-system-identifier";
        ERR["abruptDoctypePublicIdentifier"] = "abrupt-doctype-public-identifier";
        ERR["abruptDoctypeSystemIdentifier"] = "abrupt-doctype-system-identifier";
        ERR["cdataInHtmlContent"] = "cdata-in-html-content";
        ERR["incorrectlyOpenedComment"] = "incorrectly-opened-comment";
        ERR["eofInScriptHtmlCommentLikeText"] = "eof-in-script-html-comment-like-text";
        ERR["eofInDoctype"] = "eof-in-doctype";
        ERR["nestedComment"] = "nested-comment";
        ERR["abruptClosingOfEmptyComment"] = "abrupt-closing-of-empty-comment";
        ERR["eofInComment"] = "eof-in-comment";
        ERR["incorrectlyClosedComment"] = "incorrectly-closed-comment";
        ERR["eofInCdata"] = "eof-in-cdata";
        ERR["absenceOfDigitsInNumericCharacterReference"] = "absence-of-digits-in-numeric-character-reference";
        ERR["nullCharacterReference"] = "null-character-reference";
        ERR["surrogateCharacterReference"] = "surrogate-character-reference";
        ERR["characterReferenceOutsideUnicodeRange"] = "character-reference-outside-unicode-range";
        ERR["controlCharacterReference"] = "control-character-reference";
        ERR["noncharacterCharacterReference"] = "noncharacter-character-reference";
        ERR["missingWhitespaceBeforeDoctypeName"] = "missing-whitespace-before-doctype-name";
        ERR["missingDoctypeName"] = "missing-doctype-name";
        ERR["invalidCharacterSequenceAfterDoctypeName"] = "invalid-character-sequence-after-doctype-name";
        ERR["duplicateAttribute"] = "duplicate-attribute";
        ERR["nonConformingDoctype"] = "non-conforming-doctype";
        ERR["missingDoctype"] = "missing-doctype";
        ERR["misplacedDoctype"] = "misplaced-doctype";
        ERR["endTagWithoutMatchingOpenElement"] = "end-tag-without-matching-open-element";
        ERR["closingOfElementWithOpenChildElements"] = "closing-of-element-with-open-child-elements";
        ERR["disallowedContentInNoscriptInHead"] = "disallowed-content-in-noscript-in-head";
        ERR["openElementsLeftAfterEof"] = "open-elements-left-after-eof";
        ERR["abandonedHeadElementChild"] = "abandoned-head-element-child";
        ERR["misplacedStartTagForHeadElement"] = "misplaced-start-tag-for-head-element";
        ERR["nestedNoscriptInHead"] = "nested-noscript-in-head";
        ERR["eofInElementThatCanContainOnlyText"] = "eof-in-element-that-can-contain-only-text";
    })(ERR || (ERR = {}));

    //Const
    const DEFAULT_BUFFER_WATERLINE = 1 << 16;
    //Preprocessor
    //NOTE: HTML input preprocessing
    //(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/parsing.html#preprocessing-the-input-stream)
    class Preprocessor {
        constructor(handler) {
            this.handler = handler;
            this.html = '';
            this.pos = -1;
            // NOTE: Initial `lastGapPos` is -2, to ensure `col` on initialisation is 0
            this.lastGapPos = -2;
            this.gapStack = [];
            this.skipNextNewLine = false;
            this.lastChunkWritten = false;
            this.endOfChunkHit = false;
            this.bufferWaterline = DEFAULT_BUFFER_WATERLINE;
            this.isEol = false;
            this.lineStartPos = 0;
            this.droppedBufferSize = 0;
            this.line = 1;
            //NOTE: avoid reporting errors twice on advance/retreat
            this.lastErrOffset = -1;
        }
        /** The column on the current line. If we just saw a gap (eg. a surrogate pair), return the index before. */
        get col() {
            return this.pos - this.lineStartPos + Number(this.lastGapPos !== this.pos);
        }
        get offset() {
            return this.droppedBufferSize + this.pos;
        }
        getError(code, cpOffset) {
            const { line, col, offset } = this;
            const startCol = col + cpOffset;
            const startOffset = offset + cpOffset;
            return {
                code,
                startLine: line,
                endLine: line,
                startCol,
                endCol: startCol,
                startOffset,
                endOffset: startOffset,
            };
        }
        _err(code) {
            if (this.handler.onParseError && this.lastErrOffset !== this.offset) {
                this.lastErrOffset = this.offset;
                this.handler.onParseError(this.getError(code, 0));
            }
        }
        _addGap() {
            this.gapStack.push(this.lastGapPos);
            this.lastGapPos = this.pos;
        }
        _processSurrogate(cp) {
            //NOTE: try to peek a surrogate pair
            if (this.pos !== this.html.length - 1) {
                const nextCp = this.html.charCodeAt(this.pos + 1);
                if (isSurrogatePair(nextCp)) {
                    //NOTE: we have a surrogate pair. Peek pair character and recalculate code point.
                    this.pos++;
                    //NOTE: add a gap that should be avoided during retreat
                    this._addGap();
                    return getSurrogatePairCodePoint(cp, nextCp);
                }
            }
            //NOTE: we are at the end of a chunk, therefore we can't infer the surrogate pair yet.
            else if (!this.lastChunkWritten) {
                this.endOfChunkHit = true;
                return CODE_POINTS.EOF;
            }
            //NOTE: isolated surrogate
            this._err(ERR.surrogateInInputStream);
            return cp;
        }
        willDropParsedChunk() {
            return this.pos > this.bufferWaterline;
        }
        dropParsedChunk() {
            if (this.willDropParsedChunk()) {
                this.html = this.html.substring(this.pos);
                this.lineStartPos -= this.pos;
                this.droppedBufferSize += this.pos;
                this.pos = 0;
                this.lastGapPos = -2;
                this.gapStack.length = 0;
            }
        }
        write(chunk, isLastChunk) {
            if (this.html.length > 0) {
                this.html += chunk;
            }
            else {
                this.html = chunk;
            }
            this.endOfChunkHit = false;
            this.lastChunkWritten = isLastChunk;
        }
        insertHtmlAtCurrentPos(chunk) {
            this.html = this.html.substring(0, this.pos + 1) + chunk + this.html.substring(this.pos + 1);
            this.endOfChunkHit = false;
        }
        startsWith(pattern, caseSensitive) {
            // Check if our buffer has enough characters
            if (this.pos + pattern.length > this.html.length) {
                this.endOfChunkHit = !this.lastChunkWritten;
                return false;
            }
            if (caseSensitive) {
                return this.html.startsWith(pattern, this.pos);
            }
            for (let i = 0; i < pattern.length; i++) {
                const cp = this.html.charCodeAt(this.pos + i) | 0x20;
                if (cp !== pattern.charCodeAt(i)) {
                    return false;
                }
            }
            return true;
        }
        peek(offset) {
            const pos = this.pos + offset;
            if (pos >= this.html.length) {
                this.endOfChunkHit = !this.lastChunkWritten;
                return CODE_POINTS.EOF;
            }
            const code = this.html.charCodeAt(pos);
            return code === CODE_POINTS.CARRIAGE_RETURN ? CODE_POINTS.LINE_FEED : code;
        }
        advance() {
            this.pos++;
            //NOTE: LF should be in the last column of the line
            if (this.isEol) {
                this.isEol = false;
                this.line++;
                this.lineStartPos = this.pos;
            }
            if (this.pos >= this.html.length) {
                this.endOfChunkHit = !this.lastChunkWritten;
                return CODE_POINTS.EOF;
            }
            let cp = this.html.charCodeAt(this.pos);
            //NOTE: all U+000D CARRIAGE RETURN (CR) characters must be converted to U+000A LINE FEED (LF) characters
            if (cp === CODE_POINTS.CARRIAGE_RETURN) {
                this.isEol = true;
                this.skipNextNewLine = true;
                return CODE_POINTS.LINE_FEED;
            }
            //NOTE: any U+000A LINE FEED (LF) characters that immediately follow a U+000D CARRIAGE RETURN (CR) character
            //must be ignored.
            if (cp === CODE_POINTS.LINE_FEED) {
                this.isEol = true;
                if (this.skipNextNewLine) {
                    // `line` will be bumped again in the recursive call.
                    this.line--;
                    this.skipNextNewLine = false;
                    this._addGap();
                    return this.advance();
                }
            }
            this.skipNextNewLine = false;
            if (isSurrogate(cp)) {
                cp = this._processSurrogate(cp);
            }
            //OPTIMIZATION: first check if code point is in the common allowed
            //range (ASCII alphanumeric, whitespaces, big chunk of BMP)
            //before going into detailed performance cost validation.
            const isCommonValidRange = this.handler.onParseError === null ||
                (cp > 0x1f && cp < 0x7f) ||
                cp === CODE_POINTS.LINE_FEED ||
                cp === CODE_POINTS.CARRIAGE_RETURN ||
                (cp > 0x9f && cp < 64976);
            if (!isCommonValidRange) {
                this._checkForProblematicCharacters(cp);
            }
            return cp;
        }
        _checkForProblematicCharacters(cp) {
            if (isControlCodePoint(cp)) {
                this._err(ERR.controlCharacterInInputStream);
            }
            else if (isUndefinedCodePoint(cp)) {
                this._err(ERR.noncharacterInInputStream);
            }
        }
        retreat(count) {
            this.pos -= count;
            while (this.pos < this.lastGapPos) {
                this.lastGapPos = this.gapStack.pop();
                this.pos--;
            }
            this.isEol = false;
        }
    }

    var TokenType;
    (function (TokenType) {
        TokenType[TokenType["CHARACTER"] = 0] = "CHARACTER";
        TokenType[TokenType["NULL_CHARACTER"] = 1] = "NULL_CHARACTER";
        TokenType[TokenType["WHITESPACE_CHARACTER"] = 2] = "WHITESPACE_CHARACTER";
        TokenType[TokenType["START_TAG"] = 3] = "START_TAG";
        TokenType[TokenType["END_TAG"] = 4] = "END_TAG";
        TokenType[TokenType["COMMENT"] = 5] = "COMMENT";
        TokenType[TokenType["DOCTYPE"] = 6] = "DOCTYPE";
        TokenType[TokenType["EOF"] = 7] = "EOF";
        TokenType[TokenType["HIBERNATION"] = 8] = "HIBERNATION";
    })(TokenType || (TokenType = {}));
    function getTokenAttr(token, attrName) {
        for (let i = token.attrs.length - 1; i >= 0; i--) {
            if (token.attrs[i].name === attrName) {
                return token.attrs[i].value;
            }
        }
        return null;
    }

    // Generated using scripts/write-decode-map.ts
    const htmlDecodeTree = /* #__PURE__ */ new Uint16Array(
    // prettier-ignore
    /* #__PURE__ */ "\u1d41<\xd5\u0131\u028a\u049d\u057b\u05d0\u0675\u06de\u07a2\u07d6\u080f\u0a4a\u0a91\u0da1\u0e6d\u0f09\u0f26\u10ca\u1228\u12e1\u1415\u149d\u14c3\u14df\u1525\0\0\0\0\0\0\u156b\u16cd\u198d\u1c12\u1ddd\u1f7e\u2060\u21b0\u228d\u23c0\u23fb\u2442\u2824\u2912\u2d08\u2e48\u2fce\u3016\u32ba\u3639\u37ac\u38fe\u3a28\u3a71\u3ae0\u3b2e\u0800EMabcfglmnoprstu\\bfms\x7f\x84\x8b\x90\x95\x98\xa6\xb3\xb9\xc8\xcflig\u803b\xc6\u40c6P\u803b&\u4026cute\u803b\xc1\u40c1reve;\u4102\u0100iyx}rc\u803b\xc2\u40c2;\u4410r;\uc000\ud835\udd04rave\u803b\xc0\u40c0pha;\u4391acr;\u4100d;\u6a53\u0100gp\x9d\xa1on;\u4104f;\uc000\ud835\udd38plyFunction;\u6061ing\u803b\xc5\u40c5\u0100cs\xbe\xc3r;\uc000\ud835\udc9cign;\u6254ilde\u803b\xc3\u40c3ml\u803b\xc4\u40c4\u0400aceforsu\xe5\xfb\xfe\u0117\u011c\u0122\u0127\u012a\u0100cr\xea\xf2kslash;\u6216\u0176\xf6\xf8;\u6ae7ed;\u6306y;\u4411\u0180crt\u0105\u010b\u0114ause;\u6235noullis;\u612ca;\u4392r;\uc000\ud835\udd05pf;\uc000\ud835\udd39eve;\u42d8c\xf2\u0113mpeq;\u624e\u0700HOacdefhilorsu\u014d\u0151\u0156\u0180\u019e\u01a2\u01b5\u01b7\u01ba\u01dc\u0215\u0273\u0278\u027ecy;\u4427PY\u803b\xa9\u40a9\u0180cpy\u015d\u0162\u017aute;\u4106\u0100;i\u0167\u0168\u62d2talDifferentialD;\u6145leys;\u612d\u0200aeio\u0189\u018e\u0194\u0198ron;\u410cdil\u803b\xc7\u40c7rc;\u4108nint;\u6230ot;\u410a\u0100dn\u01a7\u01adilla;\u40b8terDot;\u40b7\xf2\u017fi;\u43a7rcle\u0200DMPT\u01c7\u01cb\u01d1\u01d6ot;\u6299inus;\u6296lus;\u6295imes;\u6297o\u0100cs\u01e2\u01f8kwiseContourIntegral;\u6232eCurly\u0100DQ\u0203\u020foubleQuote;\u601duote;\u6019\u0200lnpu\u021e\u0228\u0247\u0255on\u0100;e\u0225\u0226\u6237;\u6a74\u0180git\u022f\u0236\u023aruent;\u6261nt;\u622fourIntegral;\u622e\u0100fr\u024c\u024e;\u6102oduct;\u6210nterClockwiseContourIntegral;\u6233oss;\u6a2fcr;\uc000\ud835\udc9ep\u0100;C\u0284\u0285\u62d3ap;\u624d\u0580DJSZacefios\u02a0\u02ac\u02b0\u02b4\u02b8\u02cb\u02d7\u02e1\u02e6\u0333\u048d\u0100;o\u0179\u02a5trahd;\u6911cy;\u4402cy;\u4405cy;\u440f\u0180grs\u02bf\u02c4\u02c7ger;\u6021r;\u61a1hv;\u6ae4\u0100ay\u02d0\u02d5ron;\u410e;\u4414l\u0100;t\u02dd\u02de\u6207a;\u4394r;\uc000\ud835\udd07\u0100af\u02eb\u0327\u0100cm\u02f0\u0322ritical\u0200ADGT\u0300\u0306\u0316\u031ccute;\u40b4o\u0174\u030b\u030d;\u42d9bleAcute;\u42ddrave;\u4060ilde;\u42dcond;\u62c4ferentialD;\u6146\u0470\u033d\0\0\0\u0342\u0354\0\u0405f;\uc000\ud835\udd3b\u0180;DE\u0348\u0349\u034d\u40a8ot;\u60dcqual;\u6250ble\u0300CDLRUV\u0363\u0372\u0382\u03cf\u03e2\u03f8ontourIntegra\xec\u0239o\u0274\u0379\0\0\u037b\xbb\u0349nArrow;\u61d3\u0100eo\u0387\u03a4ft\u0180ART\u0390\u0396\u03a1rrow;\u61d0ightArrow;\u61d4e\xe5\u02cang\u0100LR\u03ab\u03c4eft\u0100AR\u03b3\u03b9rrow;\u67f8ightArrow;\u67faightArrow;\u67f9ight\u0100AT\u03d8\u03derrow;\u61d2ee;\u62a8p\u0241\u03e9\0\0\u03efrrow;\u61d1ownArrow;\u61d5erticalBar;\u6225n\u0300ABLRTa\u0412\u042a\u0430\u045e\u047f\u037crrow\u0180;BU\u041d\u041e\u0422\u6193ar;\u6913pArrow;\u61f5reve;\u4311eft\u02d2\u043a\0\u0446\0\u0450ightVector;\u6950eeVector;\u695eector\u0100;B\u0459\u045a\u61bdar;\u6956ight\u01d4\u0467\0\u0471eeVector;\u695fector\u0100;B\u047a\u047b\u61c1ar;\u6957ee\u0100;A\u0486\u0487\u62a4rrow;\u61a7\u0100ct\u0492\u0497r;\uc000\ud835\udc9frok;\u4110\u0800NTacdfglmopqstux\u04bd\u04c0\u04c4\u04cb\u04de\u04e2\u04e7\u04ee\u04f5\u0521\u052f\u0536\u0552\u055d\u0560\u0565G;\u414aH\u803b\xd0\u40d0cute\u803b\xc9\u40c9\u0180aiy\u04d2\u04d7\u04dcron;\u411arc\u803b\xca\u40ca;\u442dot;\u4116r;\uc000\ud835\udd08rave\u803b\xc8\u40c8ement;\u6208\u0100ap\u04fa\u04fecr;\u4112ty\u0253\u0506\0\0\u0512mallSquare;\u65fberySmallSquare;\u65ab\u0100gp\u0526\u052aon;\u4118f;\uc000\ud835\udd3csilon;\u4395u\u0100ai\u053c\u0549l\u0100;T\u0542\u0543\u6a75ilde;\u6242librium;\u61cc\u0100ci\u0557\u055ar;\u6130m;\u6a73a;\u4397ml\u803b\xcb\u40cb\u0100ip\u056a\u056fsts;\u6203onentialE;\u6147\u0280cfios\u0585\u0588\u058d\u05b2\u05ccy;\u4424r;\uc000\ud835\udd09lled\u0253\u0597\0\0\u05a3mallSquare;\u65fcerySmallSquare;\u65aa\u0370\u05ba\0\u05bf\0\0\u05c4f;\uc000\ud835\udd3dAll;\u6200riertrf;\u6131c\xf2\u05cb\u0600JTabcdfgorst\u05e8\u05ec\u05ef\u05fa\u0600\u0612\u0616\u061b\u061d\u0623\u066c\u0672cy;\u4403\u803b>\u403emma\u0100;d\u05f7\u05f8\u4393;\u43dcreve;\u411e\u0180eiy\u0607\u060c\u0610dil;\u4122rc;\u411c;\u4413ot;\u4120r;\uc000\ud835\udd0a;\u62d9pf;\uc000\ud835\udd3eeater\u0300EFGLST\u0635\u0644\u064e\u0656\u065b\u0666qual\u0100;L\u063e\u063f\u6265ess;\u62dbullEqual;\u6267reater;\u6aa2ess;\u6277lantEqual;\u6a7eilde;\u6273cr;\uc000\ud835\udca2;\u626b\u0400Aacfiosu\u0685\u068b\u0696\u069b\u069e\u06aa\u06be\u06caRDcy;\u442a\u0100ct\u0690\u0694ek;\u42c7;\u405eirc;\u4124r;\u610clbertSpace;\u610b\u01f0\u06af\0\u06b2f;\u610dizontalLine;\u6500\u0100ct\u06c3\u06c5\xf2\u06a9rok;\u4126mp\u0144\u06d0\u06d8ownHum\xf0\u012fqual;\u624f\u0700EJOacdfgmnostu\u06fa\u06fe\u0703\u0707\u070e\u071a\u071e\u0721\u0728\u0744\u0778\u078b\u078f\u0795cy;\u4415lig;\u4132cy;\u4401cute\u803b\xcd\u40cd\u0100iy\u0713\u0718rc\u803b\xce\u40ce;\u4418ot;\u4130r;\u6111rave\u803b\xcc\u40cc\u0180;ap\u0720\u072f\u073f\u0100cg\u0734\u0737r;\u412ainaryI;\u6148lie\xf3\u03dd\u01f4\u0749\0\u0762\u0100;e\u074d\u074e\u622c\u0100gr\u0753\u0758ral;\u622bsection;\u62c2isible\u0100CT\u076c\u0772omma;\u6063imes;\u6062\u0180gpt\u077f\u0783\u0788on;\u412ef;\uc000\ud835\udd40a;\u4399cr;\u6110ilde;\u4128\u01eb\u079a\0\u079ecy;\u4406l\u803b\xcf\u40cf\u0280cfosu\u07ac\u07b7\u07bc\u07c2\u07d0\u0100iy\u07b1\u07b5rc;\u4134;\u4419r;\uc000\ud835\udd0dpf;\uc000\ud835\udd41\u01e3\u07c7\0\u07ccr;\uc000\ud835\udca5rcy;\u4408kcy;\u4404\u0380HJacfos\u07e4\u07e8\u07ec\u07f1\u07fd\u0802\u0808cy;\u4425cy;\u440cppa;\u439a\u0100ey\u07f6\u07fbdil;\u4136;\u441ar;\uc000\ud835\udd0epf;\uc000\ud835\udd42cr;\uc000\ud835\udca6\u0580JTaceflmost\u0825\u0829\u082c\u0850\u0863\u09b3\u09b8\u09c7\u09cd\u0a37\u0a47cy;\u4409\u803b<\u403c\u0280cmnpr\u0837\u083c\u0841\u0844\u084dute;\u4139bda;\u439bg;\u67ealacetrf;\u6112r;\u619e\u0180aey\u0857\u085c\u0861ron;\u413ddil;\u413b;\u441b\u0100fs\u0868\u0970t\u0500ACDFRTUVar\u087e\u08a9\u08b1\u08e0\u08e6\u08fc\u092f\u095b\u0390\u096a\u0100nr\u0883\u088fgleBracket;\u67e8row\u0180;BR\u0899\u089a\u089e\u6190ar;\u61e4ightArrow;\u61c6eiling;\u6308o\u01f5\u08b7\0\u08c3bleBracket;\u67e6n\u01d4\u08c8\0\u08d2eeVector;\u6961ector\u0100;B\u08db\u08dc\u61c3ar;\u6959loor;\u630aight\u0100AV\u08ef\u08f5rrow;\u6194ector;\u694e\u0100er\u0901\u0917e\u0180;AV\u0909\u090a\u0910\u62a3rrow;\u61a4ector;\u695aiangle\u0180;BE\u0924\u0925\u0929\u62b2ar;\u69cfqual;\u62b4p\u0180DTV\u0937\u0942\u094cownVector;\u6951eeVector;\u6960ector\u0100;B\u0956\u0957\u61bfar;\u6958ector\u0100;B\u0965\u0966\u61bcar;\u6952ight\xe1\u039cs\u0300EFGLST\u097e\u098b\u0995\u099d\u09a2\u09adqualGreater;\u62daullEqual;\u6266reater;\u6276ess;\u6aa1lantEqual;\u6a7dilde;\u6272r;\uc000\ud835\udd0f\u0100;e\u09bd\u09be\u62d8ftarrow;\u61daidot;\u413f\u0180npw\u09d4\u0a16\u0a1bg\u0200LRlr\u09de\u09f7\u0a02\u0a10eft\u0100AR\u09e6\u09ecrrow;\u67f5ightArrow;\u67f7ightArrow;\u67f6eft\u0100ar\u03b3\u0a0aight\xe1\u03bfight\xe1\u03caf;\uc000\ud835\udd43er\u0100LR\u0a22\u0a2ceftArrow;\u6199ightArrow;\u6198\u0180cht\u0a3e\u0a40\u0a42\xf2\u084c;\u61b0rok;\u4141;\u626a\u0400acefiosu\u0a5a\u0a5d\u0a60\u0a77\u0a7c\u0a85\u0a8b\u0a8ep;\u6905y;\u441c\u0100dl\u0a65\u0a6fiumSpace;\u605flintrf;\u6133r;\uc000\ud835\udd10nusPlus;\u6213pf;\uc000\ud835\udd44c\xf2\u0a76;\u439c\u0480Jacefostu\u0aa3\u0aa7\u0aad\u0ac0\u0b14\u0b19\u0d91\u0d97\u0d9ecy;\u440acute;\u4143\u0180aey\u0ab4\u0ab9\u0aberon;\u4147dil;\u4145;\u441d\u0180gsw\u0ac7\u0af0\u0b0eative\u0180MTV\u0ad3\u0adf\u0ae8ediumSpace;\u600bhi\u0100cn\u0ae6\u0ad8\xeb\u0ad9eryThi\xee\u0ad9ted\u0100GL\u0af8\u0b06reaterGreate\xf2\u0673essLes\xf3\u0a48Line;\u400ar;\uc000\ud835\udd11\u0200Bnpt\u0b22\u0b28\u0b37\u0b3areak;\u6060BreakingSpace;\u40a0f;\u6115\u0680;CDEGHLNPRSTV\u0b55\u0b56\u0b6a\u0b7c\u0ba1\u0beb\u0c04\u0c5e\u0c84\u0ca6\u0cd8\u0d61\u0d85\u6aec\u0100ou\u0b5b\u0b64ngruent;\u6262pCap;\u626doubleVerticalBar;\u6226\u0180lqx\u0b83\u0b8a\u0b9bement;\u6209ual\u0100;T\u0b92\u0b93\u6260ilde;\uc000\u2242\u0338ists;\u6204reater\u0380;EFGLST\u0bb6\u0bb7\u0bbd\u0bc9\u0bd3\u0bd8\u0be5\u626fqual;\u6271ullEqual;\uc000\u2267\u0338reater;\uc000\u226b\u0338ess;\u6279lantEqual;\uc000\u2a7e\u0338ilde;\u6275ump\u0144\u0bf2\u0bfdownHump;\uc000\u224e\u0338qual;\uc000\u224f\u0338e\u0100fs\u0c0a\u0c27tTriangle\u0180;BE\u0c1a\u0c1b\u0c21\u62eaar;\uc000\u29cf\u0338qual;\u62ecs\u0300;EGLST\u0c35\u0c36\u0c3c\u0c44\u0c4b\u0c58\u626equal;\u6270reater;\u6278ess;\uc000\u226a\u0338lantEqual;\uc000\u2a7d\u0338ilde;\u6274ested\u0100GL\u0c68\u0c79reaterGreater;\uc000\u2aa2\u0338essLess;\uc000\u2aa1\u0338recedes\u0180;ES\u0c92\u0c93\u0c9b\u6280qual;\uc000\u2aaf\u0338lantEqual;\u62e0\u0100ei\u0cab\u0cb9verseElement;\u620cghtTriangle\u0180;BE\u0ccb\u0ccc\u0cd2\u62ebar;\uc000\u29d0\u0338qual;\u62ed\u0100qu\u0cdd\u0d0cuareSu\u0100bp\u0ce8\u0cf9set\u0100;E\u0cf0\u0cf3\uc000\u228f\u0338qual;\u62e2erset\u0100;E\u0d03\u0d06\uc000\u2290\u0338qual;\u62e3\u0180bcp\u0d13\u0d24\u0d4eset\u0100;E\u0d1b\u0d1e\uc000\u2282\u20d2qual;\u6288ceeds\u0200;EST\u0d32\u0d33\u0d3b\u0d46\u6281qual;\uc000\u2ab0\u0338lantEqual;\u62e1ilde;\uc000\u227f\u0338erset\u0100;E\u0d58\u0d5b\uc000\u2283\u20d2qual;\u6289ilde\u0200;EFT\u0d6e\u0d6f\u0d75\u0d7f\u6241qual;\u6244ullEqual;\u6247ilde;\u6249erticalBar;\u6224cr;\uc000\ud835\udca9ilde\u803b\xd1\u40d1;\u439d\u0700Eacdfgmoprstuv\u0dbd\u0dc2\u0dc9\u0dd5\u0ddb\u0de0\u0de7\u0dfc\u0e02\u0e20\u0e22\u0e32\u0e3f\u0e44lig;\u4152cute\u803b\xd3\u40d3\u0100iy\u0dce\u0dd3rc\u803b\xd4\u40d4;\u441eblac;\u4150r;\uc000\ud835\udd12rave\u803b\xd2\u40d2\u0180aei\u0dee\u0df2\u0df6cr;\u414cga;\u43a9cron;\u439fpf;\uc000\ud835\udd46enCurly\u0100DQ\u0e0e\u0e1aoubleQuote;\u601cuote;\u6018;\u6a54\u0100cl\u0e27\u0e2cr;\uc000\ud835\udcaaash\u803b\xd8\u40d8i\u016c\u0e37\u0e3cde\u803b\xd5\u40d5es;\u6a37ml\u803b\xd6\u40d6er\u0100BP\u0e4b\u0e60\u0100ar\u0e50\u0e53r;\u603eac\u0100ek\u0e5a\u0e5c;\u63deet;\u63b4arenthesis;\u63dc\u0480acfhilors\u0e7f\u0e87\u0e8a\u0e8f\u0e92\u0e94\u0e9d\u0eb0\u0efcrtialD;\u6202y;\u441fr;\uc000\ud835\udd13i;\u43a6;\u43a0usMinus;\u40b1\u0100ip\u0ea2\u0eadncareplan\xe5\u069df;\u6119\u0200;eio\u0eb9\u0eba\u0ee0\u0ee4\u6abbcedes\u0200;EST\u0ec8\u0ec9\u0ecf\u0eda\u627aqual;\u6aaflantEqual;\u627cilde;\u627eme;\u6033\u0100dp\u0ee9\u0eeeuct;\u620fortion\u0100;a\u0225\u0ef9l;\u621d\u0100ci\u0f01\u0f06r;\uc000\ud835\udcab;\u43a8\u0200Ufos\u0f11\u0f16\u0f1b\u0f1fOT\u803b\"\u4022r;\uc000\ud835\udd14pf;\u611acr;\uc000\ud835\udcac\u0600BEacefhiorsu\u0f3e\u0f43\u0f47\u0f60\u0f73\u0fa7\u0faa\u0fad\u1096\u10a9\u10b4\u10bearr;\u6910G\u803b\xae\u40ae\u0180cnr\u0f4e\u0f53\u0f56ute;\u4154g;\u67ebr\u0100;t\u0f5c\u0f5d\u61a0l;\u6916\u0180aey\u0f67\u0f6c\u0f71ron;\u4158dil;\u4156;\u4420\u0100;v\u0f78\u0f79\u611cerse\u0100EU\u0f82\u0f99\u0100lq\u0f87\u0f8eement;\u620builibrium;\u61cbpEquilibrium;\u696fr\xbb\u0f79o;\u43a1ght\u0400ACDFTUVa\u0fc1\u0feb\u0ff3\u1022\u1028\u105b\u1087\u03d8\u0100nr\u0fc6\u0fd2gleBracket;\u67e9row\u0180;BL\u0fdc\u0fdd\u0fe1\u6192ar;\u61e5eftArrow;\u61c4eiling;\u6309o\u01f5\u0ff9\0\u1005bleBracket;\u67e7n\u01d4\u100a\0\u1014eeVector;\u695dector\u0100;B\u101d\u101e\u61c2ar;\u6955loor;\u630b\u0100er\u102d\u1043e\u0180;AV\u1035\u1036\u103c\u62a2rrow;\u61a6ector;\u695biangle\u0180;BE\u1050\u1051\u1055\u62b3ar;\u69d0qual;\u62b5p\u0180DTV\u1063\u106e\u1078ownVector;\u694feeVector;\u695cector\u0100;B\u1082\u1083\u61bear;\u6954ector\u0100;B\u1091\u1092\u61c0ar;\u6953\u0100pu\u109b\u109ef;\u611dndImplies;\u6970ightarrow;\u61db\u0100ch\u10b9\u10bcr;\u611b;\u61b1leDelayed;\u69f4\u0680HOacfhimoqstu\u10e4\u10f1\u10f7\u10fd\u1119\u111e\u1151\u1156\u1161\u1167\u11b5\u11bb\u11bf\u0100Cc\u10e9\u10eeHcy;\u4429y;\u4428FTcy;\u442ccute;\u415a\u0280;aeiy\u1108\u1109\u110e\u1113\u1117\u6abcron;\u4160dil;\u415erc;\u415c;\u4421r;\uc000\ud835\udd16ort\u0200DLRU\u112a\u1134\u113e\u1149ownArrow\xbb\u041eeftArrow\xbb\u089aightArrow\xbb\u0fddpArrow;\u6191gma;\u43a3allCircle;\u6218pf;\uc000\ud835\udd4a\u0272\u116d\0\0\u1170t;\u621aare\u0200;ISU\u117b\u117c\u1189\u11af\u65a1ntersection;\u6293u\u0100bp\u118f\u119eset\u0100;E\u1197\u1198\u628fqual;\u6291erset\u0100;E\u11a8\u11a9\u6290qual;\u6292nion;\u6294cr;\uc000\ud835\udcaear;\u62c6\u0200bcmp\u11c8\u11db\u1209\u120b\u0100;s\u11cd\u11ce\u62d0et\u0100;E\u11cd\u11d5qual;\u6286\u0100ch\u11e0\u1205eeds\u0200;EST\u11ed\u11ee\u11f4\u11ff\u627bqual;\u6ab0lantEqual;\u627dilde;\u627fTh\xe1\u0f8c;\u6211\u0180;es\u1212\u1213\u1223\u62d1rset\u0100;E\u121c\u121d\u6283qual;\u6287et\xbb\u1213\u0580HRSacfhiors\u123e\u1244\u1249\u1255\u125e\u1271\u1276\u129f\u12c2\u12c8\u12d1ORN\u803b\xde\u40deADE;\u6122\u0100Hc\u124e\u1252cy;\u440by;\u4426\u0100bu\u125a\u125c;\u4009;\u43a4\u0180aey\u1265\u126a\u126fron;\u4164dil;\u4162;\u4422r;\uc000\ud835\udd17\u0100ei\u127b\u1289\u01f2\u1280\0\u1287efore;\u6234a;\u4398\u0100cn\u128e\u1298kSpace;\uc000\u205f\u200aSpace;\u6009lde\u0200;EFT\u12ab\u12ac\u12b2\u12bc\u623cqual;\u6243ullEqual;\u6245ilde;\u6248pf;\uc000\ud835\udd4bipleDot;\u60db\u0100ct\u12d6\u12dbr;\uc000\ud835\udcafrok;\u4166\u0ae1\u12f7\u130e\u131a\u1326\0\u132c\u1331\0\0\0\0\0\u1338\u133d\u1377\u1385\0\u13ff\u1404\u140a\u1410\u0100cr\u12fb\u1301ute\u803b\xda\u40dar\u0100;o\u1307\u1308\u619fcir;\u6949r\u01e3\u1313\0\u1316y;\u440eve;\u416c\u0100iy\u131e\u1323rc\u803b\xdb\u40db;\u4423blac;\u4170r;\uc000\ud835\udd18rave\u803b\xd9\u40d9acr;\u416a\u0100di\u1341\u1369er\u0100BP\u1348\u135d\u0100ar\u134d\u1350r;\u405fac\u0100ek\u1357\u1359;\u63dfet;\u63b5arenthesis;\u63ddon\u0100;P\u1370\u1371\u62c3lus;\u628e\u0100gp\u137b\u137fon;\u4172f;\uc000\ud835\udd4c\u0400ADETadps\u1395\u13ae\u13b8\u13c4\u03e8\u13d2\u13d7\u13f3rrow\u0180;BD\u1150\u13a0\u13a4ar;\u6912ownArrow;\u61c5ownArrow;\u6195quilibrium;\u696eee\u0100;A\u13cb\u13cc\u62a5rrow;\u61a5own\xe1\u03f3er\u0100LR\u13de\u13e8eftArrow;\u6196ightArrow;\u6197i\u0100;l\u13f9\u13fa\u43d2on;\u43a5ing;\u416ecr;\uc000\ud835\udcb0ilde;\u4168ml\u803b\xdc\u40dc\u0480Dbcdefosv\u1427\u142c\u1430\u1433\u143e\u1485\u148a\u1490\u1496ash;\u62abar;\u6aeby;\u4412ash\u0100;l\u143b\u143c\u62a9;\u6ae6\u0100er\u1443\u1445;\u62c1\u0180bty\u144c\u1450\u147aar;\u6016\u0100;i\u144f\u1455cal\u0200BLST\u1461\u1465\u146a\u1474ar;\u6223ine;\u407ceparator;\u6758ilde;\u6240ThinSpace;\u600ar;\uc000\ud835\udd19pf;\uc000\ud835\udd4dcr;\uc000\ud835\udcb1dash;\u62aa\u0280cefos\u14a7\u14ac\u14b1\u14b6\u14bcirc;\u4174dge;\u62c0r;\uc000\ud835\udd1apf;\uc000\ud835\udd4ecr;\uc000\ud835\udcb2\u0200fios\u14cb\u14d0\u14d2\u14d8r;\uc000\ud835\udd1b;\u439epf;\uc000\ud835\udd4fcr;\uc000\ud835\udcb3\u0480AIUacfosu\u14f1\u14f5\u14f9\u14fd\u1504\u150f\u1514\u151a\u1520cy;\u442fcy;\u4407cy;\u442ecute\u803b\xdd\u40dd\u0100iy\u1509\u150drc;\u4176;\u442br;\uc000\ud835\udd1cpf;\uc000\ud835\udd50cr;\uc000\ud835\udcb4ml;\u4178\u0400Hacdefos\u1535\u1539\u153f\u154b\u154f\u155d\u1560\u1564cy;\u4416cute;\u4179\u0100ay\u1544\u1549ron;\u417d;\u4417ot;\u417b\u01f2\u1554\0\u155boWidt\xe8\u0ad9a;\u4396r;\u6128pf;\u6124cr;\uc000\ud835\udcb5\u0be1\u1583\u158a\u1590\0\u15b0\u15b6\u15bf\0\0\0\0\u15c6\u15db\u15eb\u165f\u166d\0\u1695\u169b\u16b2\u16b9\0\u16becute\u803b\xe1\u40e1reve;\u4103\u0300;Ediuy\u159c\u159d\u15a1\u15a3\u15a8\u15ad\u623e;\uc000\u223e\u0333;\u623frc\u803b\xe2\u40e2te\u80bb\xb4\u0306;\u4430lig\u803b\xe6\u40e6\u0100;r\xb2\u15ba;\uc000\ud835\udd1erave\u803b\xe0\u40e0\u0100ep\u15ca\u15d6\u0100fp\u15cf\u15d4sym;\u6135\xe8\u15d3ha;\u43b1\u0100ap\u15dfc\u0100cl\u15e4\u15e7r;\u4101g;\u6a3f\u0264\u15f0\0\0\u160a\u0280;adsv\u15fa\u15fb\u15ff\u1601\u1607\u6227nd;\u6a55;\u6a5clope;\u6a58;\u6a5a\u0380;elmrsz\u1618\u1619\u161b\u161e\u163f\u164f\u1659\u6220;\u69a4e\xbb\u1619sd\u0100;a\u1625\u1626\u6221\u0461\u1630\u1632\u1634\u1636\u1638\u163a\u163c\u163e;\u69a8;\u69a9;\u69aa;\u69ab;\u69ac;\u69ad;\u69ae;\u69aft\u0100;v\u1645\u1646\u621fb\u0100;d\u164c\u164d\u62be;\u699d\u0100pt\u1654\u1657h;\u6222\xbb\xb9arr;\u637c\u0100gp\u1663\u1667on;\u4105f;\uc000\ud835\udd52\u0380;Eaeiop\u12c1\u167b\u167d\u1682\u1684\u1687\u168a;\u6a70cir;\u6a6f;\u624ad;\u624bs;\u4027rox\u0100;e\u12c1\u1692\xf1\u1683ing\u803b\xe5\u40e5\u0180cty\u16a1\u16a6\u16a8r;\uc000\ud835\udcb6;\u402amp\u0100;e\u12c1\u16af\xf1\u0288ilde\u803b\xe3\u40e3ml\u803b\xe4\u40e4\u0100ci\u16c2\u16c8onin\xf4\u0272nt;\u6a11\u0800Nabcdefiklnoprsu\u16ed\u16f1\u1730\u173c\u1743\u1748\u1778\u177d\u17e0\u17e6\u1839\u1850\u170d\u193d\u1948\u1970ot;\u6aed\u0100cr\u16f6\u171ek\u0200ceps\u1700\u1705\u170d\u1713ong;\u624cpsilon;\u43f6rime;\u6035im\u0100;e\u171a\u171b\u623dq;\u62cd\u0176\u1722\u1726ee;\u62bded\u0100;g\u172c\u172d\u6305e\xbb\u172drk\u0100;t\u135c\u1737brk;\u63b6\u0100oy\u1701\u1741;\u4431quo;\u601e\u0280cmprt\u1753\u175b\u1761\u1764\u1768aus\u0100;e\u010a\u0109ptyv;\u69b0s\xe9\u170cno\xf5\u0113\u0180ahw\u176f\u1771\u1773;\u43b2;\u6136een;\u626cr;\uc000\ud835\udd1fg\u0380costuvw\u178d\u179d\u17b3\u17c1\u17d5\u17db\u17de\u0180aiu\u1794\u1796\u179a\xf0\u0760rc;\u65efp\xbb\u1371\u0180dpt\u17a4\u17a8\u17adot;\u6a00lus;\u6a01imes;\u6a02\u0271\u17b9\0\0\u17becup;\u6a06ar;\u6605riangle\u0100du\u17cd\u17d2own;\u65bdp;\u65b3plus;\u6a04e\xe5\u1444\xe5\u14adarow;\u690d\u0180ako\u17ed\u1826\u1835\u0100cn\u17f2\u1823k\u0180lst\u17fa\u05ab\u1802ozenge;\u69ebriangle\u0200;dlr\u1812\u1813\u1818\u181d\u65b4own;\u65beeft;\u65c2ight;\u65b8k;\u6423\u01b1\u182b\0\u1833\u01b2\u182f\0\u1831;\u6592;\u65914;\u6593ck;\u6588\u0100eo\u183e\u184d\u0100;q\u1843\u1846\uc000=\u20e5uiv;\uc000\u2261\u20e5t;\u6310\u0200ptwx\u1859\u185e\u1867\u186cf;\uc000\ud835\udd53\u0100;t\u13cb\u1863om\xbb\u13cctie;\u62c8\u0600DHUVbdhmptuv\u1885\u1896\u18aa\u18bb\u18d7\u18db\u18ec\u18ff\u1905\u190a\u1910\u1921\u0200LRlr\u188e\u1890\u1892\u1894;\u6557;\u6554;\u6556;\u6553\u0280;DUdu\u18a1\u18a2\u18a4\u18a6\u18a8\u6550;\u6566;\u6569;\u6564;\u6567\u0200LRlr\u18b3\u18b5\u18b7\u18b9;\u655d;\u655a;\u655c;\u6559\u0380;HLRhlr\u18ca\u18cb\u18cd\u18cf\u18d1\u18d3\u18d5\u6551;\u656c;\u6563;\u6560;\u656b;\u6562;\u655fox;\u69c9\u0200LRlr\u18e4\u18e6\u18e8\u18ea;\u6555;\u6552;\u6510;\u650c\u0280;DUdu\u06bd\u18f7\u18f9\u18fb\u18fd;\u6565;\u6568;\u652c;\u6534inus;\u629flus;\u629eimes;\u62a0\u0200LRlr\u1919\u191b\u191d\u191f;\u655b;\u6558;\u6518;\u6514\u0380;HLRhlr\u1930\u1931\u1933\u1935\u1937\u1939\u193b\u6502;\u656a;\u6561;\u655e;\u653c;\u6524;\u651c\u0100ev\u0123\u1942bar\u803b\xa6\u40a6\u0200ceio\u1951\u1956\u195a\u1960r;\uc000\ud835\udcb7mi;\u604fm\u0100;e\u171a\u171cl\u0180;bh\u1968\u1969\u196b\u405c;\u69c5sub;\u67c8\u016c\u1974\u197el\u0100;e\u1979\u197a\u6022t\xbb\u197ap\u0180;Ee\u012f\u1985\u1987;\u6aae\u0100;q\u06dc\u06db\u0ce1\u19a7\0\u19e8\u1a11\u1a15\u1a32\0\u1a37\u1a50\0\0\u1ab4\0\0\u1ac1\0\0\u1b21\u1b2e\u1b4d\u1b52\0\u1bfd\0\u1c0c\u0180cpr\u19ad\u19b2\u19ddute;\u4107\u0300;abcds\u19bf\u19c0\u19c4\u19ca\u19d5\u19d9\u6229nd;\u6a44rcup;\u6a49\u0100au\u19cf\u19d2p;\u6a4bp;\u6a47ot;\u6a40;\uc000\u2229\ufe00\u0100eo\u19e2\u19e5t;\u6041\xee\u0693\u0200aeiu\u19f0\u19fb\u1a01\u1a05\u01f0\u19f5\0\u19f8s;\u6a4don;\u410ddil\u803b\xe7\u40e7rc;\u4109ps\u0100;s\u1a0c\u1a0d\u6a4cm;\u6a50ot;\u410b\u0180dmn\u1a1b\u1a20\u1a26il\u80bb\xb8\u01adptyv;\u69b2t\u8100\xa2;e\u1a2d\u1a2e\u40a2r\xe4\u01b2r;\uc000\ud835\udd20\u0180cei\u1a3d\u1a40\u1a4dy;\u4447ck\u0100;m\u1a47\u1a48\u6713ark\xbb\u1a48;\u43c7r\u0380;Ecefms\u1a5f\u1a60\u1a62\u1a6b\u1aa4\u1aaa\u1aae\u65cb;\u69c3\u0180;el\u1a69\u1a6a\u1a6d\u42c6q;\u6257e\u0261\u1a74\0\0\u1a88rrow\u0100lr\u1a7c\u1a81eft;\u61baight;\u61bb\u0280RSacd\u1a92\u1a94\u1a96\u1a9a\u1a9f\xbb\u0f47;\u64c8st;\u629birc;\u629aash;\u629dnint;\u6a10id;\u6aefcir;\u69c2ubs\u0100;u\u1abb\u1abc\u6663it\xbb\u1abc\u02ec\u1ac7\u1ad4\u1afa\0\u1b0aon\u0100;e\u1acd\u1ace\u403a\u0100;q\xc7\xc6\u026d\u1ad9\0\0\u1ae2a\u0100;t\u1ade\u1adf\u402c;\u4040\u0180;fl\u1ae8\u1ae9\u1aeb\u6201\xee\u1160e\u0100mx\u1af1\u1af6ent\xbb\u1ae9e\xf3\u024d\u01e7\u1afe\0\u1b07\u0100;d\u12bb\u1b02ot;\u6a6dn\xf4\u0246\u0180fry\u1b10\u1b14\u1b17;\uc000\ud835\udd54o\xe4\u0254\u8100\xa9;s\u0155\u1b1dr;\u6117\u0100ao\u1b25\u1b29rr;\u61b5ss;\u6717\u0100cu\u1b32\u1b37r;\uc000\ud835\udcb8\u0100bp\u1b3c\u1b44\u0100;e\u1b41\u1b42\u6acf;\u6ad1\u0100;e\u1b49\u1b4a\u6ad0;\u6ad2dot;\u62ef\u0380delprvw\u1b60\u1b6c\u1b77\u1b82\u1bac\u1bd4\u1bf9arr\u0100lr\u1b68\u1b6a;\u6938;\u6935\u0270\u1b72\0\0\u1b75r;\u62dec;\u62dfarr\u0100;p\u1b7f\u1b80\u61b6;\u693d\u0300;bcdos\u1b8f\u1b90\u1b96\u1ba1\u1ba5\u1ba8\u622arcap;\u6a48\u0100au\u1b9b\u1b9ep;\u6a46p;\u6a4aot;\u628dr;\u6a45;\uc000\u222a\ufe00\u0200alrv\u1bb5\u1bbf\u1bde\u1be3rr\u0100;m\u1bbc\u1bbd\u61b7;\u693cy\u0180evw\u1bc7\u1bd4\u1bd8q\u0270\u1bce\0\0\u1bd2re\xe3\u1b73u\xe3\u1b75ee;\u62ceedge;\u62cfen\u803b\xa4\u40a4earrow\u0100lr\u1bee\u1bf3eft\xbb\u1b80ight\xbb\u1bbde\xe4\u1bdd\u0100ci\u1c01\u1c07onin\xf4\u01f7nt;\u6231lcty;\u632d\u0980AHabcdefhijlorstuwz\u1c38\u1c3b\u1c3f\u1c5d\u1c69\u1c75\u1c8a\u1c9e\u1cac\u1cb7\u1cfb\u1cff\u1d0d\u1d7b\u1d91\u1dab\u1dbb\u1dc6\u1dcdr\xf2\u0381ar;\u6965\u0200glrs\u1c48\u1c4d\u1c52\u1c54ger;\u6020eth;\u6138\xf2\u1133h\u0100;v\u1c5a\u1c5b\u6010\xbb\u090a\u016b\u1c61\u1c67arow;\u690fa\xe3\u0315\u0100ay\u1c6e\u1c73ron;\u410f;\u4434\u0180;ao\u0332\u1c7c\u1c84\u0100gr\u02bf\u1c81r;\u61catseq;\u6a77\u0180glm\u1c91\u1c94\u1c98\u803b\xb0\u40b0ta;\u43b4ptyv;\u69b1\u0100ir\u1ca3\u1ca8sht;\u697f;\uc000\ud835\udd21ar\u0100lr\u1cb3\u1cb5\xbb\u08dc\xbb\u101e\u0280aegsv\u1cc2\u0378\u1cd6\u1cdc\u1ce0m\u0180;os\u0326\u1cca\u1cd4nd\u0100;s\u0326\u1cd1uit;\u6666amma;\u43ddin;\u62f2\u0180;io\u1ce7\u1ce8\u1cf8\u40f7de\u8100\xf7;o\u1ce7\u1cf0ntimes;\u62c7n\xf8\u1cf7cy;\u4452c\u026f\u1d06\0\0\u1d0arn;\u631eop;\u630d\u0280lptuw\u1d18\u1d1d\u1d22\u1d49\u1d55lar;\u4024f;\uc000\ud835\udd55\u0280;emps\u030b\u1d2d\u1d37\u1d3d\u1d42q\u0100;d\u0352\u1d33ot;\u6251inus;\u6238lus;\u6214quare;\u62a1blebarwedg\xe5\xfan\u0180adh\u112e\u1d5d\u1d67ownarrow\xf3\u1c83arpoon\u0100lr\u1d72\u1d76ef\xf4\u1cb4igh\xf4\u1cb6\u0162\u1d7f\u1d85karo\xf7\u0f42\u026f\u1d8a\0\0\u1d8ern;\u631fop;\u630c\u0180cot\u1d98\u1da3\u1da6\u0100ry\u1d9d\u1da1;\uc000\ud835\udcb9;\u4455l;\u69f6rok;\u4111\u0100dr\u1db0\u1db4ot;\u62f1i\u0100;f\u1dba\u1816\u65bf\u0100ah\u1dc0\u1dc3r\xf2\u0429a\xf2\u0fa6angle;\u69a6\u0100ci\u1dd2\u1dd5y;\u445fgrarr;\u67ff\u0900Dacdefglmnopqrstux\u1e01\u1e09\u1e19\u1e38\u0578\u1e3c\u1e49\u1e61\u1e7e\u1ea5\u1eaf\u1ebd\u1ee1\u1f2a\u1f37\u1f44\u1f4e\u1f5a\u0100Do\u1e06\u1d34o\xf4\u1c89\u0100cs\u1e0e\u1e14ute\u803b\xe9\u40e9ter;\u6a6e\u0200aioy\u1e22\u1e27\u1e31\u1e36ron;\u411br\u0100;c\u1e2d\u1e2e\u6256\u803b\xea\u40ealon;\u6255;\u444dot;\u4117\u0100Dr\u1e41\u1e45ot;\u6252;\uc000\ud835\udd22\u0180;rs\u1e50\u1e51\u1e57\u6a9aave\u803b\xe8\u40e8\u0100;d\u1e5c\u1e5d\u6a96ot;\u6a98\u0200;ils\u1e6a\u1e6b\u1e72\u1e74\u6a99nters;\u63e7;\u6113\u0100;d\u1e79\u1e7a\u6a95ot;\u6a97\u0180aps\u1e85\u1e89\u1e97cr;\u4113ty\u0180;sv\u1e92\u1e93\u1e95\u6205et\xbb\u1e93p\u01001;\u1e9d\u1ea4\u0133\u1ea1\u1ea3;\u6004;\u6005\u6003\u0100gs\u1eaa\u1eac;\u414bp;\u6002\u0100gp\u1eb4\u1eb8on;\u4119f;\uc000\ud835\udd56\u0180als\u1ec4\u1ece\u1ed2r\u0100;s\u1eca\u1ecb\u62d5l;\u69e3us;\u6a71i\u0180;lv\u1eda\u1edb\u1edf\u43b5on\xbb\u1edb;\u43f5\u0200csuv\u1eea\u1ef3\u1f0b\u1f23\u0100io\u1eef\u1e31rc\xbb\u1e2e\u0269\u1ef9\0\0\u1efb\xed\u0548ant\u0100gl\u1f02\u1f06tr\xbb\u1e5dess\xbb\u1e7a\u0180aei\u1f12\u1f16\u1f1als;\u403dst;\u625fv\u0100;D\u0235\u1f20D;\u6a78parsl;\u69e5\u0100Da\u1f2f\u1f33ot;\u6253rr;\u6971\u0180cdi\u1f3e\u1f41\u1ef8r;\u612fo\xf4\u0352\u0100ah\u1f49\u1f4b;\u43b7\u803b\xf0\u40f0\u0100mr\u1f53\u1f57l\u803b\xeb\u40ebo;\u60ac\u0180cip\u1f61\u1f64\u1f67l;\u4021s\xf4\u056e\u0100eo\u1f6c\u1f74ctatio\xee\u0559nential\xe5\u0579\u09e1\u1f92\0\u1f9e\0\u1fa1\u1fa7\0\0\u1fc6\u1fcc\0\u1fd3\0\u1fe6\u1fea\u2000\0\u2008\u205allingdotse\xf1\u1e44y;\u4444male;\u6640\u0180ilr\u1fad\u1fb3\u1fc1lig;\u8000\ufb03\u0269\u1fb9\0\0\u1fbdg;\u8000\ufb00ig;\u8000\ufb04;\uc000\ud835\udd23lig;\u8000\ufb01lig;\uc000fj\u0180alt\u1fd9\u1fdc\u1fe1t;\u666dig;\u8000\ufb02ns;\u65b1of;\u4192\u01f0\u1fee\0\u1ff3f;\uc000\ud835\udd57\u0100ak\u05bf\u1ff7\u0100;v\u1ffc\u1ffd\u62d4;\u6ad9artint;\u6a0d\u0100ao\u200c\u2055\u0100cs\u2011\u2052\u03b1\u201a\u2030\u2038\u2045\u2048\0\u2050\u03b2\u2022\u2025\u2027\u202a\u202c\0\u202e\u803b\xbd\u40bd;\u6153\u803b\xbc\u40bc;\u6155;\u6159;\u615b\u01b3\u2034\0\u2036;\u6154;\u6156\u02b4\u203e\u2041\0\0\u2043\u803b\xbe\u40be;\u6157;\u615c5;\u6158\u01b6\u204c\0\u204e;\u615a;\u615d8;\u615el;\u6044wn;\u6322cr;\uc000\ud835\udcbb\u0880Eabcdefgijlnorstv\u2082\u2089\u209f\u20a5\u20b0\u20b4\u20f0\u20f5\u20fa\u20ff\u2103\u2112\u2138\u0317\u213e\u2152\u219e\u0100;l\u064d\u2087;\u6a8c\u0180cmp\u2090\u2095\u209dute;\u41f5ma\u0100;d\u209c\u1cda\u43b3;\u6a86reve;\u411f\u0100iy\u20aa\u20aerc;\u411d;\u4433ot;\u4121\u0200;lqs\u063e\u0642\u20bd\u20c9\u0180;qs\u063e\u064c\u20c4lan\xf4\u0665\u0200;cdl\u0665\u20d2\u20d5\u20e5c;\u6aa9ot\u0100;o\u20dc\u20dd\u6a80\u0100;l\u20e2\u20e3\u6a82;\u6a84\u0100;e\u20ea\u20ed\uc000\u22db\ufe00s;\u6a94r;\uc000\ud835\udd24\u0100;g\u0673\u061bmel;\u6137cy;\u4453\u0200;Eaj\u065a\u210c\u210e\u2110;\u6a92;\u6aa5;\u6aa4\u0200Eaes\u211b\u211d\u2129\u2134;\u6269p\u0100;p\u2123\u2124\u6a8arox\xbb\u2124\u0100;q\u212e\u212f\u6a88\u0100;q\u212e\u211bim;\u62e7pf;\uc000\ud835\udd58\u0100ci\u2143\u2146r;\u610am\u0180;el\u066b\u214e\u2150;\u6a8e;\u6a90\u8300>;cdlqr\u05ee\u2160\u216a\u216e\u2173\u2179\u0100ci\u2165\u2167;\u6aa7r;\u6a7aot;\u62d7Par;\u6995uest;\u6a7c\u0280adels\u2184\u216a\u2190\u0656\u219b\u01f0\u2189\0\u218epro\xf8\u209er;\u6978q\u0100lq\u063f\u2196les\xf3\u2088i\xed\u066b\u0100en\u21a3\u21adrtneqq;\uc000\u2269\ufe00\xc5\u21aa\u0500Aabcefkosy\u21c4\u21c7\u21f1\u21f5\u21fa\u2218\u221d\u222f\u2268\u227dr\xf2\u03a0\u0200ilmr\u21d0\u21d4\u21d7\u21dbrs\xf0\u1484f\xbb\u2024il\xf4\u06a9\u0100dr\u21e0\u21e4cy;\u444a\u0180;cw\u08f4\u21eb\u21efir;\u6948;\u61adar;\u610firc;\u4125\u0180alr\u2201\u220e\u2213rts\u0100;u\u2209\u220a\u6665it\xbb\u220alip;\u6026con;\u62b9r;\uc000\ud835\udd25s\u0100ew\u2223\u2229arow;\u6925arow;\u6926\u0280amopr\u223a\u223e\u2243\u225e\u2263rr;\u61fftht;\u623bk\u0100lr\u2249\u2253eftarrow;\u61a9ightarrow;\u61aaf;\uc000\ud835\udd59bar;\u6015\u0180clt\u226f\u2274\u2278r;\uc000\ud835\udcbdas\xe8\u21f4rok;\u4127\u0100bp\u2282\u2287ull;\u6043hen\xbb\u1c5b\u0ae1\u22a3\0\u22aa\0\u22b8\u22c5\u22ce\0\u22d5\u22f3\0\0\u22f8\u2322\u2367\u2362\u237f\0\u2386\u23aa\u23b4cute\u803b\xed\u40ed\u0180;iy\u0771\u22b0\u22b5rc\u803b\xee\u40ee;\u4438\u0100cx\u22bc\u22bfy;\u4435cl\u803b\xa1\u40a1\u0100fr\u039f\u22c9;\uc000\ud835\udd26rave\u803b\xec\u40ec\u0200;ino\u073e\u22dd\u22e9\u22ee\u0100in\u22e2\u22e6nt;\u6a0ct;\u622dfin;\u69dcta;\u6129lig;\u4133\u0180aop\u22fe\u231a\u231d\u0180cgt\u2305\u2308\u2317r;\u412b\u0180elp\u071f\u230f\u2313in\xe5\u078ear\xf4\u0720h;\u4131f;\u62b7ed;\u41b5\u0280;cfot\u04f4\u232c\u2331\u233d\u2341are;\u6105in\u0100;t\u2338\u2339\u621eie;\u69dddo\xf4\u2319\u0280;celp\u0757\u234c\u2350\u235b\u2361al;\u62ba\u0100gr\u2355\u2359er\xf3\u1563\xe3\u234darhk;\u6a17rod;\u6a3c\u0200cgpt\u236f\u2372\u2376\u237by;\u4451on;\u412ff;\uc000\ud835\udd5aa;\u43b9uest\u803b\xbf\u40bf\u0100ci\u238a\u238fr;\uc000\ud835\udcben\u0280;Edsv\u04f4\u239b\u239d\u23a1\u04f3;\u62f9ot;\u62f5\u0100;v\u23a6\u23a7\u62f4;\u62f3\u0100;i\u0777\u23aelde;\u4129\u01eb\u23b8\0\u23bccy;\u4456l\u803b\xef\u40ef\u0300cfmosu\u23cc\u23d7\u23dc\u23e1\u23e7\u23f5\u0100iy\u23d1\u23d5rc;\u4135;\u4439r;\uc000\ud835\udd27ath;\u4237pf;\uc000\ud835\udd5b\u01e3\u23ec\0\u23f1r;\uc000\ud835\udcbfrcy;\u4458kcy;\u4454\u0400acfghjos\u240b\u2416\u2422\u2427\u242d\u2431\u2435\u243bppa\u0100;v\u2413\u2414\u43ba;\u43f0\u0100ey\u241b\u2420dil;\u4137;\u443ar;\uc000\ud835\udd28reen;\u4138cy;\u4445cy;\u445cpf;\uc000\ud835\udd5ccr;\uc000\ud835\udcc0\u0b80ABEHabcdefghjlmnoprstuv\u2470\u2481\u2486\u248d\u2491\u250e\u253d\u255a\u2580\u264e\u265e\u2665\u2679\u267d\u269a\u26b2\u26d8\u275d\u2768\u278b\u27c0\u2801\u2812\u0180art\u2477\u247a\u247cr\xf2\u09c6\xf2\u0395ail;\u691barr;\u690e\u0100;g\u0994\u248b;\u6a8bar;\u6962\u0963\u24a5\0\u24aa\0\u24b1\0\0\0\0\0\u24b5\u24ba\0\u24c6\u24c8\u24cd\0\u24f9ute;\u413amptyv;\u69b4ra\xee\u084cbda;\u43bbg\u0180;dl\u088e\u24c1\u24c3;\u6991\xe5\u088e;\u6a85uo\u803b\xab\u40abr\u0400;bfhlpst\u0899\u24de\u24e6\u24e9\u24eb\u24ee\u24f1\u24f5\u0100;f\u089d\u24e3s;\u691fs;\u691d\xeb\u2252p;\u61abl;\u6939im;\u6973l;\u61a2\u0180;ae\u24ff\u2500\u2504\u6aabil;\u6919\u0100;s\u2509\u250a\u6aad;\uc000\u2aad\ufe00\u0180abr\u2515\u2519\u251drr;\u690crk;\u6772\u0100ak\u2522\u252cc\u0100ek\u2528\u252a;\u407b;\u405b\u0100es\u2531\u2533;\u698bl\u0100du\u2539\u253b;\u698f;\u698d\u0200aeuy\u2546\u254b\u2556\u2558ron;\u413e\u0100di\u2550\u2554il;\u413c\xec\u08b0\xe2\u2529;\u443b\u0200cqrs\u2563\u2566\u256d\u257da;\u6936uo\u0100;r\u0e19\u1746\u0100du\u2572\u2577har;\u6967shar;\u694bh;\u61b2\u0280;fgqs\u258b\u258c\u0989\u25f3\u25ff\u6264t\u0280ahlrt\u2598\u25a4\u25b7\u25c2\u25e8rrow\u0100;t\u0899\u25a1a\xe9\u24f6arpoon\u0100du\u25af\u25b4own\xbb\u045ap\xbb\u0966eftarrows;\u61c7ight\u0180ahs\u25cd\u25d6\u25derrow\u0100;s\u08f4\u08a7arpoon\xf3\u0f98quigarro\xf7\u21f0hreetimes;\u62cb\u0180;qs\u258b\u0993\u25falan\xf4\u09ac\u0280;cdgs\u09ac\u260a\u260d\u261d\u2628c;\u6aa8ot\u0100;o\u2614\u2615\u6a7f\u0100;r\u261a\u261b\u6a81;\u6a83\u0100;e\u2622\u2625\uc000\u22da\ufe00s;\u6a93\u0280adegs\u2633\u2639\u263d\u2649\u264bppro\xf8\u24c6ot;\u62d6q\u0100gq\u2643\u2645\xf4\u0989gt\xf2\u248c\xf4\u099bi\xed\u09b2\u0180ilr\u2655\u08e1\u265asht;\u697c;\uc000\ud835\udd29\u0100;E\u099c\u2663;\u6a91\u0161\u2669\u2676r\u0100du\u25b2\u266e\u0100;l\u0965\u2673;\u696alk;\u6584cy;\u4459\u0280;acht\u0a48\u2688\u268b\u2691\u2696r\xf2\u25c1orne\xf2\u1d08ard;\u696bri;\u65fa\u0100io\u269f\u26a4dot;\u4140ust\u0100;a\u26ac\u26ad\u63b0che\xbb\u26ad\u0200Eaes\u26bb\u26bd\u26c9\u26d4;\u6268p\u0100;p\u26c3\u26c4\u6a89rox\xbb\u26c4\u0100;q\u26ce\u26cf\u6a87\u0100;q\u26ce\u26bbim;\u62e6\u0400abnoptwz\u26e9\u26f4\u26f7\u271a\u272f\u2741\u2747\u2750\u0100nr\u26ee\u26f1g;\u67ecr;\u61fdr\xeb\u08c1g\u0180lmr\u26ff\u270d\u2714eft\u0100ar\u09e6\u2707ight\xe1\u09f2apsto;\u67fcight\xe1\u09fdparrow\u0100lr\u2725\u2729ef\xf4\u24edight;\u61ac\u0180afl\u2736\u2739\u273dr;\u6985;\uc000\ud835\udd5dus;\u6a2dimes;\u6a34\u0161\u274b\u274fst;\u6217\xe1\u134e\u0180;ef\u2757\u2758\u1800\u65cange\xbb\u2758ar\u0100;l\u2764\u2765\u4028t;\u6993\u0280achmt\u2773\u2776\u277c\u2785\u2787r\xf2\u08a8orne\xf2\u1d8car\u0100;d\u0f98\u2783;\u696d;\u600eri;\u62bf\u0300achiqt\u2798\u279d\u0a40\u27a2\u27ae\u27bbquo;\u6039r;\uc000\ud835\udcc1m\u0180;eg\u09b2\u27aa\u27ac;\u6a8d;\u6a8f\u0100bu\u252a\u27b3o\u0100;r\u0e1f\u27b9;\u601arok;\u4142\u8400<;cdhilqr\u082b\u27d2\u2639\u27dc\u27e0\u27e5\u27ea\u27f0\u0100ci\u27d7\u27d9;\u6aa6r;\u6a79re\xe5\u25f2mes;\u62c9arr;\u6976uest;\u6a7b\u0100Pi\u27f5\u27f9ar;\u6996\u0180;ef\u2800\u092d\u181b\u65c3r\u0100du\u2807\u280dshar;\u694ahar;\u6966\u0100en\u2817\u2821rtneqq;\uc000\u2268\ufe00\xc5\u281e\u0700Dacdefhilnopsu\u2840\u2845\u2882\u288e\u2893\u28a0\u28a5\u28a8\u28da\u28e2\u28e4\u0a83\u28f3\u2902Dot;\u623a\u0200clpr\u284e\u2852\u2863\u287dr\u803b\xaf\u40af\u0100et\u2857\u2859;\u6642\u0100;e\u285e\u285f\u6720se\xbb\u285f\u0100;s\u103b\u2868to\u0200;dlu\u103b\u2873\u2877\u287bow\xee\u048cef\xf4\u090f\xf0\u13d1ker;\u65ae\u0100oy\u2887\u288cmma;\u6a29;\u443cash;\u6014asuredangle\xbb\u1626r;\uc000\ud835\udd2ao;\u6127\u0180cdn\u28af\u28b4\u28c9ro\u803b\xb5\u40b5\u0200;acd\u1464\u28bd\u28c0\u28c4s\xf4\u16a7ir;\u6af0ot\u80bb\xb7\u01b5us\u0180;bd\u28d2\u1903\u28d3\u6212\u0100;u\u1d3c\u28d8;\u6a2a\u0163\u28de\u28e1p;\u6adb\xf2\u2212\xf0\u0a81\u0100dp\u28e9\u28eeels;\u62a7f;\uc000\ud835\udd5e\u0100ct\u28f8\u28fdr;\uc000\ud835\udcc2pos\xbb\u159d\u0180;lm\u2909\u290a\u290d\u43bctimap;\u62b8\u0c00GLRVabcdefghijlmoprstuvw\u2942\u2953\u297e\u2989\u2998\u29da\u29e9\u2a15\u2a1a\u2a58\u2a5d\u2a83\u2a95\u2aa4\u2aa8\u2b04\u2b07\u2b44\u2b7f\u2bae\u2c34\u2c67\u2c7c\u2ce9\u0100gt\u2947\u294b;\uc000\u22d9\u0338\u0100;v\u2950\u0bcf\uc000\u226b\u20d2\u0180elt\u295a\u2972\u2976ft\u0100ar\u2961\u2967rrow;\u61cdightarrow;\u61ce;\uc000\u22d8\u0338\u0100;v\u297b\u0c47\uc000\u226a\u20d2ightarrow;\u61cf\u0100Dd\u298e\u2993ash;\u62afash;\u62ae\u0280bcnpt\u29a3\u29a7\u29ac\u29b1\u29ccla\xbb\u02deute;\u4144g;\uc000\u2220\u20d2\u0280;Eiop\u0d84\u29bc\u29c0\u29c5\u29c8;\uc000\u2a70\u0338d;\uc000\u224b\u0338s;\u4149ro\xf8\u0d84ur\u0100;a\u29d3\u29d4\u666el\u0100;s\u29d3\u0b38\u01f3\u29df\0\u29e3p\u80bb\xa0\u0b37mp\u0100;e\u0bf9\u0c00\u0280aeouy\u29f4\u29fe\u2a03\u2a10\u2a13\u01f0\u29f9\0\u29fb;\u6a43on;\u4148dil;\u4146ng\u0100;d\u0d7e\u2a0aot;\uc000\u2a6d\u0338p;\u6a42;\u443dash;\u6013\u0380;Aadqsx\u0b92\u2a29\u2a2d\u2a3b\u2a41\u2a45\u2a50rr;\u61d7r\u0100hr\u2a33\u2a36k;\u6924\u0100;o\u13f2\u13f0ot;\uc000\u2250\u0338ui\xf6\u0b63\u0100ei\u2a4a\u2a4ear;\u6928\xed\u0b98ist\u0100;s\u0ba0\u0b9fr;\uc000\ud835\udd2b\u0200Eest\u0bc5\u2a66\u2a79\u2a7c\u0180;qs\u0bbc\u2a6d\u0be1\u0180;qs\u0bbc\u0bc5\u2a74lan\xf4\u0be2i\xed\u0bea\u0100;r\u0bb6\u2a81\xbb\u0bb7\u0180Aap\u2a8a\u2a8d\u2a91r\xf2\u2971rr;\u61aear;\u6af2\u0180;sv\u0f8d\u2a9c\u0f8c\u0100;d\u2aa1\u2aa2\u62fc;\u62facy;\u445a\u0380AEadest\u2ab7\u2aba\u2abe\u2ac2\u2ac5\u2af6\u2af9r\xf2\u2966;\uc000\u2266\u0338rr;\u619ar;\u6025\u0200;fqs\u0c3b\u2ace\u2ae3\u2aeft\u0100ar\u2ad4\u2ad9rro\xf7\u2ac1ightarro\xf7\u2a90\u0180;qs\u0c3b\u2aba\u2aealan\xf4\u0c55\u0100;s\u0c55\u2af4\xbb\u0c36i\xed\u0c5d\u0100;r\u0c35\u2afei\u0100;e\u0c1a\u0c25i\xe4\u0d90\u0100pt\u2b0c\u2b11f;\uc000\ud835\udd5f\u8180\xac;in\u2b19\u2b1a\u2b36\u40acn\u0200;Edv\u0b89\u2b24\u2b28\u2b2e;\uc000\u22f9\u0338ot;\uc000\u22f5\u0338\u01e1\u0b89\u2b33\u2b35;\u62f7;\u62f6i\u0100;v\u0cb8\u2b3c\u01e1\u0cb8\u2b41\u2b43;\u62fe;\u62fd\u0180aor\u2b4b\u2b63\u2b69r\u0200;ast\u0b7b\u2b55\u2b5a\u2b5flle\xec\u0b7bl;\uc000\u2afd\u20e5;\uc000\u2202\u0338lint;\u6a14\u0180;ce\u0c92\u2b70\u2b73u\xe5\u0ca5\u0100;c\u0c98\u2b78\u0100;e\u0c92\u2b7d\xf1\u0c98\u0200Aait\u2b88\u2b8b\u2b9d\u2ba7r\xf2\u2988rr\u0180;cw\u2b94\u2b95\u2b99\u619b;\uc000\u2933\u0338;\uc000\u219d\u0338ghtarrow\xbb\u2b95ri\u0100;e\u0ccb\u0cd6\u0380chimpqu\u2bbd\u2bcd\u2bd9\u2b04\u0b78\u2be4\u2bef\u0200;cer\u0d32\u2bc6\u0d37\u2bc9u\xe5\u0d45;\uc000\ud835\udcc3ort\u026d\u2b05\0\0\u2bd6ar\xe1\u2b56m\u0100;e\u0d6e\u2bdf\u0100;q\u0d74\u0d73su\u0100bp\u2beb\u2bed\xe5\u0cf8\xe5\u0d0b\u0180bcp\u2bf6\u2c11\u2c19\u0200;Ees\u2bff\u2c00\u0d22\u2c04\u6284;\uc000\u2ac5\u0338et\u0100;e\u0d1b\u2c0bq\u0100;q\u0d23\u2c00c\u0100;e\u0d32\u2c17\xf1\u0d38\u0200;Ees\u2c22\u2c23\u0d5f\u2c27\u6285;\uc000\u2ac6\u0338et\u0100;e\u0d58\u2c2eq\u0100;q\u0d60\u2c23\u0200gilr\u2c3d\u2c3f\u2c45\u2c47\xec\u0bd7lde\u803b\xf1\u40f1\xe7\u0c43iangle\u0100lr\u2c52\u2c5ceft\u0100;e\u0c1a\u2c5a\xf1\u0c26ight\u0100;e\u0ccb\u2c65\xf1\u0cd7\u0100;m\u2c6c\u2c6d\u43bd\u0180;es\u2c74\u2c75\u2c79\u4023ro;\u6116p;\u6007\u0480DHadgilrs\u2c8f\u2c94\u2c99\u2c9e\u2ca3\u2cb0\u2cb6\u2cd3\u2ce3ash;\u62adarr;\u6904p;\uc000\u224d\u20d2ash;\u62ac\u0100et\u2ca8\u2cac;\uc000\u2265\u20d2;\uc000>\u20d2nfin;\u69de\u0180Aet\u2cbd\u2cc1\u2cc5rr;\u6902;\uc000\u2264\u20d2\u0100;r\u2cca\u2ccd\uc000<\u20d2ie;\uc000\u22b4\u20d2\u0100At\u2cd8\u2cdcrr;\u6903rie;\uc000\u22b5\u20d2im;\uc000\u223c\u20d2\u0180Aan\u2cf0\u2cf4\u2d02rr;\u61d6r\u0100hr\u2cfa\u2cfdk;\u6923\u0100;o\u13e7\u13e5ear;\u6927\u1253\u1a95\0\0\0\0\0\0\0\0\0\0\0\0\0\u2d2d\0\u2d38\u2d48\u2d60\u2d65\u2d72\u2d84\u1b07\0\0\u2d8d\u2dab\0\u2dc8\u2dce\0\u2ddc\u2e19\u2e2b\u2e3e\u2e43\u0100cs\u2d31\u1a97ute\u803b\xf3\u40f3\u0100iy\u2d3c\u2d45r\u0100;c\u1a9e\u2d42\u803b\xf4\u40f4;\u443e\u0280abios\u1aa0\u2d52\u2d57\u01c8\u2d5alac;\u4151v;\u6a38old;\u69bclig;\u4153\u0100cr\u2d69\u2d6dir;\u69bf;\uc000\ud835\udd2c\u036f\u2d79\0\0\u2d7c\0\u2d82n;\u42dbave\u803b\xf2\u40f2;\u69c1\u0100bm\u2d88\u0df4ar;\u69b5\u0200acit\u2d95\u2d98\u2da5\u2da8r\xf2\u1a80\u0100ir\u2d9d\u2da0r;\u69beoss;\u69bbn\xe5\u0e52;\u69c0\u0180aei\u2db1\u2db5\u2db9cr;\u414dga;\u43c9\u0180cdn\u2dc0\u2dc5\u01cdron;\u43bf;\u69b6pf;\uc000\ud835\udd60\u0180ael\u2dd4\u2dd7\u01d2r;\u69b7rp;\u69b9\u0380;adiosv\u2dea\u2deb\u2dee\u2e08\u2e0d\u2e10\u2e16\u6228r\xf2\u1a86\u0200;efm\u2df7\u2df8\u2e02\u2e05\u6a5dr\u0100;o\u2dfe\u2dff\u6134f\xbb\u2dff\u803b\xaa\u40aa\u803b\xba\u40bagof;\u62b6r;\u6a56lope;\u6a57;\u6a5b\u0180clo\u2e1f\u2e21\u2e27\xf2\u2e01ash\u803b\xf8\u40f8l;\u6298i\u016c\u2e2f\u2e34de\u803b\xf5\u40f5es\u0100;a\u01db\u2e3as;\u6a36ml\u803b\xf6\u40f6bar;\u633d\u0ae1\u2e5e\0\u2e7d\0\u2e80\u2e9d\0\u2ea2\u2eb9\0\0\u2ecb\u0e9c\0\u2f13\0\0\u2f2b\u2fbc\0\u2fc8r\u0200;ast\u0403\u2e67\u2e72\u0e85\u8100\xb6;l\u2e6d\u2e6e\u40b6le\xec\u0403\u0269\u2e78\0\0\u2e7bm;\u6af3;\u6afdy;\u443fr\u0280cimpt\u2e8b\u2e8f\u2e93\u1865\u2e97nt;\u4025od;\u402eil;\u6030enk;\u6031r;\uc000\ud835\udd2d\u0180imo\u2ea8\u2eb0\u2eb4\u0100;v\u2ead\u2eae\u43c6;\u43d5ma\xf4\u0a76ne;\u660e\u0180;tv\u2ebf\u2ec0\u2ec8\u43c0chfork\xbb\u1ffd;\u43d6\u0100au\u2ecf\u2edfn\u0100ck\u2ed5\u2eddk\u0100;h\u21f4\u2edb;\u610e\xf6\u21f4s\u0480;abcdemst\u2ef3\u2ef4\u1908\u2ef9\u2efd\u2f04\u2f06\u2f0a\u2f0e\u402bcir;\u6a23ir;\u6a22\u0100ou\u1d40\u2f02;\u6a25;\u6a72n\u80bb\xb1\u0e9dim;\u6a26wo;\u6a27\u0180ipu\u2f19\u2f20\u2f25ntint;\u6a15f;\uc000\ud835\udd61nd\u803b\xa3\u40a3\u0500;Eaceinosu\u0ec8\u2f3f\u2f41\u2f44\u2f47\u2f81\u2f89\u2f92\u2f7e\u2fb6;\u6ab3p;\u6ab7u\xe5\u0ed9\u0100;c\u0ece\u2f4c\u0300;acens\u0ec8\u2f59\u2f5f\u2f66\u2f68\u2f7eppro\xf8\u2f43urlye\xf1\u0ed9\xf1\u0ece\u0180aes\u2f6f\u2f76\u2f7approx;\u6ab9qq;\u6ab5im;\u62e8i\xed\u0edfme\u0100;s\u2f88\u0eae\u6032\u0180Eas\u2f78\u2f90\u2f7a\xf0\u2f75\u0180dfp\u0eec\u2f99\u2faf\u0180als\u2fa0\u2fa5\u2faalar;\u632eine;\u6312urf;\u6313\u0100;t\u0efb\u2fb4\xef\u0efbrel;\u62b0\u0100ci\u2fc0\u2fc5r;\uc000\ud835\udcc5;\u43c8ncsp;\u6008\u0300fiopsu\u2fda\u22e2\u2fdf\u2fe5\u2feb\u2ff1r;\uc000\ud835\udd2epf;\uc000\ud835\udd62rime;\u6057cr;\uc000\ud835\udcc6\u0180aeo\u2ff8\u3009\u3013t\u0100ei\u2ffe\u3005rnion\xf3\u06b0nt;\u6a16st\u0100;e\u3010\u3011\u403f\xf1\u1f19\xf4\u0f14\u0a80ABHabcdefhilmnoprstux\u3040\u3051\u3055\u3059\u30e0\u310e\u312b\u3147\u3162\u3172\u318e\u3206\u3215\u3224\u3229\u3258\u326e\u3272\u3290\u32b0\u32b7\u0180art\u3047\u304a\u304cr\xf2\u10b3\xf2\u03ddail;\u691car\xf2\u1c65ar;\u6964\u0380cdenqrt\u3068\u3075\u3078\u307f\u308f\u3094\u30cc\u0100eu\u306d\u3071;\uc000\u223d\u0331te;\u4155i\xe3\u116emptyv;\u69b3g\u0200;del\u0fd1\u3089\u308b\u308d;\u6992;\u69a5\xe5\u0fd1uo\u803b\xbb\u40bbr\u0580;abcfhlpstw\u0fdc\u30ac\u30af\u30b7\u30b9\u30bc\u30be\u30c0\u30c3\u30c7\u30cap;\u6975\u0100;f\u0fe0\u30b4s;\u6920;\u6933s;\u691e\xeb\u225d\xf0\u272el;\u6945im;\u6974l;\u61a3;\u619d\u0100ai\u30d1\u30d5il;\u691ao\u0100;n\u30db\u30dc\u6236al\xf3\u0f1e\u0180abr\u30e7\u30ea\u30eer\xf2\u17e5rk;\u6773\u0100ak\u30f3\u30fdc\u0100ek\u30f9\u30fb;\u407d;\u405d\u0100es\u3102\u3104;\u698cl\u0100du\u310a\u310c;\u698e;\u6990\u0200aeuy\u3117\u311c\u3127\u3129ron;\u4159\u0100di\u3121\u3125il;\u4157\xec\u0ff2\xe2\u30fa;\u4440\u0200clqs\u3134\u3137\u313d\u3144a;\u6937dhar;\u6969uo\u0100;r\u020e\u020dh;\u61b3\u0180acg\u314e\u315f\u0f44l\u0200;ips\u0f78\u3158\u315b\u109cn\xe5\u10bbar\xf4\u0fa9t;\u65ad\u0180ilr\u3169\u1023\u316esht;\u697d;\uc000\ud835\udd2f\u0100ao\u3177\u3186r\u0100du\u317d\u317f\xbb\u047b\u0100;l\u1091\u3184;\u696c\u0100;v\u318b\u318c\u43c1;\u43f1\u0180gns\u3195\u31f9\u31fcht\u0300ahlrst\u31a4\u31b0\u31c2\u31d8\u31e4\u31eerrow\u0100;t\u0fdc\u31ada\xe9\u30c8arpoon\u0100du\u31bb\u31bfow\xee\u317ep\xbb\u1092eft\u0100ah\u31ca\u31d0rrow\xf3\u0feaarpoon\xf3\u0551ightarrows;\u61c9quigarro\xf7\u30cbhreetimes;\u62ccg;\u42daingdotse\xf1\u1f32\u0180ahm\u320d\u3210\u3213r\xf2\u0feaa\xf2\u0551;\u600foust\u0100;a\u321e\u321f\u63b1che\xbb\u321fmid;\u6aee\u0200abpt\u3232\u323d\u3240\u3252\u0100nr\u3237\u323ag;\u67edr;\u61fer\xeb\u1003\u0180afl\u3247\u324a\u324er;\u6986;\uc000\ud835\udd63us;\u6a2eimes;\u6a35\u0100ap\u325d\u3267r\u0100;g\u3263\u3264\u4029t;\u6994olint;\u6a12ar\xf2\u31e3\u0200achq\u327b\u3280\u10bc\u3285quo;\u603ar;\uc000\ud835\udcc7\u0100bu\u30fb\u328ao\u0100;r\u0214\u0213\u0180hir\u3297\u329b\u32a0re\xe5\u31f8mes;\u62cai\u0200;efl\u32aa\u1059\u1821\u32ab\u65b9tri;\u69celuhar;\u6968;\u611e\u0d61\u32d5\u32db\u32df\u332c\u3338\u3371\0\u337a\u33a4\0\0\u33ec\u33f0\0\u3428\u3448\u345a\u34ad\u34b1\u34ca\u34f1\0\u3616\0\0\u3633cute;\u415bqu\xef\u27ba\u0500;Eaceinpsy\u11ed\u32f3\u32f5\u32ff\u3302\u330b\u330f\u331f\u3326\u3329;\u6ab4\u01f0\u32fa\0\u32fc;\u6ab8on;\u4161u\xe5\u11fe\u0100;d\u11f3\u3307il;\u415frc;\u415d\u0180Eas\u3316\u3318\u331b;\u6ab6p;\u6abaim;\u62e9olint;\u6a13i\xed\u1204;\u4441ot\u0180;be\u3334\u1d47\u3335\u62c5;\u6a66\u0380Aacmstx\u3346\u334a\u3357\u335b\u335e\u3363\u336drr;\u61d8r\u0100hr\u3350\u3352\xeb\u2228\u0100;o\u0a36\u0a34t\u803b\xa7\u40a7i;\u403bwar;\u6929m\u0100in\u3369\xf0nu\xf3\xf1t;\u6736r\u0100;o\u3376\u2055\uc000\ud835\udd30\u0200acoy\u3382\u3386\u3391\u33a0rp;\u666f\u0100hy\u338b\u338fcy;\u4449;\u4448rt\u026d\u3399\0\0\u339ci\xe4\u1464ara\xec\u2e6f\u803b\xad\u40ad\u0100gm\u33a8\u33b4ma\u0180;fv\u33b1\u33b2\u33b2\u43c3;\u43c2\u0400;deglnpr\u12ab\u33c5\u33c9\u33ce\u33d6\u33de\u33e1\u33e6ot;\u6a6a\u0100;q\u12b1\u12b0\u0100;E\u33d3\u33d4\u6a9e;\u6aa0\u0100;E\u33db\u33dc\u6a9d;\u6a9fe;\u6246lus;\u6a24arr;\u6972ar\xf2\u113d\u0200aeit\u33f8\u3408\u340f\u3417\u0100ls\u33fd\u3404lsetm\xe9\u336ahp;\u6a33parsl;\u69e4\u0100dl\u1463\u3414e;\u6323\u0100;e\u341c\u341d\u6aaa\u0100;s\u3422\u3423\u6aac;\uc000\u2aac\ufe00\u0180flp\u342e\u3433\u3442tcy;\u444c\u0100;b\u3438\u3439\u402f\u0100;a\u343e\u343f\u69c4r;\u633ff;\uc000\ud835\udd64a\u0100dr\u344d\u0402es\u0100;u\u3454\u3455\u6660it\xbb\u3455\u0180csu\u3460\u3479\u349f\u0100au\u3465\u346fp\u0100;s\u1188\u346b;\uc000\u2293\ufe00p\u0100;s\u11b4\u3475;\uc000\u2294\ufe00u\u0100bp\u347f\u348f\u0180;es\u1197\u119c\u3486et\u0100;e\u1197\u348d\xf1\u119d\u0180;es\u11a8\u11ad\u3496et\u0100;e\u11a8\u349d\xf1\u11ae\u0180;af\u117b\u34a6\u05b0r\u0165\u34ab\u05b1\xbb\u117car\xf2\u1148\u0200cemt\u34b9\u34be\u34c2\u34c5r;\uc000\ud835\udcc8tm\xee\xf1i\xec\u3415ar\xe6\u11be\u0100ar\u34ce\u34d5r\u0100;f\u34d4\u17bf\u6606\u0100an\u34da\u34edight\u0100ep\u34e3\u34eapsilo\xee\u1ee0h\xe9\u2eafs\xbb\u2852\u0280bcmnp\u34fb\u355e\u1209\u358b\u358e\u0480;Edemnprs\u350e\u350f\u3511\u3515\u351e\u3523\u352c\u3531\u3536\u6282;\u6ac5ot;\u6abd\u0100;d\u11da\u351aot;\u6ac3ult;\u6ac1\u0100Ee\u3528\u352a;\u6acb;\u628alus;\u6abfarr;\u6979\u0180eiu\u353d\u3552\u3555t\u0180;en\u350e\u3545\u354bq\u0100;q\u11da\u350feq\u0100;q\u352b\u3528m;\u6ac7\u0100bp\u355a\u355c;\u6ad5;\u6ad3c\u0300;acens\u11ed\u356c\u3572\u3579\u357b\u3326ppro\xf8\u32faurlye\xf1\u11fe\xf1\u11f3\u0180aes\u3582\u3588\u331bppro\xf8\u331aq\xf1\u3317g;\u666a\u0680123;Edehlmnps\u35a9\u35ac\u35af\u121c\u35b2\u35b4\u35c0\u35c9\u35d5\u35da\u35df\u35e8\u35ed\u803b\xb9\u40b9\u803b\xb2\u40b2\u803b\xb3\u40b3;\u6ac6\u0100os\u35b9\u35bct;\u6abeub;\u6ad8\u0100;d\u1222\u35c5ot;\u6ac4s\u0100ou\u35cf\u35d2l;\u67c9b;\u6ad7arr;\u697bult;\u6ac2\u0100Ee\u35e4\u35e6;\u6acc;\u628blus;\u6ac0\u0180eiu\u35f4\u3609\u360ct\u0180;en\u121c\u35fc\u3602q\u0100;q\u1222\u35b2eq\u0100;q\u35e7\u35e4m;\u6ac8\u0100bp\u3611\u3613;\u6ad4;\u6ad6\u0180Aan\u361c\u3620\u362drr;\u61d9r\u0100hr\u3626\u3628\xeb\u222e\u0100;o\u0a2b\u0a29war;\u692alig\u803b\xdf\u40df\u0be1\u3651\u365d\u3660\u12ce\u3673\u3679\0\u367e\u36c2\0\0\0\0\0\u36db\u3703\0\u3709\u376c\0\0\0\u3787\u0272\u3656\0\0\u365bget;\u6316;\u43c4r\xeb\u0e5f\u0180aey\u3666\u366b\u3670ron;\u4165dil;\u4163;\u4442lrec;\u6315r;\uc000\ud835\udd31\u0200eiko\u3686\u369d\u36b5\u36bc\u01f2\u368b\0\u3691e\u01004f\u1284\u1281a\u0180;sv\u3698\u3699\u369b\u43b8ym;\u43d1\u0100cn\u36a2\u36b2k\u0100as\u36a8\u36aeppro\xf8\u12c1im\xbb\u12acs\xf0\u129e\u0100as\u36ba\u36ae\xf0\u12c1rn\u803b\xfe\u40fe\u01ec\u031f\u36c6\u22e7es\u8180\xd7;bd\u36cf\u36d0\u36d8\u40d7\u0100;a\u190f\u36d5r;\u6a31;\u6a30\u0180eps\u36e1\u36e3\u3700\xe1\u2a4d\u0200;bcf\u0486\u36ec\u36f0\u36f4ot;\u6336ir;\u6af1\u0100;o\u36f9\u36fc\uc000\ud835\udd65rk;\u6ada\xe1\u3362rime;\u6034\u0180aip\u370f\u3712\u3764d\xe5\u1248\u0380adempst\u3721\u374d\u3740\u3751\u3757\u375c\u375fngle\u0280;dlqr\u3730\u3731\u3736\u3740\u3742\u65b5own\xbb\u1dbbeft\u0100;e\u2800\u373e\xf1\u092e;\u625cight\u0100;e\u32aa\u374b\xf1\u105aot;\u65ecinus;\u6a3alus;\u6a39b;\u69cdime;\u6a3bezium;\u63e2\u0180cht\u3772\u377d\u3781\u0100ry\u3777\u377b;\uc000\ud835\udcc9;\u4446cy;\u445brok;\u4167\u0100io\u378b\u378ex\xf4\u1777head\u0100lr\u3797\u37a0eftarro\xf7\u084fightarrow\xbb\u0f5d\u0900AHabcdfghlmoprstuw\u37d0\u37d3\u37d7\u37e4\u37f0\u37fc\u380e\u381c\u3823\u3834\u3851\u385d\u386b\u38a9\u38cc\u38d2\u38ea\u38f6r\xf2\u03edar;\u6963\u0100cr\u37dc\u37e2ute\u803b\xfa\u40fa\xf2\u1150r\u01e3\u37ea\0\u37edy;\u445eve;\u416d\u0100iy\u37f5\u37farc\u803b\xfb\u40fb;\u4443\u0180abh\u3803\u3806\u380br\xf2\u13adlac;\u4171a\xf2\u13c3\u0100ir\u3813\u3818sht;\u697e;\uc000\ud835\udd32rave\u803b\xf9\u40f9\u0161\u3827\u3831r\u0100lr\u382c\u382e\xbb\u0957\xbb\u1083lk;\u6580\u0100ct\u3839\u384d\u026f\u383f\0\0\u384arn\u0100;e\u3845\u3846\u631cr\xbb\u3846op;\u630fri;\u65f8\u0100al\u3856\u385acr;\u416b\u80bb\xa8\u0349\u0100gp\u3862\u3866on;\u4173f;\uc000\ud835\udd66\u0300adhlsu\u114b\u3878\u387d\u1372\u3891\u38a0own\xe1\u13b3arpoon\u0100lr\u3888\u388cef\xf4\u382digh\xf4\u382fi\u0180;hl\u3899\u389a\u389c\u43c5\xbb\u13faon\xbb\u389aparrows;\u61c8\u0180cit\u38b0\u38c4\u38c8\u026f\u38b6\0\0\u38c1rn\u0100;e\u38bc\u38bd\u631dr\xbb\u38bdop;\u630eng;\u416fri;\u65f9cr;\uc000\ud835\udcca\u0180dir\u38d9\u38dd\u38e2ot;\u62f0lde;\u4169i\u0100;f\u3730\u38e8\xbb\u1813\u0100am\u38ef\u38f2r\xf2\u38a8l\u803b\xfc\u40fcangle;\u69a7\u0780ABDacdeflnoprsz\u391c\u391f\u3929\u392d\u39b5\u39b8\u39bd\u39df\u39e4\u39e8\u39f3\u39f9\u39fd\u3a01\u3a20r\xf2\u03f7ar\u0100;v\u3926\u3927\u6ae8;\u6ae9as\xe8\u03e1\u0100nr\u3932\u3937grt;\u699c\u0380eknprst\u34e3\u3946\u394b\u3952\u395d\u3964\u3996app\xe1\u2415othin\xe7\u1e96\u0180hir\u34eb\u2ec8\u3959op\xf4\u2fb5\u0100;h\u13b7\u3962\xef\u318d\u0100iu\u3969\u396dgm\xe1\u33b3\u0100bp\u3972\u3984setneq\u0100;q\u397d\u3980\uc000\u228a\ufe00;\uc000\u2acb\ufe00setneq\u0100;q\u398f\u3992\uc000\u228b\ufe00;\uc000\u2acc\ufe00\u0100hr\u399b\u399fet\xe1\u369ciangle\u0100lr\u39aa\u39afeft\xbb\u0925ight\xbb\u1051y;\u4432ash\xbb\u1036\u0180elr\u39c4\u39d2\u39d7\u0180;be\u2dea\u39cb\u39cfar;\u62bbq;\u625alip;\u62ee\u0100bt\u39dc\u1468a\xf2\u1469r;\uc000\ud835\udd33tr\xe9\u39aesu\u0100bp\u39ef\u39f1\xbb\u0d1c\xbb\u0d59pf;\uc000\ud835\udd67ro\xf0\u0efbtr\xe9\u39b4\u0100cu\u3a06\u3a0br;\uc000\ud835\udccb\u0100bp\u3a10\u3a18n\u0100Ee\u3980\u3a16\xbb\u397en\u0100Ee\u3992\u3a1e\xbb\u3990igzag;\u699a\u0380cefoprs\u3a36\u3a3b\u3a56\u3a5b\u3a54\u3a61\u3a6airc;\u4175\u0100di\u3a40\u3a51\u0100bg\u3a45\u3a49ar;\u6a5fe\u0100;q\u15fa\u3a4f;\u6259erp;\u6118r;\uc000\ud835\udd34pf;\uc000\ud835\udd68\u0100;e\u1479\u3a66at\xe8\u1479cr;\uc000\ud835\udccc\u0ae3\u178e\u3a87\0\u3a8b\0\u3a90\u3a9b\0\0\u3a9d\u3aa8\u3aab\u3aaf\0\0\u3ac3\u3ace\0\u3ad8\u17dc\u17dftr\xe9\u17d1r;\uc000\ud835\udd35\u0100Aa\u3a94\u3a97r\xf2\u03c3r\xf2\u09f6;\u43be\u0100Aa\u3aa1\u3aa4r\xf2\u03b8r\xf2\u09eba\xf0\u2713is;\u62fb\u0180dpt\u17a4\u3ab5\u3abe\u0100fl\u3aba\u17a9;\uc000\ud835\udd69im\xe5\u17b2\u0100Aa\u3ac7\u3acar\xf2\u03cer\xf2\u0a01\u0100cq\u3ad2\u17b8r;\uc000\ud835\udccd\u0100pt\u17d6\u3adcr\xe9\u17d4\u0400acefiosu\u3af0\u3afd\u3b08\u3b0c\u3b11\u3b15\u3b1b\u3b21c\u0100uy\u3af6\u3afbte\u803b\xfd\u40fd;\u444f\u0100iy\u3b02\u3b06rc;\u4177;\u444bn\u803b\xa5\u40a5r;\uc000\ud835\udd36cy;\u4457pf;\uc000\ud835\udd6acr;\uc000\ud835\udcce\u0100cm\u3b26\u3b29y;\u444el\u803b\xff\u40ff\u0500acdefhiosw\u3b42\u3b48\u3b54\u3b58\u3b64\u3b69\u3b6d\u3b74\u3b7a\u3b80cute;\u417a\u0100ay\u3b4d\u3b52ron;\u417e;\u4437ot;\u417c\u0100et\u3b5d\u3b61tr\xe6\u155fa;\u43b6r;\uc000\ud835\udd37cy;\u4436grarr;\u61ddpf;\uc000\ud835\udd6bcr;\uc000\ud835\udccf\u0100jn\u3b85\u3b87;\u600dj;\u600c"
        .split("")
        .map((c) => c.charCodeAt(0)));

    // Adapted from https://github.com/mathiasbynens/he/blob/36afe179392226cf1b6ccdb16ebbb7a5a844d93a/src/he.js#L106-L134
    const decodeMap = new Map([
        [0, 65533],
        // C1 Unicode control character reference replacements
        [128, 8364],
        [130, 8218],
        [131, 402],
        [132, 8222],
        [133, 8230],
        [134, 8224],
        [135, 8225],
        [136, 710],
        [137, 8240],
        [138, 352],
        [139, 8249],
        [140, 338],
        [142, 381],
        [145, 8216],
        [146, 8217],
        [147, 8220],
        [148, 8221],
        [149, 8226],
        [150, 8211],
        [151, 8212],
        [152, 732],
        [153, 8482],
        [154, 353],
        [155, 8250],
        [156, 339],
        [158, 382],
        [159, 376],
    ]);
    /**
     * Replace the given code point with a replacement character if it is a
     * surrogate or is outside the valid range. Otherwise return the code
     * point unchanged.
     */
    function replaceCodePoint(codePoint) {
        var _a;
        if ((codePoint >= 55296 && codePoint <= 57343) ||
            codePoint > 1114111) {
            return 65533;
        }
        return (_a = decodeMap.get(codePoint)) !== null && _a !== void 0 ? _a : codePoint;
    }

    var CharCodes;
    (function (CharCodes) {
        CharCodes[CharCodes["NUM"] = 35] = "NUM";
        CharCodes[CharCodes["SEMI"] = 59] = "SEMI";
        CharCodes[CharCodes["EQUALS"] = 61] = "EQUALS";
        CharCodes[CharCodes["ZERO"] = 48] = "ZERO";
        CharCodes[CharCodes["NINE"] = 57] = "NINE";
        CharCodes[CharCodes["LOWER_A"] = 97] = "LOWER_A";
        CharCodes[CharCodes["LOWER_F"] = 102] = "LOWER_F";
        CharCodes[CharCodes["LOWER_X"] = 120] = "LOWER_X";
        CharCodes[CharCodes["LOWER_Z"] = 122] = "LOWER_Z";
        CharCodes[CharCodes["UPPER_A"] = 65] = "UPPER_A";
        CharCodes[CharCodes["UPPER_F"] = 70] = "UPPER_F";
        CharCodes[CharCodes["UPPER_Z"] = 90] = "UPPER_Z";
    })(CharCodes || (CharCodes = {}));
    /** Bit that needs to be set to convert an upper case ASCII character to lower case */
    const TO_LOWER_BIT = 32;
    var BinTrieFlags;
    (function (BinTrieFlags) {
        BinTrieFlags[BinTrieFlags["VALUE_LENGTH"] = 49152] = "VALUE_LENGTH";
        BinTrieFlags[BinTrieFlags["BRANCH_LENGTH"] = 16256] = "BRANCH_LENGTH";
        BinTrieFlags[BinTrieFlags["JUMP_TABLE"] = 127] = "JUMP_TABLE";
    })(BinTrieFlags || (BinTrieFlags = {}));
    function isNumber(code) {
        return code >= CharCodes.ZERO && code <= CharCodes.NINE;
    }
    function isHexadecimalCharacter(code) {
        return ((code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_F) ||
            (code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_F));
    }
    function isAsciiAlphaNumeric$1(code) {
        return ((code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_Z) ||
            (code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_Z) ||
            isNumber(code));
    }
    /**
     * Checks if the given character is a valid end character for an entity in an attribute.
     *
     * Attribute values that aren't terminated properly aren't parsed, and shouldn't lead to a parser error.
     * See the example in https://html.spec.whatwg.org/multipage/parsing.html#named-character-reference-state
     */
    function isEntityInAttributeInvalidEnd(code) {
        return code === CharCodes.EQUALS || isAsciiAlphaNumeric$1(code);
    }
    var EntityDecoderState;
    (function (EntityDecoderState) {
        EntityDecoderState[EntityDecoderState["EntityStart"] = 0] = "EntityStart";
        EntityDecoderState[EntityDecoderState["NumericStart"] = 1] = "NumericStart";
        EntityDecoderState[EntityDecoderState["NumericDecimal"] = 2] = "NumericDecimal";
        EntityDecoderState[EntityDecoderState["NumericHex"] = 3] = "NumericHex";
        EntityDecoderState[EntityDecoderState["NamedEntity"] = 4] = "NamedEntity";
    })(EntityDecoderState || (EntityDecoderState = {}));
    var DecodingMode;
    (function (DecodingMode) {
        /** Entities in text nodes that can end with any character. */
        DecodingMode[DecodingMode["Legacy"] = 0] = "Legacy";
        /** Only allow entities terminated with a semicolon. */
        DecodingMode[DecodingMode["Strict"] = 1] = "Strict";
        /** Entities in attributes have limitations on ending characters. */
        DecodingMode[DecodingMode["Attribute"] = 2] = "Attribute";
    })(DecodingMode || (DecodingMode = {}));
    /**
     * Token decoder with support of writing partial entities.
     */
    class EntityDecoder {
        constructor(
        /** The tree used to decode entities. */
        decodeTree, 
        /**
         * The function that is called when a codepoint is decoded.
         *
         * For multi-byte named entities, this will be called multiple times,
         * with the second codepoint, and the same `consumed` value.
         *
         * @param codepoint The decoded codepoint.
         * @param consumed The number of bytes consumed by the decoder.
         */
        emitCodePoint, 
        /** An object that is used to produce errors. */
        errors) {
            this.decodeTree = decodeTree;
            this.emitCodePoint = emitCodePoint;
            this.errors = errors;
            /** The current state of the decoder. */
            this.state = EntityDecoderState.EntityStart;
            /** Characters that were consumed while parsing an entity. */
            this.consumed = 1;
            /**
             * The result of the entity.
             *
             * Either the result index of a numeric entity, or the codepoint of a
             * numeric entity.
             */
            this.result = 0;
            /** The current index in the decode tree. */
            this.treeIndex = 0;
            /** The number of characters that were consumed in excess. */
            this.excess = 1;
            /** The mode in which the decoder is operating. */
            this.decodeMode = DecodingMode.Strict;
        }
        /** Resets the instance to make it reusable. */
        startEntity(decodeMode) {
            this.decodeMode = decodeMode;
            this.state = EntityDecoderState.EntityStart;
            this.result = 0;
            this.treeIndex = 0;
            this.excess = 1;
            this.consumed = 1;
        }
        /**
         * Write an entity to the decoder. This can be called multiple times with partial entities.
         * If the entity is incomplete, the decoder will return -1.
         *
         * Mirrors the implementation of `getDecoder`, but with the ability to stop decoding if the
         * entity is incomplete, and resume when the next string is written.
         *
         * @param input The string containing the entity (or a continuation of the entity).
         * @param offset The offset at which the entity begins. Should be 0 if this is not the first call.
         * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
         */
        write(input, offset) {
            switch (this.state) {
                case EntityDecoderState.EntityStart: {
                    if (input.charCodeAt(offset) === CharCodes.NUM) {
                        this.state = EntityDecoderState.NumericStart;
                        this.consumed += 1;
                        return this.stateNumericStart(input, offset + 1);
                    }
                    this.state = EntityDecoderState.NamedEntity;
                    return this.stateNamedEntity(input, offset);
                }
                case EntityDecoderState.NumericStart: {
                    return this.stateNumericStart(input, offset);
                }
                case EntityDecoderState.NumericDecimal: {
                    return this.stateNumericDecimal(input, offset);
                }
                case EntityDecoderState.NumericHex: {
                    return this.stateNumericHex(input, offset);
                }
                case EntityDecoderState.NamedEntity: {
                    return this.stateNamedEntity(input, offset);
                }
            }
        }
        /**
         * Switches between the numeric decimal and hexadecimal states.
         *
         * Equivalent to the `Numeric character reference state` in the HTML spec.
         *
         * @param input The string containing the entity (or a continuation of the entity).
         * @param offset The current offset.
         * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
         */
        stateNumericStart(input, offset) {
            if (offset >= input.length) {
                return -1;
            }
            if ((input.charCodeAt(offset) | TO_LOWER_BIT) === CharCodes.LOWER_X) {
                this.state = EntityDecoderState.NumericHex;
                this.consumed += 1;
                return this.stateNumericHex(input, offset + 1);
            }
            this.state = EntityDecoderState.NumericDecimal;
            return this.stateNumericDecimal(input, offset);
        }
        addToNumericResult(input, start, end, base) {
            if (start !== end) {
                const digitCount = end - start;
                this.result =
                    this.result * Math.pow(base, digitCount) +
                        Number.parseInt(input.substr(start, digitCount), base);
                this.consumed += digitCount;
            }
        }
        /**
         * Parses a hexadecimal numeric entity.
         *
         * Equivalent to the `Hexademical character reference state` in the HTML spec.
         *
         * @param input The string containing the entity (or a continuation of the entity).
         * @param offset The current offset.
         * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
         */
        stateNumericHex(input, offset) {
            const startIndex = offset;
            while (offset < input.length) {
                const char = input.charCodeAt(offset);
                if (isNumber(char) || isHexadecimalCharacter(char)) {
                    offset += 1;
                }
                else {
                    this.addToNumericResult(input, startIndex, offset, 16);
                    return this.emitNumericEntity(char, 3);
                }
            }
            this.addToNumericResult(input, startIndex, offset, 16);
            return -1;
        }
        /**
         * Parses a decimal numeric entity.
         *
         * Equivalent to the `Decimal character reference state` in the HTML spec.
         *
         * @param input The string containing the entity (or a continuation of the entity).
         * @param offset The current offset.
         * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
         */
        stateNumericDecimal(input, offset) {
            const startIndex = offset;
            while (offset < input.length) {
                const char = input.charCodeAt(offset);
                if (isNumber(char)) {
                    offset += 1;
                }
                else {
                    this.addToNumericResult(input, startIndex, offset, 10);
                    return this.emitNumericEntity(char, 2);
                }
            }
            this.addToNumericResult(input, startIndex, offset, 10);
            return -1;
        }
        /**
         * Validate and emit a numeric entity.
         *
         * Implements the logic from the `Hexademical character reference start
         * state` and `Numeric character reference end state` in the HTML spec.
         *
         * @param lastCp The last code point of the entity. Used to see if the
         *               entity was terminated with a semicolon.
         * @param expectedLength The minimum number of characters that should be
         *                       consumed. Used to validate that at least one digit
         *                       was consumed.
         * @returns The number of characters that were consumed.
         */
        emitNumericEntity(lastCp, expectedLength) {
            var _a;
            // Ensure we consumed at least one digit.
            if (this.consumed <= expectedLength) {
                (_a = this.errors) === null || _a === void 0 ? void 0 : _a.absenceOfDigitsInNumericCharacterReference(this.consumed);
                return 0;
            }
            // Figure out if this is a legit end of the entity
            if (lastCp === CharCodes.SEMI) {
                this.consumed += 1;
            }
            else if (this.decodeMode === DecodingMode.Strict) {
                return 0;
            }
            this.emitCodePoint(replaceCodePoint(this.result), this.consumed);
            if (this.errors) {
                if (lastCp !== CharCodes.SEMI) {
                    this.errors.missingSemicolonAfterCharacterReference();
                }
                this.errors.validateNumericCharacterReference(this.result);
            }
            return this.consumed;
        }
        /**
         * Parses a named entity.
         *
         * Equivalent to the `Named character reference state` in the HTML spec.
         *
         * @param input The string containing the entity (or a continuation of the entity).
         * @param offset The current offset.
         * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
         */
        stateNamedEntity(input, offset) {
            const { decodeTree } = this;
            let current = decodeTree[this.treeIndex];
            // The mask is the number of bytes of the value, including the current byte.
            let valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
            for (; offset < input.length; offset++, this.excess++) {
                const char = input.charCodeAt(offset);
                this.treeIndex = determineBranch(decodeTree, current, this.treeIndex + Math.max(1, valueLength), char);
                if (this.treeIndex < 0) {
                    return this.result === 0 ||
                        // If we are parsing an attribute
                        (this.decodeMode === DecodingMode.Attribute &&
                            // We shouldn't have consumed any characters after the entity,
                            (valueLength === 0 ||
                                // And there should be no invalid characters.
                                isEntityInAttributeInvalidEnd(char)))
                        ? 0
                        : this.emitNotTerminatedNamedEntity();
                }
                current = decodeTree[this.treeIndex];
                valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
                // If the branch is a value, store it and continue
                if (valueLength !== 0) {
                    // If the entity is terminated by a semicolon, we are done.
                    if (char === CharCodes.SEMI) {
                        return this.emitNamedEntityData(this.treeIndex, valueLength, this.consumed + this.excess);
                    }
                    // If we encounter a non-terminated (legacy) entity while parsing strictly, then ignore it.
                    if (this.decodeMode !== DecodingMode.Strict) {
                        this.result = this.treeIndex;
                        this.consumed += this.excess;
                        this.excess = 0;
                    }
                }
            }
            return -1;
        }
        /**
         * Emit a named entity that was not terminated with a semicolon.
         *
         * @returns The number of characters consumed.
         */
        emitNotTerminatedNamedEntity() {
            var _a;
            const { result, decodeTree } = this;
            const valueLength = (decodeTree[result] & BinTrieFlags.VALUE_LENGTH) >> 14;
            this.emitNamedEntityData(result, valueLength, this.consumed);
            (_a = this.errors) === null || _a === void 0 ? void 0 : _a.missingSemicolonAfterCharacterReference();
            return this.consumed;
        }
        /**
         * Emit a named entity.
         *
         * @param result The index of the entity in the decode tree.
         * @param valueLength The number of bytes in the entity.
         * @param consumed The number of characters consumed.
         *
         * @returns The number of characters consumed.
         */
        emitNamedEntityData(result, valueLength, consumed) {
            const { decodeTree } = this;
            this.emitCodePoint(valueLength === 1
                ? decodeTree[result] & ~BinTrieFlags.VALUE_LENGTH
                : decodeTree[result + 1], consumed);
            if (valueLength === 3) {
                // For multi-byte values, we need to emit the second byte.
                this.emitCodePoint(decodeTree[result + 2], consumed);
            }
            return consumed;
        }
        /**
         * Signal to the parser that the end of the input was reached.
         *
         * Remaining data will be emitted and relevant errors will be produced.
         *
         * @returns The number of characters consumed.
         */
        end() {
            var _a;
            switch (this.state) {
                case EntityDecoderState.NamedEntity: {
                    // Emit a named entity if we have one.
                    return this.result !== 0 &&
                        (this.decodeMode !== DecodingMode.Attribute ||
                            this.result === this.treeIndex)
                        ? this.emitNotTerminatedNamedEntity()
                        : 0;
                }
                // Otherwise, emit a numeric entity if we have one.
                case EntityDecoderState.NumericDecimal: {
                    return this.emitNumericEntity(0, 2);
                }
                case EntityDecoderState.NumericHex: {
                    return this.emitNumericEntity(0, 3);
                }
                case EntityDecoderState.NumericStart: {
                    (_a = this.errors) === null || _a === void 0 ? void 0 : _a.absenceOfDigitsInNumericCharacterReference(this.consumed);
                    return 0;
                }
                case EntityDecoderState.EntityStart: {
                    // Return 0 if we have no entity.
                    return 0;
                }
            }
        }
    }
    /**
     * Determines the branch of the current node that is taken given the current
     * character. This function is used to traverse the trie.
     *
     * @param decodeTree The trie.
     * @param current The current node.
     * @param nodeIdx The index right after the current node and its value.
     * @param char The current character.
     * @returns The index of the next node, or -1 if no branch is taken.
     */
    function determineBranch(decodeTree, current, nodeIndex, char) {
        const branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
        const jumpOffset = current & BinTrieFlags.JUMP_TABLE;
        // Case 1: Single branch encoded in jump offset
        if (branchCount === 0) {
            return jumpOffset !== 0 && char === jumpOffset ? nodeIndex : -1;
        }
        // Case 2: Multiple branches encoded in jump table
        if (jumpOffset) {
            const value = char - jumpOffset;
            return value < 0 || value >= branchCount
                ? -1
                : decodeTree[nodeIndex + value] - 1;
        }
        // Case 3: Multiple branches encoded in dictionary
        // Binary search for the character.
        let lo = nodeIndex;
        let hi = lo + branchCount - 1;
        while (lo <= hi) {
            const mid = (lo + hi) >>> 1;
            const midValue = decodeTree[mid];
            if (midValue < char) {
                lo = mid + 1;
            }
            else if (midValue > char) {
                hi = mid - 1;
            }
            else {
                return decodeTree[mid + branchCount];
            }
        }
        return -1;
    }

    /** All valid namespaces in HTML. */
    var NS;
    (function (NS) {
        NS["HTML"] = "http://www.w3.org/1999/xhtml";
        NS["MATHML"] = "http://www.w3.org/1998/Math/MathML";
        NS["SVG"] = "http://www.w3.org/2000/svg";
        NS["XLINK"] = "http://www.w3.org/1999/xlink";
        NS["XML"] = "http://www.w3.org/XML/1998/namespace";
        NS["XMLNS"] = "http://www.w3.org/2000/xmlns/";
    })(NS || (NS = {}));
    var ATTRS;
    (function (ATTRS) {
        ATTRS["TYPE"] = "type";
        ATTRS["ACTION"] = "action";
        ATTRS["ENCODING"] = "encoding";
        ATTRS["PROMPT"] = "prompt";
        ATTRS["NAME"] = "name";
        ATTRS["COLOR"] = "color";
        ATTRS["FACE"] = "face";
        ATTRS["SIZE"] = "size";
    })(ATTRS || (ATTRS = {}));
    /**
     * The mode of the document.
     *
     * @see {@link https://dom.spec.whatwg.org/#concept-document-limited-quirks}
     */
    var DOCUMENT_MODE;
    (function (DOCUMENT_MODE) {
        DOCUMENT_MODE["NO_QUIRKS"] = "no-quirks";
        DOCUMENT_MODE["QUIRKS"] = "quirks";
        DOCUMENT_MODE["LIMITED_QUIRKS"] = "limited-quirks";
    })(DOCUMENT_MODE || (DOCUMENT_MODE = {}));
    var TAG_NAMES;
    (function (TAG_NAMES) {
        TAG_NAMES["A"] = "a";
        TAG_NAMES["ADDRESS"] = "address";
        TAG_NAMES["ANNOTATION_XML"] = "annotation-xml";
        TAG_NAMES["APPLET"] = "applet";
        TAG_NAMES["AREA"] = "area";
        TAG_NAMES["ARTICLE"] = "article";
        TAG_NAMES["ASIDE"] = "aside";
        TAG_NAMES["B"] = "b";
        TAG_NAMES["BASE"] = "base";
        TAG_NAMES["BASEFONT"] = "basefont";
        TAG_NAMES["BGSOUND"] = "bgsound";
        TAG_NAMES["BIG"] = "big";
        TAG_NAMES["BLOCKQUOTE"] = "blockquote";
        TAG_NAMES["BODY"] = "body";
        TAG_NAMES["BR"] = "br";
        TAG_NAMES["BUTTON"] = "button";
        TAG_NAMES["CAPTION"] = "caption";
        TAG_NAMES["CENTER"] = "center";
        TAG_NAMES["CODE"] = "code";
        TAG_NAMES["COL"] = "col";
        TAG_NAMES["COLGROUP"] = "colgroup";
        TAG_NAMES["DD"] = "dd";
        TAG_NAMES["DESC"] = "desc";
        TAG_NAMES["DETAILS"] = "details";
        TAG_NAMES["DIALOG"] = "dialog";
        TAG_NAMES["DIR"] = "dir";
        TAG_NAMES["DIV"] = "div";
        TAG_NAMES["DL"] = "dl";
        TAG_NAMES["DT"] = "dt";
        TAG_NAMES["EM"] = "em";
        TAG_NAMES["EMBED"] = "embed";
        TAG_NAMES["FIELDSET"] = "fieldset";
        TAG_NAMES["FIGCAPTION"] = "figcaption";
        TAG_NAMES["FIGURE"] = "figure";
        TAG_NAMES["FONT"] = "font";
        TAG_NAMES["FOOTER"] = "footer";
        TAG_NAMES["FOREIGN_OBJECT"] = "foreignObject";
        TAG_NAMES["FORM"] = "form";
        TAG_NAMES["FRAME"] = "frame";
        TAG_NAMES["FRAMESET"] = "frameset";
        TAG_NAMES["H1"] = "h1";
        TAG_NAMES["H2"] = "h2";
        TAG_NAMES["H3"] = "h3";
        TAG_NAMES["H4"] = "h4";
        TAG_NAMES["H5"] = "h5";
        TAG_NAMES["H6"] = "h6";
        TAG_NAMES["HEAD"] = "head";
        TAG_NAMES["HEADER"] = "header";
        TAG_NAMES["HGROUP"] = "hgroup";
        TAG_NAMES["HR"] = "hr";
        TAG_NAMES["HTML"] = "html";
        TAG_NAMES["I"] = "i";
        TAG_NAMES["IMG"] = "img";
        TAG_NAMES["IMAGE"] = "image";
        TAG_NAMES["INPUT"] = "input";
        TAG_NAMES["IFRAME"] = "iframe";
        TAG_NAMES["KEYGEN"] = "keygen";
        TAG_NAMES["LABEL"] = "label";
        TAG_NAMES["LI"] = "li";
        TAG_NAMES["LINK"] = "link";
        TAG_NAMES["LISTING"] = "listing";
        TAG_NAMES["MAIN"] = "main";
        TAG_NAMES["MALIGNMARK"] = "malignmark";
        TAG_NAMES["MARQUEE"] = "marquee";
        TAG_NAMES["MATH"] = "math";
        TAG_NAMES["MENU"] = "menu";
        TAG_NAMES["META"] = "meta";
        TAG_NAMES["MGLYPH"] = "mglyph";
        TAG_NAMES["MI"] = "mi";
        TAG_NAMES["MO"] = "mo";
        TAG_NAMES["MN"] = "mn";
        TAG_NAMES["MS"] = "ms";
        TAG_NAMES["MTEXT"] = "mtext";
        TAG_NAMES["NAV"] = "nav";
        TAG_NAMES["NOBR"] = "nobr";
        TAG_NAMES["NOFRAMES"] = "noframes";
        TAG_NAMES["NOEMBED"] = "noembed";
        TAG_NAMES["NOSCRIPT"] = "noscript";
        TAG_NAMES["OBJECT"] = "object";
        TAG_NAMES["OL"] = "ol";
        TAG_NAMES["OPTGROUP"] = "optgroup";
        TAG_NAMES["OPTION"] = "option";
        TAG_NAMES["P"] = "p";
        TAG_NAMES["PARAM"] = "param";
        TAG_NAMES["PLAINTEXT"] = "plaintext";
        TAG_NAMES["PRE"] = "pre";
        TAG_NAMES["RB"] = "rb";
        TAG_NAMES["RP"] = "rp";
        TAG_NAMES["RT"] = "rt";
        TAG_NAMES["RTC"] = "rtc";
        TAG_NAMES["RUBY"] = "ruby";
        TAG_NAMES["S"] = "s";
        TAG_NAMES["SCRIPT"] = "script";
        TAG_NAMES["SEARCH"] = "search";
        TAG_NAMES["SECTION"] = "section";
        TAG_NAMES["SELECT"] = "select";
        TAG_NAMES["SOURCE"] = "source";
        TAG_NAMES["SMALL"] = "small";
        TAG_NAMES["SPAN"] = "span";
        TAG_NAMES["STRIKE"] = "strike";
        TAG_NAMES["STRONG"] = "strong";
        TAG_NAMES["STYLE"] = "style";
        TAG_NAMES["SUB"] = "sub";
        TAG_NAMES["SUMMARY"] = "summary";
        TAG_NAMES["SUP"] = "sup";
        TAG_NAMES["TABLE"] = "table";
        TAG_NAMES["TBODY"] = "tbody";
        TAG_NAMES["TEMPLATE"] = "template";
        TAG_NAMES["TEXTAREA"] = "textarea";
        TAG_NAMES["TFOOT"] = "tfoot";
        TAG_NAMES["TD"] = "td";
        TAG_NAMES["TH"] = "th";
        TAG_NAMES["THEAD"] = "thead";
        TAG_NAMES["TITLE"] = "title";
        TAG_NAMES["TR"] = "tr";
        TAG_NAMES["TRACK"] = "track";
        TAG_NAMES["TT"] = "tt";
        TAG_NAMES["U"] = "u";
        TAG_NAMES["UL"] = "ul";
        TAG_NAMES["SVG"] = "svg";
        TAG_NAMES["VAR"] = "var";
        TAG_NAMES["WBR"] = "wbr";
        TAG_NAMES["XMP"] = "xmp";
    })(TAG_NAMES || (TAG_NAMES = {}));
    /**
     * Tag IDs are numeric IDs for known tag names.
     *
     * We use tag IDs to improve the performance of tag name comparisons.
     */
    var TAG_ID;
    (function (TAG_ID) {
        TAG_ID[TAG_ID["UNKNOWN"] = 0] = "UNKNOWN";
        TAG_ID[TAG_ID["A"] = 1] = "A";
        TAG_ID[TAG_ID["ADDRESS"] = 2] = "ADDRESS";
        TAG_ID[TAG_ID["ANNOTATION_XML"] = 3] = "ANNOTATION_XML";
        TAG_ID[TAG_ID["APPLET"] = 4] = "APPLET";
        TAG_ID[TAG_ID["AREA"] = 5] = "AREA";
        TAG_ID[TAG_ID["ARTICLE"] = 6] = "ARTICLE";
        TAG_ID[TAG_ID["ASIDE"] = 7] = "ASIDE";
        TAG_ID[TAG_ID["B"] = 8] = "B";
        TAG_ID[TAG_ID["BASE"] = 9] = "BASE";
        TAG_ID[TAG_ID["BASEFONT"] = 10] = "BASEFONT";
        TAG_ID[TAG_ID["BGSOUND"] = 11] = "BGSOUND";
        TAG_ID[TAG_ID["BIG"] = 12] = "BIG";
        TAG_ID[TAG_ID["BLOCKQUOTE"] = 13] = "BLOCKQUOTE";
        TAG_ID[TAG_ID["BODY"] = 14] = "BODY";
        TAG_ID[TAG_ID["BR"] = 15] = "BR";
        TAG_ID[TAG_ID["BUTTON"] = 16] = "BUTTON";
        TAG_ID[TAG_ID["CAPTION"] = 17] = "CAPTION";
        TAG_ID[TAG_ID["CENTER"] = 18] = "CENTER";
        TAG_ID[TAG_ID["CODE"] = 19] = "CODE";
        TAG_ID[TAG_ID["COL"] = 20] = "COL";
        TAG_ID[TAG_ID["COLGROUP"] = 21] = "COLGROUP";
        TAG_ID[TAG_ID["DD"] = 22] = "DD";
        TAG_ID[TAG_ID["DESC"] = 23] = "DESC";
        TAG_ID[TAG_ID["DETAILS"] = 24] = "DETAILS";
        TAG_ID[TAG_ID["DIALOG"] = 25] = "DIALOG";
        TAG_ID[TAG_ID["DIR"] = 26] = "DIR";
        TAG_ID[TAG_ID["DIV"] = 27] = "DIV";
        TAG_ID[TAG_ID["DL"] = 28] = "DL";
        TAG_ID[TAG_ID["DT"] = 29] = "DT";
        TAG_ID[TAG_ID["EM"] = 30] = "EM";
        TAG_ID[TAG_ID["EMBED"] = 31] = "EMBED";
        TAG_ID[TAG_ID["FIELDSET"] = 32] = "FIELDSET";
        TAG_ID[TAG_ID["FIGCAPTION"] = 33] = "FIGCAPTION";
        TAG_ID[TAG_ID["FIGURE"] = 34] = "FIGURE";
        TAG_ID[TAG_ID["FONT"] = 35] = "FONT";
        TAG_ID[TAG_ID["FOOTER"] = 36] = "FOOTER";
        TAG_ID[TAG_ID["FOREIGN_OBJECT"] = 37] = "FOREIGN_OBJECT";
        TAG_ID[TAG_ID["FORM"] = 38] = "FORM";
        TAG_ID[TAG_ID["FRAME"] = 39] = "FRAME";
        TAG_ID[TAG_ID["FRAMESET"] = 40] = "FRAMESET";
        TAG_ID[TAG_ID["H1"] = 41] = "H1";
        TAG_ID[TAG_ID["H2"] = 42] = "H2";
        TAG_ID[TAG_ID["H3"] = 43] = "H3";
        TAG_ID[TAG_ID["H4"] = 44] = "H4";
        TAG_ID[TAG_ID["H5"] = 45] = "H5";
        TAG_ID[TAG_ID["H6"] = 46] = "H6";
        TAG_ID[TAG_ID["HEAD"] = 47] = "HEAD";
        TAG_ID[TAG_ID["HEADER"] = 48] = "HEADER";
        TAG_ID[TAG_ID["HGROUP"] = 49] = "HGROUP";
        TAG_ID[TAG_ID["HR"] = 50] = "HR";
        TAG_ID[TAG_ID["HTML"] = 51] = "HTML";
        TAG_ID[TAG_ID["I"] = 52] = "I";
        TAG_ID[TAG_ID["IMG"] = 53] = "IMG";
        TAG_ID[TAG_ID["IMAGE"] = 54] = "IMAGE";
        TAG_ID[TAG_ID["INPUT"] = 55] = "INPUT";
        TAG_ID[TAG_ID["IFRAME"] = 56] = "IFRAME";
        TAG_ID[TAG_ID["KEYGEN"] = 57] = "KEYGEN";
        TAG_ID[TAG_ID["LABEL"] = 58] = "LABEL";
        TAG_ID[TAG_ID["LI"] = 59] = "LI";
        TAG_ID[TAG_ID["LINK"] = 60] = "LINK";
        TAG_ID[TAG_ID["LISTING"] = 61] = "LISTING";
        TAG_ID[TAG_ID["MAIN"] = 62] = "MAIN";
        TAG_ID[TAG_ID["MALIGNMARK"] = 63] = "MALIGNMARK";
        TAG_ID[TAG_ID["MARQUEE"] = 64] = "MARQUEE";
        TAG_ID[TAG_ID["MATH"] = 65] = "MATH";
        TAG_ID[TAG_ID["MENU"] = 66] = "MENU";
        TAG_ID[TAG_ID["META"] = 67] = "META";
        TAG_ID[TAG_ID["MGLYPH"] = 68] = "MGLYPH";
        TAG_ID[TAG_ID["MI"] = 69] = "MI";
        TAG_ID[TAG_ID["MO"] = 70] = "MO";
        TAG_ID[TAG_ID["MN"] = 71] = "MN";
        TAG_ID[TAG_ID["MS"] = 72] = "MS";
        TAG_ID[TAG_ID["MTEXT"] = 73] = "MTEXT";
        TAG_ID[TAG_ID["NAV"] = 74] = "NAV";
        TAG_ID[TAG_ID["NOBR"] = 75] = "NOBR";
        TAG_ID[TAG_ID["NOFRAMES"] = 76] = "NOFRAMES";
        TAG_ID[TAG_ID["NOEMBED"] = 77] = "NOEMBED";
        TAG_ID[TAG_ID["NOSCRIPT"] = 78] = "NOSCRIPT";
        TAG_ID[TAG_ID["OBJECT"] = 79] = "OBJECT";
        TAG_ID[TAG_ID["OL"] = 80] = "OL";
        TAG_ID[TAG_ID["OPTGROUP"] = 81] = "OPTGROUP";
        TAG_ID[TAG_ID["OPTION"] = 82] = "OPTION";
        TAG_ID[TAG_ID["P"] = 83] = "P";
        TAG_ID[TAG_ID["PARAM"] = 84] = "PARAM";
        TAG_ID[TAG_ID["PLAINTEXT"] = 85] = "PLAINTEXT";
        TAG_ID[TAG_ID["PRE"] = 86] = "PRE";
        TAG_ID[TAG_ID["RB"] = 87] = "RB";
        TAG_ID[TAG_ID["RP"] = 88] = "RP";
        TAG_ID[TAG_ID["RT"] = 89] = "RT";
        TAG_ID[TAG_ID["RTC"] = 90] = "RTC";
        TAG_ID[TAG_ID["RUBY"] = 91] = "RUBY";
        TAG_ID[TAG_ID["S"] = 92] = "S";
        TAG_ID[TAG_ID["SCRIPT"] = 93] = "SCRIPT";
        TAG_ID[TAG_ID["SEARCH"] = 94] = "SEARCH";
        TAG_ID[TAG_ID["SECTION"] = 95] = "SECTION";
        TAG_ID[TAG_ID["SELECT"] = 96] = "SELECT";
        TAG_ID[TAG_ID["SOURCE"] = 97] = "SOURCE";
        TAG_ID[TAG_ID["SMALL"] = 98] = "SMALL";
        TAG_ID[TAG_ID["SPAN"] = 99] = "SPAN";
        TAG_ID[TAG_ID["STRIKE"] = 100] = "STRIKE";
        TAG_ID[TAG_ID["STRONG"] = 101] = "STRONG";
        TAG_ID[TAG_ID["STYLE"] = 102] = "STYLE";
        TAG_ID[TAG_ID["SUB"] = 103] = "SUB";
        TAG_ID[TAG_ID["SUMMARY"] = 104] = "SUMMARY";
        TAG_ID[TAG_ID["SUP"] = 105] = "SUP";
        TAG_ID[TAG_ID["TABLE"] = 106] = "TABLE";
        TAG_ID[TAG_ID["TBODY"] = 107] = "TBODY";
        TAG_ID[TAG_ID["TEMPLATE"] = 108] = "TEMPLATE";
        TAG_ID[TAG_ID["TEXTAREA"] = 109] = "TEXTAREA";
        TAG_ID[TAG_ID["TFOOT"] = 110] = "TFOOT";
        TAG_ID[TAG_ID["TD"] = 111] = "TD";
        TAG_ID[TAG_ID["TH"] = 112] = "TH";
        TAG_ID[TAG_ID["THEAD"] = 113] = "THEAD";
        TAG_ID[TAG_ID["TITLE"] = 114] = "TITLE";
        TAG_ID[TAG_ID["TR"] = 115] = "TR";
        TAG_ID[TAG_ID["TRACK"] = 116] = "TRACK";
        TAG_ID[TAG_ID["TT"] = 117] = "TT";
        TAG_ID[TAG_ID["U"] = 118] = "U";
        TAG_ID[TAG_ID["UL"] = 119] = "UL";
        TAG_ID[TAG_ID["SVG"] = 120] = "SVG";
        TAG_ID[TAG_ID["VAR"] = 121] = "VAR";
        TAG_ID[TAG_ID["WBR"] = 122] = "WBR";
        TAG_ID[TAG_ID["XMP"] = 123] = "XMP";
    })(TAG_ID || (TAG_ID = {}));
    const TAG_NAME_TO_ID = new Map([
        [TAG_NAMES.A, TAG_ID.A],
        [TAG_NAMES.ADDRESS, TAG_ID.ADDRESS],
        [TAG_NAMES.ANNOTATION_XML, TAG_ID.ANNOTATION_XML],
        [TAG_NAMES.APPLET, TAG_ID.APPLET],
        [TAG_NAMES.AREA, TAG_ID.AREA],
        [TAG_NAMES.ARTICLE, TAG_ID.ARTICLE],
        [TAG_NAMES.ASIDE, TAG_ID.ASIDE],
        [TAG_NAMES.B, TAG_ID.B],
        [TAG_NAMES.BASE, TAG_ID.BASE],
        [TAG_NAMES.BASEFONT, TAG_ID.BASEFONT],
        [TAG_NAMES.BGSOUND, TAG_ID.BGSOUND],
        [TAG_NAMES.BIG, TAG_ID.BIG],
        [TAG_NAMES.BLOCKQUOTE, TAG_ID.BLOCKQUOTE],
        [TAG_NAMES.BODY, TAG_ID.BODY],
        [TAG_NAMES.BR, TAG_ID.BR],
        [TAG_NAMES.BUTTON, TAG_ID.BUTTON],
        [TAG_NAMES.CAPTION, TAG_ID.CAPTION],
        [TAG_NAMES.CENTER, TAG_ID.CENTER],
        [TAG_NAMES.CODE, TAG_ID.CODE],
        [TAG_NAMES.COL, TAG_ID.COL],
        [TAG_NAMES.COLGROUP, TAG_ID.COLGROUP],
        [TAG_NAMES.DD, TAG_ID.DD],
        [TAG_NAMES.DESC, TAG_ID.DESC],
        [TAG_NAMES.DETAILS, TAG_ID.DETAILS],
        [TAG_NAMES.DIALOG, TAG_ID.DIALOG],
        [TAG_NAMES.DIR, TAG_ID.DIR],
        [TAG_NAMES.DIV, TAG_ID.DIV],
        [TAG_NAMES.DL, TAG_ID.DL],
        [TAG_NAMES.DT, TAG_ID.DT],
        [TAG_NAMES.EM, TAG_ID.EM],
        [TAG_NAMES.EMBED, TAG_ID.EMBED],
        [TAG_NAMES.FIELDSET, TAG_ID.FIELDSET],
        [TAG_NAMES.FIGCAPTION, TAG_ID.FIGCAPTION],
        [TAG_NAMES.FIGURE, TAG_ID.FIGURE],
        [TAG_NAMES.FONT, TAG_ID.FONT],
        [TAG_NAMES.FOOTER, TAG_ID.FOOTER],
        [TAG_NAMES.FOREIGN_OBJECT, TAG_ID.FOREIGN_OBJECT],
        [TAG_NAMES.FORM, TAG_ID.FORM],
        [TAG_NAMES.FRAME, TAG_ID.FRAME],
        [TAG_NAMES.FRAMESET, TAG_ID.FRAMESET],
        [TAG_NAMES.H1, TAG_ID.H1],
        [TAG_NAMES.H2, TAG_ID.H2],
        [TAG_NAMES.H3, TAG_ID.H3],
        [TAG_NAMES.H4, TAG_ID.H4],
        [TAG_NAMES.H5, TAG_ID.H5],
        [TAG_NAMES.H6, TAG_ID.H6],
        [TAG_NAMES.HEAD, TAG_ID.HEAD],
        [TAG_NAMES.HEADER, TAG_ID.HEADER],
        [TAG_NAMES.HGROUP, TAG_ID.HGROUP],
        [TAG_NAMES.HR, TAG_ID.HR],
        [TAG_NAMES.HTML, TAG_ID.HTML],
        [TAG_NAMES.I, TAG_ID.I],
        [TAG_NAMES.IMG, TAG_ID.IMG],
        [TAG_NAMES.IMAGE, TAG_ID.IMAGE],
        [TAG_NAMES.INPUT, TAG_ID.INPUT],
        [TAG_NAMES.IFRAME, TAG_ID.IFRAME],
        [TAG_NAMES.KEYGEN, TAG_ID.KEYGEN],
        [TAG_NAMES.LABEL, TAG_ID.LABEL],
        [TAG_NAMES.LI, TAG_ID.LI],
        [TAG_NAMES.LINK, TAG_ID.LINK],
        [TAG_NAMES.LISTING, TAG_ID.LISTING],
        [TAG_NAMES.MAIN, TAG_ID.MAIN],
        [TAG_NAMES.MALIGNMARK, TAG_ID.MALIGNMARK],
        [TAG_NAMES.MARQUEE, TAG_ID.MARQUEE],
        [TAG_NAMES.MATH, TAG_ID.MATH],
        [TAG_NAMES.MENU, TAG_ID.MENU],
        [TAG_NAMES.META, TAG_ID.META],
        [TAG_NAMES.MGLYPH, TAG_ID.MGLYPH],
        [TAG_NAMES.MI, TAG_ID.MI],
        [TAG_NAMES.MO, TAG_ID.MO],
        [TAG_NAMES.MN, TAG_ID.MN],
        [TAG_NAMES.MS, TAG_ID.MS],
        [TAG_NAMES.MTEXT, TAG_ID.MTEXT],
        [TAG_NAMES.NAV, TAG_ID.NAV],
        [TAG_NAMES.NOBR, TAG_ID.NOBR],
        [TAG_NAMES.NOFRAMES, TAG_ID.NOFRAMES],
        [TAG_NAMES.NOEMBED, TAG_ID.NOEMBED],
        [TAG_NAMES.NOSCRIPT, TAG_ID.NOSCRIPT],
        [TAG_NAMES.OBJECT, TAG_ID.OBJECT],
        [TAG_NAMES.OL, TAG_ID.OL],
        [TAG_NAMES.OPTGROUP, TAG_ID.OPTGROUP],
        [TAG_NAMES.OPTION, TAG_ID.OPTION],
        [TAG_NAMES.P, TAG_ID.P],
        [TAG_NAMES.PARAM, TAG_ID.PARAM],
        [TAG_NAMES.PLAINTEXT, TAG_ID.PLAINTEXT],
        [TAG_NAMES.PRE, TAG_ID.PRE],
        [TAG_NAMES.RB, TAG_ID.RB],
        [TAG_NAMES.RP, TAG_ID.RP],
        [TAG_NAMES.RT, TAG_ID.RT],
        [TAG_NAMES.RTC, TAG_ID.RTC],
        [TAG_NAMES.RUBY, TAG_ID.RUBY],
        [TAG_NAMES.S, TAG_ID.S],
        [TAG_NAMES.SCRIPT, TAG_ID.SCRIPT],
        [TAG_NAMES.SEARCH, TAG_ID.SEARCH],
        [TAG_NAMES.SECTION, TAG_ID.SECTION],
        [TAG_NAMES.SELECT, TAG_ID.SELECT],
        [TAG_NAMES.SOURCE, TAG_ID.SOURCE],
        [TAG_NAMES.SMALL, TAG_ID.SMALL],
        [TAG_NAMES.SPAN, TAG_ID.SPAN],
        [TAG_NAMES.STRIKE, TAG_ID.STRIKE],
        [TAG_NAMES.STRONG, TAG_ID.STRONG],
        [TAG_NAMES.STYLE, TAG_ID.STYLE],
        [TAG_NAMES.SUB, TAG_ID.SUB],
        [TAG_NAMES.SUMMARY, TAG_ID.SUMMARY],
        [TAG_NAMES.SUP, TAG_ID.SUP],
        [TAG_NAMES.TABLE, TAG_ID.TABLE],
        [TAG_NAMES.TBODY, TAG_ID.TBODY],
        [TAG_NAMES.TEMPLATE, TAG_ID.TEMPLATE],
        [TAG_NAMES.TEXTAREA, TAG_ID.TEXTAREA],
        [TAG_NAMES.TFOOT, TAG_ID.TFOOT],
        [TAG_NAMES.TD, TAG_ID.TD],
        [TAG_NAMES.TH, TAG_ID.TH],
        [TAG_NAMES.THEAD, TAG_ID.THEAD],
        [TAG_NAMES.TITLE, TAG_ID.TITLE],
        [TAG_NAMES.TR, TAG_ID.TR],
        [TAG_NAMES.TRACK, TAG_ID.TRACK],
        [TAG_NAMES.TT, TAG_ID.TT],
        [TAG_NAMES.U, TAG_ID.U],
        [TAG_NAMES.UL, TAG_ID.UL],
        [TAG_NAMES.SVG, TAG_ID.SVG],
        [TAG_NAMES.VAR, TAG_ID.VAR],
        [TAG_NAMES.WBR, TAG_ID.WBR],
        [TAG_NAMES.XMP, TAG_ID.XMP],
    ]);
    function getTagID(tagName) {
        var _a;
        return (_a = TAG_NAME_TO_ID.get(tagName)) !== null && _a !== void 0 ? _a : TAG_ID.UNKNOWN;
    }
    const $ = TAG_ID;
    const SPECIAL_ELEMENTS = {
        [NS.HTML]: new Set([
            $.ADDRESS,
            $.APPLET,
            $.AREA,
            $.ARTICLE,
            $.ASIDE,
            $.BASE,
            $.BASEFONT,
            $.BGSOUND,
            $.BLOCKQUOTE,
            $.BODY,
            $.BR,
            $.BUTTON,
            $.CAPTION,
            $.CENTER,
            $.COL,
            $.COLGROUP,
            $.DD,
            $.DETAILS,
            $.DIR,
            $.DIV,
            $.DL,
            $.DT,
            $.EMBED,
            $.FIELDSET,
            $.FIGCAPTION,
            $.FIGURE,
            $.FOOTER,
            $.FORM,
            $.FRAME,
            $.FRAMESET,
            $.H1,
            $.H2,
            $.H3,
            $.H4,
            $.H5,
            $.H6,
            $.HEAD,
            $.HEADER,
            $.HGROUP,
            $.HR,
            $.HTML,
            $.IFRAME,
            $.IMG,
            $.INPUT,
            $.LI,
            $.LINK,
            $.LISTING,
            $.MAIN,
            $.MARQUEE,
            $.MENU,
            $.META,
            $.NAV,
            $.NOEMBED,
            $.NOFRAMES,
            $.NOSCRIPT,
            $.OBJECT,
            $.OL,
            $.P,
            $.PARAM,
            $.PLAINTEXT,
            $.PRE,
            $.SCRIPT,
            $.SECTION,
            $.SELECT,
            $.SOURCE,
            $.STYLE,
            $.SUMMARY,
            $.TABLE,
            $.TBODY,
            $.TD,
            $.TEMPLATE,
            $.TEXTAREA,
            $.TFOOT,
            $.TH,
            $.THEAD,
            $.TITLE,
            $.TR,
            $.TRACK,
            $.UL,
            $.WBR,
            $.XMP,
        ]),
        [NS.MATHML]: new Set([$.MI, $.MO, $.MN, $.MS, $.MTEXT, $.ANNOTATION_XML]),
        [NS.SVG]: new Set([$.TITLE, $.FOREIGN_OBJECT, $.DESC]),
        [NS.XLINK]: new Set(),
        [NS.XML]: new Set(),
        [NS.XMLNS]: new Set(),
    };
    const NUMBERED_HEADERS = new Set([$.H1, $.H2, $.H3, $.H4, $.H5, $.H6]);
    const UNESCAPED_TEXT = new Set([
        TAG_NAMES.STYLE,
        TAG_NAMES.SCRIPT,
        TAG_NAMES.XMP,
        TAG_NAMES.IFRAME,
        TAG_NAMES.NOEMBED,
        TAG_NAMES.NOFRAMES,
        TAG_NAMES.PLAINTEXT,
    ]);
    function hasUnescapedText(tn, scriptingEnabled) {
        return UNESCAPED_TEXT.has(tn) || (scriptingEnabled && tn === TAG_NAMES.NOSCRIPT);
    }

    //States
    var State;
    (function (State) {
        State[State["DATA"] = 0] = "DATA";
        State[State["RCDATA"] = 1] = "RCDATA";
        State[State["RAWTEXT"] = 2] = "RAWTEXT";
        State[State["SCRIPT_DATA"] = 3] = "SCRIPT_DATA";
        State[State["PLAINTEXT"] = 4] = "PLAINTEXT";
        State[State["TAG_OPEN"] = 5] = "TAG_OPEN";
        State[State["END_TAG_OPEN"] = 6] = "END_TAG_OPEN";
        State[State["TAG_NAME"] = 7] = "TAG_NAME";
        State[State["RCDATA_LESS_THAN_SIGN"] = 8] = "RCDATA_LESS_THAN_SIGN";
        State[State["RCDATA_END_TAG_OPEN"] = 9] = "RCDATA_END_TAG_OPEN";
        State[State["RCDATA_END_TAG_NAME"] = 10] = "RCDATA_END_TAG_NAME";
        State[State["RAWTEXT_LESS_THAN_SIGN"] = 11] = "RAWTEXT_LESS_THAN_SIGN";
        State[State["RAWTEXT_END_TAG_OPEN"] = 12] = "RAWTEXT_END_TAG_OPEN";
        State[State["RAWTEXT_END_TAG_NAME"] = 13] = "RAWTEXT_END_TAG_NAME";
        State[State["SCRIPT_DATA_LESS_THAN_SIGN"] = 14] = "SCRIPT_DATA_LESS_THAN_SIGN";
        State[State["SCRIPT_DATA_END_TAG_OPEN"] = 15] = "SCRIPT_DATA_END_TAG_OPEN";
        State[State["SCRIPT_DATA_END_TAG_NAME"] = 16] = "SCRIPT_DATA_END_TAG_NAME";
        State[State["SCRIPT_DATA_ESCAPE_START"] = 17] = "SCRIPT_DATA_ESCAPE_START";
        State[State["SCRIPT_DATA_ESCAPE_START_DASH"] = 18] = "SCRIPT_DATA_ESCAPE_START_DASH";
        State[State["SCRIPT_DATA_ESCAPED"] = 19] = "SCRIPT_DATA_ESCAPED";
        State[State["SCRIPT_DATA_ESCAPED_DASH"] = 20] = "SCRIPT_DATA_ESCAPED_DASH";
        State[State["SCRIPT_DATA_ESCAPED_DASH_DASH"] = 21] = "SCRIPT_DATA_ESCAPED_DASH_DASH";
        State[State["SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN"] = 22] = "SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN";
        State[State["SCRIPT_DATA_ESCAPED_END_TAG_OPEN"] = 23] = "SCRIPT_DATA_ESCAPED_END_TAG_OPEN";
        State[State["SCRIPT_DATA_ESCAPED_END_TAG_NAME"] = 24] = "SCRIPT_DATA_ESCAPED_END_TAG_NAME";
        State[State["SCRIPT_DATA_DOUBLE_ESCAPE_START"] = 25] = "SCRIPT_DATA_DOUBLE_ESCAPE_START";
        State[State["SCRIPT_DATA_DOUBLE_ESCAPED"] = 26] = "SCRIPT_DATA_DOUBLE_ESCAPED";
        State[State["SCRIPT_DATA_DOUBLE_ESCAPED_DASH"] = 27] = "SCRIPT_DATA_DOUBLE_ESCAPED_DASH";
        State[State["SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH"] = 28] = "SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH";
        State[State["SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN"] = 29] = "SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN";
        State[State["SCRIPT_DATA_DOUBLE_ESCAPE_END"] = 30] = "SCRIPT_DATA_DOUBLE_ESCAPE_END";
        State[State["BEFORE_ATTRIBUTE_NAME"] = 31] = "BEFORE_ATTRIBUTE_NAME";
        State[State["ATTRIBUTE_NAME"] = 32] = "ATTRIBUTE_NAME";
        State[State["AFTER_ATTRIBUTE_NAME"] = 33] = "AFTER_ATTRIBUTE_NAME";
        State[State["BEFORE_ATTRIBUTE_VALUE"] = 34] = "BEFORE_ATTRIBUTE_VALUE";
        State[State["ATTRIBUTE_VALUE_DOUBLE_QUOTED"] = 35] = "ATTRIBUTE_VALUE_DOUBLE_QUOTED";
        State[State["ATTRIBUTE_VALUE_SINGLE_QUOTED"] = 36] = "ATTRIBUTE_VALUE_SINGLE_QUOTED";
        State[State["ATTRIBUTE_VALUE_UNQUOTED"] = 37] = "ATTRIBUTE_VALUE_UNQUOTED";
        State[State["AFTER_ATTRIBUTE_VALUE_QUOTED"] = 38] = "AFTER_ATTRIBUTE_VALUE_QUOTED";
        State[State["SELF_CLOSING_START_TAG"] = 39] = "SELF_CLOSING_START_TAG";
        State[State["BOGUS_COMMENT"] = 40] = "BOGUS_COMMENT";
        State[State["MARKUP_DECLARATION_OPEN"] = 41] = "MARKUP_DECLARATION_OPEN";
        State[State["COMMENT_START"] = 42] = "COMMENT_START";
        State[State["COMMENT_START_DASH"] = 43] = "COMMENT_START_DASH";
        State[State["COMMENT"] = 44] = "COMMENT";
        State[State["COMMENT_LESS_THAN_SIGN"] = 45] = "COMMENT_LESS_THAN_SIGN";
        State[State["COMMENT_LESS_THAN_SIGN_BANG"] = 46] = "COMMENT_LESS_THAN_SIGN_BANG";
        State[State["COMMENT_LESS_THAN_SIGN_BANG_DASH"] = 47] = "COMMENT_LESS_THAN_SIGN_BANG_DASH";
        State[State["COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH"] = 48] = "COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH";
        State[State["COMMENT_END_DASH"] = 49] = "COMMENT_END_DASH";
        State[State["COMMENT_END"] = 50] = "COMMENT_END";
        State[State["COMMENT_END_BANG"] = 51] = "COMMENT_END_BANG";
        State[State["DOCTYPE"] = 52] = "DOCTYPE";
        State[State["BEFORE_DOCTYPE_NAME"] = 53] = "BEFORE_DOCTYPE_NAME";
        State[State["DOCTYPE_NAME"] = 54] = "DOCTYPE_NAME";
        State[State["AFTER_DOCTYPE_NAME"] = 55] = "AFTER_DOCTYPE_NAME";
        State[State["AFTER_DOCTYPE_PUBLIC_KEYWORD"] = 56] = "AFTER_DOCTYPE_PUBLIC_KEYWORD";
        State[State["BEFORE_DOCTYPE_PUBLIC_IDENTIFIER"] = 57] = "BEFORE_DOCTYPE_PUBLIC_IDENTIFIER";
        State[State["DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED"] = 58] = "DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED";
        State[State["DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED"] = 59] = "DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED";
        State[State["AFTER_DOCTYPE_PUBLIC_IDENTIFIER"] = 60] = "AFTER_DOCTYPE_PUBLIC_IDENTIFIER";
        State[State["BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS"] = 61] = "BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS";
        State[State["AFTER_DOCTYPE_SYSTEM_KEYWORD"] = 62] = "AFTER_DOCTYPE_SYSTEM_KEYWORD";
        State[State["BEFORE_DOCTYPE_SYSTEM_IDENTIFIER"] = 63] = "BEFORE_DOCTYPE_SYSTEM_IDENTIFIER";
        State[State["DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED"] = 64] = "DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED";
        State[State["DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED"] = 65] = "DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED";
        State[State["AFTER_DOCTYPE_SYSTEM_IDENTIFIER"] = 66] = "AFTER_DOCTYPE_SYSTEM_IDENTIFIER";
        State[State["BOGUS_DOCTYPE"] = 67] = "BOGUS_DOCTYPE";
        State[State["CDATA_SECTION"] = 68] = "CDATA_SECTION";
        State[State["CDATA_SECTION_BRACKET"] = 69] = "CDATA_SECTION_BRACKET";
        State[State["CDATA_SECTION_END"] = 70] = "CDATA_SECTION_END";
        State[State["CHARACTER_REFERENCE"] = 71] = "CHARACTER_REFERENCE";
        State[State["AMBIGUOUS_AMPERSAND"] = 72] = "AMBIGUOUS_AMPERSAND";
    })(State || (State = {}));
    //Tokenizer initial states for different modes
    const TokenizerMode = {
        DATA: State.DATA,
        RCDATA: State.RCDATA,
        RAWTEXT: State.RAWTEXT,
        SCRIPT_DATA: State.SCRIPT_DATA,
        PLAINTEXT: State.PLAINTEXT,
        CDATA_SECTION: State.CDATA_SECTION,
    };
    //Utils
    //OPTIMIZATION: these utility functions should not be moved out of this module. V8 Crankshaft will not inline
    //this functions if they will be situated in another module due to context switch.
    //Always perform inlining check before modifying this functions ('node --trace-inlining').
    function isAsciiDigit(cp) {
        return cp >= CODE_POINTS.DIGIT_0 && cp <= CODE_POINTS.DIGIT_9;
    }
    function isAsciiUpper(cp) {
        return cp >= CODE_POINTS.LATIN_CAPITAL_A && cp <= CODE_POINTS.LATIN_CAPITAL_Z;
    }
    function isAsciiLower(cp) {
        return cp >= CODE_POINTS.LATIN_SMALL_A && cp <= CODE_POINTS.LATIN_SMALL_Z;
    }
    function isAsciiLetter(cp) {
        return isAsciiLower(cp) || isAsciiUpper(cp);
    }
    function isAsciiAlphaNumeric(cp) {
        return isAsciiLetter(cp) || isAsciiDigit(cp);
    }
    function toAsciiLower(cp) {
        return cp + 32;
    }
    function isWhitespace(cp) {
        return cp === CODE_POINTS.SPACE || cp === CODE_POINTS.LINE_FEED || cp === CODE_POINTS.TABULATION || cp === CODE_POINTS.FORM_FEED;
    }
    function isScriptDataDoubleEscapeSequenceEnd(cp) {
        return isWhitespace(cp) || cp === CODE_POINTS.SOLIDUS || cp === CODE_POINTS.GREATER_THAN_SIGN;
    }
    function getErrorForNumericCharacterReference(code) {
        if (code === CODE_POINTS.NULL) {
            return ERR.nullCharacterReference;
        }
        else if (code > 1114111) {
            return ERR.characterReferenceOutsideUnicodeRange;
        }
        else if (isSurrogate(code)) {
            return ERR.surrogateCharacterReference;
        }
        else if (isUndefinedCodePoint(code)) {
            return ERR.noncharacterCharacterReference;
        }
        else if (isControlCodePoint(code) || code === CODE_POINTS.CARRIAGE_RETURN) {
            return ERR.controlCharacterReference;
        }
        return null;
    }
    //Tokenizer
    class Tokenizer {
        constructor(options, handler) {
            this.options = options;
            this.handler = handler;
            this.paused = false;
            /** Ensures that the parsing loop isn't run multiple times at once. */
            this.inLoop = false;
            /**
             * Indicates that the current adjusted node exists, is not an element in the HTML namespace,
             * and that it is not an integration point for either MathML or HTML.
             *
             * @see {@link https://html.spec.whatwg.org/multipage/parsing.html#tree-construction}
             */
            this.inForeignNode = false;
            this.lastStartTagName = '';
            this.active = false;
            this.state = State.DATA;
            this.returnState = State.DATA;
            this.entityStartPos = 0;
            this.consumedAfterSnapshot = -1;
            this.currentCharacterToken = null;
            this.currentToken = null;
            this.currentAttr = { name: '', value: '' };
            this.preprocessor = new Preprocessor(handler);
            this.currentLocation = this.getCurrentLocation(-1);
            this.entityDecoder = new EntityDecoder(htmlDecodeTree, (cp, consumed) => {
                // Note: Set `pos` _before_ flushing, as flushing might drop
                // the current chunk and invalidate `entityStartPos`.
                this.preprocessor.pos = this.entityStartPos + consumed - 1;
                this._flushCodePointConsumedAsCharacterReference(cp);
            }, handler.onParseError
                ? {
                    missingSemicolonAfterCharacterReference: () => {
                        this._err(ERR.missingSemicolonAfterCharacterReference, 1);
                    },
                    absenceOfDigitsInNumericCharacterReference: (consumed) => {
                        this._err(ERR.absenceOfDigitsInNumericCharacterReference, this.entityStartPos - this.preprocessor.pos + consumed);
                    },
                    validateNumericCharacterReference: (code) => {
                        const error = getErrorForNumericCharacterReference(code);
                        if (error)
                            this._err(error, 1);
                    },
                }
                : undefined);
        }
        //Errors
        _err(code, cpOffset = 0) {
            var _a, _b;
            (_b = (_a = this.handler).onParseError) === null || _b === void 0 ? void 0 : _b.call(_a, this.preprocessor.getError(code, cpOffset));
        }
        // NOTE: `offset` may never run across line boundaries.
        getCurrentLocation(offset) {
            if (!this.options.sourceCodeLocationInfo) {
                return null;
            }
            return {
                startLine: this.preprocessor.line,
                startCol: this.preprocessor.col - offset,
                startOffset: this.preprocessor.offset - offset,
                endLine: -1,
                endCol: -1,
                endOffset: -1,
            };
        }
        _runParsingLoop() {
            if (this.inLoop)
                return;
            this.inLoop = true;
            while (this.active && !this.paused) {
                this.consumedAfterSnapshot = 0;
                const cp = this._consume();
                if (!this._ensureHibernation()) {
                    this._callState(cp);
                }
            }
            this.inLoop = false;
        }
        //API
        pause() {
            this.paused = true;
        }
        resume(writeCallback) {
            if (!this.paused) {
                throw new Error('Parser was already resumed');
            }
            this.paused = false;
            // Necessary for synchronous resume.
            if (this.inLoop)
                return;
            this._runParsingLoop();
            if (!this.paused) {
                writeCallback === null || writeCallback === void 0 ? void 0 : writeCallback();
            }
        }
        write(chunk, isLastChunk, writeCallback) {
            this.active = true;
            this.preprocessor.write(chunk, isLastChunk);
            this._runParsingLoop();
            if (!this.paused) {
                writeCallback === null || writeCallback === void 0 ? void 0 : writeCallback();
            }
        }
        insertHtmlAtCurrentPos(chunk) {
            this.active = true;
            this.preprocessor.insertHtmlAtCurrentPos(chunk);
            this._runParsingLoop();
        }
        //Hibernation
        _ensureHibernation() {
            if (this.preprocessor.endOfChunkHit) {
                this.preprocessor.retreat(this.consumedAfterSnapshot);
                this.consumedAfterSnapshot = 0;
                this.active = false;
                return true;
            }
            return false;
        }
        //Consumption
        _consume() {
            this.consumedAfterSnapshot++;
            return this.preprocessor.advance();
        }
        _advanceBy(count) {
            this.consumedAfterSnapshot += count;
            for (let i = 0; i < count; i++) {
                this.preprocessor.advance();
            }
        }
        _consumeSequenceIfMatch(pattern, caseSensitive) {
            if (this.preprocessor.startsWith(pattern, caseSensitive)) {
                // We will already have consumed one character before calling this method.
                this._advanceBy(pattern.length - 1);
                return true;
            }
            return false;
        }
        //Token creation
        _createStartTagToken() {
            this.currentToken = {
                type: TokenType.START_TAG,
                tagName: '',
                tagID: TAG_ID.UNKNOWN,
                selfClosing: false,
                ackSelfClosing: false,
                attrs: [],
                location: this.getCurrentLocation(1),
            };
        }
        _createEndTagToken() {
            this.currentToken = {
                type: TokenType.END_TAG,
                tagName: '',
                tagID: TAG_ID.UNKNOWN,
                selfClosing: false,
                ackSelfClosing: false,
                attrs: [],
                location: this.getCurrentLocation(2),
            };
        }
        _createCommentToken(offset) {
            this.currentToken = {
                type: TokenType.COMMENT,
                data: '',
                location: this.getCurrentLocation(offset),
            };
        }
        _createDoctypeToken(initialName) {
            this.currentToken = {
                type: TokenType.DOCTYPE,
                name: initialName,
                forceQuirks: false,
                publicId: null,
                systemId: null,
                location: this.currentLocation,
            };
        }
        _createCharacterToken(type, chars) {
            this.currentCharacterToken = {
                type,
                chars,
                location: this.currentLocation,
            };
        }
        //Tag attributes
        _createAttr(attrNameFirstCh) {
            this.currentAttr = {
                name: attrNameFirstCh,
                value: '',
            };
            this.currentLocation = this.getCurrentLocation(0);
        }
        _leaveAttrName() {
            var _a;
            var _b;
            const token = this.currentToken;
            if (getTokenAttr(token, this.currentAttr.name) === null) {
                token.attrs.push(this.currentAttr);
                if (token.location && this.currentLocation) {
                    const attrLocations = ((_a = (_b = token.location).attrs) !== null && _a !== void 0 ? _a : (_b.attrs = Object.create(null)));
                    attrLocations[this.currentAttr.name] = this.currentLocation;
                    // Set end location
                    this._leaveAttrValue();
                }
            }
            else {
                this._err(ERR.duplicateAttribute);
            }
        }
        _leaveAttrValue() {
            if (this.currentLocation) {
                this.currentLocation.endLine = this.preprocessor.line;
                this.currentLocation.endCol = this.preprocessor.col;
                this.currentLocation.endOffset = this.preprocessor.offset;
            }
        }
        //Token emission
        prepareToken(ct) {
            this._emitCurrentCharacterToken(ct.location);
            this.currentToken = null;
            if (ct.location) {
                ct.location.endLine = this.preprocessor.line;
                ct.location.endCol = this.preprocessor.col + 1;
                ct.location.endOffset = this.preprocessor.offset + 1;
            }
            this.currentLocation = this.getCurrentLocation(-1);
        }
        emitCurrentTagToken() {
            const ct = this.currentToken;
            this.prepareToken(ct);
            ct.tagID = getTagID(ct.tagName);
            if (ct.type === TokenType.START_TAG) {
                this.lastStartTagName = ct.tagName;
                this.handler.onStartTag(ct);
            }
            else {
                if (ct.attrs.length > 0) {
                    this._err(ERR.endTagWithAttributes);
                }
                if (ct.selfClosing) {
                    this._err(ERR.endTagWithTrailingSolidus);
                }
                this.handler.onEndTag(ct);
            }
            this.preprocessor.dropParsedChunk();
        }
        emitCurrentComment(ct) {
            this.prepareToken(ct);
            this.handler.onComment(ct);
            this.preprocessor.dropParsedChunk();
        }
        emitCurrentDoctype(ct) {
            this.prepareToken(ct);
            this.handler.onDoctype(ct);
            this.preprocessor.dropParsedChunk();
        }
        _emitCurrentCharacterToken(nextLocation) {
            if (this.currentCharacterToken) {
                //NOTE: if we have a pending character token, make it's end location equal to the
                //current token's start location.
                if (nextLocation && this.currentCharacterToken.location) {
                    this.currentCharacterToken.location.endLine = nextLocation.startLine;
                    this.currentCharacterToken.location.endCol = nextLocation.startCol;
                    this.currentCharacterToken.location.endOffset = nextLocation.startOffset;
                }
                switch (this.currentCharacterToken.type) {
                    case TokenType.CHARACTER: {
                        this.handler.onCharacter(this.currentCharacterToken);
                        break;
                    }
                    case TokenType.NULL_CHARACTER: {
                        this.handler.onNullCharacter(this.currentCharacterToken);
                        break;
                    }
                    case TokenType.WHITESPACE_CHARACTER: {
                        this.handler.onWhitespaceCharacter(this.currentCharacterToken);
                        break;
                    }
                }
                this.currentCharacterToken = null;
            }
        }
        _emitEOFToken() {
            const location = this.getCurrentLocation(0);
            if (location) {
                location.endLine = location.startLine;
                location.endCol = location.startCol;
                location.endOffset = location.startOffset;
            }
            this._emitCurrentCharacterToken(location);
            this.handler.onEof({ type: TokenType.EOF, location });
            this.active = false;
        }
        //Characters emission
        //OPTIMIZATION: The specification uses only one type of character token (one token per character).
        //This causes a huge memory overhead and a lot of unnecessary parser loops. parse5 uses 3 groups of characters.
        //If we have a sequence of characters that belong to the same group, the parser can process it
        //as a single solid character token.
        //So, there are 3 types of character tokens in parse5:
        //1)TokenType.NULL_CHARACTER - \u0000-character sequences (e.g. '\u0000\u0000\u0000')
        //2)TokenType.WHITESPACE_CHARACTER - any whitespace/new-line character sequences (e.g. '\n  \r\t   \f')
        //3)TokenType.CHARACTER - any character sequence which don't belong to groups 1 and 2 (e.g. 'abcdef1234@@#$%^')
        _appendCharToCurrentCharacterToken(type, ch) {
            if (this.currentCharacterToken) {
                if (this.currentCharacterToken.type === type) {
                    this.currentCharacterToken.chars += ch;
                    return;
                }
                else {
                    this.currentLocation = this.getCurrentLocation(0);
                    this._emitCurrentCharacterToken(this.currentLocation);
                    this.preprocessor.dropParsedChunk();
                }
            }
            this._createCharacterToken(type, ch);
        }
        _emitCodePoint(cp) {
            const type = isWhitespace(cp)
                ? TokenType.WHITESPACE_CHARACTER
                : cp === CODE_POINTS.NULL
                    ? TokenType.NULL_CHARACTER
                    : TokenType.CHARACTER;
            this._appendCharToCurrentCharacterToken(type, String.fromCodePoint(cp));
        }
        //NOTE: used when we emit characters explicitly.
        //This is always for non-whitespace and non-null characters, which allows us to avoid additional checks.
        _emitChars(ch) {
            this._appendCharToCurrentCharacterToken(TokenType.CHARACTER, ch);
        }
        // Character reference helpers
        _startCharacterReference() {
            this.returnState = this.state;
            this.state = State.CHARACTER_REFERENCE;
            this.entityStartPos = this.preprocessor.pos;
            this.entityDecoder.startEntity(this._isCharacterReferenceInAttribute() ? DecodingMode.Attribute : DecodingMode.Legacy);
        }
        _isCharacterReferenceInAttribute() {
            return (this.returnState === State.ATTRIBUTE_VALUE_DOUBLE_QUOTED ||
                this.returnState === State.ATTRIBUTE_VALUE_SINGLE_QUOTED ||
                this.returnState === State.ATTRIBUTE_VALUE_UNQUOTED);
        }
        _flushCodePointConsumedAsCharacterReference(cp) {
            if (this._isCharacterReferenceInAttribute()) {
                this.currentAttr.value += String.fromCodePoint(cp);
            }
            else {
                this._emitCodePoint(cp);
            }
        }
        // Calling states this way turns out to be much faster than any other approach.
        _callState(cp) {
            switch (this.state) {
                case State.DATA: {
                    this._stateData(cp);
                    break;
                }
                case State.RCDATA: {
                    this._stateRcdata(cp);
                    break;
                }
                case State.RAWTEXT: {
                    this._stateRawtext(cp);
                    break;
                }
                case State.SCRIPT_DATA: {
                    this._stateScriptData(cp);
                    break;
                }
                case State.PLAINTEXT: {
                    this._statePlaintext(cp);
                    break;
                }
                case State.TAG_OPEN: {
                    this._stateTagOpen(cp);
                    break;
                }
                case State.END_TAG_OPEN: {
                    this._stateEndTagOpen(cp);
                    break;
                }
                case State.TAG_NAME: {
                    this._stateTagName(cp);
                    break;
                }
                case State.RCDATA_LESS_THAN_SIGN: {
                    this._stateRcdataLessThanSign(cp);
                    break;
                }
                case State.RCDATA_END_TAG_OPEN: {
                    this._stateRcdataEndTagOpen(cp);
                    break;
                }
                case State.RCDATA_END_TAG_NAME: {
                    this._stateRcdataEndTagName(cp);
                    break;
                }
                case State.RAWTEXT_LESS_THAN_SIGN: {
                    this._stateRawtextLessThanSign(cp);
                    break;
                }
                case State.RAWTEXT_END_TAG_OPEN: {
                    this._stateRawtextEndTagOpen(cp);
                    break;
                }
                case State.RAWTEXT_END_TAG_NAME: {
                    this._stateRawtextEndTagName(cp);
                    break;
                }
                case State.SCRIPT_DATA_LESS_THAN_SIGN: {
                    this._stateScriptDataLessThanSign(cp);
                    break;
                }
                case State.SCRIPT_DATA_END_TAG_OPEN: {
                    this._stateScriptDataEndTagOpen(cp);
                    break;
                }
                case State.SCRIPT_DATA_END_TAG_NAME: {
                    this._stateScriptDataEndTagName(cp);
                    break;
                }
                case State.SCRIPT_DATA_ESCAPE_START: {
                    this._stateScriptDataEscapeStart(cp);
                    break;
                }
                case State.SCRIPT_DATA_ESCAPE_START_DASH: {
                    this._stateScriptDataEscapeStartDash(cp);
                    break;
                }
                case State.SCRIPT_DATA_ESCAPED: {
                    this._stateScriptDataEscaped(cp);
                    break;
                }
                case State.SCRIPT_DATA_ESCAPED_DASH: {
                    this._stateScriptDataEscapedDash(cp);
                    break;
                }
                case State.SCRIPT_DATA_ESCAPED_DASH_DASH: {
                    this._stateScriptDataEscapedDashDash(cp);
                    break;
                }
                case State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN: {
                    this._stateScriptDataEscapedLessThanSign(cp);
                    break;
                }
                case State.SCRIPT_DATA_ESCAPED_END_TAG_OPEN: {
                    this._stateScriptDataEscapedEndTagOpen(cp);
                    break;
                }
                case State.SCRIPT_DATA_ESCAPED_END_TAG_NAME: {
                    this._stateScriptDataEscapedEndTagName(cp);
                    break;
                }
                case State.SCRIPT_DATA_DOUBLE_ESCAPE_START: {
                    this._stateScriptDataDoubleEscapeStart(cp);
                    break;
                }
                case State.SCRIPT_DATA_DOUBLE_ESCAPED: {
                    this._stateScriptDataDoubleEscaped(cp);
                    break;
                }
                case State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH: {
                    this._stateScriptDataDoubleEscapedDash(cp);
                    break;
                }
                case State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH: {
                    this._stateScriptDataDoubleEscapedDashDash(cp);
                    break;
                }
                case State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN: {
                    this._stateScriptDataDoubleEscapedLessThanSign(cp);
                    break;
                }
                case State.SCRIPT_DATA_DOUBLE_ESCAPE_END: {
                    this._stateScriptDataDoubleEscapeEnd(cp);
                    break;
                }
                case State.BEFORE_ATTRIBUTE_NAME: {
                    this._stateBeforeAttributeName(cp);
                    break;
                }
                case State.ATTRIBUTE_NAME: {
                    this._stateAttributeName(cp);
                    break;
                }
                case State.AFTER_ATTRIBUTE_NAME: {
                    this._stateAfterAttributeName(cp);
                    break;
                }
                case State.BEFORE_ATTRIBUTE_VALUE: {
                    this._stateBeforeAttributeValue(cp);
                    break;
                }
                case State.ATTRIBUTE_VALUE_DOUBLE_QUOTED: {
                    this._stateAttributeValueDoubleQuoted(cp);
                    break;
                }
                case State.ATTRIBUTE_VALUE_SINGLE_QUOTED: {
                    this._stateAttributeValueSingleQuoted(cp);
                    break;
                }
                case State.ATTRIBUTE_VALUE_UNQUOTED: {
                    this._stateAttributeValueUnquoted(cp);
                    break;
                }
                case State.AFTER_ATTRIBUTE_VALUE_QUOTED: {
                    this._stateAfterAttributeValueQuoted(cp);
                    break;
                }
                case State.SELF_CLOSING_START_TAG: {
                    this._stateSelfClosingStartTag(cp);
                    break;
                }
                case State.BOGUS_COMMENT: {
                    this._stateBogusComment(cp);
                    break;
                }
                case State.MARKUP_DECLARATION_OPEN: {
                    this._stateMarkupDeclarationOpen(cp);
                    break;
                }
                case State.COMMENT_START: {
                    this._stateCommentStart(cp);
                    break;
                }
                case State.COMMENT_START_DASH: {
                    this._stateCommentStartDash(cp);
                    break;
                }
                case State.COMMENT: {
                    this._stateComment(cp);
                    break;
                }
                case State.COMMENT_LESS_THAN_SIGN: {
                    this._stateCommentLessThanSign(cp);
                    break;
                }
                case State.COMMENT_LESS_THAN_SIGN_BANG: {
                    this._stateCommentLessThanSignBang(cp);
                    break;
                }
                case State.COMMENT_LESS_THAN_SIGN_BANG_DASH: {
                    this._stateCommentLessThanSignBangDash(cp);
                    break;
                }
                case State.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH: {
                    this._stateCommentLessThanSignBangDashDash(cp);
                    break;
                }
                case State.COMMENT_END_DASH: {
                    this._stateCommentEndDash(cp);
                    break;
                }
                case State.COMMENT_END: {
                    this._stateCommentEnd(cp);
                    break;
                }
                case State.COMMENT_END_BANG: {
                    this._stateCommentEndBang(cp);
                    break;
                }
                case State.DOCTYPE: {
                    this._stateDoctype(cp);
                    break;
                }
                case State.BEFORE_DOCTYPE_NAME: {
                    this._stateBeforeDoctypeName(cp);
                    break;
                }
                case State.DOCTYPE_NAME: {
                    this._stateDoctypeName(cp);
                    break;
                }
                case State.AFTER_DOCTYPE_NAME: {
                    this._stateAfterDoctypeName(cp);
                    break;
                }
                case State.AFTER_DOCTYPE_PUBLIC_KEYWORD: {
                    this._stateAfterDoctypePublicKeyword(cp);
                    break;
                }
                case State.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER: {
                    this._stateBeforeDoctypePublicIdentifier(cp);
                    break;
                }
                case State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED: {
                    this._stateDoctypePublicIdentifierDoubleQuoted(cp);
                    break;
                }
                case State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED: {
                    this._stateDoctypePublicIdentifierSingleQuoted(cp);
                    break;
                }
                case State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER: {
                    this._stateAfterDoctypePublicIdentifier(cp);
                    break;
                }
                case State.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS: {
                    this._stateBetweenDoctypePublicAndSystemIdentifiers(cp);
                    break;
                }
                case State.AFTER_DOCTYPE_SYSTEM_KEYWORD: {
                    this._stateAfterDoctypeSystemKeyword(cp);
                    break;
                }
                case State.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER: {
                    this._stateBeforeDoctypeSystemIdentifier(cp);
                    break;
                }
                case State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED: {
                    this._stateDoctypeSystemIdentifierDoubleQuoted(cp);
                    break;
                }
                case State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED: {
                    this._stateDoctypeSystemIdentifierSingleQuoted(cp);
                    break;
                }
                case State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER: {
                    this._stateAfterDoctypeSystemIdentifier(cp);
                    break;
                }
                case State.BOGUS_DOCTYPE: {
                    this._stateBogusDoctype(cp);
                    break;
                }
                case State.CDATA_SECTION: {
                    this._stateCdataSection(cp);
                    break;
                }
                case State.CDATA_SECTION_BRACKET: {
                    this._stateCdataSectionBracket(cp);
                    break;
                }
                case State.CDATA_SECTION_END: {
                    this._stateCdataSectionEnd(cp);
                    break;
                }
                case State.CHARACTER_REFERENCE: {
                    this._stateCharacterReference();
                    break;
                }
                case State.AMBIGUOUS_AMPERSAND: {
                    this._stateAmbiguousAmpersand(cp);
                    break;
                }
                default: {
                    throw new Error('Unknown state');
                }
            }
        }
        // State machine
        // Data state
        //------------------------------------------------------------------
        _stateData(cp) {
            switch (cp) {
                case CODE_POINTS.LESS_THAN_SIGN: {
                    this.state = State.TAG_OPEN;
                    break;
                }
                case CODE_POINTS.AMPERSAND: {
                    this._startCharacterReference();
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    this._emitCodePoint(cp);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._emitCodePoint(cp);
                }
            }
        }
        //  RCDATA state
        //------------------------------------------------------------------
        _stateRcdata(cp) {
            switch (cp) {
                case CODE_POINTS.AMPERSAND: {
                    this._startCharacterReference();
                    break;
                }
                case CODE_POINTS.LESS_THAN_SIGN: {
                    this.state = State.RCDATA_LESS_THAN_SIGN;
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    this._emitChars(REPLACEMENT_CHARACTER);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._emitCodePoint(cp);
                }
            }
        }
        // RAWTEXT state
        //------------------------------------------------------------------
        _stateRawtext(cp) {
            switch (cp) {
                case CODE_POINTS.LESS_THAN_SIGN: {
                    this.state = State.RAWTEXT_LESS_THAN_SIGN;
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    this._emitChars(REPLACEMENT_CHARACTER);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._emitCodePoint(cp);
                }
            }
        }
        // Script data state
        //------------------------------------------------------------------
        _stateScriptData(cp) {
            switch (cp) {
                case CODE_POINTS.LESS_THAN_SIGN: {
                    this.state = State.SCRIPT_DATA_LESS_THAN_SIGN;
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    this._emitChars(REPLACEMENT_CHARACTER);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._emitCodePoint(cp);
                }
            }
        }
        // PLAINTEXT state
        //------------------------------------------------------------------
        _statePlaintext(cp) {
            switch (cp) {
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    this._emitChars(REPLACEMENT_CHARACTER);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._emitCodePoint(cp);
                }
            }
        }
        // Tag open state
        //------------------------------------------------------------------
        _stateTagOpen(cp) {
            if (isAsciiLetter(cp)) {
                this._createStartTagToken();
                this.state = State.TAG_NAME;
                this._stateTagName(cp);
            }
            else
                switch (cp) {
                    case CODE_POINTS.EXCLAMATION_MARK: {
                        this.state = State.MARKUP_DECLARATION_OPEN;
                        break;
                    }
                    case CODE_POINTS.SOLIDUS: {
                        this.state = State.END_TAG_OPEN;
                        break;
                    }
                    case CODE_POINTS.QUESTION_MARK: {
                        this._err(ERR.unexpectedQuestionMarkInsteadOfTagName);
                        this._createCommentToken(1);
                        this.state = State.BOGUS_COMMENT;
                        this._stateBogusComment(cp);
                        break;
                    }
                    case CODE_POINTS.EOF: {
                        this._err(ERR.eofBeforeTagName);
                        this._emitChars('<');
                        this._emitEOFToken();
                        break;
                    }
                    default: {
                        this._err(ERR.invalidFirstCharacterOfTagName);
                        this._emitChars('<');
                        this.state = State.DATA;
                        this._stateData(cp);
                    }
                }
        }
        // End tag open state
        //------------------------------------------------------------------
        _stateEndTagOpen(cp) {
            if (isAsciiLetter(cp)) {
                this._createEndTagToken();
                this.state = State.TAG_NAME;
                this._stateTagName(cp);
            }
            else
                switch (cp) {
                    case CODE_POINTS.GREATER_THAN_SIGN: {
                        this._err(ERR.missingEndTagName);
                        this.state = State.DATA;
                        break;
                    }
                    case CODE_POINTS.EOF: {
                        this._err(ERR.eofBeforeTagName);
                        this._emitChars('</');
                        this._emitEOFToken();
                        break;
                    }
                    default: {
                        this._err(ERR.invalidFirstCharacterOfTagName);
                        this._createCommentToken(2);
                        this.state = State.BOGUS_COMMENT;
                        this._stateBogusComment(cp);
                    }
                }
        }
        // Tag name state
        //------------------------------------------------------------------
        _stateTagName(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    this.state = State.BEFORE_ATTRIBUTE_NAME;
                    break;
                }
                case CODE_POINTS.SOLIDUS: {
                    this.state = State.SELF_CLOSING_START_TAG;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this.state = State.DATA;
                    this.emitCurrentTagToken();
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    token.tagName += REPLACEMENT_CHARACTER;
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInTag);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    token.tagName += String.fromCodePoint(isAsciiUpper(cp) ? toAsciiLower(cp) : cp);
                }
            }
        }
        // RCDATA less-than sign state
        //------------------------------------------------------------------
        _stateRcdataLessThanSign(cp) {
            if (cp === CODE_POINTS.SOLIDUS) {
                this.state = State.RCDATA_END_TAG_OPEN;
            }
            else {
                this._emitChars('<');
                this.state = State.RCDATA;
                this._stateRcdata(cp);
            }
        }
        // RCDATA end tag open state
        //------------------------------------------------------------------
        _stateRcdataEndTagOpen(cp) {
            if (isAsciiLetter(cp)) {
                this.state = State.RCDATA_END_TAG_NAME;
                this._stateRcdataEndTagName(cp);
            }
            else {
                this._emitChars('</');
                this.state = State.RCDATA;
                this._stateRcdata(cp);
            }
        }
        handleSpecialEndTag(_cp) {
            if (!this.preprocessor.startsWith(this.lastStartTagName, false)) {
                return !this._ensureHibernation();
            }
            this._createEndTagToken();
            const token = this.currentToken;
            token.tagName = this.lastStartTagName;
            const cp = this.preprocessor.peek(this.lastStartTagName.length);
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    this._advanceBy(this.lastStartTagName.length);
                    this.state = State.BEFORE_ATTRIBUTE_NAME;
                    return false;
                }
                case CODE_POINTS.SOLIDUS: {
                    this._advanceBy(this.lastStartTagName.length);
                    this.state = State.SELF_CLOSING_START_TAG;
                    return false;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this._advanceBy(this.lastStartTagName.length);
                    this.emitCurrentTagToken();
                    this.state = State.DATA;
                    return false;
                }
                default: {
                    return !this._ensureHibernation();
                }
            }
        }
        // RCDATA end tag name state
        //------------------------------------------------------------------
        _stateRcdataEndTagName(cp) {
            if (this.handleSpecialEndTag(cp)) {
                this._emitChars('</');
                this.state = State.RCDATA;
                this._stateRcdata(cp);
            }
        }
        // RAWTEXT less-than sign state
        //------------------------------------------------------------------
        _stateRawtextLessThanSign(cp) {
            if (cp === CODE_POINTS.SOLIDUS) {
                this.state = State.RAWTEXT_END_TAG_OPEN;
            }
            else {
                this._emitChars('<');
                this.state = State.RAWTEXT;
                this._stateRawtext(cp);
            }
        }
        // RAWTEXT end tag open state
        //------------------------------------------------------------------
        _stateRawtextEndTagOpen(cp) {
            if (isAsciiLetter(cp)) {
                this.state = State.RAWTEXT_END_TAG_NAME;
                this._stateRawtextEndTagName(cp);
            }
            else {
                this._emitChars('</');
                this.state = State.RAWTEXT;
                this._stateRawtext(cp);
            }
        }
        // RAWTEXT end tag name state
        //------------------------------------------------------------------
        _stateRawtextEndTagName(cp) {
            if (this.handleSpecialEndTag(cp)) {
                this._emitChars('</');
                this.state = State.RAWTEXT;
                this._stateRawtext(cp);
            }
        }
        // Script data less-than sign state
        //------------------------------------------------------------------
        _stateScriptDataLessThanSign(cp) {
            switch (cp) {
                case CODE_POINTS.SOLIDUS: {
                    this.state = State.SCRIPT_DATA_END_TAG_OPEN;
                    break;
                }
                case CODE_POINTS.EXCLAMATION_MARK: {
                    this.state = State.SCRIPT_DATA_ESCAPE_START;
                    this._emitChars('<!');
                    break;
                }
                default: {
                    this._emitChars('<');
                    this.state = State.SCRIPT_DATA;
                    this._stateScriptData(cp);
                }
            }
        }
        // Script data end tag open state
        //------------------------------------------------------------------
        _stateScriptDataEndTagOpen(cp) {
            if (isAsciiLetter(cp)) {
                this.state = State.SCRIPT_DATA_END_TAG_NAME;
                this._stateScriptDataEndTagName(cp);
            }
            else {
                this._emitChars('</');
                this.state = State.SCRIPT_DATA;
                this._stateScriptData(cp);
            }
        }
        // Script data end tag name state
        //------------------------------------------------------------------
        _stateScriptDataEndTagName(cp) {
            if (this.handleSpecialEndTag(cp)) {
                this._emitChars('</');
                this.state = State.SCRIPT_DATA;
                this._stateScriptData(cp);
            }
        }
        // Script data escape start state
        //------------------------------------------------------------------
        _stateScriptDataEscapeStart(cp) {
            if (cp === CODE_POINTS.HYPHEN_MINUS) {
                this.state = State.SCRIPT_DATA_ESCAPE_START_DASH;
                this._emitChars('-');
            }
            else {
                this.state = State.SCRIPT_DATA;
                this._stateScriptData(cp);
            }
        }
        // Script data escape start dash state
        //------------------------------------------------------------------
        _stateScriptDataEscapeStartDash(cp) {
            if (cp === CODE_POINTS.HYPHEN_MINUS) {
                this.state = State.SCRIPT_DATA_ESCAPED_DASH_DASH;
                this._emitChars('-');
            }
            else {
                this.state = State.SCRIPT_DATA;
                this._stateScriptData(cp);
            }
        }
        // Script data escaped state
        //------------------------------------------------------------------
        _stateScriptDataEscaped(cp) {
            switch (cp) {
                case CODE_POINTS.HYPHEN_MINUS: {
                    this.state = State.SCRIPT_DATA_ESCAPED_DASH;
                    this._emitChars('-');
                    break;
                }
                case CODE_POINTS.LESS_THAN_SIGN: {
                    this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    this._emitChars(REPLACEMENT_CHARACTER);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInScriptHtmlCommentLikeText);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._emitCodePoint(cp);
                }
            }
        }
        // Script data escaped dash state
        //------------------------------------------------------------------
        _stateScriptDataEscapedDash(cp) {
            switch (cp) {
                case CODE_POINTS.HYPHEN_MINUS: {
                    this.state = State.SCRIPT_DATA_ESCAPED_DASH_DASH;
                    this._emitChars('-');
                    break;
                }
                case CODE_POINTS.LESS_THAN_SIGN: {
                    this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    this.state = State.SCRIPT_DATA_ESCAPED;
                    this._emitChars(REPLACEMENT_CHARACTER);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInScriptHtmlCommentLikeText);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this.state = State.SCRIPT_DATA_ESCAPED;
                    this._emitCodePoint(cp);
                }
            }
        }
        // Script data escaped dash dash state
        //------------------------------------------------------------------
        _stateScriptDataEscapedDashDash(cp) {
            switch (cp) {
                case CODE_POINTS.HYPHEN_MINUS: {
                    this._emitChars('-');
                    break;
                }
                case CODE_POINTS.LESS_THAN_SIGN: {
                    this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this.state = State.SCRIPT_DATA;
                    this._emitChars('>');
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    this.state = State.SCRIPT_DATA_ESCAPED;
                    this._emitChars(REPLACEMENT_CHARACTER);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInScriptHtmlCommentLikeText);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this.state = State.SCRIPT_DATA_ESCAPED;
                    this._emitCodePoint(cp);
                }
            }
        }
        // Script data escaped less-than sign state
        //------------------------------------------------------------------
        _stateScriptDataEscapedLessThanSign(cp) {
            if (cp === CODE_POINTS.SOLIDUS) {
                this.state = State.SCRIPT_DATA_ESCAPED_END_TAG_OPEN;
            }
            else if (isAsciiLetter(cp)) {
                this._emitChars('<');
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPE_START;
                this._stateScriptDataDoubleEscapeStart(cp);
            }
            else {
                this._emitChars('<');
                this.state = State.SCRIPT_DATA_ESCAPED;
                this._stateScriptDataEscaped(cp);
            }
        }
        // Script data escaped end tag open state
        //------------------------------------------------------------------
        _stateScriptDataEscapedEndTagOpen(cp) {
            if (isAsciiLetter(cp)) {
                this.state = State.SCRIPT_DATA_ESCAPED_END_TAG_NAME;
                this._stateScriptDataEscapedEndTagName(cp);
            }
            else {
                this._emitChars('</');
                this.state = State.SCRIPT_DATA_ESCAPED;
                this._stateScriptDataEscaped(cp);
            }
        }
        // Script data escaped end tag name state
        //------------------------------------------------------------------
        _stateScriptDataEscapedEndTagName(cp) {
            if (this.handleSpecialEndTag(cp)) {
                this._emitChars('</');
                this.state = State.SCRIPT_DATA_ESCAPED;
                this._stateScriptDataEscaped(cp);
            }
        }
        // Script data double escape start state
        //------------------------------------------------------------------
        _stateScriptDataDoubleEscapeStart(cp) {
            if (this.preprocessor.startsWith(SEQUENCES.SCRIPT, false) &&
                isScriptDataDoubleEscapeSequenceEnd(this.preprocessor.peek(SEQUENCES.SCRIPT.length))) {
                this._emitCodePoint(cp);
                for (let i = 0; i < SEQUENCES.SCRIPT.length; i++) {
                    this._emitCodePoint(this._consume());
                }
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
            }
            else if (!this._ensureHibernation()) {
                this.state = State.SCRIPT_DATA_ESCAPED;
                this._stateScriptDataEscaped(cp);
            }
        }
        // Script data double escaped state
        //------------------------------------------------------------------
        _stateScriptDataDoubleEscaped(cp) {
            switch (cp) {
                case CODE_POINTS.HYPHEN_MINUS: {
                    this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH;
                    this._emitChars('-');
                    break;
                }
                case CODE_POINTS.LESS_THAN_SIGN: {
                    this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
                    this._emitChars('<');
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    this._emitChars(REPLACEMENT_CHARACTER);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInScriptHtmlCommentLikeText);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._emitCodePoint(cp);
                }
            }
        }
        // Script data double escaped dash state
        //------------------------------------------------------------------
        _stateScriptDataDoubleEscapedDash(cp) {
            switch (cp) {
                case CODE_POINTS.HYPHEN_MINUS: {
                    this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH;
                    this._emitChars('-');
                    break;
                }
                case CODE_POINTS.LESS_THAN_SIGN: {
                    this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
                    this._emitChars('<');
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                    this._emitChars(REPLACEMENT_CHARACTER);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInScriptHtmlCommentLikeText);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                    this._emitCodePoint(cp);
                }
            }
        }
        // Script data double escaped dash dash state
        //------------------------------------------------------------------
        _stateScriptDataDoubleEscapedDashDash(cp) {
            switch (cp) {
                case CODE_POINTS.HYPHEN_MINUS: {
                    this._emitChars('-');
                    break;
                }
                case CODE_POINTS.LESS_THAN_SIGN: {
                    this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
                    this._emitChars('<');
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this.state = State.SCRIPT_DATA;
                    this._emitChars('>');
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                    this._emitChars(REPLACEMENT_CHARACTER);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInScriptHtmlCommentLikeText);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                    this._emitCodePoint(cp);
                }
            }
        }
        // Script data double escaped less-than sign state
        //------------------------------------------------------------------
        _stateScriptDataDoubleEscapedLessThanSign(cp) {
            if (cp === CODE_POINTS.SOLIDUS) {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPE_END;
                this._emitChars('/');
            }
            else {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                this._stateScriptDataDoubleEscaped(cp);
            }
        }
        // Script data double escape end state
        //------------------------------------------------------------------
        _stateScriptDataDoubleEscapeEnd(cp) {
            if (this.preprocessor.startsWith(SEQUENCES.SCRIPT, false) &&
                isScriptDataDoubleEscapeSequenceEnd(this.preprocessor.peek(SEQUENCES.SCRIPT.length))) {
                this._emitCodePoint(cp);
                for (let i = 0; i < SEQUENCES.SCRIPT.length; i++) {
                    this._emitCodePoint(this._consume());
                }
                this.state = State.SCRIPT_DATA_ESCAPED;
            }
            else if (!this._ensureHibernation()) {
                this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
                this._stateScriptDataDoubleEscaped(cp);
            }
        }
        // Before attribute name state
        //------------------------------------------------------------------
        _stateBeforeAttributeName(cp) {
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    // Ignore whitespace
                    break;
                }
                case CODE_POINTS.SOLIDUS:
                case CODE_POINTS.GREATER_THAN_SIGN:
                case CODE_POINTS.EOF: {
                    this.state = State.AFTER_ATTRIBUTE_NAME;
                    this._stateAfterAttributeName(cp);
                    break;
                }
                case CODE_POINTS.EQUALS_SIGN: {
                    this._err(ERR.unexpectedEqualsSignBeforeAttributeName);
                    this._createAttr('=');
                    this.state = State.ATTRIBUTE_NAME;
                    break;
                }
                default: {
                    this._createAttr('');
                    this.state = State.ATTRIBUTE_NAME;
                    this._stateAttributeName(cp);
                }
            }
        }
        // Attribute name state
        //------------------------------------------------------------------
        _stateAttributeName(cp) {
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED:
                case CODE_POINTS.SOLIDUS:
                case CODE_POINTS.GREATER_THAN_SIGN:
                case CODE_POINTS.EOF: {
                    this._leaveAttrName();
                    this.state = State.AFTER_ATTRIBUTE_NAME;
                    this._stateAfterAttributeName(cp);
                    break;
                }
                case CODE_POINTS.EQUALS_SIGN: {
                    this._leaveAttrName();
                    this.state = State.BEFORE_ATTRIBUTE_VALUE;
                    break;
                }
                case CODE_POINTS.QUOTATION_MARK:
                case CODE_POINTS.APOSTROPHE:
                case CODE_POINTS.LESS_THAN_SIGN: {
                    this._err(ERR.unexpectedCharacterInAttributeName);
                    this.currentAttr.name += String.fromCodePoint(cp);
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    this.currentAttr.name += REPLACEMENT_CHARACTER;
                    break;
                }
                default: {
                    this.currentAttr.name += String.fromCodePoint(isAsciiUpper(cp) ? toAsciiLower(cp) : cp);
                }
            }
        }
        // After attribute name state
        //------------------------------------------------------------------
        _stateAfterAttributeName(cp) {
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    // Ignore whitespace
                    break;
                }
                case CODE_POINTS.SOLIDUS: {
                    this.state = State.SELF_CLOSING_START_TAG;
                    break;
                }
                case CODE_POINTS.EQUALS_SIGN: {
                    this.state = State.BEFORE_ATTRIBUTE_VALUE;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this.state = State.DATA;
                    this.emitCurrentTagToken();
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInTag);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._createAttr('');
                    this.state = State.ATTRIBUTE_NAME;
                    this._stateAttributeName(cp);
                }
            }
        }
        // Before attribute value state
        //------------------------------------------------------------------
        _stateBeforeAttributeValue(cp) {
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    // Ignore whitespace
                    break;
                }
                case CODE_POINTS.QUOTATION_MARK: {
                    this.state = State.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
                    break;
                }
                case CODE_POINTS.APOSTROPHE: {
                    this.state = State.ATTRIBUTE_VALUE_SINGLE_QUOTED;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this._err(ERR.missingAttributeValue);
                    this.state = State.DATA;
                    this.emitCurrentTagToken();
                    break;
                }
                default: {
                    this.state = State.ATTRIBUTE_VALUE_UNQUOTED;
                    this._stateAttributeValueUnquoted(cp);
                }
            }
        }
        // Attribute value (double-quoted) state
        //------------------------------------------------------------------
        _stateAttributeValueDoubleQuoted(cp) {
            switch (cp) {
                case CODE_POINTS.QUOTATION_MARK: {
                    this.state = State.AFTER_ATTRIBUTE_VALUE_QUOTED;
                    break;
                }
                case CODE_POINTS.AMPERSAND: {
                    this._startCharacterReference();
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    this.currentAttr.value += REPLACEMENT_CHARACTER;
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInTag);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this.currentAttr.value += String.fromCodePoint(cp);
                }
            }
        }
        // Attribute value (single-quoted) state
        //------------------------------------------------------------------
        _stateAttributeValueSingleQuoted(cp) {
            switch (cp) {
                case CODE_POINTS.APOSTROPHE: {
                    this.state = State.AFTER_ATTRIBUTE_VALUE_QUOTED;
                    break;
                }
                case CODE_POINTS.AMPERSAND: {
                    this._startCharacterReference();
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    this.currentAttr.value += REPLACEMENT_CHARACTER;
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInTag);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this.currentAttr.value += String.fromCodePoint(cp);
                }
            }
        }
        // Attribute value (unquoted) state
        //------------------------------------------------------------------
        _stateAttributeValueUnquoted(cp) {
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    this._leaveAttrValue();
                    this.state = State.BEFORE_ATTRIBUTE_NAME;
                    break;
                }
                case CODE_POINTS.AMPERSAND: {
                    this._startCharacterReference();
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this._leaveAttrValue();
                    this.state = State.DATA;
                    this.emitCurrentTagToken();
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    this.currentAttr.value += REPLACEMENT_CHARACTER;
                    break;
                }
                case CODE_POINTS.QUOTATION_MARK:
                case CODE_POINTS.APOSTROPHE:
                case CODE_POINTS.LESS_THAN_SIGN:
                case CODE_POINTS.EQUALS_SIGN:
                case CODE_POINTS.GRAVE_ACCENT: {
                    this._err(ERR.unexpectedCharacterInUnquotedAttributeValue);
                    this.currentAttr.value += String.fromCodePoint(cp);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInTag);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this.currentAttr.value += String.fromCodePoint(cp);
                }
            }
        }
        // After attribute value (quoted) state
        //------------------------------------------------------------------
        _stateAfterAttributeValueQuoted(cp) {
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    this._leaveAttrValue();
                    this.state = State.BEFORE_ATTRIBUTE_NAME;
                    break;
                }
                case CODE_POINTS.SOLIDUS: {
                    this._leaveAttrValue();
                    this.state = State.SELF_CLOSING_START_TAG;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this._leaveAttrValue();
                    this.state = State.DATA;
                    this.emitCurrentTagToken();
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInTag);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._err(ERR.missingWhitespaceBetweenAttributes);
                    this.state = State.BEFORE_ATTRIBUTE_NAME;
                    this._stateBeforeAttributeName(cp);
                }
            }
        }
        // Self-closing start tag state
        //------------------------------------------------------------------
        _stateSelfClosingStartTag(cp) {
            switch (cp) {
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    const token = this.currentToken;
                    token.selfClosing = true;
                    this.state = State.DATA;
                    this.emitCurrentTagToken();
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInTag);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._err(ERR.unexpectedSolidusInTag);
                    this.state = State.BEFORE_ATTRIBUTE_NAME;
                    this._stateBeforeAttributeName(cp);
                }
            }
        }
        // Bogus comment state
        //------------------------------------------------------------------
        _stateBogusComment(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this.state = State.DATA;
                    this.emitCurrentComment(token);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this.emitCurrentComment(token);
                    this._emitEOFToken();
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    token.data += REPLACEMENT_CHARACTER;
                    break;
                }
                default: {
                    token.data += String.fromCodePoint(cp);
                }
            }
        }
        // Markup declaration open state
        //------------------------------------------------------------------
        _stateMarkupDeclarationOpen(cp) {
            if (this._consumeSequenceIfMatch(SEQUENCES.DASH_DASH, true)) {
                this._createCommentToken(SEQUENCES.DASH_DASH.length + 1);
                this.state = State.COMMENT_START;
            }
            else if (this._consumeSequenceIfMatch(SEQUENCES.DOCTYPE, false)) {
                // NOTE: Doctypes tokens are created without fixed offsets. We keep track of the moment a doctype *might* start here.
                this.currentLocation = this.getCurrentLocation(SEQUENCES.DOCTYPE.length + 1);
                this.state = State.DOCTYPE;
            }
            else if (this._consumeSequenceIfMatch(SEQUENCES.CDATA_START, true)) {
                if (this.inForeignNode) {
                    this.state = State.CDATA_SECTION;
                }
                else {
                    this._err(ERR.cdataInHtmlContent);
                    this._createCommentToken(SEQUENCES.CDATA_START.length + 1);
                    this.currentToken.data = '[CDATA[';
                    this.state = State.BOGUS_COMMENT;
                }
            }
            //NOTE: Sequence lookups can be abrupted by hibernation. In that case, lookup
            //results are no longer valid and we will need to start over.
            else if (!this._ensureHibernation()) {
                this._err(ERR.incorrectlyOpenedComment);
                this._createCommentToken(2);
                this.state = State.BOGUS_COMMENT;
                this._stateBogusComment(cp);
            }
        }
        // Comment start state
        //------------------------------------------------------------------
        _stateCommentStart(cp) {
            switch (cp) {
                case CODE_POINTS.HYPHEN_MINUS: {
                    this.state = State.COMMENT_START_DASH;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this._err(ERR.abruptClosingOfEmptyComment);
                    this.state = State.DATA;
                    const token = this.currentToken;
                    this.emitCurrentComment(token);
                    break;
                }
                default: {
                    this.state = State.COMMENT;
                    this._stateComment(cp);
                }
            }
        }
        // Comment start dash state
        //------------------------------------------------------------------
        _stateCommentStartDash(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.HYPHEN_MINUS: {
                    this.state = State.COMMENT_END;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this._err(ERR.abruptClosingOfEmptyComment);
                    this.state = State.DATA;
                    this.emitCurrentComment(token);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInComment);
                    this.emitCurrentComment(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    token.data += '-';
                    this.state = State.COMMENT;
                    this._stateComment(cp);
                }
            }
        }
        // Comment state
        //------------------------------------------------------------------
        _stateComment(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.HYPHEN_MINUS: {
                    this.state = State.COMMENT_END_DASH;
                    break;
                }
                case CODE_POINTS.LESS_THAN_SIGN: {
                    token.data += '<';
                    this.state = State.COMMENT_LESS_THAN_SIGN;
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    token.data += REPLACEMENT_CHARACTER;
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInComment);
                    this.emitCurrentComment(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    token.data += String.fromCodePoint(cp);
                }
            }
        }
        // Comment less-than sign state
        //------------------------------------------------------------------
        _stateCommentLessThanSign(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.EXCLAMATION_MARK: {
                    token.data += '!';
                    this.state = State.COMMENT_LESS_THAN_SIGN_BANG;
                    break;
                }
                case CODE_POINTS.LESS_THAN_SIGN: {
                    token.data += '<';
                    break;
                }
                default: {
                    this.state = State.COMMENT;
                    this._stateComment(cp);
                }
            }
        }
        // Comment less-than sign bang state
        //------------------------------------------------------------------
        _stateCommentLessThanSignBang(cp) {
            if (cp === CODE_POINTS.HYPHEN_MINUS) {
                this.state = State.COMMENT_LESS_THAN_SIGN_BANG_DASH;
            }
            else {
                this.state = State.COMMENT;
                this._stateComment(cp);
            }
        }
        // Comment less-than sign bang dash state
        //------------------------------------------------------------------
        _stateCommentLessThanSignBangDash(cp) {
            if (cp === CODE_POINTS.HYPHEN_MINUS) {
                this.state = State.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH;
            }
            else {
                this.state = State.COMMENT_END_DASH;
                this._stateCommentEndDash(cp);
            }
        }
        // Comment less-than sign bang dash dash state
        //------------------------------------------------------------------
        _stateCommentLessThanSignBangDashDash(cp) {
            if (cp !== CODE_POINTS.GREATER_THAN_SIGN && cp !== CODE_POINTS.EOF) {
                this._err(ERR.nestedComment);
            }
            this.state = State.COMMENT_END;
            this._stateCommentEnd(cp);
        }
        // Comment end dash state
        //------------------------------------------------------------------
        _stateCommentEndDash(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.HYPHEN_MINUS: {
                    this.state = State.COMMENT_END;
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInComment);
                    this.emitCurrentComment(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    token.data += '-';
                    this.state = State.COMMENT;
                    this._stateComment(cp);
                }
            }
        }
        // Comment end state
        //------------------------------------------------------------------
        _stateCommentEnd(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this.state = State.DATA;
                    this.emitCurrentComment(token);
                    break;
                }
                case CODE_POINTS.EXCLAMATION_MARK: {
                    this.state = State.COMMENT_END_BANG;
                    break;
                }
                case CODE_POINTS.HYPHEN_MINUS: {
                    token.data += '-';
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInComment);
                    this.emitCurrentComment(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    token.data += '--';
                    this.state = State.COMMENT;
                    this._stateComment(cp);
                }
            }
        }
        // Comment end bang state
        //------------------------------------------------------------------
        _stateCommentEndBang(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.HYPHEN_MINUS: {
                    token.data += '--!';
                    this.state = State.COMMENT_END_DASH;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this._err(ERR.incorrectlyClosedComment);
                    this.state = State.DATA;
                    this.emitCurrentComment(token);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInComment);
                    this.emitCurrentComment(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    token.data += '--!';
                    this.state = State.COMMENT;
                    this._stateComment(cp);
                }
            }
        }
        // DOCTYPE state
        //------------------------------------------------------------------
        _stateDoctype(cp) {
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    this.state = State.BEFORE_DOCTYPE_NAME;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this.state = State.BEFORE_DOCTYPE_NAME;
                    this._stateBeforeDoctypeName(cp);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInDoctype);
                    this._createDoctypeToken(null);
                    const token = this.currentToken;
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._err(ERR.missingWhitespaceBeforeDoctypeName);
                    this.state = State.BEFORE_DOCTYPE_NAME;
                    this._stateBeforeDoctypeName(cp);
                }
            }
        }
        // Before DOCTYPE name state
        //------------------------------------------------------------------
        _stateBeforeDoctypeName(cp) {
            if (isAsciiUpper(cp)) {
                this._createDoctypeToken(String.fromCharCode(toAsciiLower(cp)));
                this.state = State.DOCTYPE_NAME;
            }
            else
                switch (cp) {
                    case CODE_POINTS.SPACE:
                    case CODE_POINTS.LINE_FEED:
                    case CODE_POINTS.TABULATION:
                    case CODE_POINTS.FORM_FEED: {
                        // Ignore whitespace
                        break;
                    }
                    case CODE_POINTS.NULL: {
                        this._err(ERR.unexpectedNullCharacter);
                        this._createDoctypeToken(REPLACEMENT_CHARACTER);
                        this.state = State.DOCTYPE_NAME;
                        break;
                    }
                    case CODE_POINTS.GREATER_THAN_SIGN: {
                        this._err(ERR.missingDoctypeName);
                        this._createDoctypeToken(null);
                        const token = this.currentToken;
                        token.forceQuirks = true;
                        this.emitCurrentDoctype(token);
                        this.state = State.DATA;
                        break;
                    }
                    case CODE_POINTS.EOF: {
                        this._err(ERR.eofInDoctype);
                        this._createDoctypeToken(null);
                        const token = this.currentToken;
                        token.forceQuirks = true;
                        this.emitCurrentDoctype(token);
                        this._emitEOFToken();
                        break;
                    }
                    default: {
                        this._createDoctypeToken(String.fromCodePoint(cp));
                        this.state = State.DOCTYPE_NAME;
                    }
                }
        }
        // DOCTYPE name state
        //------------------------------------------------------------------
        _stateDoctypeName(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    this.state = State.AFTER_DOCTYPE_NAME;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this.state = State.DATA;
                    this.emitCurrentDoctype(token);
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    token.name += REPLACEMENT_CHARACTER;
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInDoctype);
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    token.name += String.fromCodePoint(isAsciiUpper(cp) ? toAsciiLower(cp) : cp);
                }
            }
        }
        // After DOCTYPE name state
        //------------------------------------------------------------------
        _stateAfterDoctypeName(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    // Ignore whitespace
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this.state = State.DATA;
                    this.emitCurrentDoctype(token);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInDoctype);
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    if (this._consumeSequenceIfMatch(SEQUENCES.PUBLIC, false)) {
                        this.state = State.AFTER_DOCTYPE_PUBLIC_KEYWORD;
                    }
                    else if (this._consumeSequenceIfMatch(SEQUENCES.SYSTEM, false)) {
                        this.state = State.AFTER_DOCTYPE_SYSTEM_KEYWORD;
                    }
                    //NOTE: sequence lookup can be abrupted by hibernation. In that case lookup
                    //results are no longer valid and we will need to start over.
                    else if (!this._ensureHibernation()) {
                        this._err(ERR.invalidCharacterSequenceAfterDoctypeName);
                        token.forceQuirks = true;
                        this.state = State.BOGUS_DOCTYPE;
                        this._stateBogusDoctype(cp);
                    }
                }
            }
        }
        // After DOCTYPE public keyword state
        //------------------------------------------------------------------
        _stateAfterDoctypePublicKeyword(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    this.state = State.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER;
                    break;
                }
                case CODE_POINTS.QUOTATION_MARK: {
                    this._err(ERR.missingWhitespaceAfterDoctypePublicKeyword);
                    token.publicId = '';
                    this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
                    break;
                }
                case CODE_POINTS.APOSTROPHE: {
                    this._err(ERR.missingWhitespaceAfterDoctypePublicKeyword);
                    token.publicId = '';
                    this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this._err(ERR.missingDoctypePublicIdentifier);
                    token.forceQuirks = true;
                    this.state = State.DATA;
                    this.emitCurrentDoctype(token);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInDoctype);
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._err(ERR.missingQuoteBeforeDoctypePublicIdentifier);
                    token.forceQuirks = true;
                    this.state = State.BOGUS_DOCTYPE;
                    this._stateBogusDoctype(cp);
                }
            }
        }
        // Before DOCTYPE public identifier state
        //------------------------------------------------------------------
        _stateBeforeDoctypePublicIdentifier(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    // Ignore whitespace
                    break;
                }
                case CODE_POINTS.QUOTATION_MARK: {
                    token.publicId = '';
                    this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
                    break;
                }
                case CODE_POINTS.APOSTROPHE: {
                    token.publicId = '';
                    this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this._err(ERR.missingDoctypePublicIdentifier);
                    token.forceQuirks = true;
                    this.state = State.DATA;
                    this.emitCurrentDoctype(token);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInDoctype);
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._err(ERR.missingQuoteBeforeDoctypePublicIdentifier);
                    token.forceQuirks = true;
                    this.state = State.BOGUS_DOCTYPE;
                    this._stateBogusDoctype(cp);
                }
            }
        }
        // DOCTYPE public identifier (double-quoted) state
        //------------------------------------------------------------------
        _stateDoctypePublicIdentifierDoubleQuoted(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.QUOTATION_MARK: {
                    this.state = State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    token.publicId += REPLACEMENT_CHARACTER;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this._err(ERR.abruptDoctypePublicIdentifier);
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this.state = State.DATA;
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInDoctype);
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    token.publicId += String.fromCodePoint(cp);
                }
            }
        }
        // DOCTYPE public identifier (single-quoted) state
        //------------------------------------------------------------------
        _stateDoctypePublicIdentifierSingleQuoted(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.APOSTROPHE: {
                    this.state = State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    token.publicId += REPLACEMENT_CHARACTER;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this._err(ERR.abruptDoctypePublicIdentifier);
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this.state = State.DATA;
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInDoctype);
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    token.publicId += String.fromCodePoint(cp);
                }
            }
        }
        // After DOCTYPE public identifier state
        //------------------------------------------------------------------
        _stateAfterDoctypePublicIdentifier(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    this.state = State.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this.state = State.DATA;
                    this.emitCurrentDoctype(token);
                    break;
                }
                case CODE_POINTS.QUOTATION_MARK: {
                    this._err(ERR.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers);
                    token.systemId = '';
                    this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                    break;
                }
                case CODE_POINTS.APOSTROPHE: {
                    this._err(ERR.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers);
                    token.systemId = '';
                    this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInDoctype);
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
                    token.forceQuirks = true;
                    this.state = State.BOGUS_DOCTYPE;
                    this._stateBogusDoctype(cp);
                }
            }
        }
        // Between DOCTYPE public and system identifiers state
        //------------------------------------------------------------------
        _stateBetweenDoctypePublicAndSystemIdentifiers(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    // Ignore whitespace
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this.emitCurrentDoctype(token);
                    this.state = State.DATA;
                    break;
                }
                case CODE_POINTS.QUOTATION_MARK: {
                    token.systemId = '';
                    this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                    break;
                }
                case CODE_POINTS.APOSTROPHE: {
                    token.systemId = '';
                    this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInDoctype);
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
                    token.forceQuirks = true;
                    this.state = State.BOGUS_DOCTYPE;
                    this._stateBogusDoctype(cp);
                }
            }
        }
        // After DOCTYPE system keyword state
        //------------------------------------------------------------------
        _stateAfterDoctypeSystemKeyword(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    this.state = State.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER;
                    break;
                }
                case CODE_POINTS.QUOTATION_MARK: {
                    this._err(ERR.missingWhitespaceAfterDoctypeSystemKeyword);
                    token.systemId = '';
                    this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                    break;
                }
                case CODE_POINTS.APOSTROPHE: {
                    this._err(ERR.missingWhitespaceAfterDoctypeSystemKeyword);
                    token.systemId = '';
                    this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this._err(ERR.missingDoctypeSystemIdentifier);
                    token.forceQuirks = true;
                    this.state = State.DATA;
                    this.emitCurrentDoctype(token);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInDoctype);
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
                    token.forceQuirks = true;
                    this.state = State.BOGUS_DOCTYPE;
                    this._stateBogusDoctype(cp);
                }
            }
        }
        // Before DOCTYPE system identifier state
        //------------------------------------------------------------------
        _stateBeforeDoctypeSystemIdentifier(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    // Ignore whitespace
                    break;
                }
                case CODE_POINTS.QUOTATION_MARK: {
                    token.systemId = '';
                    this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                    break;
                }
                case CODE_POINTS.APOSTROPHE: {
                    token.systemId = '';
                    this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this._err(ERR.missingDoctypeSystemIdentifier);
                    token.forceQuirks = true;
                    this.state = State.DATA;
                    this.emitCurrentDoctype(token);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInDoctype);
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._err(ERR.missingQuoteBeforeDoctypeSystemIdentifier);
                    token.forceQuirks = true;
                    this.state = State.BOGUS_DOCTYPE;
                    this._stateBogusDoctype(cp);
                }
            }
        }
        // DOCTYPE system identifier (double-quoted) state
        //------------------------------------------------------------------
        _stateDoctypeSystemIdentifierDoubleQuoted(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.QUOTATION_MARK: {
                    this.state = State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    token.systemId += REPLACEMENT_CHARACTER;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this._err(ERR.abruptDoctypeSystemIdentifier);
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this.state = State.DATA;
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInDoctype);
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    token.systemId += String.fromCodePoint(cp);
                }
            }
        }
        // DOCTYPE system identifier (single-quoted) state
        //------------------------------------------------------------------
        _stateDoctypeSystemIdentifierSingleQuoted(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.APOSTROPHE: {
                    this.state = State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    token.systemId += REPLACEMENT_CHARACTER;
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this._err(ERR.abruptDoctypeSystemIdentifier);
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this.state = State.DATA;
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInDoctype);
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    token.systemId += String.fromCodePoint(cp);
                }
            }
        }
        // After DOCTYPE system identifier state
        //------------------------------------------------------------------
        _stateAfterDoctypeSystemIdentifier(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.SPACE:
                case CODE_POINTS.LINE_FEED:
                case CODE_POINTS.TABULATION:
                case CODE_POINTS.FORM_FEED: {
                    // Ignore whitespace
                    break;
                }
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this.emitCurrentDoctype(token);
                    this.state = State.DATA;
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInDoctype);
                    token.forceQuirks = true;
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._err(ERR.unexpectedCharacterAfterDoctypeSystemIdentifier);
                    this.state = State.BOGUS_DOCTYPE;
                    this._stateBogusDoctype(cp);
                }
            }
        }
        // Bogus DOCTYPE state
        //------------------------------------------------------------------
        _stateBogusDoctype(cp) {
            const token = this.currentToken;
            switch (cp) {
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this.emitCurrentDoctype(token);
                    this.state = State.DATA;
                    break;
                }
                case CODE_POINTS.NULL: {
                    this._err(ERR.unexpectedNullCharacter);
                    break;
                }
                case CODE_POINTS.EOF: {
                    this.emitCurrentDoctype(token);
                    this._emitEOFToken();
                    break;
                }
                // Do nothing
            }
        }
        // CDATA section state
        //------------------------------------------------------------------
        _stateCdataSection(cp) {
            switch (cp) {
                case CODE_POINTS.RIGHT_SQUARE_BRACKET: {
                    this.state = State.CDATA_SECTION_BRACKET;
                    break;
                }
                case CODE_POINTS.EOF: {
                    this._err(ERR.eofInCdata);
                    this._emitEOFToken();
                    break;
                }
                default: {
                    this._emitCodePoint(cp);
                }
            }
        }
        // CDATA section bracket state
        //------------------------------------------------------------------
        _stateCdataSectionBracket(cp) {
            if (cp === CODE_POINTS.RIGHT_SQUARE_BRACKET) {
                this.state = State.CDATA_SECTION_END;
            }
            else {
                this._emitChars(']');
                this.state = State.CDATA_SECTION;
                this._stateCdataSection(cp);
            }
        }
        // CDATA section end state
        //------------------------------------------------------------------
        _stateCdataSectionEnd(cp) {
            switch (cp) {
                case CODE_POINTS.GREATER_THAN_SIGN: {
                    this.state = State.DATA;
                    break;
                }
                case CODE_POINTS.RIGHT_SQUARE_BRACKET: {
                    this._emitChars(']');
                    break;
                }
                default: {
                    this._emitChars(']]');
                    this.state = State.CDATA_SECTION;
                    this._stateCdataSection(cp);
                }
            }
        }
        // Character reference state
        //------------------------------------------------------------------
        _stateCharacterReference() {
            let length = this.entityDecoder.write(this.preprocessor.html, this.preprocessor.pos);
            if (length < 0) {
                if (this.preprocessor.lastChunkWritten) {
                    length = this.entityDecoder.end();
                }
                else {
                    // Wait for the rest of the entity.
                    this.active = false;
                    // Mark the entire buffer as read.
                    this.preprocessor.pos = this.preprocessor.html.length - 1;
                    this.consumedAfterSnapshot = 0;
                    this.preprocessor.endOfChunkHit = true;
                    return;
                }
            }
            if (length === 0) {
                // This was not a valid entity. Go back to the beginning, and
                // figure out what to do.
                this.preprocessor.pos = this.entityStartPos;
                this._flushCodePointConsumedAsCharacterReference(CODE_POINTS.AMPERSAND);
                this.state =
                    !this._isCharacterReferenceInAttribute() && isAsciiAlphaNumeric(this.preprocessor.peek(1))
                        ? State.AMBIGUOUS_AMPERSAND
                        : this.returnState;
            }
            else {
                // We successfully parsed an entity. Switch to the return state.
                this.state = this.returnState;
            }
        }
        // Ambiguos ampersand state
        //------------------------------------------------------------------
        _stateAmbiguousAmpersand(cp) {
            if (isAsciiAlphaNumeric(cp)) {
                this._flushCodePointConsumedAsCharacterReference(cp);
            }
            else {
                if (cp === CODE_POINTS.SEMICOLON) {
                    this._err(ERR.unknownNamedCharacterReference);
                }
                this.state = this.returnState;
                this._callState(cp);
            }
        }
    }

    //Element utils
    const IMPLICIT_END_TAG_REQUIRED = new Set([TAG_ID.DD, TAG_ID.DT, TAG_ID.LI, TAG_ID.OPTGROUP, TAG_ID.OPTION, TAG_ID.P, TAG_ID.RB, TAG_ID.RP, TAG_ID.RT, TAG_ID.RTC]);
    const IMPLICIT_END_TAG_REQUIRED_THOROUGHLY = new Set([
        ...IMPLICIT_END_TAG_REQUIRED,
        TAG_ID.CAPTION,
        TAG_ID.COLGROUP,
        TAG_ID.TBODY,
        TAG_ID.TD,
        TAG_ID.TFOOT,
        TAG_ID.TH,
        TAG_ID.THEAD,
        TAG_ID.TR,
    ]);
    const SCOPING_ELEMENTS_HTML = new Set([
        TAG_ID.APPLET,
        TAG_ID.CAPTION,
        TAG_ID.HTML,
        TAG_ID.MARQUEE,
        TAG_ID.OBJECT,
        TAG_ID.TABLE,
        TAG_ID.TD,
        TAG_ID.TEMPLATE,
        TAG_ID.TH,
    ]);
    const SCOPING_ELEMENTS_HTML_LIST = new Set([...SCOPING_ELEMENTS_HTML, TAG_ID.OL, TAG_ID.UL]);
    const SCOPING_ELEMENTS_HTML_BUTTON = new Set([...SCOPING_ELEMENTS_HTML, TAG_ID.BUTTON]);
    const SCOPING_ELEMENTS_MATHML = new Set([TAG_ID.ANNOTATION_XML, TAG_ID.MI, TAG_ID.MN, TAG_ID.MO, TAG_ID.MS, TAG_ID.MTEXT]);
    const SCOPING_ELEMENTS_SVG = new Set([TAG_ID.DESC, TAG_ID.FOREIGN_OBJECT, TAG_ID.TITLE]);
    const TABLE_ROW_CONTEXT = new Set([TAG_ID.TR, TAG_ID.TEMPLATE, TAG_ID.HTML]);
    const TABLE_BODY_CONTEXT = new Set([TAG_ID.TBODY, TAG_ID.TFOOT, TAG_ID.THEAD, TAG_ID.TEMPLATE, TAG_ID.HTML]);
    const TABLE_CONTEXT = new Set([TAG_ID.TABLE, TAG_ID.TEMPLATE, TAG_ID.HTML]);
    const TABLE_CELLS = new Set([TAG_ID.TD, TAG_ID.TH]);
    //Stack of open elements
    class OpenElementStack {
        get currentTmplContentOrNode() {
            return this._isInTemplate() ? this.treeAdapter.getTemplateContent(this.current) : this.current;
        }
        constructor(document, treeAdapter, handler) {
            this.treeAdapter = treeAdapter;
            this.handler = handler;
            this.items = [];
            this.tagIDs = [];
            this.stackTop = -1;
            this.tmplCount = 0;
            this.currentTagId = TAG_ID.UNKNOWN;
            this.current = document;
        }
        //Index of element
        _indexOf(element) {
            return this.items.lastIndexOf(element, this.stackTop);
        }
        //Update current element
        _isInTemplate() {
            return this.currentTagId === TAG_ID.TEMPLATE && this.treeAdapter.getNamespaceURI(this.current) === NS.HTML;
        }
        _updateCurrentElement() {
            this.current = this.items[this.stackTop];
            this.currentTagId = this.tagIDs[this.stackTop];
        }
        //Mutations
        push(element, tagID) {
            this.stackTop++;
            this.items[this.stackTop] = element;
            this.current = element;
            this.tagIDs[this.stackTop] = tagID;
            this.currentTagId = tagID;
            if (this._isInTemplate()) {
                this.tmplCount++;
            }
            this.handler.onItemPush(element, tagID, true);
        }
        pop() {
            const popped = this.current;
            if (this.tmplCount > 0 && this._isInTemplate()) {
                this.tmplCount--;
            }
            this.stackTop--;
            this._updateCurrentElement();
            this.handler.onItemPop(popped, true);
        }
        replace(oldElement, newElement) {
            const idx = this._indexOf(oldElement);
            this.items[idx] = newElement;
            if (idx === this.stackTop) {
                this.current = newElement;
            }
        }
        insertAfter(referenceElement, newElement, newElementID) {
            const insertionIdx = this._indexOf(referenceElement) + 1;
            this.items.splice(insertionIdx, 0, newElement);
            this.tagIDs.splice(insertionIdx, 0, newElementID);
            this.stackTop++;
            if (insertionIdx === this.stackTop) {
                this._updateCurrentElement();
            }
            if (this.current && this.currentTagId !== undefined) {
                this.handler.onItemPush(this.current, this.currentTagId, insertionIdx === this.stackTop);
            }
        }
        popUntilTagNamePopped(tagName) {
            let targetIdx = this.stackTop + 1;
            do {
                targetIdx = this.tagIDs.lastIndexOf(tagName, targetIdx - 1);
            } while (targetIdx > 0 && this.treeAdapter.getNamespaceURI(this.items[targetIdx]) !== NS.HTML);
            this.shortenToLength(Math.max(targetIdx, 0));
        }
        shortenToLength(idx) {
            while (this.stackTop >= idx) {
                const popped = this.current;
                if (this.tmplCount > 0 && this._isInTemplate()) {
                    this.tmplCount -= 1;
                }
                this.stackTop--;
                this._updateCurrentElement();
                this.handler.onItemPop(popped, this.stackTop < idx);
            }
        }
        popUntilElementPopped(element) {
            const idx = this._indexOf(element);
            this.shortenToLength(Math.max(idx, 0));
        }
        popUntilPopped(tagNames, targetNS) {
            const idx = this._indexOfTagNames(tagNames, targetNS);
            this.shortenToLength(Math.max(idx, 0));
        }
        popUntilNumberedHeaderPopped() {
            this.popUntilPopped(NUMBERED_HEADERS, NS.HTML);
        }
        popUntilTableCellPopped() {
            this.popUntilPopped(TABLE_CELLS, NS.HTML);
        }
        popAllUpToHtmlElement() {
            //NOTE: here we assume that the root <html> element is always first in the open element stack, so
            //we perform this fast stack clean up.
            this.tmplCount = 0;
            this.shortenToLength(1);
        }
        _indexOfTagNames(tagNames, namespace) {
            for (let i = this.stackTop; i >= 0; i--) {
                if (tagNames.has(this.tagIDs[i]) && this.treeAdapter.getNamespaceURI(this.items[i]) === namespace) {
                    return i;
                }
            }
            return -1;
        }
        clearBackTo(tagNames, targetNS) {
            const idx = this._indexOfTagNames(tagNames, targetNS);
            this.shortenToLength(idx + 1);
        }
        clearBackToTableContext() {
            this.clearBackTo(TABLE_CONTEXT, NS.HTML);
        }
        clearBackToTableBodyContext() {
            this.clearBackTo(TABLE_BODY_CONTEXT, NS.HTML);
        }
        clearBackToTableRowContext() {
            this.clearBackTo(TABLE_ROW_CONTEXT, NS.HTML);
        }
        remove(element) {
            const idx = this._indexOf(element);
            if (idx >= 0) {
                if (idx === this.stackTop) {
                    this.pop();
                }
                else {
                    this.items.splice(idx, 1);
                    this.tagIDs.splice(idx, 1);
                    this.stackTop--;
                    this._updateCurrentElement();
                    this.handler.onItemPop(element, false);
                }
            }
        }
        //Search
        tryPeekProperlyNestedBodyElement() {
            //Properly nested <body> element (should be second element in stack).
            return this.stackTop >= 1 && this.tagIDs[1] === TAG_ID.BODY ? this.items[1] : null;
        }
        contains(element) {
            return this._indexOf(element) > -1;
        }
        getCommonAncestor(element) {
            const elementIdx = this._indexOf(element) - 1;
            return elementIdx >= 0 ? this.items[elementIdx] : null;
        }
        isRootHtmlElementCurrent() {
            return this.stackTop === 0 && this.tagIDs[0] === TAG_ID.HTML;
        }
        //Element in scope
        hasInDynamicScope(tagName, htmlScope) {
            for (let i = this.stackTop; i >= 0; i--) {
                const tn = this.tagIDs[i];
                switch (this.treeAdapter.getNamespaceURI(this.items[i])) {
                    case NS.HTML: {
                        if (tn === tagName)
                            return true;
                        if (htmlScope.has(tn))
                            return false;
                        break;
                    }
                    case NS.SVG: {
                        if (SCOPING_ELEMENTS_SVG.has(tn))
                            return false;
                        break;
                    }
                    case NS.MATHML: {
                        if (SCOPING_ELEMENTS_MATHML.has(tn))
                            return false;
                        break;
                    }
                }
            }
            return true;
        }
        hasInScope(tagName) {
            return this.hasInDynamicScope(tagName, SCOPING_ELEMENTS_HTML);
        }
        hasInListItemScope(tagName) {
            return this.hasInDynamicScope(tagName, SCOPING_ELEMENTS_HTML_LIST);
        }
        hasInButtonScope(tagName) {
            return this.hasInDynamicScope(tagName, SCOPING_ELEMENTS_HTML_BUTTON);
        }
        hasNumberedHeaderInScope() {
            for (let i = this.stackTop; i >= 0; i--) {
                const tn = this.tagIDs[i];
                switch (this.treeAdapter.getNamespaceURI(this.items[i])) {
                    case NS.HTML: {
                        if (NUMBERED_HEADERS.has(tn))
                            return true;
                        if (SCOPING_ELEMENTS_HTML.has(tn))
                            return false;
                        break;
                    }
                    case NS.SVG: {
                        if (SCOPING_ELEMENTS_SVG.has(tn))
                            return false;
                        break;
                    }
                    case NS.MATHML: {
                        if (SCOPING_ELEMENTS_MATHML.has(tn))
                            return false;
                        break;
                    }
                }
            }
            return true;
        }
        hasInTableScope(tagName) {
            for (let i = this.stackTop; i >= 0; i--) {
                if (this.treeAdapter.getNamespaceURI(this.items[i]) !== NS.HTML) {
                    continue;
                }
                switch (this.tagIDs[i]) {
                    case tagName: {
                        return true;
                    }
                    case TAG_ID.TABLE:
                    case TAG_ID.HTML: {
                        return false;
                    }
                }
            }
            return true;
        }
        hasTableBodyContextInTableScope() {
            for (let i = this.stackTop; i >= 0; i--) {
                if (this.treeAdapter.getNamespaceURI(this.items[i]) !== NS.HTML) {
                    continue;
                }
                switch (this.tagIDs[i]) {
                    case TAG_ID.TBODY:
                    case TAG_ID.THEAD:
                    case TAG_ID.TFOOT: {
                        return true;
                    }
                    case TAG_ID.TABLE:
                    case TAG_ID.HTML: {
                        return false;
                    }
                }
            }
            return true;
        }
        hasInSelectScope(tagName) {
            for (let i = this.stackTop; i >= 0; i--) {
                if (this.treeAdapter.getNamespaceURI(this.items[i]) !== NS.HTML) {
                    continue;
                }
                switch (this.tagIDs[i]) {
                    case tagName: {
                        return true;
                    }
                    case TAG_ID.OPTION:
                    case TAG_ID.OPTGROUP: {
                        break;
                    }
                    default: {
                        return false;
                    }
                }
            }
            return true;
        }
        //Implied end tags
        generateImpliedEndTags() {
            while (this.currentTagId !== undefined && IMPLICIT_END_TAG_REQUIRED.has(this.currentTagId)) {
                this.pop();
            }
        }
        generateImpliedEndTagsThoroughly() {
            while (this.currentTagId !== undefined && IMPLICIT_END_TAG_REQUIRED_THOROUGHLY.has(this.currentTagId)) {
                this.pop();
            }
        }
        generateImpliedEndTagsWithExclusion(exclusionId) {
            while (this.currentTagId !== undefined &&
                this.currentTagId !== exclusionId &&
                IMPLICIT_END_TAG_REQUIRED_THOROUGHLY.has(this.currentTagId)) {
                this.pop();
            }
        }
    }

    //Const
    const NOAH_ARK_CAPACITY = 3;
    var EntryType;
    (function (EntryType) {
        EntryType[EntryType["Marker"] = 0] = "Marker";
        EntryType[EntryType["Element"] = 1] = "Element";
    })(EntryType || (EntryType = {}));
    const MARKER = { type: EntryType.Marker };
    //List of formatting elements
    class FormattingElementList {
        constructor(treeAdapter) {
            this.treeAdapter = treeAdapter;
            this.entries = [];
            this.bookmark = null;
        }
        //Noah Ark's condition
        //OPTIMIZATION: at first we try to find possible candidates for exclusion using
        //lightweight heuristics without thorough attributes check.
        _getNoahArkConditionCandidates(newElement, neAttrs) {
            const candidates = [];
            const neAttrsLength = neAttrs.length;
            const neTagName = this.treeAdapter.getTagName(newElement);
            const neNamespaceURI = this.treeAdapter.getNamespaceURI(newElement);
            for (let i = 0; i < this.entries.length; i++) {
                const entry = this.entries[i];
                if (entry.type === EntryType.Marker) {
                    break;
                }
                const { element } = entry;
                if (this.treeAdapter.getTagName(element) === neTagName &&
                    this.treeAdapter.getNamespaceURI(element) === neNamespaceURI) {
                    const elementAttrs = this.treeAdapter.getAttrList(element);
                    if (elementAttrs.length === neAttrsLength) {
                        candidates.push({ idx: i, attrs: elementAttrs });
                    }
                }
            }
            return candidates;
        }
        _ensureNoahArkCondition(newElement) {
            if (this.entries.length < NOAH_ARK_CAPACITY)
                return;
            const neAttrs = this.treeAdapter.getAttrList(newElement);
            const candidates = this._getNoahArkConditionCandidates(newElement, neAttrs);
            if (candidates.length < NOAH_ARK_CAPACITY)
                return;
            //NOTE: build attrs map for the new element, so we can perform fast lookups
            const neAttrsMap = new Map(neAttrs.map((neAttr) => [neAttr.name, neAttr.value]));
            let validCandidates = 0;
            //NOTE: remove bottommost candidates, until Noah's Ark condition will not be met
            for (let i = 0; i < candidates.length; i++) {
                const candidate = candidates[i];
                // We know that `candidate.attrs.length === neAttrs.length`
                if (candidate.attrs.every((cAttr) => neAttrsMap.get(cAttr.name) === cAttr.value)) {
                    validCandidates += 1;
                    if (validCandidates >= NOAH_ARK_CAPACITY) {
                        this.entries.splice(candidate.idx, 1);
                    }
                }
            }
        }
        //Mutations
        insertMarker() {
            this.entries.unshift(MARKER);
        }
        pushElement(element, token) {
            this._ensureNoahArkCondition(element);
            this.entries.unshift({
                type: EntryType.Element,
                element,
                token,
            });
        }
        insertElementAfterBookmark(element, token) {
            const bookmarkIdx = this.entries.indexOf(this.bookmark);
            this.entries.splice(bookmarkIdx, 0, {
                type: EntryType.Element,
                element,
                token,
            });
        }
        removeEntry(entry) {
            const entryIndex = this.entries.indexOf(entry);
            if (entryIndex !== -1) {
                this.entries.splice(entryIndex, 1);
            }
        }
        /**
         * Clears the list of formatting elements up to the last marker.
         *
         * @see https://html.spec.whatwg.org/multipage/parsing.html#clear-the-list-of-active-formatting-elements-up-to-the-last-marker
         */
        clearToLastMarker() {
            const markerIdx = this.entries.indexOf(MARKER);
            if (markerIdx === -1) {
                this.entries.length = 0;
            }
            else {
                this.entries.splice(0, markerIdx + 1);
            }
        }
        //Search
        getElementEntryInScopeWithTagName(tagName) {
            const entry = this.entries.find((entry) => entry.type === EntryType.Marker || this.treeAdapter.getTagName(entry.element) === tagName);
            return entry && entry.type === EntryType.Element ? entry : null;
        }
        getElementEntry(element) {
            return this.entries.find((entry) => entry.type === EntryType.Element && entry.element === element);
        }
    }

    const defaultTreeAdapter = {
        //Node construction
        createDocument() {
            return {
                nodeName: '#document',
                mode: DOCUMENT_MODE.NO_QUIRKS,
                childNodes: [],
            };
        },
        createDocumentFragment() {
            return {
                nodeName: '#document-fragment',
                childNodes: [],
            };
        },
        createElement(tagName, namespaceURI, attrs) {
            return {
                nodeName: tagName,
                tagName,
                attrs,
                namespaceURI,
                childNodes: [],
                parentNode: null,
            };
        },
        createCommentNode(data) {
            return {
                nodeName: '#comment',
                data,
                parentNode: null,
            };
        },
        createTextNode(value) {
            return {
                nodeName: '#text',
                value,
                parentNode: null,
            };
        },
        //Tree mutation
        appendChild(parentNode, newNode) {
            parentNode.childNodes.push(newNode);
            newNode.parentNode = parentNode;
        },
        insertBefore(parentNode, newNode, referenceNode) {
            const insertionIdx = parentNode.childNodes.indexOf(referenceNode);
            parentNode.childNodes.splice(insertionIdx, 0, newNode);
            newNode.parentNode = parentNode;
        },
        setTemplateContent(templateElement, contentElement) {
            templateElement.content = contentElement;
        },
        getTemplateContent(templateElement) {
            return templateElement.content;
        },
        setDocumentType(document, name, publicId, systemId) {
            const doctypeNode = document.childNodes.find((node) => node.nodeName === '#documentType');
            if (doctypeNode) {
                doctypeNode.name = name;
                doctypeNode.publicId = publicId;
                doctypeNode.systemId = systemId;
            }
            else {
                const node = {
                    nodeName: '#documentType',
                    name,
                    publicId,
                    systemId,
                    parentNode: null,
                };
                defaultTreeAdapter.appendChild(document, node);
            }
        },
        setDocumentMode(document, mode) {
            document.mode = mode;
        },
        getDocumentMode(document) {
            return document.mode;
        },
        detachNode(node) {
            if (node.parentNode) {
                const idx = node.parentNode.childNodes.indexOf(node);
                node.parentNode.childNodes.splice(idx, 1);
                node.parentNode = null;
            }
        },
        insertText(parentNode, text) {
            if (parentNode.childNodes.length > 0) {
                const prevNode = parentNode.childNodes[parentNode.childNodes.length - 1];
                if (defaultTreeAdapter.isTextNode(prevNode)) {
                    prevNode.value += text;
                    return;
                }
            }
            defaultTreeAdapter.appendChild(parentNode, defaultTreeAdapter.createTextNode(text));
        },
        insertTextBefore(parentNode, text, referenceNode) {
            const prevNode = parentNode.childNodes[parentNode.childNodes.indexOf(referenceNode) - 1];
            if (prevNode && defaultTreeAdapter.isTextNode(prevNode)) {
                prevNode.value += text;
            }
            else {
                defaultTreeAdapter.insertBefore(parentNode, defaultTreeAdapter.createTextNode(text), referenceNode);
            }
        },
        adoptAttributes(recipient, attrs) {
            const recipientAttrsMap = new Set(recipient.attrs.map((attr) => attr.name));
            for (let j = 0; j < attrs.length; j++) {
                if (!recipientAttrsMap.has(attrs[j].name)) {
                    recipient.attrs.push(attrs[j]);
                }
            }
        },
        //Tree traversing
        getFirstChild(node) {
            return node.childNodes[0];
        },
        getChildNodes(node) {
            return node.childNodes;
        },
        getParentNode(node) {
            return node.parentNode;
        },
        getAttrList(element) {
            return element.attrs;
        },
        //Node data
        getTagName(element) {
            return element.tagName;
        },
        getNamespaceURI(element) {
            return element.namespaceURI;
        },
        getTextNodeContent(textNode) {
            return textNode.value;
        },
        getCommentNodeContent(commentNode) {
            return commentNode.data;
        },
        getDocumentTypeNodeName(doctypeNode) {
            return doctypeNode.name;
        },
        getDocumentTypeNodePublicId(doctypeNode) {
            return doctypeNode.publicId;
        },
        getDocumentTypeNodeSystemId(doctypeNode) {
            return doctypeNode.systemId;
        },
        //Node types
        isTextNode(node) {
            return node.nodeName === '#text';
        },
        isCommentNode(node) {
            return node.nodeName === '#comment';
        },
        isDocumentTypeNode(node) {
            return node.nodeName === '#documentType';
        },
        isElementNode(node) {
            return Object.prototype.hasOwnProperty.call(node, 'tagName');
        },
        // Source code location
        setNodeSourceCodeLocation(node, location) {
            node.sourceCodeLocation = location;
        },
        getNodeSourceCodeLocation(node) {
            return node.sourceCodeLocation;
        },
        updateNodeSourceCodeLocation(node, endLocation) {
            node.sourceCodeLocation = { ...node.sourceCodeLocation, ...endLocation };
        },
    };

    //Const
    const VALID_DOCTYPE_NAME = 'html';
    const VALID_SYSTEM_ID = 'about:legacy-compat';
    const QUIRKS_MODE_SYSTEM_ID = 'http://www.ibm.com/data/dtd/v11/ibmxhtml1-transitional.dtd';
    const QUIRKS_MODE_PUBLIC_ID_PREFIXES = [
        '+//silmaril//dtd html pro v0r11 19970101//',
        '-//as//dtd html 3.0 aswedit + extensions//',
        '-//advasoft ltd//dtd html 3.0 aswedit + extensions//',
        '-//ietf//dtd html 2.0 level 1//',
        '-//ietf//dtd html 2.0 level 2//',
        '-//ietf//dtd html 2.0 strict level 1//',
        '-//ietf//dtd html 2.0 strict level 2//',
        '-//ietf//dtd html 2.0 strict//',
        '-//ietf//dtd html 2.0//',
        '-//ietf//dtd html 2.1e//',
        '-//ietf//dtd html 3.0//',
        '-//ietf//dtd html 3.2 final//',
        '-//ietf//dtd html 3.2//',
        '-//ietf//dtd html 3//',
        '-//ietf//dtd html level 0//',
        '-//ietf//dtd html level 1//',
        '-//ietf//dtd html level 2//',
        '-//ietf//dtd html level 3//',
        '-//ietf//dtd html strict level 0//',
        '-//ietf//dtd html strict level 1//',
        '-//ietf//dtd html strict level 2//',
        '-//ietf//dtd html strict level 3//',
        '-//ietf//dtd html strict//',
        '-//ietf//dtd html//',
        '-//metrius//dtd metrius presentational//',
        '-//microsoft//dtd internet explorer 2.0 html strict//',
        '-//microsoft//dtd internet explorer 2.0 html//',
        '-//microsoft//dtd internet explorer 2.0 tables//',
        '-//microsoft//dtd internet explorer 3.0 html strict//',
        '-//microsoft//dtd internet explorer 3.0 html//',
        '-//microsoft//dtd internet explorer 3.0 tables//',
        '-//netscape comm. corp.//dtd html//',
        '-//netscape comm. corp.//dtd strict html//',
        "-//o'reilly and associates//dtd html 2.0//",
        "-//o'reilly and associates//dtd html extended 1.0//",
        "-//o'reilly and associates//dtd html extended relaxed 1.0//",
        '-//sq//dtd html 2.0 hotmetal + extensions//',
        '-//softquad software//dtd hotmetal pro 6.0::19990601::extensions to html 4.0//',
        '-//softquad//dtd hotmetal pro 4.0::19971010::extensions to html 4.0//',
        '-//spyglass//dtd html 2.0 extended//',
        '-//sun microsystems corp.//dtd hotjava html//',
        '-//sun microsystems corp.//dtd hotjava strict html//',
        '-//w3c//dtd html 3 1995-03-24//',
        '-//w3c//dtd html 3.2 draft//',
        '-//w3c//dtd html 3.2 final//',
        '-//w3c//dtd html 3.2//',
        '-//w3c//dtd html 3.2s draft//',
        '-//w3c//dtd html 4.0 frameset//',
        '-//w3c//dtd html 4.0 transitional//',
        '-//w3c//dtd html experimental 19960712//',
        '-//w3c//dtd html experimental 970421//',
        '-//w3c//dtd w3 html//',
        '-//w3o//dtd w3 html 3.0//',
        '-//webtechs//dtd mozilla html 2.0//',
        '-//webtechs//dtd mozilla html//',
    ];
    const QUIRKS_MODE_NO_SYSTEM_ID_PUBLIC_ID_PREFIXES = [
        ...QUIRKS_MODE_PUBLIC_ID_PREFIXES,
        '-//w3c//dtd html 4.01 frameset//',
        '-//w3c//dtd html 4.01 transitional//',
    ];
    const QUIRKS_MODE_PUBLIC_IDS = new Set([
        '-//w3o//dtd w3 html strict 3.0//en//',
        '-/w3c/dtd html 4.0 transitional/en',
        'html',
    ]);
    const LIMITED_QUIRKS_PUBLIC_ID_PREFIXES = ['-//w3c//dtd xhtml 1.0 frameset//', '-//w3c//dtd xhtml 1.0 transitional//'];
    const LIMITED_QUIRKS_WITH_SYSTEM_ID_PUBLIC_ID_PREFIXES = [
        ...LIMITED_QUIRKS_PUBLIC_ID_PREFIXES,
        '-//w3c//dtd html 4.01 frameset//',
        '-//w3c//dtd html 4.01 transitional//',
    ];
    //Utils
    function hasPrefix(publicId, prefixes) {
        return prefixes.some((prefix) => publicId.startsWith(prefix));
    }
    //API
    function isConforming(token) {
        return (token.name === VALID_DOCTYPE_NAME &&
            token.publicId === null &&
            (token.systemId === null || token.systemId === VALID_SYSTEM_ID));
    }
    function getDocumentMode(token) {
        if (token.name !== VALID_DOCTYPE_NAME) {
            return DOCUMENT_MODE.QUIRKS;
        }
        const { systemId } = token;
        if (systemId && systemId.toLowerCase() === QUIRKS_MODE_SYSTEM_ID) {
            return DOCUMENT_MODE.QUIRKS;
        }
        let { publicId } = token;
        if (publicId !== null) {
            publicId = publicId.toLowerCase();
            if (QUIRKS_MODE_PUBLIC_IDS.has(publicId)) {
                return DOCUMENT_MODE.QUIRKS;
            }
            let prefixes = systemId === null ? QUIRKS_MODE_NO_SYSTEM_ID_PUBLIC_ID_PREFIXES : QUIRKS_MODE_PUBLIC_ID_PREFIXES;
            if (hasPrefix(publicId, prefixes)) {
                return DOCUMENT_MODE.QUIRKS;
            }
            prefixes =
                systemId === null ? LIMITED_QUIRKS_PUBLIC_ID_PREFIXES : LIMITED_QUIRKS_WITH_SYSTEM_ID_PUBLIC_ID_PREFIXES;
            if (hasPrefix(publicId, prefixes)) {
                return DOCUMENT_MODE.LIMITED_QUIRKS;
            }
        }
        return DOCUMENT_MODE.NO_QUIRKS;
    }

    //MIME types
    const MIME_TYPES = {
        TEXT_HTML: 'text/html',
        APPLICATION_XML: 'application/xhtml+xml',
    };
    //Attributes
    const DEFINITION_URL_ATTR = 'definitionurl';
    const ADJUSTED_DEFINITION_URL_ATTR = 'definitionURL';
    const SVG_ATTRS_ADJUSTMENT_MAP = new Map([
        'attributeName',
        'attributeType',
        'baseFrequency',
        'baseProfile',
        'calcMode',
        'clipPathUnits',
        'diffuseConstant',
        'edgeMode',
        'filterUnits',
        'glyphRef',
        'gradientTransform',
        'gradientUnits',
        'kernelMatrix',
        'kernelUnitLength',
        'keyPoints',
        'keySplines',
        'keyTimes',
        'lengthAdjust',
        'limitingConeAngle',
        'markerHeight',
        'markerUnits',
        'markerWidth',
        'maskContentUnits',
        'maskUnits',
        'numOctaves',
        'pathLength',
        'patternContentUnits',
        'patternTransform',
        'patternUnits',
        'pointsAtX',
        'pointsAtY',
        'pointsAtZ',
        'preserveAlpha',
        'preserveAspectRatio',
        'primitiveUnits',
        'refX',
        'refY',
        'repeatCount',
        'repeatDur',
        'requiredExtensions',
        'requiredFeatures',
        'specularConstant',
        'specularExponent',
        'spreadMethod',
        'startOffset',
        'stdDeviation',
        'stitchTiles',
        'surfaceScale',
        'systemLanguage',
        'tableValues',
        'targetX',
        'targetY',
        'textLength',
        'viewBox',
        'viewTarget',
        'xChannelSelector',
        'yChannelSelector',
        'zoomAndPan',
    ].map((attr) => [attr.toLowerCase(), attr]));
    const XML_ATTRS_ADJUSTMENT_MAP = new Map([
        ['xlink:actuate', { prefix: 'xlink', name: 'actuate', namespace: NS.XLINK }],
        ['xlink:arcrole', { prefix: 'xlink', name: 'arcrole', namespace: NS.XLINK }],
        ['xlink:href', { prefix: 'xlink', name: 'href', namespace: NS.XLINK }],
        ['xlink:role', { prefix: 'xlink', name: 'role', namespace: NS.XLINK }],
        ['xlink:show', { prefix: 'xlink', name: 'show', namespace: NS.XLINK }],
        ['xlink:title', { prefix: 'xlink', name: 'title', namespace: NS.XLINK }],
        ['xlink:type', { prefix: 'xlink', name: 'type', namespace: NS.XLINK }],
        ['xml:lang', { prefix: 'xml', name: 'lang', namespace: NS.XML }],
        ['xml:space', { prefix: 'xml', name: 'space', namespace: NS.XML }],
        ['xmlns', { prefix: '', name: 'xmlns', namespace: NS.XMLNS }],
        ['xmlns:xlink', { prefix: 'xmlns', name: 'xlink', namespace: NS.XMLNS }],
    ]);
    //SVG tag names adjustment map
    const SVG_TAG_NAMES_ADJUSTMENT_MAP = new Map([
        'altGlyph',
        'altGlyphDef',
        'altGlyphItem',
        'animateColor',
        'animateMotion',
        'animateTransform',
        'clipPath',
        'feBlend',
        'feColorMatrix',
        'feComponentTransfer',
        'feComposite',
        'feConvolveMatrix',
        'feDiffuseLighting',
        'feDisplacementMap',
        'feDistantLight',
        'feFlood',
        'feFuncA',
        'feFuncB',
        'feFuncG',
        'feFuncR',
        'feGaussianBlur',
        'feImage',
        'feMerge',
        'feMergeNode',
        'feMorphology',
        'feOffset',
        'fePointLight',
        'feSpecularLighting',
        'feSpotLight',
        'feTile',
        'feTurbulence',
        'foreignObject',
        'glyphRef',
        'linearGradient',
        'radialGradient',
        'textPath',
    ].map((tn) => [tn.toLowerCase(), tn]));
    //Tags that causes exit from foreign content
    const EXITS_FOREIGN_CONTENT = new Set([
        TAG_ID.B,
        TAG_ID.BIG,
        TAG_ID.BLOCKQUOTE,
        TAG_ID.BODY,
        TAG_ID.BR,
        TAG_ID.CENTER,
        TAG_ID.CODE,
        TAG_ID.DD,
        TAG_ID.DIV,
        TAG_ID.DL,
        TAG_ID.DT,
        TAG_ID.EM,
        TAG_ID.EMBED,
        TAG_ID.H1,
        TAG_ID.H2,
        TAG_ID.H3,
        TAG_ID.H4,
        TAG_ID.H5,
        TAG_ID.H6,
        TAG_ID.HEAD,
        TAG_ID.HR,
        TAG_ID.I,
        TAG_ID.IMG,
        TAG_ID.LI,
        TAG_ID.LISTING,
        TAG_ID.MENU,
        TAG_ID.META,
        TAG_ID.NOBR,
        TAG_ID.OL,
        TAG_ID.P,
        TAG_ID.PRE,
        TAG_ID.RUBY,
        TAG_ID.S,
        TAG_ID.SMALL,
        TAG_ID.SPAN,
        TAG_ID.STRONG,
        TAG_ID.STRIKE,
        TAG_ID.SUB,
        TAG_ID.SUP,
        TAG_ID.TABLE,
        TAG_ID.TT,
        TAG_ID.U,
        TAG_ID.UL,
        TAG_ID.VAR,
    ]);
    //Check exit from foreign content
    function causesExit(startTagToken) {
        const tn = startTagToken.tagID;
        const isFontWithAttrs = tn === TAG_ID.FONT &&
            startTagToken.attrs.some(({ name }) => name === ATTRS.COLOR || name === ATTRS.SIZE || name === ATTRS.FACE);
        return isFontWithAttrs || EXITS_FOREIGN_CONTENT.has(tn);
    }
    //Token adjustments
    function adjustTokenMathMLAttrs(token) {
        for (let i = 0; i < token.attrs.length; i++) {
            if (token.attrs[i].name === DEFINITION_URL_ATTR) {
                token.attrs[i].name = ADJUSTED_DEFINITION_URL_ATTR;
                break;
            }
        }
    }
    function adjustTokenSVGAttrs(token) {
        for (let i = 0; i < token.attrs.length; i++) {
            const adjustedAttrName = SVG_ATTRS_ADJUSTMENT_MAP.get(token.attrs[i].name);
            if (adjustedAttrName != null) {
                token.attrs[i].name = adjustedAttrName;
            }
        }
    }
    function adjustTokenXMLAttrs(token) {
        for (let i = 0; i < token.attrs.length; i++) {
            const adjustedAttrEntry = XML_ATTRS_ADJUSTMENT_MAP.get(token.attrs[i].name);
            if (adjustedAttrEntry) {
                token.attrs[i].prefix = adjustedAttrEntry.prefix;
                token.attrs[i].name = adjustedAttrEntry.name;
                token.attrs[i].namespace = adjustedAttrEntry.namespace;
            }
        }
    }
    function adjustTokenSVGTagName(token) {
        const adjustedTagName = SVG_TAG_NAMES_ADJUSTMENT_MAP.get(token.tagName);
        if (adjustedTagName != null) {
            token.tagName = adjustedTagName;
            token.tagID = getTagID(token.tagName);
        }
    }
    //Integration points
    function isMathMLTextIntegrationPoint(tn, ns) {
        return ns === NS.MATHML && (tn === TAG_ID.MI || tn === TAG_ID.MO || tn === TAG_ID.MN || tn === TAG_ID.MS || tn === TAG_ID.MTEXT);
    }
    function isHtmlIntegrationPoint(tn, ns, attrs) {
        if (ns === NS.MATHML && tn === TAG_ID.ANNOTATION_XML) {
            for (let i = 0; i < attrs.length; i++) {
                if (attrs[i].name === ATTRS.ENCODING) {
                    const value = attrs[i].value.toLowerCase();
                    return value === MIME_TYPES.TEXT_HTML || value === MIME_TYPES.APPLICATION_XML;
                }
            }
        }
        return ns === NS.SVG && (tn === TAG_ID.FOREIGN_OBJECT || tn === TAG_ID.DESC || tn === TAG_ID.TITLE);
    }
    function isIntegrationPoint(tn, ns, attrs, foreignNS) {
        return (((!foreignNS || foreignNS === NS.HTML) && isHtmlIntegrationPoint(tn, ns, attrs)) ||
            ((!foreignNS || foreignNS === NS.MATHML) && isMathMLTextIntegrationPoint(tn, ns)));
    }

    //Misc constants
    const HIDDEN_INPUT_TYPE = 'hidden';
    //Adoption agency loops iteration count
    const AA_OUTER_LOOP_ITER = 8;
    const AA_INNER_LOOP_ITER = 3;
    //Insertion modes
    var InsertionMode;
    (function (InsertionMode) {
        InsertionMode[InsertionMode["INITIAL"] = 0] = "INITIAL";
        InsertionMode[InsertionMode["BEFORE_HTML"] = 1] = "BEFORE_HTML";
        InsertionMode[InsertionMode["BEFORE_HEAD"] = 2] = "BEFORE_HEAD";
        InsertionMode[InsertionMode["IN_HEAD"] = 3] = "IN_HEAD";
        InsertionMode[InsertionMode["IN_HEAD_NO_SCRIPT"] = 4] = "IN_HEAD_NO_SCRIPT";
        InsertionMode[InsertionMode["AFTER_HEAD"] = 5] = "AFTER_HEAD";
        InsertionMode[InsertionMode["IN_BODY"] = 6] = "IN_BODY";
        InsertionMode[InsertionMode["TEXT"] = 7] = "TEXT";
        InsertionMode[InsertionMode["IN_TABLE"] = 8] = "IN_TABLE";
        InsertionMode[InsertionMode["IN_TABLE_TEXT"] = 9] = "IN_TABLE_TEXT";
        InsertionMode[InsertionMode["IN_CAPTION"] = 10] = "IN_CAPTION";
        InsertionMode[InsertionMode["IN_COLUMN_GROUP"] = 11] = "IN_COLUMN_GROUP";
        InsertionMode[InsertionMode["IN_TABLE_BODY"] = 12] = "IN_TABLE_BODY";
        InsertionMode[InsertionMode["IN_ROW"] = 13] = "IN_ROW";
        InsertionMode[InsertionMode["IN_CELL"] = 14] = "IN_CELL";
        InsertionMode[InsertionMode["IN_SELECT"] = 15] = "IN_SELECT";
        InsertionMode[InsertionMode["IN_SELECT_IN_TABLE"] = 16] = "IN_SELECT_IN_TABLE";
        InsertionMode[InsertionMode["IN_TEMPLATE"] = 17] = "IN_TEMPLATE";
        InsertionMode[InsertionMode["AFTER_BODY"] = 18] = "AFTER_BODY";
        InsertionMode[InsertionMode["IN_FRAMESET"] = 19] = "IN_FRAMESET";
        InsertionMode[InsertionMode["AFTER_FRAMESET"] = 20] = "AFTER_FRAMESET";
        InsertionMode[InsertionMode["AFTER_AFTER_BODY"] = 21] = "AFTER_AFTER_BODY";
        InsertionMode[InsertionMode["AFTER_AFTER_FRAMESET"] = 22] = "AFTER_AFTER_FRAMESET";
    })(InsertionMode || (InsertionMode = {}));
    const BASE_LOC = {
        startLine: -1,
        startCol: -1,
        startOffset: -1,
        endLine: -1,
        endCol: -1,
        endOffset: -1,
    };
    const TABLE_STRUCTURE_TAGS = new Set([TAG_ID.TABLE, TAG_ID.TBODY, TAG_ID.TFOOT, TAG_ID.THEAD, TAG_ID.TR]);
    const defaultParserOptions = {
        scriptingEnabled: true,
        sourceCodeLocationInfo: false,
        treeAdapter: defaultTreeAdapter,
        onParseError: null,
    };
    //Parser
    class Parser {
        constructor(options, document, 
        /** @internal */
        fragmentContext = null, 
        /** @internal */
        scriptHandler = null) {
            this.fragmentContext = fragmentContext;
            this.scriptHandler = scriptHandler;
            this.currentToken = null;
            this.stopped = false;
            /** @internal */
            this.insertionMode = InsertionMode.INITIAL;
            /** @internal */
            this.originalInsertionMode = InsertionMode.INITIAL;
            /** @internal */
            this.headElement = null;
            /** @internal */
            this.formElement = null;
            /** Indicates that the current node is not an element in the HTML namespace */
            this.currentNotInHTML = false;
            /**
             * The template insertion mode stack is maintained from the left.
             * Ie. the topmost element will always have index 0.
             *
             * @internal
             */
            this.tmplInsertionModeStack = [];
            /** @internal */
            this.pendingCharacterTokens = [];
            /** @internal */
            this.hasNonWhitespacePendingCharacterToken = false;
            /** @internal */
            this.framesetOk = true;
            /** @internal */
            this.skipNextNewLine = false;
            /** @internal */
            this.fosterParentingEnabled = false;
            this.options = {
                ...defaultParserOptions,
                ...options,
            };
            this.treeAdapter = this.options.treeAdapter;
            this.onParseError = this.options.onParseError;
            // Always enable location info if we report parse errors.
            if (this.onParseError) {
                this.options.sourceCodeLocationInfo = true;
            }
            this.document = document !== null && document !== void 0 ? document : this.treeAdapter.createDocument();
            this.tokenizer = new Tokenizer(this.options, this);
            this.activeFormattingElements = new FormattingElementList(this.treeAdapter);
            this.fragmentContextID = fragmentContext ? getTagID(this.treeAdapter.getTagName(fragmentContext)) : TAG_ID.UNKNOWN;
            this._setContextModes(fragmentContext !== null && fragmentContext !== void 0 ? fragmentContext : this.document, this.fragmentContextID);
            this.openElements = new OpenElementStack(this.document, this.treeAdapter, this);
        }
        // API
        static parse(html, options) {
            const parser = new this(options);
            parser.tokenizer.write(html, true);
            return parser.document;
        }
        static getFragmentParser(fragmentContext, options) {
            const opts = {
                ...defaultParserOptions,
                ...options,
            };
            //NOTE: use a <template> element as the fragment context if no context element was provided,
            //so we will parse in a "forgiving" manner
            fragmentContext !== null && fragmentContext !== void 0 ? fragmentContext : (fragmentContext = opts.treeAdapter.createElement(TAG_NAMES.TEMPLATE, NS.HTML, []));
            //NOTE: create a fake element which will be used as the `document` for fragment parsing.
            //This is important for jsdom, where a new `document` cannot be created. This led to
            //fragment parsing messing with the main `document`.
            const documentMock = opts.treeAdapter.createElement('documentmock', NS.HTML, []);
            const parser = new this(opts, documentMock, fragmentContext);
            if (parser.fragmentContextID === TAG_ID.TEMPLATE) {
                parser.tmplInsertionModeStack.unshift(InsertionMode.IN_TEMPLATE);
            }
            parser._initTokenizerForFragmentParsing();
            parser._insertFakeRootElement();
            parser._resetInsertionMode();
            parser._findFormInFragmentContext();
            return parser;
        }
        getFragment() {
            const rootElement = this.treeAdapter.getFirstChild(this.document);
            const fragment = this.treeAdapter.createDocumentFragment();
            this._adoptNodes(rootElement, fragment);
            return fragment;
        }
        //Errors
        /** @internal */
        _err(token, code, beforeToken) {
            var _a;
            if (!this.onParseError)
                return;
            const loc = (_a = token.location) !== null && _a !== void 0 ? _a : BASE_LOC;
            const err = {
                code,
                startLine: loc.startLine,
                startCol: loc.startCol,
                startOffset: loc.startOffset,
                endLine: beforeToken ? loc.startLine : loc.endLine,
                endCol: beforeToken ? loc.startCol : loc.endCol,
                endOffset: beforeToken ? loc.startOffset : loc.endOffset,
            };
            this.onParseError(err);
        }
        //Stack events
        /** @internal */
        onItemPush(node, tid, isTop) {
            var _a, _b;
            (_b = (_a = this.treeAdapter).onItemPush) === null || _b === void 0 ? void 0 : _b.call(_a, node);
            if (isTop && this.openElements.stackTop > 0)
                this._setContextModes(node, tid);
        }
        /** @internal */
        onItemPop(node, isTop) {
            var _a, _b;
            if (this.options.sourceCodeLocationInfo) {
                this._setEndLocation(node, this.currentToken);
            }
            (_b = (_a = this.treeAdapter).onItemPop) === null || _b === void 0 ? void 0 : _b.call(_a, node, this.openElements.current);
            if (isTop) {
                let current;
                let currentTagId;
                if (this.openElements.stackTop === 0 && this.fragmentContext) {
                    current = this.fragmentContext;
                    currentTagId = this.fragmentContextID;
                }
                else {
                    ({ current, currentTagId } = this.openElements);
                }
                this._setContextModes(current, currentTagId);
            }
        }
        _setContextModes(current, tid) {
            const isHTML = current === this.document || (current && this.treeAdapter.getNamespaceURI(current) === NS.HTML);
            this.currentNotInHTML = !isHTML;
            this.tokenizer.inForeignNode =
                !isHTML && current !== undefined && tid !== undefined && !this._isIntegrationPoint(tid, current);
        }
        /** @protected */
        _switchToTextParsing(currentToken, nextTokenizerState) {
            this._insertElement(currentToken, NS.HTML);
            this.tokenizer.state = nextTokenizerState;
            this.originalInsertionMode = this.insertionMode;
            this.insertionMode = InsertionMode.TEXT;
        }
        switchToPlaintextParsing() {
            this.insertionMode = InsertionMode.TEXT;
            this.originalInsertionMode = InsertionMode.IN_BODY;
            this.tokenizer.state = TokenizerMode.PLAINTEXT;
        }
        //Fragment parsing
        /** @protected */
        _getAdjustedCurrentElement() {
            return this.openElements.stackTop === 0 && this.fragmentContext
                ? this.fragmentContext
                : this.openElements.current;
        }
        /** @protected */
        _findFormInFragmentContext() {
            let node = this.fragmentContext;
            while (node) {
                if (this.treeAdapter.getTagName(node) === TAG_NAMES.FORM) {
                    this.formElement = node;
                    break;
                }
                node = this.treeAdapter.getParentNode(node);
            }
        }
        _initTokenizerForFragmentParsing() {
            if (!this.fragmentContext || this.treeAdapter.getNamespaceURI(this.fragmentContext) !== NS.HTML) {
                return;
            }
            switch (this.fragmentContextID) {
                case TAG_ID.TITLE:
                case TAG_ID.TEXTAREA: {
                    this.tokenizer.state = TokenizerMode.RCDATA;
                    break;
                }
                case TAG_ID.STYLE:
                case TAG_ID.XMP:
                case TAG_ID.IFRAME:
                case TAG_ID.NOEMBED:
                case TAG_ID.NOFRAMES:
                case TAG_ID.NOSCRIPT: {
                    this.tokenizer.state = TokenizerMode.RAWTEXT;
                    break;
                }
                case TAG_ID.SCRIPT: {
                    this.tokenizer.state = TokenizerMode.SCRIPT_DATA;
                    break;
                }
                case TAG_ID.PLAINTEXT: {
                    this.tokenizer.state = TokenizerMode.PLAINTEXT;
                    break;
                }
                // Do nothing
            }
        }
        //Tree mutation
        /** @protected */
        _setDocumentType(token) {
            const name = token.name || '';
            const publicId = token.publicId || '';
            const systemId = token.systemId || '';
            this.treeAdapter.setDocumentType(this.document, name, publicId, systemId);
            if (token.location) {
                const documentChildren = this.treeAdapter.getChildNodes(this.document);
                const docTypeNode = documentChildren.find((node) => this.treeAdapter.isDocumentTypeNode(node));
                if (docTypeNode) {
                    this.treeAdapter.setNodeSourceCodeLocation(docTypeNode, token.location);
                }
            }
        }
        /** @protected */
        _attachElementToTree(element, location) {
            if (this.options.sourceCodeLocationInfo) {
                const loc = location && {
                    ...location,
                    startTag: location,
                };
                this.treeAdapter.setNodeSourceCodeLocation(element, loc);
            }
            if (this._shouldFosterParentOnInsertion()) {
                this._fosterParentElement(element);
            }
            else {
                const parent = this.openElements.currentTmplContentOrNode;
                this.treeAdapter.appendChild(parent !== null && parent !== void 0 ? parent : this.document, element);
            }
        }
        /**
         * For self-closing tags. Add an element to the tree, but skip adding it
         * to the stack.
         */
        /** @protected */
        _appendElement(token, namespaceURI) {
            const element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);
            this._attachElementToTree(element, token.location);
        }
        /** @protected */
        _insertElement(token, namespaceURI) {
            const element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);
            this._attachElementToTree(element, token.location);
            this.openElements.push(element, token.tagID);
        }
        /** @protected */
        _insertFakeElement(tagName, tagID) {
            const element = this.treeAdapter.createElement(tagName, NS.HTML, []);
            this._attachElementToTree(element, null);
            this.openElements.push(element, tagID);
        }
        /** @protected */
        _insertTemplate(token) {
            const tmpl = this.treeAdapter.createElement(token.tagName, NS.HTML, token.attrs);
            const content = this.treeAdapter.createDocumentFragment();
            this.treeAdapter.setTemplateContent(tmpl, content);
            this._attachElementToTree(tmpl, token.location);
            this.openElements.push(tmpl, token.tagID);
            if (this.options.sourceCodeLocationInfo)
                this.treeAdapter.setNodeSourceCodeLocation(content, null);
        }
        /** @protected */
        _insertFakeRootElement() {
            const element = this.treeAdapter.createElement(TAG_NAMES.HTML, NS.HTML, []);
            if (this.options.sourceCodeLocationInfo)
                this.treeAdapter.setNodeSourceCodeLocation(element, null);
            this.treeAdapter.appendChild(this.openElements.current, element);
            this.openElements.push(element, TAG_ID.HTML);
        }
        /** @protected */
        _appendCommentNode(token, parent) {
            const commentNode = this.treeAdapter.createCommentNode(token.data);
            this.treeAdapter.appendChild(parent, commentNode);
            if (this.options.sourceCodeLocationInfo) {
                this.treeAdapter.setNodeSourceCodeLocation(commentNode, token.location);
            }
        }
        /** @protected */
        _insertCharacters(token) {
            let parent;
            let beforeElement;
            if (this._shouldFosterParentOnInsertion()) {
                ({ parent, beforeElement } = this._findFosterParentingLocation());
                if (beforeElement) {
                    this.treeAdapter.insertTextBefore(parent, token.chars, beforeElement);
                }
                else {
                    this.treeAdapter.insertText(parent, token.chars);
                }
            }
            else {
                parent = this.openElements.currentTmplContentOrNode;
                this.treeAdapter.insertText(parent, token.chars);
            }
            if (!token.location)
                return;
            const siblings = this.treeAdapter.getChildNodes(parent);
            const textNodeIdx = beforeElement ? siblings.lastIndexOf(beforeElement) : siblings.length;
            const textNode = siblings[textNodeIdx - 1];
            //NOTE: if we have a location assigned by another token, then just update the end position
            const tnLoc = this.treeAdapter.getNodeSourceCodeLocation(textNode);
            if (tnLoc) {
                const { endLine, endCol, endOffset } = token.location;
                this.treeAdapter.updateNodeSourceCodeLocation(textNode, { endLine, endCol, endOffset });
            }
            else if (this.options.sourceCodeLocationInfo) {
                this.treeAdapter.setNodeSourceCodeLocation(textNode, token.location);
            }
        }
        /** @protected */
        _adoptNodes(donor, recipient) {
            for (let child = this.treeAdapter.getFirstChild(donor); child; child = this.treeAdapter.getFirstChild(donor)) {
                this.treeAdapter.detachNode(child);
                this.treeAdapter.appendChild(recipient, child);
            }
        }
        /** @protected */
        _setEndLocation(element, closingToken) {
            if (this.treeAdapter.getNodeSourceCodeLocation(element) && closingToken.location) {
                const ctLoc = closingToken.location;
                const tn = this.treeAdapter.getTagName(element);
                const endLoc = 
                // NOTE: For cases like <p> <p> </p> - First 'p' closes without a closing
                // tag and for cases like <td> <p> </td> - 'p' closes without a closing tag.
                closingToken.type === TokenType.END_TAG && tn === closingToken.tagName
                    ? {
                        endTag: { ...ctLoc },
                        endLine: ctLoc.endLine,
                        endCol: ctLoc.endCol,
                        endOffset: ctLoc.endOffset,
                    }
                    : {
                        endLine: ctLoc.startLine,
                        endCol: ctLoc.startCol,
                        endOffset: ctLoc.startOffset,
                    };
                this.treeAdapter.updateNodeSourceCodeLocation(element, endLoc);
            }
        }
        //Token processing
        shouldProcessStartTagTokenInForeignContent(token) {
            // Check that neither current === document, or ns === NS.HTML
            if (!this.currentNotInHTML)
                return false;
            let current;
            let currentTagId;
            if (this.openElements.stackTop === 0 && this.fragmentContext) {
                current = this.fragmentContext;
                currentTagId = this.fragmentContextID;
            }
            else {
                ({ current, currentTagId } = this.openElements);
            }
            if (token.tagID === TAG_ID.SVG &&
                this.treeAdapter.getTagName(current) === TAG_NAMES.ANNOTATION_XML &&
                this.treeAdapter.getNamespaceURI(current) === NS.MATHML) {
                return false;
            }
            return (
            // Check that `current` is not an integration point for HTML or MathML elements.
            this.tokenizer.inForeignNode ||
                // If it _is_ an integration point, then we might have to check that it is not an HTML
                // integration point.
                ((token.tagID === TAG_ID.MGLYPH || token.tagID === TAG_ID.MALIGNMARK) &&
                    currentTagId !== undefined &&
                    !this._isIntegrationPoint(currentTagId, current, NS.HTML)));
        }
        /** @protected */
        _processToken(token) {
            switch (token.type) {
                case TokenType.CHARACTER: {
                    this.onCharacter(token);
                    break;
                }
                case TokenType.NULL_CHARACTER: {
                    this.onNullCharacter(token);
                    break;
                }
                case TokenType.COMMENT: {
                    this.onComment(token);
                    break;
                }
                case TokenType.DOCTYPE: {
                    this.onDoctype(token);
                    break;
                }
                case TokenType.START_TAG: {
                    this._processStartTag(token);
                    break;
                }
                case TokenType.END_TAG: {
                    this.onEndTag(token);
                    break;
                }
                case TokenType.EOF: {
                    this.onEof(token);
                    break;
                }
                case TokenType.WHITESPACE_CHARACTER: {
                    this.onWhitespaceCharacter(token);
                    break;
                }
            }
        }
        //Integration points
        /** @protected */
        _isIntegrationPoint(tid, element, foreignNS) {
            const ns = this.treeAdapter.getNamespaceURI(element);
            const attrs = this.treeAdapter.getAttrList(element);
            return isIntegrationPoint(tid, ns, attrs, foreignNS);
        }
        //Active formatting elements reconstruction
        /** @protected */
        _reconstructActiveFormattingElements() {
            const listLength = this.activeFormattingElements.entries.length;
            if (listLength) {
                const endIndex = this.activeFormattingElements.entries.findIndex((entry) => entry.type === EntryType.Marker || this.openElements.contains(entry.element));
                const unopenIdx = endIndex === -1 ? listLength - 1 : endIndex - 1;
                for (let i = unopenIdx; i >= 0; i--) {
                    const entry = this.activeFormattingElements.entries[i];
                    this._insertElement(entry.token, this.treeAdapter.getNamespaceURI(entry.element));
                    entry.element = this.openElements.current;
                }
            }
        }
        //Close elements
        /** @protected */
        _closeTableCell() {
            this.openElements.generateImpliedEndTags();
            this.openElements.popUntilTableCellPopped();
            this.activeFormattingElements.clearToLastMarker();
            this.insertionMode = InsertionMode.IN_ROW;
        }
        /** @protected */
        _closePElement() {
            this.openElements.generateImpliedEndTagsWithExclusion(TAG_ID.P);
            this.openElements.popUntilTagNamePopped(TAG_ID.P);
        }
        //Insertion modes
        /** @protected */
        _resetInsertionMode() {
            for (let i = this.openElements.stackTop; i >= 0; i--) {
                //Insertion mode reset map
                switch (i === 0 && this.fragmentContext ? this.fragmentContextID : this.openElements.tagIDs[i]) {
                    case TAG_ID.TR: {
                        this.insertionMode = InsertionMode.IN_ROW;
                        return;
                    }
                    case TAG_ID.TBODY:
                    case TAG_ID.THEAD:
                    case TAG_ID.TFOOT: {
                        this.insertionMode = InsertionMode.IN_TABLE_BODY;
                        return;
                    }
                    case TAG_ID.CAPTION: {
                        this.insertionMode = InsertionMode.IN_CAPTION;
                        return;
                    }
                    case TAG_ID.COLGROUP: {
                        this.insertionMode = InsertionMode.IN_COLUMN_GROUP;
                        return;
                    }
                    case TAG_ID.TABLE: {
                        this.insertionMode = InsertionMode.IN_TABLE;
                        return;
                    }
                    case TAG_ID.BODY: {
                        this.insertionMode = InsertionMode.IN_BODY;
                        return;
                    }
                    case TAG_ID.FRAMESET: {
                        this.insertionMode = InsertionMode.IN_FRAMESET;
                        return;
                    }
                    case TAG_ID.SELECT: {
                        this._resetInsertionModeForSelect(i);
                        return;
                    }
                    case TAG_ID.TEMPLATE: {
                        this.insertionMode = this.tmplInsertionModeStack[0];
                        return;
                    }
                    case TAG_ID.HTML: {
                        this.insertionMode = this.headElement ? InsertionMode.AFTER_HEAD : InsertionMode.BEFORE_HEAD;
                        return;
                    }
                    case TAG_ID.TD:
                    case TAG_ID.TH: {
                        if (i > 0) {
                            this.insertionMode = InsertionMode.IN_CELL;
                            return;
                        }
                        break;
                    }
                    case TAG_ID.HEAD: {
                        if (i > 0) {
                            this.insertionMode = InsertionMode.IN_HEAD;
                            return;
                        }
                        break;
                    }
                }
            }
            this.insertionMode = InsertionMode.IN_BODY;
        }
        /** @protected */
        _resetInsertionModeForSelect(selectIdx) {
            if (selectIdx > 0) {
                for (let i = selectIdx - 1; i > 0; i--) {
                    const tn = this.openElements.tagIDs[i];
                    if (tn === TAG_ID.TEMPLATE) {
                        break;
                    }
                    else if (tn === TAG_ID.TABLE) {
                        this.insertionMode = InsertionMode.IN_SELECT_IN_TABLE;
                        return;
                    }
                }
            }
            this.insertionMode = InsertionMode.IN_SELECT;
        }
        //Foster parenting
        /** @protected */
        _isElementCausesFosterParenting(tn) {
            return TABLE_STRUCTURE_TAGS.has(tn);
        }
        /** @protected */
        _shouldFosterParentOnInsertion() {
            return (this.fosterParentingEnabled &&
                this.openElements.currentTagId !== undefined &&
                this._isElementCausesFosterParenting(this.openElements.currentTagId));
        }
        /** @protected */
        _findFosterParentingLocation() {
            for (let i = this.openElements.stackTop; i >= 0; i--) {
                const openElement = this.openElements.items[i];
                switch (this.openElements.tagIDs[i]) {
                    case TAG_ID.TEMPLATE: {
                        if (this.treeAdapter.getNamespaceURI(openElement) === NS.HTML) {
                            return { parent: this.treeAdapter.getTemplateContent(openElement), beforeElement: null };
                        }
                        break;
                    }
                    case TAG_ID.TABLE: {
                        const parent = this.treeAdapter.getParentNode(openElement);
                        if (parent) {
                            return { parent, beforeElement: openElement };
                        }
                        return { parent: this.openElements.items[i - 1], beforeElement: null };
                    }
                    // Do nothing
                }
            }
            return { parent: this.openElements.items[0], beforeElement: null };
        }
        /** @protected */
        _fosterParentElement(element) {
            const location = this._findFosterParentingLocation();
            if (location.beforeElement) {
                this.treeAdapter.insertBefore(location.parent, element, location.beforeElement);
            }
            else {
                this.treeAdapter.appendChild(location.parent, element);
            }
        }
        //Special elements
        /** @protected */
        _isSpecialElement(element, id) {
            const ns = this.treeAdapter.getNamespaceURI(element);
            return SPECIAL_ELEMENTS[ns].has(id);
        }
        /** @internal */
        onCharacter(token) {
            this.skipNextNewLine = false;
            if (this.tokenizer.inForeignNode) {
                characterInForeignContent(this, token);
                return;
            }
            switch (this.insertionMode) {
                case InsertionMode.INITIAL: {
                    tokenInInitialMode(this, token);
                    break;
                }
                case InsertionMode.BEFORE_HTML: {
                    tokenBeforeHtml(this, token);
                    break;
                }
                case InsertionMode.BEFORE_HEAD: {
                    tokenBeforeHead(this, token);
                    break;
                }
                case InsertionMode.IN_HEAD: {
                    tokenInHead(this, token);
                    break;
                }
                case InsertionMode.IN_HEAD_NO_SCRIPT: {
                    tokenInHeadNoScript(this, token);
                    break;
                }
                case InsertionMode.AFTER_HEAD: {
                    tokenAfterHead(this, token);
                    break;
                }
                case InsertionMode.IN_BODY:
                case InsertionMode.IN_CAPTION:
                case InsertionMode.IN_CELL:
                case InsertionMode.IN_TEMPLATE: {
                    characterInBody(this, token);
                    break;
                }
                case InsertionMode.TEXT:
                case InsertionMode.IN_SELECT:
                case InsertionMode.IN_SELECT_IN_TABLE: {
                    this._insertCharacters(token);
                    break;
                }
                case InsertionMode.IN_TABLE:
                case InsertionMode.IN_TABLE_BODY:
                case InsertionMode.IN_ROW: {
                    characterInTable(this, token);
                    break;
                }
                case InsertionMode.IN_TABLE_TEXT: {
                    characterInTableText(this, token);
                    break;
                }
                case InsertionMode.IN_COLUMN_GROUP: {
                    tokenInColumnGroup(this, token);
                    break;
                }
                case InsertionMode.AFTER_BODY: {
                    tokenAfterBody(this, token);
                    break;
                }
                case InsertionMode.AFTER_AFTER_BODY: {
                    tokenAfterAfterBody(this, token);
                    break;
                }
                // Do nothing
            }
        }
        /** @internal */
        onNullCharacter(token) {
            this.skipNextNewLine = false;
            if (this.tokenizer.inForeignNode) {
                nullCharacterInForeignContent(this, token);
                return;
            }
            switch (this.insertionMode) {
                case InsertionMode.INITIAL: {
                    tokenInInitialMode(this, token);
                    break;
                }
                case InsertionMode.BEFORE_HTML: {
                    tokenBeforeHtml(this, token);
                    break;
                }
                case InsertionMode.BEFORE_HEAD: {
                    tokenBeforeHead(this, token);
                    break;
                }
                case InsertionMode.IN_HEAD: {
                    tokenInHead(this, token);
                    break;
                }
                case InsertionMode.IN_HEAD_NO_SCRIPT: {
                    tokenInHeadNoScript(this, token);
                    break;
                }
                case InsertionMode.AFTER_HEAD: {
                    tokenAfterHead(this, token);
                    break;
                }
                case InsertionMode.TEXT: {
                    this._insertCharacters(token);
                    break;
                }
                case InsertionMode.IN_TABLE:
                case InsertionMode.IN_TABLE_BODY:
                case InsertionMode.IN_ROW: {
                    characterInTable(this, token);
                    break;
                }
                case InsertionMode.IN_COLUMN_GROUP: {
                    tokenInColumnGroup(this, token);
                    break;
                }
                case InsertionMode.AFTER_BODY: {
                    tokenAfterBody(this, token);
                    break;
                }
                case InsertionMode.AFTER_AFTER_BODY: {
                    tokenAfterAfterBody(this, token);
                    break;
                }
                // Do nothing
            }
        }
        /** @internal */
        onComment(token) {
            this.skipNextNewLine = false;
            if (this.currentNotInHTML) {
                appendComment(this, token);
                return;
            }
            switch (this.insertionMode) {
                case InsertionMode.INITIAL:
                case InsertionMode.BEFORE_HTML:
                case InsertionMode.BEFORE_HEAD:
                case InsertionMode.IN_HEAD:
                case InsertionMode.IN_HEAD_NO_SCRIPT:
                case InsertionMode.AFTER_HEAD:
                case InsertionMode.IN_BODY:
                case InsertionMode.IN_TABLE:
                case InsertionMode.IN_CAPTION:
                case InsertionMode.IN_COLUMN_GROUP:
                case InsertionMode.IN_TABLE_BODY:
                case InsertionMode.IN_ROW:
                case InsertionMode.IN_CELL:
                case InsertionMode.IN_SELECT:
                case InsertionMode.IN_SELECT_IN_TABLE:
                case InsertionMode.IN_TEMPLATE:
                case InsertionMode.IN_FRAMESET:
                case InsertionMode.AFTER_FRAMESET: {
                    appendComment(this, token);
                    break;
                }
                case InsertionMode.IN_TABLE_TEXT: {
                    tokenInTableText(this, token);
                    break;
                }
                case InsertionMode.AFTER_BODY: {
                    appendCommentToRootHtmlElement(this, token);
                    break;
                }
                case InsertionMode.AFTER_AFTER_BODY:
                case InsertionMode.AFTER_AFTER_FRAMESET: {
                    appendCommentToDocument(this, token);
                    break;
                }
                // Do nothing
            }
        }
        /** @internal */
        onDoctype(token) {
            this.skipNextNewLine = false;
            switch (this.insertionMode) {
                case InsertionMode.INITIAL: {
                    doctypeInInitialMode(this, token);
                    break;
                }
                case InsertionMode.BEFORE_HEAD:
                case InsertionMode.IN_HEAD:
                case InsertionMode.IN_HEAD_NO_SCRIPT:
                case InsertionMode.AFTER_HEAD: {
                    this._err(token, ERR.misplacedDoctype);
                    break;
                }
                case InsertionMode.IN_TABLE_TEXT: {
                    tokenInTableText(this, token);
                    break;
                }
                // Do nothing
            }
        }
        /** @internal */
        onStartTag(token) {
            this.skipNextNewLine = false;
            this.currentToken = token;
            this._processStartTag(token);
            if (token.selfClosing && !token.ackSelfClosing) {
                this._err(token, ERR.nonVoidHtmlElementStartTagWithTrailingSolidus);
            }
        }
        /**
         * Processes a given start tag.
         *
         * `onStartTag` checks if a self-closing tag was recognized. When a token
         * is moved inbetween multiple insertion modes, this check for self-closing
         * could lead to false positives. To avoid this, `_processStartTag` is used
         * for nested calls.
         *
         * @param token The token to process.
         * @protected
         */
        _processStartTag(token) {
            if (this.shouldProcessStartTagTokenInForeignContent(token)) {
                startTagInForeignContent(this, token);
            }
            else {
                this._startTagOutsideForeignContent(token);
            }
        }
        /** @protected */
        _startTagOutsideForeignContent(token) {
            switch (this.insertionMode) {
                case InsertionMode.INITIAL: {
                    tokenInInitialMode(this, token);
                    break;
                }
                case InsertionMode.BEFORE_HTML: {
                    startTagBeforeHtml(this, token);
                    break;
                }
                case InsertionMode.BEFORE_HEAD: {
                    startTagBeforeHead(this, token);
                    break;
                }
                case InsertionMode.IN_HEAD: {
                    startTagInHead(this, token);
                    break;
                }
                case InsertionMode.IN_HEAD_NO_SCRIPT: {
                    startTagInHeadNoScript(this, token);
                    break;
                }
                case InsertionMode.AFTER_HEAD: {
                    startTagAfterHead(this, token);
                    break;
                }
                case InsertionMode.IN_BODY: {
                    startTagInBody(this, token);
                    break;
                }
                case InsertionMode.IN_TABLE: {
                    startTagInTable(this, token);
                    break;
                }
                case InsertionMode.IN_TABLE_TEXT: {
                    tokenInTableText(this, token);
                    break;
                }
                case InsertionMode.IN_CAPTION: {
                    startTagInCaption(this, token);
                    break;
                }
                case InsertionMode.IN_COLUMN_GROUP: {
                    startTagInColumnGroup(this, token);
                    break;
                }
                case InsertionMode.IN_TABLE_BODY: {
                    startTagInTableBody(this, token);
                    break;
                }
                case InsertionMode.IN_ROW: {
                    startTagInRow(this, token);
                    break;
                }
                case InsertionMode.IN_CELL: {
                    startTagInCell(this, token);
                    break;
                }
                case InsertionMode.IN_SELECT: {
                    startTagInSelect(this, token);
                    break;
                }
                case InsertionMode.IN_SELECT_IN_TABLE: {
                    startTagInSelectInTable(this, token);
                    break;
                }
                case InsertionMode.IN_TEMPLATE: {
                    startTagInTemplate(this, token);
                    break;
                }
                case InsertionMode.AFTER_BODY: {
                    startTagAfterBody(this, token);
                    break;
                }
                case InsertionMode.IN_FRAMESET: {
                    startTagInFrameset(this, token);
                    break;
                }
                case InsertionMode.AFTER_FRAMESET: {
                    startTagAfterFrameset(this, token);
                    break;
                }
                case InsertionMode.AFTER_AFTER_BODY: {
                    startTagAfterAfterBody(this, token);
                    break;
                }
                case InsertionMode.AFTER_AFTER_FRAMESET: {
                    startTagAfterAfterFrameset(this, token);
                    break;
                }
                // Do nothing
            }
        }
        /** @internal */
        onEndTag(token) {
            this.skipNextNewLine = false;
            this.currentToken = token;
            if (this.currentNotInHTML) {
                endTagInForeignContent(this, token);
            }
            else {
                this._endTagOutsideForeignContent(token);
            }
        }
        /** @protected */
        _endTagOutsideForeignContent(token) {
            switch (this.insertionMode) {
                case InsertionMode.INITIAL: {
                    tokenInInitialMode(this, token);
                    break;
                }
                case InsertionMode.BEFORE_HTML: {
                    endTagBeforeHtml(this, token);
                    break;
                }
                case InsertionMode.BEFORE_HEAD: {
                    endTagBeforeHead(this, token);
                    break;
                }
                case InsertionMode.IN_HEAD: {
                    endTagInHead(this, token);
                    break;
                }
                case InsertionMode.IN_HEAD_NO_SCRIPT: {
                    endTagInHeadNoScript(this, token);
                    break;
                }
                case InsertionMode.AFTER_HEAD: {
                    endTagAfterHead(this, token);
                    break;
                }
                case InsertionMode.IN_BODY: {
                    endTagInBody(this, token);
                    break;
                }
                case InsertionMode.TEXT: {
                    endTagInText(this, token);
                    break;
                }
                case InsertionMode.IN_TABLE: {
                    endTagInTable(this, token);
                    break;
                }
                case InsertionMode.IN_TABLE_TEXT: {
                    tokenInTableText(this, token);
                    break;
                }
                case InsertionMode.IN_CAPTION: {
                    endTagInCaption(this, token);
                    break;
                }
                case InsertionMode.IN_COLUMN_GROUP: {
                    endTagInColumnGroup(this, token);
                    break;
                }
                case InsertionMode.IN_TABLE_BODY: {
                    endTagInTableBody(this, token);
                    break;
                }
                case InsertionMode.IN_ROW: {
                    endTagInRow(this, token);
                    break;
                }
                case InsertionMode.IN_CELL: {
                    endTagInCell(this, token);
                    break;
                }
                case InsertionMode.IN_SELECT: {
                    endTagInSelect(this, token);
                    break;
                }
                case InsertionMode.IN_SELECT_IN_TABLE: {
                    endTagInSelectInTable(this, token);
                    break;
                }
                case InsertionMode.IN_TEMPLATE: {
                    endTagInTemplate(this, token);
                    break;
                }
                case InsertionMode.AFTER_BODY: {
                    endTagAfterBody(this, token);
                    break;
                }
                case InsertionMode.IN_FRAMESET: {
                    endTagInFrameset(this, token);
                    break;
                }
                case InsertionMode.AFTER_FRAMESET: {
                    endTagAfterFrameset(this, token);
                    break;
                }
                case InsertionMode.AFTER_AFTER_BODY: {
                    tokenAfterAfterBody(this, token);
                    break;
                }
                // Do nothing
            }
        }
        /** @internal */
        onEof(token) {
            switch (this.insertionMode) {
                case InsertionMode.INITIAL: {
                    tokenInInitialMode(this, token);
                    break;
                }
                case InsertionMode.BEFORE_HTML: {
                    tokenBeforeHtml(this, token);
                    break;
                }
                case InsertionMode.BEFORE_HEAD: {
                    tokenBeforeHead(this, token);
                    break;
                }
                case InsertionMode.IN_HEAD: {
                    tokenInHead(this, token);
                    break;
                }
                case InsertionMode.IN_HEAD_NO_SCRIPT: {
                    tokenInHeadNoScript(this, token);
                    break;
                }
                case InsertionMode.AFTER_HEAD: {
                    tokenAfterHead(this, token);
                    break;
                }
                case InsertionMode.IN_BODY:
                case InsertionMode.IN_TABLE:
                case InsertionMode.IN_CAPTION:
                case InsertionMode.IN_COLUMN_GROUP:
                case InsertionMode.IN_TABLE_BODY:
                case InsertionMode.IN_ROW:
                case InsertionMode.IN_CELL:
                case InsertionMode.IN_SELECT:
                case InsertionMode.IN_SELECT_IN_TABLE: {
                    eofInBody(this, token);
                    break;
                }
                case InsertionMode.TEXT: {
                    eofInText(this, token);
                    break;
                }
                case InsertionMode.IN_TABLE_TEXT: {
                    tokenInTableText(this, token);
                    break;
                }
                case InsertionMode.IN_TEMPLATE: {
                    eofInTemplate(this, token);
                    break;
                }
                case InsertionMode.AFTER_BODY:
                case InsertionMode.IN_FRAMESET:
                case InsertionMode.AFTER_FRAMESET:
                case InsertionMode.AFTER_AFTER_BODY:
                case InsertionMode.AFTER_AFTER_FRAMESET: {
                    stopParsing(this, token);
                    break;
                }
                // Do nothing
            }
        }
        /** @internal */
        onWhitespaceCharacter(token) {
            if (this.skipNextNewLine) {
                this.skipNextNewLine = false;
                if (token.chars.charCodeAt(0) === CODE_POINTS.LINE_FEED) {
                    if (token.chars.length === 1) {
                        return;
                    }
                    token.chars = token.chars.substr(1);
                }
            }
            if (this.tokenizer.inForeignNode) {
                this._insertCharacters(token);
                return;
            }
            switch (this.insertionMode) {
                case InsertionMode.IN_HEAD:
                case InsertionMode.IN_HEAD_NO_SCRIPT:
                case InsertionMode.AFTER_HEAD:
                case InsertionMode.TEXT:
                case InsertionMode.IN_COLUMN_GROUP:
                case InsertionMode.IN_SELECT:
                case InsertionMode.IN_SELECT_IN_TABLE:
                case InsertionMode.IN_FRAMESET:
                case InsertionMode.AFTER_FRAMESET: {
                    this._insertCharacters(token);
                    break;
                }
                case InsertionMode.IN_BODY:
                case InsertionMode.IN_CAPTION:
                case InsertionMode.IN_CELL:
                case InsertionMode.IN_TEMPLATE:
                case InsertionMode.AFTER_BODY:
                case InsertionMode.AFTER_AFTER_BODY:
                case InsertionMode.AFTER_AFTER_FRAMESET: {
                    whitespaceCharacterInBody(this, token);
                    break;
                }
                case InsertionMode.IN_TABLE:
                case InsertionMode.IN_TABLE_BODY:
                case InsertionMode.IN_ROW: {
                    characterInTable(this, token);
                    break;
                }
                case InsertionMode.IN_TABLE_TEXT: {
                    whitespaceCharacterInTableText(this, token);
                    break;
                }
                // Do nothing
            }
        }
    }
    //Adoption agency algorithm
    //(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tree-construction.html#adoptionAgency)
    //------------------------------------------------------------------
    //Steps 5-8 of the algorithm
    function aaObtainFormattingElementEntry(p, token) {
        let formattingElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName(token.tagName);
        if (formattingElementEntry) {
            if (!p.openElements.contains(formattingElementEntry.element)) {
                p.activeFormattingElements.removeEntry(formattingElementEntry);
                formattingElementEntry = null;
            }
            else if (!p.openElements.hasInScope(token.tagID)) {
                formattingElementEntry = null;
            }
        }
        else {
            genericEndTagInBody(p, token);
        }
        return formattingElementEntry;
    }
    //Steps 9 and 10 of the algorithm
    function aaObtainFurthestBlock(p, formattingElementEntry) {
        let furthestBlock = null;
        let idx = p.openElements.stackTop;
        for (; idx >= 0; idx--) {
            const element = p.openElements.items[idx];
            if (element === formattingElementEntry.element) {
                break;
            }
            if (p._isSpecialElement(element, p.openElements.tagIDs[idx])) {
                furthestBlock = element;
            }
        }
        if (!furthestBlock) {
            p.openElements.shortenToLength(Math.max(idx, 0));
            p.activeFormattingElements.removeEntry(formattingElementEntry);
        }
        return furthestBlock;
    }
    //Step 13 of the algorithm
    function aaInnerLoop(p, furthestBlock, formattingElement) {
        let lastElement = furthestBlock;
        let nextElement = p.openElements.getCommonAncestor(furthestBlock);
        for (let i = 0, element = nextElement; element !== formattingElement; i++, element = nextElement) {
            //NOTE: store the next element for the next loop iteration (it may be deleted from the stack by step 9.5)
            nextElement = p.openElements.getCommonAncestor(element);
            const elementEntry = p.activeFormattingElements.getElementEntry(element);
            const counterOverflow = elementEntry && i >= AA_INNER_LOOP_ITER;
            const shouldRemoveFromOpenElements = !elementEntry || counterOverflow;
            if (shouldRemoveFromOpenElements) {
                if (counterOverflow) {
                    p.activeFormattingElements.removeEntry(elementEntry);
                }
                p.openElements.remove(element);
            }
            else {
                element = aaRecreateElementFromEntry(p, elementEntry);
                if (lastElement === furthestBlock) {
                    p.activeFormattingElements.bookmark = elementEntry;
                }
                p.treeAdapter.detachNode(lastElement);
                p.treeAdapter.appendChild(element, lastElement);
                lastElement = element;
            }
        }
        return lastElement;
    }
    //Step 13.7 of the algorithm
    function aaRecreateElementFromEntry(p, elementEntry) {
        const ns = p.treeAdapter.getNamespaceURI(elementEntry.element);
        const newElement = p.treeAdapter.createElement(elementEntry.token.tagName, ns, elementEntry.token.attrs);
        p.openElements.replace(elementEntry.element, newElement);
        elementEntry.element = newElement;
        return newElement;
    }
    //Step 14 of the algorithm
    function aaInsertLastNodeInCommonAncestor(p, commonAncestor, lastElement) {
        const tn = p.treeAdapter.getTagName(commonAncestor);
        const tid = getTagID(tn);
        if (p._isElementCausesFosterParenting(tid)) {
            p._fosterParentElement(lastElement);
        }
        else {
            const ns = p.treeAdapter.getNamespaceURI(commonAncestor);
            if (tid === TAG_ID.TEMPLATE && ns === NS.HTML) {
                commonAncestor = p.treeAdapter.getTemplateContent(commonAncestor);
            }
            p.treeAdapter.appendChild(commonAncestor, lastElement);
        }
    }
    //Steps 15-19 of the algorithm
    function aaReplaceFormattingElement(p, furthestBlock, formattingElementEntry) {
        const ns = p.treeAdapter.getNamespaceURI(formattingElementEntry.element);
        const { token } = formattingElementEntry;
        const newElement = p.treeAdapter.createElement(token.tagName, ns, token.attrs);
        p._adoptNodes(furthestBlock, newElement);
        p.treeAdapter.appendChild(furthestBlock, newElement);
        p.activeFormattingElements.insertElementAfterBookmark(newElement, token);
        p.activeFormattingElements.removeEntry(formattingElementEntry);
        p.openElements.remove(formattingElementEntry.element);
        p.openElements.insertAfter(furthestBlock, newElement, token.tagID);
    }
    //Algorithm entry point
    function callAdoptionAgency(p, token) {
        for (let i = 0; i < AA_OUTER_LOOP_ITER; i++) {
            const formattingElementEntry = aaObtainFormattingElementEntry(p, token);
            if (!formattingElementEntry) {
                break;
            }
            const furthestBlock = aaObtainFurthestBlock(p, formattingElementEntry);
            if (!furthestBlock) {
                break;
            }
            p.activeFormattingElements.bookmark = formattingElementEntry;
            const lastElement = aaInnerLoop(p, furthestBlock, formattingElementEntry.element);
            const commonAncestor = p.openElements.getCommonAncestor(formattingElementEntry.element);
            p.treeAdapter.detachNode(lastElement);
            if (commonAncestor)
                aaInsertLastNodeInCommonAncestor(p, commonAncestor, lastElement);
            aaReplaceFormattingElement(p, furthestBlock, formattingElementEntry);
        }
    }
    //Generic token handlers
    //------------------------------------------------------------------
    function appendComment(p, token) {
        p._appendCommentNode(token, p.openElements.currentTmplContentOrNode);
    }
    function appendCommentToRootHtmlElement(p, token) {
        p._appendCommentNode(token, p.openElements.items[0]);
    }
    function appendCommentToDocument(p, token) {
        p._appendCommentNode(token, p.document);
    }
    function stopParsing(p, token) {
        p.stopped = true;
        // NOTE: Set end locations for elements that remain on the open element stack.
        if (token.location) {
            // NOTE: If we are not in a fragment, `html` and `body` will stay on the stack.
            // This is a problem, as we might overwrite their end position here.
            const target = p.fragmentContext ? 0 : 2;
            for (let i = p.openElements.stackTop; i >= target; i--) {
                p._setEndLocation(p.openElements.items[i], token);
            }
            // Handle `html` and `body`
            if (!p.fragmentContext && p.openElements.stackTop >= 0) {
                const htmlElement = p.openElements.items[0];
                const htmlLocation = p.treeAdapter.getNodeSourceCodeLocation(htmlElement);
                if (htmlLocation && !htmlLocation.endTag) {
                    p._setEndLocation(htmlElement, token);
                    if (p.openElements.stackTop >= 1) {
                        const bodyElement = p.openElements.items[1];
                        const bodyLocation = p.treeAdapter.getNodeSourceCodeLocation(bodyElement);
                        if (bodyLocation && !bodyLocation.endTag) {
                            p._setEndLocation(bodyElement, token);
                        }
                    }
                }
            }
        }
    }
    // The "initial" insertion mode
    //------------------------------------------------------------------
    function doctypeInInitialMode(p, token) {
        p._setDocumentType(token);
        const mode = token.forceQuirks ? DOCUMENT_MODE.QUIRKS : getDocumentMode(token);
        if (!isConforming(token)) {
            p._err(token, ERR.nonConformingDoctype);
        }
        p.treeAdapter.setDocumentMode(p.document, mode);
        p.insertionMode = InsertionMode.BEFORE_HTML;
    }
    function tokenInInitialMode(p, token) {
        p._err(token, ERR.missingDoctype, true);
        p.treeAdapter.setDocumentMode(p.document, DOCUMENT_MODE.QUIRKS);
        p.insertionMode = InsertionMode.BEFORE_HTML;
        p._processToken(token);
    }
    // The "before html" insertion mode
    //------------------------------------------------------------------
    function startTagBeforeHtml(p, token) {
        if (token.tagID === TAG_ID.HTML) {
            p._insertElement(token, NS.HTML);
            p.insertionMode = InsertionMode.BEFORE_HEAD;
        }
        else {
            tokenBeforeHtml(p, token);
        }
    }
    function endTagBeforeHtml(p, token) {
        const tn = token.tagID;
        if (tn === TAG_ID.HTML || tn === TAG_ID.HEAD || tn === TAG_ID.BODY || tn === TAG_ID.BR) {
            tokenBeforeHtml(p, token);
        }
    }
    function tokenBeforeHtml(p, token) {
        p._insertFakeRootElement();
        p.insertionMode = InsertionMode.BEFORE_HEAD;
        p._processToken(token);
    }
    // The "before head" insertion mode
    //------------------------------------------------------------------
    function startTagBeforeHead(p, token) {
        switch (token.tagID) {
            case TAG_ID.HTML: {
                startTagInBody(p, token);
                break;
            }
            case TAG_ID.HEAD: {
                p._insertElement(token, NS.HTML);
                p.headElement = p.openElements.current;
                p.insertionMode = InsertionMode.IN_HEAD;
                break;
            }
            default: {
                tokenBeforeHead(p, token);
            }
        }
    }
    function endTagBeforeHead(p, token) {
        const tn = token.tagID;
        if (tn === TAG_ID.HEAD || tn === TAG_ID.BODY || tn === TAG_ID.HTML || tn === TAG_ID.BR) {
            tokenBeforeHead(p, token);
        }
        else {
            p._err(token, ERR.endTagWithoutMatchingOpenElement);
        }
    }
    function tokenBeforeHead(p, token) {
        p._insertFakeElement(TAG_NAMES.HEAD, TAG_ID.HEAD);
        p.headElement = p.openElements.current;
        p.insertionMode = InsertionMode.IN_HEAD;
        p._processToken(token);
    }
    // The "in head" insertion mode
    //------------------------------------------------------------------
    function startTagInHead(p, token) {
        switch (token.tagID) {
            case TAG_ID.HTML: {
                startTagInBody(p, token);
                break;
            }
            case TAG_ID.BASE:
            case TAG_ID.BASEFONT:
            case TAG_ID.BGSOUND:
            case TAG_ID.LINK:
            case TAG_ID.META: {
                p._appendElement(token, NS.HTML);
                token.ackSelfClosing = true;
                break;
            }
            case TAG_ID.TITLE: {
                p._switchToTextParsing(token, TokenizerMode.RCDATA);
                break;
            }
            case TAG_ID.NOSCRIPT: {
                if (p.options.scriptingEnabled) {
                    p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
                }
                else {
                    p._insertElement(token, NS.HTML);
                    p.insertionMode = InsertionMode.IN_HEAD_NO_SCRIPT;
                }
                break;
            }
            case TAG_ID.NOFRAMES:
            case TAG_ID.STYLE: {
                p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
                break;
            }
            case TAG_ID.SCRIPT: {
                p._switchToTextParsing(token, TokenizerMode.SCRIPT_DATA);
                break;
            }
            case TAG_ID.TEMPLATE: {
                p._insertTemplate(token);
                p.activeFormattingElements.insertMarker();
                p.framesetOk = false;
                p.insertionMode = InsertionMode.IN_TEMPLATE;
                p.tmplInsertionModeStack.unshift(InsertionMode.IN_TEMPLATE);
                break;
            }
            case TAG_ID.HEAD: {
                p._err(token, ERR.misplacedStartTagForHeadElement);
                break;
            }
            default: {
                tokenInHead(p, token);
            }
        }
    }
    function endTagInHead(p, token) {
        switch (token.tagID) {
            case TAG_ID.HEAD: {
                p.openElements.pop();
                p.insertionMode = InsertionMode.AFTER_HEAD;
                break;
            }
            case TAG_ID.BODY:
            case TAG_ID.BR:
            case TAG_ID.HTML: {
                tokenInHead(p, token);
                break;
            }
            case TAG_ID.TEMPLATE: {
                templateEndTagInHead(p, token);
                break;
            }
            default: {
                p._err(token, ERR.endTagWithoutMatchingOpenElement);
            }
        }
    }
    function templateEndTagInHead(p, token) {
        if (p.openElements.tmplCount > 0) {
            p.openElements.generateImpliedEndTagsThoroughly();
            if (p.openElements.currentTagId !== TAG_ID.TEMPLATE) {
                p._err(token, ERR.closingOfElementWithOpenChildElements);
            }
            p.openElements.popUntilTagNamePopped(TAG_ID.TEMPLATE);
            p.activeFormattingElements.clearToLastMarker();
            p.tmplInsertionModeStack.shift();
            p._resetInsertionMode();
        }
        else {
            p._err(token, ERR.endTagWithoutMatchingOpenElement);
        }
    }
    function tokenInHead(p, token) {
        p.openElements.pop();
        p.insertionMode = InsertionMode.AFTER_HEAD;
        p._processToken(token);
    }
    // The "in head no script" insertion mode
    //------------------------------------------------------------------
    function startTagInHeadNoScript(p, token) {
        switch (token.tagID) {
            case TAG_ID.HTML: {
                startTagInBody(p, token);
                break;
            }
            case TAG_ID.BASEFONT:
            case TAG_ID.BGSOUND:
            case TAG_ID.HEAD:
            case TAG_ID.LINK:
            case TAG_ID.META:
            case TAG_ID.NOFRAMES:
            case TAG_ID.STYLE: {
                startTagInHead(p, token);
                break;
            }
            case TAG_ID.NOSCRIPT: {
                p._err(token, ERR.nestedNoscriptInHead);
                break;
            }
            default: {
                tokenInHeadNoScript(p, token);
            }
        }
    }
    function endTagInHeadNoScript(p, token) {
        switch (token.tagID) {
            case TAG_ID.NOSCRIPT: {
                p.openElements.pop();
                p.insertionMode = InsertionMode.IN_HEAD;
                break;
            }
            case TAG_ID.BR: {
                tokenInHeadNoScript(p, token);
                break;
            }
            default: {
                p._err(token, ERR.endTagWithoutMatchingOpenElement);
            }
        }
    }
    function tokenInHeadNoScript(p, token) {
        const errCode = token.type === TokenType.EOF ? ERR.openElementsLeftAfterEof : ERR.disallowedContentInNoscriptInHead;
        p._err(token, errCode);
        p.openElements.pop();
        p.insertionMode = InsertionMode.IN_HEAD;
        p._processToken(token);
    }
    // The "after head" insertion mode
    //------------------------------------------------------------------
    function startTagAfterHead(p, token) {
        switch (token.tagID) {
            case TAG_ID.HTML: {
                startTagInBody(p, token);
                break;
            }
            case TAG_ID.BODY: {
                p._insertElement(token, NS.HTML);
                p.framesetOk = false;
                p.insertionMode = InsertionMode.IN_BODY;
                break;
            }
            case TAG_ID.FRAMESET: {
                p._insertElement(token, NS.HTML);
                p.insertionMode = InsertionMode.IN_FRAMESET;
                break;
            }
            case TAG_ID.BASE:
            case TAG_ID.BASEFONT:
            case TAG_ID.BGSOUND:
            case TAG_ID.LINK:
            case TAG_ID.META:
            case TAG_ID.NOFRAMES:
            case TAG_ID.SCRIPT:
            case TAG_ID.STYLE:
            case TAG_ID.TEMPLATE:
            case TAG_ID.TITLE: {
                p._err(token, ERR.abandonedHeadElementChild);
                p.openElements.push(p.headElement, TAG_ID.HEAD);
                startTagInHead(p, token);
                p.openElements.remove(p.headElement);
                break;
            }
            case TAG_ID.HEAD: {
                p._err(token, ERR.misplacedStartTagForHeadElement);
                break;
            }
            default: {
                tokenAfterHead(p, token);
            }
        }
    }
    function endTagAfterHead(p, token) {
        switch (token.tagID) {
            case TAG_ID.BODY:
            case TAG_ID.HTML:
            case TAG_ID.BR: {
                tokenAfterHead(p, token);
                break;
            }
            case TAG_ID.TEMPLATE: {
                templateEndTagInHead(p, token);
                break;
            }
            default: {
                p._err(token, ERR.endTagWithoutMatchingOpenElement);
            }
        }
    }
    function tokenAfterHead(p, token) {
        p._insertFakeElement(TAG_NAMES.BODY, TAG_ID.BODY);
        p.insertionMode = InsertionMode.IN_BODY;
        modeInBody(p, token);
    }
    // The "in body" insertion mode
    //------------------------------------------------------------------
    function modeInBody(p, token) {
        switch (token.type) {
            case TokenType.CHARACTER: {
                characterInBody(p, token);
                break;
            }
            case TokenType.WHITESPACE_CHARACTER: {
                whitespaceCharacterInBody(p, token);
                break;
            }
            case TokenType.COMMENT: {
                appendComment(p, token);
                break;
            }
            case TokenType.START_TAG: {
                startTagInBody(p, token);
                break;
            }
            case TokenType.END_TAG: {
                endTagInBody(p, token);
                break;
            }
            case TokenType.EOF: {
                eofInBody(p, token);
                break;
            }
            // Do nothing
        }
    }
    function whitespaceCharacterInBody(p, token) {
        p._reconstructActiveFormattingElements();
        p._insertCharacters(token);
    }
    function characterInBody(p, token) {
        p._reconstructActiveFormattingElements();
        p._insertCharacters(token);
        p.framesetOk = false;
    }
    function htmlStartTagInBody(p, token) {
        if (p.openElements.tmplCount === 0) {
            p.treeAdapter.adoptAttributes(p.openElements.items[0], token.attrs);
        }
    }
    function bodyStartTagInBody(p, token) {
        const bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();
        if (bodyElement && p.openElements.tmplCount === 0) {
            p.framesetOk = false;
            p.treeAdapter.adoptAttributes(bodyElement, token.attrs);
        }
    }
    function framesetStartTagInBody(p, token) {
        const bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();
        if (p.framesetOk && bodyElement) {
            p.treeAdapter.detachNode(bodyElement);
            p.openElements.popAllUpToHtmlElement();
            p._insertElement(token, NS.HTML);
            p.insertionMode = InsertionMode.IN_FRAMESET;
        }
    }
    function addressStartTagInBody(p, token) {
        if (p.openElements.hasInButtonScope(TAG_ID.P)) {
            p._closePElement();
        }
        p._insertElement(token, NS.HTML);
    }
    function numberedHeaderStartTagInBody(p, token) {
        if (p.openElements.hasInButtonScope(TAG_ID.P)) {
            p._closePElement();
        }
        if (p.openElements.currentTagId !== undefined && NUMBERED_HEADERS.has(p.openElements.currentTagId)) {
            p.openElements.pop();
        }
        p._insertElement(token, NS.HTML);
    }
    function preStartTagInBody(p, token) {
        if (p.openElements.hasInButtonScope(TAG_ID.P)) {
            p._closePElement();
        }
        p._insertElement(token, NS.HTML);
        //NOTE: If the next token is a U+000A LINE FEED (LF) character token, then ignore that token and move
        //on to the next one. (Newlines at the start of pre blocks are ignored as an authoring convenience.)
        p.skipNextNewLine = true;
        p.framesetOk = false;
    }
    function formStartTagInBody(p, token) {
        const inTemplate = p.openElements.tmplCount > 0;
        if (!p.formElement || inTemplate) {
            if (p.openElements.hasInButtonScope(TAG_ID.P)) {
                p._closePElement();
            }
            p._insertElement(token, NS.HTML);
            if (!inTemplate) {
                p.formElement = p.openElements.current;
            }
        }
    }
    function listItemStartTagInBody(p, token) {
        p.framesetOk = false;
        const tn = token.tagID;
        for (let i = p.openElements.stackTop; i >= 0; i--) {
            const elementId = p.openElements.tagIDs[i];
            if ((tn === TAG_ID.LI && elementId === TAG_ID.LI) ||
                ((tn === TAG_ID.DD || tn === TAG_ID.DT) && (elementId === TAG_ID.DD || elementId === TAG_ID.DT))) {
                p.openElements.generateImpliedEndTagsWithExclusion(elementId);
                p.openElements.popUntilTagNamePopped(elementId);
                break;
            }
            if (elementId !== TAG_ID.ADDRESS &&
                elementId !== TAG_ID.DIV &&
                elementId !== TAG_ID.P &&
                p._isSpecialElement(p.openElements.items[i], elementId)) {
                break;
            }
        }
        if (p.openElements.hasInButtonScope(TAG_ID.P)) {
            p._closePElement();
        }
        p._insertElement(token, NS.HTML);
    }
    function plaintextStartTagInBody(p, token) {
        if (p.openElements.hasInButtonScope(TAG_ID.P)) {
            p._closePElement();
        }
        p._insertElement(token, NS.HTML);
        p.tokenizer.state = TokenizerMode.PLAINTEXT;
    }
    function buttonStartTagInBody(p, token) {
        if (p.openElements.hasInScope(TAG_ID.BUTTON)) {
            p.openElements.generateImpliedEndTags();
            p.openElements.popUntilTagNamePopped(TAG_ID.BUTTON);
        }
        p._reconstructActiveFormattingElements();
        p._insertElement(token, NS.HTML);
        p.framesetOk = false;
    }
    function aStartTagInBody(p, token) {
        const activeElementEntry = p.activeFormattingElements.getElementEntryInScopeWithTagName(TAG_NAMES.A);
        if (activeElementEntry) {
            callAdoptionAgency(p, token);
            p.openElements.remove(activeElementEntry.element);
            p.activeFormattingElements.removeEntry(activeElementEntry);
        }
        p._reconstructActiveFormattingElements();
        p._insertElement(token, NS.HTML);
        p.activeFormattingElements.pushElement(p.openElements.current, token);
    }
    function bStartTagInBody(p, token) {
        p._reconstructActiveFormattingElements();
        p._insertElement(token, NS.HTML);
        p.activeFormattingElements.pushElement(p.openElements.current, token);
    }
    function nobrStartTagInBody(p, token) {
        p._reconstructActiveFormattingElements();
        if (p.openElements.hasInScope(TAG_ID.NOBR)) {
            callAdoptionAgency(p, token);
            p._reconstructActiveFormattingElements();
        }
        p._insertElement(token, NS.HTML);
        p.activeFormattingElements.pushElement(p.openElements.current, token);
    }
    function appletStartTagInBody(p, token) {
        p._reconstructActiveFormattingElements();
        p._insertElement(token, NS.HTML);
        p.activeFormattingElements.insertMarker();
        p.framesetOk = false;
    }
    function tableStartTagInBody(p, token) {
        if (p.treeAdapter.getDocumentMode(p.document) !== DOCUMENT_MODE.QUIRKS && p.openElements.hasInButtonScope(TAG_ID.P)) {
            p._closePElement();
        }
        p._insertElement(token, NS.HTML);
        p.framesetOk = false;
        p.insertionMode = InsertionMode.IN_TABLE;
    }
    function areaStartTagInBody(p, token) {
        p._reconstructActiveFormattingElements();
        p._appendElement(token, NS.HTML);
        p.framesetOk = false;
        token.ackSelfClosing = true;
    }
    function isHiddenInput(token) {
        const inputType = getTokenAttr(token, ATTRS.TYPE);
        return inputType != null && inputType.toLowerCase() === HIDDEN_INPUT_TYPE;
    }
    function inputStartTagInBody(p, token) {
        p._reconstructActiveFormattingElements();
        p._appendElement(token, NS.HTML);
        if (!isHiddenInput(token)) {
            p.framesetOk = false;
        }
        token.ackSelfClosing = true;
    }
    function paramStartTagInBody(p, token) {
        p._appendElement(token, NS.HTML);
        token.ackSelfClosing = true;
    }
    function hrStartTagInBody(p, token) {
        if (p.openElements.hasInButtonScope(TAG_ID.P)) {
            p._closePElement();
        }
        p._appendElement(token, NS.HTML);
        p.framesetOk = false;
        token.ackSelfClosing = true;
    }
    function imageStartTagInBody(p, token) {
        token.tagName = TAG_NAMES.IMG;
        token.tagID = TAG_ID.IMG;
        areaStartTagInBody(p, token);
    }
    function textareaStartTagInBody(p, token) {
        p._insertElement(token, NS.HTML);
        //NOTE: If the next token is a U+000A LINE FEED (LF) character token, then ignore that token and move
        //on to the next one. (Newlines at the start of textarea elements are ignored as an authoring convenience.)
        p.skipNextNewLine = true;
        p.tokenizer.state = TokenizerMode.RCDATA;
        p.originalInsertionMode = p.insertionMode;
        p.framesetOk = false;
        p.insertionMode = InsertionMode.TEXT;
    }
    function xmpStartTagInBody(p, token) {
        if (p.openElements.hasInButtonScope(TAG_ID.P)) {
            p._closePElement();
        }
        p._reconstructActiveFormattingElements();
        p.framesetOk = false;
        p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
    }
    function iframeStartTagInBody(p, token) {
        p.framesetOk = false;
        p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
    }
    //NOTE: here we assume that we always act as a user agent with enabled plugins/frames, so we parse
    //<noembed>/<noframes> as rawtext.
    function rawTextStartTagInBody(p, token) {
        p._switchToTextParsing(token, TokenizerMode.RAWTEXT);
    }
    function selectStartTagInBody(p, token) {
        p._reconstructActiveFormattingElements();
        p._insertElement(token, NS.HTML);
        p.framesetOk = false;
        p.insertionMode =
            p.insertionMode === InsertionMode.IN_TABLE ||
                p.insertionMode === InsertionMode.IN_CAPTION ||
                p.insertionMode === InsertionMode.IN_TABLE_BODY ||
                p.insertionMode === InsertionMode.IN_ROW ||
                p.insertionMode === InsertionMode.IN_CELL
                ? InsertionMode.IN_SELECT_IN_TABLE
                : InsertionMode.IN_SELECT;
    }
    function optgroupStartTagInBody(p, token) {
        if (p.openElements.currentTagId === TAG_ID.OPTION) {
            p.openElements.pop();
        }
        p._reconstructActiveFormattingElements();
        p._insertElement(token, NS.HTML);
    }
    function rbStartTagInBody(p, token) {
        if (p.openElements.hasInScope(TAG_ID.RUBY)) {
            p.openElements.generateImpliedEndTags();
        }
        p._insertElement(token, NS.HTML);
    }
    function rtStartTagInBody(p, token) {
        if (p.openElements.hasInScope(TAG_ID.RUBY)) {
            p.openElements.generateImpliedEndTagsWithExclusion(TAG_ID.RTC);
        }
        p._insertElement(token, NS.HTML);
    }
    function mathStartTagInBody(p, token) {
        p._reconstructActiveFormattingElements();
        adjustTokenMathMLAttrs(token);
        adjustTokenXMLAttrs(token);
        if (token.selfClosing) {
            p._appendElement(token, NS.MATHML);
        }
        else {
            p._insertElement(token, NS.MATHML);
        }
        token.ackSelfClosing = true;
    }
    function svgStartTagInBody(p, token) {
        p._reconstructActiveFormattingElements();
        adjustTokenSVGAttrs(token);
        adjustTokenXMLAttrs(token);
        if (token.selfClosing) {
            p._appendElement(token, NS.SVG);
        }
        else {
            p._insertElement(token, NS.SVG);
        }
        token.ackSelfClosing = true;
    }
    function genericStartTagInBody(p, token) {
        p._reconstructActiveFormattingElements();
        p._insertElement(token, NS.HTML);
    }
    function startTagInBody(p, token) {
        switch (token.tagID) {
            case TAG_ID.I:
            case TAG_ID.S:
            case TAG_ID.B:
            case TAG_ID.U:
            case TAG_ID.EM:
            case TAG_ID.TT:
            case TAG_ID.BIG:
            case TAG_ID.CODE:
            case TAG_ID.FONT:
            case TAG_ID.SMALL:
            case TAG_ID.STRIKE:
            case TAG_ID.STRONG: {
                bStartTagInBody(p, token);
                break;
            }
            case TAG_ID.A: {
                aStartTagInBody(p, token);
                break;
            }
            case TAG_ID.H1:
            case TAG_ID.H2:
            case TAG_ID.H3:
            case TAG_ID.H4:
            case TAG_ID.H5:
            case TAG_ID.H6: {
                numberedHeaderStartTagInBody(p, token);
                break;
            }
            case TAG_ID.P:
            case TAG_ID.DL:
            case TAG_ID.OL:
            case TAG_ID.UL:
            case TAG_ID.DIV:
            case TAG_ID.DIR:
            case TAG_ID.NAV:
            case TAG_ID.MAIN:
            case TAG_ID.MENU:
            case TAG_ID.ASIDE:
            case TAG_ID.CENTER:
            case TAG_ID.FIGURE:
            case TAG_ID.FOOTER:
            case TAG_ID.HEADER:
            case TAG_ID.HGROUP:
            case TAG_ID.DIALOG:
            case TAG_ID.DETAILS:
            case TAG_ID.ADDRESS:
            case TAG_ID.ARTICLE:
            case TAG_ID.SEARCH:
            case TAG_ID.SECTION:
            case TAG_ID.SUMMARY:
            case TAG_ID.FIELDSET:
            case TAG_ID.BLOCKQUOTE:
            case TAG_ID.FIGCAPTION: {
                addressStartTagInBody(p, token);
                break;
            }
            case TAG_ID.LI:
            case TAG_ID.DD:
            case TAG_ID.DT: {
                listItemStartTagInBody(p, token);
                break;
            }
            case TAG_ID.BR:
            case TAG_ID.IMG:
            case TAG_ID.WBR:
            case TAG_ID.AREA:
            case TAG_ID.EMBED:
            case TAG_ID.KEYGEN: {
                areaStartTagInBody(p, token);
                break;
            }
            case TAG_ID.HR: {
                hrStartTagInBody(p, token);
                break;
            }
            case TAG_ID.RB:
            case TAG_ID.RTC: {
                rbStartTagInBody(p, token);
                break;
            }
            case TAG_ID.RT:
            case TAG_ID.RP: {
                rtStartTagInBody(p, token);
                break;
            }
            case TAG_ID.PRE:
            case TAG_ID.LISTING: {
                preStartTagInBody(p, token);
                break;
            }
            case TAG_ID.XMP: {
                xmpStartTagInBody(p, token);
                break;
            }
            case TAG_ID.SVG: {
                svgStartTagInBody(p, token);
                break;
            }
            case TAG_ID.HTML: {
                htmlStartTagInBody(p, token);
                break;
            }
            case TAG_ID.BASE:
            case TAG_ID.LINK:
            case TAG_ID.META:
            case TAG_ID.STYLE:
            case TAG_ID.TITLE:
            case TAG_ID.SCRIPT:
            case TAG_ID.BGSOUND:
            case TAG_ID.BASEFONT:
            case TAG_ID.TEMPLATE: {
                startTagInHead(p, token);
                break;
            }
            case TAG_ID.BODY: {
                bodyStartTagInBody(p, token);
                break;
            }
            case TAG_ID.FORM: {
                formStartTagInBody(p, token);
                break;
            }
            case TAG_ID.NOBR: {
                nobrStartTagInBody(p, token);
                break;
            }
            case TAG_ID.MATH: {
                mathStartTagInBody(p, token);
                break;
            }
            case TAG_ID.TABLE: {
                tableStartTagInBody(p, token);
                break;
            }
            case TAG_ID.INPUT: {
                inputStartTagInBody(p, token);
                break;
            }
            case TAG_ID.PARAM:
            case TAG_ID.TRACK:
            case TAG_ID.SOURCE: {
                paramStartTagInBody(p, token);
                break;
            }
            case TAG_ID.IMAGE: {
                imageStartTagInBody(p, token);
                break;
            }
            case TAG_ID.BUTTON: {
                buttonStartTagInBody(p, token);
                break;
            }
            case TAG_ID.APPLET:
            case TAG_ID.OBJECT:
            case TAG_ID.MARQUEE: {
                appletStartTagInBody(p, token);
                break;
            }
            case TAG_ID.IFRAME: {
                iframeStartTagInBody(p, token);
                break;
            }
            case TAG_ID.SELECT: {
                selectStartTagInBody(p, token);
                break;
            }
            case TAG_ID.OPTION:
            case TAG_ID.OPTGROUP: {
                optgroupStartTagInBody(p, token);
                break;
            }
            case TAG_ID.NOEMBED:
            case TAG_ID.NOFRAMES: {
                rawTextStartTagInBody(p, token);
                break;
            }
            case TAG_ID.FRAMESET: {
                framesetStartTagInBody(p, token);
                break;
            }
            case TAG_ID.TEXTAREA: {
                textareaStartTagInBody(p, token);
                break;
            }
            case TAG_ID.NOSCRIPT: {
                if (p.options.scriptingEnabled) {
                    rawTextStartTagInBody(p, token);
                }
                else {
                    genericStartTagInBody(p, token);
                }
                break;
            }
            case TAG_ID.PLAINTEXT: {
                plaintextStartTagInBody(p, token);
                break;
            }
            case TAG_ID.COL:
            case TAG_ID.TH:
            case TAG_ID.TD:
            case TAG_ID.TR:
            case TAG_ID.HEAD:
            case TAG_ID.FRAME:
            case TAG_ID.TBODY:
            case TAG_ID.TFOOT:
            case TAG_ID.THEAD:
            case TAG_ID.CAPTION:
            case TAG_ID.COLGROUP: {
                // Ignore token
                break;
            }
            default: {
                genericStartTagInBody(p, token);
            }
        }
    }
    function bodyEndTagInBody(p, token) {
        if (p.openElements.hasInScope(TAG_ID.BODY)) {
            p.insertionMode = InsertionMode.AFTER_BODY;
            //NOTE: <body> is never popped from the stack, so we need to updated
            //the end location explicitly.
            if (p.options.sourceCodeLocationInfo) {
                const bodyElement = p.openElements.tryPeekProperlyNestedBodyElement();
                if (bodyElement) {
                    p._setEndLocation(bodyElement, token);
                }
            }
        }
    }
    function htmlEndTagInBody(p, token) {
        if (p.openElements.hasInScope(TAG_ID.BODY)) {
            p.insertionMode = InsertionMode.AFTER_BODY;
            endTagAfterBody(p, token);
        }
    }
    function addressEndTagInBody(p, token) {
        const tn = token.tagID;
        if (p.openElements.hasInScope(tn)) {
            p.openElements.generateImpliedEndTags();
            p.openElements.popUntilTagNamePopped(tn);
        }
    }
    function formEndTagInBody(p) {
        const inTemplate = p.openElements.tmplCount > 0;
        const { formElement } = p;
        if (!inTemplate) {
            p.formElement = null;
        }
        if ((formElement || inTemplate) && p.openElements.hasInScope(TAG_ID.FORM)) {
            p.openElements.generateImpliedEndTags();
            if (inTemplate) {
                p.openElements.popUntilTagNamePopped(TAG_ID.FORM);
            }
            else if (formElement) {
                p.openElements.remove(formElement);
            }
        }
    }
    function pEndTagInBody(p) {
        if (!p.openElements.hasInButtonScope(TAG_ID.P)) {
            p._insertFakeElement(TAG_NAMES.P, TAG_ID.P);
        }
        p._closePElement();
    }
    function liEndTagInBody(p) {
        if (p.openElements.hasInListItemScope(TAG_ID.LI)) {
            p.openElements.generateImpliedEndTagsWithExclusion(TAG_ID.LI);
            p.openElements.popUntilTagNamePopped(TAG_ID.LI);
        }
    }
    function ddEndTagInBody(p, token) {
        const tn = token.tagID;
        if (p.openElements.hasInScope(tn)) {
            p.openElements.generateImpliedEndTagsWithExclusion(tn);
            p.openElements.popUntilTagNamePopped(tn);
        }
    }
    function numberedHeaderEndTagInBody(p) {
        if (p.openElements.hasNumberedHeaderInScope()) {
            p.openElements.generateImpliedEndTags();
            p.openElements.popUntilNumberedHeaderPopped();
        }
    }
    function appletEndTagInBody(p, token) {
        const tn = token.tagID;
        if (p.openElements.hasInScope(tn)) {
            p.openElements.generateImpliedEndTags();
            p.openElements.popUntilTagNamePopped(tn);
            p.activeFormattingElements.clearToLastMarker();
        }
    }
    function brEndTagInBody(p) {
        p._reconstructActiveFormattingElements();
        p._insertFakeElement(TAG_NAMES.BR, TAG_ID.BR);
        p.openElements.pop();
        p.framesetOk = false;
    }
    function genericEndTagInBody(p, token) {
        const tn = token.tagName;
        const tid = token.tagID;
        for (let i = p.openElements.stackTop; i > 0; i--) {
            const element = p.openElements.items[i];
            const elementId = p.openElements.tagIDs[i];
            // Compare the tag name here, as the tag might not be a known tag with an ID.
            if (tid === elementId && (tid !== TAG_ID.UNKNOWN || p.treeAdapter.getTagName(element) === tn)) {
                p.openElements.generateImpliedEndTagsWithExclusion(tid);
                if (p.openElements.stackTop >= i)
                    p.openElements.shortenToLength(i);
                break;
            }
            if (p._isSpecialElement(element, elementId)) {
                break;
            }
        }
    }
    function endTagInBody(p, token) {
        switch (token.tagID) {
            case TAG_ID.A:
            case TAG_ID.B:
            case TAG_ID.I:
            case TAG_ID.S:
            case TAG_ID.U:
            case TAG_ID.EM:
            case TAG_ID.TT:
            case TAG_ID.BIG:
            case TAG_ID.CODE:
            case TAG_ID.FONT:
            case TAG_ID.NOBR:
            case TAG_ID.SMALL:
            case TAG_ID.STRIKE:
            case TAG_ID.STRONG: {
                callAdoptionAgency(p, token);
                break;
            }
            case TAG_ID.P: {
                pEndTagInBody(p);
                break;
            }
            case TAG_ID.DL:
            case TAG_ID.UL:
            case TAG_ID.OL:
            case TAG_ID.DIR:
            case TAG_ID.DIV:
            case TAG_ID.NAV:
            case TAG_ID.PRE:
            case TAG_ID.MAIN:
            case TAG_ID.MENU:
            case TAG_ID.ASIDE:
            case TAG_ID.BUTTON:
            case TAG_ID.CENTER:
            case TAG_ID.FIGURE:
            case TAG_ID.FOOTER:
            case TAG_ID.HEADER:
            case TAG_ID.HGROUP:
            case TAG_ID.DIALOG:
            case TAG_ID.ADDRESS:
            case TAG_ID.ARTICLE:
            case TAG_ID.DETAILS:
            case TAG_ID.SEARCH:
            case TAG_ID.SECTION:
            case TAG_ID.SUMMARY:
            case TAG_ID.LISTING:
            case TAG_ID.FIELDSET:
            case TAG_ID.BLOCKQUOTE:
            case TAG_ID.FIGCAPTION: {
                addressEndTagInBody(p, token);
                break;
            }
            case TAG_ID.LI: {
                liEndTagInBody(p);
                break;
            }
            case TAG_ID.DD:
            case TAG_ID.DT: {
                ddEndTagInBody(p, token);
                break;
            }
            case TAG_ID.H1:
            case TAG_ID.H2:
            case TAG_ID.H3:
            case TAG_ID.H4:
            case TAG_ID.H5:
            case TAG_ID.H6: {
                numberedHeaderEndTagInBody(p);
                break;
            }
            case TAG_ID.BR: {
                brEndTagInBody(p);
                break;
            }
            case TAG_ID.BODY: {
                bodyEndTagInBody(p, token);
                break;
            }
            case TAG_ID.HTML: {
                htmlEndTagInBody(p, token);
                break;
            }
            case TAG_ID.FORM: {
                formEndTagInBody(p);
                break;
            }
            case TAG_ID.APPLET:
            case TAG_ID.OBJECT:
            case TAG_ID.MARQUEE: {
                appletEndTagInBody(p, token);
                break;
            }
            case TAG_ID.TEMPLATE: {
                templateEndTagInHead(p, token);
                break;
            }
            default: {
                genericEndTagInBody(p, token);
            }
        }
    }
    function eofInBody(p, token) {
        if (p.tmplInsertionModeStack.length > 0) {
            eofInTemplate(p, token);
        }
        else {
            stopParsing(p, token);
        }
    }
    // The "text" insertion mode
    //------------------------------------------------------------------
    function endTagInText(p, token) {
        var _a;
        if (token.tagID === TAG_ID.SCRIPT) {
            (_a = p.scriptHandler) === null || _a === void 0 ? void 0 : _a.call(p, p.openElements.current);
        }
        p.openElements.pop();
        p.insertionMode = p.originalInsertionMode;
    }
    function eofInText(p, token) {
        p._err(token, ERR.eofInElementThatCanContainOnlyText);
        p.openElements.pop();
        p.insertionMode = p.originalInsertionMode;
        p.onEof(token);
    }
    // The "in table" insertion mode
    //------------------------------------------------------------------
    function characterInTable(p, token) {
        if (p.openElements.currentTagId !== undefined && TABLE_STRUCTURE_TAGS.has(p.openElements.currentTagId)) {
            p.pendingCharacterTokens.length = 0;
            p.hasNonWhitespacePendingCharacterToken = false;
            p.originalInsertionMode = p.insertionMode;
            p.insertionMode = InsertionMode.IN_TABLE_TEXT;
            switch (token.type) {
                case TokenType.CHARACTER: {
                    characterInTableText(p, token);
                    break;
                }
                case TokenType.WHITESPACE_CHARACTER: {
                    whitespaceCharacterInTableText(p, token);
                    break;
                }
                // Ignore null
            }
        }
        else {
            tokenInTable(p, token);
        }
    }
    function captionStartTagInTable(p, token) {
        p.openElements.clearBackToTableContext();
        p.activeFormattingElements.insertMarker();
        p._insertElement(token, NS.HTML);
        p.insertionMode = InsertionMode.IN_CAPTION;
    }
    function colgroupStartTagInTable(p, token) {
        p.openElements.clearBackToTableContext();
        p._insertElement(token, NS.HTML);
        p.insertionMode = InsertionMode.IN_COLUMN_GROUP;
    }
    function colStartTagInTable(p, token) {
        p.openElements.clearBackToTableContext();
        p._insertFakeElement(TAG_NAMES.COLGROUP, TAG_ID.COLGROUP);
        p.insertionMode = InsertionMode.IN_COLUMN_GROUP;
        startTagInColumnGroup(p, token);
    }
    function tbodyStartTagInTable(p, token) {
        p.openElements.clearBackToTableContext();
        p._insertElement(token, NS.HTML);
        p.insertionMode = InsertionMode.IN_TABLE_BODY;
    }
    function tdStartTagInTable(p, token) {
        p.openElements.clearBackToTableContext();
        p._insertFakeElement(TAG_NAMES.TBODY, TAG_ID.TBODY);
        p.insertionMode = InsertionMode.IN_TABLE_BODY;
        startTagInTableBody(p, token);
    }
    function tableStartTagInTable(p, token) {
        if (p.openElements.hasInTableScope(TAG_ID.TABLE)) {
            p.openElements.popUntilTagNamePopped(TAG_ID.TABLE);
            p._resetInsertionMode();
            p._processStartTag(token);
        }
    }
    function inputStartTagInTable(p, token) {
        if (isHiddenInput(token)) {
            p._appendElement(token, NS.HTML);
        }
        else {
            tokenInTable(p, token);
        }
        token.ackSelfClosing = true;
    }
    function formStartTagInTable(p, token) {
        if (!p.formElement && p.openElements.tmplCount === 0) {
            p._insertElement(token, NS.HTML);
            p.formElement = p.openElements.current;
            p.openElements.pop();
        }
    }
    function startTagInTable(p, token) {
        switch (token.tagID) {
            case TAG_ID.TD:
            case TAG_ID.TH:
            case TAG_ID.TR: {
                tdStartTagInTable(p, token);
                break;
            }
            case TAG_ID.STYLE:
            case TAG_ID.SCRIPT:
            case TAG_ID.TEMPLATE: {
                startTagInHead(p, token);
                break;
            }
            case TAG_ID.COL: {
                colStartTagInTable(p, token);
                break;
            }
            case TAG_ID.FORM: {
                formStartTagInTable(p, token);
                break;
            }
            case TAG_ID.TABLE: {
                tableStartTagInTable(p, token);
                break;
            }
            case TAG_ID.TBODY:
            case TAG_ID.TFOOT:
            case TAG_ID.THEAD: {
                tbodyStartTagInTable(p, token);
                break;
            }
            case TAG_ID.INPUT: {
                inputStartTagInTable(p, token);
                break;
            }
            case TAG_ID.CAPTION: {
                captionStartTagInTable(p, token);
                break;
            }
            case TAG_ID.COLGROUP: {
                colgroupStartTagInTable(p, token);
                break;
            }
            default: {
                tokenInTable(p, token);
            }
        }
    }
    function endTagInTable(p, token) {
        switch (token.tagID) {
            case TAG_ID.TABLE: {
                if (p.openElements.hasInTableScope(TAG_ID.TABLE)) {
                    p.openElements.popUntilTagNamePopped(TAG_ID.TABLE);
                    p._resetInsertionMode();
                }
                break;
            }
            case TAG_ID.TEMPLATE: {
                templateEndTagInHead(p, token);
                break;
            }
            case TAG_ID.BODY:
            case TAG_ID.CAPTION:
            case TAG_ID.COL:
            case TAG_ID.COLGROUP:
            case TAG_ID.HTML:
            case TAG_ID.TBODY:
            case TAG_ID.TD:
            case TAG_ID.TFOOT:
            case TAG_ID.TH:
            case TAG_ID.THEAD:
            case TAG_ID.TR: {
                // Ignore token
                break;
            }
            default: {
                tokenInTable(p, token);
            }
        }
    }
    function tokenInTable(p, token) {
        const savedFosterParentingState = p.fosterParentingEnabled;
        p.fosterParentingEnabled = true;
        // Process token in `In Body` mode
        modeInBody(p, token);
        p.fosterParentingEnabled = savedFosterParentingState;
    }
    // The "in table text" insertion mode
    //------------------------------------------------------------------
    function whitespaceCharacterInTableText(p, token) {
        p.pendingCharacterTokens.push(token);
    }
    function characterInTableText(p, token) {
        p.pendingCharacterTokens.push(token);
        p.hasNonWhitespacePendingCharacterToken = true;
    }
    function tokenInTableText(p, token) {
        let i = 0;
        if (p.hasNonWhitespacePendingCharacterToken) {
            for (; i < p.pendingCharacterTokens.length; i++) {
                tokenInTable(p, p.pendingCharacterTokens[i]);
            }
        }
        else {
            for (; i < p.pendingCharacterTokens.length; i++) {
                p._insertCharacters(p.pendingCharacterTokens[i]);
            }
        }
        p.insertionMode = p.originalInsertionMode;
        p._processToken(token);
    }
    // The "in caption" insertion mode
    //------------------------------------------------------------------
    const TABLE_VOID_ELEMENTS = new Set([TAG_ID.CAPTION, TAG_ID.COL, TAG_ID.COLGROUP, TAG_ID.TBODY, TAG_ID.TD, TAG_ID.TFOOT, TAG_ID.TH, TAG_ID.THEAD, TAG_ID.TR]);
    function startTagInCaption(p, token) {
        const tn = token.tagID;
        if (TABLE_VOID_ELEMENTS.has(tn)) {
            if (p.openElements.hasInTableScope(TAG_ID.CAPTION)) {
                p.openElements.generateImpliedEndTags();
                p.openElements.popUntilTagNamePopped(TAG_ID.CAPTION);
                p.activeFormattingElements.clearToLastMarker();
                p.insertionMode = InsertionMode.IN_TABLE;
                startTagInTable(p, token);
            }
        }
        else {
            startTagInBody(p, token);
        }
    }
    function endTagInCaption(p, token) {
        const tn = token.tagID;
        switch (tn) {
            case TAG_ID.CAPTION:
            case TAG_ID.TABLE: {
                if (p.openElements.hasInTableScope(TAG_ID.CAPTION)) {
                    p.openElements.generateImpliedEndTags();
                    p.openElements.popUntilTagNamePopped(TAG_ID.CAPTION);
                    p.activeFormattingElements.clearToLastMarker();
                    p.insertionMode = InsertionMode.IN_TABLE;
                    if (tn === TAG_ID.TABLE) {
                        endTagInTable(p, token);
                    }
                }
                break;
            }
            case TAG_ID.BODY:
            case TAG_ID.COL:
            case TAG_ID.COLGROUP:
            case TAG_ID.HTML:
            case TAG_ID.TBODY:
            case TAG_ID.TD:
            case TAG_ID.TFOOT:
            case TAG_ID.TH:
            case TAG_ID.THEAD:
            case TAG_ID.TR: {
                // Ignore token
                break;
            }
            default: {
                endTagInBody(p, token);
            }
        }
    }
    // The "in column group" insertion mode
    //------------------------------------------------------------------
    function startTagInColumnGroup(p, token) {
        switch (token.tagID) {
            case TAG_ID.HTML: {
                startTagInBody(p, token);
                break;
            }
            case TAG_ID.COL: {
                p._appendElement(token, NS.HTML);
                token.ackSelfClosing = true;
                break;
            }
            case TAG_ID.TEMPLATE: {
                startTagInHead(p, token);
                break;
            }
            default: {
                tokenInColumnGroup(p, token);
            }
        }
    }
    function endTagInColumnGroup(p, token) {
        switch (token.tagID) {
            case TAG_ID.COLGROUP: {
                if (p.openElements.currentTagId === TAG_ID.COLGROUP) {
                    p.openElements.pop();
                    p.insertionMode = InsertionMode.IN_TABLE;
                }
                break;
            }
            case TAG_ID.TEMPLATE: {
                templateEndTagInHead(p, token);
                break;
            }
            case TAG_ID.COL: {
                // Ignore token
                break;
            }
            default: {
                tokenInColumnGroup(p, token);
            }
        }
    }
    function tokenInColumnGroup(p, token) {
        if (p.openElements.currentTagId === TAG_ID.COLGROUP) {
            p.openElements.pop();
            p.insertionMode = InsertionMode.IN_TABLE;
            p._processToken(token);
        }
    }
    // The "in table body" insertion mode
    //------------------------------------------------------------------
    function startTagInTableBody(p, token) {
        switch (token.tagID) {
            case TAG_ID.TR: {
                p.openElements.clearBackToTableBodyContext();
                p._insertElement(token, NS.HTML);
                p.insertionMode = InsertionMode.IN_ROW;
                break;
            }
            case TAG_ID.TH:
            case TAG_ID.TD: {
                p.openElements.clearBackToTableBodyContext();
                p._insertFakeElement(TAG_NAMES.TR, TAG_ID.TR);
                p.insertionMode = InsertionMode.IN_ROW;
                startTagInRow(p, token);
                break;
            }
            case TAG_ID.CAPTION:
            case TAG_ID.COL:
            case TAG_ID.COLGROUP:
            case TAG_ID.TBODY:
            case TAG_ID.TFOOT:
            case TAG_ID.THEAD: {
                if (p.openElements.hasTableBodyContextInTableScope()) {
                    p.openElements.clearBackToTableBodyContext();
                    p.openElements.pop();
                    p.insertionMode = InsertionMode.IN_TABLE;
                    startTagInTable(p, token);
                }
                break;
            }
            default: {
                startTagInTable(p, token);
            }
        }
    }
    function endTagInTableBody(p, token) {
        const tn = token.tagID;
        switch (token.tagID) {
            case TAG_ID.TBODY:
            case TAG_ID.TFOOT:
            case TAG_ID.THEAD: {
                if (p.openElements.hasInTableScope(tn)) {
                    p.openElements.clearBackToTableBodyContext();
                    p.openElements.pop();
                    p.insertionMode = InsertionMode.IN_TABLE;
                }
                break;
            }
            case TAG_ID.TABLE: {
                if (p.openElements.hasTableBodyContextInTableScope()) {
                    p.openElements.clearBackToTableBodyContext();
                    p.openElements.pop();
                    p.insertionMode = InsertionMode.IN_TABLE;
                    endTagInTable(p, token);
                }
                break;
            }
            case TAG_ID.BODY:
            case TAG_ID.CAPTION:
            case TAG_ID.COL:
            case TAG_ID.COLGROUP:
            case TAG_ID.HTML:
            case TAG_ID.TD:
            case TAG_ID.TH:
            case TAG_ID.TR: {
                // Ignore token
                break;
            }
            default: {
                endTagInTable(p, token);
            }
        }
    }
    // The "in row" insertion mode
    //------------------------------------------------------------------
    function startTagInRow(p, token) {
        switch (token.tagID) {
            case TAG_ID.TH:
            case TAG_ID.TD: {
                p.openElements.clearBackToTableRowContext();
                p._insertElement(token, NS.HTML);
                p.insertionMode = InsertionMode.IN_CELL;
                p.activeFormattingElements.insertMarker();
                break;
            }
            case TAG_ID.CAPTION:
            case TAG_ID.COL:
            case TAG_ID.COLGROUP:
            case TAG_ID.TBODY:
            case TAG_ID.TFOOT:
            case TAG_ID.THEAD:
            case TAG_ID.TR: {
                if (p.openElements.hasInTableScope(TAG_ID.TR)) {
                    p.openElements.clearBackToTableRowContext();
                    p.openElements.pop();
                    p.insertionMode = InsertionMode.IN_TABLE_BODY;
                    startTagInTableBody(p, token);
                }
                break;
            }
            default: {
                startTagInTable(p, token);
            }
        }
    }
    function endTagInRow(p, token) {
        switch (token.tagID) {
            case TAG_ID.TR: {
                if (p.openElements.hasInTableScope(TAG_ID.TR)) {
                    p.openElements.clearBackToTableRowContext();
                    p.openElements.pop();
                    p.insertionMode = InsertionMode.IN_TABLE_BODY;
                }
                break;
            }
            case TAG_ID.TABLE: {
                if (p.openElements.hasInTableScope(TAG_ID.TR)) {
                    p.openElements.clearBackToTableRowContext();
                    p.openElements.pop();
                    p.insertionMode = InsertionMode.IN_TABLE_BODY;
                    endTagInTableBody(p, token);
                }
                break;
            }
            case TAG_ID.TBODY:
            case TAG_ID.TFOOT:
            case TAG_ID.THEAD: {
                if (p.openElements.hasInTableScope(token.tagID) || p.openElements.hasInTableScope(TAG_ID.TR)) {
                    p.openElements.clearBackToTableRowContext();
                    p.openElements.pop();
                    p.insertionMode = InsertionMode.IN_TABLE_BODY;
                    endTagInTableBody(p, token);
                }
                break;
            }
            case TAG_ID.BODY:
            case TAG_ID.CAPTION:
            case TAG_ID.COL:
            case TAG_ID.COLGROUP:
            case TAG_ID.HTML:
            case TAG_ID.TD:
            case TAG_ID.TH: {
                // Ignore end tag
                break;
            }
            default: {
                endTagInTable(p, token);
            }
        }
    }
    // The "in cell" insertion mode
    //------------------------------------------------------------------
    function startTagInCell(p, token) {
        const tn = token.tagID;
        if (TABLE_VOID_ELEMENTS.has(tn)) {
            if (p.openElements.hasInTableScope(TAG_ID.TD) || p.openElements.hasInTableScope(TAG_ID.TH)) {
                p._closeTableCell();
                startTagInRow(p, token);
            }
        }
        else {
            startTagInBody(p, token);
        }
    }
    function endTagInCell(p, token) {
        const tn = token.tagID;
        switch (tn) {
            case TAG_ID.TD:
            case TAG_ID.TH: {
                if (p.openElements.hasInTableScope(tn)) {
                    p.openElements.generateImpliedEndTags();
                    p.openElements.popUntilTagNamePopped(tn);
                    p.activeFormattingElements.clearToLastMarker();
                    p.insertionMode = InsertionMode.IN_ROW;
                }
                break;
            }
            case TAG_ID.TABLE:
            case TAG_ID.TBODY:
            case TAG_ID.TFOOT:
            case TAG_ID.THEAD:
            case TAG_ID.TR: {
                if (p.openElements.hasInTableScope(tn)) {
                    p._closeTableCell();
                    endTagInRow(p, token);
                }
                break;
            }
            case TAG_ID.BODY:
            case TAG_ID.CAPTION:
            case TAG_ID.COL:
            case TAG_ID.COLGROUP:
            case TAG_ID.HTML: {
                // Ignore token
                break;
            }
            default: {
                endTagInBody(p, token);
            }
        }
    }
    // The "in select" insertion mode
    //------------------------------------------------------------------
    function startTagInSelect(p, token) {
        switch (token.tagID) {
            case TAG_ID.HTML: {
                startTagInBody(p, token);
                break;
            }
            case TAG_ID.OPTION: {
                if (p.openElements.currentTagId === TAG_ID.OPTION) {
                    p.openElements.pop();
                }
                p._insertElement(token, NS.HTML);
                break;
            }
            case TAG_ID.OPTGROUP: {
                if (p.openElements.currentTagId === TAG_ID.OPTION) {
                    p.openElements.pop();
                }
                if (p.openElements.currentTagId === TAG_ID.OPTGROUP) {
                    p.openElements.pop();
                }
                p._insertElement(token, NS.HTML);
                break;
            }
            case TAG_ID.HR: {
                if (p.openElements.currentTagId === TAG_ID.OPTION) {
                    p.openElements.pop();
                }
                if (p.openElements.currentTagId === TAG_ID.OPTGROUP) {
                    p.openElements.pop();
                }
                p._appendElement(token, NS.HTML);
                token.ackSelfClosing = true;
                break;
            }
            case TAG_ID.INPUT:
            case TAG_ID.KEYGEN:
            case TAG_ID.TEXTAREA:
            case TAG_ID.SELECT: {
                if (p.openElements.hasInSelectScope(TAG_ID.SELECT)) {
                    p.openElements.popUntilTagNamePopped(TAG_ID.SELECT);
                    p._resetInsertionMode();
                    if (token.tagID !== TAG_ID.SELECT) {
                        p._processStartTag(token);
                    }
                }
                break;
            }
            case TAG_ID.SCRIPT:
            case TAG_ID.TEMPLATE: {
                startTagInHead(p, token);
                break;
            }
            // Do nothing
        }
    }
    function endTagInSelect(p, token) {
        switch (token.tagID) {
            case TAG_ID.OPTGROUP: {
                if (p.openElements.stackTop > 0 &&
                    p.openElements.currentTagId === TAG_ID.OPTION &&
                    p.openElements.tagIDs[p.openElements.stackTop - 1] === TAG_ID.OPTGROUP) {
                    p.openElements.pop();
                }
                if (p.openElements.currentTagId === TAG_ID.OPTGROUP) {
                    p.openElements.pop();
                }
                break;
            }
            case TAG_ID.OPTION: {
                if (p.openElements.currentTagId === TAG_ID.OPTION) {
                    p.openElements.pop();
                }
                break;
            }
            case TAG_ID.SELECT: {
                if (p.openElements.hasInSelectScope(TAG_ID.SELECT)) {
                    p.openElements.popUntilTagNamePopped(TAG_ID.SELECT);
                    p._resetInsertionMode();
                }
                break;
            }
            case TAG_ID.TEMPLATE: {
                templateEndTagInHead(p, token);
                break;
            }
            // Do nothing
        }
    }
    // The "in select in table" insertion mode
    //------------------------------------------------------------------
    function startTagInSelectInTable(p, token) {
        const tn = token.tagID;
        if (tn === TAG_ID.CAPTION ||
            tn === TAG_ID.TABLE ||
            tn === TAG_ID.TBODY ||
            tn === TAG_ID.TFOOT ||
            tn === TAG_ID.THEAD ||
            tn === TAG_ID.TR ||
            tn === TAG_ID.TD ||
            tn === TAG_ID.TH) {
            p.openElements.popUntilTagNamePopped(TAG_ID.SELECT);
            p._resetInsertionMode();
            p._processStartTag(token);
        }
        else {
            startTagInSelect(p, token);
        }
    }
    function endTagInSelectInTable(p, token) {
        const tn = token.tagID;
        if (tn === TAG_ID.CAPTION ||
            tn === TAG_ID.TABLE ||
            tn === TAG_ID.TBODY ||
            tn === TAG_ID.TFOOT ||
            tn === TAG_ID.THEAD ||
            tn === TAG_ID.TR ||
            tn === TAG_ID.TD ||
            tn === TAG_ID.TH) {
            if (p.openElements.hasInTableScope(tn)) {
                p.openElements.popUntilTagNamePopped(TAG_ID.SELECT);
                p._resetInsertionMode();
                p.onEndTag(token);
            }
        }
        else {
            endTagInSelect(p, token);
        }
    }
    // The "in template" insertion mode
    //------------------------------------------------------------------
    function startTagInTemplate(p, token) {
        switch (token.tagID) {
            // First, handle tags that can start without a mode change
            case TAG_ID.BASE:
            case TAG_ID.BASEFONT:
            case TAG_ID.BGSOUND:
            case TAG_ID.LINK:
            case TAG_ID.META:
            case TAG_ID.NOFRAMES:
            case TAG_ID.SCRIPT:
            case TAG_ID.STYLE:
            case TAG_ID.TEMPLATE:
            case TAG_ID.TITLE: {
                startTagInHead(p, token);
                break;
            }
            // Re-process the token in the appropriate mode
            case TAG_ID.CAPTION:
            case TAG_ID.COLGROUP:
            case TAG_ID.TBODY:
            case TAG_ID.TFOOT:
            case TAG_ID.THEAD: {
                p.tmplInsertionModeStack[0] = InsertionMode.IN_TABLE;
                p.insertionMode = InsertionMode.IN_TABLE;
                startTagInTable(p, token);
                break;
            }
            case TAG_ID.COL: {
                p.tmplInsertionModeStack[0] = InsertionMode.IN_COLUMN_GROUP;
                p.insertionMode = InsertionMode.IN_COLUMN_GROUP;
                startTagInColumnGroup(p, token);
                break;
            }
            case TAG_ID.TR: {
                p.tmplInsertionModeStack[0] = InsertionMode.IN_TABLE_BODY;
                p.insertionMode = InsertionMode.IN_TABLE_BODY;
                startTagInTableBody(p, token);
                break;
            }
            case TAG_ID.TD:
            case TAG_ID.TH: {
                p.tmplInsertionModeStack[0] = InsertionMode.IN_ROW;
                p.insertionMode = InsertionMode.IN_ROW;
                startTagInRow(p, token);
                break;
            }
            default: {
                p.tmplInsertionModeStack[0] = InsertionMode.IN_BODY;
                p.insertionMode = InsertionMode.IN_BODY;
                startTagInBody(p, token);
            }
        }
    }
    function endTagInTemplate(p, token) {
        if (token.tagID === TAG_ID.TEMPLATE) {
            templateEndTagInHead(p, token);
        }
    }
    function eofInTemplate(p, token) {
        if (p.openElements.tmplCount > 0) {
            p.openElements.popUntilTagNamePopped(TAG_ID.TEMPLATE);
            p.activeFormattingElements.clearToLastMarker();
            p.tmplInsertionModeStack.shift();
            p._resetInsertionMode();
            p.onEof(token);
        }
        else {
            stopParsing(p, token);
        }
    }
    // The "after body" insertion mode
    //------------------------------------------------------------------
    function startTagAfterBody(p, token) {
        if (token.tagID === TAG_ID.HTML) {
            startTagInBody(p, token);
        }
        else {
            tokenAfterBody(p, token);
        }
    }
    function endTagAfterBody(p, token) {
        var _a;
        if (token.tagID === TAG_ID.HTML) {
            if (!p.fragmentContext) {
                p.insertionMode = InsertionMode.AFTER_AFTER_BODY;
            }
            //NOTE: <html> is never popped from the stack, so we need to updated
            //the end location explicitly.
            if (p.options.sourceCodeLocationInfo && p.openElements.tagIDs[0] === TAG_ID.HTML) {
                p._setEndLocation(p.openElements.items[0], token);
                // Update the body element, if it doesn't have an end tag
                const bodyElement = p.openElements.items[1];
                if (bodyElement && !((_a = p.treeAdapter.getNodeSourceCodeLocation(bodyElement)) === null || _a === void 0 ? void 0 : _a.endTag)) {
                    p._setEndLocation(bodyElement, token);
                }
            }
        }
        else {
            tokenAfterBody(p, token);
        }
    }
    function tokenAfterBody(p, token) {
        p.insertionMode = InsertionMode.IN_BODY;
        modeInBody(p, token);
    }
    // The "in frameset" insertion mode
    //------------------------------------------------------------------
    function startTagInFrameset(p, token) {
        switch (token.tagID) {
            case TAG_ID.HTML: {
                startTagInBody(p, token);
                break;
            }
            case TAG_ID.FRAMESET: {
                p._insertElement(token, NS.HTML);
                break;
            }
            case TAG_ID.FRAME: {
                p._appendElement(token, NS.HTML);
                token.ackSelfClosing = true;
                break;
            }
            case TAG_ID.NOFRAMES: {
                startTagInHead(p, token);
                break;
            }
            // Do nothing
        }
    }
    function endTagInFrameset(p, token) {
        if (token.tagID === TAG_ID.FRAMESET && !p.openElements.isRootHtmlElementCurrent()) {
            p.openElements.pop();
            if (!p.fragmentContext && p.openElements.currentTagId !== TAG_ID.FRAMESET) {
                p.insertionMode = InsertionMode.AFTER_FRAMESET;
            }
        }
    }
    // The "after frameset" insertion mode
    //------------------------------------------------------------------
    function startTagAfterFrameset(p, token) {
        switch (token.tagID) {
            case TAG_ID.HTML: {
                startTagInBody(p, token);
                break;
            }
            case TAG_ID.NOFRAMES: {
                startTagInHead(p, token);
                break;
            }
            // Do nothing
        }
    }
    function endTagAfterFrameset(p, token) {
        if (token.tagID === TAG_ID.HTML) {
            p.insertionMode = InsertionMode.AFTER_AFTER_FRAMESET;
        }
    }
    // The "after after body" insertion mode
    //------------------------------------------------------------------
    function startTagAfterAfterBody(p, token) {
        if (token.tagID === TAG_ID.HTML) {
            startTagInBody(p, token);
        }
        else {
            tokenAfterAfterBody(p, token);
        }
    }
    function tokenAfterAfterBody(p, token) {
        p.insertionMode = InsertionMode.IN_BODY;
        modeInBody(p, token);
    }
    // The "after after frameset" insertion mode
    //------------------------------------------------------------------
    function startTagAfterAfterFrameset(p, token) {
        switch (token.tagID) {
            case TAG_ID.HTML: {
                startTagInBody(p, token);
                break;
            }
            case TAG_ID.NOFRAMES: {
                startTagInHead(p, token);
                break;
            }
            // Do nothing
        }
    }
    // The rules for parsing tokens in foreign content
    //------------------------------------------------------------------
    function nullCharacterInForeignContent(p, token) {
        token.chars = REPLACEMENT_CHARACTER;
        p._insertCharacters(token);
    }
    function characterInForeignContent(p, token) {
        p._insertCharacters(token);
        p.framesetOk = false;
    }
    function popUntilHtmlOrIntegrationPoint(p) {
        while (p.treeAdapter.getNamespaceURI(p.openElements.current) !== NS.HTML &&
            p.openElements.currentTagId !== undefined &&
            !p._isIntegrationPoint(p.openElements.currentTagId, p.openElements.current)) {
            p.openElements.pop();
        }
    }
    function startTagInForeignContent(p, token) {
        if (causesExit(token)) {
            popUntilHtmlOrIntegrationPoint(p);
            p._startTagOutsideForeignContent(token);
        }
        else {
            const current = p._getAdjustedCurrentElement();
            const currentNs = p.treeAdapter.getNamespaceURI(current);
            if (currentNs === NS.MATHML) {
                adjustTokenMathMLAttrs(token);
            }
            else if (currentNs === NS.SVG) {
                adjustTokenSVGTagName(token);
                adjustTokenSVGAttrs(token);
            }
            adjustTokenXMLAttrs(token);
            if (token.selfClosing) {
                p._appendElement(token, currentNs);
            }
            else {
                p._insertElement(token, currentNs);
            }
            token.ackSelfClosing = true;
        }
    }
    function endTagInForeignContent(p, token) {
        if (token.tagID === TAG_ID.P || token.tagID === TAG_ID.BR) {
            popUntilHtmlOrIntegrationPoint(p);
            p._endTagOutsideForeignContent(token);
            return;
        }
        for (let i = p.openElements.stackTop; i > 0; i--) {
            const element = p.openElements.items[i];
            if (p.treeAdapter.getNamespaceURI(element) === NS.HTML) {
                p._endTagOutsideForeignContent(token);
                break;
            }
            const tagName = p.treeAdapter.getTagName(element);
            if (tagName.toLowerCase() === token.tagName) {
                //NOTE: update the token tag name for `_setEndLocation`.
                token.tagName = tagName;
                p.openElements.shortenToLength(i);
                break;
            }
        }
    }

    /**
     * Creates a function that escapes all characters matched by the given regular
     * expression using the given map of characters to escape to their entities.
     *
     * @param regex Regular expression to match characters to escape.
     * @param map Map of characters to escape to their entities.
     *
     * @returns Function that escapes all characters matched by the given regular
     * expression using the given map of characters to escape to their entities.
     */
    function getEscaper(regex, map) {
        return function escape(data) {
            let match;
            let lastIndex = 0;
            let result = "";
            while ((match = regex.exec(data))) {
                if (lastIndex !== match.index) {
                    result += data.substring(lastIndex, match.index);
                }
                // We know that this character will be in the map.
                result += map.get(match[0].charCodeAt(0));
                // Every match will be of length 1
                lastIndex = match.index + 1;
            }
            return result + data.substring(lastIndex);
        };
    }
    /**
     * Encodes all characters that have to be escaped in HTML attributes,
     * following {@link https://html.spec.whatwg.org/multipage/parsing.html#escapingString}.
     *
     * @param data String to escape.
     */
    const escapeAttribute = 
    /* #__PURE__ */ getEscaper(/["&\u00A0]/g, new Map([
        [34, "&quot;"],
        [38, "&amp;"],
        [160, "&nbsp;"],
    ]));
    /**
     * Encodes all characters that have to be escaped in HTML text,
     * following {@link https://html.spec.whatwg.org/multipage/parsing.html#escapingString}.
     *
     * @param data String to escape.
     */
    const escapeText = /* #__PURE__ */ getEscaper(/[&<>\u00A0]/g, new Map([
        [38, "&amp;"],
        [60, "&lt;"],
        [62, "&gt;"],
        [160, "&nbsp;"],
    ]));

    // Sets
    const VOID_ELEMENTS = new Set([
        TAG_NAMES.AREA,
        TAG_NAMES.BASE,
        TAG_NAMES.BASEFONT,
        TAG_NAMES.BGSOUND,
        TAG_NAMES.BR,
        TAG_NAMES.COL,
        TAG_NAMES.EMBED,
        TAG_NAMES.FRAME,
        TAG_NAMES.HR,
        TAG_NAMES.IMG,
        TAG_NAMES.INPUT,
        TAG_NAMES.KEYGEN,
        TAG_NAMES.LINK,
        TAG_NAMES.META,
        TAG_NAMES.PARAM,
        TAG_NAMES.SOURCE,
        TAG_NAMES.TRACK,
        TAG_NAMES.WBR,
    ]);
    function isVoidElement(node, options) {
        return (options.treeAdapter.isElementNode(node) &&
            options.treeAdapter.getNamespaceURI(node) === NS.HTML &&
            VOID_ELEMENTS.has(options.treeAdapter.getTagName(node)));
    }
    const defaultOpts = { treeAdapter: defaultTreeAdapter, scriptingEnabled: true };
    /**
     * Serializes an AST element node to an HTML string, including the element node.
     *
     * @example
     *
     * ```js
     * const parse5 = require('parse5');
     *
     * const document = parse5.parseFragment('<div>Hello, <b>world</b>!</div>');
     *
     * // Serializes the <div> element.
     * const str = parse5.serializeOuter(document.childNodes[0]);
     *
     * console.log(str); //> '<div>Hello, <b>world</b>!</div>'
     * ```
     *
     * @param node Node to serialize.
     * @param options Serialization options.
     */
    function serializeOuter(node, options) {
        const opts = { ...defaultOpts, ...options };
        return serializeNode(node, opts);
    }
    function serializeChildNodes(parentNode, options) {
        let html = '';
        // Get container of the child nodes
        const container = options.treeAdapter.isElementNode(parentNode) &&
            options.treeAdapter.getTagName(parentNode) === TAG_NAMES.TEMPLATE &&
            options.treeAdapter.getNamespaceURI(parentNode) === NS.HTML
            ? options.treeAdapter.getTemplateContent(parentNode)
            : parentNode;
        const childNodes = options.treeAdapter.getChildNodes(container);
        if (childNodes) {
            for (const currentNode of childNodes) {
                html += serializeNode(currentNode, options);
            }
        }
        return html;
    }
    function serializeNode(node, options) {
        if (options.treeAdapter.isElementNode(node)) {
            return serializeElement(node, options);
        }
        if (options.treeAdapter.isTextNode(node)) {
            return serializeTextNode(node, options);
        }
        if (options.treeAdapter.isCommentNode(node)) {
            return serializeCommentNode(node, options);
        }
        if (options.treeAdapter.isDocumentTypeNode(node)) {
            return serializeDocumentTypeNode(node, options);
        }
        // Return an empty string for unknown nodes
        return '';
    }
    function serializeElement(node, options) {
        const tn = options.treeAdapter.getTagName(node);
        return `<${tn}${serializeAttributes(node, options)}>${isVoidElement(node, options) ? '' : `${serializeChildNodes(node, options)}</${tn}>`}`;
    }
    function serializeAttributes(node, { treeAdapter }) {
        let html = '';
        for (const attr of treeAdapter.getAttrList(node)) {
            html += ' ';
            if (attr.namespace) {
                switch (attr.namespace) {
                    case NS.XML: {
                        html += `xml:${attr.name}`;
                        break;
                    }
                    case NS.XMLNS: {
                        if (attr.name !== 'xmlns') {
                            html += 'xmlns:';
                        }
                        html += attr.name;
                        break;
                    }
                    case NS.XLINK: {
                        html += `xlink:${attr.name}`;
                        break;
                    }
                    default: {
                        html += `${attr.prefix}:${attr.name}`;
                    }
                }
            }
            else {
                html += attr.name;
            }
            html += `="${escapeAttribute(attr.value)}"`;
        }
        return html;
    }
    function serializeTextNode(node, options) {
        const { treeAdapter } = options;
        const content = treeAdapter.getTextNodeContent(node);
        const parent = treeAdapter.getParentNode(node);
        const parentTn = parent && treeAdapter.isElementNode(parent) && treeAdapter.getTagName(parent);
        return parentTn &&
            treeAdapter.getNamespaceURI(parent) === NS.HTML &&
            hasUnescapedText(parentTn, options.scriptingEnabled)
            ? content
            : escapeText(content);
    }
    function serializeCommentNode(node, { treeAdapter }) {
        return `<!--${treeAdapter.getCommentNodeContent(node)}-->`;
    }
    function serializeDocumentTypeNode(node, { treeAdapter }) {
        return `<!DOCTYPE ${treeAdapter.getDocumentTypeNodeName(node)}>`;
    }

    // Shorthands
    /**
     * Parses an HTML string.
     *
     * @param html Input HTML string.
     * @param options Parsing options.
     * @returns Document
     *
     * @example
     *
     * ```js
     * const parse5 = require('parse5');
     *
     * const document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');
     *
     * console.log(document.childNodes[1].tagName); //> 'html'
     *```
     */
    function parse$1(html, options) {
        return Parser.parse(html, options);
    }
    function parseFragment(fragmentContext, html, options) {
        if (typeof fragmentContext === 'string') {
            options = html;
            html = fragmentContext;
            fragmentContext = null;
        }
        const parser = Parser.getFragmentParser(fragmentContext, options);
        parser.tokenizer.write(html, true);
        return parser.getFragment();
    }

    function enquoteDoctypeId(id) {
        const quote = id.includes('"') ? "'" : '"';
        return quote + id + quote;
    }
    /** @internal */
    function serializeDoctypeContent(name, publicId, systemId) {
        let str = '!DOCTYPE ';
        if (name) {
            str += name;
        }
        if (publicId) {
            str += ` PUBLIC ${enquoteDoctypeId(publicId)}`;
        }
        else if (systemId) {
            str += ' SYSTEM';
        }
        if (systemId) {
            str += ` ${enquoteDoctypeId(systemId)}`;
        }
        return str;
    }
    const adapter = {
        // Re-exports from domhandler
        isCommentNode: isComment,
        isElementNode: isTag,
        isTextNode: isText,
        //Node construction
        createDocument() {
            const node = new Document([]);
            node['x-mode'] = DOCUMENT_MODE.NO_QUIRKS;
            return node;
        },
        createDocumentFragment() {
            return new Document([]);
        },
        createElement(tagName, namespaceURI, attrs) {
            const attribs = Object.create(null);
            const attribsNamespace = Object.create(null);
            const attribsPrefix = Object.create(null);
            for (let i = 0; i < attrs.length; i++) {
                const attrName = attrs[i].name;
                attribs[attrName] = attrs[i].value;
                attribsNamespace[attrName] = attrs[i].namespace;
                attribsPrefix[attrName] = attrs[i].prefix;
            }
            const node = new Element(tagName, attribs, []);
            node.namespace = namespaceURI;
            node['x-attribsNamespace'] = attribsNamespace;
            node['x-attribsPrefix'] = attribsPrefix;
            return node;
        },
        createCommentNode(data) {
            return new Comment(data);
        },
        createTextNode(value) {
            return new Text(value);
        },
        //Tree mutation
        appendChild(parentNode, newNode) {
            const prev = parentNode.children[parentNode.children.length - 1];
            if (prev) {
                prev.next = newNode;
                newNode.prev = prev;
            }
            parentNode.children.push(newNode);
            newNode.parent = parentNode;
        },
        insertBefore(parentNode, newNode, referenceNode) {
            const insertionIdx = parentNode.children.indexOf(referenceNode);
            const { prev } = referenceNode;
            if (prev) {
                prev.next = newNode;
                newNode.prev = prev;
            }
            referenceNode.prev = newNode;
            newNode.next = referenceNode;
            parentNode.children.splice(insertionIdx, 0, newNode);
            newNode.parent = parentNode;
        },
        setTemplateContent(templateElement, contentElement) {
            adapter.appendChild(templateElement, contentElement);
        },
        getTemplateContent(templateElement) {
            return templateElement.children[0];
        },
        setDocumentType(document, name, publicId, systemId) {
            const data = serializeDoctypeContent(name, publicId, systemId);
            let doctypeNode = document.children.find((node) => isDirective(node) && node.name === '!doctype');
            if (doctypeNode) {
                doctypeNode.data = data !== null && data !== void 0 ? data : null;
            }
            else {
                doctypeNode = new ProcessingInstruction('!doctype', data);
                adapter.appendChild(document, doctypeNode);
            }
            doctypeNode['x-name'] = name;
            doctypeNode['x-publicId'] = publicId;
            doctypeNode['x-systemId'] = systemId;
        },
        setDocumentMode(document, mode) {
            document['x-mode'] = mode;
        },
        getDocumentMode(document) {
            return document['x-mode'];
        },
        detachNode(node) {
            if (node.parent) {
                const idx = node.parent.children.indexOf(node);
                const { prev, next } = node;
                node.prev = null;
                node.next = null;
                if (prev) {
                    prev.next = next;
                }
                if (next) {
                    next.prev = prev;
                }
                node.parent.children.splice(idx, 1);
                node.parent = null;
            }
        },
        insertText(parentNode, text) {
            const lastChild = parentNode.children[parentNode.children.length - 1];
            if (lastChild && isText(lastChild)) {
                lastChild.data += text;
            }
            else {
                adapter.appendChild(parentNode, adapter.createTextNode(text));
            }
        },
        insertTextBefore(parentNode, text, referenceNode) {
            const prevNode = parentNode.children[parentNode.children.indexOf(referenceNode) - 1];
            if (prevNode && isText(prevNode)) {
                prevNode.data += text;
            }
            else {
                adapter.insertBefore(parentNode, adapter.createTextNode(text), referenceNode);
            }
        },
        adoptAttributes(recipient, attrs) {
            for (let i = 0; i < attrs.length; i++) {
                const attrName = attrs[i].name;
                if (recipient.attribs[attrName] === undefined) {
                    recipient.attribs[attrName] = attrs[i].value;
                    recipient['x-attribsNamespace'][attrName] = attrs[i].namespace;
                    recipient['x-attribsPrefix'][attrName] = attrs[i].prefix;
                }
            }
        },
        //Tree traversing
        getFirstChild(node) {
            return node.children[0];
        },
        getChildNodes(node) {
            return node.children;
        },
        getParentNode(node) {
            return node.parent;
        },
        getAttrList(element) {
            return element.attributes;
        },
        //Node data
        getTagName(element) {
            return element.name;
        },
        getNamespaceURI(element) {
            return element.namespace;
        },
        getTextNodeContent(textNode) {
            return textNode.data;
        },
        getCommentNodeContent(commentNode) {
            return commentNode.data;
        },
        getDocumentTypeNodeName(doctypeNode) {
            var _a;
            return (_a = doctypeNode['x-name']) !== null && _a !== void 0 ? _a : '';
        },
        getDocumentTypeNodePublicId(doctypeNode) {
            var _a;
            return (_a = doctypeNode['x-publicId']) !== null && _a !== void 0 ? _a : '';
        },
        getDocumentTypeNodeSystemId(doctypeNode) {
            var _a;
            return (_a = doctypeNode['x-systemId']) !== null && _a !== void 0 ? _a : '';
        },
        //Node types
        isDocumentTypeNode(node) {
            return isDirective(node) && node.name === '!doctype';
        },
        // Source code location
        setNodeSourceCodeLocation(node, location) {
            if (location) {
                node.startIndex = location.startOffset;
                node.endIndex = location.endOffset;
            }
            node.sourceCodeLocation = location;
        },
        getNodeSourceCodeLocation(node) {
            return node.sourceCodeLocation;
        },
        updateNodeSourceCodeLocation(node, endLocation) {
            if (endLocation.endOffset != null)
                node.endIndex = endLocation.endOffset;
            node.sourceCodeLocation = {
                ...node.sourceCodeLocation,
                ...endLocation,
            };
        },
    };

    /**
     * Parse the content with `parse5` in the context of the given `ParentNode`.
     *
     * @param content - The content to parse.
     * @param options - A set of options to use to parse.
     * @param isDocument - Whether to parse the content as a full HTML document.
     * @param context - The context in which to parse the content.
     * @returns The parsed content.
     */
    function parseWithParse5(content, options, isDocument, context) {
        var _a;
        (_a = options.treeAdapter) !== null && _a !== void 0 ? _a : (options.treeAdapter = adapter);
        if (options.scriptingEnabled !== false) {
            options.scriptingEnabled = true;
        }
        return isDocument
            ? parse$1(content, options)
            : parseFragment(context, content, options);
    }
    const renderOpts = { treeAdapter: adapter };
    /**
     * Renders the given DOM tree with `parse5` and returns the result as a string.
     *
     * @param dom - The DOM tree to render.
     * @returns The rendered document.
     */
    function renderWithParse5(dom) {
        /*
         * `dom-serializer` passes over the special "root" node and renders the
         * node's children in its place. To mimic this behavior with `parse5`, an
         * equivalent operation must be applied to the input array.
         */
        const nodes = 'length' in dom ? dom : [dom];
        for (let index = 0; index < nodes.length; index += 1) {
            const node = nodes[index];
            if (isDocument(node)) {
                Array.prototype.splice.call(nodes, index, 1, ...node.children);
            }
        }
        let result = '';
        for (let index = 0; index < nodes.length; index += 1) {
            const node = nodes[index];
            result += serializeOuter(node, renderOpts);
        }
        return result;
    }

    const parse = getParse((content, options, isDocument, context) => options._useHtmlParser2
        ? parseDocument(content, options)
        : parseWithParse5(content, options, isDocument, context));
    // Duplicate docs due to https://github.com/TypeStrong/typedoc/issues/1616
    /**
     * Create a querying function, bound to a document created from the provided
     * markup.
     *
     * Note that similar to web browser contexts, this operation may introduce
     * `<html>`, `<head>`, and `<body>` elements; set `isDocument` to `false` to
     * switch to fragment mode and disable this.
     *
     * @category Loading
     * @param content - Markup to be loaded.
     * @param options - Options for the created instance.
     * @param isDocument - Allows parser to be switched to fragment mode.
     * @returns The loaded document.
     * @see {@link https://cheerio.js.org/docs/basics/loading#load} for additional usage information.
     */
    const load = getLoad(parse, (dom, options) => options._useHtmlParser2
        ? render$1(dom, options)
        : renderWithParse5(dom));

    var cheerio = /*#__PURE__*/Object.freeze({
        __proto__: null,
        contains: contains,
        load: load,
        merge: merge
    });

    // IIFE entry: exposes cheerio as globalThis.cheerio
    globalThis.cheerio = cheerio;

})();
