import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = readFileSync(fileURLToPath(new URL('./index.html', import.meta.url)));
const port = Number(process.env.PORT ?? 4173);

createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(html);
}).listen(port, () => {
  console.log(`Soan Professional demo: http://127.0.0.1:${port}`);
});
