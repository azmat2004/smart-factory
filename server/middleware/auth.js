const jwt = require('jsonwebtoken');
const JWT_SECRET = 'smart_factory_jwt_secret_key_2024';

function authMiddleware(req, res, next) {
  // 开发模式：模拟登录用户
  if (!req.headers.authorization) {
    req.user = { id: 1, userName: 'admin', realName: '管理员', roleId: 1, factoryId: 1 };
    req.factoryId = 1;
    return next();
  }

  const token = req.headers.authorization.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.factoryId = decoded.factoryId;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', msg: '登录已过期，请重新登录' });
  }
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, userName: user.user_name, realName: user.user_real_name, roleId: user.role_id, factoryId: user.factory_id },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = { authMiddleware, generateToken, JWT_SECRET };
