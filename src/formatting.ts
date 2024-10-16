/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import { TextEditor, Range, EndOfLine } from 'vscode';

export async function updateWithFormatting(editor: TextEditor, formatted: string) {
	const eolSymbol = editor.document.eol === EndOfLine.LF ? '\n' : '\r\n';

	// The hope here is that most of the doc is already formatted and user
	// changed only a small section in the middle of the file. This saves some
	// tokenization, recomputation of inline hints, and other stuff in other
	// plugins.
	const lines = formatted.split(eolSymbol);
	await editor.edit((edit) => {
		let firstDiff = 0;
		for (; firstDiff < editor.document.lineCount && firstDiff < lines.length; firstDiff++) {
			if (editor.document.lineAt(firstDiff).text != lines[firstDiff]) {
				break;
			}
		}
		let lastDiff = 1;
		for (; lastDiff < editor.document.lineCount && lastDiff < lines.length; lastDiff++) {
			if (editor.document.lineAt(editor.document.lineCount - lastDiff).text != lines[lines.length - lastDiff]) {
				break;
			}
		}
		const changedValue = lines.slice(firstDiff, lastDiff > 1 ? -lastDiff + 1 : undefined).join(eolSymbol);
		const firstLine = editor.document.lineAt(firstDiff);
		const lastLine = editor.document.lineAt(editor.document.lineCount - lastDiff);
		edit.replace(new Range(firstLine.range.start, lastLine.range.end), changedValue);
	});
}
