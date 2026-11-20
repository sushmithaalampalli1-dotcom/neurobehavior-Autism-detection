# ==========================================
# Stage 1: Build React Frontend
# ==========================================
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Python Backend & Production Server
# ==========================================
FROM python:3.11-slim

# Install minimal OS dependencies for scientific libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend, models, and demo assets
COPY backend/ ./backend/
COPY training/ ./training/
COPY demo_samples/ ./demo_samples/
COPY data_config/ ./data_config/
COPY wsgi.py .
COPY run_server.py .
COPY .env.example .env

# Copy compiled frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Intercept and wrap gunicorn to guarantee literal '$PORT' is always resolved
RUN printf '#!/bin/sh\nexec python /app/run_server.py "$@"\n' > /usr/local/bin/gunicorn && chmod +x /usr/local/bin/gunicorn

# Production environment configuration
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Expose default ports for Render (10000), Hugging Face Spaces (7860), and local (5000)
EXPOSE 5000 7860 10000

# Start unified production server via run_server.py
CMD ["python", "run_server.py"]
