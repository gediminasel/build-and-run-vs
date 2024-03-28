/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import { OutputChannel, window } from "vscode";
import { OUTPUT_NAME } from "./constants";

export default class TaggedOutputChannel {
	static outputChannel: OutputChannel | null = null;
	static activeChannel: TaggedOutputChannel | null = null;
	clear() {
		if (!this.isActive())
			return;
		TaggedOutputChannel.outputChannel?.clear();
		TaggedOutputChannel.activeChannel = null;
	}
	append(value: string) {
		if (this.isActive())
			TaggedOutputChannel.outputChannel?.append(value);
	}
	appendLine(value: string) {
		if (this.isActive())
			TaggedOutputChannel.outputChannel?.appendLine(value);
	}
	show(preserveFocus?: boolean) {
		if (this.isActive())
			TaggedOutputChannel.outputChannel?.show(preserveFocus);
	}
	isActive() {
		return TaggedOutputChannel.activeChannel === this;
	}
	static get(): TaggedOutputChannel {
		if (this.activeChannel === null) {
			if (this.outputChannel === null) {
				this.outputChannel = window.createOutputChannel(OUTPUT_NAME);
			}
			this.activeChannel = new TaggedOutputChannel();
		}
		return this.activeChannel;
	}
	static clear() {
		if (this.activeChannel) {
			this.activeChannel.clear();
		}
	}
}
