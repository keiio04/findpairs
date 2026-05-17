
import os
import sqlite3
from models import Database
from config import config

def organize_database():
    print("Starting database organization...")
    
    # Load configuration
    env = os.environ.get('FLASK_ENV', 'development')
    db_path = config[env].DATABASE
    
    print(f"Target Database: {db_path}")
    
    if not os.path.exists(db_path):
        print("Database file not found. Creating a new one...")
    else:
        print("Existing database found. Organizing structure...")
        
    # Initialize the database
    db = Database(db_path)
    db.init_db()
    
    # SMART MIGRATION: Add missing columns if they don't exist
    print("Checking for required schema updates...")
    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        # Check users table columns
        cursor.execute("PRAGMA table_info(users)")
        columns = [row['name'] for row in cursor.fetchall()]
        
        # Add last_login if missing
        if 'last_login' not in columns:
            print(" - Adding 'last_login' column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN last_login TIMESTAMP")
            
        # Add is_active if missing
        if 'is_active' not in columns:
            print(" - Adding 'is_active' column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1")
            
        # Add settings if missing
        if 'settings' not in columns:
            print(" - Adding 'settings' column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN settings TEXT DEFAULT '{}'")
            
        conn.commit()
        
        # CLEANUP: Decrypt any existing encrypted emails
        cursor.execute("SELECT id, email FROM users")
        users = cursor.fetchall()
        from auth import decrypt_data
        for u in users:
            original_email = u['email']
            decrypted_email = decrypt_data(original_email)
            if decrypted_email != original_email:
                print(f" - Decrypting email for User ID {u['id']}...")
                cursor.execute("UPDATE users SET email = ? WHERE id = ?", (decrypted_email, u['id']))
        
        conn.commit()
        print("Migration and cleanup successful! Your database is now up-to-date and cleaned.")
    except Exception as e:
        print(f"Migration notice: {e} (This is usually fine if columns already exist)")
    finally:
        conn.close()
    
    # Verify tables
    tables = db.list_tables()
    print("\n" + "="*40)
    print("DATABASE STATUS & CONTENTS")
    print("="*40)
    
    for table in tables:
        if table == 'sqlite_sequence': continue
        
        conn = db.get_connection()
        cursor = conn.cursor()
        try:
            # Get count
            cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
            count = cursor.fetchone()['count']
            print(f"\n[TABLE: {table}] - {count} total records")
            
            # Show all users for full visibility
            cursor.execute(f"SELECT * FROM {table}")
            rows = cursor.fetchall()
            if rows:
                # Print headers
                cols = [description[0] for description in cursor.description]
                print("  " + " | ".join(cols[:5]) + " ...") # Show first 5 columns
                print("  " + "-" * 50)
                for row in rows:
                    # Show a snippet of the data
                    vals = [str(row[c])[:15] for c in cols[:5]]
                    print("  " + " | ".join(vals))
            else:
                print("  (Table is empty)")
                
        except Exception as e:
            print(f" - {table}: Error checking table: {e}")
        finally:
            conn.close()
            
    print("\n" + "="*40)
    print("Organization complete. Everything is visible.")

if __name__ == "__main__":
    organize_database()
