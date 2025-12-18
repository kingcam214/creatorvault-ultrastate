#!/bin/bash
# Using local PostgreSQL for Christmas launch
# Install PostgreSQL locally
sudo apt-get update -qq && sudo apt-get install -y postgresql postgresql-contrib -qq

# Start PostgreSQL
sudo service postgresql start

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE creatorvault;" 2>/dev/null || echo "Database may already exist"
sudo -u postgres psql -c "CREATE USER cvuser WITH PASSWORD 'christmas2024';" 2>/dev/null || echo "User may already exist"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE creatorvault TO cvuser;"
sudo -u postgres psql -d creatorvault -c "GRANT ALL ON SCHEMA public TO cvuser;"

echo "PostgreSQL ready"
echo "DATABASE_URL=postgresql://cvuser:christmas2024@localhost:5432/creatorvault"
