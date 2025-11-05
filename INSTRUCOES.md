# Guia de Instalação e Execução - Boleto Manager AI

Este documento descreve o passo a passo para instalar e executar o sistema Boleto Manager AI em um ambiente de servidor.

## 1. Pré-requisitos do Servidor

Antes de iniciar, garanta que o seu servidor (preferencialmente um sistema operacional baseado em Linux, como Ubuntu) tenha os seguintes softwares instalados:

- **Git:** Para clonar o repositório.
  ```bash
  sudo apt update
  sudo apt install git -y
  ```
- **Node.js e npm:** Para executar a aplicação backend e gerenciar pacotes. É recomendado usar uma versão LTS.
  ```bash
  # Exemplo para Node.js 20.x
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```
- **Python e Pip:** Necessário para o serviço de extração de dados de PDF.
  ```bash
  sudo apt install python3 python3-pip -y
  ```
- **MySQL Server:** O banco de dados para armazenar todas as informações.
  ```bash
  sudo apt install mysql-server -y
  sudo mysql_secure_installation # Siga as instruções para configurar a senha do root e proteger o DB
  ```
- **PM2:** Um gerenciador de processos para manter a aplicação rodando em produção.
  ```bash
  sudo npm install -g pm2
  ```

## 2. Implantação Automatizada com Script

Para facilitar a instalação, foi criado um script que automatiza todo o processo de configuração.

### Passo 1: Obter o script de deploy

Copie o conteúdo do arquivo `deploy.txt` para um novo arquivo no seu servidor chamado `deploy.sh`.

### Passo 2: Tornar o script executável

Dê permissão de execução para o arquivo que você acabou de criar:
```bash
chmod +x deploy.sh
```

### Passo 3: Executar o script

Inicie o script de implantação. Ele irá guiar você por todo o processo.
```bash
./deploy.sh
```

O script irá automaticamente:
- Instalar todas as dependências do sistema (Nginx, Node, Python, PM2, etc).
- Configurar o MySQL e criar o banco de dados.
- Clonar o repositório do projeto.
- Criar o arquivo de configuração `.env` com as informações do seu ambiente.
- Instalar as dependências do projeto (Node e Python).
- Compilar o código TypeScript.
- Configurar o banco de dados com o schema inicial.
- Configurar o Nginx como um proxy reverso.
- Iniciar a aplicação usando o PM2 para que ela continue rodando em segundo plano.
- Obter um certificado SSL gratuito da Let's Encrypt para seu domínio.

## 3. Gerenciando a Aplicação com PM2

Após a instalação, a aplicação estará sendo gerenciada pelo PM2. Aqui estão alguns comandos úteis:

- **Listar todas as aplicações:**
  ```bash
  pm2 list
  ```
- **Ver os logs da aplicação em tempo real:**
  ```bash
  pm2 logs boleto-manager-ai
  ```
- **Parar a aplicação:**
  ```bash
  pm2 stop boleto-manager-ai
  ```
- **Reiniciar a aplicação:**
  ```bash
  pm2 restart boleto-manager-ai
  ```
- **Remover a aplicação do PM2:**
  ```bash
  pm2 delete boleto-manager-ai
  ```

## 4. Acesso à Aplicação

Após a conclusão do script, a aplicação estará acessível na URL do seu domínio, já configurada com HTTPS.