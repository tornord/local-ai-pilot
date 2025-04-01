"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require("vscode");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

function getTextBeforeAfter(textEditor) {
  // Get the active cursor position
  const activePosition = textEditor.selection.active;

  // Create a range from the beginning of the document to the active position
  const startPosition = new vscode.Position(0, 0);
  const rangeBefore = new vscode.Range(startPosition, activePosition);
  const textBefore = textEditor.document.getText(rangeBefore);

  // Create a range from the active position to the end of the document.
  // The end is determined by getting the last line's end position.
  const lastLineIndex = textEditor.document.lineCount - 1;
  const lastLineEnd = textEditor.document.lineAt(lastLineIndex).range.end;
  const rangeAfter = new vscode.Range(activePosition, lastLineEnd);
  const textAfter = textEditor.document.getText(rangeAfter);

  return { textBefore, textAfter };
}

function activate(context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "Hello" is now active!');
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json

  let output = vscode.window.createOutputChannel("Tornord");

  //Write to output.

  let disposable = vscode.commands.registerTextEditorCommand(
    "extension.sayHello",
    async (textEditor) => {
      const { textBefore, textAfter } = getTextBeforeAfter(textEditor);

      const fileName = textEditor.document.fileName; // Full path of the file
      const languageId = textEditor.document.languageId; // Programming language identifier, e.g., "javascript", "python", etc.
      const fileUri = textEditor.document.uri;
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
      const fileNameWithoutPath = fileName.split("/").pop();

      output.appendLine(
        `Filename: ${fileNameWithoutPath}, Language: ${languageId}, workspaceFolder: ${workspaceFolder.uri.toString()}`
      );
      output.appendLine(`textBefore: ${textBefore}`);
      output.appendLine(`textAfter: ${textAfter}`);

      try {
        // const prompt = `# ${fileNameWithoutPath}\n# language: ${languageId}\n<｜fim▁begin｜>${textBefore}<｜fim▁hole｜>${textAfter}<｜fim▁end｜>`;
        const prompt = `<｜fim▁begin｜>#${fileNameWithoutPath}\n${textBefore}<｜fim▁hole｜>${textAfter || "\n"}<｜fim▁end｜>`;
        output.appendLine(`prompt ${prompt}`);
        const response = await fetch("http://localhost:8000/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek-coder:1.3b-instruct",
            prompt,
            stream: false,
            options: { num_predict: 128, temperature: 0 },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log("API response:", data);
          let text = data.response;
          output.appendLine(`response: ${text}`);
          text = text.replace(/^[\s\S]*?```python/, "");
          text = text.replace(/```[\s\S]*$/, "");
          text = text
            .split("\n")
            .map((line) => {
              const pythonCommentIndex = line.indexOf("#");
              if (pythonCommentIndex !== -1) {
                line = line.substring(0, pythonCommentIndex);
              }
              const jsCommentIndex = line.indexOf("//");
              if (jsCommentIndex !== -1) {
                line = line.substring(0, jsCommentIndex);
              }
              return line;
            })
            .join("\n");
          await textEditor.edit((edit) => {
            const position = textEditor.selection.active;
            edit.insert(position, text);
          });
        } else {
          console.error("API call failed:", response.statusText);
          vscode.window.showErrorMessage(
            "Failed to call API: " + response.statusText
          );
        }
      } catch (error) {
        console.error("Error calling API:", error);
        vscode.window.showErrorMessage("Error calling API: " + error.message);
      }
    }
  );
  context.subscriptions.push(disposable);
}

exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map
