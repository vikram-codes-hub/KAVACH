const getWorldStatePrompt = (pdfText) => {
  return `You are a disaster data extractor for Indian emergency management systems.
Read the following disaster advisory text carefully and return ONLY a valid JSON object.
No explanation, no markdown, no code blocks, no preamble. The JSON must be directly parseable.

Extract exactly this structure:

{
  "disaster": {
    "type": "string (e.g. Flash Flood, Cloudburst, Landslide, Cyclone)",
    "severity": "string (e.g. Extreme, High, Moderate, Critical)",
    "river": "string (primary river involved if any, else null)",
    "issued_by": "string (issuing authority from the document)",
    "location": "string (city, district, state — as mentioned in document)",
    "state": "string (Indian state name)",
    "district": "string (district name)"
  },
  "zones": {
    "red": ["zone name 1", "zone name 2"],
    "amber": ["zone name 1", "zone name 2"],
    "safe": ["zone name 1", "zone name 2"]
  },
  "blocked_roads": ["road name 1", "road name 2"],
  "safe_roads": ["road name 1", "road name 2"],
  "shelters": [
    {
      "name": "string",
      "location": "string",
      "zone": "string",
      "lat": number,
      "lng": number,
      "capacity": number
    }
  ],
  "hospitals": [
    {
      "name": "string",
      "zone": "string",
      "lat": number,
      "lng": number
    }
  ],
  "responders": [
    {
      "name": "string",
      "type": "string (NDRF / Ambulance / Police / Fire)",
      "zone": "string",
      "lat": number,
      "lng": number
    }
  ],
  "map_center": {
    "lat": number,
    "lng": number,
    "zoom": number
  }
}

COORDINATE RULES:
- Use real coordinates for every lat and lng based on the actual location mentioned in the document
- The document may be from ANY Indian state — Rajasthan, Uttarakhand, Maharashtra, Kerala, Bihar, etc.
- Estimate coordinates based on the known real-world location of each place name mentioned
- For map_center: use the average lat/lng of all affected zones combined, zoom 12 for city-level, zoom 8 for state-level
- Never invent place names — only use locations explicitly mentioned in the text
- Always include at least 2 red zones, 1 amber zone, 1 safe zone
- Always include at least 1 shelter, 1 hospital, 1 responder

Advisory text:
${pdfText}`;
};

module.exports = { getWorldStatePrompt };