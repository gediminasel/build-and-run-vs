/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import { TestController, tests, TextDocument, Uri, TestItem, Range, TestRunRequest, workspace} from "vscode";
import { Input } from "./parseInput";
import BnRTestRun from "./testRun";

export function locationToId(location: Range | null): string {
	if (location === null) return "null";
	return location.start.line.toString().padStart(10, '0') + ':' + location.start.character.toString().padStart(10, '0') + ':' + location.end.line + ':' + location.end.character;
}

export default class BnRTestController {
	controller: TestController;
	activeRuns = new Map<string, WeakRef<BnRTestRun>>();
	static instance: BnRTestController | null = null;
	constructor(controller: TestController) {
		this.controller = controller;
	}
	private getFileTestItem(uri: Uri): TestItem {
		let file = this.controller.items.get(uri.toString());
		if (!file) {
			file = this.controller.createTestItem(uri.toString(), uri.path.split('/').pop() ?? "Unknown file", uri);
			file.canResolveChildren = true;
			this.controller.items.add(file);
		}
		const toDelete = new Set<string>();
		this.controller.items.forEach(item => {
			toDelete.add(item.id);
		});
		toDelete.delete(uri.toString());
		for (const d of workspace.textDocuments) {
			if (d.isClosed) continue;
			toDelete.delete(d.uri.toString());
		}
		for (const d of toDelete) {
			this.controller.items.delete(d);
		}
		return file;
	}
	updateTests(document: TextDocument, inputs: Input[]) {
		const file = this.getFileTestItem(document.uri);
		const items = [];
		for (const i of inputs) {
			const hrLabel = i.location ? ("Input on line " + i.location.start.line.toString()) : "Without input";
			const item = this.controller.createTestItem(locationToId(i.location), hrLabel, document.uri);
			item.sortText = locationToId(i.location);
			if (i.location !== null) {
				item.range = i.location;
			}
			items.push(item);
		}
		file.children.replace(items);
	}
	startRun(document: TextDocument): BnRTestRun {
		this.activeRuns.forEach((v, k) => {
			if (!v.deref()) this.activeRuns.delete(k);
			if (k == document.uri.toString()) v.deref()?.end();
		});
		const file = this.getFileTestItem(document.uri);
		const run = this.controller.createTestRun(new TestRunRequest([file]));
		const newRun = new BnRTestRun(file, run);
		this.activeRuns.set(document.uri.toString(), new WeakRef(newRun));
		return newRun;
	}
	static get(): BnRTestController {
		if (this.instance === null) {
			this.instance = new BnRTestController(tests.createTestController(
				'BuildAndRunTests',
				'B&R Tests from source file',
			));
		}
		return this.instance;
	}
}
