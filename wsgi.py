"""Production WSGI entrypoint for NeuroBehavior-ASD.
Can be executed by Gunicorn, Waitress, or directly via Python.
"""
import os
from backend.app import create_app

# Default to production environment
env_name = os.getenv("FLASK_ENV", "production")
app = create_app(env_name)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"[*] Serving NeuroBehavior-ASD Unified Production App on http://{host}:{port}")
    app.run(host=host, port=port)
