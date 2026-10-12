// Serves dist/ over HTTP so Revenge can install the plugin from your PC. Run `npm run build` first.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const port = Number(process.env.PORT) || 4040;
createServer(async (req, res) => {
	const file = (req.url ?? "/").split("?")[0].replace(/\.\./g, "");
	try {
		const data = await readFile(join("dist", file === "/" ? "manifest.json" : file));
		res.writeHead(200, { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" });
		res.end(data);
	} catch {
		res.writeHead(404);
		res.end("not found");
	}
}).listen(port, () => console.log(`Serving dist/ at http://localhost:${port}/`));
