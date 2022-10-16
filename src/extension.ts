/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import * as vscode from 'vscode';
import { runFile, compileFile } from './buildCommands';
import { getInputs } from './parseInput';
import { parse } from 'path';
import { getOutputChannel, SETTINGS_NAME } from './constants';
import { BuildAndRunException, initCommandTemplate, killRunning } from './commands';
import { formatSource } from './format';
import { cleanupTempFiles, saveToTemp } from './files';

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('build-and-run:build_run', () => {
		buildAndRun(BRMode.Run);
	});
	context.subscriptions.push(disposable);
	const disposable0 = vscode.commands.registerCommand('build-and-run:build', () => {
		buildAndRun(BRMode.Build);
	});
	context.subscriptions.push(disposable0);
	const disposable1 = vscode.commands.registerCommand('build-and-run:build_debug', () => {
		buildAndRun(BRMode.Debug);
	});
	context.subscriptions.push(disposable1);
	const disposable2 = vscode.commands.registerCommand('build-and-run:kill', () => {
		killAll();
	});
	context.subscriptions.push(disposable2);
	const disposable3 = vscode.commands.registerCommand('build-and-run:format', () => {
		format();
	});
	context.subscriptions.push(disposable3);
	const disposable4 = vscode.commands.registerCommand('build-and-run:cleanup_temp', () => {
		cleanupTempFiles();
	});
	context.subscriptions.push(disposable4);
	context.subscriptions.push({ dispose: killRunning });
}

enum BRMode {
	Build,
	Run,
	Debug
}

export interface Settings {
	run?: string,
	build?: string,
	debug?: string,
	debugBuild?: string,
	format?: string,
	ext: string,
	inputBegin?: string,
	inputEnd?: string,
}

async function buildAndRun(mode: BRMode) {
	const activeDocument = vscode.window.activeTextEditor?.document;
	if (!activeDocument) {
		vscode.window.showErrorMessage("No open file found!");
		return;
	}

	const currentSettings = vscode.workspace.getConfiguration(SETTINGS_NAME, activeDocument.uri);
	const onlyOneRunning = currentSettings.get("onlyOneRunning", true) as boolean;
	if (onlyOneRunning) {
		killRunning();
	}
	const clearBeforeRunning = currentSettings.get("clearBeforeRunning", true) as boolean;
	if (clearBeforeRunning) {
		getOutputChannel().clear();
	}

	const languageId = activeDocument.languageId;

	let settings: Settings | undefined = currentSettings.get(languageId);

	let fileInfo;
	if (activeDocument.isUntitled) {
		settings = settings || { ext: 'file' };
		fileInfo = parse(await saveToTemp(activeDocument.getText(), settings.ext));
	} else {
		if (activeDocument.isDirty)
			await activeDocument.save();
		fileInfo = parse(activeDocument.uri.fsPath);
	}

	if (!settings) {
		vscode.window.showErrorMessage(`Unknown language ${languageId}!`);
		return;
	}

	getOutputChannel().appendLine(`\n=== ${activeDocument.fileName} ===`);
	try {
		const buildTemplate = mode === BRMode.Debug && settings.debugBuild ? settings.debugBuild : settings.build;
		const buildCommand = initCommandTemplate(buildTemplate, fileInfo);
		if (buildCommand) {
			await compileFile({ command: buildCommand, cwd: fileInfo.dir });
		}
		if (mode === BRMode.Build) {
			if (!buildCommand) {
				vscode.window.showErrorMessage(`Build command not found!`);
			}
			return;
		}

		const inputs = getInputs(activeDocument, settings);

		const runTemplate = mode === BRMode.Debug ? settings.debug : settings.run;
		if (mode === BRMode.Debug && !runTemplate) {
			vscode.window.showErrorMessage(`Debug command not found!`);
			return;
		}
		const runCommand = initCommandTemplate(runTemplate, fileInfo);
		if (runCommand) {
			await runFile({ command: runCommand, cwd: fileInfo.dir }, inputs);
		}

		if (!buildCommand && !runCommand) {
			vscode.window.showErrorMessage(`Neither build nor run commands found!`);
		}
	} catch(e) {
		if (e instanceof BuildAndRunException) {
			// ignored: compile or run failed
		}
	}
}

async function format() {
	const activeTextEditor = vscode.window.activeTextEditor;
	if (!activeTextEditor) {
		vscode.window.showErrorMessage("No open file found!");
		return;
	}
	const activeDocument = activeTextEditor.document;
	const languageId = activeDocument.languageId;
	const settings = vscode.workspace.getConfiguration(SETTINGS_NAME, activeDocument.uri).get(languageId) as Settings;

	if (!settings) {
		vscode.window.showErrorMessage(`Unknown language ${languageId}!`);
		return;
	}
	const formatCommand = settings.format;
	if (!formatCommand) {
		vscode.window.showErrorMessage(`Format command not found!`);
		return;
	}
	const source = activeDocument.getText();

	const formatted = await formatSource({ command: formatCommand }, settings, source);
	await activeTextEditor.edit((edit) => {
		const firstLine = activeTextEditor.document.lineAt(0);
		const lastLine = activeTextEditor.document.lineAt(activeTextEditor.document.lineCount - 1);
		edit.delete(new vscode.Range(firstLine.range.start, lastLine.range.end));
		edit.insert(new vscode.Position(0, 0), formatted);
	});
}

function killAll() {
	const contained = killRunning();
	if (!contained) {
		getOutputChannel().clear();
	}
}