"""
Database Models for Flip & Match
"""

import sqlite3
from datetime import datetime

class Database:
    """Database handler for Flip & Match"""
    
    def __init__(self, db_path):
        self.db_path = db_path
        
    def get_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_db(self):
        """Initialize all database tables"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_score INTEGER DEFAULT 0,
                total_wins INTEGER DEFAULT 0,
                total_games INTEGER DEFAULT 0,
                best_combo INTEGER DEFAULT 0,
                highest_stage INTEGER DEFAULT 1
            )
        ''')
        
        # Game history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS game_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                stage_id INTEGER NOT NULL,
                stage_name TEXT NOT NULL,
                result TEXT NOT NULL,
                moves INTEGER NOT NULL,
                time_seconds INTEGER NOT NULL,
                score INTEGER NOT NULL,
                combo_max INTEGER DEFAULT 0,
                damage_dealt INTEGER DEFAULT 0,
                mistakes INTEGER DEFAULT 0,
                played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        
        # User sessions table (for tracking active sessions)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        
        conn.commit()
        conn.close()
        print("Database initialized successfully!")

class UserModel:
    """User database operations"""
    
    def __init__(self, db):
        self.db = db
        
    def create(self, username, email, password_hash):
        """Create a new user"""
        conn = self.db.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO users (username, email, password_hash)
                VALUES (?, ?, ?)
            ''', (username, email, password_hash))
            conn.commit()
            user_id = cursor.lastrowid
            return user_id
        except sqlite3.IntegrityError:
            return None
        finally:
            conn.close()
    
    def find_by_username_or_email(self, identifier):
        """Find user by username or email (Case-Insensitive)"""
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, username, email, password_hash, total_score, total_wins, 
                   total_games, best_combo, highest_stage, created_at
            FROM users 
            WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
        ''', (identifier, identifier))
        user = cursor.fetchone()
        conn.close()
        return user
    
    def find_by_id(self, user_id):
        """Find user by ID"""
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, username, email, total_score, total_wins, total_games, 
                   best_combo, highest_stage, created_at
            FROM users WHERE id = ?
        ''', (user_id,))
        user = cursor.fetchone()
        conn.close()
        return user
    
    def update_stats(self, user_id, score, is_win, combo_max, stage_id):
        """Update user statistics after a game"""
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE users SET
                total_score = total_score + ?,
                total_wins = total_wins + ?,
                total_games = total_games + 1,
                best_combo = MAX(best_combo, ?),
                highest_stage = MAX(highest_stage, ?)
            WHERE id = ?
        ''', (score, 1 if is_win else 0, combo_max, stage_id, user_id))
        conn.commit()
        conn.close()
    
    def update_profile(self, user_id, username=None, email=None):
        """Update user profile"""
        conn = self.db.get_connection()
        cursor = conn.cursor()
        
        updates = []
        params = []
        
        if username:
            updates.append('username = ?')
            params.append(username)
        if email:
            updates.append('email = ?')
            params.append(email)
            
        if updates:
            params.append(user_id)
            cursor.execute(f'UPDATE users SET {", ".join(updates)} WHERE id = ?', params)
            conn.commit()
        
        conn.close()
        return True
    
    def update_password(self, user_id, password_hash):
        """Update user password"""
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE users SET password_hash = ? WHERE id = ?', (password_hash, user_id))
        conn.commit()
        conn.close()

class GameHistoryModel:
    """Game history database operations"""
    
    def __init__(self, db):
        self.db = db
    
    def save(self, user_id, game_data):
        """Save a game result"""
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO game_history (
                user_id, stage_id, stage_name, result, moves, 
                time_seconds, score, combo_max, damage_dealt, mistakes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id,
            game_data['stage_id'],
            game_data['stage_name'],
            game_data['result'],
            game_data['moves'],
            game_data['time_seconds'],
            game_data['score'],
            game_data.get('combo_max', 0),
            game_data.get('damage_dealt', 0),
            game_data.get('mistakes', 0)
        ))
        game_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return game_id
    
    def get_user_history(self, user_id, page=1, per_page=20):
        """Get paginated game history for a user"""
        conn = self.db.get_connection()
        cursor = conn.cursor()
        
        # Get total count
        cursor.execute('SELECT COUNT(*) as total FROM game_history WHERE user_id = ?', (user_id,))
        total = cursor.fetchone()['total']
        
        # Get paginated history
        offset = (page - 1) * per_page
        cursor.execute('''
            SELECT id, stage_id, stage_name, result, moves, time_seconds, 
                   score, combo_max, damage_dealt, mistakes, played_at
            FROM game_history 
            WHERE user_id = ? 
            ORDER BY played_at DESC 
            LIMIT ? OFFSET ?
        ''', (user_id, per_page, offset))
        
        history = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return {
            'history': history,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }
    
    def get_recent_games(self, user_id, limit=5):
        """Get recent games for a user"""
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT stage_name, result, score, moves, time_seconds, played_at
            FROM game_history 
            WHERE user_id = ? 
            ORDER BY played_at DESC 
            LIMIT ?
        ''', (user_id, limit))
        recent = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return recent
    
    def get_stage_progress(self, user_id):
        """Get stage progression for a user with best stats"""
        conn = self.db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT 
                stage_id, 
                stage_name, 
                MAX(score) as best_score, 
                MIN(time_seconds) as min_time,
                MIN(moves) as min_moves,
                MAX(played_at) as last_win
            FROM game_history 
            WHERE user_id = ? AND result = 'win'
            GROUP BY stage_id
            ORDER BY stage_id
        ''', (user_id,))
        progress = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return progress



class StatsModel:
    """Global statistics operations"""
    
    def __init__(self, db):
        self.db = db
    
    def get_global_stats(self):
        """Get global game statistics"""
        conn = self.db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) as total_users FROM users')
        total_users = cursor.fetchone()['total_users']
        
        cursor.execute('SELECT COUNT(*) as total_games FROM game_history')
        total_games = cursor.fetchone()['total_games']
        
        cursor.execute('SELECT SUM(score) as total_score FROM game_history')
        total_score = cursor.fetchone()['total_score'] or 0
        
        cursor.execute('SELECT AVG(combo_max) as avg_combo FROM game_history WHERE combo_max > 0')
        avg_combo = cursor.fetchone()['avg_combo'] or 0
        
        cursor.execute('SELECT AVG(score) as avg_score FROM game_history')
        avg_score = cursor.fetchone()['avg_score'] or 0
        
        conn.close()
        
        return {
            'total_users': total_users,
            'total_games': total_games,
            'total_score': total_score,
            'average_score': round(avg_score, 1),
            'average_combo': round(avg_combo, 1)
        }