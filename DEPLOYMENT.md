# Deployment Guide

Complete guide to deploy the Grok Trading Bot on a VPS.

## Prerequisites

- VPS with Ubuntu 22.04 LTS (minimum 2 vCPU, 4GB RAM)
- Domain name pointing to your VPS IP
- SSH access to VPS
- IBKR Gateway running (locally or on VPS)

## Recommended VPS Providers

| Provider | Location | Starting Price | Notes |
|----------|----------|----------------|-------|
| Hetzner | Germany | ~4 EUR/mo | Best value for EU |
| OVH | France | ~5 EUR/mo | Local option |
| Scaleway | France | ~7 EUR/mo | Good UI |
| DigitalOcean | EU | ~6 USD/mo | Easy to use |

## Step 1: Initial VPS Setup

SSH into your VPS as root:

```bash
ssh root@your-vps-ip
```

Download and run the setup script:

```bash
curl -fsSL https://raw.githubusercontent.com/nolancacheux/grok_trading/main/scripts/setup-vps.sh -o setup-vps.sh
chmod +x setup-vps.sh
sudo bash setup-vps.sh
```

The script will:
- Create a non-root user
- Install Docker
- Configure firewall (UFW)
- Setup fail2ban
- Disable password SSH login
- Enable automatic security updates

## Step 2: Add SSH Key

From your local machine, add your SSH key:

```bash
ssh-copy-id trader@your-vps-ip
```

Then login as the new user:

```bash
ssh trader@your-vps-ip
```

## Step 3: Clone Repository

```bash
cd /opt/grok-trading
git clone https://github.com/nolancacheux/grok_trading.git .
```

## Step 4: Configure Environment

```bash
cp .env.example .env
nano .env
```

Required variables:

```env
# Grok API
XAI_API_KEY=your_actual_api_key

# IBKR Configuration
IBKR_HOST=host.docker.internal
IBKR_PORT=4002
IBKR_CLIENT_ID=1
IBKR_ACCOUNT=DU0366274

# Application
APP_ENV=production
LOG_LEVEL=INFO

# Domain
DOMAIN=trading.yourdomain.com
PUBLIC_API_URL=https://trading.yourdomain.com
```

## Step 5: Configure Domain

Update the Caddyfile with your domain:

```bash
nano Caddyfile
```

Replace `{$DOMAIN:localhost}` with your actual domain:

```
trading.yourdomain.com {
    # ... rest of config
}
```

## Step 6: DNS Configuration

Add these DNS records for your domain:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | trading | your-vps-ip | 300 |
| A | @ | your-vps-ip | 300 (if using root domain) |

Wait for DNS propagation (5-30 minutes).

## Step 7: Start Services

```bash
sudo systemctl start grok-trading
```

Or manually with Docker:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Check status:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

## Step 8: Setup Monitoring

Access Uptime Kuma at `http://your-vps-ip:3001`

1. Create admin account
2. Add monitors:
   - **Backend Health**: `http://backend:8000/health` (internal)
   - **Frontend**: `http://frontend:3000` (internal)
   - **Public Site**: `https://trading.yourdomain.com` (external)

Configure notifications (Discord, Telegram, Email, etc.)

## Step 9: Setup Backups

Add cron job for daily backups:

```bash
crontab -e
```

Add:

```
0 2 * * * /opt/grok-trading/scripts/backup.sh >> /var/log/grok-backup.log 2>&1
```

## Step 10: IBKR Gateway Setup

### Option A: Run IBKR Gateway on VPS (Recommended)

Install IBC (IBKR Controller):

```bash
# Download IBC
wget https://github.com/IbcAlpha/IBC/releases/latest/download/IBCLinux-3.18.0.zip
unzip IBCLinux-3.18.0.zip -d /opt/ibc

# Configure
cp /opt/ibc/config.ini.sample /opt/ibc/config.ini
nano /opt/ibc/config.ini
```

### Option B: SSH Tunnel from Local Machine

If running IBKR Gateway locally:

```bash
ssh -N -R 4002:localhost:4002 trader@your-vps-ip
```

Update `.env`:

```env
IBKR_HOST=localhost
```

## Useful Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml logs backend -f

# Restart services
sudo systemctl restart grok-trading

# Deploy updates
./deploy.sh

# Manual backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh backups/grok_trading_backup_20250101_020000.tar.gz

# Check disk usage
df -h
docker system df

# Clean up Docker
docker system prune -a
```

## Troubleshooting

### Services not starting

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check container status
docker ps -a

# Rebuild containers
docker compose -f docker-compose.prod.yml up -d --build --force-recreate
```

### SSL certificate issues

Caddy handles SSL automatically. If issues:

```bash
# Check Caddy logs
docker compose -f docker-compose.prod.yml logs caddy

# Verify DNS
dig trading.yourdomain.com
```

### IBKR connection issues

```bash
# Test connection from container
docker compose -f docker-compose.prod.yml exec backend python -c "
from ib_insync import IB
ib = IB()
ib.connect('host.docker.internal', 4002, clientId=1)
print('Connected:', ib.isConnected())
"
```

### High memory usage

```bash
# Check memory
free -h
docker stats

# Restart services
sudo systemctl restart grok-trading
```

## Security Checklist

- [ ] SSH key authentication only
- [ ] Firewall enabled (UFW)
- [ ] fail2ban running
- [ ] Root login disabled
- [ ] Automatic security updates enabled
- [ ] HTTPS enabled (Caddy)
- [ ] Environment variables secured
- [ ] Regular backups configured
- [ ] Monitoring alerts configured

## Maintenance

### Weekly

- Check monitoring dashboard
- Review logs for errors
- Verify backups are running

### Monthly

- Update system packages: `sudo apt update && sudo apt upgrade`
- Update Docker images: `docker compose -f docker-compose.prod.yml pull`
- Review and rotate logs
- Test backup restoration

### Quarterly

- Rotate API keys
- Review security settings
- Update dependencies
