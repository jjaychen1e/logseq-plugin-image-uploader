import "@logseq/libs";
import { BlockEntity, PageEntity } from '@logseq/libs/dist/LSPlugin';
import { gt } from "semver"

const currentVersion = "0.0.3";

async function uploadImage(url: string): Promise<string> {
  return await fetch("http://localhost:36677/upload", {
    method: "POST",
    body: JSON.stringify({ list: [url]})
  })
  .then(res => res.json())
  .then(resJSON => {
    if (resJSON.success) {
      return resJSON.result[0]
    } else {
      throw new Error("Upload failed.");
    }
  })
  .catch ((error) => {
    console.error('Error:', error);
    logseq.App.showMsg("Please check if PicGo is running. And this plugin can only be run in manually loaded mode due to CORS restriction, please download it from GitHub release page.", "error");
  })
}

const uploadedImageFileRecordPageName = "Uploaded image file record(created by logseq-plugin-image-uploader)";

async function getLastBlock(pageName: string): Promise<null | BlockEntity> {
  const blocks = await logseq.Editor.getPageBlocksTree(pageName);
  if (blocks.length === 0) {
    return null;
  }
  return blocks[blocks.length - 1];
}

async function deleteUploadedImageFileRecordPage() {
  await logseq.Editor.deletePage(uploadedImageFileRecordPageName);
}

async function createUploadedImageFileRecordPage(): Promise<null | PageEntity> {
  return await logseq.Editor.createPage(
    uploadedImageFileRecordPageName, 
    {},
    {
      createFirstBlock: true,
      redirect: false,
    }
  );
}

async function recordUploadedImageFile(filePath: string) {
  let page = await logseq.Editor.getPage(uploadedImageFileRecordPageName);
  if (!page) {
    page = await createUploadedImageFileRecordPage();
  } else {
    let block = await getLastBlock(page.name);
    if (!block) {
      // Created, but deleted by user.
      await deleteUploadedImageFileRecordPage();
      page = await createUploadedImageFileRecordPage();
    }
  }
  
  if (page) {
    let block = await getLastBlock(page.name);
    if (block) {
      if (block.content) {
        await logseq.Editor.insertBlock(block.uuid, filePath);
      } else {
        await logseq.Editor.updateBlock(block.uuid, filePath);
      }
    } else {
      const errorMsg = `Failed to save uploaded image name: ${filePath}.`;
      console.error('Error:', errorMsg);
      logseq.App.showMsg(errorMsg, "error");
    }
  } else {
    const errorMsg = "Failed to create uploaded iamge record page.";
    console.error('Error:', errorMsg);
    logseq.App.showMsg(errorMsg, "error");
  }
}

async function checkUpdates() {
  const res = await fetch("https://api.github.com/repos/logseq/logseq-plugin-image-uploader/releases/latest")
  .then(res => res.json())
  .then(resJSON => {
    const latestVersion = resJSON["tag_name"].replace("v", "");
    if (gt(latestVersion, currentVersion)) {
      logseq.App.showMsg(`New version ${latestVersion} is available.`, "info");
    }
  })
}

async function main() {
  checkUpdates();
  
  const graphInfo = await logseq.App.getCurrentGraph();
  const graphPath = graphInfo?.path;
  if (!graphPath) {
    const errorMsg = "Failed to get graph root path.";
    console.error('Error:', errorMsg);
    logseq.App.showMsg(errorMsg, "error");
    return 
  } else {
    logseq.Editor.registerBlockContextMenuItem("Upload image", async (e) => {
      const block = await logseq.Editor.getBlock(e.uuid);
      if (block && block.content) {
        let content = block.content;
        
        // match => ![name](url)
        let match;
        while ((match = /\!\[.*?\]\((.*?)\)/g.exec(content))) {
          const imageURLText = match[1];
          if (imageURLText.startsWith("../")) {
            // Ensure this is a local image.
            const imageURLLocal = graphPath + match[1].replace("..", "");
            const imageURLRemote = await uploadImage(imageURLLocal);
            if (imageURLRemote != "" && imageURLRemote != undefined && imageURLRemote != null) { 
              // We need to fetch again, becasue block content may changed.
              const block = await logseq.Editor.getBlock(e.uuid);
              if (block && block.content) {
                // This should be executed sequentially to avoid race condition.
                // TODO: - Maybe we can put this operation into a seperate dispatch queue to improve performance?
                await logseq.Editor.updateBlock(block.uuid, block.content.replace(imageURLText, imageURLRemote));
                await recordUploadedImageFile(match[1]);
              }
            }
          }

          content = content.replace(match[0], "");
        }
      }
    })
  }
}

logseq.ready(main).catch(console.error);