// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron')
const path = require('path')
const url = require('url')
//const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
// const isDev = require('electron-is-dev');

// const sendkeys = require('sendkeys-js');
// // for win
// sendkeys.send('{f8}')


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let splashScreen;
let autoUpdateScreen;

let GlobalIsRemoteProctoringExamStarted = false;
let GlobalSetIntervalForScreenForeground;

//log.transports.file.level = 'info';
// autoUpdater.logger = log;

//log.catchErrors(options = {});

//let GetAllExamKeys = require('./Main/main-GetAllExamKeys');


// try {
//   console.log('Trying to set process.env.GOOGLE_API_KEY');
//   GetAllExamKeys(function (APIKeysJson) {
//     if (APIKeysJson !== "error") {
//       process.env.GOOGLE_API_KEY = APIKeysJson.GoogleAPIKey;
//       console.log('SET process.env.GOOGLE_API_KEY');

//     }
//     else {
//       console.log('Unable to set process.env.GOOGLE_API_KEY');
//     }
//   });
// }
// catch (e) {
//   console.log(e);
// }
process.env.GOOGLE_API_KEY = 'AIzaSyD3oAgJlrzYiIFJMmID9BXyuOLGqvAGJog';

var child = require('child_process').execFile;
//var executablePath = "DiableWinKey-WinFormsApp.exe";

var executablePath = __dirname.replace('app.asar', 'app.asar.unpacked') + '\\DiableWinKey-WinFormsApp.exe';

var childProcess = child(executablePath, function (err, data) {
  if (err) {
    console.error(err);
    return;
  }

  console.log(data.toString());
});


function createWindow() {
  //Check if the Google API key has been retrieved in process for Geo location before opening any window:


  //Craete the Splash Screen:
  createSplashScreen();
  //createAutoUpdateScreen();
  //initUpdater();
  // Create the browser window.
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: true,
      webSecurity: false,
      plugins: true
    }, kiosk: true, show: false
  });
  mainWindow.setMenuBarVisibility(false);
  globalShortcut.register('Control+X+D+E', () => {
    mainWindow.webContents.openDevTools();
  });
  // globalShortcut.register('Win', () => {
  //   if(mainWindow){
  //     mainWindow.show();
  //   mainWindow.setAlwaysOnTop(true);
  //   mainWindow.webContents.focus();

  //   mainWindow.restore();
  //   mainWindow.focus();
  //   mainWindow.setKiosk(true);
  //   }

  // });

  // remove 'x-frame-options' header to allow embedding external pages into an 'iframe'
  console.log('starting...')
  // mainWindow.webContents.session.webRequest.onHeadersReceived({}, (details, callback) => {
  //   console.log('Stringifying...');
  //   console.log(JSON.stringify(details));
  //   if (details.responseHeaders['x-frame-options']) {
  //     delete details.responseHeaders['x-frame-options'];
  //   }
  //   if (details.responseHeaders['X-Frame-Options']) {
  //     delete details.responseHeaders['X-Frame-Options'];
  //   }
  //   callback({ cancel: false, responseHeaders: details.responseHeaders });
  // });

  // mainWindow.webContents.session.webRequest.onHeadersReceived({}, (detail, callback) => {
  //   const xFrameOriginKey = Object.keys(detail.responseHeaders).find(header => String(header).match(/^x-frame-options$/i));
  //   if (xFrameOriginKey) {
  //     delete detail.responseHeaders[xFrameOriginKey];
  //   }
  //   callback({ cancel: false, responseHeaders: detail.responseHeaders });
  // });


  // and load the index.html of the app.npm start
  //mainWindow.loadFile('index.html')
  mainWindow.loadURL(url.format({
    //pathname: path.join(__dirname, 'Monarch', 'production', 'custom-pages', 'login.html'),
    pathname: path.join(__dirname, 'Monarch', 'production', 'custom-pages', 'schoolguru-login.html'),
    protocol: 'file:',
    slashes: true
  }));

  //The following line was commented bec it caused the recordings screen to come black in admin dashboard:
  //mainWindow.setContentProtection(true);


  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  });

  mainWindow.setMenu(null)
  mainWindow.maximize();
  mainWindow.setResizable(false)
  mainWindow.setMinimizable(false)

  mainWindow.setMenuBarVisibility(false);


  //mainWindow.webContents.focus();
  mainWindow.setAlwaysOnTop(true);

  mainWindow.webContents.on('crashed', event => {
    log.info(`Browser Window "${this.name}" crashed: ${event}`);
  });

  ShowLoginScreen();

  // mainWindow.once('ready-to-show', () => {
  //   if (splashScreen && splashScreen.isVisible()) {
  //     splashScreen.destroy();
  //     splashScreen = null;
  //     //autoUpdater.checkForUpdates();
  //   }
  // });
}

//The following line allows the parent to access the iframe elements from javascript
app.commandLine.appendSwitch('disable-site-isolation-trials');

//pendSwitch('ppapi-flash-path', path.join(__dirname, 'pepflashplayer.dll'))
//app.commandLine.appendSwitch('ppapi-flash-path', path.join((__dirname.includes(".asar") ? process.resourcesPath : __dirname), 'pepflashplayer.dll'))

app.commandLine.appendSwitch('ppapi-flash-path', __dirname.replace('app.asar', 'app.asar.unpacked') + '\\pepflashplayer.dll')

// Optional: Specify flash version, for example, v17.0.0.169
app.commandLine.appendSwitch('ppapi-flash-version', '32.0.0.403');


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)


// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  var executablePathQuit = __dirname.replace('app.asar', 'app.asar.unpacked') + '\\DiableWinKey-WinFormsApp-DisableRestrictions.exe';

  child(executablePathQuit, function (err, data) {
    if (err) {
      console.error(err);
      return;
    }

    console.log(data.toString());

    //Quit the child process:
    //childProcess.kill();



  });

  setTimeout(function () {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  }, 200)
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

ipcMain.on('close:application', (event, bool) => {
  // app.quit();
  var executablePathQuit = __dirname.replace('app.asar', 'app.asar.unpacked') + '\\DiableWinKey-WinFormsApp-DisableRestrictions.exe';

  child(executablePathQuit, function (err, data) {
    if (err) {
      console.error(err);
      return;
    }

    console.log(data.toString());

    //Quit the child process:
    //childProcess.kill();



  });

  setTimeout(function () {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  }, 200)
});

let date_ob = new Date();
// adjust 0 before single digit date
let date = ("0" + date_ob.getDate()).slice(-2);
// current month
let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
// current year
let year = date_ob.getFullYear();
// current hours
let hours = date_ob.getHours();
// current minutes
let minutes = date_ob.getMinutes();
// current seconds
let seconds = date_ob.getSeconds();
// prints date & time in YYYY-MM-DD HH:MM:SS format
log.info('Launched on: ' + year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds);
app.on('renderer-process-crashed', function (event) {
  log.info('renderer-process-crashed: ' + event);
});
app.on('renderer-process-gone', function (event) {
  log.info('renderer-process-gone: ' + event);
});
app.on('gpu-process-crashed', function (event) {
  log.info('gpu-process-crashed: ' + event);
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.



const countdown = require('./Main//main-countdown');
ipcMain.on('timer:start', (event, DurationInMinutes) => {
  countdown(DurationInMinutes, count => {
    //if (count) { //To prevent an exception from being thrown when application is shut and count is null
    if (mainWindow) {
      mainWindow.webContents.send('timer:count', count);
    }
    //}
  });
});

// ipcMain.on('application:minimise', (event, a) => {

// });

function createSplashScreen() {
  splashScreen = new BrowserWindow({
    width: 366,
    height: 200,
    titleBarStyle: 'hidden',
    setAlwaysOnTop: true,
    closable: false,
    skipTaskbar: true,
    show: true,
    minimizable: false,
    maximizable: false,
    center: true,
    frame: false
  });
  splashScreen.loadURL(url.format({
    pathname: path.join(__dirname, 'includes', 'images', 'SplashScreen.png'),
    protocol: 'file:',
    slashes: true,
    show: true
  }));
}

function createAutoUpdateScreen() {
  autoUpdateScreen = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true
    },
    width: 400,
    height: 160,
    titleBarStyle: 'hidden',
    setAlwaysOnTop: true,
    closable: false,
    skipTaskbar: true,
    show: false,
    minimizable: false,
    maximizable: false,
    center: true,
    frame: false
  });

  autoUpdateScreen.once('ready-to-show', () => {
    if (splashScreen && splashScreen.isVisible()) {
      splashScreen.destroy();
      splashScreen = null;

    }

  });

  autoUpdateScreen.loadURL(url.format({
    pathname: path.join(__dirname, 'Monarch', 'production', 'custom-pages', 'auto-update.html'),
    protocol: 'file:',
    slashes: true,
    show: true
  }));
}

function initUpdater() {
  //The following was added as auto updates wa snot working:
  ShowLoginScreen();
  // autoUpdater.on('checking-for-update', () => {
  //   log.info('Checking for update...');
  //   if (splashScreen && splashScreen.isVisible()) {
  //     splashScreen.destroy();
  //     splashScreen = null;
  //   }
  //   autoUpdateScreen.show();
  //   autoUpdateScreen.webContents.send('autoupadate:status', 'Checking for updates ...');
  //   log.info('Checking for update...DONE');

  // })
  //The following was commented as uto updates was not working:
  // autoUpdater.on('update-available', (info) => {
  //   log.info('Update available.', info);
  //   autoUpdateScreen.webContents.send('autoupadate:status', 'Updates available.');
  // })
  // autoUpdater.on('update-not-available', (info) => {
  //   log.info('Update not available.', info);
  //   autoUpdateScreen.webContents.send('autoupadate:status', 'Updates not available.');
  //   ShowLoginScreen();
  // })
  // autoUpdater.on('error', (err) => {
  //   log.info('Error in auto-updater.', err);
  //   autoUpdateScreen.webContents.send('autoupadate:status', 'Unable to check for updates');
  //   ShowLoginScreen();
  // })
  // autoUpdater.on('download-progress', (progressObj) => {
  //   let log_message = "Download speed: " + progressObj.bytesPerSecond
  //   log_message = log_message + ' - Downloaded ' + progressObj.percent + '%'
  //   log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')'
  //   log.info(log_message)
  //   autoUpdateScreen.webContents.send('autoupadate:status', 'Updating...');
  //   autoUpdateScreen.webContents.send('autoupadate:percent', progressObj.percent);
  // })
  // autoUpdater.on('update-downloaded', (info) => {
  //   log.info('Update downloaded; will install in 5 seconds', info);
  //   autoUpdateScreen.webContents.send('autoupadate:status', 'Completed Updates.');
  //   autoUpdater.quitAndInstall();
  // });
}

function ShowLoginScreen() {
  log.info('IN ShowLoginScreen()');
  mainWindow.on('ready-to-show', () => {
    if (splashScreen && splashScreen.isVisible()) {
      splashScreen.destroy();
      splashScreen = null;
    }
    if (autoUpdateScreen && autoUpdateScreen.isVisible()) {
      autoUpdateScreen.destroy();
      autoUpdateScreen = null;
    }
    setTimeout(function () {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true);
        //mainWindow.webContents.focus();

        mainWindow.restore();
        mainWindow.focus();
        mainWindow.setKiosk(true);
      }
    }, 3000);

    if (!mainWindow.isVisible()) {
      mainWindow.show();
      //mainWindow.webContents.focus();
      mainWindow.setAlwaysOnTop(true);

      mainWindow.restore();
      mainWindow.focus();
      mainWindow.setKiosk(true);

      mainWindow.on('blur', () => {
        //The following is used to prevent Windows + D minimization
        console.log('blur event fired for windows D');
        
        mainWindow.minimize();
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true);
        //mainWindow.webContents.focus();

        mainWindow.restore();
        mainWindow.focus();
        mainWindow.setKiosk(true);
      });
    }
    else {
      mainWindow.show();
      mainWindow.setAlwaysOnTop(true);
      //mainWindow.webContents.focus();

      mainWindow.restore();
      mainWindow.focus();
      mainWindow.setKiosk(true);

      mainWindow.on('blur', () => {
        //The following is used to prevent Windows + D minimization
        console.log('blur event fired for windows D');
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true);
        //mainWindow.webContents.focus();

        mainWindow.restore();
        mainWindow.focus();
        mainWindow.setKiosk(true);
      });
    }
    ipcMain.on('blur:application', (event, bool) => {
      console.log('blur event fired for windows D (blur:application)');
      if (GlobalIsRemoteProctoringExamStarted) {
        setTimeout(function () {
          console.log('Getting back to focus in 1.5 seconds');
          if (mainWindow) {
            mainWindow.show();
            mainWindow.setAlwaysOnTop(true);
            //mainWindow.webContents.focus();

            mainWindow.restore();
            mainWindow.focus();
            mainWindow.setKiosk(true);
          }

        }, 1500);
      }
    });
    ipcMain.on('SetRemoteProctoringExamStartedTrue:application', (event, bool) => {
      GlobalIsRemoteProctoringExamStarted = true;
      SetIntervalForScreenForeground();
      console.log('GlobalIsRemoteProctoringExamStarted = true;');
    });
    ipcMain.on('SetRemoteProctoringExamStartedFalse:application', (event, bool) => {
      GlobalIsRemoteProctoringExamStarted = false;
      clearInterval(GlobalSetIntervalForScreenForeground);
      GlobalSetIntervalForScreenForeground = undefined;
      console.log('GlobalIsRemoteProctoringExamStarted = false;');
    });
  });
  function SetIntervalForScreenForeground() {
    if (GlobalSetIntervalForScreenForeground === undefined) {
      GlobalSetIntervalForScreenForeground = setInterval(function () {
        console.log('Getting back to focus in 1.5 seconds by setinterval');
        if (mainWindow) {
          mainWindow.show();
          mainWindow.setAlwaysOnTop(true);
          //mainWindow.webContents.focus();

          mainWindow.restore();
          mainWindow.focus();
          mainWindow.setKiosk(true);
        }

      }, 1500);

    }
  }
}