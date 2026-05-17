
1. Open VS Code.
2. Open Terminal 1: `cd backend` then `python app.py` (Runs on port 5000)
3. Open Terminal 2: `python -m http.server 8080` (Runs on port 8080)
4. Open Browser: `http://localhost:8080`

## 2. Key Demo Features (The "Showstoppers")
*   **Push Notification:** Use F12 -> Application -> Service Workers -> Push.
*   **Offline Mode:** In DevTools Network tab, check "Offline". Refresh the page. The game will still load (PWA magic!).
*   **Encryption Check:** Run `python backend/organize_db.py`. It shows the panel that sensitive data is encrypted in the database.

## 3. High-Level Flow (How to explain the game)
1.  **SIA (System Integration):** One backend (Flask) serving both Web and Mobile. Centralized SQLite database.
2.  **Security:** 
    *   Passwords: **Bcrypt** hashed.
    *   Data Persistence: **AES-256 (Fernet)** encryption for settings.
    *   Session: **JWT** (JSON Web Tokens).
3.  **Mobile (ITST 304):** 
    *   **PWA:** Service Worker handles caching.
    *   **Manifest:** Standalone app installation.
    *   **Push:** Firebase integration for background alerts.

## 4. Possible "Hard" Questions & Answers
*   **Q: Bakit SQLite ang gamit?** 
    *   *A: Light-weight at portable, perfect para sa mobile-focused applications na kailangan ng mabilis na disk I/O.*
*   **Q: Paano naging secure ang mobile sync?** 
    *   *A: Lahat ng communication ay dumadaan sa JWT-protected endpoints, at ang data ay naka-encrypt bago i-save.*
*   **Q: Ano ang purpose ng Service Worker?** 
    *   *A: Ito ang "middleman" na nag-ha-handle ng offline caching at push notifications kahit sarado ang app.*
