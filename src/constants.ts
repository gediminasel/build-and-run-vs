/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import { OutputChannel, window } from "vscode";

export const OUTPUT_NAME = 'Build and Run output';
export const SETTINGS_NAME = 'buildAndRun';
export const TEMP_DIR_NAME = 'vscode_build';
export const MAX_OUTPUT_VIEW_SIZE = 1000000;

let output_channel: OutputChannel | null = null;
export function getOutputChannel(): OutputChannel {
	if (output_channel === null)
		output_channel = window.createOutputChannel(OUTPUT_NAME);
	return output_channel;
}