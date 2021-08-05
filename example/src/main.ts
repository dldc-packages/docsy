import longText from '../../tests/files/content.docsy?raw';
import { DocsyParser } from '../../dist';

console.time('parse');
DocsyParser.parseDocument(longText);
console.timeEnd('parse');
