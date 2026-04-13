#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt
pip install gunicorn whitenoise

# Run Django migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --no-input
