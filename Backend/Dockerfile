# Use an official Python runtime as a parent image
FROM python:3.11-slim-bullseye

# Set environment varibles
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential gdal-bin libgdal-dev

# Set GDAL configurations
ENV GDAL_CONFIG=/usr/bin/gdal-config

# Install poetry
# RUN pip install "poetry==1.1.8"
RUN pip install poetry

# Set work directory
WORKDIR /app

# Copy only requirements to cache them in docker layer
COPY pyproject.toml poetry.lock /app/

# Project initialization:
RUN poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi

# Copy project
COPY . /app/

# Expose port
EXPOSE 8000

# Set the entrypoint
ENTRYPOINT ["poetry", "run"]

# Set the default command to start the app
CMD ["python", "main.py"]

# # Stage 1: Build Environment
# FROM python:3.11-slim-bullseye AS builder

# # Set environment variables
# ENV PYTHONDONTWRITEBYTECODE 1
# ENV PYTHONUNBUFFERED 1

# # Install system dependencies
# RUN apt-get update && apt-get install -y build-essential gdal-bin libgdal-dev

# # Set GDAL configurations
# ENV GDAL_CONFIG=/usr/bin/gdal-config

# # Install Poetry
# RUN pip install poetry

# # Set work directory
# WORKDIR /app

# # Copy only requirements to cache them in docker layer
# COPY pyproject.toml poetry.lock /app/

# # Project initialization
# RUN poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi

# # Stage 2: Runtime Environment
# FROM python:3.11-slim-bullseye AS runtime

# # Set environment variables
# ENV PYTHONDONTWRITEBYTECODE 1
# ENV PYTHONUNBUFFERED 1

# # Install system dependencies (including GDAL)
# RUN apt-get update && apt-get install -y gdal-bin libgdal-dev

# # Set GDAL configurations
# ENV GDAL_CONFIG=/usr/bin/gdal-config

# # Set work directory
# WORKDIR /app

# # Copy the installed packages from the builder stage
# COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# # Copy project files (excluding dependencies)
# COPY . /app/

# # Expose port
# EXPOSE 8000

# # Set the entrypoint to use uvicorn directly
# ENTRYPOINT ["python", "main.py"]