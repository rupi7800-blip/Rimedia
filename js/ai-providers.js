/* =========================================================
   Rimedia — servizi AI selezionabili
   Stessa architettura e stesso elenco di Garden Manager AI (js/ai-providers.js):
   priorità ai servizi con piano gratuito utilizzabili dal browser.
   I nomi dei modelli sono modificabili in Impostazioni AI, perché i piani
   gratuiti cambiano spesso.
   ========================================================= */
(function () {
  'use strict';
  var PROVIDERS = {
    gemini: {
      models: ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'],
      label: 'Google Gemini', kind: 'gemini', free: 'gratuito', base: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-flash-latest', needsKey: true, keyUrl: 'https://aistudio.google.com/apikey', keyHint: 'inizia con AIza…',
      note: 'Consigliato. Piano gratuito senza carta di credito (modelli Flash e Flash-Lite). Limiti giornalieri variabili; nel piano gratuito Google può usare i dati per migliorare i servizi.'
    },
    groq: {
      models: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant', 'qwen/qwen3-32b'],
      label: 'Groq (Llama, GPT-OSS…)', kind: 'openai', free: 'gratuito', base: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile', needsKey: true, keyUrl: 'https://console.groq.com/keys', keyHint: 'inizia con gsk_…',
      note: 'Piano gratuito senza carta, molto veloce. Limiti per minuto e per giorno variabili per modello.'
    },
    openrouter: {
      models: ['openrouter/free', 'meta-llama/llama-3.3-70b-instruct:free', 'google/gemma-3-27b-it:free', 'deepseek/deepseek-chat-v3.1:free', 'mistralai/mistral-small-3.2-24b-instruct:free'],
      label: 'OpenRouter (modelli :free)', kind: 'openai', free: 'gratuito con limiti', base: 'https://openrouter.ai/api/v1',
      model: 'openrouter/free', needsKey: true, keyUrl: 'https://openrouter.ai/keys', keyHint: 'inizia con sk-or-…',
      note: 'Un\'unica chiave per molti modelli gratuiti: "openrouter/free" sceglie in automatico un modello gratuito disponibile. Circa 50 richieste al giorno gratuite.'
    },
    huggingface: {
      models: ['meta-llama/Llama-3.3-70B-Instruct', 'Qwen/Qwen2.5-72B-Instruct'],
      label: 'Hugging Face', kind: 'openai', free: 'piccolo credito mensile', base: 'https://router.huggingface.co/v1',
      model: 'meta-llama/Llama-3.3-70B-Instruct', needsKey: true, keyUrl: 'https://huggingface.co/settings/tokens', keyHint: 'inizia con hf_…',
      note: 'Credito gratuito mensile ridotto: adatto come riserva.'
    },
    pollinations: {
      models: ['openai', 'mistral'],
      label: 'Pollinations (anche senza chiave)', kind: 'openai', free: 'gratuito, sperimentale', base: 'https://text.pollinations.ai/openai',
      keyBase: 'https://gen.pollinations.ai/v1', model: 'openai', needsKey: false, keyUrl: 'https://enter.pollinations.ai',
      note: 'Funziona senza chiave ma con limiti stretti (una richiesta alla volta) e affidabilità variabile. Con una chiave gratuita (accesso con GitHub) è più affidabile. Sconsigliato per dati personali.'
    },
    ollama: {
      models: ['llama3.2', 'gemma3', 'qwen2.5'],
      label: 'Ollama (sul tuo computer)', kind: 'openai', free: 'gratuito, locale', base: 'http://localhost:11434/v1',
      model: 'llama3.2', needsKey: false, keyUrl: 'https://ollama.com/download',
      note: 'Modelli eseguiti sul tuo computer: gratuiti e privati. Avvia Ollama con OLLAMA_ORIGINS impostato all\'indirizzo dell\'app.'
    },
    mistral: {
      models: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest', 'open-mistral-nemo'],
      label: 'Mistral AI', kind: 'openai', free: 'a pagamento', base: 'https://api.mistral.ai/v1',
      model: 'mistral-small-latest', needsKey: true, keyUrl: 'https://console.mistral.ai/api-keys',
      note: 'API a pagamento a consumo. Azienda europea, buona qualità in italiano.'
    },
    cerebras: {
      models: ['llama-3.3-70b', 'llama3.1-8b', 'qwen-3-32b', 'gpt-oss-120b'],
      label: 'Cerebras', kind: 'openai', free: 'a pagamento', base: 'https://api.cerebras.ai/v1',
      model: 'llama-3.3-70b', needsKey: true, keyUrl: 'https://cloud.cerebras.ai/',
      note: 'API a pagamento (credito di prova dopo aver inserito un metodo di pagamento).'
    },
    deepseek: {
      models: ['deepseek-chat', 'deepseek-reasoner'],
      label: 'DeepSeek', kind: 'openai', free: 'economico (crediti iniziali)', base: 'https://api.deepseek.com',
      model: 'deepseek-chat', needsKey: true, keyUrl: 'https://platform.deepseek.com/api_keys',
      note: 'API molto economica, a volte con crediti iniziali.'
    },
    openai: {
      models: ['gpt-5-mini', 'gpt-5-nano', 'gpt-4.1-mini', 'gpt-4o-mini'],
      label: 'OpenAI GPT (ChatGPT)', kind: 'openai', free: 'a pagamento', base: 'https://api.openai.com/v1',
      model: 'gpt-5-mini', needsKey: true, keyUrl: 'https://platform.openai.com/api-keys',
      note: 'Nessun piano API gratuito: serve credito prepagato (ChatGPT gratuito non include l\'API).'
    },
    anthropic: {
      models: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
      label: 'Anthropic Claude', kind: 'anthropic', free: 'a pagamento', base: 'https://api.anthropic.com',
      model: 'claude-sonnet-5-5', needsKey: true, keyUrl: 'https://console.anthropic.com/',
      note: 'A pagamento a consumo. Massima qualità per guide e progetti dettagliati. L\'SDK ufficiale viene caricato solo se scegli questo servizio.'
    },
    claudeapp: {
      models: [], label: 'Claude (app aperta dentro Claude)', kind: 'claudeapp', free: 'incluso', base: '',
      model: '', needsKey: false, inApp: true, keyUrl: '',
      note: 'Disponibile solo quando Rimedia è aperta dentro Claude: usa l\'AI dell\'app senza chiave.'
    },
    custom: {
      models: [], label: 'Altro servizio compatibile OpenAI / proxy', kind: 'openai', free: '—', base: '',
      model: '', needsKey: false, keyUrl: '',
      note: 'Qualsiasi servizio con API compatibile OpenAI (LM Studio, Together, SambaNova…) oppure un tuo proxy lato server che custodisce la chiave: indica indirizzo, chiave (se serve) e modello.'
    }
  };

  // Servizi valutati e non inclusi, con il motivo (come in Garden Manager)
  var NOT_INCLUDED = [
    ['Perplexity', 'l\'API Sonar non ha un piano gratuito.'],
    ['Notion AI', 'non offre un\'API pubblica per generare testo.'],
    ['ChatGPT, Copilot, app Gemini', 'le app gratuite non sono utilizzabili da altre applicazioni: serve l\'API.']
  ];

  // prima i servizi gratuiti, poi quelli a pagamento
  var paid = function (id) { return /pagamento|economico/.test(PROVIDERS[id].free); };
  var ids = Object.keys(PROVIDERS);
  var PROVIDER_ORDER = ['claudeapp'].concat(
    ids.filter(function (id) { return !paid(id) && id !== 'custom' && id !== 'claudeapp'; }),
    ids.filter(paid), ['custom']);

  window.RIMEDIA_AI_PROVIDERS = { PROVIDERS: PROVIDERS, PROVIDER_ORDER: PROVIDER_ORDER, NOT_INCLUDED: NOT_INCLUDED };
})();
