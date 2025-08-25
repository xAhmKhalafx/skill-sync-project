FROM python:3.11-slim

# System dependencies for OCR & image libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# App Runner uses 8080 by default
ENV PORT=8080
ENV TESSERACT_CMD=/usr/bin/tesseract
EXPOSE 8080

# Gunicorn entrypoint
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app", "--workers", "2", "--timeout", "120", "--preload"]
