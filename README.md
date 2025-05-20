# aplicação ainda em desenvolvimento!!! incompleta
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

### Estrutura Geral do Banco de Dados
O banco de dados é relacional (PostgreSQL) e usa o Prisma ORM para gerenciamento. As principais funcionalidades são:
*   Autenticação e perfis de usuários
*   Publicação e categorização de notícias
*   Comentários e interações (likes, favoritos)
*   Controle de visualizações (mais acessadas)
*   Upload de imagens (capa, perfil, categorias)

### Tabelas e Relacionamentos

#### Tabela Usuario (Users)
Finalidade: Armazenar dados de usuários (leitores, editores, administradores).

| Campo            | Tipo          | Descrição                                  |
|------------------|---------------|--------------------------------------------|
| id               | Int           | ID único (auto-incremento)                 |
| email            | String        | E-mail (único)                             |
| username         | String        | Nome de usuário (máx. 30 caracteres)       |
| senha            | String        | Senha (hash)                               |
| role             | Role          | USER, EDITOR, ADMIN, SUPER_ADMIN           |
| biografia        | String?       | Descrição do perfil                        |
| localizacao      | String?       | Localização do usuário                     |
| website          | String?       | Site pessoal                               |
| createdAt        | DateTime      | Data de registro                           |
| updatedAt        | DateTime      | Última atualização                         |
| podeComentar     | Boolean       | Se o usuário está bloqueado de comentar    |
| imagemPerfilId   | Int?          | ID da imagem de perfil (FK para Imagem)    |

**Relacionamentos:**
*   `noticias` → Notícias escritas pelo usuário (se for EDITOR/ADMIN)
*   `comentarios` → Comentários feitos pelo usuário
*   `favoritos` → Notícias favoritadas/salvas
*   `senhasAnteriores` → Histórico de senhas (segurança)
*   `imagemPerfil` → Foto de perfil (relação com Imagem)
*   `acessosNoticias` → Logs de acesso a notícias feitos pelo usuário

#### Tabela Noticia (News)
Finalidade: Armazenar artigos publicados.

| Campo                 | Tipo     | Descrição                               |
|-----------------------|----------|-----------------------------------------|
| id                    | Int      | ID único                                |
| titulo                | String   | Título da notícia                       |
| slug                  | String   | URL amigável (único)                    |
| conteudo              | String   | Corpo do artigo                         |
| resumo                | String   | Descrição curta (300 caracteres)        |
| publicado             | Boolean  | Se está publicado ou em rascunho        |
| dataPublicacao        | DateTime?| Data de publicação                      |
| visualizacoes         | Int      | Número de acessos                       |
| autorId               | Int      | ID do autor (FK para Usuario)           |
| comentariosAtivados   | Boolean  | Se permite comentários                  |
| contagemComentarios   | Int      | Número de comentários (cache)           |
| createdAt             | DateTime | Data de criação                         |
| updatedAt             | DateTime | Última atualização                      |
| imagemId              | Int?     | ID da imagem de capa (FK para Imagem)   |

**Relacionamentos:**
*   `autor` → Usuário que escreveu a notícia (EDITOR/ADMIN)
*   `categorias` → Categorias relacionadas (ex: "Política", "Tecnologia")
*   `tags` → Tags de classificação (ex: "Eleições 2024")
*   `comentarios` → Comentários na notícia
*   `favoritos` → Usuários que favoritaram
*   `acessos` → Registro de visualizações
*   `imagem` → Imagem de capa (relação com Imagem)

#### Tabela Categoria (Categories)
Finalidade: Organizar notícias por temas.

| Campo       | Tipo     | Descrição                             |
|-------------|----------|---------------------------------------|
| id          | Int      | ID único                              |
| nome        | String   | Nome da categoria (único)             |
| slug        | String   | URL amigável (único)                  |
| descricao   | String   | Descrição da categoria                |
| createdAt   | DateTime | Data de criação                       |
| updatedAt   | DateTime | Última atualização                    |
| imagemId    | Int?     | ID da imagem da categoria (FK para Imagem) |

**Relacionamentos:**
*   `noticias` → Notícias nesta categoria
*   `imagem` → Imagem de capa (opcional)

#### Tabela Tag (Tags)
Finalidade: Classificação flexível de notícias.

| Campo     | Tipo     | Descrição              |
|-----------|----------|------------------------|
| id        | Int      | ID único               |
| nome      | String   | Nome da tag (único)    |
| slug      | String   | URL amigável (único)   |
| createdAt | DateTime | Data de criação        |
| updatedAt | DateTime | Última atualização     |

**Relacionamentos:**
*   `noticias` → Notícias com esta tag

#### Tabela Comentario (Comments)
Finalidade: Permitir interação dos leitores.

| Campo               | Tipo      | Descrição                                  |
|---------------------|-----------|--------------------------------------------|
| id                  | Int       | ID único                                   |
| conteudo            | String    | Texto do comentário                        |
| autorId             | Int       | ID do autor (FK para Usuario)              |
| noticiaId           | Int       | ID da notícia (FK para Noticia)            |
| comentarioPaiId     | Int?      | ID do comentário pai (para respostas)      |
| aprovado            | Boolean   | Se foi aprovado por um moderador           |
| editado             | Boolean   | Se o comentário foi editado                |
| dataEdicao          | DateTime? | Data da última edição                      |
| upvotes             | Int       | Votos positivos                            |
| downvotes           | Int       | Votos negativos                            |
| sinalizado          | Boolean   | Se foi denunciado                          |
| motivoSinalizacao   | String?   | Razão da denúncia                          |
| createdAt           | DateTime  | Data de criação                            |
| updatedAt           | DateTime  | Última atualização                         |

**Relacionamentos:**
*   `autor` → Usuário que comentou
*   `noticia` → Notícia comentada
*   `comentarioPai` → Comentário principal (se for resposta)
*   `respostas` → Respostas ao comentário

#### Tabela Favorito (Favorites)
Finalidade: Permitir que usuários salvem notícias.

| Campo     | Tipo     | Descrição                             |
|-----------|----------|---------------------------------------|
| id        | Int      | ID único                              |
| usuarioId | Int      | ID do usuário (FK para Usuario)       |
| noticiaId | Int      | ID da notícia (FK para Noticia)       |
| createdAt | DateTime | Data do favorito                      |

**Relacionamentos:**
*   `usuario` → Usuário que favoritou
*   `noticia` → Notícia favoritada

#### Tabela AcessoNoticia (News Access Logs)
Finalidade: Rastrear visualizações para métricas.

| Campo     | Tipo     | Descrição                             |
|-----------|----------|---------------------------------------|
| id        | Int      | ID único                              |
| noticiaId | Int      | ID da notícia (FK para Noticia)       |
| usuarioId | Int?     | ID do usuário logado (FK para Usuario)|
| ip        | String?  | Endereço IP do leitor                 |
| createdAt | DateTime | Data do acesso                        |

**Relacionamentos:**
*   `noticia` → Notícia acessada
*   `usuario` → Usuário logado (se aplicável)

#### Tabela Imagem (Images)
Finalidade: Armazenar imagens (perfil, capa de notícias, etc).

| Campo     | Tipo     | Descrição                               |
|-----------|----------|-----------------------------------------|
| id        | Int      | ID único                                |
| dados     | Bytes    | Binário da imagem                       |
| tipoMime  | String   | Tipo (ex: image/jpeg)                   |
| createdAt | DateTime | Data de upload                          |

**Relacionamentos:**
*   `perfilUsuario` → Foto de perfil de um usuário
*   `imagemNoticia` → Imagem de capa de uma notícia
*   `imagemCategoria` → Imagem de uma categoria

#### Tabela SenhaAnterior (Previous Passwords)
Finalidade: Armazenar histórico de senhas de um usuário para segurança.

| Campo     | Tipo     | Descrição                             |
|-----------|----------|---------------------------------------|
| id        | Int      | ID único                              |
| senha     | String   | Senha antiga (hash)                   |
| createdAt | DateTime | Data que a senha foi alterada         |
| usuarioId | Int      | ID do usuário (FK para Usuario)       |

**Relacionamentos:**
*   `usuario` → Usuário ao qual o histórico de senha pertence

### Fluxo de Funcionamento
1.  **Usuário se cadastra** → Dados vão para `Usuario`.
2.  **Editor/Admin publica notícia** → Cria registro em `Noticia` com `autor`, `categorias` e `tags`.
3.  **Leitor acessa notícia** → Gera registro em `AcessoNoticia` e incrementa `visualizacoes` em `Noticia`.
4.  **Leitor comenta** → Cria registro em `Comentario` (se `comentariosAtivados` = true na `Noticia`).
5.  **Leitor favorita** → Adiciona em `Favorito`.
6.  **Admin modera comentários** → Altera `aprovado` ou `sinalizado` em `Comentario`.

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
