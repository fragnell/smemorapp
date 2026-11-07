# Smemorapp

Web app (PWA) per il ministero di casa in casa: schemi di **citofoni** e **pianerottoli** su cui segnare
**A** (assente), **N** (non interessato) e **V** (visita ulteriore, con nota).

- Nessun dato personale: solo segni, etichette (es. numero interno) e note brevi.
- I dati restano sul telefono (localStorage). Backup con *Esporta/Importa* nella pagina impostazioni.
- Dopo l'installazione funziona anche offline.

## Come si usa
1. **Nuovo palazzo** → indirizzo.
2. **Citofono**: crea lo schema (numero di pulsanti e colonne), scegli lo strumento A/N/V e tocca i pulsanti.
   Tieni premuto un pulsante per aggiungere una nota.
3. **Piani**: aggiungi i piani partendo da uno schema già pronto (2, 3 o 4 porte, corridoio…).
   Nel piano trascina porte, scale, ascensore, finestre e riferimenti dove sono davvero; con A/N/V tocca le porte.
   Con le frecce in alto passi al piano sopra o sotto.
4. **Nuovo giro**: toglie tutti gli A del palazzo e lascia N e V.
5. Ogni modifica si può annullare dal messaggio in basso.
6. **Note**: in fondo al civico trovi tutte le note in ordine di pulsante (o di piano e porta); toccane una per leggerla e modificarla.
7. **Condividi** (icona in alto nel civico o nella piantina):
   - *Immagini* con schema, A/N/V e note, per chi non usa l'app;
   - *Testo* con lo stesso contenuto;
   - *Link per l'app*: un messaggio con un link che contiene le note. Chi usa Smemorapp lo tocca e le importa.
     Se il link si apre fuori dall'app (es. su iPhone in Safari): copia il messaggio, apri Smemorapp,
     tocca ⬇ "Importa note ricevute" e poi "Incolla".
     Le note si aggiungono ai suoi dati (se aveva già quel civico o quella piantina, vengono aggiornati).
     La foto della piantina non è nel link: va con le immagini, oppure con "invia come file".

## Provarla sul computer
```bash
python -m http.server 5173
```
Poi apri http://localhost:5173

## Metterla sul telefono
Serve un indirizzo **https** (richiesto per l'installazione e per l'uso offline). Il modo più semplice:
- **Netlify Drop** (https://app.netlify.com/drop): trascina la cartella del progetto e ottieni un link.
- oppure **GitHub Pages**.

Apri il link dal telefono e scegli *Installa app* (Android) o *Aggiungi alla schermata Home* (iPhone).
Quando aggiorni i file, aumenta il numero `VERSION` dentro `sw.js`: è quello che fa scaricare al telefono la nuova versione.
Senza questo passaggio il telefono continua a usare la copia salvata.
