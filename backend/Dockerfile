# Use the official lightweight Python image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

ENV PYTHONPATH="/app"

# Install dependencies
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copy entire project
COPY . .

# Expose port (must match your uvicorn port)
EXPOSE 10000

# Run the app with uvicorn
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "10000"]