import { gt } from "semver"
import packageJson from "../package.json";

const currentVersion = packageJson.version;

export async function checkUpdates() {
  const res = await fetch("https://api.github.com/repos/jjaychen1e/logseq-plugin-image-uploader/releases/latest")
    .then(res => res.json())
    .then(resJSON => {
      const latestVersion = resJSON["tag_name"].replace("v", "");
      if (gt(latestVersion, currentVersion)) {
        logseq.App.showMsg(`New version ${latestVersion} is available(logseq-plugin-image-uploader).`, "info");
      }
    })
}