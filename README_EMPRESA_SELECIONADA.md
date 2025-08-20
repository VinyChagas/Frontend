# Sistema de Empresa Selecionada

## Visão Geral

Este sistema permite que cada card da tela Home carregue as informações específicas da empresa selecionada na tela de Automação, garantindo que as planilhas importadas fiquem vinculadas diretamente para cada contabilidade cadastrada.

## Como Funciona

### 1. Contexto Global (EmpresaContext)

- **Localização**: `src/contexts/EmpresaContext.tsx`
- **Função**: Gerencia o estado global da empresa selecionada
- **Estados**:
  - `empresaSelecionada`: Empresa atualmente selecionada
  - `selecionarEmpresa()`: Função para selecionar uma empresa
  - `limparEmpresaSelecionada()`: Função para limpar a seleção

### 2. Fluxo de Navegação

#### Tela Home → Automação
1. Usuário clica em um card de empresa na tela Home
2. A empresa é selecionada no contexto global
3. Navegação para `/automacao/{empresaId}`
4. A página de Automação carrega os dados da empresa selecionada

#### URL Direta
- Se o usuário acessar diretamente `/automacao/{empresaId}`, a empresa será carregada automaticamente
- Se não houver empresa na URL, será redirecionado para Home

### 3. Componentes Principais

#### Home.tsx
- Lista todas as empresas cadastradas
- Ao clicar em um card, seleciona a empresa e navega para automação

#### Automacao.tsx
- Verifica se há empresa selecionada no contexto
- Carrega dados específicos da empresa (planilhas, validações)
- Exibe informações da empresa no cabeçalho
- Permite voltar para Home

#### EmpresaSelector.tsx
- Componente flutuante que mostra a empresa atual
- Permite trocar de empresa rapidamente

### 4. Estrutura de Dados

```typescript
interface Empresa {
  id: number;
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  login: string;
  senha: string;
  clientes: number;
  logoUrl?: string;
}
```

### 5. Rotas Configuradas

```typescript
// Rotas principais
<Route path="home" element={<Home />} />
<Route path="automacao" element={<Automacao />} />
<Route path="automacao/:empresaId" element={<Automacao />} />

// Rotas de contabilidade
<Route path="contabilidades" element={<Contabilidades />} />
<Route path="contabilidades/novo" element={<ContabilidadeForm />} />
<Route path="contabilidades/:id" element={<ContabilidadeForm />} />
```

## Benefícios

1. **Isolamento**: Cada empresa tem seus próprios dados e planilhas
2. **Navegação Intuitiva**: Cards na Home levam diretamente para a automação da empresa
3. **Contexto Persistente**: Empresa selecionada mantém-se durante a sessão
4. **URLs Amigáveis**: Suporte a URLs diretas com ID da empresa
5. **Troca Fácil**: Possibilidade de trocar de empresa sem voltar para Home

## Uso

### Para Desenvolvedores

1. **Usar o contexto**:
```typescript
import { useEmpresa } from '../contexts/EmpresaContext';

function MeuComponente() {
  const { empresaSelecionada, selecionarEmpresa } = useEmpresa();
  // ...
}
```

2. **Navegar com empresa**:
```typescript
const navigate = useNavigate();
navigate(`/automacao/${empresa.id}`);
```

3. **Verificar empresa selecionada**:
```typescript
if (!empresaSelecionada) {
  navigate('/home');
  return;
}
```

### Para Usuários

1. **Selecionar empresa**: Clique em qualquer card na tela Home
2. **Ver empresa atual**: Informações exibidas no cabeçalho da Automação
3. **Trocar empresa**: Use o botão "Trocar Empresa" no canto superior direito
4. **Voltar para Home**: Use o botão "← Voltar para Home" no cabeçalho

## Considerações Técnicas

- **Estado Global**: Usa React Context para gerenciar empresa selecionada
- **Persistência**: Estado mantido durante a sessão do usuário
- **Fallback**: Redirecionamento automático para Home se não houver empresa
- **Performance**: Carregamento lazy dos dados da empresa
- **Responsividade**: Interface adaptada para diferentes tamanhos de tela
