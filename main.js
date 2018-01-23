const { app, BrowserWindow, globalShortcut, ipcMain, Menu, Tray } = require('electron');
const db = require('electron-db');
const path = require("path");
const Moniker = require("moniker");
const windowManager = require('electron-window-manager');

let BS_TrayIcon = null;

db.createTable('noteData', (succ, msg) => {
    console.log("[NDB] Note Database Initialization: " + msg);
});

app.on('ready', () => {
    // =====[+Helper Data+]=====
    function makeNote(nid = false, ncont = false) {
        // unique identifier for each note
        // IF NOTE EXISTS: Use the original identifier
        let identifier = nid || Moniker.choose();
        // placeholder data for each note
        // IF NOTE EXISTS: Use data that was previously in note;
        let noteContents = ncont || {
            "color": "#feff9c",
            "data": "Hello World!"
        }
    
        // create the new note window
        var newNote = windowManager.open(identifier, identifier, "/pages/base.html");
        // open window
        newNote.open();
        newNote.object.webContents.on('did-finish-load', () => {
            newNote.object.webContents.send('nm-set-name', identifier);
            newNote.object.webContents.send('nm-set-data', noteContents);
        });
        // newNote.toggleDevTools(true);
    
        console.log("[WDM] MakeNote() Executed")
    }

    global.nm = {
        "closing": false
    };
    // =====[-Helper Data-]=====

    // =====[+Window Manager+]=====
    // initialize the windowManager
    windowManager.init({
        windowsTitlePrefix: "BetterStickies - "
    });

    // set default BrowserWindow properties
    windowManager.setDefaultSetup({
        width: 550,
        height: 500,
        minWidth: 150,
        minHeight: 150,
        maximizable: false,
        closable: false,
        frame: false,
        fullscreen: false,
        fullscreenable: false,
        skipTaskbar: true,
        resizable: true,
        backgroundColor: "#000000"
    });

    console.log("[WDM] Window Manager Initialized")
    // =====[-Window Manager-]=====

    // =====[+Global Keyboard Shortcut Handlers+]=====
    // Register a 'Super+N' shortcut listener.
    const ret = globalShortcut.register('Super+N', () => {
        console.log('[GKB] Super+N is pressed');
        makeNote();
    })

    // log an error if the global shortcut couldn't be registered
    if (!ret) {
        console.error('[GKB] could not register global keybind!')
    }

    console.log("[GKB] Global Keybinds Initialized")
    // =====[-Global Keyboard Shortcut Handlers-]=====

    // =====[+Tray Icon+]=====
    BS_TrayIcon = new Tray(path.join(__dirname, 'images/icon.png'));
    const BS_TrayContext = Menu.buildFromTemplate([
        {
            label: 'Quit',
            click: () => {
                app.quit();
            }
        }
    ]);

    BS_TrayIcon.setContextMenu(BS_TrayContext);
    BS_TrayIcon.setToolTip("BetterStickies");

    BS_TrayIcon.on('click', (evt, bounds) => {
        console.log("[ICO] Clicked");
        Object.keys(windowManager.windows).forEach((wn) => {
            let wmo = windowManager.windows[wn];
            if (wmo.object != null) {
                wmo.focus();
            } else {
                delete windowManager.windows[wn];
            }
        });
    });
    console.log("[ICO] Tray Icon Initialized");
    // =====[-Tray Icon-]=====

    // =====[+IPC Communication+]=====
    ipcMain.on('nm-make-note', (event, arg) => {
        console.log("[IPC] NM-Make-Note Recieved");
        makeNote();
    });

    ipcMain.on('nm-delete-note', (event, arg) => {
        console.log("[IPC] NM-Delete-Note Recieved");
        db.deleteRow('noteData', {'nid': arg}, (succ, msg) => {
            console.log("[NDB] " + msg);
        });
        windowManager.windows[arg].object.destroy();
    });

    ipcMain.on('nm-save-note', (event, arg) => {
        console.log("[IPC] NM-Save-Note Recieved");
        db.insertTableContent('noteData', arg, (succ, msg) => {
            console.log("[NDB] " + msg);
            event.returnValue = succ;
        });
        windowManager.windows[arg].object.destroy();
    });

    console.log("[IPC] Inter-Process-Communication Initialized");
    // =====[-IPC Communication-]=====

    // =====[+Load Data+]=====
    makeNote();
    // =====[-Load Data-]=====
});

app.on('before-quit', () => {
    console.log("[APP] ***EXIT INITIATED***")
    Object.keys(windowManager.windows).forEach((wn) => {
        let wmo = windowManager.windows[wn];
        if (wmo.object != null) {
            wmo.object.webContents.send('nm-exit');
        }
    });
});

app.on('will-quit', () => {
    console.log("[APP] Have a nice day!");
    // Unregister all shortcuts
    globalShortcut.unregisterAll()
});