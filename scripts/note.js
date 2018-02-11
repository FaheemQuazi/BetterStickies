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
    document.querySelector("#NoteColor").value = args.color;
    updateColor(args.color);
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

// color change
document.querySelector("#setNoteColor").addEventListener("click", (evt) => {
    document.querySelector("#NoteColor").jscolor.show();
});
function updateColor (jc) {
    // get bg colors
    let c = typeof jc == "object" ? ("#" + jc) : jc;
    let nhc = tinycolor(c).analogous()[1].darken(20).toString();
    // set bg colors
    document.body.style.backgroundColor = c;
    document.querySelector("#noteHeader").style.backgroundColor = nhc;
    // compute most readable font color
    document.body.style.color = tinycolor.mostReadable(c, [nhc],{includeFallbackColors:true}).toHexString();
}

// save note function
function saveNote() {
    ipcRenderer.sendSync("nm-save-note", {
        nid: WINDOWNAME,
        ndata: document.querySelector("#noteContent").innerHTML,
        ncolor: tinycolor(document.body.style.backgroundColor).toHexString()
    });
    return true;
}
// autosave handler
var asTimeoutHandler = 0;
document.querySelector("#noteContent").addEventListener("keypress", (event) => {
    try {
        clearTimeout(asTimeoutHandler);
    } catch (ex) {}
    asTimeoutHandler = setTimeout(() => {
        saveNote();
    }, 5000);
})

// window focus/blur events
window.addEventListener("focus", (event) => {
    document.querySelectorAll(".nd").forEach( (nd) => {
        nd.style.opacity = 1;
    });
});
window.addEventListener("blur", (event) => {
    document.querySelectorAll(".nd").forEach( (nd) => {
        nd.style.opacity = 0;

    });
    document.querySelector("#NoteColor").jscolor.hide();

    try {
        clearTimeout(asTimeoutHandler);
    } catch (ex) {}
    if (!ISDELETED) saveNote();
});

// window close handling
ipcRenderer.on('nm-exit', (event, args) => {
    try {
        clearTimeout(asTimeoutHandler);
    } catch (ex) {}
    remote.getCurrentWindow().destroy();
});

// window force save
ipcRenderer.on('nm-force-save', (event,args) => {
    try {
        clearTimeout(asTimeoutHandler);
    } catch (ex) {}
    saveNote();
})