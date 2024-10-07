/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import { window, Uri, workspace } from "vscode";
import { createWriteStream, WriteStream } from 'fs';
import { randomFilePath } from './files';
import { MAX_OUTPUT_VIEW_SIZE } from './constants';
import TaggedOutputChannel from "./outputChannel";

// Wrapper around TaggedOutputChannel that buffers data and overflows to a file
// if output is huge.
export default class BufferedLimitedChannel {
	private outputFlushPeriod: number;
	private output: TaggedOutputChannel | null;
	private openOutputFile: boolean;

	private outputBuffer: Uint8Array[][] = [];
	private totalOutputSize = 0;
	private truncatedOutput: Uint8Array[][] = [];
	private outputFile: WriteStream | null = null;
	private hadIllegalChars = false;
	private outputBufferFlush: NodeJS.Timeout | null = null;
	private fullOutputFile = "";

	constructor(outputFlushPeriod: number, output: TaggedOutputChannel, openOutputFile: boolean) {
		this.outputFlushPeriod = outputFlushPeriod;
		this.output = output;
		this.openOutputFile = openOutputFile;
	}
	start() {
		this.outputBufferFlush = setInterval(this.flush.bind(this), this.outputFlushPeriod);
	}
	append(chunk: Uint8Array[]) {
		if (this.output === null) throw new Error("Append called after close");
		if (this.outputFile !== null) {
			// Write to a file directly -- file handles buffering.
			this.outputFile.write(chunk);
			return;
		}
		this.outputBuffer.push(chunk);
		this.totalOutputSize += chunk.length;
		if (this.totalOutputSize > MAX_OUTPUT_VIEW_SIZE) {
			this.flush();
		}
	}
	getTruncatedOutput(): string {
		let output = this.truncatedOutput.join('').replaceAll('\0', "\\0");
		if (this.fullOutputFile) {
			output += "...TRUNCATED\nFull output in " + this.fullOutputFile;
		}
		return output;
	}
	private flush() {
		if (this.output === null) return;
		if (this.outputBuffer.length === 0) return;
		let bufferString = this.outputBuffer.join('');
		this.truncatedOutput.push(...this.outputBuffer);
		this.outputBuffer = [];
		if (bufferString.includes('\0') && !this.hadIllegalChars) {
			this.hadIllegalChars = true;
			window.showWarningMessage(`Output contained null characters!`);
		}
		bufferString = bufferString.replaceAll('\0', "\\0");

		if (this.outputFile === null && this.totalOutputSize <= MAX_OUTPUT_VIEW_SIZE) {
			this.output.append(bufferString);
		} else {
			if (this.outputFile === null) {
				const outputFilePath = randomFilePath('txt');
				this.outputFile = createWriteStream(outputFilePath, { flags: 'w' });
				for (const chunk of this.truncatedOutput) {
					this.outputFile.write(chunk);
				}
				this.fullOutputFile = "file://" + (outputFilePath.startsWith('/') ? '' : '/') + outputFilePath;
				if (this.openOutputFile) {
					const openPath = Uri.parse(this.fullOutputFile);
					workspace.openTextDocument(openPath).then(doc => {
						window.showTextDocument(doc);
					});
				} else {
					this.output.append("\nFULL OUTPUT IN " + this.fullOutputFile);
				}
			}
			if (this.outputBufferFlush !== null) {
				clearInterval(this.outputBufferFlush);
				this.outputBufferFlush = null;
			}
		}
	}
	close() {
		if (this.outputBufferFlush !== null) {
			clearInterval(this.outputBufferFlush);
			this.outputBufferFlush = null;
		}
		this.flush();
		if (this.outputFile !== null) {
			this.outputFile.close();
		}
		this.output = null;
	}
}
