const {ipcRenderer, remote} = require('electron');
const {dialog} = remote;
const tinycolor = require("tinycolor2");

// Set to true if the note will be deleted
var ISDELETED = false;

// note identifier/data setup
var WINDOWNAME = "";
ipcRenderer.once('nm-set-name', (event, args) => {
    WINDOWNAME = args;
});
ipcRenderer.once('nm-set-data', (event, args) => {
    document.body.style.backgroundColor = args.color;
    document.querySelector("#noteHeader").style.backgroundColor = tinycolor(args.color).analogous()[1].darken(20).toString();
    document.querySelector("#noteContent").innerHTML = args.data;
});

// add button
document.querySelector("#makeNewNote").addEventListener("click", (evt) => {
    ipcRenderer.send('nm-make-note');
});

// delete button
document.querySelector("#deleteThisNote").addEventListener("click", (evt) => {
    let result = remote.dialog.showMessageBox({
        message: "Delete this note?",
        buttons: ['Yes', 'No']
    });
    if (result == 0) {
        ISDELETED = true;
        ipcRenderer.send('nm-delete-note', WINDOWNAME);
    }
});

// window close handling
ipcRenderer.on('nm-exit', (event, args) => {
    if (!ISDELETED) ipcRenderer.send("nm-save-note", {
        nid: WINDOWNAME,
        ndata: document.querySelector("#noteContent").innerHTML
    });
});