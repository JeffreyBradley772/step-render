FROM python:3.12-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY ./app ./app

# Create non-root user
RUN addgroup --system --gid 1001 devgroup && \
    adduser --system --uid 1001 --ingroup devgroup devuser

# Change ownership of app files
RUN chown -R devuser:devgroup /app

# Switch to non-root user
USER devuser

# Expose port
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]