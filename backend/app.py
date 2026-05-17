"""
FLIP & MATCH - Complete Backend Server
Unified API for Web, Mobile, and PWA
"""

from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import sqlite3
import os
from datetime import datetime
from config import config
from models import Database, UserModel, GameHistoryModel, StatsModel
from auth import hash_password, verify_password, validate_password_strength, validate_email, validate_username

# Initialize Flask app
app = Flask(__name__)

# Load configuration
env = os.environ.get('FLASK_ENV', 'development')
app.config.from_object(config[env])

# Initialize extensions
CORS(app, resources={r"/api/*": {"origins": "*"}})
jwt = JWTManager(app)

# Initialize database
db = Database(app.config['DATABASE'])
db.init_db()

# JWT Error Handlers
@jwt.unauthorized_loader
def unauthorized_response(callback):
    return jsonify({'error': 'Missing Authorization Header', 'success': False}), 401

@jwt.invalid_token_loader
def invalid_token_response(callback):
    return jsonify({'error': 'Invalid Token', 'success': False}), 422

@jwt.expired_token_loader
def expired_token_response(jwt_header, jwt_payload):
    return jsonify({'error': 'Token Expired', 'success': False}), 401


@app.route('/api/v1/ping', methods=['GET'])
def ping():
    return jsonify({'success': True, 'message': 'Backend is alive', 'time': datetime.now().isoformat()}), 200

# Initialize models
user_model = UserModel(db)

game_history_model = GameHistoryModel(db)
stats_model = StatsModel(db)

# ==================== HELPER FUNCTIONS ====================

def get_user_from_token():
    """Get current user from JWT token"""
    try:
        user_id = get_jwt_identity()
        return user_model.find_by_id(user_id)
    except:
        return None

# ==================== AUTHENTICATION ENDPOINTS ====================

@app.route('/api/v1/health', methods=['GET'])
def health_check():
    """API health check"""
    return jsonify({
        'status': 'online',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0',
        'environment': env
    }), 200

@app.route('/api/v1/auth/register', methods=['POST'])
def register():
    """
    Register a new user
    POST /api/v1/auth/register
    Body: { username, email, password }
    """
    data = request.get_json()
    
    # Validate required fields
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Username, email, and password are required'}), 400
    
    username = data['username'].strip()
    email = data['email'].strip().lower()
    password = data['password']
    
    # Validate username
    valid, msg = validate_username(username)
    if not valid:
        return jsonify({'error': msg}), 400
    
    # Validate email
    valid, msg = validate_email(email)
    if not valid:
        return jsonify({'error': msg}), 400
    
    # Validate password
    valid, msg = validate_password_strength(password)
    if not valid:
        return jsonify({'error': msg}), 400
    
    # Check if user exists
    existing_user = user_model.find_by_username_or_email(username)
    if existing_user:
        return jsonify({'error': 'Username already exists'}), 409
    
    existing_email = user_model.find_by_username_or_email(email)
    if existing_email:
        return jsonify({'error': 'Email already registered'}), 409
    
    # Create user
    password_hash = hash_password(password)
    user_id = user_model.create(username, email, password_hash)
    
    if user_id:
        print(f"\n[SUCCESS] New user registered locally: {username} (ID: {user_id})")
    
    if not user_id:
        return jsonify({'error': 'Failed to create user'}), 500
    
    # Generate token
    access_token = create_access_token(identity=str(user_id))
    
    return jsonify({
        'success': True,
        'message': 'User registered successfully',
        'user_id': user_id,
        'username': username,
        'email': email,
        'access_token': access_token
    }), 201

@app.route('/api/v1/auth/login', methods=['POST'])
def login():
    """
    Login user
    POST /api/v1/auth/login
    Body: { username/email, password }
    """
    data = request.get_json()
    
    if not data or (not data.get('username') and not data.get('email')) or not data.get('password'):
        return jsonify({'error': 'Username/email and password are required'}), 400
    
    identifier = data.get('username') or data.get('email')
    password = data['password']
    
    # Find user
    user = user_model.find_by_username_or_email(identifier)
    
    if not user or not verify_password(password, user['password_hash']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Update last login
    user_model.update_last_login(user['id'])
    
    # Generate token
    access_token = create_access_token(identity=str(user['id']))
    
    # Convert Row to dict to avoid 'sqlite3.Row' object has no attribute 'get'
    user_data = dict(user)
    
    return jsonify({
        'success': True,
        'message': 'Login successful',
        'user_id': user_data['id'],
        'username': user_data['username'],
        'email': user_data['email'],
        'access_token': access_token,
        'stats': {
            'total_score': user_data.get('total_score') or 0,
            'total_wins': user_data.get('total_wins') or 0,
            'total_games': user_data.get('total_games') or 0,
            'best_combo': user_data.get('best_combo') or 0,
            'highest_stage': user_data.get('highest_stage') or 1,
            'xp': user_data.get('xp', 0),
            'level': user_data.get('level', 1)
        }
    }), 200

@app.route('/api/v1/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user"""
    user = get_user_from_token()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'total_score': user['total_score'] or 0,
        'total_wins': user['total_wins'] or 0,
        'total_games': user['total_games'] or 0,
        'best_combo': user['best_combo'] or 0,
        'highest_stage': user['highest_stage'] or 1,
        'created_at': user['created_at']
    }), 200

@app.route('/api/v1/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user (client-side token removal)"""
    return jsonify({'message': 'Logged out successfully'}), 200

# ==================== DASHBOARD ENDPOINTS ====================

@app.route('/api/v1/dashboard/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Get user dashboard statistics"""
    user = get_user_from_token()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    # Convert Row to dict
    user_data = dict(user)
    
    # Get recent games
    recent_games = game_history_model.get_recent_games(user_data['id'], 5)
    
    # Get stage progress
    stage_progress = game_history_model.get_stage_progress(user_data['id'])
    
    # Calculate win rate
    total_games = int(user_data.get('total_games') or 0)
    total_wins = int(user_data.get('total_wins') or 0)
    win_rate = round((total_wins / total_games * 100), 1) if total_games > 0 else 0
    
    return jsonify({
        'stats': {
            'total_score': int(user_data.get('total_score') or 0),
            'total_wins': total_wins,
            'total_games': total_games,
            'win_rate': win_rate,
            'best_combo': int(user_data.get('best_combo') or 0),
            'highest_stage': int(user_data.get('highest_stage') or 1)
        },
        'recent_games': recent_games,
        'stage_progress': stage_progress
    }), 200

# ==================== GAME HISTORY ENDPOINTS ====================

@app.route('/api/v1/history', methods=['GET'])
@jwt_required()
def get_game_history():
    """Get paginated game history"""
    user = get_user_from_token()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    result = game_history_model.get_user_history(user['id'], page, per_page)
    
    return jsonify({
        'history': result['history'],
        'pagination': {
            'page': result['page'],
            'per_page': result['per_page'],
            'total': result['total'],
            'total_pages': result['total_pages']
        }
    }), 200

@app.route('/api/v1/history', methods=['POST'])
@jwt_required()
def save_game_history():
    """Save game result to history"""
    user = get_user_from_token()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    # Validate required fields
    required = ['stage_id', 'stage_name', 'result', 'moves', 'time_seconds', 'score']
    for field in required:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Validate result value
    if data['result'] not in ['win', 'lose']:
        return jsonify({'error': 'Result must be "win" or "lose"'}), 400
    
    # Save game
    game_id = game_history_model.save(user['id'], data)
    
    # Update user stats
    is_win = data['result'] == 'win'
    user_model.update_stats(
        user['id'], 
        data['score'], 
        is_win, 
        data.get('combo_max', 0), 
        data['stage_id']
    )
    
    return jsonify({
        'success': True,
        'message': 'Game saved successfully',
        'game_id': game_id
    }), 201

# ← BAGONG ENDPOINT: i-reset ang lahat ng history at stats
@app.route('/api/v1/history/reset', methods=['DELETE'])
@jwt_required()
def reset_history():
    """Reset all game history and stats for current user"""
    user = get_user_from_token()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    conn = db.get_connection()
    cursor = conn.cursor()

    # Delete all game history ng current user
    cursor.execute('DELETE FROM game_history WHERE user_id = ?', (user['id'],))

    # Reset user stats back to zero
    cursor.execute('''
        UPDATE users SET
            total_score = 0,
            total_wins = 0,
            total_games = 0,
            best_combo = 0,
            highest_stage = 1
        WHERE id = ?
    ''', (user['id'],))

    conn.commit()
    conn.close()

    return jsonify({'success': True, 'message': 'All history and stats reset'}), 200

@app.route('/api/v1/history/<int:game_id>', methods=['GET'])
@jwt_required()
def get_game_detail(game_id):
    """Get detailed game information"""
    user = get_user_from_token()

    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM game_history WHERE id = ? AND user_id = ?
    ''', (game_id, user['id']))
    game = cursor.fetchone()
    conn.close()
    
    if not game:
        return jsonify({'error': 'Game not found'}), 404
    
    return jsonify(dict(game)), 200

# ==================== USER PROFILE ENDPOINTS ====================

@app.route('/api/v1/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile"""
    user = get_user_from_token()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    updates = {}
    
    if data.get('username'):
        valid, msg = validate_username(data['username'])
        if not valid:
            return jsonify({'error': msg}), 400
        updates['username'] = data['username']
    
    if data.get('email'):
        valid, msg = validate_email(data['email'])
        if not valid:
            return jsonify({'error': msg}), 400
        updates['email'] = data['email'].lower()
    
    if updates:
        user_model.update_profile(user['id'], **updates)
    
    return jsonify({'message': 'Profile updated successfully'}), 200

@app.route('/api/v1/profile/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password"""
    user = get_user_from_token()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if not data.get('current_password') or not data.get('new_password'):
        return jsonify({'error': 'Current and new password are required'}), 400
    
    # Verify current password
    if not verify_password(data['current_password'], user['password_hash']):
        return jsonify({'error': 'Current password is incorrect'}), 401
    
    # Validate new password
    valid, msg = validate_password_strength(data['new_password'])
    if not valid:
        return jsonify({'error': msg}), 400
    
    # Update password
    new_hash = hash_password(data['new_password'])
    user_model.update_password(user['id'], new_hash)
    
    return jsonify({'message': 'Password changed successfully'}), 200

# ==================== SYNC ENDPOINT ====================

@app.route('/api/v1/sync', methods=['POST'])
@jwt_required()
def sync_data():
    """Sync local game data with server"""
    user = get_user_from_token()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    saved_count = 0
    
    if data.get('games') and isinstance(data['games'], list):
        for game in data['games']:
            if game.get('stage_id') and game.get('result'):
                try:
                    game_id = game_history_model.save(user['id'], {
                        'stage_id': game['stage_id'],
                        'stage_name': game.get('stage_name', f'Stage {game["stage_id"]}'),
                        'result': game['result'],
                        'moves': game.get('moves', 0),
                        'time_seconds': game.get('time_seconds', 0),
                        'score': game.get('score', 0),
                        'combo_max': game.get('combo_max', 0),
                        'damage_dealt': game.get('damage_dealt', 0),
                        'mistakes': game.get('mistakes', 0)
                    })
                    saved_count += 1
                except Exception as e:
                    print(f"Sync error: {e}")
                    continue
        
        # Recalculate user stats
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE users SET
                total_score = COALESCE((SELECT SUM(score) FROM game_history WHERE user_id = ?), 0),
                total_wins = COALESCE((SELECT COUNT(*) FROM game_history WHERE user_id = ? AND result = 'win'), 0),
                total_games = COALESCE((SELECT COUNT(*) FROM game_history WHERE user_id = ?), 0),
                best_combo = COALESCE((SELECT MAX(combo_max) FROM game_history WHERE user_id = ?), 0),
                highest_stage = COALESCE((SELECT MAX(stage_id) FROM game_history WHERE user_id = ? AND result = 'win'), 1)
            WHERE id = ?
        ''', (user['id'], user['id'], user['id'], user['id'], user['id'], user['id']))
        conn.commit()
        conn.close()
    
    return jsonify({
        'message': f'Synced {saved_count} games successfully',
        'synced_count': saved_count
    }), 200

# ==================== GLOBAL STATS ENDPOINT ====================

@app.route('/api/v1/stats/global', methods=['GET'])
def get_global_stats():
    """Get global game statistics"""
    stats = stats_model.get_global_stats()
    return jsonify(stats), 200

# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ==================== MAIN ====================

if __name__ == '__main__':
    print("=" * 60)
    print("FLIP & MATCH - Backend Server")
    print("=" * 60)
    print("\nAPI Endpoints:")
    print("   POST   /api/v1/auth/register          - Register new user")
    print("   POST   /api/v1/auth/login             - Login user")
    print("   GET    /api/v1/auth/me                - Get current user")
    print("   GET    /api/v1/dashboard/stats        - Dashboard statistics")
    print("   GET    /api/v1/history                - Game history")
    print("   POST   /api/v1/history                - Save game result")
    print("   DELETE /api/v1/history/reset          - Reset all history & stats")
    print("   PUT    /api/v1/profile                - Update profile")
    print("   POST   /api/v1/profile/change-password - Change password")
    print("   POST   /api/v1/sync                   - Sync local data")
    print("   GET    /api/v1/stats/global           - Global statistics")
    print("\n" + "=" * 60)
    print(f"Server running on http://localhost:5000")
    print(f"Environment: {env}")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=(env == 'development'))