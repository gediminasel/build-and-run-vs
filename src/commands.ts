/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import * as vscode from 'vscode';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { ParsedPath } from 'path';
import { SETTINGS_NAME } from './constants';
import { random_id } from './random';
import TaggedOutputChannel from './outputChannel';
import { Input } from './parseInput';
import { OutputChecker } from './checker';
import BufferedLimitedChannel from './bufferedLimitedChannel';
import { Result } from './result';

export function initCommandTemplate(command: string | undefined, fileInfo: ParsedPath | undefined) {
	if (!command || !fileInfo)
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

export function listenCommandWithOutputAndProgress(command: CommandToSpawn, options?: OutputProgressOptions, input?: Input): Thenable<Result> {
	const settings = vscode.workspace.getConfiguration(SETTINGS_NAME);

	const opt = getOptionsWithDefaults(options);

	const output = TaggedOutputChannel.get();
	output.show(true);
	const bufferedOutput = new BufferedLimitedChannel(settings.get<number>("outputFlushPeriod", 500), output, false);
	const outputChecker = input?.expectedOutput ? new OutputChecker(input.expectedOutput) : null;

	return vscode.window.withProgress<Result>({
		location: vscode.ProgressLocation.Window,
		cancellable: true
	}, (progress, token) => {
		return new Promise((resolve) => {
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

			const child = listenCommand(command, (code, signal) => {
				const endTime = Date.now();
				clearInterval(statusInt);

				bufferedOutput.close();

				if (outputChecker) {
					outputChecker.finish();
					if (outputChecker.good) {
						output.append("\nOutput matched");
					} else {
						output.append("\n!!!OUTPUT DID NOT MATCH!!!");
					}
				}
				const duration = endTime - startTime;
				if (code || signal) {
					const exitCode = (code ? code : signal);
					output.append(opt.failureMsg(duration , exitCode));
					resolve(new Result(input ?? null, false, false, "", duration));
				} else {
					output.append(opt.successMsg(duration ));
					resolve(new Result(input ?? null, true, outputChecker?.good ?? null, bufferedOutput.getTruncatedOutput(), duration));
				}
			}, input?.input);
			bufferedOutput.start();

			child.process.stderr.on("data", (data: Uint8Array[]) => {
				if (child.wasKilled) return;
				bufferedOutput.append(data);
			});
			child.process.stdout.on("data", (data: Uint8Array[]) => {
				if (child.wasKilled) return;
				outputChecker?.eat("" + data);
				bufferedOutput.append(data);
			});
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
