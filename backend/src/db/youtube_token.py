from sqlalchemy import create_engine, Column, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class YoutubeToken(Base):
    __tablename__ = "YoutubeToken"
    userId = Column(String, primary_key=True, index=True)
    tokenJson = Column(Text)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def save_youtube_token(user_id, token_json):
    print(f"[YoutubeToken] Saving token for user_id: {user_id}")
    session = SessionLocal()
    obj = session.query(YoutubeToken).filter_by(userId=user_id).first()
    if obj:
        print(f"[YoutubeToken] Updating existing token for user_id: {user_id}")
        obj.tokenJson = token_json
    else:
        print(f"[YoutubeToken] Creating new token for user_id: {user_id}")
        obj = YoutubeToken(userId=user_id, tokenJson=token_json)
        session.add(obj)
    session.commit()
    session.close()
    print(f"[YoutubeToken] Successfully saved token for user_id: {user_id}")

def get_youtube_token(user_id):
    print(f"[YoutubeToken] Getting token for user_id: {user_id}")
    session = SessionLocal()
    obj = session.query(YoutubeToken).filter_by(userId=user_id).first()
    session.close()
    if obj:
        print(f"[YoutubeToken] Found token for user_id: {user_id}")
    else:
        print(f"[YoutubeToken] No token found for user_id: {user_id}")
    return obj.tokenJson if obj else None

def is_youtube_authenticated(user_id):
    print(f"[YoutubeToken] Checking authentication for user_id: {user_id}")
    session = SessionLocal()
    obj = session.query(YoutubeToken).filter_by(userId=user_id).first()
    session.close()
    is_authenticated = obj is not None
    print(f"[YoutubeToken] Authentication status for user_id {user_id}: {is_authenticated}")
    return is_authenticated
