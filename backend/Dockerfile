FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (none currently needed for these pure python libs, 
# but good to have apt-get update if we add some later)
# RUN apt-get update && apt-get install -y --no-install-recommends gcc python3-dev \
#     && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Render (and others) often inject the PORT env var.
# We set a default of 8000 if not present.
ENV PORT=8000
EXPOSE ${PORT}

# Run the application
# We use shell form to ensure environment variables like $PORT are expanded correctly
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
