# AutomacaoBot Frontend

Este projeto é o frontend do AutomacaoBot, desenvolvido com React, TypeScript e Vite.

## Tecnologias Utilizadas

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [ESLint](https://eslint.org/) para análise de código

## Como rodar o projeto

1. **Clone o repositório:**
  ```bash
  git clone https://github.com/seu-usuario/AutomacaoBot-Frontend.git
  cd AutomacaoBot-Frontend
  ```

2. **Instale as dependências:**
  ```bash
  npm install
  # ou
  yarn
  ```

3. **Inicie o servidor de desenvolvimento:**
  ```bash
  npm run dev
  # ou
  yarn dev
  ```

O projeto estará disponível em `http://localhost:5173`.

## Scripts Disponíveis

- `dev`: Inicia o servidor de desenvolvimento.
- `build`: Gera a versão de produção.
- `preview`: Visualiza a build de produção localmente.
- `lint`: Executa o ESLint para análise de código.

## Configuração do ESLint

O projeto já vem com uma configuração básica de ESLint para garantir a qualidade do código. Para projetos em produção, recomenda-se expandir as regras para incluir validações mais rigorosas e plugins específicos para React.

Exemplo de configuração avançada:

```js
export default tseslint.config({
  extends: [
   ...tseslint.configs.recommendedTypeChecked,
   // ...tseslint.configs.strictTypeChecked,
   // ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
   parserOptions: {
    project: ['./tsconfig.node.json', './tsconfig.app.json'],
    tsconfigRootDir: import.meta.dirname,
   },
  },
})
```

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## Licença

Este projeto está sob a licença MIT.

---

> Feito com ❤️ usando React, TypeScript e Vite.
