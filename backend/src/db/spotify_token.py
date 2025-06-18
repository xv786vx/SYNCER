from sqlalchemy import create_engine, Column, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class SpotifyToken(Base):
    __tablename__ = "SpotifyToken"
    userId = Column(String, primary_key=True, index=True)
    tokenJson = Column(Text)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def save_spotify_token(user_id, token_json):
    session = SessionLocal()
    obj = session.query(SpotifyToken).filter_by(userId=user_id).first()
    if obj:
        obj.tokenJson = token_json
    else:
        obj = SpotifyToken(userId=user_id, tokenJson=token_json)
        session.add(obj)
    session.commit()
    session.close()

def get_spotify_token(user_id):
    session = SessionLocal()
    obj = session.query(SpotifyToken).filter_by(userId=user_id).first()
    session.close()
    if obj:
        return obj.tokenJson
    return None