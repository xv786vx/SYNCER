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

# --- Atomic Quota Reservation ---
from sqlalchemy import update

def reserve_quota_atomic(db: Session, required_units: int, quota_limit: int) -> bool:
    """
    Atomically reserve quota units for today.
    Returns True if reservation succeeded, False if not enough quota.
    """
    today = _get_today_est()
    # Ensure today's row exists
    quota = db.query(YoutubeQuota).filter_by(date=today).first()
    if not quota:
        quota = YoutubeQuota(date=today, total=0)
        db.add(quota)
        db.commit()
        db.refresh(quota)
    # Atomic update: only increment if enough quota remains
    result = db.execute(
        update(YoutubeQuota)
        .where(
            YoutubeQuota.date == today,
            YoutubeQuota.total + required_units <= quota_limit
        )
        .values(total=YoutubeQuota.total + required_units)
        .execution_options(synchronize_session=False)
    )
    db.commit()
    return result.rowcount == 1  # True if update succeeded, False if not enough quota

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