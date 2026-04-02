const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const sudo = require('sudo-prompt');
const { exec } = require('child_process');

let mainWindow;
let tray = null;
let isQuitting = false;

// কাস্টম ব্লক লিস্ট মেমোরিতে রাখা
let customBlockedSites = [];
let customBlockedApps = [];
let appKillerInterval = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 950,
    height: 750,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

app.whenReady().then(() => {
  createWindow();
  tray = new Tray(path.join(__dirname, 'icon.ico'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Blocker X Premium', click: () => mainWindow.show() },
    { label: 'Quit (Requires Password)', click: () => {
        mainWindow.show();
        mainWindow.webContents.send('ask-password-for-quit');
      }
    }
  ]);
  tray.setToolTip('Blocker X Premium is actively guarding...');
  tray.setContextMenu(contextMenu);
});

// কাস্টম ডেটা রিসিভ করা
ipcMain.on('add-custom-data', (event, data) => {
  if (data.type === 'site' && !customBlockedSites.includes(data.value)) {
    customBlockedSites.push(data.value);
  } else if (data.type === 'app' && !customBlockedApps.includes(data.value)) {
    // .exe যুক্ত না থাকলে করে নেওয়া
    let appName = data.value.toLowerCase();
    if (!appName.endsWith('.exe')) appName += '.exe';
    customBlockedApps.push(appName);
  }
});

// মেইন প্রটেকশন চালু করা
ipcMain.on('activate-protection', (event) => {
  const hostsPath = 'C:\\Windows\\System32\\drivers\\etc\\hosts';
  
  // ডিফল্ট অ্যাডাল্ট সাইটের সাথে কাস্টম সাইট যুক্ত করা
  let blockListArray = [
    '127.0.0.1 pornhub.com',
    '127.0.0.1 www.pornhub.com'
  ];

  customBlockedSites.forEach(site => {
    blockListArray.push(`127.0.0.1 ${site}`);
    blockListArray.push(`127.0.0.1 www.${site}`);
  });

  const blockListText = blockListArray.join('\n');
  const options = { name: 'Blocker X Premium' };

  // ওয়েবসাইট ব্লক করার জন্য Hosts এডিট
  sudo.exec(`echo ${blockListText} >> ${hostsPath}`, options, (error) => {
    if (error) {
      event.reply('status', 'Error: Admin Permission Required!');
    } else {
      event.reply('status', 'Premium Protection Activated Successfully!');
      
      // অ্যাপ ব্লকার (Process Killer) চালু করা
      if (appKillerInterval) clearInterval(appKillerInterval);
      
      appKillerInterval = setInterval(() => {
        customBlockedApps.forEach(appName => {
          // ব্যাকগ্রাউন্ডে ওই অ্যাপটি খুঁজবে এবং পেলে ফোর্স ক্লোজ করে দেবে
          exec(`taskkill /F /IM ${appName}`, (err) => {
             // এরর ইগনোর করা, কারণ অ্যাপ চালু না থাকলে এরর দেখাবে
          });
        });
      }, 2000); // প্রতি ২ সেকেন্ড পর পর চেক করবে
    }
  });
});

ipcMain.on('really-quit', () => {
  isQuitting = true;
  if(appKillerInterval) clearInterval(appKillerInterval);
  app.quit();
});
