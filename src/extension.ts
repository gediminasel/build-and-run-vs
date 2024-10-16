/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import * as vscode from 'vscode';
import { runFile, compileFile, BuildAndRunException } from './buildCommands';
import { getInputs, Input } from './parseInput';
import { join, parse } from 'path';
import { promises } from 'fs';
import { SETTINGS_NAME } from './constants';
import { initCommandTemplate, killRunning } from './commands';
import { formatSource } from './format';
import { cleanupTempFiles, fileOrTempInfo } from './files';
import TaggedOutputChannel from './outputChannel';
import { Settings } from './settings';
import BnRTestController from './testController';
import BnRTestRun from './testRun';
import { updateWithFormatting } from './formatting';

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
	context.subscriptions.push(BnRTestController.get().controller);
}

enum BRMode {
	Build,
	Run,
	Debug
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
		TaggedOutputChannel.clear();
	}

	const languageId = activeDocument.languageId;

	const settings: Settings | undefined = currentSettings.get(languageId);

	if (!settings) {
		vscode.window.showErrorMessage(`Unknown language ${languageId}!`);
		return;
	}

	const fileInfo = await fileOrTempInfo(activeDocument, settings.ext);

	TaggedOutputChannel.get().appendLine(`\n=== ${activeDocument.fileName} ===`);
	let testsRun: BnRTestRun | null = null;
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
		if (inputs.length === 0) {
			inputs.push(new Input(null, '', null));
		}
		BnRTestController.get().updateTests(activeDocument, inputs);
		testsRun = BnRTestController.get().startRun(activeDocument);

		const runTemplate = mode === BRMode.Debug ? settings.debug : settings.run;
		if (mode === BRMode.Debug && !runTemplate) {
			vscode.window.showErrorMessage(`Debug command not found!`);
			return;
		}
		const runCommand = initCommandTemplate(runTemplate, fileInfo);
		if (runCommand) {
			await runFile({ command: runCommand, cwd: fileInfo.dir }, inputs, (i, r) => r ? testsRun?.report(r) : testsRun?.start(i));
		}

		if (!buildCommand && !runCommand) {
			vscode.window.showErrorMessage(`Neither build nor run commands found!`);
		}
	} catch (e) {
		if (e instanceof BuildAndRunException) {
			// ignored: compile or run failed
		}
	}
	if (testsRun) {
		testsRun.end();
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
	const useStdin = settings.formatStdin !== false;
	let fileInfo = parse(activeDocument.uri.fsPath);
	if (useStdin) {
		// We're ok with the file being dirty or not saved at all.
		fileInfo = parse(activeDocument.uri.fsPath);
	} else {
		fileInfo = await fileOrTempInfo(activeDocument, settings.ext);
	}
	const formatCommand = initCommandTemplate(settings.format, fileInfo);
	if (!formatCommand) {
		vscode.window.showErrorMessage(`Format command not found!`);
		return;
	}
	const source = activeDocument.getText();

	let formatted = await formatSource({ command: formatCommand }, useStdin, source);
	if (useStdin || activeDocument.isUntitled) {
		if (!useStdin) {
			formatted = await promises.readFile(join(fileInfo.dir, fileInfo.base), 'utf8');
		}
		if (source === formatted) {
			// already formatted.
			return;
		}
		await updateWithFormatting(activeTextEditor, formatted);
	}
}

function killAll() {
	const contained = killRunning();
	if (!contained) {
		TaggedOutputChannel.clear();
	}
}
