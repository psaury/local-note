function Debounce(sec, f) {
  var tid;
  return (...args) => {
    clearTimeout(tid);
    tid = setTimeout(() => {
      f(...args);
    }, sec * 1000);
  };
}

function Throttle(sec, f) {
  var a;
  var remain = false;
  var throttled = false;
  return (...args) => {
    if (throttled) {
      a = args;
      remain = true;
    } else {
      f(...args);
      remain = false;
      throttled = true;
      setTimeout(() => {
        throttled = false;
        if (remain) {
          f(...a);
        }
      }, sec * 1000);
    }
  };
}

function Moderated(f) {
  var waiting = false;
  var remain = null;
  return (...args) => {
    if (waiting) {
      remain = args;
      return;
    }
    waiting = true;
    setTimeout(async () => {
      try {
        await f(...args);
      } finally {
        waiting = false;
        if (remain !== null) {
          var a = remain;
          remain = null;
          f(...a);
        }
      }
    });
  };
}
