import "../styles/Validador.scss";
import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import * as XLSX from "xlsx";
// import { CheckCircle } from "@phosphor-icons/react";
// import {XCircle, Loader2 } from "lucide-react";

// Base da API (permite sobrescrever via Vite env)
const API_BASE_URL: string = (import.meta as any)?.env?.VITE_API_URL || "http://localhost:4000";

// Tipos de dados
interface Empresa {
  nome: string;
  cnpj: string;
  clientes: number;
}

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
  const [empresa, setEmpresa] = useState<Empresa>({ nome: "", cnpj: "", clientes: 0 });
  const [linhasAtivas, setLinhasAtivas] = useState<Linha[]>([]);
  const [linhasComErro, setLinhasComErro] = useState<Linha[]>([]);
  const [respostaCaptcha, setRespostaCaptcha] = useState<Record<number,string>>({});
  const [captchaImgBase64, setCaptchaImgBase64] = useState<string | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [linhaCaptchaAtual, setLinhaCaptchaAtual] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [globalProgress, setGlobalProgress] = useState<number>(0);
  const [statusAutomacao, setStatusAutomacao] = useState<{ pausada: boolean; parada: boolean }>({ pausada: false, parada: false });

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
  socket.on("captcha", handleCaptcha);
  return () => {
    socket.off("captcha", handleCaptcha);
  };
}, []);

// Função para enviar a resposta do captcha para o backend via socket
function enviarCaptchaParaBackend(valor?: string) {
  const resposta = valor !== undefined ? valor : captchaInput;
  if (resposta && resposta.length === 5 && linhaCaptchaAtual != null) {
    socket.emit("captcha-resposta", {
      linha: linhaCaptchaAtual,
      resposta
    });
    // Não limpa o estado aqui! Só limpa quando o backend retornar sucesso para a linha
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
        // Se for sucesso para a linha do captcha, limpa o estado de captcha
        if (linhaCaptchaAtual === linha) {
          setCaptchaImgBase64(null);
          setCaptchaInput("");
          setLinhaCaptchaAtual(null);
        }
        // Mantém a ordem original das linhas (não reordena para o final)
        return atualizadas;
      }
      // Se for erro, só remove da lista se NÃO for a linha do captcha atual
      if (status.toLowerCase().includes("erro") || status.toLowerCase().includes("nova senha")) {
        if (linhaCaptchaAtual === linha) {
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
}, [linhaCaptchaAtual]);

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
  fetch(`${API_BASE_URL}/api/empresas`)
    .then((res) => res.json())
    .then((data) => {
      if (data.length > 0) {
        setEmpresa(data[0]);

        // Carrega JSON da contabilidade
        const nomeContabilidade = data[0].nome;
        const nomeArquivoSeguro = nomeContabilidade.replace(/[^\w\d]/g, '_');
        fetch(`${API_BASE_URL}/api/validacoes/${encodeURIComponent(nomeArquivoSeguro)}`)
          .then(res => res.json())
          .then(dados => {
            if (Array.isArray(dados)) {
              setLinhasAtivas(dados);
            } else {
              console.warn('Nenhum dado encontrado para esta contabilidade.');
            }
          })
          .catch(err => console.error('Erro ao carregar JSON da contabilidade:', err));
      }
      });
  }, []);



useEffect(() => {
  async function carregarValidacoes() {
    try {
      const nomeTratado = empresa.nome.replace(/[^\w\d]/g, '_');
      const res = await fetch(`${API_BASE_URL}/empresas/validacoes/${nomeTratado}`);
      if (!res.ok) {
        console.warn('Nenhum dado de validação encontrado.');
        return;
      }

      const validacoesSalvas = await res.json();
      setLinhasAtivas((prev) =>
        prev.map((linha) => {
          const validada = (validacoesSalvas as Linha[]).find((v: Linha) => v.linha === linha.linha);
          return validada ? { ...linha, status: validada.status || linha.status } : linha;
        })
      );
    } catch (err) {
      console.error('Erro ao carregar validações:', err);
    }
  }

  if (empresa?.nome) {
    carregarValidacoes();
  }
}, [empresa]);
  function handleImportarClick() {
    // Usa ref para evitar query por id
    fileInputRef.current?.click();
  }

function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

<<<<<<< HEAD
<<<<<<< HEAD
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
        setTodasLinhasImportadas(linhasProcessadas);
        setLinhasAtivas([]); // não ativa automaticamente
      };
      reader.readAsArrayBuffer(file);
    }
    e.target.value = "";
=======
=======
>>>>>>> parent of 82642d4 (Stage3.8.9)
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
      setLinhasAtivas(linhasProcessadas);
<<<<<<< HEAD

      // Salva automaticamente no backend em assets/planilhas com sufixo _validation.json
      (async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/salvar-planilha-validation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contabilidade: empresa.nome,
              dados: linhasProcessadas,
              nomeArquivoOriginal: file.name
            })
          });
          const resultado = await res.json();
          if (!res.ok || !resultado.sucesso) {
            console.warn('Falha ao salvar planilha (validation) no backend:', resultado?.erro || res.statusText);
          } else {
            console.log('✅ Planilha (validation) salva:', resultado.caminho);
          }
        } catch (err) {
          console.warn('Erro ao salvar planilha (validation) no backend:', err);
        }
      })();
    };
    reader.readAsArrayBuffer(file);
>>>>>>> origin/validation
=======
    };
    reader.readAsArrayBuffer(file);
>>>>>>> parent of 82642d4 (Stage3.8.9)
  }
  e.target.value = "";
}
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

    console.log('🚀 [FRONTEND] Parâmetros:', {
      contabilidade: empresa.nome,
      modoLogin: modoLogin === 'automatico' ? 'Automático' : 'Manual',
      modoResolucao: resolucao,
      modoDepuracao,
      qtdNavegadores: 'SEMPRE 8 (fixo no backend)'
    });

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

    const res = await fetch(`${API_BASE_URL}/executar-validacao`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contabilidade: empresa.nome,
        modoLogin: modoLogin === 'automatico' ? 'Automático' : 'Manual',
        modoResolucao: resolucao,
        modoDepuracao,
        // qtdNavegadores é ignorado pelo backend (sempre 8)
        linhas: linhasAtivas.map(l => l.linha), // Envia linhas específicas se houver
        configuracaoAtiva: ativaKey,
        configuracoes: configuracoesSelecionadas
      }),
    });

    const resultado = await res.json();
    console.log('🚀 [FRONTEND] Resposta do backend:', resultado);

    if (resultado.sucesso) {
      alert("✅ Validação iniciada com sucesso! O sistema usará 8 navegadores automaticamente.");
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
      const res = await fetch(`${API_BASE_URL}/api/salvar-json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contabilidade: empresa.nome,
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
              
              {/* CAPTCHAS VISUAIS */}
              {linha.status === 'captcha' && (
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
function carregarParametrosValidacao() {
  try {
    const ativa = localStorage.getItem('configuracaoAtiva') || 'padrao';
    const raw = localStorage.getItem('configuracoesSistema');
    if (!raw) return { modoExecucao: 'manual', tipoMonitor: 'FHD', modoDepuracao: false } as const;
    const cfgs = JSON.parse(raw);
    const valid = cfgs?.[ativa]?.validacao || cfgs?.padrao?.validacao;
    if (!valid) return { modoExecucao: 'manual', tipoMonitor: 'FHD', modoDepuracao: false } as const;
    return valid as { modoExecucao: 'manual' | 'automatico'; tipoMonitor: 'FHD' | 'QHD'; modoDepuracao: boolean };
  } catch {
    return { modoExecucao: 'manual', tipoMonitor: 'FHD', modoDepuracao: false } as const;
  }
}

const inicial = carregarParametrosValidacao();
const [modoLogin, setModoLogin] = useState<'automatico' | 'manual'>(inicial.modoExecucao);
const [resolucao, setResolucao] = useState<'FHD' | 'QHD'>(inicial.tipoMonitor);
const [modoDepuracao, setModoDepuracao] = useState<boolean>(inicial.modoDepuracao);

useEffect(() => {
  const atual = carregarParametrosValidacao();
  setModoLogin(atual.modoExecucao);
  setResolucao(atual.tipoMonitor);
  setModoDepuracao(atual.modoDepuracao);
}, []);

const captchaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

function handleCaptchaInputChange(e: React.ChangeEvent<HTMLInputElement>) {
  const value = e.target.value.replace(/\D/g, '').slice(0, 5);
  setCaptchaInput(value);
  if (captchaTimeout.current) clearTimeout(captchaTimeout.current);
  if (value.length === 5) {
    captchaTimeout.current = setTimeout(() => {
      enviarCaptchaParaBackend(value);
    }, 500); // 500ms debounce
  }
}

  // Função para resetar a tela
  const resetarTela = () => {
    // Limpa todas as linhas ativas
    setLinhasAtivas([]);
    // Limpa linhas com erro
    setLinhasComErro([]);
    // Limpa respostas de captcha
    setRespostaCaptcha({});
    // Limpa imagem do captcha
    setCaptchaImgBase64(null);
    // Limpa input do captcha
    setCaptchaInput("");
    // Reseta linha do captcha atual
    setLinhaCaptchaAtual(null);
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
            <h1 className="validador-titulo">{empresa.nome}</h1>
            <div className="validador-empresa-dados">
              <span><strong>CNPJ:</strong> {empresa.cnpj}</span>
              <span><strong>Clientes:</strong> {empresa.clientes}</span>
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
            {/* Exibe o card de captcha somente se modoLogin for 'manual' */}
            {modoLogin === 'manual' && (
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