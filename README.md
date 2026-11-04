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
