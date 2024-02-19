/*
This file is part of BuildAndRun by Gediminas Lelesius <g@lelesius.eu>.
You should have received a copy of the GNU General Public License along with BuildAndRun. If not, see <https://www.gnu.org/licenses/gpl-3.0.en.html>.
*/

// Extension configuration.
export interface Settings {
	// Command to run the program/execute a test (called once for each input).
	run?: string,
	// Command that builds the program (run once before `run` command).
	// If not set, `run` command will be used without building.
	build?: string,
	// Similar to `run`, but called when running in debug mode.
	debug?: string,
	// Similar to `build`, but called when running in debug mode.
	debugBuild?: string,
	// Command to format the program. See `formatStdin` for API.
	format?: string,
	// If unset or true, format command is given source code via stdin and
	// program text is replaced with whatever `format` command returns.
	// If false, format command should modify the file in place.
	formatStdin?: boolean,
	// When working with untitled buffer (not saved file), a file with this
	// extension will be created in a temporary directory and pass as a source
	// to all commands.
	ext: string,
	// Comment that marks the beginning of input data.
	// For each input block, program will be executed with input data using
	// `run` command.
	inputBegin?: string,
	// Comment that marks the end of input data.
	inputEnd?: string,
	// Comment that marks the beginning of expected output data.
	// If set and present in the source file immediately after the input
	// comment, output will be compared with this instead of being shown in the
	// output pannel.
	outputBegin?: string,
	// Comment that marks the end of expected output data.
	outputEnd?: string,
}
