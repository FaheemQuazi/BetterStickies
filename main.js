const { app, BrowserWindow, globalShortcut, ipcMain, Menu, Tray } = require('electron');
const path = require("path");
const url = require("url");
const fs = require("fs");
const Moniker = require("moniker");
const windowManager = require('electron-window-manager');

let BS_TrayIcon = null;

var BS_noteData = {};
let BS_noteDataPath = path.join(__dirname, "userData/noteData.json")
if (fs.existsSync(BS_noteDataPath)) {
    BS_noteData = JSON.parse(fs.readFileSync(BS_noteDataPath));
}

app.on('ready', () => {
    // =====[+Helper Data+]=====
    function makeNote(nid = false, ncont = "Default Note", npos = [785, 350], ncolor = "#feff9c") {
        // unique identifier for each note
        // IF NOTE EXISTS: Use the original identifier
        let identifier = nid || Moniker.choose();

        // placeholder data for each note
        // IF NOTE EXISTS: Use data that was previously in note;
        let noteContents = {
            "color": ncolor,
            "data": ncont
        }
    
        // create the new note window
        var newNote = windowManager.open(identifier, identifier, url.format({
            pathname: path.join(__dirname, '/pages/base.html'),
            protocol: 'file:',
            slashes: 'true'
        }));
        newNote.object.hide();
        newNote.move(npos[0], npos[1]);

        newNote.object.webContents.on('did-finish-load', () => {
            newNote.object.webContents.send('nm-set-name', identifier);
            newNote.object.webContents.send('nm-set-data', noteContents);
            newNote.object.show();
        });
        // newNote.toggleDevTools(true);
    
        console.log("[WDM] MakeNote() Executed")
    }
    // =====[-Helper Data-]=====

    // =====[+Window Manager+]=====
    // initialize the windowManager
    windowManager.init({
        windowsTitlePrefix: "BetterStickies - "
    });

    // set default BrowserWindow properties
    windowManager.setDefaultSetup({
        width: 350,
        height: 350,
        minWidth: 225,
        minHeight: 225,
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
            label: 'Show Stickies',
            click: () => {
                console.log("[ICO] Clicked");
                Object.keys(windowManager.windows).forEach((wn) => {
                    let wmo = windowManager.windows[wn];
                    if (wmo.object != null) {
                        wmo.focus();
                    } else {
                        delete windowManager.windows[wn];
                    }
                });
            }
        },
        {
            type: 'separator'
        },
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
        delete BS_noteData[arg];
        windowManager.windows[arg].object.destroy();
    });

    ipcMain.on('nm-save-note', (event, arg) => {
        console.log("[IPC] NM-Save-Note Recieved");
        BS_noteData[arg.nid] = {
            "data": arg.ndata,
            "pos": windowManager.windows[arg.nid].object.getPosition()
        }
        event.returnValue = true;
    });

    console.log("[IPC] Inter-Process-Communication Initialized");
    // =====[-IPC Communication-]=====

    // =====[+Load Data+]=====
    var notes = Object.keys(BS_noteData);
    console.log(notes.length, notes);
    if (notes.length > 0) {
        for (let n = 0; n < notes.length; n++) {
            let nid = notes[n];
            let ndata = BS_noteData[nid].data;
            let npos = BS_noteData[nid].pos;
            makeNote(nid, ndata, npos);
        }
    } else {
        makeNote();
    }
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
    globalShortcut.unregisterAll();
    // save data
    console.log(BS_noteData);
    fs.writeFileSync(BS_noteDataPath, JSON.stringify(BS_noteData));
});