# myFlix API Documentation

## Overview
The myFlix API is a RESTful web service that provides movie information and user management functionality. This API allows users to register, log in, browse movies, and manage their list of favorite movies.

## Features
- User registration and authentication
- JWT-based authorization
- Movie browsing and search
- User favorites management
- Input validation and error handling
- CORS-enabled for web applications

## Installation

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node Package Manager)
- MongoDB database (local or cloud-based like MongoDB Atlas)
- Git (for cloning the repository)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/souravdas090300/movieFlix_api.git
   cd movieFlix_api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables Setup**
   
   Create a `.env` file in the root directory and add the following environment variables:
   ```env
   CONNECTION_URI=your_mongodb_connection_string_here
   JWT_SECRET=your_jwt_secret_key_here
   PORT=8080
   ```
   
   **MongoDB Connection Options:**
   - **MongoDB Atlas**: `mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority&appName=Cluster0`
   - **Local MongoDB**: `mongodb://localhost:27017/myflix`
   
   **Important Security Note:** Never commit your actual database credentials to Git. Always use environment variables and add `.env` to your `.gitignore` file.

4. **Database Setup**
   
   Make sure your MongoDB database is running and accessible. The application will automatically connect using the CONNECTION_URI you provided.

5. **Security: Protect Your Environment Variables**
   
   Ensure your `.env` file is listed in `.gitignore` to prevent committing sensitive information:
   ```gitignore
   .env
   node_modules/
   ```

6. **Start the development server**
   ```bash
   npm start
   ```
   
   The API will be available at `http://localhost:8080`

7. **View API Documentation**
   
   Once the server is running, you can view the generated API documentation at:
   ```
   http://localhost:8080/documentation
   ```

### Optional: Populate Sample Data
If you want to populate your database with sample movie data, you can create a script or manually add movies through the API endpoints.

## Base URL

### Development
```
http://localhost:8080/
```

### Production
```
https://movie-flix-fb6c35ebba0a.herokuapp.com/
```

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer your-jwt-token
```

## API Endpoints

### Authentication
- `POST /login` - User login
- `POST /users` - User registration

### Movies
- `GET /movies` - Get all movies
- `GET /movies/:title` - Get movie by title
- `GET /movies/id/:id` - Get movie by ID
- `GET /genres` - Get all genres
- `GET /genres/:name` - Get genre by name
- `GET /directors/:name` - Get director information

### Users
- `GET /users` - Get all users (admin only)
- `GET /users/:username` - Get user by username
- `PUT /users/:username` - Update user information
- `DELETE /users/:username` - Delete user account
- `GET /users/:username/favorites` - Get user's favorite movies
- `POST /users/:username/movies/:movieId` - Add movie to favorites
- `DELETE /users/:username/movies/:movieId` - Remove movie from favorites

### Search
- `GET /search` - General search across multiple fields
- `GET /search/movies` - Search movies by title
- `GET /search/genres` - Search movies by genre
- `GET /search/directors` - Search movies by director
- `GET /search/actors` - Search movies by actor
- `GET /search/advanced` - Advanced search with multiple filters

## Error Handling
The API returns appropriate HTTP status codes and error messages:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

## Technology Stack
- Node.js
- Express.js
- MongoDB with Mongoose
- Passport.js for authentication
- bcrypt for password hashing
- express-validator for input validation
- CORS for cross-origin requests

## Deployment

### Heroku Deployment
This project is configured for easy deployment to Heroku:

1. **Create a Heroku app**
   ```bash
   heroku create your-app-name
   ```

2. **Set environment variables on Heroku**
   ```bash
   heroku config:set CONNECTION_URI=your_mongodb_connection_string
   heroku config:set JWT_SECRET=your_jwt_secret_key
   ```

3. **Deploy to Heroku**
   ```bash
   git push heroku main
   ```

### Environment Variables Required
- `CONNECTION_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT token generation
- `PORT` - Port number (automatically set by Heroku in production)

## Development

### Running in Development Mode
```bash
npm run dev
```

### Generating Documentation
To regenerate the API documentation:
```bash
npx jsdoc index.js auth.js -d out
```

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests (if available)
5. Submit a pull request
