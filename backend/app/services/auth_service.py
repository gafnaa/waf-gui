import json
import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.config import get_settings

settings = get_settings()

# Setup Security
SECRET_KEY = "RAHASIA_NEGARA_GANTI_INI_YA" # Ganti string acak panjang
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

USERS_FILE = "users.json"

def get_password_hash(password):
    return pwd_context.hash(password)

def load_users():
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    
    # Default Admin (admin / admin123)
    return {
        "admin": {
            "username": "admin",
            "full_name": "Administrator",
            "hashed_password": get_password_hash("admin123")
        }
    }

def save_users(db):
    with open(USERS_FILE, "w") as f:
        json.dump(db, f, indent=4)

# Global memory cache of users
users_db = load_users()

def verify_password(plain_password, hashed_password):
    if not hashed_password: return False
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = users_db.get(username)
    if user is None:
        raise credentials_exception
    return user

# User Management Functions
def update_profile(username: str, full_name: str):
    if username not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    users_db[username]["full_name"] = full_name
    save_users(users_db)
    return users_db[username]

def change_password(username: str, current_password: str, new_password: str):
    if username not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = users_db[username]
    if not verify_password(current_password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect password")
    
    users_db[username]["hashed_password"] = get_password_hash(new_password)
    save_users(users_db)
    return True