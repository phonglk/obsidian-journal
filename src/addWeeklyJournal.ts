import { App, normalizePath, Notice, SuggestModal } from "obsidian";
import { isSaturday, isSunday, nextMonday, startOfWeek } from 'date-fns'
import JournalPlugin from "./main";
import { join } from "path";
import { dateFormat, getNoteCreationPath } from "./utils";

export function createAddWeeklyJournal(plugin: JournalPlugin) {
  return () => {
    new SelectWeeklyJournalCreationOption(plugin).open();
  }
}

type WeeklyJournalCreationOption = {
  title: string,
  value?: Date,
}


class SelectWeeklyJournalCreationOption extends SuggestModal<WeeklyJournalCreationOption> {
  constructor(private plugin: JournalPlugin) {
    super(plugin.app);
  }
  getSuggestions(query: string): WeeklyJournalCreationOption[] | Promise<WeeklyJournalCreationOption[]> {
    const cancelOpt = { title: 'Cancel' };

    const date = new Date();
    const thisWeekDate = startOfWeek(date, { weekStartsOn: 1 });
    const nextWeekDate = nextMonday(date);

    const thisWeekOpt = {
      title: `This week monday (${dateFormat(thisWeekDate)})`,
      value: thisWeekDate,
    };
    const nextWeekOpt = {
      title: `Next week monday (${dateFormat(nextWeekDate)})`,
      value: nextWeekDate,
    }

    let dateOptions = [thisWeekOpt, nextWeekOpt];

    if (isSaturday(date) || isSunday(date)) {
      dateOptions = [nextWeekOpt, thisWeekOpt];
    }

    return [
      ...dateOptions,
      cancelOpt,
    ].filter(option => option.title.includes(query));
  }

  renderSuggestion(value: WeeklyJournalCreationOption, el: HTMLElement) {
    el.createDiv({ text: value.title });
  }

  async onChooseSuggestion(item: WeeklyJournalCreationOption, evt: MouseEvent | KeyboardEvent) {
    new Notice(`Selected ${item.title}`);
    if (!item.value) return;
    const { weeklyJournalTemplatePath, journalPath } = this.plugin.settings
    const templateContents = await getTemplateContents(this.plugin.app, weeklyJournalTemplatePath);
    const contents = transformTemplateContents(templateContents);
    const destPath = await getNoteCreationPath(this.app, journalPath, dateFormat(item.value), item.value)

    this.app.vault.create(destPath, contents);
  }
}

export async function getTemplateContents(
  app: App,
  templatePath: string | undefined
): Promise<string> {
  const { metadataCache, vault } = app;
  const normalizedTemplatePath = normalizePath(templatePath ?? "");
  if (templatePath === "/") {
    return Promise.resolve("");
  }

  try {
    const templateFile = metadataCache.getFirstLinkpathDest(normalizedTemplatePath, "");
    return templateFile ? vault.cachedRead(templateFile) : "";
  } catch (err) {
    console.error(
      `Failed to read the note template '${normalizedTemplatePath}'`,
      err
    );
    new Notice("Failed to read the note template");
    return "";
  }
}

function transformTemplateContents(
  templateContents: string,
) {
  let contents = templateContents;
  return contents;
}

