# Omsk Map System

A professional, cross-browser web application for visualizing and managing map layers in Omsk. Built with FastAPI (Python), Bootstrap 5, Leaflet, Geoman, and jsTree.

## Features
- **Interactive Map:** Centered on Omsk by default, using free OpenStreetMap tiles.
- **Layer Management:** Supports categorizing layers in a tree structure.
- **KMZ Support:** Upload and visualize KMZ files directly.
- **Professional Drawing:** Draw geometries directly on the map and save them to the database.
- **No API Keys Required:** Fully built with open-source mapping libraries.

## Manual Startup

1. **Install Dependencies:**
   Ensure you have Python 3.12+ installed.
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the Backend:**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

3. **Access the App:**
   Open your browser and navigate to `http://localhost:8000/static/index.html`

## Docker Deployment

1. **Build and Run:**
   Ensure you have Docker and Docker Compose installed.
   ```bash
   docker compose up --build -d
   ```

2. **Access the App:**
   Open your browser and navigate to `http://localhost:8000/static/index.html`

## Technologies Used
- Backend: FastAPI, SQLAlchemy, SQLite
- Frontend: Bootstrap 5, Leaflet, Leaflet-Geoman (drawing), Leaflet-KMZ, jsTree
