import { format } from "date-fns";
import { fromMarkdown } from "mdast-util-from-markdown";
import { Content, Node, Root } from "mdast-util-from-markdown/lib";
import { gfmFromMarkdown, gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import { gfm } from "micromark-extension-gfm";
import { App, normalizePath } from "obsidian";
import { join } from "path";

export const dateFormat = (date: Date) => format(date, 'Y-MM-dd');

async function ensureFolderExists(app: App, path: string): Promise<void> {
  const dirs = path.replace(/\\/g, "/").split("/");
  dirs.pop(); // remove basename

  if (dirs.length) {
    const dir = join(...dirs);
    if (!app.vault.getAbstractFileByPath(dir)) {
      await app.vault.createFolder(dir);
    }
  }
}

export async function getNoteCreationPath(
  app: App,
  journalPath: string,
  filename: string,
  date: Date,
): Promise<string> {
  const directory = journalPath;
  const year = date.getFullYear() + '';
  const filenameWithExt = !filename.endsWith(".md") ? `${filename}.md` : filename;

  const path = normalizePath(join(directory, year, filenameWithExt));
  await ensureFolderExists(app, path);
  return path;
}

function isContentArray(root: Content[] | Node): root is Content[] {
  return (root as Array<any>).length != undefined;
}

export class Parser {
  static fromContents(contents: string) {
    return fromMarkdown(contents, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()]
    })
  }

  static toMD(root: Content[] | Node) {
    if (isContentArray(root)) {
      root = { type: 'root', children: root } as unknown as Node;
    }

    return toMarkdown(root, { extensions: [gfmToMarkdown()] })
  }
}

