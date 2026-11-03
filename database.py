from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Text, Boolean
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
import os

os.makedirs("./data", exist_ok=True)
SQLALCHEMY_DATABASE_URL = "sqlite:///./data/map_layers.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    layers = relationship("Layer", back_populates="category")
    subcategories = relationship("Category") # Basic self-referential relationship

class Layer(Base):
    __tablename__ = "layers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    is_kmz = Column(Boolean, default=False)
    file_path = Column(String, nullable=True) # Path to kmz file if uploaded
    geojson_data = Column(Text, nullable=True) # GeoJSON string if drawn

    category = relationship("Category", back_populates="layers")

Base.metadata.create_all(bind=engine)
