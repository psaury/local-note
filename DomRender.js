function DomRender(_params = null) {
  var _params = _params;
  var _ns = _params?.ns;
  var _root = document.createElement('div');
  var _currentDom = _root;
  var _currentDesc = null;
  var _currentFn = null;
  var _currentOptions = null;
  var _currentFrame = null;
  var _replaceFrameSet = new Set();
  var _replaceTimerId = 0;

  const inContext = function (dom, desc, fn, options) {
    var preDom = _currentDom;
    var preDesc = _currentDesc;
    var preFn = _currentFn;
    var preOptions = _currentOptions;
    var preFrame = _currentFrame;
    _currentDom = dom;
    _currentDesc = desc;
    _currentFn = fn;
    _currentOptions = options;
    fn(dom);
    _currentDom = preDom;
    _currentDesc = preDesc;
    _currentFn = preFn;
    _currentOptions = preOptions;
    _currentFrame = preFrame;
  };

  // usage: r('div.someClass', () => { ... });
  const r = function (desc, fn = null, options = null) {
    var tag = desc;
    if (desc.includes('.')) {
      var [tag, ...classes] = tag.split('.');
      tag = tag || 'div';
    }
    var ns = _ns || options?.ns;
    var dom = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
    _currentDom.appendChild(dom);
    if (classes) {
      for (var c of classes) {
        dom.classList.add(c);
      }
    }
    if (fn) {
      inContext(dom, desc, fn, options);
    }
    return dom;
  };

  // usage: r.t('t1', 't2');
  r.t = function (...texts) {
    var node = document.createTextNode('');
    node.textContent = texts.join('');
    _currentDom.appendChild(node);
    return node;
  };

  // usage: ?
  r.svg = function (desc, fn = null) {
    return r(desc, fn, { ns: 'http://www.w3.org/2000/svg' });
  };

  // usage: r.attr('href', '');
  // usage: r.attr({ href: '', ... });
  r.attr = function (attrs, ...rests) {
    if (typeof attrs === 'string') {
      _currentDom.setAttribute(attrs, rests[0]);
      return;
    }
    for (var name of Object.keys(attrs)) {
      _currentDom.setAttribute(name, attrs[name]);
    }
  };
  
  // usage: r.style('background-color: #fff');
  // usage: r.style('background-color', '#fff');
  // usage: r.style({ 'background-color': '#fff', ... });
  r.style = function (styles, ...rests) {
    if (typeof styles === 'string') {
      if (rests.length === 0) {
        var [name, value] = styles.split(':', 2);
        _currentDom.style[name] = value;
      } else {
        _currentDom.style[styles] = rests[0];
      }
      return;
    }
    for (var name of Object.keys(styles)) {
      _currentDom.style[name] = styles[name];
    }
  };
  // usage: r.event('click', (ev) => ... );
  // usage: r.event({ click: (ev) => ..., ... });
  r.event = function (listeners, ...rests) {
    if (typeof listeners === 'string') {
      _currentDom.addEventListener(listeners, rests[0]);
      return;
    }
    for (var name of Object.keys(listeners)) {
      _currentDom.addEventListener(name, listeners[name]);
    }
  };

  // usage: r.class('c1 c2 ...');
  // usage: r.class(['c1', 'c2', ...]);
  r.class = function (classes) {
    if (typeof classes === 'string') {
      classes = classes.split(' ');
    }
    for (var c of classes) {
      _currentDom.classList.add(c);
    }
  };

  // usage: r.mountTo(document.body);
  r.mountTo = function (dom) {
    for (var n of Array.from(_root.childNodes)) {
      dom.appendChild(n);
    }
  };

  r.dom = function () {
    return _currentDom;
  };

  // usage: r.createState(someInitialValue, v => Math.floor(v));
  r.createState = function (init, compute = null) {
    return new r.State(init, compute);
  };

  r.Frame = function (dom, desc, fn, options) {
    this.dom = dom;
    this.desc = desc;
    this.fn = fn;
    this.options = options;
    this.watchSet = new Set();
    this.childSet = new Set();
  };

  r.Frame.prototype.clear = function () {
    for (var child of this.childSet) {
      child.clear();
    }
    for (var state of this.watchSet) {
      state.frameCleared(this);
    }
    this.childSet.clear();
    this.watchSet.clear();
  };

  r.Frame.prototype.replace = function () {
    var { dom, desc, fn, options } = this;
    this.clear();
    inContext(_root, 'dummyDesc', () => {
      _currentFrame = this;
      dom.replaceWith(r(desc, () => {
        this.dom = _currentDom;
        fn();
      }, options));
    });
  };

  r.State = function (init, compute = null) {
    this._value = compute ? compute(init) : init;
    this._frameSet = new Set();
    this._fnSet = new Set();
    this._computeSet = new Set(compute ? [compute] : []);
  };

  r.State.prototype.watch = function (fn = null) {
    if (fn) {
      this._fnSet.add(fn);
      return this._value;
    }
    if (_currentFrame?.dom !== _currentDom) {
      var parentFrame = _currentFrame;
      _currentFrame = new r.Frame(_currentDom, _currentDesc, _currentFn, _currentOptions);
      parentFrame.childSet.add(_currentFrame);
    }
    _currentFrame.watchSet.add(this);
    this._frameSet.add(_currentFrame);
    return this._value;
  };

  r.State.prototype.get = function () {
    return this._value;
  };

  // todo: promisize
  r.State.prototype.set = function (v) {
    for (var compute of this._computeSet) {
      v = compute(v);
    }
    this._value = v;
    for (var frame of this._frameSet) {
      _replaceFrameSet.add(frame);
    }
    clearTimeout(_replaceTimerId);
    _replaceTimerId = setTimeout(() => {
      for (var fn of this._fnSet) {
        fn(this._value);
      }
      for (var frame of _replaceFrameSet) {
        frame.replace();
      }
      _replaceFrameSet.clear();
    });
    return v;
  };

  r.State.prototype.addCompute = function (fn) {
    this._computeSet.add(fn);
    return this;
  };

  r.State.prototype.frameCleared = function (frame) {
    this._frameSet.delete(frame);
  };

  _currentFrame = new r.Frame(null, null, null, null);

  return r;
}
