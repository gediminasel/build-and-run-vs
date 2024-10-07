/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import { Input } from "./parseInput";

export class Result {
	input: Input | null;
	executionOk: boolean;
	outputOk: boolean | null;
	output: string;
	duration: number;
	constructor(input: Input | null, executionOk: boolean, outputOk: boolean | null, output: string, duration: number) {
		this.input = input;
		this.executionOk = executionOk;
		this.outputOk = outputOk;
		this.output = output;
		this.duration = duration;
	}
}
