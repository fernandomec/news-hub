const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

//visualizar perfil do usuário logado
router.get('/user', async (req, res) => {
    if (!res.locals.user) {
        return res.redirect('/login');
    }
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: res.locals.user.id },
            select: {
                id: true,
                username: true,
                email: true,
                tel: true,
                cep: true,
                bairro: true,
                endereco: true,
                enderecoComplemento: true,
                createdAt: true,
                imagemPerfilId: true
            }
        });
        if (!usuario) return res.redirect('/login');
        res.render('user', {
            user: {
                ...usuario,
                profileImageId: usuario.imagemPerfilId || null
            }
        });
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.redirect('/');
    }
});

//exibir formulário de edição do perfil
router.get('/user/edit', async (req, res) => {
    if (!res.locals.user) {
        return res.redirect('/login');
    }
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: res.locals.user.id },
            select: {
                id: true,
                username: true,
                email: true,
                tel: true,
                cep: true,
                bairro: true,
                endereco: true,
                enderecoComplemento: true,
                imagemPerfilId: true
            }
        });
        if (!usuario) return res.redirect('/login');
        res.render('user-edit', {
            user: {
                ...usuario,
                profileImageUrl: usuario.imagemPerfilId ? `/imagem/${usuario.imagemPerfilId}` : null
            },
            messages: {}
        });
    } catch (error) {
        console.error('Erro ao buscar perfil para edição:', error);
        res.redirect('/user');
    }
});

//processar edição do perfil
router.post('/user-edit', upload.single('profileImage'), async (req, res) => {
    console.log('arquivo salçvo:', req.file);
    if (!res.locals.user) {
        return res.redirect('/login');
    }
    const { username, tel, cep, bairro, endereco, enderecoComplemento, newPassword, currentPassword } = req.body;
    let messages = {};
    try {
        const usuario = await prisma.usuario.findUnique({ where: { id: res.locals.user.id } });
        if (!usuario) {
            messages.error = 'Usuário não encontrado.';
            return res.render('user-edit', { user: res.locals.user, messages });
        }
        const senhaCorreta = await bcrypt.compare(currentPassword, usuario.senha);
        if (!senhaCorreta) {
            messages.error = 'Senha atual incorreta.';
            return res.render('user-edit', { user: res.locals.user, messages });
        }
        let dataUpdate = {
            username,
            tel,
            cep,
            bairro,
            endereco,
            enderecoComplemento
        };

        let imagemAntigaId = usuario.imagemPerfilId;

        //salvar imagem de perfil se houver upload
        if (req.file && req.file.buffer) {
            console.log('Salvando imagem no banco...');
            //cria nova imagem
            const imagem = await prisma.imagem.create({
                data: {
                    dados: Buffer.from(req.file.buffer),
                    tipoMime: req.file.mimetype
                }
            });
            dataUpdate.imagemPerfilId = imagem.id;
        }

        //salvar senha anterior e atualizar senha se for alterada
        if (newPassword && newPassword.length >= 8) {
            //salva senha antiga
            await prisma.senhaAnterior.create({
                data: {
                    senha: usuario.senha,
                    usuarioId: usuario.id
                }
            });
            dataUpdate.senha = await bcrypt.hash(newPassword, 10);
        }

        await prisma.usuario.update({
            where: { id: usuario.id },
            data: dataUpdate
        });

        //após atualizar o usuário, deleta a imagem antiga se foi trocada
        if (req.file && req.file.buffer && imagemAntigaId) {
            await prisma.imagem.delete({ where: { id: imagemAntigaId } }).catch(() => { });
        }

        messages.success = 'Perfil atualizado com sucesso!';
        const usuarioAtualizado = await prisma.usuario.findUnique({
            where: { id: usuario.id },
            select: {
                id: true,
                username: true,
                email: true,
                tel: true,
                cep: true,
                bairro: true,
                endereco: true,
                enderecoComplemento: true,
                imagemPerfilId: true
            }
        });
        res.render('user-edit', {
            user: {
                ...usuarioAtualizado,
                profileImageUrl: usuarioAtualizado.imagemPerfilId ? `/imagem/${usuarioAtualizado.imagemPerfilId}` : null
            },
            messages
        });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        messages.error = 'Erro ao atualizar perfil.';
        res.render('user-edit', { user: res.locals.user, messages });
    }
});

//imagem de perfil
router.get('/imagem/:id', async (req, res) => {
    try {
        const imagem = await prisma.imagem.findUnique({ where: { id: Number(req.params.id) } });
        if (!imagem) return res.status(404).send('Imagem não encontrada');
        res.set('Content-Type', imagem.tipoMime);
        res.send(imagem.dados);
    } catch (e) {
        res.status(500).send('Erro ao carregar imagem');
    }
});

module.exports = router;
