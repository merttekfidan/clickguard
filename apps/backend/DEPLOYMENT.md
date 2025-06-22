# ClickGuard Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Database Setup](#database-setup)
5. [Message Queue Setup](#message-queue-setup)
6. [Application Deployment](#application-deployment)
7. [SSL/TLS Configuration](#ssltls-configuration)
8. [Load Balancing](#load-balancing)
9. [Monitoring & Logging](#monitoring--logging)
10. [Backup & Recovery](#backup--recovery)
11. [Security Hardening](#security-hardening)
12. [Troubleshooting](#troubleshooting)

## Overview

This guide covers the deployment of ClickGuard backend in production environments. The system consists of:
- Node.js application server
- PostgreSQL database
- RabbitMQ message queue
- Redis (optional, for caching)
- WebSocket server for real-time communication

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Amazon Linux 2
- **CPU**: 2+ cores (4+ recommended)
- **RAM**: 4GB+ (8GB+ recommended)
- **Storage**: 50GB+ SSD
- **Network**: Stable internet connection

### Software Requirements
- Node.js 18.x or higher
- PostgreSQL 12.x or higher
- RabbitMQ 3.8.x or higher
- Redis 6.x or higher (optional)
- Nginx (for reverse proxy)
- PM2 (for process management)

### External Services
- Google Cloud Platform account (for Google Ads API)
- IP Quality Score account (for IP reputation)
- SSL certificate (Let's Encrypt or commercial)

## Environment Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install RabbitMQ
sudo apt install rabbitmq-server -y

# Install Redis (optional)
sudo apt install redis-server -y

# Install Nginx
sudo apt install nginx -y

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Create Application User

```bash
# Create application user
sudo useradd -m -s /bin/bash clickguard
sudo usermod -aG sudo clickguard

# Switch to application user
sudo su - clickguard
```

### 3. Clone Application

```bash
# Clone repository
git clone <repository-url> /home/clickguard/clickguard-backend
cd /home/clickguard/clickguard-backend

# Install dependencies
npm ci --only=production
```

## Database Setup

### 1. PostgreSQL Configuration

```bash
# Switch to postgres user
sudo su - postgres

# Create database and user
createdb clickguard
psql -c "CREATE USER clickguard_user WITH PASSWORD 'secure_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE clickguard TO clickguard_user;"
psql -c "ALTER USER clickguard_user CREATEDB;"

# Exit postgres user
exit
```

### 2. Database Optimization

Edit `/etc/postgresql/12/main/postgresql.conf`:

```conf
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection settings
max_connections = 100
max_worker_processes = 8
max_parallel_workers_per_gather = 4

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = -1
log_autovacuum_min_duration = 0
log_error_verbosity = verbose
```

### 3. Database Security

Edit `/etc/postgresql/12/main/pg_hba.conf`:

```conf
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
local   all             clickguard_user                         md5
host    clickguard      clickguard_user 127.0.0.1/32           md5
host    clickguard      clickguard_user ::1/128                 md5
```

### 4. Restart PostgreSQL

```bash
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

## Message Queue Setup

### 1. RabbitMQ Configuration

```bash
# Enable management plugin
sudo rabbitmq-plugins enable rabbitmq_management

# Create admin user
sudo rabbitmqctl add_user admin secure_admin_password
sudo rabbitmqctl set_user_tags admin administrator
sudo rabbitmqctl set_permissions -p / admin ".*" ".*" ".*"

# Create application user
sudo rabbitmqctl add_user clickguard clickguard_password
sudo rabbitmqctl set_permissions -p / clickguard ".*" ".*" ".*"

# Restart RabbitMQ
sudo systemctl restart rabbitmq-server
sudo systemctl enable rabbitmq-server
```

### 2. RabbitMQ Optimization

Edit `/etc/rabbitmq/rabbitmq.conf`:

```conf
# Memory and disk settings
vm_memory_high_watermark.relative = 0.6
disk_free_limit.relative = 2.0

# Connection settings
tcp_listen_options.backlog = 128
tcp_listen_options.nodelay = true
tcp_listen_options.exit_on_close = false

# Logging
log.file.level = info
log.console = true
log.console.level = info

# Management
management.tcp.port = 15672
management.tcp.ip = 0.0.0.0
```

## Application Deployment

### 1. Environment Configuration

Create production environment file:

```bash
# Create .env file
cat > /home/clickguard/clickguard-backend/.env << EOF
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://clickguard_user:secure_password@localhost:5432/clickguard

# Authentication
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here_minimum_32_characters

# Google OAuth & API
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token

# Queue
RABBITMQ_URL=amqp://clickguard:clickguard_password@localhost:5672

# External Services
IP_REPUTATION_API_KEY=your_ipqualityscore_key

# Security
ENCRYPTION_KEY=your_32_character_encryption_key_here

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.com
EOF
```

### 2. PM2 Configuration

Create PM2 ecosystem file:

```bash
cat > /home/clickguard/clickguard-backend/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'clickguard-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
```

### 3. Create Log Directory

```bash
mkdir -p /home/clickguard/clickguard-backend/logs
```

### 4. Start Application

```bash
cd /home/clickguard/clickguard-backend

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

## SSL/TLS Configuration

### 1. Let's Encrypt Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 2. Nginx Configuration

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/clickguard
```

```nginx
upstream clickguard_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=tracking:10m rate=100r/s;

    # API Routes
    location /api/v1/track {
        limit_req zone=tracking burst=20 nodelay;
        proxy_pass http://clickguard_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 30s;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
    }

    # Dashboard Routes
    location /api/v1/dashboard {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://clickguard_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 30s;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
    }

    # WebSocket Support
    location /socket.io/ {
        proxy_pass http://clickguard_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Health Check
    location /health {
        proxy_pass http://clickguard_backend;
        access_log off;
    }

    # Static Files (if any)
    location /static/ {
        alias /home/clickguard/clickguard-backend/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/clickguard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Load Balancing

### 1. Multiple Application Instances

For high availability, deploy multiple application instances:

```bash
# On each server, update PM2 configuration
cat > /home/clickguard/clickguard-backend/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'clickguard-backend',
    script: 'server.js',
    instances: 2, // Adjust based on CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
```

### 2. Load Balancer Configuration

Update Nginx upstream configuration:

```nginx
upstream clickguard_backend {
    server 192.168.1.10:3000 weight=1 max_fails=3 fail_timeout=30s;
    server 192.168.1.11:3000 weight=1 max_fails=3 fail_timeout=30s;
    server 192.168.1.12:3000 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

## Monitoring & Logging

### 1. PM2 Monitoring

```bash
# Monitor application
pm2 monit

# View logs
pm2 logs clickguard-backend

# Monitor system resources
pm2 status
```

### 2. System Monitoring

Install monitoring tools:

```bash
# Install htop for system monitoring
sudo apt install htop -y

# Install netdata for real-time monitoring
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

### 3. Log Rotation

Configure log rotation:

```bash
sudo nano /etc/logrotate.d/clickguard
```

```
/home/clickguard/clickguard-backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 clickguard clickguard
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 4. Application Monitoring

Create a monitoring script:

```bash
cat > /home/clickguard/monitor.sh << 'EOF'
#!/bin/bash

# Check if application is running
if ! pm2 list | grep -q "clickguard-backend.*online"; then
    echo "$(date): Application is down, restarting..." >> /var/log/clickguard-monitor.log
    pm2 restart clickguard-backend
fi

# Check database connection
if ! pg_isready -h localhost -p 5432 -U clickguard_user > /dev/null 2>&1; then
    echo "$(date): Database connection failed" >> /var/log/clickguard-monitor.log
fi

# Check RabbitMQ
if ! rabbitmqctl status > /dev/null 2>&1; then
    echo "$(date): RabbitMQ is down" >> /var/log/clickguard-monitor.log
fi
EOF

chmod +x /home/clickguard/monitor.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/clickguard/monitor.sh") | crontab -
```

## Backup & Recovery

### 1. Database Backup

Create backup script:

```bash
cat > /home/clickguard/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/clickguard/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/clickguard_$DATE.sql"

mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h localhost -U clickguard_user clickguard > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

chmod +x /home/clickguard/backup.sh

# Add to crontab (daily backup at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/clickguard/backup.sh") | crontab -
```

### 2. Application Backup

```bash
# Backup application files
tar -czf /home/clickguard/backups/app_$(date +%Y%m%d_%H%M%S).tar.gz \
    /home/clickguard/clickguard-backend \
    --exclude=node_modules \
    --exclude=logs \
    --exclude=.git
```

### 3. Recovery Procedures

#### Database Recovery
```bash
# Restore database from backup
gunzip -c /home/clickguard/backups/clickguard_20240101_020000.sql.gz | \
psql -h localhost -U clickguard_user clickguard
```

#### Application Recovery
```bash
# Stop application
pm2 stop clickguard-backend

# Restore application files
tar -xzf /home/clickguard/backups/app_20240101_020000.tar.gz -C /

# Restart application
pm2 start clickguard-backend
```

## Security Hardening

### 1. Firewall Configuration

```bash
# Install UFW
sudo apt install ufw -y

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

### 2. SSH Security

Edit `/etc/ssh/sshd_config`:

```conf
# Disable root login
PermitRootLogin no

# Use key-based authentication
PasswordAuthentication no
PubkeyAuthentication yes

# Change default port (optional)
Port 2222

# Limit login attempts
MaxAuthTries 3
```

### 3. Application Security

```bash
# Set proper file permissions
sudo chown -R clickguard:clickguard /home/clickguard/clickguard-backend
chmod 600 /home/clickguard/clickguard-backend/.env
chmod 755 /home/clickguard/clickguard-backend

# Secure log files
chmod 644 /home/clickguard/clickguard-backend/logs/*.log
```

### 4. Regular Security Updates

```bash
# Create security update script
cat > /home/clickguard/security-update.sh << 'EOF'
#!/bin/bash

# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js packages
cd /home/clickguard/clickguard-backend
npm audit fix

# Restart services
sudo systemctl restart postgresql
sudo systemctl restart rabbitmq-server
pm2 restart clickguard-backend
EOF

chmod +x /home/clickguard/security-update.sh

# Run weekly security updates
(crontab -l 2>/dev/null; echo "0 3 * * 0 /home/clickguard/security-update.sh") | crontab -
```

## Troubleshooting

### 1. Common Issues

#### Application Won't Start
```bash
# Check logs
pm2 logs clickguard-backend

# Check environment variables
pm2 env clickguard-backend

# Restart application
pm2 restart clickguard-backend
```

#### Database Connection Issues
```bash
# Test database connection
psql -h localhost -U clickguard_user -d clickguard -c "SELECT 1;"

# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-12-main.log
```

#### RabbitMQ Issues
```bash
# Check RabbitMQ status
sudo systemctl status rabbitmq-server

# Check RabbitMQ logs
sudo tail -f /var/log/rabbitmq/rabbit@hostname.log

# Test connection
rabbitmqctl status
```

### 2. Performance Issues

#### High CPU Usage
```bash
# Check Node.js processes
pm2 monit

# Check system resources
htop

# Restart with more memory
pm2 restart clickguard-backend --max-memory-restart 2G
```

#### High Memory Usage
```bash
# Check memory usage
free -h

# Check Node.js memory
pm2 show clickguard-backend

# Increase memory limit
pm2 restart clickguard-backend --max-memory-restart 2G
```

### 3. Network Issues

#### SSL Certificate Issues
```bash
# Check certificate validity
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test SSL configuration
curl -I https://your-domain.com/health
```

#### Load Balancer Issues
```bash
# Test upstream servers
curl -I http://localhost:3000/health

# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### 4. Emergency Procedures

#### Complete System Restart
```bash
# Stop all services
pm2 stop all
sudo systemctl stop nginx
sudo systemctl stop postgresql
sudo systemctl stop rabbitmq-server

# Start services in order
sudo systemctl start postgresql
sudo systemctl start rabbitmq-server
sudo systemctl start nginx
pm2 start all
```

#### Rollback to Previous Version
```bash
# Stop application
pm2 stop clickguard-backend

# Restore from backup
cd /home/clickguard/clickguard-backend
git checkout <previous-commit-hash>

# Restart application
pm2 start clickguard-backend
```

## Support

For deployment issues:
1. Check the troubleshooting section above
2. Review application and system logs
3. Verify all services are running
4. Contact the development team with specific error details

## Maintenance Schedule

- **Daily**: Monitor application health and logs
- **Weekly**: Security updates and performance review
- **Monthly**: Full system backup and configuration review
- **Quarterly**: SSL certificate renewal and system optimization 