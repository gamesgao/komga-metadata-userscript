// dist/sqlite/index.mjs
/* @preserve
**
** LICENSE for the sqlite3 WebAssembly/JavaScript APIs.
**
** This bundle (typically released as sqlite3.js or sqlite3.mjs)
** is an amalgamation of JavaScript source code from two projects:
**
** 1) https://emscripten.org: the Emscripten "glue code" is covered by
**    the terms of the MIT license and University of Illinois/NCSA
**    Open Source License, as described at:
**
**    https://emscripten.org/docs/introducing_emscripten/emscripten_license.html
**
** 2) https://sqlite.org: all code and documentation labeled as being
**    from this source are released under the same terms as the sqlite3
**    C library:
**
** 2022-10-16
**
** The author disclaims copyright to this source code.  In place of a
** legal notice, here is a blessing:
**
** *   May you do good and not evil.
** *   May you find forgiveness for yourself and forgive others.
** *   May you share freely, never taking more than you give.
*/
/* @preserve
** This code was built from sqlite3 version...
**
** SQLITE_VERSION "3.54.1"
** SQLITE_VERSION_NUMBER 3054001
** SQLITE_SOURCE_ID "2026-10-16 14:45:20 555e07ef33f69a0957d24d8e555b702464a131d6f1607f4c3c1e4551e8e6ca76"
**
** Emscripten SDK: 5.0.5
*/
async function sqlite3InitModule$1(moduleArg = {}) {
  var moduleRtn;
  var Module = moduleArg;
  var ENVIRONMENT_IS_WEB = !!globalThis.window;
  var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;
  globalThis.process?.versions?.node && globalThis.process?.type;
  var thisProgram = "./this.program";
  var _scriptName = import.meta.url;
  var scriptDirectory = "";
  function locateFile(path) {
    if (Module["locateFile"]) return Module["locateFile"](path, scriptDirectory);
    return scriptDirectory + path;
  }
  var readAsync, readBinary;
  if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    try {
      scriptDirectory = new URL(".", _scriptName).href;
    } catch {
    }
    if (ENVIRONMENT_IS_WORKER) readBinary = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.responseType = "arraybuffer";
      xhr.send(null);
      return new Uint8Array(xhr.response);
    };
    readAsync = async (url) => {
      var response = await fetch(url, { credentials: "same-origin" });
      if (response.ok) return response.arrayBuffer();
      throw new Error(response.status + " : " + response.url);
    };
  }
  var out = console.log.bind(console);
  var err2 = console.error.bind(console);
  var wasmBinary2;
  var ABORT = false;
  var readyPromiseResolve, readyPromiseReject;
  var runtimeInitialized = false;
  function updateMemoryViews() {
    var b2 = wasmMemory.buffer;
    HEAP8 = new Int8Array(b2);
    HEAP16 = new Int16Array(b2);
    HEAPU8 = new Uint8Array(b2);
    HEAPU16 = new Uint16Array(b2);
    HEAP32 = new Int32Array(b2);
    HEAPU32 = new Uint32Array(b2);
    HEAPF32 = new Float32Array(b2);
    HEAPF64 = new Float64Array(b2);
    HEAP64 = new BigInt64Array(b2);
    HEAPU64 = new BigUint64Array(b2);
  }
  function initMemory() {
    if (Module["wasmMemory"]) wasmMemory = Module["wasmMemory"];
    else {
      var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 8388608;
      wasmMemory = new WebAssembly.Memory({
        "initial": INITIAL_MEMORY / 65536,
        "maximum": 32768
      });
    }
    updateMemoryViews();
  }
  function preRun() {
    if (Module["preRun"]) {
      if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
      while (Module["preRun"].length) addOnPreRun(Module["preRun"].shift());
    }
    callRuntimeCallbacks(onPreRuns);
  }
  function initRuntime() {
    runtimeInitialized = true;
    if (!Module["noFSInit"] && !FS.initialized) FS.init();
    TTY.init();
    wasmExports["__wasm_call_ctors"]();
    FS.ignorePermissions = false;
  }
  function postRun() {
    if (Module["postRun"]) {
      if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
      while (Module["postRun"].length) addOnPostRun(Module["postRun"].shift());
    }
    callRuntimeCallbacks(onPostRuns);
  }
  function abort2(what) {
    Module["onAbort"]?.(what);
    what = `Aborted(${what})`;
    err2(what);
    ABORT = true;
    what += ". Build with -sASSERTIONS for more info.";
    var e4 = new WebAssembly.RuntimeError(what);
    readyPromiseReject?.(e4);
    throw e4;
  }
  var wasmBinaryFile;
  function findWasmBinary() {
    if (Module["locateFile"]) return locateFile("sqlite3.wasm");
    return new URL("sqlite3.wasm", import.meta.url).href;
  }
  function getBinarySync(file) {
    if (file == wasmBinaryFile && wasmBinary2) return new Uint8Array(wasmBinary2);
    if (readBinary) return readBinary(file);
    throw "both async and sync fetching of the wasm failed";
  }
  async function getWasmBinary(binaryFile) {
    if (!wasmBinary2) try {
      var response = await readAsync(binaryFile);
      return new Uint8Array(response);
    } catch {
    }
    return getBinarySync(binaryFile);
  }
  async function instantiateArrayBuffer(binaryFile, imports) {
    try {
      var binary = await getWasmBinary(binaryFile);
      return await WebAssembly.instantiate(binary, imports);
    } catch (reason) {
      err2(`failed to asynchronously prepare wasm: ${reason}`);
      abort2(reason);
    }
  }
  async function instantiateAsync(binary, binaryFile, imports) {
    if (!binary) try {
      var response = fetch(binaryFile, { credentials: "same-origin" });
      return await WebAssembly.instantiateStreaming(response, imports);
    } catch (reason) {
      err2(`wasm streaming compile failed: ${reason}`);
      err2("falling back to ArrayBuffer instantiation");
    }
    return instantiateArrayBuffer(binaryFile, imports);
  }
  function getWasmImports() {
    return {
      "env": wasmImports,
      "wasi_snapshot_preview1": wasmImports
    };
  }
  async function createWasm() {
    function receiveInstance(instance, module) {
      wasmExports = instance.exports;
      assignWasmExports(wasmExports);
      return wasmExports;
    }
    function receiveInstantiationResult(result) {
      return receiveInstance(result["instance"]);
    }
    var info = getWasmImports();
    if (Module["instantiateWasm"]) return new Promise((resolve, reject) => {
      Module["instantiateWasm"](info, (inst, mod) => {
        resolve(receiveInstance(inst, mod));
      });
    });
    wasmBinaryFile ??= findWasmBinary();
    return receiveInstantiationResult(await instantiateAsync(wasmBinary2, wasmBinaryFile, info));
  }
  var HEAP16;
  var HEAP32;
  var HEAP64;
  var HEAP8;
  var HEAPF32;
  var HEAPF64;
  var HEAPU16;
  var HEAPU32;
  var HEAPU64;
  var HEAPU8;
  var callRuntimeCallbacks = (callbacks) => {
    while (callbacks.length > 0) callbacks.shift()(Module);
  };
  var onPostRuns = [];
  var addOnPostRun = (cb) => onPostRuns.push(cb);
  var onPreRuns = [];
  var addOnPreRun = (cb) => onPreRuns.push(cb);
  var wasmMemory;
  var PATH = {
    isAbs: (path) => path.charAt(0) === "/",
    splitPath: (filename) => {
      return /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(filename).slice(1);
    },
    normalizeArray: (parts, allowAboveRoot) => {
      var up = 0;
      for (var i = parts.length - 1; i >= 0; i--) {
        var last = parts[i];
        if (last === ".") parts.splice(i, 1);
        else if (last === "..") {
          parts.splice(i, 1);
          up++;
        } else if (up) {
          parts.splice(i, 1);
          up--;
        }
      }
      if (allowAboveRoot) for (; up; up--) parts.unshift("..");
      return parts;
    },
    normalize: (path) => {
      var isAbsolute = PATH.isAbs(path), trailingSlash = path.slice(-1) === "/";
      path = PATH.normalizeArray(path.split("/").filter((p2) => !!p2), !isAbsolute).join("/");
      if (!path && !isAbsolute) path = ".";
      if (path && trailingSlash) path += "/";
      return (isAbsolute ? "/" : "") + path;
    },
    dirname: (path) => {
      var result = PATH.splitPath(path), root = result[0], dir = result[1];
      if (!root && !dir) return ".";
      if (dir) dir = dir.slice(0, -1);
      return root + dir;
    },
    basename: (path) => path && path.match(/([^\/]+|\/)\/*$/)[1],
    join: (...paths) => PATH.normalize(paths.join("/")),
    join2: (l2, r2) => PATH.normalize(l2 + "/" + r2)
  };
  var initRandomFill = () => {
    return (view) => (crypto.getRandomValues(view), 0);
  };
  var randomFill = (view) => (randomFill = initRandomFill())(view);
  var PATH_FS = {
    resolve: (...args) => {
      var resolvedPath = "", resolvedAbsolute = false;
      for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        var path = i >= 0 ? args[i] : FS.cwd();
        if (typeof path != "string") throw new TypeError("Arguments to path.resolve must be strings");
        else if (!path) return "";
        resolvedPath = path + "/" + resolvedPath;
        resolvedAbsolute = PATH.isAbs(path);
      }
      resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((p2) => !!p2), !resolvedAbsolute).join("/");
      return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
    },
    relative: (from, to) => {
      from = PATH_FS.resolve(from).slice(1);
      to = PATH_FS.resolve(to).slice(1);
      function trim(arr) {
        var start = 0;
        for (; start < arr.length; start++) if (arr[start] !== "") break;
        var end = arr.length - 1;
        for (; end >= 0; end--) if (arr[end] !== "") break;
        if (start > end) return [];
        return arr.slice(start, end - start + 1);
      }
      var fromParts = trim(from.split("/"));
      var toParts = trim(to.split("/"));
      var length = Math.min(fromParts.length, toParts.length);
      var samePartsLength = length;
      for (var i = 0; i < length; i++) if (fromParts[i] !== toParts[i]) {
        samePartsLength = i;
        break;
      }
      var outputParts = [];
      for (var i = samePartsLength; i < fromParts.length; i++) outputParts.push("..");
      outputParts = outputParts.concat(toParts.slice(samePartsLength));
      return outputParts.join("/");
    }
  };
  var UTF8Decoder = new TextDecoder();
  var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
    var maxIdx = idx + maxBytesToRead;
    if (ignoreNul) return maxIdx;
    while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
    return idx;
  };
  var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
    var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
    return UTF8Decoder.decode(heapOrArray.buffer ? heapOrArray.subarray(idx, endPtr) : new Uint8Array(heapOrArray.slice(idx, endPtr)));
  };
  var FS_stdin_getChar_buffer = [];
  var lengthBytesUTF8 = (str) => {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
      var c = str.charCodeAt(i);
      if (c <= 127) len++;
      else if (c <= 2047) len += 2;
      else if (c >= 55296 && c <= 57343) {
        len += 4;
        ++i;
      } else len += 3;
    }
    return len;
  };
  var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
      var u = str.codePointAt(i);
      if (u <= 127) {
        if (outIdx >= endIdx) break;
        heap[outIdx++] = u;
      } else if (u <= 2047) {
        if (outIdx + 1 >= endIdx) break;
        heap[outIdx++] = 192 | u >> 6;
        heap[outIdx++] = 128 | u & 63;
      } else if (u <= 65535) {
        if (outIdx + 2 >= endIdx) break;
        heap[outIdx++] = 224 | u >> 12;
        heap[outIdx++] = 128 | u >> 6 & 63;
        heap[outIdx++] = 128 | u & 63;
      } else {
        if (outIdx + 3 >= endIdx) break;
        heap[outIdx++] = 240 | u >> 18;
        heap[outIdx++] = 128 | u >> 12 & 63;
        heap[outIdx++] = 128 | u >> 6 & 63;
        heap[outIdx++] = 128 | u & 63;
        i++;
      }
    }
    heap[outIdx] = 0;
    return outIdx - startIdx;
  };
  var intArrayFromString = (stringy, dontAddNull, length) => {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array;
  };
  var FS_stdin_getChar = () => {
    if (!FS_stdin_getChar_buffer.length) {
      var result = null;
      if (globalThis.window?.prompt) {
        result = window.prompt("Input: ");
        if (result !== null) result += "\n";
      }
      if (!result) return null;
      FS_stdin_getChar_buffer = intArrayFromString(result, true);
    }
    return FS_stdin_getChar_buffer.shift();
  };
  var TTY = {
    ttys: [],
    init() {
    },
    shutdown() {
    },
    register(dev, ops) {
      TTY.ttys[dev] = {
        input: [],
        output: [],
        ops
      };
      FS.registerDevice(dev, TTY.stream_ops);
    },
    stream_ops: {
      open(stream) {
        var tty = TTY.ttys[stream.node.rdev];
        if (!tty) throw new FS.ErrnoError(43);
        stream.tty = tty;
        stream.seekable = false;
      },
      close(stream) {
        stream.tty.ops.fsync(stream.tty);
      },
      fsync(stream) {
        stream.tty.ops.fsync(stream.tty);
      },
      read(stream, buffer2, offset, length, pos) {
        if (!stream.tty || !stream.tty.ops.get_char) throw new FS.ErrnoError(60);
        var bytesRead = 0;
        for (var i = 0; i < length; i++) {
          var result;
          try {
            result = stream.tty.ops.get_char(stream.tty);
          } catch (e4) {
            throw new FS.ErrnoError(29);
          }
          if (result === void 0 && bytesRead === 0) throw new FS.ErrnoError(6);
          if (result === null || result === void 0) break;
          bytesRead++;
          buffer2[offset + i] = result;
        }
        if (bytesRead) stream.node.atime = Date.now();
        return bytesRead;
      },
      write(stream, buffer2, offset, length, pos) {
        if (!stream.tty || !stream.tty.ops.put_char) throw new FS.ErrnoError(60);
        try {
          for (var i = 0; i < length; i++) stream.tty.ops.put_char(stream.tty, buffer2[offset + i]);
        } catch (e4) {
          throw new FS.ErrnoError(29);
        }
        if (length) stream.node.mtime = stream.node.ctime = Date.now();
        return i;
      }
    },
    default_tty_ops: {
      get_char(tty) {
        return FS_stdin_getChar();
      },
      put_char(tty, val) {
        if (val === null || val === 10) {
          out(UTF8ArrayToString(tty.output));
          tty.output = [];
        } else if (val != 0) tty.output.push(val);
      },
      fsync(tty) {
        if (tty.output?.length > 0) {
          out(UTF8ArrayToString(tty.output));
          tty.output = [];
        }
      },
      ioctl_tcgets(tty) {
        return {
          c_iflag: 25856,
          c_oflag: 5,
          c_cflag: 191,
          c_lflag: 35387,
          c_cc: [
            3,
            28,
            127,
            21,
            4,
            0,
            1,
            0,
            17,
            19,
            26,
            0,
            18,
            15,
            23,
            22,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0
          ]
        };
      },
      ioctl_tcsets(tty, optional_actions, data) {
        return 0;
      },
      ioctl_tiocgwinsz(tty) {
        return [24, 80];
      }
    },
    default_tty1_ops: {
      put_char(tty, val) {
        if (val === null || val === 10) {
          err2(UTF8ArrayToString(tty.output));
          tty.output = [];
        } else if (val != 0) tty.output.push(val);
      },
      fsync(tty) {
        if (tty.output?.length > 0) {
          err2(UTF8ArrayToString(tty.output));
          tty.output = [];
        }
      }
    }
  };
  var zeroMemory = (ptr, size) => HEAPU8.fill(0, ptr, ptr + size);
  var alignMemory = (size, alignment) => {
    return Math.ceil(size / alignment) * alignment;
  };
  var mmapAlloc = (size) => {
    size = alignMemory(size, 65536);
    var ptr = _emscripten_builtin_memalign(65536, size);
    if (ptr) zeroMemory(ptr, size);
    return ptr;
  };
  var MEMFS = {
    ops_table: null,
    mount(mount) {
      return MEMFS.createNode(null, "/", 16895, 0);
    },
    createNode(parent, name, mode, dev) {
      if (FS.isBlkdev(mode) || FS.isFIFO(mode)) throw new FS.ErrnoError(63);
      MEMFS.ops_table ||= {
        dir: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr,
            lookup: MEMFS.node_ops.lookup,
            mknod: MEMFS.node_ops.mknod,
            rename: MEMFS.node_ops.rename,
            unlink: MEMFS.node_ops.unlink,
            rmdir: MEMFS.node_ops.rmdir,
            readdir: MEMFS.node_ops.readdir,
            symlink: MEMFS.node_ops.symlink
          },
          stream: { llseek: MEMFS.stream_ops.llseek }
        },
        file: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr
          },
          stream: {
            llseek: MEMFS.stream_ops.llseek,
            read: MEMFS.stream_ops.read,
            write: MEMFS.stream_ops.write,
            mmap: MEMFS.stream_ops.mmap,
            msync: MEMFS.stream_ops.msync
          }
        },
        link: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr,
            readlink: MEMFS.node_ops.readlink
          },
          stream: {}
        },
        chrdev: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr
          },
          stream: FS.chrdev_stream_ops
        }
      };
      var node = FS.createNode(parent, name, mode, dev);
      if (FS.isDir(node.mode)) {
        node.node_ops = MEMFS.ops_table.dir.node;
        node.stream_ops = MEMFS.ops_table.dir.stream;
        node.contents = {};
      } else if (FS.isFile(node.mode)) {
        node.node_ops = MEMFS.ops_table.file.node;
        node.stream_ops = MEMFS.ops_table.file.stream;
        node.usedBytes = 0;
        node.contents = MEMFS.emptyFileContents ??= /* @__PURE__ */ new Uint8Array(0);
      } else if (FS.isLink(node.mode)) {
        node.node_ops = MEMFS.ops_table.link.node;
        node.stream_ops = MEMFS.ops_table.link.stream;
      } else if (FS.isChrdev(node.mode)) {
        node.node_ops = MEMFS.ops_table.chrdev.node;
        node.stream_ops = MEMFS.ops_table.chrdev.stream;
      }
      node.atime = node.mtime = node.ctime = Date.now();
      if (parent) {
        parent.contents[name] = node;
        parent.atime = parent.mtime = parent.ctime = node.atime;
      }
      return node;
    },
    getFileDataAsTypedArray(node) {
      return node.contents.subarray(0, node.usedBytes);
    },
    expandFileStorage(node, newCapacity) {
      var prevCapacity = node.contents.length;
      if (prevCapacity >= newCapacity) return;
      newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < 1048576 ? 2 : 1.125) >>> 0);
      if (prevCapacity) newCapacity = Math.max(newCapacity, 256);
      var oldContents = MEMFS.getFileDataAsTypedArray(node);
      node.contents = new Uint8Array(newCapacity);
      node.contents.set(oldContents);
    },
    resizeFileStorage(node, newSize) {
      if (node.usedBytes == newSize) return;
      var oldContents = node.contents;
      node.contents = new Uint8Array(newSize);
      node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
      node.usedBytes = newSize;
    },
    node_ops: {
      getattr(node) {
        var attr = {};
        attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
        attr.ino = node.id;
        attr.mode = node.mode;
        attr.nlink = 1;
        attr.uid = 0;
        attr.gid = 0;
        attr.rdev = node.rdev;
        if (FS.isDir(node.mode)) attr.size = 4096;
        else if (FS.isFile(node.mode)) attr.size = node.usedBytes;
        else if (FS.isLink(node.mode)) attr.size = node.link.length;
        else attr.size = 0;
        attr.atime = new Date(node.atime);
        attr.mtime = new Date(node.mtime);
        attr.ctime = new Date(node.ctime);
        attr.blksize = 4096;
        attr.blocks = Math.ceil(attr.size / attr.blksize);
        return attr;
      },
      setattr(node, attr) {
        for (const key of [
          "mode",
          "atime",
          "mtime",
          "ctime"
        ]) if (attr[key] != null) node[key] = attr[key];
        if (attr.size !== void 0) MEMFS.resizeFileStorage(node, attr.size);
      },
      lookup(parent, name) {
        if (!MEMFS.doesNotExistError) {
          MEMFS.doesNotExistError = new FS.ErrnoError(44);
          MEMFS.doesNotExistError.stack = "<generic error, no stack>";
        }
        throw MEMFS.doesNotExistError;
      },
      mknod(parent, name, mode, dev) {
        return MEMFS.createNode(parent, name, mode, dev);
      },
      rename(old_node, new_dir, new_name) {
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e4) {
        }
        if (new_node) {
          if (FS.isDir(old_node.mode)) for (var i in new_node.contents) throw new FS.ErrnoError(55);
          FS.hashRemoveNode(new_node);
        }
        delete old_node.parent.contents[old_node.name];
        new_dir.contents[new_name] = old_node;
        old_node.name = new_name;
        new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
      },
      unlink(parent, name) {
        delete parent.contents[name];
        parent.ctime = parent.mtime = Date.now();
      },
      rmdir(parent, name) {
        for (var i in FS.lookupNode(parent, name).contents) throw new FS.ErrnoError(55);
        delete parent.contents[name];
        parent.ctime = parent.mtime = Date.now();
      },
      readdir(node) {
        return [
          ".",
          "..",
          ...Object.keys(node.contents)
        ];
      },
      symlink(parent, newname, oldpath) {
        var node = MEMFS.createNode(parent, newname, 41471, 0);
        node.link = oldpath;
        return node;
      },
      readlink(node) {
        if (!FS.isLink(node.mode)) throw new FS.ErrnoError(28);
        return node.link;
      }
    },
    stream_ops: {
      read(stream, buffer2, offset, length, position) {
        var contents = stream.node.contents;
        if (position >= stream.node.usedBytes) return 0;
        var size = Math.min(stream.node.usedBytes - position, length);
        buffer2.set(contents.subarray(position, position + size), offset);
        return size;
      },
      write(stream, buffer2, offset, length, position, canOwn) {
        if (buffer2.buffer === HEAP8.buffer) canOwn = false;
        if (!length) return 0;
        var node = stream.node;
        node.mtime = node.ctime = Date.now();
        if (canOwn) {
          node.contents = buffer2.subarray(offset, offset + length);
          node.usedBytes = length;
        } else if (node.usedBytes === 0 && position === 0) {
          node.contents = buffer2.slice(offset, offset + length);
          node.usedBytes = length;
        } else {
          MEMFS.expandFileStorage(node, position + length);
          node.contents.set(buffer2.subarray(offset, offset + length), position);
          node.usedBytes = Math.max(node.usedBytes, position + length);
        }
        return length;
      },
      llseek(stream, offset, whence) {
        var position = offset;
        if (whence === 1) position += stream.position;
        else if (whence === 2) {
          if (FS.isFile(stream.node.mode)) position += stream.node.usedBytes;
        }
        if (position < 0) throw new FS.ErrnoError(28);
        return position;
      },
      mmap(stream, length, position, prot, flags) {
        if (!FS.isFile(stream.node.mode)) throw new FS.ErrnoError(43);
        var ptr;
        var allocated;
        var contents = stream.node.contents;
        if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
          allocated = false;
          ptr = contents.byteOffset;
        } else {
          allocated = true;
          ptr = mmapAlloc(length);
          if (!ptr) throw new FS.ErrnoError(48);
          if (contents) {
            if (position > 0 || position + length < contents.length) {
              if (contents.subarray) contents = contents.subarray(position, position + length);
              else contents = Array.prototype.slice.call(contents, position, position + length);
            }
            HEAP8.set(contents, ptr);
          }
        }
        return {
          ptr,
          allocated
        };
      },
      msync(stream, buffer2, offset, length, mmapFlags) {
        MEMFS.stream_ops.write(stream, buffer2, 0, length, offset, false);
        return 0;
      }
    }
  };
  var FS_modeStringToFlags = (str) => {
    if (typeof str != "string") return str;
    var flags = {
      "r": 0,
      "r+": 2,
      "w": 577,
      "w+": 578,
      "a": 1089,
      "a+": 1090
    }[str];
    if (typeof flags == "undefined") throw new Error(`Unknown file open mode: ${str}`);
    return flags;
  };
  var FS_fileDataToTypedArray = (data) => {
    if (typeof data == "string") data = intArrayFromString(data, true);
    if (!data.subarray) data = new Uint8Array(data);
    return data;
  };
  var FS_getMode = (canRead, canWrite) => {
    var mode = 0;
    if (canRead) mode |= 365;
    if (canWrite) mode |= 146;
    return mode;
  };
  var asyncLoad = async (url) => {
    var arrayBuffer = await readAsync(url);
    return new Uint8Array(arrayBuffer);
  };
  var FS_createDataFile = (...args) => FS.createDataFile(...args);
  var getUniqueRunDependency = (id) => {
    return id;
  };
  var runDependencies = 0;
  var dependenciesFulfilled = null;
  var removeRunDependency = (id) => {
    runDependencies--;
    Module["monitorRunDependencies"]?.(runDependencies);
    if (runDependencies == 0) {
      if (dependenciesFulfilled) {
        var callback = dependenciesFulfilled;
        dependenciesFulfilled = null;
        callback();
      }
    }
  };
  var addRunDependency = (id) => {
    runDependencies++;
    Module["monitorRunDependencies"]?.(runDependencies);
  };
  var preloadPlugins = [];
  var FS_handledByPreloadPlugin = async (byteArray, fullname) => {
    if (typeof Browser != "undefined") Browser.init();
    for (var plugin of preloadPlugins) if (plugin["canHandle"](fullname)) return plugin["handle"](byteArray, fullname);
    return byteArray;
  };
  var FS_preloadFile = async (parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish) => {
    var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
    var dep = getUniqueRunDependency(`cp ${fullname}`);
    addRunDependency(dep);
    try {
      var byteArray = url;
      if (typeof url == "string") byteArray = await asyncLoad(url);
      byteArray = await FS_handledByPreloadPlugin(byteArray, fullname);
      preFinish?.();
      if (!dontCreateFile) FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
    } finally {
      removeRunDependency(dep);
    }
  };
  var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
    FS_preloadFile(parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish).then(onload).catch(onerror);
  };
  var FS = {
    root: null,
    mounts: [],
    devices: {},
    streams: [],
    nextInode: 1,
    nameTable: null,
    currentPath: "/",
    initialized: false,
    ignorePermissions: true,
    filesystems: null,
    syncFSRequests: 0,
    ErrnoError: class {
      name = "ErrnoError";
      constructor(errno) {
        this.errno = errno;
      }
    },
    FSStream: class {
      shared = {};
      get object() {
        return this.node;
      }
      set object(val) {
        this.node = val;
      }
      get isRead() {
        return (this.flags & 2097155) !== 1;
      }
      get isWrite() {
        return (this.flags & 2097155) !== 0;
      }
      get isAppend() {
        return this.flags & 1024;
      }
      get flags() {
        return this.shared.flags;
      }
      set flags(val) {
        this.shared.flags = val;
      }
      get position() {
        return this.shared.position;
      }
      set position(val) {
        this.shared.position = val;
      }
    },
    FSNode: class {
      node_ops = {};
      stream_ops = {};
      readMode = 365;
      writeMode = 146;
      mounted = null;
      constructor(parent, name, mode, rdev) {
        if (!parent) parent = this;
        this.parent = parent;
        this.mount = parent.mount;
        this.id = FS.nextInode++;
        this.name = name;
        this.mode = mode;
        this.rdev = rdev;
        this.atime = this.mtime = this.ctime = Date.now();
      }
      get read() {
        return (this.mode & this.readMode) === this.readMode;
      }
      set read(val) {
        val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
      }
      get write() {
        return (this.mode & this.writeMode) === this.writeMode;
      }
      set write(val) {
        val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
      }
      get isFolder() {
        return FS.isDir(this.mode);
      }
      get isDevice() {
        return FS.isChrdev(this.mode);
      }
    },
    lookupPath(path, opts = {}) {
      if (!path) throw new FS.ErrnoError(44);
      opts.follow_mount ??= true;
      if (!PATH.isAbs(path)) path = FS.cwd() + "/" + path;
      linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
        var parts = path.split("/").filter((p2) => !!p2);
        var current = FS.root;
        var current_path = "/";
        for (var i = 0; i < parts.length; i++) {
          var islast = i === parts.length - 1;
          if (islast && opts.parent) break;
          if (parts[i] === ".") continue;
          if (parts[i] === "..") {
            current_path = PATH.dirname(current_path);
            if (FS.isRoot(current)) {
              path = current_path + "/" + parts.slice(i + 1).join("/");
              nlinks--;
              continue linkloop;
            } else current = current.parent;
            continue;
          }
          current_path = PATH.join2(current_path, parts[i]);
          try {
            current = FS.lookupNode(current, parts[i]);
          } catch (e4) {
            if (e4?.errno === 44 && islast && opts.noent_okay) return { path: current_path };
            throw e4;
          }
          if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) current = current.mounted.root;
          if (FS.isLink(current.mode) && (!islast || opts.follow)) {
            if (!current.node_ops.readlink) throw new FS.ErrnoError(52);
            var link = current.node_ops.readlink(current);
            if (!PATH.isAbs(link)) link = PATH.dirname(current_path) + "/" + link;
            path = link + "/" + parts.slice(i + 1).join("/");
            continue linkloop;
          }
        }
        return {
          path: current_path,
          node: current
        };
      }
      throw new FS.ErrnoError(32);
    },
    getPath(node) {
      var path;
      while (true) {
        if (FS.isRoot(node)) {
          var mount = node.mount.mountpoint;
          if (!path) return mount;
          return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
        }
        path = path ? `${node.name}/${path}` : node.name;
        node = node.parent;
      }
    },
    hashName(parentid, name) {
      var hash = 0;
      for (var i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
      return (parentid + hash >>> 0) % FS.nameTable.length;
    },
    hashAddNode(node) {
      var hash = FS.hashName(node.parent.id, node.name);
      node.name_next = FS.nameTable[hash];
      FS.nameTable[hash] = node;
    },
    hashRemoveNode(node) {
      var hash = FS.hashName(node.parent.id, node.name);
      if (FS.nameTable[hash] === node) FS.nameTable[hash] = node.name_next;
      else {
        var current = FS.nameTable[hash];
        while (current) {
          if (current.name_next === node) {
            current.name_next = node.name_next;
            break;
          }
          current = current.name_next;
        }
      }
    },
    lookupNode(parent, name) {
      var errCode = FS.mayLookup(parent);
      if (errCode) throw new FS.ErrnoError(errCode);
      var hash = FS.hashName(parent.id, name);
      for (var node = FS.nameTable[hash]; node; node = node.name_next) {
        var nodeName = node.name;
        if (node.parent.id === parent.id && nodeName === name) return node;
      }
      return FS.lookup(parent, name);
    },
    createNode(parent, name, mode, rdev) {
      var node = new FS.FSNode(parent, name, mode, rdev);
      FS.hashAddNode(node);
      return node;
    },
    destroyNode(node) {
      FS.hashRemoveNode(node);
    },
    isRoot(node) {
      return node === node.parent;
    },
    isMountpoint(node) {
      return !!node.mounted;
    },
    isFile(mode) {
      return (mode & 61440) === 32768;
    },
    isDir(mode) {
      return (mode & 61440) === 16384;
    },
    isLink(mode) {
      return (mode & 61440) === 40960;
    },
    isChrdev(mode) {
      return (mode & 61440) === 8192;
    },
    isBlkdev(mode) {
      return (mode & 61440) === 24576;
    },
    isFIFO(mode) {
      return (mode & 61440) === 4096;
    },
    isSocket(mode) {
      return (mode & 49152) === 49152;
    },
    flagsToPermissionString(flag) {
      var perms = [
        "r",
        "w",
        "rw"
      ][flag & 3];
      if (flag & 512) perms += "w";
      return perms;
    },
    nodePermissions(node, perms) {
      if (FS.ignorePermissions) return 0;
      if (perms.includes("r") && !(node.mode & 292)) return 2;
      if (perms.includes("w") && !(node.mode & 146)) return 2;
      if (perms.includes("x") && !(node.mode & 73)) return 2;
      return 0;
    },
    mayLookup(dir) {
      if (!FS.isDir(dir.mode)) return 54;
      var errCode = FS.nodePermissions(dir, "x");
      if (errCode) return errCode;
      if (!dir.node_ops.lookup) return 2;
      return 0;
    },
    mayCreate(dir, name) {
      if (!FS.isDir(dir.mode)) return 54;
      try {
        FS.lookupNode(dir, name);
        return 20;
      } catch (e4) {
      }
      return FS.nodePermissions(dir, "wx");
    },
    mayDelete(dir, name, isdir) {
      var node;
      try {
        node = FS.lookupNode(dir, name);
      } catch (e4) {
        return e4.errno;
      }
      var errCode = FS.nodePermissions(dir, "wx");
      if (errCode) return errCode;
      if (isdir) {
        if (!FS.isDir(node.mode)) return 54;
        if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) return 10;
      } else if (FS.isDir(node.mode)) return 31;
      return 0;
    },
    mayOpen(node, flags) {
      if (!node) return 44;
      if (FS.isLink(node.mode)) return 32;
      var mode = FS.flagsToPermissionString(flags);
      if (FS.isDir(node.mode)) {
        if (mode !== "r" || flags & 576) return 31;
      }
      return FS.nodePermissions(node, mode);
    },
    checkOpExists(op, err3) {
      if (!op) throw new FS.ErrnoError(err3);
      return op;
    },
    MAX_OPEN_FDS: 4096,
    nextfd() {
      for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) if (!FS.streams[fd]) return fd;
      throw new FS.ErrnoError(33);
    },
    getStreamChecked(fd) {
      var stream = FS.getStream(fd);
      if (!stream) throw new FS.ErrnoError(8);
      return stream;
    },
    getStream: (fd) => FS.streams[fd],
    createStream(stream, fd = -1) {
      stream = Object.assign(new FS.FSStream(), stream);
      if (fd == -1) fd = FS.nextfd();
      stream.fd = fd;
      FS.streams[fd] = stream;
      return stream;
    },
    closeStream(fd) {
      FS.streams[fd] = null;
    },
    dupStream(origStream, fd = -1) {
      var stream = FS.createStream(origStream, fd);
      stream.stream_ops?.dup?.(stream);
      return stream;
    },
    doSetAttr(stream, node, attr) {
      var setattr = stream?.stream_ops.setattr;
      var arg = setattr ? stream : node;
      setattr ??= node.node_ops.setattr;
      FS.checkOpExists(setattr, 63);
      setattr(arg, attr);
    },
    chrdev_stream_ops: {
      open(stream) {
        stream.stream_ops = FS.getDevice(stream.node.rdev).stream_ops;
        stream.stream_ops.open?.(stream);
      },
      llseek() {
        throw new FS.ErrnoError(70);
      }
    },
    major: (dev) => dev >> 8,
    minor: (dev) => dev & 255,
    makedev: (ma, mi) => ma << 8 | mi,
    registerDevice(dev, ops) {
      FS.devices[dev] = { stream_ops: ops };
    },
    getDevice: (dev) => FS.devices[dev],
    getMounts(mount) {
      var mounts = [];
      var check = [mount];
      while (check.length) {
        var m = check.pop();
        mounts.push(m);
        check.push(...m.mounts);
      }
      return mounts;
    },
    syncfs(populate, callback) {
      if (typeof populate == "function") {
        callback = populate;
        populate = false;
      }
      FS.syncFSRequests++;
      if (FS.syncFSRequests > 1) err2(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
      var mounts = FS.getMounts(FS.root.mount);
      var completed = 0;
      function doCallback(errCode) {
        FS.syncFSRequests--;
        return callback(errCode);
      }
      function done(errCode) {
        if (errCode) {
          if (!done.errored) {
            done.errored = true;
            return doCallback(errCode);
          }
          return;
        }
        if (++completed >= mounts.length) doCallback(null);
      }
      for (var mount of mounts) if (mount.type.syncfs) mount.type.syncfs(mount, populate, done);
      else done(null);
    },
    mount(type, opts, mountpoint) {
      var root = mountpoint === "/";
      var pseudo = !mountpoint;
      var node;
      if (root && FS.root) throw new FS.ErrnoError(10);
      else if (!root && !pseudo) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
        mountpoint = lookup.path;
        node = lookup.node;
        if (FS.isMountpoint(node)) throw new FS.ErrnoError(10);
        if (!FS.isDir(node.mode)) throw new FS.ErrnoError(54);
      }
      var mount = {
        type,
        opts,
        mountpoint,
        mounts: []
      };
      var mountRoot = type.mount(mount);
      mountRoot.mount = mount;
      mount.root = mountRoot;
      if (root) FS.root = mountRoot;
      else if (node) {
        node.mounted = mount;
        if (node.mount) node.mount.mounts.push(mount);
      }
      return mountRoot;
    },
    unmount(mountpoint) {
      var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
      if (!FS.isMountpoint(lookup.node)) throw new FS.ErrnoError(28);
      var node = lookup.node;
      var mount = node.mounted;
      var mounts = FS.getMounts(mount);
      for (var [hash, current] of Object.entries(FS.nameTable)) while (current) {
        var next = current.name_next;
        if (mounts.includes(current.mount)) FS.destroyNode(current);
        current = next;
      }
      node.mounted = null;
      var idx = node.mount.mounts.indexOf(mount);
      node.mount.mounts.splice(idx, 1);
    },
    lookup(parent, name) {
      return parent.node_ops.lookup(parent, name);
    },
    mknod(path, mode, dev) {
      var parent = FS.lookupPath(path, { parent: true }).node;
      var name = PATH.basename(path);
      if (!name) throw new FS.ErrnoError(28);
      if (name === "." || name === "..") throw new FS.ErrnoError(20);
      var errCode = FS.mayCreate(parent, name);
      if (errCode) throw new FS.ErrnoError(errCode);
      if (!parent.node_ops.mknod) throw new FS.ErrnoError(63);
      return parent.node_ops.mknod(parent, name, mode, dev);
    },
    statfs(path) {
      return FS.statfsNode(FS.lookupPath(path, { follow: true }).node);
    },
    statfsStream(stream) {
      return FS.statfsNode(stream.node);
    },
    statfsNode(node) {
      var rtn = {
        bsize: 4096,
        frsize: 4096,
        blocks: 1e6,
        bfree: 5e5,
        bavail: 5e5,
        files: FS.nextInode,
        ffree: FS.nextInode - 1,
        fsid: 42,
        flags: 2,
        namelen: 255
      };
      if (node.node_ops.statfs) Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
      return rtn;
    },
    create(path, mode = 438) {
      mode &= 4095;
      mode |= 32768;
      return FS.mknod(path, mode, 0);
    },
    mkdir(path, mode = 511) {
      mode &= 1023;
      mode |= 16384;
      return FS.mknod(path, mode, 0);
    },
    mkdirTree(path, mode) {
      var dirs = path.split("/");
      var d = "";
      for (var dir of dirs) {
        if (!dir) continue;
        if (d || PATH.isAbs(path)) d += "/";
        d += dir;
        try {
          FS.mkdir(d, mode);
        } catch (e4) {
          if (e4.errno != 20) throw e4;
        }
      }
    },
    mkdev(path, mode, dev) {
      if (typeof dev == "undefined") {
        dev = mode;
        mode = 438;
      }
      mode |= 8192;
      return FS.mknod(path, mode, dev);
    },
    symlink(oldpath, newpath) {
      if (!PATH_FS.resolve(oldpath)) throw new FS.ErrnoError(44);
      var parent = FS.lookupPath(newpath, { parent: true }).node;
      if (!parent) throw new FS.ErrnoError(44);
      var newname = PATH.basename(newpath);
      var errCode = FS.mayCreate(parent, newname);
      if (errCode) throw new FS.ErrnoError(errCode);
      if (!parent.node_ops.symlink) throw new FS.ErrnoError(63);
      return parent.node_ops.symlink(parent, newname, oldpath);
    },
    rename(old_path, new_path) {
      var old_dirname = PATH.dirname(old_path);
      var new_dirname = PATH.dirname(new_path);
      var old_name = PATH.basename(old_path);
      var new_name = PATH.basename(new_path);
      var lookup = FS.lookupPath(old_path, { parent: true }), old_dir = lookup.node, new_dir;
      lookup = FS.lookupPath(new_path, { parent: true });
      new_dir = lookup.node;
      if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
      if (old_dir.mount !== new_dir.mount) throw new FS.ErrnoError(75);
      var old_node = FS.lookupNode(old_dir, old_name);
      var relative = PATH_FS.relative(old_path, new_dirname);
      if (relative.charAt(0) !== ".") throw new FS.ErrnoError(28);
      relative = PATH_FS.relative(new_path, old_dirname);
      if (relative.charAt(0) !== ".") throw new FS.ErrnoError(55);
      var new_node;
      try {
        new_node = FS.lookupNode(new_dir, new_name);
      } catch (e4) {
      }
      if (old_node === new_node) return;
      var isdir = FS.isDir(old_node.mode);
      var errCode = FS.mayDelete(old_dir, old_name, isdir);
      if (errCode) throw new FS.ErrnoError(errCode);
      errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
      if (errCode) throw new FS.ErrnoError(errCode);
      if (!old_dir.node_ops.rename) throw new FS.ErrnoError(63);
      if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) throw new FS.ErrnoError(10);
      if (new_dir !== old_dir) {
        errCode = FS.nodePermissions(old_dir, "w");
        if (errCode) throw new FS.ErrnoError(errCode);
      }
      FS.hashRemoveNode(old_node);
      try {
        old_dir.node_ops.rename(old_node, new_dir, new_name);
        old_node.parent = new_dir;
      } catch (e4) {
        throw e4;
      } finally {
        FS.hashAddNode(old_node);
      }
    },
    rmdir(path) {
      var parent = FS.lookupPath(path, { parent: true }).node;
      var name = PATH.basename(path);
      var node = FS.lookupNode(parent, name);
      var errCode = FS.mayDelete(parent, name, true);
      if (errCode) throw new FS.ErrnoError(errCode);
      if (!parent.node_ops.rmdir) throw new FS.ErrnoError(63);
      if (FS.isMountpoint(node)) throw new FS.ErrnoError(10);
      parent.node_ops.rmdir(parent, name);
      FS.destroyNode(node);
    },
    readdir(path) {
      var node = FS.lookupPath(path, { follow: true }).node;
      return FS.checkOpExists(node.node_ops.readdir, 54)(node);
    },
    unlink(path) {
      var parent = FS.lookupPath(path, { parent: true }).node;
      if (!parent) throw new FS.ErrnoError(44);
      var name = PATH.basename(path);
      var node = FS.lookupNode(parent, name);
      var errCode = FS.mayDelete(parent, name, false);
      if (errCode) throw new FS.ErrnoError(errCode);
      if (!parent.node_ops.unlink) throw new FS.ErrnoError(63);
      if (FS.isMountpoint(node)) throw new FS.ErrnoError(10);
      parent.node_ops.unlink(parent, name);
      FS.destroyNode(node);
    },
    readlink(path) {
      var link = FS.lookupPath(path).node;
      if (!link) throw new FS.ErrnoError(44);
      if (!link.node_ops.readlink) throw new FS.ErrnoError(28);
      return link.node_ops.readlink(link);
    },
    stat(path, dontFollow) {
      var node = FS.lookupPath(path, { follow: !dontFollow }).node;
      return FS.checkOpExists(node.node_ops.getattr, 63)(node);
    },
    fstat(fd) {
      var stream = FS.getStreamChecked(fd);
      var node = stream.node;
      var getattr = stream.stream_ops.getattr;
      var arg = getattr ? stream : node;
      getattr ??= node.node_ops.getattr;
      FS.checkOpExists(getattr, 63);
      return getattr(arg);
    },
    lstat(path) {
      return FS.stat(path, true);
    },
    doChmod(stream, node, mode, dontFollow) {
      FS.doSetAttr(stream, node, {
        mode: mode & 4095 | node.mode & -4096,
        ctime: Date.now(),
        dontFollow
      });
    },
    chmod(path, mode, dontFollow) {
      var node;
      if (typeof path == "string") node = FS.lookupPath(path, { follow: !dontFollow }).node;
      else node = path;
      FS.doChmod(null, node, mode, dontFollow);
    },
    lchmod(path, mode) {
      FS.chmod(path, mode, true);
    },
    fchmod(fd, mode) {
      var stream = FS.getStreamChecked(fd);
      FS.doChmod(stream, stream.node, mode, false);
    },
    doChown(stream, node, dontFollow) {
      FS.doSetAttr(stream, node, {
        timestamp: Date.now(),
        dontFollow
      });
    },
    chown(path, uid, gid, dontFollow) {
      var node;
      if (typeof path == "string") node = FS.lookupPath(path, { follow: !dontFollow }).node;
      else node = path;
      FS.doChown(null, node, dontFollow);
    },
    lchown(path, uid, gid) {
      FS.chown(path, uid, gid, true);
    },
    fchown(fd, uid, gid) {
      var stream = FS.getStreamChecked(fd);
      FS.doChown(stream, stream.node, false);
    },
    doTruncate(stream, node, len) {
      if (FS.isDir(node.mode)) throw new FS.ErrnoError(31);
      if (!FS.isFile(node.mode)) throw new FS.ErrnoError(28);
      var errCode = FS.nodePermissions(node, "w");
      if (errCode) throw new FS.ErrnoError(errCode);
      FS.doSetAttr(stream, node, {
        size: len,
        timestamp: Date.now()
      });
    },
    truncate(path, len) {
      if (len < 0) throw new FS.ErrnoError(28);
      var node;
      if (typeof path == "string") node = FS.lookupPath(path, { follow: true }).node;
      else node = path;
      FS.doTruncate(null, node, len);
    },
    ftruncate(fd, len) {
      var stream = FS.getStreamChecked(fd);
      if (len < 0 || (stream.flags & 2097155) === 0) throw new FS.ErrnoError(28);
      FS.doTruncate(stream, stream.node, len);
    },
    utime(path, atime, mtime) {
      var node = FS.lookupPath(path, { follow: true }).node;
      FS.checkOpExists(node.node_ops.setattr, 63)(node, {
        atime,
        mtime
      });
    },
    open(path, flags, mode = 438) {
      if (path === "") throw new FS.ErrnoError(44);
      flags = FS_modeStringToFlags(flags);
      if (flags & 64) mode = mode & 4095 | 32768;
      else mode = 0;
      var node;
      var isDirPath;
      if (typeof path == "object") node = path;
      else {
        isDirPath = path.endsWith("/");
        var lookup = FS.lookupPath(path, {
          follow: !(flags & 131072),
          noent_okay: true
        });
        node = lookup.node;
        path = lookup.path;
      }
      var created = false;
      if (flags & 64) {
        if (node) {
          if (flags & 128) throw new FS.ErrnoError(20);
        } else if (isDirPath) throw new FS.ErrnoError(31);
        else {
          node = FS.mknod(path, mode | 511, 0);
          created = true;
        }
      }
      if (!node) throw new FS.ErrnoError(44);
      if (FS.isChrdev(node.mode)) flags &= -513;
      if (flags & 65536 && !FS.isDir(node.mode)) throw new FS.ErrnoError(54);
      if (!created) {
        var errCode = FS.mayOpen(node, flags);
        if (errCode) throw new FS.ErrnoError(errCode);
      }
      if (flags & 512 && !created) FS.truncate(node, 0);
      flags &= -131713;
      var stream = FS.createStream({
        node,
        path: FS.getPath(node),
        flags,
        seekable: true,
        position: 0,
        stream_ops: node.stream_ops,
        ungotten: [],
        error: false
      });
      if (stream.stream_ops.open) stream.stream_ops.open(stream);
      if (created) FS.chmod(node, mode & 511);
      return stream;
    },
    close(stream) {
      if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
      if (stream.getdents) stream.getdents = null;
      try {
        if (stream.stream_ops.close) stream.stream_ops.close(stream);
      } catch (e4) {
        throw e4;
      } finally {
        FS.closeStream(stream.fd);
      }
      stream.fd = null;
    },
    isClosed(stream) {
      return stream.fd === null;
    },
    llseek(stream, offset, whence) {
      if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
      if (!stream.seekable || !stream.stream_ops.llseek) throw new FS.ErrnoError(70);
      if (whence != 0 && whence != 1 && whence != 2) throw new FS.ErrnoError(28);
      stream.position = stream.stream_ops.llseek(stream, offset, whence);
      stream.ungotten = [];
      return stream.position;
    },
    read(stream, buffer2, offset, length, position) {
      if (length < 0 || position < 0) throw new FS.ErrnoError(28);
      if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
      if ((stream.flags & 2097155) === 1) throw new FS.ErrnoError(8);
      if (FS.isDir(stream.node.mode)) throw new FS.ErrnoError(31);
      if (!stream.stream_ops.read) throw new FS.ErrnoError(28);
      var seeking = typeof position != "undefined";
      if (!seeking) position = stream.position;
      else if (!stream.seekable) throw new FS.ErrnoError(70);
      var bytesRead = stream.stream_ops.read(stream, buffer2, offset, length, position);
      if (!seeking) stream.position += bytesRead;
      return bytesRead;
    },
    write(stream, buffer2, offset, length, position, canOwn) {
      if (length < 0 || position < 0) throw new FS.ErrnoError(28);
      if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
      if ((stream.flags & 2097155) === 0) throw new FS.ErrnoError(8);
      if (FS.isDir(stream.node.mode)) throw new FS.ErrnoError(31);
      if (!stream.stream_ops.write) throw new FS.ErrnoError(28);
      if (stream.seekable && stream.flags & 1024) FS.llseek(stream, 0, 2);
      var seeking = typeof position != "undefined";
      if (!seeking) position = stream.position;
      else if (!stream.seekable) throw new FS.ErrnoError(70);
      var bytesWritten = stream.stream_ops.write(stream, buffer2, offset, length, position, canOwn);
      if (!seeking) stream.position += bytesWritten;
      return bytesWritten;
    },
    mmap(stream, length, position, prot, flags) {
      if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) throw new FS.ErrnoError(2);
      if ((stream.flags & 2097155) === 1) throw new FS.ErrnoError(2);
      if (!stream.stream_ops.mmap) throw new FS.ErrnoError(43);
      if (!length) throw new FS.ErrnoError(28);
      return stream.stream_ops.mmap(stream, length, position, prot, flags);
    },
    msync(stream, buffer2, offset, length, mmapFlags) {
      if (!stream.stream_ops.msync) return 0;
      return stream.stream_ops.msync(stream, buffer2, offset, length, mmapFlags);
    },
    ioctl(stream, cmd, arg) {
      if (!stream.stream_ops.ioctl) throw new FS.ErrnoError(59);
      return stream.stream_ops.ioctl(stream, cmd, arg);
    },
    readFile(path, opts = {}) {
      opts.flags = opts.flags || 0;
      opts.encoding = opts.encoding || "binary";
      if (opts.encoding !== "utf8" && opts.encoding !== "binary") abort2(`Invalid encoding type "${opts.encoding}"`);
      var stream = FS.open(path, opts.flags);
      var length = FS.stat(path).size;
      var buf = new Uint8Array(length);
      FS.read(stream, buf, 0, length, 0);
      if (opts.encoding === "utf8") buf = UTF8ArrayToString(buf);
      FS.close(stream);
      return buf;
    },
    writeFile(path, data, opts = {}) {
      opts.flags = opts.flags || 577;
      var stream = FS.open(path, opts.flags, opts.mode);
      data = FS_fileDataToTypedArray(data);
      FS.write(stream, data, 0, data.byteLength, void 0, opts.canOwn);
      FS.close(stream);
    },
    cwd: () => FS.currentPath,
    chdir(path) {
      var lookup = FS.lookupPath(path, { follow: true });
      if (lookup.node === null) throw new FS.ErrnoError(44);
      if (!FS.isDir(lookup.node.mode)) throw new FS.ErrnoError(54);
      var errCode = FS.nodePermissions(lookup.node, "x");
      if (errCode) throw new FS.ErrnoError(errCode);
      FS.currentPath = lookup.path;
    },
    createDefaultDirectories() {
      FS.mkdir("/tmp");
      FS.mkdir("/home");
      FS.mkdir("/home/web_user");
    },
    createDefaultDevices() {
      FS.mkdir("/dev");
      FS.registerDevice(FS.makedev(1, 3), {
        read: () => 0,
        write: (stream, buffer2, offset, length, pos) => length,
        llseek: () => 0
      });
      FS.mkdev("/dev/null", FS.makedev(1, 3));
      TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
      TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
      FS.mkdev("/dev/tty", FS.makedev(5, 0));
      FS.mkdev("/dev/tty1", FS.makedev(6, 0));
      var randomBuffer = /* @__PURE__ */ new Uint8Array(1024), randomLeft = 0;
      var randomByte = () => {
        if (randomLeft === 0) {
          randomFill(randomBuffer);
          randomLeft = randomBuffer.byteLength;
        }
        return randomBuffer[--randomLeft];
      };
      FS.createDevice("/dev", "random", randomByte);
      FS.createDevice("/dev", "urandom", randomByte);
      FS.mkdir("/dev/shm");
      FS.mkdir("/dev/shm/tmp");
    },
    createSpecialDirectories() {
      FS.mkdir("/proc");
      var proc_self = FS.mkdir("/proc/self");
      FS.mkdir("/proc/self/fd");
      FS.mount({ mount() {
        var node = FS.createNode(proc_self, "fd", 16895, 73);
        node.stream_ops = { llseek: MEMFS.stream_ops.llseek };
        node.node_ops = {
          lookup(parent, name) {
            var fd = +name;
            var stream = FS.getStreamChecked(fd);
            var ret = {
              parent: null,
              mount: { mountpoint: "fake" },
              node_ops: { readlink: () => stream.path },
              id: fd + 1
            };
            ret.parent = ret;
            return ret;
          },
          readdir() {
            return Array.from(FS.streams.entries()).filter(([k2, v2]) => v2).map(([k2, v2]) => k2.toString());
          }
        };
        return node;
      } }, {}, "/proc/self/fd");
    },
    createStandardStreams(input, output, error) {
      if (input) FS.createDevice("/dev", "stdin", input);
      else FS.symlink("/dev/tty", "/dev/stdin");
      if (output) FS.createDevice("/dev", "stdout", null, output);
      else FS.symlink("/dev/tty", "/dev/stdout");
      if (error) FS.createDevice("/dev", "stderr", null, error);
      else FS.symlink("/dev/tty1", "/dev/stderr");
      FS.open("/dev/stdin", 0);
      FS.open("/dev/stdout", 1);
      FS.open("/dev/stderr", 1);
    },
    staticInit() {
      FS.nameTable = new Array(4096);
      FS.mount(MEMFS, {}, "/");
      FS.createDefaultDirectories();
      FS.createDefaultDevices();
      FS.createSpecialDirectories();
      FS.filesystems = { "MEMFS": MEMFS };
    },
    init(input, output, error) {
      FS.initialized = true;
      input ??= Module["stdin"];
      output ??= Module["stdout"];
      error ??= Module["stderr"];
      FS.createStandardStreams(input, output, error);
    },
    quit() {
      FS.initialized = false;
      for (var stream of FS.streams) if (stream) FS.close(stream);
    },
    findObject(path, dontResolveLastLink) {
      var ret = FS.analyzePath(path, dontResolveLastLink);
      if (!ret.exists) return null;
      return ret.object;
    },
    analyzePath(path, dontResolveLastLink) {
      try {
        var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
        path = lookup.path;
      } catch (e4) {
      }
      var ret = {
        isRoot: false,
        exists: false,
        error: 0,
        name: null,
        path: null,
        object: null,
        parentExists: false,
        parentPath: null,
        parentObject: null
      };
      try {
        var lookup = FS.lookupPath(path, { parent: true });
        ret.parentExists = true;
        ret.parentPath = lookup.path;
        ret.parentObject = lookup.node;
        ret.name = PATH.basename(path);
        lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
        ret.exists = true;
        ret.path = lookup.path;
        ret.object = lookup.node;
        ret.name = lookup.node.name;
        ret.isRoot = lookup.path === "/";
      } catch (e4) {
        ret.error = e4.errno;
      }
      return ret;
    },
    createPath(parent, path, canRead, canWrite) {
      parent = typeof parent == "string" ? parent : FS.getPath(parent);
      var parts = path.split("/").reverse();
      while (parts.length) {
        var part = parts.pop();
        if (!part) continue;
        var current = PATH.join2(parent, part);
        try {
          FS.mkdir(current);
        } catch (e4) {
          if (e4.errno != 20) throw e4;
        }
        parent = current;
      }
      return current;
    },
    createFile(parent, name, properties, canRead, canWrite) {
      var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
      var mode = FS_getMode(canRead, canWrite);
      return FS.create(path, mode);
    },
    createDataFile(parent, name, data, canRead, canWrite, canOwn) {
      var path = name;
      if (parent) {
        parent = typeof parent == "string" ? parent : FS.getPath(parent);
        path = name ? PATH.join2(parent, name) : parent;
      }
      var mode = FS_getMode(canRead, canWrite);
      var node = FS.create(path, mode);
      if (data) {
        data = FS_fileDataToTypedArray(data);
        FS.chmod(node, mode | 146);
        var stream = FS.open(node, 577);
        FS.write(stream, data, 0, data.length, 0, canOwn);
        FS.close(stream);
        FS.chmod(node, mode);
      }
    },
    createDevice(parent, name, input, output) {
      var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
      var mode = FS_getMode(!!input, !!output);
      FS.createDevice.major ??= 64;
      var dev = FS.makedev(FS.createDevice.major++, 0);
      FS.registerDevice(dev, {
        open(stream) {
          stream.seekable = false;
        },
        close(stream) {
          if (output?.buffer?.length) output(10);
        },
        read(stream, buffer2, offset, length, pos) {
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = input();
            } catch (e4) {
              throw new FS.ErrnoError(29);
            }
            if (result === void 0 && bytesRead === 0) throw new FS.ErrnoError(6);
            if (result === null || result === void 0) break;
            bytesRead++;
            buffer2[offset + i] = result;
          }
          if (bytesRead) stream.node.atime = Date.now();
          return bytesRead;
        },
        write(stream, buffer2, offset, length, pos) {
          for (var i = 0; i < length; i++) try {
            output(buffer2[offset + i]);
          } catch (e4) {
            throw new FS.ErrnoError(29);
          }
          if (length) stream.node.mtime = stream.node.ctime = Date.now();
          return i;
        }
      });
      return FS.mkdev(path, mode, dev);
    },
    forceLoadFile(obj) {
      if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
      if (globalThis.XMLHttpRequest) abort2("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
      else try {
        obj.contents = readBinary(obj.url);
      } catch (e4) {
        throw new FS.ErrnoError(29);
      }
    },
    createLazyFile(parent, name, url, canRead, canWrite) {
      class LazyUint8Array {
        lengthKnown = false;
        chunks = [];
        get(idx) {
          if (idx > this.length - 1 || idx < 0) return;
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = idx / this.chunkSize | 0;
          return this.getter(chunkNum)[chunkOffset];
        }
        setDataGetter(getter) {
          this.getter = getter;
        }
        cacheLength() {
          var xhr = new XMLHttpRequest();
          xhr.open("HEAD", url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort2("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
          var chunkSize = 1048576;
          if (!hasByteServing) chunkSize = datalength;
          var doXHR = (from, to) => {
            if (from > to) abort2("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength - 1) abort2("only " + datalength + " bytes available! programmer error!");
            var xhr2 = new XMLHttpRequest();
            xhr2.open("GET", url, false);
            if (datalength !== chunkSize) xhr2.setRequestHeader("Range", "bytes=" + from + "-" + to);
            xhr2.responseType = "arraybuffer";
            if (xhr2.overrideMimeType) xhr2.overrideMimeType("text/plain; charset=x-user-defined");
            xhr2.send(null);
            if (!(xhr2.status >= 200 && xhr2.status < 300 || xhr2.status === 304)) abort2("Couldn't load " + url + ". Status: " + xhr2.status);
            if (xhr2.response !== void 0) return new Uint8Array(xhr2.response || []);
            return intArrayFromString(xhr2.responseText || "", true);
          };
          var lazyArray = this;
          lazyArray.setDataGetter((chunkNum) => {
            var start = chunkNum * chunkSize;
            var end = (chunkNum + 1) * chunkSize - 1;
            end = Math.min(end, datalength - 1);
            if (typeof lazyArray.chunks[chunkNum] == "undefined") lazyArray.chunks[chunkNum] = doXHR(start, end);
            if (typeof lazyArray.chunks[chunkNum] == "undefined") abort2("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
          if (usesGzip || !datalength) {
            chunkSize = datalength = 1;
            datalength = this.getter(0).length;
            chunkSize = datalength;
            out("LazyFiles on gzip forces download of the whole file when length is accessed");
          }
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        get length() {
          if (!this.lengthKnown) this.cacheLength();
          return this._length;
        }
        get chunkSize() {
          if (!this.lengthKnown) this.cacheLength();
          return this._chunkSize;
        }
      }
      if (globalThis.XMLHttpRequest) {
        if (!ENVIRONMENT_IS_WORKER) abort2("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");
        var properties = {
          isDevice: false,
          contents: new LazyUint8Array()
        };
      } else var properties = {
        isDevice: false,
        url
      };
      var node = FS.createFile(parent, name, properties, canRead, canWrite);
      if (properties.contents) node.contents = properties.contents;
      else if (properties.url) {
        node.contents = null;
        node.url = properties.url;
      }
      Object.defineProperties(node, { usedBytes: { get: function() {
        return this.contents.length;
      } } });
      var stream_ops = {};
      for (const [key, fn] of Object.entries(node.stream_ops)) stream_ops[key] = (...args) => {
        FS.forceLoadFile(node);
        return fn(...args);
      };
      function writeChunks(stream, buffer2, offset, length, position) {
        var contents = stream.node.contents;
        if (position >= contents.length) return 0;
        var size = Math.min(contents.length - position, length);
        if (contents.slice) for (var i = 0; i < size; i++) buffer2[offset + i] = contents[position + i];
        else for (var i = 0; i < size; i++) buffer2[offset + i] = contents.get(position + i);
        return size;
      }
      stream_ops.read = (stream, buffer2, offset, length, position) => {
        FS.forceLoadFile(node);
        return writeChunks(stream, buffer2, offset, length, position);
      };
      stream_ops.mmap = (stream, length, position, prot, flags) => {
        FS.forceLoadFile(node);
        var ptr = mmapAlloc(length);
        if (!ptr) throw new FS.ErrnoError(48);
        writeChunks(stream, HEAP8, ptr, length, position);
        return {
          ptr,
          allocated: true
        };
      };
      node.stream_ops = stream_ops;
      return node;
    }
  };
  var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => {
    if (!ptr) return "";
    var end = findStringEnd(HEAPU8, ptr, maxBytesToRead, ignoreNul);
    return UTF8Decoder.decode(HEAPU8.subarray(ptr, end));
  };
  var SYSCALLS = {
    calculateAt(dirfd, path, allowEmpty) {
      if (PATH.isAbs(path)) return path;
      var dir;
      if (dirfd === -100) dir = FS.cwd();
      else dir = SYSCALLS.getStreamFromFD(dirfd).path;
      if (path.length == 0) {
        if (!allowEmpty) throw new FS.ErrnoError(44);
        return dir;
      }
      return dir + "/" + path;
    },
    writeStat(buf, stat) {
      HEAPU32[buf >> 2] = stat.dev;
      HEAPU32[buf + 4 >> 2] = stat.mode;
      HEAPU32[buf + 8 >> 2] = stat.nlink;
      HEAPU32[buf + 12 >> 2] = stat.uid;
      HEAPU32[buf + 16 >> 2] = stat.gid;
      HEAPU32[buf + 20 >> 2] = stat.rdev;
      HEAP64[buf + 24 >> 3] = BigInt(stat.size);
      HEAP32[buf + 32 >> 2] = 4096;
      HEAP32[buf + 36 >> 2] = stat.blocks;
      var atime = stat.atime.getTime();
      var mtime = stat.mtime.getTime();
      var ctime = stat.ctime.getTime();
      HEAP64[buf + 40 >> 3] = BigInt(Math.floor(atime / 1e3));
      HEAPU32[buf + 48 >> 2] = atime % 1e3 * 1e3 * 1e3;
      HEAP64[buf + 56 >> 3] = BigInt(Math.floor(mtime / 1e3));
      HEAPU32[buf + 64 >> 2] = mtime % 1e3 * 1e3 * 1e3;
      HEAP64[buf + 72 >> 3] = BigInt(Math.floor(ctime / 1e3));
      HEAPU32[buf + 80 >> 2] = ctime % 1e3 * 1e3 * 1e3;
      HEAP64[buf + 88 >> 3] = BigInt(stat.ino);
      return 0;
    },
    writeStatFs(buf, stats) {
      HEAPU32[buf + 4 >> 2] = stats.bsize;
      HEAPU32[buf + 60 >> 2] = stats.bsize;
      HEAP64[buf + 8 >> 3] = BigInt(stats.blocks);
      HEAP64[buf + 16 >> 3] = BigInt(stats.bfree);
      HEAP64[buf + 24 >> 3] = BigInt(stats.bavail);
      HEAP64[buf + 32 >> 3] = BigInt(stats.files);
      HEAP64[buf + 40 >> 3] = BigInt(stats.ffree);
      HEAPU32[buf + 48 >> 2] = stats.fsid;
      HEAPU32[buf + 64 >> 2] = stats.flags;
      HEAPU32[buf + 56 >> 2] = stats.namelen;
    },
    doMsync(addr, stream, len, flags, offset) {
      if (!FS.isFile(stream.node.mode)) throw new FS.ErrnoError(43);
      if (flags & 2) return 0;
      var buffer2 = HEAPU8.slice(addr, addr + len);
      FS.msync(stream, buffer2, offset, len, flags);
    },
    getStreamFromFD(fd) {
      return FS.getStreamChecked(fd);
    },
    varargs: void 0,
    getStr(ptr) {
      return UTF8ToString(ptr);
    }
  };
  function ___syscall_chmod(path, mode) {
    try {
      path = SYSCALLS.getStr(path);
      FS.chmod(path, mode);
      return 0;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  function ___syscall_faccessat(dirfd, path, amode, flags) {
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      if (amode & -8) return -28;
      var node = FS.lookupPath(path, { follow: true }).node;
      if (!node) return -44;
      var perms = "";
      if (amode & 4) perms += "r";
      if (amode & 2) perms += "w";
      if (amode & 1) perms += "x";
      if (perms && FS.nodePermissions(node, perms)) return -2;
      return 0;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  function ___syscall_fchmod(fd, mode) {
    try {
      FS.fchmod(fd, mode);
      return 0;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  function ___syscall_fchown32(fd, owner, group) {
    try {
      FS.fchown(fd, owner, group);
      return 0;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  var syscallGetVarargI = () => {
    var ret = HEAP32[+SYSCALLS.varargs >> 2];
    SYSCALLS.varargs += 4;
    return ret;
  };
  var syscallGetVarargP = syscallGetVarargI;
  function ___syscall_fcntl64(fd, cmd, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (cmd) {
        case 0:
          var arg = syscallGetVarargI();
          if (arg < 0) return -28;
          while (FS.streams[arg]) arg++;
          return FS.dupStream(stream, arg).fd;
        case 1:
        case 2:
          return 0;
        case 3:
          return stream.flags;
        case 4:
          var arg = syscallGetVarargI();
          stream.flags |= arg;
          return 0;
        case 12:
          var arg = syscallGetVarargP();
          var offset = 0;
          HEAP16[arg + offset >> 1] = 2;
          return 0;
        case 13:
        case 14:
          return 0;
      }
      return -28;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  function ___syscall_fstat64(fd, buf) {
    try {
      return SYSCALLS.writeStat(buf, FS.fstat(fd));
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  var INT53_MAX = 9007199254740992;
  var INT53_MIN = -9007199254740992;
  var bigintToI53Checked = (num) => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num);
  function ___syscall_ftruncate64(fd, length) {
    length = bigintToI53Checked(length);
    try {
      if (isNaN(length)) return -61;
      FS.ftruncate(fd, length);
      return 0;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
  };
  function ___syscall_getcwd(buf, size) {
    try {
      if (size === 0) return -28;
      var cwd = FS.cwd();
      var cwdLengthInBytes = lengthBytesUTF8(cwd) + 1;
      if (size < cwdLengthInBytes) return -68;
      stringToUTF8(cwd, buf, size);
      return cwdLengthInBytes;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  function ___syscall_ioctl(fd, op, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (op) {
        case 21509:
          if (!stream.tty) return -59;
          return 0;
        case 21505:
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcgets) {
            var termios = stream.tty.ops.ioctl_tcgets(stream);
            var argp = syscallGetVarargP();
            HEAP32[argp >> 2] = termios.c_iflag || 0;
            HEAP32[argp + 4 >> 2] = termios.c_oflag || 0;
            HEAP32[argp + 8 >> 2] = termios.c_cflag || 0;
            HEAP32[argp + 12 >> 2] = termios.c_lflag || 0;
            for (var i = 0; i < 32; i++) HEAP8[argp + i + 17] = termios.c_cc[i] || 0;
            return 0;
          }
          return 0;
        case 21510:
        case 21511:
        case 21512:
          if (!stream.tty) return -59;
          return 0;
        case 21506:
        case 21507:
        case 21508:
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcsets) {
            var argp = syscallGetVarargP();
            var c_iflag = HEAP32[argp >> 2];
            var c_oflag = HEAP32[argp + 4 >> 2];
            var c_cflag = HEAP32[argp + 8 >> 2];
            var c_lflag = HEAP32[argp + 12 >> 2];
            var c_cc = [];
            for (var i = 0; i < 32; i++) c_cc.push(HEAP8[argp + i + 17]);
            return stream.tty.ops.ioctl_tcsets(stream.tty, op, {
              c_iflag,
              c_oflag,
              c_cflag,
              c_lflag,
              c_cc
            });
          }
          return 0;
        case 21519:
          if (!stream.tty) return -59;
          var argp = syscallGetVarargP();
          HEAP32[argp >> 2] = 0;
          return 0;
        case 21520:
          if (!stream.tty) return -59;
          return -28;
        case 21537:
        case 21531:
          var argp = syscallGetVarargP();
          return FS.ioctl(stream, op, argp);
        case 21523:
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tiocgwinsz) {
            var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
            var argp = syscallGetVarargP();
            HEAP16[argp >> 1] = winsize[0];
            HEAP16[argp + 2 >> 1] = winsize[1];
          }
          return 0;
        case 21524:
          if (!stream.tty) return -59;
          return 0;
        case 21515:
          if (!stream.tty) return -59;
          return 0;
        default:
          return -28;
      }
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  function ___syscall_lstat64(path, buf) {
    try {
      path = SYSCALLS.getStr(path);
      return SYSCALLS.writeStat(buf, FS.lstat(path));
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  function ___syscall_mkdirat(dirfd, path, mode) {
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      FS.mkdir(path, mode, 0);
      return 0;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  function ___syscall_newfstatat(dirfd, path, buf, flags) {
    try {
      path = SYSCALLS.getStr(path);
      var nofollow = flags & 256;
      var allowEmpty = flags & 4096;
      flags = flags & -6401;
      path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
      return SYSCALLS.writeStat(buf, nofollow ? FS.lstat(path) : FS.stat(path));
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  function ___syscall_openat(dirfd, path, flags, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      var mode = varargs ? syscallGetVarargI() : 0;
      return FS.open(path, flags, mode).fd;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  function ___syscall_readlinkat(dirfd, path, buf, bufsize) {
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      if (bufsize <= 0) return -28;
      var ret = FS.readlink(path);
      var len = Math.min(bufsize, lengthBytesUTF8(ret));
      var endChar = HEAP8[buf + len];
      stringToUTF8(ret, buf, bufsize + 1);
      HEAP8[buf + len] = endChar;
      return len;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  function ___syscall_rmdir(path) {
    try {
      path = SYSCALLS.getStr(path);
      FS.rmdir(path);
      return 0;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  function ___syscall_stat64(path, buf) {
    try {
      path = SYSCALLS.getStr(path);
      return SYSCALLS.writeStat(buf, FS.stat(path));
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  function ___syscall_unlinkat(dirfd, path, flags) {
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      if (!flags) FS.unlink(path);
      else if (flags === 512) FS.rmdir(path);
      else return -28;
      return 0;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  var readI53FromI64 = (ptr) => {
    return HEAPU32[ptr >> 2] + HEAP32[ptr + 4 >> 2] * 4294967296;
  };
  function ___syscall_utimensat(dirfd, path, times, flags) {
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path, true);
      var now = Date.now(), atime, mtime;
      if (!times) {
        atime = now;
        mtime = now;
      } else {
        var seconds = readI53FromI64(times);
        var nanoseconds = HEAP32[times + 8 >> 2];
        if (nanoseconds == 1073741823) atime = now;
        else if (nanoseconds == 1073741822) atime = null;
        else atime = seconds * 1e3 + nanoseconds / 1e6;
        times += 16;
        seconds = readI53FromI64(times);
        nanoseconds = HEAP32[times + 8 >> 2];
        if (nanoseconds == 1073741823) mtime = now;
        else if (nanoseconds == 1073741822) mtime = null;
        else mtime = seconds * 1e3 + nanoseconds / 1e6;
      }
      if ((mtime ?? atime) !== null) FS.utime(path, atime, mtime);
      return 0;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  var isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  var MONTH_DAYS_LEAP_CUMULATIVE = [
    0,
    31,
    60,
    91,
    121,
    152,
    182,
    213,
    244,
    274,
    305,
    335
  ];
  var MONTH_DAYS_REGULAR_CUMULATIVE = [
    0,
    31,
    59,
    90,
    120,
    151,
    181,
    212,
    243,
    273,
    304,
    334
  ];
  var ydayFromDate = (date) => {
    return (isLeapYear(date.getFullYear()) ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE)[date.getMonth()] + date.getDate() - 1;
  };
  function __localtime_js(time, tmPtr) {
    time = bigintToI53Checked(time);
    var date = /* @__PURE__ */ new Date(time * 1e3);
    HEAP32[tmPtr >> 2] = date.getSeconds();
    HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
    HEAP32[tmPtr + 8 >> 2] = date.getHours();
    HEAP32[tmPtr + 12 >> 2] = date.getDate();
    HEAP32[tmPtr + 16 >> 2] = date.getMonth();
    HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
    HEAP32[tmPtr + 24 >> 2] = date.getDay();
    var yday = ydayFromDate(date) | 0;
    HEAP32[tmPtr + 28 >> 2] = yday;
    HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
    var start = new Date(date.getFullYear(), 0, 1);
    var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
    var winterOffset = start.getTimezoneOffset();
    var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
    HEAP32[tmPtr + 32 >> 2] = dst;
  }
  function __mmap_js(len, prot, flags, fd, offset, allocated, addr) {
    offset = bigintToI53Checked(offset);
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      var res = FS.mmap(stream, len, offset, prot, flags);
      var ptr = res.ptr;
      HEAP32[allocated >> 2] = res.allocated;
      HEAPU32[addr >> 2] = ptr;
      return 0;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  function __munmap_js(addr, len, prot, flags, fd, offset) {
    offset = bigintToI53Checked(offset);
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      if (prot & 2) SYSCALLS.doMsync(addr, stream, len, flags, offset);
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return -e4.errno;
    }
  }
  var __tzset_js = (timezone, daylight, std_name, dst_name) => {
    var currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    var winter = new Date(currentYear, 0, 1);
    var summer = new Date(currentYear, 6, 1);
    var winterOffset = winter.getTimezoneOffset();
    var summerOffset = summer.getTimezoneOffset();
    var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
    HEAPU32[timezone >> 2] = stdTimezoneOffset * 60;
    HEAP32[daylight >> 2] = Number(winterOffset != summerOffset);
    var extractZone = (timezoneOffset) => {
      var sign = timezoneOffset >= 0 ? "-" : "+";
      var absOffset = Math.abs(timezoneOffset);
      return `UTC${sign}${String(Math.floor(absOffset / 60)).padStart(2, "0")}${String(absOffset % 60).padStart(2, "0")}`;
    };
    var winterName = extractZone(winterOffset);
    var summerName = extractZone(summerOffset);
    if (summerOffset < winterOffset) {
      stringToUTF8(winterName, std_name, 17);
      stringToUTF8(summerName, dst_name, 17);
    } else {
      stringToUTF8(winterName, dst_name, 17);
      stringToUTF8(summerName, std_name, 17);
    }
  };
  var _emscripten_get_now = () => performance.now();
  var _emscripten_date_now = () => Date.now();
  var nowIsMonotonic = 1;
  var checkWasiClock = (clock_id) => clock_id >= 0 && clock_id <= 3;
  function _clock_time_get(clk_id, ignored_precision, ptime) {
    ignored_precision = bigintToI53Checked(ignored_precision);
    if (!checkWasiClock(clk_id)) return 28;
    var now;
    if (clk_id === 0) now = _emscripten_date_now();
    else if (nowIsMonotonic) now = _emscripten_get_now();
    else return 52;
    var nsec = Math.round(now * 1e3 * 1e3);
    HEAP64[ptime >> 3] = BigInt(nsec);
    return 0;
  }
  var getHeapMax = () => 2147483648;
  var _emscripten_get_heap_max = () => getHeapMax();
  var growMemory = (size) => {
    var pages = (size - wasmMemory.buffer.byteLength + 65535) / 65536 | 0;
    try {
      wasmMemory.grow(pages);
      updateMemoryViews();
      return 1;
    } catch (e4) {
    }
  };
  var _emscripten_resize_heap = (requestedSize) => {
    var oldSize = HEAPU8.length;
    requestedSize >>>= 0;
    var maxHeapSize = getHeapMax();
    if (requestedSize > maxHeapSize) return false;
    for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
      var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
      overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
      if (growMemory(Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536)))) return true;
    }
    return false;
  };
  var ENV = {};
  var getExecutableName = () => thisProgram || "./this.program";
  var getEnvStrings = () => {
    if (!getEnvStrings.strings) {
      var env = {
        "USER": "web_user",
        "LOGNAME": "web_user",
        "PATH": "/",
        "PWD": "/",
        "HOME": "/home/web_user",
        "LANG": (globalThis.navigator?.language ?? "C").replace("-", "_") + ".UTF-8",
        "_": getExecutableName()
      };
      for (var x in ENV) if (ENV[x] === void 0) delete env[x];
      else env[x] = ENV[x];
      var strings = [];
      for (var x in env) strings.push(`${x}=${env[x]}`);
      getEnvStrings.strings = strings;
    }
    return getEnvStrings.strings;
  };
  var _environ_get = (__environ, environ_buf) => {
    var bufSize = 0;
    var envp = 0;
    for (var string of getEnvStrings()) {
      var ptr = environ_buf + bufSize;
      HEAPU32[__environ + envp >> 2] = ptr;
      bufSize += stringToUTF8(string, ptr, Infinity) + 1;
      envp += 4;
    }
    return 0;
  };
  var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
    var strings = getEnvStrings();
    HEAPU32[penviron_count >> 2] = strings.length;
    var bufSize = 0;
    for (var string of strings) bufSize += lengthBytesUTF8(string) + 1;
    HEAPU32[penviron_buf_size >> 2] = bufSize;
    return 0;
  };
  function _fd_close(fd) {
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.close(stream);
      return 0;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return e4.errno;
    }
  }
  function _fd_fdstat_get(fd, pbuf) {
    try {
      var rightsBase = 0;
      var rightsInheriting = 0;
      var flags = 0;
      var stream = SYSCALLS.getStreamFromFD(fd);
      var type = stream.tty ? 2 : FS.isDir(stream.mode) ? 3 : FS.isLink(stream.mode) ? 7 : 4;
      HEAP8[pbuf] = type;
      HEAP16[pbuf + 2 >> 1] = flags;
      HEAP64[pbuf + 8 >> 3] = BigInt(rightsBase);
      HEAP64[pbuf + 16 >> 3] = BigInt(rightsInheriting);
      return 0;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return e4.errno;
    }
  }
  var doReadv = (stream, iov, iovcnt, offset) => {
    var ret = 0;
    for (var i = 0; i < iovcnt; i++) {
      var ptr = HEAPU32[iov >> 2];
      var len = HEAPU32[iov + 4 >> 2];
      iov += 8;
      var curr = FS.read(stream, HEAP8, ptr, len, offset);
      if (curr < 0) return -1;
      ret += curr;
      if (curr < len) break;
      if (typeof offset != "undefined") offset += curr;
    }
    return ret;
  };
  function _fd_read(fd, iov, iovcnt, pnum) {
    try {
      var num = doReadv(SYSCALLS.getStreamFromFD(fd), iov, iovcnt);
      HEAPU32[pnum >> 2] = num;
      return 0;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return e4.errno;
    }
  }
  function _fd_seek(fd, offset, whence, newOffset) {
    offset = bigintToI53Checked(offset);
    try {
      if (isNaN(offset)) return 61;
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.llseek(stream, offset, whence);
      HEAP64[newOffset >> 3] = BigInt(stream.position);
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
      return 0;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return e4.errno;
    }
  }
  function _fd_sync(fd) {
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      return stream.stream_ops?.fsync?.(stream);
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return e4.errno;
    }
  }
  var doWritev = (stream, iov, iovcnt, offset) => {
    var ret = 0;
    for (var i = 0; i < iovcnt; i++) {
      var ptr = HEAPU32[iov >> 2];
      var len = HEAPU32[iov + 4 >> 2];
      iov += 8;
      var curr = FS.write(stream, HEAP8, ptr, len, offset);
      if (curr < 0) return -1;
      ret += curr;
      if (curr < len) break;
      if (typeof offset != "undefined") offset += curr;
    }
    return ret;
  };
  function _fd_write(fd, iov, iovcnt, pnum) {
    try {
      var num = doWritev(SYSCALLS.getStreamFromFD(fd), iov, iovcnt);
      HEAPU32[pnum >> 2] = num;
      return 0;
    } catch (e4) {
      if (typeof FS == "undefined" || !(e4.name === "ErrnoError")) throw e4;
      return e4.errno;
    }
  }
  FS.createPreloadedFile = FS_createPreloadedFile;
  FS.preloadFile = FS_preloadFile;
  FS.staticInit();
  initMemory();
  if (Module["noExitRuntime"]) Module["noExitRuntime"];
  if (Module["preloadPlugins"]) preloadPlugins = Module["preloadPlugins"];
  if (Module["print"]) out = Module["print"];
  if (Module["printErr"]) err2 = Module["printErr"];
  if (Module["wasmBinary"]) wasmBinary2 = Module["wasmBinary"];
  if (Module["arguments"]) Module["arguments"];
  if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
  if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
    while (Module["preInit"].length > 0) Module["preInit"].shift()();
  }
  Module["wasmMemory"] = wasmMemory;
  var _emscripten_builtin_memalign;
  function assignWasmExports(wasmExports2) {
    Module["_sqlite3_status64"] = wasmExports2["sqlite3_status64"];
    Module["_sqlite3_status"] = wasmExports2["sqlite3_status"];
    Module["_sqlite3_db_status64"] = wasmExports2["sqlite3_db_status64"];
    Module["_sqlite3_msize"] = wasmExports2["sqlite3_msize"];
    Module["_sqlite3_db_status"] = wasmExports2["sqlite3_db_status"];
    Module["_sqlite3_vfs_find"] = wasmExports2["sqlite3_vfs_find"];
    Module["_sqlite3_initialize"] = wasmExports2["sqlite3_initialize"];
    Module["_sqlite3_vfs_register"] = wasmExports2["sqlite3_vfs_register"];
    Module["_sqlite3_vfs_unregister"] = wasmExports2["sqlite3_vfs_unregister"];
    Module["_sqlite3_malloc"] = wasmExports2["sqlite3_malloc"];
    Module["_sqlite3_malloc64"] = wasmExports2["sqlite3_malloc64"];
    Module["_sqlite3_free"] = wasmExports2["sqlite3_free"];
    Module["_sqlite3_realloc"] = wasmExports2["sqlite3_realloc"];
    Module["_sqlite3_realloc64"] = wasmExports2["sqlite3_realloc64"];
    Module["_sqlite3_value_text"] = wasmExports2["sqlite3_value_text"];
    Module["_sqlite3_randomness"] = wasmExports2["sqlite3_randomness"];
    Module["_sqlite3_stricmp"] = wasmExports2["sqlite3_stricmp"];
    Module["_sqlite3_strnicmp"] = wasmExports2["sqlite3_strnicmp"];
    Module["_sqlite3_uri_parameter"] = wasmExports2["sqlite3_uri_parameter"];
    Module["_sqlite3_uri_boolean"] = wasmExports2["sqlite3_uri_boolean"];
    Module["_sqlite3_serialize"] = wasmExports2["sqlite3_serialize"];
    Module["_sqlite3_prepare_v2"] = wasmExports2["sqlite3_prepare_v2"];
    Module["_sqlite3_step"] = wasmExports2["sqlite3_step"];
    Module["_sqlite3_column_int64"] = wasmExports2["sqlite3_column_int64"];
    Module["_sqlite3_reset"] = wasmExports2["sqlite3_reset"];
    Module["_sqlite3_exec"] = wasmExports2["sqlite3_exec"];
    Module["_sqlite3_column_int"] = wasmExports2["sqlite3_column_int"];
    Module["_sqlite3_finalize"] = wasmExports2["sqlite3_finalize"];
    Module["_sqlite3_file_control"] = wasmExports2["sqlite3_file_control"];
    Module["_sqlite3_column_name"] = wasmExports2["sqlite3_column_name"];
    Module["_sqlite3_column_text"] = wasmExports2["sqlite3_column_text"];
    Module["_sqlite3_column_type"] = wasmExports2["sqlite3_column_type"];
    Module["_sqlite3_errmsg"] = wasmExports2["sqlite3_errmsg"];
    Module["_sqlite3_deserialize"] = wasmExports2["sqlite3_deserialize"];
    Module["_sqlite3_backup_init"] = wasmExports2["sqlite3_backup_init"];
    Module["_sqlite3_backup_step"] = wasmExports2["sqlite3_backup_step"];
    Module["_sqlite3_backup_finish"] = wasmExports2["sqlite3_backup_finish"];
    Module["_sqlite3_backup_remaining"] = wasmExports2["sqlite3_backup_remaining"];
    Module["_sqlite3_backup_pagecount"] = wasmExports2["sqlite3_backup_pagecount"];
    Module["_sqlite3_clear_bindings"] = wasmExports2["sqlite3_clear_bindings"];
    Module["_sqlite3_value_blob"] = wasmExports2["sqlite3_value_blob"];
    Module["_sqlite3_value_bytes"] = wasmExports2["sqlite3_value_bytes"];
    Module["_sqlite3_value_double"] = wasmExports2["sqlite3_value_double"];
    Module["_sqlite3_value_int"] = wasmExports2["sqlite3_value_int"];
    Module["_sqlite3_value_int64"] = wasmExports2["sqlite3_value_int64"];
    Module["_sqlite3_value_subtype"] = wasmExports2["sqlite3_value_subtype"];
    Module["_sqlite3_value_pointer"] = wasmExports2["sqlite3_value_pointer"];
    Module["_sqlite3_value_type"] = wasmExports2["sqlite3_value_type"];
    Module["_sqlite3_value_nochange"] = wasmExports2["sqlite3_value_nochange"];
    Module["_sqlite3_value_frombind"] = wasmExports2["sqlite3_value_frombind"];
    Module["_sqlite3_value_dup"] = wasmExports2["sqlite3_value_dup"];
    Module["_sqlite3_value_free"] = wasmExports2["sqlite3_value_free"];
    Module["_sqlite3_result_blob"] = wasmExports2["sqlite3_result_blob"];
    Module["_sqlite3_result_error_toobig"] = wasmExports2["sqlite3_result_error_toobig"];
    Module["_sqlite3_result_error_nomem"] = wasmExports2["sqlite3_result_error_nomem"];
    Module["_sqlite3_result_double"] = wasmExports2["sqlite3_result_double"];
    Module["_sqlite3_result_error"] = wasmExports2["sqlite3_result_error"];
    Module["_sqlite3_result_int"] = wasmExports2["sqlite3_result_int"];
    Module["_sqlite3_result_int64"] = wasmExports2["sqlite3_result_int64"];
    Module["_sqlite3_result_null"] = wasmExports2["sqlite3_result_null"];
    Module["_sqlite3_result_pointer"] = wasmExports2["sqlite3_result_pointer"];
    Module["_sqlite3_result_subtype"] = wasmExports2["sqlite3_result_subtype"];
    Module["_sqlite3_result_text"] = wasmExports2["sqlite3_result_text"];
    Module["_sqlite3_result_zeroblob"] = wasmExports2["sqlite3_result_zeroblob"];
    Module["_sqlite3_result_zeroblob64"] = wasmExports2["sqlite3_result_zeroblob64"];
    Module["_sqlite3_result_error_code"] = wasmExports2["sqlite3_result_error_code"];
    Module["_sqlite3_user_data"] = wasmExports2["sqlite3_user_data"];
    Module["_sqlite3_context_db_handle"] = wasmExports2["sqlite3_context_db_handle"];
    Module["_sqlite3_vtab_nochange"] = wasmExports2["sqlite3_vtab_nochange"];
    Module["_sqlite3_vtab_in_first"] = wasmExports2["sqlite3_vtab_in_first"];
    Module["_sqlite3_vtab_in_next"] = wasmExports2["sqlite3_vtab_in_next"];
    Module["_sqlite3_aggregate_context"] = wasmExports2["sqlite3_aggregate_context"];
    Module["_sqlite3_get_auxdata"] = wasmExports2["sqlite3_get_auxdata"];
    Module["_sqlite3_set_auxdata"] = wasmExports2["sqlite3_set_auxdata"];
    Module["_sqlite3_column_count"] = wasmExports2["sqlite3_column_count"];
    Module["_sqlite3_data_count"] = wasmExports2["sqlite3_data_count"];
    Module["_sqlite3_column_blob"] = wasmExports2["sqlite3_column_blob"];
    Module["_sqlite3_column_bytes"] = wasmExports2["sqlite3_column_bytes"];
    Module["_sqlite3_column_double"] = wasmExports2["sqlite3_column_double"];
    Module["_sqlite3_column_value"] = wasmExports2["sqlite3_column_value"];
    Module["_sqlite3_column_decltype"] = wasmExports2["sqlite3_column_decltype"];
    Module["_sqlite3_column_database_name"] = wasmExports2["sqlite3_column_database_name"];
    Module["_sqlite3_column_table_name"] = wasmExports2["sqlite3_column_table_name"];
    Module["_sqlite3_column_origin_name"] = wasmExports2["sqlite3_column_origin_name"];
    Module["_sqlite3_bind_blob"] = wasmExports2["sqlite3_bind_blob"];
    Module["_sqlite3_bind_double"] = wasmExports2["sqlite3_bind_double"];
    Module["_sqlite3_bind_int"] = wasmExports2["sqlite3_bind_int"];
    Module["_sqlite3_bind_int64"] = wasmExports2["sqlite3_bind_int64"];
    Module["_sqlite3_bind_null"] = wasmExports2["sqlite3_bind_null"];
    Module["_sqlite3_bind_pointer"] = wasmExports2["sqlite3_bind_pointer"];
    Module["_sqlite3_bind_text"] = wasmExports2["sqlite3_bind_text"];
    Module["_sqlite3_bind_zeroblob"] = wasmExports2["sqlite3_bind_zeroblob"];
    Module["_sqlite3_bind_parameter_count"] = wasmExports2["sqlite3_bind_parameter_count"];
    Module["_sqlite3_bind_parameter_name"] = wasmExports2["sqlite3_bind_parameter_name"];
    Module["_sqlite3_bind_parameter_index"] = wasmExports2["sqlite3_bind_parameter_index"];
    Module["_sqlite3_db_handle"] = wasmExports2["sqlite3_db_handle"];
    Module["_sqlite3_stmt_readonly"] = wasmExports2["sqlite3_stmt_readonly"];
    Module["_sqlite3_stmt_isexplain"] = wasmExports2["sqlite3_stmt_isexplain"];
    Module["_sqlite3_stmt_explain"] = wasmExports2["sqlite3_stmt_explain"];
    Module["_sqlite3_stmt_busy"] = wasmExports2["sqlite3_stmt_busy"];
    Module["_sqlite3_next_stmt"] = wasmExports2["sqlite3_next_stmt"];
    Module["_sqlite3_stmt_status"] = wasmExports2["sqlite3_stmt_status"];
    Module["_sqlite3_sql"] = wasmExports2["sqlite3_sql"];
    Module["_sqlite3_expanded_sql"] = wasmExports2["sqlite3_expanded_sql"];
    Module["_sqlite3_preupdate_old"] = wasmExports2["sqlite3_preupdate_old"];
    Module["_sqlite3_preupdate_count"] = wasmExports2["sqlite3_preupdate_count"];
    Module["_sqlite3_preupdate_depth"] = wasmExports2["sqlite3_preupdate_depth"];
    Module["_sqlite3_preupdate_blobwrite"] = wasmExports2["sqlite3_preupdate_blobwrite"];
    Module["_sqlite3_preupdate_new"] = wasmExports2["sqlite3_preupdate_new"];
    Module["_sqlite3_value_numeric_type"] = wasmExports2["sqlite3_value_numeric_type"];
    Module["_sqlite3_set_authorizer"] = wasmExports2["sqlite3_set_authorizer"];
    Module["_sqlite3_strglob"] = wasmExports2["sqlite3_strglob"];
    Module["_sqlite3_strlike"] = wasmExports2["sqlite3_strlike"];
    Module["_sqlite3_auto_extension"] = wasmExports2["sqlite3_auto_extension"];
    Module["_sqlite3_cancel_auto_extension"] = wasmExports2["sqlite3_cancel_auto_extension"];
    Module["_sqlite3_reset_auto_extension"] = wasmExports2["sqlite3_reset_auto_extension"];
    Module["_sqlite3_prepare_v3"] = wasmExports2["sqlite3_prepare_v3"];
    Module["_sqlite3_create_module"] = wasmExports2["sqlite3_create_module"];
    Module["_sqlite3_create_module_v2"] = wasmExports2["sqlite3_create_module_v2"];
    Module["_sqlite3_drop_modules"] = wasmExports2["sqlite3_drop_modules"];
    Module["_sqlite3_declare_vtab"] = wasmExports2["sqlite3_declare_vtab"];
    Module["_sqlite3_vtab_on_conflict"] = wasmExports2["sqlite3_vtab_on_conflict"];
    Module["_sqlite3_vtab_collation"] = wasmExports2["sqlite3_vtab_collation"];
    Module["_sqlite3_vtab_in"] = wasmExports2["sqlite3_vtab_in"];
    Module["_sqlite3_vtab_rhs_value"] = wasmExports2["sqlite3_vtab_rhs_value"];
    Module["_sqlite3_vtab_distinct"] = wasmExports2["sqlite3_vtab_distinct"];
    Module["_sqlite3_keyword_name"] = wasmExports2["sqlite3_keyword_name"];
    Module["_sqlite3_keyword_count"] = wasmExports2["sqlite3_keyword_count"];
    Module["_sqlite3_keyword_check"] = wasmExports2["sqlite3_keyword_check"];
    Module["_sqlite3_complete"] = wasmExports2["sqlite3_complete"];
    Module["_sqlite3_libversion"] = wasmExports2["sqlite3_libversion"];
    Module["_sqlite3_libversion_number"] = wasmExports2["sqlite3_libversion_number"];
    Module["_sqlite3_shutdown"] = wasmExports2["sqlite3_shutdown"];
    Module["_sqlite3_last_insert_rowid"] = wasmExports2["sqlite3_last_insert_rowid"];
    Module["_sqlite3_set_last_insert_rowid"] = wasmExports2["sqlite3_set_last_insert_rowid"];
    Module["_sqlite3_changes64"] = wasmExports2["sqlite3_changes64"];
    Module["_sqlite3_changes"] = wasmExports2["sqlite3_changes"];
    Module["_sqlite3_total_changes64"] = wasmExports2["sqlite3_total_changes64"];
    Module["_sqlite3_total_changes"] = wasmExports2["sqlite3_total_changes"];
    Module["_sqlite3_txn_state"] = wasmExports2["sqlite3_txn_state"];
    Module["_sqlite3_close_v2"] = wasmExports2["sqlite3_close_v2"];
    Module["_sqlite3_busy_handler"] = wasmExports2["sqlite3_busy_handler"];
    Module["_sqlite3_progress_handler"] = wasmExports2["sqlite3_progress_handler"];
    Module["_sqlite3_busy_timeout"] = wasmExports2["sqlite3_busy_timeout"];
    Module["_sqlite3_interrupt"] = wasmExports2["sqlite3_interrupt"];
    Module["_sqlite3_is_interrupted"] = wasmExports2["sqlite3_is_interrupted"];
    Module["_sqlite3_create_function"] = wasmExports2["sqlite3_create_function"];
    Module["_sqlite3_create_function_v2"] = wasmExports2["sqlite3_create_function_v2"];
    Module["_sqlite3_create_window_function"] = wasmExports2["sqlite3_create_window_function"];
    Module["_sqlite3_overload_function"] = wasmExports2["sqlite3_overload_function"];
    Module["_sqlite3_trace_v2"] = wasmExports2["sqlite3_trace_v2"];
    Module["_sqlite3_commit_hook"] = wasmExports2["sqlite3_commit_hook"];
    Module["_sqlite3_update_hook"] = wasmExports2["sqlite3_update_hook"];
    Module["_sqlite3_rollback_hook"] = wasmExports2["sqlite3_rollback_hook"];
    Module["_sqlite3_preupdate_hook"] = wasmExports2["sqlite3_preupdate_hook"];
    Module["_sqlite3_set_errmsg"] = wasmExports2["sqlite3_set_errmsg"];
    Module["_sqlite3_error_offset"] = wasmExports2["sqlite3_error_offset"];
    Module["_sqlite3_errcode"] = wasmExports2["sqlite3_errcode"];
    Module["_sqlite3_extended_errcode"] = wasmExports2["sqlite3_extended_errcode"];
    Module["_sqlite3_errstr"] = wasmExports2["sqlite3_errstr"];
    Module["_sqlite3_limit"] = wasmExports2["sqlite3_limit"];
    Module["_sqlite3_open"] = wasmExports2["sqlite3_open"];
    Module["_sqlite3_open_v2"] = wasmExports2["sqlite3_open_v2"];
    Module["_sqlite3_create_collation"] = wasmExports2["sqlite3_create_collation"];
    Module["_sqlite3_create_collation_v2"] = wasmExports2["sqlite3_create_collation_v2"];
    Module["_sqlite3_collation_needed"] = wasmExports2["sqlite3_collation_needed"];
    Module["_sqlite3_get_autocommit"] = wasmExports2["sqlite3_get_autocommit"];
    Module["_sqlite3_table_column_metadata"] = wasmExports2["sqlite3_table_column_metadata"];
    Module["_sqlite3_extended_result_codes"] = wasmExports2["sqlite3_extended_result_codes"];
    Module["_sqlite3_uri_key"] = wasmExports2["sqlite3_uri_key"];
    Module["_sqlite3_uri_int64"] = wasmExports2["sqlite3_uri_int64"];
    Module["_sqlite3_db_name"] = wasmExports2["sqlite3_db_name"];
    Module["_sqlite3_db_filename"] = wasmExports2["sqlite3_db_filename"];
    Module["_sqlite3_db_readonly"] = wasmExports2["sqlite3_db_readonly"];
    Module["_sqlite3_compileoption_used"] = wasmExports2["sqlite3_compileoption_used"];
    Module["_sqlite3_compileoption_get"] = wasmExports2["sqlite3_compileoption_get"];
    Module["_sqlite3session_diff"] = wasmExports2["sqlite3session_diff"];
    Module["_sqlite3session_attach"] = wasmExports2["sqlite3session_attach"];
    Module["_sqlite3session_create"] = wasmExports2["sqlite3session_create"];
    Module["_sqlite3session_delete"] = wasmExports2["sqlite3session_delete"];
    Module["_sqlite3session_table_filter"] = wasmExports2["sqlite3session_table_filter"];
    Module["_sqlite3session_changeset"] = wasmExports2["sqlite3session_changeset"];
    Module["_sqlite3session_changeset_strm"] = wasmExports2["sqlite3session_changeset_strm"];
    Module["_sqlite3session_patchset_strm"] = wasmExports2["sqlite3session_patchset_strm"];
    Module["_sqlite3session_patchset"] = wasmExports2["sqlite3session_patchset"];
    Module["_sqlite3session_enable"] = wasmExports2["sqlite3session_enable"];
    Module["_sqlite3session_indirect"] = wasmExports2["sqlite3session_indirect"];
    Module["_sqlite3session_isempty"] = wasmExports2["sqlite3session_isempty"];
    Module["_sqlite3session_memory_used"] = wasmExports2["sqlite3session_memory_used"];
    Module["_sqlite3session_object_config"] = wasmExports2["sqlite3session_object_config"];
    Module["_sqlite3session_changeset_size"] = wasmExports2["sqlite3session_changeset_size"];
    Module["_sqlite3changeset_start"] = wasmExports2["sqlite3changeset_start"];
    Module["_sqlite3changeset_start_v2"] = wasmExports2["sqlite3changeset_start_v2"];
    Module["_sqlite3changeset_start_strm"] = wasmExports2["sqlite3changeset_start_strm"];
    Module["_sqlite3changeset_start_v2_strm"] = wasmExports2["sqlite3changeset_start_v2_strm"];
    Module["_sqlite3changeset_next"] = wasmExports2["sqlite3changeset_next"];
    Module["_sqlite3changeset_op"] = wasmExports2["sqlite3changeset_op"];
    Module["_sqlite3changeset_pk"] = wasmExports2["sqlite3changeset_pk"];
    Module["_sqlite3changeset_old"] = wasmExports2["sqlite3changeset_old"];
    Module["_sqlite3changeset_new"] = wasmExports2["sqlite3changeset_new"];
    Module["_sqlite3changeset_conflict"] = wasmExports2["sqlite3changeset_conflict"];
    Module["_sqlite3changeset_fk_conflicts"] = wasmExports2["sqlite3changeset_fk_conflicts"];
    Module["_sqlite3changeset_finalize"] = wasmExports2["sqlite3changeset_finalize"];
    Module["_sqlite3changeset_invert"] = wasmExports2["sqlite3changeset_invert"];
    Module["_sqlite3changeset_invert_strm"] = wasmExports2["sqlite3changeset_invert_strm"];
    Module["_sqlite3changeset_apply_v2"] = wasmExports2["sqlite3changeset_apply_v2"];
    Module["_sqlite3changeset_apply_v3"] = wasmExports2["sqlite3changeset_apply_v3"];
    Module["_sqlite3changeset_apply"] = wasmExports2["sqlite3changeset_apply"];
    Module["_sqlite3changeset_apply_v3_strm"] = wasmExports2["sqlite3changeset_apply_v3_strm"];
    Module["_sqlite3changeset_apply_v2_strm"] = wasmExports2["sqlite3changeset_apply_v2_strm"];
    Module["_sqlite3changeset_apply_strm"] = wasmExports2["sqlite3changeset_apply_strm"];
    Module["_sqlite3changegroup_new"] = wasmExports2["sqlite3changegroup_new"];
    Module["_sqlite3changegroup_add"] = wasmExports2["sqlite3changegroup_add"];
    Module["_sqlite3changegroup_output"] = wasmExports2["sqlite3changegroup_output"];
    Module["_sqlite3changegroup_add_strm"] = wasmExports2["sqlite3changegroup_add_strm"];
    Module["_sqlite3changegroup_output_strm"] = wasmExports2["sqlite3changegroup_output_strm"];
    Module["_sqlite3changegroup_delete"] = wasmExports2["sqlite3changegroup_delete"];
    Module["_sqlite3changeset_concat"] = wasmExports2["sqlite3changeset_concat"];
    Module["_sqlite3changeset_concat_strm"] = wasmExports2["sqlite3changeset_concat_strm"];
    Module["_sqlite3session_config"] = wasmExports2["sqlite3session_config"];
    Module["_sqlite3_sourceid"] = wasmExports2["sqlite3_sourceid"];
    Module["_sqlite3__wasm_pstack_ptr"] = wasmExports2["sqlite3__wasm_pstack_ptr"];
    Module["_sqlite3__wasm_pstack_restore"] = wasmExports2["sqlite3__wasm_pstack_restore"];
    Module["_sqlite3__wasm_pstack_alloc"] = wasmExports2["sqlite3__wasm_pstack_alloc"];
    Module["_sqlite3__wasm_pstack_remaining"] = wasmExports2["sqlite3__wasm_pstack_remaining"];
    Module["_sqlite3__wasm_pstack_quota"] = wasmExports2["sqlite3__wasm_pstack_quota"];
    Module["_sqlite3__wasm_test_struct"] = wasmExports2["sqlite3__wasm_test_struct"];
    Module["_sqlite3__wasm_enum_json"] = wasmExports2["sqlite3__wasm_enum_json"];
    Module["_sqlite3__wasm_vfs_unlink"] = wasmExports2["sqlite3__wasm_vfs_unlink"];
    Module["_sqlite3__wasm_db_vfs"] = wasmExports2["sqlite3__wasm_db_vfs"];
    Module["_sqlite3__wasm_db_reset"] = wasmExports2["sqlite3__wasm_db_reset"];
    Module["_sqlite3__wasm_db_export_chunked"] = wasmExports2["sqlite3__wasm_db_export_chunked"];
    Module["_sqlite3__wasm_db_serialize"] = wasmExports2["sqlite3__wasm_db_serialize"];
    Module["_sqlite3__wasm_vfs_create_file"] = wasmExports2["sqlite3__wasm_vfs_create_file"];
    Module["_sqlite3__wasm_posix_create_file"] = wasmExports2["sqlite3__wasm_posix_create_file"];
    Module["_sqlite3__wasm_kvvfsMakeKey"] = wasmExports2["sqlite3__wasm_kvvfsMakeKey"];
    Module["_sqlite3__wasm_kvvfs_methods"] = wasmExports2["sqlite3__wasm_kvvfs_methods"];
    Module["_sqlite3__wasm_vtab_config"] = wasmExports2["sqlite3__wasm_vtab_config"];
    Module["_sqlite3__wasm_db_config_ip"] = wasmExports2["sqlite3__wasm_db_config_ip"];
    Module["_sqlite3__wasm_db_config_pii"] = wasmExports2["sqlite3__wasm_db_config_pii"];
    Module["_sqlite3__wasm_db_config_s"] = wasmExports2["sqlite3__wasm_db_config_s"];
    Module["_sqlite3__wasm_config_i"] = wasmExports2["sqlite3__wasm_config_i"];
    Module["_sqlite3__wasm_config_ii"] = wasmExports2["sqlite3__wasm_config_ii"];
    Module["_sqlite3__wasm_config_j"] = wasmExports2["sqlite3__wasm_config_j"];
    Module["_sqlite3__wasm_qfmt_token"] = wasmExports2["sqlite3__wasm_qfmt_token"];
    Module["_sqlite3__wasm_kvvfs_decode"] = wasmExports2["sqlite3__wasm_kvvfs_decode"];
    Module["_sqlite3__wasm_kvvfs_encode"] = wasmExports2["sqlite3__wasm_kvvfs_encode"];
    Module["_sqlite3__wasm_init_wasmfs"] = wasmExports2["sqlite3__wasm_init_wasmfs"];
    Module["_sqlite3__wasm_test_intptr"] = wasmExports2["sqlite3__wasm_test_intptr"];
    Module["_sqlite3__wasm_test_voidptr"] = wasmExports2["sqlite3__wasm_test_voidptr"];
    Module["_sqlite3__wasm_test_int64_max"] = wasmExports2["sqlite3__wasm_test_int64_max"];
    Module["_sqlite3__wasm_test_int64_min"] = wasmExports2["sqlite3__wasm_test_int64_min"];
    Module["_sqlite3__wasm_test_int64_times2"] = wasmExports2["sqlite3__wasm_test_int64_times2"];
    Module["_sqlite3__wasm_test_int64_minmax"] = wasmExports2["sqlite3__wasm_test_int64_minmax"];
    Module["_sqlite3__wasm_test_int64ptr"] = wasmExports2["sqlite3__wasm_test_int64ptr"];
    Module["_sqlite3__wasm_test_stack_overflow"] = wasmExports2["sqlite3__wasm_test_stack_overflow"];
    Module["_sqlite3__wasm_test_str_hello"] = wasmExports2["sqlite3__wasm_test_str_hello"];
    Module["_sqlite3__wasm_SQLTester_strglob"] = wasmExports2["sqlite3__wasm_SQLTester_strglob"];
    Module["_malloc"] = wasmExports2["malloc"];
    Module["_free"] = wasmExports2["free"];
    Module["_realloc"] = wasmExports2["realloc"];
    _emscripten_builtin_memalign = wasmExports2["emscripten_builtin_memalign"];
    wasmExports2["_emscripten_stack_restore"];
    wasmExports2["_emscripten_stack_alloc"];
    wasmExports2["emscripten_stack_get_current"];
    wasmExports2["__indirect_function_table"];
  }
  var wasmImports = {
    /** @export */
    __syscall_chmod: ___syscall_chmod,
    /** @export */
    __syscall_faccessat: ___syscall_faccessat,
    /** @export */
    __syscall_fchmod: ___syscall_fchmod,
    /** @export */
    __syscall_fchown32: ___syscall_fchown32,
    /** @export */
    __syscall_fcntl64: ___syscall_fcntl64,
    /** @export */
    __syscall_fstat64: ___syscall_fstat64,
    /** @export */
    __syscall_ftruncate64: ___syscall_ftruncate64,
    /** @export */
    __syscall_getcwd: ___syscall_getcwd,
    /** @export */
    __syscall_ioctl: ___syscall_ioctl,
    /** @export */
    __syscall_lstat64: ___syscall_lstat64,
    /** @export */
    __syscall_mkdirat: ___syscall_mkdirat,
    /** @export */
    __syscall_newfstatat: ___syscall_newfstatat,
    /** @export */
    __syscall_openat: ___syscall_openat,
    /** @export */
    __syscall_readlinkat: ___syscall_readlinkat,
    /** @export */
    __syscall_rmdir: ___syscall_rmdir,
    /** @export */
    __syscall_stat64: ___syscall_stat64,
    /** @export */
    __syscall_unlinkat: ___syscall_unlinkat,
    /** @export */
    __syscall_utimensat: ___syscall_utimensat,
    /** @export */
    _localtime_js: __localtime_js,
    /** @export */
    _mmap_js: __mmap_js,
    /** @export */
    _munmap_js: __munmap_js,
    /** @export */
    _tzset_js: __tzset_js,
    /** @export */
    clock_time_get: _clock_time_get,
    /** @export */
    emscripten_date_now: _emscripten_date_now,
    /** @export */
    emscripten_get_heap_max: _emscripten_get_heap_max,
    /** @export */
    emscripten_get_now: _emscripten_get_now,
    /** @export */
    emscripten_resize_heap: _emscripten_resize_heap,
    /** @export */
    environ_get: _environ_get,
    /** @export */
    environ_sizes_get: _environ_sizes_get,
    /** @export */
    fd_close: _fd_close,
    /** @export */
    fd_fdstat_get: _fd_fdstat_get,
    /** @export */
    fd_read: _fd_read,
    /** @export */
    fd_seek: _fd_seek,
    /** @export */
    fd_sync: _fd_sync,
    /** @export */
    fd_write: _fd_write,
    /** @export */
    memory: wasmMemory
  };
  function run2() {
    if (runDependencies > 0) {
      dependenciesFulfilled = run2;
      return;
    }
    preRun();
    if (runDependencies > 0) {
      dependenciesFulfilled = run2;
      return;
    }
    function doRun() {
      Module["calledRun"] = true;
      if (ABORT) return;
      initRuntime();
      readyPromiseResolve?.(Module);
      Module["onRuntimeInitialized"]?.();
      postRun();
    }
    if (Module["setStatus"]) {
      Module["setStatus"]("Running...");
      setTimeout(() => {
        setTimeout(() => Module["setStatus"](""), 1);
        doRun();
      }, 1);
    } else doRun();
  }
  var wasmExports = await createWasm();
  run2();
  Module.runSQLite3PostLoadInit = async function(sqlite3InitScriptInfo, EmscriptenModule, sqlite3IsUnderTest) {
    "use strict";
    delete EmscriptenModule.runSQLite3PostLoadInit;
    /* @preserve
    **
    ** LICENSE for the sqlite3 WebAssembly/JavaScript APIs.
    **
    ** This bundle (typically released as sqlite3.js or sqlite3.mjs)
    ** is an amalgamation of JavaScript source code from two projects:
    **
    ** 1) https://emscripten.org: the Emscripten "glue code" is covered by
    **    the terms of the MIT license and University of Illinois/NCSA
    **    Open Source License, as described at:
    **
    **    https://emscripten.org/docs/introducing_emscripten/emscripten_license.html
    **
    ** 2) https://sqlite.org: all code and documentation labeled as being
    **    from this source are released under the same terms as the sqlite3
    **    C library:
    **
    ** 2022-10-16
    **
    ** The author disclaims copyright to this source code.  In place of a
    ** legal notice, here is a blessing:
    **
    ** *   May you do good and not evil.
    ** *   May you find forgiveness for yourself and forgive others.
    ** *   May you share freely, never taking more than you give.
    */
    /* @preserve
    ** This code was built from sqlite3 version...
    **
    ** SQLITE_VERSION "3.54.1"
    ** SQLITE_VERSION_NUMBER 3054001
    ** SQLITE_SOURCE_ID "2026-10-16 14:45:20 555e07ef33f69a0957d24d8e555b702464a131d6f1607f4c3c1e4551e8e6ca76"
    **
    ** Emscripten SDK: 5.0.5
    */
    globalThis.sqlite3ApiBootstrap = async function sqlite3ApiBootstrap(apiConfig = globalThis.sqlite3ApiConfig || sqlite3ApiBootstrap.defaultConfig) {
      if (sqlite3ApiBootstrap.sqlite3) {
        (sqlite3ApiBootstrap.sqlite3.config || console).warn("sqlite3ApiBootstrap() called multiple times.", "Config and external initializers are ignored on calls after the first.");
        return sqlite3ApiBootstrap.sqlite3;
      }
      const nu = (...obj) => Object.assign(/* @__PURE__ */ Object.create(null), ...obj);
      const config2 = nu({
        exports: void 0,
        memory: void 0,
        bigIntEnabled: !!globalThis.BigInt64Array,
        debug: console.debug.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        log: console.log.bind(console),
        wasmfsOpfsDir: "/opfs",
        /**
        useStdAlloc is just for testing allocator discrepancies. The
        docs guarantee that this is false in the canonical builds. For
        99% of purposes it doesn't matter which allocators we use, but
        it becomes significant with, e.g., sqlite3_deserialize() and
        certain wasm.xWrap.resultAdapter()s.
        */
        useStdAlloc: false
      }, apiConfig);
      Object.assign(config2, {
        allocExportName: config2.useStdAlloc ? "malloc" : "sqlite3_malloc",
        deallocExportName: config2.useStdAlloc ? "free" : "sqlite3_free",
        reallocExportName: config2.useStdAlloc ? "realloc" : "sqlite3_realloc"
      });
      [
        "exports",
        "memory",
        "functionTable",
        "wasmfsOpfsDir"
      ].forEach((k2) => {
        if ("function" === typeof config2[k2]) config2[k2] = config2[k2]();
      });
      const capi = nu();
      const wasm3 = nu();
      const __rcStr = (rc) => {
        return capi.sqlite3_js_rc_str && capi.sqlite3_js_rc_str(rc) || "Unknown result code #" + rc;
      };
      const isInt32 = (n3) => "number" === typeof n3 && n3 === (n3 | 0) && n3 <= 2147483647 && n3 >= -2147483648;
      class SQLite3Error extends Error {
        /**
        Constructs this object with a message depending on its arguments:
        
        If its first argument is an integer, it is assumed to be
        an SQLITE_... result code and it is passed to
        sqlite3.capi.sqlite3_js_rc_str() to stringify it.
        
        If called with exactly 2 arguments and the 2nd is an object,
        that object is treated as the 2nd argument to the parent
        constructor.
        
        The exception's message is created by concatenating its
        arguments with a space between each, except for the
        two-args-with-an-object form and that the first argument will
        get coerced to a string, as described above, if it's an
        integer.
        
        If passed an integer first argument, the error object's
        `resultCode` member will be set to the given integer value,
        else it will be set to capi.SQLITE_ERROR.
        */
        constructor(...args) {
          let rc;
          if (args.length) {
            if (isInt32(args[0])) {
              rc = args[0];
              if (1 === args.length) super(__rcStr(args[0]));
              else {
                const rcStr = __rcStr(rc);
                if ("object" === typeof args[1]) super(rcStr, args[1]);
                else {
                  args[0] = rcStr + ":";
                  super(args.join(" "));
                }
              }
            } else if (2 === args.length && "object" === typeof args[1]) super(...args);
            else super(args.join(" "));
          }
          this.resultCode = rc || capi.SQLITE_ERROR;
          this.name = "SQLite3Error";
        }
      }
      SQLite3Error.toss = (...args) => {
        throw new SQLite3Error(...args);
      };
      const toss3 = SQLite3Error.toss;
      if (config2.wasmfsOpfsDir && !/^\/[^/]+$/.test(config2.wasmfsOpfsDir)) toss3("config.wasmfsOpfsDir must be falsy or in the form '/dir-name'.");
      const bigIntFits64 = function f2(b2) {
        if (!f2._max) {
          f2._max = BigInt("0x7fffffffffffffff");
          f2._min = ~f2._max;
        }
        return b2 >= f2._min && b2 <= f2._max;
      };
      const bigIntFits32 = (b2) => b2 >= -2147483647n - 1n && b2 <= 2147483647n;
      const bigIntFitsDouble = function f2(b2) {
        if (!f2._min) {
          f2._min = Number.MIN_SAFE_INTEGER;
          f2._max = Number.MAX_SAFE_INTEGER;
        }
        return b2 >= f2._min && b2 <= f2._max;
      };
      const isTypedArray = (v2) => {
        return v2 && v2.constructor && isInt32(v2.constructor.BYTES_PER_ELEMENT) ? v2 : false;
      };
      const isBindableTypedArray = (v2) => v2 && (v2 instanceof Uint8Array || v2 instanceof Int8Array || v2 instanceof ArrayBuffer);
      const isSQLableTypedArray = (v2) => v2 && (v2 instanceof Uint8Array || v2 instanceof Int8Array || v2 instanceof ArrayBuffer);
      const affirmBindableTypedArray = (v2) => isBindableTypedArray(v2) || toss3("Value is not of a supported TypedArray type.");
      const flexibleString = function(v2) {
        if (isSQLableTypedArray(v2)) return wasm3.typedArrayToString(v2 instanceof ArrayBuffer ? new Uint8Array(v2) : v2, 0, v2.length);
        else if (Array.isArray(v2)) return v2.join("");
        else if (wasm3.isPtr(v2)) v2 = wasm3.cstrToJs(v2);
        return v2;
      };
      class WasmAllocError extends Error {
        /**
        If called with 2 arguments and the 2nd one is an object, it
        behaves like the Error constructor, else it concatenates all
        arguments together with a single space between each to
        construct an error message string. As a special case, if
        called with no arguments then it uses a default error
        message.
        */
        constructor(...args) {
          if (2 === args.length && "object" === typeof args[1]) super(...args);
          else if (args.length) super(args.join(" "));
          else super("Allocation failed.");
          this.resultCode = capi.SQLITE_NOMEM;
          this.name = "WasmAllocError";
        }
      }
      WasmAllocError.toss = (...args) => {
        throw new WasmAllocError(...args);
      };
      Object.assign(capi, {
        /**
        sqlite3_bind_blob() works exactly like its C counterpart unless
        its 3rd argument is one of:
        
        - JS string: the 3rd argument is converted to a C string, the
        4th argument is ignored, and the C-string's length is used
        in its place.
        
        - Array: converted to a string as defined for "flexible
        strings" and then it's treated as a JS string.
        
        - Int8Array or Uint8Array: wasm.allocFromTypedArray() is used to
        conver the memory to the WASM heap. If the 4th argument is
        0 or greater, it is used as-is, otherwise the array's byteLength
        value is used. This is an exception to the C API's undefined
        behavior for a negative 4th argument, but results are undefined
        if the given 4th argument value is greater than the byteLength
        of the input array.
        
        - If it's an ArrayBuffer, it gets wrapped in a Uint8Array and
        treated as that type.
        
        In all of those cases, the final argument (destructor) is
        ignored and capi.SQLITE_WASM_DEALLOC is assumed.
        
        A 3rd argument of `null` is treated as if it were a WASM pointer
        of 0.
        
        If the 3rd argument is neither a WASM pointer nor one of the
        above-described types, capi.SQLITE_MISUSE is returned.
        
        The first argument may be either an `sqlite3_stmt*` WASM
        pointer or an sqlite3.oo1.Stmt instance.
        
        For consistency with the C API, it requires the same number of
        arguments. It returns capi.SQLITE_MISUSE if passed any other
        argument count.
        */
        sqlite3_bind_blob: void 0,
        /**
        sqlite3_bind_text() works exactly like its C counterpart unless
        its 3rd argument is one of:
        
        - JS string: the 3rd argument is converted to a C string, the
        4th argument is ignored, and the C-string's length is used
        in its place.
        
        - Array: converted to a string as defined for "flexible
        strings". The 4th argument is ignored and a value of -1
        is assumed.
        
        - Int8Array or Uint8Array: is assumed to contain UTF-8 text, is
        converted to a string. The 4th argument is ignored, replaced
        by the array's byteLength value.
        
        - If it's an ArrayBuffer, it gets wrapped in a Uint8Array and
        treated as that type.
        
        In each of those cases, the final argument (text destructor) is
        ignored and capi.SQLITE_WASM_DEALLOC is assumed.
        
        A 3rd argument of `null` is treated as if it were a WASM pointer
        of 0.
        
        If the 3rd argument is neither a WASM pointer nor one of the
        above-described types, capi.SQLITE_MISUSE is returned.
        
        The first argument may be either an `sqlite3_stmt*` WASM
        pointer or an sqlite3.oo1.Stmt instance.
        
        For consistency with the C API, it requires the same number of
        arguments. It returns capi.SQLITE_MISUSE if passed any other
        argument count.
        
        If client code needs to bind partial strings, it needs to
        either parcel the string up before passing it in here or it
        must pass in a WASM pointer for the 3rd argument and a valid
        4th-argument value, taking care not to pass a value which
        truncates a multi-byte UTF-8 character. When passing
        WASM-format strings, it is important that the final argument be
        valid or unexpected content can result, or WASM may crash if
        the application reads past the WASM heap bounds.
        */
        sqlite3_bind_text: void 0,
        /**
        sqlite3_create_function_v2() differs from its native
        counterpart only in the following ways:
        
        1) The fourth argument (`eTextRep`) argument must not specify
        any encoding other than sqlite3.SQLITE_UTF8. The JS API does not
        currently support any other encoding and likely never
        will. This function does not replace that argument on its own
        because it may contain other flags. As a special case, if
        the bottom 4 bits of that argument are 0, SQLITE_UTF8 is
        assumed.
        
        2) Any of the four final arguments may be either WASM pointers
        (assumed to be function pointers) or JS Functions. In the
        latter case, each gets bound to WASM using
        sqlite3.capi.wasm.installFunction() and that wrapper is passed
        on to the native implementation.
        
        For consistency with the C API, it requires the same number of
        arguments. It returns capi.SQLITE_MISUSE if passed any other
        argument count.
        
        The semantics of JS functions are:
        
        xFunc: is passed `(pCtx, ...values)`. Its return value becomes
        the new SQL function's result.
        
        xStep: is passed `(pCtx, ...values)`. Its return value is
        ignored.
        
        xFinal: is passed `(pCtx)`. Its return value becomes the new
        aggregate SQL function's result.
        
        xDestroy: is passed `(void*)`. Its return value is ignored. The
        pointer passed to it is the one from the 5th argument to
        sqlite3_create_function_v2().
        
        Note that:
        
        - `pCtx` in the above descriptions is a `sqlite3_context*`. At
        least 99 times out of a hundred, that initial argument will
        be irrelevant for JS UDF bindings, but it needs to be there
        so that the cases where it _is_ relevant, in particular with
        window and aggregate functions, have full access to the
        lower-level sqlite3 APIs.
        
        - When wrapping JS functions, the remaining arguments are passd
        to them as positional arguments, not as an array of
        arguments, because that allows callback definitions to be
        more JS-idiomatic than C-like. For example `(pCtx,a,b)=>a+b`
        is more intuitive and legible than
        `(pCtx,args)=>args[0]+args[1]`. For cases where an array of
        arguments would be more convenient, the callbacks simply need
        to be declared like `(pCtx,...args)=>{...}`, in which case
        `args` will be an array.
        
        - If a JS wrapper throws, it gets translated to
        sqlite3_result_error() or sqlite3_result_error_nomem(),
        depending on whether the exception is an
        sqlite3.WasmAllocError object or not.
        
        - When passing on WASM function pointers, arguments are _not_
        converted or reformulated. They are passed on as-is in raw
        pointer form using their native C signatures. Only JS
        functions passed in to this routine, and thus wrapped by this
        routine, get automatic conversions of arguments and result
        values. The routines which perform those conversions are
        exposed for client-side use as sqlite3_values_to_js(),
        sqlite3_result_js(), and sqlite3_result_error_js().
        
        For xFunc(), xStep(), and xFinal():
        
        - When called from SQL, arguments to the UDF, and its result,
        will be converted between JS and SQL with as much fidelity as
        is feasible, triggering an exception if a type conversion
        cannot be determined. Some freedom is afforded to numeric
        conversions due to friction between the JS and C worlds:
        integers which are larger than 32 bits may be treated as
        doubles or BigInts.
        
        If any JS-side bound functions throw, those exceptions are
        intercepted and converted to database-side errors with the
        exception of xDestroy(): any exception from it is ignored,
        possibly generating a console.error() message.  Destructors
        must not throw.
        
        Automatically-converted JS-to-WASM functions will be cleaned up
        either when (A) this function is called again with the same
        name, arity, and encoding, but null/0 values for the functions,
        or (B) when pDb is passed to sqlite3_close_v2(). If this factor
        is relevant for a given client, they can create WASM-bound JS
        functions themselves, hold on to their pointers, and pass the
        pointers in to here. Later on, they can free those pointers
        (using `wasm.uninstallFunction()` or equivalent).
        
        C reference: https://sqlite.org/c3ref/create_function.html
        
        Maintenance reminder: the ability to add new
        WASM-accessible functions to the runtime requires that the
        WASM build is compiled with emcc's `-sALLOW_TABLE_GROWTH`
        flag.
        */
        sqlite3_create_function_v2: (pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal, xDestroy) => {
        },
        /**
        Equivalent to passing the same arguments to
        sqlite3_create_function_v2(), with 0 as the final argument.
        */
        sqlite3_create_function: (pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal) => {
        },
        /**
        The sqlite3_create_window_function() JS wrapper differs from
        its native implementation in the exact same way that
        sqlite3_create_function_v2() does. The additional function,
        xInverse(), is treated identically to xStep() by the wrapping
        layer.
        */
        sqlite3_create_window_function: (pDb2, funcName, nArg, eTextRep, pApp, xStep, xFinal, xValue, xInverse, xDestroy) => {
        },
        /**
        The sqlite3_prepare_v3() binding handles two different uses
        with differing JS/WASM semantics:
        
        1) sqlite3_prepare_v3(pDb, sqlString, -1, prepFlags, ppStmt , null)
        
        2) sqlite3_prepare_v3(pDb, sqlPointer, sqlByteLen, prepFlags, ppStmt, sqlPointerToPointer)
        
        The SQL length argument (the 3rd argument) must, for usage (1),
        always be negative because it must be a byte length and that
        value is expensive to calculate from JS (where only the
        character length of strings is readily available). It is
        retained in this API's interface for code/documentation
        compatibility reasons but is currently _always_ ignored. With
        usage (2), the 3rd argument is used as-is but is is still
        critical that the C-style input string (2nd argument) be
        terminated with a 0 byte.
        
        In usage (1), the 2nd argument must be of type string,
        Uint8Array, Int8Array, or ArrayBuffer (all of which are assumed
        to hold SQL). If it is, this function assumes case (1) and
        calls the underyling C function with the equivalent of:
        
        (pDb, sqlAsString, -1, prepFlags, ppStmt, null)
        
        The `pzTail` argument is ignored in this case because its
        result is meaningless when a string-type value is passed
        through: the string goes through another level of internal
        conversion for WASM's sake and the result pointer would refer
        to that transient conversion's memory, not the passed-in
        string.
        
        If the sql argument is not a string, it must be a _pointer_ to
        a NUL-terminated string which was allocated in the WASM memory
        (e.g. using capi.wasm.alloc() or equivalent). In that case,
        the final argument may be 0/null/undefined or must be a pointer
        to which the "tail" of the compiled SQL is written, as
        documented for the C-side sqlite3_prepare_v3().
        
        In case (2), the underlying C function is called with the
        equivalent of:
        
        (pDb, sqlAsPointer, sqlByteLen, prepFlags, ppStmt, pzTail)
        
        It returns its result and compiled statement as documented in
        the C API. Fetching the output pointers (5th and 6th
        parameters) requires using `capi.wasm.peek()` (or
        equivalent) and the `pzTail` will point to an address relative to
        the `sqlAsPointer` value.
        
        If passed an invalid 2nd argument type, this function will
        return SQLITE_MISUSE and sqlite3_errmsg() will contain a string
        describing the problem.
        
        Side-note: if given an empty string, or one which contains only
        comments or an empty SQL expression, 0 is returned but the result
        output pointer will be NULL.
        */
        sqlite3_prepare_v3: (dbPtr, sql, sqlByteLen, prepFlags, stmtPtrPtr, strPtrPtr) => {
        },
        /**
        Equivalent to calling sqlite3_prapare_v3() with 0 as its 4th argument.
        */
        sqlite3_prepare_v2: (dbPtr, sql, sqlByteLen, stmtPtrPtr, strPtrPtr) => {
        },
        /**
        This binding enables the callback argument to be a JavaScript.
        
        If the callback is a function, then for the duration of the
        sqlite3_exec() call, it installs a WASM-bound function which
        acts as a proxy for the given callback. That proxy will also
        perform a conversion of the callback's arguments from
        `(char**)` to JS arrays of strings. However, for API
        consistency's sake it will still honor the C-level callback
        parameter order and will call it like:
        
        `callback(pVoid, colCount, listOfValues, listOfColNames)`
        
        If the callback is not a JS function then this binding performs
        no translation of the callback, but the sql argument is still
        converted to a WASM string for the call using the
        "string:flexible" argument converter.
        */
        sqlite3_exec: (pDb2, sql, callback, pVoid, pErrMsg) => {
        },
        /**
        If passed a single argument which appears to be a byte-oriented
        TypedArray (Int8Array or Uint8Array), this function treats that
        TypedArray as an output target, fetches `theArray.byteLength`
        bytes of randomness, and populates the whole array with it. As
        a special case, if the array's length is 0, this function
        behaves as if it were passed (0,0). When called this way, it
        returns its argument, else it returns the `undefined` value.
        
        If called with any other arguments, they are passed on as-is
        to the C API. Results are undefined if passed any incompatible
        values.
        */
        sqlite3_randomness: (n3, outPtr) => {
        }
      });
      const util = {
        affirmBindableTypedArray,
        flexibleString,
        bigIntFits32,
        bigIntFits64,
        bigIntFitsDouble,
        isBindableTypedArray,
        isInt32,
        isSQLableTypedArray,
        isTypedArray,
        isUIThread: () => globalThis.window === globalThis && !!globalThis.document,
        toss: function(...args) {
          throw new Error(args.join(" "));
        },
        toss3,
        typedArrayPart: wasm3.typedArrayPart,
        nu,
        assert: function(arg, msg) {
          if (!arg) util.toss("Assertion failed:", msg);
        },
        /**
        Given a byte array or ArrayBuffer, this function throws if the
        lead bytes of that buffer do not hold a SQLite3 database header,
        else it returns without side effects.
        
        Added in 3.44. As of 3.54 in SEE builds it performs only a
        rudimentary length check and does not fail for invalid header
        bytes, under the assumption that the input may be an encrypted
        db. We cannot unambiguously distinguish an encrypted db from
        garbage bytes.
        */
        affirmDbHeader: function(bytes) {
          if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
          const header = "SQLite format 3";
          if (15 > bytes.byteLength) toss3("Input does not contain an SQLite3 database header.");
          for (let i = 0; i < 15; ++i) if (header.charCodeAt(i) !== bytes[i]) toss3("Input does not contain an SQLite3 database header.");
        },
        /**
        Given a byte array or ArrayBuffer, this function throws if the
        database does not, at a cursory glance, appear to be an SQLite3
        database. It only examines the size and header, but further
        checks may be added in the future.
        
        Added in 3.44. See notes in affirmDbHeader() regarding SEE
        builds.
        */
        affirmIsDb: function(bytes) {
          if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
          const n3 = bytes.byteLength;
          if (n3 < 512 || n3 % 512 !== 0) toss3("Byte array size", n3, "is invalid for an SQLite3 db.");
          util.affirmDbHeader(bytes);
        }
      };
      Object.assign(wasm3, {
        /**
        The symbols exported by the WASM environment.
        */
        exports: config2.exports || toss3("Missing API config.exports (WASM module exports)."),
        /**
        When Emscripten compiles with `-sIMPORTED_MEMORY`, it
        initializes the heap and imports it into wasm, as opposed to
        the other way around. In this case, the memory is not available
        via this.exports.memory so the client must pass it in via
        config.memory.
        */
        memory: config2.memory || config2.exports["memory"] || toss3("API config object requires a WebAssembly.Memory object", "in either config.exports.memory (exported)", "or config.memory (imported)."),
        /**
        The WASM pointer size. If set then it MUST be one of 4 or 8 and
        it MUST correspond to the WASM environment's pointer size. We
        figure out the size by calling some un-JS-wrapped WASM function
        which returns a pointer-type value. If that value is a BigInt,
        it's 64-bit, else it's 32-bit. The pieces which populate
        sqlite3.wasm (whwasmutil.js) can figure this out _if_ they can
        allocate, but we have a chicken/egg situation there which makes
        it illegal for that code to invoke wasm.dealloc() at the time
        it would be needed. So we need to configure it ahead of time
        (here) instead.
        */
        pointerSize: "number" === typeof config2.exports.sqlite3_libversion() ? 4 : 8,
        /**
        True if BigInt support was enabled via (e.g.) the
        Emscripten -sWASM_BIGINT flag, else false. When
        enabled, certain 64-bit sqlite3 APIs are enabled which
        are not otherwise enabled due to JS/WASM int64
        impedance mismatches.
        */
        bigIntEnabled: !!config2.bigIntEnabled,
        /**
        WebAssembly.Table object holding the indirect function call
        table. Defaults to exports.__indirect_function_table.
        */
        functionTable: config2.functionTable,
        /**
        The API's primary point of access to the WASM-side memory
        allocator.  Works like sqlite3_malloc() but throws a
        WasmAllocError if allocation fails. It is important that any
        code which might pass through the sqlite3 C API NOT throw and
        must instead return SQLITE_NOMEM (or equivalent, depending on
        the context).
        
        Very few cases in the sqlite3 JS APIs can result in
        client-defined functions propagating exceptions via the C-style
        API. Most notably, this applies to WASM-bound JS functions
        which are created directly by clients and passed on _as WASM
        function pointers_ to functions such as
        sqlite3_create_function_v2(). Such bindings created
        transparently by this API will automatically use wrappers which
        catch exceptions and convert them to appropriate error codes.
        
        For cases where non-throwing allocation is required, use
        this.alloc.impl(), which is the unadulterated WASM-exported
        counterpart of this wrapper.
        
        Design note: this function is not named "malloc" primarily
        because Emscripten uses that name and we wanted to avoid any
        confusion early on in this code's development, when it still
        had close ties to Emscripten's glue code.
        */
        alloc: void 0,
        /**
        Rarely necessary in JS code, this routine works like
        sqlite3_realloc(M,N), where M is either NULL or a pointer
        obtained from this function or this.alloc() and N is the number
        of bytes to reallocate the block to. Returns a pointer to the
        reallocated block or 0 if allocation fails.
        
        If M is NULL and N is positive, this behaves like
        this.alloc(N). If N is 0, it behaves like this.dealloc().
        Results are undefined if N is negative (sqlite3_realloc()
        treats that as 0, but if this code is built with a different
        allocator it may misbehave with negative values).
        
        Like this.alloc.impl(), this.realloc.impl() is a direct binding
        to the underlying realloc() implementation which does not throw
        exceptions, instead returning 0 (or 0n) on allocation error.
        */
        realloc: void 0,
        /**
        The API's primary point of access to the WASM-side memory
        deallocator. Works like sqlite3_free().
        
        Design note: this function is not named "free" for the same
        reason that this.alloc() is not called this.malloc().
        */
        dealloc: void 0
      });
      wasm3.allocFromTypedArray = function(srcTypedArray) {
        if (srcTypedArray instanceof ArrayBuffer) srcTypedArray = new Uint8Array(srcTypedArray);
        affirmBindableTypedArray(srcTypedArray);
        const pRet = wasm3.alloc(srcTypedArray.byteLength || 1);
        wasm3.heapForSize(srcTypedArray.constructor).set(srcTypedArray.byteLength ? srcTypedArray : [0], Number(pRet));
        return pRet;
      };
      {
        const keyAlloc = config2.allocExportName, keyDealloc = config2.deallocExportName, keyRealloc = config2.reallocExportName;
        for (const key of [
          keyAlloc,
          keyDealloc,
          keyRealloc
        ]) if (!(wasm3.exports[key] instanceof Function)) toss3("Missing required exports[", key, "] function.");
        wasm3.alloc = function f2(n3) {
          return f2.impl(n3) || WasmAllocError.toss("Failed to allocate", n3, " bytes.");
        };
        wasm3.alloc.impl = wasm3.exports[keyAlloc];
        wasm3.realloc = function f2(m, n3) {
          const m2 = f2.impl(wasm3.ptr.coerce(m), n3);
          return n3 ? m2 || WasmAllocError.toss("Failed to reallocate", n3, " bytes.") : wasm3.ptr.null;
        };
        wasm3.realloc.impl = wasm3.exports[keyRealloc];
        wasm3.dealloc = function f2(m) {
          f2.impl(wasm3.ptr.coerce(m));
        };
        wasm3.dealloc.impl = wasm3.exports[keyDealloc];
      }
      wasm3.compileOptionUsed = function f2(optName) {
        if (!arguments.length) {
          if (f2._result) return f2._result;
          else if (!f2._opt) {
            f2._rx = /^([^=]+)=(.+)/;
            f2._rxInt = /^-?\d+$/;
            f2._opt = function(opt, rv) {
              const m = f2._rx.exec(opt);
              rv[0] = m ? m[1] : opt;
              rv[1] = m ? f2._rxInt.test(m[2]) ? +m[2] : m[2] : true;
            };
          }
          const rc = nu(), ov = [0, 0];
          let i = 0, k2;
          while (k2 = capi.sqlite3_compileoption_get(i++)) {
            f2._opt(k2, ov);
            rc[ov[0]] = ov[1];
          }
          return f2._result = rc;
        } else if (Array.isArray(optName)) {
          const rc = nu();
          optName.forEach((v2) => {
            rc[v2] = capi.sqlite3_compileoption_used(v2);
          });
          return rc;
        } else if ("object" === typeof optName) {
          Object.keys(optName).forEach((k2) => {
            optName[k2] = capi.sqlite3_compileoption_used(k2);
          });
          return optName;
        }
        return "string" === typeof optName ? !!capi.sqlite3_compileoption_used(optName) : false;
      };
      wasm3.pstack = nu({
        /**
        Sets the current pstack position to the given pointer. Results
        are undefined if the passed-in value did not come from
        this.pointer.
        
        In debug builds this may trigger an assert() in the WASM
        environment if passed an illegal value.
        */
        restore: wasm3.exports.sqlite3__wasm_pstack_restore,
        /**
        Attempts to allocate the given number of bytes from the
        pstack. On success, it zeroes out a block of memory of the
        given size, adjusts the pstack pointer, and returns a pointer
        to the memory. On error, throws a WasmAllocError. The
        memory must eventually be released using restore().
        
        If n is a string, it must be a WASM "IR" value in the set
        accepted by wasm.sizeofIR(), which is mapped to the size of
        that data type. If passed a string not in that set, it throws a
        WasmAllocError.
        
        This method always adjusts the given value to be a multiple
        of 8 bytes because failing to do so can lead to incorrect
        results when reading and writing 64-bit values from/to the WASM
        heap. Similarly, the returned address is always 8-byte aligned.
        */
        alloc: function(n3) {
          if ("string" === typeof n3 && !(n3 = wasm3.sizeofIR(n3))) WasmAllocError.toss("Invalid value for pstack.alloc(", arguments[0], ")");
          return wasm3.exports.sqlite3__wasm_pstack_alloc(n3) || WasmAllocError.toss("Could not allocate", n3, "bytes from the pstack.");
        },
        /**
        alloc()'s n chunks, each sz bytes, as a single memory block and
        returns the addresses as an array of n element, each holding
        the address of one chunk.
        
        sz may optionally be an IR string accepted by wasm.sizeofIR().
        
        Throws a WasmAllocError if allocation fails.
        
        Example:
        
        ```
        const [p1, p2, p3] = wasm.pstack.allocChunks(3, wasm.ptr.size);
        ```
        */
        allocChunks: function(n3, sz) {
          if ("string" === typeof sz && !(sz = wasm3.sizeofIR(sz))) WasmAllocError.toss("Invalid size value for allocChunks(", arguments[1], ")");
          const mem = wasm3.pstack.alloc(n3 * sz);
          const rc = [mem];
          let i = 1, offset = sz;
          for (; i < n3; ++i, offset += sz) rc.push(wasm3.ptr.add(mem, offset));
          return rc;
        },
        /**
        A convenience wrapper for allocChunks() which sizes each chunk
        as either 8 bytes (safePtrSize is truthy) or wasm.ptr.size (if
        safePtrSize is falsy).
        
        How it returns its result differs depending on its first
        argument: if it's 1, it returns a single pointer value. If it's
        more than 1, it returns the same as allocChunks().
        
        When a returned pointer will refer to a 64-bit value, e.g. a
        double or int64, and that value must be written or fetched,
        e.g. using wasm.poke() or wasm.peek(), it is
        important that the pointer in question be aligned to an 8-byte
        boundary or else it will not be fetched or written properly and
        will corrupt or read neighboring memory.
        
        However, when all pointers involved point to "small" data, it
        is safe to pass a falsy value to save a tiny bit of memory.
        */
        allocPtr: (n3 = 1, safePtrSize = true) => {
          return 1 === n3 ? wasm3.pstack.alloc(safePtrSize ? 8 : wasm3.ptr.size) : wasm3.pstack.allocChunks(n3, safePtrSize ? 8 : wasm3.ptr.size);
        },
        /**
        Records the current pstack position, calls the given function,
        passing it the sqlite3 object, then restores the pstack
        regardless of whether the function throws. Returns the result
        of the call or propagates an exception on error.
        
        Added in 3.44.
        */
        call: function(f2) {
          const stackPos = wasm3.pstack.pointer;
          try {
            return f2(sqlite3);
          } finally {
            wasm3.pstack.restore(stackPos);
          }
        }
      });
      Object.defineProperties(wasm3.pstack, {
        /**
        Resolves to the current pstack position pointer either as a
        Number (32-bit WASM) or BigInt (64-bit WASM). This value is
        intended _only_ to be saved for passing to restore(). Writing
        to this memory, without first reserving it via
        wasm.pstack.alloc() and friends, leads to undefined results.
        */
        pointer: {
          configurable: false,
          iterable: true,
          writeable: false,
          get: wasm3.exports.sqlite3__wasm_pstack_ptr
        },
        /**
        Resolves to the total number of bytes available in the pstack
        allocator, including any space which is currently
        allocated. This value is a compile-time constant.
        */
        quota: {
          configurable: false,
          iterable: true,
          writeable: false,
          get: wasm3.exports.sqlite3__wasm_pstack_quota
        },
        /**
        Resolves to the number of bytes remaining in the pstack
        allocator.
        */
        remaining: {
          configurable: false,
          iterable: true,
          writeable: false,
          get: wasm3.exports.sqlite3__wasm_pstack_remaining
        }
      });
      capi.sqlite3_randomness = (...args) => {
        if (1 === args.length && util.isTypedArray(args[0]) && 1 === args[0].BYTES_PER_ELEMENT) {
          const ta = args[0];
          if (0 === ta.byteLength) {
            wasm3.exports.sqlite3_randomness(0, wasm3.ptr.null);
            return ta;
          }
          const stack = wasm3.pstack.pointer;
          try {
            let n3 = ta.byteLength, offset = 0;
            const r2 = wasm3.exports.sqlite3_randomness;
            const heap = wasm3.heap8u();
            const nAlloc = n3 < 512 ? n3 : 512;
            const ptr = wasm3.pstack.alloc(nAlloc);
            do {
              const j = n3 > nAlloc ? nAlloc : n3;
              r2(j, ptr);
              ta.set(wasm3.typedArrayPart(heap, ptr, wasm3.ptr.add(ptr, j)), offset);
              n3 -= j;
              offset += j;
            } while (n3 > 0);
          } catch (e4) {
            config2.error("Highly unexpected (and ignored!) exception in sqlite3_randomness():", e4);
          } finally {
            wasm3.pstack.restore(stack);
          }
          return ta;
        }
        wasm3.exports.sqlite3_randomness(...args);
      };
      capi.sqlite3_wasmfs_opfs_dir = function() {
        if (void 0 !== this.dir) return this.dir;
        const pdir = config2.wasmfsOpfsDir;
        if (!pdir || !globalThis.FileSystemHandle || !globalThis.FileSystemDirectoryHandle || !globalThis.FileSystemFileHandle || !wasm3.exports.sqlite3__wasm_init_wasmfs) return this.dir = "";
        try {
          if (pdir && 0 === wasm3.xCallWrapped("sqlite3__wasm_init_wasmfs", "i32", ["string"], pdir)) return this.dir = pdir;
          else return this.dir = "";
        } catch (e4) {
          return this.dir = "";
        }
      }.bind(nu());
      capi.sqlite3_wasmfs_filename_is_persistent = function(name) {
        const p2 = capi.sqlite3_wasmfs_opfs_dir();
        return p2 && name ? name.startsWith(p2 + "/") : false;
      };
      capi.sqlite3_js_db_uses_vfs = function(pDb2, vfsName, dbName = 0) {
        try {
          const pK = capi.sqlite3_vfs_find(vfsName);
          if (!pK) return false;
          else if (!pDb2) return pK === capi.sqlite3_vfs_find(0) ? pK : false;
          else return pK === capi.sqlite3_js_db_vfs(pDb2, dbName) ? pK : false;
        } catch (e4) {
          return false;
        }
      };
      capi.sqlite3_js_vfs_list = function() {
        const rc = [];
        let pVfs = capi.sqlite3_vfs_find(wasm3.ptr.null);
        while (pVfs) {
          const oVfs = new capi.sqlite3_vfs(pVfs);
          rc.push(wasm3.cstrToJs(oVfs.$zName));
          pVfs = oVfs.$pNext;
          oVfs.dispose();
        }
        return rc;
      };
      capi.sqlite3_js_db_export = function(pDb2, schema = 0) {
        pDb2 = wasm3.xWrap.testConvertArg("sqlite3*", pDb2);
        if (!pDb2) toss3("Invalid sqlite3* argument.");
        if (!wasm3.bigIntEnabled) toss3("BigInt support is not enabled.");
        const scope = wasm3.scopedAllocPush();
        let pOut;
        try {
          const pSize = wasm3.scopedAlloc(8 + wasm3.ptr.size);
          const ppOut = wasm3.ptr.add(pSize, 8);
          const zSchema = schema ? wasm3.isPtr(schema) ? schema : wasm3.scopedAllocCString("" + schema) : wasm3.ptr.null;
          let rc = wasm3.exports.sqlite3__wasm_db_serialize(pDb2, zSchema, ppOut, pSize, 0);
          if (rc) toss3("Database serialization failed with code", sqlite3.capi.sqlite3_js_rc_str(rc));
          pOut = wasm3.peekPtr(ppOut);
          const nOut = wasm3.peek(pSize, "i64");
          rc = nOut ? wasm3.heap8u().slice(Number(pOut), Number(pOut) + Number(nOut)) : /* @__PURE__ */ new Uint8Array();
          return rc;
        } finally {
          if (pOut) wasm3.exports.sqlite3_free(pOut);
          wasm3.scopedAllocPop(scope);
        }
      };
      capi.sqlite3_js_db_vfs = (dbPointer, dbName = wasm3.ptr.null) => util.sqlite3__wasm_db_vfs(dbPointer, dbName);
      capi.sqlite3_js_aggregate_context = (pCtx, n3) => {
        return capi.sqlite3_aggregate_context(pCtx, n3) || (n3 ? WasmAllocError.toss("Cannot allocate", n3, "bytes for sqlite3_aggregate_context()") : 0);
      };
      capi.sqlite3_js_posix_create_file = function(filename, data, dataLen) {
        let pData;
        if (data && wasm3.isPtr(data)) pData = data;
        else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
          pData = wasm3.allocFromTypedArray(data);
          if (arguments.length < 3 || !util.isInt32(dataLen) || dataLen < 0) dataLen = data.byteLength;
        } else SQLite3Error.toss("Invalid 2nd argument for sqlite3_js_posix_create_file().");
        try {
          if (!util.isInt32(dataLen) || dataLen < 0) SQLite3Error.toss("Invalid 3rd argument for sqlite3_js_posix_create_file().");
          const rc = util.sqlite3__wasm_posix_create_file(filename, pData, dataLen);
          if (rc) SQLite3Error.toss("Creation of file failed with sqlite3 result code", capi.sqlite3_js_rc_str(rc));
        } finally {
          if (pData && pData !== data) wasm3.dealloc(pData);
        }
      };
      capi.sqlite3_js_vfs_create_file = function(vfs, filename, data, dataLen) {
        config2.warn("sqlite3_js_vfs_create_file() is deprecated and", "should be avoided because it can lead to C-level crashes.", "See its documentation for alternatives.");
        let pData;
        if (data) {
          if (wasm3.isPtr(data)) pData = data;
          else {
            if (data instanceof ArrayBuffer) data = new Uint8Array(data);
            if (data instanceof Uint8Array) {
              pData = wasm3.allocFromTypedArray(data);
              if (arguments.length < 4 || !util.isInt32(dataLen) || dataLen < 0) dataLen = data.byteLength;
            } else SQLite3Error.toss("Invalid 3rd argument type for sqlite3_js_vfs_create_file().");
          }
        } else pData = 0;
        if (!util.isInt32(dataLen) || dataLen < 0) {
          if (pData && pData !== data) wasm3.dealloc(pData);
          SQLite3Error.toss("Invalid 4th argument for sqlite3_js_vfs_create_file().");
        }
        try {
          const rc = util.sqlite3__wasm_vfs_create_file(vfs, filename, pData, dataLen);
          if (rc) SQLite3Error.toss("Creation of file failed with sqlite3 result code", capi.sqlite3_js_rc_str(rc));
        } finally {
          if (pData && pData !== data) wasm3.dealloc(pData);
        }
      };
      capi.sqlite3_js_sql_to_string = (sql) => {
        if ("string" === typeof sql) return sql;
        const x = flexibleString(v);
        return x === v ? void 0 : x;
      };
      capi.sqlite3_db_config = function(pDb2, op, ...args) {
        switch (op) {
          case capi.SQLITE_DBCONFIG_ENABLE_FKEY:
          case capi.SQLITE_DBCONFIG_ENABLE_TRIGGER:
          case capi.SQLITE_DBCONFIG_ENABLE_FTS3_TOKENIZER:
          case capi.SQLITE_DBCONFIG_ENABLE_LOAD_EXTENSION:
          case capi.SQLITE_DBCONFIG_NO_CKPT_ON_CLOSE:
          case capi.SQLITE_DBCONFIG_ENABLE_QPSG:
          case capi.SQLITE_DBCONFIG_TRIGGER_EQP:
          case capi.SQLITE_DBCONFIG_RESET_DATABASE:
          case capi.SQLITE_DBCONFIG_DEFENSIVE:
          case capi.SQLITE_DBCONFIG_WRITABLE_SCHEMA:
          case capi.SQLITE_DBCONFIG_LEGACY_ALTER_TABLE:
          case capi.SQLITE_DBCONFIG_DQS_DML:
          case capi.SQLITE_DBCONFIG_DQS_DDL:
          case capi.SQLITE_DBCONFIG_ENABLE_VIEW:
          case capi.SQLITE_DBCONFIG_LEGACY_FILE_FORMAT:
          case capi.SQLITE_DBCONFIG_TRUSTED_SCHEMA:
          case capi.SQLITE_DBCONFIG_STMT_SCANSTATUS:
          case capi.SQLITE_DBCONFIG_REVERSE_SCANORDER:
          case capi.SQLITE_DBCONFIG_ENABLE_ATTACH_CREATE:
          case capi.SQLITE_DBCONFIG_ENABLE_ATTACH_WRITE:
          case capi.SQLITE_DBCONFIG_ENABLE_COMMENTS:
          case capi.SQLITE_DBCONFIG_FP_DIGITS:
            if (!this.ip) this.ip = wasm3.xWrap("sqlite3__wasm_db_config_ip", "int", [
              "sqlite3*",
              "int",
              "int",
              "*"
            ]);
            return this.ip(pDb2, op, args[0], args[1] || 0);
          case capi.SQLITE_DBCONFIG_LOOKASIDE:
            if (!this.pii) this.pii = wasm3.xWrap("sqlite3__wasm_db_config_pii", "int", [
              "sqlite3*",
              "int",
              "*",
              "int",
              "int"
            ]);
            return this.pii(pDb2, op, args[0], args[1], args[2]);
          case capi.SQLITE_DBCONFIG_MAINDBNAME:
            if (!this.s) this.s = wasm3.xWrap("sqlite3__wasm_db_config_s", "int", [
              "sqlite3*",
              "int",
              "string:static"
            ]);
            return this.s(pDb2, op, args[0]);
          default:
            return capi.SQLITE_MISUSE;
        }
      }.bind(nu());
      capi.sqlite3_value_to_js = function(pVal, throwIfCannotConvert = true) {
        let arg;
        const valType = capi.sqlite3_value_type(pVal);
        switch (valType) {
          case capi.SQLITE_INTEGER:
            if (wasm3.bigIntEnabled) {
              arg = capi.sqlite3_value_int64(pVal);
              if (util.bigIntFitsDouble(arg)) arg = Number(arg);
            } else arg = capi.sqlite3_value_double(pVal);
            break;
          case capi.SQLITE_FLOAT:
            arg = capi.sqlite3_value_double(pVal);
            break;
          case capi.SQLITE_TEXT:
            arg = capi.sqlite3_value_text(pVal);
            break;
          case capi.SQLITE_BLOB: {
            const n3 = capi.sqlite3_value_bytes(pVal);
            const pBlob = capi.sqlite3_value_blob(pVal);
            if (n3 && !pBlob) sqlite3.WasmAllocError.toss("Cannot allocate memory for blob argument of", n3, "byte(s)");
            arg = n3 ? wasm3.heap8u().slice(Number(pBlob), Number(pBlob) + Number(n3)) : null;
            break;
          }
          case capi.SQLITE_NULL:
            arg = null;
            break;
          default:
            if (throwIfCannotConvert) toss3(capi.SQLITE_MISMATCH, "Unhandled sqlite3_value_type():", valType);
            arg = void 0;
        }
        return arg;
      };
      capi.sqlite3_values_to_js = function(argc, pArgv, throwIfCannotConvert = true) {
        let i;
        const tgt = [];
        for (i = 0; i < argc; ++i)
          tgt.push(capi.sqlite3_value_to_js(wasm3.peekPtr(wasm3.ptr.add(pArgv, wasm3.ptr.size * i)), throwIfCannotConvert));
        return tgt;
      };
      capi.sqlite3_result_error_js = function(pCtx, e4) {
        if (e4 instanceof WasmAllocError) capi.sqlite3_result_error_nomem(pCtx);
        else capi.sqlite3_result_error(pCtx, "" + e4, -1);
      };
      capi.sqlite3_result_js = function(pCtx, val) {
        if (val instanceof Error) {
          capi.sqlite3_result_error_js(pCtx, val);
          return;
        }
        try {
          switch (typeof val) {
            case "undefined":
              break;
            case "boolean":
              capi.sqlite3_result_int(pCtx, val ? 1 : 0);
              break;
            case "bigint":
              if (util.bigIntFits32(val)) capi.sqlite3_result_int(pCtx, Number(val));
              else if (util.bigIntFitsDouble(val)) capi.sqlite3_result_double(pCtx, Number(val));
              else if (wasm3.bigIntEnabled) {
                if (util.bigIntFits64(val)) capi.sqlite3_result_int64(pCtx, val);
                else toss3("BigInt value", val.toString(), "is too BigInt for int64.");
              } else toss3("BigInt value", val.toString(), "is too BigInt.");
              break;
            case "number": {
              let f2;
              if (util.isInt32(val)) f2 = capi.sqlite3_result_int;
              else if (wasm3.bigIntEnabled && Number.isInteger(val) && util.bigIntFits64(BigInt(val))) f2 = capi.sqlite3_result_int64;
              else f2 = capi.sqlite3_result_double;
              f2(pCtx, val);
              break;
            }
            case "string": {
              const [p2, n3] = wasm3.allocCString(val, true);
              capi.sqlite3_result_text(pCtx, p2, n3, capi.SQLITE_WASM_DEALLOC);
              break;
            }
            case "object":
              if (null === val) {
                capi.sqlite3_result_null(pCtx);
                break;
              } else if (util.isBindableTypedArray(val)) {
                const pBlob = wasm3.allocFromTypedArray(val);
                capi.sqlite3_result_blob(pCtx, pBlob, val.byteLength, capi.SQLITE_WASM_DEALLOC);
                break;
              }
            default:
              toss3("Don't not how to handle this UDF result value:", typeof val, val);
          }
        } catch (e4) {
          capi.sqlite3_result_error_js(pCtx, e4);
        }
      };
      capi.sqlite3_column_js = function(pStmt, iCol, throwIfCannotConvert = true) {
        const v2 = capi.sqlite3_column_value(pStmt, iCol);
        return 0 === v2 ? void 0 : capi.sqlite3_value_to_js(v2, throwIfCannotConvert);
      };
      {
        const __newOldValue = function(pObj, iCol, impl) {
          impl = capi[impl];
          if (!this.ptr) this.ptr = wasm3.allocPtr();
          else wasm3.pokePtr(this.ptr, 0);
          const rc = impl(pObj, iCol, this.ptr);
          if (rc) return SQLite3Error.toss(rc, arguments[2] + "() failed with code " + rc);
          const pv = wasm3.peekPtr(this.ptr);
          return pv ? capi.sqlite3_value_to_js(pv, true) : void 0;
        }.bind(nu());
        capi.sqlite3_preupdate_new_js = (pDb2, iCol) => __newOldValue(pDb2, iCol, "sqlite3_preupdate_new");
        capi.sqlite3_preupdate_old_js = (pDb2, iCol) => __newOldValue(pDb2, iCol, "sqlite3_preupdate_old");
        capi.sqlite3changeset_new_js = (pChangesetIter, iCol) => __newOldValue(pChangesetIter, iCol, "sqlite3changeset_new");
        capi.sqlite3changeset_old_js = (pChangesetIter, iCol) => __newOldValue(pChangesetIter, iCol, "sqlite3changeset_old");
      }
      capi.sqlite3_js_retry_busy = function(maxTimes, callback, beforeRetry) {
        for (let n3 = 1; n3 <= maxTimes; ++n3) try {
          if (beforeRetry && n3 > 1) beforeRetry(n3);
          const rc = callback();
          if (capi.SQLITE_BUSY === rc) {
            if (n3 === maxTimes) throw new SQLite3Error(rc, [
              "sqlite3_js_retry_busy() max retry attempts (",
              maxTimes,
              ") reached."
            ].join(""));
            continue;
          }
          return rc;
        } catch (e4) {
          if (n3 < maxTimes && e4 instanceof SQLite3Error && e4.resultCode === capi.SQLITE_BUSY) continue;
          throw e4;
        }
      };
      const sqlite3 = {
        WasmAllocError,
        SQLite3Error,
        capi,
        util,
        wasm: wasm3,
        config: config2,
        /**
        Holds the version info of the sqlite3 source tree from which
        the generated sqlite3-api.js gets built. Its version may well
        differ from that reported by sqlite3_libversion(), but that
        should be considered a source file mismatch, as the JS and WASM
        files are intended to be built and distributed together.
        
        This object is initially a placeholder which gets replaced by a
        build-generated object.
        */
        version: nu(),
        /**
        The library reserves the 'client' property for client-side use
        and promises to never define a property with this name nor to
        ever rely on specific contents of it. It makes no such guarantees
        for other properties.
        */
        client: void 0,
        /**
        This function is not part of the public interface, but a
        piece of internal bootstrapping infrastructure.
        
        Performs any optional asynchronous library-level initialization
        which might be required. This function returns a Promise which
        resolves to the sqlite3 namespace object. Any error in the
        async init will be fatal to the init as a whole, but init
        routines are themselves welcome to install dummy catch()
        handlers which are not fatal if their failure should be
        considered non-fatal.
        
        Ideally this function is called as part of the Promise chain
        which handles the loading and bootstrapping of the API.  If not
        then it must be called by client-level code, which must not use
        the library until the returned Promise resolves.
        
        If called multiple times it will return the same Promise on
        subsequent calls. The current build setup precludes that
        possibility, so it's only a hypothetical problem if/when this
        function ever needs to be invoked by clients.
        
        In Emscripten-based builds, this function is called
        automatically and deleted from this object.
        */
        asyncPostInit: async function ff() {
          if (ff.isReady instanceof Promise) return ff.isReady;
          let lia = this.initializersAsync;
          delete this.initializersAsync;
          const postInit = async () => {
            if (!sqlite3.__isUnderTest) {
              delete sqlite3.util;
              delete sqlite3.StructBinder;
              delete sqlite3.opfs;
            }
            return sqlite3;
          };
          const catcher = (e4) => {
            config2.error("an async sqlite3 initializer failed:", e4);
            throw e4;
          };
          if (!lia || !lia.length) return ff.isReady = postInit().catch(catcher);
          lia = lia.map((f2) => {
            return f2 instanceof Function ? async (x) => f2(sqlite3) : f2;
          });
          lia.push(postInit);
          let p2 = Promise.resolve(sqlite3);
          while (lia.length) p2 = p2.then(lia.shift());
          return ff.isReady = p2.catch(catcher);
        }.bind(sqlite3ApiBootstrap),
        /**
        scriptInfo holds information about the currenty-loading script
        so that we can locate the WASM file if it's somewhere other
        than the build-time-defined directory. It ideally gets injected
        into this object by the infrastructure which assembles the
        JS/WASM module. It contains state which must be collected
        before sqlite3ApiBootstrap() can be declared. It is not
        necessarily available to any sqlite3ApiBootstrap.initializers
        but "should" be in place (if it's added at all) by the time
        that sqlite3ApiBootstrap.initializersAsync is processed.
        
        This state is not part of the public API, only intended for use
        with the sqlite3 API bootstrapping and wasm-loading process.
        */
        scriptInfo: void 0
      };
      if ("undefined" !== typeof sqlite3IsUnderTest) sqlite3.__isUnderTest = !!sqlite3IsUnderTest;
      try {
        sqlite3ApiBootstrap.initializers.forEach((f2) => {
          f2(sqlite3);
        });
      } catch (e4) {
        console.error("sqlite3 bootstrap initializer threw:", e4);
        throw e4;
      }
      delete sqlite3ApiBootstrap.initializers;
      sqlite3ApiBootstrap.sqlite3 = sqlite3;
      if ("undefined" !== typeof sqlite3InitScriptInfo) {
        sqlite3InitScriptInfo.debugModule("sqlite3ApiBootstrap() complete", sqlite3);
        sqlite3.scriptInfo = sqlite3InitScriptInfo;
      }
      if (sqlite3.__isUnderTest) {
        if ("undefined" !== typeof EmscriptenModule) sqlite3.config.emscripten = EmscriptenModule;
        const iw = sqlite3.scriptInfo?.instantiateWasm;
        if (iw) {
          sqlite3.wasm.module = iw.module;
          sqlite3.wasm.instance = iw.instance;
          sqlite3.wasm.imports = iw.imports;
        }
      }
      delete globalThis.sqlite3ApiConfig;
      delete globalThis.sqlite3ApiBootstrap;
      delete sqlite3ApiBootstrap.defaultConfig;
      return sqlite3.asyncPostInit().then((s2) => {
        if ("undefined" !== typeof sqlite3InitScriptInfo) sqlite3InitScriptInfo.debugModule("sqlite3.asyncPostInit() complete", s2);
        delete s2.asyncPostInit;
        delete s2.scriptInfo;
        delete s2.emscripten;
        return s2;
      });
    };
    globalThis.sqlite3ApiBootstrap.initializers = [];
    globalThis.sqlite3ApiBootstrap.initializersAsync = [];
    globalThis.sqlite3ApiBootstrap.defaultConfig = /* @__PURE__ */ Object.create(null);
    globalThis.sqlite3ApiBootstrap.sqlite3 = void 0;
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      sqlite3.version = {
        "libVersion": "3.54.1",
        "libVersionNumber": 3054001,
        "sourceId": "2026-10-16 14:45:20 555e07ef33f69a0957d24d8e555b702464a131d6f1607f4c3c1e4551e8e6ca76",
        "downloadVersion": 3540100,
        "scm": {
          "sha3-256": "555e07ef33f69a0957d24d8e555b702464a131d6f1607f4c3c1e4551e8e6ca76",
          "branch": "branch-3.54",
          "tags": "release version-3.54.1",
          "datetime": "2026-10-16T14:45:20.546Z"
        }
      };
    });
    globalThis.WhWasmUtilInstaller = function WhWasmUtilInstaller(target) {
      "use strict";
      if (void 0 === target.bigIntEnabled) target.bigIntEnabled = !!globalThis["BigInt64Array"];
      const toss = (...args) => {
        throw new Error(args.join(" "));
      };
      if (!target.pointerSize && !target.pointerIR && target.alloc && target.dealloc) {
        const ptr = target.alloc(1);
        target.pointerSize = "bigint" === typeof ptr ? 8 : 4;
        target.dealloc(ptr);
      }
      if (target.pointerSize && !target.pointerIR) target.pointerIR = 4 === target.pointerSize ? "i32" : "i64";
      const __ptrIR = target.pointerIR ??= "i32";
      const __ptrSize = target.pointerSize ??= "i32" === __ptrIR ? 4 : "i64" === __ptrIR ? 8 : 0;
      delete target.pointerSize;
      delete target.pointerIR;
      if ("i32" !== __ptrIR && "i64" !== __ptrIR) toss("Invalid pointerIR:", __ptrIR);
      else if (8 !== __ptrSize && 4 !== __ptrSize) toss("Invalid pointerSize:", __ptrSize);
      const __BigInt = target.bigIntEnabled ? (v2) => BigInt(v2 || 0) : (v2) => toss("BigInt support is disabled in this build.");
      const __Number = (v2) => Number(v2 || 0);
      const __asPtrType = 4 === __ptrSize ? __Number : __BigInt;
      const __NullPtr = __asPtrType(0);
      const __ptrAdd = function(...args) {
        let rc = __asPtrType(0);
        for (const v2 of args) rc += __asPtrType(v2);
        return rc;
      };
      {
        const __ptr = /* @__PURE__ */ Object.create(null);
        Object.defineProperty(target, "ptr", {
          enumerable: true,
          get: () => __ptr,
          set: () => toss("The ptr property is read-only.")
        });
        (function f2(name, val) {
          Object.defineProperty(__ptr, name, {
            enumerable: true,
            get: () => val,
            set: () => toss("ptr[" + name + "] is read-only.")
          });
          return f2;
        })("null", __NullPtr)("size", __ptrSize)("ir", __ptrIR)("coerce", __asPtrType)("add", __ptrAdd)("addn", 4 === __ptrIR ? __ptrAdd : (...args) => Number(__ptrAdd(...args)));
      }
      if (!target.exports) Object.defineProperty(target, "exports", {
        enumerable: true,
        configurable: true,
        get: () => target.instance?.exports
      });
      const cache = /* @__PURE__ */ Object.create(null);
      cache.heapSize = 0;
      cache.memory = null;
      cache.freeFuncIndexes = [];
      cache.scopedAlloc = [];
      cache.scopedAlloc.pushPtr = (ptr) => {
        cache.scopedAlloc[cache.scopedAlloc.length - 1].push(ptr);
        return ptr;
      };
      cache.utf8Decoder = new TextDecoder();
      cache.utf8Encoder = new TextEncoder("utf-8");
      target.sizeofIR = (n3) => {
        switch (n3) {
          case "i8":
            return 1;
          case "i16":
            return 2;
          case "i32":
          case "f32":
          case "float":
            return 4;
          case "i64":
          case "f64":
          case "double":
            return 8;
          case "*":
            return __ptrSize;
          default:
            return ("" + n3).endsWith("*") ? __ptrSize : void 0;
        }
      };
      const heapWrappers = function() {
        if (!cache.memory) cache.memory = target.memory instanceof WebAssembly.Memory ? target.memory : target.exports.memory;
        else if (cache.heapSize === cache.memory.buffer.byteLength) return cache;
        const b2 = cache.memory.buffer;
        cache.HEAP8 = new Int8Array(b2);
        cache.HEAP8U = new Uint8Array(b2);
        cache.HEAP16 = new Int16Array(b2);
        cache.HEAP16U = new Uint16Array(b2);
        cache.HEAP32 = new Int32Array(b2);
        cache.HEAP32U = new Uint32Array(b2);
        cache.HEAP32F = new Float32Array(b2);
        cache.HEAP64F = new Float64Array(b2);
        if (target.bigIntEnabled) {
          if ("undefined" !== typeof BigInt64Array) {
            cache.HEAP64 = new BigInt64Array(b2);
            cache.HEAP64U = new BigUint64Array(b2);
          } else toss("BigInt support is enabled, but the BigInt64Array type is missing.");
        }
        cache.heapSize = b2.byteLength;
        return cache;
      };
      target.heap8 = () => heapWrappers().HEAP8;
      target.heap8u = () => heapWrappers().HEAP8U;
      target.heap16 = () => heapWrappers().HEAP16;
      target.heap16u = () => heapWrappers().HEAP16U;
      target.heap32 = () => heapWrappers().HEAP32;
      target.heap32u = () => heapWrappers().HEAP32U;
      target.heapForSize = function(n3, unsigned = true) {
        const c = cache.memory && cache.heapSize === cache.memory.buffer.byteLength ? cache : heapWrappers();
        switch (n3) {
          case Int8Array:
            return c.HEAP8;
          case Uint8Array:
            return c.HEAP8U;
          case Int16Array:
            return c.HEAP16;
          case Uint16Array:
            return c.HEAP16U;
          case Int32Array:
            return c.HEAP32;
          case Uint32Array:
            return c.HEAP32U;
          case 8:
            return unsigned ? c.HEAP8U : c.HEAP8;
          case 16:
            return unsigned ? c.HEAP16U : c.HEAP16;
          case 32:
            return unsigned ? c.HEAP32U : c.HEAP32;
          case 64:
            if (c.HEAP64) return unsigned ? c.HEAP64U : c.HEAP64;
            break;
          default:
            if (target.bigIntEnabled) {
              if (n3 === globalThis["BigUint64Array"]) return c.HEAP64U;
              else if (n3 === globalThis["BigInt64Array"]) return c.HEAP64;
              break;
            }
        }
        toss("Invalid heapForSize() size: expecting 8, 16, 32,", "or (if BigInt is enabled) 64.");
      };
      const __funcTable = target.functionTable;
      delete target.functionTable;
      target.functionTable = __funcTable ? () => __funcTable : () => target.exports.__indirect_function_table;
      target.functionEntry = function(fptr) {
        const ft = target.functionTable();
        return fptr < ft.length ? ft.get(__asPtrType(fptr)) : void 0;
      };
      target.jsFuncToWasm = function f2(func, sig) {
        if (!f2._) f2._ = {
          sigTypes: Object.assign(/* @__PURE__ */ Object.create(null), {
            i: "i32",
            p: __ptrIR,
            P: __ptrIR,
            s: __ptrIR,
            j: "i64",
            f: "f32",
            d: "f64"
          }),
          typeCodes: Object.assign(/* @__PURE__ */ Object.create(null), {
            f64: 124,
            f32: 125,
            i64: 126,
            i32: 127
          }),
          /** Encodes n, which must be <2^14 (16384), into target array
          tgt, as a little-endian value, using the given method
          ('push' or 'unshift'). */
          uleb128Encode: (tgt, method, n3) => {
            if (n3 < 128) tgt[method](n3);
            else tgt[method](n3 % 128 | 128, n3 >> 7);
          },
          /** Intentionally-lax pattern for Jaccwabyt-format function
          pointer signatures, the intent of which is simply to
          distinguish them from Emscripten-format signatures. The
          downstream checks are less lax. */
          rxJSig: /^(\w)\((\w*)\)$/,
          /** Returns the parameter-value part of the given signature
          string. */
          sigParams: (sig2) => {
            const m = f2._.rxJSig.exec(sig2);
            return m ? m[2] : sig2.substr(1);
          },
          /** Returns the IR value for the given letter or throws
          if the letter is invalid. */
          letterType: (x) => f2._.sigTypes[x] || toss("Invalid signature letter:", x),
          /** Pushes the WASM data type code for the given signature
          letter to the given target array. Throws if letter is
          invalid. */
          pushSigType: (dest, letter) => dest.push(f2._.typeCodes[f2._.letterType(letter)])
        };
        if ("string" === typeof func) {
          const x = sig;
          sig = func;
          func = x;
        }
        const _ = f2._;
        const sigParams = _.sigParams(sig);
        const wasmCode = [1, 96];
        _.uleb128Encode(wasmCode, "push", sigParams.length);
        for (const x of sigParams) _.pushSigType(wasmCode, x);
        if ("v" === sig[0]) wasmCode.push(0);
        else {
          wasmCode.push(1);
          _.pushSigType(wasmCode, sig[0]);
        }
        _.uleb128Encode(wasmCode, "unshift", wasmCode.length);
        wasmCode.unshift(0, 97, 115, 109, 1, 0, 0, 0, 1);
        wasmCode.push(2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
        return new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array(wasmCode)), { e: { f: func } }).exports["f"];
      };
      const __installFunction = function f2(func, sig, scoped) {
        if (scoped && !cache.scopedAlloc.length) toss("No scopedAllocPush() scope is active.");
        if ("string" === typeof func) {
          const x = sig;
          sig = func;
          func = x;
        }
        if ("string" !== typeof sig || !(func instanceof Function)) toss("Invalid arguments: expecting (function,signature) or (signature,function).");
        const ft = target.functionTable();
        const oldLen = __asPtrType(ft.length);
        let ptr;
        while (ptr = cache.freeFuncIndexes.pop()) if (ft.get(ptr)) {
          ptr = null;
          continue;
        } else break;
        if (!ptr) {
          ptr = __asPtrType(oldLen);
          ft.grow(__asPtrType(1));
        }
        try {
          ft.set(ptr, func);
          if (scoped) cache.scopedAlloc.pushPtr(ptr);
          return ptr;
        } catch (e4) {
          if (!(e4 instanceof TypeError)) {
            if (ptr === oldLen) cache.freeFuncIndexes.push(oldLen);
            throw e4;
          }
        }
        try {
          const fptr = target.jsFuncToWasm(func, sig);
          ft.set(ptr, fptr);
          if (scoped) cache.scopedAlloc.pushPtr(ptr);
        } catch (e4) {
          if (ptr === oldLen) cache.freeFuncIndexes.push(oldLen);
          throw e4;
        }
        return ptr;
      };
      target.installFunction = (func, sig) => __installFunction(func, sig, false);
      target.scopedInstallFunction = (func, sig) => __installFunction(func, sig, true);
      target.uninstallFunction = function(ptr) {
        if (!ptr && __NullPtr !== ptr) return void 0;
        const ft = target.functionTable();
        cache.freeFuncIndexes.push(ptr);
        const rc = ft.get(ptr);
        ft.set(ptr, null);
        return rc;
      };
      target.peek = function f2(ptr, type = "i8") {
        if (type.endsWith("*")) type = __ptrIR;
        const c = cache.memory && cache.heapSize === cache.memory.buffer.byteLength ? cache : heapWrappers();
        const list2 = Array.isArray(ptr) ? [] : void 0;
        let rc;
        do {
          if (list2) ptr = arguments[0].shift();
          switch (type) {
            case "i1":
            case "i8":
              rc = c.HEAP8[Number(ptr) >> 0];
              break;
            case "i16":
              rc = c.HEAP16[Number(ptr) >> 1];
              break;
            case "i32":
              rc = c.HEAP32[Number(ptr) >> 2];
              break;
            case "float":
            case "f32":
              rc = c.HEAP32F[Number(ptr) >> 2];
              break;
            case "double":
            case "f64":
              rc = Number(c.HEAP64F[Number(ptr) >> 3]);
              break;
            case "i64":
              if (c.HEAP64) {
                rc = __BigInt(c.HEAP64[Number(ptr) >> 3]);
                break;
              }
            default:
              toss("Invalid type for peek():", type);
          }
          if (list2) list2.push(rc);
        } while (list2 && arguments[0].length);
        return list2 || rc;
      };
      target.poke = function(ptr, value, type = "i8") {
        if (type.endsWith("*")) type = __ptrIR;
        const c = cache.memory && cache.heapSize === cache.memory.buffer.byteLength ? cache : heapWrappers();
        for (const p2 of Array.isArray(ptr) ? ptr : [ptr]) switch (type) {
          case "i1":
          case "i8":
            c.HEAP8[Number(p2) >> 0] = value;
            continue;
          case "i16":
            c.HEAP16[Number(p2) >> 1] = value;
            continue;
          case "i32":
            c.HEAP32[Number(p2) >> 2] = value;
            continue;
          case "float":
          case "f32":
            c.HEAP32F[Number(p2) >> 2] = value;
            continue;
          case "double":
          case "f64":
            c.HEAP64F[Number(p2) >> 3] = value;
            continue;
          case "i64":
            if (c.HEAP64) {
              c.HEAP64[Number(p2) >> 3] = __BigInt(value);
              continue;
            }
          default:
            toss("Invalid type for poke(): " + type);
        }
        return this;
      };
      target.peekPtr = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, __ptrIR);
      target.pokePtr = (ptr, value = 0) => target.poke(ptr, value, __ptrIR);
      target.peek8 = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "i8");
      target.poke8 = (ptr, value) => target.poke(ptr, value, "i8");
      target.peek16 = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "i16");
      target.poke16 = (ptr, value) => target.poke(ptr, value, "i16");
      target.peek32 = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "i32");
      target.poke32 = (ptr, value) => target.poke(ptr, value, "i32");
      target.peek64 = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "i64");
      target.poke64 = (ptr, value) => target.poke(ptr, value, "i64");
      target.peek32f = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "f32");
      target.poke32f = (ptr, value) => target.poke(ptr, value, "f32");
      target.peek64f = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "f64");
      target.poke64f = (ptr, value) => target.poke(ptr, value, "f64");
      target.getMemValue = target.peek;
      target.getPtrValue = target.peekPtr;
      target.setMemValue = target.poke;
      target.setPtrValue = target.pokePtr;
      target.isPtr32 = (ptr) => "number" === typeof ptr && ptr >= 0 && ptr === (ptr | 0);
      target.isPtr64 = (ptr) => "bigint" === typeof ptr ? ptr >= 0 : target.isPtr32(ptr);
      target.isPtr = 4 === __ptrSize ? target.isPtr32 : target.isPtr64;
      target.cstrlen = function(ptr) {
        if (!ptr || !target.isPtr(ptr)) return null;
        ptr = Number(ptr);
        const h = heapWrappers().HEAP8U;
        let pos = ptr;
        for (; h[pos] !== 0; ++pos) ;
        return pos - ptr;
      };
      const __SAB = "undefined" === typeof SharedArrayBuffer ? function() {
      } : SharedArrayBuffer;
      const isSharedTypedArray = (aTypedArray) => aTypedArray.buffer instanceof __SAB;
      target.isSharedTypedArray = isSharedTypedArray;
      const typedArrayPart = (aTypedArray, begin, end) => {
        if (8 === __ptrSize) {
          if ("bigint" === typeof begin) begin = Number(begin);
          if ("bigint" === typeof end) end = Number(end);
        }
        return isSharedTypedArray(aTypedArray) ? aTypedArray.slice(begin, end) : aTypedArray.subarray(begin, end);
      };
      target.typedArrayPart = typedArrayPart;
      const typedArrayToString = (typedArray, begin, end) => cache.utf8Decoder.decode(typedArrayPart(typedArray, begin, end));
      target.typedArrayToString = typedArrayToString;
      target.cstrToJs = function(ptr) {
        const n3 = target.cstrlen(ptr);
        return n3 ? typedArrayToString(heapWrappers().HEAP8U, Number(ptr), Number(ptr) + n3) : null === n3 ? n3 : "";
      };
      target.jstrlen = function(str) {
        if ("string" !== typeof str) return null;
        const n3 = str.length;
        let len = 0;
        for (let i = 0; i < n3; ++i) {
          let u = str.charCodeAt(i);
          if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
          if (u <= 127) ++len;
          else if (u <= 2047) len += 2;
          else if (u <= 65535) len += 3;
          else len += 4;
        }
        return len;
      };
      target.jstrcpy = function(jstr, tgt, offset = 0, maxBytes = -1, addNul = true) {
        if (!tgt || !(tgt instanceof Int8Array) && !(tgt instanceof Uint8Array)) toss("jstrcpy() target must be an Int8Array or Uint8Array.");
        maxBytes = Number(maxBytes);
        offset = Number(offset);
        if (maxBytes < 0) maxBytes = tgt.length - offset;
        if (!(maxBytes > 0) || !(offset >= 0)) return 0;
        let i = 0, max = jstr.length;
        const begin = offset, end = offset + maxBytes - (addNul ? 1 : 0);
        for (; i < max && offset < end; ++i) {
          let u = jstr.charCodeAt(i);
          if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | jstr.charCodeAt(++i) & 1023;
          if (u <= 127) {
            if (offset >= end) break;
            tgt[offset++] = u;
          } else if (u <= 2047) {
            if (offset + 1 >= end) break;
            tgt[offset++] = 192 | u >> 6;
            tgt[offset++] = 128 | u & 63;
          } else if (u <= 65535) {
            if (offset + 2 >= end) break;
            tgt[offset++] = 224 | u >> 12;
            tgt[offset++] = 128 | u >> 6 & 63;
            tgt[offset++] = 128 | u & 63;
          } else {
            if (offset + 3 >= end) break;
            tgt[offset++] = 240 | u >> 18;
            tgt[offset++] = 128 | u >> 12 & 63;
            tgt[offset++] = 128 | u >> 6 & 63;
            tgt[offset++] = 128 | u & 63;
          }
        }
        if (addNul) tgt[offset++] = 0;
        return offset - begin;
      };
      target.cstrncpy = function(tgtPtr, srcPtr, n3) {
        if (!tgtPtr || !srcPtr) toss("cstrncpy() does not accept NULL strings.");
        if (n3 < 0) n3 = target.cstrlen(strPtr) + 1;
        else if (!(n3 > 0)) return 0;
        const heap = target.heap8u();
        let i = 0, ch;
        const tgtNumber = Number(tgtPtr), srcNumber = Number(srcPtr);
        for (; i < n3 && (ch = heap[srcNumber + i]); ++i) heap[tgtNumber + i] = ch;
        if (i < n3) heap[tgtNumber + i++] = 0;
        return i;
      };
      target.jstrToUintArray = (str, addNul = false) => {
        return cache.utf8Encoder.encode(addNul ? str + "\0" : str);
      };
      const __affirmAlloc = (obj, funcName) => {
        if (!(obj.alloc instanceof Function) || !(obj.dealloc instanceof Function)) toss("Object is missing alloc() and/or dealloc() function(s)", "required by", funcName + "().");
      };
      const __allocCStr = function(jstr, returnWithLength, allocator, funcName) {
        __affirmAlloc(target, funcName);
        if ("string" !== typeof jstr) return null;
        const u = cache.utf8Encoder.encode(jstr), ptr = allocator(u.length + 1);
        let toFree = ptr;
        try {
          const heap = heapWrappers().HEAP8U;
          heap.set(u, Number(ptr));
          heap[__ptrAdd(ptr, u.length)] = 0;
          toFree = __NullPtr;
          return returnWithLength ? [ptr, u.length] : ptr;
        } finally {
          if (toFree) target.dealloc(toFree);
        }
      };
      target.allocCString = (jstr, returnWithLength = false) => __allocCStr(jstr, returnWithLength, target.alloc, "allocCString()");
      target.scopedAllocPush = function() {
        __affirmAlloc(target, "scopedAllocPush");
        const a = [];
        cache.scopedAlloc.push(a);
        return a;
      };
      target.scopedAllocPop = function(state) {
        __affirmAlloc(target, "scopedAllocPop");
        const n3 = arguments.length ? cache.scopedAlloc.indexOf(state) : cache.scopedAlloc.length - 1;
        if (n3 < 0) toss("Invalid state object for scopedAllocPop().");
        if (0 === arguments.length) state = cache.scopedAlloc[n3];
        cache.scopedAlloc.splice(n3, 1);
        for (let p2; p2 = state.pop(); ) if (target.functionEntry(p2)) target.uninstallFunction(p2);
        else target.dealloc(p2);
      };
      target.scopedAlloc = function(n3) {
        if (!cache.scopedAlloc.length) toss("No scopedAllocPush() scope is active.");
        const p2 = __asPtrType(target.alloc(n3));
        return cache.scopedAlloc.pushPtr(p2);
      };
      Object.defineProperty(target.scopedAlloc, "level", {
        configurable: false,
        enumerable: false,
        get: () => cache.scopedAlloc.length,
        set: () => toss("The 'active' property is read-only.")
      });
      target.scopedAllocCString = (jstr, returnWithLength = false) => __allocCStr(jstr, returnWithLength, target.scopedAlloc, "scopedAllocCString()");
      const __allocMainArgv = function(isScoped, list2) {
        const pList = target[isScoped ? "scopedAlloc" : "alloc"]((list2.length + 1) * target.ptr.size);
        let i = 0;
        list2.forEach((e4) => {
          target.pokePtr(__ptrAdd(pList, target.ptr.size * i++), target[isScoped ? "scopedAllocCString" : "allocCString"]("" + e4));
        });
        target.pokePtr(__ptrAdd(pList, target.ptr.size * i), 0);
        return pList;
      };
      target.scopedAllocMainArgv = (list2) => __allocMainArgv(true, list2);
      target.allocMainArgv = (list2) => __allocMainArgv(false, list2);
      target.cArgvToJs = (argc, pArgv) => {
        const list2 = [];
        for (let i = 0; i < argc; ++i) {
          const arg = target.peekPtr(__ptrAdd(pArgv, target.ptr.size * i));
          list2.push(arg ? target.cstrToJs(arg) : null);
        }
        return list2;
      };
      target.scopedAllocCall = function(func) {
        target.scopedAllocPush();
        try {
          return func();
        } finally {
          target.scopedAllocPop();
        }
      };
      const __allocPtr = function(howMany, safePtrSize, method) {
        __affirmAlloc(target, method);
        const pIr = safePtrSize ? "i64" : __ptrIR;
        let m = target[method](howMany * (safePtrSize ? 8 : __ptrSize));
        target.poke(m, 0, pIr);
        if (1 === howMany) return m;
        const a = [m];
        for (let i = 1; i < howMany; ++i) {
          m = __ptrAdd(m, safePtrSize ? 8 : __ptrSize);
          a[i] = m;
          target.poke(m, 0, pIr);
        }
        return a;
      };
      target.allocPtr = (howMany = 1, safePtrSize = true) => __allocPtr(howMany, safePtrSize, "alloc");
      target.scopedAllocPtr = (howMany = 1, safePtrSize = true) => __allocPtr(howMany, safePtrSize, "scopedAlloc");
      target.xGet = function(name) {
        return target.exports[name] || toss("Cannot find exported symbol:", name);
      };
      const __argcMismatch = (f2, n3) => toss(f2 + "() requires", n3, "argument(s).");
      target.xCall = function(fname, ...args) {
        const f2 = fname instanceof Function ? fname : target.xGet(fname);
        if (!(f2 instanceof Function)) toss("Exported symbol", fname, "is not a function.");
        if (f2.length !== args.length) __argcMismatch(f2 === fname ? f2.name : fname, f2.length);
        return 2 === arguments.length && Array.isArray(arguments[1]) ? f2.apply(null, arguments[1]) : f2.apply(null, args);
      };
      cache.xWrap = /* @__PURE__ */ Object.create(null);
      cache.xWrap.convert = /* @__PURE__ */ Object.create(null);
      cache.xWrap.convert.arg = /* @__PURE__ */ new Map();
      cache.xWrap.convert.result = /* @__PURE__ */ new Map();
      const xArg = cache.xWrap.convert.arg, xResult = cache.xWrap.convert.result;
      const __xArgPtr = __asPtrType;
      xArg.set("i64", __BigInt).set("i32", (i) => i | 0).set("i16", (i) => (i | 0) & 65535).set("i8", (i) => (i | 0) & 255).set("f32", (i) => Number(i).valueOf()).set("float", xArg.get("f32")).set("f64", xArg.get("f32")).set("double", xArg.get("f64")).set("int", xArg.get("i32")).set("null", (i) => i).set(null, xArg.get("null")).set("**", __xArgPtr).set("*", __xArgPtr);
      xResult.set("*", __xArgPtr).set("pointer", __xArgPtr).set("number", (v2) => Number(v2)).set("void", (v2) => void 0).set(void 0, xResult.get("void")).set("null", (v2) => v2).set(null, xResult.get("null"));
      for (const t4 of [
        "i8",
        "i16",
        "i32",
        "i64",
        "int",
        "f32",
        "float",
        "f64",
        "double"
      ]) {
        xArg.set(t4 + "*", __xArgPtr);
        xResult.set(t4 + "*", __xArgPtr);
        xResult.set(t4, xArg.get(t4) || toss("Maintenance required: missing arg converter for", t4));
      }
      const __xArgString = (v2) => {
        return "string" === typeof v2 ? target.scopedAllocCString(v2) : __asPtrType(v2);
      };
      xArg.set("string", __xArgString).set("utf8", __xArgString);
      xResult.set("string", (i) => target.cstrToJs(i)).set("utf8", xResult.get("string")).set("string:dealloc", (i) => {
        try {
          return i ? target.cstrToJs(i) : null;
        } finally {
          target.dealloc(i);
        }
      }).set("utf8:dealloc", xResult.get("string:dealloc")).set("json", (i) => JSON.parse(target.cstrToJs(i))).set("json:dealloc", (i) => {
        try {
          return i ? JSON.parse(target.cstrToJs(i)) : null;
        } finally {
          target.dealloc(i);
        }
      });
      const AbstractArgAdapter = class {
        constructor(opt) {
          this.name = opt.name || "unnamed adapter";
        }
        /**
        Gets called via xWrap() to "convert" v to whatever type
        this specific class supports.
        
        argIndex is the argv index of _this_ argument in the
        being-xWrap()'d call. argv is the current argument list
        undergoing xWrap() argument conversion. argv entries to the
        left of argIndex will have already undergone transformation and
        those to the right will not have (they will have the values the
        client-level code passed in, awaiting conversion). The RHS
        indexes must never be relied upon for anything because their
        types are indeterminate, whereas the LHS values will be
        WASM-compatible values by the time this is called.
        
        The reason for the argv and argIndex arguments is that we
        frequently need more context than v for a specific conversion,
        and that context invariably lies in the LHS arguments of v.
        Examples of how this is useful can be found in FuncPtrAdapter.
        */
        convertArg(v2, argv, argIndex) {
          toss("AbstractArgAdapter must be subclassed.");
        }
      };
      xArg.FuncPtrAdapter = class FuncPtrAdapter extends AbstractArgAdapter {
        constructor(opt) {
          super(opt);
          if (xArg.FuncPtrAdapter.warnOnUse) console.warn("xArg.FuncPtrAdapter is an internal-only API", "and is not intended to be invoked from", "client-level code. Invoked with:", opt);
          this.name = opt.name || "unnamed";
          this.signature = opt.signature;
          if (opt.contextKey instanceof Function) {
            this.contextKey = opt.contextKey;
            if (!opt.bindScope) opt.bindScope = "context";
          }
          this.bindScope = opt.bindScope || toss("FuncPtrAdapter options requires a bindScope (explicit or implied).");
          if (FuncPtrAdapter.bindScopes.indexOf(opt.bindScope) < 0) toss("Invalid options.bindScope (" + opt.bindMod + ") for FuncPtrAdapter. Expecting one of: (" + FuncPtrAdapter.bindScopes.join(", ") + ")");
          this.isTransient = "transient" === this.bindScope;
          this.isContext = "context" === this.bindScope;
          this.isPermanent = "permanent" === this.bindScope;
          this.singleton = "singleton" === this.bindScope ? [] : void 0;
          this.callProxy = opt.callProxy instanceof Function ? opt.callProxy : void 0;
        }
        /**
        The static class members are defined outside of the class to
        work around an emcc toolchain build problem: one of the tools
        in emsdk v3.1.42 does not support the static keyword.
        */
        contextKey(argv, argIndex) {
          return this;
        }
        /**
        Returns this object's mapping for the given context key, in the
        form of an an array, creating the mapping if needed. The key
        may be anything suitable for use in a Map.
        
        The returned array is intended to be used as a pair of
        [JSValue, WasmFuncPtr], where the first element is one passed
        to this.convertArg() and the second is its WASM form.
        */
        contextMap(key) {
          const cm = this.__cmap || (this.__cmap = /* @__PURE__ */ new Map());
          let rc = cm.get(key);
          if (void 0 === rc) cm.set(key, rc = []);
          return rc;
        }
        /**
        Gets called via xWrap() to "convert" v to a WASM-bound function
        pointer. If v is one of (a WASM pointer, null, undefined) then
        (v||0) is returned and any earlier function installed by this
        mapping _might_, depending on how it's bound, be uninstalled.
        If v is not one of those types, it must be a Function, for
        which this method creates (if needed) a WASM function binding
        and returns the WASM pointer to that binding.
        
        If this instance is not in 'transient' mode, it will remember
        the binding for at least the next call, to avoid recreating the
        function binding unnecessarily.
        
        If it's passed a pointer(ish) value for v, it assumes it's a
        WASM function pointer and does _not_ perform any function
        binding, so this object's bindMode is irrelevant/ignored for
        such cases.
        
        See the parent class's convertArg() docs for details on what
        exactly the 2nd and 3rd arguments are.
        */
        convertArg(v2, argv, argIndex) {
          let pair = this.singleton;
          if (!pair && this.isContext) pair = this.contextMap(this.contextKey(argv, argIndex));
          if (pair && 2 === pair.length && pair[0] === v2) return pair[1];
          if (v2 instanceof Function) {
            if (this.callProxy) v2 = this.callProxy(v2);
            const fp = __installFunction(v2, this.signature, this.isTransient);
            if (FuncPtrAdapter.debugFuncInstall) FuncPtrAdapter.debugOut("FuncPtrAdapter installed", this, this.contextKey(argv, argIndex), "@" + fp, v2);
            if (pair) {
              if (pair[1]) {
                if (FuncPtrAdapter.debugFuncInstall) FuncPtrAdapter.debugOut("FuncPtrAdapter uninstalling", this, this.contextKey(argv, argIndex), "@" + pair[1], v2);
                try {
                  cache.scopedAlloc.pushPtr(pair[1]);
                } catch (e4) {
                }
              }
              pair[0] = arguments[0] || __NullPtr;
              pair[1] = fp;
            }
            return fp;
          } else if (target.isPtr(v2) || null === v2 || void 0 === v2) {
            if (pair && pair[1] && pair[1] !== v2) {
              if (FuncPtrAdapter.debugFuncInstall) FuncPtrAdapter.debugOut("FuncPtrAdapter uninstalling", this, this.contextKey(argv, argIndex), "@" + pair[1], v2);
              try {
                cache.scopedAlloc.pushPtr(pair[1]);
              } catch (e4) {
              }
              pair[0] = pair[1] = v2 || __NullPtr;
            }
            return v2 || __NullPtr;
          } else throw new TypeError("Invalid FuncPtrAdapter argument type. Expecting a function pointer or a " + (this.name ? this.name + " " : "") + "function matching signature " + this.signature + ".");
        }
      };
      xArg.FuncPtrAdapter.warnOnUse = false;
      xArg.FuncPtrAdapter.debugFuncInstall = false;
      xArg.FuncPtrAdapter.debugOut = console.debug.bind(console);
      xArg.FuncPtrAdapter.bindScopes = [
        "transient",
        "context",
        "singleton",
        "permanent"
      ];
      const __xArgAdapterCheck = (t4) => xArg.get(t4) || toss("Argument adapter not found:", t4);
      const __xResultAdapterCheck = (t4) => xResult.get(t4) || toss("Result adapter not found:", t4);
      cache.xWrap.convertArg = (t4, ...args) => __xArgAdapterCheck(t4)(...args);
      cache.xWrap.convertArgNoCheck = (t4, ...args) => xArg.get(t4)(...args);
      cache.xWrap.convertResult = (t4, v2) => null === t4 ? v2 : t4 ? __xResultAdapterCheck(t4)(v2) : void 0;
      cache.xWrap.convertResultNoCheck = (t4, v2) => null === t4 ? v2 : t4 ? xResult.get(t4)(v2) : void 0;
      target.xWrap = function callee3(fArg, resultType, ...argTypes) {
        if (3 === arguments.length && Array.isArray(arguments[2])) argTypes = arguments[2];
        if (target.isPtr(fArg)) fArg = target.functionEntry(fArg) || toss("Function pointer not found in WASM function table.");
        const fIsFunc = fArg instanceof Function;
        const xf = fIsFunc ? fArg : target.xGet(fArg);
        if (fIsFunc) fArg = xf.name || "unnamed function";
        if (argTypes.length !== xf.length) __argcMismatch(fArg, xf.length);
        if (0 === xf.length && (null === resultType || "null" === resultType)) return xf;
        __xResultAdapterCheck(resultType);
        for (const t4 of argTypes) if (t4 instanceof AbstractArgAdapter) xArg.set(t4, (...args) => t4.convertArg(...args));
        else __xArgAdapterCheck(t4);
        const cxw = cache.xWrap;
        if (0 === xf.length) return (...args) => args.length ? __argcMismatch(fArg, xf.length) : cxw.convertResult(resultType, xf.call(null));
        return function(...args) {
          if (args.length !== xf.length) __argcMismatch(fArg, xf.length);
          const scope = target.scopedAllocPush();
          try {
            let i = 0;
            if (callee3.debug) console.debug("xWrap() preparing: resultType ", resultType, "xf", xf, "argTypes", argTypes, "args", args);
            for (; i < args.length; ++i) args[i] = cxw.convertArgNoCheck(argTypes[i], args[i], args, i);
            if (callee3.debug) console.debug("xWrap() calling: resultType ", resultType, "xf", xf, "argTypes", argTypes, "args", args);
            return cxw.convertResultNoCheck(resultType, xf.apply(null, args));
          } finally {
            target.scopedAllocPop(scope);
          }
        };
      };
      const __xAdapter = function(func, argc, typeName, adapter, modeName, xcvPart) {
        if ("string" === typeof typeName) {
          if (1 === argc) return xcvPart.get(typeName);
          else if (2 === argc) {
            if (!adapter) {
              xcvPart.delete(typeName);
              return func;
            } else if (!(adapter instanceof Function)) toss(modeName, "requires a function argument.");
            xcvPart.set(typeName, adapter);
            return func;
          }
        }
        toss("Invalid arguments to", modeName);
      };
      target.xWrap.resultAdapter = function f2(typeName, adapter) {
        return __xAdapter(f2, arguments.length, typeName, adapter, "resultAdapter()", xResult);
      };
      target.xWrap.argAdapter = function f2(typeName, adapter) {
        return __xAdapter(f2, arguments.length, typeName, adapter, "argAdapter()", xArg);
      };
      target.xWrap.FuncPtrAdapter = xArg.FuncPtrAdapter;
      target.xCallWrapped = function(fArg, resultType, argTypes, ...args) {
        if (Array.isArray(arguments[3])) args = arguments[3];
        return target.xWrap(fArg, resultType, argTypes || []).apply(null, args || []);
      };
      target.xWrap.testConvertArg = cache.xWrap.convertArg;
      target.xWrap.testConvertResult = cache.xWrap.convertResult;
      return target;
    };
    globalThis.WhWasmUtilInstaller.yawl = function yawl(config2) {
      "use strict";
      const wfetch = () => fetch(config2.uri, { credentials: "same-origin" });
      const wui = this;
      const finalThen = function(arg) {
        if (config2.wasmUtilTarget) {
          const toss = (...args) => {
            throw new Error(args.join(" "));
          };
          const tgt = config2.wasmUtilTarget;
          tgt.module = arg.module;
          tgt.instance = arg.instance;
          if (!tgt.instance.exports.memory)
            tgt.memory = config2?.imports?.env?.memory || toss("Missing 'memory' object!");
          if (!tgt.alloc && arg.instance.exports.malloc) {
            const exports = arg.instance.exports;
            tgt.alloc = function(n3) {
              return exports.malloc(n3) || toss("Allocation of", n3, "bytes failed.");
            };
            tgt.dealloc = function(m) {
              m && exports.free(m);
            };
          }
          wui(tgt);
        }
        arg.config = config2;
        if (config2.onload) config2.onload(arg);
        return arg;
      };
      return WebAssembly.instantiateStreaming ? () => WebAssembly.instantiateStreaming(wfetch(), config2.imports || {}).then(finalThen) : () => wfetch().then((response) => response.arrayBuffer()).then((bytes) => WebAssembly.instantiate(bytes, config2.imports || {})).then(finalThen);
    }.bind(globalThis.WhWasmUtilInstaller);
    globalThis.Jaccwabyt = function StructBinderFactory(config2) {
      "use strict";
      const toss = (...args) => {
        throw new Error(args.join(" "));
      };
      {
        let h = config2.heap;
        if (h instanceof WebAssembly.Memory) h = function() {
          return new Uint8Array(this.buffer);
        }.bind(h);
        else if (!(h instanceof Function)) toss("config.heap must be WebAssembly.Memory instance or", "a function which returns one.");
        config2.heap = h;
      }
      ["alloc", "dealloc"].forEach(function(k2) {
        config2[k2] instanceof Function || toss("Config option '" + k2 + "' must be a function.");
      });
      const SBF = StructBinderFactory, heap = config2.heap, alloc = config2.alloc, dealloc = config2.dealloc;
      config2.realloc;
      const log = config2.log || console.debug.bind(console), memberPrefix = config2.memberPrefix || "", memberSuffix = config2.memberSuffix || "", BigInt2 = globalThis["BigInt"], BigInt64Array2 = globalThis["BigInt64Array"], bigIntEnabled = config2.bigIntEnabled ?? !!BigInt64Array2;
      let ptr;
      const ptrSize = config2.pointerSize || config2.ptrSize || ("bigint" === typeof (ptr = alloc(1)) ? 8 : 4);
      const ptrIR = config2.pointerIR || config2.ptrIR || (4 === ptrSize ? "i32" : "i64");
      if (ptr) {
        dealloc(ptr);
        ptr = void 0;
      }
      if (ptrSize !== 4 && ptrSize !== 8) toss("Invalid pointer size:", ptrSize);
      if (ptrIR !== "i32" && ptrIR !== "i64") toss("Invalid pointer representation:", ptrIR);
      const __BigInt = bigIntEnabled && BigInt2 ? (v2) => BigInt2(v2 || 0) : (v2) => toss("BigInt support is disabled in this build.");
      const __asPtrType = "i32" == ptrIR ? Number : __BigInt;
      const __NullPtr = __asPtrType(0);
      const __ptrAdd = function(...args) {
        let rc = __NullPtr;
        for (let i = 0; i < args.length; ++i) rc += __asPtrType(args[i]);
        return rc;
      };
      const __ptrAddSelf = function(...args) {
        return __ptrAdd(this.pointer, ...args);
      };
      if (!SBF.debugFlags) {
        SBF.__makeDebugFlags = function(deriveFrom = null) {
          if (deriveFrom && deriveFrom.__flags) deriveFrom = deriveFrom.__flags;
          const f2 = function f3(flags) {
            if (0 === arguments.length) return f3.__flags;
            if (flags < 0) {
              delete f3.__flags.getter;
              delete f3.__flags.setter;
              delete f3.__flags.alloc;
              delete f3.__flags.dealloc;
            } else {
              f3.__flags.getter = 0 !== (1 & flags);
              f3.__flags.setter = 0 !== (2 & flags);
              f3.__flags.alloc = 0 !== (4 & flags);
              f3.__flags.dealloc = 0 !== (8 & flags);
            }
            return f3._flags;
          };
          Object.defineProperty(f2, "__flags", {
            iterable: false,
            writable: false,
            value: Object.create(deriveFrom)
          });
          if (!deriveFrom) f2(0);
          return f2;
        };
        SBF.debugFlags = SBF.__makeDebugFlags();
      }
      const isLittleEndian = true;
      const isFuncSig = (s2) => "(" === s2[1];
      const isPtrSig = (s2) => "p" === s2 || "P" === s2 || "s" === s2;
      const isAutoPtrSig = (s2) => "P" === s2;
      const sigLetter = (s2) => s2 ? isFuncSig(s2) ? "p" : s2[0] : void 0;
      const sigIR = function(s2) {
        switch (sigLetter(s2)) {
          case "c":
          case "C":
            return "i8";
          case "i":
            return "i32";
          case "p":
          case "P":
          case "s":
            return ptrIR;
          case "j":
            return "i64";
          case "f":
            return "float";
          case "d":
            return "double";
        }
        toss("Unhandled signature IR:", s2);
      };
      const sigSize = function(s2) {
        switch (sigLetter(s2)) {
          case "c":
          case "C":
            return 1;
          case "i":
            return 4;
          case "p":
          case "P":
          case "s":
            return ptrSize;
          case "j":
            return 8;
          case "f":
            return 4;
          case "d":
            return 8;
        }
        toss("Unhandled signature sizeof:", s2);
      };
      const affirmBigIntArray = BigInt64Array2 ? () => true : () => toss("BigInt64Array is not available.");
      const sigDVGetter = function(s2) {
        switch (sigLetter(s2)) {
          case "p":
          case "P":
          case "s":
            switch (ptrSize) {
              case 4:
                return "getInt32";
              case 8:
                return affirmBigIntArray() && "getBigInt64";
            }
            break;
          case "i":
            return "getInt32";
          case "c":
            return "getInt8";
          case "C":
            return "getUint8";
          case "j":
            return affirmBigIntArray() && "getBigInt64";
          case "f":
            return "getFloat32";
          case "d":
            return "getFloat64";
        }
        toss("Unhandled DataView getter for signature:", s2);
      };
      const sigDVSetter = function(s2) {
        switch (sigLetter(s2)) {
          case "p":
          case "P":
          case "s":
            switch (ptrSize) {
              case 4:
                return "setInt32";
              case 8:
                return affirmBigIntArray() && "setBigInt64";
            }
            break;
          case "i":
            return "setInt32";
          case "c":
            return "setInt8";
          case "C":
            return "setUint8";
          case "j":
            return affirmBigIntArray() && "setBigInt64";
          case "f":
            return "setFloat32";
          case "d":
            return "setFloat64";
        }
        toss("Unhandled DataView setter for signature:", s2);
      };
      const sigDVSetWrapper = function(s2) {
        switch (sigLetter(s2)) {
          case "i":
          case "f":
          case "c":
          case "C":
          case "d":
            return Number;
          case "j":
            return __BigInt;
          case "p":
          case "P":
          case "s":
            switch (ptrSize) {
              case 4:
                return Number;
              case 8:
                return __BigInt;
            }
        }
        toss("Unhandled DataView set wrapper for signature:", s2);
      };
      const sPropName = (s2, k2) => s2 + "::" + k2;
      const __propThrowOnSet = function(structName, propName) {
        return () => toss(sPropName(structName, propName), "is read-only.");
      };
      const getInstanceHandle = function f2(obj, create = true) {
        let ii = f2.map.get(obj);
        if (!ii && create) f2.map.set(obj, ii = f2.create(obj));
        return ii;
      };
      getInstanceHandle.map = /* @__PURE__ */ new WeakMap();
      getInstanceHandle.create = (forObj) => {
        return Object.assign(/* @__PURE__ */ Object.create(null), {
          o: forObj,
          p: void 0,
          ownsPointer: false,
          zod: false,
          xb: 0
        });
      };
      const rmInstanceHandle = (obj) => getInstanceHandle.map.delete(obj);
      const __isPtr32 = (ptr2) => "number" === typeof ptr2 && ptr2 === (ptr2 | 0) && ptr2 >= 0;
      const __isPtr64 = (ptr2) => "bigint" === typeof ptr2 && ptr2 >= 0 || __isPtr32(ptr2);
      const __isPtr = 4 === ptrSize ? __isPtr32 : __isPtr64;
      const __isNonNullPtr = (v2) => __isPtr(v2) && v2 > 0;
      const __freeStruct = function(ctor, obj, m) {
        const ii = getInstanceHandle(obj, false);
        if (!ii || ii.isDisposing) return;
        ii.isDisposing = true;
        if (!m && !(m = ii.p)) {
          console.warn("Cannot(?) happen: __freeStruct() found no instanceInfo");
          return;
        }
        if (Array.isArray(obj.ondispose)) {
          let x;
          while (x = obj.ondispose.pop()) try {
            if (x instanceof Function) x.call(obj);
            else if (x instanceof StructType) x.dispose();
            else if (__isPtr(x)) dealloc(x);
          } catch (e4) {
            console.warn("ondispose() for", ctor.structName, "@", m, "threw. NOT propagating it.", e4);
          }
        } else if (obj.ondispose instanceof Function) try {
          obj.ondispose();
        } catch (e4) {
          console.warn("ondispose() for", ctor.structName, "@", m, "threw. NOT propagating it.", e4);
        }
        rmInstanceHandle(obj);
        delete obj.ondispose;
        if (ctor.debugFlags.__flags.dealloc) log("debug.dealloc:", ii.ownsPointer ? "" : "EXTERNAL", ctor.structName, "instance:", ctor.structInfo.sizeof, "bytes @" + m);
        if (ii.ownsPointer) {
          if (ii.zod || ctor.structInfo.zeroOnDispose) heap().fill(0, Number(m), Number(m) + ctor.structInfo.sizeof + ii.xb);
          dealloc(m);
        }
      };
      const rop0 = () => {
        return {
          configurable: false,
          writable: false,
          iterable: false
        };
      };
      const rop = (v2) => {
        return {
          ...rop0(),
          value: v2
        };
      };
      const __allocStruct = function f2(ctor, obj, xm) {
        let opt;
        const checkPtr = (ptr2) => {
          __isNonNullPtr(ptr2) || toss("Invalid pointer value", arguments[0], "for", ctor.structName, "constructor.");
        };
        if (arguments.length >= 3) {
          if (xm && "object" === typeof xm) {
            opt = xm;
            xm = opt?.wrap;
          } else {
            checkPtr(xm);
            opt = { wrap: xm };
          }
        } else opt = {};
        const fill2 = !xm;
        let nAlloc = 0;
        let ownsPointer = false;
        if (xm) {
          checkPtr(xm);
          ownsPointer = !!opt?.takeOwnership;
        } else {
          const nX = opt?.extraBytes ?? 0;
          if (nX < 0 || nX !== (nX | 0)) toss("Invalid extraBytes value:", opt?.extraBytes);
          nAlloc = ctor.structInfo.sizeof + nX;
          xm = alloc(nAlloc) || toss("Allocation of", ctor.structName, "structure failed.");
          ownsPointer = true;
        }
        try {
          if (opt?.debugFlags) obj.debugFlags(opt.debugFlags);
          if (ctor.debugFlags.__flags.alloc) log("debug.alloc:", fill2 ? "" : "EXTERNAL", ctor.structName, "instance:", ctor.structInfo.sizeof, "bytes @" + xm);
          if (fill2) heap().fill(0, Number(xm), Number(xm) + nAlloc);
          const ii = getInstanceHandle(obj);
          ii.p = xm;
          ii.ownsPointer = ownsPointer;
          ii.xb = nAlloc ? nAlloc - ctor.structInfo.sizeof : 0;
          ii.zod = !!opt?.zeroOnDispose;
          if (opt?.ondispose && opt.ondispose !== xm) obj.addOnDispose(opt.ondispose);
        } catch (e4) {
          __freeStruct(ctor, obj, xm);
          throw e4;
        }
      };
      const looksLikeASig = function f2(sig) {
        f2.rxSig1 ??= /^[ipPsjfdcC]$/;
        f2.rxSig2 ??= /^[vipPsjfdcC]\([ipPsjfdcC]*\)$/;
        return f2.rxSig1.test(sig) || f2.rxSig2.test(sig);
      };
      const __adaptorsFor = function(who) {
        let x = this.get(who);
        if (!x) {
          x = [
            /* @__PURE__ */ Object.create(null),
            /* @__PURE__ */ Object.create(null),
            /* @__PURE__ */ Object.create(null)
          ];
          this.set(who, x);
        }
        return x;
      }.bind(/* @__PURE__ */ new WeakMap());
      const __adaptor = function(who, which, key, proxy) {
        const a = __adaptorsFor(who)[which];
        if (3 === arguments.length) return a[key];
        if (proxy) return a[key] = proxy;
        return delete a[key];
      };
      const __adaptGet = function(key, ...args) {
        return __adaptor(this, 0, key, ...args);
      };
      const __affirmNotASig = function(ctx, key) {
        looksLikeASig(key) && toss(ctx, "(", key, ") collides with a data type signature.");
      };
      const __adaptSet = function(key, ...args) {
        __affirmNotASig("Setter adaptor", key);
        return __adaptor(this, 1, key, ...args);
      };
      const __adaptStruct = function(key, ...args) {
        __affirmNotASig("Struct adaptor", key);
        return __adaptor(this, 2, key, ...args);
      };
      const __adaptStruct2 = function(who, key) {
        const si = "string" === typeof key ? __adaptor(who, 2, key) : key;
        if ("object" !== typeof si) toss("Invalid struct mapping object. Arg =", key, JSON.stringify(si));
        return si;
      };
      const __memberKey = (k2) => memberPrefix + k2 + memberSuffix;
      const __memberKeyProp = rop(__memberKey);
      const __lookupMember = function(structInfo, memberName, tossIfNotFound = true) {
        let m = structInfo.members[memberName];
        if (!m && (memberPrefix || memberSuffix)) {
          for (const v2 of Object.values(structInfo.members)) if (v2.key === memberName) {
            m = v2;
            break;
          }
          if (!m && tossIfNotFound) toss(sPropName(structInfo.name || structInfo.structName, memberName), "is not a mapped struct member.");
        }
        return m;
      };
      const __memberSignature = function f2(obj, memberName, emscriptenFormat = false) {
        if (!f2._) f2._ = (x) => x.replace(/[^vipPsjrdcC]/g, "").replace(/[pPscC]/g, "i");
        const m = __lookupMember(obj.structInfo, memberName, true);
        return emscriptenFormat ? f2._(m.signature) : m.signature;
      };
      const __structMemberKeys = rop(function() {
        const a = [];
        for (const k2 of Object.keys(this.structInfo.members)) a.push(this.memberKey(k2));
        return a;
      });
      const __utf8Decoder = new TextDecoder("utf-8");
      const __utf8Encoder = new TextEncoder();
      const __SAB = "undefined" === typeof SharedArrayBuffer ? function() {
      } : SharedArrayBuffer;
      const __utf8Decode = function(arrayBuffer, begin, end) {
        if (8 === ptrSize) {
          begin = Number(begin);
          end = Number(end);
        }
        return __utf8Decoder.decode(arrayBuffer.buffer instanceof __SAB ? arrayBuffer.slice(begin, end) : arrayBuffer.subarray(begin, end));
      };
      const __memberIsString = function(obj, memberName, tossIfNotFound = false) {
        const m = __lookupMember(obj.structInfo, memberName, tossIfNotFound);
        return m && 1 === m.signature.length && "s" === m.signature[0] ? m : false;
      };
      const __affirmCStringSignature = function(member) {
        if ("s" === member.signature) return;
        toss("Invalid member type signature for C-string value:", JSON.stringify(member));
      };
      const __memberToJsString = function f2(obj, memberName) {
        const m = __lookupMember(obj.structInfo, memberName, true);
        __affirmCStringSignature(m);
        const addr = obj[m.key];
        if (!addr) return null;
        let pos = addr;
        const mem = heap();
        for (; mem[pos] !== 0; ++pos) ;
        return addr === pos ? "" : __utf8Decode(mem, addr, pos);
      };
      const __addOnDispose = function(obj, ...v2) {
        if (obj.ondispose) {
          if (!Array.isArray(obj.ondispose)) obj.ondispose = [obj.ondispose];
        } else obj.ondispose = [];
        obj.ondispose.push(...v2);
      };
      const __allocCString = function(str) {
        const u = __utf8Encoder.encode(str);
        const mem = alloc(u.length + 1);
        if (!mem) toss("Allocation error while duplicating string:", str);
        const h = heap();
        h.set(u, Number(mem));
        h[__ptrAdd(mem, u.length)] = 0;
        return mem;
      };
      const __setMemberCString = function(obj, memberName, str) {
        const m = __lookupMember(obj.structInfo, memberName, true);
        __affirmCStringSignature(m);
        const mem = __allocCString(str);
        obj[m.key] = mem;
        __addOnDispose(obj, mem);
        return obj;
      };
      const StructType = function StructType2(structName, structInfo) {
        if (arguments[2] !== rop) toss("Do not call the StructType constructor", "from client-level code.");
        Object.defineProperties(this, {
          structName: rop(structName),
          structInfo: rop(structInfo)
        });
      };
      StructType.prototype = Object.create(null, {
        dispose: rop(function() {
          __freeStruct(this.constructor, this);
        }),
        lookupMember: rop(function(memberName, tossIfNotFound = true) {
          return __lookupMember(this.structInfo, memberName, tossIfNotFound);
        }),
        memberToJsString: rop(function(memberName) {
          return __memberToJsString(this, memberName);
        }),
        memberIsString: rop(function(memberName, tossIfNotFound = true) {
          return __memberIsString(this, memberName, tossIfNotFound);
        }),
        memberKey: __memberKeyProp,
        memberKeys: __structMemberKeys,
        memberSignature: rop(function(memberName, emscriptenFormat = false) {
          return __memberSignature(this, memberName, emscriptenFormat);
        }),
        memoryDump: rop(function() {
          const p2 = this.pointer;
          return p2 ? new Uint8Array(heap().slice(Number(p2), Number(p2) + this.structInfo.sizeof)) : null;
        }),
        extraBytes: {
          configurable: false,
          enumerable: false,
          get: function() {
            return getInstanceHandle(this, false)?.xb ?? 0;
          }
        },
        zeroOnDispose: {
          configurable: false,
          enumerable: false,
          get: function() {
            return getInstanceHandle(this, false)?.zod ?? !!this.structInfo.zeroOnDispose;
          }
        },
        pointer: {
          configurable: false,
          enumerable: false,
          get: function() {
            return getInstanceHandle(this, false)?.p;
          },
          set: () => toss("Cannot assign the 'pointer' property of a struct.")
        },
        setMemberCString: rop(function(memberName, str) {
          return __setMemberCString(this, memberName, str);
        })
      });
      Object.assign(StructType.prototype, { addOnDispose: function(...v2) {
        __addOnDispose(this, ...v2);
        return this;
      } });
      Object.defineProperties(StructType, {
        allocCString: rop(__allocCString),
        isA: rop((v2) => v2 instanceof StructType),
        hasExternalPointer: rop((v2) => {
          const ii = getInstanceHandle(v2, false);
          return !!(ii?.p && !ii?.ownsPointer);
        }),
        memberKey: __memberKeyProp
      });
      const memberGetterProxy = function(si) {
        return si.get || (si.adaptGet ? StructBinder.adaptGet(si.adaptGet) : void 0);
      };
      const memberSetterProxy = function(si) {
        return si.set || (si.adaptSet ? StructBinder.adaptSet(si.adaptSet) : void 0);
      };
      const makeMemberStructWrapper = function callee3(ctor, name, si) {
        const __innerStructs = callee3.innerStructs ??= /* @__PURE__ */ new Map();
        const key = ctor.memberKey(name);
        if (void 0 !== si.signature) toss("'signature' cannot be used on an embedded struct (", ctor.structName, ".", key, ").");
        if (memberSetterProxy(si)) toss("'set' and 'adaptSet' are not permitted for nested struct members.");
        si.structName ??= ctor.structName + "::" + name;
        si.key = key;
        si.name = name;
        si.constructor = this.call(this, si.structName, si);
        const getterProxy = memberGetterProxy(si);
        const prop = Object.assign(/* @__PURE__ */ Object.create(null), {
          configurable: false,
          enumerable: false,
          set: __propThrowOnSet(ctor.structName, key),
          get: function() {
            const dbg = this.debugFlags.__flags;
            const p2 = this.pointer;
            const k2 = p2 + "." + key;
            let s2 = __innerStructs.get(k2);
            if (dbg.getter) log("debug.getter: k =", k2);
            if (!s2) {
              s2 = new si.constructor(__ptrAdd(p2, si.offset));
              __innerStructs.set(k2, s2);
              this.addOnDispose(() => s2.dispose());
              s2.addOnDispose(() => __innerStructs.delete(k2));
            }
            if (getterProxy) s2 = getterProxy.apply(this, [s2, key]);
            if (dbg.getter) log("debug.getter: result =", s2);
            return s2;
          }
        });
        Object.defineProperty(ctor.prototype, key, prop);
      };
      const makeMemberWrapper = function f2(ctor, name, si) {
        si = __adaptStruct2(this, si);
        if (si.members) return makeMemberStructWrapper.call(this, ctor, name, si);
        if (!f2.cache) {
          f2.cache = {
            getters: {},
            setters: {},
            sw: {}
          };
          const a = [
            "i",
            "c",
            "C",
            "p",
            "P",
            "s",
            "f",
            "d",
            "v()"
          ];
          if (bigIntEnabled) a.push("j");
          a.forEach(function(v2) {
            f2.cache.getters[v2] = sigDVGetter(v2);
            f2.cache.setters[v2] = sigDVSetter(v2);
            f2.cache.sw[v2] = sigDVSetWrapper(v2);
          });
          f2.sigCheck = function(obj, name2, key2, sig) {
            if (Object.prototype.hasOwnProperty.call(obj, key2)) toss(obj.structName, "already has a property named", key2 + ".");
            looksLikeASig(sig) || toss("Malformed signature for", sPropName(obj.structName, name2) + ":", sig);
          };
        }
        const key = ctor.memberKey(name);
        f2.sigCheck(ctor.prototype, name, key, si.signature);
        si.key = key;
        si.name = name;
        const sigGlyph = sigLetter(si.signature);
        const xPropName = sPropName(ctor.structName, key);
        const dbg = ctor.debugFlags.__flags;
        const getterProxy = memberGetterProxy(si);
        const prop = /* @__PURE__ */ Object.create(null);
        prop.configurable = false;
        prop.enumerable = false;
        prop.get = function() {
          if (dbg.getter) log("debug.getter:", f2.cache.getters[sigGlyph], "for", sigIR(sigGlyph), xPropName, "@", this.pointer, "+", si.offset, "sz", si.sizeof);
          let rc = new DataView(heap().buffer, Number(this.pointer) + si.offset, si.sizeof)[f2.cache.getters[sigGlyph]](0, isLittleEndian);
          if (getterProxy) rc = getterProxy.apply(this, [key, rc]);
          if (dbg.getter) log("debug.getter:", xPropName, "result =", rc);
          return rc;
        };
        if (si.readOnly) prop.set = __propThrowOnSet(ctor.prototype.structName, key);
        else {
          const setterProxy = memberSetterProxy(si);
          prop.set = function(v2) {
            if (dbg.setter) log("debug.setter:", f2.cache.setters[sigGlyph], "for", sigIR(sigGlyph), xPropName, "@", this.pointer, "+", si.offset, "sz", si.sizeof, v2);
            if (!this.pointer) toss("Cannot set native property on a disposed", this.structName, "instance.");
            if (setterProxy) v2 = setterProxy.apply(this, [key, v2]);
            if (null === v2 || void 0 === v2) v2 = __NullPtr;
            else if (isPtrSig(si.signature) && !__isPtr(v2)) {
              if (isAutoPtrSig(si.signature) && v2 instanceof StructType) {
                v2 = v2.pointer || __NullPtr;
                if (dbg.setter) log("debug.setter:", xPropName, "resolved to", v2);
              } else toss("Invalid value for pointer-type", xPropName + ".");
            }
            new DataView(heap().buffer, Number(this.pointer) + si.offset, si.sizeof)[f2.cache.setters[sigGlyph]](0, f2.cache.sw[sigGlyph](v2), isLittleEndian);
          };
        }
        Object.defineProperty(ctor.prototype, key, prop);
      };
      const StructBinderImpl = function StructBinderImpl2(structName, si, opt = /* @__PURE__ */ Object.create(null)) {
        const StructCtor = function StructCtor2(arg) {
          if (!(this instanceof StructCtor2)) toss("The", structName, "constructor may only be called via 'new'.");
          __allocStruct(StructCtor2, this, ...arguments);
        };
        const self2 = this;
        const ads = (x) => {
          return "string" === typeof x && looksLikeASig(x) ? { signature: x } : __adaptStruct2(self2, x);
        };
        if (1 === arguments.length) {
          si = ads(structName);
          structName = si.structName || si.name;
        } else if (2 === arguments.length) {
          si = ads(si);
          si.name ??= structName;
        } else si = ads(si);
        structName ??= si.structName;
        structName ??= opt.structName;
        if (!structName) toss("One of 'name' or 'structName' are required.");
        if (si.adapt) {
          Object.keys(si.adapt.struct || {}).forEach((k2) => {
            __adaptStruct.call(StructBinderImpl2, k2, si.adapt.struct[k2]);
          });
          Object.keys(si.adapt.set || {}).forEach((k2) => {
            __adaptSet.call(StructBinderImpl2, k2, si.adapt.set[k2]);
          });
          Object.keys(si.adapt.get || {}).forEach((k2) => {
            __adaptGet.call(StructBinderImpl2, k2, si.adapt.get[k2]);
          });
        }
        if (!si.members && !si.sizeof) si.sizeof = sigSize(si.signature);
        const debugFlags = rop(SBF.__makeDebugFlags(StructBinder.debugFlags));
        Object.defineProperties(StructCtor, {
          debugFlags,
          isA: rop((v2) => v2 instanceof StructCtor),
          memberKey: __memberKeyProp,
          memberKeys: __structMemberKeys,
          structInfo: rop(si),
          structName: rop(structName),
          ptrAdd: rop(__ptrAdd)
        });
        StructCtor.prototype = new StructType(structName, si, rop);
        Object.defineProperties(StructCtor.prototype, {
          debugFlags,
          constructor: rop(StructCtor),
          ptrAdd: rop(__ptrAddSelf)
        });
        let lastMember = false;
        let offset = 0;
        const autoCalc = !!si.autoCalcSizeOffset;
        if (!autoCalc) {
          if (!si.sizeof) toss(structName, "description is missing its sizeof property.");
          si.offset ??= 0;
        } else si.offset ??= 0;
        Object.keys(si.members || {}).forEach((k2) => {
          let m = ads(si.members[k2]);
          if (!m.members && !m.sizeof) {
            m.sizeof = sigSize(m.signature);
            if (!m.sizeof) toss(sPropName(structName, k2), "is missing a sizeof property.", m);
          }
          if (void 0 === m.offset) {
            if (autoCalc) m.offset = offset;
            else toss(sPropName(structName, k2), "is missing its offset.", JSON.stringify(m));
          }
          si.members[k2] = m;
          if (!lastMember || lastMember.offset < m.offset) lastMember = m;
          const oldAutoCalc = !!m.autoCalc;
          if (autoCalc) m.autoCalcSizeOffset = true;
          makeMemberWrapper.call(self2, StructCtor, k2, m);
          if (oldAutoCalc) m.autoCalcSizeOffset = true;
          else delete m.autoCalcSizeOffset;
          offset += m.sizeof;
        });
        if (!lastMember) toss("No member property descriptions found.");
        if (!si.sizeof) si.sizeof = offset;
        if (si.sizeof === 1) si.signature === "c" || si.signature === "C" || toss("Unexpected sizeof==1 member", sPropName(structName, k), "with signature", si.signature);
        else {
          if (0 !== si.sizeof % 4) {
            console.warn("Invalid struct member description", si);
            toss(structName, "sizeof is not aligned. sizeof=" + si.sizeof);
          }
          if (0 !== si.offset % 4) {
            console.warn("Invalid struct member description", si);
            toss(structName, "offset is not aligned. offset=" + si.offset);
          }
        }
        if (si.sizeof < offset) {
          console.warn("Suspect struct description:", si, "offset =", offset);
          toss("Mismatch in the calculated vs. the provided sizeof/offset info.", "Expected sizeof", offset, "but got", si.sizeof, "for", si);
        }
        delete si.autoCalcSizeOffset;
        return StructCtor;
      };
      const StructBinder = function StructBinder2(structName, structInfo) {
        return 1 == arguments.length ? StructBinderImpl.call(StructBinder2, structName) : StructBinderImpl.call(StructBinder2, structName, structInfo);
      };
      StructBinder.StructType = StructType;
      StructBinder.config = config2;
      StructBinder.allocCString = __allocCString;
      StructBinder.adaptGet = __adaptGet;
      StructBinder.adaptSet = __adaptSet;
      StructBinder.adaptStruct = __adaptStruct;
      StructBinder.ptrAdd = __ptrAdd;
      if (!StructBinder.debugFlags) StructBinder.debugFlags = SBF.__makeDebugFlags(SBF.debugFlags);
      return StructBinder;
    };
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      "use strict";
      const toss = (...args) => {
        throw new Error(args.join(" "));
      };
      const capi = sqlite3.capi, wasm3 = sqlite3.wasm, util = sqlite3.util;
      globalThis.WhWasmUtilInstaller(wasm3);
      delete globalThis.WhWasmUtilInstaller;
      const bindingSignatures = {
        core: [
          [
            "sqlite3_aggregate_context",
            "void*",
            "sqlite3_context*",
            "int"
          ],
          [
            "sqlite3_backup_init",
            "sqlite3_backup*",
            "sqlite3*",
            "string",
            "sqlite3*",
            "string"
          ],
          [
            "sqlite3_backup_step",
            "int",
            "sqlite3_backup*",
            "int"
          ],
          [
            "sqlite3_backup_finish",
            "int",
            "sqlite3_backup*"
          ],
          [
            "sqlite3_backup_remaining",
            "int",
            "sqlite3_backup*"
          ],
          [
            "sqlite3_backup_pagecount",
            "int",
            "sqlite3_backup*"
          ],
          [
            "sqlite3_bind_double",
            "int",
            "sqlite3_stmt*",
            "int",
            "f64"
          ],
          [
            "sqlite3_bind_int",
            "int",
            "sqlite3_stmt*",
            "int",
            "int"
          ],
          [
            "sqlite3_bind_null",
            void 0,
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_bind_parameter_count",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_bind_parameter_index",
            "int",
            "sqlite3_stmt*",
            "string"
          ],
          [
            "sqlite3_bind_parameter_name",
            "string",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_bind_pointer",
            "int",
            "sqlite3_stmt*",
            "int",
            "*",
            "string:static",
            "*"
          ],
          [
            "sqlite3_bind_zeroblob",
            "int",
            "sqlite3_stmt*",
            "int",
            "int"
          ],
          [
            "sqlite3_busy_handler",
            "int",
            [
              "sqlite3*",
              new wasm3.xWrap.FuncPtrAdapter({
                signature: "i(pi)",
                contextKey: (argv, argIndex) => argv[0]
              }),
              "*"
            ]
          ],
          [
            "sqlite3_busy_timeout",
            "int",
            "sqlite3*",
            "int"
          ],
          [
            "sqlite3_changes",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_clear_bindings",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_collation_needed",
            "int",
            "sqlite3*",
            "*",
            "*"
          ],
          [
            "sqlite3_column_blob",
            "*",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_bytes",
            "int",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_count",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_column_decltype",
            "string",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_double",
            "f64",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_int",
            "int",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_name",
            "string",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_type",
            "int",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_value",
            "sqlite3_value*",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_commit_hook",
            "void*",
            [
              "sqlite3*",
              new wasm3.xWrap.FuncPtrAdapter({
                name: "sqlite3_commit_hook",
                signature: "i(p)",
                contextKey: (argv) => argv[0]
              }),
              "*"
            ]
          ],
          [
            "sqlite3_compileoption_get",
            "string",
            "int"
          ],
          [
            "sqlite3_compileoption_used",
            "int",
            "string"
          ],
          [
            "sqlite3_complete",
            "int",
            "string:flexible"
          ],
          [
            "sqlite3_context_db_handle",
            "sqlite3*",
            "sqlite3_context*"
          ],
          [
            "sqlite3_data_count",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_db_filename",
            "string",
            "sqlite3*",
            "string"
          ],
          [
            "sqlite3_db_handle",
            "sqlite3*",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_db_name",
            "string",
            "sqlite3*",
            "int"
          ],
          [
            "sqlite3_db_readonly",
            "int",
            "sqlite3*",
            "string"
          ],
          [
            "sqlite3_db_status",
            "int",
            "sqlite3*",
            "int",
            "*",
            "*",
            "int"
          ],
          [
            "sqlite3_errcode",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_errmsg",
            "string",
            "sqlite3*"
          ],
          [
            "sqlite3_error_offset",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_errstr",
            "string",
            "int"
          ],
          [
            "sqlite3_exec",
            "int",
            [
              "sqlite3*",
              "string:flexible",
              new wasm3.xWrap.FuncPtrAdapter({
                signature: "i(pipp)",
                bindScope: "transient",
                callProxy: (callback) => {
                  let aNames;
                  return (pVoid, nCols, pColVals, pColNames) => {
                    try {
                      const aVals = wasm3.cArgvToJs(nCols, pColVals);
                      if (!aNames) aNames = wasm3.cArgvToJs(nCols, pColNames);
                      return callback(aVals, aNames) | 0;
                    } catch (e4) {
                      return e4.resultCode || capi.SQLITE_ERROR;
                    }
                  };
                }
              }),
              "*",
              "**"
            ]
          ],
          [
            "sqlite3_expanded_sql",
            "string",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_extended_errcode",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_extended_result_codes",
            "int",
            "sqlite3*",
            "int"
          ],
          [
            "sqlite3_file_control",
            "int",
            "sqlite3*",
            "string",
            "int",
            "*"
          ],
          [
            "sqlite3_finalize",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_free",
            void 0,
            "*"
          ],
          [
            "sqlite3_get_autocommit",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_get_auxdata",
            "*",
            "sqlite3_context*",
            "int"
          ],
          ["sqlite3_initialize", void 0],
          [
            "sqlite3_interrupt",
            void 0,
            "sqlite3*"
          ],
          [
            "sqlite3_is_interrupted",
            "int",
            "sqlite3*"
          ],
          ["sqlite3_keyword_count", "int"],
          [
            "sqlite3_keyword_name",
            "int",
            [
              "int",
              "**",
              "*"
            ]
          ],
          [
            "sqlite3_keyword_check",
            "int",
            ["string", "int"]
          ],
          ["sqlite3_libversion", "string"],
          ["sqlite3_libversion_number", "int"],
          [
            "sqlite3_limit",
            "int",
            [
              "sqlite3*",
              "int",
              "int"
            ]
          ],
          [
            "sqlite3_malloc",
            "*",
            "int"
          ],
          [
            "sqlite3_next_stmt",
            "sqlite3_stmt*",
            ["sqlite3*", "sqlite3_stmt*"]
          ],
          [
            "sqlite3_open",
            "int",
            "string",
            "*"
          ],
          [
            "sqlite3_open_v2",
            "int",
            "string",
            "*",
            "int",
            "string"
          ],
          [
            "sqlite3_realloc",
            "*",
            "*",
            "int"
          ],
          [
            "sqlite3_reset",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_result_blob",
            void 0,
            "sqlite3_context*",
            "*",
            "int",
            "*"
          ],
          [
            "sqlite3_result_double",
            void 0,
            "sqlite3_context*",
            "f64"
          ],
          [
            "sqlite3_result_error",
            void 0,
            "sqlite3_context*",
            "string",
            "int"
          ],
          [
            "sqlite3_result_error_code",
            void 0,
            "sqlite3_context*",
            "int"
          ],
          [
            "sqlite3_result_error_nomem",
            void 0,
            "sqlite3_context*"
          ],
          [
            "sqlite3_result_error_toobig",
            void 0,
            "sqlite3_context*"
          ],
          [
            "sqlite3_result_int",
            void 0,
            "sqlite3_context*",
            "int"
          ],
          [
            "sqlite3_result_null",
            void 0,
            "sqlite3_context*"
          ],
          [
            "sqlite3_result_pointer",
            void 0,
            "sqlite3_context*",
            "*",
            "string:static",
            "*"
          ],
          [
            "sqlite3_result_subtype",
            void 0,
            "sqlite3_value*",
            "int"
          ],
          [
            "sqlite3_result_text",
            void 0,
            "sqlite3_context*",
            "string",
            "int",
            "*"
          ],
          [
            "sqlite3_result_zeroblob",
            void 0,
            "sqlite3_context*",
            "int"
          ],
          [
            "sqlite3_rollback_hook",
            "void*",
            [
              "sqlite3*",
              new wasm3.xWrap.FuncPtrAdapter({
                name: "sqlite3_rollback_hook",
                signature: "v(p)",
                contextKey: (argv) => argv[0]
              }),
              "*"
            ]
          ],
          [
            "sqlite3_set_auxdata",
            void 0,
            [
              "sqlite3_context*",
              "int",
              "*",
              "*"
            ]
          ],
          [
            "sqlite3_set_errmsg",
            "int",
            "sqlite3*",
            "int",
            "string"
          ],
          ["sqlite3_shutdown", void 0],
          ["sqlite3_sourceid", "string"],
          [
            "sqlite3_sql",
            "string",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_status",
            "int",
            "int",
            "*",
            "*",
            "int"
          ],
          [
            "sqlite3_step",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_stmt_busy",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_stmt_readonly",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_stmt_status",
            "int",
            "sqlite3_stmt*",
            "int",
            "int"
          ],
          [
            "sqlite3_strglob",
            "int",
            "string",
            "string"
          ],
          [
            "sqlite3_stricmp",
            "int",
            "string",
            "string"
          ],
          [
            "sqlite3_strlike",
            "int",
            "string",
            "string",
            "int"
          ],
          [
            "sqlite3_strnicmp",
            "int",
            "string",
            "string",
            "int"
          ],
          [
            "sqlite3_table_column_metadata",
            "int",
            "sqlite3*",
            "string",
            "string",
            "string",
            "**",
            "**",
            "*",
            "*",
            "*"
          ],
          [
            "sqlite3_total_changes",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_trace_v2",
            "int",
            [
              "sqlite3*",
              "int",
              new wasm3.xWrap.FuncPtrAdapter({
                name: "sqlite3_trace_v2::callback",
                signature: "i(ippp)",
                contextKey: (argv, argIndex) => argv[0]
              }),
              "*"
            ]
          ],
          [
            "sqlite3_txn_state",
            "int",
            ["sqlite3*", "string"]
          ],
          [
            "sqlite3_uri_boolean",
            "int",
            "sqlite3_filename",
            "string",
            "int"
          ],
          [
            "sqlite3_uri_key",
            "string",
            "sqlite3_filename",
            "int"
          ],
          [
            "sqlite3_uri_parameter",
            "string",
            "sqlite3_filename",
            "string"
          ],
          [
            "sqlite3_user_data",
            "void*",
            "sqlite3_context*"
          ],
          [
            "sqlite3_value_blob",
            "*",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_bytes",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_double",
            "f64",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_dup",
            "sqlite3_value*",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_free",
            void 0,
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_frombind",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_int",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_nochange",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_numeric_type",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_pointer",
            "*",
            "sqlite3_value*",
            "string:static"
          ],
          [
            "sqlite3_value_subtype",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_type",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_vfs_find",
            "*",
            "string"
          ],
          [
            "sqlite3_vfs_register",
            "int",
            "sqlite3_vfs*",
            "int"
          ],
          [
            "sqlite3_vfs_unregister",
            "int",
            "sqlite3_vfs*"
          ]
        ],
        /**
        Functions which require BigInt (int64) support are separated
        from the others because we need to conditionally bind them or
        apply dummy impls, depending on the capabilities of the
        environment.  (That said: we never actually build without
        BigInt support, and such builds are untested.)
        
        Not all of these functions directly require int64 but are only
        for use with APIs which require int64. For example, the
        vtab-related functions.
        */
        int64: [
          [
            "sqlite3_bind_int64",
            "int",
            [
              "sqlite3_stmt*",
              "int",
              "i64"
            ]
          ],
          [
            "sqlite3_changes64",
            "i64",
            ["sqlite3*"]
          ],
          [
            "sqlite3_column_int64",
            "i64",
            ["sqlite3_stmt*", "int"]
          ],
          [
            "sqlite3_deserialize",
            "int",
            "sqlite3*",
            "string",
            "*",
            "i64",
            "i64",
            "int"
          ],
          [
            "sqlite3_last_insert_rowid",
            "i64",
            ["sqlite3*"]
          ],
          [
            "sqlite3_malloc64",
            "*",
            "i64"
          ],
          [
            "sqlite3_msize",
            "i64",
            "*"
          ],
          [
            "sqlite3_overload_function",
            "int",
            [
              "sqlite3*",
              "string",
              "int"
            ]
          ],
          [
            "sqlite3_realloc64",
            "*",
            "*",
            "i64"
          ],
          [
            "sqlite3_result_int64",
            void 0,
            "*",
            "i64"
          ],
          [
            "sqlite3_result_zeroblob64",
            "int",
            "*",
            "i64"
          ],
          [
            "sqlite3_serialize",
            "*",
            "sqlite3*",
            "string",
            "*",
            "int"
          ],
          [
            "sqlite3_set_last_insert_rowid",
            void 0,
            ["sqlite3*", "i64"]
          ],
          [
            "sqlite3_status64",
            "int",
            "int",
            "*",
            "*",
            "int"
          ],
          [
            "sqlite3_db_status64",
            "int",
            "sqlite3*",
            "int",
            "*",
            "*",
            "int"
          ],
          [
            "sqlite3_total_changes64",
            "i64",
            ["sqlite3*"]
          ],
          [
            "sqlite3_update_hook",
            "*",
            [
              "sqlite3*",
              new wasm3.xWrap.FuncPtrAdapter({
                name: "sqlite3_update_hook::callback",
                signature: "v(pippj)",
                contextKey: (argv) => argv[0],
                callProxy: (callback) => {
                  return (p2, op, z0, z1, rowid) => {
                    callback(p2, op, wasm3.cstrToJs(z0), wasm3.cstrToJs(z1), rowid);
                  };
                }
              }),
              "*"
            ]
          ],
          [
            "sqlite3_uri_int64",
            "i64",
            [
              "sqlite3_filename",
              "string",
              "i64"
            ]
          ],
          [
            "sqlite3_value_int64",
            "i64",
            "sqlite3_value*"
          ]
        ],
        /**
        Functions which are intended solely for API-internal use by the
        WASM components, not client code. These get installed into
        sqlite3.util. Some of them get exposed to clients via variants
        in sqlite3_js_...().
        
        2024-01-11: these were renamed, with two underscores in the
        prefix, to ensure that clients do not accidentally depend on
        them.  They have always been documented as internal-use-only,
        so no clients "should" be depending on the old names.
        */
        wasmInternal: [
          [
            "sqlite3__wasm_db_reset",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3__wasm_db_vfs",
            "sqlite3_vfs*",
            "sqlite3*",
            "string"
          ],
          [
            "sqlite3__wasm_vfs_create_file",
            "int",
            "sqlite3_vfs*",
            "string",
            "*",
            "int"
          ],
          [
            "sqlite3__wasm_posix_create_file",
            "int",
            "string",
            "*",
            "int"
          ],
          [
            "sqlite3__wasm_vfs_unlink",
            "int",
            "sqlite3_vfs*",
            "string"
          ],
          [
            "sqlite3__wasm_qfmt_token",
            "string:dealloc",
            "string",
            "int"
          ]
        ]
      };
      if (!!wasm3.exports.sqlite3_progress_handler) bindingSignatures.core.push([
        "sqlite3_progress_handler",
        void 0,
        [
          "sqlite3*",
          "int",
          new wasm3.xWrap.FuncPtrAdapter({
            name: "xProgressHandler",
            signature: "i(p)",
            bindScope: "context",
            contextKey: (argv, argIndex) => argv[0]
          }),
          "*"
        ]
      ]);
      if (!!wasm3.exports.sqlite3_stmt_explain) bindingSignatures.core.push([
        "sqlite3_stmt_explain",
        "int",
        "sqlite3_stmt*",
        "int"
      ], [
        "sqlite3_stmt_isexplain",
        "int",
        "sqlite3_stmt*"
      ]);
      if (!!wasm3.exports.sqlite3_set_authorizer) bindingSignatures.core.push([
        "sqlite3_set_authorizer",
        "int",
        [
          "sqlite3*",
          new wasm3.xWrap.FuncPtrAdapter({
            name: "sqlite3_set_authorizer::xAuth",
            signature: "i(pissss)",
            contextKey: (argv, argIndex) => argv[0],
            /**
            We use callProxy here to ensure (A) that exceptions
            thrown from callback() have well-defined behavior and (B)
            that its result is coerced to an integer.
            */
            callProxy: (callback) => {
              return (pV, iCode, s0, s1, s2, s3) => {
                try {
                  s0 = s0 && wasm3.cstrToJs(s0);
                  s1 = s1 && wasm3.cstrToJs(s1);
                  s2 = s2 && wasm3.cstrToJs(s2);
                  s3 = s3 && wasm3.cstrToJs(s3);
                  return callback(pV, iCode, s0, s1, s2, s3) | 0;
                } catch (e4) {
                  return e4.resultCode || capi.SQLITE_ERROR;
                }
              };
            }
          }),
          "*"
        ]
      ]);
      if (!!wasm3.exports.sqlite3_column_origin_name) bindingSignatures.core.push([
        "sqlite3_column_database_name",
        "string",
        "sqlite3_stmt*",
        "int"
      ], [
        "sqlite3_column_origin_name",
        "string",
        "sqlite3_stmt*",
        "int"
      ], [
        "sqlite3_column_table_name",
        "string",
        "sqlite3_stmt*",
        "int"
      ]);
      if (wasm3.bigIntEnabled && !!wasm3.exports.sqlite3_declare_vtab) bindingSignatures.int64.push([
        "sqlite3_create_module",
        "int",
        [
          "sqlite3*",
          "string",
          "sqlite3_module*",
          "*"
        ]
      ], [
        "sqlite3_create_module_v2",
        "int",
        [
          "sqlite3*",
          "string",
          "sqlite3_module*",
          "*",
          "*"
        ]
      ], [
        "sqlite3_declare_vtab",
        "int",
        ["sqlite3*", "string:flexible"]
      ], [
        "sqlite3_drop_modules",
        "int",
        ["sqlite3*", "**"]
      ], [
        "sqlite3_vtab_collation",
        "string",
        "sqlite3_index_info*",
        "int"
      ], [
        "sqlite3_vtab_distinct",
        "int",
        "sqlite3_index_info*"
      ], [
        "sqlite3_vtab_in",
        "int",
        "sqlite3_index_info*",
        "int",
        "int"
      ], [
        "sqlite3_vtab_in_first",
        "int",
        "sqlite3_value*",
        "**"
      ], [
        "sqlite3_vtab_in_next",
        "int",
        "sqlite3_value*",
        "**"
      ], [
        "sqlite3_vtab_nochange",
        "int",
        "sqlite3_context*"
      ], [
        "sqlite3_vtab_on_conflict",
        "int",
        "sqlite3*"
      ], [
        "sqlite3_vtab_rhs_value",
        "int",
        "sqlite3_index_info*",
        "int",
        "**"
      ]);
      if (wasm3.bigIntEnabled && !!wasm3.exports.sqlite3_preupdate_hook) bindingSignatures.int64.push([
        "sqlite3_preupdate_blobwrite",
        "int",
        "sqlite3*"
      ], [
        "sqlite3_preupdate_count",
        "int",
        "sqlite3*"
      ], [
        "sqlite3_preupdate_depth",
        "int",
        "sqlite3*"
      ], [
        "sqlite3_preupdate_hook",
        "*",
        [
          "sqlite3*",
          new wasm3.xWrap.FuncPtrAdapter({
            name: "sqlite3_preupdate_hook",
            signature: "v(ppippjj)",
            contextKey: (argv) => argv[0],
            callProxy: (callback) => {
              return (p2, db, op, zDb, zTbl, iKey1, iKey2) => {
                callback(p2, db, op, wasm3.cstrToJs(zDb), wasm3.cstrToJs(zTbl), iKey1, iKey2);
              };
            }
          }),
          "*"
        ]
      ], [
        "sqlite3_preupdate_new",
        "int",
        [
          "sqlite3*",
          "int",
          "**"
        ]
      ], [
        "sqlite3_preupdate_old",
        "int",
        [
          "sqlite3*",
          "int",
          "**"
        ]
      ]);
      if (wasm3.bigIntEnabled && !!wasm3.exports.sqlite3changegroup_add && !!wasm3.exports.sqlite3session_create && !!wasm3.exports.sqlite3_preupdate_hook) {
        const __ipsProxy = {
          signature: "i(ps)",
          callProxy: (callback) => {
            return (p2, s2) => {
              try {
                return callback(p2, wasm3.cstrToJs(s2)) | 0;
              } catch (e4) {
                return e4.resultCode || capi.SQLITE_ERROR;
              }
            };
          }
        };
        bindingSignatures.int64.push([
          "sqlite3changegroup_add",
          "int",
          [
            "sqlite3_changegroup*",
            "int",
            "void*"
          ]
        ], [
          "sqlite3changegroup_add_strm",
          "int",
          [
            "sqlite3_changegroup*",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changegroup_delete",
          void 0,
          ["sqlite3_changegroup*"]
        ], [
          "sqlite3changegroup_new",
          "int",
          ["**"]
        ], [
          "sqlite3changegroup_output",
          "int",
          [
            "sqlite3_changegroup*",
            "int*",
            "**"
          ]
        ], [
          "sqlite3changegroup_output_strm",
          "int",
          [
            "sqlite3_changegroup*",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xOutput",
              signature: "i(ppi)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_apply",
          "int",
          [
            "sqlite3*",
            "int",
            "void*",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xFilter",
              bindScope: "transient",
              ...__ipsProxy
            }),
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_apply_strm",
          "int",
          [
            "sqlite3*",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xFilter",
              bindScope: "transient",
              ...__ipsProxy
            }),
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_apply_v2",
          "int",
          [
            "sqlite3*",
            "int",
            "void*",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xFilter",
              bindScope: "transient",
              ...__ipsProxy
            }),
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*",
            "**",
            "int*",
            "int"
          ]
        ], [
          "sqlite3changeset_apply_v2_strm",
          "int",
          [
            "sqlite3*",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xFilter",
              bindScope: "transient",
              ...__ipsProxy
            }),
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*",
            "**",
            "int*",
            "int"
          ]
        ], [
          "sqlite3changeset_apply_v3",
          "int",
          [
            "sqlite3*",
            "int",
            "void*",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xFilter",
              signature: "i(pp)",
              bindScope: "transient"
            }),
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*",
            "**",
            "int*",
            "int"
          ]
        ], [
          "sqlite3changeset_apply_v3_strm",
          "int",
          [
            "sqlite3*",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xFilter",
              signature: "i(pp)",
              bindScope: "transient"
            }),
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*",
            "**",
            "int*",
            "int"
          ]
        ], [
          "sqlite3changeset_concat",
          "int",
          [
            "int",
            "void*",
            "int",
            "void*",
            "int*",
            "**"
          ]
        ], [
          "sqlite3changeset_concat_strm",
          "int",
          [
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xInputA",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xInputB",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xOutput",
              signature: "i(ppi)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_conflict",
          "int",
          [
            "sqlite3_changeset_iter*",
            "int",
            "**"
          ]
        ], [
          "sqlite3changeset_finalize",
          "int",
          ["sqlite3_changeset_iter*"]
        ], [
          "sqlite3changeset_fk_conflicts",
          "int",
          ["sqlite3_changeset_iter*", "int*"]
        ], [
          "sqlite3changeset_invert",
          "int",
          [
            "int",
            "void*",
            "int*",
            "**"
          ]
        ], [
          "sqlite3changeset_invert_strm",
          "int",
          [
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xOutput",
              signature: "i(ppi)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_new",
          "int",
          [
            "sqlite3_changeset_iter*",
            "int",
            "**"
          ]
        ], [
          "sqlite3changeset_next",
          "int",
          ["sqlite3_changeset_iter*"]
        ], [
          "sqlite3changeset_old",
          "int",
          [
            "sqlite3_changeset_iter*",
            "int",
            "**"
          ]
        ], [
          "sqlite3changeset_op",
          "int",
          [
            "sqlite3_changeset_iter*",
            "**",
            "int*",
            "int*",
            "int*"
          ]
        ], [
          "sqlite3changeset_pk",
          "int",
          [
            "sqlite3_changeset_iter*",
            "**",
            "int*"
          ]
        ], [
          "sqlite3changeset_start",
          "int",
          [
            "**",
            "int",
            "*"
          ]
        ], [
          "sqlite3changeset_start_strm",
          "int",
          [
            "**",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_start_v2",
          "int",
          [
            "**",
            "int",
            "*",
            "int"
          ]
        ], [
          "sqlite3changeset_start_v2_strm",
          "int",
          [
            "**",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            "int"
          ]
        ], [
          "sqlite3session_attach",
          "int",
          ["sqlite3_session*", "string"]
        ], [
          "sqlite3session_changeset",
          "int",
          [
            "sqlite3_session*",
            "int*",
            "**"
          ]
        ], [
          "sqlite3session_changeset_size",
          "i64",
          ["sqlite3_session*"]
        ], [
          "sqlite3session_changeset_strm",
          "int",
          [
            "sqlite3_session*",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xOutput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3session_config",
          "int",
          ["int", "void*"]
        ], [
          "sqlite3session_create",
          "int",
          [
            "sqlite3*",
            "string",
            "**"
          ]
        ], [
          "sqlite3session_diff",
          "int",
          [
            "sqlite3_session*",
            "string",
            "string",
            "**"
          ]
        ], [
          "sqlite3session_enable",
          "int",
          ["sqlite3_session*", "int"]
        ], [
          "sqlite3session_indirect",
          "int",
          ["sqlite3_session*", "int"]
        ], [
          "sqlite3session_isempty",
          "int",
          ["sqlite3_session*"]
        ], [
          "sqlite3session_memory_used",
          "i64",
          ["sqlite3_session*"]
        ], [
          "sqlite3session_object_config",
          "int",
          [
            "sqlite3_session*",
            "int",
            "void*"
          ]
        ], [
          "sqlite3session_patchset",
          "int",
          [
            "sqlite3_session*",
            "*",
            "**"
          ]
        ], [
          "sqlite3session_patchset_strm",
          "int",
          [
            "sqlite3_session*",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xOutput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3session_table_filter",
          void 0,
          [
            "sqlite3_session*",
            new wasm3.xWrap.FuncPtrAdapter({
              name: "xFilter",
              ...__ipsProxy,
              contextKey: (argv, argIndex) => argv[0]
            }),
            "*"
          ]
        ]);
      }
      sqlite3.StructBinder = globalThis.Jaccwabyt({
        heap: wasm3.heap8u,
        alloc: wasm3.alloc,
        dealloc: wasm3.dealloc,
        bigIntEnabled: wasm3.bigIntEnabled,
        pointerIR: wasm3.ptr.ir,
        memberPrefix: "$"
      });
      delete globalThis.Jaccwabyt;
      {
        const __xString = wasm3.xWrap.argAdapter("string");
        wasm3.xWrap.argAdapter("string:flexible", (v2) => __xString(util.flexibleString(v2)));
        wasm3.xWrap.argAdapter("string:static", function(v2) {
          if (wasm3.isPtr(v2)) return v2;
          v2 = "" + v2;
          return this[v2] || (this[v2] = wasm3.allocCString(v2));
        }.bind(/* @__PURE__ */ Object.create(null)));
        const __xArgPtr = wasm3.xWrap.argAdapter("*");
        const nilType = function() {
        };
        wasm3.xWrap.argAdapter("sqlite3_filename", __xArgPtr)("sqlite3_backup*", __xArgPtr)("sqlite3_context*", __xArgPtr)("sqlite3_value*", __xArgPtr)("void*", __xArgPtr)("sqlite3_changegroup*", __xArgPtr)("sqlite3_changeset_iter*", __xArgPtr)("sqlite3_session*", __xArgPtr)("sqlite3_stmt*", (v2) => __xArgPtr(v2 instanceof (sqlite3?.oo1?.Stmt || nilType) ? v2.pointer : v2))("sqlite3*", (v2) => __xArgPtr(v2 instanceof (sqlite3?.oo1?.DB || nilType) ? v2.pointer : v2))("sqlite3_vfs*", (v2) => {
          if ("string" === typeof v2) return capi.sqlite3_vfs_find(v2) || sqlite3.SQLite3Error.toss(capi.SQLITE_NOTFOUND, "Unknown sqlite3_vfs name:", v2);
          return __xArgPtr(v2 instanceof (capi.sqlite3_vfs || nilType) ? v2.pointer : v2);
        });
        if (wasm3.exports.sqlite3_declare_vtab) wasm3.xWrap.argAdapter("sqlite3_index_info*", (v2) => __xArgPtr(v2 instanceof (capi.sqlite3_index_info || nilType) ? v2.pointer : v2))("sqlite3_module*", (v2) => __xArgPtr(v2 instanceof (capi.sqlite3_module || nilType) ? v2.pointer : v2));
        const __xRcPtr = wasm3.xWrap.resultAdapter("*");
        wasm3.xWrap.resultAdapter("sqlite3*", __xRcPtr)("sqlite3_backup*", __xRcPtr)("sqlite3_context*", __xRcPtr)("sqlite3_stmt*", __xRcPtr)("sqlite3_value*", __xRcPtr)("sqlite3_vfs*", __xRcPtr)("void*", __xRcPtr);
        for (const e4 of bindingSignatures.core) capi[e4[0]] = wasm3.xWrap.apply(null, e4);
        for (const e4 of bindingSignatures.wasmInternal) util[e4[0]] = wasm3.xWrap.apply(null, e4);
        for (const e4 of bindingSignatures.int64) capi[e4[0]] = wasm3.bigIntEnabled ? wasm3.xWrap.apply(null, e4) : () => toss(e4[0] + "() is unavailable due to lack", "of BigInt support in this build.");
        delete bindingSignatures.core;
        delete bindingSignatures.int64;
        delete bindingSignatures.wasmInternal;
        util.sqlite3__wasm_db_error = function(pDb2, resultCode, message) {
          if (!pDb2) return capi.SQLITE_MISUSE;
          if (resultCode instanceof sqlite3.WasmAllocError) {
            resultCode = capi.SQLITE_NOMEM;
            message = 0;
          } else if (resultCode instanceof Error) {
            message = message || "" + resultCode;
            resultCode = resultCode.resultCode || capi.SQLITE_ERROR;
          }
          return capi.sqlite3_set_errmsg(pDb2, resultCode, message) || resultCode;
        };
      }
      {
        const cJson = wasm3.xCall("sqlite3__wasm_enum_json");
        if (!cJson) toss("Maintenance required: increase sqlite3__wasm_enum_json()'s", "static buffer size!");
        wasm3.ctype = JSON.parse(wasm3.cstrToJs(cJson));
        const defineGroups = [
          "access",
          "authorizer",
          "blobFinalizers",
          "changeset",
          "config",
          "dataTypes",
          "dbConfig",
          "dbStatus",
          "encodings",
          "fcntl",
          "flock",
          "ioCap",
          "limits",
          "openFlags",
          "prepareFlags",
          "resultCodes",
          "sqlite3Status",
          "stmtStatus",
          "syncFlags",
          "trace",
          "txnState",
          "udfFlags",
          "version"
        ];
        if (wasm3.bigIntEnabled) defineGroups.push("serialize", "session", "vtab");
        for (const t4 of defineGroups) for (const e4 of Object.entries(wasm3.ctype[t4])) capi[e4[0]] = e4[1];
        if (!wasm3.functionEntry(capi.SQLITE_WASM_DEALLOC)) toss("Internal error: cannot resolve exported function", "entry SQLITE_WASM_DEALLOC (==" + capi.SQLITE_WASM_DEALLOC + ").");
        const __rcMap = /* @__PURE__ */ Object.create(null);
        for (const e4 of Object.entries(wasm3.ctype["resultCodes"])) __rcMap[e4[1]] = e4[0];
        capi.sqlite3_js_rc_str = (rc) => __rcMap[rc];
        const notThese = Object.assign(/* @__PURE__ */ Object.create(null), {
          WasmTestStruct: true,
          sqlite3_index_info: !wasm3.bigIntEnabled,
          sqlite3_index_constraint: !wasm3.bigIntEnabled,
          sqlite3_index_orderby: !wasm3.bigIntEnabled,
          sqlite3_index_constraint_usage: !wasm3.bigIntEnabled
        });
        for (const s2 of wasm3.ctype.structs) if (!notThese[s2.name]) capi[s2.name] = sqlite3.StructBinder(s2);
        if (capi.sqlite3_index_info) {
          for (const k2 of [
            "sqlite3_index_constraint",
            "sqlite3_index_orderby",
            "sqlite3_index_constraint_usage"
          ]) {
            capi.sqlite3_index_info[k2] = capi[k2];
            delete capi[k2];
          }
          capi.sqlite3_vtab_config = wasm3.xWrap("sqlite3__wasm_vtab_config", "int", [
            "sqlite3*",
            "int",
            "int"
          ]);
        }
      }
      const __dbArgcMismatch = (pDb2, f2, n3) => {
        return util.sqlite3__wasm_db_error(pDb2, capi.SQLITE_MISUSE, f2 + "() requires " + n3 + " argument" + (1 === n3 ? "" : "s") + ".");
      };
      const __errEncoding = (pDb2) => {
        return util.sqlite3__wasm_db_error(pDb2, capi.SQLITE_FORMAT, "SQLITE_UTF8 is the only supported encoding.");
      };
      const __argPDb = (pDb2) => wasm3.xWrap.argAdapter("sqlite3*")(pDb2);
      const __argStr = (str) => wasm3.isPtr(str) ? wasm3.cstrToJs(str) : str;
      const __dbCleanupMap = function(pDb2, mode) {
        pDb2 = __argPDb(pDb2);
        let m = this.dbMap.get(pDb2);
        if (!mode) {
          this.dbMap.delete(pDb2);
          return m;
        } else if (!m && mode > 0) this.dbMap.set(pDb2, m = /* @__PURE__ */ Object.create(null));
        return m;
      }.bind(Object.assign(/* @__PURE__ */ Object.create(null), { dbMap: /* @__PURE__ */ new Map() }));
      __dbCleanupMap.addCollation = function(pDb2, name) {
        const m = __dbCleanupMap(pDb2, 1);
        if (!m.collation) m.collation = /* @__PURE__ */ new Set();
        m.collation.add(__argStr(name).toLowerCase());
      };
      __dbCleanupMap._addUDF = function(pDb2, name, arity, map) {
        name = __argStr(name).toLowerCase();
        let u = map.get(name);
        if (!u) map.set(name, u = /* @__PURE__ */ new Set());
        u.add(arity < 0 ? -1 : arity);
      };
      __dbCleanupMap.addFunction = function(pDb2, name, arity) {
        const m = __dbCleanupMap(pDb2, 1);
        if (!m.udf) m.udf = /* @__PURE__ */ new Map();
        this._addUDF(pDb2, name, arity, m.udf);
      };
      if (wasm3.exports.sqlite3_create_window_function) __dbCleanupMap.addWindowFunc = function(pDb2, name, arity) {
        const m = __dbCleanupMap(pDb2, 1);
        if (!m.wudf) m.wudf = /* @__PURE__ */ new Map();
        this._addUDF(pDb2, name, arity, m.wudf);
      };
      __dbCleanupMap.cleanup = function(pDb2) {
        pDb2 = __argPDb(pDb2);
        for (const obj of [
          ["sqlite3_busy_handler", 3],
          ["sqlite3_commit_hook", 3],
          ["sqlite3_preupdate_hook", 3],
          ["sqlite3_progress_handler", 4],
          ["sqlite3_rollback_hook", 3],
          ["sqlite3_set_authorizer", 3],
          ["sqlite3_trace_v2", 4],
          ["sqlite3_update_hook", 3]
        ]) {
          const [name, arity] = obj;
          if (!wasm3.exports[name]) continue;
          const closeArgs = [pDb2];
          closeArgs.length = arity;
          try {
            capi[name](...closeArgs);
          } catch (e4) {
            sqlite3.config.warn("close-time call of", name + "(", closeArgs, ") threw:", e4);
          }
        }
        const m = __dbCleanupMap(pDb2, 0);
        if (!m) return;
        if (m.collation) {
          for (const name of m.collation) try {
            capi.sqlite3_create_collation_v2(pDb2, name, capi.SQLITE_UTF8, 0, 0, 0);
          } catch (e4) {
          }
          delete m.collation;
        }
        let i = 0;
        for (; i < 2; ++i) {
          const fmap = i ? m.wudf : m.udf;
          if (!fmap) continue;
          const func = i ? capi.sqlite3_create_window_function : capi.sqlite3_create_function_v2;
          for (const e4 of fmap) {
            const name = e4[0], arities = e4[1];
            const fargs = [
              pDb2,
              name,
              0,
              capi.SQLITE_UTF8,
              0,
              0,
              0,
              0,
              0
            ];
            if (i) fargs.push(0);
            for (const arity of arities) try {
              fargs[2] = arity;
              func.apply(null, fargs);
            } catch (e5) {
            }
            arities.clear();
          }
          fmap.clear();
        }
        delete m.udf;
        delete m.wudf;
      };
      {
        const __sqlite3CloseV2 = wasm3.xWrap("sqlite3_close_v2", "int", "sqlite3*");
        capi.sqlite3_close_v2 = function(pDb2) {
          if (1 !== arguments.length) return __dbArgcMismatch(pDb2, "sqlite3_close_v2", 1);
          if (pDb2) try {
            __dbCleanupMap.cleanup(pDb2);
          } catch (e4) {
          }
          return __sqlite3CloseV2(pDb2);
        };
      }
      if (capi.sqlite3session_create) {
        const __sqlite3SessionDelete = wasm3.xWrap("sqlite3session_delete", void 0, ["sqlite3_session*"]);
        capi.sqlite3session_delete = function(pSession) {
          if (1 !== arguments.length) return __dbArgcMismatch(pDb, "sqlite3session_delete", 1);
          else if (pSession) capi.sqlite3session_table_filter(pSession, 0, 0);
          __sqlite3SessionDelete(pSession);
        };
      }
      {
        const contextKey = (argv, argIndex) => {
          return "argv[" + argIndex + "]:" + argv[0] + ":" + wasm3.cstrToJs(argv[1]).toLowerCase();
        };
        const __sqlite3CreateCollationV2 = wasm3.xWrap("sqlite3_create_collation_v2", "int", [
          "sqlite3*",
          "string",
          "int",
          "*",
          new wasm3.xWrap.FuncPtrAdapter({
            name: "xCompare",
            signature: "i(pipip)",
            contextKey
          }),
          new wasm3.xWrap.FuncPtrAdapter({
            name: "xDestroy",
            signature: "v(p)",
            contextKey
          })
        ]);
        capi.sqlite3_create_collation_v2 = function(pDb2, zName, eTextRep, pArg, xCompare, xDestroy) {
          if (6 !== arguments.length) return __dbArgcMismatch(pDb2, "sqlite3_create_collation_v2", 6);
          else if (0 === (eTextRep & 15)) eTextRep |= capi.SQLITE_UTF8;
          else if (capi.SQLITE_UTF8 !== (eTextRep & 15)) return __errEncoding(pDb2);
          try {
            const rc = __sqlite3CreateCollationV2(pDb2, zName, eTextRep, pArg, xCompare, xDestroy);
            if (0 === rc && xCompare instanceof Function) __dbCleanupMap.addCollation(pDb2, zName);
            return rc;
          } catch (e4) {
            return util.sqlite3__wasm_db_error(pDb2, e4);
          }
        };
        capi.sqlite3_create_collation = (pDb2, zName, eTextRep, pArg, xCompare) => {
          return 5 === arguments.length ? capi.sqlite3_create_collation_v2(pDb2, zName, eTextRep, pArg, xCompare, 0) : __dbArgcMismatch(pDb2, "sqlite3_create_collation", 5);
        };
      }
      {
        const contextKey = function(argv, argIndex) {
          return argv[0] + ":" + (argv[2] < 0 ? -1 : argv[2]) + ":" + argIndex + ":" + wasm3.cstrToJs(argv[1]).toLowerCase();
        };
        const __cfProxy = Object.assign(/* @__PURE__ */ Object.create(null), {
          xInverseAndStep: {
            signature: "v(pip)",
            contextKey,
            callProxy: (callback) => {
              return (pCtx, argc, pArgv) => {
                try {
                  callback(pCtx, ...capi.sqlite3_values_to_js(argc, pArgv));
                } catch (e4) {
                  capi.sqlite3_result_error_js(pCtx, e4);
                }
              };
            }
          },
          xFinalAndValue: {
            signature: "v(p)",
            contextKey,
            callProxy: (callback) => {
              return (pCtx) => {
                try {
                  capi.sqlite3_result_js(pCtx, callback(pCtx));
                } catch (e4) {
                  capi.sqlite3_result_error_js(pCtx, e4);
                }
              };
            }
          },
          xFunc: {
            signature: "v(pip)",
            contextKey,
            callProxy: (callback) => {
              return (pCtx, argc, pArgv) => {
                try {
                  capi.sqlite3_result_js(pCtx, callback(pCtx, ...capi.sqlite3_values_to_js(argc, pArgv)));
                } catch (e4) {
                  capi.sqlite3_result_error_js(pCtx, e4);
                }
              };
            }
          },
          xDestroy: {
            signature: "v(p)",
            contextKey,
            callProxy: (callback) => {
              return (pVoid) => {
                try {
                  callback(pVoid);
                } catch (e4) {
                  console.error("UDF xDestroy method threw:", e4);
                }
              };
            }
          }
        });
        const __sqlite3CreateFunction = wasm3.xWrap("sqlite3_create_function_v2", "int", [
          "sqlite3*",
          "string",
          "int",
          "int",
          "*",
          new wasm3.xWrap.FuncPtrAdapter({
            name: "xFunc",
            ...__cfProxy.xFunc
          }),
          new wasm3.xWrap.FuncPtrAdapter({
            name: "xStep",
            ...__cfProxy.xInverseAndStep
          }),
          new wasm3.xWrap.FuncPtrAdapter({
            name: "xFinal",
            ...__cfProxy.xFinalAndValue
          }),
          new wasm3.xWrap.FuncPtrAdapter({
            name: "xDestroy",
            ...__cfProxy.xDestroy
          })
        ]);
        const __sqlite3CreateWindowFunction = wasm3.exports.sqlite3_create_window_function ? wasm3.xWrap("sqlite3_create_window_function", "int", [
          "sqlite3*",
          "string",
          "int",
          "int",
          "*",
          new wasm3.xWrap.FuncPtrAdapter({
            name: "xStep",
            ...__cfProxy.xInverseAndStep
          }),
          new wasm3.xWrap.FuncPtrAdapter({
            name: "xFinal",
            ...__cfProxy.xFinalAndValue
          }),
          new wasm3.xWrap.FuncPtrAdapter({
            name: "xValue",
            ...__cfProxy.xFinalAndValue
          }),
          new wasm3.xWrap.FuncPtrAdapter({
            name: "xInverse",
            ...__cfProxy.xInverseAndStep
          }),
          new wasm3.xWrap.FuncPtrAdapter({
            name: "xDestroy",
            ...__cfProxy.xDestroy
          })
        ]) : void 0;
        capi.sqlite3_create_function_v2 = function f2(pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal, xDestroy) {
          if (f2.length !== arguments.length) return __dbArgcMismatch(pDb2, "sqlite3_create_function_v2", f2.length);
          else if (0 === (eTextRep & 15)) eTextRep |= capi.SQLITE_UTF8;
          else if (capi.SQLITE_UTF8 !== (eTextRep & 15)) return __errEncoding(pDb2);
          try {
            const rc = __sqlite3CreateFunction(pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal, xDestroy);
            if (0 === rc && (xFunc instanceof Function || xStep instanceof Function || xFinal instanceof Function || xDestroy instanceof Function)) __dbCleanupMap.addFunction(pDb2, funcName, nArg);
            return rc;
          } catch (e4) {
            console.error("sqlite3_create_function_v2() setup threw:", e4);
            return util.sqlite3__wasm_db_error(pDb2, e4, "Creation of UDF threw: " + e4);
          }
        };
        capi.sqlite3_create_function = function f2(pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal) {
          return f2.length === arguments.length ? capi.sqlite3_create_function_v2(pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal, 0) : __dbArgcMismatch(pDb2, "sqlite3_create_function", f2.length);
        };
        if (__sqlite3CreateWindowFunction) capi.sqlite3_create_window_function = function f2(pDb2, funcName, nArg, eTextRep, pApp, xStep, xFinal, xValue, xInverse, xDestroy) {
          if (f2.length !== arguments.length) return __dbArgcMismatch(pDb2, "sqlite3_create_window_function", f2.length);
          else if (0 === (eTextRep & 15)) eTextRep |= capi.SQLITE_UTF8;
          else if (capi.SQLITE_UTF8 !== (eTextRep & 15)) return __errEncoding(pDb2);
          try {
            const rc = __sqlite3CreateWindowFunction(pDb2, funcName, nArg, eTextRep, pApp, xStep, xFinal, xValue, xInverse, xDestroy);
            if (0 === rc && (xStep instanceof Function || xFinal instanceof Function || xValue instanceof Function || xInverse instanceof Function || xDestroy instanceof Function)) __dbCleanupMap.addWindowFunc(pDb2, funcName, nArg);
            return rc;
          } catch (e4) {
            console.error("sqlite3_create_window_function() setup threw:", e4);
            return util.sqlite3__wasm_db_error(pDb2, e4, "Creation of UDF threw: " + e4);
          }
        };
        else delete capi.sqlite3_create_window_function;
        capi.sqlite3_create_function_v2.udfSetResult = capi.sqlite3_create_function.udfSetResult = capi.sqlite3_result_js;
        if (capi.sqlite3_create_window_function) capi.sqlite3_create_window_function.udfSetResult = capi.sqlite3_result_js;
        capi.sqlite3_create_function_v2.udfConvertArgs = capi.sqlite3_create_function.udfConvertArgs = capi.sqlite3_values_to_js;
        if (capi.sqlite3_create_window_function) capi.sqlite3_create_window_function.udfConvertArgs = capi.sqlite3_values_to_js;
        capi.sqlite3_create_function_v2.udfSetError = capi.sqlite3_create_function.udfSetError = capi.sqlite3_result_error_js;
        if (capi.sqlite3_create_window_function) capi.sqlite3_create_window_function.udfSetError = capi.sqlite3_result_error_js;
      }
      {
        const __flexiString = (v2, n3) => {
          if ("string" === typeof v2) n3 = -1;
          else if (util.isSQLableTypedArray(v2)) {
            n3 = v2.byteLength;
            v2 = wasm3.typedArrayToString(v2 instanceof ArrayBuffer ? new Uint8Array(v2) : v2);
          } else if (Array.isArray(v2)) {
            v2 = v2.join("");
            n3 = -1;
          }
          return [v2, n3];
        };
        const __prepare = {
          /**
          This binding expects a JS string as its 2nd argument and
          null as its final argument. In order to compile multiple
          statements from a single string, the "full" impl (see
          below) must be used.
          */
          basic: wasm3.xWrap("sqlite3_prepare_v3", "int", [
            "sqlite3*",
            "string",
            "int",
            "int",
            "**",
            "**"
          ]),
          /**
          Impl which requires that the 2nd argument be a pointer to the
          SQL string, instead of being converted to a JS string. This
          variant is necessary for cases where we require a non-NULL
          value for the final argument (prepare/step of multiple
          statements from one input string). For simpler cases, where
          only the first statement in the SQL string is required, the
          wrapper named sqlite3_prepare_v2() is sufficient and easier
          to use because it doesn't require dealing with pointers.
          */
          full: wasm3.xWrap("sqlite3_prepare_v3", "int", [
            "sqlite3*",
            "*",
            "int",
            "int",
            "**",
            "**"
          ])
        };
        capi.sqlite3_prepare_v3 = function f2(pDb2, sql, sqlLen, prepFlags, ppStmt, pzTail) {
          if (f2.length !== arguments.length) return __dbArgcMismatch(pDb2, "sqlite3_prepare_v3", f2.length);
          const [xSql, xSqlLen] = __flexiString(sql, Number(sqlLen));
          switch (typeof xSql) {
            case "string":
              return __prepare.basic(pDb2, xSql, xSqlLen, prepFlags, ppStmt, null);
            case typeof wasm3.ptr.null:
              return __prepare.full(pDb2, wasm3.ptr.coerce(xSql), xSqlLen, prepFlags, ppStmt, pzTail);
            default:
              return util.sqlite3__wasm_db_error(pDb2, capi.SQLITE_MISUSE, "Invalid SQL argument type for sqlite3_prepare_v2/v3(). typeof=" + typeof xSql);
          }
        };
        capi.sqlite3_prepare_v2 = function f2(pDb2, sql, sqlLen, ppStmt, pzTail) {
          return f2.length === arguments.length ? capi.sqlite3_prepare_v3(pDb2, sql, sqlLen, 0, ppStmt, pzTail) : __dbArgcMismatch(pDb2, "sqlite3_prepare_v2", f2.length);
        };
      }
      {
        const __bindText = wasm3.xWrap("sqlite3_bind_text", "int", [
          "sqlite3_stmt*",
          "int",
          "string",
          "int",
          "*"
        ]);
        const __bindBlob = wasm3.xWrap("sqlite3_bind_blob", "int", [
          "sqlite3_stmt*",
          "int",
          "*",
          "int",
          "*"
        ]);
        capi.sqlite3_bind_text = function f2(pStmt, iCol, text, nText, xDestroy) {
          if (f2.length !== arguments.length) return __dbArgcMismatch(capi.sqlite3_db_handle(pStmt), "sqlite3_bind_text", f2.length);
          else if (wasm3.isPtr(text) || null === text) return __bindText(pStmt, iCol, text, nText, xDestroy);
          else if (text instanceof ArrayBuffer) text = new Uint8Array(text);
          else if (Array.isArray(pMem)) text = pMem.join("");
          let p2, n3;
          try {
            if (util.isSQLableTypedArray(text)) {
              p2 = wasm3.allocFromTypedArray(text);
              n3 = text.byteLength;
            } else if ("string" === typeof text) [p2, n3] = wasm3.allocCString(text);
            else return util.sqlite3__wasm_db_error(capi.sqlite3_db_handle(pStmt), capi.SQLITE_MISUSE, "Invalid 3rd argument type for sqlite3_bind_text().");
            return __bindText(pStmt, iCol, p2, n3, capi.SQLITE_WASM_DEALLOC);
          } catch (e4) {
            wasm3.dealloc(p2);
            return util.sqlite3__wasm_db_error(capi.sqlite3_db_handle(pStmt), e4);
          }
        };
        capi.sqlite3_bind_blob = function f2(pStmt, iCol, pMem2, nMem, xDestroy) {
          if (f2.length !== arguments.length) return __dbArgcMismatch(capi.sqlite3_db_handle(pStmt), "sqlite3_bind_blob", f2.length);
          else if (wasm3.isPtr(pMem2) || null === pMem2) return __bindBlob(pStmt, iCol, pMem2, nMem, xDestroy);
          else if (pMem2 instanceof ArrayBuffer) pMem2 = new Uint8Array(pMem2);
          else if (Array.isArray(pMem2)) pMem2 = pMem2.join("");
          let p2, n3;
          try {
            if (util.isBindableTypedArray(pMem2)) {
              p2 = wasm3.allocFromTypedArray(pMem2);
              n3 = nMem >= 0 ? nMem : pMem2.byteLength;
            } else if ("string" === typeof pMem2) [p2, n3] = wasm3.allocCString(pMem2);
            else return util.sqlite3__wasm_db_error(capi.sqlite3_db_handle(pStmt), capi.SQLITE_MISUSE, "Invalid 3rd argument type for sqlite3_bind_blob().");
            return __bindBlob(pStmt, iCol, p2, n3, capi.SQLITE_WASM_DEALLOC);
          } catch (e4) {
            wasm3.dealloc(p2);
            return util.sqlite3__wasm_db_error(capi.sqlite3_db_handle(pStmt), e4);
          }
        };
      }
      if (!capi.sqlite3_column_text) {
        const argStmt = wasm3.xWrap.argAdapter("sqlite3_stmt*"), argInt = wasm3.xWrap.argAdapter("int"), argValue = wasm3.xWrap.argAdapter("sqlite3_value*"), newStr = (cstr, n3) => wasm3.typedArrayToString(wasm3.heap8u(), Number(cstr), Number(cstr) + n3);
        capi.sqlite3_column_text = function(stmt, colIndex) {
          const a0 = argStmt(stmt), a1 = argInt(colIndex);
          const cstr = wasm3.exports.sqlite3_column_text(a0, a1);
          return cstr ? newStr(cstr, wasm3.exports.sqlite3_column_bytes(a0, a1)) : null;
        };
        capi.sqlite3_value_text = function(val) {
          const a0 = argValue(val);
          const cstr = wasm3.exports.sqlite3_value_text(a0);
          return cstr ? newStr(cstr, wasm3.exports.sqlite3_value_bytes(a0)) : null;
        };
      }
      capi.sqlite3_config = function(op, ...args) {
        if (arguments.length < 2) return capi.SQLITE_MISUSE;
        switch (op) {
          case capi.SQLITE_CONFIG_COVERING_INDEX_SCAN:
          case capi.SQLITE_CONFIG_MEMSTATUS:
          case capi.SQLITE_CONFIG_SMALL_MALLOC:
          case capi.SQLITE_CONFIG_SORTERREF_SIZE:
          case capi.SQLITE_CONFIG_STMTJRNL_SPILL:
          case capi.SQLITE_CONFIG_URI:
            return wasm3.exports.sqlite3__wasm_config_i(op, args[0]);
          case capi.SQLITE_CONFIG_LOOKASIDE:
            return wasm3.exports.sqlite3__wasm_config_ii(op, args[0], args[1]);
          case capi.SQLITE_CONFIG_MEMDB_MAXSIZE:
            return wasm3.exports.sqlite3__wasm_config_j(op, args[0]);
          case capi.SQLITE_CONFIG_GETMALLOC:
          case capi.SQLITE_CONFIG_GETMUTEX:
          case capi.SQLITE_CONFIG_GETPCACHE2:
          case capi.SQLITE_CONFIG_GETPCACHE:
          case capi.SQLITE_CONFIG_HEAP:
          case capi.SQLITE_CONFIG_LOG:
          case capi.SQLITE_CONFIG_MALLOC:
          case capi.SQLITE_CONFIG_MMAP_SIZE:
          case capi.SQLITE_CONFIG_MULTITHREAD:
          case capi.SQLITE_CONFIG_MUTEX:
          case capi.SQLITE_CONFIG_PAGECACHE:
          case capi.SQLITE_CONFIG_PCACHE2:
          case capi.SQLITE_CONFIG_PCACHE:
          case capi.SQLITE_CONFIG_PCACHE_HDRSZ:
          case capi.SQLITE_CONFIG_PMASZ:
          case capi.SQLITE_CONFIG_SERIALIZED:
          case capi.SQLITE_CONFIG_SINGLETHREAD:
          case capi.SQLITE_CONFIG_SQLLOG:
          case capi.SQLITE_CONFIG_WIN32_HEAPSIZE:
          default:
            return capi.SQLITE_NOTFOUND;
        }
      };
      {
        const __autoExtFptr = /* @__PURE__ */ new Set();
        capi.sqlite3_auto_extension = function(fPtr) {
          if (fPtr instanceof Function) fPtr = wasm3.installFunction("i(ppp)", fPtr);
          else if (1 !== arguments.length || !wasm3.isPtr(fPtr)) return capi.SQLITE_MISUSE;
          const rc = wasm3.exports.sqlite3_auto_extension(fPtr);
          if (fPtr !== arguments[0]) {
            if (0 === rc) __autoExtFptr.add(fPtr);
            else wasm3.uninstallFunction(fPtr);
          }
          return rc;
        };
        capi.sqlite3_cancel_auto_extension = function(fPtr) {
          if (!fPtr || 1 !== arguments.length || !wasm3.isPtr(fPtr)) return 0;
          return wasm3.exports.sqlite3_cancel_auto_extension(fPtr);
        };
        capi.sqlite3_reset_auto_extension = function() {
          wasm3.exports.sqlite3_reset_auto_extension();
          for (const fp of __autoExtFptr) wasm3.uninstallFunction(fp);
          __autoExtFptr.clear();
        };
      }
      wasm3.xWrap.FuncPtrAdapter.warnOnUse = true;
      const StructBinder = sqlite3.StructBinder;
      const installMethod = function callee3(tgt, name, func, applyArgcCheck = callee3.installMethodArgcCheck) {
        if (!(tgt instanceof StructBinder.StructType)) toss("Usage error: target object is-not-a StructType.");
        else if (!(func instanceof Function) && !wasm3.isPtr(func)) toss("Usage error: expecting a Function or WASM pointer to one.");
        if (1 === arguments.length) return (n3, f2) => callee3(tgt, n3, f2, applyArgcCheck);
        if (!callee3.argcProxy) {
          callee3.argcProxy = function(tgt2, funcName, func2, sig) {
            return function(...args) {
              if (func2.length !== arguments.length) toss("Argument mismatch for", tgt2.structInfo.name + "::" + funcName + ": Native signature is:", sig);
              return func2.apply(this, args);
            };
          };
          callee3.removeFuncList = function() {
            if (this.ondispose.__removeFuncList) {
              this.ondispose.__removeFuncList.forEach((v2, ndx) => {
                if (wasm3.isPtr(v2)) try {
                  wasm3.uninstallFunction(v2);
                } catch (e4) {
                }
              });
              delete this.ondispose.__removeFuncList;
            }
          };
        }
        const sigN = tgt.memberSignature(name);
        if (sigN.length < 2) toss("Member", name, "does not have a function pointer signature:", sigN);
        const memKey = tgt.memberKey(name);
        const fProxy = applyArgcCheck && !wasm3.isPtr(func) ? callee3.argcProxy(tgt, memKey, func, sigN) : func;
        if (wasm3.isPtr(fProxy)) {
          if (fProxy && !wasm3.functionEntry(fProxy)) toss("Pointer", fProxy, "is not a WASM function table entry.");
          tgt[memKey] = fProxy;
        } else {
          const pFunc = wasm3.installFunction(fProxy, sigN);
          tgt[memKey] = pFunc;
          if (!tgt.ondispose || !tgt.ondispose.__removeFuncList) {
            tgt.addOnDispose("ondispose.__removeFuncList handler", callee3.removeFuncList);
            tgt.ondispose.__removeFuncList = [];
          }
          tgt.ondispose.__removeFuncList.push(memKey, pFunc);
        }
        return (n3, f2) => callee3(tgt, n3, f2, applyArgcCheck);
      };
      installMethod.installMethodArgcCheck = false;
      const installMethods = function(structInstance, methods, applyArgcCheck = installMethod.installMethodArgcCheck) {
        const seen = /* @__PURE__ */ new Map();
        for (const k2 of Object.keys(methods)) {
          const m = methods[k2];
          const prior = seen.get(m);
          if (prior) {
            const mkey = structInstance.memberKey(k2);
            structInstance[mkey] = structInstance[structInstance.memberKey(prior)];
          } else {
            installMethod(structInstance, k2, m, applyArgcCheck);
            seen.set(m, k2);
          }
        }
        return structInstance;
      };
      StructBinder.StructType.prototype.installMethod = function callee3(name, func, applyArgcCheck = installMethod.installMethodArgcCheck) {
        return arguments.length < 3 && name && "object" === typeof name ? installMethods(this, ...arguments) : installMethod(this, ...arguments);
      };
      StructBinder.StructType.prototype.installMethods = function(methods, applyArgcCheck = installMethod.installMethodArgcCheck) {
        return installMethods(this, methods, applyArgcCheck);
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      const toss3 = (...args) => {
        throw new sqlite3.SQLite3Error(...args);
      };
      const capi = sqlite3.capi, wasm3 = sqlite3.wasm, util = sqlite3.util;
      sqlite3.__isUnderTest ? console.debug.bind(console) : sqlite3.config.debug;
      sqlite3.__isUnderTest ? console.warn.bind(console) : sqlite3.config.warn;
      sqlite3.__isUnderTest ? console.error.bind(console) : sqlite3.config.error;
      const __ptrMap = /* @__PURE__ */ new WeakMap();
      const __doesNotOwnHandle = /* @__PURE__ */ new Set();
      const __stmtMap = /* @__PURE__ */ new WeakMap();
      const getOwnOption = (opts, p2, dflt) => {
        const d = Object.getOwnPropertyDescriptor(opts, p2);
        return d ? d.value : dflt;
      };
      const checkSqlite3Rc = function(dbPtr, sqliteResultCode) {
        if (sqliteResultCode) {
          if (dbPtr instanceof DB) dbPtr = dbPtr.pointer;
          toss3(sqliteResultCode, "sqlite3 result code", sqliteResultCode + ":", dbPtr ? capi.sqlite3_errmsg(dbPtr) : capi.sqlite3_errstr(sqliteResultCode));
        }
        return arguments[0];
      };
      const __dbTraceToConsole = wasm3.installFunction("i(ippp)", function(t4, c, p2, x) {
        if (capi.SQLITE_TRACE_STMT === t4) console.log("SQL TRACE #" + ++this.counter, "via sqlite3@" + c + "[" + capi.sqlite3_db_filename(c, null) + "]", wasm3.cstrToJs(x));
      }.bind({ counter: 0 }));
      const __vfsPostOpenCallback = /* @__PURE__ */ Object.create(null);
      const dbCtorHelper = function ctor(...args) {
        const opt = ctor.normalizeArgs(...args);
        let pDb2;
        if (pDb2 = opt["sqlite3*"]) {
          if (!opt["sqlite3*:takeOwnership"]) __doesNotOwnHandle.add(this);
          this.filename = capi.sqlite3_db_filename(pDb2, "main");
        } else {
          let fn = opt.filename, vfsName = opt.vfs, flagsStr = opt.flags;
          if ("string" !== typeof fn && !wasm3.isPtr(fn) || "string" !== typeof flagsStr || vfsName && "string" !== typeof vfsName && !wasm3.isPtr(vfsName)) {
            sqlite3.config.error("Invalid DB ctor args", opt, arguments);
            toss3("Invalid arguments for DB constructor:", arguments, "opts:", opt);
          }
          let oflags = 0;
          if (flagsStr.indexOf("c") >= 0) oflags |= capi.SQLITE_OPEN_CREATE | capi.SQLITE_OPEN_READWRITE;
          if (flagsStr.indexOf("w") >= 0) oflags |= capi.SQLITE_OPEN_READWRITE;
          if (0 === oflags) oflags |= capi.SQLITE_OPEN_READONLY;
          oflags |= capi.SQLITE_OPEN_EXRESCODE;
          const stack = wasm3.pstack.pointer;
          try {
            const pPtr = wasm3.pstack.allocPtr();
            let rc = capi.sqlite3_open_v2(fn, pPtr, oflags, vfsName || wasm3.ptr.null);
            pDb2 = wasm3.peekPtr(pPtr);
            checkSqlite3Rc(pDb2, rc);
            capi.sqlite3_extended_result_codes(pDb2, 1);
            if (flagsStr.indexOf("t") >= 0) capi.sqlite3_trace_v2(pDb2, capi.SQLITE_TRACE_STMT, __dbTraceToConsole, pDb2);
          } catch (e4) {
            if (pDb2) capi.sqlite3_close_v2(pDb2);
            throw e4;
          } finally {
            wasm3.pstack.restore(stack);
          }
          this.filename = wasm3.isPtr(fn) ? wasm3.cstrToJs(fn) : fn;
        }
        __ptrMap.set(this, pDb2);
        __stmtMap.set(this, /* @__PURE__ */ Object.create(null));
        if (!opt["sqlite3*"]) try {
          const pVfs = capi.sqlite3_js_db_vfs(pDb2) || toss3("Internal error: cannot get VFS for new db handle.");
          const postInitSql = __vfsPostOpenCallback[pVfs];
          if (postInitSql) {
            if (postInitSql instanceof Function) postInitSql(this, sqlite3);
            else checkSqlite3Rc(pDb2, capi.sqlite3_exec(pDb2, postInitSql, 0, 0, 0));
          }
        } catch (e4) {
          this.close();
          throw e4;
        }
      };
      dbCtorHelper.setVfsPostOpenCallback = function(pVfs, callback) {
        if (!(callback instanceof Function)) toss3("dbCtorHelper.setVfsPostOpenCallback() should not be used with a non-function argument.", arguments);
        __vfsPostOpenCallback[pVfs] = callback;
      };
      dbCtorHelper.normalizeArgs = function(filename = ":memory:", flags = "c", vfs = null) {
        const arg = {};
        if (1 === arguments.length && arguments[0] && "object" === typeof arguments[0]) {
          Object.assign(arg, arguments[0]);
          if (void 0 === arg.flags) arg.flags = "c";
          if (void 0 === arg.vfs) arg.vfs = null;
          if (void 0 === arg.filename) arg.filename = ":memory:";
        } else {
          arg.filename = filename;
          arg.flags = flags;
          arg.vfs = vfs;
        }
        return arg;
      };
      const DB = function(...args) {
        dbCtorHelper.apply(this, args);
      };
      DB.dbCtorHelper = dbCtorHelper;
      const BindTypes = {
        null: 1,
        number: 2,
        string: 3,
        boolean: 4,
        blob: 5
      };
      if (wasm3.bigIntEnabled) BindTypes.bigint = BindTypes.number;
      const Stmt = function() {
        if (BindTypes !== arguments[2]) toss3(capi.SQLITE_MISUSE, "Do not call the Stmt constructor directly. Use DB.prepare().");
        this.db = arguments[0];
        __ptrMap.set(this, arguments[1]);
        if (arguments.length > 3 && !arguments[3]) __doesNotOwnHandle.add(this);
      };
      const affirmDbOpen = function(db) {
        if (!db.pointer) toss3("DB has been closed.");
        return db;
      };
      const affirmColIndex = function(stmt, ndx) {
        if (ndx !== (ndx | 0) || ndx < 0 || ndx >= stmt.columnCount) toss3("Column index", ndx, "is out of range.");
        return stmt;
      };
      const parseExecArgs = function(db, args) {
        const out2 = /* @__PURE__ */ Object.create(null);
        out2.opt = /* @__PURE__ */ Object.create(null);
        switch (args.length) {
          case 1:
            if ("string" === typeof args[0] || util.isSQLableTypedArray(args[0])) out2.sql = args[0];
            else if (Array.isArray(args[0])) out2.sql = args[0];
            else if (args[0] && "object" === typeof args[0]) {
              out2.opt = args[0];
              out2.sql = out2.opt.sql;
            }
            break;
          case 2:
            out2.sql = args[0];
            out2.opt = args[1];
            break;
          default:
            toss3("Invalid argument count for exec().");
        }
        out2.sql = util.flexibleString(out2.sql);
        if ("string" !== typeof out2.sql) toss3("Missing SQL argument or unsupported SQL value type.");
        const opt = out2.opt;
        switch (opt.returnValue) {
          case "resultRows":
            if (!opt.resultRows) opt.resultRows = [];
            out2.returnVal = () => opt.resultRows;
            break;
          case "saveSql":
            if (!opt.saveSql) opt.saveSql = [];
            out2.returnVal = () => opt.saveSql;
            break;
          case void 0:
          case "this":
            out2.returnVal = () => db;
            break;
          default:
            toss3("Invalid returnValue value:", opt.returnValue);
        }
        if (!opt.callback && !opt.returnValue && void 0 !== opt.rowMode) {
          if (!opt.resultRows) opt.resultRows = [];
          out2.returnVal = () => opt.resultRows;
        }
        if (opt.callback || opt.resultRows) switch (void 0 === opt.rowMode ? "array" : opt.rowMode) {
          case "object":
            out2.cbArg = (stmt, cache) => {
              if (!cache.columnNames) cache.columnNames = stmt.getColumnNames([]);
              const row = stmt.get([]);
              const rv = /* @__PURE__ */ Object.create(null);
              for (const i in cache.columnNames) rv[cache.columnNames[i]] = row[i];
              return rv;
            };
            break;
          case "array":
            out2.cbArg = (stmt) => stmt.get([]);
            break;
          case "stmt":
            if (Array.isArray(opt.resultRows)) toss3("exec(): invalid rowMode for a resultRows array: must", "be one of 'array', 'object',", "a result column number, or column name reference.");
            out2.cbArg = (stmt) => stmt;
            break;
          default:
            if (util.isInt32(opt.rowMode)) {
              out2.cbArg = (stmt) => stmt.get(opt.rowMode);
              break;
            } else if ("string" === typeof opt.rowMode && opt.rowMode.length > 1 && "$" === opt.rowMode[0]) {
              const $colName = opt.rowMode.substr(1);
              out2.cbArg = (stmt) => {
                const rc = stmt.get(/* @__PURE__ */ Object.create(null))[$colName];
                return void 0 === rc ? toss3(capi.SQLITE_NOTFOUND, "exec(): unknown result column:", $colName) : rc;
              };
              break;
            }
            toss3("Invalid rowMode:", opt.rowMode);
        }
        return out2;
      };
      const __selectFirstRow = (db, sql, bind, ...getArgs) => {
        const stmt = db.prepare(sql);
        try {
          const rc = stmt.bind(bind).step() ? stmt.get(...getArgs) : void 0;
          stmt.reset();
          return rc;
        } finally {
          stmt.finalize();
        }
      };
      const __selectAll = (db, sql, bind, rowMode) => db.exec({
        sql,
        bind,
        rowMode,
        returnValue: "resultRows"
      });
      const __stmtGetColumn = (stmt, ndx, asType) => {
        switch (void 0 === asType ? capi.sqlite3_column_type(stmt.pointer, ndx) : asType) {
          case capi.SQLITE_NULL:
            return null;
          case capi.SQLITE_INTEGER:
            if (wasm3.bigIntEnabled) {
              const rc = capi.sqlite3_column_int64(stmt.pointer, ndx);
              if (rc >= Number.MIN_SAFE_INTEGER && rc <= Number.MAX_SAFE_INTEGER) return Number(rc).valueOf();
              return rc;
            } else {
              const rc = capi.sqlite3_column_double(stmt.pointer, ndx);
              if (rc > Number.MAX_SAFE_INTEGER || rc < Number.MIN_SAFE_INTEGER) toss3("Integer is out of range for JS integer range: " + rc);
              return util.isInt32(rc) ? rc | 0 : rc;
            }
          case capi.SQLITE_FLOAT:
            return capi.sqlite3_column_double(stmt.pointer, ndx);
          case capi.SQLITE_TEXT:
            return capi.sqlite3_column_text(stmt.pointer, ndx);
          case capi.SQLITE_BLOB: {
            const n3 = capi.sqlite3_column_bytes(stmt.pointer, ndx), ptr = capi.sqlite3_column_blob(stmt.pointer, ndx), rc = new Uint8Array(n3);
            if (n3) {
              rc.set(wasm3.heap8u().slice(Number(ptr), Number(ptr) + n3), 0);
              if (stmt.db._blobXfer instanceof Array) stmt.db._blobXfer.push(rc.buffer);
            }
            return rc;
          }
          default:
            toss3("Don't know how to translate", "type of result column #" + ndx + ".");
        }
        toss3("Not reached.");
      };
      DB.checkRc = (db, resultCode) => checkSqlite3Rc(db, resultCode);
      DB.prototype = {
        /** Returns true if this db handle is open, else false. */
        isOpen: function() {
          return !!this.pointer;
        },
        /** Throws if this given DB has been closed, else returns `this`. */
        affirmOpen: function() {
          return affirmDbOpen(this);
        },
        /**
        Finalizes all open statements and closes this database
        connection (with one exception noted below). This is a no-op if
        the db has already been closed. After calling close(),
        `this.pointer` will resolve to `undefined`, and that can be
        used to check whether the db instance is still opened.
        
        If this.onclose.before is a function then it is called before
        any close-related cleanup.
        
        If this.onclose.after is a function then it is called after the
        db is closed but before auxiliary state like this.filename is
        cleared.
        
        Both onclose handlers are passed this object, with the onclose
        object as their "this," noting that the db will have been
        closed when onclose.after is called. If this db is not opened
        when close() is called, neither of the handlers are called. Any
        exceptions the handlers throw are ignored because "destructors
        must not throw".
        
        Garbage collection of a db handle, if it happens at all, will
        never trigger close(), so onclose handlers are not a reliable
        way to implement close-time cleanup or maintenance of a db.
        
        If this instance was created using DB.wrapHandle() and does not
        own this.pointer then it does not close the db handle but it
        does perform all other work, such as calling onclose callbacks
        and disassociating this object from this.pointer.
        */
        close: function() {
          const pDb2 = this.pointer;
          if (pDb2) {
            if (this.onclose?.before instanceof Function) try {
              this.onclose.before(this);
            } catch (e4) {
            }
            for (const s2 of Object.values(__stmtMap.get(this))) if (s2?.pointer) try {
              s2.finalize();
            } catch (ex) {
            }
            __ptrMap.delete(this);
            __stmtMap.delete(this);
            if (!__doesNotOwnHandle.delete(this)) capi.sqlite3_close_v2(pDb2);
            if (this.onclose?.after instanceof Function) try {
              this.onclose.after(this);
            } catch (e4) {
            }
            delete this.filename;
          }
        },
        /**
        Returns the number of changes, as per sqlite3_changes()
        (if the first argument is false) or sqlite3_total_changes()
        (if it's true). If the 2nd argument is true, it uses
        sqlite3_changes64() or sqlite3_total_changes64(), which
        will trigger an exception if this build does not have
        BigInt support enabled.
        */
        changes: function(total = false, sixtyFour = false) {
          const p2 = affirmDbOpen(this).pointer;
          if (total) return sixtyFour ? capi.sqlite3_total_changes64(p2) : capi.sqlite3_total_changes(p2);
          else return sixtyFour ? capi.sqlite3_changes64(p2) : capi.sqlite3_changes(p2);
        },
        /**
        Similar to the this.filename but returns the
        sqlite3_db_filename() value for the given database name,
        defaulting to "main".  The argument may be either a JS string
        or a pointer to a WASM-allocated C-string.
        
        this.filename may be in the form of a URI-style string, whereas
        the returned string contains only the filename part.
        */
        dbFilename: function(dbName = "main") {
          return capi.sqlite3_db_filename(affirmDbOpen(this).pointer, dbName);
        },
        /**
        Returns the name of the given 0-based db number, as documented
        for sqlite3_db_name().
        */
        dbName: function(dbNumber = 0) {
          return capi.sqlite3_db_name(affirmDbOpen(this).pointer, dbNumber);
        },
        /**
        Returns the name of the sqlite3_vfs used by the given database
        of this connection (defaulting to 'main'). The argument may be
        either a JS string or a WASM C-string. Returns undefined if the
        given db name is invalid. Throws if this object has been
        close()d.
        */
        dbVfsName: function(dbName = 0) {
          let rc;
          const pVfs = capi.sqlite3_js_db_vfs(affirmDbOpen(this).pointer, dbName);
          if (pVfs) {
            const v2 = new capi.sqlite3_vfs(pVfs);
            try {
              rc = wasm3.cstrToJs(v2.$zName);
            } finally {
              v2.dispose();
            }
          }
          return rc;
        },
        /**
        Compiles the given SQL and returns a prepared Stmt. This is
        the only way to create new Stmt objects. Throws on error.
        
        The given SQL must be a string, a Uint8Array holding SQL, a
        WASM pointer to memory holding the NUL-terminated SQL string,
        or an array of strings. In the latter case, the array is
        concatenated together, with no separators, to form the SQL
        string (arrays are often a convenient way to formulate long
        statements).  If the SQL contains no statements, an
        SQLite3Error is thrown.
        
        Design note: the C API permits empty SQL, reporting it as a 0
        result code and a NULL stmt pointer. Supporting that case here
        would cause extra work for all clients: any use of the Stmt API
        on such a statement will necessarily throw, so clients would be
        required to check `stmt.pointer` after calling `prepare()` in
        order to determine whether the Stmt instance is empty or not.
        Long-time practice (with other sqlite3 script bindings)
        suggests that the empty-prepare case is sufficiently rare that
        supporting it here would simply hurt overall usability.
        */
        prepare: function(sql) {
          affirmDbOpen(this);
          const stack = wasm3.pstack.pointer;
          let ppStmt, pStmt;
          try {
            ppStmt = wasm3.pstack.alloc(8);
            DB.checkRc(this, capi.sqlite3_prepare_v2(this.pointer, sql, -1, ppStmt, null));
            pStmt = wasm3.peekPtr(ppStmt);
          } finally {
            wasm3.pstack.restore(stack);
          }
          if (!pStmt) toss3("Cannot prepare empty SQL.");
          const stmt = new Stmt(this, pStmt, BindTypes);
          __stmtMap.get(this)[pStmt] = stmt;
          return stmt;
        },
        /**
        Executes one or more SQL statements in the form of a single
        string. Its arguments must be either (sql,optionsObject) or
        (optionsObject). In the latter case, optionsObject.sql must
        contain the SQL to execute. By default it returns this object
        but that can be changed via the `returnValue` option as
        described below. Throws on error.
        
        If no SQL is provided, or a non-string is provided, an
        exception is triggered. Empty SQL, on the other hand, is
        simply a no-op.
        
        The optional options object may contain any of the following
        properties:
        
        - `sql` = the SQL to run (unless it's provided as the first
        argument). This must be of type string, Uint8Array, or an array
        of strings. In the latter case they're concatenated together
        as-is, _with no separator_ between elements, before evaluation.
        The array form is often simpler for long hand-written queries.
        
        - `bind` = a single value valid as an argument for
        Stmt.bind(). This is _only_ applied to the _first_ non-empty
        statement in the SQL which has any bindable parameters. (Empty
        statements are skipped entirely.)
        
        - `saveSql` = an optional array. If set, the SQL of each
        executed statement is appended to this array before the
        statement is executed (but after it is prepared - we don't have
        the string until after that). Empty SQL statements are elided
        but can have odd effects in the output. e.g. SQL of: `"select
        1; -- empty\n; select 2"` will result in an array containing
        `["select 1;", "--empty \n; select 2"]`. That's simply how
        sqlite3 records the SQL for the 2nd statement.
        
        ==================================================================
        The following options apply _only_ to the _first_ statement
        which has a non-zero result column count, regardless of whether
        the statement actually produces any result rows.
        ==================================================================
        
        - `columnNames`: if this is an array, the column names of the
        result set are stored in this array before the callback (if
        any) is triggered (regardless of whether the query produces any
        result rows). If no statement has result columns, this value is
        unchanged. Achtung: an SQL result may have multiple columns
        with identical names.
        
        - `callback` = a function which gets called for each row of the
        result set, but only if that statement has any result rows. The
        callback's "this" is the options object, noting that this
        function synthesizes one if the caller does not pass one to
        exec(). The first argument passed to the callback is described
        below. The second argument is always the current Stmt object,
        as it's needed if the caller wants to fetch the column names or
        some such (noting that they could also be fetched via
        `this.columnNames`, if the client provides the `columnNames`
        option). If the callback returns a literal `false` (as opposed
        to any other falsy value, e.g. an implicit `undefined` return),
        any ongoing statement-`step()` iteration stops without an
        error. The return value of the callback is otherwise ignored.
        
        ACHTUNG: The callback MUST NOT modify the Stmt object. Calling
        any of the Stmt.get() variants, Stmt.getColumnName(), or
        similar, is legal, but calling step() or finalize() is
        not. Member methods which are illegal in this context will
        trigger an exception, but clients must also refrain from using
        any lower-level (C-style) APIs which might modify the
        statement.
        
        The first argument passed to the callback defaults to an array of
        values from the current result row but may be changed with ...
        
        - `rowMode` = specifies the type of he callback's first argument.
        It may be any of...
        
        A) A string describing what type of argument should be passed
        as the first argument to the callback:
        
        A.1) `'array'` (the default) causes the results of
        `stmt.get([])` to be passed to the `callback` and/or appended
        to `resultRows`.
        
        A.2) `'object'` causes the results of
        `stmt.get(Object.create(null))` to be passed to the
        `callback` and/or appended to `resultRows`.  Achtung: an SQL
        result may have multiple columns with identical names. In
        that case, the right-most column will be the one set in this
        object!
        
        A.3) `'stmt'` causes the current Stmt to be passed to the
        callback, but this mode will trigger an exception if
        `resultRows` is an array because appending the transient
        statement to the array would be downright unhelpful.  This
        option is a legacy feature, retained for backwards
        compatibility.  The statement object is passed as the second
        argument to the callback, as described above.
        
        B) An integer, indicating a zero-based column in the result
        row. Only that one single value, in JS form, will be passed on.
        
        C) A string with a minimum length of 2 and leading character of
        '$' will fetch the row as an object, extract that one field,
        and pass that field's value to the callback. These keys are
        case-sensitive so must match the case used in the
        SQL. e.g. `"select a A from t"` with a `rowMode` of `'$A'`
        would work but `'$a'` would not. A reference to a column not in
        the result set will trigger an exception on the first row (as
        the check is not performed until rows are fetched).  Note that
        `$` is a legal identifier character in JS so need not be
        quoted.
        
        Any other `rowMode` value triggers an exception.
        
        - `resultRows`: if this is an array, it functions similarly to
        the `callback` option: each row of the result set (if any),
        with the exception that the `rowMode` 'stmt' is not legal. It
        is legal to use both `resultRows` and `callback`, but
        `resultRows` is likely much simpler to use for small data sets
        and can be used over a WebWorker-style message interface.
        exec() throws if `resultRows` is set and `rowMode` is 'stmt'.
        
        - `returnValue`: is a string specifying what this function
        should return:
        
        A) The default value is (usually) `"this"`, meaning that the
        DB object itself should be returned. The exception is if
        the caller passes neither of `callback` nor `returnValue`
        but does pass an explicit `rowMode` then the default
        `returnValue` is `"resultRows"`, described below.
        
        B) `"resultRows"` means to return the value of the
        `resultRows` option. If `resultRows` is not set, this
        function behaves as if it were set to an empty array.
        
        C) `"saveSql"` means to return the value of the
        `saveSql` option. If `saveSql` is not set, this
        function behaves as if it were set to an empty array.
        
        Potential TODOs:
        
        - `bind`: permit an array of arrays/objects to bind. The first
        sub-array would act on the first statement which has bindable
        parameters (as it does now). The 2nd would act on the next such
        statement, etc.
        
        - `callback` and `resultRows`: permit an array entries with
        semantics similar to those described for `bind` above.
        
        OTOH, this function already does too much.
        */
        exec: function() {
          affirmDbOpen(this);
          const arg = parseExecArgs(this, arguments);
          if (!arg.sql) return toss3("exec() requires an SQL string.");
          const opt = arg.opt;
          const callback = opt.callback;
          const resultRows = Array.isArray(opt.resultRows) ? opt.resultRows : void 0;
          let stmt;
          let bind = opt.bind;
          let evalFirstResult = !!(arg.cbArg || opt.columnNames || resultRows);
          const stack = wasm3.scopedAllocPush();
          const saveSql = Array.isArray(opt.saveSql) ? opt.saveSql : void 0;
          try {
            const isTA = util.isSQLableTypedArray(arg.sql);
            let sqlByteLen = isTA ? arg.sql.byteLength : wasm3.jstrlen(arg.sql);
            const ppStmt = wasm3.scopedAlloc(2 * wasm3.ptr.size + (sqlByteLen + 1));
            const pzTail = wasm3.ptr.add(ppStmt, wasm3.ptr.size);
            let pSql = wasm3.ptr.add(pzTail, wasm3.ptr.size);
            const pSqlEnd = wasm3.ptr.add(pSql, sqlByteLen);
            if (isTA) wasm3.heap8().set(arg.sql, pSql);
            else wasm3.jstrcpy(arg.sql, wasm3.heap8(), pSql, sqlByteLen, false);
            wasm3.poke8(wasm3.ptr.add(pSql, sqlByteLen), 0);
            while (pSql && wasm3.peek8(pSql)) {
              wasm3.pokePtr([ppStmt, pzTail], 0);
              DB.checkRc(this, capi.sqlite3_prepare_v3(this.pointer, pSql, sqlByteLen, 0, ppStmt, pzTail));
              const pStmt = wasm3.peekPtr(ppStmt);
              pSql = wasm3.peekPtr(pzTail);
              sqlByteLen = Number(wasm3.ptr.add(pSqlEnd, -pSql));
              if (!pStmt) continue;
              if (saveSql) saveSql.push(capi.sqlite3_sql(pStmt).trim());
              stmt = new Stmt(this, pStmt, BindTypes);
              if (bind && stmt.parameterCount) {
                stmt.bind(bind);
                bind = null;
              }
              if (evalFirstResult && stmt.columnCount) {
                let gotColNames = Array.isArray(opt.columnNames) ? 0 : 1;
                evalFirstResult = false;
                if (arg.cbArg || resultRows) {
                  const cbArgCache = /* @__PURE__ */ Object.create(null);
                  for (; stmt.step(); __execLock.delete(stmt)) {
                    if (0 === gotColNames++) stmt.getColumnNames(cbArgCache.columnNames = opt.columnNames || []);
                    __execLock.add(stmt);
                    const row = arg.cbArg(stmt, cbArgCache);
                    if (resultRows) resultRows.push(row);
                    if (callback && false === callback.call(opt, row, stmt)) break;
                  }
                  __execLock.delete(stmt);
                }
                if (0 === gotColNames) stmt.getColumnNames(opt.columnNames);
              } else stmt.step();
              stmt.reset().finalize();
              stmt = null;
            }
          } finally {
            if (stmt) {
              __execLock.delete(stmt);
              stmt.finalize();
            }
            wasm3.scopedAllocPop(stack);
          }
          return arg.returnVal();
        },
        /**
        Creates a new UDF (User-Defined Function) which is accessible
        via SQL code. This function may be called in any of the
        following forms:
        
        - (name, function)
        - (name, function, optionsObject)
        - (name, optionsObject)
        - (optionsObject)
        
        In the final two cases, the function must be defined as the
        `callback` property of the options object (optionally called
        `xFunc` to align with the C API documentation). In the final
        case, the function's name must be the 'name' property.
        
        The first two call forms can only be used for creating scalar
        functions. Creating an aggregate or window function requires
        the options-object form (see below for details).
        
        UDFs can be removed as documented for
        sqlite3_create_function_v2() and
        sqlite3_create_window_function(), but doing so will "leak" the
        JS-created WASM binding of those functions (meaning that their
        entries in the WASM indirect function table still
        exist). Eliminating that potential leak is a pending TODO.
        
        On success, returns this object. Throws on error.
        
        When called from SQL arguments to the UDF, and its result,
        will be converted between JS and SQL with as much fidelity as
        is feasible, triggering an exception if a type conversion
        cannot be determined. The docs for sqlite3_create_function_v2()
        describe the conversions in more detail.
        
        The values set in the options object differ for scalar and
        aggregate functions:
        
        - Scalar: set the `xFunc` function-type property to the UDF
        function.
        
        - Aggregate: set the `xStep` and `xFinal` function-type
        properties to the "step" and "final" callbacks for the
        aggregate. Do not set the `xFunc` property.
        
        - Window: set the `xStep`, `xFinal`, `xValue`, and `xInverse`
        function-type properties. Do not set the `xFunc` property.
        
        The options object may optionally have an `xDestroy`
        function-type property, as per sqlite3_create_function_v2().
        Its argument will be the WASM-pointer-type value of the `pApp`
        property, and this function will throw if `pApp` is defined but
        is not null, undefined, or a numeric (WASM pointer)
        value. i.e. `pApp`, if set, must be value suitable for use as a
        WASM pointer argument, noting that `null` or `undefined` will
        translate to 0 for that purpose.
        
        The options object may contain flags to modify how
        the function is defined:
        
        - `arity`: the number of arguments which SQL calls to this
        function expect or require. The default value is `xFunc.length`
        or `xStep.length` (i.e. the number of declared parameters it
        has) **MINUS 1** (see below for why). As a special case, if the
        `length` is 0, its arity is also 0 instead of -1. A negative
        arity value means that the function is variadic and may accept
        any number of arguments, up to sqlite3's compile-time
        limits. sqlite3 will enforce the argument count if is zero or
        greater. The callback always receives a pointer to an
        `sqlite3_context` object as its first argument. Any arguments
        after that are from SQL code. The leading context argument does
        _not_ count towards the function's arity. See the docs for
        sqlite3.capi.sqlite3_create_function_v2() for why that argument
        is needed in the interface.
        
        The following options-object properties correspond to flags
        documented at:
        
        https://sqlite.org/c3ref/create_function.html
        
        - `deterministic` = sqlite3.capi.SQLITE_DETERMINISTIC
        - `directOnly` = sqlite3.capi.SQLITE_DIRECTONLY
        - `innocuous` = sqlite3.capi.SQLITE_INNOCUOUS
        
        Sidebar: the ability to add new WASM-accessible functions to
        the runtime requires that the WASM build is compiled with the
        equivalent functionality as that provided by Emscripten's
        `-sALLOW_TABLE_GROWTH` flag.
        */
        createFunction: function f2(name, xFunc, opt) {
          const isFunc = (f3) => f3 instanceof Function;
          switch (arguments.length) {
            case 1:
              opt = name;
              name = opt.name;
              xFunc = opt.xFunc || 0;
              break;
            case 2:
              if (!isFunc(xFunc)) {
                opt = xFunc;
                xFunc = opt.xFunc || 0;
              }
          }
          if (!opt) opt = {};
          if ("string" !== typeof name) toss3("Invalid arguments: missing function name.");
          let xStep = opt.xStep || 0;
          let xFinal = opt.xFinal || 0;
          const xValue = opt.xValue || 0;
          const xInverse = opt.xInverse || 0;
          let isWindow = void 0;
          if (isFunc(xFunc)) {
            isWindow = false;
            if (isFunc(xStep) || isFunc(xFinal)) toss3("Ambiguous arguments: scalar or aggregate?");
            xStep = xFinal = null;
          } else if (isFunc(xStep)) {
            if (!isFunc(xFinal)) toss3("Missing xFinal() callback for aggregate or window UDF.");
            xFunc = null;
          } else if (isFunc(xFinal)) toss3("Missing xStep() callback for aggregate or window UDF.");
          else toss3("Missing function-type properties.");
          if (false === isWindow) {
            if (isFunc(xValue) || isFunc(xInverse)) toss3("xValue and xInverse are not permitted for non-window UDFs.");
          } else if (isFunc(xValue)) {
            if (!isFunc(xInverse)) toss3("xInverse must be provided if xValue is.");
            isWindow = true;
          } else if (isFunc(xInverse)) toss3("xValue must be provided if xInverse is.");
          const pApp = opt.pApp;
          if (void 0 !== pApp && null !== pApp && !wasm3.isPtr(pApp)) toss3("Invalid value for pApp property. Must be a legal WASM pointer value.");
          const xDestroy = opt.xDestroy || 0;
          if (xDestroy && !isFunc(xDestroy)) toss3("xDestroy property must be a function.");
          let fFlags = 0;
          if (getOwnOption(opt, "deterministic")) fFlags |= capi.SQLITE_DETERMINISTIC;
          if (getOwnOption(opt, "directOnly")) fFlags |= capi.SQLITE_DIRECTONLY;
          if (getOwnOption(opt, "innocuous")) fFlags |= capi.SQLITE_INNOCUOUS;
          name = name.toLowerCase();
          const xArity = xFunc || xStep;
          const arity = getOwnOption(opt, "arity");
          const arityArg = "number" === typeof arity ? arity : xArity.length ? xArity.length - 1 : 0;
          let rc;
          if (isWindow) rc = capi.sqlite3_create_window_function(this.pointer, name, arityArg, capi.SQLITE_UTF8 | fFlags, pApp || 0, xStep, xFinal, xValue, xInverse, xDestroy);
          else rc = capi.sqlite3_create_function_v2(this.pointer, name, arityArg, capi.SQLITE_UTF8 | fFlags, pApp || 0, xFunc, xStep, xFinal, xDestroy);
          DB.checkRc(this, rc);
          return this;
        },
        /**
        Prepares the given SQL, step()s it one time, and returns
        the value of the first result column. If it has no results,
        undefined is returned.
        
        If passed a second argument, it is treated like an argument
        to Stmt.bind(), so may be any type supported by that
        function. Passing the undefined value is the same as passing
        no value, which is useful when...
        
        If passed a 3rd argument, it is expected to be one of the
        SQLITE_{typename} constants. Passing the undefined value is
        the same as not passing a value.
        
        Throws on error (e.g. malformed SQL).
        */
        selectValue: function(sql, bind, asType) {
          return __selectFirstRow(this, sql, bind, 0, asType);
        },
        /**
        Runs the given query and returns an array of the values from
        the first result column of each row of the result set. The 2nd
        argument is an optional value for use in a single-argument call
        to Stmt.bind(). The 3rd argument may be any value suitable for
        use as the 2nd argument to Stmt.get(). If a 3rd argument is
        desired but no bind data are needed, pass `undefined` for the 2nd
        argument.
        
        If there are no result rows, an empty array is returned.
        */
        selectValues: function(sql, bind, asType) {
          const stmt = this.prepare(sql), rc = [];
          try {
            affirmColIndex(stmt, 0);
            stmt.bind(bind);
            while (stmt.step()) rc.push(__stmtGetColumn(stmt, 0, asType));
            stmt.reset();
          } finally {
            stmt.finalize();
          }
          return rc;
        },
        /**
        Prepares the given SQL, step()s it one time, and returns an
        array containing the values of the first result row. If it has
        no results, `undefined` is returned.
        
        If passed a second argument other than `undefined`, it is
        treated like an argument to Stmt.bind(), so may be any type
        supported by that function.
        
        Throws on error (e.g. malformed SQL).
        */
        selectArray: function(sql, bind) {
          return __selectFirstRow(this, sql, bind, []);
        },
        /**
        Prepares the given SQL, step()s it one time, and returns an
        object containing the key/value pairs of the first result
        row. If it has no results, `undefined` is returned.
        
        Note that the order of returned object's keys is not guaranteed
        to be the same as the order of the fields in the query string.
        
        If passed a second argument other than `undefined`, it is
        treated like an argument to Stmt.bind(), so may be any type
        supported by that function.
        
        Throws on error (e.g. malformed SQL).
        */
        selectObject: function(sql, bind) {
          return __selectFirstRow(this, sql, bind, {});
        },
        /**
        Runs the given SQL and returns an array of all results, with
        each row represented as an array, as per the 'array' `rowMode`
        option to `exec()`. An empty result set resolves
        to an empty array. The second argument, if any, is treated as
        the 'bind' option to a call to exec().
        */
        selectArrays: function(sql, bind) {
          return __selectAll(this, sql, bind, "array");
        },
        /**
        Works identically to selectArrays() except that each value
        in the returned array is an object, as per the 'object' `rowMode`
        option to `exec()`.
        */
        selectObjects: function(sql, bind) {
          return __selectAll(this, sql, bind, "object");
        },
        /**
        Returns the number of currently-opened Stmt handles for this db
        handle, or 0 if this DB instance is closed. Note that only
        handles prepared via this.prepare() are counted, and not
        handles prepared using capi.sqlite3_prepare_v3() (or
        equivalent).
        */
        openStatementCount: function() {
          return this.pointer ? Object.keys(__stmtMap.get(this)).length : 0;
        },
        /**
        Starts a transaction, calls the given callback, and then either
        rolls back or commits the transaction, depending on whether the
        callback throws. The callback is passed this db object as its
        only argument. On success, returns the result of the
        callback. Throws on error.
        
        Transactions may not be nested, so this will throw if it is
        called recursively. For nested transactions, use the
        savepoint() method or manually manage SAVEPOINTs using exec().
        
        If called with 2 arguments, the first must be a keyword which
        is legal immediately after a BEGIN statement, e.g. one of
        "DEFERRED", "IMMEDIATE", or "EXCLUSIVE", though the exact list
        of supported keywords is not hard-coded here, in order to be
        future-compatible, if the argument does not look like a single
        keyword then an exception is triggered with a description of
        the problem.
        */
        transaction: function(callback) {
          let opener = "BEGIN";
          if (arguments.length > 1) {
            if (/[^a-zA-Z]/.test(arguments[0])) toss3(capi.SQLITE_MISUSE, "Invalid argument for BEGIN qualifier.");
            opener += " " + arguments[0];
            callback = arguments[1];
          }
          affirmDbOpen(this).exec(opener);
          try {
            const rc = callback(this);
            this.exec("COMMIT");
            return rc;
          } catch (e4) {
            this.exec("ROLLBACK");
            throw e4;
          }
        },
        /**
        This works similarly to transaction() but uses sqlite3's SAVEPOINT
        feature. This function starts a savepoint (with an unspecified name)
        and calls the given callback function, passing it this db object.
        If the callback returns, the savepoint is released (committed). If
        the callback throws, the savepoint is rolled back. If it does not
        throw, it returns the result of the callback.
        */
        savepoint: function(callback) {
          affirmDbOpen(this).exec("SAVEPOINT oo1");
          try {
            const rc = callback(this);
            this.exec("RELEASE oo1");
            return rc;
          } catch (e4) {
            this.exec("ROLLBACK to SAVEPOINT oo1; RELEASE SAVEPOINT oo1");
            throw e4;
          }
        },
        /**
        A convenience form of DB.checkRc(this,resultCode). If it does
        not throw, it returns this object.
        */
        checkRc: function(resultCode) {
          return checkSqlite3Rc(this, resultCode);
        }
      };
      DB.wrapHandle = function(pDb2, takeOwnership = false) {
        if (!pDb2 || !wasm3.isPtr(pDb2)) throw new sqlite3.SQLite3Error(capi.SQLITE_MISUSE, "Argument must be a WASM sqlite3 pointer");
        return new DB({
          "sqlite3*": pDb2,
          "sqlite3*:takeOwnership": !!takeOwnership
        });
      };
      const affirmStmtOpen = function(stmt) {
        if (!stmt.pointer) toss3("Stmt has been closed.");
        return stmt;
      };
      const isSupportedBindType = function(v2) {
        let t4 = BindTypes[null === v2 || void 0 === v2 ? "null" : typeof v2];
        switch (t4) {
          case BindTypes.boolean:
          case BindTypes.null:
          case BindTypes.number:
          case BindTypes.string:
            return t4;
          case BindTypes.bigint:
            return wasm3.bigIntEnabled ? t4 : void 0;
          default:
            return util.isBindableTypedArray(v2) ? BindTypes.blob : void 0;
        }
      };
      const affirmSupportedBindType = function(v2) {
        return isSupportedBindType(v2) || toss3("Unsupported bind() argument type:", typeof v2);
      };
      const affirmParamIndex = function(stmt, key) {
        const n3 = "number" === typeof key ? key : capi.sqlite3_bind_parameter_index(stmt.pointer, key);
        if (0 === n3 || !util.isInt32(n3)) toss3("Invalid bind() parameter name: " + key);
        else if (n3 < 1 || n3 > stmt.parameterCount) toss3("Bind index", key, "is out of range.");
        return n3;
      };
      const __execLock = /* @__PURE__ */ new Set();
      const __stmtMayGet = /* @__PURE__ */ new Set();
      const affirmNotLockedByExec = function(stmt, currentOpName) {
        if (__execLock.has(stmt)) toss3("Operation is illegal when statement is locked:", currentOpName);
        return stmt;
      };
      const bindOne = function f2(stmt, ndx, bindType, val) {
        affirmNotLockedByExec(affirmStmtOpen(stmt), "bind()");
        if (!f2._) {
          f2._tooBigInt = (v2) => toss3("BigInt value is too big to store without precision loss:", v2);
          f2._ = { string: function(stmt2, ndx2, val2, asBlob) {
            const [pStr, n3] = wasm3.allocCString(val2, true);
            return (asBlob ? capi.sqlite3_bind_blob : capi.sqlite3_bind_text)(stmt2.pointer, ndx2, pStr, n3, capi.SQLITE_WASM_DEALLOC);
          } };
        }
        affirmSupportedBindType(val);
        ndx = affirmParamIndex(stmt, ndx);
        let rc = 0;
        switch (null === val || void 0 === val ? BindTypes.null : bindType) {
          case BindTypes.null:
            rc = capi.sqlite3_bind_null(stmt.pointer, ndx);
            break;
          case BindTypes.string:
            rc = f2._.string(stmt, ndx, val, false);
            break;
          case BindTypes.number: {
            let m;
            if (util.isInt32(val)) m = capi.sqlite3_bind_int;
            else if ("bigint" === typeof val) {
              if (!util.bigIntFits64(val)) f2._tooBigInt(val);
              else if (wasm3.bigIntEnabled) m = capi.sqlite3_bind_int64;
              else if (util.bigIntFitsDouble(val)) {
                val = Number(val);
                m = capi.sqlite3_bind_double;
              } else f2._tooBigInt(val);
            } else {
              val = Number(val);
              if (wasm3.bigIntEnabled && Number.isInteger(val)) m = capi.sqlite3_bind_int64;
              else m = capi.sqlite3_bind_double;
            }
            rc = m(stmt.pointer, ndx, val);
            break;
          }
          case BindTypes.boolean:
            rc = capi.sqlite3_bind_int(stmt.pointer, ndx, val ? 1 : 0);
            break;
          case BindTypes.blob: {
            if ("string" === typeof val) {
              rc = f2._.string(stmt, ndx, val, true);
              break;
            } else if (val instanceof ArrayBuffer) val = new Uint8Array(val);
            else if (!util.isBindableTypedArray(val)) toss3("Binding a value as a blob requires", "that it be a string, Uint8Array, Int8Array, or ArrayBuffer.");
            const pBlob = wasm3.alloc(val.byteLength || 1);
            wasm3.heap8().set(val.byteLength ? val : [0], Number(pBlob));
            rc = capi.sqlite3_bind_blob(stmt.pointer, ndx, pBlob, val.byteLength, capi.SQLITE_WASM_DEALLOC);
            break;
          }
          default:
            sqlite3.config.warn("Unsupported bind() argument type:", val);
            toss3("Unsupported bind() argument type: " + typeof val);
        }
        if (rc) DB.checkRc(stmt.db.pointer, rc);
        return stmt;
      };
      Stmt.prototype = {
        /**
        "Finalizes" this statement. This is a no-op if the statement
        has already been finalized. Returns the result of
        sqlite3_finalize() (0 on success, non-0 on error), or the
        undefined value if the statement has already been
        finalized. Regardless of success or failure, most methods in
        this class will throw if called after this is.
        
        This method always throws if called when it is illegal to do
        so. Namely, when triggered via a per-row callback handler of a
        DB.exec() call.
        
        If Stmt does not own its underlying (sqlite3_stmt*) (see
        Stmt.wrapHandle()) then this function will not pass it to
        sqlite3_finalize().
        */
        finalize: function() {
          const ptr = this.pointer;
          if (ptr) {
            affirmNotLockedByExec(this, "finalize()");
            const rc = __doesNotOwnHandle.delete(this) ? 0 : capi.sqlite3_finalize(ptr);
            delete __stmtMap.get(this.db)[ptr];
            __ptrMap.delete(this);
            __execLock.delete(this);
            __stmtMayGet.delete(this);
            delete this.parameterCount;
            delete this.db;
            return rc;
          }
        },
        /**
        Clears all bound values. Returns this object.  Throws if this
        statement has been finalized or if modification of the
        statement is currently illegal (e.g. in the per-row callback of
        a DB.exec() call).
        */
        clearBindings: function() {
          affirmNotLockedByExec(affirmStmtOpen(this), "clearBindings()");
          capi.sqlite3_clear_bindings(this.pointer);
          __stmtMayGet.delete(this);
          return this;
        },
        /**
        Resets this statement so that it may be step()ed again from the
        beginning. Returns this object. Throws if this statement has
        been finalized, if it may not legally be reset because it is
        currently being used from a DB.exec() callback, or if the
        underlying call to sqlite3_reset() returns non-0.
        
        If passed a truthy argument then this.clearBindings() is
        also called, otherwise any existing bindings, along with
        any memory allocated for them, are retained.
        
        Clients must not use capi.sqlite3_reset() with this object
        because this method does book-keeping specific to this class,
        e.g. the pieces which ensure that the column-fetching methods
        throw when called without a corresponding step().
        
        In versions 3.42.0 and earlier, this function did not throw if
        sqlite3_reset() returns non-0, but it was discovered that
        throwing (or significant extra client-side code) is necessary
        in order to avoid certain silent failure scenarios, as
        discussed at:
        
        https://sqlite.org/forum/forumpost/36f7a2e7494897df
        */
        reset: function(alsoClearBinds) {
          affirmNotLockedByExec(this, "reset()");
          if (alsoClearBinds) this.clearBindings();
          const rc = capi.sqlite3_reset(affirmStmtOpen(this).pointer);
          __stmtMayGet.delete(this);
          checkSqlite3Rc(this.db, rc);
          return this;
        },
        /**
        Works like reset() except that it returns the underlying
        C-level result code instead of throwing if that code represents
        an error.
        
        Clients must not use capi.sqlite3_reset() for this purpose
        because this method (like reset()) does book-keeping specific
        to this class.
        
        Throws if an exec() is underway.
        
        The use case this addresses is when a step() fails due to,
        e.g., a locking error: a following reset() will report that
        locking error by throwing and that's sometimes inconvenient.
        
        Added in 3.54.
        */
        resetNoThrow: function(alsoClearBinds) {
          affirmNotLockedByExec(this, "reset()");
          if (alsoClearBinds) this.clearBindings();
          const rc = capi.sqlite3_reset(affirmStmtOpen(this).pointer);
          __stmtMayGet.delete(this);
          return rc;
        },
        /**
        Binds one or more values to its bindable parameters. It
        accepts 1 or 2 arguments:
        
        If passed a single argument, it must be either an array, an
        object, or a value of a bindable type (see below).
        
        If passed 2 arguments, the first one is the 1-based bind
        index or bindable parameter name and the second one must be
        a value of a bindable type.
        
        Bindable value types:
        
        - null is bound as NULL.
        
        - undefined as a standalone value is a no-op intended to
        simplify certain client-side use cases: passing undefined as
        a value to this function will not actually bind anything and
        this function will skip confirmation that binding is even
        legal. (Those semantics simplify certain client-side uses.)
        Conversely, a value of undefined as an array or object
        property when binding an array/object (see below) is treated
        the same as null.
        
        - Numbers are bound as either doubles or integers: doubles if
        they are larger than 32 bits, else double or int32, depending
        on whether they have a fractional part. Booleans are bound as
        integer 0 or 1. It is not expected the distinction of binding
        doubles which have no fractional parts and integers is
        significant for the majority of clients due to sqlite3's data
        typing model. If BigInt support is enabled then this routine
        will bind BigInt values as 64-bit integers if they'll fit in
        64 bits. If that support disabled, it will store the BigInt
        as an int32 or a double if it can do so without loss of
        precision. If the BigInt is _too BigInt_ then it will throw.
        
        - Strings are bound as strings (use bindAsBlob() to force
        blob binding).
        
        - Uint8Array, Int8Array, and ArrayBuffer instances are bound as
        blobs.
        
        If passed an array, each element of the array is bound at
        the parameter index equal to the array index plus 1
        (because arrays are 0-based but binding is 1-based).
        
        If passed an object, each object key is treated as a
        bindable parameter name. The object keys _must_ match any
        bindable parameter names, including any `$`, `@`, or `:`
        prefix. Because `$` is a legal identifier chararacter in
        JavaScript, that is the suggested prefix for bindable
        parameters: `stmt.bind({$a: 1, $b: 2})`.
        
        It returns this object on success and throws on
        error. Errors include:
        
        - Any bind index is out of range, a named bind parameter
        does not match, or this statement has no bindable
        parameters.
        
        - Any value to bind is of an unsupported type.
        
        - Passed no arguments or more than two.
        
        - The statement has been finalized.
        */
        bind: function() {
          affirmStmtOpen(this);
          let ndx, arg;
          switch (arguments.length) {
            case 1:
              ndx = 1;
              arg = arguments[0];
              break;
            case 2:
              ndx = arguments[0];
              arg = arguments[1];
              break;
            default:
              toss3("Invalid bind() arguments.");
          }
          if (void 0 === arg) return this;
          else if (!this.parameterCount) toss3("This statement has no bindable parameters.");
          __stmtMayGet.delete(this);
          if (null === arg) return bindOne(this, ndx, BindTypes.null, arg);
          else if (Array.isArray(arg)) {
            if (1 !== arguments.length) toss3("When binding an array, an index argument is not permitted.");
            arg.forEach((v2, i) => bindOne(this, i + 1, affirmSupportedBindType(v2), v2));
            return this;
          } else if (arg instanceof ArrayBuffer) arg = new Uint8Array(arg);
          if ("object" === typeof arg && !util.isBindableTypedArray(arg)) {
            if (1 !== arguments.length) toss3("When binding an object, an index argument is not permitted.");
            Object.keys(arg).forEach((k2) => bindOne(this, k2, affirmSupportedBindType(arg[k2]), arg[k2]));
            return this;
          } else return bindOne(this, ndx, affirmSupportedBindType(arg), arg);
        },
        /**
        Special case of bind() which binds the given value using the
        BLOB binding mechanism instead of the default selected one for
        the value. The ndx may be a numbered or named bind index. The
        value must be of type string, null/undefined (both get treated
        as null), or a TypedArray of a type supported by the bind()
        API. This API cannot bind numbers as blobs.
        
        If passed a single argument, a bind index of 1 is assumed and
        the first argument is the value.
        */
        bindAsBlob: function(ndx, arg) {
          affirmStmtOpen(this);
          if (1 === arguments.length) {
            arg = ndx;
            ndx = 1;
          }
          const t4 = affirmSupportedBindType(arg);
          if (BindTypes.string !== t4 && BindTypes.blob !== t4 && BindTypes.null !== t4) toss3("Invalid value type for bindAsBlob()");
          return bindOne(this, ndx, BindTypes.blob, arg);
        },
        /**
        Steps the statement one time. If the result indicates that a
        row of data is available, a truthy value is returned.  If no
        row of data is available, a falsy value is returned.  Throws on
        error.
        */
        step: function() {
          affirmNotLockedByExec(this, "step()");
          const rc = capi.sqlite3_step(affirmStmtOpen(this).pointer);
          switch (rc) {
            case capi.SQLITE_DONE:
              __stmtMayGet.delete(this);
              return false;
            case capi.SQLITE_ROW:
              __stmtMayGet.add(this);
              return true;
            default:
              __stmtMayGet.delete(this);
              sqlite3.config.warn("sqlite3_step() rc=", rc, capi.sqlite3_js_rc_str(rc), "SQL =", capi.sqlite3_sql(this.pointer));
              DB.checkRc(this.db.pointer, rc);
          }
        },
        /**
        Functions exactly like step() except that...
        
        1) On success, it calls this.reset() and returns this object.
        
        2) On error, it throws and does not call reset().
        
        This is intended to simplify constructs like:
        
        ```
        for(...) {
        stmt.bind(...).stepReset();
        }
        ```
        
        Note that the reset() call makes it illegal to call this.get()
        after the step.
        */
        stepReset: function() {
          this.step();
          return this.reset();
        },
        /**
        Functions like step() except that it calls finalize() on this
        statement immediately after stepping, even if the step() call
        throws.
        
        On success, it returns true if the step indicated that a row of
        data was available, else it returns a falsy value.
        
        This is intended to simplify use cases such as:
        
        ```
        aDb.prepare("insert into foo(a) values(?)").bind(123).stepFinalize();
        ```
        */
        stepFinalize: function() {
          try {
            const rc = this.step();
            this.reset();
            return rc;
          } finally {
            try {
              this.finalize();
            } catch (e4) {
            }
          }
        },
        /**
        Fetches the value from the given 0-based column index of
        the current data row, throwing if index is out of range.
        
        Requires that step() has just returned a truthy value, else
        an exception is thrown.
        
        By default it will determine the data type of the result
        automatically. If passed a second argument, it must be one of
        the enumeration values for sqlite3 types, which are defined as
        members of the sqlite3.capi namespace: SQLITE_INTEGER,
        SQLITE_FLOAT, SQLITE_TEXT, SQLITE_BLOB. Any other value, except
        for undefined, will trigger an exception. Passing undefined is
        the same as not passing a value. It is legal to, e.g., fetch an
        integer value as a string, in which case sqlite3 will convert
        the value to a string.
        
        Blobs are returned as Uint8Array instances.
        
        If ndx is an array, this function behaves a differently: it
        assigns the indexes of the array, from 0 to the number of
        result columns, to the values of the corresponding column,
        and returns that array.
        
        If ndx is a plain object, this function behaves even
        differentlier: it assigns the properties of the object to
        the values of their corresponding result columns and returns
        that object.
        
        Performance note: this class does not cache its column names
        because a reprepare may change them and we have(?) no(?) way of
        hooking into that to invalidate the cache. A side effect of
        that is that this function, when ndx is an object, has to copy
        those names from the WASM side on each call. When fetching many
        objects, DB.exec() can do so more efficiently by caching those
        names for the duration of the query. In large result sets the
        runtime difference is human-perceivable.
        
        Behavior change notice: prior to 3.54, the asType argument was
        ignored when ndx is an array or object, the justification being
        that we're generally fetching rows of mixed data types. As of
        3.54, it still behaves that way when passed the undefined value
        resp. is not passed a value, but will coerce each column to the
        request type of it is not the undefined value. It is not
        believed that this change adversely affects any existing
        client-level code because this argument was ignored and
        applications passing a non-undefined value were not necessarily
        getting back what they had specified (or did so only because
        all of the data was of that type, in which case the new
        behavior is identical for those queries).
        
        Potential TODO: add type ID SQLITE_JSON, which fetches the
        result as a string and passes it (if it's not null) to
        JSON.parse(), returning the result of that. Until then,
        getJSON() can be used for that.
        */
        get: function(ndx, asType) {
          if (!__stmtMayGet.has(affirmStmtOpen(this))) toss3("Stmt.step() has not (recently) returned true.");
          if (Array.isArray(ndx)) {
            let i = 0;
            const n3 = this.columnCount;
            while (i < n3) {
              ndx[i] = __stmtGetColumn(this, i, asType);
              ++i;
            }
            return ndx;
          } else if (ndx && "object" === typeof ndx) {
            let i = 0;
            const n3 = this.columnCount;
            while (i < n3) {
              ndx[capi.sqlite3_column_name(this.pointer, i)] = __stmtGetColumn(this, i, asType);
              ++i;
            }
            return ndx;
          }
          affirmColIndex(this, ndx);
          return __stmtGetColumn(this, ndx, asType);
        },
        /** Equivalent to get(ndx) but coerces the result to an
        integer. */
        getInt: function(ndx) {
          return this.get(ndx, capi.SQLITE_INTEGER);
        },
        /** Equivalent to get(ndx) but coerces the result to a
        float. */
        getFloat: function(ndx) {
          return this.get(ndx, capi.SQLITE_FLOAT);
        },
        /** Equivalent to get(ndx) but coerces the result to a
        string. */
        getString: function(ndx) {
          return this.get(ndx, capi.SQLITE_TEXT);
        },
        /** Equivalent to get(ndx) but coerces the result to a
        Uint8Array. */
        getBlob: function(ndx) {
          return this.get(ndx, capi.SQLITE_BLOB);
        },
        /**
        A convenience wrapper around get() which fetches the value
        as a string and then, if it is not null, passes it to
        JSON.parse(), returning that result. Throws if parsing
        fails. If the result is null, null is returned. An empty
        string, on the other hand, will trigger an exception.
        */
        getJSON: function(ndx) {
          const s2 = this.get(ndx, capi.SQLITE_STRING);
          return null === s2 ? s2 : JSON.parse(s2);
        },
        /**
        Returns the result column name of the given index, or
        throws if index is out of bounds or this statement has been
        finalized. This can be used without having run step()
        first.
        */
        getColumnName: function(ndx) {
          return capi.sqlite3_column_name(affirmColIndex(affirmStmtOpen(this), ndx).pointer, ndx);
        },
        /**
        If this statement potentially has result columns, this function
        returns an array of all such names. If passed an array, it is
        used as the target and all names are appended to it. Returns
        the target array. Throws if this statement cannot have result
        columns. This object's columnCount property holds the number of
        columns.
        */
        getColumnNames: function(tgt = []) {
          affirmColIndex(affirmStmtOpen(this), 0);
          const n3 = this.columnCount;
          for (let i = 0; i < n3; ++i) tgt.push(capi.sqlite3_column_name(this.pointer, i));
          return tgt;
        },
        /**
        If this statement has named bindable parameters and the
        given name matches one, its 1-based bind index is
        returned. If no match is found, 0 is returned. If it has no
        bindable parameters, the undefined value is returned.
        */
        getParamIndex: function(name) {
          return affirmStmtOpen(this).parameterCount ? capi.sqlite3_bind_parameter_index(this.pointer, name) : void 0;
        },
        /**
        If this statement has named bindable parameters and the given
        index refers to one, its name is returned, else null is
        returned. If this statement has no bound parameters, undefined
        is returned.
        
        Added in 3.47.
        */
        getParamName: function(ndx) {
          return affirmStmtOpen(this).parameterCount ? capi.sqlite3_bind_parameter_name(this.pointer, ndx) : void 0;
        },
        /**
        Behaves like sqlite3_stmt_busy() but throws if this statement
        is closed and returns a value of type boolean instead of integer.
        
        Added in 3.47.
        */
        isBusy: function() {
          return 0 !== capi.sqlite3_stmt_busy(affirmStmtOpen(this));
        },
        /**
        Behaves like sqlite3_stmt_readonly() but throws if this statement
        is closed and returns a value of type boolean instead of integer.
        
        Added in 3.47.
        */
        isReadOnly: function() {
          return 0 !== capi.sqlite3_stmt_readonly(affirmStmtOpen(this));
        }
      };
      {
        const prop = {
          enumerable: true,
          get: function() {
            return __ptrMap.get(this);
          },
          set: () => toss3("The pointer property is read-only.")
        };
        Object.defineProperty(Stmt.prototype, "pointer", prop);
        Object.defineProperty(DB.prototype, "pointer", prop);
      }
      Object.defineProperty(Stmt.prototype, "columnCount", {
        enumerable: false,
        get: function() {
          return capi.sqlite3_column_count(this.pointer);
        },
        set: () => toss3("The columnCount property is read-only.")
      });
      Object.defineProperty(Stmt.prototype, "parameterCount", {
        enumerable: false,
        get: function() {
          return capi.sqlite3_bind_parameter_count(this.pointer);
        },
        set: () => toss3("The parameterCount property is read-only.")
      });
      Stmt.wrapHandle = function(oo1db, pStmt, takeOwnership = false) {
        if (!(oo1db instanceof DB) || !oo1db.pointer) throw new sqlite3.SQLite3Error(sqlite3.SQLITE_MISUSE, "First argument must be an opened sqlite3.oo1.DB instance");
        if (!pStmt || !wasm3.isPtr(pStmt)) throw new sqlite3.SQLite3Error(sqlite3.SQLITE_MISUSE, "Second argument must be a WASM sqlite3_stmt pointer");
        return new Stmt(oo1db, pStmt, BindTypes, !!takeOwnership);
      };
      sqlite3.oo1 = {
        DB,
        Stmt
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      const util = sqlite3.util;
      sqlite3.initWorker1API = function() {
        "use strict";
        const toss = (...args) => {
          throw new Error(args.join(" "));
        };
        if (!(globalThis.WorkerGlobalScope instanceof Function)) toss("initWorker1API() must be run from a Worker thread.");
        const sqlite32 = this.sqlite3 || toss("Missing this.sqlite3 object.");
        const DB = sqlite32.oo1.DB;
        const getDbId = function(db) {
          let id = wState.idMap.get(db);
          if (id) return id;
          id = "db#" + ++wState.idSeq + ":" + Math.floor(Math.random() * 1e8) + ":" + Math.floor(Math.random() * 1e8);
          wState.idMap.set(db, id);
          return id;
        };
        const wState = {
          /**
          Each opened DB is added to this.dbList, and the first entry in
          that list is the default db. As each db is closed, its entry is
          removed from the list.
          */
          dbList: [],
          /** Sequence number of dbId generation. */
          idSeq: 0,
          /** Map of DB instances to dbId. */
          idMap: /* @__PURE__ */ new WeakMap(),
          /** Temp holder for "transferable" postMessage() state. */
          xfer: [],
          open: function(opt) {
            const db = new DB(opt);
            this.dbs[getDbId(db)] = db;
            if (this.dbList.indexOf(db) < 0) this.dbList.push(db);
            return db;
          },
          close: function(db, alsoUnlink) {
            if (db) {
              delete this.dbs[getDbId(db)];
              const filename = db.filename;
              const pVfs = util.sqlite3__wasm_db_vfs(db.pointer, 0);
              db.close();
              const ddNdx = this.dbList.indexOf(db);
              if (ddNdx >= 0) this.dbList.splice(ddNdx, 1);
              if (alsoUnlink && filename && pVfs) util.sqlite3__wasm_vfs_unlink(pVfs, filename);
            }
          },
          /**
          Posts the given worker message value. If xferList is provided,
          it must be an array, in which case a copy of it passed as
          postMessage()'s second argument and xferList.length is set to
          0.
          */
          post: function(msg, xferList) {
            if (xferList && xferList.length) {
              globalThis.postMessage(msg, Array.from(xferList));
              xferList.length = 0;
            } else globalThis.postMessage(msg);
          },
          /** Map of DB IDs to DBs. */
          dbs: /* @__PURE__ */ Object.create(null),
          /** Fetch the DB for the given id. Throw if require=true and the
          id is not valid, else return the db or undefined. */
          getDb: function(id, require2 = true) {
            return this.dbs[id] || (require2 ? toss("Unknown (or closed) DB ID:", id) : void 0);
          }
        };
        const affirmDbOpen = function(db = wState.dbList[0]) {
          return db && db.pointer ? db : toss("DB is not opened.");
        };
        const getMsgDb = function(msgData, affirmExists = true) {
          const db = wState.getDb(msgData.dbId, false) || wState.dbList[0];
          return affirmExists ? affirmDbOpen(db) : db;
        };
        const getDefaultDbId = function() {
          return wState.dbList[0] && getDbId(wState.dbList[0]);
        };
        const wMsgHandler = {
          open: function(ev) {
            const oargs = /* @__PURE__ */ Object.create(null), args = ev.args || /* @__PURE__ */ Object.create(null);
            if (args.simulateError) toss("Throwing because of simulateError flag.");
            const rc = /* @__PURE__ */ Object.create(null);
            oargs.vfs = args.vfs;
            oargs.filename = args.filename || "";
            const db = wState.open(oargs);
            rc.filename = db.filename;
            rc.persistent = !!sqlite32.capi.sqlite3_js_db_uses_vfs(db.pointer, "opfs");
            rc.dbId = getDbId(db);
            rc.vfs = db.dbVfsName();
            return rc;
          },
          close: function(ev) {
            const db = getMsgDb(ev, false);
            const response = { filename: db && db.filename };
            if (db) {
              const doUnlink = ev.args && "object" === typeof ev.args ? !!ev.args.unlink : false;
              wState.close(db, doUnlink);
            }
            return response;
          },
          exec: function(ev) {
            const rc = "string" === typeof ev.args ? { sql: ev.args } : ev.args || /* @__PURE__ */ Object.create(null);
            if ("stmt" === rc.rowMode) toss("Invalid rowMode for 'exec': stmt mode", "does not work in the Worker API.");
            else if (!rc.sql) toss("'exec' requires input SQL.");
            const db = getMsgDb(ev);
            if (rc.callback || Array.isArray(rc.resultRows)) db._blobXfer = wState.xfer;
            const theCallback = rc.callback;
            let rowNumber = 0;
            const hadColNames = !!rc.columnNames;
            if ("string" === typeof theCallback) {
              if (!hadColNames) rc.columnNames = [];
              rc.callback = function(row, stmt) {
                wState.post({
                  type: theCallback,
                  columnNames: rc.columnNames,
                  rowNumber: ++rowNumber,
                  row
                }, wState.xfer);
              };
            }
            try {
              const changeCount = !!rc.countChanges ? db.changes(true, 64 === rc.countChanges) : void 0;
              db.exec(rc);
              if (void 0 !== changeCount) rc.changeCount = db.changes(true, 64 === rc.countChanges) - changeCount;
              const lastInsertRowId = !!rc.lastInsertRowId ? sqlite32.capi.sqlite3_last_insert_rowid(db) : void 0;
              if (void 0 !== lastInsertRowId) rc.lastInsertRowId = lastInsertRowId;
              if (rc.callback instanceof Function) {
                rc.callback = theCallback;
                wState.post({
                  type: theCallback,
                  columnNames: rc.columnNames,
                  rowNumber: null,
                  row: void 0
                });
              }
            } finally {
              delete db._blobXfer;
              if (rc.callback) rc.callback = theCallback;
            }
            return rc;
          },
          "config-get": function() {
            const rc = /* @__PURE__ */ Object.create(null), src = sqlite32.config;
            ["bigIntEnabled"].forEach(function(k2) {
              if (Object.getOwnPropertyDescriptor(src, k2)) rc[k2] = src[k2];
            });
            rc.version = sqlite32.version;
            rc.vfsList = sqlite32.capi.sqlite3_js_vfs_list();
            return rc;
          },
          /**
          Exports the database to a byte array, as per
          sqlite3_serialize(). Response is an object:
          
          {
          byteArray:  Uint8Array (db file contents),
          filename: the current db filename,
          mimetype: 'application/x-sqlite3'
          }
          */
          export: function(ev) {
            const db = getMsgDb(ev);
            const response = {
              byteArray: sqlite32.capi.sqlite3_js_db_export(db.pointer),
              filename: db.filename,
              mimetype: "application/x-sqlite3"
            };
            wState.xfer.push(response.byteArray.buffer);
            return response;
          },
          toss: function(ev) {
            toss("Testing worker exception");
          }
        };
        globalThis.onmessage = async function(ev) {
          ev = ev.data;
          let result, dbId = ev.dbId, evType = ev.type;
          const arrivalTime = performance.now();
          try {
            if (wMsgHandler.hasOwnProperty(evType) && wMsgHandler[evType] instanceof Function) result = await wMsgHandler[evType](ev);
            else toss("Unknown db worker message type:", ev.type);
          } catch (err3) {
            evType = "error";
            result = {
              operation: ev.type,
              message: err3.message,
              errorClass: err3.name,
              input: ev
            };
            if (err3.stack) result.stack = "string" === typeof err3.stack ? err3.stack.split(/\n\s*/) : err3.stack;
          }
          if (!dbId) dbId = result.dbId || getDefaultDbId();
          wState.post({
            type: evType,
            dbId,
            messageId: ev.messageId,
            workerReceivedTime: arrivalTime,
            workerRespondTime: performance.now(),
            departureTime: ev.departureTime,
            result
          }, wState.xfer);
        };
        globalThis.postMessage({
          type: "sqlite3-api",
          result: "worker1-ready"
        });
      }.bind({ sqlite3 });
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      const wasm3 = sqlite3.wasm, capi = sqlite3.capi, toss = sqlite3.util.toss3;
      const vfs = /* @__PURE__ */ Object.create(null);
      sqlite3.vfs = vfs;
      capi.sqlite3_vfs.prototype.registerVfs = function(asDefault = false) {
        if (!(this instanceof sqlite3.capi.sqlite3_vfs)) toss("Expecting a sqlite3_vfs-type argument.");
        const rc = capi.sqlite3_vfs_register(this, asDefault ? 1 : 0);
        if (rc) toss("sqlite3_vfs_register(", this, ") failed with rc", rc);
        if (this.pointer !== capi.sqlite3_vfs_find(this.$zName)) toss("BUG: sqlite3_vfs_find(vfs.$zName) failed for just-installed VFS", this);
        return this;
      };
      vfs.installVfs = function(opt) {
        let count = 0;
        const propList = ["io", "vfs"];
        for (const key of propList) {
          const o2 = opt[key];
          if (o2) {
            ++count;
            o2.struct.installMethods(o2.methods, !!o2.applyArgcCheck);
            if ("vfs" === key) {
              if (!o2.struct.$zName && "string" === typeof o2.name) o2.struct.addOnDispose(o2.struct.$zName = wasm3.allocCString(o2.name));
              o2.struct.registerVfs(!!o2.asDefault);
            }
          }
        }
        if (!count) toss("Misuse: installVfs() options object requires at least", "one of:", propList);
        return this;
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      if (!sqlite3.wasm.exports.sqlite3_declare_vtab) return;
      const wasm3 = sqlite3.wasm, capi = sqlite3.capi, toss = sqlite3.util.toss3;
      const vtab = /* @__PURE__ */ Object.create(null);
      sqlite3.vtab = vtab;
      const sii = capi.sqlite3_index_info;
      sii.prototype.nthConstraint = function(n3, asPtr = false) {
        if (n3 < 0 || n3 >= this.$nConstraint) return false;
        const ptr = wasm3.ptr.add(this.$aConstraint, sii.sqlite3_index_constraint.structInfo.sizeof * n3);
        return asPtr ? ptr : new sii.sqlite3_index_constraint(ptr);
      };
      sii.prototype.nthConstraintUsage = function(n3, asPtr = false) {
        if (n3 < 0 || n3 >= this.$nConstraint) return false;
        const ptr = wasm3.ptr.add(this.$aConstraintUsage, sii.sqlite3_index_constraint_usage.structInfo.sizeof * n3);
        return asPtr ? ptr : new sii.sqlite3_index_constraint_usage(ptr);
      };
      sii.prototype.nthOrderBy = function(n3, asPtr = false) {
        if (n3 < 0 || n3 >= this.$nOrderBy) return false;
        const ptr = wasm3.ptr.add(this.$aOrderBy, sii.sqlite3_index_orderby.structInfo.sizeof * n3);
        return asPtr ? ptr : new sii.sqlite3_index_orderby(ptr);
      };
      const __xWrapFactory = function(methodName, StructType) {
        return function(ptr, removeMapping = false) {
          if (0 === arguments.length) ptr = new StructType();
          if (ptr instanceof StructType) {
            this.set(ptr.pointer, ptr);
            return ptr;
          } else if (!wasm3.isPtr(ptr)) sqlite3.SQLite3Error.toss("Invalid argument to", methodName + "()");
          let rc = this.get(ptr);
          if (removeMapping) this.delete(ptr);
          return rc;
        }.bind(/* @__PURE__ */ new Map());
      };
      const StructPtrMapper = function(name, StructType) {
        const __xWrap = __xWrapFactory(name, StructType);
        return Object.assign(/* @__PURE__ */ Object.create(null), {
          /** The StructType object for this object's API. */
          StructType,
          /**
          Creates a new StructType object, writes its `pointer`
          value to the given output pointer, and returns that
          object. Its intended usage depends on StructType:
          
          sqlite3_vtab: to be called from sqlite3_module::xConnect()
          or xCreate() implementations.
          
          sqlite3_vtab_cursor: to be called from xOpen().
          
          This will throw if allocation of the StructType instance
          fails or if ppOut is not a pointer-type value.
          */
          create: (ppOut) => {
            const rc = __xWrap();
            wasm3.pokePtr(ppOut, rc.pointer);
            return rc;
          },
          /**
          Returns the StructType object previously mapped to the
          given pointer using create(). Its intended usage depends
          on StructType:
          
          sqlite3_vtab: to be called from sqlite3_module methods which
          take a (sqlite3_vtab*) pointer _except_ for
          xDestroy()/xDisconnect(), which should use unget() or dispose().
          
          sqlite3_vtab_cursor: to be called from any sqlite3_module methods
          which take a `sqlite3_vtab_cursor*` argument except xClose(),
          which should use unget() or dispose().
          
          Rule to remember: _never_ call dispose() on an instance
          returned by this function.
          */
          get: (pCObj) => __xWrap(pCObj),
          /**
          Identical to get() but also disconnects the mapping between the
          given pointer and the returned StructType object, such that
          future calls to this function or get() with the same pointer
          will return the undefined value. Its intended usage depends
          on StructType:
          
          sqlite3_vtab: to be called from sqlite3_module::xDisconnect() or
          xDestroy() implementations or in error handling of a failed
          xCreate() or xConnect().
          
          sqlite3_vtab_cursor: to be called from xClose() or during
          cleanup in a failed xOpen().
          
          Calling this method obligates the caller to call dispose() on
          the returned object when they're done with it.
          */
          unget: (pCObj) => __xWrap(pCObj, true),
          /**
          Works like unget() plus it calls dispose() on the
          StructType object.
          */
          dispose: (pCObj) => __xWrap(pCObj, true)?.dispose?.()
        });
      };
      vtab.xVtab = StructPtrMapper("xVtab", capi.sqlite3_vtab);
      vtab.xCursor = StructPtrMapper("xCursor", capi.sqlite3_vtab_cursor);
      vtab.xIndexInfo = (pIdxInfo) => new capi.sqlite3_index_info(pIdxInfo);
      vtab.xError = function f2(methodName, err3, defaultRc) {
        if (f2.errorReporter instanceof Function) try {
          f2.errorReporter("sqlite3_module::" + methodName + "(): " + err3.message);
        } catch (e4) {
        }
        let rc;
        if (err3 instanceof sqlite3.WasmAllocError) rc = capi.SQLITE_NOMEM;
        else if (arguments.length > 2) rc = defaultRc;
        else if (err3 instanceof sqlite3.SQLite3Error) rc = err3.resultCode;
        return rc || capi.SQLITE_ERROR;
      };
      vtab.xError.errorReporter = sqlite3.config.error.bind(sqlite3.config);
      vtab.xRowid = (ppRowid64, value) => wasm3.poke(ppRowid64, value, "i64");
      vtab.setupModule = function(opt) {
        let createdMod = false;
        const mod = this instanceof capi.sqlite3_module ? this : opt.struct || (createdMod = new capi.sqlite3_module());
        try {
          const methods = opt.methods || toss("Missing 'methods' object.");
          for (const e4 of Object.entries({
            xConnect: "xCreate",
            xDisconnect: "xDestroy"
          })) {
            const k2 = e4[0], v2 = e4[1];
            if (true === methods[k2]) methods[k2] = methods[v2];
            else if (true === methods[v2]) methods[v2] = methods[k2];
          }
          if (opt.catchExceptions) {
            const fwrap = function(methodName, func) {
              if (["xConnect", "xCreate"].indexOf(methodName) >= 0) return function(pDb2, pAux, argc, argv, ppVtab, pzErr) {
                try {
                  return func(...arguments) || 0;
                } catch (e4) {
                  if (!(e4 instanceof sqlite3.WasmAllocError)) {
                    wasm3.dealloc(wasm3.peekPtr(pzErr));
                    wasm3.pokePtr(pzErr, wasm3.allocCString(e4.message));
                  }
                  return vtab.xError(methodName, e4);
                }
              };
              else return function(...args) {
                try {
                  return func(...args) || 0;
                } catch (e4) {
                  return vtab.xError(methodName, e4);
                }
              };
            };
            const mnames = [
              "xCreate",
              "xConnect",
              "xBestIndex",
              "xDisconnect",
              "xDestroy",
              "xOpen",
              "xClose",
              "xFilter",
              "xNext",
              "xEof",
              "xColumn",
              "xRowid",
              "xUpdate",
              "xBegin",
              "xSync",
              "xCommit",
              "xRollback",
              "xFindFunction",
              "xRename",
              "xSavepoint",
              "xRelease",
              "xRollbackTo",
              "xShadowName"
            ];
            const remethods = /* @__PURE__ */ Object.create(null);
            for (const k2 of mnames) {
              const m = methods[k2];
              if (!(m instanceof Function)) continue;
              else if ("xConnect" === k2 && methods.xCreate === m) remethods[k2] = methods.xCreate;
              else if ("xCreate" === k2 && methods.xConnect === m) remethods[k2] = methods.xConnect;
              else remethods[k2] = fwrap(k2, m);
            }
            mod.installMethods(remethods, false);
          } else mod.installMethods(methods, !!opt.applyArgcCheck);
          if (0 === mod.$iVersion) {
            let v2;
            if ("number" === typeof opt.iVersion) v2 = opt.iVersion;
            else if (mod.$xIntegrity) v2 = 4;
            else if (mod.$xShadowName) v2 = 3;
            else if (mod.$xSavePoint || mod.$xRelease || mod.$xRollbackTo) v2 = 2;
            else v2 = 1;
            mod.$iVersion = v2;
          }
        } catch (e4) {
          if (createdMod) createdMod.dispose();
          throw e4;
        }
        return mod;
      };
      capi.sqlite3_module.prototype.setupModule = function(opt) {
        return vtab.setupModule.call(this, opt);
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      if (sqlite3.config.disable?.vfs?.kvvfs) return;
      const capi = sqlite3.capi, sqlite3_kvvfs_methods = capi.sqlite3_kvvfs_methods, KVVfsFile = capi.KVVfsFile, pKvvfs = sqlite3.capi.sqlite3_vfs_find("kvvfs");
      delete capi.sqlite3_kvvfs_methods;
      delete capi.KVVfsFile;
      if (!pKvvfs) return;
      const util = sqlite3.util, wasm3 = sqlite3.wasm, toss3 = util.toss3;
      const kvvfsMethods = new sqlite3_kvvfs_methods(wasm3.exports.sqlite3__wasm_kvvfs_methods());
      util.assert(32 <= kvvfsMethods.$nKeySize, "unexpected kvvfsMethods.$nKeySize: " + kvvfsMethods.$nKeySize);
      const cache = Object.assign(/* @__PURE__ */ Object.create(null), {
        /** Regex matching journal file names. */
        rxJournalSuffix: /-journal$/,
        /** Frequently-used C-string. */
        zKeyJrnl: wasm3.allocCString("jrnl"),
        /** Frequently-used C-string. */
        zKeySz: wasm3.allocCString("sz"),
        /**
        The maximum size of a kvvfs record key. It is historically only
        32, a limitation currently retained only because it's convenient to
        do so (the underlying code has outgrown the need for the artifically
        low limit).
        
        We cache this value here because the end of this init code will
        dispose of kvvfsMethods, invalidating it.
        */
        keySize: kvvfsMethods.$nKeySize,
        /**
        WASM heap memory buffers to optimize out some frequent
        allocations.
        */
        buffer: Object.assign(/* @__PURE__ */ Object.create(null), {
          /**
          The size of each buffer in this.pool.
          
          kvvfsMethods.$nBufferSize is slightly larger than the output
          space needed for a kvvfs-encoded 64kb db page in a worse-cast
          encoding (128kb). It is not suitable for arbitrary buffer
          use, only page de/encoding.
          */
          n: kvvfsMethods.$nBufferSize,
          /**
          Map of buffer ids to wasm.alloc()'d pointers of size
          this.n. (Re)used by various internals.
          
          Buffer ids 0 and 1 are used in the API internals.  Other
          names are used in higher-level APIs.
          
          See memBuffer() and memBufferFree().
          */
          pool: /* @__PURE__ */ Object.create(null)
        })
      });
      cache.memBuffer = (id = 0) => cache.buffer.pool[id] ??= wasm3.alloc(cache.buffer.n);
      cache.memBufferFree = (id) => {
        const b2 = cache.buffer.pool[id];
        if (b2) {
          wasm3.dealloc(b2);
          delete cache.buffer.pool[id];
        }
      };
      const noop = () => {
      };
      const debug = sqlite3.__isUnderTest ? (...args) => sqlite3.config.debug?.("kvvfs:", ...args) : noop;
      const warn = (...args) => sqlite3.config.warn?.("kvvfs:", ...args);
      const error = (...args) => sqlite3.config.error?.("kvvfs:", ...args);
      class KVVfsStorage {
        #map = /* @__PURE__ */ Object.create(null);
        #keys = null;
        #size = 0;
        constructor() {
          this.clear();
        }
        #getKeys() {
          return this.#keys ??= Object.keys(this.#map);
        }
        key(n3) {
          if (n3 < 0 || n3 >= this.#size) return null;
          return this.#getKeys()[n3];
        }
        getItem(k2) {
          return this.#map[k2] ?? null;
        }
        setItem(k2, v2) {
          if (!(k2 in this.#map)) {
            ++this.#size;
            this.#keys = null;
          }
          this.#map[k2] = "" + v2;
        }
        removeItem(k2) {
          if (k2 in this.#map) {
            delete this.#map[k2];
            --this.#size;
            this.#keys = null;
          }
        }
        clear() {
          this.#map = /* @__PURE__ */ Object.create(null);
          this.#keys = null;
          this.#size = 0;
        }
        get length() {
          return this.#size;
        }
      }
      const kvvfsIsPersistentName = (v2) => "local" === v2 || "session" === v2;
      const kvvfsKeyPrefix = (v2) => kvvfsIsPersistentName(v2) ? "kvvfs-" + v2 + "-" : "";
      const validateStorageName = function(n3, mayBeJournal = false) {
        if (kvvfsIsPersistentName(n3)) return;
        const len = new Blob([n3]).size;
        if (!len) toss3(capi.SQLITE_MISUSE, "Empty name is not permitted.");
        let maxLen = cache.keySize - 1;
        if (cache.rxJournalSuffix.test(n3)) {
          if (!mayBeJournal) toss3(capi.SQLITE_MISUSE, "Storage names may not have a '-journal' suffix.");
        } else if (["-wal", "-shm"].filter((v2) => n3.endsWith(v2)).length) toss3(capi.SQLITE_MISUSE, "Storage names may not have a -wal or -shm suffix.");
        else maxLen -= 8;
        if (len > maxLen) toss3(capi.SQLITE_RANGE, "Storage name is too long. Limit =", maxLen);
        let i = 0;
        for (; i < len; ++i) {
          const ch = n3.codePointAt(i);
          if (ch < 32) toss3(capi.SQLITE_RANGE, "Illegal character (" + ch + "d) in storage name:", n3);
        }
      };
      const newStorageObj = (name, storage = void 0) => Object.assign(/* @__PURE__ */ Object.create(null), {
        /**
        JS string value of this KVVfsFile::$zClass. i.e. the storage's
        name.
        */
        jzClass: name,
        /**
        Refcount. This keeps dbs and journals pointing to the same
        storage for the life of both and enables kvvfs to behave more
        like a conventional filesystem (a stepping stone towards
        downstream API goals). Managed by xOpen() and xClose().
        */
        refc: 1,
        /**
        If true, this storage will be removed by xClose() or
        sqlite3_js_kvvfs_unlink() when refc reaches 0. The others will
        persist when refc==0, to give the illusion of real back-end
        storage. Managed by xOpen() and sqlite3_js_kvvfs_reserve(). By
        default this is false but the delete-on-close=1 flag can be
        used to set this to true.
        */
        deleteAtRefc0: false,
        /**
        The backing store. Must implement the Storage interface.
        */
        storage: storage || new KVVfsStorage(),
        /**
        The storage prefix used for kvvfs keys.  It is
        "kvvfs-STORAGENAME-" for local/session storage and an empty
        string for other storage. local/session storage must use the
        long form (A) for backwards compatibility and (B) so that kvvfs
        can coexist with non-db client data in those backends.  Neither
        (A) nor (B) are concerns for KVVfsStorage objects.
        
        This prefix mirrors the one generated by os_kv.c's
        kvrecordMakeKey() and must stay in sync with that one.
        */
        keyPrefix: kvvfsKeyPrefix(name),
        /**
        KVVfsFile instances currently using this storage. Managed by
        xOpen() and xClose().
        */
        files: [],
        /**
        If set, it's an array of objects with various event
        callbacks. See sqlite3_js_kvvfs_listen(). When there are no
        listeners, this member is set to undefined (instead of an empty
        array) to allow us to more easily optimize out calls to
        notifyListeners() for the common case of no listeners.
        */
        listeners: void 0
      });
      const kvvfs = sqlite3.kvvfs = /* @__PURE__ */ Object.create(null);
      if (sqlite3.__isUnderTest) kvvfs.log = Object.assign(/* @__PURE__ */ Object.create(null), {
        xOpen: false,
        xClose: false,
        xWrite: false,
        xRead: false,
        xSync: false,
        xAccess: false,
        xFileControl: false,
        xRcrdRead: false,
        xRcrdWrite: false,
        xRcrdDelete: false
      });
      const deleteStorage = function(store) {
        const other = cache.rxJournalSuffix.test(store.jzClass) ? store.jzClass.replace(cache.rxJournalSuffix, "") : store.jzClass + "-journal";
        kvvfs?.log?.xClose && debug("cleaning up storage handles [", store.jzClass, other, "]", store);
        delete cache.storagePool[store.jzClass];
        delete cache.storagePool[other];
        if (!sqlite3.__isUnderTest) {
          delete store.storage;
          delete store.refc;
        }
      };
      const installStorageAndJournal = (store) => cache.storagePool[store.jzClass] = cache.storagePool[store.jzClass + "-journal"] = store;
      const nameOfThisThreadStorage = ".";
      cache.storagePool = Object.assign(/* @__PURE__ */ Object.create(null), { [nameOfThisThreadStorage]: newStorageObj(nameOfThisThreadStorage) });
      if (globalThis.Storage) {
        if (globalThis.localStorage instanceof globalThis.Storage) cache.storagePool.local = newStorageObj("local", globalThis.localStorage);
        if (globalThis.sessionStorage instanceof globalThis.Storage) cache.storagePool.session = newStorageObj("session", globalThis.sessionStorage);
      }
      cache.builtinStorageNames = Object.keys(cache.storagePool);
      const isBuiltinName = (n3) => cache.builtinStorageNames.indexOf(n3) > -1;
      for (const k2 of Object.keys(cache.storagePool)) {
        const orig = cache.storagePool[k2];
        cache.storagePool[k2 + "-journal"] = orig;
      }
      cache.setError = (e4 = void 0, dfltErrCode = capi.SQLITE_ERROR) => {
        if (e4) {
          cache.lastError = e4;
          return e4.resultCode | 0 || dfltErrCode;
        }
        delete cache.lastError;
        return 0;
      };
      cache.popError = () => {
        const e4 = cache.lastError;
        delete cache.lastError;
        return e4;
      };
      const catchForNotify = (e4) => {
        warn("kvvfs.listener handler threw:", e4);
      };
      const kvvfsDecode = wasm3.exports.sqlite3__wasm_kvvfs_decode;
      const kvvfsEncode = wasm3.exports.sqlite3__wasm_kvvfs_encode;
      const notifyListeners = async function(eventName, store, ...args) {
        try {
          if (store.keyPrefix && args[0]) args[0] = args[0].replace(store.keyPrefix, "");
          let u8enc, z0, z1, wcache;
          for (const ear of store.listeners) {
            const ev = /* @__PURE__ */ Object.create(null);
            ev.storageName = store.jzClass;
            ev.type = eventName;
            ear.decodePages;
            const f2 = ear.events[eventName];
            if (f2) {
              if (!ear.includeJournal && args[0] === "jrnl") continue;
              if ("write" === eventName && ear.decodePages && +args[0] > 0) {
                ev.data = [args[0]];
                if (wcache?.[args[0]]) {
                  ev.data[1] = wcache[args[0]];
                  continue;
                }
                u8enc ??= new TextEncoder("utf-8");
                z0 ??= cache.memBuffer(10);
                z1 ??= cache.memBuffer(11);
                const u = u8enc.encode(args[1]);
                const heap = wasm3.heap8u();
                heap.set(u, Number(z0));
                heap[wasm3.ptr.addn(z0, u.length)] = 0;
                const rc = kvvfsDecode(z0, z1, cache.buffer.n);
                if (rc > 0) {
                  wcache ??= /* @__PURE__ */ Object.create(null);
                  wcache[args[0]] = ev.data[1] = heap.slice(Number(z1), wasm3.ptr.addn(z1, rc));
                } else continue;
              } else ev.data = args.length ? args.length === 1 ? args[0] : args : void 0;
              try {
                f2(ev)?.catch?.(catchForNotify);
              } catch (e4) {
                warn("notifyListeners [", store.jzClass, "]", eventName, e4);
              }
            }
          }
        } catch (e4) {
          catchForNotify(e4);
        }
      };
      const storageForZClass = (zClass) => "string" === typeof zClass ? cache.storagePool[zClass] : cache.storagePool[wasm3.cstrToJs(zClass)];
      const kvvfsMakeKey = wasm3.exports.sqlite3__wasm_kvvfsMakeKey;
      const zKeyForStorage = (store, zClass, zKey) => {
        return zClass && store.keyPrefix ? kvvfsMakeKey(zClass, zKey) : zKey;
      };
      const jsKeyForStorage = (store, zClass, zKey) => wasm3.cstrToJs(zKeyForStorage(store, zClass, zKey));
      const storageGetDbSize = (store) => +store.storage.getItem(store.keyPrefix + "sz");
      const pFileHandles = /* @__PURE__ */ new Map();
      const mapPathToLocks = /* @__PURE__ */ new Map();
      const unlockFile = function(fh, lockType) {
        if (fh.lockType <= lockType) return;
        const lk = mapPathToLocks.get(fh.jzClass);
        if (fh.lockType > capi.SQLITE_LOCK_SHARED) lk.lockType = capi.SQLITE_LOCK_SHARED;
        if (lockType === capi.SQLITE_LOCK_NONE && 0 === --lk.nShared) mapPathToLocks.delete(fh.jzClass);
        fh.lockType = lockType;
      };
      const originalMethods = {
        vfs: /* @__PURE__ */ Object.create(null),
        ioDb: /* @__PURE__ */ Object.create(null),
        ioJrnl: /* @__PURE__ */ Object.create(null)
      };
      const pVfs = new capi.sqlite3_vfs(kvvfsMethods.$pVfs);
      const pIoDb = new capi.sqlite3_io_methods(kvvfsMethods.$pIoDb);
      const pIoJrnl = new capi.sqlite3_io_methods(kvvfsMethods.$pIoJrnl);
      const recordHandler = /* @__PURE__ */ Object.create(null);
      const kvvfsInternal = Object.assign(/* @__PURE__ */ Object.create(null), {
        pFileHandles,
        cache,
        storageForZClass,
        KVVfsStorage,
        /**
        BUG: changing to a page size other than the default,
        then vacuuming, corrupts the db. As a workaround,
        until this is resolved, we forcibly disable
        (pragma page_size=...) changes.
        */
        disablePageSizeChange: true
      });
      if (kvvfs.log) kvvfs.internal = kvvfsInternal;
      const methodOverrides = {
        /**
        sqlite3_kvvfs_methods's member methods.  These perform the
        fetching, setting, and removal of storage keys on behalf of
        kvvfs. In the native impl these write each db page to a
        separate file. This impl stores each db page as a single
        record in a Storage object which is mapped to zClass.
        
        A db's size is stored in a record named kvvfs[-storagename]-sz
        and the journal is stored in kvvfs[-storagename]-jrnl. The
        [-storagename] part is a remnant of the native impl (so that
        it has unique filenames per db) and is only used for
        localStorage and sessionStorage. We elide that part (to save
        space) from other storage objects but retain it on those two
        to avoid invalidating pre-version-2 session/localStorage dbs.
        
        The interface docs for these methods are in src/os_kv.c's
        kvrecordRead(), kvrecordWrite(), and kvrecordDelete().
        */
        recordHandler: {
          xRcrdRead: (zClass, zKey, zBuf, nBuf) => {
            try {
              const jzClass = wasm3.cstrToJs(zClass);
              const store = storageForZClass(jzClass);
              if (!store) return -1;
              const jXKey = jsKeyForStorage(store, zClass, zKey);
              kvvfs?.log?.xRcrdRead && warn("xRcrdRead", jzClass, jXKey, nBuf, store);
              const jV = store.storage.getItem(jXKey);
              if (null === jV) return -1;
              const nV = jV.length;
              if (nBuf <= 0) return nV;
              else if (1 === nBuf) {
                wasm3.poke(zBuf, 0);
                return nV;
              } else if (nBuf < nV) toss3(capi.SQLITE_RANGE, "xRcrdRead()", jzClass, jXKey, "input buffer is too small: need", nV, "but have", nBuf);
              else if (nBuf > nV + 1) nBuf = nV + 1;
              const nCopy = nV < nBuf ? nV : nBuf - 1;
              const heap = wasm3.heap8();
              for (let i = 0; i < nCopy; ++i) heap[wasm3.ptr.add(zBuf, i)] = jV.codePointAt(i) & 255;
              heap[wasm3.ptr.add(zBuf, nCopy)] = 0;
              return nCopy;
            } catch (e4) {
              error("kvrecordRead()", e4);
              cache.setError(e4);
              return -2;
            }
          },
          xRcrdWrite: (zClass, zKey, zData) => {
            try {
              const store = storageForZClass(zClass);
              const jxKey = jsKeyForStorage(store, zClass, zKey);
              const jData = wasm3.cstrToJs(zData);
              kvvfs?.log?.xRcrdWrite && warn("xRcrdWrite", jxKey, store);
              store.storage.setItem(jxKey, jData);
              store.listeners && notifyListeners("write", store, jxKey, jData);
              return 0;
            } catch (e4) {
              error("kvrecordWrite()", e4);
              return cache.setError(e4, capi.SQLITE_IOERR);
            }
          },
          xRcrdDelete: (zClass, zKey) => {
            try {
              const store = storageForZClass(zClass);
              const jxKey = jsKeyForStorage(store, zClass, zKey);
              kvvfs?.log?.xRcrdDelete && warn("xRcrdDelete", jxKey, store);
              store.storage.removeItem(jxKey);
              store.listeners && notifyListeners("delete", store, jxKey);
              return 0;
            } catch (e4) {
              error("kvrecordDelete()", e4);
              return cache.setError(e4, capi.SQLITE_IOERR);
            }
          }
        },
        /**
        Override certain operations of the underlying sqlite3_vfs and
        the two sqlite3_io_methods instances so that we can tie
        Storage objects to db names.
        */
        vfs: {
          xOpen: function(pProtoVfs, zName, pProtoFile, flags, pOutFlags) {
            cache.popError();
            let zToFree;
            try {
              if (!zName) {
                zToFree = wasm3.allocCString("" + pProtoFile + "." + (Math.random() * 1e5 | 0));
                zName = zToFree;
              }
              const jzClass = wasm3.cstrToJs(zName);
              kvvfs?.log?.xOpen && debug("xOpen", jzClass, "flags =", flags);
              validateStorageName(jzClass, true);
              if (flags & (capi.SQLITE_OPEN_MAIN_DB | capi.SQLITE_OPEN_TEMP_DB | capi.SQLITE_OPEN_TRANSIENT_DB) && cache.rxJournalSuffix.test(jzClass)) toss3(capi.SQLITE_ERROR, "DB files may not have a '-journal' suffix.");
              let s2 = storageForZClass(jzClass);
              if (!s2 && !(flags & capi.SQLITE_OPEN_CREATE)) toss3(capi.SQLITE_ERROR, "Storage not found:", jzClass);
              const rc = originalMethods.vfs.xOpen(pProtoVfs, zName, pProtoFile, flags, pOutFlags);
              if (rc) return rc;
              let deleteAt0 = !!(capi.SQLITE_OPEN_DELETEONCLOSE & flags);
              if (wasm3.isPtr(arguments[1])) {
                if (capi.sqlite3_uri_boolean(zName, "delete-on-close", 0)) deleteAt0 = true;
              }
              const f2 = new KVVfsFile(pProtoFile);
              util.assert(f2.$zClass, "Missing f.$zClass");
              f2.addOnDispose(zToFree);
              zToFree = void 0;
              if (s2) {
                ++s2.refc;
                s2.files.push(f2);
                wasm3.poke32(pOutFlags, flags);
              } else {
                wasm3.poke32(pOutFlags, flags | capi.SQLITE_OPEN_CREATE);
                util.assert(!f2.$isJournal, "Opening a journal before its db? " + jzClass);
                const nm = jzClass.replace(cache.rxJournalSuffix, "");
                s2 = newStorageObj(nm);
                installStorageAndJournal(s2);
                s2.files.push(f2);
                s2.deleteAtRefc0 = deleteAt0;
                kvvfs?.log?.xOpen && debug("xOpen installed storage handle [", nm, nm + "-journal", "]", s2);
              }
              pFileHandles.set(pProtoFile, Object.assign(/* @__PURE__ */ Object.create(null), {
                store: s2,
                file: f2,
                jzClass,
                lockType: 0
              }));
              s2.listeners && notifyListeners("open", s2, s2.files.length);
              return 0;
            } catch (e4) {
              warn("xOpen:", e4);
              return cache.setError(e4);
            } finally {
              zToFree && wasm3.dealloc(zToFree);
            }
          },
          xDelete: function(pVfs2, zName, iSyncFlag) {
            cache.popError();
            try {
              const jzName = wasm3.cstrToJs(zName);
              if (cache.rxJournalSuffix.test(jzName)) recordHandler.xRcrdDelete(zName, cache.zKeyJrnl);
              return 0;
            } catch (e4) {
              warn("xDelete", e4);
              return cache.setError(e4);
            }
          },
          xAccess: function(pProtoVfs, zPath, flags, pResOut) {
            cache.popError();
            try {
              const s2 = storageForZClass(zPath);
              const jzPath = s2?.jzClass || wasm3.cstrToJs(zPath);
              if (kvvfs?.log?.xAccess) debug("xAccess", jzPath, "flags =", flags, "*pResOut =", wasm3.peek32(pResOut), "store =", s2);
              if (!s2)
                try {
                  validateStorageName(jzPath);
                } catch (e4) {
                  wasm3.poke32(pResOut, 0);
                  return 0;
                }
              if (s2) {
                const key = s2.keyPrefix + (cache.rxJournalSuffix.test(jzPath) ? "jrnl" : "1");
                const res = s2.storage.getItem(key) ? 0 : 1;
                wasm3.poke32(pResOut, res);
              } else wasm3.poke32(pResOut, 0);
              return 0;
            } catch (e4) {
              error("xAccess", e4);
              return cache.setError(e4);
            }
          },
          xRandomness: function(pVfs2, nOut, pOut) {
            const heap = wasm3.heap8u();
            let i = 0;
            const npOut = Number(pOut);
            for (; i < nOut; ++i) heap[npOut + i] = Math.random() * 255e3 & 255;
            return nOut;
          },
          xGetLastError: function(pVfs2, nOut, pOut) {
            const e4 = cache.popError();
            debug("xGetLastError", e4);
            if (e4) {
              const scope = wasm3.scopedAllocPush();
              try {
                const [cMsg, n3] = wasm3.scopedAllocCString(e4.message, true);
                wasm3.cstrncpy(pOut, cMsg, nOut);
                if (n3 > nOut) wasm3.poke8(wasm3.ptr.add(pOut, nOut, -1), 0);
                debug("set xGetLastError", e4.message);
                return e4.resultCode | 0 || capi.SQLITE_IOERR;
              } catch (e5) {
                return capi.SQLITE_NOMEM;
              } finally {
                wasm3.scopedAllocPop(scope);
              }
            }
            return 0;
          },
          /**
          This VFS's xSleep() must be a no-op. In this environment,
          only db handles within the same thread can ever come into
          contention, and that contention cannot be resolved if
          one of the handles sleeps in that same thread.
          See also: forum:3f0794c5d8
          */
          xSleep: (pVfs2, ms) => 0
        },
        /**
        kvvfs has separate sqlite3_api_methods impls for some of the
        methods depending on whether it's a db or journal file. Some
        of the methods use shared impls but others are specific to
        either db or journal files.
        */
        ioDb: {
          xClose: function(pFile) {
            cache.popError();
            try {
              const h = pFileHandles.get(pFile);
              kvvfs?.log?.xClose && debug("xClose", pFile, h);
              if (h) {
                pFileHandles.delete(pFile);
                unlockFile(h, capi.SQLITE_LOCK_NONE);
                const s2 = h.store;
                s2.files = s2.files.filter((v2) => v2 !== h.file);
                if (--s2.refc <= 0 && s2.deleteAtRefc0) deleteStorage(s2);
                originalMethods.ioDb.xClose(pFile);
                h.file.dispose();
                s2.listeners && notifyListeners("close", s2, s2.files.length);
              }
              return 0;
            } catch (e4) {
              error("xClose", e4);
              return cache.setError(e4);
            }
          },
          xFileControl: function(pFile, opId, pArg) {
            cache.popError();
            try {
              const h = pFileHandles.get(pFile);
              util.assert(h, "Missing KVVfsFile handle");
              kvvfs?.log?.xFileControl && debug("xFileControl", h, "op =", opId);
              if (opId === capi.SQLITE_FCNTL_PRAGMA && kvvfsInternal.disablePageSizeChange) {
                const zName = wasm3.peekPtr(wasm3.ptr.add(pArg, wasm3.ptr.size));
                if ("page_size" === wasm3.cstrToJs(zName)) {
                  kvvfs?.log?.xFileControl && debug("xFileControl pragma", wasm3.cstrToJs(zName));
                  const zVal = wasm3.peekPtr(wasm3.ptr.add(pArg, 2 * wasm3.ptr.size));
                  if (zVal) {
                    kvvfs?.log?.xFileControl && warn("xFileControl pragma", h, "NOT setting page size to", wasm3.cstrToJs(zVal));
                    h.file.$szPage = -1;
                    return 0;
                  } else if (h.file.$szPage > 0) {
                    kvvfs?.log?.xFileControl && warn("xFileControl", h, "getting page size", h.file.$szPage);
                    wasm3.pokePtr(pArg, wasm3.allocCString("" + h.file.$szPage));
                    return 0;
                  }
                }
              }
              const rc = originalMethods.ioDb.xFileControl(pFile, opId, pArg);
              if (0 == rc && capi.SQLITE_FCNTL_SYNC === opId) h.store.listeners && notifyListeners("sync", h.store, false);
              return rc;
            } catch (e4) {
              error("xFileControl", e4);
              return cache.setError(e4);
            }
          },
          xSync: function(pFile, flags) {
            cache.popError();
            try {
              const h = pFileHandles.get(pFile);
              kvvfs?.log?.xSync && debug("xSync", h);
              util.assert(h, "Missing KVVfsFile handle");
              const rc = originalMethods.ioDb.xSync(pFile, flags);
              if (0 == rc && h.store.listeners) notifyListeners("sync", h.store, true);
              return rc;
            } catch (e4) {
              error("xSync", e4);
              return cache.setError(e4);
            }
          },
          xLock: function(pFile, iLock) {
            cache.popError();
            try {
              const h = pFileHandles.get(pFile);
              if (capi.SQLITE_LOCK_NONE !== iLock) originalMethods.ioDb.xLock(pFile, iLock);
              if (h.lockType >= iLock) return 0;
              let lk = mapPathToLocks.get(h.jzClass);
              if (!lk) {
                lk = Object.assign(/* @__PURE__ */ Object.create(null), {
                  nShared: 0,
                  lockType: capi.SQLITE_LOCK_NONE
                });
                mapPathToLocks.set(h.jzClass, lk);
              }
              if (h.lockType !== lk.lockType && (lk.lockType >= capi.SQLITE_LOCK_PENDING || iLock > capi.SQLITE_LOCK_SHARED)) return capi.SQLITE_BUSY;
              if (iLock === capi.SQLITE_LOCK_SHARED) {
                ++lk.nShared;
                if (lk.lockType === capi.SQLITE_LOCK_NONE) lk.lockType = iLock;
              } else if (iLock === capi.SQLITE_LOCK_EXCLUSIVE && lk.nShared > 1) {
                if (h.lockType === capi.SQLITE_LOCK_RESERVED) h.lockType = lk.lockType = capi.SQLITE_LOCK_PENDING;
                return capi.SQLITE_BUSY;
              } else lk.lockType = iLock;
              h.lockType = iLock;
              return 0;
            } catch (e4) {
              error("xLock", e4);
              return cache.setError(e4);
            }
          },
          xUnlock: function(pFile, iLock) {
            cache.popError();
            try {
              if (capi.SQLITE_LOCK_NONE === iLock) originalMethods.ioDb.xUnlock(pFile, iLock);
              const h = pFileHandles.get(pFile);
              unlockFile(h, iLock);
              return 0;
            } catch (e4) {
              error("xUnlock", e4);
              return cache.setError(e4);
            }
          },
          xCheckReservedLock: function(pFile, pOut) {
            cache.popError();
            try {
              const h = pFileHandles.get(pFile);
              const lk = mapPathToLocks.get(h.jzClass);
              wasm3.poke32(pOut, !!lk && lk.lockType > capi.SQLITE_LOCK_SHARED ? 1 : 0);
              return 0;
            } catch (e4) {
              error("xCheckReservedLock", e4);
              return cache.setError(e4);
            }
          }
        },
        ioJrnl: {
          xClose: true,
          xLock: true,
          xUnlock: true,
          xCheckReservedLock: true
        }
      };
      try {
        util.assert(cache.buffer.n > 132096, "Heap buffer is not large enough");
        for (const e4 of Object.entries(methodOverrides.recordHandler)) {
          const k2 = e4[0], f2 = e4[1];
          recordHandler[k2] = f2;
          kvvfsMethods[kvvfsMethods.memberKey(k2)] = wasm3.installFunction(kvvfsMethods.memberSignature(k2), f2);
        }
        for (const e4 of Object.entries(methodOverrides.vfs)) {
          const k2 = e4[0], f2 = e4[1], km = pVfs.memberKey(k2), member = pVfs.structInfo.members[k2] || util.toss("Missing pVfs.structInfo[", k2, "]");
          originalMethods.vfs[k2] = wasm3.functionEntry(pVfs[km]);
          pVfs[km] = wasm3.installFunction(member.signature, f2);
        }
        for (const e4 of Object.entries(methodOverrides.ioDb)) {
          const k2 = e4[0], f2 = e4[1], km = pIoDb.memberKey(k2);
          originalMethods.ioDb[k2] = wasm3.functionEntry(pIoDb[km]) || util.toss("Missing native pIoDb[", km, "]");
          pIoDb[km] = wasm3.installFunction(pIoDb.memberSignature(k2), f2);
        }
        for (const e4 of Object.entries(methodOverrides.ioJrnl)) {
          const k2 = e4[0], f2 = e4[1], km = pIoJrnl.memberKey(k2);
          originalMethods.ioJrnl[k2] = wasm3.functionEntry(pIoJrnl[km]) || util.toss("Missing native pIoJrnl[", km, "]");
          if (true === f2) pIoJrnl[km] = pIoDb[km] || util.toss("Missing copied pIoDb[", km, "]");
          else pIoJrnl[km] = wasm3.installFunction(pIoJrnl.memberSignature(k2), f2);
        }
      } finally {
        kvvfsMethods.dispose();
        pVfs.dispose();
        pIoDb.dispose();
        pIoJrnl.dispose();
      }
      const sqlite3_js_kvvfs_clear = function callee3(which) {
        if ("" === which) return callee3("local") + callee3("session");
        const store = storageForZClass(which);
        if (!store) return 0;
        if (store.files.length) {
          if (globalThis.localStorage === store.storage || globalThis.sessionStorage === store.storage) {
          } else toss3(capi.SQLITE_ACCESS, "Cannot clear in-use database storage.");
        }
        const s2 = store.storage;
        const toRm = [];
        let i, n3 = s2.length;
        for (i = 0; i < n3; ++i) {
          const k2 = s2.key(i);
          if (!store.keyPrefix || k2.startsWith(store.keyPrefix)) toRm.push(k2);
        }
        toRm.forEach((kk) => s2.removeItem(kk));
        return toRm.length;
      };
      const sqlite3_js_kvvfs_size = function callee3(which) {
        if ("" === which) return callee3("local") + callee3("session");
        const store = storageForZClass(which);
        if (!store) return 0;
        const s2 = store.storage;
        let i, sz = 0;
        for (i = 0; i < s2.length; ++i) {
          const k2 = s2.key(i);
          if (!store.keyPrefix || k2.startsWith(store.keyPrefix)) {
            sz += k2.length;
            sz += s2.getItem(k2).length;
          }
        }
        return sz * 2;
      };
      const sqlite3_js_kvvfs_export = function callee3(...args) {
        let opt;
        if (1 === args.length && "object" === typeof args[0]) opt = args[0];
        else if (args.length) opt = Object.assign(/* @__PURE__ */ Object.create(null), { name: args[0] });
        const store = opt ? storageForZClass(opt.name) : null;
        if (!store) toss3(capi.SQLITE_NOTFOUND, "There is no kvvfs storage named", opt?.name);
        const s2 = store.storage;
        const rc = Object.assign(/* @__PURE__ */ Object.create(null), {
          name: store.jzClass,
          timestamp: Date.now(),
          pages: []
        });
        const pages = /* @__PURE__ */ Object.create(null);
        const keyPrefix = store.keyPrefix;
        const rxTail = keyPrefix ? /^kvvfs-[^-]+-(\w+)/ : void 0;
        let i = 0, n3 = s2.length;
        for (; i < n3; ++i) {
          const k2 = s2.key(i);
          if (!keyPrefix || k2.startsWith(keyPrefix)) {
            let kk = (keyPrefix ? rxTail.exec(k2) : void 0)?.[1] ?? k2;
            switch (kk) {
              case "jrnl":
                if (opt.includeJournal) rc.journal = s2.getItem(k2);
                break;
              case "sz":
                rc.size = +s2.getItem(k2);
                break;
              default:
                kk = +kk;
                if (!util.isInt32(kk) || kk <= 0) toss3(capi.SQLITE_RANGE, "Malformed kvvfs key: " + k2);
                if (opt.decodePages) {
                  const spg = s2.getItem(k2), n4 = spg.length, z = cache.memBuffer(0), zDec = cache.memBuffer(1), heap = wasm3.heap8u();
                  let i2 = 0;
                  for (; i2 < n4; ++i2) heap[wasm3.ptr.add(z, i2)] = spg.codePointAt(i2) & 255;
                  heap[wasm3.ptr.add(z, i2)] = 0;
                  const nDec = kvvfsDecode(z, zDec, cache.buffer.n);
                  pages[kk] = heap.slice(Number(zDec), wasm3.ptr.addn(zDec, nDec));
                } else pages[kk] = s2.getItem(k2);
            }
          }
        }
        if (opt.decodePages) cache.memBufferFree(1);
        Object.keys(pages).map((v2) => +v2).sort().forEach((v2) => rc.pages.push(pages[v2]));
        return rc;
      };
      const sqlite3_js_kvvfs_import = function(exp, overwrite = false) {
        if (!exp?.timestamp || !exp.name || void 0 === exp.size || !Array.isArray(exp.pages)) toss3(capi.SQLITE_MISUSE, "Malformed export object.");
        else if (!exp.size || exp.size !== (exp.size | 0) || exp.size >= 2147483647) toss3(capi.SQLITE_RANGE, "Invalid db size: " + exp.size);
        validateStorageName(exp.name);
        let store = storageForZClass(exp.name);
        const isNew = !store;
        if (store) {
          if (!overwrite) toss3(capi.SQLITE_ACCESS, "Storage '" + exp.name + "' already exists and", "overwrite was not specified.");
          else if (!store.files || !store.jzClass) toss3(capi.SQLITE_ERROR, "Internal storage object", exp.name, "seems to be malformed.");
          else if (store.files.length) toss3(capi.SQLITE_IOERR_ACCESS, "Cannot import db storage while it is in use.");
          sqlite3_js_kvvfs_clear(exp.name);
        } else store = newStorageObj(exp.name);
        const keyPrefix = kvvfsKeyPrefix(exp.name);
        let zEnc;
        try {
          const s2 = store.storage;
          s2.setItem(keyPrefix + "sz", exp.size);
          if (exp.journal) s2.setItem(keyPrefix + "jrnl", exp.journal);
          if (exp.pages[0] instanceof Uint8Array) exp.pages.forEach((u, ndx) => {
            const n3 = u.length;
            zEnc ??= cache.memBuffer(1);
            const zBin = cache.memBuffer(0), heap = wasm3.heap8u();
            heap.set(u, Number(zBin));
            heap[wasm3.ptr.addn(zBin, n3)] = 0;
            const rc = kvvfsEncode(zBin, n3, zEnc);
            util.assert(rc < cache.buffer.n, "Impossibly long output - possibly smashed the heap");
            util.assert(0 === wasm3.peek8(wasm3.ptr.add(zEnc, rc)), "Expecting NUL-terminated encoded output");
            const jenc = wasm3.cstrToJs(zEnc);
            s2.setItem(keyPrefix + (ndx + 1), jenc);
          });
          else if (exp.pages[0]) exp.pages.forEach((v2, ndx) => s2.setItem(keyPrefix + (ndx + 1), v2));
          if (isNew) installStorageAndJournal(store);
        } catch {
          if (!isNew) try {
            sqlite3_js_kvvfs_clear(exp.name);
          } catch (ee) {
          }
        } finally {
          if (zEnc) cache.memBufferFree(1);
        }
        return this;
      };
      const sqlite3_js_kvvfs_reserve = function(name) {
        let store = storageForZClass(name);
        if (store) {
          ++store.refc;
          return;
        }
        validateStorageName(name);
        installStorageAndJournal(newStorageObj(name));
      };
      const sqlite3_js_kvvfs_unlink = function(name) {
        const store = storageForZClass(name);
        if (!store || kvvfsIsPersistentName(store.jzClass) || isBuiltinName(store.jzClass) || cache.rxJournalSuffix.test(name)) return false;
        if (store.refc > store.files.length || 0 === store.files.length) {
          if (--store.refc <= 0) deleteStorage(store);
          return true;
        }
        return false;
      };
      const sqlite3_js_kvvfs_listen = function(opt) {
        if (!opt || "object" !== typeof opt) toss3(capi.SQLITE_MISUSE, "Expecting a listener object.");
        let store = storageForZClass(opt.storage);
        if (!store) {
          if (opt.storage && opt.reserve) {
            sqlite3_js_kvvfs_reserve(opt.storage);
            store = storageForZClass(opt.storage);
            util.assert(store, "Unexpectedly cannot fetch reserved storage " + opt.storage);
          } else toss3(capi.SQLITE_NOTFOUND, "No such storage:", opt.storage);
        }
        if (opt.events) (store.listeners ??= []).push(opt);
      };
      const sqlite3_js_kvvfs_unlisten = function(opt) {
        const store = storageForZClass(opt?.storage);
        if (store?.listeners && opt.events) {
          const n3 = store.listeners.length;
          store.listeners = store.listeners.filter((v2) => v2 !== opt);
          const rc = n3 > store.listeners.length;
          if (!store.listeners.length) store.listeners = void 0;
          return rc;
        }
        return false;
      };
      sqlite3.kvvfs.reserve = sqlite3_js_kvvfs_reserve;
      sqlite3.kvvfs.import = sqlite3_js_kvvfs_import;
      sqlite3.kvvfs.export = sqlite3_js_kvvfs_export;
      sqlite3.kvvfs.unlink = sqlite3_js_kvvfs_unlink;
      sqlite3.kvvfs.listen = sqlite3_js_kvvfs_listen;
      sqlite3.kvvfs.unlisten = sqlite3_js_kvvfs_unlisten;
      sqlite3.kvvfs.exists = (name) => !!storageForZClass(name);
      sqlite3.kvvfs.estimateSize = sqlite3_js_kvvfs_size;
      sqlite3.kvvfs.clear = sqlite3_js_kvvfs_clear;
      if (globalThis.Storage) {
        capi.sqlite3_js_kvvfs_size = (which = "") => sqlite3_js_kvvfs_size(which);
        capi.sqlite3_js_kvvfs_clear = (which = "") => sqlite3_js_kvvfs_clear(which);
      }
      if (sqlite3.oo1?.DB) {
        const DB = sqlite3.oo1.DB;
        sqlite3.oo1.JsStorageDb = function(storageName = sqlite3.oo1.JsStorageDb.defaultStorageName) {
          const opt = DB.dbCtorHelper.normalizeArgs(...arguments);
          opt.vfs = "kvvfs";
          switch (opt.filename) {
            case ":sessionStorage:":
              opt.filename = "session";
              break;
            case ":localStorage:":
              opt.filename = "local";
          }
          const m = /(file:(\/\/)?)([^?]+)/.exec(opt.filename);
          validateStorageName(m ? m[3] : opt.filename);
          DB.dbCtorHelper.call(this, opt);
        };
        sqlite3.oo1.JsStorageDb.defaultStorageName = cache.storagePool.session ? "session" : nameOfThisThreadStorage;
        const jdb = sqlite3.oo1.JsStorageDb;
        jdb.prototype = Object.create(DB.prototype);
        jdb.clearStorage = sqlite3_js_kvvfs_clear;
        jdb.prototype.clearStorage = function() {
          return jdb.clearStorage(this.affirmOpen().dbFilename(), true);
        };
        jdb.storageSize = sqlite3_js_kvvfs_size;
        jdb.prototype.storageSize = function() {
          return jdb.storageSize(this.affirmOpen().dbFilename(), true);
        };
      }
      if (sqlite3.__isUnderTest && sqlite3.vtab) {
        const cols = Object.assign(/* @__PURE__ */ Object.create(null), {
          rowid: { type: "INTEGER" },
          name: { type: "TEXT" },
          nRef: { type: "INTEGER" },
          nOpen: { type: "INTEGER" },
          isTransient: { type: "INTEGER" },
          dbSize: { type: "INTEGER" }
        });
        Object.keys(cols).forEach((v2, i) => cols[v2].colId = i);
        const VT = sqlite3.vtab;
        const ProtoCursor = Object.assign(/* @__PURE__ */ Object.create(null), { row: function() {
          return cache.storagePool[this.names[this.rowid]];
        } });
        Object.assign(Object.create(ProtoCursor), {
          rowid: 0,
          names: Object.keys(cache.storagePool).filter((v2) => !cache.rxJournalSuffix.test(v2))
        });
        const cursorState = function(cursor, reset) {
          const o2 = cursor instanceof capi.sqlite3_vtab_cursor ? cursor : VT.xCursor.get(cursor);
          if (reset || !o2.vTabState) o2.vTabState = Object.assign(Object.create(ProtoCursor), {
            rowid: 0,
            names: Object.keys(cache.storagePool).filter((v2) => !cache.rxJournalSuffix.test(v2))
          });
          return o2.vTabState;
        };
        const theModule = function f2() {
          return f2.mod ??= new sqlite3.capi.sqlite3_module().setupModule({
            catchExceptions: true,
            methods: {
              xConnect: function(pDb2, pAux, argc, argv, ppVtab, pzErr) {
                try {
                  const xcol = [];
                  Object.keys(cols).forEach((k2) => {
                    xcol.push(k2 + " " + cols[k2].type);
                  });
                  const rc = capi.sqlite3_declare_vtab(pDb2, "CREATE TABLE ignored(" + xcol.join(",") + ")");
                  if (0 === rc) {
                    const t4 = VT.xVtab.create(ppVtab);
                    util.assert(t4 === VT.xVtab.get(wasm3.peekPtr(ppVtab)), "output pointer check failed");
                  }
                  return rc;
                } catch (e4) {
                  return VT.xError("xConnect", e4, capi.SQLITE_ERROR);
                }
              },
              xCreate: wasm3.ptr.null,
              xDisconnect: function(pVtab) {
                VT.xVtab.dispose(pVtab);
                return 0;
              },
              xOpen: function(pVtab, ppCursor) {
                VT.xCursor.create(ppCursor);
                return 0;
              },
              xClose: function(pCursor) {
                const c = VT.xCursor.unget(pCursor);
                delete c.vTabState;
                c.dispose();
                return 0;
              },
              xNext: function(pCursor) {
                const c = VT.xCursor.get(pCursor);
                ++cursorState(c).rowid;
                return 0;
              },
              xColumn: function(pCursor, pCtx, iCol) {
                const st = cursorState(pCursor);
                const store = st.row();
                util.assert(store, "Unexpected xColumn call");
                switch (iCol) {
                  case cols.rowid.colId:
                    capi.sqlite3_result_int(pCtx, st.rowid);
                    break;
                  case cols.name.colId:
                    capi.sqlite3_result_text(pCtx, store.jzClass, -1, capi.SQLITE_TRANSIENT);
                    break;
                  case cols.nRef.colId:
                    capi.sqlite3_result_int(pCtx, store.refc);
                    break;
                  case cols.nOpen.colId:
                    capi.sqlite3_result_int(pCtx, store.files.length);
                    break;
                  case cols.isTransient.colId:
                    capi.sqlite3_result_int(pCtx, !!store.deleteAtRefc0);
                    break;
                  case cols.dbSize.colId:
                    capi.sqlite3_result_int(pCtx, storageGetDbSize(store));
                    break;
                  default:
                    capi.sqlite3_result_error(pCtx, "Invalid column id: " + iCol);
                    return capi.SQLITE_RANGE;
                }
                return 0;
              },
              xRowid: function(pCursor, ppRowid64) {
                const st = cursorState(pCursor);
                VT.xRowid(ppRowid64, st.rowid);
                return 0;
              },
              xEof: function(pCursor) {
                const st = cursorState(pCursor);
                "" + !st.row();
                return !st.row();
              },
              xFilter: function(pCursor, idxNum, idxCStr, argc, argv) {
                cursorState(pCursor, true);
                return 0;
              },
              xBestIndex: function(pVtab, pIdxInfo) {
                const pii = new capi.sqlite3_index_info(pIdxInfo);
                pii.$estimatedRows = cache.storagePool.size;
                pii.$estimatedCost = 1;
                pii.dispose();
                return 0;
              }
            }
          });
        };
        sqlite3.kvvfs.create_module = function(pDb2, name = "sqlite_kvvfs") {
          return capi.sqlite3_create_module(pDb2, name, theModule(), wasm3.ptr.null);
        };
      }
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      "use strict";
      if (sqlite3.config.disable?.vfs?.opfs && sqlite3.config.disable.vfs["opfs-vfs"]) return;
      const toss = sqlite3.util.toss;
      sqlite3.capi;
      const util = sqlite3.util;
      sqlite3.wasm;
      const opfsUtil = sqlite3.opfs = /* @__PURE__ */ Object.create(null);
      opfsUtil.thisThreadHasOPFS = () => {
        return globalThis.FileSystemHandle && globalThis.FileSystemDirectoryHandle && globalThis.FileSystemFileHandle && globalThis.FileSystemFileHandle.prototype.createSyncAccessHandle && navigator?.storage?.getDirectory;
      };
      opfsUtil.getRootDir = async function f2() {
        return f2.promise ??= navigator.storage.getDirectory().then((d) => {
          opfsUtil.rootDirectory = d;
          return d;
        }).catch((e4) => {
          delete f2.promise;
          throw e4;
        });
      };
      opfsUtil.getResolvedPath = function(filename, splitIt) {
        const p2 = new URL(filename, "file://irrelevant").pathname;
        return splitIt ? p2.split("/").filter((v2) => !!v2) : p2;
      };
      opfsUtil.getDirForFilename = async function f2(absFilename, createDirs = false) {
        const path = opfsUtil.getResolvedPath(absFilename, true);
        const filename = path.pop();
        let dh = await opfsUtil.getRootDir();
        for (const dirName of path) if (dirName) dh = await dh.getDirectoryHandle(dirName, { create: !!createDirs });
        return [dh, filename];
      };
      opfsUtil.mkdir = async function(absDirName) {
        try {
          await opfsUtil.getDirForFilename(absDirName + "/filepart", true);
          return true;
        } catch (e4) {
          return false;
        }
      };
      opfsUtil.entryExists = async function(fsEntryName) {
        try {
          const [dh, fn] = await opfsUtil.getDirForFilename(fsEntryName);
          await dh.getFileHandle(fn);
          return true;
        } catch (e4) {
          return false;
        }
      };
      opfsUtil.randomFilename = function f2(len = 16) {
        if (!f2._chars) {
          f2._chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ012346789";
          f2._n = f2._chars.length;
        }
        const a = [];
        let i = 0;
        for (; i < len; ++i) {
          const ndx = Math.random() * (f2._n * 64) % f2._n | 0;
          a[i] = f2._chars[ndx];
        }
        return a.join("");
      };
      opfsUtil.treeList = async function() {
        const doDir = async function callee3(dirHandle, tgt) {
          tgt.name = dirHandle.name;
          tgt.dirs = [];
          tgt.files = [];
          for await (const handle of dirHandle.values()) if ("directory" === handle.kind) {
            const subDir = /* @__PURE__ */ Object.create(null);
            tgt.dirs.push(subDir);
            await callee3(handle, subDir);
          } else tgt.files.push(handle.name);
        };
        const root = /* @__PURE__ */ Object.create(null);
        await doDir(await opfsUtil.getRootDir(), root);
        return root;
      };
      opfsUtil.rmfr = async function() {
        const dir = await opfsUtil.getRootDir(), opt = { recurse: true };
        for await (const handle of dir.values()) dir.removeEntry(handle.name, opt);
      };
      opfsUtil.unlink = async function(fsEntryName, recursive = false, throwOnError = false) {
        try {
          const [hDir, filenamePart] = await opfsUtil.getDirForFilename(fsEntryName, false);
          await hDir.removeEntry(filenamePart, { recursive });
          return true;
        } catch (e4) {
          if (throwOnError) throw new Error("unlink(", arguments[0], ") failed: " + e4.message, { cause: e4 });
          return false;
        }
      };
      opfsUtil.traverse = async function(opt) {
        const defaultOpt = {
          recursive: true,
          directory: await opfsUtil.getRootDir()
        };
        if ("function" === typeof opt) opt = { callback: opt };
        opt = Object.assign(defaultOpt, opt || {});
        (async function callee3(dirHandle, depth) {
          for await (const handle of dirHandle.values()) if (false === opt.callback(handle, dirHandle, depth)) return false;
          else if (opt.recursive && "directory" === handle.kind) {
            if (false === await callee3(handle, depth + 1)) break;
          }
        })(opt.directory, 0);
      };
      const importDbChunked = async function(filename, callback) {
        const [hDir, fnamePart] = await opfsUtil.getDirForFilename(filename, true);
        let sah = await (await hDir.getFileHandle(fnamePart, { create: true })).createSyncAccessHandle(), nWrote = 0, chunk, checkedHeader = false;
        try {
          sah.truncate(0);
          while (void 0 !== (chunk = await callback())) {
            if (chunk instanceof ArrayBuffer) chunk = new Uint8Array(chunk);
            if (!checkedHeader && 0 === nWrote && chunk.byteLength >= 15) {
              util.affirmDbHeader(chunk);
              checkedHeader = true;
            }
            sah.write(chunk, { at: nWrote });
            nWrote += chunk.byteLength;
          }
          if (nWrote < 512 || 0 !== nWrote % 512) toss("Input size", nWrote, "is not correct for an SQLite database.");
          if (!checkedHeader) {
            const header = /* @__PURE__ */ new Uint8Array(20);
            sah.read(header, { at: 0 });
            util.affirmDbHeader(header);
          }
          sah.write(new Uint8Array([1, 1]), { at: 18 });
          return nWrote;
        } catch (e4) {
          await sah.close();
          sah = void 0;
          await hDir.removeEntry(fnamePart).catch(() => {
          });
          throw e4;
        } finally {
          if (sah) await sah.close();
        }
      };
      opfsUtil.importDb = async function(filename, bytes) {
        if (bytes instanceof Function) return importDbChunked(filename, bytes);
        if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
        util.affirmIsDb(bytes);
        const n3 = bytes.byteLength;
        const [hDir, fnamePart] = await opfsUtil.getDirForFilename(filename, true);
        let sah, nWrote = 0;
        try {
          sah = await (await hDir.getFileHandle(fnamePart, { create: true })).createSyncAccessHandle();
          sah.truncate(0);
          nWrote = sah.write(bytes, { at: 0 });
          if (nWrote != n3) toss("Expected to write " + n3 + " bytes but wrote " + nWrote + ".");
          sah.write(new Uint8Array([1, 1]), { at: 18 });
          return nWrote;
        } catch (e4) {
          if (sah) {
            await sah.close();
            sah = void 0;
          }
          await hDir.removeEntry(fnamePart).catch(() => {
          });
          throw e4;
        } finally {
          if (sah) await sah.close();
        }
      };
      opfsUtil.vfsInstallationFeatureCheck = function(vfsName) {
        if (!globalThis.SharedArrayBuffer || !globalThis.Atomics) toss("Cannot install OPFS: Missing SharedArrayBuffer and/or Atomics.", "The server must emit the COOP/COEP response headers to enable those.", "See https://sqlite.org/wasm/doc/trunk/persistence.md#coop-coep");
        else if ("undefined" === typeof WorkerGlobalScope) toss("The OPFS sqlite3_vfs cannot run in the main thread", "because it requires Atomics.wait().");
        else if (!globalThis.FileSystemHandle || !globalThis.FileSystemDirectoryHandle || !globalThis.FileSystemFileHandle?.prototype?.createSyncAccessHandle || !navigator?.storage?.getDirectory) toss("Missing required OPFS APIs.");
        else if ("opfs-wl" === vfsName && !globalThis.Atomics.waitAsync) toss("The", vfsName, "VFS requires Atomics.waitAsync(), which is not available.");
      };
      opfsUtil.initOptions = function callee3(vfsName, options) {
        const urlParams = new URL(globalThis.location.href).searchParams;
        if (urlParams.has(vfsName + "-disable")) return;
        try {
          opfsUtil.vfsInstallationFeatureCheck(vfsName);
        } catch (e4) {
          return;
        }
        options = util.nu(options);
        options.vfsName = vfsName;
        options.verbose ??= urlParams.has("opfs-verbose") ? +urlParams.get("opfs-verbose") : 1;
        options.sanityChecks ??= urlParams.has("opfs-sanity-check");
        if (!opfsUtil.proxyUri) {
          opfsUtil.proxyUri = "sqlite3-opfs-async-proxy.js";
          if (sqlite3.scriptInfo?.sqlite3Dir) opfsUtil.proxyUri = sqlite3.scriptInfo.sqlite3Dir + opfsUtil.proxyUri;
        }
        options.proxyUri ??= opfsUtil.proxyUri;
        if ("function" === typeof options.proxyUri) options.proxyUri = options.proxyUri();
        return opfsUtil.options = options;
      };
      opfsUtil.createVfsState = function() {
        const state = util.nu();
        const options = opfsUtil.options;
        state.verbose = options.verbose;
        const loggers = [
          sqlite3.config.error,
          sqlite3.config.warn,
          sqlite3.config.log
        ];
        const vfsName = options.vfsName || toss("Maintenance required: missing VFS name");
        const logImpl = (level, ...args) => {
          if (state.verbose > level) loggers[level](vfsName + ":", ...args);
        };
        const log = (...args) => logImpl(2, ...args), warn = (...args) => logImpl(1, ...args), error = (...args) => logImpl(0, ...args), capi = sqlite3.capi, wasm3 = sqlite3.wasm;
        const opfsVfs = state.vfs = new capi.sqlite3_vfs();
        const opfsIoMethods = opfsVfs.ioMethods = new capi.sqlite3_io_methods();
        opfsIoMethods.$iVersion = 1;
        opfsVfs.$iVersion = 2;
        opfsVfs.$szOsFile = capi.sqlite3_file.structInfo.sizeof;
        opfsVfs.$mxPathname = 1024;
        opfsVfs.$zName = wasm3.allocCString(vfsName);
        opfsVfs.addOnDispose(
          "$zName",
          opfsVfs.$zName,
          opfsIoMethods
          /**
          Pedantic sidebar: the entries in this array are items to
          clean up when opfsVfs.dispose() is called, but in this
          environment it will never be called. The VFS instance simply
          hangs around until the WASM module instance is cleaned up. We
          "could" _hypothetically_ clean it up by "importing" an
          sqlite3_os_end() impl into the wasm build, but the shutdown
          order of the wasm engine and the JS one are undefined so
          there is no guaranty that the opfsVfs instance would be
          available in one environment or the other when
          sqlite3_os_end() is called (_if_ it gets called at all in a
          wasm build, which is undefined). i.e. addOnDispose() here is
          a matter of "correctness", not necessity. It just wouldn't do
          to leave the impression that we're blindly leaking memory.
          */
        );
        opfsVfs.metrics = util.nu({
          counters: util.nu(),
          dump: function() {
            let k2, n3 = 0, t4 = 0, w = 0;
            for (k2 in state.opIds) {
              const m = metrics[k2];
              n3 += m.count;
              t4 += m.time;
              w += m.wait;
              m.avgTime = m.count && m.time ? m.time / m.count : 0;
              m.avgWait = m.count && m.wait ? m.wait / m.count : 0;
            }
            sqlite3.config.log(globalThis.location.href, "metrics for", globalThis.location.href, ":", metrics, "\nTotal of", n3, "op(s) for", t4, "ms (incl. " + w + " ms of waiting on the async side)");
            sqlite3.config.log("Serialization metrics:", opfsVfs.metrics.counters.s11n);
            opfsVfs.worker?.postMessage?.({ type: "opfs-async-metrics" });
          },
          reset: function() {
            let k2;
            const r2 = (m2) => m2.count = m2.time = m2.wait = 0;
            const m = opfsVfs.metrics.counters;
            for (k2 in state.opIds) r2(m[k2] = /* @__PURE__ */ Object.create(null));
            let s2 = m.s11n = /* @__PURE__ */ Object.create(null);
            s2 = s2.serialize = /* @__PURE__ */ Object.create(null);
            s2.count = s2.time = 0;
            s2 = m.s11n.deserialize = /* @__PURE__ */ Object.create(null);
            s2.count = s2.time = 0;
          }
        });
        state.asyncIdleWaitTime = 150;
        state.asyncS11nExceptions = 1;
        state.fileBufferSize = 65536;
        state.sabS11nOffset = state.fileBufferSize;
        state.sabS11nSize = opfsVfs.$mxPathname * 2;
        state.sabIO = new SharedArrayBuffer(state.fileBufferSize + state.sabS11nSize);
        state.opIds = /* @__PURE__ */ Object.create(null);
        {
          let i = 0;
          state.opIds.whichOp = i++;
          state.opIds.rc = i++;
          state.opIds.xAccess = i++;
          state.opIds.xClose = i++;
          state.opIds.xDelete = i++;
          state.opIds.xDeleteNoWait = i++;
          state.opIds.xFileSize = i++;
          state.opIds.xLock = i++;
          state.opIds.xOpen = i++;
          state.opIds.xRead = i++;
          state.opIds.xSleep = i++;
          state.opIds.xSync = i++;
          state.opIds.xTruncate = i++;
          state.opIds.xUnlock = i++;
          state.opIds.xWrite = i++;
          state.opIds.mkdir = i++;
          state.opIds["opfs-async-metrics"] = i++;
          state.opIds["opfs-async-shutdown"] = i++;
          state.opIds.retry = i++;
          state.sabOP = new SharedArrayBuffer(i * 4);
        }
        state.sq3Codes = /* @__PURE__ */ Object.create(null);
        for (const k2 of [
          "SQLITE_ACCESS_EXISTS",
          "SQLITE_ACCESS_READWRITE",
          "SQLITE_BUSY",
          "SQLITE_CANTOPEN",
          "SQLITE_ERROR",
          "SQLITE_IOERR",
          "SQLITE_IOERR_ACCESS",
          "SQLITE_IOERR_CLOSE",
          "SQLITE_IOERR_DELETE",
          "SQLITE_IOERR_FSYNC",
          "SQLITE_IOERR_LOCK",
          "SQLITE_IOERR_READ",
          "SQLITE_IOERR_SHORT_READ",
          "SQLITE_IOERR_TRUNCATE",
          "SQLITE_IOERR_UNLOCK",
          "SQLITE_IOERR_WRITE",
          "SQLITE_LOCK_EXCLUSIVE",
          "SQLITE_LOCK_NONE",
          "SQLITE_LOCK_PENDING",
          "SQLITE_LOCK_RESERVED",
          "SQLITE_LOCK_SHARED",
          "SQLITE_LOCKED",
          "SQLITE_MISUSE",
          "SQLITE_NOTFOUND",
          "SQLITE_OPEN_CREATE",
          "SQLITE_OPEN_DELETEONCLOSE",
          "SQLITE_OPEN_MAIN_DB",
          "SQLITE_OPEN_READONLY",
          "SQLITE_LOCK_NONE",
          "SQLITE_LOCK_SHARED",
          "SQLITE_LOCK_RESERVED",
          "SQLITE_LOCK_PENDING",
          "SQLITE_LOCK_EXCLUSIVE"
        ]) state.sq3Codes[k2] = capi[k2] ?? toss("Maintenance required: not found:", k2);
        state.opfsFlags = Object.assign(/* @__PURE__ */ Object.create(null), {
          /**
          Flag for use with xOpen(). URI flag "opfs-unlock-asap=1"
          enables this. See defaultUnlockAsap, below.
          */
          OPFS_UNLOCK_ASAP: 1,
          /**
          Flag for use with xOpen(). URI flag "delete-before-open=1"
          tells the VFS to delete the db file before attempting to open
          it. This can be used, e.g., to replace a db which has been
          corrupted (without forcing us to expose a delete/unlink()
          function in the public API).
          
          Failure to unlink the file is ignored but may lead to
          downstream errors.  An unlink can fail if, e.g., another tab
          has the handle open.
          
          It goes without saying that deleting a file out from under
          another instance results in Undefined Behavior.
          */
          OPFS_UNLINK_BEFORE_OPEN: 2,
          /**
          If true, any async routine which must implicitly acquire a
          sync access handle (i.e. an OPFS lock), without an active
          xLock(), will release that lock at the end of the call which
          acquires it. If false, such implicit locks are not released
          until the VFS is idle for some brief amount of time, as
          defined by state.asyncIdleWaitTime.
          
          The benefit of enabling this is higher concurrency. The
          down-side is much-reduced performance (as much as a 4x
          decrease in speedtest1).
          */
          defaultUnlockAsap: false
        });
        opfsVfs.metrics.reset();
        const metrics = opfsVfs.metrics.counters;
        const opRun = opfsVfs.opRun = (op, ...args) => {
          const opNdx = state.opIds[op] || toss(opfsVfs.vfsName + ": Invalid op ID:", op);
          state.s11n.serialize(...args);
          Atomics.store(state.sabOPView, state.opIds.rc, -1);
          Atomics.store(state.sabOPView, state.opIds.whichOp, opNdx);
          Atomics.notify(state.sabOPView, state.opIds.whichOp);
          const t4 = performance.now();
          while ("not-equal" !== Atomics.wait(state.sabOPView, state.opIds.rc, -1)) ;
          const rc = Atomics.load(state.sabOPView, state.opIds.rc);
          metrics[op].wait += performance.now() - t4;
          if (rc && state.asyncS11nExceptions) {
            const err3 = state.s11n.deserialize();
            if (err3) error(op + "() async error:", ...err3);
          }
          return rc;
        };
        const opTimer = /* @__PURE__ */ Object.create(null);
        opTimer.op = void 0;
        opTimer.start = void 0;
        const mTimeStart = opfsVfs.mTimeStart = (op) => {
          opTimer.start = performance.now();
          opTimer.op = op;
          ++metrics[op].count;
        };
        const mTimeEnd = opfsVfs.mTimeEnd = () => metrics[opTimer.op].time += performance.now() - opTimer.start;
        const __openFiles = opfsVfs.__openFiles = /* @__PURE__ */ Object.create(null);
        opfsVfs.ioSyncWrappers = util.nu({
          xCheckReservedLock: function(pFile, pOut) {
            wasm3.poke(pOut, 0, "i32");
            return 0;
          },
          xClose: function(pFile) {
            mTimeStart("xClose");
            let rc = 0;
            const f2 = __openFiles[pFile];
            if (f2) {
              delete __openFiles[pFile];
              rc = opRun("xClose", pFile);
              if (f2.sq3File) f2.sq3File.dispose();
            }
            mTimeEnd();
            return rc;
          },
          xDeviceCharacteristics: function(pFile) {
            return capi.SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN;
          },
          xFileControl: function(pFile, opId, pArg) {
            return capi.SQLITE_NOTFOUND;
          },
          xFileSize: function(pFile, pSz64) {
            mTimeStart("xFileSize");
            let rc = opRun("xFileSize", pFile);
            if (0 == rc) try {
              const sz = state.s11n.deserialize()[0];
              wasm3.poke(pSz64, sz, "i64");
            } catch (e4) {
              error("Unexpected error reading xFileSize() result:", e4);
              rc = state.sq3Codes.SQLITE_IOERR;
            }
            mTimeEnd();
            return rc;
          },
          xRead: function(pFile, pDest, n3, offset64) {
            mTimeStart("xRead");
            const f2 = __openFiles[pFile];
            let rc;
            try {
              rc = opRun("xRead", pFile, n3, Number(offset64));
              if (0 === rc || capi.SQLITE_IOERR_SHORT_READ === rc)
                wasm3.heap8u().set(f2.sabView.subarray(0, n3), Number(pDest));
            } catch (e4) {
              error("xRead(", arguments, ") failed:", e4, f2);
              rc = capi.SQLITE_IOERR_READ;
            }
            mTimeEnd();
            return rc;
          },
          xSync: function(pFile, flags) {
            mTimeStart("xSync");
            const rc = opRun("xSync", pFile, flags);
            mTimeEnd();
            return rc;
          },
          xTruncate: function(pFile, sz64) {
            mTimeStart("xTruncate");
            const rc = opRun("xTruncate", pFile, Number(sz64));
            mTimeEnd();
            return rc;
          },
          xWrite: function(pFile, pSrc, n3, offset64) {
            mTimeStart("xWrite");
            const f2 = __openFiles[pFile];
            let rc;
            try {
              f2.sabView.set(wasm3.heap8u().subarray(Number(pSrc), Number(pSrc) + n3));
              rc = opRun("xWrite", pFile, n3, Number(offset64));
            } catch (e4) {
              error("xWrite(", arguments, ") failed:", e4, f2);
              rc = capi.SQLITE_IOERR_WRITE;
            }
            mTimeEnd();
            return rc;
          }
        });
        opfsVfs.vfsSyncWrappers = {
          xAccess: function(pVfs, zName, flags, pOut) {
            mTimeStart("xAccess");
            const rc = opRun("xAccess", wasm3.cstrToJs(zName));
            wasm3.poke(pOut, rc ? 0 : 1, "i32");
            mTimeEnd();
            return 0;
          },
          xCurrentTime: function(pVfs, pOut) {
            wasm3.poke(pOut, 24405875e-1 + (/* @__PURE__ */ new Date()).getTime() / 864e5, "double");
            return 0;
          },
          xCurrentTimeInt64: function(pVfs, pOut) {
            wasm3.poke(pOut, 21086676e7 + (/* @__PURE__ */ new Date()).getTime(), "i64");
            return 0;
          },
          xDelete: function(pVfs, zName, doSyncDir) {
            mTimeStart("xDelete");
            const rc = opRun("xDelete", wasm3.cstrToJs(zName), doSyncDir, false);
            mTimeEnd();
            return rc;
          },
          xFullPathname: function(pVfs, zName, nOut, pOut) {
            return wasm3.cstrncpy(pOut, zName, nOut) < nOut ? 0 : capi.SQLITE_CANTOPEN;
          },
          xGetLastError: function(pVfs, nOut, pOut) {
            sqlite3.config.warn("OPFS xGetLastError() has nothing sensible to return.");
            return 0;
          },
          xOpen: function f2(pVfs, zName, pFile, flags, pOutFlags) {
            mTimeStart("xOpen");
            let opfsFlags = 0;
            let jzName, zToFree;
            if (!zName) {
              jzName = opfsUtil.randomFilename();
              zName = zToFree = wasm3.allocCString(jzName);
            } else if (wasm3.isPtr(zName)) {
              if (capi.sqlite3_uri_boolean(zName, "opfs-unlock-asap", 0)) opfsFlags |= state.opfsFlags.OPFS_UNLOCK_ASAP;
              if (capi.sqlite3_uri_boolean(zName, "delete-before-open", 0)) opfsFlags |= state.opfsFlags.OPFS_UNLINK_BEFORE_OPEN;
              jzName = wasm3.cstrToJs(zName);
            } else {
              sqlite3.config.error("Impossible zName value in xOpen?", zName);
              return capi.SQLITE_CANTOPEN;
            }
            const fh = util.nu({
              fid: pFile,
              filename: jzName,
              sab: new SharedArrayBuffer(state.fileBufferSize),
              flags,
              readOnly: !(capi.SQLITE_OPEN_CREATE & flags) && !!(flags & capi.SQLITE_OPEN_READONLY)
            });
            const rc = opRun("xOpen", pFile, jzName, flags, opfsFlags);
            if (rc) {
              if (zToFree) wasm3.dealloc(zToFree);
            } else {
              if (fh.readOnly) wasm3.poke(pOutFlags, capi.SQLITE_OPEN_READONLY, "i32");
              __openFiles[pFile] = fh;
              fh.sabView = state.sabFileBufView;
              fh.sq3File = new capi.sqlite3_file(pFile);
              if (zToFree) fh.sq3File.addOnDispose(zToFree);
              fh.sq3File.$pMethods = opfsIoMethods.pointer;
              fh.lockType = capi.SQLITE_LOCK_NONE;
            }
            mTimeEnd();
            return rc;
          }
        };
        const pDVfs = capi.sqlite3_vfs_find(null);
        if (pDVfs) {
          const dVfs = new capi.sqlite3_vfs(pDVfs);
          opfsVfs.$xRandomness = dVfs.$xRandomness;
          opfsVfs.$xSleep = dVfs.$xSleep;
          dVfs.dispose();
        }
        if (!opfsVfs.$xRandomness) opfsVfs.vfsSyncWrappers.xRandomness = function(pVfs, nOut, pOut) {
          const heap = wasm3.heap8u();
          let i = 0;
          const npOut = Number(pOut);
          for (; i < nOut; ++i) heap[npOut + i] = Math.random() * 255e3 & 255;
          return i;
        };
        if (!opfsVfs.$xSleep) opfsVfs.vfsSyncWrappers.xSleep = function(pVfs, ms) {
          mTimeStart("xSleep");
          Atomics.wait(state.sabOPView, state.opIds.xSleep, 0, ms);
          mTimeEnd();
          return 0;
        };
        const initS11n = function() {
          if (state.s11n) return state.s11n;
          const textDecoder = new TextDecoder(), textEncoder = new TextEncoder("utf-8"), viewU8 = new Uint8Array(state.sabIO, state.sabS11nOffset, state.sabS11nSize), viewDV = new DataView(state.sabIO, state.sabS11nOffset, state.sabS11nSize);
          state.s11n = /* @__PURE__ */ Object.create(null);
          const TypeIds = /* @__PURE__ */ Object.create(null);
          TypeIds.number = {
            id: 1,
            size: 8,
            getter: "getFloat64",
            setter: "setFloat64"
          };
          TypeIds.bigint = {
            id: 2,
            size: 8,
            getter: "getBigInt64",
            setter: "setBigInt64"
          };
          TypeIds.boolean = {
            id: 3,
            size: 4,
            getter: "getInt32",
            setter: "setInt32"
          };
          TypeIds.string = { id: 4 };
          const getTypeId = (v2) => TypeIds[typeof v2] || toss("Maintenance required: this value type cannot be serialized.", v2);
          const getTypeIdById = (tid) => {
            switch (tid) {
              case TypeIds.number.id:
                return TypeIds.number;
              case TypeIds.bigint.id:
                return TypeIds.bigint;
              case TypeIds.boolean.id:
                return TypeIds.boolean;
              case TypeIds.string.id:
                return TypeIds.string;
              default:
                toss("Invalid type ID:", tid);
            }
          };
          state.s11n.deserialize = function(clear = false) {
            performance.now();
            const argc = viewU8[0];
            const rc = argc ? [] : null;
            if (argc) {
              const typeIds = [];
              let offset = 1, i, n3, v2;
              for (i = 0; i < argc; ++i, ++offset) typeIds.push(getTypeIdById(viewU8[offset]));
              for (i = 0; i < argc; ++i) {
                const t4 = typeIds[i];
                if (t4.getter) {
                  v2 = viewDV[t4.getter](offset, state.littleEndian);
                  offset += t4.size;
                } else {
                  n3 = viewDV.getInt32(offset, state.littleEndian);
                  offset += 4;
                  v2 = textDecoder.decode(viewU8.slice(offset, offset + n3));
                  offset += n3;
                }
                rc.push(v2);
              }
            }
            if (clear) viewU8[0] = 0;
            return rc;
          };
          state.s11n.serialize = function(...args) {
            performance.now();
            if (args.length) {
              const typeIds = [];
              let i = 0, offset = 1;
              viewU8[0] = args.length & 255;
              for (; i < args.length; ++i, ++offset) {
                typeIds.push(getTypeId(args[i]));
                viewU8[offset] = typeIds[i].id;
              }
              for (i = 0; i < args.length; ++i) {
                const t4 = typeIds[i];
                if (t4.setter) {
                  viewDV[t4.setter](offset, args[i], state.littleEndian);
                  offset += t4.size;
                } else {
                  const s2 = textEncoder.encode(args[i]);
                  viewDV.setInt32(offset, s2.byteLength, state.littleEndian);
                  offset += 4;
                  viewU8.set(s2, offset);
                  offset += s2.byteLength;
                }
              }
            } else viewU8[0] = 0;
          };
          return state.s11n;
        };
        opfsVfs.initS11n = initS11n;
        opfsVfs.bindVfs = function(ioMethods, callback) {
          Object.assign(opfsVfs.ioSyncWrappers, ioMethods);
          return new Promise(function(promiseResolve_, promiseReject_) {
            let promiseWasRejected = void 0;
            const promiseReject = (err3) => {
              promiseWasRejected = true;
              opfsVfs.dispose();
              return promiseReject_(err3);
            };
            const promiseResolve = () => {
              try {
                callback(sqlite3, opfsVfs);
              } catch (e4) {
                return promiseReject(e4);
              }
              promiseWasRejected = false;
              return promiseResolve_(sqlite3);
            };
            const options2 = opfsUtil.options;
            const W = opfsVfs.worker = (() => {
              const url = new URL("sqlite3-opfs-async-proxy.js", import.meta.url);
              url.searchParams.set("vfs", vfsName);
              return new Worker(url.toString());
            })();
            let zombieTimer = setTimeout(() => {
              if (void 0 === promiseWasRejected) promiseReject(/* @__PURE__ */ new Error("Timeout while waiting for OPFS async proxy worker."));
            }, 4e3);
            W._originalOnError = W.onerror;
            W.onerror = function(err3) {
              error("Error initializing OPFS asyncer:", err3);
              promiseReject(/* @__PURE__ */ new Error("Loading OPFS async Worker failed for unknown reasons."));
            };
            opfsVfs.opRun;
            const sanityCheck = function() {
              const scope = wasm3.scopedAllocPush();
              const sq3File = new capi.sqlite3_file();
              try {
                const fid = sq3File.pointer;
                const openFlags = capi.SQLITE_OPEN_CREATE | capi.SQLITE_OPEN_READWRITE | capi.SQLITE_OPEN_MAIN_DB;
                const pOut = wasm3.scopedAlloc(8);
                const dbFile = "/sanity/check/file" + opfsUtil.randomFilename(8);
                const zDbFile = wasm3.scopedAllocCString(dbFile);
                let rc;
                state.s11n.serialize("This is \xE4 string.");
                rc = state.s11n.deserialize();
                log("deserialize() says:", rc);
                if ("This is \xE4 string." !== rc[0]) toss("String d13n error.");
                opfsVfs.vfsSyncWrappers.xAccess(opfsVfs.pointer, zDbFile, 0, pOut);
                rc = wasm3.peek(pOut, "i32");
                log("xAccess(", dbFile, ") exists ?=", rc);
                rc = opfsVfs.vfsSyncWrappers.xOpen(opfsVfs.pointer, zDbFile, fid, openFlags, pOut);
                log("open rc =", rc, "state.sabOPView[xOpen] =", state.sabOPView[state.opIds.xOpen]);
                if (0 !== rc) {
                  error("open failed with code", rc);
                  return;
                }
                opfsVfs.vfsSyncWrappers.xAccess(opfsVfs.pointer, zDbFile, 0, pOut);
                rc = wasm3.peek(pOut, "i32");
                if (!rc) toss("xAccess() failed to detect file.");
                rc = opfsVfs.ioSyncWrappers.xSync(sq3File.pointer, 0);
                if (rc) toss("sync failed w/ rc", rc);
                rc = opfsVfs.ioSyncWrappers.xTruncate(sq3File.pointer, 1024);
                if (rc) toss("truncate failed w/ rc", rc);
                wasm3.poke(pOut, 0, "i64");
                rc = opfsVfs.ioSyncWrappers.xFileSize(sq3File.pointer, pOut);
                if (rc) toss("xFileSize failed w/ rc", rc);
                log("xFileSize says:", wasm3.peek(pOut, "i64"));
                rc = opfsVfs.ioSyncWrappers.xWrite(sq3File.pointer, zDbFile, 10, 1);
                if (rc) toss("xWrite() failed!");
                const readBuf = wasm3.scopedAlloc(16);
                rc = opfsVfs.ioSyncWrappers.xRead(sq3File.pointer, readBuf, 6, 2);
                wasm3.poke(readBuf + 6, 0);
                let jRead = wasm3.cstrToJs(readBuf);
                log("xRead() got:", jRead);
                if ("sanity" !== jRead) toss("Unexpected xRead() value.");
                if (opfsVfs.vfsSyncWrappers.xSleep) {
                  log("xSleep()ing before close()ing...");
                  opfsVfs.vfsSyncWrappers.xSleep(opfsVfs.pointer, 2e3);
                  log("waking up from xSleep()");
                }
                rc = opfsVfs.ioSyncWrappers.xClose(fid);
                log("xClose rc =", rc, "sabOPView =", state.sabOPView);
                log("Deleting file:", dbFile);
                opfsVfs.vfsSyncWrappers.xDelete(opfsVfs.pointer, zDbFile, 4660);
                opfsVfs.vfsSyncWrappers.xAccess(opfsVfs.pointer, zDbFile, 0, pOut);
                rc = wasm3.peek(pOut, "i32");
                if (rc) toss("Expecting 0 from xAccess(", dbFile, ") after xDelete().");
                warn("End of OPFS sanity checks.");
              } finally {
                sq3File.dispose();
                wasm3.scopedAllocPop(scope);
              }
            };
            W.onmessage = function({ data }) {
              switch (data.type) {
                case "opfs-unavailable":
                  promiseReject(new Error(data.payload.join(" ")));
                  break;
                case "opfs-async-loaded":
                  delete state.vfs;
                  W.postMessage({
                    type: "opfs-async-init",
                    args: util.nu(state)
                  });
                  break;
                case "opfs-async-inited":
                  if (true === promiseWasRejected) break;
                  clearTimeout(zombieTimer);
                  zombieTimer = null;
                  try {
                    sqlite3.vfs.installVfs({
                      io: {
                        struct: opfsVfs.ioMethods,
                        methods: opfsVfs.ioSyncWrappers
                      },
                      vfs: {
                        struct: opfsVfs,
                        methods: opfsVfs.vfsSyncWrappers
                      }
                    });
                    state.sabOPView = new Int32Array(state.sabOP);
                    state.sabFileBufView = new Uint8Array(state.sabIO, 0, state.fileBufferSize);
                    state.sabS11nView = new Uint8Array(state.sabIO, state.sabS11nOffset, state.sabS11nSize);
                    opfsVfs.initS11n();
                    opfsVfs.initS11n = null;
                    if (options2.sanityChecks) {
                      warn("Running sanity checks because of opfs-sanity-check URL arg...");
                      sanityCheck();
                    }
                    if (opfsUtil.thisThreadHasOPFS()) opfsUtil.getRootDir().then((d) => {
                      W.onerror = W._originalOnError;
                      delete W._originalOnError;
                      log("End of OPFS sqlite3_vfs setup.", opfsVfs);
                      promiseResolve();
                    }).catch(promiseReject);
                    else promiseResolve();
                  } catch (e4) {
                    error(e4);
                    promiseReject(e4);
                  }
                  break;
                case "debug":
                  warn("debug message from worker:", data);
                  break;
                default: {
                  const errMsg = "Unexpected message from the OPFS async worker: " + JSON.stringify(data);
                  error(errMsg);
                  promiseReject(new Error(errMsg));
                  break;
                }
              }
            };
          });
        };
        return state;
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      if (!sqlite3.opfs || sqlite3.config.disable?.vfs?.opfs) return;
      const util = sqlite3.util, opfsUtil = sqlite3.opfs || sqlite3.util.toss("Missing sqlite3.opfs");
      const installOpfsVfs = async function(options) {
        options = opfsUtil.initOptions("opfs", options);
        if (!options) return sqlite3;
        const capi = sqlite3.capi, opfsVfs = opfsUtil.createVfsState().vfs, metrics = opfsVfs.metrics.counters, mTimeStart = opfsVfs.mTimeStart, mTimeEnd = opfsVfs.mTimeEnd, opRun = opfsVfs.opRun, __openFiles = opfsVfs.__openFiles;
        return opfsVfs.bindVfs(util.nu({
          xLock: function(pFile, lockType) {
            mTimeStart("xLock");
            ++metrics.xLock.count;
            const f2 = __openFiles[pFile];
            let rc = 0;
            if (f2.lockType) f2.lockType = lockType;
            else {
              rc = opRun("xLock", pFile, lockType);
              if (0 === rc) f2.lockType = lockType;
            }
            mTimeEnd();
            return rc;
          },
          xUnlock: function(pFile, lockType) {
            mTimeStart("xUnlock");
            ++metrics.xUnlock.count;
            const f2 = __openFiles[pFile];
            let rc = 0;
            if (capi.SQLITE_LOCK_NONE === lockType && f2.lockType) rc = opRun("xUnlock", pFile, lockType);
            if (0 === rc) f2.lockType = lockType;
            mTimeEnd();
            return rc;
          }
        }), function(sqlite32, vfs) {
          if (sqlite32.oo1) {
            const OpfsDb = function(...args) {
              const opt = sqlite32.oo1.DB.dbCtorHelper.normalizeArgs(...args);
              opt.vfs = vfs.$zName;
              sqlite32.oo1.DB.dbCtorHelper.call(this, opt);
            };
            OpfsDb.prototype = Object.create(sqlite32.oo1.DB.prototype);
            sqlite32.oo1.OpfsDb = OpfsDb;
            OpfsDb.importDb = opfsUtil.importDb;
            sqlite32.oo1.DB.dbCtorHelper.setVfsPostOpenCallback(opfsVfs.pointer, function(oo1Db, sqlite33) {
              sqlite33.capi.sqlite3_busy_timeout(oo1Db, 1e4);
            });
          }
        });
      };
      globalThis.sqlite3ApiBootstrap.initializersAsync.push(async (sqlite32) => {
        return installOpfsVfs().catch((e4) => {
          sqlite32.config.warn("Ignoring inability to install 'opfs' sqlite3_vfs:", e4);
        });
      });
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      "use strict";
      if (sqlite3.config.disable?.vfs?.["opfs-sahpool"]) return;
      const toss = sqlite3.util.toss;
      const toss3 = sqlite3.util.toss3;
      const initPromises = /* @__PURE__ */ Object.create(null);
      const capi = sqlite3.capi;
      const util = sqlite3.util;
      const wasm3 = sqlite3.wasm;
      const SECTOR_SIZE = 4096;
      const HEADER_MAX_PATH_SIZE = 512;
      const HEADER_DIGEST_SIZE = 8;
      const HEADER_CORPUS_SIZE = 516;
      const HEADER_OFFSET_FLAGS = HEADER_MAX_PATH_SIZE;
      const HEADER_OFFSET_DIGEST = HEADER_CORPUS_SIZE;
      const HEADER_OFFSET_DATA = SECTOR_SIZE;
      const PERSISTENT_FILE_TYPES = capi.SQLITE_OPEN_MAIN_DB | capi.SQLITE_OPEN_MAIN_JOURNAL | capi.SQLITE_OPEN_SUPER_JOURNAL | capi.SQLITE_OPEN_WAL;
      const FLAG_COMPUTE_DIGEST_V2 = capi.SQLITE_OPEN_MEMORY;
      const OPAQUE_DIR_NAME = ".opaque";
      const getRandomName = () => Math.random().toString(36).slice(2);
      const textDecoder = new TextDecoder();
      const textEncoder = new TextEncoder();
      const optionDefaults = Object.assign(/* @__PURE__ */ Object.create(null), {
        name: "opfs-sahpool",
        directory: void 0,
        initialCapacity: 6,
        clearOnInit: false,
        verbosity: 2,
        forceReinitIfPreviouslyFailed: false,
        preserveOnInitFailure: false
      });
      const loggers = [
        sqlite3.config.error,
        sqlite3.config.warn,
        sqlite3.config.log
      ];
      sqlite3.config.log;
      const warn = sqlite3.config.warn;
      sqlite3.config.error;
      const __mapVfsToPool = /* @__PURE__ */ new Map();
      const getPoolForVfs = (pVfs) => __mapVfsToPool.get(pVfs);
      const setPoolForVfs = (pVfs, pool2) => {
        if (pool2) __mapVfsToPool.set(pVfs, pool2);
        else __mapVfsToPool.delete(pVfs);
      };
      const __mapSqlite3File = /* @__PURE__ */ new Map();
      const getPoolForPFile = (pFile) => __mapSqlite3File.get(pFile);
      const setPoolForPFile = (pFile, pool2) => {
        if (pool2) __mapSqlite3File.set(pFile, pool2);
        else __mapSqlite3File.delete(pFile);
      };
      const ioMethods = {
        xCheckReservedLock: function(pFile, pOut) {
          const pool2 = getPoolForPFile(pFile);
          pool2.log("xCheckReservedLock");
          pool2.storeErr();
          const file = pool2.getOFileForS3File(pFile);
          wasm3.poke32(pOut, pool2.hasReservedLock(file.path) ? 1 : 0);
          return 0;
        },
        xClose: function(pFile) {
          const pool2 = getPoolForPFile(pFile);
          pool2.storeErr();
          const file = pool2.getOFileForS3File(pFile);
          if (file) try {
            pool2.log(`xClose ${file.path}`);
            pool2.unlockFile(file, capi.SQLITE_LOCK_NONE);
            pool2.mapS3FileToOFile(pFile, false);
            file.sah.flush();
            if (file.flags & capi.SQLITE_OPEN_DELETEONCLOSE) pool2.deletePath(file.path);
          } catch (e4) {
            return pool2.storeErr(e4, capi.SQLITE_IOERR);
          }
          return 0;
        },
        xDeviceCharacteristics: function(pFile) {
          return capi.SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN;
        },
        xFileControl: function(pFile, opId, pArg) {
          return capi.SQLITE_NOTFOUND;
        },
        xFileSize: function(pFile, pSz64) {
          const pool2 = getPoolForPFile(pFile);
          pool2.log(`xFileSize`);
          const size = pool2.getOFileForS3File(pFile).sah.getSize() - HEADER_OFFSET_DATA;
          wasm3.poke64(pSz64, BigInt(size));
          return 0;
        },
        xLock: function(pFile, lockType) {
          const pool2 = getPoolForPFile(pFile);
          pool2.log(`xLock ${lockType}`);
          pool2.storeErr();
          const file = pool2.getOFileForS3File(pFile);
          return pool2.lockFile(file, lockType);
        },
        xRead: function(pFile, pDest, n3, offset64) {
          const pool2 = getPoolForPFile(pFile);
          pool2.storeErr();
          const file = pool2.getOFileForS3File(pFile);
          pool2.log(`xRead ${file.path} ${n3} @ ${offset64}`);
          try {
            const nRead = file.sah.read(wasm3.heap8u().subarray(Number(pDest), Number(pDest) + n3), { at: HEADER_OFFSET_DATA + Number(offset64) });
            if (nRead < n3) {
              wasm3.heap8u().fill(0, Number(pDest) + nRead, Number(pDest) + n3);
              return capi.SQLITE_IOERR_SHORT_READ;
            }
            return 0;
          } catch (e4) {
            return pool2.storeErr(e4, capi.SQLITE_IOERR);
          }
        },
        xSectorSize: function(pFile) {
          return SECTOR_SIZE;
        },
        xSync: function(pFile, flags) {
          const pool2 = getPoolForPFile(pFile);
          pool2.log(`xSync ${flags}`);
          pool2.storeErr();
          const file = pool2.getOFileForS3File(pFile);
          try {
            file.sah.flush();
            return 0;
          } catch (e4) {
            return pool2.storeErr(e4, capi.SQLITE_IOERR);
          }
        },
        xTruncate: function(pFile, sz64) {
          const pool2 = getPoolForPFile(pFile);
          pool2.log(`xTruncate ${sz64}`);
          pool2.storeErr();
          const file = pool2.getOFileForS3File(pFile);
          try {
            file.sah.truncate(HEADER_OFFSET_DATA + Number(sz64));
            return 0;
          } catch (e4) {
            return pool2.storeErr(e4, capi.SQLITE_IOERR);
          }
        },
        xUnlock: function(pFile, lockType) {
          const pool2 = getPoolForPFile(pFile);
          pool2.log("xUnlock");
          const file = pool2.getOFileForS3File(pFile);
          pool2.unlockFile(file, lockType);
          return 0;
        },
        xWrite: function(pFile, pSrc, n3, offset64) {
          const pool2 = getPoolForPFile(pFile);
          pool2.storeErr();
          const file = pool2.getOFileForS3File(pFile);
          pool2.log(`xWrite ${file.path} ${n3} ${offset64}`);
          try {
            return n3 === file.sah.write(wasm3.heap8u().subarray(Number(pSrc), Number(pSrc) + n3), { at: HEADER_OFFSET_DATA + Number(offset64) }) ? 0 : toss("Unknown write() failure.");
          } catch (e4) {
            return pool2.storeErr(e4, capi.SQLITE_IOERR);
          }
        }
      };
      const opfsIoMethods = new capi.sqlite3_io_methods();
      opfsIoMethods.$iVersion = 1;
      sqlite3.vfs.installVfs({ io: {
        struct: opfsIoMethods,
        methods: ioMethods
      } });
      const vfsMethods = {
        xAccess: function(pVfs, zName, flags, pOut) {
          const pool2 = getPoolForVfs(pVfs);
          pool2.storeErr();
          try {
            const name = pool2.getPath(zName);
            wasm3.poke32(pOut, pool2.hasFilename(name) ? 1 : 0);
          } catch (e4) {
            wasm3.poke32(pOut, 0);
          }
          return 0;
        },
        xCurrentTime: function(pVfs, pOut) {
          wasm3.poke(pOut, 24405875e-1 + (/* @__PURE__ */ new Date()).getTime() / 864e5, "double");
          return 0;
        },
        xCurrentTimeInt64: function(pVfs, pOut) {
          wasm3.poke(pOut, 21086676e7 + (/* @__PURE__ */ new Date()).getTime(), "i64");
          return 0;
        },
        xDelete: function(pVfs, zName, doSyncDir) {
          const pool2 = getPoolForVfs(pVfs);
          pool2.log(`xDelete ${wasm3.cstrToJs(zName)}`);
          pool2.storeErr();
          try {
            pool2.deletePath(pool2.getPath(zName));
            return 0;
          } catch (e4) {
            pool2.storeErr(e4);
            return capi.SQLITE_IOERR_DELETE;
          }
        },
        xFullPathname: function(pVfs, zName, nOut, pOut) {
          return wasm3.cstrncpy(pOut, zName, nOut) < nOut ? 0 : capi.SQLITE_CANTOPEN;
        },
        xGetLastError: function(pVfs, nOut, pOut) {
          const pool2 = getPoolForVfs(pVfs);
          const e4 = pool2.popErr();
          pool2.log(`xGetLastError ${nOut} e =`, e4);
          if (e4) {
            const scope = wasm3.scopedAllocPush();
            try {
              const [cMsg, n3] = wasm3.scopedAllocCString(e4.message, true);
              wasm3.cstrncpy(pOut, cMsg, nOut);
              if (n3 > nOut) wasm3.poke8(wasm3.ptr.add(pOut, nOut, -1), 0);
            } catch (e5) {
              return capi.SQLITE_NOMEM;
            } finally {
              wasm3.scopedAllocPop(scope);
            }
          }
          return e4 ? e4.sqlite3Rc || capi.SQLITE_IOERR : 0;
        },
        xOpen: function f2(pVfs, zName, pFile, flags, pOutFlags) {
          const pool2 = getPoolForVfs(pVfs);
          try {
            flags &= ~FLAG_COMPUTE_DIGEST_V2;
            pool2.log(`xOpen ${wasm3.cstrToJs(zName)} ${flags}`);
            const path = zName && wasm3.peek8(zName) ? pool2.getPath(zName) : getRandomName();
            let sah = pool2.getSAHForPath(path);
            if (sah && flags & capi.SQLITE_OPEN_CREATE && flags & capi.SQLITE_OPEN_EXCLUSIVE) toss("file already exists:", path);
            if (!sah && flags & capi.SQLITE_OPEN_CREATE) {
              if (pool2.getFileCount() < pool2.getCapacity()) {
                sah = pool2.nextAvailableSAH();
                pool2.setAssociatedPath(sah, path, flags);
              } else toss("SAH pool is full. Cannot create file", path);
            }
            if (!sah) toss("file not found:", path);
            const file = {
              path,
              flags,
              sah
            };
            pool2.mapS3FileToOFile(pFile, file);
            file.lockType = capi.SQLITE_LOCK_NONE;
            const sq3File = new capi.sqlite3_file(pFile);
            sq3File.$pMethods = opfsIoMethods.pointer;
            sq3File.dispose();
            wasm3.poke32(pOutFlags, flags);
            return 0;
          } catch (e4) {
            pool2.storeErr(e4);
            return capi.SQLITE_CANTOPEN;
          }
        }
      };
      const createOpfsVfs = function(vfsName) {
        if (sqlite3.capi.sqlite3_vfs_find(vfsName)) toss3("VFS name is already registered:", vfsName);
        const opfsVfs = new capi.sqlite3_vfs();
        const pDVfs = capi.sqlite3_vfs_find(null);
        const dVfs = pDVfs ? new capi.sqlite3_vfs(pDVfs) : null;
        opfsVfs.$iVersion = 2;
        opfsVfs.$szOsFile = capi.sqlite3_file.structInfo.sizeof;
        opfsVfs.$mxPathname = HEADER_MAX_PATH_SIZE;
        opfsVfs.addOnDispose(opfsVfs.$zName = wasm3.allocCString(vfsName), () => setPoolForVfs(opfsVfs.pointer, 0));
        if (dVfs) {
          opfsVfs.$xRandomness = dVfs.$xRandomness;
          dVfs.dispose();
        }
        if (!opfsVfs.$xRandomness && !vfsMethods.xRandomness) vfsMethods.xRandomness = function(pVfs, nOut, pOut) {
          const heap = wasm3.heap8u();
          let i = 0;
          const npOut = Number(pOut);
          for (; i < nOut; ++i) heap[npOut + i] = Math.random() * 255e3 & 255;
          return i;
        };
        vfsMethods.xSleep = (pVfs, ms) => 0;
        sqlite3.vfs.installVfs({ vfs: {
          struct: opfsVfs,
          methods: vfsMethods
        } });
        return opfsVfs;
      };
      class OpfsSAHPool {
        vfsDir;
        #dhVfsRoot;
        #dhOpaque;
        #dhVfsParent;
        #mapSAHToName = /* @__PURE__ */ new Map();
        #mapFilenameToSAH = /* @__PURE__ */ new Map();
        #availableSAH = /* @__PURE__ */ new Set();
        #mapS3FileToOFile = /* @__PURE__ */ new Map();
        #mapPathToLock = /* @__PURE__ */ new Map();
        /** Buffer used by [sg]etAssociatedPath(). */
        #apBody = new Uint8Array(HEADER_CORPUS_SIZE);
        #dvBody;
        #cVfs;
        #verbosity;
        /**
        Options are documented in installOpfsSAHPoolVfs().
        */
        constructor(options = /* @__PURE__ */ Object.create(null)) {
          this.#verbosity = options.verbosity ?? optionDefaults.verbosity;
          this.vfsName = options.name || optionDefaults.name;
          this.#cVfs = createOpfsVfs(this.vfsName);
          setPoolForVfs(this.#cVfs.pointer, this);
          this.vfsDir = options.directory || "." + this.vfsName;
          this.#dvBody = new DataView(this.#apBody.buffer, this.#apBody.byteOffset);
          this.isReady = this.reset(!!(options.clearOnInit ?? optionDefaults.clearOnInit)).then(() => {
            if (this.$error) throw this.$error;
            return this.getCapacity() ? Promise.resolve(void 0) : this.addCapacity(options.initialCapacity || optionDefaults.initialCapacity);
          });
        }
        #logImpl(level, ...args) {
          if (this.#verbosity > level) loggers[level](this.vfsName + ":", ...args);
        }
        log(...args) {
          this.#logImpl(2, ...args);
        }
        warn(...args) {
          this.#logImpl(1, ...args);
        }
        error(...args) {
          this.#logImpl(0, ...args);
        }
        getVfs() {
          return this.#cVfs;
        }
        getCapacity() {
          return this.#mapSAHToName.size;
        }
        getFileCount() {
          return this.#mapFilenameToSAH.size;
        }
        getFileNames() {
          const rc = [];
          for (const n3 of this.#mapFilenameToSAH.keys()) rc.push(n3);
          return rc;
        }
        /**
        Adds n files to the pool's capacity. This change is
        persistent across settings. Returns a Promise which resolves
        to the new capacity.
        */
        async addCapacity(n3) {
          for (let i = 0; i < n3; ++i) {
            const name = getRandomName();
            const ah = await (await this.#dhOpaque.getFileHandle(name, { create: true })).createSyncAccessHandle();
            this.#mapSAHToName.set(ah, name);
            this.setAssociatedPath(ah, "", 0);
          }
          return this.getCapacity();
        }
        /**
        Reduce capacity by n, but can only reduce up to the limit of
        currently-available SAHs. Returns a Promise which resolves to
        the number of slots really removed. Throws if removal of an
        OPFS filesystem entry fails for any reason, in which case the
        VFS itself is left in a well-defined state, possibly partially
        reduced in capacity compared to before this call, but the file
        which was unable to be removed is in an undefined state. It may
        be orphaned and/or later recycled.
        
        As of 3.54, throws if n is an invalid value. Prior to that
        an invalid value could cause it to remove all entries.
        */
        async reduceCapacity(n3) {
          if (!Number.isSafeInteger(n3) || n3 < 0) toss("Invalid capacity reduction:", n3);
          let nRm = 0;
          for (const ah of Array.from(this.#availableSAH)) {
            if (nRm === n3 || this.getFileCount() === this.getCapacity()) break;
            const name = this.#mapSAHToName.get(ah);
            ah.close();
            this.#mapSAHToName.delete(ah);
            this.#availableSAH.delete(ah);
            await this.#dhOpaque.removeEntry(name);
            ++nRm;
          }
          return nRm;
        }
        /**
        Releases all currently-opened SAHs. The only legal operation
        after this is acquireAccessHandles() or (if this is called from
        pauseVfs()) either of isPaused() or unpauseVfs().
        */
        releaseAccessHandles() {
          for (const ah of this.#mapSAHToName.keys()) ah.close();
          this.#mapSAHToName.clear();
          this.#mapFilenameToSAH.clear();
          this.#availableSAH.clear();
          this.#mapS3FileToOFile.clear();
          this.#mapPathToLock.clear();
        }
        /**
        Opens all files under this.vfsDir/this.#dhOpaque and acquires a
        SAH for each. Returns a Promise which resolves to no value but
        completes once all SAHs are acquired. If acquiring an SAH
        throws, this.$error will contain the corresponding Error
        object.
        
        If it throws, it waits for every pending acquisition to settle,
        then releases all SAHs it acquired, leaving the VFS in a
        well-defined but unusable state.
        
        If clearFiles is true, the client-stored state of each file is
        cleared when its handle is acquired, including its name, flags,
        and any data stored after the metadata block.
        */
        async acquireAccessHandles(clearFiles = false) {
          const files = [];
          for await (const [name, h] of this.#dhOpaque) if ("file" === h.kind) files.push([name, h]);
          const failure = (await Promise.allSettled(files.map(async ([name, h]) => {
            const ah = await h.createSyncAccessHandle();
            this.#mapSAHToName.set(ah, name);
            if (clearFiles) {
              ah.truncate(HEADER_OFFSET_DATA);
              this.setAssociatedPath(ah, "", 0);
            } else {
              const path = this.getAssociatedPath(ah);
              if (path) this.#mapFilenameToSAH.set(path, ah);
              else this.#availableSAH.add(ah);
            }
          }))).find((r2) => "rejected" === r2.status);
          if (failure) {
            this.storeErr(failure.reason);
            this.releaseAccessHandles();
            throw failure.reason;
          }
        }
        /**
        Given an SAH, returns the client-specified name of
        that file by extracting it from the SAH's header.
        
        On error, it disassociates SAH from the pool and
        returns an empty string.
        */
        getAssociatedPath(sah) {
          sah.read(this.#apBody, { at: 0 });
          const flags = this.#dvBody.getUint32(HEADER_OFFSET_FLAGS);
          if (this.#apBody[0] && (flags & capi.SQLITE_OPEN_DELETEONCLOSE || (flags & PERSISTENT_FILE_TYPES) === 0)) {
            warn(`Removing file with unexpected flags ${flags.toString(16)}`, this.#apBody);
            this.setAssociatedPath(sah, "", 0);
            return "";
          }
          const fileDigest = new Uint32Array(HEADER_DIGEST_SIZE / 4);
          sah.read(fileDigest, { at: HEADER_OFFSET_DIGEST });
          const compDigest = this.computeDigest(this.#apBody, flags);
          if (fileDigest.every((v2, i) => v2 === compDigest[i])) {
            const pathBytes = this.#apBody.findIndex((v2) => 0 === v2);
            if (0 === pathBytes) sah.truncate(HEADER_OFFSET_DATA);
            return pathBytes ? textDecoder.decode(this.#apBody.subarray(0, pathBytes)) : "";
          } else {
            warn("Disassociating file with bad digest.");
            this.setAssociatedPath(sah, "", 0);
            return "";
          }
        }
        /**
        Stores the given client-defined path and SQLITE_OPEN_xyz flags
        into the given SAH. If path is an empty string then the file is
        disassociated from the pool but its previous name is preserved
        in the metadata.
        
        If nameToRemove is truthy then it must be the "old" name when path
        is falsy. This function removes the mapping of that name to an
        SAH.
        */
        setAssociatedPath(sah, path, flags, nameToRemove) {
          const enc = textEncoder.encodeInto(path, this.#apBody);
          if (HEADER_MAX_PATH_SIZE <= enc.written + 1) toss("Path too long:", path);
          if (path && flags) flags |= FLAG_COMPUTE_DIGEST_V2;
          this.#apBody.fill(0, enc.written, HEADER_MAX_PATH_SIZE);
          this.#dvBody.setUint32(HEADER_OFFSET_FLAGS, flags);
          const digest = this.computeDigest(this.#apBody, flags);
          sah.write(this.#apBody, { at: 0 });
          if (nameToRemove) this.#mapFilenameToSAH.delete(nameToRemove);
          sah.write(digest, { at: HEADER_OFFSET_DIGEST });
          sah.flush();
          if (path) {
            this.#mapFilenameToSAH.set(path, sah);
            this.#availableSAH.delete(sah);
          } else {
            sah.truncate(HEADER_OFFSET_DATA);
            this.#availableSAH.add(sah);
          }
        }
        /**
        Computes a digest for the given byte array and returns it as a
        two-element Uint32Array. This digest gets stored in the
        metadata for each file as a validation check. Changing this
        algorithm invalidates all existing databases for this VFS, so
        don't do that.
        
        See the docs for FLAG_COMPUTE_DIGEST_V2 for more details.
        */
        computeDigest(byteArray, fileFlags) {
          if (fileFlags & FLAG_COMPUTE_DIGEST_V2) {
            let h1 = 3735928559;
            let h2 = 1103547991;
            for (const v2 of byteArray) {
              h1 = Math.imul(h1 ^ v2, 2654435761);
              h2 = Math.imul(h2 ^ v2, 104729);
            }
            return new Uint32Array([h1 >>> 0, h2 >>> 0]);
          } else return new Uint32Array([0, 0]);
        }
        /**
        Re-initializes the state of the SAH pool, releasing and
        re-acquiring all handles.
        
        See acquireAccessHandles() for the specifics of the clearFiles
        argument.
        */
        async reset(clearFiles) {
          await this.isReady;
          let h = await navigator.storage.getDirectory(), prev;
          for (const d of this.vfsDir.split("/")) if (d) {
            prev = h;
            h = await h.getDirectoryHandle(d, { create: true });
          }
          this.#dhVfsRoot = h;
          this.#dhVfsParent = prev;
          this.#dhOpaque = await this.#dhVfsRoot.getDirectoryHandle(OPAQUE_DIR_NAME, { create: true });
          this.releaseAccessHandles();
          return this.acquireAccessHandles(clearFiles);
        }
        /**
        Returns the pathname part of the given argument,
        which may be any of:
        
        - a URL object
        - A JS string representing a file name
        - Wasm C-string representing a file name
        
        All "../" parts and duplicate slashes are resolve/removed from
        the returned result.
        */
        getPath(arg) {
          if (wasm3.isPtr(arg)) arg = wasm3.cstrToJs(arg);
          return (arg instanceof URL ? arg : new URL(arg, "file://localhost/")).pathname;
        }
        /**
        Removes the association of the given client-specified file
        name (JS string) from the pool. Returns true if a mapping
        is found, else false.
        */
        deletePath(path) {
          const sah = this.#mapFilenameToSAH.get(path);
          if (sah) this.setAssociatedPath(sah, "", 0, path);
          return !!sah;
        }
        /**
        Sets e (an Error object) as this object's current error. Pass a
        falsy (or no) value to clear it. If code is truthy it is
        assumed to be an SQLITE_xxx result code, defaulting to
        SQLITE_IOERR if code is falsy.
        
        Returns the 2nd argument.
        */
        storeErr(e4, code) {
          if (e4) {
            e4.sqlite3Rc = code || capi.SQLITE_IOERR;
            this.error(e4);
          }
          this.$error = e4;
          return code;
        }
        /**
        Pops this object's Error object and returns
        it (a falsy value if no error is set).
        */
        popErr() {
          const rc = this.$error;
          this.$error = void 0;
          return rc;
        }
        /**
        Returns the next available SAH without removing
        it from the set.
        */
        nextAvailableSAH() {
          const [rc] = this.#availableSAH.keys();
          return rc;
        }
        /**
        Given an (sqlite3_file*), returns the mapped
        xOpen file object.
        */
        getOFileForS3File(pFile) {
          return this.#mapS3FileToOFile.get(pFile);
        }
        /**
        Maps or unmaps (if file is falsy) the given (sqlite3_file*)
        to an xOpen file object and to this pool object.
        */
        mapS3FileToOFile(pFile, file) {
          if (file) {
            this.#mapS3FileToOFile.set(pFile, file);
            setPoolForPFile(pFile, this);
          } else {
            this.#mapS3FileToOFile.delete(pFile);
            setPoolForPFile(pFile, false);
          }
        }
        /**
        Returns true if the given client-defined file name is in this
        object's name-to-SAH map.
        */
        hasFilename(name) {
          return this.#mapFilenameToSAH.has(name);
        }
        /**
        Returns the SAH associated with the given
        client-defined file name.
        */
        getSAHForPath(path) {
          return this.#mapFilenameToSAH.get(path);
        }
        /**
        Removes this object's sqlite3_vfs registration and shuts down
        this object, releasing all handles, mappings, and whatnot,
        including deleting its data directory. There is currently no
        way to "revive" the object and reaquire its
        resources. Similarly, there is no recovery strategy if removal
        of any given SAH fails, so such errors are ignored by this
        function.
        
        This function is intended primarily for testing.
        
        Resolves to true if it did its job, false if the
        VFS has already been shut down.
        
        @see pauseVfs()
        @see unpauseVfs()
        */
        async removeVfs() {
          if (!this.#cVfs.pointer || !this.#dhOpaque) return false;
          capi.sqlite3_vfs_unregister(this.#cVfs.pointer);
          this.#cVfs.dispose();
          delete initPromises[this.vfsName];
          try {
            this.releaseAccessHandles();
            await this.#dhVfsRoot.removeEntry(OPAQUE_DIR_NAME, { recursive: true });
            this.#dhOpaque = void 0;
            await this.#dhVfsParent.removeEntry(this.#dhVfsRoot.name, { recursive: true });
            this.#dhVfsRoot = this.#dhVfsParent = void 0;
          } catch (e4) {
            sqlite3.config.error(this.vfsName, "removeVfs() failed with no recovery strategy:", e4);
          }
          return true;
        }
        /**
        "Pauses" this VFS by unregistering it from SQLite and
        relinquishing all open SAHs, leaving the associated files
        intact. If this object is already paused, this is a
        no-op. Returns this object.
        
        This function throws if SQLite has any opened file handles
        hosted by this VFS, as the alternative would be to invoke
        Undefined Behavior by closing file handles out from under the
        library. Similarly, automatically closing any database handles
        opened by this VFS would invoke Undefined Behavior in
        downstream code which is holding those pointers.
        
        If this function throws due to open file handles then it has
        no side effects. If the OPFS API throws while closing handles
        then the VFS is left in an undefined state.
        
        @see isPaused()
        @see unpauseVfs()
        */
        pauseVfs() {
          if (this.#mapS3FileToOFile.size > 0) sqlite3.SQLite3Error.toss(capi.SQLITE_MISUSE, "Cannot pause VFS", this.vfsName, "because it has opened files.");
          if (this.#mapSAHToName.size > 0) {
            capi.sqlite3_vfs_unregister(this.vfsName);
            this.releaseAccessHandles();
          }
          return this;
        }
        /**
        Returns true if this pool is currently paused else false.
        
        @see pauseVfs()
        @see unpauseVfs()
        */
        isPaused() {
          return 0 === this.#mapSAHToName.size;
        }
        /**
        "Unpauses" this VFS, reacquiring all SAH's and (if successful)
        re-registering it with SQLite. This is a no-op if the VFS is
        not currently paused.
        
        The returned Promise resolves to this object. See
        acquireAccessHandles() for how it behaves if it throws due to
        SAH acquisition failure.
        
        @see isPaused()
        @see pauseVfs()
        */
        async unpauseVfs() {
          if (0 === this.#mapSAHToName.size) return this.acquireAccessHandles(false).then(() => capi.sqlite3_vfs_register(this.#cVfs, 0), this);
          return this;
        }
        //! Documented elsewhere in this file.
        exportFile(name) {
          const sah = this.#mapFilenameToSAH.get(name) || toss("File not found:", name);
          const n3 = sah.getSize() - HEADER_OFFSET_DATA;
          const b2 = new Uint8Array(n3 > 0 ? n3 : 0);
          if (n3 > 0) {
            const nRead = sah.read(b2, { at: HEADER_OFFSET_DATA });
            if (nRead != n3) toss("Expected to read " + n3 + " bytes but read " + nRead + ".");
          }
          return b2;
        }
        //! Impl for importDb() when its 2nd arg is a function.
        async importDbChunked(name, callback) {
          const sah = this.#mapFilenameToSAH.get(name) || this.nextAvailableSAH() || toss("No available handles to import to.");
          sah.truncate(0);
          let nWrote = 0, chunk, checkedHeader = false;
          try {
            while (void 0 !== (chunk = await callback())) {
              if (chunk instanceof ArrayBuffer) chunk = new Uint8Array(chunk);
              if (!checkedHeader && 0 === nWrote && chunk.byteLength >= 15) {
                util.affirmDbHeader(chunk);
                checkedHeader = true;
              }
              const n3 = sah.write(chunk, { at: HEADER_OFFSET_DATA + nWrote });
              if (n3 !== chunk.byteLength) toss("Expected to write " + chunk.byteLength + "bytes but wrote" + n3 + ".");
              nWrote += chunk.byteLength;
            }
            if (nWrote < 512 || 0 !== nWrote % 512) toss("Input size", nWrote, "is not correct for an SQLite database.");
            if (!checkedHeader) {
              const header = /* @__PURE__ */ new Uint8Array(20);
              sah.read(header, { at: HEADER_OFFSET_DATA });
              util.affirmDbHeader(header);
            }
            sah.write(new Uint8Array([1, 1]), { at: 4114 });
          } catch (e4) {
            this.setAssociatedPath(sah, "", 0);
            throw e4;
          }
          this.setAssociatedPath(sah, name, capi.SQLITE_OPEN_MAIN_DB);
          return nWrote;
        }
        //! Documented elsewhere in this file.
        importDb(name, bytes) {
          if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
          else if (bytes instanceof Function) return this.importDbChunked(name, bytes);
          util.affirmIsDb(bytes);
          const sah = this.#mapFilenameToSAH.get(name) || this.nextAvailableSAH() || toss("No available handles to import to.");
          const n3 = bytes.byteLength;
          const nWrote = sah.write(bytes, { at: HEADER_OFFSET_DATA });
          if (nWrote != n3) {
            this.setAssociatedPath(sah, "", 0);
            toss("Expected to write " + n3 + " bytes but wrote " + nWrote + ".");
          } else {
            sah.truncate(HEADER_OFFSET_DATA + n3);
            sah.write(new Uint8Array([1, 1]), { at: 4114 });
            this.setAssociatedPath(sah, name, capi.SQLITE_OPEN_MAIN_DB);
          }
          return nWrote;
        }
        /**
        Returns true if any (sqlite3_file*) currently opened by this
        pool using the given client-provided file name (as distinct from
        its opaque name) holds a RESERVED or greater lock, else false.
        */
        hasReservedLock(filename) {
          const lk = this.#mapPathToLock.get(filename);
          return !!lk && lk.lockType > capi.SQLITE_LOCK_SHARED;
        }
        /**
        Implements xLock() for the given xOpen-generated file object.
        This pool holds its SAHs exclusively, so its xOpen() represent
        the only connections to a given file. The locks are held
        separately from their file object in the same thread the same
        way in which os_unix.c:unixLock() distinguishes multiple
        connections of a single process which share an inode: a lock
        which conflicts with another connection's lock fails with
        SQLITE_BUSY, and a failed attempt to get from RESERVED to
        EXCLUSIVE leaves a PENDING lock, which admits no new SHARED
        locks.
        */
        lockFile(file, lockType) {
          if (file.lockType >= lockType) return 0;
          let lk = this.#mapPathToLock.get(file.path);
          if (!lk) {
            lk = Object.assign(/* @__PURE__ */ Object.create(null), {
              nShared: 0,
              lockType: capi.SQLITE_LOCK_NONE
            });
            this.#mapPathToLock.set(file.path, lk);
          }
          if (file.lockType !== lk.lockType && (lk.lockType >= capi.SQLITE_LOCK_PENDING || lockType > capi.SQLITE_LOCK_SHARED)) return capi.SQLITE_BUSY;
          if (lockType === capi.SQLITE_LOCK_SHARED) {
            ++lk.nShared;
            if (lk.lockType === capi.SQLITE_LOCK_NONE) lk.lockType = lockType;
          } else if (lockType === capi.SQLITE_LOCK_EXCLUSIVE && lk.nShared > 1) {
            if (file.lockType === capi.SQLITE_LOCK_RESERVED) file.lockType = lk.lockType = capi.SQLITE_LOCK_PENDING;
            return capi.SQLITE_BUSY;
          } else lk.lockType = lockType;
          file.lockType = lockType;
          return 0;
        }
        /** Implements xUnlock() for the given xOpen file object. */
        unlockFile(file, lockType) {
          if (file.lockType <= lockType) return;
          const lk = this.#mapPathToLock.get(file.path);
          if (file.lockType > capi.SQLITE_LOCK_SHARED) lk.lockType = capi.SQLITE_LOCK_SHARED;
          if (lockType === capi.SQLITE_LOCK_NONE && 0 === --lk.nShared) this.#mapPathToLock.delete(file.path);
          file.lockType = lockType;
        }
      }
      class OpfsSAHPoolUtil {
        #p;
        constructor(sahPool) {
          this.#p = sahPool;
          this.vfsName = sahPool.vfsName;
        }
        async addCapacity(n3) {
          return this.#p.addCapacity(n3);
        }
        async reduceCapacity(n3) {
          return this.#p.reduceCapacity(n3);
        }
        getCapacity() {
          return this.#p.getCapacity(this.#p);
        }
        getFileCount() {
          return this.#p.getFileCount();
        }
        getFileNames() {
          return this.#p.getFileNames();
        }
        async reserveMinimumCapacity(min) {
          const c = this.#p.getCapacity();
          return c < min ? this.#p.addCapacity(min - c) : c;
        }
        exportFile(name) {
          return this.#p.exportFile(name);
        }
        importDb(name, bytes) {
          return this.#p.importDb(name, bytes);
        }
        async wipeFiles() {
          return this.#p.reset(true);
        }
        unlink(filename) {
          return this.#p.deletePath(filename);
        }
        async removeVfs() {
          return this.#p.removeVfs();
        }
        pauseVfs() {
          this.#p.pauseVfs();
          return this;
        }
        async unpauseVfs() {
          return this.#p.unpauseVfs().then(() => this);
        }
        isPaused() {
          return this.#p.isPaused();
        }
      }
      const apiVersionCheck = async () => {
        const dh = await navigator.storage.getDirectory();
        const fn = ".opfs-sahpool-sync-check-" + getRandomName();
        const close = (await (await dh.getFileHandle(fn, { create: true })).createSyncAccessHandle()).close();
        await close;
        await dh.removeEntry(fn);
        if (close?.then) toss("The local OPFS API is too old for opfs-sahpool:", "it has an async FileSystemSyncAccessHandle.close() method.");
        return true;
      };
      sqlite3.installOpfsSAHPoolVfs = async function(options = /* @__PURE__ */ Object.create(null)) {
        options = Object.assign(/* @__PURE__ */ Object.create(null), optionDefaults, options || {});
        const vfsName = options.name;
        if (options.$testThrowPhase1) throw options.$testThrowPhase1;
        if (initPromises[vfsName]) try {
          return await initPromises[vfsName];
        } catch (e4) {
          if (options.forceReinitIfPreviouslyFailed) delete initPromises[vfsName];
          else throw e4;
        }
        if (!globalThis.FileSystemHandle || !globalThis.FileSystemDirectoryHandle || !globalThis.FileSystemFileHandle || !globalThis.FileSystemFileHandle.prototype.createSyncAccessHandle || !navigator?.storage?.getDirectory) return initPromises[vfsName] = Promise.reject(/* @__PURE__ */ new Error("Missing required OPFS APIs."));
        const unregisterVfs = (thePool) => {
          const cVfs = thePool.getVfs();
          if (cVfs?.pointer) {
            capi.sqlite3_vfs_unregister(cVfs.pointer);
            cVfs.dispose();
            thePool.releaseAccessHandles();
          }
        };
        return initPromises[vfsName] = apiVersionCheck().then(async function() {
          if (options.$testThrowPhase2) throw options.$testThrowPhase2;
          const thePool = new OpfsSAHPool(options);
          return thePool.isReady.then(async () => {
            const poolUtil = new OpfsSAHPoolUtil(thePool);
            if (sqlite3.oo1) {
              const oo1 = sqlite3.oo1;
              const theVfs = thePool.getVfs();
              const OpfsSAHPoolDb = function(...args) {
                const opt = oo1.DB.dbCtorHelper.normalizeArgs(...args);
                opt.vfs = theVfs.$zName;
                oo1.DB.dbCtorHelper.call(this, opt);
              };
              OpfsSAHPoolDb.prototype = Object.create(oo1.DB.prototype);
              poolUtil.OpfsSAHPoolDb = OpfsSAHPoolDb;
            }
            thePool.log("VFS initialized.");
            return poolUtil;
          }).catch(async (e4) => {
            if (options.preserveOnInitFailure) unregisterVfs(thePool);
            else await thePool.removeVfs().catch(() => {
            });
            throw e4;
          });
        }).catch((err3) => {
          return initPromises[vfsName] = Promise.reject(err3);
        });
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      if (!sqlite3.opfs || sqlite3.config.disable?.vfs?.["opfs-wl"]) return;
      const util = sqlite3.util;
      sqlite3.util.toss;
      const opfsUtil = sqlite3.opfs;
      const vfsName = "opfs-wl";
      const installOpfsWlVfs = async function(options) {
        options = opfsUtil.initOptions(vfsName, options);
        if (!options) return sqlite3;
        sqlite3.capi;
        const opfsVfs = opfsUtil.createVfsState().vfs;
        opfsVfs.metrics.counters;
        const mTimeStart = opfsVfs.mTimeStart, mTimeEnd = opfsVfs.mTimeEnd, opRun = opfsVfs.opRun, __openFiles = opfsVfs.__openFiles;
        return opfsVfs.bindVfs(util.nu({
          xLock: function(pFile, lockType) {
            mTimeStart("xLock");
            const f2 = __openFiles[pFile];
            const rc = opRun("xLock", pFile, lockType);
            if (!rc) f2.lockType = lockType;
            mTimeEnd();
            return rc;
          },
          xUnlock: function(pFile, lockType) {
            mTimeStart("xUnlock");
            const f2 = __openFiles[pFile];
            const rc = opRun("xUnlock", pFile, lockType);
            if (!rc) f2.lockType = lockType;
            mTimeEnd();
            return rc;
          }
        }), function(sqlite32, vfs) {
          if (sqlite32.oo1) {
            const OpfsWlDb = function(...args) {
              const opt = sqlite32.oo1.DB.dbCtorHelper.normalizeArgs(...args);
              opt.vfs = vfs.$zName;
              sqlite32.oo1.DB.dbCtorHelper.call(this, opt);
            };
            OpfsWlDb.prototype = Object.create(sqlite32.oo1.DB.prototype);
            sqlite32.oo1.OpfsWlDb = OpfsWlDb;
            OpfsWlDb.importDb = opfsUtil.importDb;
          }
        });
      };
      globalThis.sqlite3ApiBootstrap.initializersAsync.push(async (sqlite32) => {
        return installOpfsWlVfs().catch((e4) => {
          sqlite32.config.warn("Ignoring inability to install the", vfsName, "sqlite3_vfs:", e4);
        });
      });
    });
    try {
      const bootstrapConfig = Object.assign(
        /* @__PURE__ */ Object.create(null),
        /** The WASM-environment-dependent configuration for sqlite3ApiBootstrap() */
        {
          memory: "undefined" !== typeof wasmMemory ? wasmMemory : EmscriptenModule["wasmMemory"],
          exports: "undefined" !== typeof wasmExports ? wasmExports : Object.prototype.hasOwnProperty.call(EmscriptenModule, "wasmExports") ? EmscriptenModule["wasmExports"] : EmscriptenModule["asm"]
        },
        globalThis.sqlite3ApiBootstrap.defaultConfig,
        globalThis.sqlite3ApiConfig || {}
      );
      sqlite3InitScriptInfo.debugModule("Bootstrapping lib config", bootstrapConfig);
      const p2 = globalThis.sqlite3ApiBootstrap(bootstrapConfig);
      delete globalThis.sqlite3ApiBootstrap;
      return p2;
    } catch (e4) {
      console.error("sqlite3ApiBootstrap() error:", e4);
      throw e4;
    }
  };
  if (runtimeInitialized) moduleRtn = Module;
  else moduleRtn = new Promise((resolve, reject) => {
    readyPromiseResolve = resolve;
    readyPromiseReject = reject;
  });
  return moduleRtn;
}
sqlite3InitModule$1 = (function() {
  const originalInit = sqlite3InitModule$1;
  if (!originalInit) throw new Error("Expecting sqlite3InitModule to be defined by the Emscripten build.");
  const sIMS = globalThis.sqlite3InitModuleState = Object.assign(/* @__PURE__ */ Object.create(null), {
    moduleScript: globalThis?.document?.currentScript,
    isWorker: "undefined" !== typeof WorkerGlobalScope,
    location: globalThis.location,
    urlParams: globalThis?.location?.href ? new URL(globalThis.location.href).searchParams : new URLSearchParams(),
    wasmFilename: "sqlite3.wasm"
  });
  sIMS.debugModule = sIMS.urlParams.has("sqlite3.debugModule") ? (...args) => console.warn("sqlite3.debugModule:", ...args) : () => {
  };
  if (sIMS.urlParams.has("sqlite3.dir")) sIMS.sqlite3Dir = sIMS.urlParams.get("sqlite3.dir") + "/";
  else if (sIMS.moduleScript) {
    const li = sIMS.moduleScript.src.split("/");
    li.pop();
    sIMS.sqlite3Dir = li.join("/") + "/";
  }
  const sIM = globalThis.sqlite3InitModule = function ff(...args) {
    sIMS.emscriptenLocateFile = args[0]?.locateFile;
    sIMS.emscriptenInstantiateWasm = args[0]?.instantiateWasm;
    return originalInit(...args).then((EmscriptenModule) => {
      sIMS.debugModule("sqlite3InitModule() sIMS =", sIMS);
      sIMS.debugModule("sqlite3InitModule() EmscriptenModule =", EmscriptenModule);
      const s2 = EmscriptenModule.runSQLite3PostLoadInit(sIMS, EmscriptenModule, !!ff.__isUnderTest);
      sIMS.debugModule("sqlite3InitModule() sqlite3 =", s2);
      return s2;
    }).catch((e4) => {
      console.error("Exception loading sqlite3 module:", e4);
      throw e4;
    });
  };
  sIM.ready = originalInit.ready;
  if (sIMS.moduleScript) {
    let src = sIMS.moduleScript.src.split("/");
    src.pop();
    sIMS.scriptDir = src.join("/") + "/";
  }
  sIMS.debugModule("extern-post-js.c-pp.js sqlite3InitModuleState =", sIMS);
  return sIM;
})();
var sqlite3_bundler_friendly_default = sqlite3InitModule$1;
globalThis.sqlite3Worker1Promiser = function callee(config2 = callee.defaultConfig) {
  if (1 === arguments.length && "function" === typeof arguments[0]) {
    const f2 = config2;
    config2 = Object.assign(/* @__PURE__ */ Object.create(null), callee.defaultConfig);
    config2.onready = f2;
  } else config2 = Object.assign(/* @__PURE__ */ Object.create(null), callee.defaultConfig, config2);
  const handlerMap = /* @__PURE__ */ Object.create(null);
  const noop = function() {
  };
  const err2 = config2.onerror || noop;
  const debug = config2.debug || noop;
  const idTypeMap = config2.generateMessageId ? void 0 : /* @__PURE__ */ Object.create(null);
  const genMsgId = config2.generateMessageId || function(msg) {
    return msg.type + "#" + (idTypeMap[msg.type] = (idTypeMap[msg.type] || 0) + 1);
  };
  const toss = (...args) => {
    throw new Error(args.join(" "));
  };
  if (!config2.worker) config2.worker = callee.defaultConfig.worker;
  if ("function" === typeof config2.worker) config2.worker = config2.worker();
  let dbId;
  let promiserFunc;
  config2.worker.onmessage = function(ev) {
    ev = ev.data;
    debug("worker1.onmessage", ev);
    let msgHandler = handlerMap[ev.messageId];
    if (!msgHandler) {
      if (ev && "sqlite3-api" === ev.type && "worker1-ready" === ev.result) {
        if (config2.onready) config2.onready(promiserFunc);
        return;
      }
      msgHandler = handlerMap[ev.type];
      if (msgHandler && msgHandler.onrow) {
        msgHandler.onrow(ev);
        return;
      }
      if (config2.onunhandled) config2.onunhandled(arguments[0]);
      else err2("sqlite3Worker1Promiser() unhandled worker message:", ev);
      return;
    }
    delete handlerMap[ev.messageId];
    switch (ev.type) {
      case "error":
        msgHandler.reject(ev);
        return;
      case "open":
        if (!dbId) dbId = ev.dbId;
        break;
      case "close":
        if (ev.dbId === dbId) dbId = void 0;
    }
    try {
      msgHandler.resolve(ev);
    } catch (e4) {
      msgHandler.reject(e4);
    }
  };
  return promiserFunc = function() {
    let msg;
    if (1 === arguments.length) msg = arguments[0];
    else if (2 === arguments.length) {
      msg = /* @__PURE__ */ Object.create(null);
      msg.type = arguments[0];
      msg.args = arguments[1];
      msg.dbId = msg.args.dbId;
    } else toss("Invalid arguments for sqlite3Worker1Promiser()-created factory.");
    if (!msg.dbId && msg.type !== "open") msg.dbId = dbId;
    msg.messageId = genMsgId(msg);
    msg.departureTime = performance.now();
    const proxy = /* @__PURE__ */ Object.create(null);
    proxy.message = msg;
    let rowCallbackId;
    if ("exec" === msg.type && msg.args) {
      if ("function" === typeof msg.args.callback) {
        rowCallbackId = msg.messageId + ":row";
        proxy.onrow = msg.args.callback;
        msg.args.callback = rowCallbackId;
        handlerMap[rowCallbackId] = proxy;
      } else if ("string" === typeof msg.args.callback) toss("exec callback may not be a string when using the Promise interface.");
    }
    let p2 = new Promise(function(resolve, reject) {
      proxy.resolve = resolve;
      proxy.reject = reject;
      handlerMap[msg.messageId] = proxy;
      debug("Posting", msg.type, "message to Worker dbId=" + (dbId || "default") + ":", msg);
      config2.worker.postMessage(msg);
    });
    if (rowCallbackId) p2 = p2.finally(() => delete handlerMap[rowCallbackId]);
    return p2;
  };
};
globalThis.sqlite3Worker1Promiser.defaultConfig = {
  worker: function() {
    return new Worker(new URL("sqlite3-worker1.mjs", import.meta.url), { type: "module" });
  },
  onerror: (...args) => console.error("sqlite3Worker1Promiser():", ...args)
};
globalThis.sqlite3Worker1Promiser.v2 = function callee2(config2 = callee2.defaultConfig) {
  let oldFunc;
  if ("function" == typeof config2) {
    oldFunc = config2;
    config2 = {};
  } else if ("function" === typeof config2?.onready) {
    oldFunc = config2.onready;
    delete config2.onready;
  }
  const promiseProxy = /* @__PURE__ */ Object.create(null);
  config2 = Object.assign(config2 || /* @__PURE__ */ Object.create(null), { onready: async function(func) {
    try {
      if (oldFunc) await oldFunc(func);
      promiseProxy.resolve(func);
    } catch (e4) {
      promiseProxy.reject(e4);
    }
  } });
  const p2 = new Promise(function(resolve, reject) {
    promiseProxy.resolve = resolve;
    promiseProxy.reject = reject;
  });
  try {
    this.original(config2);
  } catch (e4) {
    promiseProxy.reject(e4);
  }
  return p2;
}.bind({ original: sqlite3Worker1Promiser });
globalThis.sqlite3Worker1Promiser.v2.defaultConfig = globalThis.sqlite3Worker1Promiser.defaultConfig;
var sqlite3_worker1_promiser_default = sqlite3Worker1Promiser.v2;
delete globalThis.sqlite3Worker1Promiser;
var sqlite3InitModule = sqlite3_bundler_friendly_default;

// dist/build-worker.mjs
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var MAX_32_BITS;
var MAX_16_BITS;
var MAX_8_BITS;
var COMPRESSION_METHOD_DEFLATE;
var COMPRESSION_METHOD_DEFLATE_64;
var COMPRESSION_METHOD_STORE;
var COMPRESSION_METHOD_AES;
var LOCAL_FILE_HEADER_SIGNATURE;
var SPLIT_ZIP_FILE_SIGNATURE;
var TEMPORARY_SPLIT_ZIP_FILE_SIGNATURE;
var DATA_DESCRIPTOR_RECORD_SIGNATURE;
var ARCHIVE_EXTRA_DATA_SIGNATURE;
var DIGITAL_SIGNATURE_RECORD_SIGNATURE;
var CENTRAL_FILE_HEADER_SIGNATURE;
var END_OF_CENTRAL_DIR_SIGNATURE;
var ZIP64_END_OF_CENTRAL_DIR_SIGNATURE;
var ZIP64_END_OF_CENTRAL_DIR_LOCATOR_SIGNATURE;
var CENTRAL_FILE_HEADER_LENGTH;
var END_OF_CENTRAL_DIR_LENGTH;
var ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH;
var ZIP64_END_OF_CENTRAL_DIR_LENGTH;
var ZIP64_END_OF_CENTRAL_DIR_TOTAL_LENGTH;
var DATA_DESCRIPTOR_RECORD_LENGTH;
var DATA_DESCRIPTOR_RECORD_ZIP_64_LENGTH;
var DATA_DESCRIPTOR_RECORD_SIGNATURE_LENGTH;
var SPLIT_ZIP_FILE_SIGNATURE_LENGTH;
var EXTRAFIELD_TYPE_ZIP64;
var EXTRAFIELD_TYPE_AES;
var EXTRAFIELD_TYPE_NTFS;
var EXTRAFIELD_TYPE_NTFS_TAG1;
var EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP;
var EXTRAFIELD_TYPE_UNICODE_PATH;
var EXTRAFIELD_TYPE_UNICODE_COMMENT;
var EXTRAFIELD_TYPE_USDZ;
var EXTRAFIELD_TYPE_INFOZIP;
var EXTRAFIELD_TYPE_UNIX;
var EXTRAFIELD_TYPE_UNIX_TYPE1;
var EXTRAFIELD_TYPE_PKWARE_UNIX;
var BITFLAG_ENCRYPTED;
var BITFLAG_LEVEL;
var BITFLAG_LEVEL_MAX_MASK;
var BITFLAG_LEVEL_FAST_MASK;
var BITFLAG_LEVEL_SUPER_FAST_MASK;
var BITFLAG_DATA_DESCRIPTOR;
var BITFLAG_COMPRESSED_PATCHED_DATA;
var BITFLAG_STRONG_ENCRYPTION;
var BITFLAG_LANG_ENCODING_FLAG;
var BITFLAG_MASKED_LOCAL_HEADERS;
var FILE_ATTR_MSDOS_DIR_MASK;
var FILE_ATTR_MSDOS_READONLY_MASK;
var FILE_ATTR_MSDOS_HIDDEN_MASK;
var FILE_ATTR_MSDOS_SYSTEM_MASK;
var FILE_ATTR_MSDOS_ARCHIVE_MASK;
var FILE_ATTR_UNIX_TYPE_MASK;
var FILE_ATTR_UNIX_TYPE_DIR;
var FILE_ATTR_UNIX_TYPE_SYMLINK;
var FILE_ATTR_UNIX_TYPE_FILE;
var FILE_ATTR_UNIX_EXECUTABLE_MASK;
var FILE_ATTR_UNIX_DEFAULT_MASK;
var FILE_ATTR_UNIX_SETUID_MASK;
var FILE_ATTR_UNIX_SETGID_MASK;
var FILE_ATTR_UNIX_STICKY_MASK;
var VERSION_STORE;
var VERSION_DEFLATE;
var VERSION_ZIP64;
var VERSION_AES;
var VERSION_MADE_BY_MSDOS;
var VERSION_MADE_BY_UNIX;
var DIRECTORY_SIGNATURE;
var HEADER_SIZE;
var HEADER_OFFSET_VERSION;
var HEADER_OFFSET_SIGNATURE;
var HEADER_OFFSET_COMPRESSED_SIZE;
var HEADER_OFFSET_UNCOMPRESSED_SIZE;
var HEADER_OFFSET_FILENAME_LENGTH;
var HEADER_OFFSET_EXTRAFIELD_LENGTH;
var LOCAL_HEADER_COMMON_OFFSET;
var MAX_DATE;
var MIN_DATE;
var UNDEFINED_VALUE;
var INFINITY_VALUE;
var ERR_LOCAL_FILE_HEADER_NOT_FOUND;
var ERR_OVERLAPPING_ENTRY;
var ERR_EXTRAFIELD_ZIP64_NOT_FOUND;
var UNDEFINED_TYPE;
var FUNCTION_TYPE;
var OBJECT_TYPE;
var STRING_TYPE;
var NUMBER_TYPE;
var BOOLEAN_TYPE;
var EMPTY_UINT8_ARRAY;
var SYMBOL_ASYNC_DISPOSE;
var init_constants = __esm({
  "node_modules/@zip.js/zip.js/lib/core/constants.js"() {
    MAX_32_BITS = 4294967295;
    MAX_16_BITS = 65535;
    MAX_8_BITS = 255;
    COMPRESSION_METHOD_DEFLATE = 8;
    COMPRESSION_METHOD_DEFLATE_64 = 9;
    COMPRESSION_METHOD_STORE = 0;
    COMPRESSION_METHOD_AES = 99;
    LOCAL_FILE_HEADER_SIGNATURE = 67324752;
    SPLIT_ZIP_FILE_SIGNATURE = 134695760;
    TEMPORARY_SPLIT_ZIP_FILE_SIGNATURE = 808471376;
    DATA_DESCRIPTOR_RECORD_SIGNATURE = SPLIT_ZIP_FILE_SIGNATURE;
    ARCHIVE_EXTRA_DATA_SIGNATURE = 134630224;
    DIGITAL_SIGNATURE_RECORD_SIGNATURE = 84233040;
    CENTRAL_FILE_HEADER_SIGNATURE = 33639248;
    END_OF_CENTRAL_DIR_SIGNATURE = 101010256;
    ZIP64_END_OF_CENTRAL_DIR_SIGNATURE = 101075792;
    ZIP64_END_OF_CENTRAL_DIR_LOCATOR_SIGNATURE = 117853008;
    CENTRAL_FILE_HEADER_LENGTH = 46;
    END_OF_CENTRAL_DIR_LENGTH = 22;
    ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH = 20;
    ZIP64_END_OF_CENTRAL_DIR_LENGTH = 56;
    ZIP64_END_OF_CENTRAL_DIR_TOTAL_LENGTH = END_OF_CENTRAL_DIR_LENGTH + ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH + ZIP64_END_OF_CENTRAL_DIR_LENGTH;
    DATA_DESCRIPTOR_RECORD_LENGTH = 12;
    DATA_DESCRIPTOR_RECORD_ZIP_64_LENGTH = 20;
    DATA_DESCRIPTOR_RECORD_SIGNATURE_LENGTH = 4;
    SPLIT_ZIP_FILE_SIGNATURE_LENGTH = 4;
    EXTRAFIELD_TYPE_ZIP64 = 1;
    EXTRAFIELD_TYPE_AES = 39169;
    EXTRAFIELD_TYPE_NTFS = 10;
    EXTRAFIELD_TYPE_NTFS_TAG1 = 1;
    EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP = 21589;
    EXTRAFIELD_TYPE_UNICODE_PATH = 28789;
    EXTRAFIELD_TYPE_UNICODE_COMMENT = 25461;
    EXTRAFIELD_TYPE_USDZ = 6534;
    EXTRAFIELD_TYPE_INFOZIP = 30837;
    EXTRAFIELD_TYPE_UNIX = 30805;
    EXTRAFIELD_TYPE_UNIX_TYPE1 = 22613;
    EXTRAFIELD_TYPE_PKWARE_UNIX = 13;
    BITFLAG_ENCRYPTED = 1;
    BITFLAG_LEVEL = 6;
    BITFLAG_LEVEL_MAX_MASK = 2;
    BITFLAG_LEVEL_FAST_MASK = 4;
    BITFLAG_LEVEL_SUPER_FAST_MASK = 6;
    BITFLAG_DATA_DESCRIPTOR = 8;
    BITFLAG_COMPRESSED_PATCHED_DATA = 32;
    BITFLAG_STRONG_ENCRYPTION = 64;
    BITFLAG_LANG_ENCODING_FLAG = 2048;
    BITFLAG_MASKED_LOCAL_HEADERS = 8192;
    FILE_ATTR_MSDOS_DIR_MASK = 16;
    FILE_ATTR_MSDOS_READONLY_MASK = 1;
    FILE_ATTR_MSDOS_HIDDEN_MASK = 2;
    FILE_ATTR_MSDOS_SYSTEM_MASK = 4;
    FILE_ATTR_MSDOS_ARCHIVE_MASK = 32;
    FILE_ATTR_UNIX_TYPE_MASK = 61440;
    FILE_ATTR_UNIX_TYPE_DIR = 16384;
    FILE_ATTR_UNIX_TYPE_SYMLINK = 40960;
    FILE_ATTR_UNIX_TYPE_FILE = 32768;
    FILE_ATTR_UNIX_EXECUTABLE_MASK = 73;
    FILE_ATTR_UNIX_DEFAULT_MASK = 420;
    FILE_ATTR_UNIX_SETUID_MASK = 2048;
    FILE_ATTR_UNIX_SETGID_MASK = 1024;
    FILE_ATTR_UNIX_STICKY_MASK = 512;
    VERSION_STORE = 10;
    VERSION_DEFLATE = 20;
    VERSION_ZIP64 = 45;
    VERSION_AES = 51;
    VERSION_MADE_BY_MSDOS = 20;
    VERSION_MADE_BY_UNIX = 768;
    DIRECTORY_SIGNATURE = "/";
    HEADER_SIZE = 30;
    HEADER_OFFSET_VERSION = 0;
    HEADER_OFFSET_SIGNATURE = 10;
    HEADER_OFFSET_COMPRESSED_SIZE = 14;
    HEADER_OFFSET_UNCOMPRESSED_SIZE = 18;
    HEADER_OFFSET_FILENAME_LENGTH = 22;
    HEADER_OFFSET_EXTRAFIELD_LENGTH = 24;
    LOCAL_HEADER_COMMON_OFFSET = 4;
    MAX_DATE = new Date(2107, 11, 31, 23, 59, 58);
    MIN_DATE = new Date(1980, 0, 1);
    UNDEFINED_VALUE = void 0;
    INFINITY_VALUE = Infinity;
    ERR_LOCAL_FILE_HEADER_NOT_FOUND = "Local file header not found";
    ERR_OVERLAPPING_ENTRY = "Overlapping entry found";
    ERR_EXTRAFIELD_ZIP64_NOT_FOUND = "Zip64 extra field not found";
    UNDEFINED_TYPE = "undefined";
    FUNCTION_TYPE = "function";
    OBJECT_TYPE = "object";
    STRING_TYPE = "string";
    NUMBER_TYPE = "number";
    BOOLEAN_TYPE = "boolean";
    EMPTY_UINT8_ARRAY = new Uint8Array();
    SYMBOL_ASYNC_DISPOSE = Symbol.asyncDispose || Symbol();
  }
});
function checkFunctionOption(value) {
  if (value && typeof value != FUNCTION_TYPE) {
    throw new Error(ERR_INVALID_FUNCTION_OPTION);
  }
  return value;
}
function checkReaderOptionsObject(readerOptions) {
  if (readerOptions && (typeof readerOptions != OBJECT_TYPE || Array.isArray(readerOptions))) {
    throw new Error(ERR_INVALID_READER_OPTIONS);
  }
  return readerOptions;
}
function checkSignalOption(signal) {
  if (signal && (typeof signal.addEventListener != FUNCTION_TYPE || typeof signal.aborted != BOOLEAN_TYPE)) {
    throw new Error(ERR_INVALID_SIGNAL);
  }
  return signal || UNDEFINED_VALUE;
}
function throwIfAborted(signal) {
  if (signal && signal.aborted) {
    throw signal.reason === UNDEFINED_VALUE ? new DOMException(ERR_ABORTED, ABORT_ERROR_NAME) : signal.reason;
  }
}
function checkPasswordOption(password, rawPassword) {
  if (password && typeof password != STRING_TYPE || rawPassword && !(rawPassword instanceof Uint8Array)) {
    throw new Error(ERR_INVALID_PASSWORD_TYPE);
  }
}
function checkPassThroughOption(passThrough) {
  if (passThrough !== UNDEFINED_VALUE && typeof passThrough != BOOLEAN_TYPE && passThrough !== PASS_THROUGH_COMPRESSED) {
    throw new Error(ERR_INVALID_PASS_THROUGH_VALUE);
  }
  return passThrough;
}
function checkInteger(value, maxValue, errorMessage) {
  if (!Number.isInteger(value) || value < 0 || value > maxValue) {
    throw new Error(errorMessage);
  }
}
function checkIntegerOption(value, maxValue, errorMessage) {
  if (value !== UNDEFINED_VALUE) {
    checkInteger(value, maxValue, errorMessage);
  }
}
function toNumber(value) {
  return typeof value == STRING_TYPE && value.trim() ? Number(value) : value;
}
var OPTION_FILENAME_ENCODING;
var OPTION_COMMENT_ENCODING;
var OPTION_DECODE_TEXT;
var OPTION_EXTRACT_PREPENDED_DATA;
var OPTION_EXTRACT_APPENDED_DATA;
var OPTION_PASSWORD;
var OPTION_RAW_PASSWORD;
var OPTION_PASS_THROUGH;
var OPTION_SIGNAL;
var OPTION_CHECK_PASSWORD_ONLY;
var OPTION_CHECK_OVERLAPPING_ENTRY_ONLY;
var OPTION_CHECK_OVERLAPPING_ENTRY;
var OPTION_CHECK_AMBIGUITY;
var OPTION_CHECK_LOCAL_DIRECTORY;
var OPTION_CHECK_LOCAL_FILENAME;
var OPTION_CHECK_SIGNATURE;
var OPTION_CHECK_CRC32;
var OPTION_CHECK_AUTHENTICATION_CODE;
var OPTION_USE_WEB_WORKERS;
var OPTION_USE_COMPRESSION_STREAM;
var OPTION_PREVENT_CLOSE;
var OPTION_ENCRYPTION_STRENGTH;
var OPTION_EXTENDED_TIMESTAMP;
var OPTION_NTFS_TIMESTAMP;
var OPTION_KEEP_ORDER;
var OPTION_LEVEL;
var OPTION_BUFFERED_WRITE;
var OPTION_CREATE_TEMP_STREAM;
var OPTION_DATA_DESCRIPTOR_SIGNATURE;
var OPTION_USE_UNICODE_FILE_NAMES;
var OPTION_DATA_DESCRIPTOR;
var OPTION_SUPPORT_ZIP64_SPLIT_FILE;
var OPTION_ENCODE_TEXT;
var OPTION_OFFSET;
var OPTION_USDZ;
var OPTION_UNIX_EXTRA_FIELD_TYPE;
var OPTION_LOCAL_EXTRA_FIELD;
var OPTION_CENTRAL_EXTRA_FIELD;
var OPTION_STRICTNESS;
var OPTION_FILENAME_VALIDATION;
var OPTION_NORMALIZE_FILENAME;
var OPTION_MAX_APPENDED_DATA_SIZE;
var OPTION_DECRYPT_CENTRAL_DIRECTORY;
var OPTION_SIGN_CENTRAL_DIRECTORY;
var OPTION_ENTRY;
var TEXT_TYPE_FILENAME;
var TEXT_TYPE_COMMENT;
var STRICTNESS_STRICT;
var STRICTNESS_BALANCED;
var STRICTNESS_TOLERANT;
var PASS_THROUGH_COMPRESSED;
var ERR_INVALID_FUNCTION_OPTION;
var ERR_INVALID_SIGNAL;
var ERR_INVALID_PASSWORD_TYPE;
var ERR_INVALID_PASS_THROUGH_VALUE;
var ERR_INVALID_READER_OPTIONS;
var ERR_ABORTED;
var ABORT_ERROR_NAME;
var init_options = __esm({
  "node_modules/@zip.js/zip.js/lib/core/options.js"() {
    init_constants();
    OPTION_FILENAME_ENCODING = "filenameEncoding";
    OPTION_COMMENT_ENCODING = "commentEncoding";
    OPTION_DECODE_TEXT = "decodeText";
    OPTION_EXTRACT_PREPENDED_DATA = "extractPrependedData";
    OPTION_EXTRACT_APPENDED_DATA = "extractAppendedData";
    OPTION_PASSWORD = "password";
    OPTION_RAW_PASSWORD = "rawPassword";
    OPTION_PASS_THROUGH = "passThrough";
    OPTION_SIGNAL = "signal";
    OPTION_CHECK_PASSWORD_ONLY = "checkPasswordOnly";
    OPTION_CHECK_OVERLAPPING_ENTRY_ONLY = "checkOverlappingEntryOnly";
    OPTION_CHECK_OVERLAPPING_ENTRY = "checkOverlappingEntry";
    OPTION_CHECK_AMBIGUITY = "checkAmbiguity";
    OPTION_CHECK_LOCAL_DIRECTORY = "checkLocalDirectory";
    OPTION_CHECK_LOCAL_FILENAME = "checkLocalFilename";
    OPTION_CHECK_SIGNATURE = "checkSignature";
    OPTION_CHECK_CRC32 = "checkCrc32";
    OPTION_CHECK_AUTHENTICATION_CODE = "checkAuthenticationCode";
    OPTION_USE_WEB_WORKERS = "useWebWorkers";
    OPTION_USE_COMPRESSION_STREAM = "useCompressionStream";
    OPTION_PREVENT_CLOSE = "preventClose";
    OPTION_ENCRYPTION_STRENGTH = "encryptionStrength";
    OPTION_EXTENDED_TIMESTAMP = "extendedTimestamp";
    OPTION_NTFS_TIMESTAMP = "ntfsTimestamp";
    OPTION_KEEP_ORDER = "keepOrder";
    OPTION_LEVEL = "level";
    OPTION_BUFFERED_WRITE = "bufferedWrite";
    OPTION_CREATE_TEMP_STREAM = "createTempStream";
    OPTION_DATA_DESCRIPTOR_SIGNATURE = "dataDescriptorSignature";
    OPTION_USE_UNICODE_FILE_NAMES = "useUnicodeFileNames";
    OPTION_DATA_DESCRIPTOR = "dataDescriptor";
    OPTION_SUPPORT_ZIP64_SPLIT_FILE = "supportZip64SplitFile";
    OPTION_ENCODE_TEXT = "encodeText";
    OPTION_OFFSET = "offset";
    OPTION_USDZ = "usdz";
    OPTION_UNIX_EXTRA_FIELD_TYPE = "unixExtraFieldType";
    OPTION_LOCAL_EXTRA_FIELD = "localExtraField";
    OPTION_CENTRAL_EXTRA_FIELD = "centralExtraField";
    OPTION_STRICTNESS = "strictness";
    OPTION_FILENAME_VALIDATION = "filenameValidation";
    OPTION_NORMALIZE_FILENAME = "normalizeFilename";
    OPTION_MAX_APPENDED_DATA_SIZE = "maxAppendedDataSize";
    OPTION_DECRYPT_CENTRAL_DIRECTORY = "decryptCentralDirectory";
    OPTION_SIGN_CENTRAL_DIRECTORY = "signCentralDirectory";
    OPTION_ENTRY = "entry";
    TEXT_TYPE_FILENAME = "filename";
    TEXT_TYPE_COMMENT = "comment";
    STRICTNESS_STRICT = "strict";
    STRICTNESS_BALANCED = "balanced";
    STRICTNESS_TOLERANT = "tolerant";
    PASS_THROUGH_COMPRESSED = "compressed";
    ERR_INVALID_FUNCTION_OPTION = "Invalid option (must be a function)";
    ERR_INVALID_SIGNAL = "Invalid signal (must be an AbortSignal instance)";
    ERR_INVALID_PASSWORD_TYPE = "Invalid password (password must be a string, rawPassword must be a Uint8Array)";
    ERR_INVALID_PASS_THROUGH_VALUE = "Invalid passThrough option (must be a boolean or 'compressed')";
    ERR_INVALID_READER_OPTIONS = "Invalid readerOptions (must be an object)";
    ERR_ABORTED = "The operation was aborted";
    ABORT_ERROR_NAME = "AbortError";
  }
});
function getConfiguration() {
  return config;
}
function getChunkSize(config2) {
  return normalizeChunkSize(config2.chunkSize);
}
function normalizeChunkSize(chunkSize) {
  chunkSize = toNumber(chunkSize);
  return Number.isInteger(chunkSize) && chunkSize >= MINIMUM_PROPERTY_VALUE ? Math.max(chunkSize, MINIMUM_CHUNK_SIZE) : DEFAULT_CHUNK_SIZE;
}
function checkConfiguration(configuration) {
  const checkedConfiguration = {};
  for (const propertyName of CONFIGURABLE_PROPERTY_NAMES) {
    const propertyValue = configuration[propertyName];
    if (propertyValue !== UNDEFINED_VALUE) {
      checkedConfiguration[propertyName] = checkPropertyValue(propertyName, propertyValue);
    }
  }
  return checkedConfiguration;
}
function checkPropertyValue(propertyName, propertyValue) {
  if (NUMBER_PROPERTY_NAMES.includes(propertyName)) {
    propertyValue = toNumber(propertyValue);
    if (propertyName == PROPERTY_NAME_MAX_WORKERS && (!Number.isInteger(propertyValue) || propertyValue < MINIMUM_PROPERTY_VALUE)) {
      throw new Error(ERR_INVALID_MAX_WORKERS);
    }
  } else if (FUNCTION_PROPERTY_NAMES.includes(propertyName)) {
    checkFunctionOption(propertyValue);
  } else if (propertyName == PROPERTY_NAME_BASE_URI) {
    if (propertyValue && typeof propertyValue != STRING_TYPE) {
      throw new Error(ERR_INVALID_BASE_URI);
    }
  } else if (URI_PROPERTY_NAMES.includes(propertyName)) {
    if (propertyValue && typeof propertyValue != STRING_TYPE && typeof propertyValue != FUNCTION_TYPE) {
      throw new Error(ERR_INVALID_URI);
    }
  }
  return propertyValue;
}
function normalizeConfiguration(configuration) {
  configuration = configuration || {};
  const { CompressionStreamZlib: CompressionStreamZlib2, DecompressionStreamZlib: DecompressionStreamZlib2 } = configuration;
  if (CompressionStreamZlib2 === UNDEFINED_VALUE && DecompressionStreamZlib2 === UNDEFINED_VALUE) {
    return configuration;
  }
  const normalizedConfiguration = Object.assign({}, configuration);
  if (normalizedConfiguration.CompressionStreamFallback === UNDEFINED_VALUE) {
    normalizedConfiguration.CompressionStreamFallback = CompressionStreamZlib2;
  }
  if (normalizedConfiguration.DecompressionStreamFallback === UNDEFINED_VALUE) {
    normalizedConfiguration.DecompressionStreamFallback = DecompressionStreamZlib2;
  }
  return normalizedConfiguration;
}
function setDefaultConfiguration(configuration) {
  const checkedConfiguration = checkConfiguration(normalizeConfiguration(configuration));
  Object.assign(DEFAULT_CONFIGURATION, checkedConfiguration);
  Object.assign(config, checkedConfiguration);
}
var DEFAULT_CHUNK_SIZE;
var MINIMUM_CHUNK_SIZE;
var MINIMUM_PROPERTY_VALUE;
var ERR_INVALID_MAX_WORKERS;
var ERR_INVALID_BASE_URI;
var ERR_INVALID_URI;
var maxWorkers;
var DEFAULT_CONFIGURATION;
var PROPERTY_NAME_MAX_WORKERS;
var PROPERTY_NAME_BASE_URI;
var URI_PROPERTY_NAMES;
var BOOLEAN_PROPERTY_NAMES;
var NUMBER_PROPERTY_NAMES;
var FUNCTION_PROPERTY_NAMES;
var CONFIGURABLE_PROPERTY_NAMES;
var config;
var init_configuration = __esm({
  "node_modules/@zip.js/zip.js/lib/core/configuration.js"() {
    init_constants();
    init_options();
    DEFAULT_CHUNK_SIZE = 256 * 1024;
    MINIMUM_CHUNK_SIZE = 64;
    MINIMUM_PROPERTY_VALUE = 1;
    ERR_INVALID_MAX_WORKERS = "Invalid maxWorkers (must be an integer greater than 0)";
    ERR_INVALID_BASE_URI = "Invalid baseURI (must be a string)";
    ERR_INVALID_URI = "Invalid URI (must be a string or a function returning a string)";
    maxWorkers = 2;
    try {
      if (typeof navigator != UNDEFINED_TYPE && navigator.hardwareConcurrency) {
        maxWorkers = navigator.hardwareConcurrency;
      }
    } catch {
    }
    DEFAULT_CONFIGURATION = {
      workerURI: "./core/web-worker-wasm.js",
      wasmURI: "./core/streams/zlib-wasm/zlib-streams.wasm",
      chunkSize: DEFAULT_CHUNK_SIZE,
      maxWorkers,
      terminateWorkerTimeout: 5e3,
      workerStarvationTimeout: 5e3,
      workerStartupTimeout: 5e3,
      useWebWorkers: true,
      useCompressionStream: true,
      CompressionStream: typeof CompressionStream != UNDEFINED_TYPE && CompressionStream,
      DecompressionStream: typeof DecompressionStream != UNDEFINED_TYPE && DecompressionStream
    };
    PROPERTY_NAME_MAX_WORKERS = "maxWorkers";
    PROPERTY_NAME_BASE_URI = "baseURI";
    URI_PROPERTY_NAMES = [
      "wasmURI",
      "workerURI"
    ];
    BOOLEAN_PROPERTY_NAMES = [
      "useCompressionStream",
      "useWebWorkers"
    ];
    NUMBER_PROPERTY_NAMES = [
      "chunkSize",
      PROPERTY_NAME_MAX_WORKERS,
      "terminateWorkerTimeout",
      "workerStarvationTimeout",
      "workerStartupTimeout"
    ];
    FUNCTION_PROPERTY_NAMES = [
      "createWorker",
      "CompressionStream",
      "DecompressionStream",
      "CompressionStreamFallback",
      "DecompressionStreamFallback"
    ];
    CONFIGURABLE_PROPERTY_NAMES = [
      PROPERTY_NAME_BASE_URI,
      ...URI_PROPERTY_NAMES,
      ...BOOLEAN_PROPERTY_NAMES,
      ...NUMBER_PROPERTY_NAMES,
      ...FUNCTION_PROPERTY_NAMES
    ];
    config = { ...DEFAULT_CONFIGURATION };
  }
});
function concat(first, second) {
  const result = new Uint8Array(first.length + second.length);
  result.set(first);
  result.set(second, first.length);
  return result;
}
function toExactUint8Array(array) {
  return array.byteOffset || array.byteLength != array.buffer.byteLength ? new Uint8Array(array) : array;
}
function getDataView(array) {
  return new DataView(array.buffer, array.byteOffset, array.byteLength);
}
var init_array = __esm({
  "node_modules/@zip.js/zip.js/lib/core/util/array.js"() {
  }
});
function isErrorObject(error) {
  return Boolean(error) && typeof error == "object";
}
var init_error = __esm({
  "node_modules/@zip.js/zip.js/lib/core/util/error.js"() {
  }
});
var T;
var T0;
var T1;
var T2;
var T3;
var T4;
var T5;
var T6;
var T7;
var Crc32;
var init_crc32 = __esm({
  "node_modules/@zip.js/zip.js/lib/core/streams/codecs/crc32.js"() {
    T = [[], [], [], [], [], [], [], []];
    for (let n3 = 0; n3 < 256; n3++) {
      let t4 = n3;
      for (let j = 0; j < 8; j++) {
        t4 = t4 & 1 ? t4 >>> 1 ^ 3988292384 : t4 >>> 1;
      }
      T[0][n3] = t4;
    }
    for (let n3 = 0; n3 < 256; n3++) {
      for (let k2 = 1; k2 < 8; k2++) {
        const previous = T[k2 - 1][n3];
        T[k2][n3] = previous >>> 8 ^ T[0][previous & 255];
      }
    }
    [T0, T1, T2, T3, T4, T5, T6, T7] = T;
    Crc32 = class {
      constructor(crc) {
        this.crc = crc || -1;
      }
      append(data) {
        let crc = this.crc | 0;
        const length = data.length | 0;
        let offset = 0;
        if (length >= 8 && data.buffer) {
          const view = new DataView(data.buffer, data.byteOffset, length);
          const end = length - 8;
          for (; offset <= end; offset += 8) {
            const a = crc ^ view.getInt32(offset, true);
            const b2 = view.getInt32(offset + 4, true);
            crc = T7[a & 255] ^ T6[a >>> 8 & 255] ^ T5[a >>> 16 & 255] ^ T4[a >>> 24 & 255] ^ T3[b2 & 255] ^ T2[b2 >>> 8 & 255] ^ T1[b2 >>> 16 & 255] ^ T0[b2 >>> 24 & 255];
          }
        }
        for (; offset < length; offset++) {
          crc = crc >>> 8 ^ T0[(crc ^ data[offset]) & 255];
        }
        this.crc = crc;
      }
      get() {
        return ~this.crc;
      }
    };
  }
});
var Crc32Stream;
var init_crc32_stream = __esm({
  "node_modules/@zip.js/zip.js/lib/core/streams/crc32-stream.js"() {
    init_crc32();
    Crc32Stream = class extends TransformStream {
      constructor() {
        let stream;
        const crc32 = new Crc32();
        super({
          transform(chunk, controller) {
            crc32.append(chunk);
            controller.enqueue(chunk);
          },
          flush() {
            const value = new Uint8Array(4);
            const dataView = new DataView(value.buffer);
            dataView.setUint32(0, crc32.get());
            stream.value = value;
          }
        });
        stream = this;
      }
    };
  }
});
function encodeText(value) {
  if (typeof TextEncoder == UNDEFINED_TYPE) {
    value = unescape(encodeURIComponent(value));
    const result = new Uint8Array(value.length);
    for (let i = 0; i < result.length; i++) {
      result[i] = value.charCodeAt(i);
    }
    return result;
  } else {
    return new TextEncoder().encode(value);
  }
}
var init_encode_text = __esm({
  "node_modules/@zip.js/zip.js/lib/core/util/encode-text.js"() {
    init_constants();
  }
});
function createEngine(key, authenticationKey) {
  initTables();
  const roundKeys = new Int32Array(ROUND_KEYS_LENGTH);
  const rounds = expandKey(key, roundKeys);
  const keystream = new Int32Array(BLOCK_LENGTH / 4);
  const hmac = createHmac(authenticationKey);
  let counter0 = 0;
  let counter1 = 0;
  let counter2 = 0;
  let counter3 = 0;
  return {
    process(data, decrypt2) {
      if (decrypt2) {
        hmac.update(data, 0, data.length);
      }
      encrypt2(data);
      if (!decrypt2) {
        hmac.update(data, 0, data.length);
      }
    },
    digest() {
      return hmac.digest();
    }
  };
  function encrypt2(data) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const length = data.length;
    let offset = 0;
    for (; offset + BLOCK_LENGTH <= length; offset += BLOCK_LENGTH) {
      nextKeystream();
      view.setInt32(offset, view.getInt32(offset) ^ keystream[0]);
      view.setInt32(offset + 4, view.getInt32(offset + 4) ^ keystream[1]);
      view.setInt32(offset + 8, view.getInt32(offset + 8) ^ keystream[2]);
      view.setInt32(offset + 12, view.getInt32(offset + 12) ^ keystream[3]);
    }
    if (offset < length) {
      nextKeystream();
      for (let indexByte = 0; offset < length; offset++, indexByte++) {
        data[offset] ^= keystream[indexByte >> 2] >>> 24 - 8 * (indexByte & 3);
      }
    }
  }
  function nextKeystream() {
    counter0 = counter0 + 1 | 0;
    if (!counter0) {
      counter1 = counter1 + 1 | 0;
      if (!counter1) {
        counter2 = counter2 + 1 | 0;
        if (!counter2) {
          counter3 = counter3 + 1 | 0;
        }
      }
    }
    let s0 = swapBytes(counter0) ^ roundKeys[0];
    let s1 = swapBytes(counter1) ^ roundKeys[1];
    let s2 = swapBytes(counter2) ^ roundKeys[2];
    let s3 = swapBytes(counter3) ^ roundKeys[3];
    let t0 = T02[s0 >>> 24] ^ T12[s1 >>> 16 & 255] ^ T22[s2 >>> 8 & 255] ^ T32[s3 & 255] ^ roundKeys[4];
    let t1 = T02[s1 >>> 24] ^ T12[s2 >>> 16 & 255] ^ T22[s3 >>> 8 & 255] ^ T32[s0 & 255] ^ roundKeys[5];
    let t22 = T02[s2 >>> 24] ^ T12[s3 >>> 16 & 255] ^ T22[s0 >>> 8 & 255] ^ T32[s1 & 255] ^ roundKeys[6];
    let t32 = T02[s3 >>> 24] ^ T12[s0 >>> 16 & 255] ^ T22[s1 >>> 8 & 255] ^ T32[s2 & 255] ^ roundKeys[7];
    s0 = T02[t0 >>> 24] ^ T12[t1 >>> 16 & 255] ^ T22[t22 >>> 8 & 255] ^ T32[t32 & 255] ^ roundKeys[8];
    s1 = T02[t1 >>> 24] ^ T12[t22 >>> 16 & 255] ^ T22[t32 >>> 8 & 255] ^ T32[t0 & 255] ^ roundKeys[9];
    s2 = T02[t22 >>> 24] ^ T12[t32 >>> 16 & 255] ^ T22[t0 >>> 8 & 255] ^ T32[t1 & 255] ^ roundKeys[10];
    s3 = T02[t32 >>> 24] ^ T12[t0 >>> 16 & 255] ^ T22[t1 >>> 8 & 255] ^ T32[t22 & 255] ^ roundKeys[11];
    t0 = T02[s0 >>> 24] ^ T12[s1 >>> 16 & 255] ^ T22[s2 >>> 8 & 255] ^ T32[s3 & 255] ^ roundKeys[12];
    t1 = T02[s1 >>> 24] ^ T12[s2 >>> 16 & 255] ^ T22[s3 >>> 8 & 255] ^ T32[s0 & 255] ^ roundKeys[13];
    t22 = T02[s2 >>> 24] ^ T12[s3 >>> 16 & 255] ^ T22[s0 >>> 8 & 255] ^ T32[s1 & 255] ^ roundKeys[14];
    t32 = T02[s3 >>> 24] ^ T12[s0 >>> 16 & 255] ^ T22[s1 >>> 8 & 255] ^ T32[s2 & 255] ^ roundKeys[15];
    s0 = T02[t0 >>> 24] ^ T12[t1 >>> 16 & 255] ^ T22[t22 >>> 8 & 255] ^ T32[t32 & 255] ^ roundKeys[16];
    s1 = T02[t1 >>> 24] ^ T12[t22 >>> 16 & 255] ^ T22[t32 >>> 8 & 255] ^ T32[t0 & 255] ^ roundKeys[17];
    s2 = T02[t22 >>> 24] ^ T12[t32 >>> 16 & 255] ^ T22[t0 >>> 8 & 255] ^ T32[t1 & 255] ^ roundKeys[18];
    s3 = T02[t32 >>> 24] ^ T12[t0 >>> 16 & 255] ^ T22[t1 >>> 8 & 255] ^ T32[t22 & 255] ^ roundKeys[19];
    t0 = T02[s0 >>> 24] ^ T12[s1 >>> 16 & 255] ^ T22[s2 >>> 8 & 255] ^ T32[s3 & 255] ^ roundKeys[20];
    t1 = T02[s1 >>> 24] ^ T12[s2 >>> 16 & 255] ^ T22[s3 >>> 8 & 255] ^ T32[s0 & 255] ^ roundKeys[21];
    t22 = T02[s2 >>> 24] ^ T12[s3 >>> 16 & 255] ^ T22[s0 >>> 8 & 255] ^ T32[s1 & 255] ^ roundKeys[22];
    t32 = T02[s3 >>> 24] ^ T12[s0 >>> 16 & 255] ^ T22[s1 >>> 8 & 255] ^ T32[s2 & 255] ^ roundKeys[23];
    s0 = T02[t0 >>> 24] ^ T12[t1 >>> 16 & 255] ^ T22[t22 >>> 8 & 255] ^ T32[t32 & 255] ^ roundKeys[24];
    s1 = T02[t1 >>> 24] ^ T12[t22 >>> 16 & 255] ^ T22[t32 >>> 8 & 255] ^ T32[t0 & 255] ^ roundKeys[25];
    s2 = T02[t22 >>> 24] ^ T12[t32 >>> 16 & 255] ^ T22[t0 >>> 8 & 255] ^ T32[t1 & 255] ^ roundKeys[26];
    s3 = T02[t32 >>> 24] ^ T12[t0 >>> 16 & 255] ^ T22[t1 >>> 8 & 255] ^ T32[t22 & 255] ^ roundKeys[27];
    t0 = T02[s0 >>> 24] ^ T12[s1 >>> 16 & 255] ^ T22[s2 >>> 8 & 255] ^ T32[s3 & 255] ^ roundKeys[28];
    t1 = T02[s1 >>> 24] ^ T12[s2 >>> 16 & 255] ^ T22[s3 >>> 8 & 255] ^ T32[s0 & 255] ^ roundKeys[29];
    t22 = T02[s2 >>> 24] ^ T12[s3 >>> 16 & 255] ^ T22[s0 >>> 8 & 255] ^ T32[s1 & 255] ^ roundKeys[30];
    t32 = T02[s3 >>> 24] ^ T12[s0 >>> 16 & 255] ^ T22[s1 >>> 8 & 255] ^ T32[s2 & 255] ^ roundKeys[31];
    s0 = T02[t0 >>> 24] ^ T12[t1 >>> 16 & 255] ^ T22[t22 >>> 8 & 255] ^ T32[t32 & 255] ^ roundKeys[32];
    s1 = T02[t1 >>> 24] ^ T12[t22 >>> 16 & 255] ^ T22[t32 >>> 8 & 255] ^ T32[t0 & 255] ^ roundKeys[33];
    s2 = T02[t22 >>> 24] ^ T12[t32 >>> 16 & 255] ^ T22[t0 >>> 8 & 255] ^ T32[t1 & 255] ^ roundKeys[34];
    s3 = T02[t32 >>> 24] ^ T12[t0 >>> 16 & 255] ^ T22[t1 >>> 8 & 255] ^ T32[t22 & 255] ^ roundKeys[35];
    t0 = T02[s0 >>> 24] ^ T12[s1 >>> 16 & 255] ^ T22[s2 >>> 8 & 255] ^ T32[s3 & 255] ^ roundKeys[36];
    t1 = T02[s1 >>> 24] ^ T12[s2 >>> 16 & 255] ^ T22[s3 >>> 8 & 255] ^ T32[s0 & 255] ^ roundKeys[37];
    t22 = T02[s2 >>> 24] ^ T12[s3 >>> 16 & 255] ^ T22[s0 >>> 8 & 255] ^ T32[s1 & 255] ^ roundKeys[38];
    t32 = T02[s3 >>> 24] ^ T12[s0 >>> 16 & 255] ^ T22[s1 >>> 8 & 255] ^ T32[s2 & 255] ^ roundKeys[39];
    let indexKey = 40;
    if (rounds > 10) {
      s0 = T02[t0 >>> 24] ^ T12[t1 >>> 16 & 255] ^ T22[t22 >>> 8 & 255] ^ T32[t32 & 255] ^ roundKeys[40];
      s1 = T02[t1 >>> 24] ^ T12[t22 >>> 16 & 255] ^ T22[t32 >>> 8 & 255] ^ T32[t0 & 255] ^ roundKeys[41];
      s2 = T02[t22 >>> 24] ^ T12[t32 >>> 16 & 255] ^ T22[t0 >>> 8 & 255] ^ T32[t1 & 255] ^ roundKeys[42];
      s3 = T02[t32 >>> 24] ^ T12[t0 >>> 16 & 255] ^ T22[t1 >>> 8 & 255] ^ T32[t22 & 255] ^ roundKeys[43];
      t0 = T02[s0 >>> 24] ^ T12[s1 >>> 16 & 255] ^ T22[s2 >>> 8 & 255] ^ T32[s3 & 255] ^ roundKeys[44];
      t1 = T02[s1 >>> 24] ^ T12[s2 >>> 16 & 255] ^ T22[s3 >>> 8 & 255] ^ T32[s0 & 255] ^ roundKeys[45];
      t22 = T02[s2 >>> 24] ^ T12[s3 >>> 16 & 255] ^ T22[s0 >>> 8 & 255] ^ T32[s1 & 255] ^ roundKeys[46];
      t32 = T02[s3 >>> 24] ^ T12[s0 >>> 16 & 255] ^ T22[s1 >>> 8 & 255] ^ T32[s2 & 255] ^ roundKeys[47];
      indexKey = 48;
    }
    if (rounds > 12) {
      s0 = T02[t0 >>> 24] ^ T12[t1 >>> 16 & 255] ^ T22[t22 >>> 8 & 255] ^ T32[t32 & 255] ^ roundKeys[48];
      s1 = T02[t1 >>> 24] ^ T12[t22 >>> 16 & 255] ^ T22[t32 >>> 8 & 255] ^ T32[t0 & 255] ^ roundKeys[49];
      s2 = T02[t22 >>> 24] ^ T12[t32 >>> 16 & 255] ^ T22[t0 >>> 8 & 255] ^ T32[t1 & 255] ^ roundKeys[50];
      s3 = T02[t32 >>> 24] ^ T12[t0 >>> 16 & 255] ^ T22[t1 >>> 8 & 255] ^ T32[t22 & 255] ^ roundKeys[51];
      t0 = T02[s0 >>> 24] ^ T12[s1 >>> 16 & 255] ^ T22[s2 >>> 8 & 255] ^ T32[s3 & 255] ^ roundKeys[52];
      t1 = T02[s1 >>> 24] ^ T12[s2 >>> 16 & 255] ^ T22[s3 >>> 8 & 255] ^ T32[s0 & 255] ^ roundKeys[53];
      t22 = T02[s2 >>> 24] ^ T12[s3 >>> 16 & 255] ^ T22[s0 >>> 8 & 255] ^ T32[s1 & 255] ^ roundKeys[54];
      t32 = T02[s3 >>> 24] ^ T12[s0 >>> 16 & 255] ^ T22[s1 >>> 8 & 255] ^ T32[s2 & 255] ^ roundKeys[55];
      indexKey = 56;
    }
    keystream[0] = (S_BOX[t0 >>> 24] << 24 | S_BOX[t1 >>> 16 & 255] << 16 | S_BOX[t22 >>> 8 & 255] << 8 | S_BOX[t32 & 255]) ^ roundKeys[indexKey];
    keystream[1] = (S_BOX[t1 >>> 24] << 24 | S_BOX[t22 >>> 16 & 255] << 16 | S_BOX[t32 >>> 8 & 255] << 8 | S_BOX[t0 & 255]) ^ roundKeys[indexKey + 1];
    keystream[2] = (S_BOX[t22 >>> 24] << 24 | S_BOX[t32 >>> 16 & 255] << 16 | S_BOX[t0 >>> 8 & 255] << 8 | S_BOX[t1 & 255]) ^ roundKeys[indexKey + 2];
    keystream[3] = (S_BOX[t32 >>> 24] << 24 | S_BOX[t0 >>> 16 & 255] << 16 | S_BOX[t1 >>> 8 & 255] << 8 | S_BOX[t22 & 255]) ^ roundKeys[indexKey + 3];
  }
}
function pbkdf2(password, salt, iterations, length) {
  const hmac = createHmac(password);
  const result = new Uint8Array(length);
  const block = new Uint8Array(salt.length + 4);
  const blockView = new DataView(block.buffer);
  block.set(salt);
  for (let indexBlock = 1, offset = 0; offset < length; indexBlock++, offset += SHA1_DIGEST_LENGTH) {
    blockView.setUint32(salt.length, indexBlock);
    hmac.update(block, 0, block.length);
    let previous = hmac.digest();
    const output = previous.slice();
    for (let iteration = 1; iteration < iterations; iteration++) {
      hmac.update(previous, 0, SHA1_DIGEST_LENGTH);
      previous = hmac.digest();
      for (let indexByte = 0; indexByte < SHA1_DIGEST_LENGTH; indexByte++) {
        output[indexByte] ^= previous[indexByte];
      }
    }
    result.set(output.subarray(0, Math.min(SHA1_DIGEST_LENGTH, length - offset)), offset);
  }
  return result;
}
function createHmac(key) {
  const sha1 = createSha1();
  const innerKey = new Uint8Array(SHA1_BLOCK_LENGTH);
  const outerKey = new Uint8Array(SHA1_BLOCK_LENGTH);
  if (key.length > SHA1_BLOCK_LENGTH) {
    sha1.update(key, 0, key.length);
    key = sha1.digest();
  }
  for (let indexByte = 0; indexByte < SHA1_BLOCK_LENGTH; indexByte++) {
    const keyByte = indexByte < key.length ? key[indexByte] : 0;
    innerKey[indexByte] = keyByte ^ HMAC_INNER_PADDING;
    outerKey[indexByte] = keyByte ^ HMAC_OUTER_PADDING;
  }
  sha1.update(innerKey, 0, SHA1_BLOCK_LENGTH);
  return {
    update(data, offset, length) {
      sha1.update(data, offset, length);
    },
    digest() {
      const innerDigest = sha1.digest();
      sha1.update(outerKey, 0, SHA1_BLOCK_LENGTH);
      sha1.update(innerDigest, 0, SHA1_DIGEST_LENGTH);
      const result = sha1.digest();
      sha1.update(innerKey, 0, SHA1_BLOCK_LENGTH);
      return result;
    }
  };
}
function createSha1() {
  const state = new Int32Array(SHA1_INITIAL_STATE);
  const schedule = new Int32Array(SHA1_SCHEDULE_LENGTH);
  const block = new Uint8Array(SHA1_BLOCK_LENGTH);
  const blockView = new DataView(block.buffer);
  const lengthBytes = new Uint8Array(8);
  let blockLength = 0;
  let totalLength = 0;
  return {
    update,
    digest
  };
  function update(data, offset, length) {
    const end = offset + length;
    totalLength += length;
    if (blockLength) {
      while (offset < end && blockLength < SHA1_BLOCK_LENGTH) {
        block[blockLength++] = data[offset++];
      }
      if (blockLength == SHA1_BLOCK_LENGTH) {
        compress(blockView, 0);
        blockLength = 0;
      }
    }
    if (offset + SHA1_BLOCK_LENGTH <= end) {
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      for (; offset + SHA1_BLOCK_LENGTH <= end; offset += SHA1_BLOCK_LENGTH) {
        compress(view, offset);
      }
    }
    while (offset < end) {
      block[blockLength++] = data[offset++];
    }
  }
  function digest() {
    const bits = totalLength * 8;
    const high = Math.floor(bits / 4294967296);
    const low = bits >>> 0;
    update(SHA1_PADDING, 0, 1);
    while (blockLength != SHA1_LENGTH_OFFSET) {
      update(SHA1_ZERO, 0, 1);
    }
    lengthBytes[0] = high >>> 24;
    lengthBytes[1] = high >>> 16;
    lengthBytes[2] = high >>> 8;
    lengthBytes[3] = high;
    lengthBytes[4] = low >>> 24;
    lengthBytes[5] = low >>> 16;
    lengthBytes[6] = low >>> 8;
    lengthBytes[7] = low;
    update(lengthBytes, 0, 8);
    const result = new Uint8Array(SHA1_DIGEST_LENGTH);
    const resultView = new DataView(result.buffer);
    for (let indexWord = 0; indexWord < state.length; indexWord++) {
      resultView.setInt32(4 * indexWord, state[indexWord]);
    }
    state.set(SHA1_INITIAL_STATE);
    blockLength = 0;
    totalLength = 0;
    return result;
  }
  function compress(view, offset) {
    for (let index = 0; index < 16; index++) {
      schedule[index] = view.getInt32(offset + 4 * index);
    }
    let a = state[0];
    let b2 = state[1];
    let c = state[2];
    let d = state[3];
    let e4 = state[4];
    let t4;
    for (let index = 0; index < 15; index += 5) {
      e4 = (a << 5 | a >>> 27) + ((c ^ d) & b2 ^ d) + e4 + 1518500249 + schedule[index] | 0;
      b2 = b2 << 30 | b2 >>> 2;
      d = (e4 << 5 | e4 >>> 27) + ((b2 ^ c) & a ^ c) + d + 1518500249 + schedule[index + 1] | 0;
      a = a << 30 | a >>> 2;
      c = (d << 5 | d >>> 27) + ((a ^ b2) & e4 ^ b2) + c + 1518500249 + schedule[index + 2] | 0;
      e4 = e4 << 30 | e4 >>> 2;
      b2 = (c << 5 | c >>> 27) + ((e4 ^ a) & d ^ a) + b2 + 1518500249 + schedule[index + 3] | 0;
      d = d << 30 | d >>> 2;
      a = (b2 << 5 | b2 >>> 27) + ((d ^ e4) & c ^ e4) + a + 1518500249 + schedule[index + 4] | 0;
      c = c << 30 | c >>> 2;
    }
    e4 = (a << 5 | a >>> 27) + ((c ^ d) & b2 ^ d) + e4 + 1518500249 + schedule[15] | 0;
    b2 = b2 << 30 | b2 >>> 2;
    t4 = schedule[13] ^ schedule[8] ^ schedule[2] ^ schedule[0];
    t4 = t4 << 1 | t4 >>> 31;
    schedule[0] = t4;
    d = (e4 << 5 | e4 >>> 27) + ((b2 ^ c) & a ^ c) + d + 1518500249 + t4 | 0;
    a = a << 30 | a >>> 2;
    t4 = schedule[14] ^ schedule[9] ^ schedule[3] ^ schedule[1];
    t4 = t4 << 1 | t4 >>> 31;
    schedule[1] = t4;
    c = (d << 5 | d >>> 27) + ((a ^ b2) & e4 ^ b2) + c + 1518500249 + t4 | 0;
    e4 = e4 << 30 | e4 >>> 2;
    t4 = schedule[15] ^ schedule[10] ^ schedule[4] ^ schedule[2];
    t4 = t4 << 1 | t4 >>> 31;
    schedule[2] = t4;
    b2 = (c << 5 | c >>> 27) + ((e4 ^ a) & d ^ a) + b2 + 1518500249 + t4 | 0;
    d = d << 30 | d >>> 2;
    t4 = schedule[0] ^ schedule[11] ^ schedule[5] ^ schedule[3];
    t4 = t4 << 1 | t4 >>> 31;
    schedule[3] = t4;
    a = (b2 << 5 | b2 >>> 27) + ((d ^ e4) & c ^ e4) + a + 1518500249 + t4 | 0;
    c = c << 30 | c >>> 2;
    for (let index = 20; index < 40; index += 5) {
      t4 = schedule[index - 3 & 15] ^ schedule[index - 8 & 15] ^ schedule[index - 14 & 15] ^ schedule[index & 15];
      t4 = t4 << 1 | t4 >>> 31;
      schedule[index & 15] = t4;
      e4 = (a << 5 | a >>> 27) + (b2 ^ c ^ d) + e4 + 1859775393 + t4 | 0;
      b2 = b2 << 30 | b2 >>> 2;
      t4 = schedule[index - 2 & 15] ^ schedule[index - 7 & 15] ^ schedule[index - 13 & 15] ^ schedule[index + 1 & 15];
      t4 = t4 << 1 | t4 >>> 31;
      schedule[index + 1 & 15] = t4;
      d = (e4 << 5 | e4 >>> 27) + (a ^ b2 ^ c) + d + 1859775393 + t4 | 0;
      a = a << 30 | a >>> 2;
      t4 = schedule[index - 1 & 15] ^ schedule[index - 6 & 15] ^ schedule[index - 12 & 15] ^ schedule[index + 2 & 15];
      t4 = t4 << 1 | t4 >>> 31;
      schedule[index + 2 & 15] = t4;
      c = (d << 5 | d >>> 27) + (e4 ^ a ^ b2) + c + 1859775393 + t4 | 0;
      e4 = e4 << 30 | e4 >>> 2;
      t4 = schedule[index & 15] ^ schedule[index - 5 & 15] ^ schedule[index - 11 & 15] ^ schedule[index + 3 & 15];
      t4 = t4 << 1 | t4 >>> 31;
      schedule[index + 3 & 15] = t4;
      b2 = (c << 5 | c >>> 27) + (d ^ e4 ^ a) + b2 + 1859775393 + t4 | 0;
      d = d << 30 | d >>> 2;
      t4 = schedule[index + 1 & 15] ^ schedule[index - 4 & 15] ^ schedule[index - 10 & 15] ^ schedule[index + 4 & 15];
      t4 = t4 << 1 | t4 >>> 31;
      schedule[index + 4 & 15] = t4;
      a = (b2 << 5 | b2 >>> 27) + (c ^ d ^ e4) + a + 1859775393 + t4 | 0;
      c = c << 30 | c >>> 2;
    }
    for (let index = 40; index < 60; index += 5) {
      t4 = schedule[index - 3 & 15] ^ schedule[index - 8 & 15] ^ schedule[index - 14 & 15] ^ schedule[index & 15];
      t4 = t4 << 1 | t4 >>> 31;
      schedule[index & 15] = t4;
      e4 = (a << 5 | a >>> 27) + (b2 & c | (b2 | c) & d) + e4 + 2400959708 + t4 | 0;
      b2 = b2 << 30 | b2 >>> 2;
      t4 = schedule[index - 2 & 15] ^ schedule[index - 7 & 15] ^ schedule[index - 13 & 15] ^ schedule[index + 1 & 15];
      t4 = t4 << 1 | t4 >>> 31;
      schedule[index + 1 & 15] = t4;
      d = (e4 << 5 | e4 >>> 27) + (a & b2 | (a | b2) & c) + d + 2400959708 + t4 | 0;
      a = a << 30 | a >>> 2;
      t4 = schedule[index - 1 & 15] ^ schedule[index - 6 & 15] ^ schedule[index - 12 & 15] ^ schedule[index + 2 & 15];
      t4 = t4 << 1 | t4 >>> 31;
      schedule[index + 2 & 15] = t4;
      c = (d << 5 | d >>> 27) + (e4 & a | (e4 | a) & b2) + c + 2400959708 + t4 | 0;
      e4 = e4 << 30 | e4 >>> 2;
      t4 = schedule[index & 15] ^ schedule[index - 5 & 15] ^ schedule[index - 11 & 15] ^ schedule[index + 3 & 15];
      t4 = t4 << 1 | t4 >>> 31;
      schedule[index + 3 & 15] = t4;
      b2 = (c << 5 | c >>> 27) + (d & e4 | (d | e4) & a) + b2 + 2400959708 + t4 | 0;
      d = d << 30 | d >>> 2;
      t4 = schedule[index + 1 & 15] ^ schedule[index - 4 & 15] ^ schedule[index - 10 & 15] ^ schedule[index + 4 & 15];
      t4 = t4 << 1 | t4 >>> 31;
      schedule[index + 4 & 15] = t4;
      a = (b2 << 5 | b2 >>> 27) + (c & d | (c | d) & e4) + a + 2400959708 + t4 | 0;
      c = c << 30 | c >>> 2;
    }
    for (let index = 60; index < 80; index += 5) {
      t4 = schedule[index - 3 & 15] ^ schedule[index - 8 & 15] ^ schedule[index - 14 & 15] ^ schedule[index & 15];
      t4 = t4 << 1 | t4 >>> 31;
      schedule[index & 15] = t4;
      e4 = (a << 5 | a >>> 27) + (b2 ^ c ^ d) + e4 + 3395469782 + t4 | 0;
      b2 = b2 << 30 | b2 >>> 2;
      t4 = schedule[index - 2 & 15] ^ schedule[index - 7 & 15] ^ schedule[index - 13 & 15] ^ schedule[index + 1 & 15];
      t4 = t4 << 1 | t4 >>> 31;
      schedule[index + 1 & 15] = t4;
      d = (e4 << 5 | e4 >>> 27) + (a ^ b2 ^ c) + d + 3395469782 + t4 | 0;
      a = a << 30 | a >>> 2;
      t4 = schedule[index - 1 & 15] ^ schedule[index - 6 & 15] ^ schedule[index - 12 & 15] ^ schedule[index + 2 & 15];
      t4 = t4 << 1 | t4 >>> 31;
      schedule[index + 2 & 15] = t4;
      c = (d << 5 | d >>> 27) + (e4 ^ a ^ b2) + c + 3395469782 + t4 | 0;
      e4 = e4 << 30 | e4 >>> 2;
      t4 = schedule[index & 15] ^ schedule[index - 5 & 15] ^ schedule[index - 11 & 15] ^ schedule[index + 3 & 15];
      t4 = t4 << 1 | t4 >>> 31;
      schedule[index + 3 & 15] = t4;
      b2 = (c << 5 | c >>> 27) + (d ^ e4 ^ a) + b2 + 3395469782 + t4 | 0;
      d = d << 30 | d >>> 2;
      t4 = schedule[index + 1 & 15] ^ schedule[index - 4 & 15] ^ schedule[index - 10 & 15] ^ schedule[index + 4 & 15];
      t4 = t4 << 1 | t4 >>> 31;
      schedule[index + 4 & 15] = t4;
      a = (b2 << 5 | b2 >>> 27) + (c ^ d ^ e4) + a + 3395469782 + t4 | 0;
      c = c << 30 | c >>> 2;
    }
    state[0] = state[0] + a | 0;
    state[1] = state[1] + b2 | 0;
    state[2] = state[2] + c | 0;
    state[3] = state[3] + d | 0;
    state[4] = state[4] + e4 | 0;
  }
}
function initTables() {
  if (!tablesInitialized) {
    let p2 = 1;
    let q = 1;
    do {
      p2 = (p2 ^ p2 << 1 ^ (p2 & 128 ? 27 : 0)) & 255;
      q = (q ^ q << 1) & 255;
      q = (q ^ q << 2) & 255;
      q = (q ^ q << 4) & 255;
      if (q & 128) {
        q ^= 9;
      }
      S_BOX[p2] = (q ^ (q << 1 | q >> 7) ^ (q << 2 | q >> 6) ^ (q << 3 | q >> 5) ^ (q << 4 | q >> 4) ^ 99) & 255;
    } while (p2 != 1);
    S_BOX[0] = 99;
    for (let index = 0; index < 256; index++) {
      const s2 = S_BOX[index];
      const s22 = multiplyByTwo(s2);
      const t4 = s22 << 24 | s2 << 16 | s2 << 8 | s22 ^ s2;
      T02[index] = t4;
      T12[index] = t4 >>> 8 | t4 << 24;
      T22[index] = t4 >>> 16 | t4 << 16;
      T32[index] = t4 >>> 24 | t4 << 8;
    }
    tablesInitialized = true;
  }
}
function expandKey(key, roundKeys) {
  const keyWords = key.length >> 2;
  const rounds = keyWords + 6;
  const total = 4 * (rounds + 1);
  let roundConstant = 1;
  for (let index = 0; index < keyWords; index++) {
    roundKeys[index] = key[4 * index] << 24 | key[4 * index + 1] << 16 | key[4 * index + 2] << 8 | key[4 * index + 3];
  }
  for (let index = keyWords; index < total; index++) {
    let word = roundKeys[index - 1];
    if (index % keyWords == 0) {
      word = substituteWord(word << 8 | word >>> 24) ^ roundConstant << 24;
      roundConstant = multiplyByTwo(roundConstant);
    } else if (keyWords > 6 && index % keyWords == 4) {
      word = substituteWord(word);
    }
    roundKeys[index] = roundKeys[index - keyWords] ^ word;
  }
  return rounds;
}
function substituteWord(word) {
  return S_BOX[word >>> 24] << 24 | S_BOX[word >>> 16 & 255] << 16 | S_BOX[word >>> 8 & 255] << 8 | S_BOX[word & 255];
}
function swapBytes(value) {
  return value << 24 | (value & 65280) << 8 | value >>> 8 & 65280 | value >>> 24;
}
function multiplyByTwo(value) {
  return (value << 1 ^ (value >> 7) * 27) & 255;
}
var BLOCK_LENGTH;
var ROUND_KEYS_LENGTH;
var SHA1_BLOCK_LENGTH;
var SHA1_DIGEST_LENGTH;
var SHA1_SCHEDULE_LENGTH;
var SHA1_LENGTH_OFFSET;
var SHA1_PADDING;
var SHA1_ZERO;
var SHA1_INITIAL_STATE;
var HMAC_INNER_PADDING;
var HMAC_OUTER_PADDING;
var S_BOX;
var T02;
var T12;
var T22;
var T32;
var tablesInitialized;
var init_aes_hmac_sha1 = __esm({
  "node_modules/@zip.js/zip.js/lib/core/streams/codecs/aes-hmac-sha1.js"() {
    BLOCK_LENGTH = 16;
    ROUND_KEYS_LENGTH = 60;
    SHA1_BLOCK_LENGTH = 64;
    SHA1_DIGEST_LENGTH = 20;
    SHA1_SCHEDULE_LENGTH = 16;
    SHA1_LENGTH_OFFSET = 56;
    SHA1_PADDING = new Uint8Array([128]);
    SHA1_ZERO = new Uint8Array(1);
    SHA1_INITIAL_STATE = new Int32Array([1732584193, 4023233417, 2562383102, 271733878, 3285377520]);
    HMAC_INNER_PADDING = 54;
    HMAC_OUTER_PADDING = 92;
    S_BOX = new Uint8Array(256);
    T02 = new Int32Array(256);
    T12 = new Int32Array(256);
    T22 = new Int32Array(256);
    T32 = new Int32Array(256);
    tablesInitialized = false;
  }
});
function getRandomValues(array) {
  if (GET_RANDOM_VALUES_SUPPORTED) {
    return crypto.getRandomValues(array);
  } else {
    throw new Error(ERR_UNSUPPORTED_CRYPTO_API);
  }
}
var GET_RANDOM_VALUES_SUPPORTED;
var ERR_INVALID_PASSWORD;
var ERR_INVALID_AUTHENTICATION_CODE;
var ERR_ABORT_CHECK_PASSWORD;
var ERR_UNSUPPORTED_CRYPTO_API;
var init_common_crypto = __esm({
  "node_modules/@zip.js/zip.js/lib/core/streams/common-crypto.js"() {
    init_constants();
    GET_RANDOM_VALUES_SUPPORTED = typeof crypto != UNDEFINED_TYPE && typeof crypto.getRandomValues == FUNCTION_TYPE;
    ERR_INVALID_PASSWORD = "Invalid password";
    ERR_INVALID_AUTHENTICATION_CODE = "Invalid authentication code";
    ERR_ABORT_CHECK_PASSWORD = "zipjs-abort-check-password";
    ERR_UNSUPPORTED_CRYPTO_API = "Crypto API not supported";
  }
});
function setAESEngine(createEngineFunction) {
  createEngine2 = createEngineFunction || createEngine;
}
function initAesCrypto(aesCrypto, password, rawPassword, encryptionStrength) {
  Object.assign(aesCrypto, {
    ready: new Promise((resolve) => aesCrypto.resolveReady = resolve),
    password: encodePassword(password, rawPassword),
    strength: encryptionStrength - 1,
    pendingInput: EMPTY_UINT8_ARRAY,
    discarded: false
  });
}
function setDisposingReadable(stream, aesCrypto) {
  const reader = stream.readable.getReader();
  const readable = new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        disposeEngine(aesCrypto);
        reader.cancel(error).catch(() => {
        });
        throw error;
      }
    },
    cancel(reason) {
      disposeEngine(aesCrypto);
      return reader.cancel(reason);
    }
  });
  Object.defineProperty(stream, "readable", {
    get() {
      return readable;
    }
  });
}
function append(aesCrypto, input, output, paddingStart, paddingEnd, decrypt2) {
  const {
    engine,
    pendingInput
  } = aesCrypto;
  if (pendingInput.length) {
    input = concat(pendingInput, input);
  }
  const inputLength = input.length - paddingEnd;
  const alignedLength = inputLength - inputLength % BLOCK_LENGTH2;
  output = expand(output, paddingStart + alignedLength);
  if (alignedLength) {
    const chunk = subarray(output, paddingStart, paddingStart + alignedLength);
    chunk.set(subarray(input, 0, alignedLength));
    engine.process(chunk, decrypt2);
  }
  aesCrypto.pendingInput = subarray(input, alignedLength);
  return output;
}
async function createDecryptionKeys(decrypt2, strength, password, preamble) {
  const passwordVerificationKey = await createKeys(decrypt2, strength, password, subarray(preamble, 0, SALT_LENGTH[strength]));
  const passwordVerification = subarray(preamble, SALT_LENGTH[strength]);
  if (passwordVerificationKey[0] != passwordVerification[0] || passwordVerificationKey[1] != passwordVerification[1]) {
    disposeEngine(decrypt2);
    throw new Error(ERR_INVALID_PASSWORD);
  }
}
function disposeEngine(aesCrypto) {
  const { engine } = aesCrypto;
  aesCrypto.discarded = true;
  if (engine && engine.dispose) {
    engine.dispose();
  }
}
async function createEncryptionKeys(encrypt2, strength, password) {
  const salt = getRandomValues(new Uint8Array(SALT_LENGTH[strength]));
  const passwordVerification = await createKeys(encrypt2, strength, password, salt);
  return concat(salt, passwordVerification);
}
async function createKeys(aesCrypto, strength, password, salt) {
  aesCrypto.password = null;
  const keyLength = KEY_LENGTH[strength];
  const compositeKey = await deriveKey(password, salt, keyLength * 2 + PASSWORD_VERIFICATION_LENGTH);
  aesCrypto.engine = createEngine2(subarray(compositeKey, 0, keyLength), subarray(compositeKey, keyLength, keyLength * 2));
  if (aesCrypto.discarded) {
    disposeEngine(aesCrypto);
  }
  return subarray(compositeKey, keyLength * 2);
}
async function deriveKey(password, salt, length) {
  if (DERIVE_BITS_SUPPORTED) {
    try {
      const baseKey = await subtle.importKey(RAW_FORMAT, password, BASE_KEY_ALGORITHM, false, DERIVED_BITS_USAGE);
      return new Uint8Array(await subtle.deriveBits(Object.assign({ salt }, DERIVED_BITS_ALGORITHM), baseKey, length * 8));
    } catch {
      DERIVE_BITS_SUPPORTED = false;
    }
  }
  return pbkdf2(password, salt, PBKDF2_ITERATIONS, length);
}
function encodePassword(password, rawPassword) {
  if (rawPassword === UNDEFINED_VALUE) {
    return encodeText(password);
  } else {
    return rawPassword;
  }
}
function expand(inputArray, length) {
  if (length && length > inputArray.length) {
    const array = inputArray;
    inputArray = new Uint8Array(length);
    inputArray.set(array, 0);
  }
  return inputArray;
}
function subarray(array, begin, end) {
  return array.subarray(begin, end);
}
var BLOCK_LENGTH2;
var RAW_FORMAT;
var PBKDF2_ALGORITHM;
var HASH_ALGORITHM;
var HASH_FUNCTION;
var PBKDF2_ITERATIONS;
var BASE_KEY_ALGORITHM;
var DERIVED_BITS_ALGORITHM;
var DERIVED_BITS_USAGE;
var SALT_LENGTH;
var KEY_LENGTH;
var AUTHENTICATION_CODE_LENGTH;
var PASSWORD_VERIFICATION_LENGTH;
var CRYPTO_API_SUPPORTED;
var subtle;
var SUBTLE_API_SUPPORTED;
var DERIVE_BITS_SUPPORTED;
var createEngine2;
var AESDecryptionStream;
var AESEncryptionStream;
var init_aes_crypto_stream = __esm({
  "node_modules/@zip.js/zip.js/lib/core/streams/aes-crypto-stream.js"() {
    init_constants();
    init_encode_text();
    init_array();
    init_aes_hmac_sha1();
    init_common_crypto();
    BLOCK_LENGTH2 = 16;
    RAW_FORMAT = "raw";
    PBKDF2_ALGORITHM = { name: "PBKDF2" };
    HASH_ALGORITHM = { name: "HMAC" };
    HASH_FUNCTION = "SHA-1";
    PBKDF2_ITERATIONS = 1e3;
    BASE_KEY_ALGORITHM = Object.assign({ hash: HASH_ALGORITHM }, PBKDF2_ALGORITHM);
    DERIVED_BITS_ALGORITHM = Object.assign({ iterations: PBKDF2_ITERATIONS, hash: { name: HASH_FUNCTION } }, PBKDF2_ALGORITHM);
    DERIVED_BITS_USAGE = ["deriveBits"];
    SALT_LENGTH = [8, 12, 16];
    KEY_LENGTH = [16, 24, 32];
    AUTHENTICATION_CODE_LENGTH = 10;
    PASSWORD_VERIFICATION_LENGTH = 2;
    CRYPTO_API_SUPPORTED = typeof crypto != UNDEFINED_TYPE;
    subtle = CRYPTO_API_SUPPORTED && crypto.subtle;
    SUBTLE_API_SUPPORTED = CRYPTO_API_SUPPORTED && typeof subtle != UNDEFINED_TYPE;
    DERIVE_BITS_SUPPORTED = SUBTLE_API_SUPPORTED && typeof subtle.importKey == FUNCTION_TYPE && typeof subtle.deriveBits == FUNCTION_TYPE;
    createEngine2 = createEngine;
    AESDecryptionStream = class extends TransformStream {
      constructor({ password, rawPassword, encryptionStrength, checkPasswordOnly, checkAuthenticationCode = true }) {
        const aesCrypto = {};
        super({
          start() {
            initAesCrypto(aesCrypto, password, rawPassword, encryptionStrength);
          },
          async transform(chunk, controller) {
            const {
              password: password2,
              strength,
              resolveReady,
              ready
            } = aesCrypto;
            if (password2) {
              await createDecryptionKeys(aesCrypto, strength, password2, subarray(chunk, 0, SALT_LENGTH[strength] + PASSWORD_VERIFICATION_LENGTH));
              chunk = subarray(chunk, SALT_LENGTH[strength] + PASSWORD_VERIFICATION_LENGTH);
              if (checkPasswordOnly) {
                disposeEngine(aesCrypto);
                controller.error(new Error(ERR_ABORT_CHECK_PASSWORD));
              } else {
                resolveReady();
              }
            } else {
              await ready;
            }
            if (aesCrypto.discarded) {
              return;
            }
            const output = new Uint8Array(chunk.length - AUTHENTICATION_CODE_LENGTH - (chunk.length - AUTHENTICATION_CODE_LENGTH) % BLOCK_LENGTH2);
            controller.enqueue(append(aesCrypto, chunk, output, 0, AUTHENTICATION_CODE_LENGTH, true));
          },
          async flush(controller) {
            const {
              engine,
              pendingInput,
              ready
            } = aesCrypto;
            if (engine) {
              await ready;
              if (aesCrypto.discarded) {
                return;
              }
              const originalAuthenticationCode = subarray(pendingInput, pendingInput.length - AUTHENTICATION_CODE_LENGTH);
              const decryptedChunkArray = new Uint8Array(subarray(pendingInput, 0, pendingInput.length - AUTHENTICATION_CODE_LENGTH));
              engine.process(decryptedChunkArray, true);
              const authenticationCode = engine.digest();
              let invalidAuthenticationCode = pendingInput.length < AUTHENTICATION_CODE_LENGTH ? 1 : 0;
              for (let indexByte = 0; indexByte < AUTHENTICATION_CODE_LENGTH; indexByte++) {
                invalidAuthenticationCode |= authenticationCode[indexByte] ^ originalAuthenticationCode[indexByte];
              }
              if (invalidAuthenticationCode && checkAuthenticationCode) {
                controller.error(new Error(ERR_INVALID_AUTHENTICATION_CODE));
                return;
              }
              controller.enqueue(decryptedChunkArray);
            }
          }
        });
        setDisposingReadable(this, aesCrypto);
      }
    };
    AESEncryptionStream = class extends TransformStream {
      constructor({ password, rawPassword, encryptionStrength }) {
        const aesCrypto = {};
        super({
          start() {
            initAesCrypto(aesCrypto, password, rawPassword, encryptionStrength);
          },
          async transform(chunk, controller) {
            const {
              password: password2,
              strength,
              resolveReady,
              ready
            } = aesCrypto;
            let preamble = EMPTY_UINT8_ARRAY;
            if (password2) {
              preamble = await createEncryptionKeys(aesCrypto, strength, password2);
              resolveReady();
            } else {
              await ready;
            }
            if (aesCrypto.discarded) {
              return;
            }
            const output = new Uint8Array(preamble.length + chunk.length - chunk.length % BLOCK_LENGTH2);
            output.set(preamble, 0);
            controller.enqueue(append(aesCrypto, chunk, output, preamble.length, 0, false));
          },
          async flush(controller) {
            const {
              engine,
              pendingInput,
              ready
            } = aesCrypto;
            if (engine) {
              await ready;
              if (aesCrypto.discarded) {
                return;
              }
              const encryptedChunkArray = new Uint8Array(pendingInput);
              engine.process(encryptedChunkArray, false);
              const authenticationCode = subarray(engine.digest(), 0, AUTHENTICATION_CODE_LENGTH);
              controller.enqueue(concat(encryptedChunkArray, authenticationCode));
            }
          }
        });
        setDisposingReadable(this, aesCrypto);
      }
    };
  }
});
function initZipCrypto(zipCrypto, password, rawPassword, passwordVerification) {
  Object.assign(zipCrypto, {
    password,
    rawPassword,
    passwordVerification
  });
  createKeys2(zipCrypto, password, rawPassword);
}
function decrypt(target, input) {
  const output = new Uint8Array(input.length);
  for (let index = 0; index < input.length; index++) {
    output[index] = getByte(target) ^ input[index];
    updateKeys(target, output[index]);
  }
  return output;
}
function encrypt(target, input) {
  const output = new Uint8Array(input.length);
  for (let index = 0; index < input.length; index++) {
    output[index] = getByte(target) ^ input[index];
    updateKeys(target, input[index]);
  }
  return output;
}
function createKeys2(target, password, rawPassword) {
  const cryptoKeys = [305419896, 591751049, 878082192];
  Object.assign(target, {
    cryptoKeys,
    crcKey0: new Crc32(cryptoKeys[0]),
    crcKey2: new Crc32(cryptoKeys[2])
  });
  if (rawPassword) {
    for (let index = 0; index < rawPassword.length; index++) {
      updateKeys(target, rawPassword[index]);
    }
  } else {
    for (let index = 0; index < password.length; index++) {
      updateKeys(target, password.charCodeAt(index));
    }
  }
}
function updateKeys(target, byte) {
  let [, key1] = target.cryptoKeys;
  target.crcKey0.append([byte]);
  const key0 = ~target.crcKey0.get();
  key1 = getInt32(Math.imul(getInt32(key1 + getInt8(key0)), 134775813) + 1);
  target.crcKey2.append([key1 >>> 24]);
  const key2 = ~target.crcKey2.get();
  target.cryptoKeys = [key0, key1, key2];
}
function getByte(target) {
  const temp = target.cryptoKeys[2] | 2;
  return getInt8(Math.imul(temp, temp ^ 1) >>> 8);
}
function getInt8(number) {
  return number & 255;
}
function getInt32(number) {
  return number & 4294967295;
}
var HEADER_LENGTH;
var ZipCryptoDecryptionStream;
var ZipCryptoEncryptionStream;
var init_zip_crypto_stream = __esm({
  "node_modules/@zip.js/zip.js/lib/core/streams/zip-crypto-stream.js"() {
    init_crc32();
    init_common_crypto();
    HEADER_LENGTH = 12;
    ZipCryptoDecryptionStream = class extends TransformStream {
      constructor({ password, rawPassword, passwordVerification, checkPasswordOnly }) {
        super({
          start() {
            initZipCrypto(this, password, rawPassword, passwordVerification);
          },
          transform(chunk, controller) {
            const zipCrypto = this;
            if (zipCrypto.password || zipCrypto.rawPassword) {
              const decryptedHeader = decrypt(zipCrypto, chunk.subarray(0, HEADER_LENGTH));
              zipCrypto.password = zipCrypto.rawPassword = null;
              if ((decryptedHeader[HEADER_LENGTH - 1] ^ zipCrypto.passwordVerification) != 0) {
                throw new Error(ERR_INVALID_PASSWORD);
              }
              chunk = chunk.subarray(HEADER_LENGTH);
            }
            if (checkPasswordOnly) {
              controller.error(new Error(ERR_ABORT_CHECK_PASSWORD));
            } else {
              controller.enqueue(decrypt(zipCrypto, chunk));
            }
          }
        });
      }
    };
    ZipCryptoEncryptionStream = class extends TransformStream {
      constructor({ password, rawPassword, passwordVerification }) {
        super({
          start() {
            initZipCrypto(this, password, rawPassword, passwordVerification);
          },
          transform(chunk, controller) {
            const zipCrypto = this;
            let output;
            let offset;
            if (zipCrypto.password || zipCrypto.rawPassword) {
              zipCrypto.password = zipCrypto.rawPassword = null;
              const header = getRandomValues(new Uint8Array(HEADER_LENGTH));
              header[HEADER_LENGTH - 1] = zipCrypto.passwordVerification;
              output = new Uint8Array(chunk.length + header.length);
              output.set(encrypt(zipCrypto, header), 0);
              offset = HEADER_LENGTH;
            } else {
              output = new Uint8Array(chunk.length);
              offset = 0;
            }
            output.set(encrypt(zipCrypto, chunk), offset);
            controller.enqueue(output);
          }
        });
      }
    };
  }
});
function toCompatibleReadable(readable) {
  if (readable instanceof ReadableStream) {
    return readable;
  }
  const reader = readable.getReader();
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        reader.cancel(error).catch(() => {
        });
        throw error;
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    }
  });
}
function streamToBlob(readable, contentType) {
  readable = toCompatibleReadable(readable);
  const blobOptions = contentType ? { type: contentType } : {};
  if (responseSupportsGlobalReadable()) {
    return new Response(readable).blob().then((blob) => contentType ? new Blob([blob], blobOptions) : blob);
  }
  const chunks = [];
  return readable.pipeTo(new WritableStream({
    write(chunk) {
      chunks.push(chunk);
    }
  })).then(() => new Blob(chunks, blobOptions));
}
function responseSupportsGlobalReadable() {
  return typeof Blob.prototype.stream != FUNCTION_TYPE || new Blob([]).stream() instanceof ReadableStream;
}
function toCompatibleWritable(writable) {
  if (writable instanceof WritableStream) {
    return writable;
  }
  const writer = writable.getWriter();
  return new WritableStream({
    write(chunk) {
      return writer.write(chunk);
    },
    close() {
      return writer.close();
    },
    abort(reason) {
      return writer.abort(reason);
    }
  });
}
var init_compatible_streams = __esm({
  "node_modules/@zip.js/zip.js/lib/core/util/compatible-streams.js"() {
    init_constants();
  }
});
function getRegisteredCodec(compressionMethod) {
  return registeredCodecs.get(compressionMethod);
}
function getCodecStreams(format) {
  return codecStreams.get(format);
}
function setCodecStreams(format, streams) {
  const { CompressionStream: CompressionStream2, DecompressionStream: DecompressionStream2 } = streams;
  if (typeof CompressionStream2 != FUNCTION_TYPE && typeof DecompressionStream2 != FUNCTION_TYPE) {
    throw new Error(ERR_INVALID_CODEC_MODULE);
  }
  codecStreams.set(format, { CompressionStream: CompressionStream2, DecompressionStream: DecompressionStream2 });
}
async function ensureCodecStreams(format, codecURI) {
  if (!codecStreams.has(format) && codecURI) {
    setCodecStreams(format, await import(
      /* webpackIgnore: true */
      /* @vite-ignore */
      codecURI
    ));
  }
}
var ERR_INVALID_CODEC_MODULE;
var ERR_UNSUPPORTED_COMPRESSION;
var registeredCodecs;
var codecStreams;
var init_codec_registry = __esm({
  "node_modules/@zip.js/zip.js/lib/core/codec-registry.js"() {
    init_constants();
    ERR_INVALID_CODEC_MODULE = "Invalid codec module";
    ERR_UNSUPPORTED_COMPRESSION = "Compression method not supported";
    registeredCodecs = /* @__PURE__ */ new Map();
    codecStreams = /* @__PURE__ */ new Map();
  }
});
function pipeThroughGzipDecompressionStream(readable, gzipStream, outputSize, crc32, sourceErrors) {
  const writer = gzipStream.writable.getWriter();
  const reader = gzipStream.readable.getReader();
  const outputCrc32 = crc32 === UNDEFINED_VALUE ? new Crc32() : UNDEFINED_VALUE;
  let outputLength = 0;
  let trailerWritten = false;
  let settled = false;
  let resolvePull, controller;
  const output = new ReadableStream({
    start(streamController) {
      controller = streamController;
    },
    pull() {
      resumePump();
    },
    cancel(reason) {
      settled = true;
      resumePump();
      return reader.cancel(reason);
    }
  });
  pump();
  drain();
  return output;
  async function pump() {
    const inputReader = readable.getReader();
    try {
      const header = new Uint8Array(GZIP_HEADER_LENGTH);
      header.set(GZIP_HEADER_BYTES);
      await writer.write(header);
      for (; ; ) {
        await outputCapacity();
        await writer.ready;
        const { value, done } = await readSource(inputReader, sourceErrors);
        if (done) {
          break;
        }
        await writer.write(value);
      }
      if (outputCrc32) {
        await writer.write(new Uint8Array(0));
      }
      const trailer = new Uint8Array(GZIP_TRAILER_LENGTH);
      const dataView = getDataView(trailer);
      dataView.setUint32(0, outputCrc32 ? outputCrc32.get() : crc32, true);
      dataView.setUint32(4, outputSize, true);
      trailerWritten = true;
      await writer.write(trailer);
      await writer.close();
    } catch (error) {
      await abort(writer, error);
      await cancel(inputReader, error);
    }
  }
  async function drain() {
    try {
      for (; ; ) {
        const { value, done } = await read();
        if (done) {
          break;
        }
        outputLength += value.length;
        if (outputLength > outputSize) {
          throw new Error(ERR_INVALID_UNCOMPRESSED_SIZE);
        }
        if (outputCrc32) {
          outputCrc32.append(value);
        }
        controller.enqueue(value);
      }
      if (!settled) {
        settled = true;
        controller.close();
      }
    } catch (error) {
      fail(error);
      await cancel(reader, error);
    }
  }
  function read() {
    return reader.read().catch((error) => {
      if (trailerWritten) {
        if (!outputCrc32) {
          throw mapError(error, ERR_INVALID_CRC32);
        }
        if (outputLength != outputSize) {
          throw mapError(error, ERR_INVALID_UNCOMPRESSED_SIZE);
        }
        return { done: true };
      }
      throw mapCodecError(error, sourceErrors);
    });
  }
  function outputCapacity() {
    if (!settled && controller.desiredSize <= 0) {
      return new Promise((resolve) => resolvePull = resolve);
    }
  }
  function resumePump() {
    if (resolvePull) {
      const resolve = resolvePull;
      resolvePull = UNDEFINED_VALUE;
      resolve();
    }
  }
  function fail(error) {
    if (!settled) {
      settled = true;
      controller.error(error);
      resumePump();
    }
  }
}
function supportsFormat(StreamClass, format) {
  if (!StreamClass) {
    return false;
  }
  let supportByFormat = formatSupportByStream.get(StreamClass);
  if (!supportByFormat) {
    supportByFormat = /* @__PURE__ */ new Map();
    formatSupportByStream.set(StreamClass, supportByFormat);
  }
  let supported = supportByFormat.get(format);
  if (supported === UNDEFINED_VALUE) {
    try {
      new StreamClass(format);
      supported = true;
    } catch {
      supported = false;
    }
    supportByFormat.set(format, supported);
  }
  return supported;
}
function supportsDeflateRaw(StreamClass) {
  return supportsFormat(StreamClass, FORMAT_DEFLATE_RAW);
}
function supportsGzip(StreamClass) {
  return supportsFormat(StreamClass, FORMAT_GZIP);
}
function setReadable(stream, readable, flush) {
  readable = pipeThrough(readable, new TransformStream({ flush }));
  Object.defineProperty(stream, "readable", {
    get() {
      return readable;
    }
  });
}
function createCodecStream(CodecStreamClass, format, options) {
  if (!CodecStreamClass) {
    throw new Error(ERR_UNSUPPORTED_COMPRESSION);
  }
  return new CodecStreamClass(format, options);
}
function getGzipCodecStream(useCompressionStream, CodecStreamNative, CodecStreamFallback) {
  if (useCompressionStream && CodecStreamNative) {
    return CodecStreamNative;
  } else if (CodecStreamFallback && CodecStreamFallback.requiresModule) {
    return CodecStreamFallback;
  }
}
function pipeThroughCompressionStream(readable, useCompressionStream, options, CompressionStreamNative, CompressionStreamFallback, sourceErrors) {
  const Stream2 = useCompressionStream && CompressionStreamNative ? CompressionStreamNative : CompressionStreamFallback || CompressionStreamNative;
  const format = options.deflate64 ? FORMAT_DEFLATE64_RAW : FORMAT_DEFLATE_RAW;
  let codecStream;
  try {
    codecStream = new Stream2(format, options);
  } catch (error) {
    if (useCompressionStream && CompressionStreamFallback && Stream2 != CompressionStreamFallback) {
      codecStream = new CompressionStreamFallback(format, options);
    } else {
      throw error;
    }
  }
  return pipeThroughBackpressured(readable, codecStream, sourceErrors);
}
function pipeThrough(readable, transformStream) {
  return toCompatibleReadable(readable).pipeThrough(transformStream);
}
function pipeThroughBackpressured(readable, transformStream, sourceErrors) {
  const writer = transformStream.writable.getWriter();
  const reader = readable.getReader();
  pump();
  return transformStream.readable;
  async function pump() {
    try {
      for (; ; ) {
        await writer.ready;
        const result = await readSource(reader, sourceErrors);
        if (result.done) {
          await writer.close();
          break;
        }
        await writer.write(result.value);
      }
    } catch (error) {
      await abort(writer, error);
      await cancel(reader, error);
    }
  }
}
async function abort(writer, error) {
  try {
    await writer.abort(error);
  } catch {
  }
}
async function cancel(reader, error) {
  try {
    await reader.cancel(error);
  } catch {
  }
}
function readSource(reader, sourceErrors) {
  const result = reader.read();
  return sourceErrors ? result.catch((error) => {
    sourceErrors.add(error);
    throw error;
  }) : result;
}
function mapCodecError(error, sourceErrors) {
  if (sourceErrors.has(error)) {
    return error;
  }
  return mapError(error, isMemoryError(error) ? ERR_CODEC_OUT_OF_MEMORY : ERR_INVALID_COMPRESSED_DATA);
}
function mapMemoryError(error) {
  return isMemoryError(error) ? mapError(error, ERR_CODEC_OUT_OF_MEMORY) : error;
}
function isMemoryError(error) {
  return isErrorObject(error) && error.code == Z_MEM_ERROR_CODE;
}
function mapError(error, message) {
  const mappedError = new Error(message);
  mappedError.cause = error;
  return mappedError;
}
function mapInflateStreamError(readable, sourceErrors) {
  const reader = readable.getReader();
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        await cancel(reader, error);
        throw mapCodecError(error, sourceErrors);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    }
  });
}
var ERR_INVALID_UNCOMPRESSED_SIZE;
var ERR_INVALID_COMPRESSED_DATA;
var ERR_CODEC_OUT_OF_MEMORY;
var ERR_INVALID_CRC32;
var Z_MEM_ERROR_CODE;
var FORMAT_DEFLATE_RAW;
var FORMAT_DEFLATE64_RAW;
var FORMAT_GZIP;
var GZIP_HEADER_LENGTH;
var GZIP_TRAILER_LENGTH;
var GZIP_HEADER_BYTES;
var DeflateStream;
var GzipToRawDeflateStream;
var InflateStream;
var formatSupportByStream;
var init_zip_entry_stream = __esm({
  "node_modules/@zip.js/zip.js/lib/core/streams/zip-entry-stream.js"() {
    init_crc32();
    init_crc32_stream();
    init_aes_crypto_stream();
    init_zip_crypto_stream();
    init_common_crypto();
    init_constants();
    init_array();
    init_compatible_streams();
    init_error();
    init_codec_registry();
    ERR_INVALID_UNCOMPRESSED_SIZE = "Invalid uncompressed size";
    ERR_INVALID_COMPRESSED_DATA = "Invalid compressed data";
    ERR_CODEC_OUT_OF_MEMORY = "Codec out of memory";
    ERR_INVALID_CRC32 = "Invalid CRC32";
    Z_MEM_ERROR_CODE = "Z_MEM_ERROR";
    FORMAT_DEFLATE_RAW = "deflate-raw";
    FORMAT_DEFLATE64_RAW = "deflate64-raw";
    FORMAT_GZIP = "gzip";
    GZIP_HEADER_LENGTH = 10;
    GZIP_TRAILER_LENGTH = 8;
    GZIP_HEADER_BYTES = [31, 139, 8];
    DeflateStream = class extends TransformStream {
      constructor(options, { chunkSize, CompressionStreamFallback, CompressionStream: CompressionStream2 }) {
        super({});
        const { compressed, encrypted, useCompressionStream, zipCrypto, computeCrc32, level, deflate64, format, compressionMethod, inputSize } = options;
        const stream = this;
        let crc32Stream, encryptionStream, gzipCrc32Stream;
        let readable = super.readable;
        const codecStreams2 = format && getCodecStreams(format);
        const GzipCompressionStream = getGzipCodecStream(useCompressionStream, CompressionStream2, CompressionStreamFallback);
        const useGzipCrc32 = computeCrc32 && compressed && !deflate64 && !codecStreams2 && (!encrypted || zipCrypto) && Boolean(GzipCompressionStream);
        if ((!encrypted || zipCrypto) && computeCrc32 && !useGzipCrc32) {
          crc32Stream = new Crc32Stream();
          readable = pipeThrough(readable, crc32Stream);
        }
        if (compressed) {
          if (codecStreams2) {
            readable = pipeThroughBackpressured(readable, createCodecStream(codecStreams2.CompressionStream, format, { level, chunkSize, compressionMethod, uncompressedSize: inputSize }));
          } else if (useGzipCrc32) {
            gzipCrc32Stream = new GzipToRawDeflateStream();
            readable = pipeThroughBackpressured(readable, new GzipCompressionStream(FORMAT_GZIP, { level, chunkSize }));
            readable = pipeThrough(readable, gzipCrc32Stream);
          } else {
            try {
              readable = pipeThroughCompressionStream(readable, useCompressionStream, { level, chunkSize }, CompressionStream2, CompressionStreamFallback);
            } catch (error) {
              if (!useCompressionStream && CompressionStreamFallback) {
                throw mapMemoryError(error);
              }
              let gzipStream;
              try {
                gzipStream = new CompressionStream2(FORMAT_GZIP);
              } catch {
                throw mapMemoryError(error);
              }
              readable = pipeThroughBackpressured(readable, gzipStream);
              readable = pipeThrough(readable, new GzipToRawDeflateStream());
            }
          }
        }
        if (encrypted) {
          if (zipCrypto) {
            readable = pipeThrough(readable, new ZipCryptoEncryptionStream(options));
          } else {
            encryptionStream = new AESEncryptionStream(options);
            readable = pipeThrough(readable, encryptionStream);
          }
        }
        setReadable(stream, readable, () => {
          if ((!encrypted || zipCrypto) && computeCrc32) {
            stream.crc32 = useGzipCrc32 ? gzipCrc32Stream.crc32 : new DataView(crc32Stream.value.buffer).getUint32(0);
          }
        });
      }
    };
    GzipToRawDeflateStream = class extends TransformStream {
      constructor() {
        let stream;
        let headerBytesLeft = GZIP_HEADER_LENGTH;
        let trailerCandidate = new Uint8Array(0);
        super({
          transform(chunk, controller) {
            if (headerBytesLeft) {
              const droppedLength = Math.min(headerBytesLeft, chunk.length);
              headerBytesLeft -= droppedLength;
              chunk = chunk.subarray(droppedLength);
              if (!chunk.length) {
                return;
              }
            }
            const availableLength = trailerCandidate.length + chunk.length;
            if (availableLength <= GZIP_TRAILER_LENGTH) {
              trailerCandidate = concat(trailerCandidate, chunk);
              return;
            }
            const emitLength = availableLength - GZIP_TRAILER_LENGTH;
            const emittedFromTrailer = Math.min(emitLength, trailerCandidate.length);
            controller.enqueue(concat(
              trailerCandidate.subarray(0, emittedFromTrailer),
              chunk.subarray(0, emitLength - emittedFromTrailer)
            ));
            trailerCandidate = concat(
              trailerCandidate.subarray(emittedFromTrailer),
              chunk.subarray(emitLength - emittedFromTrailer)
            );
          },
          flush() {
            const dataView = getDataView(trailerCandidate);
            stream.crc32 = dataView.getUint32(0, true);
            stream.uncompressedSize = dataView.getUint32(4, true);
          }
        });
        stream = this;
      }
    };
    InflateStream = class extends TransformStream {
      constructor(options, { chunkSize, DecompressionStreamFallback, DecompressionStream: DecompressionStream2 }) {
        super({});
        const { zipCrypto, encrypted, checkCrc32, crc32, compressed, useCompressionStream, deflate64, format, compressionMethod, rawBitFlag, outputSize } = options;
        let crc32Stream, decryptionStream, gzipCrc32;
        let readable = super.readable;
        if (encrypted) {
          if (zipCrypto) {
            readable = pipeThrough(readable, new ZipCryptoDecryptionStream(options));
          } else {
            decryptionStream = new AESDecryptionStream(options);
            readable = pipeThrough(readable, decryptionStream);
          }
        }
        if (compressed) {
          const sourceErrors = /* @__PURE__ */ new Set();
          const codecStreams2 = format && getCodecStreams(format);
          let gzipStream;
          if (codecStreams2) {
            readable = pipeThroughBackpressured(readable, createCodecStream(codecStreams2.DecompressionStream, format, { chunkSize, compressionMethod, rawBitFlag, uncompressedSize: outputSize }), sourceErrors);
          } else {
            const GzipDecompressionStream = getGzipCodecStream(useCompressionStream, DecompressionStream2, DecompressionStreamFallback);
            if (checkCrc32 && !deflate64 && crc32 !== UNDEFINED_VALUE && outputSize !== UNDEFINED_VALUE && GzipDecompressionStream) {
              try {
                gzipStream = new GzipDecompressionStream(FORMAT_GZIP, { chunkSize });
              } catch {
                gzipStream = UNDEFINED_VALUE;
              }
            }
            if (!gzipStream) {
              try {
                readable = pipeThroughCompressionStream(readable, useCompressionStream, { chunkSize, deflate64 }, DecompressionStream2, DecompressionStreamFallback, sourceErrors);
              } catch (error) {
                if (deflate64 || outputSize === UNDEFINED_VALUE || !useCompressionStream && DecompressionStreamFallback) {
                  throw mapMemoryError(error);
                }
                try {
                  gzipStream = new DecompressionStream2(FORMAT_GZIP);
                } catch {
                  throw mapMemoryError(error);
                }
              }
            }
          }
          if (gzipStream) {
            gzipCrc32 = true;
            readable = pipeThroughGzipDecompressionStream(readable, gzipStream, outputSize, crc32, sourceErrors);
          } else {
            readable = mapInflateStreamError(readable, sourceErrors);
          }
        }
        if (checkCrc32 && !gzipCrc32) {
          crc32Stream = new Crc32Stream();
          readable = pipeThrough(readable, crc32Stream);
        }
        setReadable(this, readable, () => {
          if (crc32Stream) {
            const computedCrc32 = new DataView(crc32Stream.value.buffer).getUint32(0, false);
            if (crc32 != computedCrc32) {
              throw new Error(ERR_INVALID_CRC32);
            }
          }
        });
      }
    };
    formatSupportByStream = /* @__PURE__ */ new Map();
  }
});
var DEFAULT_CHUNK_SIZE2;
var MESSAGE_EVENT_TYPE;
var MESSAGE_START;
var MESSAGE_PULL;
var MESSAGE_DATA;
var MESSAGE_ACK_DATA;
var MESSAGE_CLOSE;
var CODEC_DEFLATE;
var CODEC_INFLATE;
var CodecStream;
var ChunkStream;
var init_codec_stream = __esm({
  "node_modules/@zip.js/zip.js/lib/core/streams/codec-stream.js"() {
    init_constants();
    init_zip_entry_stream();
    DEFAULT_CHUNK_SIZE2 = 256 * 1024;
    MESSAGE_EVENT_TYPE = "message";
    MESSAGE_START = "start";
    MESSAGE_PULL = "pull";
    MESSAGE_DATA = "data";
    MESSAGE_ACK_DATA = "ack";
    MESSAGE_CLOSE = "close";
    CODEC_DEFLATE = "deflate";
    CODEC_INFLATE = "inflate";
    CodecStream = class extends TransformStream {
      constructor(options, config2) {
        super({});
        const codec = this;
        const { codecType } = options;
        let Stream2;
        if (codecType.startsWith(CODEC_DEFLATE)) {
          Stream2 = DeflateStream;
        } else if (codecType.startsWith(CODEC_INFLATE)) {
          Stream2 = InflateStream;
        }
        codec.outputSize = 0;
        let inputSize = 0;
        const stream = new Stream2(options, config2);
        const readable = super.readable;
        const inputSizeStream = new TransformStream({
          transform(chunk, controller) {
            if (chunk && chunk.length) {
              inputSize += chunk.length;
              controller.enqueue(chunk);
            }
          },
          flush() {
            Object.assign(codec, {
              inputSize
            });
          }
        });
        const outputSizeStream = new TransformStream({
          transform(chunk, controller) {
            if (chunk && chunk.length) {
              controller.enqueue(chunk);
              codec.outputSize += chunk.length;
              if (options.outputSize !== UNDEFINED_VALUE && codec.outputSize > options.outputSize) {
                throw new Error(ERR_INVALID_UNCOMPRESSED_SIZE);
              }
            }
          },
          flush() {
            const { crc32 } = stream;
            Object.assign(codec, {
              crc32,
              inputSize
            });
          }
        });
        Object.defineProperty(codec, "readable", {
          get() {
            return readable.pipeThrough(inputSizeStream).pipeThrough(stream).pipeThrough(outputSizeStream);
          }
        });
      }
    };
    ChunkStream = class extends TransformStream {
      constructor(chunkSize) {
        const pendingChunks = [];
        let pendingLength = 0;
        let outputSize = 0;
        if (!Number.isFinite(chunkSize) || chunkSize < 1) {
          chunkSize = DEFAULT_CHUNK_SIZE2;
        }
        super({
          transform(chunk, controller) {
            pendingChunks.push(chunk);
            pendingLength += chunk.length;
            while (pendingLength > chunkSize) {
              outputSize += chunkSize;
              controller.enqueue(shiftChunk());
            }
          },
          flush(controller) {
            if (pendingLength) {
              outputSize += pendingLength;
              controller.enqueue(concatChunks(pendingChunks, pendingLength));
            }
          }
        });
        Object.defineProperty(this, "outputSize", {
          get: () => outputSize
        });
        function shiftChunk() {
          const result = new Uint8Array(chunkSize);
          let resultOffset = 0;
          while (resultOffset < chunkSize) {
            const firstChunk = pendingChunks[0];
            const remainingLength = chunkSize - resultOffset;
            if (firstChunk.length <= remainingLength) {
              result.set(firstChunk, resultOffset);
              resultOffset += firstChunk.length;
              pendingChunks.shift();
            } else {
              result.set(firstChunk.subarray(0, remainingLength), resultOffset);
              pendingChunks[0] = firstChunk.subarray(remainingLength);
              resultOffset += remainingLength;
            }
          }
          pendingLength -= chunkSize;
          return result;
        }
        function concatChunks(chunks, length) {
          const result = new Uint8Array(length);
          let offset = 0;
          for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }
          return result;
        }
      }
    };
  }
});
function configureWorker({ initModule: initModuleFunction }) {
  initModule = initModuleFunction;
}
function setWebWorkerBackend(backend) {
  webWorkerBackend = backend;
}
async function supportsDeflate(config2) {
  const { CompressionStream: NativeStream, CompressionStreamFallback: FallbackStream } = config2;
  if (FallbackStream && !FallbackStream.requiresModule) {
    return true;
  }
  if (supportsDeflateRaw(NativeStream) || supportsGzip(NativeStream)) {
    return true;
  }
  if (FallbackStream) {
    return await loadModule(config2);
  }
  return false;
}
async function loadModule(config2) {
  if (initModule) {
    try {
      await initModule(config2);
      return true;
    } catch {
    }
  }
  return false;
}
function disableWebWorker(workerData) {
  if (workerData.createWorker) {
    createWorkerFailed = true;
  } else {
    webWorkerSupported = false;
  }
}
async function callHandler(handler, ...parameters) {
  try {
    await handler(...parameters);
  } catch {
  }
}
function createWorkerInterface(workerData, config2) {
  return {
    run: () => runWorker(workerData, config2)
  };
}
async function runWorker({ options, readable, writable, onTaskFinished, workerOptions }, config2) {
  let codecStream, chunkStream, modulePromise2;
  try {
    if (options.compressed && !options.format) {
      const deflate = options.codecType.startsWith(CODEC_DEFLATE);
      const FallbackStream = deflate ? config2.CompressionStreamFallback : config2.DecompressionStreamFallback;
      const NativeStream = deflate ? config2.CompressionStream : config2.DecompressionStream;
      if (!options.useCompressionStream) {
        if (!await moduleLoaded() && (!FallbackStream || FallbackStream.requiresModule)) {
          options.useCompressionStream = true;
        }
      } else if (FallbackStream && FallbackStream.requiresModule && !supportsDeflateRaw(NativeStream)) {
        await moduleLoaded();
      }
    }
    if (options.encrypted && !options.zipCrypto) {
      await moduleLoaded();
    }
    codecStream = new CodecStream(options, config2);
    chunkStream = new ChunkStream(getChunkSize(config2));
    const { signal } = workerOptions.streamOptions;
    await readable.pipeThrough(codecStream).pipeThrough(chunkStream).pipeTo(writable, { preventClose: true, preventAbort: true, signal });
    const {
      crc32,
      inputSize,
      outputSize
    } = codecStream;
    return {
      crc32,
      inputSize,
      outputSize
    };
  } catch (error) {
    if (codecStream) {
      const outputSize = chunkStream ? chunkStream.outputSize : 0;
      workerOptions.outputSize = outputSize;
      if (isErrorObject(error)) {
        try {
          error.outputSize = outputSize;
        } catch {
        }
      }
    }
    throw error;
  } finally {
    onTaskFinished();
  }
  function moduleLoaded() {
    if (!modulePromise2) {
      modulePromise2 = loadModule(config2);
    }
    return modulePromise2;
  }
}
var ERR_WORKER_STARTUP_TIMEOUT;
var webWorkerSupported;
var createWorkerFailed;
var webWorkerBackend;
var initModule;
var CodecWorker;
var ProgressWatcherStream;
var init_codec_worker = __esm({
  "node_modules/@zip.js/zip.js/lib/core/codec-worker.js"() {
    init_constants();
    init_configuration();
    init_error();
    init_codec_stream();
    ERR_WORKER_STARTUP_TIMEOUT = "Worker startup timeout";
    initModule = () => {
    };
    CodecWorker = class {
      constructor(workerData, { readable, writable }, workerOptions, onTaskFinished) {
        const { options, config: config2, streamOptions, useWebWorkers, workerURI } = workerOptions;
        let { createWorker } = workerOptions;
        const { signal } = streamOptions;
        if (createWorkerFailed) {
          createWorker = UNDEFINED_VALUE;
        }
        Object.assign(workerData, {
          busy: true,
          generation: (workerData.generation || 0) + 1,
          readable: readable.pipeThrough(new ChunkStream(getChunkSize(config2))).pipeThrough(new ProgressWatcherStream(streamOptions), { signal }),
          writable,
          options: Object.assign({}, options),
          workerOptions,
          workerURI,
          createWorker,
          terminate() {
            return new Promise((resolve) => {
              const { worker, busy } = workerData;
              if (busy) {
                workerData.terminateResolvers = workerData.terminateResolvers || [];
                workerData.terminateResolvers.push(resolve);
              } else {
                if (worker) {
                  worker.terminate();
                  workerData.worker = null;
                }
                resolve();
              }
              workerData.interface = null;
            });
          },
          onTaskFinished() {
            if (workerData.busy) {
              const { terminateResolvers, worker } = workerData;
              if (terminateResolvers) {
                workerData.terminateResolvers = null;
                if (worker) {
                  workerData.terminated = true;
                  worker.terminate();
                }
              }
              workerData.busy = false;
              const pendingTasks = onTaskFinished(workerData);
              if (terminateResolvers) {
                terminateResolvers.forEach((resolve) => resolve(pendingTasks));
              }
            }
          }
        });
        if (webWorkerSupported === UNDEFINED_VALUE) {
          webWorkerSupported = typeof Worker != UNDEFINED_TYPE;
        }
        return (useWebWorkers && webWorkerBackend && (webWorkerSupported && workerURI || createWorker) ? webWorkerBackend : createWorkerInterface)(workerData, config2);
      }
    };
    ProgressWatcherStream = class extends TransformStream {
      constructor({ onstart, onprogress, size, onend }) {
        let chunkOffset = 0;
        super({
          async start() {
            if (onstart) {
              await callHandler(onstart, size);
            }
          },
          async transform(chunk, controller) {
            chunkOffset += chunk.length;
            if (onprogress) {
              await callHandler(onprogress, chunkOffset, size);
            }
            controller.enqueue(chunk);
          },
          async flush() {
            if (onend) {
              await callHandler(onend, chunkOffset);
            }
          }
        });
      }
    };
  }
});
async function runWorker2(stream, workerOptions) {
  const { options, config: config2 } = workerOptions;
  const { useWebWorkers, useCompressionStream, compressed, checkCrc32, computeCrc32, encrypted, format, codecURI } = options;
  const { workerURI, createWorker, maxWorkers: maxWorkers2 } = config2;
  if (format) {
    if (codecURI) {
      options.codecURI = resolveCodecURI(codecURI, config2.baseURI);
    }
    await ensureCodecStreams(format, options.codecURI);
  }
  const streamCopy = !compressed && !checkCrc32 && !computeCrc32 && !encrypted;
  const workerSupported = format === UNDEFINED_VALUE || Boolean(options.codecURI);
  workerOptions.useWebWorkers = !streamCopy && workerSupported && (useWebWorkers || useWebWorkers === UNDEFINED_VALUE && config2.useWebWorkers);
  workerOptions.workerURI = workerOptions.useWebWorkers && workerURI ? workerURI : UNDEFINED_VALUE;
  workerOptions.createWorker = workerOptions.useWebWorkers && createWorker ? createWorker : UNDEFINED_VALUE;
  options.useCompressionStream = useCompressionStream || useCompressionStream === UNDEFINED_VALUE && config2.useCompressionStream;
  return (await getWorker()).run();
  async function getWorker() {
    const workerData = pool.find((workerData2) => !workerData2.busy);
    if (workerData) {
      clearTerminateTimeout(workerData);
      return new CodecWorker(workerData, stream, workerOptions, onTaskFinished);
    } else if (pool.length < maxWorkers2) {
      const workerData2 = { indexWorker };
      indexWorker++;
      pool.push(workerData2);
      return new CodecWorker(workerData2, stream, workerOptions, onTaskFinished);
    } else {
      return new Promise((resolve) => {
        pendingRequests.push({ resolve, stream, workerOptions });
        starvationDelay = config2.workerStarvationTimeout;
        armStarvationTimeout();
      });
    }
  }
  function onTaskFinished(workerData) {
    clearStarvationTimeout();
    if (workerData.terminated) {
      workerData.terminated = false;
      return runPendingRequestsInline();
    } else if (pendingRequests.length) {
      const [{ resolve, stream: stream2, workerOptions: workerOptions2 }] = pendingRequests.splice(0, 1);
      resolve(new CodecWorker(workerData, stream2, workerOptions2, onTaskFinished));
      armStarvationTimeout();
    } else if (workerData.worker) {
      clearTerminateTimeout(workerData);
      terminateWorker2(workerData, workerOptions);
    } else {
      pool = pool.filter((data) => data != workerData);
    }
  }
}
function resolveCodecURI(codecURI, baseURI) {
  try {
    return new URL(codecURI, baseURI).toString();
  } catch {
    return codecURI;
  }
}
function armStarvationTimeout() {
  if (!starvationTimeout && pendingRequests.length && Number.isFinite(starvationDelay) && starvationDelay >= 0) {
    starvationTimeout = setTimeout(onWorkerStarvation, starvationDelay);
  }
}
function clearStarvationTimeout() {
  if (starvationTimeout) {
    clearTimeout(starvationTimeout);
    starvationTimeout = null;
  }
}
function onWorkerStarvation() {
  starvationTimeout = null;
  if (pendingRequests.length) {
    const [{ resolve, stream, workerOptions }] = pendingRequests.splice(0, 1);
    resolve(new CodecWorker({}, stream, getInlineWorkerOptions(workerOptions), onInlineTaskFinished));
    armStarvationTimeout();
  }
}
function runPendingRequestsInline() {
  const tasks = pendingRequests.splice(0).map(({ resolve, stream, workerOptions }) => new Promise((resolveTask) => {
    resolve(new CodecWorker({}, stream, getInlineWorkerOptions(workerOptions), () => {
      onInlineTaskFinished();
      resolveTask();
    }));
  }));
  clearStarvationTimeout();
  return Promise.all(tasks);
}
function getInlineWorkerOptions(workerOptions) {
  return Object.assign({}, workerOptions, { useWebWorkers: false, workerURI: UNDEFINED_VALUE, createWorker: UNDEFINED_VALUE });
}
function onInlineTaskFinished() {
  clearStarvationTimeout();
  armStarvationTimeout();
}
function terminateWorker2(workerData, workerOptions) {
  const { config: config2 } = workerOptions;
  const { terminateWorkerTimeout } = config2;
  if (Number.isFinite(terminateWorkerTimeout) && terminateWorkerTimeout >= 0) {
    workerData.terminateTimeout = setTimeout(async () => {
      pool = pool.filter((data) => data != workerData);
      try {
        await workerData.terminate();
      } catch {
      }
    }, terminateWorkerTimeout);
  }
}
function clearTerminateTimeout(workerData) {
  const { terminateTimeout } = workerData;
  if (terminateTimeout) {
    clearTimeout(terminateTimeout);
    workerData.terminateTimeout = null;
  }
}
var pool;
var pendingRequests;
var starvationTimeout;
var starvationDelay;
var indexWorker;
var init_codec_pool = __esm({
  "node_modules/@zip.js/zip.js/lib/core/codec-pool.js"() {
    init_constants();
    init_codec_stream();
    init_codec_registry();
    init_codec_worker();
    pool = [];
    pendingRequests = [];
    indexWorker = 0;
  }
});
function decodeCP437(stringValue) {
  let result = "";
  for (let indexCharacter = 0; indexCharacter < stringValue.length; indexCharacter++) {
    result += CP437[stringValue[indexCharacter]];
  }
  return result;
}
var CP437;
var init_decode_cp437 = __esm({
  "node_modules/@zip.js/zip.js/lib/core/util/decode-cp437.js"() {
    CP437 = "\0\u263A\u263B\u2665\u2666\u2663\u2660\u2022\u25D8\u25CB\u25D9\u2642\u2640\u266A\u266B\u263C\u25BA\u25C4\u2195\u203C\xB6\xA7\u25AC\u21A8\u2191\u2193\u2192\u2190\u221F\u2194\u25B2\u25BC !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\u2302\xC7\xFC\xE9\xE2\xE4\xE0\xE5\xE7\xEA\xEB\xE8\xEF\xEE\xEC\xC4\xC5\xC9\xE6\xC6\xF4\xF6\xF2\xFB\xF9\xFF\xD6\xDC\xA2\xA3\xA5\u20A7\u0192\xE1\xED\xF3\xFA\xF1\xD1\xAA\xBA\xBF\u2310\xAC\xBD\xBC\xA1\xAB\xBB\u2591\u2592\u2593\u2502\u2524\u2561\u2562\u2556\u2555\u2563\u2551\u2557\u255D\u255C\u255B\u2510\u2514\u2534\u252C\u251C\u2500\u253C\u255E\u255F\u255A\u2554\u2569\u2566\u2560\u2550\u256C\u2567\u2568\u2564\u2565\u2559\u2558\u2552\u2553\u256B\u256A\u2518\u250C\u2588\u2584\u258C\u2590\u2580\u03B1\xDF\u0393\u03C0\u03A3\u03C3\xB5\u03C4\u03A6\u0398\u03A9\u03B4\u221E\u03C6\u03B5\u2229\u2261\xB1\u2265\u2264\u2320\u2321\xF7\u2248\xB0\u2219\xB7\u221A\u207F\xB2\u25A0\xA0".split("");
  }
});
function decodeText(value, encoding) {
  return decode(value, encoding, true);
}
function isUTF8Text(value) {
  if (value.some((byte) => byte > 127)) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(value);
      return true;
    } catch {
      return false;
    }
  } else {
    return false;
  }
}
function decode(value, encoding, ignoreBOM) {
  if (encoding && encoding.trim().toLowerCase() == "cp437") {
    return decodeCP437(value);
  } else {
    return new TextDecoder(encoding, { ignoreBOM }).decode(value);
  }
}
var init_decode_text = __esm({
  "node_modules/@zip.js/zip.js/lib/core/util/decode-text.js"() {
    init_decode_cp437();
  }
});
function probeBlobSliceReliability() {
  blobSliceProbe = (async () => {
    try {
      const slicedBlob = new Blob([new Uint8Array(3)]).slice(1, 2);
      const streamReader = slicedBlob.stream().getReader();
      let streamedLength = 0;
      let result = await streamReader.read();
      while (!result.done) {
        streamedLength += result.value.length;
        result = await streamReader.read();
      }
      blobSliceReliable = streamedLength == 1;
    } catch {
      blobSliceReliable = false;
    }
  })();
}
function ownsWritable(writer) {
  return Boolean(writer && writer.getData);
}
async function initStream(stream, initSize) {
  if (stream.init && !stream.initialized) {
    await stream.init(initSize);
  } else {
    return Promise.resolve();
  }
}
async function initDiskReader(diskReader) {
  diskReader = new GenericReader(diskReader);
  await initStream(diskReader);
  if (diskReader.size === UNDEFINED_VALUE || !diskReader.readUint8Array) {
    diskReader = new BlobReader(await streamToBlob(diskReader.readable));
    await initStream(diskReader);
  }
  return diskReader;
}
function readUint8Array(reader, offset, size) {
  return reader.readUint8Array(offset, size);
}
function createReadable(reader, options) {
  if (reader.createReadable) {
    return reader.createReadable(options);
  } else if (reader.readUint8Array) {
    return Reader.prototype.createReadable.call(reader, options);
  } else {
    return reader.readable;
  }
}
var ERR_ITERATOR_COMPLETED_TOO_SOON;
var ERR_WRITER_SIZE_NOT_WRITABLE;
var DEFAULT_BUFFER_SIZE;
var DEFAULT_MAXIMUM_RANGE_SIZE;
var END_OF_CENTRAL_DIR_SEARCH_LENGTH;
var PROPERTY_NAME_WRITABLE;
var DISK_BOUNDARY;
var Stream;
var Reader;
var blobSliceReliable;
var blobSliceProbe;
var BlobReader;
var SplitDataReader;
var SplitDataWriter;
var GenericReader;
var GenericWriter;
var init_io = __esm({
  "node_modules/@zip.js/zip.js/lib/core/io.js"() {
    init_constants();
    init_configuration();
    init_array();
    init_compatible_streams();
    init_decode_text();
    ERR_ITERATOR_COMPLETED_TOO_SOON = "Writer iterator completed too soon";
    ERR_WRITER_SIZE_NOT_WRITABLE = "Invalid writer (size must be writable)";
    DEFAULT_BUFFER_SIZE = 256 * 1024;
    DEFAULT_MAXIMUM_RANGE_SIZE = 16 * 1024 * 1024;
    END_OF_CENTRAL_DIR_SEARCH_LENGTH = END_OF_CENTRAL_DIR_LENGTH + MAX_16_BITS;
    PROPERTY_NAME_WRITABLE = "writable";
    DISK_BOUNDARY = Symbol();
    Stream = class {
      constructor() {
        this.size = 0;
      }
      init() {
        this.initialized = true;
      }
    };
    Reader = class extends Stream {
      get readable() {
        return this.createReadable();
      }
      createReadable({ offset = 0, size, chunkSize = getChunkSize(getConfiguration()) } = {}) {
        const reader = this;
        let chunkOffset = 0;
        chunkSize = normalizeChunkSize(chunkSize);
        return new ReadableStream({
          async pull(controller) {
            const dataSize = size === UNDEFINED_VALUE ? chunkSize : Math.min(chunkSize, size - chunkOffset);
            const data = await readUint8Array(reader, offset + chunkOffset, dataSize);
            if (data.length) {
              controller.enqueue(data);
              chunkOffset += data.length;
            }
            if (size !== UNDEFINED_VALUE && chunkOffset >= size || !data.length && dataSize) {
              controller.close();
            }
          }
        });
      }
    };
    BlobReader = class extends Reader {
      constructor(blob) {
        super();
        Object.assign(this, {
          sourceBlob: blob,
          size: blob.size
        });
        if (!blobSliceProbe) {
          probeBlobSliceReliability();
        }
      }
      createReadable(options) {
        const reader = this;
        const { sourceBlob, size } = reader;
        const { offset = 0, size: readSize = size - offset } = options || {};
        if (typeof sourceBlob.stream == FUNCTION_TYPE) {
          if (!offset && readSize >= size) {
            return toCompatibleReadable(sourceBlob.stream());
          }
          if (blobSliceReliable) {
            return toCompatibleReadable(sourceBlob.slice(offset, offset + readSize).stream());
          }
        }
        return super.createReadable(options);
      }
      async readUint8Array(offset, length) {
        const reader = this;
        const offsetEnd = offset + length;
        const readsWholeBlob = !offset && offsetEnd >= reader.size;
        const blob = readsWholeBlob ? reader.sourceBlob : reader.sourceBlob.slice(offset, offsetEnd);
        let arrayBuffer = await blob.arrayBuffer();
        const sliceIgnoredByBuggyImplementation = arrayBuffer.byteLength > length;
        if (sliceIgnoredByBuggyImplementation) {
          arrayBuffer = arrayBuffer.slice(offset, offsetEnd);
        }
        return new Uint8Array(arrayBuffer);
      }
    };
    SplitDataReader = class extends Reader {
      constructor(readers) {
        super();
        this.readers = readers;
      }
      async init() {
        const reader = this;
        reader.lastDiskNumber = 0;
        const readers = reader.readers = await Promise.all(reader.readers.map(initDiskReader));
        reader.diskOffsets = readers.map((diskReader) => {
          const diskOffset = reader.size;
          reader.size += diskReader.size;
          return diskOffset;
        });
        super.init();
      }
      getDiskOffset(diskNumber) {
        const { diskOffsets, size } = this;
        const diskOffset = diskOffsets[diskNumber];
        return diskOffset === UNDEFINED_VALUE ? size : diskOffset;
      }
      async readUint8Array(offset, length) {
        const reader = this;
        const { readers } = this;
        let result;
        let currentDiskNumber = 0;
        let currentReaderOffset = offset;
        while (readers[currentDiskNumber] && currentReaderOffset >= readers[currentDiskNumber].size) {
          currentReaderOffset -= readers[currentDiskNumber].size;
          currentDiskNumber++;
        }
        const currentReader = readers[currentDiskNumber];
        if (currentReader) {
          const currentReaderSize = currentReader.size;
          if (currentReaderOffset + length <= currentReaderSize) {
            result = await readUint8Array(currentReader, currentReaderOffset, length);
          } else {
            const chunkLength = currentReaderSize - currentReaderOffset;
            const firstPart = await readUint8Array(currentReader, currentReaderOffset, chunkLength);
            const secondPart = await reader.readUint8Array(offset + chunkLength, length - chunkLength);
            result = concat(firstPart, secondPart);
          }
        } else {
          result = EMPTY_UINT8_ARRAY;
        }
        reader.lastDiskNumber = Math.max(currentDiskNumber, reader.lastDiskNumber);
        return result;
      }
    };
    SplitDataWriter = class extends Stream {
      constructor(writerGenerator, maxSize = 4294967295) {
        super();
        const writer = this;
        Object.assign(writer, {
          diskNumber: 0,
          diskOffset: 0,
          size: 0,
          maxSize,
          availableSize: maxSize
        });
        let diskSourceWriter, diskWritable, diskWriter;
        const writable = new WritableStream({
          async write(chunk) {
            if (chunk === DISK_BOUNDARY) {
              if (diskWriter) {
                await endDisk();
              }
              return;
            }
            const { availableSize } = writer;
            if (!diskWriter) {
              const { value, done } = await writerGenerator.next();
              if (done && !value) {
                throw new Error(ERR_ITERATOR_COMPLETED_TOO_SOON);
              } else {
                diskSourceWriter = value;
                diskSourceWriter.size = 0;
                if (diskSourceWriter.maxSize) {
                  writer.maxSize = diskSourceWriter.maxSize;
                }
                writer.availableSize = writer.maxSize;
                await initStream(diskSourceWriter);
                diskWritable = value.writable;
                diskWriter = diskWritable.getWriter();
              }
              await this.write(chunk);
            } else if (chunk.length >= availableSize) {
              await writeChunk(chunk.subarray(0, availableSize));
              await endDisk();
              if (chunk.length > availableSize) {
                await this.write(chunk.subarray(availableSize));
              }
            } else {
              await writeChunk(chunk);
            }
          },
          async close() {
            if (diskWriter) {
              await diskWriter.ready;
              await closeDiskWriter();
            }
          },
          async abort(reason) {
            if (diskWriter) {
              await diskWriter.abort(reason);
            }
          }
        });
        Object.defineProperty(writer, PROPERTY_NAME_WRITABLE, {
          get() {
            return writable;
          }
        });
        async function writeChunk(chunk) {
          const chunkLength = chunk.length;
          if (chunkLength) {
            await diskWriter.ready;
            await diskWriter.write(chunk);
            diskSourceWriter.size += chunkLength;
            writer.availableSize -= chunkLength;
          }
        }
        async function endDisk() {
          await closeDiskWriter();
          writer.diskOffset += diskSourceWriter.size;
          writer.diskNumber++;
          diskWriter = null;
          writer.availableSize = writer.maxSize;
        }
        async function closeDiskWriter() {
          await diskWriter.close();
        }
      }
      async closeDisk() {
        const streamWriter = this.writable.getWriter();
        try {
          await streamWriter.ready;
          await streamWriter.write(DISK_BOUNDARY);
        } finally {
          streamWriter.releaseLock();
        }
      }
    };
    GenericReader = class {
      constructor(reader) {
        if (Array.isArray(reader)) {
          reader = new SplitDataReader(reader);
        }
        if (reader instanceof ReadableStream || typeof reader.getReader == FUNCTION_TYPE) {
          reader = {
            readable: toCompatibleReadable(reader)
          };
        }
        return reader;
      }
    };
    GenericWriter = class {
      constructor(writer) {
        if (writer.writable === UNDEFINED_VALUE && typeof writer.next == FUNCTION_TYPE) {
          writer = new SplitDataWriter(writer);
        }
        if (writer instanceof WritableStream || typeof writer.getWriter == FUNCTION_TYPE) {
          writer = {
            writable: toCompatibleWritable(writer)
          };
        }
        try {
          writer.size = writer.size === UNDEFINED_VALUE ? 0 : writer.size;
        } catch {
          throw new Error(ERR_WRITER_SIZE_NOT_WRITABLE);
        }
        return writer;
      }
    };
  }
});
function addWarning(warnings, reason, filename) {
  if (!warnings.some((warning) => warning.reason == reason)) {
    const warning = { reason };
    if (filename !== UNDEFINED_VALUE) {
      warning.filename = filename;
    }
    warnings.push(warning);
  }
}
var init_warnings = __esm({
  "node_modules/@zip.js/zip.js/lib/core/util/warnings.js"() {
    init_constants();
  }
});
function getUserExtraField(extraField) {
  if (extraField) {
    const userExtraField = /* @__PURE__ */ new Map();
    extraField.forEach((field, type) => {
      if (!INTERPRETED_EXTRA_FIELD_TYPES.has(type)) {
        userExtraField.set(type, field.data);
      }
    });
    if (userExtraField.size) {
      return userExtraField;
    }
  }
}
function getEncryptionOverhead(encrypted, zipCrypto, encryptionStrength) {
  return encrypted ? zipCrypto ? 12 : 16 + encryptionStrength * 4 : 0;
}
var PROPERTY_NAME_FILENAME;
var PROPERTY_NAME_RAW_FILENAME;
var PROPERTY_NAME_COMMENT;
var PROPERTY_NAME_RAW_COMMENT;
var PROPERTY_NAME_UNCOMPRESSED_SIZE;
var PROPERTY_NAME_COMPRESSED_SIZE;
var PROPERTY_NAME_OFFSET;
var PROPERTY_NAME_DISK_NUMBER_START;
var PROPERTY_NAME_LAST_MODIFICATION_DATE;
var PROPERTY_NAME_RAW_LAST_MODIFICATION_DATE;
var PROPERTY_NAME_LAST_ACCESS_DATE;
var PROPERTY_NAME_RAW_LAST_ACCESS_DATE;
var PROPERTY_NAME_CREATION_DATE;
var PROPERTY_NAME_RAW_CREATION_DATE;
var PROPERTY_NAME_INTERNAL_FILE_ATTRIBUTES;
var PROPERTY_NAME_EXTERNAL_FILE_ATTRIBUTES;
var PROPERTY_NAME_MSDOS_ATTRIBUTES_RAW;
var PROPERTY_NAME_MSDOS_ATTRIBUTES;
var PROPERTY_NAME_MS_DOS_COMPATIBLE;
var PROPERTY_NAME_ZIP64;
var PROPERTY_NAME_ENCRYPTED;
var PROPERTY_NAME_VERSION;
var PROPERTY_NAME_VERSION_MADE_BY;
var PROPERTY_NAME_ZIPCRYPTO;
var PROPERTY_NAME_DIRECTORY;
var PROPERTY_NAME_EXECUTABLE;
var PROPERTY_NAME_SYMLINK;
var PROPERTY_NAME_COMPRESSION_METHOD;
var PROPERTY_NAME_SIGNATURE;
var PROPERTY_NAME_CRC32;
var PROPERTY_NAME_EXTRA_FIELD;
var PROPERTY_NAME_EXTRA_FIELD_INFOZIP;
var PROPERTY_NAME_EXTRA_FIELD_UNIX;
var PROPERTY_NAME_EXTRA_FIELD_UNIX_TYPE1;
var PROPERTY_NAME_EXTRA_FIELD_PKWARE_UNIX;
var PROPERTY_NAME_UID;
var PROPERTY_NAME_GID;
var PROPERTY_NAME_UNIX_MODE;
var PROPERTY_NAME_SETUID;
var PROPERTY_NAME_SETGID;
var PROPERTY_NAME_STICKY;
var PROPERTY_NAME_BITFLAG;
var PROPERTY_NAME_RAW_BITFLAG;
var PROPERTY_NAME_FILENAME_LENGTH;
var PROPERTY_NAME_EXTRA_FIELD_LENGTH;
var PROPERTY_NAME_UNIX_EXTERNAL_UPPER;
var PROPERTY_NAME_FILENAME_UTF8;
var PROPERTY_NAME_COMMENT_UTF8;
var PROPERTY_NAME_RAW_EXTRA_FIELD;
var PROPERTY_NAME_EXTRA_FIELD_ZIP64;
var PROPERTY_NAME_EXTRA_FIELD_UNICODE_PATH;
var PROPERTY_NAME_EXTRA_FIELD_UNICODE_COMMENT;
var PROPERTY_NAME_EXTRA_FIELD_AES;
var PROPERTY_NAME_EXTRA_FIELD_NTFS;
var PROPERTY_NAME_EXTRA_FIELD_EXTENDED_TIMESTAMP;
var PROPERTY_NAME_EXTRA_FIELD_USDZ;
var PROPERTY_NAMES;
var Entry;
var INTERPRETED_EXTRA_FIELD_TYPES;
var init_zip_entry = __esm({
  "node_modules/@zip.js/zip.js/lib/core/zip-entry.js"() {
    init_constants();
    PROPERTY_NAME_FILENAME = "filename";
    PROPERTY_NAME_RAW_FILENAME = "rawFilename";
    PROPERTY_NAME_COMMENT = "comment";
    PROPERTY_NAME_RAW_COMMENT = "rawComment";
    PROPERTY_NAME_UNCOMPRESSED_SIZE = "uncompressedSize";
    PROPERTY_NAME_COMPRESSED_SIZE = "compressedSize";
    PROPERTY_NAME_OFFSET = "offset";
    PROPERTY_NAME_DISK_NUMBER_START = "diskNumberStart";
    PROPERTY_NAME_LAST_MODIFICATION_DATE = "lastModDate";
    PROPERTY_NAME_RAW_LAST_MODIFICATION_DATE = "rawLastModDate";
    PROPERTY_NAME_LAST_ACCESS_DATE = "lastAccessDate";
    PROPERTY_NAME_RAW_LAST_ACCESS_DATE = "rawLastAccessDate";
    PROPERTY_NAME_CREATION_DATE = "creationDate";
    PROPERTY_NAME_RAW_CREATION_DATE = "rawCreationDate";
    PROPERTY_NAME_INTERNAL_FILE_ATTRIBUTES = "internalFileAttributes";
    PROPERTY_NAME_EXTERNAL_FILE_ATTRIBUTES = "externalFileAttributes";
    PROPERTY_NAME_MSDOS_ATTRIBUTES_RAW = "msdosAttributesRaw";
    PROPERTY_NAME_MSDOS_ATTRIBUTES = "msdosAttributes";
    PROPERTY_NAME_MS_DOS_COMPATIBLE = "msDosCompatible";
    PROPERTY_NAME_ZIP64 = "zip64";
    PROPERTY_NAME_ENCRYPTED = "encrypted";
    PROPERTY_NAME_VERSION = "version";
    PROPERTY_NAME_VERSION_MADE_BY = "versionMadeBy";
    PROPERTY_NAME_ZIPCRYPTO = "zipCrypto";
    PROPERTY_NAME_DIRECTORY = "directory";
    PROPERTY_NAME_EXECUTABLE = "executable";
    PROPERTY_NAME_SYMLINK = "symlink";
    PROPERTY_NAME_COMPRESSION_METHOD = "compressionMethod";
    PROPERTY_NAME_SIGNATURE = "signature";
    PROPERTY_NAME_CRC32 = "crc32";
    PROPERTY_NAME_EXTRA_FIELD = "extraField";
    PROPERTY_NAME_EXTRA_FIELD_INFOZIP = "extraFieldInfoZip";
    PROPERTY_NAME_EXTRA_FIELD_UNIX = "extraFieldUnix";
    PROPERTY_NAME_EXTRA_FIELD_UNIX_TYPE1 = "extraFieldUnixType1";
    PROPERTY_NAME_EXTRA_FIELD_PKWARE_UNIX = "extraFieldPkwareUnix";
    PROPERTY_NAME_UID = "uid";
    PROPERTY_NAME_GID = "gid";
    PROPERTY_NAME_UNIX_MODE = "unixMode";
    PROPERTY_NAME_SETUID = "setuid";
    PROPERTY_NAME_SETGID = "setgid";
    PROPERTY_NAME_STICKY = "sticky";
    PROPERTY_NAME_BITFLAG = "bitFlag";
    PROPERTY_NAME_RAW_BITFLAG = "rawBitFlag";
    PROPERTY_NAME_FILENAME_LENGTH = "filenameLength";
    PROPERTY_NAME_EXTRA_FIELD_LENGTH = "extraFieldLength";
    PROPERTY_NAME_UNIX_EXTERNAL_UPPER = "unixExternalUpper";
    PROPERTY_NAME_FILENAME_UTF8 = "filenameUTF8";
    PROPERTY_NAME_COMMENT_UTF8 = "commentUTF8";
    PROPERTY_NAME_RAW_EXTRA_FIELD = "rawExtraField";
    PROPERTY_NAME_EXTRA_FIELD_ZIP64 = "extraFieldZip64";
    PROPERTY_NAME_EXTRA_FIELD_UNICODE_PATH = "extraFieldUnicodePath";
    PROPERTY_NAME_EXTRA_FIELD_UNICODE_COMMENT = "extraFieldUnicodeComment";
    PROPERTY_NAME_EXTRA_FIELD_AES = "extraFieldAES";
    PROPERTY_NAME_EXTRA_FIELD_NTFS = "extraFieldNTFS";
    PROPERTY_NAME_EXTRA_FIELD_EXTENDED_TIMESTAMP = "extraFieldExtendedTimestamp";
    PROPERTY_NAME_EXTRA_FIELD_USDZ = "extraFieldUSDZ";
    PROPERTY_NAMES = [
      PROPERTY_NAME_FILENAME,
      PROPERTY_NAME_RAW_FILENAME,
      PROPERTY_NAME_UNCOMPRESSED_SIZE,
      PROPERTY_NAME_COMPRESSED_SIZE,
      PROPERTY_NAME_LAST_MODIFICATION_DATE,
      PROPERTY_NAME_RAW_LAST_MODIFICATION_DATE,
      PROPERTY_NAME_COMMENT,
      PROPERTY_NAME_RAW_COMMENT,
      PROPERTY_NAME_LAST_ACCESS_DATE,
      PROPERTY_NAME_RAW_LAST_ACCESS_DATE,
      PROPERTY_NAME_CREATION_DATE,
      PROPERTY_NAME_RAW_CREATION_DATE,
      PROPERTY_NAME_OFFSET,
      PROPERTY_NAME_DISK_NUMBER_START,
      PROPERTY_NAME_INTERNAL_FILE_ATTRIBUTES,
      PROPERTY_NAME_EXTERNAL_FILE_ATTRIBUTES,
      PROPERTY_NAME_MSDOS_ATTRIBUTES_RAW,
      PROPERTY_NAME_MSDOS_ATTRIBUTES,
      PROPERTY_NAME_MS_DOS_COMPATIBLE,
      PROPERTY_NAME_ZIP64,
      PROPERTY_NAME_ENCRYPTED,
      PROPERTY_NAME_VERSION,
      PROPERTY_NAME_VERSION_MADE_BY,
      PROPERTY_NAME_ZIPCRYPTO,
      PROPERTY_NAME_DIRECTORY,
      PROPERTY_NAME_EXECUTABLE,
      PROPERTY_NAME_SYMLINK,
      PROPERTY_NAME_COMPRESSION_METHOD,
      PROPERTY_NAME_SIGNATURE,
      PROPERTY_NAME_CRC32,
      PROPERTY_NAME_EXTRA_FIELD,
      PROPERTY_NAME_EXTRA_FIELD_UNIX,
      PROPERTY_NAME_EXTRA_FIELD_INFOZIP,
      PROPERTY_NAME_EXTRA_FIELD_UNIX_TYPE1,
      PROPERTY_NAME_EXTRA_FIELD_PKWARE_UNIX,
      PROPERTY_NAME_UID,
      PROPERTY_NAME_GID,
      PROPERTY_NAME_UNIX_MODE,
      PROPERTY_NAME_UNIX_EXTERNAL_UPPER,
      PROPERTY_NAME_SETUID,
      PROPERTY_NAME_SETGID,
      PROPERTY_NAME_STICKY,
      PROPERTY_NAME_BITFLAG,
      PROPERTY_NAME_RAW_BITFLAG,
      PROPERTY_NAME_FILENAME_LENGTH,
      PROPERTY_NAME_EXTRA_FIELD_LENGTH,
      PROPERTY_NAME_FILENAME_UTF8,
      PROPERTY_NAME_COMMENT_UTF8,
      PROPERTY_NAME_RAW_EXTRA_FIELD,
      PROPERTY_NAME_EXTRA_FIELD_ZIP64,
      PROPERTY_NAME_EXTRA_FIELD_UNICODE_PATH,
      PROPERTY_NAME_EXTRA_FIELD_UNICODE_COMMENT,
      PROPERTY_NAME_EXTRA_FIELD_AES,
      PROPERTY_NAME_EXTRA_FIELD_NTFS,
      PROPERTY_NAME_EXTRA_FIELD_EXTENDED_TIMESTAMP,
      PROPERTY_NAME_EXTRA_FIELD_USDZ
    ];
    Entry = class {
      constructor(data) {
        PROPERTY_NAMES.forEach((name) => this[name] = data[name]);
      }
    };
    INTERPRETED_EXTRA_FIELD_TYPES = /* @__PURE__ */ new Set([
      EXTRAFIELD_TYPE_ZIP64,
      EXTRAFIELD_TYPE_AES,
      EXTRAFIELD_TYPE_NTFS,
      EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP,
      EXTRAFIELD_TYPE_UNICODE_PATH,
      EXTRAFIELD_TYPE_UNICODE_COMMENT,
      EXTRAFIELD_TYPE_USDZ,
      EXTRAFIELD_TYPE_INFOZIP,
      EXTRAFIELD_TYPE_UNIX,
      EXTRAFIELD_TYPE_UNIX_TYPE1,
      EXTRAFIELD_TYPE_PKWARE_UNIX
    ]);
  }
});
var zip_reader_exports = {};
__export(zip_reader_exports, {
  ERR_AMBIGUOUS_ARCHIVE: () => ERR_AMBIGUOUS_ARCHIVE,
  ERR_BAD_FORMAT: () => ERR_BAD_FORMAT,
  ERR_CENTRAL_DIRECTORY_NOT_FOUND: () => ERR_CENTRAL_DIRECTORY_NOT_FOUND,
  ERR_CODEC_OUT_OF_MEMORY: () => ERR_CODEC_OUT_OF_MEMORY,
  ERR_ENCRYPTED: () => ERR_ENCRYPTED,
  ERR_ENCRYPTED_CENTRAL_DIRECTORY: () => ERR_ENCRYPTED_CENTRAL_DIRECTORY,
  ERR_ENTRY_DATA_OUT_OF_BOUNDS: () => ERR_ENTRY_DATA_OUT_OF_BOUNDS,
  ERR_EOCDR_LOCATOR_ZIP64_NOT_FOUND: () => ERR_EOCDR_LOCATOR_ZIP64_NOT_FOUND,
  ERR_EOCDR_NOT_FOUND: () => ERR_EOCDR_NOT_FOUND,
  ERR_EXTRAFIELD_ZIP64_NOT_FOUND: () => ERR_EXTRAFIELD_ZIP64_NOT_FOUND,
  ERR_INVALID_AUTHENTICATION_CODE: () => ERR_INVALID_AUTHENTICATION_CODE,
  ERR_INVALID_COMPRESSED_DATA: () => ERR_INVALID_COMPRESSED_DATA,
  ERR_INVALID_CRC32: () => ERR_INVALID_CRC32,
  ERR_INVALID_FILENAME_VALIDATION: () => ERR_INVALID_FILENAME_VALIDATION,
  ERR_INVALID_MAX_APPENDED_DATA_SIZE: () => ERR_INVALID_MAX_APPENDED_DATA_SIZE,
  ERR_INVALID_PASSWORD: () => ERR_INVALID_PASSWORD,
  ERR_INVALID_STRICTNESS: () => ERR_INVALID_STRICTNESS,
  ERR_INVALID_UNCOMPRESSED_SIZE: () => ERR_INVALID_UNCOMPRESSED_SIZE,
  ERR_LOCAL_FILE_HEADER_NOT_FOUND: () => ERR_LOCAL_FILE_HEADER_NOT_FOUND,
  ERR_OVERLAPPING_ENTRY: () => ERR_OVERLAPPING_ENTRY,
  ERR_SPLIT_ZIP_FILE: () => ERR_SPLIT_ZIP_FILE,
  ERR_UNSAFE_FILENAME: () => ERR_UNSAFE_FILENAME,
  ERR_UNSUPPORTED_COMPRESSION: () => ERR_UNSUPPORTED_COMPRESSION,
  ERR_UNSUPPORTED_ENCRYPTION: () => ERR_UNSUPPORTED_ENCRYPTION,
  ERR_UNSUPPORTED_UINT64: () => ERR_UNSUPPORTED_UINT64,
  ERR_WORKER_STARTUP_TIMEOUT: () => ERR_WORKER_STARTUP_TIMEOUT,
  WARNING_APPENDED_DATA: () => WARNING_APPENDED_DATA,
  WARNING_COMPRESSED_PATCHED_DATA: () => WARNING_COMPRESSED_PATCHED_DATA,
  WARNING_DUPLICATE_FILENAME: () => WARNING_DUPLICATE_FILENAME,
  WARNING_MALFORMED_EXTRA_FIELD: () => WARNING_MALFORMED_EXTRA_FIELD,
  WARNING_MISMATCHED_CENTRAL_DIRECTORY_OFFSET: () => WARNING_MISMATCHED_CENTRAL_DIRECTORY_OFFSET,
  WARNING_MISMATCHED_LOCAL_FILE_HEADER_BIT_FLAG: () => WARNING_MISMATCHED_LOCAL_FILE_HEADER_BIT_FLAG,
  WARNING_MISMATCHED_LOCAL_FILE_HEADER_COMPRESSION_METHOD: () => WARNING_MISMATCHED_LOCAL_FILE_HEADER_COMPRESSION_METHOD,
  WARNING_MISMATCHED_LOCAL_FILE_HEADER_CRC32_OR_SIZES: () => WARNING_MISMATCHED_LOCAL_FILE_HEADER_CRC32_OR_SIZES,
  WARNING_MISMATCHED_LOCAL_FILE_HEADER_FILENAME: () => WARNING_MISMATCHED_LOCAL_FILE_HEADER_FILENAME,
  WARNING_MISMATCHED_ZIP64_END_OF_CENTRAL_DIRECTORY: () => WARNING_MISMATCHED_ZIP64_END_OF_CENTRAL_DIRECTORY,
  WARNING_MISSING_ZIP64_EXTRA_FIELD: () => WARNING_MISSING_ZIP64_EXTRA_FIELD,
  WARNING_MULTIPLE_END_OF_CENTRAL_DIRECTORY: () => WARNING_MULTIPLE_END_OF_CENTRAL_DIRECTORY,
  WARNING_PREPENDED_CENTRAL_DIRECTORY: () => WARNING_PREPENDED_CENTRAL_DIRECTORY,
  WARNING_PREPENDED_DATA: () => WARNING_PREPENDED_DATA,
  WARNING_TRAILING_CENTRAL_DIRECTORY_DATA: () => WARNING_TRAILING_CENTRAL_DIRECTORY_DATA,
  WARNING_UNKNOWN_VERSION: () => WARNING_UNKNOWN_VERSION,
  WARNING_UNKNOWN_ZIP64_EXTENSIBLE_DATA: () => WARNING_UNKNOWN_ZIP64_EXTENSIBLE_DATA,
  WARNING_UNSORTED_CENTRAL_DIRECTORY: () => WARNING_UNSORTED_CENTRAL_DIRECTORY,
  WARNING_WRAPPED_ENTRIES_COUNT: () => WARNING_WRAPPED_ENTRIES_COUNT,
  ZipReader: () => ZipReader,
  ZipReaderStream: () => ZipReaderStream,
  getEntryDataDescriptorLength: () => getEntryDataDescriptorLength,
  isZipFile: () => isZipFile
});
function createEntryStream(entry, pendingEntries2) {
  const { readable, writable } = new TransformStream();
  let dataReader;
  const entryStream = {
    cancel: async (reason) => {
      pendingEntries2.delete(entryStream);
      await (dataReader ? dataReader.cancel(reason) : readable.cancel(reason));
    }
  };
  entryStream.readable = new ReadableStream({
    async pull(controller) {
      if (!dataReader) {
        dataReader = readable.getReader();
        pendingEntries2.add(entryStream);
        getData();
      }
      const { done, value } = await dataReader.read();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
    cancel: (reason) => entryStream.cancel(reason)
  }, { highWaterMark: 0 });
  return entryStream;
  async function getData() {
    try {
      await entry.getData(writable, { preventClose: false });
    } catch (error) {
      try {
        await writable.abort(error);
      } catch {
      }
    } finally {
      pendingEntries2.delete(entryStream);
    }
  }
}
async function isZipFile(reader, options = {}) {
  reader = new GenericReader(reader);
  await initStream(reader);
  if (reader.size === UNDEFINED_VALUE || !reader.readUint8Array) {
    reader = new BlobReader(await streamToBlob(reader.readable));
    await initStream(reader);
  }
  if (reader.size < END_OF_CENTRAL_DIR_LENGTH) {
    return false;
  }
  const strictness = getStrictness(options, {});
  const rejectAmbiguousEndOfDirectory = strictness != STRICTNESS_TOLERANT;
  const maxAppendedDataSize = getMaxAppendedDataSize(options[OPTION_MAX_APPENDED_DATA_SIZE], strictness);
  const { endOfDirectoryInfo, endOfDirectoryReachingEndCount } = await findEndOfCentralDirectory(reader, rejectAmbiguousEndOfDirectory, maxAppendedDataSize);
  if (!endOfDirectoryInfo || strictness == STRICTNESS_STRICT && endOfDirectoryReachingEndCount > 1) {
    return false;
  }
  const commentLength = getUint16(getDataView(endOfDirectoryInfo), 20);
  const appendedDataOffset = endOfDirectoryInfo.offset + END_OF_CENTRAL_DIR_LENGTH + commentLength;
  return reader.size - appendedDataOffset <= maxAppendedDataSize;
}
function detectEncryptedCentralDirectory(directoryView) {
  return directoryView.byteLength >= 4 && getUint32(directoryView, 0) == ARCHIVE_EXTRA_DATA_SIGNATURE;
}
function getWrappedFilesLength(directoryView, directoryArray, offset) {
  let wrappedFilesLength = 0;
  while (offset + CENTRAL_FILE_HEADER_LENGTH <= directoryArray.length && getUint32(directoryView, offset) == CENTRAL_FILE_HEADER_SIGNATURE) {
    offset += CENTRAL_FILE_HEADER_LENGTH + getUint16(directoryView, offset + 28) + getUint16(directoryView, offset + 30) + getUint16(directoryView, offset + 32);
    wrappedFilesLength++;
  }
  return wrappedFilesLength % (MAX_16_BITS + 1) ? 0 : wrappedFilesLength;
}
function pointsAtDirectory(reader, offset) {
  return startsWithSignature(reader, offset, CENTRAL_FILE_HEADER_SIGNATURE);
}
async function startsWithSignature(reader, offset, signature) {
  if (offset < 0 || offset + 4 > reader.size) {
    return false;
  }
  const signatureArray = await readUint8Array(reader, offset, 4);
  return getUint32(getDataView(signatureArray), 0) == signature;
}
async function findDigitalSignatureRecordOffset(reader, endOffset) {
  const startOffset = Math.max(0, endOffset - (6 + MAX_16_BITS));
  const tailArray = await readUint8Array(reader, startOffset, endOffset - startOffset);
  const tailView = getDataView(tailArray);
  for (let indexByte = tailArray.length - 6; indexByte >= 0; indexByte--) {
    if (getUint32(tailView, indexByte) == DIGITAL_SIGNATURE_RECORD_SIGNATURE && indexByte + 6 + getUint16(tailView, indexByte + 4) == tailArray.length) {
      return startOffset + indexByte;
    }
  }
}
async function findZip64EndOfDirectoryOffset(reader, endOffset) {
  const startOffset = Math.max(0, endOffset - (ZIP64_END_OF_CENTRAL_DIR_LENGTH + MAX_16_BITS));
  const tailArray = await readUint8Array(reader, startOffset, endOffset - startOffset);
  const tailView = getDataView(tailArray);
  for (let indexByte = tailArray.length - ZIP64_END_OF_CENTRAL_DIR_LENGTH; indexByte >= 0; indexByte--) {
    if (getUint32(tailView, indexByte) == ZIP64_END_OF_CENTRAL_DIR_SIGNATURE && indexByte + 12 + Number(tailView.getBigUint64(indexByte + 4, true)) == tailArray.length) {
      return startOffset + indexByte;
    }
  }
}
async function probeLocalHeaders(reader, directoryArray, directoryView, offsetDelta) {
  let result = { localHeaderFound: false, shiftedLocalHeaderFound: false };
  let recordOffset = 0;
  while (recordOffset + CENTRAL_FILE_HEADER_LENGTH <= directoryArray.length && getUint32(directoryView, recordOffset) == CENTRAL_FILE_HEADER_SIGNATURE) {
    const localHeaderOffset = getLocalHeaderOffset(directoryArray, directoryView, recordOffset);
    if (localHeaderOffset !== UNDEFINED_VALUE) {
      const localHeaderFound = await startsWithSignature(reader, localHeaderOffset, LOCAL_FILE_HEADER_SIGNATURE);
      const shiftedLocalHeaderFound = await startsWithSignature(reader, localHeaderOffset + offsetDelta, LOCAL_FILE_HEADER_SIGNATURE);
      if (!recordOffset) {
        result = { localHeaderFound, shiftedLocalHeaderFound };
      }
      if (localHeaderFound != shiftedLocalHeaderFound) {
        return { localHeaderFound, shiftedLocalHeaderFound };
      }
    }
    recordOffset += CENTRAL_FILE_HEADER_LENGTH + getUint16(directoryView, recordOffset + 28) + getUint16(directoryView, recordOffset + 30) + getUint16(directoryView, recordOffset + 32);
  }
  return result;
}
function getLocalHeaderOffset(directoryArray, directoryView, recordOffset) {
  const localHeaderOffset = getUint32(directoryView, recordOffset + 42);
  if (localHeaderOffset != MAX_32_BITS) {
    return localHeaderOffset;
  }
  let offsetExtraField = recordOffset + CENTRAL_FILE_HEADER_LENGTH + getUint16(directoryView, recordOffset + 28);
  const endExtraField = Math.min(offsetExtraField + getUint16(directoryView, recordOffset + 30), directoryArray.length);
  while (offsetExtraField + 4 <= endExtraField) {
    const type = getUint16(directoryView, offsetExtraField);
    const size = getUint16(directoryView, offsetExtraField + 2);
    if (type == EXTRAFIELD_TYPE_ZIP64) {
      let offsetValue = offsetExtraField + 4;
      if (getUint32(directoryView, recordOffset + 24) == MAX_32_BITS) {
        offsetValue += 8;
      }
      if (getUint32(directoryView, recordOffset + 20) == MAX_32_BITS) {
        offsetValue += 8;
      }
      return offsetValue + 8 <= endExtraField ? getBigUint64(directoryView, offsetValue) : UNDEFINED_VALUE;
    }
    offsetExtraField += 4 + size;
  }
  return UNDEFINED_VALUE;
}
function readDigitalSignature(signatureRecordArray) {
  if (signatureRecordArray.length >= 6) {
    const signatureRecordView = getDataView(signatureRecordArray);
    if (getUint32(signatureRecordView, 0) == DIGITAL_SIGNATURE_RECORD_SIGNATURE) {
      const signatureDataLength = getUint16(signatureRecordView, 4);
      if (6 + signatureDataLength <= signatureRecordArray.length) {
        return new Uint8Array(signatureRecordArray.subarray(6, 6 + signatureDataLength));
      }
    }
  }
}
function getEncryptedDirectoryDataLength(directoryEncryptionInfo, declaredDirectoryDataLength, directoryDataLength) {
  const encryptedDirectoryDataLength = directoryEncryptionInfo && directoryEncryptionInfo.compressedSize ? directoryEncryptionInfo.compressedSize : declaredDirectoryDataLength;
  return encryptedDirectoryDataLength > 0 && encryptedDirectoryDataLength <= directoryDataLength ? encryptedDirectoryDataLength : directoryDataLength;
}
function getDirectoryEncryptionInfo(rawExtensibleData) {
  const directoryEncryptionInfo = { rawExtensibleData };
  if (rawExtensibleData.length >= 28) {
    const extensibleDataView = getDataView(rawExtensibleData);
    const hashDataLength = getUint16(extensibleDataView, 26);
    Object.assign(directoryEncryptionInfo, {
      compressionMethod: getUint16(extensibleDataView, 0),
      compressedSize: getBigUint64(extensibleDataView, 2),
      uncompressedSize: getBigUint64(extensibleDataView, 10),
      encryptionAlgorithm: getUint16(extensibleDataView, 18),
      bitLength: getUint16(extensibleDataView, 20),
      flags: getUint16(extensibleDataView, 22),
      hashAlgorithm: getUint16(extensibleDataView, 24),
      hashData: rawExtensibleData.subarray(28, 28 + hashDataLength)
    });
  }
  return directoryEncryptionInfo;
}
function readCommonHeader(directory, dataView, offset) {
  const rawBitFlag = directory.rawBitFlag = getUint16(dataView, offset + 2);
  const encrypted = (rawBitFlag & BITFLAG_ENCRYPTED) == BITFLAG_ENCRYPTED;
  const rawLastModDate = getUint32(dataView, offset + 6);
  Object.assign(directory, {
    encrypted,
    version: getUint16(dataView, offset),
    bitFlag: {
      level: (rawBitFlag & BITFLAG_LEVEL) >> 1,
      dataDescriptor: (rawBitFlag & BITFLAG_DATA_DESCRIPTOR) == BITFLAG_DATA_DESCRIPTOR,
      languageEncodingFlag: (rawBitFlag & BITFLAG_LANG_ENCODING_FLAG) == BITFLAG_LANG_ENCODING_FLAG
    },
    rawLastModDate,
    lastModDate: getDate(rawLastModDate),
    filenameLength: getUint16(dataView, offset + 22),
    extraFieldLength: getUint16(dataView, offset + 24)
  });
}
function readCommonFooter(fileEntry, directory, dataView, offset, localDirectory) {
  const { rawExtraField } = directory;
  const extraField = directory.extraField = /* @__PURE__ */ new Map();
  const rawExtraFieldView = getDataView(rawExtraField);
  let offsetExtraField = 0;
  let malformedExtraField = false;
  try {
    while (offsetExtraField < rawExtraField.length) {
      const type = getUint16(rawExtraFieldView, offsetExtraField);
      const size = getUint16(rawExtraFieldView, offsetExtraField + 2);
      extraField.set(type, {
        type,
        data: rawExtraField.slice(offsetExtraField + 4, offsetExtraField + 4 + size)
      });
      offsetExtraField += 4 + size;
    }
  } catch {
    malformedExtraField = true;
  }
  if (offsetExtraField > rawExtraField.length) {
    malformedExtraField = true;
  }
  const compressionMethod = getUint16(dataView, offset + 4);
  Object.assign(directory, {
    signature: getUint32(dataView, offset + HEADER_OFFSET_SIGNATURE),
    crc32: getUint32(dataView, offset + HEADER_OFFSET_SIGNATURE),
    compressedSize: getUint32(dataView, offset + HEADER_OFFSET_COMPRESSED_SIZE),
    uncompressedSize: getUint32(dataView, offset + HEADER_OFFSET_UNCOMPRESSED_SIZE)
  });
  const extraFieldZip64 = extraField.get(EXTRAFIELD_TYPE_ZIP64);
  let extraFieldZip64Missing;
  if (extraFieldZip64) {
    if (!readExtraFieldZip64(extraFieldZip64, directory, localDirectory)) {
      malformedExtraField = true;
    }
    directory.extraFieldZip64 = extraFieldZip64;
  } else if (ZIP64_PROPERTIES.some(([propertyName, max]) => directory[propertyName] == max)) {
    if (localDirectory) {
      malformedExtraField = true;
    } else {
      extraFieldZip64Missing = true;
    }
  }
  const extraFieldUnicodePath = extraField.get(EXTRAFIELD_TYPE_UNICODE_PATH);
  if (extraFieldUnicodePath) {
    readExtraFieldUnicode(extraFieldUnicodePath, PROPERTY_NAME_FILENAME, PROPERTY_NAME_RAW_FILENAME, directory, fileEntry);
    directory.extraFieldUnicodePath = extraFieldUnicodePath;
  }
  const extraFieldUnicodeComment = extraField.get(EXTRAFIELD_TYPE_UNICODE_COMMENT);
  if (extraFieldUnicodeComment) {
    readExtraFieldUnicode(extraFieldUnicodeComment, PROPERTY_NAME_COMMENT, PROPERTY_NAME_RAW_COMMENT, directory, fileEntry);
    directory.extraFieldUnicodeComment = extraFieldUnicodeComment;
  }
  const extraFieldAES = extraField.get(EXTRAFIELD_TYPE_AES);
  if (extraFieldAES && (compressionMethod == COMPRESSION_METHOD_AES || directory.encrypted) && extraFieldAES.data.length >= 7) {
    readExtraFieldAES(extraFieldAES, directory, compressionMethod);
    directory.extraFieldAES = extraFieldAES;
  } else {
    if (extraFieldAES) {
      malformedExtraField = true;
    }
    directory.compressionMethod = compressionMethod;
  }
  const extraFieldPkwareUnix = extraField.get(EXTRAFIELD_TYPE_PKWARE_UNIX);
  if (extraFieldPkwareUnix) {
    readExtraFieldUnixDates(extraFieldPkwareUnix, directory);
    directory.extraFieldPkwareUnix = extraFieldPkwareUnix;
  }
  const extraFieldUnixType1 = extraField.get(EXTRAFIELD_TYPE_UNIX_TYPE1);
  if (extraFieldUnixType1) {
    readExtraFieldUnixDates(extraFieldUnixType1, directory);
    directory.extraFieldUnixType1 = extraFieldUnixType1;
  }
  const extraFieldExtendedTimestamp = extraField.get(EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP);
  if (extraFieldExtendedTimestamp) {
    readExtraFieldExtendedTimestamp(extraFieldExtendedTimestamp, directory, localDirectory);
    directory.extraFieldExtendedTimestamp = extraFieldExtendedTimestamp;
  }
  const extraFieldNTFS = extraField.get(EXTRAFIELD_TYPE_NTFS);
  if (extraFieldNTFS) {
    readExtraFieldNTFS(extraFieldNTFS, directory);
    directory.extraFieldNTFS = extraFieldNTFS;
  }
  const extraFieldInfoZip = extraField.get(EXTRAFIELD_TYPE_INFOZIP);
  let unixIdsRead;
  if (extraFieldInfoZip) {
    unixIdsRead = readExtraFieldUnix(extraFieldInfoZip, directory, true);
    directory.extraFieldInfoZip = extraFieldInfoZip;
  }
  const extraFieldUnix = extraField.get(EXTRAFIELD_TYPE_UNIX);
  if (extraFieldUnix) {
    readExtraFieldUnix(extraFieldUnix, unixIdsRead ? {} : directory, false);
    directory.extraFieldUnix = extraFieldUnix;
  }
  const extraFieldUSDZ = extraField.get(EXTRAFIELD_TYPE_USDZ);
  if (extraFieldUSDZ) {
    directory.extraFieldUSDZ = extraFieldUSDZ;
  }
  if (extraFieldZip64Missing) {
    throw new Error(ERR_EXTRAFIELD_ZIP64_NOT_FOUND);
  }
  return malformedExtraField;
}
function readExtraFieldZip64(extraFieldZip64, directory, localDirectory) {
  directory.zip64 = true;
  const extraFieldView = getDataView(extraFieldZip64.data);
  const missingProperties = ZIP64_PROPERTIES.filter(([propertyName, max]) => directory[propertyName] == max);
  const requiredLength = missingProperties.reduce((length, [, max]) => length + ZIP64_EXTRACTION[max].bytes, 0);
  if (extraFieldZip64.data.length < requiredLength) {
    if (localDirectory) {
      return false;
    }
    throw new Error(ERR_EXTRAFIELD_ZIP64_NOT_FOUND);
  }
  const values = [];
  try {
    for (let indexMissingProperty = 0, offset = 0; indexMissingProperty < missingProperties.length; indexMissingProperty++) {
      const [, max] = missingProperties[indexMissingProperty];
      const extraction = ZIP64_EXTRACTION[max];
      values.push(extraction.getValue(extraFieldView, offset));
      offset += extraction.bytes;
    }
  } catch (error) {
    if (localDirectory) {
      return false;
    }
    throw error;
  }
  missingProperties.forEach(([propertyName], indexMissingProperty) => {
    directory[propertyName] = extraFieldZip64[propertyName] = values[indexMissingProperty];
  });
  return true;
}
function readExtraFieldUnicode(extraFieldUnicode, propertyName, rawPropertyName, directory, fileEntry) {
  if (extraFieldUnicode.data.length < 5) {
    extraFieldUnicode.valid = false;
    return;
  }
  const extraFieldView = getDataView(extraFieldUnicode.data);
  const computedCrc32 = new Crc32();
  computedCrc32.append(fileEntry[rawPropertyName]);
  const computedCrc32View = getDataView(new Uint8Array(4));
  computedCrc32View.setUint32(0, computedCrc32.get(), true);
  const nameCrc32 = getUint32(extraFieldView, 1);
  const version = getUint8(extraFieldView, 0);
  Object.assign(extraFieldUnicode, {
    version,
    [propertyName]: decodeText(extraFieldUnicode.data.subarray(5)),
    valid: version == 1 && !fileEntry.bitFlag.languageEncodingFlag && nameCrc32 == getUint32(computedCrc32View, 0)
  });
  if (extraFieldUnicode.valid) {
    directory[propertyName] = extraFieldUnicode[propertyName];
    directory[propertyName + PROPERTY_NAME_UTF8_SUFFIX] = true;
  }
}
function readExtraFieldAES(extraFieldAES, directory, compressionMethod) {
  const extraFieldView = getDataView(extraFieldAES.data);
  const strength = getUint8(extraFieldView, 4);
  Object.assign(extraFieldAES, {
    vendorVersion: getUint8(extraFieldView, 0),
    vendorId: getUint8(extraFieldView, 2),
    strength,
    originalCompressionMethod: compressionMethod,
    compressionMethod: getUint16(extraFieldView, 5)
  });
  directory.compressionMethod = extraFieldAES.compressionMethod;
  if (extraFieldAES.vendorVersion != VENDOR_VERSION_AE_1) {
    directory.crc32 = UNDEFINED_VALUE;
  }
}
function readExtraFieldNTFS(extraFieldNTFS, directory) {
  const extraFieldView = getDataView(extraFieldNTFS.data);
  let offsetExtraField = 4;
  let tag1Data;
  try {
    while (offsetExtraField < extraFieldNTFS.data.length && !tag1Data) {
      const tagValue = getUint16(extraFieldView, offsetExtraField);
      const attributeSize = getUint16(extraFieldView, offsetExtraField + 2);
      if (tagValue == EXTRAFIELD_TYPE_NTFS_TAG1) {
        tag1Data = extraFieldNTFS.data.slice(offsetExtraField + 4, offsetExtraField + 4 + attributeSize);
      }
      offsetExtraField += 4 + attributeSize;
    }
  } catch {
  }
  if (tag1Data && tag1Data.length == 24) {
    const tag1View = getDataView(tag1Data);
    const rawLastModDate = tag1View.getBigUint64(0, true);
    const rawLastAccessDate = tag1View.getBigUint64(8, true);
    const rawCreationDate = tag1View.getBigUint64(16, true);
    Object.assign(extraFieldNTFS, {
      rawLastModDate,
      rawLastAccessDate,
      rawCreationDate
    });
    const lastModDate = getDateNTFS(rawLastModDate);
    const lastAccessDate = getDateNTFS(rawLastAccessDate);
    const creationDate = getDateNTFS(rawCreationDate);
    const extraFieldData = { lastModDate, lastAccessDate, creationDate };
    Object.assign(extraFieldNTFS, extraFieldData);
    Object.assign(directory, extraFieldData, { rawLastAccessDate, rawCreationDate });
  }
}
function readExtraFieldUnixDates(extraField, directory) {
  if (extraField.data.length < 8) {
    return;
  }
  const extraFieldView = getDataView(extraField.data);
  const lastAccessDate = new Date((getUint32(extraFieldView, 0) | 0) * 1e3);
  const lastModDate = new Date((getUint32(extraFieldView, 4) | 0) * 1e3);
  const extraFieldData = { lastAccessDate, lastModDate };
  if (extraField.data.length >= 12) {
    extraFieldData.uid = getUint16(extraFieldView, 8);
    extraFieldData.gid = getUint16(extraFieldView, 10);
  }
  Object.assign(extraField, extraFieldData);
  Object.assign(directory, extraFieldData);
}
function readExtraFieldUnix(extraField, directory, isInfoZip) {
  try {
    const view = getDataView(extraField.data);
    let uid, gid;
    if (isInfoZip) {
      let offset = 0;
      const version = getUint8(view, offset++);
      const uidSize = getUint8(view, offset++);
      uid = unpackUnixId(extraField.data.subarray(offset, offset + uidSize));
      offset += uidSize;
      const gidSize = getUint8(view, offset++);
      gid = unpackUnixId(extraField.data.subarray(offset, offset + gidSize));
      Object.assign(extraField, { version, uid, gid });
    } else if (extraField.data.length >= 4) {
      uid = getUint16(view, 0);
      gid = getUint16(view, 2);
      Object.assign(extraField, { uid, gid });
    }
    if (uid !== UNDEFINED_VALUE) {
      directory.uid = uid;
    }
    if (gid !== UNDEFINED_VALUE) {
      directory.gid = gid;
    }
    return uid !== UNDEFINED_VALUE || gid !== UNDEFINED_VALUE;
  } catch {
  }
}
function unpackUnixId(bytes) {
  const buffer2 = new Uint8Array(4);
  buffer2.set(bytes, 0);
  const view = new DataView(buffer2.buffer, buffer2.byteOffset, 4);
  return view.getUint32(0, true);
}
function readExtraFieldExtendedTimestamp(extraFieldExtendedTimestamp, directory, localDirectory) {
  if (!extraFieldExtendedTimestamp.data.length) {
    return;
  }
  const extraFieldView = getDataView(extraFieldExtendedTimestamp.data);
  const flags = getUint8(extraFieldView, 0);
  const timeProperties = [];
  const timeRawProperties = [];
  if (localDirectory) {
    if ((flags & 1) == 1) {
      timeProperties.push(PROPERTY_NAME_LAST_MODIFICATION_DATE);
      timeRawProperties.push(PROPERTY_NAME_RAW_LAST_MODIFICATION_DATE);
    }
    if ((flags & 2) == 2) {
      timeProperties.push(PROPERTY_NAME_LAST_ACCESS_DATE);
      timeRawProperties.push(PROPERTY_NAME_RAW_LAST_ACCESS_DATE);
    }
    if ((flags & 4) == 4) {
      timeProperties.push(PROPERTY_NAME_CREATION_DATE);
      timeRawProperties.push(PROPERTY_NAME_RAW_CREATION_DATE);
    }
  } else if (extraFieldExtendedTimestamp.data.length >= 5) {
    timeProperties.push(PROPERTY_NAME_LAST_MODIFICATION_DATE);
    timeRawProperties.push(PROPERTY_NAME_RAW_LAST_MODIFICATION_DATE);
  }
  let offset = 1;
  timeProperties.forEach((propertyName, indexProperty) => {
    if (extraFieldExtendedTimestamp.data.length >= offset + 4) {
      const time = getUint32(extraFieldView, offset);
      directory[propertyName] = extraFieldExtendedTimestamp[propertyName] = new Date((time | 0) * 1e3);
      const rawPropertyName = timeRawProperties[indexProperty];
      extraFieldExtendedTimestamp[rawPropertyName] = time;
    }
    offset += 4;
  });
}
async function detectOverlappingEntry({
  reader,
  fileEntry,
  index,
  offset,
  crc32,
  compressedSize,
  uncompressedSize,
  dataOffset,
  dataDescriptor,
  extraFieldZip64,
  readRanges
}) {
  let dataDescriptorLength = 0;
  if (dataDescriptor) {
    const zip64 = Boolean(extraFieldZip64);
    const localDataDescriptor = await readLocalDataDescriptor(reader, dataOffset + compressedSize, { crc32, compressedSize, uncompressedSize, zip64 });
    if (localDataDescriptor) {
      fileEntry.localDirectory.dataDescriptor = localDataDescriptor;
      dataDescriptorLength = getDataDescriptorLength(localDataDescriptor.zip64, localDataDescriptor.signature);
    } else {
      dataDescriptorLength = getDataDescriptorLength(zip64, false);
    }
  }
  const range = {
    start: offset,
    end: dataOffset + compressedSize + dataDescriptorLength,
    fileEntry
  };
  const { indexes, sortedRanges, pendingRanges } = readRanges;
  if (!indexes.has(index)) {
    const overlappingRange = findOverlappingRange(sortedRanges, range) || pendingRanges.find((otherRange) => rangesOverlap(range, otherRange));
    if (overlappingRange) {
      const error = new Error(ERR_OVERLAPPING_ENTRY);
      error.overlappingEntry = overlappingRange.fileEntry;
      throw error;
    }
    indexes.add(index);
    pendingRanges.push(range);
    if (pendingRanges.length * pendingRanges.length > sortedRanges.length) {
      pendingRanges.sort((range2, otherRange) => range2.start - otherRange.start);
      readRanges.sortedRanges = mergeRanges(sortedRanges, pendingRanges);
      pendingRanges.length = 0;
    }
  }
}
function findOverlappingRange(sortedRanges, range) {
  let low = 0;
  let high = sortedRanges.length;
  while (low < high) {
    const middle = low + high >>> 1;
    if (sortedRanges[middle].start < range.start) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  const previousRange = sortedRanges[low - 1];
  const nextRange = sortedRanges[low];
  if (previousRange && rangesOverlap(range, previousRange)) {
    return previousRange;
  }
  if (nextRange && rangesOverlap(range, nextRange)) {
    return nextRange;
  }
}
function rangesOverlap(range, otherRange) {
  return range.start < otherRange.end && otherRange.start < range.end;
}
function mergeRanges(sortedRanges, pendingRanges) {
  const mergedRanges = [];
  let indexSorted = 0;
  let indexPending = 0;
  while (indexSorted < sortedRanges.length || indexPending < pendingRanges.length) {
    if (indexPending == pendingRanges.length || indexSorted < sortedRanges.length && sortedRanges[indexSorted].start < pendingRanges[indexPending].start) {
      mergedRanges.push(sortedRanges[indexSorted++]);
    } else {
      mergedRanges.push(pendingRanges[indexPending++]);
    }
  }
  return mergedRanges;
}
async function readLocalDataDescriptor(reader, offset, { crc32, compressedSize, uncompressedSize, zip64 }) {
  const maxLength = DATA_DESCRIPTOR_RECORD_ZIP_64_LENGTH + DATA_DESCRIPTOR_RECORD_SIGNATURE_LENGTH;
  const length = Math.min(maxLength, Math.max(0, reader.size - offset));
  const dataDescriptorArray = length ? await readUint8Array(reader, offset, length) : EMPTY_UINT8_ARRAY;
  const dataDescriptorView = getDataView(dataDescriptorArray);
  const candidates = [[zip64, true], [zip64, false], [!zip64, true], [!zip64, false]].map(([zip64Layout, signature]) => readDataDescriptor(dataDescriptorView, zip64Layout, signature)).filter((candidate) => candidate && candidate.compressedSize == compressedSize && candidate.uncompressedSize == uncompressedSize);
  return candidates.find((candidate) => candidate.crc32 == crc32) || candidates[0] || readDataDescriptor(dataDescriptorView, zip64, true) || readDataDescriptor(dataDescriptorView, zip64, false);
}
async function getEntryDataDescriptorLength(reader, offset, { crc32, compressedSize, uncompressedSize, extraFieldZip64 }) {
  const dataDescriptor = await readLocalDataDescriptor(reader, offset, { crc32, compressedSize, uncompressedSize, zip64: Boolean(extraFieldZip64) });
  if (dataDescriptor && dataDescriptor.compressedSize == compressedSize && dataDescriptor.uncompressedSize == uncompressedSize) {
    return getDataDescriptorLength(dataDescriptor.zip64, dataDescriptor.signature);
  }
}
function readDataDescriptor(dataDescriptorView, zip64, signature) {
  const offset = signature ? DATA_DESCRIPTOR_RECORD_SIGNATURE_LENGTH : 0;
  if (dataDescriptorView.byteLength < getDataDescriptorLength(zip64, signature) || signature && getUint32(dataDescriptorView, 0) != DATA_DESCRIPTOR_RECORD_SIGNATURE) {
    return UNDEFINED_VALUE;
  }
  const crc32 = getUint32(dataDescriptorView, offset);
  let compressedSize;
  let uncompressedSize;
  try {
    if (zip64) {
      compressedSize = getBigUint64(dataDescriptorView, offset + 4);
      uncompressedSize = getBigUint64(dataDescriptorView, offset + 12);
    } else {
      compressedSize = getUint32(dataDescriptorView, offset + 4);
      uncompressedSize = getUint32(dataDescriptorView, offset + 8);
    }
  } catch {
    return UNDEFINED_VALUE;
  }
  return { signature, zip64, crc32, compressedSize, uncompressedSize };
}
function getDataDescriptorLength(zip64, signature) {
  return (zip64 ? DATA_DESCRIPTOR_RECORD_ZIP_64_LENGTH : DATA_DESCRIPTOR_RECORD_LENGTH) + (signature ? DATA_DESCRIPTOR_RECORD_SIGNATURE_LENGTH : 0);
}
function getDiskOffset(reader, diskNumber) {
  return reader.getDiskOffset ? reader.getDiskOffset(diskNumber) : 0;
}
async function startsWithSplitZipSignature(reader) {
  return await getFirstSignature(reader) == SPLIT_ZIP_FILE_SIGNATURE;
}
async function startsWithSplitZipMarker(reader) {
  const signature = await getFirstSignature(reader);
  return signature == SPLIT_ZIP_FILE_SIGNATURE || signature == TEMPORARY_SPLIT_ZIP_FILE_SIGNATURE;
}
async function getFirstSignature(reader) {
  const signatureArray = await readUint8Array(reader, 0, SPLIT_ZIP_FILE_SIGNATURE_LENGTH);
  return getUint32(getDataView(signatureArray));
}
function isStrictnessValue(value) {
  return value === STRICTNESS_STRICT || value === STRICTNESS_BALANCED || value === STRICTNESS_TOLERANT;
}
function getDecodableOutputSize(outputSize, compressedSize, compressed) {
  return Math.min(outputSize, compressed ? compressedSize * MAX_DEFLATE_EXPANSION_RATIO : compressedSize);
}
function getStrictness(options, inheritedOptions) {
  return resolveStrictness(options, resolveStrictness(inheritedOptions, STRICTNESS_BALANCED));
}
function resolveStrictness(options, inheritedStrictness) {
  const strictness = options[OPTION_STRICTNESS];
  if (strictness !== UNDEFINED_VALUE) {
    if (!isStrictnessValue(strictness)) {
      throw new Error(ERR_INVALID_STRICTNESS);
    }
    return strictness;
  }
  const checkAmbiguity = options[OPTION_CHECK_AMBIGUITY];
  if (checkAmbiguity === UNDEFINED_VALUE) {
    return inheritedStrictness;
  }
  if (checkAmbiguity) {
    return STRICTNESS_STRICT;
  }
  return inheritedStrictness == STRICTNESS_TOLERANT ? STRICTNESS_TOLERANT : STRICTNESS_BALANCED;
}
function getCheckLocalDirectory(checkLocalDirectory, strictness) {
  if (checkLocalDirectory === UNDEFINED_VALUE) {
    return strictness != STRICTNESS_TOLERANT;
  }
  return Boolean(checkLocalDirectory);
}
function getCheckLocalFilename(checkLocalFilename, strictness) {
  if (checkLocalFilename === UNDEFINED_VALUE) {
    return strictness == STRICTNESS_STRICT;
  }
  return Boolean(checkLocalFilename);
}
function getFilenameValidation(filenameValidation, strictness) {
  if (filenameValidation === UNDEFINED_VALUE) {
    return strictness;
  }
  if (!isStrictnessValue(filenameValidation)) {
    throw new Error(ERR_INVALID_FILENAME_VALIDATION);
  }
  return filenameValidation;
}
function isUnsafeFilename(filename, filenameValidation) {
  if (filenameValidation == STRICTNESS_TOLERANT) {
    return false;
  }
  const pathParts = filename.split("/");
  if (pathParts.length > 1 && pathParts[pathParts.length - 1] === "") {
    pathParts.pop();
  }
  if (PARENT_DIRECTORY_REGEXP.test(filename) || filename.startsWith("/") || filename.startsWith("\\") || DRIVE_LETTER_REGEXP.test(filename)) {
    return true;
  }
  return filenameValidation == STRICTNESS_STRICT && (pathParts.includes(".") || pathParts.includes("") || filename.includes("\0"));
}
function getMaxAppendedDataSize(maxAppendedDataSize, strictness) {
  if (maxAppendedDataSize !== UNDEFINED_VALUE) {
    const size = toNumber(maxAppendedDataSize);
    if (typeof size != NUMBER_TYPE || Number.isNaN(size) || size < 0) {
      throw new Error(ERR_INVALID_MAX_APPENDED_DATA_SIZE);
    }
    return size;
  }
  if (strictness == STRICTNESS_STRICT) {
    return 0;
  }
  if (strictness == STRICTNESS_TOLERANT) {
    return Infinity;
  }
  return MAX_16_BITS;
}
async function findEndOfCentralDirectory(reader, rejectAmbiguous, maxAppendedDataSize) {
  const { size } = reader;
  const anchoredLength = Math.min(size, END_OF_CENTRAL_DIR_LENGTH + MAX_16_BITS);
  const remoteProbeBudget = { remaining: MAX_END_OF_CENTRAL_DIR_PROBES };
  let endOfDirectoryInfo;
  let plausibleEndOfDirectoryInfo;
  let endOfDirectoryReachingEndCount = 0;
  for await (const [anchoredView, anchoredOffset, anchoredArray, indexByte, offset] of scanEndOfCentralDirectory(reader, anchoredLength)) {
    const commentLength = getUint16(anchoredView, indexByte + 20);
    if (offset + END_OF_CENTRAL_DIR_LENGTH + commentLength == size) {
      const reachability = await getCentralDirectoryReachability(reader, anchoredView, anchoredOffset, indexByte, offset, size, remoteProbeBudget);
      if (reachability == CENTRAL_DIRECTORY_REACHABLE) {
        if (!endOfDirectoryInfo) {
          endOfDirectoryInfo = getEndOfCentralDirectoryInfo(anchoredArray, indexByte, offset);
        }
        endOfDirectoryReachingEndCount++;
        if (!rejectAmbiguous || endOfDirectoryReachingEndCount > 1) {
          break;
        }
      } else if (reachability == CENTRAL_DIRECTORY_PLAUSIBLE && !plausibleEndOfDirectoryInfo) {
        plausibleEndOfDirectoryInfo = getEndOfCentralDirectoryInfo(anchoredArray, indexByte, offset);
      }
    }
  }
  if (!endOfDirectoryInfo) {
    endOfDirectoryInfo = plausibleEndOfDirectoryInfo;
  }
  if (!endOfDirectoryInfo) {
    endOfDirectoryInfo = await seekEndOfCentralDirectory(reader, maxAppendedDataSize, remoteProbeBudget);
  }
  return { endOfDirectoryInfo, endOfDirectoryReachingEndCount };
}
async function seekEndOfCentralDirectory(reader, maxAppendedDataSize, remoteProbeBudget) {
  const { size } = reader;
  const searchLength = Math.min(size, maxAppendedDataSize == Infinity ? size : END_OF_CENTRAL_DIR_LENGTH + MAX_16_BITS + maxAppendedDataSize);
  let firstSignatureInfo, plausibleInfo;
  for await (const [searchView, searchOffset, searchArray, indexByte, offset] of scanEndOfCentralDirectory(reader, searchLength)) {
    const record = getEndOfCentralDirectoryInfo(searchArray, indexByte, offset);
    if (!firstSignatureInfo) {
      firstSignatureInfo = record;
    }
    const reachability = await getCentralDirectoryReachability(reader, searchView, searchOffset, indexByte, offset, size, remoteProbeBudget);
    if (reachability == CENTRAL_DIRECTORY_REACHABLE) {
      return record;
    }
    if (reachability == CENTRAL_DIRECTORY_PLAUSIBLE && !plausibleInfo) {
      plausibleInfo = record;
    }
  }
  return plausibleInfo || firstSignatureInfo;
}
async function* scanEndOfCentralDirectory(reader, scanLength) {
  const scanOffset = reader.size - scanLength;
  const scanArray = await readUint8Array(reader, scanOffset, scanLength);
  const scanView = getDataView(scanArray);
  for (let indexByte = scanArray.length - END_OF_CENTRAL_DIR_LENGTH; indexByte >= 0; indexByte--) {
    if (getUint32(scanView, indexByte) == END_OF_CENTRAL_DIR_SIGNATURE) {
      yield [scanView, scanOffset, scanArray, indexByte, scanOffset + indexByte];
    }
  }
}
function getEndOfCentralDirectoryInfo(scanArray, indexByte, offset) {
  return { offset, buffer: new Uint8Array(scanArray.subarray(indexByte, indexByte + END_OF_CENTRAL_DIR_LENGTH)).buffer };
}
async function getCentralDirectoryReachability(reader, view, anchoredOffset, indexByte, offset, size, remoteProbeBudget) {
  const filesLength = getUint16(view, indexByte + 10);
  const directoryDataLength = getUint32(view, indexByte + 12);
  const directoryDataOffset = getUint32(view, indexByte + 16);
  if (filesLength == MAX_16_BITS || directoryDataLength == MAX_32_BITS || directoryDataOffset == MAX_32_BITS) {
    const locatorSignature = await readSignature(reader, view, anchoredOffset, offset - ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH, size, remoteProbeBudget);
    return locatorSignature == ZIP64_END_OF_CENTRAL_DIR_LOCATOR_SIGNATURE ? CENTRAL_DIRECTORY_REACHABLE : CENTRAL_DIRECTORY_UNREACHABLE;
  }
  if (!filesLength && !directoryDataLength) {
    return CENTRAL_DIRECTORY_PLAUSIBLE;
  }
  const directoryDiskNumber = getUint16(view, indexByte + 6);
  for (const centralDirectoryOffset of [offset - directoryDataLength, getDiskOffset(reader, directoryDiskNumber) + directoryDataOffset]) {
    if (await readSignature(reader, view, anchoredOffset, centralDirectoryOffset, size, remoteProbeBudget) == CENTRAL_FILE_HEADER_SIGNATURE) {
      return CENTRAL_DIRECTORY_REACHABLE;
    }
  }
  return CENTRAL_DIRECTORY_UNREACHABLE;
}
async function readSignature(reader, view, anchoredOffset, signatureOffset, size, remoteProbeBudget) {
  if (signatureOffset < 0 || signatureOffset + 4 > size) {
    return UNDEFINED_VALUE;
  }
  if (signatureOffset >= anchoredOffset) {
    return getUint32(view, signatureOffset - anchoredOffset);
  }
  if (remoteProbeBudget.remaining > 0) {
    remoteProbeBudget.remaining--;
    const signatureArray = await readUint8Array(reader, signatureOffset, 4);
    return getUint32(getDataView(signatureArray), 0);
  }
  return UNDEFINED_VALUE;
}
function validateLocalDirectory(zipEntry, localDirectory, rawLocalFilename, checkLocalFilename, warnings) {
  const { rawFilename } = zipEntry;
  const reject = !warnings;
  const maskedLocalDirectory = zipEntry.decryptedDirectory && (localDirectory.rawBitFlag & BITFLAG_MASKED_LOCAL_HEADERS) == BITFLAG_MASKED_LOCAL_HEADERS;
  if (checkLocalFilename && !maskedLocalDirectory && (rawLocalFilename.length != rawFilename.length || rawLocalFilename.some((byteValue, indexByte) => byteValue != rawFilename[indexByte]))) {
    reportAmbiguity(reject, warnings, WARNING_MISMATCHED_LOCAL_FILE_HEADER_FILENAME);
  }
  if ((localDirectory.rawBitFlag & BITFLAG_AMBIGUITY_MASK) != (zipEntry.rawBitFlag & BITFLAG_AMBIGUITY_MASK)) {
    reportAmbiguity(reject, warnings, WARNING_MISMATCHED_LOCAL_FILE_HEADER_BIT_FLAG);
  }
  if (localDirectory.compressionMethod != zipEntry.compressionMethod) {
    reportAmbiguity(reject, warnings, WARNING_MISMATCHED_LOCAL_FILE_HEADER_COMPRESSION_METHOD);
  }
  if (!localDirectory.bitFlag.dataDescriptor && !maskedLocalDirectory && (localDirectory.crc32 || localDirectory.compressedSize || localDirectory.uncompressedSize) && (localDirectory.crc32 != zipEntry.crc32 || localDirectory.compressedSize != zipEntry.compressedSize || localDirectory.uncompressedSize != zipEntry.uncompressedSize)) {
    reportAmbiguity(reject, warnings, WARNING_MISMATCHED_LOCAL_FILE_HEADER_CRC32_OR_SIZES);
  }
}
function validateDataDescriptor(zipEntry, localDirectory, warnings) {
  const { dataDescriptor } = localDirectory;
  const maskedLocalDirectory = zipEntry.decryptedDirectory && (localDirectory.rawBitFlag & BITFLAG_MASKED_LOCAL_HEADERS) == BITFLAG_MASKED_LOCAL_HEADERS;
  if (dataDescriptor && !maskedLocalDirectory && (zipEntry.crc32 !== UNDEFINED_VALUE && dataDescriptor.crc32 != zipEntry.crc32 || dataDescriptor.compressedSize != zipEntry.compressedSize || dataDescriptor.uncompressedSize != zipEntry.uncompressedSize)) {
    reportAmbiguity(!warnings, warnings, WARNING_MISMATCHED_LOCAL_FILE_HEADER_CRC32_OR_SIZES);
  }
}
function reportAmbiguity(reject, warnings, reason) {
  if (reject) {
    throwAmbiguousArchive(reason);
  } else {
    addWarning(warnings, reason);
  }
}
function throwAmbiguousArchive(reason) {
  const error = new Error(ERR_AMBIGUOUS_ARCHIVE);
  error.reason = reason;
  throw error;
}
function getOptionValue(zipReader, options, name) {
  return options[name] === UNDEFINED_VALUE ? zipReader.options[name] : options[name];
}
function getFunctionOptionValue(zipReader, options, name) {
  return checkFunctionOption(getOptionValue(zipReader, options, name));
}
function getDate(timeRaw) {
  const date = (timeRaw & 4294901760) >> 16, time = timeRaw & MAX_16_BITS;
  const result = new Date(1980 + ((date & 65024) >> 9), ((date & 480) >> 5) - 1, date & 31, (time & 63488) >> 11, (time & 2016) >> 5, (time & 31) * 2, 0);
  return result < MIN_DATE ? MIN_DATE : result;
}
function getDateNTFS(timeRaw) {
  return new Date(Number(timeRaw / BigInt(1e4) - BigInt(116444736e5)));
}
function getUint8(view, offset) {
  return view.getUint8(offset);
}
function getUint16(view, offset) {
  return view.getUint16(offset, true);
}
function getUint32(view, offset) {
  return view.getUint32(offset, true);
}
function getBigUint64(view, offset) {
  const value = view.getBigUint64(offset, true);
  if (value > MAX_SAFE_UINT64) {
    throw new Error(ERR_UNSUPPORTED_UINT64);
  }
  return Number(value);
}
var ERR_BAD_FORMAT;
var ERR_EOCDR_NOT_FOUND;
var ERR_EOCDR_LOCATOR_ZIP64_NOT_FOUND;
var ERR_CENTRAL_DIRECTORY_NOT_FOUND;
var ERR_ENCRYPTED;
var ERR_UNSUPPORTED_ENCRYPTION;
var ERR_SPLIT_ZIP_FILE;
var ERR_ENTRY_DATA_OUT_OF_BOUNDS;
var ERR_AMBIGUOUS_ARCHIVE;
var ERR_ENCRYPTED_CENTRAL_DIRECTORY;
var ERR_UNSAFE_FILENAME;
var ERR_INVALID_STRICTNESS;
var ERR_INVALID_FILENAME_VALIDATION;
var ERR_INVALID_MAX_APPENDED_DATA_SIZE;
var ERR_UNSUPPORTED_UINT64;
var WARNING_UNSORTED_CENTRAL_DIRECTORY;
var WARNING_UNKNOWN_VERSION;
var WARNING_COMPRESSED_PATCHED_DATA;
var WARNING_MALFORMED_EXTRA_FIELD;
var WARNING_UNKNOWN_ZIP64_EXTENSIBLE_DATA;
var WARNING_WRAPPED_ENTRIES_COUNT;
var WARNING_APPENDED_DATA;
var WARNING_PREPENDED_DATA;
var WARNING_PREPENDED_CENTRAL_DIRECTORY;
var WARNING_TRAILING_CENTRAL_DIRECTORY_DATA;
var WARNING_MISMATCHED_CENTRAL_DIRECTORY_OFFSET;
var WARNING_MISSING_ZIP64_EXTRA_FIELD;
var WARNING_DUPLICATE_FILENAME;
var WARNING_MISMATCHED_ZIP64_END_OF_CENTRAL_DIRECTORY;
var WARNING_MULTIPLE_END_OF_CENTRAL_DIRECTORY;
var WARNING_MISMATCHED_LOCAL_FILE_HEADER_FILENAME;
var WARNING_MISMATCHED_LOCAL_FILE_HEADER_BIT_FLAG;
var WARNING_MISMATCHED_LOCAL_FILE_HEADER_COMPRESSION_METHOD;
var WARNING_MISMATCHED_LOCAL_FILE_HEADER_CRC32_OR_SIZES;
var MAX_KNOWN_VERSION;
var DRIVE_LETTER_REGEXP;
var PARENT_DIRECTORY_REGEXP;
var CHARSET_UTF8;
var PROPERTY_NAME_UTF8_SUFFIX;
var CHARSET_CP437;
var BITFLAG_AMBIGUITY_MASK;
var VENDOR_VERSION_AE_1;
var ZIP64_PROPERTIES;
var ZIP64_EXTRACTION;
var MAX_SAFE_UINT64;
var MAX_END_OF_CENTRAL_DIR_PROBES;
var MAX_DEFLATE_EXPANSION_RATIO;
var CENTRAL_DIRECTORY_UNREACHABLE;
var CENTRAL_DIRECTORY_PLAUSIBLE;
var CENTRAL_DIRECTORY_REACHABLE;
var ZipReader;
var ZipReaderStream;
var ZipEntry;
var init_zip_reader = __esm({
  "node_modules/@zip.js/zip.js/lib/core/zip-reader.js"() {
    init_constants();
    init_configuration();
    init_codec_registry();
    init_codec_pool();
    init_io();
    init_decode_text();
    init_array();
    init_warnings();
    init_compatible_streams();
    init_error();
    init_crc32();
    init_zip_entry();
    init_options();
    ERR_BAD_FORMAT = "File format is not recognized";
    ERR_EOCDR_NOT_FOUND = "End of central directory not found";
    ERR_EOCDR_LOCATOR_ZIP64_NOT_FOUND = "End of Zip64 central directory locator not found";
    ERR_CENTRAL_DIRECTORY_NOT_FOUND = "Central directory header not found";
    ERR_ENCRYPTED = "File contains encrypted entry";
    ERR_UNSUPPORTED_ENCRYPTION = "Encryption method not supported";
    ERR_SPLIT_ZIP_FILE = "Split zip file";
    ERR_ENTRY_DATA_OUT_OF_BOUNDS = "Entry data out of bounds";
    ERR_AMBIGUOUS_ARCHIVE = "Ambiguous archive";
    ERR_ENCRYPTED_CENTRAL_DIRECTORY = "Encrypted central directory is not supported";
    ERR_UNSAFE_FILENAME = "Unsafe filename";
    ERR_INVALID_STRICTNESS = "Invalid strictness (must be 'strict', 'balanced' or 'tolerant')";
    ERR_INVALID_FILENAME_VALIDATION = "Invalid filenameValidation (must be 'strict', 'balanced' or 'tolerant')";
    ERR_INVALID_MAX_APPENDED_DATA_SIZE = "Invalid maxAppendedDataSize (must be a number greater than or equal to 0)";
    ERR_UNSUPPORTED_UINT64 = "64-bit value exceeds Number.MAX_SAFE_INTEGER";
    WARNING_UNSORTED_CENTRAL_DIRECTORY = "unsorted central directory";
    WARNING_UNKNOWN_VERSION = "unknown version needed to extract";
    WARNING_COMPRESSED_PATCHED_DATA = "compressed patched data";
    WARNING_MALFORMED_EXTRA_FIELD = "malformed extra field";
    WARNING_UNKNOWN_ZIP64_EXTENSIBLE_DATA = "unknown zip64 extensible data";
    WARNING_WRAPPED_ENTRIES_COUNT = "wrapped entries count";
    WARNING_APPENDED_DATA = "appended data";
    WARNING_PREPENDED_DATA = "prepended data";
    WARNING_PREPENDED_CENTRAL_DIRECTORY = "prepended central directory";
    WARNING_TRAILING_CENTRAL_DIRECTORY_DATA = "trailing central directory data";
    WARNING_MISMATCHED_CENTRAL_DIRECTORY_OFFSET = "mismatched central directory offset";
    WARNING_MISSING_ZIP64_EXTRA_FIELD = "missing zip64 extra field";
    WARNING_DUPLICATE_FILENAME = "duplicate filename";
    WARNING_MISMATCHED_ZIP64_END_OF_CENTRAL_DIRECTORY = "mismatched zip64 end of central directory record";
    WARNING_MULTIPLE_END_OF_CENTRAL_DIRECTORY = "multiple end of central directory records";
    WARNING_MISMATCHED_LOCAL_FILE_HEADER_FILENAME = "mismatched local file header (filename)";
    WARNING_MISMATCHED_LOCAL_FILE_HEADER_BIT_FLAG = "mismatched local file header (general purpose bit flag)";
    WARNING_MISMATCHED_LOCAL_FILE_HEADER_COMPRESSION_METHOD = "mismatched local file header (compression method)";
    WARNING_MISMATCHED_LOCAL_FILE_HEADER_CRC32_OR_SIZES = "mismatched local file header (crc32 or sizes)";
    MAX_KNOWN_VERSION = 63;
    DRIVE_LETTER_REGEXP = /^[a-zA-Z]:/;
    PARENT_DIRECTORY_REGEXP = /(^|[\\/])\.\.([\\/]|$)/;
    CHARSET_UTF8 = "utf-8";
    PROPERTY_NAME_UTF8_SUFFIX = "UTF8";
    CHARSET_CP437 = "cp437";
    BITFLAG_AMBIGUITY_MASK = BITFLAG_ENCRYPTED | BITFLAG_DATA_DESCRIPTOR | BITFLAG_STRONG_ENCRYPTION | BITFLAG_LANG_ENCODING_FLAG;
    VENDOR_VERSION_AE_1 = 1;
    ZIP64_PROPERTIES = [
      [PROPERTY_NAME_UNCOMPRESSED_SIZE, MAX_32_BITS],
      [PROPERTY_NAME_COMPRESSED_SIZE, MAX_32_BITS],
      [PROPERTY_NAME_OFFSET, MAX_32_BITS],
      [PROPERTY_NAME_DISK_NUMBER_START, MAX_16_BITS]
    ];
    ZIP64_EXTRACTION = {
      [MAX_16_BITS]: {
        getValue: getUint32,
        bytes: 4
      },
      [MAX_32_BITS]: {
        getValue: getBigUint64,
        bytes: 8
      }
    };
    MAX_SAFE_UINT64 = BigInt(Number.MAX_SAFE_INTEGER);
    MAX_END_OF_CENTRAL_DIR_PROBES = 64;
    MAX_DEFLATE_EXPANSION_RATIO = 1032;
    CENTRAL_DIRECTORY_UNREACHABLE = 0;
    CENTRAL_DIRECTORY_PLAUSIBLE = 1;
    CENTRAL_DIRECTORY_REACHABLE = 2;
    ZipReader = class {
      constructor(reader, options = {}) {
        Object.assign(this, {
          reader: new GenericReader(reader),
          options: options || {},
          readRanges: { indexes: /* @__PURE__ */ new Set(), sortedRanges: [], pendingRanges: [] },
          entriesMissingZip64ExtraField: /* @__PURE__ */ new WeakSet()
        });
      }
      async *getEntriesGenerator(options = {}) {
        const zipReader = this;
        let { reader } = zipReader;
        await initStream(reader);
        if (reader.size === UNDEFINED_VALUE || !reader.readUint8Array) {
          reader = new BlobReader(await streamToBlob(reader.readable));
          await initStream(reader);
        }
        if (reader.size < END_OF_CENTRAL_DIR_LENGTH) {
          throw new Error(ERR_BAD_FORMAT);
        }
        const warnings = zipReader.warnings = [];
        const strictness = getStrictness(options, zipReader.options);
        const checkAmbiguity = strictness == STRICTNESS_STRICT;
        const rejectAmbiguousEndOfDirectory = strictness != STRICTNESS_TOLERANT;
        const maxAppendedDataSize = getMaxAppendedDataSize(getOptionValue(zipReader, options, OPTION_MAX_APPENDED_DATA_SIZE), strictness);
        const filenameValidation = getFilenameValidation(getOptionValue(zipReader, options, OPTION_FILENAME_VALIDATION), strictness);
        const normalizeFilename = getOptionValue(zipReader, options, OPTION_NORMALIZE_FILENAME);
        const { endOfDirectoryInfo, endOfDirectoryReachingEndCount } = await findEndOfCentralDirectory(reader, rejectAmbiguousEndOfDirectory, maxAppendedDataSize);
        if (!endOfDirectoryInfo) {
          if (await startsWithSplitZipSignature(reader)) {
            throw new Error(ERR_SPLIT_ZIP_FILE);
          } else {
            throw new Error(ERR_EOCDR_NOT_FOUND);
          }
        }
        if (rejectAmbiguousEndOfDirectory && endOfDirectoryReachingEndCount > 1) {
          throwAmbiguousArchive(WARNING_MULTIPLE_END_OF_CENTRAL_DIRECTORY);
        }
        const endOfDirectoryView = getDataView(endOfDirectoryInfo);
        let directoryDataLength = getUint32(endOfDirectoryView, 12);
        let directoryDataOffset = getUint32(endOfDirectoryView, 16);
        const commentOffset = endOfDirectoryInfo.offset;
        const commentLength = getUint16(endOfDirectoryView, 20);
        const appendedDataOffset = commentOffset + END_OF_CENTRAL_DIR_LENGTH + commentLength;
        const appendedDataLength = reader.size - appendedDataOffset;
        if (appendedDataLength > maxAppendedDataSize) {
          throwAmbiguousArchive(WARNING_APPENDED_DATA);
        }
        if (appendedDataLength > 0) {
          addWarning(warnings, WARNING_APPENDED_DATA);
        }
        let lastDiskNumber = getUint16(endOfDirectoryView, 4);
        const expectedLastDiskNumber = reader.lastDiskNumber || 0;
        let diskNumber = getUint16(endOfDirectoryView, 6);
        let filesLength = getUint16(endOfDirectoryView, 10);
        let prependedDataLength = 0;
        let prependedCentralDirectory;
        let startOffset;
        let zip64EndOfDirectory;
        let zip64EndOfDirectoryVersion2;
        let zip64EndOfDirectoryLength = ZIP64_END_OF_CENTRAL_DIR_LENGTH;
        let directoryEncryptionInfo;
        const requiresZip64 = directoryDataOffset == MAX_32_BITS || directoryDataLength == MAX_32_BITS || filesLength == MAX_16_BITS || diskNumber == MAX_16_BITS;
        if (directoryDataOffset != MAX_32_BITS && diskNumber != MAX_16_BITS) {
          directoryDataOffset += getDiskOffset(reader, diskNumber);
        }
        if (requiresZip64) {
          const endOfDirectoryLocatorArray = endOfDirectoryInfo.offset >= ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH ? await readUint8Array(reader, endOfDirectoryInfo.offset - ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH, ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH) : EMPTY_UINT8_ARRAY;
          const endOfDirectoryLocatorView = getDataView(endOfDirectoryLocatorArray);
          if (endOfDirectoryLocatorArray.length == ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH && getUint32(endOfDirectoryLocatorView, 0) == ZIP64_END_OF_CENTRAL_DIR_LOCATOR_SIGNATURE) {
            directoryDataOffset = getDiskOffset(reader, getUint32(endOfDirectoryLocatorView, 4)) + getBigUint64(endOfDirectoryLocatorView, 8);
            let endOfDirectoryArray = await readUint8Array(reader, directoryDataOffset, ZIP64_END_OF_CENTRAL_DIR_LENGTH);
            let endOfDirectoryView2 = getDataView(endOfDirectoryArray);
            if (endOfDirectoryArray.length < ZIP64_END_OF_CENTRAL_DIR_LENGTH || getUint32(endOfDirectoryView2, 0) != ZIP64_END_OF_CENTRAL_DIR_SIGNATURE) {
              const locatorOffset = endOfDirectoryInfo.offset - ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH;
              let expectedDirectoryDataOffset = locatorOffset - ZIP64_END_OF_CENTRAL_DIR_LENGTH;
              if (!await startsWithSignature(reader, expectedDirectoryDataOffset, ZIP64_END_OF_CENTRAL_DIR_SIGNATURE)) {
                expectedDirectoryDataOffset = await findZip64EndOfDirectoryOffset(reader, locatorOffset);
              }
              if (expectedDirectoryDataOffset !== UNDEFINED_VALUE && expectedDirectoryDataOffset >= 0 && directoryDataOffset != expectedDirectoryDataOffset) {
                const originalDirectoryDataOffset = directoryDataOffset;
                directoryDataOffset = expectedDirectoryDataOffset;
                if (directoryDataOffset > originalDirectoryDataOffset) {
                  prependedDataLength = directoryDataOffset - originalDirectoryDataOffset;
                }
                endOfDirectoryArray = await readUint8Array(reader, directoryDataOffset, ZIP64_END_OF_CENTRAL_DIR_LENGTH);
                endOfDirectoryView2 = getDataView(endOfDirectoryArray);
              }
            }
            if (endOfDirectoryArray.length < ZIP64_END_OF_CENTRAL_DIR_LENGTH || getUint32(endOfDirectoryView2, 0) != ZIP64_END_OF_CENTRAL_DIR_SIGNATURE) {
              throw new Error(ERR_EOCDR_LOCATOR_ZIP64_NOT_FOUND);
            }
            zip64EndOfDirectory = true;
            zip64EndOfDirectoryVersion2 = getBigUint64(endOfDirectoryView2, 4) > ZIP64_END_OF_CENTRAL_DIR_LENGTH - 12;
            if (zip64EndOfDirectoryVersion2) {
              const extensibleDataLength = Math.min(
                getBigUint64(endOfDirectoryView2, 4) - (ZIP64_END_OF_CENTRAL_DIR_LENGTH - 12),
                reader.size - directoryDataOffset - ZIP64_END_OF_CENTRAL_DIR_LENGTH
              );
              if (extensibleDataLength > 0) {
                zip64EndOfDirectoryLength += extensibleDataLength;
                const rawExtensibleData = await readUint8Array(reader, directoryDataOffset + ZIP64_END_OF_CENTRAL_DIR_LENGTH, extensibleDataLength);
                directoryEncryptionInfo = getDirectoryEncryptionInfo(rawExtensibleData);
              }
            }
            if (lastDiskNumber == MAX_16_BITS) {
              lastDiskNumber = getUint32(endOfDirectoryView2, 16);
            } else if (lastDiskNumber != getUint32(endOfDirectoryView2, 16)) {
              reportAmbiguity(checkAmbiguity, warnings, WARNING_MISMATCHED_ZIP64_END_OF_CENTRAL_DIRECTORY);
            }
            if (diskNumber == MAX_16_BITS) {
              diskNumber = getUint32(endOfDirectoryView2, 20);
            } else if (diskNumber != getUint32(endOfDirectoryView2, 20)) {
              reportAmbiguity(checkAmbiguity, warnings, WARNING_MISMATCHED_ZIP64_END_OF_CENTRAL_DIRECTORY);
            }
            if (filesLength == MAX_16_BITS) {
              filesLength = getBigUint64(endOfDirectoryView2, 32);
            } else if (filesLength != getBigUint64(endOfDirectoryView2, 32)) {
              reportAmbiguity(checkAmbiguity, warnings, WARNING_MISMATCHED_ZIP64_END_OF_CENTRAL_DIRECTORY);
            }
            if (directoryDataLength == MAX_32_BITS) {
              directoryDataLength = getBigUint64(endOfDirectoryView2, 40);
            } else if (directoryDataLength != getBigUint64(endOfDirectoryView2, 40)) {
              reportAmbiguity(checkAmbiguity, warnings, WARNING_MISMATCHED_ZIP64_END_OF_CENTRAL_DIRECTORY);
            }
            directoryDataOffset = getDiskOffset(reader, diskNumber) + getBigUint64(endOfDirectoryView2, 48) + prependedDataLength;
          } else if (directoryDataOffset == MAX_32_BITS || directoryDataLength == MAX_32_BITS || diskNumber == MAX_16_BITS) {
            throw new Error(ERR_EOCDR_LOCATOR_ZIP64_NOT_FOUND);
          }
        }
        let declaredDirectoryDataLength = directoryDataLength;
        const centralDirectoryEndOffset = endOfDirectoryInfo.offset - (zip64EndOfDirectory ? zip64EndOfDirectoryLength + ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH : 0);
        if (expectedLastDiskNumber != lastDiskNumber) {
          throw new Error(ERR_SPLIT_ZIP_FILE);
        }
        if (directoryDataOffset < 0) {
          throw new Error(ERR_BAD_FORMAT);
        }
        let offset = 0;
        let directoryArray = directoryDataOffset < reader.size ? await readUint8Array(reader, directoryDataOffset, directoryDataLength) : EMPTY_UINT8_ARRAY;
        let directoryView = getDataView(directoryArray);
        if (directoryDataLength) {
          let expectedDirectoryDataOffset = centralDirectoryEndOffset - directoryDataLength;
          if (directoryDataOffset != expectedDirectoryDataOffset && diskNumber == lastDiskNumber) {
            const storedPointsAtDirectory = directoryArray.length >= 4 && (getUint32(directoryView, offset) == CENTRAL_FILE_HEADER_SIGNATURE || Boolean(directoryEncryptionInfo && directoryEncryptionInfo.compressedSize) || detectEncryptedCentralDirectory(directoryView));
            if (!storedPointsAtDirectory && expectedDirectoryDataOffset < 0) {
              throw new Error(ERR_BAD_FORMAT);
            }
            let reconcile = !storedPointsAtDirectory;
            if (expectedDirectoryDataOffset >= 0 && expectedDirectoryDataOffset + 4 <= reader.size) {
              let expectedPointsAtDirectory = await pointsAtDirectory(reader, expectedDirectoryDataOffset);
              if (!expectedPointsAtDirectory) {
                const signatureRecordOffset = await findDigitalSignatureRecordOffset(reader, centralDirectoryEndOffset);
                const signedDirectoryDataOffset = signatureRecordOffset - directoryDataLength;
                if (signatureRecordOffset !== UNDEFINED_VALUE && signedDirectoryDataOffset >= 0 && await pointsAtDirectory(reader, signedDirectoryDataOffset)) {
                  expectedDirectoryDataOffset = signedDirectoryDataOffset;
                  expectedPointsAtDirectory = true;
                }
              }
              if (storedPointsAtDirectory) {
                reconcile = expectedPointsAtDirectory;
              }
            }
            if (reconcile && expectedDirectoryDataOffset != directoryDataOffset) {
              const originalDirectoryDataOffset = directoryDataOffset;
              directoryDataOffset = expectedDirectoryDataOffset;
              directoryArray = await readUint8Array(reader, directoryDataOffset, directoryDataLength);
              directoryView = getDataView(directoryArray);
              const offsetDelta = directoryDataOffset - originalDirectoryDataOffset;
              const { localHeaderFound, shiftedLocalHeaderFound } = await probeLocalHeaders(reader, directoryArray, directoryView, offsetDelta);
              if (offsetDelta > 0 && !(localHeaderFound && !shiftedLocalHeaderFound)) {
                prependedDataLength += offsetDelta;
                prependedCentralDirectory = storedPointsAtDirectory;
              } else {
                reportAmbiguity(checkAmbiguity, warnings, WARNING_MISMATCHED_CENTRAL_DIRECTORY_OFFSET);
                if (offsetDelta < 0 && !localHeaderFound && shiftedLocalHeaderFound) {
                  prependedDataLength += offsetDelta;
                }
              }
            }
          }
          if (directoryArray.length < 4) {
            throw new Error(ERR_BAD_FORMAT);
          }
        } else if (!filesLength && directoryDataOffset < centralDirectoryEndOffset && diskNumber == lastDiskNumber) {
          prependedDataLength += centralDirectoryEndOffset - directoryDataOffset;
          directoryDataOffset = centralDirectoryEndOffset;
        }
        const expectedDirectoryDataLength = centralDirectoryEndOffset - directoryDataOffset;
        if (directoryDataLength != expectedDirectoryDataLength && expectedDirectoryDataLength >= 0 && diskNumber == lastDiskNumber) {
          directoryDataLength = expectedDirectoryDataLength;
          directoryArray = await readUint8Array(reader, directoryDataOffset, directoryDataLength);
          directoryView = getDataView(directoryArray);
        }
        if (directoryDataOffset < 0 || directoryDataOffset >= reader.size) {
          throw new Error(ERR_BAD_FORMAT);
        }
        zipReader.directoryOffset = directoryDataOffset;
        zipReader.directoryLength = declaredDirectoryDataLength;
        const decryptCentralDirectory = getFunctionOptionValue(zipReader, options, OPTION_DECRYPT_CENTRAL_DIRECTORY);
        let decryptedDirectory, dataAfterEncryptedDirectory;
        if (decryptCentralDirectory && filesLength && directoryArray.length >= 4 && getUint32(directoryView, 0) != CENTRAL_FILE_HEADER_SIGNATURE && (zip64EndOfDirectoryVersion2 || detectEncryptedCentralDirectory(directoryView))) {
          const encryptedDirectoryDataLength = getEncryptedDirectoryDataLength(directoryEncryptionInfo, declaredDirectoryDataLength, directoryArray.length);
          dataAfterEncryptedDirectory = directoryArray.subarray(encryptedDirectoryDataLength);
          directoryArray = await decryptCentralDirectory(directoryArray.subarray(0, encryptedDirectoryDataLength), directoryEncryptionInfo);
          directoryView = getDataView(directoryArray);
          declaredDirectoryDataLength = directoryArray.length;
          decryptedDirectory = true;
        }
        if (directoryEncryptionInfo && !decryptedDirectory && (directoryArray.length < 4 || getUint32(directoryView, 0) == CENTRAL_FILE_HEADER_SIGNATURE)) {
          addWarning(warnings, WARNING_UNKNOWN_ZIP64_EXTENSIBLE_DATA);
        }
        startOffset = directoryDataOffset;
        const filenameEncoding = getOptionValue(zipReader, options, OPTION_FILENAME_ENCODING);
        const commentEncoding = getOptionValue(zipReader, options, OPTION_COMMENT_ENCODING);
        const filenames = /* @__PURE__ */ new Set();
        let duplicateFilename;
        let previousEntryPosition = -Infinity;
        const recoverWrappedFilesLength = !checkAmbiguity && !zip64EndOfDirectory;
        if (!filesLength && recoverWrappedFilesLength) {
          filesLength = getWrappedFilesLength(directoryView, directoryArray, offset);
          if (filesLength) {
            addWarning(warnings, WARNING_WRAPPED_ENTRIES_COUNT);
          }
        }
        const entryOptions = Object.assign({}, zipReader.options, options, { [OPTION_STRICTNESS]: strictness });
        delete entryOptions[OPTION_CHECK_AMBIGUITY];
        for (let indexFile = 0; indexFile < filesLength; indexFile++) {
          const fileEntry = new ZipEntry(reader, entryOptions);
          if (offset + CENTRAL_FILE_HEADER_LENGTH > directoryArray.length || getUint32(directoryView, offset) != CENTRAL_FILE_HEADER_SIGNATURE) {
            if (indexFile == 0 && !decryptedDirectory && (zip64EndOfDirectoryVersion2 || detectEncryptedCentralDirectory(directoryView))) {
              throw new Error(ERR_ENCRYPTED_CENTRAL_DIRECTORY);
            }
            throw new Error(ERR_CENTRAL_DIRECTORY_NOT_FOUND);
          }
          readCommonHeader(fileEntry, directoryView, offset + 6);
          const languageEncodingFlag = Boolean(fileEntry.bitFlag.languageEncodingFlag);
          const filenameOffset = offset + CENTRAL_FILE_HEADER_LENGTH;
          const extraFieldOffset = filenameOffset + fileEntry.filenameLength;
          const commentOffset2 = extraFieldOffset + fileEntry.extraFieldLength;
          const versionMadeBy = getUint16(directoryView, offset + 4);
          const msDosCompatible = versionMadeBy >> 8 == 0;
          const unixCompatible = versionMadeBy >> 8 == 3;
          const commentLength2 = getUint16(directoryView, offset + 32);
          const endOffset = commentOffset2 + commentLength2;
          const rawEntryData = new Uint8Array(directoryArray.subarray(filenameOffset, endOffset));
          const rawFilename = rawEntryData.subarray(0, fileEntry.filenameLength);
          const rawComment = rawEntryData.subarray(fileEntry.filenameLength + fileEntry.extraFieldLength);
          const filenameUTF8 = languageEncodingFlag || !filenameEncoding && isUTF8Text(rawFilename);
          const commentUTF8 = languageEncodingFlag || !commentEncoding && isUTF8Text(rawComment);
          const externalFileAttributes = getUint32(directoryView, offset + 38);
          const msdosAttributesRaw = externalFileAttributes & MAX_8_BITS;
          const msdosAttributes = {
            readOnly: Boolean(msdosAttributesRaw & FILE_ATTR_MSDOS_READONLY_MASK),
            hidden: Boolean(msdosAttributesRaw & FILE_ATTR_MSDOS_HIDDEN_MASK),
            system: Boolean(msdosAttributesRaw & FILE_ATTR_MSDOS_SYSTEM_MASK),
            directory: Boolean(msdosAttributesRaw & FILE_ATTR_MSDOS_DIR_MASK),
            archive: Boolean(msdosAttributesRaw & FILE_ATTR_MSDOS_ARCHIVE_MASK)
          };
          const offsetFileEntry = getUint32(directoryView, offset + 42);
          const decode2 = getFunctionOptionValue(zipReader, options, OPTION_DECODE_TEXT) || decodeText;
          const rawFilenameEncoding = filenameUTF8 ? CHARSET_UTF8 : filenameEncoding || CHARSET_CP437;
          const rawCommentEncoding = commentUTF8 ? CHARSET_UTF8 : commentEncoding || CHARSET_CP437;
          let filename = decode2(rawFilename, rawFilenameEncoding, TEXT_TYPE_FILENAME);
          if (filename === UNDEFINED_VALUE) {
            filename = decodeText(rawFilename, rawFilenameEncoding);
          }
          let comment = decode2(rawComment, rawCommentEncoding, TEXT_TYPE_COMMENT);
          if (comment === UNDEFINED_VALUE) {
            comment = decodeText(rawComment, rawCommentEncoding);
          }
          Object.assign(fileEntry, {
            index: indexFile,
            decryptedDirectory,
            versionMadeBy,
            msDosCompatible,
            zip64: false,
            compressedSize: 0,
            uncompressedSize: 0,
            commentLength: commentLength2,
            offset: offsetFileEntry,
            diskNumberStart: getUint16(directoryView, offset + 34),
            internalFileAttributes: getUint16(directoryView, offset + 36),
            externalFileAttributes,
            msdosAttributesRaw,
            msdosAttributes,
            rawFilename,
            filenameUTF8,
            commentUTF8,
            rawExtraField: rawEntryData.subarray(fileEntry.filenameLength, fileEntry.filenameLength + fileEntry.extraFieldLength),
            rawComment,
            filename,
            comment
          });
          let malformedExtraField;
          try {
            malformedExtraField = readCommonFooter(fileEntry, fileEntry, directoryView, offset + 6);
          } catch (error) {
            if (checkAmbiguity || error.message != ERR_EXTRAFIELD_ZIP64_NOT_FOUND) {
              throw error;
            }
            fileEntry.zip64ExtraFieldMissing = true;
            addWarning(warnings, WARNING_MISSING_ZIP64_EXTRA_FIELD, fileEntry.filename);
          }
          filename = fileEntry.filename;
          if (normalizeFilename) {
            const normalizedFilename = normalizeFilename(filename);
            if (normalizedFilename !== UNDEFINED_VALUE) {
              filename = fileEntry.filename = normalizedFilename;
            }
          }
          if (isUnsafeFilename(filename, filenameValidation)) {
            const error = new Error(ERR_UNSAFE_FILENAME);
            error.filename = filename;
            throw error;
          }
          if (malformedExtraField) {
            addWarning(warnings, WARNING_MALFORMED_EXTRA_FIELD, filename);
          }
          if (fileEntry.zip64ExtraFieldMissing && fileEntry.offset == MAX_32_BITS) {
            startOffset = 0;
          } else {
            fileEntry.offset += prependedDataLength;
            const entryPosition = getDiskOffset(reader, fileEntry.diskNumberStart) + fileEntry.offset;
            startOffset = Math.min(entryPosition, startOffset);
            if (entryPosition < previousEntryPosition) {
              addWarning(warnings, WARNING_UNSORTED_CENTRAL_DIRECTORY, filename);
            }
            previousEntryPosition = entryPosition;
          }
          if ((fileEntry.version & MAX_8_BITS) > MAX_KNOWN_VERSION) {
            addWarning(warnings, WARNING_UNKNOWN_VERSION, filename);
          }
          if ((fileEntry.rawBitFlag & BITFLAG_COMPRESSED_PATCHED_DATA) == BITFLAG_COMPRESSED_PATCHED_DATA) {
            addWarning(warnings, WARNING_COMPRESSED_PATCHED_DATA, filename);
          }
          if (filenames.has(fileEntry.filename)) {
            duplicateFilename = true;
          }
          filenames.add(fileEntry.filename);
          const unixExternalUpper = fileEntry.externalFileAttributes >> 16 & MAX_16_BITS;
          if (fileEntry.unixMode === UNDEFINED_VALUE && (unixExternalUpper & (FILE_ATTR_UNIX_DEFAULT_MASK | FILE_ATTR_UNIX_EXECUTABLE_MASK | FILE_ATTR_UNIX_TYPE_DIR)) != 0) {
            fileEntry.unixMode = unixExternalUpper;
          }
          const setuid = Boolean(fileEntry.unixMode & FILE_ATTR_UNIX_SETUID_MASK);
          const setgid = Boolean(fileEntry.unixMode & FILE_ATTR_UNIX_SETGID_MASK);
          const sticky = Boolean(fileEntry.unixMode & FILE_ATTR_UNIX_STICKY_MASK);
          const unixType = fileEntry.unixMode === UNDEFINED_VALUE ? unixExternalUpper : fileEntry.unixMode;
          const symlink = (unixType & FILE_ATTR_UNIX_TYPE_MASK) == FILE_ATTR_UNIX_TYPE_SYMLINK;
          const modeIsDir = fileEntry.unixMode !== UNDEFINED_VALUE && (fileEntry.unixMode & FILE_ATTR_UNIX_TYPE_MASK) == FILE_ATTR_UNIX_TYPE_DIR;
          const upperIsDir = (unixExternalUpper & FILE_ATTR_UNIX_TYPE_MASK) == FILE_ATTR_UNIX_TYPE_DIR;
          const directory = modeIsDir || upperIsDir || msDosCompatible && msdosAttributes.directory || fileEntry.filename.endsWith(DIRECTORY_SIGNATURE);
          const executable = !symlink && !directory && (fileEntry.unixMode !== UNDEFINED_VALUE ? (fileEntry.unixMode & FILE_ATTR_UNIX_EXECUTABLE_MASK) != 0 : unixCompatible && (unixExternalUpper & FILE_ATTR_UNIX_EXECUTABLE_MASK) != 0);
          Object.assign(fileEntry, {
            setuid,
            setgid,
            sticky,
            symlink,
            unixExternalUpper,
            executable,
            directory,
            zipCrypto: fileEntry.encrypted && !fileEntry.extraFieldAES
          });
          const entry = new Entry(fileEntry);
          if (fileEntry.zip64ExtraFieldMissing) {
            zipReader.entriesMissingZip64ExtraField.add(entry);
          }
          entry.getData = (writer, options2) => fileEntry.getData(writer, entry, zipReader, options2);
          entry.arrayBuffer = async (options2) => {
            const writer = new TransformStream();
            const arrayBufferPromise = streamToBlob(writer.readable).then((blob) => blob.arrayBuffer());
            arrayBufferPromise.catch(() => {
            });
            await fileEntry.getData(
              writer,
              entry,
              zipReader,
              Object.assign({}, options2, { preventClose: false })
            );
            return arrayBufferPromise;
          };
          offset = endOffset;
          if (indexFile == filesLength - 1 && recoverWrappedFilesLength) {
            const wrappedFilesLength = getWrappedFilesLength(directoryView, directoryArray, offset);
            if (wrappedFilesLength) {
              filesLength += wrappedFilesLength;
              addWarning(warnings, WARNING_WRAPPED_ENTRIES_COUNT);
            }
          }
          const { onprogress } = options;
          if (onprogress) {
            try {
              await onprogress(indexFile + 1, filesLength, new Entry(fileEntry));
            } catch {
            }
          }
          yield entry;
        }
        let offsetAfterSignature = offset;
        let digitalSignature = readDigitalSignature(directoryArray.subarray(offset)) || (decryptedDirectory ? readDigitalSignature(dataAfterEncryptedDirectory) : UNDEFINED_VALUE);
        if (!digitalSignature && !decryptedDirectory) {
          const signatureRecordOffset = directoryDataOffset + offset;
          const signatureRecordLength = Math.min(centralDirectoryEndOffset - signatureRecordOffset, 6 + MAX_16_BITS);
          if (signatureRecordLength >= 6) {
            digitalSignature = readDigitalSignature(await readUint8Array(reader, signatureRecordOffset, signatureRecordLength));
          }
        }
        if (digitalSignature) {
          zipReader.digitalSignature = digitalSignature;
          offsetAfterSignature = offset + 6 + digitalSignature.length;
        }
        if (offset != declaredDirectoryDataLength && offsetAfterSignature != declaredDirectoryDataLength || !decryptedDirectory && offset != directoryDataLength && offsetAfterSignature != directoryDataLength) {
          reportAmbiguity(checkAmbiguity, warnings, WARNING_TRAILING_CENTRAL_DIRECTORY_DATA);
        }
        if (duplicateFilename) {
          reportAmbiguity(checkAmbiguity, warnings, WARNING_DUPLICATE_FILENAME);
        }
        const extractPrependedData = getOptionValue(zipReader, options, OPTION_EXTRACT_PREPENDED_DATA);
        const extractAppendedData = getOptionValue(zipReader, options, OPTION_EXTRACT_APPENDED_DATA);
        const splitZipSignatureLength = (checkAmbiguity || extractPrependedData) && filesLength && startOffset == SPLIT_ZIP_FILE_SIGNATURE_LENGTH && await startsWithSplitZipMarker(reader) ? SPLIT_ZIP_FILE_SIGNATURE_LENGTH : 0;
        if (checkAmbiguity && (prependedDataLength > 0 || filesLength && startOffset > splitZipSignatureLength)) {
          throwAmbiguousArchive(WARNING_PREPENDED_DATA);
        }
        if (prependedDataLength > 0 || filesLength && startOffset > SPLIT_ZIP_FILE_SIGNATURE_LENGTH) {
          addWarning(warnings, WARNING_PREPENDED_DATA);
        }
        if (prependedCentralDirectory) {
          addWarning(warnings, WARNING_PREPENDED_CENTRAL_DIRECTORY);
        }
        if (extractPrependedData) {
          zipReader.prependedData = startOffset > splitZipSignatureLength ? await readUint8Array(reader, splitZipSignatureLength, startOffset - splitZipSignatureLength) : EMPTY_UINT8_ARRAY;
        }
        zipReader.comment = commentLength ? await readUint8Array(reader, commentOffset + END_OF_CENTRAL_DIR_LENGTH, commentLength) : EMPTY_UINT8_ARRAY;
        if (extractAppendedData) {
          zipReader.appendedData = appendedDataOffset < reader.size ? await readUint8Array(reader, appendedDataOffset, reader.size - appendedDataOffset) : EMPTY_UINT8_ARRAY;
        }
        return true;
      }
      async getEntries(options = {}) {
        const entries = [];
        for await (const entry of this.getEntriesGenerator(options)) {
          entries.push(entry);
        }
        return entries;
      }
      async close() {
        const { reader } = this;
        if (!reader.readUint8Array && reader.readable && !reader.readable.locked) {
          await reader.readable.cancel();
        }
      }
      [SYMBOL_ASYNC_DISPOSE]() {
        return this.close();
      }
    };
    ZipReaderStream = class {
      constructor(options = {}) {
        let sourceController;
        const { readable, writable } = new TransformStream({
          start(controller) {
            sourceController = controller;
          }
        });
        const zipReader = new ZipReader(readable, options);
        const gen = zipReader.getEntriesGenerator();
        const pendingEntries2 = /* @__PURE__ */ new Set();
        this.readable = new ReadableStream({
          async pull(controller) {
            const { done, value } = await gen.next();
            if (done)
              return controller.close();
            const entryStream = createEntryStream(value, pendingEntries2);
            const chunk = {
              ...value,
              readable: entryStream.readable
            };
            delete chunk.getData;
            Object.defineProperties(chunk, {
              localDirectory: {
                get: () => value.localDirectory,
                enumerable: true
              },
              warnings: {
                get: () => value.warnings,
                enumerable: true
              }
            });
            controller.enqueue(chunk);
          },
          async cancel(reason) {
            const entryStreams = Array.from(pendingEntries2);
            pendingEntries2.clear();
            sourceController.error(reason);
            await Promise.allSettled(entryStreams.map((entryStream) => entryStream.cancel(reason)));
            await Promise.allSettled([gen.return(), zipReader.close()]);
          }
        });
        this.writable = writable;
      }
    };
    ZipEntry = class {
      constructor(reader, options) {
        Object.assign(this, {
          reader,
          options
        });
      }
      async getData(writer, fileEntry, zipReader, options = {}) {
        const zipEntry = this;
        const { readRanges, directoryOffset } = zipReader;
        if (zipEntry.zip64ExtraFieldMissing) {
          throw new Error(ERR_EXTRAFIELD_ZIP64_NOT_FOUND);
        }
        const config2 = getConfiguration();
        const {
          reader,
          index,
          offset,
          diskNumberStart,
          extraFieldAES,
          extraFieldZip64,
          compressionMethod,
          bitFlag,
          rawBitFlag,
          crc32,
          rawLastModDate,
          uncompressedSize,
          compressedSize
        } = zipEntry;
        const {
          dataDescriptor
        } = bitFlag;
        const localDirectory = fileEntry.localDirectory = {};
        const warnings = fileEntry.warnings = [];
        const localHeaderOffset = getDiskOffset(reader, diskNumberStart) + offset;
        const dataArray = await readUint8Array(reader, localHeaderOffset, HEADER_SIZE);
        const dataView = getDataView(dataArray);
        let password = getOptionValue(zipEntry, options, OPTION_PASSWORD);
        let rawPassword = getOptionValue(zipEntry, options, OPTION_RAW_PASSWORD);
        const passThrough = checkPassThroughOption(getOptionValue(zipEntry, options, OPTION_PASS_THROUGH));
        const passThroughCompression = Boolean(passThrough);
        const passThroughEncryption = passThrough === true;
        checkPasswordOption(password, rawPassword);
        password = password && password.length ? password : UNDEFINED_VALUE;
        rawPassword = rawPassword && rawPassword.length ? rawPassword : UNDEFINED_VALUE;
        if (extraFieldAES) {
          if (extraFieldAES.originalCompressionMethod != COMPRESSION_METHOD_AES) {
            throw new Error(ERR_UNSUPPORTED_COMPRESSION);
          }
        }
        if (dataArray.length < HEADER_SIZE || getUint32(dataView, 0) != LOCAL_FILE_HEADER_SIGNATURE) {
          throw new Error(ERR_LOCAL_FILE_HEADER_NOT_FOUND);
        }
        readCommonHeader(localDirectory, dataView, 4);
        const {
          extraFieldLength,
          filenameLength
        } = localDirectory;
        const dataOffset = localDirectory.dataOffset = localHeaderOffset + HEADER_SIZE + filenameLength + extraFieldLength;
        const checkLocalDirectoryOption = getOptionValue(zipEntry, options, OPTION_CHECK_LOCAL_DIRECTORY);
        const entryStrictness = getStrictness(options, zipEntry.options);
        const checkLocalDirectory = getCheckLocalDirectory(checkLocalDirectoryOption, entryStrictness);
        const checkLocalFilenameOption = getOptionValue(zipEntry, options, OPTION_CHECK_LOCAL_FILENAME);
        const checkLocalFilename = getCheckLocalFilename(
          checkLocalFilenameOption === UNDEFINED_VALUE ? checkLocalDirectoryOption : checkLocalFilenameOption,
          entryStrictness
        );
        let rawLocalFilename = EMPTY_UINT8_ARRAY;
        if (checkLocalFilename && (filenameLength || extraFieldLength)) {
          const trailingDataArray = await readUint8Array(reader, localHeaderOffset + HEADER_SIZE, filenameLength + extraFieldLength);
          rawLocalFilename = trailingDataArray.subarray(0, filenameLength);
          localDirectory.rawExtraField = trailingDataArray.subarray(filenameLength);
        } else {
          localDirectory.rawExtraField = extraFieldLength ? await readUint8Array(reader, localHeaderOffset + HEADER_SIZE + filenameLength, extraFieldLength) : EMPTY_UINT8_ARRAY;
        }
        if (checkLocalFilename) {
          localDirectory.rawFilename = rawLocalFilename;
        }
        if (readCommonFooter(zipEntry, localDirectory, dataView, 4, true)) {
          addWarning(warnings, WARNING_MALFORMED_EXTRA_FIELD);
        }
        validateLocalDirectory(zipEntry, localDirectory, rawLocalFilename, checkLocalFilename, checkLocalDirectory ? UNDEFINED_VALUE : warnings);
        const { lastAccessDate, creationDate, uid, gid } = localDirectory;
        if (lastAccessDate && fileEntry.lastAccessDate === UNDEFINED_VALUE) {
          fileEntry.lastAccessDate = lastAccessDate;
        }
        if (creationDate && fileEntry.creationDate === UNDEFINED_VALUE) {
          fileEntry.creationDate = creationDate;
        }
        if (uid !== UNDEFINED_VALUE && fileEntry.uid === UNDEFINED_VALUE) {
          fileEntry.uid = uid;
        }
        if (gid !== UNDEFINED_VALUE && fileEntry.gid === UNDEFINED_VALUE) {
          fileEntry.gid = gid;
        }
        const checkPasswordOnly = getOptionValue(zipEntry, options, OPTION_CHECK_PASSWORD_ONLY);
        const encrypted = zipEntry.encrypted && (!passThroughEncryption || checkPasswordOnly);
        const zipCrypto = encrypted && !extraFieldAES;
        if (!passThroughEncryption) {
          fileEntry.zipCrypto = zipCrypto;
        }
        if (encrypted && (zipEntry.rawBitFlag & BITFLAG_STRONG_ENCRYPTION) == BITFLAG_STRONG_ENCRYPTION) {
          throw new Error(ERR_UNSUPPORTED_ENCRYPTION);
        }
        const registeredCodec = passThroughCompression ? UNDEFINED_VALUE : getRegisteredCodec(compressionMethod);
        if (compressionMethod != COMPRESSION_METHOD_STORE && compressionMethod != COMPRESSION_METHOD_DEFLATE && compressionMethod != COMPRESSION_METHOD_DEFLATE_64 && !registeredCodec && !passThroughCompression) {
          throw new Error(ERR_UNSUPPORTED_COMPRESSION);
        }
        if (encrypted) {
          if (!zipCrypto && (extraFieldAES.strength < 1 || extraFieldAES.strength > 3)) {
            throw new Error(ERR_UNSUPPORTED_ENCRYPTION);
          } else if (!password && !rawPassword) {
            throw new Error(ERR_ENCRYPTED);
          }
        }
        if (dataOffset + compressedSize > Math.min(reader.size, directoryOffset)) {
          throw new Error(ERR_ENTRY_DATA_OUT_OF_BOUNDS);
        }
        const size = compressedSize;
        const signal = checkSignalOption(getOptionValue(zipEntry, options, OPTION_SIGNAL));
        throwIfAborted(signal);
        let checkOverlappingEntry = getOptionValue(zipEntry, options, OPTION_CHECK_OVERLAPPING_ENTRY);
        const checkOverlappingEntryOnly = getOptionValue(zipEntry, options, OPTION_CHECK_OVERLAPPING_ENTRY_ONLY);
        if (checkOverlappingEntryOnly) {
          checkOverlappingEntry = true;
        }
        const { onstart, onprogress, onend } = options;
        const compressed = compressionMethod != COMPRESSION_METHOD_STORE && !passThroughCompression;
        const outputSize = passThroughCompression ? compressedSize - getEncryptionOverhead(encrypted, zipCrypto, extraFieldAES && extraFieldAES.strength) : uncompressedSize;
        const deflate64 = compressionMethod == COMPRESSION_METHOD_DEFLATE_64;
        let useCompressionStream = getOptionValue(zipEntry, options, OPTION_USE_COMPRESSION_STREAM);
        if (deflate64) {
          useCompressionStream = false;
        }
        const checkCrc32Option = getOptionValue(zipEntry, options, OPTION_CHECK_CRC32);
        const checkCrc32 = (checkCrc32Option === UNDEFINED_VALUE ? getOptionValue(zipEntry, options, OPTION_CHECK_SIGNATURE) : checkCrc32Option) && !passThroughCompression && (!encrypted || zipCrypto || extraFieldAES && extraFieldAES.vendorVersion == VENDOR_VERSION_AE_1);
        const workerOptions = {
          options: {
            codecType: CODEC_INFLATE,
            password,
            rawPassword,
            zipCrypto,
            encryptionStrength: extraFieldAES && extraFieldAES.strength,
            checkCrc32,
            checkAuthenticationCode: getOptionValue(zipEntry, options, OPTION_CHECK_AUTHENTICATION_CODE),
            passwordVerification: zipCrypto && (dataDescriptor ? rawLastModDate >>> 8 & MAX_8_BITS : crc32 >>> 24 & MAX_8_BITS),
            outputSize,
            crc32,
            compressed,
            encrypted,
            useWebWorkers: getOptionValue(zipEntry, options, OPTION_USE_WEB_WORKERS),
            useCompressionStream,
            deflate64,
            format: registeredCodec ? registeredCodec.format : UNDEFINED_VALUE,
            codecURI: registeredCodec ? registeredCodec.codecURI : UNDEFINED_VALUE,
            compressionMethod,
            rawBitFlag,
            checkPasswordOnly
          },
          config: config2,
          streamOptions: { signal, size, onstart, onprogress, onend }
        };
        if (checkOverlappingEntry) {
          await detectOverlappingEntry({
            reader,
            fileEntry,
            index,
            offset: localHeaderOffset,
            crc32,
            compressedSize,
            uncompressedSize,
            dataOffset,
            dataDescriptor: dataDescriptor || localDirectory.bitFlag.dataDescriptor,
            extraFieldZip64: extraFieldZip64 || localDirectory.extraFieldZip64,
            readRanges
          });
          validateDataDescriptor(zipEntry, localDirectory, checkLocalDirectory ? UNDEFINED_VALUE : warnings);
        }
        let writable, abortError, aborted;
        try {
          if (!checkOverlappingEntryOnly) {
            if (checkPasswordOnly) {
              writer = new WritableStream();
            }
            writer = new GenericWriter(writer);
            await initStream(writer, getDecodableOutputSize(outputSize, compressedSize, compressed));
            ({ writable } = writer);
            const readable = toCompatibleReadable(reader.createReadable({ offset: dataOffset, size }));
            const { outputSize: writtenSize } = await runWorker2({ readable, writable }, workerOptions);
            throwIfAborted(signal);
            if (writtenSize != outputSize) {
              throw Object.assign(new Error(ERR_INVALID_UNCOMPRESSED_SIZE), { outputSize: writtenSize });
            }
            writer.size += writtenSize;
          }
        } catch (error) {
          if (isErrorObject(error) && error.outputSize !== UNDEFINED_VALUE) {
            writer.size += error.outputSize;
          }
          if (!checkPasswordOnly || !isErrorObject(error) || error.message != ERR_ABORT_CHECK_PASSWORD) {
            abortError = error;
            aborted = true;
            throw error;
          }
        } finally {
          const preventClose = !ownsWritable(writer) && getOptionValue(zipEntry, options, OPTION_PREVENT_CLOSE);
          if (!preventClose && writable && !writable.locked) {
            const writableWriter = writable.getWriter();
            if (aborted) {
              try {
                await writableWriter.abort(abortError);
              } catch {
              }
            } else {
              await writableWriter.close();
            }
          }
        }
        return checkPasswordOnly || checkOverlappingEntryOnly ? UNDEFINED_VALUE : writer.getData ? writer.getData() : writable;
      }
    };
  }
});
function uniqueId() {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (x) => x.toString(16).padStart(2, "0")).join("");
}
var invoke = (object, method, ...args) => new Promise((resolve, reject) => object[method](...args, resolve, reject));
var legacyFS = () => invoke(globalThis, "webkitRequestFileSystem", 0, 0);
async function receiveDirectory(directory) {
  if (!directory?.legacyCatalogPath) return directory;
  if (!/^\/komga-catalog-[a-z-]+$/.test(directory.legacyCatalogPath)) throw new Error("Invalid catalog storage path");
  return new LegacyDirectory(await invoke((await legacyFS()).root, "getDirectory", directory.legacyCatalogPath, { create: false }));
}
var LegacyDirectory = class {
  constructor(entry) {
    this.entry = entry;
  }
  async *entries() {
    const reader = this.entry.createReader();
    while (true) {
      const entries = await invoke(reader, "readEntries");
      if (!entries.length) return;
      for (const entry of entries) if (entry.isFile) yield [entry.name, new LegacyFile(entry)];
    }
  }
  async getFileHandle(name, options = {}) {
    if (!name || name.includes("/") || name.includes("\\")) throw new Error("Invalid catalog filename");
    return new LegacyFile(await invoke(this.entry, "getFile", name, { create: Boolean(options.create) }));
  }
  async removeEntry(name) {
    let missing;
    try {
      const file = await this.getFileHandle(name);
      await invoke(file.entry, "remove");
    } catch (error) {
      if (error.name !== "NotFoundError") throw error;
      missing = error;
    }
    const reader = this.entry.createReader();
    while (true) {
      const entries = await invoke(reader, "readEntries");
      if (!entries.length) break;
      for (const entry of entries) if (entry.isFile && entry.name.startsWith(`.pending-${name}-`)) await invoke(entry, "remove");
    }
    if (missing) throw missing;
  }
};
var LegacyFile = class {
  constructor(entry) {
    this.entry = entry;
    this.kind = "file";
  }
  getFile() {
    return invoke(this.entry, "file");
  }
  async createWritable() {
    const parent = await invoke(this.entry, "getParent");
    const temporary = await invoke(parent, "getFile", `.pending-${this.entry.name}-${uniqueId()}`, { create: true, exclusive: true });
    let writer;
    try {
      writer = await invoke(temporary, "createWriter");
    } catch (error) {
      await invoke(temporary, "remove").catch(() => {
      });
      throw error;
    }
    let position = 0, closed = false, rejectPending;
    const write = (data) => new Promise((resolve, reject) => {
      if (closed) {
        reject(new Error("Writer is closed"));
        return;
      }
      rejectPending = reject;
      const blob = data instanceof Blob ? data : new Blob([data]);
      writer.onerror = () => reject(writer.error);
      writer.onwriteend = () => {
        rejectPending = void 0;
        if (!writer.error) {
          position += blob.size;
          resolve();
        }
      };
      try {
        writer.seek(position);
        writer.write(blob);
      } catch (error) {
        reject(error);
      }
    });
    return {
      write,
      close: async () => {
        if (closed) throw new Error("Writer is closed");
        await invoke(temporary, "moveTo", parent, this.entry.name);
        closed = true;
      },
      abort: async () => {
        if (closed) return;
        closed = true;
        rejectPending?.(new DOMException("Write cancelled", "AbortError"));
        rejectPending = void 0;
        if (writer.readyState === 1) {
          await new Promise((resolve) => {
            writer.onwriteend = resolve;
            writer.onerror = resolve;
            writer.abort();
          });
        }
        await invoke(temporary, "remove").catch((error) => {
          if (error.name !== "NotFoundError") throw error;
        });
      }
    };
  }
  async createSyncAccessHandle() {
    if (typeof globalThis.webkitRequestFileSystemSync !== "function") throw new Error("HTTP \u672C\u5730\u6784\u5EFA\u9700\u8981 Chromium Worker \u6587\u4EF6\u7CFB\u7EDF\u652F\u6301");
    const fs = globalThis.webkitRequestFileSystemSync(0, 0);
    const entry = fs.root.getFile(this.entry.fullPath, { create: false });
    const writer = entry.createWriter(), reader = new FileReaderSync();
    let snapshot;
    return {
      read(buffer2, { at = 0 } = {}) {
        snapshot ??= entry.file();
        const bytes = new Uint8Array(reader.readAsArrayBuffer(snapshot.slice(at, at + buffer2.byteLength)));
        new Uint8Array(buffer2.buffer, buffer2.byteOffset, buffer2.byteLength).set(bytes);
        return bytes.byteLength;
      },
      write(buffer2, { at = 0 } = {}) {
        snapshot = void 0;
        if (buffer2.byteLength && at > writer.length) writer.truncate(at);
        writer.seek(at);
        writer.write(new Blob([buffer2]));
        return buffer2.byteLength;
      },
      truncate(size) {
        snapshot = void 0;
        writer.truncate(size);
      },
      getSize() {
        return writer.length;
      },
      // Legacy FileWriterSync completes writes synchronously but exposes no fsync.
      // Only fully built, integrity-checked immutable snapshots are published.
      flush() {
      },
      close() {
        snapshot = void 0;
      }
    };
  }
};
var SCHEMA_VERSION = 1;
var ANALYZER_VERSION = 1;
function tokens(text) {
  const result = [];
  const normalized = String(text).normalize("NFKC").toLowerCase();
  for (const match of normalized.matchAll(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+|[\p{L}\p{N}]+/gu)) {
    const word = match[0];
    if (/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+$/u.test(word)) {
      const chars = Array.from(word);
      for (const ch of chars) result.push(ch);
      for (let i = 0; i + 1 < chars.length; i++) result.push(chars[i] + chars[i + 1]);
    } else result.push(word);
  }
  return [...new Set(result)];
}
function indexText(titles) {
  return tokens(titles.join(" ")).join(" ");
}
var SCHEMA = `
PRAGMA journal_mode=DELETE;
CREATE TABLE manifest (schema_version INTEGER NOT NULL, analyzer_version INTEGER NOT NULL,
 provider TEXT NOT NULL, source_version TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE entries (id INTEGER PRIMARY KEY, provider TEXT NOT NULL, source_id TEXT NOT NULL,
 title TEXT NOT NULL, url TEXT NOT NULL, record TEXT NOT NULL, UNIQUE(provider, source_id));
CREATE TABLE book_entries (provider TEXT NOT NULL, source_id TEXT NOT NULL, record TEXT NOT NULL,
 PRIMARY KEY(provider, source_id));
CREATE VIRTUAL TABLE title_fts USING fts5(tokens, tokenize='unicode61');
`;
function list(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value;
  const parsed = JSON.parse(value);
  if (parsed === null) return [];
  if (!Array.isArray(parsed)) throw new Error("Expected JSON array in source database");
  return parsed;
}
function base(provider, id, url, raw) {
  return { provider, id: String(id), url, titles: [], tags: [], genres: [], authors: [], covers: [], links: [{ label: provider, url }], raw };
}
function title(record, text, type = "native", language) {
  if (typeof text === "string" && text.trim() && !record.titles.some((t4) => t4.text === text))
    record.titles.push({ text, type, ...language ? { language } : {} });
}
function optional(record, field, value) {
  if (value !== null && value !== void 0 && value !== "") record[field] = value;
}
function sourceDate(value) {
  if (typeof value !== "string") return void 0;
  const match = value.match(/^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})(?:日|T.*)?$/);
  if (!match) return void 0;
  const iso = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  const date = /* @__PURE__ */ new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== iso ? void 0 : iso;
}
function addAuthor(record, name, role) {
  if (typeof name !== "string" || !name.trim()) return;
  if (!record.authors.some((a) => a.name === name && a.role === role)) record.authors.push({ name, role });
}
function cover(record, url, volume) {
  if (typeof url === "string" && /^https?:\/\//i.test(url))
    record.covers.push({ url, ...Number.isFinite(volume) ? { volume } : {} });
}
function infobox(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  const items = [];
  const re = /^\|([^=\n]+)=([\s\S]*?)(?=^\|[^=\n]+=|^\}\}|$)/gm;
  for (const m of value.matchAll(re)) {
    const raw = m[2].trim();
    const values = [...raw.matchAll(/\[([^\]]+)\]/g)].map((x) => {
      const parts = x[1].split("|");
      return parts.at(-1).trim();
    });
    items.push({ key: m[1].trim(), value: values.length ? values : raw });
  }
  return items;
}
function bangumi(subject, persons = [], relations = [], books = []) {
  const id = String(subject.id);
  const rawPersons = persons.map((p2) => ({ ...p2, person: p2.person ? { ...p2.person, summary: void 0 } : p2.person }));
  const r2 = base("bangumi", id, `https://bgm.tv/subject/${encodeURIComponent(id)}`, { subject, persons: rawPersons, relations });
  title(r2, subject.name);
  title(r2, subject.name_cn ?? subject.nameCN, "localized", "zh");
  for (const item of infobox(subject.infobox)) {
    const values = Array.isArray(item.value) ? item.value.map((v2) => typeof v2 === "string" ? v2 : v2?.v) : [item.value];
    if (/^(别名|別名|alias)$/i.test(item.key ?? "")) for (const v2 of values) title(r2, v2, "alias");
    if (/^(出版社|publisher)$/i.test(item.key ?? "")) optional(r2, "publisher", values[0]);
    if (/^(发售日|発売日)$/i.test(item.key ?? "")) optional(r2, "releaseDate", values[0]);
    if (/^ISBN(?:-1[03])?$/i.test(item.key ?? "")) optional(r2, "isbn", values[0]);
    const role = { \u4F5C\u8005: "writer", \u4F5C\u753B: "penciller", \u539F\u4F5C: "writer", \u63D2\u753B: "penciller", \u63D2\u5716: "penciller", \u7FFB\u8BD1: "translator", \u8B6F\u8005: "translator" }[item.key];
    if (role) for (const v2 of values) addAuthor(r2, v2, role);
  }
  const roles2 = { 2001: "writer", 2002: "penciller", 2003: "cover", 2006: "translator", 2007: "writer", 2009: "character", 2010: "writer" };
  for (const p2 of persons) {
    const role = roles2[p2.relation?.position];
    if (role) addAuthor(r2, p2.person?.name, role);
    if (p2.relation?.position === 2004 && !r2.publisher) optional(r2, "publisher", p2.person?.name);
  }
  r2.tags = (subject.tags ?? []).map((t4) => typeof t4 === "string" ? t4 : t4.name).filter(Boolean);
  optional(r2, "summary", subject.summary);
  const releaseDate = sourceDate(subject.date) || sourceDate(r2.releaseDate);
  delete r2.releaseDate;
  optional(r2, "releaseDate", releaseDate);
  if (subject.series === false) {
    const match = String(subject.name ?? "").match(/第\s*(\d+(?:\.\d+)?)\s*巻|(?:vol(?:ume)?\.?\s*|[（(])(\d+(?:\.\d+)?)(?:[）)]|\b)/i);
    if (match) r2.volume = Number(match[1] ?? match[2]);
  }
  if (books.length) r2.books = books;
  return r2;
}
function ehentai(row, tags) {
  const gid = String(row.gid), token = String(row.token ?? "").toLowerCase();
  if (!/^[1-9]\d*$/.test(gid) || !/^[a-f0-9]{10}$/.test(token))
    throw new Error(`Invalid E-Hentai gid or token: ${gid}`);
  const id = `${gid}:${token}`;
  const r2 = base("ehentai", id, `https://e-hentai.org/g/${gid}/${token}/`, { gallery: row, tags });
  title(r2, row.title_jpn || row.title);
  title(r2, row.title, "alias");
  r2.tags = tags.map((t4) => t4.name);
  if (row.category) r2.genres.push(row.category);
  r2.authors = r2.tags.filter((tag) => /^(artist|group):/.test(tag)).map((tag) => ({
    name: tag.slice(tag.indexOf(":") + 1),
    role: tag.startsWith("artist:") ? "penciller" : "writer"
  }));
  const language = r2.tags.find((tag) => tag.startsWith("language:"))?.slice(9);
  optional(r2, "language", { japanese: "ja", english: "en", chinese: "zh", korean: "ko", french: "fr", spanish: "es" }[language]);
  cover(r2, row.thumb);
  return r2;
}
function mangabaka(row, relatedTags = []) {
  const id = String(row.id);
  const r2 = base("mangabaka", id, row.canonical_url || `https://mangabaka.org/manga/${id}`, { series: row, tags: relatedTags });
  for (const t4 of list(row.titles)) title(r2, t4.title, t4.language === row.original_language ? "native" : "alias", t4.language);
  if (r2.titles.length && !r2.titles.some((t4) => t4.type === "native")) r2.titles[0].type = "native";
  for (const [field, role] of [["authors", "writer"], ["artists", "penciller"]])
    for (const name of list(row[field])) if (typeof name === "string") r2.authors.push({ name, role });
  const tags = list(row.tags_v2);
  for (const tag of [...tags, ...relatedTags]) {
    const name = tag.name_path || tag.name;
    if (name && !r2.tags.includes(name)) (tag.is_genre ? r2.genres : r2.tags).push(name);
  }
  for (const link of list(row.links_v2)) if (link.url) r2.links.push({ label: link.name_display || link.name || "source", url: link.url });
  const publishers = list(row.publishers);
  optional(r2, "publisher", publishers[0]?.name);
  optional(r2, "summary", row.description);
  optional(r2, "language", row.original_language);
  optional(r2, "releaseDate", sourceDate(row.published_start_date));
  const status = { RELEASING: "ONGOING", COMPLETED: "ENDED", HIATUS: "HIATUS", CANCELLED: "ABANDONED" }[String(row.status ?? "").toUpperCase()];
  optional(r2, "status", status);
  cover(r2, row.cover_raw_url || row.cover_x350_x1);
  return r2;
}
function imageUrl(id) {
  if (!id || id.length < 6) return void 0;
  return `https://img.sos-dan.net/600/${id.slice(0, 3)}/${id[3]}/${id[4]}/${id.slice(5)}.webp`;
}
var roles = ["contributor", "writer", "penciller", "illustrator", "unknown-4", "unknown-5", "colorist", "letterer", "editor", "translator", "narrator", "original author", "character design", "adaptation", "compilation", "consulting editor", "cover design", "creator", "designer", "coordination", "idea", "unknown-21", "producer", "script", "text", "with"];
function bookwalkerBook(row, contributors, externalIds, image) {
  const id = String(row.id);
  const kind = row.level === 3 ? "chapter" : "volume";
  const url = `https://bookwalker.com/${kind}/${String(row.content_id ?? id).replace(/^CNT_/, "")}`;
  const r2 = base("bookwalker", id, url, { product: row, contributors, externalIds, image });
  title(r2, row.display_title || row.title);
  title(r2, row.title, "alias");
  for (const t4 of list(row.alt_titles)) title(r2, t4, "alias");
  optional(r2, "summary", row.description);
  optional(r2, "releaseDate", sourceDate(row.on_sale_at));
  if (row.level === 2) {
    const text = `${row.title ?? ""} ${row.display_title ?? ""}`;
    const match = text.match(/第\s*(\d+(?:\.\d+)?)\s*巻|(?:vol(?:ume)?\.?)\s*(\d+(?:\.\d+)?)/i);
    if (match) r2.volume = Number(match[1] ?? match[2]);
  }
  optional(r2, "isbn", externalIds.find((x) => x.type === 3)?.external_id);
  r2.authors = contributors.filter((c) => c.name_override || c.name).map((c) => ({
    name: c.name_override || c.name,
    role: roles[c.role] ?? `role-${c.role}`,
    ...c.name_alt ? { localized: c.name_alt } : {}
  }));
  cover(r2, imageUrl(image?.id), r2.volume);
  return r2;
}
function bookwalker(row, tags, image, books) {
  const id = String(row.id);
  const r2 = base("bookwalker", id, `https://bookwalker.com/series/${id.replace(/^CNT_/, "")}`, { series: row, tags, image });
  title(r2, row.title);
  title(r2, row.display_title, "alias");
  for (const t4 of list(row.alt_titles)) title(r2, t4, "alias");
  r2.tags = tags.map((t4) => t4.name).filter(Boolean);
  optional(r2, "summary", row.description);
  for (const book of books) for (const author of book.authors ?? []) addAuthor(r2, author.name, author.role);
  cover(r2, imageUrl(image?.id));
  if (books.length) r2.books = books;
  return r2;
}
var ab = ArrayBuffer;
var u8 = Uint8Array;
var u16 = Uint16Array;
var i16 = Int16Array;
var i32 = Int32Array;
var slc = function(v2, s2, e4) {
  if (u8.prototype.slice)
    return u8.prototype.slice.call(v2, s2, e4);
  if (s2 == null || s2 < 0)
    s2 = 0;
  if (e4 == null || e4 > v2.length)
    e4 = v2.length;
  var n3 = new u8(e4 - s2);
  n3.set(v2.subarray(s2, e4));
  return n3;
};
var fill = function(v2, n3, s2, e4) {
  if (u8.prototype.fill)
    return u8.prototype.fill.call(v2, n3, s2, e4);
  if (s2 == null || s2 < 0)
    s2 = 0;
  if (e4 == null || e4 > v2.length)
    e4 = v2.length;
  for (; s2 < e4; ++s2)
    v2[s2] = n3;
  return v2;
};
var cpw = function(v2, t4, s2, e4) {
  if (u8.prototype.copyWithin)
    return u8.prototype.copyWithin.call(v2, t4, s2, e4);
  if (s2 == null || s2 < 0)
    s2 = 0;
  if (e4 == null || e4 > v2.length)
    e4 = v2.length;
  while (s2 < e4) {
    v2[t4++] = v2[s2++];
  }
};
var ec = [
  "invalid zstd data",
  "window size too large (>2046MB)",
  "invalid block type",
  "FSE accuracy too high",
  "match distance too far back",
  "unexpected EOF"
];
var err = function(ind, msg, nt) {
  var e4 = new Error(msg || ec[ind]);
  e4.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e4, err);
  if (!nt)
    throw e4;
  return e4;
};
var rb = function(d, b2, n3) {
  var i = 0, o2 = 0;
  for (; i < n3; ++i)
    o2 |= d[b2++] << (i << 3);
  return o2;
};
var b4 = function(d, b2) {
  return (d[b2] | d[b2 + 1] << 8 | d[b2 + 2] << 16 | d[b2 + 3] << 24) >>> 0;
};
var rzfh = function(dat, w) {
  var n3 = dat[0] | dat[1] << 8 | dat[2] << 16;
  if (n3 == 3126568 && dat[3] == 253) {
    var flg = dat[4];
    var ss = flg >> 5 & 1, cc = flg >> 2 & 1, df = flg & 3, fcf = flg >> 6;
    if (flg & 8)
      err(0);
    var bt = 6 - ss;
    var db = df == 3 ? 4 : df;
    var di = rb(dat, bt, db);
    bt += db;
    var fsb = fcf ? 1 << fcf : ss;
    var fss = rb(dat, bt, fsb) + (fcf == 1 && 256);
    var ws = fss;
    if (!ss) {
      var wb = 1 << 10 + (dat[5] >> 3);
      ws = wb + (wb >> 3) * (dat[5] & 7);
    }
    if (ws > 2145386496)
      err(1);
    var buf = new u8((w == 1 ? fss || ws : w ? 0 : ws) + 12);
    buf[0] = 1, buf[4] = 4, buf[8] = 8;
    return {
      b: bt + fsb,
      y: 0,
      l: 0,
      d: di,
      w: w && w != 1 ? w : buf.subarray(12),
      e: ws,
      o: new i32(buf.buffer, 0, 3),
      u: fss,
      c: cc,
      m: Math.min(131072, ws)
    };
  } else if ((n3 >> 4 | dat[3] << 20) == 25481893) {
    return b4(dat, 4) + 8;
  }
  err(0);
};
var msb = function(val) {
  var bits = 0;
  for (; 1 << bits <= val; ++bits)
    ;
  return bits - 1;
};
var rfse = function(dat, bt, mal) {
  var tpos = (bt << 3) + 4;
  var al = (dat[bt] & 15) + 5;
  if (al > mal)
    err(3);
  var sz = 1 << al;
  var probs = sz, sym = -1, re = -1, i = -1, ht = sz;
  var buf = new ab(512 + (sz << 2));
  var freq = new i16(buf, 0, 256);
  var dstate = new u16(buf, 0, 256);
  var nstate = new u16(buf, 512, sz);
  var bb1 = 512 + (sz << 1);
  var syms = new u8(buf, bb1, sz);
  var nbits = new u8(buf, bb1 + sz);
  while (sym < 255 && probs > 0) {
    var bits = msb(probs + 1);
    var cbt = tpos >> 3;
    var msk = (1 << bits + 1) - 1;
    var val = (dat[cbt] | dat[cbt + 1] << 8 | dat[cbt + 2] << 16) >> (tpos & 7) & msk;
    var msk1fb = (1 << bits) - 1;
    var msv = msk - probs - 1;
    var sval = val & msk1fb;
    if (sval < msv)
      tpos += bits, val = sval;
    else {
      tpos += bits + 1;
      if (val > msk1fb)
        val -= msv;
    }
    freq[++sym] = --val;
    if (val == -1) {
      probs += val;
      syms[--ht] = sym;
    } else
      probs -= val;
    if (!val) {
      do {
        var rbt = tpos >> 3;
        re = (dat[rbt] | dat[rbt + 1] << 8) >> (tpos & 7) & 3;
        tpos += 2;
        sym += re;
      } while (re == 3);
    }
  }
  if (sym > 255 || probs)
    err(0);
  var sympos = 0;
  var sstep = (sz >> 1) + (sz >> 3) + 3;
  var smask = sz - 1;
  for (var s2 = 0; s2 <= sym; ++s2) {
    var sf = freq[s2];
    if (sf < 1) {
      dstate[s2] = -sf;
      continue;
    }
    for (i = 0; i < sf; ++i) {
      syms[sympos] = s2;
      do {
        sympos = sympos + sstep & smask;
      } while (sympos >= ht);
    }
  }
  if (sympos)
    err(0);
  for (i = 0; i < sz; ++i) {
    var ns = dstate[syms[i]]++;
    var nb = nbits[i] = al - msb(ns);
    nstate[i] = (ns << nb) - sz;
  }
  return [tpos + 7 >> 3, {
    b: al,
    s: syms,
    n: nbits,
    t: nstate
  }];
};
var rhu = function(dat, bt) {
  var i = 0, wc = -1;
  var buf = new u8(292), hb = dat[bt];
  var hw = buf.subarray(0, 256);
  var rc = buf.subarray(256, 268);
  var ri = new u16(buf.buffer, 268);
  if (hb < 128) {
    var _a = rfse(dat, bt + 1, 6), ebt = _a[0], fdt = _a[1];
    bt += hb;
    var epos = ebt << 3;
    var lb = dat[bt];
    if (!lb)
      err(0);
    var st1 = 0, st2 = 0, btr1 = fdt.b, btr2 = btr1;
    var fpos = (++bt << 3) - 8 + msb(lb);
    for (; ; ) {
      fpos -= btr1;
      if (fpos < epos)
        break;
      var cbt = fpos >> 3;
      st1 += (dat[cbt] | dat[cbt + 1] << 8) >> (fpos & 7) & (1 << btr1) - 1;
      hw[++wc] = fdt.s[st1];
      fpos -= btr2;
      if (fpos < epos)
        break;
      cbt = fpos >> 3;
      st2 += (dat[cbt] | dat[cbt + 1] << 8) >> (fpos & 7) & (1 << btr2) - 1;
      hw[++wc] = fdt.s[st2];
      btr1 = fdt.n[st1];
      st1 = fdt.t[st1];
      btr2 = fdt.n[st2];
      st2 = fdt.t[st2];
    }
    if (++wc > 255)
      err(0);
  } else {
    wc = hb - 127;
    for (; i < wc; i += 2) {
      var byte = dat[++bt];
      hw[i] = byte >> 4;
      hw[i + 1] = byte & 15;
    }
    ++bt;
  }
  var wes = 0;
  for (i = 0; i < wc; ++i) {
    var wt = hw[i];
    if (wt > 11)
      err(0);
    wes += wt && 1 << wt - 1;
  }
  var mb = msb(wes) + 1;
  var ts = 1 << mb;
  var rem = ts - wes;
  if (rem & rem - 1)
    err(0);
  hw[wc++] = msb(rem) + 1;
  for (i = 0; i < wc; ++i) {
    var wt = hw[i];
    ++rc[hw[i] = wt && mb + 1 - wt];
  }
  var hbuf = new u8(ts << 1);
  var syms = hbuf.subarray(0, ts), nb = hbuf.subarray(ts);
  ri[mb] = 0;
  for (i = mb; i > 0; --i) {
    var pv = ri[i];
    fill(nb, i, pv, ri[i - 1] = pv + rc[i] * (1 << mb - i));
  }
  if (ri[0] != ts)
    err(0);
  for (i = 0; i < wc; ++i) {
    var bits = hw[i];
    if (bits) {
      var code = ri[bits];
      fill(syms, i, code, ri[bits] = code + (1 << mb - bits));
    }
  }
  return [bt, {
    n: nb,
    b: mb,
    s: syms
  }];
};
var dllt = rfse(/* @__PURE__ */ new u8([
  81,
  16,
  99,
  140,
  49,
  198,
  24,
  99,
  12,
  33,
  196,
  24,
  99,
  102,
  102,
  134,
  70,
  146,
  4
]), 0, 6)[1];
var dmlt = rfse(/* @__PURE__ */ new u8([
  33,
  20,
  196,
  24,
  99,
  140,
  33,
  132,
  16,
  66,
  8,
  33,
  132,
  16,
  66,
  8,
  33,
  68,
  68,
  68,
  68,
  68,
  68,
  68,
  68,
  36,
  9
]), 0, 6)[1];
var doct = rfse(/* @__PURE__ */ new u8([
  32,
  132,
  16,
  66,
  102,
  70,
  68,
  68,
  68,
  68,
  36,
  73,
  2
]), 0, 5)[1];
var b2bl = function(b2, s2) {
  var len = b2.length, bl = new i32(len);
  for (var i = 0; i < len; ++i) {
    bl[i] = s2;
    s2 += 1 << b2[i];
  }
  return bl;
};
var llb = /* @__PURE__ */ new u8((/* @__PURE__ */ new i32([
  0,
  0,
  0,
  0,
  16843009,
  50528770,
  134678020,
  202050057,
  269422093
])).buffer, 0, 36);
var llbl = /* @__PURE__ */ b2bl(llb, 0);
var mlb = /* @__PURE__ */ new u8((/* @__PURE__ */ new i32([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  16843009,
  50528770,
  117769220,
  185207048,
  252579084,
  16
])).buffer, 0, 53);
var mlbl = /* @__PURE__ */ b2bl(mlb, 3);
var dhu = function(dat, out, hu) {
  var len = dat.length, ss = out.length, lb = dat[len - 1], msk = (1 << hu.b) - 1, eb = -hu.b;
  if (!lb)
    err(0);
  var st = 0, btr = hu.b, pos = (len << 3) - 8 + msb(lb) - btr, i = -1;
  for (; pos > eb && i < ss; ) {
    var cbt = pos >> 3;
    var val = (dat[cbt] | dat[cbt + 1] << 8 | dat[cbt + 2] << 16) >> (pos & 7);
    st = (st << btr | val) & msk;
    out[++i] = hu.s[st];
    pos -= btr = hu.n[st];
  }
  if (pos != eb || i + 1 != ss)
    err(0);
};
var dhu4 = function(dat, out, hu) {
  var bt = 6;
  var ss = out.length, sz1 = ss + 3 >> 2, sz2 = sz1 << 1, sz3 = sz1 + sz2;
  dhu(dat.subarray(bt, bt += dat[0] | dat[1] << 8), out.subarray(0, sz1), hu);
  dhu(dat.subarray(bt, bt += dat[2] | dat[3] << 8), out.subarray(sz1, sz2), hu);
  dhu(dat.subarray(bt, bt += dat[4] | dat[5] << 8), out.subarray(sz2, sz3), hu);
  dhu(dat.subarray(bt), out.subarray(sz3), hu);
};
var rzb = function(dat, st, out) {
  var _a;
  var bt = st.b;
  var b0 = dat[bt], btype = b0 >> 1 & 3;
  st.l = b0 & 1;
  var sz = b0 >> 3 | dat[bt + 1] << 5 | dat[bt + 2] << 13;
  var ebt = (bt += 3) + sz;
  if (btype == 1) {
    if (bt >= dat.length)
      return;
    st.b = bt + 1;
    if (out) {
      fill(out, dat[bt], st.y, st.y += sz);
      return out;
    }
    return fill(new u8(sz), dat[bt]);
  }
  if (ebt > dat.length)
    return;
  if (btype == 0) {
    st.b = ebt;
    if (out) {
      out.set(dat.subarray(bt, ebt), st.y);
      st.y += sz;
      return out;
    }
    return slc(dat, bt, ebt);
  }
  if (btype == 2) {
    var b3 = dat[bt], lbt = b3 & 3, sf = b3 >> 2 & 3;
    var lss = b3 >> 4, lcs = 0, s4 = 0;
    if (lbt < 2) {
      if (sf & 1)
        lss |= dat[++bt] << 4 | (sf & 2 && dat[++bt] << 12);
      else
        lss = b3 >> 3;
    } else {
      s4 = sf;
      if (sf < 2)
        lss |= (dat[++bt] & 63) << 4, lcs = dat[bt] >> 6 | dat[++bt] << 2;
      else if (sf == 2)
        lss |= dat[++bt] << 4 | (dat[++bt] & 3) << 12, lcs = dat[bt] >> 2 | dat[++bt] << 6;
      else
        lss |= dat[++bt] << 4 | (dat[++bt] & 63) << 12, lcs = dat[bt] >> 6 | dat[++bt] << 2 | dat[++bt] << 10;
    }
    ++bt;
    var buf = out ? out.subarray(st.y, st.y + st.m) : new u8(st.m);
    var spl = buf.length - lss;
    if (lbt == 0)
      buf.set(dat.subarray(bt, bt += lss), spl);
    else if (lbt == 1)
      fill(buf, dat[bt++], spl);
    else {
      var hu = st.h;
      if (lbt == 2) {
        var hud = rhu(dat, bt);
        lcs += bt - (bt = hud[0]);
        st.h = hu = hud[1];
      } else if (!hu)
        err(0);
      (s4 ? dhu4 : dhu)(dat.subarray(bt, bt += lcs), buf.subarray(spl), hu);
    }
    var ns = dat[bt++];
    if (ns) {
      if (ns == 255)
        ns = (dat[bt++] | dat[bt++] << 8) + 32512;
      else if (ns > 127)
        ns = ns - 128 << 8 | dat[bt++];
      var scm = dat[bt++];
      if (scm & 3)
        err(0);
      var dts = [dmlt, doct, dllt];
      for (var i = 2; i > -1; --i) {
        var md = scm >> (i << 1) + 2 & 3;
        if (md == 1) {
          var rbuf = new u8([0, 0, dat[bt++]]);
          dts[i] = {
            s: rbuf.subarray(2, 3),
            n: rbuf.subarray(0, 1),
            t: new u16(rbuf.buffer, 0, 1),
            b: 0
          };
        } else if (md == 2) {
          _a = rfse(dat, bt, 9 - (i & 1)), bt = _a[0], dts[i] = _a[1];
        } else if (md == 3) {
          if (!st.t)
            err(0);
          dts[i] = st.t[i];
        }
      }
      var _b = st.t = dts, mlt = _b[0], oct = _b[1], llt = _b[2];
      var lb = dat[ebt - 1];
      if (!lb)
        err(0);
      var spos = (ebt << 3) - 8 + msb(lb) - llt.b, cbt = spos >> 3, oubt = 0;
      var lst = (dat[cbt] | dat[cbt + 1] << 8) >> (spos & 7) & (1 << llt.b) - 1;
      cbt = (spos -= oct.b) >> 3;
      var ost = (dat[cbt] | dat[cbt + 1] << 8) >> (spos & 7) & (1 << oct.b) - 1;
      cbt = (spos -= mlt.b) >> 3;
      var mst = (dat[cbt] | dat[cbt + 1] << 8) >> (spos & 7) & (1 << mlt.b) - 1;
      for (++ns; --ns; ) {
        var llc = llt.s[lst];
        var lbtr = llt.n[lst];
        var mlc = mlt.s[mst];
        var mbtr = mlt.n[mst];
        var ofc = oct.s[ost];
        var obtr = oct.n[ost];
        cbt = (spos -= ofc) >> 3;
        var ofp = 1 << ofc;
        var off = ofp + ((dat[cbt] | dat[cbt + 1] << 8 | dat[cbt + 2] << 16 | dat[cbt + 3] << 24) >>> (spos & 7) & ofp - 1);
        cbt = (spos -= mlb[mlc]) >> 3;
        var ml = mlbl[mlc] + ((dat[cbt] | dat[cbt + 1] << 8 | dat[cbt + 2] << 16) >> (spos & 7) & (1 << mlb[mlc]) - 1);
        cbt = (spos -= llb[llc]) >> 3;
        var ll = llbl[llc] + ((dat[cbt] | dat[cbt + 1] << 8 | dat[cbt + 2] << 16) >> (spos & 7) & (1 << llb[llc]) - 1);
        cbt = (spos -= lbtr) >> 3;
        lst = llt.t[lst] + ((dat[cbt] | dat[cbt + 1] << 8) >> (spos & 7) & (1 << lbtr) - 1);
        cbt = (spos -= mbtr) >> 3;
        mst = mlt.t[mst] + ((dat[cbt] | dat[cbt + 1] << 8) >> (spos & 7) & (1 << mbtr) - 1);
        cbt = (spos -= obtr) >> 3;
        ost = oct.t[ost] + ((dat[cbt] | dat[cbt + 1] << 8) >> (spos & 7) & (1 << obtr) - 1);
        if (off > 3) {
          st.o[2] = st.o[1];
          st.o[1] = st.o[0];
          st.o[0] = off -= 3;
        } else {
          var idx = off - (ll != 0);
          if (idx) {
            off = idx == 3 ? st.o[0] - 1 : st.o[idx];
            if (idx > 1)
              st.o[2] = st.o[1];
            st.o[1] = st.o[0];
            st.o[0] = off;
          } else
            off = st.o[0];
        }
        for (var i = 0; i < ll; ++i) {
          buf[oubt + i] = buf[spl + i];
        }
        oubt += ll, spl += ll;
        var stin = oubt - off;
        if (stin < 0) {
          var len = -stin;
          var bs = st.e + stin;
          if (len > ml)
            len = ml;
          for (var i = 0; i < len; ++i) {
            buf[oubt + i] = st.w[bs + i];
          }
          oubt += len, ml -= len, stin = 0;
        }
        for (var i = 0; i < ml; ++i) {
          buf[oubt + i] = buf[stin + i];
        }
        oubt += ml;
      }
      if (oubt != spl) {
        while (spl < buf.length) {
          buf[oubt++] = buf[spl++];
        }
      } else
        oubt = buf.length;
      if (out)
        st.y += oubt;
      else
        buf = slc(buf, 0, oubt);
    } else if (out) {
      st.y += lss;
      if (spl) {
        for (var i = 0; i < lss; ++i) {
          buf[i] = buf[spl + i];
        }
      }
    } else if (spl)
      buf = slc(buf, spl);
    st.b = ebt;
    return buf;
  }
  err(2);
};
var cct = function(bufs, ol) {
  if (bufs.length == 1)
    return bufs[0];
  var buf = new u8(ol);
  for (var i = 0, b2 = 0; i < bufs.length; ++i) {
    var chk = bufs[i];
    buf.set(chk, b2);
    b2 += chk.length;
  }
  return buf;
};
var Decompress = /* @__PURE__ */ (function() {
  function Decompress2(ondata) {
    this.ondata = ondata;
    this.c = [];
    this.l = 0;
    this.z = 0;
  }
  Decompress2.prototype.push = function(chunk, final) {
    if (typeof this.s == "number") {
      var sub = Math.min(chunk.length, this.s);
      chunk = chunk.subarray(sub);
      this.s -= sub;
    }
    var sl = chunk.length;
    var ncs = sl + this.l;
    if (!this.s) {
      if (final) {
        if (!ncs) {
          this.ondata(new u8(0), true);
          return;
        }
        if (ncs < 5)
          err(5);
      } else if (ncs < 18) {
        this.c.push(chunk);
        this.l = ncs;
        return;
      }
      if (this.l) {
        this.c.push(chunk);
        chunk = cct(this.c, ncs);
        this.c = [];
        this.l = 0;
      }
      if (typeof (this.s = rzfh(chunk)) == "number")
        return this.push(chunk, final);
    }
    if (typeof this.s != "number") {
      if (ncs < (this.z || 3)) {
        if (final)
          err(5);
        this.c.push(chunk);
        this.l = ncs;
        return;
      }
      if (this.l) {
        this.c.push(chunk);
        chunk = cct(this.c, ncs);
        this.c = [];
        this.l = 0;
      }
      if (!this.z && ncs < (this.z = chunk[this.s.b] & 2 ? 4 : 3 + (chunk[this.s.b] >> 3 | chunk[this.s.b + 1] << 5 | chunk[this.s.b + 2] << 13))) {
        if (final)
          err(5);
        this.c.push(chunk);
        this.l = ncs;
        return;
      } else
        this.z = 0;
      for (; ; ) {
        var blk = rzb(chunk, this.s);
        if (!blk) {
          if (final)
            err(5);
          var adc = chunk.subarray(this.s.b);
          this.s.b = 0;
          this.c.push(adc), this.l += adc.length;
          return;
        } else {
          this.ondata(blk, false);
          cpw(this.s.w, 0, blk.length);
          this.s.w.set(blk, this.s.w.length - blk.length);
        }
        if (this.s.l) {
          var rest = chunk.subarray(this.s.b);
          this.s = this.s.c * 4;
          this.push(rest, final);
          return;
        }
      }
    } else if (final)
      err(5);
  };
  return Decompress2;
})();
init_configuration();
var t = new Uint8Array(288);
t.fill(8, 0, 144), t.fill(9, 144, 256), t.fill(7, 256, 280), t.fill(8, 280, 288), new Uint8Array(30).fill(5);
var n = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var e = (t4) => t4({ workerURI: (t5) => {
  const e4 = "text/javascript";
  let r2 = '!function(t){"function"==typeof define&&define.amd?define(t):t()}(function(){"use strict";const{Array:t,Object:n,Number:e,Math:o,Error:r,Uint8Array:c,Uint16Array:s,Uint32Array:a,Int32Array:i,Map:f,DataView:u,Promise:w,TextEncoder:l,crypto:d,postMessage:p,TransformStream:h,ReadableStream:y,WritableStream:m,CompressionStream:S,DecompressionStream:g}=self,v=void 0,b="undefined",k="function",z=new c,C=[[],[],[],[],[],[],[],[]];for(let t=0;t<256;t++){let n=t;for(let t=0;t<8;t++)n=1&n?n>>>1^3988292384:n>>>1;C[0][t]=n}for(let t=0;t<256;t++)for(let n=1;n<8;n++){const e=C[n-1][t];C[n][t]=e>>>8^C[0][255&e]}const[I,M,A,E,R,x,P,D]=C;class F{constructor(t){this.o=t||-1}append(t){let n=0|this.o;const e=0|t.length;let o=0;if(e>=8&&t.buffer){const r=new u(t.buffer,t.byteOffset,e),c=e-8;for(;o<=c;o+=8){const t=n^r.getInt32(o,!0),e=r.getInt32(o+4,!0);n=D[255&t]^P[t>>>8&255]^x[t>>>16&255]^R[t>>>24&255]^E[255&e]^A[e>>>8&255]^M[e>>>16&255]^I[e>>>24&255]}}for(;o<e;o++)n=n>>>8^I[255&(n^t[o])];this.o=n}get(){return~this.o}}class U extends h{constructor(){let t;const n=new F;super({transform(t,e){n.append(t),e.enqueue(t)},flush(){const e=new c(4);new u(e.buffer).setUint32(0,n.get()),t.value=e}}),t=this}}function B(t,n){const e=new c(t.length+n.length);return e.set(t),e.set(n,t.length),e}function W(t){return new u(t.buffer,t.byteOffset,t.byteLength)}const O=64,V=20,K=new c([128]),T=new c(1),_=new i([1732584193,4023233417,2562383102,271733878,3285377520]),j=new c(256),H=new i(256),L=new i(256),Z=new i(256),N=new i(256);let q=!1;function G(t,n){!function(){if(!q){let t=1,n=1;do{t=255&(t^t<<1^(128&t?27:0)),n=255&(n^n<<1),n=255&(n^n<<2),n=255&(n^n<<4),128&n&&(n^=9),j[t]=255&(n^(n<<1|n>>7)^(n<<2|n>>6)^(n<<3|n>>5)^(n<<4|n>>4)^99)}while(1!=t);j[0]=99;for(let t=0;t<256;t++){const n=j[t],e=Y(n),o=e<<24|n<<16|n<<8|e^n;H[t]=o,L[t]=o>>>8|o<<24,Z[t]=o>>>16|o<<16,N[t]=o>>>24|o<<8}q=!0}}();const e=new i(60),o=function(t,n){const e=t.length>>2,o=e+6,r=4*(o+1);let c=1;for(let o=0;o<e;o++)n[o]=t[4*o]<<24|t[4*o+1]<<16|t[4*o+2]<<8|t[4*o+3];for(let t=e;t<r;t++){let o=n[t-1];t%e==0?(o=Q(o<<8|o>>>24)^c<<24,c=Y(c)):e>6&&t%e==4&&(o=Q(o)),n[t]=n[t-e]^o}return o}(t,e),r=new i(4),c=J(n);let s=0,a=0,f=0,w=0;return{process(t,n){n&&c.update(t,0,t.length),function(t){const n=new u(t.buffer,t.byteOffset,t.byteLength),e=t.length;let o=0;for(;o+16<=e;o+=16)l(),n.setInt32(o,n.getInt32(o)^r[0]),n.setInt32(o+4,n.getInt32(o+4)^r[1]),n.setInt32(o+8,n.getInt32(o+8)^r[2]),n.setInt32(o+12,n.getInt32(o+12)^r[3]);if(o<e){l();for(let n=0;o<e;o++,n++)t[o]^=r[n>>2]>>>24-8*(3&n)}}(t),n||c.update(t,0,t.length)},digest:()=>c.digest()};function l(){s=s+1|0,s||(a=a+1|0,a||(f=f+1|0,f||(w=w+1|0)));let t=X(s)^e[0],n=X(a)^e[1],c=X(f)^e[2],i=X(w)^e[3],u=H[t>>>24]^L[n>>>16&255]^Z[c>>>8&255]^N[255&i]^e[4],l=H[n>>>24]^L[c>>>16&255]^Z[i>>>8&255]^N[255&t]^e[5],d=H[c>>>24]^L[i>>>16&255]^Z[t>>>8&255]^N[255&n]^e[6],p=H[i>>>24]^L[t>>>16&255]^Z[n>>>8&255]^N[255&c]^e[7];t=H[u>>>24]^L[l>>>16&255]^Z[d>>>8&255]^N[255&p]^e[8],n=H[l>>>24]^L[d>>>16&255]^Z[p>>>8&255]^N[255&u]^e[9],c=H[d>>>24]^L[p>>>16&255]^Z[u>>>8&255]^N[255&l]^e[10],i=H[p>>>24]^L[u>>>16&255]^Z[l>>>8&255]^N[255&d]^e[11],u=H[t>>>24]^L[n>>>16&255]^Z[c>>>8&255]^N[255&i]^e[12],l=H[n>>>24]^L[c>>>16&255]^Z[i>>>8&255]^N[255&t]^e[13],d=H[c>>>24]^L[i>>>16&255]^Z[t>>>8&255]^N[255&n]^e[14],p=H[i>>>24]^L[t>>>16&255]^Z[n>>>8&255]^N[255&c]^e[15],t=H[u>>>24]^L[l>>>16&255]^Z[d>>>8&255]^N[255&p]^e[16],n=H[l>>>24]^L[d>>>16&255]^Z[p>>>8&255]^N[255&u]^e[17],c=H[d>>>24]^L[p>>>16&255]^Z[u>>>8&255]^N[255&l]^e[18],i=H[p>>>24]^L[u>>>16&255]^Z[l>>>8&255]^N[255&d]^e[19],u=H[t>>>24]^L[n>>>16&255]^Z[c>>>8&255]^N[255&i]^e[20],l=H[n>>>24]^L[c>>>16&255]^Z[i>>>8&255]^N[255&t]^e[21],d=H[c>>>24]^L[i>>>16&255]^Z[t>>>8&255]^N[255&n]^e[22],p=H[i>>>24]^L[t>>>16&255]^Z[n>>>8&255]^N[255&c]^e[23],t=H[u>>>24]^L[l>>>16&255]^Z[d>>>8&255]^N[255&p]^e[24],n=H[l>>>24]^L[d>>>16&255]^Z[p>>>8&255]^N[255&u]^e[25],c=H[d>>>24]^L[p>>>16&255]^Z[u>>>8&255]^N[255&l]^e[26],i=H[p>>>24]^L[u>>>16&255]^Z[l>>>8&255]^N[255&d]^e[27],u=H[t>>>24]^L[n>>>16&255]^Z[c>>>8&255]^N[255&i]^e[28],l=H[n>>>24]^L[c>>>16&255]^Z[i>>>8&255]^N[255&t]^e[29],d=H[c>>>24]^L[i>>>16&255]^Z[t>>>8&255]^N[255&n]^e[30],p=H[i>>>24]^L[t>>>16&255]^Z[n>>>8&255]^N[255&c]^e[31],t=H[u>>>24]^L[l>>>16&255]^Z[d>>>8&255]^N[255&p]^e[32],n=H[l>>>24]^L[d>>>16&255]^Z[p>>>8&255]^N[255&u]^e[33],c=H[d>>>24]^L[p>>>16&255]^Z[u>>>8&255]^N[255&l]^e[34],i=H[p>>>24]^L[u>>>16&255]^Z[l>>>8&255]^N[255&d]^e[35],u=H[t>>>24]^L[n>>>16&255]^Z[c>>>8&255]^N[255&i]^e[36],l=H[n>>>24]^L[c>>>16&255]^Z[i>>>8&255]^N[255&t]^e[37],d=H[c>>>24]^L[i>>>16&255]^Z[t>>>8&255]^N[255&n]^e[38],p=H[i>>>24]^L[t>>>16&255]^Z[n>>>8&255]^N[255&c]^e[39];let h=40;o>10&&(t=H[u>>>24]^L[l>>>16&255]^Z[d>>>8&255]^N[255&p]^e[40],n=H[l>>>24]^L[d>>>16&255]^Z[p>>>8&255]^N[255&u]^e[41],c=H[d>>>24]^L[p>>>16&255]^Z[u>>>8&255]^N[255&l]^e[42],i=H[p>>>24]^L[u>>>16&255]^Z[l>>>8&255]^N[255&d]^e[43],u=H[t>>>24]^L[n>>>16&255]^Z[c>>>8&255]^N[255&i]^e[44],l=H[n>>>24]^L[c>>>16&255]^Z[i>>>8&255]^N[255&t]^e[45],d=H[c>>>24]^L[i>>>16&255]^Z[t>>>8&255]^N[255&n]^e[46],p=H[i>>>24]^L[t>>>16&255]^Z[n>>>8&255]^N[255&c]^e[47],h=48),o>12&&(t=H[u>>>24]^L[l>>>16&255]^Z[d>>>8&255]^N[255&p]^e[48],n=H[l>>>24]^L[d>>>16&255]^Z[p>>>8&255]^N[255&u]^e[49],c=H[d>>>24]^L[p>>>16&255]^Z[u>>>8&255]^N[255&l]^e[50],i=H[p>>>24]^L[u>>>16&255]^Z[l>>>8&255]^N[255&d]^e[51],u=H[t>>>24]^L[n>>>16&255]^Z[c>>>8&255]^N[255&i]^e[52],l=H[n>>>24]^L[c>>>16&255]^Z[i>>>8&255]^N[255&t]^e[53],d=H[c>>>24]^L[i>>>16&255]^Z[t>>>8&255]^N[255&n]^e[54],p=H[i>>>24]^L[t>>>16&255]^Z[n>>>8&255]^N[255&c]^e[55],h=56),r[0]=(j[u>>>24]<<24|j[l>>>16&255]<<16|j[d>>>8&255]<<8|j[255&p])^e[h],r[1]=(j[l>>>24]<<24|j[d>>>16&255]<<16|j[p>>>8&255]<<8|j[255&u])^e[h+1],r[2]=(j[d>>>24]<<24|j[p>>>16&255]<<16|j[u>>>8&255]<<8|j[255&l])^e[h+2],r[3]=(j[p>>>24]<<24|j[u>>>16&255]<<16|j[l>>>8&255]<<8|j[255&d])^e[h+3]}}function J(t){const n=function(){const t=new i(_),n=new i(16),e=new c(O),r=new u(e.buffer),s=new c(8);let a=0,f=0;return{update:w,digest:function(){const n=8*f,e=o.floor(n/4294967296),r=n>>>0;for(w(K,0,1);56!=a;)w(T,0,1);s[0]=e>>>24,s[1]=e>>>16,s[2]=e>>>8,s[3]=e,s[4]=r>>>24,s[5]=r>>>16,s[6]=r>>>8,s[7]=r,w(s,0,8);const i=new c(V),l=new u(i.buffer);for(let n=0;n<t.length;n++)l.setInt32(4*n,t[n]);return t.set(_),a=0,f=0,i}};function w(t,n,o){const c=n+o;if(f+=o,a){for(;n<c&&a<O;)e[a++]=t[n++];a==O&&(l(r,0),a=0)}if(n+O<=c){const e=new u(t.buffer,t.byteOffset,t.byteLength);for(;n+O<=c;n+=O)l(e,n)}for(;n<c;)e[a++]=t[n++]}function l(e,o){for(let t=0;t<16;t++)n[t]=e.getInt32(o+4*t);let r,c=t[0],s=t[1],a=t[2],i=t[3],f=t[4];for(let t=0;t<15;t+=5)f=(c<<5|c>>>27)+((a^i)&s^i)+f+1518500249+n[t]|0,s=s<<30|s>>>2,i=(f<<5|f>>>27)+((s^a)&c^a)+i+1518500249+n[t+1]|0,c=c<<30|c>>>2,a=(i<<5|i>>>27)+((c^s)&f^s)+a+1518500249+n[t+2]|0,f=f<<30|f>>>2,s=(a<<5|a>>>27)+((f^c)&i^c)+s+1518500249+n[t+3]|0,i=i<<30|i>>>2,c=(s<<5|s>>>27)+((i^f)&a^f)+c+1518500249+n[t+4]|0,a=a<<30|a>>>2;f=(c<<5|c>>>27)+((a^i)&s^i)+f+1518500249+n[15]|0,s=s<<30|s>>>2,r=n[13]^n[8]^n[2]^n[0],r=r<<1|r>>>31,n[0]=r,i=(f<<5|f>>>27)+((s^a)&c^a)+i+1518500249+r|0,c=c<<30|c>>>2,r=n[14]^n[9]^n[3]^n[1],r=r<<1|r>>>31,n[1]=r,a=(i<<5|i>>>27)+((c^s)&f^s)+a+1518500249+r|0,f=f<<30|f>>>2,r=n[15]^n[10]^n[4]^n[2],r=r<<1|r>>>31,n[2]=r,s=(a<<5|a>>>27)+((f^c)&i^c)+s+1518500249+r|0,i=i<<30|i>>>2,r=n[0]^n[11]^n[5]^n[3],r=r<<1|r>>>31,n[3]=r,c=(s<<5|s>>>27)+((i^f)&a^f)+c+1518500249+r|0,a=a<<30|a>>>2;for(let t=20;t<40;t+=5)r=n[t-3&15]^n[t-8&15]^n[t-14&15]^n[15&t],r=r<<1|r>>>31,n[15&t]=r,f=(c<<5|c>>>27)+(s^a^i)+f+1859775393+r|0,s=s<<30|s>>>2,r=n[t-2&15]^n[t-7&15]^n[t-13&15]^n[t+1&15],r=r<<1|r>>>31,n[t+1&15]=r,i=(f<<5|f>>>27)+(c^s^a)+i+1859775393+r|0,c=c<<30|c>>>2,r=n[t-1&15]^n[t-6&15]^n[t-12&15]^n[t+2&15],r=r<<1|r>>>31,n[t+2&15]=r,a=(i<<5|i>>>27)+(f^c^s)+a+1859775393+r|0,f=f<<30|f>>>2,r=n[15&t]^n[t-5&15]^n[t-11&15]^n[t+3&15],r=r<<1|r>>>31,n[t+3&15]=r,s=(a<<5|a>>>27)+(i^f^c)+s+1859775393+r|0,i=i<<30|i>>>2,r=n[t+1&15]^n[t-4&15]^n[t-10&15]^n[t+4&15],r=r<<1|r>>>31,n[t+4&15]=r,c=(s<<5|s>>>27)+(a^i^f)+c+1859775393+r|0,a=a<<30|a>>>2;for(let t=40;t<60;t+=5)r=n[t-3&15]^n[t-8&15]^n[t-14&15]^n[15&t],r=r<<1|r>>>31,n[15&t]=r,f=(c<<5|c>>>27)+(s&a|(s|a)&i)+f+2400959708+r|0,s=s<<30|s>>>2,r=n[t-2&15]^n[t-7&15]^n[t-13&15]^n[t+1&15],r=r<<1|r>>>31,n[t+1&15]=r,i=(f<<5|f>>>27)+(c&s|(c|s)&a)+i+2400959708+r|0,c=c<<30|c>>>2,r=n[t-1&15]^n[t-6&15]^n[t-12&15]^n[t+2&15],r=r<<1|r>>>31,n[t+2&15]=r,a=(i<<5|i>>>27)+(f&c|(f|c)&s)+a+2400959708+r|0,f=f<<30|f>>>2,r=n[15&t]^n[t-5&15]^n[t-11&15]^n[t+3&15],r=r<<1|r>>>31,n[t+3&15]=r,s=(a<<5|a>>>27)+(i&f|(i|f)&c)+s+2400959708+r|0,i=i<<30|i>>>2,r=n[t+1&15]^n[t-4&15]^n[t-10&15]^n[t+4&15],r=r<<1|r>>>31,n[t+4&15]=r,c=(s<<5|s>>>27)+(a&i|(a|i)&f)+c+2400959708+r|0,a=a<<30|a>>>2;for(let t=60;t<80;t+=5)r=n[t-3&15]^n[t-8&15]^n[t-14&15]^n[15&t],r=r<<1|r>>>31,n[15&t]=r,f=(c<<5|c>>>27)+(s^a^i)+f+3395469782+r|0,s=s<<30|s>>>2,r=n[t-2&15]^n[t-7&15]^n[t-13&15]^n[t+1&15],r=r<<1|r>>>31,n[t+1&15]=r,i=(f<<5|f>>>27)+(c^s^a)+i+3395469782+r|0,c=c<<30|c>>>2,r=n[t-1&15]^n[t-6&15]^n[t-12&15]^n[t+2&15],r=r<<1|r>>>31,n[t+2&15]=r,a=(i<<5|i>>>27)+(f^c^s)+a+3395469782+r|0,f=f<<30|f>>>2,r=n[15&t]^n[t-5&15]^n[t-11&15]^n[t+3&15],r=r<<1|r>>>31,n[t+3&15]=r,s=(a<<5|a>>>27)+(i^f^c)+s+3395469782+r|0,i=i<<30|i>>>2,r=n[t+1&15]^n[t-4&15]^n[t-10&15]^n[t+4&15],r=r<<1|r>>>31,n[t+4&15]=r,c=(s<<5|s>>>27)+(a^i^f)+c+3395469782+r|0,a=a<<30|a>>>2;t[0]=t[0]+c|0,t[1]=t[1]+s|0,t[2]=t[2]+a|0,t[3]=t[3]+i|0,t[4]=t[4]+f|0}}(),e=new c(O),r=new c(O);t.length>O&&(n.update(t,0,t.length),t=n.digest());for(let n=0;n<O;n++){const o=n<t.length?t[n]:0;e[n]=54^o,r[n]=92^o}return n.update(e,0,O),{update(t,e,o){n.update(t,e,o)},digest(){const t=n.digest();n.update(r,0,O),n.update(t,0,V);const o=n.digest();return n.update(e,0,O),o}}}function Q(t){return j[t>>>24]<<24|j[t>>>16&255]<<16|j[t>>>8&255]<<8|j[255&t]}function X(t){return t<<24|(65280&t)<<8|t>>>8&65280|t>>>24}function Y(t){return 255&(t<<1^27*(t>>7))}const $=typeof d!=b&&typeof d.getRandomValues==k,tt="Invalid password",nt="zipjs-abort-check-password";function et(t){if($)return d.getRandomValues(t);throw new r("Crypto API not supported")}const ot={name:"PBKDF2"},rt=n.assign({hash:{name:"HMAC"}},ot),ct=n.assign({iterations:1e3,hash:{name:"SHA-1"}},ot),st=["deriveBits"],at=[8,12,16],it=[16,24,32],ft=10,ut=typeof d!=b,wt=ut&&d.subtle;let lt=ut&&typeof wt!=b&&typeof wt.importKey==k&&typeof wt.deriveBits==k,dt=G;class pt extends h{constructor({password:t,rawPassword:n,encryptionStrength:e,checkPasswordOnly:o,checkAuthenticationCode:s=!0}){const a={};super({start(){yt(a,t,n,e)},async transform(t,n){const{password:e,strength:s,l:i,ready:f}=a;if(e?(await async function(t,n,e,o){const c=await vt(t,n,e,kt(o,0,at[n])),s=kt(o,at[n]);if(c[0]!=s[0]||c[1]!=s[1])throw gt(t),new r(tt)}(a,s,e,kt(t,0,at[s]+2)),t=kt(t,at[s]+2),o?(gt(a),n.error(new r(nt))):i()):await f,a.h)return;const u=new c(t.length-ft-(t.length-ft)%16);n.enqueue(St(a,t,u,0,ft,!0))},async flush(t){const{m:n,S:e,ready:o}=a;if(n){if(await o,a.h)return;const i=kt(e,e.length-ft),f=new c(kt(e,0,e.length-ft));n.process(f,!0);const u=n.digest();let w=e.length<ft?1:0;for(let t=0;t<ft;t++)w|=u[t]^i[t];if(w&&s)return void t.error(new r("Invalid authentication code"));t.enqueue(f)}}}),mt(this,a)}}class ht extends h{constructor({password:t,rawPassword:n,encryptionStrength:e}){const o={};super({start(){yt(o,t,n,e)},async transform(t,n){const{password:e,strength:r,l:s,ready:a}=o;let i=z;if(e?(i=await async function(t,n,e){const o=et(new c(at[n]));return B(o,await vt(t,n,e,o))}(o,r,e),s()):await a,o.h)return;const f=new c(i.length+t.length-t.length%16);f.set(i,0),n.enqueue(St(o,t,f,i.length,0,!1))},async flush(t){const{m:n,S:e,ready:r}=o;if(n){if(await r,o.h)return;const s=new c(e);n.process(s,!1);const a=kt(n.digest(),0,ft);t.enqueue(B(s,a))}}}),mt(this,o)}}function yt(t,e,o,r){n.assign(t,{ready:new w(n=>t.l=n),password:bt(e,o),strength:r-1,S:z,h:!1})}function mt(t,e){const o=t.readable.getReader(),r=new y({async pull(t){try{const{value:n,done:e}=await o.read();e?t.close():t.enqueue(n)}catch(t){throw gt(e),o.cancel(t).catch(()=>{}),t}},cancel:t=>(gt(e),o.cancel(t))});n.defineProperty(t,"readable",{get:()=>r})}function St(t,n,e,o,r,s){const{m:a,S:i}=t;i.length&&(n=B(i,n));const f=n.length-r,u=f-f%16;if(e=function(t,n){if(n&&n>t.length){const e=t;(t=new c(n)).set(e,0)}return t}(e,o+u),u){const t=kt(e,o,o+u);t.set(kt(n,0,u)),a.process(t,s)}return t.S=kt(n,u),e}function gt(t){const{m:n}=t;t.h=!0,n&&n.dispose&&n.dispose()}async function vt(t,e,r,s){t.password=null;const a=it[e],i=await async function(t,e,r){if(lt)try{const o=await wt.importKey("raw",t,rt,!1,st);return new c(await wt.deriveBits(n.assign({salt:e},ct),o,8*r))}catch{lt=!1}return function(t,n,e,r){const s=J(t),a=new c(r),i=new c(n.length+4),f=new u(i.buffer);i.set(n);for(let t=1,e=0;e<r;t++,e+=V){f.setUint32(n.length,t),s.update(i,0,i.length);let c=s.digest();const u=c.slice();for(let t=1;t<1e3;t++){s.update(c,0,V),c=s.digest();for(let t=0;t<V;t++)u[t]^=c[t]}a.set(u.subarray(0,o.min(V,r-e)),e)}return a}(t,e,0,r)}(r,s,2*a+2);return t.m=dt(kt(i,0,a),kt(i,a,2*a)),t.h&&gt(t),kt(i,2*a)}function bt(t,n){return n===v?function(t){if(typeof l==b){t=unescape(encodeURIComponent(t));const n=new c(t.length);for(let e=0;e<n.length;e++)n[e]=t.charCodeAt(e);return n}return(new l).encode(t)}(t):n}function kt(t,n,e){return t.subarray(n,e)}class zt extends h{constructor({password:t,rawPassword:n,passwordVerification:e,checkPasswordOnly:o}){super({start(){It(this,t,n,e)},transform(t,n){const e=this;if(e.password||e.rawPassword){const n=Mt(e,t.subarray(0,12));if(e.password=e.rawPassword=null,0!=(n[11]^e.passwordVerification))throw new r(tt);t=t.subarray(12)}o?n.error(new r(nt)):n.enqueue(Mt(e,t))}})}}class Ct extends h{constructor({password:t,rawPassword:n,passwordVerification:e}){super({start(){It(this,t,n,e)},transform(t,n){const e=this;let o,r;if(e.password||e.rawPassword){e.password=e.rawPassword=null;const n=et(new c(12));n[11]=e.passwordVerification,o=new c(t.length+n.length),o.set(At(e,n),0),r=12}else o=new c(t.length),r=0;o.set(At(e,t),r),n.enqueue(o)}})}}function It(t,e,o,r){n.assign(t,{password:e,rawPassword:o,passwordVerification:r}),function(t,e,o){const r=[305419896,591751049,878082192];if(n.assign(t,{v:r,C:new F(r[0]),I:new F(r[2])}),o)for(let n=0;n<o.length;n++)Et(t,o[n]);else for(let n=0;n<e.length;n++)Et(t,e.charCodeAt(n))}(t,e,o)}function Mt(t,n){const e=new c(n.length);for(let o=0;o<n.length;o++)e[o]=Rt(t)^n[o],Et(t,e[o]);return e}function At(t,n){const e=new c(n.length);for(let o=0;o<n.length;o++)e[o]=Rt(t)^n[o],Et(t,n[o]);return e}function Et(t,n){let[,e]=t.v;t.C.append([n]);const r=~t.C.get();e=Pt(o.imul(Pt(e+xt(r)),134775813)+1),t.I.append([e>>>24]);const c=~t.I.get();t.v=[r,e,c]}function Rt(t){const n=2|t.v[2];return xt(o.imul(n,1^n)>>>8)}function xt(t){return 255&t}function Pt(t){return 4294967295&t}function Dt(t){return Boolean(t)&&"object"==typeof t}const Ft=new f;function Ut(t){return Ft.get(t)}const Bt="Invalid uncompressed size",Wt="Codec out of memory",Ot="Invalid CRC32",Vt="deflate-raw",Kt="gzip",Tt=[31,139,8];class _t extends h{constructor(t,{chunkSize:n,CompressionStreamFallback:e,CompressionStream:o}){super({});const{compressed:r,encrypted:c,useCompressionStream:s,zipCrypto:a,computeCrc32:i,level:f,deflate64:w,format:l,compressionMethod:d,inputSize:p}=t,h=this;let y,m,S,g=super.readable;const v=l&&Ut(l),b=qt(s,o,e),k=i&&r&&!w&&!v&&(!c||a)&&Boolean(b);if(c&&!a||!i||k||(y=new U,g=Jt(g,y)),r)if(v)g=Qt(g,Nt(v.CompressionStream,l,{level:f,chunkSize:n,compressionMethod:d,uncompressedSize:p}));else if(k)S=new jt,g=Qt(g,new b(Kt,{level:f,chunkSize:n})),g=Jt(g,S);else try{g=Gt(g,s,{level:f,chunkSize:n},o,e)}catch(t){if(!s&&e)throw nn(t);let n;try{n=new o(Kt)}catch{throw nn(t)}g=Qt(g,n),g=Jt(g,new jt)}c&&(a?g=Jt(g,new Ct(t)):(m=new ht(t),g=Jt(g,m))),Zt(h,g,()=>{c&&!a||!i||(h.crc32=k?S.crc32:new u(y.value.buffer).getUint32(0))})}}class jt extends h{constructor(){let t,n=10,e=new c(0);super({transform(t,r){if(n){const e=o.min(n,t.length);if(n-=e,!(t=t.subarray(e)).length)return}const c=e.length+t.length;if(c<=8)return void(e=B(e,t));const s=c-8,a=o.min(s,e.length);r.enqueue(B(e.subarray(0,a),t.subarray(0,s-a))),e=B(e.subarray(a),t.subarray(s-a))},flush(){const n=W(e);t.crc32=n.getUint32(0,!0),t.uncompressedSize=n.getUint32(4,!0)}}),t=this}}class Ht extends h{constructor(t,{chunkSize:n,DecompressionStreamFallback:e,DecompressionStream:o}){super({});const{zipCrypto:s,encrypted:a,checkCrc32:i,crc32:f,compressed:l,useCompressionStream:d,deflate64:p,format:h,compressionMethod:m,rawBitFlag:S,outputSize:g}=t;let b,k,z,C=super.readable;if(a&&(s?C=Jt(C,new zt(t)):(k=new pt(t),C=Jt(C,k))),l){const t=new Set,s=h&&Ut(h);let a;if(s)C=Qt(C,Nt(s.DecompressionStream,h,{chunkSize:n,compressionMethod:m,rawBitFlag:S,uncompressedSize:g}),t);else{const r=qt(d,o,e);if(i&&!p&&f!==v&&g!==v&&r)try{a=new r(Kt,{chunkSize:n})}catch{a=v}if(!a)try{C=Gt(C,d,{chunkSize:n,deflate64:p},o,e,t)}catch(t){if(p||g===v||!d&&e)throw nn(t);try{a=new o(Kt)}catch{throw nn(t)}}}a?(z=!0,C=function(t,n,e,o,s){const a=n.writable.getWriter(),i=n.readable.getReader(),f=o===v?new F:v;let u,l,d=0,p=!1,h=!1;const m=new y({start(t){l=t},pull(){b()},cancel:t=>(h=!0,b(),i.cancel(t))});return async function(){const n=t.getReader();try{const t=new c(10);for(t.set(Tt),await a.write(t);;){await g(),await a.ready;const{value:t,done:e}=await $t(n,s);if(e)break;await a.write(t)}f&&await a.write(new c(0));const r=new c(8),i=W(r);i.setUint32(0,f?f.get():o,!0),i.setUint32(4,e,!0),p=!0,await a.write(r),await a.close()}catch(t){await Xt(a,t),await Yt(n,t)}}(),async function(){try{for(;;){const{value:t,done:n}=await S();if(n)break;if(d+=t.length,d>e)throw new r(Bt);f&&f.append(t),l.enqueue(t)}h||(h=!0,l.close())}catch(t){!function(t){h||(h=!0,l.error(t),b())}(t),await Yt(i,t)}}(),m;function S(){return i.read().catch(t=>{if(p){if(!f)throw on(t,Ot);if(d!=e)throw on(t,Bt);return{done:!0}}throw tn(t,s)})}function g(){if(!h&&l.desiredSize<=0)return new w(t=>u=t)}function b(){if(u){const t=u;u=v,t()}}}(C,a,g,f,t)):C=function(t,n){const e=t.getReader();return new y({async pull(t){try{const{value:n,done:o}=await e.read();o?t.close():t.enqueue(n)}catch(t){throw await Yt(e,t),tn(t,n)}},cancel:t=>e.cancel(t)})}(C,t)}i&&!z&&(b=new U,C=Jt(C,b)),Zt(this,C,()=>{if(b){const t=new u(b.value.buffer).getUint32(0,!1);if(f!=t)throw new r(Ot)}})}}const Lt=new f;function Zt(t,e,o){e=Jt(e,new h({flush:o})),n.defineProperty(t,"readable",{get:()=>e})}function Nt(t,n,e){if(!t)throw new r("Compression method not supported");return new t(n,e)}function qt(t,n,e){return t&&n?n:e&&e.requiresModule?e:void 0}function Gt(t,n,e,o,r,c){const s=n&&o?o:r||o,a=e.deflate64?"deflate64-raw":Vt;let i;try{i=new s(a,e)}catch(t){if(!n||!r||s==r)throw t;i=new r(a,e)}return Qt(t,i,c)}function Jt(t,n){return function(t){if(t instanceof y)return t;const n=t.getReader();return new y({async pull(t){try{const{value:e,done:o}=await n.read();o?t.close():t.enqueue(e)}catch(t){throw n.cancel(t).catch(()=>{}),t}},cancel:t=>n.cancel(t)})}(t).pipeThrough(n)}function Qt(t,n,e){const o=n.writable.getWriter(),r=t.getReader();return async function(){try{for(;;){await o.ready;const t=await $t(r,e);if(t.done){await o.close();break}await o.write(t.value)}}catch(t){await Xt(o,t),await Yt(r,t)}}(),n.readable}async function Xt(t,n){try{await t.abort(n)}catch{}}async function Yt(t,n){try{await t.cancel(n)}catch{}}function $t(t,n){const e=t.read();return n?e.catch(t=>{throw n.add(t),t}):e}function tn(t,n){return n.has(t)?t:on(t,en(t)?Wt:"Invalid compressed data")}function nn(t){return en(t)?on(t,Wt):t}function en(t){return Dt(t)&&"Z_MEM_ERROR"==t.code}function on(t,n){const e=new r(n);return e.cause=t,e}const rn="data",cn="deflate";class sn extends h{constructor(t,e){super({});const o=this,{codecType:c}=t;let s;c.startsWith(cn)?s=_t:c.startsWith("inflate")&&(s=Ht),o.outputSize=0;let a=0;const i=new s(t,e),f=super.readable,u=new h({transform(t,n){t&&t.length&&(a+=t.length,n.enqueue(t))},flush(){n.assign(o,{inputSize:a})}}),w=new h({transform(n,e){if(n&&n.length&&(e.enqueue(n),o.outputSize+=n.length,t.outputSize!==v&&o.outputSize>t.outputSize))throw new r(Bt)},flush(){const{crc32:t}=i;n.assign(o,{crc32:t,inputSize:a})}});n.defineProperty(o,"readable",{get:()=>f.pipeThrough(u).pipeThrough(i).pipeThrough(w)})}}class an extends h{constructor(t){const o=[];let r=0,s=0;function a(){const n=new c(t);let e=0;for(;e<t;){const r=o[0],c=t-e;r.length<=c?(n.set(r,e),e+=r.length,o.shift()):(n.set(r.subarray(0,c),e),o[0]=r.subarray(c),e+=c)}return r-=t,n}(!e.isFinite(t)||t<1)&&(t=262144),super({transform(n,e){for(o.push(n),r+=n.length;r>t;)s+=t,e.enqueue(a())},flush(t){r&&(s+=r,t.enqueue(function(t,n){const e=new c(n);let o=0;for(const n of t)e.set(n,o),o+=n.length;return e}(o,r)))}}),n.defineProperty(this,"outputSize",{get:()=>s})}}let fn=2;try{typeof navigator!=b&&navigator.hardwareConcurrency&&(fn=navigator.hardwareConcurrency)}catch{}const un=new f,wn=new f,ln=function(){try{return structuredClone(new r)instanceof r}catch{return!1}}();let dn=0;async function pn(t){let n,c,s;try{const{options:a,config:i}=t;if(a.format)try{await async function(t,n){!Ft.has(t)&&n&&function(t,n){const{CompressionStream:e,DecompressionStream:o}=n;if(typeof e!=k&&typeof o!=k)throw new r("Invalid codec module");Ft.set(t,{CompressionStream:e,DecompressionStream:o})}(t,await(import(n)))}(a.format,a.codecURI)}catch(t){if(Dt(t))try{t.codecImportFailed=!0}catch{}throw t}if(i.CompressionStream=self.CompressionStream,i.DecompressionStream=self.DecompressionStream,a.compressed&&!a.format)if(a.useCompressionStream){if(!function(t,n){if(!t)return!1;let e=Lt.get(t);e||(e=new f,Lt.set(t,e));let o=e.get(n);if(o===v){try{new t(n),o=!0}catch{o=!1}e.set(n,o)}return o}(a.codecType.startsWith(cn)?i.CompressionStream:i.DecompressionStream,Vt))try{await self.initModule(t.config)}catch{}}else try{await self.initModule(t.config)}catch{a.useCompressionStream=!0}if(a.encrypted&&!a.zipCrypto)try{await self.initModule(t.config)}catch{}!i.CompressionStreamFallback&&i.CompressionStreamZlib&&(i.CompressionStreamFallback=i.CompressionStreamZlib),!i.DecompressionStreamFallback&&i.DecompressionStreamZlib&&(i.DecompressionStreamFallback=i.DecompressionStreamZlib);const u={highWaterMark:1},l=new y({async pull(t){const n=new w(t=>un.set(dn,t));hn({type:"pull",messageId:dn}),dn=(dn+1)%e.MAX_SAFE_INTEGER;const{value:o,done:r}=await n;t.enqueue(o),r&&t.close()}},u);s=new m({async write(t){let n;const o=new w(t=>n=t);wn.set(dn,n),hn({type:rn,value:t,messageId:dn}),dn=(dn+1)%e.MAX_SAFE_INTEGER,await o}},u),n=new sn(a,i),c=new an(function(t){return r="string"==typeof(n=r=t.chunkSize)&&n.trim()?e(n):n,e.isInteger(r)&&r>=1?o.max(r,64):262144;var n,r}(i)),await l.pipeThrough(n).pipeThrough(c).pipeTo(s,{preventClose:!0,preventAbort:!0}),await s.getWriter().close();const{crc32:d,inputSize:p,outputSize:h}=n;hn({type:"close",result:{crc32:d,inputSize:p,outputSize:h}})}catch(t){const n=c?c.outputSize:0;if(Dt(t))try{t.outputSize=n}catch{}if(s&&!s.locked)try{await s.getWriter().close()}catch{}yn(t,n)}}function hn(t){const{value:n}=t;if(n)if(n.length)try{t.value=(e=n,e.byteOffset||e.byteLength!=e.buffer.byteLength?new c(e):e).buffer,p(t,[t.value])}catch{p(t)}else p(t);else p(t);var e}function yn(t,n){const{message:e,stack:o,code:c,name:s,outputSize:a,cause:i,codecImportFailed:f}=function(t=new r("Unknown error")){return Dt(t)?t:new r(String(t))}(t),u={message:e,stack:o,code:c,name:s,outputSize:a===v?n:a};if(Dt(i)&&(u.cause={name:i.name,message:i.message,code:i.code}),f&&(u.codecImportFailed=!0),ln)try{return void p({error:u,errorValue:{value:t}})}catch{}p({error:u})}addEventListener("message",({data:t})=>{const{type:n,messageId:e,value:o,done:r}=t;try{if("start"==n&&pn(t),n==rn){const t=un.get(e);un.delete(e),t({value:o||new c,done:r})}if("ack"==n){const t=wn.get(e);wn.delete(e),t()}}catch(t){yn(t)}}),p({type:"ready"});const mn="deflate",Sn="deflate-raw",gn="deflate64-raw",vn="gzip",bn=[mn,Sn,vn],kn=[mn,Sn,vn,gn];let zn,Cn,In,Mn,An;function En(t,n){return-4===n&&(t.code="Z_MEM_ERROR"),t}function Rn(t,n,e={}){if(!(t?bn:kn).includes(n))throw new TypeError("Unsupported format: "+n);if(!zn){const t=new r("WASM module not loaded");throw t.cause=An,t}const s="number"==typeof e.level?e.level:-1,a="number"==typeof e.outBuffer?e.outBuffer:65536,i="number"==typeof e.inBufferSize?e.inBufferSize:65536,f={M:0,in:0,inBufferSize:0,A:0,R:!1};let u,l,d,p,h=!0,S=!1;return function(){try{let e;if(f.M=Cn(a),f.in=Cn(i),f.inBufferSize=i,!f.M||!f.in)throw En(new r("allocation failed"),-4);if(t?(f.P=zn.deflate_process,f.D=zn.deflate_last_consumed,f.F=zn.deflate_end,f.A=zn.deflate_new(),e=n===vn?zn.deflate_init_gzip(f.A,s):n===Sn?zn.deflate_init_raw(f.A,s):zn.deflate_init(f.A,s)):n===gn?(f.P=zn.inflate9_process,f.D=zn.inflate9_last_consumed,f.F=zn.inflate9_end,f.A=zn.inflate9_new(),e=zn.inflate9_init_raw(f.A)):(f.P=zn.inflate_process,f.D=zn.inflate_last_consumed,f.F=zn.inflate_end,f.A=zn.inflate_new(),e=n===Sn?zn.inflate_init_raw(f.A):n===vn?zn.inflate_init_gzip(f.A):zn.inflate_init(f.A)),0!==e)throw En(new r("init failed:"+e),e)}catch(t){throw b(f),t}}(),{readable:new y({start(t){u=t},pull(){h=!1,v()},cancel(t){S=!0,p=t,b(f),l.error(t),v()}},{highWaterMark:0}),writable:new m({start(t){l=t},async write(t){if(h&&await new w(t=>d=t),S)throw p;try{!function(t){const n=new c(Mn.buffer),e=f.P,s=f.D,i=f.M;let u=0;for(;u<t.length;){if(f.R)throw new r("trailing data after the end of the stream");const c=o.min(t.length-u,32768);if((!f.in||f.inBufferSize<c)&&(f.in&&In&&(In(f.in),f.in=0),f.in=Cn(c),f.inBufferSize=c,!f.in))throw En(new r("allocation failed"),-4);n.set(t.subarray(u,u+c),f.in);const w=e(f.A,f.in,c,i,a,0),l=w>>24&255,d=128&l?l-256:l;if(d<0)throw En(new r("process error:"+d),d);const p=16777215&w;p&&g(n.slice(i,i+p));const h=s(f.A);if(1===l)f.R=!0;else if(0===h&&0===p)break;u+=h}}(t)}catch(t){throw b(f),u.error(t),t}},close(){if(S)return;try{!function(){const t=new c(Mn.buffer),n=f.P,e=f.M;for(;;){const o=n(f.A,0,0,e,a,4),c=o>>24&255,s=128&c?c-256:c;if(s<0)throw En(new r("process error:"+s),s);const i=16777215&o;if(i&&g(t.slice(e,e+i)),1===c||0===i)break}}()}catch(t){throw b(f),u.error(t),t}const t=b(f);if(0!==t){const n=En(new r("end error:"+t),t);throw u.error(n),n}u.close()},abort(t){b(f),u.error(t)}},{highWaterMark:1})};function g(t){h=!0,u.enqueue(t)}function v(){if(d){const t=d;d=null,t()}}function b(t){let n=0;return t.A&&t.F&&(n=t.F(t.A)),t.A=0,t.in&&In&&In(t.in),t.in=0,t.M&&In&&In(t.M),t.M=0,n}}class xn{constructor(t=mn,n){return Rn(!0,t,n)}}class Pn{constructor(t=mn,n){return Rn(!1,t,n)}}xn.requiresModule=!0,Pn.requiresModule=!0,xn.supportedFormats=bn,Pn.supportedFormats=kn;const Dn=65536;let Fn,Un;function Bn(t){return new c(t.memory.buffer)}let Wn=!1;!function(t={}){const{init:n,U:e}=t,o=t.CompressionStreamFallback||t.CompressionStreamZlib,r=t.DecompressionStreamFallback||t.DecompressionStreamZlib;e&&(dt=e||G),self.initModule=async t=>{n&&await n(t),o&&(t.CompressionStreamFallback=o),r&&(t.DecompressionStreamFallback=r)}}({CompressionStreamFallback:xn,DecompressionStreamFallback:Pn,U:function(t,n){const e=Fn;let o=e?function(t,n,e){Un||(Un=t.malloc(Dn));const o=Un?t.aes_hmac_new():0;if(o){const r=Bn(t);if(r.set(n,Un),r.set(e,Un+n.length),t.aes_hmac_init(o,Un,n.length,Un+n.length,e.length))return t.aes_hmac_end(o,0),0}return o}(e,t,n):0;if(!o)return G(t,n);const r=Un;return{process(t,n){for(let c=0;c<t.length;c+=Dn){const s=t.subarray(c,c+Dn),a=Bn(e);a.set(s,r),e.aes_hmac_process(o,r,s.length,n?1:0),s.set(a.subarray(r,r+s.length))}},digest:()=>(e.aes_hmac_end(o,r),o=0,Bn(e).slice(r,r+20)),dispose(){o&&(e.aes_hmac_end(o,0),o=0)}}},init:t=>async function(t,{baseURI:n}){if(!Wn)try{await async function(t,n){let e,o;try{try{o=new URL(t,n)}catch{}const r=await fetch(o);e=await r.arrayBuffer()}catch(n){if(!t.startsWith("data:application/wasm;base64,"))throw n;e=function(t){const n=t.split(",")[1],e=atob(n),o=e.length,r=new c(o);for(let t=0;t<o;++t)r[t]=e.charCodeAt(t);return r.buffer}(t)}const s=await WebAssembly.instantiate(e);var a;(function(t){if(zn=t,({malloc:Cn,free:In,memory:Mn}=zn),"function"!=typeof Cn||"function"!=typeof In||!Mn)throw zn=Cn=In=Mn=null,new r("Invalid WASM module")})(s.instance.exports),typeof(a=s.instance.exports).aes_hmac_new==k&&(Fn=a,Un=0)}(t,n),Wn=!0}catch(t){throw function(t){An=t}(t),t}}(t.wasmURI,t)})});\n';
  if ("string" == typeof r2 && (r2 = new TextEncoder().encode(r2)), t5) {
    const t6 = new Blob([r2], { type: e4 });
    return URL.createObjectURL(t6);
  }
  return "data:" + e4 + ";base64," + (function(t6) {
    let e5 = "";
    const r3 = t6.length;
    let o2 = 0;
    for (; o2 + 2 < r3; o2 += 3) {
      const r4 = t6[o2] << 16 | t6[o2 + 1] << 8 | t6[o2 + 2];
      e5 += n[r4 >> 18 & 63] + n[r4 >> 12 & 63] + n[r4 >> 6 & 63] + n[63 & r4];
    }
    const s2 = r3 - o2;
    if (1 === s2) {
      const r4 = t6[o2] << 16;
      e5 += n[r4 >> 18 & 63] + n[r4 >> 12 & 63] + "==";
    } else if (2 === s2) {
      const r4 = t6[o2] << 16 | t6[o2 + 1] << 8;
      e5 += n[r4 >> 18 & 63] + n[r4 >> 12 & 63] + n[r4 >> 6 & 63] + "=";
    }
    return e5;
  })(r2);
} });
init_configuration();
init_constants();
init_array();
init_error();
init_codec_stream();
init_codec_worker();
var MODULE_WORKER_OPTIONS = { type: "module" };
var ERROR_EVENT_TYPE = "error";
var MESSAGE_ERROR_EVENT_TYPE = "messageerror";
var ABORT_EVENT_TYPE = "abort";
var webWorkerSource;
var webWorkerURI;
var webWorkerOptions;
setWebWorkerBackend(createWebWorkerInterface);
function createWebWorkerInterface(workerData, config2) {
  const { baseURI, chunkSize, workerStartupTimeout } = config2;
  let { wasmURI } = config2;
  if (!workerData.interface) {
    if (typeof wasmURI == FUNCTION_TYPE) {
      wasmURI = wasmURI();
    }
    let worker;
    try {
      worker = getWebWorker(workerData.workerURI, baseURI, workerData);
    } catch {
      disableWebWorker(workerData);
      return createWorkerInterface(workerData, config2);
    }
    Object.assign(workerData, {
      worker,
      workerAlive: false,
      terminated: false,
      startupError: null,
      interface: {
        run: async () => {
          try {
            return await runWebWorker(workerData, { chunkSize, wasmURI, baseURI, workerStartupTimeout });
          } catch (error) {
            if (error && error.workerStartupFailed) {
              disableWebWorker(workerData);
              releaseWorkerStreams(workerData);
              return runWorker(workerData, config2);
            }
            if (error && error.codecImportFailed) {
              if (workerData.reader) {
                releaseWorkerStreams(workerData);
                return runWorker(workerData, config2);
              }
              workerData.onTaskFinished();
            }
            throw error;
          }
        }
      }
    });
  }
  return workerData.interface;
}
async function runWebWorker(workerData, config2) {
  if (!workerData.worker) {
    const { startupError } = workerData;
    workerData.startupError = null;
    const error = startupError || new Error(ERR_WORKER_STARTUP_TIMEOUT);
    error.workerStartupFailed = true;
    throw error;
  }
  let resolveResult, rejectResult;
  const result = new Promise((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = (error) => {
      const { outputSize, workerOptions } = workerData;
      workerOptions.outputSize = outputSize;
      if (isErrorObject(error)) {
        try {
          error.outputSize = outputSize;
        } catch {
        }
      }
      reject(error);
    };
  });
  Object.assign(workerData, {
    reader: null,
    writer: null,
    outputSize: 0,
    destinationFailed: false,
    destinationError: null,
    resolveResult,
    rejectResult,
    result
  });
  const { readable, options } = workerData;
  const { writable, closed, abortPipe } = watchClosedStream(workerData.writable, workerData);
  try {
    sendMessage({
      type: MESSAGE_START,
      options,
      config: config2
    }, workerData);
  } catch (error) {
    abortPipe();
    try {
      await closed;
    } catch {
    }
    workerData.onTaskFinished();
    throw error;
  }
  Object.assign(workerData, {
    reader: readable.getReader(),
    writer: writable.getWriter()
  });
  const { workerStartupTimeout } = config2;
  if (!workerData.workerAlive && Number.isFinite(workerStartupTimeout) && workerStartupTimeout >= 0) {
    workerData.startupTimeout = setTimeout(() => onStartupTimeout(workerData), workerStartupTimeout);
  }
  try {
    const resultValue = await result;
    await closeWritable();
    await closed;
    return resultValue;
  } catch (error) {
    await closeWritable();
    abortPipe();
    try {
      await closed;
    } catch {
    }
    const { outputSize, workerOptions, destinationFailed, destinationError } = workerData;
    workerOptions.outputSize = outputSize;
    const workerFailed = isErrorObject(error) && (error.codecImportFailed || error.workerStartupFailed);
    const reportedError = destinationFailed && !workerFailed ? destinationError : error;
    if (isErrorObject(reportedError)) {
      try {
        reportedError.outputSize = outputSize;
      } catch {
      }
    }
    throw reportedError;
  }
  async function closeWritable() {
    if (!writable.locked) {
      try {
        await writable.getWriter().close();
      } catch {
      }
    }
  }
}
function watchClosedStream(writableSource, workerData) {
  const abortController = new AbortController();
  let aborting;
  const { writable, readable } = new TransformStream({
    transform(chunk, controller) {
      workerData.outputSize += chunk.length;
      controller.enqueue(chunk);
    }
  });
  const closed = readable.pipeTo(writableSource, { preventClose: true, preventAbort: true, signal: abortController.signal });
  closed.catch((error) => {
    if (!aborting) {
      Object.assign(workerData, { destinationFailed: true, destinationError: error });
    }
  });
  const { signal } = workerData.workerOptions.streamOptions;
  if (signal) {
    const onAbort = () => abortController.abort(signal.reason);
    const removeAbortListener = () => signal.removeEventListener(ABORT_EVENT_TYPE, onAbort);
    signal.addEventListener(ABORT_EVENT_TYPE, onAbort);
    closed.then(removeAbortListener, removeAbortListener);
  }
  return {
    writable,
    closed,
    abortPipe: () => {
      aborting = true;
      abortController.abort();
    }
  };
}
function releaseWorkerStreams(workerData) {
  const { reader } = workerData;
  if (reader) {
    reader.releaseLock();
  }
  workerData.reader = null;
  workerData.writer = null;
}
function terminateWorker(workerData) {
  const { worker } = workerData;
  if (worker) {
    try {
      worker.terminate();
    } catch {
    }
  }
  workerData.interface = null;
}
function getWebWorker(url, baseURI, workerData, isModuleType, useBlobURI = true) {
  const { createWorker } = workerData;
  let worker, resolvedURI, resolvedOptions;
  if (createWorker) {
    worker = createWorker();
  } else if (webWorkerURI === UNDEFINED_VALUE || webWorkerSource !== url) {
    const isFunctionURI = typeof url == FUNCTION_TYPE;
    if (isFunctionURI) {
      resolvedURI = url(useBlobURI);
    } else {
      resolvedURI = url;
    }
    const isDataURI = resolvedURI.startsWith("data:");
    const isBlobURI = resolvedURI.startsWith("blob:");
    if (isDataURI || isBlobURI) {
      if (isModuleType === UNDEFINED_VALUE) {
        isModuleType = false;
      }
      if (isModuleType) {
        resolvedOptions = MODULE_WORKER_OPTIONS;
      }
      try {
        worker = new Worker(resolvedURI, resolvedOptions);
      } catch (error) {
        if (isBlobURI) {
          try {
            URL.revokeObjectURL(resolvedURI);
          } catch {
          }
        }
        if (isFunctionURI && isBlobURI) {
          return getWebWorker(url, baseURI, workerData, isModuleType, false);
        } else if (!isModuleType) {
          return getWebWorker(url, baseURI, workerData, true, false);
        } else {
          throw error;
        }
      }
    } else {
      if (isModuleType === UNDEFINED_VALUE) {
        isModuleType = true;
      }
      if (isModuleType) {
        resolvedOptions = MODULE_WORKER_OPTIONS;
      }
      try {
        resolvedURI = new URL(resolvedURI, baseURI);
      } catch {
      }
      try {
        worker = new Worker(resolvedURI, resolvedOptions);
      } catch (error) {
        if (isModuleType) {
          return getWebWorker(url, baseURI, workerData, false, useBlobURI);
        } else {
          throw error;
        }
      }
    }
    webWorkerSource = url;
    webWorkerURI = resolvedURI;
    webWorkerOptions = resolvedOptions;
  } else {
    worker = new Worker(webWorkerURI, webWorkerOptions);
  }
  worker.addEventListener(MESSAGE_EVENT_TYPE, (event) => {
    workerData.workerAlive = true;
    clearStartupTimeout(workerData);
    onMessage(event, workerData);
  });
  worker.addEventListener(ERROR_EVENT_TYPE, (event) => onWorkerError(event, workerData));
  worker.addEventListener(MESSAGE_ERROR_EVENT_TYPE, (event) => onWorkerError(event, workerData));
  return worker;
}
function onStartupTimeout(workerData) {
  workerData.startupTimeout = null;
  if (workerData.workerAlive) {
    return;
  }
  const { rejectResult, writer } = workerData;
  terminateWorker(workerData);
  workerData.worker = null;
  if (rejectResult) {
    const error = new Error(ERR_WORKER_STARTUP_TIMEOUT);
    error.workerStartupFailed = true;
    rejectResult(error);
    if (writer) {
      writer.releaseLock();
    }
  }
}
function clearStartupTimeout(workerData) {
  const { startupTimeout } = workerData;
  if (startupTimeout) {
    clearTimeout(startupTimeout);
    workerData.startupTimeout = null;
  }
}
function onWorkerError(event, workerData) {
  if (event.preventDefault) {
    event.preventDefault();
  }
  clearStartupTimeout(workerData);
  const { workerAlive, rejectResult, writer, onTaskFinished } = workerData;
  terminateWorker(workerData);
  if (!workerAlive) {
    workerData.worker = null;
  }
  let error = event.error || new Error(event.message || ERROR_EVENT_TYPE);
  if (!workerAlive) {
    error = Object.assign(new Error(error.message || ERROR_EVENT_TYPE), { workerStartupFailed: true });
    workerData.startupError = error;
  }
  if (rejectResult) {
    rejectResult(error);
    if (writer) {
      writer.releaseLock();
    }
    if (workerAlive) {
      onTaskFinished();
    }
  }
}
function sendMessage(message, { worker, writer }) {
  try {
    const { value } = message;
    if (value) {
      message.value = toExactUint8Array(value);
      try {
        worker.postMessage(message, [message.value.buffer]);
      } catch {
        worker.postMessage(message);
      }
    } else {
      worker.postMessage(message);
    }
  } catch (error) {
    if (writer) {
      writer.releaseLock();
    }
    throw error;
  }
}
async function onMessage({ data }, workerData) {
  const { type, value, messageId, result, error, errorValue } = data;
  const { reader, writer, resolveResult, rejectResult, onTaskFinished, generation } = workerData;
  const stale = () => workerData.generation != generation;
  try {
    if (error) {
      fail(getResponseError(error, errorValue));
    } else {
      if (type == MESSAGE_PULL) {
        const { value: value2, done } = await reader.read();
        if (!stale()) {
          sendMessage({ type: MESSAGE_DATA, value: value2, done, messageId }, workerData);
        }
      }
      if (type == MESSAGE_DATA) {
        const chunk = new Uint8Array(value);
        await writer.ready;
        await writer.write(chunk);
        if (!stale()) {
          sendMessage({ type: MESSAGE_ACK_DATA, messageId }, workerData);
        }
      }
      if (type == MESSAGE_CLOSE) {
        succeed(result);
      }
    }
  } catch (error2) {
    if (!stale()) {
      terminateWorker(workerData);
      fail(error2);
    }
  }
  function fail(error2) {
    if (!stale()) {
      rejectResult(error2);
      releaseWriter();
      if (!(isErrorObject(error2) && error2.codecImportFailed)) {
        onTaskFinished();
      }
    }
  }
  function succeed(result2) {
    if (!stale()) {
      resolveResult(result2);
      releaseWriter();
      onTaskFinished();
    }
  }
  function releaseWriter() {
    if (writer) {
      writer.releaseLock();
    }
  }
}
function getResponseError(errorData, errorValue) {
  const { message, stack, code, name, outputSize, cause, codecImportFailed } = errorData;
  let responseError;
  if (errorValue) {
    responseError = errorValue.value;
  } else {
    responseError = Object.assign(new Error(message), { stack, code, name });
  }
  if (isErrorObject(responseError)) {
    try {
      if (outputSize !== UNDEFINED_VALUE) {
        responseError.outputSize = outputSize;
      }
      if (codecImportFailed) {
        responseError.codecImportFailed = true;
      }
      if (cause) {
        if (!isErrorObject(responseError.cause)) {
          responseError.cause = Object.assign(new Error(cause.message), { name: cause.name });
        }
        if (cause.code !== UNDEFINED_VALUE && responseError.cause.code !== cause.code) {
          responseError.cause.code = cause.code;
        }
      }
      if (errorValue) {
        if (responseError.name !== name) {
          responseError.name = name;
        }
        if (responseError.code !== code) {
          responseError.code = code;
        }
      }
    } catch {
    }
  }
  return responseError;
}
init_zip_reader();
init_constants();
init_configuration();
init_codec_registry();
init_codec_worker();
init_codec_pool();
init_io();
init_encode_text();
init_array();
init_warnings();
init_compatible_streams();
init_error();
init_zip_entry();
init_options();
var ERR_DUPLICATED_NAME = "File already exists";
var ERR_INVALID_COMMENT = "Zip file comment exceeds 64KB";
var ERR_INVALID_COMMENT_TYPE = "Invalid zip file comment (must be a Uint8Array)";
var ERR_INVALID_ENTRY_COMMENT = "File entry comment exceeds 64KB";
var ERR_INVALID_ENTRY_COMMENT_TYPE = "Invalid file entry comment (must be a string)";
var ERR_INVALID_DATE = "Invalid date (must be a valid Date instance)";
var ERR_INVALID_ENTRY_NAME = "File entry name exceeds 64KB";
var ERR_INVALID_VERSION = "Version exceeds 65535";
var ERR_INVALID_ENCRYPTION_STRENGTH = "The strength must equal 1, 2, or 3";
var ERR_UNSUPPORTED_ENCRYPTION_USDZ = "Encryption is not supported in USDZ files";
var ERR_UNSUPPORTED_SPLIT_USDZ = "Split zip files are not supported in USDZ files";
var ERR_UNSUPPORTED_ENCRYPTION_PASS_THROUGH = "Encryption is not supported when the 'passThrough' option is set to true (use 'compressed' instead)";
var ERR_INVALID_EXTRAFIELD = "Invalid extra field (must be a Map)";
var ERR_INVALID_EXTRAFIELD_TYPE = "Invalid extra field type (must be integer 0..65535)";
var ERR_INVALID_EXTRAFIELD_DATA_TYPE = "Invalid extra field data (must be a Uint8Array)";
var ERR_INVALID_EXTRAFIELD_DATA = "Extra field data exceeds 64KB";
var MIN_UNIX_TIME = -2147483648;
var MAX_UNIX_TIME = 2147483647;
var MIN_NTFS_TIME = BigInt(0);
var MAX_NTFS_TIME = BigInt("0x7fffffffffffffff");
var ERR_UNSUPPORTED_FORMAT = "Zip64 is not supported (set the 'zip64' option to 'true')";
var ERR_UNDEFINED_UNCOMPRESSED_SIZE = "Undefined uncompressed size";
var ERR_UNDEFINED_COMPRESSION_METHOD = "Undefined compression method";
var ERR_UNDEFINED_CRC32 = "Undefined CRC32";
var ERR_UNDEFINED_READER = "Undefined reader";
var ERR_INVALID_READER = "Invalid reader (must be a Reader instance, a ReadableStream instance, or an object with a 'readable' property)";
var ERR_ZIP_NOT_EMPTY = "Zip file not empty";
var ERR_INVALID_UID = "Invalid uid (must be integer 0..2^32-1)";
var ERR_INVALID_GID = "Invalid gid (must be integer 0..2^32-1)";
var ERR_INVALID_UNIX_MODE = "Invalid UNIX mode (must be integer 0..65535)";
var ERR_INVALID_UNIX_EXTRA_FIELD_TYPE = "Invalid unixExtraFieldType (must be 'infozip' or 'unix')";
var ERR_INVALID_UNIX_ID_SIZE = "uid/gid must be 0..65535 for unixExtraFieldType 'unix' (use 'infozip' for larger ids)";
var ERR_INVALID_MSDOS_ATTRIBUTES = "Invalid msdosAttributesRaw (must be integer 0..255)";
var ERR_INVALID_MSDOS_DATA = "Invalid msdosAttributes (must be an object with boolean flags)";
var ERR_INVALID_LEVEL = "Invalid level (must be integer 0..9)";
var ERR_INVALID_UNCOMPRESSED_SIZE_OPTION = "Invalid uncompressedSize option (must be a non-negative integer)";
var ERR_INVALID_SIGNATURE_DATA = "Signature data exceeds 64KB";
var ERR_INVALID_ENTRY = "Invalid entry option (must be an entry returned by ZipReader#getEntries())";
var ERR_ZIP_CRYPTO_LAST_MOD_DATE = "The last modification date of an entry encrypted with ZipCrypto cannot be changed when passThrough is set";
var WARNING_COMPRESSION_UNAVAILABLE = "compression unavailable";
var WARNING_CLAMPED_LAST_MODIFICATION_DATE = "clamped last modification date";
var EXTRAFIELD_DATA_AES = new Uint8Array([7, 0, 2, 0, 65, 69, 3, 0, 0]);
var EXTRAFIELD_OFFSET_AES_VENDOR_VERSION = 4;
var EXTRAFIELD_OFFSET_AES_COMPRESSION_METHOD = 9;
var EXTRAFIELD_USDZ_MAX_LENGTH = 67;
var MIN_PRINTABLE_ASCII_CHARACTER_CODE = 32;
var MAX_PRINTABLE_ASCII_CHARACTER_CODE = 126;
var VENDOR_VERSION_AE_12 = 1;
var INFOZIP_EXTRA_FIELD_TYPE = "infozip";
var UNIX_EXTRA_FIELD_TYPE = "unix";
var LEVEL_BY_BITFLAG_LEVEL = [8, 9, 5, 3];
var MAX_LEVEL = 9;
var workers = 0;
var pendingEntries = [];
var ZipWriter = class {
  constructor(writer, options = {}) {
    writer = new GenericWriter(writer);
    const { availableSize = INFINITY_VALUE, maxSize = INFINITY_VALUE } = writer;
    const addSplitZipSignature = availableSize > 0 && availableSize !== INFINITY_VALUE && maxSize > 0 && maxSize !== INFINITY_VALUE;
    if (addSplitZipSignature && options[OPTION_USDZ]) {
      throw new Error(ERR_UNSUPPORTED_SPLIT_USDZ);
    }
    Object.assign(this, {
      writer,
      addSplitZipSignature,
      options,
      fileEntries: /* @__PURE__ */ new Map(),
      filenames: /* @__PURE__ */ new Set(),
      offset: options[OPTION_OFFSET] === UNDEFINED_VALUE ? writer.size || writer.writable.size || 0 : options[OPTION_OFFSET],
      initialOffset: options[OPTION_OFFSET] === UNDEFINED_VALUE ? 0 : options[OPTION_OFFSET] - (writer.size || writer.writable.size || 0),
      pendingAddFileCalls: /* @__PURE__ */ new Set(),
      pendingErrors: [],
      warnings: [],
      bufferedWrites: 0,
      directWrites: 0,
      lastFileEntry: UNDEFINED_VALUE,
      archiveClosed: false
    });
  }
  prependZip(reader) {
    return watchPromiseError(this, prependZipEntries(this, reader));
  }
  appendZip(reader, options = {}) {
    return watchPromiseError(this, appendZipEntries(this, reader, options));
  }
  add(name = "", reader, options = {}) {
    const zipWriter = this;
    const { pendingAddFileCalls } = zipWriter;
    const promiseAddFile = addFileEntry(zipWriter, name, reader, options);
    pendingAddFileCalls.add(promiseAddFile);
    const deletePendingAddFileCall = () => pendingAddFileCalls.delete(promiseAddFile);
    Promise.prototype.then.call(promiseAddFile, deletePendingAddFileCall, deletePendingAddFileCall);
    return watchPromiseError(zipWriter, promiseAddFile);
  }
  remove(entry) {
    const { filenames, fileEntries } = this;
    if (typeof entry == STRING_TYPE) {
      entry = fileEntries.get(entry);
    }
    if (entry && entry.filename !== UNDEFINED_VALUE) {
      const { filename } = entry;
      if (filenames.has(filename) && fileEntries.has(filename)) {
        filenames.delete(filename);
        fileEntries.delete(filename);
        return true;
      }
    }
    return false;
  }
  async close(comment = EMPTY_UINT8_ARRAY, options = {}) {
    const zipWriter = this;
    const { pendingAddFileCalls, writer } = this;
    const { writable } = writer;
    if (zipWriter.archiveClosed) {
      return getWriterData(writer);
    }
    if (!(comment instanceof Uint8Array)) {
      throw new Error(ERR_INVALID_COMMENT_TYPE);
    }
    if (getLength(comment) > MAX_16_BITS) {
      throw new Error(ERR_INVALID_COMMENT);
    }
    while (pendingAddFileCalls.size) {
      await Promise.allSettled(Array.from(pendingAddFileCalls));
    }
    await Promise.allSettled(zipWriter.pendingErrors.map((watcher) => watcher.recorded));
    const unobservedWatchers = zipWriter.pendingErrors.filter((watcher) => watcher.failed && !watcher.observed);
    if (unobservedWatchers.length) {
      const unobservedErrors = unobservedWatchers.map((watcher) => watcher.error);
      unobservedWatchers.forEach((watcher) => watcher.observed = true);
      const [error] = unobservedErrors;
      try {
        error.entryErrors = unobservedErrors;
      } catch {
      }
      throw error;
    }
    await closeFile(zipWriter, comment, options);
    zipWriter.archiveClosed = true;
    const preventClose = !ownsWritable(writer) && getOptionValue2(zipWriter, options, OPTION_PREVENT_CLOSE);
    if (!preventClose) {
      await writable.getWriter().close();
    }
    return getWriterData(writer);
  }
  [SYMBOL_ASYNC_DISPOSE]() {
    return this.close();
  }
};
var WatchedPromise = class extends Promise {
  then(onFulfilled, onRejected) {
    const { watcher } = this;
    if (watcher) {
      watcher.observed = true;
    }
    return super.then(onFulfilled, onRejected);
  }
};
function getWriterData(writer) {
  return writer.getData ? writer.getData() : writer.writable;
}
function watchPromiseError(zipWriter, promise) {
  const watchedPromise = new WatchedPromise((resolve, reject) => Promise.prototype.then.call(promise, resolve, reject));
  const watcher = {};
  watchedPromise.watcher = watcher;
  watcher.recorded = Promise.prototype.then.call(
    watchedPromise,
    UNDEFINED_VALUE,
    (error) => Object.assign(watcher, { failed: true, error })
  );
  zipWriter.pendingErrors.push(watcher);
  return watchedPromise;
}
async function appendZipEntries(zipWriter, reader, options = {}) {
  const { pendingAddFileCalls, filenames, fileEntries } = zipWriter;
  const filter = checkFunctionOption(options.filter);
  const readerOptions = checkReaderOptionsObject(options.readerOptions);
  while (pendingAddFileCalls.size) {
    await Promise.allSettled(Array.from(pendingAddFileCalls));
  }
  let resolveAppendZip;
  const promiseAppendZip = new Promise((resolve) => resolveAppendZip = resolve);
  pendingAddFileCalls.add(promiseAppendZip);
  const appendedFilenames = [];
  let releaseLockWriter;
  try {
    reader = new GenericReader(reader);
    await initStream(reader);
    if (reader.size === UNDEFINED_VALUE || !reader.readUint8Array) {
      reader = new BlobReader(await streamToBlob(reader.readable));
      await initStream(reader);
    }
    const { ZipReader: ZipReader2, getEntryDataDescriptorLength: getEntryDataDescriptorLength2 } = await Promise.resolve().then(() => (init_zip_reader(), zip_reader_exports));
    const zipReader = new ZipReader2(reader, readerOptions);
    const keptEntries = [];
    let entries;
    try {
      entries = await zipReader.getEntries();
      for (const entry of entries) {
        if (!filter || await filter(entry, getExistingEntry(fileEntries, entry.filename))) {
          keptEntries.push(entry);
        }
      }
    } finally {
      await zipReader.close();
    }
    await initStream(zipWriter.writer);
    const { directoryOffset, entriesMissingZip64ExtraField } = zipReader;
    keptEntries.forEach((entry) => {
      const { filename } = entry;
      if (entriesMissingZip64ExtraField.has(entry)) {
        throw new Error(ERR_EXTRAFIELD_ZIP64_NOT_FOUND);
      }
      if (filenames.has(filename)) {
        throw new Error(ERR_DUPLICATED_NAME);
      }
      filenames.add(filename);
      appendedFilenames.push(filename);
    });
    zipWriter.writerLocked = true;
    const { lockWriter } = zipWriter;
    zipWriter.lockWriter = new Promise((resolve) => releaseLockWriter = () => {
      zipWriter.writerLocked = false;
      resolve();
    });
    await lockWriter;
    if (zipWriter.addSplitZipSignature) {
      delete zipWriter.addSplitZipSignature;
      if (filter || !await startsWithSplitZipSignature2(reader)) {
        await writeData(zipWriter.writer, getSplitZipSignatureArray());
        zipWriter.offset += SPLIT_ZIP_FILE_SIGNATURE_LENGTH;
      }
    }
    const entryPositions = await copyZipData(zipWriter, reader, entries, keptEntries, directoryOffset, Boolean(filter), getEntryDataDescriptorLength2);
    keptEntries.forEach((entry) => {
      const {
        version,
        rawLastModDate,
        rawFilename,
        rawBitFlag,
        uncompressedSize,
        compressedSize,
        extraFieldZip64
      } = entry;
      let {
        compressionMethod,
        rawExtraField
      } = entry;
      rawExtraField = removeExtraFieldZip64(rawExtraField || EMPTY_UINT8_ARRAY);
      if (entry.extraFieldAES) {
        compressionMethod = COMPRESSION_METHOD_AES;
      }
      const extraFieldLength = getLength(rawExtraField);
      const zip64UncompressedSize = Boolean(extraFieldZip64) && extraFieldZip64.uncompressedSize !== UNDEFINED_VALUE;
      const zip64CompressedSize = Boolean(extraFieldZip64) && extraFieldZip64.compressedSize !== UNDEFINED_VALUE;
      const {
        headerArray,
        headerView
      } = getHeaderArrayData({
        version,
        bitFlag: rawBitFlag,
        compressionMethod,
        uncompressedSize,
        compressedSize,
        rawLastModDate,
        rawFilename,
        zip64CompressedSize,
        zip64UncompressedSize,
        extraFieldLength
      });
      const { crc32 } = entry;
      if (crc32 !== UNDEFINED_VALUE) {
        setUint32(headerView, HEADER_OFFSET_SIGNATURE, crc32);
      }
      const { offset, diskNumberStart } = entryPositions.get(entry);
      fileEntries.set(entry.filename, Object.assign({}, entry, {
        zip64Enabled: true,
        zip64UncompressedSize,
        zip64CompressedSize,
        offset,
        diskNumberStart,
        zip64DiskNumberStart: false,
        rawExtraFieldZip64: EMPTY_UINT8_ARRAY,
        rawExtraFieldAES: EMPTY_UINT8_ARRAY,
        rawExtraFieldExtendedTimestamp: EMPTY_UINT8_ARRAY,
        rawExtraFieldNTFS: EMPTY_UINT8_ARRAY,
        rawExtraFieldUnix: EMPTY_UINT8_ARRAY,
        rawCentralExtraFieldUnix: EMPTY_UINT8_ARRAY,
        rawExtraField,
        rawCentralExtraField: EMPTY_UINT8_ARRAY,
        headerArray,
        headerView
      }));
    });
  } catch (error) {
    appendedFilenames.forEach((filename) => filenames.delete(filename));
    throw error;
  } finally {
    resolveAppendZip();
    pendingAddFileCalls.delete(promiseAppendZip);
    if (releaseLockWriter) {
      releaseLockWriter();
    }
  }
}
function getExistingEntry(fileEntries, filename) {
  const fileEntry = fileEntries.get(filename);
  return fileEntry ? new Entry(fileEntry) : UNDEFINED_VALUE;
}
async function prependZipEntries(zipWriter, reader) {
  if (zipWriter.filenames.size) {
    throw new Error(ERR_ZIP_NOT_EMPTY);
  }
  await appendZipEntries(zipWriter, reader);
}
async function addFileEntry(zipWriter, name, reader, options) {
  options = Object.assign({}, options);
  const entry = options[OPTION_ENTRY];
  if (entry !== UNDEFINED_VALUE) {
    const { entryOptions, passThroughOptions } = getSourceEntryOptions(
      entry,
      checkPassThroughOption(getOptionValue2(zipWriter, options, OPTION_PASS_THROUGH)),
      getOptionValue2(zipWriter, options, PROPERTY_NAME_LAST_MODIFICATION_DATE)
    );
    delete options[OPTION_ENTRY];
    options = Object.assign(entryOptions, passThroughOptions, options);
  }
  if (getOptionValue2(zipWriter, options, PROPERTY_NAME_DIRECTORY) && !name.endsWith(DIRECTORY_SIGNATURE)) {
    name += DIRECTORY_SIGNATURE;
  }
  if (zipWriter.filenames.has(name)) {
    throw new Error(ERR_DUPLICATED_NAME);
  }
  zipWriter.filenames.add(name);
  if (workers < getConfiguration().maxWorkers) {
    workers++;
  } else {
    await new Promise((resolve) => pendingEntries.push(resolve));
  }
  try {
    return await addFile(zipWriter, name, reader, options);
  } catch (error) {
    zipWriter.filenames.delete(name);
    throw error;
  } finally {
    const pendingEntry = pendingEntries.shift();
    if (pendingEntry) {
      pendingEntry();
    } else {
      workers--;
    }
  }
}
async function addFile(zipWriter, name, reader, options) {
  const attributesInfo = resolveAttributes(zipWriter, name, options);
  ({ name } = attributesInfo);
  const metadataInfo = resolveMetadata(zipWriter, name, options);
  const { comment } = metadataInfo;
  const extraField = options[PROPERTY_NAME_EXTRA_FIELD];
  zipWriter.fileEntries.set(name, UNDEFINED_VALUE);
  const previousFileEntry = zipWriter.lastFileEntry;
  const pendingFileEntry = {};
  let releaseLockFileEntry;
  if (metadataInfo.resolvedOptions.keepOrder) {
    pendingFileEntry.lockFileEntry = new Promise((resolve) => releaseLockFileEntry = resolve);
  }
  zipWriter.lastFileEntry = pendingFileEntry;
  let fileEntry;
  try {
    const { resolvedOptions } = metadataInfo;
    if (resolvedOptions.level != 0 && resolvedOptions.compressionMethod === UNDEFINED_VALUE && !resolvedOptions.passThroughCompression && !await supportsDeflate(getConfiguration())) {
      resolvedOptions.level = 0;
      addWarning(zipWriter.warnings, WARNING_COMPRESSION_UNAVAILABLE, name);
    }
    const sizesInfo = await resolveSizes(zipWriter, reader, metadataInfo, options);
    ({ reader } = sizesInfo);
    const diskOffset = getDiskOffset2(zipWriter.writer);
    const diskNumber = getDiskNumber(zipWriter.writer);
    let crc32 = options.crc32 === UNDEFINED_VALUE ? options[PROPERTY_NAME_SIGNATURE] : options.crc32;
    const storesAE2 = sizesInfo.resolvedOptions.encrypted && !resolvedOptions.zipCrypto;
    if (resolvedOptions.passThroughCompression && !resolvedOptions.passThroughEncryption && storesAE2) {
      crc32 = UNDEFINED_VALUE;
    }
    if (resolvedOptions.passThroughCompression && reader && !storesAE2 && crc32 === UNDEFINED_VALUE) {
      throw new Error(ERR_UNDEFINED_CRC32);
    }
    options = Object.assign({}, options, attributesInfo.resolvedOptions, metadataInfo.resolvedOptions, sizesInfo.resolvedOptions, {
      signature: options[PROPERTY_NAME_SIGNATURE],
      crc32,
      offset: zipWriter.offset - diskOffset,
      diskNumberStart: diskNumber,
      [OPTION_USDZ]: zipWriter.options[OPTION_USDZ]
    });
    const headerInfo = getHeaderInfo(options);
    if (headerInfo.lastModDateClamped) {
      addWarning(zipWriter.warnings, WARNING_CLAMPED_LAST_MODIFICATION_DATE, name);
    }
    const dataDescriptorInfo = getDataDescriptorInfo(options);
    const metadataSize = getLength(headerInfo.localHeaderArray, dataDescriptorInfo.dataDescriptorArray);
    fileEntry = await getFileEntry(zipWriter, name, reader, {
      headerInfo,
      dataDescriptorInfo,
      metadataSize,
      fileEntry: pendingFileEntry,
      previousFileEntry,
      releaseLockFileEntry
    }, options);
  } catch (error) {
    zipWriter.fileEntries.delete(name);
    throw error;
  } finally {
    if (releaseLockFileEntry) {
      releaseLockFileEntry(previousFileEntry && previousFileEntry.lockFileEntry);
    }
  }
  Object.assign(fileEntry, {
    name,
    comment,
    extraField
  });
  return new Entry(fileEntry);
}
function getSourceEntryOptions(entry, passThrough, lastModDateOverride) {
  if (entry === null || typeof entry != OBJECT_TYPE || Array.isArray(entry)) {
    throw new Error(ERR_INVALID_ENTRY);
  }
  const {
    externalFileAttributes,
    versionMadeBy,
    comment,
    lastModDate,
    rawLastModDate,
    creationDate,
    lastAccessDate,
    uncompressedSize,
    encrypted,
    zipCrypto,
    crc32,
    compressionMethod,
    extraFieldAES,
    extraFieldUnix,
    internalFileAttributes,
    extraField,
    bitFlag,
    directory,
    uid,
    gid
  } = entry;
  const entryOptions = {
    externalFileAttributes,
    versionMadeBy,
    comment,
    lastModDate,
    creationDate,
    lastAccessDate,
    internalFileAttributes,
    directory
  };
  if (bitFlag && bitFlag.languageEncodingFlag) {
    entryOptions[OPTION_USE_UNICODE_FILE_NAMES] = true;
  }
  const userExtraField = getUserExtraField(extraField);
  if (userExtraField) {
    entryOptions[PROPERTY_NAME_EXTRA_FIELD] = userExtraField;
  }
  if (uid !== UNDEFINED_VALUE || gid !== UNDEFINED_VALUE) {
    Object.assign(entryOptions, {
      uid,
      gid,
      unixExtraFieldType: extraFieldUnix ? UNIX_EXTRA_FIELD_TYPE : INFOZIP_EXTRA_FIELD_TYPE
    });
  }
  const passThroughOptions = {};
  if (passThrough && !directory) {
    Object.assign(passThroughOptions, {
      uncompressedSize,
      crc32,
      compressionMethod
    });
    if (passThrough !== PASS_THROUGH_COMPRESSED) {
      Object.assign(passThroughOptions, {
        encrypted,
        zipCrypto,
        encryptionStrength: extraFieldAES ? extraFieldAES.strength : UNDEFINED_VALUE
      });
    }
    if (bitFlag) {
      passThroughOptions.dataDescriptor = bitFlag.dataDescriptor;
      passThroughOptions[OPTION_LEVEL] = LEVEL_BY_BITFLAG_LEVEL[bitFlag.level];
    }
    if (lastModDateOverride === UNDEFINED_VALUE) {
      passThroughOptions.rawLastModDate = rawLastModDate;
    } else if (passThrough !== PASS_THROUGH_COMPRESSED && zipCrypto && (!bitFlag || bitFlag.dataDescriptor) && lastModDateOverride instanceof Date && getDosTimeHighByte(lastModDateOverride) != (rawLastModDate >>> 8 & MAX_8_BITS)) {
      throw new Error(ERR_ZIP_CRYPTO_LAST_MOD_DATE);
    }
  }
  return { entryOptions, passThroughOptions };
}
function getDosTimeHighByte(lastModDate) {
  let dosLastModDate = new Date(Math.ceil(Math.floor(lastModDate.getTime() / 1e3) / 2) * 2e3);
  if (dosLastModDate < MIN_DATE) {
    dosLastModDate = MIN_DATE;
  } else if (dosLastModDate > MAX_DATE) {
    dosLastModDate = MAX_DATE;
  }
  return (dosLastModDate.getHours() << 3 | dosLastModDate.getMinutes() >> 3) & MAX_8_BITS;
}
function resolveAttributes(zipWriter, name, options) {
  let msDosCompatible = getOptionValue2(zipWriter, options, PROPERTY_NAME_MS_DOS_COMPATIBLE);
  let versionMadeBy = getOptionValue2(zipWriter, options, PROPERTY_NAME_VERSION_MADE_BY, msDosCompatible ? VERSION_MADE_BY_MSDOS : VERSION_MADE_BY_UNIX);
  const executable = getOptionValue2(zipWriter, options, PROPERTY_NAME_EXECUTABLE);
  const uid = getNumberOptionValue(zipWriter, options, PROPERTY_NAME_UID);
  const gid = getNumberOptionValue(zipWriter, options, PROPERTY_NAME_GID);
  let unixMode = getNumberOptionValue(zipWriter, options, PROPERTY_NAME_UNIX_MODE);
  let unixExtraFieldType = getOptionValue2(zipWriter, options, OPTION_UNIX_EXTRA_FIELD_TYPE);
  let setuid = getOptionValue2(zipWriter, options, PROPERTY_NAME_SETUID);
  let setgid = getOptionValue2(zipWriter, options, PROPERTY_NAME_SETGID);
  let sticky = getOptionValue2(zipWriter, options, PROPERTY_NAME_STICKY);
  checkIntegerOption(uid, MAX_32_BITS, ERR_INVALID_UID);
  checkIntegerOption(gid, MAX_32_BITS, ERR_INVALID_GID);
  checkIntegerOption(unixMode, MAX_16_BITS, ERR_INVALID_UNIX_MODE);
  if (unixExtraFieldType !== UNDEFINED_VALUE && unixExtraFieldType !== INFOZIP_EXTRA_FIELD_TYPE && unixExtraFieldType !== UNIX_EXTRA_FIELD_TYPE) {
    throw new Error(ERR_INVALID_UNIX_EXTRA_FIELD_TYPE);
  }
  if (unixExtraFieldType === UNIX_EXTRA_FIELD_TYPE && (uid !== UNDEFINED_VALUE && uid > MAX_16_BITS || gid !== UNDEFINED_VALUE && gid > MAX_16_BITS)) {
    throw new Error(ERR_INVALID_UNIX_ID_SIZE);
  }
  if (unixExtraFieldType === UNDEFINED_VALUE && (uid !== UNDEFINED_VALUE || gid !== UNDEFINED_VALUE)) {
    unixExtraFieldType = INFOZIP_EXTRA_FIELD_TYPE;
  }
  let msdosAttributesRaw = getNumberOptionValue(zipWriter, options, PROPERTY_NAME_MSDOS_ATTRIBUTES_RAW);
  let msdosAttributes = getOptionValue2(zipWriter, options, PROPERTY_NAME_MSDOS_ATTRIBUTES);
  const hasUnixMetadata = uid !== UNDEFINED_VALUE || gid !== UNDEFINED_VALUE || unixMode !== UNDEFINED_VALUE || unixExtraFieldType || executable;
  const hasMsDosProvided = msdosAttributesRaw !== UNDEFINED_VALUE || msdosAttributes !== UNDEFINED_VALUE;
  if (hasUnixMetadata) {
    msDosCompatible = false;
    versionMadeBy = versionMadeBy & MAX_8_BITS | VERSION_MADE_BY_UNIX;
  } else if (hasMsDosProvided) {
    msDosCompatible = true;
    versionMadeBy = versionMadeBy & MAX_8_BITS;
  }
  checkIntegerOption(msdosAttributesRaw, MAX_8_BITS, ERR_INVALID_MSDOS_ATTRIBUTES);
  if (msdosAttributes && (typeof msdosAttributes !== OBJECT_TYPE || Array.isArray(msdosAttributes))) {
    throw new Error(ERR_INVALID_MSDOS_DATA);
  }
  if (versionMadeBy > MAX_16_BITS) {
    throw new Error(ERR_INVALID_VERSION);
  }
  let externalFileAttributes = getOptionValue2(zipWriter, options, PROPERTY_NAME_EXTERNAL_FILE_ATTRIBUTES);
  const externalFileAttributesProvided = externalFileAttributes !== UNDEFINED_VALUE;
  if (!externalFileAttributesProvided) {
    externalFileAttributes = 0;
  }
  if (!options[PROPERTY_NAME_DIRECTORY] && name.endsWith(DIRECTORY_SIGNATURE)) {
    options[PROPERTY_NAME_DIRECTORY] = true;
  }
  const directory = getOptionValue2(zipWriter, options, PROPERTY_NAME_DIRECTORY);
  if (directory) {
    if (!name.endsWith(DIRECTORY_SIGNATURE)) {
      name += DIRECTORY_SIGNATURE;
    }
    if (!externalFileAttributesProvided) {
      externalFileAttributes = FILE_ATTR_MSDOS_DIR_MASK;
      if (!msDosCompatible) {
        externalFileAttributes |= (FILE_ATTR_UNIX_TYPE_DIR | FILE_ATTR_UNIX_EXECUTABLE_MASK | FILE_ATTR_UNIX_DEFAULT_MASK) << 16;
      }
    }
  } else if (!msDosCompatible && !externalFileAttributesProvided) {
    if (executable) {
      externalFileAttributes = (FILE_ATTR_UNIX_EXECUTABLE_MASK | FILE_ATTR_UNIX_DEFAULT_MASK) << 16;
    } else {
      externalFileAttributes = FILE_ATTR_UNIX_DEFAULT_MASK << 16;
    }
  }
  if (!msDosCompatible) {
    const unixModeProvided = unixMode !== UNDEFINED_VALUE || Boolean(setuid || setgid || sticky);
    const defaultUnixMode = externalFileAttributes >> 16 & MAX_16_BITS;
    unixMode = unixMode === UNDEFINED_VALUE ? defaultUnixMode : unixMode & MAX_16_BITS;
    if (setuid) {
      unixMode |= FILE_ATTR_UNIX_SETUID_MASK;
    } else {
      setuid = Boolean(unixMode & FILE_ATTR_UNIX_SETUID_MASK);
    }
    if (setgid) {
      unixMode |= FILE_ATTR_UNIX_SETGID_MASK;
    } else {
      setgid = Boolean(unixMode & FILE_ATTR_UNIX_SETGID_MASK);
    }
    if (sticky) {
      unixMode |= FILE_ATTR_UNIX_STICKY_MASK;
    } else {
      sticky = Boolean(unixMode & FILE_ATTR_UNIX_STICKY_MASK);
    }
    if (!externalFileAttributesProvided || unixModeProvided) {
      if (directory) {
        unixMode = unixMode & ~FILE_ATTR_UNIX_TYPE_MASK | FILE_ATTR_UNIX_TYPE_DIR;
      } else if (!(unixMode & FILE_ATTR_UNIX_TYPE_MASK)) {
        unixMode |= FILE_ATTR_UNIX_TYPE_FILE;
      }
      externalFileAttributes = (unixMode & MAX_16_BITS) << 16 | externalFileAttributes & MAX_16_BITS;
    }
  }
  ({ msdosAttributesRaw, msdosAttributes } = normalizeMsdosAttributes(msdosAttributesRaw, msdosAttributes));
  if (hasMsDosProvided) {
    externalFileAttributes = externalFileAttributes & MAX_32_BITS | msdosAttributesRaw & MAX_8_BITS;
  }
  const unixExternalUpper = externalFileAttributes >> 16 & MAX_16_BITS;
  const symlink = unixMode !== UNDEFINED_VALUE && (unixMode & FILE_ATTR_UNIX_TYPE_MASK) == FILE_ATTR_UNIX_TYPE_SYMLINK;
  return {
    name,
    resolvedOptions: {
      versionMadeBy,
      msDosCompatible: Boolean(msDosCompatible),
      externalFileAttributes,
      unixExternalUpper,
      uid,
      gid,
      unixMode,
      unixExtraFieldType,
      symlink,
      setuid,
      setgid,
      sticky,
      msdosAttributesRaw,
      msdosAttributes
    }
  };
}
function resolveMetadata(zipWriter, name, options) {
  const encode = getFunctionOptionValue2(zipWriter, options, OPTION_ENCODE_TEXT) || encodeText;
  let rawFilename = encode(name, TEXT_TYPE_FILENAME);
  if (rawFilename === UNDEFINED_VALUE) {
    rawFilename = encodeText(name);
  }
  if (getLength(rawFilename) > MAX_16_BITS) {
    throw new Error(ERR_INVALID_ENTRY_NAME);
  }
  const comment = options[PROPERTY_NAME_COMMENT] || "";
  if (typeof comment != STRING_TYPE) {
    throw new Error(ERR_INVALID_ENTRY_COMMENT_TYPE);
  }
  let rawComment = encode(comment, TEXT_TYPE_COMMENT);
  if (rawComment === UNDEFINED_VALUE) {
    rawComment = encodeText(comment);
  }
  if (getLength(rawComment) > MAX_16_BITS) {
    throw new Error(ERR_INVALID_ENTRY_COMMENT);
  }
  const version = getOptionValue2(zipWriter, options, PROPERTY_NAME_VERSION);
  if (version !== UNDEFINED_VALUE && version > MAX_16_BITS) {
    throw new Error(ERR_INVALID_VERSION);
  }
  const lastModDate = getDateOptionValue(zipWriter, options, PROPERTY_NAME_LAST_MODIFICATION_DATE, /* @__PURE__ */ new Date());
  const rawLastModDate = getOptionValue2(zipWriter, options, PROPERTY_NAME_RAW_LAST_MODIFICATION_DATE);
  const lastAccessDate = getDateOptionValue(zipWriter, options, PROPERTY_NAME_LAST_ACCESS_DATE);
  const creationDate = getDateOptionValue(zipWriter, options, PROPERTY_NAME_CREATION_DATE);
  const internalFileAttributes = getOptionValue2(zipWriter, options, PROPERTY_NAME_INTERNAL_FILE_ATTRIBUTES, 0);
  const passThrough = checkPassThroughOption(getOptionValue2(zipWriter, options, OPTION_PASS_THROUGH));
  const passThroughCompression = Boolean(passThrough);
  const passThroughEncryption = passThrough === true;
  let password = getOptionValue2(zipWriter, options, OPTION_PASSWORD);
  let rawPassword = getOptionValue2(zipWriter, options, OPTION_RAW_PASSWORD);
  checkPasswordOption(password, rawPassword);
  password = password && password.length ? password : UNDEFINED_VALUE;
  rawPassword = rawPassword && rawPassword.length ? rawPassword : UNDEFINED_VALUE;
  const encryptionStrength = getNumberOptionValue(zipWriter, options, OPTION_ENCRYPTION_STRENGTH, 3);
  const zipCrypto = getOptionValue2(zipWriter, options, PROPERTY_NAME_ZIPCRYPTO);
  const extendedTimestamp = getOptionValue2(zipWriter, options, OPTION_EXTENDED_TIMESTAMP, true);
  const ntfsTimestamp = getOptionValue2(zipWriter, options, OPTION_NTFS_TIMESTAMP);
  const keepOrder = getOptionValue2(zipWriter, options, OPTION_KEEP_ORDER, true);
  const useWebWorkers = getOptionValue2(zipWriter, options, OPTION_USE_WEB_WORKERS);
  const bufferedWrite = getOptionValue2(zipWriter, options, OPTION_BUFFERED_WRITE);
  const createTempStream = getFunctionOptionValue2(zipWriter, options, OPTION_CREATE_TEMP_STREAM);
  const dataDescriptorSignature = getOptionValue2(zipWriter, options, OPTION_DATA_DESCRIPTOR_SIGNATURE, true);
  const signal = checkSignalOption(getOptionValue2(zipWriter, options, OPTION_SIGNAL));
  throwIfAborted(signal);
  const useUnicodeFileNames = getOptionValue2(
    zipWriter,
    options,
    OPTION_USE_UNICODE_FILE_NAMES,
    !isPrintableASCIIText(rawFilename) || !isPrintableASCIIText(rawComment)
  );
  const compressionMethod = getOptionValue2(zipWriter, options, PROPERTY_NAME_COMPRESSION_METHOD);
  const registeredCodec = passThroughCompression || compressionMethod === UNDEFINED_VALUE ? UNDEFINED_VALUE : getRegisteredCodec(compressionMethod);
  if (!passThroughCompression && compressionMethod !== UNDEFINED_VALUE && compressionMethod !== COMPRESSION_METHOD_STORE && compressionMethod !== COMPRESSION_METHOD_DEFLATE && !registeredCodec) {
    throw new Error(ERR_UNSUPPORTED_COMPRESSION);
  }
  let level = getNumberOptionValue(zipWriter, options, OPTION_LEVEL);
  checkIntegerOption(level, MAX_LEVEL, ERR_INVALID_LEVEL);
  if (zipWriter.options[OPTION_USDZ]) {
    if (password !== UNDEFINED_VALUE || rawPassword !== UNDEFINED_VALUE) {
      throw new Error(ERR_UNSUPPORTED_ENCRYPTION_USDZ);
    }
    if (level === UNDEFINED_VALUE && compressionMethod === UNDEFINED_VALUE) {
      level = 0;
    }
  }
  if (passThroughCompression) {
    level = toNumber(options[OPTION_LEVEL]);
  }
  let useCompressionStream = getOptionValue2(zipWriter, options, OPTION_USE_COMPRESSION_STREAM);
  let dataDescriptor = getOptionValue2(zipWriter, options, OPTION_DATA_DESCRIPTOR);
  if (bufferedWrite && dataDescriptor === UNDEFINED_VALUE) {
    dataDescriptor = false;
  }
  if (dataDescriptor === UNDEFINED_VALUE || zipCrypto && !passThroughEncryption) {
    dataDescriptor = true;
  }
  if (level !== UNDEFINED_VALUE && level != 6) {
    useCompressionStream = false;
  }
  const zip64 = getOptionValue2(zipWriter, options, PROPERTY_NAME_ZIP64);
  if (!zipCrypto && (password !== UNDEFINED_VALUE || rawPassword !== UNDEFINED_VALUE) && !(Number.isInteger(encryptionStrength) && encryptionStrength >= 1 && encryptionStrength <= 3)) {
    throw new Error(ERR_INVALID_ENCRYPTION_STRENGTH);
  }
  const rawExtraField = serializeExtraField(options[PROPERTY_NAME_EXTRA_FIELD]);
  const rawLocalExtraField = serializeExtraField(options[OPTION_LOCAL_EXTRA_FIELD]);
  const rawCentralExtraField = serializeExtraField(options[OPTION_CENTRAL_EXTRA_FIELD]);
  return {
    comment,
    resolvedOptions: {
      rawFilename,
      rawComment,
      version,
      lastModDate,
      rawLastModDate,
      lastAccessDate,
      creationDate,
      internalFileAttributes,
      passThroughCompression,
      passThroughEncryption,
      password,
      rawPassword,
      encryptionStrength,
      zipCrypto,
      extendedTimestamp,
      ntfsTimestamp,
      keepOrder,
      useWebWorkers,
      bufferedWrite,
      createTempStream,
      dataDescriptorSignature,
      signal,
      useUnicodeFileNames,
      compressionMethod,
      format: registeredCodec ? registeredCodec.format : UNDEFINED_VALUE,
      codecURI: registeredCodec ? registeredCodec.codecURI : UNDEFINED_VALUE,
      codecVersionNeeded: registeredCodec ? registeredCodec.versionNeeded : UNDEFINED_VALUE,
      level,
      useCompressionStream,
      dataDescriptor,
      zip64,
      rawExtraField,
      rawLocalExtraField,
      rawCentralExtraField
    }
  };
}
function serializeExtraField(extraField) {
  if (!extraField) {
    return EMPTY_UINT8_ARRAY;
  }
  if (!(extraField instanceof Map)) {
    throw new Error(ERR_INVALID_EXTRAFIELD);
  }
  let extraFieldSize = 0;
  let offset = 0;
  extraField.forEach((data, type) => {
    checkInteger(type, MAX_16_BITS, ERR_INVALID_EXTRAFIELD_TYPE);
    if (!(data instanceof Uint8Array)) {
      throw new Error(ERR_INVALID_EXTRAFIELD_DATA_TYPE);
    }
    if (getLength(data) > MAX_16_BITS) {
      throw new Error(ERR_INVALID_EXTRAFIELD_DATA);
    }
    extraFieldSize += 4 + getLength(data);
  });
  const rawExtraField = new Uint8Array(extraFieldSize);
  const rawExtraFieldView = getDataView(rawExtraField);
  extraField.forEach((data, type) => {
    setUint16(rawExtraFieldView, offset, type);
    setUint16(rawExtraFieldView, offset + 2, getLength(data));
    arraySet(rawExtraField, data, offset + 4);
    offset += 4 + getLength(data);
  });
  return rawExtraField;
}
async function resolveSizes(zipWriter, reader, { resolvedOptions: metadata }, options) {
  if (metadata.passThroughCompression && !reader && !getOptionValue2(zipWriter, options, PROPERTY_NAME_DIRECTORY)) {
    throw new Error(ERR_UNDEFINED_READER);
  }
  let contentSize;
  if (reader) {
    reader = new GenericReader(reader);
    await initStream(reader);
    if (!reader.readUint8Array && !reader.readable) {
      throw new Error(ERR_INVALID_READER);
    }
    ({ size: contentSize } = reader);
  }
  return Object.assign({ reader }, resolveEntrySizes(zipWriter, Boolean(reader), contentSize, metadata, options));
}
function resolveEntrySizes(zipWriter, hasContent, contentSize, metadata, options) {
  const { passThroughCompression, passThroughEncryption, zipCrypto, password, rawPassword, encryptionStrength } = metadata;
  let { dataDescriptor, zip64, level, compressionMethod } = metadata;
  let maximumCompressedSize = 0;
  let uncompressedSize = 0;
  let unknownSize = false;
  const uncompressedSizeOption = toNumber(options[PROPERTY_NAME_UNCOMPRESSED_SIZE]);
  checkIntegerOption(uncompressedSizeOption, Number.MAX_SAFE_INTEGER, ERR_INVALID_UNCOMPRESSED_SIZE_OPTION);
  if (passThroughCompression && hasContent) {
    uncompressedSize = uncompressedSizeOption;
    if (uncompressedSize === UNDEFINED_VALUE) {
      throw new Error(ERR_UNDEFINED_UNCOMPRESSED_SIZE);
    }
    if (compressionMethod === UNDEFINED_VALUE) {
      throw new Error(ERR_UNDEFINED_COMPRESSION_METHOD);
    }
  }
  const zip64Enabled = zip64 === true;
  const encrypted = getOptionValue2(zipWriter, options, PROPERTY_NAME_ENCRYPTED);
  if (hasContent && passThroughEncryption && !encrypted && getLength(password, rawPassword)) {
    throw new Error(ERR_UNSUPPORTED_ENCRYPTION_PASS_THROUGH);
  }
  const encryptedEntry = hasContent && (Boolean(password && getLength(password) || rawPassword && getLength(rawPassword)) || passThroughEncryption && encrypted);
  if (!hasContent) {
    level = 0;
    compressionMethod = COMPRESSION_METHOD_STORE;
  }
  const encryptionOverhead = getEncryptionOverhead(encryptedEntry, zipCrypto, encryptionStrength);
  if (hasContent) {
    if (!passThroughCompression) {
      const expectedSize = contentSize === UNDEFINED_VALUE ? uncompressedSizeOption : contentSize;
      if (expectedSize === UNDEFINED_VALUE) {
        if (zip64 || zip64 === UNDEFINED_VALUE) {
          zip64 = unknownSize = true;
          maximumCompressedSize = MAX_32_BITS + 1;
        }
      } else {
        options.uncompressedSize = uncompressedSize = expectedSize;
        maximumCompressedSize = (isCompressed(compressionMethod, level) ? getMaximumCompressedSize(uncompressedSize) : uncompressedSize) + encryptionOverhead;
      }
    } else {
      options.uncompressedSize = uncompressedSize;
      maximumCompressedSize = contentSize === UNDEFINED_VALUE ? getMaximumCompressedSize(uncompressedSize) + encryptionOverhead : contentSize + (passThroughEncryption ? 0 : encryptionOverhead);
    }
  }
  const emptyEntry = !encryptedEntry && (!hasContent || contentSize === 0 && !passThroughCompression) && !isCompressed(compressionMethod, level);
  const crc32Provided = options.crc32 !== UNDEFINED_VALUE || options[PROPERTY_NAME_SIGNATURE] !== UNDEFINED_VALUE;
  const completeHeader = passThroughCompression && hasContent && contentSize !== UNDEFINED_VALUE && !(encryptedEntry && zipCrypto) && (crc32Provided || encryptedEntry && !zipCrypto);
  if ((emptyEntry || completeHeader) && getOptionValue2(zipWriter, options, OPTION_DATA_DESCRIPTOR) === UNDEFINED_VALUE) {
    dataDescriptor = false;
  }
  const zip64UncompressedSize = zip64Enabled || unknownSize || uncompressedSize >= MAX_32_BITS;
  const zip64CompressedSize = zip64Enabled || maximumCompressedSize >= MAX_32_BITS;
  if (zip64UncompressedSize || zip64CompressedSize) {
    if (zip64 === false) {
      throw new Error(ERR_UNSUPPORTED_FORMAT);
    } else {
      zip64 = true;
    }
  }
  zip64 = zip64 || false;
  return {
    maximumCompressedSize,
    resolvedOptions: {
      dataDescriptor,
      emptyEntry,
      completeHeader,
      knownCompressedSize: completeHeader ? maximumCompressedSize : UNDEFINED_VALUE,
      zip64,
      zip64Enabled,
      unknownSize,
      zip64UncompressedSize,
      zip64CompressedSize,
      uncompressedSize,
      level,
      compressionMethod,
      encrypted: encryptedEntry
    }
  };
}
async function getFileEntry(zipWriter, name, reader, entryInfo, options) {
  const {
    fileEntries,
    writer
  } = zipWriter;
  const {
    keepOrder,
    dataDescriptor,
    emptyEntry,
    completeHeader,
    signal
  } = options;
  const {
    headerInfo,
    fileEntry: pendingFileEntry,
    previousFileEntry,
    releaseLockFileEntry
  } = entryInfo;
  const usdz = zipWriter.options[OPTION_USDZ];
  let fileEntry = pendingFileEntry;
  let bufferedWrite;
  let directWrite;
  let releaseLockWriter;
  let writingBufferedEntryData;
  let writingEntryData;
  let writerSizeBeforeEntry;
  let flushedBufferedSize = 0;
  let fileWriter;
  const lockPreviousFileEntry = keepOrder && previousFileEntry ? previousFileEntry.lockFileEntry : UNDEFINED_VALUE;
  fileEntries.set(name, fileEntry);
  try {
    if (options.bufferedWrite || !keepOrder || zipWriter.writerLocked || zipWriter.bufferedWrites || zipWriter.directWrites || !dataDescriptor && !emptyEntry && !completeHeader) {
      bufferedWrite = true;
      zipWriter.bufferedWrites++;
      if (options.createTempStream) {
        fileWriter = await options.createTempStream();
      } else {
        fileWriter = new TransformStream(UNDEFINED_VALUE, UNDEFINED_VALUE, { highWaterMark: INFINITY_VALUE });
      }
      fileWriter.size = 0;
      await initStream(writer);
    } else {
      directWrite = true;
      zipWriter.directWrites++;
      fileWriter = writer;
      await lockPreviousFileEntry;
      await requestLockWriter();
    }
    await initStream(fileWriter);
    const diskOffset = getDiskOffset2(writer);
    if (zipWriter.addSplitZipSignature && !bufferedWrite) {
      await writeSplitZipSignature(zipWriter, writer);
    }
    if (usdz && !bufferedWrite) {
      appendExtraFieldUSDZ(entryInfo, zipWriter.offset - diskOffset);
    }
    const { localHeaderArray } = headerInfo;
    if (!bufferedWrite) {
      await skipDiskIfNeeded();
    }
    const diskNumberStart = getDiskNumber(writer);
    const entryOffset = getSegmentOffset(zipWriter, writer);
    fileEntry.diskNumberStart = diskNumberStart;
    if (!bufferedWrite) {
      writingEntryData = true;
      writerSizeBeforeEntry = writer.size;
      await writeData(fileWriter, localHeaderArray);
    }
    fileEntry = await createFileEntry(reader, fileWriter, fileEntry, entryInfo, getConfiguration(), options);
    if (!bufferedWrite) {
      writingEntryData = false;
    }
    fileEntries.set(name, fileEntry);
    fileEntry.filename = name;
    if (bufferedWrite) {
      await Promise.all([fileWriter.writable.getWriter().close(), lockPreviousFileEntry]);
      await requestLockWriter();
      if (zipWriter.addSplitZipSignature) {
        await writeSplitZipSignature(zipWriter, writer);
      }
      writingBufferedEntryData = true;
      writerSizeBeforeEntry = writer.size;
      await skipDiskIfNeeded();
      fileEntry.diskNumberStart = getDiskNumber(writer);
      fileEntry.offset = getSegmentOffset(zipWriter, writer);
      if (usdz) {
        const previousMetadataSize = entryInfo.metadataSize;
        appendExtraFieldUSDZ(entryInfo, zipWriter.offset - getDiskOffset2(writer));
        fileEntry.size += entryInfo.metadataSize - previousMetadataSize;
      }
      updateLocalHeader(fileEntry, headerInfo.localHeaderView, options);
      await writeData(writer, headerInfo.localHeaderArray);
      await flushBufferedData(fileWriter.readable, writer, signal, (chunkLength) => flushedBufferedSize += chunkLength);
      writer.size += fileWriter.size;
      writingBufferedEntryData = false;
    } else {
      fileEntry.diskNumberStart = diskNumberStart;
      fileEntry.offset = entryOffset;
    }
    zipWriter.offset += fileEntry.size;
    return fileEntry;
  } catch (error) {
    if (writingBufferedEntryData || writingEntryData) {
      zipWriter.hasCorruptedEntries = true;
      if (error) {
        try {
          error.corruptedEntry = true;
        } catch {
        }
      }
      zipWriter.offset += writer.size - writerSizeBeforeEntry;
      if (bufferedWrite) {
        zipWriter.offset += flushedBufferedSize;
      }
    }
    fileEntries.delete(name);
    throw error;
  } finally {
    if (bufferedWrite) {
      zipWriter.bufferedWrites--;
    }
    if (directWrite) {
      zipWriter.directWrites--;
    }
    if (releaseLockFileEntry) {
      releaseLockFileEntry(lockPreviousFileEntry);
    }
    if (releaseLockWriter) {
      releaseLockWriter();
    }
    if (bufferedWrite && fileWriter && fileWriter.dispose) {
      try {
        await fileWriter.dispose();
      } catch {
      }
    }
  }
  async function requestLockWriter() {
    zipWriter.writerLocked = true;
    const { lockWriter } = zipWriter;
    zipWriter.lockWriter = new Promise((resolve) => releaseLockWriter = () => {
      zipWriter.writerLocked = false;
      resolve();
    });
    await lockWriter;
  }
  async function skipDiskIfNeeded() {
    if (exceedsAvailableSize(writer, getLength(headerInfo.localHeaderArray))) {
      await writer.closeDisk();
    }
  }
}
async function createFileEntry(reader, writer, { diskNumberStart, lockFileEntry }, entryInfo, config2, options) {
  const {
    headerInfo,
    dataDescriptorInfo,
    metadataSize
  } = entryInfo;
  const {
    headerArray,
    headerView,
    lastModDate,
    rawLastModDate,
    encrypted,
    compressed,
    version,
    compressionMethod,
    rawExtraFieldZip64,
    localExtraFieldZip64Length,
    rawExtraFieldExtendedTimestamp,
    extraFieldExtendedTimestampFlag,
    extraFieldExtendedTimestampTime,
    rawExtraFieldNTFS,
    rawExtraFieldUnix,
    rawCentralExtraFieldUnix,
    rawExtraFieldAES
  } = headerInfo;
  const { dataDescriptorArray } = dataDescriptorInfo;
  const {
    rawFilename,
    lastAccessDate,
    creationDate,
    password,
    rawPassword,
    level,
    useUnicodeFileNames,
    zip64,
    zip64Enabled,
    zip64UncompressedSize,
    zip64CompressedSize,
    zipCrypto,
    dataDescriptor,
    directory,
    executable,
    versionMadeBy,
    rawComment,
    rawExtraField,
    rawCentralExtraField,
    useWebWorkers,
    onstart,
    onprogress,
    onend,
    signal,
    encryptionStrength,
    extendedTimestamp,
    msDosCompatible,
    internalFileAttributes,
    externalFileAttributes,
    uid,
    gid,
    unixMode,
    symlink,
    setuid,
    setgid,
    sticky,
    unixExternalUpper,
    msdosAttributesRaw,
    msdosAttributes,
    useCompressionStream,
    passThroughCompression,
    passThroughEncryption,
    format,
    codecURI
  } = options;
  const fileEntry = {
    lockFileEntry,
    versionMadeBy,
    zip64,
    zip64Enabled,
    directory: Boolean(directory),
    executable: Boolean(executable),
    filenameUTF8: Boolean(useUnicodeFileNames),
    rawFilename,
    commentUTF8: Boolean(useUnicodeFileNames),
    rawComment,
    rawExtraFieldZip64,
    localExtraFieldZip64Length,
    rawExtraFieldExtendedTimestamp,
    rawExtraFieldNTFS,
    rawExtraFieldUnix,
    rawCentralExtraFieldUnix,
    rawExtraFieldAES,
    rawExtraField,
    rawCentralExtraField,
    extendedTimestamp,
    msDosCompatible,
    internalFileAttributes,
    externalFileAttributes,
    diskNumberStart,
    uid,
    gid,
    unixMode,
    symlink: Boolean(symlink),
    setuid,
    setgid,
    sticky,
    unixExternalUpper,
    msdosAttributesRaw,
    msdosAttributes
  };
  let {
    crc32,
    uncompressedSize
  } = options;
  let compressedSize = 0;
  if (!passThroughCompression) {
    uncompressedSize = 0;
  }
  const { writable } = writer;
  if (reader) {
    const size = reader.size;
    const readable = toCompatibleReadable(createReadable(reader, { size }));
    const workerOptions = {
      options: {
        codecType: CODEC_DEFLATE,
        inputSize: size,
        level,
        rawPassword,
        password,
        encryptionStrength,
        zipCrypto: encrypted && zipCrypto,
        passwordVerification: encrypted && zipCrypto && rawLastModDate >> 8 & MAX_8_BITS,
        computeCrc32: !passThroughCompression,
        compressed: compressed && !passThroughCompression,
        encrypted: encrypted && !passThroughEncryption,
        useWebWorkers,
        useCompressionStream,
        format,
        codecURI,
        compressionMethod
      },
      config: config2,
      streamOptions: { signal, size, onstart, onprogress, onend }
    };
    try {
      const result = await runWorker2({ readable, writable }, workerOptions);
      compressedSize = result.outputSize;
      writer.size += compressedSize;
      throwIfAborted(signal);
      if (!passThroughCompression) {
        uncompressedSize = result.inputSize;
        if (!encrypted || zipCrypto) {
          crc32 = result.crc32;
        }
      }
      if (!zip64CompressedSize && compressedSize >= MAX_32_BITS || !zip64UncompressedSize && uncompressedSize >= MAX_32_BITS) {
        throw new Error(ERR_UNSUPPORTED_FORMAT);
      }
    } catch (error) {
      const { outputSize: failedOutputSize } = workerOptions;
      if (failedOutputSize !== UNDEFINED_VALUE) {
        writer.size += failedOutputSize;
      } else if (isErrorObject(error) && error.outputSize !== UNDEFINED_VALUE) {
        writer.size += error.outputSize;
      }
      throw error;
    }
  }
  setEntryInfo({
    crc32,
    compressedSize,
    uncompressedSize,
    headerInfo,
    dataDescriptorInfo
  }, options);
  if (dataDescriptor) {
    await writeData(writer, dataDescriptorArray);
  }
  Object.assign(fileEntry, {
    uncompressedSize,
    compressedSize,
    lastModDate,
    rawLastModDate,
    creationDate,
    lastAccessDate,
    encrypted: Boolean(encrypted),
    zipCrypto: Boolean(zipCrypto),
    size: metadataSize + compressedSize,
    compressionMethod,
    version,
    headerArray,
    headerView,
    signature: crc32,
    crc32: encrypted && !zipCrypto && !passThroughCompression ? UNDEFINED_VALUE : crc32,
    extraFieldExtendedTimestampFlag,
    extraFieldExtendedTimestampTime,
    zip64UncompressedSize,
    zip64CompressedSize
  });
  return fileEntry;
}
function getHeaderInfo(options) {
  const {
    rawFilename,
    lastModDate,
    rawLastModDate: rawLastModDateOption,
    lastAccessDate,
    creationDate,
    level,
    zip64,
    zipCrypto,
    useUnicodeFileNames,
    dataDescriptor,
    directory,
    rawExtraField,
    rawLocalExtraField,
    encryptionStrength,
    extendedTimestamp,
    ntfsTimestamp,
    passThroughCompression,
    encrypted,
    zip64UncompressedSize,
    zip64CompressedSize,
    uncompressedSize,
    knownCompressedSize,
    unknownSize,
    crc32
  } = options;
  let { version, compressionMethod } = options;
  const compressedSize = dataDescriptor ? UNDEFINED_VALUE : knownCompressedSize;
  const compressed = !directory && isCompressed(compressionMethod, level);
  let rawLocalExtraFieldZip64;
  const uncompressedFile = passThroughCompression || !compressed;
  const zip64ExtraFieldComplete = zip64 && (options.bufferedWrite || !dataDescriptor || (!zip64UncompressedSize && !zip64CompressedSize || uncompressedFile && !unknownSize));
  const writeLocalExtraFieldZip64 = zip64ExtraFieldComplete || zip64 && dataDescriptor && (zip64UncompressedSize || zip64CompressedSize);
  if (zip64 && (zip64UncompressedSize || zip64CompressedSize)) {
    const length = 4 + 16;
    const extraFieldZip64 = createRecordWriter(length);
    extraFieldZip64.writeUint16(EXTRAFIELD_TYPE_ZIP64);
    extraFieldZip64.writeUint16(length - 4);
    rawLocalExtraFieldZip64 = extraFieldZip64.array;
    if (zip64ExtraFieldComplete) {
      extraFieldZip64.writeUint64(uncompressedSize);
      if (uncompressedFile) {
        const encryptionOverhead = getEncryptionOverhead(encrypted, zipCrypto, encryptionStrength);
        extraFieldZip64.writeUint64(passThroughCompression ? compressedSize === UNDEFINED_VALUE ? 0 : compressedSize : uncompressedSize + encryptionOverhead);
      }
    }
  } else {
    rawLocalExtraFieldZip64 = EMPTY_UINT8_ARRAY;
  }
  let rawExtraFieldAES;
  if (encrypted && !zipCrypto) {
    const extraFieldAES = createRecordWriter(getLength(EXTRAFIELD_DATA_AES) + 2);
    extraFieldAES.writeUint16(EXTRAFIELD_TYPE_AES);
    extraFieldAES.writeBytes(EXTRAFIELD_DATA_AES);
    rawExtraFieldAES = extraFieldAES.array;
    rawExtraFieldAES[8] = encryptionStrength;
  } else {
    rawExtraFieldAES = EMPTY_UINT8_ARRAY;
  }
  let rawExtraFieldNTFS;
  let rawExtraFieldExtendedTimestamp;
  let extraFieldExtendedTimestampFlag;
  let extraFieldExtendedTimestampTime;
  if (extendedTimestamp) {
    const lastModTimeUnix = getTimeUnix(lastModDate);
    const lastModTimeUnixInRange = inUnixTimeRange(lastModTimeUnix);
    if (lastModTimeUnixInRange) {
      const extraFieldTimestampLength = 9 + (lastAccessDate ? 4 : 0) + (creationDate ? 4 : 0);
      const extraFieldTimestamp = createRecordWriter(extraFieldTimestampLength);
      extraFieldExtendedTimestampFlag = 1 + (lastAccessDate ? 2 : 0) + (creationDate ? 4 : 0);
      extraFieldExtendedTimestampTime = lastModTimeUnix;
      extraFieldTimestamp.writeUint16(EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP);
      extraFieldTimestamp.writeUint16(extraFieldTimestampLength - 4);
      extraFieldTimestamp.writeUint8(extraFieldExtendedTimestampFlag);
      extraFieldTimestamp.writeUint32(lastModTimeUnix);
      if (lastAccessDate) {
        extraFieldTimestamp.writeUint32(clampUnixTime(getTimeUnix(lastAccessDate)));
      }
      if (creationDate) {
        extraFieldTimestamp.writeUint32(clampUnixTime(getTimeUnix(creationDate)));
      }
      rawExtraFieldExtendedTimestamp = extraFieldTimestamp.array;
    } else {
      rawExtraFieldExtendedTimestamp = EMPTY_UINT8_ARRAY;
    }
    const writeExtraFieldNTFS = ntfsTimestamp === UNDEFINED_VALUE ? !lastModTimeUnixInRange || Boolean(lastAccessDate || creationDate) : ntfsTimestamp;
    if (writeExtraFieldNTFS) {
      try {
        const lastModTimeNTFS = getTimeNTFS(lastModDate);
        const extraFieldNTFS = createRecordWriter(36);
        extraFieldNTFS.writeUint16(EXTRAFIELD_TYPE_NTFS);
        extraFieldNTFS.writeUint16(32);
        extraFieldNTFS.skip(4);
        extraFieldNTFS.writeUint16(EXTRAFIELD_TYPE_NTFS_TAG1);
        extraFieldNTFS.writeUint16(24);
        extraFieldNTFS.writeUint64(lastModTimeNTFS);
        extraFieldNTFS.writeUint64(lastAccessDate ? getTimeNTFS(lastAccessDate) : lastModTimeNTFS);
        extraFieldNTFS.writeUint64(creationDate ? getTimeNTFS(creationDate) : lastModTimeNTFS);
        rawExtraFieldNTFS = extraFieldNTFS.array;
      } catch {
        rawExtraFieldNTFS = EMPTY_UINT8_ARRAY;
      }
    } else {
      rawExtraFieldNTFS = EMPTY_UINT8_ARRAY;
    }
  } else {
    rawExtraFieldNTFS = rawExtraFieldExtendedTimestamp = EMPTY_UINT8_ARRAY;
  }
  let rawExtraFieldUnix;
  let rawCentralExtraFieldUnix;
  try {
    const { uid, gid, unixExtraFieldType } = options;
    if (unixExtraFieldType == INFOZIP_EXTRA_FIELD_TYPE && (uid !== UNDEFINED_VALUE || gid !== UNDEFINED_VALUE)) {
      const uidBytes = packUnixId(uid === UNDEFINED_VALUE ? 0 : uid);
      const gidBytes = packUnixId(gid === UNDEFINED_VALUE ? 0 : gid);
      const payloadLength = 3 + uidBytes.length + gidBytes.length;
      const extraFieldUnix = createRecordWriter(4 + payloadLength);
      extraFieldUnix.writeUint16(EXTRAFIELD_TYPE_INFOZIP);
      extraFieldUnix.writeUint16(payloadLength);
      extraFieldUnix.writeUint8(1);
      extraFieldUnix.writeUint8(uidBytes.length);
      extraFieldUnix.writeBytes(uidBytes);
      extraFieldUnix.writeUint8(gidBytes.length);
      extraFieldUnix.writeBytes(gidBytes);
      rawExtraFieldUnix = rawCentralExtraFieldUnix = extraFieldUnix.array;
    } else if (unixExtraFieldType == UNIX_EXTRA_FIELD_TYPE && (uid !== UNDEFINED_VALUE || gid !== UNDEFINED_VALUE)) {
      const extraFieldUnix = createRecordWriter(8);
      extraFieldUnix.writeUint16(EXTRAFIELD_TYPE_UNIX);
      extraFieldUnix.writeUint16(4);
      extraFieldUnix.writeUint16((uid === UNDEFINED_VALUE ? 0 : uid) & MAX_16_BITS);
      extraFieldUnix.writeUint16((gid === UNDEFINED_VALUE ? 0 : gid) & MAX_16_BITS);
      rawExtraFieldUnix = extraFieldUnix.array;
      const centralExtraFieldUnix = createRecordWriter(4);
      centralExtraFieldUnix.writeUint16(EXTRAFIELD_TYPE_UNIX);
      centralExtraFieldUnix.writeUint16(0);
      rawCentralExtraFieldUnix = centralExtraFieldUnix.array;
    } else {
      rawExtraFieldUnix = rawCentralExtraFieldUnix = EMPTY_UINT8_ARRAY;
    }
  } catch {
    rawExtraFieldUnix = rawCentralExtraFieldUnix = EMPTY_UINT8_ARRAY;
  }
  if (compressionMethod === UNDEFINED_VALUE) {
    compressionMethod = compressed ? COMPRESSION_METHOD_DEFLATE : COMPRESSION_METHOD_STORE;
  }
  if (version === UNDEFINED_VALUE) {
    version = compressionMethod == COMPRESSION_METHOD_STORE && !directory && !encrypted ? VERSION_STORE : VERSION_DEFLATE;
  }
  const { codecVersionNeeded } = options;
  if (compressed && codecVersionNeeded !== UNDEFINED_VALUE) {
    version = version > codecVersionNeeded ? version : codecVersionNeeded;
  }
  if (zip64) {
    version = version > VERSION_ZIP64 ? version : VERSION_ZIP64;
  }
  if (encrypted && !zipCrypto) {
    version = version > VERSION_AES ? version : VERSION_AES;
    if (passThroughCompression && crc32 !== UNDEFINED_VALUE) {
      rawExtraFieldAES[EXTRAFIELD_OFFSET_AES_VENDOR_VERSION] = VENDOR_VERSION_AE_12;
    }
    setUint16(getDataView(rawExtraFieldAES), EXTRAFIELD_OFFSET_AES_COMPRESSION_METHOD, compressionMethod);
    compressionMethod = COMPRESSION_METHOD_AES;
  }
  const localExtraFieldZip64Length = writeLocalExtraFieldZip64 ? getLength(rawLocalExtraFieldZip64) : 0;
  const extraFieldLength = localExtraFieldZip64Length + getLength(rawExtraFieldAES, rawExtraFieldExtendedTimestamp, rawExtraFieldNTFS, rawExtraFieldUnix, rawExtraField, rawLocalExtraField);
  const maximumUsdzExtraFieldLength = options[OPTION_USDZ] ? EXTRAFIELD_USDZ_MAX_LENGTH : 0;
  if (extraFieldLength + maximumUsdzExtraFieldLength > MAX_16_BITS) {
    throw new Error(ERR_INVALID_EXTRAFIELD_DATA);
  }
  const dosLastModDate = new Date(Math.ceil(Math.floor(lastModDate.getTime() / 1e3) / 2) * 2e3);
  const clampedLastModDate = dosLastModDate < MIN_DATE ? MIN_DATE : dosLastModDate > MAX_DATE ? MAX_DATE : dosLastModDate;
  const storedLastModDate = getLength(rawExtraFieldExtendedTimestamp) ? new Date(getTimeUnix(lastModDate) * 1e3) : getLength(rawExtraFieldNTFS) ? lastModDate : clampedLastModDate;
  const {
    headerArray,
    headerView,
    rawLastModDate
  } = getHeaderArrayData({
    version,
    bitFlag: getBitFlag(level, useUnicodeFileNames, dataDescriptor, encrypted, compressionMethod),
    compressionMethod,
    uncompressedSize,
    compressedSize,
    lastModDate: clampedLastModDate,
    rawLastModDate: rawLastModDateOption,
    rawFilename,
    zip64CompressedSize,
    zip64UncompressedSize,
    extraFieldLength
  });
  if (compressedSize !== UNDEFINED_VALUE && passThroughCompression && crc32 !== UNDEFINED_VALUE) {
    setUint32(headerView, HEADER_OFFSET_SIGNATURE, crc32);
  }
  const localHeader = createRecordWriter(HEADER_SIZE + getLength(rawFilename) + extraFieldLength);
  const localHeaderArray = localHeader.array;
  const localHeaderView = getDataView(localHeaderArray);
  localHeader.writeUint32(LOCAL_FILE_HEADER_SIGNATURE);
  localHeader.writeBytes(headerArray);
  localHeader.writeBytes(rawFilename);
  if (writeLocalExtraFieldZip64) {
    localHeader.writeBytes(rawLocalExtraFieldZip64);
  }
  localHeader.writeBytes(rawExtraFieldAES);
  localHeader.writeBytes(rawExtraFieldExtendedTimestamp);
  localHeader.writeBytes(rawExtraFieldNTFS);
  localHeader.writeBytes(rawExtraFieldUnix);
  localHeader.writeBytes(rawExtraField);
  localHeader.writeBytes(rawLocalExtraField);
  if (dataDescriptor) {
    if (!zip64CompressedSize) {
      setUint32(localHeaderView, HEADER_OFFSET_COMPRESSED_SIZE + LOCAL_HEADER_COMMON_OFFSET, 0);
    }
    if (!zip64UncompressedSize) {
      setUint32(localHeaderView, HEADER_OFFSET_UNCOMPRESSED_SIZE + LOCAL_HEADER_COMMON_OFFSET, 0);
    }
  }
  return {
    localHeaderArray,
    localHeaderView,
    headerArray,
    headerView,
    lastModDate: storedLastModDate,
    lastModDateClamped: storedLastModDate === clampedLastModDate && dosLastModDate.getTime() != clampedLastModDate.getTime(),
    rawLastModDate,
    encrypted,
    compressed,
    version,
    compressionMethod,
    extraFieldExtendedTimestampFlag,
    extraFieldExtendedTimestampTime,
    rawExtraFieldZip64: EMPTY_UINT8_ARRAY,
    localExtraFieldZip64Length,
    rawExtraFieldExtendedTimestamp,
    rawExtraFieldNTFS,
    rawExtraFieldUnix,
    rawCentralExtraFieldUnix,
    rawExtraFieldAES,
    extraFieldLength
  };
}
function appendExtraFieldUSDZ(entryInfo, zipWriterOffset) {
  const { headerInfo } = entryInfo;
  let { localHeaderArray, extraFieldLength } = headerInfo;
  let extraBytesLength = 64 - (zipWriterOffset + getLength(localHeaderArray)) % 64;
  if (extraBytesLength < 4) {
    extraBytesLength += 64;
  }
  const rawExtraFieldUSDZ = new Uint8Array(extraBytesLength);
  const extraFieldUSDZView = getDataView(rawExtraFieldUSDZ);
  setUint16(extraFieldUSDZView, 0, EXTRAFIELD_TYPE_USDZ);
  setUint16(extraFieldUSDZView, 2, extraBytesLength - 4);
  const previousLocalHeaderArray = localHeaderArray;
  headerInfo.localHeaderArray = localHeaderArray = new Uint8Array(getLength(previousLocalHeaderArray) + extraBytesLength);
  arraySet(localHeaderArray, previousLocalHeaderArray);
  arraySet(localHeaderArray, rawExtraFieldUSDZ, getLength(previousLocalHeaderArray));
  const localHeaderArrayView = getDataView(localHeaderArray);
  setUint16(localHeaderArrayView, 28, extraFieldLength + extraBytesLength);
  headerInfo.localHeaderView = localHeaderArrayView;
  entryInfo.metadataSize += extraBytesLength;
}
function packUnixId(id) {
  const dataArray = new Uint8Array(4);
  const dataView = getDataView(dataArray);
  dataView.setUint32(0, id, true);
  let length = 4;
  while (length > 1 && dataArray[length - 1] === 0) {
    length--;
  }
  return dataArray.subarray(0, length);
}
function normalizeMsdosAttributes(msdosAttributesRaw, msdosAttributes) {
  if (msdosAttributesRaw !== UNDEFINED_VALUE) {
    msdosAttributesRaw = msdosAttributesRaw & MAX_8_BITS;
  } else if (msdosAttributes !== UNDEFINED_VALUE) {
    const { readOnly, hidden, system, directory: msdDir, archive } = msdosAttributes;
    let raw = 0;
    if (readOnly) raw |= FILE_ATTR_MSDOS_READONLY_MASK;
    if (hidden) raw |= FILE_ATTR_MSDOS_HIDDEN_MASK;
    if (system) raw |= FILE_ATTR_MSDOS_SYSTEM_MASK;
    if (msdDir) raw |= FILE_ATTR_MSDOS_DIR_MASK;
    if (archive) raw |= FILE_ATTR_MSDOS_ARCHIVE_MASK;
    msdosAttributesRaw = raw & MAX_8_BITS;
  }
  if (msdosAttributes === UNDEFINED_VALUE) {
    msdosAttributes = {
      readOnly: Boolean(msdosAttributesRaw & FILE_ATTR_MSDOS_READONLY_MASK),
      hidden: Boolean(msdosAttributesRaw & FILE_ATTR_MSDOS_HIDDEN_MASK),
      system: Boolean(msdosAttributesRaw & FILE_ATTR_MSDOS_SYSTEM_MASK),
      directory: Boolean(msdosAttributesRaw & FILE_ATTR_MSDOS_DIR_MASK),
      archive: Boolean(msdosAttributesRaw & FILE_ATTR_MSDOS_ARCHIVE_MASK)
    };
  }
  return { msdosAttributesRaw, msdosAttributes };
}
function getDataDescriptorInfo({
  zip64,
  dataDescriptor,
  dataDescriptorSignature
}) {
  let dataDescriptorArray = EMPTY_UINT8_ARRAY;
  let dataDescriptorView, dataDescriptorOffset = 0;
  let dataDescriptorLength = zip64 ? DATA_DESCRIPTOR_RECORD_ZIP_64_LENGTH : DATA_DESCRIPTOR_RECORD_LENGTH;
  if (dataDescriptorSignature) {
    dataDescriptorLength += DATA_DESCRIPTOR_RECORD_SIGNATURE_LENGTH;
  }
  if (dataDescriptor) {
    dataDescriptorArray = new Uint8Array(dataDescriptorLength);
    dataDescriptorView = getDataView(dataDescriptorArray);
    if (dataDescriptorSignature) {
      dataDescriptorOffset = DATA_DESCRIPTOR_RECORD_SIGNATURE_LENGTH;
      setUint32(dataDescriptorView, 0, DATA_DESCRIPTOR_RECORD_SIGNATURE);
    }
  }
  return {
    dataDescriptorArray,
    dataDescriptorView,
    dataDescriptorOffset
  };
}
function setEntryInfo({
  crc32,
  compressedSize,
  uncompressedSize,
  headerInfo,
  dataDescriptorInfo
}, {
  zip64,
  zipCrypto,
  passThroughCompression,
  dataDescriptor
}) {
  const {
    headerView,
    encrypted
  } = headerInfo;
  const {
    dataDescriptorView,
    dataDescriptorOffset
  } = dataDescriptorInfo;
  if ((!encrypted || zipCrypto || passThroughCompression) && crc32 !== UNDEFINED_VALUE) {
    setUint32(headerView, HEADER_OFFSET_SIGNATURE, crc32);
    if (dataDescriptor) {
      setUint32(dataDescriptorView, dataDescriptorOffset, crc32);
    }
  }
  if (zip64) {
    if (dataDescriptor) {
      setBigUint64(dataDescriptorView, dataDescriptorOffset + 4, BigInt(compressedSize));
      setBigUint64(dataDescriptorView, dataDescriptorOffset + 12, BigInt(uncompressedSize));
    }
  } else {
    setUint32(headerView, HEADER_OFFSET_COMPRESSED_SIZE, compressedSize);
    setUint32(headerView, HEADER_OFFSET_UNCOMPRESSED_SIZE, uncompressedSize);
    if (dataDescriptor) {
      setUint32(dataDescriptorView, dataDescriptorOffset + 4, compressedSize);
      setUint32(dataDescriptorView, dataDescriptorOffset + 8, uncompressedSize);
    }
  }
}
function updateLocalHeader({
  rawFilename,
  encrypted,
  zip64,
  localExtraFieldZip64Length,
  crc32,
  compressedSize,
  uncompressedSize,
  zip64UncompressedSize,
  zip64CompressedSize
}, localHeaderView, { dataDescriptor, passThroughCompression }) {
  if (!dataDescriptor) {
    if (!encrypted || passThroughCompression && crc32 !== UNDEFINED_VALUE) {
      setUint32(localHeaderView, HEADER_OFFSET_SIGNATURE + LOCAL_HEADER_COMMON_OFFSET, crc32);
    }
    if (!zip64CompressedSize) {
      setUint32(localHeaderView, HEADER_OFFSET_COMPRESSED_SIZE + LOCAL_HEADER_COMMON_OFFSET, compressedSize);
    }
    if (!zip64UncompressedSize) {
      setUint32(localHeaderView, HEADER_OFFSET_UNCOMPRESSED_SIZE + LOCAL_HEADER_COMMON_OFFSET, uncompressedSize);
    }
  }
  if (zip64 && localExtraFieldZip64Length) {
    const localHeaderOffset = HEADER_SIZE + getLength(rawFilename) + 4;
    setBigUint64(localHeaderView, localHeaderOffset, BigInt(uncompressedSize));
    setBigUint64(localHeaderView, localHeaderOffset + 8, BigInt(compressedSize));
  }
}
async function closeFile(zipWriter, comment, options) {
  const { directoryDataLength, zip64Entries } = createDirectoryRecords(zipWriter.fileEntries);
  const { directoryStart, directoryEnd, directoryArray } = await writeDirectoryRecords(zipWriter, directoryDataLength, options);
  const signatureLength = await writeDigitalSignatureRecord(zipWriter, directoryArray, options);
  await writeEndOfDirectoryRecord(zipWriter, comment, options, { directoryStart, directoryEnd, directoryDataLength, signatureLength, zip64Entries });
}
function createDirectoryRecords(files) {
  let directoryDataLength = 0;
  let zip64Entries = false;
  for (const [, fileEntry] of files) {
    const {
      rawFilename,
      rawExtraFieldAES,
      rawComment,
      rawExtraFieldNTFS,
      rawCentralExtraFieldUnix,
      rawExtraField,
      rawCentralExtraField,
      extraFieldExtendedTimestampFlag,
      extraFieldExtendedTimestampTime,
      zip64Enabled,
      uncompressedSize,
      compressedSize
    } = fileEntry;
    let { zip64UncompressedSize, zip64CompressedSize } = fileEntry;
    if (!zip64Enabled) {
      if (zip64UncompressedSize && uncompressedSize < MAX_32_BITS) {
        zip64UncompressedSize = fileEntry.zip64UncompressedSize = false;
      }
      if (zip64CompressedSize && compressedSize < MAX_32_BITS) {
        zip64CompressedSize = fileEntry.zip64CompressedSize = false;
      }
    }
    zip64Entries = zip64Entries || zip64UncompressedSize || zip64CompressedSize;
    const zip64Offset = fileEntry.offset >= MAX_32_BITS;
    const zip64DiskNumberStart = fileEntry.diskNumberStart >= MAX_16_BITS;
    let rawExtraFieldZip64;
    if (zip64Offset || zip64DiskNumberStart || zip64UncompressedSize || zip64CompressedSize) {
      const length = 4 + (zip64UncompressedSize ? 8 : 0) + (zip64CompressedSize ? 8 : 0) + (zip64Offset ? 8 : 0) + (zip64DiskNumberStart ? 4 : 0);
      const extraFieldZip64 = createRecordWriter(length);
      extraFieldZip64.writeUint16(EXTRAFIELD_TYPE_ZIP64);
      extraFieldZip64.writeUint16(length - 4);
      if (zip64UncompressedSize) {
        extraFieldZip64.writeUint64(uncompressedSize);
      }
      if (zip64CompressedSize) {
        extraFieldZip64.writeUint64(compressedSize);
      }
      if (zip64Offset) {
        extraFieldZip64.writeUint64(fileEntry.offset);
      }
      if (zip64DiskNumberStart) {
        extraFieldZip64.writeUint32(fileEntry.diskNumberStart);
      }
      rawExtraFieldZip64 = extraFieldZip64.array;
    } else {
      rawExtraFieldZip64 = EMPTY_UINT8_ARRAY;
    }
    fileEntry.rawExtraFieldZip64 = rawExtraFieldZip64;
    fileEntry.zip64Offset = zip64Offset;
    fileEntry.zip64DiskNumberStart = zip64DiskNumberStart;
    let rawExtraFieldTimestamp;
    if (extraFieldExtendedTimestampTime === UNDEFINED_VALUE) {
      rawExtraFieldTimestamp = EMPTY_UINT8_ARRAY;
    } else {
      const extraFieldTimestamp = createRecordWriter(9);
      extraFieldTimestamp.writeUint16(EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP);
      extraFieldTimestamp.writeUint16(5);
      extraFieldTimestamp.writeUint8(extraFieldExtendedTimestampFlag);
      extraFieldTimestamp.writeUint32(extraFieldExtendedTimestampTime);
      rawExtraFieldTimestamp = extraFieldTimestamp.array;
    }
    fileEntry.rawExtraFieldExtendedTimestamp = rawExtraFieldTimestamp;
    const extraFieldLength = getLength(
      rawExtraFieldZip64,
      rawExtraFieldAES,
      rawExtraFieldNTFS,
      rawCentralExtraFieldUnix,
      rawExtraFieldTimestamp,
      rawExtraField,
      rawCentralExtraField
    );
    if (extraFieldLength > MAX_16_BITS) {
      throw new Error(ERR_INVALID_EXTRAFIELD_DATA);
    }
    directoryDataLength += CENTRAL_FILE_HEADER_LENGTH + getLength(rawFilename, rawComment) + extraFieldLength;
  }
  return { directoryDataLength, zip64Entries };
}
async function writeDirectoryRecords(zipWriter, directoryDataLength, options) {
  const { fileEntries, writer } = zipWriter;
  const directoryArray = new Uint8Array(directoryDataLength);
  await initStream(writer);
  let offset = 0;
  let directoryDiskOffset = 0;
  let directoryStartDiskNumber = getDiskNumber(writer);
  let directoryStartDiskOffset = getDiskOffset2(writer);
  let directoryEndDiskEntriesLength = 0;
  for (const [indexFileEntry, fileEntry] of Array.from(fileEntries.values()).entries()) {
    const {
      offset: fileEntryOffset,
      rawFilename,
      rawExtraFieldZip64,
      rawExtraFieldAES,
      rawExtraFieldExtendedTimestamp,
      rawExtraFieldNTFS,
      rawCentralExtraFieldUnix,
      rawExtraField,
      rawCentralExtraField,
      rawComment,
      versionMadeBy,
      headerArray,
      headerView,
      zip64UncompressedSize,
      zip64CompressedSize,
      zip64DiskNumberStart,
      zip64Offset,
      internalFileAttributes,
      externalFileAttributes,
      diskNumberStart,
      uncompressedSize,
      compressedSize
    } = fileEntry;
    const extraFieldLength = getLength(rawExtraFieldZip64, rawExtraFieldAES, rawExtraFieldExtendedTimestamp, rawExtraFieldNTFS, rawCentralExtraFieldUnix, rawExtraField, rawCentralExtraField);
    const directoryRecordLength = CENTRAL_FILE_HEADER_LENGTH + getLength(rawFilename, rawComment) + extraFieldLength;
    if (exceedsAvailableSize(writer, offset + directoryRecordLength - directoryDiskOffset)) {
      await writeData(writer, directoryArray.slice(directoryDiskOffset, offset));
      directoryDiskOffset = offset;
      directoryEndDiskEntriesLength = 0;
      await writer.closeDisk();
    }
    if (indexFileEntry == 0) {
      directoryStartDiskNumber = getDiskNumber(writer);
      directoryStartDiskOffset = getDiskOffset2(writer);
    }
    if (!zip64UncompressedSize) {
      setUint32(headerView, HEADER_OFFSET_UNCOMPRESSED_SIZE, uncompressedSize);
    }
    if (!zip64CompressedSize) {
      setUint32(headerView, HEADER_OFFSET_COMPRESSED_SIZE, compressedSize);
    }
    if ((zip64Offset || zip64DiskNumberStart) && fileEntry.version < VERSION_ZIP64) {
      setUint16(headerView, HEADER_OFFSET_VERSION, VERSION_ZIP64);
    }
    const directoryRecord = createRecordWriter(directoryRecordLength);
    directoryRecord.writeUint32(CENTRAL_FILE_HEADER_SIGNATURE);
    directoryRecord.writeUint16(versionMadeBy);
    directoryRecord.writeBytes(headerArray.subarray(0, HEADER_SIZE - 4 - 2));
    directoryRecord.writeUint16(extraFieldLength);
    directoryRecord.writeUint16(getLength(rawComment));
    directoryRecord.writeUint16(zip64DiskNumberStart ? MAX_16_BITS : diskNumberStart);
    directoryRecord.writeUint16(internalFileAttributes);
    directoryRecord.writeUint32(externalFileAttributes);
    directoryRecord.writeUint32(zip64Offset ? MAX_32_BITS : fileEntryOffset);
    directoryRecord.writeBytes(rawFilename);
    directoryRecord.writeBytes(rawExtraFieldZip64);
    directoryRecord.writeBytes(rawExtraFieldAES);
    directoryRecord.writeBytes(rawExtraFieldExtendedTimestamp);
    directoryRecord.writeBytes(rawExtraFieldNTFS);
    directoryRecord.writeBytes(rawCentralExtraFieldUnix);
    directoryRecord.writeBytes(rawExtraField);
    directoryRecord.writeBytes(rawCentralExtraField);
    directoryRecord.writeBytes(rawComment);
    arraySet(directoryArray, directoryRecord.array, offset);
    offset += directoryRecordLength;
    directoryEndDiskEntriesLength++;
    if (options.onprogress) {
      try {
        await options.onprogress(indexFileEntry + 1, fileEntries.size, new Entry(fileEntry));
      } catch {
      }
    }
  }
  await writeData(writer, directoryDiskOffset ? directoryArray.slice(directoryDiskOffset) : directoryArray);
  return {
    directoryStart: { diskNumber: directoryStartDiskNumber, diskOffset: directoryStartDiskOffset },
    directoryEnd: { diskNumber: getDiskNumber(writer), entriesLength: directoryEndDiskEntriesLength },
    directoryArray
  };
}
async function writeDigitalSignatureRecord(zipWriter, directoryArray, options) {
  const signCentralDirectory = getFunctionOptionValue2(zipWriter, options, OPTION_SIGN_CENTRAL_DIRECTORY);
  if (signCentralDirectory) {
    const signatureData = await signCentralDirectory(directoryArray);
    const signatureDataLength = getLength(signatureData);
    if (signatureDataLength > MAX_16_BITS) {
      throw new Error(ERR_INVALID_SIGNATURE_DATA);
    }
    const signatureRecord = createRecordWriter(6 + signatureDataLength);
    signatureRecord.writeUint32(DIGITAL_SIGNATURE_RECORD_SIGNATURE);
    signatureRecord.writeUint16(signatureDataLength);
    signatureRecord.writeBytes(signatureData);
    const { writer } = zipWriter;
    if (exceedsAvailableSize(writer, getLength(signatureRecord.array))) {
      await writer.closeDisk();
    }
    await writeData(writer, signatureRecord.array);
    return 6 + signatureDataLength;
  }
  return 0;
}
async function writeEndOfDirectoryRecord(zipWriter, comment, options, cdInfo) {
  const { writer } = zipWriter;
  const { directoryStart, directoryEnd, signatureLength, zip64Entries } = cdInfo;
  let { directoryDataLength } = cdInfo;
  let fileEntriesLength = zipWriter.fileEntries.size;
  let diskNumber = directoryStart.diskNumber;
  let directoryOffset = getSegmentOffset(zipWriter, directoryStart);
  const commentLength = getLength(comment);
  if (commentLength > MAX_16_BITS) {
    throw new Error(ERR_INVALID_COMMENT);
  }
  let zip64 = getOptionValue2(zipWriter, options, PROPERTY_NAME_ZIP64);
  let lastDiskNumber = getDiskNumber(writer);
  if (exceedsAvailableSize(writer, (zip64 ? ZIP64_END_OF_CENTRAL_DIR_TOTAL_LENGTH : END_OF_CENTRAL_DIR_LENGTH) + commentLength)) {
    lastDiskNumber++;
  }
  if (directoryOffset >= MAX_32_BITS || directoryDataLength >= MAX_32_BITS || fileEntriesLength >= MAX_16_BITS || lastDiskNumber >= MAX_16_BITS) {
    if (zip64 === false) {
      throw new Error(ERR_UNSUPPORTED_FORMAT);
    } else {
      zip64 = true;
    }
  } else if (zip64 === UNDEFINED_VALUE && zip64Entries) {
    zip64 = true;
  }
  const endOfdirectoryRecord = createRecordWriter(zip64 ? ZIP64_END_OF_CENTRAL_DIR_TOTAL_LENGTH : END_OF_CENTRAL_DIR_LENGTH);
  if (exceedsAvailableSize(writer, getLength(endOfdirectoryRecord.array) + commentLength)) {
    await writer.closeDisk();
  }
  lastDiskNumber = getDiskNumber(writer);
  let diskFileEntriesLength = lastDiskNumber == directoryEnd.diskNumber ? directoryEnd.entriesLength : 0;
  if (zip64) {
    endOfdirectoryRecord.writeUint32(ZIP64_END_OF_CENTRAL_DIR_SIGNATURE);
    endOfdirectoryRecord.writeUint64(44);
    endOfdirectoryRecord.writeUint16(45);
    endOfdirectoryRecord.writeUint16(45);
    endOfdirectoryRecord.writeUint32(lastDiskNumber);
    endOfdirectoryRecord.writeUint32(diskNumber);
    endOfdirectoryRecord.writeUint64(diskFileEntriesLength);
    endOfdirectoryRecord.writeUint64(fileEntriesLength);
    endOfdirectoryRecord.writeUint64(directoryDataLength);
    endOfdirectoryRecord.writeUint64(directoryOffset);
    endOfdirectoryRecord.writeUint32(ZIP64_END_OF_CENTRAL_DIR_LOCATOR_SIGNATURE);
    endOfdirectoryRecord.writeUint32(lastDiskNumber);
    endOfdirectoryRecord.writeUint64(BigInt(getSegmentOffset(zipWriter, writer)) + BigInt(directoryDataLength) + BigInt(signatureLength));
    endOfdirectoryRecord.writeUint32(lastDiskNumber + 1);
    const supportZip64SplitFile = getOptionValue2(zipWriter, options, OPTION_SUPPORT_ZIP64_SPLIT_FILE, true);
    if (supportZip64SplitFile) {
      lastDiskNumber = MAX_16_BITS;
      diskNumber = MAX_16_BITS;
    }
    diskFileEntriesLength = MAX_16_BITS;
    fileEntriesLength = MAX_16_BITS;
    directoryOffset = MAX_32_BITS;
    directoryDataLength = MAX_32_BITS;
  }
  endOfdirectoryRecord.writeUint32(END_OF_CENTRAL_DIR_SIGNATURE);
  endOfdirectoryRecord.writeUint16(lastDiskNumber);
  endOfdirectoryRecord.writeUint16(diskNumber);
  endOfdirectoryRecord.writeUint16(diskFileEntriesLength);
  endOfdirectoryRecord.writeUint16(fileEntriesLength);
  endOfdirectoryRecord.writeUint32(directoryDataLength);
  endOfdirectoryRecord.writeUint32(directoryOffset);
  endOfdirectoryRecord.writeUint16(commentLength);
  await writeData(writer, endOfdirectoryRecord.array);
  if (commentLength) {
    await writeData(writer, comment);
  }
}
function createRecordWriter(length) {
  const array = new Uint8Array(length);
  const view = getDataView(array);
  let offset = 0;
  return {
    array,
    writeUint8: (value) => {
      setUint8(view, offset, value);
      offset += 1;
    },
    writeUint16: (value) => {
      setUint16(view, offset, value);
      offset += 2;
    },
    writeUint32: (value) => {
      setUint32(view, offset, value);
      offset += 4;
    },
    writeUint64: (value) => {
      setBigUint64(view, offset, BigInt(value));
      offset += 8;
    },
    writeBytes: (value) => {
      arraySet(array, value, offset);
      offset += getLength(value);
    },
    skip: (count) => offset += count
  };
}
function getDiskNumber(writer) {
  const { diskNumber = 0 } = writer;
  return diskNumber;
}
function getDiskOffset2(writer) {
  const { diskOffset = 0 } = writer;
  return diskOffset;
}
function exceedsAvailableSize(writer, length) {
  const { availableSize = INFINITY_VALUE } = writer;
  return length > availableSize;
}
function getSegmentOffset(zipWriter, { diskNumber = 0, diskOffset = 0 }) {
  return zipWriter.offset - diskOffset - (diskNumber ? zipWriter.initialOffset : 0);
}
async function startsWithSplitZipSignature2(reader) {
  const signatureArray = await readUint8Array(reader, 0, SPLIT_ZIP_FILE_SIGNATURE_LENGTH);
  return getUint322(getDataView(signatureArray), 0) == SPLIT_ZIP_FILE_SIGNATURE;
}
function removeExtraFieldZip64(rawExtraField) {
  const rawExtraFieldView = getDataView(rawExtraField);
  let offsetExtraField = 0;
  while (offsetExtraField + 4 <= getLength(rawExtraField)) {
    const size = 4 + getUint162(rawExtraFieldView, offsetExtraField + 2);
    if (getUint162(rawExtraFieldView, offsetExtraField) == EXTRAFIELD_TYPE_ZIP64) {
      return removeExtraFieldZip64(concat(
        rawExtraField.subarray(0, offsetExtraField),
        rawExtraField.subarray(Math.min(offsetExtraField + size, getLength(rawExtraField)))
      ));
    }
    offsetExtraField += size;
  }
  return rawExtraField;
}
async function copyZipData(zipWriter, reader, entries, keptEntries, directoryOffset, compact, getEntryDataDescriptorLength2) {
  const { writer } = zipWriter;
  const entryPositions = /* @__PURE__ */ new Map();
  if (writer.closeDisk || compact) {
    const sortedEntries = Array.from(entries).sort((firstEntry, secondEntry) => getSourceOffset(reader, firstEntry) - getSourceOffset(reader, secondEntry));
    const regionEnds = getRegionEnds(reader, sortedEntries, directoryOffset);
    const keptEntrySet = new Set(keptEntries);
    const localHeaderLengths = /* @__PURE__ */ new Map();
    for (let indexEntry = 0; indexEntry < sortedEntries.length; indexEntry++) {
      const entry = sortedEntries[indexEntry];
      if (keptEntrySet.has(entry)) {
        const sourceOffset = getSourceOffset(reader, entry);
        const localHeaderLength = await getLocalHeaderLength(reader, sourceOffset);
        if (localHeaderLength === UNDEFINED_VALUE) {
          throw new Error(ERR_LOCAL_FILE_HEADER_NOT_FOUND);
        }
        let entryEnd = sourceOffset + localHeaderLength + entry.compressedSize;
        if (entry.bitFlag.dataDescriptor) {
          const dataDescriptorLength = await getEntryDataDescriptorLength2(reader, entryEnd, entry);
          entryEnd = dataDescriptorLength === UNDEFINED_VALUE ? Math.max(entryEnd, regionEnds[indexEntry]) : entryEnd + dataDescriptorLength;
        }
        if (entryEnd > regionEnds[indexEntry]) {
          throw new Error(ERR_OVERLAPPING_ENTRY);
        }
        regionEnds[indexEntry] = entryEnd;
        localHeaderLengths.set(entry, localHeaderLength);
      }
    }
    let copiedOffset = 0;
    let lastPosition;
    for (let indexEntry = 0; indexEntry < sortedEntries.length; indexEntry++) {
      const entry = sortedEntries[indexEntry];
      if (keptEntrySet.has(entry)) {
        const sourceOffset = getSourceOffset(reader, entry);
        if (sourceOffset < copiedOffset) {
          entryPositions.set(entry, lastPosition);
        } else {
          if (!compact) {
            await copyData(zipWriter, reader, copiedOffset, sourceOffset - copiedOffset);
          }
          if (writer.closeDisk && exceedsAvailableSize(writer, localHeaderLengths.get(entry))) {
            await writer.closeDisk();
          }
          lastPosition = {
            offset: getSegmentOffset(zipWriter, writer),
            diskNumberStart: getDiskNumber(writer)
          };
          entryPositions.set(entry, lastPosition);
          await copyData(zipWriter, reader, sourceOffset, regionEnds[indexEntry] - sourceOffset);
          copiedOffset = regionEnds[indexEntry];
        }
      }
    }
    if (!compact) {
      await copyData(zipWriter, reader, copiedOffset, directoryOffset - copiedOffset);
    }
  } else {
    const baseOffset = zipWriter.offset;
    await copyData(zipWriter, reader, 0, directoryOffset);
    entries.forEach((entry) => entryPositions.set(entry, {
      offset: baseOffset + getSourceOffset(reader, entry),
      diskNumberStart: 0
    }));
  }
  return entryPositions;
}
function getRegionEnds(reader, sortedEntries, directoryOffset) {
  const regionEnds = new Array(sortedEntries.length);
  let regionEnd = directoryOffset;
  for (let indexEntry = sortedEntries.length - 1; indexEntry >= 0; indexEntry--) {
    const sourceOffset = getSourceOffset(reader, sortedEntries[indexEntry]);
    const nextEntry = sortedEntries[indexEntry + 1];
    if (nextEntry && getSourceOffset(reader, nextEntry) > sourceOffset) {
      regionEnd = Math.min(getSourceOffset(reader, nextEntry), directoryOffset);
    }
    regionEnds[indexEntry] = regionEnd;
  }
  return regionEnds;
}
async function copyData(zipWriter, reader, offset, size) {
  if (size > 0) {
    const { writer } = zipWriter;
    let copiedLength = 0;
    try {
      await flushBufferedData(createReadable(reader, { offset, size }), writer, UNDEFINED_VALUE, (chunkLength) => copiedLength += chunkLength);
    } catch (error) {
      if (copiedLength) {
        zipWriter.hasCorruptedEntries = true;
        try {
          error.corruptedEntry = true;
        } catch {
        }
      }
      throw error;
    } finally {
      writer.size += copiedLength;
      zipWriter.offset += copiedLength;
    }
  }
}
async function getLocalHeaderLength(reader, offset) {
  const headerArray = offset >= 0 && offset + HEADER_SIZE <= reader.size ? await readUint8Array(reader, offset, HEADER_SIZE) : EMPTY_UINT8_ARRAY;
  if (getLength(headerArray) < HEADER_SIZE) {
    return UNDEFINED_VALUE;
  }
  const headerView = getDataView(headerArray);
  if (getUint322(headerView, 0) != LOCAL_FILE_HEADER_SIGNATURE) {
    return UNDEFINED_VALUE;
  }
  return HEADER_SIZE + getUint162(headerView, HEADER_OFFSET_FILENAME_LENGTH + LOCAL_HEADER_COMMON_OFFSET) + getUint162(headerView, HEADER_OFFSET_EXTRAFIELD_LENGTH + LOCAL_HEADER_COMMON_OFFSET);
}
function getSourceOffset(reader, { offset, diskNumberStart }) {
  return offset + (reader.getDiskOffset ? reader.getDiskOffset(diskNumberStart) : 0);
}
function getSplitZipSignatureArray() {
  const signatureArray = new Uint8Array(SPLIT_ZIP_FILE_SIGNATURE_LENGTH);
  setUint32(getDataView(signatureArray), 0, SPLIT_ZIP_FILE_SIGNATURE);
  return signatureArray;
}
async function writeSplitZipSignature(zipWriter, writer) {
  delete zipWriter.addSplitZipSignature;
  await writeData(writer, getSplitZipSignatureArray());
  zipWriter.offset += SPLIT_ZIP_FILE_SIGNATURE_LENGTH;
}
async function writeData(writer, array) {
  const { writable } = writer;
  const streamWriter = writable.getWriter();
  try {
    await streamWriter.ready;
    writer.size += getLength(array);
    await streamWriter.write(array);
  } finally {
    streamWriter.releaseLock();
  }
}
async function flushBufferedData(readable, writer, signal, onChunkWritten) {
  const streamWriter = writer.writable.getWriter();
  try {
    await readable.pipeTo(new WritableStream({
      async write(chunk) {
        await streamWriter.ready;
        await streamWriter.write(chunk);
        onChunkWritten(getLength(chunk));
      }
    }), { preventClose: true, preventAbort: true, signal });
  } finally {
    streamWriter.releaseLock();
  }
}
function getTimeNTFS(date) {
  if (date) {
    const timeNTFS = (BigInt(date.getTime()) + BigInt(116444736e5)) * BigInt(1e4);
    return timeNTFS < MIN_NTFS_TIME ? MIN_NTFS_TIME : timeNTFS > MAX_NTFS_TIME ? MAX_NTFS_TIME : timeNTFS;
  }
}
function getTimeUnix(date) {
  return Math.floor(date.getTime() / 1e3);
}
function inUnixTimeRange(timeUnix) {
  return timeUnix >= MIN_UNIX_TIME && timeUnix <= MAX_UNIX_TIME;
}
function clampUnixTime(timeUnix) {
  return Math.min(MAX_UNIX_TIME, Math.max(MIN_UNIX_TIME, timeUnix));
}
function getOptionValue2(zipWriter, options, name, defaultValue) {
  const result = options[name] === UNDEFINED_VALUE ? zipWriter.options[name] : options[name];
  return result === UNDEFINED_VALUE ? defaultValue : result;
}
function getDateOptionValue(zipWriter, options, name, defaultValue) {
  const date = getOptionValue2(zipWriter, options, name, defaultValue);
  if (date === null) {
    return defaultValue;
  }
  if (date !== UNDEFINED_VALUE && (typeof date.getTime != FUNCTION_TYPE || Number.isNaN(date.getTime()))) {
    throw new Error(ERR_INVALID_DATE);
  }
  return date;
}
function getFunctionOptionValue2(zipWriter, options, name) {
  return checkFunctionOption(getOptionValue2(zipWriter, options, name));
}
function getNumberOptionValue(zipWriter, options, name, defaultValue) {
  return toNumber(getOptionValue2(zipWriter, options, name, defaultValue));
}
function getMaximumCompressedSize(uncompressedSize) {
  return uncompressedSize + 5 * (Math.floor(uncompressedSize / 16383) + 1);
}
function isCompressed(compressionMethod, level) {
  return compressionMethod === UNDEFINED_VALUE ? level === UNDEFINED_VALUE || level > 0 : compressionMethod !== COMPRESSION_METHOD_STORE;
}
function getUint162(view, offset) {
  return view.getUint16(offset, true);
}
function getUint322(view, offset) {
  return view.getUint32(offset, true);
}
function setUint8(view, offset, value) {
  view.setUint8(offset, value);
}
function setUint16(view, offset, value) {
  view.setUint16(offset, value, true);
}
function setUint32(view, offset, value) {
  view.setUint32(offset, value, true);
}
function setBigUint64(view, offset, value) {
  view.setBigUint64(offset, value, true);
}
function arraySet(array, typedArray, offset) {
  array.set(typedArray, offset);
}
function getLength(...arrayLikes) {
  let result = 0;
  arrayLikes.forEach((arrayLike) => arrayLike && (result += arrayLike.length));
  return result;
}
function getHeaderArrayData({
  version,
  bitFlag,
  compressionMethod,
  uncompressedSize,
  compressedSize,
  lastModDate,
  rawLastModDate,
  rawFilename,
  zip64CompressedSize,
  zip64UncompressedSize,
  extraFieldLength
}) {
  const headerRecord = createRecordWriter(HEADER_SIZE - 4);
  const headerArray = headerRecord.array;
  const headerView = getDataView(headerArray);
  headerRecord.writeUint16(version);
  headerRecord.writeUint16(bitFlag);
  headerRecord.writeUint16(compressionMethod);
  if (rawLastModDate === UNDEFINED_VALUE) {
    const dateArray = new Uint32Array(1);
    const dateView = getDataView(dateArray);
    setUint16(dateView, 0, (lastModDate.getHours() << 6 | lastModDate.getMinutes()) << 5 | lastModDate.getSeconds() / 2);
    setUint16(dateView, 2, (lastModDate.getFullYear() - 1980 << 4 | lastModDate.getMonth() + 1) << 5 | lastModDate.getDate());
    rawLastModDate = dateArray[0];
  }
  headerRecord.writeUint32(rawLastModDate);
  headerRecord.skip(4);
  if (zip64CompressedSize || compressedSize !== UNDEFINED_VALUE) {
    headerRecord.writeUint32(zip64CompressedSize ? MAX_32_BITS : compressedSize);
  } else {
    headerRecord.skip(4);
  }
  if (zip64UncompressedSize || uncompressedSize !== UNDEFINED_VALUE) {
    headerRecord.writeUint32(zip64UncompressedSize ? MAX_32_BITS : uncompressedSize);
  } else {
    headerRecord.skip(4);
  }
  headerRecord.writeUint16(getLength(rawFilename));
  headerRecord.writeUint16(extraFieldLength);
  return {
    headerArray,
    headerView,
    rawLastModDate
  };
}
function isPrintableASCIIText(rawText) {
  return rawText.every((characterCode) => characterCode >= MIN_PRINTABLE_ASCII_CHARACTER_CODE && characterCode <= MAX_PRINTABLE_ASCII_CHARACTER_CODE);
}
function getBitFlag(level, useUnicodeFileNames, dataDescriptor, encrypted, compressionMethod) {
  let bitFlag = 0;
  if (useUnicodeFileNames) {
    bitFlag = bitFlag | BITFLAG_LANG_ENCODING_FLAG;
  }
  if (dataDescriptor) {
    bitFlag = bitFlag | BITFLAG_DATA_DESCRIPTOR;
  }
  if (compressionMethod == COMPRESSION_METHOD_DEFLATE || compressionMethod == COMPRESSION_METHOD_DEFLATE_64) {
    if (level >= 0 && level <= 3) {
      bitFlag = bitFlag | BITFLAG_LEVEL_SUPER_FAST_MASK;
    }
    if (level > 3 && level <= 5) {
      bitFlag = bitFlag | BITFLAG_LEVEL_FAST_MASK;
    }
    if (level == 9) {
      bitFlag = bitFlag | BITFLAG_LEVEL_MAX_MASK;
    }
  }
  if (encrypted) {
    bitFlag = bitFlag | BITFLAG_ENCRYPTED;
  }
  return bitFlag;
}
init_io();
init_options();
init_configuration();
init_codec_registry();
init_constants();
init_configuration();
init_codec_registry();
init_zip_entry_stream();
var DEFAULT_THRESHOLD = 1024 * 1024;
init_compatible_streams();
var DEFAULT_THRESHOLD2 = 1024 * 1024;
var DEFAULT_THRESHOLD3 = 1024 * 1024;
var READ_CHUNK_SIZE = 512 * 1024;
try {
  setDefaultConfiguration({ baseURI: import.meta.url });
} catch {
}
init_configuration();
var n2 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
var t2 = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
var r = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
var e2 = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
var o = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
var f = new Uint8Array(288);
f.fill(8, 0, 144), f.fill(9, 144, 256), f.fill(7, 256, 280), f.fill(8, 280, 288);
var b = new Uint8Array(30).fill(5);
function l(n3) {
  const t4 = new Uint16Array(16);
  for (const r3 of n3) t4[r3]++;
  t4[0] = 0;
  const r2 = new Uint16Array(17);
  for (let n4 = 1; n4 <= 15; n4++) r2[n4 + 1] = r2[n4] + t4[n4];
  const e4 = new Uint16Array(n3.length);
  for (let t5 = 0; t5 < n3.length; t5++) n3[t5] && (e4[r2[n3[t5]]++] = t5);
  return { lengthCounts: t4, symbols: e4 };
}
var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function s(s2) {
  let X;
  s2({ wasmURI: () => (X || (X = "data:application/wasm;base64," + (function(n3) {
    let t4 = "";
    const r2 = n3.length;
    let e4 = 0;
    for (; e4 + 2 < r2; e4 += 3) {
      const r3 = n3[e4] << 16 | n3[e4 + 1] << 8 | n3[e4 + 2];
      t4 += p[r3 >> 18 & 63] + p[r3 >> 12 & 63] + p[r3 >> 6 & 63] + p[63 & r3];
    }
    const o2 = r2 - e4;
    if (1 === o2) {
      const r3 = n3[e4] << 16;
      t4 += p[r3 >> 18 & 63] + p[r3 >> 12 & 63] + "==";
    } else if (2 === o2) {
      const r3 = n3[e4] << 16 | n3[e4 + 1] << 8;
      t4 += p[r3 >> 18 & 63] + p[r3 >> 12 & 63] + p[r3 >> 6 & 63] + "=";
    }
    return t4;
  })((function(p2) {
    let s3 = 0, X2 = 0, x = 0, Y = new Uint8Array(1024), a = 0, w = 0;
    for (; !w; ) {
      w = U(1);
      const n3 = U(2);
      if (0 == n3) h();
      else if (1 == n3) P(l(f), l(b));
      else {
        if (2 != n3) throw new Error("invalid deflate block type");
        P(...B());
      }
    }
    return Y.subarray(0, a);
    function c() {
      if (s3 >= p2.length) throw new Error("unexpected end of deflate data");
      return p2[s3++];
    }
    function U(n3) {
      for (; x < n3; ) X2 |= c() << x, x += 8;
      const t4 = X2 & (1 << n3) - 1;
      return X2 >>>= n3, x -= n3, t4;
    }
    function h() {
      X2 = 0, x = 0;
      const n3 = c() | c() << 8;
      s3 += 2, R(a + n3);
      for (let t4 = 0; t4 < n3; t4++) Y[a++] = c();
    }
    function P(o2, f2) {
      let b2 = i(o2);
      for (; 256 != b2; ) {
        if (b2 < 256) R(a + 1), Y[a++] = b2;
        else {
          const o3 = b2 - 257, l2 = n2[o3] + U(t2[o3]), p3 = i(f2), s4 = r[p3] + U(e2[p3]);
          R(a + l2);
          const X3 = a - s4;
          for (let n3 = 0; n3 < l2; n3++) Y[a++] = Y[X3 + n3];
        }
        b2 = i(o2);
      }
    }
    function B() {
      const n3 = U(5) + 257, t4 = U(5) + 1, r2 = U(4) + 4, e4 = new Uint8Array(19);
      for (let n4 = 0; n4 < r2; n4++) e4[o[n4]] = U(3);
      const f2 = l(e4), b2 = new Uint8Array(n3 + t4);
      let p3 = 0;
      for (; p3 < b2.length; ) {
        const n4 = i(f2);
        if (n4 < 16) b2[p3++] = n4;
        else if (16 == n4) {
          const n5 = b2[p3 - 1];
          let t5 = U(2) + 3;
          for (; t5--; ) b2[p3++] = n5;
        } else p3 += 17 == n4 ? U(3) + 3 : U(7) + 11;
      }
      return [l(b2.subarray(0, n3)), l(b2.subarray(n3))];
    }
    function i(n3) {
      const { lengthCounts: t4, symbols: r2 } = n3;
      let e4 = 0, o2 = 0, f2 = 0;
      for (let n4 = 1; n4 <= 15; n4++) {
        e4 |= U(1);
        const b2 = t4[n4];
        if (e4 - o2 < b2) return r2[f2 + (e4 - o2)];
        f2 += b2, o2 = o2 + b2 << 1, e4 <<= 1;
      }
      throw new Error("invalid huffman code");
    }
    function R(n3) {
      if (Y.length < n3) {
        let t4 = 2 * Y.length;
        for (; t4 < n3; ) t4 *= 2;
        const r2 = new Uint8Array(t4);
        r2.set(Y.subarray(0, a)), Y = r2;
      }
    }
  })((function(n3) {
    const t4 = (n3 = String(n3).replace(/[^A-Za-z0-9+/=]/g, "")).length, r2 = [];
    for (let e4 = 0; e4 < t4; e4 += 4) {
      const t5 = p.indexOf(n3[e4]) << 18 | p.indexOf(n3[e4 + 1]) << 12 | (63 & p.indexOf(n3[e4 + 2])) << 6 | 63 & p.indexOf(n3[e4 + 3]);
      r2.push(t5 >> 16 & 255), "=" !== n3[e4 + 2] && r2.push(t5 >> 8 & 255), "=" !== n3[e4 + 3] && r2.push(255 & t5);
    }
    return new Uint8Array(r2);
  })("zb19kF3HdSfW3bfvx3v3vXl3gAEwwIDAuRcQNZQ4AClRA4qkpWmIg+EQhKh19Ier4ioSAkcS7gMBvvdGIOWlOUPxw5BNaRGHUdEOa43YSqRykRUmy93IDncFr+m1dq3d0BttLROpUqpYZWsTpYrKslysFEOGv3P6vo/5AEAStsMp8N17++v06dOnT58+57Q63rtfK6X0fzp2r1lZUffqFb2CJ71yb7DCP3pF8aO6V+mVe+2KPKp7oxX+T6/cG6/0H63/1Y/olXtD/zX49LFEW6W1jSJtdM3UNf4zxtSM1irQQVAP0yAIlDKN0NjY2liFYRhqYwNjjTEqaupQaaViZZPAhvoBXa+HkdZfMV8xUaJXtHvhO2Ea/5ml6P6l+890v2xU4+Tpz586vrz08XtOLz2okvH+68nTJ5fv6R5/UNWaI99UmvXfH+ieObHU66nGoJal0/ep1vb+66njveV7Tpw53fvS/Uv3qSz1CdJYVUrqHc+GX7npLeMjn77wKycfUFtb1bd+6/1aufFt1dvatu9bGm67euO2J7LhV2572/jIJ257e6v6VrW9o18r2t5pP99dWlJmW/VxDQjR/cdPnTpzQunG8aXePV+8//gJBmau2X9laFzWf6/auWNQAg0tppzz5PFTJ39lSamd99xz8vR9J7tLJ5bv+fyXTp9YPnnm9D3Lxz93akmrnfcs3d870T35wPLS6Xt6y8dPtO/pLvWWz3SXVLR7XdIXlpbvOfGlbnfp9LKKi3vuOfHQ8XtOnj7RXbp/6fTyPUsPnVh6gCvvLn3+xJkvnV5Wd9ZaWjmd1tTU7ubk0UO3fKL+0rPBMaPS735Qpyv7lMvaRX2/MnPr/0i51/UxO+ce3zZtVBG4jJRLS/dG0MHD4lQRueBsoc4W2gUdixLarfSc7pAqC+OC5UK757aVhSI9bV7cVuhpkxThEa6RAvcImQc7s0Y1dEohqVnTIEXhrElS0i4pc0WauBbjgu6ssXgtC43KrNP40khTitxTDF5yrKlJAwpnSKGQItPukia13PkiQFwuFINjSDE4ai04+sFOEfQBMgDIeIAURR4IRVFZWOL6NEXtIhRYSJEukVtRYucocQ910Fqu3TOALzdmhQKnKXHB2eUi7sz7dinuooxGo0BQmgfo6KxJKKhg0PITCCiMG/fMNrKzRrmntnGjjTR15xgR6XxTU/pFZ5anzYs7CgNsPdShqJ1bMrkOeJymTVaoectPE4Wab+oUWPE5C03Atl0s9FSOnhnSU7khlQPMlMy0mcxrZPDQKNSCncNTUuhqFPWsSRp1zjhRaLtCxk2UIV6zQs83AzIuK9M8DOYozGPShXITZR4ChIlCNxUpl/n3DO8pxU6hl7XUreQRKffdlaOcLS0L7R7q5JHvfTzfVG5vnjglPVbu9bffjo/ZOYrctaCrs18oVPssE6nTy233iTJPUk/wSYU0jdFROSgBPxS5nZQ4fbbtFCVu78LUcm4qRFY4C8je3VSk85CCwjaVU7klnatGAPJhPAfEY+uuOetsp+S+HZkiRcFUrsg4vZwbQm9RIOwKDKEzlIB0Fal2l+IORisgVQ1wrlLi8QvmhkfQkF3MNRkMpIxhiIcKpXaFtKA7LRS3GM43FVmZTBS10ZUQw5xQiAc/zOH6YU5SfJVhDnmYw/4whzzMJpgjA7KWYTZrhtkMDXMgwxwP5nUIDiRTSJk5Cpk8XXa3nZOpaEj3J2BYAiQ1mK2YVIrC/tQNR/mHU7lxKtcpZhFKYlYZroEnWaMGOM4zHGbRzrnz28gwAMj77Db3LCcJHCg2DEyfYVRVeUo6WBbWrLgfTU4bZefcT/ALOvvp5OGVQ0a5H08eXr2wurq6avH2o0mqu0bpHui4V3//3/1+2EPLr00ymtxF/7tKaaHLInCKdLuIO2BMx5qJe2mSMWjn3Iv8lJAuixolxyik2mK3WUvNnLs4OaOUs2BIFef3/ULBlydzJZSF4hgMCilhSisXmwFzjURIyKksLIxbOdIMSOeB+zG3qZxuFyGZDpgNmTZYasnE3CnzIKUAoAYeVNUHNaSgLGIKj5GieLHbtCkFWVgoMgtN3QhRzrQxG/CVKUgJUEeamgxPCkCiKXI3lBQAbpWbhk0F4ZgfFLRLXiQ6hclCyW0oKPOAswYpGbey0DQp8HwRpZwFr05J+45yj9FOFzzyWLcZ4hesIHLT5bFmmLoXJ6VD6A6P1Xf4TYGavjOJiaTSPsLtAOHSJUy1aWOLsDzSNANUoxtPC+kBk2SOTYFZPC3Ey4TmvjeJ9UK5lyf5o/vmNreC329vE9LD8ytCPxhfWc5kvQ5nzYvbSGNd+c42sMmyUI4WmirFBAjcdLtQ7iEybQdSayM/ZoNfn3k1o8GqaEo3jbl2YZv7mW+4YVNwpmNYY452pWcNl3TwRAGFJfI/u42se4gst6KkYnd+m0xHoNOQajNOscb75gzZDZoLGCWNSH4q5JE5OoQ0GfqQ8W/msDD5EQDb85jXDQPePKMA7HwzSP1omblqtCwIDWsn02IRLvqFNeG1ZBP8xRvgL74U/shS6D5IISoo3cF2ASKwLisXpwrtplhWct+fvM6oQyYj7V6Wx8R9f5JFK7S3lj48LZB2k6VMeRdX7IuUs5DHwkXwaE32CBY6YaSPdJCLxYV2YTzULMAog3X/bYiQZCpxSJkVL09qx+Ld2eXCVMKQJsPCEEtgioUhjZ5BGNL4abhGblwCdrmXl8y3/eJu3LVkNlzcVUoW02w32cOMDuXMsntxR5lrZnUiNoQOcmIRMCTnIJaFIpaxkAVwjNuJSlkEUCIC8KquRIopKknA8Ex115zFWoslXWaD7ZRFgGUu5GUO1WaATM+aSZfkhmyhc+UalRhYcLcbAkAiXUh4Yk/mxjVSsn6tA8ULG/ELlQJDxUzBGvSeliqbutVt7gYUVJX8IqsikzUFJU+1ioTLIunXoN1DpOVjQBElZWHbeVwxOAogbT/rJdf+XI6FNaKTXq7XqSz5UmAg6nrxZF0BEIlgAfgLwDKVCzpOH8HkhXxYw9dGbnhbIzQZiCxjZAcgVOkeASs8K/sSkwohexE88XVP5pEBgw4WqkpUlUtJLsPfJwplIfNDJApE4G5qClgk0sEcS4qqgGScaxGJVFOxZAzBjQuAVkLn+wVpJaVovqmk/t0FSBmE9+IORhRp0LUMlWlqd26bUDc6VfUIRSmaNhnyR8iboVv8NJGS4Z2AoWjWTHqg7Zx0LBMqmEx93yAvcsJEPyGmWpnHFFCNid3mTOqqzyMqpmYpLglcj2I/FvHG/CF+t/xBJkpDJpbnEwateD4Ru2sp3pBPGMxGM8QnTMUn1BCfYKa1XIQVn9CeT6g+n4jdTojyzCeM3yrw6iBjXlQyegw+ga0ABltEfzBf8ImwLw6HfT6hMCC26qP11KiEhK2I48IpnM86hIeUEpnZPP6JUFAICtKgIMMUhJ0wGaYgnlyKKYhivzGO+/QTUuLpJ2G6ACD8NOF3IqQoAQzSDxbUNeiH9w2T1XYB9MMJE1WCmSPrWiJiWjAqNSy4C/PpMwjsBHxyiLwB+TQw15KHg6ynLrsxddkroq5AqCsAOgPBajBEXdyKpy7rriW72SoUyCoUbLQKYWaw0qKiK1OpBXiRlgYnAZfddBkS8qq2+7a/DOlqGTKevOLBphq1Z6JnwLyuOhl48jLC3IKB+kE2aJOVaoL7hA2gkBdzvpqQl+mTV8jkBTZL4TrySoW8+sRlqOaJq9Ynrtoa4qoBArMJcZnLEpdZS1xmPXGZPnEZ5A37xGWxybTrtDzKb1G1WRnoeChYq+UZIq3A759lbBvkN9VatDxY80Kv3rEinjKKU6q7rNyvSKX/W6qTFSxn3FeXYNuhnG0LdT8EmTkPWSenOxDXnOnw+gP2rSB2BiIGLzY1665yrwSsVl6/ujWgk6ikOFnu7ELTDK+Yur9ihtUCObI8ji6i1i8genRxZH2BLI42mCPLaiFeHK0f02pxtH7sh9RCATMVy4pIFyw0A+CNySwk7ZefoC8ssLJRtTzDB2DMT80GKywTsB2ssHbTFVa/5xVWM2Y9EQ+tsFpWWE/E1RQNvWYGndUdBtVrr3iEbSVqhV7UCkZELeUlpwEyAhnvhSYULqJOeEZ+W14Iw77fi2HBiBi2vjLsyyrkggZJ8bZhlIpYh2TXyV0jVDQ6MjYVXRTIKhxSQw2TVbCpGsp4NdS7JyuTbkg//V7KxnJAMuEakgmvnGTCKyWZcBOSCTcnmXVwU0DJQlNVk6SV9mVi1Vdb91dKi6WJGZqq2Jkiu1Zp7ZeqhFS1iOjBAtESMUz1F0rlrgXLOvuFQstCqYfEsEDEsGCNGGbNipkzK6OCWDwQxITDWqHRSb9NJLWROGbBqpkc+ts21RfHbF8TS3awXtrBeonKSefWcbeDoo+FwkrfBRNuMlfY2TmV5jFrF2Td8JjhwYi9ZuabTBEaeoEVUlNg+OlTqY5XhDOHxqsYLHbYHaZY4eZKdFnayxHIBQWUX4686qKRB/2NeCAy41oWboYnn5K55tcAzm+qUTV+PvJ+xdoVUjzXWINrWTE9pPKNyRaBqHyZo9mmYhYv7xVSR1m4GWbhWli48VNQ9fesIScxC/eADVh40J+PCvPRDOajGsxHEatG56MZmo9qaD4G/fkY8HwMeD4GMh+554Yxi3krctKkR5DBfOSEiSqhz659bzfi2WqEZ2uvFBr0Xr0bnq1GePYGleHcymMTahomJuHZA7LxPDtYw7PNKM8eHooBzw6GePYoHVU8247ybDvg2e+ejphnryeYfi+FZwejPNtsyLMvRyPhldJIuAmNhJvQyEZwY1PlebauFlgZG13xbNPn2Tho1Myz9WB3EzCDNJVgn/LxkJLdjT/QMYNzHebZARrxPFv3z8+M8GxT8WxWEAXg2Up4dlDxbDO0dcY6EgxxbOs5tvH7AV6umJW6nTgpZZYdCMsOALESasA4McvWYNkBWDZ+NHKBd/dZthGW7VUX1iPW91SWJawE/fMs0bGRkh2OqnbVvIFOb9Cahe1CZ7rwIrdt4+QkgBBGvBPB+cubKZ/fpYtYQX824ZX4Li4hkhuWssmw1l6z1p7UJ5XLlo819UDrttJK3c8mBC86jRSp/Sq1ap9Kc61X3Msqs6xbUs7Mmv1YnWcNkQqdStNxRTjYdY/wqv5AVk//y0BHK+5XsIq4byQA+UYQ0iNQP0lHlGdkVAT8Ydrs97/TTrsfHaJgPFCFQbUPt7w2cDd6MWtursbPOC0fX3xLzRoLXGXXiHRK2qk7RGJxDxwpolnz6iE5qtIucy2Kpo7msehYFdKwTz3rwjLHAR1IsNWBZMOkkWC7ovOAYpGJglkzLWJiQxqUSm4iA1K8fvgbSU8TodIJsrx5tE53Zs0NqRS4TbLuf+cNR3APsARy+MW31CFsBQ8/Kt++fwhn3+7FOgvAD7xTZnXVutVVQ9EU702Bks/Kz2ccy1fTDCYwO648ynenFPLgZrV0CxME+sO6fZuNpX9wh8lXzCP7lKN2MbYfAzZZYZVX9aLmB0kV0bws1NYfN+xmPUARuO++pUStc5FHBT+YrtqF7XwvGfcjVeZExr0elvk2Mu5VVeZTZNxrqsx3SRfz7UhXZT6OSTgHWWba3CYnybbYnSeyBDbzLcPGIzgUcb+a240MS/4m/igA4bXH9oZRnNQOHLzhxnraaI61svHATGzThdo/tct+/JZbb2Pmd1eeNor+0xQ/ncobjUyeihZ+7uXz+tbiVJ42xjihkdvGjDwVwfwQXhsHcPwei34hmW9+BNYC7TyhaEYpipcphDVD5HSZR9A/lkzvOO42nXkK3e98wyx058WMYloqbs2aaaxUWMwU/rI9BfPYMeS+VWNDMuZs6Uy2hxfqf8yQyJTY7VQeNw4wqPtxrEgWp383sKZm2a2+FXTwdLZ0ex+YB/PsdJiC3O/VmX7dn1fdotC1Oi5hQdD9PF2fas8WASZoHb2yVHfxMe5FkdoVSkOZm9NkU7J3d5pbKXY4EYAIM1IZBXnYmBnF4o1XiEU20pmg0L2tNwN1BqCuXoSZEin3vyZrExlPAa/QwAvzBMVrvFu1zOANTv3kccwltyhLY5z1FhWKIczu/nDw1Dbun8iUgwmHymPp2l7ftRuutGtDcM0ayxqyGbWNpf9RmDh9BBLbh+R/2ACSCskH3wMkLjkrUhyjHOvjpeACrW6Moe+MwiUb8sCtJhimkHdoFaCsbBuB04LcRuE0qCchm4eNG3kZZuK7XWCv2zmq431CplUgI7tvAO0+GiO7MbSNfRUGkI2VoFlj3+iYzlw5ubrJZVDWW0HHJctdITk/KSfPdrsy0VmmuoGM+2fr0ZTxdKWmyDY1kVQSf5onUlU8y+rUcNbc5kw+2bgx7XOSvWsa+C43kNJeZxabHxLxsJkA5m5epygPKPGDYVjNPd+EIlrDvioY7muAvgZUH+ook4f7o7dUngwx69Dps3w+1x4LlDZBKgrjVw8VdUjikXttoizSacMmapF7c7KE+IdjxtflMZLzsCiYc+c1J5zng/px4Hu5dMmtWnnUA5Rgzq2aPKLErRrJlnC2GrIlyJb4bM8Yru0ZM1xbvLY2StyFkYqS0YpojOpudfyUO7+zhLyzm9AvAC+jM+ZqQIumcXfB0JjbXYKplLSN6hntAhFzGzTcRLimCa7xzcmSxrDeJ1ItrBWdeadaWlcrpbxB8oqkz5A5/NXV1dVX1CHzS2RAO58l4/5UmLF20UIzwPEbeHXoApxmB3lENk8aM6l7GeMp6pXnwGjBSfMklXpsuknBD6R8zpdj+x67uHOWj86tn0BrZrgdnT+Wl5fBDI8bH+YZHrq33w46BVjRSs9lZ4X7/2ltZG1B9g+A/P/50Bp5ezWhpLeqMY0cf+yngpk2t3t2BxV9sjhVBNSkgJp4mm9+kGrY62W5MIvbKWiD0+DoM68hYztH7giwJ3hLmIX4qdYohHU0Peu49l2wjr2dd7Z3j5py1tzH7+FZfLJOl7Pmi/ylfhZrti2LdNbcS7Ebk7EYO8vnAYG75pj1042s27PYZaHR/d4Izlg8cn9ScZ6WyMWnUjZ2SakFRcBWSil1W49NiS6NUtahUQqDoWDWnKJxPC8f1OcbTMEKFBzkaUOlvF/flLskV8ZdWmgokoZaQw1R6OIO2holwyhv9UlRKtguUvp2keHjWZ4J21lmzxtO0bjbSrtoirYJtjIqdjB5/dGo/JADVf/Ckxajyal8B9PQfUWGny+WeSuYowa1YPe1gk+/tOxWevlWPH4mn6Aor1OCbQ2jYoJC2tpxZrksds4oXaRkj4IWgZoAqAmoPjxJ6kBNvZokOgU/3XlQmyKpjrwaQ7gSJDHLspQyhigVDMH+xKywplUMYrP2mFHaYKBNCX6Lw7NFgYWuDJaRRiw1RNL86ugUrUNR5NfuD4I4DIpYZwCXZZ1gmScMOo2XzrQPatYZpvg+CtbedwGWJxBKz7IxO0+6GG2BuaUuXlv3nndTdzxUdyx1v606Li1T2CeneUQtSqhRLl4CISJkJLwOyLhFGDcMZ97wXMNTcwPzs1+Ovx3Ur1tB91ujs5tAsrUBwftZgBWJsg1p/r9O1lcQzZpfFv73wKz5LNYdpnkGE1RPu4jWVfQfN6joTys+s8MzYxhPN65F0vcGDPnVQ8VWSlxrsUtN97hZ7DajK5eBqEbNssjcY6ad78QLbWmXec5GSuCQ10DzjpW0MZibjWlzE28CG9Pm+mIPfm4oCtqzOAWTbf78y3kLP5/N6/j5TN7EzxzI/GPmtnwf3m7m1dy6m7sgAbY6aJs5alJ0HWjo+Sdp3+PFvm9VEz6eUUrEXzn7jmeUuUVBDR6DFbBVe5P2UfT8ufWlaqCL2nBBTTXM3Br0bZuXz2Mhdp71DbNCyqww4XOZEGX2Ufj8uXwfvqginOcT+go23yx0vi6D8B4f1CaXzWMRs0lkzHV8y61QDOx2KC3zlN6pDpWm1Mpjqos8QOFwPu5dCCikBilAIaCIuTGzgl1Cp5jw1pd5TJGYStzcxfMAy/m+Cv8uLjH/xig8qI00N8HNsfXrboppQlqb4NZqlLdhjbzIXi4hxXgrjjUVxvf7h+Bz8Jf1RiRnv/HdbBoTUNwu81CsY/bg7Khd8BeKKb2bt0YpKkqhkqqhUsqyAoZqeUxJHkJ3mS4ymn2aL4H8feEu25fXIAEmecyCYB5SRrW2O3gXvAcobDNO4/lmneuplTNKDUYMdiftPJYFmdvJ9uc1mPTjJRWAYI3Pr5wWpe6H4M8XVacZ7KI6Y5BJKJRqQiSBPJpMBUgSBIf98ZQVHLIQhY46Tb3LfTet5MjUm2BEdA2wVKOdMKJNB1PcD2ERidp4J7r7mCkLzwiuoajtxsqCOUGDLIxsA/CBhoARMBjgCKPqLLac+e5baqF5DQy/Z80rhxrXgAP9G2HIfZlVhNi4sTtl5pFHjT3VE8Ww/eAOXpOybMnywAQ0hIbqy8L5Nt6E/dO3lMfI6kXVmfI7vsZOvzdqFFYcQoCckX3nnisUHhVtoSZbiUybiVKOG8y0IbbnJD7sLOrzYIxHujK9g3bOjHd33hIgJuwctQim+HtEJ98oUCyvY8AkYS/0i4aG+oYO1FktgE11eNndLzc0dYQ1038+oo+iZr6lsSvtC+7NfAsG6H+SlWRHSs35Zo1qLJCDyKvVg5pAULNiUzu8pvmVQ8OiWCaiWGuNKNaikDLhQo1RUcxeoSzQAC/MQIDgWQ2n26yoGkM1ad5yKk8FfRnPjQm3Qik1SgaqwQwR4mCjQ+lZBiMDGC1Ky8V3BweLYbaS9bIZpfIGZQwcRixjTQlk+xKoIUstkV9ayN4AzKJnNu5fC8LH4B1DHf703Ur8lYnDSReVqNu+O6qLgy7V/csq/17Xoq1TFHXACO+qxJeUUhwCDg0F2+Rb4YjBPJ/8XEmnmcRfOUSpdMpv1kLg2PP7Fvo9KgdXMpTdYF5PbvBtxwbftsseMudT1X9V7Ttbs+YHh1Ihu1+WEcbjZzcku0ZnMN7vegcgI9swczzSRSYuU4wMOWxpUYPpbSvTWyb0ljGStzLNV/TWWENvyXuit2oY8pjnQZ7JvGhQK+dhiqshGh2KrE9FP0w3lI/Hgd8/q/CbQRBgQmJ5+I4BPQ2hl1I7SkzR+yCmO4aJCS2Owo89TT2PAOT3vSTbbLLuqtkY96z9jsJ61nyU5Qt4JhVsjnTDMWGbLGIQhIyRmdRKDVMShFS7KMN7M/53va+jXfrT3ptxsNQuUzkjhW6jTpbqi1MFhEELrUZep6Zr3QUtqWMFbI2C65Q6xMJCAmEhwE8AzZP16dNKzXK6lXTr041PP6jUrZxuJN34dBiuGWQYkUZwdl+jgOrZB0SGFSVMpXZhAL1cY3m0RO/gq1on24gOQYQS61pH0eG7eWWrgwe3OqxPGNJKosBYorQ11trAApia0+0blTr86FceP3f+wsVV/Uix75CCvLYPiKljibRe6yOwRJLWz2Jdhiw1mCvUBBjIbQU+mfZBpbJraey6IGEpc+y6IBsq67VJAdWPNGF6OijhG0b+fJ+U3x/MDZreL8OWCR6yNptIgJ/127btaaWyD15R2wENl3hvbQeCzqR9nVIjOBxuyFSV+4z5vuGK921YMRONhaRSz4MAArg9xuPNQ51yLVTDQzLSKpOQlcYtzAdkjte4NgoqGvTvTJOeA4Am66zua1Jd9Hz1hWajL240GhusB2MbfGtu8K0x2MInKSs766yziuHhLep/9weDPfFEUffnJQyYJfgKsbaSWQmfWaRgHikOaRv+aRL8fBpn4O3CgsdYapQEfQS6Lhb0raNT0G5Om4m8ziLcBidh/qAEilB/plMpQws+eBHNp9eDpmSbQKH7wyFV2e39oyN0gn2mk/lmIkoXTGjMUH+Agxbr2KK3vDR5e5HiA93NoKSsAr2dJRgKblHiToyxBcUni1NNtfk5Vb8n1amZrXS3lnsw39TwBq7OgJScAfEp1v+4YXeyoe7El+rO/rXdmf5b6k6yrjv70Z2XhonLYtB5tRycGMZXtt8Q2CqAQiijdotQ//ioPBikI0db/pQR5iQ3gBJdTY5jr0/XnoSvOb/iPf98k0WNiflmOLJJCq9wk2QZXk1cC8ElWLk/HFl1GUibB7yF9YCL4WGS0g6cUQDQVySv0zmMJa9USeUXIqzgTcU7sSa7gtkiQo1HYfvi7EITp1H/mt+9uUcwbW4W6TzwZjuwjJtedlnp2EqUYMETwV4nmm8atjC/vki4AOxebuDYFFwEG+frMXosktQpuZsN3GqUtCnJcqGUm8SP4PpZc4O3eoMUEpdUo3qbEug1IqpTRPXFIpkqoixnHSbARBY4JkZtwmc2kVtTHb/cBMcLxHFIBNj6whRnhA4uofrdbDUH9sl2DbBByZtsk5JzvA6YrdJuStqlWCVzb6J1e9+I974VoQ42vzCwQQSJQPa/dTIiak3wKXJAUbYHkMrj3lQO+XhIb2ADqWl41sMgDGepU6Vb1fIMx0QY5eATlALsxvPP8QHHVpwwC/HN/X2yU+LXy0BNga3T7iNTIIAjU/mkkNm/9WT2cD6JtZ3gGjKZ/nZNN1bEDAwGS2J/dHM+hp/bCJEMzAqN8V4u02J4NXc3Mlden3wK4GB8nZbs1IpwLzlLD+2ihl60oANpmjlqOfZyodStGthmpc6WxOdaNezQoQdnj3unl4/Bl17Jgt0seW+SSlZkKxKXoYIaOJ7Tna4zbAFZoxSRABLvj9OAyq3yxokpyTARvf1s4wjHaMBjsyyalB5j0XCD+hJp0jskwlm2csJOvLPlM4Man6pqTChdbMKFNJHCvKXasP5m39cxgTNkIt6OCTznvMu0yBYoSElVlPPGFA8HqIixVWB/oKb3B4q9pyHwUCTOdJqaHZEA4TgghBI/bedbkKOR1/kcR0xFGzB3jKm+xow3GXZ5jakOLlVHO4lvZ5L1F3VqLAxVMpLL8PeJIrYr1GBT3gYEjhi8tMGmvM1gjpp5QnFRhylvE92cKGIsghDpmlj6MrzDW3Hg8lpPKRNL3Qafc8M+IGZLXYwNxWypWwd266OWusmQpW6DMm+pmyEvW+ry00QK1RRP5AxMXoDmOR6DZXM3J1PfN16xkTDRT9giy6IfyfEBEYyPjqQM94aUuMVT9roylNCWDHIzVsY4ZbiwVDFiMHXZAnCXe9g9BFsV9vyKXdCZYg0l6sJxbHx0ikvWaIziN+uQI8YyQ7W0GPMM4t7KpvM2UjQ2a25OCcbKYzBIlAJsDJtVvh2c1wqPvVmUsCFF43B/41hBYMLtWd7Igi232YQYPh6Ty930Po3TBbviHkHu7BrPbHfDE+NmNpJeaysJ/qu9CaVeY0LJ0VsYjsyQygzp0D2Sppk3gvWml3NrrGJbWX3Nl866L3uzeloXO/lWdlf12Bk87s3uWmu2GWZj6X/4gG6Ko8ojpLJZmFoe7TbVrsqFo+GNNneLW7BFlBU24vQGrvaILBPW/Xa44I/mf47DO4ELpj8iE0xjbYJ18nR/A+vXJ5XdzBllU2ArkWRl1kxXLk32SJd9btyDjr2Oj06VbEPN74Gzd06Vd3abMOu/hMmldR9aYNPC3w4XxBcFlkGNLRIgSlSFP2fJTEJBrWrXWHarr+k2S03WG/1op+8UAfgHugicuaOp3EVIzoGLFpsKS+dF+M1HR6ZyCRxCYbcIHHWJV+eX9FQRuL0PUNB1e3vZJ+WbuK0f1B/BBzzckH0SuPTKdxEcGTrGF1DnZS00Yt3HwSO9uOntz724WZmpaZYjOCkp3V5WOG+c9hv6EonJLarvLytGpRvnU5eo428qzRlxi+OBqS28s2pYZ0WQ4WGbgk7nDj8sG9VC9hItBKKjHx0Epm6h1RaLqftz9hDdnbOQCbU/xMGcpcKM5wBXXpPKGeKabzx2asFBxEqmugx3MNV1HBpsqusyHI9NdRmGabObZfqqstBDGvqKgivLxeagkvGgjq6guhkVXz7X+0U+g924Amg4QAm8crHnvxJcTFwZLkIK0mlzPVssqmlMIcjmKIbN6Q1saDTYQhNHXpJ5yEzmT1R7LDS1Wi1gRd4PFSuk3F+phSar6IVamNcPejFHwUE9wTJ+G36jAFbOEMR6mzfEd8uMT6DukB7xIRCVrB4q+tZdjYINjCXL9fNgQKJIHO6PLRG2oF11afhorU/b4irUziN/jtdny410E0CiCoYJDnIwAgY0XRuBEQyBwRjlA5f+3nX3tNktS8NEHgtCdnsUidaZBavI9zRe30Rc8nm+b6LPPUNfkxdacXgCHYRgwhMIUShaELBxTzJ9sEEvgddq+D7KuoDIefGxploLRTCAYtDRH6rKUJrr2F/V8Tff1/3voa/vpad/NTyU18tQNip9jRFzogpQK9Chss0B6adecipXa2cFxlq+HVTEHPfJOuo/hf0ngYY9Vcy0eRn+1+ykzefvvx0eaepK5lipuJ+sijo71KjSPBM0lXWacT+Bn2zQT+R6TXbrcBuRUMnjB0SJoqXDz4G9qk9bbu2cpqCEH5UIERS0nc78mv+SnjXPMcNQ2c0ucPwRctaU9E7Nmhe0r4Sz90ffTJvXZryJ5mszcgLz05nh5fc9JMvQhexsh/AnwUFEei1hHWak1063Z83LuoKeFYez6BXXiP+/PnM5NOAcyakNUVB1n+PxpVIpq9+uBKuXrnK+GQhOX90KMzcZXbY9FdNE6V8RuccMn2oOcP+SFrspDL2eH8q32GnGFK3PTJEzR5t+3FiTN0wlRyp57GpQSdxHUu3qICn2KmkATkPmIRxgqcApF45+Ez7WhNKQn3T/ySzw5vsrpsybzgwfhYkHF841xPaKEgn3E3IhI09w0pYnu9C08hQuQNOKp2ihGclTvACVMVRlOHsKy6LG4OAY+f/RixTmASujYTnEp4ARnnBgCBIIYd/pLctwyMg+w/AN5NPC0EXe3C2E+Rof0NSo2UafOABZQBHOQqoBf20GgSVdsNjUu8Q9QeYUzyjEpdTDU66fHG44I9clo+Z2Iawd5hIz6sJ5RIOgtHSPJ2vmaMNd+E0NZ8z1s3favKDZpcsTqlAxW5i/LJtNYS8ym5liAZAc7sbMdTALg9HeBWvA7ycHG/ZuXTKFSOaxeZf8Jh1lOOp9Mxw59UOEhsA1Trk3tsInZNyotAjcIx1nxOXxt9ljigL3qx0+cec9cTPaNSwwBk4v9Bcc7IjbY6FCWHfN1rPnDsj8fepAESx3Oe5b4MY+zUwhulWfO7CZ5B1tvu2BsvmrB7xsjIpds51bZ1xGQfsse5iAkEq/1501Tx1wv/uUPqhlLYncBX5BTKLlbuGhYG1t0CZ7x2ADWS31dgOY1qYNYIIFp4csbJ/l2hGR02Vt0czbMgVIZLKD3mWXhYIZ+JsviBDzLGsWOA7qO409rYuwsv3nEFCKAjhJC30/e2CwWnu2y78YdPyCeip9BudhGUI0JbATZtqYBCXdBXNElmRAFqa/sK0fAN2XeTbPUsk8B/VH8stUNKM+ml+2reT9ZRmAU788OOmls/BhVYvnj8vOjqpHZJJNIq7sndY7qrf7cbXmU1aN/YTVUX8/3a31ypDKLNs1pIhL/5nWwQo0YFD1hX0VH7bPHCvlEpo+zURz6QznL5fhnH73ysRfZeXXz9WRqRSO2TozaY31e6cync5zbC/EWfFu89OG1njL75ZgDqwrUn4yWPeDt1Tb3bvIcKXP1ky8Ej9C2qsnzZx7+jHEb0PIzsd4QTj/mOZ1yGkcIUuqBBmdB+eD9ScfLIdwlYQXGluXs98rwiYUNXfhyf/9/3qkB6MYpzswVMd09xtOsG8oss7fKuttyOeYHG86D9yFx7Q846xBi32NoyPcRno4+UU7d/hVQ+nh4Mlfzeuc86E8cBJMp/4Ztq05rB/jB+v2djhG+YXHNAXZNCx/BA7kOcc2oyml33L15YJjXJ7/1Du85/wfI2xZv2lx14MHCMyILSxHg2xaYvv1u5Qe1g+zDWUKbOHgWEkJHCRm01j+AcOgBAeH7slRvDu42OSAy/OkXdyZFzdsnBUbwnBQ0GNzTfTk/K28GepxUAKESRk6AwZvmj5d1AC4tyVix2t9XUAUPf9E0fzWoJ5P5RESJkk9/0QxNpKgkJBR/PwTRWskIUbCOwLV808U2UhCiARFwfNPFOlIQnBY53UMzOHk78G0BqhmBPPxV/1w8GTROFeVKDnue49tBMZozXfVyyEzttZ+j3uwVads7fewl0MMTNd+D4C6OoarLqZQDDn6lY9xv/MW4yXPGG852Pw0wtHU3C+dIsMBX55/IrvueVjuP/8EP7WAK37KgE5+SoHxJ7Lr8oCDuHId3GCAkMTJooVzA9jDZUfYk4L31l/phZsWKRDQCqma1HDqIMFslhBslmA3Swg3S4g2S4jXJHAPE+lh4nuY/tOQmTb7VOYcy8nHwzrClgXoOgIn/vztoA0NhXvt7eAoTqktbmHIcOnG6uptJa8snESqi0A1fAEEzsk81v30qioMxJd7MKXIookHXLYMdozGEBqQa+y2wP5+aDguwgsfxu5Pc7jqACufr0xe4IXoH83gMRg82sFjOHiMBo/x4DEZPNYGj/XBYzp4bAwem4PHscFjC498OUXG8fE4RH5TVf3mow9+wBi98GEZpBc+XNGhsStMx9mAjq8Qo/2aw8FocuRkptuyUP7RDB6DwaMdPIaDx2jwGA8ek8FjbfBYHzymg8fG4LE5eBwbPFb40j42MkwqGRXQLMMUcLkbOp2m/7Kmt+NOmzk2LvCb2Njh4FdUv8SrZMNRSVrcqnkTs8znroP9zJCXNYeKi10Lx+hgpVXxui8Mvgrcy2oWwZRYAmwiZLrcJHHRzEL23fCz0/kYNrcxzpVhj5vHTrMpaY1P6akuG11us1a1qSuDWbC0UBLjgYttjEQxZ4rhpEW1o1P5mNNct3iWZwvibr2cp763XAFJS2gE9g3q003dsKgGXquI2jGP3i50m2LvRA00aFCzWIitQfQAx3wC3RAgPa5hfMHYDuUzO6SmQ7h3E/k4hcXWfKIKbTdmjEKYpJZbbVI0lU+4i2PuYgOPW92jJh/Hyfhq5lbHfGrLXWxKqsrHYYyFwCP6iPufI/eDiKKpYtJpGlsuWoudJqajOeL+3LpXLJJ2knxtYXh3ydnTFhpjna9xK1BHOU3Rcr49wGmvonEKaVvV36bT5dGm2kVNGl9kxUzT/ZjNNrbiU9vp5SJCzrxJEU1g057msVuhGmXtYsdyPkVbYM/OJvj5btrOA7ebEpoq2QiiLCJq3qoNRbQDXn4RxRD/E9zSwPTRXpZRKSKnz3IEwqgDHjMgpT7Rt4sqwkGbTIeiko/IcoPuIC5QzAuC+ASxObAe6qr/EeXLrg6MZI7A2OBYt8lOZXA8qx+doozGKJsqMhzHbKHt3K8tABUdjpdhH8I2JjFlZZEeZasghjX1LbSL1Kk7m5riPBoaS4wBtcqiRZNHOzyG1KKdRzvdZixTLiXBV0xjQFQsG+GYtsA2yZwFDpOcNQpoKW9W8weTC9MrlmnC1FsWQquDecK+Oge1Ail77gzTOfZ7wzYK1SsZIhxrix0nA0Yt5OGQDBZmF0pMIONW6lbSDytUFMwJA1Sif9d8KdZALuEQZ2n6n2tctRCQaov9vhH7fQhWYr/vF3rlQwgbsd9H3Gix39dQrWl/y0PKwSUl3dvva6jjkG44nYN9wUpy1xro2I5Ek8k+kKb3m2BFPyI3H6kCRt2BhGlqHZV4d9NGwYbPwkAbfrzWG2grig5VigpfOmxLLGwtdmR8SRcHBZdbNUil37Em6AfLCnCfGew2jgIYOanjqJu7fahrRp53ABiKUCX6n2EHAO7WWgeAaARK2+bI7UAg7yKaEWniLNpn4dXKr10i9YoiFPj05vwBJGCOuOmN8H31Ui9agQMADDeqEr5h5MfBOMpjtvebjmXc++slkwrHXq7arsz5r6TtQIxGfIn31nYg6BQHgGiThkxVufYOANFwxdGGFRsOPwiH2MBNltk+tpqExUCbg1FnH2ARiNhUpw3izFnDxraSOv2ywTWPPFUkJnefDAMZPezjnD3rA8Iy0RQyXQC3qjYSm5T30HpJb2gzodJCaxbfIMdx3NaS9K3cJDY6LI9vlGWWs9gqy906WPEbcbmSTFV3LfFmCy2S6njjIn22sJV2gMXDzpSwkrPVFie9UZrUPpBWtX37GPY56nBy7ok+C5JufCt9Tmu7IjPP7mfw27yDNwL5EY54oTkI4BRrHJyP5ChxQZXnlRHiVWi5PodXJ1ExswqLVyfM4ezDLCQY1GO8YIuBDEnC9hYRRGxcCACWzLyCFdT9/OlNOliR+5VgiVcEPtav00c5rr70rp3728jeZtO19Pc1W63xMZRh7PxDI1eL4ICK7xDjr3vk4/e3DX/cuuBjH5pKQBvGn9O36p/URAO1ekBiE74xI++vzYSbFdw0If1vDcMKnR7rbhXrcqErDlmbi7XCihJb+TC+fWWwYiUhK/o3SVOVopgjsPrKg0pR7Jpt8bwPvJZYZQeqmgaqSKnJDLWyLq3Sd26W/PbbQU9OWjaBs29/4iMYi+E3L065Nw+fIATRmUi/pX1sT+6LdrUh1GhfrR50/9yBoWY3SGf0iIZa3dVUl6uJbdJkYNA+8woluGNKRDgSlDx/IP1vKkDNSh9YNmp9n8BWEDgPdnIHXwlw2TpRfAC5S9o85mn6Vl3HUJXGg5tEcY4vKmWOV1mfNtdDRR/4OVVzb6++/TsrrPSLJOyVZfUnoiyByrHrYbM8fbYf9Y33CBpL10F9zjRZi/2U/33GNI2jvhIRCwsrBL0CsoYK56tzJA41Km4oESyBI3Y2AVp+ur3MbuSn1/tPP9ElOvGz7dlH+P3Vrfz+RvW+uoNzun+zDaxuC1Ywg14F2AYYOd8J4YbyytaqZyJ6S48E8W/MoMSpsgjdeDnLDGHavDnj6iWuXIWt6RQ/hcdE8/wqzqo5bEqMyCEwf8HpN2zx7VFv1MJHh9kMr4XgDXLr0FMHcov9HWcInOn6gyWzCbNYSxDmigiMT5U8zXpmodczC3fhce0ufE1nH2VChCGqB4cvbuoD4mF7PwD56dNkD2WXkW7LEsjgiM+OFaAw1EUNAQr8jaRvbMfWgxHT8PDQCM7eB1wSzmwYV7w4pW25lMTjgqwLyxSBvJ+SIdIDSGLSVwWS+NKQcDP8ZQBJ5P7ftwVJDFJzgJyrA9JG6CkST0yNtgh5VXPVd1umhfXgsT93NTNFtoyoLkJIsmZS4obIfjWXnwbJlXXAbAj70EQYhrXPD8BzCkO17KaK4xSaYn6DWdRHcfh2PZ+uquxAmv6rmh5fkUuBEn/YxjETJYRt8I6MAXnxlT9Vh8yF69ipMHDqTr4l1n37Oh5A99wOcOWVvN4X1qycAqlpc+E6XENwl5fdNF8od+E6WN3yKU2dJWQH0xJzRxFPyX1zCacWjRICj/K3gPaR9sYMGw+8AfOmOsXw9Y7mq1XozRmKeJNt2rPmzRkWf9gJRwRH6DCqgblwHRqve3jqDI+/7q5qz0i0kpi35iOipIZPh/XiMAuv6i7re8wfRIDnytW0eWEHb5t8t/lmxhd2EGsPs48JON+8jrcPs+abVQnYp8hhVtS/UW84V5XqccbGXf2eWugbElkRudssGON4nkVeGPvwFSn8hK1UtAiJG722FEATEcsPm7IPAetD6/XH9s6mSodhMx42GWDuiSgxn9oB/0k+120IxcV9isvkGrsk9+a8mQRxbyKoNxT2ooTk2Av94IAMhz9Vs6y9FBgEwZW8a9xLVhLQS/eSvWsqH+dl1khHDI3D1TTmI1ApW+Dgs9hSFnBriWnMhybCpgOFsDreVZipogX8GNGfBzm4SQM6p4gjDI7avXB08pDST7NfUcjqJG5LIuLLMj4mthoBtcpTspI3hwkb0Q22AIqSQqQLeRsOJYA9D2+FoGsk2VBFZAo+LzAMThO1j0GSoSaNOd2WnVLIiQYmLFDa3MpqqlR0fRz2z5k78b92Dhd6VD7PfdSVMs/Itpb10IiNUQzQCHxwYH0xBEL4J9yHvlBNwTdmEBKKr85s+x6HpKu5Vm1/ZZMl6hDYhkXZh0Lmwib72FC+9J8YXVshjVAhfK0ok8Dbbwe36shZF5CFxjx2v67xlPi9lzCuFQ7S7jedqedjlo+rQ7nhlS8USo/wrVjas7KKKOwRLAn4FB6F3tSsQFEt8bgCr3+N0M9QJiFbx7CiiReUKlPIyBB6SWVX9tR2fn1qOxdi2bB2TLB3UJ+XxPPbvcrioH5avjy9PUXMwLqLHG5YtEeKYKrqtgucpWDKo4Px9oNE1/ym5rUZlv9Y5Au9yBc0qgvDfzoDLzQ7owxHB+WV7qDyIeV1Ze0l+O9vKkF1UbX5q3aWLuPoAXcMFsm1+7bwEnu6oUUyGt5Y+l0rTrRgg2TEBknkw5At7IoaZnbCUD6ZjIL5eFLUfV3xchfKAFnNBdZ4CNbYwxNXG8grg7XehzVun/X1wwjP20vhsVrTa25325262/obFC98HX5QHphk2qyOF4k34GKezuKHHRaa1oJhr2SfvkZksu2zbCaYDCy6RKiUjxWsirgrchGebhcJJS4+61ZN+c77o2ZxakZd+E2P+ViYgOgQmdwRXGZY3+Ayivpdez8qh/pwP3z9cOToYzsqU2iHGdsWnrAJ/Ckv/ANEgnEZnle3wPPcUynURsGALqT9gf37u6IEuw7R6wEctFhRdR9gCWVapDJjcdFyCrb3lYTVyyGeV3FVSTCgCnHRvvSUs1eGWN2HW/ntGV88nXlp3+/Q0n+U6vqKsFuw5CKeyi2z4XiKzQU88x1lvCscplthC8e3+YRUF6arRVSsVyw3ofiI6PHKwgjT5TsHhenGfGIUeEZmPSODXVRQUZ8VztSgcA2SojaFQ0haO8LDSFqbNoSkRh9JYfusrz8cDG7IgxmKdWR1OoPDqsGOO6h23IhZyQFaIorZWlUCRfpesi40l8vQI+G1tqJSMyeDfqnZdEUUayoeW0qEosgboAYy5HZ4F8y3yGHlEkhgOQVcHNRf314MYBmZRVcBJrMBTMa7Kj91gMJqu2lc69N9rmnWbjUj31i0wVbTVN4wl91qGj8tDGLFGor9qYM06FPYPinm2AkUypoeyJq+Fm2/+XeKtrcqtI39LaKt2d4IZRJoORA5Zy2WvvF3iqW/rrBU/1vEUs0vE6NYQrBaIxGjPXwpi4ExJUcKw2JgAk4MMdBADEymOKq6iIJva52uyNYeQhu29kXY37QWNShFOErwsvexkZOUajto75TrUMl+usl32WND0C1sVT6uFCaJT/TfG9X3psTDbS7wFoP9E3g/P6MkgI3Fdilli5DRGmy/5kXezLETioTok90uLs0i3xV/uaLfXlQfazhef0yL6a65pOku352pK9NdKFAlWssPFe6p2n7MwdhcL7tHL6yazpTcLyi+qdoYw9K9+9ARUvBh63Kco48vNKtb2036Zo1HYdo0XNgumCYehoE8BYtTOW9zOXYNn7MuiLWRKLf5+JzvM/N69g+x5jfmWCmgI3x+SYvk8JwuGpDWcPs6wkQZROLh/SyiQIhS7+6pwhyFerhO8XwHaQvdbocjHSmJBnCE1T2dIspmhg5PnG17+h58CtqDs5rBV4OvK9UBzeC7bg+cCcWjI5WQItL7Bn7PaekHaz1gSHR0ih1xGQ8W9lgN9qrla9DhJwu3mExeJjhlQibgc5rfnmO1d5sHoTp+YPuLBpns47tGP5T+/mv2v23L3djB4KSI7wxM5Tb3gE8L5J5gWxi5N5BHgkmQw0QbhHHkgWY3Nb6ubfWA7yWbgABT6JzPxf4PPMVf0lIJhlz7EYZ/x1E+UQpQdcC+fFwZ5jO0QB5RqwfAfI71FXRoNa0qwe/jB+6WetBgWgFU+nFAeEWyFVgvaZh3GmlMOO7DUkcRtKGdpxDx0EtfFYB/jhnqO2P+9IGjAsSsefoAb3Wt+O/psVArpbTHJvxBYQsXSLHncLXfoPfGBy1GtrubfnCLUHBm7+CewGygDyT8sHnkK+Twrd3mMsh5mAKvBHtJy2Sr0GSkb4EnQo7aARYtYfYEJ3D6xACApDzaggHagmG02XZVnKxH2wbYqlBRRO0irOZ5Y5gHAC2Bn9G2YigBprpYnAWY5H46Rwvd+W7T9LEtN6UKqOc0Rey8DjwdnSoMm7OJg80u8ZuSEdrFnu9pocEX/BwzZYVpzGfokZwJXcAXnLuEzy0pSH9DvEHYRSI76EOVFFqujoPyJVic8re2e1/mjHRFgQ3Spdz0LN9LiUXDR7h6MOFxiCO3a3Llil+Rpvs+Z+/Ak6Xp1zQ7rvANecxjYMRs/CKPac/I3I2wR4Eo8eFKnLP1kjkycBDHYfIeH7LMF3Dc1lD6Xh8QTCop+zrfhF8Qgi/9rYQv+mVTgtgfiEZyg151ePqydk/w5SgKbq3ypTDuSTFuEm8eccCGa6NXHL2ks9vEIQWk4Z40bU+Xpr0oQJLJfgEk+oL2XXhB5yYVB1sX3F31dNQbUIk3oFSlps1F3R46iR/1VFaVX+TQcf6GOQw8J43EAxn2nIzEc9JrMsUQJGaNpNz7g42m10sgmtriFLwqy8qtcqSYErRJNwvTxk5NXl+fkWn/2gwfBgaLMvVe0dXJqWj9X9DBXDW3/akHz222Ruhkt/mJ/4L2GnO4bvb16MNFArILzZANoryLZ8UxTL/WafPMgUpNzKyl4BsPklnzjP/6TdZ/QcOhps239TJi2j/jK+eIP/3F1Huim81Hc+gk5j0ki1QQ+UOKjZBeeYauxx47hipxDA28h+HCCHd6TuMwCX6i0iHrnaTJip+or3OYC6m+Y7phExvTZ+rGmbunhp27qyb0cBO6akKLY/f6Jtix2zcz1fJKG890L1vlpaGGqRaWQrDNP450fUU4e4wJLILiy3IU4BdH3zdbQpvI6Q+XchOGrH4cA6yEvr5dMdSLmq+RuDggvLjtQwNUbD2WBdTKkiXWZ7YvLTzNQD+r5RRCZs/DbO4UiN+n1xBDcwhbYkrunvJ2WF4touDC5083An+2ccVl4eL1LHQvcZmHXk5QfOXpvBcG+lOdCaakMPu4fGPCkyQIMPAp0lLBMwf4kmPWGvr1uy1dQnQKxTchD03zxw/wsYinJTbJ9WwZntaQU1KxpgkWqxXhnBdauOpCs9adg3IOpnSRkJ1ha26e1EW03OtgZJ7R4hMfCjyarTX4nA97oeUeJVU2QSwA1KQ7bKwsA2b5TKh+UPNJW520zM9gXTe4A+YoayCNe8IcbQ5EADmbYsoTmezpA4VhGxSxSXq5YjiFJnPUzrmvsFMK70HcVwy2HvNY7ftBNnlqIKgRuwSD0QnW4MCvyRxjNaFpQ/EpcqAXFeyKXLnsuWN187KAFBK8vqCzfPpAmt7Dq71nmVWT7I017RHG3BOEcSn8yYGbYtMAQZ0cZKc/NKa1Yh5Btu97HnMWL9/zKPqRhluHn6Yitbbdk2D1js+lj/n934+91ImAFXJ2m9c92aQU8tGUBMPQ7aJJQXlQKbl893EtoT3Pa9zThs+ZD4SCLXlaCklqWA6zJHRQKcr4iUmKj1oDf99Po4R57jhLzHja8ot89dSWJ37lWy44i0MYU2Jxse4Nvehj48Pl4CsmLcynmdI1cxZDrDcx4oJnqOnhNTlHAm+RprFO5S2hIWfH7IjAd730Qzek/64+EI6SgXDkxaOV9cLR/JB0tNhBOJL5JiNaoj4MyUZpbqsVG2P/PV0xx1nzokY8DNmwvaBxUzRrolkouHu9QGX7ApXNfsFHmwhceLRvm6XFOTdYaGoXVHsMLzy5Rwky23CDqZAP71lFHAkWB5GJhpdgmXKjQlnBtPaidiu9clQyG4pYsYlktj7Hu5HMkvchmX2PY/+1h0fiZYmsUjLDjqFsELX/6zMynV6bGRXIgv5myx7DwiubI2HZaABswctm36tkMz/CLIh9Z0RAkfUwXgD1VLLTIGaF2jBmxSVkEcPy3rT5zoBtCaeUKC1/N9LZQPoaloXMcBeNdLHaOWzSzWEpdyBHDAl+fSzYUNbvEWRvUKRh+H7P/79hTOhkWKjEHvxdCJXBexEqzeWrvCKhEgylBTuCT/bXxPV6aj1qfL0uGUbLsXLfDjKb/vtIx7D9/7FqF/X9Ck6ClZKVHTRClx1lzU7kNC4Ae/QrHA6ew6Zd+AZ8h7B/rbwSJ5fd3i+5qQ7HK+6AGS33KOwV8lrj23gp6rEpD76HzvpfKVnryI3URdgrOG/o4rNdtpdCqKCz3R6sapf50lR+RnFn+bnn/kL1blEvfIOd5xawpqk8ci98Q7u/ALmwZbKEI0B9RUrR9chd8ME4w6yXe0UNIQoq8DO53Wq5i8jO7H3dxa7zhWc0x9GZfHDWvHBBnjM8f1ueEzy/oIfNnC98Q2JCiPOVvb9A5KNZ85rmeCohm+8lwYooyVf4ki2z7HZDhtIU3jGVY/Q1heISSOkChxI2y4RgABI6mKPbxBSeKWpy63LyYHaYg/YiKIC+6LsJkb0nHjU1ZxfIuN13QN0dZYdhPQ3HF2w1BhEFoPIY8kiFg0PwhpbfVZiy/pES5ehrf/xn//DhWfOMIXX4rT/4P//kP3z9v/it7FBwHu+P/oun//AbP/8//vLMoeCckbIX5HzUZp+CYUB2u5tAZAk2vXI/hVgPImO31ItqgWdRBHMMvkXJR0mCtTf7zsKqYbYHotfy8iPVEyPYAdzvCT5U7y6q7FMOLvuM8qIGY7Namc2PYga+f3X3YwW3pDj9JHgNr7egSDji99/gFq/c5Fl5mVzuQtE2lJwsd7vp7+jK/05dF1wwkCifPxw8+TDDFUGWc5/s8P7HXfT4/zYLgxcV394hF70DUutDQLtzHFMrzI7A+Zys+2R5zK6gXxDKbZkdIevm2hJhQy6Bg0pW1GolaudsPqR0+m915bGXsceewMk2ueHh5O9B4nKrycDsMvuU++kEGCGyHX4jeOzwxeAXRb0ClzaXgA4AY24rk1U3IVYGpmSrgoc7TJE4mXDBsniHiPGn+HmG3+KaSooO30whQpycuw0GNAhXEXpfo4lsQTCFQV3oD3TgsnK/SqfBMhWcvCcxRP0b7lT/hjvFN9yl/0uuP70iDpg3FQFHNRnkDvq5A38bPPJRYZDPDPKZfj4j+WrIl1w+31Z2/Lx8voler+f0g4VB/usLjr5iB/ltP7+V/C3km7h8vjryNS6fr+Hbt8h/c3G5ewOLEPn2FxHyRYN8UT9fJPmaBFtVZS+fc9JDECGYjp5Wk0WMIvGgSNwvEkuRbVixyHIx3H/QwtrCb2M9VDFdJLJE9KtI+lUkUkVKtR4Zzn3b5XPDxFtlRYZ82SBf1s+XSb7ttLVHqYCSoczuYhxlxgdlxvtlxqXMEar3KJAy4/z/nbBkRf/4jYPo9SiWtyn+/27UfUMBzkR6ULfu162lbkfbaHuPV179YKGpSUd6lEhN10Dt0+tRSK5Hukdj/HUP/39vD0y6R3t6tJs/EI3RNT3aK0XzHqUolfXoGv5Q4Pr2Ho1L8j441fdop7ztJ0vjPdolbx+gmHb2aErerqUx2oU2+O2DNIUWSd6m+f/XkUZdBdrG+4doHIDskzwfpr14pD3I8KEe5fz1ev7/TI8I367v0XX84QDl9OEezUjRgz3aiVL7e/Rh/nAD7aJ9PfqAJN9IU0i6Vt4+QrvpAz36oLx9lIiu7dG0vN1EOX0QbfDbx2gaLR6Qt1n+/yHaD0BuQNt4v5k+AEBulDwfpxk80vXIcHOPDvLXW/j/t/boAL7d0qND/OEwHaSP9+hWKbrQo2tR6iM9+jh/uI0+SDf26KOS/As0jaSb5O0TdB19tEcfk7dP0gG6qUez8nYHHaSPoQ1+W6RZtHhY3o7x/z9NHwEgt6FtvM/RLXRbr0cL/HYnfRRg/UKP5vj9U/QJ+hgdoBm6gT5AU3zNAUIV1eUw6m6aEHXi7S58sCzlmOgoH0MVrFtIioleh+Z7pfut//jVH4RlscPtebDYUlKDjuKpXtIkzZdUp4ke3d6hiV5JO1BXlX+SttDtyNnodajRK2krTZS0A9dr9DpU75U0OZx9pOxdxK3VaRI/W3sd2tpDy9tRwRbChy29ku4aLtMYftnuga3RXXhK0fo21FCn1Le+fTj/VtpCDeSs9TpU66FbR0rajrsrcIczoN+0rW1SMqWtDLOvHne/cHtbPLDbhss0h1+2cMPw6N2GpwStt0pqYrx861uG87dQOXIGvQ4FPYRpcCVtYQbQoaRXUmvTtlIpmVALP61eh1q9UmSgJvRVvvvpcJnaaG1ouOQriVAEr7gOZ8+DRdjrUNhDXKRWyVcpV+CMQGCGXyIBxgjqcR9nKQEvex3SPYiowyV7XraC1qzm+z5SneaX/+rf/9VfI7wRKrU4EuDdHgCUhkyPS+IiElhe9LilYLjo+noiqSHukaFrIGiFGxXr4Xx5J8fSljbWVDT0Yjx0Ee1CLQwdN6GxKALqAr2NekO93LSeSGqIsWbs8dCtKybQ7fPQmSuEbv8m0O19b9DtvjR0H3pX0F3rYQI8tBk8bIos7YOg6MOlLKxoIhytdRgcIZUA8teeB4uxDoiy00VLOWAc2wBGqeCbT/5nv4ZzJkZaSTf2YfS4GKMPshtOlyAkkEGldrikobALe6UQKQFdj+aiLukOfvFtpB09/BJIY7brCb2DnSOKRDTtGw37jQabVsNdjkq6WRAX+OmD4DofQTVBl2wfIeFINRR1kcJwWroOYxpzT0OK8W0U3NFuBx52QRibbAnGP+objfqNmk2rqWA/6FHgyRc2dx/HdBfYzeVhv8nDbt4f7Le9B9gt/YInF8OGgoC/OwCDbrlMR0YbGExeC+41yxOlS3G/r6OEwLP7Vr5egaH2FLRB53//zdefg9bcQx3S3ADZQ7zC0iE0OTLpfdH19fi5Cu5KnwTdxhsUExgPszvg8DzctFbG6cKG0IV0B68q7xq6myCJfaJHn5Jdz6VhXXyXsB7bBNaPQcD7ZLVTSN4L5Leiik/16M5qi3RpyGfRxzuwZeHd0bvoB93tLZjmKaRP0Bygpkx2jJ6jbAy9cNxS7uCaoEPo8CK2Nk4/yGEPmSmRHubhQy37mxCP0hwdRjfp01xQg6SjnkgoI/0s5Zqv2+mTwEuCjZ7TD5bEUs7Y+s7C2JYj4rDG3q2JWtX2AUp+N9dbV0Tvk3KkJlYXB1WMguxTUDb9WJd5hohZuszHERlAl/kW3B1qynwrdCumzCdIuTc5QJlyb+gy304mH2NfZb5UMJBje9QYih7sDX1YP8zax+3ZPG3L5vOYJrJ58YpTvcK6sbPuzbgzzWpZtjzbms1Dl7y9+v6M7omLmO0VsYuqz9/WPe8xAm10FWbzhRd0jy3DoBdeU/UkjHEH+cgOV0bRSPZwpP1eDxrxEYjY+i0aqS8cqS8eqc+uq68+2hU2rbMj9UUj9YUj9cXr6rPrcDANNK7BwX6qj7RRG2kjuQzM8TocXC+a901wWh+pr7auvnAdDggG1kP1JSP1jVJL/QpwcNMGdHADhZfA8+XGbT0d3HxJuhodt+gK6OC2NXQVXwIH4RXgYG4DOrjrKtPB7VeZDu64ynTwyxvQwS9dZTr4zFWmg89eZTr44gZ0cN9VpoNTV5kO7r3KdLC8AR08cJXp4KGrTAcPX2U6WNXA9BokPKXfFyU01mHhcf2+SKG1Dg3n9Puihdo6PDyre2Ld8oym1iVW8salQRWPoaf1GipqjNQxSnStdXXE3gqucYkxaF16pPOQ4Aa5hY0YdNFw6R3wH+gbPjEtb95Lexm6HMW9t4a+Ynkq3mDeDOeG45u+pPwTX4bO62sp+jl9yXkTXoai1+PXimnMGrKuX6LWTWjlxbVzLbwErSQb08oLa7F/qfla34BWxqnhmoueQn6kxV7r6lLIy1eZQi5eZQr5/t8Ihbx6FSjkB1eBQl55vxSSpbh4XvVxPqNknKTcjPrvX2DDiAoNM+offVuMI6phmVH/3TNiHNG77KEqLDNSwkX3failvWhte/G69ux7as9Ke0mf5qU9u7a9aF174XtqL5H2Gn2ak/bCte3Zde3FG7R3uaN8aCw0NUu5+JRtaZttl8HuJIXpkcWPzWP8JHlIER4aFE2rRm9WNRDRCC9Jb1YlUMrgxfZmlSXY9ETTSvVmOegm2zCPwewDLsLweBUT+RT2PmzS42+B4cBDY3AEH6Mm3z8vF8OkYsnxiNY+pK2BaYr1Kg0y2e3v0RKIjZLYFIjtWSb4V2e3Q9nx7QC2JBmb+yKabZpwmypNA6XSp5o6HNyzNIilmwcCYbRfuUcYq8q70MFIcZI3sIXyXs3wc3Z8OYFbOTKVB7hc06k7YMBDph36EMNOwxwcF0TJBRtZG47nfM1XcqSIO3x5CgWudrTbbSr3MGIyTZtpp92FA6TGAyXtIdC4U+6ZA2+mUMDgbiVSDpceSjS4VXbSZBjdh0THpCWemCazjBwPkzr89tuPrr6iDrHV/uHV1a+svqYPmWd13x/rcS3RxacBVdfBSsXQeKBm2VJUUthQeyjlvO5/f1YPEmBXBKQ97b1v4d/iVlf1rPnZjK8Kr85WBQBjIhaSP5txZnnWNCpfPXh5eKe785VH49P8YOQ2d76XDi4OCTCgs127+q6+D8Px3risZAMs669Ls5VngyRzLGfTb6LvPME9eFWLW+8PONz7LWp/BWTh7TdnEfGJzeFPOWjsXp8B8ZDOZpsc6H3WXA/yQvc0YhFPoMu7YfYsQRUC8aLk0NoFk9AchxAU0+1JBE3+uPsQbGePFGqKewoz/cFl6rijwV/CnuI+9cA9wrfx5cY98/XKIlT50K27JRSsWS54XC58XTteLFfHlxFcH32+cwpOPErsxDjUsrtwXleXXw8HiubQr0pe3e/8pna7/RXn/gonE8y5jO9jQVRdvghnzxExcYPVOg7MXLw8i3BCDK6mEPGEXNzmG6y8GWY4CG1t3YWnES12AMnwtVWiGWVrOR8qW+LhmUE8vAH4bAQcHdSZRBx353Eljzuv5esWRhfs7Pk6Y7LuNcQG3OJWjWQY8xme6WeYLG/VY+4Z49u+4FFnll1yq/7dx/Uw6hA14hkYQGccofV3DMK19a3s9lQlC+XCW/Xvfk2maIhY3Re+NlwRBpjNWCU8g4vXtuS/1zb5nqz/Hg5o4x9UtLHlkrTxm9qHmxrqoNyEVtFGSgEo/6kD4hnjwzMH7qfZrDm3gwL3g2zWvLmdAncxmzWvbWeu+v1t8CTfwc+vbi1nzevy/SfQov90OwXZ9TKTVDWTZ71nf/+6RC2sojBVUG9/A58eTO9nD8gvwgRwFE86xOb1gPc7evDtOe/SUHmW/UC7xqlCu9e3wt9m1vyYOaR7zb/+SF7/b//6irz+tX/9vk4RlRmGqTZN/xLG36tJ+o/tqjp5uvelz3/+5ImTS6eX6f6l+890v6xuPPDRAzceuHHm/jPLp5a+rE6ePnv81Mn76NTJ5aXu8VMHTy2d/sLyF3vUW1rup504c98SDSd86XT79JkHT9MXl47ft9Slz586/oXREved7C0fP31iafTr504u+2qou/TA0vFltXzmDN1//PSXq89nuv2i1Pvy/Z87c6rXL91bPtNduo8+d+rMiXYFjfrclz7/+aUuLXW7Z7qqt9xdOn6/fxkBfmaG7j/Z6508/QVaOn3fzJnPz3A16uTpE2e63aUTy1VXTnxxaeSzh2vt5/uOLx/vfxztMqFPnz/epc8dP9FWVbXdEwDg/uPLJ77YL/HgydP3nXmQeid/ZWmAIu7d8pcfWNpkZLg/6xvlr9WwnDhz/wPdpV7v5JnTdP/S8hfP3KfwX6bG1RalVKJiVVORqqtQpcqqhgpUUxk1prRqKXexkf6BDZRVoYpUrBJVU3WVqqZqqXG1Ve1QU2qv2qc+rD6qblWfUv+JOqF66jH1e+qP1V8oo5Vva/Rv3P9t8X9b/d+E/9vm/zK1qL7HkSeMEhgAa1ONq50qVzcqp46rR9UfKa0fxS2wgbY60olu6ExPatI36Dl973D7VZtVW2hju9qudqgdalJNqp1qp9qldqkpNaV2q93qGnWNmlNz6r32P5Duq9U1f4/6v6/4v8f83+P+7wn/d/4q9F+v6ovD7VbtVe08qZ5Uv6Z+TZ1T59RX1VfVr6tfV7+hfkM9pZ5SX1NfU19XX1d0WKnVRCmtldqjlWoppS4cUUrVpH97lHzjvvpvW5VSsXIXxtNjEjxk8M+s+Res+WfX/AtH/rnzW9KltVWtLVplj/y/2P9L/L+a/1f3/1L/r+H/Nfmfu7g13VdVH/sOZuNbVBLXonqY2kbQNGO6pdwbW9P7Y27bqoT/KR6vTCX+OWIfncTnATXWGJaMv1fPGCV5pneelcYznoxWVp6NNlplNeV+NpHWbvhlLVj9/wA=")))), X) });
}
init_constants();
init_configuration();
init_codec_worker();
init_codec_pool();
init_aes_crypto_stream();
var FORMAT_DEFLATE = "deflate";
var FORMAT_DEFLATE_RAW2 = "deflate-raw";
var FORMAT_DEFLATE64_RAW2 = "deflate64-raw";
var FORMAT_GZIP2 = "gzip";
var Z_MEM_ERROR = -4;
var Z_MEM_ERROR_CODE2 = "Z_MEM_ERROR";
var COMPRESSION_FORMATS = [FORMAT_DEFLATE, FORMAT_DEFLATE_RAW2, FORMAT_GZIP2];
var DECOMPRESSION_FORMATS = [FORMAT_DEFLATE, FORMAT_DEFLATE_RAW2, FORMAT_GZIP2, FORMAT_DEFLATE64_RAW2];
var wasm;
var malloc;
var free;
var memory;
var initError;
function setWasmExports(wasmAPI) {
  wasm = wasmAPI;
  ({ malloc, free, memory } = wasm);
  if (typeof malloc !== "function" || typeof free !== "function" || !memory) {
    wasm = malloc = free = memory = null;
    throw new Error("Invalid WASM module");
  }
}
function setInitError(error) {
  initError = error;
}
function setZlibCode(error, result) {
  if (result === Z_MEM_ERROR) {
    error.code = Z_MEM_ERROR_CODE2;
  }
  return error;
}
function _make(isCompress, type, options = {}) {
  if (!(isCompress ? COMPRESSION_FORMATS : DECOMPRESSION_FORMATS).includes(type)) {
    throw new TypeError("Unsupported format: " + type);
  }
  if (!wasm) {
    const error = new Error("WASM module not loaded");
    error.cause = initError;
    throw error;
  }
  const level = typeof options.level === "number" ? options.level : -1;
  const outBufferSize = typeof options.outBuffer === "number" ? options.outBuffer : 64 * 1024;
  const inBufferSize = typeof options.inBufferSize === "number" ? options.inBufferSize : 64 * 1024;
  const state = { out: 0, in: 0, inBufferSize: 0, streamHandle: 0, streamEnded: false };
  let readableController, writableController, resolveWrite, cancelReason;
  let backpressure = true;
  let cancelled = false;
  initStream2();
  const readable = new ReadableStream({
    start(controller) {
      readableController = controller;
    },
    pull() {
      backpressure = false;
      resumeWrite();
    },
    cancel(reason) {
      cancelled = true;
      cancelReason = reason;
      disposeStream(state);
      writableController.error(reason);
      resumeWrite();
    }
  }, { highWaterMark: 0 });
  const writable = new WritableStream({
    start(controller) {
      writableController = controller;
    },
    async write(chunk) {
      if (backpressure) {
        await new Promise((resolve) => resolveWrite = resolve);
      }
      if (cancelled) {
        throw cancelReason;
      }
      try {
        processChunk(chunk);
      } catch (error) {
        disposeStream(state);
        readableController.error(error);
        throw error;
      }
    },
    close() {
      if (cancelled) {
        return;
      }
      try {
        flushStream();
      } catch (error) {
        disposeStream(state);
        readableController.error(error);
        throw error;
      }
      const result = disposeStream(state);
      if (result !== 0) {
        const error = setZlibCode(new Error("end error:" + result), result);
        readableController.error(error);
        throw error;
      }
      readableController.close();
    },
    abort(reason) {
      disposeStream(state);
      readableController.error(reason);
    }
  }, { highWaterMark: 1 });
  return { readable, writable };
  function initStream2() {
    try {
      let result;
      state.out = malloc(outBufferSize);
      state.in = malloc(inBufferSize);
      state.inBufferSize = inBufferSize;
      if (!state.out || !state.in) {
        throw setZlibCode(new Error("allocation failed"), Z_MEM_ERROR);
      }
      if (isCompress) {
        state._process = wasm.deflate_process;
        state._last_consumed = wasm.deflate_last_consumed;
        state._end = wasm.deflate_end;
        state.streamHandle = wasm.deflate_new();
        if (type === FORMAT_GZIP2) {
          result = wasm.deflate_init_gzip(state.streamHandle, level);
        } else if (type === FORMAT_DEFLATE_RAW2) {
          result = wasm.deflate_init_raw(state.streamHandle, level);
        } else {
          result = wasm.deflate_init(state.streamHandle, level);
        }
      } else {
        if (type === FORMAT_DEFLATE64_RAW2) {
          state._process = wasm.inflate9_process;
          state._last_consumed = wasm.inflate9_last_consumed;
          state._end = wasm.inflate9_end;
          state.streamHandle = wasm.inflate9_new();
          result = wasm.inflate9_init_raw(state.streamHandle);
        } else {
          state._process = wasm.inflate_process;
          state._last_consumed = wasm.inflate_last_consumed;
          state._end = wasm.inflate_end;
          state.streamHandle = wasm.inflate_new();
          if (type === FORMAT_DEFLATE_RAW2) {
            result = wasm.inflate_init_raw(state.streamHandle);
          } else if (type === FORMAT_GZIP2) {
            result = wasm.inflate_init_gzip(state.streamHandle);
          } else {
            result = wasm.inflate_init(state.streamHandle);
          }
        }
      }
      if (result !== 0) {
        throw setZlibCode(new Error("init failed:" + result), result);
      }
    } catch (error) {
      disposeStream(state);
      throw error;
    }
  }
  function processChunk(chunk) {
    const heap = new Uint8Array(memory.buffer);
    const process = state._process;
    const last_consumed = state._last_consumed;
    const out = state.out;
    let offset = 0;
    while (offset < chunk.length) {
      if (state.streamEnded) {
        throw new Error("trailing data after the end of the stream");
      }
      const toRead = Math.min(chunk.length - offset, 32 * 1024);
      if (!state.in || state.inBufferSize < toRead) {
        if (state.in && free) {
          free(state.in);
          state.in = 0;
        }
        state.in = malloc(toRead);
        state.inBufferSize = toRead;
        if (!state.in) {
          throw setZlibCode(new Error("allocation failed"), Z_MEM_ERROR);
        }
      }
      heap.set(chunk.subarray(offset, offset + toRead), state.in);
      const result = process(state.streamHandle, state.in, toRead, out, outBufferSize, 0);
      const code = result >> 24 & 255;
      const signedCode = code & 128 ? code - 256 : code;
      if (signedCode < 0) {
        throw setZlibCode(new Error("process error:" + signedCode), signedCode);
      }
      const prod = result & 16777215;
      if (prod) {
        enqueue(heap.slice(out, out + prod));
      }
      const consumed = last_consumed(state.streamHandle);
      if (code === 1) {
        state.streamEnded = true;
      } else if (consumed === 0 && prod === 0) {
        break;
      }
      offset += consumed;
    }
  }
  function flushStream() {
    const heap = new Uint8Array(memory.buffer);
    const process = state._process;
    const out = state.out;
    while (true) {
      const result = process(state.streamHandle, 0, 0, out, outBufferSize, 4);
      const code = result >> 24 & 255;
      const signedCode = code & 128 ? code - 256 : code;
      if (signedCode < 0) {
        throw setZlibCode(new Error("process error:" + signedCode), signedCode);
      }
      const produced = result & 16777215;
      if (produced) {
        enqueue(heap.slice(out, out + produced));
      }
      if (code === 1 || produced === 0) {
        break;
      }
    }
  }
  function enqueue(chunk) {
    backpressure = true;
    readableController.enqueue(chunk);
  }
  function resumeWrite() {
    if (resolveWrite) {
      const resolve = resolveWrite;
      resolveWrite = null;
      resolve();
    }
  }
  function disposeStream(state2) {
    let endResult = 0;
    if (state2.streamHandle && state2._end) {
      endResult = state2._end(state2.streamHandle);
    }
    state2.streamHandle = 0;
    if (state2.in && free) {
      free(state2.in);
    }
    state2.in = 0;
    if (state2.out && free) {
      free(state2.out);
    }
    state2.out = 0;
    return endResult;
  }
}
var CompressionStreamZlib = class {
  constructor(type = FORMAT_DEFLATE, options) {
    return _make(true, type, options);
  }
};
var DecompressionStreamZlib = class {
  constructor(type = FORMAT_DEFLATE, options) {
    return _make(false, type, options);
  }
};
CompressionStreamZlib.requiresModule = true;
DecompressionStreamZlib.requiresModule = true;
CompressionStreamZlib.supportedFormats = COMPRESSION_FORMATS;
DecompressionStreamZlib.supportedFormats = DECOMPRESSION_FORMATS;
init_constants();
init_aes_hmac_sha1();
var BUFFER_LENGTH = 64 * 1024;
var DIGEST_LENGTH = 20;
var wasm2;
var buffer;
function setWasmExports2(wasmAPI) {
  if (typeof wasmAPI.aes_hmac_new == FUNCTION_TYPE) {
    wasm2 = wasmAPI;
    buffer = 0;
  }
}
function createEngine3(key, authenticationKey) {
  const exports = wasm2;
  let context = exports ? createContext(exports, key, authenticationKey) : 0;
  if (!context) {
    return createEngine(key, authenticationKey);
  }
  const scratch = buffer;
  return {
    process(data, decrypt2) {
      for (let offset = 0; offset < data.length; offset += BUFFER_LENGTH) {
        const chunk = data.subarray(offset, offset + BUFFER_LENGTH);
        const heap = getHeap(exports);
        heap.set(chunk, scratch);
        exports.aes_hmac_process(context, scratch, chunk.length, decrypt2 ? 1 : 0);
        chunk.set(heap.subarray(scratch, scratch + chunk.length));
      }
    },
    digest() {
      exports.aes_hmac_end(context, scratch);
      context = 0;
      return getHeap(exports).slice(scratch, scratch + DIGEST_LENGTH);
    },
    dispose() {
      if (context) {
        exports.aes_hmac_end(context, 0);
        context = 0;
      }
    }
  };
}
function createContext(exports, key, authenticationKey) {
  if (!buffer) {
    buffer = exports.malloc(BUFFER_LENGTH);
  }
  const context = buffer ? exports.aes_hmac_new() : 0;
  if (context) {
    const heap = getHeap(exports);
    heap.set(key, buffer);
    heap.set(authenticationKey, buffer + key.length);
    if (exports.aes_hmac_init(context, buffer, key.length, buffer + key.length, authenticationKey.length)) {
      exports.aes_hmac_end(context, 0);
      return 0;
    }
  }
  return context;
}
function getHeap(exports) {
  return new Uint8Array(exports.memory.buffer);
}
var initializedModule = false;
async function initModule2(wasmURI, { baseURI }) {
  if (!initializedModule) {
    try {
      await instantiateModule(wasmURI, baseURI);
      initializedModule = true;
    } catch (error) {
      setInitError(error);
      throw error;
    }
  }
}
async function instantiateModule(wasmURI, baseURI) {
  let arrayBuffer, uri;
  try {
    try {
      uri = new URL(wasmURI, baseURI);
    } catch {
    }
    const response = await fetch(uri);
    arrayBuffer = await response.arrayBuffer();
  } catch (error) {
    if (wasmURI.startsWith("data:application/wasm;base64,")) {
      arrayBuffer = arrayBufferFromDataURI(wasmURI);
    } else {
      throw error;
    }
  }
  const wasmInstance = await WebAssembly.instantiate(arrayBuffer);
  setWasmExports(wasmInstance.instance.exports);
  setWasmExports2(wasmInstance.instance.exports);
}
function arrayBufferFromDataURI(dataURI) {
  const base64 = dataURI.split(",")[1];
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; ++i) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
var modulePromise;
setAESEngine(createEngine3);
configureWorker({
  initModule: (config2) => {
    if (!modulePromise) {
      let { wasmURI } = config2;
      if (typeof wasmURI == FUNCTION_TYPE) {
        wasmURI = wasmURI();
      }
      modulePromise = initModule2(wasmURI, config2).catch((error) => {
        modulePromise = null;
        throw error;
      });
    }
    return modulePromise;
  }
});
setDefaultConfiguration({
  CompressionStreamFallback: CompressionStreamZlib,
  DecompressionStreamFallback: DecompressionStreamZlib
});
s(setDefaultConfiguration);
init_io();
init_zip_reader();
init_zip_entry();
init_options();
init_codec_worker();
init_constants();
init_array();
init_compatible_streams();
init_error();
var EMPTY_RAW_PASSWORD = new Uint8Array(0);
e(setDefaultConfiguration);
var t3 = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 48, 8, 96, 3, 127, 127, 127, 1, 127, 96, 3, 127, 127, 127, 0, 96, 2, 127, 127, 0, 96, 1, 127, 1, 127, 96, 3, 127, 127, 126, 1, 126, 96, 3, 126, 127, 127, 1, 126, 96, 2, 127, 126, 0, 96, 1, 127, 1, 126, 3, 11, 10, 0, 0, 2, 1, 3, 4, 5, 6, 1, 7, 5, 3, 1, 0, 1, 7, 85, 9, 3, 109, 101, 109, 2, 0, 5, 120, 120, 104, 51, 50, 0, 0, 6, 105, 110, 105, 116, 51, 50, 0, 2, 8, 117, 112, 100, 97, 116, 101, 51, 50, 0, 3, 8, 100, 105, 103, 101, 115, 116, 51, 50, 0, 4, 5, 120, 120, 104, 54, 52, 0, 5, 6, 105, 110, 105, 116, 54, 52, 0, 7, 8, 117, 112, 100, 97, 116, 101, 54, 52, 0, 8, 8, 100, 105, 103, 101, 115, 116, 54, 52, 0, 9, 10, 251, 22, 10, 242, 1, 1, 4, 127, 32, 0, 32, 1, 106, 33, 3, 32, 1, 65, 16, 79, 4, 127, 32, 3, 65, 16, 107, 33, 6, 32, 2, 65, 168, 136, 141, 161, 2, 106, 33, 3, 32, 2, 65, 137, 235, 208, 208, 7, 107, 33, 4, 32, 2, 65, 207, 140, 162, 142, 6, 106, 33, 5, 3, 64, 32, 3, 32, 0, 40, 2, 0, 65, 247, 148, 175, 175, 120, 108, 106, 65, 13, 119, 65, 177, 243, 221, 241, 121, 108, 33, 3, 32, 4, 32, 0, 65, 4, 106, 34, 0, 40, 2, 0, 65, 247, 148, 175, 175, 120, 108, 106, 65, 13, 119, 65, 177, 243, 221, 241, 121, 108, 33, 4, 32, 2, 32, 0, 65, 4, 106, 34, 0, 40, 2, 0, 65, 247, 148, 175, 175, 120, 108, 106, 65, 13, 119, 65, 177, 243, 221, 241, 121, 108, 33, 2, 32, 5, 32, 0, 65, 4, 106, 34, 0, 40, 2, 0, 65, 247, 148, 175, 175, 120, 108, 106, 65, 13, 119, 65, 177, 243, 221, 241, 121, 108, 33, 5, 32, 6, 32, 0, 65, 4, 106, 34, 0, 79, 13, 0, 11, 32, 2, 65, 12, 119, 32, 5, 65, 18, 119, 106, 32, 4, 65, 7, 119, 106, 32, 3, 65, 1, 119, 106, 5, 32, 2, 65, 177, 207, 217, 178, 1, 106, 11, 32, 1, 106, 32, 0, 32, 1, 65, 15, 113, 16, 1, 11, 146, 1, 0, 32, 1, 32, 2, 106, 33, 2, 3, 64, 32, 1, 65, 4, 106, 32, 2, 75, 69, 4, 64, 32, 0, 32, 1, 40, 2, 0, 65, 189, 220, 202, 149, 124, 108, 106, 65, 17, 119, 65, 175, 214, 211, 190, 2, 108, 33, 0, 32, 1, 65, 4, 106, 33, 1, 12, 1, 11, 11, 3, 64, 32, 1, 32, 2, 79, 69, 4, 64, 32, 0, 32, 1, 45, 0, 0, 65, 177, 207, 217, 178, 1, 108, 106, 65, 11, 119, 65, 177, 243, 221, 241, 121, 108, 33, 0, 32, 1, 65, 1, 106, 33, 1, 12, 1, 11, 11, 32, 0, 32, 0, 65, 15, 118, 115, 65, 247, 148, 175, 175, 120, 108, 34, 0, 65, 13, 118, 32, 0, 115, 65, 189, 220, 202, 149, 124, 108, 34, 0, 65, 16, 118, 32, 0, 115, 11, 63, 0, 32, 0, 65, 8, 106, 32, 1, 65, 168, 136, 141, 161, 2, 106, 54, 2, 0, 32, 0, 65, 12, 106, 32, 1, 65, 137, 235, 208, 208, 7, 107, 54, 2, 0, 32, 0, 65, 16, 106, 32, 1, 54, 2, 0, 32, 0, 65, 20, 106, 32, 1, 65, 207, 140, 162, 142, 6, 106, 54, 2, 0, 11, 195, 4, 1, 6, 127, 32, 1, 32, 2, 106, 33, 6, 32, 0, 65, 24, 106, 33, 4, 32, 0, 65, 40, 106, 40, 2, 0, 33, 3, 32, 0, 32, 0, 40, 2, 0, 32, 2, 106, 54, 2, 0, 32, 0, 65, 4, 106, 34, 5, 32, 5, 40, 2, 0, 32, 2, 65, 16, 79, 32, 0, 40, 2, 0, 65, 16, 79, 114, 114, 54, 2, 0, 32, 2, 32, 3, 106, 65, 16, 73, 4, 64, 32, 3, 32, 4, 106, 32, 1, 32, 2, 252, 10, 0, 0, 32, 0, 65, 40, 106, 32, 2, 32, 3, 106, 54, 2, 0, 15, 11, 32, 3, 4, 64, 32, 3, 32, 4, 106, 32, 1, 65, 16, 32, 3, 107, 34, 2, 252, 10, 0, 0, 32, 0, 65, 8, 106, 34, 3, 32, 3, 40, 2, 0, 32, 4, 40, 2, 0, 65, 247, 148, 175, 175, 120, 108, 106, 65, 13, 119, 65, 177, 243, 221, 241, 121, 108, 54, 2, 0, 32, 0, 65, 12, 106, 34, 3, 32, 3, 40, 2, 0, 32, 4, 65, 4, 106, 40, 2, 0, 65, 247, 148, 175, 175, 120, 108, 106, 65, 13, 119, 65, 177, 243, 221, 241, 121, 108, 54, 2, 0, 32, 0, 65, 16, 106, 34, 3, 32, 3, 40, 2, 0, 32, 4, 65, 8, 106, 40, 2, 0, 65, 247, 148, 175, 175, 120, 108, 106, 65, 13, 119, 65, 177, 243, 221, 241, 121, 108, 54, 2, 0, 32, 0, 65, 20, 106, 34, 3, 32, 3, 40, 2, 0, 32, 4, 65, 12, 106, 40, 2, 0, 65, 247, 148, 175, 175, 120, 108, 106, 65, 13, 119, 65, 177, 243, 221, 241, 121, 108, 54, 2, 0, 32, 0, 65, 40, 106, 65, 0, 54, 2, 0, 32, 1, 32, 2, 106, 33, 1, 11, 32, 1, 32, 6, 65, 16, 107, 77, 4, 64, 32, 6, 65, 16, 107, 33, 8, 32, 0, 65, 8, 106, 40, 2, 0, 33, 2, 32, 0, 65, 12, 106, 40, 2, 0, 33, 3, 32, 0, 65, 16, 106, 40, 2, 0, 33, 5, 32, 0, 65, 20, 106, 40, 2, 0, 33, 7, 3, 64, 32, 2, 32, 1, 40, 2, 0, 65, 247, 148, 175, 175, 120, 108, 106, 65, 13, 119, 65, 177, 243, 221, 241, 121, 108, 33, 2, 32, 3, 32, 1, 65, 4, 106, 34, 1, 40, 2, 0, 65, 247, 148, 175, 175, 120, 108, 106, 65, 13, 119, 65, 177, 243, 221, 241, 121, 108, 33, 3, 32, 5, 32, 1, 65, 4, 106, 34, 1, 40, 2, 0, 65, 247, 148, 175, 175, 120, 108, 106, 65, 13, 119, 65, 177, 243, 221, 241, 121, 108, 33, 5, 32, 7, 32, 1, 65, 4, 106, 34, 1, 40, 2, 0, 65, 247, 148, 175, 175, 120, 108, 106, 65, 13, 119, 65, 177, 243, 221, 241, 121, 108, 33, 7, 32, 8, 32, 1, 65, 4, 106, 34, 1, 79, 13, 0, 11, 32, 0, 65, 8, 106, 32, 2, 54, 2, 0, 32, 0, 65, 12, 106, 32, 3, 54, 2, 0, 32, 0, 65, 16, 106, 32, 5, 54, 2, 0, 32, 0, 65, 20, 106, 32, 7, 54, 2, 0, 11, 32, 1, 32, 6, 73, 4, 64, 32, 4, 32, 1, 32, 6, 32, 1, 107, 34, 1, 252, 10, 0, 0, 32, 0, 65, 40, 106, 32, 1, 54, 2, 0, 11, 11, 97, 1, 1, 127, 32, 0, 65, 16, 106, 40, 2, 0, 33, 1, 32, 0, 65, 4, 106, 40, 2, 0, 4, 127, 32, 1, 65, 12, 119, 32, 0, 65, 20, 106, 40, 2, 0, 65, 18, 119, 106, 32, 0, 65, 12, 106, 40, 2, 0, 65, 7, 119, 106, 32, 0, 65, 8, 106, 40, 2, 0, 65, 1, 119, 106, 5, 32, 1, 65, 177, 207, 217, 178, 1, 106, 11, 32, 0, 40, 2, 0, 106, 32, 0, 65, 24, 106, 32, 0, 65, 40, 106, 40, 2, 0, 16, 1, 11, 255, 3, 2, 3, 126, 1, 127, 32, 0, 32, 1, 106, 33, 6, 32, 1, 65, 32, 79, 4, 126, 32, 6, 65, 32, 107, 33, 6, 32, 2, 66, 214, 235, 130, 238, 234, 253, 137, 245, 224, 0, 124, 33, 3, 32, 2, 66, 177, 169, 172, 193, 173, 184, 212, 166, 61, 125, 33, 4, 32, 2, 66, 249, 234, 208, 208, 231, 201, 161, 228, 225, 0, 124, 33, 5, 3, 64, 32, 3, 32, 0, 41, 3, 0, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 124, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 33, 3, 32, 4, 32, 0, 65, 8, 106, 34, 0, 41, 3, 0, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 124, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 33, 4, 32, 2, 32, 0, 65, 8, 106, 34, 0, 41, 3, 0, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 124, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 33, 2, 32, 5, 32, 0, 65, 8, 106, 34, 0, 41, 3, 0, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 124, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 33, 5, 32, 6, 32, 0, 65, 8, 106, 34, 0, 79, 13, 0, 11, 32, 2, 66, 12, 137, 32, 5, 66, 18, 137, 124, 32, 4, 66, 7, 137, 124, 32, 3, 66, 1, 137, 124, 32, 3, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 133, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 66, 157, 163, 181, 234, 131, 177, 141, 138, 250, 0, 125, 32, 4, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 133, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 66, 157, 163, 181, 234, 131, 177, 141, 138, 250, 0, 125, 32, 2, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 133, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 66, 157, 163, 181, 234, 131, 177, 141, 138, 250, 0, 125, 32, 5, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 133, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 66, 157, 163, 181, 234, 131, 177, 141, 138, 250, 0, 125, 5, 32, 2, 66, 197, 207, 217, 178, 241, 229, 186, 234, 39, 124, 11, 32, 1, 173, 124, 32, 0, 32, 1, 65, 31, 113, 16, 6, 11, 134, 2, 0, 32, 1, 32, 2, 106, 33, 2, 3, 64, 32, 2, 32, 1, 65, 8, 106, 79, 4, 64, 32, 1, 41, 3, 0, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 32, 0, 133, 66, 27, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 66, 157, 163, 181, 234, 131, 177, 141, 138, 250, 0, 125, 33, 0, 32, 1, 65, 8, 106, 33, 1, 12, 1, 11, 11, 32, 1, 65, 4, 106, 32, 2, 77, 4, 64, 32, 0, 32, 1, 53, 2, 0, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 133, 66, 23, 137, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 66, 249, 243, 221, 241, 153, 246, 153, 171, 22, 124, 33, 0, 32, 1, 65, 4, 106, 33, 1, 11, 3, 64, 32, 1, 32, 2, 73, 4, 64, 32, 0, 32, 1, 49, 0, 0, 66, 197, 207, 217, 178, 241, 229, 186, 234, 39, 126, 133, 66, 11, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 33, 0, 32, 1, 65, 1, 106, 33, 1, 12, 1, 11, 11, 32, 0, 32, 0, 66, 33, 136, 133, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 34, 0, 32, 0, 66, 29, 136, 133, 66, 249, 243, 221, 241, 153, 246, 153, 171, 22, 126, 34, 0, 32, 0, 66, 32, 136, 133, 11, 77, 0, 32, 0, 65, 8, 106, 32, 1, 66, 214, 235, 130, 238, 234, 253, 137, 245, 224, 0, 124, 55, 3, 0, 32, 0, 65, 16, 106, 32, 1, 66, 177, 169, 172, 193, 173, 184, 212, 166, 61, 125, 55, 3, 0, 32, 0, 65, 24, 106, 32, 1, 55, 3, 0, 32, 0, 65, 32, 106, 32, 1, 66, 249, 234, 208, 208, 231, 201, 161, 228, 225, 0, 124, 55, 3, 0, 11, 244, 4, 2, 3, 127, 4, 126, 32, 1, 32, 2, 106, 33, 5, 32, 0, 65, 40, 106, 33, 4, 32, 0, 65, 200, 0, 106, 40, 2, 0, 33, 3, 32, 0, 32, 0, 41, 3, 0, 32, 2, 173, 124, 55, 3, 0, 32, 2, 32, 3, 106, 65, 32, 73, 4, 64, 32, 3, 32, 4, 106, 32, 1, 32, 2, 252, 10, 0, 0, 32, 0, 65, 200, 0, 106, 32, 2, 32, 3, 106, 54, 2, 0, 15, 11, 32, 3, 4, 64, 32, 3, 32, 4, 106, 32, 1, 65, 32, 32, 3, 107, 34, 2, 252, 10, 0, 0, 32, 0, 65, 8, 106, 34, 3, 32, 3, 41, 3, 0, 32, 4, 41, 3, 0, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 124, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 55, 3, 0, 32, 0, 65, 16, 106, 34, 3, 32, 3, 41, 3, 0, 32, 4, 65, 8, 106, 41, 3, 0, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 124, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 55, 3, 0, 32, 0, 65, 24, 106, 34, 3, 32, 3, 41, 3, 0, 32, 4, 65, 16, 106, 41, 3, 0, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 124, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 55, 3, 0, 32, 0, 65, 32, 106, 34, 3, 32, 3, 41, 3, 0, 32, 4, 65, 24, 106, 41, 3, 0, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 124, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 55, 3, 0, 32, 0, 65, 200, 0, 106, 65, 0, 54, 2, 0, 32, 1, 32, 2, 106, 33, 1, 11, 32, 1, 65, 32, 106, 32, 5, 77, 4, 64, 32, 5, 65, 32, 107, 33, 2, 32, 0, 65, 8, 106, 41, 3, 0, 33, 6, 32, 0, 65, 16, 106, 41, 3, 0, 33, 7, 32, 0, 65, 24, 106, 41, 3, 0, 33, 8, 32, 0, 65, 32, 106, 41, 3, 0, 33, 9, 3, 64, 32, 6, 32, 1, 41, 3, 0, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 124, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 33, 6, 32, 7, 32, 1, 65, 8, 106, 34, 1, 41, 3, 0, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 124, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 33, 7, 32, 8, 32, 1, 65, 8, 106, 34, 1, 41, 3, 0, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 124, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 33, 8, 32, 9, 32, 1, 65, 8, 106, 34, 1, 41, 3, 0, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 124, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 33, 9, 32, 2, 32, 1, 65, 8, 106, 34, 1, 79, 13, 0, 11, 32, 0, 65, 8, 106, 32, 6, 55, 3, 0, 32, 0, 65, 16, 106, 32, 7, 55, 3, 0, 32, 0, 65, 24, 106, 32, 8, 55, 3, 0, 32, 0, 65, 32, 106, 32, 9, 55, 3, 0, 11, 32, 1, 32, 5, 73, 4, 64, 32, 4, 32, 1, 32, 5, 32, 1, 107, 34, 1, 252, 10, 0, 0, 32, 0, 65, 200, 0, 106, 32, 1, 54, 2, 0, 11, 11, 188, 2, 1, 5, 126, 32, 0, 65, 24, 106, 41, 3, 0, 33, 1, 32, 0, 41, 3, 0, 34, 2, 66, 32, 90, 4, 126, 32, 0, 65, 8, 106, 41, 3, 0, 34, 3, 66, 1, 137, 32, 0, 65, 16, 106, 41, 3, 0, 34, 4, 66, 7, 137, 124, 32, 1, 66, 12, 137, 32, 0, 65, 32, 106, 41, 3, 0, 34, 5, 66, 18, 137, 124, 124, 32, 3, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 133, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 66, 157, 163, 181, 234, 131, 177, 141, 138, 250, 0, 125, 32, 4, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 133, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 66, 157, 163, 181, 234, 131, 177, 141, 138, 250, 0, 125, 32, 1, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 133, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 66, 157, 163, 181, 234, 131, 177, 141, 138, 250, 0, 125, 32, 5, 66, 207, 214, 211, 190, 210, 199, 171, 217, 66, 126, 66, 31, 137, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 133, 66, 135, 149, 175, 175, 152, 182, 222, 155, 158, 127, 126, 66, 157, 163, 181, 234, 131, 177, 141, 138, 250, 0, 125, 5, 32, 1, 66, 197, 207, 217, 178, 241, 229, 186, 234, 39, 124, 11, 32, 2, 124, 32, 0, 65, 40, 106, 32, 2, 66, 31, 131, 167, 16, 6, 11]);
async function e3() {
  return (function(t4) {
    const { exports: { mem: e4, xxh32: n3, xxh64: r2, init32: i, update32: a, digest32: o2, init64: s2, update64: u, digest64: c } } = t4;
    let h = new Uint8Array(e4.buffer);
    function g(t5, n4) {
      if (e4.buffer.byteLength < t5 + n4) {
        const r3 = Math.ceil((t5 + n4 - e4.buffer.byteLength) / 65536);
        e4.grow(r3), h = new Uint8Array(e4.buffer);
      }
    }
    function f2(t5, e5, n4, r3, i2, a2) {
      g(t5);
      const o3 = new Uint8Array(t5);
      return h.set(o3), n4(0, e5), o3.set(h.subarray(0, t5)), { update(e6) {
        let n5;
        return h.set(o3), "string" == typeof e6 ? (g(3 * e6.length, t5), n5 = w.encodeInto(e6, h.subarray(t5)).written) : (g(e6.byteLength, t5), h.set(e6, t5), n5 = e6.byteLength), r3(0, t5, n5), o3.set(h.subarray(0, t5)), this;
      }, digest: () => (h.set(o3), a2(i2(0))) };
    }
    function y(t5) {
      return t5 >>> 0;
    }
    const b2 = 2n ** 64n - 1n;
    function d(t5) {
      return t5 & b2;
    }
    const w = new TextEncoder(), l2 = 0, p2 = 0n;
    function x(t5, e5 = l2) {
      return g(3 * t5.length, 0), y(n3(0, w.encodeInto(t5, h).written, e5));
    }
    function L(t5, e5 = p2) {
      return g(3 * t5.length, 0), d(r2(0, w.encodeInto(t5, h).written, e5));
    }
    return { h32: x, h32ToString: (t5, e5 = l2) => x(t5, e5).toString(16).padStart(8, "0"), h32Raw: (t5, e5 = l2) => (g(t5.byteLength, 0), h.set(t5), y(n3(0, t5.byteLength, e5))), create32: (t5 = l2) => f2(48, t5, i, a, o2, y), h64: L, h64ToString: (t5, e5 = p2) => L(t5, e5).toString(16).padStart(16, "0"), h64Raw: (t5, e5 = p2) => (g(t5.byteLength, 0), h.set(t5), d(r2(0, t5.byteLength, e5))), create64: (t5 = p2) => f2(88, t5, s2, u, c, d) };
  })((await WebAssembly.instantiate(t3)).instance);
}
var wasmBinary;
var sqlitePromise;
var StreamReader = class {
  constructor(stream) {
    this.reader = stream.getReader();
    this.chunk = new Uint8Array();
    this.position = 0;
  }
  async read(size, sink) {
    let remaining = size;
    while (remaining) {
      if (this.position === this.chunk.length) {
        const { value, done } = await this.reader.read();
        if (done) throw new Error("Truncated tar archive");
        this.chunk = value;
        this.position = 0;
        if (!value.length) continue;
      }
      const length = Math.min(remaining, this.chunk.length - this.position);
      if (sink) await sink(this.chunk.subarray(this.position, this.position + length));
      this.position += length;
      remaining -= length;
    }
  }
  async bytes(size) {
    const result = new Uint8Array(size);
    let offset = 0;
    await this.read(size, (chunk) => {
      result.set(chunk, offset);
      offset += chunk.length;
    });
    return result;
  }
  async finish() {
    while (!(await this.reader.read()).done) {
    }
    this.reader.releaseLock();
  }
};
function tarText(bytes) {
  return new TextDecoder().decode(bytes).replace(/\0.*$/s, "");
}
async function extractTarGzip(file, target) {
  if (typeof DecompressionStream !== "function") throw new Error("\u6B64\u6D4F\u89C8\u5668\u4E0D\u652F\u6301 gzip \u6D41\u89E3\u538B\uFF0C\u8BF7\u4F7F\u7528\u539F\u751F CLI");
  const reader = new StreamReader(file.stream().pipeThrough(new DecompressionStream("gzip")));
  const writable = await target.createWritable();
  let found = false;
  let completed = false;
  try {
    while (true) {
      const header = await reader.bytes(512);
      if (header.every((byte) => byte === 0)) {
        const second = await reader.bytes(512);
        if (!second.every((byte) => byte === 0)) throw new Error("Invalid tar end marker");
        await reader.finish();
        break;
      }
      const checksumText = tarText(header.subarray(148, 156)).trim();
      const checksum = Number.parseInt(checksumText, 8);
      const actual = header.reduce((sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte), 0);
      if (!Number.isFinite(checksum) || checksum !== actual) throw new Error("Invalid tar header checksum");
      const sizeText = tarText(header.subarray(124, 136)).trim();
      if (!/^[0-7]+$/.test(sizeText)) throw new Error("Unsupported tar entry size");
      const size = Number.parseInt(sizeText, 8);
      if (!Number.isSafeInteger(size)) throw new Error("Tar entry is too large");
      const name = tarText(header.subarray(0, 100));
      const kind = header[156];
      const isSqlite = (kind === 0 || kind === 48) && /\.(sqlite|db)$/i.test(name);
      if (isSqlite && found) throw new Error("Archive contains multiple SQLite files");
      if (isSqlite) found = true;
      await reader.read(size, isSqlite ? (chunk) => writable.write(chunk) : void 0);
      await reader.read((512 - size % 512) % 512);
    }
    if (!found) throw new Error("Archive does not contain a SQLite file");
    await writable.close();
    completed = true;
  } finally {
    if (!completed) await writable.abort();
  }
}
async function* zstdFrames(file) {
  let position = 0;
  let cached = new Uint8Array();
  let cachedAt = -1;
  const maxWindow = 64 * 1024 * 1024;
  async function bytes(at, length) {
    if (at + length > file.size) throw new Error("Truncated zstd archive");
    if (at < cachedAt || at + length > cachedAt + cached.length) {
      cachedAt = at;
      cached = new Uint8Array(await file.slice(at, at + Math.max(65536, length)).arrayBuffer());
    }
    return cached.subarray(at - cachedAt, at - cachedAt + length);
  }
  const integer = (data) => {
    let value = 0n;
    for (let i = data.length - 1; i >= 0; i--) value = value << 8n | BigInt(data[i]);
    return value;
  };
  while (position < file.size) {
    const start = position;
    const magic = Number(integer(await bytes(position, 4)));
    if (magic >= 407710288 && magic <= 407710303) {
      const size = Number(integer(await bytes(position + 4, 4)));
      position += 8 + size;
      if (position > file.size) throw new Error("Truncated zstd skippable frame");
      continue;
    }
    if (magic !== 4247762216) throw new Error("Invalid zstd frame");
    const flags = (await bytes(position + 4, 1))[0];
    if (flags & 8) throw new Error("Invalid zstd frame header");
    const single = Boolean(flags & 32), checksum = Boolean(flags & 4), contentFlag = flags >> 6;
    const dictionaryBytes = [0, 1, 2, 4][flags & 3];
    position += 5;
    let window2;
    if (!single) {
      const descriptor = (await bytes(position++, 1))[0];
      const base2 = 2 ** (10 + (descriptor >> 3));
      window2 = base2 + base2 / 8 * (descriptor & 7);
    }
    const dictionary = integer(await bytes(position, dictionaryBytes));
    if (dictionary !== 0n) throw new Error("Zstandard dictionaries are unsupported; use the native CLI");
    position += dictionaryBytes;
    const contentBytes = contentFlag ? 1 << contentFlag : single ? 1 : 0;
    let contentSize = integer(await bytes(position, contentBytes));
    if (contentFlag === 1) contentSize += 256n;
    position += contentBytes;
    if (single) window2 = Number(contentSize);
    if (window2 > maxWindow) throw new Error("Zstandard window exceeds 64 MiB browser limit; use the native CLI");
    let last = false;
    while (!last) {
      const block = Number(integer(await bytes(position, 3)));
      position += 3;
      last = Boolean(block & 1);
      const kind = block >> 1 & 3, size = block >> 3;
      if (kind === 3 || size > 131072) throw new Error("Invalid zstd block");
      position += kind === 1 ? 1 : size;
      if (position > file.size) throw new Error("Truncated zstd block");
    }
    let expected;
    if (checksum) {
      expected = Number(integer(await bytes(position, 4)));
      position += 4;
    }
    yield { start, end: position, expected };
  }
}
async function extractZstd(file, target) {
  const writable = await target.createWritable();
  let completed = false;
  try {
    const { create64 } = await e3();
    let frames = 0;
    for await (const frame of zstdFrames(file)) {
      frames++;
      let chunks = [];
      const hash = create64();
      const decoder = new Decompress((chunk) => {
        if (chunk.length) {
          hash.update(chunk);
          chunks.push(chunk);
        }
      });
      for (let offset = frame.start; offset < frame.end; offset += 65536) {
        const input = new Uint8Array(await file.slice(offset, Math.min(offset + 65536, frame.end)).arrayBuffer());
        for (let i = 0; i < input.length; i += 512) {
          decoder.push(input.subarray(i, i + 512), false);
          for (const chunk of chunks) await writable.write(chunk);
          chunks = [];
        }
      }
      decoder.push(new Uint8Array(), true);
      for (const chunk of chunks) await writable.write(chunk);
      if (frame.expected !== void 0 && Number(hash.digest() & 0xffffffffn) !== frame.expected)
        throw new Error("Zstandard checksum mismatch");
    }
    if (!frames) throw new Error("Zstandard archive has no data frames");
    await writable.close();
    completed = true;
  } finally {
    if (!completed) await writable.abort();
  }
}
function installFileVfs(sqlite, name, input, writableHandle) {
  const { capi, wasm: wasm3 } = sqlite;
  const reader = input ? new FileReaderSync() : void 0;
  const io = new capi.sqlite3_io_methods();
  io.$iVersion = 1;
  const vfs = new capi.sqlite3_vfs();
  vfs.$iVersion = 2;
  vfs.$szOsFile = capi.sqlite3_file.structInfo.sizeof;
  vfs.$mxPathname = 1024;
  vfs.addOnDispose(vfs.$zName = wasm3.allocCString(name));
  sqlite.vfs.installVfs({ io: { struct: io, methods: {
    xClose: () => 0,
    xRead: (pFile, pDest, n3, offset) => {
      try {
        const dest = wasm3.heap8u().subarray(Number(pDest), Number(pDest) + n3);
        dest.fill(0);
        let count;
        if (input) {
          const bytes = new Uint8Array(reader.readAsArrayBuffer(input.slice(Number(offset), Number(offset) + n3)));
          dest.set(bytes);
          count = bytes.length;
        } else count = writableHandle.read(dest, { at: Number(offset) });
        return count < n3 ? capi.SQLITE_IOERR_SHORT_READ : 0;
      } catch {
        return capi.SQLITE_IOERR_READ;
      }
    },
    xWrite: (pFile, pData, n3, offset) => {
      if (!writableHandle) return capi.SQLITE_READONLY;
      try {
        const data = wasm3.heap8u().subarray(Number(pData), Number(pData) + n3);
        return writableHandle.write(data, { at: Number(offset) }) === n3 ? 0 : capi.SQLITE_IOERR_WRITE;
      } catch {
        return capi.SQLITE_IOERR_WRITE;
      }
    },
    xTruncate: (pFile, size) => {
      if (!writableHandle) return capi.SQLITE_READONLY;
      try {
        writableHandle.truncate(Number(size));
        return 0;
      } catch {
        return capi.SQLITE_IOERR_TRUNCATE;
      }
    },
    xSync: () => {
      try {
        if (writableHandle) writableHandle.flush();
        return 0;
      } catch {
        return capi.SQLITE_IOERR_FSYNC;
      }
    },
    xFileSize: (pFile, out) => {
      try {
        wasm3.poke(out, BigInt(input ? input.size : writableHandle.getSize()), "i64");
        return 0;
      } catch {
        return capi.SQLITE_IOERR_FSTAT;
      }
    },
    xLock: () => 0,
    xUnlock: () => 0,
    xCheckReservedLock: (pFile, out) => {
      wasm3.poke32(out, 0);
      return 0;
    },
    xFileControl: () => capi.SQLITE_NOTFOUND,
    xSectorSize: () => 4096,
    xDeviceCharacteristics: () => input ? capi.SQLITE_IOCAP_IMMUTABLE : 0
  } }, vfs: { struct: vfs, methods: {
    xOpen: (pVfs, zName, pFile, flags, pOut) => {
      if (wasm3.cstrToJs(zName) !== "catalog.sqlite") return capi.SQLITE_CANTOPEN;
      const f2 = new capi.sqlite3_file(pFile);
      f2.$pMethods = io.pointer;
      f2.dispose();
      wasm3.poke32(pOut, input ? capi.SQLITE_OPEN_READONLY : capi.SQLITE_OPEN_READWRITE);
      return 0;
    },
    xAccess: (pVfs, zName, flags, out) => {
      wasm3.poke32(out, wasm3.cstrToJs(zName) === "catalog.sqlite" ? 1 : 0);
      return 0;
    },
    xDelete: () => capi.SQLITE_READONLY,
    xFullPathname: (pVfs, zName, nOut, pOut) => wasm3.cstrncpy(pOut, zName, nOut) < nOut ? 0 : capi.SQLITE_CANTOPEN,
    xRandomness: (pVfs, n3, pOut) => {
      const a = new Uint8Array(n3);
      crypto.getRandomValues(a);
      wasm3.heap8u().set(a, Number(pOut));
      return n3;
    },
    xSleep: () => 0,
    xCurrentTime: (pVfs, out) => {
      wasm3.poke(out, 24405875e-1 + Date.now() / 864e5, "double");
      return 0;
    },
    xCurrentTimeInt64: (pVfs, out) => {
      wasm3.poke(out, BigInt(21086676e7 + Date.now()), "i64");
      return 0;
    },
    xGetLastError: () => 0
  } } });
  return () => {
    capi.sqlite3_vfs_unregister(vfs.pointer);
    vfs.dispose();
    io.dispose();
  };
}
function each(db, sql, callback) {
  const statement = db.prepare(sql);
  try {
    while (statement.step()) callback(statement.get({}));
  } finally {
    statement.finalize();
  }
}
function createStage(db, table) {
  db.exec(`CREATE TABLE stage_${table}(key TEXT NOT NULL, json TEXT NOT NULL);`);
  const stmt = db.prepare(`INSERT INTO stage_${table} VALUES (?,?)`);
  return {
    insert(key, row) {
      if (key == null) throw new Error(`Missing relationship key in ${table}`);
      stmt.bind([String(key), JSON.stringify(row)]).stepReset();
    },
    done() {
      stmt.finalize();
      db.exec(`CREATE INDEX stage_${table}_key ON stage_${table}(key);`);
    }
  };
}
function stageSource(source, output, table, column) {
  const stage = createStage(output, table);
  let count = 0;
  try {
    each(source, `SELECT * FROM "${table}"`, (row) => {
      stage.insert(row[column], row);
      if (++count % 1e4 === 0) output.exec("COMMIT; BEGIN");
    });
  } finally {
    stage.done();
  }
}
function stageRows(output, table, key) {
  return output.selectObjects(`SELECT json FROM stage_${table} WHERE key=?`, [String(key)]).map((row) => JSON.parse(row.json));
}
async function stageBangumi(file, output) {
  const zip = new ZipReader(new BlobReader(file), { useWebWorkers: false });
  try {
    const entries = await zip.getEntries();
    const specs = [
      ["subject.jsonlines", "subjects", (row) => row.id],
      ["person.jsonlines", "persons", (row) => row.id],
      ["subject-persons.jsonlines", "subject_persons", (row) => row.subject_id ?? row.subjectId],
      ["subject-relations.jsonlines", "relations", (row) => row.subject_id ?? row.subjectId]
    ];
    for (const [filename, table, key] of specs) {
      let line2 = function(text) {
        if (!text.trim()) return;
        const row = JSON.parse(text);
        stage.insert(key(row), row);
        if (++count % 1e4 === 0) output.exec("COMMIT; BEGIN");
      };
      var line = line2;
      const found = entries.filter((entry) => entry.filename.split("/").at(-1) === filename);
      if (found.length !== 1) throw new Error(`Bangumi archive must contain exactly one ${filename}`);
      const stage = createStage(output, table);
      const decoder = new TextDecoder("utf-8", { fatal: true });
      let pending = "", count = 0;
      output.exec("BEGIN");
      try {
        const stream = new WritableStream({
          write(chunk) {
            pending += decoder.decode(chunk, { stream: true });
            let pos;
            while ((pos = pending.indexOf("\n")) !== -1) {
              line2(pending.slice(0, pos));
              pending = pending.slice(pos + 1);
            }
            if (pending.length > 16 * 1024 * 1024) throw new Error("JSONL line exceeds 16 MiB");
          },
          close() {
            pending += decoder.decode();
            line2(pending);
          }
        });
        await found[0].getData(stream, { useWebWorkers: false, checkSignature: true });
        output.exec("COMMIT");
      } finally {
        stage.done();
      }
    }
  } finally {
    await zip.close();
  }
}
async function run({ file, directory, sourceName, outputName, provider, sourceVersion }) {
  directory = await receiveDirectory(directory);
  if (!["bangumi", "ehentai", "mangabaka", "bookwalker"].includes(provider)) throw new Error("\u4E0D\u652F\u6301\u7684\u6765\u6E90");
  if (!(file instanceof File)) throw new Error("\u8BF7\u9009\u62E9\u672C\u5730\u6765\u6E90\u6587\u4EF6");
  const sqlite = await (sqlitePromise ??= sqlite3InitModule(wasmBinary ? { wasmBinary, locateFile: () => "" } : {}));
  const outHandle = await directory.getFileHandle(outputName, { create: true });
  const sourceHandle = await directory.getFileHandle(sourceName, { create: true });
  let sourceFile = file;
  self.postMessage({ type: "progress", phase: "\u89E3\u538B\u539F\u59CB\u6570\u636E" });
  if (provider === "bangumi" && !/\.zip$/i.test(file.name)) throw new Error("Bangumi \u8F93\u5165\u5FC5\u987B\u662F ZIP");
  if (provider === "mangabaka" && /\.tar\.gz$/i.test(file.name)) {
    await extractTarGzip(file, sourceHandle);
    sourceFile = await sourceHandle.getFile();
  } else if (["ehentai", "bookwalker"].includes(provider) && /\.(zst|zstd)$/i.test(file.name)) {
    await extractZstd(file, sourceHandle);
    sourceFile = await sourceHandle.getFile();
  } else if (provider !== "bangumi" && !/\.(sqlite|db)$/i.test(file.name)) {
    throw new Error("\u4E0D\u652F\u6301\u7684\u6765\u6E90\u6863\u6848\u683C\u5F0F\uFF1B\u8BF7\u4F7F\u7528\u539F\u751F CLI");
  }
  if (typeof outHandle.createSyncAccessHandle !== "function") throw new Error("\u6D4F\u89C8\u5668\u4E0D\u652F\u6301 OPFS \u540C\u6B65\u8BBF\u95EE\u53E5\u67C4\uFF1B\u8BF7\u4F7F\u7528\u539F\u751F CLI");
  const access = await outHandle.createSyncAccessHandle();
  access.truncate(0);
  let disposeInput, disposeOutput, source, output;
  try {
    disposeOutput = installFileVfs(sqlite, "build-output", void 0, access);
    if (provider !== "bangumi") {
      disposeInput = installFileVfs(sqlite, "build-source", sourceFile);
      source = new sqlite.oo1.DB({ filename: "catalog.sqlite", flags: "r", vfs: "build-source" });
    }
    output = new sqlite.oo1.DB({ filename: "catalog.sqlite", flags: "c", vfs: "build-output" });
    output.exec("PRAGMA journal_mode=MEMORY; PRAGMA temp_store=MEMORY; PRAGMA cache_size=-4096;");
    output.exec(SCHEMA.replace("PRAGMA journal_mode=DELETE;", ""));
    output.exec({ sql: "INSERT INTO manifest VALUES (?,?,?,?,?)", bind: [SCHEMA_VERSION, ANALYZER_VERSION, provider, sourceVersion || file.name, (/* @__PURE__ */ new Date()).toISOString()] });
    let staging = [];
    self.postMessage({ type: "progress", phase: "\u6574\u7406\u6807\u7B7E\u548C\u5173\u8054\u6570\u636E" });
    if (provider === "bangumi") {
      await stageBangumi(file, output);
      staging = ["subjects", "persons", "subject_persons", "relations"];
    } else {
      let specs;
      if (provider === "ehentai") specs = [["gid_tid", "gid"], ["tag", "id"]];
      if (provider === "bookwalker") specs = [
        ["series_tags", "series_id"],
        ["tags", "id"],
        ["products", "series_id"],
        ["images", "id"],
        ["product_external_ids", "product_id"],
        ["product_contributors", "product_id"],
        ["contributors", "id"]
      ];
      if (provider === "mangabaka") {
        const tables = source.selectObjects("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('tags','series_tags')").map((r2) => r2.name);
        if (tables.length === 1) throw new Error("MangaBaka tag relationship tables are incomplete");
        specs = tables.length === 2 ? [["series_tags", "series_id"], ["tags", "id"]] : [];
      }
      for (const [table, column] of specs) {
        output.exec("BEGIN");
        stageSource(source, output, table, column);
        output.exec("COMMIT");
        staging.push(table);
      }
    }
    const insert = output.prepare("INSERT INTO entries(provider,source_id,title,url,record) VALUES (?,?,?,?,?)");
    const insertBook = output.prepare("INSERT INTO book_entries(provider,source_id,record) VALUES (?,?,?)");
    const index = output.prepare("INSERT INTO title_fts(rowid,tokens) VALUES (?,?)");
    let count = 0;
    const total = provider === "bangumi" ? output.selectValue("SELECT count(*) FROM stage_subjects WHERE json_extract(json, '$.type') = 1 OR json_type(json, '$.type') IS NULL") : source.selectValue(`SELECT count(*) FROM ${provider === "ehentai" ? "gallery" : "series"}`);
    self.postMessage({ type: "progress", phase: "\u5EFA\u7ACB\u68C0\u7D22\u7D22\u5F15", count, total });
    try {
      output.exec("BEGIN");
      const add = (record) => {
        if (!record.id || record.id === "undefined" || record.id === "null") throw new Error("Source entry has no id");
        if (!record.titles.length) {
          record.titles.push({ text: record.id, type: "alias" });
          record.warnings = ["Source has no title; displayed ID instead"];
        }
        const title2 = record.titles.find((t4) => t4.type === "native")?.text ?? record.titles[0].text;
        insert.bind([record.provider, record.id, title2, record.url, JSON.stringify(record)]).stepReset();
        const rowId = sqlite.capi.sqlite3_last_insert_rowid(output.pointer);
        index.bind([rowId, indexText(record.titles.map((t4) => t4.text))]).stepReset();
        if (record.provider === "bookwalker") for (const book of record.books ?? [])
          insertBook.bind([book.provider, book.id, JSON.stringify(book)]).stepReset();
        if (++count % 1e3 === 0) {
          output.exec("COMMIT; BEGIN");
          self.postMessage({ type: "progress", phase: "\u5EFA\u7ACB\u68C0\u7D22\u7D22\u5F15", count, total });
        }
      };
      if (provider === "bangumi") {
        const make = (subject, withBooks) => {
          const persons = stageRows(output, "subject_persons", subject.id).map((relation) => ({
            relation,
            person: stageRows(output, "persons", relation.person_id ?? relation.personId)[0] ?? null
          }));
          const relations = stageRows(output, "relations", subject.id);
          const books = [];
          if (withBooks) for (const relation of relations) {
            if (String(relation.relation_type ?? relation.relationType) !== "1003") continue;
            const related = stageRows(output, "subjects", relation.related_subject_id ?? relation.relatedSubjectId)[0];
            if (related) books.push(make(related, false));
          }
          return bangumi(subject, persons, relations, books);
        };
        each(output, "SELECT json FROM stage_subjects WHERE json_extract(json, '$.type') = 1 OR json_type(json, '$.type') IS NULL", (row) => add(make(JSON.parse(row.json), true)));
      } else if (provider === "ehentai") {
        each(source, "SELECT * FROM gallery", (row) => {
          const tags = stageRows(output, "gid_tid", row.gid).flatMap((rel) => stageRows(output, "tag", rel.tid));
          add(ehentai(row, tags));
        });
      } else if (provider === "mangabaka") {
        each(source, "SELECT * FROM series", (row) => {
          const tags = staging.includes("tags") ? stageRows(output, "series_tags", row.id).flatMap((rel) => stageRows(output, "tags", rel.tag_id).map((tag) => ({ ...rel, name: tag.name, name_path: tag.name_path, is_genre: tag.is_genre }))) : [];
          add(mangabaka(row, tags));
        });
      } else {
        each(source, "SELECT * FROM series", (row) => {
          const tags = stageRows(output, "series_tags", row.id).flatMap((rel) => stageRows(output, "tags", rel.tag_id));
          const image = stageRows(output, "images", row.image_id)[0] ?? null;
          const books = stageRows(output, "products", row.id).map((product) => {
            const contributors = stageRows(output, "product_contributors", product.id).map((rel) => {
              const person = stageRows(output, "contributors", rel.contributor_id)[0];
              return { ...rel, name: person?.name ?? null, name_alt: person?.name_alt ?? null };
            });
            return bookwalkerBook(
              product,
              contributors,
              stageRows(output, "product_external_ids", product.id),
              stageRows(output, "images", product.image_id)[0] ?? null
            );
          });
          add(bookwalker(row, tags, image, books));
        });
      }
      output.exec("COMMIT");
      if (!count) throw new Error("Source contained no records");
      self.postMessage({ type: "progress", phase: "\u6821\u9A8C\u6570\u636E\u5E93", count, total });
      for (const table of staging) output.exec(`DROP TABLE stage_${table}`);
      output.exec("INSERT INTO title_fts(title_fts) VALUES('optimize'); INSERT INTO title_fts(title_fts) VALUES('integrity-check');");
      if (output.selectValue("PRAGMA integrity_check") !== "ok") throw new Error("Output integrity check failed");
      return { provider, count, sourceVersion: sourceVersion || file.name };
    } finally {
      insert.finalize();
      insertBook.finalize();
      index.finalize();
    }
  } finally {
    if (output) output.close();
    if (source) source.close();
    if (disposeOutput) disposeOutput();
    if (disposeInput) disposeInput();
    access.close();
  }
}
self.onmessage = async ({ data }) => {
  if (data?.type === "init") {
    try {
      wasmBinary = data.payload?.wasmBinary;
      sqlitePromise = sqlite3InitModule(wasmBinary ? { wasmBinary, locateFile: () => "" } : {});
      await sqlitePromise;
      self.postMessage({ type: "ready" });
    } catch (error) {
      self.postMessage({ type: "init-error", error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  try {
    self.postMessage({ result: await run(data.payload ?? data) });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
