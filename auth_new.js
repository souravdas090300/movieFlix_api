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
 * @api {post} /login User Login
 * @apiName LoginUser
 * @apiGroup Authentication
 * @apiDescription Authenticate user credentials and return JWT token
 * @apiPermission none
 * 
 * @apiBody {String} Username User's username
 * @apiBody {String} Password User's password
 * 
 * @apiSuccess {Object} user User information
 * @apiSuccess {String} user._id User ID
 * @apiSuccess {String} user.Username Username
 * @apiSuccess {String} user.Email User email
 * @apiSuccess {String} token JWT authentication token
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "user": {
 *         "_id": "507f1f77bcf86cd799439011",
 *         "Username": "johndoe",
 *         "Email": "john@example.com"
 *       },
 *       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     }
 * 
 * @apiError (400) BadRequest Invalid credentials
 * 
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message": "Something is not right",
 *       "user": false
 *     }
 * 
 * @example
 * // POST /login
 * curl -X POST "https://movie-flix.herokuapp.com/login" \
 *      -H "Content-Type: application/json" \
 *      -d '{
 *        "Username": "johndoe",
 *        "Password": "securePassword123"
 *      }'
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
