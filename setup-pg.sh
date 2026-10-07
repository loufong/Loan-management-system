#!/bin/bash
set -e

# Start postgresql
service postgresql start || true

# Set password and create database
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" || true
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'loansystem_db'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE loansystem_db OWNER postgres;"

# Configure postgresql.conf to listen on all interfaces
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/16/main/postgresql.conf || true
sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/16/main/postgresql.conf || true

# Ensure local and remote connections are trusted/accepted
if ! grep -q "0.0.0.0/0 md5" /etc/postgresql/16/main/pg_hba.conf; then
  echo 'host all all 0.0.0.0/0 md5' >> /etc/postgresql/16/main/pg_hba.conf
  echo 'host all all ::/0 md5' >> /etc/postgresql/16/main/pg_hba.conf
  echo 'host all all 127.0.0.1/32 trust' >> /etc/postgresql/16/main/pg_hba.conf
  echo 'host all all ::1/128 trust' >> /etc/postgresql/16/main/pg_hba.conf
fi

service postgresql restart
service postgresql status
echo "POSTGRESQL_SETUP_COMPLETE"
