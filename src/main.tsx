import "@logseq/libs";
import { checkUpdates } from "./CheckUpdatesUtils";
import { checkAndUploadBlock } from "./ImageUploadUtils";

async function main() {
  setTimeout(() => {
    checkUpdates();
  }, 5000);

  const graphInfo = await logseq.App.getCurrentGraph();
  const graphPath = graphInfo?.path;
  if (!graphPath) {
    const errorMsg = "Failed to get graph root path.";
    console.error('Error:', errorMsg);
    logseq.App.showMsg(errorMsg, "error");
    return
  } else {
    // Adding a context menu item to upload images in the block.
    logseq.Editor.registerBlockContextMenuItem("Upload image", async (e) => {
      const block = await logseq.Editor.getBlock(e.uuid);
      if (block && block.content) {
        checkAndUploadBlock(block, graphPath);
      }
    })

    // Adding pasting event listener to upload images in the block.
    // Note: Paste event won't trigger when pastring an image, so we're using the keydown event instead.
    parent.document.addEventListener("keydown", async (e) => {
      let autoUploading = logseq.settings?.autoUploading ?? true;
      if (!autoUploading) {
        return
      }
      
      if (e.ctrlKey || e.metaKey) {
        if (e.code === "KeyV") {
          let currentBlock = await logseq.Editor.getCurrentBlock();
          if (currentBlock) {
            let uuid = currentBlock.uuid;
            let checkLater = function () {
              setTimeout(async () => {
                let isEditing = await logseq.Editor.checkEditing();
                if (typeof isEditing === "string" && isEditing === uuid) {
                  // logseq.App.showMsg("Still editing, check it later.", "warning");
                  checkLater();
                } else {
                  let block = await logseq.Editor.getBlock(uuid);
                  if (block && block.content) {
                    // logseq.App.showMsg(block.content);
                    checkAndUploadBlock(block, graphPath);
                  }
                }
              }, 1000);
            }
            checkLater();
          }
        }
      }
    });
  }
}

logseq.ready(main).catch(console.error);