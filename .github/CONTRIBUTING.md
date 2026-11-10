# Guia de Contribuição

Bem-vindo ao TickTask! 🎉 Estamos felizes que você queira contribuir para este projeto. Este documento contém informações importantes sobre como contribuir de forma efetiva.

## 📋 Como Contribuir

### 1. Preparação do Ambiente

Antes de começar, certifique-se de ter instalado:

- **Node.js** (versão 18 ou superior)
- **npm** ou **yarn**
- **Git**

### 2. Configuração do Projeto

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/ticktask.git
cd ticktask

# Instale as dependências
npm install

# Execute em modo desenvolvimento
npm run dev
```

### 3. Processo de Contribuição

#### 📝 Relatando Bugs

Antes de criar uma issue, verifique se:

- [ ] O bug não foi relatado anteriormente
- [ ] Você está usando a versão mais recente
- [ ] Você testou em diferentes ambientes

Para relatar bugs, use o template de bug disponível nas issues.

#### 🚀 Sugerindo Funcionalidades

Para sugestões de novas funcionalidades:

- [ ] Descreva claramente o problema que a funcionalidade resolve
- [ ] Explique por que essa funcionalidade seria útil
- [ ] Considere alternativas já existentes
- [ ] Use o template de feature request

#### 🛠️ Desenvolvendo

Para contribuir com código:

1. **Fork** o projeto
2. **Clone** seu fork: `git clone https://github.com/SEU_USERNAME/ticktask.git`
3. **Crie uma branch** para sua feature: `git checkout -b feature/nome-da-feature`
4. **Faça suas alterações**
5. **Teste suas alterações**
6. **Commit** seguindo as convenções: `git commit -m "feat: adiciona nova funcionalidade"`
7. **Push** para seu fork: `git push origin feature/nome-da-feature`
8. **Abra um Pull Request**

### 4. Convenções de Código

#### 📏 Estilo de Código

- Use **TypeScript** para novos arquivos
- Siga o padrão **ESLint** configurado
- Use **Prettier** para formatação
- Mantenha a consistência com o código existente

#### 📝 Commits

Usamos [Conventional Commits](https://conventionalcommits.org/):

```bash
# Formato: tipo(escopo): descrição

# Exemplos:
feat: adiciona funcionalidade de timer
fix: corrige bug no cálculo de tempo
docs: atualiza documentação da API
style: formata código com Prettier
refactor: reorganiza estrutura de componentes
test: adiciona testes para componente Timer
chore: atualiza dependências
```

#### 🏷️ Branches

- `main`: branch default e de integração; recebe PRs (squash)
- `production`: espelho do que está publicado; atualizada só pelo mantenedor na promoção
- `release/vX.Y.Z`: estabilização de uma versão; criada pelo mantenedor
- `feature/descricao`: novas funcionalidades (de `main` para `main`)
- `bugfix/descricao`: correções (de `main` ou de `release/vX.Y.Z`, volta para a origem)
- `hotfix/descricao`: correção urgente de produção (PR para a `release/vX.Y.Z` de hotfix)
- `chore/descricao`: manutenção sem impacto funcional

A descrição usa apenas minúsculas, números e hífens. O título do PR segue Conventional Commits,
pois vira o commit em `main`.

### 5. Testes

Antes de enviar seu PR:

```bash
# Execute todos os testes
npm run test

# Execute linting
npm run lint

# Execute type checking
npm run typecheck

# Build para produção
npm run build
```

### 6. Documentação

- Atualize o README.md se necessário
- Documente novas funcionalidades
- Mantenha comentários claros no código
- Use JSDoc para funções públicas

### 7. Pull Requests

#### 📋 Checklist do PR

Antes de abrir um PR, certifique-se de:

- [ ] Seguir as convenções de commit
- [ ] Ter uma descrição clara do que foi implementado
- [ ] Incluir testes para novas funcionalidades
- [ ] Passar em todos os testes e linting
- [ ] Atualizar documentação se necessário
- [ ] Testar em diferentes sistemas operacionais

#### 📖 Template do PR

Use o template disponível para manter consistência.

### 8. Revisão de Código

- Todos os PRs passam por revisão
- Podemos solicitar alterações
- Seja paciente e colaborativo
- Aprenda com o feedback

## 🎯 Áreas de Contribuição

### 🐛 Bugs e Issues

- Corrigir bugs relatados
- Melhorar mensagens de erro
- Adicionar validações

### ✨ Funcionalidades

- Novas funcionalidades de gerenciamento de tarefas
- Melhorias na interface
- Integrações com outras ferramentas
- Temas e personalizações

### 📚 Documentação

- Melhorar documentação existente
- Traduções
- Tutoriais
- Exemplos de uso

### 🧪 Testes

- Adicionar testes unitários
- Testes de integração
- Testes end-to-end

### 🎨 UI/UX

- Melhorias na interface
- Acessibilidade
- Responsividade
- Novos componentes

## 📞 Comunicação

- **Issues**: Para discussões técnicas e bugs
- **Discussions**: Para ideias e discussões gerais
- **Discord/Slack**: Para chat em tempo real (se disponível)

## 🙏 Reconhecimento

Contribuições são reconhecidas através:

- Créditos no CHANGELOG.md
- Menção nos releases
- Badges de contribuidores

## 📜 Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a mesma licença do projeto (MIT).

---

Obrigado por contribuir com o TickTask! 🚀