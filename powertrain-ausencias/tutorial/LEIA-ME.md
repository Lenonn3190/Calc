# Tutorial em .pptx

Gera o `Powertrain-Monitor-Tutorial.pptx` com **prints do sistema rodando de
verdade** — nada é desenhado à mão, então o material envelhece junto com as
telas em vez de descrever uma versão que já não existe.

```
node tutorial/prints.js      abre painel e cadastro num navegador e tira os prints
node tutorial/deck.js        monta o .pptx a partir da pasta tutorial/prints
```

O `prints.js` sobe um servidor igual ao `servir.ps1` e serve uma **agenda de
demonstração calculada em torno de hoje** — sem isso o painel apareceria vazio,
porque as datas do `dados/saidas.csv` de exemplo já passaram. Ele mexe no
`dados/pessoas.csv` e no `dados/frota.csv` durante a captura e **devolve os dois
no fim**, inclusive se morrer no meio.

Precisa de `playwright-core` e `pptxgenjs`. A pasta `prints/` não vai para o
repositório: é gerada.
