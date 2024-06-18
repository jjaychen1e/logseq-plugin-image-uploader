import { BlockEntity } from '@logseq/libs/dist/LSPlugin';
import { recordUploadedImageFile } from "./RecordUtils";

async function uploadImage(url: string): Promise<string> {
    return await fetch("http://localhost:36677/upload", {
        method: "POST",
        body: JSON.stringify({ list: [url] })
    })
        .then((res) => res.text())
        .then((content) => {
            console.log("[logseq-plugin-image-uploader]: " + content);
            return JSON.parse(content);
        })
        .then((resJSON) => {
            if (resJSON.success) {
                return resJSON.result[0];
            } else {
                throw new Error("Upload failed.");
            }
        }) 
        .catch((error) => {
            console.error('Error:', error);
            logseq.App.showMsg("Error: " + error.message, "error");
            logseq.App.showMsg("Please check if PicGo is running. Check out more details in the developer tool's console.", "error");
        })
}

async function fetchResponse(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch data. Status: ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            resolve(result);
        };
        reader.onerror = (e) => {
            reject(new Error('FileReader error'));
        };
        reader.readAsArrayBuffer(blob);
    });
}

async function reUploadImage(url: string, basePath:string): Promise<string> {
    const storage = logseq.Assets.makeSandboxStorage()
    try {
        const timestamp = Date.now();
        const filename = `${timestamp}${url.substring(url.lastIndexOf('.'))}`
        const fileContent = await fetchResponse(url)
        await storage.setItem(filename, fileContent)
        const localPath = `${basePath}/${logseq.FileStorage.ctxId}/${filename}`
        const remoteURL =  await uploadImage(localPath)
        await storage.removeItem(filename)
        return remoteURL
    } catch (error) {
        console.error('Error:', error);
        logseq.App.showMsg("Error: " + (error as Error).message, "error");
        throw error;
    }
}

const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".tiff", ".tif", ".bmp", ".svg", ".webp"];

export async function checkAndUploadBlock(srcBlock: BlockEntity, graphPath: string) {
    let content = srcBlock.content;
    // match => ![name](url) or https://xxx
    let match;
    while ((match = /(?:\!\[(.*?)\]\((.*?)\))|(https?:\/\/[^\s]+)/g.exec(content))){
        let imageURLText: string = "";
        let imageURL: string  = "";
        content = content.replace(match[0], "");
        if (match[2]) {
            imageURLText = match[1];
            imageURL = match[2];
        } else {
            imageURL = match[3];
        }

        if (imageURLText.startsWith("Replaced by Image Uploader") || imageURLText.startsWith("Replaced by Image Uploder") || imageURLText.startsWith("Replaced by Image Downloader")) {
            continue;
        }
        if (!imageExtensions.some((x) => imageURL.toLowerCase().endsWith(x))) {
            continue;
        }

        let uploadNetworkImage = logseq.settings?.uploadNetworkImage ?? false;
        let imageURLRemote: string
        if (imageURL.startsWith("http://") || imageURL.startsWith("https://") ) {
            if (logseq.settings?.skipURLPrefix && imageURL.startsWith(logseq.settings?.skipURLPrefix))  {
                continue
            }
            imageURLRemote = await reUploadImage(imageURL,`${graphPath}/assets/storages`);
        } else if (imageURL.startsWith("../") || uploadNetworkImage){
            const originalURL = imageURL.startsWith("../") ? graphPath + imageURL.replace("../", "/") : imageURL;
            imageURLRemote = await uploadImage(originalURL);
        } else {
            continue
        }
        if (imageURLRemote != "" && imageURLRemote != undefined) {
            // We need to fetch again, becasue block content may changed.
            const block = await logseq.Editor.getBlock(srcBlock.uuid);
            if (block && block.content) {
                await logseq.Editor.updateBlock(block.uuid, block.content.replace(match[0],  `![Replaced by Image Uploader](${imageURLRemote})`));
                await recordUploadedImageFile(imageURL);
            }
        }
    }
}