from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import json
import numpy as np
import geopandas as gpd
from scipy.spatial import KDTree
from scipy.optimize import minimize
from shapely.geometry import Point

# Your existing functions here...
# (e.g., generate_heart, transform_heart, cost_function, main, etc.)

def generate_heart(num_points=200):
    t = np.linspace(0, 2 * np.pi, num_points)
    x = 16 * np.sin(t)**3
    y = 13 * np.cos(t) - 5 * np.cos(2 * t) - 2 * np.cos(3 * t) - np.cos(4 * t)
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
    # Load your GeoJSON file containing nodes (adjust path as needed)
    gdf = gpd.read_file('/Users/kminemacmini/Documents/GitHub/Python/bavaria_bike_nodes.geojson')
    coords = np.array([(point.x, point.y) for point in gdf.geometry])
    kd_tree = KDTree(coords)
    heart = generate_heart(num_points=200)
    
    # Set your initial guess parameters
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

# Allow requests from your Next.js domain (e.g., localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/fit-heart")
async def fit_heart(request: Request):
    # If you need to accept parameters from the frontend, read them here:
    data = await request.json()
    # (Use data to customize your optimization if desired)
    
    nearest_gdf = run_optimization()
    # Convert the GeoDataFrame to GeoJSON (a Python dict)
    geojson_result = json.loads(nearest_gdf.to_json())
    return geojson_result

if __name__ == "__main__":
    # Run the API server on localhost:8000
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
