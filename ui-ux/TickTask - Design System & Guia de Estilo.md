# Teste

Status: Inbox
Alerta de Leak: Teste
Criado em: 2 de dezembro de 2025 17:59
Atribuir: Ueslei Nascimento

# TickTask - Design System & Guia de Estilo

Este documento define os padrões visuais, tokens de design e componentes para a interface do TickTask. O sistema é construído sobre o **Tailwind CSS**, utilizando uma estética "Clean", "Flat" e minimalista, inspirada na biblioteca *shadcn/ui*.

## 1. Filosofia Visual

- **Minimalismo Funcional:** A interface deve desaparecer para que a tarefa seja o foco.
- **Hierarquia via Tipografia e Cor:** Use pesos de fonte e cores semânticas para guiar o olho, não bordas pesadas.
- **Feedback Visual:** Ações importantes (como o timer rodando) devem ter feedback claro (animações, cores vibrantes).

## 2. Paleta de Cores (Theme Tokens)

O sistema utiliza a escala de cinza `Slate` (azul-acinzentado) para uma aparência profissional e fria, com cores semânticas para estados.

### Cores Base (Neutral)

Usadas para fundos, textos e bordas.

| Nome Token | Classe Tailwind | Hex (Aprox) | Uso |
| --- | --- | --- | --- |
| **Background App** | `bg-slate-50` | `#F8FAFC` | Fundo geral da aplicação |
| **Surface (Card)** | `bg-white` | `#FFFFFF` | Cartões, modais, headers |
| **Text Primary** | `text-slate-900` | `#0F172A` | Títulos, ênfases, botões primários |
| **Text Secondary** | `text-slate-600` | `#475569` | Descrições, subtítulos |
| **Text Muted** | `text-slate-400` | `#94A3B8` | Placeholders, ícones inativos |
| **Border** | `border-slate-200` | `#E2E8F0` | Divisores, bordas de cards |

### Cores Semânticas (Status)

Usadas em Badges, Indicadores e Botões de Ação.

| Estado | Cor Base | Classe Texto | Classe Fundo (Badge) | Uso |
| --- | --- | --- | --- | --- |
| **Executando** | **Emerald** | `text-emerald-600` | `bg-emerald-100` | Timer ativo, sucesso |
| **Aguardando** | **Yellow** | `text-yellow-600` | `bg-yellow-100` | Pausado, pendente |
| **Próximas** | **Blue** | `text-blue-600` | `bg-blue-100` | Planejamento, info |
| **Finalizada** | **Purple** | `text-purple-600` | `bg-purple-100` | Concluído, histórico |
| **Destrutivo** | **Red** | `text-red-500` | `bg-red-50` | Deletar, erro, limite estourado |

## 3. Tipografia

- **Fonte Principal:** Inter (ou `sans-serif` do sistema).
- **Fonte Mono:** JetBrains Mono, Roboto Mono (ou `monospace` do sistema) para **Timers e IDs**.

### Escala Tipográfica

```
/* Títulos de Página */
.h1 { @apply text-xl font-bold text-slate-900; }

/* Títulos de Card */
.h3 { @apply text-lg font-semibold text-slate-900 leading-tight; }

/* Texto Corpo */
.body { @apply text-sm text-slate-600; }

/* Timer Gigante */
.timer-display { @apply text-7xl font-mono font-bold tracking-tighter; }

/* Timer Cartão */
.timer-card { @apply text-2xl font-mono font-medium; }

```

## 4. Sombras e Bordas (Radius)

Para manter a suavidade, evitamos bordas pretas sólidas e preferimos sombras difusas.

- **Border Radius Main:** `rounded-xl` (12px) para Cards e Modais.
- **Border Radius Inner:** `rounded-md` (6px) para Botões e Inputs.
- **Shadow Card:** `shadow` (suave).
- **Shadow Hover:** `shadow-md` + `translate-y-1` (feedback tátil).
- **Shadow Modal:** `shadow-2xl` (profundidade alta).

## 5. Componentes (Snippets de Estilo)

Abaixo estão as classes exatas para replicar os componentes principais.

### 5.1 Botões (Variants)

```
// Base (layout e transição)
const btnBase = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

// Variantes
const variants = {
  primary:     "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
  secondary:   "bg-slate-100 text-slate-900 hover:bg-slate-200",
  outline:     "border border-slate-200 bg-white hover:bg-slate-100 text-slate-900",
  ghost:       "hover:bg-slate-100 text-slate-700 hover:text-slate-900",
  destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
  icon:        "h-9 w-9 p-0", // Para botões quadrados
};

// Tamanhos
const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 py-2 text-sm",
  lg: "h-11 px-8 text-base",
};

```

### 5.2 Card de Tarefa

```
const cardStyle = `
  bg-white
  border border-slate-200
  rounded-xl
  p-5
  shadow-sm
  hover:shadow-md
  transition-all
  duration-200
  cursor-pointer
  group
  border-l-4 border-l-transparent hover:border-l-slate-900 /* Indicador de hover */
`;

```

### 5.3 Inputs e Forms

```
const inputStyle = `
  w-full
  bg-transparent
  border border-slate-300
  rounded-md
  px-3 py-2
  text-sm
  placeholder:text-slate-400
  focus:outline-none
  focus:ring-2
  focus:ring-slate-900
  focus:border-transparent
  transition-shadow
`;

```

### 5.4 Badges (Pills)

```
const badgeBase = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors";

// Exemplo 'Executando'
const runningBadge = "bg-emerald-100 text-emerald-600 border-emerald-200 animate-pulse";

```

### 5.5 Floating Action Button (FAB) - Tarefa Ativa

```
const fabContainer = "absolute bottom-6 right-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300";

const fabButton = `
  group
  flex items-center gap-3
  bg-slate-900 text-white
  pl-4 pr-5 py-3
  rounded-full
  shadow-2xl
  border border-slate-700
  hover:bg-slate-800
  hover:scale-105
  transition-all
`;

```

## 6. Animações e Micro-interações

O TickTask usa animações sutis para indicar estado.

### Pulse (Para Timer Ativo)

Usar a classe `animate-pulse` do Tailwind em badges ou ícones quando o timer estiver rodando (`is_running === true`).

### Entradas (Modais e Páginas)

Usar utilitários `tailwindcss-animate`:

```
/* Entrada de Modal */
.modal-enter { @apply animate-in fade-in zoom-in-95 duration-200; }

/* Entrada de Floating Button */
.fab-enter { @apply animate-in slide-in-from-bottom-10 fade-in duration-300; }

```

### Hover Lift

Nos cartões da lista, aplicar um leve deslocamento vertical:
`transform hover:-translate-y-1`

## 7. Configuração Tailwind (tailwind.config.js)

Para garantir que as animações personalizadas funcionem, adicione esta configuração ao seu arquivo `tailwind.config.js`:

```
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      // Caso queira estender cores personalizadas
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      }
    },
  },
  plugins: [
    require("tailwindcss-animate"), // Necessário instalar este plugin
    // plugin scrollbar-hide se usado nas abas
  ],
}

```