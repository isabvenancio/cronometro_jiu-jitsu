// Tela da TV: cronômetro em tela cheia, QR code para o celular e painel de botões.

import { $, desenharDigitos, aviso } from './dom.js';
import { montarAjustes } from './ajustes.js';
import {
  formatarTempo, nomeFase, textoRound, textoProximo, textoAviso,
  progresso, estaPausado, textoBotaoPrincipal,
} from '../formato.js';
import { ativarSom, somLiberado, somLigado, alternarSom } from '../som.js';
import { peerDisponivel } from '../conexao.js';
import { salvar } from '../armazenamento.js';

export function criarTelaTv({ cronometro, host, irPara }) {
  const tela = $('#tv');
  const painel = $('#dock');
  const folhaAjustes = $('#tvSheet');
  let ativa = false;
  let travaTela = null;
  let timerPainel = null;
  let rascunho = null;
  let qrDesenhado = null;

  // ----- QR code -----

  function urlDoControle(codigo) {
    return location.href.split('#')[0] + '#controle/' + codigo;
  }

  function desenharQr() {
    if (qrDesenhado === host.codigo) return;
    qrDesenhado = host.codigo;
    const caixa = $('#tvQr');
    caixa.textContent = '';
    $('#tvCodeTxt').textContent = host.codigo || '····';
    if (location.protocol === 'file:') {
      caixa.textContent = 'Hospede o site para usar o QR code';
      caixa.classList.add('tv-qr-aviso');
      return;
    }
    if (host.codigo && window.QRCode) {
      try {
        new window.QRCode(caixa, {
          text: urlDoControle(host.codigo), width: 256, height: 256,
          colorDark: '#0D0D0D', colorLight: '#FFFFFF', correctLevel: window.QRCode.CorrectLevel.M,
        });
      } catch (e) { /* sem QR, o código digitado continua funcionando */ }
    }
  }

  // ----- desenho -----

  function desenhar() {
    if (!ativa) return;
    const s = cronometro.estado;
    tela.dataset.phase = s.phase;
    tela.classList.toggle('paused', estaPausado(s));
    tela.classList.toggle('warn', s.phase === 'work' && s.warned);

    desenharDigitos($('#tvTime'), formatarTempo(s.remaining));
    $('#tvPhase').textContent = nomeFase(s);
    $('#tvRound').textContent = textoRound(s);
    $('#tvFlag').textContent = textoAviso(s);
    $('#tvNext').textContent = textoProximo(s, peerDisponivel()
      ? 'Leia o QR code com o celular ou aperte espaço para iniciar'
      : 'Barra de espaço inicia · N pula fase · R zera');
    $('#tvBar').style.width = (progresso(s) * 100).toFixed(2) + '%';

    desenharBolinhas(s);
    desenharQr();

    const n = host.controles;
    const selo = $('#tvLink');
    selo.classList.toggle('ok', n > 0);
    selo.querySelector('span').textContent =
      !peerDisponivel() ? 'Sem internet · só nesta tela'
      : n > 1 ? n + ' controles · ' + host.codigo
      : n === 1 ? 'Controle conectado · ' + host.codigo
      : host.pronta ? 'Código ' + host.codigo
      : 'Conectando…';

    const mostrarCodigo = peerDisponivel() && (s.phase === 'idle' || s.phase === 'done' || n === 0);
    $('#tvCodeCard').hidden = !mostrarCodigo;
    tela.classList.toggle('has-code', mostrarCodigo);

    $('#dToggle').textContent = textoBotaoPrincipal(s);
    $('#dMute').textContent = 'Som: ' + (somLigado() ? 'ligado' : 'desligado');
    $('#tvSound').hidden = !somLigado() || somLiberado();
  }

  // uma bolinha por round: cheia = concluído, contornada = em andamento
  function desenharBolinhas(s) {
    const caixa = $('#tvDots');
    const n = s.cfg.rounds;
    const chave = n + '|' + s.round + '|' + s.phase;
    if (caixa.dataset.k === chave) return;
    caixa.dataset.k = chave;
    caixa.textContent = '';
    if (!n || n > 12) return;
    for (let i = 1; i <= n; i++) {
      const b = document.createElement('i');
      const concluido = s.phase === 'done' || i < s.round || (i === s.round && s.phase === 'rest');
      if (concluido) b.className = 'on';
      else if (i === s.round && s.phase === 'work') b.className = 'cur';
      caixa.appendChild(b);
    }
  }

  // ----- painel de botões (some sozinho durante o round) -----

  function mostrarPainel() {
    painel.classList.remove('hide');
    clearTimeout(timerPainel);
    timerPainel = setTimeout(() => {
      if (cronometro.estado.running && folhaAjustes.hidden) painel.classList.add('hide');
    }, 3500);
  }

  async function manterTelaLigada() {
    try {
      if (navigator.wakeLock && document.visibilityState === 'visible' && ativa) {
        travaTela = await navigator.wakeLock.request('screen');
      }
    } catch (e) { /* navegador não deixou */ }
  }

  function telaCheia() {
    try {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => aviso('Este navegador não deixou abrir em tela cheia.'));
      } else aviso('Este navegador não tem tela cheia.');
    } catch (e) { /* ignora */ }
  }

  function abrirAjustes() {
    rascunho = { ...cronometro.cfg };
    montarAjustes($('#tvCfg'), () => rascunho, v => { rascunho = v; });
    folhaAjustes.hidden = false;
    mostrarPainel();
  }

  // ----- eventos -----

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') manterTelaLigada();
  });

  tela.addEventListener('pointerdown', () => { ativarSom(); mostrarPainel(); desenhar(); });
  tela.addEventListener('pointermove', mostrarPainel);

  // Teclado (e controle remoto da TV): espaço/OK inicia e pausa, N pula, R zera, F tela cheia
  document.addEventListener('keydown', e => {
    if (!ativa) return;
    ativarSom();
    mostrarPainel();
    if (!folhaAjustes.hidden) {
      if (e.key === 'Escape') folhaAjustes.hidden = true;
      return;
    }
    const emBotao = e.target && e.target.tagName === 'BUTTON';
    if ((e.key === ' ' || e.key === 'Enter') && !emBotao) { e.preventDefault(); cronometro.comando({ a: 'toggle' }); }
    else if (e.key === 'r' || e.key === 'R') cronometro.comando({ a: 'reset' });
    else if (e.key === 'n' || e.key === 'N' || e.key === 'ArrowRight') cronometro.comando({ a: 'skip' });
    else if (e.key === 'f' || e.key === 'F') telaCheia();
  });

  $('#dToggle').addEventListener('click', () => cronometro.comando({ a: 'toggle' }));
  $('#dReset').addEventListener('click', () => cronometro.comando({ a: 'reset' }));
  $('#dSkip').addEventListener('click', () => cronometro.comando({ a: 'skip' }));
  $('#dCfg').addEventListener('click', abrirAjustes);
  $('#dMute').addEventListener('click', () => { alternarSom(); desenhar(); });
  $('#dCode').addEventListener('click', () => { host.iniciar(true); aviso('Novo código: ' + host.codigo); });
  $('#dFull').addEventListener('click', telaCheia);
  $('#dExit').addEventListener('click', () => irPara(''));
  $('#sheetClose').addEventListener('click', () => { folhaAjustes.hidden = true; });
  $('#tvApply').addEventListener('click', () => {
    cronometro.comando({ a: 'config', cfg: rascunho });
    salvar('cfg', cronometro.cfg);
    folhaAjustes.hidden = true;
  });

  return {
    get ativa() { return ativa; },
    desenhar,
    entrar() {
      ativa = true;
      if (!host.peer) host.iniciar(false);
      manterTelaLigada();
      mostrarPainel();
      desenhar();
    },
    sair() {
      ativa = false;
      host.parar();
      if (travaTela) { travaTela.release().catch(() => {}); travaTela = null; }
    },
  };
}
