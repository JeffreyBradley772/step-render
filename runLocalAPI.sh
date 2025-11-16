#!/bin/bash

## May need to run chmod +x runLocalAPI.sh first
cd "$(dirname "$0")/api"

source venv/bin/activate

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000