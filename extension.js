const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

function getNotesFilePath() {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (workspaceFolders) {
    return path.join(workspaceFolders[0].uri.fsPath, "notes.json");
  }

  vscode.window.showErrorMessage("No workspace folder is open.");
  return null;
}

function getRelativeFilePath(filePath) {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (workspaceFolders) {
    const workspacePath = workspaceFolders[0].uri.fsPath;
    return path.relative(workspacePath, filePath);
  }

  return filePath;
}


function readNotes() {
  const filePath = getNotesFilePath();

  if (filePath && fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  }

  return {};
}

function writeNotes(notes) {
  const filePath = getNotesFilePath();

  if (filePath) {
    fs.writeFileSync(filePath, JSON.stringify(notes, null, 2));
  }
}

function activate(context) {
  let notes = readNotes();
  const decorationType = vscode.window.createTextEditorDecorationType({
    before: {
      contentText: "💬",
      color: "blue",
      margin: "0 0 0 1em",
    },
  });

  function updateDecorations(editor) {
    const filePath = editor.document.fileName;
    const fileName = getRelativeFilePath(filePath);
    const decorations = [];

    if (notes[fileName]) {
      for (const [lineNumber, note] of Object.entries(notes[fileName])) {
        const line = parseInt(lineNumber, 10);
        const range = new vscode.Range(line - 1, 0, line - 1, 0);
        decorations.push({ range });
      }

      editor.setDecorations(decorationType, decorations);
    }
  }

  const addNoteCommand = vscode.commands.registerCommand(
    "extension.addNote",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const lineNumber = editor.selection.active.line + 1;
        const note = await vscode.window.showInputBox({
          placeHolder: "Enter your note",
        });

        if (note) {
          const filePath = editor.document.fileName;
          const fileName = getRelativeFilePath(filePath);
          notes[fileName] = notes[fileName] || {};
          notes[fileName][lineNumber] = note;

          writeNotes(notes);

          vscode.window.showInformationMessage(
            `Note added to line ${lineNumber}`
          );
          updateDecorations(editor);
        }
      }
    }
  );

  const removeNoteCommand = vscode.commands.registerCommand(
    "extension.removeNote",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const lineNumber = editor.selection.active.line + 1;
        const filePath = editor.document.fileName;
        const fileName = getRelativeFilePath(filePath);

        if (notes[fileName] && notes[fileName][lineNumber]) {
          delete notes[fileName][lineNumber];
          writeNotes(notes);

          vscode.window.showInformationMessage(
            `Note removed from line ${lineNumber}`
          );
          updateDecorations(editor);
        } else {
          vscode.window.showWarningMessage("No note found on this line");
        }
      }
    }
  );

  const hoverProvider = vscode.languages.registerHoverProvider("*", {
    provideHover(document, position, token) {
      const line = position.line + 1;
      const filePath = document.fileName;
      const fileName = getRelativeFilePath(filePath);
      const note = notes[fileName] && notes[fileName][line];

      if (note) {
        return new vscode.Hover(note);
      }
    },
  });

  context.subscriptions.push(addNoteCommand);
  context.subscriptions.push(removeNoteCommand);
  context.subscriptions.push(hoverProvider);

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      updateDecorations(editor);
    }
  });

  const loadNotes = () => {
    notes = readNotes();
    vscode.window.visibleTextEditors.forEach((editor) =>
      updateDecorations(editor)
    );
  };

  loadNotes();
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
