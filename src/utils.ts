/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

export function countOccurrences(string: string, substring: string): number {
	let count = 0;
	let index = 0;
	while ((index = string.indexOf(substring, index)) !== -1) {
		count++;
		index += substring.length;
	}
	return count;
  }
