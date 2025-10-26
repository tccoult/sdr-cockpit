# Simulator Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY simulator/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY simulator/app ./app

# Run the simulator
CMD ["python", "-m", "app.main"]
