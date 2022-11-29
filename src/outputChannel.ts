/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import { OutputChannel, window } from "vscode";
import { OUTPUT_NAME } from "./constants";

export default class TaggedOutputChannel {
	static outputChannel: TaggedOutputChannel | null = null;
	channel: OutputChannel;
	isActive: boolean;
	constructor(channel: OutputChannel) {
		this.channel = channel;
		this.isActive = true;
	}
	clear() {
		this.channel.clear();
		this.isActive = false;
		TaggedOutputChannel.outputChannel = null;
	}
	append(value: string) {
		if (this.isActive)
			this.channel.append(value);
	}
	appendLine(value: string) {
		if (this.isActive)
			this.channel.appendLine(value);
	}
	show(preserveFocus?: boolean) {
		if (this.isActive)
			this.channel.show(preserveFocus);
	}
	static get(): TaggedOutputChannel {
		if (this.outputChannel === null) {
			const channel = window.createOutputChannel(OUTPUT_NAME);
			this.outputChannel = new TaggedOutputChannel(channel);
		}
		return this.outputChannel;
	}
	static clear() {
		if (this.outputChannel) {
			this.outputChannel.clear();
		}
	}
}
