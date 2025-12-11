#!/bin/sh

# Ensure data directory exists
mkdir -p /app/data

# Set permissions for data directory and its contents
chown -R nextjs:nodejs /app/data

# Switch to nextjs user and start the application
exec su -c "node server.js" nextjs