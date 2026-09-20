// GENERATED FILE — do not edit. Source: src/index.js. Rebuild: pnpm build (esbuild).
import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

// ../../../../.nvm/versions/node/v22.23.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/cosmokit/lib/index.js
function isNullable(value) {
  return value === null || value === void 0;
}
function isPlainObject(data) {
  return data && typeof data === "object" && !Array.isArray(data);
}
function filterKeys(object, filter) {
  return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
}
function mapValues(object, transform) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
}
function pick(source, keys, forced) {
  if (!keys) return { ...source };
  const result = {};
  for (const key of keys) if (forced || source[key] !== void 0) result[key] = source[key];
  return result;
}
function defineProperty(object, key, value) {
  return Object.defineProperty(object, key, {
    writable: true,
    value,
    enumerable: false
  });
}
function is(type, value) {
  if (arguments.length === 1) return (value2) => is(type, value2);
  return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
}
function isArrayBufferLike(value) {
  return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
}
function isArrayBufferSource(value) {
  return isArrayBufferLike(value) || ArrayBuffer.isView(value);
}
var Binary;
(function(Binary2) {
  Binary2.is = isArrayBufferLike;
  Binary2.isSource = isArrayBufferSource;
  function fromSource(source) {
    if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
    else return source;
  }
  Binary2.fromSource = fromSource;
  function toBase64(source) {
    source = fromSource(source);
    if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
    let binary = "";
    const bytes = new Uint8Array(source);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  Binary2.toBase64 = toBase64;
  function fromBase64(source) {
    if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
    return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
  }
  Binary2.fromBase64 = fromBase64;
  function toHex(source) {
    source = fromSource(source);
    if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
    return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  Binary2.toHex = toHex;
  function fromHex(source) {
    if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
    const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
    const buffer = [];
    for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
    return Uint8Array.from(buffer).buffer;
  }
  Binary2.fromHex = fromHex;
})(Binary || (Binary = {}));
var base64ToArrayBuffer = Binary.fromBase64;
var arrayBufferToBase64 = Binary.toBase64;
var hexToArrayBuffer = Binary.fromHex;
var arrayBufferToHex = Binary.toHex;
function clone(source, refs = /* @__PURE__ */ new Map()) {
  if (!source || typeof source !== "object") return source;
  if (is("Date", source)) return new Date(source.valueOf());
  if (is("RegExp", source)) return new RegExp(source.source, source.flags);
  if (isArrayBufferLike(source)) return source.slice(0);
  if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  const cached = refs.get(source);
  if (cached) return cached;
  if (Array.isArray(source)) {
    const result2 = [];
    refs.set(source, result2);
    source.forEach((value, index) => {
      result2[index] = Reflect.apply(clone, null, [value, refs]);
    });
    return result2;
  }
  const result = Object.create(Object.getPrototypeOf(source));
  refs.set(source, result);
  for (const key of Reflect.ownKeys(source)) {
    const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
    if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
    Reflect.defineProperty(result, key, descriptor);
  }
  return result;
}
function deepEqual(a, b, strict) {
  if (a === b) return true;
  if (!strict && isNullable(a) && isNullable(b)) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (!a || !b) return false;
  function check(test, then) {
    return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
  }
  return check(Array.isArray, (a2, b2) => a2.length === b2.length && a2.every((item, index) => deepEqual(item, b2[index]))) ?? check(is("Date"), (a2, b2) => a2.valueOf() === b2.valueOf()) ?? check(is("RegExp"), (a2, b2) => a2.source === b2.source && a2.flags === b2.flags) ?? check(isArrayBufferLike, (a2, b2) => {
    if (a2.byteLength !== b2.byteLength) return false;
    const viewA = new Uint8Array(a2);
    const viewB = new Uint8Array(b2);
    for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
    return true;
  }) ?? Object.keys({
    ...a,
    ...b
  }).every((key) => deepEqual(a[key], b[key], strict));
}
function tokenize(source, delimiters, delimiter) {
  const output = [];
  let state = 0;
  for (let i = 0; i < source.length; i++) {
    const code = source.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      if (state === 1) {
        const next = source.charCodeAt(i + 1);
        if (next >= 97 && next <= 122) output.push(delimiter);
        output.push(code + 32);
      } else {
        if (state !== 0) output.push(delimiter);
        output.push(code + 32);
      }
      state = 1;
    } else if (code >= 97 && code <= 122) {
      output.push(code);
      state = 2;
    } else if (delimiters.includes(code)) {
      if (state !== 0) output.push(delimiter);
      state = 0;
    } else output.push(code);
  }
  return String.fromCharCode(...output);
}
function paramCase(source) {
  return tokenize(source, [45, 95], 45);
}
var hyphenate = paramCase;
var Time;
(function(Time2) {
  Time2.millisecond = 1;
  Time2.second = 1e3;
  Time2.minute = Time2.second * 60;
  Time2.hour = Time2.minute * 60;
  Time2.day = Time2.hour * 24;
  Time2.week = Time2.day * 7;
  let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
  function setTimezoneOffset(offset) {
    timezoneOffset = offset;
  }
  Time2.setTimezoneOffset = setTimezoneOffset;
  function getTimezoneOffset() {
    return timezoneOffset;
  }
  Time2.getTimezoneOffset = getTimezoneOffset;
  function getDateNumber(date2 = /* @__PURE__ */ new Date(), offset) {
    if (typeof date2 === "number") date2 = new Date(date2);
    if (offset === void 0) offset = timezoneOffset;
    return Math.floor((date2.valueOf() / Time2.minute - offset) / 1440);
  }
  Time2.getDateNumber = getDateNumber;
  function fromDateNumber(value, offset) {
    const date2 = new Date(value * Time2.day);
    if (offset === void 0) offset = timezoneOffset;
    return new Date(+date2 + offset * Time2.minute);
  }
  Time2.fromDateNumber = fromDateNumber;
  const numeric = /\d+(?:\.\d+)?/.source;
  const timeRegExp = new RegExp(`^${[
    "w(?:eek(?:s)?)?",
    "d(?:ay(?:s)?)?",
    "h(?:our(?:s)?)?",
    "m(?:in(?:ute)?(?:s)?)?",
    "s(?:ec(?:ond)?(?:s)?)?"
  ].map((unit) => `(${numeric}${unit})?`).join("")}$`);
  function parseTime(source) {
    const capture = timeRegExp.exec(source);
    if (!capture) return 0;
    return (parseFloat(capture[1]) * Time2.week || 0) + (parseFloat(capture[2]) * Time2.day || 0) + (parseFloat(capture[3]) * Time2.hour || 0) + (parseFloat(capture[4]) * Time2.minute || 0) + (parseFloat(capture[5]) * Time2.second || 0);
  }
  Time2.parseTime = parseTime;
  function parseDate(date2) {
    const parsed = parseTime(date2);
    if (parsed) date2 = Date.now() + parsed;
    else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date2)) date2 = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date2}`;
    else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date2)) date2 = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date2}`;
    return date2 ? new Date(date2) : /* @__PURE__ */ new Date();
  }
  Time2.parseDate = parseDate;
  function format(ms) {
    const abs = Math.abs(ms);
    if (abs >= Time2.day - Time2.hour / 2) return Math.round(ms / Time2.day) + "d";
    else if (abs >= Time2.hour - Time2.minute / 2) return Math.round(ms / Time2.hour) + "h";
    else if (abs >= Time2.minute - Time2.second / 2) return Math.round(ms / Time2.minute) + "m";
    else if (abs >= Time2.second) return Math.round(ms / Time2.second) + "s";
    return ms + "ms";
  }
  Time2.format = format;
  function toDigits(source, length = 2) {
    return source.toString().padStart(length, "0");
  }
  Time2.toDigits = toDigits;
  function template(template2, time = /* @__PURE__ */ new Date()) {
    return template2.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
  }
  Time2.template = template;
})(Time || (Time = {}));

// ../../../../.nvm/versions/node/v22.23.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/cordis/lib/index.js
var DisposableList = class {
  sn = 0;
  map = /* @__PURE__ */ new Map();
  weak = /* @__PURE__ */ new WeakMap();
  get length() {
    return this.map.size;
  }
  push(value) {
    const sn = ++this.sn;
    this.map.set(sn, value);
    this.weak.set(value, sn);
    return () => this.map.delete(sn);
  }
  delete(value) {
    const sn = this.weak.get(value);
    if (!sn) return false;
    return this.map.delete(sn);
  }
  clear() {
    const values = [...this.map.values()];
    this.map.clear();
    return values.reverse();
  }
  [Symbol.iterator]() {
    return this.map.values();
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return [...this];
  }
};
var symbols = {
  shadow: /* @__PURE__ */ Symbol.for("cordis.shadow"),
  receiver: /* @__PURE__ */ Symbol.for("cordis.receiver"),
  original: /* @__PURE__ */ Symbol.for("cordis.original"),
  metadata: /* @__PURE__ */ Symbol.for("cordis.metadata"),
  initHooks: /* @__PURE__ */ Symbol.for("cordis.initHooks"),
  checkProto: /* @__PURE__ */ Symbol.for("cordis.checkProto"),
  effect: /* @__PURE__ */ Symbol.for("cordis.effect"),
  filter: /* @__PURE__ */ Symbol.for("cordis.filter"),
  isolate: /* @__PURE__ */ Symbol.for("cordis.isolate"),
  intercept: /* @__PURE__ */ Symbol.for("cordis.intercept"),
  init: /* @__PURE__ */ Symbol.for("cordis.init"),
  check: /* @__PURE__ */ Symbol.for("cordis.check"),
  config: /* @__PURE__ */ Symbol.for("cordis.config"),
  invoke: /* @__PURE__ */ Symbol.for("cordis.invoke"),
  extend: /* @__PURE__ */ Symbol.for("cordis.extend"),
  tracker: /* @__PURE__ */ Symbol.for("cordis.tracker"),
  resolveConfig: /* @__PURE__ */ Symbol.for("cordis.resolveConfig")
};
var GeneratorFunction = function* () {
}.constructor;
var AsyncGeneratorFunction = async function* () {
}.constructor;
function isConstructor(func) {
  if (!func.prototype) return false;
  if (func instanceof GeneratorFunction) return false;
  if (AsyncGeneratorFunction !== Function && func instanceof AsyncGeneratorFunction) return false;
  return true;
}
function joinPrototype(proto1, proto2) {
  if (proto1 === Object.prototype) return proto2;
  const result = Object.create(joinPrototype(Object.getPrototypeOf(proto1), proto2));
  for (const key of Reflect.ownKeys(proto1)) Object.defineProperty(result, key, Object.getOwnPropertyDescriptor(proto1, key));
  return result;
}
function isObject(value) {
  return value && (typeof value === "object" || typeof value === "function");
}
function getPropertyDescriptor(target, prop) {
  let proto = target;
  while (proto) {
    const desc = Reflect.getOwnPropertyDescriptor(proto, prop);
    if (desc) return desc;
    proto = Object.getPrototypeOf(proto);
  }
}
function getTraceable(ctx, value) {
  if (!isObject(value)) return value;
  if (Object.hasOwn(value, symbols.shadow)) return Object.getPrototypeOf(value);
  const tracker = value[symbols.tracker];
  if (!tracker) return value;
  return createTraceable(ctx, value, tracker);
}
function withProps(target, props) {
  if (!props) return target;
  return new Proxy(target, {
    get: (target2, prop, receiver) => {
      if (prop in props && prop !== "constructor") return Reflect.get(props, prop, receiver);
      return Reflect.get(target2, prop, receiver);
    },
    set: (target2, prop, value, receiver) => {
      if (prop in props && prop !== "constructor") return Reflect.set(props, prop, value, receiver);
      return Reflect.set(target2, prop, value, receiver);
    }
  });
}
function withProp(target, prop, value) {
  return withProps(target, Object.defineProperty(/* @__PURE__ */ Object.create(null), prop, {
    value,
    writable: false
  }));
}
function createShadow(ctx, target, property2, receiver) {
  if (!property2) return receiver;
  const origin = Reflect.getOwnPropertyDescriptor(target, property2)?.value;
  if (!origin) return receiver;
  return withProp(receiver, property2, ctx.extend({ [symbols.shadow]: origin }));
}
function createShadowMethod(ctx, value, outer, shadow) {
  return new Proxy(value, { apply: (target, thisArg, args) => {
    if (thisArg === outer) thisArg = shadow;
    return getTraceable(ctx, Reflect.apply(target, thisArg, args));
  } });
}
function createTraceable(ctx, value, tracker) {
  if (ctx[symbols.shadow] && !tracker.noShadow) ctx = Object.getPrototypeOf(ctx);
  const proxy = new Proxy(value, {
    get: (target, prop, receiver) => {
      if (prop === symbols.original) return target;
      if (prop === tracker.property) return ctx;
      if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
      if (tracker.associate && ctx.reflect.props[`${tracker.associate}.${prop}`]) return Reflect.get(ctx, `${tracker.associate}.${prop}`, withProp(ctx, symbols.receiver, receiver));
      let shadow, innerValue;
      const desc = getPropertyDescriptor(target, prop);
      if (desc && "value" in desc) innerValue = desc.value;
      else {
        shadow = createShadow(ctx, target, tracker.property, receiver);
        innerValue = Reflect.get(target, prop, shadow);
      }
      const innerTracker = innerValue?.[symbols.tracker];
      if (innerTracker) return createTraceable(ctx, innerValue, innerTracker);
      else if (!tracker.noShadow && typeof innerValue === "function") {
        shadow ??= createShadow(ctx, target, tracker.property, receiver);
        return createShadowMethod(ctx, innerValue, receiver, shadow);
      } else return innerValue;
    },
    set: (target, prop, value2, receiver) => {
      if (prop === symbols.original) return false;
      if (prop === tracker.property) return false;
      if (typeof prop === "symbol") return Reflect.set(target, prop, value2, receiver);
      if (tracker.associate && ctx.reflect.props[`${tracker.associate}.${prop}`]) return Reflect.set(ctx, `${tracker.associate}.${prop}`, value2, withProp(ctx, symbols.receiver, receiver));
      const shadow = createShadow(ctx, target, tracker.property, receiver);
      return Reflect.set(target, prop, value2, shadow);
    },
    apply: (target, thisArg, args) => {
      return applyTraceable(proxy, target, thisArg, args);
    }
  });
  return proxy;
}
function applyTraceable(proxy, value, thisArg, args) {
  if (!value[symbols.invoke]) return Reflect.apply(value, thisArg, args);
  return value[symbols.invoke].apply(proxy, args);
}
function createCallable(name, proto, tracker) {
  const self = function(...args) {
    return applyTraceable(createTraceable(self["ctx"], self, tracker), self, this, args);
  };
  defineProperty(self, "name", name);
  return Object.setPrototypeOf(self, proto);
}
function handleError(info, reason, getOuterStack) {
  const innerLines = info.error.stack.split("\n");
  if (typeof reason?.stack !== "string") {
    const outerError = new Error(reason);
    const lines2 = outerError.stack.split("\n");
    lines2.splice(1, Infinity, ...getOuterStack());
    outerError.stack = lines2.join("\n");
    throw outerError;
  }
  const lines = reason.stack.split("\n");
  let index = lines.indexOf(innerLines[2]);
  if (index === -1) throw reason;
  index -= info.offset;
  while (index > 0) {
    if (!lines[index - 1].endsWith(" (<anonymous>)")) break;
    index -= 1;
  }
  lines.splice(index, Infinity, ...getOuterStack());
  reason.stack = lines.join("\n");
  throw reason;
}
function composeError(callback, getOuterStack = buildOuterStack()) {
  const info = {
    offset: 1,
    error: /* @__PURE__ */ new Error()
  };
  try {
    const result = callback(info);
    if (isObject(result) && "then" in result) return result.then(void 0, (reason) => handleError(info, reason, getOuterStack));
    else return result;
  } catch (reason) {
    handleError(info, reason, getOuterStack);
  }
}
function buildOuterStack(offset = 0) {
  const outerError = /* @__PURE__ */ new Error();
  return () => outerError.stack.split("\n").slice(3 + offset);
}
function isBailed(value) {
  return value !== null && value !== false && value !== void 0;
}
var EventsService = class {
  ctx;
  _hooks = {};
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols.tracker, {
      property: "ctx",
      noShadow: true
    });
    this.on("internal/listener", function(name, listener, options) {
      if (name === "internal/update" && !options.global) return (this.fiber._hooks["internal/update"] ??= new DisposableList())[options.prepend ? "unshift" : "push"](listener);
    });
    this.on("internal/update", function(config, noSave, next) {
      const cbs = [...this._hooks["internal/update"] || []];
      const _next = () => {
        return (cbs.shift() ?? next).call(this, config, noSave, _next);
      };
      return _next();
    }, {
      global: true,
      prepend: true
    });
  }
  /**
  * Resolve listeners for one dispatch and apply context filtering.
  *
  * @param type — the dispatch mode, reported on `internal/dispatch`.
  * @param args — the raw dispatch arguments; consumed up to the event name.
  * @returns the matching listener callbacks, bound to the dispatch `this`.
  */
  dispatch(type, args) {
    const thisArg = typeof args[0] === "object" || typeof args[0] === "function" ? args.shift() : null;
    const name = args.shift();
    if (!name.startsWith("internal/")) this.emit("internal/dispatch", type, name, args, thisArg);
    const filter = thisArg?.[Context.filter];
    return (this._hooks[name] || []).filter((hook) => hook.global || !filter || filter.call(thisArg, hook.ctx)).map((hook) => hook.callback.bind(thisArg));
  }
  /**
  * Run listeners concurrently and wait for all of them.
  *
  * @param args — optional `this`, the event name, then listener arguments.
  * @returns a promise resolving once every listener has settled.
  */
  async parallel(...args) {
    const errors = (await Promise.allSettled(this.dispatch("emit", args).map(async (cb) => cb(...args)))).filter((result) => result.status === "rejected");
    if (errors.length) throw new AggregateError(errors.map((error) => error.reason));
  }
  /**
  * Run listeners synchronously without waiting for returned promises.
  *
  * @param args — optional `this`, the event name, then listener arguments.
  */
  emit(...args) {
    this.dispatch("emit", args).map((cb) => cb(...args));
  }
  /**
  * Run listeners in order, awaiting each, until one returns a bail value.
  *
  * @param args — optional `this`, the event name, then listener arguments.
  * @returns the first bail value (see {@link isBailed}), if any.
  */
  async serial(...args) {
    for (const cb of this.dispatch("serial", args)) {
      const result = await cb(...args);
      if (isBailed(result)) return result;
    }
  }
  /**
  * Run listeners synchronously until one returns a bail value.
  *
  * @param args — optional `this`, the event name, then listener arguments.
  * @returns the first bail value (see {@link isBailed}), if any.
  */
  bail(...args) {
    for (const cb of this.dispatch("bail", args)) {
      const result = cb(...args);
      if (isBailed(result)) return result;
    }
  }
  /**
  * Compose listeners around the final `next` callback.
  *
  * The last dispatch argument is treated as the innermost `next`. Listeners
  * run outermost-first; a listener that does not call `next()` vetoes the
  * rest of the chain, including the built-in behavior.
  *
  * @param args — optional `this`, the event name, listener arguments, then `next`.
  * @returns the outermost listener's return value.
  */
  waterfall(...args) {
    const cbs = this.dispatch("waterfall", args);
    const inner = args.pop();
    const next = () => {
      return (cbs.shift() ?? inner)(...args);
    };
    args.push(next);
    return next();
  }
  /**
  * Store a listener record as an effect on the current fiber.
  *
  * @param label — effect label shown in fiber diagnostics.
  * @param hooks — the listener list for one event.
  * @param callback — the listener to store.
  * @param options — placement and filtering options.
  * @returns a disposer that unregisters the listener.
  */
  register(label, hooks, callback, options) {
    const method = options.prepend ? "unshift" : "push";
    return this.ctx.fiber.effect(() => {
      hooks[method]({
        ctx: this.ctx,
        callback,
        ...options
      });
      return () => this.unregister(hooks, callback);
    }, label);
  }
  /**
  * Remove a stored listener record.
  *
  * @param hooks — the listener list for one event.
  * @param callback — the listener to remove.
  * @returns `true` if the listener was found and removed.
  */
  unregister(hooks, callback) {
    const index = hooks.findIndex((hook) => hook.callback === callback);
    if (index >= 0) {
      hooks.splice(index, 1);
      return true;
    }
  }
  /**
  * Register an event listener owned by the current fiber.
  *
  * The listener is removed automatically when the fiber unloads. Throws
  * `CordisError('INACTIVE_EFFECT')` if the fiber is already disposed.
  *
  * @param name — the event name to listen for.
  * @param listener — called with the dispatch arguments.
  * @param options — listener options; a boolean is shorthand for `prepend`.
  * @returns a disposer removing the listener; `true` if it was still registered.
  */
  on(name, listener, options) {
    if (typeof options !== "object") options = { prepend: options };
    this.ctx.fiber.assertActive();
    listener = this.ctx.reflect.bind(listener);
    const result = this.bail(this.ctx, "internal/listener", name, listener, options);
    if (result) return result;
    const hooks = this._hooks[name] ||= [];
    const label = `ctx.on(${typeof name === "string" ? JSON.stringify(name) : name.toString()})`;
    return this.register(label, hooks, listener, options);
  }
  /**
  * Register an event listener that disposes itself after the first call.
  *
  * @param name — the event name to listen for.
  * @param listener — called at most once with the dispatch arguments.
  * @param options — listener options; a boolean is shorthand for `prepend`.
  * @returns a disposer removing the listener; `true` if it was still registered.
  */
  once(name, listener, options) {
    const dispose = this.on(name, function(...args) {
      dispose();
      return listener.apply(this, args);
    }, options);
    return dispose;
  }
};
var defaultFormatters = {
  s: (value) => String(value),
  d: (value) => Math.trunc(Number(value)),
  i: (value) => Math.trunc(Number(value)),
  f: (value) => Number(value),
  o: (value) => JSON.stringify(value),
  O: (value) => JSON.stringify(value),
  c: () => "",
  C: (value, exporter, message) => {
    return Logger.color(exporter, Logger.code(message.name, exporter.colors), value);
  }
};
function isAggregateError(error) {
  return error instanceof Error && Array.isArray(error["errors"]);
}
var Logger = class {
  service;
  static color(exporter, code, value, decoration = "") {
    if (!exporter.colors) return "" + value;
    return `\x1B[3${code < 8 ? code : "8;5;" + code}${exporter.colors >= 2 ? decoration : ""}m${value}\x1B[0m`;
  }
  static code(name, level) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 3) - hash + name.charCodeAt(i) + 13;
      hash |= 0;
    }
    const colors = !level ? [] : level >= 2 ? c256 : c16;
    return colors[Math.abs(hash) % colors.length];
  }
  static format(exporter, message) {
    const args = message.args.slice();
    if (args[0] instanceof Error) {
      args[0] = args[0].stack || args[0].message;
      args.unshift("%s");
    } else if (typeof args[0] !== "string") args.unshift("%o");
    let format = args.shift();
    format = format.replace(/%([a-zA-Z%])/g, (match, char) => {
      if (match === "%%") return "%";
      const formatter = exporter.formatters?.[char] ?? defaultFormatters[char];
      if (typeof formatter === "function") return formatter(args.shift(), exporter, message);
      return match;
    });
    const oFormatter = exporter.formatters?.o ?? defaultFormatters.o;
    for (let arg of args) {
      if (typeof arg === "object" && arg) arg = oFormatter(arg, exporter, message);
      format += " " + arg;
    }
    const { maxLength = 10240 } = exporter;
    return format.split(/\r?\n/g).map((line) => {
      return line.slice(0, maxLength) + (line.length > maxLength ? "..." : "");
    }).join("\n");
  }
  constructor(options, service) {
    this.service = service;
    Object.assign(this, options);
    this.error = this._method("error", 0);
    this.info = this._method("info", 1);
    this.warn = this._method("warn", 2);
    this.debug = this._method("debug", 3);
  }
  _method(type, level) {
    return (...args) => {
      if (args.length === 1 && args[0] instanceof Error) {
        if (args[0].cause) this[type](args[0].cause);
        else if (isAggregateError(args[0])) {
          args[0].errors.forEach((error) => this[type](error));
          return;
        }
      }
      const sn = ++this.service._snMessage;
      const ts = Date.now();
      for (const exporter of this.service.exporters.values()) {
        if ((exporter.levels?.[this.name] ?? exporter.levels?.default ?? this.level ?? 1) < level) continue;
        const message = {
          sn,
          ts,
          type,
          level,
          name: this.name,
          ...this.meta,
          args
        };
        exporter.export(message);
      }
    };
  }
};
var c16 = [
  6,
  2,
  3,
  4,
  5,
  1
];
var c256 = [
  20,
  21,
  26,
  27,
  32,
  33,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  56,
  57,
  62,
  63,
  68,
  69,
  74,
  75,
  76,
  77,
  78,
  79,
  80,
  81,
  92,
  93,
  98,
  99,
  112,
  113,
  129,
  134,
  135,
  148,
  149,
  160,
  161,
  162,
  163,
  164,
  165,
  166,
  167,
  168,
  169,
  170,
  171,
  172,
  173,
  178,
  179,
  184,
  185,
  196,
  197,
  198,
  199,
  200,
  201,
  202,
  203,
  204,
  205,
  206,
  207,
  208,
  209,
  214,
  215,
  220,
  221
];
var LoggerService = class LoggerService2 {
  bufferSize = 1e3;
  buffer = [];
  ctx;
  _snMessage = 0;
  _snExporter = 0;
  exporters = /* @__PURE__ */ new Map();
  constructor(ctx) {
    const tracker = {
      property: "ctx",
      noShadow: true
    };
    const self = createCallable("logger", joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
    Object.assign(self, this);
    self.ctx = ctx;
    defineProperty(self, symbols.tracker, tracker);
    self.exporter({
      colors: 3,
      export: (message) => {
        self.buffer.push(message);
        if (self.buffer.length > self.bufferSize) self.buffer = self.buffer.slice(-self.bufferSize);
      }
    });
    return self;
  }
  /**
  * Register an exporter and dispose it with the current fiber.
  *
  * @param exporter — the sink that receives structured log messages.
  * @returns a disposer that removes the exporter.
  */
  exporter(exporter) {
    return this.ctx.effect(() => {
      this.exporters.set(++this._snExporter, exporter);
      return () => this.exporters.delete(this._snExporter);
    }, "ctx.logger.exporter()");
  }
  _resolveConfig() {
    let intercept = this.ctx[symbols.intercept];
    const configs = [];
    while ("logger" in intercept) {
      if (Object.hasOwn(intercept, "logger")) configs.unshift(intercept["logger"]);
      intercept = Object.getPrototypeOf(intercept);
    }
    return Object.assign({}, ...configs);
  }
  [symbols.invoke](name) {
    const config = this._resolveConfig();
    const fiber = (this.ctx[symbols.shadow] ?? this.ctx).fiber;
    name ??= config.name;
    name ??= hyphenate(fiber.name);
    return new Logger({
      name,
      level: config.level,
      meta: { fiber: new WeakRef(fiber) }
    }, this);
  }
  static {
    for (const type of [
      "error",
      "info",
      "warn",
      "debug"
    ]) LoggerService2.prototype[type] = function(...args) {
      return this()[type](...args);
    };
  }
};
function enhanceError(error) {
  const lines = error.stack.split("\n");
  lines.splice(0, 2, `Error: ${error.message}`);
  error.stack = lines.join("\n");
  return error;
}
var RESERVED_WORDS = ["prototype", "then"];
function isSpecialProperty(prop) {
  return typeof prop === "symbol" || RESERVED_WORDS.includes(prop) || parseInt(prop).toString() === prop || prop.startsWith("_");
}
var ReflectService = class {
  ctx;
  /** Proxy traps implementing service resolution for every context object. */
  static handler = {
    get: (target, prop, ctx) => {
      if (isSpecialProperty(prop)) return Reflect.get(target, prop, ctx);
      if (Reflect.has(target, prop)) return getTraceable(ctx, Reflect.get(target, prop, ctx));
      const error = /* @__PURE__ */ new Error(`cannot get property "${prop}" without inject`);
      try {
        const def = target.reflect.props[prop];
        if (def?.type === "accessor") return def.get.call(ctx, ctx[symbols.receiver], error);
        if (!ctx.fiber.runtime) return ctx.reflect.get(prop, false);
        return ctx.events.waterfall("internal/get", ctx, prop, error, () => {
          const key = target[symbols.isolate][prop];
          let fiber = (ctx[symbols.shadow] ?? ctx).fiber;
          while (true) {
            const impl = fiber.store?.[prop];
            if (impl) return getTraceable(ctx, impl.value);
            if (prop in fiber.inject) {
              error.message = `cannot get required service "${prop}" in inactive context`;
              throw error;
            }
            if (!fiber.runtime) throw error;
            if (fiber.parent[symbols.isolate][prop] !== key) throw error;
            fiber = fiber.parent.fiber;
          }
        });
      } catch (e) {
        throw e === error ? enhanceError(e) : e;
      }
    },
    set: (target, prop, value, ctx) => {
      if (isSpecialProperty(prop)) return Reflect.set(target, prop, value, ctx);
      const error = /* @__PURE__ */ new Error(`cannot set property "${prop}" without provide`);
      const def = target.reflect.props[prop];
      if (!def) {
        if (!ctx.fiber.runtime) return Reflect.set(target, prop, value, ctx);
        throw enhanceError(error);
      }
      try {
        if (def.type === "accessor") {
          if (!def.set) return false;
          return def.set.call(ctx, value, ctx[symbols.receiver], error);
        }
        return ctx.events.waterfall("internal/set", ctx, prop, value, error, () => {
          return ctx.reflect.set(prop, value, error);
        });
      } catch (e) {
        throw e === error ? enhanceError(e) : e;
      }
    },
    has: (target, prop) => {
      if (isSpecialProperty(prop)) return Reflect.has(target, prop);
      if (Reflect.has(target, prop)) return true;
      return !!target.reflect.props[prop];
    }
  };
  /** Service implementations, keyed by isolation label. */
  store = /* @__PURE__ */ Object.create(null);
  /** Declared context properties (services and accessors), by name. */
  props = /* @__PURE__ */ Object.create(null);
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols.tracker, {
      property: "ctx",
      noShadow: true
    });
    this.mixin("reflect", [
      "get",
      "set",
      "provide",
      "accessor",
      "mixin"
    ]);
    this.mixin("fiber", ["runtime", "effect"]);
    this.mixin("registry", ["inject", "plugin"]);
    this.mixin("events", [
      "on",
      "once",
      "parallel",
      "emit",
      "serial",
      "bail",
      "waterfall"
    ]);
  }
  /**
  * Read a service from the store without the inject requirement.
  *
  * @param name — the service name.
  * @param strict — when `true`, only return implementations whose providing
  * fiber is currently active.
  * @returns the service value, or `undefined` when not (yet) provided.
  */
  get(name, strict = true) {
    return getTraceable(this.ctx, this._getImpl(name, strict)?.value);
  }
  _getImpl(name, strict = true) {
    const key = this.ctx[symbols.isolate][name];
    const impl = key && this.store[key];
    if (!impl) return;
    if (strict && impl.fiber.state !== 2) return;
    return impl;
  }
  /**
  * Overwrite a provided service's value.
  *
  * @param name — the service name.
  * @param value — the new service value.
  * @param error — carrier for the caller stack in diagnostics.
  * @returns `true` on success.
  * @throws when `name` was never provided, or was provided by another fiber.
  */
  set(name, value, error) {
    const key = this.ctx[symbols.isolate][name];
    const impl = this.store[key];
    if (!impl) throw new Error(`cannot set property "${name}" without provide`);
    if (impl.fiber !== this.ctx.fiber) throw new Error(`cannot set property "${name}" in multiple fibers`);
    impl.value = value;
    return true;
  }
  /**
  * Register a service implementation owned by the current fiber.
  *
  * See the `ctx.provide()` overload above for the full contract.
  *
  * @param name — the service name.
  * @param value — the service value.
  * @param check — optional availability predicate for dependents.
  * @returns a disposer that unregisters the service.
  */
  provide(name, value, check) {
    return this.ctx.fiber.effect(() => {
      if (!this.props[name]) this.props[name] ??= { type: "service" };
      else if (this.props[name].type !== "service") throw new Error(`property "${name}" is already declared as ${this.props[name].type}`);
      this.props[name] = { type: "service" };
      this.ctx.root[symbols.isolate][name] ??= Symbol(name);
      const key = this.ctx[symbols.isolate][name];
      const impl = {
        name,
        value,
        fiber: this.ctx.fiber,
        check
      };
      if (this.store[key]) throw new Error(`service "${name}" has been registered at <${this.store[key].fiber.name}>`);
      this.store[key] = impl;
      this.ctx.fiber.store[name] = impl;
      if (this.ctx.fiber.state === 2) this.notify([name]);
      return async () => {
        delete this.store[key];
        const fibers = this.notify([name]);
        await Promise.allSettled(fibers.map((fiber) => fiber.await()));
        delete this.ctx.fiber.store[name];
      };
    }, `ctx.provide(${JSON.stringify(name)})`);
  }
  /**
  * Re-evaluate every fiber that requires one of the given services.
  *
  * @param names — the service names that changed.
  * @param filter — restricts notification to matching isolation scopes.
  * @returns the fibers whose dependency state was refreshed.
  */
  notify(names, filter = (ctx, name) => ctx[symbols.isolate][name] === this.ctx[symbols.isolate][name]) {
    const fibers = [];
    for (const runtime of this.ctx.registry.values()) for (const fiber of runtime.fibers) {
      let hasUpdate = false;
      for (const name of names) {
        if (!(name in fiber.inject)) continue;
        if (!filter(fiber.ctx, name)) continue;
        hasUpdate = true;
        fiber._checkImpl(name);
      }
      if (!hasUpdate) continue;
      fiber._refresh();
      fibers.push(fiber);
    }
    for (const name of names) {
      const self = Object.create(this.ctx);
      self[symbols.filter] = (target) => filter(target, name);
      this.ctx.events.emit(self, "internal/service", name, this._getImpl(name, false)?.value);
    }
    return fibers;
  }
  /**
  * Define a computed context property backed by get/set hooks.
  *
  * @param name — the context property name.
  * @param options — the `get` hook and optional `set` hook.
  * @returns a disposer that removes the accessor.
  */
  accessor(name, options) {
    return this.ctx.fiber.effect(() => {
      if (name in this.props) throw new Error(`property "${name}" is already declared as ${this.props[name].type}`);
      this.props[name] = {
        type: "accessor",
        ...options
      };
      return () => delete this.props[name];
    }, `ctx.accessor(${JSON.stringify(name)})`);
  }
  /**
  * Expose selected members of a service directly on `ctx`.
  *
  * See the `ctx.mixin()` overload above for the full contract.
  *
  * @param source — a context property name or a source object.
  * @param mixins — keys to forward, or a source-key → ctx-key map.
  * @returns a disposer that removes all created accessors.
  */
  mixin(source, mixins) {
    const self = this;
    return this.ctx.fiber.effect(function* () {
      const entries = Array.isArray(mixins) ? mixins.map((key) => [key, key]) : Object.entries(mixins);
      const getTarget = (ctx, error) => {
        return ctx[source];
      };
      for (const [key, value] of entries) yield self.accessor(value, {
        get(receiver, error) {
          const service = getTarget(this, error);
          if (isNullable(service)) return service;
          const mixin = receiver ? withProps(receiver, service) : service;
          const value2 = Reflect.get(service, key, mixin);
          if (typeof value2 !== "function") return value2;
          return value2.bind(mixin ?? service);
        },
        set(value2, receiver, error) {
          const service = getTarget(this, error);
          const mixin = receiver ? withProps(receiver, service) : service;
          return Reflect.set(service, key, value2, mixin);
        }
      });
    }, `ctx.mixin(${JSON.stringify(source)})`);
  }
  /**
  * Attach this context's tracing wrapper to a value.
  *
  * @param value — the value to wrap.
  * @returns the traceable wrapper (or the value itself when not applicable).
  */
  trace(value) {
    return getTraceable(this.ctx, value);
  }
  /**
  * Wrap a callback so calls trace `this` and arguments to this context.
  *
  * @param callback — the function to wrap.
  * @returns a proxy delegating to `callback` with traced values.
  */
  bind(callback) {
    return new Proxy(callback, {
      apply: (target, thisArg, args) => {
        return Reflect.apply(target, this.trace(thisArg), args.map((arg) => this.trace(arg)));
      },
      construct: (target, args, newTarget) => {
        return Reflect.construct(target, args.map((arg) => this.trace(arg)), newTarget);
      }
    });
  }
};
var kValidationError = /* @__PURE__ */ Symbol.for("ValidationError");
var ValidationError = class extends TypeError {
  name = "ValidationError";
  /**
  * Build the aggregated message from schema issues.
  *
  * @param issues — the standard-schema issues, one message line each.
  */
  constructor(issues) {
    super(`invalid config:
` + issues.map((issue) => {
      if (issue.path) return `  - ${issue.message} (at ${issue.path.join(".")})`;
      else return `  - ${issue.message}`;
    }).join("\n"));
  }
};
Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
function resolveConfig(runtime, config) {
  if (!runtime.Config) return config;
  const result = runtime.Config["~standard"].validate(config);
  if ("then" in result) throw new TypeError("Async config validation is not supported");
  if (result.issues) throw new ValidationError(result.issues);
  else return result.value;
}
var effectInertia = /* @__PURE__ */ new WeakMap();
function runDisposable(dispose) {
  const result = dispose();
  return effectInertia.get(dispose)?.() ?? result;
}
function emitPluginDisposed(context, fiber) {
  const args = ["internal/plugin", fiber];
  let callbacks;
  try {
    callbacks = context.events.dispatch("emit", args);
  } catch (error) {
    context.logger.error(error);
    return;
  }
  for (const callback of callbacks) try {
    const returned = callback(...args);
    Promise.resolve(returned).catch((error) => context.logger.error(error));
  } catch (error) {
    context.logger.error(error);
  }
}
var CordisError = class CordisError2 extends Error {
  code;
  /**
  * @param code — the stable error code; also the default message.
  * @param message — optional human-readable override.
  */
  constructor(code, message) {
    super(message ?? CordisError2.Code[code]);
    this.code = code;
  }
};
(function(CordisError3) {
  CordisError3.Code = { INACTIVE_EFFECT: "cannot create effect on inactive context" };
})(CordisError || (CordisError = {}));
var INACTIVE = "__INACTIVE__";
var Fiber = class {
  parent;
  inject;
  runtime;
  /** Unique id within the registry; 0 for the root fiber, `null` once disposed. */
  uid;
  /** The context this fiber's plugin runs in (extends the parent context). */
  ctx;
  /** The validated plugin config (updated by `update()`). */
  config;
  /** The raw plugin config, re-resolved before each activation. */
  _config;
  /** Current lifecycle state; transitions emit `internal/status`. */
  state = 0;
  /** Dispose this fiber: unload the plugin, then settle once cleanup finished. */
  dispose;
  /** Snapshot of required service implementations while loaded; `undefined` otherwise. */
  store;
  /** The in-flight load/unload transition, if one is currently running. */
  inertia;
  _hooks = /* @__PURE__ */ Object.create(null);
  _disposables = new DisposableList();
  context;
  _error;
  _runner;
  _store = /* @__PURE__ */ Object.create(null);
  /**
  * Create a fiber. Plugin authors normally obtain fibers from `ctx.plugin()`
  * rather than constructing them directly.
  *
  * @param parent — the context the plugin was loaded from.
  * @param config — raw config, validated against the runtime's schema.
  * @param inject — resolved dependency map (service name → intercept config).
  * @param runtime — the shared plugin runtime, or `null` for the root fiber.
  * @param getOuterStack — captures the caller stack for effect diagnostics.
  */
  constructor(parent, config, inject, runtime, getOuterStack) {
    this.parent = parent;
    this.inject = inject;
    this.runtime = runtime;
    this._config = config;
    const collect = (dispose) => {
      this._disposables.push(dispose);
    };
    if (runtime) {
      this.uid = parent.registry.counter;
      this.ctx = this.context = parent.extend({ fiber: this });
      const injectEntries = Object.entries(this.inject);
      if (injectEntries.length) {
        this.ctx[Context.intercept] = Object.create(parent[Context.intercept]);
        for (const [name, config2] of injectEntries) {
          if (isNullable(config2)) continue;
          this.ctx[Context.intercept][name] = config2;
        }
      }
      this._runner = {
        epoch: INACTIVE,
        getOuterStack,
        execute: function() {
          if (isConstructor(runtime.callback)) {
            const instance = new runtime.callback(this.ctx, this.config);
            for (const hook of instance?.[symbols.initHooks] ?? []) hook();
            return instance?.[symbols.init]?.();
          } else return runtime.callback(this.ctx, this.config);
        },
        collect
      };
      this.dispose = parent.fiber.effect(() => {
        const remove = runtime.fibers.push(this);
        return async () => {
          this.uid = null;
          emitPluginDisposed(this.context, this);
          if (this.ctx.registry.has(runtime.callback)) {
            remove();
            if (!runtime.fibers.length) this.ctx.registry.delete(runtime.callback);
          }
          this._setEpoch(INACTIVE);
          if (!this.inertia) this._updateState(() => {
            this.inertia = this._unload();
            return 5;
          });
          while (this.inertia) await this.inertia;
        };
      }, "ctx.plugin()");
      try {
        this.context.emit("internal/plugin", this);
      } catch (error) {
        Promise.resolve(this.dispose()).catch((reason) => this.ctx.logger.error(reason));
        throw error;
      }
      if (this.uid !== null && parent.fiber.state !== 5) {
        for (const name of Object.keys(this.inject)) this._checkImpl(name);
        this._refresh();
      }
    } else {
      this.uid = 0;
      this.ctx = this.context = parent;
      this.state = 2;
      this.store = /* @__PURE__ */ Object.create(null);
      this._runner = {
        epoch: "",
        getOuterStack,
        execute: () => {
        },
        collect
      };
      this.dispose = () => this.restart();
    }
  }
  /** The plugin's display name, inherited from the nearest named ancestor, else `'root'`. */
  get name() {
    let fiber = this;
    do {
      if (fiber.runtime?.name) return fiber.runtime.name;
      fiber = fiber.parent.fiber;
    } while (fiber !== fiber.parent.fiber);
    return "root";
  }
  /**
  * Throw if the fiber has already been disposed.
  *
  * @returns nothing when the fiber is still active.
  * @throws {CordisError} `INACTIVE_EFFECT` when the fiber's uid has been cleared.
  */
  assertActive() {
    if (this.uid !== null) return;
    throw new CordisError("INACTIVE_EFFECT");
  }
  _execute(runner) {
    const oldEpoch = runner.epoch;
    return composeError((info) => {
      const safeCollect = (dispose) => {
        if (typeof dispose === "function") runner.collect(dispose);
        else if (!isNullable(dispose)) throw new TypeError("Invalid effect");
      };
      const effect = runner.execute.call(this);
      if (typeof effect === "function") return runner.collect(effect);
      else if (isNullable(effect)) {
      } else if (!isObject(effect)) throw new TypeError("Invalid effect");
      else if ("then" in effect) return effect.then(safeCollect);
      else if (Symbol.iterator in effect) {
        info.error = /* @__PURE__ */ new Error();
        const iter = effect[Symbol.iterator]();
        while (true) {
          const result = iter.next();
          safeCollect(result.value);
          if (result.done) return;
        }
      } else if (Symbol.asyncIterator in effect) {
        const iter = effect[Symbol.asyncIterator]();
        return (async () => {
          await Promise.resolve();
          info.error = /* @__PURE__ */ new Error();
          while (true) {
            if (runner.epoch !== oldEpoch) return;
            const result = await iter.next();
            safeCollect(result.value);
            if (result.done) return;
          }
        })();
      } else throw new TypeError("Invalid effect");
    }, runner.getOuterStack);
  }
  effect(execute, label = "anonymous") {
    this.assertActive();
    if (this.state === 5) throw new CordisError("INACTIVE_EFFECT");
    const disposables = [];
    let disposing = false;
    let disposalTask;
    const dispose = () => {
      if (disposing) return disposalTask;
      disposing = true;
      let task2;
      for (const disposable of disposables.splice(0).reverse()) if (task2) task2 = task2.then(() => runDisposable(disposable));
      else {
        const result = runDisposable(disposable);
        if (isObject(result) && "then" in result) task2 = result;
      }
      return disposalTask = task2;
    };
    const meta = {
      label,
      children: []
    };
    const runner = {
      execute,
      epoch: true,
      collect: (dispose2) => {
        disposables.push(dispose2);
        this._disposables.delete(dispose2);
        if (dispose2[symbols.effect]) meta.children.push(dispose2[symbols.effect]);
      },
      getOuterStack: buildOuterStack()
    };
    let task;
    let executing = true;
    let resolveSetup;
    let rejectSetup;
    let setupBarrier;
    let setupFailed = false;
    let inFlight;
    let removeWrapper = () => false;
    const waitForSetup = () => {
      setupBarrier ??= new Promise((resolve2, reject) => {
        resolveSetup = resolve2;
        rejectSetup = reject;
      });
      return setupBarrier;
    };
    const disposeAfter = (setup) => {
      return Promise.resolve(setup).then(() => dispose(), async (reason) => {
        await dispose();
        throw reason;
      });
    };
    const finalizeDisposal = (callback) => {
      let result;
      try {
        result = callback();
      } catch (error) {
        removeWrapper();
        throw error;
      }
      if (isObject(result) && "then" in result) {
        const pending = Promise.resolve(result).finally(() => {
          removeWrapper();
          if (inFlight === pending) inFlight = void 0;
        });
        return inFlight = pending;
      }
      removeWrapper();
      return result;
    };
    const wrapper = defineProperty(() => {
      if (!runner.epoch) return setupFailed ? inFlight : void 0;
      runner.epoch = false;
      return finalizeDisposal(() => {
        if (executing) return disposeAfter(waitForSetup());
        return task ? disposeAfter(task) : dispose();
      });
    }, symbols.effect, meta);
    effectInertia.set(wrapper, () => inFlight);
    removeWrapper = this._disposables.push(wrapper);
    try {
      task = this._execute(runner);
    } catch (reason) {
      executing = false;
      setupFailed = true;
      runner.epoch = false;
      let cleanup;
      try {
        cleanup = finalizeDisposal(dispose);
      } finally {
        rejectSetup?.(reason);
      }
      if (isObject(cleanup) && "then" in cleanup) cleanup.catch((error) => this.ctx.logger.error(error));
      throw reason;
    }
    executing = false;
    if (setupBarrier) Promise.resolve(task).then(resolveSetup, rejectSetup);
    task?.catch(() => {
      if (!runner.epoch) return dispose();
      return finalizeDisposal(dispose);
    }).catch((error) => this.ctx.logger.error(error));
    const disposeAsync = () => {
      if (!runner.epoch) return;
      runner.epoch = false;
      return finalizeDisposal(dispose);
    };
    wrapper.then = async (onFulfilled, onRejected) => {
      return Promise.resolve(task).then(() => disposeAsync).then(onFulfilled, onRejected);
    };
    return wrapper;
  }
  /**
  * Return metadata for currently registered effects.
  *
  * @returns one {@link EffectMeta} tree per labeled live effect.
  */
  getEffects() {
    return [...this._disposables].map((dispose) => dispose[symbols.effect]).filter(Boolean);
  }
  _getState() {
    if (this.uid === null) return 4;
    if (this._error) return 3;
    if (this._runner.epoch !== INACTIVE) return 2;
    return 0;
  }
  _updateState(callback) {
    const oldState = this.state;
    this.state = callback() ?? this._getState();
    if (oldState === this.state) return;
    this.context.emit("internal/status", this, oldState);
    if (oldState !== 2 && this.state !== 2) return;
    for (const key of Reflect.ownKeys(this.ctx.reflect.store)) {
      const impl = this.ctx.reflect.store[key];
      if (impl.fiber !== this) continue;
      this.ctx.reflect.notify([impl.name]);
    }
  }
  _checkImpl(name) {
    const impl = this.ctx.reflect._getImpl(name, true);
    if (!impl) return delete this._store[name];
    try {
      if (impl.check && !impl.check.call(getTraceable(this.ctx, impl.value))) return delete this._store[name];
    } catch (error) {
      impl.fiber.ctx.logger.error(error);
      return delete this._store[name];
    }
    this._store[name] = impl;
  }
  _refresh() {
    let epoch = false;
    epoch = "";
    for (const name of Object.keys(this.inject)) {
      const impl = this._store[name];
      if (!impl) {
        epoch = INACTIVE;
        break;
      }
      epoch += ":" + impl.fiber.uid;
    }
    this._setEpoch(epoch);
  }
  _setEpoch(epoch) {
    const oldEpoch = this._runner.epoch;
    if (epoch === oldEpoch) return;
    this._runner.epoch = epoch;
    if (this.inertia) return;
    this._updateState(() => {
      if (epoch !== INACTIVE && oldEpoch === INACTIVE) {
        this.inertia = this._reload();
        return 1;
      } else {
        this.inertia = this._unload();
        return 5;
      }
    });
  }
  _resolveConfig(config) {
    config = this.context.waterfall(this, "internal/config", config, () => config);
    return this.runtime ? resolveConfig(this.runtime, config) : config;
  }
  async _reload() {
    this.store = { ...this._store };
    const oldEpoch = this._runner.epoch;
    try {
      await Promise.resolve();
      if (this._runner.epoch === oldEpoch) {
        this.config = this._resolveConfig(this._config);
        await this._execute(this._runner);
        this._error = void 0;
      }
    } catch (reason) {
      this.ctx.logger.error(reason);
      this._error = reason;
      this._runner.epoch = INACTIVE;
    }
    this._updateState(() => {
      if (this._runner.epoch === oldEpoch) this.inertia = void 0;
      else {
        this.inertia = this._unload();
        return 5;
      }
    });
  }
  async _unload() {
    await Promise.all(this._disposables.clear().map(async (dispose) => {
      try {
        await composeError(async (info) => {
          await Promise.resolve();
          info.error = /* @__PURE__ */ new Error();
          await runDisposable(dispose);
        }, this._runner.getOuterStack);
      } catch (reason) {
        this.ctx.logger.error(reason);
      }
    }));
    this.store = void 0;
    this._updateState(() => {
      if (this._runner.epoch === INACTIVE) this.inertia = void 0;
      else {
        this.inertia = this._reload();
        return 1;
      }
    });
  }
  /**
  * Wait for current lifecycle work and rethrow startup errors.
  *
  * @returns this fiber, once it has settled into a stable state.
  * @throws the config-validation or plugin-startup error, if any.
  */
  async await() {
    while (this.inertia) await this.inertia;
    if (this._error) throw this._error;
    return this;
  }
  /**
  * Dispose and immediately reload this plugin with its current config.
  *
  * @returns a promise resolving once the reload settled.
  * @throws {CordisError} `INACTIVE_EFFECT` when the fiber is already disposed.
  */
  async restart() {
    this.assertActive();
    this._setEpoch(INACTIVE);
    this._refresh();
    await this.await();
  }
  /**
  * Validate and apply new config, then restart the plugin.
  *
  * Runs the `internal/update` waterfall first, so update hooks (and HMR)
  * can veto or replace the restart.
  *
  * @param config — the new raw config; validated before anything restarts.
  * @param noSave — hint for persistence hooks not to write the change back.
  * @returns the update waterfall result; the default restart returns a promise.
  * @throws when validation, an update listener, or the restarted plugin fails.
  */
  update(config, noSave = false) {
    this.assertActive();
    this._config = config;
    if (this.state !== 2) {
      this._error = void 0;
      this._setEpoch(INACTIVE);
      this._refresh();
      return;
    }
    config = this._resolveConfig(config);
    return this.context.waterfall(this, "internal/update", config, noSave, () => {
      this.config = config;
      this._error = void 0;
      return this.restart();
    });
  }
};
function isApplicable(object) {
  return object && typeof object === "object" && typeof object.apply === "function";
}
function Inject(name, config) {
  return function(value, decorator) {
    if (decorator.kind === "class") {
      if (!Object.hasOwn(value, "inject")) {
        defineProperty(value, "inject", Object.create(Object.getPrototypeOf(value).inject ?? null));
        defineProperty(value.inject, symbols.checkProto, true);
      }
      value.inject[name] = config;
    } else if (decorator.kind === "method") {
      const inject = (value[symbols.metadata] ??= {}).inject ??= /* @__PURE__ */ Object.create(null);
      inject[name] = config;
      decorator.addInitializer(function() {
        const property2 = this[symbols.tracker]?.property;
        (this[symbols.initHooks] ??= []).push(() => {
          this.ctx.inject(inject, (ctx) => {
            return value.call(property2 ? withProps(this, { [property2]: ctx }) : this);
          });
        });
      });
    } else throw new Error("@Inject() can only be used on class or class methods");
  };
}
(function(Inject2) {
  function resolve2(inject, result = /* @__PURE__ */ Object.create(null)) {
    if (!inject) return result;
    if (Array.isArray(inject)) for (const name of inject) result[name] = null;
    else if (Reflect.has(inject, symbols.checkProto)) {
      Object.assign(result, resolve2(Object.getPrototypeOf(inject)));
      for (const name of Object.keys(inject)) result[name] = inject[name] ?? null;
    } else for (const name of Object.keys(inject)) result[name] = inject[name] ?? null;
    return result;
  }
  Inject2.resolve = resolve2;
})(Inject || (Inject = {}));
var RegistryService = class {
  ctx;
  _counter = 0;
  _internal = /* @__PURE__ */ new Map();
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols.tracker, {
      property: "ctx",
      noShadow: true
    });
  }
  /** Allocate the next fiber uid (increments on every read). */
  get counter() {
    return ++this._counter;
  }
  /** Number of registered plugin runtimes. */
  get size() {
    return this._internal.size;
  }
  /**
  * Resolve a supported plugin shape to its executable callback.
  *
  * @param plugin — a function, class, or `{ apply }` object plugin.
  * @returns the callback identifying the plugin, or `undefined` if invalid.
  */
  resolve(plugin) {
    try {
      if (typeof plugin === "function") return plugin;
      if (isApplicable(plugin)) return plugin.apply;
    } catch {
    }
  }
  /**
  * Look up the runtime record for a plugin.
  *
  * @param plugin — any supported plugin shape.
  * @returns the runtime, or `undefined` when the plugin is not registered.
  */
  get(plugin) {
    const key = this.resolve(plugin);
    return key && this._internal.get(key);
  }
  /**
  * Check whether a plugin has a registered runtime.
  *
  * @param plugin — any supported plugin shape.
  * @returns `true` when at least one fiber of the plugin exists.
  */
  has(plugin) {
    const key = this.resolve(plugin);
    return !!key && this._internal.has(key);
  }
  /**
  * Dispose every running fiber for a plugin and remove its runtime record.
  *
  * @param plugin — any supported plugin shape.
  * @returns the removed runtime, or `undefined` when none was registered.
  */
  delete(plugin) {
    const key = this.resolve(plugin);
    const runtime = key && this._internal.get(key);
    if (!runtime) return;
    this._internal.delete(key);
    for (const fiber of runtime.fibers) fiber.dispose();
    return runtime;
  }
  /** Iterate the registered plugin callbacks. */
  keys() {
    return this._internal.keys();
  }
  /** Iterate the registered plugin runtimes. */
  values() {
    return this._internal.values();
  }
  /** Iterate `[callback, runtime]` pairs. */
  entries() {
    return this._internal.entries();
  }
  /**
  * Visit every registered runtime.
  *
  * @param callback — receives each runtime and its identifying callback.
  */
  forEach(callback) {
    return this._internal.forEach(callback);
  }
  /**
  * Start a callback once the requested dependencies are available.
  *
  * @param inject — required services, as an array or a name → config map.
  * @param callback — plugin body called with `(ctx, config)`.
  * @returns the fiber; awaiting it settles once loading finished.
  */
  inject(inject, callback) {
    return this.plugin({
      inject,
      apply: callback,
      name: callback.name
    });
  }
  /**
  * Start a plugin in the current context and return its fiber.
  *
  * Creates (or reuses) the plugin's runtime record, then starts a new fiber
  * under the current context. Throws if `plugin` is not a supported shape or
  * if the current fiber is already disposed.
  *
  * @param plugin — a function, class, or `{ apply }` object plugin.
  * @param config — the plugin config, validated against its `Config` schema.
  * @param getOuterStack — captures the caller stack for effect diagnostics.
  * @returns the fiber; awaiting it settles once loading finished.
  */
  plugin(plugin, config, getOuterStack = buildOuterStack()) {
    const callback = this.resolve(plugin);
    if (!callback) throw new Error('invalid plugin, expect function or object with an "apply" method, received ' + typeof plugin);
    this.ctx.fiber.assertActive();
    let runtime = this._internal.get(callback);
    if (!runtime) {
      let name = plugin.name;
      if (name === "apply") name = void 0;
      runtime = {
        name,
        callback,
        fibers: new DisposableList(),
        Config: plugin.Config
      };
      this._internal.set(callback, runtime);
    }
    const fiber = new Fiber(this.ctx, config, Inject.resolve(plugin.inject), runtime, getOuterStack);
    const wrapped = Object.create(fiber);
    wrapped.then = (onFulfilled, onRejected) => {
      return fiber.await().then(onFulfilled, onRejected);
    };
    return wrapped;
  }
};
var Context = class Context2 {
  /** Symbol key under which a disposer exposes its {@link EffectMeta} diagnostics tree. */
  static effect = symbols.effect;
  /** Symbol key for a context's listener filter, consulted on every event dispatch. */
  static filter = symbols.filter;
  /** Symbol key of the isolation map (see the `Context[symbols.isolate]` property). */
  static isolate = symbols.isolate;
  /** Symbol key of the intercept map (see the `Context[symbols.intercept]` property). */
  static intercept = symbols.intercept;
  /**
  * Returns true for Cordis context proxies and context prototypes.
  *
  * Works across realms and across multiple copies of cordis, because the
  * brand is keyed by a global symbol rather than by `instanceof`.
  *
  * @param value — the value to test.
  * @returns `true` if `value` is a Cordis context, narrowing its type.
  */
  static is(value) {
    return !!value?.[Context2.is];
  }
  static {
    Context2.is[Symbol.toPrimitive] = () => /* @__PURE__ */ Symbol.for("cordis.is");
    Context2.prototype[Context2.is] = true;
  }
  /** Create the root context and install the built-in services. */
  constructor() {
    this[symbols.isolate] = /* @__PURE__ */ Object.create(null);
    this[symbols.intercept] = /* @__PURE__ */ Object.create(null);
    const self = new Proxy(this, ReflectService.handler);
    this.root = self;
    this.baseUrl = void 0;
    this.fiber = new Fiber(self, {}, /* @__PURE__ */ Object.create(null), null, () => []);
    this.reflect = new ReflectService(self);
    this.registry = new RegistryService(self);
    this.events = new EventsService(self);
    this.logger = new LoggerService(self);
    this.fiber._disposables.clear();
    return self;
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return `Context <${this.fiber.name}>`;
  }
  /**
  * Create a child context with extra metadata on top of the current scope.
  *
  * The child prototypally inherits every property of this context; own
  * properties of `meta` shadow the inherited ones. The parent is not mutated.
  *
  * @param meta — own properties (including symbol keys) to define on the child.
  * @returns a child context inheriting from this one.
  */
  extend(meta = {}) {
    const shadow = Reflect.getOwnPropertyDescriptor(this, symbols.shadow)?.value;
    const self = Object.create(getTraceable(this, this));
    for (const prop of Reflect.ownKeys(meta)) Object.defineProperty(self, prop, Reflect.getOwnPropertyDescriptor(meta, prop));
    if (!shadow) return self;
    return Object.assign(Object.create(self), { [symbols.shadow]: shadow });
  }
  /**
  * Create a child context with an independent service scope for `name`.
  *
  * Below the returned context, reads and writes of the service `name`
  * resolve against the new label instead of the parent's, so a different
  * implementation can be provided without affecting the parent scope.
  * Passing the same `label` to two `isolate()` calls joins their scopes.
  *
  * @param name — the service name to isolate.
  * @param label — scope label to join; defaults to a fresh unique symbol.
  * @returns a child context whose `name` service resolves in the new scope.
  */
  isolate(name, label) {
    const shadow = Object.create(this[symbols.isolate]);
    shadow[name] = label ?? Symbol(name);
    return this.extend({ [symbols.isolate]: shadow });
  }
  intercept(name, config) {
    const intercept = Object.create(this[symbols.intercept]);
    intercept[name] = config;
    return this.extend({ [symbols.intercept]: intercept });
  }
};
var Service = class Service2 {
  ctx;
  /** Symbol key of an instance method run after construction (class plugins). */
  static init = symbols.init;
  /** Symbol key of the availability predicate passed to `ctx.provide()`. */
  static check = symbols.check;
  /** Symbol key of the phantom intercept-config type parameter. */
  static config = symbols.config;
  /** Symbol key of the call body making a service callable (e.g. `ctx.logger()`). */
  static invoke = symbols.invoke;
  /** Symbol key of the helper deriving an extended service instance. */
  static extend = symbols.extend;
  /** Symbol key of the tracker metadata used for context tracing. */
  static tracker = symbols.tracker;
  /** Symbol key of the intercept-config resolution helper below. */
  static resolveConfig = symbols.resolveConfig;
  /** The service name this instance is registered under. */
  name;
  /**
  * Register this instance as `name` in the current context.
  *
  * Calls `ctx.reflect.provide(name, this, this[Service.check])`, so the
  * service is unregistered automatically when the owning fiber unloads.
  * Services with a `[Service.invoke]` body return a callable instance.
  *
  * @param ctx — the context to register in (stored as `this.ctx`).
  * @param name — the service name; defaults to the static `provide` field.
  */
  constructor(ctx, name) {
    this.ctx = ctx;
    name ??= this.constructor["provide"];
    let self = this;
    const tracker = {
      associate: name,
      property: "ctx"
    };
    if (self[symbols.invoke]) self = createCallable(name, joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
    self.ctx = ctx;
    self.name = name;
    defineProperty(self, symbols.tracker, tracker);
    self.ctx.reflect.provide(name, self, this[symbols.check]);
    return self;
  }
  [symbols.filter](ctx) {
    return ctx[symbols.isolate][this.name] === this.ctx[symbols.isolate][this.name];
  }
  [symbols.extend](props) {
    let self;
    if (this[Service2.invoke]) self = createCallable(this.name, this, this[symbols.tracker]);
    else self = Object.create(this);
    return Object.assign(self, props);
  }
  /**
  * Merge intercept config from ancestors with optional base and head values.
  *
  * Entries added closer to the root apply first; `base` is prepended and
  * `head` appended. Uses `Config.merge` when the service declares one,
  * otherwise a shallow `Object.assign`.
  *
  * @param base — lowest-precedence config merged before all intercepts.
  * @param head — highest-precedence config merged after all intercepts.
  * @returns the merged config.
  */
  [symbols.resolveConfig](base, head) {
    let intercept = this.ctx[Context.intercept];
    const configs = [];
    while (this.name in intercept) {
      if (Object.hasOwn(intercept, this.name)) configs.unshift(intercept[this.name]);
      intercept = Object.getPrototypeOf(intercept);
    }
    if (base) configs.unshift(base);
    if (head) configs.push(head);
    if (this["Config"]?.merge) return this["Config"].merge(...configs);
    else return Object.assign({}, ...configs);
  }
  static [Symbol.hasInstance](instance) {
    if (!instance) return false;
    let constructor = instance.constructor;
    while (constructor) {
      constructor = constructor.prototype?.constructor;
      if (constructor === this) return true;
      constructor &&= Object.getPrototypeOf(constructor);
    }
    return false;
  }
};

// ../../../../.nvm/versions/node/v22.23.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/schemastery/lib/index.mjs
var kSchema = /* @__PURE__ */ Symbol.for("schemastery");
var kValidationError2 = /* @__PURE__ */ Symbol.for("ValidationError");
globalThis.__schemastery_index__ ??= 0;
globalThis.__schemastery_refs__ = void 0;
var ValidationError2 = class extends TypeError {
  options;
  name = "ValidationError";
  constructor(message, options) {
    let prefix = "$";
    for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
    else if (typeof segment === "number") prefix += "[" + segment + "]";
    else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
    if (prefix.startsWith(".")) prefix = prefix.slice(1);
    super((prefix === "$" ? "" : `${prefix} `) + message);
    this.options = options;
  }
  static is(error) {
    return !!error?.[kValidationError2];
  }
};
Object.defineProperty(ValidationError2.prototype, kValidationError2, { value: true });
var Schema = function(options) {
  const schema = function(data, options2 = {}) {
    return Schema.resolve(data, schema, options2)[0];
  };
  if (options.refs) {
    const refs = mapValues(options.refs, (options2) => new Schema(options2));
    const getRef = (uid) => refs[uid];
    for (const key in refs) {
      const options2 = refs[key];
      options2.sKey = getRef(options2.sKey);
      options2.inner = getRef(options2.inner);
      options2.list = options2.list && options2.list.map(getRef);
      options2.dict = options2.dict && mapValues(options2.dict, getRef);
    }
    return refs[options.uid];
  }
  Object.assign(schema, options);
  if (typeof schema.callback === "string") try {
    schema.callback = new Function("return " + schema.callback)();
  } catch {
  }
  Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
  Object.setPrototypeOf(schema, Schema.prototype);
  schema.meta ||= {};
  schema.toString = schema.toString.bind(schema);
  return schema;
};
Schema.prototype = Object.create(Function.prototype);
Schema.prototype[kSchema] = true;
Object.defineProperty(Schema.prototype, "~standard", { get() {
  return {
    version: 1,
    vendor: "schemastery",
    validate: (value) => {
      try {
        return { value: Schema.resolve(value, this, {})[0] };
      } catch (error) {
        if (ValidationError2.is(error)) return { issues: [{
          message: error.message,
          path: error.options.path
        }] };
        throw error;
      }
    }
  };
} });
Schema.ValidationError = ValidationError2;
Schema.prototype.toJSON = function toJSON() {
  if (globalThis.__schemastery_refs__) {
    globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
    return this.uid;
  }
  globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
  globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
  const result = {
    uid: this.uid,
    refs: globalThis.__schemastery_refs__
  };
  globalThis.__schemastery_refs__ = void 0;
  return result;
};
Schema.prototype.set = function set(key, value) {
  this.dict[key] = value;
  return this;
};
Schema.prototype.push = function push(value) {
  this.list.push(value);
  return this;
};
function mergeDesc(original, messages) {
  const result = typeof original === "string" ? { "": original } : { ...original };
  for (const locale in messages) {
    const value = messages[locale];
    if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
    else if (typeof value === "string") result[locale] = value;
  }
  return result;
}
function getInner(value) {
  return value?.$value ?? value?.$inner;
}
function extractKeys(data) {
  return filterKeys(data ?? {}, (key) => !key.startsWith("$"));
}
Schema.prototype.i18n = function i18n(messages) {
  const schema = Schema(this);
  const desc = mergeDesc(schema.meta.description, messages);
  if (Object.keys(desc).length) schema.meta.description = desc;
  if (schema.dict) schema.dict = mapValues(schema.dict, (inner, key) => {
    return inner.i18n(mapValues(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
  });
  if (schema.list) schema.list = schema.list.map((inner, index) => {
    return inner.i18n(mapValues(messages, (data = {}) => {
      if (Array.isArray(getInner(data))) return getInner(data)[index];
      if (Array.isArray(data)) return data[index];
      return extractKeys(data);
    }));
  });
  if (schema.inner) schema.inner = schema.inner.i18n(mapValues(messages, (data) => {
    if (getInner(data)) return getInner(data);
    return extractKeys(data);
  }));
  if (schema.sKey) schema.sKey = schema.sKey.i18n(mapValues(messages, (data) => data?.$key));
  return schema;
};
Schema.prototype.extra = function extra(key, value) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key]: value
  };
  return schema;
};
for (const key of [
  "required",
  "disabled",
  "collapse",
  "hidden",
  "loose"
]) Object.assign(Schema.prototype, { [key](value = true) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key]: value
  };
  return schema;
} });
Schema.prototype.deprecated = function deprecated() {
  const schema = Schema(this);
  schema.meta.badges ||= [];
  schema.meta.badges.push({
    text: "deprecated",
    type: "danger"
  });
  return schema;
};
Schema.prototype.experimental = function experimental() {
  const schema = Schema(this);
  schema.meta.badges ||= [];
  schema.meta.badges.push({
    text: "experimental",
    type: "warning"
  });
  return schema;
};
Schema.prototype.pattern = function pattern(regexp) {
  const schema = Schema(this);
  const pattern2 = pick(regexp, ["source", "flags"]);
  schema.meta = {
    ...schema.meta,
    pattern: pattern2
  };
  return schema;
};
Schema.prototype.simplify = function simplify(value) {
  if (deepEqual(value, this.meta.default, this.type === "dict")) return null;
  if (isNullable(value)) return value;
  if (this.type === "object" || this.type === "dict") {
    const result = {};
    for (const key in value) {
      const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
      if (this.type === "dict" || !isNullable(item)) result[key] = item;
    }
    if (deepEqual(result, this.meta.default, this.type === "dict")) return null;
    return result;
  } else if (this.type === "array" || this.type === "tuple") {
    const result = [];
    value.forEach((value2, index) => {
      const schema = this.type === "array" ? this.inner : this.list[index];
      const item = schema ? schema.simplify(value2) : value2;
      result.push(item);
    });
    return result;
  } else if (this.type === "intersect") {
    const result = {};
    for (const item of this.list) Object.assign(result, item.simplify(value));
    return result;
  } else if (this.type === "union") for (const schema of this.list) try {
    Schema.resolve(value, schema, {});
    return schema.simplify(value);
  } catch {
  }
  return value;
};
Schema.prototype.toString = function toString(inline) {
  return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
};
Schema.prototype.role = function role(role, extra2) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    role,
    extra: extra2
  };
  return schema;
};
for (const key of [
  "default",
  "link",
  "comment",
  "description",
  "max",
  "min",
  "step"
]) Object.assign(Schema.prototype, { [key](value) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key]: value
  };
  return schema;
} });
var resolvers = {};
Schema.extend = function extend(type, resolve2) {
  resolvers[type] = resolve2;
};
Schema.resolve = function resolve(data, schema, options = {}, strict = false) {
  if (!schema) return [data];
  if (options.ignore?.(data, schema)) return [data];
  if (isNullable(data) && schema.type !== "lazy") {
    if (schema.meta.required) throw new ValidationError2(`missing required value`, options);
    let current = schema;
    let fallback = schema.meta.default;
    while (current?.type === "intersect" && isNullable(fallback)) {
      current = current.list[0];
      fallback = current?.meta.default;
    }
    if (isNullable(fallback)) return [data];
    data = clone(fallback);
  }
  const callback = resolvers[schema.type];
  if (!callback) throw new ValidationError2(`unsupported type "${schema.type}"`, options);
  try {
    return callback(data, schema, options, strict);
  } catch (error) {
    if (!schema.meta.loose) throw error;
    return [schema.meta.default];
  }
};
Schema.from = function from(source) {
  if (isNullable(source)) return Schema.any();
  else if ([
    "string",
    "number",
    "boolean"
  ].includes(typeof source)) return Schema.const(source).required();
  else if (source[kSchema]) return source;
  else if (typeof source === "function") switch (source) {
    case String:
      return Schema.string().required();
    case Number:
      return Schema.number().required();
    case Boolean:
      return Schema.boolean().required();
    case Function:
      return Schema.function().required();
    default:
      return Schema.is(source).required();
  }
  else throw new TypeError(`cannot infer schema from ${source}`);
};
Schema.lazy = function lazy(builder) {
  const toJSON2 = () => {
    if (!schema.inner[kSchema]) {
      schema.inner = schema.builder();
      schema.inner.meta = {
        ...schema.meta,
        ...schema.inner.meta
      };
    }
    return schema.inner.toJSON();
  };
  const schema = new Schema({
    type: "lazy",
    builder,
    inner: { toJSON: toJSON2 }
  });
  return schema;
};
Schema.natural = function natural() {
  return Schema.number().step(1).min(0);
};
Schema.percent = function percent() {
  return Schema.number().step(0.01).min(0).max(1).role("slider");
};
Schema.date = function date() {
  return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
    const date2 = new Date(value);
    if (isNaN(+date2)) throw new ValidationError2(`invalid date "${value}"`, options);
    return date2;
  }, true)]);
};
Schema.regExp = function regExp(flag = "") {
  return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
    try {
      return new RegExp(value, flag);
    } catch (e) {
      throw new ValidationError2(e.message, options);
    }
  }, true)]);
};
Schema.arrayBuffer = function arrayBuffer(encoding) {
  return Schema.union([
    Schema.is(ArrayBuffer),
    Schema.is(SharedArrayBuffer),
    Schema.transform(Schema.any(), (value, options) => {
      if (Binary.isSource(value)) return Binary.fromSource(value);
      throw new ValidationError2(`expected ArrayBufferSource but got ${value}`, options);
    }, true),
    ...encoding ? [Schema.transform(Schema.string(), (value, options) => {
      try {
        return encoding === "base64" ? Binary.fromBase64(value) : Binary.fromHex(value);
      } catch (e) {
        throw new ValidationError2(e.message, options);
      }
    }, true)] : []
  ]);
};
Schema.extend("lazy", (data, schema, options, strict) => {
  if (!schema.inner[kSchema]) {
    schema.inner = schema.builder();
    schema.inner.meta = {
      ...schema.meta,
      ...schema.inner.meta
    };
  }
  return Schema.resolve(data, schema.inner, options, strict);
});
Schema.extend("any", (data) => {
  return [data];
});
Schema.extend("never", (data, _, options) => {
  throw new ValidationError2(`expected nullable but got ${data}`, options);
});
Schema.extend("const", (data, { value }, options) => {
  if (deepEqual(data, value)) return [value];
  throw new ValidationError2(`expected ${value} but got ${data}`, options);
});
function checkWithinRange(data, meta, description, options, skipMin = false) {
  const { max = Infinity, min = -Infinity } = meta;
  if (data > max) throw new ValidationError2(`expected ${description} <= ${max} but got ${data}`, options);
  if (data < min && !skipMin) throw new ValidationError2(`expected ${description} >= ${min} but got ${data}`, options);
}
Schema.extend("string", (data, { meta }, options) => {
  if (typeof data !== "string") throw new ValidationError2(`expected string but got ${data}`, options);
  if (meta.pattern) {
    const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
    if (!regexp.test(data)) throw new ValidationError2(`expect string to match regexp ${regexp}`, options);
  }
  checkWithinRange(data.length, meta, "string length", options);
  return [data];
});
function decimalShift(data, digits) {
  const str = data.toString();
  if (str.includes("e")) return data * Math.pow(10, digits);
  const index = str.indexOf(".");
  if (index === -1) return data * Math.pow(10, digits);
  const frac = str.slice(index + 1);
  const integer = str.slice(0, index);
  if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
  return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
}
function isMultipleOf(data, min, step) {
  step = Math.abs(step);
  if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
  const index = step.toString().indexOf(".");
  const digits = step.toString().slice(index + 1).length;
  return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
}
Schema.extend("number", (data, { meta }, options) => {
  if (typeof data !== "number") throw new ValidationError2(`expected number but got ${data}`, options);
  checkWithinRange(data, meta, "number", options);
  const { step } = meta;
  if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError2(`expected number multiple of ${step} but got ${data}`, options);
  return [data];
});
Schema.extend("boolean", (data, _, options) => {
  if (typeof data === "boolean") return [data];
  throw new ValidationError2(`expected boolean but got ${data}`, options);
});
Schema.extend("bitset", (data, { bits, meta }, options) => {
  let value = 0, keys = [];
  if (typeof data === "number") {
    value = data;
    for (const key in bits) if (data & bits[key]) keys.push(key);
  } else if (Array.isArray(data)) {
    keys = data;
    for (const key of keys) {
      if (typeof key !== "string") throw new ValidationError2(`expected string but got ${key}`, options);
      if (key in bits) value |= bits[key];
    }
  } else throw new ValidationError2(`expected number or array but got ${data}`, options);
  if (value === meta.default) return [value];
  return [value, keys];
});
Schema.extend("function", (data, _, options) => {
  if (typeof data === "function") return [data];
  throw new ValidationError2(`expected function but got ${data}`, options);
});
Schema.extend("is", (data, { constructor }, options) => {
  if (typeof constructor === "function") {
    if (data instanceof constructor) return [data];
    throw new ValidationError2(`expected ${constructor.name} but got ${data}`, options);
  } else {
    if (isNullable(data)) throw new ValidationError2(`expected ${constructor} but got ${data}`, options);
    let prototype = Object.getPrototypeOf(data);
    while (prototype) {
      if (prototype.constructor?.name === constructor) return [data];
      prototype = Object.getPrototypeOf(prototype);
    }
    throw new ValidationError2(`expected ${constructor} but got ${data}`, options);
  }
});
function property(data, key, schema, options) {
  try {
    const [value, adapted] = Schema.resolve(data[key], schema, {
      ...options,
      path: [...options.path || [], key]
    });
    if (adapted !== void 0) data[key] = adapted;
    return value;
  } catch (e) {
    if (!options?.autofix) throw e;
    delete data[key];
    return schema.meta.default;
  }
}
Schema.extend("array", (data, { inner, meta }, options) => {
  if (!Array.isArray(data)) throw new ValidationError2(`expected array but got ${data}`, options);
  checkWithinRange(data.length, meta, "array length", options, !isNullable(inner.meta.default));
  return [data.map((_, index) => property(data, index, inner, options))];
});
Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
  if (!isPlainObject(data)) throw new ValidationError2(`expected object but got ${data}`, options);
  const result = {};
  for (const key in data) {
    let rKey;
    try {
      rKey = Schema.resolve(key, sKey, options)[0];
    } catch (error) {
      if (strict) continue;
      throw error;
    }
    result[rKey] = property(data, key, inner, options);
    data[rKey] = data[key];
    if (key !== rKey) delete data[key];
  }
  return [result];
});
Schema.extend("tuple", (data, { list }, options, strict) => {
  if (!Array.isArray(data)) throw new ValidationError2(`expected array but got ${data}`, options);
  const result = list.map((inner, index) => property(data, index, inner, options));
  if (strict) return [result];
  result.push(...data.slice(list.length));
  return [result];
});
function merge(result, data) {
  for (const key in data) {
    if (key in result) continue;
    result[key] = data[key];
  }
}
Schema.extend("object", (data, { dict }, options, strict) => {
  if (!isPlainObject(data)) throw new ValidationError2(`expected object but got ${data}`, options);
  const result = {};
  for (const key in dict) {
    const value = property(data, key, dict[key], options);
    if (!isNullable(value) || key in data) result[key] = value;
  }
  if (!strict) merge(result, data);
  return [result];
});
Schema.extend("union", (data, { list, toString: toString2 }, options, strict) => {
  const messages = [];
  for (const inner of list) try {
    return Schema.resolve(data, inner, options, strict);
  } catch (error) {
    messages.push(error);
  }
  throw new ValidationError2(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
});
Schema.extend("intersect", (data, { list, toString: toString2 }, options, strict) => {
  if (!list.length) return [data];
  let result;
  for (const inner of list) {
    const value = Schema.resolve(data, inner, options, true)[0];
    if (isNullable(value)) continue;
    if (isNullable(result)) result = value;
    else if (typeof result !== typeof value) throw new ValidationError2(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
    else if (typeof value === "object") merge(result ??= {}, value);
    else if (result !== value) throw new ValidationError2(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
  }
  if (!strict && isPlainObject(data)) merge(result, data);
  return [result];
});
Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
  const [result, adapted = data] = Schema.resolve(data, inner, options, true);
  if (preserve) return [callback(result)];
  else return [callback(result), callback(adapted)];
});
var formatters = {};
function defineMethod(name, keys, format) {
  formatters[name] = format;
  Object.assign(Schema, { [name](...args) {
    const schema = new Schema({ type: name });
    keys.forEach((key, index) => {
      switch (key) {
        case "sKey":
          schema.sKey = args[index] ?? Schema.string();
          break;
        case "inner":
          schema.inner = Schema.from(args[index]);
          break;
        case "list":
          schema.list = args[index].map(Schema.from);
          break;
        case "dict":
          schema.dict = mapValues(args[index], Schema.from);
          break;
        case "bits":
          schema.bits = {};
          for (const key2 in args[index]) {
            if (typeof args[index][key2] !== "number") continue;
            schema.bits[key2] = args[index][key2];
          }
          break;
        case "callback": {
          const callback = schema.callback = args[index];
          callback["toJSON"] ||= () => callback.toString();
          break;
        }
        case "constructor": {
          const constructor = schema.constructor = args[index];
          if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
          break;
        }
        default:
          schema[key] = args[index];
      }
    });
    if (name === "object" || name === "dict") schema.meta.default = {};
    else if (name === "array" || name === "tuple") schema.meta.default = [];
    else if (name === "bitset") schema.meta.default = 0;
    return schema;
  } });
}
defineMethod("is", ["constructor"], ({ constructor }) => {
  if (typeof constructor === "function") return constructor.name;
  else return constructor;
});
defineMethod("any", [], () => "any");
defineMethod("never", [], () => "never");
defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
defineMethod("string", [], () => "string");
defineMethod("number", [], () => "number");
defineMethod("boolean", [], () => "boolean");
defineMethod("bitset", ["bits"], () => "bitset");
defineMethod("function", [], () => "function");
defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
defineMethod("object", ["dict"], ({ dict }) => {
  if (Object.keys(dict).length === 0) return "{}";
  return `{ ${Object.entries(dict).map(([key, inner]) => {
    return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
  }).join(", ")} }`;
});
defineMethod("union", ["list"], ({ list }, inline) => {
  const result = list.map(({ toString: format }) => format()).join(" | ");
  return inline ? `(${result})` : result;
});
defineMethod("intersect", ["list"], ({ list }) => {
  return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
});
defineMethod("transform", [
  "inner",
  "callback",
  "preserve"
], ({ inner }, isInner) => inner.toString(isInner));

// ../../../../.nvm/versions/node/v22.23.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-scope/lib/index.js
var NamedEntries = class {
  duplicateError;
  data = /* @__PURE__ */ new Map();
  constructor(duplicateError) {
    this.duplicateError = duplicateError;
  }
  /**
  * Insert one unique name.
  * @param name - name unique within this table.
  * @param value - borrowed value to retain.
  * @returns an idempotent undo that removes only this insertion.
  */
  insert(name, value) {
    const data = this.data;
    if (data.has(name)) throw this.duplicateError(name);
    data.set(name, value);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      data.delete(name);
      if (data.size === 0 && this.data === data) this.data = /* @__PURE__ */ new Map();
    };
  }
  /**
  * Read one named value.
  * @param name - name to resolve.
  * @returns the retained value, or `undefined` when absent.
  */
  get(name) {
    return this.data.get(name);
  }
  /**
  * Test one name for membership.
  * @param name - name to test.
  * @returns whether the table contains that name.
  */
  has(name) {
    return this.data.has(name);
  }
  /**
  * Iterate live names in insertion order.
  * @returns the native live key iterator.
  */
  keys() {
    return this.data.keys();
  }
  /**
  * Iterate live entries in insertion order.
  * @returns the native live entry iterator.
  */
  entries() {
    return this.data.entries();
  }
  /**
  * Iterate live values in insertion order.
  * @returns the native live value iterator.
  */
  values() {
    return this.data.values();
  }
  /**
  * Test whether this table has no entries.
  * @returns whether the table is empty.
  */
  isEmpty() {
    return this.data.size === 0;
  }
};
var AnonymousEntries = class {
  data = /* @__PURE__ */ new Map();
  /**
  * Append one independently owned value.
  * @param value - borrowed value to retain.
  * @returns an idempotent undo for this exact append.
  */
  append(value) {
    const data = this.data;
    const key = /* @__PURE__ */ Symbol();
    data.set(key, value);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      data.delete(key);
      if (data.size === 0 && this.data === data) this.data = /* @__PURE__ */ new Map();
    };
  }
  /**
  * Iterate live values in insertion order.
  * @returns the native live value iterator.
  */
  values() {
    return this.data.values();
  }
  /**
  * Test whether this table has no entries.
  * @returns whether the table is empty.
  */
  isEmpty() {
    return this.data.size === 0;
  }
};
var ScopedLayers = class {
  createLayer;
  onChange;
  /** The eagerly constructed context-global layer. */
  global;
  scoped = /* @__PURE__ */ new Map();
  constructor(createLayer, onChange) {
    this.createLayer = createLayer;
    this.onChange = onChange;
    this.global = createLayer(void 0);
  }
  /**
  * Read an existing exact-scope overlay. Deliberately chain-blind: callers
  * addressing one scope's OWN contributions (its restrictions, its guards)
  * must not silently pick up an ancestor's — use {@link chainLayers} where
  * inheritance is the point.
  * @param scope - exact scope key; `undefined` denotes no overlay.
  * @returns the existing scoped layer, or `undefined` without creating one.
  */
  peek(scope) {
    if (scope === void 0) return void 0;
    return this.scoped.get(scope);
  }
  /**
  * Existing overlays along the scope's parent chain ({@link scopeChainOf}),
  * farthest ancestor first and the exact scope last, so a caller layering
  * them in order gives the nearest scope the final word.
  * @param scope - viewing scope, or `undefined` for no overlays.
  * @returns the existing layers, nearest last; absent overlays are skipped.
  */
  chainLayers(scope) {
    const layers = [];
    for (const key of scopeChainOf(scope).reverse()) {
      const layer = this.scoped.get(key);
      if (layer !== void 0) layers.push(layer);
    }
    return layers;
  }
  /**
  * Materialize global named entries followed by scope-chain shadows,
  * farthest ancestor first, so the nearest scope's entry wins a name.
  * @param scope - viewing scope, or `undefined` for the global view.
  * @param pick - select the named table from a layer.
  * @returns an insertion-ordered effective map.
  */
  merge(scope, pick2) {
    const merged = new Map(pick2(this.global).entries());
    for (const layer of this.chainLayers(scope)) for (const [name, value] of pick2(layer).entries()) merged.set(name, value);
    return merged;
  }
  /**
  * Attach one synchronous layer mutation to its registration context.
  * @param ctx - context that determines both scope visibility and effect ownership.
  * @param action - atomic mutation returning its synchronous undo.
  * @param options - Cordis effect label and optional change notification.
  * @returns the exact disposer returned by `ctx.effect()`.
  */
  effect(ctx, action, options) {
    const scope = scopeOf(ctx);
    const notify = options.notify ?? true;
    return ctx.effect(function* () {
      let layer;
      let created = false;
      if (scope === void 0) layer = this.global;
      else {
        const existing = this.scoped.get(scope);
        if (existing === void 0) {
          layer = this.createLayer(scope);
          this.scoped.set(scope, layer);
          created = true;
        } else layer = existing;
      }
      let undo;
      try {
        undo = action(layer);
      } catch (error) {
        if (scope !== void 0 && created && layer.isEmpty()) this.scoped.delete(scope);
        throw error;
      }
      yield () => {
        undo();
        if (scope !== void 0 && layer.isEmpty()) this.scoped.delete(scope);
        if (notify) this.onChange();
      };
      if (notify) this.onChange();
    }.bind(this), options.label);
  }
};
var kScope = /* @__PURE__ */ Symbol("dsh.scope");
var carrierKeys = /* @__PURE__ */ new WeakMap();
var scopeParents = /* @__PURE__ */ new WeakMap();
function scopeChainOf(key) {
  const chain = [];
  for (let cursor = key; cursor !== void 0; cursor = scopeParents.get(cursor)) chain.push(cursor);
  return chain;
}
function scopeOf(ctx) {
  return ctx[kScope];
}
function scopeTarget(base, key) {
  const baseFilter = base[Context.filter];
  const carrier = { [Context.filter](ctx) {
    if (baseFilter !== void 0 && !baseFilter.call(base, ctx)) return false;
    const tag = scopeOf(ctx);
    if (tag === void 0) return true;
    for (let cursor = key; cursor !== void 0; cursor = scopeParents.get(cursor)) if (cursor === tag) return true;
    return false;
  } };
  carrierKeys.set(carrier, key);
  return carrier;
}

// ../../../../.nvm/versions/node/v22.23.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-llm/lib/index.js
import { createRequire } from "node:module";

// ../../../../.nvm/versions/node/v22.23.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-timeout/lib/index.js
var MAX_TIMER_DELAY_MS = 2147483647;

// ../../../../.nvm/versions/node/v22.23.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-llm/lib/index.js
function MessageId(id) {
  return id;
}
function CallId(id) {
  return id;
}
function deepFreeze(value) {
  const seen = /* @__PURE__ */ new WeakSet();
  const pending = [{
    kind: "visit",
    node: value
  }];
  while (pending.length > 0) {
    const task = pending.pop();
    if (task === void 0) continue;
    if (task.kind === "property") {
      pending.push({
        kind: "visit",
        node: task.source[task.key]
      });
      continue;
    }
    const node = task.node;
    if (node === null || typeof node !== "object") continue;
    if (node instanceof AbortSignal) continue;
    if (seen.has(node)) continue;
    seen.add(node);
    Object.freeze(node);
    const keys = Object.keys(node);
    for (let index = keys.length - 1; index >= 0; index--) {
      const key = keys[index];
      if (key === void 0) continue;
      pending.push({
        kind: "property",
        source: node,
        key
      });
    }
  }
  return value;
}
function freezeMessage(message) {
  return deepFreeze(structuredClone(message));
}
function createMessage(input) {
  return freezeMessage({
    ...input,
    id: MessageId(crypto.randomUUID())
  });
}
function createUserMessage(input) {
  return createMessage({
    ...input,
    role: "user"
  });
}
var HarnessError = class extends Error {
  /** Stable machine-routable failure class (e.g. `RATE_LIMIT`); route on this, never by parsing `message`. */
  code;
  constructor(message, code, options) {
    super(message, options);
    this.code = code;
    this.name = new.target.name;
  }
};
var EMPTY_RESPONSE_CODE = "EMPTY_RESPONSE";
var STRUCTURED_CONTEXT_OVERFLOW = new RegExp(String.raw`(?:^|[^a-z0-9])context[\s_-](?:length|window)[\s_-]` + String.raw`(?:exceed(?:ed|s)?|overflow(?:ed)?|limit[\s_-]exceeded)(?:$|[^a-z0-9])`, "i");
var TOO_LARGE_FOR_CONTEXT = new RegExp(String.raw`\b(?:request|prompt|input|messages?)\s+(?:is\s+|are\s+)?` + String.raw`too\s+(?:large|long)\s+for\s+(?:(?:this|the)\s+)?` + String.raw`(?:model(?:'s)?\s+)?context(?:\s+window)?\b`, "i");
var EXCEEDS_MODEL_CONTEXT = new RegExp(String.raw`\b(?:input|prompt|request|messages?)\b.{0,40}` + String.raw`\b(?:exceed(?:s|ed)?|overflows?|is\s+larger\s+than)\b.{0,40}` + String.raw`\b(?:the\s+)?(?:model(?:'s)?\s+)?context(?:\s+(?:length|window))?\b`, "i");
var DEFAULT_MAX_RETRIES = 5;
var DEFAULT_INITIAL_DELAY_MS = 500;
var DEFAULT_MAX_DELAY_MS = 1e4;
var DEFAULT_JITTER_RATIO = 0.1;
var DEFAULT_RETRYABLE_CODES = Object.freeze([
  EMPTY_RESPONSE_CODE,
  "RATE_LIMIT",
  "SERVER",
  "TIMEOUT",
  "TRANSPORT"
]);
var backoffSchema = Schema.object({
  initialDelayMs: Schema.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_INITIAL_DELAY_MS),
  maxDelayMs: Schema.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_MAX_DELAY_MS),
  jitterRatio: Schema.number().min(0).max(1).default(DEFAULT_JITTER_RATIO)
});
var normalPolicySchema = Schema.object({
  mode: Schema.const("normal").required(),
  maxRetries: Schema.number().step(1).min(0).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_RETRIES),
  retryableCodes: Schema.array(Schema.string()).default([...DEFAULT_RETRYABLE_CODES]),
  backoff: backoffSchema
});
var alwaysPolicySchema = Schema.object({
  mode: Schema.const("always").required(),
  backoff: backoffSchema
});
var RetryPolicySchema = Schema.union([normalPolicySchema, alwaysPolicySchema]);
var { version } = createRequire(import.meta.url)("../package.json");
function assertNever(value, context) {
  const rendered = JSON.stringify(value) ?? String(value);
  throw new Error(`unreachable variant${context ? ` in ${context}` : ""}: ${rendered}`);
}

// ../../../../.nvm/versions/node/v22.23.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-session/lib/index.js
import { isAbsolute } from "node:path";
function hasIntrinsicConstructor(prototype, name) {
  const constructor = Object.getOwnPropertyDescriptor(prototype, "constructor")?.value;
  if (typeof constructor !== "function") return false;
  try {
    return constructor.name === name && constructor.prototype === prototype && Function.prototype.toString.call(constructor) === `function ${name}() { [native code] }`;
  } catch {
    return false;
  }
}
function isIntrinsicObjectPrototype(value) {
  return Object.getPrototypeOf(value) === null && hasIntrinsicConstructor(value, "Object");
}
function hasPlainArrayPrototype(value) {
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(prototype) || !hasIntrinsicConstructor(prototype, "Array")) return false;
  const objectPrototype = Object.getPrototypeOf(prototype);
  return typeof objectPrototype === "object" && objectPrototype !== null && isIntrinsicObjectPrototype(objectPrototype);
}
function hasPlainObjectPrototype(value) {
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || typeof prototype === "object" && isIntrinsicObjectPrototype(prototype);
}
function enumerableStringKeys(value) {
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string" || !Object.prototype.propertyIsEnumerable.call(value, key))) return void 0;
  return keys;
}
function walkJsonValue(value, detach) {
  const ancestors = /* @__PURE__ */ new Set();
  let root;
  const assign = (destination, item) => {
    if (destination === void 0) return;
    if (destination.kind === "root") root = item;
    else if (destination.kind === "array") destination.target[destination.index] = item;
    else Object.defineProperty(destination.target, destination.key, {
      value: item,
      enumerable: true,
      configurable: true,
      writable: true
    });
  };
  const tasks = [{
    kind: "visit",
    value,
    ...detach ? { destination: { kind: "root" } } : {}
  }];
  for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
    if (task.kind === "leave") {
      ancestors.delete(task.source);
      continue;
    }
    if (task.kind === "array-item") {
      if (!Object.prototype.hasOwnProperty.call(task.source, task.index)) return void 0;
      tasks.push({
        kind: "visit",
        value: task.source[task.index],
        ...task.target === void 0 ? {} : { destination: {
          kind: "array",
          target: task.target,
          index: task.index
        } }
      });
      continue;
    }
    if (task.kind === "object-property") {
      tasks.push({
        kind: "visit",
        value: task.source[task.key],
        ...task.target === void 0 ? {} : { destination: {
          kind: "object",
          target: task.target,
          key: task.key
        } }
      });
      continue;
    }
    const current = task.value;
    if (current === null) {
      assign(task.destination, null);
      continue;
    }
    if (typeof current === "boolean" || typeof current === "string") {
      assign(task.destination, current);
      continue;
    }
    if (typeof current === "number") {
      if (!Number.isFinite(current) || Object.is(current, -0)) return void 0;
      assign(task.destination, current);
      continue;
    }
    if (typeof current !== "object") return void 0;
    if (ancestors.has(current)) return void 0;
    if (Array.isArray(current)) {
      if (!hasPlainArrayPrototype(current)) return void 0;
      const length = current.length;
      if (Reflect.ownKeys(current).length !== length + 1) return void 0;
      const target2 = detach ? [] : void 0;
      if (target2 !== void 0) assign(task.destination, target2);
      ancestors.add(current);
      tasks.push({
        kind: "leave",
        source: current
      });
      for (let index = length - 1; index >= 0; index--) tasks.push({
        kind: "array-item",
        source: current,
        index,
        ...target2 === void 0 ? {} : { target: target2 }
      });
      continue;
    }
    if (!hasPlainObjectPrototype(current)) return void 0;
    const keys = enumerableStringKeys(current);
    if (keys === void 0) return void 0;
    const target = detach ? {} : void 0;
    if (target !== void 0) assign(task.destination, target);
    ancestors.add(current);
    tasks.push({
      kind: "leave",
      source: current
    });
    for (let index = keys.length - 1; index >= 0; index--) {
      const key = keys[index];
      if (key === void 0) return void 0;
      tasks.push({
        kind: "object-property",
        source: current,
        key,
        ...target === void 0 ? {} : { target }
      });
    }
  }
  return detach ? root : true;
}
function snapshotJsonValue(value) {
  return walkJsonValue(value, true);
}
function isJsonValue(value) {
  return walkJsonValue(value, false) === true;
}

// ../../../../.nvm/versions/node/v22.23.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-tools/lib/index.js
var JsonSchemaError = class extends HarnessError {
  /** Individual schema violations in walk order. */
  violations;
  constructor(violations) {
    super(`unsupported JSON schema: ${violations.join("; ")}`, "UNSUPPORTED_SCHEMA");
    this.name = "JsonSchemaError";
    this.violations = violations;
  }
};
var CONSTRAINT_KEYWORDS = /* @__PURE__ */ new Set([
  "type",
  "oneOf",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "enum",
  "const"
]);
var ANNOTATION_KEYWORDS = /* @__PURE__ */ new Set([
  "description",
  "title",
  "default",
  "examples"
]);
var SCHEMA_TYPES = [
  "object",
  "array",
  "string",
  "number",
  "integer",
  "boolean",
  "null"
];
function hasIntrinsicConstructor2(prototype, name) {
  const constructor = Object.getOwnPropertyDescriptor(prototype, "constructor")?.value;
  if (typeof constructor !== "function") return false;
  try {
    return constructor.name === name && constructor.prototype === prototype && Function.prototype.toString.call(constructor) === `function ${name}() { [native code] }`;
  } catch {
    return false;
  }
}
function isIntrinsicObjectPrototype2(value) {
  return Object.getPrototypeOf(value) === null && hasIntrinsicConstructor2(value, "Object");
}
function isPlainJsonRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === null || typeof prototype === "object" && isIntrinsicObjectPrototype2(prototype);
  } catch {
    return false;
  }
}
function hasPlainArrayPrototype2(value) {
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(prototype) || !hasIntrinsicConstructor2(prototype, "Array")) return false;
  const objectPrototype = Object.getPrototypeOf(prototype);
  return typeof objectPrototype === "object" && objectPrototype !== null && isIntrinsicObjectPrototype2(objectPrototype);
}
function hasOnlyEnumerableStringKeys(value) {
  try {
    return Reflect.ownKeys(value).every((key) => typeof key === "string" && Object.prototype.propertyIsEnumerable.call(value, key));
  } catch {
    return false;
  }
}
function isJsonSchemaRecord(value) {
  return isPlainJsonRecord(value) && hasOnlyEnumerableStringKeys(value);
}
function isPlainJsonArray(value) {
  if (!Array.isArray(value)) return false;
  try {
    if (!hasPlainArrayPrototype2(value) || Reflect.ownKeys(value).length !== value.length + 1) return false;
    for (let index = 0; index < value.length; index++) if (!Object.hasOwn(value, index)) return false;
    return true;
  } catch {
    return false;
  }
}
function isJsonNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0);
}
function scalarMatches(type, value) {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return isJsonNumber(value);
    case "integer":
      return isJsonNumber(value) && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    /* v8 ignore next -- JsonSchemaScalarType is closed; this retains compile-time exhaustiveness. */
    default:
      return assertNever(type, "JsonSchemaType");
  }
}
var ONE_OF_SIBLING_KEYWORDS = [
  "properties",
  "required",
  "additionalProperties",
  "items",
  "enum",
  "const"
];
function checkObjectSchemaTail(node, path, properties, violations) {
  const hasRequired = Object.hasOwn(node, "required");
  const required = hasRequired ? node.required : void 0;
  if (hasRequired) if (!isPlainJsonArray(required) || required.some((entry) => typeof entry !== "string")) violations.push(`${path}.required must be an array of strings`);
  else {
    const declared = isJsonSchemaRecord(properties) ? properties : {};
    for (const key of required) if (!Object.hasOwn(declared, key)) violations.push(`${path}.required names "${key}" which is not in properties`);
  }
  if (Object.hasOwn(node, "additionalProperties") && typeof node.additionalProperties !== "boolean") violations.push(`${path}.additionalProperties must be a boolean`);
}
function checkSchemaNode(root, rootPath, violations, seen) {
  const tasks = [{
    kind: "enter",
    node: root,
    path: rootPath
  }];
  for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
    if (task.kind === "leave") {
      seen.delete(task.node);
      continue;
    }
    if (task.kind === "one-of-tail") {
      for (const key of ONE_OF_SIBLING_KEYWORDS) if (Object.hasOwn(task.node, key)) violations.push(`${task.path}.${key} is not supported beside oneOf`);
      continue;
    }
    if (task.kind === "object-tail") {
      checkObjectSchemaTail(task.node, task.path, task.properties, violations);
      continue;
    }
    const { node, path } = task;
    if (!isJsonSchemaRecord(node)) {
      violations.push(`${path} must be a schema object`);
      continue;
    }
    if (seen.has(node)) {
      violations.push(`${path} is circular`);
      continue;
    }
    seen.add(node);
    tasks.push({
      kind: "leave",
      node
    });
    for (const key of Object.keys(node)) {
      if (CONSTRAINT_KEYWORDS.has(key)) continue;
      if (ANNOTATION_KEYWORDS.has(key)) {
        try {
          if (!isJsonValue(node[key])) violations.push(`${path}.${key} annotation must be lossless JSON data`);
        } catch {
          violations.push(`${path}.${key} annotation must be lossless JSON data`);
        }
        continue;
      }
      violations.push(`${path}.${key} is not a supported keyword (subset: type/oneOf/properties/required/additionalProperties/items/enum/const + annotations)`);
    }
    if (Object.hasOwn(node, "description") && typeof node.description !== "string") violations.push(`${path}.description must be a string`);
    if (Object.hasOwn(node, "title") && typeof node.title !== "string") violations.push(`${path}.title must be a string`);
    const hasType = Object.hasOwn(node, "type");
    const hasOneOf = Object.hasOwn(node, "oneOf");
    if (hasType && hasOneOf) {
      violations.push(`${path} cannot declare both type and oneOf`);
      continue;
    }
    if (!hasType && !hasOneOf) {
      for (const key of ONE_OF_SIBLING_KEYWORDS) if (Object.hasOwn(node, key)) violations.push(`${path}.${key} requires type or oneOf`);
      continue;
    }
    if (hasOneOf) {
      const oneOf = node.oneOf;
      tasks.push({
        kind: "one-of-tail",
        node,
        path
      });
      if (!isPlainJsonArray(oneOf) || oneOf.length < 2) violations.push(`${path}.oneOf must be an array of at least two schemas`);
      else for (let index = oneOf.length - 1; index >= 0; index--) tasks.push({
        kind: "enter",
        node: oneOf[index],
        path: `${path}.oneOf[${index}]`
      });
      continue;
    }
    const type = node.type;
    if (typeof type !== "string" || !SCHEMA_TYPES.includes(type)) {
      violations.push(Array.isArray(type) ? `${path}.type must be a single type string (type arrays are not supported)` : `${path}.type must be one of ${SCHEMA_TYPES.join("/")}`);
      continue;
    }
    const schemaType = type;
    for (const [key, types] of Object.entries({
      properties: ["object"],
      required: ["object"],
      additionalProperties: ["object"],
      items: ["array"],
      enum: [
        "string",
        "number",
        "integer",
        "boolean",
        "null"
      ],
      const: [
        "string",
        "number",
        "integer",
        "boolean",
        "null"
      ]
    })) if (Object.hasOwn(node, key) && !types.includes(schemaType)) violations.push(`${path}.${key} is not supported on type "${schemaType}"`);
    switch (schemaType) {
      case "object": {
        const properties = Object.hasOwn(node, "properties") ? node.properties : void 0;
        tasks.push({
          kind: "object-tail",
          node,
          path,
          properties
        });
        if (Object.hasOwn(node, "properties")) if (!isJsonSchemaRecord(properties)) violations.push(`${path}.properties must be an object of schemas`);
        else {
          const entries = Object.entries(properties);
          for (let index = entries.length - 1; index >= 0; index--) {
            const entry = entries[index];
            if (entry === void 0) continue;
            tasks.push({
              kind: "enter",
              node: entry[1],
              path: `${path}.properties.${entry[0]}`
            });
          }
        }
        break;
      }
      case "array":
        if (Object.hasOwn(node, "items")) tasks.push({
          kind: "enter",
          node: node.items,
          path: `${path}.items`
        });
        break;
      case "string":
      case "number":
      case "integer":
      case "boolean":
      case "null": {
        const hasEnum = Object.hasOwn(node, "enum");
        const allowed = hasEnum ? node.enum : void 0;
        const enumValid = isPlainJsonArray(allowed) && allowed.length > 0 && allowed.every((entry) => scalarMatches(schemaType, entry));
        if (hasEnum && !enumValid) violations.push(`${path}.enum must be a non-empty array of ${schemaType} values`);
        const hasConst = Object.hasOwn(node, "const");
        const declaredConst = hasConst ? node.const : void 0;
        const constValid = scalarMatches(schemaType, declaredConst);
        if (hasConst) {
          if (!constValid) violations.push(`${path}.const must be a ${schemaType} value`);
          else if (enumValid && !allowed.includes(declaredConst)) violations.push(`${path}.const must be one of ${path}.enum when both are declared`);
        }
        break;
      }
      /* v8 ignore next -- schemaType was narrowed from the closed SCHEMA_TYPES table above. */
      default:
        assertNever(schemaType, "JsonSchemaType");
    }
  }
}
function assertSupportedJsonSchema(schema) {
  const violations = [];
  checkSchemaNode(schema, "schema", violations, /* @__PURE__ */ new Set());
  if (violations.length > 0) throw new JsonSchemaError(violations);
}
function safelyIsJsonValue(value) {
  try {
    return isJsonValue(value);
  } catch {
    return false;
  }
}
function diagnosticPath(path) {
  return path === "" ? "arguments" : path;
}
function propertyPath(path, key) {
  return path === "" ? key : `${path}.${key}`;
}
function losslessValueViolation(path) {
  return [`"${diagnosticPath(path)}" must be a lossless JSON value`];
}
function appendViolations(target, source) {
  for (const violation of source) target.push(violation);
}
function valueFrame(node, value, path) {
  return {
    node,
    value,
    path,
    catches: false,
    phase: "start",
    children: [],
    childIndex: 0,
    violations: [],
    tailViolations: [],
    matches: 0
  };
}
function checkScalarValue(node, value, path) {
  const allowed = Object.hasOwn(node, "enum") ? node.enum : void 0;
  if (allowed !== void 0 && !allowed.includes(value)) return [`"${diagnosticPath(path)}" must be one of ${JSON.stringify(allowed)}`];
  if (Object.hasOwn(node, "const") && value !== node.const) return [`"${diagnosticPath(path)}" must be ${JSON.stringify(node.const)}`];
  return [];
}
function checkValue(schema, value, path) {
  const frames = [valueFrame(schema, value, path)];
  let rootResult;
  const receive = (result) => {
    const parent = frames.at(-1);
    if (parent === void 0) {
      rootResult = result;
      return;
    }
    if (parent.kind === "oneOf") {
      if (result.length === 0) parent.matches++;
    } else appendViolations(parent.violations, result);
  };
  const finish = (result) => {
    frames.pop();
    receive(result);
  };
  while (frames.length > 0) {
    const frame = frames.at(-1);
    if (frame === void 0) break;
    try {
      if (frame.phase === "children") {
        if (frame.childIndex < frame.children.length) {
          const child = frame.children[frame.childIndex];
          if (child === void 0) throw new Error("missing schema-value child frame");
          frame.childIndex++;
          frames.push(valueFrame(child.node, child.value, child.path));
          continue;
        }
        if (frame.kind === "oneOf") {
          finish(frame.matches === 1 ? [] : [`"${diagnosticPath(frame.path)}" must match exactly one oneOf branch (matched ${frame.matches})`]);
          continue;
        }
        appendViolations(frame.violations, frame.tailViolations);
        if (frame.violations.length > 0) finish(frame.violations);
        else if (frame.kind === "object") finish(safelyIsJsonValue(frame.value) ? [] : [`"${diagnosticPath(frame.path)}" must be a lossless JSON object`]);
        else finish(safelyIsJsonValue(frame.value) ? [] : [`"${diagnosticPath(frame.path)}" must be a dense lossless JSON array`]);
        continue;
      }
      const nodeType = Object.hasOwn(frame.node, "type") ? frame.node.type : void 0;
      frame.catches = !(nodeType !== void 0 && !SCHEMA_TYPES.includes(nodeType));
      const oneOf = Object.hasOwn(frame.node, "oneOf") ? frame.node.oneOf : void 0;
      if (oneOf !== void 0) {
        frame.kind = "oneOf";
        frame.children = Array.from(oneOf, (branch) => ({
          node: branch,
          value: frame.value,
          path: frame.path
        }));
        frame.childIndex = 0;
        frame.matches = 0;
        frame.phase = "children";
        continue;
      }
      if (nodeType === void 0) {
        finish(safelyIsJsonValue(frame.value) ? [] : losslessValueViolation(frame.path));
        continue;
      }
      switch (nodeType) {
        case "object": {
          if (!isPlainJsonRecord(frame.value)) {
            finish([`"${diagnosticPath(frame.path)}" must be an object`]);
            break;
          }
          const properties = Object.hasOwn(frame.node, "properties") ? frame.node.properties ?? {} : {};
          const violations = [];
          const required = Object.hasOwn(frame.node, "required") ? frame.node.required ?? [] : [];
          for (const key of required) if (!Object.hasOwn(frame.value, key) || frame.value[key] === void 0) violations.push(`missing required property "${propertyPath(frame.path, key)}"`);
          const children = [];
          for (const [key, child] of Object.entries(properties)) {
            if (!Object.hasOwn(frame.value, key) || frame.value[key] === void 0) continue;
            children.push({
              node: child,
              value: frame.value[key],
              path: propertyPath(frame.path, key)
            });
          }
          const tailViolations = [];
          if (Object.hasOwn(frame.node, "additionalProperties") && frame.node.additionalProperties === false) {
            for (const key of Object.keys(frame.value)) if (!Object.hasOwn(properties, key)) tailViolations.push(`"${propertyPath(frame.path, key)}" is not a declared property (additionalProperties: false)`);
          }
          frame.kind = "object";
          frame.children = children;
          frame.childIndex = 0;
          frame.violations = violations;
          frame.tailViolations = tailViolations;
          frame.phase = "children";
          break;
        }
        case "array": {
          if (!Array.isArray(frame.value)) {
            finish([`"${diagnosticPath(frame.path)}" must be an array`]);
            break;
          }
          const items = Object.hasOwn(frame.node, "items") ? frame.node.items : void 0;
          const children = items === void 0 ? [] : frame.value.flatMap((entry, index) => [{
            node: items,
            value: entry,
            path: `${frame.path}[${index}]`
          }]);
          frame.kind = "array";
          frame.children = children;
          frame.childIndex = 0;
          frame.violations = [];
          frame.phase = "children";
          break;
        }
        case "string":
          finish(typeof frame.value === "string" ? checkScalarValue(frame.node, frame.value, frame.path) : [`"${diagnosticPath(frame.path)}" must be a string`]);
          break;
        case "number":
          finish(typeof frame.value !== "number" ? [`"${diagnosticPath(frame.path)}" must be a number`] : !isJsonNumber(frame.value) ? [`"${diagnosticPath(frame.path)}" must be a finite JSON number`] : checkScalarValue(frame.node, frame.value, frame.path));
          break;
        case "integer":
          finish(!isJsonNumber(frame.value) || !Number.isInteger(frame.value) ? [`"${diagnosticPath(frame.path)}" must be an integer`] : checkScalarValue(frame.node, frame.value, frame.path));
          break;
        case "boolean":
          finish(typeof frame.value === "boolean" ? checkScalarValue(frame.node, frame.value, frame.path) : [`"${diagnosticPath(frame.path)}" must be a boolean`]);
          break;
        case "null":
          finish(frame.value === null ? checkScalarValue(frame.node, frame.value, frame.path) : [`"${diagnosticPath(frame.path)}" must be null`]);
          break;
        default:
          finish(assertNever(nodeType, "JsonSchemaType"));
      }
    } catch (error) {
      let failed = frames.pop();
      while (failed !== void 0 && !failed.catches) failed = frames.pop();
      if (failed === void 0) throw error;
      receive(losslessValueViolation(failed.path));
    }
  }
  return rootResult ?? losslessValueViolation(path);
}
function validateJsonSchemaValue(schema, value, path = "value") {
  return checkValue(schema, value, path);
}
var ANNOTATION_KEYS = [
  "description",
  "title",
  "default",
  "examples"
];
function authorError(message) {
  throw new JsonSchemaError([message]);
}
function copyAnnotations(source, target) {
  if (Object.hasOwn(source, "description")) target.description = source.description;
  if (Object.hasOwn(source, "title")) target.title = source.title;
  if (Object.hasOwn(source, "default")) target.default = source.default;
  if (Object.hasOwn(source, "examples")) target.examples = source.examples;
}
function assertAuthorKeys(source, path, allowed) {
  for (const key of Object.keys(source)) if (!allowed.includes(key)) authorError(`${path}.${key} is not supported by the value schema DSL`);
}
function assignCompiledNode(destination, node) {
  switch (destination.kind) {
    case "root":
      destination.holder.value = node;
      break;
    case "property":
      Object.defineProperty(destination.target, destination.key, {
        value: node,
        enumerable: true,
        configurable: true,
        writable: true
      });
      break;
    case "item":
      destination.target.items = node;
      break;
    case "one-of":
      destination.target[destination.index] = node;
      break;
  }
}
function assignCompiledPropertyMap(destination, compiled) {
  if (destination.kind === "root") destination.holder.value = compiled;
  else destination.target.properties = compiled.properties;
}
function runSchemaCompiler(initial) {
  const seen = /* @__PURE__ */ new Set();
  const tasks = [initial];
  for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
    if (task.kind === "leave") {
      seen.delete(task.input);
      continue;
    }
    if (task.kind === "property-map-tail") {
      if (task.required.length > 0) {
        task.compiled.required = task.required;
        if (task.destination.kind === "object") task.destination.target.required = task.required;
      }
      continue;
    }
    if (task.kind === "property") {
      if (!isJsonSchemaRecord(task.property)) authorError(`${task.path} must be a value schema object`);
      if (Object.hasOwn(task.property, "required") && task.property.required !== true) authorError(`${task.path}.required must be true when present`);
      if (Object.hasOwn(task.property, "required") && task.property.required === true) task.required.push(task.key);
      tasks.push({
        kind: "value",
        input: task.property,
        path: task.path,
        allowRequired: true,
        destination: {
          kind: "property",
          target: task.properties,
          key: task.key
        }
      });
      continue;
    }
    if (task.kind === "property-map") {
      if (!isJsonSchemaRecord(task.input)) authorError(`${task.path} must be an object of value schemas`);
      if (seen.has(task.input)) authorError(`${task.path} is circular`);
      seen.add(task.input);
      const compiled = { properties: {} };
      const required = [];
      assignCompiledPropertyMap(task.destination, compiled);
      tasks.push({
        kind: "leave",
        input: task.input
      });
      tasks.push({
        kind: "property-map-tail",
        compiled,
        required,
        destination: task.destination
      });
      const entries = Object.entries(task.input);
      for (let index = entries.length - 1; index >= 0; index--) {
        const entry = entries[index];
        if (entry === void 0) continue;
        tasks.push({
          kind: "property",
          property: entry[1],
          path: `${task.path}.${entry[0]}`,
          key: entry[0],
          properties: compiled.properties,
          required
        });
      }
      continue;
    }
    const { input, path } = task;
    if (!isJsonSchemaRecord(input)) authorError(`${path} must be a value schema object`);
    if (seen.has(input)) authorError(`${path} is circular`);
    seen.add(input);
    const authorKeys = [...ANNOTATION_KEYS, ...task.allowRequired ? ["required"] : []];
    const node = {};
    assignCompiledNode(task.destination, node);
    tasks.push({
      kind: "leave",
      input
    });
    if (Object.hasOwn(input, "oneOf")) {
      assertAuthorKeys(input, path, [
        ...authorKeys,
        "oneOf",
        "type"
      ]);
      if (Object.hasOwn(input, "type")) authorError(`${path} cannot declare both type and oneOf`);
      if (!isPlainJsonArray(input.oneOf)) authorError(`${path}.oneOf must be an array of at least two value schemas`);
      const branches = [];
      node.oneOf = branches;
      copyAnnotations(input, node);
      for (let index = input.oneOf.length - 1; index >= 0; index--) tasks.push({
        kind: "value",
        input: input.oneOf[index],
        path: `${path}.oneOf[${index}]`,
        allowRequired: false,
        destination: {
          kind: "one-of",
          target: branches,
          index
        }
      });
      continue;
    }
    const inputType = Object.hasOwn(input, "type") ? input.type : void 0;
    switch (inputType) {
      case "json":
        assertAuthorKeys(input, path, [...authorKeys, "type"]);
        copyAnnotations(input, node);
        break;
      case "object":
        assertAuthorKeys(input, path, [
          ...authorKeys,
          "type",
          "properties",
          "additionalProperties"
        ]);
        if (!Object.hasOwn(input, "additionalProperties") || typeof input.additionalProperties !== "boolean") authorError(`${path}.additionalProperties must be explicitly true or false`);
        node.type = "object";
        copyAnnotations(input, node);
        node.additionalProperties = input.additionalProperties;
        if (Object.hasOwn(input, "properties")) tasks.push({
          kind: "property-map",
          input: input.properties,
          path: `${path}.properties`,
          destination: {
            kind: "object",
            target: node
          }
        });
        break;
      case "array":
        assertAuthorKeys(input, path, [
          ...authorKeys,
          "type",
          "items"
        ]);
        node.type = "array";
        copyAnnotations(input, node);
        if (Object.hasOwn(input, "items")) tasks.push({
          kind: "value",
          input: input.items,
          path: `${path}.items`,
          allowRequired: false,
          destination: {
            kind: "item",
            target: node
          }
        });
        break;
      case "string":
      case "number":
      case "integer":
      case "boolean":
      case "null":
        assertAuthorKeys(input, path, [
          ...authorKeys,
          "type",
          "enum",
          "const"
        ]);
        node.type = inputType;
        copyAnnotations(input, node);
        if (Object.hasOwn(input, "enum")) {
          if (!isPlainJsonArray(input.enum)) authorError(`${path}.enum must be a non-empty array of scalar values`);
          node.enum = Array.from(input.enum, (entry) => entry);
        }
        if (Object.hasOwn(input, "const")) node.const = input.const;
        break;
      default:
        authorError(`${path}.type must be string/number/integer/boolean/null/array/object/json, or use oneOf`);
    }
  }
}
function compilePropertyMap(input, path) {
  const holder = {};
  runSchemaCompiler({
    kind: "property-map",
    input,
    path,
    destination: {
      kind: "root",
      holder
    }
  });
  return holder.value ?? authorError(`${path} did not compile`);
}
function compileValueSchema(input, path) {
  const holder = {};
  runSchemaCompiler({
    kind: "value",
    input,
    path,
    allowRequired: false,
    destination: {
      kind: "root",
      holder
    }
  });
  return holder.value ?? authorError(`${path} did not compile`);
}
function valueSchemaSpecToJsonSchema(spec) {
  const schema = compileValueSchema(spec, "schema");
  assertSupportedJsonSchema(schema);
  return schema;
}
function parameterSchemaSpecToJsonSchema(spec) {
  const compiled = compilePropertyMap(spec, "parameters");
  const schema = {
    type: "object",
    properties: compiled.properties,
    ...compiled.required === void 0 ? {} : { required: compiled.required }
  };
  assertSupportedJsonSchema(schema);
  return schema;
}
var ToolArgsError = class extends HarnessError {
  /** Individual violations in schema-walk order. */
  violations;
  constructor(violations) {
    super(`invalid arguments: ${violations.join("; ")}`, "INVALID_ARGS");
    this.name = "ToolArgsError";
    this.violations = violations;
  }
};
function defineTool(options) {
  const userExecute = options.execute;
  const userFinalizeContent = options.finalizeContent;
  const userRender = options.output.render;
  const userPresentationMeta = options.output.presentationMeta;
  const userPresentCall = options.presentCall;
  const userPresentResult = options.presentResult;
  const userIsConcurrencySafe = options.isConcurrencySafe;
  if (options.timeoutMs !== void 0 && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) throw new Error(`defineTool(${options.name}): timeoutMs must be a positive finite number`);
  const parameters = parameterSchemaSpecToJsonSchema(options.parameters);
  const outputSchema = valueSchemaSpecToJsonSchema(options.output.schema);
  const validate = (args) => validateJsonSchemaValue(parameters, args, "");
  const tool = {
    name: options.name,
    description: options.description,
    parameters,
    output: {
      schema: outputSchema,
      render(args, value) {
        return userRender(args, value);
      },
      ...userPresentationMeta !== void 0 ? { presentationMeta(args, value) {
        return userPresentationMeta(args, value);
      } } : {}
    },
    ...options.timeoutMs !== void 0 ? { timeoutMs: options.timeoutMs } : {},
    async execute(args, exec) {
      const violations = validate(args);
      if (violations.length > 0) throw new ToolArgsError(violations);
      return userExecute(args, exec);
    }
  };
  if (userFinalizeContent) tool.finalizeContent = (exec, result) => userFinalizeContent(exec, result);
  if (userPresentCall) tool.presentCall = (args) => {
    if (validate(args).length > 0) return void 0;
    return userPresentCall(args);
  };
  if (userPresentResult) tool.presentResult = (args, result) => {
    if (validate(args).length > 0) return void 0;
    return userPresentResult(args, result);
  };
  if (userIsConcurrencySafe) tool.isConcurrencySafe = (args) => {
    if (validate(args).length > 0) return false;
    return userIsConcurrencySafe(args);
  };
  return tool;
}
var RUN_CODE_NAME = "run_code";
var TYPESCRIPT_FLAVOR = {
  description: "Execute a TypeScript program against the available tools. Takes two required arguments: `code`, the BODY of an async function (erasable syntax only; top-level `await` and `return` work), and `description`, a short summary of what the program does. Call tools as `await tools.name(args)` per the declarations in the system prompt. Only what you print or return is program output \u2014 curate it. Image-bearing subtool results are attached after the run.",
  codeDescription: "The program: the body of an async TypeScript function."
};
var RUN_CODE_FLAVORS = {
  typescript: TYPESCRIPT_FLAVOR,
  python: {
    description: "Execute a Python program against the available tools. Takes two required arguments: `code`, the BODY of an async function (top-level `await` and `return` work), and `description`, a short summary of what the program does. Call tools as `await tools.name(args)` per the declarations in the system prompt. Use `print(...)` and/or `return <value>` for program output \u2014 curate it. Image-bearing subtool results are attached after the run.",
    codeDescription: "The program: the body of an async Python function."
  }
};
var RUN_CODE_DESCRIPTION_PARAM_DESCRIPTION = 'Clear, concise description of what this program does in active voice, 5-10 words (shown in the UI). Examples: "Count TODO markers across packages"; "Read failing test and its fixture"; "Rename config key in every cordis.yml".';
function resolveFlavor(peekRuntime) {
  const runtime = peekRuntime();
  if (runtime === void 0) return TYPESCRIPT_FLAVOR;
  const flavor = RUN_CODE_FLAVORS[runtime.language];
  if (!Object.hasOwn(RUN_CODE_FLAVORS, runtime.language) || flavor === void 0) {
    const known = Object.keys(RUN_CODE_FLAVORS).map((name) => JSON.stringify(name)).join(", ");
    throw new Error(`dsh-tools: no run_code schema flavor registered for runtime language ${JSON.stringify(runtime.language)} (known: ${known})`);
  }
  return flavor;
}
var CodeRunFailedError = class extends HarnessError {
  constructor(message) {
    super(message, "CODE_RUN_FAILED");
    this.name = "CodeRunFailedError";
  }
};
function jsonNormalizeArgs(value) {
  let snapshot;
  try {
    snapshot = snapshotJsonValue(value);
  } catch (error) {
    throw new Error(`tool arguments must be lossless JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (snapshot === void 0) throw new Error("tool arguments must be lossless JSON (call the tool with an arguments object, e.g. `{}`)");
  const logged = snapshotJsonValue(snapshot);
  if (logged === void 0) throw new Error("tool arguments could not be detached for durable logging");
  return {
    dispatched: snapshot,
    logged
  };
}
var JSON_INDENT = "  ";
var MAX_JSON_INDENT_CHARS = 10;
function renderJsonValue(value) {
  const chunks = [];
  const tasks = [{
    kind: "value",
    value,
    depth: 0,
    compact: false
  }];
  for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
    if (task.kind === "text") {
      chunks.push(task.text);
      continue;
    }
    const current = task.value;
    if (current === null || typeof current === "boolean" || typeof current === "number") {
      chunks.push(String(current));
      continue;
    }
    if (typeof current === "string") {
      chunks.push(JSON.stringify(current));
      continue;
    }
    const compact = task.compact || (task.depth + 1) * 2 > MAX_JSON_INDENT_CHARS;
    const childDepth = task.depth + 1;
    if (Array.isArray(current)) {
      chunks.push("[");
      if (current.length === 0) {
        chunks.push("]");
        continue;
      }
      tasks.push({
        kind: "text",
        text: compact ? "]" : `
${JSON_INDENT.repeat(task.depth)}]`
      });
      for (let index = current.length - 1; index >= 0; index--) {
        const item = current[index];
        if (item === void 0) throw new Error("cannot render a sparse JSON array");
        tasks.push({
          kind: "value",
          value: item,
          depth: childDepth,
          compact
        });
        tasks.push({
          kind: "text",
          text: compact ? index === 0 ? "" : "," : `${index === 0 ? "\n" : ",\n"}${JSON_INDENT.repeat(childDepth)}`
        });
      }
      continue;
    }
    const keys = Object.keys(current);
    chunks.push("{");
    if (keys.length === 0) {
      chunks.push("}");
      continue;
    }
    tasks.push({
      kind: "text",
      text: compact ? "}" : `
${JSON_INDENT.repeat(task.depth)}}`
    });
    for (let index = keys.length - 1; index >= 0; index--) {
      const key = keys[index];
      if (key === void 0) throw new Error("cannot render a missing JSON object key");
      const item = current[key];
      if (item === void 0) throw new Error("cannot render an undefined JSON object property");
      tasks.push({
        kind: "value",
        value: item,
        depth: childDepth,
        compact
      });
      tasks.push({
        kind: "text",
        text: compact ? `${index === 0 ? "" : ","}${JSON.stringify(key)}:` : `${index === 0 ? "\n" : ",\n"}${JSON_INDENT.repeat(childDepth)}${JSON.stringify(key)}: `
      });
    }
  }
  return chunks.join("");
}
function renderValue(value) {
  return typeof value === "string" ? value : renderJsonValue(value);
}
function createRunCodeTool(registry, options) {
  const { requireRuntime, peekRuntime, maxParallel, shapeDispatchLog } = options;
  const definition = defineTool({
    name: RUN_CODE_NAME,
    description: TYPESCRIPT_FLAVOR.description,
    parameters: {
      code: {
        type: "string",
        required: true,
        description: TYPESCRIPT_FLAVOR.codeDescription
      },
      description: {
        type: "string",
        required: true,
        description: RUN_CODE_DESCRIPTION_PARAM_DESCRIPTION
      }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          logs: {
            type: "array",
            required: true,
            items: { type: "string" }
          },
          result: { type: "json" }
        }
      },
      render: (_args, value) => {
        const rendered = value.result === void 0 ? "" : renderValue(value.result);
        const parts = [value.logs.join("\n"), rendered].filter((part) => part.length > 0);
        return [{
          type: "text",
          text: parts.length > 0 ? parts.join("\n") : "(run_code completed with no output)"
        }];
      }
    },
    async execute(args, exec) {
      if (args.description.trim().length === 0) throw new Error("invalid description: expected a non-empty string");
      const runtime = requireRuntime();
      const runController = new AbortController();
      const onOuterAbort = () => {
        runController.abort(exec.signal.reason);
      };
      exec.signal.addEventListener("abort", onOuterAbort, { once: true });
      let dispatches = 0;
      const pendingQueue = [];
      const inFlight = /* @__PURE__ */ new Set();
      const logWork = /* @__PURE__ */ new Set();
      const commitQueue = [];
      let exclusiveActive = false;
      let driving = false;
      let driverRun = Promise.resolve();
      let wake;
      const wakeup = () => {
        const release = wake;
        wake = void 0;
        release?.();
      };
      const drive = () => {
        if (driving) return driverRun;
        driving = true;
        driverRun = (async () => {
          try {
            for (; ; ) {
              const signal = new Promise((resolve2) => {
                wake = resolve2;
              });
              const commitHead = commitQueue[0];
              if (commitHead !== void 0 && commitHead.settled) {
                commitQueue.shift();
                await commitHead.commit();
                if (commitHead.mode === "exclusive") exclusiveActive = false;
                continue;
              }
              const head = pendingQueue[0];
              if (head !== void 0) {
                if (runController.signal.aborted) {
                  pendingQueue.shift();
                  head.abandon();
                  continue;
                }
                const mode = head.classify();
                if (!exclusiveActive && (mode === "exclusive" ? inFlight.size === 0 : inFlight.size < maxParallel)) {
                  if (mode === "exclusive") exclusiveActive = true;
                  head.mode = mode;
                  pendingQueue.shift();
                  commitQueue.push(head);
                  await head.start();
                  const flight = head.flight.finally(() => {
                    inFlight.delete(flight);
                    wakeup();
                  });
                  inFlight.add(flight);
                  continue;
                }
              }
              if (pendingQueue.length === 0 && commitQueue.length === 0 && inFlight.size === 0) return;
              await signal;
            }
          } finally {
            driving = false;
            wake = void 0;
          }
        })();
        return driverRun;
      };
      const drainDispatches = async () => {
        await drive();
        while (logWork.size > 0) await Promise.allSettled([...logWork]);
      };
      const runOver = () => runController.signal.aborted;
      const binding = (name) => async (rawArgs) => {
        if (runOver()) throw new Error(`run_code run is over (${String(runController.signal.reason)}); ${name} not dispatched`);
        const normalized = jsonNormalizeArgs(rawArgs);
        const n = ++dispatches;
        const subCallId = CallId(`${String(exec.callId)}:code:${n}`);
        const input = {
          callId: subCallId,
          rootCallId: exec.rootCallId,
          name,
          arguments: normalized.dispatched,
          ...exec.agent ? { agent: exec.agent } : {},
          parent: exec.token,
          signal: runController.signal
        };
        const scheduler = registry[TOOL_RUNTIME_SCHEDULER];
        const outcome = await new Promise((resolve2, reject) => {
          let parked;
          const settle = (result) => {
            resolve2(result.isError ? {
              isError: true,
              message: result.error.message
            } : {
              isError: false,
              value: result.value
            });
            const agent = exec.agent;
            if (agent === void 0) return;
            const task = (async () => {
              const logged = await shapeDispatchLog({
                exec,
                agent,
                subCallId,
                name,
                isError: result.isError,
                content: result.content
              });
              agent.session.append("tool/code-dispatch", {
                rootCallId: exec.rootCallId,
                parentCallId: exec.callId,
                subCallId,
                name,
                arguments: normalized.logged,
                isError: result.isError,
                content: logged
              });
            })().finally(() => {
              logWork.delete(task);
            });
            logWork.add(task);
          };
          pendingQueue.push({
            flight: Promise.resolve(),
            settled: false,
            classify: () => registry.executionMode(input).kind,
            abandon: () => {
              reject(/* @__PURE__ */ new Error(`run_code run is over (${String(runController.signal.reason)}); ${name} tool call abandoned`));
            },
            async start() {
              exec.agent?.session.append("tool/code-dispatch-start", {
                rootCallId: exec.rootCallId,
                parentCallId: exec.callId,
                subCallId,
                name,
                arguments: normalized.logged
              });
              const prepared = await scheduler.prepare(input);
              if (prepared.kind === "dispatch") {
                this.flight = scheduler.dispatch(prepared.exec).then((dispatchOutcome) => {
                  parked = {
                    kind: dispatchOutcome.kind,
                    exec: prepared.exec,
                    result: dispatchOutcome.result
                  };
                  this.settled = true;
                });
                return;
              }
              parked = {
                kind: prepared.kind,
                exec: prepared.exec,
                result: prepared.result
              };
              this.settled = true;
            },
            async commit() {
              if (parked === void 0) return;
              const result = parked.kind === "post-result" ? await scheduler.finalize(parked.exec, parked.result) : scheduler.finish(parked.exec, parked.result);
              if (!result.isError && result.content.some((block) => block.type === "image")) exec.deferContext(createUserMessage({
                content: result.content,
                source: {
                  kind: "plugin",
                  plugin: "tools-code-mode"
                }
              }));
              for (const context of result.additionalContexts ?? []) exec.deferContext(context);
              if (result.concludesTurn) exec.concludeTurn();
              settle(result);
              while (logWork.size > maxParallel) await Promise.race(logWork);
            }
          });
          wakeup();
          drive();
        });
        if (runOver()) throw new Error(`run_code run is over (${String(runController.signal.reason)}); ${name} result discarded`);
        if (outcome.isError) throw new Error(outcome.message);
        return outcome.value;
      };
      const functions = /* @__PURE__ */ Object.create(null);
      for (const schema of registry.schemas(exec.agent)) {
        if (schema.name === "run_code") continue;
        Object.defineProperty(functions, schema.name, {
          enumerable: true,
          value: binding(schema.name)
        });
      }
      try {
        let result;
        try {
          result = await runtime.run({
            program: args.code,
            bindings: [{
              global: "tools",
              functions,
              errorClass: {
                name: "ToolCallError",
                memberNameProperty: "toolName"
              }
            }],
            signal: runController.signal
          });
        } finally {
          runController.abort("run_code settled");
          await drainDispatches();
        }
        if (result.error) {
          const logsText = result.logs.length > 0 ? `
Captured output:
${result.logs.join("\n")}` : "";
          throw new CodeRunFailedError(`code run failed (${result.error.kind}): ${result.error.message}${logsText}`);
        }
        return {
          logs: result.logs,
          ...result.value !== void 0 ? { result: result.value } : {}
        };
      } finally {
        exec.signal.removeEventListener("abort", onOuterAbort);
      }
    },
    presentCall: (args) => ({
      card: "generic",
      title: args.description,
      kind: "execute",
      rawInput: args.code
    })
  });
  Object.defineProperty(definition, "description", {
    enumerable: true,
    get: () => resolveFlavor(peekRuntime).description
  });
  Object.defineProperty(definition, "parameters", {
    enumerable: true,
    get: () => parameterSchemaSpecToJsonSchema({
      code: {
        type: "string",
        required: true,
        description: resolveFlavor(peekRuntime).codeDescription
      },
      description: {
        type: "string",
        required: true,
        description: RUN_CODE_DESCRIPTION_PARAM_DESCRIPTION
      }
    })
  });
  return definition;
}
var IDENTIFIER$1 = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
function renderKey(name) {
  return IDENTIFIER$1.test(name) ? name : JSON.stringify(name);
}
function pad$1(indent) {
  return "  ".repeat(indent);
}
function docLines$1(description, indent) {
  if (typeof description !== "string" || description.length === 0) return [];
  const collapsed = description.replace(/\s+/g, " ").trim();
  return [`${pad$1(indent)}/** ${collapsed.replaceAll("*/", String.raw`*\/`)} */`];
}
function renderScalar(value) {
  return JSON.stringify(value);
}
function renderConstrainedScalar$1(node, type) {
  const broad = type === "integer" ? "number" : type;
  if (Object.hasOwn(node, "const")) return renderScalar(node.const);
  if (Object.hasOwn(node, "enum")) return node.enum.map(renderScalar).join(" | ");
  return broad;
}
function typeDocumentFrom(parts) {
  return {
    parts,
    containsUnionOrIntersection: parts.some((part) => typeof part === "string" ? part.includes("|") || part.includes("&") : part.containsUnionOrIntersection)
  };
}
function typeDocument(...parts) {
  return typeDocumentFrom(parts);
}
function flattenTypeDocument(document) {
  const chunks = [];
  const tasks = [document];
  for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
    if (typeof task === "string") {
      chunks.push(task);
      continue;
    }
    for (let index = task.parts.length - 1; index >= 0; index--) {
      const part = task.parts[index];
      if (part !== void 0) tasks.push(part);
    }
  }
  return chunks.join("");
}
function schemaRenderFrame(node, indent) {
  return {
    node,
    indent,
    phase: "start",
    children: [],
    childIndex: 0,
    childDocuments: [],
    entries: []
  };
}
function renderSupportedSchema(schema, indent) {
  const frames = [schemaRenderFrame(schema, indent)];
  let rootDocument;
  const finish = (document) => {
    frames.pop();
    const parent = frames.at(-1);
    if (parent === void 0) rootDocument = document;
    else parent.childDocuments.push(document);
  };
  while (frames.length > 0) {
    const frame = frames.at(-1);
    if (frame === void 0) break;
    if (frame.phase === "children") {
      if (frame.childIndex < frame.children.length) {
        const child = frame.children[frame.childIndex];
        if (child === void 0) throw new Error("missing schema render child");
        frame.childIndex++;
        frames.push(schemaRenderFrame(child.node, child.indent));
        continue;
      }
      if (frame.kind === "oneOf") {
        const parts2 = [];
        for (let index = 0; index < frame.childDocuments.length; index++) {
          if (index > 0) parts2.push(" | ");
          const child = frame.childDocuments[index];
          if (child !== void 0) parts2.push(child);
        }
        finish(typeDocumentFrom(parts2));
        continue;
      }
      if (frame.kind === "array") {
        const child = frame.childDocuments[0];
        if (child === void 0) throw new Error("missing array item type");
        finish(child.containsUnionOrIntersection ? typeDocument("(", child, ")[]") : typeDocument(child, "[]"));
        continue;
      }
      const required = new Set(frame.node.required);
      const parts = ["{"];
      for (let index = 0; index < frame.entries.length; index++) {
        const entry = frame.entries[index];
        const child = frame.childDocuments[index];
        if (entry === void 0 || child === void 0) throw new Error("missing object property type");
        const [name, prop] = entry;
        for (const line of docLines$1(prop.description, frame.indent + 1)) parts.push("\n", line);
        parts.push("\n", `${pad$1(frame.indent + 1)}${renderKey(name)}${required.has(name) ? "" : "?"}: `, child, ";");
      }
      parts.push("\n", `${pad$1(frame.indent)}}`);
      const declared = typeDocumentFrom(parts);
      finish(frame.node.additionalProperties === false ? declared : typeDocument(declared, " & Record<string, JsonValue>"));
      continue;
    }
    const node = frame.node;
    if (node.oneOf !== void 0) {
      frame.kind = "oneOf";
      frame.children = Array.from(node.oneOf, (child) => ({
        node: child,
        indent: frame.indent
      }));
      frame.childIndex = 0;
      frame.childDocuments = [];
      frame.phase = "children";
      continue;
    }
    if (node.type === void 0) {
      finish(typeDocument("JsonValue"));
      continue;
    }
    switch (node.type) {
      case "string":
      case "number":
      case "integer":
      case "boolean":
      case "null":
        finish(typeDocument(renderConstrainedScalar$1(node, node.type)));
        break;
      case "array":
        if (node.items === void 0) finish(typeDocument("JsonValue[]"));
        else {
          frame.kind = "array";
          frame.children = [{
            node: node.items,
            indent: frame.indent
          }];
          frame.childIndex = 0;
          frame.childDocuments = [];
          frame.phase = "children";
        }
        break;
      case "object": {
        const open = node.additionalProperties !== false;
        const entries = Object.entries(node.properties ?? {});
        if (entries.length === 0) finish(typeDocument(open ? "Record<string, JsonValue>" : "Record<string, never>"));
        else {
          frame.kind = "object";
          frame.entries = entries;
          frame.children = entries.map(([, child]) => ({
            node: child,
            indent: frame.indent + 1
          }));
          frame.childIndex = 0;
          frame.childDocuments = [];
          frame.phase = "children";
        }
        break;
      }
      /* v8 ignore next -- assertSupportedJsonSchema narrowed this closed type union. */
      default:
        finish(typeDocument("unknown"));
    }
  }
  return rootDocument ?? typeDocument("unknown");
}
function jsonSchemaToTs(schema, indent = 0) {
  try {
    assertSupportedJsonSchema(schema);
    return flattenTypeDocument(renderSupportedSchema(schema, indent));
  } catch {
    return "unknown";
  }
}
var SDK_INSTRUCTIONS$1 = `## Writing code for run_code

\`run_code\` takes two required arguments: \`code\` \u2014 the body of an async TypeScript function (erasable syntax only \u2014 no \`enum\` or namespaces; type annotations are advisory, the code runs type-stripped) \u2014 and \`description\`, a short summary of what the program does. Inside the program:

- Call tools as \`await tools.name(args)\` \u2014 quoted access for exotic names: \`tools["my-tool"](args)\`. Every call resolves to the tool's typed canonical JSON value. Tool arguments must be lossless JSON.
- A FAILED tool call rejects with \`ToolCallError\`, whose \`toolName\` identifies the failed tool and whose \`message\` is human-readable \u2014 \`try/catch\` it to handle and continue.
- Independent read-only calls MAY overlap under \`Promise.all\` (safe calls run concurrently; mutating calls run alone, in submission order). Sequence dependent work with \`await\`.
- Emit results with \`return\` and/or \`console.log(...)\`. Only what you print or return is program output. A successful tool result containing an image is attached after the run so you can inspect it on the next step; every other intermediate result stays out of the conversation, so extract just what you need.

The available tools:`;
function renderToolsSdk(schemas) {
  const sorted = [...schemas].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const argsMembers = [];
  const outputMembers = [];
  for (const schema of sorted) {
    argsMembers.push(...docLines$1(schema.description, 1));
    argsMembers.push(`${pad$1(1)}${renderKey(schema.name)}: ${jsonSchemaToTs(schema.parameters, 1)};`);
    outputMembers.push(`${pad$1(1)}${renderKey(schema.name)}: ${jsonSchemaToTs(schema.output, 1)};`);
  }
  return `${SDK_INSTRUCTIONS$1}

\`\`\`ts
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

${[
    `interface ToolArgsMap {${argsMembers.length > 0 ? `
${argsMembers.join("\n")}
` : ""}}`,
    `interface ToolOutputMap {${outputMembers.length > 0 ? `
${outputMembers.join("\n")}
` : ""}}`,
    "type ToolName = keyof ToolOutputMap",
    [
      "declare class ToolCallError extends Error {",
      '  readonly name: "ToolCallError";',
      "  readonly toolName: ToolName;",
      "}"
    ].join("\n"),
    [
      "declare const tools: {",
      "  [K in ToolName]: (args: ToolArgsMap[K]) => Promise<ToolOutputMap[K]>;",
      "}"
    ].join("\n")
  ].join("\n\n")}
\`\`\``;
}
var IDENTIFIER = new RegExp("^[\\p{XID_Start}_]\\p{XID_Continue}*$", "u");
function isBareIdentifier(name) {
  return IDENTIFIER.test(name) && name.normalize("NFKC") === name;
}
var RESERVED = /* @__PURE__ */ new Set([
  "False",
  "None",
  "True",
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
  "__debug__"
]);
var TYPING_ORDER = [
  "Any",
  "Literal",
  "NotRequired",
  "Protocol",
  "TypedDict"
];
function pad(indent) {
  return "    ".repeat(indent);
}
var UNPRINTABLE = /[\u0000-\u0008\u000e-\u001f\u007f-\u009f]/g;
var LONE_SURROGATE = /[\ud800-\udfff]/gu;
function describe(schema) {
  const description = schema.description;
  if (typeof description !== "string") return void 0;
  const collapsed = description.replace(/\s+/g, " ").replace(UNPRINTABLE, (char) => `\\x${char.charCodeAt(0).toString(16).padStart(2, "0")}`).replace(LONE_SURROGATE, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`).trim();
  return collapsed.length === 0 ? void 0 : collapsed;
}
function docLines(description, indent) {
  const collapsed = describe({ description });
  if (collapsed === void 0) return [];
  const escaped = collapsed.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return [`${pad(indent)}"""${escaped}"""`];
}
function camelCase(raw) {
  const joined = raw.split(/[^\p{XID_Continue}]+|_+/u).filter((part) => part.length > 0).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join("").normalize("NFKC");
  return (new RegExp("^\\p{XID_Start}", "u").test(joined) ? joined : `Tool${joined}`).normalize("NFKC");
}
var MAX_CLASS_NAME_BASE = 120;
var MAX_LIST_NESTING = 180;
function capClassNameBase(base) {
  if (base.length <= MAX_CLASS_NAME_BASE) return base;
  const capped = base.slice(0, MAX_CLASS_NAME_BASE);
  return /[\uD800-\uDBFF]$/.test(capped) ? capped.slice(0, -1) : capped;
}
function allocateClassName(base, state) {
  const capped = capClassNameBase(base);
  let name = capped;
  if (state.usedClassNames.has(name)) {
    let n = state.nextClassCounter.get(capped) ?? 2;
    while (state.usedClassNames.has(`${capped}${n}`)) n++;
    name = `${capped}${n}`;
    state.nextClassCounter.set(capped, n + 1);
  }
  state.usedClassNames.add(name);
  return name;
}
function childClassName(base, segment) {
  return capClassNameBase(`${base}${segment}`.normalize("NFKC"));
}
function pyScalar(value) {
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" && Number.isInteger(value) && !Number.isSafeInteger(value)) return BigInt(value).toString();
  return String(value);
}
function renderConstrainedScalar(node, broad, state) {
  if (node.const !== void 0) {
    state.typing.add("Literal");
    return `Literal[${pyScalar(node.const)}]`;
  }
  if (node.enum !== void 0) {
    state.typing.add("Literal");
    return `Literal[${node.enum.map(pyScalar).join(", ")}]`;
  }
  return broad;
}
function renderType(schema, className, state) {
  const newFrame = (schema2, className2, listDepth) => ({
    schema: schema2,
    className: className2,
    phase: "start",
    listDepth,
    children: [],
    childIndex: 0,
    childTypes: [],
    entries: []
  });
  try {
    assertSupportedJsonSchema(schema);
    const frames = [newFrame(schema, className, 0)];
    let result;
    const finish = (type) => {
      frames.pop();
      const parent = frames.at(-1);
      if (parent === void 0) result = type;
      else parent.childTypes.push(type);
    };
    while (frames.length > 0) {
      const frame = frames.at(-1);
      if (frame === void 0) break;
      if (frame.phase === "children") {
        if (frame.childIndex < frame.children.length) {
          const child = frame.children[frame.childIndex];
          if (child === void 0) throw new Error("missing python render child");
          frame.childIndex++;
          frames.push(newFrame(child.schema, child.className, child.listDepth));
          continue;
        }
        if (frame.kind === "oneOf") {
          let union = "";
          for (const [index, childType] of frame.childTypes.entries()) union = index === 0 ? childType : `${union} | ${childType}`;
          finish(union);
          continue;
        }
        if (frame.kind === "array") {
          finish(`list[${frame.childTypes[0] ?? "Any"}]`);
          continue;
        }
        const node2 = frame.node;
        const name = frame.allocated;
        if (node2 === void 0 || name === void 0) throw new Error("missing typeddict frame state");
        const required = new Set(node2.required);
        const lines = [`class ${name}(TypedDict):`];
        for (let index = 0; index < frame.entries.length; index++) {
          const entry = frame.entries[index];
          const fieldType = frame.childTypes[index];
          if (entry === void 0 || fieldType === void 0) throw new Error("missing typeddict field type");
          const [field, fieldSchema] = entry;
          const description = describe(fieldSchema);
          if (description !== void 0) lines.push(`${pad(1)}# ${description}`);
          if (required.has(field)) lines.push(`${pad(1)}${field}: ${fieldType}`);
          else {
            state.typing.add("NotRequired");
            lines.push(`${pad(1)}${field}: NotRequired[${fieldType}]`);
          }
        }
        if (node2.additionalProperties !== false) lines.push(`${pad(1)}# Additional keys beyond those declared are allowed.`);
        if (lines.length === 1) lines.push(`${pad(1)}pass`);
        state.classes.push(lines.join("\n"));
        finish(name);
        continue;
      }
      frame.phase = "children";
      const node = frame.schema;
      if (node.oneOf !== void 0) {
        frame.kind = "oneOf";
        frame.children = node.oneOf.map((branch, index) => ({
          schema: branch,
          className: childClassName(frame.className, `${index + 1}`),
          listDepth: frame.listDepth
        }));
        continue;
      }
      if (node.type === void 0) {
        state.typing.add("Any");
        finish("Any");
        continue;
      }
      switch (node.type) {
        case "string":
          finish(renderConstrainedScalar(node, "str", state));
          break;
        case "number":
          finish(renderConstrainedScalar(node, "float", state));
          break;
        case "integer":
          finish(renderConstrainedScalar(node, "int", state));
          break;
        case "boolean":
          finish(renderConstrainedScalar(node, "bool", state));
          break;
        case "null":
          finish("None");
          break;
        case "array":
          if (node.items === void 0) {
            state.typing.add("Any");
            finish("list[Any]");
            break;
          }
          if (frame.listDepth >= MAX_LIST_NESTING) {
            state.typing.add("Any");
            finish("Any");
            break;
          }
          frame.kind = "array";
          frame.children = [{
            schema: node.items,
            className: frame.className,
            listDepth: frame.listDepth + 1
          }];
          break;
        case "object": {
          const entries = Object.entries(node.properties ?? {});
          if (className === "" || !entries.every(([name]) => isBareIdentifier(name) && !RESERVED.has(name) && !(name.startsWith("__") && !name.endsWith("__")))) {
            state.typing.add("Any");
            finish("dict[str, Any]");
            break;
          }
          if (entries.length === 0 && node.additionalProperties !== false) {
            state.typing.add("Any");
            finish("dict[str, Any]");
            break;
          }
          frame.kind = "typeddict";
          frame.node = node;
          frame.allocated = allocateClassName(frame.className, state);
          state.typing.add("TypedDict");
          frame.entries = entries;
          frame.children = entries.map(([field, child]) => ({
            schema: child,
            className: childClassName(frame.allocated ?? "", camelCase(field)),
            listDepth: 1
          }));
          break;
        }
        /* v8 ignore next 4 -- assertSupportedJsonSchema narrowed this closed type union. */
        default:
          state.typing.add("Any");
          finish("Any");
      }
    }
    return result ?? "Any";
  } catch {
    state.typing.add("Any");
    return "Any";
  }
}
var SDK_INSTRUCTIONS = `## Writing code for run_code

\`run_code\` takes two required arguments: \`code\` \u2014 the body of an async Python function (top-level \`await\` and \`return\` both work) \u2014 and \`description\`, a short summary of what the program does. At run time exactly two of the names declared below are bound: \`tools\` and \`ToolCallError\`. Everything else is a STATIC STUB describing argument and return types \u2014 in particular the \`TypedDict\` classes do NOT exist at run time, so build arguments as plain \`dict\`/\`list\` JSON values: \`await tools.name({"field": 1})\`, never \`FooArgs(field=1)\`, which raises \`NameError\`. Inside the program:

- Call tools as \`await tools.name(args)\` \u2014 subscript access for exotic, reserved, or underscore-leading names: \`await tools["my-tool"](args)\`. Every call resolves to the tool's typed canonical JSON value (each method's return type below). Tool arguments must be lossless JSON.
- A FAILED tool call raises \`ToolCallError\`, whose \`toolName\` identifies the failed tool and whose message is human-readable \u2014 wrap in \`try/except\` to handle and continue.
- Independent read-only calls MAY overlap under \`asyncio.gather\` (safe calls run concurrently; mutating calls run alone, in submission order). Sequence dependent work with \`await\`.
- Emit the run's answer with \`print(...)\` and/or a top-level \`return <value>\`; the returned value must be lossless JSON. Only what you print and return is program output. A successful tool result containing an image is attached after the run so you can inspect it on the next step; every other intermediate result stays out of the conversation, so extract just what you need.

The available tools:`;
function renderToolsSdkPy(schemas) {
  const sorted = [...schemas].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const state = {
    classes: [],
    usedClassNames: /* @__PURE__ */ new Set(),
    nextClassCounter: /* @__PURE__ */ new Map(),
    typing: /* @__PURE__ */ new Set(["Protocol"])
  };
  const members = [];
  let statements = 0;
  for (const schema of sorted) {
    const argType = renderType(schema.parameters, `${camelCase(schema.name)}Args`, state);
    const outputType = renderType(schema.output, `${camelCase(schema.name)}Output`, state);
    if (isBareIdentifier(schema.name) && !RESERVED.has(schema.name) && !schema.name.startsWith("_")) {
      const doc = docLines(schema.description, 2);
      members.push(doc.length > 0 ? `${pad(1)}async def ${schema.name}(self, args: ${argType}) -> ${outputType}:` : `${pad(1)}async def ${schema.name}(self, args: ${argType}) -> ${outputType}: ...`);
      members.push(...doc);
      statements += 1;
    } else {
      members.push(`${pad(1)}# tools[${JSON.stringify(schema.name)}](args: ${argType}) -> ${outputType}`);
      const description = describe(schema);
      if (description !== void 0) members.push(`${pad(1)}#   ${description}`);
    }
  }
  const body = (statements > 0 ? members : [`${pad(1)}pass`, ...members]).join("\n");
  const imports = TYPING_ORDER.filter((symbol) => state.typing.has(symbol));
  const classBlock = state.classes.length > 0 ? `${state.classes.join("\n\n")}

` : "";
  return `${SDK_INSTRUCTIONS}

\`\`\`python
${`from typing import ${imports.join(", ")}

class ToolCallError(Exception):
    toolName: str

${classBlock}class Tools(Protocol):
${body}

tools: Tools`}
\`\`\``;
}
var COLLAPSE_SECTION_ORDER = 99;
var CODE_ONLY_INSTRUCTION = `\`${RUN_CODE_NAME}\` is the only tool you can call directly \u2014 a tool call naming any other tool fails. Reach every tool the SDK declares below from inside the program.`;
var SDK_RENDERERS = {
  typescript: renderToolsSdk,
  python: renderToolsSdkPy
};
var TOOL_RUNTIME_SCHEDULER = /* @__PURE__ */ Symbol("@deepseek-ai/dsh-tools.scheduler");
var TOOL_ABORTED = "ABORTED";
var TOOL_ABORTED_BEFORE_DISPATCH = "ABORTED_BEFORE_DISPATCH";
var ToolNotFoundError = class extends HarnessError {
  /**
  * @param toolName - the name the caller asked for.
  * @param reachableFrom - how the model reaches this tool instead, when the
  *   name IS visible and only the presentation denies calling it directly.
  *   Omitted for a name that is registered nowhere.
  */
  constructor(toolName, reachableFrom) {
    super(reachableFrom === void 0 ? `unknown tool "${toolName}"` : `unknown tool "${toolName}": ${reachableFrom}`, "UNKNOWN_TOOL");
    this.name = "ToolNotFoundError";
  }
};
var ToolOutputError = class extends HarnessError {
  /** Schema/value violations in validation order. */
  violations;
  constructor(toolName, violations) {
    super(`tool "${toolName}" returned invalid output: ${violations.join("; ")}`, "INVALID_TOOL_OUTPUT");
    this.name = "ToolOutputError";
    this.violations = violations;
  }
};
function projectionError(toolName, projector, error) {
  return new ToolOutputError(toolName, [`output.${projector} failed: ${errorMessage(error)}`]);
}
function snapshotProjection(toolName, projector, candidate) {
  try {
    const detached = snapshotJsonValue(candidate);
    if (detached === void 0) throw new ToolOutputError(toolName, [`output.${projector} returned non-lossless JSON`]);
    return detached;
  } catch (error) {
    if (error instanceof ToolOutputError) throw error;
    throw projectionError(toolName, projector, error);
  }
}
function snapshotToolValue(toolName, candidate) {
  try {
    const detached = snapshotJsonValue(candidate);
    if (detached === void 0) throw new ToolOutputError(toolName, ["value is not lossless JSON"]);
    return detached;
  } catch (error) {
    if (error instanceof ToolOutputError) throw error;
    throw new ToolOutputError(toolName, [`value snapshot failed: ${errorMessage(error)}`]);
  }
}
function errorMessage(error) {
  try {
    if (error instanceof Error) return error.message;
    if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") return error.message;
    return String(error);
  } catch {
    return "<unprintable thrown value>";
  }
}
function failureMessageFromContent(content) {
  const text = content.map((block) => block.type === "text" ? block.text : `[${block.type} content]`).join("\n");
  return text.length > 0 ? text : "tool result blocked by post-execute policy";
}
function materializePresentation(candidate) {
  const detached = snapshotJsonValue(candidate);
  if (detached === void 0) throw new TypeError("tool result must be losslessly JSON-serializable");
  return deepFreeze(detached);
}
function errorInfo(error) {
  try {
    return error instanceof HarnessError ? {
      name: error.name,
      code: error.code
    } : void 0;
  } catch {
    return;
  }
}
var ToolLayer = class {
  tools;
  restrictions = new AnonymousEntries();
  guards = new AnonymousEntries();
  /**
  * Presentation this scope's agent declared for itself, shadowing the
  * deployment default. One cell rather than an entry table: two answers to
  * "which form does the model see" is a contradiction, not a merge.
  */
  mode;
  constructor(scope) {
    this.tools = new NamedEntries((name) => /* @__PURE__ */ new Error(scope === void 0 ? `tool "${name}" is already registered (for a per-agent variant, register through that agent's \`agent.ctx\` instead)` : `tool "${name}" is already registered in this scope`));
  }
  /** Whether every contribution table in this aggregate layer is empty. */
  isEmpty() {
    return this.tools.isEmpty() && this.restrictions.isEmpty() && this.guards.isEmpty() && this.mode === void 0;
  }
  /** Whether every compiled restriction in this layer admits a global tool name. */
  admits(name) {
    for (const filter of this.restrictions.values()) if (filter.allow !== void 0 && !filter.allow.has(name) || filter.deny !== void 0 && filter.deny.has(name)) return false;
    return true;
  }
  /** First monotonic denial from this layer's live guard registrations. */
  guardReason(exec) {
    for (const guard of this.guards.values()) {
      const reason = guard(exec);
      if (reason !== void 0) return reason;
    }
  }
};
function resolveMaxParallelSubCalls(value) {
  const maxParallelSubCalls = value ?? 10;
  if (!Number.isInteger(maxParallelSubCalls) || maxParallelSubCalls < 1) throw new Error("maxParallelSubCalls must be a positive integer");
  return maxParallelSubCalls;
}
var ToolRuntime = class extends Service {
  static inject = ["systemPrompt"];
  static Config = Schema.object({
    mode: Schema.union([
      "native",
      "code",
      "both"
    ]).default("native"),
    maxParallelSubCalls: Schema.natural().min(1).default(10)
  });
  /** Internal staged view consumed by `dsh-agent-loop`'s parallel scheduler. */
  [TOOL_RUNTIME_SCHEDULER] = {
    prepare: (exec) => this.prepareScheduledExecution(exec),
    dispatch: (exec) => this.dispatchScheduledExecution(exec),
    finalize: (exec, result) => this.finalizeScheduledExecution(exec, result),
    finish: (exec, result) => this.finishScheduledExecution(exec, result)
  };
  /** Context deferred by a running tool body, keyed by its scheduler-owned execution. */
  deferredContexts = /* @__PURE__ */ new WeakMap();
  /** Executions whose tool body declared the current turn complete. */
  concludingExecutions = /* @__PURE__ */ new WeakSet();
  /** Original caller cancellation, kept outside the wrapper-mutable execution object. */
  cancellationStates = /* @__PURE__ */ new WeakMap();
  /** Definition-owned final content transform snapshotted before policy begins. */
  contentFinalizers = /* @__PURE__ */ new WeakMap();
  layers = new ScopedLayers((scope) => new ToolLayer(scope), () => {
    this.ctx.emit("tools/change");
  });
  /** Presentation for scopes that declare none; {@link presentAs} shadows it per scope. */
  defaultMode;
  maxParallelSubCalls;
  /**
  * Reserved presentation transport, kept outside the filterable registration
  * layers. Built on first need rather than at construction: which agents run
  * a code mode is no longer known when the service is constructed, and the
  * transport is stateless beyond its closures over `this`.
  */
  codeTransport;
  constructor(ctx, config = {}) {
    super(ctx, "tools");
    this.defaultMode = config.mode ?? "native";
    this.maxParallelSubCalls = resolveMaxParallelSubCalls(config.maxParallelSubCalls);
    ctx.systemPrompt.tools((context) => this.wireSchemas(context.scope));
    if (this.defaultMode !== "native") {
      ctx.systemPrompt.section(this.collapseSection());
      ctx.systemPrompt.section(this.sdkSection());
    }
  }
  /**
  * The prompt statement of the `code` executor collapse, registered wherever
  * {@link sdkSection} is and rendering empty outside an effective `code`.
  *
  * Every tool contributes its own guidance section naming its tool, none of
  * them qualify how that tool is reached, and they all render before the SDK
  * (orders 100-199 against {@link SDK_SECTION_ORDER}). Without this the model
  * reads a catalog of tools it is told to use and no statement that only
  * `run_code` may be called, so it emits a native call, receives
  * `UNKNOWN_TOOL` for a tool the prompt just declared, and concludes the
  * deployment is inconsistent. {@link COLLAPSE_SECTION_ORDER} places the rule
  * before that guidance rather than after it.
  *
  * `both` renders empty: native calls do execute there, so the rule is false.
  * @returns the section registration.
  */
  collapseSection() {
    return {
      name: "tools:code-only",
      order: COLLAPSE_SECTION_ORDER,
      text: (context) => this.modeFor(context.scope) === "code" ? CODE_ONLY_INSTRUCTION : ""
    };
  }
  /**
  * The generated-SDK prompt section, registered globally by a code-mode
  * deployment and per scope by {@link presentAs}.
  *
  * The body regenerates from the CALLING scope, and renders empty for an
  * agent presenting natively — an agent that opted out under a code-mode
  * deployment still sees the global registration, and an empty section is
  * dropped from the rendered prompt.
  * @returns the section registration.
  */
  sdkSection() {
    return {
      name: "tools:sdk",
      order: 150,
      text: (context) => {
        const mode = this.modeFor(context.scope);
        if (mode === "native") return "";
        const runtime = this.requireCodeRuntime(mode);
        const render = SDK_RENDERERS[runtime.language];
        if (render === void 0) throw new Error(`dsh-tools: no SDK renderer for ${runtime.language}`);
        return render(this.sdkSchemas(context.scope));
      }
    };
  }
  /**
  * The presentation one scope's agent sees: its own declaration, else the
  * deployment default.
  * @param scope - the calling agent, or undefined for the global view.
  * @returns the resolved presentation mode.
  */
  modeFor(scope) {
    const layers = this.layers.chainLayers(scope);
    for (let index = layers.length - 1; index >= 0; index -= 1) {
      const mode = layers[index]?.mode;
      if (mode !== void 0) return mode;
    }
    return this.defaultMode;
  }
  /**
  * The reserved `run_code` transport, built on first need.
  *
  * It never enters the global layer: per-agent restrictions must not remove
  * it, and a scoped registration must not shadow it. The visibility resolver
  * appends it after resolving the filterable global/scoped capability layers,
  * and only for scopes whose mode actually presents it.
  * @returns the shared transport definition.
  */
  requireCodeTransport() {
    this.codeTransport ??= createRunCodeTool(this, {
      requireRuntime: () => this.requireCodeRuntime(this.defaultMode),
      peekRuntime: () => this.ctx.get("codeRuntime"),
      maxParallel: this.maxParallelSubCalls,
      shapeDispatchLog: (dispatch) => this.shapeDispatchLog(dispatch)
    });
    return this.codeTransport;
  }
  /**
  * Present the calling scope's tools in `mode` instead of the deployment
  * default. Nearest scope on the chain wins, so a preset's standing
  * declaration covers every agent joined under it.
  *
  * Scoped only, and one declaration per scope: this is how an agent preset
  * composes Code Mode agents beside native ones in the same process, and a
  * process-global override would be the `mode` config field instead.
  * @param mode - the presentation the covered agents' models see.
  * @returns the exact disposer that restores the deployment default.
  */
  presentAs(mode) {
    const ctx = this.ctx;
    if (scopeOf(ctx) === void 0) throw new Error("tools.presentAs() requires a scoped context (agent.ctx): a context-global presentation is the `mode` config field on the tools row");
    return ctx.effect(function* () {
      yield this.layers.effect(ctx, (layer) => {
        if (layer.mode !== void 0) throw new Error(`tools.presentAs("${mode}") conflicts with "${layer.mode}" already declared for this scope; one composition selects one presentation`);
        layer.mode = mode;
        return () => {
          layer.mode = void 0;
        };
      }, { label: "tools.presentAs()" });
      if (mode !== "native") {
        yield ctx.systemPrompt.section(this.collapseSection());
        yield ctx.systemPrompt.section(this.sdkSection());
      }
    }.bind(this), "tools.presentAs()");
  }
  /**
  * Build one scope's wire schemas and names for prompt-order validation.
  * Restrictions do not make known tools invalid, but a mode collapse does.
  */
  wireSchemas(scope) {
    const view = this.view(scope);
    const mode = this.modeFor(scope);
    if (mode === "native") return {
      schemas: [...view.visible.values()].map((definition) => this.schemaOf(definition, false)),
      knownNames: [...view.knownNames]
    };
    this.requireCodeRuntime(mode);
    const schemas = [...view.visible.values()].map((definition) => this.schemaOf(definition, false));
    if (mode === "code") return {
      schemas: schemas.filter((schema) => schema.name === RUN_CODE_NAME),
      knownNames: [RUN_CODE_NAME]
    };
    return {
      schemas,
      knownNames: [...view.knownNames, RUN_CODE_NAME]
    };
  }
  /**
  * Resolve the code runtime or throw the actionable misconfiguration error.
  * Read at use time (assembly / run_code execution), NOT via static
  * `inject`: an inject entry would hold `ctx.tools` — and every tool plugin
  * behind it — hostage to a code runtime existing even under `mode:
  * 'native'` (the loop's optional-backend idiom, same as
  * `sessionPersistence`).
  *
  * Assembly and `run_code` execution read separately, so the language is not
  * bound to a request. Harmless while one published backend exists — both
  * reads return the same flavor — but a reload that swapped in a second
  * language between them would hand a program written against one SDK to the
  * other. Binding it is deferred until a second backend ships (the first
  * point it is testable); rationale in the
  * [language-dispatch note](../../../../.agents/notes/implemented/feature/2026-07-31-code-mode-language-dispatch.md).
  */
  requireCodeRuntime(mode) {
    const runtime = this.ctx.get("codeRuntime");
    if (!runtime) throw new Error(`dsh-tools: mode "${mode}" requires a code runtime \u2014 load a ctx.codeRuntime implementation (e.g. @deepseek-ai/dsh-code-runtime-worker-thread) or set tools mode to "native"`);
    if (!Object.hasOwn(SDK_RENDERERS, runtime.language)) {
      const known = Object.keys(SDK_RENDERERS).map((name) => JSON.stringify(name)).join(", ");
      throw new Error(`dsh-tools: no SDK renderer registered for runtime language ${JSON.stringify(runtime.language)} (known: ${known})`);
    }
    return runtime;
  }
  /**
  * Register globally or in the calling agent scope. Scoped tools shadow
  * globals; duplicates within one layer and the reserved `run_code` name fail.
  * @param definition - tool schema, execution, and optional finalization/presentation callbacks.
  * @returns the exact disposer that unregisters the tool.
  */
  register(definition) {
    const name = definition.name;
    const output = definition.output;
    if (output === void 0 || typeof output !== "object" || typeof output.render !== "function" || output.presentationMeta !== void 0 && typeof output.presentationMeta !== "function") throw new TypeError(`tool "${name}" must declare output { schema, render, presentationMeta? }`);
    assertSupportedJsonSchema(output.schema);
    const timeoutMs = definition.timeoutMs;
    if (timeoutMs !== void 0 && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)) throw new TypeError(`tool "${name}" timeoutMs must be a positive finite number`);
    if (name === "run_code") throw new Error(`tool name "${RUN_CODE_NAME}" is reserved for the Code Mode presentation transport and cannot be registered or shadowed`);
    return this.layers.effect(this.ctx, (layer) => layer.tools.insert(name, definition), { label: "tools.register()" });
  }
  /**
  * Restrict global tools for the calling agent scope. Empty filters, unknown
  * names, scope-local names, and reserved transport names fail. Restrictions
  * intersect; scoped registrations remain visible.
  * @param filter - global-tool mask: `allow` (keep only) and/or `deny` (remove).
  * @returns the exact disposer that lifts this restriction.
  */
  restrict(filter) {
    const scope = scopeOf(this.ctx);
    if (scope === void 0) throw new Error("tools.restrict() requires a scoped context (agent.ctx): a context-global restriction would mask every agent \u2014 deny the tool for the intended agent instead");
    const allow = filter.allow;
    const deny = filter.deny;
    if (allow === void 0 && deny === void 0) throw new Error("tools.restrict({}) is a no-op: pass `allow` and/or `deny` (an empty filter is almost always a materialized-empty-config bug)");
    const compiled = {
      ...allow !== void 0 ? { allow: new Set(allow) } : {},
      ...deny !== void 0 ? { deny: new Set(deny) } : {}
    };
    if ([...allow ?? [], ...deny ?? []].includes("run_code")) throw new Error(`tools.restrict() cannot name reserved Code Mode presentation transport "${RUN_CODE_NAME}"; restrict end-capability tools instead`);
    const known = this.view(scope).restrictableNames;
    const unknown = [...allow ?? [], ...deny ?? []].filter((name) => !known.has(name));
    if (unknown.length > 0) throw new Error(`tools.restrict() names unknown global tool${unknown.length > 1 ? "s" : ""} ${unknown.map((n) => `"${n}"`).join(", ")}; known global tools: ${[...known].sort().join(", ") || "(none)"}`);
    return this.layers.effect(this.ctx, (layer) => layer.restrictions.append(compiled), { label: "tools.restrict()" });
  }
  /**
  * Register a monotonic guard after the extensible `tools/pre-execute`
  * waterfall. A plain-context guard applies globally; one registered through
  * `agent.ctx` applies only to that agent. Any matching guard may deny by
  * returning a reason, while no guard can force-allow a call another guard
  * denied. The exact effect disposer is returned for ordered ownership and
  * HMR cleanup.
  * @param guard - synchronous check; a returned string denies the execution.
  * @returns the exact disposer that unregisters the guard.
  */
  guard(guard) {
    return this.layers.effect(this.ctx, (layer) => layer.guards.append(guard), {
      label: "tools.guard()",
      notify: false
    });
  }
  /** First monotonic denial from the global then the scope chain's guard layers, farthest first. */
  guardReason(exec) {
    const globalReason = this.layers.global.guardReason(exec);
    if (globalReason !== void 0) return globalReason;
    if (exec.agent === void 0) return void 0;
    for (const layer of this.layers.chainLayers(exec.agent)) {
      const reason = layer.guardReason(exec);
      if (reason !== void 0) return reason;
    }
  }
  /**
  * Resolve every registry fact one scope needs in one layer traversal. The
  * visible map applies restrictions to the INHERITED surface, then the
  * scope's own registrations and the reserved presentation transport; the
  * other sets retain the pre-restriction facts needed by restriction and
  * prompt-order validation.
  *
  * A restriction filters what a scope inherits — the global layer and every
  * ancestor layer on its chain — and never what its OWN layer registers.
  * That exemption is what a per-child capability filter has to keep intact:
  * the delegation runtime registers a child's reporting and structured-output
  * tools into the child's own layer, and a filter naming the capabilities the
  * child may use must not strip the machinery it answers through.
  *
  * Reading the exempt set as "the global layer" instead of "not mine" held
  * only while every model-facing tool sat in the host composition. Once
  * presets moved them onto the agent plane they became an ANCESTOR
  * contribution, so a child's filter silently stopped constraining anything
  * it was given.
  * @param scope - the viewing scope (the agent), or undefined for the global view.
  * @returns the complete derived view for that scope.
  */
  view(scope) {
    const layers = this.layers.chainLayers(scope);
    const own = this.layers.peek(scope);
    const inherited = new Map(this.layers.global.tools.entries());
    for (const layer of layers) {
      if (layer === own) continue;
      for (const [name, definition] of layer.tools.entries()) inherited.set(name, definition);
    }
    const visible = /* @__PURE__ */ new Map();
    const knownNames = /* @__PURE__ */ new Set();
    const restrictableNames = /* @__PURE__ */ new Set();
    for (const [name, definition] of inherited) {
      knownNames.add(name);
      restrictableNames.add(name);
      if (layers.every((layer) => layer.admits(name))) visible.set(name, definition);
    }
    if (own !== void 0) for (const [name, definition] of own.tools.entries()) {
      knownNames.add(name);
      visible.set(name, definition);
    }
    if (this.modeFor(scope) !== "native") visible.set(RUN_CODE_NAME, this.requireCodeTransport());
    return {
      visible,
      knownNames,
      restrictableNames
    };
  }
  /**
  * Look up a tool as one scope sees it (scoped
  * shadows global; a restricted-away global reads as absent). Presenters pass
  * the calling agent so the rendered card matches the definition that
  * actually executed.
  * @param name - the tool name as registered.
  * @param scope - the viewing scope (the agent); omitted = the global view.
  * @returns the definition the scope resolves, or undefined when none is visible.
  */
  get(name, scope) {
    return this.view(scope).visible.get(name);
  }
  /**
  * Resolve the definition that MAY EXECUTE for a call, applying the mode
  * collapse at the operation boundary that owns it. The registry view
  * (`get`) is presentation-agnostic; here a MODEL-DIRECT call under `code`
  * may only name the reserved `run_code` transport, while a nested
  * sub-dispatch (a `parent` token set — the `run_code` SDK calling a tool
  * it bound) may call any visible tool. Denial surfaces as `UNKNOWN_TOOL`
  * through the executor, matching an absent definition.
  * @param name - the tool name as registered.
  * @param scope - the viewing scope (the agent); omitted = the global view.
  * @param nested - whether the call is a transport sub-dispatch, not a model-direct call.
  * @returns the definition that may run, or undefined when the call must be rejected.
  */
  resolveExecution(name, scope, nested) {
    const tool = this.get(name, scope);
    if (tool === void 0) return void 0;
    if (this.collapses(name, scope, nested)) return void 0;
    return tool;
  }
  /**
  * Project visible definitions onto the allowlisted model-facing schema fields,
  * excluding execution and presentation callbacks.
  * @param scope - the viewing scope (the agent); omitted = the global view.
  * @returns one deep-cloned schema per visible tool.
  */
  schemas(scope) {
    return [...this.view(scope).visible.values()].map((definition) => this.schemaOf(definition, true));
  }
  /** Project visible callable tools onto the generated Code Mode SDK contract. */
  sdkSchemas(scope) {
    return [...this.view(scope).visible.values()].filter((definition) => definition.name !== RUN_CODE_NAME).map((definition) => {
      const output = snapshotJsonValue(definition.output.schema);
      if (output === void 0) throw new Error(`tool "${definition.name}" output schema must be lossless JSON before SDK projection`);
      return {
        ...this.schemaOf(definition, true),
        output
      };
    });
  }
  /** Project one definition onto the model-facing schema fields. */
  schemaOf(definition, detachParameters) {
    const { name, description, parameters } = definition;
    const detached = detachParameters ? snapshotJsonValue(parameters) : parameters;
    if (detached === void 0) throw new Error(`tool "${name}" parameters must be lossless JSON before schema projection`);
    return {
      name,
      description,
      parameters: detached
    };
  }
  /**
  * Classify a pending call through the caller's visible tool definition. Only
  * an exact `true` is parallel; unknown, hidden, undeclared, invalid, or
  * throwing classifiers are exclusive.
  * @param exec - call name, parsed arguments, and optional agent scope.
  * @returns the fail-closed scheduling mode.
  */
  executionMode(exec) {
    const tool = this.resolveExecution(exec.name, exec.agent, exec.parent !== void 0);
    if (!tool?.isConcurrencySafe) return { kind: "exclusive" };
    try {
      return tool.isConcurrencySafe(exec.arguments) === true ? { kind: "parallel" } : { kind: "exclusive" };
    } catch {
      return { kind: "exclusive" };
    }
  }
  /**
  * Run the `tools/code-dispatch-log` waterfall over one settled sub-dispatch
  * and return the content the bridge should log on `tool/code-dispatch`.
  * Contained: when a listener throws, the method logs the original settled
  * content; that failure must not fail the dispatch or omit the settle event. Private:
  * the ONE consumer is the `run_code` bridge this registry constructs, which
  * receives it as a capability parameter (the `requireRuntime` idiom) — the
  * waterfall, not this invoker, is the public extension point.
  */
  async shapeDispatchLog(dispatch) {
    try {
      return await this.ctx.waterfall(scopeTarget(this, dispatch.agent), "tools/code-dispatch-log", dispatch, () => Promise.resolve(dispatch.content));
    } catch (error) {
      this.ctx.logger.warn(`tools: code-dispatch-log listener failed for ${dispatch.name}: ${errorMessage(error)}; logging the original settled content`);
      return dispatch.content;
    }
  }
  /**
  * Whether the `code` mode collapse denies a model-direct call: only the
  * reserved `run_code` transport may be named. Nested sub-dispatches (a
  * `parent` token set) bypass the collapse. One home for the
  * security-relevant predicate, shared by {@link resolveExecution} and
  * {@link createExecution} so the two can never drift apart.
  *
  * Resolved through {@link modeFor}, NOT `defaultMode`: an agent given `code`
  * by an agent preset under a native deployment is the composition
  * `dsh-agent-tool-presentation` exists for, and reading the deployment default would
  * leave exactly that agent uncollapsed — announcing one surface while
  * executing another, which is the bypass this collapse closes.
  * @param name - the tool name as registered.
  * @param scope - the viewing scope whose effective presentation mode applies.
  * @param nested - whether the call is a transport sub-dispatch, not a model-direct call.
  */
  collapses(name, scope, nested) {
    return !nested && this.modeFor(scope) === "code" && name !== "run_code";
  }
  /**
  * Execute through pre-policy, guards, around-dispatch, post-policy,
  * definition-owned content finalization, and final notification. Tool and
  * listener failures resolve as materialized error results; an invisible tool
  * reports `UNKNOWN_TOOL`. The returned outcome is the same lossless, frozen
  * snapshot final observers receive. Cancellation
  * arriving after entry and before final result materialization skips a
  * not-yet-started body with `ABORTED_BEFORE_DISPATCH` or replaces a
  * successful started outcome with `ABORTED`; already-started work is still
  * drained and may retain a tool-owned structured error.
  * @param exec - the typed same-process call input. The registry assigns its
  *   correlation token before policy begins.
  * @returns the materialized final result.
  */
  async execute(exec) {
    return this.prepareExecution(exec, (prepared) => this.completeScheduledExecution(prepared));
  }
  async completeScheduledExecution(prepared) {
    switch (prepared.kind) {
      case "dispatch": {
        const dispatched = await this.dispatchScheduledExecution(prepared.exec);
        return dispatched.kind === "post-result" ? await this.finalizeScheduledExecution(prepared.exec, dispatched.result) : this.finishScheduledExecution(prepared.exec, dispatched.result);
      }
      case "post-result":
        return await this.finalizeScheduledExecution(prepared.exec, prepared.result);
      case "final-result":
        return this.finishScheduledExecution(prepared.exec, prepared.result);
      /* v8 ignore next -- closed-union exhaustiveness guard */
      default:
        return assertNever(prepared, "scheduled tool preparation");
    }
  }
  createExecution(exec) {
    const deferredContexts = [];
    const token = createExecutionToken();
    const callId = exec.callId;
    const rootCallId = exec.rootCallId ?? callId;
    const name = exec.name;
    const agent = exec.agent;
    const parent = exec.parent;
    const signal = exec.signal;
    const visible = this.get(name, agent);
    const collapsed = visible !== void 0 && this.collapses(name, agent, parent !== void 0);
    const concludingExecutions = this.concludingExecutions;
    const base = {
      token,
      callId,
      rootCallId,
      name,
      signal,
      ...agent !== void 0 ? { agent } : {},
      ...parent !== void 0 ? { parent } : {},
      deferContext(context) {
        deferredContexts.push(context);
      },
      concludeTurn() {
        concludingExecutions.add(this);
      }
    };
    const capturedFinalizer = visible?.finalizeContent?.bind(visible);
    const finalizerFor = () => collapsed && !signal.aborted ? void 0 : capturedFinalizer;
    try {
      const detached = snapshotJsonValue(exec.arguments);
      if (detached === void 0) throw new TypeError("tool execution arguments must be losslessly JSON-serializable");
      const execution = {
        ...base,
        arguments: deepFreeze(detached)
      };
      this.deferredContexts.set(execution, deferredContexts);
      this.contentFinalizers.set(execution, finalizerFor());
      this.cancellationStates.set(execution, {
        callerSignal: signal,
        bodyInvoked: false
      });
      if (collapsed) {
        if (signal.aborted) return {
          kind: "final-result",
          exec: execution,
          result: toolAbortedBeforeDispatchResult()
        };
        return {
          kind: "final-result",
          exec: execution,
          result: toolErrorResult(new ToolNotFoundError(name, `only \`${RUN_CODE_NAME}\` is callable directly \u2014 call \`${name}\` from inside a \`${RUN_CODE_NAME}\` program instead`))
        };
      }
      return {
        kind: "ready",
        exec: execution
      };
    } catch (error) {
      const execution = {
        ...base,
        arguments: void 0
      };
      this.contentFinalizers.set(execution, finalizerFor());
      return {
        kind: "final-result",
        exec: execution,
        result: toolErrorResult(error)
      };
    }
  }
  /**
  * Run the ordered pre-execute and monotonic guard stages for the scheduler.
  * @param input - the caller-supplied execution input.
  * @returns the prepared execution plus the next scheduler stage.
  * @internal
  */
  async prepareScheduledExecution(input) {
    return this.prepareExecution(input, (prepared) => prepared);
  }
  async prepareExecution(input, next) {
    const created = this.createExecution(input);
    if (created.kind !== "ready") return next(created);
    const exec = created.exec;
    if (this.callerCancelled(exec)) return next({
      kind: "final-result",
      exec,
      result: toolAbortedBeforeDispatchResult()
    });
    try {
      const carrier = scopeTarget(this, exec.agent);
      const gate = await this.ctx.waterfall(carrier, "tools/pre-execute", exec, () => Promise.resolve({ kind: "allow" }));
      const askResolution = gate.kind === "ask" ? await this.serviceAsk(exec, gate) : {
        decision: gate,
        approvalCancelled: false
      };
      const { decision } = askResolution;
      if (this.callerCancelled(exec) && askResolution.approvalCancelled) return await next({
        kind: "post-result",
        exec,
        result: toolAbortedBeforeDispatchResult()
      });
      const denialReason = decision.kind === "allow" ? this.guardReason(exec) : decision.reason;
      if (denialReason !== void 0) return await next({
        kind: "post-result",
        exec,
        result: this.materializeFinalResult({
          content: [{
            type: "text",
            text: `Error: ${denialReason}`
          }],
          isError: true,
          error: { message: denialReason }
        })
      });
      if (this.callerCancelled(exec)) return await next({
        kind: "post-result",
        exec,
        result: toolAbortedBeforeDispatchResult()
      });
      return await next({
        kind: "dispatch",
        exec
      });
    } catch (error) {
      return next({
        kind: "final-result",
        exec,
        result: toolErrorResult(error)
      });
    }
  }
  /** Whether the original caller signal is currently aborted. */
  callerCancelled(exec) {
    const state = this.cancellationStates.get(exec);
    if (state === void 0) throw new Error("tool registry scheduler invariant violated: missing cancellation state");
    return state.callerSignal.aborted;
  }
  /** Canonical cancellation outcome selected by whether the tool body started. */
  cancellationResult(exec, prior) {
    const state = this.cancellationStates.get(exec);
    if (state === void 0) throw new Error("tool registry scheduler invariant violated: missing cancellation state");
    return state.bodyInvoked ? toolAbortedResult(prior) : toolAbortedBeforeDispatchResult(prior);
  }
  /**
  * Dispatch the registered body with the original caller signal fused back
  * into any around-wrapper replacement. Cancellation never abandons the body:
  * a started promise reaches quiescence before its outcome becomes `ABORTED`.
  */
  async dispatchToolBody(exec) {
    const state = this.cancellationStates.get(exec);
    if (state === void 0) throw new Error("tool registry scheduler invariant violated: missing cancellation state");
    const wrapperSignal = exec.signal;
    const fused = fuseToolSignals(state.callerSignal, wrapperSignal);
    const signal = fused.signal;
    if (isAborted(signal)) {
      fused.dispose();
      return toolAbortedBeforeDispatchResult();
    }
    exec.signal = signal;
    try {
      const tool = this.resolveExecution(exec.name, exec.agent, exec.parent !== void 0);
      if (!tool) throw new ToolNotFoundError(exec.name);
      state.bodyInvoked = true;
      const returned = await tool.execute(exec.arguments, exec);
      const result = this.createSuccessResult(exec, tool, returned);
      return isAborted(signal) ? toolAbortedResult(result) : result;
    } catch (error) {
      return toolErrorResult(error);
    } finally {
      fused.dispose();
      exec.signal = wrapperSignal;
    }
  }
  /**
  * Run around-dispatch and the tool body. Tool and unknown-tool failures still
  * receive post-execute; pipeline failures are already final.
  * @param exec - the prepared execution.
  * @returns whether the result still needs post-execute.
  * @internal
  */
  async dispatchScheduledExecution(exec) {
    try {
      const mutableExec = exec;
      const carrier = scopeTarget(this, exec.agent);
      const result = await this.ctx.waterfall(carrier, "tools/execute", mutableExec, () => this.dispatchToolBody(mutableExec));
      const normalized = this.normalizeDispatchResult(exec, result);
      const deferredContexts = this.deferredContexts.get(exec);
      if (deferredContexts === void 0) throw new Error("tool registry scheduler invariant violated: unprepared execution");
      const resultWithDeferredContexts = deferredContexts.length === 0 ? normalized : this.markCanonical(exec, {
        ...normalized,
        additionalContexts: [...deferredContexts, ...normalized.additionalContexts ?? []]
      });
      return {
        kind: "post-result",
        result: this.callerCancelled(exec) && !resultWithDeferredContexts.isError ? this.cancellationResult(exec, resultWithDeferredContexts) : resultWithDeferredContexts
      };
    } catch (error) {
      return {
        kind: "final-result",
        result: toolErrorResult(error)
      };
    }
  }
  /**
  * Run ordered post-execute, then apply definition-owned content finalization,
  * materialize, and notify the final outcome.
  * @param exec - the prepared execution.
  * @param result - dispatch/pre result that still needs post-execute.
  * @returns the materialized final result.
  * @internal
  */
  async finalizeScheduledExecution(exec, result) {
    try {
      const postResult = await this.postExecute(exec, result);
      return this.finishScheduledExecution(exec, this.callerCancelled(exec) && !postResult.isError ? this.cancellationResult(exec, postResult) : postResult);
    } catch (error) {
      return this.finishScheduledExecution(exec, toolErrorResult(error));
    }
  }
  /**
  * Materialize the candidate, apply definition-owned content finalization,
  * then materialize and notify the authoritative result.
  * @param exec - the prepared execution.
  * @param result - final result.
  * @returns the materialized final result.
  * @internal
  */
  finishScheduledExecution(exec, result) {
    let materializedResult;
    try {
      materializedResult = this.materializeFinalResult(result);
    } catch (error) {
      materializedResult = this.materializeFinalResult(toolErrorResult(error));
    }
    let finalResult;
    try {
      finalResult = this.materializeFinalResult(this.applyFinalContent(exec, materializedResult));
    } catch (error) {
      finalResult = this.materializeFinalResult(toolErrorResult(error));
    }
    this.notifyResult(exec, finalResult);
    return finalResult;
  }
  /** Apply the snapshotted tool-owned content transform without exposing other result fields. */
  applyFinalContent(exec, result) {
    const finalizeContent = this.contentFinalizers.get(exec);
    if (finalizeContent === void 0) return result;
    const content = finalizeContent(exec, result);
    return content === void 0 ? result : {
      ...result,
      content
    };
  }
  /** Notify observers without exposing a mutation or error channel into the outcome. */
  notifyResult(exec, result) {
    Object.freeze(exec);
    const { name: toolName, callId } = exec;
    const reportFailure = (error) => {
      this.ctx.logger.warn(`tool "${toolName}" (${callId}): tools/result observer failed: ${errorMessage(error)}`);
    };
    const callbacks = this.ctx.events.dispatch("emit", [
      scopeTarget(this, exec.agent),
      "tools/result",
      exec,
      result
    ]);
    for (const callback of callbacks) try {
      const returned = callback(exec, result);
      Promise.resolve(returned).catch(reportFailure);
    } catch (error) {
      reportFailure(error);
    }
  }
  /**
  * Resolve an `ask` decision to allow/deny through the approval seam. The
  * seam is consumed opportunistically with `ctx.get('approval')` — a
  * deployment that composes no ApprovalService keeps the historical degrade
  * to deny, and an unmount mid-session degrades the same way on the next ask.
  * An agent-less execution also degrades: without an agent there is no
  * session to audit to and no UI to route to. Otherwise the outcome maps
  * one-to-one — `allowed-once` proceeds; the three non-grants deny with
  * distinct reasons so the model can tell a human "no" from an absent
  * approval channel.
  */
  async serviceAsk(exec, ask) {
    const approval = this.ctx.get("approval");
    if (approval === void 0) return {
      decision: {
        kind: "deny",
        reason: ask.reason ?? `tool "${exec.name}" requires approval (not yet supported)`
      },
      approvalCancelled: false
    };
    if (exec.agent === void 0) return {
      decision: {
        kind: "deny",
        reason: `tool "${exec.name}" requires approval, but the call has no agent to route it through`
      },
      approvalCancelled: false
    };
    const outcome = await approval.request({
      agent: exec.agent,
      toolName: exec.name,
      callId: exec.callId,
      ...ask.reason !== void 0 ? { reason: ask.reason } : {},
      signal: exec.signal
    });
    switch (outcome) {
      case "allowed-once":
        return {
          decision: { kind: "allow" },
          approvalCancelled: false
        };
      case "rejected":
        return {
          decision: {
            kind: "deny",
            reason: `the user rejected tool "${exec.name}"`
          },
          approvalCancelled: false
        };
      case "cancelled":
        return {
          decision: {
            kind: "deny",
            reason: `approval for tool "${exec.name}" was cancelled`
          },
          approvalCancelled: true
        };
      case "unavailable":
        return {
          decision: {
            kind: "deny",
            reason: `tool "${exec.name}" requires approval, but no approval channel is available`
          },
          approvalCancelled: false
        };
      default:
        return assertNever(outcome, "ApprovalOutcome");
    }
  }
  /**
  * Run the `tools/post-execute` waterfall over a dispatched `result` and apply
  * its {@link PostToolDecision}: `accept` keeps the call successful (replacing
  * `content` when given), `block` turns it into an `isError` whose content is
  * the corrective `feedback`. Either decision may attach `additionalContexts`,
  * which are ferried on the returned result for the loop's active-batch FIFO.
  * Context deferred by the tool body survives an accepted result but is
  * discarded when the outer call is blocked; a block exposes only context the
  * blocking decision explicitly supplied.
  * Runs inside `execute`'s outer try/catch (a throwing listener → isError).
  */
  async postExecute(exec, result) {
    const decision = await this.ctx.waterfall(scopeTarget(this, exec.agent), "tools/post-execute", exec, result, () => Promise.resolve({ kind: "accept" }));
    const decisionContexts = decision.additionalContexts ?? [];
    if (decision.kind === "block") {
      const message = failureMessageFromContent(decision.feedback);
      return this.markCanonical(exec, {
        content: decision.feedback,
        isError: true,
        error: { message },
        ...decisionContexts.length > 0 ? { additionalContexts: decisionContexts } : {}
      });
    }
    if (Object.hasOwn(decision, "content") && Object.hasOwn(decision, "value")) throw new TypeError("tools/post-execute accept decision cannot replace both value and content");
    const additionalContexts = [...result.additionalContexts ?? [], ...decisionContexts];
    if (Object.hasOwn(decision, "value")) {
      if (result.isError) throw new TypeError("tools/post-execute cannot replace the value of a failed result");
      const tool = this.resolveExecution(exec.name, exec.agent, exec.parent !== void 0);
      if (tool === void 0) throw new ToolNotFoundError(exec.name);
      const replaced = this.createSuccessResult(exec, tool, decision.value);
      return this.markCanonical(exec, {
        ...replaced,
        ...additionalContexts.length > 0 ? { additionalContexts } : {}
      });
    }
    return this.markCanonical(exec, {
      ...result,
      ...decision.content !== void 0 ? { content: decision.content } : {},
      ...additionalContexts.length > 0 ? { additionalContexts } : {}
    });
  }
  /** Registry-normalized results and the exact dispatch that validated each value. */
  canonicalResults = /* @__PURE__ */ new WeakMap();
  /** Mark one registry-normalized result as canonical only for its owning dispatch. */
  markCanonical(exec, result) {
    this.canonicalResults.set(result, exec.token);
    return result;
  }
  /** Snapshot, validate, render, and optionally project one successful body value. */
  createSuccessResult(exec, tool, candidate) {
    const detached = snapshotToolValue(tool.name, candidate);
    const violations = validateJsonSchemaValue(tool.output.schema, detached, "value");
    if (violations.length > 0) throw new ToolOutputError(tool.name, violations);
    const value = deepFreeze(detached);
    let rendered;
    try {
      rendered = tool.output.render(exec.arguments, value);
    } catch (error) {
      throw projectionError(tool.name, "render", error);
    }
    const content = snapshotProjection(tool.name, "render", rendered);
    let meta;
    if (exec.parent === void 0 && tool.output.presentationMeta !== void 0) {
      let projected;
      try {
        projected = tool.output.presentationMeta(exec.arguments, value);
      } catch (error) {
        throw projectionError(tool.name, "presentationMeta", error);
      }
      meta = snapshotProjection(tool.name, "presentationMeta", projected);
    }
    const concludesTurn = this.concludingExecutions.has(exec);
    return this.markCanonical(exec, this.materializeFinalResult({
      isError: false,
      value,
      content,
      ...meta !== void 0 ? { meta } : {},
      ...concludesTurn ? { concludesTurn: true } : {}
    }));
  }
  /** Normalize an around-dispatch wrapper's authored result through the owning output contract. */
  normalizeDispatchResult(exec, result) {
    if (this.canonicalResults.get(result) === exec.token) return result;
    if (result.isError) return this.markCanonical(exec, {
      isError: true,
      error: result.error,
      content: result.content,
      ...result.meta !== void 0 ? { meta: result.meta } : {},
      ...result.additionalContexts !== void 0 ? { additionalContexts: result.additionalContexts } : {}
    });
    const tool = this.resolveExecution(exec.name, exec.agent, exec.parent !== void 0);
    if (tool === void 0) throw new ToolNotFoundError(exec.name);
    const normalized = this.createSuccessResult(exec, tool, result.value);
    return this.markCanonical(exec, {
      ...normalized,
      ...result.additionalContexts !== void 0 ? { additionalContexts: result.additionalContexts } : {}
    });
  }
  /** Materialize the authoritative commit outcome once, immediately before `tools/result`. */
  materializeFinalResult(result) {
    const presentation = {
      content: result.content,
      ...result.meta !== void 0 ? { meta: result.meta } : {},
      ...result.additionalContexts !== void 0 ? { additionalContexts: result.additionalContexts } : {}
    };
    if (result.isError) return materializePresentation({
      isError: true,
      error: result.error,
      ...presentation
    });
    return deepFreeze({
      ...materializePresentation({
        isError: false,
        ...presentation,
        ...result.concludesTurn === true ? { concludesTurn: true } : {}
      }),
      value: result.value
    });
  }
};
function createExecutionToken() {
  return /* @__PURE__ */ Symbol("dsh.tool.execution");
}
function toolErrorResult(error) {
  const info = errorInfo(error);
  const message = errorMessage(error);
  return {
    content: [{
      type: "text",
      text: `Error: ${message}`
    }],
    isError: true,
    error: {
      message,
      ...info ? { info } : {}
    }
  };
}
function isAborted(signal) {
  return signal.aborted;
}
function fuseToolSignals(caller, wrapper) {
  if (caller === wrapper) return {
    signal: caller,
    dispose() {
    }
  };
  const controller = new AbortController();
  let listening = false;
  const dispose = () => {
    if (!listening) return;
    listening = false;
    caller.removeEventListener("abort", abortFromCaller);
    wrapper.removeEventListener("abort", abortFromWrapper);
  };
  const abortFrom = (source) => {
    const reason = source.reason;
    controller.abort(reason);
    dispose();
  };
  const abortFromCaller = () => {
    abortFrom(caller);
  };
  const abortFromWrapper = () => {
    abortFrom(wrapper);
  };
  if (wrapper.aborted) abortFromWrapper();
  else if (caller.aborted) abortFromCaller();
  else {
    listening = true;
    caller.addEventListener("abort", abortFromCaller, { once: true });
    wrapper.addEventListener("abort", abortFromWrapper, { once: true });
  }
  return {
    signal: controller.signal,
    dispose
  };
}
function toolAbortedResult(prior) {
  const additionalContexts = prior?.additionalContexts ?? [];
  return {
    content: [{
      type: "text",
      text: "Error: tool call aborted"
    }],
    isError: true,
    error: {
      message: "tool call aborted",
      info: {
        name: "AbortError",
        code: TOOL_ABORTED
      }
    },
    ...additionalContexts.length > 0 ? { additionalContexts } : {}
  };
}
function toolAbortedBeforeDispatchResult(prior) {
  const additionalContexts = prior?.additionalContexts ?? [];
  return {
    content: [{
      type: "text",
      text: "Error: tool call aborted before dispatch"
    }],
    isError: true,
    error: {
      message: "tool call aborted before dispatch",
      info: {
        name: "AbortError",
        code: TOOL_ABORTED_BEFORE_DISPATCH
      }
    },
    ...additionalContexts.length > 0 ? { additionalContexts } : {}
  };
}

// src/index.js
import { existsSync, readFileSync, realpathSync, promises as fsp } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// src/bi-expr.js
var EXPR_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
var EXPR_FUNCS = ["abs", "round", "floor", "ceil", "sqrt", "pow", "exp", "ln", "log", "log10", "min", "max", "coalesce", "if", "year", "month", "quarter", "day", "weekday", "hour", "minute", "datediff", "date_add", "length", "concat", "upper", "lower"];
var EXPR_FUNC_SET = new Set(EXPR_FUNCS);
var exprCache = /* @__PURE__ */ new Map();
function tokenizeExpr(src) {
  const t = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(c) || c === "." && /[0-9]/.test(src[i + 1] || "")) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const n = src.slice(i, j);
      if (!/^(\d+(\.\d*)?|\.\d+)$/.test(n) || !Number.isFinite(Number(n))) throw new Error('\u975E\u6CD5\u6570\u5B57 "' + n + '"');
      t.push({ k: "num", v: Number(n) });
      i = j;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1, s = "";
      while (j < src.length && src[j] !== c) {
        s += src[j];
        j++;
      }
      if (j >= src.length) throw new Error("\u5B57\u7B26\u4E32\u672A\u95ED\u5408");
      t.push({ k: "str", v: s });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      const w = src.slice(i, j), lw = w.toLowerCase();
      if (lw === "and" || lw === "or" || lw === "not") t.push({ k: "kw", v: lw });
      else if (lw === "null") t.push({ k: "lit", v: null });
      else if (lw === "true" || lw === "false") t.push({ k: "lit", v: lw === "true" });
      else if (EXPR_FUNC_SET.has(lw)) t.push({ k: "fn", v: lw });
      else t.push({ k: "id", v: w });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (two === ">=" || two === "<=" || two === "<>" || two === "!=" || two === "==") {
      t.push({ k: "op", v: two === "<>" ? "!=" : two === "==" ? "=" : two });
      i += 2;
      continue;
    }
    if (c === "(" || c === ")" || c === ",") {
      t.push({ k: "p", v: c });
      i++;
      continue;
    }
    if ("+-*/%^<>=?:".indexOf(c) >= 0) {
      t.push({ k: "op", v: c });
      i++;
      continue;
    }
    throw new Error('\u975E\u6CD5\u5B57\u7B26 "' + c + '"\uFF08\u4F4D\u7F6E ' + i + "\uFF09");
  }
  return t;
}
function parseExpr(src) {
  const s = String(src);
  if (!s || s.length > 300) throw new Error("\u8868\u8FBE\u5F0F\u4E3A\u7A7A\u6216\u8FC7\u957F\uFF08\u4E0A\u9650 300 \u5B57\u7B26\uFF09");
  const hit = exprCache.get(s);
  if (hit) return hit;
  const toks = tokenizeExpr(s);
  if (!toks.length) throw new Error("\u8868\u8FBE\u5F0F\u4E3A\u7A7A");
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const eat = (v) => {
    const t = peek();
    if (t && t.v === v && (t.k === "op" || t.k === "p")) {
      p++;
      return true;
    }
    return false;
  };
  const expect = (v) => {
    if (!eat(v)) throw new Error('\u7F3A\u5C11 "' + v + '"\uFF08\u4F4D\u7F6E ' + p + "\uFF09");
  };
  function ternary() {
    const c = orE();
    if (peek() && peek().k === "op" && peek().v === "?") {
      next();
      const a = ternary();
      expect(":");
      const b = ternary();
      return { t: "cond", c, a, b };
    }
    return c;
  }
  function orE() {
    let l = andE();
    while (peek() && peek().k === "kw" && peek().v === "or") {
      next();
      l = { t: "bin", op: "or", l, r: andE() };
    }
    return l;
  }
  function andE() {
    let l = notE();
    while (peek() && peek().k === "kw" && peek().v === "and") {
      next();
      l = { t: "bin", op: "and", l, r: notE() };
    }
    return l;
  }
  function notE() {
    if (peek() && peek().k === "kw" && peek().v === "not") {
      next();
      return { t: "un", op: "not", e: notE() };
    }
    return compare();
  }
  function compare() {
    let l = addE();
    while (peek() && peek().k === "op" && ["=", "!=", ">", ">=", "<", "<="].indexOf(peek().v) >= 0) {
      const op = next().v;
      l = { t: "bin", op, l, r: addE() };
    }
    return l;
  }
  function addE() {
    let l = mulE();
    while (peek() && peek().k === "op" && (peek().v === "+" || peek().v === "-")) {
      const op = next().v;
      l = { t: "bin", op, l, r: mulE() };
    }
    return l;
  }
  function mulE() {
    let l = unary();
    while (peek() && peek().k === "op" && ["*", "/", "%", "^"].indexOf(peek().v) >= 0) {
      const op = next().v;
      l = { t: "bin", op, l, r: unary() };
    }
    return l;
  }
  function unary() {
    if (peek() && peek().k === "op" && peek().v === "-") {
      next();
      return { t: "un", op: "-", e: unary() };
    }
    if (peek() && peek().k === "op" && peek().v === "+") {
      next();
      return unary();
    }
    return primary();
  }
  function primary() {
    const t = next();
    if (!t) throw new Error("\u8868\u8FBE\u5F0F\u610F\u5916\u7ED3\u675F");
    if (t.k === "num" || t.k === "str" || t.k === "lit") return { t: "lit", v: t.v };
    if (t.k === "id") return { t: "col", name: t.v };
    if (t.k === "fn") {
      const args = [];
      expect("(");
      if (!eat(")")) {
        args.push(ternary());
        while (eat(",")) args.push(ternary());
        expect(")");
      }
      return { t: "fn", name: t.v, args };
    }
    if (t.k === "p" && t.v === "(") {
      const e = ternary();
      expect(")");
      return e;
    }
    throw new Error('\u8BED\u6CD5\u9519\u8BEF\u4E8E "' + t.v + '"');
  }
  const ast = ternary();
  if (p < toks.length) throw new Error('\u5C3E\u90E8\u591A\u4F59\u5185\u5BB9 "' + toks[p].v + '"');
  if (exprCache.size > 500) exprCache.clear();
  exprCache.set(s, ast);
  return ast;
}
function exprEmpty(v) {
  return v === null || v === void 0 || v === "";
}
function exprNum(v) {
  return exprEmpty(v) ? NaN : typeof v === "number" ? v : Number(v);
}
function exprTruthy(v) {
  if (exprEmpty(v) || v === false) return false;
  if (typeof v === "number") return v !== 0;
  const n = Number(v);
  return Number.isFinite(n) ? n !== 0 : true;
}
function exprEq(a, b) {
  if (exprEmpty(a) && exprEmpty(b)) return true;
  if (exprEmpty(a) || exprEmpty(b)) return false;
  const na = Number(a), nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na === nb;
  return String(a) === String(b);
}
function exprDateParts(v) {
  if (exprEmpty(v)) return null;
  if (v instanceof Date) return { y: v.getFullYear(), mo: v.getMonth() + 1, d: v.getDate(), h: v.getHours(), mi: v.getMinutes(), s: v.getSeconds() };
  const s = String(v).trim();
  const m = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/.exec(s);
  if (m) return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]), h: m[4] !== void 0 ? Number(m[4]) : null, mi: m[5] !== void 0 ? Number(m[5]) : null, s: m[6] !== void 0 ? Number(m[6]) : m[4] !== void 0 ? 0 : null };
  const ts = Date.parse(s);
  if (Number.isNaN(ts)) return null;
  const dt = new Date(ts);
  return { y: dt.getFullYear(), mo: dt.getMonth() + 1, d: dt.getDate(), h: dt.getHours(), mi: dt.getMinutes(), s: dt.getSeconds() };
}
var DAY_MS = 864e5;
function pad2(n) {
  return (n < 10 ? "0" : "") + n;
}
function fmtLocDate(dt) {
  return dt.getFullYear() + "-" + pad2(dt.getMonth() + 1) + "-" + pad2(dt.getDate());
}
function fmtLocDateTime(dt) {
  return fmtLocDate(dt) + " " + pad2(dt.getHours()) + ":" + pad2(dt.getMinutes()) + ":" + pad2(dt.getSeconds());
}
function shiftMonths(y, mo, n) {
  const t = new Date(Date.UTC(y, mo - 1 + n, 1));
  return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1 };
}
function shiftDate(base, n, unit) {
  const u = String(unit || "d").toLowerCase();
  if (u === "h" || u === "hour") return new Date(base.getTime() + n * 36e5);
  if (u === "min" || u === "minute") return new Date(base.getTime() + n * 6e4);
  if (u === "w" || u === "week") return new Date(base.getTime() + n * 7 * DAY_MS);
  if (u === "m" || u === "month") {
    const r = shiftMonths(base.getFullYear(), base.getMonth() + 1, n);
    const dim = new Date(Date.UTC(r.y, r.mo, 0)).getUTCDate();
    return new Date(r.y, r.mo - 1, Math.min(base.getDate(), dim), base.getHours(), base.getMinutes(), base.getSeconds());
  }
  if (u === "y" || u === "year") {
    const ny = base.getFullYear() + n;
    const dim = new Date(Date.UTC(ny, base.getMonth() + 1, 0)).getUTCDate();
    return new Date(ny, base.getMonth(), Math.min(base.getDate(), dim), base.getHours(), base.getMinutes(), base.getSeconds());
  }
  return new Date(base.getTime() + n * DAY_MS);
}
function evalNode(n, row, keys) {
  switch (n.t) {
    case "lit":
      return n.v;
    case "col": {
      if (Object.prototype.hasOwnProperty.call(row, n.name)) return row[n.name];
      throw new Error('\u8868\u8FBE\u5F0F\u5F15\u7528\u672A\u77E5\u5217 "' + n.name + '"' + (keys && keys.length ? "\uFF08\u53EF\u7528\u5217: " + keys.slice(0, 30).join(", ") + "\uFF09" : ""));
    }
    case "un": {
      if (n.op === "not") return !exprTruthy(evalNode(n.e, row, keys));
      const x = exprNum(evalNode(n.e, row, keys));
      return Number.isFinite(x) ? -x : null;
    }
    case "cond":
      return exprTruthy(evalNode(n.c, row, keys)) ? evalNode(n.a, row, keys) : evalNode(n.b, row, keys);
    case "bin": {
      if (n.op === "and") return exprTruthy(evalNode(n.l, row, keys)) && exprTruthy(evalNode(n.r, row, keys));
      if (n.op === "or") return exprTruthy(evalNode(n.l, row, keys)) || exprTruthy(evalNode(n.r, row, keys));
      const l = evalNode(n.l, row, keys), r = evalNode(n.r, row, keys);
      if (n.op === "=" || n.op === "!=") {
        const eq = exprEq(l, r);
        return n.op === "=" ? eq : !eq;
      }
      if (["+", "-", "*", "/", "%", "^"].indexOf(n.op) >= 0) {
        const a = exprNum(l), b = exprNum(r);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
        if (n.op === "+") return a + b;
        if (n.op === "-") return a - b;
        if (n.op === "*") return a * b;
        if (n.op === "/") return b === 0 ? null : a / b;
        if (n.op === "%") return b === 0 ? null : a % b;
        return Math.pow(a, b);
      }
      if (exprEmpty(l) || exprEmpty(r)) return null;
      const la = exprNum(l), lb = exprNum(r);
      const cmp = Number.isFinite(la) && Number.isFinite(lb) ? la < lb ? -1 : la > lb ? 1 : 0 : String(l) < String(r) ? -1 : String(l) > String(r) ? 1 : 0;
      if (n.op === ">") return cmp > 0;
      if (n.op === ">=") return cmp >= 0;
      if (n.op === "<") return cmp < 0;
      return cmp <= 0;
    }
    case "fn": {
      const vals = n.args.map(function(a) {
        return evalNode(a, row, keys);
      });
      const nm = function(i) {
        const x = exprNum(vals[i]);
        return Number.isFinite(x) ? x : null;
      };
      switch (n.name) {
        case "abs": {
          const x = nm(0);
          return x === null ? null : Math.abs(x);
        }
        case "round": {
          const x = nm(0);
          if (x === null) return null;
          const d = nm(1);
          const f = Math.pow(10, d === null ? 0 : Math.max(0, Math.min(10, Math.round(d))));
          return Math.round(x * f) / f;
        }
        case "floor": {
          const x = nm(0);
          return x === null ? null : Math.floor(x);
        }
        case "ceil": {
          const x = nm(0);
          return x === null ? null : Math.ceil(x);
        }
        case "sqrt": {
          const x = nm(0);
          return x === null || x < 0 ? null : Math.sqrt(x);
        }
        case "pow": {
          const a = nm(0), b = nm(1);
          return a === null || b === null ? null : Math.pow(a, b);
        }
        case "exp": {
          const x = nm(0);
          return x === null ? null : Math.exp(x);
        }
        case "ln":
        case "log": {
          const x = nm(0);
          return x === null || x <= 0 ? null : Math.log(x);
        }
        case "log10": {
          const x = nm(0);
          return x === null || x <= 0 ? null : Math.log10(x);
        }
        case "min":
        case "max": {
          let best = null;
          vals.forEach(function(v) {
            const x = exprNum(v);
            if (!Number.isFinite(x)) return;
            if (best === null || (n.name === "min" ? x < best : x > best)) best = x;
          });
          return best;
        }
        case "coalesce":
          for (const v of vals) if (!exprEmpty(v)) return v;
          return null;
        case "if":
          return exprTruthy(vals[0]) ? vals[1] === void 0 ? null : vals[1] : vals[2] === void 0 ? null : vals[2];
        case "year":
        case "month":
        case "quarter":
        case "day":
        case "weekday": {
          const dp = exprDateParts(vals[0]);
          if (!dp) return null;
          if (n.name === "year") return dp.y;
          if (n.name === "month") return dp.mo;
          if (n.name === "quarter") return Math.floor((dp.mo - 1) / 3) + 1;
          if (n.name === "day") return dp.d;
          return new Date(Date.UTC(dp.y, dp.mo - 1, dp.d)).getUTCDay();
        }
        case "hour": {
          const dp = exprDateParts(vals[0]);
          return dp && dp.h !== null ? dp.h : null;
        }
        case "minute": {
          const dp = exprDateParts(vals[0]);
          return dp && dp.mi !== null ? dp.mi : null;
        }
        case "datediff": {
          const a = exprDateParts(vals[0]), b = exprDateParts(vals[1]);
          if (!a || !b) return null;
          return Math.round((Date.UTC(a.y, a.mo - 1, a.d) - Date.UTC(b.y, b.mo - 1, b.d)) / DAY_MS);
        }
        case "date_add": {
          const dp = exprDateParts(vals[0]);
          if (!dp) return null;
          const n2 = nm(1);
          if (n2 === null || !Number.isInteger(n2)) return null;
          const u = String(vals[2] === void 0 || vals[2] === null ? "day" : vals[2]).trim().toLowerCase();
          const subDay = u === "h" || u === "hour" || u === "min" || u === "minute";
          if (subDay) {
            const baseMin = (dp.h === null ? 0 : dp.h) * 60 + (dp.mi === null ? 0 : dp.mi) + (u === "h" || u === "hour" ? n2 * 60 : n2);
            const rt = new Date(Date.UTC(dp.y, dp.mo - 1, dp.d) + baseMin * 6e4);
            return rt.getUTCFullYear() + "-" + pad2(rt.getUTCMonth() + 1) + "-" + pad2(rt.getUTCDate()) + " " + pad2(rt.getUTCHours()) + ":" + pad2(rt.getUTCMinutes()) + ":" + pad2(rt.getUTCSeconds());
          }
          const dayShift = u === "d" || u === "day" ? n2 : u === "w" || u === "week" ? n2 * 7 : null;
          let y2, mo2, d2;
          if (dayShift !== null) {
            const rt = new Date(Date.UTC(dp.y, dp.mo - 1, dp.d) + dayShift * DAY_MS);
            y2 = rt.getUTCFullYear();
            mo2 = rt.getUTCMonth() + 1;
            d2 = rt.getUTCDate();
          } else if (u === "m" || u === "month") {
            const r = shiftMonths(dp.y, dp.mo, n2);
            y2 = r.y;
            mo2 = r.mo;
            d2 = Math.min(dp.d, new Date(Date.UTC(r.y, r.mo, 0)).getUTCDate());
          } else if (u === "y" || u === "year") {
            y2 = dp.y + n2;
            mo2 = dp.mo;
            d2 = Math.min(dp.d, new Date(Date.UTC(y2, mo2, 0)).getUTCDate());
          } else throw new Error('date_add \u672A\u77E5\u65F6\u95F4\u5355\u4F4D "' + vals[2] + '"\uFF08\u5141\u8BB8: day/week/month/year/hour/minute\uFF09');
          const datePart = y2 + "-" + pad2(mo2) + "-" + pad2(d2);
          return dp.h !== null ? datePart + " " + pad2(dp.h) + ":" + pad2(dp.mi) + ":" + pad2(dp.s) : datePart;
        }
        case "length":
          return exprEmpty(vals[0]) ? 0 : String(vals[0]).length;
        case "concat":
          return vals.map(function(v) {
            return exprEmpty(v) ? "" : String(v);
          }).join("");
        case "upper":
          return exprEmpty(vals[0]) ? null : String(vals[0]).toUpperCase();
        case "lower":
          return exprEmpty(vals[0]) ? null : String(vals[0]).toLowerCase();
      }
      throw new Error('\u672A\u77E5\u8868\u8FBE\u5F0F\u51FD\u6570 "' + n.name + '"\uFF08\u53EF\u7528: ' + EXPR_FUNCS.join("/") + "\uFF09");
    }
  }
  throw new Error("\u672A\u77E5\u8868\u8FBE\u5F0F\u8282\u70B9\u7C7B\u578B");
}
function exprCols(n, out) {
  out = out || /* @__PURE__ */ new Set();
  if (!n || typeof n !== "object") return out;
  if (n.t === "col") out.add(n.name);
  else if (n.t === "bin") {
    exprCols(n.l, out);
    exprCols(n.r, out);
  } else if (n.t === "un") exprCols(n.e, out);
  else if (n.t === "cond") {
    exprCols(n.c, out);
    exprCols(n.a, out);
    exprCols(n.b, out);
  } else if (n.t === "fn") n.args.forEach(function(a) {
    exprCols(a, out);
  });
  return out;
}
function colAccessor(ref) {
  if (typeof ref === "string" && EXPR_IDENT.test(ref)) {
    return { plain: true, label: ref, cols: [ref], get: function(row) {
      const v = row[ref];
      return v === null || v === void 0 ? "" : v;
    } };
  }
  let expr = null, alias = null;
  if (typeof ref === "string") expr = ref;
  else if (ref && typeof ref === "object" && typeof ref.expr === "string") {
    expr = ref.expr;
    alias = typeof ref.as === "string" && ref.as ? ref.as : null;
  } else throw new Error("group_by \u9879\u5FC5\u987B\u662F\u5217\u540D\u5B57\u7B26\u4E32\u6216 {expr, as} \u8868\u8FBE\u5F0F\u5BF9\u8C61");
  const ast = parseExpr(expr);
  return { plain: false, label: alias || expr, cols: Array.from(exprCols(ast)), get: function(row, keys) {
    const v = evalNode(ast, row, keys);
    return v === void 0 ? null : v;
  } };
}
function metricAccessor(m) {
  const col = m && m.column;
  if (typeof col === "string" && EXPR_IDENT.test(col)) {
    return { plain: true, column: col, alias: m.alias, num: function(row) {
      return row[col];
    } };
  }
  const ast = parseExpr(String(col));
  return { plain: false, column: col, alias: m.alias, num: function(row, keys) {
    return evalNode(ast, row, keys);
  } };
}
function evalKeysIfExpr(chart, rows) {
  if (!rows.length) return null;
  const hasExpr = (chart.group_by || []).some(function(g) {
    return !(typeof g === "string" && EXPR_IDENT.test(g));
  }) || (chart.metrics || []).some(function(m) {
    return !(m && typeof m.column === "string" && EXPR_IDENT.test(m.column));
  });
  return hasExpr ? Object.keys(rows[0]) : null;
}
function mergeJoinRows(factRows, dimRows, leftKey, rightKey, joinType) {
  const map = /* @__PURE__ */ new Map();
  for (const d of dimRows) {
    const k = d[rightKey];
    if (k === null || k === void 0) continue;
    const kk = String(k);
    if (!map.has(kk)) map.set(kk, d);
  }
  const inner = joinType === "inner";
  const out = [];
  for (const f of factRows) {
    const k = f[leftKey];
    const d = k === null || k === void 0 ? null : map.get(String(k)) || null;
    if (!d) {
      if (!inner) out.push(f);
      continue;
    }
    for (const key in d) if (!Object.prototype.hasOwnProperty.call(f, key)) f[key] = d[key];
    out.push(f);
  }
  return out;
}
function normalizeJoins(join) {
  if (!join) return [];
  const arr = Array.isArray(join) ? join : [join];
  return arr.map(function(j) {
    return { table: String(j.table), left_key: String(j.left_key), right_key: String(j.right_key), type: j && j.type === "inner" ? "inner" : "left" };
  });
}
var nowProvider = function() {
  return /* @__PURE__ */ new Date();
};
function setNowProvider(fn) {
  nowProvider = typeof fn === "function" ? fn : function() {
    return /* @__PURE__ */ new Date();
  };
}
function currentNow() {
  return nowProvider();
}
var REL_TOKEN = /^(?:(now|today)((?:[+-]\d+(?:d|w|m|y|h|min)?)?)|([+-]\d+)(d|w|m|y|h|min)?)$/;
function resolveRelToken(token, now) {
  const m = REL_TOKEN.exec(String(token).trim().toLowerCase());
  if (!m) return void 0;
  const base = m[1] ? m[1] : "now";
  let n = 0, unit = "d";
  const off = m[1] ? m[2] : (m[3] || "") + (m[4] || "");
  if (off) {
    const om = /^([+-]\d+)(d|w|m|y|h|min)?$/.exec(off);
    if (!om) return void 0;
    n = parseInt(om[1], 10);
    unit = om[2] || "d";
  }
  const start = base === "today" ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : new Date(now.getTime());
  const out = shiftDate(start, n, unit);
  const hasTime = base === "now" || unit === "h" || unit === "min";
  return hasTime ? fmtLocDateTime(out) : fmtLocDate(out);
}
function resolveFilterValue(v, now) {
  if (typeof v === "string") {
    const r = resolveRelToken(v, now);
    return r === void 0 ? v : r;
  }
  if (Array.isArray(v)) return v.map(function(x) {
    return resolveFilterValue(x, now);
  });
  if (v && typeof v === "object" && typeof v.relative === "string") {
    const r = resolveRelToken(v.relative, now);
    return r === void 0 ? v : r;
  }
  return v;
}
function resolveFilters(filters, now) {
  return (filters || []).map(function(f) {
    if (!f || typeof f !== "object" || Array.isArray(f)) return f;
    const nv = resolveFilterValue(f.value, now);
    return nv === f.value ? f : Object.assign({}, f, { value: nv });
  });
}
function likeRegExp(pat, ci) {
  const body = String(pat).split("").map(function(ch) {
    if (ch === "%") return ".*";
    if (ch === "_") return ".";
    return /[.*+?^${}()|[\]\\]/.test(ch) ? "\\" + ch : ch;
  }).join("");
  return new RegExp("^" + body + "$", ci ? "i" : "");
}
function jsFilterMatch(row, f) {
  const v = row[f.column], op = f.op, fv = f.value;
  if (op === "IS_NULL") return exprEmpty(v);
  if (op === "IS_NOT_NULL") return !exprEmpty(v);
  if (op === "=") return exprEq(v, fv);
  if (op === "!=") return !exprEq(v, fv);
  if (op === "IN") return Array.isArray(fv) && fv.some(function(x) {
    return exprEq(v, x);
  });
  if (op === "NOT_IN") return Array.isArray(fv) && !fv.some(function(x) {
    return exprEq(v, x);
  });
  if (op === "LIKE" || op === "ILIKE") {
    if (exprEmpty(v) || exprEmpty(fv)) return false;
    return likeRegExp(fv, op === "ILIKE").test(String(v));
  }
  if (op === "BETWEEN") {
    const arr = Array.isArray(fv) ? fv : [];
    if (arr.length < 2 || exprEmpty(v)) return false;
    const cmp = function(x, y) {
      const nx = exprNum(x), ny = exprNum(y);
      if (Number.isFinite(nx) && Number.isFinite(ny)) return nx < ny ? -1 : nx > ny ? 1 : 0;
      return String(x) < String(y) ? -1 : String(x) > String(y) ? 1 : 0;
    };
    return cmp(v, arr[0]) >= 0 && cmp(v, arr[1]) <= 0;
  }
  if ([">", ">=", "<", "<="].indexOf(op) >= 0) {
    if (exprEmpty(v) || exprEmpty(fv)) return false;
    const nv = exprNum(v), nf = exprNum(fv);
    const c = Number.isFinite(nv) && Number.isFinite(nf) ? nv < nf ? -1 : nv > nf ? 1 : 0 : String(v) < String(fv) ? -1 : String(v) > String(fv) ? 1 : 0;
    if (op === ">") return c > 0;
    if (op === ">=") return c >= 0;
    if (op === "<") return c < 0;
    return c <= 0;
  }
  return true;
}
function applyJsFilters(rows, filters) {
  return rows.filter(function(r) {
    return filters.every(function(f) {
      return jsFilterMatch(r, f);
    });
  });
}

// src/index.js
var PKG_DIR = fileURLToPath(new URL("../", import.meta.url)).replace(/[\\/]+$/, "");
var PERSIST_DIR = String(process.env.BI_DASHBOARDS_HOME || process.env.HOME + "/.dsh/bi-dashboards").replace(/\/+$/, "");
var ECHARTS_ROUTE = "/bi/vendor/echarts.min.js";
var CFG = { dataApi: "http://127.0.0.1:8600", statusUrl: "http://127.0.0.1:8080", vendorFile: PERSIST_DIR + "/vendor/echarts.min.js", storeFile: PERSIST_DIR + "/data/bi-dashboards.json", crawlConfigFile: "" };
var cfgReady = Promise.resolve();
var NAME_MAP_ZH = { tables: { ai_settings: { zh: "\u6570\u636E\u670D\u52A1\u8BBE\u7F6E", desc: "AI \u914D\u7F6E\u952E\u503C\uFF08\u8868\u8BBF\u95EE\u767D\u540D\u5355\u7B49\uFF09" }, alert_subscriber: { zh: "\u9884\u8B66\u8BA2\u9605", desc: "\u90AE\u4EF6\u9884\u8B66\u8BA2\u9605\u4EBA\u4E0E\u5BA1\u6838\u72B6\u6001" }, category_dim: { zh: "\u54C1\u7C7B\u7EF4\u5EA6", desc: "\u54C1\u7C7B\u7F16\u7801\u5230\u5927\u7C7B/\u4E2D\u7C7B\u7684\u6620\u5C04" }, date_dim: { zh: "\u65E5\u671F\u7EF4\u5EA6", desc: "2022~2026 \u8FDE\u7EED\u65E5\u5386\uFF0C\u542B\u5468\u672B/\u8282\u5047\u65E5\u6807\u8BB0" }, forecast_results: { zh: "\u9500\u91CF\u9884\u6D4B", desc: "\u6309\u5546\u54C1\xD7\u95E8\u5E97\xD7\u65E5\u671F\u7684\u6A21\u578B\u9884\u6D4B\u9500\u91CF\u53CA\u533A\u95F4" }, forecast_monthly: { zh: "\u6708\u5EA6\u9500\u91CF\u9884\u6D4B", desc: "\u6BCF\u4E2A\u5546\u54C1\u672C\u6708\u4EFD\u7684\u9884\u6D4B\u603B\u91CF(\u4ECA\u5929~\u6708\u5E95\u9010\u65E5\u6C42\u548C),\u6BCF\u6708 1 \u53F7\u66F4\u65B0" }, forecast_accuracy: { zh: "\u9884\u6D4B\u51C6\u786E\u7387", desc: "\u5468\u5EA6\u9884\u6D4B vs \u5B9E\u9645\u9500\u91CF\u7684\u51C6\u786E\u7387\u5B58\u6863(\u6BCF\u5546\u54C1\u6BCF\u5468\u8BC4\u4F30,1-\u52A0\u6743MAPE\xD7100)" }, forecast_history: { zh: "\u9884\u6D4B\u5386\u53F2", desc: "\u6BCF\u671F\u5468\u5EA6\u9884\u6D4B\u5FEB\u7167\u5B58\u6863(\u5546\u54C1\xD7\u65E5\u671F\xD7\u751F\u6210\u6279\u6B21),\u5728\u7EBF\u8868\u6BCF\u5468\u66FF\u6362,\u5386\u53F2\u5728\u8FD9\u91CC\u7559\u5E95" }, inventory_total: { zh: "\u5E93\u5B58\u603B\u89C8", desc: "\u4ED3\u5E93\u5E93\u5B58\u3001\u8D27\u67B6\u73B0\u5E93\u5B58\u4E0E\u5B89\u5168\u5E93\u5B58\u7EBF" }, n8n_operation_log: { zh: "\u8FD0\u7EF4\u65E5\u5FD7", desc: "n8n \u81EA\u52A8\u5316\u64CD\u4F5C\u6D41\u6C34\u4E0E SQL \u5FEB\u7167" }, order_detail_raw: { zh: "\u9500\u552E\u660E\u7EC6", desc: "\u6BCF\u884C\u4E00\u6761\u8BA2\u5355\u5546\u54C1\uFF0C\u552F\u4E00\u5927\u89C4\u6A21\u5386\u53F2\u6570\u636E\u6E90" }, procurement_management: { zh: "\u91C7\u8D2D\u7BA1\u7406", desc: "\u91C7\u8D2D\u6279\u6B21\u3001\u6570\u91CF\u3001\u5355\u4EF7\u4E0E\u4FDD\u8D28\u671F" }, procurement_management_bak_20260909: { zh: "\u91C7\u8D2D\u7BA1\u7406\u5907\u4EFD", desc: "\u91C7\u8D2D\u7BA1\u7406 2026-09-09 \u5907\u4EFD" }, product_main: { zh: "\u5546\u54C1\u4E3B\u6863", desc: "\u5546\u54C1\u6761\u7801\u3001\u4EF7\u683C\u3001\u72B6\u6001\u4E0E\u9648\u5217\u6807\u51C6" }, replenish_log: { zh: "\u8865\u8D27\u65E5\u5FD7", desc: "\u8865\u8D27\u8BA1\u5212\u4E0E\u5B9E\u9645\u6267\u884C\u8BB0\u5F55" }, replenish_subscribe: { zh: "\u8865\u8D27\u8BA2\u9605", desc: "\u8865\u8D27\u63D0\u9192\u90AE\u4EF6\u8BA2\u9605" }, shelf_product_rel: { zh: "\u8D27\u67B6-\u5546\u54C1\u5173\u8054", desc: "\u8D27\u67B6\u7F16\u53F7\u4E0E\u5546\u54C1\u6761\u7801\u7684\u6446\u653E\u5173\u7CFB" }, store_info: { zh: "\u95E8\u5E97\u4FE1\u606F", desc: "\u95E8\u5E97\u57FA\u7840\u6863\u6848" }, store_stat_raw: { zh: "\u95E8\u5E97\u7EDF\u8BA1", desc: "\u95E8\u5E97\u7EDF\u8BA1\u539F\u59CB\u6570\u636E" }, sync_meta: { zh: "\u540C\u6B65\u5143\u6570\u636E", desc: "\u5404\u540C\u6B65\u7BA1\u9053\u7684\u6700\u65B0\u540C\u6B65\u65F6\u95F4" } }, fields: { item_id: "\u660E\u7EC6\u884C\u7F16\u53F7", order_no: "\u8BA2\u5355\u53F7", user_id: "\u7528\u6237\u7F16\u53F7", store_id: "\u95E8\u5E97\u7F16\u53F7", original_amount: "\u539F\u59CB\u91D1\u989D", discount_total: "\u4F18\u60E0\u603B\u989D", pay_amount: "\u5B9E\u4ED8\u91D1\u989D", order_create_time: "\u4E0B\u5355\u65F6\u95F4", order_status: "\u8BA2\u5355\u72B6\u6001", product_qty: "\u5546\u54C1\u6570\u91CF", product_price: "\u5546\u54C1\u5355\u4EF7", order_date: "\u4E0B\u5355\u65E5\u671F", product_id: "\u5546\u54C1\u7F16\u53F7", product_name: "\u5546\u54C1\u540D\u79F0", cost_price: "\u6210\u672C\u4EF7", standard_price: "\u6807\u51C6\u552E\u4EF7", shelf_life_days: "\u4FDD\u8D28\u671F(\u5929)", unit: "\u5355\u4F4D", product_status: "\u5546\u54C1\u72B6\u6001", cate_code: "\u54C1\u7C7B\u7F16\u7801", cate_name: "\u54C1\u7C7B\u540D\u79F0", big_category: "\u5927\u7C7B", mid_category: "\u4E2D\u7C7B", sort_no: "\u6392\u5E8F\u53F7", standard_put_qty: "\u6807\u51C6\u9648\u5217\u6570\u91CF", inv_id: "\u5E93\u5B58\u8BB0\u5F55\u7F16\u53F7", warehouse_stock: "\u4ED3\u5E93\u5E93\u5B58", shelf_current_stock: "\u8D27\u67B6\u73B0\u5E93\u5B58", safety_stock: "\u5B89\u5168\u5E93\u5B58", stock_update_time: "\u5E93\u5B58\u66F4\u65B0\u65F6\u95F4", date: "\u65E5\u671F", year: "\u5E74", quarter: "\u5B63\u5EA6", month: "\u6708\u4EFD", week: "\u5468\u5E8F\u53F7", day: "\u65E5", year_month: "\u5E74\u6708", is_weekend: "\u662F\u5426\u5468\u672B", is_holiday: "\u662F\u5426\u8282\u5047\u65E5", id: "\u7F16\u53F7", train_date: "\u751F\u6210\u6279\u6B21", eval_date: "\u8BC4\u4F30\u65E5\u671F", period_start: "\u8BC4\u4F30\u7A97\u53E3\u8D77", period_end: "\u8BC4\u4F30\u7A97\u53E3\u6B62", evaluated_days: "\u8BC4\u4F30\u5929\u6570", actual_qty: "\u5B9E\u9645\u9500\u91CF", abs_error: "\u7EDD\u5BF9\u8BEF\u5DEE", accuracy_pct: "\u51C6\u786E\u7387(%)", forecast_date: "\u9884\u6D4B\u65E5\u671F", predicted_qty: "\u9884\u6D4B\u9500\u91CF", predicted_lower: "\u9884\u6D4B\u4E0B\u754C", predicted_upper: "\u9884\u6D4B\u4E0A\u754C", model_generation_date: "\u6A21\u578B\u751F\u6210\u65F6\u95F4", model_name: "\u6A21\u578B\u540D\u79F0", sub_id: "\u8BA2\u9605\u7F16\u53F7", email: "\u90AE\u7BB1", name: "\u59D3\u540D", department: "\u90E8\u95E8", status: "\u72B6\u6001", token: "\u8BBF\u95EE\u4EE4\u724C", created_at: "\u521B\u5EFA\u65F6\u95F4", approved_at: "\u5BA1\u6838\u901A\u8FC7\u65F6\u95F4", approved_by: "\u5BA1\u6838\u4EBA", cancelled_at: "\u53D6\u6D88\u65F6\u95F4", timestamp: "\u64CD\u4F5C\u65F6\u95F4", operator: "\u64CD\u4F5C\u4EBA", operation: "\u64CD\u4F5C\u7C7B\u578B", target_id: "\u64CD\u4F5C\u5BF9\u8C61\u7F16\u53F7", detail: "\u8BE6\u60C5", sql_snapshot: "SQL\u5FEB\u7167", procurement_id: "\u91C7\u8D2D\u6279\u6B21\u7F16\u53F7", pack_spec: "\u5305\u88C5\u89C4\u683C", quantity: "\u6570\u91CF", unit_price: "\u5355\u4EF7", total_amount: "\u603B\u91D1\u989D", procurement_date: "\u91C7\u8D2D\u65E5\u671F", produce_date: "\u751F\u4EA7\u65E5\u671F", expire_date: "\u5230\u671F\u65E5\u671F", is_processed: "\u662F\u5426\u5DF2\u5904\u7406", replenish_id: "\u8865\u8D27\u8BB0\u5F55\u7F16\u53F7", shelf_id: "\u8D27\u67B6\u7F16\u53F7", plan_repl_qty: "\u8BA1\u5212\u8865\u8D27\u91CF", actual_repl_qty: "\u5B9E\u9645\u8865\u8D27\u91CF", repl_type: "\u8865\u8D27\u7C7B\u578B", repl_status: "\u8865\u8D27\u72B6\u6001", operator_name: "\u64CD\u4F5C\u4EBA\u59D3\u540D", finish_time: "\u5B8C\u6210\u65F6\u95F4", create_time: "\u521B\u5EFA\u65F6\u95F4", create_date: "\u521B\u5EFA\u65E5\u671F", contact_email: "\u8054\u7CFB\u90AE\u7BB1", subscribe_type: "\u8BA2\u9605\u7C7B\u578B", rel_id: "\u5173\u8054\u8BB0\u5F55\u7F16\u53F7", shelf_code: "\u8D27\u67B6\u7F16\u53F7", product_code: "\u5546\u54C1\u6761\u7801", sync_key: "\u540C\u6B65\u9879", sync_value: "\u540C\u6B65\u503C", updated_at: "\u66F4\u65B0\u65F6\u95F4", key: "\u914D\u7F6E\u952E", value: "\u914D\u7F6E\u503C", warehouse: "\u4ED3\u5E93", category: "\u54C1\u7C7B" } };
function toIpv4Localhost(url) {
  return String(url).replace(/^(https?):\/\/localhost(?=[:/?#]|$)/i, "$1://127.0.0.1");
}
async function callApi(ctx, method, path, body, timeoutMs) {
  await cfgReady;
  const url = toIpv4Localhost(path.indexOf("http") === 0 ? path : CFG.dataApi + path);
  const init = { method, signal: AbortSignal.timeout(timeoutMs || 9e4) };
  if (body !== void 0) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw new Error("\u6570\u636E\u670D\u52A1\u8BF7\u6C42\u5931\u8D25: " + String(e && e.message || e).slice(0, 200));
  }
  const text = await res.text();
  if (!res.ok) {
    let parsed = text.slice(0, 500);
    try {
      parsed = JSON.parse(text);
    } catch (e) {
    }
    const err = new Error("\u6570\u636E\u670D\u52A1 HTTP " + res.status + ": " + String(text).slice(0, 200));
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return text;
}
async function forwardStatusPost(path) {
  await cfgReady;
  const url = toIpv4Localhost(String(CFG.statusUrl || "").replace(/\/+$/, "")) + path;
  try {
    const r = await fetch(url, { method: "POST", signal: AbortSignal.timeout(8e3) });
    const text = await r.text();
    try {
      return JSON.parse(text || "{}");
    } catch (e) {
      return r.ok ? { ok: true } : { error: "HTTP " + r.status + ": " + text.slice(0, 200) };
    }
  } catch (e) {
    return { error: "\u72B6\u6001\u670D\u52A1\u8BF7\u6C42\u5931\u8D25: " + String(e && e.message || e).slice(0, 200) };
  }
}
async function getJson(ctx, method, path, body, timeoutMs) {
  const text = await callApi(ctx, method, path, body, timeoutMs);
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("\u6570\u636E\u670D\u52A1\u8FD4\u56DE\u975E JSON: " + String(text).slice(0, 200));
  }
}
var REPO_URL = "https://gitee.com/LYJ132/dsh-bi-dashboards.git";
var FALLBACK_REPO_URL = "github:LYJ132/dsh-bi-dashboards";
var PKG_JSON_RAW_URL = REPO_URL.replace(/\.git$/, "") + "/raw/master/package.json";
var UPD_HINT = "dsh plugin --profile web add " + REPO_URL + " \u66F4\u65B0";
var UPD_NATIVE_HINT = "\u70B9\u66F4\u65B0\u5C06\u4ECE Gitee \u62C9\u53D6\u6700\u65B0\u7248\uFF0C\u5931\u8D25\u81EA\u52A8\u6539\u7528 GitHub \u5907\u9009";
var PKG_VERSION = "1.1.0";
try {
  PKG_VERSION = String(JSON.parse(readFileSync(PKG_DIR + "/package.json", "utf8")).version || PKG_VERSION);
} catch (e) {
}
async function runCmd(ctx, argv, cwd, timeoutMs) {
  const sub = ctx.get("subprocess");
  if (!sub) throw new Error("subprocess \u670D\u52A1\u4E0D\u53EF\u7528");
  const handle = sub.spawn({ argv, cwd, stdio: { stdin: "ignore", stdout: { maxBytes: 4 * 1024 * 1024 }, stderr: { maxBytes: 1024 * 1024 } }, graceMs: 15e3 });
  const outcome = await handle.done;
  return { code: outcome && typeof outcome === "object" ? outcome.exitCode : outcome, out: (handle.collected.stdout.readFrom(0).text || "").trim(), err: (handle.collected.stderr.readFrom(0).text || "").trim() };
}
function updateRepoDir() {
  let real = PKG_DIR;
  try {
    real = realpathSync(PKG_DIR);
  } catch (e) {
  }
  if (!existsSync(real + "/.git")) return null;
  return real;
}
function livePkgVersion(repo) {
  try {
    return String(JSON.parse(readFileSync(repo + "/package.json", "utf8")).version || PKG_VERSION);
  } catch (e) {
    return PKG_VERSION;
  }
}
async function updateCheckState(ctx) {
  const repo = updateRepoDir();
  if (!repo) {
    const version2 = livePkgVersion(PKG_DIR);
    let latestVersion2 = null;
    try {
      const r = await fetch(PKG_JSON_RAW_URL, { signal: AbortSignal.timeout(4e4) });
      if (r.ok) {
        const j = await r.json();
        const m = String(j && j.version || "").match(/\d+\.\d+\.\d+[0-9A-Za-z.\-]*/);
        if (m) latestVersion2 = m[0];
      }
    } catch (e) {
    }
    if (latestVersion2 === null) {
      try {
        const nv = await runCmd(ctx, ["timeout", "-k", "5", "40", "npm", "view", FALLBACK_REPO_URL, "version"], "/tmp", 45e3);
        if (nv.code === 0) {
          const m = String(nv.out).match(/\d+\.\d+\.\d+[0-9A-Za-z.\-]*/);
          if (m) latestVersion2 = m[0];
        }
      } catch (e) {
      }
    }
    return { repo: false, version: version2, latestVersion: latestVersion2, canUpdate: true, method: "native-add", hint: UPD_NATIVE_HINT };
  }
  const fr = await runCmd(ctx, ["git", "fetch", "origin"], repo, 6e4);
  if (fr.code !== 0) return { repo: true, error: "git fetch \u5931\u8D25: " + (fr.err || fr.out || "exit " + fr.code).slice(0, 200) };
  const head = await runCmd(ctx, ["git", "rev-parse", "HEAD"], repo, 15e3);
  const orig = await runCmd(ctx, ["git", "rev-parse", "origin/master"], repo, 15e3);
  if (head.code !== 0 || orig.code !== 0) return { repo: true, error: "\u65E0\u6CD5\u8BFB\u53D6 git \u7248\u672C: " + (orig.err || head.err || "rev-parse \u5931\u8D25").slice(0, 200) };
  const cnt = await runCmd(ctx, ["git", "rev-list", "--count", "HEAD..origin/master"], repo, 15e3);
  const st = await runCmd(ctx, ["git", "status", "--porcelain"], repo, 15e3);
  const dt = await runCmd(ctx, ["git", "show", "-s", "--format=%cI", "HEAD"], repo, 15e3);
  let latestVersion = null;
  const rv = await runCmd(ctx, ["git", "show", "origin/master:package.json"], repo, 15e3);
  if (rv.code === 0) {
    try {
      latestVersion = String(JSON.parse(rv.out).version || "") || null;
    } catch (e) {
    }
  }
  return { repo: true, version: livePkgVersion(repo), latestVersion, current: head.out.slice(0, 7) + (dt.out ? " \xB7 " + dt.out.slice(0, 10) : ""), behind: parseInt(cnt.out, 10) || 0, clean: st.code === 0 && st.out === "" };
}
async function performUpdate(ctx) {
  try {
    const repo = updateRepoDir();
    if (!repo) {
      let nat;
      try {
        nat = await runCmd(ctx, ["dsh", "plugin", "--profile", "web", "add", REPO_URL], "/tmp", 3e5);
      } catch (e) {
        const em = String(e && e.message || e);
        return { ok: false, error: /ENOENT/.test(em) ? "\u672A\u627E\u5230 dsh \u547D\u4EE4\uFF0C\u65E0\u6CD5\u81EA\u52A8\u66F4\u65B0\uFF0C\u8BF7\u5728\u7EC8\u7AEF\u624B\u52A8\u6267\u884C\uFF1A" + UPD_HINT + "\uFF08" + em + "\uFF09" : em };
      }
      let channel = "Gitee";
      if (nat.code !== 0) {
        const detail = String(nat.err || nat.out || "exit " + nat.code).slice(0, 200);
        const notFound = nat.code === 127 || /ENOENT|command not found|no such file/i.test(detail);
        if (notFound) return { ok: false, error: "\u672A\u627E\u5230 dsh \u547D\u4EE4\uFF0C\u8BF7\u624B\u52A8\u6267\u884C\uFF1A" + UPD_HINT };
        let fb;
        try {
          fb = await runCmd(ctx, ["dsh", "plugin", "--profile", "web", "add", FALLBACK_REPO_URL], "/tmp", 3e5);
        } catch (e) {
          fb = { code: -1, err: String(e && e.message || e), out: "" };
        }
        if (fb.code !== 0) {
          const fbDetail = String(fb.err || fb.out || "exit " + fb.code).slice(0, 200);
          return { ok: false, error: "dsh plugin add \u5931\u8D25\uFF08Gitee \u4E3B\u901A\u9053\u4E0E GitHub \u5907\u901A\u9053\u5747\u5DF2\u5C1D\u8BD5\uFF09: Gitee: " + detail + "\uFF1BGitHub: " + fbDetail };
        }
        channel = "GitHub";
      }
      return { ok: true, updated: true, method: "native-add", channel, note: "\u91CD\u542F DSH \u751F\u6548" + (channel === "GitHub" ? "\uFF08Gitee \u62C9\u53D6\u5931\u8D25\uFF0C\u5DF2\u6539\u7528 GitHub \u5907\u901A\u9053\uFF09" : "") };
    }
    const pre = await updateCheckState(ctx);
    if (pre.error) return { ok: false, error: pre.error };
    if (!pre.repo) return { ok: false, hint: UPD_HINT };
    if (pre.behind === 0) return { ok: true, updated: false, version: pre.version, note: "\u5DF2\u662F\u6700\u65B0" };
    if (!pre.clean) return { ok: false, error: "\u5DE5\u4F5C\u533A\u6709\u6539\u52A8\uFF0C\u5DF2\u62D2\u7EDD\u66F4\u65B0\uFF08\u8BF7\u5148\u5728\u63D2\u4EF6\u76EE\u5F55\u5904\u7406\u672A\u63D0\u4EA4\u4FEE\u6539\uFF09" };
    const from2 = pre.version ? "v" + pre.version : pre.current;
    const pull = await runCmd(ctx, ["git", "pull", "--ff-only", "origin", "master"], repo, 18e4);
    if (pull.code !== 0) return { ok: false, error: "git pull \u5931\u8D25: " + (pull.err || pull.out || "exit " + pull.code).slice(0, 400) };
    const bld = await runCmd(ctx, [process.execPath, "scripts/build.mjs"], repo, 3e5);
    if (bld.code !== 0) return { ok: false, error: "\u6784\u5EFA\u5931\u8D25: " + (bld.err || bld.out || "exit " + bld.code).slice(0, 400) };
    const chk = await updateCheckState(ctx);
    return { ok: true, updated: true, from: from2, to: chk && chk.version ? "v" + chk.version : chk && chk.current || "", note: "\u91CD\u542F DSH \u751F\u6548" };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}
function createBiUpdateCommand(ctx) {
  return {
    name: "bi-update",
    description: "\u68C0\u67E5\u5E76\u66F4\u65B0 BI \u63D2\u4EF6\u5230\u6700\u65B0\u7248",
    handler: async () => {
      const r = await performUpdate(ctx);
      if (!r || r.ok !== true) return { kind: "error", text: String(r && (r.error || r.hint) || "\u66F4\u65B0\u5931\u8D25") };
      if (!r.updated) return { kind: "success", text: "\u5DF2\u662F\u6700\u65B0\u7248\u672C " + (r.version ? "v" + r.version : r.note || "") };
      return { kind: "success", text: "\u66F4\u65B0\u5B8C\u6210" + (r.from ? " " + r.from + "\u2192" + (r.to || "") : "") + "\uFF0C" + (r.note || "\u91CD\u542F DSH \u751F\u6548") };
    }
  };
}
function createBiCreateCommand() {
  return {
    name: "bi-create",
    description: "\u7528\u81EA\u7136\u8BED\u8A00\u63CF\u8FF0\u751F\u6210 BI \u770B\u677F",
    input: { hint: "<\u770B\u677F\u63CF\u8FF0\uFF0C\u5982\uFF1A\u8FD130\u5929\u5404\u54C1\u7C7B\u9500\u552E\u989D\u8D8B\u52BF>" },
    // 提交给 agent 的用户消息本身即权威领域事件、已承载描述文本，故 recordInput:false 避免会话日志重复记录
    recordInput: false,
    handler: (invocation) => {
      const desc = String(invocation.rawInput || "").trim();
      if (!desc) return { kind: "success", text: "\u7528\u6CD5: /bi-create <\u63CF\u8FF0>\uFF0C\u4F8B\u5982 /bi-create \u8FD130\u5929\u5404\u54C1\u7C7B\u9500\u552E\u989D\u8D8B\u52BF" };
      if (invocation.signal && invocation.signal.aborted) return { kind: "error", text: "\u8BF7\u6C42\u5DF2\u53D6\u6D88" };
      const agent = invocation.agent;
      if (!agent || typeof agent.followup !== "function") return { kind: "error", text: "\u5F53\u524D\u4F1A\u8BDD\u65E0\u6CD5\u76F4\u63A5\u53D1\u8D77\u751F\u6210\uFF0C\u8BF7\u5728\u5BF9\u8BDD\u6846\u4E2D\u8F93\u5165\u8BE5\u63CF\u8FF0\u3002" };
      try {
        agent.followup({
          role: "user",
          content: [{ type: "text", text: "\u7528\u6237\u901A\u8FC7 /bi-create \u8BF7\u6C42\u751F\u6210\u770B\u677F\uFF1A" + desc + '\n\u8BF7\u6309\u770B\u677F\u751F\u6210\u6D41\u7A0B\u5904\u7406\uFF1A\u5148\u7528 get_meta \u6838\u5BF9\u5B57\u6BB5\uFF08\u9500\u552E\u53E3\u5F84\u9700 filters order_status=1\uFF0C\u8D8B\u52BF\u56FE\u52A0\u65F6\u95F4\u8FC7\u6EE4\uFF09\uFF0C\u518D\u8C03\u7528 render_dashboard \u751F\u6210\u9884\u89C8\uFF0C\u56DE\u590D\u672B\u5C3E\u7528 dsh-ui \u56F4\u680F {"kind":"dashboard","id":"<\u672C\u6B21 previewId>"} \u5C55\u793A\uFF0C\u5E76\u8BE2\u95EE\u7528\u6237\u662F\u5426\u4FDD\u5B58\u5230\u300C\u6211\u7684\u770B\u677F\u300D\u3002\u8FDB\u9636\u9009\u578B\uFF08\u6309\u9700\u4F18\u5148\u4E8E\u56DE\u9000 PG \u89C6\u56FE\uFF09\uFF1A\u4E8C\u7EF4\u5BC6\u5EA6/\u4EA4\u53C9\u5206\u5E03\u7528 type:"heatmap"\uFF08\u6070\u597D 2 \u4E2A group_by \u7EF4\u5EA6=XY \u8F74 + 1 \u6307\u6807\uFF09\uFF1B\u9700\u8981\u4ED6\u8868\u7EF4\u5EA6\uFF08\u5982\u5927\u7C7B\uFF09\u7ED9\u56FE\u8868\u52A0 join\uFF08\u5355\u5BF9\u8C61 {table:"\u7EF4\u8868", left_key:"\u4E3B\u8868\u5217", right_key:"\u7EF4\u8868\u5173\u8054\u5217"}\uFF0C\u6216\u591A\u7EA7\u94FE\u5F0F\u5BF9\u8C61\u6570\u7EC4\uFF0C\u540E\u7EA7\u53EF\u5F15\u7528\u524D\u7EA7\u4EA7\u51FA\u5217\uFF1B\u53EF\u9009 type:"left"|"inner"\uFF0C\u7F3A\u7701 left\uFF09\uFF1B\u5360\u6BD4/\u5BA2\u5355\u4EF7\u7B49\u6D3E\u751F\u6307\u6807\u628A metrics.column \u5199\u6210\u8868\u8FBE\u5F0F\uFF08\u5982 "pay_amount / product_qty"\uFF0Cgroup_by \u9879\u540C\u6837\u652F\u6301\uFF0C\u53EF\u7528 hour/minute/datediff/date_add \u7B49\u65E5\u671F\u51FD\u6570\uFF09\uFF0C\u5B57\u6BB5\u4E0E\u56FE\u578B\u80FD\u529B\u7EC6\u8282\u4EE5\u7CFB\u7EDF\u63D0\u793A\u4E2D\u7684\u770B\u677F schema \u4E3A\u51C6\uFF1B\u76F8\u5BF9\u65F6\u95F4\u7B5B\u9009\u628A filters[].value \u5199\u6210\u8BB0\u53F7\uFF08"today"=\u4ECA\u5929\u3001"-30d"=\u8FD130\u5929\u3001BETWEEN ["today-29","today"] \u7B49\uFF09\uFF0C\u770B\u677F\u6BCF\u6B21\u6253\u5F00\u81EA\u52A8\u91CD\u7B97\u65F6\u95F4\u7A97\u3002' }],
          source: { kind: "user" }
        });
      } catch (e) {
        return { kind: "error", text: "\u63D0\u4EA4\u5931\u8D25: " + String(e && e.message || e) };
      }
      return { kind: "success", text: "\u5DF2\u63D0\u4EA4\u770B\u677F\u751F\u6210\u8BF7\u6C42\uFF1A" + desc + "\uFF08\u6A21\u578B\u751F\u6210\u4E2D\uFF0C\u7A0D\u5019\u67E5\u770B\u9884\u89C8\uFF09" };
    }
  };
}
function cmpVal(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const na = a === "" || a == null ? NaN : Number(a), nb = b === "" || b == null ? NaN : Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  const sa = a == null ? "" : String(a), sb = b == null ? "" : String(b);
  if (/\d/.test(sa) && /\d/.test(sb)) {
    const ta = Date.parse(sa), tb = Date.parse(sb);
    if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb;
  }
  return sa.localeCompare(sb);
}
function aggregate(rows, chart) {
  const gb = chart.group_by || [];
  const metrics = chart.metrics || [];
  const gacc = gb.map(colAccessor);
  const macc = metrics.map(metricAccessor);
  const keys = evalKeysIfExpr(chart, rows);
  const groups = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const gvals = gacc.map(function(a) {
      const v = a.get(row, keys);
      return v === null || v === void 0 ? "" : v;
    });
    const key = gvals.map(String).join("");
    let g = groups.get(key);
    if (!g) {
      g = { gvals, sum: metrics.map(() => 0), n: metrics.map(() => 0), vn: metrics.map(() => 0), min: metrics.map(() => Infinity), max: metrics.map(() => -Infinity) };
      groups.set(key, g);
    }
    ;
    metrics.forEach((m, i) => {
      g.n[i] += 1;
      const v = Number(macc[i].num(row, keys));
      if (Number.isFinite(v)) {
        g.sum[i] += v;
        g.vn[i] += 1;
        if (v < g.min[i]) g.min[i] = v;
        if (v > g.max[i]) g.max[i] = v;
      }
    });
  }
  ;
  let out = [];
  for (const g of groups.values()) {
    const r = {};
    gacc.forEach((a, i) => {
      r[a.label] = g.gvals[i];
    });
    metrics.forEach((m, i) => {
      let val;
      if (m.agg === "count") val = g.n[i];
      else if (m.agg === "avg") val = g.vn[i] ? g.sum[i] / g.vn[i] : 0;
      else if (m.agg === "min") val = g.vn[i] ? g.min[i] : 0;
      else if (m.agg === "max") val = g.vn[i] ? g.max[i] : 0;
      else val = g.sum[i];
      r[m.alias] = Math.round(val * 100) / 100;
    });
    out.push(r);
  }
  ;
  if (chart.sort && chart.sort.by) {
    const by = chart.sort.by, desc = chart.sort.desc !== false;
    out = out.sort((a, b) => {
      const c = cmpVal(a[by], b[by]);
      return desc ? -c : c;
    });
  }
  ;
  if (chart.limit) out = out.slice(0, chart.limit);
  return out;
}
var HEAT_RAMP = ["#fff5eb", "#fdd0a2", "#fd8d3c", "#d94801", "#7f2704"];
function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function heatColor(v, min, max) {
  const span = max - min;
  const t = span > 0 ? Math.max(0, Math.min(1, (v - min) / span)) : 0.5;
  const seg = HEAT_RAMP.length - 1, pos = t * seg, i = Math.min(seg - 1, Math.floor(pos)), f = pos - i;
  const c1 = hexToRgb(HEAT_RAMP[i]), c2 = hexToRgb(HEAT_RAMP[i + 1]);
  return "rgb(" + Math.round(c1[0] + (c2[0] - c1[0]) * f) + "," + Math.round(c1[1] + (c2[1] - c1[1]) * f) + "," + Math.round(c1[2] + (c2[2] - c1[2]) * f) + ")";
}
function buildOption(chart, rows) {
  if (chart.type === "text") return { type: "text", title: chart.title, text: chart.text || "" };
  const metric = chart.metrics && chart.metrics[0];
  const gbs = chart.group_by || [];
  if (chart.type === "table") {
    const tcols = rows.length ? Object.keys(rows[0]) : [];
    const tl = {};
    tcols.forEach(function(c2) {
      tl[c2] = NAME_MAP_ZH.fields[c2] || c2;
    });
    return { type: "table", title: chart.title, columns: tcols, columnLabels: tl, rows };
  }
  if (chart.type === "kpi") return { type: "kpi", title: chart.title, value: rows.length && metric ? rows[0][metric.alias] : null };
  const g0 = gbs.length ? colAccessor(gbs[0]) : null;
  const names = rows.map(function(r) {
    const v = g0 ? r[g0.label] : "";
    return String(v != null ? v : "");
  });
  const vals = rows.map(function(r) {
    return Number(metric ? r[metric.alias] : 0);
  });
  if (chart.type === "pie") return { type: "pie", title: chart.title, series: [{ type: "pie", radius: ["30%", "65%"], data: rows.map((r, i) => ({ name: names[i], value: vals[i] })) }] };
  if (chart.type === "heatmap") {
    if (gbs.length !== 2 || !metric) throw new Error("\u70ED\u529B\u56FE\u9700\u8981\u6070\u597D 2 \u4E2A group_by \u7EF4\u5EA6\u4E0E 1 \u4E2A\u6307\u6807\uFF08\u5F53\u524D " + gbs.length + " \u4E2A\u7EF4\u5EA6\uFF09");
    const a1 = colAccessor(gbs[0]), a2 = colAccessor(gbs[1]);
    const xs = [], ys = [], xix = /* @__PURE__ */ new Map(), yix = /* @__PURE__ */ new Map(), cells = [];
    rows.forEach(function(r) {
      const x = String(r[a1.label] != null ? r[a1.label] : ""), y = String(r[a2.label] != null ? r[a2.label] : ""), v = Number(r[metric.alias]);
      if (!xix.has(x)) {
        xix.set(x, xs.length);
        xs.push(x);
      }
      if (!yix.has(y)) {
        yix.set(y, ys.length);
        ys.push(y);
      }
      cells.push([xix.get(x), yix.get(y), Number.isFinite(v) ? v : 0]);
    });
    let vmin = Infinity, vmax = -Infinity;
    cells.forEach(function(c) {
      if (c[2] < vmin) vmin = c[2];
      if (c[2] > vmax) vmax = c[2];
    });
    if (!Number.isFinite(vmin)) {
      vmin = 0;
      vmax = 1;
    }
    const data = cells.map(function(c) {
      return { value: c, itemStyle: { color: heatColor(c[2], vmin, vmax) } };
    });
    return { type: "heatmap", title: chart.title, xAxis: { type: "category", data: xs, axisLabel: { rotate: 30, interval: 0 } }, yAxis: { type: "category", data: ys }, visualMap: { min: Math.round(vmin * 100) / 100, max: Math.round(vmax * 100) / 100, calculable: true, orient: "horizontal", left: "center", bottom: 0, inRange: { color: HEAT_RAMP } }, series: [{ type: "heatmap", name: metric.alias, data, label: { show: false }, emphasis: { itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.3)" } } }] };
  }
  if (chart.type === "funnel") return { type: "pie", title: chart.title, series: [{ type: "funnel", name: metric ? metric.alias : "", left: "12%", width: "76%", top: 36, bottom: 16, sort: "descending", gap: 2, label: { show: true, position: "inside" }, data: rows.map((r, i) => ({ name: names[i], value: vals[i] })) }] };
  if (chart.type === "gauge") {
    let gmax = 0;
    vals.forEach(function(v) {
      if (Number.isFinite(v) && v > gmax) gmax = v;
    });
    if (!(gmax > 0)) gmax = 100;
    return { type: "pie", title: chart.title, series: [{ type: "gauge", name: metric ? metric.alias : "", min: 0, max: gmax, splitNumber: 5, progress: { show: true, width: 14 }, axisLine: { lineStyle: { width: 14 } }, detail: { formatter: "{value}" }, data: rows.slice(0, 1).map((r, i) => ({ name: names[i], value: vals[i] })) }] };
  }
  const t = chart.type;
  const sType = t === "area" || t === "radar" ? "line" : t;
  const series = { type: sType, data: t === "scatter" ? rows.map((r, i) => [names[i], vals[i]]) : vals, name: metric ? metric.alias : "" };
  if (t === "area") series.areaStyle = { opacity: 0.3 };
  return { type: t, title: chart.title, xAxis: { type: "category", data: names, axisLabel: { rotate: 30, interval: 0 } }, yAxis: { type: "value" }, series: [series] };
}
function addColumnRefs(s, ref) {
  let expr = null;
  if (typeof ref === "string") {
    if (EXPR_IDENT.test(ref)) {
      s.add(ref);
      return;
    }
    expr = ref;
  } else if (ref && typeof ref === "object" && typeof ref.expr === "string") expr = ref.expr;
  else return;
  try {
    exprCols(parseExpr(expr)).forEach(function(c) {
      s.add(c);
    });
  } catch (e) {
  }
}
function neededColumns(chart) {
  const s = /* @__PURE__ */ new Set();
  (chart.group_by || []).forEach((c) => addColumnRefs(s, c));
  (chart.metrics || []).forEach((m) => {
    if (m && m.column) addColumnRefs(s, m.column);
  });
  (chart.filters || []).forEach((f) => f.column && s.add(f.column));
  const tc = chart.time_column || (chart.granularity === "month" ? "order_date" : null);
  if (tc) s.add(tc);
  return Array.from(s);
}
var tableColsCache = /* @__PURE__ */ new Map();
async function tableColumnNames(ctx, table) {
  if (tableColsCache.has(table)) return tableColsCache.get(table);
  let set2 = null;
  try {
    const meta = await getJson(ctx, "GET", "/api/meta/table/" + encodeURIComponent(table), void 0, 8e3);
    if (meta && Array.isArray(meta.columns)) set2 = new Set(meta.columns.map(function(c) {
      return c && c.name;
    }).filter(Boolean));
  } catch (e) {
    set2 = null;
  }
  if (set2) {
    if (tableColsCache.size > 100) tableColsCache.clear();
    tableColsCache.set(table, set2);
  }
  return set2;
}
async function renderChartDef(ctx, chart, extraFilters) {
  if (chart.type === "text") return { type: "text", title: chart.title || "", text: chart.text || "" };
  const nowSnap = currentNow();
  const allFilters = resolveFilters((chart.filters || []).concat(extraFilters || []), nowSnap);
  const payload = { table: chart.table, filters: allFilters, limit: 2e5 };
  const cols = neededColumns(chart);
  const joins = normalizeJoins(chart.join);
  let dimFilterGroups = [], dimColPlans = null;
  if (joins.length) {
    const mainSet = await tableColumnNames(ctx, chart.table);
    const dimSets = [];
    for (const j of joins) dimSets.push(await tableColumnNames(ctx, j.table));
    if (mainSet && dimSets.every(function(s) {
      return s;
    })) {
      dimColPlans = joins.map(function(j, i) {
        return { rk: j.right_key, refDim: [], dimFilters: [] };
      });
      const pushU = function(arr, c) {
        if (arr.indexOf(c) < 0) arr.push(c);
      };
      const factCols = [];
      cols.forEach(function(c) {
        if (mainSet.has(c)) pushU(factCols, c);
        else {
          const i = dimSets.findIndex(function(s) {
            return s.has(c);
          });
          if (i < 0) throw new Error('\u56FE\u8868\u5B9A\u4E49\u5F15\u7528\u672A\u77E5\u5217 "' + c + '"\uFF08\u4E3B\u8868 ' + chart.table + " \u4E0E\u5173\u8054\u8868 " + joins.map(function(j) {
            return j.table;
          }).join("/") + " \u5747\u65E0\u6B64\u5217\uFF09");
          pushU(dimColPlans[i].refDim, c);
        }
      });
      joins.forEach(function(j) {
        if (mainSet.has(j.left_key)) pushU(factCols, j.left_key);
      });
      allFilters.forEach(function(f) {
        if (!f || !f.column) return;
        if (mainSet.has(f.column)) return;
        const i = dimSets.findIndex(function(s) {
          return s.has(f.column);
        });
        const lv = i < 0 ? 0 : i;
        pushU(dimColPlans[lv].refDim, f.column);
        pushU(dimColPlans[lv].dimFilters, f);
      });
      payload.columns = factCols;
      dimFilterGroups = dimColPlans.map(function(p) {
        return p.dimFilters;
      });
    } else if (cols.length) payload.columns = cols;
  } else if (cols.length) payload.columns = cols;
  const data = await getJson(ctx, "POST", "/api/query", payload);
  let rows = data.rows || [];
  for (let ji = 0; ji < joins.length; ji++) {
    const j = joins[ji];
    const dp = { table: j.table, limit: 2e5 };
    if (dimColPlans) {
      const ref = dimColPlans[ji].refDim;
      dp.columns = [j.right_key].concat(ref.filter(function(c) {
        return c !== j.right_key;
      }));
    }
    const dimData = await getJson(ctx, "POST", "/api/query", dp);
    rows = mergeJoinRows(rows, dimData.rows || [], j.left_key, j.right_key, j.type);
    if (dimFilterGroups[ji] && dimFilterGroups[ji].length) rows = applyJsFilters(rows, dimFilterGroups[ji]);
  }
  if (chart.granularity === "month") {
    const tc = chart.time_column || "order_date";
    const mdefs = chart.metrics || [];
    const macc = mdefs.map(metricAccessor);
    const keys = evalKeysIfExpr(chart, rows);
    const daily = {};
    rows.forEach(function(r) {
      const d = r[tc] ? String(r[tc]).slice(0, 10) : "";
      if (!d) return;
      if (!daily[d]) {
        daily[d] = {};
        mdefs.forEach(function(mm) {
          daily[d][mm.alias] = 0;
        });
      }
      mdefs.forEach(function(mm, mi) {
        if (mm.agg === "count") daily[d][mm.alias] += 1;
        else {
          const v = Number(macc[mi].plain ? r[macc[mi].column] : macc[mi].num(r, keys));
          if (Number.isFinite(v)) daily[d][mm.alias] += v;
        }
      });
    });
    const mb = {};
    Object.keys(daily).sort().forEach(function(d) {
      const k = d.slice(0, 7);
      if (!mb[k]) {
        mb[k] = {};
        mdefs.forEach(function(mm) {
          mb[k][mm.alias] = 0;
        });
      }
      mdefs.forEach(function(mm) {
        mb[k][mm.alias] += daily[d][mm.alias];
      });
    });
    const gk = chart.group_by && chart.group_by.length ? colAccessor(chart.group_by[0]).label : "order_date";
    const rowsM = Object.keys(mb).sort().map(function(k) {
      const o = {};
      o[gk] = k;
      mdefs.forEach(function(mm) {
        o[mm.alias] = Math.round(mb[k][mm.alias] * 100) / 100;
      });
      return o;
    });
    return { type: chart.type, title: chart.title || "", option: buildOption(chart, rowsM), rows: rowsM };
  }
  if (chart.type === "table" && !(chart.group_by && chart.group_by.length)) {
    const macc = (chart.metrics || []).map(metricAccessor).filter(function(a) {
      return !a.plain;
    });
    if (macc.length && rows.length) {
      const keys = Object.keys(rows[0]);
      rows.forEach(function(r) {
        macc.forEach(function(a) {
          const v = Number(a.num(r, keys));
          r[a.alias] = Number.isFinite(v) ? v : null;
        });
      });
    }
  }
  let agg = rows;
  if (chart.type !== "table" || chart.group_by && chart.group_by.length) agg = aggregate(rows, chart);
  return { type: chart.type, title: chart.title || "", option: buildOption(chart, agg), rows: agg };
}
var filterItem = { type: "object", additionalProperties: false, properties: { column: { type: "string", required: true }, op: { type: "string", required: true, enum: ["=", "!=", ">", ">=", "<", "<=", "IN", "NOT_IN", "LIKE", "ILIKE", "BETWEEN", "IS_NULL", "IS_NOT_NULL"] }, value: { type: "json" } } };
var metricItem = { type: "object", additionalProperties: false, properties: { column: { type: "string", required: true }, agg: { type: "string", required: true, enum: ["sum", "count", "avg", "min", "max"] }, alias: { type: "string", required: true } } };
var chartDef = { type: "object", additionalProperties: false, properties: { type: { type: "string", required: true, enum: ["bar", "line", "area", "pie", "scatter", "heatmap", "radar", "funnel", "gauge", "table", "text", "kpi"] }, title: { type: "string", required: true }, table: { type: "string", required: true }, join: { type: "json" }, filters: { type: "array", items: filterItem }, group_by: { type: "array", items: { type: "json" } }, metrics: { type: "array", items: metricItem }, sort: { type: "object", additionalProperties: false, properties: { by: { type: "string" }, desc: { type: "boolean" } } }, limit: { type: "integer" }, text: { type: "string" }, granularity: { type: "string", enum: ["day", "month"] }, time_column: { type: "string" } } };
var CHART_TYPES = ["bar", "line", "area", "pie", "scatter", "heatmap", "radar", "funnel", "gauge", "table", "text", "kpi"];
var CHART_KEYS = ["type", "title", "table", "join", "filters", "group_by", "metrics", "sort", "limit", "text", "granularity", "time_column"];
function validateChartDef(def, tag) {
  const errs = [];
  if (!def || typeof def !== "object" || Array.isArray(def)) return [tag + ": \u5FC5\u987B\u662F\u5BF9\u8C61"];
  Object.keys(def).forEach(function(k) {
    if (CHART_KEYS.indexOf(k) < 0) errs.push(tag + ': \u672A\u77E5\u5B57\u6BB5 "' + k + '"\uFF08\u5141\u8BB8: ' + CHART_KEYS.join(", ") + "\uFF09");
  });
  if (CHART_TYPES.indexOf(def.type) < 0) errs.push(tag + ": type \u5FC5\u987B\u4E3A " + CHART_TYPES.join("/"));
  if (!def.title || !String(def.title).trim()) errs.push(tag + ": title \u5FC5\u586B");
  if (def.sort !== void 0 && def.sort !== null) {
    if (typeof def.sort !== "object" || Array.isArray(def.sort)) errs.push(tag + ": sort \u5FC5\u987B\u662F\u5BF9\u8C61");
    else Object.keys(def.sort).forEach(function(k) {
      if (["by", "desc"].indexOf(k) < 0) errs.push(tag + ': sort \u542B\u672A\u77E5\u5B57\u6BB5 "' + k + '"');
    });
  }
  if (def.type !== "text") {
    if (!def.table || !String(def.table).trim()) errs.push(tag + ": table \u5FC5\u586B\uFF08\u56FE\u8868\u5FC5\u987B\u7ED1\u5B9A\u6570\u636E\u8868\uFF09");
    const ms = def.metrics;
    if (!Array.isArray(ms) || ms.length === 0) errs.push(tag + ": metrics \u5FC5\u586B\uFF0C\u81F3\u5C11 1 \u4E2A\u6307\u6807\u5F15\u7528\uFF08{column, agg, alias}\uFF09");
    else if (ms.length > 1) errs.push(tag + ": \u6682\u4E0D\u652F\u6301\u591A\u6307\u6807\u56FE\u8868\uFF08\u68C0\u6D4B\u5230 " + ms.length + " \u4E2A\u6307\u6807\uFF0C\u5F53\u524D\u53EA\u5141\u8BB8 1 \u4E2A\uFF09\u3002\u8BF7\u628A\u6BCF\u4E2A\u6307\u6807\u62C6\u6210\u72EC\u7ACB\u56FE\u8868\u3002");
    if (Array.isArray(ms)) ms.forEach(function(m, i) {
      if (!m || typeof m !== "object") {
        errs.push(tag + ": metrics[" + i + "] \u5FC5\u987B\u662F\u5BF9\u8C61");
        return;
      }
      Object.keys(m).forEach(function(k) {
        if (["column", "agg", "alias"].indexOf(k) < 0) errs.push(tag + ": metrics[" + i + '] \u542B\u672A\u77E5\u5B57\u6BB5 "' + k + '"');
      });
      if (!m.column) errs.push(tag + ": metrics[" + i + "].column \u5FC5\u586B");
      if (["sum", "count", "avg", "min", "max"].indexOf(m.agg) < 0) errs.push(tag + ": metrics[" + i + "].agg \u5FC5\u987B\u4E3A sum/count/avg/min/max");
      if (!m.alias) errs.push(tag + ": metrics[" + i + "].alias \u5FC5\u586B");
    });
    if (def.filters !== void 0 && !Array.isArray(def.filters)) errs.push(tag + ": filters \u5FC5\u987B\u662F\u6570\u7EC4");
    if (Array.isArray(def.filters)) def.filters.forEach(function(f, i) {
      if (!f || typeof f !== "object" || !f.column || !f.op) errs.push(tag + ": filters[" + i + "] \u5FC5\u987B\u542B column/op");
    });
    if (def.group_by !== void 0 && !Array.isArray(def.group_by)) errs.push(tag + ": group_by \u5FC5\u987B\u662F\u6570\u7EC4");
    else if (Array.isArray(def.group_by)) def.group_by.forEach(function(g, i) {
      const t2 = tag + ": group_by[" + i + "]";
      if (typeof g === "string") {
        if (!g) {
          errs.push(t2 + " \u4E0D\u80FD\u4E3A\u7A7A");
          return;
        }
        if (!EXPR_IDENT.test(g)) {
          try {
            parseExpr(g);
          } catch (e) {
            errs.push(t2 + " \u65E2\u4E0D\u662F\u5217\u540D\u4E5F\u4E0D\u662F\u5408\u6CD5\u8868\u8FBE\u5F0F\uFF08" + e.message + "\uFF09");
          }
        }
      } else if (g && typeof g === "object" && typeof g.expr === "string") {
        if (!g.expr) {
          errs.push(t2 + ".expr \u4E0D\u80FD\u4E3A\u7A7A");
          return;
        }
        try {
          parseExpr(g.expr);
        } catch (e) {
          errs.push(t2 + ".expr \u4E0D\u662F\u5408\u6CD5\u8868\u8FBE\u5F0F\uFF08" + e.message + "\uFF09");
        }
        if (g.as !== void 0 && typeof g.as !== "string") errs.push(t2 + ".as \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
      } else errs.push(t2 + " \u5FC5\u987B\u662F\u5217\u540D\u5B57\u7B26\u4E32\u6216 {expr, as} \u8868\u8FBE\u5F0F\u5BF9\u8C61");
    });
    if (Array.isArray(def.metrics)) def.metrics.forEach(function(m, i) {
      if (m && typeof m.column === "string" && m.column && !EXPR_IDENT.test(m.column)) {
        try {
          parseExpr(m.column);
        } catch (e) {
          errs.push(tag + ": metrics[" + i + "].column \u65E2\u4E0D\u662F\u5217\u540D\u4E5F\u4E0D\u662F\u5408\u6CD5\u8868\u8FBE\u5F0F\uFF08" + e.message + "\uFF09");
        }
      }
    });
    if (def.type === "heatmap") {
      if (!Array.isArray(def.group_by) || def.group_by.length !== 2) errs.push(tag + ": heatmap \u9700\u8981\u6070\u597D 2 \u4E2A group_by \u7EF4\u5EA6\uFF08\u7B2C\u4E00\u7EF4=X \u8F74\uFF0C\u7B2C\u4E8C\u7EF4=Y \u8F74\uFF09");
      if (def.granularity) errs.push(tag + ": heatmap \u4E0D\u652F\u6301 granularity\uFF08\u6708\u5EA6\u7C92\u5EA6\u4F1A\u4E22\u5931\u7B2C\u4E8C\u7EF4\uFF09");
    }
    if (def.join !== void 0) {
      const isArr = Array.isArray(def.join);
      const list = isArr ? def.join : [def.join];
      if (!isArr && (def.join === null || typeof def.join !== "object")) errs.push(tag + ": join \u5FC5\u987B\u662F\u5BF9\u8C61 {table, left_key, right_key}");
      else {
        if (isArr && list.length > 4) errs.push(tag + ": join \u94FE\u6700\u591A 4 \u7EA7\uFF08\u5F53\u524D " + list.length + " \u7EA7\uFF09");
        list.forEach(function(j, ji) {
          const jt = isArr ? tag + ": join[" + ji + "]" : tag + ": join";
          if (!j || typeof j !== "object" || Array.isArray(j)) {
            errs.push(jt + " \u5FC5\u987B\u662F\u5BF9\u8C61 {table, left_key, right_key}");
            return;
          }
          Object.keys(j).forEach(function(k) {
            if (["table", "left_key", "right_key", "type"].indexOf(k) < 0) errs.push(jt + ' \u542B\u672A\u77E5\u5B57\u6BB5 "' + k + '"');
          });
          if (!j.table || !String(j.table).trim()) errs.push(jt + ".table \u5FC5\u586B\uFF08\u5173\u8054\u7EF4\u8868\u540D\uFF09");
          if (!j.left_key || !String(j.left_key).trim()) errs.push(jt + ".left_key \u5FC5\u586B\uFF08\u4E3B\u8868/\u4E0A\u4E00\u7EA7\u5173\u8054\u5217\uFF09");
          if (!j.right_key || !String(j.right_key).trim()) errs.push(jt + ".right_key \u5FC5\u586B\uFF08\u7EF4\u8868\u5173\u8054\u5217\uFF09");
          if (j.type !== void 0 && ["left", "inner"].indexOf(j.type) < 0) errs.push(jt + ".type \u5FC5\u987B\u4E3A left/inner\uFF08\u7F3A\u7701 left\uFF0C\u5373\u672A\u547D\u4E2D\u4E8B\u5B9E\u884C\u4FDD\u7559\u7684\u7F3A\u7701\u5408\u5E76\u8BED\u4E49\uFF09");
        });
      }
    }
  }
  return errs;
}
function assertChartDefs(defs, prefix) {
  const all = [];
  (defs || []).forEach(function(d, i) {
    const t = prefix + i + (d && d.title ? "\u300C" + d.title + "\u300D" : "");
    validateChartDef(d, t).forEach(function(m) {
      if (all.indexOf(m) < 0) all.push(m);
    });
  });
  if (all.length) throw new Error("\u56FE\u8868\u5B9A\u4E49\u6821\u9A8C\u5931\u8D25\uFF1A\n- " + all.join("\n- "));
}
function plainFilterCols(cd) {
  const cols = [];
  (cd.group_by || []).forEach(function(g2) {
    if (typeof g2 === "string" && EXPR_IDENT.test(g2) && cols.indexOf(g2) < 0) cols.push(g2);
  });
  (cd.metrics || []).forEach(function(m2) {
    if (m2 && typeof m2.column === "string" && EXPR_IDENT.test(m2.column) && cols.indexOf(m2.column) < 0) cols.push(m2.column);
  });
  return cols.slice(0, 8);
}
var storeCache = null;
var storeReadonlyError = null;
var storeReadInflight = null;
var storeWriteChain = Promise.resolve();
function storeDefault() {
  return { charts: [], views: [{ id: 1, name: "\u5168\u90E8" }] };
}
function readStore() {
  if (storeCache && !storeReadonlyError) return Promise.resolve(storeCache);
  if (storeReadInflight) return storeReadInflight;
  const p = readStoreFromDisk().finally(function() {
    storeReadInflight = null;
  });
  storeReadInflight = p;
  return p;
}
async function readStoreFromDisk() {
  let txt;
  try {
    txt = await fsp.readFile(CFG.storeFile, "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") {
      storeCache = storeDefault();
      storeReadonlyError = null;
      return storeCache;
    }
    storeReadonlyError = "\u770B\u677F\u5B58\u50A8\u8BFB\u53D6\u5931\u8D25: " + String(e && e.message || e);
    throw new Error(storeReadonlyError);
  }
  try {
    storeCache = JSON.parse(txt);
  } catch (e) {
    storeReadonlyError = "\u770B\u677F\u5B58\u50A8 JSON \u635F\u574F: " + String(e && e.message || e);
    throw new Error(storeReadonlyError);
  }
  storeReadonlyError = null;
  if (storeCache.dashboards && !storeCache.charts) {
    const charts = [];
    (storeCache.dashboards || []).forEach(function(d) {
      (d.schema && d.schema.charts || []).forEach(function(c, i) {
        charts.push({ id: String(d.id) + "-" + i, title: c.title || d.title + " " + (i + 1), type: c.type, chart_def: c, view_ids: [1], created_at: d.created_at || (/* @__PURE__ */ new Date()).toISOString() });
      });
    });
    storeCache.charts = charts;
    storeCache.dashboards = null;
    await queueStoreWrite();
  }
  if (!storeCache.charts) storeCache.charts = [];
  if (!storeCache.views) storeCache.views = [{ id: 1, name: "\u5168\u90E8" }];
  return storeCache;
}
function queueStoreWrite() {
  const run = storeWriteChain.then(writeStoreNow);
  storeWriteChain = run.then(function() {
  }, function() {
  });
  return run;
}
async function writeStoreNow() {
  if (storeReadonlyError) throw new Error("\u770B\u677F\u5B58\u50A8\u53EA\u8BFB: " + storeReadonlyError + "\uFF08\u4FEE\u590D\u5B58\u50A8\u6587\u4EF6\u540E\u81EA\u52A8\u6062\u590D\uFF09");
  if (!storeCache) return;
  const target = CFG.storeFile;
  const tmp = target + ".tmp-" + process.pid + "-" + Date.now();
  try {
    await fsp.mkdir(dirname(target), { recursive: true });
    await fsp.writeFile(tmp, JSON.stringify(storeCache));
    await fsp.rename(tmp, target);
  } catch (e) {
    try {
      await fsp.unlink(tmp);
    } catch (e2) {
    }
    throw new Error("\u770B\u677F\u5B58\u50A8\u5199\u5165\u5931\u8D25: " + String(e && e.message || e));
  }
}
function snapLayout(s) {
  return { layout_locked: !!s.layout_locked, charts: (s.charts || []).map(function(c) {
    return { id: c.id, title: c.title, type: c.type, def: c.chart_def ? JSON.parse(JSON.stringify(c.chart_def)) : null, layout: c.layout ? { w: c.layout.w, h: c.layout.h } : null, layout_locked: !!c.layout_locked };
  }), views: (s.views || []).map(function(v) {
    return { id: v.id, free_layout: !!v.free_layout, chart_pos: JSON.parse(JSON.stringify(v.chart_pos || {})), chart_locks: JSON.parse(JSON.stringify(v.chart_locks || {})) };
  }) };
}
function pushUndo(s) {
  s.undo_stack = s.undo_stack || [];
  s.undo_stack.push({ at: Date.now(), snap: snapLayout(s) });
  if (s.undo_stack.length > 40) s.undo_stack = s.undo_stack.slice(s.undo_stack.length - 40);
}
var latestSchema = /* @__PURE__ */ new Map();
var LATEST_SCHEMA_MAX = 100;
function schemaGet(k) {
  if (!latestSchema.has(k)) return void 0;
  const v = latestSchema.get(k);
  latestSchema.delete(k);
  latestSchema.set(k, v);
  return v;
}
function schemaSet(k, v) {
  if (latestSchema.has(k)) latestSchema.delete(k);
  latestSchema.set(k, v);
  while (latestSchema.size > LATEST_SCHEMA_MAX) {
    latestSchema.delete(latestSchema.keys().next().value);
  }
}
var LAST_SCHEMA = null;
var PREVIEW_MAX = 200;
var PREVIEW_TTL_DAYS = 30;
var index_default = { inject: ["subprocess", "systemPrompt", "webServer", "fs", "tools", "commands"], apply(ctx) {
  const persistReady = (async function() {
    const sub = ctx.get("subprocess");
    if (!sub) return;
    try {
      const h = sub.spawn({ argv: ["mkdir", "-p", PERSIST_DIR + "/vendor", PERSIST_DIR + "/data"], cwd: "/tmp", stdio: { stdin: "ignore", stdout: { maxBytes: 65536 }, stderr: { maxBytes: 65536 } }, graceMs: 5e3 });
      await h.done;
    } catch (e) {
    }
  })();
  cfgReady = (async function() {
    await persistReady;
    const f0 = ctx.get("fs");
    if (!f0) return;
    const readJson = async (p) => JSON.parse(await f0.readText(await f0.resolve(p)) || "{}");
    const exists = async (p) => {
      try {
        await f0.readText(await f0.resolve(p));
        return true;
      } catch (e) {
        return false;
      }
    };
    const LEGACY_PKG = PKG_DIR + "/../bi-dashboards-host";
    if (!await exists(PERSIST_DIR + "/config.json")) {
      const merged = {};
      const isLocal = (u) => !u || /\/\/(localhost|127\.0\.0\.1)/.test(u);
      for (const p of [LEGACY_PKG + "/lib/config.json.migrated", LEGACY_PKG + "/lib/config.json", LEGACY_PKG + "/config.json"]) {
        let c = {};
        try {
          c = await readJson(p);
        } catch (e) {
          continue;
        }
        if (c.dataApi && (!isLocal(c.dataApi) || !merged.dataApi || isLocal(merged.dataApi))) merged.dataApi = c.dataApi;
        if (c.statusUrl && (!isLocal(c.statusUrl) || !merged.statusUrl || isLocal(merged.statusUrl))) merged.statusUrl = c.statusUrl;
        ["vendorFile", "storeFile", "crawlConfigFile"].forEach(function(k) {
          if (typeof c[k] === "string" && c[k]) merged[k] = c[k];
        });
      }
      if (merged.vendorFile && merged.vendorFile.indexOf("static/vendor/echarts.min.js") >= 0) merged.vendorFile = "vendor/echarts.min.js";
      const next = Object.assign({ dataApi: CFG.dataApi, statusUrl: CFG.statusUrl, vendorFile: "vendor/echarts.min.js", storeFile: "data/bi-dashboards.json", crawlConfigFile: "" }, merged);
      try {
        await f0.writeText(await f0.resolve(PERSIST_DIR + "/config.json"), JSON.stringify(next, null, 2));
        console.log("[bi] \u5DF2\u5728 " + PERSIST_DIR + " \u751F\u6210 config.json" + (Object.keys(merged).length ? "\uFF08\u542B\u65E7\u5305\u8FC1\u79FB\u914D\u7F6E\uFF09" : ""));
      } catch (e) {
      }
      if (!await exists(PERSIST_DIR + "/data/bi-dashboards.json")) {
        try {
          const txt = await f0.readText(await f0.resolve(LEGACY_PKG + "/data/bi-dashboards.json"));
          if (txt) await f0.writeText(await f0.resolve(PERSIST_DIR + "/data/bi-dashboards.json"), txt);
          console.log("[bi] \u770B\u677F\u6570\u636E\u5DF2\u8FC1\u79FB\u81F3 " + PERSIST_DIR + "/data/");
        } catch (e) {
        }
      }
    }
    if (!await exists(PERSIST_DIR + "/vendor/echarts.min.js")) {
      for (const src of [LEGACY_PKG + "/static/vendor/echarts.min.js", PKG_DIR + "/static/vendor/echarts.min.js"]) {
        try {
          const txt = await f0.readText(await f0.resolve(src));
          await f0.writeText(await f0.resolve(PERSIST_DIR + "/vendor/echarts.min.js"), txt);
          console.log("[bi] echarts vendor \u5DF2\u5C31\u4F4D: " + PERSIST_DIR + "/vendor/echarts.min.js");
          break;
        } catch (e) {
        }
      }
    }
    try {
      const c = await readJson(PERSIST_DIR + "/config.json");
      CFG = Object.assign({}, CFG, c);
    } catch (e) {
    }
    ;
    ["vendorFile", "storeFile", "crawlConfigFile"].forEach(function(k) {
      if (CFG[k] && CFG[k].charAt(0) !== "/" && CFG[k].indexOf("://") < 0) CFG[k] = PERSIST_DIR + "/" + CFG[k];
    });
  })();
  const ws = ctx.get("webServer");
  const fsv = ctx.get("fs");
  const biApi = {};
  if (ws && fsv) ctx.effect(() => ws.register({ kind: "exact", path: ECHARTS_ROUTE, handler: async (req, res) => {
    try {
      await cfgReady;
      const t = await fsv.resolve(CFG.vendorFile);
      const buf = await fsv.readBytes(t, void 0, 4 * 1024 * 1024);
      res.setHeader("Content-Type", "application/javascript");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.writeHead(200);
      res.end(buf);
    } catch (e) {
      try {
        res.writeHead(404);
        res.end("not found");
      } catch (e2) {
      }
    }
  } }));
  ctx.systemPrompt.section({ name: "unmanned-store:dashboard-schema", order: 160, text: '\u3010\u770B\u677F Dashboard \u751F\u6210\u3011\n1. \u8C03\u7528 render_dashboard \u751F\u6210\u770B\u677F\uFF08\u4F20\u5165\u7ED3\u6784\u5316 schema\uFF0C\u9876\u5C42\u542B title/description/charts\uFF1B\u9500\u552E\u5FC5\u987B filters order_status=1\uFF1B\u8D8B\u52BF\u56FE\u52A0\u65F6\u95F4\u8FC7\u6EE4\uFF1B\u5B57\u6BB5\u6765\u81EA get_meta\uFF09\u3002\u6708\u5EA6\u6C47\u603B\u67F1\u72B6\u56FE\u53EF\u5728\u56FE\u8868\u5B9A\u4E49\u91CC\u52A0 granularity:"month"\uFF0C\u5E76\u7528 time_column \u6307\u5B9A\u65E5\u671F\u5217\uFF08\u7F3A\u7701 order_date\uFF0CHost \u4F1A\u6309\u65E5\u805A\u5408\u540E\u5408\u5E76\u4E3A\u6708\uFF09\u3002\u6BCF\u4E2A\u56FE\u8868 metrics \u53EA\u5141\u8BB8 1 \u4E2A\u6307\u6807\uFF08{column, agg, alias}\uFF09\uFF0C\u591A\u6307\u6807\u9700\u62C6\u6210\u591A\u4E2A\u56FE\u8868\uFF1B\u56FE\u8868\u5FC5\u987B\u5199 table\u3002\n\u3010\u8FDB\u9636\u80FD\u529B\u3011\u56FE\u8868\u7C7B\u578B\u652F\u6301 bar/line/area(\u9762\u79EF\u56FE)/pie/scatter/heatmap/radar/funnel/gauge/table/text/kpi\uFF1Bheatmap \u9700\u6070\u597D 2 \u4E2A group_by\uFF08\u7B2C\u4E00\u7EF4=X \u8F74\u3001\u7B2C\u4E8C\u7EF4=Y \u8F74\uFF09+1 \u6307\u6807\uFF1Bradar \u5F53\u524D\u6309\u6298\u7EBF\u6E32\u67D3\u3002\u8DE8\u8868\u5173\u8054\uFF1A\u56FE\u8868\u53EF\u52A0 join \u5173\u8054\u7EF4\u8868\u2014\u2014\u5355\u5BF9\u8C61 {table:"\u7EF4\u8868", left_key:"\u4E3B\u8868\u5217", right_key:"\u7EF4\u8868\u5173\u8054\u5217"} \u6216\u5BF9\u8C61\u6570\u7EC4\uFF08\u94FE\u5F0F\uFF0C\u6700\u591A 4 \u7EA7\u6309\u5E8F\u5408\u5E76\uFF0C\u540E\u7EA7 left_key \u53EF\u5F15\u7528\u524D\u7EA7\u4EA7\u51FA\u7684\u7EF4\u8868\u5217\uFF0C\u5982 \u9500\u552E\u660E\u7EC6\u2192\u5546\u54C1\u4E3B\u6863\u2192\u54C1\u7C7B\u7EF4\u5EA6 \u540E\u6309 mid_category \u5206\u7EC4\uFF09\uFF1B\u53EF\u9009\u9879 join.type:"left"|"inner"\uFF08\u7F3A\u7701 left=\u672A\u547D\u4E2D\u4E8B\u5B9E\u884C\u4FDD\u7559\uFF0Cinner=\u672A\u547D\u4E2D\u4E8B\u5B9E\u884C\u5254\u9664\uFF09\u3002Host \u5206\u522B\u53D6\u5404\u8868\u540E\u6309\u884C\u5408\u5E76\uFF0C\u7EF4\u8868\u5B57\u6BB5\u53EF\u76F4\u63A5\u7528\u4E8E group_by/metrics/filters\uFF08\u5982\u4E3B\u8868\u542B cate_code \u65F6 join category_dim \u540E\u5373\u53EF\u6309 big_category \u5206\u7EC4\uFF09\u3002\u8BA1\u7B97\u5B57\u6BB5\uFF1Agroup_by \u9879\u4E0E metrics.column \u53EF\u5199\u8868\u8FBE\u5F0F\u5B57\u7B26\u4E32\uFF08\u5982 "product_price * product_qty"\u3001"pay_amount / product_qty"\u3001"month(order_date)"\uFF09\u6216 {expr:"...", as:"\u522B\u540D"}\uFF1B\u652F\u6301 + - * / % ^\u3001( )\u3001==/!=/<>\u3001> >= < <=\u3001and/or/not\u3001a?b:c\u3001null/true/false \u5B57\u9762\u91CF\uFF0C\u51FD\u6570 abs/round/floor/ceil/sqrt/pow/exp/ln/log/log10/min/max/coalesce/if/year/month/quarter/day/weekday(0=\u5468\u65E5)/hour/minute/datediff(\u540E,\u524D)=\u76F8\u5DEE\u5929\u6570/date_add(\u65E5\u671F,n,\u5355\u4F4D=day|week|month|year|hour|minute)/length/concat/upper/lower\uFF1B\u7EAF\u5217\u540D\u7167\u65E7\u76F4\u63A5\u53D6\u503C\u3002\u76F8\u5BF9\u65F6\u95F4\u7B5B\u9009\uFF1Afilters[].value \u53EF\u5199\u76F8\u5BF9\u65F6\u95F4\u8BB0\u53F7\uFF08\u6E32\u67D3\u65F6\u89E3\u6790\u4E3A\u7EDD\u5BF9\u65F6\u95F4\uFF09\u2014\u2014"now"=\u5F53\u524D\u65F6\u523B\u3001"today"=\u4ECA\u5929\u3001"today-1"=\u6628\u5929\u3001"-30d"/"+7w"/"-1m"=\u76F8\u5BF9\u5F53\u524D\u504F\u79FB\uFF08\u5355\u4F4D d/w/m/y/h/min\uFF09\u3001BETWEEN \u6570\u7EC4\u9010\u9879\u89E3\u6790\u6216\u5BF9\u8C61 {relative:"-30d"}\uFF1B\u540C\u56FE\u591A\u7B5B\u9009\u5171\u7528\u540C\u4E00 now \u5FEB\u7167\uFF0C\u6BCF\u6B21\u6253\u5F00\u770B\u677F\u81EA\u52A8\u91CD\u7B97\u7A97\u53E3\uFF1B\u65E5\u671F\u5217\u7528 today \u7CFB\uFF08\u8F93\u51FA YYYY-MM-DD\uFF09\uFF0C\u65F6\u95F4\u6233\u5217\u7528 now \u7CFB\uFF08\u8F93\u51FA\u5B8C\u6574\u65F6\u523B\uFF09\u3002\n2. \u751F\u6210\u540E\uFF0C\u5DE5\u5177\u7ED3\u679C\u4F1A\u7ED9\u51FA\u672C\u6B21\u9884\u89C8ID\uFF08previewId\uFF09\u3002\u7528\u4E00\u53E5\u8BDD\u603B\u7ED3\u770B\u677F\u8981\u70B9\uFF0C\u5E76\u5728\u56DE\u590D\u3010\u6700\u540E\u3011\u8FFD\u52A0 dsh-ui \u56F4\u680F\uFF0CID \u5FC5\u987B\u4F7F\u7528\u672C\u6B21\u8FD4\u56DE\u7684 previewId\uFF08\u6BCF\u4E2A\u770B\u677F\u4E00\u4E2A\u72EC\u7ACBID\uFF0C\u4E92\u4E0D\u8986\u76D6\uFF09\uFF1A\n```\ndsh-ui\n{"kind":"dashboard","id":"<previewId>"}\n```\n3. \u7136\u540E\u8BE2\u95EE\u7528\u6237\u662F\u5426\u4FDD\u5B58\u5230\u300C\u6211\u7684\u770B\u677F\u300D\uFF0C\u786E\u8BA4\u540E\u8C03\u7528 save_dashboard \u5DE5\u5177\u3002\u4E5F\u53EF\u4EE5\u8BA9\u7528\u6237\u76F4\u63A5\u70B9\u9884\u89C8\u5361\u7247\u91CC\u6BCF\u4E2A\u56FE\u8868\u65C1\u7684\u300C\u4FDD\u5B58\u300D\u6309\u94AE\u5355\u72EC\u4FDD\u5B58\u3002' });
  const renderTool = defineTool({ name: "render_dashboard", description: "\u6839\u636E Dashboard Schema \u751F\u6210\u53EF\u4EA4\u4E92\u770B\u677F\uFF08\u53D6\u6570\u2192\u805A\u5408\u2192ECharts\uFF09\u3002\u56FE\u8868\u7C7B\u578B\u542B bar/line/area/pie/scatter/heatmap(\u53CC\u7EF4)/radar/funnel/gauge/table/text/kpi\uFF1B\u652F\u6301 join \u8DE8\u8868\u5173\u8054\uFF08\u5355\u5BF9\u8C61\u6216\u94FE\u5F0F\u6570\u7EC4\uFF0Cjoin.type=left|inner\uFF09\u3001group_by/metrics \u8868\u8FBE\u5F0F\u8BA1\u7B97\u5B57\u6BB5\uFF08\u542B hour/minute/datediff/date_add\uFF09\u4E0E\u76F8\u5BF9\u65F6\u95F4\u7B5B\u9009\u8BB0\u53F7\uFF08now/today-1/-30d/{relative}\uFF09\u3002", parameters: { schema: { type: "object", required: true, additionalProperties: true, properties: { title: { type: "string" }, description: { type: "string" }, charts: { type: "array", items: chartDef } } } }, output: { schema: { type: "object", additionalProperties: true }, render: (_a, v) => [{ type: "text", text: "\u5DF2\u751F\u6210\u770B\u677F\u300C" + (v.title || "") + "\u300D\uFF0C\u542B " + (v.chartCount || 0) + " \u4E2A\u56FE\u8868\u3002\u672C\u6B21\u9884\u89C8ID: " + (v.previewId || "") + ' \u2014\u2014 \u56DE\u590D\u672B\u5C3E\u7684 dsh-ui \u56F4\u680F\u5FC5\u987B\u5199\u6210 {"kind":"dashboard","id":"' + (v.previewId || "") + '"}\uFF08\u7528\u4E0A\u9762\u7684\u9884\u89C8ID\uFF09\u3002\u5019\u9009\u7B5B\u9009\u5B57\u6BB5: ' + ((v.filterCandidates || []).join("\u3001") || "\uFF08\u65E0\u7EF4\u5EA6\u5B57\u6BB5\uFF09") + " \u2014\u2014 \u8BF7\u5411\u7528\u6237\u786E\u8BA4\u8981\u7528\u4F5C\u7B5B\u9009\u7684\u5B57\u6BB5\uFF1B\u7528\u6237\u786E\u8BA4\u540E\u8C03\u7528 save_dashboard \u65F6\u901A\u8FC7 filter_fields \u53C2\u6570\u4F20\u5165\uFF08\u6570\u7EC4\uFF0C\u672A\u786E\u8BA4\u5219\u4E0D\u4F20\uFF09\u3002" }] }, async execute(args, exec) {
    const schema = args.schema || {};
    assertChartDefs(schema.charts, "charts[");
    let sessionId = "unknown";
    try {
      sessionId = exec.agent && exec.agent.session ? exec.agent.session.id : "unknown";
    } catch (e) {
    }
    ;
    schemaSet(sessionId, schema);
    LAST_SCHEMA = { title: schema.title || "", description: schema.description || "", schema };
    const pid = "pv" + Date.now() + Math.random().toString(36).slice(2, 6);
    const st0 = await readStore();
    st0.previews = st0.previews || {};
    st0.previews[pid] = { title: LAST_SCHEMA.title, description: LAST_SCHEMA.description, schema, created_at: (/* @__PURE__ */ new Date()).toISOString(), sessionId: String(sessionId) };
    st0.lastPreview = LAST_SCHEMA;
    const ttlMs = PREVIEW_TTL_DAYS * 864e5;
    const nowMs = Date.now();
    let entries = Object.keys(st0.previews).map(function(k) {
      return { k, at: Date.parse(st0.previews[k].created_at || "") || 0 };
    });
    entries.sort(function(a, b) {
      return b.at - a.at;
    });
    const keep = {};
    entries.forEach(function(en, i) {
      if (i < PREVIEW_MAX && nowMs - en.at <= ttlMs) keep[en.k] = st0.previews[en.k];
    });
    st0.previews = keep;
    await queueStoreWrite();
    const filterCandidates = [];
    (schema.charts || []).forEach(function(c) {
      (c.group_by || []).forEach(function(g) {
        if (typeof g === "string" && EXPR_IDENT.test(g) && filterCandidates.indexOf(g) < 0) filterCandidates.push(g);
      });
    });
    return { title: schema.title || "", chartCount: (schema.charts || []).length, previewId: pid, filterCandidates };
  } });
  ctx.tools.register(renderTool);
  const saveTool = defineTool({ name: "save_dashboard", description: "\u628A\u6700\u8FD1\u751F\u6210\u4E14\u7528\u6237\u786E\u8BA4\u7684\u770B\u677F\u4FDD\u5B58\u5230\u300C\u6211\u7684\u770B\u677F\u300D\uFF0C\u6BCF\u4E2A\u56FE\u8868\u4F5C\u4E3A\u72EC\u7ACB\u9879\u52A0\u5165\u300C\u5168\u90E8\u300D\u3002", parameters: { title: { type: "string", description: "\u770B\u677F\u540D\u79F0\uFF0C\u53EF\u9009" }, filter_fields: { type: "array", items: { type: "string" }, description: "\u7528\u6237\u786E\u8BA4\u7684\u7B5B\u9009\u5B57\u6BB5\uFF08\u5217\u540D\u6570\u7EC4\uFF0C\u6765\u81EA\u751F\u6210\u65F6\u7684\u5019\u9009\u7B5B\u9009\u5B57\u6BB5\uFF09" } }, output: { schema: { type: "object", additionalProperties: true }, render: (_a, v) => [{ type: "text", text: "\u5DF2\u4FDD\u5B58 " + (v.count || 0) + " \u4E2A\u56FE\u8868\u5230\u6211\u7684\u770B\u677F\u3002" }] }, async execute(args, exec) {
    let sessionId = "unknown";
    try {
      sessionId = exec.agent && exec.agent.session ? exec.agent.session.id : "unknown";
    } catch (e) {
    }
    ;
    const schema = schemaGet(sessionId);
    if (!schema || !schema.charts || !schema.charts.length) throw new Error("\u6CA1\u6709\u53EF\u4FDD\u5B58\u7684\u770B\u677F\uFF0C\u8BF7\u5148\u751F\u6210\u770B\u677F");
    assertChartDefs(schema.charts, "charts[");
    const s = await readStore();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    var base = args.title || schema.title || "\u770B\u677F";
    (schema.charts || []).forEach(function(c, i) {
      const ff = Array.isArray(args.filter_fields) ? args.filter_fields.filter(function(f) {
        return (c.group_by || []).indexOf(f) >= 0;
      }) : null;
      if (s.layout_custom) {
        s.charts.unshift({ id: String(Date.now()) + "-" + i, title: c.title || base + " " + (i + 1), type: c.type, chart_def: c, view_ids: [1], created_at: now, session_id: String(sessionId), filterable: ff && ff.length ? ff : void 0 });
      } else {
        s.charts.push({ id: String(Date.now()) + "-" + i, title: c.title || base + " " + (i + 1), type: c.type, chart_def: c, view_ids: [1], created_at: now, session_id: String(sessionId) });
      }
    });
    await queueStoreWrite();
    return { count: (schema.charts || []).length, saved: true };
  } });
  ctx.tools.register(saveTool);
  biApi["bi.renderLatest"] = async (args) => {
    let src = null;
    const pid = args && args.id;
    if (pid) {
      try {
        const st = await readStore();
        const pv = (st.previews || {})[String(pid)];
        if (pv && pv.schema) src = pv;
      } catch (e) {
      }
    }
    if (!src) {
      try {
        const st = await readStore();
        if (st.lastPreview && st.lastPreview.schema) src = st.lastPreview;
      } catch (e) {
      }
    }
    if (!src) src = LAST_SCHEMA;
    if (!src) {
      try {
        const st = await readStore();
        const rec = (st.dashboards || [])[0];
        if (rec && rec.schema) src = { title: rec.title, description: rec.description || "", schema: rec.schema };
      } catch (e) {
      }
    }
    if (!src) return { error: "none" };
    const out = [];
    for (const ch of src.schema.charts || []) {
      const r = await renderChartDef(ctx, ch);
      const item = { type: r.type, title: r.title };
      if (r.option !== void 0) item.option = r.option;
      if (r.text !== void 0) item.text = r.text;
      out.push(item);
    }
    const result = { title: src.title, charts: out };
    if (pid !== void 0 && pid !== null && pid !== "") result.previewId = String(pid);
    return result;
  };
  biApi["bi.listPreviewIds"] = async (args) => {
    try {
      const st = await readStore();
      const sid = args && args.sessionId ? String(args.sessionId) : null;
      let arr = Object.keys(st.previews || {}).map(function(k) {
        const r = st.previews[k];
        return { id: k, at: r.created_at || "", sid: r.sessionId || null };
      });
      if (sid !== null) {
        const mine = arr.filter(function(x) {
          return x.sid === sid;
        });
        if (mine.length > 0) arr = mine;
      }
      arr.sort(function(a, b) {
        return a.at < b.at ? -1 : a.at > b.at ? 1 : 0;
      });
      return { ids: arr.map(function(x) {
        return x.id;
      }) };
    } catch (e) {
      return { ids: [] };
    }
  };
  biApi["bi.saveChartFromPreview"] = async (args) => {
    let src = null;
    const pid = args && args.id;
    if (pid) {
      try {
        const st = await readStore();
        const pv = (st.previews || {})[String(pid)];
        if (pv && pv.schema) src = pv;
      } catch (e) {
      }
    }
    if (!src) src = LAST_SCHEMA;
    if (!src) {
      try {
        const st = await readStore();
        if (st.lastPreview && st.lastPreview.schema) src = st.lastPreview;
      } catch (e) {
      }
    }
    const idx = Number(args && args.index);
    const cd = src && src.schema && Array.isArray(src.schema.charts) ? src.schema.charts[idx] : null;
    if (!cd) return { error: "not found" };
    const cdErrs = validateChartDef(cd, "\u9884\u89C8\u56FE\u8868");
    if (cdErrs.length) return { error: "\u56FE\u8868\u5B9A\u4E49\u6821\u9A8C\u5931\u8D25\uFF1A\n- " + cdErrs.join("\n- ") };
    const s = await readStore();
    const id = String(Date.now()) + "-p" + idx;
    const rec = { id, title: cd.title || "\u56FE\u8868 " + idx, type: cd.type, chart_def: cd, view_ids: [1], created_at: (/* @__PURE__ */ new Date()).toISOString(), session_id: String(args && args.sessionId || "") };
    if (s.layout_custom) {
      s.charts.unshift(rec);
    } else {
      s.charts.push(rec);
    }
    await queueStoreWrite();
    return { ok: true, id };
  };
  biApi["bi.duplicateChart"] = async (args) => {
    const s = await readStore();
    const c = (s.charts || []).find(function(x) {
      return x.id === String(args.id);
    });
    if (!c) return { error: "not found" };
    const id = String(Date.now()) + "-c";
    const rec = { id, title: (c.title || "\u56FE\u8868") + " \u526F\u672C", type: c.type, chart_def: JSON.parse(JSON.stringify(c.chart_def)), view_ids: (c.view_ids || [1]).slice(), created_at: (/* @__PURE__ */ new Date()).toISOString(), session_id: c.session_id || "" };
    if (s.layout_custom) {
      s.charts.unshift(rec);
    } else {
      s.charts.push(rec);
    }
    await queueStoreWrite();
    return { ok: true, id };
  };
  biApi["bi.setupChartModificationBranch"] = async (args) => {
    const sid = String(args && args.sessionId || "");
    if (!sid) return { error: "sessionId \u7F3A\u5931" };
    const title = String(args && args.chartTitle || "\u56FE\u8868").slice(0, 40);
    const change = String(args && args.change || "");
    const msg = "\u7528\u6237\u8BF7\u6C42\u4FEE\u6539\u56FE\u8868\u300C" + title + "\u300D\uFF08id: " + String(args && args.chartId || "") + "\uFF0C\u7C7B\u578B: " + String(args && args.chartType || "") + "\uFF09" + (change ? "\uFF1A" + change : "\u3002\u8BF7\u5148\u8BE2\u95EE\u7528\u6237\u60F3\u5982\u4F55\u4FEE\u6539\uFF08\u6307\u6807/\u7EF4\u5EA6/\u65F6\u95F4\u8303\u56F4/\u56FE\u8868\u7C7B\u578B\u7B49\uFF09\uFF0C\u786E\u8BA4\u540E\u7528 modify_chart \u5DE5\u5177\u4FDD\u5B58\u65B0\u5B9A\u4E49\u3002");
    const agents = ctx.get("agents");
    const sessions = ctx.get("sessions");
    const titleSvc = ctx.get("sessionTitle");
    if (agents) {
      let agent = null;
      for (let i = 0; i < 10 && !agent; i++) {
        agent = agents.get(sid);
        if (!agent) {
          try {
            await ctx.get("timer").timeout(400);
          } catch (e) {
            break;
          }
        }
      }
      if (agent) {
        try {
          agent.followup({ role: "user", content: [{ type: "text", text: msg }], source: { kind: "user" } });
        } catch (e) {
          return { error: String(e) };
        }
      } else {
        return { error: "agent not ready" };
      }
    }
    if (titleSvc && sessions) {
      try {
        const sess = sessions.get(sid);
        if (sess) titleSvc.rename(sess, "\u4FEE\u6539\u56FE\u8868\u300C" + title + "\u300D");
      } catch (e) {
      }
    }
    return { ok: true };
  };
  biApi["bi.listViews"] = async (args) => {
    const s = await readStore();
    return (s.views || []).map(function(v) {
      var cnt = (s.charts || []).filter(function(c) {
        return (c.view_ids || []).indexOf(v.id) >= 0;
      }).length;
      return { id: v.id, name: v.name, count: cnt };
    });
  };
  biApi["bi.createView"] = async (args) => {
    const s = await readStore();
    if (!args.name || !String(args.name).trim()) return { error: "\u89C6\u56FE\u540D\u4E0D\u80FD\u4E3A\u7A7A" };
    const id = Date.now();
    s.views.push({ id, name: String(args.name).trim(), created_at: (/* @__PURE__ */ new Date()).toISOString() });
    await queueStoreWrite();
    return { id, name: String(args.name).trim() };
  };
  biApi["bi.renameView"] = async (args) => {
    const s = await readStore();
    const v = (s.views || []).find(function(x) {
      return x.id === Number(args.id);
    });
    if (!v) return { error: "\u89C6\u56FE\u4E0D\u5B58\u5728" };
    if (v.id === 1) return { error: "\u300C\u5168\u90E8\u300D\u89C6\u56FE\u4E0D\u80FD\u91CD\u547D\u540D" };
    v.name = String(args.name || v.name);
    await queueStoreWrite();
    return { id: v.id, name: v.name };
  };
  biApi["bi.deleteView"] = async (args) => {
    const s = await readStore();
    const v = (s.views || []).find(function(x) {
      return x.id === Number(args.id);
    });
    if (!v) return { error: "\u89C6\u56FE\u4E0D\u5B58\u5728" };
    if (v.id === 1) return { error: "\u300C\u5168\u90E8\u300D\u89C6\u56FE\u4E0D\u80FD\u5220\u9664" };
    s.views = (s.views || []).filter(function(x) {
      return x.id !== Number(args.id);
    });
    (s.charts || []).forEach(function(c) {
      if (c.view_ids) c.view_ids = c.view_ids.filter(function(vid) {
        return vid !== Number(args.id);
      });
    });
    await queueStoreWrite();
    return { ok: true };
  };
  biApi["bi.listCharts"] = async (args) => {
    const s = await readStore();
    const viewId = args && args.viewId ? Number(args.viewId) : 1;
    const view = (s.views || []).find(function(v) {
      return v.id === viewId;
    });
    return { filters: view && view.filters || [], free_layout: viewId === 1 ? false : !!(view && view.free_layout), chart_pos: view && view.chart_pos || {}, layout_locked: !!s.layout_locked, charts: (s.charts || []).filter(function(c) {
      return viewId === 1 || (c.view_ids || []).indexOf(viewId) >= 0;
    }).slice().sort(function(a, b) {
      return s.layout_custom ? 0 : (b.created_at || "").localeCompare(a.created_at || "");
    }).map(function(c) {
      const defL = c.type === "kpi" ? { w: 3, h: 1 } : { w: 6, h: 2 };
      return { id: c.id, title: c.title, type: c.type, created_at: c.created_at, view_ids: c.view_ids || [1], session_id: c.session_id || "", table: c.chart_def ? c.chart_def.table : void 0, filterable: (c.filterable && c.filterable.length ? c.filterable : plainFilterCols(c.chart_def || {})).map(function(f) {
        return { column: f, label: NAME_MAP_ZH.fields[f] || f };
      }), user_filter: c.user_filter || null, layout: c.layout || defL, layout_locked: !!c.layout_locked, locked: (view && view.chart_locks || {})[c.id] };
    }) };
  };
  biApi["bi.setChartFilter"] = async (args) => {
    const s = await readStore();
    const c = (s.charts || []).find(function(x) {
      return x.id === String(args && args.id);
    });
    if (!c) return { error: "not found" };
    const f = args && args.filter;
    const OPS = ["=", "!=", ">", ">=", "<", "<=", "LIKE", "BETWEEN", "IS_NULL", "IS_NOT_NULL"];
    if (f && f.column && (OPS.indexOf(f.op) >= 0 && (f.op === "IS_NULL" || f.op === "IS_NOT_NULL" || f.op === "BETWEEN" || f.value !== void 0 && f.value !== ""))) c.user_filter = { column: String(f.column), op: f.op, value: f.value };
    else c.user_filter = null;
    await queueStoreWrite();
    return { ok: true, id: c.id, user_filter: c.user_filter };
  };
  biApi["bi.getFilterValues"] = async (args) => {
    if (!args || !args.table || !args.column) return { error: "table/column \u5FC5\u586B", values: [] };
    const table = String(args.table), col = String(args.column);
    const nullProbe = async () => {
      try {
        const nul = await getJson(ctx, "POST", "/api/query", { table, columns: [col], filters: [{ column: col, op: "IS_NULL" }], limit: 1 });
        return (nul.rows || []).length > 0;
      } catch (e) {
        return false;
      }
    };
    try {
      const data = await getJson(ctx, "GET", "/api/query/" + encodeURIComponent(table) + "/distinct/" + encodeURIComponent(col) + "?limit=100");
      if (data && Array.isArray(data.values)) {
        const vals = data.values.filter(function(v) {
          return v !== null && v !== void 0 && v !== "";
        });
        return { values: vals.slice(0, 100), has_empty: await nullProbe() };
      }
    } catch (e) {
      if (e && e.status !== 404) return { error: String(e && e.message || e), values: [] };
    }
    try {
      const data = await getJson(ctx, "POST", "/api/query", { table, columns: [col], limit: 2e5 });
      const seen = /* @__PURE__ */ new Map();
      for (const r of data.rows || []) {
        const v = r[col];
        if (v === null || v === void 0 || v === "") continue;
        const k = String(v);
        if (!seen.has(k)) seen.set(k, v);
      }
      return { values: Array.from(seen.values()).slice(0, 100), has_empty: await nullProbe() };
    } catch (e) {
      return { error: String(e && e.message || e), values: [] };
    }
  };
  biApi["bi.setViewFilter"] = async (args) => {
    const s = await readStore();
    const view = (s.views || []).find(function(v) {
      return v.id === Number(args && args.viewId);
    });
    if (!view) return { error: "view not found" };
    if (!view.filters) view.filters = [];
    const column = String(args && args.column || "");
    const op = args && args.op || "=";
    const value = args && args.value;
    view.filters = view.filters.filter(function(f) {
      return f.column !== column;
    });
    const valueless = op === "IS_NULL" || op === "IS_NOT_NULL";
    const hasVal = value !== void 0 && value !== null && value !== "" && !(Array.isArray(value) && !value.length);
    if (column && (valueless || hasVal)) view.filters.push({ column, op: valueless ? op : op || "=", value: valueless ? void 0 : value });
    await queueStoreWrite();
    return { ok: true, viewId: view.id, filters: view.filters };
  };
  biApi["bi.getChart"] = async (args) => {
    const s = await readStore();
    const c = (s.charts || []).find(function(x) {
      return x.id === args.id;
    });
    if (!c) return { error: "not found" };
    const extras = [];
    const uf = c.user_filter;
    if (uf && uf.column) {
      const uv = String(uf.value === void 0 || uf.value === null ? "" : uf.value);
      const uop = uv.startsWith("\0!") ? "!=" : uf.op || "=";
      extras.push({ column: uf.column, op: uop, value: uop === "!=" ? uv.slice(2) : uf.value });
    }
    const exs = args && args.extras || (args && args.extra ? [args.extra] : []);
    exs.forEach(function(e) {
      if (!e || !e.column) return;
      const ev = String(e.value === void 0 || e.value === null ? "" : e.value);
      const eop = ev.startsWith("\0!") ? "!=" : e.op || "=";
      extras.push({ column: e.column, op: eop, value: eop === "!=" ? ev.slice(2) : e.value });
    });
    const rendered = await renderChartDef(ctx, c.chart_def, extras);
    rendered.id = c.id;
    rendered.user_filter = c.user_filter || null;
    rendered.filterable = c.filterable && c.filterable.length ? c.filterable : plainFilterCols(c.chart_def || {}).map(function(f) {
      return { column: f, label: NAME_MAP_ZH.fields[f] || f };
    });
    rendered.table = c.chart_def ? c.chart_def.table : void 0;
    return rendered;
  };
  biApi["bi.deleteChart"] = async (args) => {
    const s = await readStore();
    const id = String(args.id);
    const viewId = Number(args.viewId || 1);
    const c = (s.charts || []).find(function(x) {
      return x.id === id;
    });
    if (!c) return { error: "not found" };
    if (viewId === 1) {
      s.charts = (s.charts || []).filter(function(x) {
        return x.id !== id;
      });
    } else {
      if (c.view_ids) c.view_ids = c.view_ids.filter(function(v) {
        return v !== viewId;
      });
    }
    ;
    await queueStoreWrite();
    return { ok: true };
  };
  biApi["bi.addChartToView"] = async (args) => {
    const s = await readStore();
    const c = (s.charts || []).find(function(x) {
      return x.id === String(args.chartId);
    });
    if (!c) return { error: "not found" };
    if (!c.view_ids) c.view_ids = [1];
    if (c.view_ids.indexOf(Number(args.viewId)) < 0) c.view_ids.push(Number(args.viewId));
    await queueStoreWrite();
    return { ok: true };
  };
  biApi["bi.getStatus"] = async (args) => {
    await cfgReady;
    const out = {};
    if (storeReadonlyError) {
      out.store_readonly = true;
      out.store_readonly_error = storeReadonlyError;
    }
    let sync = null;
    if (CFG.statusUrl) {
      let st = null;
      try {
        const t = await callApi(ctx, "GET", CFG.statusUrl + "/status.json", void 0, 5e3);
        const j = JSON.parse(t);
        if (j && typeof j === "object" && ("running" in j || "end_time" in j)) st = j;
      } catch (e) {
      }
      if (st) {
        try {
          let interval = 15;
          let last = null;
          if (CFG.crawlConfigFile) {
            try {
              const cfg = JSON.parse(await fsp.readFile(CFG.crawlConfigFile, "utf8"));
              const pc = (cfg.pipelines || {}).cloud || {};
              interval = Math.max(1, parseInt(pc.interval_minutes, 10) || 15);
              last = (cfg.last_run || {}).cloud || null;
            } catch (e2) {
            }
          }
          if (!last) last = st.end_time || null;
          if (last) {
            st.next_run_at = new Date(new Date(last).getTime() + interval * 6e4).toISOString();
          }
          st.crawl_interval_minutes = interval;
        } catch (e) {
        }
        try {
          const iv = (st.crawl_interval_minutes || 15) * 2 * 6e4;
          const end = st.end_time ? new Date(st.end_time).getTime() : 0;
          if (!end || Date.now() - end > iv) st.stale = true;
        } catch (e) {
        }
        sync = st;
      }
    }
    out.sync = sync;
    if (sync) {
      Object.assign(out, sync);
      out.offline = false;
    } else {
      out.offline = true;
    }
    return out;
  };
  biApi["bi.triggerSync"] = async (args) => await forwardStatusPost("/run");
  biApi["bi.update.check"] = async (args) => {
    try {
      return await updateCheckState(ctx);
    } catch (e) {
      return { repo: true, error: String(e && e.message || e) };
    }
  };
  biApi["bi.update.run"] = async (args) => await performUpdate(ctx);
  biApi["bi.reorderViews"] = async (args) => {
    const s = await readStore();
    const ids = (args.ids || []).map(Number);
    if (!ids.length) return { error: "ids \u4E0D\u80FD\u4E3A\u7A7A" };
    const byId = {};
    (s.views || []).forEach(function(v) {
      byId[v.id] = v;
    });
    const reordered = [];
    ids.forEach(function(id) {
      if (byId[id]) {
        reordered.push(byId[id]);
        delete byId[id];
      }
    });
    Object.keys(byId).forEach(function(id) {
      reordered.push(byId[id]);
    });
    s.views = reordered;
    await queueStoreWrite();
    return { ok: true };
  };
  const metaTool = defineTool({ name: "get_meta", description: "\u83B7\u53D6\u65E0\u4EBA\u8D85\u5E02\u6570\u636E\u5E93\u6570\u636E\u5B57\u5178\u3002", parameters: { subject: { type: "string", enum: ["tables", "relationships", "columns"] }, table: { type: "string" } }, output: { schema: { type: "object", additionalProperties: true }, render: (_a, v) => [{ type: "text", text: JSON.stringify(v, null, 2) }] }, async execute(args, exec) {
    const subject = args.subject || "tables";
    if (subject === "relationships") return await getJson(ctx, "GET", "/api/meta/relationships");
    if (subject === "columns") {
      if (!args.table) throw new Error("\u9700\u8981 table");
      return await getJson(ctx, "GET", "/api/meta/table/" + encodeURIComponent(args.table));
    }
    return await getJson(ctx, "GET", "/api/meta/tables");
  } });
  ctx.tools.register(metaTool);
  const queryTool = defineTool({ name: "query_data", description: "\u67E5\u8BE2\u65E0\u4EBA\u8D85\u5E02\u6570\u636E\u5E93\u539F\u59CB\u6570\u636E\u3002", parameters: { table: { type: "string", required: true }, columns: { type: "array", items: { type: "string" } }, filters: { type: "array", items: filterItem }, order_by: { type: "array", items: { type: "object", additionalProperties: true, properties: { column: { type: "string", required: true }, desc: { type: "boolean" } } } }, limit: { type: "integer" }, offset: { type: "integer" } }, output: { schema: { type: "object", additionalProperties: true }, render: (_a, v) => [{ type: "text", text: JSON.stringify(v, null, 2) }] }, async execute(args, exec) {
    if (!args.table) throw new Error("\u9700\u8981 table \u53C2\u6570");
    const payload = { table: args.table };
    if (args.columns) payload.columns = args.columns;
    if (args.filters) payload.filters = args.filters;
    if (args.order_by) payload.order_by = args.order_by;
    payload.limit = args.limit || 20;
    payload.offset = args.offset || 0;
    return await getJson(ctx, "POST", "/api/query", payload);
  } });
  ctx.tools.register(queryTool);
  const modifyTool = defineTool({
    name: "modify_chart",
    description: "\u4FEE\u6539\u300C\u6211\u7684\u770B\u677F\u300D\u4E2D\u5DF2\u4FDD\u5B58\u56FE\u8868\u7684\u5B9A\u4E49\uFF08\u6307\u6807/\u7EF4\u5EA6/\u65F6\u95F4\u8303\u56F4/\u56FE\u8868\u7C7B\u578B/join \u8DE8\u8868\u5173\u8054/\u8868\u8FBE\u5F0F\u8BA1\u7B97\u5B57\u6BB5\u7B49\uFF09\u3002",
    parameters: { id: { type: "string", required: true, description: "\u8981\u4FEE\u6539\u7684\u56FE\u8868 id" }, chart_def: chartDef },
    output: { schema: { type: "object", additionalProperties: true }, render: (_a, v) => [{ type: "text", text: "\u5DF2\u4FEE\u6539\u56FE\u8868\u300C" + (v.title || "") + "\u300D(" + (v.type || "") + ")\u3002" }] },
    async execute(args, exec) {
      const s = await readStore();
      const c = (s.charts || []).find(function(x) {
        return x.id === String(args.id);
      });
      if (!c) throw new Error("\u56FE\u8868\u4E0D\u5B58\u5728: " + args.id);
      const def = args.chart_def || {};
      const verrs = validateChartDef(def, "chart_def");
      if (verrs.length) throw new Error("\u56FE\u8868\u5B9A\u4E49\u6821\u9A8C\u5931\u8D25\uFF1A\n- " + verrs.join("\n- "));
      pushUndo(s);
      c.chart_def = def;
      c.title = def.title;
      c.type = def.type;
      await queueStoreWrite();
      return { ok: true, id: c.id, title: def.title, type: def.type };
    }
  });
  ctx.tools.register(modifyTool);
  ctx.effect(() => ctx.commands.register(createBiUpdateCommand(ctx)));
  ctx.effect(() => ctx.commands.register(createBiCreateCommand()));
  biApi["bi.triggerLogin"] = async (args) => await forwardStatusPost("/runlogin");
  biApi["bi.triggerFeishuSync"] = async (args) => await forwardStatusPost("/runfeishu");
  biApi["bi.setChartLayout"] = async (args) => {
    const s = await readStore();
    const c = (s.charts || []).find(function(x) {
      return x.id === String(args && args.id);
    });
    if (!c) return { error: "not found" };
    pushUndo(s);
    const w = Math.max(1, Math.min(12, parseInt(args && args.w, 10) || 6));
    const h = Math.max(1, Math.min(6, parseInt(args && args.h, 10) || 2));
    c.layout = { w, h };
    s.layout_custom = true;
    await queueStoreWrite();
    return { ok: true, id: c.id, layout: c.layout };
  };
  biApi["bi.setChartLayoutLock"] = async (args) => {
    const s = await readStore();
    const c = (s.charts || []).find(function(x) {
      return x.id === String(args && args.id);
    });
    if (!c) return { error: "not found" };
    pushUndo(s);
    c.layout_locked = !!args.locked;
    await queueStoreWrite();
    return { ok: true, id: c.id, layout_locked: c.layout_locked };
  };
  biApi["bi.setLayoutLock"] = async (args) => {
    const s = await readStore();
    pushUndo(s);
    const v = !!args.locked;
    s.layout_locked = v;
    (s.views || []).forEach(function(view) {
      if (!view.chart_locks) view.chart_locks = {};
      (s.charts || []).forEach(function(c) {
        if ((c.view_ids || [1]).indexOf(view.id) >= 0) view.chart_locks[c.id] = v;
      });
    });
    await queueStoreWrite();
    return { ok: true, layout_locked: s.layout_locked };
  };
  biApi["bi.reorderCharts"] = async (args) => {
    const s = await readStore();
    const ids = (args && args.ids || []).map(String);
    if (!ids.length) return { error: "ids \u5FC5\u586B" };
    pushUndo(s);
    const byId = {};
    (s.charts || []).forEach(function(c) {
      byId[c.id] = c;
    });
    const head = [];
    const rest = [];
    ids.forEach(function(id) {
      if (byId[id]) {
        head.push(byId[id]);
        delete byId[id];
      }
    });
    Object.keys(byId).forEach(function(k) {
      rest.push(byId[k]);
    });
    s.charts = head.concat(rest);
    s.layout_custom = true;
    await queueStoreWrite();
    return { ok: true, order: s.charts.map(function(c) {
      return c.id;
    }) };
  };
  biApi["bi.setFreeLayout"] = async (args) => {
    const s = await readStore();
    const viewId = Number(args && args.viewId);
    if (viewId === 1) return { error: "\u300C\u5168\u90E8\u300D\u89C6\u56FE\u4FDD\u6301\u4E09\u5217\u5F0F\uFF0C\u4E0D\u652F\u6301\u81EA\u7531\u5E03\u5C40" };
    const view = (s.views || []).find(function(v) {
      return v.id === viewId;
    });
    if (!view) return { error: "view not found" };
    pushUndo(s);
    view.free_layout = !!args.enabled;
    if (!args.enabled) view.chart_pos = {};
    else if (args.posMap && typeof args.posMap === "object") {
      const clean = {};
      Object.keys(args.posMap).forEach(function(k) {
        const p = args.posMap[k] || {};
        clean[String(k)] = { x: Math.max(0, Math.round(p.x || 0)), y: Math.max(0, Math.round(p.y || 0)), w: Math.max(120, Math.round(p.w || 300)), h: Math.max(80, Math.round(p.h || 200)) };
      });
      if (Object.keys(clean).length) view.chart_pos = clean;
    }
    await queueStoreWrite();
    return { ok: true, viewId, free_layout: view.free_layout };
  };
  biApi["bi.setChartPos"] = async (args) => {
    const s = await readStore();
    const viewId = Number(args && args.viewId);
    if (viewId === 1) return { error: "\u300C\u5168\u90E8\u300D\u89C6\u56FE\u4FDD\u6301\u4E09\u5217\u5F0F" };
    const view = (s.views || []).find(function(v) {
      return v.id === viewId;
    });
    if (!view) return { error: "view not found" };
    pushUndo(s);
    if (!view.chart_pos) view.chart_pos = {};
    const pos = args && args.pos || {};
    view.chart_pos[String(args.chartId)] = { x: Math.max(0, Math.round(pos.x || 0)), y: Math.max(0, Math.round(pos.y || 0)), w: Math.max(80, Math.round(pos.w || 300)), h: Math.max(60, Math.round(pos.h || 240)) };
    view.free_layout = true;
    await queueStoreWrite();
    return { ok: true, pos: view.chart_pos[String(args.chartId)] };
  };
  biApi["bi.clearChartPos"] = async (args) => {
    const s = await readStore();
    const view = (s.views || []).find(function(v) {
      return v.id === Number(args && args.viewId);
    });
    if (!view) return { error: "view not found" };
    const id = String(args && args.chartId);
    if (!view.chart_pos || !view.chart_pos[id]) return { ok: true, cleared: false };
    pushUndo(s);
    delete view.chart_pos[id];
    await queueStoreWrite();
    return { ok: true, cleared: true };
  };
  biApi["bi.setChartLockToggle"] = async (args) => {
    const s = await readStore();
    const view = (s.views || []).find(function(v) {
      return v.id === Number(args && args.viewId);
    });
    if (!view) return { error: "view not found" };
    pushUndo(s);
    if (!view.chart_locks) view.chart_locks = {};
    const id = String(args && args.chartId);
    view.chart_locks[id] = args && args.locked !== void 0 ? !!args.locked : !view.chart_locks[id];
    await queueStoreWrite();
    return { ok: true, chartId: id, locked: view.chart_locks[id] };
  };
  biApi["bi.resetViewLayout"] = async (args) => {
    const s = await readStore();
    const view = (s.views || []).find(function(v) {
      return v.id === Number(args && args.viewId);
    });
    if (!view) return { error: "view not found" };
    pushUndo(s);
    view.free_layout = false;
    view.chart_pos = {};
    view.chart_locks = {};
    s.charts = (s.charts || []).slice().sort(function(a, b) {
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
    await queueStoreWrite();
    return { ok: true, viewId: view.id, free_layout: false };
  };
  biApi["bi.undoLayout"] = async (args) => {
    const s = await readStore();
    const stack = s.undo_stack || [];
    if (!stack.length) return { ok: false, reason: "\u6CA1\u6709\u53EF\u64A4\u9500\u7684\u5E03\u5C40\u64CD\u4F5C" };
    const entry = stack[stack.length - 1];
    const snap = entry && entry.snap;
    if (!snap) return { ok: false, reason: "\u5FEB\u7167\u635F\u574F" };
    s.undo_stack = stack.slice(0, -1);
    s.layout_locked = !!snap.layout_locked;
    const byId = {};
    (s.charts || []).forEach(function(c) {
      byId[c.id] = c;
    });
    const ordered = [];
    (snap.charts || []).forEach(function(cc) {
      const c = byId[cc.id];
      if (!c) return;
      if (cc.layout) c.layout = { w: cc.layout.w, h: cc.layout.h };
      else delete c.layout;
      c.layout_locked = !!cc.layout_locked;
      if (cc.def != null) {
        c.chart_def = JSON.parse(JSON.stringify(cc.def));
        if (cc.title != null) c.title = cc.title;
        if (cc.type) c.type = cc.type;
      }
      ordered.push(c);
      delete byId[cc.id];
    });
    Object.keys(byId).forEach(function(k) {
      ordered.push(byId[k]);
    });
    s.charts = ordered;
    (snap.views || []).forEach(function(vv) {
      const v = (s.views || []).find(function(x) {
        return x.id === vv.id;
      });
      if (!v) return;
      v.free_layout = !!vv.free_layout;
      v.chart_pos = JSON.parse(JSON.stringify(vv.chart_pos || {}));
      v.chart_locks = JSON.parse(JSON.stringify(vv.chart_locks || {}));
    });
    await queueStoreWrite();
    return { ok: true, undoneAt: entry.at };
  };
  biApi["bi.getTableConfig"] = async (args) => {
    let tables = [];
    let unreachable = false;
    let lastErr = "";
    try {
      const r = await getJson(ctx, "GET", "/api/settings/tables", void 0, 8e3);
      tables = (r.tables || []).map(function(t) {
        const m = NAME_MAP_ZH.tables[t.table];
        return m ? Object.assign({}, t, { title: t.title || m.zh, description: t.description || m.desc }) : t;
      });
    } catch (e) {
      unreachable = true;
      lastErr = String(e.message || e).slice(0, 120);
    }
    let pipelines = {};
    try {
      const cfg = JSON.parse(await fsp.readFile(CFG.crawlConfigFile, "utf8"));
      pipelines = cfg.pipelines || {};
    } catch (e) {
      pipelines = {};
    }
    return { tables, pipelines: unreachable ? {} : pipelines, unreachable, error: unreachable ? "\u6570\u636E\u670D\u52A1\u4E0D\u53EF\u8FBE\uFF1A" + lastErr : void 0 };
  };
  biApi["bi.setTableAccess"] = async (args) => {
    if (!args || !args.table) return { error: "table \u5FC5\u586B" };
    return await getJson(ctx, "POST", "/api/settings/tables", { table: String(args.table), accessible: !!args.accessible }, 8e3);
  };
  const CRAWL_PIPELINES = ["cloud", "shelf", "standard_qty", "procurement"];
  biApi["bi.setCrawlFrequency"] = async (args) => {
    if (!args || !args.pipeline) return { error: "pipeline \u5FC5\u586B" };
    const pipeline = String(args.pipeline);
    if (CRAWL_PIPELINES.indexOf(pipeline) < 0) return { error: "\u672A\u77E5\u7BA1\u9053: " + pipeline + "\uFF08\u5141\u8BB8: " + CRAWL_PIPELINES.join(", ") + "\uFF09" };
    if (!CFG.crawlConfigFile) return { error: "\u672A\u914D\u7F6E\u722C\u866B\uFF08crawlConfigFile \u4E3A\u7A7A\uFF0C\u4EC5\u6570\u636E\u6D4F\u89C8\u53EF\u7528\uFF09" };
    const minutes = Math.max(1, parseInt(args.minutes, 10) || 15);
    let raw = "";
    try {
      raw = await fsp.readFile(CFG.crawlConfigFile, "utf8");
    } catch (e) {
      return { error: "\u722C\u866B\u914D\u7F6E\u8BFB\u53D6\u5931\u8D25\uFF0C\u5DF2\u62D2\u7EDD\u5199\u5165: " + String(e && e.message || e) };
    }
    let cfg = {};
    try {
      cfg = JSON.parse(raw || "{}");
    } catch (e) {
      return { error: "\u722C\u866B\u914D\u7F6E JSON \u635F\u574F\uFF0C\u5DF2\u62D2\u7EDD\u5199\u5165: " + String(e && e.message || e) };
    }
    if (!cfg.pipelines || typeof cfg.pipelines !== "object") cfg.pipelines = {};
    if (!cfg.pipelines[pipeline] || typeof cfg.pipelines[pipeline] !== "object") cfg.pipelines[pipeline] = {};
    cfg.pipelines[pipeline].interval_minutes = minutes;
    try {
      await fsp.writeFile(CFG.crawlConfigFile + ".bak", raw);
      const tmp = CFG.crawlConfigFile + ".tmp-" + process.pid + "-" + Date.now();
      try {
        await fsp.writeFile(tmp, JSON.stringify(cfg, null, 2));
        await fsp.rename(tmp, CFG.crawlConfigFile);
      } catch (e) {
        try {
          await fsp.unlink(tmp);
        } catch (e2) {
        }
        ;
        throw e;
      }
    } catch (e) {
      return { error: "\u722C\u866B\u914D\u7F6E\u5199\u5165\u5931\u8D25: " + String(e && e.message || e) };
    }
    return { ok: true, pipeline, interval_minutes: minutes };
  };
  biApi["bi.getConfig"] = async () => {
    await cfgReady;
    return { dataApi: CFG.dataApi, statusUrl: CFG.statusUrl };
  };
  biApi["bi.setConfig"] = async (args) => {
    args = args || {};
    const upd = {};
    const normUrl = (raw, defPort) => {
      let v = String(raw).trim().replace(/\/+$/, "");
      if (!/^https?:\/\//i.test(v)) v = "http://" + v;
      try {
        if (!new URL(v).port) v = v + ":" + defPort;
      } catch (e) {
        return null;
      }
      return v;
    };
    if (args.dataApi !== void 0) {
      const v = normUrl(args.dataApi, 8600);
      if (!v) return { error: "\u6570\u636E\u670D\u52A1\u5730\u5740\u683C\u5F0F\u65E0\u6548" };
      upd.dataApi = v;
    }
    if (args.statusUrl !== void 0) {
      const v = normUrl(args.statusUrl, 8080);
      if (!v) return { error: "\u72B6\u6001\u670D\u52A1\u5730\u5740\u683C\u5F0F\u65E0\u6548" };
      upd.statusUrl = v;
    }
    if (!Object.keys(upd).length) return { error: "\u65E0\u53D8\u66F4" };
    await cfgReady;
    Object.assign(CFG, upd);
    try {
      const f0 = ctx.get("fs");
      if (f0) {
        const t = await f0.resolve(PERSIST_DIR + "/config.json");
        let cur = {};
        try {
          cur = JSON.parse(await f0.readText(t) || "{}");
        } catch (e) {
        }
        const toRel = (v) => v && v.indexOf(PERSIST_DIR + "/") === 0 ? v.slice(PERSIST_DIR.length + 1) : v || "";
        const next = Object.assign({}, cur, upd, { vendorFile: toRel(CFG.vendorFile), storeFile: toRel(CFG.storeFile), crawlConfigFile: toRel(CFG.crawlConfigFile) });
        await f0.writeText(t, JSON.stringify(next, null, 2));
      }
    } catch (e) {
    }
    return { ok: true, dataApi: CFG.dataApi, statusUrl: CFG.statusUrl };
  };
  biApi["bi.testConnection"] = async (args) => {
    const raw = String(args && args.url || "").trim().replace(/\/+$/, "");
    if (!/^https?:\/\//.test(raw)) return { ok: false, error: "\u5730\u5740\u9700\u4EE5 http:// \u6216 https:// \u5F00\u5934" };
    try {
      const r = await fetch(toIpv4Localhost(raw + "/api/meta/tables"), { signal: AbortSignal.timeout(5e3) });
      if (!r.ok) return { ok: false, error: "HTTP " + r.status };
      const j = await r.json();
      return { ok: true, tables: (j.tables || []).length };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e).slice(0, 200) };
    }
  };
  biApi["bi.testStatus"] = async (args) => {
    const raw = String(args && args.url || "").trim().replace(/\/+$/, "");
    if (!/^https?:\/\//.test(raw)) return { ok: false, error: "\u5730\u5740\u9700\u4EE5 http:// \u6216 https:// \u5F00\u5934" };
    const t0 = Date.now();
    try {
      const r = await fetch(toIpv4Localhost(raw + "/status.json"), { signal: AbortSignal.timeout(5e3) });
      if (!r.ok) return { ok: false, error: "HTTP " + r.status };
      const j = await r.json();
      return { ok: true, ms: Date.now() - t0, running: !!(j && j.running) };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e).slice(0, 200) };
    }
  };
  biApi["bi.ping"] = async () => {
    await cfgReady;
    const t0 = Date.now();
    const url = String(CFG.dataApi || "").trim().replace(/\/+$/, "");
    if (!url) return { ok: false, error: "\u672A\u914D\u7F6E\u6570\u636E\u4E3B\u673A\u5730\u5740", ms: Date.now() - t0 };
    try {
      const r = await fetch(toIpv4Localhost(url + "/health"), { signal: AbortSignal.timeout(4e3) });
      if (!r.ok) return { ok: false, error: "HTTP " + r.status, ms: Date.now() - t0 };
      let j = null;
      try {
        j = await r.json();
      } catch (e) {
      }
      ;
      if (j && j.status && j.status !== "ok") return { ok: false, error: "unhealthy: " + String(j.status), ms: Date.now() - t0 };
      return { ok: true, ms: Date.now() - t0 };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e).slice(0, 200), ms: Date.now() - t0 };
    }
  };
  console.log("[bi] Phase5 Host \u5DF2\u52A0\u8F7D (static v1)");
  if (ws) ctx.effect(() => ws.register({ kind: "exact", path: "/bi/api", handler: async (req, res) => {
    await cfgReady;
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "method not allowed" }));
      return;
    }
    const MAX_BODY_BYTES = 1024 * 1024;
    const chunks = [];
    let received = 0;
    let tooLarge = false;
    try {
      for await (const chunk of req) {
        received += chunk.length;
        if (received > MAX_BODY_BYTES) {
          tooLarge = true;
          break;
        }
        chunks.push(chunk);
      }
    } catch (e) {
    }
    if (tooLarge) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "request body too large (>1MB)" }));
      return;
    }
    const body = Buffer.concat(chunks).toString("utf8");
    let parsed = {};
    try {
      parsed = JSON.parse(body || "{}");
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "bad json" }));
      return;
    }
    const m = String(parsed.m || "");
    const fn = biApi[m];
    if (!fn) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "no such method: " + m }));
      return;
    }
    try {
      const result = await fn(parsed.args || {});
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(e && e.message || e) }));
    }
  } }));
} };
export {
  aggregate,
  buildOption,
  currentNow,
  index_default as default,
  heatColor,
  neededColumns,
  renderChartDef,
  resolveRelToken,
  setNowProvider,
  validateChartDef
};
