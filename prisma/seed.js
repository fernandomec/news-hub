const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    console.log('~~~~~~~~~~~~ SEED DO BANCO DE DADOS EXECUTANDO ~~~~~~~~~~~~');

    //criar super admin
    const senhaSuperAdmin = await bcrypt.hash('superadmin123', 10);
    const superAdmin = await prisma.usuario.upsert({
        where: { email: 'superadmin@newshub.com' },
        update: {},
        create: {
        email: 'superadmin@newshub.com',
        username: 'SuperAdmin',
        senha: senhaSuperAdmin,
        role: 'SUPER_ADMIN',
        biografia: 'Super Admin do sistema',
        podeComentar: true,
        },
    });
    console.log(`usuario super admin ${superAdmin.email} criado`);

    //criar admin
    const senhaAdmin = await bcrypt.hash('admin123', 10);
    const admin = await prisma.usuario.upsert({
        where: { email: 'admin@newshub.com' },
        update: {},
        create: {
        email: 'admin@newshub.com',
        username: 'Admin',
        senha: senhaAdmin,
        role: 'ADMIN',
        biografia: 'Admin do portal',
        podeComentar: true,
        },
    });
    console.log(`usuario admin ${admin.email} criado`);

    //criar editor
    const senhaEditor = await bcrypt.hash('editor123', 10);
    const editor = await prisma.usuario.upsert({
    where: { email: 'editor@newshub.com' },
    update: {},
    create: {
        email: 'editorA@newshub.com',
        username: 'Editor',
        senha: senhaEditor,
        role: 'EDITOR',
        biografia: 'Editor',
        podeComentar: true,
    },
    });
    console.log(`Editor criado: ${editor.email}`);
  
    //criar user comum
    const senhaUsuario = await bcrypt.hash('user123', 10);
    const usuario = await prisma.usuario.upsert({
    where: { email: 'user@newshub.com' },
    update: {},
    create: {
        email: 'user@newshub.com',
        username: 'User Comum',
        senha: senhaUsuario,
        role: 'USER',
        biografia: 'Leitor',
        podeComentar: true,
    },
    });
    console.log(`usuario ${usuario.email} criado`);

    //criar categorias
    const categorias = [
    { nome: 'Política', slug: 'politica', descricao: 'Notícias sobre política' },
    { nome: 'Economia', slug: 'economia', descricao: 'Notícias sobre economia, negócios e finanças' },
    { nome: 'Tecnologia', slug: 'tecnologia', descricao: 'Novidades do mundo da tecnologia e inovação' },
    { nome: 'Esportes', slug: 'esportes', descricao: 'Notícias sobre o mundo dos esportes' },
    { nome: 'Jogos', slug: 'jogos', descricao: 'Notícias sobre jogos' },
    { nome: 'Saúde', slug: 'saude', descricao: 'Notícias sobre saúde, bem-estar e medicina' },
    ];
    //loop para printar no terminal ao criar as categorias
    for (const categoria of categorias) {
    await prisma.categoria.upsert({
        where: { slug: categoria.slug },
        update: {},
        create: categoria,
    });
    console.log(`Categoria ${categoria.nome} criada`);
    }

    //criar tags iniciais
    const tags = [
    { nome: 'Eleições 2026', slug: 'eleicoes' },
    { nome: 'GTA VI', slug: 'urgente' },
    { nome: 'Inteligencia Artificial', slug: 'ia' },
    { nome: 'Gaming', slug: 'gaming' }
    ];

  //loop para printar no terminal ao criar as tags
    for (const tag of tags) {
    await prisma.tag.upsert({
        where: { slug: tag.slug },
        update: {},
        create: tag,
    });
    console.log(`Tag ${tag.nome} criada`);
    }

    console.log('~~~~~~~~~~~~ SEED DO BANCO DE DADOS FINALIZADA ~~~~~~~~~~~~');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
