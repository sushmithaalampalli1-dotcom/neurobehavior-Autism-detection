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
COPY wsgi.py .
COPY .env.example .env

# Copy compiled frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Production environment configuration
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Expose default ports for Render (10000), Hugging Face Spaces (7860), and local (5000)
EXPOSE 5000 7860 10000

# Start unified production server (1 worker with 4 threads for low-memory footprint <250MB, compatible with Render free tier 512MB and HF Spaces 16GB)
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-7860} --workers 1 --threads 4 --timeout 180 --worker-class gthread wsgi:app"]
