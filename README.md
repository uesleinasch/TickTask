# TickTask

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-191970?style=flat&logo=electron&logoColor=white)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

TickTask é um aplicativo desktop open source para gerenciamento de tarefas pessoais e profissionais. Desenvolvido com Electron, React e TypeScript, oferece uma interface intuitiva para criar, organizar e rastrear tarefas, com funcionalidade integrada de timer para medir o tempo dedicado a cada atividade.

## ✨ Funcionalidades

- **Gerenciamento de Tarefas**: Crie, edite, exclua e organize suas tarefas
- **Timer Integrado**: Inicie e pare timers para rastrear tempo gasto em tarefas
- **Status de Tarefas**: Acompanhe o progresso com badges de status
- **Arquivamento**: Mova tarefas concluídas para uma seção de arquivadas
- **Interface Moderna**: UI responsiva e acessível com componentes reutilizáveis
- **Banco de Dados Local**: Armazenamento persistente usando SQLite
- **Notificações**: Alertas para lembretes e atualizações

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18 com TypeScript
- **Desktop**: Electron
- **Build Tool**: Vite
- **UI Components**: Shadcn/UI (baseado em Radix UI)
- **Styling**: CSS personalizado + Tailwind CSS
- **Database**: SQLite via better-sqlite3
- **Linting**: ESLint
- **Packaging**: Electron Builder

## 📋 Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn

## 🚀 Instalação e Execução

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/ticktask.git
cd ticktask
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Execute em modo desenvolvimento

```bash
npm run dev
```

Isso abrirá o aplicativo em modo desenvolvimento com hot reload.

## 🏗️ Build para Produção

### Linux (AppImage e .deb)

```bash
npm run build:linux
```

Gera:
- `dist/ticktask-1.0.0.AppImage` - AppImage executável
- `dist/ticktask-1.0.0.deb` - Pacote Debian

### Windows (NSIS Installer)

```bash
npm run build:win
```

Gera:
- `dist/ticktask-1.0.0-setup.exe` - Installer executável

**Nota:** Para buildar no Windows a partir do Linux, é necessário Wine.

### macOS (DMG)

```bash
npm run build:mac
```

Gera:
- `dist/ticktask-1.0.0.dmg` - Pacote DMG

Os arquivos de build estarão disponíveis na pasta `dist/`.

## 🤝 Como Contribuir

Contribuições são bem-vindas! Este é um projeto open source e qualquer ajuda é apreciada. Siga estes passos para contribuir:

### 1. Fork o projeto

Clique no botão "Fork" no GitHub para criar sua própria cópia do repositório.

### 2. Clone seu fork

```bash
git clone https://github.com/seu-usuario/ticktask.git
cd ticktask
```

### 3. Crie uma branch para sua feature

```bash
git checkout -b feature/nome-da-sua-feature
```

### 4. Instale dependências e desenvolva

```bash
npm install
npm run dev
```

### 5. Faça suas alterações

- Siga as convenções de código existentes
- Adicione testes para novas funcionalidades
- Atualize a documentação se necessário

### 6. Commit suas mudanças

```bash
git add .
git commit -m "feat: adiciona nova funcionalidade"
```

### 7. Push para seu fork

```bash
git push origin feature/nome-da-sua-feature
```

### 8. Abra um Pull Request

No GitHub, clique em "New Pull Request" e descreva suas alterações detalhadamente.

### Diretrizes de Contribuição

- Use commits convencionais (feat, fix, docs, style, refactor, test, chore)
- Mantenha o código limpo e bem documentado
- Adicione testes para novas funcionalidades
- Respeite o código de conduta

## 📁 Estrutura do Projeto

```
ticktask/
├── src/
│   ├── main/           # Processo principal do Electron
│   ├── preload/        # Scripts de preload
│   ├── renderer/       # Interface React
│   │   ├── components/ # Componentes reutilizáveis
│   │   ├── pages/      # Páginas da aplicação
│   │   ├── hooks/      # Hooks customizados
│   │   └── stores/     # Estado global
│   └── shared/         # Tipos e utilitários compartilhados
├── build/              # Configurações de build
├── electron.vite.config.ts
└── package.json
```

## 🐛 Reportando Bugs

Encontrou um bug? Abra uma issue no GitHub com:

- Descrição clara do problema
- Passos para reproduzir
- Sistema operacional e versão
- Logs de erro (se aplicável)

## 📝 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- [Electron](https://electronjs.org/) - Framework para aplicações desktop
- [React](https://reactjs.org/) - Biblioteca para interfaces
- [Shadcn/UI](https://ui.shadcn.com/) - Componentes UI
- [Vite](https://vitejs.dev/) - Build tool moderno

---

Feito com ❤️ por contribuidores open source
