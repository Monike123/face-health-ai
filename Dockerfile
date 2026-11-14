# Minimal CPU image for API/CI-style runs (no CUDA).
FROM python:3.12-slim

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
COPY src ./src
COPY configs ./configs
COPY tests ./tests

RUN pip install --no-cache-dir -e ".[dev]"

CMD ["pytest", "-q"]
