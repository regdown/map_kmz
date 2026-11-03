from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import SessionLocal, Category, Layer
from typing import List, Optional
from pydantic import BaseModel
import os
import shutil
import uuid

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class CategoryCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None

class LayerCreate(BaseModel):
    name: str
    category_id: Optional[int] = None
    geojson_data: str

@app.post("/categories/")
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    db_category = Category(name=category.name, parent_id=category.parent_id)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@app.get("/categories/")
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    return categories

@app.post("/layers/")
def create_layer(layer: LayerCreate, db: Session = Depends(get_db)):
    db_layer = Layer(
        name=layer.name,
        category_id=layer.category_id,
        geojson_data=layer.geojson_data,
        is_kmz=False
    )
    db.add(db_layer)
    db.commit()
    db.refresh(db_layer)
    return db_layer

@app.put("/layers/{layer_id}")
def update_layer(layer_id: int, layer: LayerCreate, db: Session = Depends(get_db)):
    db_layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not db_layer:
        raise HTTPException(status_code=404, detail="Layer not found")

    db_layer.name = layer.name
    db_layer.category_id = layer.category_id
    db_layer.geojson_data = layer.geojson_data
    db.commit()
    db.refresh(db_layer)
    return db_layer

@app.post("/upload_kmz/")
def upload_kmz(
    name: str = Form(...),
    category_id: int = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".kmz"):
        raise HTTPException(status_code=400, detail="Only KMZ files are allowed")

    unique_filename = f"{uuid.uuid4()}.kmz"
    file_path = f"static/uploads/{unique_filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_layer = Layer(
        name=name,
        category_id=category_id,
        is_kmz=True,
        file_path=f"/static/uploads/{unique_filename}"
    )
    db.add(db_layer)
    db.commit()
    db.refresh(db_layer)
    return db_layer

@app.get("/layers/")
def get_layers(db: Session = Depends(get_db)):
    layers = db.query(Layer).all()
    return layers

@app.get("/")
def read_root():
    return {"message": "Welcome to Map API"}
