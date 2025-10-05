# Deployment Setup

This document describes the required setup for deploying the API to the VM.

## VM Configuration Requirements

### SSH Access
The GitHub Actions workflow requires SSH access to the VM using a private key. Configure the following secrets in the repository:
- `VM_SSH_KEY`: Private SSH key for authentication
- `VM_USER`: SSH username (e.g., `haily`)
- `VM_HOST`: VM hostname or IP address

### Passwordless Sudo
The deployment user must have passwordless sudo access for systemctl commands. Add the following to `/etc/sudoers.d/deploy` on the VM:

```
# Allow deployment user to manage the API service without password
<username> ALL=(ALL) NOPASSWD: /bin/systemctl restart api, /bin/systemctl is-active api, /bin/systemctl status api
```

Replace `<username>` with your deployment user (the value of `VM_USER`).

To create this file safely:
```bash
sudo visudo -f /etc/sudoers.d/deploy
```

### Systemd Service
The API must be configured as a systemd service. Create `/etc/systemd/system/api.service`:

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
```

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
