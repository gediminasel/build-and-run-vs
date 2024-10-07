/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import { TestItem, TestRun, TestMessage} from "vscode";
import { Result } from "./result";
import { locationToId } from "./testController";
import { Input } from "./parseInput";

export default class BnRTestRun {
	private updated = new Set<string>();
	private ended = false;
	constructor(private file: TestItem, private run: TestRun) {
	}
	start(input: Input) {
		if (this.ended) return;
		const item = this.file.children.get(locationToId(input.location));
		if (!item) return;
		this.run.started(item);
	}
	report(result: Result) {
		if (this.ended) return;
		if (!result.input) return;
		const item = this.file.children.get(locationToId(result.input.location));
		if (!item) return;
		this.updated.add(item.label);
		if (!result.executionOk) {
			this.run.failed(item, new TestMessage("Program execution failed"), result.duration);
		}
		else if (result.outputOk === false) {
			this.run.failed(item, TestMessage.diff("Incorrect output", result.input.expectedOutput ?? "", result.output), result.duration);
		} else {
			this.run.passed(item, result.duration);
		}
	}
	end() {
		this.ended = true;
		this.file.children.forEach(item => {
			if(!this.updated.has(item.label)) this.run.skipped(item);
		});
		this.run.end();
	}
}
