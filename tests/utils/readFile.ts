import { resolve } from "@std/path";

export function readFile(name: string): string {
  const testFileFolder = resolve(Deno.cwd(), "tests/files");
  const filePath = resolve(testFileFolder, `${name}.docsy`);
  const file = Deno.readTextFileSync(filePath);
  return file;
}
