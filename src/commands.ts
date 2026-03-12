/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import * as vscode from 'vscode';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { ParsedPath } from 'path';
import { SETTINGS_NAME } from './constants';
import TaggedOutputChannel from './outputChannel';
import { Input } from './parseInput';
import { OutputChecker } from './checker';
import BufferedLimitedChannel from './bufferedLimitedChannel';
import { Result } from './result';

export function initCommandTemplate(command: string[] | undefined, fileInfo: ParsedPath | undefined) : string[] | null {
	if (!command || !fileInfo)
		return null;
	return command.map((arg) => arg.split('${file_path}').join(fileInfo.dir))
		.map((arg) => arg.split('${file}').join(fileInfo.base))
		.map((arg) => arg.split('${file_base_name}').join(fileInfo.name))
		.map((arg) => arg.split('${workspace_path}').join(vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || fileInfo.dir));
}

export interface CommandToSpawn {
	command: string[],
	cwd?: string
}

export function spawnCommand(command: CommandToSpawn): ChildProcessWithoutNullStreams {
	return spawn(command.command[0], command.command.slice(1), {
		cwd: command.cwd,
		windowsVerbatimArguments: true
	});
}

export type RunningProcess = {
	process: ChildProcessWithoutNullStreams;
	wasKilled: boolean;
};

const running = new Set<RunningProcess>();

export type OnCloseListener = (exitCode: number | null, signal: NodeJS.Signals | null, error: string | null, wasKilled: boolean) => void;

export function listenCommand(command: CommandToSpawn, onClose: OnCloseListener, input?: string): RunningProcess {
	const proc = { process: spawnCommand(command), wasKilled: false };
	running.add(proc);
	let closeCallback: OnCloseListener | null = (exitCode, signal, error) => {
		running.delete(proc);
		closeCallback = null;
		onClose(exitCode, signal, error, proc.wasKilled || false);
	};
	const close = (code?: number | null, signal?: NodeJS.Signals) => {
		if (code === undefined)
			code = proc.process.exitCode;
		if (closeCallback) closeCallback(code, signal || null, null, false);
	};
	const error = (err: Error) => {
		console.error("Error spawning command", err);
		if (closeCallback) {
			const msg = "Failed to run command " + command.command.join(" ") + ": " + err.message;
			closeCallback(-1, null, msg, false);
		}
	};
	proc.process.on("close", close);
	proc.process.on("error", error);
	proc.process.stdin.end(input);
	return proc;
}

// time in milliseconds
export interface OutputProgressOptions {
	jobName?: string,
	reportMsg?: (time: number) => string,
	successMsg?: (time: number) => string,
	failureMsg?: (time: number, failure: string) => string,
	errorMsg?: (error: string) => string,
}

function getOptionsWithDefaults(o?: OutputProgressOptions) {
	o = o || {};
	const jobName = o.jobName || 'Building';
	return {
		jobName,
		reportMsg: o.reportMsg || (time => `${jobName} ${(time / 1000).toFixed(1)}s`),
		successMsg: o.successMsg || (time => `\n[${jobName} finished in ${(time / 1000).toFixed(3)}s]\n`),
		failureMsg: o.failureMsg || ((time, failure) => `\n[${jobName} failed in ${(time / 1000).toFixed(3)}s with code ${failure}]\n`),
		errorMsg: o.errorMsg || ((failure) => `\n[${jobName} failed with error: ${failure}]\n`),
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
			progress.report({ message: opt.reportMsg(0) });
			const startTime = Date.now();

			let statusInt: NodeJS.Timeout | null = null;

			const child = listenCommand(command, (code, signal, error) => {
				const endTime = Date.now();
				if (statusInt !== null) {
					clearInterval(statusInt);
				}

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
				const exitCode = (code || signal);
				if (error) {
					output.append(opt.errorMsg(error));
					resolve(new Result(input ?? null, false, false, "", duration));
				} else if (exitCode) {
					output.append(opt.failureMsg(duration, "" + exitCode));
					resolve(new Result(input ?? null, false, false, "", duration));
				} else {
					output.append(opt.successMsg(duration));
					resolve(new Result(input ?? null, true, outputChecker?.good ?? null, bufferedOutput.getTruncatedOutput(), duration));
				}
			}, input?.input);
			bufferedOutput.start();

			token.onCancellationRequested(() => {
				killCommand(child);
			});

			statusInt = setInterval(function () {
				progress.report({ message: opt.reportMsg(Date.now() - startTime) });
				try {
					// Test that it's still running.
					if (child.process.pid)
						process.kill(child.process.pid, 0);
				} catch (e) {
					// ignored
				}
			}, 100);

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
