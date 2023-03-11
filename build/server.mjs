import * as fs from "fs";
import { readdirSync, statSync } from "fs";
import { resolve, join, normalize } from "path";
import * as qs__default from "querystring";
import qs__default__default from "querystring";
import http from "http";
import { handler } from "./handler.mjs";
import "express";
import "node-fetch";
function every(arr, cb) {
  var i = 0, len = arr.length;
  for (; i < len; i++) {
    if (!cb(arr[i], i, arr)) {
      return false;
    }
  }
  return true;
}
const SEP = "/";
const STYPE = 0, PTYPE = 1, ATYPE = 2, OTYPE = 3;
const SLASH = 47, COLON = 58, ASTER = 42, QMARK = 63;
function strip(str) {
  if (str === SEP)
    return str;
  str.charCodeAt(0) === SLASH && (str = str.substring(1));
  var len = str.length - 1;
  return str.charCodeAt(len) === SLASH ? str.substring(0, len) : str;
}
function split(str) {
  return (str = strip(str)) === SEP ? [SEP] : str.split(SEP);
}
function isMatch$1(arr, obj, idx) {
  idx = arr[idx];
  return obj.val === idx && obj.type === STYPE || (idx === SEP ? obj.type > PTYPE : obj.type !== STYPE && (idx || "").endsWith(obj.end));
}
function match$1(str, all) {
  var i = 0, tmp, segs = split(str), len = segs.length, l;
  var fn = isMatch$1.bind(isMatch$1, segs);
  for (; i < all.length; i++) {
    tmp = all[i];
    if ((l = tmp.length) === len || l < len && tmp[l - 1].type === ATYPE || l > len && tmp[l - 1].type === OTYPE) {
      if (every(tmp, fn))
        return tmp;
    }
  }
  return [];
}
function parse$2(str) {
  if (str === SEP) {
    return [{ old: str, type: STYPE, val: str, end: "" }];
  }
  var c, x, t, sfx, nxt = strip(str), i = -1, j = 0, len = nxt.length, out = [];
  while (++i < len) {
    c = nxt.charCodeAt(i);
    if (c === COLON) {
      j = i + 1;
      t = PTYPE;
      x = 0;
      sfx = "";
      while (i < len && nxt.charCodeAt(i) !== SLASH) {
        c = nxt.charCodeAt(i);
        if (c === QMARK) {
          x = i;
          t = OTYPE;
        } else if (c === 46 && sfx.length === 0) {
          sfx = nxt.substring(x = i);
        }
        i++;
      }
      out.push({
        old: str,
        type: t,
        val: nxt.substring(j, x || i),
        end: sfx
      });
      nxt = nxt.substring(i);
      len -= i;
      i = 0;
      continue;
    } else if (c === ASTER) {
      out.push({
        old: str,
        type: ATYPE,
        val: nxt.substring(i),
        end: ""
      });
      continue;
    } else {
      j = i;
      while (i < len && nxt.charCodeAt(i) !== SLASH) {
        ++i;
      }
      out.push({
        old: str,
        type: STYPE,
        val: nxt.substring(j, i),
        end: ""
      });
      nxt = nxt.substring(i);
      len -= i;
      i = j = 0;
    }
  }
  return out;
}
function exec$1(str, arr) {
  var i = 0, x, y, segs = split(str), out = {};
  for (; i < arr.length; i++) {
    x = segs[i];
    y = arr[i];
    if (x === SEP)
      continue;
    if (x !== void 0 && y.type | 2 === OTYPE) {
      out[y.val] = x.replace(y.end, "");
    }
  }
  return out;
}
var matchit = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  match: match$1,
  parse: parse$2,
  exec: exec$1
});
function getAugmentedNamespace(n) {
  if (n.__esModule)
    return n;
  var a = Object.defineProperty({}, "__esModule", { value: true });
  Object.keys(n).forEach(function(k) {
    var d = Object.getOwnPropertyDescriptor(n, k);
    Object.defineProperty(a, k, d.get ? d : {
      enumerable: true,
      get: function() {
        return n[k];
      }
    });
  });
  return a;
}
var require$$0 = /* @__PURE__ */ getAugmentedNamespace(matchit);
const { exec, match, parse: parse$1 } = require$$0;
class Trouter {
  constructor(opts) {
    this.opts = opts || {};
    this.routes = {};
    this.handlers = {};
    this.all = this.add.bind(this, "*");
    this.get = this.add.bind(this, "GET");
    this.head = this.add.bind(this, "HEAD");
    this.patch = this.add.bind(this, "PATCH");
    this.options = this.add.bind(this, "OPTIONS");
    this.connect = this.add.bind(this, "CONNECT");
    this.delete = this.add.bind(this, "DELETE");
    this.trace = this.add.bind(this, "TRACE");
    this.post = this.add.bind(this, "POST");
    this.put = this.add.bind(this, "PUT");
  }
  add(method, pattern, ...fns) {
    if (this.routes[method] === void 0)
      this.routes[method] = [];
    this.routes[method].push(parse$1(pattern));
    if (this.handlers[method] === void 0)
      this.handlers[method] = {};
    this.handlers[method][pattern] = fns;
    return this;
  }
  find(method, url2) {
    let arr = match(url2, this.routes[method] || []);
    if (arr.length === 0) {
      arr = match(url2, this.routes[method = "*"] || []);
      if (!arr.length)
        return false;
    }
    return {
      params: exec(url2, arr),
      handlers: this.handlers[method][arr[0].old]
    };
  }
}
var trouter = Trouter;
var url = function(req) {
  let url2 = req.url;
  if (url2 === void 0)
    return url2;
  let obj = req._parsedUrl;
  if (obj && obj._raw === url2)
    return obj;
  obj = {};
  obj.query = obj.search = null;
  obj.href = obj.path = obj.pathname = url2;
  let idx = url2.indexOf("?", 1);
  if (idx !== -1) {
    obj.search = url2.substring(idx);
    obj.query = obj.search.substring(1);
    obj.pathname = url2.substring(0, idx);
  }
  obj._raw = url2;
  return req._parsedUrl = obj;
};
const { parse: parse$3 } = qs__default__default;
function lead(x) {
  return x.charCodeAt(0) === 47 ? x : "/" + x;
}
function value(x) {
  let y = x.indexOf("/", 1);
  return y > 1 ? x.substring(0, y) : x;
}
function mutate(str, req) {
  req.url = req.url.substring(str.length) || "/";
  req.path = req.path.substring(str.length) || "/";
}
function onError(err, req, res, next) {
  let code = res.statusCode = err.code || err.status || 500;
  res.end(err.length && err || err.message || http.STATUS_CODES[code]);
}
class Polka extends trouter {
  constructor(opts = {}) {
    super(opts);
    this.apps = {};
    this.wares = [];
    this.bwares = {};
    this.parse = url;
    this.server = opts.server;
    this.handler = this.handler.bind(this);
    this.onError = opts.onError || onError;
    this.onNoMatch = opts.onNoMatch || this.onError.bind(null, { code: 404 });
  }
  add(method, pattern, ...fns) {
    let base = lead(value(pattern));
    if (this.apps[base] !== void 0)
      throw new Error(`Cannot mount ".${method.toLowerCase()}('${lead(pattern)}')" because a Polka application at ".use('${base}')" already exists! You should move this handler into your Polka application instead.`);
    return super.add(method, pattern, ...fns);
  }
  use(base, ...fns) {
    if (typeof base === "function") {
      this.wares = this.wares.concat(base, fns);
    } else if (base === "/") {
      this.wares = this.wares.concat(fns);
    } else {
      base = lead(base);
      fns.forEach((fn) => {
        if (fn instanceof Polka) {
          this.apps[base] = fn;
        } else {
          let arr = this.bwares[base] || [];
          arr.length > 0 || arr.push((r, _, nxt) => (mutate(base, r), nxt()));
          this.bwares[base] = arr.concat(fn);
        }
      });
    }
    return this;
  }
  listen() {
    (this.server = this.server || http.createServer()).on("request", this.handler);
    this.server.listen.apply(this.server, arguments);
    return this;
  }
  handler(req, res, info) {
    info = info || this.parse(req);
    let fns = [], arr = this.wares, obj = this.find(req.method, info.pathname);
    req.originalUrl = req.originalUrl || req.url;
    let base = value(req.path = info.pathname);
    if (this.bwares[base] !== void 0) {
      arr = arr.concat(this.bwares[base]);
    }
    if (obj) {
      fns = obj.handlers;
      req.params = obj.params;
    } else if (this.apps[base] !== void 0) {
      mutate(base, req);
      info.pathname = req.path;
      fns.push(this.apps[base].handler.bind(null, req, res, info));
    } else if (fns.length === 0) {
      fns.push(this.onNoMatch);
    }
    req.search = info.search;
    req.query = parse$3(info.query);
    let i = 0, len = arr.length, num = fns.length;
    if (len === i && num === 1)
      return fns[0](req, res);
    let next = (err) => err ? this.onError(err, req, res, next) : loop();
    let loop = (_) => res.finished || i < len && arr[i++](req, res, next);
    arr = arr.concat(fns);
    len += num;
    loop();
  }
}
var polka = (opts) => new Polka(opts);
const serveIndex = (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.end('<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <link\n      rel="icon"\n      href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>\u{1F937}\u{1F3FC}\u200D\u2640\uFE0F</text></svg>"\n    />\n\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title></title>\n    <script src="https://cdn.jsdelivr.net/npm/jquery@3.6.1/dist/jquery.min.js"><\/script>\n    <link\n      rel="stylesheet"\n      type="text/css"\n      href="https://cdn.jsdelivr.net/npm/fomantic-ui@2.9.0/dist/semantic.min.css"\n    />\n    <script src="https://cdn.jsdelivr.net/npm/fomantic-ui@2.9.0/dist/semantic.min.js"><\/script>\n\n    <link rel="preconnect" href="https://fonts.googleapis.com" />\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n    <link\n      href="https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap"\n      rel="stylesheet"\n      crossorigin="anonymous"\n    />\n    <script type="module" crossorigin src="/assets/index.c177aa1a.js"><\/script>\n    <link rel="stylesheet" href="/assets/index.9ed0af29.css">\n  </head>\n  <body>\n    <div class="ui text container">\n      <div id="app"></div>\n    </div>\n\n    \n  </body>\n</html>\n');
};
const applyHandler = (server2) => {
  if (Array.isArray(handler)) {
    handler.forEach((h) => server2.use(h));
  } else {
    server2.use(handler);
  }
  server2.use(serveIndex);
};
function parse(req) {
  let raw = req.url;
  if (raw == null)
    return;
  let prev = req._parsedUrl;
  if (prev && prev.raw === raw)
    return prev;
  let pathname = raw, search = "", query;
  if (raw.length > 1) {
    let idx = raw.indexOf("?", 1);
    if (idx !== -1) {
      search = raw.substring(idx);
      pathname = raw.substring(0, idx);
      if (search.length > 1) {
        query = qs__default.parse(search.substring(1));
      }
    }
  }
  return req._parsedUrl = { pathname, search, query, raw };
}
function list(dir, callback, pre = "") {
  dir = resolve(".", dir);
  let arr = readdirSync(dir);
  let i = 0, abs, stats;
  for (; i < arr.length; i++) {
    abs = join(dir, arr[i]);
    stats = statSync(abs);
    stats.isDirectory() ? list(abs, callback, join(pre, arr[i])) : callback(join(pre, arr[i]), abs, stats);
  }
}
const mimes = {
  "ez": "application/andrew-inset",
  "aw": "application/applixware",
  "atom": "application/atom+xml",
  "atomcat": "application/atomcat+xml",
  "atomdeleted": "application/atomdeleted+xml",
  "atomsvc": "application/atomsvc+xml",
  "dwd": "application/atsc-dwd+xml",
  "held": "application/atsc-held+xml",
  "rsat": "application/atsc-rsat+xml",
  "bdoc": "application/bdoc",
  "xcs": "application/calendar+xml",
  "ccxml": "application/ccxml+xml",
  "cdfx": "application/cdfx+xml",
  "cdmia": "application/cdmi-capability",
  "cdmic": "application/cdmi-container",
  "cdmid": "application/cdmi-domain",
  "cdmio": "application/cdmi-object",
  "cdmiq": "application/cdmi-queue",
  "cu": "application/cu-seeme",
  "mpd": "application/dash+xml",
  "davmount": "application/davmount+xml",
  "dbk": "application/docbook+xml",
  "dssc": "application/dssc+der",
  "xdssc": "application/dssc+xml",
  "es": "application/ecmascript",
  "ecma": "application/ecmascript",
  "emma": "application/emma+xml",
  "emotionml": "application/emotionml+xml",
  "epub": "application/epub+zip",
  "exi": "application/exi",
  "fdt": "application/fdt+xml",
  "pfr": "application/font-tdpfr",
  "geojson": "application/geo+json",
  "gml": "application/gml+xml",
  "gpx": "application/gpx+xml",
  "gxf": "application/gxf",
  "gz": "application/gzip",
  "hjson": "application/hjson",
  "stk": "application/hyperstudio",
  "ink": "application/inkml+xml",
  "inkml": "application/inkml+xml",
  "ipfix": "application/ipfix",
  "its": "application/its+xml",
  "jar": "application/java-archive",
  "war": "application/java-archive",
  "ear": "application/java-archive",
  "ser": "application/java-serialized-object",
  "class": "application/java-vm",
  "js": "application/javascript",
  "mjs": "application/javascript",
  "json": "application/json",
  "map": "application/json",
  "json5": "application/json5",
  "jsonml": "application/jsonml+json",
  "jsonld": "application/ld+json",
  "lgr": "application/lgr+xml",
  "lostxml": "application/lost+xml",
  "hqx": "application/mac-binhex40",
  "cpt": "application/mac-compactpro",
  "mads": "application/mads+xml",
  "webmanifest": "application/manifest+json",
  "mrc": "application/marc",
  "mrcx": "application/marcxml+xml",
  "ma": "application/mathematica",
  "nb": "application/mathematica",
  "mb": "application/mathematica",
  "mathml": "application/mathml+xml",
  "mbox": "application/mbox",
  "mscml": "application/mediaservercontrol+xml",
  "metalink": "application/metalink+xml",
  "meta4": "application/metalink4+xml",
  "mets": "application/mets+xml",
  "maei": "application/mmt-aei+xml",
  "musd": "application/mmt-usd+xml",
  "mods": "application/mods+xml",
  "m21": "application/mp21",
  "mp21": "application/mp21",
  "mp4s": "application/mp4",
  "m4p": "application/mp4",
  "doc": "application/msword",
  "dot": "application/msword",
  "mxf": "application/mxf",
  "nq": "application/n-quads",
  "nt": "application/n-triples",
  "cjs": "application/node",
  "bin": "application/octet-stream",
  "dms": "application/octet-stream",
  "lrf": "application/octet-stream",
  "mar": "application/octet-stream",
  "so": "application/octet-stream",
  "dist": "application/octet-stream",
  "distz": "application/octet-stream",
  "pkg": "application/octet-stream",
  "bpk": "application/octet-stream",
  "dump": "application/octet-stream",
  "elc": "application/octet-stream",
  "deploy": "application/octet-stream",
  "exe": "application/octet-stream",
  "dll": "application/octet-stream",
  "deb": "application/octet-stream",
  "dmg": "application/octet-stream",
  "iso": "application/octet-stream",
  "img": "application/octet-stream",
  "msi": "application/octet-stream",
  "msp": "application/octet-stream",
  "msm": "application/octet-stream",
  "buffer": "application/octet-stream",
  "oda": "application/oda",
  "opf": "application/oebps-package+xml",
  "ogx": "application/ogg",
  "omdoc": "application/omdoc+xml",
  "onetoc": "application/onenote",
  "onetoc2": "application/onenote",
  "onetmp": "application/onenote",
  "onepkg": "application/onenote",
  "oxps": "application/oxps",
  "relo": "application/p2p-overlay+xml",
  "xer": "application/patch-ops-error+xml",
  "pdf": "application/pdf",
  "pgp": "application/pgp-encrypted",
  "asc": "application/pgp-signature",
  "sig": "application/pgp-signature",
  "prf": "application/pics-rules",
  "p10": "application/pkcs10",
  "p7m": "application/pkcs7-mime",
  "p7c": "application/pkcs7-mime",
  "p7s": "application/pkcs7-signature",
  "p8": "application/pkcs8",
  "ac": "application/pkix-attr-cert",
  "cer": "application/pkix-cert",
  "crl": "application/pkix-crl",
  "pkipath": "application/pkix-pkipath",
  "pki": "application/pkixcmp",
  "pls": "application/pls+xml",
  "ai": "application/postscript",
  "eps": "application/postscript",
  "ps": "application/postscript",
  "provx": "application/provenance+xml",
  "cww": "application/prs.cww",
  "pskcxml": "application/pskc+xml",
  "raml": "application/raml+yaml",
  "rdf": "application/rdf+xml",
  "owl": "application/rdf+xml",
  "rif": "application/reginfo+xml",
  "rnc": "application/relax-ng-compact-syntax",
  "rl": "application/resource-lists+xml",
  "rld": "application/resource-lists-diff+xml",
  "rs": "application/rls-services+xml",
  "rapd": "application/route-apd+xml",
  "sls": "application/route-s-tsid+xml",
  "rusd": "application/route-usd+xml",
  "gbr": "application/rpki-ghostbusters",
  "mft": "application/rpki-manifest",
  "roa": "application/rpki-roa",
  "rsd": "application/rsd+xml",
  "rss": "application/rss+xml",
  "rtf": "application/rtf",
  "sbml": "application/sbml+xml",
  "scq": "application/scvp-cv-request",
  "scs": "application/scvp-cv-response",
  "spq": "application/scvp-vp-request",
  "spp": "application/scvp-vp-response",
  "sdp": "application/sdp",
  "senmlx": "application/senml+xml",
  "sensmlx": "application/sensml+xml",
  "setpay": "application/set-payment-initiation",
  "setreg": "application/set-registration-initiation",
  "shf": "application/shf+xml",
  "siv": "application/sieve",
  "sieve": "application/sieve",
  "smi": "application/smil+xml",
  "smil": "application/smil+xml",
  "rq": "application/sparql-query",
  "srx": "application/sparql-results+xml",
  "gram": "application/srgs",
  "grxml": "application/srgs+xml",
  "sru": "application/sru+xml",
  "ssdl": "application/ssdl+xml",
  "ssml": "application/ssml+xml",
  "swidtag": "application/swid+xml",
  "tei": "application/tei+xml",
  "teicorpus": "application/tei+xml",
  "tfi": "application/thraud+xml",
  "tsd": "application/timestamped-data",
  "toml": "application/toml",
  "trig": "application/trig",
  "ttml": "application/ttml+xml",
  "ubj": "application/ubjson",
  "rsheet": "application/urc-ressheet+xml",
  "td": "application/urc-targetdesc+xml",
  "vxml": "application/voicexml+xml",
  "wasm": "application/wasm",
  "wgt": "application/widget",
  "hlp": "application/winhlp",
  "wsdl": "application/wsdl+xml",
  "wspolicy": "application/wspolicy+xml",
  "xaml": "application/xaml+xml",
  "xav": "application/xcap-att+xml",
  "xca": "application/xcap-caps+xml",
  "xdf": "application/xcap-diff+xml",
  "xel": "application/xcap-el+xml",
  "xns": "application/xcap-ns+xml",
  "xenc": "application/xenc+xml",
  "xhtml": "application/xhtml+xml",
  "xht": "application/xhtml+xml",
  "xlf": "application/xliff+xml",
  "xml": "application/xml",
  "xsl": "application/xml",
  "xsd": "application/xml",
  "rng": "application/xml",
  "dtd": "application/xml-dtd",
  "xop": "application/xop+xml",
  "xpl": "application/xproc+xml",
  "xslt": "application/xml",
  "xspf": "application/xspf+xml",
  "mxml": "application/xv+xml",
  "xhvml": "application/xv+xml",
  "xvml": "application/xv+xml",
  "xvm": "application/xv+xml",
  "yang": "application/yang",
  "yin": "application/yin+xml",
  "zip": "application/zip",
  "3gpp": "video/3gpp",
  "adp": "audio/adpcm",
  "amr": "audio/amr",
  "au": "audio/basic",
  "snd": "audio/basic",
  "mid": "audio/midi",
  "midi": "audio/midi",
  "kar": "audio/midi",
  "rmi": "audio/midi",
  "mxmf": "audio/mobile-xmf",
  "mp3": "audio/mpeg",
  "m4a": "audio/mp4",
  "mp4a": "audio/mp4",
  "mpga": "audio/mpeg",
  "mp2": "audio/mpeg",
  "mp2a": "audio/mpeg",
  "m2a": "audio/mpeg",
  "m3a": "audio/mpeg",
  "oga": "audio/ogg",
  "ogg": "audio/ogg",
  "spx": "audio/ogg",
  "opus": "audio/ogg",
  "s3m": "audio/s3m",
  "sil": "audio/silk",
  "wav": "audio/wav",
  "weba": "audio/webm",
  "xm": "audio/xm",
  "ttc": "font/collection",
  "otf": "font/otf",
  "ttf": "font/ttf",
  "woff": "font/woff",
  "woff2": "font/woff2",
  "exr": "image/aces",
  "apng": "image/apng",
  "avif": "image/avif",
  "bmp": "image/bmp",
  "cgm": "image/cgm",
  "drle": "image/dicom-rle",
  "emf": "image/emf",
  "fits": "image/fits",
  "g3": "image/g3fax",
  "gif": "image/gif",
  "heic": "image/heic",
  "heics": "image/heic-sequence",
  "heif": "image/heif",
  "heifs": "image/heif-sequence",
  "hej2": "image/hej2k",
  "hsj2": "image/hsj2",
  "ief": "image/ief",
  "jls": "image/jls",
  "jp2": "image/jp2",
  "jpg2": "image/jp2",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "jpe": "image/jpeg",
  "jph": "image/jph",
  "jhc": "image/jphc",
  "jpm": "image/jpm",
  "jpx": "image/jpx",
  "jpf": "image/jpx",
  "jxr": "image/jxr",
  "jxra": "image/jxra",
  "jxrs": "image/jxrs",
  "jxs": "image/jxs",
  "jxsc": "image/jxsc",
  "jxsi": "image/jxsi",
  "jxss": "image/jxss",
  "ktx": "image/ktx",
  "ktx2": "image/ktx2",
  "png": "image/png",
  "btif": "image/prs.btif",
  "pti": "image/prs.pti",
  "sgi": "image/sgi",
  "svg": "image/svg+xml",
  "svgz": "image/svg+xml",
  "t38": "image/t38",
  "tif": "image/tiff",
  "tiff": "image/tiff",
  "tfx": "image/tiff-fx",
  "webp": "image/webp",
  "wmf": "image/wmf",
  "disposition-notification": "message/disposition-notification",
  "u8msg": "message/global",
  "u8dsn": "message/global-delivery-status",
  "u8mdn": "message/global-disposition-notification",
  "u8hdr": "message/global-headers",
  "eml": "message/rfc822",
  "mime": "message/rfc822",
  "3mf": "model/3mf",
  "gltf": "model/gltf+json",
  "glb": "model/gltf-binary",
  "igs": "model/iges",
  "iges": "model/iges",
  "msh": "model/mesh",
  "mesh": "model/mesh",
  "silo": "model/mesh",
  "mtl": "model/mtl",
  "obj": "model/obj",
  "stpz": "model/step+zip",
  "stpxz": "model/step-xml+zip",
  "stl": "model/stl",
  "wrl": "model/vrml",
  "vrml": "model/vrml",
  "x3db": "model/x3d+fastinfoset",
  "x3dbz": "model/x3d+binary",
  "x3dv": "model/x3d-vrml",
  "x3dvz": "model/x3d+vrml",
  "x3d": "model/x3d+xml",
  "x3dz": "model/x3d+xml",
  "appcache": "text/cache-manifest",
  "manifest": "text/cache-manifest",
  "ics": "text/calendar",
  "ifb": "text/calendar",
  "coffee": "text/coffeescript",
  "litcoffee": "text/coffeescript",
  "css": "text/css",
  "csv": "text/csv",
  "html": "text/html",
  "htm": "text/html",
  "shtml": "text/html",
  "jade": "text/jade",
  "jsx": "text/jsx",
  "less": "text/less",
  "markdown": "text/markdown",
  "md": "text/markdown",
  "mml": "text/mathml",
  "mdx": "text/mdx",
  "n3": "text/n3",
  "txt": "text/plain",
  "text": "text/plain",
  "conf": "text/plain",
  "def": "text/plain",
  "list": "text/plain",
  "log": "text/plain",
  "in": "text/plain",
  "ini": "text/plain",
  "dsc": "text/prs.lines.tag",
  "rtx": "text/richtext",
  "sgml": "text/sgml",
  "sgm": "text/sgml",
  "shex": "text/shex",
  "slim": "text/slim",
  "slm": "text/slim",
  "spdx": "text/spdx",
  "stylus": "text/stylus",
  "styl": "text/stylus",
  "tsv": "text/tab-separated-values",
  "t": "text/troff",
  "tr": "text/troff",
  "roff": "text/troff",
  "man": "text/troff",
  "me": "text/troff",
  "ms": "text/troff",
  "ttl": "text/turtle",
  "uri": "text/uri-list",
  "uris": "text/uri-list",
  "urls": "text/uri-list",
  "vcard": "text/vcard",
  "vtt": "text/vtt",
  "yaml": "text/yaml",
  "yml": "text/yaml",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  "h261": "video/h261",
  "h263": "video/h263",
  "h264": "video/h264",
  "m4s": "video/iso.segment",
  "jpgv": "video/jpeg",
  "jpgm": "image/jpm",
  "mj2": "video/mj2",
  "mjp2": "video/mj2",
  "ts": "video/mp2t",
  "mp4": "video/mp4",
  "mp4v": "video/mp4",
  "mpg4": "video/mp4",
  "mpeg": "video/mpeg",
  "mpg": "video/mpeg",
  "mpe": "video/mpeg",
  "m1v": "video/mpeg",
  "m2v": "video/mpeg",
  "ogv": "video/ogg",
  "qt": "video/quicktime",
  "mov": "video/quicktime",
  "webm": "video/webm"
};
function lookup(extn) {
  let tmp = ("" + extn).trim().toLowerCase();
  let idx = tmp.lastIndexOf(".");
  return mimes[!~idx ? tmp : tmp.substring(++idx)];
}
const noop = () => {
};
function isMatch(uri, arr) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].test(uri))
      return true;
  }
}
function toAssume(uri, extns) {
  let i = 0, x, len = uri.length - 1;
  if (uri.charCodeAt(len) === 47) {
    uri = uri.substring(0, len);
  }
  let arr = [], tmp = `${uri}/index`;
  for (; i < extns.length; i++) {
    x = extns[i] ? `.${extns[i]}` : "";
    if (uri)
      arr.push(uri + x);
    arr.push(tmp + x);
  }
  return arr;
}
function viaCache(cache, uri, extns) {
  let i = 0, data, arr = toAssume(uri, extns);
  for (; i < arr.length; i++) {
    if (data = cache[arr[i]])
      return data;
  }
}
function viaLocal(dir, isEtag, uri, extns) {
  let i = 0, arr = toAssume(uri, extns);
  let abs, stats, name, headers;
  for (; i < arr.length; i++) {
    abs = normalize(join(dir, name = arr[i]));
    if (abs.startsWith(dir) && fs.existsSync(abs)) {
      stats = fs.statSync(abs);
      if (stats.isDirectory())
        continue;
      headers = toHeaders(name, stats, isEtag);
      headers["Cache-Control"] = isEtag ? "no-cache" : "no-store";
      return { abs, stats, headers };
    }
  }
}
function is404(req, res) {
  return res.statusCode = 404, res.end();
}
function send(req, res, file, stats, headers) {
  let code = 200, tmp, opts = {};
  headers = { ...headers };
  for (let key in headers) {
    tmp = res.getHeader(key);
    if (tmp)
      headers[key] = tmp;
  }
  if (tmp = res.getHeader("content-type")) {
    headers["Content-Type"] = tmp;
  }
  if (req.headers.range) {
    code = 206;
    let [x, y] = req.headers.range.replace("bytes=", "").split("-");
    let end = opts.end = parseInt(y, 10) || stats.size - 1;
    let start = opts.start = parseInt(x, 10) || 0;
    if (start >= stats.size || end >= stats.size) {
      res.setHeader("Content-Range", `bytes */${stats.size}`);
      res.statusCode = 416;
      return res.end();
    }
    headers["Content-Range"] = `bytes ${start}-${end}/${stats.size}`;
    headers["Content-Length"] = end - start + 1;
    headers["Accept-Ranges"] = "bytes";
  }
  res.writeHead(code, headers);
  fs.createReadStream(file, opts).pipe(res);
}
const ENCODING = {
  ".br": "br",
  ".gz": "gzip"
};
function toHeaders(name, stats, isEtag) {
  let enc = ENCODING[name.slice(-3)];
  let ctype = lookup(name.slice(0, enc && -3)) || "";
  if (ctype === "text/html")
    ctype += ";charset=utf-8";
  let headers = {
    "Content-Length": stats.size,
    "Content-Type": ctype,
    "Last-Modified": stats.mtime.toUTCString()
  };
  if (enc)
    headers["Content-Encoding"] = enc;
  if (isEtag)
    headers["ETag"] = `W/"${stats.size}-${stats.mtime.getTime()}"`;
  return headers;
}
function sirv(dir, opts = {}) {
  dir = resolve(dir || ".");
  let isNotFound = opts.onNoMatch || is404;
  let setHeaders = opts.setHeaders || noop;
  let extensions = opts.extensions || ["html", "htm"];
  let gzips = opts.gzip && extensions.map((x) => `${x}.gz`).concat("gz");
  let brots = opts.brotli && extensions.map((x) => `${x}.br`).concat("br");
  const FILES = {};
  let fallback = "/";
  let isEtag = !!opts.etag;
  let isSPA = !!opts.single;
  if (typeof opts.single === "string") {
    let idx = opts.single.lastIndexOf(".");
    fallback += !!~idx ? opts.single.substring(0, idx) : opts.single;
  }
  let ignores = [];
  if (opts.ignores !== false) {
    ignores.push(/[/]([A-Za-z\s\d~$._-]+\.\w+){1,}$/);
    if (opts.dotfiles)
      ignores.push(/\/\.\w/);
    else
      ignores.push(/\/\.well-known/);
    [].concat(opts.ignores || []).forEach((x) => {
      ignores.push(new RegExp(x, "i"));
    });
  }
  let cc = opts.maxAge != null && `public,max-age=${opts.maxAge}`;
  if (cc && opts.immutable)
    cc += ",immutable";
  else if (cc && opts.maxAge === 0)
    cc += ",must-revalidate";
  if (!opts.dev) {
    list(dir, (name, abs, stats) => {
      if (/\.well-known[\\+\/]/.test(name))
        ;
      else if (!opts.dotfiles && /(^\.|[\\+|\/+]\.)/.test(name))
        return;
      let headers = toHeaders(name, stats, isEtag);
      if (cc)
        headers["Cache-Control"] = cc;
      FILES["/" + name.normalize().replace(/\\+/g, "/")] = { abs, stats, headers };
    });
  }
  let lookup2 = opts.dev ? viaLocal.bind(0, dir, isEtag) : viaCache.bind(0, FILES);
  return function(req, res, next) {
    let extns = [""];
    let pathname = parse(req).pathname;
    let val = req.headers["accept-encoding"] || "";
    if (gzips && val.includes("gzip"))
      extns.unshift(...gzips);
    if (brots && /(br|brotli)/i.test(val))
      extns.unshift(...brots);
    extns.push(...extensions);
    if (pathname.indexOf("%") !== -1) {
      try {
        pathname = decodeURIComponent(pathname);
      } catch (err) {
      }
    }
    let data = lookup2(pathname, extns) || isSPA && !isMatch(pathname, ignores) && lookup2(fallback, extns);
    if (!data)
      return next ? next() : isNotFound(req, res);
    if (isEtag && req.headers["if-none-match"] === data.headers["ETag"]) {
      res.writeHead(304);
      return res.end();
    }
    if (gzips || brots) {
      res.setHeader("Vary", "Accept-Encoding");
    }
    setHeaders(res, pathname, data.stats);
    send(req, res, data.abs, data.stats, data.headers);
  };
}
const server = polka();
server.use(sirv("dist"));
applyHandler(server);
const { PORT = 3e3 } = process.env;
server.listen(PORT);
console.log(`Ready at http://localhost:${PORT}`);
