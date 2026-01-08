import sqlite3
import os
from passlib.context import CryptContext

# Setup path
DB_FILE = os.path.join("c:\\Gafnaa\\waf-gui\\backend", "waf_data.db")
print(f"Checking DB at: {DB_FILE}")

if not os.path.exists(DB_FILE):
    print("DB FILE DOES NOT EXIST!")
else:
    print("DB file found.")

# Setup crypto
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ADMIN_USER = "admin"
ADMIN_PASS = "admin123"

try:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE username = ?", (ADMIN_USER,))
    row = cursor.fetchone()
    
    if row:
        print(f"User {ADMIN_USER} found.")
        # row structure depends on creation, but assuming order: username, full_name, hashed_password...
        # Let's inspect columns or assume index 2 is hash as per create table
        # CREATE TABLE users (username, full_name, hashed_password, role, created_at)
        stored_hash = row[2]
        print(f"Stored hash: {stored_hash}")
        
        is_valid = pwd_context.verify(ADMIN_PASS, stored_hash)
        print(f"Password '{ADMIN_PASS}' valid? {is_valid}")
        
        if not is_valid:
            print("Password invalid. Updating to correct hash...")
            new_hash = pwd_context.hash(ADMIN_PASS)
            cursor.execute("UPDATE users SET hashed_password = ? WHERE username = ?", (new_hash, ADMIN_USER))
            conn.commit()
            print("Password updated successfully.")
            
            # Verify again
            print(f"New hash: {new_hash}")
            print(f"Verify new: {pwd_context.verify(ADMIN_PASS, new_hash)}")
    else:
        print(f"User {ADMIN_USER} NOT found. Creating...")
        new_hash = pwd_context.hash(ADMIN_PASS)
        cursor.execute(
            "INSERT INTO users (username, full_name, hashed_password) VALUES (?, ?, ?)",
            (ADMIN_USER, "Administrator", new_hash)
        )
        conn.commit()
        print("User created.")

    conn.close()

except Exception as e:
    print(f"Error: {e}")
