import { parseISO, previousMonday } from 'date-fns';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { createAddWeeklyJournal } from './addWeeklyJournal';
import { createMigrateTodosAction } from './MigrateTodos';
import { Parser } from './utils';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
  journalPath: string;
  weeklyJournalTemplatePath: string;
  ignoreTags: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  // https://github1s.com/liamcain/obsidian-periodic-notes/blob/HEAD/src/ui/suggest.ts
  journalPath: 'Journal',
  weeklyJournalTemplatePath: 'Journal/_03 Template',
  ignoreTags: '#side-project',
}

export default class JournalPlugin extends Plugin {
  settings: MyPluginSettings;
  async onload() {
    await this.loadSettings();

    const addWeeklyJournal = createAddWeeklyJournal(this);
    const migrateTodos = createMigrateTodosAction(this);
    // This creates an icon in the left ribbon.
    const ribbonIconEl = this.addRibbonIcon('calendar-plus', 'Add weekly journal', addWeeklyJournal);
    // Perform additional things with the ribbon
    ribbonIconEl.addClass('my-plugin-ribbon-class');

    // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
    const statusBarItemEl = this.addStatusBarItem();
    statusBarItemEl.setText('Status Bar Text');

    // This adds an editor command that can perform some operation on the current editor instance
    this.addCommand({
      id: 'journal-add-weekly-journal',
      name: 'Add Weekly Journal',
      callback: addWeeklyJournal,
    });

    // This adds a complex command that can check whether the current state of the app allows execution of the command
    this.addCommand({
      id: 'journal-migrate-uncompleted-todos',
      name: 'Migrate uncompleted todos from last week',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        migrateTodos(view);
      }
    });

    this.addCommand({
      id: 'journal-parse-doc',
      name: 'Parse current doc (debug)',
      editorCallback: (editor: Editor) => {
        console.log(Parser.fromContents(editor.getValue()));
      }
    });

    this.addSettingTab(new JournalSettingTab(this.app, this));

    this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
      // console.log('click', evt);
    });

    // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
    this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
  }

  onunload() {

  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class JournalSettingTab extends PluginSettingTab {
  plugin: JournalPlugin;

  constructor(app: App, plugin: JournalPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'Settings for Journal' });

    new Setting(containerEl)
      .setName('Journal path')
      .setDesc('path to your journal notes')
      .addText(text => text
        .setPlaceholder('path')
        .setValue(this.plugin.settings.journalPath)
        .onChange(async (value) => {
          this.plugin.settings.journalPath = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Weekly template path')
      .setDesc('path to your weekly journal template')
      .addText(text => text
        .setPlaceholder('path')
        .setValue(this.plugin.settings.weeklyJournalTemplatePath)
        .onChange(async (value) => {
          this.plugin.settings.weeklyJournalTemplatePath = value;
          await this.plugin.saveSettings();
        }));
  }
}
