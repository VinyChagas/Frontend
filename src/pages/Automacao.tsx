import "../styles/Automacao.scss";
import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import * as XLSX from "xlsx";
import { useConfiguracaoAutomacao } from "../hooks/useConfiguracaoAutomacao";
import { useEmpresa } from "../contexts/EmpresaContext";
import { useNavigate } from "react-router-dom";

import EmpresaSelector from "../components/EmpresaSelector";

// Base da API (permite sobrescrever via Vite env)
const API_BASE_URL: string = (import.meta as any)?.env?.VITE_API_URL || "http://localhost:4000";

// Sistema de Notificações
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  icon?: string;
}

const NotificationSystem: React.FC<{ notifications: Notification[]; removeNotification: (id: string) => void }> = ({ notifications, removeNotification }) => {
  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
          onClick={() => removeNotification(notification.id)}
        >
          <div className="notification-icon">
            {notification.icon || (notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : notification.type === 'warning' ? '⚠️' : 'ℹ️')}
          </div>
          <div className="notification-content">
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">{notification.message}</div>
          </div>
          <button className="notification-close" onClick={(e) => { e.stopPropagation(); removeNotification(notification.id); }}>
            ×
          </button>
          <div className="notification-progress"></div>
        </div>
      ))}
    </div>
  );
};

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

// Função utilitária para sanitizar nomes de arquivo (sincronizada com o backend)
function sanitizarNomeArquivo(nome: string): string {
  return nome
    .replace(/[<>:"/\\|?*]/g, '') // Remove caracteres inválidos para Windows
    .replace(/\s+/g, '_') // Substitui espaços por underscore
    .replace(/_{2,}/g, '_') // Remove underscores duplicados
    .trim();
}

export default function Automacao() {
  const navigate = useNavigate();
  const { empresaSelecionada } = useEmpresa();
  
  // Hook para configurações de automação
  const { criarPayloadExecucao, obterConfiguracaoAtiva } = useConfiguracaoAutomacao();
  
  // Estados para notificações
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, duration: number = 5000) => {
    const id = Date.now().toString();
    const newNotification: Notification = { id, type, title, message, duration };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Remove automaticamente após a duração especificada
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Funções de conveniência para tipos específicos
  const showSuccess = (title: string, message: string, duration?: number) => 
    addNotification('success', title, message, duration);
  
  const showError = (title: string, message: string, duration?: number) => 
    addNotification('error', title, message, duration);
  
  const showWarning = (title: string, message: string, duration?: number) => 
    addNotification('warning', title, message, duration);
  

  
  const [linhasAtivas, setLinhasAtivas] = useState<Linha[]>([]);
  const [linhasComErro, setLinhasComErro] = useState<Linha[]>([]);
  const [respostaCaptcha, setRespostaCaptcha] = useState<Record<number,string>>({});
  const [captchaImgBase64, setCaptchaImgBase64] = useState<string | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [linhaCaptchaAtual, setLinhaCaptchaAtual] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [globalProgress, setGlobalProgress] = useState<number>(0);
  const [statusAutomacao, setStatusAutomacao] = useState<{ pausada: boolean; parada: boolean }>({ pausada: false, parada: false });
  
  // Estados para mensagem de parada
  const [showParadaMessage, setShowParadaMessage] = useState(false);
  const [paradaMessage, setParadaMessage] = useState('');
  const [paradaType, setParadaType] = useState<'info' | 'success' | 'warning'>('info');
  
  // Estados para o modal de seleção
  const [showModalSelecao, setShowModalSelecao] = useState(false);
  const [todasLinhasImportadas, setTodasLinhasImportadas] = useState<Linha[]>([]);
  const [modoExecucaoSelecionado, setModoExecucaoSelecionado] = useState<ModoExecucao>('a-partir');
  const [linhaInicial, setLinhaInicial] = useState<number>(0);
  const [linhaFinal, setLinhaFinal] = useState<number>(0);
  const [linhasSelecionadas, setLinhasSelecionadas] = useState<number[]>([]);

  // Estados para o modal de configuração de campos obrigatórios
  const [showModalCamposObrigatorios, setShowModalCamposObrigatorios] = useState(false);
  const [camposObrigatorios, setCamposObrigatorios] = useState({
    mes: '',
    ano: '',
    codSistema: '',
    IM: ''
  });
  const [linhasParaProcessar, setLinhasParaProcessar] = useState<Linha[]>([]);

  // Estado para controlar se a empresa possui planilha importada
  const [empresaPossuiPlanilha, setEmpresaPossuiPlanilha] = useState(false);
  // Modal de confirmação de reimportação
  const [showModalReimportacao, setShowModalReimportacao] = useState(false);
  const [arquivoPendente, setArquivoPendente] = useState<File | null>(null);

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
    if (statusLower.includes('finalizando') || statusLower.includes('"finalizando"')) return 'Finalizando processo';
    if (statusLower.includes('navegador encerrado') || statusLower.includes('browser closed') || statusLower.includes('driver quit')) return 'Navegador encerrado - Processo finalizado';
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

  // Captura eventos de parada da automação
  useEffect(() => {
    function handleAutomacaoParada(data: any) {
      console.log('🛑 [FRONTEND] Evento de parada recebido:', data);
      setParadaMessage(data.mensagem || 'Automação sendo parada...');
      setParadaType(data.tipo || 'warning');
      setShowParadaMessage(true);
      
      // Limpar todas as linhas ativas imediatamente
      setLinhasAtivas([]);
      setGlobalProgress(0);
      
      // Atualizar status local
      setStatusAutomacao(prev => ({ ...prev, parada: true }));
      
      // Ocultar mensagem após 3 segundos para mensagens de warning
      setTimeout(fecharMensagemComFadeOut, 3000);
    }

    function handleAutomacaoParadaFinalizada(data: any) {
      console.log('✅ [FRONTEND] Parada finalizada:', data);
      setParadaMessage(data.mensagem || 'Automação parada com sucesso!');
      setParadaType(data.tipo || 'success');
      setShowParadaMessage(true);
      
      // Ocultar mensagem após 5 segundos
      setTimeout(fecharMensagemComFadeOut, 5000);
    }

    socket.on("automacao-parada", handleAutomacaoParada);
    socket.on("automacao-parada-finalizada", handleAutomacaoParadaFinalizada);
    
    return () => {
      socket.off("automacao-parada", handleAutomacaoParada);
      socket.off("automacao-parada-finalizada", handleAutomacaoParadaFinalizada);
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
        const isFinalFromStatus = /(final|conclu|empresa validada|completo|terminad|finalizando|"finalizando"|navegador encerrado|browser closed|driver quit)/i.test(status || '');
        const isSuccessFromStatus = /(sucesso|conclu|ok)/i.test(status || '');
        const isErrorFromStatus = /(erro|falha|inválid|inval|fracass|nova senha)/i.test(status || '');
        const isFinalFromSteps = (typeof info.stepIndex === 'number' && typeof info.stepTotal === 'number' && info.stepTotal! > 0 && info.stepIndex! >= info.stepTotal! - 1);
        const isFinal = Boolean(info.isFinal || isFinalFromStatus || isFinalFromSteps);

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
          // Se o status for "Finalizando", considera como 100% independente da etapa
          else if (lowerStatus.includes('finalizando') || lowerStatus.includes('"finalizando"')) fallbackPercent = 100;
          // Se o navegador foi encerrado, considera como 100%
          else if (lowerStatus.includes('navegador encerrado') || lowerStatus.includes('browser closed') || lowerStatus.includes('driver quit')) fallbackPercent = 100;
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
                  // Prioriza status "Finalizando" sobre qualquer cálculo
                  if (lowerStatus.includes('finalizando') || lowerStatus.includes('"finalizando"')) return 100;
                  // Prioriza quando o navegador for encerrado
                  if (lowerStatus.includes('navegador encerrado') || lowerStatus.includes('browser closed') || lowerStatus.includes('driver quit')) return 100;
                  if (isFinal) return 100;
                  
                  const base = percentFromInfo ?? l.progressPercent ?? fallbackPercent ?? 0;
                  const bounded = Math.max(0, Math.min(100, Math.round(base)));
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
      if (l.status?.toLowerCase().includes('finalizando') || l.status?.toLowerCase().includes('"finalizando"')) return 100;
      if (l.status?.toLowerCase().includes('navegador encerrado') || l.status?.toLowerCase().includes('browser closed') || l.status?.toLowerCase().includes('driver quit')) return 100;
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
      setEmpresaPossuiPlanilha(false);
      return;
    }

    // Carrega dados da empresa selecionada
    const carregarDadosEmpresa = async () => {
      try {
        // Sanitiza nome usando a mesma lógica do backend
        const nomeArquivoSeguro = sanitizarNomeArquivo(empresaSelecionada.nome);
        
        // Log para debug
        console.log(`🔍 [FRONTEND DEBUG] Nome original: "${empresaSelecionada.nome}"`);
        console.log(`🔍 [FRONTEND DEBUG] Nome sanitizado: "${nomeArquivoSeguro}"`);
        
        // PRIMEIRO: Tenta carregar a planilha salva da empresa
        console.log(`📊 [FRONTEND] Carregando planilha para empresa: ${empresaSelecionada.nome}`);
        const responsePlanilha = await fetch(`${API_BASE_URL}/api/planilhas/${encodeURIComponent(nomeArquivoSeguro)}`);
        
        if (responsePlanilha.ok) {
          const dadosPlanilha = await responsePlanilha.json();
          if (Array.isArray(dadosPlanilha) && dadosPlanilha.length > 0) {
            console.log(`✅ [FRONTEND] Planilha carregada com sucesso: ${dadosPlanilha.length} linhas`);
            setTodasLinhasImportadas(dadosPlanilha);
            setEmpresaPossuiPlanilha(true); // Marca que a empresa possui planilha
            
            // Mostra mensagem de sucesso para o usuário
            console.log(`🎉 [FRONTEND] Planilha carregada automaticamente para ${empresaSelecionada.nome}`);
            
            // SEGUNDO: Tenta carregar dados de validação para obter status das linhas
            console.log(`📊 [FRONTEND] Carregando dados de validação para empresa: ${empresaSelecionada.nome}`);
            const responseValidacao = await fetch(`${API_BASE_URL}/api/validacoes/${encodeURIComponent(nomeArquivoSeguro)}`);
            
            if (responseValidacao.ok) {
              const dadosValidacao = await responseValidacao.json();
              if (Array.isArray(dadosValidacao) && dadosValidacao.length > 0) {
                console.log(`✅ [FRONTEND] Dados de validação carregados: ${dadosValidacao.length} linhas`);
                
                // Mescla os dados da planilha com os dados de validação
                const linhasMescladas = dadosPlanilha.map(linhaPlanilha => {
                  const linhaValidacao = dadosValidacao.find(lv => lv.linha === linhaPlanilha.linha);
                  return {
                    ...linhaPlanilha,
                    ...linhaValidacao, // Sobrescreve com dados de validação se existirem
                    // Preserva dados da planilha que não estão na validação
                    empresa: linhaPlanilha.empresa || linhaValidacao?.empresa,
                    CNPJ: linhaPlanilha.CNPJ || linhaValidacao?.CNPJ,
                    procurador: linhaPlanilha.procurador || linhaValidacao?.procurador,
                    presumido: linhaPlanilha.presumido || linhaValidacao?.presumido,
                    usuario: linhaPlanilha.usuario || linhaValidacao?.usuario,
                    senha: linhaPlanilha.senha || linhaValidacao?.senha,
                    responsavel: linhaPlanilha.responsavel || linhaValidacao?.responsavel,
                    codSistema: linhaPlanilha.codSistema || linhaValidacao?.codSistema,
                    mes: linhaPlanilha.mes || linhaValidacao?.mes,
                    ano: linhaPlanilha.ano || linhaValidacao?.ano,
                    IM: linhaPlanilha.IM || linhaValidacao?.IM,
                  };
                });
                
                setTodasLinhasImportadas(linhasMescladas);
                
                // Define linhas ativas baseado no status
                const linhasComStatus = linhasMescladas.filter(linha => 
                  linha.status && !linha.status.toLowerCase().includes('erro')
                );
                setLinhasAtivas(linhasComStatus);
                
                console.log(`✅ [FRONTEND] Dados mesclados com sucesso: ${linhasMescladas.length} linhas totais, ${linhasComStatus.length} linhas ativas`);
              } else {
                // Se não há dados de validação, usa apenas a planilha
                console.log(`ℹ️ [FRONTEND] Nenhum dado de validação encontrado, usando apenas planilha`);
                setLinhasAtivas([]);
              }
            } else {
              // Se não conseguiu carregar validação, usa apenas a planilha
              console.log(`ℹ️ [FRONTEND] Não foi possível carregar dados de validação, usando apenas planilha`);
              setLinhasAtivas([]);
            }
          } else {
            console.warn('⚠️ [FRONTEND] Planilha encontrada mas sem dados válidos');
            setTodasLinhasImportadas([]);
            setLinhasAtivas([]);
            setEmpresaPossuiPlanilha(false);
          }
        } else {
          // Se não há planilha, tenta carregar apenas dados de validação (compatibilidade)
          console.log(`ℹ️ [FRONTEND] Nenhuma planilha encontrada, tentando carregar dados de validação`);
          setEmpresaPossuiPlanilha(false); // Marca que não possui planilha
          const responseValidacao = await fetch(`${API_BASE_URL}/api/validacoes/${encodeURIComponent(nomeArquivoSeguro)}`);
          
          if (responseValidacao.ok) {
            const dados = await responseValidacao.json();
            if (Array.isArray(dados) && dados.length > 0) {
              console.log(`✅ [FRONTEND] Dados de validação carregados: ${dados.length} linhas`);
              setTodasLinhasImportadas(dados);
              setLinhasAtivas(dados.filter(linha => linha.status && !linha.status.toLowerCase().includes('erro')));
            } else {
              console.log(`ℹ️ [FRONTEND] Nenhum dado encontrado para esta contabilidade`);
              setTodasLinhasImportadas([]);
              setLinhasAtivas([]);
            }
          } else {
            console.log(`ℹ️ [FRONTEND] Nenhum dado encontrado para esta contabilidade`);
            setTodasLinhasImportadas([]);
            setLinhasAtivas([]);
          }
        }
      } catch (error) {
        console.error('❌ [FRONTEND] Erro ao carregar dados da empresa:', error);
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

  // Lê e processa o arquivo Excel selecionado
  const lerEProcessarArquivoExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const mapearColuna = (row: any, possiveisNomes: string[]): string => {
        for (const nome of possiveisNomes) {
          if (row[nome] !== undefined && row[nome] !== null && row[nome] !== '') {
            return String(row[nome]).trim();
          }
        }
        return '';
      };

      const linhasProcessadas = (rows as any[]).map((row: any, index: number) => {
        const procurador = mapearColuna(row, ['Procurador', 'PROCURADOR', 'procurador']);
        const presumido = mapearColuna(row, ['Presumido', 'PRESUMIDO', 'presumido']);
        const empresa = mapearColuna(row, ['empresa', 'Empresa', 'EMPRESA', 'Nome', 'NOME']);
        const cnpj = mapearColuna(row, ['CNPJ', 'cnpj', 'Cnpj']);
        const usuario = mapearColuna(row, ['usuario', 'Usuario', 'USUARIO', 'User', 'user']);
        const senha = mapearColuna(row, ['senha', 'Senha', 'SENHA', 'Password', 'password']);
        const responsavel = mapearColuna(row, ['responsavel', 'Responsavel', 'RESPONSAVEL', 'Responsável']);
        const codSistema = mapearColuna(row, ['codSistema', 'Cod. Sistema', 'COD SISTEMA', 'codigo', 'Código']);
        const mes = mapearColuna(row, ['mes', 'Mês', 'MES', 'Mes', 'month', 'Month']);
        const ano = mapearColuna(row, ['ano', 'Ano', 'ANO', 'year', 'Year']);
        const im = mapearColuna(row, ['IM', 'im', 'Im', 'Inscrição Municipal', 'INSCRICAO MUNICIPAL']);

        return {
          linha: index + 2,
          procurador: procurador.toUpperCase() || "",
          presumido: presumido.toUpperCase() || "",
          empresa: empresa || "",
          CNPJ: cnpj || "",
          usuario: usuario || "",
          senha: senha || "",
          responsavel: responsavel || "",
          codSistema: codSistema || "",
          mes: mes || "",
          ano: ano || "",
          IM: im || "",
          status: "",
          captchaImg: "",
        };
      });

      const camposObrigatoriosVazios = linhasProcessadas.some(linha => !linha.mes || !linha.ano);
      if (camposObrigatoriosVazios) {
        setLinhasParaProcessar(linhasProcessadas);
        setCamposObrigatorios({ mes: '07', ano: '2025', codSistema: '', IM: '' });
        setShowModalCamposObrigatorios(true);
        return;
      }

      processarLinhasImportadas(linhasProcessadas, file);
    };
    reader.readAsArrayBuffer(file);
  };

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (empresaPossuiPlanilha) {
        setArquivoPendente(file);
        setShowModalReimportacao(true);
        e.target.value = "";
        return;
      }
      lerEProcessarArquivoExcel(file);
    }
    e.target.value = "";
  }

  // Função para processar as linhas importadas após configuração dos campos obrigatórios
  const processarLinhasImportadas = async (linhasProcessadas: Linha[], file: File) => {
    // Aplica os valores padrão para todas as linhas
    linhasProcessadas.forEach(linha => {
      if (!linha.mes) linha.mes = camposObrigatorios.mes;
      if (!linha.ano) linha.ano = camposObrigatorios.ano;
      if (!linha.codSistema && camposObrigatorios.codSistema) linha.codSistema = camposObrigatorios.codSistema;
      if (!linha.IM && camposObrigatorios.IM) linha.IM = camposObrigatorios.IM;
    });
    
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
          
          // Atualiza o estado para indicar que a empresa possui planilha
          setEmpresaPossuiPlanilha(true);
          
          // Mostra informações sobre os dados processados
          const totalComMes = linhasProcessadas.filter(l => l.mes).length;
          const totalComAno = linhasProcessadas.filter(l => l.ano).length;
          const totalComCodSistema = linhasProcessadas.filter(l => l.codSistema).length;
          const totalComIM = linhasProcessadas.filter(l => l.IM).length;
          
          console.log(`📋 Resumo dos dados processados:`);
          console.log(`   - Mês preenchido: ${totalComMes}/${linhasProcessadas.length}`);
          console.log(`   - Ano preenchido: ${totalComAno}/${linhasProcessadas.length}`);
          console.log(`   - Código do Sistema: ${totalComCodSistema}/${linhasProcessadas.length}`);
          console.log(`   - IM: ${totalComIM}/${linhasProcessadas.length}`);
        } else {
          console.warn('⚠️ Erro ao salvar planilha automaticamente:', resultado.erro);
        }
      } catch (error) {
        console.error('❌ Erro ao salvar planilha automaticamente:', error);
      }
    }
  };

  // Função para executar validação compatível com o backend main.mjs
  const executarValidacao = async () => {
    if (!empresaSelecionada) {
      showError('Empresa não selecionada', 'Selecione uma empresa primeiro!');
      return;
    }

    if (linhasAtivas.length === 0) {
      showError('Planilha não importada', 'Importe uma planilha e selecione linhas para execução!');
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
        showSuccess('Automação finalizada com sucesso!', 'A automação foi finalizada com sucesso!');
        // Atualiza o status para mostrar que está ativa
        setStatusAutomacao({ pausada: false, parada: false });
      } else {
        showError('Erro ao iniciar validação', resultado.erro || 'Erro desconhecido');
      }
    } catch (error) {
      console.error("❌ [FRONTEND] Erro ao executar validação:", error);
      showError('Erro ao executar validação', error instanceof Error ? error.message : 'Erro desconhecido');
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
    // Limpa mensagem de parada
    setShowParadaMessage(false);
    setParadaMessage('');
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
    // Reseta estados do modal de campos obrigatórios
    setShowModalCamposObrigatorios(false);
    setCamposObrigatorios({
      mes: '',
      ano: '',
      codSistema: '',
      IM: ''
    });
    setLinhasParaProcessar([]);
    // Reseta estado de planilha
    setEmpresaPossuiPlanilha(false);
  };

  // Função utilitária para fechar mensagem com fade-out
  const fecharMensagemComFadeOut = () => {
    const messageElement = document.querySelector('.automacao-parada-message');
    if (messageElement) {
      messageElement.classList.add('fade-out');
      setTimeout(() => {
        setShowParadaMessage(false);
      }, 400); // Tempo da animação
    } else {
      setShowParadaMessage(false);
    }
  };

  // Função para limpar apenas a planilha da empresa atual
  const limparPlanilhaEmpresa = async () => {
    if (!empresaSelecionada) return;
    
    const confirmarLimpeza = window.confirm(
      `🗑️ Deseja remover a planilha importada da empresa "${empresaSelecionada.nome}"?\n\n` +
      `Esta ação irá remover ${todasLinhasImportadas.length} linhas e não pode ser desfeita.`
    );
    
    if (!confirmarLimpeza) return;
    
    try {
      // Chama a API para remover os arquivos da empresa
      const res = await fetch(`${API_BASE_URL}/api/empresa-arquivos/${encodeURIComponent(empresaSelecionada.nome)}`, {
        method: 'DELETE'
      });
      
              if (res.ok) {
          const resultado = await res.json();
          console.log('✅ [FRONTEND] Planilha removida com sucesso:', resultado.mensagem);
          
          // Limpa os estados locais
          setTodasLinhasImportadas([]);
          setLinhasAtivas([]);
          setLinhasComErro([]);
          setEmpresaPossuiPlanilha(false);
          
          showSuccess('Planilha removida com sucesso!', 'A planilha foi removida da empresa.');
        } else {
          const erro = await res.json();
          console.error('❌ [FRONTEND] Erro ao remover planilha:', erro);
          showError('Erro ao remover planilha', erro.erro || 'Erro desconhecido');
        }
      } catch (error) {
        console.error('❌ [FRONTEND] Erro ao remover planilha:', error);
        showError('Erro ao remover planilha', error instanceof Error ? error.message : 'Erro desconhecido');
      }
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
    // Limpa mensagem de parada
    setShowParadaMessage(false);
    setParadaMessage('');
    setShowModalSelecao(false);
    setModoExecucaoSelecionado('a-partir');
    setLinhaInicial(0);
    setLinhaFinal(0);
    setLinhasSelecionadas([]);
    // Limpa estados do modal de campos obrigatórios
    setShowModalCamposObrigatorios(false);
    setCamposObrigatorios({
      mes: '',
      ano: '',
      codSistema: '',
      IM: ''
    });
    setLinhasParaProcessar([]);
    // Reseta estado de planilha
    setEmpresaPossuiPlanilha(false);
  };

  // Funções para o modal de seleção
  const abrirModalSelecao = () => {
    if (todasLinhasImportadas.length === 0) {
      showWarning('Planilha não importada', 'Por favor, importe uma planilha primeiro!');
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
          showError('Linha inicial inválida', `Linha inicial deve estar entre 2 e ${todasLinhasImportadas.length + 1}`);
          return;
        }
        linhasParaExecutar = todasLinhasImportadas
          .filter(linha => linha.linha >= linhaInicial)
          .map(linha => linha.linha);
        break;
      
      case 'intervalo':
        // Linhas no intervalo especificado
        if (linhaInicial < 2 || linhaFinal > todasLinhasImportadas.length + 1 || linhaInicial > linhaFinal) {
          showError('Intervalo inválido', `Linha inicial deve ser menor que linha final e estar entre 2 e ${todasLinhasImportadas.length + 1}`);
          return;
        }
        linhasParaExecutar = todasLinhasImportadas
          .filter(linha => linha.linha >= linhaInicial && linha.linha <= linhaFinal)
          .map(linha => linha.linha);
        break;
      
      case 'selecionadas':
        // Apenas as linhas selecionadas
        if (linhasSelecionadas.length === 0) {
          showError('Nenhuma linha selecionada', 'Selecione pelo menos uma linha para execução!');
          return;
        }
        linhasParaExecutar = linhasSelecionadas.sort((a, b) => a - b);
        break;
    }

    if (linhasParaExecutar.length === 0) {
      showError('Nenhuma linha selecionada', 'Nenhuma linha selecionada para execução!');
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
      {/* Sistema de Notificações */}
      <NotificationSystem 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      
      {/* Mensagem de Parada */}
      {showParadaMessage && (
        <div className={`automacao-parada-message ${paradaType}`}>
          <div className="parada-message-content">
            <div className="parada-status-indicator">
              <div className="status-dot"></div>
            </div>
            <div className="parada-content">
              <div className="parada-title">
                {paradaType === 'success' ? 'Automação Parada' : 
                 paradaType === 'warning' ? 'Parando Automação' : 'Informação'}
              </div>
              <div className="parada-message">
                {paradaMessage}
              </div>
            </div>
            <button 
              className="parada-close-btn"
              onClick={fecharMensagemComFadeOut}
              aria-label="Fechar mensagem"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          {/* Barra de progresso sutil */}
          <div className="parada-progress-bar">
            <div className="parada-progress-fill"></div>
          </div>
        </div>
      )}
      
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
                      color: "#ffffff",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.3rem",
                      borderRadius: "6px",
                      transition: "all 0.2s"
                    }}
                  >
                    ← Voltar para Home
                  </button>
                </div>
                
                {/* Seletor de Empresa */}
                <div className="empresa-selector-container">
                  
                  <EmpresaSelector />
                  {!empresaSelecionada && (
                    <p className="empresa-selector-hint">
                      <br />
                    </p>
                  )}
                  {empresaSelecionada && !empresaPossuiPlanilha && (
                    <p className="empresa-planilha-hint">
                      📥 Esta contabilidade ainda não possui planilha importada. Clique em "Importar Planilha" para começar.
                    </p>
                  )}
                </div>

                {/* Informações da empresa selecionada */}
                {empresaSelecionada ? (
                  <>
                  
                    <div className="empresa-dados">
                      <span><strong>CNPJ:</strong> {empresaSelecionada.cnpj}</span>
                      <span><strong>Clientes:</strong> {empresaSelecionada.clientes}</span>
                    </div>
                    
                    {/* Indicador de planilha importada */}
                    {empresaPossuiPlanilha && (
                      <div className="empresa-planilha-status">
                        <span className="status-indicator success">📊</span>
                        <span className="status-text">Planilha importada ({todasLinhasImportadas.length} linhas)</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
              
                    <div className="empresa-dados">
                      <span>Selecione uma contabilidade para começar</span>
                    </div>
                  </>
                )}
              </div>
              <div className="header-actions" >
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
                  className="automacao-btn btn-primary automacao-header-actions" 
                  disabled={!empresaSelecionada}
                >
                  {!empresaSelecionada 
                    ? 'Selecione Empresa' 
                    : empresaPossuiPlanilha 
                      ? 'Reimportar Planilha' 
                      : 'Importar Planilha'
                  }
                </button>
                <div className="automacao-header-actions">
                  {todasLinhasImportadas.length > 0 && (
                    <button
                      onClick={abrirModalSelecao}
                      className="automacao-btn btn-success automacao-header-btn"
                    >
                      Selecionar Linhas
                    </button>
                  )}
                  {todasLinhasImportadas.length > 0 && (
                    <button
                      onClick={limparDadosEmpresa}
                      className="automacao-btn btn-secondary automacao-header-btn"
                    >
                      Limpar Dados
                    </button>
                  )}
                  {todasLinhasImportadas.length > 0 && (
                    <button
                      onClick={limparPlanilhaEmpresa}
                      className="automacao-btn btn-danger automacao-header-btn"
                    >
                      Limpar Planilha
                    </button>
                  )}
                </div>
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
                    onClick={async () => {
                      try {
                        const url = `${API_BASE_URL}/api/exportar-relatorios-pdf`;
                        const link = document.createElement('a');
                        link.href = url;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      } catch (err) {
                        console.error('Erro ao exportar PDFs:', err);
                        showError('Erro ao exportar PDFs', err instanceof Error ? err.message : 'Erro desconhecido');
                      }
                    }}
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
                          showSuccess("Automação continuada", "▶️ Automação continuada com sucesso!");
                          setStatusAutomacao(prev => ({ ...prev, pausada: false }));
                        } else {
                          showError("Erro ao continuar automação", resultado.erro || 'Erro desconhecido');
                        }
                      } else {
                        console.log('⏸️ [FRONTEND] Pausando automação...');
                        const res = await fetch(`${API_BASE_URL}/api/pausar-automacao`, { 
                          method: "POST" 
                        });
                        const resultado = await res.json();
                        
                        if (resultado.sucesso) {
                          showSuccess("Automação pausada", "⏸️ Automação pausada com sucesso!");
                          setStatusAutomacao(prev => ({ ...prev, pausada: true }));
                        } else {
                          showError("Erro ao pausar automação", resultado.erro || 'Erro desconhecido');
                        }
                      }
                    } catch (error) {
                      console.error('❌ [FRONTEND] Erro ao controlar automação:', error);
                      showError("Erro ao controlar automação", error instanceof Error ? error.message : 'Erro desconhecido');
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
                        
                        // Mostrar mensagem de parada imediatamente
                        setParadaMessage('Parando automação...');
                        setParadaType('warning');
                        setShowParadaMessage(true);
                        
                        // Limpar linhas ativas imediatamente para feedback visual
                        setLinhasAtivas([]);
                        setGlobalProgress(0);
                        
                        const res = await fetch(`${API_BASE_URL}/api/parar-automacao`, { 
                          method: "POST" 
                        });
                        const resultado = await res.json();
                        
                        if (resultado.sucesso) {
                          console.log('✅ [FRONTEND] Automação parada:', resultado.mensagem);
                          // Atualiza o status imediatamente
                          setStatusAutomacao(prev => ({ ...prev, parada: true }));
                          
                          // Mensagem de sucesso será mostrada via socket
                        } else {
                          console.error('❌ [FRONTEND] Erro ao parar automação:', resultado.erro);
                          setParadaMessage('Erro ao parar automação: ' + (resultado.erro || 'Erro desconhecido'));
                          setParadaType('warning');
                          
                          // Ocultar mensagem de erro após 3 segundos
                          setTimeout(fecharMensagemComFadeOut, 3000);
                        }
                      } catch (error) {
                        console.error('❌ [FRONTEND] Erro ao parar automação:', error);
                        setParadaMessage('Erro ao parar automação: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
                        setParadaType('warning');
                        
                        // Ocultar mensagem de erro após 3 segundos
                        setTimeout(fecharMensagemComFadeOut, 3000);
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
                          showSuccess("Controles resetados", "🔄 Controles resetados com sucesso!");
                          console.log('✅ [FRONTEND] Controles resetados:', resultado.mensagem);
                          // Reseta a tela após resetar os controles no backend
                          resetarTela();
                        } else {
                          showError("Erro ao resetar controles", resultado.erro || 'Erro desconhecido');
                        }
                      } catch (error) {
                        console.error('❌ [FRONTEND] Erro ao resetar controles:', error);
                        showError("Erro ao resetar controles", error instanceof Error ? error.message : 'Erro desconhecido');
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
                <div className="tabela-titulo">
                  Linhas Ativas
                  {empresaPossuiPlanilha && (
                    <span className="tabela-planilha-indicator">
                      📊 Planilha salva
                    </span>
                  )}
                </div>
                {renderTabela(linhasAtivas)}
              </div>
              <div className="tabela-wrapper">
                <div className="tabela-titulo">
                  Linhas com Erro
                  {empresaPossuiPlanilha && (
                    <span className="tabela-planilha-indicator">
                      📊 Planilha salva
                    </span>
                  )}
                </div>
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

      {/* Modal de Configuração de Campos Obrigatórios */}
      {showModalCamposObrigatorios && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Configurar Campos Obrigatórios</h2>
            <div className="modal-body">
              <div className="modal-info-header">
                <p>A planilha importada não possui alguns campos obrigatórios. Configure os valores padrão:</p>
                <p><strong>Total de linhas:</strong> {linhasParaProcessar.length}</p>
              </div>
              
              <div className="modal-campos-obrigatorios">
                <div className="campo-grupo">
                  <label htmlFor="mes-padrao">Mês Padrão: <span className="obrigatorio">*</span></label>
                  <input
                    id="mes-padrao"
                    type="text"
                    value={camposObrigatorios.mes}
                    onChange={(e) => setCamposObrigatorios(prev => ({ ...prev, mes: e.target.value }))}
                    placeholder="Ex: 07, Julho, 7"
                    required
                  />
                  <small>Mês para todas as linhas que não possuem este campo</small>
                </div>
                
                <div className="campo-grupo">
                  <label htmlFor="ano-padrao">Ano Padrão: <span className="obrigatorio">*</span></label>
                  <input
                    id="ano-padrao"
                    type="text"
                    value={camposObrigatorios.ano}
                    onChange={(e) => setCamposObrigatorios(prev => ({ ...prev, ano: e.target.value }))}
                    placeholder="Ex: 2025"
                    required
                  />
                  <small>Ano para todas as linhas que não possuem este campo</small>
                </div>
                
                <div className="campo-grupo">
                  <label htmlFor="cod-sistema-padrao">Código do Sistema (Opcional):</label>
                  <input
                    id="cod-sistema-padrao"
                    type="text"
                    value={camposObrigatorios.codSistema}
                    onChange={(e) => setCamposObrigatorios(prev => ({ ...prev, codSistema: e.target.value }))}
                    placeholder="Ex: SISTEMA001"
                  />
                  <small>Código do sistema para todas as linhas que não possuem este campo</small>
                </div>
                
                <div className="campo-grupo">
                  <label htmlFor="im-padrao">IM - Inscrição Municipal (Opcional):</label>
                  <input
                    id="im-padrao"
                    type="text"
                    value={camposObrigatorios.IM}
                    onChange={(e) => setCamposObrigatorios(prev => ({ ...prev, IM: e.target.value }))}
                    placeholder="Ex: 123456"
                  />
                  <small>Inscrição municipal para todas as linhas que não possuem este campo</small>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="automacao-btn btn-secondary" 
                onClick={() => {
                  setShowModalCamposObrigatorios(false);
                  setLinhasParaProcessar([]);
                }}
              >
                Cancelar
              </button>
              <button 
                className="automacao-btn btn-primary" 
                onClick={() => {
                  if (camposObrigatorios.mes && camposObrigatorios.ano) {
                    setShowModalCamposObrigatorios(false);
                    // Processa as linhas com os campos configurados
                    processarLinhasImportadas(linhasParaProcessar, new File([], 'planilha_importada.xlsx'));
                    setLinhasParaProcessar([]);
                  } else {
                    showWarning('Campos obrigatórios', 'Por favor, preencha pelo menos o mês e ano padrão!');
                  }
                }}
                disabled={!camposObrigatorios.mes || !camposObrigatorios.ano}
              >
                Confirmar e Processar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Confirmação de Reimportação */}
      {showModalReimportacao && (
        <div className="modal-overlay">
          <div className="modal-content modal-warning">
            <div className="modal-warning-icon">⚠️</div>
            <h2>Reimportar Planilha?</h2>
            <div className="modal-body">
              <p>
                A contabilidade <strong>{empresaSelecionada?.nome}</strong> já possui uma planilha importada
                com <strong>{todasLinhasImportadas.length}</strong> linhas.
              </p>
              <p>
                Reimportar irá <strong>substituir todos os dados existentes</strong>.
              </p>
              <p>Deseja continuar?</p>
            </div>
            <div className="modal-footer">
              <button
                className="automacao-btn btn-secondary"
                onClick={() => { setShowModalReimportacao(false); setArquivoPendente(null); }}
              >
                Cancelar
              </button>
              <button
                className="automacao-btn btn-warning"
                onClick={() => {
                  const f = arquivoPendente;
                  setShowModalReimportacao(false);
                  setArquivoPendente(null);
                  if (f) lerEProcessarArquivoExcel(f);
                }}
              >
                Reimportar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}