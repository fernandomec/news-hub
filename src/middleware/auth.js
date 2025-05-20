const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

//middleware para verificar se o usuário está autenticado
const authMiddleware = (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.redirect('/auth/login');
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    res.locals.user = decodedToken;
    next();
  } catch (error) {
    res.cookie('jwt', '', { maxAge: 1 });
    res.redirect('/auth/login');
  }
};

//middleware para verificar se o usuário tem a role necessário
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!res.locals.user || !roles.includes(res.locals.user.role)) {
      return res.status(403).render('403', { mensagem: 'Acesso negado' });
    }
    next();
  };
};

//middleware para verificar se o usuário está logado em todas as rotas
const checkUser = async (req, res, next) => {
  const token = req.cookies.jwt;
  
  if (token) {
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      
      //buscar dados completos do user
      const usuario = await prisma.usuario.findUnique({ 
        where: { id: decodedToken.id },
        select: { 
          id: true, 
          username: true, 
          email: true, 
          role: true, 
          biografia: true, 
          podeComentar: true,
          imagemPerfilId: true
        }
      });
      
      if (usuario) {
        res.locals.user = usuario;
      } else {
        res.locals.user = null;
        res.cookie('jwt', '', { maxAge: 1 });
      }
      
      next();
    } catch (error) {
      res.locals.user = null;
      res.cookie('jwt', '', { maxAge: 1 });
      next();
    }
  } else {
    res.locals.user = null;
    next();
  }
};

module.exports = { authMiddleware, checkRole, checkUser };
