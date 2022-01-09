import { BlockEntity } from '@logseq/libs/dist/LSPlugin';
import { recordUploadedImageFile } from "./RecordUtils";

async function uploadImage(url: string): Promise<string> {
    return await fetch("http://localhost:36677/upload", {
        method: "POST",
        body: JSON.stringify({ list: [url] })
    })
        .then(res => res.json())
        .then(resJSON => {
            if (resJSON.success) {
                return resJSON.result[0]
            } else {
                throw new Error("Upload failed.");
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            logseq.App.showMsg("Please check if PicGo is running. And this plugin can only be run in manually loaded mode due to CORS restriction, please download it from GitHub release page.", "error");
        })
}

export async function checkAndUploadBlock(srcBlock: BlockEntity, graphPath: string) {
    let content = srcBlock.content;

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
                const block = await logseq.Editor.getBlock(srcBlock.uuid);
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