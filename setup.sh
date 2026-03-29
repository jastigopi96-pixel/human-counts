#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# HumanCount — one-shot local setup script
# Run: chmod +x setup.sh && ./setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  HumanCount — Setup${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Prerequisites check ───────────────────────────────────────────────────────
info "Checking prerequisites…"

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "\033[0;31m[ERROR] $1 not found. Please install it first.\033[0m"
    exit 1
  fi
  success "$1 found ($(command -v "$1"))"
}

check_cmd python3
check_cmd pip3
check_cmd node
check_cmd npm

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
NODE_VERSION=$(node --version)
info "Python $PYTHON_VERSION · Node $NODE_VERSION"

# ── Backend setup ─────────────────────────────────────────────────────────────
info "Setting up backend…"

cd backend

if [ ! -d "venv" ]; then
  info "Creating Python virtual environment…"
  python3 -m venv venv
fi

source venv/bin/activate

info "Installing Python dependencies (this may take a minute)…"
pip install --upgrade pip -q
pip install -r requirements.txt -q

info "Pre-downloading YOLOv8 nano model…"
python3 -c "from ultralytics import YOLO; YOLO('yolov8n.pt')" 2>/dev/null || warn "Model download will happen on first run"

if [ ! -f ".env" ]; then
  cp .env.example .env
  success "Created backend/.env from example"
else
  warn "backend/.env already exists — skipping"
fi

mkdir -p /tmp/humancount/uploads /tmp/humancount/outputs
success "Temp directories created"

deactivate
cd ..

# ── Frontend setup ────────────────────────────────────────────────────────────
info "Setting up frontend…"
cd frontend

npm install --silent
success "npm packages installed"

if [ ! -f ".env.local" ]; then
  echo "VITE_API_URL=" > .env.local
  success "Created frontend/.env.local"
fi

cd ..

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Start the backend:"
echo -e "    ${CYAN}cd backend && source venv/bin/activate && python main.py${NC}"
echo ""
echo "  Start the frontend (new terminal):"
echo -e "    ${CYAN}cd frontend && npm run dev${NC}"
echo ""
echo "  Or run everything with Docker:"
echo -e "    ${CYAN}docker-compose up --build${NC}"
echo ""
echo "  API docs:  http://localhost:8000/docs"
echo "  Frontend:  http://localhost:5173"
echo ""
