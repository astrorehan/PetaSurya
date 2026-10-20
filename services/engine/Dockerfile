FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv PATH="/opt/venv/bin:$PATH" \
    PETASURYA_CACHE_DIR=/var/lib/petasurya PETASURYA_PRELOAD_MODEL=1

RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir uv==0.9.4
WORKDIR /srv
COPY services/engine/pyproject.toml services/engine/uv.lock services/engine/
RUN uv sync --project services/engine --frozen --no-dev --no-install-project
COPY services/engine/app services/engine/app
COPY services/engine/scripts/unduh_model_vision.py services/engine/scripts/unduh_model_vision.py
COPY services/engine/models/mobilesam.json services/engine/models/mobilesam.json
COPY data/fixtures data/fixtures
COPY data/sources data/sources
WORKDIR /srv/services/engine
RUN python -m scripts.unduh_model_vision \
    && useradd --uid 10001 --create-home petasurya \
    && mkdir -p /var/lib/petasurya && chown petasurya:petasurya /var/lib/petasurya
USER petasurya
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "from urllib.request import urlopen; urlopen('http://127.0.0.1:8000/api/v1/ready', timeout=8)"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--limit-concurrency", "16", "--timeout-keep-alive", "5", "--no-server-header"]
