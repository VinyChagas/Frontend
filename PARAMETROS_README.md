# Tela de Parâmetros - Sistema de Automação

## Visão Geral

A tela de Parâmetros foi criada para permitir a configuração dos modelos de execução do sistema de automação. Esta tela permite configurar separadamente os parâmetros para validação e automação, criando um payload de configuração que pode ser aplicado ao sistema.

## Funcionalidades

### 1. Configurações de Validação
- **Modo de Execução**: Manual ou Automático
- **Número de Navegadores**: 1-10 navegadores simultâneos
- **Delay entre Execuções**: Tempo em milissegundos entre cada execução
- **Timeout Captcha**: Tempo máximo para resolver captchas
- **Tentativas Máximas**: Número máximo de tentativas por operação
- **Pausa entre Etapas**: Opção para pausar entre etapas do processo
- **Tempo de Pausa**: Duração da pausa em milissegundos

### 2. Configurações de Automação
- **Modo de Execução**: Manual ou Automático
- **Número de Navegadores**: 1-10 navegadores simultâneos
- **Delay entre Execuções**: Tempo em milissegundos entre cada execução
- **Timeout Captcha**: Tempo máximo para resolver captchas
- **Tentativas Máximas**: Número máximo de tentativas por operação
- **Pausa entre Etapas**: Opção para pausar entre etapas do processo
- **Tempo de Pausa**: Duração da pausa em milissegundos
- **Processar em Lote**: Opção para processar múltiplos itens em lote
- **Tamanho do Lote**: Número de itens por lote (1-100)
- **Retry em Caso de Erro**: Opção para tentar novamente em caso de falha
- **Máximo de Retries**: Número máximo de tentativas de retry (1-5)

## Como Usar

### 1. Acessar a Tela
- Navegue para o menu lateral
- Clique em "Parâmetros"
- A tela será carregada com as configurações padrão

### 2. Configurar Parâmetros
- **Seletor de Configuração**: Escolha entre configurações salvas ou crie uma nova
- **Seção de Validação**: Configure os parâmetros específicos para validação
- **Seção de Automação**: Configure os parâmetros específicos para automação
- **Campos Condicionais**: Alguns campos aparecem apenas quando opções específicas estão habilitadas

### 3. Salvar Configuração
- Clique em "Salvar Configuração" para persistir as alterações
- As configurações são salvas no localStorage do navegador
- Uma notificação de sucesso será exibida

### 4. Aplicar Configuração
- Clique em "Aplicar Configuração" para aplicar as configurações ao sistema
- Esta ação simula o envio das configurações para o backend
- Uma notificação de sucesso será exibida

### 5. Preview do Payload
- Clique em "Preview do Payload" para visualizar o JSON de configuração
- O payload mostra todas as configurações em formato estruturado
- Útil para verificar se as configurações estão corretas

### 6. Resetar para Padrão
- Clique em "Resetar Padrão" para voltar às configurações padrão
- Todas as alterações serão perdidas

## Estrutura do Payload

O payload gerado segue esta estrutura:

```json
{
  "configuracao": "nome_da_configuracao",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "validacao": {
    "modoExecucao": "manual|automatico",
    "numeroNavegadores": 1,
    "delayEntreExecucoes": 2000,
    "timeoutCaptcha": 30000,
    "tentativasMaximas": 3,
    "pausaEntreEtapas": false,
    "tempoPausa": 1000
  },
  "automacao": {
    "modoExecucao": "manual|automatico",
    "numeroNavegadores": 2,
    "delayEntreExecucoes": 1500,
    "timeoutCaptcha": 30000,
    "tentativasMaximas": 3,
    "pausaEntreEtapas": true,
    "tempoPausa": 2000,
    "processarEmLote": true,
    "tamanhoLote": 10,
    "retryEmCasoDeErro": true,
    "maximoRetries": 2
  }
}
```

## Validações e Limites

### Validação
- **Número de Navegadores**: 1-10
- **Delay entre Execuções**: 0ms - sem limite
- **Timeout Captcha**: 5000ms - sem limite
- **Tentativas Máximas**: 1-10
- **Tempo de Pausa**: 100ms - sem limite

### Automação
- **Número de Navegadores**: 1-10
- **Delay entre Execuções**: 0ms - sem limite
- **Timeout Captcha**: 5000ms - sem limite
- **Tentativas Máximas**: 1-10
- **Tempo de Pausa**: 100ms - sem limite
- **Tamanho do Lote**: 1-100
- **Máximo de Retries**: 1-5

## Persistência de Dados

- As configurações são salvas automaticamente no localStorage do navegador
- Chave de armazenamento: `configuracoesSistema`
- Múltiplas configurações podem ser salvas com nomes diferentes
- As configurações persistem entre sessões do navegador

## Integração com o Sistema

### Validação
- Os parâmetros de validação são aplicados na tela de Validador
- Controlam o comportamento do processo de validação de dados
- Podem ser alterados em tempo real

### Automação
- Os parâmetros de automação são aplicados na tela de Automação
- Controlam o comportamento do processo automatizado
- Podem ser alterados em tempo real

## Notas Técnicas

- **Framework**: React 18+ com TypeScript
- **Estilização**: SCSS com variáveis e mixins
- **Ícones**: Lucide React
- **Estado**: useState e useEffect para gerenciamento local
- **Armazenamento**: localStorage para persistência
- **Responsividade**: Design responsivo para mobile e desktop

## Próximos Passos

Para integrar completamente com o sistema:

1. **Backend Integration**: Implementar endpoints para salvar/carregar configurações
2. **Estado Global**: Integrar com Context API ou Redux para compartilhamento de estado
3. **Validação em Tempo Real**: Adicionar validação de campos em tempo real
4. **Histórico de Configurações**: Implementar sistema de versionamento
5. **Import/Export**: Permitir importar/exportar configurações
6. **Templates**: Criar templates pré-configurados para diferentes cenários

## Suporte

Para dúvidas ou problemas:
- Verifique o console do navegador para erros
- Confirme se todas as dependências estão instaladas
- Verifique se o TypeScript está configurado corretamente
- Teste o build com `npm run build`
