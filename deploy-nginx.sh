#!/bin/bash

# SkyTeam Nginx Deployment Script
# This script deploys the SkyTeam game to nginx

set -e

echo "🚀 Deploying SkyTeam to Nginx..."

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "❌ Nginx is not installed. Please install nginx first."
    exit 1
fi

# Copy nginx configuration
echo "📝 Copying nginx configuration..."
sudo cp /home/adminLegacy/www/SkyTeam/skyteam.nginx.conf /etc/nginx/sites-available/skyteam

# Enable the site
echo "🔗 Enabling site..."
sudo ln -sf /etc/nginx/sites-available/skyteam /etc/nginx/sites-enabled/skyteam

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
sudo nginx -t

# Reload nginx
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx

echo "✅ Deployment complete!"
echo ""
echo "Your SkyTeam game is now available at:"
echo "  http://localhost"
echo "  http://skyteam.local (if you add it to /etc/hosts)"
echo ""
echo "To add skyteam.local to your hosts file, run:"
echo "  echo '127.0.0.1 skyteam.local' | sudo tee -a /etc/hosts"
