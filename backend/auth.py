"""
Authentication utilities for Flip & Match
"""

import bcrypt
import hashlib
import secrets
from datetime import datetime, timedelta

def hash_password(password):
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password, password_hash):
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def generate_token_hash(token):
    """Generate a hash of the token for storage"""
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

def validate_password_strength(password):
    """Validate password strength"""
    if len(password) < 4:
        return False, "Password must be at least 4 characters long"
    return True, "Password is valid"

def validate_email(email):
    """Validate email format"""
    if '@' not in email or '.' not in email:
        return False, "Invalid email format"
    return True, "Email is valid"

def validate_username(username):
    """Validate username format"""
    if len(username) < 3:
        return False, "Username must be at least 3 characters"
    if len(username) > 30:
        return False, "Username must be less than 30 characters"
    if not username.replace('_', '').isalnum():
        return False, "Username can only contain letters, numbers, and underscores"
    return True, "Username is valid"