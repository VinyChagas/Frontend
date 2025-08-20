import "../styles/Automacao.scss";
import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import * as XLSX from "xlsx";
import { useConfiguracaoAutomacao } from "../hooks/useConfiguracaoAutomacao";
import { useEmpresa } from "../contexts/EmpresaContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import EmpresaSelector from "../components/EmpresaSelector";

// Base da API (permite sobrescrever via Vite env)
const API_BASE_URL: string = (import.meta as any)?.env?.VITE_API_URL || "http://localhost:4000";

// Tipos de dados compatíveis com o backend main.mjs

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
  // Progresso individual compatível com as 8 etapas do backend
  progressPercent?: number; // 0..100
  stepIndex?: number; // 0-8 (8 etapas totais)
  stepTotal?: number; // Sempre 8
  stepName?: string; // Nome da etapa atual
  isFinalizada?: boolean;
  resultadoFinal?: 'sucesso' | 'erro';
  // Campos adicionais do backend
  etapa?: string;
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
  etapa?: string;
}

interface CaptchaEvent {
  linha: number;
  imagem: string;
}

// Tipos para o modal de seleção
type ModoExecucao = 'a-partir' | 'intervalo' | 'selecionadas';



const socket = io(API_BASE_URL);

export default function Automacao() {
  const navigate = useNavigate();
  const { empresaSelecionada, selecionarEmpresa } = useEmpresa();
  
  // Hook para configurações de automação
  const { criarPayloadExecucao, obterConfiguracaoAtiva } = useConfiguracaoAutomacao();
  
  const [linhasAtivas, setLinhasAtivas] = useState<Linha[]>([]);
  const [linhasComErro, setLinhasComErro] = useState<Linha[]>([]);
  const [respostaCaptcha, setRespostaCaptcha] = useState<Record<number,string>>({});
  const [captchaImgBase64, setCaptchaImgBase64] = useState<string | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [linhaCaptchaAtual, setLinhaCaptchaAtual] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [globalProgress, setGlobalProgress] = useState<number>(0);
  const [statusAutomacao, setStatusAutomacao] = useState<{ pausada: boolean; parada: boolean }>({ pausada: false, parada: false });
  
  // Estados para o modal de seleção
  const [showModalSelecao, setShowModalSelecao] = useState(false);
  const [todasLinhasImportadas, setTodasLinhasImportadas] = useState<Linha[]>([]);
  const [modoExecucaoSelecionado, setModoExecucaoSelecionado] = useState<ModoExecucao>('a-partir');
  const [linhaInicial, setLinhaInicial] = useState<number>(0);
  const [linhaFinal, setLinhaFinal] = useState<number>(0);
  const [linhasSelecionadas, setLinhasSelecionadas] = useState<number[]>([]);

  // Função para traduzir status em descrições amigáveis compatíveis com o backend
  const getEtapaDescricao = (status: string | undefined, stepName?: string): string => {
    if (stepName) return stepName;
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
    if (statusLower.includes('emitidas')) return 'Processando NFS-e emitidas';
    if (statusLower.includes('recebidas')) return 'Processando NFS-e recebidas';
    if (statusLower.includes('bsm')) return 'Baixa sem movimento';
    if (statusLower.includes('dam')) return 'Gerando DAM';
    
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
      // Adiciona o captcha à fila de exibição (ordem de chegada)
      setCaptchaImgBase64(data.imagem);
      setCaptchaInput("");
      setLinhaCaptchaAtual(data.linha);
      
      console.log(`🔐 [FRONTEND] Captcha recebido para linha ${data.linha} - Adicionado à fila de exibição`);
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
      console.log(`📤 [FRONTEND] Enviando captcha para linha ${linhaCaptchaAtual}: ${resposta}`);
      
      socket.emit("captcha-resposta", {
        linha: linhaCaptchaAtual,
        resposta
      });
      
      // Limpa o estado após enviar
      setCaptchaImgBase64(null);
      setCaptchaInput("");
      setLinhaCaptchaAtual(null);
      
      console.log(`✅ [FRONTEND] Captcha enviado e estado limpo para linha ${linhaCaptchaAtual}`);
    }
  }

  // Consolidado: único useEffect para socket.on("progresso") compatível com o backend
  useEffect(() => {
    function handleProgresso(info: ProgressoEvent) {
      const { linha, status, etapa } = info;
      setLinhasAtivas((prevAtivas) => {
        // calcula percent baseado nas 8 etapas do backend
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
          if (lowerStatus.includes('login')) fallbackPercent = 12.5; // 1/8
          else if (lowerStatus.includes('cnpj')) fallbackPercent = 25; // 2/8
          else if (lowerStatus.includes('emitidas')) fallbackPercent = 37.5; // 3/8
          else if (lowerStatus.includes('download')) fallbackPercent = 50; // 4/8
          else if (lowerStatus.includes('bsm')) fallbackPercent = 62.5; // 5/8
          else if (lowerStatus.includes('recebidas')) fallbackPercent = 75; // 6/8
          else if (lowerStatus.includes('dam')) fallbackPercent = 87.5; // 7/8
          else if (lowerStatus.includes('captcha')) fallbackPercent = 10;
          else if (lowerStatus.includes('carregando')) fallbackPercent = 50;
        }

        let atualizadas = prevAtivas.map((l) =>
          l.linha === linha
            ? {
                ...l,
                status,
                etapa,
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

  // Verifica se há uma empresa selecionada e carrega os dados
  useEffect(() => {
    if (!empresaSelecionada) {
      // Se não há empresa selecionada, apenas limpa os dados mas não redireciona
      console.log('ℹ️ Nenhuma empresa selecionada. Use o dropdown para selecionar uma empresa.');
      setTodasLinhasImportadas([]);
      setLinhasAtivas([]);
      setLinhasComErro([]);
      return;
    }

    // Carrega dados da empresa selecionada
    const carregarDadosEmpresa = async () => {
      try {
        const nomeArquivoSeguro = empresaSelecionada.nome.replace(/[^\w\d]/g, '_');
        const response = await fetch(`${API_BASE_URL}/api/validacoes/${encodeURIComponent(nomeArquivoSeguro)}`);
        
        if (response.ok) {
          const dados = await response.json();
          if (Array.isArray(dados)) {
            setTodasLinhasImportadas(dados);
            // Carrega também as linhas ativas se existirem
            if (dados.length > 0) {
              setLinhasAtivas(dados.filter(linha => linha.status && !linha.status.toLowerCase().includes('erro')));
            }
          } else {
            console.warn('Nenhum dado encontrado para esta contabilidade.');
            setTodasLinhasImportadas([]);
            setLinhasAtivas([]);
          }
        } else {
          console.warn('Nenhum dado encontrado para esta contabilidade.');
          setTodasLinhasImportadas([]);
          setLinhasAtivas([]);
        }
      } catch (error) {
        console.error('Erro ao carregar dados da empresa:', error);
        setTodasLinhasImportadas([]);
        setLinhasAtivas([]);
      }
    };

    carregarDadosEmpresa();
  }, [empresaSelecionada]);

  function handleImportarClick() {
    // Usa ref para evitar query por id
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        // Processa localmente para exibir imediatamente
        const linhasProcessadas = (rows as any[]).map((row: any, index: number) => ({
          linha: index + 2,
          procurador: row["Procurador"]?.toUpperCase() || "",
          presumido: row["Presumido"]?.toUpperCase() || "",
          empresa: row["empresa"] || "",
          CNPJ: row["CNPJ"] || "",
          usuario: row["usuario"] || "",
          senha: row["senha"] || "",
          responsavel: row["responsavel"] || "",
          codSistema: row["codSistema"] || "",
          mes: row["mes"] || "",
          ano: row["ano"] || "",
          IM: row["IM"] || "",
          status: "",
          captchaImg: "",
        }));
        
        setTodasLinhasImportadas(linhasProcessadas);
        // Não define linhas ativas automaticamente - usuário deve selecionar via modal
        setLinhasAtivas([]);

        // Salva automaticamente os dados da planilha vinculados à empresa
        if (empresaSelecionada) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/salvar-planilha`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contabilidade: empresaSelecionada.nome,
                dados: linhasProcessadas,
                nomeArquivoOriginal: file.name,
              }),
            });

            const resultado = await res.json();
            if (resultado.sucesso) {
              console.log('✅ Planilha salva automaticamente para a empresa:', empresaSelecionada.nome);
              console.log(`📊 Total de linhas salvas: ${resultado.totalLinhas}`);
            } else {
              console.warn('⚠️ Erro ao salvar planilha automaticamente:', resultado.erro);
            }
          } catch (error) {
            console.error('❌ Erro ao salvar planilha automaticamente:', error);
          }
        }
      };
      reader.readAsArrayBuffer(file);
    }
    e.target.value = "";
  }

  // Função para executar validação compatível com o backend main.mjs
  const executarValidacao = async () => {
    if (!empresaSelecionada) {
      alert('❌ Selecione uma empresa primeiro!');
      return;
    }

    if (linhasAtivas.length === 0) {
      alert('❌ Importe uma planilha e selecione linhas para execução!');
      return;
    }

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

      // Gera array de linhas baseado nas linhas ativas ou usa range padrão
      const linhasParaExecutar = linhasAtivas.length > 0 
        ? linhasAtivas.map(l => l.linha)
        : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

      // Criar payload completo integrando configurações e seleções
      const payloadCompleto = criarPayloadExecucao(
        modoExecucaoSelecionado,
        linhasParaExecutar,
        linhaInicial,
        linhaFinal,
        linhasSelecionadas,
        empresaSelecionada?.nome || "",
        empresaSelecionada?.cnpj || ""
      );

      // Obter configuração ativa para usar os parâmetros
      const configAtiva = obterConfiguracaoAtiva();
      const configAutomacao = configAtiva?.automacao;

      console.log('🚀 [FRONTEND] Payload completo:', payloadCompleto);
      console.log('🚀 [FRONTEND] Configuração de automação:', configAutomacao);

      const res = await fetch(`${API_BASE_URL}/executar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Payload completo para o backend
          payloadCompleto,
          
          // Parâmetros específicos para compatibilidade
          modoExecucao: "Inicia",
          linhas: linhasParaExecutar,
          qtdNavegadores: configAutomacao?.numeroNavegadores || 8,
          modoResolucao: configAutomacao?.tipoMonitor || 'FHD',
          modoLogin: configAutomacao?.modoExecucao || 'automatico',
          modoDepuracao: configAutomacao?.modoDepuracao || false,
          
          // Configurações adicionais
          timeoutCaptcha: configAutomacao?.timeoutCaptcha || 30000,
          tentativasMaximas: configAutomacao?.tentativasMaximas || 3,
          retryEmCasoDeErro: configAutomacao?.retryEmCasoDeErro || false,
          maximoRetries: configAutomacao?.maximoRetries || 2
        }),
      });

      const resultado = await res.json();
      console.log('🚀 [FRONTEND] Resposta do backend:', resultado);

      if (resultado.sucesso) {
        alert(`✅ Validação iniciada com sucesso! O sistema usará ${configAutomacao?.numeroNavegadores || 8} navegadores com configuração "${configAtiva?.nome || 'padrão'}".`);
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
    if (!empresaSelecionada) {
      alert('❌ Selecione uma empresa primeiro!');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/salvar-json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contabilidade: empresaSelecionada.nome,
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
        <table className="automacao-tabela">
          <thead>
            <tr>
              <th>Linha</th>
              <th>Empresa</th>
              <th>CNPJ</th>
              <th>Progresso</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <React.Fragment key={linha.linha}>
                <tr
                  className={`${
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
                    <div className="automacao-circulo">{linha.linha}</div>
                  </td>
                  <td>{linha.empresa?.toString().slice(0, 23)}</td>
                  <td>{linha.CNPJ}</td>
                  {/* Progresso da linha */}
                  <td>
                    <div className="automacao-row-progress">
                      <div className="progress-track">
                        <div
                          className={`progress-bar ${
                            linha.isFinalizada && linha.resultadoFinal === 'erro'
                              ? 'erro'
                              : linha.isFinalizada && linha.resultadoFinal === 'sucesso'
                              ? 'sucesso'
                              : 'carregando'
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, (linha.isFinalizada ? 100 : (linha.progressPercent ?? (linha.status?.toLowerCase().includes('carregando') ? 50 : linha.status?.toLowerCase().includes('captcha') ? 10 : 0)))))}%` }}
                        />
                      </div>
                      <span className="progress-label">
                        {Math.round(Math.max(0, Math.min(100, (linha.isFinalizada ? 100 : (linha.progressPercent ?? (linha.status?.toLowerCase().includes('carregando') ? 50 : linha.status?.toLowerCase().includes('captcha') ? 10 : 0))))))}%
                      </span>
                    </div>
                  </td>
                </tr>
                
                {/* Linha de descrição da etapa */}
                {(linha.stepName || linha.status) && !linha.isFinalizada && (
                  <tr className="automacao-etapa-descricao">
                    <td colSpan={4}>
                      <div className="automacao-etapa-info">
                        <span className="etapa-icone">
                          {linha.status?.toLowerCase().includes('captcha') ? '🔐' : '🔄'}
                        </span>
                        <span className="etapa-texto">
                          {linha.stepName || getEtapaDescricao(linha.status)}
                        </span>
                        {linha.stepIndex && linha.stepTotal && (
                          <span className="etapa-contador">
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
                    <td colSpan={4}>
                      <div className={`automacao-captcha-overlay bg-captcha`}>
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
                          className="captcha-input"
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
        <table className="automacao-tabela">
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
                <tr className="status-erro">
                  <td>
                    <div className="automacao-circulo erro">{linha.linha}</div>
                  </td>
                  <td>{linha.empresa?.toString().slice(0, 23)}</td>
                  <td>{linha.CNPJ}</td>
                </tr>
                
                <tr className="automacao-etapa-descricao erro">
                  <td colSpan={3}>
                    <div className="automacao-etapa-info">
                      <span className="etapa-icone">❌</span>
                      <span className="etapa-texto">
                        <strong>Motivo:</strong> {linha.motivo || linha.mensagemErro || linha.status || 'Erro desconhecido'}
                      </span>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Variáveis de estado para controles da automação
  function carregarParametrosAutomacao() {
    try {
      const ativa = localStorage.getItem('configuracaoAtiva') || 'padrao';
      const raw = localStorage.getItem('configuracoesSistema');
      if (!raw) return { modoExecucao: 'manual', tipoMonitor: 'FHD', modoDepuracao: false } as const;
      const cfgs = JSON.parse(raw);
      const autom = cfgs?.[ativa]?.automacao || cfgs?.padrao?.automacao;
      if (!autom) return { modoExecucao: 'manual', tipoMonitor: 'FHD', modoDepuracao: false } as const;
      return autom as { modoExecucao: 'manual' | 'automatico'; tipoMonitor: 'FHD' | 'QHD'; modoDepuracao: boolean };
    } catch {
      return { modoExecucao: 'manual', tipoMonitor: 'FHD', modoDepuracao: false } as const;
    }
  }

  const inicial = carregarParametrosAutomacao();
  const [modoLogin, setModoLogin] = useState<'automatico' | 'manual'>(inicial.modoExecucao);

  useEffect(() => {
    const atual = carregarParametrosAutomacao();
    setModoLogin(atual.modoExecucao);
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
    // Reseta estados do modal
    setShowModalSelecao(false);
    setTodasLinhasImportadas([]);
    setModoExecucaoSelecionado('a-partir');
    setLinhaInicial(0);
    setLinhaFinal(0);
    setLinhasSelecionadas([]);
  };

  // Função para limpar dados da empresa atual (sem resetar controles)
  const limparDadosEmpresa = () => {
    setLinhasAtivas([]);
    setLinhasComErro([]);
    setTodasLinhasImportadas([]);
    setRespostaCaptcha({});
    setCaptchaImgBase64(null);
    setCaptchaInput("");
    setLinhaCaptchaAtual(null);
    setGlobalProgress(0);
    setShowModalSelecao(false);
    setModoExecucaoSelecionado('a-partir');
    setLinhaInicial(0);
    setLinhaFinal(0);
    setLinhasSelecionadas([]);
  };

  // Funções para o modal de seleção
  const abrirModalSelecao = () => {
    if (todasLinhasImportadas.length === 0) {
      alert('Por favor, importe uma planilha primeiro!');
      return;
    }
    
    // Inicializa os valores baseado na quantidade de linhas importadas
    const totalLinhas = todasLinhasImportadas.length;
    setLinhaInicial(2); // Sempre começa na linha 2 (primeira linha de dados)
    setLinhaFinal(totalLinhas + 1); // Última linha disponível
    setLinhasSelecionadas([]);
    
    // Garante que o modo seja 'a-partir' por padrão
    setModoExecucaoSelecionado('a-partir');
    
    setShowModalSelecao(true);
  };

  const fecharModalSelecao = () => {
    setShowModalSelecao(false);
  };

  const confirmarSelecao = () => {
    let linhasParaExecutar: number[] = [];

    switch (modoExecucaoSelecionado) {
      case 'a-partir':
        // Todas as linhas a partir da linha inicial até o final
        if (linhaInicial < 2 || linhaInicial > todasLinhasImportadas.length + 1) {
          alert('Linha inicial deve estar entre 2 e ' + (todasLinhasImportadas.length + 1));
          return;
        }
        linhasParaExecutar = todasLinhasImportadas
          .filter(linha => linha.linha >= linhaInicial)
          .map(linha => linha.linha);
        break;
      
      case 'intervalo':
        // Linhas no intervalo especificado
        if (linhaInicial < 2 || linhaFinal > todasLinhasImportadas.length + 1 || linhaInicial > linhaFinal) {
          alert('Intervalo inválido. Linha inicial deve ser menor que linha final e estar entre 2 e ' + (todasLinhasImportadas.length + 1));
          return;
        }
        linhasParaExecutar = todasLinhasImportadas
          .filter(linha => linha.linha >= linhaInicial && linha.linha <= linhaFinal)
          .map(linha => linha.linha);
        break;
      
      case 'selecionadas':
        // Apenas as linhas selecionadas
        if (linhasSelecionadas.length === 0) {
          alert('Selecione pelo menos uma linha para execução!');
          return;
        }
        linhasParaExecutar = linhasSelecionadas.sort((a, b) => a - b);
        break;
    }

    if (linhasParaExecutar.length === 0) {
      alert('Nenhuma linha selecionada para execução!');
      return;
    }

    // Filtra as linhas ativas baseado na seleção
    const linhasFiltradas = todasLinhasImportadas.filter(linha => 
      linhasParaExecutar.includes(linha.linha)
    );

    setLinhasAtivas(linhasFiltradas);
    setShowModalSelecao(false);
    
    console.log(`✅ [FRONTEND] Linhas selecionadas para execução: ${linhasParaExecutar.join(', ')}`);
    console.log(`✅ [FRONTEND] Total de linhas: ${linhasFiltradas.length}`);
  };

  const handleModoExecucaoChange = (modo: ModoExecucao) => {
    setModoExecucaoSelecionado(modo);
    
    // Reset dos valores baseado no modo
    const totalLinhas = todasLinhasImportadas.length;
    
    switch (modo) {
      case 'a-partir':
        setLinhaInicial(2);
        setLinhaFinal(totalLinhas + 1);
        setLinhasSelecionadas([]);
        break;
      case 'intervalo':
        setLinhaInicial(2);
        setLinhaFinal(totalLinhas + 1);
        setLinhasSelecionadas([]);
        break;
      case 'selecionadas':
        setLinhasSelecionadas([]);
        break;
    }
  };

  // Função para validar e ajustar valores em tempo real
  const validarEajustarValores = (novaLinhaInicial: number, novaLinhaFinal: number) => {
    const totalLinhas = todasLinhasImportadas.length;
    
    // Garante que a linha inicial esteja no range válido
    if (novaLinhaInicial < 2) novaLinhaInicial = 2;
    if (novaLinhaInicial > totalLinhas + 1) novaLinhaInicial = totalLinhas + 1;
    
    // Garante que a linha final esteja no range válido
    if (novaLinhaFinal < novaLinhaInicial) novaLinhaFinal = novaLinhaInicial;
    if (novaLinhaFinal > totalLinhas + 1) novaLinhaFinal = totalLinhas + 1;
    
    return { linhaInicial: novaLinhaInicial, linhaFinal: novaLinhaFinal };
  };

  const toggleLinhaSelecionada = (linha: number) => {
    setLinhasSelecionadas(prev => {
      if (prev.includes(linha)) {
        return prev.filter(l => l !== linha);
      } else {
        return [...prev, linha].sort((a, b) => a - b);
      }
    });
  };

  return (
    <div className="automacao-page-container">
      <div className="automacao-card">
        <div className="automacao-container">
          <div className="automacao-header">
            <div className="header-content">
              <div className="header-info">
                <div className="header-top">
                  <button 
                    onClick={() => navigate("/home")} 
                    className="voltar-btn"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#6b7280",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      transition: "all 0.2s"
                    }}
                  >
                    ← Voltar para Home
                  </button>
                </div>
                
                {/* Seletor de Empresa */}
                <div className="empresa-selector-container">
                  <h2>Selecionar Contabilidade</h2>
                  <EmpresaSelector />
                  {!empresaSelecionada && (
                    <p className="empresa-selector-hint">
                      Escolha uma contabilidade para importar planilhas e executar validações
                    </p>
                  )}
                </div>

                {/* Informações da empresa selecionada */}
                {empresaSelecionada ? (
                  <>
                    <h1>{empresaSelecionada.nome}</h1>
                    <div className="empresa-dados">
                      <span><strong>CNPJ:</strong> {empresaSelecionada.cnpj}</span>
                      <span><strong>Clientes:</strong> {empresaSelecionada.clientes}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <h1>Automação</h1>
                    <div className="empresa-dados">
                      <span>Selecione uma contabilidade para começar</span>
                    </div>
                  </>
                )}
              </div>
              <div className="header-actions">
                <input
                  id="input-planilha"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: "none" }}
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <button 
                  onClick={handleImportarClick} 
                  className="automacao-btn btn-primary"
                  disabled={!empresaSelecionada}
                >
                  Importar Planilha
                </button>
                {todasLinhasImportadas.length > 0 && (
                  <button onClick={abrirModalSelecao} className="automacao-btn btn-success">
                    Selecionar Linhas
                  </button>
                )}
                {todasLinhasImportadas.length > 0 && (
                  <button onClick={limparDadosEmpresa} className="automacao-btn btn-secondary">
                    Limpar Dados
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="automacao-actions-bar">
            <div className="actions-grid">
              {modoLogin === 'manual' && (
                <div className="action-group">
                  <div className="group-title">Captcha</div>
                  {/* Exibe o card de captcha somente se modoLogin for 'manual' */}
                  <div className="automacao-captcha-card">
                    <div className="captcha-header">
                      <div className="captcha-icon">🔐</div>
                      <span className="captcha-label">Captcha:</span>
                    </div>
                    <div className="captcha-content">
                      <div className="captcha-image-area">
                        {captchaImgBase64 ? (
                          <img src={`data:image/png;base64,${captchaImgBase64}`} alt="captcha" />
                        ) : (
                          <span className="placeholder">Aguardando...</span>
                        )}
                      </div>
                      <input
                        className="captcha-input"
                        type="text"
                        maxLength={5}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        value={captchaInput}
                        onChange={handleCaptchaInputChange}
                        placeholder="00000"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="action-group">
                <div className="group-title">Progresso</div>
                <div className="automacao-global-progress">
                  <div className="progress-header">
                    <h3>Progresso Global</h3>
                    <div className="progress-percentage">{globalProgress}%</div>
                  </div>
                  <div className="progress-track">
                    <div
                      className={`progress-bar ${globalProgress >= 100 ? 'sucesso' : globalProgress === 0 ? 'carregando' : 'carregando'}`}
                      style={{ width: `${Math.max(0, Math.min(100, globalProgress))}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="action-group">
                <div className="group-title">Ações</div>
                <div className="control-buttons">
                  <button 
                    className="automacao-btn btn-primary" 
                    type="button" 
                    onClick={executarValidacao}
                    disabled={!empresaSelecionada || linhasAtivas.length === 0}
                  >
                    {!empresaSelecionada ? 'Selecione Empresa' : linhasAtivas.length === 0 ? 'Sem Linhas' : 'Executar'}
                  </button>
                  <button 
                    className="automacao-btn btn-success" 
                    type="button" 
                    onClick={salvarNoBackend}
                    disabled={!empresaSelecionada || linhasAtivas.length === 0}
                  >
                    Salvar
                  </button>
                  <button
                    className="automacao-btn btn-success"
                    type="button"
                  >
                    Exportar PDF
                  </button>
                </div>
              </div>
              <div className="action-group">
                <div className="group-title">Controles</div>
                <div className="control-buttons">
                  <button
                    className="automacao-btn btn-warning"
                    type="button"
                    onClick={async () => {
                      try {
                        if (statusAutomacao.pausada) {
                          console.log('▶️ [FRONTEND] Continuando automação...');
                          const res = await fetch(`${API_BASE_URL}/api/continuar-automacao`, { 
                            method: "POST" 
                          });
                          const resultado = await res.json();
                          
                          if (resultado.sucesso) {
                            alert("▶️ Automação continuada com sucesso!");
                            setStatusAutomacao(prev => ({ ...prev, pausada: false }));
                          } else {
                            alert("❌ Erro ao continuar automação: " + (resultado.erro || 'Erro desconhecido'));
                          }
                        } else {
                          console.log('⏸️ [FRONTEND] Pausando automação...');
                          const res = await fetch(`${API_BASE_URL}/api/pausar-automacao`, { 
                            method: "POST" 
                          });
                          const resultado = await res.json();
                          
                          if (resultado.sucesso) {
                            alert("⏸️ Automação pausada com sucesso!");
                            setStatusAutomacao(prev => ({ ...prev, pausada: true }));
                          } else {
                            alert("❌ Erro ao pausar automação: " + (resultado.erro || 'Erro desconhecido'));
                          }
                        }
                      } catch (error) {
                        console.error('❌ [FRONTEND] Erro ao controlar automação:', error);
                        alert("❌ Erro ao controlar automação: " + (error instanceof Error ? error.message : 'Erro desconhecido'));
                      }
                    }}
                    disabled={statusAutomacao.parada}
                  >
                    {statusAutomacao.pausada ? '▶️ Continuar' : '⏸️ Pausar'}
                  </button>

                  <button
                    className="automacao-btn btn-danger"
                    type="button"
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
                    className="automacao-btn btn-secondary"
                    type="button"
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
            </div>
          </div>

          <div className="automacao-tabela-container">
            <div className="tabela-dupla">
              <div className="tabela-wrapper">
                <div className="tabela-titulo">Linhas Ativas</div>
                {renderTabela(linhasAtivas)}
              </div>
              <div className="tabela-wrapper">
                <div className="tabela-titulo">Linhas com Erro</div>
                {renderTabelaErros(linhasComErro)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Seleção de Linhas */}
      {showModalSelecao && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Selecionar Linhas para Execução</h2>
            <div className="modal-body">
              <div className="modal-info-header">
                <p>Total de linhas disponíveis: <strong>{todasLinhasImportadas.length}</strong></p>
              </div>
              
              <div className="modal-options">
                <button
                  className={`modal-option-btn ${modoExecucaoSelecionado === 'a-partir' ? 'active' : ''}`}
                  onClick={() => handleModoExecucaoChange('a-partir')}
                >
                  A partir de uma linha
                </button>
                <button
                  className={`modal-option-btn ${modoExecucaoSelecionado === 'intervalo' ? 'active' : ''}`}
                  onClick={() => handleModoExecucaoChange('intervalo')}
                >
                  Intervalo de linhas
                </button>
                <button
                  className={`modal-option-btn ${modoExecucaoSelecionado === 'selecionadas' ? 'active' : ''}`}
                  onClick={() => handleModoExecucaoChange('selecionadas')}
                >
                  Linhas Selecionadas
                </button>
              </div>

              {modoExecucaoSelecionado === 'a-partir' && (
                <div className="modal-range-inputs">
                  <div className="range-input-group">
                    <label>Linha Inicial:</label>
                    <input
                      type="number"
                      value={linhaInicial}
                      onChange={(e) => {
                        const novaInicial = Number(e.target.value);
                        const { linhaInicial: novaInicialValida, linhaFinal: novaFinalValida } = validarEajustarValores(novaInicial, linhaFinal);
                        setLinhaInicial(novaInicialValida);
                        setLinhaFinal(novaFinalValida);
                      }}
                      min="2"
                      max={todasLinhasImportadas.length + 1}
                    />
                  </div>
                  <p className="modal-info">
                    Serão executadas todas as linhas a partir da linha {linhaInicial} até a linha {todasLinhasImportadas.length + 1} (total: {todasLinhasImportadas.filter(l => l.linha >= linhaInicial).length} linhas)
                  </p>
                </div>
              )}

              {modoExecucaoSelecionado === 'intervalo' && (
                <div className="modal-range-inputs">
                  <div className="range-input-group">
                    <label>Linha Inicial:</label>
                    <input
                      type="number"
                      value={linhaInicial}
                      onChange={(e) => {
                        const novaInicial = Number(e.target.value);
                        const { linhaInicial: novaInicialValida, linhaFinal: novaFinalValida } = validarEajustarValores(novaInicial, linhaFinal);
                        setLinhaInicial(novaInicialValida);
                        setLinhaFinal(novaFinalValida);
                      }}
                      min="2"
                      max={linhaFinal}
                    />
                  </div>
                  <div className="range-input-group">
                    <label>Linha Final:</label>
                    <input
                      type="number"
                      value={linhaFinal}
                      onChange={(e) => {
                        const novaFinal = Number(e.target.value);
                        const { linhaInicial: novaInicialValida, linhaFinal: novaFinalValida } = validarEajustarValores(linhaInicial, novaFinal);
                        setLinhaInicial(novaInicialValida);
                        setLinhaFinal(novaFinalValida);
                      }}
                      min={linhaInicial}
                      max={todasLinhasImportadas.length + 1}
                    />
                  </div>
                  <p className="modal-info">
                    Serão executadas as linhas de {linhaInicial} até {linhaFinal} (total: {todasLinhasImportadas.filter(l => l.linha >= linhaInicial && l.linha <= linhaFinal).length} linhas)
                  </p>
                </div>
              )}

              {modoExecucaoSelecionado === 'selecionadas' && (
                <div className="modal-selected-lines">
                  <h4>Selecione as linhas desejadas:</h4>
                  <div className="cinema-grid">
                    {todasLinhasImportadas.map(linha => (
                      <button
                        key={linha.linha}
                        className={`cinema-seat ${linhasSelecionadas.includes(linha.linha) ? 'selected' : ''}`}
                        onClick={() => toggleLinhaSelecionada(linha.linha)}
                        type="button"
                      >
                        {linha.linha}
                      </button>
                    ))}
                  </div>
                  <p className="modal-info">
                    Linhas selecionadas: {linhasSelecionadas.length > 0 ? linhasSelecionadas.join(', ') : 'Nenhuma'} (total: {linhasSelecionadas.length} linhas)
                  </p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="automacao-btn btn-secondary" onClick={fecharModalSelecao}>
                Cancelar
              </button>
              <button className="automacao-btn btn-primary" onClick={confirmarSelecao}>
                Confirmar Seleção
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}