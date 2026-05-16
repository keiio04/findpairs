"""
Configuration for Flip & Match Backend
"""

import os
from datetime import timedelta

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'flipmatch-super-secret-key-change-in-production-2024')
    JWT_SECRET_KEY = 'flipmatch-jwt-secret-key-2024-secure-long-key-32bytes-v2-forced'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    DATABASE = os.path.join(os.path.dirname(__file__), 'database.db')
    
class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False
    
class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
# Select configuration based on environment
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}