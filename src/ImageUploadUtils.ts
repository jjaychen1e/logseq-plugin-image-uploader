import { BlockEntity } from '@logseq/libs/dist/LSPlugin';
import { recordUploadedImageFile } from "./RecordUtils";

async function uploadImage(url: string): Promise<string> {
    return await fetch("http://localhost:36677/upload", {
        method: "POST",
        body: JSON.stringify({ list: [url] })
    })
        .then((res) => res.text())
        .then((content) => {
            console.log(content);
            return JSON.parse(content);
        })
        .then((resJSON) => {
            if (resJSON.success) {
                return resJSON.result[0];
            } else {
                throw new Error("Upload failed.");
            }
        }) 
        .then(resJSON => {
            if (resJSON.success) {
                return resJSON.result[0]
            } else {
                throw new Error("Upload failed.");
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            logseq.App.showMsg("Error: " + error.message, "error");
            logseq.App.showMsg("Please check if PicGo is running. And this plugin can only be run in manually loaded mode due to CORS restriction, please download it from GitHub release page.", "error");
        })
}

const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".tiff", ".tif", ".bmp", ".svg", ".webp"];

export async function checkAndUploadBlock(srcBlock: BlockEntity, graphPath: string) {
    let content = srcBlock.content;

    // match => ![name](url)
    let match;
    while ((match = /\!\[.*?\]\((.*?)\)/g.exec(content))) {
        content = content.replace(match[0], "");
        const imageURLText: string = match[1];
        
        // `Uploder` <= Historical problem... This typo was fixed in v0.0.8.
        if (match[0].startsWith("![Replaced by Image Uploader]") || match[0].startsWith("![Replaced by Image Uploder]")) {
            continue;
        }

        if (!imageExtensions.some((x) => imageURLText.toLowerCase().endsWith(x))) {
            // Not a image, maybe a PDF file?
            continue;
        }

        let uploadNetworkImage = logseq.settings?.uploadNetworkImage ?? false;
        if (imageURLText.startsWith("../") || uploadNetworkImage) {
            const originalURL = imageURLText.startsWith("../") ? graphPath + match[1].replace("../", "/") : match[1];
            const imageURLRemote = await uploadImage(originalURL);
            if (imageURLRemote != "" && imageURLRemote != undefined && imageURLRemote != null) {
                // We need to fetch again, becasue block content may changed.
                const block = await logseq.Editor.getBlock(srcBlock.uuid);
                if (block && block.content) {
                    // This should be executed sequentially to avoid race condition.
                    // TODO: - Maybe we can put this operation into a seperate dispatch queue to improve performance?
                    await logseq.Editor.updateBlock(block.uuid, block.content.replace(match[0],  `![Replaced by Image Uploader](${imageURLRemote})`));
                    await recordUploadedImageFile(match[1]);
                }
            }
        }
    }
}