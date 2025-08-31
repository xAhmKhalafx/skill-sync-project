# Python slim image
FROM python:3.11-slim

# system deps for tesseract and fonts (optional: basic OCR support)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . /app

# Default to port 8080 for App Runner
ENV PORT=8080
EXPOSE 8080

# Gunicorn command (Flask app named "app" in app.py)
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:8080", "app:app"]
