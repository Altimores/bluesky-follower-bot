# Import the Flask application from app.py
from app import app

# This file is now used as an entry point for Gunicorn
# All the functionality has been moved to app.py

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
