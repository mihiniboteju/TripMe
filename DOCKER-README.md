# 🐳 TripMe - Docker Quick Start

Simple guide to run TripMe full-stack application using Docker.

> 📚 **For detailed documentation**, see [`docs/DOCKER_SETUP.md`](docs/DOCKER_SETUP.md)

## Quick Start

Prerequisites:
- Docker Desktop installed
- ~4GB RAM available
- Ports 3000, 5001, 5002, 5173, 27017 free on host

Start everything:

```bash
docker-compose up -d
```

Check status:

```bash
docker-compose ps
```

Access the apps:

- Main App (React): http://localhost:3000
- Main API: http://localhost:5001
- Blog App (Vite): http://localhost:5173
- Blog API: http://localhost:5002

## What's Included

5 containerized services:
- **MongoDB** (port 27017) - Database
- **Main Backend** (port 5001 mapped from 5000) - Express API  
- **Main Frontend** (port 3000) - React 18 + Webpack
- **BlogApp3 Backend** (port 5002) - Blog API
- **BlogApp3 Frontend** (port 5173) - React 19 + Vite

## Development Workflow

This setup is optimized for fast development iteration:

- **Dependencies**: Installed at build time for faster container startup
- **Source Code**: Mounted as volumes with hot-reload support (Webpack/Vite)
- **Node Modules**: Excluded from volume mounts to avoid host/container conflicts

Typical workflow:

**Frontend changes**: Edit files → HMR applies changes instantly

**Backend changes**:
```bash
docker-compose restart server  # ~5s with pre-installed deps
```

**Why so fast?**  
Volume mounting + build-time deps = no image rebuild needed! See [`docs/DOCKER_SETUP.md`](docs/DOCKER_SETUP.md) for details.

## Common Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f server

# Restart a service
docker-compose restart client

# Stop everything
docker-compose down
```

## Troubleshooting

**Container won't start?**
```bash
docker-compose logs <service>
```

**Email/OTP not working?**  
Check `server/.env` has `EMAIL_USER` and `EMAIL_PASS` set.

**Port conflict?**
```bash
lsof -i :3000
kill -9 <PID>
```

## Full Documentation

See [`docs/DOCKER_SETUP.md`](docs/DOCKER_SETUP.md) for:
- Complete architecture explanation
- Performance metrics
- Advanced troubleshooting
- Production deployment guide
- Volume mounting deep-dive

---

**Happy Coding! 🚀**
