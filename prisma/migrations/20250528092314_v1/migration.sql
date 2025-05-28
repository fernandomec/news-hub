-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN');

-- CreateTable
CREATE TABLE "Imagem" (
    "id" SERIAL NOT NULL,
    "dados" BYTEA NOT NULL,
    "tipoMime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Imagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "senha" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "biografia" TEXT,
    "localizacao" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "podeComentar" BOOLEAN NOT NULL DEFAULT true,
    "tel" VARCHAR(20),
    "cep" VARCHAR(10),
    "bairro" VARCHAR(50),
    "endereco" VARCHAR(100),
    "enderecoComplemento" VARCHAR(100),
    "imagemPerfilId" INTEGER,
    "autenticado" BOOLEAN NOT NULL DEFAULT false,
    "tokenVerificacao" TEXT,
    "verificacaoExpiraEm" TIMESTAMP(3),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "imagemId" INTEGER,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Noticia" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "resumo" VARCHAR(300) NOT NULL,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "dataPublicacao" TIMESTAMP(3),
    "visualizacoes" INTEGER NOT NULL DEFAULT 0,
    "autorId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "comentariosAtivados" BOOLEAN NOT NULL DEFAULT true,
    "contagemComentarios" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "imagemId" INTEGER,

    CONSTRAINT "Noticia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comentario" (
    "id" SERIAL NOT NULL,
    "conteudo" TEXT NOT NULL,
    "autorId" INTEGER NOT NULL,
    "noticiaId" INTEGER NOT NULL,
    "comentarioPaiId" INTEGER,
    "aprovado" BOOLEAN NOT NULL DEFAULT false,
    "editado" BOOLEAN NOT NULL DEFAULT false,
    "dataEdicao" TIMESTAMP(3),
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "sinalizado" BOOLEAN NOT NULL DEFAULT false,
    "motivoSinalizacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorito" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "noticiaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcessoNoticia" (
    "id" SERIAL NOT NULL,
    "noticiaId" INTEGER NOT NULL,
    "usuarioId" INTEGER,
    "ip" VARCHAR(45),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcessoNoticia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SenhaAnterior" (
    "id" SERIAL NOT NULL,
    "senha" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "SenhaAnterior_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_NoticiaToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_NoticiaToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_imagemPerfilId_key" ON "Usuario"("imagemPerfilId");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nome_key" ON "Categoria"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_slug_key" ON "Categoria"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_imagemId_key" ON "Categoria"("imagemId");

-- CreateIndex
CREATE UNIQUE INDEX "Noticia_slug_key" ON "Noticia"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Noticia_imagemId_key" ON "Noticia"("imagemId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_nome_key" ON "Tag"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Favorito_usuarioId_noticiaId_key" ON "Favorito"("usuarioId", "noticiaId");

-- CreateIndex
CREATE INDEX "AcessoNoticia_noticiaId_idx" ON "AcessoNoticia"("noticiaId");

-- CreateIndex
CREATE INDEX "AcessoNoticia_createdAt_idx" ON "AcessoNoticia"("createdAt");

-- CreateIndex
CREATE INDEX "_NoticiaToTag_B_index" ON "_NoticiaToTag"("B");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_imagemPerfilId_fkey" FOREIGN KEY ("imagemPerfilId") REFERENCES "Imagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_imagemId_fkey" FOREIGN KEY ("imagemId") REFERENCES "Imagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Noticia" ADD CONSTRAINT "Noticia_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Noticia" ADD CONSTRAINT "Noticia_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Noticia" ADD CONSTRAINT "Noticia_imagemId_fkey" FOREIGN KEY ("imagemId") REFERENCES "Imagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_noticiaId_fkey" FOREIGN KEY ("noticiaId") REFERENCES "Noticia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_comentarioPaiId_fkey" FOREIGN KEY ("comentarioPaiId") REFERENCES "Comentario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_noticiaId_fkey" FOREIGN KEY ("noticiaId") REFERENCES "Noticia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcessoNoticia" ADD CONSTRAINT "AcessoNoticia_noticiaId_fkey" FOREIGN KEY ("noticiaId") REFERENCES "Noticia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcessoNoticia" ADD CONSTRAINT "AcessoNoticia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SenhaAnterior" ADD CONSTRAINT "SenhaAnterior_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NoticiaToTag" ADD CONSTRAINT "_NoticiaToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Noticia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NoticiaToTag" ADD CONSTRAINT "_NoticiaToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
