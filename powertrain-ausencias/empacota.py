#!/usr/bin/env python3
"""Monta o .zip de distribuição do painel.

O repositório fica com finais de linha Unix (LF), que é o certo para o git.
Já o pacote que vai para o PC do monitor é convertido para CRLF, porque .bat
e .ps1 no Windows dependem disso, e os CSV ganham BOM para o Excel abrir os
acentos corretamente."""
import io, os, zipfile, shutil

ORIGEM = '/home/user/Calc/powertrain-ausencias'
SAIDA  = '/tmp/claude-0/-home-user/c4ebad73-ed38-57bd-ad0e-0ec4f3b99b0c/scratchpad/Powertrain-Monitor.zip'
RAIZ   = 'Powertrain-Monitor'          # pasta que aparece ao descompactar

ARQUIVOS = [
    'index.html',
    'leitor.html',
    'Iniciar-Painel.bat',
    'servir.ps1',
    'LEIA-ME.md',
    'dados/saidas.csv',
    'dados/frota.csv',
    'dados/pessoas.csv',
    'dados/historico.json',
]
COM_BOM = {'dados/saidas.csv', 'dados/frota.csv', 'dados/pessoas.csv'}

if os.path.exists(SAIDA):
    os.remove(SAIDA)

with zipfile.ZipFile(SAIDA, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for rel in ARQUIVOS:
        caminho = os.path.join(ORIGEM, rel)
        if not os.path.exists(caminho):
            raise SystemExit(f'FALTANDO: {rel}')
        txt = io.open(caminho, encoding='utf-8').read()
        txt = txt.replace('\r\n', '\n').replace('\n', '\r\n')      # LF -> CRLF
        dados = txt.encode('utf-8')
        if rel in COM_BOM:
            dados = b'\xef\xbb\xbf' + dados
        # grava com o caminho do Windows dentro do zip
        z.writestr(RAIZ + '/' + rel, dados)

print('gerado:', SAIDA, f'({os.path.getsize(SAIDA)/1024:.1f} KB)')
with zipfile.ZipFile(SAIDA) as z:
    for i in z.infolist():
        print(f'  {i.file_size:>8,} b  {i.filename}')
    ruim = z.testzip()
    print('integridade:', 'OK' if ruim is None else f'CORROMPIDO em {ruim}')
