from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import json
import numpy as np
import geopandas as gpd
from scipy.spatial import KDTree
from scipy.optimize import minimize
from shapely.geometry import Point
from mangum import Mangum

def generate_heart(num_points=200):
    t = np.linspace(0, 2 * np.pi, num_points)
    x = 16 * np.sin(t)**3
    y = 13 * np.cos(t) - 5 * np.cos(2*t) - 2 * np.cos(3*t) - np.cos(4*t)
    return np.vstack((x, y)).T

def transform_heart(heart, scale, theta, tx, ty):
    R = np.array([[np.cos(theta), -np.sin(theta)],
                  [np.sin(theta),  np.cos(theta)]])
    return scale * heart.dot(R.T) + np.array([tx, ty])

def cost_function(params, heart, kd_tree):
    scale, theta, tx, ty = params
    transformed_heart = transform_heart(heart, scale, theta, tx, ty)
    distances, _ = kd_tree.query(transformed_heart)
    return np.sum(distances ** 2)

def run_optimization():
    # Use a relative path to your GeoJSON file (ensure it's included in your repo)
    gdf = gpd.read_file("../public/bavaria_bike_nodes.geojson")
    coords = np.array([(point.x, point.y) for point in gdf.geometry])
    kd_tree = KDTree(coords)
    heart = generate_heart(num_points=200)
    initial_params = [0.10, 0.01, 2.5, 2.5]
    result = minimize(
        cost_function,
        initial_params,
        args=(heart, kd_tree),
        method='L-BFGS-B',
        options={'disp': False, 'maxiter': 1000, 'ftol': 1e-12}
    )
    best_params = result.x
    fitted_heart = transform_heart(heart, *best_params)
    _, indices = kd_tree.query(fitted_heart)
    nearest_nodes = coords[indices]
    nearest_points = [Point(x, y) for x, y in nearest_nodes]
    nearest_gdf = gpd.GeoDataFrame(geometry=nearest_points, crs=gdf.crs)
    return nearest_gdf

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/fit-heart")
async def fit_heart(request: Request):
    data = await request.json()
    nearest_gdf = run_optimization()
    geojson_result = json.loads(nearest_gdf.to_json())
    return geojson_result

# Wrap your app for serverless
handler = Mangum(app)
