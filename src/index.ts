import { readFile, writeFile } from "fs/promises";

import { Converter } from "showdown";
import UglifyCSS from "uglifycss";
import clipboard from "clipboardy"; // Until ES Modules are fixed, need to keep this at 2.3.0
import hljs from "highlight.js";
import { load } from "cheerio";
import path from "path";
import { program } from "commander";

const loadMarkdown = async (filePath: string) => {
  const fileContent = await readFile(filePath, "utf8");
  return new Converter().makeHtml(fileContent);
};

const getCSS = async () => {
  const filePath = path.join(__dirname, "../templates/basestyles.css");
  const fileContent = await readFile(filePath, "utf8");
  const minified = UglifyCSS.processString(fileContent);
  return minified;
};

const highlight = async (code: string) => {
  const $ = load(code, null, false);
  const blocks = $("pre > code");
  blocks.each((_, block) => {
    const $block = $(block);
    const code = $block.text();
    const lang = $block.attr("class")?.split(" ")[0];
    const highlighted = hljs.highlight(code, {
      language: lang ?? "typescript",
    });
    $block.html(highlighted.value);
    $block.addClass("hljs");
  });
  $.root().prepend(`<style>${await getCSS()}</style>`);
  return $.html();
};

const writeFileToPath = async (filePath: string, content: string) => {
  await writeFile(filePath, content, "utf8");
};

const start = async (path: string) => {
  const fileContent = await loadMarkdown(path);
  const highlightedCode = await highlight(fileContent);
  //await writeFileToPath(path.join(__dirname, "../test.html"), highlightedCode);
  await clipboard.write(highlightedCode);
  return highlightedCode;
};

program
  .name("HaloITSM Doc Generator")
  .description(
    "Generates a HaloITSM documentation from a markdown file, including syntax highlighting and CSS minification"
  )
  .version("0.0.1")
  .argument("<file>", "The markdown file to convert")
  .argument("[output]", "The output file to write to")
  .action(async (file, output) => {
    const res = await start(file);
    console.log("Saved to clipboard. Paste into HaloITSM");
    if (output) {
      const targetPath = path.resolve(output);
      await writeFileToPath(targetPath, res);
      console.log(`Saved to ${targetPath}`);
    }
  });

program.parse(process.argv);
