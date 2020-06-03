const fs = require("fs");
const path = require("path");
const pipeline = require("stream").pipeline;
const Transformer = require("./Transformer");

module.exports = class CopyTask {
	/**
	 * an object representing the task of copying a file from `src` to `target_dir`
	 * while replacing public urls inside double brace syntax with their
	 * corresponding values from laravel's mix-manifest.json
	 * @param {string} src the source file path
	 * @param {string} target_dir the directory path that the file is gonna be copied into
	 */
	constructor(src, target_dir = "") {
		if (!fs.existsSync(src)) throw new Error(`"${src}" doesn't exist`);

		this._src = src;

		this._running = false;

		target_dir = this.normalizeDir(target_dir);

		const fileName = path.basename(this._src);

		this._target = path.join(target_dir, fileName);
	}

	/**
	 * forces the target directory to be inside the public path
	 * @param {string} dir
	 */
	normalizeDir(dir) {
		if (!dir) return Config.publicPath;

		const segments = dir.split(/\/+|\\+/g);

		if (segments[0] !== Config.publicPath) {
			segments.unshift(Config.publicPath);
		}

		return path.join(...segments);
	}

	/**
	 * ensure that the target directory exists
	 */
	ensureTargetDir() {
		const dir = path.dirname(this._target);
		fs.mkdirSync(dir, {recursive: true});
	}

	/**
	 * @returns {Promise<string>} a promise for the current task that resolves to the resulting file's path .
	 */
	run() {
		if (this._running) return;

		return new Promise((resolve, reject) => {
			var target_path = this._target;

			this.ensureTargetDir();

			const target = fs.createWriteStream(target_path);

			const src = fs.createReadStream(this._src, {highWaterMark: 16 * 1024});

			const transformer = new Transformer();

			pipeline(src, transformer, target, err => {
				this._running = false;

				if (err) {
					reject(new Error(`Error while transforming "${this._src}"\nReason : ${err.message}`));
				} else {
					resolve(target_path);
				}
			});
		});
	}
};
