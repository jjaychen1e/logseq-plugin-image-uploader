import "@logseq/libs";

function main() {
  logseq.App.showMsg("Welcome to Logseq Plugins!");
}

logseq.ready(main).catch(console.error);