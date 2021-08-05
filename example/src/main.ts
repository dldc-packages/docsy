import longText from '../../tests/files/complex-raw.docsy?raw';
import { DocsyParser } from '../../dist';

console.time('parse');
const result = DocsyParser.parseDocument(longText);
console.timeEnd('parse');

const app = document.getElementById('app')!;
app.innerHTML = `<pre>${JSON.stringify(result.document, null, 2)}</pre>`;
