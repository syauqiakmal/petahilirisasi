# Use an official Python runtime as a parent image
FROM python:3.11-slim-bullseye

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential gdal-bin libgdal-dev

RUN apt-get update && apt-get install -y wget gnupg
RUN echo "deb http://apt.postgresql.org/pub/repos/apt/ bullseye-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

RUN apt-get update && apt-get install -y \
    postgresql-15 \
    postgresql-15-postgis-3 \
    postgresql-15-postgis-3-scripts

# Set GDAL configurations
ENV GDAL_CONFIG=/usr/bin/gdal-config

# Set work directory
WORKDIR /app

# Copy only requirements to cache them in docker layer
COPY requirements.txt /app/

# Install dependencies using pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the project files
COPY . /app/

# Expose port
EXPOSE 8000

# Set the default command to start the app
CMD ["python", "main.py"]
