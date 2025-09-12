/**
 * @fileoverview Authentication module for JWT token generation and user login
 * @description Handles user authentication and JWT token generation for the myFlix API
 * @author Sourav Das
 * @version 1.0.0
 */

const jwtSecret = "your_jwt_secret"; // This has to be the same key used in the JWTStrategy

const jwt = require("jsonwebtoken"),
  passport = require("passport");

require("./passport"); // Your local passport file

/**
 * Generates a JWT token for authenticated users
 * @param {Object} user - User object containing user information
 * @param {string} user.Username - Username of the authenticated user
 * @returns {string} JWT token valid for 7 days
 */
let generateJWTToken = (user) => {
  return jwt.sign(user, jwtSecret, {
    subject: user.Username, // This is the username you're encoding in the JWT
    expiresIn: "7d", // This specifies that the token will expire in 7 days
    algorithm: "HS256", // This is the algorithm used to "sign" or encode the values of the JWT
  });
};

/**
 * User Login Endpoint
 * @description Authenticate user credentials and return JWT token
 * @function loginUser
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.Username - User's username
 * @param {string} req.body.Password - User's password
 * @param {Object} res - Express response object
 * @returns {Object} 200 - Success response with user data and JWT token
 * @returns {Object} 400 - Error response for invalid credentials
 * @example
 * // Request body:
 * {
 *   "Username": "johndoe",
 *   "Password": "securePassword123"
 * }
 * 
 * // Success Response:
 * {
 *   "user": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "Username": "johndoe",
 *     "Email": "john@example.com"
 *   },
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
module.exports = (router) => {
  router.post("/login", (req, res) => {
    passport.authenticate("local", { session: false }, (error, user, info) => {
      if (error || !user) {
        return res.status(400).json({
          message: "Something is not right",
          user: user,
        });
      }
      req.login(user, { session: false }, (error) => {
        if (error) {
          res.send(error);
        }
        let token = generateJWTToken(user.toJSON());
        return res.json({ user, token });
      });
    })(req, res);
  });
};
