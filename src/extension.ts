import * as vscode from 'vscode';
import * as fs from "fs"
import * as os from "os"

const settingsFileName = "settings.json";
const presetsDirName = "layout_presets";

class Settings {
	public chosen_preset: string | undefined  = undefined;
}

let settings: Settings;

function makePath(localPathToFile: string) : string {
	return __dirname + "\\" + localPathToFile;
}
function makePresetPath(presetFileName: string) : string {
	return makePath(presetsDirName + "\\" + presetFileName);
}

function readSettings(settingsFile: string) : Settings {
	let content = JSON.parse(fs.readFileSync(settingsFile, "utf-8"));
	return content;
} 
function writeSettings(settingsFile: string, settings: Settings) {
	let str = JSON.stringify(settings);
	fs.writeFile(settingsFile, str, (err) => {
		if (err) {
			console.log("Error occured while writing setting to file: " + err.message);
		}
	});
}

function readKeys(filePath: string) : Map<string, string> {
	const lines = fs.readFileSync(filePath, "utf-8").split(os.EOL);
	let linesNum = lines.length;
	let map = new Map<string, string>();
	for (let i = 0; i < linesNum; ++i) {
		let tokens = lines[i].split(' ');
		map.set(tokens[0], tokens[1]);
	}
	return map;
}

function readFilesFromDirectiory(directory: string) : Array<string> {	
	let arr = new Array<string>;
	fs.readdirSync(makePath(directory)).forEach(file =>  {
		arr.push(file);
	});
	return arr;
}
async function makeQuickChoice(arr: string[], defaultValue: string | undefined) : Promise<string | undefined> {
	if (arr.length == 0) return defaultValue;
	let ret = defaultValue;
	let pick = vscode.window.showQuickPick(arr);
	await Promise.resolve(pick).then((res) => {
		ret = res;
	});
	console.log("chosen layout: " + ret);
	return ret;
}

async function switchLayoutPreset(presetsDirName: string) : Promise<string | undefined> {
	let allPresets = readFilesFromDirectiory(presetsDirName);
	return await makeQuickChoice(allPresets, settings.chosen_preset);
}

export async function activate(context: vscode.ExtensionContext) {

	settings = readSettings(makePath(settingsFileName));
	let map: Map<string, string>;

	async function changePreset() {
		settings.chosen_preset = await switchLayoutPreset(presetsDirName);
		if (settings.chosen_preset == undefined) return;
		map = readKeys(makePresetPath(settings.chosen_preset));
	} 
	async function switchSelection() {
		function getModifiedCharacter(c: string) {
			return map.get(c) || c;
		}
		function getModifiedWord(word: string) : string {
			let newWord = "";
			for (let i = 0; i < word.length; ++i) {
				newWord = newWord + getModifiedCharacter(word.charAt(i));
			}
			return newWord;
		}
		function getSelectionText(curSelection: vscode.Selection) : string {
			const selectionRange = new vscode.Range(
				curSelection.start.line, curSelection.start.character, 
				curSelection.end.line, curSelection.end.character
			);
			const selectionText = editor?.document.getText(selectionRange);
			let resText = selectionText || "";
			return resText;
		}
		function getModifiedSelectionText(curSelection: vscode.Selection) : string {
			return getModifiedWord(getSelectionText(curSelection));
		}
		
		let editor = vscode.window.activeTextEditor;
		if (editor) {
			const document = editor.document;
			if (settings.chosen_preset == undefined) {
				await changePreset();
			}
			if (settings.chosen_preset == undefined) return;
			editor.edit(editBuilder => {
				editor.selections.forEach(sel => {
					const range = sel;
					let modifiedSelText = getModifiedSelectionText(sel);
					editBuilder.replace(range, modifiedSelText);
				})
			});
		}
	}

	context.subscriptions.push(
		vscode.commands.registerCommand('layout-switcher.switchSelection', switchSelection),
		vscode.commands.registerCommand("layout-switcher.changePreset", changePreset)
	);
}

// This method is called when your extension is deactivated
export function deactivate() {
	writeSettings(makePath(settingsFileName), settings);
}
