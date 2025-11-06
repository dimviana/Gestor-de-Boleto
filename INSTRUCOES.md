# Guia de Implantação Automatizada - Boleto Manager AI

Este documento descreve como implantar o sistema Boleto Manager AI em um servidor Linux (Ubuntu recomendado) usando o script de automação.

## Pré-requisitos

Antes de executar o script, você deve ter:

1.  **Um servidor Linux (Ubuntu 20.04 ou superior recomendado).**
2.  **Um banco de dados MySQL ou MariaDB já instalado e acessível.** O script **não** instalará o MySQL por você.
3.  **Um banco de dados e um usuário MySQL criados** para a aplicação.

Você pode criar o banco de dados e o usuário com os seguintes comandos SQL (substitua `'admin'` e `'sua_senha_forte'` pelos seus próprios valores):

```sql
CREATE DATABASE boleto_manager_ai;
CREATE USER 'admin'@'localhost' IDENTIFIED BY 'sua_senha_forte';
GRANT ALL PRIVILEGES ON boleto_manager_ai.* TO 'admin'@'localhost';
FLUSH PRIVILEGES;
```

## Visão Geral

O script `deploy.sh` foi projetado para automatizar a maior parte do processo de implantação:
- Instalação de dependências do sistema (Nginx, Node.js, Python, etc.).
- Clonagem do código-fonte mais recente.
- Configuração do ambiente da aplicação (arquivo `.env`).
- Populando o esquema do banco de dados na sua base MySQL pré-existente.
- Build do projeto e instalação de dependências.
- Configuração do Nginx como proxy reverso.
- Obtenção de um certificado SSL (HTTPS) com Let's Encrypt.
- Gerenciamento da aplicação com PM2 para garantir que ela permaneça online.

## Passos para a Implantação

### Passo 1: Preparar o Script

1.  Conecte-se ao seu servidor via SSH.
2.  Copie o conteúdo do arquivo `deploy.txt` para um novo arquivo no seu servidor chamado `deploy.sh`.
    ```bash
    nano deploy.sh
    # Cole o conteúdo do deploy.txt, depois salve e saia (Ctrl+X, Y, Enter)
    ```

### Passo 2: Configurar as Variáveis

**Este é o passo mais importante.** Abra o script `deploy.sh` para edição e altere as variáveis de configuração no início do arquivo para corresponderem ao seu ambiente.

```bash
nano deploy.sh
```

Você **precisa** alterar os seguintes valores para corresponderem ao seu ambiente:
- `DOMAIN`: O seu nome de domínio (ex: `meusboletos.com.br`).
- `ADMIN_EMAIL`: O seu e-mail, usado para o registro do certificado SSL.
- `DB_HOST`: `localhost` se o banco de dados estiver no mesmo servidor, ou o endereço do seu servidor de banco de dados.
- `DB_USER`: O usuário MySQL que você criou (ex: `admin`).
- `DB_PASSWORD`: A senha forte que você definiu para o usuário MySQL.
- `DB_DATABASE`: O nome do banco de dados que você criou (ex: `boleto_manager_ai`).
- `API_KEY`: A sua chave de API do Google Gemini.
- `JWT_SECRET`: **Crie uma string longa e aleatória** para a segurança da autenticação.

### Passo 3: Tornar o Script Executável

Dê permissão de execução para o arquivo:
```bash
chmod +x deploy.sh
```

### Passo 4: Executar a Instalação

Execute o script e escolha a opção para uma instalação completa:
```bash
./deploy.sh
```
Selecione a **Opção 1) Full Installation**. O script cuidará do resto. Ao final, sua aplicação estará online e acessível em `https://seudominio.com.br`.

## Gerenciando a Aplicação com PM2

Após a instalação, a aplicação é gerenciada pelo PM2. Comandos úteis:

- **Ver os logs da aplicação:**
  ```bash
  pm2 logs gerenciaboleto
  ```
- **Reiniciar a aplicação (após uma atualização, por exemplo):**
  ```bash
  pm2 restart gerenciaboleto
  ```
- **Listar processos gerenciados:**
  ```bash
  pm2 list
  ```

## Atualizando o Sistema

Para atualizar a aplicação com o código mais recente do repositório Git, simplesmente execute o script novamente e escolha a **Opção 2) Update System**.

```bash
./deploy.sh
```

## Desinstalando o Sistema

Para remover completamente a aplicação, o banco de dados e as configurações, execute o script e escolha a **Opção 3) Uninstall System**.
```bash
./deploy.sh
```