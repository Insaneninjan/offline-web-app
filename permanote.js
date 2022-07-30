let editor, statusline, savebutton, idletimer;

// first load application
window.onload = function () {
  // if first , then initialize localstorage
  if (localStorage.note == null) localStorage.note = "";
  if (localStorage.lastModified == null) localStorage.lastModified = 0;
  if (localStorage.lastSaved == null) localStorage.lastSaved = 0;

  // search for EditorUI dom element. initialize gloval variables
  editor = document.getElementById("editor");
  statusline = document.getElementById("statusline");
  savebutton = document.getElementById("savebutton");

  editor.value = localStorage.note; // initialize by editor save value
  editor.disabled = true; // but, make it impossible to edit until sync complete

  //  if textarea contains value
  editor.addEventListener(
    "input",
    function (e) {
      // save new value in local storage
      localStorage.note = editor.value;
      localStorage.lastModified = Date.now();
      // set idletimer
      if (idletimer) clearTimeout(idletimer);
      idletimer = setTimeout(save, 5000);
      // enale save button
      savebutton.disabled = false;
    },
    false
  );

  // every time app load, try to sync with server
  sync();
};

// before transition to pages, save on server
window.onbeforeunload = function () {
  if (localStorage.lastModified > localStorage.lastSaved) save();
};

// if users offline, notify them
window.onoffline = function () {
  status("Offline");
};

// if users online, sync with server
window.ononline = function () {
  sync();
};

// if users use new ver of app, notify them
// you use location.reload, you can force users to reload.
window.applicationCache.onupdateready = function () {
  statusline(
    "A new version of this app is available. Please reload to run it."
  );
};

// not existing new version of this app, notify them
window.applicationCache.onupdateready = function () {
  statusline("You are running the lateset version of the app");
};

// function view status message
function status(msg) {
  statusline.innerHTML = msg;
}

// if be online, upload text to server

function save() {
  if (idletimer) clearTimeout(idletimer);
  idletimer = null;

  if (navigator.online) {
    let xhr = new XMLHttpRequest();
    xhr.open("PUT", "/note");
    xhr.send(editor.value);
    xhr.onload = function () {
      localStorage.lastSaved = Date.now();
      savebutton.disabled = true;
    };
  }
}

// check for new version of this app on server
// if it's not found, save current version of this app.
function sync() {
  if (navigator.online) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/note");
    xhr.send();
    xhr.onload = function () {
      let remoteModTime = 0;
      if (xhr.status == 200) {
        let remoteModTime = xhr.getResponseHeader("Last-Modified");
        remoteModTime = new Date(remoteModTime).getTime();
      }
      if (remoteModTime > localStorage.lastModified) {
        status("Newer note found on server");
        let useit = confirm(
          "There is a newer version of the note\n" +
            "on the server. Click OK to use that version\n" +
            "or click Cancel to continue editing this\n" +
            "version and overwrite the server"
        );
        let now = Date.now();
        if (useit) {
          editor.value = localStorage.note = xhr.responseText;
          localStorage.lastSaved = now;
          status("Newest version downloaded.");
        } else status("Ignoring newer version of the note");
        localStorage.lastModified = now;
      } else status("You are editing the current version of the note");

      if (localStorage.lastModified > localStorage.lastSaved) {
        save();
      }

      editor.disabled = false;
      editor.focus();
    };
  } else {
    statusline("Can't sync while offline");
    editor.disabled = false;
    editor.focus();
  }
}
