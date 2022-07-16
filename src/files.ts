/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

import { random_id } from './random';
import { tmpdir } from 'os';
import { mkdir, rmdir, writeFile } from 'fs';
import { join } from 'path';
import { TEMP_DIR_NAME } from './constants';

const TEMP_DIR = join(tmpdir(), TEMP_DIR_NAME);

export function cleanupTempFiles(): void {
	rmdir(TEMP_DIR, { recursive: true }, (err) => {
		if (err) {
			console.error(err);
		}
	});
}

export function randomFilePath(fileExt: string): string {
	mkdir(TEMP_DIR, 0o700, function (err) {
		if (err) {
			if (err.code !== 'EEXIST')
				console.error(err);
		}
	});
	return join(TEMP_DIR, random_id() + '.' + fileExt);
}

export function saveToTemp(text: string, fileExt: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const filePath = randomFilePath(fileExt);
		writeFile(filePath, text, function (err) {
			if (err)
				reject(err);
			else
				resolve(filePath)
		});
	})
}
