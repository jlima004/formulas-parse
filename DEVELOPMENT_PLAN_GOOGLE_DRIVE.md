# Plano de Desenvolvimento - Integracao Google Drive + Polling

## Objetivo

Adicionar ao projeto atual suporte para:

1. Ler PDFs diretamente de uma pasta especifica do Google Drive
2. Autenticar com Google Service Account via arquivo JSON
3. Implementar polling simples para detectar e processar novos PDFs automaticamente
4. Manter o parser e a persistencia MySQL desacoplados da integracao com Drive
5. Evitar over-engineering

---

## Resultado esperado

Ao final da implementacao, a aplicacao devera:

- autenticar no Google Drive com Service Account
- listar apenas PDFs de uma pasta configurada
- baixar esses PDFs para um diretorio local de staging
- reutilizar o pipeline atual de parse e persistencia
- registrar quais arquivos do Drive ja foram processados
- rodar continuamente com polling simples via `setInterval`
- evitar reprocessamento desnecessario

---

## Contexto atual do projeto

Arquivos principais da arquitetura atual:

- `src/index.ts`
- `src/batch/processAllPdfs.ts`
- `src/parser/parseFormulaPdf.ts`
- `src/io/readPdf.ts`
- `src/io/persistFormula.ts`
- `src/io/ensureDatabaseSchema.ts`
- `src/config/paths.ts`
- `compose.yaml`
- `package.json`

Estado atual observado:

- o parser le PDFs da raiz do projeto
- o parse de PDF esta separado da persistencia
- o banco ja possui bootstrap de schema
- o container hoje usa loop externo em shell no `compose.yaml`
- o parser atual opera sobre `filePath` local

---

## Referencias

### Repositorios

- Aplicacao principal: `https://github.com/jlima004/formulas-parse`
- Prototipo de referencia: `https://github.com/jlima004/node-drive`

### Documentacao consultada via Context7

Bibliotecas:

- `/websites/googleapis_dev_nodejs_googleapis`
- `/googleapis/google-auth-library-nodejs`

Pontos relevantes confirmados:

- usar `GoogleAuth` com `keyFile` e `scopes`
- criar cliente com `google.drive({ version: "v3", auth })`
- listar arquivos com `files.list`
- baixar binario com stream usando `files.get(..., { alt: "media" }, { responseType: "stream" })`
- para Shared Drives, considerar:
  - `supportsAllDrives: true`
  - `includeItemsFromAllDrives: true`

---

## Decisao de arquitetura

### Direcao recomendada

Tratar Google Drive como uma nova camada de entrada de arquivos, sem alterar desnecessariamente:

- parser
- extracao
- OCR
- persistencia principal das formulas

### Estrategia

Substituir a origem dos PDFs:

- antes: raiz local do projeto
- depois: pasta do Google Drive -> staging local -> parser atual

### Principios

- simples
- poucas abstractions
- sem webhook
- sem Drive Changes API nesta etapa
- sem filas
- sem worker separado
- sem node-cron, a menos que apareca uma necessidade real
- polling com `setInterval`

---

## Escopo de implementacao

### Incluido

- autenticacao com Service Account
- listagem de PDFs do Drive
- download para staging local
- processamento via pipeline atual
- tabela de controle de arquivos processados do Drive
- polling interno na aplicacao
- documentacao de setup

### Nao incluido agora

- webhooks
- Google Pub/Sub
- Drive Changes API
- arquitetura orientada a eventos
- processamento paralelo sofisticado
- exportacao de Google Docs/Sheets/Slides
- retry/backoff avancado

---

## Novas variaveis de ambiente

Adicionar:

- `GOOGLE_APPLICATION_CREDENTIALS`
- `GOOGLE_DRIVE_FOLDER_ID`
- `POLL_INTERVAL_SECONDS`
- `PDF_STAGING_DIR`

Descricao esperada:

- `GOOGLE_APPLICATION_CREDENTIALS`: caminho do JSON da Service Account
- `GOOGLE_DRIVE_FOLDER_ID`: ID da pasta do Drive que contem os PDFs
- `POLL_INTERVAL_SECONDS`: intervalo entre ciclos de verificacao
- `PDF_STAGING_DIR`: diretorio local temporario para armazenar PDFs baixados

---

## Estrutura sugerida

```text
src/
  config/
    env.ts
    paths.ts
  ingestion/
    types.ts
    processPdfBatch.ts
    pollDriveFolder.ts
  integrations/
    googleDrive/
      types.ts
      driveClient.ts
      listDrivePdfFiles.ts
      downloadDriveFile.ts
  io/
    processedDriveFilesRepository.ts
```

---

## Arquivos a criar

- `src/config/env.ts`
- `src/ingestion/types.ts`
- `src/ingestion/processPdfBatch.ts`
- `src/ingestion/pollDriveFolder.ts`
- `src/integrations/googleDrive/types.ts`
- `src/integrations/googleDrive/driveClient.ts`
- `src/integrations/googleDrive/listDrivePdfFiles.ts`
- `src/integrations/googleDrive/downloadDriveFile.ts`
- `src/io/processedDriveFilesRepository.ts`

---

## Arquivos a alterar

- `package.json`
- `.env.example`
- `compose.yaml`
- `README.md`
- `src/index.ts`
- `src/config/paths.ts`
- `src/batch/processAllPdfs.ts`
- `src/io/ensureDatabaseSchema.ts`

---

## Plano de execucao por fases

## Fase 1 - Dependencias e configuracao basica

### Objetivo

Preparar o projeto para autenticar no Google Drive e configurar o ambiente.

### Arquivos-alvo

- `package.json`
- `.env.example`
- `compose.yaml`
- `Dockerfile` se necessario

### Tarefas

- adicionar dependencia `googleapis`
- validar se `google-auth-library` direto sera necessario ou se `googleapis` basta
- adicionar novas env vars
- expor env vars no `compose.yaml`
- decidir se o loop do shell externo sera removido agora ou em uma fase final

### Criterio de aceite

- ambiente configuravel localmente e via Docker
- credenciais e folder ID suportados por env vars
- nenhuma regra de negocio ainda misturada com parser

---

## Fase 2 - Centralizacao de configuracao

### Objetivo

Evitar leitura espalhada de env vars.

### Arquivos-alvo

- `src/config/env.ts`
- `src/config/paths.ts`

### Tarefas

- centralizar leitura e validacao das env vars novas
- adicionar helper para staging local
- manter erros claros para config ausente/invalida

### Criterio de aceite

- configuracao nova acessivel de um unico lugar
- `paths.ts` continua simples e focado em caminhos

---

## Fase 3 - Cliente e servicos do Google Drive

### Objetivo

Criar integracao limpa e isolada com Google Drive.

### Arquivos-alvo

- `src/integrations/googleDrive/types.ts`
- `src/integrations/googleDrive/driveClient.ts`
- `src/integrations/googleDrive/listDrivePdfFiles.ts`
- `src/integrations/googleDrive/downloadDriveFile.ts`

### Tarefas

- implementar criacao do client com `GoogleAuth`
- listar arquivos da pasta com filtro por PDF
- mapear resposta para tipo interno simples
- baixar arquivo por stream para staging local
- prevenir colisao de nome local, preferencialmente prefixando com `fileId`

### Regras

- usar scope readonly
- usar:
  - `supportsAllDrives: true`
  - `includeItemsFromAllDrives: true`
- filtrar apenas `application/pdf`

### Criterio de aceite

- modulo Drive nao depende do parser nem do MySQL
- listagem e download funcionam isoladamente

---

## Fase 4 - Refatoracao do pipeline de ingestao

### Objetivo

Separar descoberta de arquivos de processamento.

### Arquivos-alvo

- `src/batch/processAllPdfs.ts`
- `src/ingestion/types.ts`
- `src/ingestion/processPdfBatch.ts`

### Tarefas

- extrair a parte de processamento para aceitar arquivos ja descobertos
- criar tipo como `IngestedPdfFile`
- adaptar fluxo atual para reaproveitar parser e persistencia
- reduzir responsabilidade de `processAllPdfs.ts`

### Tipo sugerido

```ts
export interface IngestedPdfFile {
  source: "google-drive" | "local";
  sourceFileId?: string;
  sourceModifiedTime?: string;
  fileName: string;
  localPath: string;
}
```

### Criterio de aceite

- o pipeline processa uma lista de arquivos locais independentemente da origem

---

## Fase 5 - Controle de reprocessamento

### Objetivo

Evitar reprocessar o mesmo arquivo do Drive sem necessidade.

### Arquivos-alvo

- `src/io/ensureDatabaseSchema.ts`
- `src/io/processedDriveFilesRepository.ts`

### Tarefas

- criar tabela de rastreamento de arquivos do Drive
- salvar:
  - `drive_file_id`
  - `file_name`
  - `modified_time`
  - `status`
  - `last_processed_at`
  - `error_message`
- consultar antes do processamento
- atualizar status apos sucesso ou falha

### Recomendacao de schema

Tabela simples, algo como `processed_drive_files`, com `drive_file_id` unico.

### Criterio de aceite

- se `drive_file_id` e `modified_time` ja foram processados com sucesso, o arquivo e ignorado
- falhas podem ser reavaliadas em ciclos posteriores conforme a regra implementada

---

## Fase 6 - Polling interno

### Objetivo

Executar monitoramento continuo dentro da propria aplicacao.

### Arquivos-alvo

- `src/index.ts`
- `src/ingestion/pollDriveFolder.ts`

### Tarefas

- implementar `processDriveFolderOnce()`
- implementar `startDrivePolling()`
- disparar primeira execucao imediatamente
- agendar proximas com `setInterval`
- evitar concorrencia entre ciclos com flag `isRunning`

### Regra

Se um ciclo ainda estiver em execucao, o proximo deve ser pulado com log claro.

### Criterio de aceite

- processo fica em execucao continua
- nao ha ciclos concorrentes

---

## Fase 7 - Gestao do staging local

### Objetivo

Baixar para staging local sem acumulo desnecessario.

### Arquivos-alvo

- `src/config/paths.ts`
- `src/ingestion/processPdfBatch.ts`

### Tarefas

- garantir criacao automatica da pasta de staging
- definir estrategia de limpeza
- remover arquivos com sucesso ao final
- decidir se falhas mantem ou removem arquivo local

### Recomendacao

- remover em sucesso
- manter em falha apenas se isso ajudar diagnostico operacional
- se mantiver, documentar claramente

### Criterio de aceite

- staging previsivel
- sem crescimento silencioso descontrolado

---

## Fase 8 - Docker e operacao

### Objetivo

Ajustar execucao em container de forma coerente com o novo polling.

### Arquivos-alvo

- `compose.yaml`
- `Dockerfile` se necessario
- `README.md`

### Tarefas

- mapear env vars novas
- garantir acesso ao JSON da Service Account
- revisar se o shell loop de `compose.yaml` ainda faz sentido
- preferir a app controlando o polling, nao o shell

### Criterio de aceite

- execucao local e Docker documentadas e coerentes
- sem polling duplicado em shell + app

---

## Fase 9 - Documentacao final

### Objetivo

Permitir setup por outro desenvolvedor sem depender de leitura de codigo.

### Arquivos-alvo

- `README.md`
- `.env.example`

### Tarefas

- documentar credenciais da Service Account
- documentar compartilhamento da pasta com o email da conta de servico
- documentar env vars novas
- documentar como rodar localmente
- documentar como rodar no Docker
- documentar comportamento do polling

### Criterio de aceite

- setup completo e reproduzivel
- instrucoes operacionais claras

---

## Checklist operacional para o GPT-5.3-Codex

## 1. Antes de codar

- inspecionar `package.json`
- inspecionar `src/index.ts`
- inspecionar `src/batch/processAllPdfs.ts`
- inspecionar `src/config/paths.ts`
- inspecionar `src/io/ensureDatabaseSchema.ts`
- consultar Context7 para `googleapis` e `google-auth-library`

## 2. Preparacao

- adicionar dependencias
- adicionar env vars
- criar `src/config/env.ts`

## 3. Drive

- criar `driveClient.ts`
- criar `types.ts`
- criar `listDrivePdfFiles.ts`
- criar `downloadDriveFile.ts`

## 4. Ingestao

- criar `src/ingestion/types.ts`
- criar `src/ingestion/processPdfBatch.ts`
- refatorar `src/batch/processAllPdfs.ts`

## 5. Estado de processamento

- atualizar schema em `src/io/ensureDatabaseSchema.ts`
- criar `src/io/processedDriveFilesRepository.ts`

## 6. Polling

- criar `src/ingestion/pollDriveFolder.ts`
- atualizar `src/index.ts`

## 7. Operacao

- revisar `compose.yaml`
- revisar `README.md`
- revisar `.env.example`

## 8. Validacao final

- rodar build TypeScript
- validar uma execucao unica
- validar polling
- validar nao reprocessamento
- validar logs
- atualizar documentacao

---

## Snippets de referencia

## Cliente Drive

```ts
import { google, drive_v3 } from "googleapis";

const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

export function createDriveClient(): drive_v3.Drive {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!keyFile) {
    throw new Error("Variavel obrigatoria nao definida: GOOGLE_APPLICATION_CREDENTIALS");
  }

  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: [DRIVE_READONLY_SCOPE],
  });

  return google.drive({
    version: "v3",
    auth,
  });
}
```

## Listagem de PDFs

```ts
export async function listPdfFiles(folderId: string): Promise<DrivePdfFile[]> {
  const drive = createDriveClient();

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false and mimeType = 'application/pdf'`,
    fields: "files(id,name,mimeType,modifiedTime)",
    orderBy: "name",
    pageSize: 1000,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return (response.data.files ?? [])
    .filter((file) => file.id && file.name && file.mimeType && file.modifiedTime)
    .map((file) => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      modifiedTime: file.modifiedTime!,
    }));
}
```

## Download por stream

```ts
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";

export async function downloadDriveFile(
  fileId: string,
  fileName: string,
  destinationDir: string,
): Promise<string> {
  const drive = createDriveClient();
  const safeName = `${fileId}-${fileName}`;
  const destinationPath = path.join(destinationDir, safeName);

  await fs.promises.mkdir(destinationDir, { recursive: true });

  const response = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" },
  );

  await pipeline(
    response.data as NodeJS.ReadableStream,
    fs.createWriteStream(destinationPath),
  );

  return destinationPath;
}
```

## Polling simples

```ts
let isRunning = false;

export async function startDrivePolling(): Promise<void> {
  const intervalSeconds = Number(process.env.POLL_INTERVAL_SECONDS ?? "300");

  const runCycle = async () => {
    if (isRunning) {
      console.log("Ciclo anterior ainda em execucao; pulando.");
      return;
    }

    isRunning = true;
    try {
      await processDriveFolderOnce();
    } finally {
      isRunning = false;
    }
  };

  await runCycle();
  setInterval(runCycle, intervalSeconds * 1000);
}
```

---

## Riscos conhecidos

- a pasta do Drive precisa estar compartilhada com o email da Service Account
- se a pasta estiver em Shared Drive, os parametros `supportsAllDrives` e `includeItemsFromAllDrives` sao importantes
- nomes de arquivo podem colidir; por isso e melhor prefixar com `fileId`
- o controle atual por `(formula, hoja)` nao substitui controle de ingestao do Drive
- manter polling no shell e na app ao mesmo tempo pode causar execucoes redundantes
- o projeto nao deve tentar processar arquivos Google nativos como se fossem PDFs binarios

---

## Decisoes para evitar over-engineering

- usar `setInterval` em vez de scheduler mais complexo
- usar listagem periodica da pasta em vez de webhooks
- usar staging local simples
- manter parser atual intacto
- adicionar apenas uma tabela nova de controle
- evitar novas camadas genericas desnecessarias
- nao introduzir filas, workers ou arquitetura distribuida

---

## Validacao esperada

Ao final da implementacao, validar:

1. build TypeScript com sucesso
2. autenticacao com Service Account funcionando
3. listagem de PDFs da pasta correta
4. download local funcionando
5. parser atual processando arquivos baixados
6. persistencia MySQL funcionando
7. arquivo ja processado nao sendo reprocessado no mesmo `modified_time`
8. polling executando sem concorrencia
9. README atualizado com setup local e Docker

---

## Entrega final esperada do implementador

Ao concluir, o implementador deve informar:

1. o que foi implementado
2. quais arquivos foram criados e alterados
3. quais decisoes de design foram tomadas
4. como validar localmente
5. como validar no Docker
6. limitacoes conhecidas
