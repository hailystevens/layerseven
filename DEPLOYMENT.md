# LayerSeven – End-to-End Deployment Guide

This document captures exactly how the site and API are wired so you (or Future-You) can rebuild it fast.

## 0) What you end up with

- **Static site** on GitHub Pages at `layerseven.tech` (root) and `www.layerseven.tech`
- **API** at `https://api.layerseven.tech` running on a DigitalOcean Ubuntu droplet
- **Nginx** reverse proxy + Let's Encrypt certs
- **Systemd service** for the Node API
- **GitHub Actions** deploy pipeline (push → rsync → install deps → restart → health check)

## 1) DNS (your registrar → DigitalOcean)

Already set, but for reference:

**A records** for `layerseven.tech` → GitHub Pages IPs (x4):
- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

**AAAA records** for `layerseven.tech` → GitHub Pages IPv6 (x4):
- `2606:50c0:8000::153`
- `2606:50c0:8001::153`
- `2606:50c0:8002::153`
- `2606:50c0:8003::153`

**CNAME** record:
- `www.layerseven.tech` → `hailystevens.github.io`

**A record** for API:
- `api.layerseven.tech` → your droplet's IPv4 (e.g., `159.203.139.56`)

**NS records** point to DigitalOcean's nameservers:
- `ns1.digitalocean.com`
- `ns2.digitalocean.com`
- `ns3.digitalocean.com`

## 2) Droplet base setup (once)

SSH in as root the first time.

### Update & firewall

```bash
apt update && apt -y upgrade
apt -y install ufw
ufw allow OpenSSH
ufw allow 80,443/tcp
ufw --force enable
```

### Create the app user

```bash
adduser --disabled-password --gecos "" haily
usermod -aG sudo haily
```

### SSH access for haily (used by GitHub Actions)

On your **local machine** (Windows PowerShell):

```powershell
ssh-keygen -t ed25519 -C "gh-actions@layerseven" -f $env:USERPROFILE\.ssh\l7_actions_key
# DO NOT set a passphrase for this automation key
```

Add private key contents of `~\.ssh\l7_actions_key` to GitHub repo Secret `VM_SSH_KEY`.

Add public key contents of `~\.ssh\l7_actions_key.pub` to the droplet:

```bash
# on droplet as root
su - haily -c 'mkdir -p ~/.ssh && chmod 700 ~/.ssh'
cat >> /home/haily/.ssh/authorized_keys <<EOF
ssh-ed25519 AAAA... gh-actions@layerseven
EOF
chmod 600 /home/haily/.ssh/authorized_keys
chown haily:haily /home/haily/.ssh/authorized_keys
```

### Passwordless Sudo

The deployment user must have passwordless sudo access for systemctl commands. Add the following to `/etc/sudoers.d/deploy` on the VM:

```bash
sudo visudo -f /etc/sudoers.d/deploy
```

Add this content:

```
# Allow deployment user to manage the API service without password
haily ALL=(ALL) NOPASSWD: /bin/systemctl restart api, /bin/systemctl is-active api, /bin/systemctl status api
```

Set correct permissions:

```bash
sudo chmod 0440 /etc/sudoers.d/deploy
```

Verify the syntax:

```bash
sudo visudo -c -f /etc/sudoers.d/deploy
```

## 3) Install Node.js

```bash
# as root or haily with sudo
curl -fsSL https://deb.nodesource.com/setup_lts.sh | sudo -E bash -
sudo apt -y install nodejs
node --version  # should be v18+ or v20+
```

## 4) Install Nginx + Certbot

```bash
sudo apt -y install nginx certbot python3-certbot-nginx
```

### Configure Nginx

Create `/etc/nginx/sites-available/api.layerseven.tech`:

```nginx
server {
    listen 80;
    server_name api.layerseven.tech;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/api.layerseven.tech /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Get Let's Encrypt certificate

```bash
sudo certbot --nginx -d api.layerseven.tech
# Follow prompts; choose redirect HTTP → HTTPS
```

Certbot will automatically update the Nginx config to use HTTPS.

## 5) Systemd Service

Create `/etc/systemd/system/api.service`:

```ini
[Unit]
Description=LayerSeven API Service
After=network.target

[Service]
Type=simple
User=haily
WorkingDirectory=/home/haily/api
ExecStart=/usr/bin/node /home/haily/api/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=api

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable api
sudo systemctl start api
sudo systemctl status api
```

## 6) GitHub Actions Secrets

In your GitHub repository settings, add these secrets:

- `VM_SSH_KEY`: Private SSH key content (from `~\.ssh\l7_actions_key`)
- `VM_USER`: `haily`
- `VM_HOST`: Your droplet's IP address (e.g., `159.203.139.56`)

## 7) Deploy Workflow

The GitHub Actions workflow (`.github/workflows/deploy-api.yml`) automatically:

1. Triggers on push to `main` when `api/**` files change
2. Connects to the VM via SSH
3. Syncs code using rsync (excludes `node_modules`)
4. Installs production dependencies with `npm ci --omit=dev`
5. Restarts the API service
6. Performs a health check at `https://api.layerseven.tech/health`

## 8) GitHub Pages Setup

In repository settings → Pages:

- **Source**: Deploy from a branch
- **Branch**: `main` / `(root)`
- **Custom domain**: `layerseven.tech`

GitHub will create a `CNAME` file in the repository root.

## Troubleshooting

### "sudo: a password is required"

This error indicates that passwordless sudo is not configured correctly. Verify:

1. The sudoers file exists: `ls -la /etc/sudoers.d/deploy`
2. The file has correct permissions: `sudo chmod 0440 /etc/sudoers.d/deploy`
3. The file syntax is valid: `sudo visudo -c -f /etc/sudoers.d/deploy`

### SSH Connection Issues

- Ensure the VM's SSH server is running
- Verify the private key has correct permissions (600)
- Check that the public key is in `~/.ssh/authorized_keys` on the VM
- Test SSH connection: `ssh -i path/to/key haily@<VM_IP>`

### API Service Issues

Check service status:

```bash
sudo systemctl status api
journalctl -u api -n 50 -f  # View logs
```

Common issues:
- Port 3000 already in use
- Node.js not installed or wrong version
- Missing dependencies (run `npm ci` in `/home/haily/api`)

### Nginx Issues

Check Nginx configuration:

```bash
sudo nginx -t
sudo systemctl status nginx
journalctl -u nginx -n 50 -f
```

### Certificate Renewal

Certbot sets up automatic renewal, but you can test it:

```bash
sudo certbot renew --dry-run
```

### Health Check Failing

1. Check if the API is running: `curl http://localhost:3000/health`
2. Check Nginx: `curl http://api.layerseven.tech/health`
3. Check HTTPS: `curl https://api.layerseven.tech/health`
4. Review logs: `journalctl -u api -n 100`
