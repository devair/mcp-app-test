# mcp-app

Projeto de estudo para testar o **Model Context Protocol (MCP)** com Node.js e TypeScript. Ele reúne dois servidores MCP que se comunicam via **stdio** e podem ser conectados a qualquer cliente MCP (Claude Desktop, Claude Code, MCP Inspector etc.):

| Servidor | Arquivo | Finalidade |
|---|---|---|
| `weather` | `src/index.ts` | Consulta alertas e previsão do tempo na API do National Weather Service (NWS) dos EUA |
| `file-manager-app` | `src/file-manager.ts` | Dá ao cliente MCP acesso ao sistema de arquivos local, restrito a pastas permitidas: listar, ler, escrever e extrair texto de PDFs |

## Funcionalidades

### Servidor `weather` (`src/index.ts`)

Usa a API pública `https://api.weather.gov`. **Só cobre localidades dos EUA.**

- **`get_alerts`**: retorna os alertas meteorológicos ativos de um estado.
  - Parâmetro: `state`, código de 2 letras (ex.: `CA`, `NY`).
  - Retorno: evento, área, severidade, status e título de cada alerta.
- **`get_forecast`**: retorna a previsão do tempo para uma coordenada.
  - Parâmetros: `latitude` (-90 a 90) e `longitude` (-180 a 180).
  - Retorno: para cada período, temperatura, vento e resumo da previsão.

### Servidor `file-manager-app` (`src/file-manager.ts`)

Todas as ferramentas abaixo só acessam caminhos dentro das [pastas permitidas](#segurança-e-pastas-permitidas). Qualquer caminho fora delas é recusado com o erro `Acesso negado: <caminho> está fora das pastas permitidas`.

- **`list_files`**: lista **recursivamente** todos os arquivos de um diretório e devolve o total e os caminhos completos. Se o diretório não existir, retorna lista vazia.
  - Parâmetro: `directory`.
- **`read_file`**: lê o conteúdo de arquivos de texto simples (`.txt`, `.md`, `.json`, `.html`) em UTF-8.
  - Parâmetro: `filePath`.
- **`write_file`**: grava conteúdo em um arquivo de texto, criando as pastas intermediárias se necessário. Sobrescreve o arquivo se ele já existir.
  - Parâmetros: `filePath` e `content`.
- **`read_pdf`**: extrai o texto de um arquivo PDF usando `pdf-parse`.
  - Parâmetro: `filePath`.

## Segurança e pastas permitidas

O `file-manager-app` só opera dentro de uma lista de pastas autorizadas, definida pela variável de ambiente **`ALLOWED_DIRS`**.

**Como funciona**

- **Configuração:** `ALLOWED_DIRS` aceita uma ou mais pastas separadas por `;` no Windows (ou `:` no Linux/macOS).
- **Valor padrão:** se a variável não estiver definida, o servidor só enxerga a pasta de trabalho de onde foi iniciado (`process.cwd()`). Quando o servidor é iniciado por um cliente MCP, essa pasta normalmente **não** é a do projeto, e todos os acessos serão negados até que `ALLOWED_DIRS` seja configurada.
- **Validação:** antes de cada operação, o caminho informado é resolvido para o caminho real (seguindo links simbólicos e junctions) e comparado com as pastas permitidas. Isso bloqueia tentativas de escapar da pasta com `..` ou por links simbólicos que apontem para fora dela.
- **Arquivos novos:** no `write_file`, como o arquivo ainda pode não existir, a validação é feita sobre o ancestral existente mais próximo.

**Exemplo de configuração**

```json
"file-manager": {
  "command": "node",
  "args": ["C:\\Developer\\Node Projects\\mcp-app\\build\\file-manager.js"],
  "env": {
    "ALLOWED_DIRS": "C:\\Developer\\Node Projects\\mcp-app;C:\\Users\\seu-usuario\\Documents\\mcp-sandbox"
  }
}
```

O bloco `env` precisa ficar dentro do objeto do servidor, ao lado de `command` e `args`. As variáveis só são lidas quando o servidor inicia, então **reinicie o cliente MCP** (e recompile com `npm run build` ou `npx tsc`, se alterou o código) depois de mudar a configuração.

**Boas práticas e limitações**

- **Princípio do menor privilégio:** libere apenas as pastas realmente necessárias. Evite raízes amplas, como `C:\` ou a pasta do usuário.
- **Escrita permitida:** dentro das pastas autorizadas, o `write_file` pode criar e **sobrescrever** qualquer arquivo, inclusive de código e de configuração. Prefira uma pasta dedicada (sandbox) se o cliente não precisar alterar seus projetos.
- **Links simbólicos dentro da pasta permitida:** a validação é feita no caminho informado. Na listagem recursiva do `list_files`, links simbólicos ou junctions **dentro** de uma pasta permitida que apontem para fora dela são seguidos, e os arquivos de destino podem aparecer na lista. Leitura e escrita desses arquivos continuam sujeitas à validação.
- **Sem limites adicionais:** o servidor não tem modo somente leitura, filtro de extensões nem limite de tamanho de arquivo. Esses recursos podem ser adicionados se necessário.
- **Clientes de confiança:** use o servidor apenas com clientes MCP em que você confia.
- **Resolução de problemas:** se todas as operações retornarem `Acesso negado`, verifique se a pasta do projeto está em `ALLOWED_DIRS`, se o separador é `;` no Windows e se o cliente foi reiniciado por completo.

## Tecnologias

- Node.js (ES Modules) e TypeScript
- [`@modelcontextprotocol/server`](https://www.npmjs.com/package/@modelcontextprotocol/server): SDK do servidor MCP
- [`zod`](https://zod.dev): validação dos parâmetros das ferramentas
- [`pdf-parse`](https://www.npmjs.com/package/pdf-parse): leitura de PDFs
- `tsx`: execução direta de TypeScript em desenvolvimento

## Estrutura do projeto

```
mcp-app/
├── src/
│   ├── weather.ts        # Servidor MCP de clima (weather)
│   └── file-manager.ts   # Servidor MCP de arquivos (file-manager-app)
├── build/                # Código JavaScript compilado (gerado)
├── .mcp.json             # Configuração de servidores MCP do projeto
├── package.json
└── tsconfig.json
```

## Pré-requisitos

- Node.js em versão recente (compatível com as dependências do projeto)
- npm ou yarn

## Como iniciar

### 1. Instalar as dependências

```bash
npm install
```

### 2. Compilar o projeto

```bash
npx tsc
```

### 3. Executar um servidor

Os servidores usam stdio, então normalmente são iniciados por um cliente MCP. Para rodar manualmente:

```bash
# Servidor de clima
node build/weather.js

# Servidor de arquivos (defina ALLOWED_DIRS, senão só a pasta atual fica liberada)
# PowerShell:
$env:ALLOWED_DIRS = "C:\Developer\Node Projects\mcp-app"; node build/file-manager.js
# Linux/macOS:
ALLOWED_DIRS="$PWD" node build/file-manager.js
```

Durante o desenvolvimento, é possível executar o TypeScript diretamente:

```bash
npx tsx src/weather.ts
npx tsx src/file-manager.ts
```

Ao iniciar, o servidor escreve no `stderr` uma mensagem como `Weather MCP Server running on stdio`. O `stdout` é reservado ao protocolo MCP.

### 4. Testar com o MCP Inspector

```bash
npx @modelcontextprotocol/inspector node build/weather.js 
```

O script abre o [MCP Inspector](https://github.com/modelcontextprotocol/inspector) apontando para `build/weather.js` (servidor de clima). 


Para inspecionar o servidor de arquivos:

```bash
# PowerShell:
$env:ALLOWED_DIRS = "C:\Developer\Node Projects\mcp-app"; npx @modelcontextprotocol/inspector node build/file-manager.js
# Linux/macOS:
ALLOWED_DIRS="$PWD" npx @modelcontextprotocol/inspector node build/file-manager.js
```

## Conectando a um cliente MCP

Exemplo de configuração (por exemplo, `claude_desktop_config.json` ou `.mcp.json`). Ajuste os caminhos para o seu ambiente:

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["C:\\Developer\\Node Projects\\mcp-app\\build\\weather.js"]
    },
    "file-manager": {
      "command": "node",
      "args": ["C:\\Developer\\Node Projects\\mcp-app\\build\\file-manager.js"],
      "env": {
        "ALLOWED_DIRS": "C:\\Developer\\Node Projects\\mcp-app"
      }
    }
  }
}
```

Depois de reiniciar o cliente, as ferramentas `get_alerts`, `get_forecast`, `list_files`, `read_file`, `write_file` e `read_pdf` ficam disponíveis.

## Licença

MIT
