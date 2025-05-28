# News Hub

A aplicação News Hub é um portal de notícias completo desenvolvido com Node.js, Express, Prisma (ORM) e PostgreSQL, oferecendo:

*   Autenticação baseada em roles (hierarquia de usuários: Super Admin, Admin, Editor, Leitor)
*   Publicação de artigos/notícias com categorias, tags, etc.
*   Sistema de comentários
*   Favoritação para publicações, o usuário pode salvar para ler/acessar outra hora
*   Upload de imagens para capa, perfil e categorias
*   Métricas avançadas com publicações mais lidas, visualizações por período, etc.

**Tecnologias:**
Node.js - Express - Prisma - PostgreSQL - EJS - JWT

## Descrição Detalhada

Esta aplicação é um portal de notícias com autenticação de usuários, publicação de artigos, sistema de comentários, favoritos e métricas de visualização.

## Pré-requisitos
Certifique-se de ter instalado em sua máquina:
* [Node.js](https://nodejs.org/)
* [PostgreSQL](https://www.postgresql.org/) (ou um servidor PostgreSQL em nuvem)

## Setup

1.  **Clone o repositório ou baixe o .zip:**
    ```bash
    git clone https://github.com/fernandomec/news-hub
    cd news-hub
    ```

2.  **Crie o arquivo .env:**
    Crie um arquivo chamado `.env` na raiz do projeto. Copie e cole o conteúdo abaixo no arquivo e edite de acordo com sua necessidade o DATABASE_URL, PORT, JWT_SECRET e o ambiente em NODE_ENV (recomendo deixar em production):

    ```env
    #environment variables declared in this file are automatically made available to prisma.
    #see the documentation for more detail: [https://pris.ly/d/prisma-schema#accessing-environment-variables-from-the-schema](https://pris.ly/d/prisma-schema#accessing-environment-variables-from-the-schema)

    #prisma supports the native connection string format for postgresql, mysql, sqlite, sql server, mongodb and cockroachdb.
    #see the documentation for all the connection string options: [https://pris.ly/d/connection-strings](https://pris.ly/d/connection-strings)

    #exemplo para postgresql local:
    #DATABASE_URL="postgresql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO?schema=public"
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/news_hub?schema=public"

    #porta em que a aplicação será executada
    PORT=3000

    #chave secreta para jwt (json web token) - substitua pela sua chave segura
    JWT_SECRET="coloque aqui sua chave jwt segura e aleatória"

    
    #use 'production' para aplicação no ar, em produção.
    #use 'testing' para ambiente testes. <!--corrigido de 'production' para 'testing'-->
    #use 'development' para ambiente de desenvolvimento.
    NODE_ENV=production
    #NODE_ENV=testing
    #NODE_ENV="development"
    ```

    **Importante:**
    * Ajuste `DATABASE_URL` conforme a configuração do seu banco de dados PostgreSQL.
    * **Substitua `"coloque aqui sua chave JWT segura e aleatória"` por uma chave secreta forte e única para `JWT_SECRET`.** Você pode gerar uma online ou usar um gerenciador de senhas.
    * A variável `PORT` pode ser alterada se a porta `3000` já estiver em uso.

3.  **Instale as dependências do projeto:**
    Abra o terminal na raiz do projeto e execute:
    ```bash
    npm install
    ```

4.  **Execute as migrações do banco de dados com Prisma:**
    Este comando aplicará o schema do banco de dados definido no Prisma ao seu banco.
    ```bash
    npx prisma migrate dev
    ```
    <!--nota: se for a primeira vez, isso também pode criar o banco de dados `news_hub` se ele não existir, dependendo da sua configuração do postgresql.-->

5.  **Gere o Prisma Client:**
    Este comando gera o cliente Prisma com base no seu schema para interagir com o banco de dados.
    ```bash
    npx prisma generate
    ```

## Executando a Aplicação

Para iniciar o servidor de desenvolvimento, execute:

```bash
npm run dev
```