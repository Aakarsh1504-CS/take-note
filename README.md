# Personal Note Taking App

Welcome to the Personal Note Taking App! This application allows users to register, log in, and manage their personal notes in a secure and user-friendly environment.

## Features

- **User Registration**: Create an account with your email, name, and password.
- **User Login**: Authenticate using your email and password.
- **Create Notes**: Add new notes with a title and content.
- **View Notes**: Access all your notes from your profile.
- **Edit Notes**: Update the title and content of your notes.
- **Delete Notes**: Remove notes you no longer need.

## Live Application

You can access the live application [here](https://mynote-vv6z.onrender.com/). The app is fully deployed and ready for use.

## Usage

### Register

1. Navigate to the registration page.
2. Fill in your email, name, and password.
3. Click the register button.

### Login

1. Navigate to the login page.
2. Enter your email and password.
3. Click the login button.

### Create Note

1. Once logged in, go to your profile page.
2. Use the note creation form to add a new note.

### View Notes

1. On your profile page, you can see a list of your notes.
2. Click on a note to view its details.

### Edit Note

1. On the note detail page, click the edit button.
2. Update the title and/or content of the note.
3. Save the changes.

### Delete Note

1. On the note detail page, click the delete button to remove the note.

## Code Overview

### `app.js`

- Sets up the Express application and middleware.
- Defines routes for registration, login, note management, and profile access.
- Includes authentication and authorization logic using JSON Web Tokens (JWT).

### `user.js`

- Defines the user schema and model using Mongoose.
- Establishes a MongoDB connection using environment variables.

### `post.js`

- Defines the post (note) schema and model using Mongoose.
- Associates posts with user accounts.
---

Thank you for using the Personal Note Taking App! If you have any questions or feedback, please reach out->[LinkedIn](https://www.linkedin.com/in/aakarsh-arora-b3965822b/)
