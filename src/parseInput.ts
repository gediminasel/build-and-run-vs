/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import { EndOfLine, Position, TextDocument, window, Range } from "vscode";
import { Settings } from "./settings";
import { countOccurrences } from "./utils";

const EolSymbols = {
	[EndOfLine.LF]: '\n',
	[EndOfLine.CRLF]: '\r\n',
};

export class Input {
	location: Range | null;
	input: string;
	expectedOutput: string | null;
	constructor(location: Range | null, input: string, expectedOutput: string | null) {
		this.location = location;
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
	const documentEol = EolSymbols[document.eol];
	const input = [];
	const adaptedInputBegin = inputBegin.replaceAll(EolSymbols[settingsEol], documentEol);
	const adaptedInputEnd = inputEnd.replaceAll(EolSymbols[settingsEol], documentEol);
	const adaptedOutputBegin = outputBegin?.replaceAll(EolSymbols[settingsEol], documentEol);
	const adaptedOutputEnd = outputEnd?.replaceAll(EolSymbols[settingsEol], documentEol);
	const pieces = document.getText().split(adaptedInputBegin);
	let line = countOccurrences(pieces[0], documentEol);
	pieces.shift();
	for (const p of pieces) {
		const lineStart = line;
		line += countOccurrences(adaptedInputBegin, documentEol);
		line += countOccurrences(p, documentEol);
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
		const inp = new Input(new Range(new Position(lineStart, 0), new Position(line, 0)), inpStr, output);
		input.push(inp);
	}
	return input;
}
