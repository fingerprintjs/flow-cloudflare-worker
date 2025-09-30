#!/bin/bash

# Script to copy wrangler.example.jsonc to wrangler.jsonc if it doesn't exist
if [ ! -f "wrangler.jsonc" ]; then
    if [ -f "wrangler.example.jsonc" ]; then
        cp wrangler.example.jsonc wrangler.jsonc
        echo "✅ wrangler.jsonc created from wrangler.example.jsonc"
    else
        echo "❌ Error: wrangler.example.jsonc not found"
        exit 1
    fi
else
    echo "ℹ️  wrangler.jsonc already exists, skipping copy"
fi