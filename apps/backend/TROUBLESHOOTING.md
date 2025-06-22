# ClickGuard Troubleshooting Guide

## Table of Contents
1. [Overview](#overview)
2. [Common Issues](#common-issues)
3. [Database Issues](#database-issues)
4. [Queue Issues](#queue-issues)
5. [API Issues](#api-issues)
6. [Authentication Issues](#authentication-issues)
7. [Performance Issues](#performance-issues)
8. [Deployment Issues](#deployment-issues)
9. [Monitoring & Logs](#monitoring--logs)
10. [Emergency Procedures](#emergency-procedures)
11. [Support Resources](#support-resources)

## Overview

This troubleshooting guide helps you identify and resolve common issues with the ClickGuard backend. Each section provides specific symptoms, diagnostic steps, and solutions.

## Common Issues

### Application Won't Start

#### Symptoms
- Application fails to start
- Error messages in console
- Process exits immediately

#### Diagnostic Steps
```bash
# Check Node.js version
node --version

# Check if all dependencies are installed
npm list

# Check environment variables
cat .env

# Check if port is already in use
lsof -i :3000

# Check application logs
pm2 logs clickguard-backend
```

#### Solutions
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clear PM2 processes
pm2 delete all
pm2 start ecosystem.config.js

# Check environment file
cp env.example .env
# Edit .env with correct values

# Kill process using port
sudo kill -9 $(lsof -t -i:3000)
```

### Environment Configuration Issues

#### Symptoms
- "Environment variable not found" errors
- Database connection failures
- API key validation errors

#### Diagnostic Steps
```bash
# Check if .env file exists
ls -la .env

# Verify environment variables
echo $NODE_ENV
echo $DATABASE_URL
echo $JWT_SECRET

# Test database connection
psql $DATABASE_URL -c "SELECT 1;"
```

#### Solutions
```bash
# Create .env file from template
cp env.example .env

# Set required environment variables
export NODE_ENV=development
export DATABASE_URL=postgresql://user:pass@localhost:5432/clickguard
export JWT_SECRET=your_secret_key

# Restart application
pm2 restart clickguard-backend
```

## Database Issues

### Connection Refused

#### Symptoms
- "ECONNREFUSED" errors
- "Connection timeout" messages
- Application can't connect to database

#### Diagnostic Steps
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check if PostgreSQL is listening
sudo netstat -tlnp | grep 5432

# Test connection manually
psql -h localhost -U clickguard_user -d clickguard

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-12-main.log
```

#### Solutions
```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check PostgreSQL configuration
sudo nano /etc/postgresql/12/main/postgresql.conf

# Restart PostgreSQL
sudo systemctl restart postgresql

# Verify user permissions
sudo -u postgres psql -c "SELECT usename, usesysid FROM pg_user;"
```

### Migration Issues

#### Symptoms
- "Table already exists" errors
- "Column does not exist" errors
- Migration failures

#### Diagnostic Steps
```bash
# Check migration status
npm run migrate:status

# Check database schema
psql $DATABASE_URL -c "\dt"

# Check specific table structure
psql $DATABASE_URL -c "\d users"
```

#### Solutions
```bash
# Reset database (WARNING: This will delete all data)
npm run db:reset

# Run migrations
npm run migrate

# Undo last migration
npm run migrate:undo

# Force sync (development only)
# Add to server.js: await sequelize.sync({ force: true });
```

### Performance Issues

#### Symptoms
- Slow database queries
- High CPU usage
- Connection pool exhaustion

#### Diagnostic Steps
```bash
# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql $DATABASE_URL -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check table sizes
psql $DATABASE_URL -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

#### Solutions
```bash
# Add database indexes
psql $DATABASE_URL -c "CREATE INDEX CONCURRENTLY idx_click_logs_account_timestamp ON click_logs(account_id, timestamp);"

# Optimize PostgreSQL configuration
sudo nano /etc/postgresql/12/main/postgresql.conf
# Increase shared_buffers, effective_cache_size, work_mem

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Queue Issues

### RabbitMQ Connection Issues

#### Symptoms
- "Connection refused" errors
- Queue processing stops
- Messages not being consumed

#### Diagnostic Steps
```bash
# Check RabbitMQ status
sudo systemctl status rabbitmq-server

# Check RabbitMQ management
curl http://localhost:15672

# Check queue status
sudo rabbitmqctl list_queues

# Check connections
sudo rabbitmqctl list_connections
```

#### Solutions
```bash
# Start RabbitMQ
sudo systemctl start rabbitmq-server
sudo systemctl enable rabbitmq-server

# Enable management plugin
sudo rabbitmq-plugins enable rabbitmq_management

# Create user if needed
sudo rabbitmqctl add_user clickguard clickguard_password
sudo rabbitmqctl set_permissions -p / clickguard ".*" ".*" ".*"

# Restart RabbitMQ
sudo systemctl restart rabbitmq-server
```

### Message Processing Issues

#### Symptoms
- Messages stuck in queue
- Workers not processing messages
- High queue depth

#### Diagnostic Steps
```bash
# Check queue depth
sudo rabbitmqctl list_queues name messages_ready messages_unacknowledged

# Check worker processes
pm2 list

# Check worker logs
pm2 logs clickguard-backend

# Check message content
sudo rabbitmqctl list_queues name messages_ready
```

#### Solutions
```bash
# Restart workers
pm2 restart clickguard-backend

# Purge stuck messages (WARNING: This will delete messages)
sudo rabbitmqctl purge_queue click_processing_queue

# Check worker code for errors
pm2 logs clickguard-backend --lines 100

# Increase worker instances
pm2 scale clickguard-backend 2
```

## API Issues

### Rate Limiting

#### Symptoms
- "Too many requests" errors
- API calls failing with 429 status
- Inconsistent response times

#### Diagnostic Steps
```bash
# Check rate limit configuration
grep -r "rateLimit" src/

# Monitor API requests
tail -f logs/access.log

# Check current rate limits
redis-cli GET "rate_limit:192.168.1.1"
```

#### Solutions
```bash
# Adjust rate limits in middleware
# Increase limits for specific endpoints
const trackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2000, // Increase from 1000
  message: { error: 'Too many requests' }
});

# Clear rate limit for specific IP
redis-cli DEL "rate_limit:192.168.1.1"

# Restart application
pm2 restart clickguard-backend
```

### Validation Errors

#### Symptoms
- 400 Bad Request responses
- "Validation error" messages
- Missing required fields

#### Diagnostic Steps
```bash
# Check request payload
curl -X POST http://localhost:3000/api/v1/track \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"ipAddress": "192.168.1.1"}' \
  -v

# Check validation schemas
grep -r "Joi.object" src/
```

#### Solutions
```bash
# Fix request payload
curl -X POST http://localhost:3000/api/v1/track \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "landingPage": "https://example.com"
  }'

# Update validation schema if needed
# Edit src/middleware/validation.js
```

### CORS Issues

#### Symptoms
- "CORS policy" errors in browser
- Frontend can't connect to API
- Preflight request failures

#### Diagnostic Steps
```bash
# Check CORS configuration
grep -r "cors" src/

# Test CORS headers
curl -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: X-API-Key" \
  -X OPTIONS http://localhost:3000/api/v1/track
```

#### Solutions
```bash
# Update CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

# Restart application
pm2 restart clickguard-backend
```

## Authentication Issues

### JWT Token Issues

#### Symptoms
- "Invalid token" errors
- "Token expired" messages
- Authentication failures

#### Diagnostic Steps
```bash
# Check JWT secret
echo $JWT_SECRET

# Decode JWT token (replace with actual token)
echo "your.jwt.token" | cut -d. -f2 | base64 -d

# Check token expiration
jwt decode your.jwt.token
```

#### Solutions
```bash
# Generate new JWT secret
openssl rand -base64 32

# Update .env file
JWT_SECRET=your_new_secret_key

# Restart application
pm2 restart clickguard-backend

# Clear existing tokens (if using Redis)
redis-cli FLUSHALL
```

### API Key Issues

#### Symptoms
- "Invalid API key" errors
- 401 Unauthorized responses
- Account not found

#### Diagnostic Steps
```bash
# Check API key in database
psql $DATABASE_URL -c "SELECT id, email, api_key FROM users WHERE api_key = 'your-api-key';"

# Check API key format
echo "your-api-key" | wc -c

# Test API key
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/v1/track \
  -d '{"ipAddress": "192.168.1.1", "userAgent": "test", "landingPage": "https://example.com"}'
```

#### Solutions
```bash
# Generate new API key
psql $DATABASE_URL -c "UPDATE users SET api_key = 'new-api-key-' || gen_random_uuid() WHERE email = 'user@example.com';"

# Check account status
psql $DATABASE_URL -c "SELECT email, subscription_status, is_active FROM users WHERE email = 'user@example.com';"

# Activate account if needed
psql $DATABASE_URL -c "UPDATE users SET is_active = true WHERE email = 'user@example.com';"
```

## Performance Issues

### High CPU Usage

#### Symptoms
- Slow response times
- High CPU utilization
- Application becoming unresponsive

#### Diagnostic Steps
```bash
# Check CPU usage
top -p $(pgrep -f "node.*server.js")

# Check Node.js processes
pm2 monit

# Check memory usage
free -h
ps aux | grep node

# Profile Node.js application
node --prof server.js
```

#### Solutions
```bash
# Increase PM2 instances
pm2 scale clickguard-backend 4

# Increase memory limit
pm2 restart clickguard-backend --max-memory-restart 2G

# Optimize database queries
# Add indexes, use pagination, implement caching

# Restart with more memory
node --max-old-space-size=4096 server.js
```

### Memory Leaks

#### Symptoms
- Gradually increasing memory usage
- Application crashes after running for a while
- Out of memory errors

#### Diagnostic Steps
```bash
# Monitor memory usage
watch -n 1 'ps aux | grep node'

# Check for memory leaks
node --inspect server.js
# Use Chrome DevTools to analyze memory

# Check heap usage
curl http://localhost:3000/debug/memory
```

#### Solutions
```bash
# Restart application periodically
pm2 restart clickguard-backend

# Implement memory monitoring
const used = process.memoryUsage();
console.log(`Memory usage: ${Math.round(used.heapUsed / 1024 / 1024)} MB`);

# Fix memory leaks in code
# Close database connections, clear intervals, remove event listeners
```

### Slow Response Times

#### Symptoms
- API responses taking > 1 second
- Timeout errors
- Poor user experience

#### Diagnostic Steps
```bash
# Test response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/health

# Check database query times
psql $DATABASE_URL -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Monitor network latency
ping localhost
```

#### Solutions
```bash
# Optimize database queries
# Add indexes, use connection pooling, implement caching

# Implement response caching
const cache = require('memory-cache');
app.use(cacheMiddleware(300)); // Cache for 5 minutes

# Use load balancing
# Deploy multiple application instances

# Optimize external API calls
# Implement request batching, use connection pooling
```

## Deployment Issues

### SSL Certificate Issues

#### Symptoms
- "SSL certificate" errors
- HTTPS not working
- Certificate expired warnings

#### Diagnostic Steps
```bash
# Check certificate validity
sudo certbot certificates

# Test SSL configuration
curl -I https://your-domain.com

# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout | grep "Not After"
```

#### Solutions
```bash
# Renew certificate
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal

# Check auto-renewal
sudo certbot renew --dry-run

# Restart Nginx
sudo systemctl restart nginx
```

### Nginx Issues

#### Symptoms
- 502 Bad Gateway errors
- Nginx not serving requests
- Configuration errors

#### Diagnostic Steps
```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check upstream servers
curl -I http://localhost:3000/health
```

#### Solutions
```bash
# Fix Nginx configuration
sudo nano /etc/nginx/sites-available/clickguard

# Restart Nginx
sudo systemctl restart nginx

# Check upstream connectivity
# Ensure application is running on port 3000

# Update Nginx configuration
# Add proper proxy settings, SSL configuration
```

### PM2 Issues

#### Symptoms
- Application not starting
- PM2 processes not running
- Log rotation issues

#### Diagnostic Steps
```bash
# Check PM2 status
pm2 list

# Check PM2 logs
pm2 logs

# Check PM2 configuration
cat ecosystem.config.js

# Check PM2 startup script
pm2 startup
```

#### Solutions
```bash
# Restart PM2 processes
pm2 restart all

# Delete and recreate processes
pm2 delete all
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

## Monitoring & Logs

### Log Analysis

#### Common Log Locations
```bash
# Application logs
tail -f logs/combined.log
tail -f logs/error.log

# PM2 logs
pm2 logs clickguard-backend

# System logs
sudo journalctl -u clickguard-backend -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-12-main.log

# RabbitMQ logs
sudo tail -f /var/log/rabbitmq/rabbit@hostname.log
```

#### Log Search Commands
```bash
# Search for errors
grep -i "error" logs/combined.log

# Search for specific IP
grep "192.168.1.1" logs/combined.log

# Search for slow queries
grep "slow" logs/combined.log

# Search for authentication failures
grep -i "unauthorized\|invalid" logs/combined.log

# Search for recent activity
tail -n 1000 logs/combined.log | grep "$(date +%Y-%m-%d)"
```

### Health Checks

#### Application Health
```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health check
curl http://localhost:3000/health/detailed

# Database health
psql $DATABASE_URL -c "SELECT 1;"

# Queue health
sudo rabbitmqctl status

# Memory health
free -h
df -h
```

#### Monitoring Scripts
```bash
#!/bin/bash
# health-check.sh

# Check application
if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "$(date): Application health check failed"
    pm2 restart clickguard-backend
fi

# Check database
if ! pg_isready -h localhost -p 5432 -U clickguard_user > /dev/null 2>&1; then
    echo "$(date): Database health check failed"
    sudo systemctl restart postgresql
fi

# Check RabbitMQ
if ! rabbitmqctl status > /dev/null 2>&1; then
    echo "$(date): RabbitMQ health check failed"
    sudo systemctl restart rabbitmq-server
fi
```

## Emergency Procedures

### Complete System Restart

#### When to Use
- Application completely unresponsive
- Database corruption
- Queue system failure
- Security incident

#### Procedure
```bash
# 1. Stop all services
pm2 stop all
sudo systemctl stop nginx
sudo systemctl stop postgresql
sudo systemctl stop rabbitmq-server

# 2. Backup critical data
pg_dump clickguard > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Start services in order
sudo systemctl start postgresql
sudo systemctl start rabbitmq-server
sudo systemctl start nginx
pm2 start all

# 4. Verify services
curl http://localhost:3000/health
psql $DATABASE_URL -c "SELECT 1;"
sudo rabbitmqctl status
```

### Rollback to Previous Version

#### When to Use
- New deployment causing issues
- Critical bug in current version
- Performance regression

#### Procedure
```bash
# 1. Stop application
pm2 stop clickguard-backend

# 2. Rollback code
cd /home/clickguard/clickguard-backend
git checkout <previous-commit-hash>

# 3. Install dependencies
npm ci --only=production

# 4. Restart application
pm2 start clickguard-backend

# 5. Verify functionality
curl http://localhost:3000/health
```

### Database Recovery

#### When to Use
- Database corruption
- Accidental data deletion
- Migration failure

#### Procedure
```bash
# 1. Stop application
pm2 stop clickguard-backend

# 2. Restore from backup
gunzip -c backup_20240101_020000.sql.gz | psql $DATABASE_URL

# 3. Run migrations if needed
npm run migrate

# 4. Restart application
pm2 start clickguard-backend

# 5. Verify data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

## Support Resources

### Documentation
- [ClickGuard README](../README.md)
- [API Documentation](API_DOCUMENTATION.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Development Guide](DEVELOPMENT.md)

### External Resources
- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [RabbitMQ Tutorial](https://www.rabbitmq.com/tutorials/amqp-concepts.html)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)

### Getting Help
1. Check this troubleshooting guide first
2. Review application logs for specific error messages
3. Search existing issues in the project repository
4. Create a new issue with:
   - Error message and stack trace
   - Steps to reproduce
   - Environment details (OS, Node.js version, etc.)
   - Relevant log files

### Contact Information
- **Development Team**: [team@clickguard.com](mailto:team@clickguard.com)
- **Emergency Support**: [emergency@clickguard.com](mailto:emergency@clickguard.com)
- **Documentation Issues**: [docs@clickguard.com](mailto:docs@clickguard.com) 