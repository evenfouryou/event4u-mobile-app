#!/bin/bash
# Script per sincronizzare l'app mobile con GitHub
# Esegui questo script dalla root del progetto

echo "=== Sincronizzazione Event4U Mobile App con GitHub ==="

cd mobile-app

# Inizializza git se non esiste
if [ ! -d ".git" ]; then
  git init
  git remote add origin https://github.com/evenfouryou/event4u-mobile-app.git
fi

# Aggiungi tutti i file
git add -A

# Commit
git commit -m "Update mobile app - $(date '+%Y-%m-%d %H:%M')"

# Push
git branch -M main
git push -u origin main

echo "=== Sync completato! ==="
echo "Repository: https://github.com/evenfouryou/event4u-mobile-app"
