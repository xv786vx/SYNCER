from sqlalchemy import Column, Integer, Date
from sqlalchemy.ext.declarative import declarative_base
import datetime
from sqlalchemy.orm import Session
import pytz

Base = declarative_base()

EST = pytz.timezone('America/New_York')

class YoutubeQuota(Base):
    __tablename__ = 'youtube_quota'
    id = Column(Integer, primary_key=True)
    date = Column(Date, unique=True, nullable=False)
    total = Column(Integer, default=0, nullable=False)

def _get_today_est():
    """Returns the current date in EST."""
    return datetime.datetime.now(EST).date()

def increment_quota(db: Session, count: int = 1):
    today = _get_today_est()
    quota = db.query(YoutubeQuota).filter_by(date=today).first()
    if not quota:
        quota = YoutubeQuota(date=today, total=0)
        db.add(quota)
    quota.total += count
    db.commit()

def get_total_quota_used(db: Session):
    today = _get_today_est()
    quota = db.query(YoutubeQuota).filter_by(date=today).first()
    return quota.total if quota else 0

def set_total_quota_value(db: Session, total_value: int):
    today = _get_today_est()
    quota = db.query(YoutubeQuota).filter_by(date=today).first()
    if not quota:
        quota = YoutubeQuota(date=today, total=total_value)
        db.add(quota)
    else:
        quota.total = total_value
    db.commit()