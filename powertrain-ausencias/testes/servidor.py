#!/usr/bin/env python3
"""Verificação estrutural do servir.ps1.

Não há PowerShell neste ambiente, então este teste é a rede de proteção:
já perdi uma rota inteira numa edição sem perceber, porque os testes de
navegador usam um servidor Node equivalente e não tocam no .ps1."""
import io, re, sys

P = '/home/user/Calc/powertrain-ausencias/servir.ps1'
s = io.open(P, encoding='utf-8').read()
linhas = s.split('\n')
falhas = []
def ok(cond, msg, extra=''):
    print(('  ok  ' if cond else 'FALHA ') + msg + ('' if cond else '  << ' + str(extra)))
    if not cond: falhas.append(msg)

print('\n— rotas que o painel chama —')
for rota, metodo in [('/api/saidas','GET'), ('/api/leitura','POST'),
                     ('/api/historico','POST'), ('/api/pessoas','POST')]:
    ok(f'$path -eq "{rota}"' in s, f'rota {rota} presente')

print('\n— o cadastro antigo é preservado antes de ser trocado —')
ok('"$PessoasFile.bak"' in s, 'grava .bak antes de sobrescrever o pessoas.csv')

print('\n— variáveis usadas nas rotas estão declaradas —')
for v in ['FontePtr','FrotaFile','HistFile','PessoasFile','DataDir']:
    decl = re.search(r'^\$' + v + r'\s*=', s, re.M)
    ok(bool(decl), f'${v} declarada')

print('\n— toda resposta fecha o stream —')
blocos = s.count('continue')
ok(s.count('OutputStream.Close()') >= 4, 'streams fechados nas rotas e no estático',
   s.count('OutputStream.Close()'))

print('\n— estrutura do script —')
# tira as strings ANTES dos comentários: "#" dentro de aspas não é comentário
def semStrings(l):
    return re.sub(r'"[^"\n]*"', '', re.sub(r"'[^'\n]*'", '', l))
def semComentario(l):
    return semStrings(l).split('#')[0]
impares = [i for i,l in enumerate(linhas,1) if semStrings(l).count('"') % 2]
ok(not impares, 'aspas duplas balanceadas em toda linha', impares[:5])
sem = '\n'.join(semComentario(l) for l in linhas)
for ab, fe, nome in [('{','}','chaves'), ('(',')','parênteses')]:
    ok(sem.count(ab) == sem.count(fe), f'{nome} balanceados', f'{sem.count(ab)} x {sem.count(fe)}')

print('\n— a planilha é lida sem travar quem está editando —')
ok('FileShare]::ReadWrite' in s, 'abre com FileShare ReadWrite')
ok('StatusCode = 503' in s, 'arquivo ocupado devolve 503 em vez de derrubar')

print('\n— o log de RFID nunca é reescrito —')
ok('Add-Content -LiteralPath $FrotaFile' in s, 'leitura só acrescenta linha')
ok('-replace "[\\r\\n;]"' in s, 'tag higienizada antes de virar CSV')

print('\n— não sai da pasta do painel —')
ok('StartsWith($rootFull)' in s, 'bloqueia caminho fora da raiz')

print('\n' + (f'{len(falhas)} FALHA(S)' if falhas else 'SERVIDOR ESTRUTURALMENTE OK'))
sys.exit(1 if falhas else 0)
