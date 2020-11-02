const router = require('express').Router({ mergeParams: true });

const data = {
  devices: [],
  connections: []
};

const DEVICE_TYPES = {
  COMPUTER: 'COMPUTER',
  REPEATER: 'REPEATER'
};

let counter = 0;

class Device {

  constructor(data) {
    data = data || {};
    this.id = 0;
    this.type = data.type || '';
    this.name = data.name || '';
    this.strength = data.strength;
    this.targets = [];
  }

  isUnique() {
    return !data.devices.find((d) => d.name === this.name);
  }

  toObject() {
    return {
      name: this.name,
      strength: this.strength,
      type: this.type
    };
  }

  validate() {
    if (!(this.type in DEVICE_TYPES)) {
      return { ok: false, msg: 'invalid device type' };
    }
    if (this.type === DEVICE_TYPES.COMPUTER && this.strength < 0) {
      return { ok: false, msg: 'invalid strength' };
    }
    this.name = this.name.trim();
    const name = this.name;
    if (!name) {
      return { ok: false, msg: 'invalid name' };
    }
    if (!this.isUnique()) {
      return { ok: false, msg: 'not unique' }
    }
    return { ok: true };
  }

  save() {
    if (this.type === DEVICE_TYPES.COMPUTER && !this.strength) {
      this.strength = 5;
    }
    const result = this.validate();
    if (result.ok) {
      this.id = counter++;
      data.devices.push(this);
    }
    return result;
  }

  updateStrength(value) {
    if (typeof value !== 'number' || isNaN(value) || value < 0) {
      return { ok: false, msg: 'invalid strength' };
    }
    if (this.type === 'REPEATER') {
      return { ok: false, msg: 'strength update not allowed' }
    }
    this.strength = value;
    return { ok: true };
  }

  addTargets(targets) {
    for (let t of targets) {
      if (!this.targets.includes(t)) {
        this.targets.push(t);
      }
    }
  }
}


class Connection {

  constructor(data) {
    data = data || {};
    this.source = data.source;
    this.targets = data.targets;
  }

  validate() {
    if (!Array.isArray(this.targets) || this.targets.length === 0) {
      return { ok: false, msg: 'targets must be list of devices' };
    }
    const s = data.devices.find(d => d.name === this.source);
    if (!s) {
      return { ok: false, msg: 'invalid source device' };
    }
    let targets = [];
    for (let target of this.targets) {
      const t = data.devices.find(d => d.name === target).toObject();
      targets.push(t);
      if (!t) {
        return { ok: false, msg: `invalid target device ${t}` };
      }
    }
    s.addTargets(targets);
    for (let target of this.targets) {
      const t = data.devices.find(d => d.name === target);
      t.addTargets([s.toObject()]);
    }
    return { ok: true };
  }

  save() {
    const result = this.validate();
    if (result.ok) {
      data.connections.push(this);
    }
    return result;
  }
}



function generateGraph() {
  let graph = {};
  for (let d of data.devices) {
    graph[d.name] = {
      v: d.strength,
      targets: d.targets,
      visited: false,
      strength: d.strength
    };
  }
  return graph;
}

function dfsUtil(graph, from, to, strength, path) {
  graph[from].visited = true;
  path.push(from);
  if (path.slice(-1)[0] === to || strength === 0) {
    return path;
  }
  for (let node of graph[from].targets) {
    const { name } = node;
    let s = strength;
    if (!graph[name].visited) {
      if (node.type === DEVICE_TYPES.REPEATER) {
        s = s * 2;
      }
      s = s - 1;
      let p = dfsUtil(graph, name, to, s, [...path]);
      if (p.slice(-1)[0] === to) {
        return p;
      }
    }
  }
  return path;
}

function dfs(from, to) {
  const graph = generateGraph();
  const strength = graph[from].strength;
  return dfsUtil(graph, from, to, strength, []);
}

router.post('/devices', (req, res) => {
  const device = new Device(req.body);
  res.send(device.save());
});

router.patch('/devices/:name/strength', (req, res) => {
  const { value } = req.body || {};
  const { name } = req.params || {};
  const device = data.devices.find(d => d.name === name);
  if (!device) {
    return { ok: false, msg: 'invalid device' };
  }
  res.send(device.updateStrength(value));
});

router.get('/devices', (_req, res) => {
  res.send({ ok: true, data: data.devices.map(d => d.toObject()) });
});

router.post('/connections', (req, res) => {
  const connection = new Connection(req.body);
  res.send(connection.save());
});

router.get('/connections', (_req, res) => {
  res.send(data.connections);
});

router.get('/info-routes', (req, res) => {
  const { from, to } = req.query || {};
  const source = data.devices.find(d => d.name === from);
  const dest = data.devices.find(d => d.name === to);
  if (!source || !dest) {
    return res.send({ ok: false, msg: 'invalid source or from' });
  }
  if (from === to) {
    return res.send({ ok: true, data: [from] });
  }
  const path = dfs(from, to);
  if(path.slice(-1)[0] === to) {
    return res.send({ ok: true, data: path });
  }
  return res.send({ ok: false, msg: 'path not found' });
});


module.exports = router;
