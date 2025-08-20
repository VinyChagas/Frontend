# Sistema de Payload Completo para Automação

## Visão Geral

Este sistema permite criar um payload completo que integra:
1. **Configurações da tela de Parâmetros** - Configurações salvas e gerenciadas pelo usuário
2. **Seleções do modal de Automação** - Linhas selecionadas e modo de execução
3. **Metadados** - Informações sobre empresa, timestamp, etc.

## Estrutura do Payload

### Payload Completo
```typescript
interface PayloadExecucao {
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
```

### Parâmetros de Validação
```typescript
interface ParametrosValidacao {
  modoExecucao: 'manual' | 'automatico';
  numeroNavegadores: number;
  timeoutCaptcha: number;
  tentativasMaximas: number;
  modoDepuracao: boolean;
  tipoMonitor: 'FHD' | 'QHD';
}
```

### Parâmetros de Automação
```typescript
interface ParametrosAutomacao {
  modoExecucao: 'manual' | 'automatico';
  numeroNavegadores: number;
  timeoutCaptcha: number;
  tentativasMaximas: number;
  modoDepuracao: boolean;
  tipoMonitor: 'FHD' | 'QHD';
  retryEmCasoDeErro: boolean;
  maximoRetries: number;
}
```

## Como Funciona

### 1. Configuração na Tela de Parâmetros
- O usuário configura parâmetros de validação e automação
- Pode criar múltiplas configurações com nomes diferentes
- As configurações são salvas no localStorage
- Uma configuração pode ser marcada como "ativa"

### 2. Seleção na Tela de Automação
- O usuário importa uma planilha
- Seleciona linhas para execução através do modal
- Escolhe o modo de execução (a-partir, intervalo, selecionadas)

### 3. Criação do Payload
- O sistema combina automaticamente:
  - Configuração ativa dos parâmetros
  - Seleções do modal de automação
  - Informações da empresa
  - Timestamp da execução

### 4. Envio para o Backend
- O payload completo é enviado para `/executar`
- O backend processa tanto o payload completo quanto os parâmetros legados
- As configurações avançadas têm prioridade sobre os parâmetros legados

## Exemplo de Uso

### Frontend (Automacao.tsx)
```typescript
// Criar payload completo
const payloadCompleto = criarPayloadExecucao(
  modoExecucaoSelecionado,    // 'a-partir'
  linhasParaExecutar,         // [2, 3, 4, 5]
  linhaInicial,               // 2
  linhaFinal,                 // 5
  linhasSelecionadas,         // undefined
  empresa.nome,               // 'Empresa Exemplo'
  empresa.cnpj                // '12.345.678/0001-90'
);

// Enviar para o backend
const res = await fetch(`${API_BASE_URL}/executar`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    payloadCompleto,           // Payload completo
    modoExecucao: "Inicia",    // Parâmetros legados para compatibilidade
    linhas: linhasParaExecutar,
    qtdNavegadores: configAutomacao?.numeroNavegadores || 8,
    modoResolucao: configAutomacao?.tipoMonitor || 'FHD',
    modoLogin: configAutomacao?.modoExecucao || 'automatico',
    modoDepuracao: configAutomacao?.modoDepuracao || false,
    timeoutCaptcha: configAutomacao?.timeoutCaptcha || 30000,
    tentativasMaximas: configAutomacao?.tentativasMaximas || 3,
    retryEmCasoDeErro: configAutomacao?.retryEmCasoDeErro || false,
    maximoRetries: configAutomacao?.maximoRetries || 2
  }),
});
```

### Backend (main.mjs)
```javascript
// Processar payload completo se existir
let configuracaoAvancada = null;
if (params.payloadCompleto) {
  configuracaoAvancada = params.payloadCompleto;
  console.log('[AUTOMACAO] Payload completo detectado, usando configurações avançadas');
  
  // Usar configurações avançadas
  const configAutomacao = configuracaoAvancada.configuracao.automacao;
  modoLogin = configAutomacao.modoExecucao;
  qtdNavegadores = configAutomacao.numeroNavegadores;
  modoResolucao = configAutomacao.tipoMonitor;
  timeoutCaptcha = configAutomacao.timeoutCaptcha;
  tentativasMaximas = configAutomacao.tentativasMaximas;
  retryEmCasoDeErro = configAutomacao.retryEmCasoDeErro;
  maximoRetries = configAutomacao.maximoRetries;
} else {
  // Fallback para parâmetros legados
  modoLogin = params.modoLogin || await escolherModoDeLogin();
  qtdNavegadores = Number(params.qtdNavegadores) || await perguntarQtdNavegadores();
  // ... outros parâmetros
}

// Passar configurações para processarLinha
await processarLinha(chromeSetup.driver, config, modoLogin, io, configuracaoAvancada);
```

## Vantagens do Sistema

1. **Flexibilidade**: Permite múltiplas configurações reutilizáveis
2. **Consistência**: Todas as configurações são aplicadas automaticamente
3. **Compatibilidade**: Mantém suporte aos parâmetros legados
4. **Rastreabilidade**: Payload completo com timestamp e metadados
5. **Manutenibilidade**: Configurações centralizadas e organizadas

## Configurações Disponíveis

### Validação
- Modo de execução (manual/automático)
- Número de navegadores
- Timeout para captcha
- Tentativas máximas
- Modo de depuração
- Tipo de monitor (FHD/QHD)

### Automação
- Modo de execução (manual/automático)
- Número de navegadores
- Timeout para captcha
- Tentativas máximas
- Modo de depuração
- Tipo de monitor (FHD/QHD)
- Retry em caso de erro
- Máximo de retries

### Execução
- Modo de seleção (a-partir/intervalo/selecionadas)
- Linhas específicas
- Intervalo de linhas
- Linhas selecionadas individualmente
