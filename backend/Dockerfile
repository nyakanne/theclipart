FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_TRUSTED_HOST="pypi.org files.pythonhosted.org pypi.python.org"

WORKDIR /app

COPY requirements.txt .
# All deps ship as binary wheels — no system compiler needed.
# Playwright browser download skipped; scan workers handle it separately.
RUN pip install --upgrade pip \
        --trusted-host pypi.org \
        --trusted-host files.pythonhosted.org \
        --trusted-host pypi.python.org && \
    grep -v '^playwright' requirements.txt > /tmp/req.txt && \
    pip install -r /tmp/req.txt \
        --trusted-host pypi.org \
        --trusted-host files.pythonhosted.org \
        --trusted-host pypi.python.org

COPY . .

EXPOSE 8000

CMD ["ddtrace-run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
