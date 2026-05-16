    /* ══════════════════════════════════════════════════════════
    API.js - FLIP & MATCH Backend Integration
    Unified API Client for Web and Mobile
    ══════════════════════════════════════════════════════════ */

    const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:5000/api/v1'
        : 'https://findpairss.onrender.com/api/v1';

    class FlipMatchAPI {
        constructor() {
            this.token = localStorage.getItem('flipmatch_token');
            this.currentUser = null;
            if (this.token) {
                this.loadUserFromStorage();
            }
        }

        loadUserFromStorage() {
            const user = localStorage.getItem('flipmatch_user');
            if (user) {
                this.currentUser = JSON.parse(user);
            }
        }

        async register(username, email, password) {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Just return success without auto-logging in
                    return { success: true, message: data.message };
                }

                return { success: false, error: data.error || 'Registration failed' };
            } catch (error) {
                return { success: false, error: 'Cannot connect to server. Make sure backend is running on port 5000' };
            }
        }

        async login(identifier, password) {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: identifier, email: identifier, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    this.token = data.access_token;
                    this.currentUser = {
                        id: data.user_id,
                        username: data.username,
                        email: data.email
                    };
                    localStorage.setItem('flipmatch_token', this.token);
                    localStorage.setItem('flipmatch_user', JSON.stringify(this.currentUser));
                    return { success: true, user: this.currentUser, message: data.message };
                }

                return { success: false, error: data.error || 'Invalid credentials' };
            } catch (error) {
                return { success: false, error: 'Cannot connect to server. Make sure backend is running on port 5000' };
            }
        }

        logout() {
            this.token = null;
            this.currentUser = null;
            localStorage.removeItem('flipmatch_token');
            localStorage.removeItem('flipmatch_user');
            localStorage.removeItem('flipmatch_progress');
            localStorage.removeItem('flipmatch_stats');
            localStorage.removeItem('flipmatch_inventory');
            localStorage.removeItem('pending_game_sync');

            // Also try to notify server (optional)
            fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` }
            }).catch(() => { });
        }

        isAuthenticated() {
            return !!this.token;
        }

        getCurrentUser() {
            return this.currentUser;
        }

        getAuthHeaders() {
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            };
        }

        async saveGameResult(gameData) {
            if (!this.token) {
                // Store locally if not logged in
                let pendingGames = JSON.parse(localStorage.getItem('pending_game_sync') || '[]');
                pendingGames.push(gameData);
                localStorage.setItem('pending_game_sync', JSON.stringify(pendingGames));
                return { success: false, error: 'Not logged in - saved locally' };
            }

            try {
                const response = await fetch(`${API_BASE_URL}/history`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(gameData)
                });
                const data = await response.json();
                return response.ok ? { success: true, message: data.message } : { success: false, error: data.error };
            } catch (error) {
                // Store locally if network fails
                let pendingGames = JSON.parse(localStorage.getItem('pending_game_sync') || '[]');
                pendingGames.push(gameData);
                localStorage.setItem('pending_game_sync', JSON.stringify(pendingGames));
                return { success: false, error: 'Network error - saved locally' };
            }
        }



        async getGameHistory(page = 1) {
            if (!this.token) return { success: false, history: [] };

            try {
                const response = await fetch(`${API_BASE_URL}/history?page=${page}&per_page=20`, {
                    headers: this.getAuthHeaders()
                });
                const data = await response.json();
                return response.ok ? { success: true, history: data.history, pagination: data.pagination } : { success: false };
            } catch (error) {
                return { success: false, history: [], error: 'Network error' };
            }
        }

        async getDashboardStats() {
            if (!this.token) return { success: false };

            try {
                const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
                    headers: this.getAuthHeaders()
                });
                const data = await response.json();
                return response.ok ? { success: true, data: data } : { success: false };
            } catch (error) {
                return { success: false, error: 'Network error' };
            }
        }

        async syncPendingGames() {
            const pendingGames = JSON.parse(localStorage.getItem('pending_game_sync') || '[]');
            if (pendingGames.length === 0 || !this.token) return { success: false };

            try {
                const response = await fetch(`${API_BASE_URL}/sync`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({ games: pendingGames })
                });
                const data = await response.json();

                if (response.ok) {
                    localStorage.removeItem('pending_game_sync');
                    return { success: true, syncedCount: data.synced_count };
                }
                return { success: false };
            } catch (error) {
                return { success: false };
            }
        }

        async getGlobalStats() {
            try {
                const response = await fetch(`${API_BASE_URL}/stats/global`);
                const data = await response.json();
                return response.ok ? { success: true, stats: data } : { success: false };
            } catch (error) {
                return { success: false };
            }
        }

        async updateProfile(updates) {
            if (!this.token) return { success: false, error: 'Not logged in' };

            try {
                const response = await fetch(`${API_BASE_URL}/profile`, {
                    method: 'PUT',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(updates)
                });
                const data = await response.json();
                return response.ok ? { success: true, message: data.message } : { success: false, error: data.error };
            } catch (error) {
                return { success: false, error: 'Network error' };
            }
        }

        async changePassword(currentPassword, newPassword) {
            if (!this.token) return { success: false, error: 'Not logged in' };

            try {
                const response = await fetch(`${API_BASE_URL}/profile/change-password`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
                });
                const data = await response.json();
                return response.ok ? { success: true, message: data.message } : { success: false, error: data.error };
            } catch (error) {
                return { success: false, error: 'Network error' };
            }
        }
    }

    // Create global instance
    const gameAPI = new FlipMatchAPI();

    // Auto-sync pending games on login
    window.addEventListener('load', () => {
        if (gameAPI.isAuthenticated()) {
            gameAPI.syncPendingGames();
        }
    });