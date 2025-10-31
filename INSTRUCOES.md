# Guia de Instalação e Execução - Boleto Manager AI

Este documento descreve o passo a passo para instalar e executar o sistema Boleto Manager AI em um ambiente de servidor.

## 1. Pré-requisitos do Servidor

Antes de iniciar, garanta que o seu servidor (preferencialmente um sistema operacional baseado em Linux, como Ubuntu) tenha os seguintes softwares instalados:

- **Git:** Para clonar o repositório.
  ```bash
  sudo apt update
  sudo apt install git
  ```
- **Node.js e npm:** Para executar a aplicação backend e gerenciar pacotes. É recomendado usar uma versão LTS.
  ```bash
  # Exemplo para Node.js 20.x
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```
- **MySQL Server:** O banco de dados para armazenar todas as informações.
  ```bash
  sudo apt install mysql-server
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

O script irá solicitar as seguintes informações. Tenha-as em mãos:

1.  **URL do Repositório Git:** A URL HTTPS do repositório do projeto.
2.  **Nome da Pasta:** Um nome para a pasta onde o projeto será instalado (ex: `boleto-manager-ai`).
3.  **URL de Acesso:** O endereço completo que será usado para acessar a aplicação (ex: `http://seu_dominio.com` ou `http://ip_do_servidor:3001`).
4.  **Dados do Banco de Dados:** Host, usuário, senha e nome do banco de dados MySQL.
5.  **Chave da API do Google Gemini:** Sua chave secreta para a API do Gemini.
6.  **Segredo JWT:** Uma frase secreta longa e aleatória para a segurança da autenticação.

O script irá automaticamente:
- Clonar o repositório.
- Criar o arquivo de configuração `.env` com as informações fornecidas.
- Instalar as dependências do projeto.
- Compilar o código (se for TypeScript).
- Criar o banco de dados e as tabelas necessárias.
- Iniciar a aplicação usando o PM2 para que ela continue rodando em segundo plano.

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

Após a conclusão do script, a aplicação estará acessível na URL que você forneceu durante a instalação.
