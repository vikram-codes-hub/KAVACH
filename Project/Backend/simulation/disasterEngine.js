const { cityGraph } = require('./cityGraph');

class DisasterEngine {
  constructor() {
    this.affectedNodes = new Set();
    this.affectedRoads = new Set();
    this.spreadHistory = []; // track which tick each node was affected
    this.disasterType = 'flood'; // set from world state
  }

  // Initialize disaster starting points from red zones
  initialize(worldState) {
    this.affectedNodes.clear();
    this.affectedRoads.clear();
    this.spreadHistory = [];
    this.disasterType = worldState.disaster.type.toLowerCase();

    // Seed disaster spread from all red zone nodes
    Object.values(cityGraph.nodes).forEach(node => {
      const isRedZone = worldState.zones.red.some(zone =>
        node.zone && (
          node.zone.toLowerCase().includes(zone.toLowerCase()) ||
          zone.toLowerCase().includes(node.zone.toLowerCase())
        )
      );

      if (isRedZone) {
        this.affectedNodes.add(node.id);
        node.affected = true;
        node.flooded = true; // keep for backwards compat
        this.spreadHistory.push({ nodeId: node.id, tick: 0 });
      }
    });

    console.log(`[DISASTER] Initialized ${this.disasterType} — ${this.affectedNodes.size} red zone nodes seeded`);
    return this;
  }

  // Main BFS disaster spread — called every tick
  // Works for ALL disaster types via risk threshold
  // Tick 1: risk >= 9. Tick 3: risk >= 7. Tick 6: risk >= 4. Tick 9: risk >= 1
  spreadDisaster(currentTick) {
    const newlyAffected = new Set();

    this.affectedNodes.forEach(nodeId => {
      const neighbors = cityGraph.edges[nodeId] || [];

      neighbors.forEach(edge => {
        const neighborNode = cityGraph.nodes[edge.to];
        if (!neighborNode || this.affectedNodes.has(edge.to)) return;

        // Spread threshold — higher tick = lower threshold = more nodes affected
        const spreadThreshold = Math.max(1, 10 - currentTick);

        // Apply disaster-type specific spread modifier
        const riskScore = this._getModifiedRisk(neighborNode, currentTick);

        if (riskScore >= spreadThreshold) {
          newlyAffected.add(edge.to);
          this.spreadHistory.push({ nodeId: edge.to, tick: currentTick });
        }
      });
    });

    // Apply newly affected nodes
    newlyAffected.forEach(nodeId => {
      this.affectedNodes.add(nodeId);
      if (cityGraph.nodes[nodeId]) {
        cityGraph.nodes[nodeId].affected = true;
        cityGraph.nodes[nodeId].flooded = true; // backwards compat
      }
    });

    // Update affected roads
    this._updateAffectedRoads();

    console.log(`[DISASTER] Tick ${currentTick} — ${this.affectedNodes.size} nodes affected, ${newlyAffected.size} newly affected`);

    return {
      affectedNodes: Array.from(this.affectedNodes),
      affectedRoads: Array.from(this.affectedRoads),
      newlyAffected: Array.from(newlyAffected),
      // keep flood naming for frontend backwards compat
      floodedNodes: Array.from(this.affectedNodes),
      floodedRoads: Array.from(this.affectedRoads)
    };
  }

  // Check if a specific zone has been reached by disaster
  isZoneAffected(zoneName) {
    for (const nodeId of this.affectedNodes) {
      const node = cityGraph.nodes[nodeId];
      if (node && node.zone &&
        node.zone.toLowerCase().includes(zoneName.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  // Check if route is blocked between two lat/lng points
  isRouteBlocked(agentLat, agentLng, destLat, destLng) {
    const agentNode = this._getNearestNode(agentLat, agentLng);
    const destNode = this._getNearestNode(destLat, destLng);

    if (!agentNode || !destNode) return false;
    if (agentNode.id === destNode.id) return false;

    return !this._bfsAvoidingAffected(agentNode.id, destNode.id);
  }

  // Check if route is blocked using zone names
  isRouteBlockedByZone(fromZone, toZone) {
    return cityGraph.isRouteBlocked(fromZone, toZone);
  }

  // Get disaster coverage percentage
  getDisasterCoverage() {
    const total = Object.keys(cityGraph.nodes).length;
    if (total === 0) return 0;
    return Math.round((this.affectedNodes.size / total) * 100);
  }

  // Get affected nodes at a specific tick from history
  getAffectedAtTick(tick) {
    return this.spreadHistory
      .filter(h => h.tick <= tick)
      .map(h => h.nodeId);
  }

  // Get all affected nodes as array
  getAffectedNodes() {
    return Array.from(this.affectedNodes);
  }

  // Get all affected roads as array
  getAffectedRoads() {
    return Array.from(this.affectedRoads);
  }

  // Get disaster label for UI display
  getDisasterLabel() {
    const labels = {
      'flash flood': 'Flood',
      'flood': 'Flood',
      'cloudburst': 'Cloudburst',
      'landslide': 'Landslide',
      'earthquake': 'Earthquake',
      'cyclone': 'Cyclone',
      'fire': 'Fire',
      'drought': 'Drought',
      'tsunami': 'Tsunami',
      'heatwave': 'Heatwave'
    };

    for (const key of Object.keys(labels)) {
      if (this.disasterType.includes(key)) {
        return labels[key];
      }
    }
    return 'Disaster';
  }

  // Get disaster color for UI
  getDisasterColor() {
    const colors = {
      'flood': '#3b82f6',       // blue
      'flash flood': '#3b82f6', // blue
      'cloudburst': '#6366f1',  // indigo
      'landslide': '#92400e',   // brown
      'earthquake': '#78716c',  // stone
      'cyclone': '#7c3aed',     // purple
      'fire': '#ef4444',        // red
      'heatwave': '#f97316',    // orange
      'tsunami': '#0891b2',     // cyan
      'drought': '#d97706'      // amber
    };

    for (const key of Object.keys(colors)) {
      if (this.disasterType.includes(key)) {
        return colors[key];
      }
    }
    return '#6b7280'; // gray default
  }

  // Reset disaster engine
  reset() {
    this.affectedNodes.clear();
    this.affectedRoads.clear();
    this.spreadHistory = [];

    Object.values(cityGraph.nodes).forEach(node => {
      node.affected = false;
      node.flooded = false;
    });

    console.log('[DISASTER] Engine reset');
  }

  // Get map data for frontend rendering
  getMapData() {
    return {
      affectedNodes: Array.from(this.affectedNodes).map(id => {
        const node = cityGraph.nodes[id];
        return node ? {
          id,
          lat: node.lat,
          lng: node.lng,
          zone: node.zone,
          name: node.name
        } : null;
      }).filter(Boolean),

      affectedRoads: cityGraph.getAllEdges().filter(edge =>
        this.affectedNodes.has(edge.from) &&
        this.affectedNodes.has(edge.to)
      ),

      disasterCoverage: this.getDisasterCoverage(),
      disasterColor: this.getDisasterColor(),
      disasterLabel: this.getDisasterLabel(),

      // backwards compat for frontend
      floodedNodes: Array.from(this.affectedNodes),
      floodedRoads: Array.from(this.affectedRoads)
    };
  }

  // Private — get risk score modified by disaster type
  _getModifiedRisk(node, tick) {
    const baseRisk = node.floodRisk || 5;

    switch (true) {
      case this.disasterType.includes('earthquake'):
        // Earthquakes spread uniformly — all nodes affected equally fast
        return baseRisk + 2;

      case this.disasterType.includes('cyclone'):
        // Cyclones affect coastal and open areas more
        return baseRisk + 1;

      case this.disasterType.includes('landslide'):
        // Landslides spread along slope — only high risk nodes
        return baseRisk;

      case this.disasterType.includes('fire'):
        // Fire spreads faster in later ticks (wind effect)
        return baseRisk + Math.floor(tick / 3);

      case this.disasterType.includes('flood'):
      case this.disasterType.includes('cloudburst'):
      default:
        // Standard BFS flood spread
        return baseRisk;
    }
  }

  // Private — update affected roads set
  _updateAffectedRoads() {
    this.affectedRoads.clear();

    cityGraph.getAllEdges().forEach(edge => {
      if (
        this.affectedNodes.has(edge.from) &&
        this.affectedNodes.has(edge.to)
      ) {
        this.affectedRoads.add(edge.road);
      }
    });
  }

  // Private — get nearest graph node to lat/lng
  _getNearestNode(lat, lng) {
    let nearest = null;
    let minDist = Infinity;

    Object.values(cityGraph.nodes).forEach(node => {
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

  // Private — BFS avoiding affected nodes
  _bfsAvoidingAffected(startId, endId) {
    if (startId === endId) return true;

    const visited = new Set();
    const queue = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === endId) return true;

      const neighbors = cityGraph.edges[current] || [];
      for (const edge of neighbors) {
        if (
          !visited.has(edge.to) &&
          !this.affectedNodes.has(edge.to)
        ) {
          visited.add(edge.to);
          queue.push(edge.to);
        }
      }
    }

    return false;
  }
}

// Singleton instance
const disasterEngine = new DisasterEngine();

module.exports = { DisasterEngine, disasterEngine };