class CityGraph {
  constructor() {
    this.nodes = {};
    this.edges = {};
    this.roads = {};
    this.originalEdges = {};
  }

  buildFromWorldState(worldState) {
    this.nodes = {};
    this.edges = {};
    this.roads = {};

    if (worldState.shelters) {
      worldState.shelters.forEach((shelter, i) => {
        const nodeId = `shelter_${i}`;
        this.addNode(nodeId, {
          id: nodeId,
          name: shelter.name,
          lat: shelter.lat,
          lng: shelter.lng,
          zone: shelter.zone,
          type: 'shelter',
          floodRisk: this._getZoneRisk(shelter.zone, worldState),
          affected: false,
          flooded: false
        });
      });
    }

    if (worldState.hospitals) {
      worldState.hospitals.forEach((hospital, i) => {
        const nodeId = `hospital_${i}`;
        this.addNode(nodeId, {
          id: nodeId,
          name: hospital.name,
          lat: hospital.lat,
          lng: hospital.lng,
          zone: hospital.zone,
          type: 'hospital',
          floodRisk: this._getZoneRisk(hospital.zone, worldState),
          affected: false,
          flooded: false
        });
      });
    }

    if (worldState.responders) {
      worldState.responders.forEach((responder, i) => {
        const nodeId = `responder_${i}`;
        this.addNode(nodeId, {
          id: nodeId,
          name: responder.name,
          lat: responder.lat,
          lng: responder.lng,
          zone: responder.zone,
          type: 'responder',
          floodRisk: this._getZoneRisk(responder.zone, worldState),
          affected: false,
          flooded: false
        });
      });
    }

    const allZones = [
      ...worldState.zones.red.map(z => ({ name: z, risk: 9 })),
      ...worldState.zones.amber.map(z => ({ name: z, risk: 6 })),
      ...worldState.zones.safe.map(z => ({ name: z, risk: 2 }))
    ];

    allZones.forEach((zone, i) => {
      const nodeId = `zone_${i}`;
      const offset = (i - allZones.length / 2) * 0.02;
      this.addNode(nodeId, {
        id: nodeId,
        name: zone.name,
        lat: worldState.map_center.lat + offset,
        lng: worldState.map_center.lng + offset,
        zone: zone.name,
        type: 'zone_center',
        floodRisk: zone.risk,
        affected: false,
        flooded: false
      });
    });

    this._connectByProximity(worldState);

    if (worldState.blocked_roads) {
      worldState.blocked_roads.forEach(road => {
        this.removeRoad(road);
      });
    }

    this.originalEdges = JSON.parse(JSON.stringify(this.edges));

    console.log(`[GRAPH] Built — ${Object.keys(this.nodes).length} nodes, ${this._countEdges()} edges`);
    return this;
  }

  addNode(id, data) {
    this.nodes[id] = data;
    if (!this.edges[id]) {
      this.edges[id] = [];
    }
  }

  addEdge(fromId, toId, roadName, weight = 1) {
    if (!this.nodes[fromId] || !this.nodes[toId]) return;

    this.edges[fromId] = this.edges[fromId] || [];
    this.edges[toId] = this.edges[toId] || [];

    this.edges[fromId].push({ to: toId, road: roadName, weight });
    this.edges[toId].push({ to: fromId, road: roadName, weight });

    if (!this.roads[roadName]) {
      this.roads[roadName] = [];
    }
    this.roads[roadName].push([fromId, toId]);
  }

  removeRoad(roadName) {
    const normalizedRoad = roadName.toLowerCase().trim();
    Object.keys(this.edges).forEach(nodeId => {
      this.edges[nodeId] = this.edges[nodeId].filter(edge => {
        return !edge.road.toLowerCase().includes(normalizedRoad) &&
               !normalizedRoad.includes(edge.road.toLowerCase());
      });
    });
    console.log(`[GRAPH] Road removed: ${roadName}`);
  }

  resetGraph() {
    this.edges = JSON.parse(JSON.stringify(this.originalEdges));
    Object.keys(this.nodes).forEach(id => {
      this.nodes[id].affected = false;
      this.nodes[id].flooded = false;
    });
    console.log('[GRAPH] Graph reset');
  }

  getFloodRiskForZone(zoneName) {
    const zoneNodes = Object.values(this.nodes).filter(n =>
      n.zone && n.zone.toLowerCase().includes(zoneName.toLowerCase())
    );
    if (zoneNodes.length === 0) return 5;
    const avgRisk = zoneNodes.reduce((sum, n) => sum + (n.floodRisk || 5), 0) / zoneNodes.length;
    return Math.round(avgRisk);
  }

  isRouteBlocked(fromZone, toZone) {
    const fromNodes = Object.values(this.nodes).filter(n =>
      n.zone && n.zone.toLowerCase().includes(fromZone.toLowerCase())
    );
    const toNodes = Object.values(this.nodes).filter(n =>
      n.zone && n.zone.toLowerCase().includes(toZone.toLowerCase())
    );

    if (fromNodes.length === 0 || toNodes.length === 0) return false;

    for (const fromNode of fromNodes) {
      for (const toNode of toNodes) {
        if (this._bfsPathExists(fromNode.id, toNode.id)) {
          return false;
        }
      }
    }
    return true;
  }

  getAffectedNodes() {
    return Object.values(this.nodes)
      .filter(n => n.affected)
      .map(n => n.id);
  }

  getAffectedRoads() {
    const affected = [];
    Object.keys(this.edges).forEach(nodeId => {
      if (this.nodes[nodeId] && this.nodes[nodeId].affected) {
        this.edges[nodeId].forEach(edge => {
          if (this.nodes[edge.to] && this.nodes[edge.to].affected) {
            if (!affected.includes(edge.road)) {
              affected.push(edge.road);
            }
          }
        });
      }
    });
    return affected;
  }

  getNearestShelter(lat, lng) {
    const shelterNodes = Object.values(this.nodes).filter(n => n.type === 'shelter');
    if (shelterNodes.length === 0) return null;

    let nearest = null;
    let minDist = Infinity;

    shelterNodes.forEach(node => {
      const dist = Math.sqrt(
        Math.pow(node.lat - lat, 2) +
        Math.pow(node.lng - lng, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = node;
      }
    });

    return nearest;
  }

  getAllNodes() {
    return Object.values(this.nodes);
  }

  getAllEdges() {
    const edges = [];
    const seen = new Set();

    Object.keys(this.edges).forEach(fromId => {
      this.edges[fromId].forEach(edge => {
        const key = [fromId, edge.to].sort().join('-');
        if (!seen.has(key)) {
          seen.add(key);
          const fromNode = this.nodes[fromId];
          const toNode = this.nodes[edge.to];
          if (fromNode && toNode) {
            edges.push({
              from: fromId,
              to: edge.to,
              road: edge.road,
              fromLat: fromNode.lat,
              fromLng: fromNode.lng,
              toLat: toNode.lat,
              toLng: toNode.lng,
              affected: fromNode.affected && toNode.affected,
              flooded: fromNode.affected && toNode.affected
            });
          }
        }
      });
    });

    return edges;
  }

  _connectByProximity(worldState) {
    const nodeList = Object.values(this.nodes);
    const CONNECT_THRESHOLD = 0.08;

    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        const a = nodeList[i];
        const b = nodeList[j];

        const dist = Math.sqrt(
          Math.pow(a.lat - b.lat, 2) +
          Math.pow(a.lng - b.lng, 2)
        );

        if (dist <= CONNECT_THRESHOLD) {
          const roadName = `${a.name}_to_${b.name}`;
          const isBlocked = worldState.blocked_roads &&
            worldState.blocked_roads.some(r =>
              r.toLowerCase().includes(a.name.toLowerCase()) ||
              r.toLowerCase().includes(b.name.toLowerCase())
            );

          if (!isBlocked) {
            const weight = dist * (1 + (a.floodRisk + b.floodRisk) / 20);
            this.addEdge(a.id, b.id, roadName, weight);
          }
        }
      }
    }
  }

  _bfsPathExists(startId, endId) {
    if (startId === endId) return true;

    const visited = new Set();
    const queue = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === endId) return true;

      const neighbors = this.edges[current] || [];
      for (const edge of neighbors) {
        if (!visited.has(edge.to) && !this.nodes[edge.to]?.affected) {
          visited.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
    return false;
  }

  _getZoneRisk(zoneName, worldState) {
    if (!zoneName) return 5;

    const isRed = worldState.zones.red.some(z =>
      z.toLowerCase().includes(zoneName.toLowerCase()) ||
      zoneName.toLowerCase().includes(z.toLowerCase())
    );
    if (isRed) return 9;

    const isAmber = worldState.zones.amber.some(z =>
      z.toLowerCase().includes(zoneName.toLowerCase()) ||
      zoneName.toLowerCase().includes(z.toLowerCase())
    );
    if (isAmber) return 6;

    return 2;
  }

  _countEdges() {
    return Object.values(this.edges)
      .reduce((sum, arr) => sum + arr.length, 0) / 2;
  }
}

const cityGraph = new CityGraph();

module.exports = { CityGraph, cityGraph };