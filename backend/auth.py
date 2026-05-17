"""
Authentication utilities for Flip & Match
"""

import bcrypt
import hashlib
import secrets
import os
import base64
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# Generate or load encryption key
# In production, this should be an environment variable
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY')
if not ENCRYPTION_KEY:
    # Fallback for development (in production, use a persistent key!)
    ENCRYPTION_KEY = base64.urlsafe_b64encode(hashlib.sha256(b"flipmatch-secret-salt").digest()).decode()

cipher_suite = Fernet(ENCRYPTION_KEY.encode())

def encrypt_data(data):
    """Encrypt data using AES-256 (Fernet)"""
    if not data:
        return data
    return cipher_suite.encrypt(data.encode()).decode()

def decrypt_data(encrypted_data):
    """Decrypt data using AES-256 (Fernet)"""
    if not encrypted_data:
        return encrypted_data
    try:
        # Check if it's already encrypted (Fernet tokens usually start with gAAAA)
        if isinstance(encrypted_data, str) and encrypted_data.startswith('gAAAA'):
            return cipher_suite.decrypt(encrypted_data.encode()).decode()
        return encrypted_data # Return as is if not encrypted
    except Exception:
        return encrypted_data

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