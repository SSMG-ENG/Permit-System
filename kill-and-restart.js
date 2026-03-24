const { spawn } = require('child_process');
const os = require('os');

// Kill existing process
const killCmd = 'taskkill /PID 32556 /F';
const child = spawn('cmd.exe', ['/c', killCmd]);

child.on('close', (code) => {
  console.log(`Kill command exited with code ${code}`);
  setTimeout(() => {
    console.log('Starting new server...');
    spawn('node', ['server.js'], { cwd: 'c:\\permit-system', stdio: 'inherit' });
  }, 1000);
});

child.on('error', (err) => {
  console.error('Error running kill command:', err);
  // Try to start server anyway
  setTimeout(() => {
    console.log('Attempting to start server...');
    spawn('node', ['server.js'], { cwd: 'c:\\permit-system', stdio: 'inherit' });
  }, 1000);
});
