# Formulas PDF Parser

Aplicacao em Node.js + TypeScript para ler PDFs de uma pasta do Google Drive, baixar para staging local, processar com o parser atual e persistir os dados no MySQL.

## Requisitos

- Node.js 22+
- npm
- Docker e Docker Compose
- Conta de servico Google com JSON de credenciais

## Preparacao no Google Drive

1. Crie uma Service Account no Google Cloud e gere o arquivo JSON.
2. Compartilhe a pasta do Google Drive com o email da Service Account (permissao de leitura basta).
3. Copie o `folderId` da pasta (valor presente na URL da pasta no Drive).

## Variaveis de ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Preencha obrigatoriamente:

- `GOOGLE_APPLICATION_CREDENTIALS`: caminho para o JSON da Service Account.
- `GOOGLE_DRIVE_FOLDER_ID`: ID da pasta com os PDFs.

Variaveis relevantes:

- `POLL_INTERVAL_SECONDS`: intervalo entre ciclos de polling (padrao `300`).
- `PDF_STAGING_DIR`: pasta de staging dos PDFs baixados (padrao `staging/pdfs`).
- `MYSQL_*`: configuracao de conexao com o banco.

## Execucao com Docker (recomendado)

1. Crie a pasta de credenciais e coloque o JSON:

```bash
mkdir -p credentials
```

2. Ajuste o `.env` (incluindo `GOOGLE_DRIVE_FOLDER_ID`).

3. Suba aplicacao + banco:

```bash
docker compose up -d --build
```

4. Acompanhe logs:

```bash
docker logs -f formulas-app
```

5. Parar stack:

```bash
docker compose down
```

## Execucao local (Node) + MySQL no Docker

1. Suba somente o MySQL:

```bash
docker compose up -d mysql
```

2. Instale dependencias:

```bash
npm install
```

3. Build:

```bash
npm run build
```

4. Inicie o polling:

```bash
npm start
```

## Fluxo de ingestao

1. Lista PDFs do Drive filtrando `mimeType = application/pdf`.
2. Ignora arquivos ja processados com sucesso no mesmo `modified_time`.
3. Baixa cada PDF para staging local com prefixo do `fileId`.
4. Reutiliza parser e persistencia existentes (`formulas` e `formula_items`).
5. Registra status em `processed_drive_files`.
6. Executa continuamente com `setInterval` e bloqueio de concorrencia entre ciclos.

## Controle de reprocessamento

- Arquivo com mesmo `drive_file_id` + `modified_time` e status `success` e ignorado.
- Arquivos com falha podem ser tentados novamente em ciclos seguintes.
- Em sucesso, o arquivo local de staging e removido.
- Em falha, o arquivo pode permanecer no staging para diagnostico.

## Comandos uteis

```bash
# build local
npm run build

# iniciar polling local
npm start

# subir stack completa
docker compose up -d --build

# status dos containers
docker compose ps

# logs da aplicacao
docker logs -f formulas-app

# checar dados persistidos
docker exec formulas-mysql mysql -uformulas -pformulas formulas -e "SELECT COUNT(*) FROM formulas; SELECT COUNT(*) FROM formula_items; SELECT drive_file_id,status,modified_time,last_processed_at FROM processed_drive_files ORDER BY last_processed_at DESC LIMIT 20;"
```
