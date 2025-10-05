# layerseven

Personal website and API hosted at [layerseven.tech](https://layerseven.tech)

## Overview

This repository contains:

- **Static website**: HTML/CSS/JS files served via GitHub Pages at `layerseven.tech` and `www.layerseven.tech`
- **API**: Node.js/Express API in the `api/` directory, deployed to a DigitalOcean droplet and accessible at `api.layerseven.tech`

## Architecture

- **Frontend**: Static site hosted on GitHub Pages
- **Backend**: Node.js API running on Ubuntu (DigitalOcean)
  - Nginx reverse proxy with Let's Encrypt SSL
  - Systemd service for process management
  - GitHub Actions for automated deployment

## Quick Start

### Running the API Locally

```bash
cd api
npm install
node server.js
# API runs on http://localhost:3000
```

### API Endpoints

- `GET /health` - Health check endpoint
- `GET /hello` - Hello world endpoint

## Deployment

The site and API are automatically deployed when changes are pushed to the `main` branch:

- **Static site**: GitHub Pages automatically serves files from the root directory
- **API**: GitHub Actions workflow deploys to the VM when `api/**` files change

For detailed deployment setup and troubleshooting, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Repository Structure

```
.
├── api/                    # Node.js API application
│   ├── server.js          # Express server
│   ├── package.json       # Node dependencies
│   └── package-lock.json
├── .github/
│   └── workflows/
│       └── deploy-api.yml # GitHub Actions deployment workflow
├── index.html             # Main website page
├── CNAME                  # Custom domain configuration
├── DEPLOYMENT.md          # Comprehensive deployment guide
└── README.md              # This file
```

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.