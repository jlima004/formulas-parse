# Deploy na DigitalOcean (Droplet)

Guia passo a passo para deploy da aplicacao em um Droplet Ubuntu, com build no proprio servidor e compatibilidade com `docker compose` (plugin v2) e `docker-compose` (legado).

## 1) Criar chave SSH no Linux

No seu computador Linux, gere uma chave `ed25519`:

```bash
ssh-keygen -t ed25519 -a 100 -C "seu_email@exemplo.com"
```

Quando solicitado:

- caminho da chave: pressione `Enter` para usar `~/.ssh/id_ed25519`
- passphrase: recomendavel definir uma senha forte

Mostre a chave publica:

```bash
cat ~/.ssh/id_ed25519.pub
```

## 2) Cadastrar chave SSH na DigitalOcean

Opcao via painel:

1. Acesse `Settings -> Security -> SSH Keys`
2. Clique em `Add SSH Key`
3. Cole o conteudo de `~/.ssh/id_ed25519.pub`

Opcao via `doctl`:

```bash
doctl auth init
doctl compute ssh-key create "linux-local-2026" --public-key "$(cat ~/.ssh/id_ed25519.pub)"
doctl compute ssh-key list
```

## 3) Criar o Droplet Ubuntu

No painel da DigitalOcean:

1. Crie um Droplet com Ubuntu LTS (ex.: Ubuntu 24.04)
2. Selecione a chave SSH cadastrada
3. Escolha tamanho conforme carga esperada (OCR pode demandar CPU)
4. Crie o Droplet

Ou via `doctl`:

```bash
doctl compute droplet create formulas-prod-01 \
  --region nyc3 \
  --size s-2vcpu-4gb \
  --image ubuntu-24-04-x64 \
  --ssh-keys <ID_OU_FINGERPRINT_DA_CHAVE> \
  --wait
```

## 4) Conectar no servidor via SSH

```bash
ssh root@<IP_PUBLICO_DO_DROPLET>
```

Se usar caminho customizado da chave:

```bash
ssh -i ~/.ssh/id_ed25519 root@<IP_PUBLICO_DO_DROPLET>
```

## 5) Instalar Docker Engine + Compose Plugin (repo oficial)

Remover pacotes conflitantes, se existirem:

```bash
sudo apt remove -y docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc
```

Adicionar repositorio oficial Docker:

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<'EOF'
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
```

Instalar Docker + Compose plugin:

```bash
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Validar instalacao:

```bash
sudo docker run hello-world
docker compose version
docker version
```

## 6) Preparar projeto no Droplet

Escolha o diretorio de deploy:

```bash
mkdir -p /opt/formulas
cd /opt/formulas
```

Clone o repositorio:

```bash
git clone <URL_DO_REPOSITORIO> .
```

Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

Edite `.env` com os valores reais:

- `MYSQL_PORT`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_APPLICATION_CREDENTIALS`

Crie pasta de credenciais e copie o JSON da Service Account:

```bash
mkdir -p credentials
```

Salve o JSON em:

```text
credentials/service-account.json
```

Defina no `.env`:

```text
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/service-account.json
```

## 7) Subir aplicacao (build no proprio Droplet)

Com Compose plugin v2:

```bash
docker compose up -d --build
```

Com Compose legado:

```bash
docker-compose up -d --build
```

## 8) Operacao basica

Ver status:

```bash
docker compose ps
```

Logs da aplicacao:

```bash
docker logs -f formulas-app
```

Parar stack:

```bash
docker compose down
```

Atualizar codigo e redeploy:

```bash
git pull
docker compose up -d --build
```

## 9) Validar MySQL publico

Este projeto mantem o MySQL exposto publicamente na porta `MYSQL_PORT`.

Teste no proprio Droplet:

```bash
docker exec formulas-mysql mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT 1;"
```

Teste remoto (da sua maquina):

```bash
mysql -h <IP_PUBLICO_DO_DROPLET> -P <MYSQL_PORT> -u <MYSQL_USER> -p
```

## 10) Compatibilidade entre versoes do Compose

O arquivo principal do projeto usa `docker-compose.yml` com `version: "2.4"`, para aumentar compatibilidade com:

- `docker-compose` antigo (v1.25+)
- `docker compose` moderno (plugin v2)

Validacao recomendada:

```bash
docker compose config
docker-compose config
```
