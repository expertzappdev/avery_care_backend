import jwt from 'jsonwebtoken';

// function for jwt signin
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

export default generateToken;