/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import * as vscode from 'vscode';
import { CommandToSpawn, RunningProcess, killCommand, listenCommand } from './commands';
import TaggedOutputChannel from './outputChannel';

export function formatSource(command: CommandToSpawn, returnStdout: boolean, source: string): Thenable<string> {
	return vscode.window.withProgress<string>({
		location: vscode.ProgressLocation.Window,
		cancellable: true
	}, (progress, token) => {
		return new Promise((resolve, reject) => {
			let child: RunningProcess|null = null;
			token.onCancellationRequested(() => {
				if (child)
					killCommand(child);
			});

			const output = TaggedOutputChannel.get();
			const startTime = Date.now();
			const program: string[] = [];

			const statusInt = setInterval(function () {
				progress.report({ message: 'Running ' + ((Date.now() - startTime) / 1000).toFixed(1) + 's' });
				try {
					if (child?.process.pid)
						process.kill(child.process.pid, 0);
				} catch (e) {
					// ignore
				}
			}, 100);
			child = listenCommand(command, (code, signal) => {
				clearInterval(statusInt);

				if (code || signal) {
					reject("NON-ZERO-RETURN");
				} else {
					resolve(program.join(''));
				}
			}, source);

			child.process.stderr.on("data", (data) => {
				output.append("" + data);
			});
			child.process.stdout.on("data", (data) => {
				if (returnStdout) {
					program.push(data);
				} else {
					output.append("" + data);
				}
			});
		});
	});
}
