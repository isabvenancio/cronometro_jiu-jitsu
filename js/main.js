// Ponto de entrada: monta as peças e decide qual tela mostrar pelo endereço.
//   #tv                -> modo TV
//   #controle          -> modo controle (pede o código)
//   #controle/ABCD     -> modo controle já conectando na TV ABCD (link do QR code)
//   (vazio)            -> tela inicial

import { CONFIG_PADRAO } from './config.js';
import { carregar, salvar } from './armazenamento.js';
import { sons, ativarSom } from './som.js';
import { Cronometro } from './cronometro.js';
import { TvHost, ControleCliente } from './conexao.js';
import { $ } from './ui/dom.js';
import { criarTelaTv } from './ui/tv.js';
import { criarTelaControle } from './ui/controle.js';

// ----- peças -----

const cronometro = new Cronometro(carregar('cfg') || CONFIG_PADRAO, {
  sons,
  aoMudar: () => {
    tv.desenhar();
    host.transmitir(cronometro.foto());
  },
});

const host = new TvHost({
  aoReceberComando: comando => {
    if (!tv.ativa) return;
    cronometro.comando(comando);
    if (comando && comando.a === 'config') salvar('cfg', cronometro.cfg);
  },
  aoMudar: () => tv.desenhar(),
  fotoAtual: () => cronometro.foto(),
});

const cliente = new ControleCliente({
  aoReceberEstado: estado => controle.receberEstado(estado),
  aoMudarSituacao: () => controle.desenharSituacao(),
});

const tv = criarTelaTv({ cronometro, host, irPara });
const controle = criarTelaControle({ cliente, irPara });

// ----- navegação -----

let modo = null;

function irPara(destino) {
  if (location.hash.replace('#', '') !== destino) location.hash = destino;
  rotear();
}

function rotear() {
  const destino = decodeURIComponent(location.hash.replace('#', ''));
  let novoModo = null, codigo = null;

  if (destino === 'tv') novoModo = 'tv';
  else if (destino === 'controle' || destino.startsWith('controle/')) {
    novoModo = 'controle';
    const m = destino.match(/^controle\/([A-Za-z0-9]{4})$/);
    codigo = m ? m[1].toUpperCase() : null;
  }

  if (modo === 'tv' && novoModo !== 'tv') tv.sair();
  if (modo === 'controle' && novoModo !== 'controle') controle.sair();
  modo = novoModo;

  $('#picker').hidden = modo !== null;
  $('#tv').hidden = modo !== 'tv';
  $('#ctrl').hidden = modo !== 'controle';

  if (modo === 'tv') tv.entrar();
  if (modo === 'controle') controle.entrar(codigo);
}

$('#pickTv').addEventListener('click', () => { ativarSom(); irPara('tv'); });
$('#pickCtrl').addEventListener('click', () => irPara('controle'));
window.addEventListener('hashchange', rotear);

// ----- laços -----

// 10 vezes por segundo: a TV conta o tempo e redesenha; o celular adianta o espelho
setInterval(() => {
  if (tv.ativa) { cronometro.tique(); tv.desenhar(); }
  else if (controle.ativa) controle.desenhar();
}, 100);

// 1 vez por segundo: a TV manda o estado para os celulares (corrige qualquer atraso)
setInterval(() => {
  if (tv.ativa) host.transmitir(cronometro.foto());
}, 1000);

rotear();
