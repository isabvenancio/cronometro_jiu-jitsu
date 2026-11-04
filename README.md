# Cronômetro Norte BJJ

Cronômetro de rounds de jiu-jítsu para a academia. A TV mostra o tempo em tela cheia, com a cor da fase, e o celular funciona como controle remoto.

- **Luta:** tela vermelha
- **Descanso:** tela branca
- **Preparação:** tela grafite com números vermelhos
- **Últimos 30 segundos:** borda branca e dois bipes

## Como usar

1. Na TV (ou notebook/Chromecast ligado nela), abra o site e escolha **Esta tela é a TV**. Toque uma vez na tela para liberar o som.
2. A TV mostra um código de 4 letras e um QR code.
3. No celular, aponte a câmera para o QR code. O controle abre já conectado. Também dá para escolher **Este celular é o controle** e digitar o código.

Atalhos de teclado na TV: `espaço` ou `Enter` inicia e pausa, `N` pula fase, `R` zera, `F` tela cheia.

## Estrutura

```
cronometro-norte/
├── index.html              marcação das três telas (início, TV, controle)
├── css/
│   ├── base.css            cores e fontes da Norte, reset, logo, avisos
│   ├── inicio.css          tela inicial
│   ├── tv.css              modo TV e QR code
│   ├── ajustes.css         painel de ajustes do treino
│   └── controle.css        modo controle (celular)
├── js/
│   ├── main.js             ponto de entrada: monta as peças e troca de tela pelo endereço
│   ├── config.js           opções de tempo, faixas IBJJF, valores padrão e validação
│   ├── cronometro.js       motor do cronômetro (fases, contagem, avisos)
│   ├── conexao.js          conexão direta TV ↔ celular com PeerJS
│   ├── som.js              buzina e bipes gerados com Web Audio
│   ├── formato.js          textos da tela (tempo, round, próxima fase)
│   ├── armazenamento.js    preferências salvas no navegador
│   └── ui/
│       ├── dom.js          utilitários de interface
│       ├── ajustes.js      componente de ajustes (usado na TV e no celular)
│       ├── tv.js           tela da TV
│       └── controle.js     tela do celular
├── site.webmanifest        nome, cores e ícones para instalar no celular
└── assets/
    ├── img/
    │   └── logo-norte.svg  logo da Norte BJJ
    └── icons/
        ├── favicon.ico             ícone da aba (16, 32 e 48 px)
        ├── favicon.svg             ícone da aba em vetor (navegadores novos)
        ├── apple-touch-icon.png    ícone na tela inicial do iPhone (180 px)
        ├── icon-192.png            ícone Android
        ├── icon-512.png            ícone Android / tela de abertura
        └── icon-maskable-512.png   ícone Android com margem para recorte redondo
```

### Endereços

| Endereço | Tela |
| --- | --- |
| `/` | tela inicial |
| `/#tv` | modo TV |
| `/#controle` | controle pedindo o código |
| `/#controle/ABCD` | controle já conectando na TV `ABCD` (é o link do QR code) |

## Como funciona

- A **TV conta o tempo**. O motor fica em `js/cronometro.js` e roda só nela.
- Ao abrir, a TV gera um código e se registra no servidor público do PeerJS, que só apresenta os aparelhos um ao outro.
- O celular se conecta pelo código. A partir daí, os dados vão direto entre os aparelhos (WebRTC): o celular manda comandos (`toggle`, `reset`, `skip`, `config`) e a TV devolve o estado a cada segundo.
- Se a conexão cair, o cronômetro continua na TV e o celular reconecta sozinho.
- O código da TV fica salvo no navegador, então o QR code não muda entre os treinos. O botão **Novo código** gera outro.

## Logo e ícones

O logo em `assets/img/logo-norte.svg` é o mesmo do site da Norte BJJ. Os ícones em `assets/icons/` foram gerados a partir dele, com um fundo preto arredondado para continuar visível em abas claras e escuras.

Com o `site.webmanifest`, o celular oferece **Adicionar à tela inicial**. O controle abre como um app, em tela cheia, com o ícone da Norte.

## Rodar no computador

Os arquivos de JavaScript são módulos (`type="module"`), então abrir o `index.html` com dois cliques não funciona. Use um servidor local:

- **VS Code:** extensão Live Server, botão "Go Live".
- **Terminal:** `python -m http.server` dentro da pasta e abra `http://localhost:8000`.

O QR code só funciona com o site hospedado (endereço `https`), porque o celular precisa conseguir abrir o link.

## Publicar no GitHub Pages

1. Crie um repositório público e envie todos os arquivos desta pasta, mantendo as pastas.
2. Em **Settings → Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e salve.
3. Em 1 ou 2 minutos o site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

Para atualizar, envie os arquivos alterados para o mesmo repositório.

## Dependências externas

- [PeerJS 1.5.4](https://peerjs.com/) — conexão entre aparelhos
- [qrcodejs 1.0.0](https://github.com/davidshimjs/qrcodejs) — desenho do QR code
- Google Fonts — Anton e Inter
