import { BlockEntity, PageEntity } from '@logseq/libs/dist/LSPlugin';

const uploadedImageFileRecordPageName = "Uploaded image file record(created by logseq-plugin-image-uploader)";
const uploadedImageFileRecordInteractivePageName = "Uploaded image file record - interactive(created by logseq-plugin-image-uploader)";

async function getLastBlock(page: PageEntity): Promise<null | BlockEntity> {
  const blocks = await logseq.Editor.getPageBlocksTree(page.name);
  if (blocks.length === 0) {
    return null;
  }
  return blocks[blocks.length - 1];
}

async function insertAtLast(block: BlockEntity, content: string): Promise<void> {
  if (block.content) {
    await logseq.Editor.insertBlock(block.uuid, content);
  } else {
    await logseq.Editor.updateBlock(block.uuid, content);
  }
}

async function deleteUploadedImageFileRecordPage() {
  await logseq.Editor.deletePage(uploadedImageFileRecordPageName);
  await logseq.Editor.deletePage(uploadedImageFileRecordInteractivePageName);
}

async function createUploadedImageFileRecordPage(pageName: string): Promise<null | PageEntity> {
  let page = await logseq.Editor.createPage(
    pageName,
    {},
    {
      createFirstBlock: true,
      redirect: false,
    }
  );
  if (page) {
    let block = await getLastBlock(page);
    if (block) {
      insertAtLast(block, "Here I've listed all the not uploaded images.");

      let uploadedImagesQueryBlockContent = `#+BEGIN_QUERY
{:title "Not uploaded images"
  :query [:find (pull ?b [*])
        :where
        [?b :block/page ?p]
        [?p :block/name ?page_name]
        (not [(clojure.string/includes? ?page_name "created by logseq-plugin-image-uploader")])
        [?b :block/content ?content]
        (not [(clojure.string/includes? ?content "{:title \\\"Not uploaded images\\\"")])
        [(clojure.string/includes? ?content "](../assets")]
        [(clojure.string/includes? ?content "![")]
        (or [(clojure.string/includes? ?content ".png)")]
            [(clojure.string/includes? ?content ".jpg)")]
            [(clojure.string/includes? ?content ".jpeg)")]
            [(clojure.string/includes? ?content ".gif)")]
            [(clojure.string/includes? ?content ".tiff)")]
            [(clojure.string/includes? ?content ".tif)")]
            [(clojure.string/includes? ?content ".bmp)")]
            [(clojure.string/includes? ?content ".svg)")]
            [(clojure.string/includes? ?content ".webp)")]
            [(clojure.string/includes? ?content ".PNG)")]
            [(clojure.string/includes? ?content ".JPG)")]
            [(clojure.string/includes? ?content ".JPEG)")]
            [(clojure.string/includes? ?content ".GIF)")]
            [(clojure.string/includes? ?content ".TIGG)")]
            [(clojure.string/includes? ?content ".TIF)")]
            [(clojure.string/includes? ?content ".VMP)")]
            [(clojure.string/includes? ?content ".SVG)")]
            [(clojure.string/includes? ?content ".WEBP)")])
      ]}
#+END_QUERY`

      insertAtLast(block, uploadedImagesQueryBlockContent);
    }
  }
  return page;
}

async function makeSureUploadedImageFileRecordPageValid(pageName: string): Promise<null | PageEntity> {
  let page = await logseq.Editor.getPage(pageName);
  if (!page) {
    page = await createUploadedImageFileRecordPage(pageName);
  } else {
    let block = await getLastBlock(page);
    if (!block) {
      // Created, but deleted by user.
      await deleteUploadedImageFileRecordPage();
      page = await createUploadedImageFileRecordPage(pageName);
    }
  }
  return page
}

export async function recordUploadedImageFile(filePath: string) {
  let pageStatic = await makeSureUploadedImageFileRecordPageValid(uploadedImageFileRecordPageName);
  let pageInteractive = await makeSureUploadedImageFileRecordPageValid(uploadedImageFileRecordInteractivePageName);

  if (pageStatic && pageInteractive) {
    let blockStatic = await getLastBlock(pageStatic);
    let blockInteractive = await getLastBlock(pageInteractive);
    if (blockStatic && blockInteractive) {
      insertAtLast(blockStatic, filePath);
      insertAtLast(blockInteractive, `![Uploaded by Image Uploder](${filePath})`);
    } else {
      const errorMsg = `Failed to save uploaded image name: ${filePath}.`;
      console.error('Error:', errorMsg);
      logseq.App.showMsg(errorMsg, "error");
    }
  } else {
    const errorMsg = "Failed to create uploaded image record page.";
    console.error('Error:', errorMsg);
    logseq.App.showMsg(errorMsg, "error");
  }
}