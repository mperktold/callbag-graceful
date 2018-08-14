const test = require('tape');
const graceful = require('.');

test('it passes through data deliveries', t => {
  t.plan(32);
  const downwardsExpectedType = [
    [0, 'function'],
    [1, 'number'],
    [1, 'number'],
    [1, 'number'],
    [2, 'undefined']
  ];
  const upwardsExpectedType = [
    [0, 'function'],
    [1, 'undefined'],
    [1, 'number'],
    [1, 'number'],
    [1, 'number']
  ];
  const downwardsExpected = [0, 1, 2];
  const upwardsExpected = [undefined, 0, 1, 2];

  function makeSource() {
    let _sink;
    let sent = 0;
    const source = (type, data) => {
      const [et, edt] = upwardsExpectedType.shift();
      t.equals(type, et, `upwards type is expected: ${et}`);
      t.equals(typeof data, edt, `upwards data type is expected: ${edt}`);
      if (type === 0) {
        _sink = data;
        _sink(0, source);
        return;
      }
      if (type === 1) {
        t.true(upwardsExpected.length > 0, 'source can be pulled');
        const eu = upwardsExpected.shift();
        t.equals(data, eu, `upwards data is expected: ${eu}`);
        if (sent < 3) _sink(1, sent++);
        else          _sink(2);
      }
    };
    return source;
  }

  function makeSink() {
    let talkback;
    return (type, data) => {
      const [et, edt] = downwardsExpectedType.shift();
      t.equals(type, et, `downwards type is expected: ${et}`);
      t.equals(typeof data, edt, `downwards data type is expected: ${edt}`);
      if (type === 0) {
        talkback = data;
        return talkback(1);
      }
      if (type === 1) {
        const e = downwardsExpected.shift();
        t.equals(data, e, `downwards data is expected: ${e}`);
        return talkback(1, e);
      }
    };
  }

  const source = makeSource();
  const output = graceful(source);
  const sink = makeSink();
  output(0, sink);

  setTimeout(() => {
    t.pass('nothing else happens');
    t.end();
  }, 300);
});

test('it returns a source that disposes upon upwards END', t => {
  t.plan(16);
  const upwardsExpectedType = [
    [0, 'function'],
    [2, 'undefined']
  ];
  const downwardsExpectedType = [
    [0, 'function'],
    [1, 'number'],
    [1, 'number'],
    [1, 'number'],
  ];
  const downwardsExpected = [1, 2, 3];

  function makeSource() {
    let sent = 0;
    let id;
    const source = (type, data) => {
      const [et, edt] = upwardsExpectedType.shift();
      t.equals(type, et, `upwards type is expected: ${et}`);
      t.equals(typeof data, edt, `upwards data type is expected: ${edt}`);
      if (type === 0) {
        const sink = data;
        id = setInterval(() => {
          sink(1, ++sent);
        }, 100);
        sink(0, source);
      } else if (type === 2) {
        clearInterval(id);
      }
    };
    return source;
  }

  function makeSink(type, data) {
    let talkback;
    return (type, data) => {
      const [et, edt] = downwardsExpectedType.shift();
      t.equals(type, et, `downwards type is expected: ${et}`);
      t.equals(typeof data, edt, `downwards data type is expected: ${edt}`);
      if (type === 0) {
        talkback = data;
      }
      if (type === 1) {
        const e = downwardsExpected.shift();
        t.equals(data, e, `downwards data is expected: ${e}`);
      }
      if (downwardsExpected.length === 0) {
        talkback(2);
      }
    };
  }

  const source = makeSource();
  const output = graceful(source);
  const sink = makeSink();
  output(0, sink);

  setTimeout(() => {
    t.pass('nothing else happens');
    t.end();
  }, 700);
});

test('it returns a source that disposes upon error thrown during handshake', t => {
  t.plan(10);
  const upwardsExpectedType = [
    [0, 'function'],
    [2, 'undefined']
  ];
  const downwardsExpectedType = [
    [0, 'function'],
    [2, 'object']
  ];
  const expectedError = new Error('test');

  function makeSource() {
    const source = (type, data) => {
      const [et, edt] = upwardsExpectedType.shift();
      t.equals(type, et, `upwards type is expected: ${et}`);
      t.equals(typeof data, edt, `upwards data type is expected: ${edt}`);
      if (type === 0) {
        data(0, source);
      }
    };
    return source;
  }

  function makeSink(type, data) {
    return (type, data) => {
      const [et, edt] = downwardsExpectedType.shift();
      t.equals(type, et, `downwards type is expected: ${et}`);
      t.equals(typeof data, edt, `downwards data type is expected: ${edt}`);
      if (type === 0) {
        throw expectedError;
      }
      if (type === 2) {
        t.equals(data, expectedError, `error is expected: ${expectedError}`)
      }
    };
  }

  const source = makeSource();
  const output = graceful(source);
  const sink = makeSink();
  output(0, sink);

  setTimeout(() => {
    t.pass('nothing else happens');
    t.end();
  }, 700);
});

test('it returns a source that disposes upon error thrown during data delivery', t => {
  t.plan(16);
  const upwardsExpectedType = [
    [0, 'function'],
    [2, 'undefined']
  ];
  const downwardsExpectedType = [
    [0, 'function'],
    [1, 'number'],
    [1, 'number'],
    [2, 'object']
  ];
  const downwardsExpected = [0, 1];
  const expectedError = new Error('test');

  function makeSource() {
    const source = (type, data) => {
      const [et, edt] = upwardsExpectedType.shift();
      t.equals(type, et, `upwards type is expected: ${et}`);
      t.equals(typeof data, edt, `upwards data type is expected: ${edt}`);
      if (type === 0) {
        data(0, source);
        data(1, 0);
        data(1, 1);
        return;
      }
    };
    return source;
  }

  function makeSink(type, data) {
    return (type, data) => {
      const [et, edt] = downwardsExpectedType.shift();
      t.equals(type, et, `downwards type is expected: ${et}`);
      t.equals(typeof data, edt, `downwards data type is expected: ${edt}`);
      if (type === 1) {
        const e = downwardsExpected.shift();
        t.equals(data, e, `downwards data is expected: ${e}`);
        if (downwardsExpected.length === 0) {
          throw expectedError;
        }
      }
      if (type === 2) {
        t.equals(data, expectedError, `error is expected: ${expectedError}`)
      }
    };
  }

  const source = makeSource();
  const output = graceful(source);
  const sink = makeSink();
  output(0, sink);

  setTimeout(() => {
    t.pass('nothing else happens');
    t.end();
  }, 700);
});

test('it does not catch errors thrown while terminating sink', t => {
  t.plan(8);
  const upwardsExpectedType = [
    [0, 'function']
  ];
  const downwardsExpectedType = [
    [0, 'function'],
    [2, 'undefined']
  ];
  const expectedError = new Error('test');

  function makeSource() {
    const source = (type, data) => {
      const [et, edt] = upwardsExpectedType.shift();
      t.equals(type, et, `upwards type is expected: ${et}`);
      t.equals(typeof data, edt, `upwards data type is expected: ${edt}`);
      if (type === 0) {
        data(0, source);
        t.throws(() => data(2), 'test');
        return;
      }
    };
    return source;
  }

  function makeSink(type, data) {
    return (type, data) => {
      const [et, edt] = downwardsExpectedType.shift();
      t.equals(type, et, `downwards type is expected: ${et}`);
      t.equals(typeof data, edt, `downwards data type is expected: ${edt}`);
      if (type === 2) {
        throw expectedError;
      }
    };
  }

  const source = makeSource();
  const output = graceful(source);
  const sink = makeSink();
  output(0, sink);

  setTimeout(() => {
    t.pass('nothing else happens');
    t.end();
  }, 700);
});
