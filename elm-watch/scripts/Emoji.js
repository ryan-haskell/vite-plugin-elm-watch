/* eslint-disable no-console */
import * as https from "https";
import { GOOD_ENOUGH_STARTS_WITH_EMOJI_REGEX } from "../src/Compile";
import { bold } from "../src/Helpers";
const matching = [];
const nonMatching = [];
https
    .get(
// Tested on this commit:
// https://raw.githubusercontent.com/mathiasbynens/emoji-test-regex-pattern/85a0059035a7650f46294647482b95d50e84ad22/dist/latest/index-strings.txt
"https://raw.githubusercontent.com/mathiasbynens/emoji-test-regex-pattern/main/dist/latest/index-strings.txt", (response) => {
    response.setEncoding("utf8");
    response.on("data", (chunk) => {
        for (const emoji of chunk.split("\n")) {
            if (GOOD_ENOUGH_STARTS_WITH_EMOJI_REGEX.test(`${emoji} `)) {
                matching.push(emoji);
            }
            else {
                nonMatching.push(emoji);
            }
        }
    });
    response.on("end", () => {
        console.log(printEmojis("MATCHING", matching));
        console.log();
        console.log();
        console.log();
        console.log(printEmojis("NOT MATCHING", nonMatching));
    });
    response.on("error", onError);
})
    .on("error", onError);
function printEmojis(title, emojis) {
    return `
${bold(`### ${title} ###`)}

${emojis.join(" ")}
  `.trim();
}
function onError(error) {
    console.error("Request failed!", error);
}
