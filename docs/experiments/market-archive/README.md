# Tidligere aktiemarkedseksperimenter

Kopi af de 20 lokale simulationsfiler og visninger fundet 25. november 2026. Originalernes navne, størrelser og SHA-256 findes i `manifest.json`. Store JSON-filer er komprimeret tabsfrit med gzip; filerne er ellers uændrede. Tidligere forsøg er historik, ikke vedtagne regler eller implementeret handel.

Gendan alle originaler til en lokal analysemappe fra repoets rod:

```sh
node docs/experiments/market-archive/restore.mjs
```

Det gendanner til `.data/market-archive/`, kontrollerer alle checksums og overskriver ikke ændrede filer. En anden destinationsmappe kan gives som argument. De gamle Python-scripts forventer JSON-filerne ved siden af sig og kræver Python og NumPy. De to HTML-visninger indeholder prøveforløb: `market-simulation.html` og `market-v2.html`. Deres indlejrede data er demonstrationer, ikke appens aktuelle kurser.

- `simulate-market.py`: oprindeligt marked med fast grundkurs.
- `test-market-trading.py`: handelsstrategier og variant med vandrende balancepunkt.
- `simulate-market-v2.py`: uden tilbagevenden til grundkurs, med gevinstgebyr.
- `simulate-market-growth.py`: parrede forsøg med tre vækstmodeller.
- `market-growth-20261101.json` og `market-growth-20261102.json`: fulde resultater med kurver; de mindre, allerede eksisterende sammenfatninger findes i `../market-growth/`.
- `build-market-view.py`, `build-market-v2-view.py` og `market-template.html`: kode og skabelon til de tidligere visninger.

Genkørsel af et helt simulationsår er ikke nødvendig for at læse resultaterne. Parametre, seeds og metodiske forbehold er samlet i [arbejdsgrundlaget](../../aktiemarked-3.0.md).
