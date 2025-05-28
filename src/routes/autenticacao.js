const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1d';

const createToken = (id, role) => {
    return jwt.sign({ id, role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
};

const validatePassword = (password) => {
    if (password.length < 8 || password.length > 20) {
        return 'a senha deve conter entre 8 e 20 caracteres.';
    }
    if (!/\d/.test(password)) {
        return 'a senha deve conter pelo menos 1 número.';
    }
    if (!/[!@#$%^&*]/.test(password)) {
        return 'a senha deve conter pelo menos 1 caractere especial (!, @, #, $, %, ^, &,*).';
    }
    return null;
};

// Função para enviar email de verificação
async function enviarEmailVerificacao(usuario, req) {
    const token = usuario.tokenVerificacao;
    const link = `${req.protocol}://${req.get('host')}/verificar-email/${usuario.id}/${token}`;
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    await transporter.sendMail({
        to: usuario.email,
        from: process.env.EMAIL_USER,
        subject: 'Verifique sua conta NewsHub',
        text: `Clique no link para verificar sua conta: ${link}`
    });
}

// rota para exibir formulário de registro
router.get('/register', (req, res) => {
    res.render('register', { errors: null, success: null, user: res.locals.user });
});

// Rota para processar registro com verificação de email
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    let errors = [];

    const passwordError = validatePassword(password);
    if (passwordError) {
        errors.push(passwordError);
    }

    if (!username || !email || !password) {
        errors.push('todos os campos são obrigatórios.');
    }

    if (errors.length > 0) {
        return res.status(400).render('register', { errors, success: null, username, email, user: res.locals.user });
    }

    try {
        const existingUserByEmail = await prisma.usuario.findUnique({ where: { email } });
        if (existingUserByEmail) {
            errors.push('este e-mail já está em uso.');
        }

        if (errors.length > 0) {
            return res.status(400).render('register', { errors, success: null, username, email, user: res.locals.user });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const tokenVerificacao = crypto.randomBytes(32).toString('hex');
        const verificacaoExpiraEm = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 horas

        // Cria o usuário primeiro
        const newUser = await prisma.usuario.create({
            data: {
                username,
                email,
                senha: hashedPassword,
                role: 'USER',
                autenticado: false,
                tokenVerificacao,
                verificacaoExpiraEm
            }
        });

        // Só depois de criar, envia o email de verificação
        try {
            await enviarEmailVerificacao(newUser, req);
        } catch (emailError) {
            // Se falhar ao enviar email, remove o usuário criado para não ficar "fantasma"
            await prisma.usuario.delete({ where: { id: newUser.id } });
            errors.push('Erro ao enviar email de verificação. Tente novamente mais tarde.');
            return res.status(500).render('register', { errors, success: null, username, email, user: res.locals.user });
        }

        // Agendar deleção em 3 horas se não autenticado
        setTimeout(async () => {
            const user = await prisma.usuario.findUnique({ where: { id: newUser.id } });
            if (user && !user.autenticado) {
                await prisma.usuario.delete({ where: { id: newUser.id } });
            }
        }, 3 * 60 * 60 * 1000);

        res.render('register', { errors: null, success: 'Verifique seu email para ativar a conta.', username: '', email: '', user: res.locals.user });
    } catch (error) {
        console.error('erro ao registrar usuário:', error);
        errors.push('erro ao criar conta. tente novamente.');
        res.status(500).render('register', { errors, success: null, username, email, user: res.locals.user });
    }
});

// Rota para verificar email
router.get('/verificar-email/:id/:token', async (req, res) => {
    const { id, token } = req.params;
    try {
        const usuario = await prisma.usuario.findUnique({ where: { id: Number(id) } });
        if (!usuario || usuario.autenticado) {
            return res.render('login', { errors: ['Conta já verificada ou inexistente.'], success: null, user: null });
        }
        if (usuario.tokenVerificacao !== token || !usuario.verificacaoExpiraEm || usuario.verificacaoExpiraEm < new Date()) {
            await prisma.usuario.delete({ where: { id: usuario.id } });
            return res.render('login', { errors: ['Token inválido ou expirado. Registre-se novamente.'], success: null, user: null });
        }
        await prisma.usuario.update({
            where: { id: usuario.id },
            data: { autenticado: true, tokenVerificacao: null, verificacaoExpiraEm: null }
        });
        res.render('login', { errors: null, success: 'Conta verificada com sucesso! Faça login.', user: null });
    } catch (error) {
        res.render('login', { errors: ['Erro ao verificar conta.'], success: null, user: null });
    }
});

// rota para exibir forms de login
router.get('/login', (req, res) => {
    res.render('login', { errors: null, success: null, user: res.locals.user });
});

// Bloquear login para não autenticados
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    let errors = [];

    if (!email || !password) {
        errors.push('e-mail e senha são obrigatórios.');
        return res.status(400).render('login', { errors, success: null, email, user: res.locals.user });
    }

    try {
        const usuario = await prisma.usuario.findUnique({ where: { email } });

        if (!usuario || !usuario.autenticado) {
            errors.push('Conta não verificada. Verifique seu email.');
            return res.status(401).render('login', { errors, success: null, email, user: res.locals.user });
        }

        const isMatch = await bcrypt.compare(password, usuario.senha);
        if (!isMatch) {
            errors.push('e-mail ou senha inválidos.');
            return res.status(401).render('login', { errors, success: null, email, user: res.locals.user });
        }

        const token = createToken(usuario.id, usuario.role);
        res.cookie('jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
        res.redirect('/');
    } catch (error) {
        console.error('erro ao fazer login:', error);
        errors.push('erro ao tentar fazer login. tente novamente.');
        res.status(500).render('login', { errors, success: null, email, user: res.locals.user });
    }
});

// rota de logout
router.post('/logout', (req, res) => {
    res.cookie('jwt', '', { maxAge: 1, httpOnly: true }); //expira o cookie e httpOnly
    res.status(200).json({ success: true, message: 'logout bem-sucedido' }); //envia resposta JSON
});

// Recuperação de senha (envio de email)
router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { errors: null, success: null, user: res.locals.user });
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    let errors = [];
    let success = null;

    if (!email) {
        errors.push('o campo e-mail é obrigatório.');
        return res.status(400).render('forgot-password', { errors, success, email, user: res.locals.user });
    }

    try {
        const usuario = await prisma.usuario.findUnique({ where: { email } });

        if (!usuario) {
            success = 'Se um usuário com este e-mail existir, um link de redefinição será enviado.';
            return res.status(200).render('forgot-password', { errors, success, email, user: res.locals.user });
        }

        const secret = process.env.JWT_SECRET + usuario.senha;
        const token = jwt.sign({ id: usuario.id, email: usuario.email }, secret, { expiresIn: '1h' });
        const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${usuario.id}/${token}`;

        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            to: usuario.email,
            from: process.env.EMAIL_USER,
            subject: 'Redefinição de senha',
            text: `Você solicitou a redefinição de senha. Clique no link para redefinir: ${resetURL}`
        });

        success = 'Se um usuário com este e-mail existir, um link de redefinição foi enviado.';
        res.status(200).render('forgot-password', { errors: null, success, email: '', user: res.locals.user });
    } catch (error) {
        console.error('erro no processo de esqueceu a senha:', error);
        errors.push('ocorreu um erro. tente novamente.');
        res.status(500).render('forgot-password', { errors, success: null, email, user: res.locals.user });
    }
});

// Página de redefinição de senha
router.get('/reset-password/:id/:token', (req, res) => {
    const { id, token } = req.params;
    res.render('reset-password', { user: null, id, token, error: null, message: null });
});

// Processar redefinição de senha
router.post('/reset-password/:id/:token', async (req, res) => {
    const { id, token } = req.params;
    const { password } = req.body;
    try {
        const usuario = await prisma.usuario.findUnique({ where: { id: parseInt(id) } });
        if (!usuario) {
            return res.render('reset-password', { user: null, id, token, error: 'Usuário não encontrado.', message: null });
        }
        const secret = process.env.JWT_SECRET + usuario.senha;
        jwt.verify(token, secret);

        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.usuario.update({
            where: { id: usuario.id },
            data: { senha: hashedPassword }
        });

        res.render('reset-password', { user: null, id, token: null, error: null, message: 'Senha redefinida com sucesso!' });
    } catch (error) {
        res.render('reset-password', { user: null, id, token, error: 'Token inválido ou expirado.', message: null });
    }
});

module.exports = router;