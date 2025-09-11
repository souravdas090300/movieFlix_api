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

## Base URL
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
