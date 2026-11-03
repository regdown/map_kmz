from fastapi.testclient import TestClient
from main import app, get_db
from database import Base, engine, SessionLocal
import pytest

client = TestClient(app)

# Override dependency for testing
def override_get_db():
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    # No teardown needed for simple tests on sqlite

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to Map API"}

def test_create_category():
    response = client.post("/categories/", json={"name": "Test Category"})
    assert response.status_code == 200
    assert response.json()["name"] == "Test Category"

def test_get_categories():
    response = client.get("/categories/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_layer():
    response = client.post("/layers/", json={
        "name": "Test Layer",
        "geojson_data": "{}"
    })
    assert response.status_code == 200
    assert response.json()["name"] == "Test Layer"

def test_get_layers():
    response = client.get("/layers/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
