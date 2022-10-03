/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import { EndOfLine, TextDocument, window } from "vscode";
import { Settings } from "./extension";

const EolSymbols = {
	[EndOfLine.LF]: '\n',
	[EndOfLine.CRLF]: '\r\n',
};

export function getInputs(document: TextDocument, settings: Settings): string[] {
	const { inputBegin, inputEnd } = settings;

	if (inputBegin === undefined && inputEnd === undefined) {
		return [''];
	}
	if (!inputBegin || !inputEnd) {
		window.showErrorMessage(`Input begin or end marker not set!`);
		return [''];
	}
	
	const settingsEol = (inputBegin.indexOf('\r\n') === -1 && inputEnd.indexOf('\r\n') === -1) ? EndOfLine.LF : EndOfLine.CRLF;

	const input = [];
	const adaptedInputBegin = inputBegin.replaceAll(EolSymbols[settingsEol], EolSymbols[document.eol]);
	const adaptedInputEnd = inputEnd.replaceAll(EolSymbols[settingsEol], EolSymbols[document.eol]);
	const pieces = document.getText().split(adaptedInputBegin);
	pieces.shift();
	for (const p of pieces) {
		input.push(p.split(adaptedInputEnd, 1)[0]);
	}

	if (input.length === 0) {
		input.push('');
	}
	return input;
}