// app/api/fit-heart/route.ts
import { NextResponse } from 'next/server';
import { GeoJsonObject } from 'geojson';
import { readFileSync } from 'fs';
import path from 'path';
import fmin from 'fmin';

interface Coordinates {
  lat: number;
  lng: number;
}

interface Payload {
  location: Coordinates | null;
  drawing: { x: number; y: number }[];
}

/**
 * Generate the heart shape as an array of [x, y] points.
 */
function generateHeart(numPoints: number = 200): number[][] {
  const result: number[][] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = (2 * Math.PI * i) / numPoints;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    result.push([x, y]);
  }
  return result;
}

/**
 * Apply scaling, rotation, and translation to the heart shape.
 */
function transformHeart(heart: number[][], params: number[]): number[][] {
  const [scale, theta, tx, ty] = params;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  return heart.map(([x, y]) => [
    scale * (x * cosTheta - y * sinTheta) + tx,
    scale * (x * sinTheta + y * cosTheta) + ty,
  ]);
}

/**
 * Compute squared Euclidean distance between two points.
 */
function squaredDistance(a: number[], b: number[]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

/**
 * Cost function: For each transformed heart point, find the closest node (from the network)
 * and sum the squared distances.
 */
function costFunction(params: number[], heart: number[][], coords: number[][]): number {
  const transformed = transformHeart(heart, params);
  let total = 0;
  for (const point of transformed) {
    let minDist = Infinity;
    for (const node of coords) {
      const d = squaredDistance(point, node);
      if (d < minDist) {
        minDist = d;
      }
    }
    total += minDist;
  }
  return total;
}

/**
 * Load the network nodes from a GeoJSON file and run the optimization.
 * (This function mimics your Python run_optimization.)
 */
function runOptimization(): GeoJsonObject {
  // Construct the path to your GeoJSON file.
  // Ensure that bavaria_bike_nodes.geojson is in the public folder at the root.
  const filePath = path.join(process.cwd(), 'public', 'bavaria_bike_nodes.geojson');
  const fileData = readFileSync(filePath, 'utf-8');
  const nodesGeoJSON = JSON.parse(fileData);
  
  // Extract coordinates from each feature (assumes Point geometries)
  const coords: number[][] = nodesGeoJSON.features.map((f: any) => f.geometry.coordinates);

  const heart = generateHeart(200);
  const initialParams = [0.10, 0.01, 2.5, 2.5];

  // Use fmin to minimize the cost function.
  const result = fmin(
    (params: number[]) => costFunction(params, heart, coords),
    initialParams
  );
  const bestParams = result.x;
  const fittedHeart = transformHeart(heart, bestParams);

  // For demonstration, we return the fitted heart as a GeoJSON FeatureCollection.
  const features = fittedHeart.map(pt => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: pt,
    },
    properties: {},
  }));

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * POST handler for the /api/fit-heart route.
 * It reads the incoming payload (which can include location and drawing data),
 * runs the optimization, and returns a GeoJSON result.
 */
export async function POST(request: Request) {
  try {
    const payload: Payload = await request.json();
    console.log("Received payload:", payload);
    // For this example, we ignore the payload and run our optimization.
    // You can integrate the payload data into your optimization logic if needed.
    const result = runOptimization();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.error();
  }
}
