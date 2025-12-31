# Nginx Sentinel API (WAF GUI)

A Web Application Firewall (WAF) GUI and API management system built with Python (FastAPI) to monitor and control Nginx security rules.

## Features

- **Real-time Statistics**: Analyze logs for threat detection.
- **Rule Management**: Add/Remove WAF rules (e.g., blocking IPs).
- **System Control**: Restart Nginx server via API.
- **Health Monitoring**: Check system status.

## Tech Stack

- **Backend**: Python 3.x, FastAPI, Uvicorn
- **Frontend**: Node.js (In development)
- **Database/Storage**: (To be defined/implied from usage)

## Prerequisites

- Python 3.8+
- Node.js & npm (for frontend)
- Nginx (for system integration)

## Installation & Running

### Backend

1.  Navigate to the backend directory:

    ```bash
    cd backend
    ```

2.  Create a virtual environment (optional but recommended):

    ```bash
    python -m venv venv
    # Windows
    venv\Scripts\activate
    # Linux/Mac
    source venv/bin/activate
    ```

3.  Install dependencies:

    ```bash
    pip install -r requirements.txt
    ```

4.  Run the application:
    ```bash
    python app/main.py
    ```
    The API will be available at `http://localhost:8000`.
    Swagger documentation: `http://localhost:8000/docs`.

### Frontend

1.  Navigate to the frontend directory:

    ```bash
    cd frontend
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Run the frontend (Check `package.json` for specific scripts, currently in initial setup):
    ```bash
    npm start
    # or
    npm run dev
    ```

## API Endpoints

- `GET /api/health`: Check system status.
- `GET /api/stats`: Get log analysis statistics.
- `POST /api/waf/rule`: Add a new WAF rule (Block IP).
- `POST /api/system/restart`: Restart Nginx service.

## Security Note

Ensure this application is secured or run within a private network, as it has administrative privileges to restart services and modify firewall rules.
