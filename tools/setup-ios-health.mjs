// Run after cap add/sync ios. Safe to repeat; no signing credentials are stored.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const plist = "ios/App/App/Info.plist";
if (!existsSync(plist)) throw new Error("Run pnpm exec cap add ios first (Node 22+).");
let text = readFileSync(plist, "utf8");
const descriptions = {
  NSHealthShareUsageDescription: "워치의 걸음, 심박, 운동 기록을 불러와 활동량을 확인합니다. 선택한 항목만 읽습니다.",
};
for (const [key, value] of Object.entries(descriptions)) {
  if (!text.includes("<key>" + key + "</key>")) text = text.replace("</dict>", "<key>" + key + "</key><string>" + value + "</string>\n</dict>");
}
writeFileSync(plist, text);
writeFileSync("ios/App/App/App.entitlements", '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>com.apple.developer.healthkit</key><true/></dict></plist>');
const project = "ios/App/App.xcodeproj/project.pbxproj";
text = readFileSync(project, "utf8");
if (!text.includes("CODE_SIGN_ENTITLEMENTS = App/App.entitlements;")) text = text.replaceAll("CODE_SIGN_STYLE = Automatic;", "CODE_SIGN_STYLE = Automatic;\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;");
writeFileSync(project, text);
console.log("HealthKit read purpose and entitlement configured. Signing/build/device validation requires Xcode on macOS.");
