# Flip & Match: API Documentation (v1)

This document provides technical specifications for the centralized Python Core Service.

## Base URL
*   **Local Development:** `http://localhost:5000/api/v1`
*   **Production:** `https://findpairss.onrender.com/api/v1`

---

## 1. Authentication Endpoints

### Register User
*   **Endpoint:** `POST /auth/register`
*   **Description:** Creates a new user account.
*   **Request Body:**
    ```json
    {
      "username": "warrior123",
      "email": "warrior@gmail.com",
      "password": "securepassword"
    }
    ```
*   **Success Response (201):**
    ```json
    { "message": "User created successfully", "user_id": 9 }
    ```

### Login User
*   **Endpoint:** `POST /auth/login`
*   **Description:** Authenticates user and returns a JWT token.
*   **Request Body:**
    ```json
    {
      "identifier": "warrior123",
      "password": "securepassword"
    }
    ```
*   **Success Response (200):**
    ```json
    { "access_token": "eyJhbGciOiJIUzI1Ni..." }
    ```

---

## 2. Dashboard & Statistics

### Get Dashboard Stats
*   **Endpoint:** `GET /dashboard/stats`
*   **Security:** Requires Bearer Token
*   **Success Response (200):**
    ```json
    {
      "stats": {
        "total_score": 1500,
        "total_wins": 10,
        "win_rate": 85.5,
        "highest_stage": 5
      },
      "recent_games": [...]
    }
    ```

### Get Global Stats (Leaderboard Logic)
*   **Endpoint:** `GET /stats/global`
*   **Description:** Returns aggregated performance metrics across all players.
*   **Success Response (200):**
    ```json
    {
      "overview": { "total_users": 15, "total_games_played": 120 },
      "performance": { "avg_score": 450, "global_win_rate": 62.4 }
    }
    ```

---

## 3. Game History

### Save Game Result
*   **Endpoint:** `POST /history`
*   **Security:** Requires Bearer Token
*   **Request Body:**
    ```json
    {
      "stage_id": 2,
      "result": "win",
      "score": 450,
      "moves": 24,
      "time_seconds": 45
    }
    ```
*   **Success Response (201):**
    ```json
    { "message": "Result saved", "id": 105 }
    ```

### Reset History
*   **Endpoint:** `DELETE /history/reset`
*   **Description:** Clears all match history and resets stats for the current user.
*   **Success Response (200):**
    ```json
    { "message": "History and stats cleared successfully" }
    ```

---

## 4. Security Implementation Details

| Feature | Method | Purpose |
| :--- | :--- | :--- |
| **Authentication** | JWT (JSON Web Tokens) | Stateless session management. |
| **Password Security** | Bcrypt (Rounds: 12) | Protection against Brute Force. |
| **Data at Rest** | AES-256 (Fernet) | Encrypts `settings` column in DB. |
| **CORS** | Flask-CORS | Prevents unauthorized cross-origin requests. |
