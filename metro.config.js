const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("db");

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "expo-sqlite" && platform === "web") {
    return {
      filePath: path.resolve(__dirname, "src/database/sqliteShim.tsx"),
      type: "sourceFile",
    };
  }
  if (moduleName === "expo-file-system") {
    return {
      filePath: path.resolve(__dirname, "src/database/fileSystemShim.ts"),
      type: "sourceFile",
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
