#!/bin/bash
set -e

# Start ollama server in background
echo "Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready (polling port 11434)
echo "Waiting for Ollama to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
    echo "Ollama is ready!"
    break
  fi
  echo "Waiting for Ollama... ($i/30)"
  sleep 1
done

# Check if nomic-embed-text is already installed
if ! ollama list | grep -q "nomic-embed-text"; then
  echo "Downloading nomic-embed-text embedding model..."
  ollama pull nomic-embed-text
  echo "Model download complete!"
else
  echo "nomic-embed-text already installed"
fi

# Keep the server running
echo "Ollama server is running"
wait $OLLAMA_PID
