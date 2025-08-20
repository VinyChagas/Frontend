import { useState, useEffect } from 'react';

// Tipos para os parâmetros de configuração
export interface ParametrosValidacao {
  modoExecucao: 'manual' | 'automatico';
  numeroNavegadores: number;
  timeoutCaptcha: number;
  tentativasMaximas: number;
  modoDepuracao: boolean;
  tipoMonitor: 'FHD' | 'QHD';
}

export interface ParametrosAutomacao {
  modoExecucao: 'manual' | 'automatico';
  numeroNavegadores: number;
  timeoutCaptcha: number;
  tentativasMaximas: number;
  modoDepuracao: boolean;
  tipoMonitor: 'FHD' | 'QHD';
  retryEmCasoDeErro: boolean;
  maximoRetries: number;
}

export interface ConfiguracaoCompleta {
  nome: string;
  validacao: ParametrosValidacao;
  automacao: ParametrosAutomacao;
  ultimaModificacao?: string;
}

export interface PayloadExecucao {
  // Configurações da tela de Parâmetros
  configuracao: {
    validacao: ParametrosValidacao;
    automacao: ParametrosAutomacao;
  };
  
  // Configurações do modal de seleção
  execucao: {
    modoExecucao: 'a-partir' | 'intervalo' | 'selecionadas';
    linhas: number[];
    linhaInicial?: number;
    linhaFinal?: number;
    linhasSelecionadas?: number[];
  };
  
  // Metadados
  timestamp: string;
  empresa: string;
  cnpj: string;
}

export function useConfiguracaoAutomacao() {
  const [configuracaoAtiva, setConfiguracaoAtiva] = useState<string>('padrao');
  const [configuracoes, setConfiguracoes] = useState<Record<string, ConfiguracaoCompleta>>({
    padrao: {
      nome: 'Configuração Padrão',
      validacao: {
        modoExecucao: 'manual',
        numeroNavegadores: 1,
        timeoutCaptcha: 30000,
        tentativasMaximas: 3,
        modoDepuracao: false,
        tipoMonitor: 'FHD'
      },
      automacao: {
        modoExecucao: 'automatico',
        numeroNavegadores: 2,
        timeoutCaptcha: 30000,
        tentativasMaximas: 3,
        modoDepuracao: false,
        tipoMonitor: 'FHD',
        retryEmCasoDeErro: true,
        maximoRetries: 2
      }
    }
  });

  // Carregar configurações salvas do localStorage
  useEffect(() => {
    const configsSalvas = localStorage.getItem('configuracoesSistema');
    const ativaSalva = localStorage.getItem('configuracaoAtiva');
    if (configsSalvas) {
      try {
        const configs = JSON.parse(configsSalvas);
        setConfiguracoes(configs);
        if (ativaSalva && configs[ativaSalva]) {
          setConfiguracaoAtiva(ativaSalva);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    }
  }, []);

  // Sincroniza configuração ativa no localStorage
  useEffect(() => {
    localStorage.setItem('configuracaoAtiva', configuracaoAtiva);
  }, [configuracaoAtiva]);

  // Salvar configurações no localStorage
  const salvarConfiguracao = (validacao: ParametrosValidacao, automacao: ParametrosAutomacao) => {
    const novaConfig = {
      ...configuracoes,
      [configuracaoAtiva]: {
        nome: configuracoes[configuracaoAtiva]?.nome || 'Nova Configuração',
        validacao,
        automacao,
        ultimaModificacao: new Date().toISOString()
      }
    };
    
    setConfiguracoes(novaConfig);
    localStorage.setItem('configuracoesSistema', JSON.stringify(novaConfig));
  };

  // Criar payload completo para execução
  const criarPayloadExecucao = (
    modoExecucao: 'a-partir' | 'intervalo' | 'selecionadas',
    linhas: number[],
    linhaInicial?: number,
    linhaFinal?: number,
    linhasSelecionadas?: number[],
    empresa?: string,
    cnpj?: string
  ): PayloadExecucao => {
    const configAtiva = configuracoes[configuracaoAtiva];
    
    return {
      configuracao: {
        validacao: configAtiva.validacao,
        automacao: configAtiva.automacao
      },
      execucao: {
        modoExecucao,
        linhas,
        linhaInicial,
        linhaFinal,
        linhasSelecionadas
      },
      timestamp: new Date().toISOString(),
      empresa: empresa || '',
      cnpj: cnpj || ''
    };
  };

  // Obter configuração ativa
  const obterConfiguracaoAtiva = () => configuracoes[configuracaoAtiva];

  // Adicionar nova configuração
  const adicionarConfiguracao = (nome: string, validacao: ParametrosValidacao, automacao: ParametrosAutomacao) => {
    const novaConfig = {
      ...configuracoes,
      [nome]: {
        nome,
        validacao,
        automacao,
        ultimaModificacao: new Date().toISOString()
      }
    };
    
    setConfiguracoes(novaConfig);
    localStorage.setItem('configuracoesSistema', JSON.stringify(novaConfig));
  };

  // Remover configuração
  const removerConfiguracao = (nome: string) => {
    if (nome === 'padrao') return; // Não permite remover a configuração padrão
    
    const novasConfigs = { ...configuracoes };
    delete novasConfigs[nome];
    
    setConfiguracoes(novasConfigs);
    localStorage.setItem('configuracoesSistema', JSON.stringify(novasConfigs));
    
    // Se a configuração removida era a ativa, volta para padrão
    if (configuracaoAtiva === nome) {
      setConfiguracaoAtiva('padrao');
    }
  };

  return {
    configuracaoAtiva,
    setConfiguracaoAtiva,
    configuracoes,
    obterConfiguracaoAtiva,
    salvarConfiguracao,
    adicionarConfiguracao,
    removerConfiguracao,
    criarPayloadExecucao
  };
}
