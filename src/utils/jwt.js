import jwt from 'jsonwebtoken';

// function for jwt signin
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d', // Token will expire in after 7 days
  });
};

export default generateToken;