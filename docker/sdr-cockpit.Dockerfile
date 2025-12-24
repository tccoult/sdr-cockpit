# Multi-stage build: Frontend + Backend in one container
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Backend with frontend assets
FROM python:3.11-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency files
COPY backend/pyproject.toml backend/uv.lock ./

# Install dependencies into virtual environment (frozen = use exact versions from lock file)
# This downloads and installs all dependencies at build time
RUN uv sync --frozen --no-dev

# Copy application code
COPY backend/app ./app

# Copy built frontend from stage 1
COPY --from=frontend-builder /frontend/dist ./static

# Set production log level
ENV LOG_LEVEL=INFO

# Add virtual environment to PATH so we can use installed packages directly
ENV PATH="/app/.venv/bin:$PATH"

# Expose port
EXPOSE 8000

# Run uvicorn directly from the virtual environment (no uv run)
# This avoids any runtime dependency downloads
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
