# Simulator Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency files
COPY simulator/pyproject.toml simulator/uv.lock ./

# Install dependencies (frozen = use exact versions from lock file)
RUN uv sync --frozen --no-dev

# Copy application code
COPY simulator/app ./app

# Set production log level
ENV LOG_LEVEL=INFO

# Run the simulator using uv
CMD ["uv", "run", "python", "-m", "app.main"]
