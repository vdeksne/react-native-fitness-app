const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Guard against modules with undefined paths to avoid path.relative errors
const originalProcessModuleFilter = config.serializer?.processModuleFilter;
config.serializer = {
  ...config.serializer,
  processModuleFilter: (module) => {
    if (!module?.path) return false;
    return originalProcessModuleFilter
      ? originalProcessModuleFilter(module)
      : true;
  },
};

module.exports = config;
