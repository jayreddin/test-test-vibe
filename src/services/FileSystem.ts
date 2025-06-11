import { FileData } from '../atoms';

export class FileSystem {
  static PROJECT_DIR = 'vibe-code-projects';

  // Initialize the project directory in Puter cloud
  static async initProjectDirectory() {
    try {
      // Check if the project directory exists, create if not
      const dirExists = await this.checkIfDirExists(this.PROJECT_DIR);
      
      if (!dirExists) {
        // Use correct puter.fs.mkdir with createMissingParents option
        await window.puter.fs.mkdir(this.PROJECT_DIR, { createMissingParents: true });
        console.log(`Created project directory: ${this.PROJECT_DIR}`);
      }
    } catch (error) {
      console.error('Error initializing project directory:', error);
    }
  }

  // Create a new project directory
  static async createProject(projectName: string) {
    try {
      const projectPath = `${this.PROJECT_DIR}/${projectName}`;
      const dirExists = await this.checkIfDirExists(projectPath);
      
      if (!dirExists) {
        // Use correct puter.fs.mkdir with createMissingParents option
        await window.puter.fs.mkdir(projectPath, { createMissingParents: true });
        console.log(`Created project: ${projectPath}`);
        return projectPath;
      } else {
        console.log(`Project ${projectName} already exists`);
        return projectPath;
      }
    } catch (error) {
      console.error('Error creating project:', error);
      return null;
    }
  }
  
  // Create a template project
  static async createTemplateProject(projectName: string, templateType: string) {
    try {
      const projectPath = await this.createProject(projectName);
      if (!projectPath) return null;
      
      // Create template files based on template type
      if (templateType === 'Puter App') {
        // Create Puter app template files using correct puter.fs.write
        await this.saveFile(`${projectPath}/index.html`, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <link rel="stylesheet" href="styles.css">
  <script src="https://js.puter.com/v2/"></script>
</head>
<body>
  <header>
    <h1>${projectName}</h1>
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
  
  <script src="index.js"></script>
</body>
</html>`);

        await this.saveFile(`${projectPath}/styles.css`, `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Arial', sans-serif;
  line-height: 1.6;
  color: #333;
  margin: 0;
  padding: 20px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

button {
  background-color: #4285f4;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background-color: #3367d6;
}

input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 8px;
}

#app-container {
  max-width: 800px;
  margin: 0 auto;
}

ul {
  list-style: inside;
  margin: 20px 0;
}

li {
  margin-bottom: 8px;
  padding: 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.error {
  color: #d32f2f;
  margin: 20px 0;
  padding: 10px;
  background-color: #ffebee;
  border-radius: 4px;
}`);

        await this.saveFile(`${projectPath}/index.js`, `// Initialize the app when Puter.js is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Check if Puter.js is loaded
  if (typeof puter === 'undefined') {
    console.error('Puter.js not loaded');
    showError('Puter.js failed to load. Please refresh the page.');
    return;
  }
  
  const authButton = document.getElementById('auth-button');
  const userInfo = document.getElementById('user-info');
  const username = document.getElementById('username');
  const loading = document.getElementById('loading');
  const content = document.getElementById('content');
  
  // Check auth status and update UI
  const updateAuthUI = async () => {
    const isSignedIn = puter.auth.isSignedIn();
    
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
    const isSignedIn = puter.auth.isSignedIn();
    
    if (isSignedIn) {
      puter.auth.signOut();
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
    
    const isSignedIn = puter.auth.isSignedIn();
    
    if (isSignedIn) {
      try {
        // Create app directory if it doesn't exist
        const appDir = '/${projectName}-data';
        try {
          await puter.fs.mkdir(appDir, { createMissingParents: true });
        } catch (e) {
          // Directory might already exist
        }
        
        // Load user data or create default
        let userData;
        try {
          const userDataBlob = await puter.fs.read(\`\${appDir}/user-data.json\`);
          userData = JSON.parse(await userDataBlob.text());
        } catch (e) {
          // Create default user data if file doesn't exist
          userData = { 
            createdAt: new Date().toISOString(),
            items: ['Sample item 1', 'Sample item 2']
          };
          await puter.fs.write(\`\${appDir}/user-data.json\`, JSON.stringify(userData), { createMissingParents: true });
        }
        
        // Update UI with user data
        content.innerHTML = \`
          <h2>Your Items</h2>
          <ul id="items-list">
            \${userData.items.map(item => \`<li>\${item}</li>\`).join('')}
          </ul>
          <div>
            <input id="new-item" type="text" placeholder="Add new item">
            <button id="add-item">Add</button>
          </div>
        \`;
        
        // Add new item handler
        document.getElementById('add-item').addEventListener('click', async () => {
          const input = document.getElementById('new-item');
          const newItem = input.value.trim();
          
          if (newItem) {
            userData.items.push(newItem);
            await puter.fs.write(\`\${appDir}/user-data.json\`, JSON.stringify(userData), { overwrite: true });
            
            const itemsList = document.getElementById('items-list');
            const li = document.createElement('li');
            li.textContent = newItem;
            itemsList.appendChild(li);
            
            input.value = '';
          }
        });
      } catch (error) {
        console.error('Error initializing app:', error);
        content.innerHTML = '<p class="error">Error loading application data.</p>';
      }
    } else {
      content.innerHTML = '<p>Please sign in to use the app.</p>';
    }
    
    loading.style.display = 'none';
    content.style.display = 'block';
  };
  
  // Helper function to show errors
  function showError(message) {
    const errorElement = document.createElement('p');
    errorElement.className = 'error';
    errorElement.textContent = message;
    document.getElementById('app-container').appendChild(errorElement);
  }
  
  // Initialize
  await updateAuthUI();
  await initApp();
});`);

        console.log(`Created Puter App template in: ${projectPath}`);
      } else if (templateType === 'React App') {
        // Create React app template
        // (Implementation would go here)
      } else if (templateType === 'Landing Page') {
        // Create Landing page template
        // (Implementation would go here)
      } else {
        // Default empty project
        await this.saveFile(`${projectPath}/index.html`, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app"></div>
  <script src="index.js"></script>
</body>
</html>`);

        await this.saveFile(`${projectPath}/styles.css`, `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}`);

        await this.saveFile(`${projectPath}/index.js`, `document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  app.innerHTML = '<h1>${projectName}</h1><p>This is a blank project.</p>';
});`);
      }
      
      return projectPath;
    } catch (error) {
      console.error('Error creating template project:', error);
      return null;
    }
  }

  // Save a file to Puter cloud
  static async saveFile(path: string, content: string) {
    try {
      // Use correct puter.fs.write with createMissingParents option
      await window.puter.fs.write(path, content, { createMissingParents: true, overwrite: true });
      console.log(`Saved file: ${path}`);
      return true;
    } catch (error) {
      console.error('Error saving file:', error);
      return false;
    }
  }

  // Load a file from Puter cloud
  static async loadFile(path: string): Promise<string | null> {
    try {
      // Use correct puter.fs.read which returns a Blob
      const blob = await window.puter.fs.read(path);
      const content = await blob.text();
      return content;
    } catch (error) {
      console.error('Error loading file:', error);
      return null;
    }
  }

  // Load all files in a project
  static async loadProjectFiles(projectName: string): Promise<FileData[]> {
    try {
      const projectPath = `${this.PROJECT_DIR}/${projectName}`;
      const dirExists = await this.checkIfDirExists(projectPath);
      
      if (!dirExists) {
        console.error(`Project ${projectName} does not exist`);
        return [];
      }
      
      // Use correct puter.fs.readdir which returns an array of fsitem objects
      const files = await window.puter.fs.readdir(projectPath);
      const fileData: FileData[] = [];
      
      for (const file of files) {
        if (!file.is_dir) {
          const content = await this.loadFile(file.path);
          const extension = file.name.split('.').pop() || '';
          
          let language = 'plaintext';
          if (extension === 'js') language = 'javascript';
          else if (extension === 'html') language = 'html';
          else if (extension === 'css') language = 'css';
          else if (extension === 'json') language = 'json';
          
          fileData.push({
            name: file.name,
            content: content || '',
            language,
            path: file.path
          });
        }
      }
      
      return fileData;
    } catch (error) {
      console.error('Error loading project files:', error);
      return [];
    }
  }

  // Check if a directory exists using puter.fs.stat
  static async checkIfDirExists(path: string): Promise<boolean> {
    try {
      // Use correct puter.fs.stat which returns an fsitem object
      const stat = await window.puter.fs.stat(path);
      return stat.is_dir;
    } catch (error) {
      return false;
    }
  }

  // Create a checkpoint (save the current state of all files)
  static async createCheckpoint(projectName: string, checkpointName: string, files: FileData[]) {
    try {
      const checkpointPath = `${this.PROJECT_DIR}/${projectName}/checkpoints/${checkpointName}`;
      await window.puter.fs.mkdir(checkpointPath, { createMissingParents: true });
      
      for (const file of files) {
        await this.saveFile(`${checkpointPath}/${file.name}`, file.content);
      }
      
      console.log(`Created checkpoint: ${checkpointPath}`);
      return checkpointPath;
    } catch (error) {
      console.error('Error creating checkpoint:', error);
      return null;
    }
  }

  // List all checkpoints for a project
  static async listCheckpoints(projectName: string) {
    try {
      const checkpointsPath = `${this.PROJECT_DIR}/${projectName}/checkpoints`;
      const dirExists = await this.checkIfDirExists(checkpointsPath);
      
      if (!dirExists) {
        return [];
      }
      
      // Use correct puter.fs.readdir which returns an array of fsitem objects
      const checkpoints = await window.puter.fs.readdir(checkpointsPath);
      return checkpoints.filter((item: any) => item.is_dir);
    } catch (error) {
      console.error('Error listing checkpoints:', error);
      return [];
    }
  }
}