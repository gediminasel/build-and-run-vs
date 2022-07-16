/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import { window } from "vscode";
import { Settings } from "./extension";

export function getInputs(text: string, settings: Settings): string[] {
	const { inputBegin, inputEnd } = settings;

	if (inputBegin === undefined && inputEnd === undefined) {
		return [''];
	}
	if (inputBegin === undefined || inputEnd === undefined) {
		window.showErrorMessage(`Input begin or end marker not found!`);
		return [''];
	}

	const input = [];
	let pieces = text.split(inputBegin);
	pieces.shift();
	for (let p of pieces) {
		input.push(p.split(inputEnd, 1)[0]);
	}

	if (input.length === 0) {
		input.push('');
	}
	return input;
}