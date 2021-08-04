import longText from '../../tests/files/long.docsy?raw';
import { DocsyParser } from '../../dist';

console.time('parse');
DocsyParser.parseDocumentSync(longText);
console.timeEnd('parse');
