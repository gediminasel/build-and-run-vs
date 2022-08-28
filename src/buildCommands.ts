/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import { CommandToSpawn, listenCommandWithOutputAndProgress, OutputProgressOptions } from './commands';

const compileOptions: OutputProgressOptions = {
	jobName: "Building",
	successMsg: (time => `\n[Built in ${(time / 1000).toFixed(3)}s]\n`),
	failureMsg: ((time, failure) => `\n[Build failed in ${(time / 1000).toFixed(3)}s with code ${failure}]\n`),
};

export function compileFile(command: CommandToSpawn): Thenable<void> {
	return listenCommandWithOutputAndProgress(command, compileOptions);
}

const runOptions: OutputProgressOptions = {
	jobName: "Running",
	successMsg: (time => `\n[Finished in ${(time / 1000).toFixed(3)}s]\n`),
	failureMsg: ((time, failure) => `\n[Failed in ${(time / 1000).toFixed(3)}s with code ${failure}]\n`),
};

export async function runFile(command: CommandToSpawn, inputs: string[]): Promise<void> {
	for (const input of inputs) {
		await listenCommandWithOutputAndProgress(command, runOptions, input);
	}
}