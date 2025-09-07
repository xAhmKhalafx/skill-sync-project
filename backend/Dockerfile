FROM python:3.11-slim

# OS deps you actually need
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr libgl1 poppler-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn

# App code
COPY . /app

# App Runner provides PORT
ENV PYTHONUNBUFFERED=1

# Start exactly this app (file: app.py, object: app)
CMD gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --timeout 120 --log-level info
