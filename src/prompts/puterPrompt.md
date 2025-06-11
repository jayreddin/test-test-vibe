# Puter App Development Guide

## Overview

This guide helps you develop applications using Puter.js, which provides cloud storage, authentication, and AI capabilities directly in your web applications.

## Key Puter.js Features

### Authentication

```javascript
// Check if user is signed in
const isSignedIn = await puter.auth.isSignedIn();

// Get current user
const user = await puter.auth.getUser();
console.log(`Hello, ${user.username}!`);

// Sign in
await puter.auth.signIn();

// Sign out
puter.auth.signOut();
```

### File System

```javascript
// Create a directory
await puter.fs.mkdir('/my-app-data');

// Write a file
await puter.fs.write('/my-app-data/config.json', JSON.stringify({version: '1.0.0'}));

// Read a file
const configBlob = await puter.fs.read('/my-app-data/config.json');
const configText = await configBlob.text();
const config = JSON.parse(configText);

// List directory contents
const files = await puter.fs.readdir('/my-app-data');
```

### AI Integration

```javascript
// Generate text using AI
const response = await puter.ai.chat('Explain what Puter.js is in one paragraph');
console.log(response.text);

// Analyze an image
const imageBlob = await puter.fs.read('/my-app-data/image.jpg');
const analysis = await puter.ai.analyzeImage(imageBlob);
```

## Sample Application Structure

A basic Puter.js application typically includes:

1. HTML structure with UI elements
2. CSS for styling
3. JavaScript for:
   - Puter.js initialization
   - Authentication handling
   - File operations
   - Application logic

## Best Practices

1. Always check if Puter.js is loaded before using it
2. Handle authentication states properly
3. Use try/catch blocks for error handling
4. Store application data in user's cloud storage
5. Implement proper loading states for asynchronous operations
6. Keep sensitive operations server-side when possible

## Example Starter Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Puter App</title>
  <link rel="stylesheet" href="styles.css">
  <script src="https://js.puter.com/v2/"></script>
</head>
<body>
  <header>
    <h1>My Puter App</h1>
    <div id="auth-section">
      <button id="auth-button">Sign In</button>
      <span id="user-info" style="display:none;">Welcome, <span id="username"></span>!</span>
    </div>
  </header>
  
  <main id="app-container">
    <div id="loading">Loading...</div>
    <div id="content" style="display:none;">
      <!-- App content goes here -->
    </div>
  </main>
  
  <script src="app.js"></script>
</body>
</html>
```

```javascript
// app.js
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize the app when Puter.js is ready
  if (typeof puter === 'undefined') {
    console.error('Puter.js not loaded');
    return;
  }
  
  const authButton = document.getElementById('auth-button');
  const userInfo = document.getElementById('user-info');
  const username = document.getElementById('username');
  const loading = document.getElementById('loading');
  const content = document.getElementById('content');
  
  // Check auth status
  const updateAuthUI = async () => {
    const isSignedIn = await puter.auth.isSignedIn();
    
    if (isSignedIn) {
      const user = await puter.auth.getUser();
      username.textContent = user.username;
      authButton.textContent = 'Sign Out';
      userInfo.style.display = 'inline';
    } else {
      authButton.textContent = 'Sign In';
      userInfo.style.display = 'none';
    }
  };
  
  // Auth button click handler
  authButton.addEventListener('click', async () => {
    const isSignedIn = await puter.auth.isSignedIn();
    
    if (isSignedIn) {
      await puter.auth.signOut();
    } else {
      await puter.auth.signIn();
    }
    
    updateAuthUI();
    initApp();
  });
  
  // Initialize app
  const initApp = async () => {
    loading.style.display = 'block';
    content.style.display = 'none';
    
    const isSignedIn = await puter.auth.isSignedIn();
    
    if (isSignedIn) {
      try {
        // Create app directory if it doesn't exist
        const appDir = '/my-puter-app-data';
        try {
          await puter.fs.mkdir(appDir);
        } catch (e) {
          // Directory might already exist
        }
        
        // Load user data or create default
        let userData;
        try {
          const userDataBlob = await puter.fs.read(`${appDir}/user-data.json`);
          userData = JSON.parse(await userDataBlob.text());
        } catch (e) {
          // Create default user data if file doesn't exist
          userData = { 
            createdAt: new Date().toISOString(),
            items: []
          };
          await puter.fs.write(`${appDir}/user-data.json`, JSON.stringify(userData));
        }
        
        // Update UI with user data
        content.innerHTML = `
          <h2>Your Items</h2>
          <ul id="items-list">
            ${userData.items.map(item => `<li>${item}</li>`).join('')}
          </ul>
          <div>
            <input id="new-item" type="text" placeholder="Add new item">
            <button id="add-item">Add</button>
          </div>
        `;
        
        // Add new item handler
        document.getElementById('add-item').addEventListener('click', async () => {
          const input = document.getElementById('new-item');
          const newItem = input.value.trim();
          
          if (newItem) {
            userData.items.push(newItem);
            await puter.fs.write(`${appDir}/user-data.json`, JSON.stringify(userData));
            
            const itemsList = document.getElementById('items-list');
            const li = document.createElement('li');
            li.textContent = newItem;
            itemsList.appendChild(li);
            
            input.value = '';
          }
        });
      } catch (error) {
        console.error('Error initializing app:', error);
        content.innerHTML = '<p>Error loading application data.</p>';
      }
    } else {
      content.innerHTML = '<p>Please sign in to use the app.</p>';
    }
    
    loading.style.display = 'none';
    content.style.display = 'block';
  };
  
  // Initialize
  await updateAuthUI();
  await initApp();
});
```

With this guide, you should be able to build a full-featured application that leverages Puter.js for cloud storage, authentication, and AI capabilities.