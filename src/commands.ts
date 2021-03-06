/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import * as vscode from 'vscode';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { createWriteStream, WriteStream } from 'fs';
import { ParsedPath } from 'path';
import { getOutputChannel, MAX_OUTPUT_VIEW_SIZE, SETTINGS_NAME } from './constants';
import { random_id } from './random';
import { randomFilePath } from './files';

export function initCommandTemplate(command: string | undefined, fileInfo: ParsedPath) {
	if (!command)
		return command;
	return command.split('${file_path}').join(fileInfo.dir)
		.split('${file}').join(fileInfo.base)
		.split('${file_base_name}').join(fileInfo.name);
}

export interface CommandToSpawn {
	command: string,
	cwd?: string
};

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

const running = new Map<string, ChildProcessWithoutNullStreams>();

export type OnCloseListener = (exitCode: number | null, signal: any) => void;

export function listenCommand(command: CommandToSpawn, onClose: OnCloseListener, input?: string): ChildProcessWithoutNullStreams {
	const child = spawnCommand(command);
	const rid = random_id();
	let closeCallback: ((exitCode: number | null, signal: any) => void) | null = (exitCode, signal) => {
		running.delete(rid);
		closeCallback = null;
		onClose(exitCode, signal);
	};
	const close = (code?: number | null, signal?: NodeJS.Signals) => {
		if (code === undefined)
			code = child.exitCode;
		if (closeCallback) closeCallback(code, signal);
	};
	child.on("close", close);
	running.set(rid, child);
	child.stdin.end(input);
	return child;
}

// time in milliseconds
export interface OutputProgressOptions {
	jobName?: string,
	reportMsg?: (time: number) => string,
	successMsg?: (time: number) => string,
	failureMsg?: (time: number, failure: string) => string,
};

function getOptionsWithDefaults(o?: OutputProgressOptions) {
	o = o || {};
	const jobName = o.jobName || 'Building';
	return {
		jobName,
		reportMsg: o.reportMsg || (time => `${jobName} ${(time / 1000).toFixed(1)}s`),
		successMsg: o.successMsg || (time => `\n[${jobName} finished in ${(time / 1000).toFixed(3)}s]\n`),
		failureMsg: o.failureMsg || ((time, failure) => `\n[${jobName} failed in ${(time / 1000).toFixed(3)}s with code ${failure}]\n`),
	}
}

function BuildAndRunException() { }

export function listenCommandWithOutputAndProgress(command: CommandToSpawn, options?: OutputProgressOptions, input?: string): Thenable<void> {
	const settings = vscode.workspace.getConfiguration(SETTINGS_NAME);
	const outputFlushPeriod = settings.get("outputFlushPeriod", 500) as number;

	const openOutputFile: boolean = false;

	const opt = getOptionsWithDefaults(options);

	const output = getOutputChannel();
	let outputBuffer: string[] = [];
	let outputText = "";
	let outputFile: WriteStream | null = null;
	let outputFilePath: string | null = null;
	output.show(true);

	const flushOutputBuf = function () {
		if (outputBuffer) {
			if (outputText.length + outputBuffer.length <= MAX_OUTPUT_VIEW_SIZE) {
				output.append(outputBuffer.join(''));
				outputText += outputBuffer;
			} else {
				if (outputFile === null) {
					outputFilePath = randomFilePath('txt');
					outputFile = createWriteStream(outputFilePath, { flags: 'w' });
					outputFile.write(outputText);
					if (openOutputFile) {
						const openPath = vscode.Uri.parse("file:///" + outputFilePath);
						vscode.workspace.openTextDocument(openPath).then(doc => {
							vscode.window.showTextDocument(doc);
						});
					} else {
						output.append("\nFULL OUTPUT IN file:///" + outputFilePath);
					}
				}
				outputFile.write(outputBuffer);
			}
			outputBuffer = [];
		}
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
				progress.report({ message: opt.reportMsg(Date.now() - startTime) })
				try {
					if (child.pid)
						process.kill(child.pid, 0);
				} catch (e) {
				}
			}, 100);

			const outputBufferFlush = setInterval(flushOutputBuf, outputFlushPeriod);

			const child = listenCommand(command, (code: any, signal: any) => {
				const endTime = Date.now();
				clearInterval(statusInt);
				clearInterval(outputBufferFlush);
				flushOutputBuf();

				if (code || signal) {
					const exitCode = (code ? code : signal);
					output.append(opt.failureMsg(endTime - startTime, exitCode));
					reject(new (BuildAndRunException as any)());
				} else {
					output.append(opt.successMsg(endTime - startTime));
					resolve();
				}

				if (outputFile) {
					outputFile.end();
				}
			}, input);

			const outHandler = (data: any) => {
				outputBuffer.push(data);
			};

			child.stderr.on("data", outHandler);
			child.stdout.on("data", outHandler);
		});
	});
}

export function killCommand(child: ChildProcessWithoutNullStreams): void {
	if (process.platform === 'win32') {
		if (child.pid)
			spawn("taskkill", ["/pid", child.pid.toFixed(0), '/f', '/t']);
	} else {
		child.kill('SIGKILL');
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