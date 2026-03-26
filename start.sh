#!/bin/bash
# LegalTimeTracker - Start Development Servers

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/venv"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null
        echo -e "${GREEN}Backend server stopped.${NC}"
    fi
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null
        echo -e "${GREEN}Frontend server stopped.${NC}"
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

# ---- Check Python 3.10+ ----
echo -e "${YELLOW}Checking Python...${NC}"
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}Error: python3 is not installed. Please install Python 3.10 or higher.${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PYTHON_MAJOR=$(echo "$PYTHON_VERSION" | cut -d. -f1)
PYTHON_MINOR=$(echo "$PYTHON_VERSION" | cut -d. -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || { [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 10 ]; }; then
    echo -e "${RED}Error: Python 3.10+ is required. Found Python $PYTHON_VERSION.${NC}"
    exit 1
fi
echo -e "${GREEN}Found Python $PYTHON_VERSION${NC}"

# ---- Create virtual environment if needed ----
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}Creating virtual environment at $VENV_DIR...${NC}"
    python3 -m venv "$VENV_DIR"
    echo -e "${GREEN}Virtual environment created.${NC}"
else
    echo -e "${GREEN}Virtual environment already exists.${NC}"
fi

# ---- Install Python dependencies ----
echo -e "${YELLOW}Installing Python dependencies...${NC}"
source "$VENV_DIR/bin/activate"
pip install -q -r "$BACKEND_DIR/requirements.txt"
echo -e "${GREEN}Python dependencies installed.${NC}"

# ---- Check Node.js ----
echo -e "${YELLOW}Checking Node.js...${NC}"
if ! command -v node &>/dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js 18+.${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}Found Node.js $NODE_VERSION${NC}"

# ---- Install frontend dependencies ----
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd "$FRONTEND_DIR"
npm install --silent
echo -e "${GREEN}Frontend dependencies installed.${NC}"
cd "$PROJECT_DIR"

# ---- Start backend ----
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  LegalTimeTracker - Starting Servers   ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${YELLOW}Starting backend on http://localhost:8000 ...${NC}"
cd "$BACKEND_DIR"
"$VENV_DIR/bin/uvicorn" main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd "$PROJECT_DIR"

# Give the backend a moment to start
sleep 2

# ---- Start frontend ----
echo -e "${YELLOW}Starting frontend on http://localhost:5173 ...${NC}"
cd "$FRONTEND_DIR"
npx vite --host --port 5173 &
FRONTEND_PID=$!
cd "$PROJECT_DIR"

echo ""
echo -e "${GREEN}Both servers are running.${NC}"
echo -e "  Backend:  ${GREEN}http://localhost:8000${NC}"
echo -e "  Frontend: ${GREEN}http://localhost:5173${NC}"
echo -e "  API Docs: ${GREEN}http://localhost:8000/docs${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers.${NC}"

# Wait for either process to exit
wait
