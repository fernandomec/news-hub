const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

//jwt_secret e tempo de expiração do token
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1d';

//função para criar token jwt
const createToken = (id, role) => {
    return jwt.sign({ id, role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
};

//validação de senha
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
    return null; //sem erros
};


//rota para exibir formulário de registro
router.get('/register', (req, res) => {
    res.render('register', { errors: null, success: null, user: res.locals.user });
});

//rota para processar formulário de registro
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
        //opcional: verificar username existente
        //const existingUserByUsername = await prisma.usuario.findFirst({ where: { username } });
        //if (existingUserByUsername) {
        //    errors.push('este nome de usuário já está em uso.');
        //}

        if (errors.length > 0) {
            return res.status(400).render('register', { errors, success: null, username, email, user: res.locals.user });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.usuario.create({
            data: {
                username,
                email,
                senha: hashedPassword,
                role: 'USER' //padrão para novos usuários
            }
        });

        const token = createToken(newUser.id, newUser.role);
        res.cookie('jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }); //maxAge em ms (1 dia)
        
        //redirecionar para home ou dashboard após registro bem-sucedido
        res.redirect('/');

    } catch (error) {
        console.error('erro ao registrar usuário:', error);
        errors.push('erro ao criar conta. tente novamente.');
        res.status(500).render('register', { errors, success: null, username, email, user: res.locals.user });
    }
});

//rota para exibir formulário de login
router.get('/login', (req, res) => {
    res.render('login', { errors: null, success: null, user: res.locals.user });
});

//rota para processar formulário de login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    let errors = [];

    if (!email || !password) {
        errors.push('e-mail e senha são obrigatórios.');
        return res.status(400).render('login', { errors, success: null, email, user: res.locals.user });
    }

    try {
        const usuario = await prisma.usuario.findUnique({ where: { email } });

        if (!usuario) {
            errors.push('e-mail ou senha inválidos.');
            return res.status(401).render('login', { errors, success: null, email, user: res.locals.user });
        }

        const isMatch = await bcrypt.compare(password, usuario.senha);
        if (!isMatch) {
            errors.push('e-mail ou senha inválidos.');
            return res.status(401).render('login', { errors, success: null, email, user: res.locals.user });
        }

        const token = createToken(usuario.id, usuario.role);
        res.cookie('jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }); //maxAge em ms (1 dia)
        
        res.redirect('/');

    } catch (error) {
        console.error('erro ao fazer login:', error);
        errors.push('erro ao tentar fazer login. tente novamente.');
        res.status(500).render('login', { errors, success: null, email, user: res.locals.user });
    }
});

//rota de logout
router.post('/logout', (req, res) => { //mudado de get para post
    res.cookie('jwt', '', { maxAge: 1, httpOnly: true }); //expira o cookie e httpOnly
    res.status(200).json({ success: true, message: 'logout bem-sucedido' }); //envia resposta json
});


//rota para exibir formulário de esqueceu a senha
router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { errors: null, success: null, user: res.locals.user });
});

//rota para processar formulário de esqueceu a senha
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
            //não informar se o e-mail existe ou não por segurança, mas para fins de teste/desenvolvimento:
            //errors.push('nenhum usuário encontrado com este e-mail.');
            //em produção, é melhor uma mensagem genérica:
            success = 'se um usuário com este e-mail existir, um link de redefinição será enviado.';
            return res.status(200).render('forgot-password', { errors, success, email, user: res.locals.user });
        }

        //lógica para gerar token de reset e enviar e-mail (simulado)
        //const resetToken = crypto.randomBytes(32).toString('hex');
        //const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        //await prisma.usuario.update({
        //    where: { email },
        //    data: {
        //        passwordResetToken: hashedResetToken,
        //        passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000) //10 minutos
        //    }
        //});
        //console.log(`link de reset para ${email}: /reset-password/${resetToken}`); //simulação
        
        success = 'se um usuário com este e-mail existir, um link de redefinição de senha foi enviado.';
        //aqui você implementaria o envio de e-mail com o link contendo o resetToken
        
        res.status(200).render('forgot-password', { errors: null, success, email: '', user: res.locals.user });

    } catch (error) {
        console.error('erro no processo de esqueceu a senha:', error);
        errors.push('ocorreu um erro. tente novamente.');
        res.status(500).render('forgot-password', { errors, success: null, email, user: res.locals.user });
    }
});


router.get('/test-index-route', (req, res) => {
    res.send('rota de teste de index.js funcionando');
});


module.exports = router;
