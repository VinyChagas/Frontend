import "../styles/Validador.scss";
import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import * as XLSX from "xlsx";
// import { CheckCircle } from "@phosphor-icons/react";
// import {XCircle, Loader2 } from "lucide-react";

// Base da API (permite sobrescrever via Vite env)
const API_BASE_URL: string = (import.meta as any)?.env?.VITE_API_URL || "http://localhost:4000";

// Tipos de dados
// interface Empresa { // Removida pois não é mais usada
//   nome: string;
//   cnpj: string;
//   clientes: number;
// }

interface Linha {
  linha: number;
  empresa?: string;
  CNPJ?: string;
  usuario?: string;
  senha?: string;
  procurador?: string;
  presumido?: string;
  responsavel?: string;
  codSistema?: string;
  mes?: string;
  ano?: string;
  IM?: string;
  status?: string;
  captchaImg?: string;
  motivo?: string;
  mensagemErro?: string;
  // Progresso individual
  progressPercent?: number; // 0..100
  stepIndex?: number;
  stepTotal?: number;
  stepName?: string;
  isFinalizada?: boolean;
  resultadoFinal?: 'sucesso' | 'erro';
  // Progresso exibido suavizado (removido - voltando ao comportamento anterior)
}

interface ProgressoEvent extends Partial<Linha> {
  linha: number;
  status: string;
  captchaBase64?: string;
  // Campos alternativos que o backend pode enviar
  progressPercent?: number;
  percent?: number;
  progresso?: number;
  stepIndex?: number;
  stepTotal?: number;
  stepName?: string;
  isFinal?: boolean;
}

interface CaptchaEvent {
  linha: number;
  imagem: string;
}

const socket = io(API_BASE_URL);

export default function Validador() {
  // Remove a dependência da empresa - agora é uma tela padrão
  const [linhasAtivas, setLinhasAtivas] = useState<Linha[]>([]);
  const [linhasComErro, setLinhasComErro] = useState<Linha[]>([]);
  const [respostaCaptcha, setRespostaCaptcha] = useState<Record<number,string>>({});
  const [captchaImgBase64, setCaptchaImgBase64] = useState<string | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [linhaCaptchaAtual, setLinhaCaptchaAtual] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [globalProgress, setGlobalProgress] = useState<number>(0);
  const [statusAutomacao, setStatusAutomacao] = useState<{ pausada: boolean; parada: boolean }>({ pausada: false, parada: false });
  const [todasLinhasImportadas, setTodasLinhasImportadas] = useState<Linha[]>([]);
  const [modoExecucao, setModoExecucao] = useState<'manual' | 'automatico'>('manual');

  // Carregar configuração ativa para determinar o modo de execução
  useEffect(() => {
    const ativaKey = localStorage.getItem('configuracaoAtiva') || 'padrao';
    try {
      const rawCfg = localStorage.getItem('configuracoesSistema');
      if (rawCfg) {
        const allCfg = JSON.parse(rawCfg);
        const configAtiva = allCfg?.[ativaKey] || allCfg?.padrao || null;
        if (configAtiva?.validacao?.modoExecucao) {
          setModoExecucao(configAtiva.validacao.modoExecucao);
        }
      }
    } catch (error) {
      console.log('Erro ao carregar configuração:', error);
    }
  }, []);

  // Função para traduzir status em descrições amigáveis
  const getEtapaDescricao = (status: string | undefined): string => {
    if (!status) return '';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('login')) return 'Realizando login';
    if (statusLower.includes('captcha')) return 'Aguardando captcha';
    if (statusLower.includes('procurador')) return 'Conferindo procurador';
    if (statusLower.includes('cnpj')) return 'Validando CNPJ';
    if (statusLower.includes('carregando')) return 'Carregando sistema';
    if (statusLower.includes('sucesso')) return 'Processo concluído';
    if (statusLower.includes('erro')) return 'Erro no processo';
    if (statusLower.includes('nova senha')) return 'Nova senha necessária';
    if (statusLower.includes('validação')) return 'Validando dados';
    
    return status; // Retorna o status original se não encontrar match
  };

  // Função para verificar o status da automação
  const verificarStatusAutomacao = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/status-automacao`);
      if (res.ok) {
        const status = await res.json();
        setStatusAutomacao(status);
      }
    } catch (error) {
      console.error('Erro ao verificar status da automação:', error);
    }
  };

  // Verifica o status da automação periodicamente
  useEffect(() => {
    const interval = setInterval(verificarStatusAutomacao, 2000); // Verifica a cada 2 segundos
    return () => clearInterval(interval);
  }, []);

// Captura o captcha enviado pelo backend via socket e exibe para o usuário
useEffect(() => {
  function handleCaptcha(data: CaptchaEvent) {
    // Só processa captcha se estiver no modo manual
    if (modoExecucao === 'manual') {
      // Se for o mesmo captcha (mesma linha), só atualiza a imagem e limpa o input
      setCaptchaImgBase64(data.imagem);
      setCaptchaInput("");
      setLinhaCaptchaAtual((linhaAtual) => {
        // Se for um novo captcha para a mesma linha, mantém a linha
        if (linhaAtual === data.linha) return linhaAtual;
        // Se for para outra linha, atualiza
        return data.linha;
      });
    }
  }
  socket.on("captcha", handleCaptcha);
  return () => {
    socket.off("captcha", handleCaptcha);
  };
}, [modoExecucao]);

// Função para enviar a resposta do captcha para o backend via socket
function enviarCaptchaParaBackend(valor?: string) {
  // Só envia captcha se estiver no modo manual
  if (modoExecucao === 'manual') {
    const resposta = valor !== undefined ? valor : captchaInput;
    if (resposta && resposta.length === 5 && linhaCaptchaAtual != null) {
      socket.emit("captcha-resposta", {
        linha: linhaCaptchaAtual,
        resposta
      });
      // Não limpa o estado aqui! Só limpa quando o backend retornar sucesso para a linha
    }
  }
}


// Consolidado: único useEffect para socket.on("progresso")
useEffect(() => {
  function handleProgresso(info: ProgressoEvent) {
    const { linha, status } = info;
    setLinhasAtivas((prevAtivas) => {
      // calcula percent
      let percentFromInfo: number | undefined = undefined;
      if (typeof info.progressPercent === 'number') percentFromInfo = info.progressPercent;
      else if (typeof info.percent === 'number') percentFromInfo = info.percent;
      else if (typeof info.progresso === 'number') percentFromInfo = info.progresso;
      else if (typeof info.stepIndex === 'number' && typeof info.stepTotal === 'number' && info.stepTotal! > 0) {
        percentFromInfo = (info.stepIndex! / info.stepTotal!) * 100;
      }

      const lowerStatus = (status || '').toLowerCase();
      const isFinalFromStatus = /(final|conclu|empresa validada|completo|terminad)/i.test(status || '');
      const isSuccessFromStatus = /(sucesso|conclu|ok)/i.test(status || '');
      const isErrorFromStatus = /(erro|falha|inválid|inval|fracass|nova senha)/i.test(status || '');
      const isFinal = Boolean(info.isFinal || isFinalFromStatus);

      // fallback baseado em estágios quando não veio percent
      let fallbackPercent: number | undefined = undefined;
      if (percentFromInfo === undefined) {
        if (lowerStatus.includes('login')) fallbackPercent = 25;
        else if (lowerStatus.includes('valid')) fallbackPercent = 75; // validação
        else if (lowerStatus.includes('captcha')) fallbackPercent = 10;
        else if (lowerStatus.includes('carregando')) fallbackPercent = 50;
      }

      let atualizadas = prevAtivas.map((l) =>
        l.linha === linha
          ? {
              ...l,
              status,
              captchaImg: info.captchaBase64 || l.captchaImg,
              stepIndex: info.stepIndex ?? l.stepIndex,
              stepTotal: info.stepTotal ?? l.stepTotal,
              stepName: info.stepName ?? l.stepName,
              progressPercent: (() => {
                const base = percentFromInfo ?? l.progressPercent ?? fallbackPercent ?? 0;
                const bounded = Math.max(0, Math.min(100, Math.round(base)));
                if (isFinal) return 100;
                // Evita 100% antes do final
                return Math.min(bounded, 99);
              })(),
              isFinalizada: isFinal || l.isFinalizada,
              resultadoFinal: isFinal
                ? (isErrorFromStatus ? 'erro' : (isSuccessFromStatus ? 'sucesso' : l.resultadoFinal))
                : l.resultadoFinal,
              // Remove displayedProgress fix
            }
          : l
      );

      if (status.toLowerCase().includes("sucesso")) {
        // Se for sucesso para a linha do captcha, limpa o estado de captcha (apenas no modo manual)
        if (linhaCaptchaAtual === linha && modoExecucao === 'manual') {
          setCaptchaImgBase64(null);
          setCaptchaInput("");
          setLinhaCaptchaAtual(null);
        }
        // Mantém a ordem original das linhas (não reordena para o final)
        return atualizadas;
      }
      // Se for erro, só remove da lista se NÃO for a linha do captcha atual (apenas no modo manual)
      if (status.toLowerCase().includes("erro") || status.toLowerCase().includes("nova senha")) {
        if (linhaCaptchaAtual === linha && modoExecucao === 'manual') {
          // Mantém a linha para permitir nova tentativa de captcha
          return atualizadas;
        }
        // Remove da lista de ativas normalmente para outros casos
        return atualizadas.filter((l) => l.linha !== linha);
      }
      return atualizadas;
    });
    // Se for erro, adiciona em linhasComErro
    if (status.toLowerCase().includes("erro") || status.toLowerCase().includes("nova senha")) {
      setLinhasComErro((erroAntigo) => {
        const jaExiste = erroAntigo.some((l) => l.linha === linha);
        if (jaExiste) return erroAntigo;
        return [...erroAntigo, { ...info }];
      });
    }
  }
  socket.on("progresso", handleProgresso);
  return () => {
    socket.off("progresso", handleProgresso);
  };
}, [linhaCaptchaAtual, modoExecucao]);

// Progresso global baseado na média dos percentuais por linha
useEffect(() => {
  if (!linhasAtivas || linhasAtivas.length === 0) {
    setGlobalProgress(0);
    return;
  }
  const percents = linhasAtivas.map((l) => {
    if (l.isFinalizada) return 100;
    if (typeof l.progressPercent === 'number') return Math.min(l.progressPercent, 99);
    if (l.status?.toLowerCase().includes('carregando')) return 50;
    if (l.status?.toLowerCase().includes('captcha')) return 10;
    return 0;
  });
  const avg = percents.reduce((a, b) => a + b, 0) / percents.length;
  setGlobalProgress(Math.round(avg));
}, [linhasAtivas]);

// Removida a simulação de números aleatórios


useEffect(() => {
  // Carrega dados de validação padrão em vez de dados de empresa
  fetch(`${API_BASE_URL}/api/validador-dados`)
    .then((res) => res.json())
    .then((dados) => {
      if (Array.isArray(dados) && dados.length > 0) {
        console.log('✅ [FRONTEND] Dados de validação padrão carregados:', dados.length, 'linhas');
        setTodasLinhasImportadas(dados);
        // Não ativa automaticamente, apenas carrega os dados importados
      } else {
        console.log('ℹ️ [FRONTEND] Nenhum dado de validação padrão encontrado.');
      }
    })
    .catch(() => {
      console.log('ℹ️ [FRONTEND] Nenhum arquivo de validação padrão encontrado (primeira execução).');
    });
}, []);

  function handleImportarClick() {
    // Usa ref para evitar query por id
    fileInputRef.current?.click();
  }

function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (file) {
    console.log('📁 [FRONTEND] Arquivo selecionado:', file.name, 'Tamanho:', file.size, 'bytes');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        console.log('📖 [FRONTEND] Arquivo lido com sucesso, processando...');
        
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        console.log('📊 [FRONTEND] Dados convertidos para Uint8Array, tamanho:', data.length);
        
        const workbook = XLSX.read(data, { type: "array" });
        console.log('📋 [FRONTEND] Workbook criado, planilhas:', workbook.SheetNames);
        
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        console.log('📝 [FRONTEND] Linhas extraídas:', rows.length);

        // Processa localmente para exibir imediatamente
        const linhasProcessadas = (rows as any[]).map((row: any, index: number) => ({
          linha: index + 2,
          procurador: row["Procurador"]?.toUpperCase() || "",
          presumido: row["Presumido"]?.toUpperCase() || "",
          empresa: row["empresa"] || "",
          CNPJ: row["CNPJ"] || "",
          usuario: row["usuario"] || "",
          senha: row["senha"] || "",
          status: "",
          captchaImg: "",
        }));
        
        console.log('✅ [FRONTEND] Linhas processadas:', linhasProcessadas.length);
        console.log('📋 [FRONTEND] Primeira linha de exemplo:', linhasProcessadas[0]);
        
        setTodasLinhasImportadas(linhasProcessadas);
        setLinhasAtivas([]); // não ativa automaticamente
        
        // Salva automaticamente no backend usando o novo endpoint
        try {
          const res = await fetch(`${API_BASE_URL}/api/salvar-validador`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              dados: linhasProcessadas,
            }),
          });

          const resultado = await res.json();
          if (resultado.sucesso) {
            console.log('✅ [FRONTEND] Planilha salva automaticamente no backend');
          } else {
            console.warn('⚠️ [FRONTEND] Não foi possível salvar automaticamente:', resultado.erro);
          }
        } catch (error) {
          console.warn('⚠️ [FRONTEND] Erro ao salvar automaticamente:', error);
        }
        
        // Feedback para o usuário
        alert(`✅ Planilha importada com sucesso! ${linhasProcessadas.length} linhas carregadas. Clique em "Ativar Linhas" para começar a validação.`);
        
      } catch (error) {
        console.error('❌ [FRONTEND] Erro ao processar planilha:', error);
        alert('❌ Erro ao processar a planilha. Verifique se o formato está correto.');
      }
    };
    
    reader.onerror = (error) => {
      console.error('❌ [FRONTEND] Erro ao ler arquivo:', error);
      alert('❌ Erro ao ler o arquivo selecionado.');
    };
    
    reader.readAsArrayBuffer(file);
  } else {
    console.log('⚠️ [FRONTEND] Nenhum arquivo selecionado');
  }
  e.target.value = "";
}

// Função para ativar as linhas importadas
const ativarLinhasImportadas = () => {
  if (todasLinhasImportadas.length === 0) {
    alert('❌ Nenhuma planilha foi importada ainda.');
    return;
  }
  
  setLinhasAtivas(todasLinhasImportadas);
  alert(`✅ ${todasLinhasImportadas.length} linhas ativadas para validação!`);
};

// Função antiga de resolver captcha via REST removida (agora via socket e card manual)

  const executarValidacao = async () => {
  try {
    console.log('🚀 [FRONTEND] Iniciando validação...');
    
    // Primeiro, reseta os controles para permitir nova execução
    if (statusAutomacao.parada || statusAutomacao.pausada) {
      console.log('🔄 [FRONTEND] Resetando controles antes de executar...');
      try {
        const resReset = await fetch(`${API_BASE_URL}/api/resetar-controles`, { 
          method: "POST" 
        });
        if (resReset.ok) {
          const resultadoReset = await resReset.json();
          console.log('✅ [FRONTEND] Controles resetados:', resultadoReset.mensagem);
          // Atualiza o status local
          setStatusAutomacao({ pausada: false, parada: false });
        } else {
          console.warn('⚠️ [FRONTEND] Não foi possível resetar controles, mas continuando...');
        }
      } catch (error) {
        console.warn('⚠️ [FRONTEND] Erro ao resetar controles, mas continuando:', error);
      }
    }

    // Captura configurações completas da tela de Parâmetros
    const ativaKey = localStorage.getItem('configuracaoAtiva') || 'padrao';
    let configuracoesSelecionadas: any = null;
    try {
      const rawCfg = localStorage.getItem('configuracoesSistema');
      if (rawCfg) {
        const allCfg = JSON.parse(rawCfg);
        configuracoesSelecionadas = allCfg?.[ativaKey] || allCfg?.padrao || null;
      }
    } catch {}

    console.log('🚀 [FRONTEND] Parâmetros:', {
      contabilidade: "empresa_padrao",
      modoLogin: modoExecucao === 'automatico' ? "Automatico" : "Manual",
      modoResolucao: "FHD",
      modoDepuracao: false,
      qtdNavegadores: configuracoesSelecionadas?.validacao?.numeroNavegadores || 'Padrão'
    });

    const res = await fetch(`${API_BASE_URL}/executar-validacao`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contabilidade: "empresa_padrao",
        modoLogin: modoExecucao === 'automatico' ? "Automatico" : "Manual",
        modoResolucao: "FHD",
        modoDepuracao: false,
        linhas: linhasAtivas.map(l => l.linha), // Envia linhas específicas se houver
        configuracaoAtiva: ativaKey,
        configuracoes: configuracoesSelecionadas
      }),
    });

    const resultado = await res.json();
    console.log('🚀 [FRONTEND] Resposta do backend:', resultado);

    if (resultado.sucesso) {
      const qtdNav = configuracoesSelecionadas?.validacao?.numeroNavegadores || 'padrão';
      const modoTexto = modoExecucao === 'automatico' ? 'automático' : 'manual';
      alert(`✅ Validação iniciada com sucesso! O sistema usará ${qtdNav} navegadores em modo ${modoTexto} conforme configurado.`);
      // Atualiza o status para mostrar que está ativa
      setStatusAutomacao({ pausada: false, parada: false });
    } else {
      alert("❌ Erro ao iniciar validação: " + (resultado.erro || 'Erro desconhecido'));
    }
  } catch (error) {
    console.error("❌ [FRONTEND] Erro ao executar validação:", error);
    alert("❌ Erro ao executar validação: " + (error instanceof Error ? error.message : 'Erro desconhecido'));
  }
};

  const salvarNoBackend = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/salvar-validador`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dados: linhasAtivas,
      }),
    });

    const resultado = await res.json();

    if (resultado.sucesso) {
      alert('✅ JSON salvo com sucesso no backend!');
    } else {
      alert('Erro ao salvar JSON: ' + resultado.erro);
    }
  } catch (err) {
    console.error('Erro ao salvar JSON no backend:', err);
    alert('Erro ao salvar JSON no backend.');
  }
};

function renderTabela(linhas: Linha[]) {
  return (
    <div>
      <table className="validador-tabela">
        <thead>
          <tr>
            <th>Linha</th>
            <th>Procurador</th>
            <th>Presumido</th>
            <th>Empresa</th>
            <th>CNPJ</th>
            <th>Progresso</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <React.Fragment key={linha.linha}>
              <tr
                className={`validador-tabela-row ${
                  linha.status?.toLowerCase().includes("sucesso")
                    ? "status-sucesso"
                    : linha.status?.toLowerCase().includes("erro")
                    ? "status-erro"
                    : linha.status === "carregando"
                    ? "status-carregando"
                    : ""
                }`}
              >
                <td>
                  <div className="validador-tabela-circulo">{linha.linha}</div>
                </td>
                <td>
                  <span className={`icone-status ${linha.procurador === 'SIM' ? 'verde' : 'cinza'}`}>
                    {linha.procurador === 'SIM' ? '✔' : ''}
                  </span>
                </td>
                <td>
                  <span className={`icone-status ${linha.presumido === 'SIM' ? 'verde' : 'cinza'}`}>
                    {linha.presumido === 'SIM' ? '✔' : ''}
                  </span>
                </td>
                <td>{linha.empresa?.toString().slice(0, 23)}</td>
                <td>{linha.CNPJ}</td>
                {/* Progresso da linha */}
                <td>
                  <div className="validador-row-progress">
                    <div className="validador-progress-track">
                      <div
                        className={`validador-progress-bar ${
                          linha.isFinalizada && linha.resultadoFinal === 'erro'
                            ? 'erro'
                            : linha.isFinalizada && linha.resultadoFinal === 'sucesso'
                            ? 'sucesso'
                            : 'carregando'
                        }`}
                        style={{ width: `${Math.max(0, Math.min(100, (linha.isFinalizada ? 100 : (linha.progressPercent ?? (linha.status?.toLowerCase().includes('carregando') ? 50 : linha.status?.toLowerCase().includes('captcha') ? 10 : 0)))))}%` }}
                      />
                    </div>
                    <span className="validador-progress-label">
                      {Math.round(Math.max(0, Math.min(100, (linha.isFinalizada ? 100 : (linha.progressPercent ?? (linha.status?.toLowerCase().includes('carregando') ? 50 : linha.status?.toLowerCase().includes('captcha') ? 10 : 0))))))}%
                    </span>
                  </div>
                </td>
              </tr>
              
              {/* Linha de descrição da etapa */}
              {(linha.stepName || linha.status) && !linha.isFinalizada && (
                <tr className="validador-etapa-descricao">
                  <td colSpan={6}>
                    <div className="validador-etapa-info">
                      <span className="validador-etapa-icone">
                        {linha.status?.toLowerCase().includes('captcha') ? '🔐' : '🔄'}
                      </span>
                      <span className="validador-etapa-texto">
                        {linha.stepName || getEtapaDescricao(linha.status)}
                      </span>
                      {linha.stepIndex && linha.stepTotal && (
                        <span className="validador-etapa-contador">
                          {linha.stepIndex}/{linha.stepTotal}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              
              {/* CAPTCHAS VISUAIS - apenas no modo manual */}
              {linha.status === 'captcha' && modoExecucao === 'manual' && (
                <tr className="validador-tabela-captcha-overlay-cell">
                  <td colSpan={6}>
                    <div className={`validador-captcha-overlay validador-captcha-bg-${linha.status?.toLowerCase()}`}>
                      <img
                        src={`data:image/png;base64,${linha.captchaImg}`}
                        alt="captcha"
                        width={100}
                        height={30}
                      />
                      <input
                        type="text"
                        maxLength={5}
                        value={respostaCaptcha[linha.linha] || ""}
                        onChange={(e) =>
                          setRespostaCaptcha((prev) => ({
                            ...prev,
                            [linha.linha]: e.target.value,
                          }))
                        }
                        className="validador-captcha-input"
                      />
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Tabela especial para erros
function renderTabelaErros(linhas: Linha[]) {
  return (
    <div>
      <table className="validador-tabela validador-tabela-erro">
        <thead>
          <tr>
            <th>Linha</th>
            <th>Empresa</th>
            <th>CNPJ</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <React.Fragment key={linha.linha}>
              <tr
                className="validador-tabela-row status-erro validador-tabela-row-erro"
                style={{ borderBottom: '2px solid #e57373', borderLeft: '4px solid #e57373', background: '#fff6f6' }}
              >
                <td>
                  <div className="validador-tabela-circulo erro" style={{ background: 'linear-gradient(135deg, #ff5f6d 0%, #ffc371 100%)', color: '#fff', border: '1.5px solid #e57373' }}>
                    {linha.linha}
                  </div>
                </td>
                <td>{linha.empresa?.toString().slice(0, 23)}</td>
                <td>{linha.CNPJ}</td>
              </tr>
              
              {/* Linha de descrição da etapa para erros - REMOVIDA para evitar duplicação */}
              {/* {(linha.stepName || linha.status) && !linha.isFinalizada && (
                <tr className="validador-etapa-descricao erro">
                  <td colSpan={3}>
                    <div className="validador-etapa-info erro">
                      <span className="validador-etapa-icone">
                        ❌
                      </span>
                      <span className="validador-etapa-texto">
                        {linha.stepName || getEtapaDescricao(linha.status)}
                      </span>
                      {linha.stepIndex && linha.stepTotal && (
                        <span className="validador-etapa-contador">
                          {linha.stepIndex}/{linha.stepTotal}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )} */}
              
              <tr>
                <td colSpan={3} style={{ color: '#b71c1c', fontSize: 13, padding: '4px 12px 10px 32px', background: '#fff6f6', borderBottom: '2px solid #e57373' }}>
                  <strong>Motivo:</strong> {linha.motivo || linha.mensagemErro || linha.status || 'Erro desconhecido'}
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ListaStatusEmpresas removido pois não é utilizado

const captchaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

function handleCaptchaInputChange(e: React.ChangeEvent<HTMLInputElement>) {
  // Só processa input do captcha se estiver no modo manual
  if (modoExecucao === 'manual') {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setCaptchaInput(value);
    if (captchaTimeout.current) clearTimeout(captchaTimeout.current);
    if (value.length === 5) {
      captchaTimeout.current = setTimeout(() => {
        enviarCaptchaParaBackend(value);
      }, 500); // 500ms debounce
    }
  }
}

  // Função para resetar a tela
  const resetarTela = () => {
    // Limpa todas as linhas ativas
    setLinhasAtivas([]);
    // Limpa linhas com erro
    setLinhasComErro([]);
    // Limpa linhas importadas
    setTodasLinhasImportadas([]);
    // Limpa respostas de captcha (apenas se estiver no modo manual)
    if (modoExecucao === 'manual') {
      setRespostaCaptcha({});
      setCaptchaImgBase64(null);
      setCaptchaInput("");
      setLinhaCaptchaAtual(null);
    }
    // Reseta progresso global
    setGlobalProgress(0);
    // Reseta status da automação
    setStatusAutomacao({ pausada: false, parada: false });
    // Limpa o input de arquivo
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

return (
  <div className="validador-page-container">
    <div className="validador-card">
      {/* Todo o conteúdo da tela */}
      <div className="validador-container">
        <div className="validador-top-row">
          <div className="validador-header-info">
            <h1 className="validador-titulo">Empresa Padrão</h1>
            <div className="validador-empresa-dados">
              <span><strong>CNPJ:</strong> 00.000.000/0001-00</span>
              <span><strong>Clientes:</strong> 100</span>
            </div>
          </div>
          <div>
            <input
              id="input-planilha"
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button onClick={handleImportarClick} className="validador-importar-btn">
              Importar Planilha
            </button>
          </div>
        </div>

        <div className="validador-actions-bar">
          <div className="validador-actions-left">
            {/* Removido label e selects de modo, resolução e navegadores */}
            {/* Exibe o card de captcha apenas no modo manual */}
            {modoExecucao === 'manual' && (
              <div className="validador-captcha-card">
                <span className="validador-captcha-label">Captcha:</span>
                <div className="validador-captcha-img-area">
                  {captchaImgBase64 ? (
                    <img src={`data:image/png;base64,${captchaImgBase64}`} alt="captcha" />
                  ) : (
                    <span style={{ color: "#2563eb", opacity: 0.7, fontWeight: 600, fontSize: 13 }}></span>
                  )}
                </div>
                <input
                  className="validador-captcha-input"
                  type="text"
                  maxLength={5}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={captchaInput}
                  onChange={handleCaptchaInputChange}
                  placeholder="00000"
                />
              </div>
            )}
            
            {/* Indicador de modo automático quando aplicável */}
            {modoExecucao === 'automatico' && (
              <div className="validador-automatico-indicator">
                <span className="validador-automatico-label">🤖 Modo Automático</span>
                <span className="validador-automatico-desc">CAPTCHA resolvido automaticamente</span>
              </div>
            )}
            
            {/* Indicador de status da importação */}
            {todasLinhasImportadas.length > 0 && (
              <div className="validador-import-status">
                <span className="validador-import-label">📋 Planilha Importada:</span>
                <span className="validador-import-count">{todasLinhasImportadas.length} linhas</span>
              </div>
            )}
          </div>
          <div className="validador-actions-center">
              {/* Progresso global */}
              <div className="validador-global-progress">
                <div className="validador-progress-track">
                  <div
                    className={`validador-progress-bar ${globalProgress >= 100 ? 'sucesso' : globalProgress === 0 ? 'carregando' : 'carregando'}`}
                    style={{ width: `${Math.max(0, Math.min(100, globalProgress))}%` }}
                  />
                </div>
                <span className="validador-progress-label">{globalProgress}%</span>
              </div>
              
              <button 
                className="validador-btn-executar" 
                type="button" 
                onClick={executarValidacao}
                disabled={linhasAtivas.length === 0}
              >
                {linhasAtivas.length === 0 ? 'Sem Linhas' : 'Executar'}
              </button>
            <button className="validador-btn-executar" type="button" onClick={salvarNoBackend}>
              Salvar
            </button>
            <button 
              className="validador-btn-executar" 
              type="button" 
              onClick={ativarLinhasImportadas}
              disabled={todasLinhasImportadas.length === 0}
              style={{ 
                background: todasLinhasImportadas.length > 0 
                  ? 'linear-gradient(90deg, #22c55e 60%, #16a34a 100%)' 
                  : 'linear-gradient(90deg, #9ca3af 60%, #6b7280 100%)'
              }}
            >
              {todasLinhasImportadas.length === 0 ? 'Sem Planilha' : `Ativar Linhas (${todasLinhasImportadas.length})`}
            </button>
          </div>
          <div className="validador-actions-right">

            <button
              className="validador-btn-exportar"
              type="button"
            >
              Exportar PDF
            </button>
            
            <button
              className="validador-btn-executar"
              type="button"
              style={{ marginTop: 12 }}
              onClick={async () => {
                try {
                  console.log('🛑 [FRONTEND] Parando automação...');
                  const res = await fetch(`${API_BASE_URL}/api/parar-automacao`, { 
                    method: "POST" 
                  });
                  const resultado = await res.json();
                  
                  if (resultado.sucesso) {
                    alert("⏹️ Automação parada com sucesso!");
                    console.log('✅ [FRONTEND] Automação parada:', resultado.mensagem);
                    // Atualiza o status imediatamente
                    setStatusAutomacao(prev => ({ ...prev, parada: true }));
                  } else {
                    alert("❌ Erro ao parar automação: " + (resultado.erro || 'Erro desconhecido'));
                  }
                } catch (error) {
                  console.error('❌ [FRONTEND] Erro ao parar automação:', error);
                  alert("❌ Erro ao parar automação: " + (error instanceof Error ? error.message : 'Erro desconhecido'));
                }
              }}
              disabled={statusAutomacao.parada}
            >
              {statusAutomacao.parada ? 'Automação Parada' : 'Parar Automação'}
            </button>

            <button
              className="validador-btn-executar"
              type="button"
              style={{ marginTop: 8 }}
              onClick={async () => {
                try {
                  console.log('🔄 [FRONTEND] Resetando controles...');
                  const res = await fetch(`${API_BASE_URL}/api/resetar-controles`, { 
                    method: "POST" 
                  });
                  const resultado = await res.json();
                  
                  if (resultado.sucesso) {
                    alert("🔄 Controles resetados com sucesso!");
                    console.log('✅ [FRONTEND] Controles resetados:', resultado.mensagem);
                    // Reseta a tela após resetar os controles no backend
                    resetarTela();
                  } else {
                    alert("❌ Erro ao resetar controles: " + (resultado.erro || 'Erro desconhecido'));
                  }
                } catch (error) {
                  console.error('❌ [FRONTEND] Erro ao resetar controles:', error);
                  alert("❌ Erro ao resetar controles: " + (error instanceof Error ? error.message : 'Erro desconhecido'));
                }
              }}
            >
              Resetar Controles
            </button>
          </div>
        </div>

        <div className="validador-tabela-dupla">
          <div>{renderTabela(linhasAtivas)}</div>
          <div>{renderTabelaErros(linhasComErro)}</div>
        </div>
      </div>
    </div>
  </div>
);
}