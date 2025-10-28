let isVerbose = false;

function setVerbose(verbose) {
  isVerbose = verbose;
}

function info(message) {
  console.log(message);
}

function success(message) {
  console.log(message);
}

function error(message) {
  console.error(message);
}

function warn(message) {
  console.warn(message);
}

function debug(message) {
  if (isVerbose) {
    console.log(message);
  }
}

function verbose(message) {
  if (isVerbose) {
    console.log(message);
  }
}

module.exports = {
  setVerbose,
  info,
  success,
  error,
  warn,
  debug,
  verbose
};

