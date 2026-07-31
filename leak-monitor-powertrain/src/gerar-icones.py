#!/usr/bin/env python3
"""Gera os ícones PNG do painel (gota de vazamento sobre quadrado arredondado).
   Uso: python3 gerar-icones.py   -> escreve icon-192.png e icon-512.png
   Só precisa da biblioteca padrão (zlib/struct)."""
import zlib, struct

def png(path, size):
    r_corner = 0.22 * size
    px = bytearray()
    for y in range(size):
        px.append(0)  # filtro "none"
        for x in range(size):
            u, v = (x + .5) / size, (y + .5) / size
            # quadrado arredondado
            dx = max(r_corner - x, 0, x - (size - r_corner))
            dy = max(r_corner - y, 0, y - (size - r_corner))
            dentro = (dx * dx + dy * dy) <= r_corner * r_corner
            if not dentro:
                px += bytes((0, 0, 0, 0))
                continue
            # fundo: degradê ciano -> verde-água
            t = (u + v) / 2
            bg = (int(14 + t * (20 - 14)), int(165 + t * (184 - 165)), int(233 + t * (166 - 233)))
            # gota: círculo + triângulo
            cx, cy, rr = .5, .63, .27
            circ = (u - cx) ** 2 + (v - cy) ** 2 <= rr * rr
            tri = .17 <= v <= cy and abs(u - cx) <= rr * (v - .17) / (cy - .17)
            if circ or tri:
                px += bytes((255, 255, 255, 255))
            else:
                px += bytes((bg[0], bg[1], bg[2], 255))

    def chunk(tipo, dados):
        c = struct.pack('>I', len(dados)) + tipo + dados
        return c + struct.pack('>I', zlib.crc32(tipo + dados) & 0xffffffff)

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)))
        f.write(chunk(b'IDAT', zlib.compress(bytes(px), 9)))
        f.write(chunk(b'IEND', b''))
    print(path, size, 'ok')

png('icon-192.png', 192)
png('icon-512.png', 512)
