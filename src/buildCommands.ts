/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import { CommandToSpawn, listenCommandWithOutputAndProgress, OutputProgressOptions } from './commands';
import { Input } from './parseInput';
import { Result } from './result';

export class BuildAndRunException extends Error {}

const compileOptions: OutputProgressOptions = {
	jobName: "Building",
	successMsg: (time => `\n[Built in ${(time / 1000).toFixed(3)}s]\n`),
	failureMsg: ((time, failure) => `\n[Build failed in ${(time / 1000).toFixed(3)}s with code ${failure}]\n`),
};

export function compileFile(command: CommandToSpawn): Thenable<void> {
	return listenCommandWithOutputAndProgress(command, compileOptions).then(result => {
		if (!result.executionOk) {
			throw new BuildAndRunException();
		}
	});
}

const runOptions: OutputProgressOptions = {
	jobName: "Running",
	successMsg: (time => `\n[Finished in ${(time / 1000).toFixed(3)}s]\n`),
	failureMsg: ((time, failure) => `\n[Failed in ${(time / 1000).toFixed(3)}s with code ${failure}]\n`),
};

export async function runFile(command: CommandToSpawn, inputs: Input[], resultReporter: (input: Input, result: Result | null) => void): Promise<void> {
	for (const input of inputs) {
		resultReporter(input, null);
		const r = await listenCommandWithOutputAndProgress(command, runOptions, input);
		resultReporter(input, r);
		if (!r.executionOk) {
			break;
		}
	}
}
