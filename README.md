# Rimedia — non buttare, trasforma

Web app (PWA statica, senza build) per recupero, riutilizzo, riparazione, trasformazione e autoproduzione.

## Struttura

| File | Contenuto |
|---|---|
| `index.html` | interfaccia, viste, contenuti originali, motore abbinamenti, ricerca, profilo, quaderno |
| `contenuti/*.js` | contenuti aggiunti nella versione 2 (ricette, autoproduzione, riciclo, bricolage, tisane, orto, risparmio). I contenuti originali restano in `index.html` e non sono modificati |
| `js/ai-providers.js`, `js/ai.js` | motore AI multi-servizio, stessa architettura di Garden Manager AI |
| `vendor/anthropic-sdk.js` | SDK ufficiale Claude, caricato solo se si sceglie Claude |
| `aggiornamenti.js`, `version.json` | avviso di nuova versione |

## Rimedia AI

- Servizi: Google Gemini, Groq, OpenRouter, Hugging Face, Pollinations, Ollama, Mistral, Cerebras, DeepSeek, OpenAI, Claude, qualsiasi servizio compatibile OpenAI (anche un proxy lato server), Claude dell'app quando Rimedia è aperta dentro Claude.
- Un servizio principale e servizi di riserva usati in automatico (quota esaurita, errore, servizio occupato).
- Configurazione in `localStorage["rimedia_ai_v2"]`; la vecchia configurazione `rimedia_ai` viene convertita automaticamente e non viene cancellata.
- Le chiavi restano nel dispositivo: non sono nel codice, non sono sincronizzate e non entrano nel backup.
- Ogni scheda e ogni sezione ha "Chiedi a Rimedia AI": il contenuto della scheda e il profilo dell'utente vengono inviati automaticamente come contesto.

## Dati dell'utente

`localStorage["rimedia"]` (e sincronizzazione quando l'app gira dentro Claude): dispensa, spesa, piano, quaderno (anche risposte AI), profilo, cronologia e preferenze. Esportazione e importazione dal Profilo.
