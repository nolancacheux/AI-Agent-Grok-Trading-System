#!/bin/bash
set -euo pipefail

# VPS Setup Script for Grok Trading Bot
# Tested on Ubuntu 22.04 LTS

echo "=== Grok Trading Bot - VPS Setup ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo bash setup-vps.sh"
    exit 1
fi

# Variables
read -p "Enter username to create (default: trader): " USERNAME
USERNAME=${USERNAME:-trader}

read -p "Enter your domain (e.g., trading.example.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo "Domain is required for HTTPS setup"
    exit 1
fi

echo ""
echo "Setting up VPS with:"
echo "  - User: $USERNAME"
echo "  - Domain: $DOMAIN"
echo ""
read -p "Continue? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    exit 0
fi

# Update system
echo ">>> Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
echo ">>> Installing essential packages..."
apt install -y \
    curl \
    wget \
    git \
    ufw \
    fail2ban \
    htop \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Create user
echo ">>> Creating user $USERNAME..."
if ! id "$USERNAME" &>/dev/null; then
    adduser --gecos "" --disabled-password "$USERNAME"
    usermod -aG sudo "$USERNAME"
    echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/$USERNAME

    # Setup SSH directory
    mkdir -p /home/$USERNAME/.ssh
    chmod 700 /home/$USERNAME/.ssh

    # Copy authorized keys if exists
    if [ -f /root/.ssh/authorized_keys ]; then
        cp /root/.ssh/authorized_keys /home/$USERNAME/.ssh/
        chmod 600 /home/$USERNAME/.ssh/authorized_keys
        chown -R $USERNAME:$USERNAME /home/$USERNAME/.ssh
    fi

    echo "User $USERNAME created. Add your SSH key to /home/$USERNAME/.ssh/authorized_keys"
fi

# Install Docker
echo ">>> Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker $USERNAME
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose
echo ">>> Docker Compose is included with Docker..."

# Configure firewall
echo ">>> Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

# Configure fail2ban
echo ">>> Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# Secure SSH
echo ">>> Securing SSH..."
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

# Setup automatic security updates
echo ">>> Enabling automatic security updates..."
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# Create app directory
echo ">>> Creating application directory..."
mkdir -p /opt/grok-trading
chown $USERNAME:$USERNAME /opt/grok-trading

# Create environment file template
cat > /opt/grok-trading/.env.example << 'EOF'
# Grok API
XAI_API_KEY=your_xai_api_key

# IBKR Configuration
IBKR_HOST=host.docker.internal
IBKR_PORT=4002
IBKR_CLIENT_ID=1
IBKR_ACCOUNT=DU0366274

# Application
APP_ENV=production
LOG_LEVEL=INFO

# Domain (for Caddy)
DOMAIN=your.domain.com
PUBLIC_API_URL=https://your.domain.com
EOF

chown $USERNAME:$USERNAME /opt/grok-trading/.env.example

# Create systemd service for auto-start
echo ">>> Creating systemd service..."
cat > /etc/systemd/system/grok-trading.service << EOF
[Unit]
Description=Grok Trading Bot
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=$USERNAME
WorkingDirectory=/opt/grok-trading
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable grok-trading

# Setup log rotation
echo ">>> Setting up log rotation..."
cat > /etc/logrotate.d/grok-trading << 'EOF'
/opt/grok-trading/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 trader trader
    sharedscripts
}
EOF

# Create deployment script
cat > /opt/grok-trading/deploy.sh << 'EOF'
#!/bin/bash
set -e

cd /opt/grok-trading

echo "Pulling latest changes..."
git pull origin main

echo "Building and restarting containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "Cleaning up old images..."
docker image prune -f

echo "Deployment complete!"
docker compose -f docker-compose.prod.yml ps
EOF

chmod +x /opt/grok-trading/deploy.sh
chown $USERNAME:$USERNAME /opt/grok-trading/deploy.sh

echo ""
echo "=== VPS Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Add your SSH key: ssh-copy-id $USERNAME@<server-ip>"
echo "2. Login as $USERNAME: ssh $USERNAME@<server-ip>"
echo "3. Clone your repo: git clone <repo-url> /opt/grok-trading"
echo "4. Copy .env.example to .env and configure"
echo "5. Update DOMAIN in Caddyfile"
echo "6. Start: sudo systemctl start grok-trading"
echo ""
echo "Useful commands:"
echo "  - View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  - Restart: sudo systemctl restart grok-trading"
echo "  - Deploy updates: ./deploy.sh"
echo ""
