#!/bin/bash
# Genera las cuatro placas propias (SPEC §9) una sola vez: numpy + Pillow, sin fotos de referencia. Tarda unos 4 minutos.
cd "$(dirname "$0")"
python3 pl_quebrada.py && python3 pl_tacuari.py && python3 pl_cerrito.py && python3 pl_carape.py
