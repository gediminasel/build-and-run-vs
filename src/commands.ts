/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import * as vscode from 'vscode';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { createWriteStream, WriteStream } from 'fs';
import { ParsedPath } from 'path';
import { MAX_OUTPUT_VIEW_SIZE, SETTINGS_NAME } from './constants';
import { random_id } from './random';
import { randomFilePath } from './files';
import TaggedOutputChannel from './outputChannel';

export function initCommandTemplate(command: string | undefined, fileInfo: ParsedPath) {
	if (!command)
		return command;
	return command.split('${file_path}').join(fileInfo.dir)
		.split('${file}').join(fileInfo.base)
		.split('${file_base_name}').join(fileInfo.name)
		.split('${workspace_path}').join(vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || fileInfo.dir);
}

export interface CommandToSpawn {
	command: string,
	cwd?: string
}

export function spawnCommand(command: CommandToSpawn): ChildProcessWithoutNullStreams {
	if (process.platform === 'win32') {
		return spawn('cmd', ['/s', "/c", '"' + command.command + '"'], {
			cwd: command.cwd,
			windowsVerbatimArguments: true
		});
	} else {
		return spawn('/bin/bash', ["-c", command.command], {
			cwd: command.cwd
		});
	}
}

export type RunningProcess = {
	process: ChildProcessWithoutNullStreams;
	wasKilled: boolean;
};

const running = new Map<string, RunningProcess>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OnCloseListener = (exitCode: number | null, signal: any, wasKilled: boolean) => void;

export function listenCommand(command: CommandToSpawn, onClose: OnCloseListener, input?: string): RunningProcess {
	const child = spawnCommand(command);
	const rid = random_id();
	let closeCallback: OnCloseListener | null = (exitCode, signal) => {
		const p = running.get(rid);
		running.delete(rid);
		closeCallback = null;
		onClose(exitCode, signal, p?.wasKilled || false);
	};
	const close = (code?: number | null, signal?: NodeJS.Signals) => {
		if (code === undefined)
			code = child.exitCode;
		if (closeCallback) closeCallback(code, signal, false);
	};
	child.on("close", close);
	const proc = { process: child, wasKilled: false };
	running.set(rid, proc);
	child.stdin.end(input);
	return proc;
}

// time in milliseconds
export interface OutputProgressOptions {
	jobName?: string,
	reportMsg?: (time: number) => string,
	successMsg?: (time: number) => string,
	failureMsg?: (time: number, failure: string) => string,
}

function getOptionsWithDefaults(o?: OutputProgressOptions) {
	o = o || {};
	const jobName = o.jobName || 'Building';
	return {
		jobName,
		reportMsg: o.reportMsg || (time => `${jobName} ${(time / 1000).toFixed(1)}s`),
		successMsg: o.successMsg || (time => `\n[${jobName} finished in ${(time / 1000).toFixed(3)}s]\n`),
		failureMsg: o.failureMsg || ((time, failure) => `\n[${jobName} failed in ${(time / 1000).toFixed(3)}s with code ${failure}]\n`),
	};
}

export class BuildAndRunException extends Error { }

export function listenCommandWithOutputAndProgress(command: CommandToSpawn, options?: OutputProgressOptions, input?: string): Thenable<void> {
	const settings = vscode.workspace.getConfiguration(SETTINGS_NAME);
	const outputFlushPeriod = settings.get("outputFlushPeriod", 500) as number;

	const openOutputFile = false;

	const opt = getOptionsWithDefaults(options);

	const output = TaggedOutputChannel.get();
	let outputBuffer: Uint8Array[][] = [];
	let outputText = "";
	let outputFile: WriteStream | null = null;
	let hadIllegalChars = false;
	output.show(true);

	const flushOutputBuf = function () {
		let bufferString = outputBuffer.join('');
		if (bufferString.includes('\0') && !hadIllegalChars) {
			hadIllegalChars = true;
			vscode.window.showWarningMessage(`Output contained null characters!`);
		}
		bufferString = bufferString.replaceAll('\0', "\\0");

		if (outputFile === null && outputText.length + bufferString.length <= MAX_OUTPUT_VIEW_SIZE) {
			output.append(bufferString);
			outputText += bufferString;
		} else {
			if (outputFile === null) {
				const outputFilePath = randomFilePath('txt');
				outputFile = createWriteStream(outputFilePath, { flags: 'w' });
				outputFile.write(outputText);
				outputText = "";
				if (openOutputFile) {
					const openPath = vscode.Uri.parse("file:///" + outputFilePath);
					vscode.workspace.openTextDocument(openPath).then(doc => {
						vscode.window.showTextDocument(doc);
					});
				} else {
					output.append("\nFULL OUTPUT IN file:///" + outputFilePath);
				}
			}
			for (const chunk of outputBuffer) {
				outputFile.write(chunk);
			}
		}
		outputBuffer = [];
	};

	return vscode.window.withProgress<void>({
		location: vscode.ProgressLocation.Window,
		cancellable: true
	}, (progress, token) => {
		return new Promise((resolve, reject) => {
			token.onCancellationRequested(() => {
				if (child)
					killCommand(child);
			});

			progress.report({ message: opt.reportMsg(0) });
			const startTime = Date.now();

			const statusInt = setInterval(function () {
				progress.report({ message: opt.reportMsg(Date.now() - startTime) });
				try {
					if (child.process.pid)
						process.kill(child.process.pid, 0);
				} catch (e) {
					// ignored
				}
			}, 100);

			const outputBufferFlush = setInterval(flushOutputBuf, outputFlushPeriod);

			const child = listenCommand(command, (code, signal) => {
				const endTime = Date.now();
				clearInterval(statusInt);
				clearInterval(outputBufferFlush);
				flushOutputBuf();

				if (code || signal) {
					const exitCode = (code ? code : signal);
					output.append(opt.failureMsg(endTime - startTime, exitCode));
					reject(new BuildAndRunException());
				} else {
					output.append(opt.successMsg(endTime - startTime));
					resolve();
				}

				if (outputFile) {
					outputFile.end();
				}
			}, input);

			const outHandler = (data: Uint8Array[]) => {
				if (!child.wasKilled)
					outputBuffer.push(data);
			};

			child.process.stderr.on("data", outHandler);
			child.process.stdout.on("data", outHandler);
		});
	});
}

export function killCommand(proc: RunningProcess): void {
	proc.wasKilled = true;
	if (process.platform === 'win32') {
		if (proc.process.pid)
			spawn("taskkill", ["/pid", proc.process.pid.toFixed(0), '/f', '/t']);
	} else {
		proc.process.kill('SIGKILL');
	}
}

export function killRunning(): boolean {
	let contained = false;
	running.forEach(child => {
		contained = true;
		killCommand(child);
	});
	return contained;
}
