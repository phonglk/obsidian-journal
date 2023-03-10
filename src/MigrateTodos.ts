import { parseISO, previousMonday } from "date-fns";
import { App, EditorPosition, MarkdownView, Notice, TFile, View } from "obsidian";
import JournalPlugin from "./main";
import { dateFormat, getNoteCreationPath, Parser } from "./utils";
import { Content, ListItem, Node, Parent, Root, Text } from "mdast-util-from-markdown/lib";

const getLines = (contents: string) => contents.split(/\r?\n|\r|\n/g);

function collectUncompletedTodos(tree: Root, ignoreTags: string[]) {
  const todos: ListItem[] = [];
  function traveller(node: Parent) {
    if (node.type === 'listItem' && node.checked === false) {
      const tags = getTags(Parser.toMD(node));
      const gotIgnoreTags = tags.some(tag => ignoreTags.includes(tag));
      if (gotIgnoreTags) return;
      todos.push(node);
    }
    if (node.children) {
      node.children.forEach(node => {
        traveller(node as Parent);
      });
    }
  }

  traveller(tree);

  return todos;
}

async function updateOldFile(app: App, file: TFile, contents: string, todos: ListItem[]) {
  const lines = getLines(contents);
  
  const linesNeedUpdate: number[] = [];

  todos.forEach(todo => {
    const { position } = todo;
    if (position == undefined) {
      new Notice(`Unable to find position of "${Parser.toMD(todo)}"`);
      return;
    }

    linesNeedUpdate.push(position.start.line - 1);
  });

  [...new Set(linesNeedUpdate)].forEach(lineNum => {
    const line = lines[lineNum];
    lines[lineNum] = line.replace("- [ ]", "- [x]")
    lines[lineNum] += ' #journal-weekly-migrated';
  })

  const newContents = lines.join('\n');
  await app.vault.modify(file, newContents);

  new Notice(`Updated file last week`);
}

function getTags(str: string) {
  const matches = str.match(/(#[^ #\r\n]{2,})/g)
  if (matches === null) return [];
  return matches;
}

function parseTagSettings(str: string) {
  return str.split(',')
}

export function createMigrateTodosAction(plugin: JournalPlugin) {
  const { app, settings } = plugin;

  function getLastWeekJournal(date: Date) {
    const lastFileDate = previousMonday(date);
    const lastFileName = dateFormat(lastFileDate);

    const files = app.vault.getMarkdownFiles()
      .filter(file => file.path.startsWith(settings.journalPath))
      .filter(file => file.name.replace(/\.md/, '') === lastFileName);

    if (files.length > 1) new Notice('Should never got 2 same file: ' + date);

    return files[0];
  }

  return async (view: MarkdownView) => {

    const fileName = view.file.name.replace(/\.md/, '');
    const date = parseISO(fileName);

    const file = getLastWeekJournal(date);
    new Notice(`Migrating uncompleted todos from ${file.name}`);

    let contents: string;
    try {
      contents = await app.vault.read(file);
    } catch (error) {
      new Notice(`Error while reading file: ${error}`);
      return;
    }

    const tree = Parser.fromContents(contents)

    const ignoreTags = parseTagSettings(settings.ignoreTags);
    const todos = collectUncompletedTodos(tree, ignoreTags);

    const doc = view.editor.getValue();
    const root = insertTodosToLastWeek(Parser.fromContents(doc), {
      type: 'list',
      children: todos,
    });

    view.editor.setValue(Parser.toMD(root))
    await updateOldFile(app, file, contents, todos);
  }
}

function insertTodosToLastWeek(root: Root, list: Content) {
  let lastWeekIdx = 0;
  let thisWeekIdx = 1;

  root.children.forEach((child, idx) => {
    if (child.type !== 'heading') return;
    const firstEle = child.children[0]
    if (firstEle?.type !== 'text') return;
    if (firstEle.value === 'From last week') {
      lastWeekIdx = idx
    }
    if (firstEle.value === 'This week') {
      thisWeekIdx = Math.max(idx, lastWeekIdx + 1);
    }
  })

  console.log(lastWeekIdx, thisWeekIdx);
  root.children.splice(lastWeekIdx + 1, thisWeekIdx - lastWeekIdx - 1, list);

  return root;
}
