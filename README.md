# ⛧ FLIP & MATCH: Horror Battle Memory ⛧

A Filipino Horror-themed memory battle game built as a Progressive Web App (PWA). Test your memory, survive the darkness, and defeat the creatures of Philippine folklore!

---

## 💀 Features
- **Turn-based Combat**: Match pairs of cards to damage the enemy or heal yourself.
- **Folklore Bestiary**: Face off against 5 stages of terror (Aswang, Tiyanak, and more).
- **Survival Mechanics**: Manage your HP, build combos, and earn XP to level up.
- **PWA Ready**: Installable on mobile and desktop with offline support.
- **Secure Backend**: Full authentication system with JWT and encrypted data persistence.
- **Match History**: Track your past battles and achievements.

---

## 🛠️ Technology Stack
- **Frontend**: Vanilla HTML5, CSS3 (Modern Aesthetic), JavaScript (ES6+).
- **Backend**: Python (Flask API).
- **Security**: Bcrypt hashing, AES-256 (Fernet) Encryption, JWT (JSON Web Tokens).
- **Mobile/PWA**: Service Workers, Web Manifest, Firebase Push Notifications.
- **Database**: SQLite.

---

## 🚀 How to Run (Setup Guide)

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd findpairs-main
```

### 2. Setup the Backend (Python)
Ensure you have Python 3.x installed.
```bash
# It is recommended to use a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run the Flask server
python backend/app.py
```
*The backend will run on `http://127.0.0.1:5000`*

### 3. Setup the Frontend
Since this is a PWA and uses API calls, it must be served through a local server.
- **Option A (Python)**:
  Open a new terminal in the root directory and run:
  ```bash
  python -m http.server 8080
  ```
- **Option B (VS Code)**: Use the **Live Server** extension.

*The game will be accessible at `http://localhost:8080`*
