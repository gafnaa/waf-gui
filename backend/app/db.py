import sqlite3
import os
import json
from contextlib import contextmanager

DB_FILE = os.path.join(os.path.dirname(__file__), "..", "waf_data.db")

@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    # Return dict-like rows
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Users Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                full_name TEXT,
                hashed_password TEXT NOT NULL,
                role TEXT DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 2. IP Rules Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ip_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip TEXT UNIQUE NOT NULL,
                action TEXT NOT NULL,
                note TEXT,
                duration TEXT DEFAULT 'Permanent',
                region TEXT,
                status TEXT DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 3. WAF Rule Toggles (for Core Rules)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS waf_rule_toggles (
                rule_id TEXT PRIMARY KEY,
                enabled BOOLEAN NOT NULL DEFAULT 1
            )
        ''')
        
        # 4. Settings (Hotlink, etc.)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        ''')
        
        conn.commit()

        # Seed Default Admin if not exists
        cursor.execute("SELECT * FROM users WHERE username = ?", ("admin",))
        if not cursor.fetchone():
            # hash for 'admin123' generated via passlib (bcrypt)
            # using a hardcoded one for now to avoid circular import, or better, import helper
            # $2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW = admin123
            default_hash = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW" 
            cursor.execute(
                "INSERT INTO users (username, full_name, hashed_password) VALUES (?, ?, ?)",
                ("admin", "Administrator", default_hash)
            )
            conn.commit()
            print("Database initialized. Default admin created.")
            
        else:
            print("Database checked. Users exist.")
