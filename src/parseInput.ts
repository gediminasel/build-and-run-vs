/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import { EndOfLine, TextDocument, window } from "vscode";
import { Settings } from "./settings";

const EolSymbols = {
	[EndOfLine.LF]: '\n',
	[EndOfLine.CRLF]: '\r\n',
};

export class Input {
	input: string;
	expectedOutput: string | null;
	constructor(input: string, expectedOutput: string | null) {
		this.input = input;
		this.expectedOutput = expectedOutput;
	}
}

export function getInputs(document: TextDocument, settings: Settings): Input[] {
	const { inputBegin, inputEnd, outputBegin, outputEnd } = settings;

	if (inputBegin === undefined && inputEnd === undefined) {
		return [];
	}
	if (!inputBegin || !inputEnd) {
		window.showErrorMessage(`Input begin or end marker not set!`);
		return [];
	}

	const settingsEol = (inputBegin.indexOf('\r\n') === -1 && inputEnd.indexOf('\r\n') === -1) ? EndOfLine.LF : EndOfLine.CRLF;

	const input = [];
	const adaptedInputBegin = inputBegin.replaceAll(EolSymbols[settingsEol], EolSymbols[document.eol]);
	const adaptedInputEnd = inputEnd.replaceAll(EolSymbols[settingsEol], EolSymbols[document.eol]);
	const adaptedOutputBegin = outputBegin?.replaceAll(EolSymbols[settingsEol], EolSymbols[document.eol]);
	const adaptedOutputEnd = outputEnd?.replaceAll(EolSymbols[settingsEol], EolSymbols[document.eol]);
	const pieces = document.getText().split(adaptedInputBegin);
	pieces.shift();
	for (const p of pieces) {
		if (!p.includes(adaptedInputEnd)) {
			continue;
		}
		const inpStr = p.split(adaptedInputEnd)[0];
		if (typeof inpStr !== "string") continue;
		let output = null;
		if (adaptedOutputBegin && adaptedOutputEnd) {
			const [, outputPiece] = p.split(adaptedOutputBegin, 2);
			output = outputPiece?.split(adaptedOutputEnd, 1)[0];
			if (typeof output !== "string") {
				output = null;
			}
		}
		const inp = new Input(inpStr, output);
		input.push(inp);
	}
	return input;
}
