/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

function endsWithWhitespace(str: string) {
	return str[str.length - 1].match(/\s+/) === null;
}

function tokenize(str: string): string[] {
	return str.split(/\s+/).filter(x => x);
}

export class OutputChecker {
	expected: string[];
	i: number;
	good: boolean;
	leftover: string;
	constructor(expected: string) {
		this.expected = tokenize(expected);
		this.i = 0;
		this.good = true;
		this.leftover = "";
	}
	eat(actualStr: string): boolean {
		if (!this.good) {
			return false;
		}
		const actual = tokenize(this.leftover + actualStr);
		this.leftover = "";
		if (actual.length === 0) {
			return true;
		}
		for (let i = 0; i + 1 < actual.length; i++) {
			if (this.expected[this.i] !== actual[i]){
				this.good = false;
				break;
			}
			this.i++;
		}
		if (!this.good || this.i >= this.expected.length) {
			this.good = false;
			return false;
		}
		const i = actual.length - 1;
		if (this.expected[this.i] === actual[i]) {
			this.i++;
		} else if(this.expected[this.i].startsWith(actual[i]) && !endsWithWhitespace(actualStr)) {
			this.leftover = actual[i];
		} else {
			this.good = false;
		}

		return this.good;
	}
	finish() {
		this.eat("\n");
		if (this.i < this.expected.length) {
			this.good = false;
		}
	}
}
