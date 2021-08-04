import longText from '../../tests/files/long.docsy?raw';
import { DocsyParser } from '../../dist';

console.time('parse');
DocsyParser.parseDocument(longText);
console.timeEnd('parse');
