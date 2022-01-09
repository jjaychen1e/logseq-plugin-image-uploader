import { BlockEntity, PageEntity } from '@logseq/libs/dist/LSPlugin';

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

export async function recordUploadedImageFile(filePath: string) {
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