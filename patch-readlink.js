const fs = require('fs');

// Patch fs.readlinkSync
const originalReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function (path, options) {
  try {
    return originalReadlinkSync.call(fs, path, options);
  } catch (err) {
    if (err && err.code === 'EISDIR') {
      const newErr = new Error(`EINVAL: invalid argument, readlink '${path}'`);
      newErr.code = 'EINVAL';
      newErr.errno = -4071;
      newErr.syscall = 'readlink';
      newErr.path = path;
      throw newErr;
    }
    throw err;
  }
};

// Patch fs.readlink
const originalReadlink = fs.readlink;
fs.readlink = function (path, options, callback) {
  let cb = callback;
  let opts = options;
  if (typeof options === 'function') {
    cb = options;
    opts = undefined;
  }
  return originalReadlink.call(fs, path, opts, (err, linkString) => {
    if (err && err.code === 'EISDIR') {
      const newErr = new Error(`EINVAL: invalid argument, readlink '${path}'`);
      newErr.code = 'EINVAL';
      newErr.errno = -4071;
      newErr.syscall = 'readlink';
      newErr.path = path;
      return cb(newErr);
    }
    return cb(err, linkString);
  });
};

// Patch fs.promises.readlink
if (fs.promises && fs.promises.readlink) {
  const originalPromisesReadlink = fs.promises.readlink;
  fs.promises.readlink = function (path, options) {
    return originalPromisesReadlink.call(fs.promises, path, options)
      .catch(err => {
        if (err && err.code === 'EISDIR') {
          const newErr = new Error(`EINVAL: invalid argument, readlink '${path}'`);
          newErr.code = 'EINVAL';
          newErr.errno = -4071;
          newErr.syscall = 'readlink';
          newErr.path = path;
          throw newErr;
        }
        throw err;
      });
  };
}

// Patch fs/promises readlink if loaded
try {
  const fsPromises = require('fs/promises');
  if (fsPromises && fsPromises.readlink) {
    const originalPromisesReadlink2 = fsPromises.readlink;
    fsPromises.readlink = function (path, options) {
      return originalPromisesReadlink2.call(fsPromises, path, options)
        .catch(err => {
          if (err && err.code === 'EISDIR') {
            const newErr = new Error(`EINVAL: invalid argument, readlink '${path}'`);
            newErr.code = 'EINVAL';
            newErr.errno = -4071;
            newErr.syscall = 'readlink';
            newErr.path = path;
            throw newErr;
          }
          throw err;
        });
    };
  }
} catch (e) {
  // ignore
}

// console.log('readlink patch loaded');
