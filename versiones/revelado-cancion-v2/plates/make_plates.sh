#!/bin/bash
# Prepara cuatro matrices originales locales y máscaras (Pillow). Ver README.
cd "$(dirname "$0")"
python3 make_plates.py "$@"
