FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends git curl \
    && rm -rf /var/lib/apt/lists/*

# Copy both requirements files before any source so layer caching works
COPY requirements.txt /app/requirements.txt
COPY ui/backend/requirements.txt /app/ui_requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt -r /app/ui_requirements.txt

# Copy full source
COPY . .

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

EXPOSE 7331

CMD ["python", "ui/backend/app.py"]
