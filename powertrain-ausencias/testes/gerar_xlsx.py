#!/usr/bin/env python3
"""Gera um .xlsx de verdade (OOXML na mão, sem biblioteca) para testar o
leitor de planilha do painel. Reproduz o que o Excel faz de fato:
 - datas como número de série com estilo de data (não como texto);
 - textos em sharedStrings;
 - células vazias PULADAS (sem <c>), que é onde parsers ingênuos erram;
 - um texto solto em inlineStr.
"""
import zipfile, datetime, sys

def serial(dt):
    """datetime -> serial do Excel (dias desde 30/12/1899)."""
    base = datetime.datetime(1899, 12, 30)
    d = dt - base
    return d.days + (d.seconds / 86400.0)

CT = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/planilha.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>'''

RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>'''

# a planilha NÃO se chama sheet1.xml de propósito: o leitor tem que
# descobrir o nome pelo workbook + rels, como o Excel faz
WB = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Registros" sheetId="1" r:id="rId1"/></sheets></workbook>'''

WBRELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/planilha.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''

# estilo 0 = geral; estilo 1 = data com formato próprio (numFmtId 164)
STYLES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy\\ hh:mm"/></numFmts>
<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="1"><fill><patternFill patternType="none"/></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs></styleSheet>'''

def esc(t):
    return t.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')

def monta(destino, linhas_dados, cabecalho):
    textos, indice = [], {}
    def sid(t):
        if t not in indice:
            indice[t] = len(textos); textos.append(t)
        return indice[t]

    letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    corpo = []
    # cabeçalho
    cels = ''.join(f'<c r="{letras[i]}1" t="s"><v>{sid(h)}</v></c>' for i,h in enumerate(cabecalho))
    corpo.append(f'<row r="1">{cels}</row>')

    for n, linha in enumerate(linhas_dados, start=2):
        cels = ''
        for i, v in enumerate(linha):
            ref = f'{letras[i]}{n}'
            if v is None or v == '':
                continue                      # célula PULADA, como o Excel faz
            if isinstance(v, datetime.datetime):
                cels += f'<c r="{ref}" s="1"><v>{serial(v):.10f}</v></c>'
            elif isinstance(v, datetime.date):
                cels += f'<c r="{ref}" s="2"><v>{serial(datetime.datetime.combine(v, datetime.time())):.0f}</v></c>'
            elif isinstance(v, (int, float)):
                cels += f'<c r="{ref}"><v>{v}</v></c>'
            elif isinstance(v, tuple) and v[0] == 'inline':
                cels += f'<c r="{ref}" t="inlineStr"><is><t>{esc(v[1])}</t></is></c>'
            else:
                cels += f'<c r="{ref}" t="s"><v>{sid(str(v))}</v></c>'
        corpo.append(f'<row r="{n}">{cels}</row>')

    folha = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
             '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
             '<sheetData>' + ''.join(corpo) + '</sheetData></worksheet>')

    ss = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          f'<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="{len(textos)}" uniqueCount="{len(textos)}">'
          + ''.join(f'<si><t>{esc(t)}</t></si>' for t in textos) + '</sst>')

    with zipfile.ZipFile(destino, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', CT)
        z.writestr('_rels/.rels', RELS)
        z.writestr('xl/workbook.xml', WB)
        z.writestr('xl/_rels/workbook.xml.rels', WBRELS)
        z.writestr('xl/styles.xml', STYLES)
        z.writestr('xl/sharedStrings.xml', ss)
        z.writestr('xl/worksheets/planilha.xml', folha)
    return destino


if __name__ == '__main__':
    destino = sys.argv[1] if len(sys.argv) > 1 else 'registros.xlsx'
    hoje = datetime.datetime.now().replace(second=0, microsecond=0)
    def mais(d, h=8, m=0):
        x = (hoje + datetime.timedelta(days=d)).replace(hour=h, minute=m)
        return x

    cab = ['Descrição da Saída','Motivo','Nome Colaborador','Departamento',
           'Destino','Data de início','Data de término','Transporte']
    dados = [
        ['Férias','Férias','Tulio','I/H', None, mais(-3,0,0), mais(6,17,0), None],
        ['JPN - Trip for foundry tryout','3YZ','Paiva','NMG','Suzuka', mais(-10,8,15), mais(12,18,0),'Avião'],
        ['Treinamento KUKA','Treinamento','Tanaka; Nakahara','I/H','KUKA Systems', mais(-1,6,0), mais(2,17,0),'Carro'],
        ['VT-MAHLE','Visita técnica','Jefferson Vilela','OUTSOURCE','Mogi Guaçu-SP', mais(3,8,15), mais(3,17,30),'Carro'],
        [('inline','Renovação CNH'),'Saída antecipada','Lenonn','I/H', None, mais(5,14,0), mais(5,17,0), None],
        ['Viagem internacional','Projetos','Nelton M Borges','I/H', None, mais(8,0,0), mais(15,0,0),'Avião'],
    ]
    monta(destino, dados, cab)
    print('gerado:', destino)
